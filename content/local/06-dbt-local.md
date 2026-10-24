---
titulo: "dbt en tu máquina con DuckDB"
nivel: Intermedio
duracion: 60
resumen: Arma un proyecto de dbt real en tu computadora sin nube ni servidor, usando DuckDB como warehouse. Instalación con uv, profiles.yml, fuentes que leen CSV, modelos staging y marts, pruebas, documentación y los comandos del día a día, con el mismo flujo que usarías con Snowflake, BigQuery o Databricks.
objetivos: Instalar dbt con el adaptador de DuckDB en un entorno de uv | Configurar profiles.yml y explicar qué separa del dbt_project.yml | Declarar fuentes y escribir modelos staging y marts con source() y ref() | Agregar pruebas y documentación en schema.yml y ejecutarlas | Usar dbt run, test, build, compile y docs con selección de modelos
prerrequisitos: local-postgres-duckdb | dbt-modelos-ref
autoevaluacion: ¿Sabes instalar dbt-duckdb y comprobarlo con dbt debug? | ¿Sabes qué va en profiles.yml y por qué no va en el repositorio? | ¿Puedes declarar una fuente y usarla con source()? | ¿Sabes correr solo un modelo y todo lo que depende de él? | ¿Sabes ver el SQL compilado de un modelo?
---

:::escenario El warehouse en tu laptop
El equipo de Rápido modela todo en dbt sobre BigQuery. Para tu primera tarea (un modelo nuevo de tiempos de entrega), tu líder te propone:

> "Desarrolla en tu máquina con dbt-duckdb y los CSV de muestra. Es el mismo dbt: cuando funcione, el pull request corre contra BigQuery en la CI. Así no gastas ni esperas a la nube mientras iteras."
:::

## Cómo se arma dbt en tu máquina

```diagrama
titulo: dbt local: el mismo proyecto, otro adaptador
nodo csv: CSV de muestra | icono=csv | col=0 | fila=0 | color=gris | sub=data/delivery_pedidos.csv
nodo proj: Proyecto dbt | icono=codigo | col=1 | fila=0 | color=naranja | sub=models/, tests,\ndbt_project.yml
nodo prof: ~/.dbt/profiles.yml | icono=llave | col=1 | fila=1 | color=amarillo | sub=dónde conectarse\n(fuera del repo)
nodo duck: rapido.duckdb | icono=base | col=2 | fila=0 | color=azul | sub=target dev
nodo bq: BigQuery | icono=nube | col=2 | fila=1 | color=cian | sub=target prod (CI)
flecha csv -> proj: source()
flecha proj -> duck: dbt build --target dev
flecha prof -> proj | estilo=punteada
flecha proj -> bq: dbt build --target prod | estilo=punteada
```

El **código** del proyecto (modelos, pruebas, `dbt_project.yml`) es igual para todos y va a Git. **Dónde** se ejecuta lo dice el `profiles.yml`, que es personal (tiene credenciales) y vive en `~/.dbt/`, fuera del repositorio. Cambiar de DuckDB a BigQuery es cambiar de *target*, no de código.

## 1. Instalar

```bash norun
uv init rapido-dbt && cd rapido-dbt
uv add dbt-duckdb              # trae dbt-core y el adaptador de DuckDB
uv run dbt --version
```

(Con pip clásico: `pip install dbt-duckdb` dentro de un entorno virtual.) Para trabajar sin escribir `uv run` cada vez, activa el entorno: `source .venv/bin/activate`.

## 2. Crear el proyecto y el perfil

```bash norun
dbt init rapido_dbt            # pregunta el adaptador: elige duckdb
cd rapido_dbt
```

El perfil (`~/.dbt/profiles.yml`):

```yaml
rapido_dbt:                    # el mismo nombre que "profile:" en dbt_project.yml
  target: dev
  outputs:
    dev:
      type: duckdb
      path: rapido.duckdb      # el archivo de la base, en la carpeta del proyecto
      threads: 4
    prod:
      type: bigquery           # lo que usa la CI (con su propia autenticación)
      method: oauth
      project: rapido-datos-prod
      dataset: analytics
      threads: 8
```

