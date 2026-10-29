# Academia de Datos

Curso **gratuito, interactivo y en español** para pasar de no saber nada a trabajar como ingeniero/a de datos. Todo se practica **en el navegador**, sin instalar nada.

| Módulo | Lecciones | Ejercicios | Qué practicas |
|---|---|---|---|
| 🧱 Fundamentos | 4 | 17 | Ingeniería de datos, formatos, terminal, Git |
| 🗄️ SQL: de cero a experto | 24 | 118 | Desde `SELECT` hasta ventanas, CTE recursivas, gaps & islands, cohortes, optimización y modelado |
| 💼 Casos de negocio con SQL | 14 | 94 | 13 empresas (banco, streaming, movilidad, clínica, SaaS, aerolínea, logística, tienda, telco, seguros, hotelería, energía, delivery): KPIs reales y trampas lógicas |
| 📐 Modelado de datos | 7 | 31 | Del negocio al modelo, normalización, Kimball, SCD, Data Vault, OBT y tipos anidados |
| 🐍 Python | 15 | 54 | Desde variables hasta generadores, decoradores, POO, tests y ETL |
| ⚡ Apache Spark | 8 | 24 | Arquitectura, lazy evaluation, shuffles, joins, Delta Lake, optimización, streaming |
| 🔥 PySpark | 12 | 46 | DataFrames, funciones, agregaciones, joins, ventanas, calidad, pipeline medallón |
| 🔧 dbt | 8 | 28 | Modelos, `ref`/`source`, incrementales, tests, Jinja, macros, snapshots, CI |
| 🌬️ Apache Airflow | 8 | 23 | DAGs, programación, XCom, TaskFlow, ramas, sensores, buenas prácticas |
| ☁️ Azure y Azure CLI | 7 | 34 | `az`, `--query`, ADLS Gen2, RBAC, Key Vault, Databricks, ADF, Bicep |
| 🟧 AWS para Data Engineers | 8 | 69 | IAM, S3, Glue, Athena, Redshift, EMR, Kinesis, Lambda, Step Functions, MWAA, Lake Formation |
| 🔷 Google Cloud para Data Engineers | 8 | 59 | gcloud, Cloud Storage, BigQuery (particiones, clustering, MERGE), Pub/Sub, Dataflow, Dataproc, Composer, Dataform |
| 🧩 Databricks y Databricks CLI | 8 | 35 | Notebooks, Delta, Unity Catalog, CLI, Asset Bundles, Workflows |
| 🏛️ Arquitectura de datos | 8 | 38 | Ingesta, almacenamiento, batch y streaming, lakehouse, calidad y gobierno, patrones modernos |
| 🏗️ Terraform | 7 | 53 | HCL, variables, `for_each`, estado remoto, módulos, import, lifecycle, plataformas en Azure + Databricks, AWS y GCP, `terraform test` y CI/CD |
| 🧠 Casos de negocio de punta a punta | 10 | 51 | Los casos resueltos con Python, PySpark, dbt y Airflow |
| 💻 Desde tu computadora | 10 | 61 | WSL/Homebrew, VS Code, Git y GitHub con SSH, Python con uv, Docker y Compose, PostgreSQL, DuckDB, dbt, Airflow, Spark, CLIs de nube y el proyecto completo en tu máquina |
| 🧪 Laboratorios guiados en la nube | 9 | 139 | Data lake con calidad en AWS, RAG con Bedrock y Guardrails, SageMaker, operación y seguridad, BigQuery y BQML, Pub/Sub, Workflows y Vertex AI, Foundry y Azure ML blue/green, Databricks bundles y Unity Catalog, con costos y limpieza |
| 🏆 Proyecto final y entrevistas | 6 | 23 | Arquitectura, el proyecto completo de Rápido (modelo, pipeline, calidad, Terraform, CI), retos de SQL y PySpark, plan de carrera |

**214 lecciones y 1205 ejercicios corregidos automáticamente** (incluye los módulos de certificaciones de Databricks, Azure, AWS y Google Cloud), sobre una base de datos ficticia de **13 empresas**, con **más de 320.000 filas** en 60 tablas. Las lecciones traen diagramas dibujados a mano (estilo Excalidraw) con íconos, que se pueden ampliar a pantalla completa.

### Herramientas de práctica

