---
titulo: Mantener sin apagar incendios - checks, alertas y runbooks
nivel: Intermedio
duracion: 55
resumen: La parte preventiva de la guardia - los seis checks que detectan casi todos los fallos silenciosos (frescura, volumen, nulos, unicidad, integridad referencial y dominio), cómo escribirlos en SQL, cómo detectar anomalías de volumen sin falsos positivos, el patrón write-audit-publish y cómo limpiar alertas ruidosas para que la guardia confíe en ellas.
objetivos: Escribir en SQL los seis checks básicos de calidad de datos | Detectar una anomalía de volumen comparando contra la historia | Medir el ruido de las alertas y decidir cuáles apagar o mejorar | Explicar el patrón write-audit-publish | Diseñar una alerta accionable con dueño y runbook
prerrequisitos: incidentes-primera-guardia
autoevaluacion: ¿Sabes qué seis checks pondrías en una tabla de hechos nueva? | ¿Sabes escribir un check de unicidad y uno de integridad referencial? | ¿Sabes detectar un volumen anómalo sin disparar alertas todos los domingos? | ¿Sabes qué es write-audit-publish? | ¿Sabes qué hace que una alerta sea accionable?
---

:::escenario
Después del incidente de ayer, tu líder te pide revisar el monitoreo del equipo. Descubres tres cosas: el check de volumen de `fct_envios` está **apagado** "porque daba falsos positivos los domingos", nadie mira los nulos de `dim_clientes` y en octubre hubo 220 alertas, de las que casi ninguna terminó en una acción. La guardia ya no confía en las alertas, y por eso no vio las que importaban.
:::

## La idea en una frase

Un pipeline sano no es el que nunca falla: es el que **falla rápido, ruidosamente y con un mensaje que dice qué hacer**. Los checks de datos convierten fallos silenciosos (la tarea en verde con datos malos) en fallos visibles.

## Los seis checks que detectan casi todo

| Check | Pregunta | Ejemplo de fallo que detecta |
|---|---|---|
| **Frescura** | ¿Llegaron datos nuevos a tiempo? | El archivo del ERP no llegó |
| **Volumen** | ¿La cantidad de filas tiene sentido? | Carga parcial, filtro mal puesto, duplicación |
| **Nulos** | ¿Las columnas obligatorias tienen valor? | Una columna renombrada en el origen llega vacía |
| **Unicidad** | ¿La clave primaria es única? | Un reintento insertó dos veces |
| **Integridad referencial** | ¿Cada clave foránea existe en su tabla padre? | Pedidos de clientes que no existen (huérfanos) |
| **Dominio y rango** | ¿Los valores son posibles? | Un estado nuevo, un costo negativo, una fecha del año 2099 |

Además existe la **reconciliación**: comparar un total del origen (filas exportadas, monto facturado) con el destino. Es el check más fuerte y el que se usa para finanzas.

```diagrama
titulo: Write-audit-publish - los datos malos nunca llegan al usuario
nodo w: Write | icono=tabla | col=0 | fila=0 | sub=carga en una tabla de staging
nodo a: Audit | icono=check | col=1 | fila=0 | sub=corren los checks | color=amarillo
nodo p: Publish | icono=dashboard | col=2 | fila=0 | sub=swap o MERGE a producción | color=verde
nodo q: Cuarentena | icono=alerta | col=1 | fila=1 | sub=falla: se alerta y no se publica | color=rojo
flecha w -> a: paso=1 | explica=La carga escribe en una tabla o rama aislada que nadie consulta.
flecha a -> p: pasa | paso=2 | explica=Si todos los checks bloqueantes pasan, se publica de forma atómica (un swap de tablas, un MERGE o un commit de una rama de Iceberg/Nessie).
flecha a -> q: falla | paso=3 | explica=Si un check bloqueante falla, la tabla de producción queda con los datos de ayer, que son viejos pero correctos, y la alerta trae el detalle.
```

El patrón **write-audit-publish (WAP)** pone los checks **antes** de que los datos lleguen a producción. Si fallan, los usuarios ven los datos de ayer (viejos, pero correctos) en vez de datos nuevos e incorrectos. dbt lo hace con `dbt build` (los tests de un modelo corren antes de sus dependientes) y las tablas Iceberg y Delta lo permiten con ramas o tablas de staging.

## Volumen: comparar contra la historia, no contra un número fijo

Un umbral fijo ("alerta si hay menos de 10.000 filas") falla los fines de semana, en feriados y cuando el negocio crece. Las alternativas, de más simple a más robusta:

1. **Contra la media de los últimos N días** (lo hiciste en la lección anterior).
2. **Contra el mismo día de la semana** de las últimas 4 semanas: resuelve el problema de los domingos.
3. **Puntaje z**: cuántas desviaciones estándar se aleja el valor de la media. |z| > 3 es raro por azar.

:::tip Puntaje z sin raíz cuadrada
SQLite no tiene `SQRT`. Pero |z| > 3 equivale a (x − media)² > 9 × varianza, y la varianza es `AVG(x*x) - AVG(x)*AVG(x)`. Comparar cuadrados evita la raíz.
:::

## Alertas que la guardia respeta

Una alerta **accionable** tiene:

- **Un dueño** (un equipo, no "data").
- **Un umbral que significa un problema real**: si se resuelve sola el 90 % de las veces, no es una alerta, es ruido.
- **Un enlace al runbook** que dice qué hacer.
- **La severidad correcta**: lo que puede esperar al lunes va a un ticket, no al teléfono a las 3 de la mañana.

El ruido tiene un costo: la **fatiga de alertas**. Cuando la mayoría de las alertas no requiere acción, la gente deja de mirarlas, y la alerta real se pierde entre las falsas.

## Práctica

:::ejercicio cli dificultad=Básico titulo="Preparar el incidente"
Prepara los archivos del incidente `monitoreo`.
```respuesta
incidente-preparar monitoreo
```
:::

:::ejercicio cli dificultad=Intermedio titulo="¿Qué alerta suena más?"
`~/incidentes/monitoreo/alertas_octubre.csv` tiene `disparada_utc,alerta,resultado`. Cuenta cuántas veces sonó cada alerta (columna 2). Puedes usar `awk` con un arreglo o la combinación `cut | sort | uniq -c`.
```setup
incidente-preparar monitoreo
```
```respuesta
awk -F ?['"]?,['"]? .*\$2.* \S*alertas_octubre\.csv.*
cut -d ?['"]?,['"]? -f ?2 \S*alertas_octubre\.csv \| sort \| uniq -c.*
tail -n \+2 \S*alertas_octubre\.csv \| cut -d ?['"]?,['"]? -f ?2 \| sort \| uniq -c.*
```
```solucion
awk -F, 'NR>1 {c[$2]++} END {for (k in c) print c[k], k}' ~/incidentes/monitoreo/alertas_octubre.csv | sort -rn
```
```pista
Con `cut`: `cut -d, -f2 archivo | sort | uniq -c`. `uniq -c` cuenta líneas iguales consecutivas, por eso antes va `sort`.
```
```pista
Con `awk`: `awk -F, 'NR>1 {c[$2]++} END {for (k in c) print c[k], k}' archivo`. `c[$2]++` suma 1 en la posición del nombre de la alerta.
```
:::

:::ejercicio quiz dificultad=Intermedio
Según el conteo, ¿cuál es la alerta que más sonó en octubre?

- [ ] frescura_fct_pedidos
- [x] volumen_fct_envios
- [ ] nulos_dim_clientes
- [ ] latencia_api_pagos
:::

:::ejercicio cli dificultad=Básico titulo="¿Cuántas necesitaron a una persona?"
Cuenta cuántas alertas de octubre terminaron en `acción humana` (las demás se resolvieron solas).
```setup
incidente-preparar monitoreo
```
```respuesta
grep -c ['"]?acci[oó]n humana['"]? \S*alertas_octubre\.csv
grep ['"]?acci[oó]n humana['"]? \S*alertas_octubre\.csv \| wc -l
```
```solucion
grep -c "acción humana" ~/incidentes/monitoreo/alertas_octubre.csv
```
```pista
`grep -c TEXTO archivo` cuenta las líneas que contienen el texto. Si el texto tiene espacios, va entre comillas.
```
```explicacion
24 de 220: casi el 90 % de las alertas no necesitó a nadie. Con esa proporción, la guardia aprende a ignorarlas.
```
:::

