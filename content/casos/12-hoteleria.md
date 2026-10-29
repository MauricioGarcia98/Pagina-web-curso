---
titulo: "Caso 🏨 Posada Andina: ocupación, ADR, RevPAR y canales de venta"
nivel: Experto
duracion: 55
resumen: Una cadena de seis hoteles quiere saber qué hotel rinde más y cuánto le cuestan las agencias online. Calcula noches, ocupación, ADR y RevPAR, el ingreso neto de comisiones por canal, las cancelaciones según la anticipación y el gasto extra por estadía.
objetivos: Calcular noches vendidas, ocupación, ADR y RevPAR por hotel a partir de reservas con fechas de entrada y salida | Comparar canales por ingreso bruto y neto de comisiones | Medir la cancelación según la anticipación de la reserva | Calcular el gasto extra por estadía y la satisfacción por canal | Detectar la estacionalidad de la tarifa por destino
prerrequisitos: casos-metodo | sql-fechas | sql-case
autoevaluacion: ¿Sabes calcular las noches de una reserva con check-in y check-out? | ¿Puedes explicar por qué el RevPAR combina ocupación y precio? | ¿Sabes calcular el ingreso neto de comisión por canal? | ¿Sabes por qué las reservas con mucha anticipación se cancelan más? | ¿Puedes encontrar la temporada alta de un destino con los datos?
---

<!-- estandar:escenario -->
:::escenario ¿Cuánto nos cuesta Booking?
El director de **Posada Andina**, una cadena de seis hoteles en Sudamérica, está por renegociar con las agencias online:

> "Booking nos trae más reservas que nadie, pero nos cobra 18 % de comisión y sus clientes cancelan muchísimo. Quiero saber cuánto nos deja **de verdad** cada canal, qué hotel rinde más, y si vale la pena invertir en que la gente reserve directo en nuestra web."

Es la conversación más importante de la hotelería actual: la dependencia de las OTA (*online travel agencies*).
:::

## Cómo funciona un hotel

Un hotel vende **noches de habitación**. Como el asiento de un avión, una noche que no se vende **se pierde para siempre**. Por eso la gestión hotelera (*revenue management*) ajusta precios por temporada, día de la semana y anticipación para llenar el hotel al mejor precio posible.

Las reservas llegan por **canales**: la web propia (**directo**, sin comisión), las **OTA** (Booking, Expedia, con comisiones de 15–25 %) y las **agencias** de viajes.

| KPI | Fórmula | Pregunta que responde |
|---|---|---|
| **Noches vendidas** | suma de (check-out − check-in) de las estadías | ¿Cuánto vendimos? |
| **Ocupación** | noches vendidas / (habitaciones × días) | ¿Qué tan lleno está? |
| **ADR** (*average daily rate*) | ingreso de habitaciones / noches vendidas | ¿A qué precio vendimos? |
| **RevPAR** (*revenue per available room*) | ingreso de habitaciones / (habitaciones × días) = ocupación × ADR | ¿Cuánto rinde cada habitación, llena o vacía? |
| **Ingreso neto** | ingreso × (1 − comisión) | ¿Cuánto queda después del canal? |

El **RevPAR** es el KPI rey porque castiga los dos errores: un hotel lleno a precio de remate (ocupación alta, ADR bajo) y uno caro y vacío (ADR alto, ocupación baja).

## El modelo de datos

```text
hotel_hoteles   (hotel_id, nombre, ciudad, estrellas, habitaciones)
hotel_huespedes (huesped_id, pais, programa_fidelidad)
hotel_reservas  (reserva_id, hotel_id, huesped_id, fecha_reserva, check_in, check_out,
                 tipo_habitacion, canal, tarifa_noche, comision_pct, estado)
hotel_consumos  (consumo_id, reserva_id, fecha, concepto, monto)
hotel_resenas   (resena_id, reserva_id, fecha, puntaje)
```

