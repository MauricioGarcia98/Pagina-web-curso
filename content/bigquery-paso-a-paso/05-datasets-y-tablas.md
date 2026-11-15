---
titulo: Datasets y tablas - organizar el proyecto
nivel: 2 · Básico-intermedio
duracion: 35
resumen: Creas el dataset analitica con una descripción, una tabla con CREATE TABLE AS SELECT, la encuentras en el explorador y en la página del dataset, y aprendes qué define un dataset (región, permisos, vencimiento por defecto) y cómo organizar datasets por capa y por equipo.
objetivos: Crear un dataset con CREATE SCHEMA | Crear una tabla con CTAS | Leer la página de un dataset | Elegir región y organización de datasets
prerrequisitos: bigquery-paso-a-paso-proyecto-pedidos-por-mes-y-canal
autoevaluacion: ¿Sabes qué sentencia crea un dataset? | ¿Sabes qué define la región de un dataset? | ¿Sabes por qué no se puede unir tablas de regiones distintas? | ¿Sabes cómo organizar datasets por capa?
---

## Paso 1 — Crear el dataset y una tabla

```sql norun
CREATE SCHEMA analitica
OPTIONS (description = 'Tablas limpias para el negocio');

CREATE TABLE analitica.ventas_por_canal AS
SELECT canal, COUNT(*) AS pedidos
FROM tienda.pedidos
WHERE fecha_pedido >= '2024-01-01'
GROUP BY canal;
```

En GoogleSQL, **`CREATE SCHEMA` crea un dataset** (también se crea con el **+** del explorador).

```captura
archivo: bigquery/q05-crear.webp
texto: El dataset analitica en el explorador (1), las dos sentencias ejecutadas (2) y la tabla creada (3)
```

## Paso 2 — La página del dataset

```captura
archivo: bigquery/q05-dataset.webp
texto: El dataset analitica (1) y sus tablas con tipo, filas y tamaño (2)
```

## Paso 3 — Qué define un dataset

| Propiedad | Qué decide |
|---|---|
| **Ubicación (región)** | Dónde viven los datos: `US`, `EU`, `southamerica-east1`… No se cambia después |
| **Permisos** | Quién puede leer o escribir sus tablas (nivel 5) |
| **Vencimiento por defecto** | Tablas que se borran solas después de N días (útil para datos temporales) |
| **Descripción y etiquetas** | Documentación y costos por equipo |

:::cuidado La región importa
Una consulta solo puede unir tablas de **la misma región**. Elige la región al crear el dataset pensando dónde están los demás datos (y, si aplica, dónde exige la ley que estén).
:::

## Paso 4 — Cómo organizar

| Dataset | Para |
|---|---|
| `raw_*` | Datos tal como llegan |
| `staging` | Limpieza intermedia |
| `analitica` / `marts` | Tablas listas para el negocio |
| `reportes` | Vistas para cada área |
| `sandbox_<persona>` | Pruebas personales, con vencimiento corto |

## ✅ Lo que lograste

- Creaste un dataset y una tabla.
- Sabes qué define un dataset.
- Tienes una forma de organizar el proyecto.

:::ejercicio quiz
¿Qué sentencia de GoogleSQL crea un dataset?
- [ ] CREATE DATABASE
- [x] CREATE SCHEMA
- [ ] CREATE DATASET TABLE
- [ ] NEW DATASET
:::

:::ejercicio quiz
¿Se puede cambiar la región de un dataset después de crearlo?
- [ ] Sí, desde Details
- [x] No: hay que crear otro y copiar los datos
- [ ] Solo los domingos
- [ ] Solo con ACCOUNTADMIN
:::

:::ejercicio quiz
¿Puedes unir una tabla en US con una en EU en la misma consulta?
- [ ] Sí, siempre
- [x] No: las tablas de una consulta tienen que estar en la misma región
- [ ] Solo con LIMIT
- [ ] Solo si son vistas
:::

:::ejercicio quiz
¿Para qué sirve el vencimiento por defecto de un dataset?
- [x] Para que las tablas se borren solas después de N días
- [ ] Para hacer backups
- [ ] Para cambiar la región
- [ ] Para dar permisos
:::