```bash norun
dbt debug                      # comprueba el proyecto, el perfil y la conexión
```

## 3. Fuentes: los CSV como tablas

Copia los datos de muestra a `data/` y decláralos como **fuentes**. Con dbt-duckdb, una fuente puede apuntar directo a un archivo con `external_location`:

```yaml
# models/staging/sources.yml
version: 2

sources:
  - name: app
    meta:
      external_location: "data/{name}.csv"     # {name} = el nombre de la tabla
    tables:
      - name: delivery_pedidos
      - name: delivery_restaurantes
```

## 4. Modelos: staging y marts

```sql norun
-- models/staging/stg_rapido_pedidos.sql
{{ config(materialized='view') }}

select
    pedido_id,
    restaurante_id,
    ciudad,
    cast(creado as timestamp)    as creado,
    cast(entregado as timestamp) as entregado,
    estado,
    subtotal
from {{ source('app', 'delivery_pedidos') }}
```

```sql norun
-- models/marts/mart_tiempos_ciudad.sql
{{ config(materialized='table') }}

select
    ciudad,
    count(*)                                                   as entregados,
    round(avg(date_diff('minute', creado, entregado)), 1)      as min_promedio
from {{ ref('stg_rapido_pedidos') }}
where estado = 'entregado'
group by ciudad
```

- `source('app', 'delivery_pedidos')` → la fuente declarada en el YAML.
- `ref('stg_rapido_pedidos')` → otro modelo. Con los `ref`, dbt arma el **grafo** y sabe que primero va staging y después el mart.

## 5. Pruebas y documentación

```yaml
# models/marts/schema.yml
version: 2

models:
  - name: mart_tiempos_ciudad
    description: "Tiempo promedio de entrega por ciudad (solo pedidos entregados)."
    columns:
      - name: ciudad
        description: "Ciudad del pedido."
        tests: [unique, not_null]
      - name: min_promedio
        tests: [not_null]
```

## 6. Los comandos del día a día

| Comando | Qué hace |
|---|---|
| `dbt run` | Construye todos los modelos |
| `dbt run -s stg_rapido_pedidos` | Solo ese modelo |
| `dbt run -s stg_rapido_pedidos+` | Ese modelo y todo lo que depende de él |
| `dbt run -s +mart_tiempos_ciudad` | Ese modelo y todo lo que necesita |
| `dbt test` | Corre las pruebas |
| `dbt build` | `run` + `test` (+ seeds y snapshots) en orden: si un modelo falla sus pruebas, no se construye lo que sigue |
| `dbt compile -s mart_tiempos_ciudad` | Genera el SQL final (en `target/compiled/…`) sin ejecutarlo |
| `dbt docs generate && dbt docs serve` | Documentación navegable con el linaje, en `localhost:8080` |
| `dbt seed` | Carga los CSV de `seeds/` como tablas (para tablas chicas de referencia) |

Y para mirar el resultado, DuckDB:

```bash norun
duckdb rapido.duckdb -c "SELECT * FROM mart_tiempos_ciudad ORDER BY min_promedio DESC"
```

:::tip Practica en la terminal del curso
La terminal del curso tiene un dbt que ejecuta los modelos de verdad (sobre SQLite, con todas las tablas del curso, incluidas `delivery_*`). Prueba: `dbt init rapido_dbt`, crea los modelos de esta lección con `code`, y corre `dbt build`.
:::

