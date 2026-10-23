---
titulo: Sources, seeds y las capas del proyecto
nivel: Intermedio
duracion: 45
resumen: Declarar fuentes con source(), freshness, seeds y cómo organizar staging, intermediate y marts.
---

Un proyecto dbt real tiene decenas o cientos de modelos. Si cada uno lee las tablas crudas como quiere, el proyecto se vuelve inmanejable: cuando la fuente cambia una columna, hay que buscar y corregir 30 archivos. Esta lección explica las tres piezas que ponen orden: **sources** (de dónde vienen los datos), **seeds** (pequeñas tablas de referencia que tú mantienes) y las **capas** (staging, intermediate y marts).

## source(): el punto de entrada

dbt **no carga datos**: solo transforma lo que ya está en el warehouse. Las tablas crudas las dejó otra herramienta (Fivetran, Airbyte, Data Factory, Auto Loader o un script de Python). A esas tablas que dbt no creó se las llama **sources**, y se declaran en un archivo YAML:

```yaml norun
# models/staging/_sources.yml
version: 2
sources:
  - name: tienda              # nombre lógico que usarás en source('tienda', ...)
    database: prod            # en Databricks: el catálogo
    schema: bronze            # dónde están las tablas crudas
    tables:
      - name: pedidos
        loaded_at_field: _fecha_ingesta
        freshness:
          warn_after: {count: 12, period: hour}
          error_after: {count: 24, period: hour}
      - name: clientes
      - name: detalle_pedidos
```

Después, en los modelos, en vez de escribir el nombre real de la tabla usas:

```sql norun
select * from {{ source('tienda', 'pedidos') }}
-- dbt lo compila como:  select * from prod.bronze.pedidos
```

¿Por qué no escribir `prod.bronze.pedidos` directamente? Por cuatro razones:

1. **Un solo lugar para cambiar**: si mañana las tablas pasan a `prod.raw`, cambias una línea del YAML y no 30 modelos.
2. **Linaje completo**: en la documentación de dbt (`dbt docs`), el grafo empieza en las fuentes. Ves qué dashboards dependen de `bronze.pedidos`.
3. **Tests sobre la fuente**: puedes poner `unique` o `not_null` a las columnas de la fuente y detectar datos malos **antes** de transformarlos.
4. **Frescura**: `dbt source freshness` mira la columna `loaded_at_field` y responde "¿llegaron datos nuevos en las últimas X horas?". Con la configuración de arriba avisa (warn) si los últimos datos tienen más de 12 horas y falla (error) si tienen más de 24. Así te enteras de que la ingesta se cayó **antes** de publicar un dashboard con datos de hace tres días.

:::nota ¿Qué significa "sin frescura"?
Si una fuente no tiene `freshness`, dbt no la revisa. Pónsela a las tablas que se cargan seguido (pedidos, eventos) y no a las que casi no cambian (países).
:::

## Las tres capas

La convención que usa casi toda la comunidad dbt organiza los modelos en tres carpetas, cada una con una responsabilidad:

| Capa | Materialización típica | Qué hace | Qué **no** hace | Ejemplo |
|---|---|---|---|---|
| **staging** | view | Limpieza 1 a 1 de cada tabla de origen: renombrar, convertir tipos, limpiar textos | Joins, agregaciones, lógica de negocio | `stg_tienda__pedidos` |
| **intermediate** | ephemeral o view | Pasos reutilizables: joins, cálculos que usan varios marts | Exponerse al usuario final | `int_pedidos_con_totales` |
| **marts** | table o incremental | Las tablas que consume el negocio: hechos y dimensiones | Leer sources directamente | `fct_ventas`, `dim_clientes` |

El flujo siempre va en una dirección:

```text
sources ──► staging ──► intermediate ──► marts ──► dashboards, notebooks, ML
(crudo)     (limpio)     (combinado)      (listo para el negocio)
```

:::tip Regla de oro
`source()` solo aparece en **staging**. Todo lo demás usa `ref()`. Así, si una fuente cambia, solo tocas un modelo.
:::

### Convención de nombres

- **Staging**: `stg_<fuente>__<tabla>`, con **doble guion bajo** entre la fuente y la tabla: `stg_tienda__clientes`, `stg_stripe__pagos`. El doble guion permite que la fuente o la tabla tengan guiones bajos sin ambigüedad.
- **Intermediate**: `int_<qué hace>`: `int_pedidos_con_totales`.
- **Marts**: `fct_` para **hechos** (eventos que se cuentan o suman: ventas, pagos, visitas) y `dim_` para **dimensiones** (las cosas que describen esos eventos: clientes, productos, fechas).

