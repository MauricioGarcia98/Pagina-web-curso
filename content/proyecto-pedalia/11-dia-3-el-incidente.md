---
titulo: Día 3 - el formato cambia sin aviso y te toca la guardia
nivel: Avanzado
duracion: 60
resumen: Llegan los días 2 y 3. El primero pasa sin problemas; el segundo rompe el pipeline porque la app cambió el formato de las fechas sin avisar. Lo diagnosticas siguiendo los logs de herramienta en herramienta, lo arreglas con un pull request que pasa por CI, re-ejecutas el día, compruebas que todo cuadra con la revisión automática y escribes el postmortem. Cierra el proyecto con lo que vas a contar en una entrevista.
objetivos: Procesar días nuevos y comprobar que el resultado sigue siendo correcto | Diagnosticar una falla siguiendo el rastro de Airflow a Databricks | Corregir con un cambio revisado y re-ejecutar solo lo necesario | Escribir un postmortem sin culpas con acciones concretas | Presentar el proyecto en un portafolio o una entrevista
prerrequisitos: proyecto-pedalia-el-tablero-en-power-bi | incidentes-primera-guardia
autoevaluacion: ¿Sabes por qué fue bueno que el pipeline fallara en vez de seguir? | ¿Sabes qué cambió en el SQL para aceptar los dos formatos? | ¿Sabes re-ejecutar un solo día en Airflow? | ¿Sabes qué secciones tiene un postmortem?
---

:::escenario Martes y miércoles, 7:00
El martes todo corre en verde. El miércoles a las 7:12 te llega la alerta: **pedalia_diario falló**. A las 9:00 Lucía va a abrir el tablero de ingresos. Tienes poco menos de dos horas.
:::

:::analogia El detective que sigue las huellas
Un buen detective no adivina: sigue las huellas en orden. Airflow te dice **en qué tarea** se rompió. Esa tarea te da un identificador que te lleva a la herramienta que hizo el trabajo. Ahí está el **por qué**. Y el por qué, casi siempre, está en los datos que llegaron.
:::

## 1. El día 2: todo en verde

```bash
pedalia exportar --dia 2
az storage blob upload-batch --account-name stpedaliadev -d landing/pedalia/2026-11-10 -s ~/pedalia/entrega/2026-11-10
airflow dags test pedalia_diario 2026-11-10
```

Todas las tareas en verde. Revisa en Databricks que haya dos fechas en `pedalia.silver.viajes` y que el día 10 tenga menos viajes que el 9. ¿Por qué? Llovió el martes: es un dato real del negocio, no un error. Confírmalo con operaciones antes de "arreglar" algo que no está roto.

## 2. El día 3: la alerta

```bash
pedalia exportar --dia 3
az storage blob upload-batch --account-name stpedaliadev -d landing/pedalia/2026-11-11 -s ~/pedalia/entrega/2026-11-11
airflow dags test pedalia_diario 2026-11-11
```

`ingesta_adf` en verde. `transformar_databricks` en **rojo**. Las cargas de Snowflake y BigQuery, **upstream_failed**.

### Seguir las huellas

1. **Airflow**: el log de `transformar_databricks` dice que el job terminó con `result_state: FAILED` y trae el enlace a la corrida.
2. **Databricks → Jobs & Pipelines → pedalia_transformar → la corrida**: falló la tarea `bronze_y_silver` con:

```text
[CANNOT_PARSE_TIMESTAMP] Text '11/11/2026 12:49' could not be parsed with the pattern 'yyyy-MM-dd HH:mm:ss'.
```

3. **Los datos**: confírmalo en la terminal.

```bash
head -3 ~/pedalia/entrega/2026-11-11/viajes_2026-11-11.csv
```

La app ahora manda `DD/MM/AAAA HH:MM`. Nadie avisó: el LEEME es el mismo.

