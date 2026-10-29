---
titulo: Tu primera guardia - el método para no entrar en pánico
nivel: Intermedio
duracion: 50
resumen: Cómo trabaja un ingeniero de datos de guardia (on-call) - reconocer la alerta, avisar, medir el impacto, mitigar antes de arreglar, diagnosticar con los logs y los datos, reparar sin empeorar, verificar y cerrar. Con un incidente real - todas las tareas en verde y el tablero de gerencia sin datos.
objetivos: Seguir los 8 pasos de un incidente en orden | Clasificar la severidad de un incidente de datos | Escribir un mensaje de estado útil para el negocio | Encontrar en un log de Airflow la línea que explica el problema | Detectar con SQL una carga con volumen anómalo y verificar la reparación
autoevaluacion: ¿Sabes qué hacer en los primeros 5 minutos de una alerta? | ¿Sabes por qué una tarea en verde puede haber cargado datos incorrectos? | ¿Sabes clasificar un incidente en SEV1 a SEV4? | ¿Sabes escribir un mensaje de estado para usuarios no técnicos? | ¿Sabes comparar el volumen de una carga con su historia?
---

:::escenario
Son las 07:12 UTC. Te llega una alerta al teléfono: **la tabla de ventas diarias no tiene los datos de ayer**. El tablero "Ventas diarias - Gerencia" lo abren 68 personas a las 08:00. Entras a Airflow y… todas las tareas del DAG están en **verde**. Tienes 48 minutos. Este módulo te entrena para esa hora: con alertas, logs y datos rotos de verdad, preparados en la terminal.
:::

## Por qué este módulo existe

En los cursos se aprende a **construir** pipelines. En el trabajo, buena parte de la semana se va en **operarlos**: cargas que fallan, datos que llegan tarde, un proveedor que cambia una columna, un job que antes tardaba 10 minutos y ahora tarda 3 horas, una factura de la nube que se triplicó. Las encuestas a equipos de datos repiten lo mismo: la mitad del tiempo, o más, se va en mantener y depurar lo que ya existe.

Lo que diferencia a un ingeniero junior de uno senior en un incidente no es saberse todos los errores de memoria. Es tener un **método**: saber qué hacer primero, dónde mirar, cómo no empeorar las cosas y cómo evitar que vuelva a pasar.

:::analogia
Un incidente de datos se parece a una guardia en una sala de emergencias. Primero se estabiliza al paciente (mitigar), después se busca la causa (diagnosticar) y recién entonces se opera (reparar). Un médico que opera sin estabilizar, o que estabiliza y se va sin buscar la causa, hace mal su trabajo.
:::

## Los 8 pasos de un incidente

```diagrama
titulo: El ciclo de un incidente de datos
nodo a: 1. Reconocer | icono=alerta | col=0 | fila=0 | sub=ack: "lo estoy mirando" | color=rojo
nodo b: 2. Avisar | icono=mensaje | col=1 | fila=0 | sub=qué pasa, impacto, próxima novedad
nodo c: 3. Impacto | icono=usuario | col=2 | fila=0 | sub=quién, qué datos, desde cuándo
nodo d: 4. Mitigar | icono=escudo | col=3 | fila=0 | sub=frenar el daño | color=naranja
nodo e: 5. Diagnosticar | icono=lupa | col=3 | fila=1 | sub=logs, datos, qué cambió
nodo f: 6. Reparar | icono=engranaje | col=2 | fila=1 | sub=idempotente, anotado
nodo g: 7. Verificar | icono=check | col=1 | fila=1 | sub=los datos, no el color de la tarea | color=verde
nodo h: 8. Postmortem | icono=documento | col=0 | fila=1 | sub=sin culpables, con acciones | color=violeta
flecha a -> b: paso=1 | explica=Reconocer la alerta (ack) avisa al resto que alguien la tomó y frena la escalada automática.
flecha b -> c: paso=2 | explica=El primer mensaje sale en los primeros 5–10 minutos, aunque todavía no sepas la causa.
flecha c -> d: paso=3 | explica=Con el impacto claro decides qué tan urgente es y qué mitigar.
flecha d -> e: paso=4 | explica=Mitigar es frenar el daño: pausar lo que propaga datos malos, avisar en el tablero, volver a una versión anterior.
flecha e -> f: paso=5 | explica=Diagnosticar es responder qué cambió, dónde se rompió y desde cuándo.
flecha f -> g: paso=6 | explica=Reparar de forma idempotente: si lo corres dos veces, el resultado es el mismo.
flecha g -> h: paso=7 | explica=Verificar mirando los datos (filas, totales, duplicados), no solo que la tarea esté verde.
```

