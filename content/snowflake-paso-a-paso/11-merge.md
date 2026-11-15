---
titulo: MERGE - actualizar lo que cambió e insertar lo nuevo
nivel: 3 · Intermedio
duracion: 40
resumen: Cuando llegan correcciones y pedidos nuevos mezclados, no sirve ni un INSERT ni un UPDATE solo. Creas pedidos_actuales, aplicas un MERGE que corrige el pedido 90002 e inserta el 90006, lees su resultado (insertadas, actualizadas, borradas) y aprendes las cláusulas WHEN y los errores típicos.
objetivos: Escribir un MERGE con WHEN MATCHED y WHEN NOT MATCHED | Leer el resultado de un MERGE | Usar condiciones extra y DELETE en las cláusulas | Evitar el error de filas duplicadas en la fuente
prerrequisitos: snowflake-paso-a-paso-json-y-variant
autoevaluacion: ¿Sabes qué hace WHEN MATCHED? | ¿Sabes qué devuelve un MERGE? | ¿Sabes qué pasa si la fuente trae dos filas para la misma clave? | ¿Sabes por qué MERGE es idempotente?
---

## Paso 1 — La tabla destino

```sql norun
USE SCHEMA tienda_dev.analitica;
CREATE TABLE pedidos_actuales AS
SELECT * FROM tienda_dev.raw.pedidos_staging;
```

## Paso 2 — El MERGE

Llega una corrección del pedido 90002 (el total era 95, no 80) y un pedido nuevo, el 90006:

```sql norun
MERGE INTO pedidos_actuales t
USING (SELECT 90002 AS pedido_id, 8 AS cliente_id, '2026-11-14'::date AS fecha, 'app' AS canal, 95.00 AS total
       UNION ALL
       SELECT 90006, 33, '2026-11-15'::date, 'web', 150.00) s
ON t.pedido_id = s.pedido_id
WHEN MATCHED THEN UPDATE SET total = s.total
WHEN NOT MATCHED THEN INSERT (pedido_id, cliente_id, fecha, canal, total)
                      VALUES (s.pedido_id, s.cliente_id, s.fecha, s.canal, s.total);
```

```captura
archivo: snowflake/s11-merge.webp
texto: El MERGE (1) y su resultado - 1 insertada, 1 actualizada, 0 borradas (2)
```

| Parte | Qué hace |
|---|---|
| `MERGE INTO pedidos_actuales t` | La tabla que se modifica |
| `USING (...) s` | De dónde vienen los datos (tabla o consulta) |
| `ON t.pedido_id = s.pedido_id` | Cómo se emparejan |
| `WHEN MATCHED THEN UPDATE` | Si el pedido ya existe, lo actualiza |
| `WHEN NOT MATCHED THEN INSERT` | Si no existe, lo inserta |

```captura
archivo: snowflake/s11-resultado.webp
texto: pedidos_actuales - el 90002 con total 95 y el 90006 nuevo
```

## Paso 3 — Más cláusulas

```sql norun
WHEN MATCHED AND s.estado = 'cancelado' THEN DELETE
WHEN MATCHED AND t.total <> s.total THEN UPDATE SET total = s.total
WHEN NOT MATCHED THEN INSERT ...
```

Para cada fila se aplica **la primera cláusula que se cumple**. `AND t.total <> s.total` evita reescribir filas que no cambiaron.

:::cuidado Una sola fila por clave en la fuente
Si la fuente trae dos filas con el mismo `pedido_id`, Snowflake no sabe cuál usar y el MERGE puede fallar ("Duplicate row detected during DML action") o dar un resultado impredecible. Deja una fila por clave antes, por ejemplo con `QUALIFY ROW_NUMBER() OVER (PARTITION BY pedido_id ORDER BY ...) = 1` (proyecto 3).
:::

**Por qué es la forma correcta de cargar:** si el mismo MERGE se ejecuta dos veces, el resultado es el mismo. Es **idempotente**, a diferencia de un `INSERT` que duplicaría filas.

## ✅ Lo que lograste

- Escribiste un MERGE con actualización e inserción.
- Lees su resultado.
- Conoces las cláusulas y el error de duplicados.

:::ejercicio quiz
¿Qué hace WHEN NOT MATCHED THEN INSERT?
- [ ] Actualiza las filas existentes
- [x] Inserta las filas de la fuente que no tienen pareja en el destino
- [ ] Borra el destino
- [ ] Nada
:::

:::ejercicio quiz
¿Qué devuelve un MERGE en Snowflake?
- [x] Cuántas filas insertó, actualizó y borró
- [ ] La tabla completa
- [ ] Solo un OK
- [ ] El plan de ejecución
:::

:::ejercicio quiz
La fuente trae dos filas del pedido 90002. ¿Qué haces antes del MERGE?
- [ ] Nada
- [x] Quedarte con una fila por clave (por ejemplo con QUALIFY ROW_NUMBER)
- [ ] Borrar el destino
- [ ] Cambiar de warehouse
:::

:::ejercicio quiz
¿Por qué un MERGE bien escrito es idempotente?
- [ ] Porque es más rápido
- [x] Porque correrlo dos veces con los mismos datos deja el mismo resultado
- [ ] Porque no usa warehouse
- [ ] Porque borra todo antes
:::
