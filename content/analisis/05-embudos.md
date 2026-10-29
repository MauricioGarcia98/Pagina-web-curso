---
titulo: Embudos de conversión - dónde se pierden los clientes
nivel: Avanzado
duracion: 50
resumen: Medir un proceso de varios pasos - el embudo vista, carrito y compra de la tienda online, con y sin orden entre los pasos, por dispositivo, el tiempo hasta convertir, y el embudo operativo de un pedido de delivery (aceptado, retirado, entregado).
objetivos: Calcular un embudo simple y uno ordenado en el tiempo | Comparar la conversión por segmento | Medir el tiempo entre pasos | Construir el embudo de un proceso operativo
autoevaluacion: ¿Sabes la diferencia entre un embudo con y sin orden? | ¿Sabes calcular la conversión de cada paso y la total? | ¿Sabes en qué paso se pierde más gente?
---

:::escenario
La tienda rediseñó la página de producto. El tablero dice que las compras subieron un 5 %, pero las visitas subieron un 12 %. ¿Mejoró o empeoró? El embudo separa el problema en pasos: cuántos ven, cuántos agregan al carrito y cuántos compran, y en cuál de esos pasos se perdió gente.
:::

## El embudo simple

Para cada paso, cuántos usuarios distintos lo hicieron al menos una vez:

```sql
SELECT COUNT(DISTINCT CASE WHEN tipo_evento = 'vista' THEN cliente_id END) AS vieron,
       COUNT(DISTINCT CASE WHEN tipo_evento = 'agregar_carrito' THEN cliente_id END) AS agregaron,
       COUNT(DISTINCT CASE WHEN tipo_evento = 'compra' THEN cliente_id END) AS compraron
FROM eventos_web
WHERE cliente_id IS NOT NULL;
```

- **Conversión de un paso** = usuarios del paso ÷ usuarios del paso anterior.
- **Conversión total** = usuarios del último paso ÷ usuarios del primero.

## El embudo ordenado

El simple no exige orden: alguien que compró en enero y miró un producto en diciembre cuenta en ambos pasos. El embudo **ordenado** exige que cada paso ocurra **después** del anterior.

```sql
WITH primeros AS (
  SELECT cliente_id,
         MIN(CASE WHEN tipo_evento = 'vista' THEN fecha_hora END) AS t_vista,
         MIN(CASE WHEN tipo_evento = 'agregar_carrito' THEN fecha_hora END) AS t_carrito,
         MIN(CASE WHEN tipo_evento = 'compra' THEN fecha_hora END) AS t_compra
  FROM eventos_web
  WHERE cliente_id IS NOT NULL
  GROUP BY cliente_id
)
SELECT COUNT(t_vista) AS vieron,
       SUM(t_carrito > t_vista) AS carrito_despues_de_ver,
       SUM(t_compra > t_carrito AND t_carrito > t_vista) AS compra_despues_del_carrito
FROM primeros;
```

:::tip Una simplificación honesta
Este embudo ordenado usa el **primer** evento de cada tipo. Un análisis más fino lo haría por sesión o permitiría ventanas de tiempo (por ejemplo, comprar dentro de los 7 días). Lo importante es escribir la regla que usaste.
:::

## El embudo operativo

En un delivery, cada pedido pasa por etapas: creado → aceptado por el restaurante → retirado por el repartidor → entregado. Cada etapa es una columna de tiempo; si es nula, el pedido no llegó a esa etapa.

## Ejercicios

:::ejercicio sql dificultad=Básico
Embudo simple de todos los eventos con cliente identificado: `vieron`, `agregaron` y `compraron` (clientes distintos).
```sql solucion
SELECT COUNT(DISTINCT CASE WHEN tipo_evento = 'vista' THEN cliente_id END) AS vieron,
       COUNT(DISTINCT CASE WHEN tipo_evento = 'agregar_carrito' THEN cliente_id END) AS agregaron,
       COUNT(DISTINCT CASE WHEN tipo_evento = 'compra' THEN cliente_id END) AS compraron
FROM eventos_web WHERE cliente_id IS NOT NULL;
```
:::