1. **Reconocer (ack)**: tomas la alerta en la herramienta (PagerDuty, Opsgenie, el canal de Slack). Así nadie más pierde tiempo y la alerta no escala al siguiente nivel.
2. **Avisar**: un mensaje corto en el canal de incidentes en los primeros minutos. Todavía no sabes la causa, y no importa.
3. **Medir el impacto**: qué tablas, qué tableros, qué usuarios, qué decisiones dependen de esos datos y desde cuándo están mal.
4. **Mitigar**: frenar el daño antes de arreglar. Por ejemplo, pausar el DAG que copia los datos malos a otros sistemas, poner un aviso en el tablero ("datos al 27/10") o volver a la versión anterior de una tabla.
5. **Diagnosticar**: buscar la causa con los logs y los datos. Tres preguntas: **¿qué cambió?** (un deploy, un proveedor, un volumen), **¿dónde se rompió?** (recorres el linaje hacia atrás, tabla por tabla) y **¿desde cuándo?**
6. **Reparar**: corregir de forma **idempotente** (correrlo dos veces deja el mismo resultado) y anotando cada acción en la línea de tiempo del incidente.
7. **Verificar**: comprobar los **datos**: filas, totales, duplicados, contra la historia. "La tarea está en verde" no es una verificación.
8. **Postmortem**: un documento sin culpables que explica qué pasó, por qué y qué acciones evitan que se repita.

## Severidad: no todo es una emergencia

| Severidad | Ejemplo en datos | Respuesta |
|---|---|---|
| **SEV1** | Datos incorrectos que ya usó un sistema externo: facturas, pagos, reportes a un regulador, un modelo de crédito decidiendo con datos rotos | Todo el equipo, ahora. Se avisa a la dirección |
| **SEV2** | Un tablero clave sin datos o con datos incorrectos antes de una reunión; un SLA importante vencido | La guardia, de inmediato. Actualizaciones cada 30 minutos |
| **SEV3** | Un pipeline secundario atrasado, con margen antes de que alguien lo note | Dentro del día laboral |
| **SEV4** | Una alerta ruidosa, un warning, una mejora | Ticket en el backlog |

:::tip Los datos incorrectos son peores que los datos faltantes
Un tablero vacío se nota enseguida. Un tablero con números **plausibles pero incorrectos** se usa para decidir durante días. Por eso los fallos **silenciosos** (la tarea en verde con datos malos) suelen ser los incidentes más caros.
:::

## El mensaje de estado

El primer aviso no necesita la causa. Necesita cuatro cosas: **qué pasa**, **a quién afecta**, **qué estás haciendo** y **cuándo vuelves a escribir**.

```text
🔴 [SEV2] Ventas diarias sin datos del 28/10
Impacto: el tablero "Ventas diarias - Gerencia" muestra hasta el 27/10.
Qué hacemos: investigando la carga de esta madrugada. Agregamos un aviso en el tablero.
Próxima actualización: 07:45 UTC o antes si hay novedades.
```

Lo que **no** se escribe: "creo que es el ERP" (si no está confirmado), jerga ("el MERGE devolvió 0 rows affected") o silencio durante una hora.

## Leer un log de Airflow

Cada tarea de Airflow deja un log con líneas como esta:

```text
[2026-10-29 03:06:14,512] {erp.py:83} WARNING - Archivo erp/ventas/2026-10-28.csv no encontrado después de 6 intentos; allow_empty=True: se continúa con un lote vacío
```

| Parte | Significado |
|---|---|
| `[2026-10-29 03:06:14,512]` | Fecha y hora (UTC) con milisegundos |
| `{erp.py:83}` | Archivo y línea del código que escribió el mensaje |
| `WARNING` | Nivel: DEBUG, INFO, WARNING, ERROR, CRITICAL |
| El resto | El mensaje |

En un incidente no se lee el log de arriba abajo: se **filtra**. Con `grep WARNING archivo.log` ves solo las advertencias; con `grep -c ERROR` cuentas los errores; con `tail -n 20` ves el final, donde suele estar la excepción.

:::cuidado Verde no es correcto
Airflow marca una tarea como **SUCCESS** cuando el código terminó sin lanzar una excepción. No sabe si cargó 0 filas o 12.000. Por eso, al lado de cada carga importante, hace falta un **check de datos** (volumen, frescura, duplicados) que haga fallar la tarea si los datos no tienen sentido. Eso lo vemos en la lección siguiente.
:::

## Práctica: el incidente del tablero vacío

