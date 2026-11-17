---
titulo: Proyecto final (solo el pedido) - el tablero ejecutivo de una app de delivery
nivel: 6 · Avanzado completo
duracion: 300
resumen: El proyecto que cierra el curso, como llega en un trabajo real - un pedido ambiguo de la directora de operaciones de una app de delivery, cuatro tablas y una semana. Sin pasos ni pistas. Defines las métricas, preparas los datos, modelas, escribes las medidas, diseñas un informe de varias páginas, lo publicas seguro y actualizado, y presentas tus conclusiones. Primero en la práctica; después en Power BI Desktop real para tu portafolio.
objetivos: Convertir un pedido ambiguo en métricas definidas | Preparar y modelar los datos con criterio | Escribir medidas verificadas | Diseñar un informe que responda las preguntas sin explicación | Publicarlo con seguridad y operación
prerrequisitos: powerbi-paso-a-paso-de-la-practica-a-power-bi-real
autoevaluacion: ¿Sabes definir una métrica para que nadie la interprete distinto? | ¿Sabes demostrar que tus números cierran? | ¿Sabes que cada gerente ve solo su ciudad? | ¿Sabes contar este proyecto en una entrevista?
---

:::escenario El pedido
Mensaje de Valeria, directora de operaciones de **RapiBox**, una app de delivery:

*"Necesito un tablero para el comité del lunes: cómo venimos con los pedidos, cuánto tardamos en entregar, cuántos se cancelan y por qué, y qué restaurantes y ciudades andan mejor o peor. Cada gerente de ciudad tiene que poder ver lo suyo, y nada más. Y que se actualice solo, que no quiero depender de que alguien lo corra."*
:::

## Las reglas de este proyecto

- **No hay pasos ni pistas.** Todo lo necesario está en las lecciones 1 a 23.
- El pedido es ambiguo a propósito: "tardamos en entregar", "se cancelan", "andan mejor" los defines tú y los escribes en el informe (descripciones de medidas y una página de definiciones).
- Se entrega como en un trabajo: el informe, el modelo publicado y una presentación corta.

## Datos disponibles

En **Obtener datos → Base de datos del curso**, las tablas de **delivery**:

| Tabla | Filas | Te sirve para |
|---|---|---|
| `delivery_pedidos` | 16 000 | Ciudad, estado, marcas de tiempo (creado, aceptado, retirado, entregado), subtotal, envío, cupón, propina, calificación |
| `delivery_restaurantes` | — | Nombre, ciudad, categoría, comisión, rating |
| `delivery_repartidores` | — | Quién entregó |
| `delivery_clientes` | — | Quién pidió (datos personales) |

Números para verificar que cargaste bien: **16 000** pedidos; **14 405** entregados, **658** cancelados por el cliente, **450** por el restaurante, **487** sin repartidor; **1595** sin marca de entrega; Ciudad de México 4750, Bogotá 3491, Lima 2947, Buenos Aires 2855, Medellín 1957; calificación promedio de los entregados **4,42**; subtotal total **414 212,12**.

## Entregables

1. **El modelo**: esquema en estrella, tabla de fechas marcada, datos personales de clientes fuera del modelo o protegidos, medidas en una tabla `_Medidas` con descripción.
2. **Las medidas**, con las definiciones que elijas: pedidos, entregados, tasa de cancelación (y por motivo), tiempo de entrega (en minutos, explicando qué marcas usas y qué haces con los pedidos sin entrega), calificación promedio, ingresos, y su comparación con el período anterior.
3. **El informe** (mínimo tres páginas): resumen ejecutivo con KPIs y tendencia; operación (tiempos y cancelaciones por ciudad, día y hora); restaurantes (ranking, con una página de detalle por restaurante a la que se llega con clic derecho). Una página de **definiciones**.
4. **La seguridad**: rol dinámico por ciudad con una tabla de asignación, probado con Ver como.
5. **La operación**: publicado en un área de equipo, actualización programada y un documento de operación.
6. **La presentación** (máximo 10 líneas, como mensaje a Valeria): tres hallazgos con números, una recomendación y qué harías después.

## Rúbrica

