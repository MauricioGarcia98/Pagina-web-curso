---
titulo: Snapshots, comandos, selección y CI/CD
nivel: Experto
duracion: 35
resumen: SCD2 con snapshots, dbt build, sintaxis de selección, state:modified, dbt + Databricks + Airflow.
---

## Snapshots: historial automático (SCD tipo 2)

Un **snapshot** guarda cómo cambia una tabla en el tiempo. En cada `dbt snapshot`, dbt compara con la versión anterior y, si una fila cambió, **cierra** la versión vieja (`dbt_valid_to`) y **agrega** la nueva.

```sql norun
-- snapshots/clientes_snapshot.sql
{% snapshot clientes_snapshot %}
{{ config(
    target_schema='snapshots',
    unique_key='cliente_id',
    strategy='check',
    check_cols=['ciudad', 'segmento', 'email']
) }}
select * from {{ source('tienda', 'clientes') }}
{% endsnapshot %}
```

Estrategias: `timestamp` (usa una columna `updated_at`) o `check` (compara columnas). En versiones nuevas también se pueden definir en YAML.

### Qué pasa en cada ejecución, paso a paso

La tabla `clientes` del sistema de origen solo guarda **el estado actual**: si Sofía se muda de Lima a Santiago, la fila se sobrescribe y la ciudad anterior se pierde. El snapshot conserva la historia:

**Día 1** (`dbt snapshot`, primera vez): copia todas las filas, cada una "vigente desde hoy, sin fin".

| cliente_id | ciudad | dbt_valid_from | dbt_valid_to |
|---|---|---|---|
| 7 | Lima | 2024-01-01 | `NULL` |

**Día 2**: en el origen, Sofía ahora dice Santiago. Al ejecutar `dbt snapshot`, dbt detecta que `ciudad` cambió (estrategia `check`), **cierra** la fila vieja y **agrega** una nueva:

| cliente_id | ciudad | dbt_valid_from | dbt_valid_to |
|---|---|---|---|
| 7 | Lima | 2024-01-01 | **2024-06-01** |
| 7 | Santiago | **2024-06-01** | `NULL` |

Ahora puedes responder "¿en qué ciudad vivía Sofía cuando hizo el pedido de marzo?" uniendo por cliente y por rango de fechas (`fecha_pedido >= dbt_valid_from AND (fecha_pedido < dbt_valid_to OR dbt_valid_to IS NULL)`). Es exactamente la **dimensión lentamente cambiante tipo 2** (SCD2) de la lección de modelado de SQL, sin escribir la lógica a mano.

:::cuidado Los snapshots solo ven lo que existe cuando corren
Si un cliente cambia de ciudad dos veces entre una ejecución y la siguiente, el snapshot solo registra el estado final. Por eso los snapshots se programan con frecuencia (al menos diaria) y se ejecutan **antes** de los modelos que los usan.
:::

## Comandos esenciales

| Comando | Qué hace |
|---|---|
| `dbt run` | Construye los modelos |
| `dbt test` | Ejecuta los tests |
| `dbt build` | **run + test + seed + snapshot** en orden del DAG (si un modelo falla sus tests, no se construye lo que depende de él) |
| `dbt seed` | Carga los CSV de `seeds/` |
| `dbt snapshot` | Ejecuta los snapshots |
| `dbt compile` | Genera el SQL compilado sin ejecutarlo (`target/compiled/`) |
| `dbt docs generate` / `serve` | Documentación |
| `dbt deps` | Instala paquetes |
| `dbt source freshness` | Verifica la frescura de las fuentes |
| `dbt ls -s ...` | Lista qué nodos seleccionaría |

## Selección de nodos (-s / --select)

