---
titulo: Consultas DAX, TMDL y tu primer informe completo
nivel: Avanzado
duracion: 60
resumen: La vista de consultas DAX (EVALUATE, SUMMARIZECOLUMNS, TOPN, FILTER, ORDER BY, DEFINE), la vista TMDL para versionar el modelo como código y un proyecto guiado - un informe completo en el Power BI de práctica con cualquier dataset.
objetivos: Escribir consultas con SUMMARIZECOLUMNS, TOPN y ORDER BY | Probar medidas con DEFINE MEASURE antes de agregarlas al modelo | Leer y editar un modelo en TMDL | Construir y publicar un informe de punta a punta
autoevaluacion: ¿Sabes traducir un GROUP BY de SQL a SUMMARIZECOLUMNS? | ¿Sabes probar una medida sin crearla en el modelo? | ¿Sabes para qué sirve guardar el modelo en TMDL?
---

:::escenario
Un objeto visual muestra un número raro y nadie sabe por qué. Con la **vista de consultas DAX** puedes copiar la consulta que genera ese objeto visual (Analizador de rendimiento → Copiar consulta), ejecutarla, cambiarla y entender qué está calculando, sin tocar el informe.
:::

:::analogia En palabras simples
Hasta ahora usaste DAX para hacer cálculos dentro de un informe. Las consultas DAX son como hacerle preguntas directas al modelo, igual que con SQL, para revisar que los números den lo que esperas. Y TMDL es el modelo escrito como texto, para guardarlo y revisarlo con Git.
:::

## De SQL a DAX

| SQL | DAX |
|---|---|
| `SELECT * FROM ventas` | `EVALUATE ventas` |
| `SELECT pais, SUM(monto) FROM … GROUP BY pais` | `EVALUATE SUMMARIZECOLUMNS(clientes[pais], "Ventas", [Ventas])` |
| `… HAVING SUM(monto) > 1000` | `EVALUATE FILTER(SUMMARIZECOLUMNS(…), [Ventas] > 1000)` |
| `… ORDER BY ventas DESC` | `… ORDER BY [Ventas] DESC` |
| `SELECT TOP 10 …` | `EVALUATE TOPN(10, …, [Ventas], DESC)` |

La diferencia grande es que en DAX **no escribes los JOIN**: las relaciones ya están en el modelo y los filtros viajan solos.

## DEFINE: probar antes de crear

```dax
DEFINE
    MEASURE pedidos[Ticket] = DIVIDE([Ventas], [Pedidos])
EVALUATE
    SUMMARIZECOLUMNS(pedidos[canal], "Ticket", [Ticket])
ORDER BY [Ticket] DESC
```

La medida existe solo mientras corre la consulta. En Power BI Desktop, encima del `DEFINE` aparece **"Actualizar el modelo: agregar una medida nueva"** para pasarla al modelo con un clic. El laboratorio también lo tiene.

## TMDL: el modelo como código

La **vista TMDL** muestra el modelo semántico en *Tabular Model Definition Language*, un formato de texto:

```tmdl
createOrReplace

	table pedidos

		measure Ticket = DIVIDE([Ventas], [Pedidos])
			formatString: \$#,0.00

	relationship 7f3a…
		fromColumn: pedidos.cliente_id
		toColumn: clientes.cliente_id
```

Si guardas el informe como **proyecto de Power BI (.pbip)**, el modelo queda en archivos `.tmdl` dentro de `definition/`. Se versionan con Git, se revisan en pull requests y se despliegan con CI/CD, igual que el código de dbt.

## Practica: consultas

