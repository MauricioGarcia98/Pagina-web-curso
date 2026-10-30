---
titulo: "Proyecto: el pipeline de Rápido completo en tu computadora"
nivel: Avanzado
duracion: 120
resumen: Junta todo el módulo en un repositorio real que puedes mostrar en tu portafolio. Postgres en Docker como base de la app, una ingesta en Python a un lago local en Parquet, dbt con DuckDB para las capas, Airflow para orquestar, un Makefile con los comandos del proyecto, pruebas y GitHub Actions. Paso a paso, con la verificación de cada paso.
objetivos: Estructurar un repositorio de datos completo con código, infraestructura local, pruebas y documentación | Levantar la fuente (Postgres) con Docker Compose y cargarle datos | Escribir una ingesta incremental de Postgres a Parquet y transformarla con dbt-duckdb | Orquestar ingesta, dbt y controles con un DAG de Airflow | Automatizar los comandos con un Makefile y validar cada cambio con GitHub Actions
prerrequisitos: local-airflow-local | local-dbt-local | proyecto-rapido-pipeline
autoevaluacion: ¿Puedes levantar todo el proyecto desde cero con dos o tres comandos? | ¿Sabes qué hace cada carpeta del repositorio? | ¿Tu ingesta es incremental (solo trae lo nuevo)? | ¿El DAG corre la ingesta, dbt y los controles en orden? | ¿La CI corre las pruebas en cada pull request?
---

:::escenario Tu proyecto de portafolio
En las entrevistas te van a preguntar "¿qué construiste?". Un repositorio que cualquiera puede clonar y levantar con `make up`, con un README claro, pruebas y CI, vale más que diez certificados. Este es ese proyecto, con los datos de Rápido.
:::

## El objetivo

```diagrama
titulo: El pipeline de Rápido, todo en tu máquina
nodo app: Postgres (Docker) | icono=base | col=0 | fila=0 | color=gris | sub=la "base de la app"\ncon los pedidos
nodo ing: ingesta.py | icono=codigo | col=1 | fila=0 | color=azul | sub=incremental por fecha
nodo bronze: data/bronze/ | icono=archivos | col=2 | fila=0 | color=naranja | sub=Parquet por día
nodo dbt: dbt + DuckDB | icono=transformar | col=3 | fila=0 | color=violeta | sub=staging → marts\n+ pruebas
nodo duck: rapido.duckdb | icono=base | col=3 | fila=1 | color=amarillo | sub=silver y gold
nodo af: Airflow (Astro) | icono=orquestador | col=1 | fila=1 | color=cian | sub=todos los días 6:00
nodo ci: GitHub Actions | icono=git | col=0 | fila=1 | color=verde | sub=ruff, pytest,\ndbt build
flecha app -> ing
flecha ing -> bronze
flecha bronze -> dbt
flecha dbt -> duck
flecha af -> ing | estilo=punteada
flecha af -> dbt | estilo=punteada
```

## Paso 1: el repositorio

```bash norun
mkdir rapido-local && cd rapido-local
git init
uv init --name rapido
uv add pandas duckdb psycopg[binary] python-dotenv pyarrow dbt-duckdb
uv add --dev ruff pytest
mkdir -p ingesta tests dbt dags data/bronze sql
```

```text
rapido-local/
├── README.md                 ← qué es, diagrama, cómo levantarlo
├── Makefile                  ← los comandos del proyecto
├── compose.yaml              ← Postgres (la fuente)
├── .env.example              ← variables necesarias (sin valores secretos)
├── pyproject.toml / uv.lock
├── sql/crear_tablas.sql      ← esquema de la base de la app
├── ingesta/ingesta.py        ← Postgres → data/bronze/*.parquet
├── dbt/                      ← proyecto dbt (profiles.yml de ejemplo incluido)
├── dags/rapido_diario.py     ← el DAG de Airflow
├── tests/                    ← pruebas de Python
└── .github/workflows/ci.yml
```

## Paso 2: la fuente en Docker

```yaml
# compose.yaml
services:
  app-db:
    image: postgres:16
    environment:
      POSTGRES_USER: rapido
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}     # sale de .env
      POSTGRES_DB: app
    ports:
      - "5432:5432"
    volumes:
      - appdata:/var/lib/postgresql/data
volumes:
  appdata:
```

