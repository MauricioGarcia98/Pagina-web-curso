---
titulo: "Aerolínea ✈️: sobreventa, propagación de demoras y tareas generadas por código"
nivel: Experto
duracion: 65
resumen: Cuántos pasajes vender por encima de la capacidad (probabilidad binomial) y cómo se propaga una demora en Python, las peores rutas de cada mes en PySpark, la ocupación por ruta en dbt y un DAG con una tarea por aeropuerto generada en un bucle.
---

En **Cóndor Air** (caso ✈️) cada asiento vacío al despegar es dinero perdido, y cada demora de la mañana arrastra a todos los vuelos del día. Esta lección programa dos decisiones clave de una aerolínea y arma el pipeline de operaciones.

## 1. Python: ¿cuántos pasajes vender? (sobreventa)

En el caso, alrededor del **5 %** de los pasajeros con reserva no se presenta (*no-show*). Si un avión de 160 asientos vende exactamente 160 pasajes, en promedio despega con 8 asientos vacíos. Por eso las aerolíneas **sobrevenden**: venden algunos pasajes más que asientos, aceptando un pequeño riesgo de que se presenten más pasajeros que asientos (y haya que compensar a alguien).

¿Cuál es ese riesgo? Si cada pasajero se presenta con probabilidad `p` de forma independiente, la cantidad que se presenta de `n` vendidos sigue una distribución **binomial**:

```text
P(se presentan exactamente k) = C(n, k) · p^k · (1 − p)^(n − k)        C(n, k) = combinaciones = math.comb(n, k)
P(sobreventa) = P(se presentan más de C) = suma de P(k) para k = C+1 … n
```

:::analogia Tirar monedas cargadas
Imagina que cada pasajero vendido es una moneda que sale "se presenta" el 95 % de las veces. Vender 165 pasajes es tirar 165 monedas: lo más probable es que salgan unas 157 "se presenta", pero a veces salen 161 o más. La fórmula binomial calcula exactamente qué tan seguido pasa eso.
:::

:::ejercicio python titulo="sobreventa"
Escribe `prob_sobreventa(vendidos, capacidad, p_presentarse)` (la probabilidad de que se presenten **más** pasajeros que la capacidad, redondeada a 4 decimales) y `max_a_vender(capacidad, p_presentarse, riesgo_max)`: la mayor cantidad de pasajes que se puede vender sin que la probabilidad de sobreventa supere `riesgo_max` (nunca menos que la capacidad).
```python inicial
from math import comb

def prob_sobreventa(vendidos, capacidad, p_presentarse):
    pass

def max_a_vender(capacidad, p_presentarse, riesgo_max):
    pass

print(prob_sobreventa(165, 160, 0.95), max_a_vender(160, 0.95, 0.05))
```
```python solucion
from math import comb

def prob_sobreventa(vendidos, capacidad, p_presentarse):
    p = p_presentarse
    total = sum(comb(vendidos, k) * p ** k * (1 - p) ** (vendidos - k) for k in range(capacidad + 1, vendidos + 1))
    return round(total, 4)

def max_a_vender(capacidad, p_presentarse, riesgo_max):
    n = capacidad
    while prob_sobreventa(n + 1, capacidad, p_presentarse) <= riesgo_max:
        n += 1
    return n

print(prob_sobreventa(165, 160, 0.95), max_a_vender(160, 0.95, 0.05))
```
```python test
assert prob_sobreventa(160, 160, 0.95) == 0.0, "Vendiendo exactamente la capacidad no puede haber sobreventa"
assert prob_sobreventa(165, 160, 0.95) == 0.0808, f"165 vendidos: {prob_sobreventa(165, 160, 0.95)}"
assert max_a_vender(160, 0.95, 0.05) == 164, f"Con 5 % de riesgo: {max_a_vender(160, 0.95, 0.05)}"
assert max_a_vender(160, 0.95, 0.01) == 162
assert max_a_vender(100, 0.90, 0.05) == 106, "Con más no-shows se puede sobrevender más"
assert max_a_vender(160, 1.0, 0.05) == 160, "Si todos se presentan, no se sobrevende nada"
```
```pista
`prob_sobreventa` suma los términos binomiales desde `capacidad + 1` hasta `vendidos`. `max_a_vender` empieza en la capacidad y va sumando 1 mientras vender uno más no supere el riesgo.
```
:::

