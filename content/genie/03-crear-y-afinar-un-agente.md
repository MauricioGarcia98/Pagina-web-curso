---
titulo: Crear y afinar un Genie Agent
nivel: Intermedio
duracion: 70
resumen: Crear un agente paso a paso (datos, warehouse, descripción, preguntas comunes) y enseñarle el negocio con las herramientas en el orden que recomienda la documentación - el knowledge store (descripciones, sinónimos, coincidencia de valores, joins y SQL expressions de tipo filtro, medida y campo), las consultas SQL de ejemplo (y con parámetros, que se vuelven respuestas verificadas), las funciones de Unity Catalog y, como último recurso, las instrucciones de texto.
objetivos: Crear un Genie Agent y configurar sus datos y ajustes | Agregar descripciones, sinónimos y coincidencia de valores | Definir SQL expressions de tipo filtro, medida y campo | Escribir consultas de ejemplo, con y sin parámetros | Elegir el tipo de instrucción adecuado para cada necesidad | Escribir instrucciones de aclaración y de resumen
prerrequisitos: genie-preparar-los-datos
autoevaluacion: ¿Sabes en qué orden conviene usar SQL expressions, ejemplos SQL e instrucciones de texto? | ¿Sabes qué es un trusted asset? | ¿Sabes para qué sirve la coincidencia de entidades (entity matching)?
---

:::escenario
Con la vista de ventas preparada, toca crear el agente. La primera prueba sale bien ("¿cuánto vendimos en 2024?"), pero las siguientes muestran huecos: "¿cuánto vendimos en el local?" no encuentra nada porque en los datos el canal se llama `tienda`; "pedidos grandes" se interpreta cada vez con un umbral distinto; y "¿cómo vamos este trimestre?" mezcla trimestres calendario con el año fiscal de la empresa. Cada hueco tiene una herramienta específica para cerrarlo.
:::

## Crear el agente

Requisitos, según la documentación: que los datos estén en **Unity Catalog**, un **SQL warehouse pro o serverless** sobre el que tengas permiso `CAN USE`, permiso `SELECT` sobre las tablas y el *entitlement* de Databricks SQL. En Databricks Free Edition ya tienes todo eso.

1. En la barra lateral, haz clic en **Genie Agents** → **New**.
2. Elige las fuentes de datos (la vista de ventas, o tus tablas) → **Create**.
3. Se abre **Genie Code** con sugerencias: lee tus datos y propone descripciones y consultas de ejemplo. Revisa cada una y acepta solo las correctas.
4. En **Configure → Settings** completa el **título**, la **descripción** (qué responde el agente, para quién y con qué datos), el **warehouse por defecto** y las **preguntas comunes** que verán los usuarios al entrar.

Si tu workspace tiene consultas populares sobre esas tablas, Genie te las sugiere en el diálogo **Review Suggested Queries**: son un buen punto de partida, pero revisa cada una antes de aceptarla.

## Qué le enseñas al agente: el mapa

```diagrama
titulo: Las piezas de contexto de un Genie Agent
nodo uc: Unity Catalog | icono=unity | col=0 | fila=0 | sub=tablas, vistas,\nvistas de métricas, comentarios
nodo ks: Knowledge store | icono=libro | col=1 | fila=0 | color=violeta | sub=descripciones, sinónimos,\njoins, SQL expressions
nodo ej: Ejemplos SQL y funciones | icono=codigo | col=1 | fila=1 | color=azul | sub=preguntas con su SQL;\ncon parámetros = verificadas
nodo txt: Instrucciones de texto | icono=documento | col=1 | fila=2 | color=gris | sub=último recurso
nodo genie: Genie | icono=genie | col=2 | fila=1 | color=violeta | sub=elige contexto\ny escribe el SQL
nodo resp: Respuesta | icono=dashboard | col=3 | fila=1 | color=verde
flecha uc -> ks
flecha ks -> genie
flecha ej -> genie
flecha txt -> genie | estilo=punteada
flecha genie -> resp
```

Las herramientas, en el orden en que la documentación recomienda usarlas:

| Prioridad | Herramienta | Para qué | Ejemplo |
|---|---|---|---|
| 1 | **SQL expressions** (knowledge store) | Términos de negocio que se repiten: medidas, filtros y campos | "clientes corporativos" = `segmento = 'Corporativo'` |
| 2 | **Consultas SQL de ejemplo** | Preguntas complejas, de varias partes o ambiguas | "comparativo de ventas por canal contra el año anterior" |
| 3 | **Funciones SQL** de Unity Catalog | Lógica que no cabe en una consulta fija | Un cálculo de comisiones con reglas por tramo |
| 4 | **Instrucciones de texto** | Lo que no se puede expresar en SQL | "si no dicen el período, pregunta cuál" |

