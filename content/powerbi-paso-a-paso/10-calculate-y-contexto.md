---
titulo: CALCULATE y el contexto de filtro - la función más importante de DAX
nivel: 3 · Intermedio
duracion: 55
resumen: Toda medida se calcula dentro de un contexto de filtro - lo que el visual, las segmentaciones y los filtros dejan pasar. CALCULATE cambia ese contexto - agrega una condición, la reemplaza o la quita con ALL. Ventas web, porcentaje del total, por qué Ventas web da lo mismo en cada fila de canal, y la vista de consultas DAX para probar medidas sin armar un gráfico.
objetivos: Explicar qué es el contexto de filtro | Usar CALCULATE con una condición | Calcular un porcentaje del total con ALL | Entender por qué un filtro de CALCULATE reemplaza al del visual | Probar medidas con EVALUATE en la vista de consultas DAX
prerrequisitos: powerbi-paso-a-paso-medidas-dax
autoevaluacion: ¿Sabes qué es el contexto de filtro de una celda? | ¿Sabes qué hace ALL(pedidos) dentro de CALCULATE? | ¿Sabes por qué Ventas web es igual en todas las filas de canal? | ¿Sabes escribir un EVALUATE con SUMMARIZECOLUMNS?
---

:::analogia En palabras simples
Cada número del informe se calcula "mirando por una ventana": la barra de web mira solo los pedidos web, el mes de marzo mira solo marzo. Esa ventana es el **contexto de filtro**. **CALCULATE** te deja cambiar la ventana a propósito: "mira solo web", o "mira todo, ignorando el canal".
:::

## Paso 1 — El contexto de filtro

En la tabla del paso anterior (canal, Ventas), la celda de **app** vale 3 780 449,86 porque su contexto es `pedidos[canal] = "app"`: el filtro viaja por la relación de `pedidos` a `detalle_pedidos` y SUMX recorre solo esas líneas. La fila **Total** no tiene filtro de canal: 14 878 014,07. Agrega una segmentación y su selección se suma al contexto de todas las celdas.

## Paso 2 — CALCULATE con una condición

```text
Ventas web = CALCULATE([Ventas], pedidos[canal] = "web")
% del total = DIVIDE([Ventas], CALCULATE([Ventas], ALL(pedidos)))
```

```captura
archivo: powerbi/b10-calculate.webp
texto: Ventas, Ventas web y % del total por canal - Ventas web vale 6,8 M en todas las filas
```

| Expresión | Qué hace con el contexto |
|---|---|
| `CALCULATE([Ventas], pedidos[canal] = "web")` | **Reemplaza** cualquier filtro sobre `canal` por `canal = "web"` |
| `CALCULATE([Ventas], ALL(pedidos))` | **Quita** todos los filtros sobre la tabla `pedidos` |
| `CALCULATE([Ventas], KEEPFILTERS(pedidos[canal] = "web"))` | **Agrega** la condición sin reemplazar: en la fila app daría vacío |

Por eso **Ventas web** muestra 6 807 135,34 también en la fila de app: CALCULATE pisó el filtro `canal = "app"` del visual con `canal = "web"`. Y **% del total** divide las ventas de cada canal por las de todos los canales: web 0,46 · app 0,25 · tienda 0,21 · telefono 0,08 (con formato de porcentaje: 45,8 % · 25,4 % · 21,3 % · 7,5 %).

:::cuidado ALL quita más de lo que parece
`ALL(pedidos)` quita **todos** los filtros de la tabla `pedidos`, incluido el de una segmentación por estado. Si quieres el porcentaje sobre lo que el usuario dejó visible, usa `ALLSELECTED(pedidos)`; si solo quieres ignorar el canal, `ALL(pedidos[canal])`.
:::

## Paso 3 — La vista de consultas DAX

La cuarta vista de la barra izquierda permite probar una medida sin armar un visual:

```text
EVALUATE
    SUMMARIZECOLUMNS(
        pedidos[canal],
        "Ventas", [Ventas],
        "Pedidos", [Pedidos]
    )
ORDER BY [Ventas] DESC
```

```captura
archivo: powerbi/b10-consultas-dax.webp
texto: La consulta (1) y su resultado como tabla (2)
```

| Consulta | Devuelve |
|---|---|
| `EVALUATE TOPN(10, clientes)` | Las primeras 10 filas de una tabla |
| `EVALUATE SUMMARIZECOLUMNS(columna, "Nombre", [Medida])` | Una tabla agrupada, como un GROUP BY |
| `DEFINE MEASURE pedidos[Prueba] = … EVALUATE {[Prueba]}` | Probar una medida nueva sin crearla en el modelo |

Clic derecho (o ⋯) en un campo del panel Datos ofrece consultas rápidas: vista previa, estadísticas de columna, evaluar una medida.

## Paso 4 — Las funciones de filtro que más se usan

| Función | Uso típico |
|---|---|
| `FILTER(tabla, condición)` | Condiciones que no son "columna = valor": `FILTER(productos, productos[precio] > 500)` |
| `ALL`, `ALLEXCEPT`, `ALLSELECTED`, `REMOVEFILTERS` | Quitar filtros para totales y porcentajes |
| `VALUES(col)`, `SELECTEDVALUE(col)` | Qué valores hay en el contexto; el único seleccionado |
| `USERELATIONSHIP` | Usar una relación inactiva (fecha de envío en vez de fecha de pedido) |

## ✅ Lo que lograste

- Entiendes el contexto de filtro.
- Usas CALCULATE para agregar, reemplazar y quitar filtros.
- Pruebas medidas con la vista de consultas DAX.

:::ejercicio quiz
¿Por qué "Ventas web" muestra el mismo número en la fila de app?
- [ ] Porque hay un error en los datos
- [x] Porque CALCULATE reemplaza el filtro de canal del visual por canal = "web"
- [ ] Porque falta una relación
- [ ] Porque la tabla no está ordenada
:::

:::ejercicio quiz
¿Qué hace CALCULATE([Ventas], ALL(pedidos))?
- [ ] Ventas solo de pedidos entregados
- [x] Ventas ignorando todos los filtros de la tabla pedidos
- [ ] Ventas de todos los productos
- [ ] Nada
:::

:::ejercicio quiz
Quieres el % de cada canal sobre lo que el usuario dejó seleccionado en la segmentación de estado. ¿Qué usas en el denominador?
- [ ] ALL(pedidos)
- [x] ALLSELECTED(pedidos)
- [ ] VALUES(pedidos)
- [ ] FILTER(pedidos, TRUE)
:::
