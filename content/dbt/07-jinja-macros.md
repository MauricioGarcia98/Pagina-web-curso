---
titulo: Jinja y macros
nivel: Avanzado
duracion: 50
resumen: Variables, bucles y condicionales en SQL, macros reutilizables, var() y dbt_utils.
---

Hasta ahora tus modelos eran SQL casi puro, con algún `{{ ref() }}`. Pero ese `{{ }}` es la punta de algo mucho más potente: dbt pasa cada modelo por **Jinja**, un lenguaje de plantillas de Python, **antes** de mandarlo al warehouse. Con Jinja puedes generar SQL repetitivo con un bucle, cambiar el SQL según el entorno y escribir **macros**: funciones que devuelven pedazos de SQL y se reutilizan en todo el proyecto.

## Cómo funciona: plantilla → SQL compilado

dbt trabaja en dos pasos:

```text
models/ventas.sql          ──(1) Jinja compila──►   target/compiled/.../ventas.sql   ──(2) se ejecuta──►  warehouse
(SQL + {{ }} {% %})                                  (SQL puro, sin nada de Jinja)
```

El warehouse **nunca ve Jinja**: solo recibe el SQL ya compilado. Por eso, cuando algo falla, lo primero es mirar el SQL compilado (`dbt compile`, o el desplegable "Ver SQL compilado" que aparece al ejecutar un ejemplo en este curso). Ahí ves exactamente lo que se ejecutó.

:::analogia Jinja es una combinación de correspondencia
Es como el "combinar correspondencia" de Word: escribes una carta con huecos (`Estimado {{ nombre }}`) y el programa genera una carta por cada persona. dbt hace lo mismo con SQL: escribes una plantilla y Jinja genera el SQL final.
:::

## Las tres marcas de Jinja

| Marca | Para qué | Ejemplo | ¿Deja algo en el SQL? |
|---|---|---|---|
| `{{ ... }}` | **Imprime** el resultado de una expresión | `{{ ref('stg_pedidos') }}` | Sí: el valor |
| `{% ... %}` | **Lógica**: if, for, set, macro | `{% for c in canales %}` | No |
| `{# ... #}` | Comentario | `{# TODO: sacar el filtro #}` | No (a diferencia de `--`, no llega al warehouse) |

Una forma de recordarlo: las **llaves dobles** "dicen" algo y el **porcentaje** "hace" algo.

## Variables y bucles: generar SQL repetitivo

Un caso clásico es pivotar: convertir los valores de una columna (los canales) en columnas. En SQL a mano tendrías que escribir un `sum(case when ...)` por cada canal, y si mañana aparece un canal nuevo, agregar otra línea. Con Jinja escribes la lista **una vez**:

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

Ejecútalo y abre **Ver SQL compilado**. Jinja escribió esto por ti:

```sql norun
select
    strftime('%Y', fecha_pedido) as anio,
    sum(case when canal = 'web' then 1 else 0 end) as pedidos_web,
    sum(case when canal = 'app' then 1 else 0 end) as pedidos_app,
    sum(case when canal = 'tienda' then 1 else 0 end) as pedidos_tienda,
    sum(case when canal = 'telefono' then 1 else 0 end) as pedidos_telefono
from main.stg_pedidos
group by anio
order by anio
```

Las piezas, una por una:

- **`{% set canales = [...] %}`** crea una variable de Jinja. La lista usa sintaxis de Python: corchetes y textos entre comillas.
- **`{% for canal in canales %} ... {% endfor %}`** repite lo que está adentro una vez por elemento. En cada vuelta, `canal` vale `'web'`, después `'app'`, y así.
- **`'{{ canal }}'`**: las comillas simples son del SQL (el valor es un texto) y `{{ canal }}` imprime el valor de la variable. El resultado es `'web'`.
- **`pedidos_{{ canal }}`** arma el nombre de la columna: `pedidos_web`.
- **`{{ "," if not loop.last }}`** pone una coma después de cada columna **salvo la última**. Sin esto, el SQL terminaría con `pedidos_telefono,` seguido de `from`, y daría un error de sintaxis.

### La variable `loop`

Dentro de un `for`, Jinja te da una variable especial `loop`:

| Expresión | Valor |
|---|---|
| `loop.index` | Número de vuelta, empezando en 1 |
| `loop.index0` | Número de vuelta, empezando en 0 |
| `loop.first` | `True` en la primera vuelta |
| `loop.last` | `True` en la última vuelta |
| `loop.length` | Cantidad total de vueltas |

### Filtros

