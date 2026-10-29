---
titulo: El mapa de las certificaciones de datos e IA de Microsoft
nivel: Intermedio
duracion: 30
resumen: Qué certificaciones de datos e IA ofrece Microsoft en 2026 (DP-700, AI-103, AI-300 y las fundamentales), cuáles se retiraron, cómo es un examen de Microsoft, cómo se renueva y un plan de estudio.
objetivos: Elegir la certificación de Microsoft adecuada para un rol de datos o de IA | Explicar el formato de los exámenes de Microsoft (tipos de pregunta, casos de estudio, puntaje 700) | Reconocer qué certificaciones se retiraron y por cuáles se reemplazaron | Planificar la preparación según el peso de cada dominio | Renovar una certificación antes de que venza
prerrequisitos: azure-nube-azure
autoevaluacion: ¿Sabes qué certificación reemplazó a DP-203? | ¿Sabes qué evalúa AI-103 y qué AI-300? | ¿Sabes cuánto se necesita para aprobar un examen de Microsoft? | ¿Sabes cómo se renueva una certificación de rol? | ¿Sabes qué recursos puedes consultar durante el examen?
---

:::escenario
Martín es ingeniero de datos en una cadena de farmacias que migra todo su análisis a **Microsoft Fabric**, y su compañera Lucía construye un asistente de IA con **Microsoft Foundry**. Ambos quieren certificarse, pero los cursos que encuentran hablan de DP-203, AI-102 o DP-100, exámenes que ya no se pueden rendir. Antes de estudiar, hace falta saber qué existe hoy.
:::

## Las certificaciones vigentes

| Certificación | Examen | Rol | Plataforma |
|---|---|---|---|
| **Fabric Data Engineer Associate** | **DP-700** | Ingeniero de datos | Microsoft Fabric (OneLake, lakehouses, warehouses, pipelines, Real-Time Intelligence) |
| **Azure AI Apps and Agents Developer Associate** | **AI-103** | Desarrollador de aplicaciones y agentes de IA | Microsoft Foundry, Azure AI Search, servicios de visión, lenguaje y extracción |
| **Machine Learning Operations (MLOps) Engineer Associate** | **AI-300** | Ingeniero de MLOps y GenAIOps | Azure Machine Learning y Microsoft Foundry |
| Fabric Analytics Engineer Associate | DP-600 | Ingeniero de analítica | Modelos semánticos, Power BI y warehouses en Fabric |
| Fundamentos | AI-900 / DP-900 | Introductorias | Conceptos de IA y de datos |

### Las que se retiraron

| Retirada | Cuándo | Qué la reemplaza |
|---|---|---|
| DP-203 (Azure Data Engineer Associate) | 31 de marzo de 2025 | **DP-700**, centrada en Microsoft Fabric |
| AI-102 (Azure AI Engineer Associate) | 30 de junio de 2026 | **AI-103**, con foco en IA generativa y agentes en Foundry |
| DP-100 (Azure Data Scientist Associate) | junio de 2026 | **AI-300**, con foco en operación: MLOps y GenAIOps |

Quien ya tiene una certificación retirada la conserva hasta su fecha de vencimiento, pero ya no puede renovarla.

:::cuidado Material de estudio viejo
Mucho material en internet sigue enseñando **Synapse Analytics** como centro de la ingeniería de datos en Azure (DP-203) o **Azure AI Studio** y **Azure OpenAI** como productos separados (AI-102). En 2026, la ingeniería de datos de Microsoft gira alrededor de **Fabric**, y la IA alrededor de **Microsoft Foundry** (antes Azure AI Foundry y Azure AI Studio). Los exámenes nuevos usan esos nombres.
:::

## Cómo es un examen de Microsoft

- **Duración**: 100 a 120 minutos. **Cantidad de preguntas**: no es fija; suele estar entre 40 y 60.
- **Puntaje**: escala de 1 a 1000; se aprueba con **700**. No equivale a 70 % de respuestas correctas, porque las preguntas pesan distinto.
- **Tipos de pregunta**: opción única, selección múltiple, arrastrar y ordenar pasos, completar código (elegir la parte que falta de un fragmento de PySpark, T-SQL, KQL o JSON), "sí o no" sobre una solución propuesta (no se puede volver atrás en esas series) y **casos de estudio**: una empresa ficticia descrita en varias pestañas (requisitos técnicos, de negocio, de seguridad) con varias preguntas sobre ella.
- **Microsoft Learn durante el examen**: en los exámenes de rol se puede abrir Microsoft Learn en una ventana dentro del examen. Ayuda a confirmar una sintaxis, pero el reloj sigue corriendo: no alcanza para aprender en el momento.
- **Costo**: depende del país (en Estados Unidos, USD 165 por examen de rol). Hay descuentos con los *Cloud Skills Challenges* y los eventos de Microsoft.
- **Renovación**: las certificaciones de rol duran **1 año** y se renuevan **gratis** con una evaluación en línea, sin supervisión, en Microsoft Learn, disponible desde 6 meses antes del vencimiento.

## Los dominios y su peso

**DP-700** (temario actualizado el 21 de julio de 2026):

| Dominio | Peso | Lección |
|---|---|---|
| Implementar y administrar una solución de analítica | 30–35 % | Fabric por dentro: OneLake, workspaces, seguridad y ciclo de vida |
| Ingerir y transformar datos | 30–35 % | Ingerir y transformar en Fabric |
| Monitorear y optimizar una solución de analítica | 30–35 % | Monitorear y optimizar Fabric |

**AI-103**:

| Dominio | Peso | Lección |
|---|---|---|
| Planificar y administrar una solución de IA en Azure | 25–30 % | Microsoft Foundry, IA generativa y agentes |
| Implementar soluciones de IA generativa y agentes | 30–35 % | Microsoft Foundry, IA generativa y agentes |
| Implementar soluciones de visión por computadora | 10–15 % | Visión, lenguaje y extracción de información |
| Implementar soluciones de análisis de texto | 10–15 % | Visión, lenguaje y extracción de información |
| Implementar soluciones de extracción de información | 10–15 % | Visión, lenguaje y extracción de información |

**AI-300** (*Operationalizing Machine Learning and Generative AI Solutions*):

| Dominio | Peso | Lección |
|---|---|---|
| Diseñar e implementar una infraestructura de MLOps | 15–20 % | MLOps y GenAIOps |
| Implementar el ciclo de vida y la operación de modelos de ML | 25–30 % | MLOps y GenAIOps |
| Diseñar e implementar una infraestructura de GenAIOps | 20–25 % | MLOps y GenAIOps |
| Calidad y observabilidad de IA generativa | 10–15 % | MLOps y GenAIOps |
| Optimizar sistemas de IA generativa y el rendimiento de los modelos | 10–15 % | MLOps y GenAIOps |

:::examen Cómo leer un caso de estudio
Antes de responder, lee los **requisitos** y subraya las palabras que restringen: "minimizar el esfuerzo de desarrollo", "sin copiar los datos", "con el menor costo", "los analistas solo saben SQL". La respuesta correcta casi siempre es la que cumple **todas** las restricciones con el servicio más gestionado. Si una opción funciona pero requiere escribir y mantener código cuando el caso pide "mínimo esfuerzo", es incorrecta.
:::

## Plan de 6 semanas para DP-700

| Semana | Tema | Práctica |
|---|---|---|
| 1 | Fabric por dentro: capacidades, workspaces, OneLake | Activa una **prueba gratuita de Fabric** (60 días) y crea un workspace con un lakehouse |
| 2 | Seguridad y ciclo de vida | Conecta el workspace a Git y arma una canalización de despliegue dev → test → prod |
| 3 | Ingesta por lotes | Copy activity, Dataflow Gen2, shortcuts y mirroring |
| 4 | Transformación | Notebooks PySpark, T-SQL en el warehouse, SCD tipo 2, carga incremental |
| 5 | Tiempo real y KQL | Eventstream hacia un eventhouse; consultas KQL con ventanas |
| 6 | Monitoreo, optimización y examen de práctica | Monitoring hub, Capacity Metrics, V-Order y OPTIMIZE; examen de práctica de este curso y el gratuito de Microsoft |

Microsoft publica una **evaluación de práctica gratuita** para cada examen en la página de la certificación y rutas de aprendizaje gratuitas en Microsoft Learn.

## Resumen

| Si trabajas en… | Rinde |
|---|---|
| Ingeniería de datos con Microsoft | DP-700 |
| Aplicaciones y agentes de IA en Azure | AI-103 |
| Operación de modelos y de IA generativa (MLOps) | AI-300 |
| Modelos semánticos y Power BI sobre Fabric | DP-600 |

## Ejercicios

:::ejercicio quiz
Un compañero quiere rendir DP-203 en noviembre de 2026. ¿Qué le recomiendas?
- [ ] Que lo rinda: sigue siendo la certificación de datos de Azure más pedida.
- [x] DP-700, porque DP-203 se retiró en marzo de 2025.
- [ ] AI-300, porque reemplazó a DP-203.
- [ ] DP-900, que es la versión nueva de DP-203.
```explicacion
DP-203 se retiró el 31 de marzo de 2025. Su reemplazo para ingeniería de datos es DP-700, centrado en Microsoft Fabric.
```
:::

:::ejercicio quiz
Obtuviste 690 puntos en un examen de Microsoft. ¿Qué significa?
- [ ] Aprobaste, porque superaste el 60 % de las preguntas.
- [x] No aprobaste: se necesitan 700 puntos en la escala de 1 a 1000.
- [ ] Aprobaste con observaciones y debes rendir una evaluación adicional.
- [ ] El resultado depende de cuántas preguntas tenía el examen.
```explicacion
El puntaje mínimo para aprobar es 700, en una escala que no equivale a un porcentaje de respuestas correctas.
```
:::

:::ejercicio quiz
Tu certificación AI-103 vence en 4 meses. ¿Cómo la renuevas?
- [ ] Rindiendo de nuevo el examen completo en un centro de evaluación.
- [x] Con la evaluación de renovación gratuita en línea de Microsoft Learn.
- [ ] No hace falta: las certificaciones de rol no vencen.
- [ ] Pagando una cuota anual de mantenimiento.
```explicacion
Las certificaciones de rol duran un año y se renuevan con una evaluación gratuita, sin supervisión, disponible desde 6 meses antes del vencimiento.
```
:::

:::ejercicio quiz
Un caso de estudio dice: "minimizar el esfuerzo de desarrollo y de mantenimiento". Dos opciones funcionan: una es un notebook con código propio y otra un servicio gestionado configurable. ¿Cuál eliges?
- [ ] El notebook, porque da más control sobre la solución.
- [x] El servicio gestionado, porque cumple con menos código que mantener.
- [ ] Cualquiera, porque las dos funcionan.
- [ ] Ninguna: el caso pide una tercera opción que combine ambas.
```explicacion
Las restricciones del caso deciden. "Mínimo esfuerzo" descarta las opciones que requieren escribir y mantener código cuando hay una alternativa gestionada.
```
:::
