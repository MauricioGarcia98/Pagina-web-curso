---
titulo: Funciones de ventana I: rankings
nivel: Avanzado
duracion: 45
resumen: OVER, PARTITION BY, ROW_NUMBER, RANK, DENSE_RANK y el top-N por grupo.
objetivos: Calcular agregaciones sin perder el detalle de cada fila con `OVER (PARTITION BY …)` | Numerar y rankear filas con `ROW_NUMBER`, `RANK` y `DENSE_RANK`, eligiendo según los empates | Resolver el patrón "top N por grupo" | Calcular la participación de cada fila en el total de su grupo
prerrequisitos: sql-group-by | sql-cte
autoevaluacion: ¿Puedes mostrar cada empleado junto al salario promedio de su departamento? | ¿Sabes qué diferencia hay entre `RANK` y `DENSE_RANK` cuando hay empates? | ¿Puedes mostrar el último pedido de cada cliente? | ¿Puedes calcular qué porcentaje de las ventas de su categoría representa cada producto? | ¿Sabes por qué no se puede filtrar una función de ventana en el `WHERE`?
---

<!-- estandar:escenario -->
:::escenario El top 2 por categoría
Valentina prepara la vidriera de la home:

> "Para cada categoría, quiero los 2 productos más caros, para destacarlos. Y para cada cliente, ¿cuál fue su último pedido? Marketing quiere mandar un mail de 'vuelve a comprar'."

Con `GROUP BY` obtienes una fila por categoría, pero pierdes los productos. Necesitas calcular algo **por grupo** sin colapsar las filas. Eso hacen las **funciones de ventana**, la herramienta más pedida en entrevistas de SQL.
:::
## El límite de GROUP BY

Con `GROUP BY` puedes calcular el precio promedio **por categoría**. Pero el resultado tiene **una fila por categoría**: perdiste el detalle de cada producto. ¿Y si quieres ver **cada producto** junto al promedio de su categoría, o su **puesto** dentro de su marca? Necesitas un cálculo de grupo **sin colapsar las filas**. Eso hacen las **funciones de ventana** (*window functions*).

Son, para muchos, la frontera entre un SQL intermedio y uno avanzado, y aparecen en prácticamente **todas** las entrevistas técnicas de datos.

| | `GROUP BY` | Función de ventana |
|---|---|---|
| Filas en el resultado | Una por grupo | **Todas** las originales |
| Puede mostrar columnas de detalle | No | Sí |
| Ejemplo | "promedio por categoría" | "cada producto con el promedio de su categoría" |

:::analogia La ventana del tren
Imagina que cada fila es un pasajero sentado en un vagón (su grupo). Una función de ventana permite que cada pasajero mire **por la ventana a los demás de su mismo vagón**, en cierto orden, y anote algo en su boleto: "en mi vagón soy el 3.º más alto", "el promedio de edad de mi vagón es 34", "la persona sentada antes que yo tiene 20 años". Nadie se baja del tren: todos los pasajeros siguen ahí, cada uno con su anotación.
:::

## La sintaxis

```sql norun
funcion(...) OVER (
    PARTITION BY columnas   -- opcional: los "vagones" (grupos). Sin él, toda la tabla es un solo grupo
    ORDER BY columnas       -- opcional: el orden dentro de cada grupo
    ROWS BETWEEN …          -- opcional: el "marco" de filas (lección siguiente)
)
```

La palabra clave es **`OVER`**: lo que va antes es la función, lo que va adentro de los paréntesis define **la ventana**, es decir, qué filas mira cada fila.

## Agregaciones como ventana

Cualquier agregación (`SUM`, `AVG`, `COUNT`, `MIN`, `MAX`) se convierte en función de ventana si le agregas `OVER`:

```sql
SELECT nombre, categoria_id, precio,
       ROUND(AVG(precio) OVER (PARTITION BY categoria_id), 2)         AS promedio_categoria,
       ROUND(precio - AVG(precio) OVER (PARTITION BY categoria_id), 2) AS diferencia,
       COUNT(*) OVER ()                                                AS total_productos
FROM productos
LIMIT 10;
```

