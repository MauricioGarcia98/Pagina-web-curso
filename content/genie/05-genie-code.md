---
titulo: "Genie Code: el asistente de código dentro de Databricks"
nivel: Intermedio
duracion: 45
resumen: Qué es Genie Code (antes Databricks Assistant) y cómo usarlo bien - el panel de chat, la ayuda dentro de la celda con Cmd+I, los comandos /explain, /fix, /doc, /optimize, /findTables y /findQueries, Quick Fix y Diagnose Error, las instrucciones personales y del workspace, qué datos envía al modelo, el costo y cómo revisar lo que genera.
objetivos: Usar Genie Code para escribir, explicar y corregir código en un notebook | Elegir el comando adecuado para cada tarea | Escribir instrucciones personales útiles | Revisar críticamente el código generado | Explicar qué datos se envían y qué permisos usa
prerrequisitos: genie-que-es-genie | databricks-notebooks-dbutils
autoevaluacion: ¿Sabes qué hace /fix y por qué no ejecuta el código solo? | ¿Sabes dónde se escriben tus instrucciones personales? | ¿Sabes con qué permisos accede Genie Code a los datos?
---

:::escenario
Estás armando el notebook de la capa silver y te aparece `[CAST_INVALID_INPUT] The value 'N/A' cannot be cast to "DOUBLE"`. Podrías buscar el error en internet, o podrías preguntarle a un asistente que **ya conoce tus tablas, tus columnas y el error exacto de la celda**. Eso es Genie Code. Pero como todo asistente, propone; la responsabilidad de revisar sigue siendo tuya.
:::

## Qué es y en qué se diferencia de Genie Agents

**Genie Code** (antes *Databricks Assistant*) es el asistente para **personas técnicas**: genera y ejecuta código, explica, corrige errores, arma pipelines y tableros, y trabaja con las tablas y columnas de Unity Catalog. La documentación lo describe como un **agente autónomo**: planifica, busca contexto, ejecuta código, mira el resultado de las celdas y corrige errores.

| | Genie Agents | Genie Code |
|---|---|---|
| Para quién | Personas de negocio | Ingenieros, analistas, científicos de datos |
| Qué produce | Respuestas a preguntas (tablas, gráficos) | Código (Python, SQL), pipelines, tableros |
| Dónde se usa | Genie One, el chat del agente | Notebooks, editor de SQL, Lakeflow, tableros, editor de archivos |
| Quién lo configura | El equipo de datos, por tema | Cada usuario (y el admin, con instrucciones del workspace) |

## Dónde aparece y cómo se usa

- **El panel de Genie Code**: el ícono arriba a la derecha del workspace abre un chat al costado. También hay una vista de página completa para trabajar desde Genie Code con varios chats.
- **Dentro de una celda**: **Cmd+I** (macOS) o **Ctrl+I** (Windows) abre un cuadro de texto en la celda. Escribes lo que quieres y presionas **Enter** (no Shift+Enter, que ejecuta la celda).
- **Autocompletado**: sugerencias en línea mientras escribes.
- **Quick Fix**: cuando una celda falla con un error simple, propone el arreglo de una línea; **Accept and run** lo aplica y ejecuta.
- **Diagnose Error**: para errores más complejos (incluidos los del entorno), analiza y propone una solución.

### Los comandos con barra (/)

Escribir `/` muestra los comandos frecuentes. Según la documentación:

| Comando | Qué hace |
|---|---|
| `/explain` | Explica el código de la celda. Puedes agregar "explica línea por línea" o "sé breve" |
| `/fix` | Propone una corrección de los errores, en una vista de diferencias |
| `/doc` | Agrega comentarios al código, en una vista de diferencias |
| `/optimize` | Sugiere mejoras de rendimiento para una consulta SQL |
| `/prettify` | Da formato a una consulta SQL para que se lea mejor |
| `/findTables` | Busca tablas relevantes según la metadata de Unity Catalog |
| `/findQueries` | Busca consultas relevantes según la metadata de Unity Catalog |

Con `/fix` y `/doc` ves el cambio propuesto y eliges **Accept** o **Reject**. Aunque aceptes, **el código no se ejecuta solo**: lo revisas y lo ejecutas tú.

