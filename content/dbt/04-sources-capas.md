---
titulo: Sources, seeds y las capas del proyecto
nivel: Intermedio
duracion: 30
resumen: Declarar fuentes con source(), freshness, seeds y cómo organizar staging, intermediate y marts.
---

## source(): el punto de entrada

Los datos crudos que **no** crea dbt (cargados por Fivetran, ADF, Auto Loader…) se declaran como **sources** en un YAML, y se leen con `{{ source('nombre_fuente', 'tabla') }}`:

```yaml norun
# models/staging/_sources.yml
version: 2
sources:
  - name: tienda
    database: prod            # en Databricks: el catálogo
    schema: bronze
    tables:
      - name: pedidos
        loaded_at_field: _fecha_ingesta
        freshness:
          warn_after: {count: 12, period: hour}
          error_after: {count: 24, period: hour}
      - name: clientes
      - name: detalle_pedidos
```

Ventajas: el linaje empieza en la fuente, puedes **probar** las fuentes y verificar su **frescura** con `dbt source freshness` (¿llegaron datos nuevos en las últimas 24 horas?).

## Un modelo de staging típico

Staging = **1 modelo por tabla de origen**, con transformaciones mínimas: renombrar, castear, limpiar. Nada de joins ni agregaciones.

```dbt
-- models/staging/stg_tienda__clientes.sql
with fuente as (
    select * from {{ source('tienda', 'clientes') }}
),

renombrado as (
    select
        cliente_id,
        trim(nombre) || ' ' || trim(apellido)  as nombre_completo,
        lower(trim(email))                     as email,
        nullif(trim(telefono), '')             as telefono,
        ciudad,
        pais,
        segmento,
        date(fecha_registro)                   as fecha_registro
    from fuente
)

select * from renombrado
```

## Las tres capas

| Capa | Materialización típica | Qué hace | Ejemplo |
|---|---|---|---|
| **staging** | view | Limpieza 1:1 de cada fuente | `stg_tienda__pedidos` |
| **intermediate** | ephemeral / view | Lógica reutilizable, joins, pasos complejos | `int_pedidos_con_totales` |
| **marts** | table / incremental | Modelos para el negocio: hechos y dimensiones | `fct_ventas`, `dim_clientes` |

:::tip Regla de oro
`source()` solo aparece en **staging**. Todo lo demás usa `ref()`. Así, si una fuente cambia, solo tocas un modelo.
:::

## Seeds: pequeños CSV versionados

Para tablas de referencia que cambian poco (mapeos de países, feriados, metas de ventas), pon un CSV en `seeds/` y ejecuta `dbt seed`. Se usan con `ref()` como cualquier modelo.

```text
seeds/regiones.csv
pais,region
Argentina,Cono Sur
Chile,Cono Sur
México,Norteamérica
```

## Ejercicios

En estos ejercicios, las fuentes `tienda` apuntan a las tablas originales: `{{ source('tienda', 'pedidos') }}` se compila como `main.pedidos` (`main` es el esquema de SQLite; en Databricks verías algo como `prod.bronze.pedidos`).

:::ejercicio dbt
Escribe el modelo de staging `stg_tienda__productos` a partir de `source('tienda', 'productos')`: `producto_id`, `nombre` renombrado a `producto`, `marca`, `precio`, `costo`, el margen unitario `precio - costo` como `margen` (redondeado a 2) y `activo = 1` como `esta_activo`.
```sql solucion
with fuente as (
    select * from {{ source('tienda', 'productos') }}
)

select
    producto_id,
    nombre as producto,
    marca,
    precio,
    costo,
    round(precio - costo, 2) as margen,
    activo = 1 as esta_activo
from fuente
```
:::

:::ejercicio dbt
Escribe `stg_tienda__pagos` desde `source('tienda', 'pagos')` con `pago_id`, `pedido_id`, `fecha_pago`, `monto` y un booleano `es_aprobado` (`estado = 'aprobado'`). Luego, en el **mismo archivo** pero como un modelo intermedio en CTE, quédate solo con el **último pago aprobado de cada pedido**: devuelve `pedido_id`, `fecha_pago`, `monto`.
```sql solucion
with pagos as (
    select pago_id, pedido_id, fecha_pago, monto, estado = 'aprobado' as es_aprobado
    from {{ source('tienda', 'pagos') }}
),

numerados as (
    select *, row_number() over (partition by pedido_id order by fecha_pago desc, pago_id desc) as rn
    from pagos
    where es_aprobado
)

select pedido_id, fecha_pago, monto from numerados where rn = 1
```
:::

:::ejercicio quiz
¿En qué capa de un proyecto dbt debería aparecer `{{ source(...) }}`?

- [x] Solo en staging
- [ ] En todos los modelos
- [ ] Solo en marts
- [ ] En los tests
:::
