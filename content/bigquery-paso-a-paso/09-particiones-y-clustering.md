---
titulo: Particiones y clustering - leer solo lo necesario
nivel: 3 · Intermedio
duracion: 45
resumen: Particionar por fecha y agrupar (clustering) por las columnas que más se filtran es la forma principal de bajar costo y tiempo en BigQuery. Creas pedidos_part particionada por día, con clustering por canal y filtro de partición obligatorio, comparas la estimación con y sin filtro y aprendes qué impide la poda.
objetivos: Crear una tabla particionada y con clustering | Comprobar la poda de particiones en la estimación | Exigir el filtro de partición | Evitar los filtros que impiden la poda
prerrequisitos: bigquery-paso-a-paso-proyecto-dataset-de-analitica
autoevaluacion: ¿Sabes qué columna conviene para particionar? | ¿Sabes qué hace require_partition_filter? | ¿Sabes por qué EXTRACT(YEAR FROM fecha) impide la poda? | ¿Cuántas columnas admite el clustering?
---

:::analogia Estantes por fecha y libros por tema
Una tabla particionada es una biblioteca con un estante por día: si pides solo diciembre, nadie mira los demás estantes. El clustering ordena los libros de cada estante por tema: si además pides el canal web, se saltan los bloques que no lo tienen.
:::

## Paso 1 — Crear la tabla

```sql norun
CREATE TABLE analitica.pedidos_part
PARTITION BY fecha_pedido
CLUSTER BY canal
OPTIONS (require_partition_filter = TRUE)
AS SELECT * FROM tienda.pedidos;
```

```captura
archivo: bigquery/q09-crear.webp
texto: La tabla particionada por fecha_pedido, con clustering por canal y filtro obligatorio (1), creada (2)
```

| Cláusula | Qué hace |
|---|---|
| `PARTITION BY fecha_pedido` | Divide la tabla en una partición por día |
| `CLUSTER BY canal` | Ordena los datos dentro de cada partición por canal (hasta 4 columnas) |
| `require_partition_filter = TRUE` | Rechaza las consultas que no filtran por la partición |

## Paso 2 — La poda

```sql norun
SELECT canal, COUNT(*) AS pedidos
FROM analitica.pedidos_part
WHERE fecha_pedido BETWEEN '2024-11-01' AND '2024-11-30'
GROUP BY canal;
```

```captura
archivo: bigquery/q09-poda.webp
texto: El filtro por un mes (1) - el validador baja a 7,41 KB (2): solo se leen las particiones de noviembre
```

Sin el filtro:

```captura
archivo: bigquery/q09-sin-filtro.webp
texto: Cannot query over table without a filter over column(s) 'fecha_pedido' - el filtro obligatorio frena la consulta cara
```

```captura
archivo: bigquery/q09-details.webp
texto: Details - particionada por DAY en fecha_pedido, filtro de partición Required y clustering por canal
```

## Paso 3 — Qué impide la poda

| Filtro | ¿Poda? |
|---|---|
| `WHERE fecha_pedido = '2024-11-17'` | ✅ |
| `WHERE fecha_pedido BETWEEN '2024-11-01' AND '2024-11-30'` | ✅ |
| `WHERE EXTRACT(YEAR FROM fecha_pedido) = 2024` | ❌ la función oculta la columna |
| `WHERE CAST(fecha_pedido AS STRING) LIKE '2024%'` | ❌ |
| `WHERE fecha_pedido >= (SELECT MAX(fecha) FROM otra)` | Parcial: la estimación no lo sabe de antemano |

## Paso 4 — Cuándo usar cada uno

| Técnica | Conviene cuando |
|---|---|
| **Particionar** | Casi siempre se filtra por fecha (o por un entero de rango) y la tabla es grande |
| **Clustering** | Se filtra o agrupa seguido por otras columnas (canal, país, cliente). No baja la estimación, sí lo que finalmente se cobra |
| **Ambos** | Tablas de hechos grandes: particionar por fecha y clustering por las dimensiones más filtradas |

:::errores
- **Envolver la columna de partición en una función.** `EXTRACT(YEAR FROM fecha) = 2024` impide la poda; escribe `fecha BETWEEN '2024-01-01' AND '2024-12-31'`.
- **Particionar por algo que no se filtra.** La partición ayuda solo si las consultas filtran por esa columna; casi siempre es la fecha del evento.
- **Clustering por columnas que nadie filtra.** Ordenar por el id del pedido no ayuda si las consultas filtran por canal y país.
:::

## ✅ Lo que lograste

- Creaste una tabla particionada y con clustering.
- Viste la poda en la estimación.
- Sabes qué filtros impiden la poda.

:::ejercicio quiz
¿Qué columna conviene usar para particionar una tabla de ventas?
- [x] La fecha por la que casi siempre se filtra
- [ ] El email del cliente
- [ ] El id del pedido, porque es único
- [ ] El id del cliente, porque es la clave de los JOIN
:::

:::ejercicio quiz
¿Qué hace require_partition_filter = TRUE?
- [ ] Borra las particiones viejas
- [x] Rechaza las consultas que no filtran por la columna de partición
- [ ] Crea una partición por fila
- [ ] Desactiva la caché
:::

:::ejercicio quiz
¿Por qué `WHERE EXTRACT(YEAR FROM fecha_pedido) = 2024` no poda?
- [ ] Porque EXTRACT solo funciona en columnas DATETIME
- [x] Porque la función sobre la columna impide saber qué particiones descartar
- [ ] Porque falta un clustering por año
- [ ] Sí poda: BigQuery reescribe la condición solo
:::

:::ejercicio quiz
¿Cuántas columnas admite CLUSTER BY?
- [ ] 1
- [x] Hasta 4
- [ ] Hasta 100
- [ ] Ilimitadas
:::
