---
titulo: "Tienda 🛒: segmentación RFM, cohortes de retención y el ETL completo"
nivel: Experto
duracion: 65
resumen: Puntajes RFM y segmentos de clientes en Python, la matriz de retención por cohorte en PySpark, la tabla de clientes con tests en dbt y el ETL diario completo con TaskFlow y una verificación de calidad.
---

Cerramos el módulo con **Tienda Andina**, la tienda que conoces desde el primer día. Marketing quiere dejar de mandar la misma promoción a todos: necesita **segmentos** de clientes y saber si los clientes **vuelven**. Esta lección arma todo, de la lógica en Python al pipeline diario.

## 1. Python: puntajes RFM y segmentos

**RFM** describe a cada cliente con tres números:

| Letra | Significa | Cómo se mide | Mejor es… |
|---|---|---|---|
| **R** (recencia) | Hace cuánto compró por última vez | días desde la última compra | **menos** días |
| **F** (frecuencia) | Cuántas veces compró | cantidad de pedidos | **más** |
| **M** (monto) | Cuánto gastó en total | suma de compras | **más** |

Cada dimensión se convierte en un **puntaje del 1 al 5** según umbrales, y la combinación define el segmento:

| Segmento | Regla (en este orden) |
|---|---|
| `campeon` | R ≥ 4 y F ≥ 4 |
| `leal` | F ≥ 4 |
| `en_riesgo` | R ≤ 2 y F ≥ 3 (compraba seguido, pero hace mucho que no vuelve) |
| `nuevo` | R ≥ 4 y F ≤ 1 |
| `dormido` | R ≤ 2 |
| `regular` | cualquier otro caso |

:::ejercicio python titulo="segmento_rfm"
Escribe `puntaje(valor, umbrales, mayor_es_mejor=True)`: recibe 4 umbrales crecientes y devuelve 1 a 5 (con `mayor_es_mejor`, valor ≤ umbral[0] → 1, ≤ umbral[1] → 2, …, mayor que umbral[3] → 5; si `mayor_es_mejor` es `False`, el puntaje se invierte: `6 - puntaje`). Escribe también `segmento_rfm(dias, pedidos, monto)` usando los umbrales `R_UMBRALES` (días, menos es mejor), `F_UMBRALES` y `M_UMBRALES`, y que devuelva `(r, f, m, segmento)`.
```python inicial
R_UMBRALES = [30, 90, 180, 365]
F_UMBRALES = [1, 3, 6, 10]
M_UMBRALES = [200, 800, 2000, 5000]

def puntaje(valor, umbrales, mayor_es_mejor=True):
    pass

def segmento_rfm(dias, pedidos, monto):
    pass

print(segmento_rfm(12, 15, 9000), segmento_rfm(400, 5, 1500))
```
```python solucion
R_UMBRALES = [30, 90, 180, 365]
F_UMBRALES = [1, 3, 6, 10]
M_UMBRALES = [200, 800, 2000, 5000]

def puntaje(valor, umbrales, mayor_es_mejor=True):
    p = 5
    for i, u in enumerate(umbrales):
        if valor <= u:
            p = i + 1
            break
    return p if mayor_es_mejor else 6 - p

def segmento_rfm(dias, pedidos, monto):
    r = puntaje(dias, R_UMBRALES, mayor_es_mejor=False)
    f = puntaje(pedidos, F_UMBRALES)
    m = puntaje(monto, M_UMBRALES)
    if r >= 4 and f >= 4:
        seg = "campeon"
    elif f >= 4:
        seg = "leal"
    elif r <= 2 and f >= 3:
        seg = "en_riesgo"
    elif r >= 4 and f <= 1:
        seg = "nuevo"
    elif r <= 2:
        seg = "dormido"
    else:
        seg = "regular"
    return r, f, m, seg

print(segmento_rfm(12, 15, 9000), segmento_rfm(400, 5, 1500))
```
```python test
assert puntaje(1, F_UMBRALES) == 1 and puntaje(2, F_UMBRALES) == 2 and puntaje(11, F_UMBRALES) == 5
assert puntaje(12, R_UMBRALES, False) == 5, "12 días (≤ 30) es la mejor recencia: 5"
assert puntaje(400, R_UMBRALES, False) == 1, "Más de 365 días: la peor recencia, 1"
assert segmento_rfm(12, 15, 9000) == (5, 5, 5, "campeon")
assert segmento_rfm(400, 5, 1500) == (1, 3, 3, "en_riesgo")
assert segmento_rfm(20, 1, 150) == (5, 1, 1, "nuevo")
assert segmento_rfm(200, 7, 3000)[3] == "leal", "F=4 aunque la recencia sea baja: leal (la regla se evalúa en orden)"
assert segmento_rfm(250, 2, 300)[3] == "dormido"
assert segmento_rfm(60, 3, 900)[3] == "regular"
```
```pista
`puntaje`: recorre los umbrales y devuelve la posición + 1 del primero que el valor no supera; si los supera todos, 5. Para la recencia, invierte con `6 - p`. Los segmentos se evalúan **en el orden** de la tabla, como un `CASE WHEN`.
```
:::

