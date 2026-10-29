# area: Negocio

## KPI
alias: indicador clave, key performance indicator, métrica
nino: Es el **termómetro del negocio**: un número que te dice si las cosas van bien o mal, como la fiebre te dice si estás enfermo.
que: *Key Performance Indicator*: una métrica elegida porque mide el avance hacia un objetivo del negocio (ventas, retención, margen, tiempo de entrega). Un buen KPI tiene una **definición exacta** (fórmula, filtros, granularidad, zona horaria), un dueño, una meta y una frecuencia.
ejemplo: "Tasa de entrega a tiempo = pedidos entregados en ≤ 45 min / pedidos entregados, por día y ciudad, excluyendo cancelados". Meta: 92 %.
para: Que la empresa se mueva con números y no con opiniones.
cuidado: Si dos áreas calculan "ventas" distinto, habrá dos verdades: centraliza la definición (capa semántica).
ver: Capa semántica, Mart

## Churn
alias: tasa de abandono, cancelación, baja de clientes
nino: Es **cuántos amigos dejaron de venir a jugar** a tu casa este mes. Si cada mes se van muchos, aunque lleguen nuevos, el grupo no crece.
que: La proporción de clientes (o ingresos) que **se pierden** en un período. Churn de clientes = clientes que cancelaron en el mes / clientes activos al inicio del mes. En negocios sin contrato (apps, e-commerce), hay que **definir** "perdido" (por ejemplo, sin compras en 60 días).
ejemplo:
```sql
-- clientes activos en noviembre que no compraron en diciembre
SELECT 1.0 * COUNT(*) FILTER (WHERE dic.cliente_id IS NULL) / COUNT(*) AS churn
FROM (SELECT DISTINCT cliente_id FROM pedidos WHERE fecha >= '2024-11-01' AND fecha < '2024-12-01') nov
LEFT JOIN (SELECT DISTINCT cliente_id FROM pedidos WHERE fecha >= '2024-12-01' AND fecha < '2025-01-01') dic
USING (cliente_id);
```
para: Medir la salud de negocios por suscripción y recurrentes.
cuidado: Aclara si es churn de clientes o de ingresos, y desde qué base se calcula.
ver: Retención, Cohorte, MRR

## Cohorte
alias: cohort, análisis de cohortes
nino: Es **agrupar a los niños por el año en que entraron a la escuela**: así puedes comparar si los que entraron en 2023 siguen más que los que entraron en 2022.
que: Un grupo de clientes que comparten un evento de inicio en el mismo período (mes de registro o de primera compra). El análisis de cohortes sigue a cada grupo a lo largo del tiempo (mes 0, 1, 2…) para medir retención, ingresos o comportamiento, y se muestra como un triángulo (tabla de cohortes).
ejemplo:
```sql
WITH primera AS (SELECT cliente_id, DATE_TRUNC('month', MIN(fecha)) AS cohorte FROM pedidos GROUP BY 1)
SELECT p.cohorte, DATE_DIFF('month', p.cohorte, DATE_TRUNC('month', o.fecha)) AS mes,
       COUNT(DISTINCT o.cliente_id) AS activos
FROM pedidos o JOIN primera p USING (cliente_id)
GROUP BY 1, 2 ORDER BY 1, 2;
```
para: Saber si el producto mejora (las cohortes nuevas retienen más) sin que el crecimiento lo disimule.
ver: Retención, Churn

## Retención
alias: retention, tasa de retención
nino: Es **cuántos de los amigos que vinieron a tu cumpleaños vuelven al siguiente**. Si vuelven muchos, ¡tu fiesta les gustó!
que: El porcentaje de clientes de una cohorte que siguen **activos** después de N períodos: retención mes 3 = activos en el mes 3 de la cohorte / tamaño de la cohorte. Es lo complementario del churn. También existe la retención de ingresos (NRR), que incluye ventas adicionales.
ejemplo: Cohorte de enero: 1.000 clientes; en el mes 3 compran 280 → retención M3 = 28 %.
para: Medir si el producto genera hábito y valor.
ver: Cohorte, Churn

## MRR
alias: monthly recurring revenue, ingreso recurrente mensual, ARR
nino: Es **cuánto dinero te van a pagar sí o sí todos los meses** las personas suscritas, como la mesada que llega cada mes.
que: *Monthly Recurring Revenue*: la suma normalizada a un mes de los ingresos por suscripciones activas. Se descompone en **nuevo**, **expansión** (suben de plan), **contracción** (bajan), **churn** (cancelan) y **reactivación**. ARR = MRR × 12.
ejemplo: 300 clientes en plan básico de US$10 y 50 en plan pro de US$40 → MRR = 3.000 + 2.000 = US$5.000. Un plan anual de US$120 suma US$10 al MRR, no 120.
para: La métrica central de los negocios SaaS y de suscripción.
ver: Churn, ARPU, KPI