```diagrama
titulo: Modelo de Posada Andina: la reserva es el centro
nodo hot: hotel_hoteles | icono=hotel | col=0 | fila=0 | color=azul | sub=habitaciones = capacidad
nodo hue: hotel_huespedes | icono=usuario | col=0 | fila=1 | color=gris | sub=país, fidelidad
nodo res: hotel_reservas | icono=archivo | col=1 | fila=0 | color=naranja | sub=check-in, check-out,\ncanal, tarifa, estado
nodo con: hotel_consumos | icono=comida | col=2 | fila=0 | color=verde | sub=restaurante, bar, spa…
nodo rev: hotel_resenas | icono=check | col=2 | fila=1 | color=violeta | sub=puntaje 1 a 10
flecha hot -> res: 1 a N
flecha hue -> res: 1 a N
flecha res -> con: 1 a N
flecha res -> rev: 0 o 1
```

- **Noches** de una reserva: `julianday(check_out) - julianday(check_in)` (el día de salida no se cuenta como noche).
- `estado`: `completada` (vino y se quedó), `cancelada` o `no_show` (no vino y no avisó). Solo las completadas ocupan habitaciones.
- `tarifa_noche` es el precio que pagó el huésped; `comision_pct` es lo que se lleva el canal (0 en directo).
- Las reservas son de check-in en 2024. El hotel nunca vende más habitaciones que las que tiene.

## Un ejemplo resuelto: el ranking por RevPAR

1. **Grano**: un hotel por fila. Las reservas se agregan por hotel (solo completadas) y se unen con `hotel_hoteles` para tener la capacidad.
2. **Disponibilidad**: habitaciones × 366 días (2024 fue bisiesto).

```sql
WITH r AS (
  SELECT hotel_id,
         SUM(julianday(check_out) - julianday(check_in)) AS noches,
         SUM((julianday(check_out) - julianday(check_in)) * tarifa_noche) AS ingreso
  FROM hotel_reservas
  WHERE estado = 'completada'
  GROUP BY hotel_id
)
SELECT h.nombre, h.habitaciones, r.noches,
       ROUND(100.0 * r.noches / (h.habitaciones * 366), 1) AS ocupacion_pct,
       ROUND(r.ingreso / r.noches, 2) AS adr,
       ROUND(r.ingreso / (h.habitaciones * 366), 2) AS revpar
FROM hotel_hoteles h
JOIN r ON r.hotel_id = h.hotel_id
ORDER BY revpar DESC;
```

| nombre | habitaciones | noches | ocupacion_pct | adr | revpar |
|---|---|---|---|---|---|
| Posada Andina Bariloche | 28 | 5027 | 49.1 | 137.92 | 67.65 |
| Posada Andina Cartagena | 30 | 5472 | 49.8 | 114.74 | 57.18 |
| Posada Andina Cusco | 24 | 4113 | 46.8 | 108.9 | 50.99 |
| Posada Andina Lima | 36 | 5965 | 45.3 | 111.16 | 50.32 |
| Posada Andina Mendoza | 18 | 3215 | 48.8 | 83.13 | 40.57 |
| Posada Andina Salta | 16 | 2800 | 47.8 | 82.65 | 39.52 |

**Lectura:** las ocupaciones son parecidas (45–50 %); la diferencia la hace el **precio**. Bariloche (5 estrellas) rinde 67,65 por habitación disponible y por día, 70 % más que Salta. Lima vende más noches que nadie, pero porque tiene más habitaciones: por habitación rinde menos que Cartagena.

:::cuidado Las trampas de este caso
- **Contar reservas en lugar de noches**: una reserva de 7 noches pesa siete veces más que una de una noche en la ocupación y en el ingreso.
- **Incluir canceladas o no-shows** en la ocupación: no ocuparon habitaciones. (En la realidad el no-show suele pagar la primera noche: es ingreso, pero no ocupación.)
- **El denominador del RevPAR** es la capacidad (habitaciones × días), no las noches vendidas: si divides por noches, obtienes el ADR.
- **Estadías que cruzan el fin de año**: una entrada el 30 de diciembre suma noches de 2025. Aquí la diferencia es mínima; en un informe oficial se recorta la estadía al período.
:::

<!-- estandar:trabajo -->
:::trabajo
- Los hoteles comparan su RevPAR con el de su **set competitivo** (los hoteles similares de la zona) usando datos de empresas como STR; un RevPAR bajo con ocupación normal indica que se está vendiendo barato.
- Las cadenas pagan millones por año en comisiones de OTA: cada punto que pasa de OTA a directo es margen. Por eso los programas de fidelidad dan beneficios solo al reservar directo.
- Las reservas llegan de un **PMS** (*property management system*) y de un **channel manager** que sincroniza las OTA: el pipeline típico las ingiere cada hora y recalcula el *pickup* (reservas nuevas para fechas futuras), que alimenta los precios.
:::

