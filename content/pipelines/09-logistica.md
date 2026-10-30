---
titulo: "Logística 📦: costo FIFO, días hábiles, stock diario y alertas de quiebre"
nivel: Experto
duracion: 65
resumen: El costo de la mercadería con el método FIFO y la fecha de entrega en días hábiles en Python, el stock diario y los quiebres con ventanas en PySpark, la puntualidad mensual por transportista en dbt y un DAG que dispara otro DAG.
---

En **Mercurio Logística** (caso 📦) el stock no se guarda: se **calcula** sumando movimientos. Y cada envío tiene una **fecha prometida** que hay que cumplir. Esta lección programa la lógica contable y de promesas, y arma el pipeline diario de inventario.

## 1. Python: el costo de lo vendido con FIFO

La mercadería de un mismo producto se compra en distintos momentos y a distintos precios. Cuando se vende, ¿qué costo se le asigna? El método **FIFO** (*first in, first out*: lo primero que entra es lo primero que sale) supone que se venden primero las unidades más viejas. Es el método más usado en contabilidad de inventarios.

| Lote (en orden de llegada) | Unidades | Costo unitario |
|---|---|---|
| Enero | 100 | 10,00 |
| Febrero | 50 | 12,00 |
| Marzo | 80 | 11,00 |

Si se venden 130 unidades: 100 salen del lote de enero (1.000) y 30 del de febrero (360). Costo de lo vendido: **1.360**. Quedan 20 unidades del lote de febrero y 80 del de marzo.

:::analogia La góndola de la leche
En un supermercado, el repositor pone la leche nueva **atrás** y la vieja adelante, para que se venda primero la que vence antes. FIFO hace lo mismo con los costos: las primeras unidades en entrar son las primeras en "salir" con su costo.
:::

:::ejercicio python titulo="costo_fifo"
Escribe `costo_fifo(lotes, vendidas)` donde `lotes` es una lista de tuplas `(unidades, costo_unitario)` en orden de llegada. Devuelve `(costo_vendido, lotes_restantes)`: el costo total de las unidades vendidas (redondeado a 2) y la lista de lotes que quedan (sin lotes vacíos). Si se quieren vender más unidades que las disponibles, lanza `ValueError`. No modifiques la lista original.
```python inicial
def costo_fifo(lotes, vendidas):
    pass

lotes = [(100, 10.0), (50, 12.0), (80, 11.0)]
print(costo_fifo(lotes, 130))
```
```python solucion
def costo_fifo(lotes, vendidas):
    if vendidas > sum(u for u, _ in lotes):
        raise ValueError("No hay stock suficiente")
    restantes = []
    costo = 0.0
    pendientes = vendidas
    for unidades, precio in lotes:
        usar = min(unidades, pendientes)
        costo += usar * precio
        pendientes -= usar
        if unidades - usar > 0:
            restantes.append((unidades - usar, precio))
    return round(costo, 2), restantes

lotes = [(100, 10.0), (50, 12.0), (80, 11.0)]
print(costo_fifo(lotes, 130))
```
```python test
assert costo_fifo(lotes, 130) == (1360.0, [(20, 12.0), (80, 11.0)]), f"{costo_fifo(lotes, 130)}"
assert lotes == [(100, 10.0), (50, 12.0), (80, 11.0)], "No debes modificar la lista original"
assert costo_fifo(lotes, 0) == (0.0, lotes)
assert costo_fifo(lotes, 230) == (2480.0, []), "Vender todo vacía los lotes"
try:
    costo_fifo(lotes, 231)
    assert False, "Debe lanzar ValueError si no alcanza el stock"
except ValueError:
    pass
```
```pista
Recorre los lotes en orden y toma de cada uno `min(unidades del lote, unidades que faltan vender)`. Construye una lista **nueva** con lo que sobra de cada lote.
```
:::

## 2. Python: la fecha prometida en días hábiles

Cada transportista promete entregar en una cantidad de **días hábiles**: no cuentan sábados, domingos ni feriados. Si un envío sale un viernes con promesa de 2 días hábiles, se entrega el martes.

