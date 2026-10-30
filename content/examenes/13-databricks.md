# examen: databricks

## Tipos de cómputo
leccion: databricks-que-es-databricks
Un job programado corre todas las noches. ¿Qué tipo de cómputo conviene?
- [ ] Un clúster all-purpose compartido que queda encendido para el equipo.
- [x] Un job cluster o cómputo serverless de jobs.
- [ ] Un SQL Warehouse, que también puede ejecutar notebooks de Python.
- [ ] La laptop de un analista, conectada a Databricks con la CLI.
porque: Los clústeres all-purpose son para trabajo interactivo y tienen un costo por DBU mayor. Los jobs programados van en cómputo de jobs, más barato y aislado.

## dbutils
leccion: databricks-notebooks-dbutils
¿Qué pasa si haces `print(dbutils.secrets.get("pg", "password"))` en un notebook?
- [ ] Se muestra la contraseña en texto plano en la salida de la celda.
- [x] Se muestra `[REDACTED]`.
- [ ] Da un error de permisos, porque los secretos no se pueden imprimir.
- [ ] El secreto se borra del scope por haberse expuesto.
porque: El ocultamiento evita filtraciones accidentales en notebooks compartidos. Igual hay que evitar escribir el secreto en archivos o logs.

## MERGE
leccion: databricks-delta-sql
Recibes un archivo con clientes nuevos y modificados. ¿Qué sentencia aplica todo en una sola operación atómica sobre la tabla Delta?
- [ ] `INSERT INTO` con todas las filas del archivo.
- [x] `MERGE INTO` con `WHEN MATCHED` y `WHEN NOT MATCHED`.
- [ ] Un `DELETE` y un `INSERT` en dos jobs separados.
- [ ] `CREATE OR REPLACE TABLE` con las filas del archivo.
porque: MERGE (upsert) actualiza los que existen e inserta los nuevos en una transacción. Reemplazar la tabla con solo el archivo nuevo perdería todos los clientes que no vinieron.

## Time travel
leccion: databricks-delta-sql
Alguien ejecutó un `DELETE` sin `WHERE` sobre `silver.pedidos` hace una hora. ¿Cómo lo recuperas?
- [ ] No se puede: un `DELETE` en Delta borra los archivos de inmediato.
- [x] Con `RESTORE TABLE ... TO VERSION AS OF` la versión anterior.
- [ ] Con `VACUUM`, que recupera los archivos borrados en la última hora.
- [ ] Reiniciando el clúster, que descarta las operaciones no confirmadas.
porque: El registro de transacciones de Delta conserva las versiones anteriores mientras `VACUUM` no haya borrado sus archivos (7 días por defecto).

## OPTIMIZE
leccion: databricks-delta-sql
Una tabla que recibe datos por streaming cada minuto está cada vez más lenta. ¿Qué es lo más probable y qué haces?
- [ ] Faltan columnas en la tabla; hay que agregar las que se consultan.
- [x] Hay miles de archivos pequeños; `OPTIMIZE` los compacta.
- [ ] Hay demasiados permisos en Unity Catalog y cada lectura los revisa todos.
- [ ] El clúster es demasiado grande y reparte la lectura entre demasiadas tareas.
porque: Cada micro-lote escribe archivos chicos. Leer miles de archivos tiene mucho costo fijo. `OPTIMIZE` los compacta en archivos grandes.

## Unity Catalog
leccion: databricks-unity-catalog
¿Cuál es el nombre completo de una tabla en Unity Catalog?
- [ ] `esquema.tabla`
- [x] `catálogo.esquema.tabla`
- [ ] `workspace.esquema.tabla`
- [ ] `metastore.catálogo.tabla`
porque: Unity Catalog usa tres niveles. Para leer una tabla, un grupo necesita `USE CATALOG`, `USE SCHEMA` y `SELECT`.

## Permisos
leccion: databricks-unity-catalog
Diste `SELECT` sobre `prod.gold.ventas` al grupo `analistas`, pero siguen sin poder leerla. ¿Qué falta?
- [ ] Reiniciar el SQL Warehouse para que tome los permisos nuevos.
- [x] `USE CATALOG` sobre `prod` y `USE SCHEMA` sobre `prod.gold`.
- [ ] Hacer pública la tabla para todos los usuarios del workspace.
- [ ] Darles el rol de administrador del workspace.
porque: Para llegar a la tabla hay que poder "entrar" al catálogo y al esquema. Es un error muy común al configurar permisos.

## Autenticación de la CLI
leccion: databricks-cli-autenticacion
¿Qué método de autenticación de la CLI de Databricks es el recomendado para tu uso personal?
- [ ] Pasar el token personal como parámetro en cada comando.
- [x] OAuth con `databricks auth login`.
- [ ] Usar el token de un compañero que ya tiene los permisos.
- [ ] Escribir la contraseña de la consola en un script.
porque: OAuth evita tokens personales de larga duración en archivos. Para CI se usa un service principal (idealmente con OIDC).

## Declarative Automation Bundles
leccion: databricks-asset-bundles
¿Qué comando despliega un bundle en el entorno de producción definido en `databricks.yml`?
- [ ] `databricks bundle init -t prod`
- [x] `databricks bundle deploy -t prod`
- [ ] `databricks jobs create --target prod`
- [ ] `databricks fs cp . dbfs:/prod --recursive`
porque: `-t` (target) elige el entorno. Antes conviene `databricks bundle validate -t prod`, y en CI se ejecuta al fusionar en `main`.

## Monitoreo
leccion: databricks-workflows-practicas
Un job falla de madrugada y nadie se entera hasta que el gerente ve el tablero vacío. ¿Qué faltaba?
- [ ] Más memoria en el clúster, para que el job no vuelva a fallar.
- [x] Notificaciones de fallo, reintentos y una alerta de frescura.
- [ ] Más tareas en el job, para que una falla no afecte a las demás.
- [ ] Un notebook más largo que registre cada paso en un comentario.
porque: Los pipelines fallan: lo importante es enterarse antes que los usuarios. Reintentos para lo transitorio, alertas para lo que necesita una persona y chequeos de frescura para lo que "terminó bien" pero no trajo datos.
