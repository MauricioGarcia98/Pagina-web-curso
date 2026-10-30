---
titulo: Simulacro de guardia - cinco alertas a la vez y el postmortem
nivel: Experto
duracion: 70
resumen: El examen práctico del módulo - una mañana con cinco alertas simultáneas de distinta severidad. Priorizar, coordinar como responsable del incidente, diagnosticar con los logs, reparar los pagos duplicados antes del cierre de Finanzas, reconciliar contra la pasarela de pagos, medir MTTD, MTTA y MTTR, y escribir un postmortem sin culpables con acciones que de verdad prevengan.
objetivos: Priorizar varias alertas simultáneas por impacto y urgencia | Coordinar un incidente asignando responsables y comunicando | Reparar datos duplicados y verificar con una reconciliación externa | Calcular MTTD, MTTA y MTTR desde la línea de tiempo | Escribir la causa raíz y las acciones de un postmortem sin culpables
prerrequisitos: incidentes-primera-guardia | incidentes-duplicados-e-idempotencia | incidentes-apis-credenciales-y-costos
autoevaluacion: ¿Sabes en qué orden atender cinco alertas a la vez? | ¿Sabes qué hace el responsable de un incidente (incident commander)? | ¿Sabes verificar una reparación contra un sistema externo? | ¿Sabes calcular MTTD, MTTA y MTTR? | ¿Sabes escribir una acción de postmortem que se pueda cumplir?
---

:::escenario
Jueves 29, último día hábil del mes. Entre las 07:02 y las 07:11 te llegan cinco alertas. Finanzas cierra el mes **hoy a las 12:00** con los datos de pagos. Estás sola o solo de guardia hasta que llegue el resto del equipo a las 09:00. Este simulacro junta todo lo del módulo.
:::

## Prioriza antes de tocar nada

Ante varias alertas, la pregunta no es "¿cuál llegó primero?" sino **"¿cuál causa más daño si espera?"**. Dos ejes:

| | Urgente (hay un plazo hoy) | No urgente |
|---|---|---|
| **Impacto alto** (dinero, clientes, regulador, decisiones de la dirección) | Primero, y pide ayuda | Hoy, con un responsable asignado |
| **Impacto bajo** | Mitigación rápida y sigue | Ticket |

Y una regla: **busca causas comunes**. Dos alertas que empiezan a la misma hora a veces tienen una sola causa (un deploy, una credencial vencida, un nodo caído).

## El rol de responsable del incidente

Cuando el incidente es grande o hay varios a la vez, una persona asume el rol de **responsable del incidente** (*incident commander*). No es quien arregla: es quien **coordina**.

- Decide prioridades y asigna un responsable a cada frente ("Ana: Kafka; yo: pagos").
- Mantiene la **línea de tiempo** y las comunicaciones al negocio cada N minutos.
- Pide ayuda o escala cuando hace falta (al equipo dueño de un sistema, a la guardia de infraestructura).
- Declara el incidente resuelto y abre el postmortem.

Si estás sola o solo, igual separa los dos sombreros: cada 30 minutos deja de investigar y comunica.

## Medir la respuesta

| Métrica | Desde | Hasta |
|---|---|---|
| **MTTD** (*mean time to detect*) | El problema empieza | Se dispara la alerta (o alguien lo nota) |
| **MTTA** (*to acknowledge*) | La alerta | Alguien la reconoce |
| **MTTR** (*to resolve / recover*) | La alerta | El servicio o los datos están bien (según la definición del equipo, puede medirse desde el inicio) |

En datos, el MTTD suele ser el peor: los fallos silenciosos se detectan cuando un usuario se queja. Cada postmortem debería preguntarse **cómo detectarlo antes**.

## El postmortem sin culpables

