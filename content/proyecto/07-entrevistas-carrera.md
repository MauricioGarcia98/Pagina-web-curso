---
titulo: Entrevistas, diseño de sistemas y tu plan de carrera
nivel: Experto
duracion: 40
resumen: Cómo son las entrevistas de Data Engineer, preguntas de diseño, checklist de conocimientos y cómo seguir creciendo.
---

## Cómo es un proceso de selección típico

1. **Filtro inicial**: CV y conversación con RR. HH.
2. **Prueba técnica de SQL** (casi siempre): joins, agregaciones, ventanas, CTEs — ¡ya practicaste decenas!
3. **Python / PySpark**: manipular datos, estructuras de datos, a veces un pequeño ETL.
4. **Diseño de sistemas de datos**: “diseña el pipeline para…”.
5. **Conductual**: proyectos pasados, trabajo en equipo, cómo manejas un incidente.

## Preguntas de diseño frecuentes (y qué esperan oír)

:::entrevista “Diseña un pipeline que ingiera 50 GB diarios de eventos de una app y alimente un tablero”
Habla de: **ingesta** (Event Hubs/Kafka → Auto Loader o Structured Streaming), **almacenamiento** (Delta en ADLS, medallón), **procesamiento** incremental e idempotente, **modelado** gold (estrella), **orquestación** (Workflows/Airflow), **calidad** (tests, cuarentena, alertas), **costos** (job clusters, autoscaling, clustering) y **gobierno** (Unity Catalog). Pregunta por latencia requerida (¿minutos u horas?) antes de elegir streaming.
:::

:::entrevista “Un job que tardaba 20 minutos ahora tarda 3 horas. ¿Qué haces?”
Método: revisar qué cambió (volumen, código, datos), mirar la **Spark UI** (stage lento, skew, spill, shuffle grande), revisar el plan (`explain`), tamaños de archivos (archivos pequeños), joins (¿se perdió el broadcast?), y recién después escalar el cluster.
:::

:::entrevista “¿Cómo garantizas que no haya duplicados si un job se ejecuta dos veces?”
Idempotencia: `MERGE` por clave, sobrescritura por partición/`replaceWhere`, checkpoints en streaming, claves de negocio con tests `unique`.
:::

Otras clásicas: diferencias entre ETL y ELT; OLTP vs OLAP; data lake vs warehouse vs lakehouse; SCD tipo 2; particionado vs clustering; narrow vs wide; broadcast join; cuándo usar streaming; cómo versionas y despliegas pipelines (Git + CI/CD + Declarative Automation Bundles).

## Checklist: ¿estás listo para un puesto Junior / Semi Senior?

| Área | Debes poder… |
|---|---|
| SQL | Joins de todo tipo, GROUP BY/HAVING, CTEs, ventanas, deduplicación, gaps & islands |
| Python | Funciones, estructuras de datos, archivos/JSON, errores, tests, entornos virtuales |
| Spark | Explicar driver/executors, lazy evaluation, shuffles, joins, particiones; escribir PySpark limpio |
| Lakehouse | Delta Lake (MERGE, time travel, OPTIMIZE), medallón, Unity Catalog |
| dbt | Proyecto con staging/marts, ref/source, incrementales, tests y docs |
| Orquestación | DAGs de Airflow o jobs de Databricks con reintentos, parámetros y alertas |
| Nube | Azure CLI, ADLS Gen2, identidades/RBAC, Key Vault |
| Ingeniería | Git, PRs, CI/CD, Declarative Automation Bundles, buenas prácticas de código |

## Certificaciones que suman

- **Databricks Certified Data Engineer Associate** (y luego **Professional**): muy valoradas en el mercado actual.
- **dbt Analytics Engineering Certification**.
- **Microsoft**: Azure Fundamentals (AZ-900) para empezar; el certificado de ingeniería de datos de Microsoft se renueva seguido (hoy el foco está en Fabric: DP-700). Revisa la página oficial antes de elegir.
- **Astronomer Certification for Apache Airflow**.

:::tip Lo que más pesa
Un **proyecto propio** bien documentado en GitHub (como el del módulo anterior), tu capacidad para explicar decisiones y una base sólida de SQL valen más que juntar certificados.
:::

## Cómo seguir después de este curso

1. Repite los ejercicios difíciles sin mirar la solución, una semana después.
2. Crea una cuenta gratuita de **Databricks** (Free Edition) y de **Azure**, y reconstruye el proyecto con datos reales (por ejemplo, datos abiertos de tu ciudad).
3. Lee documentación oficial: Spark, Delta Lake, dbt, Airflow. Es la mejor fuente.
4. Practica SQL a diario (15 minutos) en plataformas de ejercicios.
5. Únete a comunidades (dbt Slack, foros de Databricks, meetups locales) y escribe sobre lo que aprendes.

:::ejercicio quiz
En una entrevista te piden diseñar un pipeline. ¿Qué deberías hacer **primero**?

- [ ] Elegir la herramienta más moderna
- [x] Hacer preguntas: volumen, latencia requerida, consumidores, calidad, presupuesto
- [ ] Escribir código Spark
- [ ] Dibujar el tablero final
:::

:::ejercicio abierto
Escribe tu propio **plan de 90 días** después de este curso: qué vas a repasar, qué proyecto vas a construir y qué certificación vas a intentar. ¡No hay respuesta incorrecta! Mira la respuesta modelo como inspiración.
```text solucion
Días 1-30: repasar SQL avanzado (ventanas, gaps & islands) 20 min diarios; rehacer los desafíos de PySpark sin mirar soluciones.
Días 31-60: proyecto en Databricks Free Edition + GitHub: ingesta de datos abiertos de transporte, medallón con PySpark, gold con dbt, job programado, README con arquitectura.
Días 61-90: preparar Databricks Data Engineer Associate (guía oficial + exámenes de práctica); publicar 2 artículos sobre el proyecto; postular a 5 puestos por semana.
```
:::
