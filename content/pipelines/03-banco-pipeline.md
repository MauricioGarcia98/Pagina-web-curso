---
titulo: "Banco 🏦: el pipeline en PySpark, dbt y Airflow"
nivel: Avanzado
duracion: 60
resumen: La cartera en mora con PySpark, el perfil de gasto de cada cliente, un modelo dbt de mora por segmento y el DAG de cierre diario con una rama de calidad.
---

En la lección anterior programaste las **reglas** del banco en Python (cuota francesa, tramos de mora, conciliación). Ahora esas reglas pasan a formar parte de un **pipeline** que corre todas las noches. Este es el diseño:

```text
                 ┌──────────────────────── Airflow: banco_cierre_diario (todos los días 03:00) ────────────────────────┐
 banco_cuotas ───┤ 1. calidad: ¿llegaron datos?  ──no──▶ avisar_sin_datos                                          │
 banco_trans. ───┤        │ sí                                                                                       │
 banco_prest. ───┤ 2. PySpark: silver.cartera_mora (un préstamo por fila)   3. PySpark: gold.perfil_gasto_cliente    │
 banco_clientes ─┤ 4. dbt: mora_por_segmento (tabla para el tablero de riesgo)                                       │
                 └ 5. reportar (corre siempre que no haya fallas)                                                     ┘
```

| Pieza | Herramienta | Por qué esa herramienta |
|---|---|---|
| Cartera en mora | **PySpark** | Recorre millones de cuotas: necesita procesamiento distribuido |
| Perfil de gasto | **PySpark** | Une transacciones con cuentas: millones de filas |
| Mora por segmento | **dbt** | Es SQL de negocio sobre tablas ya limpias; queda versionado, testeado y documentado |
| Orquestación | **Airflow** | Decide el orden, reintenta, y no publica nada si los datos no llegaron |

Recuerda las reglas del caso: la fecha de corte es `2024-12-31`; una cuota está **vencida e impaga** si `fecha_pago` es nula y `fecha_vencimiento` es anterior al corte; en `banco_transacciones`, las compras tienen `monto` **negativo**.

## 1. PySpark: la cartera en mora

El área de riesgo necesita, para cada préstamo, cuántas cuotas tiene vencidas e impagas, cuántos días de atraso acumula la más vieja y en qué **tramo** cae (los mismos tramos que programaste en Python). Es la tabla base del reporte regulatorio de provisiones.

El razonamiento en PySpark:

1. Marcar cada cuota como "vencida e impaga" y calcular sus días de atraso al corte (`F.datediff`).
2. Agrupar por préstamo: contar las vencidas y tomar el **máximo** de días (la cuota más atrasada define el tramo).
3. Clasificar el máximo en tramos con `F.when`.

:::ejercicio pyspark titulo="silver.cartera_mora"
Construye la cartera al `2024-12-31` con **una fila por préstamo** (todos los de `banco_cuotas`): `prestamo_id`, `cuotas_vencidas` (cuotas con `fecha_pago` nula y `fecha_vencimiento` < `'2024-12-31'`), `dias_atraso` (el máximo de días entre el vencimiento y el corte entre esas cuotas; **0** si no tiene ninguna) y `tramo`: `'al_dia'` (0 días), `'1-30'`, `'31-60'`, `'61-90'` o `'90+'`. Guarda en `resultado`.
```python solucion
from pyspark.sql import functions as F

corte = F.to_date(F.lit("2024-12-31"))
cuotas = (spark.table("banco_cuotas")
            .withColumn("vencida", F.col("fecha_pago").isNull() & (F.col("fecha_vencimiento") < F.lit("2024-12-31")))
            .withColumn("dias", F.when(F.col("vencida"), F.datediff(corte, F.col("fecha_vencimiento"))).otherwise(0)))

resultado = (cuotas.groupBy("prestamo_id")
               .agg(F.sum(F.col("vencida").cast("int")).alias("cuotas_vencidas"),
                    F.max("dias").alias("dias_atraso"))
               .withColumn("tramo",
                   F.when(F.col("dias_atraso") == 0, "al_dia")
                    .when(F.col("dias_atraso") <= 30, "1-30")
                    .when(F.col("dias_atraso") <= 60, "31-60")
                    .when(F.col("dias_atraso") <= 90, "61-90")
                    .otherwise("90+")))
```
```pista
Primero crea una columna booleana `vencida` y otra `dias` (0 si no está vencida). Después `groupBy("prestamo_id")` con `F.sum(F.col("vencida").cast("int"))` y `F.max("dias")`.
```
:::

