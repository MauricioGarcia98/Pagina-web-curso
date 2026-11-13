---
titulo: De la práctica al Excel real - Tablas, Power Query, formato condicional, validación y Excel en español
nivel: 6 · Avanzado completo
duracion: 60
resumen: Todo lo que aprendiste funciona igual en el Excel de las empresas. Esta lección cubre lo que la réplica no tiene y vas a usar desde el primer día - Tablas con Ctrl+T, inmovilizar paneles, formato condicional, validación de datos, pegado especial, relleno rápido, Power Query, tablas dinámicas con segmentaciones - más la traducción de funciones y menús para Excel en español, las diferencias en Mac y cómo practicar gratis con Excel para la web.
objetivos: Crear y usar Tablas con referencias estructuradas | Aplicar formato condicional y validación de datos | Limpiar y combinar datos con Power Query y actualizarlos | Usar segmentaciones, agrupar fechas y mostrar porcentajes en tablas dinámicas | Trabajar en Excel en español y en Mac
prerrequisitos: excel-excel-en-el-flujo-de-datos
autoevaluacion: ¿Sabes convertir un rango en Tabla y para qué sirve? | ¿Sabes resaltar los valores que superan una meta? | ¿Sabes armar una consulta de Power Query que se actualiza sola? | ¿Sabes cómo se llama BUSCARX en inglés?
---

:::analogia En palabras simples
Aprendiste a manejar en un simulador. Los pedales, el volante y las reglas son los mismos en el auto real; el auto real además tiene aire acondicionado, GPS y sensores. Esta lección es el recorrido por esos extras, para que el primer día con Excel real no te sorprenda nada.
:::

## Paso 1 — Dónde practicar gratis

| Opción | Costo | Qué tiene |
|---|---|---|
| **Excel para la web** (office.com, con una cuenta personal de Microsoft) | Gratis | Casi todo lo del curso: fórmulas, Tablas, tablas dinámicas, gráficos, formato condicional, validación. Power Query limitado |
| Excel de escritorio (Microsoft 365) | Suscripción; muchas empresas y universidades lo dan | Todo, incluido Power Query completo y Power Pivot |
| Excel en el celular | Gratis para uso básico | Para revisar, no para construir |
| LibreOffice Calc / Google Sheets | Gratis | Fórmulas parecidas; no tienen Power Query ni las mismas tablas dinámicas |

Abre Excel para la web, crea un libro en blanco y ten esta lección al lado.

:::cuidado Tus datos y tu cuenta
Practica con datos ficticios (exporta a CSV las tablas de este curso y ábrelas allá). No subas a tu cuenta personal archivos de tu trabajo con datos de clientes.
:::

## Paso 2 — Tablas (Ctrl + T): el cambio más importante

En la réplica trabajaste con rangos. En Excel real, lo primero que se hace con una tabla de datos es convertirla en **Tabla**:

1. Haz clic dentro de los datos.
2. **Insert → Table** (o **Ctrl + T**). Confirma que **My table has headers** está marcado → **OK**.
3. En la pestaña **Table Design**, cambia el nombre (casilla **Table Name**) a `pedidos`.

Qué ganas:

| Ventaja | Ejemplo |
|---|---|
| El rango crece solo al agregar filas | Las fórmulas, gráficos y tablas dinámicas toman las filas nuevas |
| Fórmulas con nombres de columna | `=SUMIFS(pagos[monto],pagos[estado],"aprobado")` |
| Una fórmula escrita en una fila se copia a toda la columna | Columna calculada automática |
| Filtros y formato con bandas incluidos | |

Las **referencias estructuradas** (`pagos[monto]`) se leen como frases y no se rompen cuando insertas columnas. Es el reemplazo profesional de `D:D`.

## Paso 3 — Ver encabezados siempre: Freeze Panes

**View → Freeze Panes → Freeze Top Row**. Al bajar por 12.000 filas, los encabezados quedan visibles. Para fijar filas y columnas a la vez: selecciona la celda debajo y a la derecha de lo que quieres fijar (por ejemplo **B2**) → **Freeze Panes**.

## Paso 4 — Formato condicional

Resaltar automáticamente lo que importa:

1. Selecciona la columna **% de la meta** del proyecto 2.
2. **Home → Conditional Formatting → Highlight Cells Rules → Less Than…** → `1` → elige el formato rojo → **OK**. Los días bajo la meta quedan en rojo.

Otras reglas útiles:

