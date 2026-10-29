# area: Fundamentos

## Dato
alias: datos
nino: Un dato es **algo que anotamos** sobre el mundo. Si tu mamá escribe en una libreta "hoy compré 3 manzanas a 2 pesos", eso es un dato: guarda qué pasó, cuánto y cuándo. Un dato solo es como una figurita suelta; muchos datos juntos y ordenados son como un álbum completo que te cuenta una historia.
que: Un dato es un valor que registra un hecho o una característica: un número (`3`), un texto (`"manzanas"`), una fecha (`2024-12-01`), un sí/no. Por sí solo dice poco; cobra sentido junto con otros datos y su **contexto** (qué representa, de dónde viene, cuándo se tomó). La ingeniería de datos se ocupa de que los datos lleguen completos, correctos y a tiempo a quien los necesita.
ejemplo: En Tienda Andina, una venta genera varios datos: `pedido_id = 1042`, `cliente_id = 77`, `fecha = 2024-12-01`, `canal = 'app'`, `total = 359.97`. Juntos dicen: "el cliente 77 compró por la app el 1 de diciembre y gastó 359,97".
para: Todo lo que hace una empresa basada en datos (reportes, precios, detección de fraude, recomendaciones) empieza por registrar bien los datos de lo que pasa.
cuidado: Un dato sin contexto engaña: "total = 359.97", ¿en qué moneda?, ¿con o sin impuestos?, ¿antes o después del descuento? Por eso los datos se documentan.
ver: Base de datos, Tabla, Metadatos

## Base de datos
alias: database, BD
nino: Imagina una **biblioteca muy ordenada**: cada libro está en su estante, hay un fichero para encontrar cualquier cosa rápido y una bibliotecaria que no deja que nadie rompa o mezcle los libros. Una base de datos es esa biblioteca, pero para datos.
que: Un sistema que **guarda datos de forma organizada** y permite consultarlos y modificarlos de manera segura, aunque muchas personas o programas lo hagan a la vez. Las más comunes son **relacionales** (datos en tablas, se consultan con SQL: PostgreSQL, MySQL, SQL Server, SQLite); también existen las NoSQL (documentos, clave-valor, grafos).
ejemplo: La app de Rápido guarda cada pedido en una base PostgreSQL. Cuando un cliente pide comida, la app hace un `INSERT` en la tabla `pedidos`; cuando el restaurante lo acepta, un `UPDATE` cambia su estado.
para: Las aplicaciones usan bases de datos para guardar lo que pasa (pedidos, pagos, usuarios). Los equipos de datos las leen como **fuente** para llevar esa información al lago o al warehouse.
cuidado: La base de una aplicación no se usa para análisis pesados: una consulta enorme puede hacerla lenta para los clientes. Para eso se copian los datos a un warehouse o se lee de una réplica.
ver: Tabla, SQL, OLTP, Data warehouse

## Tabla
alias: tablas
nino: Una tabla es como una **planilla del colegio**: arriba están los títulos (nombre, edad, curso) y cada renglón es un alumno. Todos los renglones tienen las mismas columnas, así es fácil comparar y buscar.
que: La estructura básica de una base relacional: un conjunto de **filas** (registros) que comparten las mismas **columnas** (campos), cada una con un tipo de dato. Cada tabla representa un tipo de cosa (clientes, pedidos, productos) y suele tener una **clave primaria** que identifica cada fila.
ejemplo:
```text
clientes
cliente_id | nombre | ciudad
---------- | ------ | ---------
1          | Lucía  | Madrid
2          | Juan   | Guadalajara
```
para: Organizar los datos para poder consultarlos con SQL, unirlos con otras tablas y garantizar reglas (que no haya dos clientes con el mismo id, por ejemplo).
ver: Fila, Columna, Clave primaria, Schema

## Fila
alias: registro, row
nino: Cada **renglón** de la planilla. Si la tabla es la lista de alumnos, una fila es un alumno con todos sus datos: su nombre, su edad, su curso.
que: Una fila (o registro) es una ocurrencia de lo que representa la tabla: un cliente, un pedido, una lectura de un medidor. Tiene un valor para cada columna (o `NULL` si falta). Saber **qué representa exactamente una fila** se llama conocer el *grano* de la tabla.
ejemplo: En `pedidos`, la fila `(1042, 77, '2024-12-01', 'app', 'entregado')` es **un pedido**. En `detalle_pedidos`, cada fila es **un producto dentro de un pedido**: un mismo pedido aparece en varias filas.
para: Contar filas es la operación más básica del análisis (`COUNT(*)`): cuántos pedidos, cuántos clientes. Pero solo tiene sentido si sabes qué es una fila.
ver: Tabla, Columna, Granularidad