## ARPU
alias: average revenue per user, ingreso promedio por usuario, ticket promedio
nino: Si **juntas toda la plata** que gastaron los clientes y **la repartes en partes iguales**, cada parte es el ARPU.
que: Ingreso total de un período / usuarios (o clientes activos) del período. Parecido: **ticket promedio** (ingreso / pedidos) y **LTV** (ingreso esperado de un cliente durante toda su vida).
ejemplo: Diciembre: ingresos US$84.000 y 12.000 clientes activos → ARPU = US$7.
para: Comparar planes, segmentos y precios.
cuidado: Como todo promedio, esconde la distribución: unos pocos clientes grandes pueden inflarlo.
ver: MRR, Promedio de promedios

## GMV
alias: gross merchandise value, valor bruto de mercancía
nino: Es **el valor de todo lo que se vendió en la feria**, aunque la plata no fue toda para el dueño de la feria, sino para cada vendedor.
que: *Gross Merchandise Value*: el valor total de las transacciones que pasan por un marketplace o plataforma (precio × cantidad), antes de comisiones, descuentos, devoluciones y cancelaciones (según la definición de la empresa). No es el ingreso de la empresa.
ejemplo: Una app de delivery procesa US$1.000.000 en pedidos en el mes: ese es el GMV. Si cobra 20 % de comisión, su ingreso es US$200.000.
para: Medir el tamaño del negocio de un marketplace.
ver: Take rate, KPI

## Take rate
alias: comisión efectiva, tasa de comisión
nino: Es **qué parte de cada torta vendida en la feria se queda el dueño de la feria**.
que: Ingreso de la plataforma / GMV. Muestra cuánto captura el marketplace del valor que pasa por él (comisiones, tarifas de servicio, publicidad).
ejemplo: GMV US$1.000.000 e ingresos US$180.000 → take rate = 18 %.
para: Evaluar el modelo de negocio y comparar categorías, países o vendedores.
ver: GMV

## Siniestralidad
alias: loss ratio, índice de siniestralidad
nino: Una aseguradora es como un **fondo común**: todos ponen un poquito y, al que le pasa algo, le pagan. Siniestralidad es **cuánto del fondo se usó para pagar accidentes**.
que: En seguros: siniestros incurridos (pagados + reservas) / primas devengadas, en un período. Si supera cierto nivel (sumado a los gastos, el *combined ratio* > 100 %), la aseguradora pierde dinero con la suscripción.
ejemplo: Primas devengadas del año: US$10 M; siniestros incurridos: US$6,5 M → siniestralidad = 65 %.
para: Fijar precios, elegir qué riesgos asegurar y detectar segmentos que pierden dinero.
ver: Frecuencia y severidad, KPI

## Frecuencia y severidad
alias: frecuencia, severidad, costo medio
nino: **Frecuencia** es cuántas veces te caes de la bici en el año; **severidad** es cuánto te duele cada caída. Para saber cuántas curitas necesitas, multiplicas las dos.
que: Descomposición del costo de siniestros: **frecuencia** = cantidad de siniestros / expuestos (pólizas-año); **severidad** = monto total / cantidad de siniestros. Costo por expuesto (prima pura) = frecuencia × severidad.
ejemplo: 10.000 pólizas-año, 800 siniestros por US$2,4 M → frecuencia 8 %, severidad US$3.000, prima pura US$240.
para: Entender si sube el costo porque hay más accidentes o porque cada uno es más caro.
ver: Siniestralidad

## RevPAR / ADR
alias: revpar, adr, ocupación, tarifa diaria promedio
nino: En un hotel, **ADR** es cuánto pagó en promedio cada huésped por su cuarto por noche; **RevPAR** es cuánta plata dejó, en promedio, **cada cuarto del hotel**, esté ocupado o vacío.
que: Métricas hoteleras: **Ocupación** = noches vendidas / noches disponibles; **ADR** (*Average Daily Rate*) = ingreso de habitaciones / noches vendidas; **RevPAR** (*Revenue per Available Room*) = ingreso de habitaciones / noches disponibles = ocupación × ADR.
ejemplo: 100 habitaciones, 30 días = 3.000 noches disponibles; se vendieron 2.400 por US$192.000 → ocupación 80 %, ADR US$80, RevPAR US$64.
para: Evaluar la gestión de precios y ocupación en hotelería.
ver: KPI