<!-- estandar:entrevista -->
:::entrevista "¿Qué es el RevPAR y por qué es mejor que la ocupación?"
RevPAR es el ingreso de habitaciones dividido por las habitaciones disponibles en el período; equivale a ocupación × ADR. La ocupación sola premia llenar el hotel a cualquier precio, y el ADR solo premia cobrar caro aunque el hotel quede vacío. El RevPAR mide cuánto rinde cada habitación que el hotel tiene, vendida o no, así que solo sube si se combina bien precio y ocupación.
:::

## Ejercicios

:::ejercicio sql ordenado titulo="Lo que deja cada canal"
Solo reservas `completada`. Por `canal`: `noches`, `ingreso_bruto` (noches × tarifa), `comisiones` y `ingreso_neto` (bruto − comisiones), redondeados a 0, y `pct_neto` (participación del canal en el ingreso neto total, redondeado a 1). Ordena por `ingreso_neto` descendente.
```sql solucion
WITH r AS (
  SELECT canal,
         julianday(check_out) - julianday(check_in) AS noches,
         (julianday(check_out) - julianday(check_in)) * tarifa_noche AS bruto,
         (julianday(check_out) - julianday(check_in)) * tarifa_noche * comision_pct / 100.0 AS comision
  FROM hotel_reservas
  WHERE estado = 'completada'
)
SELECT canal,
       SUM(noches) AS noches,
       ROUND(SUM(bruto), 0) AS ingreso_bruto,
       ROUND(SUM(comision), 0) AS comisiones,
       ROUND(SUM(bruto - comision), 0) AS ingreso_neto,
       ROUND(100.0 * SUM(bruto - comision) / SUM(SUM(bruto - comision)) OVER (), 1) AS pct_neto
FROM r
GROUP BY canal
ORDER BY ingreso_neto DESC;
```
```explicacion
Booking es el canal que más factura en bruto, pero después de su comisión queda por debajo del canal directo. Esa es la base de la negociación: cada reserva que pasa de Booking a la web propia vale un 18 % más.
```
:::

:::ejercicio sql ordenado titulo="Cancelaciones por canal"
Por `canal`: `reservas` (todas), `canceladas` y `pct_cancelacion` (redondeado a 1). Ordena por `pct_cancelacion` descendente.
```sql solucion
SELECT canal,
       COUNT(*) AS reservas,
       SUM(estado = 'cancelada') AS canceladas,
       ROUND(100.0 * AVG(estado = 'cancelada'), 1) AS pct_cancelacion
FROM hotel_reservas
GROUP BY canal
ORDER BY pct_cancelacion DESC;
```
:::

:::ejercicio sql ordenado titulo="La anticipación y la cancelación"
Agrupa las reservas por días entre `fecha_reserva` y `check_in`: `'0-7'`, `'8-30'`, `'31-60'` y `'61+'` (columna `anticipacion`). Para cada grupo: `reservas` y `pct_cancelacion` (redondeado a 1). Ordena en ese orden.
```sql solucion
WITH r AS (
  SELECT julianday(check_in) - julianday(fecha_reserva) AS dias, estado
  FROM hotel_reservas
)
SELECT CASE WHEN dias <= 7 THEN '0-7' WHEN dias <= 30 THEN '8-30' WHEN dias <= 60 THEN '31-60' ELSE '61+' END AS anticipacion,
       COUNT(*) AS reservas,
       ROUND(100.0 * AVG(estado = 'cancelada'), 1) AS pct_cancelacion
FROM r
GROUP BY 1
ORDER BY MIN(dias);
```
```pista
Para ordenar los tramos en orden lógico (no alfabético), ordena por `MIN(dias)` de cada grupo.
```
:::

