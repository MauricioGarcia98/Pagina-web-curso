---
titulo: Excel en el flujo de datos - CSV, límites, y cuándo pasar la lógica a SQL, Python o Power BI
nivel: 6 · Avanzado completo
duracion: 45
resumen: En un equipo de datos, Excel es una pieza de un flujo más grande - recibe extractos, alimenta reportes y a veces es la fuente de un pipeline. Cómo importar y exportar CSV sin romper datos (separadores, codificación, ceros a la izquierda, fechas), cuáles son los límites reales de Excel, y la tabla de equivalencias para llevar lo que hiciste en Excel a SQL, pandas y Power BI.
objetivos: Importar y exportar CSV sabiendo qué se pierde | Evitar los problemas clásicos de CSV (separador, codificación, ceros, fechas) | Conocer los límites de Excel y cuándo dejar de usarlo | Traducir fórmulas y tablas dinámicas a SQL, pandas y Power BI | Ubicar a Excel en una arquitectura de datos
prerrequisitos: excel-libros-profesionales
autoevaluacion: ¿Sabes qué guarda un CSV y qué no? | ¿Sabes por qué un código postal 01234 pierde el cero? | ¿Sabes cuántas filas entran en una hoja? | ¿Sabes escribir un COUNTIFS como GROUP BY?
---

:::analogia En palabras simples
Excel es la navaja suiza del trabajo con datos: sirve para casi todo en pequeño. Pero no construirías una casa con una navaja. En un equipo de datos, Excel convive con bases de datos, pipelines y Power BI: recibe pedazos, los analiza y los devuelve. Saber cuándo pasar la tarea a otra herramienta es parte de dominar Excel.
:::

## Paso 1 — CSV: el idioma común

Un CSV es un archivo de texto: una línea por fila, valores separados por coma (o punto y coma). Lo leen Excel, SQL, Python, Power BI y cualquier sistema.

| Guarda | No guarda |
|---|---|
| Los valores que se ven | Fórmulas (solo su resultado) |
| Una sola hoja | Formatos, colores, anchos |
| | Gráficos, tablas dinámicas, varias hojas |

En la réplica:

- **File → Export CSV** descarga la hoja activa.
- **File → Open CSV** (o **Data → From Text/CSV**) abre un CSV de tu computadora en una hoja nueva.

```captura
archivo: excel/06-exportar.webp
texto: Export CSV (1) descarga la hoja activa; Office Theme (2) cambia el tema
```

Prueba el viaje completo: exporta la hoja `Semana` del proyecto 2 y vuelve a abrirla con **Open CSV**. Los números están, pero las fórmulas se convirtieron en valores y se perdió el formato.

## Paso 2 — Los cuatro problemas clásicos del CSV

| Problema | Ejemplo | Solución |
|---|---|---|
| **Separador** | En países que usan coma decimal, Excel guarda con `;` y otro sistema espera `,` | Acordar el separador; en Excel real, **Data → From Text/CSV** deja elegirlo al importar |
| **Codificación** | `Bogotá` aparece como `BogotÃ¡` | Guardar y abrir como **UTF-8** (en Excel real: *CSV UTF-8* al guardar) |
| **Ceros a la izquierda** | El código `01234` se convierte en `1234` | Importar esa columna como **texto** (Power Query o el asistente de importación) |
| **Fechas** | `03/04/2024` se interpreta como 3 de abril o 4 de marzo según el idioma | Fechas en ISO (`2024-04-03`) en todos los archivos |

:::cuidado Excel cambia datos al abrir un CSV con doble clic
Abrir un CSV con doble clic deja que Excel "adivine" los tipos: quita ceros, convierte códigos en fechas (`MAR1` → 1-mar) y números largos en notación científica (un número de tarjeta o documento pierde dígitos). Para datos que importan, importa con **Data → From Text/CSV** y revisa los tipos antes de cargar.
:::

## Paso 3 — Los límites de Excel

| Límite | Valor | Qué significa |
|---|---|---|
| Filas por hoja | 1,048,576 | Un año de transacciones de una empresa mediana no entra |
| Columnas por hoja | 16,384 (hasta XFD) | |
| Precisión numérica | 15 dígitos | Ids de 16+ dígitos pierden los últimos (guárdalos como texto) |
| Concurrencia | Coautoría en la nube, pero sin control fino | No es una base de datos multiusuario |
| Auditoría | Difícil saber quién cambió qué y por qué | No sirve como "fuente de verdad" |

Excel avisa cuando un archivo supera el límite de filas, pero **carga lo que entra y descarta el resto**: si no lees el aviso, analizas datos incompletos.

## Paso 4 — Cuándo seguir en Excel y cuándo pasar a otra herramienta

| Situación | Herramienta |
|---|---|
| Análisis puntual, miles de filas, una persona | **Excel** |
| Lo mismo todos los meses con datos nuevos | Excel con **Power Query**, o un **pipeline** |
| Millones de filas, varias tablas grandes | **SQL** (una base de datos o un lakehouse) |
| Limpieza compleja, automatización, modelos | **Python** (pandas, PySpark) |
| Tablero que muchos consultan y filtran | **Power BI** |
| Fuente de verdad compartida | Una **base de datos** o tabla del lakehouse, nunca un Excel en un mail |

