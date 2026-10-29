---
titulo: Casos senior - pedidos ambiguos, supuestos explícitos y datos que no cierran
nivel: Experto
duracion: 70
resumen: Lo que separa a un analista senior - recibir un pedido ambiguo, escribir los supuestos, elegir la definición defendible, resolver problemas de grano difíciles (ocupación por noche, primas devengadas, puntualidad), auditar la calidad de los datos antes de confiar en ellos y comunicar el resultado con sus límites.
objetivos: Convertir un pedido ambiguo en supuestos escritos y una definición defendible | Resolver métricas que exigen cambiar el grano (noches, meses de vigencia) | Auditar duplicados, nulos y valores imposibles antes de analizar | Comunicar el número con su definición y sus límites
autoevaluacion: ¿Sabes escribir los supuestos de un análisis? | ¿Sabes calcular la ocupación hotelera noche por noche? | ¿Sabes calcular primas devengadas de un período? | ¿Sabes qué controles de calidad hacer antes de responder?
---

:::escenario
Ya no te dan enunciados prolijos. Te llegan mensajes como “¿cómo venimos con la ocupación?”, “¿qué tan rentable es el ramo autos?” o “¿hay gente robando luz?”. Tu trabajo es transformar eso en una pregunta precisa, decidir y escribir los supuestos, resolver la consulta (muchas veces con un cambio de grano difícil) y entregar el número con su letra chica. En estos ejercicios, los supuestos ya están acordados: practicás la parte técnica difícil.
:::

## La plantilla de un análisis senior

1. **Pedido original** (textual).
2. **Pregunta precisa**: qué métrica, de qué población, en qué período.
3. **Supuestos**: qué se incluye y qué no, y por qué.
4. **Controles de calidad**: duplicados, nulos, valores imposibles, cobertura de fechas.
5. **Resultado** y **cómo leerlo**.
6. **Límites**: qué no responde este análisis y qué haría falta.

## Cambiar el grano: el corazón de los casos difíciles

- **Ocupación hotelera**: una reserva es un rango de noches, pero la ocupación se mide **por noche**. Hay que “explotar” cada reserva en una fila por noche (cruzándola con un calendario) para contar cuántas habitaciones estaban ocupadas cada noche, incluso si la reserva empezó el mes anterior.
- **Primas devengadas**: una póliza anual no “ingresa” todo el primer mes; se gana mes a mes mientras está vigente. Para un año, se cuentan los meses de vigencia que caen dentro del año.
- **Puntualidad**: un vuelo está a tiempo si sale (o llega) con menos de 15 minutos de demora sobre lo programado; los cancelados se informan aparte.

```sql
-- noches ocupadas de cada hotel en la primera semana de diciembre
WITH RECURSIVE cal(noche) AS (
  SELECT '2024-12-01' UNION ALL SELECT date(noche, '+1 day') FROM cal WHERE noche < '2024-12-07'
)
SELECT r.hotel_id, cal.noche, COUNT(*) AS habitaciones_ocupadas
FROM cal
JOIN hotel_reservas r ON r.check_in <= cal.noche AND cal.noche < r.check_out
WHERE r.estado = 'completada'
GROUP BY r.hotel_id, cal.noche
ORDER BY r.hotel_id, cal.noche
LIMIT 7;
```

:::cuidado Auditar antes de responder
Un número rápido sobre datos sucios es peor que ningún número. Antes de entregar: ¿hay duplicados en la clave?, ¿hay montos negativos o fechas imposibles?, ¿la cobertura del período está completa?
:::

## Ejercicios

:::ejercicio sql dificultad=Avanzado
Banco: “¿Cuánta plata tienen los clientes premium?”. Supuestos: saldo de una cuenta = depósitos − (compras + transferencias + retiros + pagos de tarjeta); solo cuentas **activas**; clientes del segmento `Premium`. Devuelve `clientes`, `cuentas` y `saldo_total` (2 decimales).
```pista
El saldo se calcula con las transacciones: `SUM(CASE WHEN tipo = 'deposito' THEN monto ELSE -monto END)`.
```
```pista
Une clientes → cuentas → transacciones, filtra segmento y estado, y cuenta con `DISTINCT`.
```
```sql solucion
SELECT COUNT(DISTINCT c.cliente_id) AS clientes, COUNT(DISTINCT cu.cuenta_id) AS cuentas,
       ROUND(SUM(CASE WHEN t.tipo = 'deposito' THEN t.monto ELSE -t.monto END), 2) AS saldo_total
FROM banco_clientes c
JOIN banco_cuentas cu ON cu.cliente_id = c.cliente_id
JOIN banco_transacciones t ON t.cuenta_id = cu.cuenta_id
WHERE c.segmento = 'Premium' AND cu.estado = 'activa';
```
:::

