---
titulo: Preparar los datos para que Genie responda bien
nivel: Intermedio
duracion: 55
resumen: El trabajo del data engineer antes de crear un agente - pocas tablas bien elegidas, descripciones en Unity Catalog, nombres de columnas claros, claves primarias y foráneas, vistas que ya traen los joins hechos y vistas de métricas (metric views) que definen cada indicador una sola vez. Con ejercicios sobre la base de la tienda.
objetivos: Elegir las tablas de un agente según su tema | Escribir descripciones de tablas y columnas que ayuden a Genie | Crear una vista desnormalizada para simplificar | Explicar qué es una vista de métricas y escribir una en YAML | Declarar claves para que Genie arme bien los joins
prerrequisitos: genie-que-es-genie | sql-joins
autoevaluacion: ¿Sabes por qué conviene dar a Genie cinco tablas y no cincuenta? | ¿Sabes qué ventaja tiene una vista de métricas frente a una vista común? | ¿Sabes escribir un COMMENT útil para una columna?
---

:::escenario
El primer intento de agente de ventas de Tienda Andina incluyó 40 tablas "por las dudas". A la pregunta "¿cuánto vendimos en Chile?", Genie sumó la columna `monto` de la tabla `pagos` (que incluye pagos rechazados) en lugar del importe neto de `detalle_pedidos`. No fue un error del modelo: tenía 40 tablas, tres columnas que se llamaban parecido y ninguna descripción. Esta lección es sobre preparar los datos para que eso no pase.
:::

## La regla principal: pocas tablas, bien documentadas

La guía de buenas prácticas de Databricks resume la preparación en tres ideas:

1. **Enfoque**: incluir solo las tablas necesarias para las preguntas del tema. La recomendación es **cinco o menos** para empezar (el máximo es 50 tablas, vistas o vistas de métricas por agente).
2. **Documentación**: Genie usa los **nombres y las descripciones de Unity Catalog** para elegir columnas. Descripciones claras y precisas mejoran directamente la exactitud.
3. **Simplificación**: resolver las ambigüedades y **pre-unir** (desnormalizar) las tablas con vistas o vistas de métricas, quitando columnas que no aportan.

Fíjate que las tres son tareas de ingeniería de datos, no de "IA". El modelo de lenguaje es tan bueno como el contexto que le preparas.

## Paso 1: elegir las tablas según el tema

Un agente responde preguntas de **un tema para un público**: "ventas para el área comercial", no "todo para todos". Para el agente de ventas de la tienda:

| Tabla | ¿Va? | Por qué |
|---|---|---|
| `pedidos`, `detalle_pedidos` | Sí, en una vista | Son las ventas |
| `clientes`, `productos`, `categorias` | Sí, sus columnas útiles dentro de la vista | Dan país, segmento y categoría para agrupar |
| `pagos` | No | Tiene `monto` con pagos rechazados: confunde con las ventas |
| `empleados`, `eventos_web`, `envios` | No | Son otros temas (otro agente) |

## Paso 2: descripciones que ayudan

En Unity Catalog, cada tabla y columna puede tener un comentario. Genie lo lee como si fuera la documentación que le das a un analista nuevo:

```sql norun
COMMENT ON TABLE ventas.gold.ventas_lineas IS
  'Una fila por línea de pedido (producto dentro de un pedido). Incluye pedidos de 2022 a 2024 de todos los canales. Para ventas, usar importe_neto y excluir estado = cancelado.';

ALTER TABLE ventas.gold.ventas_lineas ALTER COLUMN importe_neto COMMENT
  'Importe de la línea en dólares, después del descuento: cantidad * precio_unitario * (1 - descuento). Es la medida de "ventas" del negocio.';

ALTER TABLE ventas.gold.ventas_lineas ALTER COLUMN canal COMMENT
  'Canal de venta. Valores: web, app, tienda (local físico), telefono.';
```

Qué hace buena a una descripción:

- Dice **qué es una fila** (el grano): "una fila por línea de pedido". Así Genie sabe que para contar pedidos tiene que usar `COUNT(DISTINCT pedido_id)`.
- Dice **cómo se usa** para el negocio: "para ventas, usar importe_neto y excluir cancelados".
- Lista los **valores posibles** de las columnas de categorías, con su significado.
- Es corta y concreta. La documentación advierte que hay que **revisar las descripciones generadas por IA** antes de aceptarlas: suelen ser genéricas.

:::tip Nombres de columnas
`importe_neto` es mejor que `imp2`; `fecha_pedido` es mejor que `fecha`. Si no puedes cambiar el nombre en la tabla, cámbialo en la vista que le das a Genie (paso 3).
:::

## Paso 3: una vista que ya trae los joins

Cada join que Genie tiene que adivinar es una oportunidad de error (¿se une por `cliente_id` o por `id`?, ¿uno a muchos?). Una **vista desnormalizada** entrega las columnas útiles ya unidas, con nombres claros:

