---
titulo: Modelado de datos: normalización y esquema estrella
nivel: Experto
duracion: 35
resumen: Normalización, OLTP vs OLAP, hechos y dimensiones, granularidad y SCD tipo 2.
objetivos: Explicar la normalización y para qué sirve en sistemas transaccionales | Diseñar un esquema estrella con una tabla de hechos y sus dimensiones | Definir el grano de una tabla de hechos antes de construirla | Elegir un tipo de dimensión lentamente cambiante (SCD 1 o 2) según la pregunta del negocio
prerrequisitos: sql-joins | sql-ddl-dml
autoevaluacion: ¿Puedes explicar la diferencia entre un modelo normalizado y uno dimensional? | ¿Puedes definir el grano de una tabla de hechos de ventas en una frase? | ¿Sabes qué va en una tabla de hechos y qué va en una dimensión? | ¿Sabes qué tipo de SCD usar si las ventas pasadas deben conservar el segmento que tenía el cliente en ese momento? | ¿Puedes construir una tabla de hechos y una dimensión con las tablas de la tienda?
---

<!-- estandar:escenario -->
:::escenario El modelo para el nuevo dashboard
Martín te da tu primera tarea de diseño:

> "Vamos a reconstruir el dashboard de ventas desde cero. Antes de escribir una línea, quiero que propongas el modelo de datos: qué tablas, con qué columnas y a qué nivel de detalle. Lo revisamos juntos el jueves."

Hasta ahora consultabas tablas que alguien más diseñó. Ahora te toca **diseñarlas**. Un buen modelo hace que todas las consultas futuras sean simples; uno malo te persigue durante años.
:::
Saber consultar es la mitad del trabajo. La otra mitad es **diseñar** las tablas para que las consultas sean simples, correctas y rápidas.

## Normalización (mundo OLTP)

**Normalizar** es repartir los datos en tablas para que cada dato viva en **un solo lugar**. Así evitas inconsistencias (el mismo cliente con dos direcciones distintas en dos pedidos).

| Forma normal | Regla (simplificada) |
|---|---|
| **1FN** | Cada celda tiene un solo valor (nada de “tel1, tel2” en una celda) |
| **2FN** | Cada columna depende de **toda** la clave primaria |
| **3FN** | Las columnas no dependen de otras columnas que no son clave (el nombre del cliente no se guarda en la tabla de pedidos) |

Nuestras tablas `pedidos`, `clientes`, `detalle_pedidos` están normalizadas: por eso necesitamos JOINs.

## Modelado dimensional (mundo OLAP / analítica)

Para **analizar**, conviene lo contrario: menos tablas y más anchas, pensadas para agregar rápido. El modelo más usado es el **esquema estrella** (*star schema*), de Ralph Kimball:

- **Tabla de hechos** (*fact*): los eventos medibles del negocio, con **métricas** numéricas y **claves** a dimensiones. Ej.: `fct_ventas` (una fila por línea de pedido: unidades, importe, descuento).
- **Tablas de dimensiones** (*dim*): el contexto descriptivo: `dim_cliente`, `dim_producto`, `dim_fecha`, `dim_canal`.

```text
                 dim_fecha
                     |
  dim_cliente — fct_ventas — dim_producto
                     |
                 dim_canal
```

:::tip La pregunta más importante: ¿cuál es la granularidad?
Antes de diseñar una tabla de hechos, define su **grano**: “una fila representa…”. Por ejemplo: “una fila por producto en cada pedido”. Mezclar granos (líneas y pedidos en la misma tabla) es la fuente número uno de totales duplicados.
:::

<!-- dg:sql22-estrella -->
```diagrama
titulo: Esquema estrella de ventas: la tabla de hechos en el centro y las dimensiones alrededor
nodo fecha: dim_fecha | icono=reloj | col=1 | fila=0 | color=azul | sub=día, mes, feriado…
nodo cli: dim_cliente | icono=usuario | col=0 | fila=1 | color=azul | sub=segmento, país
nodo fct: fct_ventas | icono=tabla | col=1 | fila=1 | color=naranja | sub=1 fila por línea\nunidades, importe
nodo prod: dim_producto | icono=carrito | col=2 | fila=1 | color=azul | sub=marca, categoría
nodo canal: dim_canal | icono=web | col=1 | fila=2 | color=azul | sub=web, app, tienda
flecha fecha -- fct
flecha cli -- fct
flecha prod -- fct
flecha canal -- fct
```

## Dimensiones lentamente cambiantes (SCD)

¿Qué pasa si un cliente se muda de Lima a Santiago? Las ventas viejas, ¿se reportan en Lima o en Santiago?

