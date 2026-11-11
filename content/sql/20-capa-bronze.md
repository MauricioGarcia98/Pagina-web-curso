---
titulo: La capa bronze - limpiar datos como llegan de verdad
nivel: Avanzado
duracion: 60
resumen: Duplicados por reenvíos, fechas y montos como texto, estados en dos idiomas, pruebas de QA, clientes desconocidos, JSON que cambia de formato. Todo junto, como en el trabajo.
objetivos: Medir los problemas de una tabla antes de limpiarla | Deduplicar quedándote con la versión más reciente | Convertir textos a fechas y números aunque lleguen en varios formatos | Unificar valores de una categoría escritos de muchas formas | Separar datos de prueba y registros huérfanos | Leer JSON con dos versiones de formato | Armar la consulta silver completa
prerrequisitos: sql-funciones | sql-fechas | sql-cte | sql-ventanas-1
autoevaluacion: ¿Mides cuántas filas tiene cada problema antes de limpiar? | ¿Sabes deduplicar quedándote con la última carga de cada pedido? | ¿Sabes convertir "1.234,50" y "$1234.50" al mismo número? | ¿Sabes unificar "Entregado", "ENTREGADO" y "delivered"? | ¿Sabes leer un campo de un JSON que cambió de formato? | ¿Sabes por qué la capa bronze guarda todo como texto?
---

:::escenario "Los números de la app no cierran"
Finanzas se queja: *"El tablero dice que en el segundo semestre vendimos más de lo que cobramos, y hay pedidos de 1 centavo."* Martín te pide revisar la carga que viene de la app.

La app manda los pedidos en archivos JSON que se cargan tal cual en `bronze_pedidos`. Abres la tabla y encuentras de todo: el mismo pedido dos veces, fechas en tres formatos, montos con coma, estados en inglés, pedidos de prueba del equipo de QA. Nadie hizo nada mal: **así llegan los datos**. Tu trabajo es convertir eso en una tabla confiable (la capa *silver*) sin perder nada en el camino.
:::

:::analogia En palabras simples
Los datos llegan como la ropa del lavarropas: mezclados, algunos al revés, uno que otro calcetín sin par. La capa **bronze** es el canasto donde se deja todo tal como llegó, sin tirar nada. Después, con paciencia, se separa, se dobla y se ordena. Esta lección es aprender a doblar: sacar duplicados, convertir textos a números y fechas, y no perder nada en el camino.
:::

## Por qué existe la capa bronze

En una arquitectura medallón, **bronze** guarda los datos **exactamente como llegaron**, con columnas extra que dicen de dónde vinieron (`archivo`) y cuándo se cargaron (`cargado_en`). Todo es texto, porque si declararas `fecha` como `DATE`, la fila con `"31/10/2024"` haría fallar la carga y perderías el dato.

Tres razones para no limpiar "en la entrada":

1. **Si la limpieza tiene un error, se vuelve a correr desde bronze**, sin pedirle a la app que reenvíe nada.
2. **Auditoría**: puedes mostrar qué llegó exactamente y cuándo.
3. **Los formatos cambian sin aviso**: lo que hoy es raro mañana es normal, y bronze lo absorbe sin romperse.

Mira las dos tablas antes de empezar:

```sql
SELECT * FROM bronze_pedidos LIMIT 12;
```

```sql
SELECT * FROM bronze_eventos_app WHERE evento_id IN (1, 2, 2000, 2001);
```

## Paso 1: medir antes de limpiar

Lo primero no es arreglar: es **medir**. Cuántas filas, cuántos pedidos distintos, cuántos nulos, cuántos formatos. Así sabes qué tan grave es cada problema y, después, puedes comprobar que la limpieza hizo lo que esperabas.

```sql
SELECT COUNT(*)                         AS filas,
       COUNT(DISTINCT pedido_id)        AS pedidos,
       COUNT(*) - COUNT(DISTINCT pedido_id) AS filas_repetidas,
       SUM(monto IS NULL)               AS sin_monto,
       SUM(fecha LIKE '__/__/____%')    AS fechas_dd_mm,
       SUM(fecha LIKE '%T%Z')           AS fechas_iso_utc
FROM bronze_pedidos;
```

:::tip `SUM(condición)` cuenta
En SQLite (y en PostgreSQL con `::int`), una condición vale 1 si es verdadera y 0 si no. `SUM(monto IS NULL)` cuenta cuántas filas no tienen monto. En otros motores se escribe `SUM(CASE WHEN … THEN 1 ELSE 0 END)` o `COUNT_IF`.
:::

