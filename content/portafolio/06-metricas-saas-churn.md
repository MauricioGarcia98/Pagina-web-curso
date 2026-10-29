---
titulo: "Proyecto 5: Métricas SaaS y riesgo de baja con dbt"
nivel: Avanzado
duracion: 110
resumen: Una empresa de software por suscripción con altas, mejoras de plan, reducciones y bajas, uso diario del producto, facturas y tickets. Construyes con dbt las métricas que mira un directorio (MRR, nuevo, expansión, contracción, churn, NRR), un historial SCD2 de planes, y una lista semanal de cuentas en riesgo según su uso. Valor - que Customer Success llame a las cuentas en riesgo antes de que se vayan.
objetivos: Descomponer el MRR mensual en nuevo, expansión, contracción y churn | Calcular la retención neta de ingresos (NRR) de una cohorte | Modelar el historial de planes como SCD tipo 2 con dbt snapshot | Construir una señal de riesgo de baja a partir del uso | Escribir modelos incrementales con ventana de relectura
prerrequisitos: portafolio-como-armar-tu-portafolio | analisis-unit-economics
autoevaluacion: ¿Sabes calcular el MRR de un mes a partir de suscripciones con inicio y fin? | ¿Sabes qué es expansión y qué es contracción? | ¿Sabes calcular NRR? | ¿Sabes qué guarda un snapshot de dbt? | ¿Sabes qué señal de uso anticipa una baja?
---

:::escenario
El CEO de una empresa SaaS presenta al directorio un MRR que sale de una planilla con fórmulas que nadie entiende. El directorio pregunta: "¿crecimos por clientes nuevos o porque los actuales pagan más? ¿Cuánto perdemos por bajas?". Y la líder de Customer Success quiere saber **a quién llamar esta semana** para evitar una baja.
:::

## Métricas y valor

| Métrica | Definición |
|---|---|
| **MRR** | Ingreso recurrente mensual de las suscripciones activas |
| **Nuevo** | MRR de empresas que no estaban activas el mes anterior |
| **Expansión / contracción** | Aumento o baja del MRR de empresas activas en los dos meses |
| **Churn** | MRR de empresas activas el mes anterior que ya no lo están |
| **NRR** | MRR de hoy de una cohorte ÷ MRR inicial de la cohorte (incluye expansión, contracción y churn) |

Valor: un tablero mensual confiable y una lista semanal de cuentas en riesgo, con el uso que justifica cada una.

## Los datos

