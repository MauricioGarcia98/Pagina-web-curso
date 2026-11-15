---
titulo: De la práctica al Data Factory real (y a Fabric)
nivel: 6 · Avanzado completo
duracion: 40
resumen: Todo lo que hiciste se hace igual en Azure Data Factory, con más opciones. Qué tiene el Data Factory real que no viste (más conectores, mapping data flows, Execute Pipeline, Web, Switch, Until, global parameters, datasets parametrizados), cómo practicar sin gastar, cómo se compara con Data Factory en Microsoft Fabric y con otros orquestadores, y qué estudiar después.
objetivos: Conocer las funciones del Data Factory real que no están en la práctica | Practicar en Azure real cuidando el costo | Comparar Data Factory con Fabric Data Factory, Synapse Pipelines y Airflow | Elegir los siguientes pasos de aprendizaje
prerrequisitos: data-factory-paso-a-paso-integration-runtimes-seguridad-y-costos
autoevaluacion: ¿Sabes para qué sirve Execute Pipeline? | ¿Sabes qué es un dataset parametrizado? | ¿Sabes en qué se diferencia Fabric Data Factory? | ¿Sabes cuándo elegir Airflow?
---

## Paso 1 — Lo que recorriste

```captura
archivo: adf/b23-home.webp
texto: La guía de inicio del Studio, con todos los pasos completos
```

Linked services con identidad administrada, datasets, Copy, Debug, publicar, triggers, Monitor, parámetros, variables, Get Metadata, ForEach, Lookup, If Condition, Fail, rutas de error, Databricks, el patrón por metadatos, Git y plantillas ARM. Con eso se construye la mayoría de los pipelines de ingesta del mundo real.

## Paso 2 — Lo que tiene el Data Factory real

| Función | Para qué |
|---|---|
| **Más de 90 conectores** | SQL Server, Oracle, SAP, Salesforce, REST, SFTP, S3, Snowflake… |
| **Datasets y linked services parametrizados** | Un dataset con parámetro `carpeta`, en lugar de uno por carpeta |
| **Execute Pipeline** | Llamar a otro pipeline (pipelines padre e hijo, ForEach anidados) |
| **Web / Webhook** | Llamar una API: avisar a Teams, disparar otro sistema |
| **Switch, Until, Filter, Append variable** | Más control de flujo |
| **Stored procedure, Script** | Ejecutar SQL en una base |
| **Mapping data flows** | Transformaciones visuales que corren en Spark, sin escribir código |
| **Global parameters** | Valores para todo el factory, como el entorno |
| **Tumbling window** con dependencias y backfill | Procesar ventanas de tiempo con reintentos |
| **Change Data Capture** | Copiar solo lo que cambió en ciertas fuentes |

## Paso 3 — Practicar en Azure real sin sustos

1. Usa la cuenta gratuita o Azure for Students (curso del portal de Azure, lección 23).
2. Un **presupuesto** chico con alertas antes de crear nada.
3. Pocos triggers y **detenlos** al terminar la práctica: un trigger cada minuto olvidado un mes suma.
4. Copias de archivos chicos; los data flows tienen un mínimo de minutos de clúster por ejecución.
5. Borra el grupo de recursos de práctica al terminar.

:::cuidado Las capturas del Studio real
Si compartes capturas de tu factory, tapa el **ID de la suscripción**, las **URLs de las conexiones** si son internas, los **Run ID** si son de producción y cualquier valor de **Input/Output** con datos reales.
:::

## Paso 4 — Data Factory en Fabric y otros orquestadores

| Opción | Qué es | Cuándo |
|---|---|---|
| **Azure Data Factory** | El de este curso | Plataformas en Azure con Databricks, Synapse o bases de Azure |
| **Data Factory en Microsoft Fabric** | Pipelines casi iguales (mismas actividades y expresiones) más **Dataflow Gen2** (Power Query) dentro de un workspace de Fabric | Si el equipo trabaja en Fabric con lakehouse y warehouse |
| **Synapse pipelines** | El mismo motor, dentro de Azure Synapse | Proyectos que ya usan Synapse |
| **Apache Airflow** | Orquestación con código Python (DAGs) | Equipos que prefieren código, multinube, o muchas dependencias entre sistemas |
| **Databricks Jobs** | El orquestador de Databricks | Flujos que viven dentro de Databricks |

Lo que aprendiste se traslada casi tal cual a los pipelines de Fabric y Synapse. Con Airflow cambia la forma (código en lugar de lienzo) pero los conceptos son los mismos: tareas, dependencias, parámetros, reintentos, programación y monitoreo.

## Paso 5 — Siguientes pasos

| Si quieres… | Sigue con |
|---|---|
| La plataforma en Azure | [Portal de Azure paso a paso](#/m/azure-paso-a-paso) |
| Transformar en el lago | [Databricks paso a paso](#/m/databricks-paso-a-paso) |
| Orquestar con código | [Apache Airflow](#/m/airflow) |
| Diseñar plataformas | [Arquitectura de datos](#/m/arquitectura) |
| Certificarte | [Certificaciones Azure](#/m/cert-azure): **DP-700** (Fabric Data Engineer), que incluye pipelines |

## ✅ Lo que lograste

- Sabes qué más ofrece el Data Factory real.
- Puedes practicar en Azure cuidando el costo.
- Ubicas Data Factory frente a Fabric, Synapse, Airflow y Databricks Jobs.

:::ejercicio quiz
Necesitas que un ForEach recorra carpetas y, dentro de cada una, archivos. ¿Qué actividad del Data Factory real usas?
- [ ] Wait
- [x] Execute Pipeline
- [ ] Fail
- [ ] Lookup
:::

:::ejercicio quiz
¿Qué es un dataset parametrizado?
- [ ] Un dataset con contraseña
- [x] Un dataset con parámetros (por ejemplo la carpeta), para no crear uno por carpeta
- [ ] Un dataset de Fabric
- [ ] Un dataset sin linked service
:::

:::ejercicio quiz
Tu equipo trabaja todo en Microsoft Fabric con lakehouse. ¿Dónde armas los pipelines?
- [ ] En Azure Data Factory, siempre
- [x] En Data Factory de Fabric, que tiene pipelines casi iguales y Dataflow Gen2
- [ ] En Excel
- [ ] No se puede
:::

:::ejercicio quiz
¿Cuándo conviene Airflow en lugar de Data Factory?
- [ ] Nunca
- [x] Cuando el equipo prefiere orquestar con código Python, o es multinube
- [ ] Solo para copiar archivos
- [ ] Cuando no hay internet
:::
