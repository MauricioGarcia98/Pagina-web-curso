---
titulo: Cambios de esquema - la columna que desapareció
nivel: Avanzado
duracion: 55
resumen: Schema drift (el origen cambia su esquema sin que el pipeline lo sepa) - columnas renombradas que llegan como NULL, tipos que cambian (decimales con coma, centavos en vez de unidades), valores nuevos en un estado. Cómo detectarlo con jq, grep y SQL, cómo reparar los datos ya cargados y cómo prevenirlo con contratos de datos y los modos de evolución de esquema de Spark y Auto Loader.
objetivos: Comparar el esquema de dos muestras de datos con jq | Medir la tasa de nulos por carga para encontrar cuándo empezó el cambio | Reparar una columna con datos de la columna nueva convirtiendo unidades | Normalizar números con formatos regionales distintos | Detectar diferencias de columnas entre dos tablas desde el catálogo
prerrequisitos: incidentes-monitoreo-y-checks
autoevaluacion: ¿Sabes por qué un cambio de nombre de columna puede no romper el pipeline pero sí los datos? | ¿Sabes qué hacen los modos PERMISSIVE, DROPMALFORMED y FAILFAST? | ¿Sabes qué cambios de esquema son seguros y cuáles rompen? | ¿Sabes qué es un contrato de datos? | ¿Sabes comparar esquemas consultando el catálogo?
---

:::escenario
El tablero de ingresos muestra que el 28/10 se cobraron **cero dólares**, pero la cantidad de pagos es normal. El pipeline de pagos terminó OK en 41 segundos. El equipo de Payments publicó la versión 4 de su API la noche anterior. Nadie en tu equipo lo leyó.
:::

## La idea en una frase

**Schema drift** es cuando el esquema de los datos de origen cambia (columnas nuevas, renombradas, borradas, tipos distintos) y el pipeline sigue funcionando como si nada. El peor caso no es que falle: es que **siga** y cargue nulos o valores mal interpretados.

## Los tipos de cambio y qué tan peligrosos son

| Cambio | Ejemplo | Riesgo |
|---|---|---|
| **Columna nueva** | Aparece `currency` | Bajo: se ignora o se agrega |
| **Columna renombrada** | `amount` → `amount_cents` | **Alto**: la columna vieja llega como NULL, sin error |
| **Cambio de unidad** | Unidades → centavos | **Muy alto**: los números parecen válidos y están ×100 |
| **Cambio de tipo** | `"1.234,50"` (texto con coma decimal) donde había `1234.50` | Alto: falla el casteo o se trunca |
| **Valor nuevo en un dominio** | Estado `PENDING_REVIEW` | Medio: los `CASE WHEN` que no lo contemplan lo cuentan mal |
| **Columna borrada** | Desaparece `customer_email` | Alto: falla o llega nula |
| **Cambio de anidamiento** | `address.city` pasa a `shipping.address.city` | Alto en JSON: queda NULL sin error |

:::cuidado Los lectores permisivos esconden el problema
Spark lee JSON y CSV en modo **PERMISSIVE** por defecto: si un campo no existe o no se puede convertir, lo deja en NULL y sigue. Los otros modos son **DROPMALFORMED** (descarta los registros que no se pueden leer) y **FAILFAST** (falla en el primero). Para datos críticos, conviene fallar o mandar los registros malos a una columna de rescate (`columnNameOfCorruptRecord` en Spark, `_rescued_data` en Auto Loader de Databricks) en lugar de convertirlos en nulos.
:::

## Cómo se ve en el log

```text
2026-10-29 01:10:02 WARN  ingesta_pagos  archivo part-0000.json: columna "amount" no existe; se completa con NULL (modo PERMISSIVE)
2026-10-29 01:10:03 WARN  ingesta_pagos  archivo part-0000.json: columnas desconocidas ignoradas: amount_cents, currency
```

Dos warnings por archivo, catorce archivos y un **Fin OK**. Nadie lee los warnings de un job que termina bien. Por eso el check de nulos de la lección anterior es la red de seguridad.

## Evolución de esquema en las herramientas

