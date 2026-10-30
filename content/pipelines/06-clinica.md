---
titulo: "Clínica 🏥: agenda, riesgo de ausencia, pacientes reincidentes y recordatorios"
nivel: Avanzado
duracion: 60
resumen: Turnos libres de una agenda y un puntaje de riesgo de ausencia en Python, pacientes reincidentes en PySpark, la facturación mensual por cobertura en dbt y un DAG de recordatorios con ShortCircuitOperator.
---

En **Clínica del Sur** (caso 🏥) el problema número uno es el **ausentismo**: turnos reservados a los que el paciente no viene. La estrategia del equipo: (1) mostrar bien los turnos libres para reasignar rápido, (2) estimar qué turnos tienen **riesgo** de ausencia, (3) identificar a los pacientes reincidentes, y (4) enviar **recordatorios** el día anterior.

## 1. Python: los turnos libres de una agenda

Un médico atiende de 08:00 a 12:00 en turnos de 20 minutos. Algunos turnos ya están tomados, y a veces hay bloqueos de distinta duración (una reunión de 08:30 a 09:10). El sistema de reservas tiene que mostrar los turnos **libres**: los que caben **completos** sin solaparse con nada ocupado.

:::ejercicio python titulo="turnos_libres"
Escribe `turnos_libres(inicio, fin, ocupados, duracion=20)` donde `inicio` y `fin` son horas `"HH:MM"` y `ocupados` es una lista de tuplas `("HH:MM", "HH:MM")` (inicio y fin de cada bloqueo). Devuelve la lista de horarios de inicio `"HH:MM"` de los turnos libres, cada `duracion` minutos desde `inicio`, que **no se solapan** con ningún ocupado y terminan a más tardar en `fin`. Dos intervalos se solapan si uno empieza antes de que termine el otro (tocarse en el borde no es solaparse).
```python inicial
def turnos_libres(inicio, fin, ocupados, duracion=20):
    pass

print(turnos_libres("08:00", "10:00", [("08:20", "08:40"), ("09:10", "09:30")]))
```
```python solucion
def a_min(hhmm):
    h, m = map(int, hhmm.split(":"))
    return h * 60 + m

def a_hhmm(minutos):
    return f"{minutos // 60:02d}:{minutos % 60:02d}"

def turnos_libres(inicio, fin, ocupados, duracion=20):
    bloqueos = [(a_min(a), a_min(b)) for a, b in ocupados]
    libres = []
    t = a_min(inicio)
    while t + duracion <= a_min(fin):
        if all(not (t < b and a < t + duracion) for a, b in bloqueos):
            libres.append(a_hhmm(t))
        t += duracion
    return libres

print(turnos_libres("08:00", "10:00", [("08:20", "08:40"), ("09:10", "09:30")]))
```
```python test
assert turnos_libres("08:00", "10:00", [("08:20", "08:40"), ("09:10", "09:30")]) == ["08:00", "08:40", "09:40"], "09:00 se solapa con el bloqueo 09:10-09:30 y 09:20 también"
assert turnos_libres("08:00", "09:00", []) == ["08:00", "08:20", "08:40"]
assert turnos_libres("08:00", "08:50", []) == ["08:00", "08:20"], "Un turno que no termina antes del fin no se ofrece"
assert turnos_libres("08:00", "09:00", [("08:00", "09:00")]) == []
assert turnos_libres("08:00", "09:00", [("08:20", "08:40")]) == ["08:00", "08:40"], "Tocarse en el borde no es solaparse"
```
```pista
Trabaja todo en **minutos desde medianoche** (`8*60 + 30`): comparar números es mucho más fácil que comparar textos de horas. Dos intervalos `[a1, b1)` y `[a2, b2)` se solapan si `a1 < b2 and a2 < b1`.
```
:::

## 2. Python: el puntaje de riesgo de ausencia

