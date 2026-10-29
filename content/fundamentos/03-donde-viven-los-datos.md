---
titulo: Dónde viven los datos - bases, lagos, warehouses y lakehouses
nivel: Básico
duracion: 40
resumen: La primera profundización del viaje. Por qué la base de la app (OLTP) y el almacén de análisis (OLAP) son sistemas distintos, cómo guardar por filas o por columnas cambia todo, qué es un data lake, un data warehouse y un lakehouse, y para qué sirven las particiones. Con un recorrido animado que muestra qué lee cada sistema para responder la misma pregunta.
objetivos: Diferenciar OLTP de OLAP por su uso, sus consultas y sus herramientas | Explicar por qué el almacenamiento por columnas acelera las consultas analíticas | Comparar data lake, data warehouse y lakehouse | Explicar qué es una partición y qué ahorra | Clasificar consultas reales como operativas o analíticas
prerrequisitos: fundamentos-el-viaje-de-una-compra
autoevaluacion: ¿Sabes dar un ejemplo de consulta OLTP y uno de OLAP? | ¿Sabes por qué Parquet es más rápido que CSV para sumar una columna? | ¿Sabes en qué se diferencian un lago y un warehouse? | ¿Sabes qué agrega un lakehouse (Delta, Iceberg)? | ¿Sabes qué significa "particionar por fecha"?
---

:::escenario
La gerente pregunta: "¿cuánto vendimos por país en 2024?". Un compañero propone correr la consulta directamente en la base de la tienda, "total, ahí están todos los pedidos". Tu líder dice que no, que esa consulta va al warehouse. ¿Por qué, si los pedidos son los mismos?
:::

## La idea en una frase

Los mismos datos se guardan de formas distintas según **para qué** se usan: para **operar** (registrar un pedido en milisegundos) o para **analizar** (sumar millones de pedidos). Ningún sistema hace bien las dos cosas a la vez.

## OLTP y OLAP

| | OLTP (operar) | OLAP (analizar) |
|---|---|---|
| Ejemplo de pregunta | "¿En qué estado está el pedido 10729?" | "¿Cuánto vendimos por país en 2024?" |
| Filas que toca cada consulta | Una o pocas | Millones |
| Operaciones | INSERT, UPDATE, lecturas por clave | Lecturas grandes, agregaciones |
| Quién la usa | La app, miles de clientes a la vez | Analistas, tableros, modelos |
| Diseño de las tablas | Normalizado: muchas tablas chicas sin repetir datos | Desnormalizado o estrella: pocas tablas anchas |
| Guarda | El estado **actual** | La **historia** |
| Ejemplos | PostgreSQL, MySQL, SQL Server, Oracle, DynamoDB | BigQuery, Snowflake, Redshift, Databricks SQL, Fabric |

Si la gerente corre su consulta en la base de la tienda, la base tiene que leer todos los pedidos de 2024 mientras miles de clientes intentan comprar: la app se pone lenta. Por eso el pipeline copia los datos a un sistema pensado para analizar.

## Filas o columnas: la diferencia que más importa

Una base OLTP guarda **por filas**: todos los datos de un pedido juntos. Ideal para "traer el pedido 10729 completo". Un almacén analítico guarda **por columnas**: todos los países juntos, todos los montos juntos. Ideal para "sumar el monto por país", porque solo lee esas dos columnas.

