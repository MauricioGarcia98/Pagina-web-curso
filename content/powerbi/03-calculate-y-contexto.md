---
titulo: CALCULATE - cambiar el contexto de filtro
nivel: Intermedio
duracion: 55
resumen: La función más importante de DAX. Cómo CALCULATE agrega, reemplaza y quita filtros (ALL, REMOVEFILTERS, ALLEXCEPT, KEEPFILTERS) para calcular ventas de un canal, porcentajes del total y comparaciones contra el total general.
objetivos: Explicar qué hace CALCULATE con el contexto de filtro | Calcular un valor filtrado y un porcentaje del total | Quitar filtros con ALL y REMOVEFILTERS | Diferenciar un filtro que reemplaza de uno que se agrega con KEEPFILTERS
autoevaluacion: ¿Sabes por qué CALCULATE([Ventas], pedidos[canal] = "web") da lo mismo en todas las barras de un gráfico por canal? | ¿Sabes armar un "% del total" que sume 100 %? | ¿Sabes cuándo usar KEEPFILTERS?
---

:::escenario
El gerente comercial mira un gráfico de ventas por país y pregunta: "¿Qué parte del total es cada país?" y "¿Cuánto de eso vino por la web?". Las dos respuestas necesitan **cambiar los filtros** con los que se calcula una medida. Esa es la tarea de `CALCULATE`.
:::

## Qué hace CALCULATE

```dax
CALCULATE(<expresión>, <filtro1>, <filtro2>, …)
```

1. Toma el contexto de filtro de la celda (por ejemplo: país = Chile).
2. Aplica los filtros que le pasas: **reemplazan** los filtros de las mismas columnas y **se agregan** a los demás.
3. Calcula la expresión con ese contexto nuevo.

```dax
Ventas web = CALCULATE([Ventas], pedidos[canal] = "web")
```

En un gráfico **por país**, `[Ventas web]` de Chile son las ventas web de clientes chilenos: el filtro de país se mantiene y se agrega "canal = web".

En un gráfico **por canal**, `[Ventas web]` da el mismo número en todas las barras. El filtro de la barra (canal = app, por ejemplo) se **reemplaza** por canal = web.

## Quitar filtros: ALL y REMOVEFILTERS

| Función dentro de CALCULATE | Qué quita |
|---|---|
| `ALL(clientes[pais])` o `REMOVEFILTERS(clientes[pais])` | Los filtros de esa columna |
| `ALL(clientes)` | Todos los filtros de la tabla clientes |
| `ALLEXCEPT(clientes, clientes[segmento])` | Todos los de clientes, menos el de segmento |
| `ALLSELECTED()` | Los del objeto visual, pero respeta segmentaciones y filtros de página |

El patrón más pedido en un tablero es el **porcentaje del total**:

```dax
% del total = DIVIDE([Ventas], CALCULATE([Ventas], ALL(clientes[pais])))
```

El numerador es la venta del país de la celda. El denominador es la venta **sin** el filtro de país, o sea el total. Sumados, todos los países dan 100 %.

:::cuidado ALL quita todos los filtros, también el de la segmentación
`ALL(clientes[pais])` ignora el país aunque el usuario lo haya elegido en una segmentación. Si quieres que el total respete lo que el usuario seleccionó, usa `ALLSELECTED(clientes[pais])`.
:::

## KEEPFILTERS: agregar sin reemplazar

```dax
Ventas digitales = CALCULATE([Ventas], KEEPFILTERS(pedidos[canal] IN {"web", "app"}))
```

Sin `KEEPFILTERS`, en la barra "tienda" el filtro canal = tienda se reemplaza por {web, app}: la barra mostraría las ventas digitales. Con `KEEPFILTERS`, los dos filtros conviven ("tienda" **y** {web, app}), así que la barra "tienda" queda en blanco. Es lo que la mayoría espera ver.

## Filtros con FILTER

Un filtro booleano como `pedidos[canal] = "web"` trabaja sobre **una columna**. Para condiciones sobre una fila completa se usa `FILTER(tabla, condición)`:

```dax
Ventas de líneas grandes = CALCULATE([Ventas], FILTER(detalle_pedidos, detalle_pedidos[cantidad] >= 3))
```