:::experto Revenue management de verdad
Las aerolíneas reales no usan un riesgo fijo: comparan el **ingreso esperado** de vender un pasaje más con el **costo esperado** de una sobreventa (compensación, hotel, mala reputación), y la probabilidad de no-show cambia por ruta, día, tarifa y anticipación (lo estima un modelo con los datos históricos que tú preparas en el pipeline). Pero la base matemática es exactamente esta.
:::

## 2. Python: cómo se propaga una demora

Un avión hace varios tramos en el día (Buenos Aires → Santiago → Lima → …). Entre tramo y tramo hay un **tiempo de rotación** programado (desembarcar, limpiar, cargar combustible, embarcar), que tiene un margen. Si el avión llega tarde, ese margen **absorbe** parte de la demora; el resto se arrastra al tramo siguiente.

Regla: la demora de salida de un tramo = máx(0, demora de llegada del tramo anterior − margen de rotación). Además, en vuelo el avión puede **recuperar** algunos minutos (o perderlos): la demora de llegada de cada tramo = demora de salida − recuperación del tramo (nunca menor que 0).

:::ejercicio python titulo="propagar_demora"
Escribe `propagar_demora(demora_inicial, tramos)` donde `tramos` es una lista de diccionarios `{"margen": minutos, "recupera": minutos}` (el `margen` del primer tramo se ignora: la demora inicial ya es su demora de salida). Devuelve la lista de demoras de **llegada** de cada tramo.
```python inicial
def propagar_demora(demora_inicial, tramos):
    pass

dia = [{"margen": 0, "recupera": 5}, {"margen": 20, "recupera": 0}, {"margen": 15, "recupera": 10}, {"margen": 30, "recupera": 0}]
print(propagar_demora(60, dia))
```
```python solucion
def propagar_demora(demora_inicial, tramos):
    llegadas = []
    salida = demora_inicial
    for i, t in enumerate(tramos):
        if i > 0:
            salida = max(0, llegadas[-1] - t["margen"])
        llegadas.append(max(0, salida - t["recupera"]))
    return llegadas

dia = [{"margen": 0, "recupera": 5}, {"margen": 20, "recupera": 0}, {"margen": 15, "recupera": 10}, {"margen": 30, "recupera": 0}]
print(propagar_demora(60, dia))
```
```python test
assert propagar_demora(60, dia) == [55, 35, 10, 0], f"{propagar_demora(60, dia)}: 60-5=55 → 55-20=35 → 35-15-10=10 → 10-30<0 → 0"
assert propagar_demora(0, dia) == [0, 0, 0, 0]
assert propagar_demora(10, [{"margen": 0, "recupera": 15}]) == [0], "Nunca negativa"
assert propagar_demora(30, []) == []
```
:::

## 3. PySpark: las peores rutas de cada mes

Operaciones revisa cada mes las rutas con peor puntualidad (OTP: llegada con 15 minutos o menos de demora; los cancelados cuentan como no puntuales). Quiere las **3 peores** de cada mes.

