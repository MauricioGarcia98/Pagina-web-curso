---
titulo: "Proyecto 10: Un agente que responde preguntas sobre los datos"
nivel: Experto
duracion: 110
resumen: "¿Cuánto vendimos en Colombia el mes pasado por canal?" respondido en lenguaje natural, con la consulta SQL a la vista y números correctos. Construyes la capa que lo hace confiable - un modelo gold claro, métricas definidas una sola vez, descripciones de tablas y columnas, ejemplos de preguntas con su SQL y guardrails (solo lectura, solo gold, límites) - y lo evalúas con un conjunto de preguntas con respuesta conocida. Con Genie en Databricks, o con un agente propio y Microsoft Foundry.
objetivos: Preparar un modelo gold para que un agente lo entienda (nombres, descripciones, métricas) | Definir métricas una sola vez para evitar respuestas distintas a la misma pregunta | Implementar guardrails de solo lectura, alcance y costo | Evaluar un agente de texto a SQL contra respuestas conocidas | Explicar por qué el agente falla y cómo se corrige
prerrequisitos: portafolio-lakehouse-de-ventas | portafolio-asistente-rag-con-citas
autoevaluacion: ¿Sabes por qué un agente responde mal sobre un esquema mal documentado? | ¿Sabes qué es una capa semántica o una definición de métrica? | ¿Sabes qué guardrails necesita un agente que ejecuta SQL? | ¿Sabes armar un conjunto de evaluación con respuestas conocidas? | ¿Sabes detectar un error de fan-out en una respuesta?
---

:::escenario
La gerencia comercial pide "un ChatGPT de nuestras ventas". Un primer prototipo conectado directo a las tablas de la base responde rápido… y mal: dice que en marzo se vendieron 2,4 millones cuando fueron 1,1. Sumó el monto del pedido una vez por cada línea de detalle. El problema no es el modelo: es que nadie le explicó los datos.
:::

## La idea en una frase

Un agente de datos es tan bueno como el **contexto** que le das: un modelo limpio, métricas definidas, descripciones y ejemplos. El proyecto 1 (lakehouse de ventas) es su base.

## Valor y criterio de éxito

- Preguntas frecuentes respondidas en segundos, con el SQL visible para auditarlas.
- **Criterio para publicarlo**: 90 % de respuestas correctas en un conjunto de 40 preguntas reales con respuesta conocida, y 0 consultas fuera del alcance permitido.

## Los datos

