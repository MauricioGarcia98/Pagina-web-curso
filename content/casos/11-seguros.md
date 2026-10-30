---
titulo: "Caso 🛡️ Escudo Seguros: siniestralidad, frecuencia, severidad y fraude"
nivel: Experto
duracion: 55
resumen: Una aseguradora descubre que el ramo hogar casi no deja ganancia. Calcula primas, siniestralidad, frecuencia y severidad por ramo y por edad, y arma reglas para detectar siniestros sospechosos de fraude.
objetivos: Calcular la siniestralidad (loss ratio) por ramo sin multiplicar filas en el JOIN | Separar frecuencia y severidad para explicar por qué un ramo pierde dinero | Comparar el riesgo por tramo de edad en el seguro de autos | Construir y evaluar una regla de detección de fraude con precisión y cobertura | Medir el embudo de siniestros: pagados, rechazados y en revisión
prerrequisitos: casos-metodo | sql-cte | sql-case
autoevaluacion: ¿Sabes calcular la siniestralidad sin sumar las primas varias veces? | ¿Puedes explicar la diferencia entre frecuencia y severidad? | ¿Sabes por qué los conductores jóvenes pagan más? | ¿Puedes medir la precisión de una regla de fraude? | ¿Sabes qué significa una siniestralidad de 95 %?
---

<!-- estandar:escenario -->
:::escenario Hogar no cierra
El director técnico de **Escudo Seguros** trae el cierre del año:

> "Autos y salud están en línea con el mercado. Pero **hogar** está pagando casi todo lo que cobra. ¿Subieron los robos? ¿Hay fraude? Antes de subir la prima a todos los clientes, quiero entender qué pasa."

Subir el precio a todos castiga a los buenos clientes, que se van a la competencia, y deja a los malos: es la espiral de la **selección adversa**. Primero, entender.
:::

## Cómo funciona una aseguradora

Una aseguradora cobra **primas** (el precio mensual del seguro) a muchos clientes y paga **siniestros** (los daños cubiertos) a unos pocos. El negocio funciona si lo que paga en siniestros, más los gastos, es menor que lo que cobra.

- **Póliza**: el contrato. Tiene un **ramo** (auto, hogar, vida, salud), una vigencia (normalmente un año), una **suma asegurada** (lo máximo que se paga) y una **prima**.
- **Siniestro**: el evento cubierto (un choque, un robo). Se **denuncia**, se revisa y se **paga** o se **rechaza**.
- **Canal**: quién vendió la póliza: un **broker** (cobra comisión), la **web** o un **banco**.

| KPI | Fórmula | Lectura |
|---|---|---|
| **Siniestralidad** (*loss ratio*) | siniestros pagados / primas | 65 % es sano; cerca de 100 %, se pierde dinero (falta sumar los gastos) |
| **Frecuencia** | siniestros / pólizas | Qué tan seguido pasa algo |
| **Severidad** | monto pagado / siniestros pagados | Cuánto cuesta cada vez que pasa |
| **Tasa de rechazo** | rechazados / denunciados | Control de fraude y de coberturas |

**Siniestralidad = frecuencia × severidad / prima promedio.** Si un ramo pierde, la pregunta es: ¿pasa más seguido (frecuencia) o cuesta más cada vez (severidad)?

## El modelo de datos

```text
seguros_clientes   (cliente_id, edad, ciudad, fecha_alta)
seguros_polizas    (poliza_id, cliente_id, ramo, fecha_inicio, fecha_fin, prima_mensual, suma_asegurada, canal, estado)
seguros_siniestros (siniestro_id, poliza_id, fecha_ocurrencia, fecha_denuncia, tipo, monto_reclamado, monto_pagado, estado, fraude_confirmado)
```

