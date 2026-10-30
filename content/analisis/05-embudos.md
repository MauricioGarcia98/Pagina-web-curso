---
titulo: Embudos de conversión - dónde se pierden los clientes
nivel: Avanzado
duracion: 50
resumen: Medir un proceso de varios pasos - el embudo vista, carrito y compra de la tienda online, con y sin orden entre los pasos, por dispositivo, el tiempo hasta convertir, y el embudo operativo de un pedido de delivery (aceptado, retirado, entregado).
objetivos: Calcular un embudo simple y uno ordenado en el tiempo | Comparar la conversión por segmento | Medir el tiempo entre pasos | Construir el embudo de un proceso operativo
autoevaluacion: ¿Sabes la diferencia entre un embudo con y sin orden? | ¿Sabes calcular la conversión de cada paso y la total? | ¿Sabes en qué paso se pierde más gente?
---

:::escenario
La tienda rediseñó la página de producto. El tablero dice que las compras subieron un 5 %, pero las visitas subieron un 12 %. ¿Mejoró o empeoró? El embudo separa el problema en pasos: cuántos ven, cuántos agregan al carrito y cuántos compran, y en cuál de esos pasos se perdió gente.
:::

## El embudo simple

Para cada paso, cuántos usuarios distintos lo hicieron al menos una vez:

```sql
SELECT COUNT(DISTINCT CASE WHEN tipo_evento = 'vista' THEN cliente_id END) AS vieron,
       COUNT(DISTINCT CASE WHEN tipo_evento = 'agregar_carrito' THEN cliente_id END) AS agregaron,
       COUNT(DISTINCT CASE WHEN tipo_evento = 'compra' THEN cliente_id END) AS compraron
FROM eventos_web
WHERE cliente_id IS NOT NULL;
```

- **Conversión de un paso** = usuarios del paso ÷ usuarios del paso anterior.
- **Conversión total** = usuarios del último paso ÷ usuarios del primero.

```recorrido
titulo: El embudo simple, paso a paso
estacion ev: Eventos | icono=reloj
estacion marcas: Marcas por cliente | icono=etiqueta
estacion pasos: Contar cada paso | icono=capas
estacion conv: Conversión | icono=engranaje
estacion cuidado: Lo que no dice | icono=alerta
paso ev: Los eventos de un cliente
Cada fila es algo que hizo un cliente en la web.
>>> tabla
cliente_id,fecha_hora,tipo_evento
3,2024-10-11 20:11:50,vista
3,2024-10-11 20:20:00,vista
3,2024-10-11 20:28:51,agregar_carrito
3,2024-10-11 20:38:36,vista
3,2024-10-27 17:12:02,vista
3,2024-10-27 17:21:24,agregar_carrito
3,2024-10-27 17:27:20,vista
3,2024-10-27 17:33:03,compra
paso marcas: Una fila por cliente con tres marcas
`MAX(tipo_evento = 'vista')` vale 1 si el cliente hizo **al menos una** vista. Lo mismo para carrito y compra.
>>> tabla
cliente_id,vio,agrego,compro
3,1,1,1
4,1,1,1
5,1,0,0
7,1,1,0
8,1,0,0
paso pasos: Sumar las marcas
Cuántos clientes llegaron a cada paso.
>>> tabla
vieron,agregaron,compraron
1165,924,578
paso conv: La conversión de cada paso
Cada paso dividido por el anterior, y el total de punta a punta.
>>> tabla
vista_a_carrito,carrito_a_compra,total
79.3,62.6,49.6
paso cuidado: Lo que este embudo no controla
El embudo simple no mira el **orden**: cuenta en "agregaron" a quien agregó algo al carrito **antes** de su primera vista registrada (por ejemplo, desde un enlace directo). Con los datos reales pasa con 61 de los 924 clientes que usaron el carrito. Por eso la sección siguiente arma el embudo ordenado.
>>> tabla
carrito_antes_de_la_vista,carrito_sin_ninguna_vista
57,4
```

## El embudo ordenado

El simple no exige orden: alguien que compró en enero y miró un producto en diciembre cuenta en ambos pasos. El embudo **ordenado** exige que cada paso ocurra **después** del anterior.

