---
titulo: El mapa de las certificaciones de datos e IA de AWS
nivel: Intermedio
duracion: 30
resumen: Las certificaciones de AWS para datos e IA en 2026 (DEA-C01, AIF-C01, MLA-C02 y AIP-C01), las que se retiraron, cómo es un examen de AWS, cómo se califica, cómo pensar las preguntas de "el servicio correcto" y un plan de estudio.
objetivos: Elegir la certificación de AWS adecuada para un rol de datos o de IA | Explicar el formato y la calificación de los exámenes de AWS | Repartir el estudio según el peso de cada dominio | Aplicar una estrategia para preguntas que piden la solución "más rentable" o "con menos esfuerzo operativo"
prerrequisitos: aws-aws-para-datos
autoevaluacion: ¿Sabes qué certificación de AWS corresponde a un ingeniero de datos? | ¿Sabes qué reemplazó a la ML Specialty? | ¿Sabes cuántos puntos se necesitan para aprobar un examen Associate? | ¿Sabes qué significa "menor esfuerzo operativo" en una pregunta de AWS?
---

:::escenario
Tomás es ingeniero de datos en una empresa de logística que corre todo en AWS: un lago en S3, Glue, Redshift y, desde este año, un asistente con Amazon Bedrock. Su empresa le paga la certificación que quiera. Este módulo le muestra cuál elegir y lo prepara dominio por dominio.
:::

## Las certificaciones de datos e IA

| Certificación | Código | Nivel | Para quién |
|---|---|---|---|
| **Data Engineer – Associate** | **DEA-C01** | Associate | Ingenieros de datos: ingesta, almacenamiento, operación y gobierno en AWS |
| **AI Practitioner** | **AIF-C01** | Fundamental | Cualquier rol que trabaje con IA: conceptos de ML, IA generativa, IA responsable y servicios de AWS |
| **Machine Learning Engineer – Associate** | **MLA-C02** (antes MLA-C01) | Associate | Ingenieros de ML: preparar datos, entrenar, desplegar y operar con SageMaker AI |
| **Generative AI Developer – Professional** | **AIP-C01** | Professional | Desarrolladores de aplicaciones de IA generativa con Amazon Bedrock |

Cambios recientes:

- **Machine Learning – Specialty (MLS-C01)** se retiró el **31 de marzo de 2026**. Su contenido se reparte entre MLA y AIP.
- **MLA-C01** se pudo rendir hasta el **28 de septiembre de 2026**; lo reemplaza **MLA-C02**, en beta desde fines de septiembre de 2026, con **los mismos dominios** y servicios actualizados.
- **DEA-C01** sigue vigente; su guía **versión 1.1** (12 de diciembre de 2025) unificó conocimientos y habilidades en una sola lista por tarea y agregó temas nuevos: tablas Apache Iceberg y S3 Tables, procesamiento de datos asistido por LLM, vectorización con Amazon Bedrock Knowledge Bases, tipos de índices vectoriales (HNSW e IVF) y gobierno con Amazon SageMaker Unified Studio y Catalog.

## Cómo es un examen de AWS

| | Associate (DEA, MLA) | Fundamental (AIF) | Professional (AIP) |
|---|---|---|---|
| Preguntas | 65 (50 puntuadas + 15 sin puntaje) | 65 (50 + 15) | 75 (65 + 10) |
| Tiempo | 130 minutos | 90 minutos | 180 minutos |
| Costo | USD 150 | USD 100 | USD 300 |
| Para aprobar | 720 / 1000 | 700 / 1000 | 750 / 1000 |
| Vigencia | 3 años | 3 años | 3 años |

- **Tipos de pregunta**: opción única, respuesta múltiple (elegir 2 o 3) y, en las versiones nuevas, **ordenar**, **emparejar** y **casos de estudio**.
- **Calificación compensatoria**: no hay que aprobar cada dominio, sino el total escalado.
- Las preguntas sin puntaje no se distinguen: hay que responder todo.
- Al aprobar un examen de AWS se obtiene un **cupón de 50 %** para el siguiente.

## Los dominios

**DEA-C01**

| Dominio | Peso | Lección |
|---|---|---|
| Ingesta y transformación de datos | 34 % | Ingesta y transformación en AWS |
| Administración del almacén de datos | 26 % | Almacenamiento: S3, Redshift, DynamoDB y el catálogo |
| Operación y soporte de datos | 22 % | Operación, monitoreo, seguridad y gobierno |
| Seguridad y gobierno de datos | 18 % | Operación, monitoreo, seguridad y gobierno |

**AIF-C01**: fundamentos de IA y ML (20 %), fundamentos de IA generativa (24 %), aplicaciones de modelos fundacionales (28 %), IA responsable (14 %), seguridad, cumplimiento y gobierno (14 %).

