---
titulo: Pensar como analista - de la pregunta a la consulta
nivel: Básico
duracion: 40
resumen: El método que usan los analistas para no responder rápido y mal - aclarar la pregunta, fijar el grano, escribir la fórmula de la métrica, decidir los filtros, consultar y validar el resultado antes de mostrarlo.
objetivos: Convertir una pregunta vaga en una pregunta medible | Decidir el grano y la fórmula antes de escribir SQL | Elegir qué fecha y qué estados cuentan | Validar un número con controles simples antes de entregarlo
autoevaluacion: ¿Sabes qué preguntas hacer cuando te piden “las ventas del mes”? | ¿Sabes qué es el grano de un resultado? | ¿Sabes al menos dos controles para validar un número?
---

:::escenario
Lunes, 9:05. La gerente comercial escribe por chat: “¿Cuánto vendimos en noviembre?”. Un analista junior responde en dos minutos con un número. Un analista senior responde en diez, con el número, la definición que usó y una advertencia: “incluye pedidos entregados y enviados; si sumamos los pendientes, sube un 4 %”. Este módulo es para llegar a ser el segundo.
:::

## El método en seis pasos

```diagrama
titulo: De la pregunta al número confiable
nodo q: Pregunta | icono=mensaje | col=0 | fila=0 | sub=“¿cuánto vendimos?”
nodo a: Aclarar | icono=lupa | col=1 | fila=0 | sub=qué, cuándo, cuáles
nodo g: Grano y métrica | icono=reglas | col=2 | fila=0 | sub=fila = …, fórmula
nodo s: Consulta | icono=codigo | col=3 | fila=0 | color=azul
nodo v: Validar | icono=check | col=4 | fila=0 | sub=controles | color=verde
nodo c: Comunicar | icono=dashboard | col=5 | fila=0 | sub=número + definición
flecha q -> a
flecha a -> g
flecha g -> s
flecha s -> v
flecha v -> c
```

1. **Aclarar la pregunta.** “Ventas” puede ser cantidad de pedidos, unidades o dinero; bruto o con descuento; con o sin cancelados; por fecha de pedido o de pago.
2. **Fijar el grano del resultado.** ¿Una fila por mes? ¿Por mes y canal? Escribirlo evita sumar dos veces.
3. **Escribir la fórmula de la métrica** en palabras: “ventas = suma de cantidad × precio unitario × (1 − descuento) de las líneas de pedidos no cancelados”.
4. **Decidir los filtros**: rango de fechas (semiabierto), estados, canales, países.
5. **Consultar.**
6. **Validar** antes de entregar: ¿el total cuadra con otra fuente?, ¿hay duplicados?, ¿hay nulos que se perdieron?, ¿el orden de magnitud tiene sentido?

:::tip Escríbelo como comentario
Antes de cada consulta, tres líneas: `-- grano: …`, `-- métrica: …`, `-- filtros: …`. Te obliga a pensar y deja documentada la decisión.
:::

## Un ejemplo completo

“¿Cuánto vendimos en noviembre de 2024?” Supuestos acordados: dinero con descuento, sin pedidos cancelados, por fecha de pedido.

```sql
-- grano: un total (una fila)
-- métrica: ventas = SUM(cantidad * precio_unitario * (1 - descuento))
-- filtros: noviembre 2024 por fecha de pedido, estado distinto de cancelado
SELECT ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS ventas
FROM pedidos p
JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
WHERE p.fecha_pedido >= '2024-11-01' AND p.fecha_pedido < '2024-12-01'
  AND p.estado <> 'cancelado';
```

### Validar: tres controles rápidos

```sql
-- 1) ¿Cuántos pedidos y líneas entraron? (orden de magnitud)
SELECT COUNT(DISTINCT p.pedido_id) AS pedidos, COUNT(*) AS lineas
FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
WHERE p.fecha_pedido >= '2024-11-01' AND p.fecha_pedido < '2024-12-01' AND p.estado <> 'cancelado';

-- 2) ¿Cuánto pesan los estados que dejé afuera o adentro?
SELECT p.estado, COUNT(DISTINCT p.pedido_id) AS pedidos
FROM pedidos p
WHERE p.fecha_pedido >= '2024-11-01' AND p.fecha_pedido < '2024-12-01'
GROUP BY p.estado;

-- 3) ¿Hay pedidos sin líneas de detalle (se perderían en el JOIN)?
SELECT COUNT(*) AS pedidos_sin_detalle
FROM pedidos p LEFT JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
WHERE d.pedido_id IS NULL;
```

