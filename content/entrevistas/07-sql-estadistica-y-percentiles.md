---
titulo: SQL de entrevista 6 - medianas, percentiles, moda e histogramas sin funciones mágicas
nivel: Experto
duracion: 65
resumen: Las preguntas de "estadística con SQL" que aparecen en entrevistas de analista y de ingeniería - la mediana por grupo cuando el motor no tiene MEDIAN, el percentil 90 de un tiempo de entrega, el valor más frecuente con empates, la distribución de "cuántos clientes hicieron 0, 1, 2… pedidos" y el promedio de los últimos N registros de cada uno. Aprendes a calcularlas con ROW_NUMBER, COUNT() OVER y agregación condicional, y a explicar por qué el promedio engaña.
objetivos: Calcular la mediana por grupo con ROW_NUMBER y COUNT() OVER, para cantidades pares e impares | Obtener percentiles con el método del rango más cercano | Encontrar la moda de cada grupo conservando los empates | Armar un histograma de frecuencias que incluya los ceros | Promediar los últimos N registros de cada entidad
prerrequisitos: entrevistas-sql-top-n-y-empates | sql-ventanas-2 | analisis-kpis-sin-trampas
autoevaluacion: ¿Por qué la mediana del pedido puede ser mucho menor que el promedio? | ¿Qué filas promedias para la mediana cuando la cantidad es par? | ¿Cómo haces para que un histograma muestre a los clientes con cero pedidos? | ¿Qué devuelve RANK cuando dos valores empatan como los más frecuentes?
---

:::analogia En palabras simples
Si en un ascensor viajan nueve personas que ganan un sueldo normal y sube alguien que gana cien veces más, el **promedio** del ascensor se dispara, pero la **mediana** (la persona del medio si los pones en fila) casi no se mueve. Por eso, cuando un dato tiene valores muy grandes y escasos (importes de pedidos, tiempos de espera, sueldos), las entrevistas preguntan por la mediana y los percentiles: describen mejor a la persona típica.
:::

## Primero, por qué importa: el promedio engaña

```sql
WITH importe AS (
  SELECT p.pedido_id, p.canal,
         SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)) AS importe
  FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  WHERE p.estado = 'entregado'
  GROUP BY p.pedido_id, p.canal
)
SELECT canal, COUNT(*) AS pedidos, ROUND(AVG(importe), 2) AS promedio, ROUND(MAX(importe), 2) AS maximo
FROM importe
GROUP BY canal;
```

Unos pocos pedidos muy grandes empujan el promedio hacia arriba. En los ejercicios vas a ver que la mediana de cada canal es bastante menor: el pedido "típico" es más chico de lo que dice el promedio. Si un tablero muestra solo el promedio, quien lo lee saca conclusiones equivocadas.

## La mediana por grupo con ROW_NUMBER

Muchos motores tienen `MEDIAN` o `PERCENTILE_CONT` (PostgreSQL, Snowflake, BigQuery, DuckDB), pero SQLite no, y en las entrevistas suelen pedir que la calcules "a mano" para ver si entiendes las funciones de ventana. La receta:

```diagrama
titulo: La mediana: numerar, contar y quedarse con el medio
nodo a: Ordenar cada grupo | icono=list | col=0 | fila=0 | color=azul | sub=ROW_NUMBER() OVER (PARTITION BY … ORDER BY valor)
nodo b: Contar cada grupo | icono=calculator | col=1 | fila=0 | color=violeta | sub=COUNT(*) OVER (PARTITION BY …)
nodo c: Filas del medio | icono=filter | col=2 | fila=0 | color=naranja | sub=rn IN ((n+1)/2, (n+2)/2)
nodo d: Promediarlas | icono=target | col=3 | fila=0 | color=verde | sub=AVG(valor)
flecha a -> b | explica=Cada fila recibe su posición dentro del grupo, de menor a mayor.
flecha b -> c | explica=Con la cantidad de filas de cada grupo se sabe cuál es la del medio. Las dos expresiones usan división entera.
flecha c -> d | explica=Si n es impar, las dos expresiones dan la misma fila. Si es par, dan las dos del medio, y su promedio es la mediana.
```

