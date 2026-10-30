---
titulo: "Laboratorio Databricks: bundles, Lakeflow Declarative Pipelines, Unity Catalog y serving"
nivel: Avanzado
duracion: 55
resumen: Crea un proyecto con Declarative Automation Bundles, valídalo, despliégalo en el target dev y ejecuta su job; crea un pipeline declarativo serverless con catálogo y esquema de Unity Catalog, ejecútalo y mira sus actualizaciones; otorga permisos con la jerarquía USE CATALOG, USE SCHEMA y SELECT; y consulta un modelo fundacional en Model Serving. Cubre las certificaciones Data Engineer Associate y Professional, y parte de la de IA generativa.
objetivos: Inicializar, validar, desplegar, ejecutar y destruir un bundle | Crear y ejecutar un pipeline declarativo serverless en Unity Catalog | Otorgar los tres permisos que necesita un analista para leer una tabla | Consultar un endpoint de modelo fundacional con la CLI
autoevaluacion: ¿Sabes qué diferencia hay entre los targets dev y prod de un bundle? | ¿Sabes qué permisos necesita un grupo para hacer SELECT sobre catalogo.esquema.tabla? | ¿Sabes qué hace un full refresh en un pipeline? | ¿Sabes cómo consultar un modelo fundacional sin desplegar nada?
---

:::escenario
Hasta ahora los jobs de la tienda se crean a mano en la interfaz y nadie sabe qué versión corre en producción. El equipo de plataforma pide que todo esté en Git con bundles, que la capa silver sea un pipeline declarativo y que los analistas lean solo lo que les corresponde.
:::

## Arquitectura

```diagrama
titulo: Del repositorio al workspace con gobierno
nodo git: Repositorio | icono=github | col=0 | fila=1 | sub=databricks.yml
nodo b: Asset Bundle | icono=databricks | col=1 | fila=1 | sub=dev y prod | color=rojo
nodo job: Job mi_proyecto_job | icono=orquestador | col=2 | fila=0 | color=naranja
nodo pl: Pipeline ventas-silver | icono=lakeflow | col=2 | fila=2 | sub=serverless | color=naranja
nodo uc: Unity Catalog dev.silver | icono=unity | col=3 | fila=1 | sub=grants | color=violeta
nodo an: Analistas | icono=usuario | col=4 | fila=1
nodo ms: Model Serving | icono=robot | col=4 | fila=2 | sub=Llama 3.3 70B | color=verde
flecha git -> b
flecha b -> job: deploy -t dev
flecha b -> pl
flecha pl -> uc
flecha an -> uc: SELECT
flecha an -> ms | estilo=punteada
```

## Costo en una cuenta real

| Recurso | Costo |
|---|---|
| **Databricks Free Edition** | Gratis, con cómputo serverless limitado: alcanza para todo el laboratorio |
| Cuenta paga: job y pipeline serverless | DBU por minuto de ejecución: centavos |
| Endpoints de modelos fundacionales (pago por token) | Centavos |

## Práctica guiada: Declarative Automation Bundles

:::ejercicio cli
Paso 1. Inicializa un bundle con la plantilla `default-python`.
```respuesta
databricks bundle init( default-python)?
```
```solucion
databricks bundle init default-python
```
:::

:::ejercicio cli
Paso 2. Entra a la carpeta `mi_proyecto` y valida el bundle.
```respuesta
cd (~/)?mi_proyecto/? && databricks bundle validate( -t dev)?
```
```solucion
cd mi_proyecto && databricks bundle validate
```
```setup
cd ~
databricks bundle init default-python
```
```explicacion
`validate` revisa `databricks.yml` y los recursos incluidos sin tocar el workspace. Úsalo en la CI antes de cada despliegue.
```
:::

:::ejercicio cli
Paso 3. Despliega el bundle en el target `dev`.
```respuesta
databricks bundle deploy (-t|--target) dev
```
```solucion
databricks bundle deploy -t dev
```
```setup
cd ~
databricks bundle init default-python
cd ~/mi_proyecto
```
```explicacion
En `mode: development` los recursos se crean con el prefijo `[dev tu_usuario]` y los schedules quedan en pausa: cada desarrollador tiene su copia sin pisar la de otros.
```
:::

