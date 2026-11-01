---
titulo: Iteradores, RELATED y ranking - SUMX, AVERAGEX y RANKX
nivel: Intermedio
duracion: 50
resumen: Cómo calcular fila por fila con las funciones X (SUMX, AVERAGEX, MAXX), traer columnas de otra tabla con RELATED, calcular márgenes, rankear categorías con RANKX y decidir entre columna calculada y medida.
objetivos: Calcular importes fila por fila con SUMX | Traer datos de la dimensión con RELATED | Calcular un margen porcentual correcto | Rankear con RANKX y ALL
autoevaluacion: ¿Sabes por qué SUM(cantidad) * SUM(precio) no da las ventas? | ¿Sabes cuándo hace falta RELATED? | ¿Sabes rankear categorías sin que todas den 1?
---

:::escenario
Finanzas pide el **margen** por categoría. El precio de venta está en `detalle_pedidos`, pero el costo está en `productos`. Hay que multiplicar fila por fila y traer un dato de otra tabla. Para eso están los iteradores y `RELATED`.
:::

## Por qué hace falta iterar

Las ventas de una línea son `cantidad × precio_unitario`. Si sumas las dos columnas por separado y después multiplicas, el resultado está **mal**:

```dax
-- ✗ mal: (suma de cantidades) × (suma de precios)
SUM(detalle_pedidos[cantidad]) * SUM(detalle_pedidos[precio_unitario])

-- ✓ bien: multiplica en cada fila y después suma
SUMX(detalle_pedidos, detalle_pedidos[cantidad] * detalle_pedidos[precio_unitario])
```

Las funciones que terminan en **X** (`SUMX`, `AVERAGEX`, `MINX`, `MAXX`, `COUNTX`) reciben una **tabla** y una **expresión**. Calculan la expresión en cada fila (contexto de fila) y después agregan los resultados.

## RELATED: un dato de la dimensión

Dentro de `SUMX(detalle_pedidos, …)` estás parado en una línea de pedido. El costo del producto está en otra tabla. `RELATED` lo trae siguiendo la relación del lado **\*** al lado **1**:

```dax
Costo = SUMX(detalle_pedidos, detalle_pedidos[cantidad] * RELATED(productos[costo]))
Margen % = DIVIDE([Ventas] - [Costo], [Ventas])
```

:::nota RELATED y RELATEDTABLE
`RELATED` va del lado varios al lado uno (de la línea a su producto): devuelve **un** valor. Para ir al revés, de un producto a todas sus líneas, se usa `RELATEDTABLE`, que devuelve una tabla.
:::

Con `RELATEDTABLE` puedes contar, desde cada cliente, sus pedidos. Por ejemplo, para saber cuántos clientes compraron 3 veces o más:

```dax
Clientes frecuentes = COUNTROWS(FILTER(clientes, COUNTROWS(RELATEDTABLE(pedidos)) >= 3))
```

:::tip LOOKUPVALUE cuando no hay relación
`LOOKUPVALUE(productos[nombre], productos[producto_id], 25)` busca un valor por clave, como un BUSCARV de Excel. Úsalo solo cuando **no** hay relación entre las tablas: si la hay, `RELATED` es más simple y más rápido.
:::

## Iterar sobre los valores de una columna

`AVERAGEX(VALUES(clientes[segmento]), [Ventas])` calcula las ventas de **cada** segmento y después las promedia. Es distinto de `AVERAGE`, que promedia filas.

## Ranking con RANKX

```dax
Ranking de categoría = RANKX(ALL(categorias[nombre]), [Ventas])
```

`RANKX` calcula `[Ventas]` para cada categoría de la lista y se fija en qué puesto queda la categoría de la celda. El `ALL` es clave: sin él, la lista tendría solo la categoría de la celda y todas quedarían en el puesto 1.

## ¿Columna calculada o medida?

| Necesito… | Uso |
|---|---|
| Un valor por fila para **agrupar o filtrar** (rango de precio, año, "es caro") | Columna calculada (o mejor, en Power Query / SQL) |
| Un número que se **agrega** distinto en cada celda (ventas, margen, ranking) | Medida |

## Practica

:::ejercicio dax dificultad=Intermedio titulo="Ventas brutas fila por fila"
Escribe **Ventas brutas**: la suma de `cantidad × precio_unitario` de cada línea (sin descuento). Se evalúa por canal.
```dax prueba
EVALUATE SUMMARIZECOLUMNS(pedidos[canal], "Ventas brutas", [?])
```
```dax inicial
Ventas brutas = SUMX(detalle_pedidos, ...)
```
```dax solucion
Ventas brutas = SUMX(detalle_pedidos, detalle_pedidos[cantidad] * detalle_pedidos[precio_unitario])
```
```pista
El segundo argumento de SUMX es la cuenta de **una fila**: `detalle_pedidos[cantidad] * detalle_pedidos[precio_unitario]`.
```
:::

:::ejercicio dax dificultad=Intermedio titulo="Costo con RELATED"
Escribe **Costo**: la suma de `cantidad × costo del producto`. El costo está en `productos[costo]`. Se evalúa por categoría.
```dax prueba
EVALUATE SUMMARIZECOLUMNS(categorias[nombre], "Costo", [?])
```
```dax solucion
Costo = SUMX(detalle_pedidos, detalle_pedidos[cantidad] * RELATED(productos[costo]))
```
```pista
Dentro de `SUMX(detalle_pedidos, …)` usa `RELATED(productos[costo])` para traer el costo del producto de cada línea.
```
:::

