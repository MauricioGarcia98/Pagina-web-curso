---
titulo: Delta Lake en la práctica (SQL de Databricks)
nivel: Intermedio
duracion: 40
resumen: Crear tablas Delta, MERGE, time travel, RESTORE, OPTIMIZE, VACUUM, Liquid Clustering, constraints y Change Data Feed.
---

Todo lo que sigue se ejecuta en Databricks (SQL warehouse o notebook con `%sql`). Los ejercicios te piden **escribir** las sentencias y compararlas con una respuesta modelo.

## Cómo funciona Delta Lake por dentro

Una tabla Delta es una carpeta en el lago con dos cosas:

```text
/lake/silver/clientes/
├── part-00000-a1b2.snappy.parquet      ← los datos: archivos Parquet comunes
├── part-00001-c3d4.snappy.parquet
├── part-00002-e5f6.snappy.parquet
└── _delta_log/                         ← el "libro de actas" de la tabla
    ├── 00000000000000000000.json       ← versión 0: se crearon los archivos a1b2 y c3d4
    ├── 00000000000000000001.json       ← versión 1: se agregó e5f6 (un INSERT)
    └── 00000000000000000002.json       ← versión 2: se quitó c3d4 y se agregó otro (un UPDATE)
```

Cada operación (`INSERT`, `UPDATE`, `MERGE`, `DELETE`) **no modifica** los archivos existentes: escribe archivos nuevos y agrega una entrada al `_delta_log` que dice "a partir de ahora, la tabla está formada por estos archivos y no por aquellos". Esto permite todo lo que hace especial a Delta:

| Capacidad | Cómo la logra el registro |
|---|---|
| **Transacciones ACID** | Una escritura solo "existe" cuando su entrada en el log se confirma: si el job falla a la mitad, los archivos a medio escribir se ignoran |
| **Lecturas consistentes** | Un lector usa la última versión confirmada; nunca ve una escritura a medias |
| **Time travel** | Las versiones viejas siguen descritas en el log (y sus archivos siguen en disco hasta el `VACUUM`) |
| **UPDATE / DELETE / MERGE** | Se reescriben solo los archivos afectados y el log registra el cambio |
| **Esquema obligatorio** | El log guarda el esquema; una escritura con columnas incompatibles se rechaza |

Apache **Iceberg** y **Hudi** funcionan con la misma idea (metadatos + archivos Parquet). Hoy Databricks puede leer y escribir también Iceberg (UniForm), así que los conceptos se transfieren.

```recorrido
titulo: El _delta_log, operación por operación
estacion v0: CREATE | icono=archivo
estacion v1: INSERT | icono=capas
estacion v2: UPDATE | icono=transformar
estacion tt: Time travel | icono=reloj
estacion vac: VACUUM | icono=x
paso v0: Versión 0: se crea la tabla
La escritura deja dos archivos Parquet y el primer archivo del log, que dice "la tabla son estos dos archivos" (nombres simplificados).
>>> texto
_delta_log/00000000000000000000.json
  add  part-a1b2.parquet   (clientes 1 a 500)
  add  part-c3d4.parquet   (clientes 501 a 1000)
paso v1: Versión 1: un INSERT
No se toca ningún archivo existente: se escribe uno nuevo y el log suma una entrada.
>>> texto
_delta_log/00000000000000000001.json
  add  part-e5f6.parquet   (clientes 1001 a 1200)
paso v2: Versión 2: un UPDATE
Cambia el email de un cliente que está en `c3d4`. Delta **reescribe ese archivo entero** en uno nuevo y anota: quitar el viejo, agregar el nuevo. El archivo viejo sigue en disco.
>>> texto
_delta_log/00000000000000000002.json
  remove part-c3d4.parquet
  add    part-g7h8.parquet   (clientes 501 a 1000, con el cambio)

Tabla actual = a1b2 + e5f6 + g7h8
paso tt: Leer una versión anterior
Como el log describe cada versión y los archivos viejos siguen ahí, se puede consultar la tabla "como era". `DESCRIBE HISTORY` muestra las versiones (resumido).
>>> tabla
version,operation
2,UPDATE
1,WRITE
0,CREATE TABLE AS SELECT
paso vac: VACUUM borra lo que ya no se usa
`VACUUM` borra del disco los archivos que la versión actual ya no usa y que dejaron de usarse hace más que la retención (7 días por defecto). Después de eso, ya no se puede viajar a las versiones que los usaban.
>>> sql
SELECT * FROM main.silver.clientes VERSION AS OF 1;   -- antes del UPDATE
VACUUM main.silver.clientes;                          -- libera part-c3d4 pasada la retención
```