| Tipo | Estrategia | Resultado |
|---|---|---|
| **SCD tipo 1** | Sobrescribir | Se pierde la historia: todo aparece en Santiago |
| **SCD tipo 2** | Agregar una fila nueva con vigencia (`valido_desde`, `valido_hasta`, `es_actual`) | Se conserva la historia |
| SCD tipo 3 | Columna “valor anterior” | Historia limitada |

Ejemplo de SCD2:

| cliente_sk | cliente_id | ciudad | valido_desde | valido_hasta | es_actual |
|---|---|---|---|---|---|
| 101 | 7 | Lima | 2022-01-01 | 2024-05-31 | 0 |
| 245 | 7 | Santiago | 2024-06-01 | 9999-12-31 | 1 |

`cliente_sk` es una **clave subrogada** (*surrogate key*): un identificador interno de cada versión. En dbt esto se automatiza con **snapshots**.

## Otras arquitecturas que vas a escuchar

- **One Big Table (OBT)**: una sola tabla gigante y desnormalizada; simple para BI, costosa de mantener.
- **Data Vault**: hubs, links y satellites; muy auditable, usado en empresas grandes.
- **Medallón** (bronze / silver / gold): capas de calidad en un lakehouse. Bronze = crudo, Silver = limpio y conformado, Gold = listo para negocio (a menudo en esquema estrella).

## OLTP vs. OLAP: dos mundos con necesidades opuestas

| | OLTP (transaccional) | OLAP (analítico) |
|---|---|---|
| Para qué | Operar el negocio: registrar ventas, pagos, altas | Analizar el negocio: reportes, tendencias, KPIs |
| Consultas típicas | "Inserta este pedido", "trae el cliente 42" | "Ventas por país y mes de los últimos 3 años" |
| Filas por consulta | Pocas | Millones |
| Diseño | Normalizado (3FN): muchas tablas chicas | Dimensional: hechos + dimensiones |
| Ejemplos | PostgreSQL, MySQL, SQL Server de la app | BigQuery, Snowflake, Redshift, Databricks SQL |

El trabajo del data engineer es, en buena parte, **llevar datos del mundo OLTP al OLAP**: extraer de las bases de las aplicaciones, limpiar y remodelar en un esquema pensado para analizar.

## Ejemplo: construir una estrella con las tablas de la tienda

Las tablas del curso están normalizadas (OLTP). Así se construiría un modelo dimensional mínimo con SQL (en un proyecto real, cada consulta sería un modelo de dbt):

```sql
-- Dimensión de productos: aplanamos la categoría para no tener que unirla siempre
CREATE TABLE dim_producto AS
SELECT pr.producto_id, pr.nombre AS producto, pr.marca, c.nombre AS categoria, pr.precio AS precio_lista
FROM productos pr
LEFT JOIN categorias c ON c.categoria_id = pr.categoria_id;

-- Hechos de ventas: grano = una fila por línea de pedido no cancelado
CREATE TABLE fct_ventas AS
SELECT d.detalle_id, p.pedido_id, p.cliente_id, d.producto_id,
       date(p.fecha_pedido) AS fecha, p.canal,
       d.cantidad,
       ROUND(d.cantidad * d.precio_unitario * (1 - d.descuento), 2) AS importe
FROM detalle_pedidos d
JOIN pedidos p ON p.pedido_id = d.pedido_id
WHERE p.estado <> 'cancelado';

-- Y ahora las preguntas de negocio son simples:
SELECT dp.categoria, strftime('%Y', f.fecha) AS anio, ROUND(SUM(f.importe), 2) AS ventas
FROM fct_ventas f
JOIN dim_producto dp ON dp.producto_id = f.producto_id
GROUP BY dp.categoria, anio
ORDER BY dp.categoria, anio;
```

Fíjate en lo que ganamos:

- **Las métricas ya están calculadas** (`importe`), con la regla de negocio (descuento, excluir cancelados) aplicada **una sola vez** y para todos.
- **Las dimensiones son anchas y legibles**: la categoría está en `dim_producto`, no hace falta saber que existe una tabla `categorias`.
- **Una consulta de BI une los hechos con 1 o 2 dimensiones**, nunca 5 tablas en cadena.

### Tipos de tablas de hechos

| Tipo | Grano | Ejemplo |
|---|---|---|
| **Transaccional** | Un evento | Una línea de venta, un pago, un clic |
| **Snapshot periódico** | El estado al cierre de cada periodo | Saldo de cada cuenta al fin de cada mes, stock diario por almacén |
| **Snapshot acumulativo** | Un proceso con varios hitos que se actualiza | Un pedido con fecha de compra, pago, envío y entrega |

### Las dimensiones conformadas

