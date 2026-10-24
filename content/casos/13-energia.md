---
titulo: "Caso ⚡ Luz del Valle: hurto de energía, cobranza y calidad del servicio"
nivel: Experto
duracion: 55
resumen: Una distribuidora eléctrica pierde energía que nadie paga. Detecta caídas bruscas de consumo (posible hurto) comparando períodos, mide la cobranza y la deuda por zona, calcula los índices de calidad SAIDI y SAIFI y la proporción de lecturas estimadas.
objetivos: Comparar el consumo de cada cliente entre dos períodos para detectar caídas anómalas | Calcular la cobranza a tiempo, la morosidad y la deuda por zona | Calcular los indicadores regulatorios de calidad SAIDI y SAIFI | Medir las lecturas estimadas por tipo de medidor y explicar su efecto en la facturación | Encontrar los meses de mayor consumo por tipo de cliente
prerrequisitos: casos-metodo | sql-case | sql-fechas
autoevaluacion: ¿Sabes comparar el promedio de dos períodos del mismo cliente en una sola consulta? | ¿Puedes explicar por qué una caída del 80 % del consumo es sospechosa? | ¿Sabes calcular SAIDI y SAIFI? | ¿Sabes qué es una lectura estimada y por qué genera reclamos? | ¿Puedes calcular la deuda impaga por zona?
---

<!-- estandar:escenario -->
:::escenario La energía que se pierde
El gerente de **Luz del Valle**, una distribuidora eléctrica, recibe dos presiones a la vez:

> "El regulador nos va a multar si no mejoramos los cortes en la zona rural. Y el balance de energía no cierra: compramos bastante más de lo que facturamos. Parte es pérdida técnica de la red, pero sospechamos que hay **conexiones clandestinas** y medidores manipulados. Las cuadrillas de inspección son pocas: díganme **a qué casas mandarlas**."
:::

## Cómo funciona una distribuidora eléctrica

La distribuidora compra energía en bloque y la lleva hasta cada casa, comercio o industria por su red. Cada cliente tiene un **medidor**: los **analógicos** los lee una persona una vez por mes (y si no puede entrar, la lectura se **estima**); los **inteligentes** envían la lectura solos.

Las **pérdidas** son la energía comprada que no se factura: una parte es técnica (calor en los cables) y otra es **no técnica**: hurto (conexiones directas a la red, medidores alterados) y errores de medición. Un cliente que manipula el medidor sigue consumiendo, pero el medidor registra mucho menos: en los datos aparece como una **caída brusca y sostenida** del consumo.

| KPI | Fórmula | Para qué |
|---|---|---|
| **Caída de consumo** | consumo reciente / consumo de referencia | Detectar posibles hurtos |
| **Cobranza a tiempo** | facturas pagadas hasta el vencimiento / facturas | Salud financiera |
| **Morosidad** | facturas impagas / facturas | Riesgo de cobro |
| **SAIDI** | minutos sin servicio × clientes afectados / clientes de la zona | Minutos sin luz por cliente en el año (regulatorio) |
| **SAIFI** | clientes afectados / clientes de la zona | Cantidad de cortes por cliente en el año (regulatorio) |
| **% de lecturas estimadas** | lecturas estimadas / lecturas | Calidad de la medición |

## El modelo de datos

```text
energia_clientes  (cliente_id, tipo, zona, fecha_alta)
energia_medidores (medidor_id, cliente_id, tipo, fecha_instalacion)
energia_lecturas  (lectura_id, medidor_id, mes, kwh, estimada)          ← una por medidor y mes de 2024
energia_facturas  (factura_id, cliente_id, mes, kwh, monto, fecha_vencimiento, fecha_pago)
energia_cortes    (corte_id, zona, inicio, fin, causa, clientes_afectados)
```

```diagrama
titulo: Modelo de Luz del Valle: consumo por medidor, facturas por cliente y cortes por zona
nodo cli: energia_clientes | icono=usuario | col=0 | fila=0 | color=azul | sub=tipo, zona
nodo med: energia_medidores | icono=energia | col=1 | fila=0 | color=amarillo | sub=inteligente\no analógico
nodo lec: energia_lecturas | icono=grafico | col=2 | fila=0 | color=verde | sub=kWh por mes\nestimada 0/1
nodo fac: energia_facturas | icono=dinero | col=1 | fila=1 | color=violeta | sub=monto, vencimiento,\nfecha de pago
nodo cor: energia_cortes | icono=alerta | col=0 | fila=1 | color=rojo | sub=por zona: inicio, fin,\nafectados
flecha cli -> med: 1 a 1
flecha med -> lec: 1 a N
flecha cli -> fac: 1 a N
flecha cor -- cli: por zona | estilo=punteada
```