Con los datos históricos, el equipo encontró los factores que más se asocian a las ausencias. Antes de tener un modelo de machine learning, se usa un **puntaje por reglas** (transparente y fácil de explicar a los médicos):

| Factor | Puntos |
|---|---|
| Anticipación de la reserva: más de 30 días | +3 |
| Anticipación de 8 a 30 días | +1 |
| Cada ausencia previa del paciente (máximo 3 ausencias contadas) | +2 por ausencia |
| Turno en lunes | +1 |
| Paciente sin cobertura (`Particular`) | +1 |

Nivel: **alto** con 5 o más puntos, **medio** con 2 a 4, **bajo** con menos de 2. A los de riesgo alto se los llama por teléfono; a los medios, se les manda un mensaje.

:::ejercicio python titulo="riesgo_ausencia"
Escribe `riesgo_ausencia(dias_anticipacion, ausencias_previas, dia_semana, cobertura)` (`dia_semana`: 0 = lunes … 6 = domingo) que devuelva una tupla `(puntos, nivel)`.
```python inicial
def riesgo_ausencia(dias_anticipacion, ausencias_previas, dia_semana, cobertura):
    pass
```
```python solucion
def riesgo_ausencia(dias_anticipacion, ausencias_previas, dia_semana, cobertura):
    puntos = 0
    if dias_anticipacion > 30:
        puntos += 3
    elif dias_anticipacion >= 8:
        puntos += 1
    puntos += 2 * min(ausencias_previas, 3)
    if dia_semana == 0:
        puntos += 1
    if cobertura == "Particular":
        puntos += 1
    nivel = "alto" if puntos >= 5 else "medio" if puntos >= 2 else "bajo"
    return puntos, nivel
```
```python test
assert riesgo_ausencia(2, 0, 2, "OSDE") == (0, "bajo")
assert riesgo_ausencia(10, 0, 0, "OSDE") == (2, "medio"), "8-30 días (+1) y lunes (+1)"
assert riesgo_ausencia(45, 1, 3, "Particular") == (6, "alto"), "+3 anticipación, +2 una ausencia, +1 particular"
assert riesgo_ausencia(7, 5, 4, "PAMI") == (6, "alto"), "Las ausencias se cuentan hasta 3 (6 puntos); 7 días no suma"
assert riesgo_ausencia(30, 0, 1, "Galeno") == (1, "bajo"), "30 días exactos es el tramo 8-30"
assert riesgo_ausencia(31, 0, 1, "Galeno") == (3, "medio")
```
:::

:::tip Reglas antes que modelos
Un puntaje por reglas es un excelente primer paso: se implementa en un día, cualquiera lo entiende y sirve de **línea de base** para comparar. Si después un modelo de machine learning no le gana claramente, no vale la pena su complejidad.
:::

## 3. PySpark: pacientes reincidentes

Para el puntaje hace falta saber cuántas ausencias tuvo cada paciente. Esa tabla se calcula todas las noches sobre el historial completo de turnos.

:::ejercicio pyspark titulo="historial_paciente"
Con `clinica_turnos`, calcula por `paciente_id`: `turnos` (todos), `ausencias` (estado `ausente`), `tasa_ausentismo` (ausencias / (atendidos + ausencias) × 100, redondeado a 2; nulo si no tiene atendidos ni ausencias), `ultima_visita` (la `fecha_hora` máxima de los turnos **atendidos**) y `reincidente` (verdadero si tiene **2 o más** ausencias). Guarda en `resultado`.
```python solucion
from pyspark.sql import functions as F

t = spark.table("clinica_turnos")
resultado = (t.groupBy("paciente_id")
               .agg(F.count("*").alias("turnos"),
                    F.sum((F.col("estado") == "ausente").cast("int")).alias("ausencias"),
                    F.sum(F.col("estado").isin("atendido", "ausente").cast("int")).alias("base"),
                    F.max(F.when(F.col("estado") == "atendido", F.col("fecha_hora"))).alias("ultima_visita"))
               .withColumn("tasa_ausentismo", F.round(F.col("ausencias") * 100 / F.when(F.col("base") > 0, F.col("base")), 2))
               .withColumn("reincidente", F.col("ausencias") >= 2)
               .drop("base"))
```
```pista
Calcula en el `agg` una columna auxiliar con el denominador (atendidos + ausentes) y después divide. `F.when(base > 0, base)` devuelve nulo si la base es 0, y dividir por nulo da nulo (en lugar de un error).
```
:::