:::ejercicio python titulo="sumar_dias_habiles"
Escribe `sumar_dias_habiles(fecha, dias, feriados=())` con `fecha` como `"YYYY-MM-DD"` y `feriados` como textos `"YYYY-MM-DD"`. Devuelve la fecha (texto) que resulta de avanzar `dias` días hábiles (el día de partida no cuenta). Con `dias = 0`, devuelve la misma fecha.
```python inicial
from datetime import date, timedelta

def sumar_dias_habiles(fecha, dias, feriados=()):
    pass

print(sumar_dias_habiles("2024-12-20", 2))   # viernes + 2 hábiles
```
```python solucion
from datetime import date, timedelta

def sumar_dias_habiles(fecha, dias, feriados=()):
    actual = date.fromisoformat(fecha)
    no_habiles = {date.fromisoformat(f) for f in feriados}
    restantes = dias
    while restantes > 0:
        actual += timedelta(days=1)
        if actual.weekday() < 5 and actual not in no_habiles:
            restantes -= 1
    return actual.isoformat()

print(sumar_dias_habiles("2024-12-20", 2))
```
```python test
assert sumar_dias_habiles("2024-12-20", 2) == "2024-12-24", "Viernes 20 + 2 hábiles = martes 24"
assert sumar_dias_habiles("2024-12-20", 2, ["2024-12-23"]) == "2024-12-25", "Si el lunes 23 es feriado, se corre un día"
assert sumar_dias_habiles("2024-12-24", 2, ["2024-12-25"]) == "2024-12-27", "Navidad feriado"
assert sumar_dias_habiles("2024-12-18", 0) == "2024-12-18"
assert sumar_dias_habiles("2024-12-27", 1) == "2024-12-30", "Viernes + 1 hábil = lunes"
```
```pista
Avanza de a un día con `timedelta(days=1)` y descuenta solo cuando el día es hábil: `weekday() < 5` (lunes a viernes) y no está en el conjunto de feriados.
```
:::

## 3. PySpark: stock diario y días de quiebre

El stock de un SKU en un almacén al final de un día es la **suma acumulada** de todos sus movimientos hasta ese día. Un **quiebre** es un día que termina con stock negativo (se registraron salidas de mercadería que no había: un error operativo que hay que investigar).

:::ejercicio pyspark titulo="quiebres_de_stock"
Con `logistica_movimientos`: (1) suma los movimientos por `almacen_id`, `sku` y `fecha` (el movimiento **neto** del día); (2) calcula el stock al cierre de cada día con una suma acumulada por almacén y SKU ordenada por fecha; (3) agrupa por `almacen_id` y `sku` y devuelve `dias_quiebre` (días con stock de cierre negativo) y `stock_final` (el stock del último día). Guarda en `resultado`.
```python solucion
from pyspark.sql import functions as F
from pyspark.sql.window import Window

diario = (spark.table("logistica_movimientos")
            .groupBy("almacen_id", "sku", "fecha")
            .agg(F.sum("cantidad").alias("neto")))

w = Window.partitionBy("almacen_id", "sku").orderBy("fecha").rowsBetween(Window.unboundedPreceding, Window.currentRow)
w_ult = Window.partitionBy("almacen_id", "sku").orderBy(F.col("fecha").desc())
stock = (diario.withColumn("stock", F.sum("neto").over(w))
               .withColumn("rn", F.row_number().over(w_ult)))

resultado = (stock.groupBy("almacen_id", "sku")
               .agg(F.sum((F.col("stock") < 0).cast("int")).alias("dias_quiebre"),
                    F.max(F.when(F.col("rn") == 1, F.col("stock"))).alias("stock_final")))
```
```pista
Primero agrega por día (si no, la suma acumulada mostraría estados "a mitad del día"). Para el stock final, numera los días de cada SKU del más reciente al más viejo y toma el que tiene `rn == 1`.
```
:::

:::cuidado ¿Por qué agregar por día antes de acumular?
Si acumularas movimiento por movimiento, un día con una salida de 50 registrada **antes** que la entrada de 100 mostraría un stock negativo "a mitad del día" que en realidad no fue un quiebre (el orden de carga dentro del día no es el orden físico). Definir el **grano** (cierre diario) antes de calcular evita falsas alarmas. Es la misma lección de siempre: primero el grano, después la métrica.
:::

## 4. dbt: puntualidad mensual por transportista

Compras renegocia los contratos con los transportistas cada trimestre, con datos de cumplimiento. El modelo calcula, por transportista y mes de despacho, la entrega a tiempo (**OTD**, *on-time delivery*) y el costo por envío exitoso.