## Columna
alias: campo, atributo
nino: Cada **título de arriba** de la planilla: "nombre", "edad", "curso". En esa columna, todos los renglones guardan el mismo tipo de cosa: en la columna "edad" solo hay edades.
que: Una columna (o campo) es una característica que tienen todas las filas de una tabla, con un nombre y un **tipo de dato** (entero, texto, fecha…). Las restricciones de la columna (no nula, única, con valores permitidos) protegen la calidad de los datos.
ejemplo: La columna `total` de `pedidos` es de tipo decimal y guarda el importe de cada pedido; `estado` es texto y solo debería tener valores como `'entregado'`, `'cancelado'`, `'pendiente'`.
para: Elegir qué columnas mirar (`SELECT nombre, ciudad`), filtrar por ellas (`WHERE ciudad = 'Lima'`) y agrupar (`GROUP BY ciudad`).
ver: Tabla, Tipo de dato, Fila

## Tipo de dato
alias: data type, tipos de datos
nino: Es como decir **qué cosas caben en cada cajón**: en el cajón de "edad" solo van números enteros; en el de "nombre", letras; en el de "cumpleaños", fechas. Si intentas meter "doce" escrito en letras en el cajón de números, la computadora se confunde.
que: El tipo define qué valores acepta una columna y qué operaciones se pueden hacer con ella: `INTEGER`/`BIGINT` (enteros), `DECIMAL`/`NUMERIC` (decimales exactos, para dinero), `FLOAT`/`DOUBLE` (decimales aproximados), `VARCHAR`/`TEXT` (texto), `DATE`, `TIMESTAMP` (fecha y hora), `BOOLEAN`. Con el tipo correcto se puede sumar, comparar fechas u ordenar bien.
ejemplo: Si la fecha se guarda como texto `'01/12/2024'`, ordenar da `'01/12/2024' < '02/01/2024'` aunque enero de 2024 es anterior a diciembre. Como `DATE` (`2024-12-01`), se ordena correctamente y se puede restar.
para: Que las cuentas den bien, ahorrar espacio y detectar errores al cargar (un texto donde va un número salta enseguida).
cuidado: El dinero no se guarda como `FLOAT`: `0.1 + 0.2` da `0.30000000000000004`. Usa `DECIMAL` o enteros en centavos.
ver: Columna, Schema

## Schema
alias: esquema, estructura
nino: El schema es el **plano de la casa** antes de construirla: dice cuántas habitaciones hay, cómo se llaman y qué va en cada una. En datos, dice qué tablas existen, qué columnas tienen y de qué tipo es cada una.
que: La palabra se usa en dos sentidos: (1) la **estructura** de una tabla o archivo (columnas, tipos, restricciones); (2) en muchas bases, un **contenedor de tablas** dentro de una base o catálogo (por ejemplo `gold.fct_ventas`: esquema `gold`, tabla `fct_ventas`).
ejemplo:
```sql
CREATE TABLE pedidos (
  pedido_id  INTEGER PRIMARY KEY,
  cliente_id INTEGER NOT NULL,
  fecha      DATE,
  total      DECIMAL(10,2)
);
```
Ese `CREATE TABLE` es el schema de `pedidos`.
para: Saber qué esperar de los datos, validar lo que llega y evitar sorpresas: si una fuente cambia su schema (agrega o borra una columna), los pipelines pueden romperse.
cuidado: *Schema on write* (el warehouse exige el schema al guardar) vs. *schema on read* (el lago guarda archivos y el schema se aplica al leerlos). Lo segundo es flexible pero permite que entre basura.
ver: Tabla, Tipo de dato, Data contract

## Metadatos
alias: metadata
nino: Son **datos sobre los datos**, como la etiqueta de una caja de mudanza: no te dice qué hay dentro con detalle, pero sí "cocina, frágil, de la abuela, se empacó el lunes". Así sabes qué es sin abrirla.
que: Información que describe a los datos: de dónde vienen, quién es el dueño, cuándo se actualizaron, qué significa cada columna, cuántas filas hay, quién puede verlos, de qué otras tablas dependen (linaje). Se guardan en catálogos (Unity Catalog, Glue Data Catalog, Dataplex) y en la documentación de dbt.
ejemplo: Para la tabla `gold.fct_ventas`, los metadatos dicen: "una fila por línea de pedido; dueño: equipo de ventas; se actualiza a las 6:00; `importe` está en dólares y neto de descuento; viene de `stg_pedidos` y `stg_detalle`".
para: Encontrar los datos, confiar en ellos y usarlos bien. Sin metadatos, cada analista tiene que preguntar "¿qué significa esta columna?".
ver: Catálogo de datos, Linaje, Schema

