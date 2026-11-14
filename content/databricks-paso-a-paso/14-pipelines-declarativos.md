---
titulo: Pipelines declarativos - bronze, silver y gold con expectativas de calidad
nivel: 4 · Intermedio-avanzado
duracion: 55
resumen: Un pipeline declarativo (Lakeflow Declarative Pipelines) es otra forma de construir tablas - describes qué tabla sale de qué y Databricks resuelve el orden, lo incremental y la calidad. Crear un pipeline, leer su código (tablas de streaming, vistas materializadas, expectativas), ejecutarlo, leer el grafo, las métricas y el registro de eventos, y qué hacen Dry run y Full refresh.
objetivos: Explicar la diferencia entre un job y un pipeline declarativo | Leer y escribir tablas de streaming y vistas materializadas | Definir expectativas con las tres acciones | Ejecutar un pipeline y leer grafo, calidad y eventos | Saber cuándo usar Full refresh
prerrequisitos: databricks-paso-a-paso-jobs-orquestar
autoevaluacion: ¿Sabes qué es una tabla de streaming? | ¿Sabes qué pasa con una fila que viola una expectativa con DROP ROW? | ¿Sabes qué hace Dry run? | ¿Sabes dónde quedan las tablas del pipeline?
---

:::analogia En palabras simples
Con un job tú escribes la receta paso a paso: primero esto, después aquello. Con un pipeline declarativo escribes el **menú**: "la tabla silver sale de la bronze filtrada; la gold sale de la silver agrupada". La cocina deduce el orden, procesa solo lo nuevo y anota qué platos no pasaron el control de calidad.
:::

## Paso 1 — Crear el pipeline

**Jobs & Pipelines → Create → ETL pipeline**:

```captura
archivo: databricks/d14-nuevo.webp
texto: Nombre (1), catálogo (2) y esquema de destino (3), y el código inicial (4) - el ejemplo trae bronze, silver y gold
```

Las tablas que produce el pipeline quedan en **catálogo.esquema** de destino (`main.ventas_pipeline`).

## Paso 2 — El código

```captura
archivo: databricks/d14-pipeline.webp
texto: El archivo de transformaciones (1), el grafo que Databricks deduce del código (2), Run pipeline (3) y Dry run (4)
```

```sql norun
-- Bronze: tabla de streaming (incremental: en cada actualización procesa solo lo nuevo)
CREATE OR REFRESH STREAMING TABLE pedidos_bronze
COMMENT 'Pedidos tal como llegan'
AS SELECT * FROM STREAM(samples.tienda.pedidos);

-- Silver: vista materializada con expectativas de calidad
CREATE OR REFRESH MATERIALIZED VIEW pedidos_silver (
  CONSTRAINT canal_valido EXPECT (canal IN ('web', 'app', 'tienda', 'telefono')) ON VIOLATION DROP ROW,
  CONSTRAINT con_cliente EXPECT (cliente_id IS NOT NULL),
  CONSTRAINT estado_conocido EXPECT (estado <> 'desconocido')
)
COMMENT 'Pedidos limpios'
AS SELECT pedido_id, cliente_id, canal, estado, CAST(fecha_pedido AS DATE) AS fecha
FROM pedidos_bronze;

-- Gold: agregado para el tablero
CREATE OR REFRESH MATERIALIZED VIEW pedidos_por_dia
AS SELECT fecha, canal, COUNT(*) AS pedidos
FROM pedidos_silver
GROUP BY fecha, canal;
```

| Elemento | Qué es |
|---|---|
| **Streaming table** | Se alimenta de una fuente que crece (archivos, una tabla, un tópico); cada actualización procesa **solo lo nuevo** |
| **Materialized view** | Se recalcula a partir de sus fuentes; Databricks la actualiza incrementalmente cuando puede |
| **`STREAM(...)`** | Leer la fuente como flujo |
| **`CONSTRAINT … EXPECT (condición)`** | Una expectativa de calidad |
| El orden | No importa: el grafo sale de las dependencias (`pedidos_silver` lee `pedidos_bronze`) |

