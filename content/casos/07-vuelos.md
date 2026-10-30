---
titulo: "Caso ✈️ Cóndor Air: puntualidad, ocupación y precios"
nivel: Experto
duracion: 55
resumen: On-time performance, demoras por ruta, propagación de demoras, factor de ocupación, ingresos y precio según anticipación.
objetivos: Calcular la puntualidad (OTP) por ruta con la tolerancia estándar de 15 minutos | Medir demoras promedio por aeropuerto sin incluir vuelos cancelados | Estimar ocupación ponderada por asientos | Analizar precio según anticipación y la propagación de demoras entre vuelos encadenados
prerrequisitos: casos-metodo | sql-ventanas-2
autoevaluacion: ¿Puedes calcular el porcentaje de vuelos puntuales por ruta? | ¿Sabes por qué la ocupación promedio de los vuelos no es lo mismo que pasajeros totales sobre asientos totales? | ¿Puedes agrupar reservas por días de anticipación y comparar precios? | ¿Puedes encontrar el vuelo siguiente del mismo avión con una función de ventana? | ¿Sabes qué vuelos excluir al calcular demoras?
---

<!-- estandar:escenario -->
:::escenario Cóndor Air
El gerente de operaciones de **Cóndor Air** recibió una queja del regulador:

> "Dicen que nuestra puntualidad está por debajo del promedio. Necesito saber en qué rutas y aeropuertos fallamos. Y comercial quiere entender la ocupación y si los que compran tarde realmente pagan más."

Una aerolínea vive de llenar aviones al mejor precio y de cumplir horarios. Un avión que sale tarde arrastra la demora a todos los vuelos que hace ese día.
:::
**Cóndor Air** opera 20 rutas en Latinoamérica y una a Madrid. Operaciones mide la **puntualidad** y comercial la **ocupación** y el **ingreso**.

## El modelo de datos

```text
vuelos_aeropuertos (codigo, ciudad, pais)
vuelos_vuelos (vuelo_id, numero, origen, destino, fecha,
               salida_programada, salida_real, llegada_programada, llegada_real, estado, capacidad)
vuelos_reservas (reserva_id, vuelo_id, pasajero_id, fecha_reserva, clase, precio, estado)
```

- Un vuelo es **puntual** si llegó con **15 minutos o menos** de demora (estándar de la industria). Los cancelados no son puntuales.
- **Demora de salida** = minutos entre `salida_programada` y `salida_real`.
- `vuelos_reservas` es una **muestra**: cada reserva representa a 40 pasajeros reales (factor de expansión 40). Para estimar la ocupación: `pasajeros_estimados = reservas_confirmadas × 40`.
- **Load factor** (ocupación) = pasajeros / asientos ofrecidos.

## Cómo funciona una aerolínea

Una aerolínea tiene costos enormes y casi fijos: el avión, el combustible y la tripulación cuestan casi lo mismo si el vuelo va lleno o medio vacío. Por eso sus dos obsesiones son:

1. **Llenar los aviones** (*load factor*): cada asiento vacío al despegar es ingreso perdido para siempre (como el turno vacío de la clínica).
2. **Vender cada asiento al mejor precio posible** (*revenue management*): el mismo asiento cuesta distinto según la anticipación, la clase y la demanda. Quien compra a último momento suele pagar más.

Y operaciones vive de la **puntualidad**: una demora en la mañana se **propaga** a todos los vuelos siguientes del mismo avión, genera conexiones perdidas, compensaciones y malas reseñas.

## Un ejemplo resuelto paso a paso

**Pregunta:** "¿Hay días de la semana con más demora de salida?"

1. **Grano**: una fila por día de la semana (`strftime('%w', fecha)`: 0 = domingo … 6 = sábado).
2. **Filtro**: excluir los cancelados (no tienen `salida_real`).
3. **Métrica**: demora promedio en minutos = (salida real − salida programada) × 1.440.

```sql
SELECT strftime('%w', fecha) AS dia_semana,
       COUNT(*) AS vuelos,
       ROUND(AVG((julianday(salida_real) - julianday(salida_programada)) * 1440), 1) AS demora_min
FROM vuelos_vuelos
WHERE estado <> 'cancelado'
GROUP BY dia_semana
ORDER BY dia_semana;
```

