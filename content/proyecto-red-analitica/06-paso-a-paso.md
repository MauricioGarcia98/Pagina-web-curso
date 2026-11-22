---
titulo: Paso a paso - una solución completa, explicada
nivel: Avanzado
duracion: 60
resumen: Una forma de resolver el proyecto de punta a punta, con el código probado y el porqué de cada decisión - el acceso por SFTP con clave, una vista por laboratorio que traduce su formato al canónico, el seudónimo con sal y el derecho al olvido. Léela después de intentarlo.
objetivos: Ver cómo se traduce cada formato a un esquema canónico | Seudonimizar de forma consistente entre fuentes | Aplicar el derecho al olvido sin que vuelva en la próxima carga
prerrequisitos: proyecto-red-analitica-el-dia-a-dia
autoevaluacion: ¿Sabes por qué cada laboratorio tiene su propia vista? | ¿Sabes por qué el documento se normaliza antes del hash? | ¿Sabes qué hace que un paciente olvidado no reaparezca al recargar?
---

:::cuidado Inténtalo primero
Esta es **una** solución. Si ya resolviste el proyecto, compara: si mañana Costa cambia la cantidad de filas de título de su planilla, ¿qué hace tu versión?
:::

## El plan

| Paso | Qué | Dónde |
|---|---|---|
| 1 | La clave SSH y el acceso al SFTP | Terminal |
| 2 | Bajar los archivos y mirarlos | Terminal (`sftp`, `file`) |
| 3 | Al lago y al Key Vault | Azure |
| 4 | Una vista por laboratorio | Databricks |
| 5 | Silver unificada y seudonimizada | Databricks |
| 6 | Gold y las preguntas | Databricks |
| 7 | El derecho al olvido | Databricks |

## Paso 1 · El acceso

El SFTP no acepta contraseñas: hay que generar una clave, darla de alta y esperar la aprobación (unos minutos).

```bash
red accesos
ssh-keygen -t ed25519 -f ~/.ssh/red_analitica -C equipo
red alta-clave ~/.ssh/red_analitica.pub     # la pública, nunca la privada
red estado
ssh-keyscan -p 2222 sftp.redanalitica.example >> ~/.ssh/known_hosts
```

:::trabajo La primera conexión
`ssh-keyscan` guarda la huella del servidor en `known_hosts`. Sin eso, el modo por lotes (`-b`) falla: no hay nadie para contestar "¿confiás en este servidor?". En un trabajo real, la huella se verifica con el proveedor antes de aceptarla.
:::

## Paso 2 · Bajar y mirar

```bash
printf 'cd /entrantes\nls -l norte\nls -l cerro\n' > ~/ver.txt
sftp -b ~/ver.txt -i ~/.ssh/red_analitica -P 2222 equipo_datos@sftp.redanalitica.example

mkdir -p ~/red/norte ~/red/centro ~/red/sur ~/red/costa ~/red/cerro
printf 'lcd ~/red/norte\nmget /entrantes/norte/*\nlcd ~/red/centro\nmget /entrantes/centro/*\nlcd ~/red/sur\nmget /entrantes/sur/*\nlcd ~/red/costa\nmget /entrantes/costa/*\nlcd ~/red/cerro\nmget /entrantes/cerro/*\n' > ~/bajar.txt
sftp -b ~/bajar.txt -i ~/.ssh/red_analitica -P 2222 equipo_datos@sftp.redanalitica.example

file ~/red/centro/* | head -3      # ISO-8859 text: no es UTF-8
head -5 ~/red/costa/$(ls ~/red/costa | head -1)
```

Lo que tienes que anotar de cada laboratorio:

| Laboratorio | Formato | Trampas |
|---|---|---|
| Norte | CSV con coma | El documento con puntos |
| Centro | CSV con `;` en Latin-1 | Códigos de prestación numéricos, coma decimal; cambia el formato de fecha al migrar de sistema |
| Sur | JSON por líneas, en inglés | Unidades internacionales (mmol/L, g/L, µmol/L); reenvía archivos corregidos con `_v2` |
| Costa | Exportación de Excel | Tres filas de título, fila de "Total", fechas como número de serie de Excel |
| Cerro | TSV | Fechas en UTC, filas duplicadas, a veces falta un día |

## Paso 3 · Al lago y al Key Vault

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

## Paso 4 · Una vista por laboratorio

Cada vista traduce **su** formato al mismo esquema: `laboratorio, id_muestra, estudio, resultado, fecha_toma, doc`. Si un laboratorio cambia, se toca una sola vista.

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

## Paso 5 · Silver, seudonimizada

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

:::cuidado La sal no va en el código
Acá aparece escrita para que se entienda. En el notebook de verdad se lee del Key Vault (`secret('kv-red', 'seudonimo-sal')` o un parámetro del job), igual que la clave SSH.
:::

## Paso 6 · Gold y las preguntas

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

## Paso 7 · El derecho al olvido

Se guarda el seudónimo del paciente en la tabla de olvidos y se borra de silver; gold se recalcula. Como silver se reconstruye filtrando contra `olvidos`, la próxima carga no lo trae de vuelta.

```sql norun
INSERT INTO red.silver.olvidos VALUES (sha2(concat('s4l-r3d-2026', '30111222'), 256), current_date());
DELETE FROM red.silver.resultados WHERE paciente_id IN (SELECT paciente_id FROM red.silver.olvidos);
-- y volver a crear red.gold.resultados_diarios
```

(El documento exacto lo dice el ticket del delegado de protección de datos.)

:::real En tu computadora y en la web real
Para repetirlo en tu nube: **Azure Portal** para la cuenta de almacenamiento y el **Key Vault** (la clave SSH privada se guarda como secreto, nunca en el repositorio); **Databricks** para las vistas por laboratorio, silver seudonimizada y gold; un **job** que baja los archivos del SFTP cada día. El borrado por derecho al olvido se prueba con una consulta antes y después, y se guarda como evidencia.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio del proyecto y úsalas en el README.

- `06-vistas.png`: las vistas por laboratorio unidas en silver.
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

## Resumen

- Una vista por fuente que traduce a un esquema canónico: los cambios de una fuente quedan aislados.
- El seudónimo se calcula sobre el documento normalizado, con una sal guardada aparte.
- El olvido se registra, no solo se borra: si no, vuelve en la próxima carga.