| Herramienta | Opción | Qué hace |
|---|---|---|
| Delta Lake | `mergeSchema = true` | Agrega columnas nuevas a la tabla al escribir. **No** resuelve renombres: `amount` sigue y `amount_cents` se agrega aparte |
| Auto Loader | `cloudFiles.schemaEvolutionMode` | `addNewColumns` (por defecto: el stream se detiene, actualiza el esquema y hay que reiniciarlo), `rescue` (lo nuevo va a `_rescued_data`), `failOnNewColumns`, `none` |
| BigQuery | `--schema_update_option=ALLOW_FIELD_ADDITION` | Permite agregar columnas al cargar |
| dbt | `on_schema_change` en modelos incrementales | `ignore` (por defecto), `fail`, `append_new_columns`, `sync_all_columns` |

## Prevenir: contratos de datos

Un **contrato de datos** es un acuerdo explícito, versionado y verificable entre quien produce los datos y quien los consume: nombres, tipos, unidades, valores permitidos, frescura y a quién avisar. Con un contrato:

- Los cambios que **rompen** (renombrar, cambiar de unidad, borrar) requieren una versión nueva y un período de transición en el que conviven la columna vieja y la nueva.
- El productor corre el contrato en su CI: si su cambio lo viola, su deploy falla **antes** de llegar a producción.
- El consumidor valida el contrato al leer (dbt `contract: enforced: true`, esquemas en un registro como Confluent Schema Registry para Kafka).

## Práctica

:::ejercicio cli dificultad=Básico titulo="Preparar el incidente"
Prepara los archivos del incidente `schema`.
```respuesta
incidente-preparar schema
```
:::

:::ejercicio cli dificultad=Intermedio titulo="Las claves de la muestra nueva"
Las muestras están en `~/incidentes/schema/muestra_pagos_2026-10-27.json` y `…-28.json`. Muestra las **claves** (`keys`) del primer registro de la muestra del **28/10** con `jq`.
```setup
incidente-preparar schema
```
```respuesta
jq ['"]?\.\[0\] ?\| ?keys['"]? \S*muestra_pagos_2026-10-28\.json
jq -c ['"]?\.\[0\] ?\| ?keys['"]? \S*muestra_pagos_2026-10-28\.json
```
```solucion
jq '.[0] | keys' ~/incidentes/schema/muestra_pagos_2026-10-28.json
```
```pista
`.[0]` es el primer elemento del arreglo y `keys` lista sus claves: `jq '.[0] | keys' archivo`.
```
```explicacion
Haz lo mismo con la muestra del 27/10 y compara: desapareció `amount`, aparecieron `amount_cents` y `currency`.
```
:::

:::ejercicio quiz dificultad=Intermedio
Mirando las dos muestras y `~/incidentes/schema/changelog_api_pagos.md`, ¿qué cambió y por qué es peligroso?

- [ ] Solo se agregó `currency`: es un cambio seguro
- [x] `amount` (decimal, en unidades) se reemplazó por `amount_cents` (entero, en centavos): la columna vieja llega NULL, y si se usara la nueva sin convertir, los montos quedarían ×100
- [ ] Cambió el formato de `created_at`
- [ ] Se borró `payment_id`
:::

:::ejercicio cli dificultad=Básico titulo="¿Cuántos archivos afectados?"
Cuenta las líneas del log `~/incidentes/schema/logs/ingesta_pagos.log` que dicen que la columna `amount` **no existe**.
```setup
incidente-preparar schema
```
```respuesta
grep -c ['"]?no existe['"]? \S*ingesta_pagos\.log
grep ['"]?no existe['"]? \S*ingesta_pagos\.log \| wc -l
grep -c ['"]?amount" no existe['"]? \S*ingesta_pagos\.log
```
```solucion
grep -c "no existe" ~/incidentes/schema/logs/ingesta_pagos.log
```
```pista
`grep -c "texto con espacios" archivo`.
```
```explicacion
Los 14 archivos del día. No es un archivo corrupto: es un cambio del origen que afecta toda la carga.
```
:::

