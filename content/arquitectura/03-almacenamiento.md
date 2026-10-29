---
titulo: "Almacenamiento: warehouse, data lake y lakehouse"
nivel: Avanzado
duracion: 50
resumen: Las tres familias de almacenamiento analítico, los formatos de tabla abiertos (Delta, Iceberg, Hudi), cómo organizar los datos para leer menos y cuánto cuesta guardar.
objetivos: Comparar warehouse, data lake y lakehouse y elegir según el caso | Explicar qué agrega un formato de tabla (Delta, Iceberg, Hudi) sobre archivos Parquet | Elegir particionado y clustering para que las consultas lean menos datos | Estimar el costo de almacenar y de consultar, y bajarlo con capas de almacenamiento
prerrequisitos: arquitectura-que-es | spark-formatos-delta
autoevaluacion: ¿Puedes explicar en dos frases por qué existió el data lake y por qué apareció el lakehouse? | ¿Sabes qué problema resuelve el log de transacciones de Delta o Iceberg? | ¿Puedes elegir una columna de partición para una tabla de eventos? | ¿Puedes estimar cuántos bytes lee una consulta con y sin partition pruning? | ¿Sabes qué significa separar almacenamiento y cómputo?
---

:::escenario ¿Snowflake, Databricks o BigQuery?
Llegan tres vendedores a ofrecer su plataforma al Grupo Andino. Cada uno dice que la suya es "la única que necesitan". Martín te pide:

> "Antes de escuchar a los vendedores, quiero que entiendas qué tipo de almacenamiento propone cada uno y qué nos conviene. No me interesa la marca: me interesa el modelo."

Esta lección es sobre las tres grandes familias de almacenamiento analítico y las ideas que hay detrás. Con ellas puedes evaluar cualquier producto, incluso los que todavía no existen.
:::

## Tres generaciones

```diagrama
titulo: De dónde viene cada modelo: cada generación resolvió un problema de la anterior
nodo dw: Data warehouse | icono=almacen | col=0 | fila=0 | color=azul | sub=años 90: SQL rápido y confiable
nodo dl: Data lake | icono=bucket | col=1 | fila=0 | color=naranja | sub=2010: todo, barato, cualquier formato
nodo lh: Lakehouse | icono=capas | col=2 | fila=0 | color=verde | sub=2020: lake + transacciones
nodo p1: Caro y solo tablas | icono=x | col=0 | fila=1 | color=rojo | sub=no sirve para logs, imágenes, ML
nodo p2: "Pantano de datos" | icono=x | col=1 | fila=1 | color=rojo | sub=sin ACID, sin calidad, sin permisos finos
flecha dw -> p1: problema
flecha p1 -> dl: lo resuelve
flecha dl -> p2: problema
flecha p2 -> lh: lo resuelve
```

| | Data warehouse | Data lake | Lakehouse |
|---|---|---|---|
| **Qué es** | Una base de datos analítica: tablas, SQL, tipos | Archivos en almacenamiento de objetos (S3, ADLS, GCS) | Archivos abiertos en el lake + un formato de tabla con transacciones |
| **Formato** | Propietario (interno del producto) | Abierto: CSV, JSON, Parquet | Abierto: Parquet + Delta, Iceberg o Hudi |
| **Datos** | Estructurados | Cualquiera: tablas, logs, imágenes, audio | Cualquiera, con tablas confiables encima |
| **ACID, UPDATE, MERGE** | Sí | No | Sí |
| **Costo de almacenar** | Medio a alto | Muy bajo | Muy bajo |
| **Quién lo usa** | Analistas con SQL, BI | Ingenieros, científicos de datos | Todos: SQL, Python, ML |
| **Ejemplos** | Redshift, Synapse dedicado, Teradata, (y en la práctica BigQuery y Snowflake) | S3 + Athena, ADLS + Spark | Databricks, BigQuery + BigLake, Snowflake con Iceberg, Fabric |