## Data engineer
alias: ingeniero de datos, ingeniería de datos
nino: Es como el **plomero de una ciudad**, pero de datos: construye las cañerías que llevan el agua (los datos) desde los ríos (las aplicaciones) hasta las casas (los reportes y los científicos), se asegura de que el agua llegue limpia y a tiempo, y arregla las fugas.
que: La persona que diseña, construye y opera los **sistemas que mueven y transforman datos**: ingestas desde las fuentes, lagos y warehouses, pipelines con SQL, Python y Spark, orquestación, calidad, seguridad y costos. Trabaja con analistas, científicos de datos y equipos de producto, que son quienes usan los datos.
ejemplo: Un día típico: revisar que el pipeline nocturno corrió bien, investigar por qué faltaron pedidos de ayer, revisar el pull request de un compañero, modelar una tabla nueva en dbt para marketing, y mejorar un job de Spark que tarda demasiado.
para: Sin ingeniería de datos, cada análisis empieza copiando planillas a mano, y los números de cada área no coinciden.
cuidado: No es lo mismo que **analista de datos** (responde preguntas de negocio con los datos) ni que **científico de datos** (construye modelos estadísticos o de machine learning). Los tres trabajan juntos.
ver: Pipeline, ETL

## Pipeline
alias: pipeline de datos, tubería
nino: Una **cinta transportadora de una fábrica de galletas**: en un extremo entra la harina, pasa por la mezcladora, el horno, el empaquetado, y al final salen galletas listas. Un pipeline de datos toma datos crudos y, paso a paso, los convierte en datos listos para usar.
que: Una secuencia automatizada de pasos que **mueve y transforma datos** desde una o varias fuentes hasta un destino: extraer, limpiar, validar, unir, agregar, cargar. Se ejecuta en un horario (batch) o de forma continua (streaming), y lo coordina un orquestador.
ejemplo: El pipeline diario de Rápido: (1) copia los pedidos de ayer de Postgres a Parquet, (2) dbt los limpia (silver) y calcula el mart por ciudad (gold), (3) corre los controles de calidad, (4) si pasan, actualiza el tablero.
para: Que los datos lleguen solos, siempre de la misma manera, sin que nadie copie archivos a mano.
cuidado: Un buen pipeline es **idempotente** (correrlo dos veces da lo mismo), avisa cuando falla y se puede reprocesar un día cualquiera.
ver: ETL, Orquestación, Idempotencia

## ETL
alias: extract transform load
nino: Es como **hacer jugo**: primero **sacas** las naranjas del árbol (Extraer), después las **exprimes y cuelas** (Transformar) y al final **sirves** el jugo en el vaso (Cargar). En ETL, el jugo ya llega limpio al vaso.
que: **Extract, Transform, Load**: extraer de las fuentes, transformar en un sistema intermedio (un servidor con Python, Spark o una herramienta ETL) y cargar el resultado ya limpio en el destino (warehouse). Era el patrón clásico cuando el warehouse era caro y no convenía guardar datos crudos.
ejemplo: Un script de Python lee el CSV de ventas del ERP, corrige las fechas, convierte monedas a dólares, y recién entonces inserta las filas limpias en la tabla del warehouse.
para: Cuando hay que limpiar o anonimizar los datos **antes** de que lleguen al destino (por ejemplo, quitar datos personales).
ver: ELT, Pipeline

## ELT
alias: extract load transform
nino: Es como **llevar las naranjas enteras a la cocina** y guardarlas en la heladera; después, cuando quieras jugo, lo exprimes ahí mismo. Primero guardas todo, después lo transformas donde ya está.
que: **Extract, Load, Transform**: se copian los datos crudos al destino (lago o warehouse) y se transforman **dentro** de él, con SQL (normalmente con dbt). Es el patrón moderno porque el almacenamiento es barato y los warehouses son muy potentes.
ejemplo: Fivetran copia las tablas del ERP tal cual a BigQuery (`raw.erp_ventas`). Después, modelos de dbt crean `stg_ventas` (limpio) y `fct_ventas` (para análisis), todo con SQL dentro de BigQuery.
para: Tener siempre el dato crudo para reprocesar, separar la ingesta de la lógica de negocio y que la transformación la escriban personas que saben SQL.
cuidado: Guardar todo crudo implica cuidar la seguridad: los datos personales llegan al lago y hay que restringir quién los ve.
ver: ETL, dbt, Arquitectura medallón