Un **filtro** transforma un valor con `|`: `{{ 'Pyme' | lower }}` imprime `pyme`. Los más útiles: `lower`, `upper`, `replace('a', 'b')`, `join(', ')` (une una lista) y `default('x')` (valor si no hay ninguno).

```recorrido
titulo: Un bucle de Jinja, compilado línea por línea
estacion plantilla: La plantilla | icono=codigo
estacion set: set | icono=etiqueta
estacion for: for | icono=flujo
estacion sql: SQL compilado | icono=transformar
estacion res: Resultado | icono=check
paso plantilla: Lo que escribes
En vez de copiar la misma línea cuatro veces, un bucle la genera por cada canal.
>>> sql
{% set canales = ['web', 'app', 'tienda', 'telefono'] %}
select
    strftime('%Y', fecha_pedido) as anio,
    {% for c in canales %}
    sum(case when canal = '{{ c }}' then 1 else 0 end) as pedidos_{{ c }}
    {%- if not loop.last %},{% endif %}
    {% endfor %}
from {{ ref('stg_pedidos') }}
group by anio
paso set: {% set %} define una lista
Las marcas `{% %}` son **instrucciones** de Jinja: no aparecen en el SQL final.
>>> texto
canales = ['web', 'app', 'tienda', 'telefono']
paso for: {% for %} repite el bloque
En cada vuelta, `{{ c }}` se reemplaza por el canal de esa vuelta. `loop.last` evita la coma después de la última columna.
>>> texto
vuelta 1: c = 'web'      → … as pedidos_web,
vuelta 2: c = 'app'      → … as pedidos_app,
vuelta 3: c = 'tienda'   → … as pedidos_tienda,
vuelta 4: c = 'telefono' → … as pedidos_telefono
paso sql: El SQL que llega a la base
La base nunca ve Jinja: recibe este SQL común. Lo ves con `dbt compile` o en `target/compiled/`.
>>> sql
select
    strftime('%Y', fecha_pedido) as anio,
    sum(case when canal = 'web' then 1 else 0 end) as pedidos_web,
    sum(case when canal = 'app' then 1 else 0 end) as pedidos_app,
    sum(case when canal = 'tienda' then 1 else 0 end) as pedidos_tienda,
    sum(case when canal = 'telefono' then 1 else 0 end) as pedidos_telefono
from main.stg_pedidos
group by anio
paso res: El resultado
Una columna por canal. Si mañana se agrega un canal, se cambia **una lista**, no cuatro líneas.
>>> tabla
anio,pedidos_web,pedidos_app,pedidos_tienda,pedidos_telefono
2022,1521,827,748,250
2023,1818,1004,885,314
2024,2061,1142,1012,418
```

## Condicionales

`{% if %}` incluye o saca pedazos de SQL según una condición:

```dbt
{% set incluir_cancelados = false %}

select estado, count(*) as n
from {{ ref('stg_pedidos') }}
{% if not incluir_cancelados %}
where estado <> 'cancelado'
{% endif %}
group by estado
```

Cambia `false` por `true` y mira cómo desaparece el `where` del SQL compilado.

El uso más común en proyectos reales es comparar con el **entorno** en el que corre dbt, `target.name`. Por ejemplo, para trabajar con menos datos en desarrollo:

```sql norun
select * from {{ source('tienda', 'eventos') }}
{% if target.name == 'dev' %}
where fecha >= current_date - 3      -- en dev, solo 3 días: más rápido y más barato
{% endif %}
```

## var(): parámetros del proyecto

Las **variables de proyecto** son parámetros que defines una vez en `dbt_project.yml` y lees en cualquier modelo con `var()`:

```yaml norun
# dbt_project.yml
vars:
  fecha_inicio: '2024-01-01'
  paises_activos: ['Chile', 'Perú', 'México']
```

```sql norun
where fecha_pedido >= '{{ var("fecha_inicio") }}'
  and pais in ('{{ var("paises_activos") | join("', '") }}')
```

Se pueden sobrescribir al ejecutar, sin tocar código: `dbt run --vars '{fecha_inicio: 2024-06-01}'`. Así es como Airflow le pasa la fecha del día a dbt (`--vars '{fecha: {{ ds }}}'`).

:::cuidado var() vs. set
`{% set %}` vive solo dentro de un archivo. `var()` es global para todo el proyecto y se puede cambiar desde la línea de comandos. Si un valor se repite en varios modelos o cambia entre ejecuciones, usa `var()`.
:::

## Macros: funciones de SQL reutilizables

Una **macro** es una función de Jinja que **devuelve SQL**. Se guarda en un archivo dentro de la carpeta `macros/` y queda disponible en **todos** los modelos del proyecto, sin importar nada.