:::ejercicio pyspark titulo="peores_rutas_mes"
Con `vuelos_vuelos`, calcula por `mes` (`yyyy-MM` de `fecha`), `origen` y `destino`: `vuelos` y `otp_pct` (redondeado a 2). Quédate con las **3 rutas de menor OTP** de cada mes (desempata por `origen` y luego `destino`), agregando `puesto` (1 a 3). Columnas: `mes`, `origen`, `destino`, `vuelos`, `otp_pct`, `puesto`. Guarda en `resultado`.
```python solucion
from pyspark.sql import functions as F
from pyspark.sql.window import Window

v = (spark.table("vuelos_vuelos")
       .withColumn("mes", F.date_format("fecha", "yyyy-MM"))
       .withColumn("demora_llegada", (F.unix_timestamp("llegada_real") - F.unix_timestamp("llegada_programada")) / 60)
       .withColumn("puntual", (F.col("llegada_real").isNotNull() & (F.col("demora_llegada") <= 15)).cast("int")))

por_ruta = (v.groupBy("mes", "origen", "destino")
              .agg(F.count("*").alias("vuelos"), F.round(F.avg("puntual") * 100, 2).alias("otp_pct")))

w = Window.partitionBy("mes").orderBy("otp_pct", "origen", "destino")
resultado = (por_ruta.withColumn("puesto", F.row_number().over(w))
                     .filter(F.col("puesto") <= 3))
```
```pista
Marca cada vuelo como puntual (1) o no (0): `llegada_real` no nula y demora ≤ 15. El promedio por ruta × 100 es el OTP. Después, una ventana por mes ordenada por OTP **ascendente** (los peores primero).
```
:::

```recorrido
titulo: Las peores rutas de enero de 2024, paso a paso
estacion vuelos: Vuelos | icono=tabla
estacion punt: ¿Puntual? | icono=reloj
estacion ruta: Por ruta | icono=capas
estacion rank: row_number | icono=etiqueta
estacion res: Top 3 peores | icono=alerta
paso vuelos: Algunos vuelos de enero
Cada fila de `vuelos_vuelos` tiene la llegada programada y la real.
>>> tabla
vuelo_id,origen,destino,llegada_programada,llegada_real
1,EZE,SCL,2024-01-01 08:00:00,2024-01-01 07:53:00
2,SCL,EZE,2024-01-01 11:30:00,2024-01-01 11:33:00
3,EZE,LIM,2024-01-01 16:30:00,2024-01-01 16:33:00
4,LIM,BOG,2024-01-01 21:10:00,2024-01-01 21:30:00
5,BOG,LIM,2024-01-02 00:40:00,2024-01-02 00:50:00
paso punt: Minutos de demora y marca de puntualidad
Un vuelo es **puntual** si llegó (no se canceló) y con 15 minutos de demora o menos: es la definición estándar de OTP (*on-time performance*).
>>> tabla
vuelo_id,demora_llegada,puntual
1,-7,1
2,3,1
3,3,1
4,20,0
5,10,1
paso ruta: OTP por mes y ruta
`groupBy("mes", "origen", "destino")`: vuelos y el promedio de la marca × 100. Algunas de enero:
>>> tabla
origen,destino,vuelos,otp_pct
AEP,COR,22,86.36
AEP,MVD,28,82.14
BOG,LIM,26,53.85
BOG,MDE,26,50
BOG,MEX,9,88.89
COR,AEP,27,77.78
paso rank: Numerar de peor a mejor
Ventana por mes ordenada por `otp_pct` ascendente, desempatando por `origen` y `destino` para que el resultado sea siempre el mismo.
>>> python
w = Window.partitionBy("mes").orderBy("otp_pct", "origen", "destino")
resultado = (por_ruta.withColumn("puesto", F.row_number().over(w))
                     .filter(F.col("puesto") <= 3))
paso res: Las 3 peores de enero
Estas son las rutas que operaciones revisa primero en el informe mensual.
>>> tabla
mes,origen,destino,vuelos,otp_pct,puesto
2024-01,BOG,MDE,26,50,1
2024-01,BOG,LIM,26,53.85,2
2024-01,LIM,EZE,8,62.5,3
```

## 4. dbt: ocupación e ingresos por ruta

Comercial quiere la ocupación (*load factor*) e ingresos por ruta. Recuerda las reglas del caso: `vuelos_reservas` es una **muestra** y cada reserva representa **40** pasajeros; los vuelos cancelados no ofrecen asientos.