| Regla | Dónde | Para qué |
|---|---|---|
| Data Bars | Conditional Formatting → Data Bars | Una barra dentro de cada celda: ranking visual |
| Color Scales | Conditional Formatting → Color Scales | Mapa de calor (por ejemplo, pedidos por mes y canal) |
| Duplicate Values | Highlight Cells Rules → Duplicate Values | Ver ids repetidos antes de quitar duplicados |
| Con fórmula | New Rule → Use a formula… → `=$E2="cancelado"` | Pintar la fila entera según una condición |

## Paso 5 — Validación de datos: que nadie escriba cualquier cosa

En una plantilla que otros completan:

1. Selecciona la columna **canal**.
2. **Data → Data Validation** → **Allow: List** → **Source:** `web,app,tienda,telefono` → **OK**.
3. Ahora cada celda tiene un desplegable y rechaza valores fuera de la lista.

También: números entre un mínimo y un máximo, fechas dentro de un período, largo máximo de texto. Es la forma de evitar los datos sucios **en el origen**.

## Paso 6 — Pegado especial y relleno rápido

| Herramienta | Cómo | Para qué |
|---|---|---|
| **Paste Values** | Home → Paste ▾ → Values (o Ctrl + Alt + V → Values) | Pegar resultados sin fórmulas (lección 15, paso 8) |
| **Paste Special → Transpose** | Ctrl + Alt + V → Transpose | Pasar filas a columnas |
| **Flash Fill** | Data → Flash Fill (Ctrl + E) | Escribes el resultado en 1–2 celdas (por ejemplo el dominio de un email) y Excel deduce el patrón para el resto |

:::cuidado Flash Fill no es una fórmula
El resultado de Flash Fill son valores fijos: si cambian los datos, no se actualiza. Para algo que se repite, usa fórmulas o Power Query.
:::

## Paso 7 — Power Query: la limpieza que se repite sola

Power Query graba cada paso de limpieza y lo repite cuando llegan datos nuevos. Es lo que convierte el proyecto 4 en un proceso de un clic.

1. **Data → Get Data → From File → From Text/CSV** → elige `clientes_crudo.csv` (expórtalo desde la réplica) → **Transform Data**.
2. Se abre el editor de Power Query. Haz los pasos con clics:
   - Columna email → clic derecho → **Transform → Trim**, y otra vez **Transform → lowercase**.
   - Columna fecha_carga → **Sort Descending**.
   - Columna cliente_id → clic derecho → **Remove Duplicates**.
3. A la derecha, en **Applied Steps**, ves cada paso grabado. Puedes borrar o reordenar pasos.
4. **Home → Close & Load**: el resultado se carga como una Tabla.
5. El mes que viene: reemplaza el CSV por el nuevo y presiona **Data → Refresh All**. Todos los pasos se repiten.

Con **Merge Queries** unes dos consultas por una clave (el XLOOKUP de la lección 13, pero para toda la tabla) y con **Append Queries** apilas archivos de varios meses. Es el mismo motor que usa Power BI: lo que aprendas aquí sirve allá.

## Paso 8 — Tablas dinámicas en Excel real

Al insertar una tabla dinámica aparece el panel **PivotTable Fields**: arrastras campos a **Filters**, **Columns**, **Rows** y **Values**.

| Quiero | Cómo |
|---|---|
| Agrupar fechas por mes o año | Clic derecho en una fecha de la tabla dinámica → **Group** → Months, Years |
| Ver porcentajes | Clic derecho en un valor → **Show Values As → % of Grand Total** (o % of Row Total) |
| Filtrar con botones | **PivotTable Analyze → Insert Slicer** → elige canal |
| Actualizar con datos nuevos | Clic derecho → **Refresh** (o Data → Refresh All) |
| Cambiar Count por Sum | Clic en el campo de Values → **Value Field Settings** |

## Paso 9 — Excel en español: funciones y separador

Si tu Excel está en español, las funciones cambian de nombre y los argumentos se separan con **punto y coma**. La lógica es idéntica.

| Inglés | Español | Inglés | Español |
|---|---|---|---|
| SUM | SUMA | XLOOKUP | BUSCARX |
| AVERAGE | PROMEDIO | VLOOKUP | BUSCARV |
| COUNT / COUNTA | CONTAR / CONTARA | INDEX / MATCH | INDICE / COINCIDIR |
| COUNTIF / COUNTIFS | CONTAR.SI / CONTAR.SI.CONJUNTO | IFERROR / IFNA | SI.ERROR / SI.ND |
| SUMIF / SUMIFS | SUMAR.SI / SUMAR.SI.CONJUNTO | TEXT | TEXTO |
| AVERAGEIF | PROMEDIO.SI | YEAR / MONTH / DAY | AÑO / MES / DIA |
| MAXIFS / MINIFS | MAX.SI.CONJUNTO / MIN.SI.CONJUNTO | TODAY / DATE | HOY / FECHA |
| IF / IFS | SI / SI.CONJUNTO | EOMONTH / DATEDIF | FIN.MES / SIFECHA |
| AND / OR / NOT | Y / O / NO | LEFT / RIGHT / MID | IZQUIERDA / DERECHA / EXTRAE |
| ROUND / ROUNDUP | REDONDEAR / REDONDEAR.MAS | LEN / FIND | LARGO / ENCONTRAR |
| MEDIAN | MEDIANA | TRIM / LOWER / PROPER | ESPACIOS / MINUSC / NOMPROPIO |
| SUMPRODUCT | SUMAPRODUCTO | SUBSTITUTE / TEXTJOIN | SUSTITUIR / UNIRCADENAS |
| UNIQUE / FILTER / SORT | UNICOS / FILTRAR / ORDENAR | VALUE / ISNUMBER | VALOR / ESNUMERO |

