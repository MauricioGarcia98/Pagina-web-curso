# Evaluación del sitio en modo estudiante (desde cero)

Revisión hecha recorriendo el sitio como una persona que no sabe nada de datos ni de programación. Para cada hallazgo: qué se nota, por qué importa, qué se hizo y qué queda.

## Lo que ya estaba bien

- **El contenido tiene profundidad real**: cada lección explica con escenario, analogía, ejemplos ejecutables, errores frecuentes, trabajo real y preguntas de entrevista.
- **Se practica sin instalar nada**: SQL real (SQLite, PostgreSQL), Python 3.14 con pandas 3, PySpark, dbt, Airflow y una terminal con las CLIs de la nube.
- **La corrección es inmediata** y hay 2.171 ejercicios validados automáticamente.
- **Fundamentos** arranca bien: explica qué es un dato, usa la analogía del agua potable y sigue una compra real de punta a punta con un recorrido animado.

## Hallazgos y lo que se hizo

| # | Hallazgo (como estudiante) | Por qué importa | Qué se hizo |
|---|---|---|---|
| 1 | La portada habla de "CLIs", "PySpark", "dbt" en el primer párrafo | Quien empieza no sabe qué es nada de eso: la primera impresión es "esto no es para mí" | Portada reescrita: primero qué hace un ingeniero de datos, en palabras simples; después las herramientas con una frase cada una |
| 2 | 27 módulos en una lista plana | No se sabe por dónde seguir ni qué es opcional | Módulos agrupados en **9 etapas** (Empieza aquí → SQL → Programar → … → Certificaciones opcionales) en la barra lateral, la portada y la ruta |
| 3 | Números desactualizados ("8 empresas", "+200.000 filas") | Resta credibilidad | Actualizados a 13 empresas y más de 500.000 filas |
| 4 | Palabras técnicas que aparecen sin explicación inmediata (data lake, OLTP, job, pipeline…) | Un estudiante desde cero se pierde en la primera lección | **Glosario en línea**: la primera aparición de cada término del glosario (328) en cada lección queda subrayada y muestra su explicación simple al pasar el mouse o tocarla |
| 5 | Más de la mitad de las lecciones sin ningún apoyo visual; en SQL y Python, casi ninguna | En SQL y Python lo difícil es imaginar qué pasa "por dentro" | **19 recorridos animados** nuevos con datos reales: SELECT, WHERE, ORDER BY/LIMIT, NULL, agregaciones, GROUP BY/HAVING, CASE, JOIN/LEFT JOIN, CTE, ventanas; variables, condicionales, acumulador, diccionarios, funciones, errores en Python; evaluación perezosa de Spark, `dbt run` por dentro y la vida de una ejecución de Airflow. Cobertura visual: de 118 a 136 lecciones |
| 6 | Unos 800 ejercicios sin pista: al trabarse, la única salida era ver la solución | Ver la solución completa no enseña; es la causa más común de abandono | **Pistas progresivas automáticas**: (1) qué piezas hacen falta (tablas y cláusulas, funciones y estructuras, comando y opciones) y (2) el esqueleto de la solución con los detalles tapados. Quedan sin pista 81 (79 de terminal sin solución escrita y 2 de SQL) |
| 7 | Después de esa primera tanda, 129 lecciones seguían sin ningún visual (PySpark y Pipelines en 0) | Sin ver los datos cambiar paso a paso, lo abstracto no se fija | **Las 265 lecciones tienen ahora un recorrido, un diagrama o capturas guiadas**: 129 recorridos nuevos. Cada uno sigue un caso concreto (un préstamo, un cliente, un pedido, una ejecución) con datos reales de la base del curso, salidas obtenidas de la terminal del curso o código ejecutado. Lo que es ilustrativo se marca como ejemplo |

## Lo que queda (priorizado)

1. ~~Recorridos o diagramas en las 129 lecciones sin visual~~ (hecho: hallazgo 7).
2. **Capturas reales** en las guías de Databricks Free Edition, Azure y el proyecto de Genie (los recuadros "captura pendiente" ya indican qué capturar y con qué nombre).
3. **Una prueba de diagnóstico inicial** (5 a 10 preguntas) que recomiende en qué etapa empezar a quien ya sabe algo de SQL o Python.
4. **Pistas para los 79 ejercicios de terminal** que no tienen solución escrita (agregar el bloque `solucion` permite generarlas solas).
5. **Glosario**: sumar los términos que hoy no tienen entrada y aparecen seguido (por ejemplo, "warehouse" a secas, "job", "endpoint"), para que también se expliquen en línea.
6. **Ritmo**: indicar en cada etapa cuántas semanas lleva a 1 hora por día, y un recordatorio de repaso semanal con las tarjetas.
