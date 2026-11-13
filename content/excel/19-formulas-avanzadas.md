---
titulo: Fórmulas avanzadas - SUMPRODUCT, búsquedas por tramos y con dos criterios, INDEX/MATCH de doble entrada y auditoría
nivel: 5 · Avanzado
duracion: 55
resumen: Las técnicas que separan a quien usa Excel de quien lo domina. Multiplicar y sumar columnas en un paso (SUMPRODUCT), clasificar por tramos con una tabla de referencia en lugar de IF anidados, buscar con dos condiciones, leer una celda de una tabla de doble entrada, armar una hoja de indicadores y auditar fórmulas largas. Con las funciones nuevas de Excel 365 que vas a encontrar en el trabajo.
objetivos: Calcular totales ponderados con SUMPRODUCT | Clasificar por tramos con XLOOKUP aproximado o VLOOKUP TRUE | Buscar con dos criterios usando una clave auxiliar | Leer una tabla de doble entrada con INDEX y dos MATCH | Construir y auditar una hoja de indicadores
prerrequisitos: excel-graficos
autoevaluacion: ¿Sabes calcular el stock valorizado en una sola fórmula? | ¿Sabes reemplazar un IF de cinco niveles por una tabla de tramos? | ¿Sabes buscar por cliente y fecha a la vez? | ¿Sabes revisar una hoja de indicadores fórmula por fórmula?
---

:::analogia En palabras simples
Hasta ahora cada fórmula respondía una pregunta simple. Las fórmulas avanzadas combinan piezas: multiplicar dos columnas y sumarlas, buscar en una tabla de tramos, unir dos condiciones en una clave. No son más difíciles: son piezas conocidas armadas con intención.
:::

## Paso 1 — Una hoja de indicadores (KPIs)

1. Carga **productos** (Data → Get Data → productos): **E** precio, **F** costo, **G** stock.
2. Crea una hoja `KPIs` y arma:

| | A | B |
|---|---|---|
| 1 | Indicador | Valor |
| 2 | Pedidos | `=COUNTA(pedidos!A:A)-1` |
| 3 | Entregados | `=COUNTIF(pedidos!E:E,"entregado")` |
| 4 | % entregados | `=B3/B2` (formato Percentage) |
| 5 | Mayor id entregado | `=MAXIFS(pedidos!A:A,pedidos!E:E,"entregado")` |
| 6 | Stock valorizado | `=SUMPRODUCT(productos!E2:E301,productos!G2:G301)` |

## Paso 2 — SUMPRODUCT: multiplicar y sumar en un paso

¿Cuánto vale todo el stock a precio de venta? Habría que multiplicar precio × stock de cada producto y sumar. `SUMPRODUCT` lo hace sin columna auxiliar:

```captura
archivo: excel/e19-sumproduct.webp
texto: SUMPRODUCT (1) multiplica precio por stock fila a fila y suma: el stock valorizado (2)
```

```text
=SUMPRODUCT(rango1, rango2)   →   rango1[1]×rango2[1] + rango1[2]×rango2[2] + …
```

Los rangos tienen que tener **el mismo tamaño** (E2:E301 y G2:G301). Con rangos distintos, da `#VALUE!`.

Otros usos:

- Margen total del stock: `=SUMPRODUCT(productos!E2:E301-productos!F2:F301,productos!G2:G301)` → (precio − costo) × stock de cada producto, sumado: **11,053,184.41**.
- Contar con una condición escrita como cuenta: `=SUMPRODUCT((pedidos!E2:E12001="cancelado")*1)` → 967. La comparación da TRUE/FALSE por fila y `*1` lo convierte en 1/0.
- Promedio ponderado: `=SUMPRODUCT(precios,cantidades)/SUM(cantidades)`.

:::tip El promedio ponderado
Es la solución correcta a la trampa del proyecto 2 (el promedio de promedios): cada valor pesa según su cantidad. Cuando promedies tasas o precios, piensa si cada fila debería pesar lo mismo.
:::

## Paso 3 — Revisa la hoja entera de un vistazo

**Formulas → Show Formulas** muestra todas las fórmulas de la hoja: ideal para revisar una hoja de indicadores antes de entregarla.

```captura
archivo: excel/e20-kpis-formulas.webp
texto: Show Formulas (1): la hoja de indicadores con todas sus fórmulas a la vista
```

Revisa cada una preguntándote: ¿apunta a la hoja correcta? ¿al rango completo? ¿el criterio está bien escrito?

## Paso 4 — Clasificar por tramos sin IF anidados

Clasificar pagos en `bajo` (menos de 500), `medio` (500 a 999) y `alto` (1000 o más) con IF anidados funciona, pero cuando los tramos cambian hay que editar cada fórmula. Mejor: una **tabla de tramos**.

1. En una hoja `Tramos`, escribe:

| | A | B |
|---|---|---|
| 1 | desde | tramo |
| 2 | 0 | bajo |
| 3 | 500 | medio |
| 4 | 1000 | alto |

2. Para clasificar un monto (por ejemplo, el de **pagos!D2**):

```text
=XLOOKUP(pagos!D2,Tramos!A2:A4,Tramos!B2:B4,"",-1)
```

El `-1` del final es el **modo de coincidencia**: "si no está exacto, devolvé el siguiente **menor**". 750 no está, el menor más cercano es 500 → `medio`.

La versión clásica, que verás en muchos archivos: `=VLOOKUP(pagos!D2,Tramos!A2:B4,2,TRUE)`. Con `TRUE`, VLOOKUP busca aproximado y **exige** la primera columna ordenada de menor a mayor.