## Crear tablas

```sql norun
CREATE CATALOG IF NOT EXISTS dev;
CREATE SCHEMA IF NOT EXISTS dev.silver;

CREATE TABLE IF NOT EXISTS dev.silver.clientes (
  cliente_id     BIGINT NOT NULL,
  nombre         STRING,
  email          STRING,
  pais           STRING,
  actualizado_en TIMESTAMP,
  CONSTRAINT pk_clientes PRIMARY KEY (cliente_id)        -- informativa en Databricks
)
CLUSTER BY (pais)                                         -- Liquid Clustering
COMMENT 'Clientes limpios y deduplicados';

-- CTAS: crear desde una consulta
CREATE OR REPLACE TABLE dev.gold.ventas_por_pais AS
SELECT c.pais, SUM(f.importe) AS ventas
FROM dev.silver.fct_ventas f JOIN dev.silver.clientes c USING (cliente_id)
GROUP BY c.pais;
```

## MERGE: el upsert del lakehouse

```sql norun
MERGE INTO dev.silver.clientes AS t
USING (
  SELECT * FROM dev.bronze.clientes_cambios
  QUALIFY ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY _fecha_ingesta DESC) = 1   -- ¡deduplicar el origen!
) AS s
ON t.cliente_id = s.cliente_id
WHEN MATCHED AND s.operacion = 'D' THEN DELETE
WHEN MATCHED AND s.actualizado_en > t.actualizado_en THEN UPDATE SET *
WHEN NOT MATCHED AND s.operacion <> 'D' THEN INSERT *;
```

:::cuidado MERGE con duplicados en el origen
Si dos filas del origen coinciden con la misma fila del destino, `MERGE` falla. Deduplica la fuente antes (como arriba con `QUALIFY`).
:::

### Qué hace este MERGE, fila por fila

| Situación del cliente en `s` (cambios) | ¿Existe en `t`? | Cláusula que aplica | Resultado |
|---|---|---|---|
| Cliente nuevo | No | `WHEN NOT MATCHED … INSERT *` | Se agrega |
| Cambió su email, y el cambio es más reciente | Sí | `WHEN MATCHED AND s.actualizado_en > t.actualizado_en THEN UPDATE SET *` | Se actualiza |
| Llegó un cambio **viejo** (atrasado) | Sí | Ninguna (la condición de fecha no se cumple) | No se toca: evita "pisar" un dato nuevo con uno viejo |
| Se dio de baja (`operacion = 'D'`) | Sí | `WHEN MATCHED AND s.operacion = 'D' THEN DELETE` | Se borra |

Las cláusulas `WHEN` se evalúan **en orden** y cada fila usa la primera que se cumple, como un `CASE`. Correr este `MERGE` dos veces con los mismos cambios deja la tabla igual: es **idempotente**, la propiedad que buscamos en todo pipeline.

## Historial, time travel y RESTORE

```sql norun
DESCRIBE HISTORY dev.silver.clientes;                      -- versión, fecha, operación, usuario
SELECT * FROM dev.silver.clientes VERSION AS OF 5;
SELECT * FROM dev.silver.clientes TIMESTAMP AS OF '2024-12-01';
RESTORE TABLE dev.silver.clientes TO VERSION AS OF 5;      -- deshacer un error
```

## Mantenimiento