```sql
WITH primeros AS (
  SELECT cliente_id,
         MIN(CASE WHEN tipo_evento = 'vista' THEN fecha_hora END) AS t_vista,
         MIN(CASE WHEN tipo_evento = 'agregar_carrito' THEN fecha_hora END) AS t_carrito,
         MIN(CASE WHEN tipo_evento = 'compra' THEN fecha_hora END) AS t_compra
  FROM eventos_web
  WHERE cliente_id IS NOT NULL
  GROUP BY cliente_id
)
SELECT COUNT(t_vista) AS vieron,
       SUM(t_carrito > t_vista) AS carrito_despues_de_ver,
       SUM(t_compra > t_carrito AND t_carrito > t_vista) AS compra_despues_del_carrito
FROM primeros;
```

:::tip Una simplificación honesta
Este embudo ordenado usa el **primer** evento de cada tipo. Un análisis más fino lo haría por sesión o permitiría ventanas de tiempo (por ejemplo, comprar dentro de los 7 días). Lo importante es escribir la regla que usaste.
:::

## El embudo operativo

En un delivery, cada pedido pasa por etapas: creado → aceptado por el restaurante → retirado por el repartidor → entregado. Cada etapa es una columna de tiempo; si es nula, el pedido no llegó a esa etapa.

## Paso a paso: qué decide cada número del embudo

Un embudo parece una consulta simple, pero cada número depende de **cuatro decisiones** que hay que escribir antes de mirar el resultado. Si dos personas toman decisiones distintas, obtienen embudos distintos con los mismos datos, y las dos pueden tener razón.

| Decisión | Opciones | Qué cambia |
|---|---|---|
| **Unidad** | usuario, sesión, visita a un producto | "70 % agregó al carrito" puede significar 70 % de las personas o 70 % de las visitas |
| **Orden** | sin orden, ordenado | El ordenado siempre da igual o menos que el simple |
| **Ventana** | todo el año, 7 días, la misma sesión | Una ventana corta baja la conversión pero refleja mejor el efecto de la página |
| **Población** | todos, solo identificados, solo nuevos | Los anónimos (`cliente_id` nulo) no se pueden seguir entre pasos |

:::analogia La fila del cine
Piensa en la fila para entrar a una función: 100 personas miran la cartelera, 60 hacen la fila y 45 compran la entrada. Si cuentas "personas que alguna vez compraron una entrada este año", vas a sumar gente que compró para otra película. El embudo ordenado y con ventana es contar solo a los que miraron **esta** cartelera y compraron **esta** función.
:::

### 1. La unidad: usuarios distintos

`COUNT(DISTINCT CASE WHEN … THEN cliente_id END)` cuenta personas, no clics. Si un cliente vio 40 productos, cuenta una vez en "vieron". Es lo correcto para la pregunta "¿cuántas personas avanzan?". Si la pregunta fuera "¿qué página de producto convierte mejor?", la unidad sería la visita a cada producto y el embudo cambia de forma.

### 2. Por segmento: el mismo embudo, partido en grupos

El rediseño del escenario se probó primero en móvil. Para compararlo, se marca qué pasos hizo cada cliente **dentro de cada dispositivo** y después se suman:

```sql
WITH u AS (
  SELECT dispositivo, cliente_id,
         MAX(tipo_evento = 'vista') AS vio,
         MAX(tipo_evento = 'agregar_carrito') AS agrego,
         MAX(tipo_evento = 'compra') AS compro
  FROM eventos_web
  WHERE cliente_id IS NOT NULL
  GROUP BY dispositivo, cliente_id
)
SELECT dispositivo,
       SUM(vio) AS vieron,
       SUM(vio AND agrego) AS agregaron,
       SUM(vio AND agrego AND compro) AS compraron,
       ROUND(100.0 * SUM(vio AND agrego) / SUM(vio), 1) AS pct_vista_a_carrito,
       ROUND(100.0 * SUM(vio AND agrego AND compro) / SUM(vio AND agrego), 1) AS pct_carrito_a_compra
FROM u
GROUP BY dispositivo
ORDER BY dispositivo;
```

Línea por línea:

- `MAX(tipo_evento = 'vista')`: en SQLite una comparación vale 1 o 0; el `MAX` dice "hizo este paso al menos una vez". Es una **bandera por cliente**.
- `SUM(vio AND agrego)`: exige haber hecho los dos pasos. Así el embudo es **anidado**: nadie cuenta en "agregaron" sin haber visto. En el embudo simple de arriba eso no estaba garantizado.
- Las dos conversiones se calculan **sobre el paso anterior**, no sobre el total: así se ve en qué escalón se pierde la gente.

En estos datos, la tablet pierde más en el primer paso (55 % contra 67-73 %). Esa es la pista: el problema no está en el pago, está en la página de producto en pantallas medianas.

:::cuidado Un cliente, varios dispositivos
Un cliente que mira en el móvil y compra en la computadora aparece en dos grupos y no completa el embudo en ninguno. Si es común, segmenta por el **dispositivo del primer evento** del cliente en lugar de por el dispositivo de cada evento. Escribe cuál elegiste.
:::

### 3. El tiempo hasta convertir

Además de **cuántos** convierten, importa **cuánto tardan**. Se toma la primera vista y la primera compra de cada cliente y se agrupa la diferencia en tramos:

```sql
WITH p AS (
  SELECT cliente_id,
         MIN(CASE WHEN tipo_evento = 'vista' THEN fecha_hora END) AS t_vista,
         MIN(CASE WHEN tipo_evento = 'compra' THEN fecha_hora END) AS t_compra
  FROM eventos_web
  WHERE cliente_id IS NOT NULL
  GROUP BY cliente_id
)
SELECT CASE WHEN julianday(t_compra) - julianday(t_vista) < 1 THEN '1. el mismo día'
            WHEN julianday(t_compra) - julianday(t_vista) < 7 THEN '2. de 1 a 7 días'
            WHEN julianday(t_compra) - julianday(t_vista) < 30 THEN '3. de 7 a 30 días'
            ELSE '4. más de 30 días' END AS tramo,
       COUNT(*) AS clientes
FROM p
WHERE t_compra > t_vista
GROUP BY tramo
ORDER BY tramo;
```

- `julianday(b) - julianday(a)` da la diferencia en **días con decimales**; multiplicada por 24 son horas y por 1440, minutos.
- El prefijo "1.", "2." en el nombre del tramo es un truco para que `ORDER BY` los ordene bien sin otra columna.
- `WHERE t_compra > t_vista` deja afuera a los que nunca compraron (`t_compra` nulo) y a los que compraron antes de su primera vista registrada.

El resultado tiene dos montañas: muchos compran el mismo día y muchos tardan más de un mes. La segunda montaña casi siempre es un artefacto: la "primera vista" fue una visita de hace meses que no tiene nada que ver con la compra. Por eso se usan **ventanas**: "compró dentro de los 7 días de una vista". Con una ventana, el embudo mide lo que la página puede influir.

### 4. El embudo operativo, en detalle

Los procesos internos también son embudos, y son más fáciles: cada etapa es una columna de tiempo de la misma fila.

```sql
SELECT COUNT(*) AS creados,
       COUNT(aceptado) AS aceptados,
       COUNT(retirado) AS retirados,
       COUNT(entregado) AS entregados,
       ROUND(100.0 * COUNT(entregado) / COUNT(*), 1) AS pct_entregados,
       ROUND(AVG((julianday(aceptado) - julianday(creado)) * 1440), 1) AS min_hasta_aceptar,
       ROUND(AVG((julianday(entregado) - julianday(retirado)) * 1440), 1) AS min_de_viaje
FROM delivery_pedidos;
```

- `COUNT(columna)` cuenta solo los no nulos: es exactamente "cuántos llegaron a esta etapa".
- Los tiempos entre etapas dicen **dónde** se espera: si `min_hasta_aceptar` sube, el problema está en el restaurante; si sube `min_de_viaje`, en el reparto.
- Los que se cayeron tienen un `estado` que explica por qué (`cancelado_cliente`, `sin_repartidor`…): agrupar las caídas por estado es el paso siguiente.

## Cómo se lee un embudo sin engañarse

