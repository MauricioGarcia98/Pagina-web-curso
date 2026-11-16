---
titulo: INFORMATION_SCHEMA - el proyecto consultado con SQL
nivel: 5 · Avanzado
duracion: 40
resumen: Todo lo que muestra la consola también se puede consultar con SQL. Con INFORMATION_SCHEMA.JOBS mides cuántos bytes procesó y facturó cada tipo de job y encuentras las consultas más caras; con TABLES y COLUMNS armas el inventario de un dataset. Es la base de los tableros de costos y de las pruebas automáticas.
objetivos: Consultar los jobs con INFORMATION_SCHEMA.JOBS | Encontrar las consultas más caras con SQL | Listar tablas y columnas de un dataset | Saber qué vista usar en cada caso y qué permisos pide
prerrequisitos: bigquery-paso-a-paso-proyecto-stock-al-dia
autoevaluacion: ¿Sabes por qué JOBS lleva el prefijo de región? | ¿Sabes encontrar la consulta más cara? | ¿Sabes listar las columnas de una tabla? | ¿Sabes qué diferencia hay entre JOBS y JOBS_BY_USER?
---

:::analogia El tablero del auto
Para saber cómo va el auto no abres el motor: miras el tablero. `INFORMATION_SCHEMA` es el tablero del proyecto en forma de tablas: qué jobs corrieron, cuánto leyeron, qué tablas y columnas existen. Y como son tablas, se pueden consultar y graficar.
:::

## Paso 1 — Quién gasta

```sql norun
SELECT job_type,
       COUNT(*) AS jobs,
       SUM(total_bytes_processed) AS bytes_procesados,
       SUM(total_bytes_billed) AS bytes_facturados,
       COUNTIF(cache_hit) AS desde_cache
FROM `region-us`.INFORMATION_SCHEMA.JOBS
GROUP BY job_type;
```

```captura
archivo: bigquery/q17-jobs.webp
texto: INFORMATION_SCHEMA.JOBS (1) - jobs, bytes procesados y facturados y cuántos salieron de la caché, por tipo (2)
```

Los jobs se guardan **por región**: por eso la vista lleva el prefijo `` `region-us` `` (o `region-eu`, etc.).

## Paso 2 — Las consultas más caras

```sql norun
SELECT query, total_bytes_billed
FROM `region-us`.INFORMATION_SCHEMA.JOBS
WHERE job_type = 'QUERY'
ORDER BY total_bytes_billed DESC
LIMIT 5;
```

```captura
archivo: bigquery/q17-caras.webp
texto: Las 5 consultas que más bytes facturaron
```

En un proyecto real se agrega `WHERE creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)` y `user_email` para saber de quién es cada consulta.

## Paso 3 — Tablas y columnas

```sql norun
SELECT column_name, data_type, is_nullable
FROM tienda.INFORMATION_SCHEMA.COLUMNS
WHERE table_name = 'pedidos';
```

```captura
archivo: bigquery/q17-columnas.webp
texto: Las columnas de pedidos con su tipo
```

| Vista | Qué tiene |
|---|---|
| `dataset.INFORMATION_SCHEMA.TABLES` | Tablas y vistas del dataset |
| `dataset.INFORMATION_SCHEMA.COLUMNS` | Columnas, tipos y nulos |
| `region-us.INFORMATION_SCHEMA.JOBS` | Todos los jobs del proyecto (requiere permiso de administrador de jobs) |
| `region-us.INFORMATION_SCHEMA.JOBS_BY_USER` | Solo tus jobs |
| `region-us.INFORMATION_SCHEMA.TABLE_STORAGE` | Almacenamiento por tabla (activo y de largo plazo) |

:::nota Costo de INFORMATION_SCHEMA
Consultar estas vistas también es un job y se factura (con el mínimo de 10 MB). Para un tablero diario de costos, guarda el resultado en una tabla una vez al día.
:::

:::errores
- **Olvidar la región.** Los jobs se guardan por región: es `` `region-us`.INFORMATION_SCHEMA.JOBS ``, no `INFORMATION_SCHEMA.JOBS` a secas.
- **Consultar JOBS sin filtrar por fecha.** Leer todo el historial también procesa bytes; filtra por `creation_time`.
- **Usar JOBS_BY_USER para un informe del equipo.** Solo trae tus jobs; para todo el proyecto es JOBS (y requiere permisos).
:::

## ✅ Lo que lograste

- Mediste el gasto por tipo de job con SQL.
- Encontraste las consultas más caras.
- Listaste tablas y columnas.

:::ejercicio quiz
¿Por qué INFORMATION_SCHEMA.JOBS lleva el prefijo `region-us`?
- [x] Porque los jobs se guardan por región
- [ ] Porque es el nombre del proyecto
- [ ] Porque los jobs se guardan en un dataset llamado region-us
- [ ] Porque solo existe en Estados Unidos
:::

:::ejercicio quiz
¿Cómo encuentras la consulta que más facturó?
- [ ] SELECT * FROM jobs LIMIT 1
- [x] Ordenando INFORMATION_SCHEMA.JOBS por total_bytes_billed DESC
- [ ] En Preview
- [ ] En la página de costos, que no se puede consultar con SQL
:::

:::ejercicio quiz
¿Qué vista lista las columnas de las tablas de un dataset?
- [ ] dataset.INFORMATION_SCHEMA.TABLES
- [x] dataset.INFORMATION_SCHEMA.COLUMNS
- [ ] region-us.INFORMATION_SCHEMA.JOBS
- [ ] SHOW COLUMNS
:::

:::ejercicio quiz
¿Qué diferencia hay entre JOBS y JOBS_BY_USER?
- [ ] Ninguna
- [x] JOBS tiene los jobs de todo el proyecto; JOBS_BY_USER solo los tuyos
- [ ] JOBS_BY_USER es más caro
- [ ] JOBS solo tiene cargas
:::