## Embudo
alias: funnel, embudo de conversión, tasa de conversión
nino: Es como un **tobogán con varios pisos**: muchos niños suben al primer piso, menos llegan al segundo, y solo algunos llegan abajo. El embudo cuenta cuántos pasan cada piso.
que: Secuencia de pasos hacia un objetivo (visita → ver producto → carrito → pago → compra) y cuántos usuarios llegan a cada paso; la **conversión** entre pasos muestra dónde se pierde la gente. Se debe definir el orden obligatorio, la ventana de tiempo y si se cuentan usuarios o sesiones.
ejemplo: 10.000 visitas → 4.000 ven un producto (40 %) → 1.200 agregan al carrito (30 %) → 600 pagan (50 %) → conversión total 6 %.
para: Saber dónde mejorar el producto.
ver: Sesionización, A/B test

## Sesionización
alias: sesiones, sessionization
nino: Si miras todo lo que hizo un niño en el día, lo separas en **"ratos de juego"**: si se quedó quieto más de media hora, el próximo juego es un rato nuevo.
que: Agrupar los eventos de un usuario en **sesiones**: se ordenan por tiempo y se empieza una sesión nueva cuando pasan más de N minutos (normalmente 30) desde el evento anterior. En SQL se hace con `LAG` (marcar inicios) y una suma acumulada (numerar sesiones): es un caso de *gaps & islands*.
ejemplo:
```sql
WITH m AS (
  SELECT *, CASE WHEN ts - LAG(ts) OVER (PARTITION BY usuario_id ORDER BY ts)
                      <= INTERVAL 30 MINUTE THEN 0 ELSE 1 END AS nueva
  FROM eventos)
SELECT *, SUM(nueva) OVER (PARTITION BY usuario_id ORDER BY ts) AS sesion_n FROM m;
```
para: Calcular duración de visitas, páginas por sesión, embudos y comportamiento.
ver: LAG / LEAD, Gaps & islands, Ventana de tiempo, Embudo

## A/B test
alias: experimento, prueba a/b, test a/b
nino: Para saber qué galleta prefieren tus amigos, le das **la galleta A a la mitad y la galleta B a la otra mitad, al azar**, y cuentas a cuántos les gustó cada una.
que: Experimento controlado: se asigna **al azar** a los usuarios a una variante (control A o tratamiento B), se mide una métrica principal definida de antemano y se evalúa si la diferencia es **estadísticamente significativa** (y lo bastante grande para importar). Requiere tamaño de muestra suficiente y duración definida.
ejemplo: Botón de pago verde (A) vs. naranja (B): 25.000 usuarios en cada grupo; conversión 6,0 % vs. 6,6 %; el intervalo de confianza del aumento no incluye 0 → se elige B.
para: Decidir cambios con evidencia en lugar de intuición.
cuidado: Mirar los resultados todos los días y frenar cuando "da bien" (*peeking*) genera falsos positivos.
ver: Embudo, KPI

## Precisión y cobertura
alias: precision, recall, sensibilidad, falsos positivos
nino: Un perro busca pelotas en el parque. **Precisión**: de todo lo que trajo, ¿cuántas eran pelotas de verdad (y no piedras)? **Cobertura**: de todas las pelotas que había, ¿cuántas encontró?
que: Métricas de un clasificador o regla de detección (fraude, churn, alertas): **precisión** = verdaderos positivos / todo lo que marcó como positivo; **cobertura** (*recall*) = verdaderos positivos / todos los positivos reales. Subir una suele bajar la otra; se elige el umbral según el costo de cada error.
ejemplo: Una regla de fraude marca 200 transacciones; 150 eran fraude (precisión 75 %). Hubo 300 fraudes en total (cobertura 50 %).
para: Evaluar modelos y reglas según lo que cuesta equivocarse.
ver: KPI

## Promedio de promedios
alias: paradoja de simpson, promedio ponderado
nino: Si en un salón hay 2 niños con nota 10 y en otro hay 30 niños con nota 6, el promedio de la escuela **no es 8**: hay muchos más niños con 6. Promediar los promedios engaña.
que: Error común de agregar promedios ya calculados como si cada grupo pesara lo mismo. El promedio correcto se calcula desde los totales (suma / conteo), o ponderando por el tamaño de cada grupo. Relacionado: la **paradoja de Simpson**, cuando una tendencia en cada grupo se invierte al juntarlos.
ejemplo:
```sql
-- mal: AVG(ticket_promedio) de una tabla por ciudad
-- bien:
SELECT SUM(ventas) / SUM(pedidos) AS ticket_promedio_total FROM ventas_por_ciudad;
```
para: No publicar números incorrectos: por eso las medidas no aditivas se guardan como sus componentes (suma y conteo).
ver: Medidas aditivas, Agregación, ARPU