1. **Mira cada escalón, no solo el total.** Una conversión total igual puede esconder un paso que mejoró y otro que empeoró.
2. **Compara contra el período anterior con la misma definición.** Si cambiaste la regla (ventana, población), recalcula también el período anterior.
3. **Ojo con el volumen.** En el escenario, las visitas subieron 12 % y las compras 5 %: la conversión total **bajó**. Pero si las visitas nuevas vinieron de una campaña con público menos interesado, la página puede estar igual de bien. Segmenta por canal de llegada antes de culpar al rediseño.
4. **Un paso con 100 % es sospechoso.** Suele ser un evento que se dispara solo (por ejemplo, "vista" registrado en cada carga de página del carrito).

:::errores
- **Contar eventos en lugar de usuarios**: un cliente que recarga la página 20 veces infla el primer paso y baja la conversión de forma artificial.
- **Embudo no anidado**: contar en "compraron" a gente que no pasó por "agregaron" da conversiones de más del 100 % en algún segmento.
- **Ignorar a los anónimos sin decirlo**: si el 40 % del tráfico no está identificado, el embudo describe solo al 60 % restante.
- **Comparar embudos con ventanas distintas**: "7 días" contra "todo el mes" no es una mejora, es otra métrica.
:::

:::trabajo
- Los equipos de producto revisan el embudo cada semana; el analista mantiene **una sola definición** escrita (unidad, orden, ventana, población) y la usa en todos los tableros.
- En las herramientas de producto (Amplitude, Mixpanel, GA4) el embudo ya viene armado, pero cuando los números no coinciden con el warehouse, alguien tiene que reconstruirlo en SQL y explicar la diferencia. Ese alguien suele ser un data engineer o un analista senior.
- Para que el embudo sea confiable, el **plan de eventos** (qué se registra, con qué nombre y cuándo) importa tanto como la consulta.
:::

:::entrevista "Las compras subieron 5 % y las visitas 12 %. ¿El rediseño funcionó?"
Primero, la conversión total bajó (de compras/visitas), así que no se puede decir que funcionó solo con esos dos números. Luego separaría el embudo en pasos para ver en qué escalón cambió, compararía por segmento (dispositivo, canal de llegada, clientes nuevos o recurrentes) para descartar que el tráfico nuevo sea de menor calidad, y fijaría una ventana de conversión. Si se puede, lo ideal es una prueba A/B, porque compara a la vez y con la misma población.
:::

| Concepto | En una línea |
|---|---|
| Embudo simple | Usuarios distintos por paso, sin exigir orden |
| Embudo anidado | Cada paso exige haber hecho los anteriores |
| Embudo ordenado | Cada paso ocurre después del anterior en el tiempo |
| Ventana | Plazo máximo entre pasos para que cuente |
| Embudo operativo | Etapas de un proceso: `COUNT(columna_de_tiempo)` por etapa |

## Ejercicios

:::ejercicio sql dificultad=Básico
Embudo simple de todos los eventos con cliente identificado: `vieron`, `agregaron` y `compraron` (clientes distintos).
```sql solucion
SELECT COUNT(DISTINCT CASE WHEN tipo_evento = 'vista' THEN cliente_id END) AS vieron,
       COUNT(DISTINCT CASE WHEN tipo_evento = 'agregar_carrito' THEN cliente_id END) AS agregaron,
       COUNT(DISTINCT CASE WHEN tipo_evento = 'compra' THEN cliente_id END) AS compraron
FROM eventos_web WHERE cliente_id IS NOT NULL;
```
:::

:::ejercicio sql dificultad=Intermedio
Con el embudo simple, calcula la conversión de cada paso y la total en porcentaje con 1 decimal: `vista_a_carrito`, `carrito_a_compra`, `total`.
```pista
Calcula los tres conteos en una CTE y divide afuera con `100.0 *`.
```
```sql solucion
WITH f AS (
  SELECT COUNT(DISTINCT CASE WHEN tipo_evento = 'vista' THEN cliente_id END) AS v,
         COUNT(DISTINCT CASE WHEN tipo_evento = 'agregar_carrito' THEN cliente_id END) AS c,
         COUNT(DISTINCT CASE WHEN tipo_evento = 'compra' THEN cliente_id END) AS k
  FROM eventos_web WHERE cliente_id IS NOT NULL
)
SELECT ROUND(100.0 * c / v, 1) AS vista_a_carrito, ROUND(100.0 * k / c, 1) AS carrito_a_compra, ROUND(100.0 * k / v, 1) AS total FROM f;
```
:::

