---
titulo: "Caso 📦 Mercurio: stock, quiebres y entregas a tiempo"
nivel: Experto
duracion: 55
resumen: Stock a partir de movimientos, quiebres de stock, rotación, entregas a tiempo por transportista y costo por envío.
objetivos: Calcular stock a una fecha sumando movimientos con signo | Detectar quiebres de stock día por día con acumulados | Medir entregas a tiempo (OTD) y retraso por transportista | Calcular el costo real por envío exitoso incluyendo devoluciones y pérdidas
prerrequisitos: casos-metodo | sql-ventanas-2
autoevaluacion: ¿Puedes calcular el stock de cada SKU y almacén a una fecha? | ¿Puedes contar cuántos días terminó un SKU con stock negativo? | ¿Puedes calcular el porcentaje de envíos entregados a tiempo por transportista? | ¿Sabes por qué el costo por envío exitoso es más justo que el costo por envío? | ¿Sabes qué significa un stock negativo en los datos y qué hacer con él?
---

<!-- estandar:escenario -->
:::escenario Mercurio
La jefa de operaciones de **Mercurio**, la empresa de logística, tiene que renegociar contratos:

> "Tenemos tres transportistas y cada uno dice que es el mejor. Quiero ver cuántos envíos entrega cada uno a tiempo y cuánto nos cuestan de verdad, contando los que se pierden. Y en los depósitos, hay productos que se quedan sin stock y nadie se entera hasta que un cliente se queja."

En logística, el inventario se calcula a partir de movimientos (entradas y salidas), y un error en un signo hace que el sistema diga que hay stock cuando no lo hay.
:::
**Mercurio Logística** gestiona seis almacenes y despacha envíos con cuatro transportistas. No guarda el stock en una tabla: guarda **movimientos** (como un extracto bancario) y el stock se **calcula**.

## El modelo de datos

```text
logistica_almacenes (almacen_id, ciudad, capacidad_unidades)
logistica_movimientos (movimiento_id, almacen_id, sku, fecha, tipo, cantidad)   -- entrada (+), salida (-), ajuste (-)
logistica_envios (envio_id, almacen_id, ciudad_destino, transportista,
                  fecha_despacho, fecha_prometida, fecha_entrega, costo, estado)
```

- **Stock** de un SKU en un almacén a una fecha = suma de `cantidad` de sus movimientos hasta esa fecha (inclusive).
- **Quiebre de stock**: días en que el stock quedó **negativo** (se registraron salidas sin mercadería: un error operativo grave).
- Un envío es **a tiempo** si se entregó el día prometido o antes: `date(fecha_entrega) <= fecha_prometida`.

## Cómo funciona una empresa de logística

Mercurio tiene dos negocios entrelazados:

1. **Almacenamiento**: guarda mercadería de sus clientes en seis almacenes. Debe saber en todo momento **cuánto hay de cada producto (SKU)** en cada almacén, para no vender lo que no tiene ni ocupar espacio con lo que no rota.
2. **Distribución**: despacha envíos con transportistas tercerizados y promete una fecha de entrega. Cumplir esa promesa (y a buen costo) es lo que el cliente final percibe.

El detalle técnico clave del caso: el **stock no se guarda**, se **calcula**. La tabla `logistica_movimientos` es un registro de cada entrada (+), salida (−) y ajuste (−), como un extracto bancario. Esto es muy común en sistemas reales (contabilidad, inventarios, billeteras), porque permite reconstruir el stock de **cualquier día** del pasado y auditar cada cambio.

| KPI | Fórmula | Por qué importa |
|---|---|---|
| **Stock a una fecha** | `SUM(cantidad)` de los movimientos hasta esa fecha | Base de todo |
| **Ocupación del almacén** | stock / capacidad | ¿Hace falta otro almacén? ¿Sobra espacio pagado? |
| **Rotación** | unidades que salen / stock promedio | SKUs que se mueven vs. mercadería "dormida" |
| **Quiebre de stock** | días con stock negativo | Errores operativos: se despachó lo que no había |
| **Entrega a tiempo (OTD)** | entregados a tiempo / entregados | Calidad del transportista |
| **Costo por envío exitoso** | costo total / envíos entregados | Un transportista barato que pierde paquetes sale caro |

## Un ejemplo resuelto paso a paso

**Pregunta:** "¿Qué tan llenos están los almacenes al final del año?"

1. **Grano**: una fila por almacén.
2. **Stock final**: la suma de **todos** los movimientos de cada almacén (las salidas ya vienen con signo negativo).
3. **Ocupación**: stock / capacidad.

```sql
SELECT a.ciudad,
       a.capacidad_unidades,
       SUM(m.cantidad)                                          AS stock_final,
       ROUND(100.0 * SUM(m.cantidad) / a.capacidad_unidades, 1) AS pct_ocupacion
FROM logistica_movimientos m
JOIN logistica_almacenes a ON a.almacen_id = m.almacen_id
GROUP BY a.ciudad, a.capacidad_unidades
ORDER BY pct_ocupacion DESC;
```