```sql norun
OPTIMIZE dev.silver.fct_ventas;                            -- compacta archivos pequeños
OPTIMIZE dev.silver.fct_ventas ZORDER BY (cliente_id);     -- (legado) agrupa datos para data skipping
ALTER TABLE dev.silver.fct_ventas CLUSTER BY (fecha);      -- Liquid Clustering (recomendado hoy)
VACUUM dev.silver.fct_ventas RETAIN 168 HOURS;             -- borra archivos viejos no referenciados (pierdes time travel más antiguo)
ANALYZE TABLE dev.silver.fct_ventas COMPUTE STATISTICS;
```

Con **Predictive Optimization** (Unity Catalog), Databricks ejecuta OPTIMIZE y VACUUM automáticamente.

## Calidad y cambios

```sql norun
ALTER TABLE dev.silver.pedidos ADD CONSTRAINT monto_positivo CHECK (monto >= 0);   -- rechaza filas inválidas
ALTER TABLE dev.silver.pedidos SET TBLPROPERTIES (delta.enableChangeDataFeed = true);
SELECT * FROM table_changes('dev.silver.pedidos', 10);   -- filas insertadas/actualizadas/borradas desde la versión 10
```

## Ejercicios

:::ejercicio abierto
Escribe el `MERGE` que actualice `prod.silver.productos` (clave `producto_id`) con la tabla `prod.bronze.productos_hoy`: si existe, actualizar `precio` y `stock`; si no existe, insertar todas las columnas.
```sql solucion
MERGE INTO prod.silver.productos AS t
USING prod.bronze.productos_hoy AS s
ON t.producto_id = s.producto_id
WHEN MATCHED THEN UPDATE SET t.precio = s.precio, t.stock = s.stock
WHEN NOT MATCHED THEN INSERT *;
```
:::

:::ejercicio abierto
Alguien ejecutó por error un `DELETE` sin `WHERE` sobre `prod.gold.ventas_diarias` (versión 42). Escribe las dos sentencias para (1) ver el historial y (2) volver a la versión **41**.
```sql solucion
DESCRIBE HISTORY prod.gold.ventas_diarias;
RESTORE TABLE prod.gold.ventas_diarias TO VERSION AS OF 41;
```
:::

:::ejercicio quiz
Ejecutas `VACUUM tabla RETAIN 0 HOURS`. ¿Qué pierdes?

- [ ] Nada
- [x] La posibilidad de hacer time travel a versiones anteriores (sus archivos se borran) y puedes romper lecturas en curso
- [ ] La tabla entera
- [ ] El esquema
:::

:::ejercicio quiz
Una tabla Delta recibe miles de escrituras pequeñas por streaming y las consultas son lentas. ¿Qué ayuda primero?

- [ ] `VACUUM`
- [x] `OPTIMIZE` (compactar archivos pequeños) y clustering
- [ ] `DESCRIBE HISTORY`
- [ ] Borrar la tabla
:::

:::ejercicio sql
En SQLite no hay `MERGE`, pero podemos practicar la lógica de un upsert. Con la tabla `productos_hoy` (ya creada) actualiza el `precio` de los productos existentes en `productos` e inserta los nuevos, usando `INSERT ... ON CONFLICT`.
```sql setup
CREATE TABLE productos_hoy (producto_id INTEGER PRIMARY KEY, nombre TEXT, precio REAL);
INSERT INTO productos_hoy VALUES (1, 'Smartphone Apple Mini 300', 499.99), (2, 'Parlante Xiaomi Sport 900', 399.99), (301, 'Producto Nuevo X', 10.0)
```
```sql solucion
INSERT INTO productos (producto_id, nombre, precio)
SELECT producto_id, nombre, precio FROM productos_hoy WHERE true
ON CONFLICT (producto_id) DO UPDATE SET precio = excluded.precio;
```
```check
SELECT producto_id, nombre, precio FROM productos WHERE producto_id IN (1, 2, 3, 301) ORDER BY producto_id;
```
```pista
`INSERT INTO productos (...) SELECT ... FROM productos_hoy WHERE true ON CONFLICT (producto_id) DO UPDATE SET precio = excluded.precio;` (el `WHERE true` es un detalle de SQLite para que entienda el `ON CONFLICT` después de un SELECT).
```
:::