:::nota Fallar fue lo correcto
Si en silver hubieras usado `try_to_timestamp` "para que no falle", hoy el job estaría en verde y **todos los viajes del día 3 habrían desaparecido** (fecha NULL → filtrados). Lucía vería ingresos de cero para el miércoles y pensaría que el sistema de cobro se cayó. Un pipeline que falla con un mensaje claro es mucho mejor que uno que publica números equivocados en silencio.
:::

## 3. Comunicar antes de arreglar

Antes de tocar código, un mensaje corto al canal del equipo:

```text
🔴 pedalia_diario (11/11) falló en la transformación. Causa: la app cambió el formato de fecha de los viajes
sin aviso (ahora DD/MM/AAAA). Los números de ayer siguen publicados y son correctos; los de hoy todavía no están.
Estimo tenerlo resuelto antes de las 9:00. Aviso cuando esté.
```

Y otro al equipo de la app: "Desde hoy las fechas llegan como DD/MM/AAAA HH:MM, sin segundos. ¿Fue intencional? ¿Van a quedar así?". El arreglo no puede esperar la respuesta, pero la pregunta va igual: puede haber más cambios.

## 4. El arreglo, con un pull request

El contrato cambia: aceptar los dos formatos. El SQL de silver también:

```sql norun
coalesce(try_to_timestamp(inicio, 'yyyy-MM-dd HH:mm:ss'), try_to_timestamp(inicio, 'dd/MM/yyyy HH:mm')) AS inicio,
coalesce(try_to_timestamp(fin,    'yyyy-MM-dd HH:mm:ss'), try_to_timestamp(fin,    'dd/MM/yyyy HH:mm')) AS fin,
```

¿Y si mañana llega un tercer formato? Con `coalesce` de dos `try_to_timestamp`, una fecha con otro formato quedaría NULL y el viaje se perdería en silencio, justo lo que acabamos de evitar. Agrega una **alarma**: si alguna fecha no se pudo leer, el job falla.

```sql norun
-- al final de la tarea bronze_y_silver
SELECT CASE WHEN COUNT(*) > 0 THEN raise_error(CONCAT(COUNT(*), ' viajes con una fecha que no tiene formato conocido'))
            ELSE 'fechas OK' END AS control
FROM pedalia.bronze.viajes
WHERE inicio IS NOT NULL
  AND coalesce(try_to_timestamp(inicio, 'yyyy-MM-dd HH:mm:ss'), try_to_timestamp(inicio, 'dd/MM/yyyy HH:mm')) IS NULL;
```

En el repositorio:

```bash
cd ~/pedalia-datos
git checkout main && git pull
git checkout -b fix/formato-fecha-app
nano sql/databricks/silver_viajes.sql     # los dos formatos + la alarma
nano docs/contrato.md                     # "inicio, fin: AAAA-MM-DD HH:MM:SS o DD/MM/AAAA HH:MM (desde el 11/11)"
git commit -am "Silver acepta el formato de fecha nuevo de la app (DD/MM/AAAA) y falla ante uno desconocido"
git push -u origin fix/formato-fecha-app
```

Abre el PR con una descripción que alguien pueda entender en seis meses: qué pasó, qué cambia, cómo lo probaste. Con el check en verde y la aprobación, fusiona. Después actualiza el SQL de la tarea `bronze_y_silver` en el job de Databricks.

:::nota En producción
El job se desplegaría también desde el CI, con **Databricks Asset Bundles** (`databricks bundle deploy`), igual que el DAG. Así lo que corre en Databricks es siempre lo que está en `main`, sin copiar y pegar SQL en la interfaz.
:::

## 5. Re-ejecutar solo lo que falló

