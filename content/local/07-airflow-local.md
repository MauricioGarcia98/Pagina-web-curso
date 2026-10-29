---
titulo: "Airflow en tu máquina: standalone, Astro CLI o Docker Compose"
nivel: Intermedio
duracion: 55
resumen: Tres maneras de correr Airflow en tu computadora, cuándo usar cada una y cómo hacerlo paso a paso. Dónde poner los DAGs, cómo probarlos sin esperar al scheduler (dags test, tasks test), cómo pasar conexiones y variables sin escribir contraseñas en el código, y cómo escribir pruebas de los DAGs.
objetivos: Elegir entre airflow standalone, Astro CLI y el docker-compose oficial según la situación | Instalar Airflow con sus restricciones de versiones y levantarlo localmente | Ubicar los DAGs en la carpeta correcta y comprobar que se importan sin errores | Probar un DAG y una tarea con airflow dags test y airflow tasks test | Configurar conexiones y variables con variables de entorno y escribir pruebas de los DAGs
prerrequisitos: local-docker | airflow-primer-dag
autoevaluacion: ¿Sabes qué ofrece cada forma de correr Airflow localmente? | ¿Sabes por qué Airflow se instala con un archivo de constraints? | ¿Sabes dónde busca Airflow los DAGs? | ¿Puedes probar un DAG completo sin el scheduler? | ¿Sabes pasar una conexión como variable de entorno?
---

:::escenario El DAG que solo funcionaba en el servidor
Hasta ahora, para probar un DAG había que subirlo al Airflow compartido de desarrollo y esperar a que el scheduler lo leyera. Un error de importación dejaba el DAG roto para todo el equipo durante media hora. La regla nueva:

> "Ningún DAG llega al Airflow compartido sin haberse probado en tu máquina: que importe sin errores, que `dags test` corra completo y que pasen las pruebas."
:::

## Tres maneras de correr Airflow

| | `airflow standalone` | **Astro CLI** | docker-compose oficial |
|---|---|---|---|
| Qué es | Airflow instalado en tu entorno de Python, todo en un proceso | Herramienta de Astronomer que levanta Airflow en Docker con un comando | El `docker-compose.yaml` publicado por Apache Airflow |
| Requiere Docker | No | Sí | Sí |
| Parecido a producción | Bajo (SQLite, un solo proceso) | Alto (Postgres, scheduler, webserver, triggerer separados) | Alto (incluye Celery y Redis) |
| Ideal para | Aprender, probar DAGs rápido | El día a día en un equipo | Entender la arquitectura completa |

```diagrama
titulo: Lo que levanta un Airflow local "completo" (Astro CLI o docker-compose)
nodo dags: Tu carpeta dags/ | icono=codigo | col=0 | fila=0 | color=azul | sub=se monta en los\ncontenedores
nodo sch: Scheduler | icono=reloj | col=1 | fila=0 | color=violeta | sub=lee los DAGs y\nprograma tareas
nodo web: Webserver | icono=web | col=2 | fila=0 | color=cian | sub=localhost:8080
nodo db: Postgres | icono=base | col=1 | fila=1 | color=gris | sub=metadatos: corridas,\nestados, conexiones
nodo trig: Triggerer | icono=engranaje | col=2 | fila=1 | color=gris | sub=tareas diferibles
flecha dags -> sch
flecha sch -> db
flecha web -> db
flecha trig -> db
```

## Opción 1: `airflow standalone` (la más simple)

Airflow tiene muchas dependencias y se instala con un archivo de **constraints**: las versiones exactas que Airflow probó juntas. Sin él, pip puede elegir una combinación que rompe Airflow.

```bash norun
uv venv --python 3.12 && source .venv/bin/activate
AIRFLOW_VERSION=2.10.3
PYTHON_VERSION=3.12
uv pip install "apache-airflow==${AIRFLOW_VERSION}" \
  --constraint "https://raw.githubusercontent.com/apache/airflow/constraints-${AIRFLOW_VERSION}/constraints-${PYTHON_VERSION}.txt"

export AIRFLOW_HOME=~/airflow          # dónde guarda su configuración, su base y los dags/
airflow standalone
```