| Criterio | Peso | Insuficiente | Competente | Sobresaliente |
|---|---|---|---|---|
| Definiciones | 15 % | Métricas sin definir | Página de definiciones y descripciones en las medidas | Las definiciones justifican cada decisión (qué cuenta como cancelado, qué tiempo se mide) |
| Modelo y medidas | 25 % | Números que no cierran con el control | Estrella, tabla de fechas, medidas verificadas | Grupo de cálculo para comparaciones y medidas documentadas en TMDL |
| Informe | 25 % | Visuales sueltos | Tres páginas, navegación, detalle por restaurante | Responde las preguntas de Valeria sin explicación; conclusiones escritas |
| Seguridad y operación | 15 % | Sin RLS ni actualización | RLS dinámica probada, actualización y documento | Probado un usuario sin asignación; credenciales de servicio |
| Comunicación | 20 % | Describe gráficos | Tres hallazgos con números y una recomendación | Recomendación priorizada con impacto estimado y forma de medirla |

**Aprobado**: competente o más en todos los criterios. Evalúate con honestidad; si algo queda insuficiente, rehazlo antes de darlo por terminado.

## Preguntas que te harían en el comité

No son pistas: son las preguntas que te van a hacer. Tu informe debería poder responderlas.

- "¿Cómo medís el tiempo de entrega? ¿Desde que el cliente pide o desde que el restaurante acepta?"
- "¿Qué pasa con los pedidos que nunca se entregaron?"
- "¿La cancelación por falta de repartidor es un problema de una ciudad o de todas?"
- "¿Qué ve el gerente de Lima cuando abre el tablero?"
- "Si mañana cambia la fuente de datos, ¿quién lo arregla y cómo?"

## La segunda vuelta: en Power BI real, para tu portafolio

1. Exporta el modelo en TMDL y ábrelo en un proyecto `.pbip` (lección 23); conecta las tablas a archivos CSV exportados desde la práctica o generados con el [generador de datos](#/datos).
2. Rehaz el informe y verifica que los números coinciden con tu versión en la práctica: es tu control final.
3. Sube el proyecto a GitHub con un README (pregunta, modelo, medidas clave, conclusiones) y capturas con datos ficticios.

:::tip Cómo contarlo en una entrevista
"Construí el tablero ejecutivo de una app de delivery: definí las métricas con operaciones, modelé en estrella con tabla de fechas, escribí las medidas de tiempos y cancelaciones con su comparación interanual, diseñé tres páginas con detalle por restaurante, implementé seguridad por ciudad con una regla dinámica y lo dejé actualizándose solo. El hallazgo principal fue [tu hallazgo, con número]." Contexto, decisiones, resultado: eso buscan.
:::

## Después de este curso

Ya dominas Power BI como lo usa un equipo de BI. Los caminos naturales desde aquí:

- **[Power BI y DAX](#/m/powerbi)**: el motor DAX a fondo (contexto, iteradores, inteligencia de tiempo).
- **[Análisis de datos con SQL](#/m/analisis)**: preparar los datos antes de que lleguen a Power BI.
- **[Databricks paso a paso](#/m/databricks-paso-a-paso)**: la capa gold que alimenta tus tableros.
- **[Portafolio](#/m/portafolio)**: convertir estos proyectos en piezas que te consigan entrevistas.

:::errores
- **Graficar antes de definir.** "Cuánto tardamos" necesita una definición escrita: desde qué marca, en qué unidad, qué pasa con los pedidos sin entrega.
- **Afirmar que hay RLS sin mostrarlo.** Ver como con el correo del gerente es la prueba.
- **Presentar medidas en vez de hallazgos.** El comité quiere conclusiones, una recomendación y cómo medirla.
:::

:::ejercicio quiz
El pedido dice "cuánto tardamos en entregar". ¿Qué haces primero?
- [ ] Hago un gráfico de entregado menos creado
- [x] Defino qué tiempo mido (desde qué marca hasta cuál, en qué unidad, qué hago con los pedidos sin entrega) y lo escribo en el informe
- [ ] Uso la mediana sin explicar qué mide
- [ ] Uso el promedio de cada ciudad
:::

:::ejercicio quiz
¿Cómo demuestras que el gerente de Lima solo ve Lima?
- [ ] Diciendo que hay RLS
- [x] Con Ver como → Otro usuario con su correo, mostrando que los totales coinciden con los de Lima
- [ ] Mirando la regla DAX
- [ ] Publicando el informe
:::

:::ejercicio quiz
¿Qué conviene priorizar en la presentación al comité?
- [ ] La lista de todas las medidas
- [x] Tres hallazgos con números, una recomendación y cómo medir su impacto
- [ ] Las capturas de Power Query
- [ ] El código DAX
:::
