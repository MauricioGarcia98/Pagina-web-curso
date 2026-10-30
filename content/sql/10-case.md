---
titulo: CASE WHEN: lógica condicional
nivel: Intermedio
duracion: 35
resumen: Clasificar valores, crear categorías y hacer "conteos condicionales".
objetivos: Clasificar filas en categorías con `CASE WHEN … THEN … ELSE … END` | Ordenar las condiciones para que cada fila caiga en el grupo correcto | Combinar `CASE` con `GROUP BY` para contar por categoría | Hacer un pivot con agregación condicional (`SUM(CASE WHEN …)`)
prerrequisitos: sql-group-by
autoevaluacion: ¿Puedes clasificar los productos en gamas de precio y contar cuántos hay en cada una? | ¿Sabes qué pasa con una fila que no cumple ninguna condición y no hay `ELSE`? | ¿Sabes por qué el orden de los `WHEN` importa? | ¿Puedes contar, por canal, el total de pedidos y cuántos fueron entregados en la misma consulta? | ¿Puedes convertir los valores de una columna en columnas (pivot)?
---

<!-- estandar:escenario -->
:::escenario Las gamas de precio
Valentina quiere reorganizar el catálogo:

> "Quiero clasificar los productos en económico, medio, premium y lujo según el precio, y saber cuántos hay de cada uno. Y una tabla por canal con el total de pedidos, los entregados y los cancelados, todo en una fila por canal."

Ninguna columna de la tabla dice "premium". Tienes que **crear la categoría** con una regla. Para eso está `CASE`: el "si… entonces…" de SQL.
:::
## Decisiones dentro de una consulta

Muchas preguntas de negocio necesitan **clasificar**: "¿este producto es barato, medio o caro?", "¿este cliente es nuevo o recurrente?", "¿este pedido llegó a tiempo o tarde?". Los datos no traen esas etiquetas: las crea tu consulta con reglas. En SQL, la herramienta para decir **"si pasa esto, entonces aquello; si no, lo otro"** es `CASE`.

:::analogia El semáforo de notas de un colegio
Una maestra clasifica: "si la nota es 9 o más, *excelente*; si es 7 o más, *aprobado*; si es 4 o más, *recupera*; si no, *desaprobado*". Revisa las reglas **en orden** y se queda con la **primera** que se cumple: un 9 también es "7 o más", pero ya quedó como *excelente*. `CASE` funciona exactamente así.
:::

## La forma general: CASE WHEN

```sql
SELECT nombre, precio,
       CASE
         WHEN precio < 50   THEN 'económico'
         WHEN precio < 300  THEN 'medio'
         WHEN precio < 1000 THEN 'premium'
         ELSE 'lujo'
       END AS gama
FROM productos
LIMIT 5;
```

| nombre | precio | gama |
|---|---|---|
| Smartphone Apple Mini 300 | 484.99 | premium |
| Notebook Apple X | 1044.99 | lujo |
| Juego de ollas Philips Plus 400 | 42.99 | económico |

Anatomía:

| Parte | Significa |
|---|---|
| `CASE` | Empieza la decisión |
| `WHEN condición THEN valor` | "Si se cumple la condición, el resultado es este valor". Puede haber muchas |
| `ELSE valor` | "Si no se cumplió ninguna, este". Es opcional |
| `END` | Termina la decisión (¡no lo olvides!) |
| `AS gama` | El alias de la nueva columna |

Tres reglas que hay que tener claras:

1. **Gana la primera condición verdadera**, de arriba hacia abajo. Por eso `WHEN precio < 300` no necesita decir `precio >= 50`: si el precio fuera menor a 50, ya lo habría atrapado la línea anterior. El orden de las líneas **cambia el resultado**: si pusieras primero `precio < 1000`, casi todo sería "premium".
2. **Sin `ELSE`, lo que no coincide es `NULL`.** Escribe siempre un `ELSE`, aunque sea `ELSE 'otro'`: así ves los casos que no previste en vez de que desaparezcan.
3. **Todos los resultados deben ser del mismo tipo** (todos texto o todos números). Mezclar `THEN 'alto'` con `THEN 0` falla en motores estrictos.

