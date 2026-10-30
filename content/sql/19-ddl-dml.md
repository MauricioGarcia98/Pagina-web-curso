---
titulo: Crear y modificar datos: DDL, DML y transacciones
nivel: Avanzado
duracion: 50
resumen: CREATE TABLE, restricciones, INSERT, UPDATE, DELETE, UPSERT, vistas y transacciones ACID.
objetivos: Crear tablas con tipos, claves y restricciones adecuadas | Insertar, actualizar y borrar filas de forma segura | Hacer un upsert (insertar o actualizar) con `INSERT … ON CONFLICT` | Explicar qué garantizan las transacciones (ACID) y cuándo usarlas
prerrequisitos: sql-where | sql-null
autoevaluacion: ¿Puedes crear una tabla con clave primaria, columnas obligatorias y un valor por defecto? | ¿Sabes qué hacer antes de ejecutar un `UPDATE` o un `DELETE` para no romper datos? | ¿Puedes crear una tabla a partir del resultado de una consulta? | ¿Puedes actualizar el stock si el producto existe o insertarlo si no? | ¿Sabes qué pasa con los cambios de una transacción si el segundo `UPDATE` falla?
---

<!-- estandar:escenario -->
:::escenario La tabla de cupones
Camila va a lanzar cupones de descuento y el equipo de desarrollo te pide ayuda:

> "Necesitamos una tabla nueva para los cupones: código, descuento y fecha de vencimiento. Ah, y Valentina pidió subir un 5 % los precios de Audio. ¿Lo haces tú?"

Hasta ahora solo **leías** datos. Ahora vas a **crearlos y modificarlos**. Es poder real, y con poder real se pueden hacer daños reales: esta lección también es sobre cómo no borrar una tabla de producción.
:::
## De leer a escribir

Hasta ahora solo **leíste** datos: ningún `SELECT` cambia nada. Pero alguien tiene que **crear** las tablas, **cargar** las filas y **corregirlas**. En ingeniería de datos lo harás todo el tiempo: crear tablas de staging, cargar el lote del día, actualizar el estado de un pedido, borrar datos de prueba, y hacerlo de forma **segura**, porque aquí sí puedes romper cosas.

SQL se divide en "sublenguajes" según lo que hace cada instrucción:

| Sigla | Nombre | Comandos | Qué cambia |
|---|---|---|---|
| **DQL** | Consulta | `SELECT` | Nada: solo lee |
| **DDL** | Definición de datos | `CREATE`, `ALTER`, `DROP`, `TRUNCATE` | La **estructura**: tablas, columnas, vistas |
| **DML** | Manipulación de datos | `INSERT`, `UPDATE`, `DELETE`, `MERGE` | El **contenido**: las filas |
| **DCL** | Control de acceso | `GRANT`, `REVOKE` | Los **permisos** |
| **TCL** | Control de transacciones | `BEGIN`, `COMMIT`, `ROLLBACK` | Agrupa cambios en "todo o nada" |

:::analogia La planilla y sus datos
DDL es diseñar la planilla: qué columnas tiene, de qué tipo, qué reglas cumplen. DML es escribir, corregir y borrar los datos dentro de la planilla. Cambiar el diseño es raro y delicado; cargar datos es diario.
:::

:::tip Aquí puedes romper todo
Cada ejercicio se ejecuta en una **copia nueva** de la base de datos. Los ejemplos (▶) y el laboratorio usan una copia compartida que puedes reiniciar. Experimenta con tranquilidad: es justamente el lugar para equivocarse.
:::

## CREATE TABLE: diseñar una tabla

```sql
-- la base del curso ya trae una tabla proveedores: la borramos para recrearla con este diseño
DROP TABLE IF EXISTS proveedores;

CREATE TABLE proveedores (
    proveedor_id  INTEGER PRIMARY KEY,
    nombre        TEXT NOT NULL,
    email         TEXT UNIQUE,
    pais          TEXT DEFAULT 'Argentina',
    calificacion  INTEGER CHECK (calificacion BETWEEN 1 AND 5),
    creado_en     TEXT DEFAULT CURRENT_TIMESTAMP
);
```

