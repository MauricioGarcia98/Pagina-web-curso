---
titulo: JOIN: combinar tablas
nivel: Intermedio
duracion: 40
resumen: Claves primarias y foráneas, INNER JOIN, alias de tabla y joins de varias tablas.
objetivos: Explicar por qué los datos están repartidos en varias tablas y cómo se conectan con claves | Unir dos o más tablas con `INNER JOIN … ON` | Anticipar cuántas filas devuelve un JOIN en relaciones uno a muchos | Agregar después de unir sin duplicar importes
prerrequisitos: sql-group-by
autoevaluacion: ¿Puedes mostrar cada pedido con el nombre de su cliente? | ¿Sabes qué filas quedan afuera de un `INNER JOIN`? | ¿Puedes calcular las ventas netas por categoría uniendo tres o cuatro tablas? | ¿Sabes por qué un JOIN puede multiplicar filas y cómo detectarlo? | ¿Sabes cuándo usar alias de tabla y por qué conviene siempre?
---

<!-- estandar:escenario -->
:::escenario Las ventas por categoría
Valentina necesita saber qué categorías venden más:

> "¿Cuánto vendimos por categoría? Celulares, notebooks, audio… Y por país del cliente."

El problema es que esa información está **repartida**: la categoría está en `categorias`, el producto en `productos`, las cantidades en `detalle_pedidos` y el país en `clientes`. Para responder tienes que **unir** tablas. Es el paso que separa a quien "sabe un poco de SQL" de quien lo usa en el trabajo.
:::
## Por qué los datos están repartidos en varias tablas

En la primera lección viste que una base relacional **no repite** información: el pedido no guarda el nombre del cliente, solo su `cliente_id`. Es eficiente y evita inconsistencias, pero tiene una consecuencia: para responder "¿qué compró Martina López?" necesitas datos de **varias** tablas a la vez. Juntarlas es el trabajo de `JOIN`, la operación más importante de SQL después de `SELECT`.

## Claves: cómo se conectan las tablas

| Concepto | Qué es | Ejemplo |
|---|---|---|
| **Clave primaria (PK)** | Columna que identifica **una sola** fila; nunca se repite ni es `NULL` | `clientes.cliente_id` |
| **Clave foránea (FK)** | Columna que guarda la PK **de otra tabla**: una "flecha" hacia ella | `pedidos.cliente_id` → `clientes.cliente_id` |

```text
clientes                       pedidos
┌────────────┬─────────┐       ┌───────────┬────────────┬──────────────┐
│ cliente_id │ nombre  │       │ pedido_id │ cliente_id │ fecha_pedido │
├────────────┼─────────┤       ├───────────┼────────────┼──────────────┤
│ 562        │ Martina │◄──┬───│ 2715      │ 562        │ 2022-11-12   │
│ 563        │ Diego   │   ├───│ 3479      │ 562        │ 2023-01-15   │
└────────────┴─────────┘   └───│ 3575      │ 562        │ 2023-01-26   │
                               └───────────┴────────────┴──────────────┘
```

Martina (cliente 562) aparece **una vez** en `clientes` y su id aparece en **cada uno** de sus pedidos. Eso es una relación **uno a muchos** (1:N).

<!-- dg:sql11-er -->
```diagrama
titulo: Las tablas de Tienda Andina y las claves que las conectan (1 → N: "uno a muchos")
nodo cli: clientes | icono=tabla | col=0 | fila=0 | color=azul | sub=PK cliente_id
nodo ped: pedidos | icono=tabla | col=1 | fila=0 | color=naranja | sub=PK pedido_id · FK cliente_id
nodo pag: pagos | icono=dinero | col=2 | fila=0 | color=verde | sub=FK pedido_id
nodo det: detalle_pedidos | icono=tabla | col=1 | fila=1 | color=naranja | sub=FK pedido_id · FK producto_id
nodo prod: productos | icono=tabla | col=2 | fila=1 | color=violeta | sub=PK producto_id · FK categoria_id
nodo cat: categorias | icono=capas | col=3 | fila=1 | color=gris | sub=PK categoria_id
flecha cli -> ped: 1 → N
flecha ped -> pag: 1 → N
flecha ped -> det: 1 → N
flecha prod -> det: 1 → N
flecha cat -> prod: 1 → N
```

## Tu primer JOIN

```sql
SELECT p.pedido_id, p.fecha_pedido, c.nombre, c.apellido, c.pais
FROM pedidos AS p
JOIN clientes AS c ON c.cliente_id = p.cliente_id
LIMIT 10;
```