:::cuidado Los NULL en las condiciones
Si `precio` fuera `NULL`, todas las comparaciones darían UNKNOWN (lección de NULL) y caería en el `ELSE`: un producto sin precio quedaría como "lujo". Si los nulos son posibles, trátalos primero: `WHEN precio IS NULL THEN 'sin precio'`.
:::

```recorrido
titulo: CASE paso a paso: clasificar productos por precio
estacion tabla: La tabla | icono=tabla
estacion regla: Las reglas | icono=reglas
estacion res: Resultado | icono=check
paso tabla: Seis productos
Queremos una etiqueta de precio para cada producto: barato, medio o caro.
>>> tabla
nombre,precio
Smartphone Apple Mini 300,484.99
Parlante Xiaomi Sport 900,425.99
Notebook Apple X,1044.99
Teclado Kingston Ultra 200,458.99
Juego de ollas Philips Plus 400,42.99
Mesa Muebles Sur Mini 500,40.99
paso regla: CASE prueba las condiciones en orden
Para cada fila, CASE revisa los `WHEN` **de arriba hacia abajo** y usa el primero que se cumple. Si ninguno se cumple, usa el `ELSE`.
>>> sql
SELECT nombre, precio,
       CASE
         WHEN precio < 100 THEN 'barato'
         WHEN precio < 500 THEN 'medio'
         ELSE 'caro'
       END AS rango
FROM productos;
paso res: Una columna nueva con la etiqueta
Un producto de 458,99 cumple `precio < 500`, así que es "medio"; nunca llega a evaluar el `ELSE`. El orden de los WHEN importa.
>>> tabla
nombre,precio,rango
Smartphone Apple Mini 300,484.99,medio
Parlante Xiaomi Sport 900,425.99,medio
Notebook Apple X,1044.99,caro
Teclado Kingston Ultra 200,458.99,medio
Juego de ollas Philips Plus 400,42.99,barato
Mesa Muebles Sur Mini 500,40.99,barato
```

## La forma corta: comparar un valor contra opciones

Cuando todas las condiciones son "esta columna es igual a…", hay una sintaxis abreviada:

```sql
SELECT pedido_id, canal,
       CASE canal
         WHEN 'web' THEN 'Online'
         WHEN 'app' THEN 'Online'
         ELSE 'Presencial'
       END AS tipo_canal
FROM pedidos
LIMIT 5;
```

Equivale a `CASE WHEN canal = 'web' THEN … WHEN canal = 'app' THEN …`. Solo sirve para igualdades; para rangos (`<`, `>`) o condiciones combinadas usa la forma general.

## Usar la clasificación: CASE + GROUP BY

Una vez que creas la categoría, puedes agrupar por ella. "¿Cuántos productos hay en cada gama?":

```sql
SELECT CASE
         WHEN precio < 50   THEN 'económico'
         WHEN precio < 300  THEN 'medio'
         WHEN precio < 1000 THEN 'premium'
         ELSE 'lujo'
       END AS gama,
       COUNT(*) AS productos
FROM productos
GROUP BY gama;
```

| gama | productos |
|---|---|
| económico | 56 |
| lujo | 32 |
| medio | 128 |
| premium | 84 |

Esto se llama **segmentar** o **"bucketizar"**: convertir un número continuo en tramos. Lo usarás para rangos de edad, tramos de mora, bandas de score crediticio, rangos de anticipación de una reserva…

## CASE + agregación: la agregación condicional

Este es el uso más poderoso de `CASE`. Si lo pones **dentro** de `SUM` o `COUNT`, puedes contar o sumar **solo** lo que cumple una condición, varias veces en la misma consulta:

```sql
SELECT strftime('%Y', fecha_pedido) AS anio,
       COUNT(*) AS total,
       SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END) AS cancelados,
       ROUND(100.0 * SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END) / COUNT(*), 2) AS pct_cancelados
FROM pedidos
GROUP BY anio
ORDER BY anio;
```

| anio | total | cancelados | pct_cancelados |
|---|---|---|---|
| 2022 | 3346 | 264 | 7.89 |
| 2023 | 4021 | 332 | 8.26 |
| 2024 | 4633 | 371 | 8.01 |

