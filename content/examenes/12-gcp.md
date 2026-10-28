# examen: gcp

## Proyectos
leccion: gcp-gcp-para-datos
En Google Cloud, ¿qué agrupa recursos, APIs habilitadas, permisos y facturación?
- [ ] La región.
- [x] El proyecto.
- [ ] El bucket.
- [ ] El dataset.
porque: El proyecto es la unidad básica: casi todo se crea dentro de uno, y se suele separar dev y prod en proyectos distintos.

## gcloud
leccion: gcp-gcloud-iam
Ejecutaste `gcloud storage ls` y ves los buckets de otro proyecto. ¿Qué te faltó?
- [ ] Reinstalar gcloud, porque la configuración quedó dañada.
- [x] Seleccionar el proyecto con `gcloud config set project <id>`.
- [ ] Borrar los buckets del otro proyecto para que no aparezcan.
- [ ] Crear una cuenta de servicio nueva para el proyecto correcto.
porque: gcloud trabaja sobre el proyecto activo de la configuración. Revisarlo con `gcloud config list` evita operar en el entorno equivocado.

## Cuentas de servicio
leccion: gcp-gcloud-iam
¿Qué opción es la **más** segura para que un job de Dataproc escriba en BigQuery?
- [ ] Descargar una clave JSON de una cuenta con rol Owner y guardarla en el bucket del job.
- [x] Una cuenta de servicio dedicada con solo los roles de BigQuery necesarios.
- [ ] Ejecutar el job con tu usuario personal, que ya tiene todos los permisos.
- [ ] Dar el rol Editor a todos los usuarios del proyecto para evitar errores de permisos.
porque: El recurso corre "como" la cuenta de servicio y obtiene credenciales automáticamente, sin archivos de claves. Roles acotados = permisos mínimos.

## Cloud Storage
leccion: gcp-cloud-storage
¿Qué hace *uniform bucket-level access* en un bucket?
- [ ] Hace público el bucket para cualquier usuario autenticado de Google.
- [x] Desactiva las ACL por objeto y controla el acceso solo con IAM.
- [ ] Replica el bucket automáticamente en todas las regiones del continente.
- [ ] Cifra todos los objetos con una clave administrada por el cliente.
porque: Un solo modelo de permisos (IAM) es más simple de auditar que permisos mezclados por objeto.

## Costo en BigQuery
leccion: gcp-bigquery-fundamentos
`SELECT * FROM ventas LIMIT 10` sobre una tabla de 3 TB, en modo on-demand. ¿Cuánto se factura?
- [ ] Casi nada, porque solo devuelve 10 filas.
- [x] Aproximadamente los 3 TB.
- [ ] Nada: las consultas con `LIMIT` son gratuitas.
- [ ] Solo la primera partición de la tabla.
porque: BigQuery cobra por bytes leídos y `LIMIT` no reduce lo escaneado en una tabla común. Para explorar: elige columnas, filtra por partición o usa la vista previa de la tabla, que es gratis.

## Particiones y clustering
leccion: gcp-bigquery-avanzado
Las consultas filtran por `fecha` y casi siempre también por `cliente_id`. ¿Qué diseño conviene?
- [ ] Particionar por `cliente_id` y agrupar (cluster) por `fecha`.
- [x] Particionar por `fecha` y agrupar (cluster) por `cliente_id`.
- [ ] No particionar y crear un índice secundario sobre las dos columnas.
- [ ] Crear una tabla por cliente y unirlas con un comodín en el `FROM`.
porque: La partición por fecha poda días enteros. El clustering ordena los datos dentro de cada partición por `cliente_id` y reduce aún más lo leído. Particionar por un ID con millones de valores no es posible ni conveniente.

## Datos anidados
leccion: gcp-bigquery-avanzado
Una tabla tiene una columna `items` de tipo `ARRAY<STRUCT<producto STRING, cantidad INT64>>`. ¿Cómo obtienes una fila por ítem?
- [ ] `SELECT pedido_id, items.producto, items.cantidad FROM pedidos`
- [x] `SELECT p.pedido_id, i.producto FROM pedidos p, UNNEST(p.items) AS i`
- [ ] `SELECT pedido_id, items FROM pedidos GROUP BY pedido_id, items`
- [ ] `SELECT pedido_id, EXPLODE(items) AS i FROM pedidos`
porque: `UNNEST` convierte el array en filas y la coma hace un join correlacionado con cada pedido. Es el equivalente de `explode` en Spark.

## Pub/Sub
leccion: gcp-pubsub-dataflow
Dos sistemas, analítica y antifraude, necesitan recibir **todos** los eventos de pedidos. ¿Cómo se configura en Pub/Sub?
- [ ] Una suscripción compartida entre los dos sistemas.
- [x] Un tema con dos suscripciones, una por sistema.
- [ ] Dos temas, y la app publica cada evento dos veces.
- [ ] No se puede: cada mensaje lo recibe un solo consumidor.
porque: Cada **suscripción** recibe todos los mensajes del tema. Los consumidores que comparten una misma suscripción se reparten los mensajes.

## Dataproc
leccion: gcp-dataproc-spark
¿Cuál es una buena práctica de costo con Dataproc para jobs nocturnos?
- [ ] Tener un clúster grande encendido todo el día para que los jobs arranquen al instante.
- [x] Clústeres efímeros o Dataproc Serverless, con los datos en Cloud Storage.
- [ ] Guardar los datos en los discos del clúster para no pagar Cloud Storage.
- [ ] Usar siempre las máquinas más grandes para que los jobs terminen antes.
porque: Con los datos en GCS, el clúster no guarda nada importante: se crea para el trabajo y se elimina. Solo pagas el tiempo que procesa.

## Dataform
leccion: gcp-composer-dataform
¿A qué herramienta del curso se parece más Dataform?
- [ ] Airflow
- [x] dbt
- [ ] Spark
- [ ] Terraform
porque: Dataform transforma datos dentro de BigQuery con SQL versionado, dependencias (`ref`), materializaciones y aserciones, como dbt. Composer sería el equivalente de Airflow.