:::ejercicio sql ordenado dificultad=Experto
Hotelería: “¿Cómo venimos con la ocupación en diciembre?”. Supuestos: ocupación de cada hotel en diciembre de 2024 = noches-habitación ocupadas ÷ (habitaciones × 31), en %, 1 decimal; cuentan las reservas `completada` y `no_show` (la habitación quedó bloqueada); una reserva ocupa las noches desde `check_in` hasta el día anterior a `check_out`. Columnas: `hotel`, `ocupacion_pct`. Ordena por ocupación de mayor a menor.
```pista
Arma el calendario de las 31 noches de diciembre y únelo con las reservas con `check_in <= noche AND noche < check_out`.
```
```pista
Cuenta las noches ocupadas por hotel y divide por `habitaciones * 31` (de `hotel_hoteles`).
```
```sql solucion
WITH RECURSIVE cal(noche) AS (SELECT '2024-12-01' UNION ALL SELECT date(noche, '+1 day') FROM cal WHERE noche < '2024-12-31'),
ocupadas AS (
  SELECT r.hotel_id, COUNT(*) AS noches
  FROM cal JOIN hotel_reservas r ON r.check_in <= cal.noche AND cal.noche < r.check_out
  WHERE r.estado IN ('completada', 'no_show')
  GROUP BY r.hotel_id
)
SELECT h.nombre AS hotel, ROUND(100.0 * o.noches / (h.habitaciones * 31), 1) AS ocupacion_pct
FROM hotel_hoteles h JOIN ocupadas o ON o.hotel_id = h.hotel_id
ORDER BY ocupacion_pct DESC;
```
:::

:::ejercicio sql ordenado dificultad=Avanzado
Aerolínea: “¿Qué rutas son las menos puntuales?”. Supuestos: puntualidad de salida (OTP) = vuelos que salieron con menos de 15 minutos de demora ÷ vuelos que volaron (sin cancelados), en %, 1 decimal; solo rutas con al menos 100 vuelos. Muestra las 5 peores. Columnas: `ruta` (`origen-destino`), `vuelos`, `otp_pct`. Ordena por OTP ascendente y desempata por ruta.
```pista
Demora en minutos: `(julianday(salida_real) - julianday(salida_programada)) * 1440`.
```
```sql solucion
SELECT origen || '-' || destino AS ruta, COUNT(*) AS vuelos,
       ROUND(100.0 * SUM(CASE WHEN (julianday(salida_real) - julianday(salida_programada)) * 1440 < 15 THEN 1 ELSE 0 END) / COUNT(*), 1) AS otp_pct
FROM vuelos_vuelos
WHERE estado <> 'cancelado'
GROUP BY ruta
HAVING COUNT(*) >= 100
ORDER BY otp_pct, ruta
LIMIT 5;
```
:::

:::ejercicio sql ordenado dificultad=Avanzado
Clínica: “¿Por qué falta tanta gente a los turnos?”. Supuestos: ausentismo = ausentes ÷ (atendidos + ausentes), en %, 1 decimal, por rango de **anticipación** (días entre `fecha_reserva` y la fecha del turno): `0-2`, `3-7`, `8-30`, `más de 30`. Columnas: `anticipacion`, `turnos`, `ausentismo_pct`. Ordena por `turnos` de mayor a menor.
```pista
Anticipación: `julianday(date(fecha_hora)) - julianday(fecha_reserva)`. Excluye los cancelados.
```
```sql solucion
WITH t AS (
  SELECT estado, julianday(date(fecha_hora)) - julianday(fecha_reserva) AS dias FROM clinica_turnos WHERE estado <> 'cancelado'
)
SELECT CASE WHEN dias <= 2 THEN '0-2' WHEN dias <= 7 THEN '3-7' WHEN dias <= 30 THEN '8-30' ELSE 'más de 30' END AS anticipacion,
       COUNT(*) AS turnos,
       ROUND(100.0 * SUM(CASE WHEN estado = 'ausente' THEN 1 ELSE 0 END) / COUNT(*), 1) AS ausentismo_pct
FROM t GROUP BY anticipacion ORDER BY turnos DESC;
```
:::