:::ejercicio sql dificultad=Intermedio
Con el embudo simple, calcula la conversión de cada paso y la total en porcentaje con 1 decimal: `vista_a_carrito`, `carrito_a_compra`, `total`.
```pista
Calcula los tres conteos en una CTE y divide afuera con `100.0 *`.
```
```sql solucion
WITH f AS (
  SELECT COUNT(DISTINCT CASE WHEN tipo_evento = 'vista' THEN cliente_id END) AS v,
         COUNT(DISTINCT CASE WHEN tipo_evento = 'agregar_carrito' THEN cliente_id END) AS c,
         COUNT(DISTINCT CASE WHEN tipo_evento = 'compra' THEN cliente_id END) AS k
  FROM eventos_web WHERE cliente_id IS NOT NULL
)
SELECT ROUND(100.0 * c / v, 1) AS vista_a_carrito, ROUND(100.0 * k / c, 1) AS carrito_a_compra, ROUND(100.0 * k / v, 1) AS total FROM f;
```
:::

:::ejercicio sql ordenado dificultad=Intermedio
Embudo simple **por dispositivo** (el del evento): `dispositivo`, `vieron`, `compraron` y `conversion` (compraron ÷ vieron, %, 1 decimal). Ordena por conversión de mayor a menor.
```sql solucion
SELECT dispositivo,
       COUNT(DISTINCT CASE WHEN tipo_evento = 'vista' THEN cliente_id END) AS vieron,
       COUNT(DISTINCT CASE WHEN tipo_evento = 'compra' THEN cliente_id END) AS compraron,
       ROUND(100.0 * COUNT(DISTINCT CASE WHEN tipo_evento = 'compra' THEN cliente_id END) / COUNT(DISTINCT CASE WHEN tipo_evento = 'vista' THEN cliente_id END), 1) AS conversion
FROM eventos_web
WHERE cliente_id IS NOT NULL
GROUP BY dispositivo
ORDER BY conversion DESC;
```
:::

:::ejercicio sql ordenado dificultad=Intermedio
Cantidad de eventos por tipo y el porcentaje que hacen los **visitantes anónimos** (sin `cliente_id`) en cada tipo (1 decimal). Columnas: `tipo_evento`, `eventos`, `pct_anonimos`. Ordena por `eventos` de mayor a menor.
```sql solucion
SELECT tipo_evento, COUNT(*) AS eventos, ROUND(100.0 * SUM(CASE WHEN cliente_id IS NULL THEN 1 ELSE 0 END) / COUNT(*), 1) AS pct_anonimos
FROM eventos_web
GROUP BY tipo_evento
ORDER BY eventos DESC;
```
:::

:::ejercicio sql dificultad=Avanzado
Embudo **ordenado** con el primer evento de cada tipo por cliente: `vieron` (tienen vista), `carrito_despues` (su primer carrito es posterior a su primera vista) y `compra_despues` (además, su primera compra es posterior a su primer carrito).
```pista
Una CTE con `MIN(CASE WHEN tipo_evento = '…' THEN fecha_hora END)` por cliente.
```
```pista
Las comparaciones con NULL dan NULL, y `SUM` las ignora: no hace falta filtrar a mano.
```
```sql solucion
WITH t AS (
  SELECT cliente_id,
         MIN(CASE WHEN tipo_evento = 'vista' THEN fecha_hora END) AS v,
         MIN(CASE WHEN tipo_evento = 'agregar_carrito' THEN fecha_hora END) AS c,
         MIN(CASE WHEN tipo_evento = 'compra' THEN fecha_hora END) AS k
  FROM eventos_web WHERE cliente_id IS NOT NULL GROUP BY cliente_id
)
SELECT COUNT(v) AS vieron, SUM(c > v) AS carrito_despues, SUM(k > c AND c > v) AS compra_despues FROM t;
```
:::

:::ejercicio sql dificultad=Avanzado
¿Cuánto tarda un cliente en comprar después de su primera vista? Para los clientes cuya primera compra es posterior a su primera vista, calcula cuántos son y el **promedio** de horas entre una y otra (1 decimal). Columnas: `clientes`, `horas_promedio`.
```pista
`(julianday(k) - julianday(v)) * 24` da horas.
```
```sql solucion
WITH t AS (
  SELECT cliente_id,
         MIN(CASE WHEN tipo_evento = 'vista' THEN fecha_hora END) AS v,
         MIN(CASE WHEN tipo_evento = 'compra' THEN fecha_hora END) AS k
  FROM eventos_web WHERE cliente_id IS NOT NULL GROUP BY cliente_id
)
SELECT COUNT(*) AS clientes, ROUND(AVG((julianday(k) - julianday(v)) * 24), 1) AS horas_promedio FROM t WHERE k > v;
```
:::

