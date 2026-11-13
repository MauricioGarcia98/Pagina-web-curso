---
titulo: Proyecto final (solo el pedido) - ¿estamos perdiendo clientes?
nivel: 6 · Avanzado completo
duracion: 240
resumen: El proyecto que cierra el curso, como llega en un trabajo real - una pregunta ambigua de la dirección, cuatro tablas y una fecha. Sin pasos ni pistas. Defines qué significa "perder un cliente", construyes un notebook profesional y reproducible con funciones probadas, encuentras dónde se concentra el problema y cuánto vale, y lo presentas con una recomendación. Después lo repites en JupyterLab real para tu portafolio.
objetivos: Convertir una pregunta ambigua en definiciones y métricas | Construir un notebook profesional, parametrizado y reproducible | Combinar uniones, agrupaciones, fechas y gráficos sin guía | Cuantificar un problema de negocio en clientes y en dinero | Presentar hallazgos y una recomendación accionable
prerrequisitos: jupyterlab-de-la-practica-al-jupyter-real
autoevaluacion: ¿Sabes definir una métrica para que nadie la interprete distinto? | ¿Sabes demostrar que tus números cierran? | ¿Sabes encontrar dónde se concentra un problema? | ¿Sabes escribir una recomendación que se pueda medir?
---

:::escenario El pedido
Mensaje de la directora general, un jueves a la noche:

*"Hola. En el directorio alguien dijo que estamos perdiendo clientes, y otro dijo que no, que crecimos. Los dos tienen razón a medias y nadie tiene números. Para el martes necesito entender qué pasa con nuestros clientes de un año al otro: cuántos se quedan, cuántos se van, quiénes son los que se van y cuánto nos cuesta. Y qué harías. Tenés pedidos, detalle, clientes y productos."*
:::

## Las reglas de este proyecto

- **No hay pasos ni pistas.** Todo lo que necesitas está en las lecciones 1 a 23.
- La pregunta es ambigua a propósito: "perder un cliente", "quedarse" y "cuánto nos cuesta" los defines tú, y lo dejas escrito.
- Se entrega como en un trabajo: notebook, archivos de salida y un resumen ejecutivo.

## Datos (en datos/)

| Tabla | Filas | Te sirve para |
|---|---|---|
| `pedidos.csv` | 12,000 | Quién compró, cuándo, por qué canal y en qué estado |
| `detalle_pedidos.csv` | 25,524 | Cuánto valió cada pedido |
| `clientes.csv` | 2,000 | País, segmento, fecha de registro |
| `productos.csv` | 300 | Qué compraron |

Verifica la carga con esas cantidades de filas antes de empezar.

## Entregables

1. **El notebook** `retencion_clientes.ipynb`, con la estructura de la lección 21: contexto, resumen, parámetros (incluido el año de análisis), carga, preparación, análisis por pregunta y conclusiones. Debe correr con **Restart Kernel and Run All Cells** y funcionar cambiando el año.
2. **Un módulo** `retencion.py` con las funciones principales, probadas con `assert` (incluido un caso borde).
3. **Archivos de salida**: un CSV con los clientes que se fueron (sin datos de contacto) y al menos dos gráficos PNG.
4. **El resumen ejecutivo** (máximo 10 líneas): 3 hallazgos con números, 1 recomendación priorizada con su impacto estimado y cómo medirías si funcionó.
5. **Limitaciones**: qué no pudiste saber con estos datos y qué dato pedirías.

## Rúbrica

| Criterio | Peso | Insuficiente | Competente | Sobresaliente |
|---|---|---|---|---|
| Definiciones | 15 % | Analiza sin definir "perder" o "retener" | Definiciones escritas y aplicadas de forma consistente | Justifica por qué esas definiciones y discute alternativas |
| Exactitud | 25 % | Números que no cierran o no se pueden rastrear | Controles con assert que cierran | Controles cubren uniones (sin duplicar), totales y casos borde |
| Profundidad | 20 % | Solo un total | Corta por al menos dos dimensiones (segmento, país, canal, antigüedad…) | Encuentra dónde se concentra y lo cuantifica en dinero |
| Calidad del código | 15 % | Celdas copiadas, orden frágil | Funciones en un .py, notebook reproducible | Parametrizado: otro año funciona sin tocar el código |
| Comunicación | 25 % | Describe tablas | 3 hallazgos con números y una recomendación | Recomendación priorizada, con impacto estimado y métrica de seguimiento |

