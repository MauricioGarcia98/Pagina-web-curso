---
titulo: Construirlo paso a paso - una guía, no una solución
nivel: Avanzado
duracion: 240
resumen: Construyes el proyecto de cero con los archivos reales de la red, a volumen de empresa (unas 24.000 personas y cerca de 5.000 resultados por día entre los cinco laboratorios). Cada paso dice qué tienes que lograr, qué trampas esconden los archivos, cómo comprobarlo tú y pistas graduales. La solución de referencia de cada paso se desbloquea recién cuando tu entrega pasa la revisión.
objetivos: Conectarte a un SFTP con clave pública y bajar archivos en lote | Traducir cinco formatos a un esquema canónico, una vista por fuente | Seudonimizar de forma consistente entre fuentes con una sal guardada aparte | Encontrar con consultas las trampas que a este volumen no se ven a ojo | Aplicar el derecho al olvido sin que el paciente vuelva en la próxima carga
prerrequisitos: proyecto-red-analitica-el-dia-a-dia
autoevaluacion: ¿Sabes por qué cada laboratorio tiene su propia vista? | ¿Sabes por qué el documento se normaliza antes del hash? | ¿Sabes cómo detectar con una consulta las filas repetidas de Cerro? | ¿Sabes qué hace que un paciente olvidado no reaparezca al recargar?
---

:::trabajo Cómo se usa esta guía
Nada de esto viene hecho: la clave SSH, las descargas, el lago, las vistas, las tablas y el job los creas tú. Solo te damos los archivos que mandan los laboratorios (en el SFTP) y su documentación. Cada paso tiene cuatro partes:

1. **Qué tienes que lograr**: el resultado concreto (un archivo, una tabla, un número).
2. **Lo que esconden los datos**: las trampas que traen los archivos y que tu código tiene que resolver.
3. **Compruébalo tú**: cómo saber, antes de pedir revisión, si vas bien.
4. **Pistas**: ábrelas de a una solo si te trabas. La primera es conceptual, la segunda nombra la herramienta y la última te da la estructura.

