# Academia de Datos

Curso **gratuito, interactivo y en español** para pasar de no saber nada a trabajar como ingeniero/a de datos. Todo se practica **en el navegador**, sin instalar nada.

| Módulo | Lecciones | Qué practicas |
|---|---|---|
| 🧱 Fundamentos | 4 | Ingeniería de datos, formatos, terminal, Git |
| 🗄️ SQL: de cero a experto | 24 | Desde `SELECT` hasta ventanas, CTE recursivas, gaps & islands, cohortes, optimización y modelado |
| 🐍 Python | 15 | Desde variables hasta generadores, decoradores, POO, tests y ETL |
| ⚡ Apache Spark | 8 | Arquitectura, lazy evaluation, shuffles, joins, Delta Lake, optimización, streaming |
| 🔥 PySpark | 12 | DataFrames, funciones, agregaciones, joins, ventanas, calidad, pipeline medallón |
| 🔧 dbt | 8 | Modelos, `ref`/`source`, incrementales, tests, Jinja, macros, snapshots, CI |
| 🌬️ Apache Airflow | 8 | DAGs, programación, XCom, TaskFlow, ramas, sensores, buenas prácticas |
| ☁️ Azure y Azure CLI | 7 | `az`, `--query`, ADLS Gen2, RBAC, Key Vault, Databricks, ADF, Bicep |
| 🧩 Databricks y Databricks CLI | 8 | Notebooks, Delta, Unity Catalog, CLI, Asset Bundles, Workflows |
| 🏆 Proyecto final y entrevistas | 4 | Arquitectura de punta a punta, casos en SQL y PySpark, plan de carrera |

**98 lecciones y 390 ejercicios corregidos automáticamente**, sobre una base de datos ficticia (“Tienda Andina”) de **~90.000 filas** en 12 tablas.

## Cómo funciona por dentro

- **SQL**: SQLite compilado a WebAssembly ([sql.js](https://github.com/sql-js/sql.js)). El dataset se genera en el navegador con una semilla fija (`assets/js/data.js`), así los resultados son siempre los mismos y se pueden corregir comparando con la solución.
- **Python**: CPython en WebAssembly ([Pyodide](https://pyodide.org)) dentro de un Web Worker.
- **PySpark**: *mini-Spark* (`assets/py/minispark`), un simulador en Python puro de gran parte de `pyspark.sql` (DataFrames, funciones, joins, ventanas, Spark SQL, lectura/escritura, RDDs básicos).
- **Airflow**: *mini-Airflow* (`assets/py/miniairflow`), con `DAG`, operadores, `>>`, XCom, TaskFlow, ramas, trigger rules y `TaskGroup`; el corrector inspecciona y ejecuta el DAG.
- **dbt**: los modelos se compilan con Jinja2 real (`ref`, `source`, `config`, `is_incremental`, macros) y se ejecutan en SQLite.
- **CLI** (terminal, Git, Azure CLI, Databricks CLI, dbt, Airflow): se valida el comando con patrones flexibles (orden de parámetros, abreviaturas).
- El progreso y tu código se guardan en `localStorage` (exportable desde “Mi progreso”).

## Usarlo

Es un sitio estático. Necesita conexión a internet la primera vez (carga sql.js, Pyodide, CodeMirror y highlight.js desde CDN).

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
