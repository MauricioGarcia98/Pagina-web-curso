---
titulo: "Tablas anchas (OBT), datos anidados y agregados"
nivel: Avanzado
duracion: 45
resumen: Cuándo conviene juntar todo en una tabla ancha, cómo modelar con estructuras anidadas en plataformas columnares y cómo diseñar tablas agregadas para tableros rápidos.
objetivos: Construir una tabla ancha (One Big Table) a partir de una estrella y explicar sus ventajas y riesgos | Modelar relaciones uno a muchos con estructuras anidadas (STRUCT/ARRAY o JSON) | Diseñar tablas agregadas para tableros y saber cuándo se justifican | Elegir entre estrella, OBT y anidados según el motor y el consumo
prerrequisitos: modelado-kimball | modelado-scd
autoevaluacion: ¿Puedes explicar qué es una OBT y cuándo conviene? | ¿Sabes por qué en un formato columnar una tabla ancha no es tan costosa? | ¿Puedes guardar las líneas de un pedido dentro de la fila del pedido? | ¿Sabes qué riesgo tiene una OBT cuando cambia una dimensión? | ¿Puedes construir una tabla agregada por día y canal?
---

:::escenario El tablero que tarda 40 segundos
El equipo de BI se queja del modelo nuevo:

> "La estrella está muy bien hecha, pero el tablero de ventas une seis tablas en cada filtro y tarda 40 segundos. Los analistas nuevos se pierden con tantos JOINs. ¿No podemos tener una sola tabla con todo?"

La respuesta no es "sí" ni "no": depende del motor, del volumen y de quién consume. Esta lección te da los criterios.
:::

## One Big Table (OBT)

Una **OBT** (tabla ancha) es la tabla de hechos con **todos los atributos de las dimensiones ya unidos**: una sola tabla con 50 o 100 columnas. Se construye **a partir** de la estrella, no en lugar de ella:

```diagrama
titulo: La OBT se genera desde la estrella; la estrella sigue siendo la fuente de verdad
nodo f: fct_ventas | icono=tabla | col=0 | fila=0 | color=naranja
nodo d1: dim_cliente | icono=usuario | col=0 | fila=1 | color=azul
nodo d2: dim_producto | icono=carrito | col=1 | fila=1 | color=azul
nodo d3: dim_fecha | icono=reloj | col=2 | fila=1 | color=azul
nodo obt: obt_ventas | icono=capas | col=2 | fila=0 | color=verde | sub=una fila por venta\ncon todos los atributos
nodo bi: BI / analistas | icono=dashboard | col=3 | fila=0 | color=violeta | sub=sin JOINs
flecha f -> obt: JOIN una vez, en el pipeline
flecha d1 -> obt
flecha d2 -> obt
flecha d3 -> obt
flecha obt -> bi
```

| | Estrella | OBT |
|---|---|---|
| JOINs al consultar | Varios | Ninguno |
| Facilidad para analistas | Media | Alta |
| Espacio | Menor | Mayor (atributos repetidos en cada fila) |
| Cambio en una dimensión | Se actualiza una tabla | Hay que regenerar la OBT completa |
| Consistencia entre procesos | Dimensiones conformadas compartidas | Cada OBT tiene su copia |

¿Por qué en los motores modernos la OBT no es tan cara como parece? Porque son **columnares**: si la consulta usa 4 de las 80 columnas, solo lee esas 4. Y la compresión hace que un atributo repetido millones de veces ("Chile", "Chile", "Chile"…) ocupe casi nada.

:::cuidado La OBT no reemplaza a la estrella
Si construyes OBTs directamente desde las fuentes, sin estrella, cada una calcula "cliente" a su manera y los números dejan de cuadrar entre tableros. La regla: **estrella como fuente de verdad, OBT como vista de consumo** generada por el pipeline.
:::

## Datos anidados: la relación 1:N dentro de la fila

Las plataformas columnares (BigQuery, Databricks, Snowflake, Athena) aceptan columnas con **estructuras**: un `STRUCT` (un objeto con campos) o un `ARRAY` (una lista). Así puedes guardar las líneas de un pedido **dentro** de la fila del pedido, sin tabla aparte:

```sql norun
-- BigQuery: una fila por pedido, con sus líneas adentro
CREATE TABLE gold.pedidos_anidados AS
SELECT
  p.pedido_id, p.fecha_pedido, p.canal,
  STRUCT(c.cliente_id, c.pais, c.segmento) AS cliente,
  ARRAY_AGG(STRUCT(d.producto_id, d.cantidad, d.precio_unitario)) AS lineas
FROM pedidos p
JOIN clientes c USING (cliente_id)
JOIN detalle_pedidos d USING (pedido_id)
GROUP BY 1, 2, 3, 4;

-- Consultar: UNNEST "desarma" el array en filas
SELECT cliente.pais, SUM(l.cantidad * l.precio_unitario) AS ventas
FROM gold.pedidos_anidados, UNNEST(lineas) AS l
GROUP BY cliente.pais;
```

En SQLite no hay `STRUCT`, pero puedes ver la misma idea con JSON (`json_group_array` arma la lista de líneas de cada pedido):

```sql
SELECT
    p.pedido_id,
    p.fecha_pedido,
    json_object('cliente_id', c.cliente_id, 'pais', c.pais) AS cliente,
    json_group_array(json_object('producto_id', d.producto_id, 'cantidad', d.cantidad)) AS lineas
FROM pedidos p
JOIN clientes c ON c.cliente_id = p.cliente_id
JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
WHERE p.pedido_id BETWEEN 1 AND 3
GROUP BY p.pedido_id;
```

| Ventajas de anidar | Desventajas |
|---|---|
| Sin JOIN entre pedido y líneas: se leen juntos | Las consultas con `UNNEST` son menos intuitivas |
| Refleja la forma natural de los datos (como llegan de una API en JSON) | No todas las herramientas de BI lo manejan bien |
| Evita multiplicar filas al unir | Actualizar una línea implica reescribir el pedido |

Es muy usado en BigQuery (donde Google lo recomienda) y para eventos que llegan en JSON con listas adentro.

## Tablas agregadas

Un tablero de ventas diarias no necesita leer 30 millones de líneas cada vez que alguien lo abre. Una **tabla agregada** precalcula el resultado al grano que pide el tablero:

```sql
SELECT
    p.fecha_pedido                                                    AS fecha,
    p.canal,
    COUNT(DISTINCT p.pedido_id)                                       AS pedidos,
    SUM(d.cantidad)                                                   AS unidades,
    ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS importe_neto
FROM pedidos p
JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
WHERE p.estado <> 'cancelado' AND p.fecha_pedido >= '2024-12-29'
GROUP BY p.fecha_pedido, p.canal
ORDER BY fecha, canal;
```

Las reglas para que una tabla agregada no se convierta en un problema:

1. **Se genera desde la tabla de hechos**, nunca desde las fuentes.
2. **Las medidas no aditivas** (como `COUNT(DISTINCT cliente)` o porcentajes) **no se pueden re-agregar**: los clientes distintos por día no se suman para obtener los clientes distintos del mes. Si el tablero necesita varios niveles, guarda los componentes o calcula cada nivel por separado.
3. Se nombra con el grano: `agg_ventas_dia_canal`.

Muchos motores lo hacen solos: las **vistas materializadas** (BigQuery, Databricks, Snowflake) mantienen el agregado actualizado y el motor las usa automáticamente cuando la consulta coincide.

## ¿Cuál elijo?

| Situación | Recomendación |
|---|---|
| Fuente de verdad del modelo analítico | Estrella (con SCD donde importe) |
| Analistas sin experiencia en SQL, herramientas de autoservicio | OBT generada desde la estrella |
| Datos que llegan anidados (eventos, APIs), motor columnar | Anidados (STRUCT/ARRAY) |
| Tablero muy usado sobre millones de filas | Tabla agregada o vista materializada |
| Muchas fuentes, auditoría y cambios frecuentes | Data Vault en el medio + estrella encima |

<!-- estandar:errores -->
:::errores
- **OBT sin estrella detrás**: cada tabla ancha define a su manera las mismas cosas.
- **Re-agregar medidas no aditivas**: sumar "clientes distintos por día" para obtener los del mes.
- **Agregados que nadie actualiza**: un agregado que se calcula a mano una vez y queda viejo.
- **Anidar todo** en un motor o herramienta de BI que no lo maneja bien.
:::

