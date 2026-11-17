---
titulo: Tablas Delta - historial, viaje en el tiempo y restaurar
nivel: 3 · Intermedio
duracion: 45
resumen: Toda tabla que creas en Databricks es Delta - cada escritura (crear, insertar, actualizar, borrar) deja una versión nueva. Qué es Delta y por qué importa, leer el historial con DESCRIBE HISTORY y en la pestaña History, consultar una versión anterior con VERSION AS OF o TIMESTAMP AS OF, volver atrás con RESTORE, y qué muestra Details - archivos, tamaño, ubicación.
objetivos: Explicar qué aporta el formato Delta | Leer el historial de una tabla | Consultar una versión anterior | Restaurar una tabla a una versión | Interpretar la pestaña Details
prerrequisitos: databricks-paso-a-paso-proyecto-cargar-y-consultar
autoevaluacion: ¿Sabes qué crea una versión nueva? | ¿Sabes escribir VERSION AS OF? | ¿Sabes qué hace RESTORE? | ¿Sabes cuánto tiempo se conservan las versiones?
---

:::analogia En palabras simples
Una tabla Delta es como un documento con control de cambios activado: cada vez que alguien escribe, queda registrado quién, cuándo y qué hizo, y puedes abrir el documento como estaba en cualquier versión anterior. En una base de datos común, un `DELETE` equivocado es para siempre; en Delta, no.
:::

## Paso 1 — Qué es Delta

Delta Lake es el formato de las tablas del lakehouse: archivos **Parquet** (columnas comprimidas) más un **registro de transacciones** (`_delta_log`) que anota cada cambio. Eso da:

| Propiedad | Qué significa en la práctica |
|---|---|
| **Transacciones ACID** | Una escritura se ve completa o no se ve; dos procesos no se pisan |
| **Historial y viaje en el tiempo** | Leer la tabla como estaba hace una hora o diez versiones atrás |
| **Esquema controlado** | Una columna de más en un archivo nuevo no rompe la tabla sin avisar |
| **`UPDATE`, `DELETE`, `MERGE`** | Sobre archivos de un lago, que antes eran solo de agregar |
| **Rendimiento** | Estadísticas por archivo, compactación (`OPTIMIZE`), agrupamiento |

## Paso 2 — Crear versiones

En el editor SQL, una tabla de prueba y tres escrituras:

```sql norun
CREATE OR REPLACE TABLE main.default.clientes_demo AS
SELECT cliente_id, nombre, email, pais, segmento FROM samples.tienda.clientes LIMIT 50;

UPDATE main.default.clientes_demo SET segmento = 'vip' WHERE pais = 'Argentina';

DELETE FROM main.default.clientes_demo WHERE email IS NULL;
```

Ejecuta cada sentencia por separado (o selecciónala y **Run selected**). Ahora el historial:

```sql norun
DESCRIBE HISTORY main.default.clientes_demo;
```

```captura
archivo: databricks/d09-describe-history.webp
texto: Tres versiones - 0 CREATE TABLE AS SELECT, 1 UPDATE, 2 DELETE, con usuario, hora y parámetros de cada operación
```

La columna `operationParameters` guarda el `WHERE` del `UPDATE` y del `DELETE`: la respuesta a "¿quién borró qué?".

## Paso 3 — Viaje en el tiempo

```sql norun
SELECT 'ahora' AS version, COUNT(*) AS vip FROM main.default.clientes_demo WHERE segmento = 'vip'
UNION ALL
SELECT 'version 0', COUNT(*) FROM main.default.clientes_demo VERSION AS OF 0 WHERE segmento = 'vip';
```

```captura
archivo: databricks/d09-time-travel.webp
texto: La misma consulta sobre la tabla actual y sobre la versión 0 - 6 clientes VIP ahora, 0 antes del UPDATE
```

| Forma | Ejemplo |
|---|---|
| Por versión | `... VERSION AS OF 1` |
| Por momento | `... TIMESTAMP AS OF '2026-11-14 13:07:13'` |
| Sintaxis con arroba | `main.default.clientes_demo@v1` |

Úsalo para comparar "antes y después" de una carga, para reproducir un informe con los datos de ese día, o para recuperar filas borradas.

## Paso 4 — Restaurar

Si el `DELETE` fue un error:

```sql norun
RESTORE TABLE main.default.clientes_demo TO VERSION AS OF 1;
```

Restaurar **no borra el historial**: crea una versión nueva (la 3) cuyo contenido es igual al de la 1. Siempre puedes volver.

## Paso 5 — History y Details en el catálogo

```captura
archivo: databricks/d09-historial-tab.webp
texto: La pestaña History de la tabla muestra lo mismo que DESCRIBE HISTORY, sin escribir SQL
```

```captura
archivo: databricks/d09-detalles.webp
texto: Details - formato, ubicación de los archivos, cantidad de archivos y tamaño
```

En **Details** ves cuántos archivos tiene la tabla. Muchas escrituras chicas dejan muchos archivos chicos y las lecturas se vuelven lentas: `OPTIMIZE main.default.clientes_demo` los compacta.

:::cuidado VACUUM borra el pasado
Las versiones viejas ocupan espacio. `VACUUM tabla` elimina los archivos que ya no usa la versión actual y que tienen más de **7 días** (el valor por defecto). Después de un `VACUUM`, el viaje en el tiempo a esas versiones **ya no funciona**. En producción se corre con criterio, no "para limpiar".
:::

:::errores
- **Corregir borrados a mano.** `DESCRIBE HISTORY` muestra la versión anterior y `RESTORE` vuelve a ella.
- **`VACUUM` con retención corta.** Borra los archivos viejos y con ellos la posibilidad de volver atrás.
- **Creer que RESTORE borra el historial.** Crea una versión nueva igual a la elegida; las demás siguen.
:::

## ✅ Lo que lograste

- Entiendes qué aporta Delta.
- Lees el historial y consultas versiones anteriores.
- Sabes restaurar y qué cuidado tener con `VACUUM`.

:::ejercicio quiz
¿Qué crea una versión nueva en una tabla Delta?
- [ ] Solo CREATE TABLE
- [x] Cualquier escritura: crear, insertar, actualizar, borrar, fusionar, restaurar
- [ ] Solo los SELECT
- [ ] Cada vez que se ejecuta un SELECT sobre la tabla
:::

:::ejercicio quiz
Alguien borró filas por error hace una hora. ¿Qué haces?
- [ ] Las vuelvo a escribir a mano
- [x] Miro DESCRIBE HISTORY, encuentro la versión anterior al DELETE y hago RESTORE TABLE … TO VERSION AS OF esa versión
- [ ] Borro la tabla
- [ ] Pido a soporte que restaure el backup de anoche
:::

:::ejercicio quiz
Después de RESTORE a la versión 1, ¿qué pasa con la versión 2?
- [ ] Se borra
- [x] Sigue en el historial; RESTORE crea una versión 3 igual a la 1
- [ ] Se convierte en la 1
- [ ] Se bloquea
:::

:::ejercicio quiz
¿Por qué VACUUM se corre con cuidado?
- [ ] Porque es lento
- [x] Porque borra los archivos de versiones viejas y después no se puede viajar en el tiempo a ellas
- [ ] Porque borra la tabla
- [ ] Porque bloquea la tabla durante una hora
:::
