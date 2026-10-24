---
titulo: "Dimensiones lentamente cambiantes (SCD) con SQL"
nivel: Avanzado
duracion: 55
resumen: Los tipos de SCD (0, 1, 2, 3 y 6), cómo construir una dimensión tipo 2 con funciones de ventana y cómo unir hechos con la versión correcta de la dimensión.
objetivos: Elegir el tipo de SCD según si el negocio necesita la historia | Construir una dimensión SCD tipo 2 con vigencias a partir de un registro de cambios | Colapsar versiones repetidas para no crear historia falsa | Unir una tabla de hechos con la versión de la dimensión vigente en la fecha del hecho (point-in-time)
prerrequisitos: modelado-kimball | sql-ventanas-2
autoevaluacion: ¿Puedes explicar la diferencia entre SCD tipo 1 y tipo 2 con un ejemplo? | ¿Sabes qué columnas tiene una dimensión tipo 2? | ¿Puedes calcular `valido_hasta` con `LEAD`? | ¿Sabes por qué hay que colapsar versiones iguales consecutivas? | ¿Puedes escribir el JOIN que trae el segmento que tenía el cliente el día de la venta?
---

:::escenario El cliente que cambió de segmento
Valentina pregunta en la reunión mensual:

> "¿Cuánto nos compraron los clientes Corporativos el año pasado? Ojo: hay clientes que en marzo pasaron de Pyme a Corporativo. Quiero que lo que compraron siendo Pyme cuente como Pyme."

Hoy, la tabla `clientes` solo guarda el segmento **actual**. Si unes las ventas de 2023 con ella, todas las compras de esos clientes aparecen como Corporativas. Para responder bien hace falta guardar **la historia** de los atributos que cambian. Eso es una dimensión lentamente cambiante (*slowly changing dimension*, SCD).
:::

## Los tipos de SCD

| Tipo | Qué hace cuando un atributo cambia | Historia | Ejemplo de uso |
|---|---|---|---|
| **0** | Nada: el valor original no cambia nunca | — | Fecha de nacimiento, fecha de alta |
| **1** | Sobrescribe el valor | Se pierde | Corregir un error de tipeo en el nombre |
| **2** | Cierra la fila vieja y crea una nueva con fechas de vigencia | Completa | Segmento, ciudad, categoría de un producto |
| **3** | Guarda el valor anterior en otra columna | Solo un cambio atrás | "Región actual" y "región anterior" tras una reorganización |
| **6** (1+2+3) | Tipo 2, más una columna con el valor actual en todas las filas | Completa + fácil de comparar | Reportar por el segmento de entonces y por el de hoy |

La decisión es **de negocio**, columna por columna: "si el cliente se muda, ¿las ventas viejas se reportan en la ciudad vieja o en la nueva?". Lo más común: tipo 1 para correcciones y tipo 2 para cambios reales que importan al análisis.

## Cómo se ve una dimensión tipo 2

```diagrama
titulo: SCD tipo 2: cada cambio cierra una versión y abre otra
nodo v1: Versión 1 | icono=archivo | col=0 | fila=0 | color=gris | sub=Pyme\n2022-05-10 → 2024-03-01
nodo v2: Versión 2 | icono=archivo | col=1 | fila=0 | color=gris | sub=Corporativo\n2024-03-01 → 2024-09-15
nodo v3: Versión 3 (actual) | icono=check | col=2 | fila=0 | color=verde | sub=Corporativo, Santiago\n2024-09-15 → 9999-12-31
nodo f1: Venta 2023-11-20 | icono=dinero | col=0 | fila=1 | color=amarillo | sub=se une con la versión 1
nodo f2: Venta 2024-06-02 | icono=dinero | col=1 | fila=1 | color=amarillo | sub=se une con la versión 2
flecha v1 -> v2: cambió el segmento
flecha v2 -> v3: se mudó
flecha f1 -> v1 | estilo=punteada
flecha f2 -> v2 | estilo=punteada
```