## Paso 5 — Lo que hiciste en Excel, en SQL, pandas y Power BI

| En Excel | En SQL | En pandas | En Power BI (DAX) |
|---|---|---|---|
| `=COUNTIFS(E:E,"entregado")` | `SELECT COUNT(*) FROM pedidos WHERE estado='entregado'` | `(df.estado=='entregado').sum()` | `CALCULATE(COUNTROWS(pedidos), pedidos[estado]="entregado")` |
| `=SUMIFS(D:D,E:E,"aprobado")` | `SELECT SUM(monto) FROM pagos WHERE estado='aprobado'` | `df.loc[df.estado=='aprobado','monto'].sum()` | `CALCULATE(SUM(pagos[monto]), pagos[estado]="aprobado")` |
| Tabla dinámica canal × estado | `GROUP BY canal, estado` | `pd.pivot_table(df, index='canal', columns='estado', aggfunc='size')` | Matriz con canal en filas y estado en columnas |
| `=XLOOKUP(B2,clientes!A:A,clientes!G:G)` | `LEFT JOIN clientes c ON c.cliente_id=p.cliente_id` | `pedidos.merge(clientes, on='cliente_id', how='left')` | Relación entre tablas en el modelo |
| Remove Duplicates por cliente_id (el más nuevo) | `ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha_carga DESC) = 1` | `df.sort_values('fecha_carga').drop_duplicates('cliente_id', keep='last')` | Power Query: ordenar y quitar duplicados |
| `=TEXT(D2,"yyyy-mm")` | `strftime('%Y-%m', fecha)` / `DATE_TRUNC('month', fecha)` | `df.fecha.dt.to_period('M')` | Columna de fecha con jerarquía año/mes |
| `=LOWER(TRIM(E2))` | `LOWER(TRIM(email))` | `df.email.str.strip().str.lower()` | Power Query: Recortar + Minúsculas |

Si entendiste la lógica en Excel, la entiendes en todas: cambia la sintaxis, no la idea. Puedes practicar cada fila de esta tabla en el curso: [SQL](#/m/sql), [JupyterLab de práctica](#/jupyter) y [Power BI de práctica](#/powerbi).

## Paso 6 — Excel dentro de una arquitectura de datos

En una empresa con equipo de datos, Excel suele aparecer en estos lugares:

1. **Como fuente**: un área envía un Excel mensual (presupuesto, metas). Un pipeline (Data Factory, Databricks, Fabric) lo lee y lo carga en una tabla. Por eso importan las convenciones de la lección 21: un Excel prolijo se carga solo; uno con celdas combinadas y totales mezclados rompe el pipeline.
2. **Como destino**: un extracto que alguien pidió para analizar por su cuenta. Se genera desde SQL o Power BI ("Export to Excel" / "Analyze in Excel").
3. **Como prototipo**: se valida una lógica en Excel con el área de negocio y después se implementa en SQL o en un modelo de Power BI.

:::tip El Excel que se carga en un pipeline
Una hoja, una tabla, encabezados en la fila 1, sin filas de total, sin celdas combinadas, sin colores con significado (el pipeline no ve colores), fechas reales y un nombre de archivo con fecha. Si vas a pedirle a alguien un Excel que se cargará automáticamente, mándale una plantilla con esas reglas.
:::

## ✅ Lo que lograste

- Sabes importar y exportar CSV sin romper datos.
- Conoces los límites de Excel y cuándo usar otra herramienta.
- Puedes traducir tu trabajo de Excel a SQL, pandas y Power BI.

:::ejercicio quiz
Exportas a CSV una hoja con fórmulas y gráficos. ¿Qué queda en el archivo?
- [ ] Todo, igual que en Excel
- [x] Solo los valores de la hoja activa
- [ ] Las fórmulas, sin los valores
- [ ] Los gráficos como imágenes
:::

:::ejercicio quiz
Abres un CSV con doble clic y los códigos de producto `00123` aparecen como `123`. ¿Qué haces?
- [ ] Les agrego los ceros a mano
- [x] Importo con Data → From Text/CSV y defino esa columna como texto
- [ ] Les doy formato de moneda
- [ ] Nada, es lo mismo
:::

:::ejercicio quiz
Tienes 5 millones de transacciones para analizar. ¿Qué haces?
- [ ] Las abro en Excel en cinco hojas
- [x] Las analizo en SQL o Python y llevo a Excel solo el resumen
- [ ] Abro las primeras 1.048.576 filas
- [ ] Las divido en varios archivos de Excel
:::

:::ejercicio quiz
¿Cuál es el equivalente en SQL de una tabla dinámica con Rows = canal, Columns = estado y Count?
- [ ] `SELECT DISTINCT canal, estado FROM pedidos`
- [x] `SELECT canal, estado, COUNT(*) FROM pedidos GROUP BY canal, estado`
- [ ] `SELECT * FROM pedidos ORDER BY canal, estado`
- [ ] `SELECT COUNT(*) FROM pedidos`
:::