| n | (n + 1) / 2 | (n + 2) / 2 | Filas que se promedian |
|---|---|---|---|
| 5 | 3 | 3 | la 3 |
| 6 | 3 | 4 | la 3 y la 4 |

La división es **entera** porque `n` es entero: `7 / 2` da `3`. En motores donde `/` entre enteros da decimales (como DuckDB), se escribe `(n + 1) // 2` o se usa `FLOOR`. En el curso la consulta se adapta sola al motor.

```sql
WITH v AS (SELECT departamento_id, salario FROM empleados WHERE fecha_salida IS NULL),
ordenado AS (
  SELECT departamento_id, salario,
         ROW_NUMBER() OVER (PARTITION BY departamento_id ORDER BY salario) AS rn,
         COUNT(*)     OVER (PARTITION BY departamento_id)                 AS n
  FROM v
)
SELECT departamento_id, AVG(salario) AS mediana
FROM ordenado
WHERE rn IN ((n + 1) / 2, (n + 2) / 2)
GROUP BY departamento_id;
```

## Percentiles: el método del rango más cercano

"El percentil 90 del tiempo de entrega" es el valor por debajo del cual queda el 90 % de los pedidos. Con la misma numeración, es **el primer valor cuya posición alcanza el 90 % de n**:

```sql norun
-- p90 de un grupo: el menor valor con rn >= 0.9 * n
MIN(CASE WHEN rn >= 0.9 * n THEN minutos END)
```

Con agregación condicional puedes sacar varios percentiles en una sola pasada (p50, p90, p99). Ese método se llama **rango más cercano** y devuelve siempre un valor que existe en los datos. `PERCENTILE_CONT` en cambio **interpola** entre dos valores, por eso los resultados pueden diferir un poco. En una entrevista, decir cuál usas y por qué es parte de la respuesta.

:::experto Por qué los equipos miran el p90 y no el promedio
Los acuerdos de servicio (SLA) se escriben con percentiles: "el 90 % de las entregas en menos de 55 minutos". El promedio puede mejorar mientras los clientes que más esperan esperan cada vez más. El p90 y el p99 miden justamente a esos clientes.
:::

## La moda: el valor más frecuente, con empates

"¿Cuál es el método de pago más usado en cada país?" Es un top-1 por grupo sobre un conteo. Usa `RANK` y no `ROW_NUMBER`: si dos métodos empatan, los dos son la moda.

```sql
WITH conteo AS (
  SELECT c.pais, p.metodo_pago, COUNT(*) AS pedidos
  FROM pedidos p JOIN clientes c ON c.cliente_id = p.cliente_id
  GROUP BY c.pais, p.metodo_pago
),
r AS (SELECT *, RANK() OVER (PARTITION BY pais ORDER BY pedidos DESC) AS pos FROM conteo)
SELECT pais, metodo_pago, pedidos FROM r WHERE pos = 1;
```

## El histograma de frecuencias: no te olvides de los ceros

"¿Cuántos clientes hicieron 0, 1, 2, 3… pedidos en 2024?" Tiene dos niveles de agregación: primero **pedidos por cliente**, después **clientes por cantidad de pedidos**. La trampa son los ceros: un cliente sin pedidos no aparece en `pedidos`, así que hay que partir de `clientes` con `LEFT JOIN`, y el filtro de fechas va en el `ON`, no en el `WHERE` (en el `WHERE` convertiría el `LEFT JOIN` en un `JOIN` común).

```sql
WITH por_cliente AS (
  SELECT c.cliente_id, COUNT(p.pedido_id) AS pedidos
  FROM clientes c
  LEFT JOIN pedidos p
    ON p.cliente_id = c.cliente_id
   AND p.fecha_pedido >= '2024-01-01' AND p.fecha_pedido < '2025-01-01'
  GROUP BY c.cliente_id
)
SELECT pedidos, COUNT(*) AS clientes
FROM por_cliente
GROUP BY pedidos
ORDER BY pedidos;
```

