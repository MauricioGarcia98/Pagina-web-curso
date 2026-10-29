---
titulo: El mapa de las certificaciones de Databricks y cómo prepararte
nivel: Intermedio
duracion: 35
resumen: Qué certificaciones de datos e IA ofrece Databricks, cómo es cada examen, qué dominios evalúa y con qué peso, qué cambió en 2026 y un plan de estudio de 6 semanas.
objetivos: Distinguir las certificaciones de Data Engineer, Generative AI Engineer y Machine Learning y elegir por cuál empezar | Explicar el formato de los exámenes (preguntas, tiempo, costo, vigencia) | Repartir el tiempo de estudio según el peso de cada dominio | Reconocer los nombres de productos que cambiaron en 2026 para no confundirte en el examen | Aplicar una estrategia para responder preguntas de escenario
prerrequisitos: databricks-que-es-databricks | databricks-delta-sql
autoevaluacion: ¿Sabes cuántas preguntas y cuántos minutos tiene el examen Data Engineer Associate? | ¿Puedes nombrar los siete dominios del Associate y cuál pesa más? | ¿Sabes qué nombre tienen hoy DLT, Asset Bundles y los modos de acceso Shared/Single User? | ¿Tienes un plan semanal con práctica en un workspace real? | ¿Sabes descartar opciones en una pregunta de escenario?
---

:::escenario
Valentina trabaja hace un año como analista y quiere pasarse a ingeniería de datos. En su empresa usan Databricks en Azure y su jefe le ofrece pagar **una** certificación este trimestre. Duda entre el *Data Engineer Associate*, el *Professional* y el de *IA generativa*, y no sabe cuánto estudiar ni por dónde empezar. Este módulo es su plan: cada lección cubre un dominio del examen con la profundidad necesaria para **dominar la plataforma**, no solo para aprobar.
:::

## Las certificaciones, de un vistazo

Databricks certifica por **rol**. Para datos e IA, las que importan son estas cuatro:

| Certificación | Para quién | Preguntas | Tiempo | Costo | Guía vigente |
|---|---|---|---|---|---|
| **Data Engineer Associate** | Quien construye pipelines en Databricks (0–1 año de experiencia en la plataforma) | 45 puntuadas | 90 min | USD 200 | 4 de mayo de 2026 |
| **Data Engineer Professional** | Ingenieros con experiencia que diseñan, optimizan y operan pipelines en producción | 60 puntuadas | 120 min | USD 200 | 9 de octubre de 2026 |
| **Generative AI Engineer Associate** | Quien construye apps de IA generativa: RAG, agentes, evaluación y despliegue | 45 puntuadas | 90 min | USD 200 | marzo de 2026 |
| **Machine Learning Associate** | Quien entrena, registra y despliega modelos de ML clásicos con MLflow | 48 puntuadas | 90 min | USD 200 | agosto de 2026 |

Detalles comunes a todas:

- **Formato:** preguntas de opción múltiple (una correcta) o de selección múltiple, casi todas **de escenario** ("una empresa necesita…, ¿qué hace el ingeniero?"). Puede haber algunas preguntas extra **sin puntaje** que se usan para calibrar futuras versiones: no sabes cuáles son, así que respondes todas igual.
- **Modalidad:** en línea con supervisión (*proctored*) o en un centro de evaluación. No se permite documentación ni tener nada en el escritorio.
- **Puntaje para aprobar:** Databricks no publica un número fijo; la referencia habitual es alrededor de 70 %. Quien te diga una cifra exacta está adivinando.
- **Vigencia:** 2 años. Para renovar, rindes la versión vigente del examen.
- **Requisitos previos:** ninguno obligatorio. Se recomienda experiencia práctica; para el Professional, haber trabajado en producción.

:::examen Lo que se evalúa de verdad
Las preguntas casi nunca piden memorizar una opción de configuración aislada. Piden **elegir la mejor solución para una situación**: el cómputo más barato que cumple, la forma de ingesta que no reprocesa archivos, el permiso mínimo que alcanza. Por eso este módulo explica siempre el *por qué* de cada opción y cuándo no conviene.
:::

## Data Engineer Associate: los siete dominios

La guía del 4 de mayo de 2026 reorganizó el examen en **siete dominios con peso** (antes eran cinco) y le dio a CI/CD un dominio propio:

