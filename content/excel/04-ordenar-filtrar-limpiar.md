---
titulo: Ordenar, filtrar y limpiar datos - Filter, Sort, Remove Duplicates y funciones de texto
nivel: Intermedio
duracion: 40
resumen: Lo que más se hace con datos reales antes de analizarlos - filtrar para ver solo lo que importa, ordenar sin romper las filas, quitar duplicados y limpiar textos con TRIM y LOWER. Paso a paso con la tabla de pedidos y con una tabla de clientes sucia a propósito.
objetivos: Activar el filtro y mostrar solo algunos valores | Ordenar una tabla por una columna sin separar las filas | Quitar filas duplicadas y saber qué se compara | Limpiar textos con TRIM, LOWER y PROPER
prerrequisitos: excel-funciones
autoevaluacion: ¿Sabes activar y quitar un filtro? | ¿Sabes qué pasa con las filas ocultas por un filtro? | ¿Sabes ordenar sin desordenar las filas? | ¿Sabes limpiar un email con espacios y mayúsculas?
---

:::analogia En palabras simples
Filtrar es como un colador: pasan solo las filas que elegiste, las demás quedan escondidas (no se borran). Ordenar es acomodar las fichas de un fichero: cada ficha (fila) se mueve entera.
:::

## Paso 1 — Activa el filtro

Seguimos en la hoja **pedidos** de la lección anterior (si no la tienes: **Data → Get Data → pedidos**).

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

6. Presiona **Filter** de nuevo para quitar el filtro.

## Paso 3 — Ordena la tabla

1. Haz clic en una celda de la columna **fecha_pedido** (por ejemplo **D3**).
2. Pestaña **Data** → **Sort Z→A** (de la más nueva a la más vieja).

```captura
archivo: excel/04-ordenado.webp
texto: Sort Z→A (1): los pedidos más recientes quedan arriba (2)
```

Excel reconoce que la primera fila es el encabezado y la deja arriba. Cada fila se mueve **entera**: el pedido sigue con su cliente, su estado y su canal.

:::tip Nunca ordenes una sola columna
Si seleccionas solo una columna y la ordenas aparte, se mezclan los datos (el pedido 1 quedaría con el estado de otro). Haz clic **dentro** de la tabla y deja que Excel tome la tabla entera.
:::

## Paso 4 — Una tabla sucia: clientes_crudo

1. **Data → Get Data → clientes_crudo → Load**.
2. Esta tabla viene sucia a propósito: emails con espacios y mayúsculas, filas repetidas, celdas vacías.

```captura
archivo: excel/04-crudo.webp
texto: clientes_crudo: datos como llegan de verdad, con errores
```

## Paso 5 — Quita las filas duplicadas

1. Haz clic dentro de la tabla.
2. **Data → Remove Duplicates**.
3. Excel compara las filas completas y te dice cuántas quitó y cuántas quedan.

```captura
archivo: excel/04-duplicados.webp
texto: El resumen de Remove Duplicates
```

:::cuidado Piensa qué es "duplicado"
Dos filas pueden ser el mismo cliente aunque cambie la fecha de carga. En el trabajo real se decide por una clave (por ejemplo, el id del cliente) y nos quedamos con la fila más nueva. Eso se hace mejor con SQL o Python; en Excel, Remove Duplicates compara las columnas tal como están.
:::

## Paso 6 — Limpia un texto con fórmulas

1. En **H1** escribe `email_limpio`.
2. En **H2** escribe `=LOWER(TRIM(E2))` y Enter.
3. Copia la fórmula hacia abajo con el controlador de relleno.

```captura
archivo: excel/04-limpiar-texto.webp
texto: LOWER(TRIM(...)) quita los espacios y pasa a minúsculas
```

| Función | Hace | Ejemplo |
|---|---|---|
| `TRIM` | Quita espacios al principio, al final y repetidos | `"  ana "` → `"ana"` |
| `LOWER` | Todo a minúsculas | `"ANA@X.COM"` → `"ana@x.com"` |
| `UPPER` | Todo a mayúsculas | |
| `PROPER` | Primera letra de cada palabra en mayúscula | `"juan pérez"` → `"Juan Pérez"` |
| `SUBSTITUTE` | Reemplaza un texto por otro | `=SUBSTITUTE(A2,"-","")` |

Las funciones se combinan de adentro hacia afuera: primero `TRIM`, después `LOWER`.

## ✅ Lo que lograste

- Filtraste y ordenaste una tabla de 12.000 filas.
- Quitaste duplicados.
- Limpiaste textos con funciones.

:::ejercicio quiz
Aplicas un filtro y "desaparecen" filas. ¿Qué les pasó?
- [ ] Se borraron
- [x] Están ocultas; vuelven al quitar el filtro
- [ ] Se movieron a otra hoja
- [ ] Se ordenaron al final
:::

:::ejercicio quiz
¿Por qué hay que hacer clic dentro de la tabla (y no seleccionar una sola columna) antes de ordenar?
- [ ] Porque si no, Excel no ordena
- [x] Para que cada fila se mueva entera y no se mezclen los datos
- [ ] Para que el orden sea más rápido
- [ ] Porque solo se puede ordenar la columna A
:::

:::ejercicio quiz
¿Qué devuelve `=LOWER(TRIM("  ANA@CORREO.COM "))`?
- [ ] "  ana@correo.com "
- [x] "ana@correo.com"
- [ ] "ANA@CORREO.COM"
- [ ] Un error #VALUE!
:::