Un postmortem bien hecho tiene: resumen, impacto (con números), línea de tiempo, **causa raíz** (los "5 porqués"), qué funcionó y qué no, y **acciones** con dueño y fecha. *Sin culpables* (blameless) significa que la causa se busca en el sistema: "el pipeline permitía que un reintento duplicara pagos", no "Pedro configuró mal el reintento". Las personas actúan razonablemente con la información y las herramientas que tienen; si alguien pudo cometer el error, el sistema lo permitió.

```diagrama
titulo: Los 5 porqués del incidente de pagos
nodo p1: Pagos duplicados | icono=alerta | col=0 | fila=0 | color=rojo
nodo p2: El intento 2 insertó otra vez | icono=engranaje | col=1 | fila=0
nodo p3: La carga es un INSERT (append) | icono=codigo | col=2 | fila=0
nodo p4: No hay check de unicidad | icono=check | col=3 | fila=0
nodo p5: No hay estándar de idempotencia | icono=documento | col=3 | fila=1 | color=violeta | sub=causa raíz
flecha p1 -> p2: ¿por qué? | paso=1 | explica=Porque el intento 2 volvió a insertar lo que el intento 1 ya había confirmado.
flecha p2 -> p3: ¿por qué? | paso=2 | explica=Porque la tarea agrega filas en lugar de reemplazar la partición o hacer MERGE.
flecha p3 -> p4: ¿por qué no se detectó? | paso=3 | explica=Porque no hay un check de unicidad de payment_id antes de publicar.
flecha p4 -> p5: ¿por qué? | paso=4 | explica=Porque el equipo no tiene un estándar que exija cargas idempotentes y checks de clave en las tablas financieras.
```

## Práctica

:::ejercicio cli dificultad=Básico titulo="Preparar el simulacro"
Prepara los archivos del incidente `simulacro`.
```respuesta
incidente-preparar simulacro
```
:::

:::ejercicio cli dificultad=Básico titulo="Las alertas"
Muestra las alertas de la mañana: `~/incidentes/simulacro/alertas.txt`.
```setup
incidente-preparar simulacro
```
```respuesta
cat \S*alertas\.txt
```
```solucion
cat ~/incidentes/simulacro/alertas.txt
```
:::

:::ejercicio quiz dificultad=Avanzado
¿En qué orden las atiendes?

- [ ] Por hora de llegada: disco, frescura, pagos, latencia, Kafka
- [x] Pagos duplicados primero (SEV1, Finanzas cierra a las 12:00); después frescura de pedidos y lag de Kafka (SEV2), pidiendo ayuda para uno de los dos; el disco al 81 % con una mitigación rápida; la latencia, a un ticket
- [ ] Primero las fáciles (disco y latencia) para bajar la cantidad de alertas
- [ ] Todas a la vez, cambiando de una a otra cada 5 minutos
:::

:::ejercicio cli dificultad=Intermedio titulo="El log de pagos"
Muestra el log `~/incidentes/simulacro/logs/pagos.log`.
```setup
incidente-preparar simulacro
```
```respuesta
cat \S*pagos\.log
```
```solucion
cat ~/incidentes/simulacro/logs/pagos.log
```
:::

:::ejercicio quiz dificultad=Avanzado
Según el log de pagos, ¿qué pasó?

- [ ] La pasarela mandó pagos repetidos
- [x] El intento 1 hizo COMMIT pero la conexión se cortó antes de la confirmación; Airflow reintentó y el intento 2 insertó las mismas filas: el mismo patrón de la lección de duplicados
- [ ] Un usuario cargó los pagos a mano dos veces
- [ ] El MERGE falló por duplicados en el origen
:::

:::ejercicio cli dificultad=Intermedio titulo="La causa del atraso de pedidos"
En `~/incidentes/simulacro/logs/pedidos.log`, busca la línea que menciona el **upstream** (la dependencia anterior).
```setup
incidente-preparar simulacro
```
```respuesta
grep( -i)? ['"]?upstream['"]? \S*pedidos\.log
```
```solucion
grep upstream ~/incidentes/simulacro/logs/pedidos.log
```
```explicacion
El sensor esperó dos horas un staging que nunca iba a llegar: el extractor del ERP falló por autenticación del SFTP. Reejecutar `cargar_fct_pedidos` no sirve; la acción es renovar la credencial (y averiguar por qué venció sin aviso) y después reejecutar `erp_extract`.
```
:::