`COUNT(p.pedido_id)` cuenta solo los valores no nulos, por eso da 0 para quien no tiene pedidos. `COUNT(*)` contaría la fila del `LEFT JOIN` y daría 1: es el error más común de esta pregunta.

## Los últimos N de cada uno

"El promedio de los tres últimos pedidos de cada cliente" combina un top-N por grupo con una agregación. Numera de más nuevo a más viejo, quédate con `rn <= 3` y agrega. Si piden "solo clientes con al menos tres pedidos", eso es un `HAVING COUNT(*) = 3`.

:::errores
- **Mediana con `LIMIT` y `OFFSET`.** Sirve para una tabla entera, no por grupo. Por grupo hace falta `PARTITION BY`.
- **Promediar solo una fila cuando n es par.** La mediana de 4 valores es el promedio del 2.º y el 3.º.
- **`ROW_NUMBER` para la moda.** Si hay empate, eliges uno al azar y escondes el otro.
- **`COUNT(*)` en el histograma con `LEFT JOIN`.** Los clientes sin pedidos aparecen con 1 en lugar de 0.
- **El filtro de fechas en el `WHERE` del `LEFT JOIN`.** Elimina a los clientes sin pedidos del período, que son justamente los que querías contar.
:::

:::entrevista
**Pregunta:** "El tiempo promedio de entrega bajó de 45 a 42 minutos, pero los reclamos subieron. ¿Cómo puede ser?"

**Respuesta modelo:** "El promedio puede bajar aunque los casos malos empeoren, si al mismo tiempo mejoran muchos casos normales. Miraría la distribución: mediana, p90 y p99 por semana y por ciudad. Si el p99 subió, hay un grupo de clientes que espera mucho más que antes, y son los que reclaman. Después buscaría qué tienen en común esos pedidos: zona, horario, restaurante o repartidor."
:::