:::ejercicio cli
Paso 4. Ejecuta el job `mi_proyecto_job` del target `dev`.
```respuesta
databricks bundle run (-t|--target) dev mi_proyecto_job
databricks bundle run mi_proyecto_job (-t|--target) dev
```
```solucion
databricks bundle run -t dev mi_proyecto_job
```
```setup
cd ~
databricks bundle init default-python
cd ~/mi_proyecto
databricks bundle deploy -t dev
```
:::

## Práctica guiada: pipeline declarativo

:::ejercicio cli
Paso 5. Vuelve a tu carpeta personal y crea el pipeline `ventas-silver`, **serverless**, que publique en el catálogo `dev` y el esquema `silver`, con el código en `src/pipelines/**`.
```respuesta
todos: databricks pipelines create || --json || \S*"name"\s*:\s*"ventas-silver"\S* || \S*"catalog"\s*:\s*"dev"\S* || \S*"schema"\s*:\s*"silver"\S* || \S*"serverless"\s*:\s*true\S*
todos: cd (~|\.\.)/? && databricks pipelines create || --json || \S*"name"\s*:\s*"ventas-silver"\S* || \S*"catalog"\s*:\s*"dev"\S* || \S*"schema"\s*:\s*"silver"\S* || \S*"serverless"\s*:\s*true\S*
```
```solucion
databricks pipelines create --json '{"name":"ventas-silver","catalog":"dev","schema":"silver","serverless":true,"libraries":[{"glob":{"include":"src/pipelines/**"}}]}'
```
```setup
cd ~
```
:::

:::ejercicio cli
Paso 6. Guarda el id del pipeline en `PID` (con `jq -r '.[0].pipeline_id'` sobre la salida JSON de `list-pipelines`) y lanza una actualización.
```respuesta
todos: PID=\$\(databricks pipelines list-pipelines || --output json || jq -r '\.\[0\]\.pipeline_id'\) || databricks pipelines start-update \$PID
```
```solucion
PID=$(databricks pipelines list-pipelines --output json | jq -r '.[0].pipeline_id') && databricks pipelines start-update $PID
```
```setup
cd ~
databricks pipelines create --json '{"name":"ventas-silver","catalog":"dev","schema":"silver","serverless":true,"libraries":[{"glob":{"include":"src/pipelines/**"}}]}'
```
:::

:::ejercicio cli
Paso 7. Cambiaste la lógica de una tabla y necesitas recalcularla desde cero: lanza una actualización con **full refresh**.
```respuesta
databricks pipelines start-update \$PID --full-refresh
```
```solucion
databricks pipelines start-update $PID --full-refresh
```
```setup
cd ~
databricks pipelines create --json '{"name":"ventas-silver","catalog":"dev","schema":"silver","serverless":true,"libraries":[{"glob":{"include":"src/pipelines/**"}}]}'
PID=$(databricks pipelines list-pipelines --output json | jq -r '.[0].pipeline_id')
```
```explicacion
Un full refresh borra el estado y reprocesa todo el origen. Si el origen ya no tiene los datos viejos (Kafka con retención de 7 días), perderías historia: marca esas tablas con `pipelines.reset.allowed = false`.
```
:::

:::ejercicio cli
Paso 8. Revisa el historial de actualizaciones del pipeline.
```respuesta
databricks pipelines list-updates \$PID
```
```solucion
databricks pipelines list-updates $PID
```
```setup
cd ~
databricks pipelines create --json '{"name":"ventas-silver","catalog":"dev","schema":"silver","serverless":true,"libraries":[{"glob":{"include":"src/pipelines/**"}}]}'
PID=$(databricks pipelines list-pipelines --output json | jq -r '.[0].pipeline_id')
databricks pipelines start-update $PID
```
:::