| cliente_sk | cliente_id | segmento | ciudad | valido_desde | valido_hasta | es_actual |
|---|---|---|---|---|---|---|
| 1 | 42 | Pyme | Lima | 2022-05-10 | 2024-03-01 | false |
| 2 | 42 | Corporativo | Lima | 2024-03-01 | 2024-09-15 | false |
| 3 | 42 | Corporativo | Santiago | 2024-09-15 | 9999-12-31 | true |

Las columnas que agrega el tipo 2:

- **`cliente_sk`**: clave **sustituta**, una por versión. El `cliente_id` (clave natural) se repite.
- **`valido_desde` / `valido_hasta`**: el rango de vigencia. Se usa el rango **semiabierto**: válido desde (incluido) hasta (excluido). La versión actual tiene una fecha "infinita" (`9999-12-31`), que evita lidiar con nulos.
- **`es_actual`**: atajo para filtrar la versión vigente.

## Construir el tipo 2 desde un registro de cambios

Supongamos que tenemos cada "foto" de los atributos del cliente con su fecha (lo que da un CDC o un snapshot diario). El truco es `LEAD`: el `valido_hasta` de una versión es el `valido_desde` de la siguiente.

```sql
WITH cambios(cliente_id, segmento, ciudad, fecha) AS (
    VALUES (42, 'Pyme',        'Lima',     '2022-05-10'),
           (42, 'Corporativo', 'Lima',     '2024-03-01'),
           (42, 'Corporativo', 'Santiago', '2024-09-15'),
           (77, 'Consumidor',  'Quito',    '2023-01-20')
)
SELECT
    ROW_NUMBER() OVER (ORDER BY cliente_id, fecha)                                AS cliente_sk,
    cliente_id, segmento, ciudad,
    fecha                                                                         AS valido_desde,
    COALESCE(LEAD(fecha) OVER (PARTITION BY cliente_id ORDER BY fecha), '9999-12-31') AS valido_hasta,
    LEAD(fecha) OVER (PARTITION BY cliente_id ORDER BY fecha) IS NULL             AS es_actual
FROM cambios
ORDER BY cliente_id, valido_desde;
```

### Colapsar versiones repetidas

Las fotos diarias repiten los mismos valores muchos días seguidos. Si las conviertes directamente en versiones, la dimensión tiene una fila por día y por cliente, con "cambios" que no cambiaron nada. Antes de calcular las vigencias, hay que quedarse solo con las fotos donde **algo cambió** respecto a la anterior:

```sql
WITH fotos(cliente_id, segmento, fecha) AS (
    VALUES (42, 'Pyme', '2024-02-27'), (42, 'Pyme', '2024-02-28'), (42, 'Pyme', '2024-02-29'),
           (42, 'Corporativo', '2024-03-01'), (42, 'Corporativo', '2024-03-02'),
           (42, 'Pyme', '2024-03-03')
),
con_anterior AS (
    SELECT *, LAG(segmento) OVER (PARTITION BY cliente_id ORDER BY fecha) AS segmento_anterior
    FROM fotos
)
SELECT cliente_id, segmento, fecha AS valido_desde
FROM con_anterior
WHERE segmento_anterior IS NULL OR segmento_anterior <> segmento
ORDER BY fecha;
```

De 6 fotos quedan 3 versiones reales: Pyme, Corporativo y de nuevo Pyme. Fíjate que la tercera **no** se fusiona con la primera aunque tengan el mismo valor: son períodos distintos.

## Unir hechos con la versión correcta (point-in-time)

La respuesta a la pregunta de Valentina: cada venta se une con la versión del cliente **vigente en la fecha de la venta**:

```sql norun
SELECT d.segmento, SUM(f.importe_neto) AS ventas
FROM fct_ventas f
JOIN dim_cliente d
  ON d.cliente_id = f.cliente_id
 AND f.fecha_venta >= d.valido_desde
 AND f.fecha_venta <  d.valido_hasta          -- rango semiabierto: nunca dos versiones a la vez
WHERE f.fecha_venta >= '2023-01-01' AND f.fecha_venta < '2024-01-01'
GROUP BY d.segmento;
```

Una alternativa muy usada: guardar en la tabla de hechos directamente la **`cliente_sk`** de la versión vigente al momento de cargar el hecho. Así el JOIN es un simple igualdad (`f.cliente_sk = d.cliente_sk`), más rápido y sin riesgo de errores con las fechas.

