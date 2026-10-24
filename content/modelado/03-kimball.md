---
titulo: "Modelado dimensional de Kimball, paso a paso"
nivel: Avanzado
duracion: 60
resumen: El método de 4 pasos, la matriz de bus, los tres tipos de tablas de hechos, medidas aditivas y semiaditivas, dimensiones conformadas y la dimensión de fecha.
objetivos: Aplicar los 4 pasos de Kimball: proceso de negocio, grano, dimensiones y hechos | Elegir entre hechos transaccionales, snapshots periódicos y snapshots acumulativos | Distinguir medidas aditivas, semiaditivas y no aditivas y agregarlas correctamente | Construir con SQL una tabla de hechos, una dimensión de fecha y un snapshot periódico
prerrequisitos: modelado-normalizacion | sql-modelado | sql-recursivas
autoevaluacion: ¿Puedes enunciar los 4 pasos de Kimball en orden? | ¿Puedes declarar el grano de una tabla de hechos en una frase? | ¿Sabes por qué no se puede sumar el stock de varios días? | ¿Sabes cuándo usar un snapshot acumulativo? | ¿Sabes qué es una dimensión conformada y por qué importa?
---

:::escenario El modelo para el dashboard de ventas
Martín te asigna el diseño del modelo gold de Tienda Andina:

> "Hoy cada analista arma sus consultas desde las tablas de la app y cada uno llega a un número distinto. Quiero un modelo dimensional como corresponde: con el que cualquiera pueda responder 'ventas por categoría, país y mes' con un JOIN simple, y que dé siempre lo mismo."

Ya viste la idea del esquema estrella en SQL. Ahora vas a aprender el **método** completo de Ralph Kimball, el estándar de la industria desde hace 30 años y la base de casi todos los modelos gold en dbt.
:::

## Los 4 pasos de Kimball

```diagrama
titulo: El método de 4 pasos, siempre en este orden
nodo p1: 1. Proceso de negocio | icono=engranaje | col=0 | fila=0 | color=azul | sub=¿qué evento medimos?
nodo p2: 2. Grano | icono=lupa | col=1 | fila=0 | color=rojo | sub=¿qué representa UNA fila?
nodo p3: 3. Dimensiones | icono=capas | col=2 | fila=0 | color=verde | sub=¿por qué cortamos? quién, qué, dónde, cuándo
nodo p4: 4. Hechos | icono=grafico | col=3 | fila=0 | color=naranja | sub=¿qué medimos? números
flecha p1 -> p2
flecha p2 -> p3
flecha p3 -> p4
```

**1. Elegir el proceso de negocio.** No "las ventas" en abstracto, sino un **evento** que ocurre y se registra: tomar un pedido, cobrar un pago, despachar un envío. Cada proceso será una tabla de hechos.

**2. Declarar el grano.** Una frase que dice **qué representa exactamente una fila**: *"una fila por cada línea de producto de un pedido"*. Es el paso más importante: todo lo demás se decide a partir de él. El grano más fino (el más detallado) es el más flexible: siempre se puede agregar hacia arriba, nunca desagregar.

**3. Identificar las dimensiones.** Las preguntas de contexto del evento: **quién** (cliente, vendedor), **qué** (producto), **dónde** (tienda, país), **cuándo** (fecha), **cómo** (canal, medio de pago). Cada una es una tabla de dimensión, con atributos descriptivos para filtrar y agrupar.

**4. Identificar los hechos.** Los **números** que se miden en ese evento, al grano declarado: unidades, importe bruto, descuento, importe neto, costo.

### Aplicado a Tienda Andina

| Paso | Decisión |
|---|---|
| Proceso | Venta (toma de pedidos) |
| Grano | Una fila por línea de pedido (`detalle_pedidos`) |
| Dimensiones | fecha, cliente, producto (con categoría), canal, medio de pago, vendedor |
| Hechos | cantidad, importe bruto, descuento, importe neto, costo, margen |

```diagrama
titulo: fct_ventas al grano de línea de pedido, con sus dimensiones
nodo f: fct_ventas | icono=tabla | col=1 | fila=1 | color=naranja | sub=1 fila = 1 línea de pedido\ncantidad, importe_neto, costo
nodo d1: dim_fecha | icono=reloj | col=0 | fila=0 | color=azul | sub=día, mes, trimestre, feriado
nodo d2: dim_cliente | icono=usuario | col=1 | fila=0 | color=azul | sub=segmento, ciudad, país
nodo d3: dim_producto | icono=carrito | col=2 | fila=0 | color=azul | sub=marca, categoría, categoría padre
nodo d4: dim_canal | icono=web | col=0 | fila=2 | color=azul | sub=web, app, tienda, teléfono
nodo d5: dim_vendedor | icono=equipo | col=2 | fila=2 | color=azul | sub=cargo, departamento
nodo dd: pedido_id | icono=archivo | col=0 | fila=1 | forma=nota | sub=dimensión degenerada
flecha d1 -- f
flecha d2 -- f
flecha d3 -- f
flecha d4 -- f
flecha d5 -- f
flecha dd -- f | estilo=punteada
```