## Un modelo de staging típico

Staging es **un modelo por tabla de origen**, con transformaciones mínimas. Nada de joins ni de agregaciones:

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

Qué hace cada línea y por qué:

| Transformación | Problema que resuelve |
|---|---|
| `trim(nombre) \|\| ' ' \|\| trim(apellido)` | Los sistemas de origen suelen guardar espacios sobrantes (`"Ana  "`) |
| `lower(trim(email))` | `Ana@Mail.com` y `ana@mail.com ` son el mismo correo: sin normalizar, un join por email falla |
| `nullif(trim(telefono), '')` | Un texto vacío no es un teléfono. Convertirlo en `NULL` hace que `count(telefono)` cuente bien |
| `date(fecha_registro)` | Asegura el tipo fecha, para poder filtrar y agrupar por día |

El patrón `with fuente as (...), renombrado as (...) select * from renombrado` es una convención de estilo: cada CTE es un paso con nombre y el `select` final queda trivial. Al leer un modelo ajeno, sabes dónde buscar cada cosa.

## Seeds: pequeños CSV versionados

A veces necesitas una tabla chica que **no viene de ningún sistema**: la región comercial de cada país, los feriados, las metas de ventas o la equivalencia entre códigos viejos y nuevos. La solución de dbt son los **seeds**: un CSV dentro de la carpeta `seeds/` del proyecto.

```text
seeds/regiones.csv
pais,region
Argentina,Cono Sur
Chile,Cono Sur
México,Norteamérica
```

- `dbt seed` lee cada CSV y lo carga como una tabla en el warehouse, con el nombre del archivo (`regiones`).
- Se usa con `ref('regiones')`, igual que un modelo, así que aparece en el linaje.
- Como el CSV está en Git, cada cambio queda revisado en un pull request.

:::cuidado Los seeds no son para cargar datos
Úsalos solo para tablas de **referencia chicas**, de cientos o pocos miles de filas, que cambian a mano. Para datos que llegan de un sistema (pedidos, clientes) usa una herramienta de ingesta y decláralos como source.
:::

## Laboratorio: seed + source + ref en la terminal

Vas a construir un mart que cuente clientes por región comercial usando las tres piezas. Abre la terminal (⌨ Terminal) y ejecuta paso a paso.

**1. Crea el seed** con la región de cada país:

```bash norun
cd ~/tienda_dbt
mkdir -p seeds
printf 'pais,region\nArgentina,Cono Sur\nChile,Cono Sur\nUruguay,Cono Sur\nParaguay,Cono Sur\nBolivia,Andina\nPerú,Andina\nEcuador,Andina\nColombia,Andina\nMéxico,Norteamérica\nCosta Rica,Centroamérica\nEspaña,Europa\n' > seeds/regiones.csv
dbt seed
```

Deberías ver `OK loaded seed file main.regiones [INSERT 11]`.

**2. Crea el modelo de staging**, que lee la fuente:

```bash norun
printf "select\n    cliente_id,\n    trim(nombre) || ' ' || trim(apellido) as nombre_completo,\n    lower(trim(email)) as email,\n    pais,\n    segmento\nfrom {{ source('tienda', 'clientes') }}\n" > models/staging/stg_tienda__clientes.sql
cat models/staging/stg_tienda__clientes.sql
```

**3. Crea el mart**, que une el staging con el seed usando `ref`:

```bash norun
printf "select\n    r.region,\n    count(*) as clientes\nfrom {{ ref('stg_tienda__clientes') }} c\njoin {{ ref('regiones') }} r on r.pais = c.pais\ngroup by r.region\norder by clientes desc\n" > models/marts/clientes_por_region.sql
```

**4. Construye y consulta:**

```bash norun
dbt run -s stg_tienda__clientes clientes_por_region
sqlite3 "SELECT * FROM clientes_por_region"
```

Resultado esperado:

| region | clientes |
|---|---|
| Cono Sur | 637 |
| Andina | 637 |
| Norteamérica | 387 |
| Europa | 300 |
| Centroamérica | 39 |

Prueba ahora a cambiar `Costa Rica,Centroamérica` por `Costa Rica,Norteamérica` en el CSV, y vuelve a correr `dbt seed` y `dbt run -s clientes_por_region`. El mart cambia sin tocar ningún SQL. Esa es la ventaja de tener la regla de negocio en un seed versionado.

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
