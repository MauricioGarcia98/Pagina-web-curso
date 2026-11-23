---
titulo: La ingesta - Data Factory copia el día de landing a bronze
nivel: Intermedio
duracion: 50
resumen: Armas en Data Factory Studio el pipeline que todos los días copia los archivos de la app de landing a bronze - linked service con identidad administrada, datasets, una actividad Copy con un comodín que depende de la fecha y un parámetro para elegir el día. Lo publicas, lo ejecutas desde la terminal como lo haría otro sistema y lo guardas en el repositorio.
objetivos: Crear un linked service a ADLS Gen2 con identidad administrada | Usar un parámetro de pipeline y una expresión para elegir los archivos del día | Diferenciar Debug de una ejecución de la versión publicada | Ejecutar un pipeline desde la CLI y revisar el resultado en Monitor
prerrequisitos: proyecto-pedalia-el-lago-en-azure | interfaces-data-factory-por-dentro
autoevaluacion: ¿Sabes por qué Trigger now ejecuta la versión publicada y no lo que estás editando? | ¿Sabes qué hace @concat(pipeline().parameters.fecha, '/viajes_*.csv')? | ¿Sabes qué error ves si el data factory no tiene permiso en el lago? | ¿Sabes dónde mirar las filas que copió cada actividad?
---

:::escenario Martes, 11:30
Ya está la entrega en landing. Ahora necesitas que "algo" la copie a bronze todos los días, sin que nadie tenga que acordarse. Eso es una ingesta, y en Azure el servicio para eso es Data Factory.
:::

:::analogia La cinta transportadora con etiqueta del día
Data Factory es una cinta transportadora: toma cajas de un lugar y las deja en otro, sin abrirlas. El parámetro `fecha` es la etiqueta que le pones cada mañana: "hoy lleva las cajas del 9 de noviembre". La cinta es la misma todos los días; lo único que cambia es la etiqueta.
:::

## 1. Abrir el Studio