## Paso 2: duplicados por reenvío

Cuando la app no recibe confirmación, **reenvía** el archivo. Por eso el mismo `pedido_id` aparece en dos archivos, y a veces el reenvío trae el estado **actualizado** (el pedido pasó de enviado a entregado). La regla de negocio: **quedarse con la versión más reciente** de cada pedido, la de mayor `cargado_en`.

```sql
WITH ranqueado AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY pedido_id ORDER BY cargado_en DESC) AS rn
  FROM bronze_pedidos
)
SELECT pedido_id, estado, archivo, cargado_en
FROM ranqueado
WHERE rn = 1;
```

:::cuidado DISTINCT no deduplica esto
`SELECT DISTINCT *` solo elimina filas **idénticas en todas las columnas**. Dos versiones del mismo pedido con distinto `archivo` o `estado` no son idénticas: hay que elegir cuál queda, y eso lo hace `ROW_NUMBER`.
:::

## Paso 3: fechas en tres formatos

| Ejemplo | Formato | Cómo llevarlo a `AAAA-MM-DD` |
|---|---|---|
| `2024-07-01` | ISO (el bueno) | `substr(fecha, 1, 10)` |
| `2024-07-01T00:00:00Z` | ISO con hora UTC | `substr(fecha, 1, 10)` |
| `01/07/2024 00:00` | día/mes/año | `substr(fecha, 7, 4) \|\| '-' \|\| substr(fecha, 4, 2) \|\| '-' \|\| substr(fecha, 1, 2)` |

```sql
SELECT fecha,
       CASE WHEN fecha LIKE '__/__/____%'
            THEN substr(fecha, 7, 4) || '-' || substr(fecha, 4, 2) || '-' || substr(fecha, 1, 2)
            ELSE substr(fecha, 1, 10)
       END AS fecha_iso
FROM bronze_pedidos
WHERE registro_id IN (1, 2, 3, 40, 41, 42, 80);
```

:::cuidado ¿01/07 es 1 de julio o 7 de enero?
El formato `DD/MM` es el de Latinoamérica y España; en Estados Unidos es `MM/DD`. Antes de convertir, **confirma con la fuente** cuál usan: un `13/01/2024` imposible como `MM/DD` es buena pista, pero no alcanza. En producción esto se documenta en el contrato de datos con la app.
:::

## Paso 4: montos como texto

| Llega | Qué es | Cómo convertir |
|---|---|---|
| `1234.50` | punto decimal | `CAST(monto AS REAL)` |
| `1.234,50` | miles con punto, decimal con coma | quitar los puntos, cambiar la coma por punto |
| `$1234.50` | con símbolo | quitar el `$` |
| `NULL` | no llegó | dejarlo nulo y contarlo |

```sql
SELECT monto,
       CAST(CASE WHEN monto LIKE '%,%' THEN REPLACE(REPLACE(monto, '.', ''), ',', '.')
                 WHEN monto LIKE '$%' THEN substr(monto, 2)
                 ELSE monto END AS REAL) AS monto_num
FROM bronze_pedidos
WHERE registro_id <= 12;
```

## Paso 5: una categoría escrita de muchas formas

`estado` llega con mayúsculas distintas y, desde una versión de la app, **en inglés**. Primero normalizas (`LOWER(TRIM(...))`) y después traduces con un `CASE`. En un proyecto real, esa traducción vive en una **tabla de mapeo** (un *seed* de dbt) para que agregar un valor nuevo no requiera cambiar código.

```sql
SELECT estado, COUNT(*) AS filas
FROM bronze_pedidos
GROUP BY estado
ORDER BY filas DESC;
```

:::nota Un valor que nadie te avisó
En octubre aparece `en_disputa`, un estado nuevo que la app agregó sin avisar. Un buen pipeline **no lo descarta en silencio**: lo deja pasar y avisa (un test de dbt `accepted_values` falla, y alguien decide qué hacer). Eso es un *cambio de esquema* de valores, tan común como una columna nueva (como `cupon`, que aparece desde julio).
:::

## Paso 6: lo que no es real

