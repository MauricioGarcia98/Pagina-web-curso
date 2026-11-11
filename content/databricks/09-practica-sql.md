---
titulo: Práctica autocorregida — Databricks SQL y pipelines
nivel: Intermedio
duracion: 60
resumen: 15 ejercicios que se corrigen solos sobre Delta Lake, MERGE, time travel, COPY INTO, QUALIFY, expectativas y AUTO CDC (SCD tipo 1 y 2).
---

:::tip Cómo funcionan estos ejercicios
Cada ejercicio corre en un **catálogo limpio** (un metastore propio del ejercicio, no el tuyo): primero se crean las tablas del *setup*, después se ejecuta **tu código** y al final una **consulta de control**. Tu resultado se compara con el de la solución. Por eso no importa cómo lo escribas: importa **en qué estado quedan las tablas**, como en el trabajo real.

Lo que escribas acá no cambia tu catálogo del [Databricks de práctica](#/databricks/sql). Si quieres seguir probando con tus propias tablas, usa ese editor.
:::

Antes de empezar repasa [Delta Lake en la práctica](#/l/databricks-delta-sql). En todos los ejercicios el catálogo actual es `main` y el esquema `default`, así que `clientes` es `main.default.clientes`.

:::analogia En palabras simples
Esta lección es el gimnasio después de la teoría: ejercicios que se corrigen solos para que practiques el SQL de Databricks (tablas Delta, MERGE, historial) hasta que te salga sin mirar.
:::

## Tablas Delta: crear, cargar y modificar

:::ejercicio dbsql dificultad=Básico titulo="Crear una tabla Delta y cargarla"
Crea la tabla **`productos`** con las columnas `id INT`, `nombre STRING` y `precio DOUBLE`, y carga estos tres productos: (1, 'Mate', 3500), (2, 'Bombilla', 1800), (3, 'Termo', 12000).
```sql check
SELECT * FROM productos ORDER BY id
```
```sql solucion
CREATE TABLE productos (id INT, nombre STRING, precio DOUBLE);
INSERT INTO productos VALUES (1, 'Mate', 3500), (2, 'Bombilla', 1800), (3, 'Termo', 12000);
```
```pista
Son dos sentencias separadas por `;`: un `CREATE TABLE … (columna TIPO, …)` y un `INSERT INTO … VALUES (…), (…)`.
```
:::

:::ejercicio dbsql dificultad=Básico titulo="Subir precios y borrar un producto"
Aumenta un **10 %** el precio de los productos que cuestan **menos de 5000** y borra el producto con `id = 4`.
```sql setup
CREATE TABLE productos (id INT, nombre STRING, precio DOUBLE);
INSERT INTO productos VALUES (1, 'Mate', 3500), (2, 'Bombilla', 1800), (3, 'Termo', 12000), (4, 'Yerbera', 4200);
```
```sql check
SELECT id, nombre, ROUND(precio, 2) AS precio FROM productos ORDER BY id
```
```sql solucion
UPDATE productos SET precio = precio * 1.1 WHERE precio < 5000;
DELETE FROM productos WHERE id = 4;
```
:::

:::ejercicio dbsql dificultad=Intermedio titulo="Tabla resumen con CTAS"
Crea la tabla **`ventas_por_canal`** a partir de `samples.tienda.pedidos` con una fila por `canal` y la columna `pedidos` (cantidad de pedidos). Usa `CREATE TABLE … AS SELECT` (CTAS).
```sql check
SELECT * FROM ventas_por_canal ORDER BY canal
```
```sql solucion
CREATE TABLE ventas_por_canal AS
SELECT canal, COUNT(*) AS pedidos
FROM samples.tienda.pedidos
GROUP BY canal;
```
```pista
`samples` es de solo lectura, pero puedes leerlo y escribir el resultado en `main.default`.
```
:::

## MERGE INTO: upsert y sincronización

:::ejercicio dbsql dificultad=Intermedio titulo="Upsert de clientes con MERGE"
Llegó la tabla `clientes_nuevos` con cambios. Aplícala a `clientes`: si el `id` ya existe, **actualiza** nombre y ciudad; si no existe, **insértalo**.
```sql setup
CREATE TABLE clientes (id INT, nombre STRING, ciudad STRING);
INSERT INTO clientes VALUES (1, 'Ana', 'Rosario'), (2, 'Beto', 'Salta'), (3, 'Caro', 'Mendoza');
CREATE TABLE clientes_nuevos (id INT, nombre STRING, ciudad STRING);
INSERT INTO clientes_nuevos VALUES (2, 'Beto', 'Jujuy'), (4, 'Dani', 'Neuquén');
```
```sql check
SELECT * FROM clientes ORDER BY id
```
```sql inicial
MERGE INTO clientes AS t
USING clientes_nuevos AS s
ON …
WHEN MATCHED THEN …
WHEN NOT MATCHED THEN …
```
```sql solucion
MERGE INTO clientes AS t
USING clientes_nuevos AS s
ON t.id = s.id
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *
```
```pista
La condición de cruce es por la clave: `ON t.id = s.id`. Con las mismas columnas en las dos tablas puedes usar `UPDATE SET *` e `INSERT *`.
```
:::

:::ejercicio dbsql dificultad=Avanzado titulo="MERGE que también borra"
La tabla `cambios` trae una columna `op`: `'U'` (alta o cambio) o `'D'` (baja). Aplica los cambios a `clientes`: borra los que vienen con `'D'`, actualiza los que existen y llegan con `'U'`, e inserta los nuevos con `'U'`. La columna `op` **no** existe en `clientes`.
```sql setup
CREATE TABLE clientes (id INT, nombre STRING, ciudad STRING);
INSERT INTO clientes VALUES (1, 'Ana', 'Rosario'), (2, 'Beto', 'Salta'), (3, 'Caro', 'Mendoza');
CREATE TABLE cambios (id INT, nombre STRING, ciudad STRING, op STRING);
INSERT INTO cambios VALUES (1, 'Ana', 'Córdoba', 'U'), (3, NULL, NULL, 'D'), (5, 'Eli', 'Ushuaia', 'U');
```
```sql check
SELECT * FROM clientes ORDER BY id
```
```sql solucion
MERGE INTO clientes AS t
USING cambios AS s
ON t.id = s.id
WHEN MATCHED AND s.op = 'D' THEN DELETE
WHEN MATCHED THEN UPDATE SET nombre = s.nombre, ciudad = s.ciudad
WHEN NOT MATCHED AND s.op = 'U' THEN INSERT (id, nombre, ciudad) VALUES (s.id, s.nombre, s.ciudad)
```
```pista
Las cláusulas `WHEN` se evalúan en orden: pon primero `WHEN MATCHED AND s.op = 'D' THEN DELETE`.
```
```pista
Como `cambios` tiene una columna de más, no sirve `UPDATE SET *`: nombra las columnas (`SET nombre = s.nombre, …`) y en el `INSERT` también.
```
:::

:::ejercicio dbsql dificultad=Avanzado titulo="Sincronizar con NOT MATCHED BY SOURCE"
`stock_hoy` es la foto completa del stock de hoy. Deja `stock` **igual** a esa foto: actualiza cantidades, inserta productos nuevos y **borra** los que ya no aparecen en `stock_hoy`.
```sql setup
CREATE TABLE stock (producto STRING, cantidad INT);
INSERT INTO stock VALUES ('mate', 10), ('termo', 4), ('yerbera', 7);
CREATE TABLE stock_hoy (producto STRING, cantidad INT);
INSERT INTO stock_hoy VALUES ('mate', 8), ('termo', 4), ('bombilla', 20);
```
```sql check
SELECT * FROM stock ORDER BY producto
```
```sql solucion
MERGE INTO stock AS t
USING stock_hoy AS s
ON t.producto = s.producto
WHEN MATCHED THEN UPDATE SET cantidad = s.cantidad
WHEN NOT MATCHED THEN INSERT *
WHEN NOT MATCHED BY SOURCE THEN DELETE
```
```pista
`WHEN NOT MATCHED BY SOURCE` toma las filas del **destino** que no tienen pareja en el origen.
```
:::

## Historial y time travel

:::ejercicio dbsql dificultad=Intermedio titulo="Leer una versión anterior"
Alguien corrió un `UPDATE` que puso todos los precios en 0. Sin cambiar la tabla, devuelve **cómo estaba `productos` en la versión 1** (después del INSERT y antes del UPDATE), ordenado por `id`.
```sql setup
CREATE TABLE productos (id INT, nombre STRING, precio DOUBLE);
INSERT INTO productos VALUES (1, 'Mate', 3500), (2, 'Bombilla', 1800);
UPDATE productos SET precio = 0;
```
```sql solucion
SELECT * FROM productos VERSION AS OF 1 ORDER BY id
```
```pista
Mira las versiones con `DESCRIBE HISTORY productos`: la 0 es el CREATE, la 1 el INSERT y la 2 el UPDATE.
```
:::

:::ejercicio dbsql dificultad=Intermedio titulo="Deshacer un error con RESTORE"
Ahora sí: vuelve la tabla `productos` a la **versión 1** para deshacer el `UPDATE` que dejó los precios en 0.
```sql setup
CREATE TABLE productos (id INT, nombre STRING, precio DOUBLE);
INSERT INTO productos VALUES (1, 'Mate', 3500), (2, 'Bombilla', 1800);
UPDATE productos SET precio = 0;
```
```sql check
SELECT * FROM productos ORDER BY id
```
```sql solucion
RESTORE TABLE productos TO VERSION AS OF 1
```
```explicacion
`RESTORE` no borra el historial: agrega una versión nueva (la 3) con el contenido de la 1. Por eso siempre puedes volver a "deshacer el deshacer".
```
:::

:::ejercicio dbsql dificultad=Avanzado titulo="Qué cambió entre dos versiones"
Devuelve las filas de `productos` que **estaban en la versión 1 y ya no están igual en la versión actual** (usa `EXCEPT` entre las dos versiones).
```sql setup
CREATE TABLE productos (id INT, nombre STRING, precio DOUBLE);
INSERT INTO productos VALUES (1, 'Mate', 3500), (2, 'Bombilla', 1800), (3, 'Termo', 12000);
UPDATE productos SET precio = 2000 WHERE id = 2;
DELETE FROM productos WHERE id = 3;
```
```sql solucion
SELECT * FROM productos VERSION AS OF 1
EXCEPT
SELECT * FROM productos
```
:::

## Calidad: restricciones

:::ejercicio dbsql dificultad=Intermedio titulo="Restricción CHECK"
Agrega a `pagos` la restricción **`monto_positivo`** que exige `monto > 0`. La tabla ya tiene datos válidos, así que la restricción se puede agregar.
```sql setup
CREATE TABLE pagos (id INT, monto DOUBLE);
INSERT INTO pagos VALUES (1, 100.0), (2, 250.5);
```
```sql check
-- Con la restricción puesta, este INSERT tiene que fallar
INSERT INTO pagos VALUES (9, -1.0)
```
```sql solucion
ALTER TABLE pagos ADD CONSTRAINT monto_positivo CHECK (monto > 0)
```
```explicacion
Con la restricción, Delta rechaza **toda** la escritura con `[DELTA_VIOLATE_CONSTRAINT_WITH_VALUES]`: no entra ninguna fila del INSERT, ni siquiera las válidas. Si la tabla ya tuviera un monto negativo, el `ALTER TABLE` mismo fallaría con `[DELTA_NEW_CHECK_CONSTRAINT_VIOLATION]`.
```
:::

## Ingesta desde archivos

:::ejercicio dbsql dificultad=Intermedio titulo="COPY INTO desde un volumen"
En el volumen `/Volumes/main/default/raw/pedidos/` hay dos archivos CSV con encabezado. Cárgalos en la tabla **`pedidos_bronze`** (ya existe, vacía y sin columnas) con `COPY INTO`, pidiendo que agregue las columnas del archivo.
```texto archivos
--- /Volumes/main/default/raw/pedidos/2025-01-01.csv
pedido_id,cliente,monto
1,ana,1200
2,beto,800
--- /Volumes/main/default/raw/pedidos/2025-01-02.csv
pedido_id,cliente,monto
3,caro,450
```
```sql setup
CREATE VOLUME main.default.raw;
CREATE TABLE pedidos_bronze;
```
```sql check
SELECT pedido_id, cliente, monto FROM pedidos_bronze ORDER BY pedido_id
```
```sql solucion
COPY INTO pedidos_bronze
FROM '/Volumes/main/default/raw/pedidos/'
FILEFORMAT = CSV
FORMAT_OPTIONS ('header' = 'true', 'inferSchema' = 'true')
COPY_OPTIONS ('mergeSchema' = 'true')
```
```pista
Las opciones del archivo van en `FORMAT_OPTIONS ('header' = 'true')` y las de la carga en `COPY_OPTIONS ('mergeSchema' = 'true')`.
```
```explicacion
`COPY INTO` es **idempotente**: si lo vuelves a correr, no carga dos veces los mismos archivos. Solo toma los archivos nuevos.
```
:::

## QUALIFY: filtrar por una función de ventana

:::ejercicio dbsql dificultad=Avanzado titulo="Quitar duplicados con QUALIFY"
`eventos` tiene varias versiones de cada cliente. Devuelve **solo la última** (la de `actualizado` más reciente) de cada `cliente_id`, con las columnas `cliente_id`, `email` y `actualizado`. Usa `QUALIFY`.
```sql setup
CREATE TABLE eventos (cliente_id INT, email STRING, actualizado TIMESTAMP);
INSERT INTO eventos VALUES
  (1, 'ana@old.com', '2025-01-01 10:00:00'), (1, 'ana@new.com', '2025-03-01 09:00:00'),
  (2, 'beto@mail.com', '2025-02-10 12:00:00'),
  (3, 'caro@a.com', '2025-01-05 08:00:00'), (3, 'caro@b.com', '2025-01-04 08:00:00');
```
```sql solucion
SELECT cliente_id, email, actualizado
FROM eventos
QUALIFY ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY actualizado DESC) = 1
```
```pista
`QUALIFY` es a las funciones de ventana lo que `HAVING` es a los agregados: filtra después de calcularlas. Numera las filas de cada cliente de la más nueva a la más vieja y quédate con la 1.
```
:::

## Pipelines declarativos (Lakeflow)

:::ejercicio dbsql modo=pipeline dificultad=Avanzado titulo="Expectativas que descartan filas"
Escribe un pipeline con la tabla de streaming **`pedidos_limpios`** que lea `STREAM(main.default.pedidos_raw)` y tenga dos expectativas que **descarten** las filas malas: `monto_valido` (`monto > 0`) y `con_cliente` (`cliente IS NOT NULL`).
```sql setup
CREATE TABLE pedidos_raw (id INT, cliente STRING, monto DOUBLE);
INSERT INTO pedidos_raw VALUES (1, 'ana', 100), (2, NULL, 50), (3, 'caro', -5), (4, 'dani', 70);
```
```sql check
SELECT * FROM pedidos_limpios ORDER BY id
```
```sql inicial
CREATE OR REFRESH STREAMING TABLE pedidos_limpios (
  CONSTRAINT … EXPECT (…) ON VIOLATION …,
  CONSTRAINT … EXPECT (…) ON VIOLATION …
)
AS SELECT * FROM STREAM(main.default.pedidos_raw)
```
```sql solucion
CREATE OR REFRESH STREAMING TABLE pedidos_limpios (
  CONSTRAINT monto_valido EXPECT (monto > 0) ON VIOLATION DROP ROW,
  CONSTRAINT con_cliente EXPECT (cliente IS NOT NULL) ON VIOLATION DROP ROW
)
AS SELECT * FROM STREAM(main.default.pedidos_raw)
```
```explicacion
Sin `ON VIOLATION` la expectativa solo **avisa** (la fila entra y se cuenta en las métricas). `DROP ROW` la descarta y `FAIL UPDATE` detiene la actualización. Una condición que da `NULL` cuenta como no cumplida.
```
:::

:::ejercicio dbsql modo=pipeline dificultad=Avanzado titulo="AUTO CDC: la foto actual (SCD tipo 1)"
`cdc_clientes` es un feed de cambios (altas, cambios y bajas) que llegan **desordenados**. Arma un pipeline que deje en **`clientes_actual`** el último estado de cada cliente con `AUTO CDC`: clave `id`, orden por `seq`, baja cuando `op = 'DELETE'` y sin las columnas `op` ni `seq`.
```sql setup
CREATE TABLE cdc_clientes (id INT, nombre STRING, ciudad STRING, op STRING, seq INT);
INSERT INTO cdc_clientes VALUES
  (1, 'Ana', 'Rosario', 'INSERT', 1), (2, 'Beto', 'Salta', 'INSERT', 2), (1, 'Ana', 'Córdoba', 'UPDATE', 5),
  (3, 'Caro', 'Mendoza', 'INSERT', 3), (2, NULL, NULL, 'DELETE', 6), (1, 'Ana', 'Tandil', 'UPDATE', 4);
```
```sql check
SELECT * FROM clientes_actual ORDER BY id
```
```sql inicial
CREATE OR REFRESH STREAMING TABLE clientes_actual;

CREATE FLOW clientes_flow AS AUTO CDC INTO clientes_actual
FROM STREAM(main.default.cdc_clientes)
KEYS (…)
APPLY AS DELETE WHEN …
SEQUENCE BY …
COLUMNS * EXCEPT (…)
STORED AS SCD TYPE 1;
```
```sql solucion
CREATE OR REFRESH STREAMING TABLE clientes_actual;

CREATE FLOW clientes_flow AS AUTO CDC INTO clientes_actual
FROM STREAM(main.default.cdc_clientes)
KEYS (id)
APPLY AS DELETE WHEN op = 'DELETE'
SEQUENCE BY seq
COLUMNS * EXCEPT (op, seq)
STORED AS SCD TYPE 1;
```
```explicacion
Fíjate en Ana: el cambio a Tandil (seq 4) llegó **después** que el de Córdoba (seq 5), pero `SEQUENCE BY` lo ordena y queda Córdoba. Con un `MERGE` común habría quedado Tandil. Esa es la razón de usar AUTO CDC.
```
:::

:::ejercicio dbsql modo=pipeline dificultad=Avanzado titulo="AUTO CDC con historial (SCD tipo 2)"
Con el mismo feed, guarda el **historial completo** en **`clientes_historial`**: cada versión de un cliente con `__START_AT` y `__END_AT` (la versión vigente tiene `__END_AT` en NULL).
```sql setup
CREATE TABLE cdc_clientes (id INT, nombre STRING, ciudad STRING, op STRING, seq INT);
INSERT INTO cdc_clientes VALUES
  (1, 'Ana', 'Rosario', 'INSERT', 1), (2, 'Beto', 'Salta', 'INSERT', 2), (1, 'Ana', 'Córdoba', 'UPDATE', 5),
  (3, 'Caro', 'Mendoza', 'INSERT', 3), (2, NULL, NULL, 'DELETE', 6), (1, 'Ana', 'Tandil', 'UPDATE', 4);
```
```sql check
SELECT id, ciudad, __START_AT, __END_AT FROM clientes_historial ORDER BY id, __START_AT
```
```sql solucion
CREATE OR REFRESH STREAMING TABLE clientes_historial;

CREATE FLOW historial_flow AS AUTO CDC INTO clientes_historial
FROM STREAM(main.default.cdc_clientes)
KEYS (id)
APPLY AS DELETE WHEN op = 'DELETE'
SEQUENCE BY seq
COLUMNS * EXCEPT (op, seq)
STORED AS SCD TYPE 2;
```
```explicacion
En SCD tipo 2 una baja **cierra** la versión vigente (Beto queda con `__END_AT = 6`) en lugar de borrarla. Para ver solo lo vigente: `WHERE __END_AT IS NULL`.
```
:::

## Resumen

- Las tablas Delta guardan **versiones**: `DESCRIBE HISTORY`, `VERSION AS OF` y `RESTORE` te salvan de los errores.
- `MERGE INTO` hace upserts, bajas (`WHEN MATCHED AND … THEN DELETE`) y sincronizaciones completas (`WHEN NOT MATCHED BY SOURCE`).
- `COPY INTO` carga archivos nuevos una sola vez; `QUALIFY` filtra por funciones de ventana sin subconsultas.
- En los pipelines, las **expectativas** controlan la calidad y **AUTO CDC** aplica feeds de cambios en orden, con SCD tipo 1 (foto actual) o tipo 2 (historial).
