---
titulo: Automatizar - scheduled queries, Dataform y orquestadores
nivel: 5 · Avanzado
duracion: 35
resumen: Una consulta que alguien corre a mano cada mañana es un riesgo. Conoces las scheduled queries (un SQL a horario que escribe en una tabla), Dataform (transformaciones versionadas con dependencias y pruebas, al estilo dbt) y cuándo conviene un orquestador como Airflow o Cloud Composer.
objetivos: Programar una consulta con scheduled queries | Entender qué agrega Dataform | Elegir entre scheduled queries, Dataform y un orquestador | Usar parámetros de fecha en consultas programadas
prerrequisitos: bigquery-paso-a-paso-information-schema
autoevaluacion: ¿Sabes qué hace una scheduled query? | ¿Sabes para qué sirve @run_date? | ¿Sabes en qué se parece Dataform a dbt? | ¿Sabes cuándo conviene Airflow?
---

:::nota En la práctica
Scheduled queries y Dataform no están simulados: la práctica te muestra qué son. El SQL de esta lección es el de BigQuery real.
:::

## Paso 1 — Scheduled queries

```captura
archivo: bigquery/q18-programadas.webp
texto: Scheduled queries - consultas que corren solas a horario (no simulado en la práctica)
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

## Paso 2 — Dataform

```captura
archivo: bigquery/q18-dataform.webp
texto: Dataform - transformaciones en SQLX con dependencias, pruebas y Git (no simulado en la práctica)
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

## Paso 3 — ¿Qué uso?

| Si… | Conviene |
|---|---|
| Es una consulta suelta que corre a horario | Scheduled query |
| Son varias transformaciones SQL con dependencias y pruebas | Dataform (o dbt) |
| El flujo mezcla BigQuery con APIs, archivos, otros sistemas y avisos | Un orquestador: [Airflow](#/m/airflow-paso-a-paso) o Cloud Composer (Airflow administrado) |

## ✅ Lo que lograste

- Sabes programar una consulta con parámetros de fecha.
- Conoces Dataform.
- Sabes elegir la herramienta de automatización.

:::ejercicio quiz
¿Qué hace una scheduled query?
- [x] Ejecuta un SQL a horario y escribe el resultado en una tabla
- [ ] Borra tablas viejas
- [ ] Carga archivos de S3
- [ ] Crea usuarios
:::

:::ejercicio quiz
¿Para qué sirve @run_date en una scheduled query?
- [ ] Para nada
- [x] Para usar la fecha de la ejecución y procesar el día que corresponde
- [ ] Para cambiar de región
- [ ] Para pausar la consulta
:::

:::ejercicio quiz
¿En qué se parece Dataform a dbt?
- [x] Ambos definen transformaciones SQL con dependencias, pruebas y Git
- [ ] Ambos son bases de datos
- [ ] Ambos cargan archivos
- [ ] No se parecen
:::

:::ejercicio quiz
El flujo descarga de una API, carga en BigQuery y avisa por Slack. ¿Qué conviene?
- [ ] Una scheduled query
- [ ] Una vista
- [x] Un orquestador como Airflow o Cloud Composer
- [ ] Preview
:::