`standalone` inicializa la base, crea un usuario `admin` (la contraseña aparece en la salida y en `$AIRFLOW_HOME/standalone_admin_password.txt`) y arranca todo. Abre `http://localhost:8080`. Los DAGs van en `$AIRFLOW_HOME/dags/`.

:::nota Windows
Airflow no corre nativo en Windows: usa WSL (lección 1) o una de las opciones con Docker.
:::

## Opción 2: Astro CLI (la recomendada para el día a día)

```bash norun
brew install astro                                   # macOS
curl -sSL install.astronomer.io | sudo bash -s       # Linux y WSL

mkdir rapido-airflow && cd rapido-airflow
astro dev init          # crea la estructura del proyecto
astro dev start         # construye la imagen y levanta Postgres, scheduler, webserver y triggerer
```

```text
rapido-airflow/
├── dags/                 ← tus DAGs
├── include/              ← SQL, scripts y archivos que usan los DAGs
├── plugins/
├── tests/dags/           ← pruebas de los DAGs (pytest)
├── Dockerfile            ← FROM quay.io/astronomer/astro-runtime:…
├── requirements.txt      ← paquetes de Python extra (dbt, providers…)
├── .env                  ← variables de entorno locales (conexiones, claves): en .gitignore
└── airflow_settings.yaml ← conexiones, variables y pools para desarrollo
```

UI en `http://localhost:8080` (usuario y contraseña `admin`). Cuando cambias un DAG, el scheduler lo relee solo; cuando cambias `requirements.txt`, `astro dev restart`.

## Opción 3: el docker-compose oficial

```bash norun
mkdir airflow-oficial && cd airflow-oficial
curl -LfO 'https://airflow.apache.org/docs/apache-airflow/2.10.3/docker-compose.yaml'
mkdir -p ./dags ./logs ./plugins ./config
echo -e "AIRFLOW_UID=$(id -u)" > .env
docker compose up airflow-init       # inicializa la base y crea el usuario airflow / airflow
docker compose up -d
```

Levanta la arquitectura completa (con CeleryExecutor, Redis y workers): es la mejor forma de **ver** cómo se compone Airflow en producción, pero consume bastante memoria (4 GB o más para Docker).

## Probar DAGs sin esperar al scheduler

```bash norun
airflow dags list                        # ¿aparece mi DAG?
airflow dags list-import-errors          # errores de sintaxis o de import, con el archivo y la línea
airflow tasks list rapido_operaciones    # sus tareas
airflow tasks test rapido_operaciones compuerta_calidad 2024-12-01   # una tarea, sin dependencias ni estado
airflow dags test rapido_operaciones 2024-12-01                       # el DAG completo, en tu terminal
```

Con Astro CLI, los mismos comandos van dentro del contenedor: `astro dev run dags test rapido_operaciones 2024-12-01`.

`tasks test` y `dags test` no registran nada en la base (no afectan el historial) y muestran los logs en la terminal: es el ciclo rápido de desarrollo.

## Conexiones y variables sin contraseñas en el código

Airflow lee conexiones y variables de **variables de entorno** con un nombre especial:

```text
# .env (Astro CLI la carga sola; con standalone: export …)
AIRFLOW_CONN_POSTGRES_RAPIDO=postgresql://rapido:clave-local@host.docker.internal:5432/operaciones
AIRFLOW_VAR_CIUDADES='["Bogotá", "Lima", "Ciudad de México"]'
```

En el DAG se usan por su id (`postgres_rapido`) y su nombre (`ciudades`), sin ver nunca la contraseña. En producción, las mismas conexiones vienen de un gestor de secretos (AWS Secrets Manager, Key Vault, Secret Manager) configurado como *secrets backend*: el código del DAG no cambia.

