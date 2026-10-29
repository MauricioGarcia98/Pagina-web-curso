---
titulo: "Proyecto 8: Clasificador de tickets con un modelo de lenguaje"
nivel: Avanzado
duracion: 110
resumen: Mensajes reales de clientes (con errores de tipeo, mayúsculas y enojo) ya etiquetados por categoría, sentimiento y prioridad. Usas un modelo de lenguaje para clasificarlos - con Ollama en tu computadora, con ai_classify y ai_query en Databricks o con un modelo desplegado en Microsoft Foundry - y lo evalúas contra las etiquetas con una matriz de confusión, costo por mil tickets y casos donde falla. Valor - enrutar al instante en vez de triar a mano.
objetivos: Diseñar un prompt de clasificación con categorías cerradas y salida estructurada | Evaluar un clasificador contra etiquetas con exactitud por clase y matriz de confusión | Calcular el costo y la latencia por mil tickets | Usar funciones de IA en SQL (ai_classify, ai_query) sobre una tabla | Decidir cuándo un LLM no es la mejor opción
prerrequisitos: portafolio-como-armar-tu-portafolio
autoevaluacion: ¿Sabes escribir un prompt que devuelva solo una categoría válida? | ¿Sabes armar una matriz de confusión con SQL? | ¿Sabes estimar el costo de clasificar 100.000 tickets? | ¿Sabes qué hacer con las respuestas fuera de las categorías? | ¿Sabes cuándo convendría un modelo clásico?
---

:::escenario
El equipo de soporte recibe 1.500 mensajes por semana por chat, email, WhatsApp y formulario. Una persona los lee y los asigna: pagos, envíos, devoluciones, garantía o cuenta. Los urgentes (cobros duplicados, cuentas hackeadas) a veces esperan horas en la cola. Te piden clasificar y priorizar automáticamente, y **demostrar** que la clasificación es confiable antes de activarla.
:::

## Valor

- **Tiempo de primera respuesta** de los urgentes: de horas a minutos.
- **Horas de triage** liberadas por semana.
- La condición para activarlo: **exactitud por categoría** mayor a 90 % y revisión humana de los casos de baja confianza.

## Los datos

