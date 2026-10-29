---
titulo: "Proyecto 12: Observabilidad de datos - salud, calidad y costos de la plataforma"
nivel: Experto
duracion: 110
resumen: El proyecto que demuestra experiencia de producción. Sobre un dataset "caótico" (duplicados, nulos, tardíos, huérfanos), construyes un sistema que mide la salud de cada tabla (frescura, volumen, nulos, unicidad), registra cada ejecución del pipeline, alerta solo cuando hay que actuar, calcula el costo por pipeline y lleva un registro de incidentes con su postmortem. Une lo aprendido en el módulo de Guardia en un producto propio.
objetivos: Diseñar una tabla de resultados de checks reutilizable para cualquier tabla | Calcular frescura, volumen anómalo, nulos y unicidad de forma genérica | Registrar ejecuciones y calcular SLO de frescura | Estimar el costo por pipeline y detectar regresiones | Construir un tablero de salud y un flujo de alertas accionables
prerrequisitos: incidentes-monitoreo-y-checks | portafolio-lakehouse-de-ventas
autoevaluacion: ¿Sabes qué columnas tiene una tabla de resultados de checks? | ¿Sabes calcular el cumplimiento de un SLO de frescura? | ¿Sabes detectar una regresión de duración o de costo? | ¿Sabes evitar la fatiga de alertas? | ¿Sabes qué va en el postmortem de un incidente?
---

:::escenario
El banco del proyecto 2 ya tiene diez pipelines. Cada mañana alguien pregunta "¿están bien los datos?" y nadie puede responder sin abrir cinco pantallas. La semana pasada la tabla de transacciones tuvo un 12 % de nulos durante dos días y nadie lo notó. Te piden un sistema que responda esa pregunta en un vistazo y que avise **solo** cuando haya que hacer algo.
:::

## Las piezas

| Pieza | Qué guarda |
|---|---|
| `obs.ejecuciones` | Cada corrida de cada pipeline: inicio, fin, estado, filas leídas y escritas |
| `obs.checks` | Cada resultado de cada check: tabla, check, valor, umbral, resultado, momento |
| `obs.slo` | Objetivos acordados: "transacciones fresca a las 06:00 el 99 % de los días" |
| `obs.costos` | Costo por pipeline y día (desde las tablas de sistema o la factura) |
| `obs.incidentes` | Cada incidente: inicio, detección, resolución, causa, acciones |

## Los datos