**MLA-C02**: preparación de datos para ML (28 %), desarrollo de modelos (26 %), despliegue y orquestación de flujos de ML (22 %), monitoreo, mantenimiento y seguridad (24 %).

**AIP-C01**: integración de modelos fundacionales, gestión de datos y cumplimiento (31 %), implementación e integración (26 %), seguridad y gobierno de IA (20 %), eficiencia operativa y optimización (12 %), pruebas, validación y resolución de problemas (11 %).

## La estrategia para preguntas de AWS

Las preguntas describen un escenario y terminan con un **criterio**:

| Si la pregunta dice… | Suele premiar |
|---|---|
| "**menor esfuerzo operativo**" (*least operational overhead*) | El servicio **administrado o serverless** que resuelve sin código propio: Glue en vez de EMR, Athena en vez de un clúster, Firehose en vez de un consumidor propio |
| "**más rentable**" (*most cost-effective*) | Pagar por uso, clases de almacenamiento baratas, apagar lo que no se usa, Spot, formatos columnares |
| "**menor latencia**" o "**en tiempo real**" | Streaming (Kinesis Data Streams, MSK), DynamoDB, cachés |
| "**más seguro**" | Cifrado con KMS, permisos mínimos, endpoints de VPC, Lake Formation, Secrets Manager |

Método: subraya el criterio y las restricciones, descarta lo que viola alguna, y entre lo que queda elige lo más gestionado. Si dos opciones cumplen, la que requiere menos piezas suele ser la correcta.

## Plan de 6 semanas para DEA-C01

| Semana | Tema | Práctica en una cuenta gratuita |
|---|---|---|
| 1 | Ingesta por lotes: Glue, DMS, AppFlow | Crawler sobre S3, job de Glue que convierte CSV a Parquet |
| 2 | Streaming y orquestación: Kinesis, Firehose, MSK, Step Functions, MWAA, EventBridge | Firehose a S3 con conversión a Parquet |
| 3 | Almacenamiento: S3, Redshift, DynamoDB, Iceberg | Tabla Iceberg consultada desde Athena; claves de Redshift |
| 4 | Operación: Athena, CloudWatch, calidad de datos | Workgroup de Athena con límites; Glue Data Quality |
| 5 | Seguridad y gobierno: IAM, KMS, Lake Formation, Macie | Permisos por columna con Lake Formation |
| 6 | Examen de práctica de este curso y el oficial de AWS Skill Builder | Repaso de cada error |

:::trabajo Presupuesto de laboratorio
Practica con **AWS Budgets** configurado (por ejemplo, USD 10) y borra todo al terminar cada sesión, sobre todo clústeres de Redshift aprovisionados, EMR y endpoints de SageMaker, que cobran por hora aunque no se usen.
:::

## Ejercicios

:::ejercicio quiz
Una pregunta pide "la solución con el **menor esfuerzo operativo**" para transformar archivos CSV de S3 a Parquet cada noche. Dos opciones funcionan: un clúster de EMR con un script de Spark y un job de AWS Glue. ¿Cuál eliges?
- [ ] EMR, porque da más control sobre la configuración de Spark.
- [x] Glue, porque es serverless y no hay clúster que administrar.
- [ ] Ambas son igual de correctas para ese criterio.
- [ ] Ninguna: el criterio pide una función Lambda.
```explicacion
"Menor esfuerzo operativo" premia lo administrado y serverless. Glue ejecuta Spark sin administrar clústeres.
```
:::

:::ejercicio quiz
Quieres certificar conocimientos de ML en AWS y la ML Specialty ya no se puede rendir. ¿Qué certificación la reemplaza para un ingeniero de ML?
- [x] Machine Learning Engineer – Associate (MLA-C02).
- [ ] Data Engineer – Associate (DEA-C01).
- [ ] Cloud Practitioner.
- [ ] Solutions Architect – Associate.
```explicacion
La ML Specialty se retiró el 31 de marzo de 2026. Para ingenieros de ML, la certificación es MLA (hoy MLA-C02); para IA generativa, AIP-C01.
```
:::

:::ejercicio quiz
En un examen Associate de AWS sacaste 735 puntos. ¿Aprobaste?
- [x] Sí: el mínimo es 720 sobre 1000.
- [ ] No: el mínimo es 750 sobre 1000.
- [ ] Depende de si aprobaste cada dominio por separado.
- [ ] No se sabe hasta que AWS publique el corte de ese mes.
```explicacion
Los exámenes Associate se aprueban con 720. La calificación es compensatoria: no hace falta aprobar cada dominio.
```
:::
