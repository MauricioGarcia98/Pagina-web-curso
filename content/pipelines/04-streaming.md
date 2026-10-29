---
titulo: "Streaming 🎧: lógica, features de churn, rankings y orquestación"
nivel: Avanzado
duracion: 60
resumen: El plan más barato para un hogar, la tasa de churn mensual en Python, features de comportamiento por usuario en PySpark, el género más escuchado por país en dbt y un DAG semanal con TaskGroups.
---

**Ritmo**, la app de música del caso 🎧, quiere dos cosas: **vender mejor** (recomendar el plan correcto a cada hogar) y **perder menos suscriptores** (detectar a tiempo a quien está por irse). Esta lección arma las piezas de ese proyecto con cada herramienta.

| Pieza | Herramienta | Qué produce |
|---|---|---|
| Recomendador de plan | Python | Una función que el equipo web llama en el checkout |
| Tasa de churn | Python | La fórmula oficial, con tests, que usan todos los reportes |
| Features de comportamiento | PySpark | Una fila por usuario con su actividad: la entrada del modelo de churn |
| Ranking de géneros por país | dbt | Tabla para el equipo de contenidos |
| Orquestación semanal | Airflow | El DAG que recalcula todo cada lunes |

## 1. Python: el plan más barato para cada hogar

Los planes cubren distintas cantidades de personas: `individual` (1 persona, 5,99), `duo` (2 personas, 7,99) y `familiar` (hasta 6 personas, 9,99). Un hogar de 7 personas puede combinar planes (por ejemplo, un familiar + un individual). Queremos el **costo mínimo** para cubrir a todos.

Este problema parece simple pero tiene una trampa: elegir "siempre el plan con menor precio por persona" (el familiar) **no** siempre da el mínimo. Para 7 personas, familiar + individual = 15,98; pero para 8, ¿familiar + duo (17,98) o dos familiares (19,98)? Hay que probar combinaciones. La técnica se llama **programación dinámica**: calcular el mínimo para 1 persona, después para 2, para 3…, reutilizando los resultados anteriores.

:::ejercicio python titulo="Costo mínimo para cubrir un hogar"
Escribe `costo_minimo(personas, planes)` donde `planes` es un diccionario `{nombre: (precio, capacidad)}`. Devuelve el costo mínimo (redondeado a 2) para cubrir **al menos** `personas` personas combinando planes (se puede repetir un plan). Para 0 personas, el costo es 0.
```python inicial
PLANES = {"individual": (5.99, 1), "duo": (7.99, 2), "familiar": (9.99, 6)}

def costo_minimo(personas, planes):
    pass

for n in [1, 2, 3, 6, 7, 8]:
    print(n, costo_minimo(n, PLANES))
```
```python solucion
PLANES = {"individual": (5.99, 1), "duo": (7.99, 2), "familiar": (9.99, 6)}

def costo_minimo(personas, planes):
    # mejor[k] = costo mínimo para cubrir al menos k personas
    mejor = [0.0] + [float("inf")] * personas
    for k in range(1, personas + 1):
        for precio, capacidad in planes.values():
            anterior = max(0, k - capacidad)
            mejor[k] = min(mejor[k], mejor[anterior] + precio)
    return round(mejor[personas], 2)

for n in [1, 2, 3, 6, 7, 8]:
    print(n, costo_minimo(n, PLANES))
```
```python test
assert costo_minimo(0, PLANES) == 0, "Sin personas no se paga nada"
assert costo_minimo(1, PLANES) == 5.99
assert costo_minimo(2, PLANES) == 7.99, "Para 2 conviene el duo"
assert costo_minimo(3, PLANES) == 9.99, "Para 3 ya conviene el familiar (cubre 'al menos' 3)"
assert costo_minimo(7, PLANES) == 15.98, "7 personas: familiar + individual"
assert costo_minimo(8, PLANES) == 17.98, "8 personas: familiar + duo"
assert costo_minimo(13, PLANES) == 25.97, "13 personas: dos familiares + individual"
assert costo_minimo(3, {"a": (3.0, 1), "b": (7.0, 3)}) == 7.0
```
```pista
Crea una lista `mejor` donde `mejor[k]` es el mínimo para cubrir `k` personas. Para cada `k`, prueba cada plan: su precio más `mejor[max(0, k - capacidad)]`. El "max(0, …)" permite que un plan cubra más personas de las necesarias.
```
:::

## 2. Python: la tasa de churn oficial

"Churn" parece una palabra simple, pero cada área lo calculaba distinto y los números no coincidían. El equipo de datos define la fórmula **oficial** y la programa con tests:

- **Activos al inicio del mes M**: suscripciones pagas con `inicio` anterior al primer día del mes y sin `fin`, o con `fin` el primer día del mes o después.
- **Bajas en M**: de esos activos, los que tienen `fin` dentro del mes.
- **Churn de M** = bajas / activos al inicio (en %, redondeado a 2). Las altas del mes **no** entran en el denominador.