Cada línea define una columna: **nombre**, **tipo** y, opcionalmente, **restricciones**.

### Tipos de datos más comunes

| Tipo (estándar) | Guarda | En SQLite | En Spark / BigQuery |
|---|---|---|---|
| `INTEGER` / `BIGINT` | Números enteros | `INTEGER` | `INT`, `BIGINT` / `INT64` |
| `DECIMAL(p, s)` / `NUMERIC` | Decimales exactos (dinero) | `REAL` (aproximado) | `DECIMAL(10,2)` / `NUMERIC` |
| `REAL` / `DOUBLE` / `FLOAT` | Decimales aproximados | `REAL` | `DOUBLE` / `FLOAT64` |
| `VARCHAR(n)` / `TEXT` | Texto | `TEXT` | `STRING` |
| `DATE` / `TIMESTAMP` | Fechas y fecha-hora | `TEXT` en formato ISO | `DATE`, `TIMESTAMP` |
| `BOOLEAN` | Verdadero / falso | `INTEGER` (0/1) | `BOOLEAN` / `BOOL` |

SQLite es muy permisivo con los tipos (puedes guardar texto en una columna `INTEGER`); PostgreSQL, Spark o BigQuery son estrictos y dan error. Diseña tus tablas como si fueran estrictos.

### Restricciones: las reglas que la base hace cumplir

| Restricción | Garantiza | Si se viola… |
|---|---|---|
| `PRIMARY KEY` | Identificador único y no nulo | Error: `UNIQUE constraint failed` |
| `NOT NULL` | Siempre tiene valor | Error al insertar sin ese dato |
| `UNIQUE` | No se repite (pero puede ser `NULL`) | Error con un duplicado |
| `DEFAULT valor` | Valor automático si no se indica | — |
| `CHECK (condición)` | Cumple una regla de negocio | Error: `CHECK constraint failed` |
| `REFERENCES otra(col)` | Clave foránea: el valor existe en la otra tabla | Error si apunta a algo inexistente (si está activado) |

Las restricciones son **la primera línea de defensa de la calidad de datos**: un error que la base rechaza al cargar es mucho más barato que uno que llega a un reporte del directorio.

:::nota En los data lakes y warehouses
Snowflake, BigQuery y Redshift **aceptan** declarar `PRIMARY KEY` y `FOREIGN KEY`, pero **no las hacen cumplir** (por rendimiento). Por eso en esos mundos la calidad se verifica con **tests** (los de dbt, por ejemplo: `unique`, `not_null`, `relationships`), que verás en su módulo. Delta Lake sí admite `NOT NULL` y `CHECK`.
:::

## INSERT: agregar filas

```sql
INSERT INTO proveedores (proveedor_id, nombre, email, calificacion)
VALUES (1, 'Distribuidora Sur', 'ventas@dsur.com', 5),
       (2, 'TecnoImport',       'hola@tecnoimport.com', 4);

SELECT * FROM proveedores;
```

- Lista las columnas **explícitamente** (`(proveedor_id, nombre, …)`): si mañana alguien agrega una columna a la tabla, tu `INSERT` sigue funcionando. Las columnas que no menciones toman su `DEFAULT` (o `NULL`).
- Puedes insertar **varias filas** en una sola instrucción, separadas por comas. Es mucho más rápido que una instrucción por fila.

### Insertar el resultado de una consulta

```sql
-- Crear una tabla nueva a partir de una consulta (CTAS: CREATE TABLE AS SELECT)
CREATE TABLE marcas AS SELECT DISTINCT marca FROM productos;

-- Agregar filas a una tabla existente desde una consulta
INSERT INTO proveedores (proveedor_id, nombre)
SELECT 100 + ROW_NUMBER() OVER (ORDER BY marca), 'Proveedor de ' || marca
FROM marcas;
```

`CREATE TABLE … AS SELECT` (CTAS) e `INSERT INTO … SELECT` son las dos formas en que se materializan los resultados en un pipeline: la capa silver se construye con CTAS a partir de bronze, la capa gold a partir de silver. Lo verás en Athena, BigQuery, Databricks y dbt.