```diagrama
titulo: Modelo de Escudo Seguros: los siniestros cuelgan de la póliza, no del cliente
nodo cli: seguros_clientes | icono=usuario | col=0 | fila=0 | color=azul | sub=edad, ciudad
nodo pol: seguros_polizas | icono=escudo | col=1 | fila=0 | color=verde | sub=ramo, prima, suma,\ncanal, vigencia 1 año
nodo sin: seguros_siniestros | icono=alerta | col=2 | fila=0 | color=rojo | sub=ocurrencia, denuncia,\nreclamado, pagado
nodo fr: fraude_confirmado | icono=lupa | col=2 | fila=1 | color=amarillo | sub=1 = la investigación\nconfirmó fraude
flecha cli -> pol: 1 a N
flecha pol -> sin: 1 a N
flecha sin -> fr | estilo=punteada
```

- Todas las pólizas duran un año: la prima del período es `prima_mensual * 12`.
- `monto_pagado` es 0 si el siniestro fue rechazado o sigue en revisión.
- `fraude_confirmado` = 1 solo cuando la investigación terminó y confirmó el fraude (aunque el siniestro se haya pagado antes).

## Un ejemplo resuelto: la siniestralidad por ramo

**La trampa:** si unes pólizas con siniestros y sumas `prima_mensual`, cada póliza con 3 siniestros suma su prima **3 veces**. Hay que agregar cada tabla **por separado** y unir los resultados.

```sql
WITH primas AS (
  SELECT ramo, COUNT(*) AS polizas, SUM(prima_mensual * 12) AS primas
  FROM seguros_polizas
  GROUP BY ramo
),
pagos AS (
  SELECT p.ramo, COUNT(*) AS siniestros, SUM(s.monto_pagado) AS pagado
  FROM seguros_siniestros s
  JOIN seguros_polizas p ON p.poliza_id = s.poliza_id
  GROUP BY p.ramo
)
SELECT pr.ramo, pr.polizas, ROUND(pr.primas, 0) AS primas,
       pa.siniestros, ROUND(pa.pagado, 0) AS pagado,
       ROUND(100.0 * pa.pagado / pr.primas, 1) AS siniestralidad_pct
FROM primas pr
LEFT JOIN pagos pa ON pa.ramo = pr.ramo
ORDER BY siniestralidad_pct DESC;
```

| ramo | polizas | primas | siniestros | pagado | siniestralidad_pct |
|---|---|---|---|---|---|
| hogar | 580 | 744489 | 110 | 710224 | 95.4 |
| auto | 860 | 1311656 | 412 | 980915 | 74.8 |
| salud | 190 | 245042 | 278 | 176608 | 72.1 |
| vida | 299 | 276073 | 3 | 52659 | 19.1 |

**Lectura:** hogar paga 95 centavos de cada peso que cobra: con los gastos, pierde. Salud tiene muchísimos siniestros (278 en 190 pólizas: más de uno por póliza) pero baratos; vida casi nunca paga, pero cuando paga, es mucho. En los ejercicios vas a separar frecuencia y severidad y encontrar qué hay detrás de hogar.

:::cuidado Las trampas de este caso
- **El fan-out del JOIN**: sumar primas después de unir con siniestros multiplica las primas. Agrega por separado (dos CTE) y une al final.
- **Rechazados y en revisión**: tienen `monto_pagado = 0`. Para la severidad, divide por los siniestros **pagados**, no por todos.
- **Fraude confirmado ≠ fraude**: solo se marcan los investigados. Una regla que "falla" en un siniestro no marcado puede haber encontrado un fraude que nadie investigó.
- **Primas emitidas vs. devengadas**: aquí todas las pólizas cubren un año completo; en la vida real se usa la prima **devengada** (la parte del período que ya transcurrió).
:::

<!-- estandar:trabajo -->
:::trabajo
- Los **actuarios** usan exactamente frecuencia y severidad para fijar precios: un modelo para cada una (por edad, zona, vehículo), y la prima sale de multiplicarlas. El equipo de datos les entrega las tablas limpias por póliza-año.
- La detección de fraude empieza con **reglas** como las de este caso (siniestro muy cerca del inicio, denuncia tardía, monto cerca de la suma asegurada) y luego pasa a modelos. Las alertas van a un equipo de investigación con capacidad limitada: por eso importa la **precisión**.
- Los datos de seguros incluyen datos de salud y personales: acceso restringido, enmascaramiento y auditoría, como en la clínica.
:::