| nombre | categoria_id | precio | promedio_categoria | diferencia | total_productos |
|---|---|---|---|---|---|
| Smartphone Apple Mini 300 | 6 | 484.99 | 665.49 | −180.5 | 300 |
| Teléfono Samsung Ultra | 6 | 1111.99 | 665.49 | 446.5 | 300 |
| Parlante Xiaomi Sport 900 | 7 | 425.99 | 239.1 | 186.89 | 300 |

Cómo leerlo:

- `AVG(precio) OVER (PARTITION BY categoria_id)`: para cada fila, el promedio de **las filas de su misma categoría**. Todas las filas de la categoría 6 muestran el mismo 665,49.
- `COUNT(*) OVER ()`: con paréntesis vacíos, la ventana es **toda la tabla**: 300 en cada fila. Muy útil para porcentajes del total: `100.0 * precio / SUM(precio) OVER ()`.
- Puedes usar el resultado en un cálculo (`precio - AVG(…) OVER (…)`).

Compara con la subconsulta correlacionada de la lección 13: mismo resultado, mucho más claro y, en general, más rápido.

:::cuidado Las ventanas se calculan después del WHERE
Las funciones de ventana se evalúan en el paso del `SELECT`, **después** de `WHERE`, `GROUP BY` y `HAVING`. Por eso:
- Si filtras con `WHERE categoria_id = 6`, `COUNT(*) OVER ()` cuenta solo las filas que quedaron (56), no las 300.
- **No** puedes usar una función de ventana dentro de un `WHERE` (todavía no se calculó). Para filtrar por ella, envuelve la consulta en una CTE (lo verás en el top-N).
:::

## Rankings: ROW_NUMBER, RANK y DENSE_RANK

Con `ORDER BY` dentro del `OVER`, puedes **numerar** las filas de cada grupo. Hay tres funciones, y la diferencia está en cómo tratan los **empates**:

```sql
WITH notas(alumno, puntaje) AS (VALUES ('Ana', 100), ('Beto', 90), ('Carla', 90), ('Dani', 80))
SELECT alumno, puntaje,
       ROW_NUMBER() OVER (ORDER BY puntaje DESC) AS row_number,
       RANK()       OVER (ORDER BY puntaje DESC) AS rank,
       DENSE_RANK() OVER (ORDER BY puntaje DESC) AS dense_rank
FROM notas;
```

| alumno | puntaje | row_number | rank | dense_rank |
|---|---|---|---|---|
| Ana | 100 | 1 | 1 | 1 |
| Beto | 90 | 2 | 2 | 2 |
| Carla | 90 | 3 | 2 | 2 |
| Dani | 80 | 4 | **4** | **3** |

| Función | Con empates | Cuándo usarla |
|---|---|---|
| `ROW_NUMBER()` | Siempre números distintos; el empate se rompe **arbitrariamente** | Elegir **exactamente una** fila por grupo (el último pedido de cada cliente, deduplicar) |
| `RANK()` | Los empatados comparten puesto y se **salta** el siguiente (1, 2, 2, 4) | Rankings "deportivos": si dos empatan en el 2.º puesto, no hay 3.º |
| `DENSE_RANK()` | Comparten puesto **sin saltos** (1, 2, 2, 3) | "El 2.º valor más alto", niveles o categorías consecutivas |

:::tip Desempata siempre con ROW_NUMBER
Si usas `ROW_NUMBER()` y hay empates en la columna de orden, cada ejecución puede elegir una fila distinta (el resultado no es determinista). Agrega una columna de desempate única: `ORDER BY precio DESC, producto_id`.
:::

### Rankings dentro de cada grupo

Con `PARTITION BY`, la numeración **vuelve a empezar en 1** en cada grupo:

```sql
SELECT nombre, marca, precio,
       ROW_NUMBER() OVER (PARTITION BY marca ORDER BY precio DESC) AS puesto_en_marca
FROM productos
WHERE marca IN ('Apple', 'Sony')
ORDER BY marca, precio DESC;
```

Los productos Apple se numeran 1, 2, 3… del más caro al más barato; al llegar a Sony, el contador vuelve a 1.

## El patrón estrella: el top-N por grupo

