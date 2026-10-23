---
titulo: Big data y computación distribuida
nivel: Básico
duracion: 20
resumen: Por qué una sola computadora no alcanza y cómo se reparte el trabajo entre muchas.
---

## El problema

Tu laptop procesa sin problema un archivo de 100 MB. ¿Y uno de 10 TB? No entra en memoria, no entra en el disco, y aunque entrara tardaría días. Ese es el mundo del **big data**, que se suele describir con las “V”:

- **Volumen**: terabytes o petabytes.
- **Velocidad**: datos que llegan sin parar (clics, sensores, transacciones).
- **Variedad**: tablas, JSON, logs, imágenes…

## La solución: dividir y conquistar

En vez de una computadora gigante (escalado **vertical**, caro y con límite), se usan **muchas computadoras normales trabajando en paralelo** (escalado **horizontal**). Ese grupo se llama **cluster**.

:::analogia Contar los votos de un país
Una persona sola tardaría meses en contar 30 millones de votos. Si repartes las urnas entre 10.000 mesas, cada una cuenta las suyas (**map**) y luego se suman los resultados parciales (**reduce**). Eso es exactamente **MapReduce**, la idea que dio origen al big data moderno.
:::

## Breve historia

| Año | Hito |
|---|---|
| 2004 | Google publica **MapReduce** |
| 2006 | Nace **Hadoop** (HDFS + MapReduce), open source |
| 2009 | **Spark** nace en la Universidad de Berkeley (AMPLab) |
| 2013 | Spark pasa a Apache; sus creadores fundan **Databricks** |
| 2014+ | Spark reemplaza a MapReduce: hasta 100× más rápido al trabajar en memoria |
| 2019 | Nace **Delta Lake** (transacciones ACID sobre el data lake) |

## ¿Qué es Apache Spark?

**Spark** es un **motor de procesamiento distribuido**: tú escribes qué quieres hacer con los datos (en SQL, Python, Scala, Java o R) y Spark se encarga de repartir el trabajo entre las máquinas del cluster, mover los datos entre ellas y recuperarse si una falla.

Sirve para:

- **ETL / ingeniería de datos** a gran escala (su uso principal).
- **SQL analítico** sobre data lakes.
- **Streaming** (procesar datos casi en tiempo real).
- **Machine learning** (MLlib) sobre grandes volúmenes.

:::nota ¿Necesito Spark?
No siempre. Si tus datos entran cómodamente en una máquina (pocos GB), pandas, Polars, DuckDB o un buen data warehouse pueden ser más simples. Spark brilla cuando el volumen es grande o crece sin límite, y cuando necesitas una plataforma unificada (Databricks).
:::

:::ejercicio quiz
¿Qué significa escalar **horizontalmente**?

- [ ] Comprar una computadora más potente
- [x] Agregar más computadoras que trabajan en paralelo
- [ ] Comprimir los datos
- [ ] Usar un monitor más ancho
:::

:::ejercicio quiz
En MapReduce, ¿qué hace la fase **reduce**?

- [ ] Divide los datos en pedazos
- [x] Combina los resultados parciales en un resultado final
- [ ] Borra los datos duplicados
- [ ] Comprime los archivos
:::
