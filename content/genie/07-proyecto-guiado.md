---
titulo: "Proyecto guiado: el asistente de ventas de Tienda Andina con Genie"
nivel: Avanzado
duracion: 150
resumen: Un proyecto completo, paso a paso, en tu cuenta gratuita de Databricks Free Edition - generar y subir los datos, crear las tablas con read_files, una vista documentada y una vista de métricas, crear el Genie Agent, enseñarle el negocio (sinónimos, coincidencia de valores, SQL expressions, ejemplos con parámetros e instrucciones), medirlo con benchmarks, preguntarle desde un notebook con el SDK y documentarlo para tu portafolio. Cada paso tiene lugar para tu captura.
objetivos: Construir un Genie Agent de punta a punta sobre datos propios | Aplicar el orden recomendado de contexto (datos, knowledge store, ejemplos, texto) | Medir la mejora con benchmarks antes y después | Consultar el agente por código | Presentar el proyecto en un portafolio
prerrequisitos: genie-genie-one-tableros-y-api | laboratorios-guia-databricks-free-edition
autoevaluacion: ¿Puedes explicar cada decisión de contexto que tomaste en tu agente? | ¿Puedes mostrar la exactitud de tus benchmarks antes y después de afinar? | ¿Puedes consultar tu agente desde un notebook?
---

:::escenario
Eres el data engineer de Tienda Andina. La gerencia comercial quiere hacer sus propias preguntas de ventas sin esperar al equipo de datos, y confiar en que los números son los mismos que los del tablero. Vas a construir el asistente completo, medir su calidad y dejarlo documentado como un proyecto de portafolio. Todo en Databricks Free Edition, sin costo.
:::

:::nota Antes de empezar
- Necesitas una cuenta de **Databricks Free Edition** (sigue la guía del módulo de Laboratorios si todavía no la tienes).
- En los bloques SQL, reemplaza `<catalogo>` por el nombre del catálogo de tu workspace (lo ves en **Catalog**; suele coincidir con el nombre del workspace).
- Cada paso tiene un recuadro de **captura pendiente**. Saca la captura y súbela con el nombre indicado a `assets/img/guias/` (tapando tu correo). Al final tendrás el proyecto ilustrado para tu portafolio.
- Los nombres de botones son los de la documentación oficial de octubre de 2026.
:::

## El plan

| Paso | Qué haces | Lección del módulo |
|---|---|---|
| 1-2 | Generar los datos, subirlos y crear las tablas | Guía de Free Edition |
| 3-4 | Vista documentada y vista de métricas | 2. Preparar los datos |
| 5-7 | Crear el agente y enseñarle el negocio | 3. Crear y afinar un agente |
| 8-9 | Benchmarks antes y después | 4. Evaluar y monitorear |
| 10 | Preguntarle desde un notebook | 6. Genie One, tableros y API |
| 11 | Documentarlo para el portafolio | — |

## Paso 1: generar y subir los datos

1. En el **Generador de datos** del curso elige **Tienda online**, 1.000 clientes, semilla 42, problemas **limpio** (para este proyecto queremos datos sin ruido; la limpieza ya la practicaste) y formato **CSV**. Descarga el ZIP y descomprímelo.
2. En Databricks: **+ New** → **Add or upload data** → **Upload files to a volume**. Crea el volumen `crudo` en el esquema `default` de tu catálogo y sube `clientes.csv`, `productos.csv`, `pedidos.csv` y `detalle_pedidos.csv`.

```captura
archivo: genie-p01-volumen.png
texto: Los cuatro archivos CSV en el volumen crudo
```

## Paso 2: crear las tablas

Abre el **SQL Editor** y ejecuta (la función `read_files` lee archivos de un volumen e infiere los tipos de las columnas):

```sql norun
USE CATALOG <catalogo>;
USE SCHEMA default;

CREATE OR REPLACE TABLE clientes AS
SELECT * FROM read_files('/Volumes/<catalogo>/default/crudo/clientes.csv', format => 'csv', header => true);

CREATE OR REPLACE TABLE productos AS
SELECT * FROM read_files('/Volumes/<catalogo>/default/crudo/productos.csv', format => 'csv', header => true);

CREATE OR REPLACE TABLE pedidos AS
SELECT * FROM read_files('/Volumes/<catalogo>/default/crudo/pedidos.csv', format => 'csv', header => true);

CREATE OR REPLACE TABLE detalle_pedidos AS
SELECT * FROM read_files('/Volumes/<catalogo>/default/crudo/detalle_pedidos.csv', format => 'csv', header => true);

SELECT COUNT(*) AS lineas FROM detalle_pedidos;
```