Cómo funciona, fila por fila: cada pedido aporta un `1` a la suma si fue cancelado y un `0` si no. La suma de esos unos **es** la cantidad de cancelados. Para sumar montos en vez de contar, devuelve el monto en lugar del 1: `SUM(CASE WHEN canal = 'web' THEN total ELSE 0 END)`.

### Pivotar: de filas a columnas

Con varias agregaciones condicionales conviertes valores de una columna en **columnas** del resultado (un *pivot*, como las tablas dinámicas de Excel):

```sql
SELECT c.segmento,
       SUM(CASE WHEN p.canal = 'web'      THEN 1 ELSE 0 END) AS web,
       SUM(CASE WHEN p.canal = 'app'      THEN 1 ELSE 0 END) AS app,
       SUM(CASE WHEN p.canal = 'tienda'   THEN 1 ELSE 0 END) AS tienda,
       SUM(CASE WHEN p.canal = 'telefono' THEN 1 ELSE 0 END) AS telefono
FROM pedidos p
JOIN clientes c ON c.cliente_id = p.cliente_id
GROUP BY c.segmento;
```

| segmento | web | app | tienda | telefono |
|---|---|---|---|---|
| Consumidor | 3786 | 2010 | 1854 | 696 |
| Corporativo | 481 | 310 | 246 | 100 |
| Pyme | 1133 | 653 | 545 | 186 |

(Esa consulta usa un `JOIN`, que es justamente la próxima lección.)

:::nota Sintaxis alternativas
- `COUNT(*) FILTER (WHERE estado = 'cancelado')`: más limpia; funciona en PostgreSQL, SQLite 3.30+ y Spark.
- `COUNTIF(estado = 'cancelado')`: en BigQuery.
- `IIF(condición, sí, no)`: atajo de SQL Server (y SQLite 3.32+) para un `CASE` de dos ramas.
- En SQLite y MySQL, una comparación ya vale 1 o 0, así que `SUM(estado = 'cancelado')` también funciona. Es práctico pero no portable: `CASE` funciona en todos los motores.
:::

`CASE` funciona igual en todos los motores, pero varios tienen atajos para la agregación condicional:

```motores
titulo: Pedidos cancelados por canal
[sqlite]
SELECT canal,
       COUNT(*) AS pedidos,
       SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END) AS cancelados
FROM pedidos
GROUP BY canal
ORDER BY canal;
[postgres]
-- FILTER es estándar SQL y muy legible
SELECT canal,
       COUNT(*) AS pedidos,
       COUNT(*) FILTER (WHERE estado = 'cancelado') AS cancelados
FROM pedidos
GROUP BY canal
ORDER BY canal;
[mysql]
-- en MySQL una comparación vale 1 o 0, así que se suma directo
SELECT canal,
       COUNT(*) AS pedidos,
       SUM(estado = 'cancelado') AS cancelados
FROM pedidos
GROUP BY canal
ORDER BY canal;
[sqlserver]
SELECT canal,
       COUNT(*) AS pedidos,
       SUM(IIF(estado = 'cancelado', 1, 0)) AS cancelados
FROM pedidos
GROUP BY canal
ORDER BY canal;
[bigquery]
SELECT canal,
       COUNT(*) AS pedidos,
       COUNTIF(estado = 'cancelado') AS cancelados
FROM tienda.pedidos
GROUP BY canal
ORDER BY canal;
```

## CASE en otros lugares

`CASE` es una expresión: va donde iría un valor.

```sql
-- En ORDER BY: un orden personalizado (primero los pendientes, después el resto)
SELECT pedido_id, estado
FROM pedidos
ORDER BY CASE estado WHEN 'pendiente' THEN 1 WHEN 'enviado' THEN 2 ELSE 3 END, pedido_id
LIMIT 10;
```

También dentro de `WHERE` (aunque casi siempre se puede escribir más simple con `AND`/`OR`) y dentro de otras funciones (`ROUND(CASE … END, 2)`).