Prepara los archivos del incidente en la terminal: la alerta, el runbook (la guía de pasos para este pipeline), el log de la ejecución y el historial de cargas.

:::ejercicio cli dificultad=Básico titulo="Preparar el incidente"
Prepara los archivos del incidente `primer-dia` con el comando `incidente-preparar`.
```respuesta
incidente-preparar primer-dia
```
```explicacion
Los archivos quedan en `~/incidentes/primer-dia/`. Cada incidente del módulo se prepara igual; si te pierdes, vuelve a ejecutarlo y los archivos se regeneran idénticos.
```
:::

:::ejercicio cli dificultad=Básico titulo="Leer la alerta"
Muestra el contenido de la alerta: el archivo `alerta.txt` del incidente.
```setup
incidente-preparar primer-dia
```
```respuesta
cat \S*alerta\.txt
```
```solucion
cat ~/incidentes/primer-dia/alerta.txt
```
```pista
`cat` muestra un archivo completo. La ruta es `~/incidentes/primer-dia/alerta.txt`.
```
:::

:::ejercicio cli dificultad=Básico titulo="Filtrar las advertencias"
El log de la última ejecución está en `~/incidentes/primer-dia/logs/ventas_diarias_2026-10-28.log`. Muestra **solo las líneas con WARNING**.
```setup
incidente-preparar primer-dia
```
```respuesta
grep( -[a-zA-Z]+)* ['"]?WARN(ING)?['"]? \S*ventas_diarias_2026-10-28\.log
```
```solucion
grep WARNING ~/incidentes/primer-dia/logs/ventas_diarias_2026-10-28.log
```
```pista
`grep PALABRA archivo` muestra las líneas que contienen la palabra.
```
```explicacion
Aparecen dos líneas: el archivo del ERP no llegó y, por `allow_empty=True`, el extractor siguió con un lote vacío; y el check de volumen está deshabilitado. Dos decisiones de diseño que convirtieron un retraso en un fallo silencioso.
```
:::

:::ejercicio quiz dificultad=Intermedio
Con lo que viste en el log: ¿por qué la tabla no tiene datos del 28/10 si todas las tareas están en verde?

- [ ] El MERGE falló y Airflow no registró el error
- [x] El archivo del ERP no llegó, el extractor siguió con un lote vacío (allow_empty=True) y ningún check de volumen lo frenó
- [ ] El scheduler de Airflow no ejecutó el DAG esa noche
- [ ] La tabla se borró por un VACUUM
:::

:::ejercicio cli dificultad=Intermedio titulo="Contar las filas de cada carga"
El archivo `~/incidentes/primer-dia/cargas.csv` tiene `ds,filas,monto_total` de los últimos 30 días. Usa `awk` para mostrar **la fecha de las cargas con 0 filas** (columna 2 igual a 0).
```setup
incidente-preparar primer-dia
```
```respuesta
awk -F ?['"]?,['"]? ['"]?\$2 ?== ?0 ?(\{ ?print \$1;? ?\})?['"]? \S*cargas\.csv
```
```solucion
awk -F, '$2 == 0 {print $1}' ~/incidentes/primer-dia/cargas.csv
```
```pista
`awk -F,` separa por comas. Un programa awk es `condición {acción}`: `$2 == 0 {print $1}`.
```
```pista
Escribe el programa entre comillas simples: `awk -F, '$2 == 0 {print $1}' archivo`.
```
:::

:::ejercicio quiz dificultad=Intermedio
Son las 07:15. Ya hiciste ack. ¿Qué haces **antes** de investigar a fondo?

- [ ] Reejecutar el DAG completo varias veces hasta que cargue datos
- [x] Avisar en el canal de incidentes (qué pasa, impacto, próxima actualización) y poner un aviso en el tablero
- [ ] Escribir al equipo del ERP culpándolos del problema
- [ ] Esperar a las 08:00 para ver si alguien se queja
:::

:::ejercicio quiz dificultad=Intermedio
¿Qué severidad corresponde a este incidente (tablero de gerencia sin los datos de ayer, faltan 48 minutos para que lo abran, ningún sistema externo usó datos incorrectos)?

- [ ] SEV1
- [x] SEV2
- [ ] SEV3
- [ ] SEV4
:::