¿Por qué ese orden? Porque las definiciones estructuradas se aplican **exactamente como están escritas**; una instrucción de texto, en cambio, el modelo la interpreta, y con muchas instrucciones le cuesta priorizar. La documentación es explícita: usa instrucciones de texto **solo como último recurso**.

## 1. El knowledge store

El **knowledge store** es la colección de definiciones del agente. Todo lo que configures acá vale **solo para este agente**: no cambia la metadata de Unity Catalog ni afecta a otros usuarios de las tablas. Se configura en **Configure → Sources** (metadata) y **Configure → Examples** (joins y SQL expressions).

### Descripciones, sinónimos y columnas ocultas

Haz clic en una tabla y luego en el lápiz de una columna:

- **Descripción**: una versión pensada para este agente (por ejemplo, aclarar que `importe_neto` es "las ventas").
- **Sinónimos**: cómo llama la gente a la columna. Para `canal`: "canal de venta", "medio". Para `importe_neto`: "ventas", "facturación".
- **Ocultar columnas** que confunden o sobran: Genie deja de considerarlas.

### Coincidencia de valores (prompt matching)

Las personas escriben como hablan, con sinónimos y errores de tipeo. La documentación pone este ejemplo: si los datos guardan los estados como `FL` y alguien pregunta por "Florida", sin ayuda Genie escribiría `WHERE state ILIKE '%Florida%'` y no encontraría nada. Con **entity matching** activado en esa columna, Genie conoce los valores reales y escribe `WHERE state = 'FL'`.

En la tienda pasa lo mismo con "el local" → `canal = 'tienda'`. Hay dos niveles:

- **Format assistance**: Genie ve valores de muestra de cada columna para entender su formato (fechas, códigos). Se activa sola.
- **Entity matching**: para columnas de texto con categorías (país, canal, estado), Genie guarda la lista de valores distintos (hasta 1.024 por columna, en hasta 120 columnas). Se activa en **Advanced** dentro de la columna. No se puede usar en tablas con filtros de filas ni máscaras de columnas.

Cuando aparecen valores nuevos (un canal nuevo), se actualiza con **Refresh prompt matching**.

### Relaciones de join

Si el agente tiene varias tablas, define cómo se unen en **Configure → Examples → Add → Joins**: tabla izquierda, tabla derecha, condición (`pedidos.cliente_id = clientes.cliente_id`) y tipo de relación (**muchos a uno**, **uno a muchos** o **uno a uno**). El tipo importa: le dice a Genie dónde se puede duplicar al sumar. Si declaraste claves en Unity Catalog, estas relaciones ya aparecen solas.

### SQL expressions: filtros, medidas y campos

Son la herramienta más eficiente para los términos del negocio. Hay tres tipos:

| Tipo | Qué es | Ejemplo para la tienda |
|---|---|---|
| **Filter** (filtro) | Una condición verdadera o falsa sobre cada fila | Nombre "Líneas con descuento" · Código `descuento > 0` · Sinónimos: con promoción, rebajadas |
| **Measure** (medida) | Un cálculo que agrega muchas filas | Nombre "Ticket promedio" · Código `SUM(importe_neto) / COUNT(DISTINCT pedido_id)` · Sinónimos: ticket medio |
| **Field** (campo) | Un valor nuevo por fila, para agrupar | Nombre "Trimestre fiscal" · Código `CASE WHEN month(fecha) IN (2,3,4) THEN 'Q1' ...` · Sinónimos: trimestre |

Cada una lleva además un campo **Instructions**: cuándo usarla ("aplica cuando pregunten por ventas con promoción"). Un filtro se evalúa **fila por fila**: si la condición necesita sumar varias filas primero (como "pedidos de más de 3.000" en una tabla de líneas), es lógica de varios pasos y va mejor como consulta de ejemplo. Se agregan en **Configure → Examples → Add** eligiendo *Filter*, *Measure* o *Field*.

Si tu agente usa una **vista de métricas**, las medidas ya vienen definidas en ella: no las repitas como SQL expressions.

:::nota Límites
Cada agente admite hasta **200 fragmentos del knowledge store** (descripciones de tablas, joins y SQL expressions) y hasta **100 instrucciones** (cada consulta de ejemplo, cada función y el bloque completo de instrucciones de texto cuentan como una).
:::

