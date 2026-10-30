---
titulo: "Caso 🏦 Banco Austral: saldos, fraude y morosidad"
nivel: Avanzado
duracion: 60
resumen: Saldos, gasto por comercio, saldo acumulado, reglas de fraude, mora y riesgo crediticio.
objetivos: Calcular saldos y extractos con montos con signo y totales acumulados | Detectar patrones de fraude con ventanas de tiempo y medir una regla con precisión y cobertura | Calcular la mora de una cartera de préstamos a una fecha de corte | Evaluar si un score crediticio separa bien a los buenos y malos pagadores
prerrequisitos: casos-metodo | sql-ventanas-2
autoevaluacion: ¿Puedes armar el extracto de una cuenta con el saldo después de cada movimiento? | ¿Sabes por qué en esta base los montos ya vienen con signo y qué cambia eso al sumar? | ¿Puedes explicar la diferencia entre precisión y cobertura de una regla de fraude? | ¿Puedes calcular la deuda vencida de cada préstamo a una fecha de corte? | ¿Sabes cómo comprobar si un score predice la morosidad?
---

<!-- estandar:escenario -->
:::escenario Banco Austral
La gerente de riesgos de **Banco Austral** pide reunión con el equipo de datos:

> "Tenemos tres frentes. Seguridad propone una regla nueva para detectar fraude y quiero saber si sirve antes de activarla. Cobranzas necesita la deuda vencida al cierre del año. Y el directorio pregunta si nuestro score crediticio funciona o si estamos prestando a ciegas."

Un banco vive de prestar dinero y cobrarlo, y pierde por fraude y por morosidad. Cada error en estos números es dinero real.
:::
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

## Cómo gana (y pierde) dinero un banco

Para analizar bien un negocio, primero hay que entender **cómo funciona**. Un banco digital como Banco Austral gana dinero principalmente de tres formas:

1. **Intereses de préstamos**: presta dinero a una tasa (por ejemplo 30 % anual) más alta de la que paga por los depósitos. La diferencia es su margen.
2. **Comisiones**: por uso de tarjetas en comercios (cada compra deja un pequeño porcentaje), mantenimiento de cuentas, transferencias.
3. **Saldos de los clientes**: el dinero depositado le permite prestar e invertir.

Y pierde dinero de dos formas que el área de **riesgo** vigila todo el tiempo:

- **Mora e incobrables**: clientes que no devuelven los préstamos.
- **Fraude**: transacciones hechas por terceros con tarjetas o cuentas robadas, que el banco suele devolver al cliente.

## Los indicadores (KPIs) de este caso

| KPI | Definición | Fórmula | Por qué importa |
|---|---|---|---|
| **Saldo** | Dinero disponible en una cuenta | `SUM(monto)` de sus transacciones | Base de todo: productos, riesgo, cuentas dormidas |
| **Gasto por comercio/canal** | Cuánto compran los clientes y dónde | `-SUM(monto)` de las compras | Acuerdos con comercios, campañas de cashback |
| **Tasa de fraude** | Qué parte de las transacciones son fraude | fraudes / transacciones | En este banco es ~2,3 %: cada punto son millones |
| **Precisión de una regla** | De las alertas que dispara, cuántas son fraude real | verdaderos positivos / alertas | Una regla con baja precisión molesta a clientes honestos |
| **Recall (cobertura)** | De los fraudes reales, cuántos detecta | verdaderos positivos / fraudes | Una regla con bajo recall deja pasar fraudes |
| **Tasa de mora** | Préstamos con cuotas vencidas impagas | préstamos en mora / préstamos activos | El indicador central de riesgo de crédito |
| **Score crediticio** | Probabilidad de que el cliente pague (300 a 850) | lo calcula un modelo | Decide a quién prestar y a qué tasa |

:::analogia Precisión y recall con una red de pesca
Una regla de fraude es una red. **Precisión**: de todo lo que atrapaste, ¿qué parte eran peces (fraudes) y qué parte basura (clientes honestos bloqueados)? **Recall**: de todos los peces del lago, ¿cuántos atrapaste? Una red con agujeros chicos atrapa casi todos los peces (mucho recall) pero también mucha basura (poca precisión). Siempre hay que balancear las dos.
:::

## Un ejemplo resuelto paso a paso

**Pregunta:** "¿Por qué canal compran más nuestros clientes y cuál es el ticket promedio de cada uno?"

1. **Grano**: una fila por canal.
2. **Filtro**: solo transacciones de tipo `compra` (los depósitos o retiros no son gasto).
3. **Métricas**: cantidad de compras, gasto total y ticket promedio. Como las compras tienen `monto` **negativo** (sale dinero), invertimos el signo para mostrar el gasto en positivo.

```sql
SELECT canal,
       COUNT(*)                AS compras,
       ROUND(-SUM(monto), 2)   AS gasto,
       ROUND(-AVG(monto), 2)   AS ticket_promedio
FROM banco_transacciones
WHERE tipo = 'compra'
GROUP BY canal
ORDER BY gasto DESC;
```

| canal | compras | gasto | ticket_promedio |
|---|---|---|---|
| web | 2072 | 441391.64 | 213.03 |
| app | 2663 | 331787.9 | 124.59 |
| pos | 1263 | 321339.38 | 254.43 |

