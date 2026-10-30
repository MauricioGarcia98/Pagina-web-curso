---
titulo: KPIs sin trampas - numeradores, denominadores y promedios
nivel: Intermedio
duracion: 45
resumen: Cómo se definen y calculan bien las métricas de negocio más pedidas - ticket promedio, tasas (cancelación, conversión, rechazo), márgenes y take rate - y las tres trampas que arruinan un tablero, el denominador equivocado, el promedio de promedios y la división entera.
objetivos: Escribir la fórmula exacta de un KPI antes de calcularlo | Elegir el denominador correcto de una tasa | Distinguir razón de sumas y promedio de razones | Calcular KPIs por segmento sin errores de grano
autoevaluacion: ¿Sabes por qué el promedio de los márgenes por producto no es el margen total? | ¿Sabes elegir el denominador de una tasa de cancelación? | ¿Sabes calcular el ticket promedio sin contar líneas en vez de pedidos?
---

:::escenario
Dos tableros de la empresa muestran “tasa de cancelación” y no coinciden: uno dice 8 % y el otro 11 %. Nadie miente: uno divide por todos los pedidos y el otro solo por los pedidos que llegaron a enviarse. Un KPI sin fórmula escrita no es un KPI, es una opinión.
:::

## La ficha de un KPI

Antes de calcular, cada métrica debería tener su ficha:

| Campo | Ejemplo: ticket promedio |
|---|---|
| **Pregunta que responde** | ¿Cuánto gasta un cliente cada vez que compra? |
| **Fórmula** | ventas netas ÷ cantidad de pedidos |
| **Numerador** | Suma de importes con descuento de las líneas |
| **Denominador** | Pedidos distintos (no líneas) |
| **Filtros** | Sin cancelados; por fecha de pedido |
| **Grano** | Se puede abrir por mes, canal y país |

## Trampa 1: el denominador

Una tasa es **casos que cumplen ÷ casos que podían cumplir**. Lo difícil es el “podían”.

```sql
-- Tasa de rechazo de pagos: sobre todos los intentos de pago
SELECT ROUND(100.0 * SUM(estado = 'rechazado') / COUNT(*), 2) AS pct_rechazo_intentos
FROM pagos;

-- Otra pregunta distinta: ¿qué % de pedidos tuvo al menos un rechazo?
SELECT ROUND(100.0 * COUNT(DISTINCT CASE WHEN estado = 'rechazado' THEN pedido_id END)
             / COUNT(DISTINCT pedido_id), 2) AS pct_pedidos_con_rechazo
FROM pagos;
```

Las dos están “bien”: responden preguntas diferentes. La ficha dice cuál se usa.

## Trampa 2: el promedio de promedios

El margen de la empresa **no** es el promedio de los márgenes de cada producto: un producto que vende poco pesa lo mismo que uno que vende mucho.

```sql
SELECT
  -- promedio de razones: cada producto pesa igual
  ROUND(AVG((precio - costo) / precio) * 100, 2) AS margen_promedio_productos,
  -- razón de sumas: pondera por lo que realmente se vendió
  ROUND(100.0 * SUM(d.cantidad * (d.precio_unitario - pr.costo)) / SUM(d.cantidad * d.precio_unitario), 2) AS margen_real_ventas
FROM detalle_pedidos d
JOIN productos pr ON pr.producto_id = d.producto_id;
```

:::cuidado Regla práctica
Para un KPI que es una razón (margen, conversión, ticket), calcula **suma del numerador ÷ suma del denominador** en el nivel que te piden. Promediar razones ya calculadas casi siempre da otro número.
:::

```recorrido
titulo: El ticket promedio: promedio de promedios contra razón de sumas
estacion pedidos: Por pedido | icono=tabla
estacion canal: Por canal | icono=capas
estacion mal: Promedio de promedios | icono=x
estacion bien: Razón de sumas | icono=check
paso pedidos: El total de cada pedido
Primero, el importe de cada pedido no cancelado (suma de sus líneas con descuento).
>>> tabla
canal,pedido_id,total
app,1,178.19
web,2,167.7
app,3,1880.98
tienda,4,953.02
telefono,5,108.97
paso canal: El ticket promedio de cada canal
Cada canal tiene su ticket y su **cantidad de pedidos**, muy distinta: web tiene más de cinco veces los pedidos de teléfono.
>>> tabla
canal,pedidos,ticket
web,4979,1222.94
app,2707,1217.85
tienda,2438,1152.45
telefono,909,1103.31
paso mal: Promediar los 4 tickets
Si promedias los cuatro números de la tabla anterior, teléfono pesa **lo mismo** que web, aunque tenga muchos menos pedidos.
>>> tabla
promedio_de_promedios
1174.14
paso bien: Total vendido / total de pedidos
El ticket de la empresa es la suma de los importes dividida por la cantidad de pedidos. Cada pedido pesa lo mismo. Aquí la diferencia es de unos 22 por pedido; con otra mezcla de canales puede ser mucho mayor, y al comparar meses con mezclas distintas puede mostrar una suba donde hubo una baja.
>>> tabla
ticket_real,pedidos
1196.26,11033
```

