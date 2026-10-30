---
titulo: "Proyecto 2: Detección de fraude en tiempo casi real"
nivel: Experto
duracion: 120
resumen: Transacciones de un banco digital con fraude etiquetado. Diseñas reglas a partir de los datos (monto atípico para ese cliente, país distinto, madrugada, ráfagas de compras), las mides contra las etiquetas (detección y falsas alarmas) y las llevas a un pipeline de streaming - primero simulado en tu computadora, después con Lakeflow Declarative Pipelines y expectativas de calidad en Databricks. Valor - pasar de detectar el fraude al día siguiente a detectarlo en minutos.
objetivos: Construir señales de fraude con funciones de ventana (monto habitual, ráfagas, cambio de país) | Medir una regla con detección (recall), precisión y tasa de falsas alarmas | Simular un stream localmente procesando micro-lotes | Escribir un pipeline declarativo con tablas de streaming y expectativas | Explicar el compromiso entre latencia, costo y falsas alarmas
prerrequisitos: portafolio-como-armar-tu-portafolio | sql-ventanas-2
autoevaluacion: ¿Sabes calcular el monto habitual de un cliente con una ventana? | ¿Sabes qué es recall y qué es precisión en este contexto? | ¿Sabes por qué una regla con 99 % de exactitud puede ser inútil? | ¿Sabes qué es una streaming table y una expectativa? | ¿Sabes cuánto cuesta tener un pipeline continuo encendido?
---

:::escenario
El equipo de prevención de fraude de un banco digital revisa cada mañana un reporte con las transacciones sospechosas **de ayer**. Para cuando llaman al cliente, la tarjeta ya se usó diez veces más. Te piden alertas "en minutos, no en horas", y que no inunden al equipo de falsos positivos: tienen tres analistas.
:::

## Valor y métricas

- **Latencia**: de ~24 h a menos de 5 minutos.
- **Detección (recall)**: qué porcentaje del fraude real genera alerta.
- **Precisión**: de las alertas, cuántas son fraude de verdad. Con tres analistas, el límite práctico son unas 50 alertas por día.

:::cuidado La exactitud engaña
Si el 0,6 % de las transacciones es fraude, una regla que dice "nunca es fraude" tiene **99,4 % de exactitud** y no sirve para nada. En problemas desbalanceados se mide detección y precisión, nunca exactitud.
:::

## Los datos

