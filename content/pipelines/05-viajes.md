---
titulo: "Movilidad 🚕: precios, oferta y demanda, conductores destacados"
nivel: Avanzado
duracion: 60
resumen: La regla de tarifa dinámica y el cotizador de viajes en Python, el balance oferta/demanda por hora en PySpark, los conductores destacados en dbt y un DAG horario con sensor y reintentos.
---

En **Ruta**, la app de viajes del caso 🚕, el precio no es fijo: depende de la distancia, del tiempo y del **equilibrio entre oferta y demanda** en ese momento. Esta lección programa esa lógica y la pone en un pipeline que corre **cada hora**.

| Pieza | Herramienta | Quién la usa |
|---|---|---|
| Multiplicador dinámico y cotizador | Python | El backend de la app, en cada solicitud |
| Balance oferta/demanda por hora | PySpark | Operaciones: dónde y cuándo incentivar conductores |
| Conductores destacados | dbt | Programa de beneficios para conductores |
| Proceso horario | Airflow | Espera el lote de la última hora, carga y recalcula |

## 1. Python: el multiplicador de tarifa dinámica

La regla del negocio (simplificada, pero con la misma lógica que usan las apps reales):

- Si hay **más conductores libres que solicitudes** en la zona (o igual), no hay recargo: multiplicador **1.0**.
- Si no, el multiplicador crece con la presión de demanda: `1 + 0.5 × (solicitudes / conductores − 1)`, redondeado a 1 decimal.
- Hay un **tope** regulatorio de **2.5**.
- Si no hay **ningún** conductor libre, se aplica el tope.

:::ejercicio python titulo="multiplicador_dinamico"
Escribe `multiplicador_dinamico(solicitudes, conductores_libres)` que aplique la regla anterior.
```python inicial
def multiplicador_dinamico(solicitudes, conductores_libres):
    pass

for s, c in [(5, 10), (10, 10), (15, 10), (30, 10), (100, 10), (4, 0)]:
    print(s, c, multiplicador_dinamico(s, c))
```
```python solucion
def multiplicador_dinamico(solicitudes, conductores_libres):
    if conductores_libres == 0:
        return 2.5
    ratio = solicitudes / conductores_libres
    if ratio <= 1:
        return 1.0
    return min(2.5, round(1 + 0.5 * (ratio - 1), 1))

for s, c in [(5, 10), (10, 10), (15, 10), (30, 10), (100, 10), (4, 0)]:
    print(s, c, multiplicador_dinamico(s, c))
```
```python test
assert multiplicador_dinamico(5, 10) == 1.0, "Sobra oferta: sin recargo"
assert multiplicador_dinamico(10, 10) == 1.0, "Equilibrio exacto: sin recargo"
assert multiplicador_dinamico(15, 10) == 1.2, "ratio 1.5 → 1 + 0.25 = 1.25 → 1.2 redondeado"
assert multiplicador_dinamico(30, 10) == 2.0, "ratio 3 → 1 + 1 = 2.0"
assert multiplicador_dinamico(100, 10) == 2.5, "Nunca más que el tope de 2.5"
assert multiplicador_dinamico(4, 0) == 2.5, "Sin conductores libres: tope (y sin dividir por cero)"
assert multiplicador_dinamico(0, 0) == 2.5
```
```pista
Primero la guarda para `conductores_libres == 0` (evita dividir por cero). Después el ratio, el caso sin recargo, y por último `min(2.5, …)`.
```
:::