## 2. Consultas SQL de ejemplo

Para preguntas complejas, la mejor herramienta es mostrarle a Genie **cómo se resuelve**. En **Configure → Examples** agregas una pregunta (escrita como la diría un usuario) y la consulta que la responde:

- **Pregunta**: "¿Cómo vamos por canal contra el mismo mes del año pasado?"
- **SQL**: la consulta completa, con los filtros y cálculos correctos.

Cuando llega una pregunta parecida, Genie usa ese ejemplo como guía. Con **Usage guidance** puedes aclarar cuándo aplica.

### Consultas con parámetros: respuestas verificadas

Una consulta de ejemplo puede tener **parámetros**, que se escriben con dos puntos (`:pais`) o con el botón **Add parameter**. Cada parámetro tiene tipo (texto, fecha, fecha y hora, decimal o entero) y un comentario que explica los valores posibles:

```sql norun
-- Pregunta: "¿Cuánto vendimos en <país> en <mes>?"
SELECT ROUND(SUM(importe_neto), 2) AS ventas_netas,
       COUNT(DISTINCT pedido_id)   AS pedidos
FROM ventas.gold.ventas_lineas
WHERE estado <> 'cancelado'
  AND pais = :pais
  AND mes = :mes
```

Las consultas con parámetros y las funciones de Unity Catalog son **trusted assets** (activos de confianza): cuando Genie responde usando exactamente una de ellas, la respuesta aparece como **verificada**, y el usuario puede cambiar el valor del parámetro y volver a ejecutarla. Para las preguntas más frecuentes e importantes, esta es la forma de dar respuestas que no varían.

## 3. Funciones de Unity Catalog

Cuando la lógica no cabe en una consulta fija (por ejemplo, comisiones por tramos con reglas que dependen del vendedor), se registra una **función SQL** en Unity Catalog y se agrega al agente. Genie la llama con los valores de la pregunta. Los usuarios necesitan permiso `EXECUTE` sobre la función.

## 4. Instrucciones de texto (último recurso)

En **Configure → Instructions → Text** van las reglas que no se pueden escribir en SQL. Pocas y concretas:

```text
- El año fiscal empieza el 1 de febrero: el FY2025 va del 1/2/2025 al 31/1/2026.
- Redondea los importes a 2 decimales.
- Si preguntan por ventas sin decir el período, pregunta primero:
  "¿De qué período quieres las ventas? Por ejemplo: marzo de 2024 o todo 2024."

Instructions you must follow when providing summaries
- Responde siempre en español.
- Indica el período que cubren los resultados.
- Menciona la tabla y las columnas que usaste.
```

Tres recomendaciones de la documentación:

- **Ser específico**: "pregunta si falta algo" es vago. Mejor: **cuándo** (pregunta de ventas), **qué falta** (el período), **qué hacer** (preguntar) y **cómo** (el texto exacto de la pregunta). Esas instrucciones de aclaración van al **final** del bloque.
- **No contradecirse**: si el texto dice "redondear a 2 decimales", las consultas de ejemplo también tienen que redondear a 2.
- **Los resúmenes** se personalizan con una sección que empiece con el título exacto `Instructions you must follow when providing summaries`. Solo las instrucciones de texto afectan los resúmenes; los ejemplos SQL no.

:::errores
- **Resolver todo con instrucciones de texto**: el modelo las interpreta y con muchas prioriza mal. Primero SQL expressions y ejemplos.
- **Definir el mismo término en dos lugares** con reglas distintas (por ejemplo, "pedido grande" en un filtro y en una instrucción, con umbrales diferentes).
- **Aceptar las sugerencias de Genie Code o las consultas populares sin revisarlas**.
- **Entity matching en columnas con datos sensibles**: los valores quedan como contexto del agente. La documentación lo bloquea en tablas con filtros de filas o máscaras.
- **Parámetros con el tipo equivocado** (un mes como entero cuando la columna es texto `2024-03`): Genie interpreta mal el valor.
:::

:::trabajo
- El orden de trabajo habitual: vista o vista de métricas bien documentada → agente con pocas tablas → probar con 20 preguntas reales → cerrar cada error con la herramienta adecuada → repetir.
- Las preguntas más importantes del negocio (las que van a una reunión de directorio) se convierten en consultas con parámetros, para que la respuesta salga verificada.
- La configuración del agente se versiona con Declarative Automation Bundles y se promueve de desarrollo a producción como cualquier otro recurso.
:::