| Dominio | Peso | ≈ preguntas (de 45) | Lección de este módulo |
|---|---|---|---|
| Databricks Intelligence Platform | 6 % | 3 | La plataforma por dentro: cómputo y costos |
| Ingesta y carga de datos | 21 % | 9–10 | Ingesta: Auto Loader, COPY INTO y Lakeflow Connect |
| Transformación y modelado | 22 % | 10 | Transformar y modelar: Spark SQL, PySpark y Declarative Pipelines |
| Trabajar con Lakeflow Jobs | 16 % | 7 | Orquestar con Lakeflow Jobs |
| Implementar CI/CD | 10 % | 4–5 | CI/CD: Git folders, Declarative Automation Bundles y CLI |
| Troubleshooting, monitoreo y optimización | 10 % | 4–5 | Optimizar y monitorear |
| Gobierno y seguridad | 15 % | 7 | Gobierno y seguridad con Unity Catalog |

Fíjate en la suma de **ingesta + transformación + jobs: 59 %**. Más de la mitad del examen es construir y orquestar pipelines. Si tienes poco tiempo, ahí va la mayor parte.

## Data Engineer Professional

El Professional asume que ya dominas el Associate y evalúa **decisiones de producción**: rendimiento, costo, seguridad, cómo depurar y cómo desplegar.

La versión de noviembre de 2025 (la que todavía publica la página de la certificación) tenía diez secciones:

| Sección | Peso |
|---|---|
| Desarrollar código de procesamiento con Python y SQL | 22 % |
| Optimización de costo y rendimiento | 13 % |
| Transformación, limpieza y calidad de datos | 10 % |
| Monitoreo y alertas | 10 % |
| Seguridad y cumplimiento | 10 % |
| Depuración y despliegue | 10 % |
| Ingesta y adquisición de datos | 7 % |
| Gobierno de datos | 7 % |
| Modelado de datos | 6 % |
| Compartir y federar datos | 5 % |

Desde el **9 de octubre de 2026** rige una guía nueva de **nueve secciones** y 60 preguntas puntuadas. Según los análisis publicados de esa guía:

- "Compartir y federar" deja de ser una sección y su contenido (Delta Sharing, Lakehouse Federation) pasa a **Ingesta**, que sube a cerca del 12 % y suma CDC con Lakeflow Connect, tablas Iceberg y Clean Rooms.
- "Transformación, limpieza y calidad" pasa a llamarse **Manipulación de datos** (≈12 %) y suma el tipo `VARIANT` y las funciones de IA (`ai_query` y similares).
- **Desarrollar código** queda en ≈23 % y **costo y rendimiento** sube a ≈15 %, con preguntas sobre las tablas de sistema de facturación.

:::cuidado Confirma la guía antes de rendir
Los porcentajes de la guía de octubre de 2026 vienen de análisis publicados de ese documento. La guía oficial se descarga desde la página de cada certificación en databricks.com: léela completa la semana antes del examen, porque Databricks la actualiza varias veces por año.
:::

## Generative AI Engineer Associate

| Sección | Peso | Qué entra |
|---|---|---|
| Diseñar aplicaciones | 14 % | Elegir entre prompt, RAG, agente o multiagente; descomponer un caso de uso en componentes |
| Preparar datos | 14 % | Parsear documentos, *chunking*, embeddings, índices de Vector Search |
| Desarrollar aplicaciones | 30 % | Prompts, herramientas, Agent Framework, MCP, Agent Bricks, LangChain/LangGraph |
| Ensamblar y desplegar | 22 % | Registrar con MLflow en Unity Catalog, Model Serving, pay-per-token vs. provisioned throughput, Databricks Apps |
| Gobierno | 8 % | Permisos de Unity Catalog, AI Gateway, guardrails, datos sensibles |
| Evaluar y monitorear | 12 % | MLflow 3: trazas, jueces LLM (*scorers*), conjuntos de evaluación, monitoreo en producción |

## Machine Learning Associate

Evalúa el ciclo de vida de un modelo clásico en Databricks: explorar y preparar datos, *feature engineering* con tablas de features en Unity Catalog, AutoML, entrenamiento y ajuste de hiperparámetros, MLflow (experimentos, registro de modelos en Unity Catalog, alias) y despliegue (batch, streaming y Model Serving). La guía de marzo de 2025 lo dividía en cuatro dominios (Databricks ML 38 %, desarrollo de modelos 31 %, flujos de ML 19 %, despliegue 12 %); la de agosto de 2026 los reagrupa, con el monitoreo dentro de MLOps.

## Los nombres que cambiaron (y que el examen usa)