```text
# .env.example   (copiar a .env y completar)
POSTGRES_PASSWORD=
POSTGRES_URL=postgresql://rapido:${POSTGRES_PASSWORD}@localhost:5432/app
```

```sql norun
-- sql/crear_tablas.sql
CREATE TABLE IF NOT EXISTS pedidos (
  pedido_id      INTEGER PRIMARY KEY,
  cliente_id     INTEGER,
  restaurante_id INTEGER,
  ciudad         TEXT,
  creado         TIMESTAMP,
  entregado      TIMESTAMP,
  subtotal       NUMERIC(10,2),
  estado         TEXT
);
```

Verificación: `docker compose up -d`, `docker compose ps` (Up) y `psql -h localhost -U rapido -d app -c '\dt'`.

## Paso 3: cargar datos de ejemplo

Exporta los pedidos de Rápido del curso a CSV (o usa los de tu propia app) y cárgalos con `\copy`:

```bash norun
psql -h localhost -U rapido -d app -f sql/crear_tablas.sql
psql -h localhost -U rapido -d app -c "\copy pedidos FROM 'data/semilla/pedidos.csv' WITH (FORMAT csv, HEADER)"
psql -h localhost -U rapido -d app -c "SELECT estado, COUNT(*) FROM pedidos GROUP BY estado"
```

## Paso 4: la ingesta incremental

La ingesta trae **solo los pedidos de un día** (el que le pasa Airflow) y los guarda en Parquet, en una carpeta por fecha. Si se vuelve a correr para el mismo día, **sobrescribe** ese archivo: es **idempotente** (correrla dos veces da el mismo resultado que una).

```python norun
# ingesta/ingesta.py
import os
import sys
from pathlib import Path

import pandas as pd
import psycopg
from dotenv import load_dotenv

def extraer_dia(url: str, fecha: str) -> pd.DataFrame:
    consulta = """
        SELECT * FROM pedidos
        WHERE creado >= %(fecha)s::date AND creado < %(fecha)s::date + INTERVAL '1 day'
    """
    with psycopg.connect(url) as con:
        return pd.read_sql(consulta, con, params={"fecha": fecha})

def guardar(df: pd.DataFrame, fecha: str, base: str = "data/bronze/pedidos") -> Path:
    destino = Path(base) / f"fecha={fecha}" / "pedidos.parquet"
    destino.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(destino, index=False)          # sobrescribe: idempotente
    return destino

if __name__ == "__main__":
    load_dotenv()
    fecha = sys.argv[1]                          # "2024-12-01"
    df = extraer_dia(os.environ["POSTGRES_URL"], fecha)
    print(f"{len(df)} pedidos → {guardar(df, fecha)}")
```

Verificación: `uv run python ingesta/ingesta.py 2024-12-01` y `duckdb -c "SELECT COUNT(*) FROM 'data/bronze/pedidos/*/*.parquet'"`.

## Paso 5: dbt sobre el lago local

En `dbt/models/staging/sources.yml`, la fuente apunta a los Parquet:

```yaml
version: 2
sources:
  - name: bronze
    meta:
      external_location: "../data/bronze/{name}/*/*.parquet"
    tables:
      - name: pedidos
```

Los modelos son los de la lección de dbt (`stg_rapido_pedidos`, `mart_tiempos_ciudad`) más el mart diario del proyecto final, con sus pruebas. Verificación: `cd dbt && uv run dbt build` (todo en verde) y `duckdb rapido.duckdb -c "SELECT * FROM mart_tiempos_ciudad"`.

## Paso 6: el DAG

```python norun
# dags/rapido_diario.py
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.standard.operators.bash import BashOperator

PROYECTO = "/usr/local/airflow/include/rapido"   # con Astro, el repo se copia en include/

with DAG("rapido_diario", schedule="0 6 * * *", start_date=datetime(2024, 12, 1),
         catchup=False, default_args={"retries": 1}, tags=["rapido"]) as dag:
    ingesta = BashOperator(task_id="ingesta", bash_command=f"cd {PROYECTO} && python ingesta/ingesta.py {{{{ ds }}}}")
    dbt_build = BashOperator(task_id="dbt_build", bash_command=f"cd {PROYECTO}/dbt && dbt build --profiles-dir .")
    ingesta >> dbt_build
```

Verificación: `astro dev run dags test rapido_diario 2024-12-01`.

## Paso 7: el Makefile