:::entrevista "Un Genie Agent interpreta 'clientes activos' de formas distintas según el día. ¿Cómo lo resuelves?"
Lo defino una sola vez como contexto estructurado, no como texto: una SQL expression de tipo filtro con la condición exacta, por ejemplo al menos una compra en los últimos 90 días, con sinónimos como "clientes vigentes", o mejor aún como medida en la vista de métricas que usa el agente. Agrego una consulta de ejemplo para las preguntas típicas sobre clientes activos y un benchmark con varias formas de preguntarlo, para comprobar que la respuesta es consistente.
:::

## Ejercicios

:::ejercicio sql dificultad=Intermedio titulo="La consulta de ejemplo con sus parámetros resueltos"
Escribe la consulta de ejemplo para "¿Cuánto vendimos en Chile en marzo de 2024?" sobre la base de la tienda: `ventas_netas` (suma de cantidad × precio unitario × (1 − descuento), redondeada a 2) y `pedidos` (pedidos distintos), sin cancelados, para clientes de `Chile` y pedidos con `fecha_pedido` de marzo de 2024.
```sql solucion
SELECT ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS ventas_netas,
       COUNT(DISTINCT p.pedido_id) AS pedidos
FROM detalle_pedidos d
JOIN pedidos p ON p.pedido_id = d.pedido_id
JOIN clientes c ON c.cliente_id = p.cliente_id
WHERE p.estado <> 'cancelado'
  AND c.pais = 'Chile'
  AND substr(p.fecha_pedido, 1, 7) = '2024-03';
```
```pista
En el agente, `'Chile'` y `'2024-03'` serían `:pais` y `:mes`. Aquí escríbelos como valores fijos.
```
:::

:::ejercicio sql dificultad=Intermedio titulo="La consulta de ejemplo de 'pedidos grandes'"
El negocio define "pedido grande" como un pedido (no cancelado) cuyas ventas netas superan 3.000. Devuelve cuántos pedidos grandes hubo en 2024 por `canal` (columna `pedidos_grandes`), ordenado por canal.
```sql solucion
WITH pedido_neto AS (
  SELECT p.pedido_id, p.canal,
         SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)) AS neto
  FROM pedidos p
  JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  WHERE p.estado <> 'cancelado' AND p.fecha_pedido >= '2024-01-01' AND p.fecha_pedido < '2025-01-01'
  GROUP BY p.pedido_id, p.canal
)
SELECT canal, COUNT(*) AS pedidos_grandes
FROM pedido_neto
WHERE neto > 3000
GROUP BY canal
ORDER BY canal;
```
```pista
Primero lleva las líneas al grano pedido (un CTE con la suma por pedido), y recién después aplica el filtro `> 3000`.
```
:::

:::ejercicio quiz dificultad=Intermedio
Los usuarios dicen "el local" pero en los datos el canal se llama `tienda`. ¿Qué configuras primero?

- [ ] Una instrucción de texto larga explicando los canales
- [x] Sinónimos en la columna `canal` y entity matching, para que Genie conozca los valores reales
- [ ] Otra tabla
- [ ] Un benchmark
:::

:::ejercicio quiz dificultad=Intermedio
¿Qué recomienda la documentación para definir un indicador como "tasa de conversión" que se usa en muchas preguntas?

- [ ] Una instrucción de texto
- [x] Una SQL expression de tipo medida (o definirla en la vista de métricas), con sinónimos e instrucciones de uso
- [ ] Repetir la fórmula en cada consulta de ejemplo
- [ ] Nada: Genie la deduce
:::

:::ejercicio quiz dificultad=Avanzado
¿Cuándo aparece una respuesta de Genie como **verificada**?

- [ ] Cuando un usuario la marca como correcta
- [ ] Cuando la respuesta tiene un gráfico
- [x] Cuando Genie usa exactamente un trusted asset: una consulta de ejemplo con parámetros o una función de Unity Catalog
- [ ] Cuando la consulta tarda menos de un segundo
:::

:::ejercicio quiz dificultad=Avanzado
¿Cuál es la instrucción de aclaración mejor escrita?

- [ ] "Pregunta cuando no entiendas."
- [ ] "Sé preciso con las ventas."
- [x] "Cuando pregunten por ventas sin indicar el período, pregunta primero: '¿De qué período quieres las ventas? Por ejemplo: marzo de 2024 o todo 2024.'"
- [ ] "No respondas preguntas de ventas."
:::