## 4. dbt: facturación mensual por cobertura

Finanzas negocia cada año con las prepagas y obras sociales. Necesita, por mes y cobertura, cuánto se facturó, cuánto pagó la cobertura y cuánto el paciente (copago).

:::ejercicio dbt titulo="facturacion_cobertura_mes"
Escribe el modelo `facturacion_cobertura_mes` uniendo `ref('clinica_facturas')`, `ref('clinica_turnos')` y `ref('clinica_pacientes')`: por `mes` (`strftime('%Y-%m', fecha_hora)` del turno) y `cobertura`: `facturas`, `monto` (suma, redondeada a 2), `cubierto` (suma de `monto_cubierto`, redondeada a 2) y `pct_copago` (porcentaje del monto que paga el paciente, redondeado a 2).
```sql inicial
with facturas as (
    select * from {{ ref('clinica_facturas') }}
),

turnos as (
    select * from {{ ref('clinica_turnos') }}
),

pacientes as (
    select * from {{ ref('clinica_pacientes') }}
)

select ...
```
```sql solucion
with facturas as (
    select * from {{ ref('clinica_facturas') }}
),

turnos as (
    select * from {{ ref('clinica_turnos') }}
),

pacientes as (
    select * from {{ ref('clinica_pacientes') }}
)

select
    strftime('%Y-%m', t.fecha_hora) as mes,
    p.cobertura,
    count(*) as facturas,
    round(sum(f.monto), 2) as monto,
    round(sum(f.monto_cubierto), 2) as cubierto,
    round(100.0 * sum(f.monto - f.monto_cubierto) / sum(f.monto), 2) as pct_copago
from facturas f
join turnos t on t.turno_id = f.turno_id
join pacientes p on p.paciente_id = t.paciente_id
group by mes, p.cobertura
```
:::

## 5. Airflow: los recordatorios del día siguiente

Todos los días a las 18:00, el DAG busca los turnos de mañana, y si hay alguno, envía los recordatorios. Si mañana es feriado y no hay turnos, **no tiene sentido** ejecutar el envío: el `ShortCircuitOperator` corta el flujo cuando su función devuelve un valor falso, y todo lo que sigue queda *skipped* (sin contar como error).

:::ejercicio airflow titulo="DAG clinica_recordatorios"
Crea el DAG `clinica_recordatorios` (`schedule="0 18 * * *"`, `start_date` 2024-01-01, `catchup=False`) con:

1. `turnos_manana`: `PythonOperator` que **devuelve** la variable `cantidad_turnos` (usa `cantidad_turnos = 0`, como un feriado).
2. `hay_turnos`: `ShortCircuitOperator` cuya función recibe `ti`, hace `xcom_pull(task_ids="turnos_manana")` y devuelve `True` si es mayor a 0.
3. `enviar_recordatorios`: `EmptyOperator`.