:::ejercicio cli dificultad=Avanzado titulo="Nulos fuera de lo normal"
`~/incidentes/monitoreo/metricas_tablas.csv` tiene `tabla,ds,filas,nulos_cliente,max_cargado_utc`. Con `awk`, muestra la tabla y la fecha de las filas donde los nulos superan el **5 %** de las filas (`$4/$3 > 0.05`). Salta el encabezado.
```setup
incidente-preparar monitoreo
```
```respuesta
awk -F ?['"]?,['"]? ['"]?NR ?> ?1 ?&& ?\$4 ?/ ?\$3 ?> ?0?\.05 ?\{ ?print \$1, ?\$2;? ?\}['"]? \S*metricas_tablas\.csv
awk -F ?['"]?,['"]? ['"]?NR ?> ?1 ?&& ?\$4 ?> ?0?\.05 ?\* ?\$3 ?\{ ?print \$1, ?\$2;? ?\}['"]? \S*metricas_tablas\.csv
```
```solucion
awk -F, 'NR>1 && $4/$3 > 0.05 {print $1, $2}' ~/incidentes/monitoreo/metricas_tablas.csv
```
```pista
La condición va antes de las llaves: `NR>1 && $4/$3 > 0.05`.
```
```explicacion
`crm.dim_clientes` tiene un 18 % de clientes nulos desde el 26/10. Hace tres días que el problema existe y no hay ningún check que lo mire (el TODO del `checks.yml` lo dice).
```
:::

:::ejercicio quiz dificultad=Intermedio
Mira `~/incidentes/monitoreo/checks.yml`. El 28/10, `fct_envios` cargó el 41 % de su volumen normal y nadie se enteró. ¿Por qué?

- [ ] Porque el check de unicidad de envio_id no detecta caídas
- [x] Porque el check de volumen de fct_envios está deshabilitado (enabled: false)
- [ ] Porque los checks no corren los martes
- [ ] Porque el umbral de frescura es de 6 horas
:::

:::ejercicio sql dificultad=Básico titulo="Check de unicidad"
`fct_envios` debería tener un `envio_id` único. Devuelve los `envio_id` repetidos y cuántas veces aparece cada uno (`veces`), ordenados por `envio_id`.
```sql setup
CREATE TABLE ref_pedidos (pedido_id INTEGER PRIMARY KEY);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 1500) INSERT INTO ref_pedidos SELECT 50000 + i FROM n;
CREATE TABLE fct_envios (envio_id INTEGER, pedido_id INTEGER, ds TEXT, estado TEXT, costo REAL);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 1500)
INSERT INTO fct_envios
SELECT i,
       CASE WHEN i % 250 = 0 THEN NULL WHEN i % 333 = 0 THEN 99000 + i ELSE 50000 + i END,
       date('2026-10-22', '+' || (i % 7) || ' days'),
       CASE WHEN i % 401 = 0 THEN 'ENTREGAD0' WHEN i % 3 = 0 THEN 'EN_CAMINO' ELSE 'ENTREGADO' END,
       CASE WHEN i % 499 = 0 THEN -12.5 ELSE 3 + (i % 17) END
FROM n;
INSERT INTO fct_envios SELECT * FROM fct_envios WHERE envio_id IN (17, 18, 19, 912);
```
```sql solucion
SELECT envio_id, COUNT(*) AS veces
FROM fct_envios
GROUP BY envio_id
HAVING COUNT(*) > 1
ORDER BY envio_id;
```
```pista
Agrupa por la clave y quédate con los grupos de más de una fila: `GROUP BY envio_id HAVING COUNT(*) > 1`.
```
:::

