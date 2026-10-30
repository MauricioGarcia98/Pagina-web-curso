---
titulo: Modelos y ref(): el corazón de dbt
nivel: Intermedio
duracion: 35
resumen: Desde cero - qué es un modelo, qué es Jinja y qué significa compilar; ref() y source(), el DAG de dependencias, los selectores y el estilo de CTEs.
---

Un **modelo** es un archivo `.sql` con **un solo SELECT**. El nombre del archivo es el nombre del modelo: `models/marts/fct_ventas.sql` crea `fct_ventas`.

## Desde cero: qué escribes y qué ejecuta la base

Un modelo **no** lleva `CREATE TABLE`, ni `INSERT`, ni punto y coma al final: solo la consulta que describe el resultado que quieres. dbt agrega el resto (según la materialización, que verás en otra lección). Esa es la gran simplificación: tú piensas en **qué datos** quieres; dbt se ocupa de **cómo** guardarlos.

Dentro del SQL aparecen cosas entre llaves dobles, como `{{ ref('stg_pedidos') }}`. Eso no es SQL: es **Jinja**, un lenguaje de plantillas (el mismo que usan muchos sitios web para armar páginas). Funciona como un "buscar y reemplazar" inteligente:

- `{{ ... }}` significa "calcula esto y **escribe el resultado aquí**".
- `{% ... %}` significa "ejecuta esta instrucción" (un `if`, un `for`), sin escribir nada.

Antes de enviar la consulta a la base, dbt **compila** el archivo: ejecuta el Jinja y obtiene SQL puro. Ese SQL queda guardado en `target/compiled/` para que lo leas. Cuando algo falla, siempre conviene mirar el compilado: es lo que la base recibió de verdad.

```text
models/marts/ventas_por_canal.sql           target/compiled/.../ventas_por_canal.sql
--------------------------------            -----------------------------------------
from {{ ref('stg_pedidos') }} as p    ──▶   from main.stg_pedidos as p
```


## ref(): la función más importante

En lugar de escribir el nombre de la tabla, referencias otros modelos con `{{ ref('nombre_modelo') }}`:

```dbt
-- models/marts/ventas_por_canal.sql
select
    p.canal,
    count(distinct p.pedido_id) as pedidos,
    round(sum(d.importe), 2)    as ventas
from {{ ref('stg_pedidos') }} as p
join {{ ref('stg_detalle_pedidos') }} as d on d.pedido_id = p.pedido_id
where p.estado <> 'cancelado'
group by p.canal
```

Presiona ▶ Probar: verás el resultado y, abajo, el **SQL compilado**.

¿Por qué no escribir directamente `stg_pedidos`?

1. **Dependencias automáticas**: dbt lee todos los `ref()` y arma un **DAG**; sabe que `stg_pedidos` debe construirse antes que `ventas_por_canal`.
2. **Entornos**: `ref('stg_pedidos')` se compila como `dev.dbt_ana.stg_pedidos` en desarrollo y `prod.analytics.stg_pedidos` en producción. El mismo código sirve para ambos.
3. **Linaje y documentación**: dbt dibuja el grafo de qué modelo depende de cuál.

```text
source(tienda.pedidos) ─▶ stg_pedidos ─────────┐
source(tienda.detalle) ─▶ stg_detalle_pedidos ─┼─▶ ventas_por_canal
                                               └─▶ fct_ventas ─▶ ...
```

## ref() y source(): dos formas de nombrar una tabla

| Función | Para qué tabla | Ejemplo | Dónde se declara |
|---|---|---|---|
| `{{ ref('modelo') }}` | Una tabla que **construye dbt** (otro modelo, un seed o un snapshot) | `{{ ref('stg_pedidos') }}` | No hace falta declararla: basta con que exista el archivo |
| `{{ source('fuente', 'tabla') }}` | Una tabla que **ya existe** y que cargó otra herramienta (los datos crudos) | `{{ source('tienda', 'pedidos') }}` | En un `.yml` con `sources:` (lección siguiente) |

La regla de oro: **ningún modelo escribe el nombre de una tabla a mano**. Los modelos de staging leen con `source()`; todos los demás, con `ref()`. Si escribes `from pedidos` directamente, dbt no sabe que dependes de esa tabla, el DAG queda incompleto y el modelo puede ejecutarse antes de que sus datos estén listos.