¿Cuándo crear una? Cuando la misma fórmula aparece en dos o más modelos. Si mañana cambia la regla (por ejemplo, el importe neto tiene que restar también el impuesto), la cambias en un solo lugar.

```dbt
{% macro importe_neto(cantidad, precio, descuento) -%}
    round({{ cantidad }} * {{ precio }} * (1 - {{ descuento }}), 2)
{%- endmacro %}

select detalle_id, {{ importe_neto('cantidad', 'precio_unitario', 'descuento') }} as importe
from {{ source('tienda', 'detalle_pedidos') }}
limit 5
```

(En un proyecto real la macro va en `macros/importe_neto.sql`. Aquí la ponemos arriba del modelo para que puedas probarla.)

Cómo leerla:

1. `{% macro importe_neto(cantidad, precio, descuento) %}` define la macro y sus **parámetros**.
2. El cuerpo es el SQL que devuelve. Adentro, `{{ cantidad }}` se reemplaza por lo que le pases.
3. Al usarla, `{{ importe_neto('cantidad', 'precio_unitario', 'descuento') }}` le pasa **textos con nombres de columnas**. Por eso van entre comillas: la macro no recibe los datos, recibe pedazos de SQL. El resultado es `round(cantidad * precio_unitario * (1 - descuento), 2)`.

### El guion: `{%-` y `-%}`

El `-` junto al `%` **borra los espacios y saltos de línea** de ese lado. Sin él, la macro devolvería el SQL con saltos de línea alrededor, y el compilado quedaría desprolijo:

```text
select detalle_id,
    round(cantidad * precio_unitario * (1 - descuento), 2)
 as importe
```

No cambia el resultado, pero hace el SQL compilado más difícil de leer. En macros que se usan dentro de una línea, pon siempre `-%}` y `{%-`.

### Parámetros con valor por defecto

```sql norun
{% macro a_moneda(columna, decimales=2) -%}
    round({{ columna }}, {{ decimales }})
{%- endmacro %}

{{ a_moneda('total') }}         -- round(total, 2)
{{ a_moneda('total', 0) }}      -- round(total, 0)
```

## Paquetes: macros de la comunidad

No tienes que escribir todo desde cero. Los **paquetes** de dbt son proyectos con macros (y tests) listos para usar. Se declaran en `packages.yml` y se instalan con `dbt deps`:

```yaml norun
# packages.yml
packages:
  - package: dbt-labs/dbt_utils
    version: 1.3.0
```

:::tip dbt_utils
El paquete **dbt_utils** trae macros listas:
- `generate_surrogate_key(['pedido_id', 'linea'])`: una clave única a partir de varias columnas.
- `date_spine`: una tabla calendario, con una fila por día.
- `pivot`: lo que hiciste con el bucle, en una línea.
- `union_relations`: une tablas con columnas distintas.
- `star(from=ref('x'), except=['col'])`: todas las columnas menos algunas.
:::

Otros paquetes populares son `dbt_expectations` (tests de calidad al estilo Great Expectations) y `codegen` (genera el YAML de sources y staging por ti).

## Laboratorio: una macro de verdad en la terminal

Abre la terminal (⌨ Terminal) y crea la macro **en su propio archivo**, como en un proyecto real:

```bash norun
cd ~/tienda_dbt
mkdir -p macros
code macros/importe_neto.sql
```

`code` abre el editor. Pega la macro (las tres líneas de `{% macro importe_neto ... %}` hasta `{%- endmacro %}`) y guarda. Después crea un modelo que la use:

```bash norun
code models/staging/stg_importes.sql
```

```sql norun
select detalle_id, {{ importe_neto('cantidad', 'precio_unitario', 'descuento') }} as importe
from {{ source('tienda', 'detalle_pedidos') }}
```

Ahora compila, ejecuta y consulta:

```bash norun
dbt compile -s stg_importes      # mira el SQL que generó la macro
dbt run -s stg_importes
sqlite3 "SELECT * FROM stg_importes LIMIT 3"
```

En `dbt compile` vas a ver `round(cantidad * precio_unitario * (1 - descuento), 2)` en lugar de la llamada a la macro. Y el modelo no tuvo que importar nada: dbt lee todas las macros de `macros/` automáticamente.

:::experto Cuándo NO usar Jinja
Jinja es potente, pero un modelo lleno de `{% if %}` anidados se vuelve ilegible. La regla de la comunidad es: **SQL primero, Jinja cuando ahorra repetición real**. Si una macro se usa una sola vez, probablemente no hace falta.
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