```recorrido
titulo: La cartera en mora, paso a paso, para el préstamo 51
estacion cuotas: Las cuotas | icono=tabla
estacion marca: vencida | icono=reglas
estacion dias: Días al corte | icono=reloj
estacion agg: groupBy | icono=capas
estacion tramo: Tramo | icono=etiqueta
paso cuotas: Las 6 cuotas del préstamo 51
Un préstamo de 6 cuotas. Dos de ellas nunca se pagaron (`fecha_pago` vacía).
>>> tabla
numero,fecha_vencimiento,fecha_pago
1,2022-06-22,2022-06-19
2,2022-07-22,2022-07-19
3,2022-08-21,NULL
4,2022-09-20,2022-11-11
5,2022-10-20,NULL
6,2022-11-19,2023-02-04
paso marca: Marcar las vencidas e impagas
`vencida` es verdadera si no hay pago **y** el vencimiento es anterior al corte (`2024-12-31`).
>>> tabla
numero,fecha_vencimiento,fecha_pago,vencida
1,2022-06-22,2022-06-19,false
2,2022-07-22,2022-07-19,false
3,2022-08-21,NULL,true
4,2022-09-20,2022-11-11,false
5,2022-10-20,NULL,true
6,2022-11-19,2023-02-04,false
paso dias: Días de atraso al corte
`F.datediff(corte, fecha_vencimiento)` solo para las vencidas; las demás, 0.
>>> tabla
numero,fecha_vencimiento,dias
1,2022-06-22,0
2,2022-07-22,0
3,2022-08-21,863
4,2022-09-20,0
5,2022-10-20,803
6,2022-11-19,0
paso agg: Una fila por préstamo
`groupBy("prestamo_id")`: se **suman** las vencidas y se toma el **máximo** de días (la cuota más vieja manda).
>>> tabla
prestamo_id,cuotas_vencidas,dias_atraso
51,2,863
paso tramo: El tramo, y la cartera completa
Más de 90 días → `90+`: se provisiona el 100 %. Hecho para **todos** los préstamos, la cartera queda así por tramo:
>>> tabla
tramo,prestamos
al_dia,367
31-60,1
61-90,2
90+,50
```

:::tip Fíjate en el diseño
La regla de los tramos es **la misma** que la función `tramo(dias)` de Python. En un proyecto real, para no tener la regla escrita dos veces, se define una sola vez (por ejemplo, una tabla de parámetros con los límites, o una función que genera la expresión `F.when`) y se reutiliza. Si mañana el regulador cambia un límite, se cambia en un solo lugar.
:::

## 2. PySpark: el perfil de gasto de cada cliente

Producto quiere ofrecer tarjetas premium a quienes más gastan. Necesita, por cliente, su actividad de compras en 2024. Las compras están en `banco_transacciones` (por cuenta) y el cliente está en `banco_cuentas`: hay que **unir** y después **agregar**.