:::experto Contexto de fila contra contexto de filtro
`FILTER` recorre la tabla fila por fila (**contexto de fila**). Dentro de la condición, `detalle_pedidos[cantidad]` es el valor de **esa fila**. `CALCULATE` convierte el resultado en un **contexto de filtro**. Esta diferencia es lo que más cuesta de DAX. Si la entiendes, entiendes DAX.
:::

## Practica

En todos los ejercicios el modelo ya tiene estas medidas:

```dax
Ventas = SUMX(detalle_pedidos, detalle_pedidos[cantidad] * detalle_pedidos[precio_unitario] * (1 - detalle_pedidos[descuento]))
Pedidos = COUNTROWS(pedidos)
```

:::ejercicio dax dificultad=Intermedio titulo="Ventas por la web"
Escribe **Ventas web**: las ventas del canal `"web"`. Se evalúa por país.
```dax medidas
Ventas = SUMX(detalle_pedidos, detalle_pedidos[cantidad] * detalle_pedidos[precio_unitario] * (1 - detalle_pedidos[descuento]))
Pedidos = COUNTROWS(pedidos)
```
```dax prueba
EVALUATE SUMMARIZECOLUMNS(clientes[pais], "Ventas web", [?])
```
```dax inicial
Ventas web = CALCULATE([Ventas], ...)
```
```dax solucion
Ventas web = CALCULATE([Ventas], pedidos[canal] = "web")
```
```pista
El filtro es una condición sobre una columna: `pedidos[canal] = "web"`.
```
:::

:::ejercicio dax dificultad=Intermedio titulo="Pedidos entregados"
Escribe **Pedidos entregados**: cantidad de pedidos con estado `"entregado"`. Se evalúa por canal.
```dax medidas
Pedidos = COUNTROWS(pedidos)
```
```dax prueba
EVALUATE SUMMARIZECOLUMNS(pedidos[canal], "Entregados", [?])
```
```dax solucion
Pedidos entregados = CALCULATE([Pedidos], pedidos[estado] = "entregado")
```
:::

:::ejercicio dax dificultad=Intermedio titulo="% del total por país"
Escribe **% del total**: la parte de las ventas totales que aporta cada país (entre 0 y 1). Se evalúa por país.
```dax medidas
Ventas = SUMX(detalle_pedidos, detalle_pedidos[cantidad] * detalle_pedidos[precio_unitario] * (1 - detalle_pedidos[descuento]))
```
```dax prueba
EVALUATE SUMMARIZECOLUMNS(clientes[pais], "% del total", [?])
```
```dax solucion
% del total = DIVIDE([Ventas], CALCULATE([Ventas], ALL(clientes[pais])))
```
```pista
El denominador son las ventas sin el filtro de país: `CALCULATE([Ventas], ALL(clientes[pais]))`.
```
```pista
Divide con `DIVIDE(numerador, denominador)`.
```
:::

:::ejercicio dax dificultad=Intermedio titulo="El total en cada fila"
Escribe **Ventas totales**: las ventas sin importar el canal, para comparar cada barra contra el total. Se evalúa por canal (todas las filas deben mostrar el mismo número).
```dax medidas
Ventas = SUMX(detalle_pedidos, detalle_pedidos[cantidad] * detalle_pedidos[precio_unitario] * (1 - detalle_pedidos[descuento]))
```
```dax prueba
EVALUATE SUMMARIZECOLUMNS(pedidos[canal], "Ventas totales", [?])
```
```dax solucion
Ventas totales = CALCULATE([Ventas], REMOVEFILTERS(pedidos[canal]))
```
```pista
`REMOVEFILTERS(pedidos[canal])` (o `ALL(pedidos[canal])`) quita el filtro del canal de cada barra.
```
:::