| ciudad | capacidad_unidades | stock_final | pct_ocupacion |
|---|---|---|---|
| Lima | 30000 | 3150 | 10.5 |
| Monterrey | 25000 | 2209 | 8.8 |
| Bogotá | 40000 | 2808 | 7.0 |
| … | … | … | … |

**Lectura de negocio:** todos los almacenes están **muy vacíos** al cierre del año (menos del 11 %). O se dimensionaron para picos de temporada, o la empresa está pagando espacio que no usa: una conversación concreta para el área de finanzas.

```recorrido
titulo: La ocupación de los almacenes al cierre del año, paso a paso
estacion m: Movimientos | icono=archivo
estacion signo: Con signo | icono=transformar
estacion stock: Stock final | icono=capas
estacion cap: Capacidad | icono=base
estacion res: Ocupación | icono=check
paso m: Entradas, salidas y ajustes
`logistica_movimientos` registra cada movimiento de mercadería en cada almacén.
>>> tabla
movimiento_id,almacen_id,fecha,tipo,cantidad
1,1,2024-01-01,entrada,52
2,1,2024-01-01,entrada,136
3,1,2024-01-01,entrada,250
4,1,2024-01-01,salida,-5
5,1,2024-01-01,entrada,238
6,1,2024-01-01,salida,-20
paso signo: Las salidas ya vienen en negativo
Por eso el stock es simplemente la **suma** de todas las cantidades: no hace falta un `CASE` por tipo.
>>> tabla
tipo,minimo,maximo
ajuste,-10,-1
entrada,39,1083
salida,-81,-1
paso stock: El stock final de cada almacén
`SUM(m.cantidad)` por almacén, sobre todo el año.
>>> tabla
almacen_id,stock_final
1,2150
2,1179
3,2680
4,2209
5,2808
paso cap: Traer la capacidad
`JOIN logistica_almacenes` agrega la ciudad y cuántas unidades caben.
>>> tabla
almacen_id,ciudad,capacidad_unidades,stock_final
1,Buenos Aires,50000,2150
2,Córdoba,20000,1179
3,Ciudad de México,60000,2680
4,Monterrey,25000,2209
5,Bogotá,40000,2808
paso res: stock / capacidad
Todos los almacenes están casi vacíos al cierre: una conversación concreta para finanzas.
>>> tabla
ciudad,capacidad_unidades,stock_final,pct_ocupacion
Lima,30000,3150,10.5
Monterrey,25000,2209,8.8
Bogotá,40000,2808,7
Córdoba,20000,1179,5.9
Ciudad de México,60000,2680,4.5
```

:::cuidado Las trampas de este caso
- **Las salidas y ajustes ya son negativos**: sumar `cantidad` directamente da el stock. Si además las restaras con un `CASE`, las contarías dos veces.
- **Stock a una fecha = acumulado hasta esa fecha inclusive**: es una suma acumulada (`SUM(…) OVER (… ORDER BY fecha)`), no la suma del día.
- **Días sin movimientos**: el stock existe aunque ese día no hubiera movimientos; para series diarias completas necesitas un calendario.
- **A tiempo se compara contra la fecha prometida, en fecha** (`date(fecha_entrega) <= fecha_prometida`): la hora de entrega no importa.
:::

<!-- estandar:trabajo -->
:::trabajo
- Los sistemas de inventario guardan **movimientos**, y el stock se calcula acumulándolos. En los pipelines se guarda además una foto diaria del stock por SKU y almacén, para no recalcular años de movimientos en cada consulta.
- Un stock negativo en los datos casi siempre es un error de registro: una salida cargada antes que la entrada, o una entrada que nunca se registró. Detectarlos es una tarea típica de calidad de datos.
:::

## Ejercicios

:::ejercicio sql titulo="Stock al cierre del año"
Stock al `2024-12-31` por almacén y SKU. Columnas: `almacen_id`, `sku`, `stock`.
```sql solucion
SELECT almacen_id, sku, SUM(cantidad) AS stock
FROM logistica_movimientos
WHERE fecha <= '2024-12-31'
GROUP BY almacen_id, sku;
```
:::

:::ejercicio sql titulo="Días con quiebre de stock"
Usando el stock acumulado **al final de cada día**, cuenta para cada almacén y SKU cuántos días terminaron con stock negativo. Devuelve solo los que tuvieron al menos un día así. Columnas: `almacen_id`, `sku`, `dias_quiebre`.
```sql solucion
WITH diario AS (
  SELECT almacen_id, sku, fecha, SUM(cantidad) AS neto
  FROM logistica_movimientos GROUP BY almacen_id, sku, fecha
),
acum AS (
  SELECT almacen_id, sku, fecha,
         SUM(neto) OVER (PARTITION BY almacen_id, sku ORDER BY fecha ROWS UNBOUNDED PRECEDING) AS stock
  FROM diario
)
SELECT almacen_id, sku, COUNT(*) AS dias_quiebre
FROM acum WHERE stock < 0
GROUP BY almacen_id, sku;
```
```pista
Primero suma los movimientos de cada día (un día puede tener entrada y salida). Después acumula con una ventana por almacén y SKU ordenada por fecha.
```
:::