Un **Makefile** guarda los comandos del proyecto con nombres cortos. Cualquiera que clone el repo los ve todos en un solo lugar:

```makefile
.PHONY: up carga ingesta dbt test down limpiar

up:          ## levanta la base de la app
	docker compose up -d

carga:       ## crea las tablas y carga los datos de ejemplo
	psql -h localhost -U rapido -d app -f sql/crear_tablas.sql
	psql -h localhost -U rapido -d app -c "\copy pedidos FROM 'data/semilla/pedidos.csv' WITH (FORMAT csv, HEADER)"

ingesta:     ## ingesta de un día: make ingesta FECHA=2024-12-01
	uv run python ingesta/ingesta.py $(FECHA)

dbt:         ## construye y prueba los modelos
	cd dbt && uv run dbt build --profiles-dir .

test:        ## revisa y prueba el código
	uv run ruff check . && uv run pytest -q

down:        ## apaga todo (los datos quedan en el volumen)
	docker compose down

limpiar:     ## borra todo, incluidos los datos
	docker compose down -v && rm -rf data/bronze dbt/target dbt/rapido.duckdb
```

:::cuidado Tabulaciones
Las líneas de comandos de un Makefile empiezan con una **tabulación**, no con espacios. Si VS Code las convierte en espacios, `make` dice `missing separator`.
:::

## Paso 8: pruebas y CI

```python norun
# tests/test_ingesta.py
import pandas as pd
from ingesta.ingesta import guardar

def test_guardar_es_idempotente(tmp_path):
    df = pd.DataFrame({"pedido_id": [1, 2], "estado": ["entregado", "cancelado_cliente"]})
    p1 = guardar(df, "2024-12-01", base=str(tmp_path))
    p2 = guardar(df, "2024-12-01", base=str(tmp_path))
    assert p1 == p2
    assert len(pd.read_parquet(p1)) == 2          # no duplicó filas
```

```yaml
# .github/workflows/ci.yml
name: ci
on: [pull_request, push]
jobs:
  calidad:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
      - run: uv sync --frozen
      - run: uv run ruff check .
      - run: uv run pytest -q
      - run: cd dbt && uv run dbt build --profiles-dir . --target ci   # dbt sobre una muestra en DuckDB
```

## Paso 9: el README

El README es lo primero que ve un reclutador. Lo mínimo:

1. **Qué problema resuelve** (dos líneas, con el negocio).
2. **El diagrama** de arquitectura.
3. **Cómo levantarlo**: `cp .env.example .env`, `make up carga`, `make ingesta FECHA=2024-12-01`, `make dbt`.
4. **Decisiones** que tomaste y por qué (incremental por día, Parquet, medidas aditivas, compuerta de calidad).
5. **Qué sigue** (la versión en la nube con Terraform, el tablero).

## La checklist final

| ✔ | Criterio |
|---|---|
| ☐ | Se clona y se levanta con los comandos del README en una máquina limpia |
| ☐ | No hay secretos en el repositorio (solo `.env.example`) |
| ☐ | La ingesta es incremental e idempotente |
| ☐ | `dbt build` corre con pruebas en verde |
| ☐ | El DAG se probó con `dags test` |
| ☐ | La CI corre en cada pull request |
| ☐ | El README explica el problema, la arquitectura y las decisiones |

<!-- estandar:errores -->
:::errores
- **"En mi máquina funciona"**: probaste con datos que no están en el repo o con una variable que solo existe en tu `.env`. Prueba desde un clon nuevo, siguiendo tu propio README.
- **Una ingesta que hace `append`**: correrla dos veces duplica los datos. Sobrescribe la partición del día.
- **El DAG con rutas de tu computadora** (`/home/ana/...`): en el contenedor de Airflow no existen. Usa rutas relativas al proyecto o variables.
- **Subir `data/` o `rapido.duckdb` a Git**: son artefactos; se regeneran con los comandos del Makefile.
:::

<!-- estandar:trabajo -->
:::trabajo
- Este es, en miniatura, el mismo proyecto que corre en la nube en la lección del proyecto final: la fuente es una base real, el lago es un bucket, DuckDB es BigQuery o Databricks, Astro es Composer o MWAA. Si entiendes el local, entiendes el de producción.
- En una entrevista técnica, recorrer tu propio repositorio (estructura, una decisión de diseño, una prueba y la CI) es una de las mejores formas de demostrar experiencia práctica.
:::

## Ejercicios

