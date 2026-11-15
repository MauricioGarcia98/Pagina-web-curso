---
titulo: Proyecto 4 (con poca ayuda) - el stock al día sin reescribir lo que no cambió
nivel: 4 · Intermedio-avanzado
duracion: 45
resumen: Llega una nueva actualización de inventario con productos repetidos, cambiados y nuevos. Escribes un MERGE que solo actualiza lo que cambió e inserta lo nuevo con INSERT ROW, lo corres dos veces para comprobar que es idempotente y escribes cómo recuperarías la tabla si algo sale mal. Solo se dice qué lograr; la solución comentada está al final.
objetivos: Escribir un MERGE incremental que no reescribe filas iguales | Usar INSERT ROW | Comprobar la idempotencia | Escribir el procedimiento de recuperación
prerrequisitos: bigquery-paso-a-paso-sql-analitico
autoevaluacion: ¿El MERGE actualiza solo los productos cuyo stock cambió? | ¿Correrlo dos veces deja el mismo resultado? | ¿Sabes cómo recuperar la tabla de hace una hora? | ¿Sabes por qué no conviene reescribir filas iguales?
---

:::escenario El pedido
Operaciones: *"Les mandamos el stock de hoy: el producto 2 sigue en 99, el 3 bajó a 7 y el 500 sigue en 12. Que la tabla quede al día sin tocar lo que no cambió."*
:::

## Lo que tienes que lograr

1. Un MERGE sobre `analitica.stock_tiendas` que actualice **solo** si el stock cambió e inserte lo que no existe.
2. Correrlo dos veces: la segunda no debe modificar ninguna fila.
3. Una línea con el procedimiento para recuperar la tabla si el MERGE sale mal.

## Cómo se ve terminado

```captura
archivo: bigquery/q16-stock.webp
texto: El MERGE con AND t.stock <> s.stock e INSERT ROW (1) y el stock final - el 3 en 7 y el resto sin cambios (2)
```

## ✅ Lista de verificación

- [ ] El producto 3 quedó en 7.
- [ ] El 2 y el 500 no se reescribieron.
- [ ] La segunda ejecución dice que modificó 0 filas.
- [ ] Tienes el procedimiento de recuperación.

<details><summary>💡 Solución comentada</summary>

```sql norun
MERGE analitica.stock_tiendas AS t
USING (SELECT 2 AS producto_id, 99 AS stock
       UNION ALL SELECT 3, 7
       UNION ALL SELECT 500, 12) AS s
ON t.producto_id = s.producto_id
WHEN MATCHED AND t.stock <> s.stock THEN UPDATE SET stock = s.stock
WHEN NOT MATCHED BY TARGET THEN INSERT ROW;
```

- `AND t.stock <> s.stock` evita reescribir filas iguales: menos filas modificadas, historial más limpio y, en tablas particionadas, menos particiones tocadas.
- `INSERT ROW` sirve porque la fuente tiene las mismas columnas que el destino.
- **Recuperación:** `CREATE OR REPLACE TABLE analitica.stock_tiendas AS SELECT * FROM analitica.stock_tiendas FOR SYSTEM_TIME AS OF TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR);` (dentro de los 7 días de time travel). Mejor aún: un snapshot antes de cada carga grande.
</details>

## Lo que aprendiste en el nivel 4

- MERGE con todas sus cláusulas.
- Time travel, snapshots y clones.
- QUALIFY, ventanas y funciones de GoogleSQL.

En el nivel 5: INFORMATION_SCHEMA, automatización, acceso y costos.

:::ejercicio quiz
¿Para qué sirve `WHEN MATCHED AND t.stock <> s.stock`?
- [x] Para actualizar solo los productos cuyo stock cambió
- [ ] Para borrar los iguales
- [ ] Para insertar duplicados
- [ ] Nada
:::

:::ejercicio quiz
Corres el MERGE dos veces con los mismos datos. ¿Qué debe pasar la segunda vez?
- [ ] Duplicar filas
- [x] No modificar ninguna fila
- [ ] Borrar la tabla
- [ ] Dar error
:::

:::ejercicio quiz
¿Cómo recuperas la tabla como estaba hace una hora?
- [ ] UNDROP
- [x] Con FOR SYSTEM_TIME AS OF hace una hora (dentro de los 7 días)
- [ ] Desde Preview
- [ ] No se puede
:::

:::ejercicio quiz
¿Cuándo sirve INSERT ROW?
- [x] Cuando la fuente tiene las mismas columnas que el destino
- [ ] Siempre, aunque falten columnas
- [ ] Solo en UPDATE
- [ ] Nunca
:::