:::ejercicio sql dificultad=Intermedio titulo="Check de integridad referencial"
Cada `pedido_id` de `fct_envios` debería existir en `ref_pedidos`. Devuelve los envíos **huérfanos**: los que tienen un `pedido_id` no nulo que no existe en `ref_pedidos`. Columnas `envio_id`, `pedido_id`, ordenados por `envio_id`.
```sql setup
CREATE TABLE ref_pedidos (pedido_id INTEGER PRIMARY KEY);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 1500) INSERT INTO ref_pedidos SELECT 50000 + i FROM n;
CREATE TABLE fct_envios (envio_id INTEGER, pedido_id INTEGER, ds TEXT, estado TEXT, costo REAL);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 1500)
INSERT INTO fct_envios
SELECT i,
       CASE WHEN i % 250 = 0 THEN NULL WHEN i % 333 = 0 THEN 99000 + i ELSE 50000 + i END,
       date('2026-10-22', '+' || (i % 7) || ' days'),
       CASE WHEN i % 401 = 0 THEN 'ENTREGAD0' WHEN i % 3 = 0 THEN 'EN_CAMINO' ELSE 'ENTREGADO' END,
       CASE WHEN i % 499 = 0 THEN -12.5 ELSE 3 + (i % 17) END
FROM n;
```
```sql solucion
SELECT e.envio_id, e.pedido_id
FROM fct_envios e
LEFT JOIN ref_pedidos p ON p.pedido_id = e.pedido_id
WHERE e.pedido_id IS NOT NULL AND p.pedido_id IS NULL
ORDER BY e.envio_id;
```
```pista
El patrón anti-join: `LEFT JOIN` a la tabla padre y quedarse con las filas donde el padre es `NULL`.
```
```pista
Excluye los `pedido_id` nulos: esos los detecta el check de nulos, no este.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="Todos los checks en una consulta"
Arma el **reporte de checks** de `fct_envios`: una fila por check con la cantidad de filas que lo violan. Columnas `check_nombre` y `filas_con_error`, en este orden: `unicidad_envio_id` (filas que sobran por duplicados: total − distintos), `no_nulo_pedido_id`, `huerfanos_pedido_id`, `dominio_estado` (estados distintos de `ENTREGADO` y `EN_CAMINO`) y `rango_costo` (costo negativo).
```sql setup
CREATE TABLE ref_pedidos (pedido_id INTEGER PRIMARY KEY);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 1500) INSERT INTO ref_pedidos SELECT 50000 + i FROM n;
CREATE TABLE fct_envios (envio_id INTEGER, pedido_id INTEGER, ds TEXT, estado TEXT, costo REAL);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 1500)
INSERT INTO fct_envios
SELECT i,
       CASE WHEN i % 250 = 0 THEN NULL WHEN i % 333 = 0 THEN 99000 + i ELSE 50000 + i END,
       date('2026-10-22', '+' || (i % 7) || ' days'),
       CASE WHEN i % 401 = 0 THEN 'ENTREGAD0' WHEN i % 3 = 0 THEN 'EN_CAMINO' ELSE 'ENTREGADO' END,
       CASE WHEN i % 499 = 0 THEN -12.5 ELSE 3 + (i % 17) END
FROM n;
INSERT INTO fct_envios SELECT * FROM fct_envios WHERE envio_id IN (17, 18, 19, 912);
```
```sql solucion
SELECT 'unicidad_envio_id' AS check_nombre, COUNT(*) - COUNT(DISTINCT envio_id) AS filas_con_error FROM fct_envios
UNION ALL
SELECT 'no_nulo_pedido_id', COUNT(*) FROM fct_envios WHERE pedido_id IS NULL
UNION ALL
SELECT 'huerfanos_pedido_id', COUNT(*) FROM fct_envios e WHERE e.pedido_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ref_pedidos p WHERE p.pedido_id = e.pedido_id)
UNION ALL
SELECT 'dominio_estado', COUNT(*) FROM fct_envios WHERE estado NOT IN ('ENTREGADO', 'EN_CAMINO')
UNION ALL
SELECT 'rango_costo', COUNT(*) FROM fct_envios WHERE costo < 0;
```
```pista
Cada check es un `SELECT 'nombre', COUNT(*) FROM … WHERE <condición de error>`. Únelos con `UNION ALL`.
```
```pista
Para la unicidad: `COUNT(*) - COUNT(DISTINCT envio_id)` da cuántas filas sobran.
```
```explicacion
Así funcionan por dentro dbt tests, Great Expectations o Soda: cada check es una consulta que cuenta filas que violan una regla, y el check falla si el conteo es mayor que cero (o que un umbral). `ENTREGAD0` con un cero en lugar de la O es un caso real: un sistema de origen con un error de tipeo en un valor.
```
:::

:::ejercicio sql ordenado dificultad=Experto titulo="Anomalía de volumen con puntaje z"
`metricas(tabla, ds, filas)` tiene 14 días de cada tabla. Para el **último día** (`2026-10-28`), calcula para cada tabla la media y la varianza de los **13 días anteriores** y marca la tabla como anómala si (filas − media)² > 9 × varianza (equivale a |z| > 3, sin raíz cuadrada). Devuelve `tabla`, `filas`, `media` (entero) y `anomala` (1 o 0), ordenado por `tabla`.
```sql setup
CREATE TABLE metricas (tabla TEXT, ds TEXT, filas INTEGER);
WITH RECURSIVE n(i) AS (SELECT 0 UNION ALL SELECT i + 1 FROM n WHERE i < 13),
t(tabla, base) AS (VALUES ('ventas.fct_pedidos', 52000), ('crm.dim_clientes', 1800), ('logistica.fct_envios', 30500))
INSERT INTO metricas
SELECT tabla, date('2026-10-15', '+' || i || ' days'),
       CASE WHEN tabla = 'logistica.fct_envios' AND i = 13 THEN 12505
            ELSE base + ((i * 7919 + length(tabla) * 31) % 1000) * base / 10000 - base / 20 END