- Cada cliente tiene un medidor. El **consumo** se lee en `energia_lecturas` (por medidor); la **plata**, en `energia_facturas` (por cliente).
- `fecha_pago` en `NULL` = impaga. Pagada a tiempo = `fecha_pago <= fecha_vencimiento`.
- Los cortes no están ligados a clientes individuales sino a una **zona**, con la cantidad de clientes afectados.

## Un ejemplo resuelto: caídas bruscas de consumo

**Pregunta:** "¿Qué clientes consumen, a fin de año, menos de la mitad de lo que consumían a principio de año?"

1. **Grano**: un cliente por fila, con dos números: promedio de enero–marzo (referencia) y promedio de octubre–diciembre (reciente).
2. **Truco**: `AVG(CASE WHEN período THEN kwh END)` calcula los dos promedios en la misma pasada (el `CASE` sin `ELSE` deja `NULL` fuera del período, y `AVG` los ignora).
3. **Comparar** los dos promedios de cada cliente, no de toda la base: así no importa que un comercio consuma diez veces más que una casa.

```sql
WITH x AS (
  SELECT m.cliente_id, c.tipo, c.zona,
         AVG(CASE WHEN l.mes <= '2024-03' THEN l.kwh END) AS kwh_ene_mar,
         AVG(CASE WHEN l.mes >= '2024-10' THEN l.kwh END) AS kwh_oct_dic
  FROM energia_lecturas l
  JOIN energia_medidores m ON m.medidor_id = l.medidor_id
  JOIN energia_clientes c ON c.cliente_id = m.cliente_id
  GROUP BY m.cliente_id, c.tipo, c.zona
)
SELECT cliente_id, tipo, zona,
       ROUND(kwh_ene_mar) AS antes, ROUND(kwh_oct_dic) AS despues,
       ROUND(100.0 * kwh_oct_dic / kwh_ene_mar, 1) AS pct_del_consumo
FROM x
WHERE kwh_oct_dic < 0.5 * kwh_ene_mar
ORDER BY pct_del_consumo;
```

Las primeras filas (de 25):

| cliente_id | tipo | zona | antes | despues | pct_del_consumo |
|---|---|---|---|---|---|
| 245 | residencial | Centro | 247 | 40 | 16.1 |
| 694 | residencial | Rural | 141 | 23 | 16.3 |
| 270 | residencial | Norte | 262 | 44 | 16.8 |
| 940 | residencial | Centro | 506 | 86 | 17 |

**Lectura:** 25 clientes pasaron a consumir entre el 16 % y el 25 % de lo que consumían. Una casa no reduce su consumo en un 80 % de un mes para otro sin una razón (una mudanza, una casa vacía). Esta lista, ordenada, es la **hoja de ruta de las cuadrillas**: primero los comercios (más energía en juego) y los casos más extremos.

:::cuidado Las trampas de este caso
- **Estacionalidad**: comparar enero (verano, aire acondicionado) con octubre puede dar caídas "normales". Una regla más robusta compara con el **mismo mes del año anterior**, o con el consumo de clientes parecidos de la misma zona.
- **Casas vacías y mudanzas**: también caen a casi cero. Antes de mandar una cuadrilla, se cruza con bajas, cambios de titular y facturas.
- **Lecturas estimadas**: si el lector no entró, el kWh es una estimación (suele ser el promedio histórico) y **oculta** la caída. Las caídas se miden con lecturas reales.
- **SAIDI/SAIFI se dividen por los clientes de la zona**, no por los afectados: miden la experiencia del cliente promedio.
:::

<!-- estandar:trabajo -->
:::trabajo
- Las distribuidoras usan modelos de detección de hurto con las lecturas de los **medidores inteligentes** cada 15 minutos (curvas de carga), y cruzan con inspecciones previas, deuda y hasta imágenes satelitales. El primer paso siempre es una regla como la de este caso.
- El resultado de cada inspección (¿había hurto?) se vuelve a cargar en la base: es la etiqueta que permite medir la precisión de la regla y entrenar un modelo.
- SAIDI y SAIFI se reportan al regulador con reglas exactas (qué cortes cuentan, cómo se excluyen los de fuerza mayor): esa lógica vive en un modelo de gold versionado y auditable, no en una planilla.
:::

