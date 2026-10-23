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