<!-- estandar:errores -->
:::errores
- **Condiciones en el orden equivocado**: `CASE WHEN precio < 300 THEN 'medio' WHEN precio < 50 THEN 'económico' ...` nunca devuelve `'económico'`, porque un precio de 20 ya cumplió la primera condición. Escribe las condiciones de la más restrictiva a la más general.
- **Olvidar el `ELSE`**: las filas que no cumplen ninguna condición quedan en `NULL`. Pon un `ELSE 'sin clasificar'` para verlas.
- **NULL en la condición**: `WHEN telefono <> '' THEN ...` no se cumple cuando `telefono` es NULL. Trata el nulo primero: `WHEN telefono IS NULL THEN ...`.
- **Tipos mezclados en los THEN**: un `THEN 1` y otro `THEN 'alto'` dan un resultado de tipo confuso o error según el motor. Todas las ramas deben devolver el mismo tipo.
:::

<!-- estandar:trabajo -->
:::trabajo
- Las reglas de clasificación (gamas de precio, tramos de edad, segmentos de clientes) son reglas de negocio: cambian. En vez de repetir el `CASE` en diez consultas, se guardan en **una** tabla de referencia (un *seed* en dbt) o en un solo modelo.
- La agregación condicional (`SUM(CASE WHEN estado = 'entregado' THEN 1 ELSE 0 END)`) es una de las técnicas más usadas en reportes, porque calcula varias métricas **en una sola pasada** sobre la tabla. En PostgreSQL y otros motores existe el atajo `COUNT(*) FILTER (WHERE ...)`.
:::

<!-- estandar:entrevista -->
:::entrevista "Calcula la tasa de cancelación por canal en una sola consulta"
`SELECT canal, ROUND(100.0 * SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END) / COUNT(*), 2) AS tasa_cancelacion FROM pedidos GROUP BY canal;` Explica el `100.0` (evita la división entera) y que el `CASE` dentro del `SUM` cuenta solo las filas que cumplen la condición.
:::

## Resumen

- `CASE WHEN cond THEN valor … ELSE valor END`: gana la primera condición verdadera; el orden importa.
- Pon siempre `ELSE` y trata los `NULL` explícitamente.
- `CASE` + `GROUP BY` crea segmentos; `SUM(CASE WHEN … THEN 1 ELSE 0 END)` cuenta con condición.
- Varias agregaciones condicionales = un pivot (valores de una columna convertidos en columnas).

## Ejercicios

:::ejercicio sql
Muestra `cliente_id`, `nombre` y una columna `grupo_edad` según `fecha_nacimiento`: `'joven'` si nació en 1995 o después, `'adulto'` si nació entre 1970 y 1994, y `'senior'` si nació antes de 1970.
```sql solucion
SELECT cliente_id, nombre,
       CASE
         WHEN fecha_nacimiento >= '1995-01-01' THEN 'joven'
         WHEN fecha_nacimiento >= '1970-01-01' THEN 'adulto'
         ELSE 'senior'
       END AS grupo_edad
FROM clientes;
```
```pista
Como las fechas son texto ISO, puedes compararlas directamente: `fecha_nacimiento >= '1995-01-01'`.
```
:::

:::ejercicio sql
Cuenta cuántos productos hay en cada gama de precio: `'económico'` (< 50), `'medio'` (< 300), `'premium'` (< 1000) y `'lujo'` (el resto). Columnas: `gama`, `productos`.
```sql solucion
SELECT CASE
         WHEN precio < 50 THEN 'económico'
         WHEN precio < 300 THEN 'medio'
         WHEN precio < 1000 THEN 'premium'
         ELSE 'lujo'
       END AS gama,
       COUNT(*) AS productos
FROM productos
GROUP BY gama;
```
:::

:::ejercicio sql
Para cada `canal`, muestra el total de pedidos (`total`), cuántos fueron `entregado` (`entregados`) y cuántos `devuelto` (`devueltos`), usando agregación condicional.
```sql solucion
SELECT canal,
       COUNT(*) AS total,
       SUM(CASE WHEN estado = 'entregado' THEN 1 ELSE 0 END) AS entregados,
       SUM(CASE WHEN estado = 'devuelto' THEN 1 ELSE 0 END) AS devueltos
FROM pedidos
GROUP BY canal;
```
:::

