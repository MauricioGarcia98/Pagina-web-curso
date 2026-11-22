---
titulo: Automatizar - scheduled queries, Dataform y orquestadores
nivel: 5 · Avanzado
duracion: 35
resumen: Una consulta que alguien corre a mano cada mañana es un riesgo. Conoces las scheduled queries (un SQL a horario que escribe en una tabla), Dataform (transformaciones versionadas con dependencias y pruebas, al estilo dbt) y cuándo conviene un orquestador como Airflow o Cloud Composer.
objetivos: Programar una consulta con scheduled queries | Entender qué agrega Dataform | Elegir entre scheduled queries, Dataform y un orquestador | Usar parámetros de fecha en consultas programadas
prerrequisitos: bigquery-paso-a-paso-information-schema
autoevaluacion: ¿Sabes qué hace una scheduled query? | ¿Sabes para qué sirve @run_date? | ¿Sabes en qué se parece Dataform a dbt? | ¿Sabes cuándo conviene Airflow?
---

:::tip Practícalo mientras lees
En el [BigQuery de práctica](#/bigquery) funcionan las tres cosas de esta lección: **Scheduled queries** (con horario UTC, `@run_date`, destino y backfill), **Data transfers** (desde tus buckets de S3 o Cloud Storage) y **Dataform** (SQLX con `ref()`, incrementales y assertions).
:::

:::analogia Despertador, receta y jefe de cocina
Una scheduled query es un despertador: corre un SQL a la hora fijada. Dataform es la receta escrita, con el orden de los pasos y controles de calidad. Un orquestador como Airflow es el jefe de cocina que coordina varias cocinas: espera un archivo, corre Dataflow, después BigQuery y avisa si algo falla.
:::

## Paso 1 — Scheduled queries

```captura
archivo: bigquery/q18-programadas.webp
texto: Scheduled queries - el detalle de una consulta programada: horario en UTC, destino, cuenta de servicio y el historial de corridas
```

En la consola, desde el editor: **Schedule** → nombre, frecuencia (por ejemplo, todos los días a las 06:00), dataset y tabla de destino y si **sobrescribe** o **agrega**. Usa los parámetros de la ejecución:

```sql norun
-- se ejecuta cada día y carga solo el día anterior en la partición correspondiente
SELECT fecha_pedido AS fecha, canal, COUNT(*) AS pedidos
FROM tienda.pedidos
WHERE fecha_pedido = DATE_SUB(@run_date, INTERVAL 1 DAY)
GROUP BY fecha, canal;
```

| Parámetro | Qué es |
|---|---|
| `@run_date` | La fecha de la ejecución programada |
| `@run_time` | El instante de la ejecución |
| Destino `tabla$${run_date}` | Escribe en la partición de ese día |

Tres detalles que en la práctica se ven igual que en la consola real:

- El horario se escribe en inglés y está en **UTC**: `every day 09:00` es a las 6:00 de Buenos Aires. Las opciones válidas son del estilo `every 24 hours`, `every day 06:00`, `every monday 09:00` o `every mon,wed,fri 07:30`, con un mínimo de 15 minutos.
- La consulta corre con una **cuenta de servicio**, no con tu usuario: esa cuenta necesita permisos sobre el dataset de destino.
- **Schedule backfill** corre la consulta una vez por cada día de un rango, con `@run_date` igual a ese día. Es la forma de reprocesar días sin tocar el SQL.

## Paso 2 — Dataform

```captura
archivo: bigquery/q18-dataform.webp
texto: Dataform - los archivos SQLX, la consulta compilada y el grafo de dependencias
```

```sql norun
-- definitions/hechos_ventas.sqlx
config {
  type: "incremental",
  bigquery: { partitionBy: "fecha", clusterBy: ["canal", "pais"] },
  assertions: { nonNull: ["fecha", "canal"] }
}
SELECT p.fecha_pedido AS fecha, p.canal, c.pais, d.cantidad
FROM ${ref("pedidos")} AS p
JOIN ${ref("clientes")} AS c USING (cliente_id)
JOIN ${ref("detalle_pedidos")} AS d USING (pedido_id)
${ when(incremental(), `WHERE p.fecha_pedido > (SELECT MAX(fecha) FROM ${self()})`) }
```

`${ref(...)}` arma el grafo de dependencias, las **assertions** son pruebas de calidad y todo vive en Git: la misma idea que [dbt](#/m/dbt), pero integrado en BigQuery.

| Tipo (`config { type: … }`) | Qué crea | Cuándo |
|---|---|---|
| `declaration` | Nada: declara una tabla que ya existe para poder usar `ref()` | Las fuentes (lo que cargan otros) |
| `view` | Una vista | Staging liviano |
| `table` | Una tabla que se recrea completa en cada ejecución | Marts chicos o medianos |
| `incremental` | Una tabla que la primera vez se crea y después solo agrega lo nuevo (`when(incremental(), …)`) | Hechos grandes que crecen todos los días |
| `assertion` | Una consulta que tiene que devolver **cero** filas | Controles de calidad que frenan lo que depende de ellos |

:::practica bigquery Dataform de punta a punta
1. Abre **Dataform**: el repositorio de práctica ya trae dos fuentes declaradas, una vista de staging, una tabla, una incremental y una assertion.
2. Mira el **grafo compilado** y la **consulta compilada** de `ventas_diarias`: `${ref("stg_pedidos")}` se convirtió en `` `dataform.stg_pedidos` ``.
3. **Start execution**: se crean la vista, la tabla y la incremental, y corren las assertions (las de `nonNull` y `uniqueKey` salen del config).
4. Vuelve a ejecutar y mira la consulta incremental: agrega solo las filas con fecha posterior al máximo, sin duplicar.
5. Rompe algo a propósito: en `ventas_positivas.sqlx` cambia `ventas < 0` por `ventas > 0`. La assertion falla y lo que depende de ella se marca como SKIPPED.
:::

## Paso 3 — ¿Qué uso?

| Si… | Conviene |
|---|---|
| Es una consulta suelta que corre a horario | Scheduled query |
| Son varias transformaciones SQL con dependencias y pruebas | Dataform (o dbt) |
| El flujo mezcla BigQuery con APIs, archivos, otros sistemas y avisos | Un orquestador: [Airflow](#/m/airflow-paso-a-paso) o Cloud Composer (Airflow administrado) |

:::errores
- **Encadenar consultas programadas por horario** ("esta a las 6, la otra a las 6:30"). Si la primera se demora, la segunda lee datos incompletos; las dependencias van en Dataform o en un orquestador.
- **Ignorar `@run_date`.** Con `CURRENT_DATE()`, un reproceso de días anteriores calcula siempre el día de hoy.
- **Dejar el SQL en una pestaña de la consola.** Sin control de versiones, nadie sabe qué cambió ni cuándo.
:::

## ✅ Lo que lograste

- Sabes programar una consulta con parámetros de fecha.
- Conoces Dataform.
- Sabes elegir la herramienta de automatización.

:::ejercicio quiz
¿Qué hace una scheduled query?
- [x] Ejecuta un SQL a horario y escribe el resultado en una tabla
- [ ] Borra tablas viejas
- [ ] Carga archivos de S3
- [ ] Recalcula las vistas una vez por día
:::

:::ejercicio quiz
¿Para qué sirve @run_date en una scheduled query?
- [ ] Para fijar a qué hora se ejecuta
- [x] Para usar la fecha de la ejecución y procesar el día que corresponde
- [ ] Para cambiar de región
- [ ] Para pausar la consulta
:::

:::ejercicio quiz
¿En qué se parece Dataform a dbt?
- [x] Ambos definen transformaciones SQL con dependencias, pruebas y Git
- [ ] Ambos son bases de datos
- [ ] Ambos cargan archivos
- [ ] Ambos programan consultas sueltas sin dependencias
:::

:::ejercicio quiz
El flujo descarga de una API, carga en BigQuery y avisa por Slack. ¿Qué conviene?
- [ ] Una scheduled query
- [ ] Una vista
- [x] Un orquestador como Airflow o Cloud Composer
- [ ] Una vista materializada
:::