Cómo se declara una clave que se numera sola cambia en cada motor:

```motores
titulo: Una clave que se numera sola
[sqlite]
DROP TABLE IF EXISTS notas_demo;
CREATE TABLE notas_demo (
  nota_id INTEGER PRIMARY KEY,   -- INTEGER PRIMARY KEY se numera solo
  texto TEXT
);
INSERT INTO notas_demo (texto) VALUES ('primera'), ('segunda');
SELECT * FROM notas_demo;
[postgres]
DROP TABLE IF EXISTS notas_demo;
CREATE TABLE notas_demo (
  nota_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  texto TEXT
);
INSERT INTO notas_demo (texto) VALUES ('primera'), ('segunda');
SELECT * FROM notas_demo;
[mysql]
DROP TABLE IF EXISTS notas_demo;
CREATE TABLE notas_demo (
  nota_id INT AUTO_INCREMENT PRIMARY KEY,
  texto VARCHAR(100)
);
INSERT INTO notas_demo (texto) VALUES ('primera'), ('segunda');
SELECT * FROM notas_demo;
[sqlserver]
DROP TABLE IF EXISTS notas_demo;
CREATE TABLE notas_demo (
  nota_id INT IDENTITY(1, 1) PRIMARY KEY,
  texto NVARCHAR(100)
);
INSERT INTO notas_demo (texto) VALUES ('primera'), ('segunda');
SELECT * FROM notas_demo;
```

## UPDATE y DELETE: modificar y borrar

```sql norun
-- Subir 10 % el precio de los productos Apple
UPDATE productos
SET precio = ROUND(precio * 1.10, 2)
WHERE marca = 'Apple';

-- Borrar pedidos cancelados antiguos
DELETE FROM pedidos
WHERE estado = 'cancelado' AND fecha_pedido < '2022-06-01';
```

- `UPDATE tabla SET columna = nuevo_valor WHERE condición`: puedes cambiar varias columnas a la vez (`SET a = 1, b = 2`), y el nuevo valor puede usar el valor viejo (`precio * 1.10`).
- `DELETE FROM tabla WHERE condición`: borra las filas que cumplen la condición.

:::cuidado El WHERE olvidado
`UPDATE productos SET precio = 0;` **sin** `WHERE` modifica las 300 filas. `DELETE FROM pedidos;` las borra todas. No hay papelera ni "deshacer". El protocolo profesional:
1. Escribe primero un `SELECT` con el **mismo** `WHERE` y mira cuántas filas devuelve y cuáles son.
2. Si es lo esperado, cambia `SELECT *` por `UPDATE … SET …` o `DELETE`.
3. En producción, hazlo dentro de una **transacción** (abajo) y verifica antes del `COMMIT`.
:::

### DELETE, TRUNCATE y DROP

| Instrucción | Qué borra | ¿La tabla sigue existiendo? | Notas |
|---|---|---|---|
| `DELETE FROM t WHERE …` | Las filas que cumplen la condición | Sí | Puede ser lento con millones de filas |
| `DELETE FROM t` / `TRUNCATE TABLE t` | **Todas** las filas | Sí, vacía | `TRUNCATE` es mucho más rápido (no existe en SQLite) |
| `DROP TABLE t` | La tabla **completa** (estructura y datos) | No | Usa `DROP TABLE IF EXISTS t` para no fallar si no existe |

