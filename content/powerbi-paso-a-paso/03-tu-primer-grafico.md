---
titulo: Tu primer gráfico - la galería, los pozos de campos y el filtrado cruzado
nivel: 1 · Básico
duracion: 40
resumen: Cómo se arma un objeto visual en Power BI - elegir un tipo en la galería, poner campos en sus pozos (Eje X, Eje Y, Leyenda, Valores), cambiar la agregación, mover y redimensionar, agregar una tarjeta y una segmentación de datos, y ver cómo al hacer clic en una barra se filtran los demás gráficos de la página.
objetivos: Crear un objeto visual desde la galería | Llenar los pozos de campos y cambiar la agregación | Agregar una tarjeta y una segmentación | Entender el filtrado cruzado entre visuales | Guardar el informe
prerrequisitos: powerbi-paso-a-paso-obtener-datos
autoevaluacion: ¿Sabes qué es un pozo de campos? | ¿Sabes cambiar Suma por Recuento? | ¿Sabes qué pasa al hacer clic en una barra? | ¿Sabes por qué conviene deseleccionar antes de crear otro visual?
---

:::analogia En palabras simples
Un objeto visual es un molde: eliges la forma (barras, líneas, tarjeta) y le dices qué ingrediente va en cada hueco (el eje, los valores, la leyenda). Power BI cocina el gráfico. Y los gráficos de una página se hablan entre sí: tocas uno y los demás reaccionan.
:::

## Paso 1 — Crear el visual desde la galería

En la vista Informe, sin nada seleccionado, haz clic en **Gráfico de columnas agrupadas** en la galería del panel Visualizaciones:

```captura
archivo: powerbi/b03-visual-vacio.webp
texto: El ícono de la galería (1) crea un visual vacío en el lienzo (2); debajo aparecen sus pozos - Eje X (3) y Eje Y (4)
```

Cada tipo de visual tiene sus **pozos** (los huecos donde van los campos): un gráfico de columnas tiene Eje X, Eje Y, Leyenda e Información sobre herramientas; una tarjeta tiene Campos; una matriz tiene Filas, Columnas y Valores.

## Paso 2 — Llenar los pozos

Con el visual seleccionado, marca la casilla de **pedidos → canal** en el panel Datos: va al Eje X. Arrastra **pedidos → pedido_id** al Eje Y y, en el menú del campo, elige **Recuento**:

```captura
archivo: powerbi/b03-pozos.webp
texto: El campo canal (1) en Eje X (2), pedido_id como Recuento en Eje Y (3), y el gráfico listo (4) - web 5400, app 2973, tienda 2645, telefono 982
```

| Acción | Cómo |
|---|---|
| Agregar un campo | Marcar su casilla (va al pozo por defecto) o arrastrarlo al pozo que quieras |
| Cambiar la agregación | El menú del campo dentro del pozo: Suma, Promedio, Mínimo, Máximo, Recuento, Recuento (distintos), No resumir |
| Quitar un campo | La ✕ junto al campo en el pozo |
| Mover y redimensionar | Arrastrar el visual; los tiradores en los bordes |

## Paso 3 — Una tarjeta y una segmentación

**Haz clic en un lugar vacío del lienzo** para deseleccionar (si no, el siguiente clic en la galería **cambia el tipo** del visual seleccionado en vez de crear uno nuevo). Después:

1. **Tarjeta** → `pedidos → pedido_id` (Recuento): el número total de pedidos, **12 000**.
2. **Segmentación de datos** → `pedidos → estado`: una lista de casillas para filtrar la página.

```captura
archivo: powerbi/b03-tres-visuales.webp
texto: Columnas por canal, la tarjeta con el total y la segmentación por estado
```

## Paso 4 — El filtrado cruzado

Haz clic en la barra **web**:

```captura
archivo: powerbi/b03-cruzado.webp
texto: Al seleccionar una barra, los demás visuales de la página se filtran por ese canal
```

Es el comportamiento por defecto entre visuales de una misma página: **seleccionar en uno filtra (o resalta) los otros**. Marca `entregado` en la segmentación y mira cómo cambian las columnas y la tarjeta. Clic de nuevo para quitar la selección.

## Paso 5 — Guardar

```captura
archivo: powerbi/b04-archivo.webp
texto: Archivo - Nuevo, Abrir, Guardar como, Exportar el modelo (TMDL), Exportar a PDF, Publicar
```

En la práctica el informe se guarda solo en tu navegador; **Guardar como** lo descarga. En Power BI real, **Ctrl + S** guarda el `.pbix` (o el proyecto `.pbip`).

## ✅ Lo que lograste

- Creaste tres objetos visuales y entendiste los pozos.
- Cambiaste una agregación.
- Viste el filtrado cruzado.

:::ejercicio quiz
Tienes un visual seleccionado y haces clic en "Tarjeta" en la galería. ¿Qué pasa?
- [ ] Se crea una tarjeta nueva
- [x] El visual seleccionado se convierte en tarjeta
- [ ] Se borra el visual
- [ ] Nada
:::

:::ejercicio quiz
Pusiste pedido_id en Eje Y y muestra "Suma de pedido_id". ¿Qué haces?
- [ ] Lo borro
- [x] En el menú del campo dentro del pozo elijo Recuento
- [ ] Cambio el tipo de visual
- [ ] Creo otra tabla
:::

:::ejercicio quiz
¿Qué pasa al hacer clic en una barra del gráfico?
- [ ] Se abre el editor
- [x] Los demás visuales de la página se filtran por ese valor
- [ ] Se borra la barra
- [ ] Cambia el color de la página
:::