:::ejercicio quiz
Corres la ingesta del 1 de diciembre dos veces por error. Con el diseño de esta lección, ¿qué pasa?

- [ ] Los pedidos de ese día quedan duplicados
- [x] Nada malo: la segunda vez sobrescribe la carpeta `fecha=2024-12-01` con los mismos datos (es idempotente)
- [ ] Falla porque el archivo ya existe
- [ ] Borra los demás días
:::

:::ejercicio quiz
¿Qué archivo le dice a alguien que clona tu repo qué variables de entorno necesita, sin exponer secretos?

- [ ] `.env`
- [x] `.env.example`
- [ ] `compose.yaml`
- [ ] `uv.lock`
:::

:::ejercicio cli
En `~/rapido-local` hay un `Makefile`. Levanta la base de la app usando el objetivo `up`.
```respuesta
make up
```
```setup
mkdir -p ~/rapido-local
cd ~/rapido-local
printf 'services:\n  app-db:\n    image: postgres:16\n    environment:\n      POSTGRES_USER: rapido\n      POSTGRES_PASSWORD: rapido\n      POSTGRES_DB: app\n    ports:\n      - "5432:5432"\n    volumes:\n      - appdata:/var/lib/postgresql/data\nvolumes:\n  appdata:\n' > compose.yaml
printf 'up:\n\tdocker compose up -d\n\ndown:\n\tdocker compose down\n\nlimpiar:\n\tdocker compose down -v\n' > Makefile
```
:::

:::ejercicio cli
La base del proyecto ya está levantada (usuario `rapido`, base `app`). Crea la tabla `pedidos` ejecutando el archivo `sql/crear_tablas.sql` con `psql`.
```respuesta
psql (-h localhost )?(-p 5432 )?-U rapido -d app -f sql/crear_tablas\.sql
psql -d app -U rapido -f sql/crear_tablas\.sql
```
```solucion
psql -h localhost -U rapido -d app -f sql/crear_tablas.sql
```
```setup
mkdir -p ~/rapido-local2/sql
cd ~/rapido-local2
printf 'services:\n  app-db:\n    image: postgres:16\n    environment:\n      POSTGRES_USER: rapido\n      POSTGRES_PASSWORD: rapido\n      POSTGRES_DB: app\n    ports:\n      - "5432:5432"\n' > compose.yaml
printf 'CREATE TABLE IF NOT EXISTS pedidos (pedido_id INTEGER PRIMARY KEY, cliente_id INTEGER, restaurante_id INTEGER, ciudad TEXT, creado TIMESTAMP, entregado TIMESTAMP, subtotal NUMERIC(10,2), estado TEXT);\n' > sql/crear_tablas.sql
docker compose up -d
```
:::

:::ejercicio abierto titulo="Del local a la nube"
Tu proyecto local funciona. Explica cómo pasarías cada pieza a Google Cloud (o a la nube que prefieras): qué reemplaza a Postgres en Docker, a `data/bronze/`, a DuckDB, a Astro local y a los secretos del `.env`; qué crearías con Terraform; y qué cambia (y qué no) en el código de la ingesta, de dbt y del DAG.
```solucion
- Postgres en Docker → la base real de la app (Cloud SQL), leída desde una réplica de lectura con un usuario de solo lectura.
- data/bronze/ → un bucket de Cloud Storage (gs://rapido-prod-bronze/pedidos/fecha=…/), con retención de 90 días.
- DuckDB → BigQuery (datasets silver y gold), con dbt-bigquery: el código de los modelos casi no cambia; solo funciones específicas de fechas (se resuelven con macros cross-database) y el profiles.yml (target prod).
- Astro local → Cloud Composer (o Astro en la nube); los DAGs se despliegan copiando dags/ al bucket de Composer desde la CI.
- .env → Secret Manager; Airflow lo usa como secrets backend para las conexiones, y la ingesta lee las variables de entorno igual que antes.
- Terraform: el bucket, los datasets, la cuenta de servicio del pipeline con permisos por recurso, el entorno de Composer, los secretos (sin valores) y el presupuesto con alertas.
- Cambios en el código: la ingesta escribe en gs:// en lugar de una carpeta (con pandas + gcsfs o la librería de Storage), el DAG usa la fecha lógica igual que antes y cambia las rutas por variables; dbt cambia de target. La lógica (incremental, idempotente, pruebas, controles) es la misma.
```
:::