## Práctica guiada: Unity Catalog

:::ejercicio cli error
Paso 9. Intenta darle al grupo `analistas` el permiso `USE CATALOG` **sobre la tabla** `dev.silver.ventas`. Lee el error.
```respuesta
todos: databricks grants update table dev\.silver\.ventas || --json || \S*USE CATALOG\S*
```
```solucion
databricks grants update table dev.silver.ventas --json '{"changes":[{"principal":"analistas","add":["USE CATALOG"]}]}'
```
:::

:::ejercicio cli
Paso 10. Hazlo bien: `USE CATALOG` sobre el catálogo `dev`, `USE SCHEMA` sobre el esquema `dev.silver` y `SELECT` sobre la tabla `dev.silver.ventas`, todo para `analistas`.
```respuesta
todos: databricks grants update catalog dev || databricks grants update schema dev\.silver || databricks grants update table dev\.silver\.ventas || \S*USE SCHEMA\S* || \S*SELECT\S*
```
```solucion
databricks grants update catalog dev --json '{"changes":[{"principal":"analistas","add":["USE CATALOG"]}]}' && databricks grants update schema dev.silver --json '{"changes":[{"principal":"analistas","add":["USE SCHEMA"]}]}' && databricks grants update table dev.silver.ventas --json '{"changes":[{"principal":"analistas","add":["SELECT"]}]}'
```
```explicacion
Los permisos de Unity Catalog son jerárquicos: sin `USE CATALOG` y `USE SCHEMA`, el `SELECT` sobre la tabla no alcanza. En SQL: `GRANT USE CATALOG ON CATALOG dev TO analistas;` y así con cada nivel.
```
:::

:::ejercicio cli
Paso 11. Verifica los permisos de la tabla `dev.silver.ventas`.
```respuesta
databricks grants get table dev\.silver\.ventas
```
```solucion
databricks grants get table dev.silver.ventas
```
```setup
databricks grants update table dev.silver.ventas --json '{"changes":[{"principal":"analistas","add":["SELECT"]}]}'
```
:::

## Práctica guiada: Model Serving

:::ejercicio cli
Paso 12. Consulta el modelo fundacional `databricks-meta-llama-3-3-70b-instruct` para clasificar el reclamo `el pago fue rechazado`, con un máximo de 50 tokens.
```respuesta
todos: databricks serving-endpoints query databricks-meta-llama-3-3-70b-instruct || --json || \S*"max_tokens"\s*:\s*50\S*
```
```solucion
databricks serving-endpoints query databricks-meta-llama-3-3-70b-instruct --json '{"messages":[{"role":"user","content":"Clasifica este reclamo: el pago fue rechazado"}],"max_tokens":50}'
```
```explicacion
Los endpoints `databricks-…` son de **pago por token** y ya existen en el workspace. Desde SQL, la misma consulta se hace con `ai_query('databricks-meta-llama-3-3-70b-instruct', 'Clasifica…')` sobre una tabla completa.
```
:::

## En tu cuenta real

1. Crea una cuenta en **Databricks Free Edition** (no pide tarjeta).
2. Instala la CLI nueva (`brew install databricks/tap/databricks` o el instalador de `curl`) y autentícate: `databricks auth login --host https://<tu-workspace>.cloud.databricks.com`.
3. En el bundle, reemplaza el `host` de `databricks.yml` por el de tu workspace.
4. Para el pipeline, crea un archivo `src/pipelines/silver.sql` como este y súbelo con el bundle (o crea el pipeline desde la interfaz y pega el SQL):

```sql norun
CREATE OR REFRESH STREAMING TABLE ventas_bronze
AS SELECT * FROM STREAM read_files('/Volumes/dev/bronze/landing/ventas/', format => 'csv');

CREATE OR REFRESH MATERIALIZED VIEW ventas
(CONSTRAINT total_positivo EXPECT (total > 0) ON VIOLATION DROP ROW)
AS SELECT pedido_id, CAST(fecha AS DATE) AS fecha, canal, total
FROM ventas_bronze;
```