## Trampa 3: la división entera

En SQLite, PostgreSQL y SQL Server, `7 / 2` da `3`. Multiplica por `100.0` (o `1.0`) **antes** de dividir.

## KPIs de otros negocios

- **Delivery (Rápido)**: *take rate* = lo que se queda la plataforma ÷ lo que vendieron los restaurantes (GMV).
- **SaaS (Nube Pyme)**: MRR = suma de las facturas del mes; ARPA = MRR ÷ empresas que pagaron.
- **Hotelería**: ADR = ingreso por habitaciones ÷ noches vendidas.

## Trampa 4: el JOIN que multiplica filas

Es la trampa más común en el trabajo real y la más difícil de ver, porque la consulta corre sin errores. Un pedido tiene varias líneas en `detalle_pedidos`. Si unes `pedidos` con `detalle_pedidos` y cuentas con `COUNT(*)`, estás contando **líneas**, no pedidos.

```sql
SELECT COUNT(*) AS filas_despues_del_join,
       COUNT(DISTINCT p.pedido_id) AS pedidos_reales
FROM pedidos p
JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
WHERE p.estado <> 'cancelado';
```

La primera columna es más del doble que la segunda. Cualquier KPI que use `COUNT(*)` o `SUM` de una columna del pedido (por ejemplo, un costo de envío) **después** de ese join queda inflado. A esto se le llama *fan-out* (abanico): una fila de un lado se abre en varias del otro.

La forma segura es **llevar cada tabla al grano del KPI antes de unir**: primero una fila por pedido, después el cálculo.

```sql
WITH pedido_neto AS (            -- 1. una fila por pedido
  SELECT p.pedido_id, p.canal,
         SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)) AS neto,
         COUNT(*) AS lineas
  FROM pedidos p
  JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  WHERE p.estado <> 'cancelado'
  GROUP BY p.pedido_id, p.canal
)
SELECT canal,                    -- 2. el KPI en el grano pedido
       COUNT(*) AS pedidos,
       ROUND(SUM(neto) / COUNT(*), 2) AS ticket_promedio,
       ROUND(SUM(neto) / SUM(lineas), 2) AS importe_por_linea
FROM pedido_neto
GROUP BY canal
ORDER BY ticket_promedio DESC;
```

Qué hace cada parte:

- El CTE `pedido_neto` **colapsa** las líneas: después del `GROUP BY p.pedido_id` hay exactamente una fila por pedido. Es el momento de verificar: `COUNT(*)` de este CTE debe ser igual a `COUNT(DISTINCT pedido_id)`.
- `SUM(neto) / COUNT(*)` es la razón de sumas que pedía la ficha: ventas ÷ pedidos.
- `importe_por_linea` responde otra pregunta (cuánto vale cada línea) y por eso usa otro denominador. Ponerlas una al lado de la otra muestra que **el denominador es parte de la definición**.

:::cuidado Cómo detectar un fan-out
Antes y después de cada `JOIN`, cuenta filas. Si el número sube y no esperabas que subiera, el join multiplicó. Las preguntas que hay que hacerse: ¿cuál es la clave de cada tabla? ¿La relación es uno a uno, uno a muchos o muchos a muchos?
:::

## Trampa 5: el filtro que cambia la población

El escenario de esta lección pasa en la base de la tienda. Con los mismos datos, la "tasa de cancelación" puede ser:

```sql
SELECT ROUND(100.0 * SUM(estado = 'cancelado') / COUNT(*), 2) AS sobre_todos,
       ROUND(100.0 * SUM(estado = 'cancelado')
             / SUM(estado IN ('enviado', 'entregado', 'cancelado')), 2) AS sin_pendientes_ni_devueltos
FROM pedidos;
```