"Los 3 productos más caros **de cada marca**", "el último pedido **de cada cliente**", "la canción más escuchada **en cada país**": es probablemente el patrón más pedido en entrevistas y en el trabajo real. Como no se puede filtrar una ventana en el `WHERE`, se hace en dos pasos con una CTE:

```sql
WITH ranking AS (                                  -- paso 1: numerar dentro de cada marca
    SELECT nombre, marca, precio,
           ROW_NUMBER() OVER (PARTITION BY marca ORDER BY precio DESC, producto_id) AS rn
    FROM productos
)
SELECT marca, nombre, precio                       -- paso 2: quedarse con los primeros 3
FROM ranking
WHERE rn <= 3
ORDER BY marca, rn;
```

Para "el último pedido de cada cliente" es lo mismo con `PARTITION BY cliente_id ORDER BY fecha_pedido DESC` y `WHERE rn = 1`. Este es el método estándar para **deduplicar**: cuando una tabla tiene varias versiones de un registro, te quedas con la más reciente de cada clave.

:::nota QUALIFY
Databricks/Spark SQL, Snowflake, BigQuery y DuckDB permiten filtrar directamente con `QUALIFY`, sin CTE: `SELECT … FROM productos QUALIFY ROW_NUMBER() OVER (PARTITION BY marca ORDER BY precio DESC) <= 3`. SQLite y PostgreSQL no lo tienen, por eso aquí usamos la CTE (que funciona en todos).
:::

:::entrevista "Encuentra el segundo salario más alto"
Una de las preguntas más clásicas. Con ventanas:

```sql
WITH r AS (SELECT nombre, salario, DENSE_RANK() OVER (ORDER BY salario DESC) AS dr FROM empleados)
SELECT nombre, salario FROM r WHERE dr = 2;
```

¿Por qué `DENSE_RANK` y no `ROW_NUMBER`? Si dos personas empatan en el sueldo más alto, el "segundo salario" es el **siguiente valor distinto**. `ROW_NUMBER` devolvería a una de las empatadas; `RANK` saltaría al 3. Explicar esa diferencia es lo que el entrevistador quiere escuchar.
:::

## NTILE: repartir en grupos iguales

`NTILE(n)` divide las filas ordenadas en `n` grupos de tamaño parecido y devuelve el número de grupo. Sirve para cuartiles, deciles o segmentos ("el 25 % de clientes que más compra"):

```sql
SELECT nombre, precio,
       NTILE(4) OVER (ORDER BY precio) AS cuartil_precio
FROM productos
LIMIT 10;
```



<!-- estandar:errores -->
:::errores
- **Filtrar la ventana en el `WHERE`**: `WHERE ROW_NUMBER() OVER (...) <= 2` da error, porque las ventanas se calculan **después** del `WHERE`. Calcula la ventana en una CTE y filtra afuera.
- **`ROW_NUMBER` con empates**: si dos productos cuestan lo mismo, `ROW_NUMBER` elige uno al azar. Agrega un desempate al `ORDER BY` de la ventana o usa `RANK`/`DENSE_RANK` si quieres incluir a los dos.
- **Olvidar el `PARTITION BY`**: sin él, la ventana es toda la tabla. `ROW_NUMBER() OVER (ORDER BY precio DESC)` numera todos los productos juntos, no dentro de cada categoría.
- **Confundir el `ORDER BY` de la ventana con el de la consulta**: el de la ventana define el ranking; el del final define cómo se muestra el resultado. Son independientes.
:::

<!-- estandar:trabajo -->
:::trabajo
- `ROW_NUMBER() ... = 1` es **el** patrón para deduplicar en los pipelines: "quedarme con la versión más reciente de cada cliente". Lo vas a escribir en SQL, en PySpark y en dbt (en la capa staging).
- En Databricks, BigQuery y Snowflake existe `QUALIFY`, que filtra por una ventana sin necesitar una CTE: `... QUALIFY ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha DESC) = 1`.
- Una ventana con `PARTITION BY` en Spark provoca un *shuffle* por esa columna. Si la columna tiene un valor muy frecuente (por ejemplo, un `cliente_id` nulo), esa partición queda gigante.
:::

## Resumen