| dia_semana | vuelos | demora_min |
|---|---|---|
| 0 (dom) | 650 | 20.6 |
| 1 (lun) | 683 | 22.9 |
| 3 (mié) | 685 | 23.4 |
| 5 (vie) | 663 | 19.2 |

**Lectura de negocio:** las diferencias entre días son pequeñas (19 a 23 minutos). El día de la semana **no** explica las demoras; hay que buscar en otro lado: aeropuerto de origen y, sobre todo, la propagación desde el vuelo anterior (lo verás en los ejercicios). Un resultado "sin hallazgo" también es información: evita invertir en la solución equivocada.

```recorrido
titulo: Demora por día de la semana, paso a paso
estacion v: Vuelos | icono=tabla
estacion filtro: Sin cancelados | icono=lupa
estacion demora: Minutos | icono=reloj
estacion dia: Día de la semana | icono=etiqueta
estacion res: Resultado | icono=check
paso v: Los vuelos
Cada vuelo tiene la salida programada y la real.
>>> tabla
vuelo_id,fecha,salida_programada,salida_real,estado
1,2024-01-01,2024-01-01 06:00:00,2024-01-01 06:06:00,a_tiempo
2,2024-01-01,2024-01-01 09:30:00,2024-01-01 09:27:00,a_tiempo
3,2024-01-01,2024-01-01 12:00:00,2024-01-01 11:59:00,a_tiempo
4,2024-01-01,2024-01-01 18:00:00,2024-01-01 18:30:00,demorado
5,2024-01-01,2024-01-01 21:30:00,2024-01-01 21:43:00,a_tiempo
paso filtro: Fuera los cancelados
Un vuelo cancelado no tiene `salida_real`: no se puede medir su demora. Se excluye con `estado <> 'cancelado'`.
>>> tabla
estado,vuelos,sin_salida_real
a_tiempo,3437,0
cancelado,142,142
demorado,1265,0
paso demora: La demora en minutos
`julianday` da días con decimales; la diferencia × 1.440 (minutos de un día) da minutos.
>>> tabla
vuelo_id,salida_programada,salida_real,demora_min
1,2024-01-01 06:00:00,2024-01-01 06:06:00,6
2,2024-01-01 09:30:00,2024-01-01 09:27:00,-3
3,2024-01-01 12:00:00,2024-01-01 11:59:00,-1
4,2024-01-01 18:00:00,2024-01-01 18:30:00,30
5,2024-01-01 21:30:00,2024-01-01 21:43:00,13
paso dia: El día de la semana
`strftime('%w', fecha)` devuelve 0 para domingo, 1 para lunes… 6 para sábado.
>>> tabla
vuelo_id,fecha,dia_semana,demora_min
1,2024-01-01,1,6
2,2024-01-01,1,-3
3,2024-01-01,1,-1
4,2024-01-01,1,30
5,2024-01-01,1,13
paso res: Una fila por día
Las diferencias son chicas: el día de la semana **no** explica las demoras. Un resultado "sin hallazgo" también es información.
>>> tabla
dia_semana,vuelos,demora_min
0,650,20.6
1,683,22.9
2,674,22.5
3,685,23.4
4,673,20.6
5,663,19.2
6,674,20.8
```

:::cuidado Las trampas de este caso
- **Muestra con factor de expansión**: `vuelos_reservas` es una muestra; cada reserva representa 40 pasajeros. Olvidar el ×40 da ocupaciones absurdas de 2 %.
- **Doble conteo al unir vuelos con reservas**: si unes primero y después sumas la capacidad, la capacidad de cada vuelo se suma una vez **por reserva**. Agrega las reservas por vuelo antes de unir.
- **Puntualidad se mide en la llegada** (15 minutos de tolerancia), no en la salida; y los cancelados cuentan como no puntuales.
:::

<!-- estandar:trabajo -->
:::trabajo
- La puntualidad se mide con un estándar de la industria: un vuelo es puntual si llega dentro de los 15 minutos de lo programado. Usar otra definición hace que tus números no se puedan comparar con nadie.
- Las aerolíneas combinan datos de muchas fuentes (reservas, operaciones, mantenimiento, clima). Integrarlas por vuelo y fecha es un trabajo típico de data engineering, y los datos de operación llegan en tiempo casi real.
:::

