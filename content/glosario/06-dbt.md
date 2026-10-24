# area: dbt

## dbt
alias: data build tool, dbt-core
nino: Imagina que en una cocina cada cocinero escribe sus recetas en papelitos sueltos y nadie sabe qué receta usa qué ingrediente. dbt es un **recetario ordenado**: cada receta (consulta SQL) está en su archivo, dice de qué otras recetas depende, se prueba antes de servir y tiene su explicación.
que: Una herramienta para la **T de ELT**: escribes transformaciones como archivos `SELECT` (modelos), dbt resuelve las dependencias entre ellos con `ref()`, los crea en el warehouse en el orden correcto (como vistas o tablas), ejecuta **pruebas** sobre los datos y genera **documentación y linaje**. Todo vive en Git, con revisión de código y CI, como el software.
ejemplo:
```text
models/
  staging/stg_pedidos.sql      -- limpia la tabla cruda
  marts/fct_ventas_diarias.sql -- select ... from {{ ref('stg_pedidos') }}
$ dbt build                    -- crea todo en orden y corre las pruebas
```
para: Transformar datos dentro del warehouse (Snowflake, BigQuery, Redshift, Databricks, DuckDB, Postgres) con ingeniería de software: versiones, pruebas, documentación, entornos.
cuidado: dbt no mueve datos entre sistemas (no es ingesta) ni programa ejecuciones por sí solo: eso lo hacen otras herramientas (Airbyte/Fivetran y Airflow, o dbt Cloud).
ver: ELT, Modelo dbt, ref(), Pruebas de dbt, Linaje

## Modelo dbt
alias: modelo, models
nino: Un modelo es **una receta**: un archivo que dice "toma estos ingredientes y prepáralos así". El resultado (la comida) es una tabla o vista que otros pueden usar.
que: Un archivo `.sql` en `models/` que contiene **un único `SELECT`**. dbt lo envuelve en el DDL necesario (`CREATE VIEW … AS` o `CREATE TABLE … AS`) según su materialización. El nombre del archivo es el nombre del objeto en el warehouse.
ejemplo:
```sql
-- models/marts/fct_ventas_diarias.sql
select fecha, ciudad, count(*) as pedidos, sum(total) as ventas
from {{ ref('stg_pedidos') }}
where estado = 'entregado'
group by 1, 2
```
para: Que cada transformación sea pequeña, legible, versionada y reutilizable.
cuidado: No escribas `CREATE TABLE` ni `INSERT` en un modelo: solo el `SELECT`.
ver: dbt, Materialización, ref()

## ref()
alias: ref, {{ ref() }}
nino: Es como decir "**usa la salsa que preparó la receta número 3**" en vez de escribir dónde está guardada la salsa. Así el chef sabe que primero hay que hacer la receta 3.
que: Función de Jinja con la que un modelo hace referencia a otro: `{{ ref('stg_pedidos') }}`. dbt la reemplaza por el nombre completo del objeto en el entorno actual (`analytics_dev.stg_pedidos` o `analytics.stg_pedidos`) y la usa para construir el **grafo de dependencias** (DAG): qué se construye primero y el linaje.
ejemplo: `from {{ ref('stg_pedidos') }}` se compila como `from "analytics"."staging"."stg_pedidos"`.
para: Orden de ejecución automático, entornos separados (dev/prod) sin cambiar código y linaje.
cuidado: Si escribes el nombre de la tabla a mano en lugar de `ref`, dbt no sabe de la dependencia: puede construir en el orden equivocado y el linaje queda incompleto.
ver: source(), Modelo dbt, DAG, Linaje

## source()
alias: source, sources
nino: Los ingredientes que **llegan del mercado** (no los preparó ninguna receta) se anotan en una lista de proveedores. `source()` es decir "uso los tomates del proveedor X de esa lista".
que: Función que referencia **tablas crudas** cargadas por la ingesta (no creadas por dbt). Se declaran en un YAML (`sources:`) con su base y esquema, y pueden tener pruebas y **frescura** (`freshness`: alerta si los datos no se actualizaron).
ejemplo:
```yaml
sources:
  - name: app
    schema: raw
    tables:
      - name: pedidos
        loaded_at_field: _cargado_en
        freshness: {warn_after: {count: 6, period: hour}}
```
`select * from {{ source('app', 'pedidos') }}`
para: Marcar dónde empieza el linaje y vigilar que la ingesta siga llegando.
ver: ref(), Staging, Ingesta

