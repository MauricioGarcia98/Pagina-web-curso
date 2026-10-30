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

```recorrido
titulo: Los movimientos de MRR de marzo de 2024, paso a paso
estacion mrr: MRR por empresa | icono=tabla
estacion ant: El mes anterior | icono=reloj
estacion full: Join full | icono=capas
estacion clasif: Clasificar | icono=reglas
estacion res: Totales del mes | icono=dashboard
paso mrr: El MRR de cada empresa en cada mes
Se suman las facturas por empresa y mes. Ejemplo: una empresa de cada tipo de movimiento, en marzo de 2024.
>>> tabla
empresa_id,mes,mrr
1,2024-03-01,149
3,2024-03-01,49
47,2024-03-01,499
131,2024-03-01,0
143,2024-03-01,149
paso ant: Correr el mes anterior un mes hacia adelante
`F.add_months("mes", 1)` sobre la copia: el MRR de **febrero** queda etiquetado como "marzo", listo para ponerlo al lado del MRR de marzo.
>>> python
previo = mrr.select("empresa_id",
                    F.add_months("mes", 1).alias("mes"),
                    F.col("mrr").alias("mrr_ant"))
paso full: Unir con full outer join
`full` conserva a las empresas que facturaron **solo** en uno de los dos meses: las nuevas (sin febrero) y las que se fueron (sin marzo). `fillna(0)` cambia los vacíos por 0.
>>> tabla
empresa_id,mrr_ant,mrr
1,149,149
3,0,49
47,149,499
131,49,0
143,499,149
paso clasif: Cada empresa, un movimiento
Antes 0 y ahora más → nuevo. Antes algo y ahora 0 → churn. Subió → expansión. Bajó → contracción.
>>> tabla
empresa_id,mrr_ant,mrr,movimiento
1,149,149,sin cambio
3,0,49,nuevo
47,149,499,expansion
131,49,0,churn
143,499,149,contraccion
paso res: Los totales de marzo
Sumando cada movimiento sobre **todas** las empresas se obtiene la fila de marzo del reporte. Es la que mira finanzas en el cierre de mes.
>>> tabla
mes,nuevo,expansion,contraccion,churn
2024-03-01,3235,1050,1050,548
```

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

El cierre corre el **día 1 de cada mes** a las 06:00 y procesa el mes que terminó. Ojo con la fecha: en Airflow 3, con `schedule="0 6 1 * *"`, la ejecución que corre el 1 de julio tiene `ds` = 1 de julio (la fecha del disparo). Para que el intervalo sea el mes cerrado se usa `CronTriggerTimetable("0 6 1 * *", timezone="UTC", interval=relativedelta(months=1))`, y entonces `data_interval_start` = 1 de junio. En Airflow 2 ese era el comportamiento por defecto.

:::ejercicio airflow titulo="DAG saas_cierre_mensual"
Crea el DAG `saas_cierre_mensual` con `schedule="0 6 1 * *"`, `start_date` 2024-01-01 y `catchup=True` (para poder reprocesar meses viejos con backfill), con estas tareas en orden:

1. `facturacion_incremental`: `BashOperator` con `bash_command="dbt build -s facturacion_mensual"`.
2. `movimientos_mrr`: `EmptyOperator` (el job de PySpark).
3. `verificar_identidad`: `PythonOperator` que lanza `ValueError` si `abs(inicial + nuevo + expansion - contraccion - churn - final) > 0.01` usando el diccionario `CIERRE` del código inicial (que cumple la identidad).
4. `publicar`: `EmptyOperator`.
```python inicial
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.standard.operators.bash import BashOperator
from airflow.providers.standard.operators.python import PythonOperator
from airflow.providers.standard.operators.empty import EmptyOperator

CIERRE = {"inicial": 846, "nuevo": 49, "expansion": 100, "contraccion": 350, "churn": 149, "final": 496}
```
```python solucion
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.standard.operators.bash import BashOperator
from airflow.providers.standard.operators.python import PythonOperator
from airflow.providers.standard.operators.empty import EmptyOperator

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

## Por qué el cierre de mes es especial

En una empresa SaaS el **MRR** (ingreso mensual recurrente) es la métrica que mira el directorio y los inversores. Su descomposición en movimientos (nuevo, expansión, contracción, churn) tiene una **identidad contable**: MRR inicial + nuevo + expansión − contracción − churn = MRR final. Si no cuadra, hay un error en el pipeline, no "un mes raro". Por eso el DAG de cierre tiene una tarea que **verifica la identidad** y falla si la diferencia supera un centavo: es un test de negocio dentro del pipeline.

El modelo de facturación en dbt es **incremental** porque cada mes se agregan facturas, pero una factura puede cambiar de estado (de pendiente a pagada) después de cargada. Por eso usa `merge` con `unique_key` y reprocesa una ventana de meses recientes, no solo el último.

:::errores
- **Prorratear con días de 30** cuando el contrato dice días calendario: la diferencia es pequeña por cliente y enorme en el total.
- **Contar un upgrade como churn más alta nueva**: el MRR del mes queda igual pero los movimientos mienten (más churn y más altas de lo real).
- **Incremental con `append`** para facturas que cambian de estado: aparecen duplicadas o quedan con el estado viejo.
- **Cerrar el mes antes de que lleguen todas las facturas**: el cierre se programa días después del fin de mes y se marca como provisorio hasta entonces.
- **No verificar la identidad del MRR**: los errores se descubren en la reunión del directorio.
:::

:::trabajo
- El cierre de mes suele tener un calendario: el día 1 se corre el cierre provisorio, el día 5 el definitivo, y cualquier reproceso posterior queda registrado.
- Finanzas y datos deben acordar las definiciones (qué es expansión, cuándo una baja cuenta) por escrito; esas definiciones se convierten en tests.
- `catchup=True` tiene sentido en DAGs mensuales como este: permite reprocesar meses viejos con un backfill cuando se corrige una regla.
:::

:::entrevista "¿Cómo validarías que una métrica como el MRR es correcta en cada cierre?"
Con controles que no dependen de la implementación: la identidad contable entre MRR inicial, movimientos y MRR final debe cuadrar al centavo, y si no, el cierre falla. Compararía el MRR con la suma de facturas del mes de otra fuente, por ejemplo el sistema de facturación, y alertaría ante variaciones grandes contra el mes anterior. Las definiciones de cada movimiento estarían acordadas con finanzas y probadas con casos.
:::
