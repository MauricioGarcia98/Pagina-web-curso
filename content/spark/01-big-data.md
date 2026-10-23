---
titulo: Big data y computación distribuida
nivel: Básico
duracion: 35
resumen: Por qué una sola computadora no alcanza y cómo se reparte el trabajo entre muchas.
---

## El problema

Tu laptop procesa sin problema un archivo de 100 MB: lo abres con pandas y en un segundo tienes el resultado. ¿Y uno de 10 TB?

Hagamos la cuenta. Un buen disco lee unos 500 MB por segundo:

```text
10 TB = 10.000.000 MB
10.000.000 MB ÷ 500 MB/s = 20.000 segundos ≈ 5,5 horas   ← solo para LEER el archivo una vez
```

Y eso suponiendo que los 10 TB entren en tu disco (no entran) y que no necesites tenerlos en memoria (tu laptop tiene 16 GB de RAM, unas 600 veces menos). Ese es el mundo del **big data**: volúmenes que **no caben** o **no se pueden procesar a tiempo** en una sola computadora.

Se suele describir con las "V":

- **Volumen**: terabytes o petabytes. Un banco mediano genera millones de transacciones por día; una app de streaming, miles de millones de eventos de reproducción.
- **Velocidad**: datos que llegan sin parar (clics, sensores, transacciones) y que hay que procesar en minutos, no en días.
- **Variedad**: no solo tablas. También JSON de APIs, logs de servidores, imágenes, audio.

:::nota ¿Cuánto es "big"?
No hay un número mágico. Una regla práctica: si los datos que procesas en un job **no entran en la memoria de una máquina grande** (cientos de GB), o crecen cada mes sin límite, estás en territorio de big data.
:::

## La solución: dividir y conquistar

Hay dos formas de conseguir más potencia:

| | Escalado vertical (*scale up*) | Escalado horizontal (*scale out*) |
|---|---|---|
| Qué haces | Compras una máquina más grande | Agregas más máquinas normales |
| Límite | El servidor más grande que exista | Prácticamente ninguno |
| Costo | Crece muy rápido: el doble de potencia cuesta mucho más del doble | Crece de forma lineal |
| Si falla | Se cae todo | Se cae una máquina y las demás siguen |

El big data moderno usa el escalado **horizontal**: muchas computadoras normales trabajando en paralelo. A ese grupo de máquinas se lo llama **clúster** (en inglés, *cluster*), y a cada máquina, **nodo**.

Volvamos a los 10 TB. Si los repartes entre **100 máquinas**, a cada una le tocan 100 GB. Cada una lee lo suyo en unos 3 minutos y, como trabajan **al mismo tiempo**, el trabajo completo tarda esos mismos 3 minutos en vez de 5,5 horas.

:::analogia Contar los votos de un país
Una persona sola tardaría meses en contar 30 millones de votos. Si repartes las urnas entre 10.000 mesas, cada una cuenta las suyas (**map**) y luego se suman los resultados parciales (**reduce**). Eso es exactamente **MapReduce**, la idea que dio origen al big data moderno.
:::

### MapReduce paso a paso

Supongamos que quieres saber cuántos pedidos hay por país, y los pedidos están repartidos en tres máquinas:

```text
              Máquina 1              Máquina 2              Máquina 3
DATOS      Chile, Perú, Chile     Perú, México, Chile    México, México, Perú

MAP        Chile:2  Perú:1        Perú:1 México:1        México:2  Perú:1
(cada una     (cuenta sus propios datos, sin hablar con nadie)
 cuenta lo suyo)
                     ─────────  SHUFFLE  ─────────
              (se envían todos los "Chile" a una máquina, todos los "Perú" a otra…)

REDUCE     Chile: 2+1 = 3         Perú: 1+1+1 = 3        México: 1+2 = 3
(cada una suma los parciales de su país)
```

Las tres fases son la base de todo lo que hace Spark:

1. **Map**: cada máquina procesa **su parte** de los datos de forma independiente. Es lo que hace que escale: con el doble de máquinas, cada una tiene la mitad de trabajo.
2. **Shuffle**: se **mueven datos por la red** para juntar en la misma máquina todo lo que va junto (todos los registros de Chile). Es la parte cara, porque la red es mucho más lenta que la memoria.
3. **Reduce**: cada máquina combina lo que recibió y produce el resultado final.

