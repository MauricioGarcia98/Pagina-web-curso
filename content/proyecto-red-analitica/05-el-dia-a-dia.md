---
titulo: El día a día - migraciones, correcciones, archivos que no llegan y preguntas médicas
nivel: Avanzado
duracion: 35
resumen: La red sigue funcionando y tus tablas también tienen que hacerlo. En los próximos días un laboratorio migra de sistema sin avisar, otro corrige un archivo, otro no entrega, una persona pide que borren sus datos y dirección médica, calidad y operaciones te hacen preguntas. Todo llega al tablero del equipo, con revisión automática.
objetivos: Atender incidentes de fuentes externas con postmortem | Responder preguntas médicas y operativas con definiciones claras | Aplicar el derecho al olvido en todas tus copias | Automatizar la ingesta y publicar indicadores en Power BI
prerrequisitos: proyecto-red-analitica-la-entrega
autoevaluacion: ¿Sabes contar pacientes distintos entre laboratorios? | ¿Sabes qué copias tuyas hay que limpiar en un derecho al olvido? | ¿Sabes de dónde sale la hora de llegada de un archivo?
---

## El tablero

<div data-red="tablero"></div>

Los tickets llegan con los días, según cuándo empezaste. Para las preguntas usa lo que te resulte más claro: Databricks, Excel o Jupyter, pero siempre con la definición del hilo.

:::trabajo Derecho al olvido: ¿dónde viven tus copias?
No alcanza con borrar de silver. Piensa en todas las copias que controlas: los archivos que bajaste a tu máquina, lo que subiste a bronze en el lago, las tablas de gold (que se recalculan), los extractos que mandaste por correo. Los archivos del SFTP son del laboratorio: no los puedes borrar, pero sí documentar que existen y que se eliminan a los 7 días.
:::

:::errores
- **Fijar la codificación para siempre**: Centro pasa de Latin-1 a UTF-8 y lo que antes arreglaba ahora rompe los acentos.
- **Leer columnas por posición**: una columna nueva en el medio corre todos los valores una posición.
- **Sumar el _v2 en vez de reemplazar**: los corregidos quedan duplicados.
- **Contar análisis en vez de pacientes**: una persona con dos análisis, o en dos laboratorios, cuenta una vez.
- **Comparar contra rangos con unidades mezcladas**: 7,2 mmol/L parece una glucosa bajísima si la comparas con 70–100.
:::

## Resumen

- Las fuentes externas **cambian sin avisar**: migraciones, reenvíos, archivos que faltan.
- Las preguntas de negocio empiezan por la **definición** (pacientes o análisis, qué día, qué unidad).
- El derecho al olvido alcanza a **todas tus copias**.
