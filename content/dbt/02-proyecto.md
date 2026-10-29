---
titulo: Instalación y estructura de un proyecto
nivel: Básico
duracion: 40
resumen: Desde cero - terminal, Python, entorno virtual y adaptador; instalar dbt, dbt init y dbt debug, la estructura de carpetas, las tres capas, dbt_project.yml, profiles.yml y cómo se arma el nombre del esquema.
---

## Antes de empezar: las palabras que vas a ver

Si nunca instalaste una herramienta de programación, estas son las piezas que aparecen en esta lección. No hace falta memorizarlas; vuelve a esta tabla cuando una palabra no se entienda.

| Palabra | Qué es, en simple |
|---|---|
| **Terminal** | Una ventana donde le das órdenes a la computadora escribiendo, en vez de hacer clic. Cada línea es un **comando**. |
| **Python** | Un lenguaje de programación. dbt está escrito en Python, por eso se instala con las herramientas de Python. |
| **pip** | El "instalador de programas" de Python: `pip install algo` descarga e instala `algo`. |
| **Entorno virtual** (`.venv`) | Una carpeta aislada donde se instalan los programas de **un** proyecto, para que no choquen con los de otro. Se "activa" con `source .venv/bin/activate`. |
| **Adaptador** | El conector entre dbt y tu base de datos. dbt no sabe hablar con Databricks o PostgreSQL por sí solo: el paquete `dbt-databricks` o `dbt-postgres` le enseña. |
| **YAML** (`.yml`) | Un formato de texto para configuración: `clave: valor`, y la **sangría** (los espacios al principio) indica qué está dentro de qué. Un espacio de más o de menos cambia el significado. |
| **Esquema** (*schema*) | Una "carpeta" dentro de la base de datos que agrupa tablas. En Databricks hay además un nivel encima, el **catálogo**: `catalogo.esquema.tabla`. |
| **Git** | El programa que guarda la historia de cambios de los archivos de un proyecto, para trabajar en equipo y volver atrás. |

## Instalar dbt Core, paso a paso

```bash norun
python -m venv .venv               # 1. crea el entorno virtual en la carpeta .venv
source .venv/bin/activate          # 2. lo activa (en Windows: .venv\Scripts\activate)
pip install dbt-databricks         # 3. instala dbt-core + el adaptador de Databricks
dbt --version                      # 4. comprueba qué se instaló
```

1. `python -m venv .venv` le pide a Python que cree un entorno virtual llamado `.venv` (el punto inicial lo oculta en los listados).
2. Al activarlo, el texto de la terminal empieza con `(.venv)`: a partir de ahí, lo que instales con `pip` queda dentro de esa carpeta.
3. Instalas **el adaptador** de tu base, no `dbt-core` solo: el adaptador ya trae `dbt-core` como dependencia. Para practicar en tu computadora sin nube, `pip install dbt-duckdb` usa DuckDB, una base que vive en un archivo.
4. `dbt --version` muestra la versión de `dbt-core` y de cada adaptador (*plugin*).

## Crear el proyecto

```bash norun
dbt init tienda_andina            # pregunta el adaptador y los datos de conexión
cd tienda_andina
dbt debug                         # verifica la conexión y la configuración
```

- `dbt init` crea la carpeta del proyecto con la estructura de la sección siguiente y, si no existe, te hace preguntas para armar `~/.dbt/profiles.yml` (qué base usas, a qué servidor te conectas, con qué usuario).
- `dbt debug` es el primer comando que se corre siempre: revisa que `dbt_project.yml` sea válido, que encuentre `profiles.yml` y que **pueda conectarse** a la base. Si algo falla, el mensaje dice qué parte. Los errores más comunes son un token vencido, un `http_path` mal copiado o estar parado en otra carpeta.

En la terminal del curso puedes probarlo: `dbt init mi_proyecto`, `cd mi_proyecto` y `dbt run` construyen un primer modelo de ejemplo.

## Qué es cada cosa

Un proyecto dbt es **una carpeta con archivos de texto**: SQL para los modelos y YAML para la configuración. No hay nada "instalado en la base": todo vive en tu repositorio Git y dbt lo convierte en tablas y vistas cuando lo ejecutas. Hay dos archivos de configuración que conviene no confundir:

| Archivo | Qué define | Dónde vive | ¿Va a Git? |
|---|---|---|---|
| `dbt_project.yml` | **Qué** construir: nombre del proyecto, carpetas, materializaciones por defecto | En la raíz del proyecto | **Sí** |
| `profiles.yml` | **Dónde** construirlo: la conexión a tu motor (host, usuario, token, esquema) | En `~/.dbt/` (tu carpeta personal) | **No** (tiene credenciales) |

:::analogia El plano y la dirección de la obra
`dbt_project.yml` es el plano de la casa: qué habitaciones hay y cómo son. `profiles.yml` es la dirección del terreno y la llave del portón. El mismo plano se puede construir en el terreno de pruebas (dev) o en el definitivo (prod) cambiando solo la dirección.
:::

## Estructura de carpetas

```text
tienda_andina/
├── dbt_project.yml          # configuración del proyecto
├── models/
│   ├── staging/             # 1 modelo por tabla de origen: renombrar, tipar, limpiar
│   │   ├── _sources.yml
│   │   ├── stg_pedidos.sql
│   │   └── stg_clientes.sql
│   ├── intermediate/        # lógica reutilizable (joins, enriquecimientos)
│   └── marts/               # modelos finales para el negocio (hechos y dimensiones)
│       ├── fct_ventas.sql
│       ├── dim_clientes.sql
│       └── _marts.yml       # tests y documentación
├── seeds/                   # CSV pequeños que se cargan como tablas (dbt seed)
├── snapshots/               # historiales SCD tipo 2
├── macros/                  # funciones Jinja reutilizables
├── tests/                   # tests "singulares" (SQL)
└── packages.yml             # dependencias (por ejemplo dbt_utils)
```

### Las tres capas de modelos

La convención de dbt Labs, usada en casi todos los proyectos:

| Capa | Prefijo | Qué hace | Regla |
|---|---|---|---|
| **staging** | `stg_` | Un modelo por tabla de origen: renombrar columnas, convertir tipos, limpiar formatos | Sin joins ni agregaciones; nada de lógica de negocio |
| **intermediate** | `int_` | Pasos de lógica reutilizable: joins, enriquecimientos, cálculos intermedios | No los consume el negocio directamente |
| **marts** | `fct_` / `dim_` | Las tablas finales: hechos y dimensiones listos para BI | Nombres y métricas de negocio |

Es la misma idea que bronze → silver → gold, aplicada dentro del warehouse.

## dbt_project.yml

```yaml norun
name: tienda_andina
version: "1.0.0"
profile: tienda_andina          # qué conexión de profiles.yml usar

models:
  tienda_andina:
    staging:
      +materialized: view       # todo staging como vistas
      +schema: staging
    marts:
      +materialized: table      # marts como tablas
      +schema: marts
```

Los `+` delante de `materialized` y `schema` indican que es una configuración que se **aplica a toda la carpeta** (y sus subcarpetas). Un modelo puede sobrescribirla individualmente con `{{ config(materialized='table') }}` al principio del archivo.

## profiles.yml: la conexión (¡fuera del repo!)

Vive en `~/.dbt/profiles.yml` porque tiene credenciales:

```yaml norun
tienda_andina:
  target: dev
  outputs:
    dev:
      type: databricks
      host: adb-1234567890123456.7.azuredatabricks.net
      http_path: /sql/1.0/warehouses/abc123
      catalog: dev
      schema: dbt_ana            # cada dev trabaja en su propio esquema
      token: "{{ env_var('DATABRICKS_TOKEN') }}"
    prod:
      type: databricks
      host: adb-1234567890123456.7.azuredatabricks.net
      http_path: /sql/1.0/warehouses/abc123
      catalog: prod
      schema: analytics
      token: "{{ env_var('DATABRICKS_TOKEN_PROD') }}"
```

:::tip Entornos
Con `--target` eliges a dónde escribir: `dbt run` (dev, por defecto) o `dbt run --target prod`. Así cada desarrollador prueba en su esquema sin tocar producción.
:::

