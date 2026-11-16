---
titulo: Time Travel - consultar y recuperar los datos del pasado
nivel: 4 · Intermedio-avanzado
duracion: 40
resumen: Alguien ejecuta un DELETE sin WHERE y se borran todos los pedidos. Con Time Travel consultas la tabla tal como estaba justo antes de esa sentencia (BEFORE STATEMENT), la restauras con un INSERT, y aprendes AT y BEFORE con OFFSET y TIMESTAMP, la retención y la diferencia con Fail-safe.
objetivos: Consultar una tabla en el pasado con AT y BEFORE | Recuperar datos borrados con el Query ID | Configurar la retención de Time Travel | Distinguir Time Travel de Fail-safe
prerrequisitos: snowflake-paso-a-paso-proyecto-carga-incremental
autoevaluacion: ¿Sabes consultar la tabla antes de una sentencia? | ¿Sabes de dónde sacar el Query ID? | ¿Sabes cuánto dura Time Travel por defecto? | ¿Sabes quién puede usar Fail-safe?
---

:::escenario El incidente
Un viernes a las 18:00, alguien prueba un `DELETE` en la hoja equivocada:
:::

:::analogia Volver al minuto anterior al error
Time Travel es poder mirar la tabla como estaba antes de un momento exacto. Lo más preciso no es "hace una hora" sino "justo antes de esta sentencia": con el Query ID del `DELETE` vuelves al instante anterior sin adivinar horarios.
:::

## Paso 1 — El error

```sql norun
USE SCHEMA tienda_dev.analitica;
-- ¡sin WHERE! borra todos los pedidos
DELETE FROM pedidos_actuales;
```

```captura
archivo: snowflake/s13-delete.webp
texto: El DELETE sin WHERE (1) - 7 filas borradas - y su Query ID en Query Details (2)
```

Copia el **Query ID** del DELETE (de Query Details o de Query History).

## Paso 2 — Mirar el pasado

```sql norun
SELECT * FROM pedidos_actuales BEFORE(STATEMENT => '01b0...-0046') ORDER BY pedido_id;
```

```captura
archivo: snowflake/s13-before.webp
texto: BEFORE(STATEMENT => ...) (1) - los 7 pedidos tal como estaban justo antes del DELETE (2)
```

| Forma | Qué devuelve |
|---|---|
| `AT(OFFSET => -60*5)` | La tabla hace 5 minutos |
| `AT(TIMESTAMP => '2026-11-15 17:55:00'::timestamp_tz)` | La tabla en ese instante |
| `BEFORE(STATEMENT => '<query id>')` | La tabla justo antes de esa sentencia: lo más preciso |

## Paso 3 — Restaurar

```sql norun
INSERT INTO pedidos_actuales
SELECT * FROM pedidos_actuales BEFORE(STATEMENT => '01b0...-0046');

SELECT COUNT(*) AS recuperados FROM pedidos_actuales;
```

```captura
archivo: snowflake/s13-restaurado.webp
texto: El INSERT desde el pasado (1) y los 7 pedidos recuperados (2)
```

## Paso 4 — Cuánto dura

| Concepto | Duración | Quién lo usa |
|---|---|---|
| **Time Travel** | 1 día por defecto; hasta 90 días en Enterprise (`DATA_RETENTION_TIME_IN_DAYS`) | Tú, con SQL |
| **Fail-safe** | 7 días después de Time Travel (solo tablas permanentes) | Solo el soporte de Snowflake, para desastres |

```sql norun
ALTER TABLE pedidos_actuales SET DATA_RETENTION_TIME_IN_DAYS = 7;
```

:::cuidado No es un backup gratis
Cada versión anterior ocupa almacenamiento mientras dure la retención. Más días de Time Travel = más costo de almacenamiento en tablas que cambian mucho.
:::

:::errores
- **Esperar demasiado.** Por defecto la retención es de 1 día; pasado ese plazo los datos solo quedan en Fail-safe, que solo recupera el soporte de Snowflake.
- **Restaurar con `INSERT` sobre una tabla que no quedó vacía.** Duplicas filas; en ese caso reemplaza la tabla con `CREATE OR REPLACE ... AS SELECT ... BEFORE(...)`.
- **Adivinar la hora con OFFSET.** Si te equivocas por segundos, recuperas una versión ya rota; usa `BEFORE(STATEMENT => ...)`.
:::

## ✅ Lo que lograste

- Consultaste una tabla en el pasado.
- Recuperaste un DELETE con el Query ID.
- Conoces la retención y Fail-safe.

:::ejercicio quiz
¿Cuál es la forma más precisa de ver la tabla justo antes de un error?
- [ ] AT(OFFSET => -3600)
- [x] BEFORE(STATEMENT => '<query id del error>')
- [ ] AT(TIMESTAMP => CURRENT_TIMESTAMP())
- [ ] UNDROP TABLE
:::

:::ejercicio quiz
¿Cuánto dura Time Travel por defecto?
- [x] 1 día
- [ ] 7 días
- [ ] 90 días
- [ ] Para siempre
:::

:::ejercicio quiz
¿Quién puede recuperar datos desde Fail-safe?
- [ ] Cualquier usuario con SELECT
- [ ] El ACCOUNTADMIN con SQL
- [x] Solo el soporte de Snowflake
- [ ] Cualquier rol con OWNERSHIP sobre la tabla
:::

:::ejercicio quiz
¿Dónde encuentras el Query ID de la sentencia que borró los datos?
- [ ] En Marketplace
- [x] En Query Details del resultado o en Query History
- [ ] En SHOW TABLES, en la columna comment
- [ ] En Warehouses
:::