:::ejercicio sql ordenado dificultad=Intermedio
Embudo simple **por dispositivo** (el del evento): `dispositivo`, `vieron`, `compraron` y `conversion` (compraron ÷ vieron, %, 1 decimal). Ordena por conversión de mayor a menor.
```sql solucion
SELECT dispositivo,
       COUNT(DISTINCT CASE WHEN tipo_evento = 'vista' THEN cliente_id END) AS vieron,
       COUNT(DISTINCT CASE WHEN tipo_evento = 'compra' THEN cliente_id END) AS compraron,
       ROUND(100.0 * COUNT(DISTINCT CASE WHEN tipo_evento = 'compra' THEN cliente_id END) / COUNT(DISTINCT CASE WHEN tipo_evento = 'vista' THEN cliente_id END), 1) AS conversion
FROM eventos_web
WHERE cliente_id IS NOT NULL
GROUP BY dispositivo
ORDER BY conversion DESC;
```
:::

:::ejercicio sql ordenado dificultad=Intermedio
Cantidad de eventos por tipo y el porcentaje que hacen los **visitantes anónimos** (sin `cliente_id`) en cada tipo (1 decimal). Columnas: `tipo_evento`, `eventos`, `pct_anonimos`. Ordena por `eventos` de mayor a menor.
```sql solucion
SELECT tipo_evento, COUNT(*) AS eventos, ROUND(100.0 * SUM(CASE WHEN cliente_id IS NULL THEN 1 ELSE 0 END) / COUNT(*), 1) AS pct_anonimos
FROM eventos_web
GROUP BY tipo_evento
ORDER BY eventos DESC;
```
:::

:::ejercicio sql dificultad=Avanzado
Embudo **ordenado** con el primer evento de cada tipo por cliente: `vieron` (tienen vista), `carrito_despues` (su primer carrito es posterior a su primera vista) y `compra_despues` (además, su primera compra es posterior a su primer carrito).
```pista
Una CTE con `MIN(CASE WHEN tipo_evento = '…' THEN fecha_hora END)` por cliente.
```
```pista
Las comparaciones con NULL dan NULL, y `SUM` las ignora: no hace falta filtrar a mano.
```
```sql solucion
WITH t AS (
  SELECT cliente_id,
         MIN(CASE WHEN tipo_evento = 'vista' THEN fecha_hora END) AS v,
         MIN(CASE WHEN tipo_evento = 'agregar_carrito' THEN fecha_hora END) AS c,
         MIN(CASE WHEN tipo_evento = 'compra' THEN fecha_hora END) AS k
  FROM eventos_web WHERE cliente_id IS NOT NULL GROUP BY cliente_id
)
SELECT COUNT(v) AS vieron, SUM(c > v) AS carrito_despues, SUM(k > c AND c > v) AS compra_despues FROM t;
```
:::

:::ejercicio sql dificultad=Avanzado
¿Cuánto tarda un cliente en comprar después de su primera vista? Para los clientes cuya primera compra es posterior a su primera vista, calcula cuántos son y el **promedio** de horas entre una y otra (1 decimal). Columnas: `clientes`, `horas_promedio`.
```pista
`(julianday(k) - julianday(v)) * 24` da horas.
```
```sql solucion
WITH t AS (
  SELECT cliente_id,
         MIN(CASE WHEN tipo_evento = 'vista' THEN fecha_hora END) AS v,
         MIN(CASE WHEN tipo_evento = 'compra' THEN fecha_hora END) AS k
  FROM eventos_web WHERE cliente_id IS NOT NULL GROUP BY cliente_id
)
SELECT COUNT(*) AS clientes, ROUND(AVG((julianday(k) - julianday(v)) * 24), 1) AS horas_promedio FROM t WHERE k > v;
```
:::

