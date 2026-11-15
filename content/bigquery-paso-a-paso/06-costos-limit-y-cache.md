---
titulo: Costos - LIMIT no ahorra, la caché sí
nivel: 2 · Básico-intermedio
duracion: 40
resumen: Comprobás que LIMIT no baja lo que se procesa, que repetir la misma consulta sale de la caché por 0 bytes, y recorres la página de costos con tus consultas más caras y cuánto costarían a escala real. Conoces los dos modelos de precio (on-demand y capacidad) y el costo de almacenamiento.
objetivos: Comprobar que LIMIT no reduce los bytes procesados | Aprovechar la caché de resultados | Leer la página de costos | Distinguir on-demand, capacidad y almacenamiento
prerrequisitos: bigquery-paso-a-paso-datasets-y-tablas
autoevaluacion: ¿Sabes cuánto procesa SELECT * ... LIMIT 10? | ¿Sabes cuándo una consulta sale de la caché? | ¿Sabes qué es el almacenamiento de largo plazo? | ¿Sabes cuándo conviene el modelo de capacidad?
---

## Paso 1 — LIMIT no ahorra

```sql norun
SELECT *
FROM tienda.pedidos
WHERE fecha_pedido >= '2024-01-01'
LIMIT 10;
```

```captura
archivo: bigquery/q06-limit.webp
texto: SELECT * con LIMIT 10 (1) - el validador sigue marcando 268 KB (2)
```

`LIMIT` corta el resultado **después** de leer las columnas. Para mirar datos, usa **Preview** (gratis).

## Paso 2 — La caché

Ejecuta una consulta y vuelve a ejecutarla sin cambios:

```captura
archivo: bigquery/q06-cache.webp
texto: La segunda ejecución - 0 B procesados y la marca "results cached"
```

BigQuery guarda el resultado **24 horas**. Si la consulta es idéntica, las tablas no cambiaron y no usa funciones no deterministas (`CURRENT_TIMESTAMP()`, `RAND()`), responde desde la caché **sin costo**.

## Paso 3 — La página de costos

**Costs (práctica)**:

```captura
archivo: bigquery/q06-costos.webp
texto: Bytes procesados, facturados y costo de la práctica (1) y tus consultas más caras con lo que costarían si las tablas fueran 10.000 veces más grandes (2)
```

## Paso 4 — Los modelos de precio

| Concepto | Cómo se cobra (precios de lista, varían por región) |
|---|---|
| **On-demand** | USD 6,25 por TiB procesado; el primer TiB del mes es gratis |
| **Capacidad (ediciones)** | Slots reservados o con autoescalado por hora (Standard, Enterprise, Enterprise Plus): costo predecible para mucho volumen |
| **Almacenamiento activo** | Por GiB al mes |
| **Almacenamiento de largo plazo** | Si una tabla o partición no se modifica en 90 días, su precio baja a la mitad, solo |
| **Cargas por lotes** | Gratis (se paga el almacenamiento) |

:::tip Un tope para dormir tranquilo
En BigQuery real se puede fijar **Maximum bytes billed** en cada consulta (o un máximo por día por proyecto o usuario): si la consulta superaría ese límite, falla sin cobrar.
:::

## ✅ Lo que lograste

- Comprobaste que LIMIT no ahorra.
- Viste la caché en acción.
- Conoces los modelos de precio.

:::ejercicio quiz
¿Cuánto procesa `SELECT * FROM pedidos LIMIT 10` frente a `SELECT *` sin LIMIT?
- [ ] Una décima parte
- [x] Lo mismo: LIMIT recorta el resultado, no la lectura
- [ ] Nada
- [ ] El doble
:::

:::ejercicio quiz
¿Cuándo responde BigQuery desde la caché?
- [x] Si la consulta es idéntica, las tablas no cambiaron y es determinista, dentro de 24 horas
- [ ] Siempre
- [ ] Nunca
- [ ] Solo los lunes
:::

:::ejercicio quiz
¿Qué pasa con el precio de una tabla que no se modifica en 90 días?
- [ ] Se borra
- [x] Pasa a almacenamiento de largo plazo y cuesta la mitad
- [ ] Sube
- [ ] Nada
:::

:::ejercicio quiz
¿Cuánto cuesta cargar un archivo por lotes a BigQuery?
- [x] La carga es gratis; se paga el almacenamiento
- [ ] USD 6,25 por TiB
- [ ] Una tarifa fija
- [ ] Depende del día
:::