<!-- estandar:errores -->
:::errores
- **`Could not find profile named 'rapido_dbt'`**: el nombre en `profiles.yml` no coincide con `profile:` de `dbt_project.yml`, o el archivo no está en `~/.dbt/` (se puede indicar otra carpeta con `--profiles-dir`).
- **`dbt: command not found`**: instalaste dbt en un entorno que no está activo. Usa `uv run dbt …` o activa `.venv`.
- **`Compilation Error … depends on a node named 'stg_pedido' which was not found`**: un `ref()` con un nombre que no existe (revisa el nombre del archivo, sin `.sql`).
- **SQL que funciona en DuckDB y no en BigQuery**: funciones con otro nombre (`date_diff` vs `TIMESTAMP_DIFF`). Para lo que cambia entre motores, usa las macros cross-database de dbt (`{{ dbt.datediff(...) }}`) o los paquetes como `dbt_utils`.
- **Subir `rapido.duckdb` o `target/` a Git**: se regeneran; van en `.gitignore`.
:::

<!-- estandar:trabajo -->
:::trabajo
- Desarrollar con dbt-duckdb y una muestra de datos y validar en la CI contra el warehouse real es un patrón cada vez más común: iteras en segundos y sin costo.
- En la CI, `dbt build --select state:modified+` construye solo lo que cambió y lo que depende de eso, comparando con el `manifest.json` de producción.
- La documentación de dbt (`dbt docs`) se publica en cada merge a main: es el catálogo que consultan los analistas.
:::

## Ejercicios

:::ejercicio quiz
¿Por qué `profiles.yml` no va en el repositorio?

- [ ] Porque dbt no lo permite
- [x] Porque tiene datos de conexión y credenciales personales; el código del proyecto sí va a Git
- [ ] Porque es muy grande
- [ ] Porque cambia en cada ejecución
:::

:::ejercicio quiz
¿Qué construye `dbt run -s stg_rapido_pedidos+`?

- [ ] Solo `stg_rapido_pedidos`
- [x] `stg_rapido_pedidos` y todos los modelos que dependen de él
- [ ] Todos los modelos que necesita `stg_rapido_pedidos`
- [ ] Todo el proyecto
:::

:::ejercicio cli
Crea un proyecto de dbt llamado `rapido_dbt`.
```respuesta
dbt init rapido_dbt
```
:::

:::ejercicio cli
En el proyecto `~/rapido_dbt` hay un modelo staging y un mart. Construye los modelos **y** corre sus pruebas en orden, con un solo comando.
```respuesta
dbt build
```
```setup
dbt init rapido_dbt
cd ~/rapido_dbt
mkdir -p models/staging models/marts
printf "select pedido_id, ciudad, creado, entregado, estado, subtotal from {{ source('app', 'delivery_pedidos') }}\n" > models/staging/stg_rapido_pedidos.sql
printf "{{ config(materialized='table') }}\nselect ciudad, count(*) as entregados, round(avg((julianday(entregado) - julianday(creado)) * 1440), 1) as min_promedio\nfrom {{ ref('stg_rapido_pedidos') }}\nwhere estado = 'entregado'\ngroup by ciudad\n" > models/marts/mart_tiempos_ciudad.sql
printf "version: 2\nmodels:\n  - name: mart_tiempos_ciudad\n    columns:\n      - name: ciudad\n        tests: [unique, not_null]\n" > models/marts/schema.yml
```
:::

:::ejercicio cli
En el mismo proyecto, ejecuta solo el modelo `stg_rapido_pedidos` y todos los que dependen de él.
```respuesta
dbt run (-s|--select) stg_rapido_pedidos\+
dbt build (-s|--select) stg_rapido_pedidos\+
```
```solucion
dbt run -s stg_rapido_pedidos+
```
```setup
dbt init rapido_dbt2
cd ~/rapido_dbt2
mkdir -p models/staging models/marts
printf "select pedido_id, ciudad, creado, entregado, estado, subtotal from {{ source('app', 'delivery_pedidos') }}\n" > models/staging/stg_rapido_pedidos.sql
printf "select ciudad, count(*) as entregados from {{ ref('stg_rapido_pedidos') }} where estado = 'entregado' group by ciudad\n" > models/marts/mart_tiempos_ciudad.sql
```
:::