Orden: `turnos_manana >> hay_turnos >> enviar_recordatorios`.
```python inicial
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.standard.operators.python import PythonOperator, ShortCircuitOperator
from airflow.providers.standard.operators.empty import EmptyOperator

cantidad_turnos = 0
```
```python solucion
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.standard.operators.python import PythonOperator, ShortCircuitOperator
from airflow.providers.standard.operators.empty import EmptyOperator

cantidad_turnos = 0

def contar():
    return cantidad_turnos

def hay(ti):
    return ti.xcom_pull(task_ids="turnos_manana") > 0

with DAG("clinica_recordatorios", schedule="0 18 * * *", start_date=datetime(2024, 1, 1), catchup=False) as dag:
    turnos = PythonOperator(task_id="turnos_manana", python_callable=contar)
    corte = ShortCircuitOperator(task_id="hay_turnos", python_callable=hay)
    enviar = EmptyOperator(task_id="enviar_recordatorios")
    turnos >> corte >> enviar
```
```python test
d = dags.get("clinica_recordatorios")
assert d is not None, "No encontré el DAG 'clinica_recordatorios'"
assert type(d.get_task("hay_turnos")).__name__ == "ShortCircuitOperator", "hay_turnos debe ser un ShortCircuitOperator"
assert d.get_task("turnos_manana").downstream_task_ids == {"hay_turnos"} and d.get_task("hay_turnos").downstream_task_ids == {"enviar_recordatorios"}
run = d.test()
assert run.xcoms.get(("turnos_manana", "return_value")) == 0, "turnos_manana debe devolver cantidad_turnos por XCom"
assert run.states["enviar_recordatorios"] == "skipped", "Con 0 turnos, el envío debe quedar skipped"
assert run.states["hay_turnos"] == "success", "El ShortCircuit en sí termina bien: solo corta lo que sigue"
```
```pista
Lo que devuelve la función de un `PythonOperator` se guarda en XCom como `return_value`. En `hay(ti)`, `ti.xcom_pull(task_ids="turnos_manana")` lo recupera.
```
:::

## De las reglas a la operación diaria

En la clínica, el pipeline tiene un efecto directo en personas: si los recordatorios no salen, los pacientes faltan y los turnos se pierden. Por eso el DAG de recordatorios usa un `ShortCircuitOperator`: si mañana no hay turnos (un feriado), se corta sin enviar nada y sin marcar error. Y el **puntaje de riesgo de ausencia** decide a quién llamar además de enviarle un mensaje: el equipo de recepción tiene tiempo para unas pocas llamadas, así que se priorizan los de mayor riesgo.

Los datos de salud son **sensibles**: en las tablas de análisis no van nombres ni documentos, sino identificadores. Los datos de contacto viven en un sistema aparte, al que solo accede el proceso que envía los recordatorios.

:::errores
- **Turnos que se superponen** al calcular la agenda libre: un turno que termina a las 10:00 y otro que empieza a las 10:00 no se pisan; uno que termina a las 10:05, sí. Los límites (`<` o `<=`) van en los tests.
- **Puntaje con información que no existe al momento de predecir** (por ejemplo, si el paciente vino o no): usa solo el historial anterior al turno.
- **Facturación que mezcla meses de atención y de pago**: el mismo dato da totales distintos según qué fecha uses. Defínelo en el modelo de dbt.
- **Enviar recordatorios dos veces** si el DAG se reintenta: registra qué mensajes se enviaron y no repitas.
- **Copiar datos personales de pacientes** a tablas de análisis "por si acaso".
:::

:::trabajo
- En salud, las leyes de protección de datos obligan a minimizar los datos personales, registrar quién accede y poder borrar los datos de un paciente si lo pide. Unity Catalog, Purview o Lake Formation se usan para enmascarar columnas y auditar accesos.
- Un puntaje basado en reglas claras (cantidad de ausencias previas, anticipación del turno) suele ser la primera versión; un modelo de machine learning llega después, y se compara contra esa regla.
:::

:::entrevista "¿Cómo evitarías que un proceso de envío de mensajes mande duplicados si se reintenta?"
Haciendo el envío idempotente: cada mensaje tiene un identificador derivado del turno y del tipo de recordatorio, y antes de enviar se consulta una tabla de envíos realizados; el envío y el registro se hacen juntos. Si la tarea se reintenta, los ya enviados se saltan. Además, el proveedor de mensajes suele aceptar una clave de idempotencia. Y separaría el cálculo de destinatarios (que se puede repetir sin problema) del envío.
:::