En [Airflow](#/airflow), la corrida del 11/11 → la tarea `transformar_databricks` → **Clear** (con *downstream*). Airflow vuelve a ejecutar la transformación y, si sale bien, las dos cargas. La ingesta no se repite: ya estaba bien.

O desde la terminal:

```bash
airflow dags test pedalia_diario 2026-11-11
```

Todo en verde. Avisa en el canal: "✅ Resuelto. Los datos del 11/11 ya están en Snowflake, BigQuery y el tablero".

## 6. ¿Cuadra todo?

El panel de abajo lee el estado real de cada herramienta y lo compara con **lo que tiene que dar tu entrega** según el contrato (con tus datos, que son solo tuyos). No modifica nada: úsalo tantas veces como quieras.

<div data-pedalia="revisar"></div>

Si algo no cuadra, el panel dice qué y dónde. Las causas más comunes: un día que no se subió a landing, el pipeline sin publicar, una carga duplicada en Snowflake o la tabla de BigQuery cargada con `INTO` en vez de `OVERWRITE`.

## 7. El postmortem

Un incidente no termina cuando vuelve el verde: termina cuando se escribió qué aprendió el equipo. Sin culpas: el objetivo es que no se repita, no encontrar a quién señalar.

```markdown
# Postmortem · pedalia_diario 11/11/2026

## Resumen
La transformación falló porque la app cambió el formato de fecha de los viajes sin aviso.
Los datos del 11/11 se publicaron a las 8:40, con 1 h 28 min de demora. No se publicaron datos incorrectos.

## Cronología
- 07:12 Falla transformar_databricks (CANNOT_PARSE_TIMESTAMP). Alerta a la guardia.
- 07:20 Diagnóstico: formato DD/MM/AAAA en el archivo del día. Aviso al canal y al equipo de la app.
- 08:05 PR con el arreglo y la alarma de formatos desconocidos; CI en verde, aprobado.
- 08:40 Re-ejecución con Clear. Cargas y tablero actualizados.

## Qué salió bien
- El formato explícito hizo fallar el pipeline en vez de perder los viajes en silencio.
- Las cargas no corrieron: no se publicaron números a medias.

## Qué salió mal
- El cambio en la fuente no estaba en ningún acuerdo: el contrato no decía que los cambios de formato se avisan.

## Acciones
1. Contrato v2: la app avisa los cambios de formato con 48 h de anticipación (responsable: equipo de datos, con el equipo de la app). Fecha: 15/11.
2. Control de formato al inicio de la ingesta, antes de Databricks (responsable: equipo de datos). Fecha: 18/11.
3. Alerta automática al canal cuando falla pedalia_diario (responsable: equipo de datos). Fecha: 13/11.
```

Súbelo a `docs/postmortems/2026-11-11-formato-fecha.md` con un PR.

## 8. Contarlo

Este proyecto es una historia de entrevista completa. Así se cuenta en dos minutos:

> "Armé el pipeline de datos de una red de bicicletas compartidas: archivos diarios de la app, un lago en Azure con capas, ingesta con Data Factory, limpieza en Databricks con un contrato de datos explícito, cargas idempotentes a Snowflake y BigQuery para dos áreas, y un tablero en Power BI. Todo orquestado con Airflow y desplegado con GitHub Actions. Al tercer día la app cambió el formato de las fechas sin avisar; el pipeline falló en vez de perder datos, lo arreglé con un PR, re-ejecuté solo ese día y escribí el postmortem. Si lo volviera a hacer, procesaría de forma incremental con MERGE y usaría identidades en vez del token SAS."

Para tu portafolio: el repositorio `pedalia-datos` con el README (arquitectura, cómo correrlo, decisiones y lo que mejorarías), el contrato, el DAG, el SQL, el postmortem y una captura del tablero.

:::errores
- **"Arreglar" con `try_to_timestamp` solo**, sin alarma: el próximo formato raro vuelve a perder viajes en silencio.
- **Editar el SQL directo en la interfaz de Databricks y olvidar el repositorio**: la próxima vez que alguien despliegue desde `main`, vuelve el error.
- **Re-ejecutar el DAG completo** cuando solo falló la transformación: repites la ingesta sin necesidad (y en algunos sistemas, eso duplica datos).
- **Postmortem con culpables** ("el equipo de la app la rompió"): la gente deja de contar lo que pasa. Se analizan sistemas y acuerdos, no personas.
- **No avisar mientras se arregla**: dos horas de silencio con un tablero viejo generan más daño que el incidente.
:::

:::real En tu computadora y en la web real
En la vida real, la alerta llega por **correo, Slack/Teams o PagerDuty** (lo que configuraste en el job o en Airflow). El orden es el mismo de la lección:

1. Avisas en el canal del equipo **antes** de arreglar: qué falla, a quién afecta y cuándo vuelves a escribir.
2. Arreglas en una rama, con un pull request que alguien revisa.
3. Re-ejecutas solo la tarea que falló (*Clear* sobre la tarea en Airflow, o *Repair run* en el job de Databricks).
4. El postmortem va en el repositorio o en la wiki del equipo, sin buscar culpables.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio del proyecto y úsalas en el README.

- `11-alerta.png`: la tarea en rojo y el error en el log.
- `11-pr-arreglo.png`: el pull request del arreglo.
- `11-postmortem.png`: el postmortem en Markdown en github.com.

Antes de publicar, tapa con un rectángulo los correos, los IDs de suscripción y de tenant, los nombres de cuentas reales y cualquier clave o token.
:::

## Ejercicios

:::ejercicio quiz
¿Por qué fue bueno que la transformación **fallara** el día 3?
- [ ] Porque así Databricks no consume créditos
- [x] Porque con una conversión tolerante los viajes del día habrían quedado con fecha NULL y desaparecido en silencio de los ingresos
- [ ] Porque Airflow reintenta solo y lo arregla
- [ ] Porque el formato nuevo es incorrecto y hay que rechazar ese archivo para siempre
:::

:::ejercicio quiz
Arreglaste la tarea de Databricks. ¿Qué es lo más eficiente en Airflow?
- [ ] Borrar el DAG y crearlo de nuevo
- [ ] Ejecutar el DAG completo desde la ingesta
- [x] Clear sobre `transformar_databricks` con sus tareas posteriores: se retoma desde ahí y la ingesta, que salió bien, no se repite
- [ ] Esperar a mañana, que el DAG corre solo
:::

:::ejercicio quiz
¿Cuál es una buena acción de un postmortem?
- [ ] "Tener más cuidado la próxima vez"
- [ ] "Que el equipo de la app no vuelva a cambiar nada"
- [x] "Control de formato al inicio de la ingesta, responsable: equipo de datos, fecha: 18/11"
- [ ] "Revisar todo el pipeline"
:::

:::ejercicio abierto
Escribe el mensaje que le mandarías al equipo de la app después del incidente, para proponer el cambio en el contrato. Debe ser corto, sin culpas y con un pedido concreto.
```text solucion
Hola equipo, el 11/11 la exportación de viajes empezó a usar fechas DD/MM/AAAA HH:MM (antes AAAA-MM-DD HH:MM:SS). Nuestro pipeline lo detectó y ya acepta los dos formatos, así que no hace falta revertir nada.

Para que no nos sorprenda la próxima vez, ¿podemos sumar al contrato de datos que los cambios de columnas o formatos se avisan con 48 h de anticipación en #datos-pedalia? Les dejo el PR con la propuesta: <enlace>. Si les sirve, armamos una prueba automática que corra en su CI con un archivo de ejemplo.
```
:::

## Resumen

- Un pipeline que **falla con un mensaje claro** es mejor que uno que publica datos equivocados.
- Se diagnostica **siguiendo el rastro**: Airflow (qué) → la herramienta que trabajó (por qué) → los datos.
- Se **comunica** antes y después; se arregla con un **PR** (código y contrato), se re-ejecuta **solo lo necesario**.
- El **postmortem** sin culpas, con acciones concretas, responsable y fecha, es lo que evita que se repita.