:::cuidado El error más caro: el grano mezclado
Si unes `pedidos` con `detalle_pedidos` y después sumas una columna de **pedidos** (por ejemplo, un costo de envío), la sumas una vez por línea. Antes de sumar, pregúntate: ¿esta columna es del grano de la fila que estoy sumando?
:::

## Preguntas para aclarar (cópialas)

| Si te piden… | Pregunta antes de consultar |
|---|---|
| “Las ventas” | ¿Dinero o unidades? ¿Con descuento? ¿Con o sin cancelados y devueltos? |
| “Los clientes” | ¿Registrados o los que compraron? ¿En qué período? |
| “El mes pasado” | ¿Por fecha de pedido, de pago o de entrega? ¿En qué zona horaria? |
| “La tasa de …” | ¿Sobre qué total (el denominador)? |
| “Comparado con antes” | ¿Contra el mes anterior o el mismo mes del año anterior? |

## Ejercicios

Cada enunciado ya trae las definiciones acordadas: respétalas al pie de la letra (son las que usará la corrección).

:::ejercicio sql dificultad=Básico
¿Cuántos pedidos se hicieron en **noviembre de 2024**, sin importar el estado? Columna: `pedidos`.
```sql solucion
SELECT COUNT(*) AS pedidos FROM pedidos WHERE fecha_pedido >= '2024-11-01' AND fecha_pedido < '2024-12-01';
```
:::

:::ejercicio sql dificultad=Básico
¿Cuántos clientes **distintos** compraron en noviembre de 2024 (cualquier estado)? Columna: `clientes`.
```pista
Un cliente con 3 pedidos cuenta una vez: `COUNT(DISTINCT …)`.
```
```sql solucion
SELECT COUNT(DISTINCT cliente_id) AS clientes FROM pedidos WHERE fecha_pedido >= '2024-11-01' AND fecha_pedido < '2024-12-01';
```
:::

:::ejercicio sql dificultad=Básico
¿Cuántas **unidades** se vendieron en noviembre de 2024 en pedidos **no cancelados**? Columna: `unidades`.
```sql solucion
SELECT SUM(d.cantidad) AS unidades
FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
WHERE p.fecha_pedido >= '2024-11-01' AND p.fecha_pedido < '2024-12-01' AND p.estado <> 'cancelado';
```
:::

:::ejercicio sql dificultad=Intermedio
Ventas **brutas** (sin aplicar descuento) y **netas** (con descuento) de noviembre de 2024, pedidos no cancelados, redondeadas a 2 decimales. Columnas: `brutas`, `netas`.
```pista
La única diferencia es multiplicar o no por `(1 - descuento)`.
```
```sql solucion
SELECT ROUND(SUM(d.cantidad * d.precio_unitario), 2) AS brutas,
       ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS netas
FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
WHERE p.fecha_pedido >= '2024-11-01' AND p.fecha_pedido < '2024-12-01' AND p.estado <> 'cancelado';
```
:::

:::ejercicio sql dificultad=Intermedio
Control de calidad: en noviembre de 2024, ¿cuántos pedidos hay por estado? Columnas: `estado`, `pedidos`.
```sql solucion
SELECT estado, COUNT(*) AS pedidos FROM pedidos WHERE fecha_pedido >= '2024-11-01' AND fecha_pedido < '2024-12-01' GROUP BY estado;
```
:::

:::ejercicio sql dificultad=Intermedio
La gerente pregunta “¿cuánto **cobramos** en noviembre de 2024?”. Acordaron: suma del monto de los pagos **aprobados** cuya **fecha de pago** cae en noviembre de 2024, redondeada a 2 decimales. Columna: `cobrado`.
```pista
Cobrar no es vender: la fecha es la del pago, no la del pedido.
```
```sql solucion
SELECT ROUND(SUM(monto), 2) AS cobrado FROM pagos WHERE estado = 'aprobado' AND fecha_pago >= '2024-11-01' AND fecha_pago < '2024-12-01';
```
:::