```recorrido
titulo: Una tabla de stock, de la creación al borrado
estacion create: CREATE | icono=base
estacion insert: INSERT | icono=capas
estacion update: UPDATE | icono=transformar
estacion check: CHECK | icono=escudo
estacion delete: DELETE | icono=x
paso create: Crear la tabla con reglas
`PRIMARY KEY` impide dos filas con el mismo `sku`; `NOT NULL` obliga a tener valor; `CHECK` rechaza stock negativo. Las reglas viven en la tabla, no en la memoria de quien carga los datos.
>>> sql
CREATE TABLE stock (
    sku      TEXT PRIMARY KEY,
    nombre   TEXT NOT NULL,
    cantidad INTEGER NOT NULL CHECK (cantidad >= 0)
);
paso insert: Insertar tres productos
Un solo `INSERT` puede agregar varias filas.
>>> tabla
sku,nombre,cantidad
SKU-1,Mouse,40
SKU-2,Teclado,15
SKU-3,Monitor,8
paso update: UPDATE … WHERE sku = 'SKU-2'
Se vendieron 5 teclados. El `WHERE` decide **qué filas** cambian; sin él, cambiarían **todas**.
>>> tabla
sku,nombre,cantidad
SKU-1,Mouse,40
SKU-2,Teclado,10
SKU-3,Monitor,8
paso check: Intentar dejar stock negativo
Hay 8 monitores y se intenta restar 10. El `CHECK` rechaza el cambio y la tabla queda como estaba.
>>> log
UPDATE stock SET cantidad = cantidad - 10 WHERE sku = 'SKU-3';
Error: CHECK constraint failed: cantidad >= 0
paso delete: DELETE … WHERE sku = 'SKU-1'
Borra la fila del mouse. Igual que con UPDATE: antes de un DELETE, ejecuta un `SELECT` con el mismo `WHERE` para ver qué vas a borrar.
>>> tabla
sku,nombre,cantidad
SKU-2,Teclado,10
SKU-3,Monitor,8
```

## ALTER TABLE: cambiar la estructura

```sql norun
ALTER TABLE proveedores ADD COLUMN telefono TEXT;          -- agregar columna
ALTER TABLE proveedores RENAME COLUMN pais TO pais_origen; -- renombrar
ALTER TABLE proveedores RENAME TO proveedores_v2;          -- renombrar la tabla
```

Cambiar la estructura de una tabla que ya usan reportes y procesos es delicado: quien hacía `SELECT pais` deja de funcionar. Por eso en equipos grandes los cambios de esquema se versionan y se anuncian (*migraciones*, *contratos de datos*).

## UPSERT: insertar o actualizar

El problema más común al cargar datos: llega un lote donde algunos registros son **nuevos** y otros son **cambios** de registros existentes. "Si no existe, insértalo; si existe, actualízalo" se llama **upsert** (*update* + *insert*).

En SQLite y PostgreSQL:

```sql norun
INSERT INTO proveedores (proveedor_id, nombre, calificacion)
VALUES (1, 'Distribuidora Sur SA', 4)
ON CONFLICT (proveedor_id) DO UPDATE
   SET nombre = excluded.nombre,
       calificacion = excluded.calificacion;
```

`excluded` se refiere a la fila que **intentabas** insertar. Si el `proveedor_id` 1 ya existe, en vez de dar error, actualiza sus columnas.

En Databricks, Snowflake, BigQuery, SQL Server y Oracle se usa `MERGE`, más completo (también puede borrar):

```sql norun
MERGE INTO clientes_silver AS d
USING cambios_del_dia AS c
   ON d.cliente_id = c.cliente_id
WHEN MATCHED AND c.operacion = 'baja' THEN DELETE
WHEN MATCHED THEN UPDATE SET d.email = c.email, d.segmento = c.segmento
WHEN NOT MATCHED THEN INSERT (cliente_id, email, segmento) VALUES (c.cliente_id, c.email, c.segmento);
```

`MERGE` es **idempotente** si la clave está bien elegida: ejecutarlo dos veces con el mismo lote deja la tabla igual. Por eso es la base de las cargas incrementales (dbt incremental, Delta Lake, Iceberg).