```recorrido
titulo: Lo que escribes, lo que compila dbt y en qué orden lo ejecuta
estacion modelo: Tu modelo | icono=codigo
estacion compila: Compilar | icono=transformar
estacion dag: El DAG | icono=flujo
estacion run: dbt run | icono=chispa
estacion res: Las tablas | icono=check
paso modelo: Un modelo con ref()
`models/marts/top_clientes.sql` del proyecto de la terminal. No dice en qué esquema está `stg_ventas`: usa `ref()`.
>>> sql
{{ config(materialized='table') }}

select
    cliente_id,
    count(distinct pedido_id) as pedidos,
    round(sum(importe), 2)    as gasto
from {{ ref('stg_ventas') }}
group by cliente_id
order by gasto desc
limit 50
paso compila: dbt reemplaza ref() por el nombre real
`dbt compile` muestra el SQL que se va a ejecutar. `{{ ref('stg_ventas') }}` se convirtió en `main.stg_ventas`. En otro entorno (prod) sería otro esquema, **sin cambiar el archivo**.
>>> sql
-- dbt compile -s top_clientes
select
    cliente_id,
    count(distinct pedido_id) as pedidos,
    round(sum(importe), 2)    as gasto
from main.stg_ventas
group by cliente_id
order by gasto desc
limit 50
paso dag: Cada ref() es una flecha
Leyendo los `ref()` de todos los modelos, dbt arma el grafo de dependencias: sabe que `stg_ventas` tiene que existir **antes** que los dos marts.
>>> texto
stg_ventas ──▶ ventas_por_canal
           └─▶ top_clientes
paso run: dbt run respeta ese orden
Primero la vista de staging; después las dos tablas (que podrían construirse en paralelo).
>>> log
$ dbt run
Found 3 models
1 of 3 OK created sql view model main.stg_ventas
2 of 3 OK created sql table model main.ventas_por_canal [SELECT 4]
3 of 3 OK created sql table model main.top_clientes [SELECT 50]
Done. PASS=3 WARN=0 ERROR=0 SKIP=0 TOTAL=3
paso res: Tablas reales en la base
`top_clientes` ya es una tabla que cualquiera puede consultar. Sus primeras filas:
>>> tabla
cliente_id,pedidos,gasto
1882,32,54091.07
1630,25,51444.43
365,30,50034.86
```

## Qué es el DAG y por qué te importa

**DAG** significa *Directed Acyclic Graph* (grafo dirigido acíclico): un dibujo de cajas (modelos) unidas por flechas (dependencias), donde las flechas van siempre "hacia adelante" y **nunca forman un círculo**. dbt lo construye solo, leyendo los `ref()` de cada archivo. Te importa por tres razones:

1. **Orden de ejecución**: dbt ejecuta primero los modelos sin dependencias y después los que dependen de ellos; lo que no depende entre sí corre en **paralelo**.
2. **Ejecutar solo una parte**: con **selectores** reconstruyes un modelo y lo que lo rodea, sin correr todo el proyecto.
3. **Impacto de un cambio**: antes de modificar `stg_pedidos`, puedes ver qué modelos (y dashboards) dependen de él.

| Selector | Qué ejecuta |
|---|---|
| `dbt run -s fct_ventas` | Solo ese modelo |
| `dbt run -s +fct_ventas` | El modelo **y todo lo que necesita** (sus ancestros) |
| `dbt run -s fct_ventas+` | El modelo **y todo lo que depende de él** (descendientes) |
| `dbt run -s +fct_ventas+` | Ancestros, el modelo y descendientes |
| `dbt run -s staging` | Todos los modelos de la carpeta `staging` |
| `dbt build -s state:modified+` | Lo que cambió en tu rama y lo que depende de eso (CI) |

:::cuidado Referencias circulares
Si `a` usa `ref('b')` y `b` usa `ref('a')`, ya no es un DAG: dbt se niega a compilar con un error de *dependency cycle*. Casi siempre significa que falta un modelo intermedio que ambos deberían usar.
:::

Pruébalo con el proyecto de la terminal:

```bash
cd tienda_dbt
dbt ls -s +ventas_por_canal
dbt run -s ventas_por_canal
dbt run -s +top_clientes
```

## El estilo de dbt: CTEs de importación

La guía de estilo de dbt Labs recomienda empezar cada modelo **importando** sus dependencias en CTEs, y luego transformarlas en pasos con nombre:

```dbt
with pedidos as (
    select * from {{ ref('stg_pedidos') }}
),

lineas as (
    select * from {{ ref('stg_detalle_pedidos') }}
),

totales_por_pedido as (
    select pedido_id, sum(importe) as total, sum(cantidad) as unidades
    from lineas
    group by pedido_id
),

final as (
    select
        p.pedido_id,
        p.cliente_id,
        p.fecha_pedido,
        p.canal,
        p.estado,
        t.unidades,
        round(t.total, 2) as total
    from pedidos p
    join totales_por_pedido t using (pedido_id)
)

select * from final
```

:::tip Convenciones de nombres
- `stg_<fuente>__<tabla>`: staging (por ejemplo `stg_erp__pedidos`).
- `int_<descripcion>`: intermedios.
- `fct_<proceso>`: hechos (`fct_ventas`, `fct_pagos`).
- `dim_<entidad>`: dimensiones (`dim_clientes`, `dim_productos`).
:::

### Por qué los CTEs y no subconsultas