:::cuidado localhost dentro de un contenedor
Si Airflow corre en Docker (Astro, compose) y Postgres en tu máquina u otro contenedor, `localhost` en la conexión apunta **al propio contenedor de Airflow**. Usa `host.docker.internal` (Docker Desktop) o el nombre del servicio de Compose.
:::

## Pruebas de los DAGs

La prueba más valiosa y simple: que **todos** los DAGs importen sin errores y cumplan las reglas del equipo.

```python norun
# tests/dags/test_dags.py
from airflow.models import DagBag

def test_sin_errores_de_importacion():
    bag = DagBag(dag_folder="dags", include_examples=False)
    assert bag.import_errors == {}, bag.import_errors

def test_reglas_del_equipo():
    bag = DagBag(dag_folder="dags", include_examples=False)
    for dag_id, dag in bag.dags.items():
        assert dag.catchup is False or "backfill" in dag.tags, f"{dag_id}: catchup sin justificar"
        assert dag.default_args.get("retries", 0) >= 1, f"{dag_id}: sin reintentos"
```

```bash norun
pytest tests/            # con standalone
astro dev pytest         # con Astro CLI
```

<!-- estandar:errores -->
:::errores
- **El DAG no aparece en la UI**: está en otra carpeta (`airflow config get-value core dags_folder` dice cuál), tiene un error de importación (`airflow dags list-import-errors`) o el archivo no contiene las palabras `airflow` y `dag` (Airflow los ignora por defecto).
- **Instalar Airflow sin constraints** y que el webserver no arranque por versiones incompatibles: reinstala en un entorno limpio con el archivo de constraints.
- **`ModuleNotFoundError` en un DAG con Astro**: falta el paquete en `requirements.txt`; agrégalo y `astro dev restart`.
- **Docker se queda sin memoria** con el compose oficial: dale 4–8 GB en Docker Desktop → Settings → Resources, o usa Astro CLI.
- **Contraseñas en el DAG** (`password="…"`): van en conexiones, nunca en el código.
:::

<!-- estandar:trabajo -->
:::trabajo
- Los equipos que usan Astronomer, Cloud Composer o MWAA desarrollan con Astro CLI (o la imagen oficial) en local y despliegan los DAGs por CI: la imagen local y la de producción son casi idénticas.
- La CI de un repositorio de DAGs corre al menos el `DagBag` sin errores y las reglas del equipo; muchos agregan `dags test` de los DAGs modificados con datos de prueba.
- Nadie edita DAGs directo en el servidor: el despliegue copia la carpeta `dags/` desde Git (un bucket en Composer y MWAA, una imagen en Kubernetes).
:::

## Ejercicios

:::ejercicio quiz
¿Por qué Airflow se instala con un archivo de *constraints*?

- [ ] Para que pese menos
- [x] Porque fija las versiones de sus muchas dependencias que fueron probadas juntas; sin él, pip puede instalar una combinación que rompe Airflow
- [ ] Porque es obligatorio para usar Docker
- [ ] Para limitar la memoria que usa
:::

:::ejercicio quiz
Airflow corre en Docker y tu Postgres está en tu máquina. ¿Qué host pones en la conexión?

- [ ] `localhost`
- [x] `host.docker.internal` (o el nombre del servicio si Postgres también está en el compose)
- [ ] `0.0.0.0`
- [ ] `airflow`
:::

:::ejercicio cli
Quieres saber si alguno de tus DAGs tiene errores de importación (sintaxis, imports que faltan). ¿Qué comando de Airflow los lista?
```respuesta
airflow dags list-import-errors
```
:::

:::ejercicio cli
Prueba de punta a punta el DAG `etl_ventas` para la fecha lógica `2024-12-01`, sin el scheduler.
```respuesta
airflow dags test etl_ventas 2024-12-01
```
:::

:::ejercicio cli
En una carpeta vacía `~/rapido-airflow`, crea la estructura de un proyecto de Airflow con Astro CLI.
```respuesta
astro dev init
```
```setup
mkdir -p ~/rapido-airflow
cd ~/rapido-airflow
```
:::