<!-- estandar:entrevista -->
:::entrevista "¿Cómo detectarías anomalías en series de consumo de miles de clientes?"
Empiezo comparando cada cliente consigo mismo: su consumo reciente contra su línea base (el mismo período del año anterior o su promedio estable), para no confundir tamaños distintos. Marco caídas fuertes y sostenidas (varios meses, no un mes aislado), descarto explicaciones conocidas (casa vacía, cambio de titular, lecturas estimadas) y además comparo con sus vecinos de zona, para separar efectos de clima. Priorizo por energía en juego y mido la precisión con el resultado de las inspecciones.
:::

## Ejercicios

:::ejercicio sql ordenado titulo="Cobranza y deuda por zona"
Por `zona` del cliente: `facturas`, `pct_a_tiempo` (pagadas hasta el vencimiento), `pct_impagas` (sin fecha de pago), ambos redondeados a 1, y `deuda` (suma de los montos impagos, redondeada a 0). Ordena por `deuda` descendente.
```sql solucion
SELECT c.zona,
       COUNT(*) AS facturas,
       ROUND(100.0 * AVG(f.fecha_pago IS NOT NULL AND f.fecha_pago <= f.fecha_vencimiento), 1) AS pct_a_tiempo,
       ROUND(100.0 * AVG(f.fecha_pago IS NULL), 1) AS pct_impagas,
       ROUND(SUM(CASE WHEN f.fecha_pago IS NULL THEN f.monto ELSE 0 END), 0) AS deuda
FROM energia_facturas f
JOIN energia_clientes c ON c.cliente_id = f.cliente_id
GROUP BY c.zona
ORDER BY deuda DESC;
```
```explicacion
La zona Industrial tiene pocas facturas impagas pero concentra la mayor deuda: pocos clientes grandes que no pagan pesan más que muchos chicos. Por eso la deuda se mira en monto, no solo en porcentaje.
```
:::

:::ejercicio sql ordenado titulo="SAIDI y SAIFI por zona"
Por `zona`: `cortes`, `saidi_min` (suma de minutos de corte × clientes afectados, dividida por los clientes de la zona, redondeado a 1) y `saifi` (suma de clientes afectados / clientes de la zona, redondeado a 2). Ordena por `saidi_min` descendente.
```sql solucion
WITH cz AS (
  SELECT zona, COUNT(*) AS clientes FROM energia_clientes GROUP BY zona
)
SELECT c.zona,
       COUNT(*) AS cortes,
       ROUND(SUM((julianday(c.fin) - julianday(c.inicio)) * 1440 * c.clientes_afectados) / cz.clientes, 1) AS saidi_min,
       ROUND(1.0 * SUM(c.clientes_afectados) / cz.clientes, 2) AS saifi
FROM energia_cortes c
JOIN cz ON cz.zona = c.zona
GROUP BY c.zona, cz.clientes
ORDER BY saidi_min DESC;
```
```pista
`julianday(fin) - julianday(inicio)` da días; por 1440 son minutos. El denominador son **todos** los clientes de la zona (un CTE que los cuente).
```
```explicacion
La zona Rural acumula más de 40 horas sin luz por cliente en el año y más de 14 cortes por cliente: es la zona que preocupa al regulador, y la que necesita inversión en red (las tormentas causan los cortes más largos).
```
:::

:::ejercicio sql ordenado titulo="Cortes por causa"
Por `causa`: `cortes`, `minutos_promedio` (duración promedio, redondeada a 0) y `clientes_afectados` (suma). Ordena por `minutos_promedio` descendente.
```sql solucion
SELECT causa,
       COUNT(*) AS cortes,
       ROUND(AVG((julianday(fin) - julianday(inicio)) * 1440), 0) AS minutos_promedio,
       SUM(clientes_afectados) AS clientes_afectados
FROM energia_cortes
GROUP BY causa
ORDER BY minutos_promedio DESC;
```
:::

:::ejercicio sql ordenado titulo="Lecturas estimadas por tipo de medidor"
Por tipo de medidor (`tipo`): `lecturas` y `pct_estimadas` (redondeado a 1). Ordena por `tipo`.
```sql solucion
SELECT m.tipo,
       COUNT(*) AS lecturas,
       ROUND(100.0 * AVG(l.estimada), 1) AS pct_estimadas
FROM energia_lecturas l
JOIN energia_medidores m ON m.medidor_id = l.medidor_id
GROUP BY m.tipo
ORDER BY m.tipo;
```
```explicacion
Una de cada ocho lecturas de medidores analógicos es estimada; las de los inteligentes, ninguna. Cada estimación es una factura que puede estar mal (y un reclamo) y un mes en el que un hurto no se ve: es parte del caso de negocio para cambiar medidores.
```
:::