Los modelos gold del **proyecto 1** (`fct_ventas`, `dim_cliente`, `dim_producto`, `dim_fecha`), generados con [el mismo escenario](#/generador?esc=ecommerce&n=2000&semilla=42&desde=2024-01-01&hasta=2024-12-31&duplicados=2&nulos=4&formatos=5&atipicos=1&huerfanos=1&tardios=3&mojibake=1).

## Arquitectura

```diagrama
titulo: Agente de datos con contexto y guardrails
nodo u: Pregunta | icono=usuario | col=0 | fila=0
nodo ctx: Contexto | icono=libro | col=1 | fila=0 | sub=descripciones, métricas,\nejemplos pregunta→SQL
nodo ag: Agente | icono=bot | col=2 | fila=0 | sub=Genie o agente propio
nodo gr: Guardrails | icono=escudo | col=2 | fila=1 | color=rojo | sub=solo SELECT, solo gold,\nLIMIT, tiempo máximo
nodo wh: SQL warehouse | icono=databricks | col=3 | fila=1 | sub=usuario de solo lectura
nodo r: Respuesta + SQL | icono=dashboard | col=3 | fila=0 | color=verde
nodo ev: Evaluación | icono=check | col=1 | fila=1 | sub=40 preguntas con\nrespuesta conocida
flecha u -> ag
flecha ctx -> ag
flecha ag -> gr: SQL propuesto
flecha gr -> wh
flecha wh -> r
flecha ev -> ag: mide | estilo=punteada
```

## Fase 1: preparar el contexto

1. **Solo gold**: el agente no ve bronze ni silver. Nombres claros (`venta_neta`, no `vn_amt2`).
2. **Descripciones** en cada tabla y columna (`COMMENT ON COLUMN`): grano, unidades, qué incluye y qué no ("venta_neta excluye pedidos cancelados y devueltos").
3. **Métricas definidas una vez**: una vista o una métrica semántica `ventas_netas` que todos usan, en lugar de que el agente reinvente la fórmula.
4. **Ejemplos** de preguntas con su SQL correcto (10 a 20): son el mejor contexto.
5. **Reglas de negocio** escritas: "el mes pasado = el mes calendario anterior completo"; "país = país del cliente".

## Fase 2: guardrails

| Riesgo | Guardrail |
|---|---|
| Modificar datos | Usuario del warehouse con solo `SELECT`; validar que la consulta sea un único `SELECT` |
| Ver datos que no debe | Permisos de Unity Catalog del usuario que pregunta (no de un superusuario) |
| Consultas carísimas | `LIMIT` automático, tiempo máximo, warehouse chico con auto-stop |
| Respuestas sin verificar | Mostrar siempre el SQL y la tabla resultado, no solo el texto |

## Fase 3: Genie o un agente propio

- **Genie (Databricks)**: un espacio de Genie con las tablas gold, sus descripciones, instrucciones y preguntas de ejemplo. Lo que mejora las respuestas es el contexto que le cargas, no un truco de prompt.
- **Agente propio**: un modelo en Microsoft Foundry (o Ollama local) con dos herramientas: `listar_tablas_y_columnas` y `ejecutar_select(sql)`, este último con los guardrails de arriba. Ventaja: control total y mismo esquema de evaluación.

## Fase 4: evaluar

Un archivo con 40 preguntas reales y su **respuesta correcta calculada a mano** (con SQL revisado). Para cada versión del contexto: % correctas, tipos de error (fan-out, filtro de fecha, métrica equivocada, columna inventada) y qué cambio del contexto corrigió cada uno.

:::errores
- **Dejar que el agente ejecute cualquier SQL**: tiene que usar un usuario de solo lectura y, mejor, un conjunto acotado de vistas.
- **No mostrar la consulta que ejecutó**: el usuario no puede verificar el número.
- **Sin límites de filas ni de tiempo**: una consulta mal armada recorre toda la base.
- **No evaluar con preguntas reales y respuestas conocidas**.
:::

:::trabajo
- Los asistentes que consultan datos funcionan mucho mejor sobre una capa semántica bien documentada (métricas y dimensiones con descripción) que sobre las tablas crudas; el trabajo de datos de base es el que los hace confiables.
:::

:::entrevista "¿Qué controles pondrías a un agente que consulta una base de datos?"
Acceso de solo lectura con un usuario propio y permisos sobre vistas aprobadas, no sobre todas las tablas. Límites de filas y de tiempo de ejecución, validación de la consulta antes de correrla, y mostrar siempre la consulta y la fuente junto con la respuesta. Registro de todo para auditar y un conjunto de preguntas de evaluación con respuestas conocidas.
:::

## Entregables

- [ ] Descripciones de tablas y columnas, métricas definidas y ejemplos pregunta→SQL.
- [ ] Guardrails implementados y probados (intentos de `DELETE`, consultas a bronze, consultas sin filtro).
- [ ] Conjunto de evaluación y resultados por versión.
- [ ] Demo de 2 minutos con preguntas bien y mal respondidas, y por qué.

## Práctica

:::ejercicio sql dificultad=Avanzado titulo="El error del prototipo"
El prototipo calculó las ventas uniendo `ped_ag` (cabecera con `monto_total`) con `det_ag` (líneas) y sumando `monto_total`. Devuelve `respuesta_prototipo` (esa suma) y `respuesta_correcta` (suma de `monto_total` de `ped_ag`, sin join) para marzo de 2024.
```sql setup
CREATE TABLE ped_ag (pedido_id INTEGER, fecha TEXT, monto_total REAL);
INSERT INTO ped_ag VALUES (1, '2024-03-02', 300), (2, '2024-03-05', 120), (3, '2024-03-20', 500), (4, '2024-04-01', 90);
CREATE TABLE det_ag (pedido_id INTEGER, producto_id INTEGER, cantidad INTEGER);
INSERT INTO det_ag VALUES (1, 7, 1), (1, 8, 2), (1, 9, 1), (2, 7, 1), (3, 5, 1), (3, 6, 1), (4, 7, 1);
```
```sql solucion
SELECT (SELECT SUM(p.monto_total) FROM ped_ag p JOIN det_ag d ON d.pedido_id = p.pedido_id WHERE p.fecha BETWEEN '2024-03-01' AND '2024-03-31') AS respuesta_prototipo,
       (SELECT SUM(monto_total) FROM ped_ag WHERE fecha BETWEEN '2024-03-01' AND '2024-03-31') AS respuesta_correcta;
```
```explicacion
2.020 contra 920: el join repite cada pedido por cada línea (fan-out). Un agente sin contexto cae en este error todo el tiempo. Se corrige con una métrica definida sobre el grano correcto (o una tabla `fct_pedidos` de un pedido por fila) y un ejemplo pregunta→SQL que la use.
```
:::

:::ejercicio sql ordenado dificultad=Intermedio titulo="Evaluar al agente"
`eval_agente(pregunta_id, version, respuesta_agente, respuesta_correcta)` tiene las respuestas numéricas del agente para dos versiones del contexto. Una respuesta es correcta si difiere de la correcta en menos de 0,5 %. Devuelve por `version` el `pct_correctas` (1 decimal).
```sql setup
CREATE TABLE eval_agente (pregunta_id INTEGER, version TEXT, respuesta_agente REAL, respuesta_correcta REAL);
INSERT INTO eval_agente VALUES
(1, 'v1', 2020, 920), (2, 'v1', 15400, 15400), (3, 'v1', 88.2, 88.0), (4, 'v1', 310, 455), (5, 'v1', 12, 12),
(1, 'v2', 920, 920), (2, 'v2', 15400, 15400), (3, 'v2', 88.1, 88.0), (4, 'v2', 455, 455), (5, 'v2', 13, 12);
```
```sql solucion
SELECT version, ROUND(100.0 * SUM(CASE WHEN ABS(respuesta_agente - respuesta_correcta) < 0.005 * ABS(respuesta_correcta) THEN 1 ELSE 0 END) / COUNT(*), 1) AS pct_correctas
FROM eval_agente GROUP BY version ORDER BY version;
```
```pista
`ABS(respuesta_agente - respuesta_correcta) < 0.005 * ABS(respuesta_correcta)`.
```
:::

:::ejercicio sql ordenado dificultad=Avanzado titulo="Un guardrail en SQL"
`consultas_agente(id, sql_texto)` tiene las consultas que propuso el agente. Marca como `permitida` (1/0) cada una: debe empezar con `SELECT` (sin importar mayúsculas ni espacios iniciales), no contener `;` en el medio ni las palabras `delete`, `update`, `drop` o `insert`, y solo leer tablas que empiecen con `gold.`. Devuelve `id` y `permitida`, ordenado por `id`.
```sql setup
CREATE TABLE consultas_agente (id INTEGER, sql_texto TEXT);
INSERT INTO consultas_agente VALUES
(1, 'SELECT pais, SUM(venta_neta) FROM gold.fct_ventas GROUP BY pais'),
(2, '  select * from gold.dim_cliente limit 10'),
(3, 'SELECT * FROM bronze.pedidos'),
(4, 'SELECT 1; DELETE FROM gold.fct_ventas'),
(5, 'UPDATE gold.fct_ventas SET venta_neta = 0');
```
```sql solucion
SELECT id,
       CASE WHEN LOWER(LTRIM(sql_texto)) LIKE 'select%'
             AND sql_texto NOT LIKE '%;%'
             AND LOWER(sql_texto) NOT LIKE '%delete%' AND LOWER(sql_texto) NOT LIKE '%update%'
             AND LOWER(sql_texto) NOT LIKE '%drop%' AND LOWER(sql_texto) NOT LIKE '%insert%'
             AND LOWER(sql_texto) NOT LIKE '%from bronze.%' AND LOWER(sql_texto) NOT LIKE '%from silver.%'
            THEN 1 ELSE 0 END AS permitida
FROM consultas_agente
ORDER BY id;
```
```explicacion
Este chequeo de texto es una **segunda** barrera, no la principal: la principal es que el agente use un usuario con permiso de solo lectura sobre gold. Las validaciones por texto se pueden esquivar; los permisos, no.
```
:::

:::ejercicio quiz dificultad=Avanzado
El agente responde distinto a "ventas de marzo" según cómo se pregunte. ¿Qué lo resuelve mejor?

- [ ] Un modelo de lenguaje más grande
- [x] Una métrica definida una sola vez (vista o métrica semántica) y ejemplos pregunta→SQL que la usen
- [ ] Bajar la temperatura a 0
- [ ] Pedirle al usuario que pregunte siempre igual
:::

:::ejercicio quiz dificultad=Avanzado
¿Con qué permisos debe ejecutar el SQL el agente?

- [ ] Con un usuario administrador para que nunca falle
- [x] Con los permisos del usuario que pregunta (o un usuario de solo lectura sobre gold): el agente no puede ver más que la persona
- [ ] Con el usuario del pipeline de ingesta
- [ ] Sin usuario: el agente no necesita permisos
:::

:::ejercicio quiz dificultad=Intermedio
¿Por qué se muestra siempre el SQL junto a la respuesta?

- [ ] Para que la respuesta sea más larga
- [x] Para que se pueda verificar y auditar: una respuesta de datos sin la consulta no es confiable
- [ ] Porque Genie no puede ocultarlo
- [ ] Para enseñar SQL a la gerencia
:::

## Para ir más lejos

- Registro de todas las preguntas, el SQL generado y si el usuario marcó la respuesta como útil: tu próximo conjunto de evaluación.
- Combinar con el RAG del proyecto 9: un agente que decide si la pregunta es de datos (SQL) o de políticas (documentos).
