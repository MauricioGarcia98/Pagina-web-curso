---
titulo: Funciones para analizar - COUNTIF, COUNTIFS, XLOOKUP e IFERROR con datos reales
nivel: Intermedio
duracion: 45
resumen: Cargar una tabla real (12.000 pedidos de la tienda del curso) y responder preguntas de negocio con funciones - contar con condiciones, buscar un dato en otra tabla, entender el error #N/A y protegerse con IFERROR. Incluye cómo buscar la función que necesitas con Insert Function.
objetivos: Cargar una tabla del curso con Data → Get Data | Contar con una y con varias condiciones (COUNTIF, COUNTIFS) | Traer un dato con XLOOKUP y entender #N/A | Encontrar funciones con las sugerencias y con Insert Function
prerrequisitos: excel-formulas
autoevaluacion: ¿Sabes cargar una tabla del curso? | ¿Sabes contar pedidos entregados con COUNTIF? | ¿Sabes qué significa #N/A? | ¿Sabes buscar una función que no recuerdas?
---

:::analogia En palabras simples
Con muchas filas no se cuenta a mano: se le hace una pregunta a la tabla. "¿Cuántos pedidos están entregados?" es `COUNTIF`. "¿Por qué canal entró el pedido 5?" es `XLOOKUP`. Las funciones son preguntas con nombre.
:::

## Paso 1 — Carga los pedidos de la tienda

1. Ve a la pestaña **Data** y presiona **Get Data**.
2. Elige **pedidos** (ya viene marcado) y presiona **Load**.

```captura
archivo: excel/03-get-data.webp
texto: Get Data: elige la tabla y presiona Load (2)
```

3. Se abre una hoja nueva llamada **pedidos** con 12.000 filas: una por pedido.

```captura
archivo: excel/03-pedidos.webp
texto: La hoja pedidos (1), con una fila por pedido
```

Columnas importantes: **A** pedido_id, **E** estado (entregado, cancelado…), **F** canal (web, app, tienda, teléfono).

:::tip Prueba Ctrl + ↓
Haz clic en A1 y presiona Ctrl + ↓ para ver cuántas filas hay. Ctrl + ↑ te devuelve arriba.
:::

## Paso 2 — Contar con una condición: COUNTIF

Pregunta: **¿cuántos pedidos están entregados?**

1. En **I1** escribe `Entregados` (es solo un rótulo).
2. En **J1** escribe `=COUNTIF(E:E,"entregado")` y Enter.

```captura
archivo: excel/03-countif.webp
texto: COUNTIF en la barra de fórmulas (1) y su resultado (2): 9.288 pedidos entregados
```

Cómo se lee: "en la columna E, contá las celdas que dicen *entregado*". `E:E` significa toda la columna E.

| Criterio | Cuenta |
|---|---|
| `"entregado"` | Las que dicen exactamente eso (sin importar mayúsculas) |
| `">100"` | Los números mayores a 100 |
| `"<>cancelado"` | Todas menos las que dicen cancelado |
| `"t*"` | Las que empiezan con t (tienda, teléfono…) |

## Paso 3 — Contar con varias condiciones: COUNTIFS

Pregunta: **¿cuántos pedidos entregados entraron por la web?**

1. En **I2** escribe `Entregados web`.
2. En **J2** escribe `=COUNTIFS(E:E,"entregado",F:F,"web")`.

`COUNTIFS` recibe **pares** de rango y criterio, y cuenta las filas que cumplen **todos**. El resultado es 4.201.

## Paso 4 — Traer un dato: XLOOKUP

Pregunta: **¿por qué canal entró el pedido número 5?**

1. En **I3** escribe `Canal del pedido 5`.
2. En **J3** escribe `=XLOOKUP(5,A:A,F:F,"no está")`.

```captura
archivo: excel/03-xlookup.webp
texto: XLOOKUP (1) busca el 5 en la columna A y devuelve lo de la columna F (2)
```

Se lee: "buscá **5** en **A:A**, y devolvé lo que está en la misma fila de **F:F**; si no lo encontrás, poné *no está*".

## Paso 5 — El error #N/A y cómo evitarlo

1. En **I4** escribe `Pedido 999999`.
2. En **J4** escribe `=VLOOKUP(999999,A:F,6,FALSE)`.

```captura
archivo: excel/03-error-na.webp
texto: #N/A significa "no se encontró"
```

`VLOOKUP` es la función clásica de búsqueda (busca en la **primera** columna del rango y devuelve la columna número 6). Como el pedido 999999 no existe, devuelve **#N/A**. Para mostrar un mensaje en lugar del error:

```text
=IFERROR(VLOOKUP(999999,A:F,6,FALSE),"no existe")
```

| Error | Significa |
|---|---|
| `#N/A` | No se encontró lo que buscabas |
| `#DIV/0!` | Dividiste por cero o por una celda vacía |
| `#NAME?` | Excel no conoce ese nombre: revisa cómo escribiste la función |
| `#VALUE!` | Mezclaste texto con números en una cuenta |

## Paso 6 — Encuentra la función que necesitas

**Sugerencias mientras escribes.** En una celda vacía escribe `=COU`: aparece la lista de funciones que empiezan así, con una explicación.

```captura
archivo: excel/03-sugerencias.webp
texto: Las sugerencias aparecen mientras escribes el nombre de la función
```

**Insert Function.** Si no recuerdas el nombre:

1. Pestaña **Formulas** → **Insert Function**.
2. Escribe lo que quieres hacer, por ejemplo `cuenta`.
3. Elige una función: abajo ves cómo se escribe y qué hace.

```captura
archivo: excel/03-insertar-funcion.webp
texto: Insert Function: busca por lo que quieres hacer (1) y lee cómo se usa (2)
```

## ✅ Lo que lograste

- Cargaste una tabla de 12.000 filas.
- Respondiste preguntas con COUNTIF, COUNTIFS y XLOOKUP.
- Sabes leer #N/A y protegerte con IFERROR.

:::ejercicio quiz
¿Qué fórmula cuenta los pedidos cancelados si el estado está en la columna E?
- [ ] `=COUNT(E:E,"cancelado")`
- [x] `=COUNTIF(E:E,"cancelado")`
- [ ] `=SUMIF(E:E,"cancelado")`
- [ ] `=COUNTA(cancelado)`
:::

:::ejercicio quiz
¿Qué devuelve `=XLOOKUP(5,A:A,F:F)` si el 5 no está en la columna A?
- [ ] 0
- [ ] Una celda vacía
- [x] #N/A
- [ ] #DIV/0!
:::

:::ejercicio quiz
Quieres contar pedidos entregados **y** de la app. ¿Qué función usas?
- [ ] COUNTIF con dos criterios en el mismo texto
- [x] COUNTIFS, con un par de rango y criterio por condición
- [ ] SUM
- [ ] VLOOKUP
:::

:::ejercicio quiz
Escribes `=SUMA(B2:B10)` y aparece `#NAME?`. ¿Por qué?
- [ ] Porque el rango está vacío
- [x] Porque en Excel en inglés la función se llama SUM
- [ ] Porque falta el $
- [ ] Porque hay texto en el rango
:::
