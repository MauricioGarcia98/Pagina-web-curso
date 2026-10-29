---
titulo: "Caso 📱 Conecta: bajas de clientes (churn), reclamos y ARPU en una telco"
nivel: Experto
duracion: 55
resumen: Una operadora móvil pierde clientes por portabilidad. Mide la tasa de bajas por región y plan, relaciona los reclamos con las bajas, calcula ingresos y ARPU por mes y encuentra líneas que necesitan un plan más grande.
objetivos: Calcular la tasa de bajas (churn) por segmento con el denominador correcto | Relacionar los reclamos de una línea con su probabilidad de baja | Calcular ingresos y ARPU mensuales a partir del consumo | Detectar oportunidades de venta (líneas que superan su plan) | Construir una tabla mensual de churn: activas al inicio, bajas y tasa
prerrequisitos: casos-metodo | sql-case | sql-ventanas-1
autoevaluacion: ¿Sabes por qué el churn se calcula sobre las líneas y no sobre los clientes? | ¿Puedes medir cuánto más se dan de baja las líneas con reclamos? | ¿Sabes qué es el ARPU y cómo calcularlo por mes? | ¿Puedes encontrar las líneas que superan sus GB tres meses o más? | ¿Puedes calcular la tasa mensual de bajas sobre las activas al inicio del mes?
---

<!-- estandar:escenario -->
:::escenario Conecta pierde líneas
La gerenta comercial de **Conecta**, una operadora móvil, abre la reunión con un gráfico que baja:

> "Cada mes se van más líneas, y casi todas se van a la competencia con su número (portabilidad). Necesito saber **dónde** se van, **por qué**, y a quién llamar **antes** de que se vaya. Ah, y finanzas quiere el ARPU mes a mes."

En una telco, captar un cliente cuesta varias veces más que retenerlo. Un punto de churn menos al mes son millones al año.
:::

## Cómo funciona una telco móvil

Conecta vende **líneas** (un número de teléfono con un plan). Un **cliente** (una persona o una empresa) puede tener varias líneas. Hay dos tipos de planes:

- **Prepago**: el cliente recarga saldo cuando quiere. No hay contrato: se puede ir sin avisar, y el ingreso por línea es bajo e irregular.
- **Pospago**: un abono mensual fijo con GB y minutos incluidos; si supera los GB, paga un excedente.

Cuando un cliente se va, puede llevarse su número a otra compañía: eso es la **portabilidad**, y es el motivo de baja más doloroso, porque el cliente se fue **a la competencia**.

| KPI | Fórmula | Por qué importa |
|---|---|---|
| **Churn (tasa de bajas)** | líneas dadas de baja / líneas del grupo | La métrica más vigilada de la industria |
| **Churn mensual** | bajas del mes / activas al inicio del mes | Se compara mes a mes y con la competencia |
| **ARPU** (*average revenue per user*) | ingresos del mes / líneas que facturaron ese mes | Cuánto deja cada línea en promedio |
| **Tasa de resolución** | reclamos resueltos / reclamos | Calidad de atención |
| **Excedentes** | meses en que una línea superó sus GB | Oportunidad de vender un plan más grande |

## El modelo de datos

```text
telco_clientes (cliente_id, tipo, region, fecha_alta, edad)
telco_planes   (plan_id, nombre, tipo, datos_gb, minutos, precio_mensual)
telco_lineas   (linea_id, cliente_id, plan_id, numero, fecha_alta, fecha_baja, motivo_baja)
telco_consumos (linea_id, mes, datos_gb, minutos, sms, monto_facturado)     ← una fila por línea y mes de 2024
telco_reclamos (reclamo_id, linea_id, fecha_hora, categoria, horas_resolucion, resuelto)
```

```diagrama
titulo: Modelo de Conecta: el grano de casi todo es la línea, no el cliente
nodo cli: telco_clientes | icono=usuario | col=0 | fila=0 | color=azul | sub=persona o empresa\nregión
nodo lin: telco_lineas | icono=telefono | col=1 | fila=0 | color=naranja | sub=alta, baja y motivo\nplan actual
nodo plan: telco_planes | icono=archivo | col=2 | fila=0 | color=gris | sub=GB, minutos, precio
nodo cons: telco_consumos | icono=grafico | col=1 | fila=1 | color=verde | sub=1 fila por línea y mes
nodo rec: telco_reclamos | icono=alerta | col=2 | fila=1 | color=rojo | sub=categoría, horas,\nresuelto
flecha cli -> lin: 1 a N
flecha plan -> lin: 1 a N
flecha lin -> cons: 1 a N
flecha lin -> rec: 1 a N
```