## Materialización
alias: materialized, materializaciones
nino: Es decidir si una receta **se cocina y se guarda en la heladera** (tabla: rápida de servir, pero hay que recocinarla para actualizarla) o **se cocina cada vez que alguien la pide** (vista: siempre fresca, pero tarda en servirse).
que: Cómo dbt construye un modelo en el warehouse: **view** (por defecto; no guarda datos), **table** (recrea la tabla entera en cada ejecución), **incremental** (solo agrega o actualiza las filas nuevas), **ephemeral** (no crea objeto; se inserta como CTE en quien lo usa) y **materialized view** en algunos motores.
ejemplo: `{{ config(materialized='table') }}` al principio del modelo, o por carpeta en `dbt_project.yml`: `marts: +materialized: table`.
para: Equilibrar costo de construcción, velocidad de consulta y frescura.
cuidado: Staging suele ser `view`; marts consultados por BI, `table`; hechos enormes, `incremental`.
ver: Incremental, Vista, Modelo dbt

## Incremental
alias: modelo incremental, carga incremental, is_incremental
nino: En vez de **volver a copiar todo el cuaderno** cada día, solo **copias las páginas nuevas** y las pegas al final.
que: Procesar y escribir **solo los datos nuevos o cambiados** desde la última ejecución, en lugar de recalcular todo. En dbt, `materialized='incremental'` con un filtro dentro de `{% if is_incremental() %}` y, opcionalmente, `unique_key` para hacer MERGE (upsert). Fuera de dbt, se logra con marcas de agua de tiempo, CDC o Auto Loader.
ejemplo:
```sql
{{ config(materialized='incremental', unique_key='pedido_id') }}
select * from {{ ref('stg_pedidos') }}
{% if is_incremental() %}
  where actualizado_en > (select max(actualizado_en) from {{ this }})
{% endif %}
```
para: Tablas enormes en las que reconstruir todo cada día es demasiado lento o caro.
cuidado: Los datos tardíos pueden quedar afuera si el filtro es estricto: usa una ventana de reproceso (por ejemplo, los últimos 3 días). Ante un cambio de lógica, reconstruye con `dbt run --full-refresh`.
ver: Materialización, MERGE, Idempotencia, CDC

## Snapshot (dbt)
alias: dbt snapshot, snapshot, snapshots
nino: Es **sacarle una foto a la libreta de direcciones todos los días**: si alguien se muda, la foto vieja guarda su dirección anterior y la nueva guarda la nueva. Así puedes saber dónde vivía cada uno en cualquier fecha.
que: La forma en que dbt implementa una **SCD tipo 2**: compara la tabla de origen con la versión guardada y, cuando una fila cambió, cierra la versión vieja (`dbt_valid_to`) y crea una nueva (`dbt_valid_from`). Estrategias: `timestamp` (usa una columna de actualización) o `check` (compara columnas).
ejemplo:
```sql
{% snapshot clientes_snapshot %}
{{ config(target_schema='snapshots', unique_key='cliente_id',
          strategy='timestamp', updated_at='actualizado_en') }}
select * from {{ source('app', 'clientes') }}
{% endsnapshot %}
```
para: Guardar historia de tablas del sistema de origen que solo tienen el valor actual.
cuidado: El snapshot solo ve los cambios que existen cuando se ejecuta: si corre una vez por día, dos cambios en el mismo día se ven como uno.
ver: SCD, Snapshot periódico, Dimensión

## Seed
alias: seeds, dbt seed
nino: Es una **lista chiquita escrita a mano** (como la lista de los días feriados) que guardas junto a tus recetas para usarla cuando la necesites.
que: Un archivo CSV en `seeds/` que `dbt seed` carga como tabla. Se usa para datos de referencia pequeños y estables que no vienen de ningún sistema: mapeos de códigos, feriados, metas.
ejemplo: `seeds/mapa_canales.csv` con `codigo,canal` → `{{ ref('mapa_canales') }}` en un modelo.
para: Versionar en Git tablas de referencia chicas.
cuidado: No es una herramienta de ingesta: no cargues datos grandes ni que cambian seguido con seeds.
ver: dbt, CSV

## Pruebas de dbt
alias: tests de dbt, dbt test, data tests
nino: Antes de servir la comida, el chef **la prueba**: ¿tiene sal?, ¿está caliente?, ¿no le falta nada? Las pruebas de dbt revisan que los datos estén bien antes de que alguien los use.
que: Consultas que buscan filas que violan una regla; si devuelven filas, la prueba falla. **Genéricas** (en YAML): `unique`, `not_null`, `accepted_values`, `relationships`, y muchas más con paquetes como `dbt_utils` o `dbt_expectations`. **Singulares**: un `.sql` propio en `tests/`. `dbt build` corre los modelos y sus pruebas en orden y se detiene si algo falla.
ejemplo:
```yaml
models:
  - name: fct_pedidos
    columns:
      - name: pedido_id
        tests: [unique, not_null]
      - name: estado
        tests:
          - accepted_values: {values: [creado, pagado, entregado, cancelado]}
```
para: Detectar datos rotos antes de que lleguen a un tablero.
cuidado: Configura `severity: warn` para lo que no debe frenar todo, y no pruebes de más: cada prueba es una consulta que cuesta.
ver: Calidad de datos, Clave primaria, dbt