:::ejercicio sql ordenado dificultad=Intermedio titulo="Detectar cargas anómalas"
La tabla `cargas(ds, filas)` tiene una fila por día. Encuentra los días **desde el 2026-10-06** cuyo volumen es **menor al 70 %** del promedio de los **7 días anteriores** (sin contar el propio día). Columnas: `ds`, `filas`, `media_7d` (redondeada a entero) y `ratio` (filas ÷ media, 2 decimales). Ordena por `ds`.
```sql setup
CREATE TABLE cargas (ds TEXT PRIMARY KEY, filas INTEGER);
WITH RECURSIVE d(n) AS (SELECT 0 UNION ALL SELECT n + 1 FROM d WHERE n < 29)
INSERT INTO cargas
SELECT date('2026-09-29', '+' || n || ' days'),
  CASE WHEN date('2026-09-29', '+' || n || ' days') = '2026-10-28' THEN 0
       WHEN date('2026-09-29', '+' || n || ' days') = '2026-10-14' THEN 5210
       WHEN strftime('%w', date('2026-09-29', '+' || n || ' days')) IN ('0', '6') THEN 8100 + (n * 53) % 400
       ELSE 12200 + (n * 97) % 600 END
FROM d;
```
```sql solucion
WITH m AS (
  SELECT ds, filas,
         AVG(filas) OVER (ORDER BY ds ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING) AS media_7d
  FROM cargas
)
SELECT ds, filas, ROUND(media_7d) AS media_7d, ROUND(filas / media_7d, 2) AS ratio
FROM m
WHERE ds >= '2026-10-06' AND filas < 0.7 * media_7d
ORDER BY ds;
```
```pista
La media de los 7 días anteriores es una función de ventana: `AVG(filas) OVER (ORDER BY ds ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING)`.
```
```pista
No puedes filtrar por una función de ventana en el mismo `WHERE`: calcúlala en un CTE y filtra afuera.
```
```explicacion
Aparecen dos días: el 28/10 (0 filas, el incidente de hoy) y el 14/10, con 5.210 filas, una carga parcial que **nadie vio** hace dos semanas. Es típico: cuando investigas un incidente encuentras otros que pasaron en silencio. Anótalo en el postmortem.
```
:::

:::ejercicio sql ordenado dificultad=Intermedio titulo="¿Qué más está atrasado?"
Antes de concentrarte en una sola tabla, revisa si hay otras atrasadas. La tabla `particiones` tiene, para cada tabla, cuándo se cargó por última vez (`cargado_en`, UTC) y su SLA en horas. Son las `2026-10-29 07:12`. Lista las tablas cuya última carga tiene **más horas que su SLA**, con las horas transcurridas (1 decimal), de la más atrasada a la menos.
```sql setup
CREATE TABLE particiones (tabla TEXT, ultima_ds TEXT, cargado_en TEXT, sla_horas INTEGER);
INSERT INTO particiones VALUES
('ventas.fct_ventas_diarias', '2026-10-27', '2026-10-28 03:07', 27),
('crm.dim_clientes', '2026-10-28', '2026-10-29 02:40', 27),
('logistica.fct_envios', '2026-10-28', '2026-10-29 04:55', 27),
('finanzas.fct_pagos', '2026-10-26', '2026-10-27 05:01', 27),
('marketing.fct_campanias', '2026-10-28', '2026-10-29 06:58', 27);
```
```sql solucion
SELECT tabla,
       ROUND((julianday('2026-10-29 07:12') - julianday(cargado_en)) * 24, 1) AS horas
FROM particiones
WHERE (julianday('2026-10-29 07:12') - julianday(cargado_en)) * 24 > sla_horas
ORDER BY horas DESC;
```
```pista
`julianday(a) - julianday(b)` da la diferencia en días; multiplícala por 24 para tener horas.
```
```explicacion
`finanzas.fct_pagos` lleva más de dos días sin cargarse y **no tenía alerta**. Un segundo incidente, quizás más grave. Por eso el paso 3 (impacto) mira alrededor y no solo la tabla de la alerta.
```
:::

:::ejercicio quiz dificultad=Intermedio
¿Cuál es el **mejor** mensaje de estado para el canal del negocio?

- [ ] "El MERGE en fct_ventas_diarias devolvió 0 rows affected por allow_empty en el extractor."
- [ ] "Hay un problema con los datos, ya lo estamos viendo."
- [x] "El tablero de ventas muestra datos hasta el 27/10 porque no llegó el archivo del ERP. Estamos coordinando con ERP; próxima actualización 07:45."
- [ ] "Fue culpa del equipo de ERP, que no envió el archivo."
:::