```captura
archivo: genie-p02-tablas.png
texto: El SQL Editor con las cuatro tablas creadas y el conteo de líneas
```

## Paso 3: la vista que verá Genie

Una sola vista, una fila por línea de pedido, con los joins hechos, sin cancelados y con nombres claros:

```sql norun
CREATE OR REPLACE VIEW ventas_lineas
COMMENT 'Una fila por línea de pedido (producto dentro de un pedido) de Tienda Andina. Excluye pedidos cancelados. Para "ventas" usar importe_neto. Para contar pedidos usar COUNT(DISTINCT pedido_id).'
AS
SELECT d.detalle_id,
       p.pedido_id,
       CAST(p.fecha_pedido AS DATE)            AS fecha,
       date_format(p.fecha_pedido, 'yyyy-MM')  AS mes,
       p.canal,
       p.estado,
       c.pais,
       c.segmento,
       pr.categoria,
       pr.nombre                               AS producto,
       d.cantidad,
       ROUND(d.cantidad * d.precio_unitario * (1 - d.descuento), 2) AS importe_neto
FROM detalle_pedidos d
JOIN pedidos p    ON p.pedido_id = d.pedido_id
JOIN clientes c   ON c.cliente_id = p.cliente_id
JOIN productos pr ON pr.producto_id = d.producto_id
WHERE p.estado <> 'cancelado';
```

Ahora las descripciones de las columnas que más importan:

```sql norun
ALTER VIEW ventas_lineas ALTER COLUMN importe_neto COMMENT
  'Importe de la línea en USD después del descuento. Es la medida de ventas del negocio.';
ALTER VIEW ventas_lineas ALTER COLUMN canal COMMENT
  'Canal de venta: web, app, tienda (el local físico) o telefono.';
ALTER VIEW ventas_lineas ALTER COLUMN segmento COMMENT
  'Tipo de cliente: Consumo (personas), Pyme o Corporativo.';
ALTER VIEW ventas_lineas ALTER COLUMN mes COMMENT
  'Mes del pedido en formato AAAA-MM, por ejemplo 2024-03.';
```

```captura
archivo: genie-p03-vista.png
texto: La vista ventas_lineas en Catalog Explorer con las descripciones de sus columnas
```

## Paso 4: la vista de métricas

Las tres métricas que más pregunta la gerencia, definidas una sola vez:

```sql norun
CREATE OR REPLACE VIEW metricas_ventas
WITH METRICS
LANGUAGE YAML
AS $$
version: 1.1
source: <catalogo>.default.ventas_lineas
comment: Métricas de ventas de Tienda Andina (sin pedidos cancelados).
fields:
  - name: mes
    expr: mes
    display_name: Mes
  - name: pais
    expr: pais
    display_name: País
  - name: canal
    expr: canal
    display_name: Canal
    synonyms: [canal de venta, medio]
  - name: categoria
    expr: categoria
    display_name: Categoría
measures:
  - name: ventas_netas
    expr: SUM(importe_neto)
    display_name: Ventas netas
    synonyms: [ventas, facturación, ingresos]
  - name: pedidos
    expr: COUNT(DISTINCT pedido_id)
    display_name: Pedidos
  - name: ticket_promedio
    expr: MEASURE(ventas_netas) / MEASURE(pedidos)
    display_name: Ticket promedio
    synonyms: [ticket medio, valor promedio del pedido]
$$;

SELECT canal, MEASURE(ventas_netas) AS ventas, MEASURE(ticket_promedio) AS ticket
FROM metricas_ventas
GROUP BY canal
ORDER BY ventas DESC;
```

```captura
archivo: genie-p04-metricas.png
texto: El resultado de consultar la vista de métricas por canal
```

## Paso 5: crear el agente