Databricks renombró varios productos entre 2025 y 2026. Los exámenes nuevos usan los nombres nuevos, pero mucho material de estudio usa los viejos:

| Nombre actual | Antes se llamaba | Desde |
|---|---|---|
| **Lakeflow Spark Declarative Pipelines** (SDP) | Delta Live Tables (DLT), luego Lakeflow Declarative Pipelines | 2025 |
| **Lakeflow Jobs** | Databricks Workflows / Jobs | 2025 |
| **Lakeflow Connect** | (conectores de ingesta gestionados; parte venía de Arcion) | 2024–2025 |
| **Declarative Automation Bundles** (DAB) | Databricks Asset Bundles (la sigla DAB se mantiene) | marzo de 2026 |
| Modo de acceso **Standard** | *Shared* | 2025 |
| Modo de acceso **Dedicated** | *Single user* (ahora puede asignarse a un grupo) | 2025 |
| **Databricks AI Search** | Mosaic AI Vector Search (el SDK y los objetos conservan el nombre *vector search*) | 2026 |
| API de Python `from pyspark import pipelines as dp` | `import dlt` (sigue funcionando) | 2025 |

:::examen Trampa clásica
Si una opción menciona "Delta Live Tables" y otra "Lakeflow Spark Declarative Pipelines" para lo mismo, no te confundas: es el mismo producto. Las preguntas nuevas usan el nombre nuevo. Lo que sí debes saber distinguir es **qué crea cada decorador**: `@dp.table` crea una *streaming table*, `@dp.materialized_view` una *materialized view* y `@dp.temporary_view` una vista temporal del pipeline.
:::

## Cómo responder preguntas de escenario

Una pregunta típica:

> Un equipo recibe cada hora miles de archivos JSON en una ubicación de almacenamiento en la nube. Necesita cargarlos de forma incremental en una tabla Delta, sin reprocesar archivos ya cargados y tolerando columnas nuevas que aparecen con el tiempo. ¿Qué debe usar?

El método:

1. **Subraya las restricciones**: "incremental", "sin reprocesar", "columnas nuevas", "miles de archivos por hora".
2. **Descarta lo que viola alguna**: un `spark.read.json` programado relee todo; un `INSERT INTO ... SELECT` no lleva registro de archivos procesados.
3. **Entre las que quedan, elige la más gestionada y simple** que cumpla: Databricks casi siempre premia la opción nativa y declarativa sobre la que requiere código a mano. Aquí: **Auto Loader** (`cloudFiles`) con evolución de esquema. `COPY INTO` también es incremental e idempotente, pero para *miles de archivos por hora* y esquema cambiante, Auto Loader escala mejor.
4. **Desconfía de las opciones absolutas** ("siempre", "nunca", "la única forma").

## Plan de estudio de 6 semanas (Associate)

| Semana | Lecciones | Práctica en el workspace |
|---|---|---|
| 1 | Plataforma y cómputo · repaso de Delta Lake y Unity Catalog del módulo Databricks | Crea un SQL warehouse serverless y un clúster; compara su costo en las tablas de sistema |
| 2 | Ingesta | Carga archivos con Auto Loader y con `COPY INTO`; provoca un cambio de esquema |
| 3 | Transformación y Declarative Pipelines | Arma un pipeline bronze → silver → gold con expectativas y AUTO CDC |
| 4 | Lakeflow Jobs · CI/CD | Orquesta el pipeline con un job; despliégalo con un bundle a dev y prod |
| 5 | Optimizar y monitorear · Gobierno | Aplica Liquid Clustering, revisa el query profile, define permisos y un row filter |
| 6 | Examen de práctica de este curso + la guía oficial | Repite el examen hasta superar el 85 %; repasa cada error con su lección |

Para practicar gratis: **Databricks Free Edition** (cómputo serverless limitado, suficiente para todo lo de este módulo) y los cursos gratuitos de **Databricks Academy** asociados a cada examen.

:::trabajo Una certificación no reemplaza la práctica
Los entrevistadores de empresas que usan Databricks preguntan sobre decisiones reales: "¿por qué Auto Loader y no `COPY INTO`?", "¿cuándo usarías un job cluster en vez de serverless?". Si estudias con un workspace abierto y rompes cosas a propósito (borrar un checkpoint, cambiar un esquema), vas a responder eso con ejemplos propios, que es lo que más convence.
:::

## Resumen

