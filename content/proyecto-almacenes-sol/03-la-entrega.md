---
titulo: La entrega - la dimensión SCD2, las ventas diarias y la revisión
nivel: Avanzado
duracion: 20
resumen: Las columnas exactas de sol.silver.dim_producto, sol.gold.ventas_diarias y sol.gold.cumplimiento_semanal, y la revisión automática contra el ERP, las cajas y la planilla.
objetivos: Construir una dimensión SCD tipo 2 desde fotos diarias | Calcular margen con el costo histórico | Deduplicar ventas que llegan repetidas
prerrequisitos: proyecto-almacenes-sol-fuentes-y-accesos
autoevaluacion: ¿Sabes qué valido_desde lleva una versión nueva? | ¿Sabes con qué costo se calcula el margen de un día?
---

## sol.silver.dim_producto

`sku`, `nombre`, `categoria`, `precio`, `costo`, `valido_desde`, `valido_hasta`, `vigente`.

- Una fila por **versión**. Cuando en la foto de un día cambia el precio, el costo o la categoría de un producto respecto de la foto anterior, se cierra la versión anterior y empieza una nueva.
- `valido_desde` de una versión nueva = el día del cambio (el día de la foto que lo vio por primera vez).
- La primera foto que saques es la versión inicial de cada producto.
- Exactamente **una** versión `vigente` por producto, igual al ERP de hoy.

## sol.gold.ventas_diarias

`fecha`, `sucursal` (código), `tickets`, `ventas_netas`, `margen_bruto`. Desde el día de tu primera foto del ERP (antes no tienes los costos).

## sol.gold.cumplimiento_semanal

`semana_desde` (lunes), `sucursal`, `ventas`, `meta`, `cumplimiento_pct`. Al menos la última semana cerrada.

## La revisión

<div data-sol="revisar"></div>

:::tip
La revisión compara contra la historia que **tus** fotos podían ver. Si un día no sacaste la foto, no se te pide lo que pasó ese día (pero en el tablero alguien va a preguntar por qué falta).
:::

:::real En tu computadora y en la web real
La dimensión **SCD tipo 2** guarda la historia de cada producto. En Databricks real se arma con `MERGE` (o con `APPLY CHANGES` en un pipeline declarativo). Antes del pull request, verifica en el SQL Editor que cada producto tenga una sola fila vigente.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio del proyecto y úsalas en el README.

- `03-scd2.png`: un producto con dos versiones en la dimensión (vigente y anterior).
- `03-ventas.png`: las ventas diarias y el cumplimiento semanal.

Antes de publicar, tapa con un rectángulo los correos, los IDs de suscripción y de tenant, los nombres de cuentas reales y cualquier clave o token.
:::

## Resumen

- SCD tipo 2 desde fotos diarias: comparar cada foto con la anterior.
- Ventas sin anulados ni repetidos; margen con el costo vigente ese día.
- Cumplimiento por semana de lunes a domingo.
