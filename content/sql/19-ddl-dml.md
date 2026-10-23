---
titulo: Crear y modificar datos: DDL, DML y transacciones
nivel: Avanzado
duracion: 35
resumen: CREATE TABLE, restricciones, INSERT, UPDATE, DELETE, UPSERT, vistas y transacciones ACID.
---

Hasta ahora solo **leímos** datos. Ahora vamos a crearlos y modificarlos. SQL se divide en “sublenguajes”:

| Sigla | Nombre | Comandos |
|---|---|---|
| **DQL** | Consulta | `SELECT` |
| **DDL** | Definición | `CREATE`, `ALTER`, `DROP`, `TRUNCATE` |
| **DML** | Manipulación | `INSERT`, `UPDATE`, `DELETE`, `MERGE` |
| **DCL** | Control de acceso | `GRANT`, `REVOKE` |
| **TCL** | Transacciones | `BEGIN`, `COMMIT`, `ROLLBACK` |

:::tip Aquí puedes romper todo
Cada ejercicio se ejecuta en una **copia nueva** de la base de datos. En los ejemplos (▶ Probar) y en el laboratorio se usa una copia compartida que puedes reiniciar.
:::

## CREATE TABLE y restricciones

```sql
CREATE TABLE proveedores (
    proveedor_id  INTEGER PRIMARY KEY,
    nombre        TEXT NOT NULL,
    email         TEXT UNIQUE,
    pais          TEXT DEFAULT 'Argentina',
    calificacion  INTEGER CHECK (calificacion BETWEEN 1 AND 5),
    creado_en     TEXT DEFAULT CURRENT_TIMESTAMP
);
```

| Restricción | Garantiza |
|---|---|
| `PRIMARY KEY` | Identificador único y no nulo |
| `NOT NULL` | Siempre tiene valor |
| `UNIQUE` | No se repite |
| `DEFAULT` | Valor por defecto si no se indica |
| `CHECK` | Cumple una condición |
| `REFERENCES otra(col)` | Clave foránea: el valor existe en la otra tabla |

## INSERT

```sql
INSERT INTO proveedores (proveedor_id, nombre, email, calificacion)
VALUES (1, 'Distribuidora Sur', 'ventas@dsur.com', 5),
       (2, 'TecnoImport', 'hola@tecnoimport.com', 4);

-- Insertar el resultado de una consulta
CREATE TABLE marcas AS SELECT DISTINCT marca FROM productos;

SELECT * FROM proveedores;
```

## UPDATE y DELETE

```sql norun
UPDATE productos SET precio = precio * 1.10 WHERE marca = 'Apple';
DELETE FROM pedidos WHERE estado = 'cancelado' AND fecha_pedido < '2022-06-01';
```

:::cuidado El WHERE olvidado
`UPDATE productos SET precio = 0;` sin `WHERE` modifica **todas** las filas. Antes de un UPDATE o DELETE, ejecuta un `SELECT` con el mismo `WHERE` para ver qué vas a tocar. Y en producción, usa transacciones.
:::

## UPSERT: insertar o actualizar

“Si no existe, insértalo; si existe, actualízalo”. En SQLite y PostgreSQL:

```sql norun
INSERT INTO proveedores (proveedor_id, nombre, calificacion)
VALUES (1, 'Distribuidora Sur SA', 4)
ON CONFLICT (proveedor_id) DO UPDATE SET nombre = excluded.nombre, calificacion = excluded.calificacion;
```

En Databricks, Snowflake, SQL Server y Oracle se usa `MERGE`, que verás en el módulo de Databricks:

```sql norun
MERGE INTO destino d USING cambios c ON d.id = c.id
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *;
```

## Transacciones y ACID

Una **transacción** agrupa varias operaciones que deben ocurrir **todas o ninguna**. Ejemplo clásico: transferir dinero (restar de una cuenta y sumar en otra).

```sql norun
BEGIN;
UPDATE cuentas SET saldo = saldo - 100 WHERE id = 1;
UPDATE cuentas SET saldo = saldo + 100 WHERE id = 2;
COMMIT;      -- o ROLLBACK; para deshacer todo
```

**ACID** son las garantías de una base de datos transaccional:

- **A**tomicidad: todo o nada.
- **C**onsistencia: las restricciones siempre se cumplen.
- a**I**slamiento: las transacciones simultáneas no se pisan.
- **D**urabilidad: lo confirmado no se pierde aunque se corte la luz.

Delta Lake lleva estas garantías a los archivos del data lake.

## Vistas

Una **vista** es una consulta guardada con nombre. No guarda datos: se recalcula cada vez.

```sql
CREATE VIEW v_ventas_diarias AS
SELECT p.fecha_pedido AS dia, ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS ventas
FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
GROUP BY p.fecha_pedido;

SELECT * FROM v_ventas_diarias ORDER BY dia DESC LIMIT 5;
```

## Ejercicios

Estos ejercicios se corrigen ejecutando una consulta de verificación **después** de tu código.

:::ejercicio sql
Crea una tabla `cupones` con las columnas `codigo` (texto, clave primaria), `descuento` (número real, obligatorio) y `activo` (entero, por defecto 1). Luego inserta los cupones `'BIENVENIDA'` con 0.1 y `'VERANO24'` con 0.15.
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