- `sobre_todos` incluye en el denominador los pedidos **pendientes**, que todavía pueden cancelarse. Si el mes acaba de cerrar, esa tasa va a subir en los próximos días.
- `sin_pendientes_ni_devueltos` solo mira pedidos con un desenlace. Es más estable, pero excluye a los devueltos: ¿una devolución es un éxito o un fracaso? Depende de la pregunta del negocio.

No hay una respuesta correcta universal: hay una **acordada y escrita**. Esa es la diferencia entre los dos tableros del escenario.

### Métricas que todavía están "madurando"

Muchos KPIs cambian con el tiempo aunque no cambie nada en el negocio: la tasa de devolución de pedidos de ayer es casi cero porque nadie tuvo tiempo de devolver. Para compararlas de forma justa:

1. Fija una **ventana de maduración**: "devoluciones dentro de los 30 días del pedido".
2. Muestra solo los períodos que ya cumplieron esa ventana, o márcalos como provisorios.

## Cómo se arma la ficha, paso a paso

Tomemos un pedido real del negocio: *"queremos saber si los cupones atraen clientes que gastan menos"*.

1. **Pregunta**: ¿el ticket de los pedidos con cupón es menor que el de los pedidos sin cupón?
2. **Unidad y grano**: pedido. Un pedido tiene a lo sumo un cupón (`uso_cupones` tiene `pedido_id` como clave): no hay fan-out al unir.
3. **Numerador**: ventas netas (ya con el descuento de línea).
4. **Denominador**: pedidos distintos no cancelados.
5. **Filtros**: mismo período para los dos grupos. Si los cupones solo existen desde 2024, comparar contra 2022 mezcla el efecto del cupón con la inflación.
6. **Cortes permitidos**: canal y mes.
7. **Dueño**: quién responde si el número cambia.

```sql
WITH pedido_neto AS (
  SELECT p.pedido_id,
         CASE WHEN u.cupon_id IS NULL THEN 'sin cupón' ELSE 'con cupón' END AS grupo,
         SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)) AS neto
  FROM pedidos p
  JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  LEFT JOIN uso_cupones u ON u.pedido_id = p.pedido_id
  WHERE p.estado <> 'cancelado'
    AND p.fecha_pedido >= '2024-01-01'
  GROUP BY p.pedido_id, grupo
)
SELECT grupo, COUNT(*) AS pedidos, ROUND(SUM(neto) / COUNT(*), 2) AS ticket
FROM pedido_neto
GROUP BY grupo;
```

El `LEFT JOIN` es clave: con un `JOIN` normal desaparecerían todos los pedidos sin cupón y no habría con qué comparar.

:::errores
- **Promediar porcentajes de cada mes** para sacar el del año: un mes con 10 pedidos pesa igual que uno con 1.000.
- **`COUNT(*)` después de un join** uno a muchos: cuenta líneas, no pedidos.
- **Cambiar el filtro sin cambiar el nombre**: si "tasa de cancelación" deja de incluir los pendientes, es otra métrica y el histórico ya no se puede comparar.
- **Dividir enteros**: `SUM(x) / COUNT(*)` con columnas enteras trunca el decimal en SQLite, PostgreSQL y SQL Server.
- **Comparar un período abierto con uno cerrado**: el mes en curso siempre "cae".
:::

:::trabajo
- En los equipos maduros, las fichas viven en una **capa semántica** (dbt Semantic Layer, Looker, Power BI, métricas de Unity Catalog): la fórmula se escribe una vez y todos los tableros la reutilizan. El data engineer construye las tablas en el grano correcto para que esa capa no tenga que corregir fan-outs.
- Cuando dos áreas discuten un número, el primer paso no es recalcular: es **poner las dos fichas una al lado de la otra** y encontrar la diferencia en numerador, denominador o filtros.
- Los KPIs se versionan: si cambia la definición, se anota la fecha del cambio en el tablero.
:::

:::entrevista "Te dan un tablero donde el ticket promedio subió 30 % de un día para otro. ¿Qué miras?"
Antes de celebrar, buscaría un cambio en la definición o en los datos: un join nuevo que multiplica filas (fan-out), un filtro que sacó pedidos baratos, una carga duplicada o un cambio de moneda. Contaría filas en cada paso de la consulta, compararía pedidos distintos contra filas, y abriría el KPI por canal y día para ver si el salto está concentrado. Solo después de descartar eso lo trataría como un cambio real del negocio.
:::