Una dimensión **conformada** es la misma tabla (por ejemplo `dim_cliente` o `dim_fecha`) compartida por **varias** tablas de hechos (ventas, pagos, tickets de soporte). Así, "clientes de Chile" significa lo mismo en todos los reportes y puedes cruzar procesos distintos. Es una de las ideas más valiosas de Kimball.

:::entrevista "Diseña el modelo de datos para…"
Es una pregunta habitual en entrevistas de data engineer (una app de viajes, un e-commerce, un banco). El orden que se espera: (1) aclarar las **preguntas de negocio**, (2) definir los **procesos** (viajes, pagos, calificaciones), (3) fijar el **grano** de cada hecho, (4) listar **dimensiones** y **métricas**, (5) explicar cómo manejarías los **cambios** (SCD2) y la **carga incremental**.
:::



<!-- estandar:errores -->
:::errores
- **No definir el grano**: si la tabla de hechos mezcla filas "por pedido" y "por línea de pedido", cualquier suma da mal. Escribe el grano en una frase antes de empezar: "una fila por línea de pedido".
- **Métricas de distinto grano en la misma tabla**: el costo de envío es por pedido; si lo pones en cada línea, se suma una vez por producto.
- **Dimensiones con claves duplicadas**: si `dim_producto` tiene dos filas para el mismo producto, cada venta se cuenta dos veces al unir.
- **Sobrescribir historia que el negocio necesitaba**: actualizar el segmento del cliente (SCD 1) cambia también los reportes de años anteriores. Pregunta antes si la historia importa.
:::

<!-- estandar:trabajo -->
:::trabajo
- El esquema estrella (Kimball) sigue siendo el modelo más usado en analítica, también en lakehouses: la capa gold suele ser un conjunto de tablas `fct_` y `dim_` construidas con dbt.
- Antes de modelar, se hace una sesión con el negocio para listar las **preguntas** que el modelo tiene que responder. El modelo se diseña desde las preguntas, no desde las tablas de origen.
- Las SCD tipo 2 se implementan con los **snapshots** de dbt o con `MERGE` en Delta Lake. Las vas a construir en esos módulos.
:::

## Ejercicios

:::ejercicio sql
Construye una **tabla de hechos** de ventas con grano “una fila por línea de pedido” para pedidos no cancelados, con: `detalle_id`, `pedido_id`, `fecha` (fecha del pedido), `cliente_id`, `producto_id`, `canal`, `unidades` (cantidad), `importe_bruto` (cantidad × precio, redondeado a 2) e `importe_neto` (con descuento, redondeado a 2).
```sql solucion
SELECT d.detalle_id, d.pedido_id, p.fecha_pedido AS fecha, p.cliente_id, d.producto_id, p.canal,
       d.cantidad AS unidades,
       ROUND(d.cantidad * d.precio_unitario, 2) AS importe_bruto,
       ROUND(d.cantidad * d.precio_unitario * (1 - d.descuento), 2) AS importe_neto
FROM detalle_pedidos d JOIN pedidos p ON p.pedido_id = d.pedido_id
WHERE p.estado <> 'cancelado';
```
:::

:::ejercicio sql
Construye una **dimensión de producto** desnormalizada: `producto_id`, `producto` (nombre), `marca`, `subcategoria` (nombre de su categoría) y `categoria` (nombre de la categoría **padre** de esa subcategoría; si no tiene padre, la propia subcategoría).
```sql solucion
SELECT p.producto_id, p.nombre AS producto, p.marca, c.nombre AS subcategoria,
       COALESCE(padre.nombre, c.nombre) AS categoria
FROM productos p
JOIN categorias c ON c.categoria_id = p.categoria_id
LEFT JOIN categorias padre ON padre.categoria_id = c.categoria_padre_id;
```
```pista
Une `categorias` dos veces: una para la subcategoría y otra (LEFT JOIN) para su padre.
```
:::

:::ejercicio quiz
En una tabla de hechos `fct_pedidos` (una fila por pedido) agregas la columna `unidades` de cada **producto**. ¿Cuál es el problema?

- [ ] Ninguno, es más eficiente
- [x] Mezclas granularidades: un pedido tiene varios productos, así que las filas se duplican o los totales se distorsionan
- [ ] Los pedidos no tienen unidades
- [ ] SQL no permite esa columna
:::

:::ejercicio quiz
Un cliente cambia de segmento de “Pyme” a “Corporativo”. Necesitas que los informes de ventas **pasadas** sigan mostrando “Pyme”. ¿Qué técnica usas?

- [ ] SCD tipo 1
- [x] SCD tipo 2
- [ ] Borrar el cliente y crearlo de nuevo
- [ ] Un índice
:::