1. En la barra lateral: **Genie Agents** → **New**.
2. Fuentes: `ventas_lineas` y `metricas_ventas` → **Create**.
3. Genie Code propone descripciones y consultas: **lee cada una** y acepta solo las correctas.
4. **Configure → Settings**:
   - Título: `Ventas de Tienda Andina`.
   - Descripción: `Responde preguntas sobre ventas netas, pedidos y ticket promedio de 2022 a 2024, por mes, país, canal, categoría y segmento. No incluye pedidos cancelados, pagos ni stock.`
   - Preguntas comunes: "¿Cuánto vendimos en 2024?", "¿Qué canal vendió más el último trimestre?", "Ticket promedio por país en 2024".

```captura
archivo: genie-p05-crear-agente.png
texto: La configuración del agente con título, descripción y preguntas comunes
```

## Paso 6: la línea base (antes de afinar)

Antes de enseñarle nada, mide. Haz estas diez preguntas y anota en una tabla si la respuesta fue correcta (mirando **Show code**):

| # | Pregunta |
|---|---|
| 1 | ¿Cuánto vendimos en 2024? |
| 2 | ¿Cuánto facturó el local en marzo de 2024? |
| 3 | Ventas por canal en 2024 |
| 4 | ¿Cuál es el ticket promedio por país? |
| 5 | ¿Cuántos pedidos grandes hubo en 2024? |
| 6 | ¿Qué categoría vendió más a clientes corporativos? |
| 7 | Comparativo de ventas por canal: 2024 contra 2023 |
| 8 | ¿Cómo vamos este trimestre fiscal? |
| 9 | Top 5 productos por ventas en México |
| 10 | ¿Cuántos clientes pyme compraron en diciembre de 2024? |

Las preguntas 2, 5 y 8 están pensadas para fallar: "el local" no es un valor de los datos, "pedido grande" no está definido y el "trimestre fiscal" depende de una regla de la empresa.

```captura
archivo: genie-p06-linea-base.png
texto: Una respuesta incorrecta de la línea base con Show code abierto
```

## Paso 7: enseñarle el negocio

En el orden recomendado por la documentación:

**7.1 Sinónimos y coincidencia de valores** (Configure → Sources → `ventas_lineas`):
- Columna `canal`: sinónimos `local, local físico, sucursal` (para `tienda`); activa **Entity matching** en **Advanced**.
- Columna `pais`: activa **Entity matching**.
- Columna `segmento`: sinónimos `empresas grandes` (Corporativo), `particulares` (Consumo).

**7.2 SQL expressions** (Configure → Examples → Add):
- **Filter** "Clientes corporativos": `segmento = 'Corporativo'`. Sinónimos: `empresas grandes, corporativos`. Instrucciones: `Aplica cuando pregunten por empresas grandes o clientes corporativos.`
- **Field** "Trimestre fiscal": `CASE WHEN month(fecha) IN (2,3,4) THEN 'Q1' WHEN month(fecha) IN (5,6,7) THEN 'Q2' WHEN month(fecha) IN (8,9,10) THEN 'Q3' ELSE 'Q4' END`. Sinónimos: `trimestre`. Instrucciones: `El año fiscal empieza el 1 de febrero.`

**7.3 Una consulta de ejemplo para "pedidos grandes"**. Como la vista tiene una fila por línea, "pedido grande" necesita sumar por pedido antes de filtrar: es lógica de varios pasos, y para eso la documentación recomienda una consulta de ejemplo (Configure → Examples → Add → query). Pregunta: "¿Cuántos pedidos grandes hubo en 2024?":

```sql norun
-- Un pedido es grande si sus ventas netas superan 3.000 USD
WITH pedido_neto AS (
  SELECT pedido_id, SUM(importe_neto) AS neto
  FROM <catalogo>.default.ventas_lineas
  WHERE fecha >= '2024-01-01' AND fecha < '2025-01-01'
  GROUP BY pedido_id
)
SELECT COUNT(*) AS pedidos_grandes
FROM pedido_neto
WHERE neto > 3000
```

**7.4 Una consulta de ejemplo con parámetros** (Configure → Examples → Add → query). Pregunta: "¿Cuánto vendimos en un país en un mes?":

