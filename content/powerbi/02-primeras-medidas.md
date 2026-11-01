---
titulo: Tus primeras medidas DAX - SUM, COUNTROWS, DISTINCTCOUNT y DIVIDE
nivel: Básico
duracion: 45
resumen: Qué es una medida, en qué se diferencia de una columna, qué es el contexto de filtro y cómo escribir las medidas que piden todos los tableros - ventas, pedidos, clientes, promedios y ticket promedio - sin dividir por cero.
objetivos: Escribir medidas con SUM, AVERAGE, COUNTROWS y DISTINCTCOUNT | Explicar el contexto de filtro de un objeto visual | Reutilizar medidas dentro de otras medidas | Dividir con DIVIDE
autoevaluacion: ¿Sabes por qué una medida da un número distinto en cada barra del gráfico? | ¿Sabes cuándo usar DISTINCTCOUNT en vez de COUNTROWS? | ¿Sabes por qué conviene DIVIDE en vez de "/"?
---

:::escenario
Arrastras la columna `cantidad` a un gráfico y Power BI muestra "Suma de cantidad". Funciona, pero cuando el gerente pide "ticket promedio" o "% del total", arrastrar columnas ya no alcanza: hacen falta **medidas**.
:::

## Medida o columna

- Una **columna** (también una columna calculada) tiene un valor **por fila** y se guarda en la tabla.
- Una **medida** no se guarda: es una **fórmula que se calcula cada vez**, para cada celda del objeto visual, con los filtros de esa celda.

```dax
Unidades = SUM(detalle_pedidos[cantidad])
```

Si pones `[Unidades]` en un gráfico de columnas por canal, la misma fórmula da un número distinto en cada barra: en la barra "web" solo suma las líneas de pedidos web. Eso es el **contexto de filtro**: el conjunto de filtros que tiene cada celda (la barra, las segmentaciones, los filtros de página y los de las otras visuales).

```diagrama
titulo: Una medida, muchos resultados: cada barra la evalúa con su propio filtro
nodo m: Unidades = SUM(cantidad) | icono=codigo | col=0 | fila=1
nodo a: Barra "web"\nfiltro: canal = web | icono=lupa | col=1 | fila=0
nodo b: Barra "app"\nfiltro: canal = app | icono=lupa | col=1 | fila=1
nodo c: Tarjeta total\nsin filtro de canal | icono=lupa | col=1 | fila=2
flecha m -> a
flecha m -> b
flecha m -> c
```

## Las funciones que más se usan

| Función | Qué devuelve | Ejemplo |
|---|---|---|
| `SUM(T[c])` | Suma de la columna | `SUM(detalle_pedidos[cantidad])` |
| `AVERAGE(T[c])` | Promedio | `AVERAGE(productos[precio])` |
| `MIN` / `MAX` | Mínimo / máximo | `MAX(pedidos[fecha_pedido])` |
| `COUNTROWS(T)` | Cantidad de filas de la tabla | `COUNTROWS(pedidos)` |
| `DISTINCTCOUNT(T[c])` | Valores distintos | `DISTINCTCOUNT(pedidos[cliente_id])` |
| `DIVIDE(a, b)` | a ÷ b, y **blanco** si b es 0 | `DIVIDE([Ventas], [Pedidos])` |

:::cuidado Contar pedidos con la tabla correcta
`COUNTROWS(detalle_pedidos)` cuenta **líneas**, no pedidos: un pedido con tres productos cuenta tres. Para pedidos usa `COUNTROWS(pedidos)` o `DISTINCTCOUNT(detalle_pedidos[pedido_id])`. Es la misma trampa del grano que viste en SQL.
:::

## Medidas que usan medidas

Una medida puede usar otra entre corchetes. Así cada fórmula se escribe una sola vez:

```dax
Pedidos = COUNTROWS(pedidos)
Ventas = SUMX(detalle_pedidos, detalle_pedidos[cantidad] * detalle_pedidos[precio_unitario] * (1 - detalle_pedidos[descuento]))
Ticket promedio = DIVIDE([Ventas], [Pedidos])
```

`SUMX` recorre la tabla fila por fila (lo verás a fondo en otra lección). Por ahora, úsalo tal cual para las ventas.

## Cómo se corrigen los ejercicios de esta lección

Escribes **la fórmula de una medida**. El ejercicio la llama `[?]` y la pone en una consulta, como si la arrastraras a un objeto visual. Por ejemplo, para "por canal":

```dax
EVALUATE SUMMARIZECOLUMNS(pedidos[canal], "Valor", [?])
```

Puedes escribir `Nombre = expresión` o solo la expresión. Abre "Tu medida se llama [?]…" en cada ejercicio para ver la consulta.

## Practica

:::ejercicio dax dificultad=Básico titulo="Unidades vendidas"
Escribe la medida **Unidades**: la suma de `detalle_pedidos[cantidad]`.
```dax prueba
EVALUATE ROW("Unidades", [?])
```
```dax inicial
Unidades = 
```
```dax solucion
Unidades = SUM(detalle_pedidos[cantidad])
```
```pista
`SUM(Tabla[columna])`.
```
:::