```recorrido
titulo: La misma pregunta en un almacén por filas y en uno por columnas
estacion q: La pregunta | icono=lupa
estacion filas: Por filas (OLTP) | icono=postgres
estacion cols: Por columnas (Parquet) | icono=parquet
estacion part: Particiones | icono=carpeta
estacion res: El resultado | icono=tabla
paso q: "¿Cuánto vendimos por país en 2024?"
La consulta necesita solo **tres** datos de cada pedido: la fecha (para filtrar 2024), el país y el importe. Las demás columnas (estado, canal, método de pago, cliente…) no importan.
>>> sql
SELECT pais, SUM(importe) AS ventas
FROM ventas
WHERE fecha >= '2024-01-01'
GROUP BY pais;
paso filas: Guardado por filas
En disco, cada fila está **entera y seguida**. Para leer el país y el importe de un pedido, el motor tiene que leer el bloque completo, con todas sus columnas. Para 4.633 pedidos de 2024 no es grave; para 400 millones, se leen cientos de GB que no se usan.
>>> texto
bloque 1: [10727|2024-10-19|Perú|web|entregado|efectivo|42.99]
          [10728|2024-10-19|España|app|entregado|tarjeta|615.20]
          [10729|2024-10-19|Colombia|web|entregado|tarjeta_debito|2852.66]
bloque 2: [10730|2024-10-19|México|tienda|cancelado|tarjeta|1290.00] ...

→ para sumar 1 columna se leen las 7
paso cols: Guardado por columnas
En un archivo **Parquet** (o en BigQuery, Snowflake, Delta), cada columna se guarda **junta**. El motor lee solo `fecha`, `pais` e `importe` y salta el resto. Además, una columna tiene valores parecidos (muchos "Colombia" seguidos), así que se **comprime** muchísimo.
>>> texto
columna pedido_id : 10727 10728 10729 10730 ...      (no se lee)
columna fecha     : 2024-10-19 ×4 ...               ✔ se lee
columna pais      : Perú España Colombia México ...  ✔ se lee
columna canal     : web app web tienda ...           (no se lee)
columna estado    : entregado ×3 cancelado ...       (no se lee)
columna importe   : 42.99 615.20 2852.66 1290.00 ... ✔ se lee

→ 3 de 7 columnas, comprimidas: se lee una fracción
paso part: Particiones: ni siquiera abrir lo que no hace falta
Si los archivos están organizados en carpetas por fecha (**particiones**), el motor descarta las carpetas de 2022 y 2023 sin abrirlas. Esto se llama *partition pruning* y es la razón por la que casi toda tabla grande se particiona por fecha.
>>> texto
s3://lago/gold/ventas/anio=2022/   ✘ se salta
s3://lago/gold/ventas/anio=2023/   ✘ se salta
s3://lago/gold/ventas/anio=2024/   ✔ se lee
    part-0000.parquet  (128 MB)
    part-0001.parquet  (128 MB)
paso res: El resultado
Mismo resultado, una fracción de los datos leídos. En los warehouses que cobran por datos escaneados (BigQuery, Athena), leer menos también significa **pagar menos**.
>>> tabla
pais,ventas
Colombia,1201480.15
España,1032217.40
Argentina,898760.02
```

:::nota Los números del recorrido
Salvo el pedido 10729, las filas y los totales del recorrido son ilustrativos. Los números reales de 2024 los calculas tú en los ejercicios.
:::

## Lago, warehouse y lakehouse

```diagrama
titulo: Tres formas de guardar los datos para analizar
nodo dl: Data lake | icono=bucket | col=0 | fila=0 | color=naranja | sub=archivos baratos en la nube\ncualquier formato
nodo dw: Data warehouse | icono=almacen | col=1 | fila=0 | color=azul | sub=tablas SQL rápidas\ny gobernadas
nodo lh: Lakehouse | icono=delta | col=2 | fila=0 | color=verde | sub=archivos del lago +\ntablas con transacciones
flecha dl -> lh: + formato de tabla (Delta, Iceberg) | paso=1 | explica=Un formato de tabla agrega al lago transacciones, versiones, esquema y borrado de filas, que antes solo tenía el warehouse.
flecha dw -> lh: + archivos abiertos y baratos | estilo=punteada | paso=2 | explica=Los warehouses también se acercan: hoy BigQuery, Snowflake y Fabric leen y escriben tablas Iceberg o Delta.
```

| | Data lake | Data warehouse | Lakehouse |
|---|---|---|---|
| Qué es | Archivos en almacenamiento de objetos (S3, ADLS, Cloud Storage) | Una base de datos analítica administrada | Un lago con un **formato de tabla** encima |
| Guarda | Cualquier cosa: CSV, JSON, Parquet, imágenes, logs | Tablas con esquema | Tablas Delta o Iceberg (archivos Parquet + un registro de transacciones) |
| Fuerte en | Barato, flexible, datos crudos y no estructurados | Velocidad, SQL, gobierno, simplicidad | Lo mejor de los dos: barato y abierto, con transacciones y versiones |
| Débil en | Sin transacciones: dos procesos escribiendo pueden romperlo | Más caro; formato cerrado | Requiere mantenimiento (compactar, limpiar versiones) |
| Ejemplos | S3 + Athena, ADLS, GCS | Snowflake, BigQuery, Redshift, Synapse | Databricks, Fabric (OneLake), Iceberg con Trino o Spark |

