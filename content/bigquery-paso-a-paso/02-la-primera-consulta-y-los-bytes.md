---
titulo: La primera consulta - ejecutar, leer el resultado y mirar los bytes
nivel: 1 · Básico
duracion: 35
resumen: Escribes la primera consulta en una pestaña propia, miras la estimación antes de ejecutarla, la corres y lees el resultado y la información del job (bytes procesados, facturados, costo). Después cambias las columnas por * para ver cómo sube lo que se lee, que es lo que se paga.
objetivos: Crear y nombrar una consulta | Leer la estimación del validador | Ejecutar y leer el resultado y la información del job | Comparar columnas justas contra SELECT *
prerrequisitos: bigquery-paso-a-paso-que-es-bigquery-y-la-consola
autoevaluacion: ¿Sabes qué diferencia hay entre bytes procesados y facturados? | ¿Sabes por qué SELECT * cuesta más? | ¿Sabes qué es un job? | ¿Sabes ejecutar con el teclado?
---

:::analogia Un taxímetro que avisa antes
BigQuery cobra como un taxímetro que marca lo que **lee**, no lo que te muestra. El validador te dice cuánto va a marcar antes de subir al taxi. Pedir `SELECT *` es pedirle al taxi que recorra todas las calles para traerte una sola dirección.
:::

## Paso 1 — Una consulta nueva

En Studio, **+** (nueva pestaña) y ✎ para ponerle nombre:

```sql norun
SELECT canal, COUNT(*) AS pedidos
FROM `tienda-andina-dev.tienda.pedidos`
WHERE fecha_pedido >= '2024-01-01'
GROUP BY canal
ORDER BY pedidos DESC;
```

```captura
archivo: bigquery/q02-editor.webp
texto: La pestaña con su nombre (1), Run (2) y el validador - "This query will process 63.66 KB when run" (3)
```

## Paso 2 — Ejecutar

**Run** o **Ctrl+Enter**:

```captura
archivo: bigquery/q02-resultado.webp
texto: El resultado por canal (1) y la información del job (2) - bytes procesados, facturados, costo, duración y qué se leyó
```

| Dato del job | Qué es |
|---|---|
| **Job ID** | Cada consulta es un *job*, con su identificador |
| **Bytes processed** | Lo que se leyó: solo las columnas usadas y las particiones que pasan el filtro |
| **Bytes billed** | Lo que se cobra: se redondea y tiene un **mínimo de 10 MB** por tabla consultada |
| **Costo on-demand** | Bytes facturados × USD 6,25 por TiB (precio de lista; el primer TiB del mes es gratis) |

## Paso 3 — Cambiar a SELECT *

```captura
archivo: bigquery/q02-estrella.webp
texto: SELECT * (1) - el validador sube a 268 KB (2): ahora lee todas las columnas
```

Mismas filas, **cuatro veces más datos** leídos: el costo de BigQuery depende de **qué columnas** nombras, no de cuántas filas devuelves.

:::tip El hábito
Antes de cada **Run**, mira el validador. Si dice GB o TB y esperabas KB, algo está mal: falta un filtro o sobra un `*`.
:::

:::errores
- **Usar `SELECT *` "para ver qué hay".** Lee todas las columnas y se paga entero; para mirar datos está la vista previa, que es gratis.
- **Estimar el costo por las filas del resultado.** Lo que cuenta son los bytes procesados, que aparecen en el validador y en la información del job.
- **Olvidar el mínimo facturado.** Cada tabla leída factura al menos 10 MB, aunque la consulta lea menos.
:::

## ✅ Lo que lograste

- Escribiste, estimaste y ejecutaste una consulta.
- Lees la información del job.
- Viste el costo de `SELECT *`.

:::ejercicio quiz
¿Qué diferencia hay entre bytes procesados y facturados?
- [ ] Ninguna: son dos nombres del mismo número
- [x] Los facturados se redondean y tienen un mínimo de 10 MB por tabla
- [ ] Los facturados son siempre la mitad
- [ ] Los procesados incluyen el resultado
:::

:::ejercicio quiz
¿Por qué SELECT * hizo subir la estimación?
- [x] Porque lee todas las columnas y BigQuery cobra por columnas leídas
- [ ] Porque devuelve más filas
- [ ] Porque desactiva la caché
- [ ] Porque cambia de proyecto
:::

:::ejercicio quiz
¿Qué es un job en BigQuery?
- [ ] Una sesión abierta en la consola
- [x] Cada consulta, carga o copia que ejecuta BigQuery
- [ ] Una tabla temporal
- [ ] Un dataset
:::

:::ejercicio quiz
¿Cuánto cuesta (precio de lista on-demand) procesar 1 TiB?
- [ ] USD 0,05
- [x] USD 6,25
- [ ] USD 100
- [ ] USD 1, igual que una carga por lotes
:::
