---
titulo: Pruebas de datos que devuelven las filas culpables
nivel: Avanzado
duracion: 60
resumen: Una prueba de datos bien escrita es una consulta que devuelve las filas que rompen una regla - si devuelve cero filas, la prueba pasa. Escribes las pruebas clásicas (unicidad, valores aceptados, relaciones, frescura, registros de prueba en producción) sobre la capa bronze, y una conciliación entre dos sistemas con una tolerancia explícita.
objetivos: Escribir pruebas como consultas que devuelven las filas que fallan | Implementar a mano las pruebas unique, accepted_values y relationships que trae dbt | Medir la frescura contra un momento de referencia | Conciliar dos fuentes con una tolerancia y explicar cada diferencia | Decidir qué prueba frena el pipeline y cuál solo avisa
prerrequisitos: calidad-perfilar-una-tabla | dbt-tests-docs
autoevaluacion: ¿Por qué conviene que una prueba devuelva filas y no un "sí/no"? | ¿Cómo encuentras registros huérfanos? | ¿Qué tolerancia usarías al conciliar montos y por qué? | ¿Qué pruebas deberían frenar el pipeline?
---

:::analogia En palabras simples
Un control de calidad en una fábrica no dice solo "hay piezas malas": separa **cuáles** son, para poder revisarlas. Una prueba de datos que devuelve las filas culpables hace lo mismo: cuando falla, ya tienes en la mano los registros para investigar.
:::

## La forma de una prueba