| Trampa | Síntoma | Antídoto |
|---|---|---|
| Denominador | Dos tableros no coinciden | Ficha con "casos que podían cumplir" |
| Promedio de promedios | El total no cuadra con las partes | Suma de numeradores ÷ suma de denominadores |
| División entera | Tasas en 0 o números redondos | Multiplicar por `100.0` antes |
| Fan-out | Totales inflados después de un join | Llevar al grano antes de unir; contar filas |
| Población | La métrica cambia sola con el tiempo | Filtros escritos y ventana de maduración |

## Ejercicios

:::ejercicio sql dificultad=Básico
Ticket promedio de 2024: ventas netas (con descuento) de pedidos **no cancelados** dividido por la cantidad de esos pedidos. Redondea a 2 decimales. Columna: `ticket_promedio`.
```pista
Numerador: suma de importes de las líneas. Denominador: `COUNT(DISTINCT p.pedido_id)`, no `COUNT(*)`.
```
```sql solucion
SELECT ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)) / COUNT(DISTINCT p.pedido_id), 2) AS ticket_promedio
FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
WHERE p.estado <> 'cancelado' AND p.fecha_pedido >= '2024-01-01' AND p.fecha_pedido < '2025-01-01';
```
:::

:::ejercicio sql dificultad=Básico
Tasa de cancelación de 2024: pedidos cancelados ÷ total de pedidos de 2024, en porcentaje con 2 decimales. Columna: `pct_cancelados`.
```sql solucion
SELECT ROUND(100.0 * SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END) / COUNT(*), 2) AS pct_cancelados
FROM pedidos WHERE fecha_pedido >= '2024-01-01' AND fecha_pedido < '2025-01-01';
```
:::

:::ejercicio sql dificultad=Intermedio
Tasa de devolución de 2024 con otro denominador: devueltos ÷ pedidos que **llegaron al cliente** (`entregado` o `devuelto`), en porcentaje con 2 decimales. Columna: `pct_devueltos`.
```pista
El filtro del denominador va en el `WHERE`.
```
```sql solucion
SELECT ROUND(100.0 * SUM(CASE WHEN estado = 'devuelto' THEN 1 ELSE 0 END) / COUNT(*), 2) AS pct_devueltos
FROM pedidos
WHERE estado IN ('entregado', 'devuelto') AND fecha_pedido >= '2024-01-01' AND fecha_pedido < '2025-01-01';
```
:::

:::ejercicio sql dificultad=Intermedio
Unidades por pedido en 2024 (pedidos no cancelados): unidades totales ÷ pedidos, 2 decimales. Columna: `unidades_por_pedido`.
```sql solucion
SELECT ROUND(1.0 * SUM(d.cantidad) / COUNT(DISTINCT p.pedido_id), 2) AS unidades_por_pedido
FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
WHERE p.estado <> 'cancelado' AND p.fecha_pedido >= '2024-01-01' AND p.fecha_pedido < '2025-01-01';
```
:::

:::ejercicio sql ordenado dificultad=Intermedio
Ticket promedio de 2024 **por canal** (misma definición que el primer ejercicio), ordenado de mayor a menor. Columnas: `canal`, `ticket_promedio`.
```sql solucion
SELECT p.canal, ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)) / COUNT(DISTINCT p.pedido_id), 2) AS ticket_promedio
FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
WHERE p.estado <> 'cancelado' AND p.fecha_pedido >= '2024-01-01' AND p.fecha_pedido < '2025-01-01'
GROUP BY p.canal
ORDER BY ticket_promedio DESC;
```
:::

:::ejercicio sql dificultad=Avanzado
Compara las dos formas de calcular el margen sobre **todas** las líneas vendidas: `margen_promedio_productos` (promedio del margen % de cada línea: `(precio_unitario − costo) / precio_unitario`) y `margen_real` (razón de sumas ponderada por cantidad). Ambos en porcentaje con 2 decimales.
```pista
El costo está en `productos`.
```
```pista
Razón de sumas: `SUM(cantidad * (precio_unitario - costo)) / SUM(cantidad * precio_unitario)`.
```
```sql solucion
SELECT ROUND(100.0 * AVG((d.precio_unitario - pr.costo) / d.precio_unitario), 2) AS margen_promedio_productos,
       ROUND(100.0 * SUM(d.cantidad * (d.precio_unitario - pr.costo)) / SUM(d.cantidad * d.precio_unitario), 2) AS margen_real
FROM detalle_pedidos d JOIN productos pr ON pr.producto_id = d.producto_id;
```
:::