## 2. PySpark: la matriz de retención por cohorte

En el módulo de SQL viste las cohortes. Ahora, en PySpark y como **tabla larga** (una fila por cohorte y mes relativo), que es el formato que prefieren las herramientas de BI para dibujar la matriz.

:::ejercicio pyspark titulo="retencion_cohortes"
Con `pedidos` no cancelados: la `cohorte` de cada cliente es el mes de su primera compra (`yyyy-MM`). Para cada compra, `mes_n` es la cantidad de meses entre el mes de la cohorte y el mes de la compra (usa `F.months_between` sobre los primeros días de cada mes y conviértelo a entero). Devuelve, para las cohortes de **2024**, por `cohorte` y `mes_n`: `clientes` (distintos que compraron en ese mes relativo) y `retencion_pct` (clientes / clientes del mes 0 de esa cohorte × 100, redondeado a 2). Guarda en `resultado`.
```python solucion
from pyspark.sql import functions as F
from pyspark.sql.window import Window

p = (spark.table("pedidos")
       .filter(F.col("estado") != "cancelado")
       .withColumn("mes_compra", F.trunc("fecha_pedido", "month")))
primera = p.groupBy("cliente_id").agg(F.min("mes_compra").alias("mes_cohorte"))

act = (p.join(primera, "cliente_id")
         .withColumn("mes_n", F.months_between("mes_compra", "mes_cohorte").cast("int"))
         .withColumn("cohorte", F.date_format("mes_cohorte", "yyyy-MM"))
         .filter(F.col("cohorte") >= "2024-01"))

por_mes = act.groupBy("cohorte", "mes_n").agg(F.countDistinct("cliente_id").alias("clientes"))
w = Window.partitionBy("cohorte")
resultado = (por_mes
               .withColumn("base", F.max(F.when(F.col("mes_n") == 0, F.col("clientes"))).over(w))
               .withColumn("retencion_pct", F.round(F.col("clientes") * 100 / F.col("base"), 2))
               .drop("base"))
```
```pista
Truncar ambas fechas al primer día del mes (`F.trunc(..., "month")`) hace que `months_between` dé números enteros. Para el denominador, una ventana por cohorte con el `max` de los clientes **cuando** `mes_n == 0`.
```
:::

## 3. dbt: la tabla de clientes, con tests

El segmento RFM se calcula en SQL para todos los clientes y se publica como `dim_clientes_rfm`, la tabla que usa el CRM. Es el lugar donde más importan los **tests**: si un cliente apareciera dos veces, recibiría dos correos.

:::ejercicio dbt titulo="clientes_rfm"
Escribe el modelo `clientes_rfm` con `ref('stg_pedidos')` y `ref('stg_detalle_pedidos')` (que trae la columna `importe`): para cada `cliente_id` con pedidos **no cancelados**: `dias` (desde la última compra hasta el `'2024-12-31'`, entero), `pedidos` (distintos) y `monto` (suma de `importe`, redondeada a 2).
```sql inicial
with pedidos as (
    select * from {{ ref('stg_pedidos') }}
    where estado <> 'cancelado'
),

lineas as (
    select * from {{ ref('stg_detalle_pedidos') }}
)

select ...
```
```sql solucion
with pedidos as (
    select * from {{ ref('stg_pedidos') }}
    where estado <> 'cancelado'
),

lineas as (
    select * from {{ ref('stg_detalle_pedidos') }}
),

totales as (
    select pedido_id, sum(importe) as importe
    from lineas
    group by pedido_id
)

select
    p.cliente_id,
    cast(julianday('2024-12-31') - julianday(max(p.fecha_pedido)) as integer) as dias,
    count(distinct p.pedido_id) as pedidos,
    round(sum(t.importe), 2) as monto
from pedidos p
join totales t on t.pedido_id = p.pedido_id
group by p.cliente_id
```
```pista
Suma primero el importe **por pedido** y después une con los pedidos: si unieras directamente las líneas, `count(*)` contaría líneas y no pedidos (por eso además usamos `count(distinct pedido_id)`).
```
:::

Y su YAML con los tests que lo protegen:

```yaml norun
version: 2
models:
  - name: clientes_rfm
    description: "Una fila por cliente con compras: recencia, frecuencia y monto al 2024-12-31."
    columns:
      - name: cliente_id
        data_tests: [unique, not_null]
      - name: dias
        data_tests:
          - not_null
          - dbt_utils.accepted_range: {min_value: 0}
      - name: pedidos
        data_tests:
          - dbt_utils.accepted_range: {min_value: 1}
```

