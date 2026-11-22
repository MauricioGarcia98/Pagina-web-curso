---
titulo: Fuentes y accesos - el SFTP y el formato de cada laboratorio
nivel: Avanzado
duracion: 40
resumen: La referencia técnica - cómo conectarte al SFTP con clave pública y verificar la huella del servidor, y la documentación de cada laboratorio tal como la mandaron, con sus formatos, codificaciones, códigos de estudio y unidades. Más la tabla de equivalencias y los rangos canónicos que fijó dirección médica.
objetivos: Conectarte a un SFTP con clave pública verificando la huella del servidor | Automatizar descargas con sftp en modo lote | Reconocer y corregir problemas de codificación | Leer cinco formatos distintos hacia un esquema común
prerrequisitos: proyecto-red-analitica-el-pedido
autoevaluacion: ¿Sabes qué es known_hosts y por qué se verifica la huella? | ¿Sabes reconocer un archivo en Latin-1? | ¿Sabes convertir un número de serie de Excel en una fecha? | ¿Sabes en qué unidad viene cada estudio del Sur?
---

<div data-red="fuentes"></div>

## 1. El acceso al SFTP

```bash
red accesos                                   # el correo de IT: host, puerto, usuario y huella
ssh-keygen -t ed25519 -f ~/.ssh/red_analitica -C "equipo-datos"
red alta-clave ~/.ssh/red_analitica.pub       # IT la autoriza en unos minutos
red estado
```

```diagrama
titulo: Cinco laboratorios, un SFTP y datos de salud que hay que proteger
nodo lab: 5 laboratorios | icono=hospital | col=0 | fila=0 | color=azul | sub=cada uno con su formato y su horario
nodo sftp: SFTP /entrantes | icono=servidor | col=1 | fila=0 | color=gris | sub=un archivo por laboratorio por día
nodo br: bronze | icono=capas | col=2 | fila=0 | color=naranja | sub=tal cual llegó
nodo seu: Seudonimización | icono=candado | col=3 | fila=0 | color=violeta | sub=el paciente se reemplaza por un código
nodo sv: silver unificado | icono=tabla | col=4 | fila=0 | color=verde | sub=un formato para los cinco
nodo olv: Derecho al olvido | icono=x | col=3 | fila=1 | color=rojo | sub=borrar a un paciente en todas las capas
flecha lab -> sftp | explica=Cada laboratorio deja un archivo por día en el SFTP, con su propio formato y horario.
flecha sftp -> br | explica=Se copian a bronze tal como llegaron.
flecha br -> seu | explica=Antes de seguir, el paciente se reemplaza por un código: los analistas nunca ven quién es.
flecha seu -> sv | explica=Silver unifica los cinco formatos en uno.
flecha olv -> sv | estilo=punteada | color=rojo | explica=Si un paciente pide que lo borren, hay que borrarlo en silver…
flecha olv -> br | estilo=punteada | color=rojo | explica=…y también en bronze. Por eso hay que saber en qué archivos y tablas aparece cada paciente.
```

La primera vez, el cliente no conoce al servidor. **Verifica la huella** contra la del correo antes de aceptarla:

```bash
ssh-keyscan -p 2222 sftp.redanalitica.example >> ~/.ssh/known_hosts
# o, después de comparar la huella que muestra el error:
sftp -o StrictHostKeyChecking=accept-new -i ~/.ssh/red_analitica -P 2222 equipo_datos@sftp.redanalitica.example
```

Comandos de la consola de `sftp`: `ls -l`, `cd`, `pwd`, `get archivo [destino]`, `mget patrón`, `lcd`, `lpwd`, `bye`. La cuenta es de **solo lectura**. Para un script se usa el modo lote:

```bash
cat > lote.txt <<'EOF2'
cd /entrantes/norte
mget *.csv
EOF2
sftp -b lote.txt -i ~/.ssh/red_analitica -P 2222 equipo_datos@sftp.redanalitica.example
scp -i ~/.ssh/red_analitica -P 2222 'equipo_datos@sftp.redanalitica.example:/entrantes/sur/*.jsonl' sur/
```

`ls -l` muestra la hora en que cada archivo apareció en el servidor, en hora de Ciudad del Río.

## 2. Lo que manda cada laboratorio

Esta documentación la escribió cada laboratorio. Está como la mandaron.

### Laboratorio Norte · `/entrantes/norte/resultados_AAAAMMDD.csv`

CSV UTF-8, separador coma, con encabezado. Llega a eso de la 01:10.

`muestra_id, fecha_toma (AAAA-MM-DD hh:mm, hora local), documento (con puntos: 41.234.567), paciente, fecha_nacimiento, sexo, codigo (GLU, HB, COL, CRE, TSH), estudio, resultado, unidad`

### Laboratorio Centro · `/entrantes/centro/CENTRO_DD-MM-AAAA.csv`

> "Exportamos desde el sistema del laboratorio. Separador punto y coma."

`Nro Muestra; Fecha (dd/mm/aaaa hh:mm); Documento; Apellido y Nombre; F. Nac.; Sexo; Cod. Prestacion; Prestacion; Resultado; Unidad`

Códigos: 1001 glucosa, 1002 hemoglobina, 1003 colesterol, 1004 creatinina, 1005 TSH. Unidades: mg/dl, g/dl, µUI/ml.

### Laboratorio Sur · `/entrantes/sur/sur_resultados_AAAA-MM-DD.jsonl`