**Lectura de negocio:** la app tiene **más** compras pero tickets más chicos (compras cotidianas); el POS (las terminales de los comercios) tiene pocas compras pero el ticket más alto. Si el banco quiere aumentar el gasto, una campaña de cuotas sin interés en POS apunta a compras grandes; un cashback en la app apunta a frecuencia. Una consulta, una conversación con el área de marketing.

```recorrido
titulo: Gasto por canal, paso a paso
estacion tx: Transacciones | icono=tabla
estacion filtro: Solo compras | icono=lupa
estacion signo: Invertir el signo | icono=transformar
estacion agg: Por canal | icono=capas
estacion res: Resultado | icono=check
paso tx: Todo tipo de movimientos
`banco_transacciones` mezcla compras, depósitos, retiros y transferencias. Las que **sacan** dinero tienen monto negativo.
>>> tabla
tx_id,tipo,monto,canal
1,compra,-239.76,app
2,transferencia,-836,app
3,transferencia,-1493,app
4,retiro,-320,sucursal
5,deposito,1528,web
6,compra,-5.33,web
paso filtro: WHERE tipo = 'compra'
La pregunta es sobre **gasto**: un depósito no es gasto. Quedan solo las compras.
>>> tabla
tx_id,tipo,monto,canal
1,compra,-239.76,app
6,compra,-5.33,web
13,compra,-234.95,app
15,compra,-25.27,pos
16,compra,-22.53,pos
17,compra,-73.31,pos
paso signo: El gasto en positivo
`-monto` cambia el signo para que el gasto se lea como un número positivo. Sin esto, el "gasto" saldría negativo.
>>> tabla
tx_id,canal,monto,gasto
1,app,-239.76,239.76
6,web,-5.33,5.33
13,app,-234.95,234.95
15,pos,-25.27,25.27
16,pos,-22.53,22.53
17,pos,-73.31,73.31
paso agg: Agrupar por canal
`GROUP BY canal`: cantidad de compras, gasto total (`-SUM(monto)`) y ticket promedio (`-AVG(monto)`).
>>> sql
SELECT canal,
       COUNT(*)              AS compras,
       ROUND(-SUM(monto), 2) AS gasto,
       ROUND(-AVG(monto), 2) AS ticket_promedio
FROM banco_transacciones
WHERE tipo = 'compra'
GROUP BY canal
ORDER BY gasto DESC;
paso res: Una fila por canal
La app tiene más compras, pero el POS tiene el ticket más alto: dos tipos de cliente, dos campañas distintas.
>>> tabla
canal,compras,gasto,ticket_promedio
web,2072,441392,213.03
app,2663,331788,124.59
pos,1263,321339,254.43
```

:::cuidado Las trampas de este caso
- **El signo del monto**: si sumas compras sin invertir el signo, el "gasto" sale negativo; si sumas todos los tipos juntos, obtienes el saldo, no el gasto.
- **El "hoy" del análisis**: para saber si una cuota está vencida necesitas una fecha de referencia. Aquí es `2024-12-31`; nunca uses `date('now')`, porque el resultado cambiaría según el día en que ejecutes.
- **Contar clientes vs. cuentas**: un cliente puede tener varias cuentas. "Clientes con saldo negativo" y "cuentas con saldo negativo" son preguntas distintas.
:::

<!-- estandar:trabajo -->
:::trabajo
- En un banco, los saldos nunca se recalculan sumando todo el historial cada vez: se guardan **saldos diarios** (una foto por cuenta y día) y se concilian contra el sistema contable. Si no coinciden, se detiene todo hasta encontrar la diferencia.
- Las reglas de fraude se evalúan siempre con dos números: cuántos fraudes atrapa (cobertura) y cuántas alertas son falsas (precisión). Una regla con muchas falsas alarmas bloquea tarjetas de clientes honestos, y eso también cuesta.
- Los datos bancarios están muy regulados: acceso por roles, enmascaramiento de datos personales y auditoría de quién consultó qué. Lo verás en Unity Catalog, Lake Formation y BigQuery.
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

:::errores
- **Sumar montos sin mirar el signo**: si las compras son negativas y los depósitos positivos, "gasto total" sin filtrar el tipo da cualquier cosa.
- **Saldo acumulado sin desempate** en el orden de la ventana: dos movimientos con la misma hora intercambian el orden y el saldo intermedio cambia.
- **Reglas de fraude evaluadas sin la tasa de falsos positivos**: una regla que marca el 20 % de las compras como sospechosas no se puede revisar.
- **Mora contada por cuotas** cuando la pregunta es por préstamos.
:::

:::entrevista "¿Cómo calcularías el saldo de cada cuenta después de cada movimiento?"
Con una suma acumulada como función de ventana: `SUM(monto) OVER (PARTITION BY cuenta_id ORDER BY fecha_hora, tx_id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)`. El `tx_id` en el orden desempata movimientos con la misma hora para que el resultado sea determinista, y el marco explícito evita que filas empatadas se sumen juntas. Validaría que el último saldo coincida con el saldo informado por el sistema de origen.
:::