## Ejercicios

:::ejercicio sql ordenado titulo="Puntualidad por ruta"
Para cada ruta (`origen`, `destino`): `vuelos`, `puntuales` (llegada real ≤ programada + 15 min) y `otp_pct` (*on-time performance*, redondeado a 2) sobre el total de vuelos programados (cancelados incluidos en el total). Ordena por `otp_pct` ascendente.
```sql solucion
SELECT origen, destino, COUNT(*) AS vuelos,
       SUM(CASE WHEN llegada_real IS NOT NULL AND (julianday(llegada_real) - julianday(llegada_programada)) * 1440 <= 15 THEN 1 ELSE 0 END) AS puntuales,
       ROUND(100.0 * SUM(CASE WHEN llegada_real IS NOT NULL AND (julianday(llegada_real) - julianday(llegada_programada)) * 1440 <= 15 THEN 1 ELSE 0 END) / COUNT(*), 2) AS otp_pct
FROM vuelos_vuelos
GROUP BY origen, destino
ORDER BY otp_pct;
```
:::

:::ejercicio sql ordenado titulo="Demora promedio por aeropuerto de salida"
Para cada aeropuerto de **origen** (con su `ciudad`), la demora promedio de salida en minutos de los vuelos no cancelados (`demora_promedio`, redondeada a 1) y el porcentaje de vuelos con más de 60 minutos de demora (`pct_mas_60`, redondeado a 2). Ordena por demora promedio descendente.
```sql solucion
SELECT v.origen, a.ciudad,
       ROUND(AVG((julianday(v.salida_real) - julianday(v.salida_programada)) * 1440), 1) AS demora_promedio,
       ROUND(100.0 * SUM(CASE WHEN (julianday(v.salida_real) - julianday(v.salida_programada)) * 1440 > 60 THEN 1 ELSE 0 END) / COUNT(*), 2) AS pct_mas_60
FROM vuelos_vuelos v JOIN vuelos_aeropuertos a ON a.codigo = v.origen
WHERE v.estado <> 'cancelado'
GROUP BY v.origen, a.ciudad
ORDER BY demora_promedio DESC;
```
:::

:::ejercicio sql ordenado titulo="Factor de ocupación mensual"
Para cada mes (`mes` `YYYY-MM`) estima la ocupación de los vuelos **no cancelados**: `asientos` (suma de capacidad), `pasajeros` (reservas confirmadas × 40) y `load_factor_pct` (redondeado a 2). Ordena por mes.
```sql solucion
WITH pax AS (
  SELECT vuelo_id, SUM(CASE WHEN estado = 'confirmada' THEN 1 ELSE 0 END) * 40 AS pasajeros
  FROM vuelos_reservas GROUP BY vuelo_id
)
SELECT strftime('%Y-%m', v.fecha) AS mes, SUM(v.capacidad) AS asientos, SUM(COALESCE(p.pasajeros, 0)) AS pasajeros,
       ROUND(100.0 * SUM(COALESCE(p.pasajeros, 0)) / SUM(v.capacidad), 2) AS load_factor_pct
FROM vuelos_vuelos v LEFT JOIN pax p ON p.vuelo_id = v.vuelo_id
WHERE v.estado <> 'cancelado'
GROUP BY mes ORDER BY mes;
```
```pista
Primero agrega las reservas por vuelo (para no duplicar la capacidad al unir) y después une con los vuelos. Es el error de doble conteo del método.
```
:::

