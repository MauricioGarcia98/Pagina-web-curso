---
titulo: "SaaS ☁️: prorrateos, movimientos de MRR, facturación incremental y cierre mensual"
nivel: Experto
duracion: 65
resumen: El prorrateo de un cambio de plan y los movimientos de MRR en Python, la conciliación de movimientos en PySpark, un modelo incremental de facturación en dbt y el DAG de cierre de mes.
---

En **Nube Pyme** (caso ☁️) las métricas de suscripción se presentan al directorio y a los inversores cada mes. No pueden tener errores. Esta lección construye las piezas del **cierre mensual**: la lógica de facturación de los cambios de plan, la descomposición del MRR en movimientos, la tabla de facturas cargada de forma incremental, y el DAG que lo orquesta.

## 1. Python: el prorrateo de un cambio de plan

Una empresa paga el plan Básico (49 por mes) y el día 11 de un mes de 30 días sube al Profesional (149). No es justo cobrarle el mes entero del plan nuevo ni regalarle la diferencia: se **prorratea** por días.

- Días restantes del mes, **incluido** el día del cambio: del 11 al 30 son 20 días → fracción 20/30.
- **Crédito** por la parte no usada del plan viejo: 49 × 20/30 = 32,67.
- **Cargo** por la parte restante del plan nuevo: 149 × 20/30 = 99,33.
- A cobrar ahora: cargo − crédito = **66,67** (si es una bajada de plan, el resultado es negativo: un saldo a favor).

:::ejercicio python titulo="prorrateo"
Escribe `prorrateo(precio_viejo, precio_nuevo, fecha_cambio)` con `fecha_cambio` como `"YYYY-MM-DD"`. Usa la cantidad **real** de días del mes (`calendar.monthrange`). Devuelve un diccionario con `dias_restantes`, `credito`, `cargo` y `neto` (los tres montos redondeados a 2; `neto` se calcula con los valores ya redondeados).
```python inicial
import calendar
from datetime import date

def prorrateo(precio_viejo, precio_nuevo, fecha_cambio):
    pass

print(prorrateo(49, 149, "2024-06-11"))
```
```python solucion
import calendar
from datetime import date

def prorrateo(precio_viejo, precio_nuevo, fecha_cambio):
    f = date.fromisoformat(fecha_cambio)
    dias_mes = calendar.monthrange(f.year, f.month)[1]
    restantes = dias_mes - f.day + 1
    fraccion = restantes / dias_mes
    credito = round(precio_viejo * fraccion, 2)
    cargo = round(precio_nuevo * fraccion, 2)
    return {"dias_restantes": restantes, "credito": credito, "cargo": cargo, "neto": round(cargo - credito, 2)}

print(prorrateo(49, 149, "2024-06-11"))
```
```python test
assert prorrateo(49, 149, "2024-06-11") == {"dias_restantes": 20, "credito": 32.67, "cargo": 99.33, "neto": 66.66}, f"{prorrateo(49, 149, '2024-06-11')} (neto = 99.33 - 32.67)"
assert prorrateo(149, 49, "2024-06-11")["neto"] == -66.66, "Una bajada de plan da saldo a favor"
assert prorrateo(49, 149, "2024-02-01")["dias_restantes"] == 29, "Febrero de 2024 tiene 29 días (bisiesto) y el día del cambio cuenta"
assert prorrateo(49, 149, "2024-01-31") == {"dias_restantes": 1, "credito": 1.58, "cargo": 4.81, "neto": 3.23}
```
```pista
`calendar.monthrange(anio, mes)` devuelve `(dia_de_la_semana_del_1, cantidad_de_dias)`. Los días restantes incluyen el día del cambio: `dias_mes - dia + 1`.
```
:::

:::nota El centavo perdido
Fíjate en el primer test: el neto da 66,66 y no 66,67, porque se calcula con los montos **ya redondeados** (99,33 − 32,67). Es una decisión de negocio, no un error: lo importante es que el sistema de facturación y el reporte usen **la misma** regla. Si uno redondea antes y otro después, la conciliación nunca cierra por centavos.
:::

## 2. Python: descomponer el MRR en movimientos

El MRR pasó de 100.000 a 104.000. ¿Es buena noticia? Depende: puede ser que entraron muchos clientes nuevos y se fueron otros tantos. Por eso se **descompone** la variación:

```text
MRR final = MRR inicial + nuevo + expansión − contracción − churn
```