Puedes simular la idea en Python puro:

```python
from collections import Counter

# Los datos ya vienen repartidos en 3 "máquinas" (particiones)
particiones = [
    ["Chile", "Perú", "Chile"],
    ["Perú", "México", "Chile"],
    ["México", "México", "Perú"],
]

# MAP: cada partición cuenta lo suyo, sin mirar a las demás
parciales = [Counter(p) for p in particiones]
print("Parciales:", parciales)

# SHUFFLE + REDUCE: se combinan los parciales por país
total = Counter()
for parcial in parciales:
    total += parcial
print("Total:", dict(total))
```

Spark hace exactamente esto, pero con miles de particiones, en cientos de máquinas, y encargándose solo del reparto, de la red y de los fallos.

## Breve historia

| Año | Hito |
|---|---|
| 2004 | Google publica el paper de **MapReduce** |
| 2006 | Nace **Hadoop** (HDFS + MapReduce), open source |
| 2009 | **Spark** nace en la Universidad de Berkeley (AMPLab) |
| 2013 | Spark pasa a la fundación Apache y sus creadores fundan **Databricks** |
| 2014+ | Spark reemplaza a MapReduce: hasta 100× más rápido al trabajar en memoria |
| 2019 | Nace **Delta Lake** (transacciones ACID sobre el data lake) |

¿Por qué Spark le ganó a Hadoop MapReduce? Porque MapReduce **escribía en disco después de cada paso**. Un proceso de 10 pasos leía y escribía el disco 10 veces. Spark mantiene los datos intermedios **en memoria** siempre que puede, y es mucho más fácil de programar: lo que en MapReduce eran 100 líneas de Java, en Spark es una línea de SQL o de Python.

## ¿Qué es Apache Spark?

**Spark** es un **motor de procesamiento distribuido**. Tú escribes **qué** quieres hacer con los datos (en SQL, Python, Scala, Java o R) y Spark se encarga del **cómo**: reparte el trabajo entre las máquinas del clúster, mueve los datos entre ellas y se recupera si una falla.

```python norun
# Esto es todo lo que escribes. Spark decide cómo repartirlo en 100 máquinas.
ventas = spark.read.parquet("s3://lake/ventas/")              # 10 TB
ventas.groupBy("pais").sum("total").write.parquet("s3://lake/gold/ventas_por_pais/")
```

Se compone de varias librerías sobre un mismo motor:

| Componente | Para qué |
|---|---|
| **Spark SQL y DataFrames** | Tablas, SQL y transformaciones. Es lo que vas a usar el 90 % del tiempo |
| **Structured Streaming** | Procesar datos que llegan sin parar, casi en tiempo real |
| **MLlib** | Machine learning distribuido |
| **Spark Core** | El motor de abajo: tareas, memoria, red, recuperación de fallos |

Sirve para:

- **ETL e ingeniería de datos** a gran escala (su uso principal).
- **SQL analítico** sobre data lakes.
- **Streaming**: procesar datos casi en tiempo real.
- **Machine learning** (MLlib) sobre grandes volúmenes.

:::nota ¿Necesito Spark?
No siempre. Si tus datos entran cómodamente en una máquina (pocos GB), pandas, Polars, DuckDB o un buen data warehouse pueden ser más simples y más baratos. Spark brilla cuando el volumen es grande o crece sin límite, y cuando necesitas una plataforma unificada (Databricks). Coordinar un clúster tiene un costo fijo: para 50 MB, Spark es **más lento** que pandas.
:::

## Resumen

- Big data = datos que no caben o no se procesan a tiempo en una sola máquina.
- La solución es el escalado horizontal: un clúster de muchas máquinas en paralelo.
- MapReduce: cada máquina procesa lo suyo (map), se juntan los datos relacionados (shuffle) y se combinan (reduce).
- El shuffle es la parte cara, porque mueve datos por la red. Vas a escuchar esa palabra durante todo el módulo.
- Spark hace todo esto por ti, en memoria, y con una API sencilla en SQL o Python.

## Ejercicios

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