:::ejercicio quiz dificultad=Intermedio
Llega una compañera a las 07:40. Eres el responsable del incidente. ¿Qué haces?

- [ ] Le explicas todo durante 30 minutos antes de que empiece
- [x] Le asignas un frente concreto (por ejemplo, la credencial del SFTP y el atraso de pedidos), con el contexto mínimo, y sigues con pagos y con las comunicaciones
- [ ] Le pides que revise las cinco alertas de nuevo para confirmar tu diagnóstico
- [ ] Le dejas los pagos y te vas a mirar el disco
:::

:::ejercicio sql ordenado dificultad=Intermedio titulo="El impacto en pagos"
`fct_pagos(payment_id, ds, monto, load_attempt)`. Por cada `ds`, devuelve `filas`, `pagos` (distintos) y `monto_inflado`: cuánto de más suma el monto por las filas duplicadas (2 decimales). Ordena por `ds`.
```sql setup
CREATE TABLE fct_pagos (payment_id TEXT, ds TEXT, monto REAL, load_attempt INTEGER);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 1200)
INSERT INTO fct_pagos SELECT 'pay_' || (100000 + i), CASE WHEN i <= 800 THEN '2026-10-27' ELSE '2026-10-28' END, ROUND(5 + (i * 13.7) % 400, 2), 1 FROM n;
INSERT INTO fct_pagos SELECT payment_id, ds, monto, 2 FROM fct_pagos WHERE ds = '2026-10-28' AND CAST(substr(payment_id, 5) AS INTEGER) % 10 = 0;
```
```sql solucion
WITH unicos AS (SELECT payment_id, ds, MAX(monto) AS monto FROM fct_pagos GROUP BY payment_id, ds)
SELECT f.ds, COUNT(*) AS filas, COUNT(DISTINCT f.payment_id) AS pagos,
       ROUND(SUM(f.monto) - (SELECT SUM(u.monto) FROM unicos u WHERE u.ds = f.ds), 2) AS monto_inflado
FROM fct_pagos f
GROUP BY f.ds
ORDER BY f.ds;
```
```pista
El monto real es la suma con una fila por pago. Calcúlalo en un CTE agrupando por `payment_id, ds` y réstalo de la suma de la tabla.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="Reparar antes del cierre"
Elimina los duplicados de `fct_pagos` dejando una fila por `payment_id` (la del `load_attempt` más bajo).
```sql setup
CREATE TABLE fct_pagos (payment_id TEXT, ds TEXT, monto REAL, load_attempt INTEGER);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 1200)
INSERT INTO fct_pagos SELECT 'pay_' || (100000 + i), CASE WHEN i <= 800 THEN '2026-10-27' ELSE '2026-10-28' END, ROUND(5 + (i * 13.7) % 400, 2), 1 FROM n;
INSERT INTO fct_pagos SELECT payment_id, ds, monto, 2 FROM fct_pagos WHERE ds = '2026-10-28' AND CAST(substr(payment_id, 5) AS INTEGER) % 10 = 0;
```
```sql solucion
DELETE FROM fct_pagos
WHERE load_attempt > (SELECT MIN(p.load_attempt) FROM fct_pagos p WHERE p.payment_id = fct_pagos.payment_id);
```
```check
SELECT ds, COUNT(*) AS filas, COUNT(DISTINCT payment_id) AS pagos, MAX(load_attempt) AS max_intento, ROUND(SUM(monto), 2) AS total
FROM fct_pagos GROUP BY ds ORDER BY ds;
```
```pista
Borra las filas cuyo `load_attempt` es mayor que el mínimo de su `payment_id` (una subconsulta correlacionada).
```
```pista
Otra forma: `DELETE … WHERE rowid NOT IN (SELECT MIN(rowid) FROM fct_pagos GROUP BY payment_id)`.
```
:::

:::ejercicio sql ordenado dificultad=Avanzado titulo="Reconciliar contra la pasarela"
Ya reparaste `fct_pagos`. Verifica contra un sistema **externo**: `pasarela_totales(ds, total)` tiene los totales que informa la pasarela de pagos. Devuelve `ds`, `total_dw`, `total_pasarela` y `diferencia` (2 decimales), ordenado por `ds`.
```sql setup
CREATE TABLE fct_pagos (payment_id TEXT, ds TEXT, monto REAL, load_attempt INTEGER);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 1200)
INSERT INTO fct_pagos SELECT 'pay_' || (100000 + i), CASE WHEN i <= 800 THEN '2026-10-27' ELSE '2026-10-28' END, ROUND(5 + (i * 13.7) % 400, 2), 1 FROM n;
CREATE TABLE pasarela_totales AS SELECT ds, ROUND(SUM(monto), 2) AS total FROM fct_pagos GROUP BY ds;
```
```sql solucion
SELECT p.ds, ROUND(SUM(f.monto), 2) AS total_dw, p.total AS total_pasarela,
       ROUND(SUM(f.monto) - p.total, 2) AS diferencia