**Aprobado**: competente o más en todos los criterios.

## Preguntas que te van a hacer el martes

No son pistas: tu notebook debería poder responderlas.

- "¿Perdimos clientes o crecimos? ¿Las dos cosas?"
- "¿De cada 100 clientes de un año, cuántos vuelven al siguiente?"
- "¿Los que se van son de algún segmento, país o canal en particular?"
- "¿Cuánto compraban los que se fueron?"
- "Si hacemos lo que proponés, ¿cuánto recuperamos y cómo lo medimos?"

<details><summary>Puntos de control (ábrelos solo al terminar, para comparar)</summary>

Con estas definiciones, que no son las únicas válidas: *cliente activo en un año* = hizo al menos un pedido con fecha en ese año (cualquier estado); *perdido* = activo en 2023 y no en 2024.

| Control | Valor |
|---|---|
| Clientes activos en 2023 | 988 |
| Clientes activos en 2024 | 1,276 |
| Activos en 2023 que no compraron en 2024 | 135 |
| Retención 2023 → 2024 | 86.3 % |
| Clientes registrados que nunca compraron | 547 |
| Importe de pedidos entregados en 2023 de los clientes perdidos | 233,137.70 (6.4 % del total de 2023) |

Si usaste otras definiciones (por ejemplo, contar solo pedidos entregados), tus números serán distintos: lo que importa es que estén escritas y que tus controles cierren.

</details>

## La segunda vuelta: en JupyterLab real, para tu portafolio

1. Descarga los CSV de `datos/` desde la práctica (clic derecho → Download).
2. Crea el proyecto con la estructura de carpetas de la lección 21, un entorno virtual y `requirements.txt`.
3. Ejecuta tu notebook: los números deben coincidir con los de la práctica.
4. Agrega un `README.md` con la pregunta, el enfoque, los hallazgos y cómo ejecutarlo.
5. Exporta a HTML sin código para la versión "para negocio" y súbelo todo a un repositorio (sin datos personales: estos son ficticios).

:::tip Cómo contarlo en una entrevista
"Recibí una pregunta ambigua sobre pérdida de clientes. Definí retención y pérdida, construí un notebook reproducible con funciones probadas y encontré que [hallazgo con número]. Recomendé [acción], con un impacto estimado de [monto], medible con [métrica]." Contexto, decisión, resultado con número.
:::

## Después de este curso

- **[SQL](#/m/sql)**: las mismas preguntas sobre tablas de millones de filas.
- **[PySpark](#/m/pyspark)** y [Databricks](#/databricks): el mismo análisis a escala, en notebooks sobre Spark.
- **[Power BI](#/m/powerbi)**: llevar tus hallazgos a un tablero que otros consultan.

:::ejercicio quiz
"¿Estamos perdiendo clientes?" ¿Qué haces primero?
- [ ] Graficar todo lo que se pueda
- [x] Definir por escrito qué es un cliente activo, perdido y retenido, y en qué período
- [ ] Contar las filas de clientes.csv
- [ ] Preguntar qué fórmula usar
:::

:::ejercicio quiz
Crecieron los clientes activos y también hubo clientes que se fueron. ¿Cómo lo presentas?
- [ ] Solo el crecimiento, que es la buena noticia
- [ ] Solo los perdidos, que es el problema
- [x] Las dos cosas: cuántos se fueron, cuántos llegaron y el neto, con la retención
- [ ] Ninguna, faltan datos
:::

:::ejercicio quiz
¿Qué incluye una recomendación útil?
- [ ] Todas las tablas del notebook
- [x] Qué hacer, el impacto estimado y cómo medir si funcionó
- [ ] La lista de funciones del .py
- [ ] Un gráfico por cada columna
:::