En el [portal de Azure de práctica](#/azure): **adf-pedalia-dev → Launch studio**.

## 2. Linked service: la conexión al lago

**Manage → Linked services → New → Azure Data Lake Storage Gen2**:
- Name: `ls_lago`
- Authentication: **System-assigned managed identity** (la identidad del factory, a la que le diste el rol)
- Storage account: `stpedaliadev`
- **Test connection**: si falla con *AuthorizationPermissionMismatch*, falta el rol de la lección anterior.

## 3. Datasets: de dónde y a dónde

**Author → + → Dataset → Azure Data Lake Storage Gen2 → DelimitedText**:

| Dataset | Linked service | Contenedor | Carpeta | Primera fila es encabezado |
|---|---|---|---|---|
| `ds_landing_pedalia` | ls_lago | landing | `pedalia` | sí |
| `ds_bronze_viajes` | ls_lago | bronze | `pedalia/viajes` | sí |

No pongas nombre de archivo: el archivo lo elige el pipeline cada día.

## 4. El pipeline

**Author → + → Pipeline**, nombre `pl_ingesta_pedalia`:

1. En **Parameters** (abajo, con el lienzo vacío seleccionado): agrega `fecha`, tipo String, valor por defecto `2026-11-09`.
2. Arrastra una actividad **Copy data**, nombre `Copiar viajes`:
   - **Source**: `ds_landing_pedalia`, y en **Wildcard file name** un contenido dinámico (*Add dynamic content*) que arme la ruta del día a partir del parámetro `fecha`: la carpeta de la fecha y cualquier `viajes_*.csv` adentro (la pista está abajo del paso 3).
   - **Sink**: `ds_bronze_viajes`.
3. **Validate**, después **Debug** con `fecha = 2026-11-09`. En la salida de la actividad mira `filesRead`, `rowsCopied` y `dataWritten`.

<details><summary>Pista · el contenido dinámico</summary>

Las expresiones de Data Factory empiezan con `@`. Para juntar textos está `@concat(…)` y el parámetro se lee con `pipeline().parameters.fecha`. El resultado tiene que quedar como `2026-11-09/viajes_*.csv`.
</details>

El JSON que queda lo vas a guardar en el repositorio (pestaña **{ }** del pipeline). Cuando tu pipeline corra bien, compáralo con el de referencia:

<details><summary>Pista</summary>

En el Studio, el botón **{ }** (Code) del pipeline muestra su JSON. Tiene que tener el parámetro `fecha`, la actividad Copy con su origen y su destino, y las expresiones con la fecha.
</details>

:::solucion PD:Data Factory | el pipeline en JSON
```json
{
  "name": "pl_ingesta_pedalia",
  "properties": {
    "parameters": { "fecha": { "type": "String", "defaultValue": "2026-11-09" } },
    "activities": [{
      "name": "Copiar viajes",
      "type": "Copy",
      "inputs": [{ "referenceName": "ds_landing_pedalia", "type": "DatasetReference" }],
      "outputs": [{ "referenceName": "ds_bronze_viajes", "type": "DatasetReference" }],
      "typeProperties": {
        "source": { "type": "DelimitedTextSource", "storeSettings": { "type": "AzureBlobFSReadSettings", "recursive": true,
          "wildcardFileName": { "value": "@concat(pipeline().parameters.fecha, '/viajes_*.csv')", "type": "Expression" } } },
        "sink": { "type": "DelimitedTextSink" }
      }
    }]
  }
}
```
:::

:::tip Un pipeline de ingesta no transforma
Fíjate que la copia no filtra duplicados ni corrige nada: lleva el archivo tal cual. Si mañana descubres un error en la limpieza, puedes volver a calcular todo desde bronze sin pedirle los archivos de nuevo a la app. Esa es la razón de ser de bronze.
:::

## 5. Publicar y ejecutar como lo haría otro sistema

**Publish all**. Desde ahora existe la versión publicada, que es la que ejecutan los triggers, la API y Airflow. Lo que edites después no corre hasta que vuelvas a publicar.

Ejecútalo desde la terminal, como lo haría un script o un orquestador (es la API "Create Run" del servicio):

<details><summary>Pista</summary>

`az datafactory pipeline create-run` con el grupo, la fábrica, el nombre del pipeline y `--parameters` con un JSON (`'{"fecha": "2026-11-09"}'`). Después, `az datafactory pipeline-run show --run-id …` para ver cómo terminó.
</details>

:::solucion PD:Data Factory | correrlo desde la terminal
```bash
az datafactory pipeline create-run -g rg-pedalia-dev --factory-name adf-pedalia-dev \
  -n pl_ingesta_pedalia --parameters '{"fecha": "2026-11-09"}'
az storage blob list --account-name stpedaliadev -c bronze -o table
```
:::

En el Studio, **Monitor → Pipeline runs**: vas a ver la corrida con su `runId`, quién la disparó y cuánto tardó. Entra a la actividad para ver la entrada y la salida.

## 6. Al repositorio

En Data Factory real se conecta el Studio a un repositorio Git (Manage → Git configuration) y cada pipeline queda como un JSON en `pipeline/`. Acá guarda el JSON a mano:

```bash
cd ~/pedalia-datos
git checkout main && git pull
git checkout -b adf/ingesta
mkdir -p adf/pipeline
# pega el JSON de arriba en el archivo
nano adf/pipeline/pl_ingesta_pedalia.json
git add adf && git commit -m "Pipeline de ingesta de Pedalia" && git push -u origin adf/ingesta
```

Abre el PR y fusiónalo cuando el check esté en verde.

:::errores
- **Probar con Debug y creer que ya está en producción**: Debug corre lo que estás editando; los triggers y Airflow corren lo **publicado**. Si olvidas **Publish all**, el pipeline "no existe" para ellos (*PipelineNotFound*).
- **Escribir la fecha en el comodín** (`2026-11-09/viajes_*.csv`): funciona el primer día y copia siempre el mismo archivo. Para eso está el parámetro.
- **Linked service con la clave de la cuenta** en vez de identidad administrada: la clave da control total y hay que rotarla.
- **Error *UserErrorSourceBlobNotExist***: el comodín no encontró nada. Revisa que la fecha exista en landing y que la carpeta del dataset sea `pedalia` (el comodín se aplica desde ahí).
:::

:::real En tu computadora y en la web real
En Azure real, todo esto se hace en **Azure Data Factory Studio** (`adf.azure.com`, o desde el recurso → *Launch studio*):

1. **Manage → Linked services → New → Azure Data Lake Storage Gen2**, con *System-assigned managed identity* (sin claves).
2. **Author → Datasets → New dataset** para el origen (landing) y el destino (bronze), con el parámetro de fecha.
3. **Author → Pipelines → New pipeline**: arrastra una actividad *Copy data* y configura *Source* y *Sink*.
4. **Publish all** y después **Add trigger → Trigger now** para probarlo. El resultado se ve en **Monitor**.

Si conectas Git en *Manage → Git configuration*, cada cambio queda en el repositorio, igual que en el paso 6.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio del proyecto y úsalas en el README.

- `05-pipeline.png`: el lienzo del pipeline con la actividad Copy.
- `05-monitor.png`: la ejecución en verde en *Monitor*, con filas leídas y escritas.
- `05-linked-service.png`: el linked service con identidad administrada (sin claves a la vista).

Antes de publicar, tapa con un rectángulo los correos, los IDs de suscripción y de tenant, los nombres de cuentas reales y cualquier clave o token.
:::

## Ejercicios

:::ejercicio quiz
Editaste el pipeline, lo probaste con Debug y funcionó. Airflow lo ejecuta y corre la versión vieja. ¿Qué pasó?
- [ ] Airflow guarda una copia vieja del pipeline en caché
- [x] Faltó publicar: Airflow, los triggers y la API ejecutan la versión publicada, no la que estás editando
- [ ] Debug solo funciona con datasets JSON
- [ ] El linked service no tiene permisos
:::

:::ejercicio quiz
El pipeline recibe `fecha = 2026-11-10`. ¿Qué archivos copia la actividad con el comodín `@concat(pipeline().parameters.fecha, '/viajes_*.csv')` sobre la carpeta `pedalia`?
- [ ] Todos los archivos de landing
- [ ] Solo `estaciones.json`
- [x] Los que coinciden con `pedalia/2026-11-10/viajes_*.csv`
- [ ] Ninguno, porque los comodines no aceptan expresiones
:::

:::ejercicio quiz
¿Por qué la actividad Copy no elimina los duplicados mientras copia a bronze?
- [ ] Porque Data Factory no sabe detectar duplicados
- [x] Porque bronze guarda lo que llegó tal cual, para poder recalcular la limpieza sin volver a pedir los archivos
- [ ] Porque los duplicados se borran solos en el lago
- [ ] Porque los duplicados no afectan a los ingresos
:::

## Resumen

- **Linked service** = cómo conectarse (con identidad administrada); **dataset** = qué carpeta; **pipeline** = qué hacer.
- Un **parámetro** y una **expresión** hacen que el mismo pipeline sirva para cualquier día.
- **Debug** prueba lo que editas; lo **publicado** es lo que corre de verdad.
- La ingesta copia sin transformar: bronze es tu seguro para recalcular.
