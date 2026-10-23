---
titulo: Jinja y macros
nivel: Avanzado
duracion: 35
resumen: Variables, bucles y condicionales en SQL, macros reutilizables, var() y dbt_utils.
---

dbt usa **Jinja**, un lenguaje de plantillas de Python, para generar SQL. Hay tres tipos de marcas:

| Marca | Para qué | Ejemplo |
|---|---|---|
| `{{ ... }}` | **Imprime** el resultado de una expresión | `{{ ref('stg_pedidos') }}` |
| `{% ... %}` | **Lógica**: if, for, set, macro | `{% for c in canales %}` |
| `{# ... #}` | Comentario (no aparece en el SQL compilado) | `{# TODO #}` |

## Variables y bucles: generar SQL repetitivo

Un pivot de ventas por canal, sin escribir cuatro veces lo mismo:

```dbt
{% set canales = ['web', 'app', 'tienda', 'telefono'] %}

select
    strftime('%Y', fecha_pedido) as anio,
    {% for canal in canales %}
    sum(case when canal = '{{ canal }}' then 1 else 0 end) as pedidos_{{ canal }}{{ "," if not loop.last }}
    {% endfor %}
from {{ ref('stg_pedidos') }}
group by anio
order by anio
```

Mira el **SQL compilado** después de ejecutarlo: Jinja escribió el código por ti.

## Condicionales

```dbt
{% set incluir_cancelados = false %}

select estado, count(*) as n
from {{ ref('stg_pedidos') }}
{% if not incluir_cancelados %}
where estado <> 'cancelado'
{% endif %}
group by estado
```

## var(): parámetros del proyecto

```yaml norun
# dbt_project.yml
vars:
  fecha_inicio: '2024-01-01'
```

```sql norun
where fecha_pedido >= '{{ var("fecha_inicio") }}'
```

Se puede sobrescribir al ejecutar: `dbt run --vars '{fecha_inicio: 2024-06-01}'`.

## Macros: funciones de SQL reutilizables

Una **macro** es una función Jinja que devuelve SQL. Se guarda en `macros/` y se usa en cualquier modelo:

```dbt
{% macro importe_neto(cantidad, precio, descuento) -%}
    round({{ cantidad }} * {{ precio }} * (1 - {{ descuento }}), 2)
{%- endmacro %}

select detalle_id, {{ importe_neto('cantidad', 'precio_unitario', 'descuento') }} as importe
from {{ source('tienda', 'detalle_pedidos') }}
limit 5
```

(En un proyecto real la macro va en `macros/importe_neto.sql`; aquí la ponemos arriba del modelo para que puedas probarla.)

:::tip dbt_utils
El paquete **dbt_utils** trae macros listas: `generate_surrogate_key`, `date_spine` (calendario), `pivot`, `union_relations`, `star` (todas las columnas menos algunas), etc. Se instala en `packages.yml` y `dbt deps`.
:::

## Ejercicios

:::ejercicio dbt
Usando `{% set %}` y un bucle `{% for %}`, escribe un modelo que, **por país** de `stg_clientes`, cuente los clientes de cada segmento en columnas `n_consumidor`, `n_pyme` y `n_corporativo`. Columnas: `pais`, `n_consumidor`, `n_pyme`, `n_corporativo`.
```sql inicial
{% set segmentos = ['Consumidor', 'Pyme', 'Corporativo'] %}

select
    pais,
    -- tu bucle aquí
from {{ ref('stg_clientes') }}
group by pais
```
```sql solucion
{% set segmentos = ['Consumidor', 'Pyme', 'Corporativo'] %}

select
    pais,
    {% for s in segmentos %}
    sum(case when segmento = '{{ s }}' then 1 else 0 end) as n_{{ s | lower }}{{ "," if not loop.last }}
    {% endfor %}
from {{ ref('stg_clientes') }}
group by pais
```
```pista
Dentro del bucle: `sum(case when segmento = '{{ s }}' then 1 else 0 end) as n_{{ s | lower }}` y una coma si no es el último (`loop.last`).
```
:::

:::ejercicio dbt
Escribe la macro `margen_pct(precio, costo)` que genere `round((precio - costo) / precio * 100, 1)` y úsala en un modelo que devuelva `producto_id`, `nombre` y `margen_pct` desde `source('tienda', 'productos')`.
```sql inicial
{% macro margen_pct(precio, costo) -%}
    {# escribe aquí el SQL de la macro #}
{%- endmacro %}

select producto_id, nombre, {{ margen_pct('precio', 'costo') }} as margen_pct
from {{ source('tienda', 'productos') }}
```
```sql solucion
{% macro margen_pct(precio, costo) -%}
    round(({{ precio }} - {{ costo }}) / {{ precio }} * 100, 1)
{%- endmacro %}

select producto_id, nombre, {{ margen_pct('precio', 'costo') }} as margen_pct
from {{ source('tienda', 'productos') }}
```
:::

:::ejercicio dbt
Usa la macro `limpiar_texto` (ya definida, mírala con 💡) para devolver `cliente_id`, `nombre` y `ciudad` **limpios** desde `source('tienda', 'clientes_crudo')`, solo de los registros con email.
```sql setup
{% macro limpiar_texto(col) -%}
    lower(trim({{ col }}))
{%- endmacro %}
```
```sql solucion
select cliente_id,
       {{ limpiar_texto('nombre') }} as nombre,
       {{ limpiar_texto('ciudad') }} as ciudad
from {{ source('tienda', 'clientes_crudo') }}
where email is not null
```
```pista
La macro es: `{% macro limpiar_texto(col) -%} lower(trim({{ col }})) {%- endmacro %}`. Úsala así: `{{ limpiar_texto('nombre') }} as nombre`.
```
:::