:::ejercicio sql ordenado dificultad=Experto
Seguros: “¿Qué tan rentable fue cada ramo en 2024?”. Supuestos: siniestralidad = montos **pagados** de siniestros ocurridos en 2024 ÷ primas **devengadas** en 2024, en %, 1 decimal. Prima devengada de una póliza = `prima_mensual × meses de 2024 en que estuvo vigente`; para simplificar, cuenta los meses calendario de 2024 cuyo primer día cae entre `fecha_inicio` y `fecha_fin`. Columnas: `ramo`, `primas`, `pagado`, `siniestralidad_pct`. Ordena por siniestralidad de mayor a menor.
```pista
Arma un calendario con los 12 primeros días de mes de 2024 y únelo con las pólizas vigentes ese día: cada fila es un mes devengado.
```
```pista
Calcula primas por ramo y pagos por ramo en dos CTE separadas (si las unes antes de agrupar, multiplicas filas) y combínalas al final.
```
```sql solucion
WITH RECURSIVE meses(m) AS (SELECT '2024-01-01' UNION ALL SELECT date(m, '+1 month') FROM meses WHERE m < '2024-12-01'),
primas AS (
  SELECT p.ramo, SUM(p.prima_mensual) AS primas
  FROM meses JOIN seguros_polizas p ON p.fecha_inicio <= meses.m AND meses.m <= p.fecha_fin
  GROUP BY p.ramo
),
pagos AS (
  SELECT p.ramo, SUM(s.monto_pagado) AS pagado
  FROM seguros_siniestros s JOIN seguros_polizas p ON p.poliza_id = s.poliza_id
  WHERE s.fecha_ocurrencia >= '2024-01-01' AND s.fecha_ocurrencia < '2025-01-01'
  GROUP BY p.ramo
)
SELECT pr.ramo, ROUND(pr.primas, 2) AS primas, ROUND(COALESCE(pg.pagado, 0), 2) AS pagado,
       ROUND(100.0 * COALESCE(pg.pagado, 0) / pr.primas, 1) AS siniestralidad_pct
FROM primas pr LEFT JOIN pagos pg ON pg.ramo = pr.ramo
ORDER BY siniestralidad_pct DESC;
```
:::

:::ejercicio sql ordenado dificultad=Experto
Energía: “¿Hay gente robando luz?”. Supuestos: un medidor es **sospechoso** en un mes si su consumo real (lectura no estimada) es menor al 40 % del promedio de sus 3 meses anteriores (los tres con lectura). Lista los meses sospechosos de los medidores. Columnas: `medidor_id`, `mes`, `kwh`, `promedio_3m` (1 decimal). Ordena por medidor y mes.
```pista
`AVG(kwh) OVER (PARTITION BY medidor_id ORDER BY mes ROWS BETWEEN 3 PRECEDING AND 1 PRECEDING)` es el promedio de los 3 meses anteriores.
```
```pista
Asegúrate de que haya 3 meses anteriores: `COUNT(*) OVER (… mismo marco …) = 3`. Y filtra `estimada = 0` después de calcular la ventana.
```
```sql solucion
WITH v AS (
  SELECT medidor_id, mes, kwh, estimada,
         AVG(kwh) OVER (PARTITION BY medidor_id ORDER BY mes ROWS BETWEEN 3 PRECEDING AND 1 PRECEDING) AS prom,
         COUNT(*) OVER (PARTITION BY medidor_id ORDER BY mes ROWS BETWEEN 3 PRECEDING AND 1 PRECEDING) AS n
  FROM energia_lecturas
)
SELECT medidor_id, mes, kwh, ROUND(prom, 1) AS promedio_3m
FROM v
WHERE n = 3 AND estimada = 0 AND kwh < 0.4 * prom
ORDER BY medidor_id, mes;
```
:::

:::ejercicio sql dificultad=Avanzado
Telco: “¿Cuánto nos cuesta la portabilidad?”. Supuestos: líneas dadas de baja en 2024 por `portabilidad`, y el ingreso mensual que facturaban en su último mes con consumo (suma). Columnas: `lineas`, `ingreso_mensual_perdido` (2 decimales).
```pista
Para cada línea, el último mes con consumo es `MAX(mes)`; trae su `monto_facturado` con un JOIN.
```
```sql solucion
WITH bajas AS (
  SELECT linea_id FROM telco_lineas WHERE motivo_baja = 'portabilidad' AND fecha_baja >= '2024-01-01' AND fecha_baja < '2025-01-01'
), ultimo AS (
  SELECT c.linea_id, MAX(c.mes) AS mes FROM telco_consumos c JOIN bajas b ON b.linea_id = c.linea_id GROUP BY c.linea_id
)
SELECT COUNT(*) AS lineas, ROUND(SUM(c.monto_facturado), 2) AS ingreso_mensual_perdido
FROM ultimo u JOIN telco_consumos c ON c.linea_id = u.linea_id AND c.mes = u.mes;
```
:::