[🏭 Generar los datos del proyecto](#/generador?esc=saas&n=400&semilla=33&desde=2023-01-01&hasta=2024-12-31&duplicados=1&nulos=3&formatos=3&tardios=3) · Escenario **SaaS**: `empresas`, `suscripciones` (un período por plan, con `motivo_fin`: renovación, mejora, reducción o baja), `uso_diario`, `facturas` y `tickets`. Las empresas que se van usan cada vez menos el producto en los 45 días previos.

## Arquitectura

```diagrama
titulo: Métricas SaaS con dbt
nodo s: Suscripciones, uso,\nfacturas, tickets | icono=csv | col=0 | fila=0
nodo st: staging | icono=dbt | col=1 | fila=0 | color=gris
nodo sn: snapshot de planes | icono=reloj | col=1 | fila=1 | sub=SCD tipo 2
nodo mrr: mrr_mensual | icono=dbt | col=2 | fila=0 | color=amarillo | sub=empresa × mes
nodo mov: movimientos_mrr | icono=grafico | col=3 | fila=0 | sub=nuevo, expansión,\ncontracción, churn
nodo riesgo: riesgo_semanal | icono=alerta | col=2 | fila=1 | color=rojo | sub=uso 30 d vs 90 d
nodo cs: Customer Success | icono=usuario | col=3 | fila=1
flecha s -> st
flecha st -> sn
flecha st -> mrr
flecha mrr -> mov
flecha st -> riesgo
flecha riesgo -> cs
```

## El modelo central: MRR por empresa y mes

El truco es **expandir** cada suscripción a los meses en que estuvo activa y después agregar:

```sql norun
-- models/marts/mrr_mensual.sql (dbt + DuckDB)
with meses as (
    select unnest(generate_series(date '2023-01-01', date '2024-12-01', interval 1 month))::date as mes
)
select m.mes, s.empresa_id, sum(s.mrr) as mrr
from {{ ref('stg_suscripciones') }} s
join meses m on m.mes >= date_trunc('month', s.inicio)
            and (s.fin is null or m.mes < date_trunc('month', s.fin))
group by all
```

Con `mrr_mensual`, los movimientos salen de comparar cada empresa con el mes anterior (`lag`): si antes era 0 y ahora no → nuevo; si sube → expansión; si baja sin llegar a 0 → contracción; si llega a 0 → churn.

## El historial de planes: dbt snapshot

```sql norun
{% snapshot planes_snapshot %}
{{ config(target_schema='snapshots', unique_key='empresa_id', strategy='check', check_cols=['plan', 'mrr']) }}
select empresa_id, plan, mrr from {{ ref('stg_suscripcion_actual') }}
{% endsnapshot %}
```

Cada vez que corre, si una empresa cambió de plan, cierra la fila anterior (`dbt_valid_to`) y abre una nueva: el **SCD tipo 2** que permite responder "¿en qué plan estaba en marzo?".

## Riesgo de baja: una señal simple y explicable

Uso de los últimos 30 días contra el promedio de los 90 anteriores. Una caída fuerte, sumada a tickets abiertos con satisfacción baja, pone a la cuenta en la lista semanal. Antes de cualquier modelo de machine learning, mide cuántas de las bajas reales habría anticipado esta regla: ese número va al README.

## Entregables

- [ ] `mrr_mensual` y `movimientos_mrr` con tests (el MRR de un mes = MRR anterior + nuevo + expansión − contracción − churn).
- [ ] NRR por cohorte de alta.
- [ ] Snapshot de planes y una consulta "plan vigente en una fecha".
- [ ] Lista de riesgo semanal y cuántas bajas reales anticipa.

## Práctica

:::ejercicio cli dificultad=Básico titulo="Los datos SaaS"
Genera el escenario `saas` con 100 empresas y semilla 33.
```respuesta
todos: generar-datos saas || --filas 100 || --semilla 33
```
```solucion
generar-datos saas --filas 100 --semilla 33
```
:::

:::ejercicio sql ordenado dificultad=Avanzado titulo="MRR por mes"
`subs(empresa_id, mrr, inicio, fin)` tiene períodos de suscripción (`fin` NULL si sigue activa; el mes de `fin` ya no cuenta). `meses(mes)` tiene el primer día de cada mes. Devuelve `mes` y `mrr` total de cada mes, ordenado.
```sql setup
CREATE TABLE subs (empresa_id INTEGER, mrr REAL, inicio TEXT, fin TEXT);
INSERT INTO subs VALUES (1, 100, '2024-01-10', '2024-03-05'), (1, 300, '2024-03-05', NULL), (2, 200, '2024-02-01', '2024-04-20'), (3, 50, '2024-03-15', NULL);
CREATE TABLE meses (mes TEXT);
INSERT INTO meses VALUES ('2024-01-01'), ('2024-02-01'), ('2024-03-01'), ('2024-04-01'), ('2024-05-01');
```
```sql solucion
SELECT m.mes, COALESCE(SUM(s.mrr), 0) AS mrr
FROM meses m
LEFT JOIN subs s ON m.mes >= date(s.inicio, 'start of month')
               AND (s.fin IS NULL OR m.mes < date(s.fin, 'start of month'))
GROUP BY m.mes
ORDER BY m.mes;
```
```pista
Une cada mes con las suscripciones activas: `m.mes >= date(inicio, 'start of month')` y `m.mes < date(fin, 'start of month')` (o `fin` nulo).
```
:::

:::ejercicio sql ordenado dificultad=Experto titulo="Movimientos del MRR"
`mrr_emp(empresa_id, mes, mrr)` tiene el MRR de cada empresa activa por mes (si no aparece, no estaba activa). Para el mes `2024-04-01`, clasifica cada empresa que estuvo activa en marzo **o** en abril como `nuevo`, `expansion`, `contraccion`, `churn` o `sin_cambio`, y devuelve `movimiento` y `monto` (diferencia abril − marzo), ordenado por movimiento.
```sql setup
CREATE TABLE mrr_emp (empresa_id INTEGER, mes TEXT, mrr REAL);
INSERT INTO mrr_emp VALUES (1, '2024-03-01', 100), (1, '2024-04-01', 300), (2, '2024-03-01', 200), (3, '2024-03-01', 50), (3, '2024-04-01', 50),
(4, '2024-04-01', 80), (5, '2024-03-01', 400), (5, '2024-04-01', 250);
```
```sql solucion
WITH m AS (SELECT empresa_id, SUM(CASE WHEN mes = '2024-03-01' THEN mrr END) AS ant, SUM(CASE WHEN mes = '2024-04-01' THEN mrr END) AS act FROM mrr_emp GROUP BY empresa_id),
c AS (
  SELECT CASE WHEN ant IS NULL THEN 'nuevo' WHEN act IS NULL THEN 'churn' WHEN act > ant THEN 'expansion' WHEN act < ant THEN 'contraccion' ELSE 'sin_cambio' END AS movimiento,
         COALESCE(act, 0) - COALESCE(ant, 0) AS dif
  FROM m
)
SELECT movimiento, SUM(dif) AS monto FROM c GROUP BY movimiento ORDER BY movimiento;
```
```pista
Pivotea marzo y abril por empresa con `SUM(CASE WHEN mes = … THEN mrr END)`; después clasifica con un `CASE` y suma las diferencias.
```
```explicacion
Nuevo +80, expansión +200, contracción −150, churn −200, sin cambio 0. Sumados dan la variación del MRR total (750 → 680 = −70). Ese cuadre es el mejor test de este modelo.
```
:::

:::ejercicio sql ordenado dificultad=Avanzado titulo="Cuentas en riesgo"
`uso(empresa_id, fecha, usuarios_activos)` tiene el uso diario. Con fecha de corte `2024-06-30`, calcula por empresa el promedio de los últimos 30 días (`reciente`, desde el `2024-06-01`) y el de los 90 días anteriores (`previo`, del `2024-03-03` al `2024-05-31`), y devuelve las que tienen `reciente < 0.5 * previo`: `empresa_id`, `reciente`, `previo` (1 decimal).
```sql setup
CREATE TABLE uso (empresa_id INTEGER, fecha TEXT, usuarios_activos INTEGER);
WITH RECURSIVE d(n) AS (SELECT 0 UNION ALL SELECT n + 1 FROM d WHERE n < 119)
INSERT INTO uso
SELECT e, date('2024-03-03', '+' || n || ' days'),
       CASE WHEN e = 2 AND n >= 90 THEN 3 WHEN e = 2 THEN 20 WHEN e = 3 AND n >= 90 THEN 14 WHEN e = 3 THEN 16 ELSE 10 + n % 3 END
FROM d, (SELECT 1 AS e UNION ALL SELECT 2 UNION ALL SELECT 3);
```
```sql solucion
WITH r AS (
  SELECT empresa_id,
         AVG(CASE WHEN fecha >= '2024-06-01' THEN usuarios_activos END) AS reciente,
         AVG(CASE WHEN fecha BETWEEN '2024-03-03' AND '2024-05-31' THEN usuarios_activos END) AS previo
  FROM uso GROUP BY empresa_id
)
SELECT empresa_id, ROUND(reciente, 1) AS reciente, ROUND(previo, 1) AS previo
FROM r WHERE reciente < 0.5 * previo
ORDER BY empresa_id;
```
:::

:::ejercicio quiz dificultad=Intermedio
Una empresa pasa del plan básico (49) al profesional (199) en marzo. ¿Cómo aparece en los movimientos de marzo?

- [ ] Como un cliente nuevo de 199
- [x] Como expansión de 150
- [ ] Como churn de 49 y nuevo de 199
- [ ] No aparece
:::

:::ejercicio quiz dificultad=Avanzado
¿Qué guarda un **snapshot** de dbt con `strategy='check'`?

- [ ] Una copia completa de la tabla cada día
- [x] Una fila por cada versión de cada clave, con `dbt_valid_from` y `dbt_valid_to`, cuando cambian las columnas vigiladas (SCD tipo 2)
- [ ] Solo la última versión
- [ ] Los logs de dbt
:::

:::ejercicio quiz dificultad=Intermedio
NRR de una cohorte = 112 %. ¿Qué significa?

- [ ] Que el 112 % de los clientes sigue activo
- [x] Que el MRR actual de esa cohorte es 12 % mayor que al inicio: la expansión compensa con creces las bajas y reducciones
- [ ] Que hay un error, porque no puede pasar de 100 %
- [ ] Que se sumaron clientes nuevos a la cohorte
:::

## Para ir más lejos

- Modelo de churn con MLflow usando las features de uso, tickets y facturas vencidas; comparado contra la regla.
- Exposición de las métricas como **métricas semánticas** (dbt Semantic Layer o métricas de Unity Catalog) para que todos usen la misma definición.