| Si quieres… | Rinde | Lecciones clave |
|---|---|---|
| Tu primera certificación de datos | Data Engineer Associate | 2 a 8 |
| Demostrar seniority en producción | Data Engineer Professional | 2 a 9 |
| Trabajar con LLM, RAG y agentes | Generative AI Engineer Associate | 10 a 12 |
| Trabajar con modelos de ML clásicos | Machine Learning Associate | 13 |

## Ejercicios

:::ejercicio quiz
Tienes 3 semanas para preparar el Data Engineer Associate y tu punto más débil es CI/CD. ¿Cómo repartes el tiempo?
- [ ] Una semana entera a CI/CD, porque es tu punto débil, y el resto repartido en partes iguales.
- [x] La mayor parte a ingesta, transformación y Lakeflow Jobs (casi 60 % del examen) y un bloque acotado a CI/CD (10 %).
- [ ] Solo a los dominios que ya dominas, para asegurar esas preguntas.
- [ ] Partes iguales a los siete dominios, porque todos tienen la misma cantidad de preguntas.
```explicacion
El peso manda: ingesta (21 %), transformación (22 %) y jobs (16 %) suman 59 % del examen. CI/CD vale 10 %: conviene cubrirlo, pero no a costa de los dominios que dan más puntos.
```
:::

:::ejercicio quiz
Un material de estudio dice "crea la tabla con `import dlt` y el decorador `@dlt.table`". En el examen de 2026 aparece `from pyspark import pipelines as dp`. ¿Qué es cierto?
- [ ] Son productos distintos: DLT fue reemplazado por otro motor incompatible.
- [x] Es el mismo producto con el nombre y la API nuevos (Lakeflow Spark Declarative Pipelines); el código con `dlt` sigue funcionando.
- [ ] `dp` solo sirve para Apache Spark de código abierto, no en Databricks.
- [ ] `import dlt` dejó de funcionar en 2026 y hay que migrar todo el código.
```explicacion
DLT pasó a llamarse Lakeflow Spark Declarative Pipelines. La API nueva es `from pyspark import pipelines as dp`, pero el código viejo con `import dlt` sigue funcionando sin migración.
```
:::

:::ejercicio quiz
Una pregunta pide "la forma más simple de cargar de manera incremental miles de archivos nuevos por hora, sin reprocesar los ya cargados". Una opción usa `spark.read.json` en un job programado cada hora. ¿Por qué la descartas?
- [ ] Porque `spark.read.json` no puede leer desde almacenamiento en la nube.
- [x] Porque relee todos los archivos en cada ejecución: no lleva registro de lo ya procesado.
- [ ] Porque los jobs no se pueden programar cada hora.
- [ ] Porque `spark.read.json` no soporta archivos con varias líneas.
```explicacion
Una lectura batch común no recuerda qué archivos ya cargó. Auto Loader y `COPY INTO` sí lo hacen (con un checkpoint o con metadatos de la tabla), por eso son la respuesta en escenarios incrementales.
```
:::

:::ejercicio quiz
¿Cuál de estas afirmaciones sobre los exámenes de Databricks es correcta?
- [ ] El puntaje de aprobación oficial es exactamente 70 % y está publicado en la guía.
- [ ] Las certificaciones no vencen nunca.
- [x] Pueden incluir preguntas sin puntaje que no sabes cuáles son, así que respondes todas con el mismo cuidado.
- [ ] Puedes consultar la documentación de Databricks durante el examen.
```explicacion
Databricks no publica una nota de corte exacta, las certificaciones duran 2 años y el examen es supervisado, sin documentación. Las preguntas sin puntaje sirven para calibrar versiones futuras.
```
:::

:::ejercicio abierto
Escribe tu plan de estudio personal de 6 semanas para la certificación que elegiste: qué lecciones ves cada semana, qué vas a practicar en el workspace y qué día vas a rendir el examen de práctica.
```text solucion
Ejemplo para el Data Engineer Associate:
Semana 1: plataforma y cómputo; crear un SQL warehouse serverless y mirar system.billing.usage.
Semana 2: ingesta; Auto Loader y COPY INTO con un cambio de esquema provocado.
Semana 3: transformación y Declarative Pipelines; pipeline bronze → silver → gold con expectativas y AUTO CDC.
Semana 4: Lakeflow Jobs y CI/CD; job con dependencias y bundle desplegado a dev y prod.
Semana 5: optimización y gobierno; Liquid Clustering, query profile, GRANT y un row filter.
Semana 6: examen de práctica dos veces (lunes y jueves), repaso de cada error y lectura completa de la guía oficial; examen real el sábado.
```
:::
