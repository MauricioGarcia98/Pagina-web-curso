---
titulo: Proyecto final (solo el pedido) - el lakehouse de una app de delivery, de cero a producción
nivel: 6 · Avanzado completo
duracion: 300
resumen: El proyecto que cierra el curso, como llega en un trabajo real - un pedido ambiguo de una directora de operaciones de una app de delivery, cuatro tablas y una semana. Sin pasos ni pistas. Diseñas la jerarquía del catálogo, construyes bronze-silver-gold con calidad, orquestas, gobiernas, publicas tableros y un agente, dejas todo como código y lo presentas. Primero en la práctica; después, como pieza central de tu portafolio, en Databricks Free Edition.
objetivos: Convertir un pedido ambiguo en definiciones y un plan | Construir un lakehouse completo con las herramientas del curso | Gobernar datos personales y regionales | Orquestar, monitorear y documentar | Presentar decisiones y resultados con números
prerrequisitos: databricks-paso-a-paso-de-la-practica-a-databricks-real
autoevaluacion: ¿Sabes definir una métrica para que nadie la interprete distinto? | ¿Sabes demostrar que un pipeline es idempotente? | ¿Sabes probar la seguridad por filas? | ¿Sabes contar este proyecto en una entrevista?
---

:::escenario El pedido
Mensaje de Valeria, directora de operaciones de **RapiBox**, una app de delivery:

*"Tenemos los datos de pedidos, restaurantes, repartidores y clientes de cinco ciudades y nadie confía en los números: cada ciudad calcula distinto el tiempo de entrega y las cancelaciones. Necesito, para el viernes, una fuente única de verdad en Databricks: tiempos de entrega, cancelaciones y calificaciones por ciudad y por restaurante, actualizada sola todos los días, con un tablero que puedan ver los gerentes de ciudad (cada uno su ciudad), alertas cuando algo se desvía, y que yo pueda preguntar cosas sin molestar a nadie. Y quiero que quede como código, que el último proyecto se perdió cuando se fue quien lo hizo."*
:::

## Las reglas de este proyecto

- **No hay pasos ni pistas.** Todo lo que necesitas lo aprendiste en las lecciones 1 a 23.
- El pedido es ambiguo a propósito: "tiempo de entrega", "cancelación" y "se desvía" los defines tú, y lo dejas escrito en comentarios de tablas, instrucciones de Genie y la documentación.
- Se entrega como en un trabajo: el workspace, el bundle exportado y una presentación corta.

## Datos disponibles

El esquema `samples.delivery`:

| Tabla | Filas | Te sirve para |
|---|---|---|
| `delivery_pedidos` | 16 000 | Ciudad, estado, marcas de tiempo (creado, aceptado, retirado, entregado), subtotal, envío, cupón, propina, calificación |
| `delivery_restaurantes` | — | Nombre, ciudad, categoría, comisión, rating |
| `delivery_repartidores` | — | Quién entregó |
| `delivery_clientes` | — | Quién pidió (datos personales) |

Números para verificar que leíste bien: **16 000** pedidos; **14 405** entregados, **658** cancelados por el cliente, **450** por el restaurante, **487** sin repartidor; **1595** pedidos sin marca de entrega; ciudades: Ciudad de México 4750, Bogotá 3491, Lima 2947, Buenos Aires 2855, Medellín 1957; calificación promedio de los entregados **4.42**.

## Entregables

1. **El catálogo**: una jerarquía propia (catálogo o esquemas por capa) con comentarios en cada nivel que expliquen el criterio.
2. **El pipeline** bronze → silver → gold, declarativo, con expectativas en las tres acciones y las definiciones de tiempo de entrega, cancelación y calificación aplicadas en la silver. Tablas gold por ciudad, por restaurante y por día.
3. **El job** que lo orquesta, con control de calidad, aviso al fallar, horario diario y una corrida reparada después de un fallo provocado.
4. **El gobierno**: grupos por ciudad con filtro de fila, máscara sobre los datos personales de clientes, etiquetas `pii`, permisos mínimos y la **evidencia** de que funciona.
5. **La analítica**: un dashboard publicado con filtros, dos alertas con umbrales justificados con el histórico, y un Genie Agent con instrucciones y ejemplos, evaluado con diez preguntas.
6. **El código**: todos los jobs y pipelines exportados como bundle; los notebooks exportados como archivos fuente; un README (en un notebook de texto o un archivo del workspace) que explique cómo desplegar en otro workspace.
7. **La presentación** (máximo 10 líneas, como mensaje a Valeria): tres hallazgos con números, las definiciones que fijaste, y qué harías después.

## Rúbrica