:::ejercicio sql ordenado titulo="Precio según anticipación"
¿Cuánto más paga quien compra tarde? Para reservas `economica` confirmadas, agrupa por días de anticipación (`fecha` del vuelo − `fecha_reserva`): `'0-7'`, `'8-30'`, `'31-60'`, `'61+'`. Columnas: `anticipacion`, `reservas`, `precio_promedio` (redondeado a 2). Ordena de menor a mayor anticipación.
```sql solucion
WITH r AS (
  SELECT r.precio, julianday(v.fecha) - julianday(r.fecha_reserva) AS dias
  FROM vuelos_reservas r JOIN vuelos_vuelos v ON v.vuelo_id = r.vuelo_id
  WHERE r.clase = 'economica' AND r.estado = 'confirmada'
)
SELECT CASE WHEN dias <= 7 THEN '0-7' WHEN dias <= 30 THEN '8-30' WHEN dias <= 60 THEN '31-60' ELSE '61+' END AS anticipacion,
       COUNT(*) AS reservas, ROUND(AVG(precio), 2) AS precio_promedio
FROM r
GROUP BY anticipacion
ORDER BY MIN(dias);
```
:::

:::ejercicio sql titulo="Propagación de demoras"
Cuando un avión llega tarde, su siguiente vuelo suele salir tarde. Pon a prueba esta hipótesis: para cada vuelo de **ida**, busca el vuelo de **vuelta** del mismo día (el que tiene `origen` = destino de la ida, `destino` = origen de la ida y un `vuelo_id` mayor). Calcula la demora de salida promedio de las vueltas (`demora_vuelta`, en minutos, redondeada a 1) según si la ida **llegó con más de 30 minutos** de demora (`ida_demorada` = `'sí'` / `'no'`). Solo vuelos no cancelados.
```sql solucion
WITH v AS (
  SELECT vuelo_id, origen, destino, fecha,
         (julianday(llegada_real) - julianday(llegada_programada)) * 1440 AS demora_llegada,
         (julianday(salida_real) - julianday(salida_programada)) * 1440 AS demora_salida
  FROM vuelos_vuelos WHERE estado <> 'cancelado'
)
SELECT CASE WHEN i.demora_llegada > 30 THEN 'sí' ELSE 'no' END AS ida_demorada,
       ROUND(AVG(r.demora_salida), 1) AS demora_vuelta
FROM v i JOIN v r ON r.origen = i.destino AND r.destino = i.origen AND r.fecha = i.fecha AND r.vuelo_id > i.vuelo_id
GROUP BY ida_demorada;
```
```explicacion
Las vueltas de un avión que llegó demorado salen bastante más tarde: la demora **se propaga**. Por eso las aerolíneas dejan tiempo de “colchón” entre vuelos en las rutas con más demoras. Fíjate en el método: no supusimos la propagación, la **medimos**.
```
:::

:::ejercicio sql ordenado titulo="Ingresos por ruta y clase"
Ingreso estimado 2024 por ruta: suma de `precio` de reservas confirmadas × 40. Devuelve las **5 rutas** con más ingreso: `origen`, `destino`, `ingreso` (redondeado a 0) y `pct_ejecutiva` (porcentaje del ingreso que viene de clase `ejecutiva`, redondeado a 2). Ordena por ingreso descendente.
```sql solucion
SELECT v.origen, v.destino,
       ROUND(SUM(r.precio) * 40, 0) AS ingreso,
       ROUND(100.0 * SUM(CASE WHEN r.clase = 'ejecutiva' THEN r.precio ELSE 0 END) / SUM(r.precio), 2) AS pct_ejecutiva
FROM vuelos_reservas r JOIN vuelos_vuelos v ON v.vuelo_id = r.vuelo_id
WHERE r.estado = 'confirmada'
GROUP BY v.origen, v.destino
ORDER BY ingreso DESC
LIMIT 5;
```
:::

:::errores
- **Puntualidad que excluye los vuelos cancelados**: se ve mejor de lo que es; los cancelados se reportan aparte.
- **Demora de llegada y de salida mezcladas**.
- **Factor de ocupación con pasajes vendidos** en vez de pasajeros embarcados.
- **Comparar precios sin la anticipación de la compra**: el mismo asiento cuesta distinto según cuándo se compra.
:::

:::entrevista "¿Cómo calcularías cuánto se propaga una demora en la red de vuelos?"
Uniría cada vuelo con el siguiente que opera el mismo avión ordenando por hora de salida, con `LEAD` por matrícula. La demora que se transmite es la demora de llegada del primero menos el margen entre la llegada programada y la salida del siguiente, menos el tiempo mínimo en tierra, si da positivo. Compararía esa demora heredada con la demora real del segundo vuelo para separar la propagada de la propia.
:::