:::ejercicio python titulo="churn_mensual"
Escribe `churn_mensual(suscripciones, mes)` donde `suscripciones` es una lista de tuplas `(usuario_id, inicio, fin)` con fechas `"YYYY-MM-DD"` (`fin` puede ser `None`) y `mes` es `"YYYY-MM"`. Devuelve un diccionario `{"activos_inicio": …, "bajas": …, "churn_pct": …}` (`churn_pct` es `None` si no hay activos).
```python inicial
from datetime import date

def churn_mensual(suscripciones, mes):
    pass

subs = [
    (1, "2024-01-10", None),
    (2, "2024-02-01", "2024-03-15"),
    (3, "2024-02-20", "2024-03-01"),
    (4, "2024-03-05", "2024-03-20"),
    (5, "2023-12-01", "2024-02-28"),
]
print(churn_mensual(subs, "2024-03"))
```
```python solucion
from datetime import date

def churn_mensual(suscripciones, mes):
    anio, m = map(int, mes.split("-"))
    inicio_mes = date(anio, m, 1)
    inicio_siguiente = date(anio + (m == 12), m % 12 + 1, 1)
    activos = bajas = 0
    for _, ini, fin in suscripciones:
        ini = date.fromisoformat(ini)
        fin = date.fromisoformat(fin) if fin else None
        if ini < inicio_mes and (fin is None or fin >= inicio_mes):
            activos += 1
            if fin is not None and fin < inicio_siguiente:
                bajas += 1
    pct = round(100 * bajas / activos, 2) if activos else None
    return {"activos_inicio": activos, "bajas": bajas, "churn_pct": pct}

subs = [
    (1, "2024-01-10", None),
    (2, "2024-02-01", "2024-03-15"),
    (3, "2024-02-20", "2024-03-01"),
    (4, "2024-03-05", "2024-03-20"),
    (5, "2023-12-01", "2024-02-28"),
]
print(churn_mensual(subs, "2024-03"))
```
```python test
r = churn_mensual(subs, "2024-03")
assert r == {"activos_inicio": 3, "bajas": 2, "churn_pct": 66.67}, f"Obtuve {r}. Activos al 1/3: usuarios 1, 2 y 3 (el 4 empezó en marzo, el 5 terminó en febrero). Bajas: 2 y 3."
assert churn_mensual(subs, "2024-12")["bajas"] == 0
assert churn_mensual([], "2024-03") == {"activos_inicio": 0, "bajas": 0, "churn_pct": None}
assert churn_mensual([(9, "2024-11-15", "2024-12-31")], "2024-12") == {"activos_inicio": 1, "bajas": 1, "churn_pct": 100.0}, "El 31 de diciembre todavía es del mes (cuidado con el cambio de año)"
```
```pista
Calcula el primer día del mes y el primer día del mes siguiente (¡ojo con diciembre!). Un activo al inicio empezó **antes** del día 1 y terminó el día 1 o después (o no terminó). Es baja si además terminó antes del primer día del mes siguiente.
```
:::

## 3. PySpark: features de comportamiento para el modelo de churn

El equipo de ciencia de datos entrena un modelo que predice quién se va a dar de baja. Necesita una tabla con **una fila por usuario** y variables (*features*) que describan su comportamiento. Construir esa tabla es trabajo de data engineering: tiene que ser correcta, reproducible y correr todas las semanas sobre millones de reproducciones.

:::ejercicio pyspark titulo="features_usuario"
A partir de `streaming_reproducciones`, construye por `usuario_id`: `reproducciones` (cantidad), `dias_activos` (fechas distintas con alguna reproducción), `pct_skips` (porcentaje de reproducciones con menos de 30 segundos escuchados, redondeado a 2), `ultima_fecha` (fecha de la última reproducción, tipo fecha) y `dias_inactivo` (días entre `ultima_fecha` y `2024-12-31`). Guarda en `resultado`.
```python solucion
from pyspark.sql import functions as F

r = (spark.table("streaming_reproducciones")
       .withColumn("fecha", F.to_date("fecha_hora"))
       .withColumn("skip", (F.col("segundos_escuchados") < 30).cast("int")))

resultado = (r.groupBy("usuario_id")
               .agg(F.count("*").alias("reproducciones"),
                    F.countDistinct("fecha").alias("dias_activos"),
                    F.round(F.avg("skip") * 100, 2).alias("pct_skips"),
                    F.max("fecha").alias("ultima_fecha"))
               .withColumn("dias_inactivo", F.datediff(F.to_date(F.lit("2024-12-31")), F.col("ultima_fecha"))))
```
```pista
Crea antes del `groupBy` una columna `fecha` (con `F.to_date`) y una columna `skip` de unos y ceros. El promedio de `skip` × 100 es el porcentaje.
```
:::

:::experto Features y "fuga de información"
Si una feature usa datos **posteriores** al momento de la predicción (por ejemplo, reproducciones de enero para predecir quién se va en diciembre), el modelo parece genial en las pruebas y falla en producción. Por eso estas tablas siempre se calculan "al corte" de una fecha (`2024-12-31` aquí), con todos los eventos **anteriores** a ese corte. Es el mismo principio del *as-of join* de SQL.
:::