Un **CTE** (*Common Table Expression*) es una consulta con nombre que se define con `with nombre as (...)` y se usa más abajo como si fuera una tabla. El modelo de arriba se lee de arriba hacia abajo como una receta: "tomo los pedidos, tomo las líneas, calculo totales por pedido, junto todo". Con subconsultas anidadas, el mismo cálculo se lee de adentro hacia afuera y es mucho más difícil de revisar. El último CTE se llama `final` por convención, y el modelo termina con `select * from final`: así, para depurar, basta cambiar esa última línea por `select * from totales_por_pedido` y ver un paso intermedio.

:::errores
- **Terminar el modelo con `;`**: dbt envuelve tu consulta dentro de un `create ... as (...)` y el punto y coma la rompe en muchos motores.
- **Escribir el nombre de la tabla en vez de `ref()`**: funciona en tu entorno, pero el orden de ejecución queda mal y en producción apunta al esquema equivocado.
- **Dos archivos con el mismo nombre** en carpetas distintas: los nombres de modelo deben ser únicos en todo el proyecto.
- **Varios `SELECT` sueltos en un archivo**: un modelo es una sola consulta (puede tener muchos CTEs, pero un solo resultado).
- **Leer el error del SQL sin mirar el compilado**: el número de línea del error es el del SQL compilado, no el de tu archivo con Jinja.
:::

:::trabajo
- En las revisiones de código (*pull requests*) se mira que cada modelo tenga CTEs de importación arriba, nombres claros y un `final`. Es la guía de estilo que casi todos los equipos adoptan.
- `dbt ls -s +modelo+` y el grafo de `dbt docs` se usan antes de cambiar un modelo para saber a quién afecta: si un tablero importante depende de él, se avisa al dueño.
- Un modelo de más de 200 líneas suele dividirse en modelos `int_` más chicos, reutilizables y fáciles de probar.
:::

:::entrevista "¿Por qué usar ref() en lugar de escribir el nombre de la tabla?"
Porque `ref()` le dice a dbt que el modelo depende de otro: con eso arma el DAG y ejecuta en el orden correcto, en paralelo donde se puede. Además resuelve el nombre completo según el entorno (el esquema de desarrollo de cada persona o el de producción), así el mismo código sirve en todos lados, y permite el linaje en la documentación y la selección con `+modelo+`.
:::

## Ejercicios

En estos ejercicios usa siempre `{{ ref('...') }}` para referirte a los modelos `stg_*`.

:::ejercicio dbt
Escribe el modelo `dim_clientes` con `cliente_id`, `nombre_completo`, `pais`, `segmento` desde `stg_clientes`, solo para clientes con email.
```sql inicial
select
    -- columnas
from {{ ref('stg_clientes') }}
```
```sql solucion
select cliente_id, nombre_completo, pais, segmento
from {{ ref('stg_clientes') }}
where email is not null
```
:::

:::ejercicio dbt
Escribe el modelo `fct_pedidos`: una fila por pedido con `pedido_id`, `cliente_id`, `fecha_pedido`, `estado`, `unidades` (suma de cantidad) y `total` (suma de `importe`, redondeado a 2), uniendo `stg_pedidos` con `stg_detalle_pedidos`. Usa CTEs de importación.
```sql inicial
with pedidos as (
    select * from {{ ref('stg_pedidos') }}
),

lineas as (
    select * from {{ ref('stg_detalle_pedidos') }}
)

select ...
```
```sql solucion
with pedidos as (
    select * from {{ ref('stg_pedidos') }}
),

lineas as (
    select * from {{ ref('stg_detalle_pedidos') }}
),

totales as (
    select pedido_id, sum(cantidad) as unidades, round(sum(importe), 2) as total
    from lineas
    group by pedido_id
)

select p.pedido_id, p.cliente_id, p.fecha_pedido, p.estado, t.unidades, t.total
from pedidos p
join totales t on t.pedido_id = p.pedido_id
```
:::

:::ejercicio dbt
Escribe el modelo `clientes_valor`: para cada cliente de `stg_clientes`, el total gastado en pedidos `entregado` (`total_gastado`, redondeado a 2; **0** si no compró) y la fecha de su último pedido entregado (`ultimo_pedido`). Columnas: `cliente_id`, `nombre_completo`, `total_gastado`, `ultimo_pedido`.
```sql solucion
with clientes as (
    select * from {{ ref('stg_clientes') }}
),

pedidos as (
    select * from {{ ref('stg_pedidos') }} where estado = 'entregado'
),

lineas as (
    select * from {{ ref('stg_detalle_pedidos') }}
),

por_cliente as (
    select p.cliente_id, sum(l.importe) as total, max(p.fecha_pedido) as ultimo_pedido
    from pedidos p join lineas l on l.pedido_id = p.pedido_id
    group by p.cliente_id
)

select c.cliente_id, c.nombre_completo,
       round(coalesce(pc.total, 0), 2) as total_gastado,
       pc.ultimo_pedido
from clientes c
left join por_cliente pc on pc.cliente_id = c.cliente_id
```
```pista
LEFT JOIN desde clientes para no perder a los que no compraron, y `coalesce(total, 0)`.
```
:::