| Sintaxis | Selecciona |
|---|---|
| `-s fct_ventas` | Solo ese modelo |
| `-s +fct_ventas` | El modelo y **todo lo que necesita** (ancestros) |
| `-s fct_ventas+` | El modelo y **todo lo que depende** de él (descendientes) |
| `-s +fct_ventas+` | Ambos |
| `-s staging` / `-s path:models/staging` | Una carpeta |
| `-s tag:diario` | Modelos con un tag |
| `-s state:modified+` | Lo modificado respecto a producción y sus dependientes (**Slim CI**) |
| `--exclude ...` | Excluir |

## dbt en producción

- **CI** (en cada Pull Request): `dbt build -s state:modified+ --defer --state ./prod-manifest` construye solo lo que cambió, en un esquema temporal, reutilizando producción para el resto.
- **CD / producción**: un job programado (dbt Cloud, **Lakeflow Jobs** (antes Databricks Workflows) con una tarea de tipo dbt, o **Airflow** con `BashOperator` / Cosmos) ejecuta `dbt build --target prod`.
- **Databricks**: el adaptador `dbt-databricks` usa un SQL Warehouse o un cluster; los modelos son tablas Delta en Unity Catalog.

## Ejercicios

:::ejercicio cli
Construye y prueba **todo** el proyecto en el orden correcto (modelos, tests, seeds y snapshots) con un solo comando.
```respuesta
dbt build
```
```setup
cd ~/tienda_dbt
mkdir -p models/marts seeds
printf "select cliente_id, nombre, apellido, pais, segmento\nfrom {{ source('tienda', 'clientes') }}\n" > models/marts/dim_clientes.sql
printf "select * from {{ ref('stg_ventas') }}\n" > models/marts/fct_ventas.sql
printf "{{ config(materialized='incremental') }}\nselect pedido_id, cliente_id, fecha_pedido, estado\nfrom {{ source('tienda', 'pedidos') }}\n" > models/marts/fct_eventos.sql
printf "version: 2\nmodels:\n  - name: dim_clientes\n    columns:\n      - name: cliente_id\n        data_tests: [unique, not_null]\n" > models/marts/_dim_clientes.yml
printf "pais,region\nChile,Cono Sur\nPerú,Andina\n" > seeds/regiones.csv
```
:::

:::ejercicio cli
Ejecuta **solo** el modelo `fct_ventas` y **todos sus ancestros**.
```respuesta
dbt run (-s|--select) \+fct_ventas
dbt build (-s|--select) \+fct_ventas
```
```solucion
dbt run -s +fct_ventas
```
```setup
cd ~/tienda_dbt
mkdir -p models/marts seeds
printf "select cliente_id, nombre, apellido, pais, segmento\nfrom {{ source('tienda', 'clientes') }}\n" > models/marts/dim_clientes.sql
printf "select * from {{ ref('stg_ventas') }}\n" > models/marts/fct_ventas.sql
printf "{{ config(materialized='incremental') }}\nselect pedido_id, cliente_id, fecha_pedido, estado\nfrom {{ source('tienda', 'pedidos') }}\n" > models/marts/fct_eventos.sql
printf "version: 2\nmodels:\n  - name: dim_clientes\n    columns:\n      - name: cliente_id\n        data_tests: [unique, not_null]\n" > models/marts/_dim_clientes.yml
printf "pais,region\nChile,Cono Sur\nPerú,Andina\n" > seeds/regiones.csv
```
:::

:::ejercicio cli
Ejecuta los **tests** solo del modelo `dim_clientes`.
```respuesta
dbt test (-s|--select) dim_clientes
```
```solucion
dbt test -s dim_clientes
```
```setup
cd ~/tienda_dbt
mkdir -p models/marts seeds
printf "select cliente_id, nombre, apellido, pais, segmento\nfrom {{ source('tienda', 'clientes') }}\n" > models/marts/dim_clientes.sql
printf "select * from {{ ref('stg_ventas') }}\n" > models/marts/fct_ventas.sql
printf "{{ config(materialized='incremental') }}\nselect pedido_id, cliente_id, fecha_pedido, estado\nfrom {{ source('tienda', 'pedidos') }}\n" > models/marts/fct_eventos.sql
printf "version: 2\nmodels:\n  - name: dim_clientes\n    columns:\n      - name: cliente_id\n        data_tests: [unique, not_null]\n" > models/marts/_dim_clientes.yml
printf "pais,region\nChile,Cono Sur\nPerú,Andina\n" > seeds/regiones.csv
dbt run -s dim_clientes > /dev/null
```
:::