:::ejercicio sql ordenado dificultad=Intermedio
Arma las primeras filas de una **dimensión de fechas**: los 7 primeros días de 2024 con `fecha`, `anio`, `mes` (enteros) y `dia_semana` (0 = domingo … 6 = sábado, entero). Ordena por fecha.
```pista
Una CTE recursiva genera las fechas; `strftime` extrae cada parte.
```
```sql solucion
WITH RECURSIVE d(fecha) AS (
  SELECT '2024-01-01' UNION ALL SELECT date(fecha, '+1 day') FROM d WHERE fecha < '2024-01-07'
)
SELECT fecha,
       CAST(strftime('%Y', fecha) AS INTEGER) AS anio,
       CAST(strftime('%m', fecha) AS INTEGER) AS mes,
       CAST(strftime('%w', fecha) AS INTEGER) AS dia_semana
FROM d
ORDER BY fecha;
```
:::

:::ejercicio sql dificultad=Avanzado
La tabla `dim_cliente_scd` (ya creada por el ejercicio) es una dimensión **SCD tipo 2**: cada cambio de segmento abre una versión nueva. Muestra la versión **vigente** de cada cliente: `cliente_id` y `segmento`.
```sql setup
CREATE TABLE dim_cliente_scd (cliente_key INTEGER PRIMARY KEY, cliente_id INTEGER, segmento TEXT, vigente_desde TEXT, vigente_hasta TEXT);
INSERT INTO dim_cliente_scd VALUES (1, 10, 'Consumidor', '2022-01-01', '2023-06-30'), (2, 10, 'Pyme', '2023-07-01', NULL), (3, 11, 'Pyme', '2022-03-01', NULL), (4, 12, 'Consumidor', '2022-05-01', '2024-01-31'), (5, 12, 'Corporativo', '2024-02-01', NULL)
```
```pista
La versión vigente es la que no tiene fecha de fin.
```
```sql solucion
SELECT cliente_id, segmento FROM dim_cliente_scd WHERE vigente_hasta IS NULL;
```
:::

:::ejercicio sql dificultad=Avanzado
Con la misma `dim_cliente_scd`, muestra qué `segmento` tenía cada cliente el **15 de enero de 2024**. Columnas: `cliente_id`, `segmento`.
```sql setup
CREATE TABLE dim_cliente_scd (cliente_key INTEGER PRIMARY KEY, cliente_id INTEGER, segmento TEXT, vigente_desde TEXT, vigente_hasta TEXT);
INSERT INTO dim_cliente_scd VALUES (1, 10, 'Consumidor', '2022-01-01', '2023-06-30'), (2, 10, 'Pyme', '2023-07-01', NULL), (3, 11, 'Pyme', '2022-03-01', NULL), (4, 12, 'Consumidor', '2022-05-01', '2024-01-31'), (5, 12, 'Corporativo', '2024-02-01', NULL)
```
```pista
La fecha tiene que caer entre `vigente_desde` y `vigente_hasta`; si `vigente_hasta` es NULL, la versión sigue abierta.
```
```sql solucion
SELECT cliente_id, segmento
FROM dim_cliente_scd
WHERE vigente_desde <= '2024-01-15' AND (vigente_hasta IS NULL OR vigente_hasta >= '2024-01-15');
```
:::

:::ejercicio quiz dificultad=Básico
En una tabla de hechos de ventas con el grano “una línea de ticket”, ¿cuál de estas columnas **no** debería estar?

- [ ] `producto_key`
- [ ] `cantidad`
- [x] `total_del_mes_del_cliente`
- [ ] `fecha_key`
```explicacion
Un total mensual es de otro grano. Si lo guardas en cada línea, al sumarlo lo multiplicas por la cantidad de líneas.
```
:::

:::ejercicio quiz dificultad=Intermedio
Un cliente cambia de ciudad y el área comercial quiere que las ventas viejas sigan contando en la ciudad anterior. ¿Qué tipo de dimensión lentamente cambiante usas?

- [ ] Tipo 1: sobrescribir la ciudad
- [x] Tipo 2: agregar una versión nueva con vigencia
- [ ] Tipo 0: no permitir cambios
- [ ] Ninguna: se borra al cliente y se crea otro
:::

:::ejercicio quiz dificultad=Intermedio
¿Por qué las tablas de hechos usan claves sustitutas (`cliente_key`) en lugar del `cliente_id` del sistema de origen?

- [ ] Porque los números enteros ocupan menos que los textos
- [x] Porque permiten varias versiones del mismo cliente (SCD 2) y aíslan el almacén de los cambios del sistema de origen
- [ ] Porque el `cliente_id` es un dato sensible
- [ ] Porque los motores no permiten JOIN por claves naturales
:::
