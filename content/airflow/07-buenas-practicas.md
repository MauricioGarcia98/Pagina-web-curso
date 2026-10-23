---
titulo: Buenas prácticas, Variables, Connections y CLI
nivel: Avanzado
duracion: 30
resumen: Idempotencia, código top-level, secretos, Variables y Connections, pruebas de DAGs y la CLI de Airflow.
---

## Las reglas de oro

1. **Idempotencia**: ejecutar una tarea dos veces para el mismo intervalo produce el mismo resultado. Usa `{{ ds }}`, sobrescribe particiones, usa `MERGE`.
2. **Atomicidad**: cada tarea hace **una cosa** y la hace completa (o falla sin dejar basura).
3. **Airflow orquesta, no procesa**: el trabajo pesado va a Spark/Databricks, dbt o el warehouse. No cargues 5 GB en un `PythonOperator`.
4. **Nada pesado en el nivel superior del archivo**: el scheduler **re-parsea** los archivos de DAG cada pocos segundos. Consultas a bases, llamadas a APIs o imports enormes fuera de las funciones vuelven lento todo Airflow.
5. **Fechas fijas** de `start_date` y `catchup=False` salvo que realmente quieras rellenar el pasado.
6. **Secretos en Connections / un backend de secretos** (Azure Key Vault, AWS Secrets Manager), nunca en el código.

```python norun
# ❌ Malo: se ejecuta cada vez que el scheduler lee el archivo
clientes = requests.get("https://api/clientes").json()

# ✅ Bien: se ejecuta solo cuando corre la tarea
@task
def traer_clientes():
    return requests.get("https://api/clientes", timeout=30).json()
```

## Variables y Connections

- **Variables**: configuraciones clave-valor (`Variable.get("bucket_destino")` o `{{ var.value.bucket_destino }}` en plantillas).
- **Connections**: credenciales y datos de conexión a sistemas externos (Databricks, Azure, Postgres…), identificadas por un `conn_id` que usan los operadores (`databricks_conn_id="databricks_default"`).

Se crean desde la UI, la CLI o variables de entorno (`AIRFLOW_CONN_MI_DB=postgresql://...`).

## Probar DAGs

```python norun
# tests/test_dags.py — se corre en CI con pytest
from airflow.models import DagBag

def test_sin_errores_de_importacion():
    bag = DagBag(dag_folder="dags/", include_examples=False)
    assert bag.import_errors == {}

def test_etl_ventas_tiene_reintentos():
    dag = DagBag().get_dag("etl_ventas")
    for t in dag.tasks:
        assert t.retries >= 1
```

## La CLI de Airflow

| Comando | Qué hace |
|---|---|
| `airflow dags list` | Lista los DAGs |
| `airflow dags list-import-errors` | Muestra errores al leer archivos de DAG |
| `airflow dags trigger etl_ventas` | Dispara una ejecución manual |
| `airflow dags trigger etl_ventas --conf '{"pais": "Chile"}'` | …con parámetros |
| `airflow dags pause etl_ventas` / `unpause` | Pausa / reactiva |
| `airflow dags test etl_ventas 2024-03-15` | Ejecuta el DAG completo localmente para esa fecha |
| `airflow tasks test etl_ventas extraer 2024-03-15` | Ejecuta **una tarea** sin registrar estado |
| `airflow tasks clear etl_ventas -s 2024-03-01 -e 2024-03-05` | Limpia estados para reejecutar |
| `airflow dags backfill -s ... -e ... etl_ventas` | Rellena un rango de fechas |
| `airflow variables set entorno prod` | Crea/actualiza una variable |
| `airflow connections add ...` | Crea una conexión |

## Ejercicios

:::ejercicio cli
Lista los DAGs que tienen **errores de importación**.
```respuesta
airflow dags list-import-errors
```
:::

:::ejercicio cli
Prueba **solo la tarea** `transformar` del DAG `etl_ventas` para la fecha `2024-03-15`.
```respuesta
airflow tasks test etl_ventas transformar 2024-03-15
```
:::

:::ejercicio cli
Dispara manualmente el DAG `etl_ventas` pasando la configuración `{"pais": "Chile"}`.
```respuesta
airflow dags trigger etl_ventas (--conf|-c) ['"]?\{"pais": ?"Chile"\}['"]?
airflow dags trigger (--conf|-c) ['"]?\{"pais": ?"Chile"\}['"]? etl_ventas
```
```solucion
airflow dags trigger etl_ventas --conf '{"pais": "Chile"}'
```
:::

:::ejercicio cli
Pausa el DAG `reporte_mensual`.
```respuesta
airflow dags pause reporte_mensual
```
:::

:::ejercicio quiz
Tu archivo de DAG hace una consulta a la base de datos de producción en el nivel superior del archivo (fuera de cualquier función). ¿Cuál es el problema?

- [ ] Ninguno
- [x] El scheduler re-parsea el archivo constantemente: la consulta se ejecuta cada pocos segundos y ralentiza todo
- [ ] La consulta nunca se ejecuta
- [ ] Airflow no permite consultas
:::

:::ejercicio quiz
¿Dónde deberían estar las credenciales de Databricks que usa un DAG?

- [ ] En el código del DAG
- [ ] En un XCom
- [x] En una Connection de Airflow (idealmente respaldada por un gestor de secretos como Key Vault)
- [ ] En una variable global de Python
:::