- **Pedidos de prueba**: el equipo de QA prueba en producción con emails `qa+N@tiendaandina.com` y montos de 1 centavo. Se excluyen de las métricas (pero se cuentan, para avisar).
- **Clientes desconocidos**: emails que no existen en `clientes`. No se borran: se marcan y se reportan, porque pueden ser clientes nuevos que todavía no llegaron a la tabla de clientes.

## Paso 7: JSON que cambió de formato

`bronze_eventos_app.payload` es JSON. En septiembre la app pasó de la versión 1 a la 2 y **cambió dónde está cada dato**:

| Dato | v1 | v2 |
|---|---|---|
| tipo de evento | `$.tipo` | `$.evento.tipo` |
| cliente | `$.cliente` | `$.usuario.id` |
| producto | `$.producto` | `$.producto.id` |

`json_extract(payload, '$.ruta')` saca un valor; `COALESCE` toma el primero que no sea nulo, así una sola consulta lee las dos versiones. Y `json_valid(payload)` descarta los que llegaron cortados.

```sql
SELECT evento_id,
       json_extract(payload, '$.v') AS version,
       COALESCE(json_extract(payload, '$.tipo'), json_extract(payload, '$.evento.tipo')) AS tipo,
       COALESCE(json_extract(payload, '$.cliente'), json_extract(payload, '$.usuario.id')) AS cliente_id
FROM bronze_eventos_app
WHERE json_valid(payload)
LIMIT 10 OFFSET 1495;
```

:::experto En otros motores
PostgreSQL usa `payload->>'tipo'` y `payload#>>'{evento,tipo}'`; BigQuery, `JSON_VALUE(payload, '$.evento.tipo')`; Spark y Databricks, `get_json_object` o `payload:evento.tipo`; SQL Server, `JSON_VALUE`. La idea (extraer por ruta y unificar versiones con `COALESCE`) es la misma.
:::

## La consulta silver, completa

Todo junto, en pasos con CTE: cada uno hace una sola cosa y se puede probar por separado.

```sql
WITH ultimo AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY pedido_id ORDER BY cargado_en DESC) AS rn
  FROM bronze_pedidos
),
tipado AS (
  SELECT pedido_id,
         LOWER(TRIM(cliente_email)) AS email,
         CASE WHEN fecha LIKE '__/__/____%'
              THEN substr(fecha, 7, 4) || '-' || substr(fecha, 4, 2) || '-' || substr(fecha, 1, 2)
              ELSE substr(fecha, 1, 10) END AS fecha,
         CAST(CASE WHEN monto LIKE '%,%' THEN REPLACE(REPLACE(monto, '.', ''), ',', '.')
                   WHEN monto LIKE '$%' THEN substr(monto, 2) ELSE monto END AS REAL) AS monto,
         CASE LOWER(TRIM(estado))
              WHEN 'delivered' THEN 'entregado' WHEN 'shipped' THEN 'enviado'
              WHEN 'pending' THEN 'pendiente' WHEN 'canceled' THEN 'cancelado'
              WHEN 'returned' THEN 'devuelto' ELSE LOWER(TRIM(estado)) END AS estado,
         canal, cupon
  FROM ultimo
  WHERE rn = 1
)
SELECT * FROM tipado
WHERE email NOT LIKE 'qa+%@tiendaandina.com'
LIMIT 20;
```

En dbt, esa consulta sería el modelo `silver_pedidos`, con tests de que `pedido_id` es único y no nulo, que `estado` está en la lista conocida y que `monto` es positivo.

:::errores
- Limpiar sin medir antes: no sabes si arreglaste algo.
- `DISTINCT` para deduplicar versiones distintas del mismo registro.
- Asumir un solo formato de fecha o de número.
- Borrar (en vez de marcar) los registros raros: después nadie sabe qué se perdió.
- Leer el JSON solo con la ruta de la versión nueva: los eventos viejos quedan en `NULL` sin aviso.
:::

:::trabajo
En la vida real esto se hace una vez con cuidado, se convierte en un modelo (dbt, Lakeflow Declarative Pipelines, un job de Spark) con tests, y se monitorea: cuántos duplicados, cuántas fechas raras y cuántos valores nuevos llegan cada día. Cuando alguno se dispara, la app cambió algo y te enteras antes que finanzas.
:::

:::entrevista "Te llega una tabla con duplicados, formatos mezclados y nulos. ¿Por dónde empiezas?"
Primero mido: filas, claves distintas, nulos por columna, formatos por columna. Acuerdo con el negocio las reglas (qué versión de un duplicado vale, qué formato de fecha usa la fuente, qué es un registro de prueba). Después limpio en pasos (deduplicar, tipar, normalizar, marcar lo raro), sin borrar nada en bronze, y dejo tests que fallen si aparece algo nuevo.
:::