:::nota Las fronteras se están borrando
Hoy BigQuery lee tablas Iceberg en GCS, Snowflake administra tablas Iceberg, y Databricks ofrece un SQL warehouse que se usa como un warehouse clásico. Por eso importa entender **el modelo**: ¿los datos quedan en un formato abierto, que puedes leer con otras herramientas, o encerrados en un producto?
:::

## Separar almacenamiento y cómputo

La idea más importante de las plataformas modernas: **los datos viven en un lugar barato (almacenamiento de objetos) y el cómputo se enciende solo cuando hace falta**.

```diagrama
titulo: Almacenamiento y cómputo separados: varios motores sobre los mismos datos
nodo st: Almacenamiento de objetos | icono=bucket | col=1 | fila=1 | color=naranja | sub=Parquet + Delta/Iceberg\nbarato, ilimitado
nodo c1: Spark (ETL) | icono=spark | col=0 | fila=0 | color=rojo | sub=se enciende de noche
nodo c2: SQL warehouse (BI) | icono=lupa | col=1 | fila=0 | color=azul | sub=horario de oficina
nodo c3: Notebook (ML) | icono=notebook | col=2 | fila=0 | color=violeta | sub=cuando un científico lo usa
flecha c1 <-> st
flecha c2 -> st: lee
flecha c3 -> st: lee
```

Ventajas: cada equipo usa el motor que necesita sin copiar los datos; el cómputo se escala o apaga por separado; si mañana aparece un motor mejor, los datos no se migran.

## Qué agrega un formato de tabla

Un montón de archivos Parquet en una carpeta **no es una tabla confiable**. Si un job falla a la mitad, quedan archivos a medias; si dos procesos escriben a la vez, se pisan; para borrar un cliente hay que reescribir archivos a mano.

Los **formatos de tabla abiertos** (Delta Lake, Apache Iceberg, Apache Hudi) agregan una capa de **metadatos**: un registro de qué archivos forman cada versión de la tabla.

```diagrama
titulo: Las capas de una tabla en un lakehouse
nodo motor: Motores | icono=spark | col=0 | fila=0 | sub=Spark, Trino, BigQuery, Snowflake
nodo cat: Catálogo | icono=lupa | col=1 | fila=0 | color=violeta | sub=Unity, Glue, Polaris: dónde está cada tabla
nodo meta: Metadatos / log | icono=archivo | col=2 | fila=0 | color=amarillo | sub=versiones, esquema, estadísticas
nodo pq: Archivos Parquet | icono=archivos | col=3 | fila=0 | color=naranja | sub=los datos
flecha motor -> cat: ¿dónde está ventas?
flecha cat -> meta: versión actual
flecha meta -> pq: estos archivos
```

| Formato | Origen | Fortaleza | Dónde se usa más |
|---|---|---|---|
| **Delta Lake** | Databricks (2019) | Integración total con Spark y Databricks | Databricks, Microsoft Fabric |
| **Apache Iceberg** | Netflix (2018) | El más neutral: lo leen casi todos los motores | AWS (Athena, Glue), Snowflake, BigQuery, Trino |
| **Apache Hudi** | Uber (2017) | Muy bueno para *upserts* frecuentes | Lagos con mucho CDC |

Los tres dan lo mismo en lo esencial: **ACID**, `MERGE`/`UPDATE`/`DELETE`, *time travel*, evolución de esquema y estadísticas para saltar archivos.

## Organizar los datos para leer menos

En analítica, el costo y el tiempo de una consulta dependen casi siempre de **cuántos bytes lee**. Tres técnicas, de la más gruesa a la más fina:

| Técnica | Qué hace | Ejemplo | Cuándo usarla |
|---|---|---|---|
| **Particionado** | Separa los archivos en carpetas por el valor de una columna | `fecha=2024-12-01/` | Columna de baja cardinalidad que casi siempre se filtra (la fecha) |
| **Clustering / Z-ORDER / Liquid** | Ordena los datos dentro de los archivos por columnas | Ordenar por `cliente_id` | Columnas de alta cardinalidad muy filtradas |
| **Estadísticas min/max** | Cada archivo guarda el mínimo y el máximo de cada columna | Saltar archivos que no contienen el valor buscado | Automático en Parquet, Delta e Iceberg |