JSON por líneas. Un resultado por línea:

```json
{"sample": "S-100892", "taken_at": "2026-11-17T09:12:00-03:00", "patient": {"doc": 46720691, "name": "…", "birth": "…", "sex": "M"}, "test": "glucose", "value": 4.33, "unit": "mmol/L"}
```

Tests: `glucose` (mmol/L), `hemoglobin` (g/L), `cholesterol` (mmol/L), `creatinine` (µmol/L), `tsh` (mIU/L). Si encontramos un error, reenviamos el archivo completo del día con sufijo `_v2`, `_v3`… que **reemplaza** al anterior.

### Laboratorio Costa · `/entrantes/costa/Reporte Costa DDMMAAAA.csv`

> "Lo exportamos desde Excel todas las mañanas."

(El archivo trae lo que Excel agrega al exportar. Mírenlo antes de leerlo.) Columnas: `Muestra, Fecha toma, CI, Nombre, Nacimiento, Sexo, Estudio, Valor, Unidad`. El estudio viene por nombre: Glucosa en ayunas, Hemoglobina, Colesterol total, Creatinina, TSH.

### Laboratorio Cerro · `/entrantes/cerro/cerro_AAAAMMDD.tsv`

Separado por tabulaciones, desde un servidor Windows. `ID, FECHA_UTC, DOC, NOMBRE, NAC, SEXO, COD (GLUC, HGB, CHOL, CREA, TSH), VALOR, UNID`. Incluye la guardia nocturna (urgencias hasta las 23:59).

## 3. Lo que fijó dirección médica

| Código canónico | Estudio | Unidad canónica | Rango de referencia |
|---|---|---|---|
| `GLU` | Glucosa en ayunas | mg/dL | 70 – 100 |
| `HB` | Hemoglobina | g/dL | 12 – 17,5 |
| `COL` | Colesterol total | mg/dL | hasta 200 |
| `CRE` | Creatinina | mg/dL | 0,6 – 1,3 |
| `TSH` | Tirotropina | mUI/L | 0,4 – 4,0 |

Conversiones: glucosa mmol/L × 18,016 = mg/dL · colesterol mmol/L × 38,67 = mg/dL · creatinina µmol/L ÷ 88,4 = mg/dL · hemoglobina g/L ÷ 10 = g/dL · µUI/mL = mUI/L. El **día** de un resultado es el día de la toma en hora de Ciudad del Río (UTC-3).

## 4. Herramientas que te van a servir

```bash
file CENTRO_17-11-2026.csv                        # codificación, BOM y fin de línea
iconv -f LATIN1 -t UTF-8 entrada.csv -o salida.csv
```

```sql norun
-- Databricks: opciones de read_files para archivos difíciles
SELECT * FROM read_files('abfss://…/centro/', format => 'csv', sep => ';', header => true, encoding => 'ISO-8859-1');
SELECT * FROM read_files('abfss://…/costa/', format => 'csv', header => true, skipRows => 3);
SELECT patient:doc, value, unit FROM read_files('abfss://…/sur/', format => 'json');
SELECT date_add('1899-12-30', CAST(46343.4375 AS INT));   -- serie de Excel → fecha
```

:::real En tu computadora y en la web real
Un SFTP real se usa así desde tu computadora:

1. `ssh-keygen -t ed25519 -f ~/.ssh/red_analitica` crea tu par de claves.
2. Le mandas a IT **solo la pública** (`~/.ssh/red_analitica.pub`).
3. Compruebas la huella del servidor con `ssh-keyscan` y la comparas con la del correo de IT **antes** de conectarte.
4. `sftp -i ~/.ssh/red_analitica usuario@host` y adentro `ls`, `get` y `mget`. Con interfaz gráfica: FileZilla o WinSCP, con la misma clave.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio del proyecto y úsalas en el README.

- `02-sftp.png`: la sesión de SFTP listando los archivos de cada laboratorio (tapa host y usuario).
- `02-formatos.png`: un ejemplo de cada formato de laboratorio abierto en VS Code.

Antes de publicar, tapa con un rectángulo los correos, los IDs de suscripción y de tenant, los nombres de cuentas reales y cualquier clave o token.
:::

## Ejercicios

:::ejercicio quiz
`file` dice que el archivo de Centro es "ISO-8859 text" y en Databricks los acentos salen como "�". ¿Qué pasa?
- [ ] El archivo está roto y hay que pedirlo de nuevo
- [x] Está en Latin-1 y se está leyendo como UTF-8: hay que decirle al lector la codificación (encoding => 'ISO-8859-1') o convertirlo con iconv
- [ ] Hay que borrar los acentos a mano
- [ ] Databricks no soporta acentos
:::

:::ejercicio quiz
Cerro informa una urgencia con FECHA_UTC = 2026-11-18T01:30:00Z. ¿De qué día es en la red?
- [x] Del 17: 01:30 UTC son las 22:30 del 17 en Ciudad del Río
- [ ] Del 18
- [ ] De ninguno, es una urgencia
- [ ] Depende del laboratorio
:::

## Resumen

- SFTP con **clave pública** y huella verificada; `sftp -b` para scripts.
- Cinco formatos: CSV UTF-8, **Latin-1 con ;** y coma decimal, **JSON con unidades internacionales**, **exportación de Excel** y **TSV en UTC**.
- Un esquema canónico (códigos, unidades, rangos y día local) que fijó dirección médica.