:::ejercicio sql ordenado dificultad=Intermedio titulo="¿Desde cuándo?"
`stg_pagos_api` tiene los pagos de 5 días. Por cada `ds`, devuelve `filas`, `nulos` (filas con `amount` NULL) y `pct_nulos` (1 decimal). Ordena por `ds`.
```sql setup
CREATE TABLE stg_pagos_api (payment_id TEXT, ds TEXT, amount REAL, amount_cents INTEGER, currency TEXT, status TEXT);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 500)
INSERT INTO stg_pagos_api
SELECT 'pay_' || i, date('2026-10-24', '+' || (i % 5) || ' days'),
       CASE WHEN i % 5 = 4 OR i % 97 = 0 THEN NULL ELSE ROUND(10 + (i * 3.7) % 200, 2) END,
       CASE WHEN i % 5 = 4 THEN CAST(ROUND((10 + (i * 3.7) % 200) * 100) AS INTEGER) END,
       CASE WHEN i % 5 = 4 THEN 'USD' END,
       CASE WHEN i % 5 = 4 AND i % 3 = 0 THEN 'PENDING_REVIEW' WHEN i % 11 = 0 THEN 'REFUNDED' ELSE 'PAID' END
FROM n;
```
```sql solucion
SELECT ds, COUNT(*) AS filas,
       SUM(CASE WHEN amount IS NULL THEN 1 ELSE 0 END) AS nulos,
       ROUND(100.0 * SUM(CASE WHEN amount IS NULL THEN 1 ELSE 0 END) / COUNT(*), 1) AS pct_nulos
FROM stg_pagos_api
GROUP BY ds
ORDER BY ds;
```
```pista
`SUM(CASE WHEN amount IS NULL THEN 1 ELSE 0 END)` cuenta los nulos. También sirve `COUNT(*) - COUNT(amount)`.
```
```explicacion
Los días anteriores tienen alrededor de un 1 % de nulos (ruido normal: pagos rechazados sin monto). El 28/10 tiene el 100 %. El corte coincide exactamente con el deploy de la API v4.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="Reparar los montos"
La ingesta ya se corrigió y ahora `stg_pagos_api` trae también `amount_cents`. Repara las filas con `amount` NULL que tengan `amount_cents`: `amount` debe quedar en **unidades** (centavos ÷ 100).
```sql setup
CREATE TABLE stg_pagos_api (payment_id TEXT, ds TEXT, amount REAL, amount_cents INTEGER, currency TEXT, status TEXT);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 500)
INSERT INTO stg_pagos_api
SELECT 'pay_' || i, date('2026-10-24', '+' || (i % 5) || ' days'),
       CASE WHEN i % 5 = 4 OR i % 97 = 0 THEN NULL ELSE ROUND(10 + (i * 3.7) % 200, 2) END,
       CASE WHEN i % 5 = 4 THEN CAST(ROUND((10 + (i * 3.7) % 200) * 100) AS INTEGER) END,
       CASE WHEN i % 5 = 4 THEN 'USD' END,
       CASE WHEN i % 5 = 4 AND i % 3 = 0 THEN 'PENDING_REVIEW' WHEN i % 11 = 0 THEN 'REFUNDED' ELSE 'PAID' END
FROM n;
```
```sql solucion
UPDATE stg_pagos_api
SET amount = amount_cents / 100.0
WHERE amount IS NULL AND amount_cents IS NOT NULL;
```
```check
SELECT ds, COUNT(*) AS filas, COUNT(amount) AS con_monto, ROUND(SUM(amount), 2) AS total
FROM stg_pagos_api GROUP BY ds ORDER BY ds;
```
```pista
`UPDATE … SET amount = amount_cents / 100.0 WHERE amount IS NULL AND amount_cents IS NOT NULL`.
```
```pista
Usa `100.0` y no `100`: en SQLite (y en muchos motores) un entero dividido un entero da un entero y perderías los centavos.
```
```explicacion
El total del 28/10 queda en el orden de los otros días. Si hubieras usado `amount_cents` sin dividir, el tablero mostraría ingresos 100 veces más altos: el error opuesto, y más difícil de notar porque "es una buena noticia".
```
:::

:::ejercicio sql ordenado dificultad=Avanzado titulo="Números con formato regional"
Un proveedor de Europa empezó a mandar `monto_txt` como texto con **punto de miles y coma decimal** (`1.234,50`), mezclado con el formato anterior (`1234.50`). Devuelve `id`, `monto_txt` y `monto` (número real): si el texto tiene coma, quita los puntos y cambia la coma por punto; si no, conviértelo tal cual. Ordena por `id`.
```sql setup
CREATE TABLE facturas_proveedor (id INTEGER PRIMARY KEY, monto_txt TEXT);
INSERT INTO facturas_proveedor VALUES (1, '1234.50'), (2, '980.00'), (3, '1.234,50'), (4, '12.500,75'), (5, '75,10'), (6, '15000');
```
```sql solucion
SELECT id, monto_txt,
       CASE WHEN monto_txt LIKE '%,%'
            THEN CAST(REPLACE(REPLACE(monto_txt, '.', ''), ',', '.') AS REAL)
            ELSE CAST(monto_txt AS REAL) END AS monto
