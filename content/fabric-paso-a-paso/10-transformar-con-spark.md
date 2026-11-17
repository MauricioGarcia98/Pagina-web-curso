---
titulo: Transformar con Spark SQL y PySpark - escribir tablas nuevas
nivel: 3 · Intermedio
duracion: 40
resumen: Un notebook no solo lee - escribe tablas Delta nuevas en el lakehouse. Creas ventas_por_canal con CREATE OR REPLACE TABLE en Spark SQL y unidades_por_tienda con PySpark y saveAsTable, las ves aparecer en Tables y entiendes los modos de escritura y cuándo usar cada lenguaje.
objetivos: Crear una tabla con CREATE OR REPLACE TABLE … AS SELECT | Agregar con PySpark y guardar con saveAsTable | Elegir el modo de escritura (overwrite, append) | Verificar las tablas nuevas en el lakehouse
prerrequisitos: fabric-paso-a-paso-notebooks
autoevaluacion: ¿Sabes qué hace CREATE OR REPLACE TABLE? | ¿Sabes la diferencia entre overwrite y append? | ¿Sabes dónde aparece una tabla escrita con saveAsTable? | ¿Sabes cuándo conviene SQL y cuándo PySpark?
---

:::analogia Leer, transformar y guardar en el estante
Transformar con Spark es tomar ingredientes de un estante (tablas o archivos), prepararlos en la mesada (el DataFrame) y guardar el resultado en otro estante con etiqueta (una tabla Delta en Tables). El modo de escritura decide si reemplazas el frasco o le agregas más.
:::

## Paso 1 — Una tabla con Spark SQL

En el notebook, **+ Code** y escribe:

```sql norun
%%sql
CREATE OR REPLACE TABLE ventas_por_canal AS
SELECT canal, COUNT(*) AS pedidos
FROM pedidos
GROUP BY canal
```

## Paso 2 — Una tabla con PySpark

Otra celda:

```python norun
df = spark.table("ventas_tiendas")
resumen = df.groupBy("tienda").sum("cantidad")
resumen.write.mode("overwrite").saveAsTable("unidades_por_tienda")
display(resumen)
```

**Run all**:

```captura
archivo: fabric/b10-celdas.webp
texto: La celda de Spark SQL (1) y la de PySpark (2), con su resultado por tienda
```

## Paso 3 — Las tablas nuevas

Vuelve al lakehouse:

```captura
archivo: fabric/b10-tablas-nuevas.webp
texto: ventas_por_canal y unidades_por_tienda en Tables (1), y el contenido de la segunda (2)
```

Son tablas **Delta** como cualquier otra: el endpoint SQL y Power BI las ven enseguida.

## Paso 4 — Modos de escritura

| Modo | Qué hace | Cuándo |
|---|---|---|
| `overwrite` | Reemplaza la tabla entera | Resúmenes que se recalculan completos |
| `append` | Agrega filas | Cargas incrementales de datos nuevos |
| `MERGE INTO` (Spark SQL) | Inserta lo nuevo y actualiza lo existente | Mantener una tabla al día sin duplicar |

```sql norun
%%sql
MERGE INTO clientes AS t
USING clientes_nuevos AS s
ON t.cliente_id = s.cliente_id
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *
```

:::tip ¿SQL o PySpark?
Las dos generan el mismo plan en Spark. **SQL** es más claro para seleccionar, unir y agrupar. **PySpark** conviene cuando hay lógica (bucles, funciones, leer muchos archivos, llamar APIs). En un mismo notebook se mezclan sin problema.
:::

:::errores
- **Usar `overwrite` en una carga diaria.** Borra lo anterior; para sumar se usa `append`, o `MERGE` si pueden venir repetidos.
- **`append` sin control de duplicados.** Reprocesar un día lo duplica; con MERGE por clave la carga es idempotente.
- **Escribir en Files cuando querías una tabla.** `saveAsTable` crea la tabla en Tables; `save` con una ruta escribe archivos.
:::

## ✅ Lo que lograste

- Escribiste tablas Delta con Spark SQL y con PySpark.
- Conoces los modos de escritura y cuándo usar cada lenguaje.

:::ejercicio quiz
¿Qué hace `CREATE OR REPLACE TABLE t AS SELECT …`?
- [ ] Agrega filas a t
- [x] Crea t con el resultado, reemplazándola si existía
- [ ] Crea t vacía con las columnas del SELECT
- [ ] Crea una vista
:::

:::ejercicio quiz
Cada día llegan pedidos nuevos y hay que sumarlos a la tabla. ¿Qué modo usas?
- [ ] overwrite
- [x] append (o MERGE si puede haber repetidos)
- [ ] ignore
- [ ] errorifexists
:::

:::ejercicio quiz
¿Dónde aparece una tabla escrita con saveAsTable?
- [x] En Tables del lakehouse por defecto
- [ ] En Files
- [ ] En Files/tables del lakehouse
- [ ] En el warehouse
:::

:::ejercicio quiz
¿Qué hace MERGE INTO?
- [ ] Une dos tablas en una nueva
- [x] Inserta lo nuevo y actualiza lo que ya existe, según una condición
- [ ] Borra duplicados
- [ ] Agrega todas las filas de la fuente al final
:::
