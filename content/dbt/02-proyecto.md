---
titulo: Instalación y estructura de un proyecto
nivel: Básico
duracion: 25
resumen: pip install, dbt init, dbt_project.yml, profiles.yml, dbt debug y la estructura de carpetas.
---

## Instalar dbt Core

```bash norun
python -m venv .venv && source .venv/bin/activate
pip install dbt-databricks        # instala dbt-core + el adaptador de Databricks
dbt --version
```

## Crear el proyecto

```bash norun
dbt init tienda_andina            # pregunta el adaptador y los datos de conexión
cd tienda_andina
dbt debug                         # verifica la conexión y la configuración
```

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
:::

:::ejercicio quiz
¿Por qué `profiles.yml` normalmente NO se guarda en el repositorio?

- [ ] Porque dbt no lo permite
- [x] Porque contiene credenciales y datos de conexión de cada persona/entorno
- [ ] Porque es muy grande
- [ ] Porque se genera solo
:::