Al final de cada paso hay una **solución de referencia** bloqueada 🔒. Se abre cuando tu entrega pasa la misma revisión que hace el líder técnico en Jira (el panel **Revisar mi entrega** de [El día a día](#/l/proyecto-red-analitica-el-dia-a-dia)). Compárala con la tuya como en un code review: no hay una sola forma correcta.
:::

## Antes de empezar: el volumen

| Fuente | Volumen aproximado | Qué implica |
|---|---|---|
| Pacientes | ~24.000 personas, muchas atendidas en más de un laboratorio | El mismo documento llega escrito de tres o cuatro formas: unirlos es tu trabajo |
| Un laboratorio, un día hábil | ~400 muestras, ~1.000 resultados, un archivo de 100 a 180 KB | Los fines de semana, menos de la mitad |
| La red completa | ~5.000 resultados por día; ~30.000 con los 7 días que guarda el SFTP | No se revisa a ojo: cada trampa se busca con una consulta |

Crea el repositorio `red-analitica` (en el [GitHub de práctica](#/github)) con esta estructura y trabaja con una rama por paso:

```text
red-analitica/
├── README.md               ← qué resuelve, cómo correrlo, decisiones
├── docs/
│   ├── privacidad.md       ← qué no puede salir del lago y cómo se seudonimiza
│   └── laboratorios.md     ← paso 2: lo que descubriste de cada formato
├── ingesta/
│   ├── bajar.sftp          ← paso 2: el lote de sftp
│   └── subir.sh            ← paso 3: al lago
└── sql/
    ├── 01_vistas.sql       ← paso 4
    ├── 02_silver.sql       ← paso 5
    ├── 03_gold.sql         ← paso 6
    └── 04_olvido.sql       ← paso 7
```

## Paso 1 · El acceso al SFTP

**Qué tienes que lograr.** Conectarte a `sftp.redanalitica.example` con **tu** clave SSH, sin contraseña, y con la huella del servidor verificada en `~/.ssh/known_hosts`.

**Lo que esconde.** El servidor no acepta contraseñas: IT tiene que dar de alta tu clave **pública** y tarda unos minutos. La primera conexión pregunta si confías en el servidor; en modo lote nadie contesta y falla. El correo de IT (`red accesos`) trae la huella con la que tienes que comparar.

**Compruébalo tú.** `red estado` dice *autorizada* y un `ls /entrantes` por `sftp` lista las cinco carpetas sin pedirte nada.

<details><summary>Pista 1</summary>

Una clave SSH son dos archivos: la privada se queda contigo (y después en el Key Vault), la pública es la que se manda. Mientras IT la autoriza, aprovecha para leer la documentación de cada laboratorio.
</details>

<details><summary>Pista 2</summary>

`ssh-keygen -t ed25519 -f …`, `red alta-clave <la .pub>`, y `ssh-keyscan -p 2222 <host>` para guardar la huella. Compárala con la del correo antes de confiar.
</details>

:::solucion RA:Acceso | el acceso
```bash
red accesos
ssh-keygen -t ed25519 -f ~/.ssh/red_analitica -C equipo
red alta-clave ~/.ssh/red_analitica.pub     # la pública, nunca la privada
red estado
ssh-keyscan -p 2222 sftp.redanalitica.example >> ~/.ssh/known_hosts
```

`ssh-keyscan` guarda la huella del servidor en `known_hosts`. Sin eso, el modo por lotes (`-b`) falla: no hay nadie para contestar "¿confías en este servidor?". En un trabajo real, la huella se verifica con el proveedor antes de aceptarla.
:::

## Paso 2 · Bajar los archivos y mirarlos de verdad

**Qué tienes que lograr.** Todos los archivos del servidor en tu máquina, una carpeta por laboratorio, bajados con un **lote** de `sftp` que puedas volver a correr mañana. Y `docs/laboratorios.md` con lo que descubriste de cada formato.

**Lo que esconden los datos.** La documentación de [Fuentes y accesos](#/l/proyecto-red-analitica-fuentes-y-accesos) dice cómo *deberían* ser los archivos; los archivos dicen cómo *son*. Hay un laboratorio con otra codificación, uno con filas de título y un total al final, uno con fechas que no son fechas, uno en otra zona horaria que repite filas, y uno que reenvía archivos corregidos con otro nombre.

**Compruébalo tú.** Para cada laboratorio puedes contestar: separador, codificación, cómo viene la fecha, cómo viene el documento, qué código usa para cada estudio y en qué unidad. Y sabes cuántos archivos debería haber (5 por día) contra cuántos hay.

<details><summary>Pista 1</summary>

No abras un archivo de 1.000 líneas entero: mira la cabeza, la cola y una muestra. La cola importa (¿hay algo que no es un resultado al final?).
</details>

<details><summary>Pista 2</summary>

`sftp -b <lote>` con `lcd` y `mget` por carpeta. Después: `file` (codificación), `head`, `tail`, `wc -l`, `cut -f` y `sort | uniq -c | sort -rn | head` para ver qué valores toma una columna.
</details>

<details><summary>Pista 3</summary>

Una forma de encontrar filas repetidas en un archivo sin mirar: `sort archivo | uniq -d | wc -l`. Y para ver qué laboratorio entregó qué día, `ls -l` dentro de `sftp` (la hora es la de llegada al servidor).
</details>

:::solucion RA:SFTP | bajar y mirar
```bash
printf 'cd /entrantes\nls -l norte\nls -l cerro\n' > ~/ver.txt
sftp -b ~/ver.txt -i ~/.ssh/red_analitica -P 2222 equipo_datos@sftp.redanalitica.example

mkdir -p ~/red/norte ~/red/centro ~/red/sur ~/red/costa ~/red/cerro
printf 'lcd ~/red/norte\nmget /entrantes/norte/*\nlcd ~/red/centro\nmget /entrantes/centro/*\nlcd ~/red/sur\nmget /entrantes/sur/*\nlcd ~/red/costa\nmget /entrantes/costa/*\nlcd ~/red/cerro\nmget /entrantes/cerro/*\n' > ~/bajar.txt
sftp -b ~/bajar.txt -i ~/.ssh/red_analitica -P 2222 equipo_datos@sftp.redanalitica.example

file ~/red/centro/* | head -3      # ISO-8859 text: no es UTF-8
head -5 ~/red/costa/"$(ls ~/red/costa | head -1)"    # comillas: el nombre tiene espacios
```

| Laboratorio | Formato | Trampas |
|---|---|---|
| Norte | CSV con coma | El documento con puntos |
| Centro | CSV con `;` en Latin-1 | Códigos de prestación numéricos, coma decimal; cambia el formato de fecha al migrar de sistema |
| Sur | JSON por líneas, en inglés | Unidades internacionales (mmol/L, g/L, µmol/L); reenvía archivos corregidos con `_v2` |
| Costa | Exportación de Excel | Tres filas de título, fila de "Total", fechas como número de serie de Excel |
| Cerro | TSV | Fechas en UTC, filas duplicadas, a veces falta un día |
:::

## Paso 3 · Al lago, y los secretos al Key Vault

**Qué tienes que lograr.** Los archivos en un contenedor del lago (`landing/red/<laboratorio>/`) al que Databricks pueda leer, y la **clave privada SSH** y la **sal** del seudónimo como secretos del mismo Key Vault.

**Lo que esconde.** Databricks lee el lago con la identidad administrada de Unity Catalog: si no le das el rol de lectura sobre la cuenta, tus vistas fallan con un error de permisos que parece de otra cosa. Y la sal no se inventa en el notebook: si se pierde, todos los seudónimos cambian y se pierde la historia de cada paciente.

**Compruébalo tú.** `az storage blob list` muestra los archivos de los cinco laboratorios y `az keyvault secret list` muestra los dos secretos (sin mostrar su valor).

<details><summary>Pista 1</summary>

Una cuenta de almacenamiento con espacio de nombres jerárquico (es un lago, no un blob suelto), un contenedor y una carga **por lote**, no archivo por archivo.
</details>

<details><summary>Pista 2</summary>

`az storage account create … --hns true`, `az role assignment create --assignee unity-catalog-access-connector`, `az storage blob upload-batch`, `az keyvault create` y `az keyvault secret set --value "$(cat …)"`.
</details>

:::solucion RA:Seguridad | el lago y el Key Vault
```bash
az login
az group create -n rg-red -l eastus2
az storage account create -n stred -g rg-red -l eastus2 --sku Standard_LRS --hns true
az storage container create --account-name stred -n landing
ID=$(az storage account show -n stred -g rg-red --query id -o tsv)
az role assignment create --assignee unity-catalog-access-connector --role "Storage Blob Data Contributor" --scope $ID
az storage blob upload-batch --account-name stred -d landing/red -s ~/red
az keyvault create -n kv-red -g rg-red -l eastus2
az keyvault secret set --vault-name kv-red -n sftp-clave --value "$(cat ~/.ssh/red_analitica)" -o none
az keyvault secret set --vault-name kv-red -n seudonimo-sal --value "s4l-r3d-2026" -o none
```
:::

## Paso 4 · Una vista por laboratorio

**Qué tienes que lograr.** Cinco vistas (una por laboratorio) que devuelvan **el mismo esquema**: `laboratorio, id_muestra, estudio, resultado, fecha_toma, doc`, con el estudio en código canónico (GLU, HB, COL, CRE, TSH), el resultado en la unidad canónica y la fecha de toma en hora de Ciudad del Río.

**Lo que esconden los datos.** Todo lo que anotaste en el paso 2, más dos cosas que solo aparecen con el tiempo: Centro **migra de sistema** a mitad del proyecto (cambia la codificación, el formato de fecha y aparece una columna en el medio) y Sur **reenvía** un archivo corregido que tiene que reemplazar al original.

**Compruébalo tú.** Para cada vista, a este volumen, con consultas:

- `count(*)` por `fecha_toma`: ¿cuadra con las líneas de los archivos de ese día (menos títulos, totales y repetidos)?
- `min`, `max` y `avg(resultado)` por estudio: la glucosa media ronda 95 mg/dL en **todos** los laboratorios. Si uno da 5, no convertiste unidades.
- Ningún `estudio` ni `fecha_toma` en `NULL`, y ninguna fecha en 1899 o en el día equivocado.
- `count(*)` contra `count(DISTINCT id_muestra, estudio)`: si difieren, hay repetidos.

<details><summary>Pista 1</summary>

Si mañana Costa cambia la cantidad de filas de título, quieres tocar **una** vista, no todo el pipeline. Por eso cada laboratorio traduce lo suyo y recién después se unen.
</details>

<details><summary>Pista 2</summary>

`read_files` con las opciones de cada formato: `sep`, `header`, `encoding`, `skipRows`, `format => 'json'`. Para la fecha de Excel, `date_add('1899-12-30', …)`; para UTC, restar 3 horas antes de quedarte con el día. `_metadata.file_name` te dice de qué archivo vino cada fila.
</details>

<details><summary>Pista 3</summary>

El reenvío del Sur: numera las filas por muestra y estudio ordenando por nombre de archivo (`ROW_NUMBER() OVER (PARTITION BY … ORDER BY archivo DESC)`) y quédate con la primera. Las filas repetidas de Cerro son idénticas: alcanza con quitarlas.
</details>

:::solucion RA:Datos | las vistas por laboratorio
Cada vista traduce **su** formato al mismo esquema. Si un laboratorio cambia, se toca una sola vista.

```sql norun
CREATE EXTERNAL LOCATION lago_red URL 'abfss://landing@stred.dfs.core.windows.net/' WITH (STORAGE CREDENTIAL credencial_lago);
CREATE CATALOG IF NOT EXISTS red; CREATE SCHEMA IF NOT EXISTS red.silver; CREATE SCHEMA IF NOT EXISTS red.gold;

CREATE OR REPLACE TEMP VIEW v_norte AS
SELECT 'norte' AS laboratorio, muestra_id AS id_muestra, codigo AS estudio, CAST(resultado AS DOUBLE) AS resultado,
       substr(fecha_toma, 1, 10) AS fecha_toma, regexp_replace(CAST(documento AS STRING), '[^0-9]', '') AS doc
FROM read_files('abfss://landing@stred.dfs.core.windows.net/red/norte/', format => 'csv', header => true, inferSchema => false);

-- Centro: ; y Latin-1; antes de migrar la fecha venía como DD/MM/AAAA
CREATE OR REPLACE TEMP VIEW v_centro AS
SELECT 'centro' AS laboratorio, `Nro Muestra` AS id_muestra,
       CASE `Cod. Prestacion` WHEN '1001' THEN 'GLU' WHEN '1002' THEN 'HB' WHEN '1003' THEN 'COL' WHEN '1004' THEN 'CRE' WHEN '1005' THEN 'TSH' END AS estudio,
       CAST(replace(Resultado, ',', '.') AS DOUBLE) AS resultado,
       CASE WHEN Fecha LIKE '__/__/____%' THEN concat(substr(Fecha, 7, 4), '-', substr(Fecha, 4, 2), '-', substr(Fecha, 1, 2)) ELSE substr(Fecha, 1, 10) END AS fecha_toma,
       regexp_replace(CAST(Documento AS STRING), '[^0-9]', '') AS doc
FROM read_files('abfss://landing@stred.dfs.core.windows.net/red/centro/', format => 'csv', sep => ';', header => true, inferSchema => false, encoding => 'ISO-8859-1');
```

Sur reenvía archivos corregidos: se guarda el nombre del archivo y, por muestra y estudio, gana el último (`_v2` ordena después que el original). Y se convierten las unidades:

```sql norun
CREATE OR REPLACE TEMP VIEW v_sur_todo AS
SELECT sample, test, CAST(value AS DOUBLE) AS v, taken_at, CAST(patient:doc AS STRING) AS doc, _metadata.file_name AS archivo
FROM read_files('abfss://landing@stred.dfs.core.windows.net/red/sur/', format => 'json');

CREATE OR REPLACE TEMP VIEW v_sur AS
SELECT 'sur' AS laboratorio, sample AS id_muestra,
       CASE test WHEN 'glucose' THEN 'GLU' WHEN 'hemoglobin' THEN 'HB' WHEN 'cholesterol' THEN 'COL' WHEN 'creatinine' THEN 'CRE' WHEN 'tsh' THEN 'TSH' END AS estudio,
       CASE test WHEN 'glucose' THEN v * 18.016        -- mmol/L → mg/dL
                 WHEN 'hemoglobin' THEN v / 10          -- g/L → g/dL
                 WHEN 'cholesterol' THEN v * 38.67      -- mmol/L → mg/dL
                 WHEN 'creatinine' THEN v / 88.4        -- µmol/L → mg/dL
                 ELSE v END AS resultado,
       substr(taken_at, 1, 10) AS fecha_toma, doc
FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY sample, test ORDER BY archivo DESC) AS rn FROM v_sur_todo) x
WHERE rn = 1;
```

Costa (Excel): se saltean las 3 filas de título, se descarta la fila de total y la fecha es un número de días desde el 30/12/1899. Cerro: TSV, UTC (se restan 3 horas antes de tomar el día) y `DISTINCT` para las filas repetidas.

```sql norun
CREATE OR REPLACE TEMP VIEW v_costa AS
SELECT 'costa' AS laboratorio, Muestra AS id_muestra,
       CASE Estudio WHEN 'Glucosa en ayunas' THEN 'GLU' WHEN 'Hemoglobina' THEN 'HB' WHEN 'Colesterol total' THEN 'COL' WHEN 'Creatinina' THEN 'CRE' WHEN 'TSH' THEN 'TSH' END AS estudio,
       CAST(Valor AS DOUBLE) AS resultado,
       CAST(date_add('1899-12-30', CAST(floor(CAST(`Fecha toma` AS DOUBLE)) AS INT)) AS STRING) AS fecha_toma,
       regexp_replace(CI, '[^0-9]', '') AS doc
FROM read_files('abfss://landing@stred.dfs.core.windows.net/red/costa/', format => 'csv', header => true, skipRows => 3, inferSchema => false)
WHERE Muestra NOT LIKE 'Total%';

CREATE OR REPLACE TEMP VIEW v_cerro AS
SELECT DISTINCT 'cerro' AS laboratorio, ID AS id_muestra,
       CASE COD WHEN 'GLUC' THEN 'GLU' WHEN 'HGB' THEN 'HB' WHEN 'CHOL' THEN 'COL' WHEN 'CREA' THEN 'CRE' WHEN 'TSH' THEN 'TSH' END AS estudio,
       CAST(VALOR AS DOUBLE) AS resultado,
       substr(CAST(from_unixtime(unix_timestamp(FECHA_UTC) - 10800) AS STRING), 1, 10) AS fecha_toma,
       CAST(DOC AS STRING) AS doc
FROM read_files('abfss://landing@stred.dfs.core.windows.net/red/cerro/', format => 'csv', sep => '\t', header => true, inferSchema => false);
```
:::

## Paso 5 · Silver unificada y seudonimizada

**Qué tienes que lograr.** `red.silver.resultados`: las cinco vistas unidas, con `laboratorio, id_muestra, estudio, resultado, unidad, fecha_toma, paciente_id`. **Sin** nombres, documentos ni fechas de nacimiento. El mismo paciente tiene el mismo `paciente_id` en los cinco laboratorios.

**Lo que esconden los datos.** Norte escribe `41.234.567`, Costa `CI 41234567`, Cerro `41234567`: si calculas el seudónimo sobre el texto tal cual, una persona queda partida en tres. Y un hash sin sal se revierte: los documentos son pocos y predecibles, cualquiera puede calcular el hash de todos.

**Compruébalo tú.**

- Ninguna columna contiene algo con forma de documento o de nombre.
- Elige un paciente que aparezca en dos laboratorios (en los archivos crudos) y busca su `paciente_id`: tiene que ser uno solo.
- `count(DISTINCT paciente_id)` ronda la cantidad de personas atendidas en esos días, no el triple.

<details><summary>Pista 1</summary>

Primero normalizar, después calcular el seudónimo. Normalizar un documento es quedarse solo con los dígitos.
</details>

<details><summary>Pista 2</summary>

`sha2(concat(<sal>, <documento normalizado>), 256)`. La sal sale del Key Vault (`secret('kv-red', 'seudonimo-sal')` o un parámetro del job), no del código.
</details>

<details><summary>Pista 3</summary>

Piensa ya en el paso 7: si silver se reconstruye desde los archivos cada mañana, ¿cómo evitas que vuelva alguien que pidió ser borrado? Deja preparada una tabla para eso y fíltrala al construir silver.
</details>

:::solucion RA:Datos+Privacidad | silver seudonimizada
El seudónimo es `sha2(sal + documento normalizado)`: el mismo documento da el mismo `paciente_id` en los cinco laboratorios, y sin la sal no se puede revertir probando documentos. El documento **no** llega a la tabla.

```sql norun
CREATE TABLE IF NOT EXISTS red.silver.olvidos (paciente_id STRING, pedido DATE);

CREATE OR REPLACE TABLE red.silver.resultados AS
SELECT laboratorio, id_muestra, estudio, round(resultado, 2) AS resultado,
       CASE estudio WHEN 'HB' THEN 'g/dL' WHEN 'TSH' THEN 'mUI/L' ELSE 'mg/dL' END AS unidad,
       fecha_toma, sha2(concat('s4l-r3d-2026', doc), 256) AS paciente_id
FROM (SELECT * FROM v_norte UNION ALL SELECT * FROM v_centro UNION ALL SELECT * FROM v_sur
      UNION ALL SELECT * FROM v_costa UNION ALL SELECT * FROM v_cerro) t
WHERE sha2(concat('s4l-r3d-2026', doc), 256) NOT IN (SELECT paciente_id FROM red.silver.olvidos);
```

La sal aparece escrita para que se entienda. En el notebook de verdad se lee del Key Vault (`secret('kv-red', 'seudonimo-sal')` o un parámetro del job), igual que la clave SSH.
:::

## Paso 6 · Gold y las preguntas del negocio

**Qué tienes que lograr.** `red.gold.resultados_diarios` con `fecha_toma, laboratorio, estudio, resultados, fuera_de_rango`, usando los **rangos canónicos** de la documentación (no los de cada laboratorio). Con eso, contesta las preguntas de los tickets RA-104, RA-109 y RA-112 en Jira.

**Lo que esconden los datos.** "¿Cuántos pacientes?" no es "¿cuántos análisis?": una persona que se hizo dos glucosas, o fue a dos laboratorios, cuenta una vez. Y la pregunta de quién entrega más tarde **no** sale de las tablas: sale de la hora en que cada archivo apareció en el servidor.

**Compruébalo tú.** La suma de `resultados` de gold es igual a `count(*)` de silver. Para un día y laboratorio, el porcentaje fuera de rango es razonable (no 0 % ni 90 %: si da eso, el rango está al revés o en otra unidad).

<details><summary>Pista 1</summary>

Gold es un `GROUP BY` sobre silver. Lo difícil es escribir "fuera de rango" una sola vez y bien, para los cinco estudios.
</details>

<details><summary>Pista 2</summary>

Un `CASE` con los cinco rangos dentro de un `sum(…)`. Para pacientes, `count(DISTINCT paciente_id)`. Para las llegadas, `ls -l` dentro de `sftp`.
</details>

:::solucion RA:Gold | gold y las preguntas
```sql norun
CREATE OR REPLACE TABLE red.gold.resultados_diarios AS
SELECT fecha_toma, laboratorio, estudio, count(*) AS resultados,
       sum(CASE WHEN (estudio = 'GLU' AND (resultado < 70 OR resultado > 100))
                  OR (estudio = 'HB' AND (resultado < 12 OR resultado > 17.5))
                  OR (estudio = 'COL' AND resultado > 200)
                  OR (estudio = 'CRE' AND (resultado < 0.6 OR resultado > 1.3))
                  OR (estudio = 'TSH' AND (resultado < 0.4 OR resultado > 4.0)) THEN 1 ELSE 0 END) AS fuera_de_rango
FROM red.silver.resultados GROUP BY fecha_toma, laboratorio, estudio;

-- pacientes distintos con glucosa ≥ 126 en tres días
SELECT count(DISTINCT paciente_id) FROM red.silver.resultados
WHERE estudio = 'GLU' AND resultado >= 126 AND fecha_toma BETWEEN '2026-11-16' AND '2026-11-18';
```

La pregunta de quién entrega más tarde no sale de las tablas: sale del `ls -l` del SFTP (la hora de cada archivo). Y el archivo que falta de Cerro se descubre comparando los días que hay contra los que debería haber.
:::

## Paso 7 · El derecho al olvido

**Qué tienes que lograr.** Cuando llegue el ticket RA-108, la persona que pidió el borrado no aparece en silver ni en gold, y **no vuelve** cuando silver se reconstruye mañana desde los archivos.

**Lo que esconde.** Esa persona se atendió en más de un laboratorio y cada uno escribe su documento a su manera. Los archivos del SFTP no los controlas (son del laboratorio), pero tus copias sí: las descargas en tu máquina y lo que subiste al lago.

**Compruébalo tú.** Calcula el seudónimo de ese documento y busca en silver y gold: cero filas. Reconstruye silver como lo hace el job diario y vuelve a buscar: siguen siendo cero.

<details><summary>Pista 1</summary>

Borrar no alcanza: hay que **registrar** el pedido, y que la carga diaria lo respete.
</details>

<details><summary>Pista 2</summary>

Una tabla de olvidos con el seudónimo (no el documento) y la fecha del pedido; un `DELETE` en silver; recalcular gold. Anota en tu postmortem qué copias tuyas limpiaste.
</details>

:::solucion RA:Datos+Gold | el derecho al olvido
Se guarda el seudónimo del paciente en la tabla de olvidos y se borra de silver; gold se recalcula. Como silver se reconstruye filtrando contra `olvidos`, la próxima carga no lo trae de vuelta.

```sql norun
INSERT INTO red.silver.olvidos VALUES (sha2(concat('s4l-r3d-2026', '30111222'), 256), current_date());
DELETE FROM red.silver.resultados WHERE paciente_id IN (SELECT paciente_id FROM red.silver.olvidos);
-- y volver a crear red.gold.resultados_diarios
```

(El documento exacto lo dice el ticket del delegado de protección de datos.)
:::

## Paso 8 · Que corra solo (Airflow)

**Qué tienes que lograr.** Un DAG con `red` en el `dag_id`, programado una vez por día después de la hora en que llegan los archivos, que dispare el job de Databricks (ticket RA-110).

**Compruébalo tú.** `airflow dags test <dag_id>` en verde, y el ticket RA-110 pasa la revisión.

<details><summary>Pista 1</summary>

El último laboratorio entrega a media mañana (y a veces más tarde): si el DAG corre a las 2 de la mañana, procesa archivos que todavía no llegaron. ¿Qué haces con un archivo que llega tarde?
</details>

<details><summary>Pista 2</summary>

`DatabricksRunNowOperator` con el `job_id` de tu job y un `schedule` diario. La lección [Airflow con Databricks y dbt](#/l/airflow-airflow-databricks-dbt) tiene la estructura del archivo; lo escribes en `~/airflow/dags/` y lo ves en la [interfaz de Airflow](#/airflow).
</details>

:::real En tu computadora y en la web real
Para repetirlo en tu nube: **Azure Portal** para la cuenta de almacenamiento y el **Key Vault** (la clave SSH privada se guarda como secreto, nunca en el repositorio); **Databricks** para las vistas por laboratorio, silver seudonimizada y gold; un **job** que baja los archivos del SFTP cada día. El borrado por derecho al olvido se prueba con una consulta antes y después, y se guarda como evidencia.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio del proyecto y úsalas en el README.

- `06-vistas.png`: las vistas por laboratorio unidas en silver, con el conteo por laboratorio y día.
- `06-seudonimo.png`: silver sin datos personales (solo el seudónimo).
- `06-olvido.png`: la consulta antes y después del borrado.

Antes de publicar, tapa con un rectángulo los correos, los IDs de suscripción y de tenant, los nombres de cuentas reales y cualquier clave o token.
:::

## Ejercicios

:::ejercicio quiz
Si borras al paciente de silver pero recreas silver desde los archivos sin la tabla de olvidos, ¿qué pasa?
- [x] El paciente vuelve, porque sigue en los archivos de los laboratorios
- [ ] Nada, ya está borrado
- [ ] Da error
- [ ] Se borra de los archivos
:::

:::ejercicio quiz
Sur manda glucosa en 5,5 mmol/L. ¿Cuánto es en mg/dL?
- [ ] 5,5
- [x] Unos 99 (5,5 × 18,016)
- [ ] 55
- [ ] 0,3
:::

:::ejercicio quiz
En silver, `count(*)` da 30.412 y `count(DISTINCT laboratorio, id_muestra, estudio)` da 29.950. ¿Qué es lo primero que miras?
- [ ] Nada: es normal que difieran
- [x] De qué laboratorio son los repetidos: Cerro repite filas y el reenvío del Sur se suma al original si no te quedas con el último
- [ ] Borras la tabla y la vuelves a crear
- [ ] Los sacas con un LIMIT
:::

## Resumen

- Una vista por fuente que traduce a un esquema canónico: los cambios de una fuente quedan aislados.
- A este volumen, cada trampa se encuentra con una consulta (conteos, promedios por estudio, distintos contra totales), no mirando filas.
- El seudónimo se calcula sobre el documento normalizado, con una sal guardada aparte.
- El olvido se registra, no solo se borra: si no, vuelve en la próxima carga.