:::ejercicio sql ordenado dificultad=Avanzado
Logística: “¿Qué transportista cumple?”. Supuestos: OTIF = envíos **entregados** con `fecha_entrega <= fecha_prometida` ÷ envíos despachados que no siguen en tránsito, en %, 1 decimal; perdidos y devueltos cuentan como incumplidos. Columnas: `transportista`, `envios`, `otif_pct`. Ordena por OTIF de mayor a menor.
```sql solucion
SELECT transportista, COUNT(*) AS envios,
       ROUND(100.0 * SUM(CASE WHEN estado = 'entregado' AND fecha_entrega <= fecha_prometida THEN 1 ELSE 0 END) / COUNT(*), 1) AS otif_pct
FROM logistica_envios
WHERE estado <> 'en_transito'
GROUP BY transportista
ORDER BY otif_pct DESC;
```
:::

:::ejercicio sql dificultad=Avanzado
Auditoría de calidad antes de un análisis de clientes: en `clientes_crudo`, cuántos registros hay (`registros`), cuántos clientes distintos (`clientes`), cuántos emails distintos **normalizados** (en minúsculas y sin espacios, sin contar nulos: `emails`) y cuántos registros no tienen email (`sin_email`).
```sql solucion
SELECT COUNT(*) AS registros, COUNT(DISTINCT cliente_id) AS clientes,
       COUNT(DISTINCT LOWER(TRIM(email))) AS emails,
       SUM(CASE WHEN email IS NULL THEN 1 ELSE 0 END) AS sin_email
FROM clientes_crudo;
```
:::

:::ejercicio sql ordenado dificultad=Experto
Delivery: “¿Los cupones de bienvenida traen clientes que se quedan?”. Supuestos: el **primer pedido** de cada cliente (por `creado`) define si llegó con cupón (`descuento_cupon > 0`). Retención = clientes con al menos un pedido **en los 30 días siguientes** a su primer pedido ÷ clientes del grupo, en %, 1 decimal. Columnas: `llego_con_cupon` (1 o 0), `clientes`, `retencion_30d_pct`. Ordena por `llego_con_cupon`.
```pista
Numera los pedidos de cada cliente con `ROW_NUMBER()` para encontrar el primero.
```
```pista
Para la retención, busca con `EXISTS` otro pedido del cliente con `creado > primero` y `creado <= datetime(primero, '+30 days')`.
```
```sql solucion
WITH n AS (
  SELECT cliente_id, creado, descuento_cupon, ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY creado, pedido_id) AS rn FROM delivery_pedidos
), primero AS (SELECT cliente_id, creado, CASE WHEN descuento_cupon > 0 THEN 1 ELSE 0 END AS cupon FROM n WHERE rn = 1)
SELECT f.cupon AS llego_con_cupon, COUNT(*) AS clientes,
       ROUND(100.0 * SUM(CASE WHEN EXISTS (SELECT 1 FROM delivery_pedidos p WHERE p.cliente_id = f.cliente_id AND p.creado > f.creado AND p.creado <= datetime(f.creado, '+30 days')) THEN 1 ELSE 0 END) / COUNT(*), 1) AS retencion_30d_pct
FROM primero f
GROUP BY f.cupon
ORDER BY f.cupon;
```
:::

:::ejercicio quiz dificultad=Avanzado
Terminaste el análisis de ocupación y la cadena dio 53,7 % en diciembre. ¿Cómo lo comunicas?

- [ ] “La ocupación de diciembre fue 53,7 %.”
- [x] “53,7 % de ocupación en diciembre (noches-habitación ocupadas, incluyendo no-shows, sobre habitaciones × 31). Cartagena y Lima superan el 66 %; Salta, Cusco y Mendoza están por debajo del 43 %. No incluye bloqueos por mantenimiento, que no están en los datos.”
- [ ] Mandar la consulta SQL para que la lean
- [ ] Mandar un tablero con todas las métricas posibles para que elijan
:::