:::ejercicio dax dificultad=Intermedio titulo="Margen porcentual"
El modelo ya tiene **[Ventas]** y **[Costo]**. Escribe **Margen %** = (ventas − costo) ÷ ventas. Se evalúa por categoría.
```dax medidas
Ventas = SUMX(detalle_pedidos, detalle_pedidos[cantidad] * detalle_pedidos[precio_unitario] * (1 - detalle_pedidos[descuento]))
Costo = SUMX(detalle_pedidos, detalle_pedidos[cantidad] * RELATED(productos[costo]))
```
```dax prueba
EVALUATE SUMMARIZECOLUMNS(categorias[nombre], "Margen %", [?])
```
```dax solucion
Margen % = DIVIDE([Ventas] - [Costo], [Ventas])
```
:::

:::ejercicio dax dificultad=Intermedio titulo="Promedio de unidades por línea"
Escribe **Unidades promedio por línea** con `AVERAGEX` sobre `detalle_pedidos`. Se evalúa por canal.
```dax prueba
EVALUATE SUMMARIZECOLUMNS(pedidos[canal], "Unidades promedio", [?])
```
```dax solucion
Unidades promedio por línea = AVERAGEX(detalle_pedidos, detalle_pedidos[cantidad])
```
:::

:::ejercicio dax dificultad=Intermedio titulo="El mayor importe de una línea"
Escribe **Línea más grande**: el importe (`cantidad × precio_unitario`) más alto entre las líneas de pedido. Se evalúa por segmento del cliente.
```dax prueba
EVALUATE SUMMARIZECOLUMNS(clientes[segmento], "Línea más grande", [?])
```
```dax solucion
Línea más grande = MAXX(detalle_pedidos, detalle_pedidos[cantidad] * detalle_pedidos[precio_unitario])
```
```pista
`MAXX(tabla, expresión)` funciona como SUMX pero se queda con el máximo.
```
:::

:::ejercicio dax dificultad=Avanzado titulo="Ranking de categorías"
Escribe **Ranking**: el puesto de cada categoría según **[Ventas]** (1 = la que más vende). Se evalúa por categoría.
```dax medidas
Ventas = SUMX(detalle_pedidos, detalle_pedidos[cantidad] * detalle_pedidos[precio_unitario] * (1 - detalle_pedidos[descuento]))
```
```dax prueba
EVALUATE SUMMARIZECOLUMNS(categorias[nombre], "Ranking", [?])
```
```dax solucion
Ranking = RANKX(ALL(categorias[nombre]), [Ventas])
```
```pista
`RANKX(lista, expresión)`. La lista son **todas** las categorías: `ALL(categorias[nombre])`.
```
:::

:::ejercicio dax dificultad=Avanzado titulo="Promedio por segmento"
Escribe **Venta promedio por segmento**: calcula **[Ventas]** de cada segmento de cliente y promedia esos resultados. Se evalúa sin filtros (un solo número).
```dax medidas
Ventas = SUMX(detalle_pedidos, detalle_pedidos[cantidad] * detalle_pedidos[precio_unitario] * (1 - detalle_pedidos[descuento]))
```
```dax prueba
EVALUATE ROW("Promedio por segmento", [?])
```
```dax solucion
Venta promedio por segmento = AVERAGEX(VALUES(clientes[segmento]), [Ventas])
```
```pista
Recorre los valores distintos del segmento con `VALUES(clientes[segmento])` y promedia `[Ventas]` con `AVERAGEX`.
```
:::

:::ejercicio dax dificultad=Avanzado titulo="Clientes frecuentes con RELATEDTABLE"
Escribe **Clientes frecuentes**: cuántos clientes hicieron **3 pedidos o más**. Recorre los clientes con `FILTER` y cuenta los pedidos de cada uno con `RELATEDTABLE`. Se evalúa por segmento.
```dax prueba
EVALUATE SUMMARIZECOLUMNS(clientes[segmento], "Frecuentes", [?])
```
```dax inicial
Clientes frecuentes = COUNTROWS(FILTER(clientes, ...))
```
```dax solucion
Clientes frecuentes = COUNTROWS(FILTER(clientes, COUNTROWS(RELATEDTABLE(pedidos)) >= 3))
```
```pista
Dentro de `FILTER(clientes, …)` estás parado en un cliente: `RELATEDTABLE(pedidos)` son **sus** pedidos.
```
```pista
La condición completa es `COUNTROWS(RELATEDTABLE(pedidos)) >= 3`.
```
:::

:::ejercicio quiz dificultad=Intermedio
¿Por qué `SUM(detalle_pedidos[cantidad]) * SUM(detalle_pedidos[precio_unitario])` no da las ventas?
- [x] Porque multiplica dos totales: hay que multiplicar en cada línea y después sumar (SUMX)
- [ ] Porque SUM no acepta columnas con decimales
- [ ] Porque falta un CALCULATE
- [ ] Sí da las ventas: es lo mismo que SUMX
:::

:::ejercicio quiz dificultad=Intermedio
Escribiste `RANKX(categorias[nombre], [Ventas])` (sin ALL) en una tabla por categoría y todas dan 1. ¿Por qué?
- [ ] Porque RANKX solo funciona con números enteros
- [x] Porque en cada fila la lista solo contiene la categoría de esa fila: hay que quitar el filtro con ALL para comparar contra todas
- [ ] Porque [Ventas] es una medida y RANKX necesita una columna
- [ ] Porque falta ordenar la tabla
:::

:::entrevista "¿Cuándo usarías RELATED?"
Cuando estoy en el contexto de fila de la tabla del lado varios (una columna calculada o dentro de SUMX sobre los hechos) y necesito un atributo de la dimensión relacionada, como el costo del producto para calcular el margen línea por línea. Requiere que exista la relación y va del lado * al lado 1.
:::