| Criterio | Peso | Insuficiente | Competente | Sobresaliente |
|---|---|---|---|---|
| Definiciones y diseño | 15 % | Métricas sin definir; todo en `default` | Definiciones escritas y jerarquía con criterio | Las definiciones viven en el código (expectativas, comentarios, instrucciones de Genie) y coinciden entre sí |
| Pipeline y calidad | 20 % | Sin expectativas o sin capas | Tres capas, tres acciones, números que cierran | Idempotencia demostrada (dos corridas, mismos números) y calidad documentada |
| Orquestación | 15 % | Sin job o sin control | Job con control, aviso, horario y reparación | Parámetros en lugar de constantes; reintentos justificados |
| Gobierno | 20 % | Permisos abiertos | Filtros, máscaras, etiquetas y permisos mínimos con evidencia | Funciones de seguridad reutilizables y consulta de control guardada |
| Analítica | 15 % | Gráficos sueltos | Dashboard, alertas y Genie evaluado | El tablero responde las preguntas de Valeria sin tocar nada; Genie documenta sus límites |
| Código y presentación | 15 % | Nada exportado | Bundle, fuentes y README | Otro alumno despliega tu bundle siguiendo el README; la presentación prioriza decisiones |

**Aprobado**: competente o más en todos los criterios. Evalúate con honestidad; si algo queda insuficiente, rehazlo antes de darlo por terminado.

## Preguntas que te harían al presentarlo

No son pistas: son las preguntas que te van a hacer.

- "¿Cómo definiste el tiempo de entrega y qué pasa con los pedidos sin marca de entrega?"
- "Si mañana el pipeline corre dos veces, ¿cambian los números?"
- "¿Qué ve el gerente de Lima cuando abre el tablero? ¿Y cuando le pregunta a Genie?"
- "¿Cuánto cuesta esto por mes, aproximadamente, y qué harías para bajarlo?"
- "Si te vas la semana que viene, ¿cómo lo levanta otra persona?"

## La segunda vuelta: en Databricks real, para tu portafolio

1. Crea una cuenta en **Databricks Free Edition**.
2. Lleva los datos: descarga las cuatro tablas desde la práctica (CSV) y súbelas a un volumen; o usa el [generador de datos del curso](#/datos).
3. Despliega tu bundle con `databricks bundle deploy` y corre el job.
4. Publica el dashboard con credenciales del lector y prueba el filtro de ciudad con un segundo usuario de prueba.
5. Sube el bundle y el README a un repositorio público (curso de [GitHub](#/m/github)) con capturas del tablero (datos ficticios) y la presentación como descripción.

:::tip Cómo contarlo en una entrevista
"Monté en Databricks la fuente única de verdad de una app de delivery: pipeline declarativo bronze-silver-gold con expectativas de calidad, job diario con control y reparación, seguridad por ciudad con filtros de fila y máscaras sobre datos personales, dashboard, alertas y un agente de Genie evaluado. Todo desplegable como bundle. Encontré que [tu hallazgo principal, con número]." Contexto, decisiones, resultado: eso buscan.
:::

## Después de este curso

Ya dominas el workspace de Databricks como lo usa un equipo de datos. Los caminos naturales desde aquí:

- **[Certificaciones Databricks](#/m/cert-databricks)**: Data Engineer Associate con lo que ya sabes; Professional con PySpark y optimización.
- **[PySpark](#/m/pyspark)**: lo que pasa dentro de cada celda de Spark.
- **[dbt](#/m/dbt)** y **[Airflow](#/m/airflow)**: otras formas de modelar y orquestar que conviven con Databricks.
- **[Portafolio](#/m/portafolio)**: convertir estos proyectos en piezas que te consigan entrevistas.

:::errores
- **Construir antes de definir.** "Tiempos de entrega" necesita una definición escrita.
- **Decir que es idempotente sin probarlo.** Se corre dos veces y se comparan los números.
- **Dejar el proyecto en clics.** Como código se revisa, se reproduce y se mantiene.
:::

:::ejercicio quiz
El pedido dice "tiempos de entrega". ¿Qué haces primero?
- [ ] Calculo entregado menos creado y listo
- [x] Defino qué es (qué marcas de tiempo, qué pasa con los pedidos sin entrega, en qué unidad) y lo dejo escrito antes de construir
- [ ] Calculo el promedio por día sin mirar los pedidos sin entrega
- [ ] Uso el promedio que ya calculaba cada ciudad
:::

:::ejercicio quiz
¿Cómo demuestras que el pipeline es idempotente?
- [ ] Diciendo que usa MERGE
- [x] Corriéndolo dos veces y mostrando que los números de las tablas gold no cambian
- [ ] Mirando el código
- [ ] Revisando que todas las tablas tengan comentarios
:::

:::ejercicio quiz
¿Por qué Valeria pide que quede como código?
- [ ] Porque el código usa menos DBU
- [x] Para que el proyecto se pueda revisar, reproducir y mantener aunque cambie la persona que lo hizo
- [ ] Porque los clics no funcionan en producción
- [ ] Porque el código es más rápido
:::
