---
titulo: El pedido - una cadena de supermercados que no sabe cuánto gana
nivel: Avanzado
duracion: 25
resumen: Almacenes del Sol tiene 8 sucursales, un ERP viejo que pisa los precios todas las noches, cajas que mandan las ventas al día siguiente y una planilla de metas que mantiene una persona a mano. Dirección quiere ventas, margen y cumplimiento de metas. El pedido, sin paso a paso.
objetivos: Entender por qué un sistema sin historia obliga a guardar fotos diarias | Planificar una dimensión lentamente cambiante (SCD tipo 2) | Unir ventas, costos y metas de tres fuentes distintas
prerrequisitos: proyecto-cuentas-claras-el-pedido
autoevaluacion: ¿Sabes qué es una SCD tipo 2 y para qué sirve? | ¿Sabes por qué el margen de la semana pasada no se puede calcular con el costo de hoy? | ¿Sabes qué riesgo tiene leer una planilla que edita una persona?
---

:::escenario Jueves, 8:30 · Almacenes del Sol
Almacenes del Sol es una cadena de 8 supermercados en tres ciudades. Las ventas salen de las **cajas** (un sistema de punto de venta en cada sucursal), los productos, precios y costos viven en un **ERP** de hace quince años y las metas de venta las arma **Planeamiento** en una planilla. Hasta hoy, el informe de los lunes lo hacía una persona copiando y pegando.
:::

## Los pedidos

> **Dirección:** quiero ver, por sucursal y por día, cuánto vendimos, cuántos tickets hubo y cuánto margen nos dejó. Y los lunes, quién llegó a la meta de la semana.

> **Comercial:** cada vez que discutimos un margen alguien pregunta "¿cuánto costaba esto la semana pasada?" y nadie sabe. El ERP solo muestra el precio de hoy.

> **Sistemas:** el ERP es un PostgreSQL 9.6 en la oficina central. Les damos un usuario de solo lectura. No le pidan que guarde historia: no la guarda, y no lo vamos a tocar.

## Lo que hay que entregar

| Entrega | Qué es |
|---|---|
| `sol.silver.dim_producto` | La historia de cada producto: una fila por versión (precio, costo y categoría) con `valido_desde`, `valido_hasta` y `vigente` |
| `sol.gold.ventas_diarias` | Por fecha y sucursal: tickets, ventas netas y margen bruto |
| `sol.gold.cumplimiento_semanal` | Por semana y sucursal: ventas, meta y % de cumplimiento |

Las fuentes y las reglas están en [Fuentes y accesos](#/l/proyecto-almacenes-sol-fuentes-y-accesos).

:::trabajo Si la fuente no guarda historia, la historia la guardas tú
El ERP te muestra **el presente**. Si hoy sube el costo del aceite, mañana ya no hay forma de saber cuánto costaba ayer. La única salida es sacar una **foto** (snapshot) del catálogo **todos los días** y comparar cada foto con la anterior. Un día sin foto es un día de historia perdido para siempre: por eso esto no puede depender de que alguien se acuerde.
:::

:::analogia
Es como la libreta de precios de un almacén de barrio: si el dueño borra el precio viejo y escribe el nuevo encima, nadie puede saber después cuánto ganó el mes pasado. Si en vez de borrar tacha y anota la fecha, tiene la historia. Una SCD tipo 2 es tachar y anotar la fecha.
:::

## Ejercicios

:::ejercicio quiz
El costo de la yerba subió el martes. El miércoles calculas el margen del lunes con la tabla `productos` del ERP. ¿Qué pasa?
- [ ] Da bien: el ERP tiene el costo correcto
- [x] Da mal: usa el costo de hoy, más alto que el del lunes, y el margen del lunes aparece más bajo de lo que fue
- [ ] Da error
- [ ] Da bien si se redondea
:::

:::ejercicio quiz
En una SCD tipo 2, ¿qué pasa cuando cambia el precio de un producto?
- [ ] Se actualiza la fila existente
- [x] Se cierra la versión anterior (valido_hasta, vigente = false) y se agrega una fila nueva vigente desde ese día
- [ ] Se borra el producto y se vuelve a crear
- [ ] Se agrega una columna precio_anterior
:::

## Resumen

- Tres fuentes: el **ERP** (solo el presente), las **cajas** (tickets al día siguiente) y la **planilla** de Planeamiento.
- Sin historia en la fuente, hay que **sacar fotos diarias** y construir una SCD tipo 2.
- El margen de un día se calcula con el costo **de ese día**.
