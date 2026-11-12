# examen: interfaces

## Power Query o DAX
leccion: interfaces-power-bi-por-dentro
En Power BI, ¿dónde se limpian y transforman los datos antes de cargarlos al modelo?
- [ ] En la vista de informe, con los filtros.
- [x] En Power Query (Transformar datos).
- [ ] En el panel de formato de cada visual.
- [ ] En el servicio de Power BI, después de publicar.
porque: Power Query aplica pasos de transformación al cargar. DAX calcula después, sobre el modelo ya cargado.

## Grupo de recursos
leccion: interfaces-portal-azure-por-dentro
¿Qué es un grupo de recursos en Azure?
- [ ] Un tipo de máquina virtual más barata.
- [x] Un contenedor lógico para administrar juntos los recursos de un proyecto.
- [ ] Una copia de seguridad de toda la suscripción, que se guarda en otra región.
- [ ] Una red privada entre dos regiones.
porque: Todo recurso vive en un grupo de recursos. Permite dar permisos, ver costos y borrar todo junto.

## Linked service
leccion: interfaces-data-factory-por-dentro
En Data Factory, ¿qué guarda un linked service?
- [ ] La forma de los datos: las columnas, sus tipos y el formato.
- [x] Cómo conectarse a un sistema: dirección y credenciales.
- [ ] El horario de ejecución del pipeline.
- [ ] El resultado de la última corrida.
porque: El linked service es la conexión; el dataset describe los datos dentro de esa conexión; el pipeline los usa.

## Unity Catalog
leccion: interfaces-databricks-por-dentro
En Databricks, ¿cómo se nombra por completo una tabla de Unity Catalog?
- [ ] `tabla`
- [ ] `esquema.tabla`
- [x] `catalogo.esquema.tabla`
- [ ] `workspace.cluster.tabla`
porque: Unity Catalog usa tres niveles: catálogo, esquema y tabla.

## Pull request
leccion: interfaces-github-por-dentro
¿Para qué sirve un pull request?
- [ ] Para descargar el repositorio completo a tu computadora y trabajar sin conexión.
- [x] Para proponer cambios y que alguien los revise antes de fusionarlos.
- [ ] Para borrar una rama que ya no se usa.
- [ ] Para guardar contraseñas del proyecto.
porque: El pull request muestra el cambio, corre las pruebas automáticas y permite la revisión antes del merge.

## Endpoint de solo lectura
leccion: interfaces-fabric-por-dentro
En Fabric, quieres escribir datos con T-SQL (`INSERT`, `UPDATE`). ¿Qué ítem usas?
- [ ] El SQL analytics endpoint del lakehouse.
- [x] Un warehouse.
- [ ] Un shortcut.
- [ ] Un modelo semántico.
porque: El SQL analytics endpoint es de solo lectura. El warehouse acepta DML con T-SQL.

## DAG pausado
leccion: interfaces-airflow-por-dentro
Un DAG nuevo aparece en la lista de Airflow pero nunca corre. ¿Qué revisas primero?
- [x] Que no esté pausado: los DAGs nuevos empiezan pausados.
- [ ] Que el archivo del DAG tenga más de cien líneas de código.
- [ ] Que el servidor tenga más memoria.
- [ ] Que el DAG tenga una conexión a Slack.
porque: Con la configuración por defecto, un DAG nuevo queda pausado hasta que se lo activa.

## Warehouse de Snowflake
leccion: interfaces-snowflake-por-dentro
En Snowflake, ¿cuándo cobra un warehouse virtual?
- [ ] Siempre, las 24 horas, desde que se crea.
- [x] Mientras está encendido; suspendido no consume créditos.
- [ ] Solo cuando una consulta devuelve más de mil filas.
- [ ] Una vez por mes, un monto fijo.
porque: Se cobra por segundo de uso (mínimo 60 s por arranque). Por eso conviene un `AUTO_SUSPEND` corto.

## Orquestador
leccion: interfaces-proyecto-integrador
En el proyecto integrador, Airflow dispara un job de Databricks. ¿Quién transforma los datos?
- [ ] Airflow, dentro de la propia tarea del DAG, usando la memoria del scheduler.
- [x] Databricks: Airflow solo pide el trabajo y espera el resultado.
- [ ] Power BI, al importar la tabla.
- [ ] GitHub, al fusionar el pull request.
porque: El orquestador decide el orden y vigila. El trabajo pesado lo hace el motor de cómputo.

## Bytes en BigQuery
leccion: interfaces-bigquery-por-dentro
En BigQuery (on-demand), ¿qué consulta sobre una tabla grande, particionada por `fecha`, cuesta menos?
- [ ] `SELECT * FROM tabla LIMIT 10`
- [x] `SELECT pais FROM tabla WHERE fecha = '2026-01-05'`
- [ ] `SELECT * FROM tabla WHERE fecha >= '2020-01-01' ORDER BY fecha`
- [ ] Las tres cuestan lo mismo.
porque: Se cobra por bytes leídos: una sola columna y una sola partición. `LIMIT` no reduce lo que se lee.