:::nota Sobre el redondeo
Python redondea `1.25` a `1.2` (redondeo "al par", o *banker's rounding*, y además 1.25 no es exacto en binario). Para precios reales se usa el módulo `decimal` con una regla de redondeo explícita, porque una diferencia de un centavo multiplicada por millones de viajes es mucho dinero. En el ejercicio, la regla es simplemente "lo que haga `round`".
:::

## 2. Python: el cotizador de viajes

Antes de pedir un viaje, la app muestra el precio estimado. Necesita la **distancia** entre dos puntos (latitud y longitud) y una **fórmula de tarifa**:

- Distancia en línea recta con la **fórmula de haversine** (la distancia sobre una esfera, la Tierra, de radio 6.371 km). Como las calles no son rectas, la distancia estimada de manejo es la de haversine × **1.3**.
- Tiempo estimado: la distancia de manejo a **25 km/h** promedio.
- Tarifa = (banderazo **1.00** + **0.90** por km + **0.15** por minuto) × multiplicador, con un **mínimo de 3.00** (el mínimo se aplica **después** del multiplicador), redondeada a 2.

:::ejercicio python titulo="cotizar"
Escribe `haversine_km(lat1, lon1, lat2, lon2)` y `cotizar(origen, destino, multiplicador=1.0)` (origen y destino son tuplas `(lat, lon)`) que devuelva un diccionario con `km` (manejo, redondeado a 1), `minutos` (redondeado a 0, como entero) y `precio`.
```python inicial
import math

def haversine_km(lat1, lon1, lat2, lon2):
    pass

def cotizar(origen, destino, multiplicador=1.0):
    pass

obelisco = (-34.6037, -58.3816)
palermo = (-34.5711, -58.4233)
print(cotizar(obelisco, palermo))
```
```python solucion
import math

def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))

def cotizar(origen, destino, multiplicador=1.0):
    km = haversine_km(*origen, *destino) * 1.3
    minutos = km / 25 * 60
    precio = (1.00 + 0.90 * km + 0.15 * minutos) * multiplicador
    return {"km": round(km, 1), "minutos": int(round(minutos)), "precio": round(max(3.00, precio), 2)}

obelisco = (-34.6037, -58.3816)
palermo = (-34.5711, -58.4233)
print(cotizar(obelisco, palermo))
```
```python test
assert abs(haversine_km(0, 0, 0, 1) - 111.19) < 0.05, "Un grado de longitud en el ecuador mide ~111.19 km"
assert haversine_km(-34.6, -58.4, -34.6, -58.4) == 0, "Mismo punto: 0 km"
r = cotizar(obelisco, palermo)
assert r["km"] == 6.8 and r["minutos"] == 16, f"Obelisco → Palermo: {r}"
assert r["precio"] == 9.62, f"precio = {r['precio']}"
assert cotizar(obelisco, palermo, 2.0)["precio"] == 19.25, "Con multiplicador 2.0"
assert cotizar(obelisco, (-34.6040, -58.3816))["precio"] == 3.0, "Un viaje cortísimo cobra el mínimo"
```
```pista
Convierte los grados a radianes con `math.radians`. La fórmula: `a = sin²(Δlat/2) + cos(lat1)·cos(lat2)·sin²(Δlon/2)` y `d = 2·R·asin(√a)`.
```
:::

## 3. PySpark: ¿dónde y cuándo falta oferta?

Operaciones quiere un mapa de calor: para cada ciudad y hora del día, cuántas solicitudes hubo, qué porcentaje quedó **sin conductor** y cuál fue el multiplicador promedio de los viajes completados. Con eso decide en qué franjas pagar bonos a los conductores.

:::ejercicio pyspark titulo="balance_oferta_demanda"
Con `viajes_viajes`, calcula por `ciudad` y `hora` (la hora de `fecha_hora_solicitud`, entero 0–23): `solicitudes`, `pct_sin_conductor` (estado `sin_conductor`, redondeado a 2) y `multiplicador_prom` (promedio de `multiplicador` **solo** de los viajes `completado`, redondeado a 2). Guarda en `resultado`.
```python solucion
from pyspark.sql import functions as F

v = spark.table("viajes_viajes").withColumn("hora", F.hour("fecha_hora_solicitud"))
resultado = (v.groupBy("ciudad", "hora")
               .agg(F.count("*").alias("solicitudes"),
                    F.round(F.avg((F.col("estado") == "sin_conductor").cast("int")) * 100, 2).alias("pct_sin_conductor"),
                    F.round(F.avg(F.when(F.col("estado") == "completado", F.col("multiplicador"))), 2).alias("multiplicador_prom")))
```
```pista
`F.when(cond, valor)` sin `otherwise` devuelve nulo cuando no se cumple, y `F.avg` ignora los nulos: así promedias solo los completados sin filtrar las demás filas (que necesitas para contar solicitudes).
```
:::

```recorrido
titulo: Oferta y demanda por hora en Lima, paso a paso
estacion viajes: Solicitudes | icono=tabla
estacion hora: La hora | icono=reloj
estacion agg: groupBy | icono=capas
estacion cond: Promedio condicional | icono=reglas
estacion res: Dónde falta oferta | icono=alerta
paso viajes: Cada fila es una solicitud
Algunas solicitudes de Lima en `viajes_viajes`. Cada una termina en un estado: `completado`, `cancelado_pasajero`, `cancelado_conductor` o `sin_conductor` (nadie la aceptó).
>>> tabla
viaje_id,fecha_hora_solicitud,multiplicador,estado
3,2024-07-01 03:03:48,1,completado
6,2024-07-01 06:17:21,1,completado
24,2024-07-01 08:28:13,1.44,cancelado_pasajero
39,2024-07-01 12:55:27,1.05,completado
43,2024-07-01 13:47:46,1,completado
49,2024-07-01 17:09:55,1.46,completado
paso hora: Extraer la hora
`F.hour("fecha_hora_solicitud")` da un entero de 0 a 23. Así se puede agrupar "todas las 8 de la mañana" juntas, de cualquier día.
>>> tabla
viaje_id,hora,estado
3,3,completado
6,6,completado
24,8,cancelado_pasajero
39,12,completado
43,13,completado
49,17,completado
paso agg: Agrupar por ciudad y hora
`groupBy("ciudad", "hora")` y contar solicitudes. El porcentaje sin conductor es el promedio de una marca 0/1 × 100.
>>> python
F.round(F.avg((F.col("estado") == "sin_conductor").cast("int")) * 100, 2)
paso cond: El multiplicador, solo de los completados
`F.avg(F.when(estado == "completado", multiplicador))`: el `when` sin `otherwise` deja `null` en los demás, y **`avg` ignora los null**. Así el promedio usa solo los viajes completados.
>>> python
F.round(F.avg(F.when(F.col("estado") == "completado", F.col("multiplicador"))), 2)
paso res: Las 5 horas más difíciles de Lima
Ordenado por porcentaje sin conductor. Donde falta oferta, el multiplicador promedio sube: es la tarifa dinámica funcionando.
>>> tabla
ciudad,hora,solicitudes,pct_sin_conductor,multiplicador_prom
Lima,7,133,14.29,1.46
Lima,17,145,11.03,1.37
Lima,12,60,10,1.03
Lima,19,118,9.32,1.41
Lima,8,133,9.02,1.46
```

## 4. dbt: conductores destacados

Ruta tiene un programa de beneficios para conductores destacados: al menos **30 viajes completados** y calificación promedio de **4.4 o más** (solo cuentan los viajes calificados). El modelo alimenta el sistema de beneficios cada semana.

:::ejercicio dbt titulo="conductores_destacados"
Escribe el modelo `conductores_destacados` a partir de `ref('viajes_viajes')` y `ref('viajes_conductores')`: `conductor_id`, `nombre`, `ciudad` (la del conductor), `viajes` (completados), `calificacion` (promedio, redondeado a 2) e `ingresos` (suma de `tarifa`, redondeada a 2), solo para los que cumplen las dos condiciones.
```sql inicial
with viajes as (
    select * from {{ ref('viajes_viajes') }}
    where estado = 'completado'
),

conductores as (
    select * from {{ ref('viajes_conductores') }}
)

select ...
```
```sql solucion
with viajes as (
    select * from {{ ref('viajes_viajes') }}
    where estado = 'completado'
),

conductores as (
    select * from {{ ref('viajes_conductores') }}
),

por_conductor as (
    select conductor_id,
           count(*)           as viajes,
           avg(calificacion)  as calificacion,
           sum(tarifa)        as ingresos
    from viajes
    group by conductor_id
)

select p.conductor_id, c.nombre, c.ciudad, p.viajes,
       round(p.calificacion, 2) as calificacion,
       round(p.ingresos, 2)     as ingresos
from por_conductor p
join conductores c on c.conductor_id = p.conductor_id
where p.viajes >= 30 and p.calificacion >= 4.4
```
```pista
Agrega primero por conductor (una fila por conductor) y filtra **después**, sobre los agregados. `avg(calificacion)` ignora los viajes sin calificar, que es justo lo que pide la regla.
```
:::

## 5. Airflow: el proceso horario

Cada hora, el sistema de la app deja un archivo con los viajes de la hora anterior. El DAG debe **esperar** a que el archivo exista (un **sensor**), cargarlo y recalcular el balance. Como el archivo a veces llega unos minutos tarde, el sensor libera el worker mientras espera (`mode="reschedule"`), y las tareas se reintentan solas si fallan por un problema pasajero.

:::ejercicio airflow titulo="DAG viajes_horario"
Crea el DAG `viajes_horario` (`schedule="@hourly"`, `start_date` 2024-07-01, `catchup=False`) con `default_args={"retries": 2, "retry_delay": timedelta(minutes=5)}` y:

1. `esperar_lote`: `FileSensor` con `filepath="/lake/landing/viajes/{{ ts_nodash }}.json"`, `mode="reschedule"`, `poke_interval=60` y `timeout=1800`.
2. `cargar_bronze` y `balance_oferta`: dos `EmptyOperator`, en ese orden, después del sensor.
```python inicial
from datetime import datetime, timedelta
from airflow.sdk import DAG
from airflow.providers.standard.sensors.filesystem import FileSensor
from airflow.providers.standard.operators.empty import EmptyOperator
```
```python solucion
from datetime import datetime, timedelta
from airflow.sdk import DAG
from airflow.providers.standard.sensors.filesystem import FileSensor
from airflow.providers.standard.operators.empty import EmptyOperator

with DAG("viajes_horario", schedule="@hourly", start_date=datetime(2024, 7, 1), catchup=False,
         default_args={"retries": 2, "retry_delay": timedelta(minutes=5)}) as dag:
    esperar = FileSensor(task_id="esperar_lote", filepath="/lake/landing/viajes/{{ ts_nodash }}.json",
                         mode="reschedule", poke_interval=60, timeout=1800)
    cargar = EmptyOperator(task_id="cargar_bronze")
    balance = EmptyOperator(task_id="balance_oferta")
    esperar >> cargar >> balance
```
```python test
d = dags.get("viajes_horario")
assert d is not None, "No encontré el DAG 'viajes_horario'"
assert d.catchup is False
s = d.get_task("esperar_lote")
assert type(s).__name__ == "FileSensor", "esperar_lote debe ser un FileSensor"
assert "{{ ts_nodash }}" in s.filepath, "El archivo depende de la hora de la ejecución: usa {{ ts_nodash }}"
assert s.mode == "reschedule" and s.poke_interval == 60 and s.timeout == 1800, "mode='reschedule', poke_interval=60, timeout=1800"
assert d.get_task("cargar_bronze").retries == 2, "Los reintentos llegan a cada tarea desde default_args"
assert d.get_task("esperar_lote").downstream_task_ids == {"cargar_bronze"} and d.get_task("cargar_bronze").downstream_task_ids == {"balance_oferta"}
run = d.test()
assert all(v == "success" for v in run.states.values()), f"Estados: {run.states}"
```
```pista
`default_args` es un diccionario que el DAG pasa a **todas** sus tareas: así no repites `retries=2` en cada una. `{{ ts_nodash }}` es la fecha y hora lógica de la ejecución sin separadores (por ejemplo `20240701T030000`).
```
:::

## Cómo encaja en un sistema que cambia cada hora

La tarifa dinámica es el ejemplo clásico de una regla de negocio que se usa en **dos tiempos**:

- **En tiempo real**: cuando un pasajero pide un viaje, la app calcula el multiplicador con la oferta y demanda de los últimos minutos. Esa función tiene que ser rápida y exactamente la misma que probaste en Python.
- **En batch**: cada hora, el pipeline calcula en PySpark el balance de oferta y demanda por zona y hora del pasado, para que el equipo de precios ajuste las reglas y para auditar qué multiplicador se cobró.

El DAG horario tiene un **sensor** porque los datos de la hora llegan con algunos minutos de demora: espera a que el archivo esté completo (con `mode="reschedule"` o `deferrable=True`, para no ocupar un worker) y tiene un `timeout` para no esperar para siempre.

:::errores
- **Multiplicador sin tope**: en un evento masivo la fórmula da 9x y la empresa sale en las noticias. Las reglas de precio siempre tienen límites, y van en los tests.
- **Dividir por cero cuando no hay conductores**: el balance demanda/oferta necesita una regla explícita para oferta 0.
- **Agregar por hora sin completar las horas vacías**: una zona sin viajes a las 4:00 no aparece y el promedio queda sesgado. Genera la grilla de horas y une.
- **Sensor sin `timeout`** o en modo `poke`: si el archivo nunca llega, el DAG queda ocupando un worker horas.
- **Reintentos que duplican**: si la carga horaria no es idempotente, cada reintento suma la hora otra vez.
:::

:::trabajo
- Las empresas de movilidad guardan cada cotización con sus insumos (zona, hora, oferta, demanda, multiplicador) para poder explicar un precio cobrado y para recalcular qué habría pasado con otra regla.
- Los procesos horarios son exigentes: un DAG que tarda 70 minutos en procesar una hora se atrasa para siempre. Se mide la duración de cada ejecución y se alerta si se acerca al intervalo.
:::

:::entrevista "¿Cómo armarías un proceso que corre cada hora con datos que llegan con atraso?"
Un DAG horario cuya fecha lógica identifica la hora a procesar, con un sensor que espera a que los datos de esa hora estén completos, en modo diferible o reschedule y con timeout. La carga es idempotente: reemplaza la partición de esa hora, así los reintentos y reprocesos no duplican. Además reprocesaría las últimas horas en cada ejecución para capturar datos tardíos, y alertaría si la duración se acerca a una hora, porque el proceso no puede atrasarse.
:::