:::ejercicio sql ordenado dificultad=Avanzado
Embudo **mensual** de 2024: por mes del evento, clientes distintos que vieron y que compraron en ese mismo mes, y la conversión (%, 1 decimal). Columnas: `mes`, `vieron`, `compraron`, `conversion`. Ordena por mes.
```sql solucion
SELECT strftime('%Y-%m', fecha_hora) AS mes,
       COUNT(DISTINCT CASE WHEN tipo_evento = 'vista' THEN cliente_id END) AS vieron,
       COUNT(DISTINCT CASE WHEN tipo_evento = 'compra' THEN cliente_id END) AS compraron,
       ROUND(100.0 * COUNT(DISTINCT CASE WHEN tipo_evento = 'compra' THEN cliente_id END) / COUNT(DISTINCT CASE WHEN tipo_evento = 'vista' THEN cliente_id END), 1) AS conversion
FROM eventos_web
WHERE cliente_id IS NOT NULL
GROUP BY mes
ORDER BY mes;
```
:::

:::ejercicio sql dificultad=Intermedio
Delivery (Rápido). Embudo operativo de todos los pedidos: `creados` (todos), `aceptados` (con `aceptado` no nulo), `retirados` y `entregados` (con `entregado` no nulo).
```pista
`COUNT(columna)` cuenta los no nulos.
```
```sql solucion
SELECT COUNT(*) AS creados, COUNT(aceptado) AS aceptados, COUNT(retirado) AS retirados, COUNT(entregado) AS entregados FROM delivery_pedidos;
```
:::

:::ejercicio sql ordenado dificultad=Avanzado
Rápido: pedidos perdidos **por etapa** y estado final. Para cada `estado`, cuántos pedidos no llegaron a ser aceptados (`sin_aceptar`), cuántos fueron aceptados pero no retirados (`sin_retirar`) y cuántos fueron retirados pero no entregados (`sin_entregar`). Incluye solo estados distintos de `entregado`. Ordena por `estado`.
```sql solucion
SELECT estado,
       SUM(CASE WHEN aceptado IS NULL THEN 1 ELSE 0 END) AS sin_aceptar,
       SUM(CASE WHEN aceptado IS NOT NULL AND retirado IS NULL THEN 1 ELSE 0 END) AS sin_retirar,
       SUM(CASE WHEN retirado IS NOT NULL AND entregado IS NULL THEN 1 ELSE 0 END) AS sin_entregar
FROM delivery_pedidos
WHERE estado <> 'entregado'
GROUP BY estado
ORDER BY estado;
```
:::

:::ejercicio sql ordenado dificultad=Avanzado
Rápido: conversión de punta a punta (entregados ÷ creados, %, 1 decimal) **por franja horaria** de creación: `almuerzo` (11 a 15 h), `tarde` (15 a 19 h), `cena` (19 a 24 h) y `otra`. Columnas: `franja`, `pedidos`, `conversion`. Ordena por `franja`.
```pista
`CAST(strftime('%H', creado) AS INTEGER)` da la hora como número.
```
```sql solucion
SELECT CASE WHEN CAST(strftime('%H', creado) AS INTEGER) BETWEEN 11 AND 14 THEN 'almuerzo'
            WHEN CAST(strftime('%H', creado) AS INTEGER) BETWEEN 15 AND 18 THEN 'tarde'
            WHEN CAST(strftime('%H', creado) AS INTEGER) BETWEEN 19 AND 23 THEN 'cena'
            ELSE 'otra' END AS franja,
       COUNT(*) AS pedidos,
       ROUND(100.0 * COUNT(entregado) / COUNT(*), 1) AS conversion
FROM delivery_pedidos
GROUP BY franja
ORDER BY franja;
```
:::

:::ejercicio quiz dificultad=Intermedio
En el embudo simple, 1.000 clientes vieron productos y 1.050 compraron. ¿Qué pasa?

- [ ] Un error en los datos: siempre hay menos compras que vistas
- [x] El embudo no exige orden ni que cada paso esté registrado: hay clientes que compraron sin un evento de vista registrado (por ejemplo, desde un enlace directo o la app)
- [ ] La conversión es 105 % y es una gran noticia
- [ ] Hay que usar `COUNT(*)` en lugar de `COUNT(DISTINCT)`
:::
