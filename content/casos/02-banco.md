---
titulo: "Caso 🏦 Banco Austral: saldos, fraude y morosidad"
nivel: Avanzado
duracion: 60
resumen: Saldos, gasto por comercio, saldo acumulado, reglas de fraude, mora y riesgo crediticio.
---

**Banco Austral** es un banco digital que opera en cinco países. El equipo de riesgo y el de producto necesitan respuestas. Tú eres el/la analista de datos.

## El modelo de datos

```text
banco_clientes (cliente_id, nombre, apellido, pais, fecha_alta, segmento, score_crediticio)
   │ 1..N
banco_cuentas (cuenta_id, cliente_id, tipo, fecha_apertura, estado)
   │ 1..N
banco_transacciones (tx_id, cuenta_id, fecha_hora, tipo, monto, canal, comercio, ciudad, es_fraude)

banco_clientes 1..N banco_prestamos (prestamo_id, cliente_id, fecha_otorgado, monto, tasa_anual, plazo_meses, estado)
                         │ 1..N
                    banco_cuotas (cuota_id, prestamo_id, numero, fecha_vencimiento, fecha_pago, monto)
```

**Reglas del negocio que debes saber:**

- En `banco_transacciones`, `monto` **positivo** = entra dinero (depósitos); **negativo** = sale (compras, retiros, transferencias, pagos de tarjeta).
- El **saldo** de una cuenta en 2024 es la suma de sus montos.
- `es_fraude = 1` marca fraudes confirmados por el equipo de seguridad.
- Una cuota está **impaga** si `fecha_pago` es NULL. Está **vencida** si además su `fecha_vencimiento` ya pasó (usamos como “hoy” el `2024-12-31`).
- El **score crediticio** va de 300 (alto riesgo) a 850 (bajo riesgo).

:::tip Cómo pensar
Antes de cada ejercicio, escribe en un comentario: *grano* (“una fila por…”), *métricas* (fórmulas) y *tablas*. Por ejemplo: `-- grano: cuenta | métrica: saldo = SUM(monto) | tablas: banco_transacciones`.
:::

## Ejercicios

:::ejercicio sql titulo="Saldo de cada cuenta"
Calcula el saldo neto 2024 de cada cuenta (`saldo`, redondeado a 2) y la cantidad de movimientos (`movimientos`). Columnas: `cuenta_id`, `movimientos`, `saldo`.
```sql solucion
SELECT cuenta_id, COUNT(*) AS movimientos, ROUND(SUM(monto), 2) AS saldo
FROM banco_transacciones
GROUP BY cuenta_id;
```
:::

:::ejercicio sql titulo="Clientes multiproducto"
¿Qué clientes tienen **más de una cuenta activa**? Columnas: `cliente_id`, `nombre`, `cuentas_activas`.
```sql solucion
SELECT c.cliente_id, c.nombre, COUNT(*) AS cuentas_activas
FROM banco_clientes c JOIN banco_cuentas a ON a.cliente_id = c.cliente_id
WHERE a.estado = 'activa'
GROUP BY c.cliente_id, c.nombre
HAVING COUNT(*) > 1;
```
:::

:::ejercicio sql ordenado titulo="¿Dónde gastan los clientes?"
Para las **compras** (tipo `compra`) que **no** son fraude, calcula por `comercio` la cantidad de compras (`compras`) y el total gastado como número **positivo** (`gasto`, redondeado a 2). Ordena por gasto descendente.
```sql solucion
SELECT comercio, COUNT(*) AS compras, ROUND(-SUM(monto), 2) AS gasto
FROM banco_transacciones
WHERE tipo = 'compra' AND es_fraude = 0
GROUP BY comercio
ORDER BY gasto DESC;
```
```pista
Las compras tienen monto negativo: `-SUM(monto)` o `SUM(ABS(monto))` da un número positivo.
```
:::

:::ejercicio sql ordenado titulo="Extracto con saldo acumulado"
Arma el extracto de la cuenta `10`: cada movimiento con `tx_id`, `fecha_hora`, `tipo`, `monto` y el `saldo` acumulado después de ese movimiento (redondeado a 2). Ordena por fecha y `tx_id`.
```sql solucion
SELECT tx_id, fecha_hora, tipo, monto,
       ROUND(SUM(monto) OVER (ORDER BY fecha_hora, tx_id ROWS UNBOUNDED PRECEDING), 2) AS saldo
FROM banco_transacciones
WHERE cuenta_id = 10
ORDER BY fecha_hora, tx_id;
```
:::

:::ejercicio sql titulo="Regla de fraude: compras en ráfaga"
El equipo de seguridad propone una regla: es **sospechosa** toda compra que sea la tercera (o más) compra de la misma cuenta en un lapso de **30 minutos** (es decir, la compra de dos lugares antes, en la misma cuenta, ocurrió hace 30 minutos o menos). Devuelve las compras sospechosas: `tx_id`, `cuenta_id`, `fecha_hora`, `monto`, `es_fraude`.
```sql solucion
WITH compras AS (
  SELECT tx_id, cuenta_id, fecha_hora, monto, es_fraude,
         LAG(fecha_hora, 2) OVER (PARTITION BY cuenta_id ORDER BY fecha_hora, tx_id) AS hace_dos
  FROM banco_transacciones
  WHERE tipo = 'compra'
)
SELECT tx_id, cuenta_id, fecha_hora, monto, es_fraude
FROM compras
WHERE hace_dos IS NOT NULL
  AND (julianday(fecha_hora) - julianday(hace_dos)) * 24 * 60 <= 30;
```
```pista
`LAG(fecha_hora, 2)` sobre las compras de cada cuenta te da la compra de “dos lugares antes”. La diferencia en minutos es `(julianday(a) - julianday(b)) * 24 * 60`.
```
:::