:::ejercicio sql ordenado dificultad=Avanzado
Embudo **mensual** de 2024: por mes del evento, clientes distintos que vieron y que compraron en ese mismo mes, y la conversión (%, 1 decimal). Columnas: `mes`, `vieron`, `compraron`, `conversion`. Ordena por mes.
```sql solucion
SELECT strftime('%Y-%m', fecha_hora) AS mes,
       COUNT(DISTINCT CASE WHEN tipo_evento = 'vista' THEN cliente_id END) AS vieron,
       COUNT(DISTINCT CASE WHEN tipo_evento = 'compra' THEN cliente_id END) AS compraron,
       ROUND(100.0 * COUNT(DISTINCT CASE WHEN tipo_evento = 'compra' THEN cliente_id END) / COUNT(DISTINCT CASE WHEN tipo_evento = 'vista' THEN cliente_id END), 1) AS conversion
FROM eventos_web
WHERE cliente_id IS NOT NULL
GROUP BY mes
ORDER BY mes;
```
:::

:::ejercicio sql dificultad=Intermedio
Delivery (Rápido). Embudo operativo de todos los pedidos: `creados` (todos), `aceptados` (con `aceptado` no nulo), `retirados` y `entregados` (con `entregado` no nulo).
```pista
`COUNT(columna)` cuenta los no nulos.
```
```sql solucion
SELECT COUNT(*) AS creados, COUNT(aceptado) AS aceptados, COUNT(retirado) AS retirados, COUNT(entregado) AS entregados FROM delivery_pedidos;
```
:::

:::ejercicio sql ordenado dificultad=Avanzado
Rápido: pedidos perdidos **por etapa** y estado final. Para cada `estado`, cuántos pedidos no llegaron a ser aceptados (`sin_aceptar`), cuántos fueron aceptados pero no retirados (`sin_retirar`) y cuántos fueron retirados pero no entregados (`sin_entregar`). Incluye solo estados distintos de `entregado`. Ordena por `estado`.
```sql solucion
SELECT estado,
       SUM(CASE WHEN aceptado IS NULL THEN 1 ELSE 0 END) AS sin_aceptar,
       SUM(CASE WHEN aceptado IS NOT NULL AND retirado IS NULL THEN 1 ELSE 0 END) AS sin_retirar,
       SUM(CASE WHEN retirado IS NOT NULL AND entregado IS NULL THEN 1 ELSE 0 END) AS sin_entregar
FROM delivery_pedidos
WHERE estado <> 'entregado'
GROUP BY estado
ORDER BY estado;
```
:::

:::ejercicio sql ordenado dificultad=Avanzado
Rápido: conversión de punta a punta (entregados ÷ creados, %, 1 decimal) **por franja horaria** de creación: `almuerzo` (11 a 15 h), `tarde` (15 a 19 h), `cena` (19 a 24 h) y `otra`. Columnas: `franja`, `pedidos`, `conversion`. Ordena por `franja`.
```pista
`CAST(strftime('%H', creado) AS INTEGER)` da la hora como número.
```
```sql solucion
SELECT CASE WHEN CAST(strftime('%H', creado) AS INTEGER) BETWEEN 11 AND 14 THEN 'almuerzo'
            WHEN CAST(strftime('%H', creado) AS INTEGER) BETWEEN 15 AND 18 THEN 'tarde'
            WHEN CAST(strftime('%H', creado) AS INTEGER) BETWEEN 19 AND 23 THEN 'cena'
            ELSE 'otra' END AS franja,
       COUNT(*) AS pedidos,
       ROUND(100.0 * COUNT(entregado) / COUNT(*), 1) AS conversion
FROM delivery_pedidos
GROUP BY franja
ORDER BY franja;
```
:::

:::ejercicio quiz dificultad=Intermedio
En el embudo simple, 1.000 clientes vieron productos y 1.050 compraron. ¿Qué pasa?

- [ ] Un error en los datos: siempre hay menos compras que vistas
- [x] El embudo no exige orden ni que cada paso esté registrado: hay clientes que compraron sin un evento de vista registrado (por ejemplo, desde un enlace directo o la app)
- [ ] La conversión es 105 % y es una gran noticia
- [ ] Hay que usar `COUNT(*)` en lugar de `COUNT(DISTINCT)`
:::