## 4. Airflow: el ETL diario completo

El DAG final une todo con la **TaskFlow API**: extraer, transformar, verificar la calidad, y solo si la verificación pasa, publicar. Los datos que viajan entre tareas son **metadatos** chicos (rutas, conteos), nunca las tablas.

:::ejercicio airflow titulo="DAG tienda_etl_diario"
Con la TaskFlow API, crea el DAG `tienda_etl_diario` (función decorada con el mismo nombre; `schedule="@daily"`, `start_date` 2024-01-01, `catchup=False`) con estas tareas:

1. `extraer`: devuelve el diccionario `{"ruta": "/lake/bronze/pedidos/2024-12-31.json", "filas": 1200}`.
2. `transformar(info)`: devuelve `{"filas_validas": info["filas"] - 15, "rechazadas": 15}`.
3. `verificar(resultado)`: lanza `ValueError` si las rechazadas superan el **2 %** de las filas (válidas + rechazadas); si no, devuelve `"ok"`.
4. `publicar(estado)`: devuelve `f"publicado ({estado})"`.

Encadénalas pasando los valores y crea el DAG llamando a la función.
```python inicial
from datetime import datetime
from airflow.decorators import dag, task
```
```python solucion
from datetime import datetime
from airflow.decorators import dag, task

@dag(schedule="@daily", start_date=datetime(2024, 1, 1), catchup=False)
def tienda_etl_diario():
    @task
    def extraer():
        return {"ruta": "/lake/bronze/pedidos/2024-12-31.json", "filas": 1200}

    @task
    def transformar(info):
        return {"filas_validas": info["filas"] - 15, "rechazadas": 15}

    @task
    def verificar(resultado):
        total = resultado["filas_validas"] + resultado["rechazadas"]
        if resultado["rechazadas"] > 0.02 * total:
            raise ValueError(f"Demasiadas filas rechazadas: {resultado['rechazadas']} de {total}")
        return "ok"

    @task
    def publicar(estado):
        return f"publicado ({estado})"

    publicar(verificar(transformar(extraer())))

tienda_etl_diario()
```
```python test
d = dags.get("tienda_etl_diario")
assert d is not None, "No encontré el DAG 'tienda_etl_diario' (¿llamaste a la función al final?)"
assert d.catchup is False
for a, b in [("extraer", "transformar"), ("transformar", "verificar"), ("verificar", "publicar")]:
    assert d.get_task(a).downstream_task_ids == {b}, f"{a} debe ir antes de {b}"
run = d.test()
assert run.xcoms.get(("transformar", "return_value")) == {"filas_validas": 1185, "rechazadas": 15}
assert run.xcoms.get(("publicar", "return_value")) == "publicado (ok)", "15 de 1200 es 1.25 %: pasa la verificación y se publica"
```
```pista
Con TaskFlow, lo que devuelve cada función decorada con `@task` se pasa como argumento a la siguiente, y las dependencias se infieren solas: `publicar(verificar(transformar(extraer())))`.
```
:::

## Lo que construiste en este módulo

| Caso | Python | PySpark | dbt | Airflow |
|---|---|---|---|---|
| 🏦 Banco | Cuota francesa, mora, decisión de crédito, conciliación | Cartera en mora, perfil de gasto | Mora por segmento | Cierre diario con rama de calidad |
| 🎧 Streaming | Plan óptimo, churn oficial | Features de churn | Género top por país | DAG semanal con TaskGroups |
| 🚕 Movilidad | Tarifa dinámica, cotizador | Oferta y demanda por hora | Conductores destacados | DAG horario con sensor y reintentos |
| 🏥 Clínica | Turnos libres, riesgo de ausencia | Historial de pacientes | Facturación por cobertura | Recordatorios con ShortCircuit |
| ☁️ SaaS | Prorrateo, movimientos de MRR | Movimientos de MRR a escala | Facturación incremental | Cierre mensual con verificación |
| ✈️ Aerolínea | Sobreventa, propagación de demoras | Peores rutas por mes | Ocupación por ruta | Una tarea por aeropuerto |
| 📦 Logística | Costo FIFO, días hábiles | Stock diario y quiebres | OTD por transportista | DAG que dispara otro DAG |
| 🛒 Tienda | Segmentos RFM | Retención por cohorte | Clientes RFM con tests | ETL completo con TaskFlow |

Si resolviste todo, ya practicaste el trabajo real de un data engineer de punta a punta: **lógica de negocio probada, transformaciones a escala, modelos versionados y orquestación confiable**.