## Limpieza

:::ejercicio cli
Borra el pipeline `$PID`.
```respuesta
databricks pipelines delete \$PID
```
```solucion
databricks pipelines delete $PID
```
```setup
cd ~
databricks pipelines create --json '{"name":"ventas-silver","catalog":"dev","schema":"silver","serverless":true,"libraries":[{"glob":{"include":"src/pipelines/**"}}]}'
PID=$(databricks pipelines list-pipelines --output json | jq -r '.[0].pipeline_id')
```
:::

:::ejercicio cli
Entra a `mi_proyecto` y destruye todo lo que desplegó el bundle en `dev`, sin pedir confirmación.
```respuesta
todos: cd (~/)?mi_proyecto/? && databricks bundle destroy || (-t|--target) dev || --auto-approve
todos: databricks bundle destroy || (-t|--target) dev || --auto-approve
```
```solucion
cd ~/mi_proyecto && databricks bundle destroy -t dev --auto-approve
```
```setup
cd ~
databricks bundle init default-python
cd ~/mi_proyecto
databricks bundle deploy -t dev
cd ~
```
:::

:::errores
- **Desplegar a mano en el workspace** y además con el bundle: el próximo `bundle deploy` pisa los cambios manuales.
- **Usar el target de producción desde tu computadora**: los despliegues a prod los hace el CI con un service principal.
- **Pipeline declarativo sin catálogo y esquema definidos**: las tablas terminan en un lugar inesperado o el pipeline no arranca.
- **Dar `ALL PRIVILEGES` a un grupo amplio** en Unity Catalog: se da lo mínimo (`USE CATALOG`, `USE SCHEMA`, `SELECT`) y a grupos, no a personas.
- **Olvidar borrar el endpoint de Model Serving** o dejarlo sin escalar a cero.
:::

:::trabajo
- Un proyecto de datos en Databricks se ve así en el repositorio: `databricks.yml` con targets dev y prod, carpetas con notebooks y código Python, y un workflow de CI que corre `bundle validate` en cada *pull request* y `bundle deploy -t prod` al aprobar.
- Los permisos de Unity Catalog se definen como código (en Terraform o en el bundle) y se revisan como cualquier otro cambio.
:::

:::entrevista "¿Cómo llevarías un job de Databricks de desarrollo a producción?"
Lo definiría en un bundle con targets dev y prod, versionado en Git. En desarrollo cada persona despliega a su propio entorno con `databricks bundle deploy -t dev`. Los cambios pasan por pull request, con CI que valida el bundle y corre tests. Al aprobar, el CI despliega a prod con un service principal y OAuth máquina a máquina, el job corre como ese service principal con permisos mínimos en Unity Catalog, y nadie edita producción a mano.
:::

## Preguntas de examen

:::ejercicio quiz
Un analista tiene `SELECT` sobre `prod.gold.ventas` pero recibe `PERMISSION_DENIED`. ¿Qué es lo más probable?

- [ ] Le falta `MODIFY` sobre la tabla
- [x] Le falta `USE CATALOG` sobre `prod` o `USE SCHEMA` sobre `prod.gold`
- [ ] La tabla no es Delta
- [ ] Necesita ser dueño de la tabla
:::

:::ejercicio quiz
¿Qué hace `databricks bundle deploy -t dev` con un target en `mode: development`?

- [ ] Despliega en producción con los schedules activos
- [x] Crea los recursos con un prefijo del usuario y con los schedules en pausa
- [ ] Solo valida la configuración
- [ ] Ejecuta el job inmediatamente
:::

:::ejercicio quiz
Quieres clasificar con un LLM los 2 millones de reclamos de una tabla, desde SQL y sin desplegar nada. ¿Qué usas?

- [ ] Un endpoint de Model Serving con un modelo propio
- [x] `ai_query` con un endpoint de modelo fundacional de pago por token
- [ ] Un notebook con un bucle de llamadas HTTP
- [ ] Vector Search
:::