:::ejercicio sql dificultad=Avanzado titulo="Verificar la reparación"
El equipo del ERP subió el archivo y reejecutaste la carga del 28/10, que ahora tiene 11.980 filas. Verifica con datos: devuelve `ds`, `filas`, `media_7d` (entero) y `estado`, que vale `OK` si las filas están entre el 70 % y el 130 % de la media de los 7 días anteriores y `REVISAR` si no. Solo para el `2026-10-28`.
```sql setup
CREATE TABLE cargas (ds TEXT PRIMARY KEY, filas INTEGER);
WITH RECURSIVE d(n) AS (SELECT 0 UNION ALL SELECT n + 1 FROM d WHERE n < 29)
INSERT INTO cargas
SELECT date('2026-09-29', '+' || n || ' days'),
  CASE WHEN date('2026-09-29', '+' || n || ' days') = '2026-10-28' THEN 11980
       WHEN date('2026-09-29', '+' || n || ' days') = '2026-10-14' THEN 5210
       WHEN strftime('%w', date('2026-09-29', '+' || n || ' days')) IN ('0', '6') THEN 8100 + (n * 53) % 400
       ELSE 12200 + (n * 97) % 600 END
FROM d;
```
```sql solucion
WITH m AS (
  SELECT ds, filas,
         AVG(filas) OVER (ORDER BY ds ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING) AS media_7d
  FROM cargas
)
SELECT ds, filas, ROUND(media_7d) AS media_7d,
       CASE WHEN filas BETWEEN 0.7 * media_7d AND 1.3 * media_7d THEN 'OK' ELSE 'REVISAR' END AS estado
FROM m
WHERE ds = '2026-10-28';
```
```pista
Reutiliza el CTE del ejercicio anterior y agrega un `CASE WHEN filas BETWEEN 0.7 * media_7d AND 1.3 * media_7d`.
```
:::

:::ejercicio quiz dificultad=Avanzado
Para el postmortem, ¿cuál es la **acción preventiva** más efectiva?

- [ ] Pedirle al equipo de ERP que no se atrase nunca más
- [ ] Agregar más reintentos al extractor
- [x] Quitar `allow_empty=True` y activar un check de volumen que haga fallar la carga si las filas caen por debajo del 70 % de la media
- [ ] Revisar el tablero a mano todas las mañanas
:::

:::errores
- **Reejecutar en bucle**: si el archivo no llegó, reejecutar 10 veces solo llena el log y puede duplicar datos en tareas que no son idempotentes.
- **Arreglar en silencio**: reparas, nadie se entera y el negocio decide con datos que estuvieron mal dos horas. Siempre avisa y cierra el incidente en el canal.
- **Confiar en el color de la tarea**: SUCCESS significa "el código no lanzó una excepción", no "los datos están bien".
- **Tocar producción sin anotar**: cada comando que corres durante el incidente va a la línea de tiempo. Sin eso, el postmortem es pura memoria.
- **Editar el test para que pase**: si un check de datos falla, el problema son los datos (o el check está mal diseñado, y eso se discute después, no a las 7 de la mañana).
:::

:::trabajo
- Las empresas tienen una **rotación de guardia** (on-call) semanal con una herramienta que llama al teléfono (PagerDuty, Opsgenie, incident.io) y un canal fijo de incidentes.
- Cada pipeline importante tiene un **runbook**: qué hace, de qué depende, qué hacer con cada alerta y a quién escalar. Si un runbook no existe, escribirlo es parte del postmortem.
- Se miden **MTTD** (tiempo medio hasta detectar), **MTTA** (hasta reconocer) y **MTTR** (hasta resolver). En datos, el MTTD suele ser el problema: los fallos silenciosos se descubren días después.
- Un buen postmortem es **sin culpables** (blameless): explica qué decisión del sistema permitió el error, no quién se equivocó.
:::

:::entrevista
**"Cuéntame de un incidente de datos que hayas resuelto."** Usa la estructura del ciclo: cómo se detectó, cuál fue el impacto, qué mitigaste primero, cómo encontraste la causa (con qué evidencia: un log, una consulta), cómo lo reparaste de forma segura y qué cambiaste para que no se repita. Los entrevistadores buscan **método** y **prevención**, no heroísmo.
:::

## Resumen

| Paso | Pregunta clave |
|---|---|
| Reconocer y avisar | ¿Saben todos que alguien lo está mirando? |
| Impacto | ¿Quién usa estos datos y desde cuándo están mal? |
| Mitigar | ¿Cómo freno el daño ahora, aunque no sepa la causa? |
| Diagnosticar | ¿Qué cambió, dónde se rompió, desde cuándo? |
| Reparar y verificar | ¿Es idempotente? ¿Los **datos** están bien? |
| Postmortem | ¿Qué cambio del sistema evita que se repita? |