FROM pasarela_totales p
JOIN fct_pagos f ON f.ds = p.ds
GROUP BY p.ds, p.total
ORDER BY p.ds;
```
```explicacion
Diferencia cero en los dos días: ahora sí puedes avisar a Finanzas que los datos están listos para el cierre. Verificar contra la fuente de verdad (la pasarela, el banco, el ERP) es más fuerte que cualquier check interno: un check de unicidad no detectaría un pago que falta.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="MTTD, MTTA y MTTR"
`linea_tiempo(ts, hito)` tiene los hitos del incidente de pagos: `inicio` (cuando se insertaron los duplicados), `alerta`, `ack`, `mitigado` y `resuelto`. Devuelve `mttd_min` (inicio → alerta), `mtta_min` (alerta → ack) y `mttr_min` (alerta → resuelto), en minutos enteros.
```sql setup
CREATE TABLE linea_tiempo (ts TEXT, hito TEXT);
INSERT INTO linea_tiempo VALUES
('2026-10-29 05:05:10', 'inicio'), ('2026-10-29 07:06:00', 'alerta'), ('2026-10-29 07:09:00', 'ack'),
('2026-10-29 07:40:00', 'mitigado'), ('2026-10-29 08:55:00', 'resuelto');
```
```sql solucion
WITH t AS (
  SELECT MAX(CASE WHEN hito = 'inicio' THEN ts END) AS inicio,
         MAX(CASE WHEN hito = 'alerta' THEN ts END) AS alerta,
         MAX(CASE WHEN hito = 'ack' THEN ts END) AS ack,
         MAX(CASE WHEN hito = 'resuelto' THEN ts END) AS resuelto
  FROM linea_tiempo
)
SELECT CAST(ROUND((julianday(alerta) - julianday(inicio)) * 1440) AS INTEGER) AS mttd_min,
       CAST(ROUND((julianday(ack) - julianday(alerta)) * 1440) AS INTEGER) AS mtta_min,
       CAST(ROUND((julianday(resuelto) - julianday(alerta)) * 1440) AS INTEGER) AS mttr_min
FROM t;
```
```pista
Pasa los hitos de filas a columnas con `MAX(CASE WHEN hito = '…' THEN ts END)`.
```
```explicacion
Dos horas para detectar contra tres minutos para reconocer: el problema no es la guardia, es la detección. La acción del postmortem que más mejora estos números es el check de unicidad bloqueante, que habría disparado a las 05:05.
```
:::

:::ejercicio quiz dificultad=Avanzado
¿Cuál es la mejor redacción de la **causa raíz** para el postmortem?