:::ejercicio pyspark titulo="gold.perfil_gasto_cliente"
Con las transacciones de tipo `compra` de 2024 (`fecha_hora` desde `'2024-01-01'`), calcula por `cliente_id`: `cuentas` (cuentas distintas con compras), `compras` (cantidad), `gasto` (suma del monto **en positivo**, redondeada a 2) y `ticket_promedio` (gasto / compras, redondeado a 2). Guarda en `resultado`.
```python solucion
from pyspark.sql import functions as F

compras = (spark.table("banco_transacciones")
             .filter((F.col("tipo") == "compra") & (F.col("fecha_hora") >= "2024-01-01"))
             .join(spark.table("banco_cuentas").select("cuenta_id", "cliente_id"), "cuenta_id"))

resultado = (compras.groupBy("cliente_id")
               .agg(F.countDistinct("cuenta_id").alias("cuentas"),
                    F.count("*").alias("compras"),
                    F.round(F.sum(-F.col("monto")), 2).alias("gasto"))
               .withColumn("ticket_promedio", F.round(F.col("gasto") / F.col("compras"), 2)))
```
```pista
Filtra primero (menos filas para el join), une con `banco_cuentas` para obtener el `cliente_id`, y en el `agg` suma `-F.col("monto")` para tener el gasto en positivo.
```
:::

## 3. dbt: mora por segmento

El tablero de riesgo muestra, por segmento de cliente, qué porcentaje de los préstamos está en mora. Es SQL de negocio sobre tablas limpias: el trabajo ideal para un modelo de dbt (versionado, testeado, documentado). En dbt, las tablas del caso se referencian con `ref()`.

:::ejercicio dbt titulo="mora_por_segmento"
Escribe el modelo `mora_por_segmento`: por `segmento` del cliente (de `ref('banco_clientes')`), cuenta `prestamos` (de `ref('banco_prestamos')`), `en_mora` (préstamos con **al menos una** cuota de `ref('banco_cuotas')` con `fecha_pago` nula y `fecha_vencimiento < '2024-12-31'`) y `pct_mora` (redondeado a 2).
```sql inicial
with prestamos as (
    select * from {{ ref('banco_prestamos') }}
),

clientes as (
    select * from {{ ref('banco_clientes') }}
),

cuotas as (
    select * from {{ ref('banco_cuotas') }}
)

select ...
```
```sql solucion
with prestamos as (
    select * from {{ ref('banco_prestamos') }}
),

clientes as (
    select * from {{ ref('banco_clientes') }}
),

cuotas as (
    select * from {{ ref('banco_cuotas') }}
),

en_mora as (
    select distinct prestamo_id
    from cuotas
    where fecha_pago is null and fecha_vencimiento < '2024-12-31'
)

select
    c.segmento,
    count(*) as prestamos,
    sum(case when m.prestamo_id is not null then 1 else 0 end) as en_mora,
    round(100.0 * sum(case when m.prestamo_id is not null then 1 else 0 end) / count(*), 2) as pct_mora
from prestamos p
join clientes c on c.cliente_id = p.cliente_id
left join en_mora m on m.prestamo_id = p.prestamo_id
group by c.segmento
```
```pista
Primero calcula, en una CTE, la lista **distinta** de préstamos en mora. Después une préstamos con clientes y hace un `left join` con esa lista: si la unión no es nula, el préstamo está en mora. Si unieras directamente con las cuotas, cada préstamo se multiplicaría por su cantidad de cuotas.
```
:::

:::cuidado La trampa de este modelo
Unir `prestamos` con `cuotas` y contar filas cuenta **cuotas**, no préstamos: un préstamo con 3 cuotas vencidas sumaría 3. La CTE `en_mora` con `distinct` reduce primero a **una fila por préstamo**, y recién después se une. Es el error de doble conteo del método de casos, en versión dbt.
:::

## 4. Airflow: el cierre diario

El DAG orquesta todo lo anterior. Además, tiene una regla de **calidad en la puerta**: si ese día no llegaron transacciones (el archivo del core bancario no se generó), no tiene sentido recalcular nada: se avisa y se termina. Eso se resuelve con una **rama**.

:::ejercicio airflow titulo="DAG banco_cierre_diario"
Crea el DAG `banco_cierre_diario` (`schedule="@daily"`, `start_date` 2024-01-01, `catchup=False`) con:

1. `validar_llegada`: `BranchPythonOperator` cuya función devuelve `"cartera_mora"` si `transacciones_del_dia > 0`, o `"avisar_sin_datos"` si no (usa la variable `transacciones_del_dia = 1250`).
2. `cartera_mora`: `EmptyOperator` (en el proyecto real sería el job de Spark de la sección 1), en la rama "hay datos".
3. Después de `cartera_mora`, **en paralelo**: `perfil_gasto` (`EmptyOperator`, el job de la sección 2) y `dbt_mora_segmento` (`BashOperator` con `bash_command="dbt build -s mora_por_segmento"`).
4. `avisar_sin_datos`: `EmptyOperator`, la otra rama de `validar_llegada`.
5. `reportar`: `EmptyOperator` que depende de `perfil_gasto`, `dbt_mora_segmento` y `avisar_sin_datos`, y se ejecuta siempre que **no haya fallas y al menos una tarea anterior haya terminado bien** (elige la trigger rule correcta).
```python inicial
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.standard.operators.python import BranchPythonOperator
from airflow.providers.standard.operators.empty import EmptyOperator
from airflow.providers.standard.operators.bash import BashOperator

transacciones_del_dia = 1250
```
```python solucion
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.standard.operators.python import BranchPythonOperator
from airflow.providers.standard.operators.empty import EmptyOperator
from airflow.providers.standard.operators.bash import BashOperator

transacciones_del_dia = 1250

def decidir():
    return "cartera_mora" if transacciones_del_dia > 0 else "avisar_sin_datos"

with DAG("banco_cierre_diario", schedule="@daily", start_date=datetime(2024, 1, 1), catchup=False) as dag:
    validar = BranchPythonOperator(task_id="validar_llegada", python_callable=decidir)
    cartera = EmptyOperator(task_id="cartera_mora")
    perfil = EmptyOperator(task_id="perfil_gasto")
    mora_seg = BashOperator(task_id="dbt_mora_segmento", bash_command="dbt build -s mora_por_segmento")
    sin_datos = EmptyOperator(task_id="avisar_sin_datos")
    reportar = EmptyOperator(task_id="reportar", trigger_rule="none_failed_min_one_success")

    validar >> [cartera, sin_datos]
    cartera >> [perfil, mora_seg]
    [perfil, mora_seg, sin_datos] >> reportar
```
```python test
d = dags.get("banco_cierre_diario")
assert d is not None, "No encontré el DAG 'banco_cierre_diario'"
assert d.catchup is False, "Usa catchup=False"
t = {x.task_id: x for x in d.tasks}
for n in ["validar_llegada", "cartera_mora", "perfil_gasto", "dbt_mora_segmento", "avisar_sin_datos", "reportar"]:
    assert n in t, f"Falta la tarea {n}"
assert type(t["validar_llegada"]).__name__ == "BranchPythonOperator", "validar_llegada debe ser un BranchPythonOperator"
assert t["validar_llegada"].downstream_task_ids == {"cartera_mora", "avisar_sin_datos"}, "validar_llegada abre dos ramas: cartera_mora y avisar_sin_datos"
assert t["cartera_mora"].downstream_task_ids == {"perfil_gasto", "dbt_mora_segmento"}, "Después de cartera_mora van perfil_gasto y dbt_mora_segmento en paralelo"
assert "mora_por_segmento" in t["dbt_mora_segmento"].bash_command, "dbt_mora_segmento debe ejecutar dbt build -s mora_por_segmento"
assert t["reportar"].upstream_task_ids == {"perfil_gasto", "dbt_mora_segmento", "avisar_sin_datos"}, "reportar depende de perfil_gasto, dbt_mora_segmento y avisar_sin_datos"
assert t["reportar"].trigger_rule == "none_failed_min_one_success", "reportar debe correr aunque una rama esté skipped: none_failed_min_one_success"
run = d.test()
assert run.states["avisar_sin_datos"] == "skipped" and run.states["cartera_mora"] == "success", "Con 1250 transacciones debe ir por cartera_mora"
assert run.states["reportar"] == "success", "reportar debe ejecutarse"
```
```pista
`validar >> [cartera, sin_datos]` abre la rama. La trigger rule por defecto (`all_success`) haría que `reportar` quede *skipped*, porque una de sus tareas anteriores (la rama no elegida) fue salteada.
```
:::