:::ejercicio dbt titulo="otd_transportista_mes"
Escribe el modelo `otd_transportista_mes` con `ref('logistica_envios')`: por `transportista` y `mes` (`strftime('%Y-%m', fecha_despacho)`): `envios` (todos), `entregados`, `otd_pct` (entregados con `date(fecha_entrega) <= fecha_prometida` sobre **entregados**, redondeado a 2) y `costo_por_exito` (costo total de todos los envíos / entregados, redondeado a 2; nulo si no hubo entregados).
```sql inicial
with envios as (
    select * from {{ ref('logistica_envios') }}
)

select ...
```
```sql solucion
with envios as (
    select * from {{ ref('logistica_envios') }}
)

select
    transportista,
    strftime('%Y-%m', fecha_despacho) as mes,
    count(*) as envios,
    sum(case when estado = 'entregado' then 1 else 0 end) as entregados,
    round(100.0 * sum(case when estado = 'entregado' and date(fecha_entrega) <= fecha_prometida then 1 else 0 end)
          / nullif(sum(case when estado = 'entregado' then 1 else 0 end), 0), 2) as otd_pct,
    round(sum(costo) / nullif(sum(case when estado = 'entregado' then 1 else 0 end), 0), 2) as costo_por_exito
from envios
group by transportista, mes
```
```pista
`nullif(x, 0)` en el denominador convierte un cero en nulo y evita la división por cero. El costo por envío **exitoso** usa el costo de **todos** los envíos (los perdidos también se pagaron) dividido por los entregados.
```
:::

## 5. Airflow: alertar y disparar la reposición

El DAG diario de inventario calcula el stock y detecta quiebres. Si hay alguno, en vez de mandar un mail que nadie lee, **dispara** otro DAG (`reposicion_urgente`, que mantiene otro equipo) pasándole los datos necesarios. Así cada equipo es dueño de su DAG y se comunican por contrato.

:::ejercicio airflow titulo="DAG logistica_inventario"
Crea el DAG `logistica_inventario` (`schedule="@daily"`, `start_date` 2024-01-01, `catchup=False`) con:

1. `calcular_stock`: `EmptyOperator`.
2. `hay_quiebres`: `BranchPythonOperator` que devuelve `"disparar_reposicion"` si `QUIEBRES > 0`, si no `"todo_ok"` (usa `QUIEBRES = 3`).
3. `disparar_reposicion`: `TriggerDagRunOperator` con `trigger_dag_id="reposicion_urgente"` y `conf={"quiebres": QUIEBRES}`.
4. `todo_ok`: `EmptyOperator`.
```python inicial
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.standard.operators.empty import EmptyOperator
from airflow.providers.standard.operators.python import BranchPythonOperator
from airflow.providers.standard.operators.trigger_dagrun import TriggerDagRunOperator

QUIEBRES = 3
```
```python solucion
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.standard.operators.empty import EmptyOperator
from airflow.providers.standard.operators.python import BranchPythonOperator
from airflow.providers.standard.operators.trigger_dagrun import TriggerDagRunOperator

QUIEBRES = 3

def decidir():
    return "disparar_reposicion" if QUIEBRES > 0 else "todo_ok"

with DAG("logistica_inventario", schedule="@daily", start_date=datetime(2024, 1, 1), catchup=False) as dag:
    stock = EmptyOperator(task_id="calcular_stock")
    rama = BranchPythonOperator(task_id="hay_quiebres", python_callable=decidir)
    disparar = TriggerDagRunOperator(task_id="disparar_reposicion", trigger_dag_id="reposicion_urgente", conf={"quiebres": QUIEBRES})
    ok = EmptyOperator(task_id="todo_ok")
    stock >> rama >> [disparar, ok]
```
```python test
d = dags.get("logistica_inventario")
assert d is not None, "No encontré el DAG 'logistica_inventario'"
t = d.get_task("disparar_reposicion")
assert type(t).__name__ == "TriggerDagRunOperator" and t.trigger_dag_id == "reposicion_urgente", "disparar_reposicion debe disparar el DAG reposicion_urgente"
assert t.conf == {"quiebres": 3}, "Pasa la cantidad de quiebres en conf"
assert d.get_task("hay_quiebres").downstream_task_ids == {"disparar_reposicion", "todo_ok"}
run = d.test()
assert run.states["disparar_reposicion"] == "success" and run.states["todo_ok"] == "skipped", "Con 3 quiebres se dispara la reposición"
```
```pista
`TriggerDagRunOperator` está en `airflow.operators.trigger_dagrun`. El DAG disparado recibe `conf` y lo puede leer en sus tareas con `{{ dag_run.conf['quiebres'] }}`.
```
:::