FROM facturas_proveedor
ORDER BY id;
```
```pista
Primero `REPLACE(monto_txt, '.', '')` para sacar los puntos de miles y después `REPLACE(…, ',', '.')` para la coma decimal. Solo cuando el texto tiene coma.
```
```explicacion
`CAST('1.234,50' AS REAL)` en SQLite da `1.234`: convierte hasta donde puede y se calla. Otros motores fallan (`TRY_CAST` devuelve NULL). Por eso los montos de texto se validan con un check: por ejemplo, que el total del archivo coincida con el total que informa el proveedor.
```
:::

:::ejercicio sql ordenado dificultad=Intermedio titulo="Valores fuera del dominio"
El contrato dice que `status` solo puede ser `PAID`, `REFUNDED` o `FAILED`. Devuelve los valores de `status` que **no** están en esa lista y cuántas filas tiene cada uno, de mayor a menor (en caso de empate, ordena por `status`).
```sql setup
CREATE TABLE stg_pagos_api (payment_id TEXT, ds TEXT, amount REAL, amount_cents INTEGER, currency TEXT, status TEXT);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 500)
INSERT INTO stg_pagos_api
SELECT 'pay_' || i, date('2026-10-24', '+' || (i % 5) || ' days'),
       CASE WHEN i % 5 = 4 OR i % 97 = 0 THEN NULL ELSE ROUND(10 + (i * 3.7) % 200, 2) END,
       CASE WHEN i % 5 = 4 THEN CAST(ROUND((10 + (i * 3.7) % 200) * 100) AS INTEGER) END,
       CASE WHEN i % 5 = 4 THEN 'USD' END,
       CASE WHEN i % 5 = 4 AND i % 3 = 0 THEN 'PENDING_REVIEW' WHEN i % 11 = 0 THEN 'REFUNDED' ELSE 'PAID' END
FROM n;
INSERT INTO stg_pagos_api VALUES ('pay_9001', '2026-10-28', 12.5, 1250, 'USD', 'paid'), ('pay_9002', '2026-10-28', 40, 4000, 'USD', NULL);
```
```sql solucion
SELECT status, COUNT(*) AS filas
FROM stg_pagos_api
WHERE status NOT IN ('PAID', 'REFUNDED', 'FAILED') OR status IS NULL
GROUP BY status
ORDER BY filas DESC, status;
```
```pista
`WHERE status NOT IN ('PAID', 'REFUNDED', 'FAILED')`… pero ojo: `NULL NOT IN (…)` no es verdadero.
```
```pista
Agrega `OR status IS NULL` para que los nulos también aparezcan.
```
```explicacion
Tres problemas distintos: `PENDING_REVIEW` (un estado nuevo y legítimo: hay que actualizar el contrato y los `CASE WHEN`), `paid` en minúsculas (un error de un sistema) y un `NULL`. Un test `accepted_values` de dbt los detecta a los tres, siempre que no olvides los nulos.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="Comparar esquemas desde el catálogo"
`pagos_v3` es la tabla actual y `pagos_v4` la que crea la nueva versión del pipeline. Usa `pragma_table_info('tabla')` (el catálogo de SQLite: una fila por columna con `name` y `type`) para listar las columnas de `pagos_v3` que **no existen** en `pagos_v4`, con su tipo.
```sql setup
CREATE TABLE pagos_v3 (payment_id TEXT, order_id INTEGER, amount REAL, status TEXT, created_at TEXT);
CREATE TABLE pagos_v4 (payment_id TEXT, order_id INTEGER, amount_cents INTEGER, currency TEXT, status TEXT, created_at TEXT);
```
```sql solucion
SELECT name, type
FROM pragma_table_info('pagos_v3')
WHERE name NOT IN (SELECT name FROM pragma_table_info('pagos_v4'));
```
```pista
`SELECT name, type FROM pragma_table_info('pagos_v3')` lista las columnas. Filtra las que no aparecen en el mismo listado de `pagos_v4`.
```
```explicacion
En otros motores la misma consulta va contra `information_schema.columns`. Correrla en el CI antes de cada deploy (o comparando contra el contrato) detecta los cambios que rompen antes de que lleguen a producción.
```
:::

