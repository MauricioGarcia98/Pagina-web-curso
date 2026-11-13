---
titulo: Ordenar y filtrar - ver solo lo que importa sin romper la tabla
nivel: 4 · Intermedio-avanzado
duracion: 40
resumen: Filtrar para quedarte con las filas que importan, ordenar sin separar los datos de una fila, combinar filtros en varias columnas y leer correctamente lo que muestra la barra de estado cuando hay filas ocultas. Con la regla que evita el error más caro de Excel - ordenar una sola columna.
objetivos: Activar y quitar el filtro de una tabla | Filtrar por uno o varios valores y en varias columnas | Ordenar una tabla sin mezclar sus filas | Leer cuántas filas quedan visibles | Saber qué fórmulas ven y cuáles no las filas ocultas
prerrequisitos: excel-buscar-entre-tablas
autoevaluacion: ¿Sabes activar y quitar un filtro? | ¿Sabes qué pasa con las filas ocultas? | ¿Sabes ordenar sin desordenar las filas? | ¿Sabes si SUM cuenta las filas que el filtro oculta?
---

:::analogia En palabras simples
Filtrar es como un colador: pasan solo las filas que elegiste y las demás quedan escondidas (no se borran). Ordenar es acomodar las fichas de un fichero: cada ficha (fila) se mueve **entera**.
:::

## Paso 1 — Activa el filtro

En la hoja **pedidos** (Data → Get Data → pedidos si no la tienes):

1. Haz clic en cualquier celda de la tabla, por ejemplo **E3**.
2. Pestaña **Data** → **Filter** (atajo: **Ctrl + Shift + L**).

```captura
archivo: excel/04-boton-filtro.webp
texto: El botón Filter de la pestaña Data
```

3. Aparece una flechita en cada encabezado.

```captura
archivo: excel/04-flechas.webp
texto: Las flechas de filtro en los encabezados; la de "estado" está marcada
```

## Paso 2 — Muestra solo los pedidos cancelados

1. Haz clic en la flechita de **estado**.
2. Desmarca **(Select All)** para quitar todas las marcas.
3. Marca solo **cancelado**. Al lado de cada valor ves cuántas filas tiene.
4. Presiona **OK**.

```captura
archivo: excel/04-menu-filtro.webp
texto: El menú del filtro: (1) quitar todo, (2) marcar cancelado, (3) OK
```

5. Quedan solo los cancelados. La barra de estado dice cuántas filas se ven.

```captura
archivo: excel/04-filtrado.webp
texto: Modo filtro: la barra de estado cuenta las filas visibles
```

:::tip Las filas no se borraron
Fíjate en los números de fila: saltan (15, 36, 59…). Las demás siguen ahí, ocultas. Para volver a verlas, presiona otra vez **Filter**.
:::

## Paso 3 — Filtros en varias columnas

Con el filtro de **estado** = cancelado activo, abre la flecha de **canal** y deja solo **web**. Ahora ves los pedidos web cancelados: los filtros de distintas columnas se combinan con **Y** (las dos condiciones a la vez).

Para el **O** (por ejemplo, cancelado **o** devuelto) se marcan los dos valores en la **misma** columna.

| Quiero ver | Cómo |
|---|---|
| Cancelados de la web | estado = cancelado **y** canal = web (dos columnas) |
| Cancelados o devueltos | estado: marcar cancelado y devuelto (una columna) |
| Todo menos tienda | canal: Select All y desmarcar tienda |

Presiona **Filter** para quitar todos los filtros antes de seguir.

:::cuidado Las fórmulas ven todo
`SUM`, `COUNTIF` y casi todas las funciones calculan con **todas** las filas, también las ocultas por el filtro. El filtro es para **mirar**; para calcular con condiciones usa `COUNTIFS`/`SUMIFS` (nivel 3) o una tabla dinámica (nivel 5). En Excel real existe `SUBTOTAL`, que solo cuenta las visibles, pero es fácil olvidarse de que el resultado cambia según el filtro activo.
:::

## Paso 4 — Ordena la tabla

1. Haz clic en una celda de la columna **fecha_pedido** (por ejemplo **D3**).
2. Pestaña **Data** → **Sort Z→A** (de la más nueva a la más vieja).

```captura
archivo: excel/04-ordenado.webp
texto: Sort Z→A (1): los pedidos más recientes quedan arriba (2)
```

Excel reconoce que la primera fila es el encabezado y la deja arriba. Cada fila se mueve **entera**: el pedido sigue con su cliente, su estado y su canal.

:::cuidado Nunca ordenes una sola columna
Si seleccionas solo una columna y la ordenas aparte, se mezclan los datos: el pedido 1 quedaría con el estado de otro. Es un error que no se ve a simple vista y puede pasar meses sin que nadie lo note. Haz clic **dentro** de la tabla (una sola celda) y deja que Excel tome la tabla entera. Si te pasa, **Ctrl + Z** de inmediato.
:::

## Paso 5 — Ordenar por varias columnas

¿Quieres los pedidos ordenados por canal y, dentro de cada canal, del más nuevo al más viejo? Ordena **primero por la columna menos importante** y **al final por la más importante**:

1. Clic en **D3** → **Sort Z→A** (fecha, más nueva primero).
2. Clic en **F3** → **Sort A→Z** (canal).

El último orden manda; los anteriores se conservan dentro de cada grupo. (En Excel real, **Data → Sort** abre un cuadro donde agregas los niveles en orden.)

## Paso 6 — Listas de valores únicos

Para saber qué valores distintos tiene una columna, en una celda vacía (por ejemplo **Q1**) escribe:

```text
=UNIQUE(F2:F12001)
```

En Excel 365 el resultado se "derrama" hacia abajo, una fila por valor. En esta réplica la celda muestra el primero; el menú del filtro te da la lista completa con la cantidad de cada uno.

## ✅ Lo que lograste

- Filtraste por uno y varios valores, en una y varias columnas.
- Ordenaste por una y por varias columnas sin romper la tabla.
- Sabes que el filtro es para mirar y las fórmulas siguen viendo todo.

:::ejercicio quiz
Aplicas un filtro y "desaparecen" filas. ¿Qué les pasó?
- [ ] Se borraron
- [x] Están ocultas; vuelven al quitar el filtro
- [ ] Se movieron a otra hoja
- [ ] Se ordenaron al final
:::

:::ejercicio quiz
Filtras estado = cancelado y en una celda tienes `=COUNTA(A:A)-1`. ¿Qué cuenta?
- [ ] Solo los cancelados visibles
- [x] Todos los pedidos, porque las funciones ven también las filas ocultas
- [ ] Cero
- [ ] Da error mientras hay filtro
:::

:::ejercicio quiz
Quieres ordenar por canal y, dentro de cada canal, por fecha. ¿En qué orden aplicas los dos Sort?
- [ ] Primero canal, después fecha
- [x] Primero fecha, después canal: el último orden manda
- [ ] Da igual
- [ ] No se puede ordenar por dos columnas
:::

:::ejercicio quiz
¿Por qué hay que hacer clic dentro de la tabla (y no seleccionar una sola columna) antes de ordenar?
- [ ] Porque si no, Excel no ordena
- [x] Para que cada fila se mueva entera y no se mezclen los datos
- [ ] Para que el orden sea más rápido
- [ ] Porque solo se puede ordenar la columna A
:::