<!-- estandar:entrevista -->
:::entrevista "Tienes que sumar un importe de la tabla padre y contar filas de la hija. ¿Cómo evitas duplicar?"
Agrego cada tabla a su propio grano antes de unir: un CTE que suma las primas por ramo desde pólizas, otro que cuenta y suma los siniestros por ramo, y recién después uno los dos resultados por ramo. Si uniera primero, cada póliza aparecería una vez por siniestro y su prima se sumaría varias veces. Para comprobarlo, comparo el total de primas de mi consulta con un SUM directo sobre la tabla de pólizas.
:::

## Ejercicios

:::ejercicio sql ordenado titulo="Frecuencia y severidad por ramo"
Por `ramo`: `polizas`, `siniestros` (todos los denunciados), `frecuencia` (siniestros / pólizas, redondeado a 3) y `severidad` (promedio de `monto_pagado` de los siniestros **pagados**, redondeado a 0). Ordena por `ramo`.
```sql solucion
WITH p AS (
  SELECT ramo, COUNT(*) AS polizas FROM seguros_polizas GROUP BY ramo
),
s AS (
  SELECT po.ramo,
         COUNT(*) AS siniestros,
         AVG(CASE WHEN si.estado = 'pagado' THEN si.monto_pagado END) AS severidad
  FROM seguros_siniestros si
  JOIN seguros_polizas po ON po.poliza_id = si.poliza_id
  GROUP BY po.ramo
)
SELECT p.ramo, p.polizas, s.siniestros,
       ROUND(1.0 * s.siniestros / p.polizas, 3) AS frecuencia,
       ROUND(s.severidad, 0) AS severidad
FROM p JOIN s ON s.ramo = p.ramo
ORDER BY p.ramo;
```
```pista
`AVG(CASE WHEN estado = 'pagado' THEN monto_pagado END)` promedia solo los pagados: el `CASE` sin `ELSE` devuelve `NULL` para los demás y `AVG` los ignora.
```
:::

:::ejercicio sql ordenado titulo="Autos: el riesgo por edad"
Solo pólizas de `auto`. Por tramo de edad del cliente (`tramo`: `'18-24'`, `'25-39'`, `'40-59'`, `'60+'`): `polizas`, `siniestros` y `frecuencia` (redondeado a 3). Ordena por `tramo`.
```sql solucion
SELECT CASE WHEN c.edad < 25 THEN '18-24' WHEN c.edad < 40 THEN '25-39'
            WHEN c.edad < 60 THEN '40-59' ELSE '60+' END AS tramo,
       COUNT(DISTINCT p.poliza_id) AS polizas,
       COUNT(s.siniestro_id) AS siniestros,
       ROUND(1.0 * COUNT(s.siniestro_id) / COUNT(DISTINCT p.poliza_id), 3) AS frecuencia
FROM seguros_polizas p
JOIN seguros_clientes c ON c.cliente_id = p.cliente_id
LEFT JOIN seguros_siniestros s ON s.poliza_id = p.poliza_id
WHERE p.ramo = 'auto'
GROUP BY 1
ORDER BY 1;
```
```pista
Con `LEFT JOIN` las pólizas sin siniestros siguen contando. `COUNT(DISTINCT p.poliza_id)` cuenta pólizas aunque se repitan por tener varios siniestros, y `COUNT(s.siniestro_id)` no cuenta los `NULL`.
```
```explicacion
Los conductores de 18 a 24 años tienen más de un siniestro por póliza al año, casi el triple que los demás tramos. Por eso las tarifas de auto dependen tanto de la edad.
```
:::