## Batch
alias: procesamiento por lotes, lotes
nino: Es como **lavar la ropa una vez por semana**: juntas toda la ropa sucia y la lavas toda junta. No lavas cada media apenas te la sacas.
que: Procesar los datos **en bloques**, cada cierto tiempo (cada hora, cada noche), en lugar de uno por uno a medida que llegan. Es más simple, más barato y más fácil de reprocesar que el streaming. La mayoría de los pipelines de análisis son batch.
ejemplo: Todas las noches a las 2:00, un job procesa todos los pedidos del día anterior y actualiza las ventas diarias.
para: Reportes diarios, cierres contables, modelos que se reentrenan cada semana: cuando "los datos de ayer" son suficientes.
ver: Streaming, Latencia

## Streaming
alias: procesamiento en tiempo real, flujo
nino: Es como un **río**: el agua no llega en baldes una vez al día, fluye todo el tiempo. En streaming, cada dato se procesa apenas llega, segundos después de que pasó.
que: Procesar los datos **de forma continua**, evento por evento o en micro-lotes de segundos, con latencias de segundos o menos. Requiere herramientas como Kafka, Kinesis, Pub/Sub, Spark Structured Streaming o Flink, y conceptos como ventanas y marcas de agua.
ejemplo: Cada transacción con tarjeta del Banco Austral se analiza en el momento: si hay tres compras en otra ciudad en cinco minutos, se bloquea la tarjeta antes de la cuarta.
para: Fraude, alertas, precios dinámicos, seguimiento en vivo: cuando esperar a mañana no sirve.
cuidado: Es más caro y complejo que batch. Primero pregunta: "¿qué decisión se toma con este dato, y cuánto puede esperar?".
ver: Batch, Latencia, Kafka, Watermark

## Latencia
alias: frescura, freshness
nino: Es **cuánto tarda en llegar la noticia**. Si tu amigo te cuenta hoy lo que pasó hace una semana, la noticia tiene mucha latencia; si te escribe apenas pasa, tiene poca.
que: El tiempo entre que algo ocurre y el dato está disponible para usarse. Una tabla actualizada cada noche tiene una latencia de hasta 24 horas; un tablero en streaming, de segundos. La **frescura** (*freshness*) es cuán reciente es el último dato disponible.
ejemplo: La directora de Rápido ve a las 7:00 los datos de ayer: latencia de unas 7 a 31 horas según la hora del pedido. Para ella alcanza; para el equipo que reparte incentivos en horas pico, no.
para: Definir cuán rápido tiene que ser un pipeline (y cuánto cuesta). Los controles de **frescura** avisan si los datos no se actualizaron.
ver: Batch, Streaming, SLA

## API
alias: interfaz de programación
nino: Una API es como **el mozo de un restaurante**: tú no entras a la cocina; le pides al mozo lo que quieres de la carta, él va a la cocina y te trae el plato. La API es la carta y el mozo de un programa.
que: Una forma acordada para que un programa le pida datos o acciones a otro. Las más comunes en datos son **APIs REST**: se hace una petición HTTP a una URL (`GET https://api.ejemplo.com/pedidos?fecha=2024-12-01`) y se recibe una respuesta en JSON. Suelen pedir autenticación (un token) y limitar cuántas peticiones por minuto se pueden hacer.
ejemplo:
```python
import requests
r = requests.get("https://api.tipodecambio.com/v1/usd", params={"fecha": "2024-12-01"},
                 headers={"Authorization": "Bearer MI_TOKEN"}, timeout=10)
cotizacion = r.json()["valor"]
```
para: Ingerir datos de servicios externos (pagos, CRM, clima, tipos de cambio) y de las aplicaciones de la empresa.
cuidado: Las APIs devuelven los datos **por páginas** (paginación), tienen límites de uso y pueden fallar: hay que reintentar con espera y nunca escribir el token en el código.
ver: JSON, Ingesta