El `pedido_id` queda en la tabla de hechos sin tabla propia: se llama **dimensión degenerada**. Sirve para contar pedidos (`COUNT(DISTINCT pedido_id)`) o agrupar líneas del mismo pedido.

## Los tres tipos de tablas de hechos

| Tipo | Grano | Ejemplo | Se actualiza |
|---|---|---|---|
| **Transaccional** | Un evento | Cada línea de pedido, cada pago, cada clic | Solo se agregan filas |
| **Snapshot periódico** | El estado de algo al final de cada período | Stock de cada producto en cada almacén **al cierre de cada día**; saldo de cada cuenta a fin de mes | Se agrega una "foto" por período |
| **Snapshot acumulativo** | Un proceso con etapas, una fila que se va completando | Cada pedido con sus fechas: creado, pagado, despachado, entregado | La misma fila se actualiza a medida que avanza |

Ejemplo de snapshot acumulativo para pedidos:

| pedido_id | fecha_creado | fecha_pagado | fecha_despachado | fecha_entregado | dias_a_pago | dias_a_entrega |
|---|---|---|---|---|---|---|
| 1001 | 2024-12-01 | 2024-12-01 | 2024-12-02 | 2024-12-05 | 0 | 4 |
| 1002 | 2024-12-01 | 2024-12-03 | NULL | NULL | 2 | NULL |

Responde preguntas de **eficiencia del proceso**: ¿cuánto tardamos en promedio de pago a despacho? ¿Cuántos pedidos están "trabados" en una etapa?

## Medidas aditivas, semiaditivas y no aditivas

No todos los números se pueden sumar en todas las dimensiones:

| Tipo | Se puede sumar… | Ejemplo | Cómo se agrega |
|---|---|---|---|
| **Aditiva** | En todas las dimensiones | Unidades vendidas, importe | `SUM` |
| **Semiaditiva** | En algunas, **no en el tiempo** | Stock, saldo de una cuenta | Sumar entre almacenes sí; entre días, **no**: se toma el último o el promedio |
| **No aditiva** | En ninguna | Porcentajes, precios unitarios, ratios | Se recalcula desde sus componentes: `SUM(margen) / SUM(importe)` |

:::cuidado El error del stock sumado
Si un producto tiene 100 unidades el lunes y 100 el martes, el stock de "lunes y martes" **no** es 200: sigue siendo 100. Sumar un snapshot periódico a través del tiempo es uno de los errores más comunes en los tableros. Y el margen promedio de dos categorías no es el promedio de sus porcentajes: se recalcula con los totales.
:::

## Dimensiones conformadas y la matriz de bus

Una **dimensión conformada** es una dimensión **compartida** por varias tablas de hechos, con las mismas claves y atributos. Si `fct_ventas` y `fct_devoluciones` usan la misma `dim_producto`, puedes poner ventas y devoluciones lado a lado por categoría y los números cuadran.

La **matriz de bus** es la herramienta de planificación de Kimball: procesos en las filas, dimensiones en las columnas. Cada ✔ es una dimensión que ese proceso usa:

| Proceso \ Dimensión | Fecha | Cliente | Producto | Canal | Almacén | Transportista |
|---|---|---|---|---|---|---|
| Ventas | ✔ | ✔ | ✔ | ✔ | | |
| Pagos | ✔ | ✔ | | ✔ | | |
| Stock diario | ✔ | | ✔ | | ✔ | |
| Envíos | ✔ | ✔ | | | ✔ | ✔ |

Las columnas con varios ✔ (fecha, cliente, producto) son las dimensiones que **hay que conformar primero**: las comparten varios procesos. La matriz también es un plan de trabajo: cada fila es un entregable.

## La dimensión de fecha

Casi todo análisis corta por tiempo, y las funciones de fecha de cada motor son distintas y lentas de escribir. Por eso se construye **una tabla con una fila por día** y todos los atributos útiles ya calculados:

```sql
WITH RECURSIVE dias(fecha) AS (
    SELECT DATE('2024-12-20')
    UNION ALL
    SELECT DATE(fecha, '+1 day') FROM dias WHERE fecha < '2025-01-05'
)
SELECT
    CAST(strftime('%Y%m%d', fecha) AS INTEGER)              AS fecha_key,
    fecha,
    CAST(strftime('%Y', fecha) AS INTEGER)                  AS anio,
    CAST(strftime('%m', fecha) AS INTEGER)                  AS mes,
    (CAST(strftime('%m', fecha) AS INTEGER) + 2) / 3        AS trimestre,
    CASE strftime('%w', fecha) WHEN '0' THEN 'domingo' WHEN '1' THEN 'lunes' WHEN '2' THEN 'martes'
         WHEN '3' THEN 'miércoles' WHEN '4' THEN 'jueves' WHEN '5' THEN 'viernes' ELSE 'sábado' END AS dia_semana,
    strftime('%w', fecha) IN ('0', '6')                     AS es_fin_de_semana,
    fecha IN ('2024-12-25', '2025-01-01')                   AS es_feriado
FROM dias;
```

En producción se genera para muchos años (en dbt, con `dbt_utils.date_spine`) y se le agregan feriados de cada país, semanas fiscales y temporadas comerciales. La clave `fecha_key` (`20241225`) es un entero legible: la usan las tablas de hechos.

## Construir la tabla de hechos con SQL

Este es el núcleo de `fct_ventas`, al grano de línea de pedido, con las medidas calculadas:

```sql
SELECT
    d.detalle_id                                           AS venta_id,
    d.pedido_id,                                           -- dimensión degenerada
    CAST(strftime('%Y%m%d', p.fecha_pedido) AS INTEGER)    AS fecha_key,
    p.cliente_id,
    d.producto_id,
    p.canal,
    d.cantidad,
    ROUND(d.cantidad * d.precio_unitario, 2)                     AS importe_bruto,
    ROUND(d.cantidad * d.precio_unitario * d.descuento, 2)       AS descuento,
    ROUND(d.cantidad * d.precio_unitario * (1 - d.descuento), 2) AS importe_neto,
    ROUND(d.cantidad * pr.costo, 2)                              AS costo
FROM detalle_pedidos d
JOIN pedidos   p  ON p.pedido_id = d.pedido_id
JOIN productos pr ON pr.producto_id = d.producto_id
WHERE p.estado <> 'cancelado'
LIMIT 10;
```

Fíjate en el **costo**: se guarda calculado en el hecho (con el costo del producto), no se recalcula en cada tablero. En un modelo más completo se usaría el costo **vigente en la fecha** de la venta, no el de hoy (lo resuelven las SCD de la próxima lección).

<!-- estandar:errores -->
:::errores
- **Mezclar granos** en una tabla de hechos: líneas de pedido junto con el costo de envío (que es por pedido). Al sumar, el envío se multiplica por la cantidad de líneas.
- **Empezar por las dimensiones** sin declarar el grano: terminas con hechos que no se sabe a qué nivel están.
- **Sumar medidas semiaditivas en el tiempo** (stock, saldo) o promediar porcentajes.
- **Dimensiones distintas para lo mismo**: `dim_cliente` de ventas y `dim_cliente` de marketing con atributos diferentes. Los números de los dos tableros nunca van a cuadrar.
- **Elegir un grano agregado "porque ocupa menos"**: después alguien pide el detalle y no existe.
:::

<!-- estandar:trabajo -->
:::trabajo
- En dbt, los modelos gold siguen esta estructura: `fct_` para hechos y `dim_` para dimensiones, documentados con el grano en la descripción del modelo y un test de unicidad sobre la clave del grano.
- La matriz de bus se usa en la planificación de proyectos: cada fila es un "épico" que se entrega por separado, y las dimensiones compartidas se construyen primero.
- En plataformas columnares (BigQuery, Databricks, Snowflake) a veces se agrega a la estrella una tabla ancha (OBT) para el BI: lo verás en una lección próxima. La estrella sigue siendo la base.
:::

<!-- estandar:entrevista -->
:::entrevista "Diseña el modelo dimensional para una cadena de cines"
Aplica los 4 pasos en voz alta. Proceso: venta de entradas. Grano: una fila por entrada vendida. Dimensiones: fecha y hora de la función, película, sala/cine, cliente (si hay programa de fidelidad), canal (taquilla, web, app), tipo de entrada (adulto, menor, promoción). Hechos: precio pagado, descuento, costo de comisión. Después menciona otros procesos con su propia tabla de hechos (ventas de la confitería, con dimensiones conformadas fecha y cine) y un snapshot periódico de ocupación por función.
:::

## Ejercicios

:::ejercicio quiz
¿Cuál es el segundo paso del método de Kimball, el que más condiciona el resto?

- [ ] Elegir las dimensiones
- [x] Declarar el grano: qué representa una fila de la tabla de hechos
- [ ] Elegir el motor de base de datos
- [ ] Calcular los totales
:::

:::ejercicio quiz
Una tabla tiene una fila por producto, almacén y día con el stock al cierre. ¿Qué tipo de tabla de hechos es y cómo se agrega en el tiempo?