:::ejercicio dbt titulo="ocupacion_por_ruta"
Escribe el modelo `ocupacion_por_ruta` con `ref('vuelos_vuelos')` y `ref('vuelos_reservas')`: por `origen` y `destino`, solo vuelos **no cancelados**: `vuelos`, `asientos` (suma de `capacidad`), `pasajeros` (reservas `confirmada` × 40), `load_factor_pct` (redondeado a 2) e `ingresos` (suma del `precio` de las confirmadas × 40, redondeada a 2).
```sql inicial
with vuelos as (
    select * from {{ ref('vuelos_vuelos') }}
    where estado <> 'cancelado'
),

reservas as (
    select * from {{ ref('vuelos_reservas') }}
)

select ...
```
```sql solucion
with vuelos as (
    select * from {{ ref('vuelos_vuelos') }}
    where estado <> 'cancelado'
),

reservas as (
    select * from {{ ref('vuelos_reservas') }}
),

por_vuelo as (
    select vuelo_id,
           sum(case when estado = 'confirmada' then 1 else 0 end) * 40 as pasajeros,
           sum(case when estado = 'confirmada' then precio else 0 end) * 40 as ingresos
    from reservas
    group by vuelo_id
)

select v.origen, v.destino,
       count(*) as vuelos,
       sum(v.capacidad) as asientos,
       sum(coalesce(p.pasajeros, 0)) as pasajeros,
       round(100.0 * sum(coalesce(p.pasajeros, 0)) / sum(v.capacidad), 2) as load_factor_pct,
       round(sum(coalesce(p.ingresos, 0)), 2) as ingresos
from vuelos v
left join por_vuelo p on p.vuelo_id = v.vuelo_id
group by v.origen, v.destino
```
```pista
Agrega las reservas **por vuelo** antes de unir: si unes vuelos con reservas fila a fila, la capacidad de cada vuelo se suma una vez por cada reserva (doble conteo).
```
:::

## 5. Airflow: una tarea por aeropuerto, generada por código

El reporte de puntualidad se calcula por aeropuerto, y la lista de aeropuertos cambia (se abren rutas nuevas). En vez de escribir una tarea a mano por aeropuerto, se **generan en un bucle**: el DAG es código Python, así que puede crear tareas a partir de una lista.

:::ejercicio airflow titulo="DAG vuelos_puntualidad"
Crea el DAG `vuelos_puntualidad` (`schedule="@daily"`, `start_date` 2024-01-01, `catchup=False`) con:

- `cargar_vuelos`: `EmptyOperator`.
- Una tarea `otp_<codigo>` (`BashOperator` con `bash_command=f"echo calculando OTP de {codigo}"`) por **cada** código de la lista `AEROPUERTOS`, todas después de `cargar_vuelos`.
- `consolidar`: `EmptyOperator` después de **todas** las `otp_…`.
```python inicial
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.standard.operators.empty import EmptyOperator
from airflow.providers.standard.operators.bash import BashOperator

AEROPUERTOS = ["EZE", "SCL", "LIM", "BOG", "MEX", "GRU"]
```
```python solucion
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.standard.operators.empty import EmptyOperator
from airflow.providers.standard.operators.bash import BashOperator

AEROPUERTOS = ["EZE", "SCL", "LIM", "BOG", "MEX", "GRU"]

with DAG("vuelos_puntualidad", schedule="@daily", start_date=datetime(2024, 1, 1), catchup=False) as dag:
    cargar = EmptyOperator(task_id="cargar_vuelos")
    consolidar = EmptyOperator(task_id="consolidar")
    for codigo in AEROPUERTOS:
        otp = BashOperator(task_id=f"otp_{codigo}", bash_command=f"echo calculando OTP de {codigo}")
        cargar >> otp >> consolidar
```
```python test
d = dags.get("vuelos_puntualidad")
assert d is not None, "No encontré el DAG 'vuelos_puntualidad'"
esperadas = {f"otp_{c}" for c in AEROPUERTOS}
assert esperadas <= set(d.task_ids), f"Faltan tareas: {esperadas - set(d.task_ids)}"
assert d.get_task("cargar_vuelos").downstream_task_ids == esperadas, "Todas las otp_ van después de cargar_vuelos"
assert d.get_task("consolidar").upstream_task_ids == esperadas, "consolidar espera a todas las otp_"
assert "MEX" in d.get_task("otp_MEX").bash_command
run = d.test()
assert all(s == "success" for s in run.states.values())
```
```pista
Dentro del `with DAG`, un `for codigo in AEROPUERTOS:` que crea un `BashOperator` con `task_id=f"otp_{codigo}"` y lo conecta: `cargar >> otp >> consolidar`.
```
:::