```motores
titulo: Insertar o actualizar (upsert)
[sqlite]
DROP TABLE IF EXISTS stock_demo;
CREATE TABLE stock_demo (sku TEXT PRIMARY KEY, cantidad INTEGER);
INSERT INTO stock_demo VALUES ('A1', 10);
INSERT INTO stock_demo VALUES ('A1', 5)
  ON CONFLICT (sku) DO UPDATE SET cantidad = stock_demo.cantidad + excluded.cantidad;
SELECT * FROM stock_demo;
[postgres]
DROP TABLE IF EXISTS stock_demo;
CREATE TABLE stock_demo (sku TEXT PRIMARY KEY, cantidad INTEGER);
INSERT INTO stock_demo VALUES ('A1', 10);
INSERT INTO stock_demo VALUES ('A1', 5)
  ON CONFLICT (sku) DO UPDATE SET cantidad = stock_demo.cantidad + EXCLUDED.cantidad;
SELECT * FROM stock_demo;
[mysql norun]
CREATE TABLE stock_demo (sku VARCHAR(20) PRIMARY KEY, cantidad INT);
INSERT INTO stock_demo VALUES ('A1', 10);
INSERT INTO stock_demo VALUES ('A1', 5) AS nuevo
  ON DUPLICATE KEY UPDATE cantidad = stock_demo.cantidad + nuevo.cantidad;
SELECT * FROM stock_demo;
[sqlserver norun]
CREATE TABLE stock_demo (sku NVARCHAR(20) PRIMARY KEY, cantidad INT);
INSERT INTO stock_demo VALUES ('A1', 10);
MERGE stock_demo AS destino
USING (VALUES ('A1', 5)) AS origen (sku, cantidad)
  ON destino.sku = origen.sku
WHEN MATCHED THEN UPDATE SET cantidad = destino.cantidad + origen.cantidad
WHEN NOT MATCHED THEN INSERT (sku, cantidad) VALUES (origen.sku, origen.cantidad);
SELECT * FROM stock_demo;
```

## Transacciones y ACID

Una **transacción** agrupa varias operaciones que deben ocurrir **todas o ninguna**. El ejemplo clásico: una transferencia bancaria. Si se resta de una cuenta y se corta la luz antes de sumar en la otra, el dinero desaparece.

```sql norun
BEGIN;                                                  -- empieza la transacción
UPDATE cuentas SET saldo = saldo - 100 WHERE id = 1;
UPDATE cuentas SET saldo = saldo + 100 WHERE id = 2;
-- (verificación: SELECT … para comprobar que todo está bien)
COMMIT;                                                 -- confirma: los cambios son definitivos
-- o ROLLBACK;                                          -- deshace todo lo hecho desde el BEGIN
```

**ACID** son las cuatro garantías de una base de datos transaccional:

| Letra | Propiedad | Significa | En el ejemplo |
|---|---|---|---|
| **A** | Atomicidad | Todo o nada | No queda la resta sin la suma |
| **C** | Consistencia | Las reglas (restricciones) siempre se cumplen | Un `CHECK (saldo >= 0)` impide saldos negativos |
| **I** | Aislamiento | Transacciones simultáneas no se pisan | Dos transferencias a la vez no leen saldos a medio actualizar |
| **D** | Durabilidad | Lo confirmado no se pierde | Tras el `COMMIT`, aunque se corte la luz, la transferencia quedó |

Durante años los data lakes (archivos en S3 o ADLS) **no** tenían estas garantías: un job que fallaba a la mitad dejaba archivos sueltos. **Delta Lake**, **Apache Iceberg** y **Hudi** llevaron ACID a los archivos del lago: es una de las razones por las que existe el *lakehouse*.

## Vistas: consultas guardadas con nombre

Una **vista** es una consulta guardada con un nombre. **No guarda datos**: cada vez que la consultas, ejecuta la consulta original sobre los datos actuales.

```sql
CREATE VIEW v_ventas_diarias AS
SELECT p.fecha_pedido AS dia,
       ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS ventas
FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
GROUP BY p.fecha_pedido;

SELECT * FROM v_ventas_diarias ORDER BY dia DESC LIMIT 5;
```

| | Vista | Tabla (CTAS) | Vista materializada |
|---|---|---|---|
| Guarda datos | No | Sí | Sí |
| Siempre actualizada | Sí | No (hay que recalcularla) | El motor la refresca |
| Velocidad al consultar | Lo que tarde la consulta | Rápida | Rápida |
| Uso típico | Simplificar consultas, ocultar columnas sensibles | Capas de un pipeline | Dashboards con agregados frecuentes |