| Modo de XLOOKUP | Si no encuentra el valor exacto… |
|---|---|
| 0 (o vacío) | devuelve #N/A (o el 4.º argumento) |
| -1 | devuelve el siguiente menor |
| 1 | devuelve el siguiente mayor |
| 2 | permite comodines (`*`, `?`) |

## Paso 5 — Buscar con dos criterios: una clave auxiliar

Pregunta: ¿qué número de pedido hizo el cliente **528** el **2022-01-01**? Ninguna columna sola identifica el pedido: hace falta cliente **y** fecha.

1. En **pedidos**, en una columna libre (por ejemplo **P**), arma la clave: **P1** `clave`, **P2** `=B2&"|"&D2`, copiada hacia abajo.
2. Busca la clave combinada:

```text
=XLOOKUP("528|2022-01-01",pedidos!P:P,pedidos!A:A,"no hay")
```

El `|` separa las partes para que `12|3` no se confunda con `1|23`. Es la misma idea que una **clave compuesta** en una base de datos.

:::nota En Excel 365, sin columna auxiliar
Con arrays dinámicos se puede escribir `=XLOOKUP(1,(pedidos!B:B=528)*(pedidos!D:D=DATE(2022,1,1)),pedidos!A:A)`: cada comparación da una columna de TRUE/FALSE, al multiplicarlas queda 1 solo donde se cumplen las dos, y XLOOKUP busca ese 1. Funciona en Excel 365, en la web y en esta réplica. En Excel 2019 o anterior no: ahí la clave auxiliar es la única opción, y además es más fácil de revisar.
:::

## Paso 6 — Una celda de una tabla de doble entrada: INDEX + MATCH + MATCH

En la hoja **PivotTable** (canal × estado) quieres leer "app / cancelado" con una fórmula que no dependa de la posición:

```text
=INDEX(PivotTable!A1:G7, MATCH("app",PivotTable!A1:A7,0), MATCH("cancelado",PivotTable!A1:G1,0))
```

Un MATCH encuentra la **fila**, el otro la **columna**, e INDEX devuelve el cruce. Si cambia el orden de las filas o columnas, sigue funcionando. (Ajusta los rangos a donde quedó tu tabla: mira en qué fila están los encabezados.)

## Paso 7 — Excel 365: las funciones que vas a ver en el trabajo

| Función | Hace | Ejemplo |
|---|---|---|
| `FILTER` | Devuelve las filas que cumplen una condición | `=FILTER(A2:G100,E2:E100="cancelado")` |
| `SORT` / `SORTBY` | Ordena un rango con una fórmula | `=SORT(A2:B20,2,-1)` |
| `UNIQUE` | Valores distintos | `=UNIQUE(F2:F12001)` |
| `LET` | Pone nombre a partes de una fórmula larga | `=LET(t,SUM(B2:B8),n,COUNT(B2:B8),t/n)` |
| `XLOOKUP` | La búsqueda moderna | ya la usas |

Estas fórmulas "derraman" el resultado en varias celdas. Funcionan en Excel 365 y en Excel para la web; en versiones viejas no existen. En esta réplica funcionan XLOOKUP, UNIQUE (muestra la primera celda; `COUNTA(UNIQUE(...))` cuenta los distintos) y las operaciones entre rangos dentro de SUMPRODUCT, SUM o XLOOKUP; FILTER, SORT y LET no.

## Paso 8 — Auditar fórmulas largas

| Técnica | Cómo |
|---|---|
| Ver todas las fórmulas | Formulas → Show Formulas (Ctrl + `) |
| Leer por partes | Copia una parte interna (por ejemplo el `MATCH`) a otra celda y mira qué devuelve |
| Excel real: evaluar paso a paso | Formulas → **Evaluate Formula** |
| Excel real: ver de dónde sale un número | Formulas → **Trace Precedents** dibuja flechas a las celdas que usa |
| Referencia circular | Si una fórmula se usa a sí misma, Excel avisa: revisa la celda que indica |

## ✅ Lo que lograste

- Calculaste totales ponderados con SUMPRODUCT.
- Clasificaste por tramos con una tabla de referencia.
- Buscaste con dos criterios y en una tabla de doble entrada.
- Armaste y auditaste una hoja de indicadores.

:::ejercicio quiz
¿Qué calcula `=SUMPRODUCT(B2:B4,C2:C4)` si B = 2, 3, 4 y C = 10, 10, 5?
- [ ] 34
- [x] 70
- [ ] 9
- [ ] 25
:::

:::ejercicio quiz
Tramos: 0 → bajo, 500 → medio, 1000 → alto. ¿Qué devuelve `=XLOOKUP(999,A2:A4,B2:B4,"",-1)`?
- [ ] alto
- [x] medio
- [ ] bajo
- [ ] Un error
:::

:::ejercicio quiz
¿Por qué conviene una tabla de tramos en lugar de IF anidados?
- [ ] Porque IF no funciona con números
- [x] Porque si cambian los tramos se edita la tabla, no cada fórmula
- [ ] Porque XLOOKUP es más corta de escribir
- [ ] Porque los IF anidados dan error con más de dos niveles
:::

:::ejercicio quiz
Para buscar por cliente y fecha a la vez armas la clave `=B2&"|"&D2`. ¿Para qué sirve el `|`?
- [ ] Para que Excel la reconozca como fecha
- [x] Para que combinaciones distintas no generen la misma clave (12|3 contra 1|23)
- [ ] Es obligatorio en XLOOKUP
- [ ] Para que la clave sea un número
:::