- **Editor Monaco** (el de VS Code) con autocompletado de tablas y columnas; CodeMirror como respaldo.
- **Terminal Linux simulada** (botón ⌨ Terminal o `Ctrl+``) con sistema de archivos persistente, tuberías y redirecciones, `git`, Python y `sqlite3` reales, un proyecto **dbt** que se ejecuta de verdad, `airflow dags test`, **Docker y Docker Compose** con estado (imágenes, contenedores, puertos, volúmenes, `build`), **`psql`** sobre los contenedores de PostgreSQL, **DuckDB** que consulta CSV y JSON, `uv`, entornos virtuales, `ssh-keygen`, `make`, un **Terraform** simulado que lee tus `.tf` de verdad (plan, apply, destroy, estado remoto, workspaces, módulos, import, `terraform test`) y las CLIs de la nube con estado: `az`, `aws` (S3, Glue, Athena que consulta los CSV subidos, Redshift Data API, EMR, Kinesis, Lambda…), `gcloud`, `gsutil`, `bq` (cargas, tablas particionadas, CTAS, dry-run) y `databricks` (fs, secrets, jobs, Asset Bundles).
- **Laboratorio SQL con cuatro motores**: SQLite, **PostgreSQL 17 real** ([PGlite](https://pglite.dev), Postgres compilado a WebAssembly, con el dataset completo y tipos DATE, TIMESTAMP y NUMERIC) y modos compatibles de **MySQL** y **SQL Server** que traducen su dialecto (TOP, OFFSET … FETCH, DATEADD, DATE_FORMAT, GROUP_CONCAT, DECLARE…) y devuelven los errores reales de cada motor cuando usas sintaxis ajena (LIMIT en SQL Server, columnas fuera del GROUP BY…). Incluye ejemplos por motor y una tabla comparativa de sintaxis.
- **Laboratorio de terminal** con misiones guiadas, y ejercicios de terminal que preparan solos el entorno que necesitan.

## Cómo funciona por dentro

- **SQL**: SQLite compilado a WebAssembly ([sql.js](https://github.com/sql-js/sql.js)). El dataset se genera en el navegador con una semilla fija (`assets/js/data.js`), así los resultados son siempre los mismos y se pueden corregir comparando con la solución.
- **Python**: CPython en WebAssembly ([Pyodide](https://pyodide.org)) dentro de un Web Worker.
- **PySpark**: *mini-Spark* (`assets/py/minispark`), un simulador en Python puro de gran parte de `pyspark.sql` (DataFrames, funciones, joins, ventanas, Spark SQL, lectura/escritura, RDDs básicos).
- **Airflow**: *mini-Airflow* (`assets/py/miniairflow`), con `DAG`, operadores, `>>`, XCom, TaskFlow, ramas, trigger rules y `TaskGroup`; el corrector inspecciona y ejecuta el DAG.
- **dbt**: los modelos se compilan con Jinja2 real (`ref`, `source`, `config`, `is_incremental`, macros) y se ejecutan en SQLite.
- **CLI** (terminal, Git, Azure, AWS, Google Cloud, Databricks, dbt, Airflow): cada ejercicio trae una terminal; el comando se ejecuta en la máquina simulada (`assets/js/terminal.js`, `terminal-cloud.js`, `terminal-iac.js` y `terminal-local.js`) y se valida con patrones flexibles (orden de parámetros, abreviaturas). El bloque `setup` prepara el entorno (por ejemplo, crea el bucket) la primera vez que se usa la terminal del ejercicio.
- El progreso y tu código se guardan en `localStorage` (exportable desde “Mi progreso”).

## Usarlo

Es un sitio estático. Necesita conexión a internet la primera vez (carga sql.js, Pyodide, Monaco, CodeMirror y highlight.js desde CDN; PGlite se descarga de cdn.jsdelivr.net solo si eliges PostgreSQL en el laboratorio SQL).

Versión publicada: **https://mauriciogarcia98.github.io/Pagina-web-curso/**

```bash
python3 -m http.server 8000      # o: npm run serve
# abrir http://localhost:8000
```

También se puede abrir `index.html` directamente, aunque se recomienda un servidor local.

### Publicarlo en GitHub Pages

En el repositorio: **Settings → Pages → Build and deployment → Deploy from a branch**, elegir la rama y la carpeta `/ (root)`.

## Editar el contenido

Las lecciones están en `content/<módulo>/NN-nombre.md` (Markdown con *front matter*). Los ejercicios se escriben dentro de la lección:

````markdown
:::ejercicio sql ordenado
Muestra los 5 productos más caros (columnas `nombre`, `precio`).
```sql solucion
SELECT nombre, precio FROM productos ORDER BY precio DESC, nombre LIMIT 5;
```
```pista
Usa ORDER BY ... DESC y LIMIT.
```
:::
````

Tipos: `sql`, `python`, `pyspark`, `airflow`, `dbt`, `quiz`, `cli`, `abierto`. Bloques: `inicial`, `solucion`, `pista`, `explicacion`, `test` (asserts de Python), `check` (SQL de verificación), `setup`, `previo`, `respuesta` (patrones CLI; `todos: base || frag || frag` exige todos los fragmentos en cualquier orden), `salida`.

```bash
npm install          # marked + sql.js (solo para compilar y validar)
npm run build        # genera assets/js/content.js y assets/js/pysrc.js
npm run validate     # ejecuta TODAS las soluciones y los ejemplos de las lecciones
```

`validate` comprueba que cada solución corre y pasa su propia corrección, que los ejemplos con “▶ Probar” no fallan y que los patrones de CLI aceptan la solución.