En dbt, elegir entre vista y tabla es elegir la **materialización** de un modelo (`view`, `table`, `incremental`).



<!-- estandar:trabajo -->
:::trabajo
- En una empresa, casi nunca se ejecuta un `UPDATE` o `DELETE` a mano en producción. Los cambios de estructura (`CREATE`, `ALTER`) van en **migraciones** versionadas en Git y revisadas por otra persona, y los cambios de datos los hacen los pipelines.
- Si de verdad hay que corregir datos a mano: primero un `SELECT` con el mismo `WHERE` para ver qué filas se van a tocar, después el cambio **dentro de una transacción**, revisar el número de filas afectadas y recién ahí `COMMIT`.
- En los data lakes con Delta Lake o Iceberg existen `UPDATE`, `DELETE` y `MERGE`, y además *time travel*: si algo sale mal, se puede volver a la versión anterior de la tabla.
- El upsert (`MERGE`) es la operación central de las cargas incrementales: "si el cliente ya existe, actualízalo; si no, insértalo".
:::

<!-- estandar:entrevista -->
:::entrevista "¿Qué significa ACID?"
**Atomicidad** (la transacción se aplica completa o no se aplica), **Consistencia** (deja la base en un estado válido según sus reglas), **Aislamiento** (las transacciones simultáneas no ven los cambios a medias de las otras) y **Durabilidad** (lo confirmado sobrevive a un corte de luz). Un buen ejemplo: transferir dinero entre dos cuentas, que son dos `UPDATE` que tienen que ocurrir juntos.
:::

## Resumen

- DDL cambia estructuras (`CREATE`, `ALTER`, `DROP`); DML cambia filas (`INSERT`, `UPDATE`, `DELETE`, `MERGE`).
- Las restricciones (`PRIMARY KEY`, `NOT NULL`, `UNIQUE`, `CHECK`, `REFERENCES`) protegen la calidad.
- Antes de `UPDATE`/`DELETE`, prueba el `WHERE` con un `SELECT`. Sin `WHERE`, afecta todas las filas.
- Upsert: `INSERT … ON CONFLICT` (SQLite/PostgreSQL) o `MERGE` (Databricks, Snowflake, BigQuery…).
- Transacciones = todo o nada (ACID). Vistas = consultas guardadas sin datos.

## Ejercicios

Estos ejercicios se corrigen ejecutando una consulta de verificación **después** de tu código.

:::ejercicio sql
Crea una tabla `cupones` con las columnas `codigo` (texto, clave primaria), `descuento` (número real, obligatorio) y `activo` (entero, por defecto 1). Luego inserta los cupones `'BIENVENIDA'` con 0.1 y `'VERANO24'` con 0.15. (La base del curso trae una tabla `cupones` de campañas; en este ejercicio se borra antes, así que puedes crearla desde cero.)
```sql setup
DROP TABLE IF EXISTS cupones;
```
```sql inicial
-- CREATE TABLE ...
-- INSERT INTO ...
```
```sql solucion
CREATE TABLE cupones (
  codigo TEXT PRIMARY KEY,
  descuento REAL NOT NULL,
  activo INTEGER DEFAULT 1
);
INSERT INTO cupones (codigo, descuento) VALUES ('BIENVENIDA', 0.1), ('VERANO24', 0.15);
```
```check
SELECT codigo, descuento, activo FROM cupones ORDER BY codigo;
```
:::

:::ejercicio sql
Sube un **5%** el precio de todos los productos de la categoría `7` (Audio), redondeando a 2 decimales.
```sql solucion
UPDATE productos SET precio = ROUND(precio * 1.05, 2) WHERE categoria_id = 7;
```
```check
SELECT producto_id, precio FROM productos ORDER BY producto_id;
```
:::

:::ejercicio sql
Borra de `clientes_crudo` todos los registros que **no tienen email**.
```sql solucion
DELETE FROM clientes_crudo WHERE email IS NULL;
```
```check
SELECT COUNT(*) AS filas, COUNT(email) AS con_email FROM clientes_crudo;
```
:::