:::ejercicio sql
Haz un **pivot**: una fila por `pais` de clientes con tres columnas que cuenten cuántos clientes hay de cada segmento: `consumidor`, `pyme`, `corporativo`.
```sql solucion
SELECT pais,
       SUM(CASE WHEN segmento = 'Consumidor' THEN 1 ELSE 0 END) AS consumidor,
       SUM(CASE WHEN segmento = 'Pyme' THEN 1 ELSE 0 END) AS pyme,
       SUM(CASE WHEN segmento = 'Corporativo' THEN 1 ELSE 0 END) AS corporativo
FROM clientes
GROUP BY pais;
```
:::

:::ejercicio sql dificultad=Básico
Muestra `nombre`, `stock` y una columna `disponibilidad` que diga `agotado` si el stock es 0, `pocas unidades` si es menor a 10 y `disponible` en otro caso.
```sql solucion
SELECT nombre, stock,
       CASE WHEN stock = 0 THEN 'agotado'
            WHEN stock < 10 THEN 'pocas unidades'
            ELSE 'disponible' END AS disponibilidad
FROM productos;
```
:::

:::ejercicio sql dificultad=Básico
Muestra `pedido_id` y una columna `tipo_canal` que diga `online` para los canales `app` y `web`, y `offline` para el resto.
```sql solucion
SELECT pedido_id, CASE WHEN canal IN ('app', 'web') THEN 'online' ELSE 'offline' END AS tipo_canal FROM pedidos;
```
:::

:::ejercicio sql dificultad=Intermedio
Cuenta los productos por rango de precio: `económico` (menos de 100), `medio` (de 100 a menos de 500) y `premium` (500 o más). Columnas: `rango`, `productos`.
```pista
Agrupa por la misma expresión `CASE` (o por su alias).
```
```sql solucion
SELECT CASE WHEN precio < 100 THEN 'económico'
            WHEN precio < 500 THEN 'medio'
            ELSE 'premium' END AS rango,
       COUNT(*) AS productos
FROM productos
GROUP BY rango;
```
:::

:::ejercicio sql dificultad=Intermedio
En una sola fila, cuenta los pedidos `entregado` (`entregados`), `cancelado` (`cancelados`) y `devuelto` (`devueltos`).
```pista
Agregación condicional: `SUM(CASE WHEN estado = '…' THEN 1 ELSE 0 END)`.
```
```sql solucion
SELECT SUM(CASE WHEN estado = 'entregado' THEN 1 ELSE 0 END) AS entregados,
       SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END) AS cancelados,
       SUM(CASE WHEN estado = 'devuelto' THEN 1 ELSE 0 END) AS devueltos
FROM pedidos;
```
:::

:::ejercicio sql dificultad=Avanzado
Para cada `canal`, calcula el **porcentaje de pedidos devueltos** sobre los pedidos entregados o devueltos (es decir, los que llegaron al cliente). Redondea a 2 decimales. Columnas: `canal`, `pct_devueltos`.
```pista
El denominador no es el total: solo los pedidos con estado `entregado` o `devuelto`.
```
```pista
Filtra esos dos estados en el `WHERE` y usa `100.0 * SUM(CASE WHEN estado = 'devuelto' THEN 1 ELSE 0 END) / COUNT(*)`.
```
```sql solucion
SELECT canal, ROUND(100.0 * SUM(CASE WHEN estado = 'devuelto' THEN 1 ELSE 0 END) / COUNT(*), 2) AS pct_devueltos
FROM pedidos
WHERE estado IN ('entregado', 'devuelto')
GROUP BY canal;
```
:::

:::ejercicio sql ordenado dificultad=Avanzado
Ordena los pedidos de forma personalizada: primero los `pendiente`, después `enviado`, `entregado`, `devuelto` y al final `cancelado`; dentro de cada estado, por `pedido_id`. Muestra `pedido_id` y `estado` de las **primeras 10** filas.
```pista
Un `CASE` en el `ORDER BY` que convierta cada estado en un número.
```
```sql solucion
SELECT pedido_id, estado
FROM pedidos
ORDER BY CASE estado WHEN 'pendiente' THEN 1 WHEN 'enviado' THEN 2 WHEN 'entregado' THEN 3 WHEN 'devuelto' THEN 4 ELSE 5 END, pedido_id
LIMIT 10;
```
:::