- [ ] "El ingeniero de guardia no revisó los pagos a tiempo."
- [ ] "Postgres cortó la conexión."
- [x] "La carga de fct_pagos es un append sin clave de idempotencia ni check de unicidad, así que un reintento después de un COMMIT no confirmado duplicó los pagos sin que nada lo detectara."
- [ ] "Mala suerte: un corte de red justo en el momento del COMMIT."
:::

:::ejercicio quiz dificultad=Intermedio
¿Cuál de estas es una buena **acción** de postmortem?

- [ ] "Tener más cuidado con los reintentos."
- [ ] "Revisar los pipelines."
- [x] "Convertir cargar_fct_pagos a MERGE por payment_id y agregar un check de unicidad bloqueante. Dueño: equipo de datos de Finanzas. Fecha: 12/11."
- [ ] "Que no vuelva a pasar."
:::

:::ejercicio quiz dificultad=Intermedio
¿Qué le escribes a Finanzas a las 09:00, cuando la reparación ya está verificada?

- [ ] "Listo."
- [x] "Los pagos del 28/10 tenían 40 pagos duplicados por un error de carga (detalle en el postmortem). Ya están corregidos y verificados contra la pasarela: diferencia cero. Pueden usar los datos para el cierre."
- [ ] "Hubo un problema con el COMMIT de Postgres por un timeout de Airflow que reintentó."
- [ ] No escribes nada: si no preguntan, está bien
:::

:::errores
- **Atender por orden de llegada**: el disco al 81 % llegó primero y es lo que menos importa hoy.
- **Ser el héroe solitario**: a las 07:40 llega ayuda; si no la usas, tardas el doble.
- **Comunicar solo al final**: Finanzas tiene que saber a las 07:15 que hay un problema y cuándo vas a volver a escribir.
- **Postmortems con culpables**: la gente deja de reportar errores y se pierde la información para mejorar.
- **Acciones vagas**: "tener más cuidado" no tiene dueño ni fecha y no cambia el sistema.
:::

:::trabajo
- Las empresas practican **game days**: simulacros con fallos inyectados a propósito (una credencial revocada, un archivo vacío, un nodo apagado) para probar alertas, runbooks y la coordinación.
- Los postmortems se leen en una reunión semanal, se guardan en un lugar común y sus acciones se siguen como cualquier otro trabajo del equipo.
- Las métricas de respuesta (MTTD, MTTR, incidentes por mes, porcentaje de incidentes detectados por una alerta y no por un usuario) se revisan cada trimestre.
:::

:::entrevista
**"Te llegan varias alertas a la vez. ¿Cómo te organizas?"** Prioriza por impacto y urgencia (no por orden de llegada), busca causas comunes, comunica temprano, pide ayuda y asigna frentes con un responsable del incidente, mitiga lo urgente y deja lo de bajo impacto en tickets. Después, el postmortem sin culpables con acciones concretas con dueño y fecha.
:::

## Resumen del módulo

| Lección | La lección en una línea |
|---|---|
| Primera guardia | Reconocer, avisar, mitigar, diagnosticar, reparar, verificar y escribir el postmortem |
| Checks | Seis checks + write-audit-publish + alertas que la guardia respeta |
| Duplicados | Toda carga tiene que poder repetirse: partición, MERGE o id de evento |
| Esquemas | Lo nuevo se acepta; lo que rompe falla rápido; contratos con el productor |
| Tardíos | Dos relojes; marca de agua sobre la ingesta y ventana de relectura |
| Airflow | Imports, zombies por OOM, pools, catchup y la base de metadatos |
| Spark | Mediana contra máximo; la clave caliente; memoria y archivos chicos |
| Fechas y texto | UTC al guardar, local al agrupar, UTF-8 sin BOM |
| Kafka | Lag por partición, DLQ, rebalanceos y destino idempotente |
| Lakehouse | Historial, time travel, VACUUM con retención y permisos |
| APIs y costos | Fallar en vez de saltear, reconciliar, identidades de servicio y FinOps |
| Simulacro | Priorizar, coordinar, verificar contra la fuente y aprender sin culpas |