:::ejercicio sql ordenado titulo="El mes de mayor consumo por tipo de cliente"
Por `tipo` de cliente y `mes`, el consumo total. Muestra solo el mes de **mayor** consumo de cada tipo: `tipo`, `mes`, `kwh_total`. Ordena por `tipo`.
```sql solucion
WITH m AS (
  SELECT c.tipo, l.mes, SUM(l.kwh) AS kwh_total
  FROM energia_lecturas l
  JOIN energia_medidores md ON md.medidor_id = l.medidor_id
  JOIN energia_clientes c ON c.cliente_id = md.cliente_id
  GROUP BY c.tipo, l.mes
),
r AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY tipo ORDER BY kwh_total DESC) AS n FROM m
)
SELECT tipo, mes, kwh_total FROM r WHERE n = 1 ORDER BY tipo;
```
```pista
Agrega por tipo y mes, numera con `ROW_NUMBER() OVER (PARTITION BY tipo ORDER BY kwh_total DESC)` y quédate con `n = 1`.
```
:::

:::ejercicio sql titulo="La lista para las cuadrillas"
Prepara la lista de inspección: clientes **con medidor inteligente** cuyo consumo de octubre–diciembre es menor al 50 % del de enero–marzo **y** que no tienen facturas impagas (no son casas abandonadas: siguen pagando). Columnas: `cliente_id`, `tipo`, `zona`, `kwh_perdidos_mes` (diferencia entre los dos promedios, redondeada a 0). Ordena por `kwh_perdidos_mes` descendente.
```sql solucion
WITH x AS (
  SELECT m.cliente_id,
         AVG(CASE WHEN l.mes <= '2024-03' THEN l.kwh END) AS antes,
         AVG(CASE WHEN l.mes >= '2024-10' THEN l.kwh END) AS despues
  FROM energia_lecturas l
  JOIN energia_medidores m ON m.medidor_id = l.medidor_id
  WHERE m.tipo = 'inteligente'
  GROUP BY m.cliente_id
)
SELECT c.cliente_id, c.tipo, c.zona,
       ROUND(x.antes - x.despues, 0) AS kwh_perdidos_mes
FROM x
JOIN energia_clientes c ON c.cliente_id = x.cliente_id
WHERE x.despues < 0.5 * x.antes
  AND NOT EXISTS (SELECT 1 FROM energia_facturas f WHERE f.cliente_id = c.cliente_id AND f.fecha_pago IS NULL)
ORDER BY kwh_perdidos_mes DESC;
```
```pista
Filtra los medidores inteligentes dentro del CTE (sus lecturas son reales). Para excluir a los que deben, usa `NOT EXISTS` con las facturas impagas.
```
:::

:::ejercicio abierto titulo="El informe para el gerente"
Escribe el informe en cuatro partes: (1) el plan de inspecciones de las próximas cuatro semanas (cuántas, en qué orden y con qué lista); (2) qué le contestarías al regulador sobre la zona Rural y qué inversiones propondrías, con los datos de causas; (3) por qué los medidores inteligentes son parte de la solución a los dos problemas; (4) qué datos pedirías para mejorar la detección.
```solucion
1. Inspecciones: empezar por la lista de medidores inteligentes con caída >50 % y sin deuda (lecturas reales, cliente activo), ordenada por kWh perdidos por mes; los comercios primero. Con ~25 casos en total en la base, una cuadrilla de 2 personas los cubre en un mes. Registrar el resultado de cada inspección (hurto sí/no, tipo) para medir la precisión de la regla.
2. Regulador: la zona Rural tiene el peor SAIDI (más de 40 h por cliente al año) y la mayor frecuencia de cortes. Las tormentas causan los cortes más largos: proponer poda preventiva y reemplazo de líneas aéreas en los tramos con más fallas, reconectadores automáticos para aislar fallas sin dejar sin luz a toda la zona, y cuadrillas de guardia en verano. Presentar la meta trimestral de SAIDI y cómo se va a medir.
3. Medidores inteligentes: eliminan las lecturas estimadas (una de cada ocho en analógicos), permiten detectar hurtos al día y no al mes, y avisan automáticamente cuándo un cliente se queda sin servicio (mejor dato de SAIDI y respuesta más rápida). Priorizar el recambio en la zona Rural y en los clientes con caídas sospechosas.
4. Datos: curva de carga cada 15 minutos (inteligentes), resultados de inspecciones anteriores, cambios de titular y bajas, balance de energía por transformador (energía que entra al transformador vs. la suma de sus clientes: la diferencia localiza la pérdida), y temperatura diaria por zona para separar efectos de clima.
```
:::