:::ejercicio sql titulo="Medir el problema"
Muestra en una fila: `filas` (total de registros de `bronze_pedidos`), `pedidos` (pedidos distintos) y `repetidas` (la diferencia).
```sql solucion
SELECT COUNT(*) AS filas,
       COUNT(DISTINCT pedido_id) AS pedidos,
       COUNT(*) - COUNT(DISTINCT pedido_id) AS repetidas
FROM bronze_pedidos;
```
:::

:::ejercicio sql titulo="¿Cuáles se repiten?"
Lista los `pedido_id` que aparecen más de una vez, con la cantidad de veces (`veces`), ordenados por `pedido_id`.
```sql solucion
SELECT pedido_id, COUNT(*) AS veces
FROM bronze_pedidos
GROUP BY pedido_id
HAVING COUNT(*) > 1
ORDER BY pedido_id;
```
:::

:::ejercicio sql titulo="La última versión de cada pedido"
Deduplica `bronze_pedidos`: una fila por `pedido_id`, la de **mayor** `cargado_en`. Muestra `pedido_id`, `estado` y `cargado_en`.
```sql solucion
WITH r AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY pedido_id ORDER BY cargado_en DESC) AS rn
  FROM bronze_pedidos
)
SELECT pedido_id, estado, cargado_en
FROM r
WHERE rn = 1;
```
```pista
`ROW_NUMBER() OVER (PARTITION BY pedido_id ORDER BY cargado_en DESC)` numera 1 la carga más reciente de cada pedido.
```
:::

:::ejercicio sql titulo="Fechas a un solo formato"
Muestra `registro_id`, `fecha` y `fecha_iso` (en formato `AAAA-MM-DD`) para **todas** las filas de `bronze_pedidos`, convirtiendo los tres formatos.
```sql solucion
SELECT registro_id, fecha,
       CASE WHEN fecha LIKE '__/__/____%'
            THEN substr(fecha, 7, 4) || '-' || substr(fecha, 4, 2) || '-' || substr(fecha, 1, 2)
            ELSE substr(fecha, 1, 10)
       END AS fecha_iso
FROM bronze_pedidos;
```
:::

:::ejercicio sql titulo="Montos a número"
Muestra `registro_id`, `monto` y `monto_num` (número real) para todas las filas, convirtiendo `1.234,50`, `$1234.50` y `1234.50`. Los nulos quedan nulos.
```sql solucion
SELECT registro_id, monto,
       CAST(CASE WHEN monto LIKE '%,%' THEN REPLACE(REPLACE(monto, '.', ''), ',', '.')
                 WHEN monto LIKE '$%' THEN substr(monto, 2)
                 ELSE monto END AS REAL) AS monto_num
FROM bronze_pedidos;
```
```pista
Con coma: primero quita los puntos de miles (`REPLACE(monto, '.', '')`) y después cambia la coma por punto. Con `$`: `substr(monto, 2)` quita el primer carácter.
```
:::

:::ejercicio sql titulo="Estados unificados"
Cuenta cuántas filas hay por estado **normalizado** (`estado_norm`): en minúsculas, sin espacios y traduciendo `delivered`, `shipped`, `pending`, `canceled` y `returned` a `entregado`, `enviado`, `pendiente`, `cancelado` y `devuelto`. Columnas: `estado_norm`, `filas`.
```sql solucion
SELECT CASE LOWER(TRIM(estado))
            WHEN 'delivered' THEN 'entregado' WHEN 'shipped' THEN 'enviado'
            WHEN 'pending' THEN 'pendiente' WHEN 'canceled' THEN 'cancelado'
            WHEN 'returned' THEN 'devuelto' ELSE LOWER(TRIM(estado)) END AS estado_norm,
       COUNT(*) AS filas
FROM bronze_pedidos
GROUP BY estado_norm;
```
:::

:::ejercicio sql titulo="Los pedidos de prueba"
Lista los registros de prueba de QA (email que empieza con `qa+` y termina en `@tiendaandina.com`): `registro_id`, `cliente_email` y `monto`.
```sql solucion
SELECT registro_id, cliente_email, monto
FROM bronze_pedidos
WHERE cliente_email LIKE 'qa+%@tiendaandina.com';
```
:::