:::ejercicio sql ordenado titulo="Hogar: ¿qué tipo de siniestro pesa más?"
Siniestros **pagados** del ramo `hogar`, por `tipo`: `pagados`, `total_pagado` (redondeado a 0), `severidad` (promedio, redondeado a 0) y `pct_del_total` (porcentaje del total pagado en hogar, redondeado a 1). Ordena por `total_pagado` descendente.
```sql solucion
SELECT s.tipo,
       COUNT(*) AS pagados,
       ROUND(SUM(s.monto_pagado), 0) AS total_pagado,
       ROUND(AVG(s.monto_pagado), 0) AS severidad,
       ROUND(100.0 * SUM(s.monto_pagado) / SUM(SUM(s.monto_pagado)) OVER (), 1) AS pct_del_total
FROM seguros_siniestros s
JOIN seguros_polizas p ON p.poliza_id = s.poliza_id
WHERE p.ramo = 'hogar' AND s.estado = 'pagado'
GROUP BY s.tipo
ORDER BY total_pagado DESC;
```
:::

:::ejercicio sql ordenado titulo="El peso del fraude en cada ramo"
Por `ramo`: `pagado_total`, `pagado_fraude` (pagos de siniestros con `fraude_confirmado = 1`) y `pct_fraude` (redondeado a 1). Solo ramos con algún pago. Montos redondeados a 0. Ordena por `pct_fraude` descendente.
```sql solucion
SELECT p.ramo,
       ROUND(SUM(s.monto_pagado), 0) AS pagado_total,
       ROUND(SUM(CASE WHEN s.fraude_confirmado = 1 THEN s.monto_pagado ELSE 0 END), 0) AS pagado_fraude,
       ROUND(100.0 * SUM(CASE WHEN s.fraude_confirmado = 1 THEN s.monto_pagado ELSE 0 END) / SUM(s.monto_pagado), 1) AS pct_fraude
FROM seguros_siniestros s
JOIN seguros_polizas p ON p.poliza_id = s.poliza_id
GROUP BY p.ramo
HAVING SUM(s.monto_pagado) > 0
ORDER BY pct_fraude DESC;
```
```explicacion
En hogar, casi la mitad de lo pagado fue fraude confirmado: robos denunciados pocos días después de contratar. Ahí está la respuesta al director: el problema no es la tarifa de todos los clientes, es un control de fraude débil en un tipo de siniestro.
```
:::

:::ejercicio sql titulo="Una regla de fraude y su precisión"
Prueba esta regla: un siniestro es **sospechoso** si ocurrió dentro de los **30 días** desde el inicio de la póliza **y** se denunció **más de 7 días** después de ocurrir. Calcula: `sospechosos` (cuántos marca la regla), `fraudes_marcados` (de esos, cuántos tienen fraude confirmado), `precision_pct` (fraudes_marcados / sospechosos) y `cobertura_pct` (fraudes_marcados / total de fraudes confirmados). Porcentajes redondeados a 1.
```sql solucion
WITH s AS (
  SELECT si.fraude_confirmado,
         CASE WHEN julianday(si.fecha_ocurrencia) - julianday(p.fecha_inicio) <= 30
               AND julianday(si.fecha_denuncia) - julianday(si.fecha_ocurrencia) > 7
              THEN 1 ELSE 0 END AS sospechoso
  FROM seguros_siniestros si
  JOIN seguros_polizas p ON p.poliza_id = si.poliza_id
)
SELECT SUM(sospechoso) AS sospechosos,
       SUM(sospechoso * fraude_confirmado) AS fraudes_marcados,
       ROUND(100.0 * SUM(sospechoso * fraude_confirmado) / SUM(sospechoso), 1) AS precision_pct,
       ROUND(100.0 * SUM(sospechoso * fraude_confirmado) / SUM(fraude_confirmado), 1) AS cobertura_pct
FROM s;
```
```pista
Marca cada siniestro con 1/0 en un CTE. `sospechoso * fraude_confirmado` vale 1 solo cuando las dos cosas son ciertas.
```
```explicacion
**Precisión**: de lo que la regla marca, cuánto es fraude de verdad (importa porque cada alerta le cuesta horas a un investigador). **Cobertura** (*recall*): de todos los fraudes, cuántos encuentra la regla. Esta regla marca 43 siniestros y 35 son fraude (81 % de precisión) y encuentra todos los fraudes confirmados. Ojo: los 8 "falsos positivos" pueden ser fraudes que nadie investigó.
```
:::