```recorrido
titulo: Una celda que falla y /fix, paso a paso
estacion celda: La celda | icono=codigo
estacion error: El error | icono=x
estacion fix: /fix | icono=genie
estacion revisar: Revisar | icono=lupa
estacion ok: Ejecutar | icono=check
paso celda: Convertir una columna de texto
En la capa silver, una celda convierte el monto a número.
>>> python
silver = bronze.withColumn("monto", F.col("monto_texto").cast("double"))
silver.write.mode("overwrite").saveAsTable("main.silver.ventas")
paso error: Falla con un error de Spark 4
Con ANSI activo, un valor `N/A` hace fallar la conversión.
>>> log
[CAST_INVALID_INPUT] The value 'N/A' of the type "STRING" cannot be cast to "DOUBLE"
because it is malformed.
paso fix: Pedirle a Genie Code que lo arregle
Escribes `/fix` (o usas **Diagnose Error**). Genie Code ve el código, el error y el esquema de la tabla, y propone el cambio en una **vista de diferencias**.
>>> texto
- silver = bronze.withColumn("monto", F.col("monto_texto").cast("double"))
+ silver = bronze.withColumn("monto", F.col("monto_texto").try_cast("double"))
paso revisar: Revisar antes de aceptar
La propuesta evita el error, pero `try_cast` convierte `N/A` en `NULL` **en silencio**. Falta contar cuántos valores se pierden: eso lo decides tú, no el asistente.
>>> python
invalidos = silver.filter(F.col("monto_texto").isNotNull() & F.col("monto").isNull()).count()
print(f"montos no convertibles: {invalidos}")
paso ok: Aceptar, completar y ejecutar
**Accept** pone el cambio en la celda, pero no la ejecuta: la ejecutas tú, ya con el conteo agregado.
>>> log
montos no convertibles: 1
(tabla main.silver.ventas escrita)
```

## Cómo pedir bien

Genie Code usa la metadata de Unity Catalog (nombres, descripciones, tablas populares) para dar respuestas personalizadas. Igual que con Genie Agents, **cuanto mejor documentadas tus tablas, mejores respuestas**. Algunos ejemplos de pedidos concretos:

```text
Lee main.default.pedidos_crudos, convierte fecha_pedido a timestamp con try_cast,
descarta las filas sin pedido_id y quédate con la carga más reciente de cada pedido
(columna cargado_en). Guarda el resultado en main.default.pedidos_silver.
```

```text
/explain explica línea por línea y menciona qué pasa con los valores nulos
```

```text
Esta consulta tarda 4 minutos sobre una tabla de 200 millones de filas. /optimize
```

Un pedido concreto (qué tabla, qué columnas, qué regla, dónde guardar) da mucho mejor resultado que "limpia los datos".

## Instrucciones personales y del workspace

Puedes darle a Genie Code instrucciones **permanentes**, que aplica en todas sus respuestas:

- **Instrucciones de usuario**: en el panel de Genie Code → configuración → **User instructions** → **Add instructions file**. Se crea el archivo `.assistant_instructions.md` en tu carpeta de usuario (`/Users/<tu-usuario>`).
- **Instrucciones del workspace**: las define un administrador para todos; si chocan, Genie Code suele priorizar las del workspace.
- Además, lee los archivos **`AGENTS.md`** y **`CLAUDE.md`** que encuentre en las carpetas del workspace, subiendo desde el notebook o archivo abierto.

Un ejemplo de instrucciones personales útiles:

```markdown
- Escribo en PySpark; usa la API de DataFrames, nunca RDDs.
- Para convertir tipos usa try_cast y cuenta los valores inválidos.
- Nombres de tablas siempre con tres partes: catalogo.esquema.tabla.
- Explica en español y de forma breve.
- Mi equipo usa el año fiscal que empieza el 1 de febrero.
```

Genie Code también puede **recordar** cosas que le pidas mientras trabajas (su memoria es aparte de este archivo).

## Datos, permisos y costo

- **Permisos**: Genie Code está gobernado por tus permisos de Unity Catalog: solo accede a datos y hace operaciones que tú podrías hacer.
- **Qué envía al modelo**: tu pedido y el contexto relevante, que puede incluir nombres y descripciones de tablas y columnas, el código, **muestras de datos** y salidas de celdas, siempre dentro de tus permisos. Tenlo en cuenta si trabajas con datos sensibles.
- **Requisitos**: las funciones de IA de terceros (*partner-powered AI features*) habilitadas en la cuenta y el workspace; si están desactivadas, Genie Code funciona sin sus capacidades de agente, con un modelo alojado por Databricks.
- **Costo**: desde el 8 de julio de 2026, cada usuario tiene una cantidad gratuita mensual y lo que pase de eso se cobra en DBU según el uso del modelo.