:::ejercicio sql
Crea una tabla `resumen_paises` con las columnas `pais` y `clientes` (cantidad de clientes por país) **a partir de una consulta** (`CREATE TABLE ... AS SELECT`).
```sql solucion
CREATE TABLE resumen_paises AS SELECT pais, COUNT(*) AS clientes FROM clientes GROUP BY pais;
```
```check
SELECT pais, clientes FROM resumen_paises ORDER BY pais;
```
:::

:::ejercicio sql
La tabla `stock_actual` (ya creada por el ejercicio) tiene `producto_id` y `stock`. Llegó una entrega: el producto `1` tiene ahora stock `50`, y llega un producto nuevo `999` con stock `10`. Hazlo con **un solo INSERT ... ON CONFLICT** (UPSERT).
```sql setup
CREATE TABLE stock_actual (producto_id INTEGER PRIMARY KEY, stock INTEGER);
INSERT INTO stock_actual SELECT producto_id, stock FROM productos WHERE producto_id <= 5
```
```sql solucion
INSERT INTO stock_actual (producto_id, stock) VALUES (1, 50), (999, 10)
ON CONFLICT (producto_id) DO UPDATE SET stock = excluded.stock;
```
```check
SELECT producto_id, stock FROM stock_actual ORDER BY producto_id;
```
```pista
`ON CONFLICT (producto_id) DO UPDATE SET stock = excluded.stock` — `excluded` es la fila que intentabas insertar.
```
:::

:::ejercicio quiz
En una transacción haces dos UPDATE y el segundo falla. ¿Qué garantiza la **atomicidad**?

- [ ] Que el primer UPDATE se guarde igual
- [x] Que se deshagan ambos: o se aplica todo o nada
- [ ] Que el segundo se reintente automáticamente
- [ ] Que la base se bloquee hasta que alguien lo arregle
:::

:::ejercicio sql dificultad=Básico
Agrega el departamento `10`, `Atención al cliente`, en `Lima`, con un presupuesto de `150000`.
```sql solucion
INSERT INTO departamentos (departamento_id, nombre, ciudad, presupuesto) VALUES (10, 'Atención al cliente', 'Lima', 150000);
```
```check
SELECT * FROM departamentos ORDER BY departamento_id;
```
:::

:::ejercicio sql dificultad=Intermedio
Marca como inactivos (`activo = 0`) todos los productos **sin stock**.
```pista
`UPDATE … SET … WHERE …`. Sin `WHERE` cambiarías todos los productos.
```
```sql solucion
UPDATE productos SET activo = 0 WHERE stock = 0;
```
```check
SELECT producto_id, activo FROM productos ORDER BY producto_id;
```
:::

:::ejercicio sql dificultad=Intermedio
Agrega a `clientes` la columna `email_verificado` (entero, por defecto `0`) y márcala con `1` para los clientes que tienen email.
```pista
Primero `ALTER TABLE … ADD COLUMN …`, después un `UPDATE`.
```
```sql solucion
ALTER TABLE clientes ADD COLUMN email_verificado INTEGER DEFAULT 0;
UPDATE clientes SET email_verificado = 1 WHERE email IS NOT NULL;
```
```check
SELECT COUNT(*) AS clientes, SUM(email_verificado) AS verificados FROM clientes;
```
:::

:::ejercicio sql dificultad=Avanzado
Crea la vista `v_ventas_mes` con las ventas por mes (`mes` con formato `'YYYY-MM'` y `ventas`: importe con descuento redondeado a 2 decimales) de los pedidos **no cancelados**.
```pista
`CREATE VIEW v_ventas_mes AS SELECT …`: la consulta es la de siempre.
```
```pista
Une pedidos con detalle_pedidos, filtra `estado <> 'cancelado'` y agrupa por mes.
```
```sql solucion
CREATE VIEW v_ventas_mes AS
SELECT strftime('%Y-%m', p.fecha_pedido) AS mes,
       ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS ventas
FROM pedidos p
JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
WHERE p.estado <> 'cancelado'
GROUP BY mes;
```
```check
SELECT mes, ventas FROM v_ventas_mes ORDER BY mes;
```
:::