- Las funciones de ventana calculan sobre un grupo de filas **sin colapsarlas**: `función OVER (PARTITION BY … ORDER BY …)`.
- `PARTITION BY` define los grupos; sin él, la ventana es toda la tabla (`OVER ()`).
- `ROW_NUMBER` (único), `RANK` (empates con salto), `DENSE_RANK` (empates sin salto), `NTILE` (grupos iguales).
- Se calculan después del `WHERE`: para filtrar por ellas usa una CTE (o `QUALIFY` donde exista).
- Top-N por grupo y deduplicación: `ROW_NUMBER() … AS rn` + `WHERE rn <= N`.

## Ejercicios

:::ejercicio sql
Para cada empleado muestra `nombre`, `departamento_id`, `salario` y el **salario promedio de su departamento** (alias `promedio_depto`, redondeado a 0) usando una función de ventana.
```sql solucion
SELECT nombre, departamento_id, salario,
       ROUND(AVG(salario) OVER (PARTITION BY departamento_id), 0) AS promedio_depto
FROM empleados;
```
:::

:::ejercicio sql ordenado
Muestra los **2 productos más caros de cada categoría**: `categoria_id`, `nombre`, `precio`. Si hay empate de precio, desempata por `nombre` (alfabético). Ordena por `categoria_id` y luego por precio descendente.
```sql solucion
WITH r AS (
  SELECT categoria_id, nombre, precio,
         ROW_NUMBER() OVER (PARTITION BY categoria_id ORDER BY precio DESC, nombre) AS rn
  FROM productos
)
SELECT categoria_id, nombre, precio FROM r WHERE rn <= 2 ORDER BY categoria_id, precio DESC, nombre;
```
:::

:::ejercicio sql
Muestra el **último pedido** de cada cliente: `cliente_id`, `pedido_id`, `fecha_pedido`. Si un cliente tiene dos pedidos el mismo día, quédate con el de mayor `pedido_id`.
```sql solucion
WITH r AS (
  SELECT cliente_id, pedido_id, fecha_pedido,
         ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha_pedido DESC, pedido_id DESC) AS rn
  FROM pedidos
)
SELECT cliente_id, pedido_id, fecha_pedido FROM r WHERE rn = 1;
```
:::

:::ejercicio sql
Encuentra a los empleados con el **segundo salario más alto de cada departamento** (puede haber empates). Columnas: `departamento_id`, `nombre`, `salario`.
```sql solucion
WITH r AS (
  SELECT departamento_id, nombre, salario,
         DENSE_RANK() OVER (PARTITION BY departamento_id ORDER BY salario DESC) AS dr
  FROM empleados
)
SELECT departamento_id, nombre, salario FROM r WHERE dr = 2;
```
:::

:::ejercicio sql
Para cada país, rankea las **ciudades** por cantidad de clientes (de mayor a menor) con `RANK()`. Columnas: `pais`, `ciudad`, `clientes`, `puesto`.
```sql solucion
SELECT pais, ciudad, COUNT(*) AS clientes,
       RANK() OVER (PARTITION BY pais ORDER BY COUNT(*) DESC) AS puesto
FROM clientes
GROUP BY pais, ciudad;
```
```pista
¡Puedes usar una agregación dentro de la ventana! Primero se agrupa y después se aplica la ventana: `RANK() OVER (PARTITION BY pais ORDER BY COUNT(*) DESC)`.
```
:::

:::ejercicio sql
¿Qué porcentaje de la facturación de su **categoría** representa cada producto? Usa las ventas netas de todas las líneas (sin filtrar estados). Columnas: `categoria_id`, `producto_id`, `ventas` (redondeado a 2) y `pct_categoria` (porcentaje redondeado a 2).
```sql solucion
WITH v AS (
  SELECT pr.categoria_id, pr.producto_id, SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)) AS ventas
  FROM detalle_pedidos d JOIN productos pr ON pr.producto_id = d.producto_id
  GROUP BY pr.categoria_id, pr.producto_id
)
SELECT categoria_id, producto_id, ROUND(ventas, 2) AS ventas,
       ROUND(100.0 * ventas / SUM(ventas) OVER (PARTITION BY categoria_id), 2) AS pct_categoria
FROM v;
```
:::
