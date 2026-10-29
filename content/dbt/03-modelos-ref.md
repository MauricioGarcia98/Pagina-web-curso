---
titulo: Modelos y ref(): el corazón de dbt
nivel: Intermedio
duracion: 35
resumen: Escribir modelos, encadenarlos con ref(), el DAG de dependencias y el estilo de CTEs.
---

Un **modelo** es un archivo `.sql` con **un solo SELECT**. El nombre del archivo es el nombre del modelo: `models/marts/fct_ventas.sql` crea `fct_ventas`.

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