:::tip Practica como en una entrevista
El [banco de problemas de SQL](#/sql-problemas?e=1) reúne todos los ejercicios SQL del curso con filtros por nivel, técnica y empresa. Presiona **🎲 Al azar** para resolver uno sin saber de antemano qué técnica pide: así son las entrevistas.
:::

## Ejercicios

:::ejercicio quiz
Un grupo tiene 6 valores ordenados: 10, 20, 30, 40, 50, 900. ¿Cuál es su mediana?
- [ ] 30
- [x] 35, el promedio del 3.º y el 4.º valor
- [ ] 175, el promedio de todos
- [ ] 40
:::

:::ejercicio sql dificultad=Avanzado titulo="La mediana del pedido entregado por canal"
Calcula la **mediana del importe** de los pedidos `entregado` de cada canal. El importe de un pedido es la suma de `cantidad * precio_unitario * (1 - descuento)` de sus líneas. Columnas: `canal`, `mediana` (redondeada a 2 decimales).
```sql solucion
WITH importe AS (
  SELECT p.pedido_id, p.canal,
         SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)) AS importe
  FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  WHERE p.estado = 'entregado'
  GROUP BY p.pedido_id, p.canal
),
ordenado AS (
  SELECT canal, importe,
         ROW_NUMBER() OVER (PARTITION BY canal ORDER BY importe) AS rn,
         COUNT(*)     OVER (PARTITION BY canal)                 AS n
  FROM importe
)
SELECT canal, ROUND(AVG(importe), 2) AS mediana
FROM ordenado
WHERE rn IN ((n + 1) / 2, (n + 2) / 2)
GROUP BY canal;
```
```pista
Primero una CTE con el importe de cada pedido (grano: un pedido). Después numera dentro de cada canal con `ROW_NUMBER()` y cuenta con `COUNT(*) OVER (PARTITION BY canal)`.
```
```pista
Quédate con `rn IN ((n + 1) / 2, (n + 2) / 2)` y promedia: funciona tanto para n par como impar.
```
```explicacion
**Cómo pensarlo.** Hay dos granos: primero un pedido (para tener su importe) y después un canal. Si calculas la mediana directamente sobre las líneas, mides la línea típica, no el pedido típico. Compara el resultado con el promedio por canal: la mediana queda bastante más abajo, porque unos pocos pedidos muy grandes inflan el promedio.
```
:::

:::ejercicio sql dificultad=Experto titulo="p50 y p90 del tiempo de entrega por ciudad"
Para los pedidos `entregado` de `delivery_pedidos`, calcula el tiempo de entrega en minutos (`entregado` menos `creado`) y, para cada ciudad, la cantidad de pedidos, el **p50** y el **p90** con el método del rango más cercano (el menor valor cuya posición es mayor o igual al 50 % o al 90 % de n). Columnas: `ciudad`, `pedidos`, `p50`, `p90` (redondeados a 1 decimal).
```sql solucion
WITH t AS (
  SELECT ciudad, (julianday(entregado) - julianday(creado)) * 24 * 60 AS minutos
  FROM delivery_pedidos
  WHERE estado = 'entregado'
),
o AS (
  SELECT ciudad, minutos,
         ROW_NUMBER() OVER (PARTITION BY ciudad ORDER BY minutos) AS rn,
         COUNT(*)     OVER (PARTITION BY ciudad)                 AS n
  FROM t
)
SELECT ciudad, n AS pedidos,
       ROUND(MIN(CASE WHEN rn >= 0.5 * n THEN minutos END), 1) AS p50,
       ROUND(MIN(CASE WHEN rn >= 0.9 * n THEN minutos END), 1) AS p90
FROM o
GROUP BY ciudad, n;
```
```pista
Los minutos salen de `(julianday(entregado) - julianday(creado)) * 24 * 60`.
```
```pista
Con `rn` y `n` por ciudad, el p90 es `MIN(CASE WHEN rn >= 0.9 * n THEN minutos END)`. Lo mismo con 0.5 para el p50.
```
```explicacion
**Cómo pensarlo.** `julianday` devuelve días con decimales, así que se multiplica por 24 × 60 para tener minutos. La agregación condicional permite sacar varios percentiles en una sola lectura de la tabla. El p90 dice "el 90 % de los pedidos llega en menos de este tiempo": es el número que se usa para prometer tiempos al cliente y para escribir un SLA, porque mide la experiencia de los que más esperan.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="La categoría más vendida de cada país, con empates"
Para cada país de los clientes, encuentra la **categoría** (`categorias.nombre`) con más **unidades** vendidas (suma de `cantidad` en `detalle_pedidos`), considerando todos los pedidos. Si hay empate, muestra todas las empatadas. Columnas: `pais`, `categoria`, `unidades`.
```sql solucion
WITH u AS (
  SELECT c.pais, cat.nombre AS categoria, SUM(d.cantidad) AS unidades
  FROM detalle_pedidos d
  JOIN pedidos p     ON p.pedido_id = d.pedido_id
  JOIN clientes c    ON c.cliente_id = p.cliente_id
  JOIN productos pr  ON pr.producto_id = d.producto_id
  JOIN categorias cat ON cat.categoria_id = pr.categoria_id
  GROUP BY c.pais, cat.nombre
),
r AS (SELECT *, RANK() OVER (PARTITION BY pais ORDER BY unidades DESC) AS pos FROM u)
SELECT pais, categoria, unidades FROM r WHERE pos = 1;
```
```pista
La cadena de uniones es detalle → pedidos → clientes (para el país) y detalle → productos → categorías (para el nombre).
```
```pista
Con las unidades por país y categoría, `RANK() OVER (PARTITION BY pais ORDER BY unidades DESC)` y quédate con `pos = 1`.
```
```explicacion
**Cómo pensarlo.** La moda es un top-1 por grupo sobre un conteo o una suma. `RANK` conserva los empates: si dos categorías venden lo mismo en un país, las dos son "la más vendida". Con `ROW_NUMBER` el motor elegiría una sin avisarte, y otro día podría elegir la otra.
```
:::

:::ejercicio sql dificultad=Experto titulo="Histograma: cuántos clientes hicieron 0, 1, 2… pedidos en 2024"
Arma la distribución de **pedidos por cliente en 2024**: cuántos clientes hicieron 0 pedidos, cuántos 1, cuántos 2, etc. Los que hicieron 10 o más van juntos en el grupo `'10 o más'`. Incluye a los clientes sin pedidos en 2024. Columnas: `pedidos_en_2024` (texto: `'0'`, `'1'`, … `'10 o más'`), `clientes`.
```sql solucion
WITH por_cliente AS (
  SELECT c.cliente_id, COUNT(p.pedido_id) AS pedidos
  FROM clientes c
  LEFT JOIN pedidos p
    ON p.cliente_id = c.cliente_id
   AND p.fecha_pedido >= '2024-01-01' AND p.fecha_pedido < '2025-01-01'
  GROUP BY c.cliente_id
)
SELECT CASE WHEN pedidos >= 10 THEN '10 o más' ELSE CAST(pedidos AS TEXT) END AS pedidos_en_2024,
       COUNT(*) AS clientes
FROM por_cliente
GROUP BY 1;
```
```pista
Parte de `clientes` con `LEFT JOIN pedidos` y pon el filtro de fechas en el `ON`. Cuenta con `COUNT(p.pedido_id)`, no con `COUNT(*)`.
```
```pista
En la consulta de afuera agrupa por un `CASE` que convierte 10 o más en `'10 o más'` y el resto en texto con `CAST(pedidos AS TEXT)`.
```
```explicacion
**Cómo pensarlo.** Son dos agregaciones encadenadas: pedidos por cliente y clientes por cantidad de pedidos. El grupo de los ceros es el que más importa al negocio (clientes registrados que no compraron en todo el año) y es el que se pierde con un `JOIN` común, con `COUNT(*)` o con el filtro de fechas en el `WHERE`. Juntar la cola larga en "10 o más" hace que el histograma se pueda leer.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="El promedio de los últimos 3 pedidos de cada cliente"
Para cada cliente con **al menos 3 pedidos**, calcula el promedio del importe de sus **3 pedidos más recientes** (por `fecha_pedido`; si dos pedidos tienen la misma fecha, el de `pedido_id` mayor es el más reciente). Muestra los 10 clientes con el promedio más alto. Columnas: `cliente_id`, `promedio_ultimos_3` (redondeado a 2 decimales). Ordena por el promedio de mayor a menor y, si empatan, por `cliente_id`.
```sql solucion
WITH importe AS (
  SELECT p.cliente_id, p.pedido_id, p.fecha_pedido,
         SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)) AS importe
  FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  GROUP BY p.cliente_id, p.pedido_id, p.fecha_pedido
),
r AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha_pedido DESC, pedido_id DESC) AS rn
  FROM importe
)
SELECT cliente_id, ROUND(AVG(importe), 2) AS promedio_ultimos_3
FROM r
WHERE rn <= 3
GROUP BY cliente_id
HAVING COUNT(*) = 3
ORDER BY promedio_ultimos_3 DESC, cliente_id
LIMIT 10;
```
```pista
Numera los pedidos de cada cliente de más nuevo a más viejo, con `pedido_id DESC` como desempate.
```
```pista
Filtra `rn <= 3`, agrupa por cliente y exige `HAVING COUNT(*) = 3` para dejar afuera a los que tienen menos de tres.
```
```explicacion
**Cómo pensarlo.** "Los últimos N de cada uno" es un top-N por grupo seguido de una agregación. El desempate por `pedido_id` hace que "los tres últimos" sean siempre los mismos aunque haya fechas repetidas. El `HAVING` va después de filtrar `rn <= 3`: si un cliente tiene solo dos pedidos, su grupo tiene dos filas y queda afuera.
```
:::
