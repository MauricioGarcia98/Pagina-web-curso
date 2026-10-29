---
titulo: Snapshots, comandos, selección y CI/CD
nivel: Experto
duracion: 50
resumen: Por qué las tablas de origen "olvidan", SCD2 con snapshots (YAML de dbt 1.9 y sintaxis clásica, estrategias timestamp y check, borrados), cómo consultar la historia, comandos, selección de nodos, state:modified y dbt en producción.
---

## El problema: las tablas de origen olvidan

La mayoría de los sistemas (la app de la tienda, un CRM, un ERP) guardan solo el **estado actual** de cada cosa. Si Sofía se muda de Barcelona a Santiago, el sistema **sobrescribe** la ciudad: la fila dice "Santiago" y "Barcelona" desaparece. Para la app está bien; para el análisis es un problema, porque preguntas como estas quedan sin respuesta:

- "¿Cuántas ventas hicimos en Barcelona el año pasado?" (las compras de Sofía hoy cuentan como de Santiago).
- "¿Cuánto tarda un pedido en pasar de `pendiente` a `entregado`?" (solo vemos el estado final).

La solución se llama **dimensión lentamente cambiante tipo 2** (*Slowly Changing Dimension*, SCD2): en lugar de sobrescribir, se guarda **una fila por cada versión**, con las fechas en que fue válida. dbt la construye por ti con los **snapshots**.

## Snapshots: historial automático (SCD tipo 2)

Un **snapshot** es una tabla que dbt mantiene así: en cada ejecución de `dbt snapshot` compara el origen con la última versión guardada y, si una fila cambió, **cierra** la versión vieja (le pone fecha en `dbt_valid_to`) y **agrega** la nueva (con `dbt_valid_to` vacío, que significa "vigente").

Desde dbt 1.9 se configuran en YAML (dentro de `snapshots/` o de `models/`):

```yaml norun
# snapshots/clientes_snapshot.yml
snapshots:
  - name: clientes_snapshot
    relation: source('tienda', 'clientes')   # qué tabla vigilar
    config:
      unique_key: cliente_id                 # qué identifica cada fila
      strategy: check                        # cómo detectar cambios
      check_cols: [ciudad, segmento]         # qué columnas comparar
      hard_deletes: invalidate               # qué hacer si una fila desaparece
```

Campo por campo:

- `relation`: la tabla de origen (un `source()` o un `ref()`). Si necesitas limpiarla antes, la documentación recomienda un modelo `ephemeral` o de staging y apuntar el snapshot a ese modelo.
- `unique_key`: la clave que dbt usa para emparejar la fila de hoy con la de ayer. **Tiene que ser única**: ponle un test `unique` en el origen.
- `strategy`: la forma de detectar un cambio. Hay dos:
  - `timestamp` (la recomendada por la documentación): el origen tiene una columna que dice cuándo se modificó la fila (`updated_at:`). Si ese valor es más nuevo que el guardado, la fila cambió. Es robusta frente a columnas nuevas.
  - `check`: no hay columna confiable de modificación, así que dbt compara los valores de las columnas que listas en `check_cols` (o `all`).
- `hard_deletes`: si una fila **desaparece** del origen. `ignore` (por defecto) no hace nada; `invalidate` cierra su versión vigente; `new_record` agrega una fila que marca el borrado.

En versiones anteriores a 1.9 (las verás en muchos proyectos) el snapshot se escribía en un archivo `.sql` con un bloque Jinja:

```sql norun
-- snapshots/clientes_snapshot.sql  (sintaxis clásica, dbt 1.8 o anterior)
{% snapshot clientes_snapshot %}
{{ config(
    target_schema='snapshots',
    unique_key='cliente_id',
    strategy='check',
    check_cols=['ciudad', 'segmento']
) }}
select * from {{ source('tienda', 'clientes') }}
{% endsnapshot %}
```

Además de tus columnas, dbt agrega cuatro **columnas de control**:

| Columna | Qué guarda |
|---|---|
| `dbt_valid_from` | Desde cuándo vale esta versión |
| `dbt_valid_to` | Hasta cuándo valió; `NULL` si es la vigente (se puede cambiar por una fecha lejana con `dbt_valid_to_current`) |
| `dbt_updated_at` | El valor de `updated_at` (o la hora de la ejecución, con `check`) |
| `dbt_scd_id` | Un identificador único de cada versión |

### Qué pasa en cada ejecución, paso a paso

**Día 1** (`dbt snapshot`, primera vez): copia todas las filas, cada una "vigente desde hoy, sin fin".