- `fecha_baja` en `NULL` = la línea sigue activa.
- `plan_id` es el plan **actual** (el último): las líneas que mejoraron de plan durante el año aparecen con el nuevo.
- `telco_consumos` tiene una fila por cada mes de 2024 en que la línea estuvo activa; el mes es texto `'2024-03'`.
- En prepago, `monto_facturado` son las recargas del mes.

## Un ejemplo resuelto paso a paso

**Pregunta:** "¿En qué región se dan más de baja?"

1. **Grano**: una fila por región. La región es del **cliente**, y la baja es de la **línea**: unimos `telco_lineas` con `telco_clientes`.
2. **Métrica**: `AVG(fecha_baja IS NOT NULL)` da la proporción de líneas con baja (en SQLite, `fecha_baja IS NOT NULL` vale 1 o 0).

```sql
SELECT c.region,
       COUNT(*) AS lineas,
       SUM(l.fecha_baja IS NOT NULL) AS bajas,
       ROUND(100.0 * AVG(l.fecha_baja IS NOT NULL), 1) AS pct_baja
FROM telco_lineas l
JOIN telco_clientes c ON c.cliente_id = l.cliente_id
GROUP BY c.region
ORDER BY pct_baja DESC;
```

| region | lineas | bajas | pct_baja |
|---|---|---|---|
| Andina | 234 | 55 | 23.5 |
| Sur | 379 | 55 | 14.5 |
| Norte | 395 | 42 | 10.6 |
| Centro | 656 | 65 | 9.9 |
| Costa | 254 | 21 | 8.3 |

**Lectura de negocio:** la región **Andina** pierde casi una de cada cuatro líneas, más del doble que Centro o Costa. Sur y Centro tienen la misma cantidad de bajas en números absolutos (55 y 65) pero tasas muy distintas: por eso se mira el **porcentaje**, no el conteo. La pregunta siguiente es *por qué*: los ejercicios cruzan las bajas con los reclamos (en Andina abundan los de **cobertura**).

:::cuidado Las trampas de este caso
- **Contar clientes en lugar de líneas**: una empresa con 6 líneas que da de baja una no "se fue". El churn se mide por línea (y aparte, por cliente, con otra definición).
- **El denominador del churn mensual**: son las líneas activas **al inicio** del mes, no las de fin de año ni el total histórico.
- **ARPU con el promedio de promedios**: el ARPU del año no es el promedio de los 12 ARPU mensuales; es ingresos totales / líneas-mes.
- **Causalidad**: que las líneas con reclamos se vayan más no prueba que el reclamo cause la baja (puede haber una causa común: la mala cobertura). Pero sí sirve para saber **a quién llamar**.
:::

<!-- estandar:trabajo -->
:::trabajo
- Las telcos tienen modelos de **propensión a la baja** que se recalculan cada semana; las variables más fuertes suelen ser exactamente las de este caso: reclamos recientes, región/antena, tipo de plan, antigüedad y caída del consumo.
- Los resultados se cargan al CRM y el equipo de retención llama a las líneas con mayor riesgo con una oferta. Después se mide si funcionó con un **grupo de control** (líneas de riesgo a las que no se llamó).
- Los datos de consumo reales vienen de los **CDR** (*call detail records*): miles de millones de registros por mes, procesados con Spark y agregados por línea y día.
:::

<!-- estandar:entrevista -->
:::entrevista "¿Cómo calcularías el churn mensual de una empresa de suscripciones?"
Defino el grano (línea, cuenta o cliente) y el período. Para cada mes: activas al inicio = altas antes del primer día del mes y sin baja antes de ese día; bajas del mes = bajas con fecha dentro del mes. Churn = bajas del mes / activas al inicio. Excluyo las altas del propio mes del denominador (o las informo aparte), y reviso casos borde: reactivaciones, bajas el mismo día del alta, y cambios de plan que el sistema registra como baja y alta.
:::

## Ejercicios