:::tip ¿Cuál se usa hoy?
La mayoría de las empresas medianas y grandes usan una arquitectura **medallón** (bronze, silver, gold) sobre un lakehouse o un warehouse, o las dos cosas: el lago para lo crudo y voluminoso, el warehouse o lakehouse para lo que consulta el negocio. No es una competencia: son herramientas para distintas partes del viaje.
:::

## Particiones, en una frase

**Particionar** es repartir una tabla en carpetas según el valor de una columna (casi siempre la fecha), para que las consultas que filtran por esa columna lean solo las carpetas que necesitan. La regla práctica: se particiona por la columna con la que **más se filtra**, y con particiones que no queden demasiado chicas (miles de archivos diminutos son un problema que verás en el módulo de Guardia).

## Práctica

:::ejercicio sql dificultad=Básico titulo="Una consulta OLTP"
Una consulta operativa típica: trae el cliente `1722` completo de la tabla `clientes`.
```sql solucion
SELECT * FROM clientes WHERE cliente_id = 1722;
```
```pista
`SELECT * FROM clientes WHERE cliente_id = 1722;`
```
```explicacion
Una fila, buscada por su clave primaria: el tipo de consulta para el que está hecha una base OLTP (con un índice, responde en milisegundos aunque haya millones de clientes).
```
:::

:::ejercicio sql ordenado dificultad=Intermedio titulo="Una consulta OLAP"
Ahora una analítica: por año (`strftime('%Y', fecha_pedido)`), la cantidad de pedidos distintos y las ventas (suma de cantidad × precio × (1 − descuento), 2 decimales). Ordena por año.
```sql inicial
SELECT strftime('%Y', p.fecha_pedido) AS anio,
       COUNT(DISTINCT p.pedido_id) AS pedidos,
       ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS ventas
FROM pedidos p
JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
GROUP BY ...
ORDER BY anio;
```
```pista
Agrupa por el alias del año: `GROUP BY anio`.
```
```sql solucion
SELECT strftime('%Y', p.fecha_pedido) AS anio,
       COUNT(DISTINCT p.pedido_id) AS pedidos,
       ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS ventas
FROM pedidos p
JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
GROUP BY anio
ORDER BY anio;
```
```explicacion
Esta consulta lee las 25.524 líneas de detalle para devolver 3 filas. Con 25 mil filas es instantánea; con 2.500 millones, en la base de la app, sería un problema. En un warehouse por columnas, particionado por fecha, es lo normal.
```
:::

:::ejercicio sql dificultad=Básico titulo="¿Cuántas columnas tiene la tabla?"
`pragma_table_info('pedidos')` devuelve una fila por cada columna de la tabla `pedidos`. Cuenta cuántas columnas tiene.
```sql inicial
SELECT COUNT(*) AS columnas
FROM pragma_table_info('...');
```
```pista
El nombre de la tabla va entre comillas: `pragma_table_info('pedidos')`.
```
```sql solucion
SELECT COUNT(*) AS columnas FROM pragma_table_info('pedidos');
```
```explicacion
7 columnas. La consulta de ventas por país usa 2 o 3: en un almacén por columnas, el resto ni se lee. En otros motores, la lista de columnas está en `information_schema.columns`.
```
:::

:::ejercicio sql ordenado dificultad=Intermedio titulo="Solo lo que hace falta"
Escribe la consulta "por columnas": pedidos por `canal` en 2024, leyendo solo las columnas `canal` y `fecha_pedido`. Devuelve `canal` y `pedidos`, de más a menos.
```sql solucion
SELECT canal, COUNT(*) AS pedidos
FROM pedidos
WHERE fecha_pedido >= '2024-01-01' AND fecha_pedido < '2025-01-01'
GROUP BY canal
ORDER BY pedidos DESC;
```
```pista
`WHERE fecha_pedido >= '2024-01-01' AND fecha_pedido < '2025-01-01'`, agrupa por `canal` y cuenta.
```
```explicacion
Evitar `SELECT *` y filtrar por la columna de partición son las dos costumbres que más reducen el costo en un warehouse que cobra por datos leídos.
```
:::

