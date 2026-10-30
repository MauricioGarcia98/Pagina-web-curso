---
titulo: El mapa de las certificaciones de datos e IA de Google Cloud
nivel: Intermedio
duracion: 30
resumen: Las certificaciones de Google Cloud para datos e IA (Professional Data Engineer, Associate Data Practitioner, Professional Machine Learning Engineer y Generative AI Leader), cómo son los exámenes, los nombres nuevos de 2026, cómo pensar las preguntas de Google y un plan de estudio.
objetivos: Elegir la certificación de Google Cloud adecuada para un rol de datos o de IA | Describir el formato de los exámenes y su renovación | Reconocer los nombres de productos renombrados en 2026 | Aplicar una estrategia para las preguntas de caso
prerrequisitos: gcp-gcp-para-datos
autoevaluacion: ¿Sabes qué certificación de Google corresponde a un ingeniero de datos? | ¿Sabes cuánto dura y cuánto cuesta un examen Professional? | ¿Sabes cómo se llama hoy Vertex AI? | ¿Sabes qué prioriza Google en sus respuestas correctas?
---

:::escenario
Valentina trabaja en una cadena de supermercados que migró su analítica a Google Cloud: BigQuery, Dataflow y un asistente de compras con Gemini. Quiere certificarse y su jefe le pregunta qué certificación aporta más al equipo. Este módulo le muestra el mapa y la prepara para las cuatro.
:::

## Las certificaciones

| Certificación | Nivel | Para quién |
|---|---|---|
| **Professional Data Engineer (PDE)** | Professional | Ingenieros de datos: diseñar, construir, operar, asegurar y monitorear sistemas de datos |
| **Associate Data Practitioner (ADP)** | Associate | Perfiles iniciales de datos: ingesta, análisis, orquestación y gestión básica en Google Cloud |
| **Professional Machine Learning Engineer (PMLE)** | Professional | Ingenieros de ML: construir, evaluar, poner en producción y optimizar modelos, incluida la IA generativa |
| **Generative AI Leader** | Fundamental | Líderes y perfiles de negocio: estrategia de IA generativa y la oferta de Google Cloud, sin programar |

## Formato

| | Professional (PDE, PMLE) | Associate (ADP) | Generative AI Leader |
|---|---|---|---|
| Preguntas | 50–60 | 50–60 | 50–60 |
| Tiempo | 2 horas | 2 horas | 90 minutos |
| Costo | USD 200 | USD 125 | USD 99 |
| Vigencia | 2 años | 3 años | 3 años |

- Preguntas de **opción única** y **selección múltiple**; en PDE y PMLE muchas son **escenarios** de empresas.
- Google **no publica el puntaje de aprobación**: el resultado es aprobado o no aprobado.
- Los Professional ofrecen un **examen de renovación** más corto (unas 20 preguntas, 1 hora) en los últimos meses de vigencia.
- Google no publica pesos oficiales para todas las secciones: los porcentajes que se ven en este módulo son **aproximados**, tomados de las guías y de fuentes de preparación, y sirven para repartir el estudio, no como dato exacto.

## Nombres nuevos en 2026

| Antes | Ahora |
|---|---|
| **Vertex AI** | **Gemini Enterprise Agent Platform** (los componentes siguen: Pipelines, Feature Store, Model Registry, AutoML, Model Garden, Agent Builder) |
| Data Catalog / Dataplex Universal Catalog | **Knowledge Catalog** (dentro de Dataplex) |
| Cloud DLP | **Sensitive Data Protection** |
| Agentspace | **Gemini Enterprise** |

:::cuidado Las guías mezclan nombres
Durante la transición, las preguntas y la documentación pueden usar el nombre viejo o el nuevo. Aprende los dos.
:::

## Cómo piensa Google en las preguntas

| Si la pregunta dice… | Suele premiar |
|---|---|
| "**serverless**", "**sin administrar infraestructura**", "**menor esfuerzo operativo**" | BigQuery, Dataflow, Pub/Sub, Cloud Run, servicios administrados por sobre Dataproc o VMs |
| "**migrar Hadoop/Spark existente con cambios mínimos**" | **Dataproc** (o Dataproc Serverless) |
| "**escala global con consistencia fuerte**" | **Spanner** |
| "**millones de escrituras por segundo con baja latencia**" | **Bigtable** |
| "**más barato**" | Particionar y agrupar en BigQuery, clases de Cloud Storage, precios por slots, apagar recursos |
| "**seguro**" | IAM con mínimos privilegios, cuentas de servicio, CMEK, VPC Service Controls |