:::cuidado Generar tareas: sí; leer una base para generarlas: no
La lista `AEROPUERTOS` está escrita en el código o en un archivo de configuración. **No** la leas de una base de datos en el nivel superior del archivo: Airflow parsea el DAG cada pocos segundos y haría miles de consultas por día. Para cantidades que cambian en cada ejecución (por ejemplo, "una tarea por cada archivo que llegó hoy") existe el **mapeo dinámico de tareas** (`.expand()`), que crea las tareas recién al ejecutar.
:::

## Generar tareas con un bucle o con expand()

El DAG de esta lección crea una tarea por aeropuerto con un `for` sobre una **lista fija** escrita en el código. Eso está bien cuando la lista cambia muy de vez en cuando (se agrega un aeropuerto por año), porque el `for` se ejecuta cada vez que Airflow **lee** el archivo y las tareas aparecen en la interfaz con nombre propio (`procesar_SCL`, `procesar_LIM`).

Cuando la lista depende de **los datos del día** (los aeropuertos que tuvieron vuelos hoy, los archivos que llegaron), el `for` no sirve: se usa el **mapeo dinámico** (`.expand()`) que viste en la lección de XCom y TaskFlow, que crea las copias en tiempo de ejecución.

| | `for` al nivel superior | `.expand()` |
|---|---|---|
| Cuándo se decide cuántas tareas | Al leer el archivo | Al ejecutar el DAG |
| De dónde sale la lista | Una lista escrita en el código o un archivo de configuración del repositorio | El resultado de una tarea anterior |
| Cómo se ven en la interfaz | Tareas separadas con nombre propio | Una tarea con instancias `[0]`, `[1]`… |

:::errores
- **Sobreventa calculada con la probabilidad de un solo pasajero**: lo que importa es la probabilidad de que se presenten **más** pasajeros que asientos, que sale de la distribución binomial.
- **Demoras que se propagan sin tiempo mínimo de conexión**: si un avión llega 20 minutos tarde y necesita 45 en tierra, la demora del vuelo siguiente no es 20.
- **Ocupación = pasajes vendidos / asientos**: cuenta las ausencias como asientos ocupados. Se usan los pasajeros que embarcaron.
- **Leer una base de datos en el `for` que genera tareas**: se consulta en cada lectura del archivo, miles de veces por día.
:::

:::trabajo
- Las aerolíneas trabajan con *revenue management*: la sobreventa se decide con modelos que usan el historial de ausencias por ruta, día y clase, y el costo de compensar a un pasajero que no puede viajar.
- Los DAGs con "una tarea por aeropuerto, por país o por cliente" son muy comunes; la regla práctica es `for` con una lista versionada si cambia poco, `.expand()` si depende de los datos.
:::

:::entrevista "¿Cuándo usarías un bucle para crear tareas en Airflow y cuándo el mapeo dinámico?"
Un bucle al nivel superior sirve cuando la lista es estable y está en el código o en un archivo de configuración del repositorio, porque se evalúa al leer el archivo y cada tarea tiene un nombre propio en la interfaz. Si la cantidad depende de los datos del día, uso mapeo dinámico con `.expand()` sobre el resultado de una tarea anterior, que crea las instancias en tiempo de ejecución. Nunca consultaría una base o una API en el nivel superior para generar tareas.
:::
