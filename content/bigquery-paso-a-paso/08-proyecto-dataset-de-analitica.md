---
titulo: Proyecto 2 (semiguiado) - el dataset de analítica
nivel: 2 · Básico-intermedio
duracion: 45
resumen: El equipo quiere un dataset propio con tablas resumen listas para comercial. Dejas analitica con ventas_por_canal y clientes_por_pais, y lo compruebas con una consulta a INFORMATION_SCHEMA.TABLES en lugar de mirar a mano. Pistas escondidas.
objetivos: Armar un dataset con tablas resumen | Usar CREATE OR REPLACE para poder repetir el script | Consultar el inventario con INFORMATION_SCHEMA.TABLES | Documentar el dataset
prerrequisitos: bigquery-paso-a-paso-historial-de-jobs
autoevaluacion: ¿Existen las dos tablas en analitica? | ¿El script se puede correr dos veces? | ¿Sabes listar las tablas con SQL? | ¿Cuánto costó crear las tablas?
---

:::escenario El pedido
Lucía, líder de datos: *"Quiero `analitica` con dos tablas: pedidos por canal desde 2024 y clientes por país. Que el script se pueda volver a correr sin errores, y mostrame el inventario con una consulta."*
:::

## Lo que tienes que lograr

1. `analitica.ventas_por_canal` (ya la tienes) y `analitica.clientes_por_pais`.
2. Un script que se pueda correr dos veces.
3. El inventario del dataset con SQL.

<details><summary>💡 Pista 1: repetir sin errores</summary>

`CREATE OR REPLACE TABLE` reemplaza la tabla si existe; `CREATE SCHEMA IF NOT EXISTS` no falla si el dataset ya está.
</details>

<details><summary>💡 Pista 2: el inventario</summary>

Cada dataset tiene vistas de sistema: `analitica.INFORMATION_SCHEMA.TABLES` lista sus tablas y vistas.
</details>

## Cómo se ve terminado

```captura
archivo: bigquery/q08-inventario.webp
texto: El script (1) y el inventario - clientes_por_pais con 11 filas y ventas_por_canal con 4 (2)
```

## ✅ Lista de verificación

- [ ] `analitica` tiene las dos tablas.
- [ ] Correr el script dos veces no da error.
- [ ] La consulta a `INFORMATION_SCHEMA.TABLES` las lista.

<details><summary>💡 Solución comentada</summary>

```sql norun
CREATE SCHEMA IF NOT EXISTS analitica
OPTIONS (description = 'Tablas limpias para el negocio');

CREATE OR REPLACE TABLE analitica.ventas_por_canal AS
SELECT canal, COUNT(*) AS pedidos
FROM tienda.pedidos
WHERE fecha_pedido >= '2024-01-01'
GROUP BY canal;

CREATE OR REPLACE TABLE analitica.clientes_por_pais AS
SELECT pais, COUNT(*) AS clientes
FROM tienda.clientes
GROUP BY pais;

SELECT table_name, table_type, row_count
FROM analitica.INFORMATION_SCHEMA.TABLES
ORDER BY table_name;
```

**Por qué INFORMATION_SCHEMA:** lo que se comprueba con SQL se puede automatizar (una prueba en el CI que falle si falta una tabla). Mirar a mano no escala.
</details>

## Lo que aprendiste en el nivel 2

- Datasets, regiones y organización.
- Costos, LIMIT, caché y precios.
- El historial de jobs.

En el nivel 3: particiones, clustering, cargas y datos anidados.

:::ejercicio quiz
¿Qué hace CREATE OR REPLACE TABLE?
- [x] Crea la tabla o la reemplaza si ya existe
- [ ] Falla si existe
- [ ] Agrega filas
- [ ] Crea una vista
:::

:::ejercicio quiz
¿Cómo listas las tablas de un dataset con SQL?
- [ ] SHOW TABLES
- [x] SELECT ... FROM analitica.INFORMATION_SCHEMA.TABLES
- [ ] LIST analitica
- [ ] DESCRIBE analitica
:::

:::ejercicio quiz
¿Por qué conviene un script que se pueda repetir?
- [ ] Porque cuesta menos
- [x] Porque se puede automatizar y volver a correr sin romper nada
- [ ] Porque BigQuery lo exige
- [ ] No conviene
:::

:::ejercicio quiz
¿Qué devuelve table_type para una vista?
- [ ] TABLE
- [x] VIEW
- [ ] BASE TABLE
- [ ] SNAPSHOT
:::