| pedido_id | fecha_pedido | nombre | apellido | pais |
|---|---|---|---|---|
| 1 | 2022-01-01 | Paula | Mendoza | Argentina |
| 2 | 2022-01-01 | Santiago | Molina | Costa Rica |
| 3 | 2022-01-01 | Gabriel | Navarro | Argentina |

Léelo por partes:

| Parte | Significa |
|---|---|
| `FROM pedidos AS p` | Empieza por la tabla de pedidos y llámala `p` |
| `JOIN clientes AS c` | Combínala con la tabla de clientes, llamada `c` |
| `ON c.cliente_id = p.cliente_id` | **La regla de emparejamiento**: una fila de pedidos va con la fila de clientes que tenga el mismo `cliente_id` |
| `p.pedido_id`, `c.nombre` | Cada columna lleva delante de qué tabla viene |

### Qué hace el motor (la idea)

Para cada pedido, busca en `clientes` la fila cuyo `cliente_id` coincide, y **pega** ambas filas una al lado de la otra en una fila más ancha. El resultado tiene las columnas de las dos tablas. (Internamente usa algoritmos eficientes como *hash join* o índices, pero el resultado es el mismo que si lo hiciera a mano.)

### Alias de tabla

`AS p` y `AS c` son **alias de tabla**. Sirven para dos cosas:

1. **Escribir menos**: `p.fecha_pedido` en vez de `pedidos.fecha_pedido`.
2. **Evitar ambigüedad**: las dos tablas tienen una columna `cliente_id`. Si escribes solo `cliente_id` en el `SELECT`, el motor responde `ambiguous column name: cliente_id`. Con `p.cliente_id` o `c.cliente_id` queda claro.

El `AS` es opcional (`FROM pedidos p` funciona igual). Usa alias cortos y con sentido: `p` para pedidos, `c` para clientes, `d` para detalle, `pr` para productos.

:::tip Prefija siempre las columnas
Aunque una columna no sea ambigua, escribir `c.nombre` en lugar de `nombre` hace que cualquiera sepa de dónde viene cada dato sin abrir las tablas. Y evita errores el día que alguien agregue una columna `nombre` a otra tabla.
:::

```recorrido
titulo: JOIN paso a paso: cada pedido busca a su cliente
estacion ped: pedidos | icono=tabla
estacion cli: clientes | icono=usuario
estacion match: Emparejar | icono=red
estacion res: Resultado | icono=check
estacion left: LEFT JOIN | icono=lupa
paso ped: La tabla pedidos
Cada pedido guarda el **número** del cliente (`cliente_id`), no su nombre.
>>> tabla
pedido_id,cliente_id,canal
1,528,app
2,970,web
3,631,app
4,1643,tienda
paso cli: La tabla clientes
El nombre y el país están en otra tabla, identificados por el mismo `cliente_id`.
>>> tabla
cliente_id,nombre,pais
528,Paula,Argentina
631,Gabriel,Argentina
970,Santiago,Costa Rica
1643,Sara,Perú
paso match: ON dice cómo emparejar
`ON c.cliente_id = p.cliente_id`: para cada pedido, la base busca en clientes la fila con el **mismo número** y pega sus columnas al lado.
>>> sql
SELECT p.pedido_id, p.canal, c.nombre, c.pais
FROM pedidos p
JOIN clientes c ON c.cliente_id = p.cliente_id;
paso res: Pedidos con el nombre del cliente
Cada pedido ahora tiene el nombre y el país de su cliente. `p` y `c` son apodos (alias) de las tablas para escribir menos.
>>> tabla
pedido_id,canal,nombre,pais
1,app,Paula,Argentina
2,web,Santiago,Costa Rica
3,app,Gabriel,Argentina
4,tienda,Sara,Perú
paso left: ¿Y los clientes sin pedidos?
Un `JOIN` normal (INNER) solo deja las filas **con pareja**. Para conservar a todos los clientes, aunque no tengan pedidos, se usa `LEFT JOIN`: Lucía y Juan aparecen con 0 pedidos.
>>> tabla
cliente_id,nombre,pedidos
1,Lucía,0
2,Juan,0
3,Andrés,4
```

## INNER JOIN: solo las filas con pareja

`JOIN` a secas significa `INNER JOIN`: solo quedan las combinaciones donde la condición `ON` se cumple. Una fila **sin pareja** en la otra tabla **desaparece** del resultado.