:::ejercicio dax dificultad=Intermedio titulo="Solo las barras digitales"
Escribe **Ventas digitales**: ventas de los canales `"web"` y `"app"`, pero **sin reemplazar** el filtro de la barra. En un gráfico por canal, "tienda" y "telefono" deben quedar en blanco.
```dax medidas
Ventas = SUMX(detalle_pedidos, detalle_pedidos[cantidad] * detalle_pedidos[precio_unitario] * (1 - detalle_pedidos[descuento]))
```
```dax prueba
EVALUATE SUMMARIZECOLUMNS(pedidos[canal], "Ventas digitales", [?])
```
```dax solucion
Ventas digitales = CALCULATE([Ventas], KEEPFILTERS(pedidos[canal] IN {"web", "app"}))
```
```pista
Una lista de valores se escribe `pedidos[canal] IN {"web", "app"}`.
```
```pista
Envuelve el filtro en `KEEPFILTERS(...)` para que conviva con el filtro de la barra en vez de reemplazarlo.
```
:::

:::ejercicio dax dificultad=Avanzado titulo="Líneas con muchas unidades"
Escribe **Ventas de líneas grandes**: ventas solo de las líneas con `cantidad` de 3 o más. Se evalúa por categoría.
```dax medidas
Ventas = SUMX(detalle_pedidos, detalle_pedidos[cantidad] * detalle_pedidos[precio_unitario] * (1 - detalle_pedidos[descuento]))
```
```dax prueba
EVALUATE SUMMARIZECOLUMNS(categorias[nombre], "Ventas líneas grandes", [?])
```
```dax solucion
Ventas de líneas grandes = CALCULATE([Ventas], FILTER(detalle_pedidos, detalle_pedidos[cantidad] >= 3))
```
```pista
Usa `FILTER(detalle_pedidos, condición)` como filtro de CALCULATE.
```
:::

:::ejercicio dax dificultad=Avanzado titulo="Total del segmento"
Escribe **Ventas del segmento**: las ventas de todos los clientes del mismo segmento, sin importar el país. Se evalúa por segmento y país, así que dentro de cada segmento todos los países repiten el mismo número.
```dax medidas
Ventas = SUMX(detalle_pedidos, detalle_pedidos[cantidad] * detalle_pedidos[precio_unitario] * (1 - detalle_pedidos[descuento]))
```
```dax prueba
EVALUATE SUMMARIZECOLUMNS(clientes[segmento], clientes[pais], "Ventas del segmento", [?])
```
```dax solucion
Ventas del segmento = CALCULATE([Ventas], ALLEXCEPT(clientes, clientes[segmento]))
```
```pista
Hay que quitar todos los filtros de `clientes` menos el de `segmento`: `ALLEXCEPT(clientes, clientes[segmento])`.
```
:::

:::ejercicio quiz dificultad=Intermedio
En un gráfico de barras **por canal**, la medida `CALCULATE([Ventas], pedidos[canal] = "web")` muestra…
- [ ] Las ventas web solo en la barra "web" y blanco en el resto
- [x] El mismo valor (las ventas web) en todas las barras, porque el filtro de CALCULATE reemplaza el de la barra
- [ ] Un error, porque el gráfico ya filtra por canal
- [ ] El total de todos los canales
:::

:::ejercicio quiz dificultad=Intermedio
El usuario eligió "2024" en una segmentación. ¿Qué denominador hace que el "% del total" por país sume 100 % dentro de 2024?
- [ ] `CALCULATE([Ventas], ALL(pedidos))`
- [ ] `CALCULATE([Ventas], ALL(clientes))`
- [x] `CALCULATE([Ventas], ALLSELECTED(clientes[pais]))`
- [ ] `CALCULATE([Ventas], clientes[pais] = "Argentina")`
```explicacion
`ALLSELECTED` quita el filtro que pone el propio objeto visual (cada país) pero respeta lo que el usuario seleccionó afuera, como la segmentación de 2024.
```
:::

:::entrevista "Explica con un ejemplo qué hace CALCULATE."
Evalúa una expresión con un contexto de filtro modificado. Si tengo [Ventas] en una tabla por país y escribo CALCULATE([Ventas], pedidos[canal] = "web"), cada país muestra solo sus ventas web: el filtro de país se mantiene y se agrega el de canal. Si el filtro es sobre una columna que ya está filtrada, la reemplaza (salvo con KEEPFILTERS), y con ALL o REMOVEFILTERS puedo quitar filtros para calcular totales y porcentajes.
:::
