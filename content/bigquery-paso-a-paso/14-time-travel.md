---
titulo: Time travel - consultar y recuperar la tabla de hace un rato
nivel: 4 · Intermedio-avanzado
duracion: 35
resumen: Alguien borra todas las filas de una tabla con WHERE TRUE. Con FOR SYSTEM_TIME AS OF consultas la tabla como estaba hace un minuto, la restauras con un INSERT, y conoces la ventana de 7 días, el fail-safe, los snapshots y los clones de tabla.
objetivos: Consultar una tabla en el pasado con FOR SYSTEM_TIME AS OF | Restaurar datos borrados | Conocer la ventana de time travel y el fail-safe | Usar snapshots y clones de tabla
prerrequisitos: bigquery-paso-a-paso-merge
autoevaluacion: ¿Sabes escribir "la tabla hace una hora"? | ¿Cuántos días dura time travel por defecto? | ¿Sabes qué es un snapshot de tabla? | ¿Sabes en qué se diferencia de un clon?
---

:::analogia El grabador de la tabla
Time travel es como un grabador que guarda los últimos 7 días de la tabla: puedes rebobinar y mirarla como estaba hace un minuto o hace tres días. Pasado ese plazo, la grabación se pierde; para guardar un momento por más tiempo están los snapshots.
:::

## Paso 1 — El error

```sql norun
-- en BigQuery el WHERE es obligatorio, pero WHERE TRUE borra todo
DELETE FROM analitica.ventas_por_canal WHERE TRUE;
```

```captura
archivo: bigquery/q14-delete.webp
texto: El DELETE con WHERE TRUE (1) - 4 filas borradas (2)
```

## Paso 2 — Mirar el pasado

```sql norun
SELECT *
FROM analitica.ventas_por_canal
  FOR SYSTEM_TIME AS OF TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 MINUTE);
```

```captura
archivo: bigquery/q14-system-time.webp
texto: FOR SYSTEM_TIME AS OF (1) - la tabla como estaba hace un minuto, con sus 4 canales (2)
```

| Forma | Qué devuelve |
|---|---|
| `FOR SYSTEM_TIME AS OF TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)` | La tabla hace una hora |
| `FOR SYSTEM_TIME AS OF '2026-11-15 18:00:00+00'` | La tabla en ese instante |

## Paso 3 — Restaurar

```sql norun
INSERT INTO analitica.ventas_por_canal
SELECT *
FROM analitica.ventas_por_canal
  FOR SYSTEM_TIME AS OF TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 MINUTE);
```

```captura
archivo: bigquery/q14-restaurado.webp
texto: El INSERT desde el pasado (1) y la tabla con sus 4 canales de vuelta (2)
```

Si la tabla entera se borró (`DROP TABLE`), también se recupera dentro de la ventana, con `bq cp` usando el decorador de tiempo o desde la consola.

## Paso 4 — Ventanas y copias

| Concepto | Duración | Para |
|---|---|---|
| **Time travel** | 7 días por defecto (configurable de 2 a 7 por dataset) | Consultar y recuperar con SQL |
| **Fail-safe** | 7 días más, solo vía soporte de Google | Desastres |
| **Snapshot de tabla** | Lo que decidas | Copia de solo lectura en un momento: `CREATE SNAPSHOT TABLE pedidos_snap CLONE tienda.pedidos;` |
| **Clon de tabla** | Lo que decidas | Copia que se puede modificar; solo paga lo que cambia: `CREATE TABLE pedidos_prueba CLONE tienda.pedidos;` |

:::errores
- **Contar con time travel para siempre.** La ventana es de 7 días (o menos si se configuró); después solo queda el fail-safe, que no puedes consultar tú.
- **Restaurar sin una copia previa.** Antes de pisar la tabla, guarda el estado actual (un snapshot o un clon) por si la restauración también sale mal.
- **Usar time travel como backup.** No reemplaza los snapshots programados antes de cargas grandes y riesgosas.
:::

## ✅ Lo que lograste

- Consultaste una tabla en el pasado.
- Restauraste un borrado.
- Conoces las ventanas y las copias.

:::ejercicio quiz
¿Cómo consultas la tabla como estaba hace una hora?
- [x] `FOR SYSTEM_TIME AS OF TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)`
- [ ] `AT(OFFSET => -3600)`
- [ ] `SELECT * FROM tabla_ayer`
- [ ] Con `SELECT * FROM tabla@-3600000`
:::

:::ejercicio quiz
¿Cuántos días dura time travel por defecto en BigQuery?
- [ ] 1
- [x] 7
- [ ] 30
- [ ] 90
:::

:::ejercicio quiz
¿Qué es un snapshot de tabla?
- [ ] Una vista que apunta a la tabla original
- [x] Una copia de solo lectura de la tabla en un momento
- [ ] Una vista
- [ ] Una copia que se actualiza sola con los cambios
:::

:::ejercicio quiz
¿En qué se diferencia un clon de un snapshot?
- [x] El clon se puede modificar; el snapshot es de solo lectura
- [ ] No hay diferencia
- [ ] El clon es más caro siempre
- [ ] El snapshot se puede modificar
:::