:::ejercicio sql titulo="¿Qué tan buena es la regla?"
Evalúa la regla anterior. Calcula: `alertas` (compras marcadas por la regla), `aciertos` (alertas que realmente eran fraude), `precision_pct` (aciertos / alertas × 100) y `cobertura_pct` (aciertos / total de compras fraudulentas × 100). Redondea los porcentajes a 2.
```sql solucion
WITH compras AS (
  SELECT tx_id, es_fraude, fecha_hora,
         LAG(fecha_hora, 2) OVER (PARTITION BY cuenta_id ORDER BY fecha_hora, tx_id) AS hace_dos
  FROM banco_transacciones WHERE tipo = 'compra'
),
alertas AS (
  SELECT * FROM compras
  WHERE hace_dos IS NOT NULL AND (julianday(fecha_hora) - julianday(hace_dos)) * 1440 <= 30
)
SELECT COUNT(*) AS alertas,
       SUM(es_fraude) AS aciertos,
       ROUND(100.0 * SUM(es_fraude) / COUNT(*), 2) AS precision_pct,
       ROUND(100.0 * SUM(es_fraude) / (SELECT SUM(es_fraude) FROM banco_transacciones WHERE tipo = 'compra'), 2) AS cobertura_pct
FROM alertas;
```
```explicacion
**Precisión**: de lo que la regla marcó, cuánto era fraude (pocas falsas alarmas). **Cobertura** (*recall*): de todo el fraude, cuánto atrapó la regla. Verás falsas alarmas (gente comprando varias cosas seguidas en un shopping) y fraudes no detectados. Una regla de 3 compras en ráfaga no puede detectar las dos primeras compras de cada ráfaga: por eso la cobertura queda por debajo del 100%.
```
:::

:::ejercicio sql titulo="Préstamos en mora"
Al `2024-12-31`, ¿qué préstamos tienen cuotas **vencidas e impagas**? Columnas: `prestamo_id`, `cliente_id`, `cuotas_vencidas` y `deuda_vencida` (suma del monto de esas cuotas, redondeada a 2).
```sql solucion
SELECT p.prestamo_id, p.cliente_id, COUNT(*) AS cuotas_vencidas, ROUND(SUM(c.monto), 2) AS deuda_vencida
FROM banco_prestamos p
JOIN banco_cuotas c ON c.prestamo_id = p.prestamo_id
WHERE c.fecha_pago IS NULL AND c.fecha_vencimiento <= '2024-12-31'
GROUP BY p.prestamo_id, p.cliente_id;
```
:::

:::ejercicio sql ordenado titulo="Riesgo por banda de score"
¿Funciona el score crediticio? Agrupa los préstamos por banda del score del cliente: `'1. 300-549'`, `'2. 550-649'`, `'3. 650-749'`, `'4. 750-850'`. Para cada banda: `prestamos`, `incobrables` (estado `incobrable`) y `tasa_incobrable_pct` (redondeada a 2). Ordena por banda.
```sql solucion
WITH b AS (
  SELECT p.estado,
         CASE WHEN c.score_crediticio < 550 THEN '1. 300-549'
              WHEN c.score_crediticio < 650 THEN '2. 550-649'
              WHEN c.score_crediticio < 750 THEN '3. 650-749'
              ELSE '4. 750-850' END AS banda
  FROM banco_prestamos p JOIN banco_clientes c ON c.cliente_id = p.cliente_id
)
SELECT banda, COUNT(*) AS prestamos,
       SUM(CASE WHEN estado = 'incobrable' THEN 1 ELSE 0 END) AS incobrables,
       ROUND(100.0 * SUM(CASE WHEN estado = 'incobrable' THEN 1 ELSE 0 END) / COUNT(*), 2) AS tasa_incobrable_pct
FROM b GROUP BY banda ORDER BY banda;
```
```explicacion
Si la tasa de incobrabilidad baja a medida que sube el score, el score **discrimina** bien el riesgo. Este tipo de tabla es la base para fijar políticas de aprobación y tasas.
```
:::

:::ejercicio sql titulo="Cuentas dormidas"
Las cuentas **activas** sin movimientos en los **últimos 90 días** del año (desde el `2024-10-03`) se consideran dormidas, incluidas las que no tuvieron ningún movimiento en 2024. Devuelve `cuenta_id`, `cliente_id` y la fecha de su último movimiento (`ultimo_movimiento`, NULL si no tiene).
```sql solucion
SELECT a.cuenta_id, a.cliente_id, MAX(t.fecha_hora) AS ultimo_movimiento
FROM banco_cuentas a
LEFT JOIN banco_transacciones t ON t.cuenta_id = a.cuenta_id
WHERE a.estado = 'activa'
GROUP BY a.cuenta_id, a.cliente_id
HAVING MAX(t.fecha_hora) IS NULL OR MAX(t.fecha_hora) < '2024-10-03';
```
```pista
LEFT JOIN para no perder cuentas sin movimientos, `MAX(fecha_hora)` por cuenta y la condición en el `HAVING`.
```
:::