:::ejercicio sql dificultad=Intermedio
Tasa de rechazo de **intentos de pago** de 2024 (por fecha de pago), en porcentaje con 2 decimales. Columna: `pct_rechazo`.
```sql solucion
SELECT ROUND(100.0 * SUM(CASE WHEN estado = 'rechazado' THEN 1 ELSE 0 END) / COUNT(*), 2) AS pct_rechazo
FROM pagos WHERE fecha_pago >= '2024-01-01' AND fecha_pago < '2025-01-01';
```
:::

:::ejercicio sql ordenado dificultad=Avanzado
Delivery (Rápido). *Take rate* por ciudad de los pedidos **entregados**: (comisión del restaurante sobre el subtotal + costo de envío) ÷ subtotal, en porcentaje con 2 decimales. La comisión es `subtotal * comision_pct / 100` (la tasa está en `delivery_restaurantes`). Ordena de mayor a menor. Columnas: `ciudad`, `take_rate`.
```pista
Une `delivery_pedidos` con `delivery_restaurantes` por `restaurante_id`.
```
```pista
Razón de sumas: `SUM(subtotal * comision_pct / 100 + costo_envio) / SUM(subtotal)`.
```
```sql solucion
SELECT p.ciudad, ROUND(100.0 * SUM(p.subtotal * r.comision_pct / 100 + p.costo_envio) / SUM(p.subtotal), 2) AS take_rate
FROM delivery_pedidos p JOIN delivery_restaurantes r ON r.restaurante_id = p.restaurante_id
WHERE p.estado = 'entregado'
GROUP BY p.ciudad
ORDER BY take_rate DESC;
```
:::

:::ejercicio sql ordenado dificultad=Avanzado
SaaS (Nube Pyme). ARPA por mes de 2024: suma de facturas **pagadas** del mes ÷ empresas distintas con factura pagada ese mes, 2 decimales. Columnas: `mes`, `arpa`. Ordena por mes.
```sql solucion
SELECT mes, ROUND(SUM(monto) / COUNT(DISTINCT empresa_id), 2) AS arpa
FROM saas_facturas
WHERE estado = 'pagada' AND mes >= '2024-01-01' AND mes < '2025-01-01'
GROUP BY mes
ORDER BY mes;
```
:::

:::ejercicio sql dificultad=Avanzado
Hotelería (Posada Andina). ADR (tarifa promedio por noche vendida) de las reservas **no canceladas** por hotel: ingreso por habitación (`tarifa_noche × noches`) ÷ noches vendidas, 2 decimales. Las noches son `check_out − check_in` en días. Columnas: `hotel_id`, `adr`.
```pista
Noches: `julianday(check_out) - julianday(check_in)`.
```
```pista
ADR es una razón de sumas: no promedies `tarifa_noche` reserva por reserva (una reserva de 10 noches pesa más que una de 1).
```
```sql solucion
SELECT hotel_id,
       ROUND(SUM(tarifa_noche * (julianday(check_out) - julianday(check_in))) / SUM(julianday(check_out) - julianday(check_in)), 2) AS adr
FROM hotel_reservas
WHERE estado <> 'cancelada'
GROUP BY hotel_id;
```
:::

:::ejercicio quiz dificultad=Intermedio
La conversión de la tienda en enero fue 2 % (2.000 visitas, 40 compras) y en febrero 4 % (100 visitas, 4 compras). ¿Cuál es la conversión del bimestre?

- [ ] 3 %, el promedio de los dos meses
- [x] 2,1 % (44 compras ÷ 2.100 visitas)
- [ ] 6 %, la suma de las tasas
- [ ] No se puede calcular sin los datos diarios
```explicacion
Una tasa de un período se calcula con las sumas de ese período. Promediar 2 % y 4 % le da a febrero (100 visitas) el mismo peso que a enero (2.000).
```
:::

:::ejercicio quiz dificultad=Básico
En SQL Server, `SELECT 45 / 1200 * 100` devuelve `0`. ¿Cómo lo arreglas?

- [ ] Agregando `ROUND`
- [x] Multiplicando por `100.0` antes de dividir: `100.0 * 45 / 1200`
- [ ] Cambiando el orden: `100 * 1200 / 45`
- [ ] Usando `AVG` en lugar de dividir
:::