:::ejercicio sql ordenado dificultad=Intermedio
Ventas netas (con descuento, sin cancelados) de noviembre de 2024 **por canal**, redondeadas a 2 decimales y ordenadas de mayor a menor. Columnas: `canal`, `ventas`.
```pista
Grano del resultado: una fila por canal.
```
```sql solucion
SELECT p.canal, ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS ventas
FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
WHERE p.fecha_pedido >= '2024-11-01' AND p.fecha_pedido < '2024-12-01' AND p.estado <> 'cancelado'
GROUP BY p.canal
ORDER BY ventas DESC;
```
:::

:::ejercicio sql dificultad=Avanzado
Validación: ¿la suma de las ventas netas por canal (sin cancelados, noviembre de 2024) es igual al total? Devuelve una fila con `total_directo`, `suma_por_canal` (ambos redondeados a 2 decimales) y `cuadra` (1 si coinciden, 0 si no).
```pista
Calcula la suma por canal en una CTE y súmala otra vez; el total directo, en otra CTE.
```
```pista
Compara los valores ya redondeados para evitar diferencias de decimales.
```
```sql solucion
WITH base AS (
  SELECT p.canal, d.cantidad * d.precio_unitario * (1 - d.descuento) AS importe
  FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  WHERE p.fecha_pedido >= '2024-11-01' AND p.fecha_pedido < '2024-12-01' AND p.estado <> 'cancelado'
), por_canal AS (
  SELECT canal, SUM(importe) AS ventas FROM base GROUP BY canal
)
SELECT ROUND((SELECT SUM(importe) FROM base), 2) AS total_directo,
       ROUND((SELECT SUM(ventas) FROM por_canal), 2) AS suma_por_canal,
       CASE WHEN ROUND((SELECT SUM(importe) FROM base), 2) = ROUND((SELECT SUM(ventas) FROM por_canal), 2) THEN 1 ELSE 0 END AS cuadra;
```
:::

:::ejercicio sql dificultad=Avanzado
El grano mezclado en acción. Calcula, para los pedidos de noviembre de 2024, **cuántos pedidos** hay contando mal (`COUNT(*)` después de unir con `detalle_pedidos`) y contando bien (`COUNT(DISTINCT pedido_id)`). Columnas: `contando_lineas`, `contando_pedidos`.
```pista
Después del JOIN, cada pedido aparece una vez por cada línea de detalle.
```
```sql solucion
SELECT COUNT(*) AS contando_lineas, COUNT(DISTINCT p.pedido_id) AS contando_pedidos
FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
WHERE p.fecha_pedido >= '2024-11-01' AND p.fecha_pedido < '2024-12-01';
```
:::

:::ejercicio sql dificultad=Avanzado
“¿Cuánto vendimos en noviembre comparado con octubre de 2024?” Definición: ventas netas sin cancelados por fecha de pedido. Devuelve `octubre`, `noviembre` (2 decimales) y `variacion_pct` (variación porcentual de noviembre contra octubre, 1 decimal).
```pista
Agregación condicional: una suma por mes en la misma consulta.
```
```pista
Variación = (nuevo − anterior) / anterior × 100. Calcula los dos totales en una CTE y la variación afuera.
```
```sql solucion
WITH m AS (
  SELECT SUM(CASE WHEN p.fecha_pedido >= '2024-10-01' AND p.fecha_pedido < '2024-11-01' THEN d.cantidad * d.precio_unitario * (1 - d.descuento) ELSE 0 END) AS oct,
         SUM(CASE WHEN p.fecha_pedido >= '2024-11-01' AND p.fecha_pedido < '2024-12-01' THEN d.cantidad * d.precio_unitario * (1 - d.descuento) ELSE 0 END) AS nov
  FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  WHERE p.estado <> 'cancelado'
)
SELECT ROUND(oct, 2) AS octubre, ROUND(nov, 2) AS noviembre, ROUND((nov - oct) / oct * 100, 1) AS variacion_pct FROM m;
```
:::

:::ejercicio quiz dificultad=Básico
Te piden “la cantidad de clientes del último trimestre”. ¿Cuál es la mejor primera respuesta?

- [ ] Ejecutar `SELECT COUNT(*) FROM clientes`
- [ ] Contar los clientes registrados en el trimestre, que es lo más habitual
- [x] Preguntar si se refieren a clientes registrados, a clientes que compraron o a clientes activos en ese trimestre
- [ ] Entregar los tres números sin explicar la diferencia
:::