:::ejercicio dax dificultad=Avanzado titulo="Ventas por país"
Con `SUMMARIZECOLUMNS`, devuelve una fila por país del cliente con una columna `"Ventas"` que use la medida **[Ventas]**.
```dax medidas
Ventas = SUMX(detalle_pedidos, detalle_pedidos[cantidad] * detalle_pedidos[precio_unitario] * (1 - detalle_pedidos[descuento]))
```
```dax inicial
EVALUATE
    SUMMARIZECOLUMNS(
        ...,
        "Ventas", [Ventas]
    )
```
```dax solucion
EVALUATE SUMMARIZECOLUMNS(clientes[pais], "Ventas", [Ventas])
```
```pista
Primero van las columnas por las que se agrupa (`clientes[pais]`) y después los pares `"Nombre", expresión`.
```
:::

:::ejercicio dax ordenado dificultad=Avanzado titulo="Ordenar el resultado"
Devuelve las ventas por canal (columnas `pedidos[canal]` y `"Ventas"`) ordenadas de mayor a menor.
```dax medidas
Ventas = SUMX(detalle_pedidos, detalle_pedidos[cantidad] * detalle_pedidos[precio_unitario] * (1 - detalle_pedidos[descuento]))
```
```dax solucion
EVALUATE SUMMARIZECOLUMNS(pedidos[canal], "Ventas", [Ventas])
ORDER BY [Ventas] DESC
```
```pista
Después de la tabla, en una línea aparte: `ORDER BY [Ventas] DESC`.
```
:::

:::ejercicio dax dificultad=Avanzado titulo="Como un HAVING"
Devuelve solo los países con más de 1000 pedidos: columnas `clientes[pais]` y `"Pedidos"`.
```dax medidas
Pedidos = COUNTROWS(pedidos)
```
```dax solucion
EVALUATE FILTER(SUMMARIZECOLUMNS(clientes[pais], "Pedidos", [Pedidos]), [Pedidos] > 1000)
```
```pista
Envuelve el SUMMARIZECOLUMNS en `FILTER(…, condición)`. Dentro de la condición, `[Pedidos]` es la columna del resultado.
```
:::

:::ejercicio dax dificultad=Avanzado titulo="Las 3 categorías que más venden"
Devuelve las 3 categorías con más ventas: columnas `categorias[nombre]` y `"Ventas"`.
```dax medidas
Ventas = SUMX(detalle_pedidos, detalle_pedidos[cantidad] * detalle_pedidos[precio_unitario] * (1 - detalle_pedidos[descuento]))
```
```dax solucion
EVALUATE TOPN(3, SUMMARIZECOLUMNS(categorias[nombre], "Ventas", [Ventas]), [Ventas], DESC)
```
```pista
`TOPN(cantidad, tabla, expresión por la que se ordena, DESC)`. La tabla es un SUMMARIZECOLUMNS por categoría.
```
:::

:::ejercicio dax dificultad=Avanzado titulo="Probar una medida con DEFINE"
Define en la consulta una medida `pedidos[Ticket]` = **[Ventas]** ÷ **[Pedidos]** y devuelve el ticket por segmento del cliente: columnas `clientes[segmento]` y `"Ticket"`.
```dax medidas
Ventas = SUMX(detalle_pedidos, detalle_pedidos[cantidad] * detalle_pedidos[precio_unitario] * (1 - detalle_pedidos[descuento]))
Pedidos = COUNTROWS(pedidos)
```
```dax inicial
DEFINE
    MEASURE pedidos[Ticket] = ...
EVALUATE
    ...
```
```dax solucion
DEFINE
    MEASURE pedidos[Ticket] = DIVIDE([Ventas], [Pedidos])
EVALUATE
    SUMMARIZECOLUMNS(clientes[segmento], "Ticket", [Ticket])
```
:::

:::ejercicio dax dificultad=Avanzado titulo="Columnas a elección"
Como un `SELECT nombre, marca, precio FROM productos`: devuelve esas tres columnas de **todos** los productos con `SELECTCOLUMNS`, con los nombres `nombre`, `marca` y `precio`.
```dax solucion
EVALUATE SELECTCOLUMNS(productos, "nombre", productos[nombre], "marca", productos[marca], "precio", productos[precio])
```
```pista
`SELECTCOLUMNS(tabla, "nombre1", expresión1, "nombre2", expresión2, …)`.
```
:::

