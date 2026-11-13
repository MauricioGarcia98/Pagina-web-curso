---
titulo: Proyecto final (solo el pedido) - ¿dónde está perdiendo plata la tienda?
nivel: 6 · Avanzado completo
duracion: 240
resumen: El proyecto que cierra el curso, como llega en un trabajo real - un mail ambiguo de la dirección, cuatro tablas y una fecha de entrega. Sin pasos ni pistas. Defines las preguntas, decides las métricas, construyes un libro profesional con controles, encuentras hallazgos y los presentas con una recomendación. Primero en la práctica y después en Excel real, para tu portafolio.
objetivos: Convertir un pedido ambiguo en preguntas y métricas definidas | Construir un libro en capas con supuestos, cálculos, salida y controles | Combinar todas las técnicas del curso sin guía | Presentar hallazgos con números y una recomendación accionable | Reproducir el trabajo en Excel real como pieza de portafolio
prerrequisitos: excel-de-la-practica-al-excel-real
autoevaluacion: ¿Sabes escribir las preguntas antes de abrir los datos? | ¿Sabes definir una métrica para que nadie la interprete distinto? | ¿Sabes demostrar que tus números cierran? | ¿Sabes escribir una recomendación que alguien pueda ejecutar?
---

:::escenario El pedido
Mail del director de operaciones, un viernes a las 18:40:

*"Hola. En la reunión de directorio salió que estamos perdiendo plata con los pedidos que no se concretan: cancelaciones, devoluciones, pagos rechazados. Nadie tiene números. Necesito para el miércoles algo que me diga dónde está el problema y qué haríamos. Tenés acceso a pedidos, pagos, clientes y productos. Gracias."*
:::

## Las reglas de este proyecto

- **No hay pasos ni pistas.** Todo lo que necesitas lo aprendiste en las lecciones 1 a 23.
- El pedido es ambiguo a propósito: "perder plata", "el problema" y "qué haríamos" los defines tú, y lo dejas escrito.
- Se entrega como en un trabajo: un libro, un resumen ejecutivo y los supuestos explícitos.

## Datos disponibles

| Tabla | Filas | Te sirve para |
|---|---|---|
| `pedidos` | 12,000 | Estado (cancelado, devuelto…), canal, método de pago, fecha, cliente |
| `pagos` | 11,081 | Pagos aprobados y rechazados, montos, fechas |
| `clientes` | 2,000 | País, segmento, fecha de registro |
| `productos` | 300 | Precio, costo, categoría |

Números para verificar que cargaste bien: **967** pedidos cancelados, **506** devueltos, **337** pagos rechazados por **$373,571.98**.

## Entregables

1. **El libro** (en la práctica: las hojas exportadas a CSV; en Excel real: el `.xlsx`), con:
   - `LEEME`: qué es, fuentes, definiciones, cómo actualizarlo.
   - `supuestos`: período analizado, definiciones de cada métrica, umbrales.
   - `calculos`: las tablas que respaldan cada hallazgo.
   - `tablero`: indicadores y gráficos de los hallazgos.
   - `control`: controles OK/REVISAR que demuestran que los números cierran.
2. **El resumen ejecutivo** (máximo 10 líneas, en el cuerpo del mail): 3 hallazgos con números, 1 recomendación priorizada y qué harías después.
3. **Una lista de limitaciones**: qué no pudiste medir con estos datos y qué dato pedirías.

## Rúbrica

| Criterio | Peso | Insuficiente | Competente | Sobresaliente |
|---|---|---|---|---|
| Definición del problema | 15 % | Analiza sin definir qué es "perder plata" | Define métricas y período en `supuestos` | Además justifica por qué esas métricas y no otras |
| Exactitud | 25 % | Números que no cierran o no se pueden rastrear | Todo con fórmulas y controles OK | Controles cubren totales, cruces entre tablas y casos borde |
| Profundidad del análisis | 20 % | Solo totales | Corta por al menos dos dimensiones (canal, método, país, mes…) | Encuentra dónde se concentra el problema y lo cuantifica en dinero |
| Estructura del libro | 15 % | Todo en una hoja | Capas separadas y LEEME | Un tercero puede actualizarlo con datos nuevos sin ayuda |
| Comunicación | 25 % | Describe tablas | 3 hallazgos con números y una recomendación | Recomendación priorizada, con impacto estimado y próximo paso concreto |

**Aprobado**: competente o más en todos los criterios. Evalúate con honestidad; si algo queda insuficiente, rehazlo antes de darlo por terminado.

## Preguntas que un director haría (para que te prepares)

No son pistas: son las preguntas que te van a hacer cuando presentes. Tu libro debería poder responderlas.

- "¿Esto es mucho o poco? ¿Comparado con qué?"
- "¿Es un problema de un canal, de un medio de pago o de todos?"
- "¿Empeora o mejora con el tiempo?"
- "¿Cuánta plata es, más o menos?"
- "Si hacemos lo que recomendás, ¿cuánto recuperamos y cómo lo medimos?"

## La segunda vuelta: en Excel real, para tu portafolio

Cuando termines en la práctica, rehaz el proyecto en Excel real (Excel para la web alcanza):

1. Exporta las cuatro tablas a CSV desde la réplica.
2. Cárgalas con **Power Query** y conviértelas en **Tablas**.
3. Reconstruye los cálculos con **referencias estructuradas** y las tablas dinámicas con **Slicers**.
4. Agrega **formato condicional** a los indicadores que superan tus umbrales.
5. Comprueba que los números coinciden con los de tu versión en la práctica: es tu control final.
6. Para publicarlo: guarda el `.xlsx`, saca capturas del tablero (con datos ficticios, como estos) y escribe el resumen ejecutivo como descripción del proyecto.

:::tip Cómo contarlo en una entrevista
"Recibí un pedido ambiguo sobre pérdidas por pedidos no concretados. Definí tres métricas, construí un libro en capas con controles automáticos y encontré que [tu hallazgo principal, con número]. Recomendé [tu recomendación], con un impacto estimado de [monto]." Esa estructura (contexto, decisión, resultado con número) es la que buscan los entrevistadores.
:::

## Después de este curso

Ya dominas Excel como herramienta de análisis. Los caminos naturales desde aquí:

- **[SQL](#/m/sql)**: las mismas preguntas sobre millones de filas.
- **[Python](#/m/python)** y [JupyterLab](#/jupyter): automatizar la limpieza y el análisis.
- **[Power BI](#/m/powerbi)**: tableros interactivos que muchos consultan.

:::ejercicio quiz
El pedido dice "perder plata con los pedidos que no se concretan". ¿Qué haces primero?
- [ ] Abro los datos y hago todos los gráficos posibles
- [x] Escribo qué voy a medir (por ejemplo, monto de pedidos cancelados y devueltos, y pagos rechazados) y en qué período
- [ ] Le pregunto al director qué fórmula usar
- [ ] Copio el tablero del proyecto 5
:::

:::ejercicio quiz
¿Qué hace que una recomendación sea útil para un director?
- [ ] Que sea larga y detallada
- [ ] Que mencione todas las fórmulas usadas
- [x] Que diga qué hacer, cuánto impacto se espera y cómo medirlo
- [ ] Que incluya todos los gráficos del libro
:::

:::ejercicio quiz
¿Para qué sirve la lista de limitaciones?
- [ ] Para justificar que el análisis está incompleto
- [x] Para que quien decide sepa qué no muestran los datos y qué información conviene conseguir
- [ ] Para alargar el informe
- [ ] No sirve: hay que esconder las limitaciones
:::