```sql norun
SELECT ROUND(SUM(importe_neto), 2) AS ventas_netas,
       COUNT(DISTINCT pedido_id)   AS pedidos
FROM <catalogo>.default.ventas_lineas
WHERE pais = :pais
  AND mes = :mes
```

Configura `:pais` como texto (comentario: "nombre del país, por ejemplo Chile") y `:mes` como texto (comentario: "formato AAAA-MM"). Es un **trusted asset**: cuando Genie la use, la respuesta saldrá como verificada.

**7.5 Instrucciones de texto, pocas** (Configure → Instructions → Text):

```text
- El año fiscal empieza el 1 de febrero: el FY2024 va del 1/2/2024 al 31/1/2025.
- Redondea los importes a 2 decimales.
- Si preguntan por ventas sin decir el período, pregunta: "¿De qué período? Por ejemplo, marzo de 2024 o todo 2024."

Instructions you must follow when providing summaries
- Responde siempre en español.
- Indica el período que cubren los resultados.
```

```captura
archivo: genie-p07-knowledge-store.png
texto: La pestaña de ejemplos con las SQL expressions y la consulta con parámetros
```

## Paso 8: los benchmarks

En la pestaña **Benchmarks** agrega al menos ocho preguntas con su **SQL Answer**: las diez del paso 6 (menos las que no tienen una respuesta única) y **dos variantes** de las más importantes. Por ejemplo, para la pregunta 2:

- "¿Cuánto facturó el local en marzo de 2024?"
- "Ventas del canal tienda en 2024-03"
- "¿Cuánto vendió la sucursal física en marzo del 24?"

Todas con el mismo SQL Answer:

```sql norun
SELECT ROUND(SUM(importe_neto), 2) AS ventas_netas
FROM <catalogo>.default.ventas_lineas
WHERE canal = 'tienda' AND mes = '2024-03'
```

Corre **Run benchmarks** y anota la exactitud.

```captura
archivo: genie-p08-benchmarks.png
texto: La pestaña Evaluations con el porcentaje de exactitud de la corrida
```

## Paso 9: iterar

Por cada benchmark en *Bad*: abre la evaluación, compara la salida con la respuesta correcta, decide qué herramienta lo arregla (sinónimo, SQL expression, ejemplo), aplícala y vuelve a correr. Anota la exactitud de cada corrida: esa evolución es la mejor evidencia de tu trabajo.

| Corrida | Cambio | Exactitud |
|---|---|---|
| 1 | Línea base | (anota) |
| 2 | Sinónimos y entity matching | (anota) |
| 3 | SQL expressions y consulta de pedidos grandes | (anota) |
| 4 | Consulta con parámetros e instrucciones | (anota) |

```captura
archivo: genie-p09-iteracion.png
texto: Una pregunta que pasó de Bad a Good después de agregar un sinónimo
```

## Paso 10: preguntarle desde un notebook

Copia el identificador del agente: es la última parte de la dirección (URL) cuando tienes el agente abierto, una cadena larga de letras y números. Luego, en un notebook nuevo:

```python norun
from databricks.sdk import WorkspaceClient

w = WorkspaceClient()
space_id = "<id_del_agente>"

for pregunta in ["¿Cuánto vendimos en 2024?", "Ventas del local en marzo de 2024"]:
    m = w.genie.start_conversation_and_wait(space_id, pregunta)
    print("❓", pregunta, "→", m.status)
    for a in m.attachments or []:
        if a.text:
            print("  ", a.text.content)
        if a.query:
            print("   SQL:", a.query.query)
```

```captura
archivo: genie-p10-sdk.png
texto: El notebook con las respuestas del agente obtenidas por el SDK
```

## Paso 11: documentarlo para tu portafolio

En un repositorio de GitHub con un `README.md`:

1. **El problema**: la gerencia esperaba un día por cada pregunta de ventas.
2. **La arquitectura**: CSV → volumen → tablas → vista documentada → vista de métricas → Genie Agent (un diagrama).
3. **Las decisiones de contexto**: por qué una vista y no cuatro tablas, qué definiste como SQL expression y por qué, qué quedó como texto.
4. **La evidencia**: la tabla de exactitud de los benchmarks por corrida y dos ejemplos de antes y después.
5. **Los límites**: qué preguntas no responde y por qué.
6. Las capturas de esta guía y el SQL de los pasos 2 a 4.