:::ejercicio quiz dificultad=Básico
¿Cuál de estas consultas es típica de un sistema **OLTP**?

- [ ] Ventas por mes de los últimos 3 años
- [x] Cambiar el estado del pedido 10729 a "enviado"
- [ ] Clientes que dejaron de comprar, por segmento
- [ ] Ticket promedio por canal y país
:::

:::ejercicio quiz dificultad=Básico
¿Por qué un archivo Parquet suele ser mucho más rápido que un CSV para sumar una columna?

- [ ] Porque Parquet guarda los datos en texto plano
- [x] Porque guarda cada columna junta y comprimida, así se lee solo la que se necesita
- [ ] Porque Parquet no permite valores nulos
- [ ] Porque Parquet ordena siempre los datos por fecha
:::

:::ejercicio quiz dificultad=Intermedio
¿Qué le agrega un formato de tabla como Delta Lake o Apache Iceberg a un data lake?

- [ ] Un lenguaje distinto de SQL
- [ ] Almacenamiento más barato que el de S3
- [x] Transacciones, versiones (time travel), esquema y la posibilidad de actualizar y borrar filas
- [ ] Un tablero para ver los datos
:::

:::ejercicio quiz dificultad=Intermedio
Una tabla de eventos de 3 TB está particionada por `fecha`. ¿Qué consulta lee **menos** datos?

- [ ] `SELECT * FROM eventos WHERE usuario_id = 42`
- [x] `SELECT COUNT(*) FROM eventos WHERE fecha = '2024-10-19'`
- [ ] `SELECT pais, COUNT(*) FROM eventos GROUP BY pais`
- [ ] `SELECT * FROM eventos ORDER BY fecha DESC LIMIT 10`
:::

:::ejercicio quiz dificultad=Intermedio
Tienes imágenes de productos, logs en JSON y tablas de ventas. Quieres guardarlo todo barato y sin decidir todavía cómo se va a usar. ¿Dónde?

- [x] En un data lake (almacenamiento de objetos)
- [ ] En la base OLTP de la tienda
- [ ] En un archivo Excel compartido
- [ ] Solo en el data warehouse
:::

:::ejercicio quiz dificultad=Básico
En un modelo **normalizado** (OLTP) los datos del cliente están en la tabla `clientes` y los pedidos guardan solo el `cliente_id`. ¿Para qué?

- [ ] Para que las consultas analíticas sean más rápidas
- [x] Para no repetir datos: si el cliente cambia su email, se actualiza en un solo lugar
- [ ] Porque SQL no permite repetir columnas
- [ ] Para ocupar más espacio
:::

:::errores
- **Analizar sobre la base de producción**: la app se pone lenta para los clientes. Se usa una réplica de lectura o, mejor, el warehouse.
- **`SELECT *` en un warehouse por columnas**: lee todas las columnas y paga por todas.
- **Particionar por una columna con millones de valores** (por ejemplo, `cliente_id`): miles de carpetas diminutas, más lento que no particionar.
- **Pensar que lago y warehouse compiten**: casi siempre conviven, cada uno en su parte del viaje.
:::

:::trabajo
En una entrevista o en tu primer día te van a preguntar "¿qué stack usan?". La respuesta casi siempre tiene esta forma: una o varias bases OLTP (PostgreSQL, MySQL, SQL Server), ingesta a un lago (S3, ADLS o GCS), un lakehouse o warehouse (Databricks, Snowflake, BigQuery, Fabric) con capas bronze, silver y gold, y herramientas de BI encima. Con esta lección ya sabes para qué está cada pieza.
:::

## Resumen

| Concepto | En una línea |
|---|---|
| OLTP | Operar: una transacción a la vez, estado actual |
| OLAP | Analizar: millones de filas, historia |
| Por filas / por columnas | Traer un registro completo / sumar pocas columnas de muchos registros |
| Data lake | Archivos baratos de cualquier tipo |
| Data warehouse | Tablas SQL rápidas y administradas |
| Lakehouse | Lago + formato de tabla con transacciones (Delta, Iceberg) |
| Partición | Carpetas por fecha para leer solo lo necesario |
