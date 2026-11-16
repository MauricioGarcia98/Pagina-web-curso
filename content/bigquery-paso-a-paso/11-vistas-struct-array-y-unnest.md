---
titulo: Vistas, STRUCT, ARRAY y UNNEST - datos anidados
nivel: 3 · Intermedio
duracion: 45
resumen: BigQuery guarda bien los datos anidados - listas y registros dentro de una fila. Creas una vista con los últimos tres pedidos de cada cliente en un ARRAY, la abres en filas con UNNEST, armas un STRUCT y aprendes por qué anidar evita joins en tablas muy grandes.
objetivos: Crear una vista | Armar arreglos con ARRAY_AGG | Abrir arreglos en filas con UNNEST | Crear y leer STRUCT | Saber cuándo conviene anidar
prerrequisitos: bigquery-paso-a-paso-cargar-datos
autoevaluacion: ¿Sabes si una vista guarda datos? | ¿Sabes qué devuelve ARRAY_AGG(... LIMIT 3)? | ¿Sabes qué hace UNNEST? | ¿Sabes leer un campo de un STRUCT?
---

:::analogia El ticket con sus renglones
En una base clásica, el ticket va en una tabla y sus renglones en otra, y cada consulta los vuelve a unir. En BigQuery el ticket puede llevar sus renglones adentro: un `ARRAY` de `STRUCT`. `UNNEST` despliega esos renglones en filas cuando los necesitas.
:::

## Paso 1 — Una vista con un arreglo

```sql norun
CREATE OR REPLACE VIEW analitica.v_ultimos_pedidos AS
SELECT cliente_id,
       ARRAY_AGG(pedido_id ORDER BY fecha_pedido DESC LIMIT 3) AS ultimos
FROM tienda.pedidos
GROUP BY cliente_id;

SELECT * FROM analitica.v_ultimos_pedidos ORDER BY cliente_id LIMIT 5;
```

```captura
archivo: bigquery/q11-array.webp
texto: La vista con ARRAY_AGG (1) - una fila por cliente con sus tres últimos pedidos en una lista (2)
```

Una **vista** guarda la consulta, no los datos: cada vez que se usa, se ejecuta y se cobra lo que lee de las tablas de fondo.

## Paso 2 — UNNEST

```sql norun
SELECT v.cliente_id, pedido
FROM analitica.v_ultimos_pedidos AS v,
     UNNEST(v.ultimos) AS pedido
WHERE v.cliente_id <= 3
ORDER BY v.cliente_id;
```

```captura
archivo: bigquery/q11-unnest.webp
texto: UNNEST abre la lista (1) - una fila por pedido del cliente (2)
```

| Función | Qué hace |
|---|---|
| `ARRAY_AGG(x ORDER BY y LIMIT n)` | Junta valores en una lista ordenada |
| `UNNEST(arreglo)` | Abre la lista: una fila por elemento |
| `arreglo[OFFSET(0)]` | El primer elemento (desde 0); `ORDINAL(1)` cuenta desde 1 |
| `ARRAY_LENGTH(arreglo)` | Cuántos elementos tiene |

## Paso 3 — STRUCT

```sql norun
SELECT STRUCT('Lima Centro' AS tienda, 'PE' AS pais) AS sucursal,
       ['web', 'app', 'tienda'] AS canales;
```

```captura
archivo: bigquery/q11-struct.webp
texto: Un STRUCT (registro con campos) y un ARRAY en una sola fila
```

Un campo de un STRUCT se lee con punto: `sucursal.pais`.

## Paso 4 — ¿Por qué anidar?

En BigQuery, un pedido con sus líneas como `ARRAY<STRUCT<producto_id, cantidad, precio>>` dentro de la misma fila evita el JOIN entre pedidos y detalle, que en tablas de miles de millones de filas es lo más caro. Es el modelo que usa, por ejemplo, la exportación de Google Analytics 4.

:::errores
- **Perder filas con `UNNEST`.** `CROSS JOIN UNNEST(lista)` descarta las filas cuya lista está vacía; si las necesitas, usa `LEFT JOIN UNNEST(lista)`.
- **Creer que la vista ahorra.** La vista guarda la consulta, no el resultado: cada uso vuelve a leer (y cobrar) las tablas de origen.
- **Leer un STRUCT con corchetes.** Los campos se leen con punto (`sucursal.pais`); los corchetes son para posiciones de un ARRAY (`lista[OFFSET(0)]`).
:::

## ✅ Lo que lograste

- Creaste una vista con arreglos.
- Abriste arreglos con UNNEST.
- Armaste un STRUCT y sabes cuándo anidar.

:::ejercicio quiz
¿Una vista guarda datos?
- [ ] Sí, una copia
- [x] No: guarda la consulta y la ejecuta cada vez que se usa
- [ ] Sí, se actualiza una vez por día
- [ ] Solo si es particionada
:::

:::ejercicio quiz
¿Qué devuelve ARRAY_AGG(pedido_id ORDER BY fecha_pedido DESC LIMIT 3)?
- [x] Una lista con los 3 pedidos más recientes de cada grupo
- [ ] 3 filas por cliente
- [ ] El pedido más viejo
- [ ] Un error
:::

:::ejercicio quiz
¿Qué hace UNNEST(ultimos)?
- [ ] Convierte la lista en un texto separado por comas
- [x] Abre la lista en filas, una por elemento
- [ ] Ordena la lista
- [ ] Cuenta los elementos
:::

:::ejercicio quiz
¿Cómo lees el país de `sucursal`, un STRUCT con tienda y pais?
- [ ] sucursal[pais]
- [x] sucursal.pais
- [ ] pais(sucursal)
- [ ] sucursal->pais
:::