:::ejercicio sql ordenado titulo="El embudo de siniestros"
Por `estado` del siniestro: `siniestros`, `reclamado` (suma de `monto_reclamado`, redondeado a 0) y `pct` (porcentaje de los siniestros, redondeado a 1). Ordena por `siniestros` descendente.
```sql solucion
SELECT estado,
       COUNT(*) AS siniestros,
       ROUND(SUM(monto_reclamado), 0) AS reclamado,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM seguros_siniestros
GROUP BY estado
ORDER BY siniestros DESC;
```
:::

:::ejercicio sql ordenado titulo="Canales: prima y siniestralidad"
Por `canal` de venta: `polizas`, `prima_promedio` (prima mensual, redondeado a 2) y `siniestralidad_pct` (pagado / primas anuales, redondeado a 1). Sin duplicar primas. Ordena por `siniestralidad_pct` descendente.
```sql solucion
WITH pr AS (
  SELECT canal, COUNT(*) AS polizas, AVG(prima_mensual) AS prima_promedio, SUM(prima_mensual * 12) AS primas
  FROM seguros_polizas GROUP BY canal
),
pa AS (
  SELECT p.canal, SUM(s.monto_pagado) AS pagado
  FROM seguros_siniestros s JOIN seguros_polizas p ON p.poliza_id = s.poliza_id
  GROUP BY p.canal
)
SELECT pr.canal, pr.polizas,
       ROUND(pr.prima_promedio, 2) AS prima_promedio,
       ROUND(100.0 * COALESCE(pa.pagado, 0) / pr.primas, 1) AS siniestralidad_pct
FROM pr LEFT JOIN pa ON pa.canal = pr.canal
ORDER BY siniestralidad_pct DESC;
```
:::

:::ejercicio abierto titulo="La respuesta al director técnico"
Escribe la respuesta en cinco puntos: qué pasa en hogar (con números), por qué no conviene subir la prima a todos, qué control de fraude propones (la regla, cuántas alertas por mes generaría y qué precisión tiene), cómo medirías el impacto, y qué datos faltan para mejorar la regla.
```solucion
1. Hogar tiene 95 % de siniestralidad contra ~75 % de autos y salud. Casi la mitad de lo pagado en hogar fue fraude confirmado, concentrado en robos de alto monto ocurridos pocos días después de contratar.
2. Subir la prima a todos castiga a la gran mayoría honesta, que se iría a la competencia, y dejaría una cartera con más proporción de fraude (selección adversa). El problema es puntual.
3. Regla: siniestro dentro de los 30 días del inicio de la póliza y denunciado más de 7 días después de ocurrir → revisión antes de pagar. En el año marcó 43 siniestros (unos 4 por mes) con 81 % de precisión y encontró todos los fraudes confirmados: carga baja y muy efectiva para el equipo de investigación.
4. Impacto: comparar lo pagado en siniestros marcados antes y después, y la siniestralidad de hogar trimestre a trimestre. Seguir la cantidad de alertas y la precisión cada mes (los defraudadores aprenden).
5. Faltan datos: inspección previa del inmueble, historial del cliente en otras aseguradoras, quién vendió la póliza (algunos fraudes se repiten por intermediario), fotos y documentación del siniestro. Con eso, pasar de una regla a un modelo.
```
:::

:::errores
- **Siniestralidad con primas emitidas** cuando la pregunta es por primas devengadas (la parte del año ya transcurrida).
- **Severidad promedio con siniestros en curso** sin monto final.
- **Reglas de fraude sin medir cuántos casos marcan**: una regla que marca la mitad no es útil.
:::