:::ejercicio sql ordenado titulo="Churn por plan"
Por plan (`plan`, el nombre de `telco_planes`): `lineas`, `bajas` y `pct_baja` (redondeado a 1). Ordena de mayor a menor `pct_baja`.
```sql solucion
SELECT p.nombre AS plan,
       COUNT(*) AS lineas,
       SUM(l.fecha_baja IS NOT NULL) AS bajas,
       ROUND(100.0 * AVG(l.fecha_baja IS NOT NULL), 1) AS pct_baja
FROM telco_lineas l
JOIN telco_planes p ON p.plan_id = l.plan_id
GROUP BY p.nombre
ORDER BY pct_baja DESC;
```
```pista
Es el mismo patrón del ejemplo resuelto, uniendo con `telco_planes` en lugar de `telco_clientes`.
```
:::

:::ejercicio sql ordenado titulo="¿Los reclamos anticipan la baja?"
Clasifica cada línea según cuántos reclamos tuvo: `'0'`, `'1'` o `'2+'` (columna `reclamos`). Para cada grupo: `lineas` y `pct_baja` (redondeado a 1). Ordena por `reclamos`.
```sql solucion
WITH r AS (
  SELECT linea_id, COUNT(*) AS n FROM telco_reclamos GROUP BY linea_id
)
SELECT CASE WHEN r.n IS NULL THEN '0' WHEN r.n = 1 THEN '1' ELSE '2+' END AS reclamos,
       COUNT(*) AS lineas,
       ROUND(100.0 * AVG(l.fecha_baja IS NOT NULL), 1) AS pct_baja
FROM telco_lineas l
LEFT JOIN r ON r.linea_id = l.linea_id
GROUP BY 1
ORDER BY 1;
```
```pista
Cuenta los reclamos por línea en un CTE y únelo con `LEFT JOIN`: las líneas sin reclamos quedan con `NULL`, que es el grupo `'0'`.
```
```explicacion
Las líneas sin reclamos se dan de baja alrededor del 7,5 %; con un reclamo, el doble; con dos o más, el triple. Un reclamo es una señal temprana barata de detectar: el equipo de retención puede llamar a toda línea que acumula su segundo reclamo.
```
:::

:::ejercicio sql ordenado titulo="Ingresos y ARPU por mes"
Para cada `mes` de `telco_consumos`: `lineas` que facturaron, `ingresos` (suma de `monto_facturado`) y `arpu` (ingresos / líneas), los dos redondeados a 2. Ordena por mes.
```sql solucion
SELECT mes,
       COUNT(*) AS lineas,
       ROUND(SUM(monto_facturado), 2) AS ingresos,
       ROUND(SUM(monto_facturado) / COUNT(*), 2) AS arpu
FROM telco_consumos
GROUP BY mes
ORDER BY mes;
```
:::

:::ejercicio sql ordenado titulo="Reclamos: tiempos y resolución por categoría"
Por `categoria` de reclamo: `reclamos`, `horas_promedio` (promedio de `horas_resolucion` de los resueltos, redondeado a 1) y `pct_resuelto` (redondeado a 1). Ordena de mayor a menor `horas_promedio`.
```sql solucion
SELECT categoria,
       COUNT(*) AS reclamos,
       ROUND(AVG(horas_resolucion), 1) AS horas_promedio,
       ROUND(100.0 * AVG(resuelto), 1) AS pct_resuelto
FROM telco_reclamos
GROUP BY categoria
ORDER BY horas_promedio DESC;
```
```pista
`AVG` ignora los `NULL`: los reclamos sin resolver no tienen horas y no entran en el promedio, que es lo que pide el enunciado.
```
:::

:::ejercicio sql titulo="Candidatas a un plan más grande"
Las líneas **pospago activas** que superaron los GB de su plan en **3 meses o más** de 2024 son candidatas a un upgrade. Lista `linea_id`, `plan`, `datos_plan` (GB del plan), `meses_excedidos` y `gb_promedio` (promedio de `datos_gb` en todos sus meses, redondeado a 1). Ordena por `meses_excedidos` descendente y `linea_id`.
```sql solucion
SELECT l.linea_id,
       p.nombre AS plan,
       p.datos_gb AS datos_plan,
       SUM(c.datos_gb > p.datos_gb) AS meses_excedidos,
       ROUND(AVG(c.datos_gb), 1) AS gb_promedio
FROM telco_lineas l
JOIN telco_planes p ON p.plan_id = l.plan_id
JOIN telco_consumos c ON c.linea_id = l.linea_id
WHERE p.tipo = 'pospago' AND l.fecha_baja IS NULL
GROUP BY l.linea_id, p.nombre, p.datos_gb
HAVING SUM(c.datos_gb > p.datos_gb) >= 3
ORDER BY meses_excedidos DESC, l.linea_id;
```
```pista
`SUM(condición)` cuenta los meses en que la condición es verdadera. El filtro sobre ese conteo va en `HAVING`.
```
:::

