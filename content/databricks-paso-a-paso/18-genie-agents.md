---
titulo: Genie Agents - preguntas en lenguaje natural sobre tus tablas
nivel: 5 · Avanzado
duracion: 45
resumen: Un Genie Agent deja que alguien del negocio pregunte "¿cuánto vendimos por categoría?" y reciba la tabla, el gráfico y el SQL que lo calculó. Crear un agente con pocas tablas bien elegidas, preguntar, leer el SQL generado, y lo que de verdad mejora las respuestas - comentarios en las tablas, instrucciones con el vocabulario del negocio y consultas de ejemplo guardadas. Y cómo evaluarlo antes de dárselo a nadie.
objetivos: Crear un Genie Agent y elegir sus tablas | Leer y validar el SQL de una respuesta | Escribir instrucciones y ejemplos que mejoren las respuestas | Usar la retroalimentación y guardar ejemplos | Evaluar un agente con preguntas de prueba
prerrequisitos: databricks-paso-a-paso-dashboards-y-alertas
autoevaluacion: ¿Sabes por qué pocas tablas es mejor? | ¿Sabes qué hace una instrucción como "ventas = cantidad * precio_unitario"? | ¿Sabes para qué sirve guardar una respuesta como ejemplo? | ¿Sabes qué verificar antes de confiar en una respuesta?
---

:::analogia En palabras simples
Genie es un analista nuevo muy rápido: sabe SQL perfecto pero no conoce tu negocio. Si le das tres tablas bien explicadas y le dices "cuando pregunten ventas, es cantidad por precio", responde bien. Si le das cuarenta tablas sin comentarios, adivina. Tu trabajo es prepararle el escritorio.
:::

## Paso 1 — Crear el agente

Menú **Analytics → Genie Agents → New**:

```captura
archivo: databricks/d18-nuevo.webp
texto: Nombre (1) y las tablas que podrá usar (2) - pedidos, detalle_pedidos y productos
```

Elige **pocas tablas**: las necesarias para las preguntas que esperas. Cada tabla de más es una oportunidad de que una pregunta se responda con la tabla equivocada.

```captura
archivo: databricks/d18-espacio.webp
texto: El espacio - el campo de pregunta (1) y las pestañas Chat y Configure (2)
```

## Paso 2 — Preguntar

Escribe **¿Cuántos pedidos hay por canal?** y después **¿Cuánto vendimos por categoría?**:

```captura
archivo: databricks/d18-chat.webp
texto: La respuesta - tabla, gráfico, el SQL que la calculó, y los botones para calificarla o guardarla como ejemplo
```

Cada respuesta trae el **SQL generado**. Léelo: ¿unió las tablas por la clave correcta? ¿Filtró lo que había que filtrar? ¿Usó la columna que tú usarías? Genie es confiable cuando su SQL es el que escribirías tú.

## Paso 3 — Lo que mejora las respuestas

Pestaña **Configure**:

```captura
archivo: databricks/d18-config.webp
texto: Instrucciones (1) y consultas de ejemplo - pregunta (2) con su SQL correcto (3)
```

| Mejora | Qué hace | Ejemplo |
|---|---|---|
| **Comentarios en tablas y columnas** (lección 15) | Genie los lee para entender qué es cada cosa | `monto`: "importe de la línea, ya con descuento" |
| **Instrucciones** | Vocabulario y reglas del negocio, una por línea | `ventas = cantidad * precio_unitario`, `facturación significa monto`, `pedidos activos = estado distinto de cancelado` |
| **Consultas de ejemplo** | Pregunta + SQL correcto; ante la misma pregunta, usa ese SQL tal cual | "¿Cuánto vendimos por categoría?" con el `JOIN` correcto |
| **Retroalimentación** 👍 👎 | Marca respuestas buenas y malas; **Guardar como ejemplo** convierte una buena en consulta de ejemplo | |

## Paso 4 — Evaluar antes de entregar

Antes de darle el agente al área de ventas:

1. Escribe **10 preguntas** que ellos harían, con la respuesta correcta calculada por ti.
2. Hazlas al agente y compara número por número.
3. Para cada error: ¿falta un comentario? ¿una instrucción? ¿un ejemplo? Corrige y repite.
4. Entrega cuando acierte todas y explica qué **no** sabe responder (lo que no está en sus tablas).

El [módulo de Genie](#/m/genie) del curso profundiza en diseño de espacios, evaluación y límites.

## Paso 5 — Qué no es Genie

- No reemplaza la capa gold ni el dashboard: responde preguntas nuevas, no sustituye el tablero que todos miran igual cada lunes.
- No inventa datos, pero sí puede elegir mal una tabla o una columna: por eso se evalúa.
- Respeta los permisos de Unity Catalog: cada persona ve solo lo que puede ver (incluidos filtros de fila y máscaras, lección 19).

:::errores
- **Darle todas las tablas.** Más tablas, más chances de que use la equivocada.
- **Corregir al usuario en vez de la configuración.** Una instrucción y una consulta de ejemplo enseñan al agente.
- **Entregar sin probar.** Prueba con preguntas cuya respuesta conoces.
:::

## ✅ Lo que lograste

- Creaste un Genie Agent y le preguntaste.
- Sabes leer el SQL de una respuesta y qué configurar para mejorarla.
- Sabes evaluar un agente antes de entregarlo.

:::ejercicio quiz
¿Por qué conviene un Genie Agent con pocas tablas?
- [ ] Porque hay un límite de 3
- [x] Porque con menos tablas hay menos chance de que use la equivocada
- [ ] Porque es más barato
- [ ] Porque Genie solo lee tablas de menos de un millón de filas
:::

:::ejercicio quiz
Alguien pregunta "¿cuánto facturamos?" y Genie suma la columna equivocada. ¿Cuál es la mejor corrección?
- [ ] Decirle al usuario que no pregunte eso
- [x] Agregar una instrucción como "facturación = cantidad * precio_unitario" y una consulta de ejemplo
- [ ] Borrar la columna
- [ ] Crear otro agente
:::

:::ejercicio quiz
¿Qué haces antes de entregar un agente al negocio?
- [ ] Publicarlo y esperar las quejas
- [x] Probarlo con preguntas cuya respuesta conozco y corregir la configuración hasta que acierte
- [ ] Darle todas las tablas
- [ ] Publicarlo como dashboard
:::