:::ejercicio sql ordenado titulo="SKUs que más rotan"
Las **unidades despachadas** (salidas, en positivo) por SKU en todo el año, en todos los almacenes: `sku`, `unidades`. Devuelve los 5 con más unidades (desempata por `sku`).
```sql solucion
SELECT sku, -SUM(cantidad) AS unidades
FROM logistica_movimientos WHERE tipo = 'salida'
GROUP BY sku
ORDER BY unidades DESC, sku
LIMIT 5;
```
:::

:::ejercicio sql ordenado titulo="Puntualidad por transportista"
Para los envíos **entregados**, por `transportista`: `envios`, `a_tiempo` y `pct_a_tiempo` (redondeado a 2), y el retraso promedio en días de los que llegaron tarde (`dias_retraso_promedio`, redondeado a 2). Ordena por puntualidad descendente.
```sql solucion
SELECT transportista, COUNT(*) AS envios,
       SUM(CASE WHEN date(fecha_entrega) <= fecha_prometida THEN 1 ELSE 0 END) AS a_tiempo,
       ROUND(100.0 * SUM(CASE WHEN date(fecha_entrega) <= fecha_prometida THEN 1 ELSE 0 END) / COUNT(*), 2) AS pct_a_tiempo,
       ROUND(AVG(CASE WHEN date(fecha_entrega) > fecha_prometida THEN julianday(date(fecha_entrega)) - julianday(fecha_prometida) END), 2) AS dias_retraso_promedio
FROM logistica_envios
WHERE estado = 'entregado'
GROUP BY transportista
ORDER BY pct_a_tiempo DESC;
```
```pista
`AVG(CASE WHEN tarde THEN dias END)` promedia solo los tardíos: los demás quedan en NULL y `AVG` los ignora.
```
:::

:::ejercicio sql ordenado titulo="Costo por envío exitoso"
El costo de los envíos **devueltos** y **perdidos** también se paga. Por transportista, calcula el costo total (`costo_total`) y el **costo por envío entregado** (`costo_por_entregado` = costo total / entregados). Redondea a 2. Ordena por costo por entregado ascendente.
```sql solucion
SELECT transportista, ROUND(SUM(costo), 2) AS costo_total,
       ROUND(SUM(costo) / SUM(CASE WHEN estado = 'entregado' THEN 1 ELSE 0 END), 2) AS costo_por_entregado
FROM logistica_envios
GROUP BY transportista
ORDER BY costo_por_entregado;
```
:::

:::ejercicio sql ordenado titulo="Envíos por día y pico semanal"
Para cada almacén, ¿qué **día de la semana** despacha más envíos en promedio? Calcula envíos por fecha de despacho, promedia por día de la semana y quédate con el máximo de cada almacén. Columnas: `almacen_id`, `dia_semana` (0 = domingo … 6 = sábado), `promedio_envios` (redondeado a 2). Ordena por almacén.
```sql solucion
WITH d AS (
  SELECT almacen_id, date(fecha_despacho) AS dia, CAST(strftime('%w', fecha_despacho) AS INTEGER) AS dia_semana, COUNT(*) AS n
  FROM logistica_envios GROUP BY almacen_id, dia
),
p AS (
  SELECT almacen_id, dia_semana, AVG(n) AS prom FROM d GROUP BY almacen_id, dia_semana
),
r AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY almacen_id ORDER BY prom DESC, dia_semana) AS rn FROM p)
SELECT almacen_id, dia_semana, ROUND(prom, 2) AS promedio_envios FROM r WHERE rn = 1 ORDER BY almacen_id;
```
:::

:::errores
- **Stock calculado sin agregar los movimientos por día** antes de acumular.
- **Días de quiebre que no cuentan los días sin movimientos**: hay que generar la grilla de días.
- **Rotación con el stock final** en vez del stock promedio del período.
- **Costo por envío promediando costos por transportista** sin ponderar por la cantidad de envíos.
:::

:::entrevista "¿Cómo medirías la puntualidad de los transportistas?"
Definiría entrega a tiempo como entregada en o antes de la fecha prometida, contando los envíos vencidos y sin entregar como impuntuales, para no premiar a quien no entrega. Lo calcularía por transportista y mes sobre los envíos cuya fecha prometida ya pasó, mostraría la cantidad de envíos y la demora promedio de los atrasados, y compararía por región porque las rutas no son iguales.
:::
