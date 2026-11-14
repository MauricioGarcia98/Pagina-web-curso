---
titulo: Proyecto 3 (pistas cerradas) - la capa silver de pedidos, con cargas incrementales y vuelta atrás
nivel: 3 · Intermedio
duracion: 75
resumen: El equipo de datos te pide la capa silver de pedidos - una tabla limpia y tipada en un esquema propio, que se actualice con MERGE cuando llegan cambios de estado, con el historial como red de seguridad y un cluster propio con autoterminación para el trabajo pesado. Las pistas están cerradas - ábrelas solo si te trabas.
objetivos: Crear un esquema y una tabla silver con CTAS | Aplicar un lote de cambios con MERGE y verificarlo | Usar el historial y el viaje en el tiempo como control | Restaurar tras un cambio equivocado | Crear y usar un cluster con autoterminación
prerrequisitos: databricks-paso-a-paso-compute-clusters-y-warehouses
autoevaluacion: ¿Sabes crear una tabla a partir de una consulta? | ¿Sabes verificar un MERGE con números antes y después? | ¿Sabes volver a una versión anterior? | ¿Sabes qué cluster crear para esto?
---

:::escenario El pedido
Martín, líder técnico: *"Necesitamos `main.ventas.pedidos_silver`: los pedidos de `samples.tienda.pedidos` ya limpios (fecha como fecha, estado y canal en minúsculas, sin pedidos sin cliente). Logística nos manda cambios de estado en lotes: aplicalos con MERGE, no reescribas la tabla. Y antes de aplicar cualquier lote, asegurate de poder volver atrás. Hacelo en un cluster tuyo, con autoterminación, que el último se olvidó uno encendido."*
:::

Pistas cerradas: intenta cada tarea antes de abrirlas.

## Tarea 1 — El cluster

Crea un cluster `silver-dev` chico (single node o 1–2 workers), con autoterminación de **30 minutos**, y conecta un notebook nuevo `Pedidos silver` a él.

<details><summary>💡 Pista</summary>

Compute → Create compute → nombre `silver-dev`, **Single node**, Terminate after `30` → Create. En el notebook, el selector de cómputo (arriba a la derecha) → elige `silver-dev`. La primera celda lo enciende.

</details>

## Tarea 2 — Esquema y tabla silver

Crea el esquema `main.ventas` y la tabla `main.ventas.pedidos_silver` a partir de `samples.tienda.pedidos`, con `fecha_pedido` como `DATE`, `estado` y `canal` en minúsculas y sin filas con `cliente_id` nulo. Comprueba cuántas filas tiene y cuántas por estado.

<details><summary>💡 Pista</summary>

```sql norun
CREATE SCHEMA IF NOT EXISTS main.ventas;

CREATE OR REPLACE TABLE main.ventas.pedidos_silver AS
SELECT pedido_id, cliente_id, empleado_id,
       CAST(fecha_pedido AS DATE) AS fecha_pedido,
       LOWER(TRIM(estado)) AS estado,
       LOWER(TRIM(canal)) AS canal,
       metodo_pago
FROM samples.tienda.pedidos
WHERE cliente_id IS NOT NULL;

SELECT estado, COUNT(*) AS n FROM main.ventas.pedidos_silver GROUP BY estado ORDER BY n DESC;
```

</details>

## Tarea 3 — El lote de cambios

Logística avisa: **todos los pedidos pendientes del canal app ya salieron** (pasan a `enviado`). Arma el lote como una consulta (pedido_id y estado nuevo), cuenta cuántos son, y aplícalo con `MERGE`. Verifica con los números por estado antes y después.

<details><summary>💡 Pista</summary>

```sql norun
-- cuántos cambian
SELECT COUNT(*) FROM main.ventas.pedidos_silver WHERE estado = 'pendiente' AND canal = 'app';

MERGE INTO main.ventas.pedidos_silver AS destino
USING (
  SELECT pedido_id, 'enviado' AS estado
  FROM main.ventas.pedidos_silver
  WHERE estado = 'pendiente' AND canal = 'app'
) AS lote
ON destino.pedido_id = lote.pedido_id
WHEN MATCHED THEN UPDATE SET estado = lote.estado;
```

El resultado del `MERGE` dice `num_updated_rows`.

</details>

## Tarea 4 — El error y la vuelta atrás

Alguien del equipo corre por error un `UPDATE` que pone **todos** los pedidos en `entregado`. Reprodúcelo, compruébalo, y vuelve la tabla al estado posterior al lote de la tarea 3 sin volver a cargar nada.

<details><summary>💡 Pista</summary>

`UPDATE main.ventas.pedidos_silver SET estado = 'entregado';` → `DESCRIBE HISTORY main.ventas.pedidos_silver;` → identifica la versión del `MERGE` (la anterior al `UPDATE`) → `RESTORE TABLE main.ventas.pedidos_silver TO VERSION AS OF <esa versión>;` → vuelve a contar por estado.

</details>

## Tarea 5 — Dejarlo prolijo

Agrega un comentario a la tabla que diga qué es y de dónde viene, compacta los archivos y apaga el cluster.

<details><summary>💡 Pista</summary>

`COMMENT ON TABLE main.ventas.pedidos_silver IS 'Pedidos limpios desde samples.tienda.pedidos; cambios de estado por MERGE';` → `OPTIMIZE main.ventas.pedidos_silver;` → Compute → `silver-dev` → Terminate (o deja que la autoterminación lo apague).

</details>

## ✔ Control

| Control | Esperado |
|---|---|
| `main.ventas.pedidos_silver` | 12 000 filas (ningún pedido tiene cliente nulo en esta base) |
| Por estado, al crearla | entregado 9288 · cancelado 967 · enviado 736 · devuelto 506 · pendiente 503 |
| Lote de la tarea 3 | **143** pedidos |
| Por estado, después del MERGE | pendiente **360** · enviado **879** (el resto igual) |
| Después del UPDATE equivocado | entregado 12 000 |
| Después del RESTORE | Igual que después del MERGE; `DESCRIBE HISTORY` muestra CREATE, MERGE, UPDATE y RESTORE |
| Cluster `silver-dev` | Terminate after 30 min; al final, TERMINATED |

## Entrega

Mensaje a Martín: *"`main.ventas.pedidos_silver` lista (12 000 pedidos). El lote de logística se aplicó con MERGE: 143 pedidos de app pasaron de pendiente a enviado. Probé la vuelta atrás con RESTORE y funciona. El cluster `silver-dev` se apaga solo a los 30 minutos."*

:::ejercicio quiz
¿Por qué contar los pendientes de app antes del MERGE?
- [ ] Porque el MERGE lo pide
- [x] Para tener el número esperado y verificar que num_updated_rows coincide
- [ ] Para borrarlos
- [ ] No hace falta
:::

:::ejercicio quiz
Después del UPDATE equivocado, ¿cuál es la forma más rápida y segura de volver?
- [ ] Reescribir la tabla desde samples y repetir el MERGE
- [x] RESTORE TABLE a la versión anterior al UPDATE
- [ ] Borrar la tabla
- [ ] Editar las filas a mano
:::