:::ejercicio sql titulo="Clientes desconocidos"
Cuenta cuántos registros (`registros`) tienen un email que, normalizado con `LOWER(TRIM(...))`, **no existe** en `clientes` (también normalizado), sin contar los de QA ni los emails nulos.
```sql solucion
SELECT COUNT(*) AS registros
FROM bronze_pedidos b
WHERE b.cliente_email IS NOT NULL
  AND b.cliente_email NOT LIKE 'qa+%@tiendaandina.com'
  AND LOWER(TRIM(b.cliente_email)) NOT IN (SELECT LOWER(TRIM(email)) FROM clientes WHERE email IS NOT NULL);
```
```pista
`NOT IN (SELECT …)` con la lista de emails normalizados de `clientes`. Ojo: si la subconsulta trae algún `NULL`, `NOT IN` no devuelve nada; por eso el `WHERE email IS NOT NULL`.
```
:::

:::ejercicio sql titulo="JSON con dos versiones"
Cuenta los eventos válidos de `bronze_eventos_app` por `tipo`, leyendo `$.tipo` (v1) o `$.evento.tipo` (v2). Descarta los JSON inválidos. Columnas: `tipo`, `eventos`.
```sql solucion
SELECT COALESCE(json_extract(payload, '$.tipo'), json_extract(payload, '$.evento.tipo')) AS tipo,
       COUNT(*) AS eventos
FROM bronze_eventos_app
WHERE json_valid(payload)
GROUP BY tipo;
```
:::

:::ejercicio sql titulo="¿Cuántos llegaron rotos?"
Muestra en una fila cuántos eventos tienen JSON inválido (`invalidos`) y cuántos son de cada versión válida (`v1`, `v2`).
```sql solucion
SELECT SUM(NOT json_valid(payload)) AS invalidos,
       SUM(CASE WHEN json_valid(payload) THEN json_extract(payload, '$.v') = 1 ELSE 0 END) AS v1,
       SUM(CASE WHEN json_valid(payload) THEN json_extract(payload, '$.v') = 2 ELSE 0 END) AS v2
FROM bronze_eventos_app;
```
```pista
`json_valid(payload) AND json_extract(...)` falla con `malformed JSON`: SQL no garantiza que evalúe primero la izquierda del `AND`. `CASE WHEN json_valid(payload) THEN json_extract(...) ELSE 0 END` sí: solo mira el JSON cuando es válido.
```
:::

:::ejercicio sql titulo="Silver: ventas por mes"
Con la limpieza completa (última versión de cada pedido, montos convertidos, estados unificados, sin QA), calcula por mes (`mes`, formato `AAAA-MM`) el total vendido (`ventas`, redondeado a 2 decimales) de los pedidos **entregados**. Ordena por mes.
```sql solucion
WITH ultimo AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY pedido_id ORDER BY cargado_en DESC) AS rn
  FROM bronze_pedidos
),
silver AS (
  SELECT CASE WHEN fecha LIKE '__/__/____%'
              THEN substr(fecha, 7, 4) || '-' || substr(fecha, 4, 2) || '-' || substr(fecha, 1, 2)
              ELSE substr(fecha, 1, 10) END AS fecha,
         CAST(CASE WHEN monto LIKE '%,%' THEN REPLACE(REPLACE(monto, '.', ''), ',', '.')
                   WHEN monto LIKE '$%' THEN substr(monto, 2) ELSE monto END AS REAL) AS monto,
         CASE LOWER(TRIM(estado))
              WHEN 'delivered' THEN 'entregado' WHEN 'shipped' THEN 'enviado'
              WHEN 'pending' THEN 'pendiente' WHEN 'canceled' THEN 'cancelado'
              WHEN 'returned' THEN 'devuelto' ELSE LOWER(TRIM(estado)) END AS estado,
         cliente_email
  FROM ultimo
  WHERE rn = 1
)
SELECT substr(fecha, 1, 7) AS mes, ROUND(SUM(monto), 2) AS ventas
FROM silver
WHERE estado = 'entregado'
  AND (cliente_email IS NULL OR cliente_email NOT LIKE 'qa+%@tiendaandina.com')
GROUP BY mes
ORDER BY mes;
```
```pista
Arma la consulta en CTE: `ultimo` (deduplicar), `silver` (convertir fecha, monto y estado) y al final agrupa por `substr(fecha, 1, 7)`.
```
:::
