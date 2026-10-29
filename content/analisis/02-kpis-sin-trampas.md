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

## Trampa 3: la división entera

En SQLite, PostgreSQL y SQL Server, `7 / 2` da `3`. Multiplica por `100.0` (o `1.0`) **antes** de dividir.

## KPIs de otros negocios

- **Delivery (Rápido)**: *take rate* = lo que se queda la plataforma ÷ lo que vendieron los restaurantes (GMV).
- **SaaS (Nube Pyme)**: MRR = suma de las facturas del mes; ARPA = MRR ÷ empresas que pagaron.
- **Hotelería**: ADR = ingreso por habitaciones ÷ noches vendidas.

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
