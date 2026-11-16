---
titulo: Explorar tablas - esquema, detalles y vista previa gratis
nivel: 1 · Básico
duracion: 25
resumen: Antes de consultar conviene mirar. Abres la tabla pedidos y recorres su esquema (con el tamaño de cada columna, que es lo que paga cada consulta), sus detalles (filas, bytes, partición y clustering) y la vista previa, que en BigQuery es gratis. Conoces los tipos de GoogleSQL.
objetivos: Leer el esquema y el tamaño de cada columna | Interpretar los detalles de una tabla | Usar la vista previa sin costo | Reconocer los tipos de datos de GoogleSQL
prerrequisitos: bigquery-paso-a-paso-la-primera-consulta-y-los-bytes
autoevaluacion: ¿Sabes qué columna de pedidos es la más cara de leer? | ¿Sabes cómo está particionada pedidos? | ¿Sabes por qué Preview es gratis y SELECT * LIMIT 10 no? | ¿Sabes qué tipo usa GoogleSQL para texto?
---

:::analogia Mirar el menú antes de pedir
El esquema, los detalles y la vista previa son el menú: mirarlos no cuesta nada. Pedir el plato es ejecutar una consulta, y ahí sí se paga por todo lo que la cocina tiene que leer.
:::

## Paso 1 — El esquema

Explorador → `tienda` → `pedidos`:

```captura
archivo: bigquery/q03-schema.webp
texto: Las pestañas Schema, Details y Preview (1) y cada columna con su tipo, modo y tamaño (2)
```

La barra de tamaño muestra cuánto pesa cada columna: `metodo_pago` y `estado` (texto) pesan más que `pedido_id` (número). Una consulta que solo toca `canal` paga solo esa barra.

| Tipo de GoogleSQL | Para |
|---|---|
| `INT64`, `NUMERIC`, `FLOAT64` | Enteros, decimales exactos, decimales aproximados |
| `STRING` | Texto |
| `DATE`, `DATETIME`, `TIMESTAMP` | Fecha, fecha y hora local, instante (UTC) |
| `BOOL` | Verdadero o falso |
| `STRUCT`, `ARRAY`, `JSON` | Datos anidados y semiestructurados (nivel 3) |

## Paso 2 — Los detalles

```captura
archivo: bigquery/q03-details.webp
texto: Details - 12.000 filas, 693 KB, particionada por día en fecha_pedido y con clustering por canal
```

`pedidos` viene **particionada** por `fecha_pedido` y con **clustering** por `canal`: por eso las consultas que filtran por fecha leen menos (nivel 3).

## Paso 3 — Vista previa

```captura
archivo: bigquery/q03-preview.webp
texto: Preview - las primeras filas sin ejecutar una consulta
```

:::cuidado Preview es gratis, LIMIT no
La pestaña **Preview** lee la tabla sin un job de consulta: **no cuesta**. En cambio `SELECT * FROM pedidos LIMIT 10` procesa **todas** las columnas de toda la tabla: `LIMIT` recorta el resultado, no lo que se lee.
:::

:::errores
- **Explorar con `LIMIT`.** `SELECT * ... LIMIT 10` lee todas las columnas de toda la tabla; la vista previa muestra filas gratis.
- **Escribir tipos de otros motores.** En GoogleSQL no existe `VARCHAR(255)`: el texto es `STRING` y los enteros son `INT64`.
- **Filtrar sin mirar los detalles.** Si la tabla está particionada o tiene clustering, filtrar por esas columnas es lo que baja el costo; los detalles te lo dicen antes de escribir.
:::

## ✅ Lo que lograste

- Lees el esquema y el tamaño de cada columna.
- Interpretas los detalles de una tabla.
- Usas Preview para mirar sin pagar.

:::ejercicio quiz
¿Qué indica la barra de tamaño de cada columna en el esquema?
- [x] Cuánto pesa esa columna, que es lo que paga una consulta que la lee
- [ ] Cuántos valores nulos tiene
- [ ] Su posición en la tabla
- [ ] Cuántas veces se consultó esa columna este mes
:::

:::ejercicio quiz
¿Por qué la pestaña Preview es gratis?
- [ ] Porque muestra datos falsos
- [x] Porque lee la tabla sin ejecutar un job de consulta
- [ ] Porque solo funciona en tablas chicas
- [ ] Porque usa la caché de la última consulta
:::

:::ejercicio quiz
¿Cuánto procesa `SELECT * FROM pedidos LIMIT 10`?
- [ ] Solo 10 filas
- [x] Todas las columnas de toda la tabla
- [ ] Solo las columnas usadas en el ORDER BY
- [ ] Solo la primera columna
:::

:::ejercicio quiz
¿Qué tipo de GoogleSQL guarda texto?
- [ ] VARCHAR(255)
- [x] STRING
- [ ] TEXT
- [ ] CHAR
:::