Un ejemplo con números. La tabla `eventos_web` tiene 3 años de datos, 1 TB en total, y una consulta pide **un día**:

| Organización | Bytes leídos | Costo en BigQuery (≈ 6,25 USD por TB) |
|---|---|---|
| Sin particionar | 1 TB (todo) | ≈ 6,25 USD |
| Particionada por día | 1 TB ÷ 1.095 días ≈ 0,9 GB | ≈ 0,006 USD |
| Particionada + solo 3 de 30 columnas | ≈ 0,09 GB | ≈ 0,0006 USD |

Mil veces menos, con la misma consulta. Por eso las decisiones de almacenamiento son decisiones de **costo**.

## Capas de temperatura

No todos los datos se leen igual de seguido. Las nubes cobran distinto según la "temperatura":

| Capa | Ejemplo | Precio aproximado por GB/mes | Leer cuesta |
|---|---|---|---|
| Caliente (*hot*) | S3 Standard, GCS Standard, ADLS Hot | 0,020 – 0,023 USD | Casi nada |
| Fría (*cool / infrequent*) | S3 Standard-IA, GCS Nearline, ADLS Cool | 0,010 – 0,0125 USD | Un poco |
| Archivo | S3 Glacier, GCS Archive, ADLS Archive | 0,001 – 0,004 USD | Bastante, y puede tardar horas |

Una política típica: bronze de más de 90 días pasa a fría, de más de un año a archivo; silver y gold quedan calientes. Se configura una vez con **reglas de ciclo de vida** y se olvida.

<!-- estandar:errores -->
:::errores
- **Particionar por una columna de alta cardinalidad** (`cliente_id`, `timestamp`): millones de carpetas con archivos diminutos, y todo se vuelve más lento.
- **Archivos chicos**: miles de archivos de pocos KB porque cada micro-lote escribe uno. Se compactan con `OPTIMIZE` (Delta), *rewrite data files* (Iceberg) o configurando el tamaño de escritura.
- **Copiar los datos a cada herramienta**: un CSV para BI, otro para ML, otro para finanzas. Tres versiones de la verdad que nunca coinciden. Un solo almacenamiento con varios motores encima.
- **Elegir por la marca**: preguntar "¿Snowflake o Databricks?" antes de preguntar "¿quién usa los datos y cómo?".
:::

<!-- estandar:trabajo -->
:::trabajo
- La pregunta "¿formato abierto o cerrado?" tiene consecuencias de años: migrar 500 TB de un formato propietario cuesta meses. Muchas empresas eligen hoy Iceberg o Delta justamente para no quedar atadas a un proveedor.
- Los equipos de plataforma revisan todos los meses las **10 consultas más caras** (todas las nubes tienen tablas de sistema con esa información) y las optimizan. Suele ahorrar más que cualquier negociación con el proveedor.
- Las tablas de más de unos cientos de GB sin particionar ni clustering son una señal de alarma en cualquier revisión de arquitectura.
:::

<!-- estandar:entrevista -->
:::entrevista "¿Qué diferencia hay entre un data lake y un lakehouse?"
Un data lake son archivos en almacenamiento de objetos: barato y flexible, pero sin transacciones, sin `UPDATE` ni `MERGE` y difícil de gobernar. Un lakehouse agrega un formato de tabla abierto (Delta, Iceberg, Hudi) con un log de transacciones: así tienes ACID, *time travel*, evolución de esquema y estadísticas, manteniendo los datos en archivos abiertos y baratos que leen varios motores. Un buen cierre: "es tener la confiabilidad de un warehouse con el costo y la apertura de un lake".
:::

## Ejercicios

:::ejercicio quiz
Una tabla de 4 TB de clics se consulta casi siempre por día y, a veces, por `usuario_id`. ¿Cómo la organizas?