[🏭 Generar los datos del proyecto](#/generador?esc=soporte&n=1500&semilla=88&desde=2024-01-01&hasta=2024-12-31&formatos=3&duplicados=1) · Escenario **Soporte**: `tickets` (mensaje, canal, país, y las etiquetas `categoria`, `sentimiento` y `prioridad`) y `base_conocimiento` (para el proyecto 9).

```bash
generar-datos soporte --filas 300 --semilla 88
duckdb -c "SELECT categoria, COUNT(*) FROM '~/datos/generados/soporte/tickets.csv' GROUP BY 1"
```

## Arquitectura

```diagrama
titulo: Clasificación con LLM y evaluación
nodo t: tickets | icono=mensaje | col=0 | fila=0
nodo p: Prompt + categorías | icono=documento | col=1 | fila=0 | sub=salida JSON cerrada
nodo m: Modelo | icono=bot | col=2 | fila=0 | sub=Ollama local · ai_query\n· Foundry
nodo v: Validación | icono=check | col=3 | fila=0 | sub=¿categoría válida?\nconfianza
nodo e: Evaluación | icono=grafico | col=3 | fila=1 | sub=matriz de confusión,\ncosto, latencia
nodo h: Revisión humana | icono=usuario | col=2 | fila=1 | sub=baja confianza
flecha t -> p
flecha p -> m
flecha m -> v
flecha v -> e
flecha v -> h: dudosos | estilo=punteada
```

## El prompt

```text
Eres un clasificador de tickets de soporte de una tienda online.
Categorías posibles: pagos, envios, devoluciones, garantia, cuenta.
Prioridad: urgente si hay riesgo de dinero o de seguridad (cobros duplicados, cuenta hackeada);
alta si el cliente está enojado; si no, media.

Responde SOLO con JSON: {"categoria": "...", "prioridad": "...", "confianza": 0.0-1.0}

Mensaje: """{mensaje}"""
```

- **Categorías cerradas** y salida **JSON**: se puede validar y medir.
- Incluye 3 a 5 **ejemplos** reales (few-shot) si la exactitud de una categoría es baja.
- Temperatura 0: misma entrada, misma salida.

## Tres formas de ejecutarlo

**Local con Ollama** (gratis, privado):

```python norun
import json, ollama, pandas as pd
df = pd.read_csv("data/raw/tickets.csv")
def clasificar(msg):
    r = ollama.chat(model="llama3.2", options={"temperature": 0}, format="json",
                    messages=[{"role": "user", "content": PROMPT.format(mensaje=msg)}])
    return json.loads(r["message"]["content"])
df[["pred_categoria", "pred_prioridad", "confianza"]] = df["mensaje"].apply(lambda m: pd.Series(clasificar(m)))
```

**Databricks, con funciones de IA en SQL**:

```sql norun
SELECT ticket_id, mensaje, categoria,
       ai_classify(mensaje, ARRAY('pagos', 'envios', 'devoluciones', 'garantia', 'cuenta')) AS pred_categoria,
       ai_analyze_sentiment(mensaje) AS pred_sentimiento
FROM workspace.soporte.tickets;
```

`ai_query('<endpoint>', prompt)` permite usar tu propio prompt con un modelo del workspace. Revisa qué funciones y modelos están disponibles en tu edición y región.

**Azure**: un modelo desplegado en **Microsoft Foundry** y llamado con el SDK (con salida estructurada en JSON). Las credenciales van en Key Vault o variables de entorno, nunca en el código.

## Evaluar como un profesional

| Métrica | Para qué |
|---|---|
| Exactitud por categoría | Una categoría mala no se esconde en el promedio |
| Matriz de confusión | Ver **qué** confunde (¿devoluciones con envíos?) |
| % fuera de categoría | Respuestas que no respetan el formato |
| Costo por 1.000 tickets | Tokens de entrada + salida × precio |
| Latencia p95 | Si sirve para enrutar en el momento |

Y una sección de **errores analizados**: 10 casos mal clasificados con por qué (ambiguos, ironía, dos temas en un mensaje).

## Entregables

- [ ] Prompt versionado y la tabla de resultados por versión.
- [ ] Matriz de confusión y exactitud por categoría.
- [ ] Costo y latencia por 1.000 tickets en al menos dos opciones (local y nube).
- [ ] Decisión de activación: qué se automatiza y qué va a revisión humana.

## Práctica

:::ejercicio cli dificultad=Básico titulo="Los tickets"
Genera el escenario `soporte` con 300 tickets y semilla 88.
```respuesta
todos: generar-datos soporte || --filas 300 || --semilla 88
```
```solucion
generar-datos soporte --filas 300 --semilla 88
```
:::

:::ejercicio cli dificultad=Intermedio titulo="Tickets urgentes"
Con `grep -c`, cuenta los tickets de `~/datos/generados/soporte/tickets.csv` que contienen la palabra `urgente`.
```setup
generar-datos soporte --filas 300 --semilla 88
```
```respuesta
grep -c ['"]?urgente['"]? \S*soporte/tickets\.csv
grep ['"]?urgente['"]? \S*soporte/tickets\.csv \| wc -l
```
```solucion
grep -c urgente ~/datos/generados/soporte/tickets.csv
```
:::

:::ejercicio sql ordenado dificultad=Intermedio titulo="Exactitud por categoría"
`predicciones(ticket_id, categoria, pred_categoria)` tiene la etiqueta real y la del modelo. Calcula por `categoria` real: `tickets`, `aciertos` y `exactitud_pct` (1 decimal), de menor a mayor exactitud.
```sql setup
CREATE TABLE predicciones (ticket_id INTEGER, categoria TEXT, pred_categoria TEXT);
INSERT INTO predicciones VALUES
(1, 'pagos', 'pagos'), (2, 'pagos', 'pagos'), (3, 'pagos', 'cuenta'), (4, 'envios', 'envios'), (5, 'envios', 'envios'), (6, 'envios', 'devoluciones'),
(7, 'envios', 'envios'), (8, 'devoluciones', 'envios'), (9, 'devoluciones', 'devoluciones'), (10, 'garantia', 'garantia'), (11, 'cuenta', 'cuenta'), (12, 'cuenta', 'otro');
```
```sql solucion
SELECT categoria, COUNT(*) AS tickets,
       SUM(CASE WHEN pred_categoria = categoria THEN 1 ELSE 0 END) AS aciertos,
       ROUND(100.0 * SUM(CASE WHEN pred_categoria = categoria THEN 1 ELSE 0 END) / COUNT(*), 1) AS exactitud_pct
FROM predicciones
GROUP BY categoria
ORDER BY exactitud_pct, categoria;
```
:::

:::ejercicio sql ordenado dificultad=Avanzado titulo="La matriz de confusión"
Con la misma tabla, devuelve los **errores**: pares `categoria` (real) y `pred_categoria` distintos, con cuántos casos (`casos`), de más a menos (desempate por categoría).
```sql setup
CREATE TABLE predicciones (ticket_id INTEGER, categoria TEXT, pred_categoria TEXT);
INSERT INTO predicciones VALUES
(1, 'pagos', 'pagos'), (2, 'pagos', 'pagos'), (3, 'pagos', 'cuenta'), (4, 'envios', 'envios'), (5, 'envios', 'envios'), (6, 'envios', 'devoluciones'),
(7, 'envios', 'envios'), (8, 'devoluciones', 'envios'), (9, 'devoluciones', 'devoluciones'), (10, 'garantia', 'garantia'), (11, 'cuenta', 'cuenta'), (12, 'cuenta', 'otro'),
(13, 'devoluciones', 'envios');
```
```sql solucion
SELECT categoria, pred_categoria, COUNT(*) AS casos
FROM predicciones
WHERE pred_categoria <> categoria
GROUP BY categoria, pred_categoria
ORDER BY casos DESC, categoria;
```
```explicacion
"devoluciones" confundidas con "envios" es el error más frecuente: tiene sentido (un paquete dañado es de envíos o de devoluciones según la intención). Se mejora con ejemplos en el prompt o redefiniendo las categorías con el negocio. Y "otro" es una respuesta **fuera de categoría**: hay que validarla y mandarla a revisión.
```
:::

:::ejercicio sql dificultad=Intermedio titulo="El costo por mil tickets"
`uso_llm(ticket_id, tokens_entrada, tokens_salida)` registra los tokens de cada llamada. Con un precio de 0,15 USD por millón de tokens de entrada y 0,60 USD por millón de salida, calcula `costo_por_mil` (USD por cada 1.000 tickets, 4 decimales).
```sql setup
CREATE TABLE uso_llm (ticket_id INTEGER, tokens_entrada INTEGER, tokens_salida INTEGER);
INSERT INTO uso_llm VALUES (1, 420, 30), (2, 390, 28), (3, 510, 31), (4, 450, 29), (5, 400, 32);
```
```sql solucion
SELECT ROUND((AVG(tokens_entrada) * 0.15 / 1000000 + AVG(tokens_salida) * 0.60 / 1000000) * 1000, 4) AS costo_por_mil
FROM uso_llm;
```
```explicacion
Unos 8 centavos de dólar por mil tickets con un modelo chico. Los precios cambian y dependen del modelo: lo importante es medir los tokens reales y presentar el costo con la fórmula, para que se pueda recalcular.
```
:::

:::ejercicio quiz dificultad=Avanzado
El modelo tiene 94 % de exactitud global, pero 61 % en "garantia". ¿Qué haces?

- [ ] Activarlo: 94 % es muy bueno
- [x] Analizar los errores de "garantia", mejorar el prompt (ejemplos, definición) y, mientras tanto, mandar a revisión humana lo que el modelo clasifica como garantía o con baja confianza
- [ ] Eliminar la categoría garantía
- [ ] Cambiar a un modelo más grande sin mirar los errores
:::

:::ejercicio quiz dificultad=Intermedio
¿Por qué se pide la salida en JSON con categorías cerradas?

- [ ] Porque los modelos solo responden en JSON
- [x] Para poder validar cada respuesta, medir la exactitud y detectar las que se salen del formato
- [ ] Para que el modelo sea más rápido
- [ ] Porque es obligatorio en Databricks
:::

:::ejercicio quiz dificultad=Avanzado
Tienes 200.000 tickets etiquetados del último año y una categoría muy estable. ¿Cuándo convendría un modelo clásico (por ejemplo, regresión logística sobre TF-IDF) en lugar de un LLM?

- [ ] Nunca: los LLM siempre son mejores
- [x] Cuando hay muchos datos etiquetados, las categorías no cambian y el volumen es alto: suele ser más barato, más rápido y tan exacto; vale la pena compararlos
- [ ] Solo si no hay internet
- [ ] Cuando los mensajes están en inglés
:::

## Para ir más lejos

- Extraer datos estructurados del mensaje (número de pedido, monto) con `ai_extract` o un prompt con esquema.
- Monitoreo: exactitud semanal sobre una muestra revisada por humanos, para detectar deriva.