:::tip SCD tipo 6: lo mejor de los dos mundos
Si a veces quieren "ventas por el segmento de entonces" y otras "por el segmento de hoy", agrega a cada versión una columna `segmento_actual`, que se actualiza en todas las filas del cliente. Con el mismo JOIN, eliges una columna u otra.
:::

<!-- estandar:errores -->
:::errores
- **Unir hechos con la dimensión tipo 2 solo por `cliente_id`**: cada venta se multiplica por la cantidad de versiones del cliente.
- **Rangos cerrados en los dos extremos** (`BETWEEN valido_desde AND valido_hasta`): el día del cambio, la venta coincide con dos versiones y se duplica.
- **No colapsar fotos repetidas**: la dimensión crece una fila por día y por cliente y las consultas se vuelven lentas.
- **Tipo 2 para todo**: si el nombre del cliente se corrige de "Ana Ruz" a "Ana Ruiz", eso no es historia: es un error. Tipo 1.
- **Olvidar las correcciones del pasado**: si llega tarde un cambio con fecha vieja, hay que recalcular las vigencias, no solo agregar una fila al final.
:::

<!-- estandar:trabajo -->
:::trabajo
- En dbt, el tipo 2 se implementa con **snapshots** (`dbt snapshot`), que comparan la tabla de origen con la última versión y generan `dbt_valid_from` y `dbt_valid_to`. En Databricks, con `MERGE` o con las *Delta Live Tables* (`APPLY CHANGES ... STORED AS SCD TYPE 2`).
- Antes de implementar, se acuerda con el negocio la lista de atributos tipo 1 y tipo 2. Esa lista va en la documentación del modelo.
- Los tests típicos de una dimensión tipo 2: una sola versión actual por clave natural, sin solapamientos de vigencia y sin huecos entre versiones.
:::

<!-- estandar:entrevista -->
:::entrevista "¿Cómo implementarías una SCD tipo 2?"
Explica las columnas (clave sustituta, clave natural, atributos, `valido_desde`, `valido_hasta`, `es_actual`); el proceso de carga (comparar la foto nueva con la versión actual; si cambió un atributo tipo 2, cerrar la vigente con la fecha del cambio e insertar una nueva; si cambió uno tipo 1, actualizarlo en todas las versiones); y el JOIN point-in-time con rango semiabierto o guardando la clave sustituta en el hecho. Menciona herramientas: `dbt snapshot`, `MERGE` en Delta.
:::

## Ejercicios

:::ejercicio quiz
Un producto cambia de categoría ("Accesorios" → "Audio"). El negocio quiere que las ventas pasadas sigan reportándose en "Accesorios". ¿Qué tipo de SCD usas para `categoria`?

- [ ] Tipo 1
- [x] Tipo 2
- [ ] Tipo 0
- [ ] Ninguno: se borra el producto
:::

:::ejercicio quiz
Una venta del 2024-03-01 y un cambio de segmento con `valido_desde = 2024-03-01`. Con el JOIN `fecha >= valido_desde AND fecha < valido_hasta`, ¿con cuántas versiones coincide la venta?

- [ ] Con dos
- [x] Con una: la nueva (el rango semiabierto evita el solapamiento)
- [ ] Con ninguna
- [ ] Depende del motor
:::

:::ejercicio sql titulo="Construye la SCD tipo 2" ordenado
A partir del registro de cambios de productos, construye la dimensión tipo 2: `producto_id`, `categoria`, `precio`, `valido_desde`, `valido_hasta` (la fecha de la versión siguiente del mismo producto, o `'9999-12-31'` si es la última) y `es_actual` (1 o 0). Ordena por `producto_id` y `valido_desde`.
```sql inicial
WITH cambios(producto_id, categoria, precio, fecha) AS (
    VALUES (1, 'Accesorios', 25.0, '2023-01-01'),
           (1, 'Audio',      25.0, '2024-02-10'),
           (1, 'Audio',      29.9, '2024-07-01'),
           (2, 'Notebooks', 900.0, '2023-05-05')
)
SELECT ...
```
```sql solucion
WITH cambios(producto_id, categoria, precio, fecha) AS (
    VALUES (1, 'Accesorios', 25.0, '2023-01-01'),
           (1, 'Audio',      25.0, '2024-02-10'),
           (1, 'Audio',      29.9, '2024-07-01'),
           (2, 'Notebooks', 900.0, '2023-05-05')
)
SELECT producto_id, categoria, precio,
       fecha AS valido_desde,
       COALESCE(LEAD(fecha) OVER (PARTITION BY producto_id ORDER BY fecha), '9999-12-31') AS valido_hasta,
       CASE WHEN LEAD(fecha) OVER (PARTITION BY producto_id ORDER BY fecha) IS NULL THEN 1 ELSE 0 END AS es_actual
FROM cambios
ORDER BY producto_id, valido_desde
```
:::