## CSV
alias: valores separados por comas
nino: Un CSV es una **lista escrita en un cuaderno** donde separas cada cosa con una coma: `Lucía,Madrid,25`. Cada renglón es una persona. Es tan simple que cualquier programa lo puede leer.
que: *Comma-Separated Values*: un archivo de texto donde cada línea es una fila y los valores van separados por comas (o punto y coma, o tabulaciones). La primera línea suele tener los nombres de las columnas. No guarda tipos de datos: todo es texto hasta que alguien lo interpreta.
ejemplo:
```text
cliente_id,nombre,ciudad
1,Lucía,Madrid
2,"Pérez, Juan",Lima
```
El nombre con coma va entre comillas para que no se confunda con un separador.
para: Intercambiar datos entre sistemas de forma simple (exportes de ERP, planillas, archivos que llegan por SFTP).
cuidado: Problemas típicos: separadores distintos, comas dentro de los textos, codificación (tildes rotas), fechas en formatos mezclados y números con coma decimal. Para guardar datos en un lago, mejor Parquet.
ver: JSON, Parquet

## JSON
alias: json
nino: JSON es como una **ficha con etiquetas**: "nombre: Lucía", "edad: 25", "mascotas: [gato, perro]". Cada cosa tiene su etiqueta, y una ficha puede tener otras fichas adentro, como una carpeta con subcarpetas.
que: *JavaScript Object Notation*: un formato de texto para datos con estructura de **clave–valor**, que admite listas y objetos anidados. Es el formato de casi todas las APIs y de muchos eventos. En un lago se guarda como JSON por línea (NDJSON: un objeto por línea).
ejemplo:
```json
{"pedido_id": 1042, "cliente": {"id": 77, "ciudad": "Lima"},
 "items": [{"producto": "Pizza", "cantidad": 2}, {"producto": "Gaseosa", "cantidad": 1}]}
```
para: Recibir datos de APIs y eventos con estructuras flexibles o anidadas.
cuidado: Para analizarlo hay que "aplanarlo": sacar `cliente.ciudad` a una columna y convertir la lista `items` en filas (con `explode` o `UNNEST`).
ver: CSV, API, explode

## Parquet
alias: archivo parquet
nino: Imagina una **caja de lápices de colores ordenada por color**: todos los rojos juntos, todos los azules juntos. Si solo necesitas los azules, sacas esa fila y listo, sin revolver toda la caja. Parquet guarda los datos así: **por columnas**.
que: Un formato de archivo **columnar**, binario, comprimido y con los **tipos de datos incluidos**. Guarda los valores de cada columna juntos, con estadísticas (mínimo, máximo) por bloque. Es el formato estándar de los lagos de datos y la base de Delta Lake e Iceberg.
ejemplo: Una tabla de pedidos de 2 GB en CSV ocupa unos 300 MB en Parquet. Una consulta `SELECT SUM(total) FROM pedidos WHERE fecha = '2024-12-01'` lee solo las columnas `total` y `fecha`, y salta los bloques cuya fecha máxima es anterior.
para: Guardar datos para análisis: ocupa menos, se lee mucho más rápido y no pierde los tipos.
cuidado: No se puede abrir con un editor de texto ni modificar una fila: se reescribe el archivo. Por eso existen los formatos de tabla (Delta, Iceberg) encima.
ver: Formato columnar, CSV, Delta Lake, Compresión

## Formato columnar
alias: almacenamiento columnar, columnar
nino: En una **planilla de notas**, en vez de guardar cada alumno en una hoja (todas sus notas juntas), guardas **cada materia en una hoja**: todas las notas de matemática juntas, todas las de lengua juntas. Si quieres el promedio de matemática, lees una sola hoja.
que: Guardar los datos **columna por columna** en lugar de fila por fila. Las consultas analíticas leen pocas columnas de muchas filas, así que leen mucho menos del disco; además, valores parecidos juntos se comprimen mucho mejor. Parquet, ORC y los warehouses (BigQuery, Snowflake, Redshift) son columnares.
ejemplo: `SELECT ciudad, COUNT(*) FROM clientes GROUP BY ciudad` en una tabla de 40 columnas lee solo 1 columna de 40 en un formato columnar.
para: Análisis rápido y barato (en BigQuery pagas por los bytes leídos: leer menos columnas es pagar menos).
cuidado: Los formatos por filas son mejores para las aplicaciones (OLTP), que leen y escriben filas completas de a una.
ver: Parquet, OLAP, OLTP