[🏭 Generar los datos del proyecto](#/generador?esc=banco&n=1500&semilla=99&desde=2024-01-01&hasta=2024-12-31&duplicados=8&nulos=12&formatos=15&atipicos=5&huerfanos=6&tardios=10&mojibake=5) · Escenario **Banco** con problemas "caótico": es tu laboratorio de fallas.

## Arquitectura

```diagrama
titulo: Observabilidad de datos
nodo p: Pipelines | icono=orquestador | col=0 | fila=0 | sub=registran cada ejecución
nodo t: Tablas | icono=tabla | col=0 | fila=1
nodo ch: Checks genéricos | icono=check | col=1 | fila=1 | sub=frescura, volumen,\nnulos, unicidad
nodo obs: Esquema obs | icono=base | col=2 | fila=0 | forma=cilindro | sub=ejecuciones, checks,\nslo, costos, incidentes
nodo tb: Tablero de salud | icono=dashboard | col=3 | fila=0 | color=verde
nodo al: Alertas | icono=alerta | col=3 | fila=1 | color=rojo | sub=solo lo accionable
flecha p -> obs
flecha t -> ch
flecha ch -> obs
flecha obs -> tb
flecha obs -> al
```

## Checks genéricos

En lugar de escribir un check por tabla, una **configuración** (YAML o tabla) dice qué medir y un único job los corre todos:

```yaml
transacciones:
  frescura: { columna: ts, max_horas: 6 }
  volumen:  { comparar_con: mismo_dia_4_semanas, min_ratio: 0.7 }
  nulos:    { columnas: [cuenta_id, monto], max_pct: 1 }
  unicidad: [tx_id]
```

Cada resultado se escribe en `obs.checks` con la misma forma: así el tablero y las alertas no dependen de cada tabla.

## Costos

En Databricks, la tabla de sistema `system.billing.usage` tiene el consumo (DBU) por día y por job; multiplicado por el precio de lista da el costo por pipeline. En Azure, el análisis de costos se exporta a una cuenta de almacenamiento. Lo importante es la **tendencia**: un pipeline que pasó de 3 a 9 USD por día sin que creciera el volumen es una regresión.

## Entregables

- [ ] Esquema `obs` y el job de checks genéricos configurado para al menos 4 tablas.
- [ ] Tablero de salud: semáforo por tabla, SLO del mes, costos por pipeline.
- [ ] Reglas de alerta con dueño, severidad y enlace al runbook; revisión del ruido de un mes.
- [ ] Un incidente provocado a propósito (por ejemplo, cargar un día con 12 % de nulos), detectado por el sistema, con su postmortem.

## Práctica

:::ejercicio cli dificultad=Básico titulo="Los datos caóticos"
Genera el escenario `banco` con 300 clientes, semilla 99 y problemas `caotico`.
```respuesta
todos: generar-datos banco || --filas 300 || --semilla 99 || --problemas caotico
```
```solucion
generar-datos banco --filas 300 --semilla 99 --problemas caotico
```
:::

:::ejercicio sql ordenado dificultad=Avanzado titulo="Checks genéricos en una sola consulta"
`tx_obs(tx_id, cuenta_id, monto, cargado_en)` es la tabla a vigilar. Escribe la consulta que produce las filas de `obs.checks`: `check_nombre`, `valor` y `ok` (1/0), en este orden: `nulos_cuenta_pct` (% de `cuenta_id` nulos, 1 decimal, ok si < 1), `nulos_monto_pct` (ídem para monto) y `duplicados_tx` (filas − `tx_id` distintos, ok si = 0).
```sql setup
CREATE TABLE tx_obs (tx_id INTEGER, cuenta_id INTEGER, monto REAL, cargado_en TEXT);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 200)
INSERT INTO tx_obs SELECT i, CASE WHEN i % 8 = 0 THEN NULL ELSE 100 + i % 40 END, CASE WHEN i % 50 = 0 THEN NULL ELSE 10 + i END, '2024-06-10 03:00' FROM n;
INSERT INTO tx_obs SELECT * FROM tx_obs WHERE tx_id IN (5, 6, 7);
```
```sql solucion
SELECT 'nulos_cuenta_pct' AS check_nombre, ROUND(100.0 * SUM(cuenta_id IS NULL) / COUNT(*), 1) AS valor,
       CASE WHEN 100.0 * SUM(cuenta_id IS NULL) / COUNT(*) < 1 THEN 1 ELSE 0 END AS ok FROM tx_obs
UNION ALL
SELECT 'nulos_monto_pct', ROUND(100.0 * SUM(monto IS NULL) / COUNT(*), 1), CASE WHEN 100.0 * SUM(monto IS NULL) / COUNT(*) < 1 THEN 1 ELSE 0 END FROM tx_obs
UNION ALL
SELECT 'duplicados_tx', COUNT(*) - COUNT(DISTINCT tx_id), CASE WHEN COUNT(*) = COUNT(DISTINCT tx_id) THEN 1 ELSE 0 END FROM tx_obs;
```
```pista
Tres `SELECT` unidos con `UNION ALL`, uno por check, con la misma forma de columnas.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="Cumplimiento del SLO de frescura"
`ejecuciones_obs(fecha, fin_carga)` tiene la hora en que terminó la carga diaria. El SLO dice: datos listos antes de las `06:00`. Calcula `dias`, `en_hora` y `cumplimiento_pct` (1 decimal) de junio.
```sql setup
CREATE TABLE ejecuciones_obs (fecha TEXT, fin_carga TEXT);
WITH RECURSIVE d(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM d WHERE n < 30)
INSERT INTO ejecuciones_obs SELECT printf('2024-06-%02d', n), printf('2024-06-%02d %02d:%02d', n, CASE WHEN n IN (7, 8, 21) THEN 7 ELSE 4 END, (n * 7) % 60) FROM d;
```
```sql solucion
SELECT COUNT(*) AS dias,
       SUM(CASE WHEN time(fin_carga) < '06:00:00' THEN 1 ELSE 0 END) AS en_hora,
       ROUND(100.0 * SUM(CASE WHEN time(fin_carga) < '06:00:00' THEN 1 ELSE 0 END) / COUNT(*), 1) AS cumplimiento_pct
FROM ejecuciones_obs
WHERE fecha BETWEEN '2024-06-01' AND '2024-06-30';
```
```explicacion
90 % contra un objetivo de 99 %: el SLO no se cumplió este mes. Los días 7 y 8 seguidos sugieren un incidente de dos días; el 21, uno aislado. El tablero muestra el cumplimiento y, sobre todo, cuánto "presupuesto de error" queda en el mes.
```
:::

:::ejercicio sql ordenado dificultad=Avanzado titulo="Regresión de costo"
`costos_obs(pipeline, fecha, usd)` tiene el costo diario. Compara el promedio de la última semana (desde el `2024-06-24`) con el de las tres semanas anteriores y devuelve los pipelines cuyo costo subió más de 50 %: `pipeline`, `antes`, `ahora` (2 decimales), ordenado por pipeline.
```sql setup
CREATE TABLE costos_obs (pipeline TEXT, fecha TEXT, usd REAL);
WITH RECURSIVE d(n) AS (SELECT 3 UNION ALL SELECT n + 1 FROM d WHERE n < 30)
INSERT INTO costos_obs
SELECT p, printf('2024-06-%02d', n),
       CASE WHEN p = 'transacciones' AND n >= 24 THEN 9.1 WHEN p = 'transacciones' THEN 3.0 WHEN p = 'prestamos' THEN 1.2 + (n % 3) * 0.1 ELSE 0.8 END
FROM d, (SELECT 'transacciones' AS p UNION ALL SELECT 'prestamos' UNION ALL SELECT 'clientes');
```
```sql solucion
WITH c AS (
  SELECT pipeline, AVG(CASE WHEN fecha < '2024-06-24' THEN usd END) AS antes, AVG(CASE WHEN fecha >= '2024-06-24' THEN usd END) AS ahora
  FROM costos_obs GROUP BY pipeline
)
SELECT pipeline, ROUND(antes, 2) AS antes, ROUND(ahora, 2) AS ahora FROM c WHERE ahora > 1.5 * antes ORDER BY pipeline;
```
:::

:::ejercicio quiz dificultad=Avanzado
¿Por qué todos los checks escriben resultados con la **misma forma** en `obs.checks`?

- [ ] Para ahorrar espacio
- [x] Para que el tablero, las alertas y los reportes funcionen igual para cualquier tabla nueva, sin código adicional
- [ ] Porque SQL lo exige
- [ ] Para que los checks corran más rápido
:::

:::ejercicio quiz dificultad=Intermedio
Una alerta de volumen suena todos los domingos y siempre es falsa. ¿Qué cambias?

- [ ] La desactivas
- [x] Comparas contra el mismo día de la semana de las últimas semanas en lugar de contra el día anterior
- [ ] Le subes la severidad
- [ ] Haces que suene solo de lunes a viernes
:::

:::ejercicio quiz dificultad=Avanzado
¿Qué hace que este proyecto destaque en una entrevista para un puesto semi senior o senior?

- [ ] La cantidad de gráficos del tablero
- [x] Mostrar un incidente real detectado por el sistema, con su línea de tiempo, causa raíz y acciones, y cómo el sistema redujo el tiempo de detección
- [ ] Usar la herramienta de observabilidad más cara
- [ ] Tener 100 checks
:::

## Para ir más lejos

- Linaje: usar el linaje de Unity Catalog para avisar a los dueños de las tablas que dependen de una tabla con un check fallido.
- Contratos de datos versionados que generen los checks automáticamente.