[🏭 Generar los datos del proyecto](#/generador?esc=banco&n=1500&semilla=7&desde=2024-01-01&hasta=2024-12-31&duplicados=1&nulos=2&formatos=2&tardios=4) · Escenario **Banco digital**: `clientes`, `cuentas`, `transacciones` (con `es_fraude`) y `prestamos`. El fraude sembrado tiene patrones reales: montos de 8 a 40 veces el gasto habitual del cliente, muchas veces en otro país y de madrugada.

```bash
generar-datos banco --filas 300 --semilla 7
duckdb -c "SELECT es_fraude, COUNT(*), ROUND(AVG(ABS(monto)),2) FROM '~/datos/generados/banco/transacciones.csv' GROUP BY es_fraude"
```

## Arquitectura

```diagrama
titulo: Fraude en tiempo casi real
nodo src: Transacciones | icono=banco | col=0 | fila=0 | sub=JSON por evento
nodo vol: Llegada | icono=bucket | col=1 | fila=0 | sub=archivos cada minuto\n(o Kafka / Event Hubs)
nodo br: bronze_tx | icono=lakeflow | col=2 | fila=0 | color=naranja | sub=streaming table
nodo sv: silver_tx | icono=lakeflow | col=3 | fila=0 | color=gris | sub=expectativas de calidad
nodo feat: Señales | icono=engranaje | col=3 | fila=1 | sub=monto vs habitual,\npaís, ráfagas
nodo al: alertas | icono=alerta | col=2 | fila=1 | color=rojo | sub=tabla + aviso
nodo eq: Analistas | icono=usuario | col=1 | fila=1 | sub=revisan y etiquetan
flecha src -> vol
flecha vol -> br: Auto Loader
flecha br -> sv
flecha sv -> feat
flecha feat -> al: reglas
flecha al -> eq
flecha eq -> feat: la etiqueta mejora las reglas | estilo=punteada
```

## Fase 1: las reglas, con datos (local)

Antes de pensar en streaming, se diseñan las reglas en batch y se **miden**. En DuckDB:

```sql norun
CREATE TABLE tx AS SELECT * FROM read_csv_auto('data/raw/transacciones.csv');

-- señales con ventanas: gasto habitual (mediana de los 30 días previos) y ráfagas
CREATE TABLE senales AS
SELECT t.*,
       median(abs(monto)) OVER w30              AS monto_habitual,
       count(*) OVER (PARTITION BY cuenta_id ORDER BY ts RANGE BETWEEN INTERVAL 10 MINUTES PRECEDING AND CURRENT ROW) AS tx_10min,
       hour(ts)                                 AS hora
FROM tx t
WINDOW w30 AS (PARTITION BY cuenta_id ORDER BY ts RANGE BETWEEN INTERVAL 30 DAYS PRECEDING AND INTERVAL 1 SECOND PRECEDING);

-- regla v1 y su evaluación contra la etiqueta
SELECT
  count(*) FILTER (WHERE alerta AND es_fraude)       AS verdaderos_positivos,
  count(*) FILTER (WHERE alerta AND NOT es_fraude)   AS falsas_alarmas,
  count(*) FILTER (WHERE NOT alerta AND es_fraude)   AS fraudes_perdidos
FROM (SELECT *, (abs(monto) > 8 * monto_habitual AND (hora < 6 OR pais_tx <> 'AR')) AS alerta FROM senales);
```

Itera: cambia el multiplicador, agrega el país o la ráfaga, y registra cada versión en una tabla de resultados (versión, recall, precisión, alertas por día). Esa tabla **es** el corazón del README.

## Fase 2: streaming simulado (local)

Un script escribe las transacciones en archivos de un minuto en `data/stream/`, y otro proceso las lee por micro-lotes, calcula señales con el estado de las últimas horas y escribe alertas. Con Spark local:

```python norun
df = (spark.readStream.schema(esquema).json("data/stream/")
        .withWatermark("ts", "10 minutes"))
alertas = df.join(habitual, "cuenta_id").where("abs(monto) > 8 * monto_habitual")
(alertas.writeStream.format("delta").option("checkpointLocation", "chk/alertas")
        .trigger(processingTime="30 seconds").start("lake/alertas"))
```

## Fase 3: Lakeflow Declarative Pipelines en Databricks

```sql norun
CREATE OR REFRESH STREAMING TABLE bronze_tx AS
SELECT *, current_timestamp() AS _ingesta
FROM STREAM read_files('/Volumes/workspace/fraude/llegada/', format => 'json');

CREATE OR REFRESH STREAMING TABLE silver_tx (
  CONSTRAINT monto_valido EXPECT (monto IS NOT NULL AND monto <> 0) ON VIOLATION DROP ROW,
  CONSTRAINT cuenta_presente EXPECT (cuenta_id IS NOT NULL) ON VIOLATION FAIL UPDATE
) AS SELECT * FROM STREAM bronze_tx;

CREATE OR REFRESH MATERIALIZED VIEW alertas AS
SELECT s.*, h.monto_habitual
FROM silver_tx s JOIN perfil_cliente h USING (cuenta_id)
WHERE abs(s.monto) > 8 * h.monto_habitual AND (hour(s.ts) < 6 OR s.pais_tx <> h.pais);
```

- `perfil_cliente` es una tabla que se recalcula cada noche en batch (el gasto habitual cambia lento): **no todo tiene que ser streaming**.
- Las **expectativas** registran cuántas filas violaron cada regla: el pipeline trae su propio tablero de calidad.
- Modo **disparado** (triggered) cada 5 minutos en lugar de continuo: casi la misma latencia para el negocio y una fracción del costo. Explícalo en el README.

:::errores
- **Llamarlo "tiempo real" cuando corre cada hora**: di "tiempo casi real" y la latencia medida.
- **Sin checkpoint en el streaming**: al reiniciar, procesa todo de nuevo o pierde eventos.
- **Reglas de fraude sin medir falsos positivos**: una alerta que nadie puede revisar no sirve.
- **Sin watermark** en agregaciones por ventana: el estado crece sin límite.
:::

:::trabajo
- Los sistemas de fraude combinan reglas simples (rápidas y explicables) con modelos; el data engineer arma el flujo de eventos, las features y la tabla de alertas que revisa un equipo.
:::

:::entrevista "¿Cómo manejarías eventos que llegan tarde en un streaming de transacciones?"
Con una watermark que define cuánto atraso acepto, por ejemplo 10 minutos sobre la hora del evento, de modo que las ventanas se cierran después de ese margen y el estado no crece sin límite. Los eventos que llegan más tarde se envían a una tabla aparte para revisar o reprocesar en batch. Usaría checkpoints para no perder ni duplicar al reiniciar, y una escritura idempotente en Delta.
:::

## Entregables

- [ ] Tabla de versiones de reglas con recall, precisión y alertas por día; la elegida y por qué.
- [ ] Pipeline local de micro-lotes y pipeline declarativo en Databricks.
- [ ] Expectativas de calidad y lo que filtraron.
- [ ] Cálculo de latencia de punta a punta y costo estimado (continuo contra disparado).

## Práctica

:::ejercicio cli dificultad=Básico titulo="Los datos del banco"
Genera los datos del escenario `banco` con 300 clientes y semilla 7.
```respuesta
todos: generar-datos banco || --filas 300 || --semilla 7
```
```solucion
generar-datos banco --filas 300 --semilla 7
```
:::

:::ejercicio cli dificultad=Intermedio titulo="¿Qué tan raro es el fraude?"
Con DuckDB, cuenta las transacciones por valor de `es_fraude` en `~/datos/generados/banco/transacciones.csv`.
```setup
generar-datos banco --filas 300 --semilla 7
```
```respuesta
duckdb -c ['"]SELECT es_fraude, ?COUNT\(\*\).*FROM.*transacciones\.csv.*GROUP BY es_fraude.*['"]
```
```solucion
duckdb -c "SELECT es_fraude, COUNT(*) FROM '~/datos/generados/banco/transacciones.csv' GROUP BY es_fraude"
```
:::

:::ejercicio sql ordenado dificultad=Avanzado titulo="El gasto habitual"
Para cada transacción de `tx`, calcula `promedio_previo`: el promedio de `monto` de las transacciones **anteriores** de la misma cuenta (NULL si es la primera). Devuelve `tx_id`, `cuenta_id`, `monto` y `promedio_previo` (2 decimales), ordenado por `tx_id`.
```sql setup
CREATE TABLE tx (tx_id INTEGER, cuenta_id INTEGER, ts TEXT, monto REAL, pais TEXT, es_fraude INTEGER);
INSERT INTO tx VALUES
(1, 10, '2024-05-01 10:00', 40, 'AR', 0), (2, 10, '2024-05-02 12:00', 55, 'AR', 0), (3, 10, '2024-05-03 09:30', 35, 'AR', 0),
(4, 10, '2024-05-04 03:12', 1200, 'US', 1), (5, 20, '2024-05-01 18:00', 300, 'CL', 0), (6, 20, '2024-05-02 19:00', 280, 'CL', 0),
(7, 20, '2024-05-03 20:00', 320, 'CL', 0), (8, 10, '2024-05-04 03:15', 900, 'US', 1);
```
```sql solucion
SELECT tx_id, cuenta_id, monto,
       ROUND(AVG(monto) OVER (PARTITION BY cuenta_id ORDER BY ts ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 2) AS promedio_previo
FROM tx
ORDER BY tx_id;
```
```pista
Un marco que termina en la fila anterior: `ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING`.
```
```explicacion
Excluir la fila actual es clave: si el promedio incluye la compra de 1.200, el fraude "contamina" su propio umbral. Fíjate también en la transacción 8: su promedio previo ya incluye el fraude de la 4. En producción el perfil se calcula solo con transacciones confirmadas como legítimas.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="Medir la regla"
Con la regla "monto mayor a 5 veces el promedio previo de la cuenta", calcula `vp` (alertas que son fraude), `fp` (alertas que no lo son) y `fn` (fraudes sin alerta). Las transacciones sin promedio previo no generan alerta.
```sql setup
CREATE TABLE tx (tx_id INTEGER, cuenta_id INTEGER, ts TEXT, monto REAL, pais TEXT, es_fraude INTEGER);
INSERT INTO tx VALUES
(1, 10, '2024-05-01 10:00', 40, 'AR', 0), (2, 10, '2024-05-02 12:00', 55, 'AR', 0), (3, 10, '2024-05-03 09:30', 35, 'AR', 0),
(4, 10, '2024-05-04 03:12', 1200, 'US', 1), (5, 20, '2024-05-01 18:00', 300, 'CL', 0), (6, 20, '2024-05-02 19:00', 280, 'CL', 0),
(7, 20, '2024-05-03 20:00', 320, 'CL', 0), (8, 10, '2024-05-04 03:15', 900, 'US', 1), (9, 30, '2024-05-01 11:00', 20, 'MX', 0),
(10, 30, '2024-05-02 11:00', 150, 'MX', 0), (11, 30, '2024-05-02 23:50', 60, 'PE', 1);
```
```sql solucion
WITH s AS (
  SELECT *, AVG(monto) OVER (PARTITION BY cuenta_id ORDER BY ts ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev
  FROM tx
),
a AS (SELECT es_fraude, CASE WHEN prev IS NOT NULL AND monto > 5 * prev THEN 1 ELSE 0 END AS alerta FROM s)
SELECT SUM(alerta = 1 AND es_fraude = 1) AS vp,
       SUM(alerta = 1 AND es_fraude = 0) AS fp,
       SUM(alerta = 0 AND es_fraude = 1) AS fn
FROM a;
```
```pista
Primero calcula `prev` con la ventana del ejercicio anterior; después marca `alerta` y cuenta las cuatro combinaciones que importan.
```
```explicacion
1 verdadero positivo (el de 1.200), 1 falsa alarma (la compra de 150 de la cuenta 30, que tenía poca historia) y 2 fraudes perdidos: el de 900, porque el promedio previo de la cuenta ya incluía el fraude de 1.200 y subió el umbral, y el de 60 en otro país de madrugada. Recall = 1/3 y precisión = 1/2: una regla pobre. Dos mejoras salen de este análisis: calcular el gasto habitual solo con transacciones legítimas (o con la mediana, que resiste valores extremos) y agregar la señal "otro país + madrugada". Así se itera.
```
:::

:::ejercicio quiz dificultad=Avanzado
El fraude es el 0,6 % de las transacciones. Una regla tiene 99,3 % de exactitud. ¿Qué concluyes?

- [ ] Es excelente: casi no se equivoca
- [x] No alcanza para saber nada: hay que mirar recall y precisión, porque "nunca es fraude" ya tendría 99,4 %
- [ ] Es mala, porque tiene menos de 99,4 %
- [ ] Hay que entrenar una red neuronal
:::

:::ejercicio quiz dificultad=Avanzado
¿Por qué el perfil de gasto habitual se calcula en batch cada noche y no en el stream?

- [ ] Porque Databricks no permite unir un stream con una tabla
- [x] Porque cambia lento: recalcularlo una vez por día es suficiente, más simple y más barato; el stream solo compara contra él
- [ ] Porque el streaming no soporta promedios
- [ ] Porque así lo exige la regulación bancaria
:::

:::ejercicio quiz dificultad=Intermedio
Una expectativa `ON VIOLATION DROP ROW` filtra las transacciones con monto nulo. ¿Qué tienes que hacer además?

- [ ] Nada: el problema desaparece
- [x] Mirar las métricas de la expectativa (cuántas filas descarta) y alertar si crecen: descartar en silencio también es un fallo silencioso
- [ ] Cambiarla a `FAIL UPDATE` siempre
- [ ] Borrar la expectativa
:::

## Para ir más lejos

- Un modelo (regresión logística o gradient boosting) con MLflow que use las señales como features, comparado contra las reglas con la misma tabla de métricas.
- Llegada real por Kafka o Event Hubs en lugar de archivos.
- Retroalimentación: la etiqueta del analista vuelve como tabla y alimenta la próxima versión de las reglas.