:::analogia El baile de parejas
`INNER JOIN` es un baile donde solo entran a la pista quienes encontraron pareja. Un cliente que nunca compró no tiene pedido con quien bailar: no aparece. Un pedido con un `cliente_id` que no existe en `clientes` tampoco.
:::

Comprobación con números: `pedidos` tiene 12.000 filas y todas tienen un cliente válido, así que `pedidos JOIN clientes` devuelve 12.000 filas. Pero de los 2.000 clientes, solo 1.453 compraron: los otros 547 **no aparecen** en el resultado. Si quisieras incluirlos (por ejemplo, para listar "clientes que nunca compraron"), necesitas un `LEFT JOIN`, que es la próxima lección.

## La multiplicación de filas en relaciones uno a muchos

Cuando unes el lado "uno" con el lado "muchos", la fila del "uno" se **repite** por cada pareja:

```sql
SELECT c.nombre, c.apellido, p.pedido_id, p.fecha_pedido, p.estado
FROM clientes c
JOIN pedidos p ON p.cliente_id = c.cliente_id
WHERE c.cliente_id = 562
ORDER BY p.fecha_pedido;
```

| nombre | apellido | pedido_id | fecha_pedido | estado |
|---|---|---|---|---|
| Martina | López | 2715 | 2022-11-12 | devuelto |
| Martina | López | 3479 | 2023-01-15 | entregado |
| Martina | López | 3575 | 2023-01-26 | cancelado |
| … | … | … | … | … |

Martina tiene 16 pedidos, así que aparece **16 veces**. Esto es correcto y esperado, pero tiene consecuencias:

- Después del join, `COUNT(*)` cuenta filas del lado "muchos" (pedidos), no clientes. Para contar clientes: `COUNT(DISTINCT c.cliente_id)`.
- Si sumas una columna del lado "uno" (por ejemplo, un `limite_credito` del cliente) después del join, la sumas **16 veces**. Es el famoso error de **doble conteo**.

:::cuidado El ON equivocado multiplica sin avisar
Si te equivocas de columna en el `ON` (por ejemplo `ON c.categoria_id = p.producto_id`), SQL no da error: empareja números que coinciden por casualidad y devuelve basura con apariencia normal. Después de un join, verifica siempre la cantidad de filas: "¿tiene sentido este número?". Un pedido con 2 líneas debe dar 2 filas al unir con el detalle, no 200.
:::

## Unir varias tablas

Los joins se encadenan: cada `JOIN` agrega una tabla más al resultado acumulado.

```sql
SELECT d.pedido_id, p.fecha_pedido, pr.nombre AS producto, d.cantidad, d.precio_unitario
FROM detalle_pedidos d
JOIN pedidos   p  ON p.pedido_id    = d.pedido_id
JOIN productos pr ON pr.producto_id = d.producto_id
WHERE d.pedido_id = 5;
```

| pedido_id | fecha_pedido | producto | cantidad | precio_unitario |
|---|---|---|---|---|
| 5 | 2022-01-01 | Cafetera Tramontina Sport | 1 | 41.39 |
| 5 | 2022-01-01 | Candado Shimano Ultra 900 | 1 | 73.79 |

Y con agregación, la pregunta "¿cuánto se vendió por país y marca?" necesita cuatro tablas:

```sql
SELECT c.pais,
       pr.marca,
       ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS ventas
FROM detalle_pedidos d
JOIN pedidos   p  ON p.pedido_id    = d.pedido_id
JOIN clientes  c  ON c.cliente_id   = p.cliente_id
JOIN productos pr ON pr.producto_id = d.producto_id
WHERE p.estado <> 'cancelado'
GROUP BY c.pais, pr.marca
ORDER BY ventas DESC
LIMIT 10;
```

El camino es: detalle → (su pedido) → (el cliente de ese pedido) y detalle → (su producto). El país está en `clientes`, la marca en `productos` y el importe en `detalle_pedidos`: sin joins no hay forma de cruzarlos.

