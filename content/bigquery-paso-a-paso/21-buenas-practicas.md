---
titulo: Buenas prácticas - consultas baratas y rápidas por diseño
nivel: 6 · Avanzado completo
duracion: 35
resumen: Juntas lo aprendido en una consulta que lee 2 columnas, el 2 % de una tabla particionada y con clustering, y en una lista de hábitos para consultas, tablas, cargas y equipo que mantienen BigQuery rápido y barato a medida que los datos crecen.
objetivos: Optimizar una consulta con columnas, partición y clustering | Elegir el diseño de tabla según el uso | Evitar los antipatrones más caros | Revisar consultas con una lista
prerrequisitos: bigquery-paso-a-paso-proyecto-costo-bajo-control
autoevaluacion: ¿Sabes las tres palancas para leer menos? | ¿Sabes por qué un JOIN con una tabla enorme sin filtrar es caro? | ¿Sabes cuándo usar una vista materializada? | ¿Sabes revisar una consulta antes de aprobarla?
---

## Paso 1 — Las tres palancas juntas

```sql norun
-- columnas justas + filtro de partición + clustering
SELECT canal, COUNT(*) AS pedidos
FROM analitica.pedidos_part
WHERE fecha_pedido BETWEEN '2024-12-01' AND '2024-12-31'
  AND canal = 'web'
GROUP BY canal;
```

```captura
archivo: bigquery/q21-optimizada.webp
texto: La estimación (1) y lo que realmente se leyó - 2 columnas y el 2 % de la tabla gracias a la partición y el clustering (2)
```

| Palanca | Efecto |
|---|---|
| **Columnas** | Solo se leen las nombradas |
| **Partición** | Solo se leen las particiones del filtro |
| **Clustering** | Dentro de cada partición, se saltan los bloques que no tienen ese canal |

## Paso 2 — Hábitos

**Consultas**
- Nombrar columnas; `SELECT * EXCEPT(...)` si hacen falta casi todas.
- Filtrar por la partición **antes** de unir tablas grandes.
- Mirar el validador antes de ejecutar y el "qué se leyó" después.
- Para explorar: Preview, no `LIMIT`.

**Tablas**
- Particionar las tablas grandes por la fecha de uso y exigir el filtro.
- Clustering por las columnas que más se filtran (hasta 4).
- Desnormalizar o anidar (`ARRAY<STRUCT>`) cuando un JOIN se repite mucho.
- **Vistas materializadas** para agregados que se consultan seguido: BigQuery las mantiene al día y las usa solo.

**Cargas**
- Cargas por lotes (gratis) antes que streaming si no hace falta al instante.
- MERGE idempotente para incrementales.
- Vencimiento automático para tablas temporales.

**Equipo**
- Datasets por capa y por equipo, con permisos por dataset.
- Límite de bytes por consulta y cuotas diarias.
- SQL versionado (Dataform o dbt), no consultas sueltas en pestañas.

## ✅ Lo que lograste

- Combinaste las tres palancas.
- Tienes una lista de hábitos para consultas, tablas, cargas y equipo.

:::ejercicio quiz
¿Cuáles son las tres palancas para leer menos datos?
- [x] Columnas justas, filtro de partición y clustering
- [ ] LIMIT, ORDER BY y DISTINCT
- [ ] Más slots, más regiones y más usuarios
- [ ] Vistas, comentarios y alias
:::

:::ejercicio quiz
¿Por qué conviene filtrar por la partición antes de unir con una tabla enorme?
- [x] Para que el JOIN trabaje con menos filas y se lean menos particiones
- [ ] Porque los JOIN no existen
- [ ] Porque es obligatorio
- [ ] No cambia nada
:::

:::ejercicio quiz
¿Cuándo conviene una vista materializada?
- [ ] Para datos que nunca se consultan
- [x] Para agregados que se consultan seguido: BigQuery los mantiene al día
- [ ] Para borrar datos
- [ ] Nunca
:::

:::ejercicio quiz
¿Qué conviene para tablas temporales que nadie limpia?
- [ ] Dejarlas para siempre
- [x] Un vencimiento automático
- [ ] Copiarlas
- [ ] Hacerlas vistas
:::