:::ejercicio quiz
En el DAG, ¿por qué la regla "si no llegaron datos, avisar y terminar" es mejor que dejar que los jobs de Spark corran igual?

- [ ] Porque Spark no puede leer tablas vacías
- [x] Porque correr con datos faltantes publicaría una cartera y un tablero **vacíos o incompletos** como si fueran correctos; es mejor no publicar y avisar
- [ ] Porque Airflow no permite tareas sin datos
- [ ] Es indistinto
:::

:::ejercicio quiz
El modelo dbt `mora_por_segmento` lee `banco_prestamos`, que en producción la escribe un job de Spark. ¿Cómo se asegura el orden correcto?

- [ ] dbt lo detecta solo
- [x] El orquestador (Airflow) pone la tarea de dbt **después** de la tarea de Spark que escribe la tabla; dentro de dbt, `ref()` ordena los modelos entre sí
- [ ] Ejecutando dbt dos veces
- [ ] Con un `sleep` de 10 minutos
:::

## Cómo corre esto en producción

Lo que hiciste en ejercicios separados, en una empresa es **un solo flujo** que se ejecuta cada noche sin nadie mirando. Así se reparte el trabajo:

1. A las 03:00 Airflow crea la ejecución del día. Su fecha lógica es la fecha de corte que reciben todas las tareas: nadie escribe `2024-12-31` en el código.
2. La primera tarea solo **cuenta** las transacciones del día en bronze. Si son cero, la rama manda un aviso y el resto se salta: mejor un tablero con el dato de ayer que uno con mora en cero.
3. Las dos tareas de PySpark no procesan dentro de Airflow: Airflow **dispara** un job de Spark (por ejemplo, un job de Databricks) y espera a que termine. Cada job escribe su tabla de forma idempotente (reemplaza la partición del día).
4. dbt corre con `dbt build -s mora_por_segmento+`, que construye el modelo y ejecuta sus tests. Si un test falla, el modelo que alimenta el tablero no se publica.
5. La tarea final informa conteos y tiempos (filas procesadas, préstamos en cada tramo), que quedan en un tablero de salud del pipeline.

:::errores
- **Contar cuotas en vez de préstamos** al unir préstamos con cuotas: un préstamo con 3 cuotas vencidas suma 3. Reduce a una fila por préstamo antes de unir.
- **Olvidar el signo de las compras** (`monto` negativo en este caso): el "gasto total" sale negativo o se mezcla con los depósitos. Filtra por `tipo` y usa el valor absoluto donde corresponda.
- **La regla de tramos copiada en tres lugares** (Python, PySpark y dbt) con límites distintos: el reporte regulatorio no coincide con el tablero.
- **Procesar con pandas dentro de un `PythonOperator`**: con millones de transacciones el worker se queda sin memoria.
- **Publicar aunque no hayan llegado datos**: el tablero muestra mora en cero y alguien toma una decisión con eso.
:::

:::trabajo
- En bancos, la tabla de cartera en mora es la base de reportes que se envían al regulador: cada ejecución guarda la versión del código y la fecha de corte con la que se calculó, porque puede haber una auditoría años después.
- Los límites de los tramos y los porcentajes de provisión suelen vivir en una **tabla de parámetros** (o un *seed* de dbt) que mantiene el área de riesgo, no en el código.
- Las ramas de calidad ("¿llegaron datos?") son de lo primero que se agrega a un DAG después del primer incidente.
:::

:::entrevista "¿Cómo diseñarías el cierre diario de cartera de un banco?"
Un DAG diario cuya fecha lógica es la fecha de corte. Primero una verificación de que llegaron los datos del día; si no, alerta y no publica. Después jobs de Spark idempotentes que calculan la cartera en mora por préstamo y el perfil de gasto, reemplazando la partición del día. Luego dbt construye y prueba los modelos de negocio, como la mora por segmento, y solo se publica si los tests pasan. Las reglas de tramos van en una tabla de parámetros versionada, y cada ejecución registra conteos para auditar.
:::