:::ejercicio python titulo="movimientos_mrr"
Escribe `movimientos_mrr(anterior, actual)` donde ambos son diccionarios `{empresa_id: mrr}` (las empresas que no están, no facturaron ese mes). Devuelve un diccionario con `inicial`, `nuevo`, `expansion`, `contraccion`, `churn` y `final` (todos positivos). Verifica dentro de la función que se cumple la identidad (usa `assert` con una tolerancia de 0,01).
```python inicial
def movimientos_mrr(anterior, actual):
    pass

ant = {1: 49, 2: 149, 3: 499, 4: 149}
act = {1: 149, 2: 149, 3: 149, 5: 49}
print(movimientos_mrr(ant, act))
```
```python solucion
def movimientos_mrr(anterior, actual):
    r = {"inicial": sum(anterior.values()), "nuevo": 0, "expansion": 0, "contraccion": 0, "churn": 0,
         "final": sum(actual.values())}
    for emp in anterior.keys() | actual.keys():
        a, b = anterior.get(emp, 0), actual.get(emp, 0)
        if a == 0 and b > 0:
            r["nuevo"] += b
        elif a > 0 and b == 0:
            r["churn"] += a
        elif b > a:
            r["expansion"] += b - a
        elif b < a:
            r["contraccion"] += a - b
    assert abs(r["inicial"] + r["nuevo"] + r["expansion"] - r["contraccion"] - r["churn"] - r["final"]) < 0.01
    return r

ant = {1: 49, 2: 149, 3: 499, 4: 149}
act = {1: 149, 2: 149, 3: 149, 5: 49}
print(movimientos_mrr(ant, act))
```
```python test
r = movimientos_mrr(ant, act)
assert r == {"inicial": 846, "nuevo": 49, "expansion": 100, "contraccion": 350, "churn": 149, "final": 496}, f"{r}"
assert movimientos_mrr({}, {})["final"] == 0
assert movimientos_mrr({1: 10}, {})["churn"] == 10
```
```pista
Recorre la **unión** de las claves (`anterior.keys() | actual.keys()`) y clasifica cada empresa comparando lo que pagaba antes (`get(emp, 0)`) con lo que paga ahora.
```
:::

## 3. PySpark: los movimientos de cada mes, a escala

La misma lógica, para todos los meses y todas las empresas a la vez. El truco: unir la facturación de cada mes con la del **mes anterior** de la misma empresa, con un **full outer join** (para no perder ni las altas, que no estaban antes, ni las bajas, que no están ahora).

:::ejercicio pyspark titulo="movimientos_mrr_mensual"
Con `saas_facturas` (el MRR de una empresa en un mes es la suma de su `monto` en ese `mes`), calcula para cada `mes` de **2024**: `nuevo`, `expansion`, `contraccion` y `churn` (sumas, redondeadas a 2). Una empresa es "nueva" en un mes si no facturó el mes anterior y sí en este (para este ejercicio, aunque haya facturado antes alguna vez). Guarda en `resultado` con columnas `mes`, `nuevo`, `expansion`, `contraccion`, `churn`.
```python solucion
from pyspark.sql import functions as F

mrr = (spark.table("saas_facturas")
         .groupBy("empresa_id", "mes").agg(F.sum("monto").alias("mrr"))
         .withColumn("mes", F.to_date("mes")))
# el MRR del mes anterior, "corrido" un mes hacia adelante para poder unirlo con el actual
previo = mrr.select("empresa_id", F.add_months("mes", 1).alias("mes"), F.col("mrr").alias("mrr_ant"))

j = (mrr.join(previo, ["empresa_id", "mes"], "full")
        .fillna({"mrr": 0, "mrr_ant": 0})
        .filter(F.year("mes") == 2024))

resultado = (j.groupBy(F.date_format("mes", "yyyy-MM-dd").alias("mes"))
               .agg(F.round(F.sum(F.when((F.col("mrr_ant") == 0) & (F.col("mrr") > 0), F.col("mrr")).otherwise(0)), 2).alias("nuevo"),
                    F.round(F.sum(F.when((F.col("mrr_ant") > 0) & (F.col("mrr") > F.col("mrr_ant")), F.col("mrr") - F.col("mrr_ant")).otherwise(0)), 2).alias("expansion"),
                    F.round(F.sum(F.when((F.col("mrr") > 0) & (F.col("mrr") < F.col("mrr_ant")), F.col("mrr_ant") - F.col("mrr")).otherwise(0)), 2).alias("contraccion"),
                    F.round(F.sum(F.when((F.col("mrr_ant") > 0) & (F.col("mrr") == 0), F.col("mrr_ant")).otherwise(0)), 2).alias("churn")))
```
```pista
Crea `previo` con el mes **sumado en uno** (`F.add_months`): así el MRR de enero queda etiquetado como "febrero" y se une con el de febrero. El `full` join conserva las altas (sin fila en `previo`) y las bajas (sin fila en `mrr`); `fillna` pone 0 donde no hay dato.
```
:::

## 4. dbt: la facturación mensual, incremental

La tabla de facturación por empresa y mes crece todos los meses y nunca se modifican los meses cerrados. Recalcularla completa cada vez es un desperdicio: es el caso ideal para un modelo **incremental**.