:::ejercicio sql ordenado titulo="Temporada alta en Cusco"
Para el hotel de `Cusco`, por mes de check-in (`mes` como `'01'` … `'12'`): `reservas` completadas y `tarifa_promedio` (redondeado a 0). Ordena por mes.
```sql solucion
SELECT substr(r.check_in, 6, 2) AS mes,
       COUNT(*) AS reservas,
       ROUND(AVG(r.tarifa_noche), 0) AS tarifa_promedio
FROM hotel_reservas r
JOIN hotel_hoteles h ON h.hotel_id = r.hotel_id
WHERE h.ciudad = 'Cusco' AND r.estado = 'completada'
GROUP BY 1
ORDER BY 1;
```
```explicacion
Junio, julio y agosto (la temporada seca y de vacaciones de invierno, con el Inti Raymi) tienen más llegadas y tarifas casi 50 % más altas: el hotel ya aplica precios por temporada.
```
:::

:::ejercicio sql ordenado titulo="Gasto extra por estadía"
Para las reservas `completada`, por hotel (`nombre`): `estadias`, `gasto_extra` (suma de consumos, redondeado a 0) y `extra_por_estadia` (redondeado a 2). Las estadías sin consumos cuentan con 0. Ordena por `extra_por_estadia` descendente.
```sql solucion
WITH c AS (
  SELECT reserva_id, SUM(monto) AS extra FROM hotel_consumos GROUP BY reserva_id
)
SELECT h.nombre,
       COUNT(*) AS estadias,
       ROUND(SUM(COALESCE(c.extra, 0)), 0) AS gasto_extra,
       ROUND(AVG(COALESCE(c.extra, 0)), 2) AS extra_por_estadia
FROM hotel_reservas r
JOIN hotel_hoteles h ON h.hotel_id = r.hotel_id
LEFT JOIN c ON c.reserva_id = r.reserva_id
WHERE r.estado = 'completada'
GROUP BY h.nombre
ORDER BY extra_por_estadia DESC;
```
```pista
Suma los consumos por reserva en un CTE antes de unir (si unes directo, cada consumo multiplica la reserva). `COALESCE(extra, 0)` hace que las estadías sin consumos cuenten como 0 y bajen el promedio.
```
:::

:::ejercicio sql ordenado titulo="Satisfacción por canal y tipo de habitación"
Por `canal` y `tipo_habitacion`: `resenas` y `puntaje_promedio` (redondeado a 2). Solo combinaciones con al menos 30 reseñas. Ordena por `puntaje_promedio` descendente.
```sql solucion
SELECT r.canal, r.tipo_habitacion,
       COUNT(*) AS resenas,
       ROUND(AVG(e.puntaje), 2) AS puntaje_promedio
FROM hotel_resenas e
JOIN hotel_reservas r ON r.reserva_id = e.reserva_id
GROUP BY r.canal, r.tipo_habitacion
HAVING COUNT(*) >= 30
ORDER BY puntaje_promedio DESC;
```
:::

:::ejercicio abierto titulo="La estrategia de canales"
Con los resultados, prepara la recomendación para el director: (1) cuánto ganaría la cadena si un 20 % de las noches de Booking pasaran a directo (explica el cálculo); (2) qué política de cancelación propondrías y para qué reservas; (3) qué hotel tiene más margen para subir precios y con qué dato lo justificas; (4) qué tabla de gold armarías para que esto se vea todos los meses (grano y columnas).
```solucion
1. El ahorro es la comisión de las noches que se mueven: 20 % × ingreso bruto de Booking × 18 %. Con ~953 mil de ingreso bruto en Booking, son unos 34 mil al año, menos lo que cueste el incentivo para reservar directo (un descuento del 5 %, por ejemplo, que se resta de ese ahorro).
2. Cancelación: las reservas con más de 60 días de anticipación se cancelan mucho más (≈23 % contra ≈15 %). Tarifa "no reembolsable" con 10 % de descuento para esas reservas, y tarifa flexible solo hasta 14 días antes. En Booking, que es el canal con más cancelación, priorizar la no reembolsable.
3. Bariloche tiene el ADR más alto y aun así la mejor ocupación; Cartagena tiene la mejor ocupación con un ADR medio: ahí hay espacio para subir la tarifa en temporada alta sin perder ocupación. Lo justificaría con la ocupación de las noches de temporada alta (si está cerca del 100 %, el precio está bajo).
4. gold.fct_hotel_dia: una fila por hotel y noche (grano día-hotel), con noches_disponibles, noches_vendidas, ingreso_habitaciones, ingreso_neto, comisiones por canal y cancelaciones del día. De ahí salen ocupación, ADR y RevPAR por cualquier período sumando y dividiendo, sin errores de promedio de promedios.
```
:::
