# examen: local

## WSL
leccion: local-preparar-la-computadora
En Windows con WSL, ¿dónde conviene guardar tus proyectos?
- [ ] En `/mnt/c/Users/...`, para verlos desde el Explorador de Windows.
- [x] Dentro de Linux, por ejemplo en `~/proyectos`.
- [ ] En el escritorio de Windows, para tenerlos siempre a mano.
- [ ] En una memoria USB, para poder llevarlos a otra computadora.
porque: Acceder a archivos de Windows desde Linux pasa por una capa de traducción lenta. Desde VS Code puedes abrir igual la carpeta de WSL.

## Clave SSH
leccion: local-vscode-git-github
Configuras SSH para GitHub. ¿Qué archivo pegas en la configuración de GitHub?
- [ ] `~/.ssh/id_ed25519`
- [x] `~/.ssh/id_ed25519.pub`
- [ ] `~/.ssh/known_hosts`
- [ ] `~/.ssh/config`
porque: Se comparte solo la clave **pública** (`.pub`). La privada nunca sale de tu computadora: quien la tenga puede hacerse pasar por ti.

## uv
leccion: local-python-uv
Un compañero clona tu proyecto que tiene `pyproject.toml` y `uv.lock`. ¿Qué comando le deja exactamente las mismas versiones que tú?
- [ ] `pip install -r pyproject.toml`
- [x] `uv sync`
- [ ] `uv init`
- [ ] `python -m venv .venv`
porque: `uv sync` crea el entorno virtual e instala lo que dice el archivo de bloqueo, con las versiones exactas. Así "en mi máquina funciona" vale para todos.

## Calidad automática
leccion: local-python-uv
¿Qué hacen `ruff check` y `pytest` en un proyecto?
- [ ] Instalan las librerías que faltan y actualizan las que están viejas.
- [x] `ruff` revisa el estilo y errores comunes; `pytest` corre las pruebas.
- [ ] Despliegan el proyecto en la nube después de cada commit.
- [ ] `ruff` formatea el disco y `pytest` mide la velocidad de Python.
porque: Son los chequeos rápidos que corres antes de cada commit y que el CI repite en cada pull request.

## Puertos
leccion: local-docker
Ejecutas `docker run -p 5433:5432 postgres:16`. ¿A qué puerto te conectas desde tu computadora?
- [ ] 5432
- [x] 5433
- [ ] 16
- [ ] A ninguno: el puerto solo existe dentro del contenedor.
porque: El formato es `-p puerto_de_tu_máquina:puerto_del_contenedor`. Usar otro puerto local es útil si ya tienes un PostgreSQL en el 5432.

## Volúmenes
leccion: local-docker
Borraste el contenedor de PostgreSQL y al crear uno nuevo tus tablas desaparecieron. ¿Qué faltó?
- [ ] Usar una versión más nueva de la imagen, que conserva los datos.
- [x] Un volumen, para que los datos vivan fuera del contenedor.
- [ ] Más memoria, porque PostgreSQL guardaba las tablas en RAM.
- [ ] Un `docker commit` del contenedor nuevo.
porque: Lo que el contenedor escribe adentro se pierde al borrarlo. Los volúmenes guardan los datos de forma persistente.

## DuckDB
leccion: local-postgres-duckdb
¿Qué ventaja tiene DuckDB para analizar un Parquet de 5 GB en tu computadora?
- [ ] Que necesita un servidor potente dedicado, como cualquier warehouse.
- [x] Es embebido, columnar y consulta el archivo directamente con SQL.
- [ ] Que funciona solo en la nube y no consume recursos de tu máquina.
- [ ] Que convierte el Parquet en CSV para poder consultarlo.
porque: `SELECT ... FROM 'archivo.parquet'` funciona sin cargar nada antes. Por eso es ideal para análisis local y pruebas de pipelines.

## dbt local
leccion: local-dbt-local
¿Dónde guarda dbt los datos de conexión al warehouse en tu computadora?
- [ ] En `dbt_project.yml`, junto al código del proyecto.
- [x] En `profiles.yml`, fuera del repositorio.
- [ ] Al inicio de cada modelo SQL, en un bloque `config`.
- [ ] En el `README.md` del proyecto, para que el equipo las vea.
porque: Separar las conexiones del proyecto evita subir credenciales a Git y permite que cada persona use su propio esquema de desarrollo.

## Airflow local
leccion: local-airflow-local
¿Para qué sirve `airflow standalone`?
- [ ] Para producción con alta disponibilidad y varios schedulers.
- [x] Para levantar todo en tu máquina con un comando y probar DAGs.
- [ ] Para borrar los DAGs y el historial de ejecuciones.
- [ ] Para instalar la versión de Python que necesita Airflow.
porque: Es la forma más rápida de probar en local. Para algo más parecido a producción se usa Docker Compose o Astro CLI.

## Credenciales de nube
leccion: local-nube-desde-tu-compu
¿Cuál es la mejor forma de usar la CLI de AWS desde tu computadora?
- [ ] Access keys de la cuenta root en `~/.aws/credentials`.
- [x] SSO con `aws sso login`, que da credenciales temporales.
- [ ] Las claves de un compañero que ya tiene los permisos.
- [ ] Las claves escritas en el código, en una constante.
porque: Las credenciales temporales expiran solas. Las claves permanentes, sobre todo de la cuenta root, son el origen de muchos incidentes.
