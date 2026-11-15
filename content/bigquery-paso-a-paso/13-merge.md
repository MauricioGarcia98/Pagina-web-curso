---
titulo: MERGE - actualizar, insertar y borrar en una sola sentencia
nivel: 4 · Intermedio-avanzado
duracion: 40
resumen: El inventario de las tiendas llega como un archivo con cambios. Con un MERGE borras los productos que quedaron en cero, actualizas el stock de los que cambiaron e insertas los nuevos, todo en una sentencia. Lees su resultado y conoces las cláusulas de BigQuery (BY TARGET, BY SOURCE, INSERT ROW).
objetivos: Escribir un MERGE con DELETE, UPDATE e INSERT | Entender que gana la primera cláusula que se cumple | Usar WHEN NOT MATCHED BY SOURCE e INSERT ROW | Saber por qué los DML de BigQuery exigen WHERE
prerrequisitos: bigquery-paso-a-paso-proyecto-tabla-de-hechos
autoevaluacion: ¿Sabes qué pasa con un producto que llega con stock 0? | ¿Sabes qué hace WHEN NOT MATCHED BY SOURCE? | ¿Sabes qué inserta INSERT ROW? | ¿Sabes por qué UPDATE sin WHERE da error?
---

## Paso 1 — El MERGE

```sql norun
CREATE OR REPLACE TABLE analitica.stock_tiendas AS
SELECT producto_id, stock FROM tienda.productos WHERE producto_id <= 5;

MERGE analitica.stock_tiendas AS t
USING (SELECT 1 AS producto_id, 0 AS stock
       UNION ALL SELECT 2, 99
       UNION ALL SELECT 500, 12) AS s
ON t.producto_id = s.producto_id
WHEN MATCHED AND s.stock = 0 THEN DELETE
WHEN MATCHED THEN UPDATE SET stock = s.stock
WHEN NOT MATCHED THEN INSERT (producto_id, stock) VALUES (s.producto_id, s.stock);
```

```captura
archivo: bigquery/q13-merge.webp
texto: El MERGE (1) - "This statement modified 3 rows": un borrado, una actualización y una inserción (2)
```

```captura
archivo: bigquery/q13-resultado.webp
texto: El stock - el producto 1 ya no está, el 2 tiene 99 y el 500 es nuevo
```

Para cada fila de la fuente se aplica **la primera cláusula WHEN que se cumple**: el producto 1 llega con stock 0 y entra por el `DELETE`, aunque también cumpliría el `UPDATE`.

## Paso 2 — Las cláusulas de BigQuery

| Cláusula | Se aplica a |
|---|---|
| `WHEN MATCHED [AND …]` | Filas que están en el destino y en la fuente |
| `WHEN NOT MATCHED [BY TARGET] [AND …]` | Filas de la fuente que no están en el destino |
| `WHEN NOT MATCHED BY SOURCE [AND …]` | Filas del destino que no vinieron en la fuente (por ejemplo, productos discontinuados) |
| `INSERT ROW` | Inserta la fila de la fuente completa, sin listar columnas |

## Paso 3 — DML con WHERE obligatorio

```sql norun
UPDATE analitica.stock_tiendas SET stock = 0;              -- error: UPDATE must have a WHERE clause
UPDATE analitica.stock_tiendas SET stock = 0 WHERE TRUE;   -- explícito: todas las filas
```

BigQuery obliga a escribir `WHERE` en `UPDATE` y `DELETE`: un recordatorio de que vas a tocar filas. Y los DML se cobran por los bytes que leen de la tabla, como cualquier consulta.

:::tip MERGE para cargas
Un MERGE bien escrito es **idempotente**: correrlo dos veces con los mismos datos deja el mismo resultado. Es la forma recomendada de aplicar cargas incrementales.
:::

## ✅ Lo que lograste

- Escribiste un MERGE con borrado, actualización e inserción.
- Conoces las cláusulas BY TARGET, BY SOURCE e INSERT ROW.
- Sabes por qué los DML exigen WHERE.

:::ejercicio quiz
El producto 1 llega con stock 0 y hay dos cláusulas MATCHED (DELETE si stock = 0, luego UPDATE). ¿Qué pasa?
- [x] Se borra: gana la primera cláusula que se cumple
- [ ] Se actualiza a 0
- [ ] Se borra y se actualiza
- [ ] Da error
:::

:::ejercicio quiz
¿Qué hace WHEN NOT MATCHED BY SOURCE?
- [ ] Inserta las filas nuevas
- [x] Actúa sobre las filas del destino que no vinieron en la fuente
- [ ] Borra la fuente
- [ ] Nada
:::

:::ejercicio quiz
¿Qué hace INSERT ROW?
- [x] Inserta la fila completa de la fuente sin listar columnas
- [ ] Inserta una fila vacía
- [ ] Inserta solo la primera columna
- [ ] No existe
:::

:::ejercicio quiz
¿Qué pasa con `DELETE FROM tabla` sin WHERE en BigQuery?
- [ ] Borra todo
- [x] Da error: DELETE must have a WHERE clause
- [ ] Borra la primera fila
- [ ] Nada
:::