:::ejercicio dbt incremental this=facturacion_mensual titulo="facturacion_mensual incremental"
La tabla `facturacion_mensual` ya existe con los meses **hasta noviembre de 2024**. Escribe el modelo incremental que, por `mes` y `empresa_id`, suma el `monto` de las facturas **pagadas** de `ref('saas_facturas')` (columna `facturado`, redondeada a 2), y que cuando `is_incremental()` sea verdadero **solo procese los meses posteriores** al máximo `mes` de `{{ this }}`.
```sql previo
CREATE TABLE facturacion_mensual AS
SELECT mes, empresa_id, ROUND(SUM(monto), 2) AS facturado FROM saas_facturas
WHERE estado = 'pagada' AND mes < '2024-12-01' GROUP BY mes, empresa_id
```
```sql inicial
{{ config(materialized='incremental', unique_key=['mes', 'empresa_id']) }}

select mes, empresa_id, round(sum(monto), 2) as facturado
from {{ ref('saas_facturas') }}
where estado = 'pagada'
-- filtro incremental aquí
group by mes, empresa_id
```
```sql solucion
{{ config(materialized='incremental', unique_key=['mes', 'empresa_id']) }}

select mes, empresa_id, round(sum(monto), 2) as facturado
from {{ ref('saas_facturas') }}
where estado = 'pagada'
{% if is_incremental() %}
  and mes > (select max(mes) from {{ this }})
{% endif %}
group by mes, empresa_id
```
```pista
Como ya hay un `where`, el filtro incremental se agrega con `and`, dentro de `{% if is_incremental() %} … {% endif %}`.
```
:::

:::cuidado Facturas que cambian de estado
Una factura de noviembre puede pasar de `pendiente` a `pagada` en diciembre. Con el filtro `mes > max(mes)`, ese cambio **nunca** se vería. En la vida real, la ventana incremental reprocesa también los últimos 2 o 3 meses (`mes >= max(mes) - 2 meses`) con `unique_key` para que el `merge` actualice esas filas. Elegir la ventana es una decisión de negocio: ¿cuánto tarda en estabilizarse un dato?
:::

## 5. Airflow: el cierre de mes

El cierre corre el **día 1 de cada mes** a las 06:00 y procesa el mes que terminó. En Airflow, con `schedule="0 6 1 * *"`, la ejecución que corre el 1 de julio tiene `data_interval_start` = 1 de junio: justo el mes a cerrar.

:::ejercicio airflow titulo="DAG saas_cierre_mensual"
Crea el DAG `saas_cierre_mensual` con `schedule="0 6 1 * *"`, `start_date` 2024-01-01 y `catchup=True` (para poder reprocesar meses viejos con backfill), con estas tareas en orden:

1. `facturacion_incremental`: `BashOperator` con `bash_command="dbt build -s facturacion_mensual"`.
2. `movimientos_mrr`: `EmptyOperator` (el job de PySpark).
3. `verificar_identidad`: `PythonOperator` que lanza `ValueError` si `abs(inicial + nuevo + expansion - contraccion - churn - final) > 0.01` usando el diccionario `CIERRE` del código inicial (que cumple la identidad).
4. `publicar`: `EmptyOperator`.
```python inicial
from datetime import datetime
from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator
from airflow.operators.empty import EmptyOperator

CIERRE = {"inicial": 846, "nuevo": 49, "expansion": 100, "contraccion": 350, "churn": 149, "final": 496}
```
```python solucion
from datetime import datetime
from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator
from airflow.operators.empty import EmptyOperator

CIERRE = {"inicial": 846, "nuevo": 49, "expansion": 100, "contraccion": 350, "churn": 149, "final": 496}

def verificar():
    c = CIERRE
    diferencia = c["inicial"] + c["nuevo"] + c["expansion"] - c["contraccion"] - c["churn"] - c["final"]
    if abs(diferencia) > 0.01:
        raise ValueError(f"El MRR no cierra: diferencia de {diferencia}")

with DAG("saas_cierre_mensual", schedule="0 6 1 * *", start_date=datetime(2024, 1, 1), catchup=True) as dag:
    fact = BashOperator(task_id="facturacion_incremental", bash_command="dbt build -s facturacion_mensual")
    mov = EmptyOperator(task_id="movimientos_mrr")
    ver = PythonOperator(task_id="verificar_identidad", python_callable=verificar)
    pub = EmptyOperator(task_id="publicar")
    fact >> mov >> ver >> pub
```
```python test
d = dags.get("saas_cierre_mensual")
assert d is not None, "No encontré el DAG 'saas_cierre_mensual'"
assert d.catchup is True, "Este DAG usa catchup=True para poder reprocesar meses"
assert "facturacion_mensual" in d.get_task("facturacion_incremental").bash_command
orden = ["facturacion_incremental", "movimientos_mrr", "verificar_identidad", "publicar"]
for a, b in zip(orden, orden[1:]):
    assert d.get_task(a).downstream_task_ids == {b}, f"{a} debe ir antes de {b}"
run = d.test()
assert run.states["publicar"] == "success", "Con un cierre correcto se publica"
CIERRE["final"] = 500
run2 = d.test()
assert run2.states["verificar_identidad"] == "failed" and run2.states["publicar"] == "upstream_failed", "Si el MRR no cierra, verificar_identidad debe fallar y no publicar"
```
```pista
La función de `verificar_identidad` lee `CIERRE` cuando se **ejecuta**, no cuando se define: por eso el test puede cambiar `CIERRE` y volver a probar el DAG.
```
:::