Así funcionan los tests de dbt por dentro (lo viste en [dbt: tests y documentación](#/l/dbt-tests-docs)): cada test se compila a una consulta que busca **violaciones**. Cero filas significa "pasa".

```diagrama
titulo: Una prueba es una consulta que busca violaciones: cero filas = pasa
nodo r: Regla | icono=reglas | col=0 | fila=1 | color=violeta | sub=pedido_id es único
nodo q: Consulta de violaciones | icono=codigo | col=1 | fila=1 | color=azul | sub=GROUP BY pedido_id HAVING COUNT(*) > 1
nodo ok: 0 filas | icono=check | col=2 | fila=0 | color=verde | sub=la prueba pasa
nodo mal: N filas | icono=x | col=2 | fila=2 | color=rojo | sub=falla, y ya tienes las culpables
nodo inv: Investigar | icono=lupa | col=3 | fila=2 | color=naranja
flecha r -> q | explica=La regla se escribe como una consulta que busca lo que no debería existir: pedidos con el mismo id más de una vez.
flecha q -> ok | explica=Si devuelve cero filas, no hay violaciones: la prueba pasa.
flecha q -> mal | explica=Si devuelve filas, la prueba falla, y esas filas son justamente los casos culpables.
flecha mal -> inv | explica=Con las filas en la mano se investiga la causa (un reintento, un cambio en la fuente) en lugar de adivinar.
```

| Prueba | La consulta devuelve… |
|---|---|
| `unique` | Las claves que aparecen más de una vez |
| `not_null` | Las filas con la columna nula |
| `accepted_values` | Las filas con un valor fuera de la lista |
| `relationships` | Las filas cuya clave no existe en la tabla de referencia (huérfanas) |
| Frescura | Una fila si el último dato es más viejo que el límite |
| Regla de negocio propia | Lo que tú definas: pagos antes del pedido, montos negativos… |

```sql
-- relationships: pedidos de bronze cuyo email no corresponde a ningún cliente
SELECT b.registro_id, b.cliente_email
FROM bronze_pedidos b
WHERE b.cliente_email IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM clientes c WHERE c.email = LOWER(TRIM(b.cliente_email)));
```

:::tip Normaliza antes de comparar
`'  ANA@CORREO.COM '` y `'ana@correo.com'` son el mismo cliente. Si la prueba compara el texto crudo, devuelve falsos positivos. Aplica la misma normalización (`LOWER(TRIM())`) que vas a usar en silver.
:::

## Frescura: contra un momento de referencia

"¿Están frescos los datos?" siempre se responde **respecto de un momento**: en producción es `CURRENT_TIMESTAMP`; en un ejercicio reproducible fijas uno. La diferencia en horas se calcula con `julianday`: `(julianday(ahora) - julianday(ultima_carga)) * 24`.

## Conciliación: dos sistemas que deberían coincidir

Conciliar es comparar el mismo hecho medido en dos lugares: el total de cada pedido según el detalle de productos y según los pagos aprobados. En la tienda, la mayoría coincide; algunos difieren en **un centavo**.

¿Es un error? No: el sistema de pagos redondea el total una vez, y el detalle suma líneas con decimales largos. Por eso toda conciliación de montos necesita una **tolerancia explícita**, escrita en la regla: "diferencias de hasta 0,01 por pedido se aceptan; más que eso es un incidente".

:::cuidado Comparar decimales con igualdad
`pagado = total` con números de punto flotante falla por diferencias de millonésimas que no ves. Compara montos redondeados (`ROUND(x, 2)`) o usa una tolerancia: `ABS(pagado - total) <= 0.01`.
:::

## ¿Frena o avisa?

| Severidad | Cuándo | Ejemplo |
|---|---|---|
| **Error** (frena el pipeline) | El dato roto llega a decisiones o rompe lo que sigue | Claves duplicadas en una tabla de hechos, montos nulos en facturación |
| **Advertencia** (avisa y sigue) | Conviene saberlo, pero publicar es mejor que no publicar | Un estado nuevo que nadie mapeó todavía, 1 % de emails desconocidos |

En dbt esto es `severity: warn` o `error`; en Lakeflow Declarative Pipelines, las expectativas `ON VIOLATION FAIL UPDATE`, `DROP ROW` o solo registrar ([documentación de expectativas](https://docs.databricks.com/aws/en/ldp/expectations)).

:::practica sql Cuatro pruebas sobre bronze en una sola corrida
1. Ejecuta: cada bloque es una prueba que devuelve su cantidad de filas culpables.
2. Identifica cuáles fallan (más de 0) y decide para cada una si frenaría el pipeline o solo avisaría.
3. Cambia la prueba de valores aceptados para que acepte también `en_disputa` y vuelve a ejecutar.

```sql
SELECT 'unique pedido_id' AS prueba, COUNT(*) AS fallas
FROM (SELECT pedido_id FROM bronze_pedidos GROUP BY pedido_id HAVING COUNT(*) > 1)
UNION ALL
SELECT 'not_null monto', COUNT(*) FROM bronze_pedidos WHERE monto IS NULL
UNION ALL
SELECT 'accepted_values estado', COUNT(*) FROM bronze_pedidos
WHERE LOWER(TRIM(estado)) NOT IN ('entregado', 'enviado', 'pendiente', 'cancelado', 'devuelto',
                                  'delivered', 'shipped', 'pending', 'canceled', 'returned')
UNION ALL
SELECT 'relationships cliente', COUNT(*) FROM bronze_pedidos b
WHERE b.cliente_email IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM clientes c WHERE c.email = LOWER(TRIM(b.cliente_email)));
```

Reto: agrega una quinta prueba, "pedidos de prueba de QA en producción", que cuente las filas con email que empieza con `qa+`.

Documentación oficial: [Data tests (dbt)](https://docs.getdbt.com/docs/build/data-tests) · [Expectativas (Databricks)](https://docs.databricks.com/aws/en/ldp/expectations)
:::

:::errores
- **Pruebas que solo dicen "falló".** Devuelve las filas: la investigación empieza sola.
- **Comparar texto sin normalizar.** Da falsos positivos y la gente deja de mirar las alertas.
- **Igualdad exacta entre decimales.** Usa redondeo o tolerancia.
- **Todo es error.** Si todas las pruebas frenan el pipeline, un detalle menor deja a toda la empresa sin datos.
:::

:::entrevista
**Pregunta:** "¿Qué pruebas pondrías en una tabla de hechos de ventas?"

**Respuesta modelo:** "Unicidad de la clave del grano (por ejemplo `pedido_id`, línea), no nulos en las claves y en el monto, relaciones contra cada dimensión para no tener huérfanos, valores aceptados en estado y canal, una regla de negocio como monto no negativo, frescura del último día cargado y una conciliación diaria del total contra el sistema de origen con una tolerancia. Las de clave y monto frenan; valores nuevos y frescura leve avisan."
:::

## Ejercicios

:::ejercicio sql dificultad=Avanzado titulo="Prueba unique: pedidos repetidos"
Escribe la prueba de unicidad de `pedido_id` en `bronze_pedidos`: devuelve cada pedido que aparece más de una vez y cuántas copias tiene. Columnas: `pedido_id`, `copias`.
```sql solucion
SELECT pedido_id, COUNT(*) AS copias
FROM bronze_pedidos
GROUP BY pedido_id
HAVING COUNT(*) > 1;
```
```pista
Agrupa por la clave y quédate con los grupos de más de una fila con `HAVING`.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="Prueba accepted_values: estados sin mapear"
Devuelve las filas de `bronze_pedidos` cuyo estado, **ya normalizado** (minúsculas, sin espacios y traducido: `delivered`→`entregado`, `shipped`→`enviado`, `pending`→`pendiente`, `canceled`→`cancelado`, `returned`→`devuelto`), no está entre `entregado`, `enviado`, `pendiente`, `cancelado` y `devuelto`. Columnas: `registro_id`, `estado` (el valor original).
```sql solucion
SELECT registro_id, estado
FROM bronze_pedidos
WHERE CASE LOWER(TRIM(estado))
        WHEN 'delivered' THEN 'entregado' WHEN 'shipped' THEN 'enviado'
        WHEN 'pending' THEN 'pendiente' WHEN 'canceled' THEN 'cancelado'
        WHEN 'returned' THEN 'devuelto' ELSE LOWER(TRIM(estado))
      END NOT IN ('entregado', 'enviado', 'pendiente', 'cancelado', 'devuelto');
```
```pista
Normaliza con `CASE LOWER(TRIM(estado)) WHEN 'delivered' THEN 'entregado' ... ELSE LOWER(TRIM(estado)) END` y compara ese resultado con `NOT IN (...)`.
```
```pista
Lo que aparece es el estado nuevo `en_disputa`, que llegó con un cambio en octubre: nadie lo mapeó todavía.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="Prueba relationships: clientes desconocidos"
Devuelve las filas de `bronze_pedidos` con email informado que no corresponde a ningún cliente de `clientes`, comparando el email normalizado (`LOWER(TRIM())`). Columnas: `registro_id`, `cliente_email`.
```sql solucion
SELECT b.registro_id, b.cliente_email
FROM bronze_pedidos b
WHERE b.cliente_email IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM clientes c WHERE c.email = LOWER(TRIM(b.cliente_email)));
```
```pista
`NOT EXISTS` con la comparación normalizada. Excluye los emails nulos: son otra prueba (`not_null`).
```
:::

:::ejercicio sql dificultad=Intermedio titulo="Pedidos de prueba que llegaron a producción"
Los pedidos del equipo de QA tienen email que empieza con `qa+` o `pedido_id` de 900000 en adelante. Devuélvelos. Columnas: `registro_id`, `pedido_id`, `cliente_email`, `monto`.
```sql solucion
SELECT registro_id, pedido_id, cliente_email, monto
FROM bronze_pedidos
WHERE cliente_email LIKE 'qa+%' OR pedido_id >= 900000;
```
```pista
`LIKE 'qa+%'`: el `+` no es especial en `LIKE`, solo `%` y `_` lo son.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="Frescura de la última carga"
Calcula cuántas horas pasaron entre la última carga de `bronze_pedidos` (`MAX(cargado_en)`) y el momento de referencia `'2025-01-06 08:00:00'`, redondeado a 1 decimal, y si cumple el acuerdo de frescura de 24 horas (`'ok'` o `'atrasado'`). Columnas: `ultima_carga`, `horas`, `estado`.
```sql solucion
WITH u AS (SELECT MAX(cargado_en) AS ultima_carga FROM bronze_pedidos)
SELECT ultima_carga,
       ROUND((julianday('2025-01-06 08:00:00') - julianday(ultima_carga)) * 24, 1) AS horas,
       CASE WHEN (julianday('2025-01-06 08:00:00') - julianday(ultima_carga)) * 24 <= 24 THEN 'ok' ELSE 'atrasado' END AS estado
FROM u;
```
```pista
La diferencia de `julianday` está en días: multiplícala por 24 para tenerla en horas.
```
:::

:::ejercicio sql dificultad=Experto titulo="Conciliar pagos contra el detalle"
Para cada pedido con pagos aprobados, compara el total del detalle (`cantidad * precio_unitario * (1 - descuento)`) con la suma de los pagos aprobados, **ambos redondeados a 2 decimales**, y devuelve los pedidos donde no coinciden, con la diferencia (pagado menos total). Columnas: `pedido_id`, `total`, `pagado`, `diferencia`.
```sql solucion
WITH t AS (
  SELECT pedido_id, ROUND(SUM(cantidad * precio_unitario * (1 - descuento)), 2) AS total
  FROM detalle_pedidos GROUP BY pedido_id
),
pg AS (
  SELECT pedido_id, ROUND(SUM(monto), 2) AS pagado
  FROM pagos WHERE estado = 'aprobado' GROUP BY pedido_id
)
SELECT t.pedido_id, t.total, pg.pagado, ROUND(pg.pagado - t.total, 2) AS diferencia
FROM t JOIN pg ON pg.pedido_id = t.pedido_id
WHERE ROUND(pg.pagado - t.total, 2) <> 0;
```
```pista
Dos CTE al mismo grano (una fila por pedido): el total del detalle y lo pagado. Únelas por `pedido_id`.
```
```pista
Todas las diferencias que encuentres son de ±0,01: es redondeo, no un error. Por eso la regla de conciliación debe tener una tolerancia escrita.
```
:::