## Compresión
alias: comprimir
nino: Es como **empacar la valija sentándote encima**: entra lo mismo en menos espacio. Al llegar, la abres y está todo igual que antes.
que: Representar los datos con menos bytes sin perder información (compresión sin pérdida). Formatos comunes: Snappy (rápido, el estándar de Parquet), ZSTD (comprime más), GZIP. En formatos columnares, además se usan codificaciones como diccionario (guardar "Lima" una vez y luego un número) o run-length (guardar "Lima × 500").
ejemplo: Una columna `ciudad` con solo 10 ciudades distintas en 1 millón de filas ocupa muy poco con codificación de diccionario: 10 textos y un millón de números chicos.
para: Pagar menos almacenamiento y leer menos datos del disco o de la red (que suele ser lo más lento).
ver: Parquet, Formato columnar

## OLTP
alias: transaccional
nino: Es la **caja registradora** de un negocio: atiende a cada cliente rápido, uno por uno, anota cada venta al instante y no puede equivocarse con el cambio.
que: *Online Transaction Processing*: sistemas pensados para **muchas operaciones chicas y rápidas** (insertar un pedido, actualizar un estado, leer un cliente), con muchos usuarios a la vez y garantías ACID. Guardan datos por filas y normalizados. Ejemplos: PostgreSQL, MySQL, SQL Server, Oracle usados por las aplicaciones.
ejemplo: La app de Rápido inserta un pedido nuevo cada segundo y lo actualiza al aceptarlo, retirarlo y entregarlo. Cada operación toca una fila y tarda milisegundos.
para: Hacer funcionar las aplicaciones del negocio.
cuidado: No son para análisis grandes: sumar todos los pedidos de tres años en la base de la app puede ponerla lenta para los clientes.
ver: OLAP, ACID, Base de datos

## OLAP
alias: analítico
nino: Es el **contador que, a fin de mes, mira todas las ventas juntas** para sacar conclusiones: cuánto se vendió por mes, qué producto se vende más. No atiende clientes; analiza montañas de datos de una vez.
que: *Online Analytical Processing*: sistemas pensados para **consultas grandes** que leen millones de filas y pocas columnas, agregan y comparan. Guardan los datos en formato columnar y suelen estar desnormalizados (modelos dimensionales). Ejemplos: BigQuery, Snowflake, Redshift, Databricks SQL, DuckDB.
ejemplo: "Ventas por categoría y mes de los últimos 3 años, comparadas con el año anterior" recorre millones de filas en segundos en un warehouse.
para: Reportes, tableros, análisis y ciencia de datos.
ver: OLTP, Data warehouse, Formato columnar

## Idempotencia
alias: idempotente
nino: Un botón de ascensor es idempotente: si aprietas "piso 5" una vez o diez veces, el ascensor va al piso 5 igual. No va diez veces. Un proceso idempotente da **el mismo resultado aunque lo repitas**.
que: Una operación es idempotente si ejecutarla una o varias veces deja el sistema en el mismo estado. En pipelines significa que reprocesar un día **no duplica** ni corrompe datos: se reemplaza la partición del día (overwrite) o se hace MERGE por clave, nunca un `INSERT` a ciegas.
ejemplo: La ingesta de Rápido escribe `bronze/pedidos/fecha=2024-12-01/pedidos.parquet` y lo sobrescribe si ya existe. Si Airflow la reintenta tras un fallo, el resultado es el mismo: los pedidos de ese día aparecen una sola vez.
para: Poder reintentar y reprocesar sin miedo. Es la propiedad más importante de un pipeline confiable.
cuidado: `INSERT INTO ventas SELECT … FROM pedidos_de_hoy` no es idempotente: si corre dos veces, duplica las ventas.
ver: Pipeline, MERGE, Backfill

## Escalabilidad
alias: escalar
nino: Una **pizzería** que hoy hace 10 pizzas por hora y mañana tiene que hacer 1.000: si puede contratar más cocineros y poner más hornos y seguir funcionando, "escala". Si se traba, no escala.
que: La capacidad de un sistema de manejar **más datos o más usuarios** agregando recursos. **Vertical**: una máquina más grande (más memoria y CPU), tiene un límite. **Horizontal**: más máquinas que reparten el trabajo (como Spark o BigQuery), casi sin límite pero más complejo.
ejemplo: Un script de pandas procesa los pedidos de un mes en una laptop; con 5 años de pedidos de 20 países no entra en memoria. Pasarlo a Spark permite repartirlo entre 20 máquinas.
para: Elegir herramientas que aguanten el crecimiento sin rehacer todo.
cuidado: No hace falta Spark para todo: muchos datos "grandes" entran en una sola máquina con DuckDB. Escalar tiene costo.
ver: Spark, Cluster