Ejemplo: `=SUMIFS(D:D,E:E,"aprobado")` en español es `=SUMAR.SI.CONJUNTO(D:D;E:E;"aprobado")`.

Menús: Home = **Inicio**, Insert = **Insertar**, Formulas = **Fórmulas**, Data = **Datos**, View = **Vista**, PivotTable = **Tabla dinámica**, Remove Duplicates = **Quitar duplicados**, Filter = **Filtro**.

:::tip Si un archivo viene en otro idioma
Las fórmulas se traducen solas: un libro hecho en inglés se abre en un Excel en español con las funciones en español. Lo que no se traduce son los textos dentro de comillas.
:::

## Paso 10 — Si usas Mac

| Windows | Mac |
|---|---|
| Ctrl + C / V / Z | ⌘ + C / V / Z |
| F4 (alternar $) | ⌘ + T |
| F2 (editar celda) | Ctrl + U (o F2 si las teclas de función están activas) |
| Ctrl + flecha | ⌘ + flecha |
| Alt + = (AutoSum) | ⌘ + Shift + T |

## Paso 11 — Copilot y la IA en Excel

Algunas cuentas empresariales tienen **Copilot** en Excel: le pides en lenguaje natural "agregá una columna con el mes" o "resumí ventas por canal" y propone fórmulas o tablas dinámicas. Úsalo como un compañero rápido, no como un auditor: **verifica cada fórmula que proponga** con lo que aprendiste (controles, números de control, Show Formulas). Si no sabes leer la fórmula que te propone, no puedes saber si está bien.

## Tu checklist de transición

Rehaz en Excel real, en este orden:

- [ ] Proyecto 1 y 2: igual que en la práctica, más **Freeze Panes** y **formato condicional** en % de la meta.
- [ ] Proyecto 3: convierte `pedidos` en **Tabla** y reescribe los COUNTIFS con referencias estructuradas.
- [ ] Proyecto 4: hazlo entero en **Power Query** y prueba **Refresh All**.
- [ ] Proyecto 5: tablas dinámicas con **fechas agrupadas por mes**, **% of Grand Total** y un **Slicer** de canal.

## ✅ Lo que lograste

- Conoces las herramientas de Excel real que la práctica no tiene.
- Sabes trabajar en Excel en español y en Mac.
- Tienes un plan para rehacer tus proyectos en Excel real.

:::ejercicio quiz
¿Cuál es la principal ventaja de convertir un rango en Tabla (Ctrl + T)?
- [ ] Que se ve con colores
- [x] Que crece sola con las filas nuevas y permite fórmulas con nombres de columna
- [ ] Que ocupa menos espacio
- [ ] Que no se puede editar
:::

:::ejercicio quiz
Cada mes llega un CSV nuevo que hay que limpiar igual. ¿Qué herramienta usas?
- [ ] Flash Fill
- [ ] Copiar y pegar las fórmulas cada mes
- [x] Power Query: los pasos se graban y se repiten con Refresh
- [ ] Remove Duplicates a mano
:::

:::ejercicio quiz
¿Cómo se escribe `=COUNTIFS(E:E,"cancelado",F:F,"web")` en un Excel en español?
- [ ] `=CONTAR.SI(E:E,"cancelado",F:F,"web")`
- [x] `=CONTAR.SI.CONJUNTO(E:E;"cancelado";F:F;"web")`
- [ ] `=CONTARSI(E:E;"cancelado";F:F;"web")`
- [ ] `=COUNTIFS(E:E;"cancelado";F:F;"web")`
:::

:::ejercicio quiz
Copilot te propone una fórmula para un informe. ¿Qué haces?
- [ ] La uso: la IA no se equivoca con fórmulas
- [x] La leo, la verifico con un número de control y recién después la uso
- [ ] La copio a todas las hojas
- [ ] La borro: nunca hay que usar IA
:::