:::errores
- **Saltarse la línea base**: sin medir antes, no puedes demostrar que tu trabajo mejoró algo.
- **Afinar con instrucciones de texto lo que se arregla con un sinónimo**.
- **Benchmarks con una sola forma de cada pregunta**.
- **Dejar la vista con cancelados** y "arreglarlo" en una instrucción: el filtro va en los datos.
- **No revisar las sugerencias de Genie Code** al crear el agente.
:::

:::trabajo
- Este proyecto reproduce el trabajo real de quien lanza Genie en una empresa: preparar la capa semántica, construir un agente enfocado, medirlo y mejorarlo con evidencia.
- En una entrevista, la tabla de exactitud por corrida y la explicación de cada decisión valen más que la demo en vivo.
:::

:::entrevista "Muéstrame un proyecto con IA generativa sobre datos."
Presentaría el asistente de ventas con Genie: el problema de negocio, la preparación de los datos en una vista documentada y una vista de métricas para tener una sola definición de cada indicador, cómo configuré el agente siguiendo el orden recomendado (sinónimos y coincidencia de valores, SQL expressions, una consulta con parámetros como respuesta verificada y pocas instrucciones de texto) y, sobre todo, la medición: benchmarks con variantes de cada pregunta, la exactitud de la línea base y cómo subió en cada iteración, y los límites conocidos.
:::

## Ejercicios

:::ejercicio sql dificultad=Intermedio titulo="El SQL Answer de la pregunta 3"
Escribe el SQL Answer del benchmark "Ventas por canal en 2024" sobre la base del curso: `canal` y `ventas_netas` (sin cancelados, redondeado a 2), ordenado por `ventas_netas` de mayor a menor.
```sql solucion
SELECT p.canal,
       ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS ventas_netas
FROM pedidos p
JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
WHERE p.estado <> 'cancelado'
  AND p.fecha_pedido >= '2024-01-01' AND p.fecha_pedido < '2025-01-01'
GROUP BY p.canal
ORDER BY ventas_netas DESC;
```
```pista
Une pedidos con su detalle, filtra cancelados y el año 2024, agrupa por canal.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="El SQL Answer de la pregunta 8 (trimestre fiscal)"
El año fiscal empieza el 1 de febrero. Devuelve las ventas netas (sin cancelados, redondeadas a 2) de cada trimestre fiscal del **año fiscal 2024** (del 2024-02-01 al 2025-01-31): columnas `trimestre_fiscal` (`Q1` = feb-abr, `Q2` = may-jul, `Q3` = ago-oct, `Q4` = nov-ene) y `ventas_netas`, ordenado por trimestre.
```sql solucion
SELECT CASE
         WHEN CAST(substr(p.fecha_pedido, 6, 2) AS INTEGER) IN (2, 3, 4) THEN 'Q1'
         WHEN CAST(substr(p.fecha_pedido, 6, 2) AS INTEGER) IN (5, 6, 7) THEN 'Q2'
         WHEN CAST(substr(p.fecha_pedido, 6, 2) AS INTEGER) IN (8, 9, 10) THEN 'Q3'
         ELSE 'Q4'
       END AS trimestre_fiscal,
       ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS ventas_netas
FROM pedidos p
JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
WHERE p.estado <> 'cancelado'
  AND p.fecha_pedido >= '2024-02-01' AND p.fecha_pedido < '2025-02-01'
GROUP BY trimestre_fiscal
ORDER BY trimestre_fiscal;
```
```pista
El mes son los caracteres 6 y 7 de `fecha_pedido` (`substr(fecha_pedido, 6, 2)`). El período va del 2024-02-01 hasta antes del 2025-02-01; enero de 2025 cae en el Q4 del FY2024.
```
:::

:::ejercicio quiz dificultad=Intermedio
¿Por qué conviene medir la línea base antes de afinar el agente?

- [ ] Porque Genie lo exige
- [x] Para poder demostrar con números cuánto mejoró cada cambio y detectar si alguno empeoró algo
- [ ] Para que Genie aprenda de las respuestas incorrectas
- [ ] No conviene: es tiempo perdido
:::