:::ejercicio sql titulo="Ventas con la categoría de entonces" ordenado
Une las ventas con la versión del producto vigente en la fecha de la venta (rango semiabierto) y suma el `importe` por `categoria`. Columnas: `categoria`, `importe`, ordenado por `categoria`.
```sql inicial
WITH dim_producto(producto_id, categoria, valido_desde, valido_hasta) AS (
    VALUES (1, 'Accesorios', '2023-01-01', '2024-02-10'),
           (1, 'Audio',      '2024-02-10', '9999-12-31'),
           (2, 'Notebooks',  '2023-05-05', '9999-12-31')
),
ventas(venta_id, producto_id, fecha, importe) AS (
    VALUES (1, 1, '2023-12-24', 50.0),
           (2, 1, '2024-02-10', 25.0),
           (3, 1, '2024-05-01', 75.0),
           (4, 2, '2024-01-15', 900.0)
)
SELECT ...
```
```sql solucion
WITH dim_producto(producto_id, categoria, valido_desde, valido_hasta) AS (
    VALUES (1, 'Accesorios', '2023-01-01', '2024-02-10'),
           (1, 'Audio',      '2024-02-10', '9999-12-31'),
           (2, 'Notebooks',  '2023-05-05', '9999-12-31')
),
ventas(venta_id, producto_id, fecha, importe) AS (
    VALUES (1, 1, '2023-12-24', 50.0),
           (2, 1, '2024-02-10', 25.0),
           (3, 1, '2024-05-01', 75.0),
           (4, 2, '2024-01-15', 900.0)
)
SELECT d.categoria, SUM(v.importe) AS importe
FROM ventas v
JOIN dim_producto d
  ON d.producto_id = v.producto_id
 AND v.fecha >= d.valido_desde
 AND v.fecha <  d.valido_hasta
GROUP BY d.categoria
ORDER BY d.categoria
```
```pista
La venta del 2024-02-10 es justo el día del cambio: con `>=` en el desde y `<` en el hasta, cae solo en "Audio". El total debe seguir siendo 1.050.
```
:::

:::ejercicio sql titulo="SCD desde datos sucios" ordenado
Construye las versiones del **email** del cliente `1638` en `clientes_crudo`: normaliza el email con `LOWER(TRIM(email))`, ordena por `fecha_carga`, y quédate solo con las cargas donde el email normalizado **cambió** respecto a la carga anterior (o es la primera). Columnas: `cliente_id`, `email`, `valido_desde` (la `fecha_carga`), ordenado por `valido_desde`.
```sql solucion
WITH cargas AS (
    SELECT cliente_id, LOWER(TRIM(email)) AS email, fecha_carga
    FROM clientes_crudo
    WHERE cliente_id = 1638
),
con_anterior AS (
    SELECT *, LAG(email) OVER (PARTITION BY cliente_id ORDER BY fecha_carga) AS email_anterior
    FROM cargas
)
SELECT cliente_id, email, fecha_carga AS valido_desde
FROM con_anterior
WHERE email_anterior IS NULL OR email_anterior <> email
ORDER BY valido_desde
```
```explicacion
Las cinco cargas del cliente 1638 tienen el mismo email una vez normalizado: queda **una sola versión**. Las diferencias de mayúsculas no eran cambios reales, y una SCD hecha sin normalizar hubiera inventado historia falsa.
```
:::