| cliente_id | ciudad | dbt_valid_from | dbt_valid_to |
|---|---|---|---|
| 7 | Barcelona | 2024-01-01 | `NULL` |

**Día 2**: en el origen, Sofía ahora dice Santiago. Al ejecutar `dbt snapshot`, dbt detecta que `ciudad` cambió (estrategia `check`), **cierra** la fila vieja y **agrega** una nueva:

| cliente_id | ciudad | dbt_valid_from | dbt_valid_to |
|---|---|---|---|
| 7 | Barcelona | 2024-01-01 | **2024-06-01** |
| 7 | Santiago | **2024-06-01** | `NULL` |

Ahora puedes responder "¿en qué ciudad vivía Sofía cuando hizo el pedido de marzo?" uniendo por cliente **y por rango de fechas**:

```sql norun
select p.pedido_id, p.fecha_pedido, s.ciudad
from {{ ref('stg_pedidos') }} p
join {{ ref('clientes_snapshot') }} s
  on s.cliente_id = p.cliente_id
 and p.fecha_pedido >= s.dbt_valid_from
 and (p.fecha_pedido < s.dbt_valid_to or s.dbt_valid_to is null)
```

La condición de fechas elige, para cada pedido, **la versión del cliente que estaba vigente ese día**. Y para "cómo están hoy" se filtra `where dbt_valid_to is null`.

### Pruébalo en la terminal

La terminal del curso ejecuta snapshots de verdad sobre la base de la tienda. Crea el YAML de arriba en `~/tienda_dbt/snapshots/clientes_snapshot.yml` (con `nano`) y luego:

```bash
cd tienda_dbt
dbt snapshot                                   # día 1: copia todo
sqlite3 tienda.db "UPDATE clientes SET ciudad = 'Santiago' WHERE cliente_id = 7"
sqlite3 tienda.db "DELETE FROM clientes WHERE cliente_id = 9"
dbt snapshot                                   # día 2: detecta 1 cambio y 1 borrado
sqlite3 tienda.db "SELECT cliente_id, ciudad, dbt_valid_from, dbt_valid_to FROM clientes_snapshot WHERE cliente_id IN (7, 9)"
```

Verás dos versiones del cliente 7 y la versión del cliente 9 cerrada por el borrado (porque pusimos `hard_deletes: invalidate`).

:::cuidado Los snapshots solo ven lo que existe cuando corren
Si un cliente cambia de ciudad dos veces entre una ejecución y la siguiente, el snapshot solo registra el estado final. Por eso los snapshots se programan con frecuencia (al menos diaria) y se ejecutan **antes** de los modelos que los usan.
:::

:::cuidado Un snapshot no se puede reconstruir
Un modelo se puede borrar y volver a crear con `dbt run`; un snapshot **no**, porque la historia ya no existe en el origen. La documentación recomienda ponerlos en un esquema aparte, con permisos más estrictos, para que nadie los borre por accidente.
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

:::ejercicio cli dificultad=Intermedio titulo="Tu primer snapshot"
El proyecto ya tiene `snapshots/clientes_snapshot.yml`. Ejecuta **solo los snapshots** para crear la primera versión del historial.
```respuesta
dbt snapshot
```
```setup
cd ~/tienda_dbt
mkdir -p snapshots
printf "snapshots:\n  - name: clientes_snapshot\n    relation: source('tienda', 'clientes')\n    config:\n      unique_key: cliente_id\n      strategy: check\n      check_cols: [ciudad, segmento]\n" > snapshots/clientes_snapshot.yml
```
:::

:::ejercicio quiz dificultad=Intermedio
La tabla de origen tiene una columna `actualizado_en` que el sistema actualiza en cada cambio. ¿Qué estrategia de snapshot conviene?

- [x] `timestamp` con `updated_at: actualizado_en`: es la recomendada y no hay que mantener la lista de columnas
- [ ] `check` con `check_cols: all`
- [ ] Ninguna, se usa un modelo incremental
- [ ] `append`
:::

:::ejercicio quiz dificultad=Avanzado
¿Qué condición elige la versión del cliente vigente el día del pedido?

- [ ] `p.fecha_pedido = s.dbt_valid_from`
- [x] `p.fecha_pedido >= s.dbt_valid_from and (p.fecha_pedido < s.dbt_valid_to or s.dbt_valid_to is null)`
- [ ] `s.dbt_valid_to is null`
- [ ] `p.fecha_pedido between s.dbt_valid_from and s.dbt_valid_to`
:::