## Paso 3 — Expectativas: las tres acciones

| Acción | Qué pasa con la fila que no cumple |
|---|---|
| *(sin ON VIOLATION)* | Se **conserva** y se cuenta como fallida (avisar) |
| `ON VIOLATION DROP ROW` | Se **descarta** |
| `ON VIOLATION FAIL UPDATE` | **Falla** toda la actualización (para reglas que no admiten excepción) |

## Paso 4 — Ejecutar

**Run pipeline**:

```captura
archivo: databricks/d14-corriendo.webp
texto: Los datasets se actualizan en orden - cada nodo muestra su estado
```

```captura
archivo: databricks/d14-completado.webp
texto: COMPLETED (1) - bronze 12 000 escritas, silver 12 000 con 3 expectativas, gold 3719 filas (2)
```

Haz clic en `pedidos_silver`:

```captura
archivo: databricks/d14-calidad.webp
texto: Data quality - cada expectativa con su acción, filas que pasaron, que fallaron y el porcentaje
```

```captura
archivo: databricks/d14-event-log.webp
texto: El registro de eventos - cada flujo con su inicio, fin y filas escritas
```

Las tablas quedan en **Catalog → main → ventas_pipeline**, consultables como cualquier otra.

## Paso 5 — Dry run, Full refresh y modos

| Botón | Hace |
|---|---|
| **Dry run** | Valida el código y arma el grafo sin escribir nada |
| **Run pipeline** | Actualización incremental |
| **Full refresh all** | Vuelve a procesar **todo** desde cero (para cambios de lógica o datos corregidos en origen; en producción, con cuidado: puede tardar y costar) |
| **Triggered / Continuous** | Correr cuando se lo pide (un job, un horario) o quedarse procesando sin parar |

Un pipeline se programa agregándolo como **tarea de tipo Pipeline** en un job (lección 13).

## Paso 6 — Job o pipeline

| Si | Usa |
|---|---|
| Transformaciones de tablas en cadena, calidad de datos, cargas incrementales | **Pipeline declarativo** |
| Pasos heterogéneos (un notebook, una consulta, una condición, llamar al pipeline, avisar) | **Job**, que puede incluir el pipeline como tarea |

:::nota AUTO CDC
Para aplicar cambios de un origen (altas, bajas, modificaciones) a una tabla de destino, los pipelines tienen `CREATE FLOW … AS AUTO CDC INTO destino FROM origen KEYS (…) SEQUENCE BY …`: el `MERGE` incremental resuelto por la plataforma, incluso con historial (SCD tipo 2). Lo practicas en la [práctica autocorregida de Databricks SQL](#/l/databricks-practica-sql).
:::

## ✅ Lo que lograste

- Creaste y ejecutaste un pipeline con bronze, silver y gold.
- Entiendes tablas de streaming, vistas materializadas y expectativas.
- Lees el grafo, la calidad y los eventos, y sabes cuándo hacer Full refresh.

:::ejercicio quiz
Una fila no cumple una expectativa con ON VIOLATION DROP ROW. ¿Qué pasa?
- [ ] Falla el pipeline
- [x] La fila se descarta y se cuenta como fallida en Data quality
- [ ] Se guarda igual
- [ ] Se envía por correo
:::

:::ejercicio quiz
¿Qué diferencia a una streaming table de una materialized view?
- [ ] Ninguna
- [x] La streaming table procesa solo lo nuevo de una fuente que crece; la vista materializada se recalcula a partir de sus fuentes
- [ ] La streaming table es más lenta
- [ ] La materialized view no se puede consultar
:::

:::ejercicio quiz
Cambiaste la lógica de la capa silver y quieres que todas las filas se recalculen. ¿Qué haces?
- [ ] Run pipeline
- [x] Full refresh all
- [ ] Dry run
- [ ] Borrar el pipeline
:::

:::ejercicio quiz
¿Dónde quedan las tablas que produce el pipeline?
- [ ] Solo dentro del pipeline
- [x] En el catálogo y esquema de destino, consultables como cualquier tabla
- [ ] En un volumen
- [ ] En el notebook
:::