:::tip Método para escribir un join de varias tablas
1. **Define el grano**: "una fila por línea de pedido". Empieza el `FROM` por la tabla que tiene ese nivel de detalle (aquí, `detalle_pedidos`).
2. **Dibuja el camino** con las flechas del diagrama de [Tienda Andina](#/datos/tienda): ¿cómo llego desde el detalle hasta el país?
3. **Agrega una tabla por vez** y ejecuta: verifica que la cantidad de filas no cambie de forma inesperada.
4. **Recién al final** agrega `WHERE`, `GROUP BY` y `ORDER BY`.
:::

## USING: atajo cuando la columna se llama igual

Si la columna de unión tiene **el mismo nombre** en las dos tablas, puedes escribir `USING`:

```sql
SELECT pedido_id, nombre, fecha_pedido
FROM pedidos JOIN clientes USING (cliente_id)
LIMIT 5;
```

Con `USING`, la columna `cliente_id` aparece una sola vez en el resultado y ya no es ambigua. Es cómodo, pero `ON` es más explícito y funciona aunque los nombres sean distintos (por ejemplo `empleados.jefe_id = empleados.empleado_id`).

:::nota La sintaxis antigua
Verás código viejo que une tablas con comas y pone la condición en el `WHERE`: `FROM pedidos p, clientes c WHERE c.cliente_id = p.cliente_id`. Funciona, pero si olvidas la condición obtienes **todas las combinaciones** (12.000 × 2.000 = 24 millones de filas). La sintaxis `JOIN … ON` separa la regla de unión de los filtros y es la que se usa hoy.
:::







<!-- estandar:errores -->
:::errores
- **Unir por la columna equivocada**: `ON p.pedido_id = c.cliente_id` no da error, pero mezcla datos que no tienen nada que ver. Une siempre la clave foránea con la clave primaria que le corresponde.
- **Filas multiplicadas**: si unes `pedidos` con `detalle_pedidos` y sumas el total del pedido, lo cuentas una vez por línea. Antes de sumar, pregúntate: ¿cuál es el **grano** de mi resultado (una fila por qué cosa)?
- **Columnas ambiguas**: si dos tablas tienen una columna `nombre`, `SELECT nombre` da error "ambiguous column". Usa alias (`c.nombre`, `pr.nombre`).
- **Perder filas sin darte cuenta**: el `INNER JOIN` descarta los pedidos cuyo cliente no existe en `clientes`. Si el total da menos de lo esperado, compara `COUNT(*)` antes y después del JOIN.
:::

<!-- estandar:trabajo -->
:::trabajo
- Antes de un JOIN importante, los ingenieros revisan las claves: ¿la del lado "uno" es realmente única? (`SELECT id, COUNT(*) ... GROUP BY id HAVING COUNT(*) > 1`). Un duplicado en una tabla de dimensión multiplica silenciosamente todas las ventas.
- En tablas de hechos grandes, unir con dimensiones chicas (productos, países) es barato: los motores distribuidos copian la tabla chica a todas las máquinas (*broadcast join*). Unir dos tablas enormes es lo que hace lentos los pipelines.
- Los modelos de datos analíticos (esquema estrella, en la lección de modelado) están pensados justamente para que los JOIN sean simples: una tabla de hechos en el centro y dimensiones alrededor.
:::

<!-- estandar:entrevista -->
:::entrevista "¿Qué pasa si haces un JOIN y la clave tiene duplicados en las dos tablas?"
Cada fila de un lado se combina con **todas** las filas del otro que tienen la misma clave: si una clave aparece 3 veces a la izquierda y 4 a la derecha, salen 12 filas. Es la causa más común de totales inflados. Se detecta comparando el conteo de filas antes y después, y se soluciona agregando o deduplicando antes de unir.
:::

## Resumen

- Las tablas se conectan con claves: la FK de una apunta a la PK de otra.
- `JOIN tabla ON regla` empareja filas; `JOIN` = `INNER JOIN`: solo quedan las filas con pareja.
- Usa alias de tabla y prefija las columnas para evitar ambigüedades.
- En relaciones 1:N, el lado "uno" se repite: cuidado con `COUNT(*)` y con sumar columnas del lado "uno".
- Une tablas de a una, definiendo primero el grano y verificando la cantidad de filas.

## Ejercicios

:::ejercicio sql
Muestra `pedido_id`, `fecha_pedido`, `nombre` y `apellido` del cliente para los pedidos del **1 de enero de 2024**.
```sql solucion
SELECT p.pedido_id, p.fecha_pedido, c.nombre, c.apellido
FROM pedidos p JOIN clientes c ON c.cliente_id = p.cliente_id
WHERE p.fecha_pedido = '2024-01-01';
```
:::

:::ejercicio sql
Muestra el `nombre` de cada producto junto con el `nombre` de su categoría (alias `categoria`). Columnas: `producto`, `categoria`.
```sql solucion
SELECT p.nombre AS producto, c.nombre AS categoria
FROM productos p JOIN categorias c ON c.categoria_id = p.categoria_id;
```
```pista
Ambas tablas tienen una columna `nombre`: usa alias de tabla y renombra con `AS`.
```
:::

:::ejercicio sql
Para cada **país** de los clientes, calcula la cantidad de pedidos (`pedidos`). Columnas: `pais`, `pedidos`.
```sql solucion
SELECT c.pais, COUNT(*) AS pedidos
FROM pedidos p JOIN clientes c ON c.cliente_id = p.cliente_id
GROUP BY c.pais;
```
:::

:::ejercicio sql
Calcula las **ventas netas** por nombre de **categoría** (alias `categoria`), solo de pedidos con estado `entregado`. Ventas netas = `SUM(cantidad * precio_unitario * (1 - descuento))` redondeado a 2 (alias `ventas`).
```sql solucion
SELECT c.nombre AS categoria,
       ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS ventas
FROM detalle_pedidos d
JOIN pedidos p ON p.pedido_id = d.pedido_id
JOIN productos pr ON pr.producto_id = d.producto_id
JOIN categorias c ON c.categoria_id = pr.categoria_id
WHERE p.estado = 'entregado'
GROUP BY c.nombre;
```
```pista
Necesitas 4 tablas: detalle_pedidos → pedidos (estado), detalle_pedidos → productos → categorias (nombre).
```
:::

:::ejercicio sql
Muestra el `nombre` y `apellido` de cada **vendedor** (empleado) junto con la cantidad de pedidos que atendió (`pedidos`) y el `nombre` de su departamento (alias `departamento`).
```sql solucion
SELECT e.nombre, e.apellido, d.nombre AS departamento, COUNT(*) AS pedidos
FROM pedidos p
JOIN empleados e ON e.empleado_id = p.empleado_id
JOIN departamentos d ON d.departamento_id = e.departamento_id
GROUP BY e.empleado_id, e.nombre, e.apellido, d.nombre;
```
```pista
Agrupa por `e.empleado_id` (y las columnas que muestras): dos empleados pueden llamarse igual.
```
:::

:::ejercicio sql dificultad=Básico
Muestra `nombre` del producto y `nombre` de su categoría (alias `categoria`) para todos los productos.
```sql solucion
SELECT p.nombre, c.nombre AS categoria FROM productos p JOIN categorias c ON c.categoria_id = p.categoria_id;
```
:::

:::ejercicio sql dificultad=Básico
Muestra `pedido_id`, `fecha_pedido` y el `pais` del cliente de cada pedido.
```sql solucion
SELECT p.pedido_id, p.fecha_pedido, c.pais FROM pedidos p JOIN clientes c ON c.cliente_id = p.cliente_id;
```
:::

:::ejercicio sql dificultad=Intermedio
Cuenta los pedidos por **país** del cliente. Columnas: `pais`, `pedidos`.
```pista
Primero el JOIN, después el `GROUP BY` por la columna de la tabla de clientes.
```
```sql solucion
SELECT c.pais, COUNT(*) AS pedidos FROM pedidos p JOIN clientes c ON c.cliente_id = p.cliente_id GROUP BY c.pais;
```
:::

:::ejercicio sql ordenado dificultad=Intermedio
¿Cuántas **unidades** se vendieron de cada **marca**? Columnas: `marca`, `unidades`. Ordena de mayor a menor.
```pista
Las unidades están en `detalle_pedidos` y la marca en `productos`.
```
```sql solucion
SELECT pr.marca, SUM(d.cantidad) AS unidades
FROM detalle_pedidos d
JOIN productos pr ON pr.producto_id = d.producto_id
GROUP BY pr.marca
ORDER BY unidades DESC;
```
:::

:::ejercicio sql ordenado dificultad=Avanzado
Calcula las **ventas** (importe con descuento, 2 decimales) por **categoría** de los pedidos entregados de 2024. Columnas: `categoria`, `ventas`. Ordena de mayor a menor.
```pista
Hacen falta cuatro tablas: pedidos → detalle_pedidos → productos → categorias.
```
```pista
Filtra `estado = 'entregado'` y el rango de fechas de 2024 sobre `pedidos`, y suma `cantidad * precio_unitario * (1 - descuento)`.
```
```sql solucion
SELECT c.nombre AS categoria, ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS ventas
FROM pedidos p
JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
JOIN productos pr ON pr.producto_id = d.producto_id
JOIN categorias c ON c.categoria_id = pr.categoria_id
WHERE p.estado = 'entregado' AND p.fecha_pedido >= '2024-01-01' AND p.fecha_pedido < '2025-01-01'
GROUP BY c.nombre
ORDER BY ventas DESC;
```
:::