```sql
SELECT d.detalle_id,
       p.pedido_id,
       date(p.fecha_pedido)              AS fecha,
       substr(p.fecha_pedido, 1, 7)      AS mes,
       p.canal,
       p.estado,
       c.pais,
       c.segmento,
       cat.nombre                        AS categoria,
       pr.nombre                         AS producto,
       d.cantidad,
       ROUND(d.cantidad * d.precio_unitario * (1 - d.descuento), 2) AS importe_neto
FROM detalle_pedidos d
JOIN pedidos p       ON p.pedido_id = d.pedido_id
JOIN clientes c      ON c.cliente_id = p.cliente_id
JOIN productos pr    ON pr.producto_id = d.producto_id
JOIN categorias cat  ON cat.categoria_id = pr.categoria_id
LIMIT 5;
```

En Databricks sería `CREATE VIEW ventas.gold.ventas_lineas AS SELECT ...` (sin el `LIMIT`). Con esa vista, la pregunta "¿cuánto vendimos en Chile en marzo?" se responde con una sola tabla, un filtro y una suma: mucho menos margen de error.

## Paso 4: claves primarias y foráneas

Cuando sí hay varias tablas, Unity Catalog permite declarar **claves primarias y foráneas** (son informativas: no impiden insertar datos duplicados, pero documentan la relación). Según la documentación, Genie las lee y las guarda automáticamente como **relaciones de join** del agente:

```sql norun
ALTER TABLE ventas.silver.pedidos ADD CONSTRAINT pk_pedidos PRIMARY KEY (pedido_id);
ALTER TABLE ventas.silver.pedidos ADD CONSTRAINT fk_pedidos_clientes
  FOREIGN KEY (cliente_id) REFERENCES ventas.silver.clientes (cliente_id);
```

## Paso 5: vistas de métricas, definir cada indicador una sola vez

Una vista común "congela" los cálculos: si la vista agrupa por mes, no puedes pedirle el total por país. Una **vista de métricas** (*metric view*) separa dos cosas:

- **Campos** (*fields*, antes llamados *dimensions*): por qué se puede agrupar o filtrar (mes, país, canal).
- **Medidas** (*measures*): los cálculos (ventas netas, pedidos, ticket promedio), definidos una sola vez.

Quien consulta elige cualquier combinación de campos y el motor calcula bien cada medida. La documentación las describe como la implementación central de la semántica en Unity Catalog, y recomienda especialmente usarlas con Genie porque traen las métricas ya definidas. Se crean con SQL y una definición en YAML:

```sql norun
CREATE OR REPLACE VIEW ventas.gold.metricas_ventas
WITH METRICS
LANGUAGE YAML
AS $$
version: 1.1
source: ventas.gold.ventas_lineas
filter: estado <> 'cancelado'
comment: Métricas de ventas de Tienda Andina. Excluye pedidos cancelados.
fields:
  - name: mes
    expr: mes
    display_name: Mes
  - name: pais
    expr: pais
    display_name: País
    synonyms: [país del cliente, mercado]
  - name: canal
    expr: canal
    display_name: Canal
measures:
  - name: ventas_netas
    expr: SUM(importe_neto)
    display_name: Ventas netas
    synonyms: [ventas, facturación, ingresos]
  - name: pedidos
    expr: COUNT(DISTINCT pedido_id)
    display_name: Pedidos
  - name: ticket_promedio
    expr: MEASURE(ventas_netas) / MEASURE(pedidos)
    display_name: Ticket promedio
    synonyms: [ticket medio, valor promedio del pedido]
$$;
```

Línea por línea, lo importante:

- `WITH METRICS LANGUAGE YAML AS $$ ... $$`: le dice a Databricks que es una vista de métricas definida en YAML.
- `source`: la tabla o vista de origen (la vista desnormalizada del paso 3).
- `filter`: un filtro que se aplica siempre (aquí, sin cancelados). Así nadie se olvida de él.
- `fields`: las columnas por las que se puede agrupar, con un nombre visible y **sinónimos** (palabras que usa la gente).
- `measures`: los cálculos. `ticket_promedio` reutiliza las otras dos con `MEASURE(...)`: si mañana cambia la definición de ventas netas, el ticket se actualiza solo. Fíjate que es una **razón de sumas** (lección de KPIs del módulo de análisis), no un promedio de promedios.

Para consultarla se usa `MEASURE()` y se agrupa por los campos que quieras:

```sql norun
SELECT pais, MEASURE(ventas_netas) AS ventas, MEASURE(ticket_promedio) AS ticket
FROM ventas.gold.metricas_ventas
GROUP BY pais
ORDER BY ventas DESC;
```

Cuando una vista de métricas se agrega a un Genie Agent, Genie usa esas definiciones: "ticket promedio" siempre significa lo mismo, en Genie, en los tableros y en las herramientas de BI que la consulten.