:::ejercicio sql ordenado titulo="Churn mensual sobre las activas al inicio"
Para cada mes de 2024 (`mes` en formato `'2024-01'`): `activas_inicio` (líneas dadas de alta antes del primer día del mes y sin baja antes de ese día), `bajas` (líneas con `fecha_baja` dentro del mes) y `churn_pct` (bajas / activas_inicio, redondeado a 2). Ordena por mes.
```sql solucion
WITH RECURSIVE meses(m) AS (
  SELECT '2024-01-01'
  UNION ALL
  SELECT date(m, '+1 month') FROM meses WHERE m < '2024-12-01'
)
SELECT substr(m, 1, 7) AS mes,
       (SELECT COUNT(*) FROM telco_lineas l
         WHERE l.fecha_alta < m AND (l.fecha_baja IS NULL OR l.fecha_baja >= m)) AS activas_inicio,
       (SELECT COUNT(*) FROM telco_lineas l
         WHERE l.fecha_baja >= m AND l.fecha_baja < date(m, '+1 month')) AS bajas,
       ROUND(100.0 *
         (SELECT COUNT(*) FROM telco_lineas l WHERE l.fecha_baja >= m AND l.fecha_baja < date(m, '+1 month'))
         / (SELECT COUNT(*) FROM telco_lineas l WHERE l.fecha_alta < m AND (l.fecha_baja IS NULL OR l.fecha_baja >= m)), 2) AS churn_pct
FROM meses
ORDER BY mes;
```
```pista
Genera los 12 primeros días de mes con un CTE recursivo (`date(m, '+1 month')`). Para cada uno, cuenta con subconsultas: activas al inicio (`fecha_alta < m` y sin baja antes de `m`) y bajas dentro del mes.
```
:::

:::ejercicio sql ordenado titulo="Motivos de baja en la región Andina"
Solo para líneas de clientes de la región `Andina` dadas de baja: `motivo_baja`, `bajas` y `pct` (sobre el total de bajas de Andina, redondeado a 1). Ordena por `bajas` descendente.
```sql solucion
SELECT l.motivo_baja,
       COUNT(*) AS bajas,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM telco_lineas l
JOIN telco_clientes c ON c.cliente_id = l.cliente_id
WHERE c.region = 'Andina' AND l.fecha_baja IS NOT NULL
GROUP BY l.motivo_baja
ORDER BY bajas DESC;
```
```pista
`SUM(COUNT(*)) OVER ()` suma los conteos de todos los grupos: sirve de denominador para el porcentaje sin otra subconsulta.
```
:::

:::ejercicio abierto titulo="El plan de retención"
Con lo que encontraste, escribe una propuesta de una página para la gerenta: (1) qué líneas llamarías primero y con qué criterio exacto (escríbelo como una consulta o como reglas); (2) qué le ofrecerías a cada grupo; (3) cómo medirías si la campaña funcionó; (4) qué le pedirías al equipo técnico para la región Andina.
```solucion
1. Prioridad: líneas activas con 2+ reclamos en los últimos 90 días, primero en Andina y Sur, primero pospago (más ingreso), y dentro de eso las de mayor monto facturado. En SQL: unir telco_lineas (fecha_baja IS NULL) con un conteo de reclamos recientes, filtrar >= 2, ordenar por región de riesgo y facturación.
2. Ofertas: reclamos de cobertura → explicar el plan de obras y ofrecer llamadas por WiFi o un descuento temporal; reclamos de facturación → revisar la factura y bonificar el error; líneas que exceden sus GB → plan superior al precio del actual por 3 meses (resuelve un dolor y sube el ARPU).
3. Medición: separar al azar un 10–20 % de las líneas de riesgo como grupo de control al que no se llama; comparar el churn a 90 días entre llamadas y control, y el costo de las ofertas contra el ingreso retenido.
4. Andina: el motivo dominante es portabilidad con reclamos de cobertura; pedir el detalle de antenas con más caídas y saturación, y priorizar inversión allí. Sin red, la retención comercial solo compra tiempo.
```
:::
