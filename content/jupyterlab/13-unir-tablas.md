---
titulo: Unir tablas con merge - traer datos de otra tabla sin perder ni duplicar filas
nivel: 4 · Intermedio-avanzado
duracion: 50
resumen: Los datos reales vienen repartidos en varias tablas - pedidos por un lado, clientes por otro, productos en una tercera. Cómo unirlas con merge por una clave, qué cambia con how left, inner y outer, cómo verificar la unión con indicator y validate, cómo encontrar lo que no tiene pareja (anti-join) y las dos trampas que arruinan análisis - claves duplicadas y tipos distintos.
objetivos: Unir dos DataFrames por una clave con merge | Elegir entre how left, inner, outer y right | Verificar una unión con indicator=True y validate | Encontrar registros sin pareja (anti-join) | Detectar claves duplicadas y tipos que no coinciden
prerrequisitos: jupyterlab-proyecto-reporte-comercial
autoevaluacion: ¿Sabes traer el país del cliente a cada pedido? | ¿Sabes qué filas quedan con how="left"? | ¿Sabes comprobar que una unión no multiplicó filas? | ¿Sabes encontrar los clientes que nunca compraron?
---

:::analogia En palabras simples
`merge` es lo mismo que el BUSCARX de Excel o el JOIN de SQL, pero para la tabla entera de una vez: cada pedido busca a su cliente por el `cliente_id` y se trae las columnas que le pidas. La clave es la "llave" que comparten las dos tablas.
:::

## Paso 1 — Tu primer merge

```python norun
clientes = pd.read_csv("datos/clientes.csv")
unido = pedidos.merge(clientes[["cliente_id", "pais", "segmento"]], on="cliente_id", how="left")
unido.shape
```

Da `(12000, 9)`: las mismas 12.000 filas de pedidos, con dos columnas más.

- `on="cliente_id"`: la clave común.
- `clientes[["cliente_id", "pais", "segmento"]]`: trae **solo** las columnas que necesitas (siempre incluyendo la clave).
- `how="left"`: todas las filas de la tabla de la izquierda (pedidos), encuentren o no pareja.

Ahora puedes agrupar por país: `unido.groupby("pais").size().sort_values(ascending=False).head(3)` → Argentina 2.318, México 2.081, España 1.956.

## Paso 2 — Los cuatro tipos de unión

| `how=` | Quedan | SQL |
|---|---|---|
| `"left"` | Todas las de la izquierda; las sin pareja con NaN | `LEFT JOIN` |
| `"inner"` | Solo las que tienen pareja en las dos | `INNER JOIN` |
| `"right"` | Todas las de la derecha | `RIGHT JOIN` |
| `"outer"` | Todas las de las dos | `FULL OUTER JOIN` |

:::tip La regla práctica
Cuando "enriqueces" una tabla principal (agregar datos del cliente a cada pedido), usa **left**: nunca pierdes filas de la tabla que te importa. Si después hay NaN, ya sabes que faltó la pareja.
:::

## Paso 3 — Verifica la unión con indicator

```python norun
unido = pedidos.merge(clientes[["cliente_id", "pais"]], on="cliente_id", how="left", indicator=True)
unido["_merge"].value_counts()
```

```captura
archivo: jupyter/e13-merge.webp
texto: indicator=True agrega _merge: los 12.000 pedidos encontraron a su cliente (both)
```

| `_merge` | Significa |
|---|---|
| `both` | La fila encontró pareja |
| `left_only` | Estaba solo en la izquierda (pedido sin cliente) |
| `right_only` | Solo en la derecha (con how="outer") |

## Paso 4 — Lo que no tiene pareja: anti-join

¿Qué clientes **nunca** hicieron un pedido?

```python norun
todos = clientes.merge(pedidos[["cliente_id"]].drop_duplicates(), on="cliente_id", how="left", indicator=True)
sin_pedidos = todos[todos["_merge"] == "left_only"]
len(sin_pedidos)
```

Da **547**: más de una cuarta parte de los clientes registrados no compró nunca. Un hallazgo de negocio que sale de una unión.

Forma corta: `clientes[~clientes["cliente_id"].isin(pedidos["cliente_id"])]`.

## Paso 5 — Trampa 1: claves duplicadas

Si la tabla de la derecha tiene la clave **repetida**, cada fila de la izquierda se duplica. Protégete con `validate`:

```python norun
pedidos.merge(clientes, on="cliente_id", how="left", validate="many_to_one")
```

`many_to_one` = "muchos pedidos por cliente, pero un solo registro por cliente". Si `clientes` tuviera un id repetido, pandas lanza un error **antes** de que el análisis quede mal. Compara siempre la cantidad de filas antes y después del merge.

:::cuidado El JOIN que infla las ventas
Unir pedidos con una tabla de clientes que tiene cada cliente dos veces duplica los pedidos y, con ellos, las ventas. Nadie lo nota hasta que un total no coincide con contabilidad. `validate` y comparar `len()` antes y después lo evitan.
:::

## Paso 6 — Trampa 2: tipos distintos

Si la clave es número en una tabla y texto en la otra (`528` contra `"528"`), merge da error o no encuentra parejas. Revisa con `df["clave"].dtype` y convierte: `df["cliente_id"] = df["cliente_id"].astype(int)`.

## Paso 7 — Claves con distinto nombre y varias tablas

```python norun
detalle = pd.read_csv("datos/detalle_pedidos.csv")
productos = pd.read_csv("datos/productos.csv")
categorias = pd.read_csv("datos/categorias.csv")
lineas = (detalle
          .merge(productos[["producto_id", "nombre", "categoria_id"]], on="producto_id", how="left")
          .merge(categorias.rename(columns={"nombre": "categoria"})[["categoria_id", "categoria"]], on="categoria_id", how="left"))
lineas.head()
```

Si las claves se llaman distinto, usa `left_on="id_cliente", right_on="cliente_id"`. Y fíjate en el `rename`: dos tablas con una columna `nombre` producirían `nombre_x` y `nombre_y`.

## ✅ Lo que lograste

- Unes tablas con merge eligiendo el tipo de unión.
- Verificas uniones con indicator y validate.
- Encuentras registros sin pareja y evitas duplicar filas.

:::ejercicio quiz
Unes 12.000 pedidos con clientes usando how="left" y obtienes 12.430 filas. ¿Qué pasó?
- [ ] Nada raro, el left siempre agrega filas
- [x] Algún cliente_id está repetido en clientes y duplicó pedidos
- [ ] Faltan clientes
- [ ] El merge agregó los clientes sin pedidos
:::

:::ejercicio quiz
¿Qué `how` usas para agregar el país a cada pedido sin perder ningún pedido?
- [ ] inner
- [x] left (con pedidos a la izquierda)
- [ ] right
- [ ] Da igual
:::

:::ejercicio quiz
¿Qué hace `validate="many_to_one"`?
- [ ] Ordena el resultado
- [x] Lanza un error si la clave se repite en la tabla de la derecha
- [ ] Borra los duplicados
- [ ] Convierte los tipos
:::

:::ejercicio quiz
¿Cómo encuentras los clientes que nunca compraron?
- [ ] `clientes.merge(pedidos, how="inner")`
- [x] Un merge left desde clientes con indicator=True y quedarte con left_only
- [ ] `pedidos.dropna()`
- [ ] `clientes.drop_duplicates()`
:::