## 4. dbt: el género más escuchado de cada país

El equipo de contenidos decide qué artistas promocionar en cada país. Quiere, por país, el género con más minutos escuchados. Es un **top-1 por grupo**: agregación + `row_number`, ideal para un modelo de dbt.

:::ejercicio dbt titulo="genero_top_por_pais"
Escribe el modelo `genero_top_por_pais`: para cada `pais` (de `ref('streaming_usuarios')`), el `genero` (de `ref('streaming_contenidos')`) con más `minutos` escuchados (suma de `segundos_escuchados` de `ref('streaming_reproducciones')` / 60, redondeada a 1). Desempata por género alfabéticamente. Columnas: `pais`, `genero`, `minutos`.
```sql inicial
with reproducciones as (
    select * from {{ ref('streaming_reproducciones') }}
),

usuarios as (
    select * from {{ ref('streaming_usuarios') }}
),

contenidos as (
    select * from {{ ref('streaming_contenidos') }}
)

select ...
```
```sql solucion
with reproducciones as (
    select * from {{ ref('streaming_reproducciones') }}
),

usuarios as (
    select * from {{ ref('streaming_usuarios') }}
),

contenidos as (
    select * from {{ ref('streaming_contenidos') }}
),

minutos as (
    select u.pais, c.genero, sum(r.segundos_escuchados) / 60.0 as minutos
    from reproducciones r
    join usuarios u on u.usuario_id = r.usuario_id
    join contenidos c on c.contenido_id = r.contenido_id
    group by u.pais, c.genero
),

ranking as (
    select *, row_number() over (partition by pais order by minutos desc, genero) as rn
    from minutos
)

select pais, genero, round(minutos, 1) as minutos
from ranking
where rn = 1
```
:::

## 5. Airflow: el recálculo semanal

Cada lunes se recalculan las features y el ranking. Las tareas se agrupan con **TaskGroups** para que el DAG se lea por etapas en la interfaz.

:::ejercicio airflow titulo="DAG streaming_semanal"
Crea el DAG `streaming_semanal` con `schedule="0 6 * * 1"` (lunes 06:00), `start_date` 2024-01-01 y `catchup=False`, con:

- `inicio`: `EmptyOperator`.
- Un `TaskGroup` llamado `features` con dos `EmptyOperator`: `reproducciones` y `suscripciones` (en paralelo).
- Un `TaskGroup` llamado `marts` con un `BashOperator` `genero_top` (`bash_command="dbt build -s genero_top_por_pais"`).
- `fin`: `EmptyOperator`.

Orden: `inicio >> features >> marts >> fin`.
```python inicial
from datetime import datetime
from airflow import DAG
from airflow.operators.empty import EmptyOperator
from airflow.operators.bash import BashOperator
from airflow.utils.task_group import TaskGroup
```
```python solucion
from datetime import datetime
from airflow import DAG
from airflow.operators.empty import EmptyOperator
from airflow.operators.bash import BashOperator
from airflow.utils.task_group import TaskGroup

with DAG("streaming_semanal", schedule="0 6 * * 1", start_date=datetime(2024, 1, 1), catchup=False) as dag:
    inicio = EmptyOperator(task_id="inicio")
    with TaskGroup("features") as features:
        EmptyOperator(task_id="reproducciones")
        EmptyOperator(task_id="suscripciones")
    with TaskGroup("marts") as marts:
        BashOperator(task_id="genero_top", bash_command="dbt build -s genero_top_por_pais")
    fin = EmptyOperator(task_id="fin")
    inicio >> features >> marts >> fin
```
```python test
d = dags.get("streaming_semanal")
assert d is not None, "No encontré el DAG 'streaming_semanal'"
assert d.schedule in ("0 6 * * 1",) or getattr(d, "schedule_interval", None) == "0 6 * * 1", "El schedule debe ser '0 6 * * 1' (lunes 06:00)"
ids = set(d.task_ids)
for n in ["inicio", "features.reproducciones", "features.suscripciones", "marts.genero_top", "fin"]:
    assert n in ids, f"Falta la tarea {n} (recuerda que las tareas de un TaskGroup llevan el prefijo del grupo)"
assert d.get_task("inicio").downstream_task_ids == {"features.reproducciones", "features.suscripciones"}, "inicio debe ir antes de las dos tareas de features"
assert d.get_task("marts.genero_top").upstream_task_ids == {"features.reproducciones", "features.suscripciones"}, "marts va después de todo features"
assert "genero_top_por_pais" in d.get_task("marts.genero_top").bash_command
run = d.test()
assert all(s == "success" for s in run.states.values()), f"Estados: {run.states}"
```
```pista
El cron `0 6 * * 1` se lee: minuto 0, hora 6, cualquier día del mes, cualquier mes, día de la semana 1 (lunes). Unir grupos con `>>` conecta **todas** las tareas del primero con **todas** las del segundo.
```
:::