:::ejercicio cli
Reconstruye desde cero el modelo incremental `fct_eventos` (ignorando lo ya cargado).
```respuesta
dbt run (-s|--select) fct_eventos --full-refresh
dbt run --full-refresh (-s|--select) fct_eventos
dbt build (-s|--select) fct_eventos --full-refresh
```
```solucion
dbt run -s fct_eventos --full-refresh
```
```setup
cd ~/tienda_dbt
mkdir -p models/marts seeds
printf "select cliente_id, nombre, apellido, pais, segmento\nfrom {{ source('tienda', 'clientes') }}\n" > models/marts/dim_clientes.sql
printf "select * from {{ ref('stg_ventas') }}\n" > models/marts/fct_ventas.sql
printf "{{ config(materialized='incremental') }}\nselect pedido_id, cliente_id, fecha_pedido, estado\nfrom {{ source('tienda', 'pedidos') }}\n" > models/marts/fct_eventos.sql
printf "version: 2\nmodels:\n  - name: dim_clientes\n    columns:\n      - name: cliente_id\n        data_tests: [unique, not_null]\n" > models/marts/_dim_clientes.yml
printf "pais,region\nChile,Cono Sur\nPerú,Andina\n" > seeds/regiones.csv
```
:::

:::ejercicio cli
En el CI de un Pull Request, construye y prueba solo los modelos **modificados y sus dependientes**, comparando con el estado de producción guardado en `./prod`.
```respuesta
dbt build (-s|--select) state:modified\+ --state \.?/?prod/?( --defer)?
dbt build --state \.?/?prod/? (-s|--select) state:modified\+( --defer)?
dbt build (-s|--select) state:modified\+ --defer --state \.?/?prod/?
```
```solucion
dbt build -s state:modified+ --state ./prod
```
```setup
cd ~/tienda_dbt
mkdir -p models/marts seeds
printf "select cliente_id, nombre, apellido, pais, segmento\nfrom {{ source('tienda', 'clientes') }}\n" > models/marts/dim_clientes.sql
printf "select * from {{ ref('stg_ventas') }}\n" > models/marts/fct_ventas.sql
printf "{{ config(materialized='incremental') }}\nselect pedido_id, cliente_id, fecha_pedido, estado\nfrom {{ source('tienda', 'pedidos') }}\n" > models/marts/fct_eventos.sql
printf "version: 2\nmodels:\n  - name: dim_clientes\n    columns:\n      - name: cliente_id\n        data_tests: [unique, not_null]\n" > models/marts/_dim_clientes.yml
printf "pais,region\nChile,Cono Sur\nPerú,Andina\n" > seeds/regiones.csv
```
:::

:::ejercicio cli
Carga los archivos CSV de la carpeta `seeds/`.
```respuesta
dbt seed
```
```setup
cd ~/tienda_dbt
mkdir -p models/marts seeds
printf "select cliente_id, nombre, apellido, pais, segmento\nfrom {{ source('tienda', 'clientes') }}\n" > models/marts/dim_clientes.sql
printf "select * from {{ ref('stg_ventas') }}\n" > models/marts/fct_ventas.sql
printf "{{ config(materialized='incremental') }}\nselect pedido_id, cliente_id, fecha_pedido, estado\nfrom {{ source('tienda', 'pedidos') }}\n" > models/marts/fct_eventos.sql
printf "version: 2\nmodels:\n  - name: dim_clientes\n    columns:\n      - name: cliente_id\n        data_tests: [unique, not_null]\n" > models/marts/_dim_clientes.yml
printf "pais,region\nChile,Cono Sur\nPerú,Andina\n" > seeds/regiones.csv
```
:::