- [ ] Transaccional; se suma
- [x] Snapshot periódico; el stock es semiaditivo: entre almacenes se suma, en el tiempo se toma el último día (o el promedio)
- [ ] Snapshot acumulativo; se suma
- [ ] Una dimensión
:::

:::ejercicio sql titulo="Ventas por categoría desde la estrella" ordenado
Usando el grano de línea de pedido (pedidos **no cancelados**), calcula por nombre de categoría (`categoria`) el `importe_neto` (redondeado a 2), el `costo` total (redondeado a 2) y el `margen_pct` (porcentaje de margen sobre el importe neto, recalculado desde los totales y redondeado a 1). Ordena por `importe_neto` descendente.
```sql solucion
WITH fct AS (
    SELECT d.producto_id,
           d.cantidad * d.precio_unitario * (1 - d.descuento) AS importe_neto,
           d.cantidad * pr.costo AS costo
    FROM detalle_pedidos d
    JOIN pedidos p ON p.pedido_id = d.pedido_id
    JOIN productos pr ON pr.producto_id = d.producto_id
    WHERE p.estado <> 'cancelado'
)
SELECT c.nombre AS categoria,
       ROUND(SUM(f.importe_neto), 2) AS importe_neto,
       ROUND(SUM(f.costo), 2) AS costo,
       ROUND(100.0 * (SUM(f.importe_neto) - SUM(f.costo)) / SUM(f.importe_neto), 1) AS margen_pct
FROM fct f
JOIN productos pr ON pr.producto_id = f.producto_id
JOIN categorias c ON c.categoria_id = pr.categoria_id
GROUP BY c.nombre
ORDER BY importe_neto DESC
```
```pista
El margen es una medida **no aditiva**: no promedies márgenes por línea. Suma el importe neto y el costo, y después calcula `(importe - costo) / importe`.
```
:::

:::ejercicio sql titulo="Snapshot periódico de stock" ordenado
Construye un snapshot periódico del almacén `1` y el SKU con más movimientos en ese almacén: el **stock al cierre** de cada día de **diciembre de 2024** en que hubo movimientos, acumulando desde el inicio de los datos (las entradas suman y las salidas restan; la columna `cantidad` ya viene con signo). Columnas: `fecha`, `sku`, `stock_cierre`, ordenado por `fecha`.
```sql solucion
WITH sku_top AS (
    SELECT sku FROM logistica_movimientos WHERE almacen_id = 1
    GROUP BY sku ORDER BY COUNT(*) DESC, sku LIMIT 1
),
diario AS (
    SELECT m.fecha, m.sku, SUM(m.cantidad) AS neto
    FROM logistica_movimientos m
    WHERE m.almacen_id = 1 AND m.sku = (SELECT sku FROM sku_top)
    GROUP BY m.fecha, m.sku
),
acumulado AS (
    SELECT fecha, sku, SUM(neto) OVER (ORDER BY fecha) AS stock_cierre FROM diario
)
SELECT fecha, sku, stock_cierre
FROM acumulado
WHERE fecha >= '2024-12-01' AND fecha < '2025-01-01'
ORDER BY fecha
```
```pista
Primero suma los movimientos por día; después acumula con `SUM(...) OVER (ORDER BY fecha)` **sobre todo el historial**, y recién al final filtra diciembre. Si filtras antes, el stock arranca en cero.
```
:::

:::ejercicio abierto titulo="Matriz de bus del banco"
Banco Austral tiene estos procesos: movimientos de cuenta, otorgamiento de préstamos, pago de cuotas, saldo de cada cuenta a fin de mes y alertas de fraude. Arma la matriz de bus (procesos × dimensiones), declara el grano de cada tabla de hechos e indica su tipo (transaccional, snapshot periódico o acumulativo).
```solucion
Dimensiones candidatas: fecha, cliente, cuenta, tipo de movimiento, comercio, canal, producto de préstamo, sucursal.
- fct_movimientos (transaccional): una fila por transacción. Dimensiones: fecha, cliente, cuenta, tipo de movimiento, comercio, canal.
- fct_prestamos (snapshot acumulativo): una fila por préstamo, con fechas de solicitud, aprobación, desembolso y cancelación. Dimensiones: fecha(s), cliente, producto de préstamo, sucursal.
- fct_pagos_cuota (transaccional): una fila por pago de cuota. Dimensiones: fecha, cliente, cuenta, producto de préstamo, canal.
- fct_saldo_mensual (snapshot periódico): una fila por cuenta y mes con el saldo al cierre (semiaditivo). Dimensiones: fecha (fin de mes), cliente, cuenta.
- fct_alertas_fraude (transaccional): una fila por alerta. Dimensiones: fecha, cliente, cuenta, comercio, canal.
Dimensiones conformadas: fecha y cliente (en todos los procesos) y cuenta (en cuatro); se construyen primero y las comparten todas las tablas de hechos.
```
:::