<!-- estandar:trabajo -->
:::trabajo
- En dbt es común tener la capa `marts` con `fct_` y `dim_`, y encima una capa de "reporting" con OBTs y agregados específicos para cada tablero.
- Antes de crear un agregado, mira qué consultas son lentas de verdad (las nubes guardan el historial de consultas). Crear agregados "por si acaso" llena la plataforma de tablas que nadie usa.
:::

<!-- estandar:entrevista -->
:::entrevista "¿Estrella o una gran tabla ancha?"
Depende del motor y del consumidor. En motores columnares una OBT es eficiente (solo se leen las columnas usadas y la repetición se comprime bien) y simplifica el uso; pero no debe reemplazar a la estrella, que mantiene dimensiones conformadas y es la fuente de verdad. Lo habitual es generar la OBT desde la estrella en el pipeline, y regenerarla cuando cambian las dimensiones.
:::

## Ejercicios

:::ejercicio quiz
¿Por qué en BigQuery o Databricks una tabla ancha de 80 columnas no es tan costosa de consultar como en una base por filas?

- [ ] Porque esos motores no cobran
- [x] Porque son columnares: solo leen las columnas que usa la consulta, y los valores repetidos se comprimen muy bien
- [ ] Porque las tablas anchas tienen índices
- [ ] Porque guardan los datos en CSV
:::

:::ejercicio quiz
Tienes `clientes_distintos` por día en una tabla agregada. ¿Puedes sumarlos para obtener los clientes distintos del mes?

- [ ] Sí, siempre
- [x] No: un cliente que compró varios días se contaría varias veces; hay que calcularlo desde el detalle
- [ ] Sí, si se divide por 30
- [ ] Solo en BigQuery
:::

:::ejercicio sql titulo="Construye una OBT" ordenado
Construye una OBT de ventas de los pedidos **entregados** del **1 de diciembre de 2024**: una fila por línea de pedido con `pedido_id`, `fecha_pedido`, `canal`, `pais` (del cliente), `segmento`, `producto` (nombre), `marca`, `categoria` (nombre) y `importe_neto` (redondeado a 2). Ordena por `pedido_id` y `producto`.
```sql solucion
SELECT p.pedido_id, p.fecha_pedido, p.canal,
       c.pais, c.segmento,
       pr.nombre AS producto, pr.marca,
       cat.nombre AS categoria,
       ROUND(d.cantidad * d.precio_unitario * (1 - d.descuento), 2) AS importe_neto
FROM detalle_pedidos d
JOIN pedidos p     ON p.pedido_id = d.pedido_id
JOIN clientes c    ON c.cliente_id = p.cliente_id
JOIN productos pr  ON pr.producto_id = d.producto_id
JOIN categorias cat ON cat.categoria_id = pr.categoria_id
WHERE p.estado = 'entregado' AND p.fecha_pedido = '2024-12-01'
ORDER BY p.pedido_id, producto
```
:::

:::ejercicio sql titulo="Tabla agregada por mes y país" ordenado
Construye `agg_ventas_mes_pais` para 2024 (pedidos no cancelados): `mes` (formato `YYYY-MM`), `pais` del cliente, `pedidos` (distintos), `clientes` (distintos) e `importe_neto` (redondeado a 2). Devuelve solo los meses de **noviembre y diciembre** y ordena por `mes` y `pais`.
```sql solucion
SELECT strftime('%Y-%m', p.fecha_pedido) AS mes,
       c.pais,
       COUNT(DISTINCT p.pedido_id) AS pedidos,
       COUNT(DISTINCT p.cliente_id) AS clientes,
       ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS importe_neto
FROM pedidos p
JOIN clientes c ON c.cliente_id = p.cliente_id
JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
WHERE p.estado <> 'cancelado' AND p.fecha_pedido >= '2024-11-01' AND p.fecha_pedido < '2025-01-01'
GROUP BY mes, c.pais
ORDER BY mes, c.pais
```
:::
