---
titulo: Proyecto guiado - un informe de ventas de punta a punta en Excel
nivel: Avanzado
duracion: 60
resumen: Juntas todo lo del curso en un pedido real - "¿cómo vienen las ventas por canal y cuántos pedidos se pierden?". Cargas los datos, calculas indicadores con fórmulas, los comparas con una tabla dinámica, haces el gráfico y entregas el resultado en CSV. Con una lista de control para revisar antes de entregar y los retos de la app.
objetivos: Convertir un pedido de negocio en preguntas que Excel puede responder | Calcular indicadores con COUNTIF, COUNTIFS y porcentajes | Verificar tus fórmulas con una tabla dinámica | Entregar el resultado (gráfico y CSV) y revisarlo con una lista de control
prerrequisitos: excel-tablas-dinamicas-graficos
autoevaluacion: ¿Sabes pasar de un pedido a preguntas concretas? | ¿Sabes calcular un porcentaje con dos COUNTIF? | ¿Sabes comprobar un número de dos formas distintas? | ¿Sabes exportar una hoja a CSV?
---

:::escenario El pedido
Tu jefa te escribe: *"Para la reunión de mañana necesito saber cuántos pedidos tuvimos por canal, qué porcentaje se canceló en cada uno y un gráfico simple. Mandámelo en un archivo."*
:::

## Paso 1 — Convierte el pedido en preguntas

Antes de tocar Excel, escribe las preguntas (este es el método del módulo [Lógica](#/m/logica)):

1. ¿Cuántos pedidos hay por canal?
2. ¿Cuántos cancelados por canal?
3. ¿Qué porcentaje de cancelación tiene cada canal?
4. Un gráfico que se entienda en 5 segundos.

## Paso 2 — Prepara la hoja de resultados

1. Carga **pedidos** (**Data → Get Data**).
2. Crea una hoja nueva con el **+** de abajo. Haz doble clic en su nombre y llámala `Informe`.
3. Escribe esta tabla de base:

| | A | B | C | D |
|---|---|---|---|---|
| 1 | canal | pedidos | cancelados | % cancelación |
| 2 | web | | | |
| 3 | app | | | |
| 4 | tienda | | | |
| 5 | telefono | | | |

## Paso 3 — Calcula con fórmulas

En la hoja **Informe**:

1. **B2**: `=COUNTIF(pedidos!F:F,A2)`. La referencia `pedidos!F:F` trae la columna F de **otra hoja**.
2. **C2**: `=COUNTIFS(pedidos!F:F,A2,pedidos!E:E,"cancelado")`.
3. **D2**: `=C2/B2` y dale formato **Percentage**.
4. Selecciona **B2:D2** y arrastra el controlador de relleno hasta la fila 5. `A2` pasa a `A3`, `A4`… y cada fila calcula su canal.

:::tip Por qué A2 y no "web"
Escribiendo `A2` en lugar de `"web"`, la misma fórmula sirve para todas las filas: al copiarla, cambia sola al canal de cada fila.
:::

## Paso 4 — Verifica con una tabla dinámica

Un número que no comprobaste es un número en el que no puedes confiar. Crea una tabla dinámica (Rows = canal, Columns = estado, Values = pedido_id, Count) y compara: los totales de cada canal y la columna **cancelado** deben coincidir con tu hoja **Informe**.

```captura
archivo: excel/05-pivot-resultado.webp
texto: La tabla dinámica de control: los totales por canal deben coincidir con tus fórmulas
```

Si no coinciden, revisa: ¿escribiste bien el canal? (`telefono` va sin tilde). ¿Copiaste la fórmula entera?

## Paso 5 — El gráfico

1. En **Informe**, selecciona **A1:B5** (canal y pedidos).
2. **Insert → Column**.
3. Si quieres comparar la cancelación, selecciona `A1:A5` junto con `D1:D5`. (En esta réplica, selecciona `A1:D5` y el gráfico mostrará las tres series.)

## Paso 6 — Entrega

1. Pestaña **File** → **Export CSV**: descarga la hoja activa como archivo.

```captura
archivo: excel/06-exportar.webp
texto: Export CSV (1) descarga la hoja; Office Theme (2) cambia el tema
```

2. Escribe dos líneas para acompañar el archivo: qué muestra y qué conclusión sacas (por ejemplo, "el canal web concentra el 45 % de los pedidos y su cancelación es similar a la de la app").

## ✔ Lista de control antes de entregar

- [ ] Los totales coinciden con la tabla dinámica.
- [ ] Los porcentajes tienen formato de porcentaje.
- [ ] Ninguna celda muestra errores (`#N/A`, `#DIV/0!`).
- [ ] El gráfico tiene título y se entiende sin explicación.
- [ ] El archivo tiene un nombre claro (`informe_canales_2024.csv`, no `Sheet1.csv`).

## 🎯 Retos de la app

En [Excel de práctica](#/excel), el botón **🎯 Retos** tiene 12 retos que se corrigen solos (de sumar un rango a crear una tabla dinámica y un gráfico). Si completaste este curso, deberías poder resolverlos todos.

:::ejercicio quiz
En la hoja Informe, ¿qué hace `=COUNTIF(pedidos!F:F,A2)`?
- [ ] Cuenta las celdas de la columna A
- [x] Cuenta en la columna F de la hoja pedidos cuántas veces aparece el canal escrito en A2
- [ ] Suma la columna F
- [ ] Copia el valor de A2 a la hoja pedidos
:::

:::ejercicio quiz
¿Por qué conviene comprobar las fórmulas con una tabla dinámica?
- [ ] Porque las fórmulas siempre están mal
- [x] Porque calcular lo mismo de dos formas distintas detecta errores antes de entregar
- [ ] Porque la tabla dinámica es más bonita
- [ ] Porque Excel lo exige
:::

:::ejercicio quiz
`=C2/B2` da `#DIV/0!` en una fila. ¿Qué significa?
- [ ] Que C2 tiene texto
- [x] Que B2 es cero o está vacía: ese canal no tiene pedidos (o está mal escrito)
- [ ] Que falta el formato porcentaje
- [ ] Que la hoja pedidos no existe
:::
