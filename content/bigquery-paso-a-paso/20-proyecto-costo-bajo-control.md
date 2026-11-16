---
titulo: Proyecto 5 (solo el objetivo) - el costo de BigQuery bajo control
nivel: 5 · Avanzado
duracion: 50
resumen: Finanzas pregunta cuánto se gasta en BigQuery y por qué. Armas el informe con la página de costos y el historial de jobs, identificas las tres consultas más caras, propones cómo bajarlas y defines límites y accesos para que no vuelva a pasar. Solo se dan el objetivo y el criterio de aceptación.
objetivos: Medir el gasto con la consola y con SQL | Identificar y corregir las consultas más caras | Definir límites de bytes y accesos | Presentar un informe de costos
prerrequisitos: bigquery-paso-a-paso-acceso-y-gobierno
autoevaluacion: ¿Sabes cuánto se procesó y facturó? | ¿Identificaste las tres consultas más caras? | ¿Tienes una mejora para cada una? | ¿Definiste un límite de bytes y quién puede consultar?
---

:::escenario El objetivo
Finanzas: *"La factura de BigQuery subió. Queremos saber qué la explica, qué van a cambiar y cómo evitamos sorpresas."*
:::

## Criterio de aceptación

- Un número: bytes procesados, facturados y costo on-demand del periodo.
- Las tres consultas más caras con una mejora concreta para cada una.
- Una regla de límites (bytes máximos por consulta o por día) y de accesos.
- Todo en un informe de media página.

## Cómo se ve terminado

```captura
archivo: bigquery/q20-costos.webp
texto: El resumen de costos (1) y las consultas más caras con su costo a escala real (2)
```

```captura
archivo: bigquery/q20-jobs.webp
texto: El historial de jobs para ver quién corrió cada consulta y si salió de la caché
```

<details><summary>💡 Solución comentada</summary>

**Medir** (también con SQL, lección 17):

```sql norun
SELECT user_email, COUNT(*) AS consultas,
       ROUND(SUM(total_bytes_billed) / POW(1024, 4) * 6.25, 4) AS usd
FROM `region-us`.INFORMATION_SCHEMA.JOBS
WHERE job_type = 'QUERY'
  AND creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY user_email
ORDER BY usd DESC;
```

**Mejoras típicas para las más caras:**

| Problema | Mejora |
|---|---|
| `SELECT *` sobre la tabla de pedidos | Nombrar las columnas |
| Filtro con `EXTRACT(YEAR FROM fecha)` | Filtro directo sobre la columna de partición |
| Una vista con JOIN que se consulta cien veces por día | Materializarla en una tabla particionada (o una vista materializada) |
| La misma consulta del tablero cada 5 minutos | Que el tablero use la caché o una tabla resumen |

**Límites y accesos:**
- **Maximum bytes billed** en las consultas de herramientas y cuotas diarias por usuario o proyecto.
- `require_partition_filter` en las tablas grandes.
- Data Viewer por dataset (no por proyecto) y Job User solo a quien consulta.
- Si el volumen es grande y estable, evaluar el modelo de capacidad (ediciones) para tener un costo predecible.
</details>

:::errores
- **Optimizar sin medir.** Primero identifica con datos las consultas que más facturan; optimizar las que no pesan no mueve la factura.
- **Proponer `LIMIT` como ahorro.** No baja lo leído; las mejoras reales son columnas justas, filtro de partición y tablas resumen.
- **Dar acceso amplio para "no molestar".** Data Viewer por proyecto y Job User para todos multiplican quién puede generar costo.
:::

## Lo que aprendiste en el nivel 5

- INFORMATION_SCHEMA.
- Scheduled queries, Dataform y orquestadores.
- IAM, vistas autorizadas y seguridad fina.

En el nivel 6: buenas prácticas, capacidad, BigQuery real y el proyecto final.

:::ejercicio quiz
¿Qué ajuste evita que una consulta por error procese terabytes?
- [x] Maximum bytes billed (y cuotas diarias)
- [ ] Más LIMIT
- [ ] Cambiar de región
- [ ] Borrar el historial
:::

:::ejercicio quiz
Una vista con JOIN se consulta cien veces por día. ¿Qué mejora propones?
- [ ] Nada
- [x] Materializar el resultado en una tabla (o una vista materializada)
- [ ] Agregar LIMIT
- [ ] Moverla a otro dataset
:::

:::ejercicio quiz
¿Cuándo conviene evaluar el modelo de capacidad (ediciones)?
- [ ] Con pocas consultas chicas
- [x] Con mucho volumen estable, para tener un costo predecible
- [ ] Cuando hay picos aislados una vez por mes
- [ ] Solo para cargas
:::

:::ejercicio quiz
¿Con qué vista sabes cuánto gastó cada usuario?
- [ ] dataset.INFORMATION_SCHEMA.TABLES
- [x] region-us.INFORMATION_SCHEMA.JOBS agrupando por user_email
- [ ] Preview
- [ ] COLUMNS
:::