FROM n, t;
```
```sql solucion
WITH hist AS (
  SELECT tabla, AVG(filas) AS media, AVG(filas * filas) - AVG(filas) * AVG(filas) AS varianza
  FROM metricas
  WHERE ds < '2026-10-28'
  GROUP BY tabla
)
SELECT m.tabla, m.filas, ROUND(h.media) AS media,
       CASE WHEN (m.filas - h.media) * (m.filas - h.media) > 9 * h.varianza THEN 1 ELSE 0 END AS anomala
FROM metricas m
JOIN hist h ON h.tabla = m.tabla
WHERE m.ds = '2026-10-28'
ORDER BY m.tabla;
```
```pista
Primero un CTE con `AVG(filas)` y `AVG(filas * filas) - AVG(filas) * AVG(filas)` por tabla, solo con `ds < '2026-10-28'`.
```
```pista
Después únelo con las filas del `2026-10-28` y compara `(filas - media) * (filas - media) > 9 * varianza`.
```
:::

:::ejercicio quiz dificultad=Intermedio
La alerta `latencia_api_pagos` sonó 20 veces en octubre y siempre se resolvió sola en minutos. ¿Qué haces?

- [ ] Nada: más alertas es más seguridad
- [ ] La borras sin avisar a nadie
- [x] La bajas a un ticket o subes el umbral para que dispare solo si dura más de N minutos, y lo acuerdas con el dueño de la API
- [ ] Le pones severidad SEV1 para que alguien la mire
:::

:::ejercicio quiz dificultad=Avanzado
En el patrón write-audit-publish, un check bloqueante falla. ¿Qué ven los usuarios del tablero?

- [ ] Los datos nuevos, con una advertencia
- [x] Los datos de la carga anterior, que son viejos pero correctos, mientras la guardia revisa la cuarentena
- [ ] Una tabla vacía hasta que alguien arregle el problema
- [ ] Un error del tablero
:::

:::ejercicio quiz dificultad=Avanzado
¿Qué check pondrías para que el problema de `dim_clientes` (18 % de clientes nulos desde el 26/10) se detecte el mismo día?

- [ ] Un check de unicidad sobre cliente_id
- [ ] Un check de frescura de 6 horas
- [x] Un check de proporción de nulos por carga (por ejemplo, máximo 1 %) que falle la carga si se supera
- [ ] Un check de volumen de filas
:::

:::errores
- **Apagar el check en vez de arreglarlo**: "da falsos positivos los domingos" se resuelve comparando contra el mismo día de la semana, no con `enabled: false`.
- **Checks que solo avisan**: un warning que nadie lee es igual a no tener check. Decide qué checks **bloquean** la publicación.
- **Alertar por todo**: 220 alertas en un mes enseñan a ignorarlas.
- **Checks sin dueño ni runbook**: la alerta suena y nadie sabe qué hacer ni a quién llamar.
- **Probar solo el último paso**: si la tabla final tiene nulos, ¿de qué paso vinieron? Pon checks en la entrada (staging) y en la salida.
:::

:::trabajo
- **dbt tests** (`unique`, `not_null`, `relationships`, `accepted_values`) con `severity: error` o `warn`; **dbt source freshness** para la frescura.
- **Great Expectations**, **Soda** y **Elementary** para checks y anomalías; **Monte Carlo**, **Bigeye** o **Anomalo** como observabilidad de datos administrada.
- Las alertas van a la herramienta de guardia con **etiqueta del dueño** y **enlace al runbook**. Cada mes se revisa qué alertas sonaron y cuáles no llevaron a ninguna acción.
- Se acuerdan **SLO** con el negocio ("ventas diarias disponible a las 06:00 el 99 % de los días") y las alertas protegen ese SLO.
:::

:::entrevista
**"¿Cómo sabes que los datos de tu pipeline son correctos?"** Menciona los checks (frescura, volumen contra la historia, nulos, unicidad, integridad referencial, dominio), dónde corren (antes de publicar: write-audit-publish), cuáles bloquean y cuáles avisan, la reconciliación contra el origen para los datos críticos y cómo evitas la fatiga de alertas.
:::

## Resumen

| Herramienta | Para qué |
|---|---|
| Frescura, volumen, nulos, unicidad, referencial, dominio | Detectar los fallos silenciosos más comunes |
| Volumen contra la historia (mismo día de la semana, puntaje z) | Evitar falsos positivos |
| Write-audit-publish | Que los datos malos no lleguen a producción |
| Revisión mensual de alertas | Mantener la confianza de la guardia |