:::ejercicio dax dificultad=Básico titulo="Pedidos por canal"
Escribe la medida **Pedidos** (cantidad de pedidos). Se evalúa por canal.
```dax prueba
EVALUATE SUMMARIZECOLUMNS(pedidos[canal], "Pedidos", [?])
```
```dax solucion
Pedidos = COUNTROWS(pedidos)
```
```pista
`COUNTROWS(tabla)` cuenta las filas. En cada canal, la tabla ya está filtrada por ese canal.
```
:::

:::ejercicio dax dificultad=Básico titulo="Clientes que compraron"
Escribe **Clientes compradores**: cuántos clientes distintos hicieron al menos un pedido. Se evalúa por país del cliente.
```dax prueba
EVALUATE SUMMARIZECOLUMNS(clientes[pais], "Clientes compradores", [?])
```
```dax solucion
Clientes compradores = DISTINCTCOUNT(pedidos[cliente_id])
```
```pista
No cuentes filas de pedidos (un cliente tiene muchos): cuenta valores distintos de `pedidos[cliente_id]` con `DISTINCTCOUNT`.
```
:::

:::ejercicio dax dificultad=Básico titulo="Precio promedio por categoría"
Escribe **Precio promedio** de los productos. Se evalúa por nombre de categoría.
```dax prueba
EVALUATE SUMMARIZECOLUMNS(categorias[nombre], "Precio promedio", [?])
```
```dax solucion
Precio promedio = AVERAGE(productos[precio])
```
:::

:::ejercicio dax dificultad=Básico titulo="La venta más alta"
Escribe **Precio máximo vendido**: el `precio_unitario` más alto de las líneas de pedido. Se evalúa por canal.
```dax prueba
EVALUATE SUMMARIZECOLUMNS(pedidos[canal], "Precio máximo", [?])
```
```dax solucion
Precio máximo vendido = MAX(detalle_pedidos[precio_unitario])
```
:::

:::ejercicio dax dificultad=Intermedio titulo="Ticket promedio"
El modelo ya tiene **[Ventas]** y **[Pedidos]**. Escribe **Ticket promedio** = ventas ÷ pedidos, sin que falle si un grupo no tiene pedidos.
```dax medidas
Ventas = SUMX(detalle_pedidos, detalle_pedidos[cantidad] * detalle_pedidos[precio_unitario] * (1 - detalle_pedidos[descuento]))
Pedidos = COUNTROWS(pedidos)
```
```dax prueba
EVALUATE SUMMARIZECOLUMNS(pedidos[canal], "Ticket promedio", [?])
```
```dax solucion
Ticket promedio = DIVIDE([Ventas], [Pedidos])
```
```pista
`DIVIDE(numerador, denominador)` devuelve blanco en vez de error cuando el denominador es 0.
```
:::

:::ejercicio dax dificultad=Intermedio titulo="Unidades por pedido"
Escribe **Unidades por pedido**: unidades vendidas ÷ cantidad de pedidos. Se evalúa por segmento del cliente.
```dax prueba
EVALUATE SUMMARIZECOLUMNS(clientes[segmento], "Unidades por pedido", [?])
```
```dax solucion
Unidades por pedido = DIVIDE(SUM(detalle_pedidos[cantidad]), COUNTROWS(pedidos))
```
```pista
El numerador sale de `detalle_pedidos` y el denominador de `pedidos`. Las dos tablas reciben el filtro del segmento por las relaciones.
```
:::

:::ejercicio quiz dificultad=Básico
Pones la medida `[Pedidos] = COUNTROWS(pedidos)` en una tarjeta y en un gráfico por canal. ¿Por qué la tarjeta muestra un número más grande que cualquier barra?
- [ ] Porque la tarjeta suma las barras dos veces
- [x] Porque la tarjeta no tiene filtro de canal: cuenta todos los pedidos, y cada barra cuenta solo los de su canal
- [ ] Porque las medidas no funcionan en tarjetas
- [ ] Porque COUNTROWS ignora los filtros
:::

:::ejercicio quiz dificultad=Intermedio
¿Cuál es la ventaja de `DIVIDE([Ventas], [Pedidos])` sobre `[Ventas] / [Pedidos]`?
- [x] Si [Pedidos] es 0 o blanco, devuelve blanco (o el valor alternativo que le pases) en vez de un error o infinito
- [ ] Es más rápido porque no calcula el denominador
- [ ] Redondea a dos decimales
- [ ] Convierte el resultado en porcentaje
:::

:::entrevista "¿Qué diferencia hay entre una columna calculada y una medida?"
La columna calculada se evalúa una vez por fila al actualizar el modelo y ocupa memoria; sirve para clasificar o agrupar (por ejemplo, "rango de precio"). La medida se calcula en el momento, para cada celda, con el contexto de filtro de esa celda; sirve para agregaciones como totales, promedios y porcentajes. Regla: si lo vas a poner en un eje o en una segmentación, columna; si es un número que se agrega, medida.
:::