:::errores
- **Agregar tablas "por las dudas"**: más tablas, más columnas parecidas, más errores. Empieza con cinco o menos.
- **Tablas sin descripciones**, o con descripciones generadas por IA sin revisar.
- **Dejar a Genie adivinar los joins** cuando una vista podría traerlos hechos.
- **Columnas con el mismo nombre en tablas distintas** con significados distintos (`monto` en pagos y en pedidos). Renómbralas en la vista.
- **Definir el mismo indicador de dos formas** (en una vista y en una instrucción del agente): Genie puede elegir cualquiera. Una sola definición, idealmente en una vista de métricas.
:::

:::trabajo
- Preparar las vistas y vistas de métricas "para Genie" es cada vez más una tarea del data engineer o analytics engineer: es la misma capa gold de siempre, pero pensada para que la consulte un modelo de lenguaje además de una persona.
- Las descripciones de columnas se mantienen como código: en dbt van en el YAML del modelo y se publican en Unity Catalog con `persist_docs`.
- Las vistas de métricas también sirven a Power BI, Tableau y los tableros de AI/BI: una sola definición para toda la empresa.
:::

:::entrevista "¿Qué harías con los datos antes de darle acceso a Genie a un equipo de negocio?"
Elegiría pocas tablas del tema del equipo y las simplificaría en una vista desnormalizada con nombres claros y sin columnas confusas o sensibles. Escribiría descripciones en Unity Catalog que digan el grano de cada tabla, cómo se usa cada columna y sus valores posibles, y declararía claves primarias y foráneas. Definiría los indicadores en una vista de métricas para que tengan una sola definición, con sinónimos del lenguaje del negocio, y revisaría los permisos y los filtros de filas en Unity Catalog.
:::

## Ejercicios

:::ejercicio sql dificultad=Intermedio titulo="La vista para el agente de ventas"
Escribe la consulta que definiría la vista para Genie: una fila por línea de pedido **no cancelado**, con `pedido_id`, `mes` (los 7 primeros caracteres de `fecha_pedido`), `canal`, `pais` (del cliente), `categoria` (el nombre de la categoría del producto) e `importe_neto` (cantidad × precio unitario × (1 − descuento), redondeado a 2). Une `detalle_pedidos`, `pedidos`, `clientes`, `productos` y `categorias`.
```sql solucion
SELECT p.pedido_id,
       substr(p.fecha_pedido, 1, 7) AS mes,
       p.canal,
       c.pais,
       cat.nombre AS categoria,
       ROUND(d.cantidad * d.precio_unitario * (1 - d.descuento), 2) AS importe_neto
FROM detalle_pedidos d
JOIN pedidos p ON p.pedido_id = d.pedido_id
JOIN clientes c ON c.cliente_id = p.cliente_id
JOIN productos pr ON pr.producto_id = d.producto_id
JOIN categorias cat ON cat.categoria_id = pr.categoria_id
WHERE p.estado <> 'cancelado';
```
```pista
Parte de `detalle_pedidos` (una fila por línea) y une hacia afuera: pedido, cliente, producto y categoría. El filtro de cancelados va en `pedidos.estado`.
```
:::

:::ejercicio sql dificultad=Intermedio titulo="La medida ticket promedio, bien calculada"
Sobre la misma lógica, calcula por `pais` el `ticket_promedio` como en la vista de métricas: ventas netas totales ÷ pedidos distintos (sin cancelados), redondeado a 2. Devuelve `pais` y `ticket_promedio`, ordenado por `pais`.
```sql solucion
SELECT c.pais,
       ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)) / COUNT(DISTINCT p.pedido_id), 2) AS ticket_promedio
FROM detalle_pedidos d
JOIN pedidos p ON p.pedido_id = d.pedido_id
JOIN clientes c ON c.cliente_id = p.cliente_id
WHERE p.estado <> 'cancelado'
GROUP BY c.pais
ORDER BY c.pais;
```
```pista
Es una razón de sumas: `SUM(importe) / COUNT(DISTINCT pedido_id)`. No promedies los importes de las líneas: un pedido con 5 líneas pesaría 5 veces.
```
:::

:::ejercicio quiz dificultad=Básico
¿Qué recomienda la documentación sobre la cantidad de tablas de un agente nuevo?

- [ ] Todas las tablas de la empresa, para que Genie elija
- [x] Las mínimas necesarias para su tema, idealmente cinco o menos (el máximo es 50)
- [ ] Exactamente 50
- [ ] Una sola, siempre
:::

:::ejercicio quiz dificultad=Intermedio
¿Qué ventaja tiene una vista de métricas frente a una vista común con `GROUP BY mes`?

- [ ] Es más rápida siempre
- [x] Define cada medida una vez y permite agruparla por cualquiera de sus campos; la vista común queda fija en el grano que eligió
- [ ] No necesita Unity Catalog
- [ ] No usa SQL
:::

:::ejercicio quiz dificultad=Intermedio
¿Cuál de estas descripciones de columna ayuda más a Genie?

- [ ] "Columna de importe"
- [ ] "Generada automáticamente"
- [x] "Importe de la línea en dólares después del descuento. Es la medida de ventas del negocio; excluir pedidos cancelados."
- [ ] "imp_net"
:::