## Recorre el proyecto en la terminal

```bash
cd tienda_dbt
ls
cat dbt_project.yml
ls models/staging models/marts
cat models/staging/stg_ventas.sql
cat models/schema.yml
```

Con `code models/marts/top_clientes.sql` puedes abrir un modelo en el editor, cambiarlo, guardarlo (Ctrl+S) y volver a ejecutar `dbt run -s top_clientes`.

## El detalle que confunde a todos: `+schema`

Con `+schema: staging` uno espera que los modelos queden en un esquema llamado `staging`. **No es así**. La documentación oficial explica que dbt **concatena** el esquema del perfil (el *target schema*) con el que pusiste:

| Esquema del perfil (`schema:` en profiles.yml) | `+schema` del modelo | Esquema donde se crea |
|---|---|---|
| `dbt_ana` (dev) | ninguno | `dbt_ana` |
| `dbt_ana` (dev) | `staging` | `dbt_ana_staging` |
| `analytics` (prod) | `marts` | `analytics_marts` |

¿Por qué? Porque si cada desarrollador escribiera directamente en `staging`, todos pisarían las tablas de todos. Al anteponer el esquema personal, Ana trabaja en `dbt_ana_staging` y Luis en `dbt_luis_staging`, sin chocar.

Esa lógica vive en una macro llamada `generate_schema_name`. Si en producción quieres los nombres "limpios" (`staging`, `marts`), se sobrescribe esa macro en `macros/` para que en el target `prod` use solo el esquema personalizado. Es una de las primeras cosas que se configuran en un proyecto real.

:::errores
- **Subir `profiles.yml` a Git**: expone el token de la base. Va en `~/.dbt/` y en el repositorio solo se usa `env_var('...')`.
- **Instalar `dbt-core` sin adaptador**: `dbt debug` dice que no encuentra el tipo de conexión.
- **Correr dbt desde la carpeta equivocada**: el error `No dbt_project.yml found` significa que no estás dentro del proyecto.
- **Sangría de YAML con tabulaciones**: YAML exige espacios; un tab rompe el archivo.
- **Sorprenderse por `dbt_ana_staging`**: es el comportamiento normal de `+schema` (ver arriba).
:::

:::trabajo
- El primer día en un equipo de datos suele ser: clonar el repositorio con Git, crear el entorno virtual, instalar las dependencias (`pip install -r requirements.txt` y `dbt deps`), pedir un token y armar tu `profiles.yml` con **tu** esquema de desarrollo, y correr `dbt debug` y `dbt build -s staging`.
- En dbt Cloud (la plataforma de dbt Labs) la conexión se configura en la web y no hay `profiles.yml`, pero el resto del proyecto es idéntico.
:::

:::entrevista "¿Qué diferencia hay entre dbt_project.yml y profiles.yml?"
`dbt_project.yml` define qué se construye y cómo: nombre del proyecto, carpetas y configuraciones por defecto como la materialización; se versiona en Git. `profiles.yml` define dónde se construye: la conexión a la base y las credenciales para cada entorno (dev, prod); vive fuera del repositorio porque tiene secretos. El campo `profile:` del primero dice qué perfil del segundo usar, y `--target` elige el entorno.
:::

## Ejercicios

:::ejercicio cli
Instala dbt con el adaptador de **Databricks**.
```respuesta
pip install dbt-databricks
pip3 install dbt-databricks
python -m pip install dbt-databricks
```
:::

:::ejercicio cli
Crea un proyecto dbt llamado `tienda_andina`.
```respuesta
dbt init tienda_andina
```
:::

:::ejercicio cli
Verifica que la conexión y la configuración del proyecto funcionan.
```respuesta
dbt debug
```
```salida
Running with dbt=1.9.0
...
  Connection test: [OK connection ok]
All checks passed!
```
```setup
cd ~/tienda_dbt
```
:::

:::ejercicio quiz
¿Por qué `profiles.yml` normalmente NO se guarda en el repositorio?

- [ ] Porque dbt no lo permite
- [x] Porque contiene credenciales y datos de conexión de cada persona/entorno
- [ ] Porque es muy grande
- [ ] Porque se genera solo
:::
