---
titulo: Buenas prácticas - rendimiento y costo bajo control
nivel: 6 · Avanzado completo
duracion: 40
resumen: Las decisiones que más mueven el rendimiento y la factura. Warehouses por carga de trabajo y con auto suspend corto, cachés de resultados, poda de micro-particiones y claves de clustering, tablas transitorias para staging, no leer columnas de más, y una lista de revisión para el equipo.
objetivos: Dimensionar warehouses por carga de trabajo | Aprovechar la caché de resultados | Entender micro-particiones, poda y clustering | Elegir el tipo de tabla según el dato | Revisar consultas y objetos con una lista
prerrequisitos: snowflake-paso-a-paso-proyecto-acceso-para-analistas
autoevaluacion: ¿Sabes cuánto dura la caché de resultados? | ¿Sabes qué es la poda de micro-particiones? | ¿Sabes cuándo vale la pena una clave de clustering? | ¿Sabes por qué SELECT * cuesta más?
---

:::analogia Elegir bien qué cajas abrir
Snowflake guarda cada tabla en muchas cajitas (micro-particiones) con una etiqueta que dice el rango de valores de adentro. Si filtras por una columna bien ordenada, puede descartar cajas sin abrirlas. Nombrar solo las columnas necesarias es abrir solo los compartimentos que usas.
:::

## Paso 1 — Warehouses

```sql norun
CREATE TRANSIENT TABLE pedidos_tmp AS SELECT * FROM pedidos_staging;
ALTER WAREHOUSE analisis_wh SET AUTO_SUSPEND = 60;
SHOW WAREHOUSES;
```

```captura
archivo: snowflake/s21-practicas.webp
texto: Una tabla transitoria para datos recargables y el warehouse con auto suspend de 60 segundos (1); SHOW WAREHOUSES lo confirma (2)
```

| Práctica | Por qué |
|---|---|
| Un warehouse por tipo de carga (carga, transformación, BI) | No se pisan y se sabe quién gasta |
| `AUTO_SUSPEND` de 60 segundos (o el mínimo que tolere tu caché) | Un warehouse encendido sin consultas es dinero tirado |
| Empezar en X-Small y subir si hace falta | Es fácil agrandar; lo caro es no medir |

## Paso 2 — Las cachés

| Caché | Qué guarda | Cuánto dura |
|---|---|---|
| **Resultados** | El resultado de una consulta idéntica sobre datos que no cambiaron | 24 horas; no usa warehouse |
| **Disco local del warehouse** | Los datos leídos recientemente | Mientras el warehouse no se suspenda |
| **Metadatos** | Conteos, mínimos y máximos por micro-partición | Siempre (`COUNT(*)` sin filtro sale de aquí) |

## Paso 3 — Micro-particiones y poda

Snowflake guarda cada tabla en **micro-particiones** de unos 50 a 500 MB sin comprimir, y sabe el mínimo y el máximo de cada columna en cada una. Un `WHERE fecha = '2026-11-14'` lee solo las particiones que pueden contener esa fecha: eso es la **poda** (*pruning*).

| Situación | Qué hacer |
|---|---|
| Tablas chicas o medianas | Nada: el orden de carga suele alcanzar |
| Tablas de varios TB filtradas siempre por la misma columna, con poca poda | Una **clave de clustering**: `ALTER TABLE ventas CLUSTER BY (fecha);` (tiene costo de mantenimiento) |

## Paso 4 — SQL que ahorra

- **No `SELECT *`**: Snowflake guarda por columnas, y leer 3 columnas de 80 es mucho más barato.
- Filtrar por las columnas que podan (fechas) y con `LIMIT` al explorar.
- `TRANSIENT` para staging y tablas intermedias que se pueden recargar: sin Fail-safe, menos almacenamiento.
- Vistas para el negocio en lugar de copias de tablas.

## Paso 5 — Lista de revisión

- [ ] Cada equipo o proceso con su warehouse y su resource monitor.
- [ ] Auto suspend corto en todos los warehouses.
- [ ] Roles de mínimo privilegio; nadie trabaja con ACCOUNTADMIN.
- [ ] Staging en tablas transitorias.
- [ ] Cargas con MERGE idempotente.
- [ ] Objetos creados con scripts versionados (Terraform, Snowflake CLI, dbt), no a mano.

:::errores
- **Clustering en todas las tablas.** Mantenerlo consume créditos; solo vale en tablas muy grandes con poca poda.
- **Funciones sobre la columna del filtro.** `WHERE YEAR(fecha) = 2024` impide descartar micro-particiones; filtra por rango de fechas.
- **Warehouses que nunca se apagan.** AUTO_SUSPEND corto en todos, sobre todo en los de análisis.
:::

## ✅ Lo que lograste

- Sabes dimensionar y apagar warehouses.
- Entiendes cachés, poda y clustering.
- Tienes una lista de revisión.

:::ejercicio quiz
¿Cuánto dura la caché de resultados de Snowflake?
- [ ] 1 minuto
- [x] 24 horas, si los datos no cambiaron
- [ ] 7 días
- [ ] Para siempre
:::

:::ejercicio quiz
¿Qué es la poda de micro-particiones?
- [x] Leer solo las particiones que pueden tener filas que cumplen el filtro
- [ ] Borrar particiones viejas
- [ ] Comprimir la tabla
- [ ] Agrupar consultas parecidas en el mismo warehouse
:::

:::ejercicio quiz
¿Cuándo vale la pena una clave de clustering?
- [ ] En todas las tablas
- [x] En tablas muy grandes filtradas siempre por la misma columna y con poca poda
- [ ] En tablas de 100 filas
- [ ] En tablas que se recargan completas todos los días
:::

:::ejercicio quiz
¿Por qué SELECT * cuesta más en Snowflake?
- [ ] Porque desactiva la poda de micro-particiones
- [x] Porque guarda por columnas y leer todas cuesta más que leer las necesarias
- [ ] Porque no usa caché nunca
- [ ] No cuesta más: Snowflake guarda por filas
:::