- [ ] Particionada por `usuario_id`
- [x] Particionada por fecha y con clustering (o Z-ORDER) por `usuario_id`
- [ ] Sin particionar, para que sea simple
- [ ] Un archivo CSV por usuario
:::

:::ejercicio quiz
¿Qué agrega un formato de tabla como Delta o Iceberg sobre una carpeta de archivos Parquet?

- [ ] Compresión
- [x] Un log de metadatos que da transacciones ACID, MERGE, time travel y evolución de esquema
- [ ] Un servidor de base de datos
- [ ] Convierte los datos a CSV
:::

:::ejercicio quiz
¿Qué significa "separar almacenamiento y cómputo"?

- [ ] Guardar los datos en dos lugares por seguridad
- [x] Los datos viven en almacenamiento barato y los motores de cómputo se encienden, escalan y apagan por separado, sin mover los datos
- [ ] Usar una computadora para guardar y otra para mirar
- [ ] Que el cómputo sea gratis
:::

:::ejercicio python titulo="¿Cuánto cuesta esta consulta?"
Escribe `costo_consulta(tb_total, dias_totales, dias_consultados, columnas_totales, columnas_leidas, particionada, usd_por_tb=6.25)`. Estima los TB leídos así: si la tabla está **particionada** por día, solo se leen los días consultados (`tb_total * dias_consultados / dias_totales`); si no, se lee todo. Después, como el formato es columnar, se multiplica por `columnas_leidas / columnas_totales`. Devuelve el costo en USD redondeado a 4 decimales.
```python inicial
def costo_consulta(tb_total, dias_totales, dias_consultados, columnas_totales, columnas_leidas, particionada, usd_por_tb=6.25):
    ...
```
```python solucion
def costo_consulta(tb_total, dias_totales, dias_consultados, columnas_totales, columnas_leidas, particionada, usd_por_tb=6.25):
    tb = tb_total * dias_consultados / dias_totales if particionada else tb_total
    tb *= columnas_leidas / columnas_totales
    return round(tb * usd_por_tb, 4)
```
```python test
assert costo_consulta(1, 1000, 1, 10, 10, False) == 6.25, "Sin particionar y con todas las columnas, se lee el TB completo"
assert costo_consulta(1, 1000, 1, 10, 10, True) == 0.0063
assert costo_consulta(2, 100, 10, 20, 2, True) == 0.125
assert costo_consulta(2, 100, 10, 20, 2, False) == 1.25
```
:::

:::ejercicio abierto titulo="Elige el almacenamiento para el Grupo Andino"
El grupo tiene: analistas que solo saben SQL y usan Power BI; dos científicos de datos que entrenan modelos en Python con imágenes de productos y logs de la app; un banco que exige que los datos queden en su país y poder auditar cada acceso; y un presupuesto ajustado. ¿Propones warehouse, lake o lakehouse? ¿Qué formato de tabla? ¿Cómo organizas y abaratas el almacenamiento? Justifica.
```solucion
Lakehouse: los analistas necesitan SQL rápido y confiable (como un warehouse) y los científicos necesitan acceso a archivos no estructurados y a Python (como un lake). Un lakehouse da las dos cosas sobre una sola copia de los datos.
Formato abierto (Delta o Iceberg): evita depender de un proveedor y permite que distintos motores lean lo mismo. Si la nube elegida es AWS, Iceberg tiene el mejor soporte (Athena, Glue, Redshift); si se elige Databricks, Delta.
Organización: bronze/silver/gold por empresa (un catálogo o esquema por empresa), tablas grandes particionadas por fecha y con clustering por las claves más filtradas; compactación programada para evitar archivos chicos.
Costos: separar almacenamiento y cómputo (SQL warehouse que se apaga fuera de horario, clústeres de ETL efímeros), ciclo de vida que pase bronze antiguo a capas frías, y revisión mensual de las consultas más caras.
Regulación del banco: almacenamiento en una región del país, cifrado con llaves propias, catálogo con permisos por grupo, enmascaramiento de datos personales y logs de auditoría de accesos.
```
:::