**Método**: identifica la restricción principal (latencia, escala, costo, administración), descarta lo que no la cumple y elige lo más administrado. Google valora las soluciones nativas antes que armar piezas a mano.

```recorrido
titulo: Una pregunta del PDE resuelta con el método
estacion preg: El escenario | icono=documento
estacion restr: La restricción | icono=lupa
estacion desc: Descartar | icono=x
estacion elegir: Elegir | icono=check
paso preg: La pregunta (ejemplo de práctica)
Un escenario con volumen, latencia y una preferencia por lo administrado.
>>> texto
Millones de dispositivos envían eventos por segundo. El equipo de negocio
quiere analizarlos con SQL a los pocos segundos de que ocurren, y la empresa
NO QUIERE ADMINISTRAR INFRAESTRUCTURA. ¿Qué arquitectura eliges?

A. Kafka en Compute Engine → Spark en Dataproc → Cloud SQL
B. Pub/Sub → Dataflow → BigQuery
C. Cloud Storage → carga diaria con bq load → BigQuery
D. Pub/Sub → VMs con un consumidor propio → Bigtable
paso restr: Identificar las restricciones
Tres: **escala** (millones por segundo), **segundos** de latencia, **sin administrar**.
>>> texto
escala: alta · latencia: segundos · operación: administrada · consulta: SQL
paso desc: Descartar
Cada opción incorrecta viola al menos una restricción.
>>> tabla
opción,qué viola
A,administrar Kafka y clústeres; Cloud SQL no escala para análisis
C,carga diaria: horas de latencia
D,VMs propias; Bigtable no es para SQL analítico
paso elegir: La solución nativa y administrada
Pub/Sub recibe los eventos, Dataflow los procesa en streaming y BigQuery los deja consultables con SQL en segundos. Todo serverless.
>>> texto
Respuesta: B
```

## Plan de estudio para PDE (6 semanas)

| Semana | Tema | Práctica (crédito gratuito o sandbox de BigQuery) |
|---|---|---|
| 1 | Diseño y almacenamiento: Cloud Storage, BigQuery, Bigtable, Spanner, AlloyDB | Tabla particionada y agrupada en BigQuery |
| 2 | Ingesta: Pub/Sub, Dataflow, Datastream, Storage Transfer | Plantilla de Dataflow de Pub/Sub a BigQuery |
| 3 | Transformación y orquestación: Dataform, Composer, Dataproc | Repositorio de Dataform con pruebas |
| 4 | Análisis e IA: BigQuery ML, BI Engine, Looker, Analytics Hub | Modelo de BigQuery ML y predicción |
| 5 | Seguridad, gobierno y operación: IAM, CMEK, Knowledge Catalog, Sensitive Data Protection, monitoreo | Política de etiquetas en una columna |
| 6 | Exámenes de práctica de este curso y el oficial | Repaso de errores |

## Ejercicios

:::ejercicio quiz
Una pregunta pide migrar trabajos de Spark que ya corren en un clúster Hadoop on-premises "con la menor cantidad de cambios". ¿Qué servicio suele ser la respuesta?
- [ ] BigQuery, reescribiendo los trabajos en SQL.
- [x] Dataproc.
- [ ] Dataflow, reescribiendo los trabajos con Apache Beam.
- [ ] Cloud Run con contenedores de Spark.
```explicacion
Dataproc ejecuta Spark y Hadoop administrados, por lo que los trabajos existentes migran con cambios mínimos.
```
:::

:::ejercicio quiz
¿Cómo se llama desde 2026 la plataforma que antes era Vertex AI?
- [ ] Gemini Enterprise.
- [x] Gemini Enterprise Agent Platform.
- [ ] Knowledge Catalog.
- [ ] Agentspace.
```explicacion
Vertex AI pasó a llamarse Gemini Enterprise Agent Platform. Gemini Enterprise es el antiguo Agentspace.
```
:::

:::ejercicio quiz
¿Qué puntaje mínimo publica Google para aprobar el Professional Data Engineer?
- [ ] 700 sobre 1000.
- [ ] 720 sobre 1000.
- [x] Ninguno: el resultado es aprobado o no aprobado.
- [ ] 70 %.
```explicacion
Google no publica el puntaje de corte; solo informa si se aprobó.
```
:::