## Revisar lo que genera

La documentación recomienda **revisar siempre** el código antes de ejecutarlo, porque puede equivocarse. Una lista práctica:

1. ¿Usa las tablas correctas, con nombres de tres partes?
2. ¿Respeta las reglas de negocio (cancelados, moneda, zona horaria)?
3. ¿Qué hace con los nulos y los datos inválidos? ¿Usa `try_cast` o un `cast` que va a fallar?
4. ¿Es idempotente si se ejecuta dos veces (overwrite, MERGE) o duplica?
5. ¿Trae datos grandes al driver (`collect()`, `toPandas()`)?
6. ¿Lo entiendes línea por línea? Si no, `/explain` antes de ejecutarlo.

:::errores
- **Aceptar y ejecutar sin leer**: el código puede funcionar y hacer otra cosa (por ejemplo, sobrescribir la tabla equivocada).
- **Pedidos vagos** ("arregla esto"): resultados genéricos. Di tabla, columnas, regla y destino.
- **Pegar datos sensibles en el chat**: no hace falta; Genie Code ya ve las tablas con tus permisos.
- **No escribir instrucciones personales** y corregir lo mismo en cada pedido.
- **Confundirlo con un Genie Agent**: Genie Code ayuda a programar; las preguntas de negocio van a un agente.
:::

:::trabajo
- En los equipos, Genie Code se usa a diario para tareas repetitivas: explorar una tabla nueva, escribir la primera versión de una transformación, explicar código heredado, documentar con `/doc` y optimizar consultas lentas.
- Las instrucciones del workspace son una forma de que todo el equipo siga las mismas convenciones (nombres, librerías, estilo).
- El código generado pasa por el mismo proceso que el escrito a mano: Git, pull request, revisión y tests.
:::

:::entrevista "¿Cómo usas un asistente de IA para programar sin bajar la calidad del código?"
Lo uso para acelerar, no para decidir: le doy pedidos concretos con las tablas, las reglas y el destino, y defino instrucciones permanentes con las convenciones del equipo. Reviso cada propuesta antes de ejecutarla, en especial reglas de negocio, nulos, idempotencia y rendimiento, y le pido que explique lo que no entiendo. El código generado pasa por pull request y tests como cualquier otro, y tengo en cuenta qué datos se envían al modelo.
:::

## Ejercicios

:::ejercicio quiz dificultad=Básico
Una celda de PySpark falla con un error. ¿Qué comando propone la corrección en una vista de diferencias?

- [ ] `/explain`
- [x] `/fix`
- [ ] `/prettify`
- [ ] `/findTables`
:::

:::ejercicio quiz dificultad=Intermedio
Aceptaste la corrección propuesta por `/fix`. ¿Qué pasa después?

- [ ] El código se ejecuta solo
- [x] El código queda en la celda pero no se ejecuta: lo revisas y lo ejecutas tú
- [ ] Se crea un job
- [ ] Se guarda en Git automáticamente
:::

:::ejercicio quiz dificultad=Intermedio
¿Con qué permisos lee los datos Genie Code?

- [ ] Con los de un administrador
- [x] Con tus permisos de Unity Catalog: solo puede hacer lo que tú podrías hacer
- [ ] Con los del autor del notebook
- [ ] Sin permisos: lee todo
:::

:::ejercicio quiz dificultad=Básico
¿Dónde se guardan tus instrucciones personales de Genie Code?

- [ ] En el clúster
- [x] En el archivo `.assistant_instructions.md` de tu carpeta de usuario del workspace
- [ ] En Unity Catalog
- [ ] En el navegador
:::

:::ejercicio quiz dificultad=Intermedio
Estás en una tabla que no conoces y quieres saber qué otras tablas de Unity Catalog tienen datos de clientes. ¿Qué comando usas?

- [ ] `/doc`
- [ ] `/optimize`
- [x] `/findTables`
- [ ] `/fix`
:::