## Macro
alias: macros
nino: Es una **receta para hacer recetas**: en vez de escribir lo mismo diez veces, escribes una vez "cómo hacer una salsa" y la usas donde quieras.
que: Una función de Jinja reutilizable (en `macros/`) que genera SQL. Se llama con `{{ nombre(argumentos) }}`. Los paquetes (`dbt_utils`) son colecciones de macros.
ejemplo:
```sql
{% macro centavos_a_pesos(col) %} round({{ col }} / 100.0, 2) {% endmacro %}
-- uso:
select {{ centavos_a_pesos('monto_centavos') }} as monto from ...
```
para: No repetir lógica y adaptar SQL a distintos motores.
cuidado: Abusar de macros convierte el SQL en algo que nadie puede leer. Revisa el resultado con `dbt compile`.
ver: Jinja, Función

## Jinja
alias: jinja2, {{ }}, {% %}
nino: Jinja es como un **formulario con espacios en blanco**: "Hola, ___". El programa rellena los espacios antes de que se use el texto.
que: Un lenguaje de plantillas (de Python) que dbt usa para generar SQL: `{{ expresión }}` inserta un valor y `{% instrucción %}` controla la lógica (`if`, `for`, `set`, `macro`). Se compila a SQL puro antes de enviarlo al warehouse. Airflow también lo usa en campos de operadores (`{{ ds }}`).
ejemplo:
```sql
select
{% for m in ['tarjeta', 'efectivo', 'yape'] %}
  sum(case when metodo = '{{ m }}' then total end) as total_{{ m }}{{ "," if not loop.last }}
{% endfor %}
from {{ ref('stg_pagos') }}
```
para: SQL dinámico: pivotear columnas, cambiar por entorno, reutilizar.
ver: Macro, ref()

## Staging
alias: stg, capa staging
nino: Es el **lugar donde lavas y cortas las verduras** antes de cocinar: todavía no es la comida, pero todo queda limpio y ordenado para usar.
que: La primera capa de modelos (`stg_*`), con **un modelo por tabla de origen**: renombra columnas a un estándar, convierte tipos, limpia valores (trim, minúsculas), deduplica y no combina tablas ni aplica reglas de negocio. Encima van los modelos intermedios y los marts.
ejemplo:
```sql
-- stg_pedidos.sql
select id as pedido_id, cast(fecha as date) as fecha, lower(trim(estado)) as estado,
       monto_centavos / 100.0 as total
from {{ source('app', 'pedidos') }}
```
para: Que todo lo de arriba trabaje con datos limpios y uniformes, y que si cambia el origen se corrija en un solo lugar.
ver: Mart, source(), Arquitectura medallón

## Mart
alias: data mart, marts
nino: Es la **vitrina de la panadería**: los productos ya terminados, ordenados por tipo, listos para que el cliente (el analista o el tablero) los tome.
que: Las tablas finales orientadas a un área de negocio o un uso (ventas, marketing, finanzas): hechos y dimensiones (`fct_`, `dim_`) o tablas anchas listas para BI. Son las que consultan los tableros y los analistas.
ejemplo: `marts/finanzas/fct_ingresos_mensuales`, `marts/marketing/dim_clientes`.
para: Dar a cada equipo datos confiables, documentados y fáciles de consultar.
ver: Staging, Tabla de hechos, Dimensión, OBT

## profiles.yml
alias: profiles, perfil de dbt, target
nino: Es la **tarjeta con la dirección y la llave de la cocina** donde vas a cocinar: dice a qué warehouse conectarse y con qué usuario.
que: El archivo (por defecto en `~/.dbt/`) con las **conexiones** de dbt: tipo de motor, servidor, base, esquema, credenciales y los **targets** (dev, prod). `dbt run --target prod` elige uno. No se sube a Git: las contraseñas se leen con `{{ env_var('DBT_PASSWORD') }}`.
ejemplo:
```yaml
curso:
  target: dev
  outputs:
    dev:  {type: duckdb, path: dev.duckdb, schema: dbt_ana}
    prod: {type: postgres, host: db.empresa.com, user: dbt, password: "{{ env_var('DBT_PASSWORD') }}",
           dbname: analytics, schema: analytics, port: 5432, threads: 8}
```
para: Correr el mismo proyecto en tu esquema de desarrollo y en producción.
cuidado: Nunca escribas la contraseña directamente en el archivo.
ver: Variable de entorno, Secreto