:::ejercicio quiz dificultad=Avanzado
Activas `mergeSchema = true` en la escritura Delta de `pagos` para "que no vuelva a fallar por el esquema". ¿Qué pasa con el cambio de esta API?

- [ ] Delta detecta que `amount_cents` es el nuevo nombre de `amount` y migra los datos
- [x] Delta agrega `amount_cents` y `currency` como columnas nuevas; `amount` sigue existiendo y llega NULL: el problema de los montos no se resuelve
- [ ] Delta rechaza la escritura
- [ ] Delta convierte los centavos a unidades
:::

:::ejercicio quiz dificultad=Avanzado
Para una ingesta crítica con Auto Loader, quieres que los campos inesperados **no se pierdan** y que el stream no se detenga por cada columna nueva. ¿Qué modo de evolución eliges?

- [ ] `none`
- [ ] `failOnNewColumns`
- [x] `rescue`: lo que no encaja en el esquema va a la columna `_rescued_data` y un check la vigila
- [ ] `addNewColumns` con `mergeSchema` desactivado
:::

:::ejercicio quiz dificultad=Intermedio
¿Qué acción del postmortem ataca la **causa** de este incidente?

- [ ] Leer todos los canales de anuncios de la empresa todos los días
- [x] Un contrato de datos versionado con Payments que su CI valida, y un período de transición en el que convivan `amount` y `amount_cents`
- [ ] Cambiar el lector a modo PERMISSIVE
- [ ] Desactivar los warnings del log
:::

:::errores
- **Usar la columna nueva sin leer el contrato**: `amount_cents` sumado como si fueran unidades multiplica los ingresos por 100.
- **"Arreglarlo" con mergeSchema**: agrega columnas, no resuelve renombres ni cambios de unidad.
- **Castear texto sin validar**: `CAST('1.234,50' AS REAL)` da 1,234 en SQLite sin error.
- **Olvidar los NULL en `NOT IN`**: un test de dominio que no los cuenta deja pasar el problema.
- **Reparar la tabla final y no la de origen**: si la capa bronze/raw tiene los datos buenos (`amount_cents`), reprocesa desde ahí; si solo existe la capa final, deja documentado cómo se corrigió.
:::

:::trabajo
- Guarda los datos **crudos** (bronze) tal como llegan, con todas las columnas: si el esquema cambia, puedes reprocesar sin pedirle nada al origen.
- Los esquemas de eventos se versionan en un **registro de esquemas** (Confluent Schema Registry, AWS Glue Schema Registry) con reglas de compatibilidad (`BACKWARD`, `FORWARD`, `FULL`).
- Los equipos maduros tienen un canal de **cambios de datos** y una regla: ningún cambio que rompa se publica sin aviso y sin período de transición.
:::

:::entrevista
**"¿Cómo manejas los cambios de esquema en una ingesta?"** Distingue cambios aditivos (se pueden aceptar automáticamente) de los que rompen (renombres, tipos, unidades: tienen que fallar rápido o ir a cuarentena). Menciona la capa cruda inmutable para reprocesar, el check de nulos por carga, los modos de lectura (PERMISSIVE/FAILFAST, columna de rescate) y los contratos de datos con el productor.
:::

## Resumen

| Síntoma | Causa probable | Dónde mirar |
|---|---|---|
| Una columna 100 % NULL desde una fecha | Renombre o columna borrada en el origen | Claves de la muestra (`jq keys`), changelog del productor |
| Montos ×100 o ÷100 | Cambio de unidad | Contrato, documentación de la API |
| Montos truncados | Formato regional en texto | Muestras crudas, `CAST` |
| Categorías "otros" que crecen | Valor nuevo en el dominio | Test de valores aceptados |