## Proyecto: tu primer informe completo

:::ejercicio abierto dificultad=Avanzado titulo="Un informe de punta a punta en el Power BI de práctica"
Abre el [Power BI de práctica](#/powerbi) y arma un informe con **un dataset que elijas**: un CSV o Excel tuyo, un dataset público (por ejemplo de datos.gob.ar o Kaggle) o las bases del curso. Cuando termines, describe aquí lo que hiciste:

1. **Datos**: qué tablas cargaste y qué pasos de Power Query aplicaste (al menos dos: tipos, quitar columnas, filtrar, columna personalizada…).
2. **Modelo**: qué relaciones hay, cuál es la tabla de hechos y cuáles las dimensiones. Si hay fechas, crea `Calendario = CALENDARAUTO()` y relaciónala.
3. **Medidas**: al menos cuatro, con una de `CALCULATE` y una de tiempo o de `% del total`. Pega su DAX.
4. **Informe**: al menos cuatro objetos visuales (una tarjeta, un gráfico por categoría, uno por fecha y una segmentación), con títulos claros.
5. **Consulta**: una consulta en la vista de consultas DAX que compruebe un número del informe.
6. **Publicar**: publícalo y guárdalo con *Archivo → Guardar como*. Exporta el modelo con *Archivo → Exportar el modelo (TMDL)* y súbelo a tu repositorio de portafolio.
```rubrica
Cargó datos y aplicó al menos dos pasos de Power Query, y explica para qué sirve cada uno
Armó un modelo en estrella: identifica hechos y dimensiones y las relaciones son de varios a uno
Escribió al menos cuatro medidas con nombres claros, incluida una con CALCULATE y una de tiempo o porcentaje del total
El informe tiene una tarjeta, un gráfico por categoría, uno temporal y una segmentación, con títulos que dicen qué muestran
Comprobó un número del informe con una consulta DAX (EVALUATE)
Publicó o exportó el modelo en TMDL y lo versionó en un repositorio
```
```solucion
Ejemplo con las bases del curso:
1. Datos: pedidos, detalle_pedidos, productos, categorias y clientes. En Power Query quité columnas técnicas (email, teléfono) y cambié fecha_pedido a tipo fecha.
2. Modelo: hechos detalle_pedidos y pedidos; dimensiones clientes, productos, categorias y una tabla Calendario = CALENDARAUTO() relacionada con pedidos[fecha_pedido].
3. Medidas: Ventas = SUMX(detalle_pedidos, detalle_pedidos[cantidad] * detalle_pedidos[precio_unitario] * (1 - detalle_pedidos[descuento])); Pedidos = COUNTROWS(pedidos); Ticket = DIVIDE([Ventas], [Pedidos]); % del total = DIVIDE([Ventas], CALCULATE([Ventas], ALLSELECTED(clientes[pais]))); Acumulado año = TOTALYTD([Ventas], Calendario[Date]).
4. Informe: tarjetas de Ventas y Ticket, columnas de Ventas por categoría, líneas de Ventas y Acumulado por mes y una segmentación de canal.
5. Consulta: EVALUATE SUMMARIZECOLUMNS(pedidos[canal], "Ventas", [Ventas]) coincide con el gráfico por canal.
6. Publicado y exportado como model.tmdl en el repositorio.
```
:::

:::entrevista "¿Cómo depurarías un número que no cuadra en un informe de Power BI?"
Copiaría la consulta del objeto visual desde el Analizador de rendimiento y la ejecutaría en la vista de consultas DAX. Ahí reviso qué filtros llegan (segmentaciones, filtros de página, filtros cruzados) y calculo la medida por partes con DEFINE y VAR. Comparo contra una consulta SQL al origen para ver si el problema es de datos (Power Query, duplicados, relaciones) o de la fórmula (contexto de filtro, ALL de más o de menos).
:::
