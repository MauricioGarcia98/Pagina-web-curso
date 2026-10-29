# examen: cert-azure
# id: az-dp700
# titulo: Microsoft DP-700 Fabric Data Engineer

## Capacidad saturada
leccion: cert-azure-fabric-plataforma
Las consultas interactivas de los informes empiezan a demorarse y después a rechazarse, mientras corren cargas pesadas de Spark. ¿Qué explica el comportamiento?
- [ ] OneLake alcanzó el límite de almacenamiento del tenant y bloquea las lecturas.
- [x] La capacidad entró en throttling porque el consumo superó lo que puede pagar.
- [ ] El workspace perdió la conexión con Git y bloqueó los ítems publicados.
- [ ] Los informes no tienen etiqueta de confidencialidad y se rechazan por política.
porque: Cuando el consumo suavizado excede la capacidad, Fabric primero demora y luego rechaza operaciones. Se diagnostica en Capacity Metrics.

## Separar capacidades
leccion: cert-azure-fabric-plataforma
Las pruebas de carga de desarrollo afectan el rendimiento de los informes de producción. ¿Qué cambio estructural lo evita?
- [ ] Cambiar los informes a modo de importación para que dejen de consumir la capacidad compartida.
- [x] Asignar dev y prod a capacidades distintas.
- [ ] Mover los informes de producción a un dominio separado del dominio de desarrollo.
- [ ] Desactivar la integración con Git en los workspaces de desarrollo durante las pruebas.
porque: Los ítems consumen de la capacidad de su workspace. Separar capacidades aísla el consumo de cada entorno.

## Shortcut
leccion: cert-azure-fabric-plataforma
Un lakehouse debe exponer archivos Delta que otro equipo mantiene en Amazon S3, sin copiarlos y siempre actualizados. ¿Qué usas?
- [ ] Una copy activity programada cada hora desde S3.
- [x] Un shortcut a la ubicación de S3.
- [ ] Mirroring de Amazon S3 hacia OneLake.
- [ ] Un Dataflow Gen2 con destino en el lakehouse.
porque: Los shortcuts apuntan a datos en OneLake, ADLS, S3 o GCS sin copiarlos. Mirroring es para bases de datos.

## Mirroring
leccion: cert-azure-fabric-plataforma
Hay que analizar en Fabric una base de Snowflake casi en tiempo real, sin construir pipelines ni consumir capacidad en la replicación. ¿Qué usas?
- [ ] Un shortcut a la cuenta de Snowflake.
- [x] Mirroring de Snowflake.
- [ ] Un Copy job programado cada 5 minutos.
- [ ] Un eventstream con origen en Snowflake.
porque: Mirroring replica continuamente la base a OneLake en Delta, y el cómputo de replicación no consume la capacidad.

## Warehouse
leccion: cert-azure-fabric-plataforma
Un equipo de analistas SQL debe actualizar tablas con `UPDATE` y `MERGE` y confirmar cambios en varias tablas dentro de una misma transacción. ¿Qué ítem usan?
- [ ] El SQL analytics endpoint del lakehouse.
- [x] Un warehouse.
- [ ] Una base KQL del eventhouse.
- [ ] Un modelo semántico en Direct Lake.
porque: El warehouse soporta T-SQL completo con transacciones entre tablas. El endpoint del lakehouse es de solo lectura.

## Roles
leccion: cert-azure-fabric-plataforma
Un usuario de negocio solo debe leer un informe y su modelo semántico, sin ver el resto del workspace. ¿Qué haces?
- [ ] Le das el rol Viewer en el workspace, que solo permite leer.
- [x] Compartes el informe con permisos de ítem, sin darle un rol en el workspace.
- [ ] Le das el rol Contributor y le pides que no modifique nada.
- [ ] Creas un workspace nuevo con una copia del informe para él.
porque: Los permisos de ítem dan acceso a un ítem concreto sin exponer el resto del workspace.

## Compartir
leccion: cert-azure-fabric-plataforma
¿Qué rol de workspace es el mínimo que permite **compartir** ítems con otros usuarios?
- [ ] Viewer
- [ ] Contributor
- [x] Member
- [ ] Admin
porque: Member puede compartir ítems y agregar personas con su rol o menor; Contributor solo crea y edita.

## Reglas de despliegue
leccion: cert-azure-fabric-plataforma
Al desplegar de Prueba a Producción, el modelo semántico debe apuntar al lakehouse de producción. ¿Cómo lo resuelves sin intervención manual?
- [ ] Editando a mano la conexión del modelo en producción después de cada despliegue.
- [x] Con una regla de despliegue en la etapa de producción.
- [ ] Desplegando desde una rama de Git distinta para cada entorno y cada origen de datos.
- [ ] Usando el mismo lakehouse para prueba y para producción, con carpetas separadas.
porque: Las reglas de despliegue (o las bibliotecas de variables) cambian valores por etapa automáticamente.

## Seguridad de filas
leccion: cert-azure-fabric-plataforma
En el warehouse, cada gerente regional debe ver solo las ventas de su región, sin importar con qué herramienta consulte. ¿Qué implementas?
- [ ] Una vista por región, con permisos de lectura sobre cada vista para su gerente.
- [x] Seguridad a nivel de fila: función de predicado y política de seguridad.
- [ ] Enmascaramiento dinámico de datos sobre la columna de región de la tabla de ventas.
- [ ] Un `DENY SELECT` sobre la columna región para todos los gerentes regionales.
porque: La seguridad a nivel de fila filtra las filas de la tabla según el usuario para cualquier consulta.

## Enmascaramiento
leccion: cert-azure-fabric-plataforma
Los agentes de soporte deben ver los emails de los clientes parcialmente ocultos, y los supervisores completos. ¿Qué usas?
- [ ] Seguridad a nivel de fila con un predicado por rol.
- [x] Enmascaramiento dinámico de datos y `GRANT UNMASK` a los supervisores.
- [ ] `DENY SELECT` sobre la columna email para los agentes.
- [ ] Una etiqueta de confidencialidad en la tabla de clientes.
porque: El enmascaramiento dinámico muestra el valor oculto a quien no tiene el permiso UNMASK.

## Marca de agua
leccion: cert-azure-fabric-ingesta-transformacion
Una tabla de 40 millones de filas tiene una columna `modificado`. Debes copiar cada hora solo lo nuevo o cambiado. ¿Qué patrón implementas?
- [ ] Una carga completa cada hora con sobrescritura de la tabla.
- [x] Una carga incremental con marca de agua guardada en una tabla de control.
- [ ] Un shortcut a la tabla de origen con un filtro por fecha.
- [ ] Un eventstream sobre la tabla de origen.
porque: La marca de agua registra hasta dónde se cargó y permite copiar solo el intervalo nuevo.

## Orden de la marca
leccion: cert-azure-fabric-ingesta-transformacion
En la carga incremental, ¿en qué momento se guarda la nueva marca de agua en la tabla de control?
- [ ] Antes de la copia, para que otras ejecuciones no copien el mismo intervalo.
- [x] Después de que la copia terminó bien.
- [ ] Al final del día, con la máxima fecha cargada en todas las ejecuciones.
- [ ] Nunca: el destino guarda la marca automáticamente.
porque: Si se guardara antes y la copia fallara, el intervalo se perdería.

## Borrados
leccion: cert-azure-fabric-ingesta-transformacion
La carga incremental por fecha de modificación no refleja las filas borradas en el origen Azure SQL. ¿Qué solución las captura?
- [ ] Copiar con mayor frecuencia, cada 5 minutos.
- [x] Mirroring de la base (o CDC del origen).
- [ ] Agregar un `DISTINCT` en la vista de consumo.
- [ ] Cambiar la marca de agua de fecha a un id creciente.
porque: Mirroring y CDC replican también las eliminaciones; una marca de agua solo ve filas que existen.

## Herramienta sin código
leccion: cert-azure-fabric-ingesta-transformacion
Analistas sin conocimientos de programación deben combinar dos archivos de Excel, limpiar columnas y cargar el resultado en el lakehouse. ¿Qué usan?
- [ ] Un notebook de PySpark con plantillas preparadas.
- [x] Dataflow Gen2.
- [ ] Un eventstream con transformaciones.
- [ ] Un procedimiento almacenado en el warehouse.
porque: Dataflow Gen2 usa Power Query para transformar visualmente y cargar en lakehouse o warehouse.

## SCD 2
leccion: cert-azure-fabric-ingesta-transformacion
La dimensión de productos debe conservar el precio que tenía cada producto en la fecha de cada venta. ¿Qué tipo de dimensión implementas?
- [ ] SCD tipo 1, sobrescribiendo el precio en cada carga.
- [x] SCD tipo 2, con una versión por cambio y vigencias.
- [ ] Una dimensión sin clave subrogada, unida por nombre.
- [ ] Una tabla de hechos sin dimensión de productos.
porque: SCD tipo 2 guarda cada versión con sus fechas de vigencia y una clave subrogada propia.

## Miembro inferido
leccion: cert-azure-fabric-ingesta-transformacion
Llegan ventas de productos que todavía no existen en la dimensión. No se pueden perder. ¿Qué haces?
- [ ] Descartar esas ventas hasta que el producto aparezca en la dimensión de productos.
- [x] Insertar un miembro inferido y completarlo cuando llegue el producto.
- [ ] Cargar las ventas con una clave de producto nula y no volver a revisarlas.
- [ ] Recargar toda la tabla de hechos cada vez que se agrega un producto a la dimensión.
porque: El miembro inferido da una clave válida al hecho y se actualiza cuando llegan los datos completos.

## Entre bases
leccion: cert-azure-fabric-ingesta-transformacion
El warehouse debe combinar sus tablas con una tabla del lakehouse del mismo workspace sin copiarla. ¿Cómo?
- [ ] Copiando la tabla del lakehouse con una copy activity diaria.
- [x] Con una consulta entre bases usando nombres de tres partes.
- [ ] Creando un shortcut del warehouse al lakehouse.
- [ ] Exportando la tabla del lakehouse a CSV.
porque: El warehouse puede consultar el SQL analytics endpoint del lakehouse con `base.esquema.tabla`.

## Alerta en tiempo real
leccion: cert-azure-fabric-ingesta-transformacion
Los eventos de sensores llegan por Event Hubs. Hay que enviar un aviso a Teams en segundos cuando una lectura supera un umbral. ¿Qué arquitectura usas?
- [ ] Un pipeline cada minuto que consulta una tabla del lakehouse.
- [x] Un eventstream con destino Activator y una regla sobre la lectura.
- [ ] Un Dataflow Gen2 programado con un filtro por umbral.
- [ ] Mirroring de Event Hubs a OneLake.
porque: Eventstream lleva los eventos a Activator, que evalúa reglas y dispara acciones en tiempo real.

## Ventanas
leccion: cert-azure-fabric-ingesta-transformacion
Necesitas contar eventos en intervalos fijos de 10 minutos, sin superposición. ¿Qué tipo de ventana es?
- [ ] Hopping
- [x] Tumbling
- [ ] Session
- [ ] Sliding
porque: Las ventanas tumbling son intervalos consecutivos de largo fijo que no se superponen.

## KQL
leccion: cert-azure-fabric-ingesta-transformacion
¿Qué consulta KQL devuelve el promedio de temperatura por sensor cada 5 minutos en la última hora?
- [ ] `Lecturas | where timestamp > ago(1h) | group by sensor, every 5m | avg(temperatura)`
- [x] `Lecturas | where timestamp > ago(1h) | summarize avg(temperatura) by sensor, bin(timestamp, 5m)`
- [ ] `Lecturas | summarize avg(temperatura) by sensor | where timestamp > ago(5m)`
- [ ] `Lecturas | where timestamp > ago(5m) | summarize avg(temperatura) by bin(sensor, 1h)`
porque: `summarize ... by bin(timestamp, 5m)` agrupa en intervalos de 5 minutos, y el `where` limita a la última hora.

## Ejecuciones
leccion: cert-azure-fabric-monitoreo-optimizacion
Necesitas ver en un solo lugar las ejecuciones fallidas de pipelines, notebooks y dataflows de varios workspaces. ¿Qué usas?
- [ ] La app Capacity Metrics.
- [x] El Monitoring hub.
- [ ] El historial de Git de cada workspace.
- [ ] Query insights del warehouse.
porque: El Monitoring hub reúne las ejecuciones de los distintos ítems a los que el usuario tiene acceso.

## Dependencias
leccion: cert-azure-fabric-monitoreo-optimizacion
En un pipeline, la actividad "Alerta" depende *On failure* de "Copiar" y de "Notebook". Solo falla "Copiar". ¿Qué pasa?
- [ ] "Alerta" se ejecuta, porque basta con que falle una dependencia.
- [x] "Alerta" no se ejecuta, porque las dependencias se combinan con Y.
- [ ] "Alerta" se ejecuta después de que "Notebook" termine bien.
- [ ] El pipeline queda en espera hasta que alguien lo reanude.
porque: Varias dependencias de una actividad deben cumplirse todas. Para avisar ante cualquier falla se usa una alerta por actividad.

## V-Order
leccion: cert-azure-fabric-monitoreo-optimizacion
Una tabla del lakehouse se escribe una vez por noche y la consultan todo el día informes en Direct Lake, que van lentos. ¿Qué aplicas?
- [ ] Particionar la tabla por cliente para que cada informe lea menos.
- [x] V-Order al escribir y `OPTIMIZE` para compactar.
- [ ] `VACUUM` con retención de 0 horas.
- [ ] Mover la tabla a un eventhouse.
porque: V-Order optimiza los Parquet para lecturas desde Power BI y SQL; conviene en tablas de lectura intensiva.

## Archivos chicos
leccion: cert-azure-fabric-monitoreo-optimizacion
Una tabla que recibe datos por streaming tiene 120.000 archivos de pocos KB y sus consultas son lentas. ¿Qué haces primero?
- [ ] Aumentar el tamaño de la capacidad.
- [x] Compactar con `OPTIMIZE` y activar la escritura optimizada.
- [ ] Recrear la tabla particionada por minuto.
- [ ] Cambiar el formato de la tabla a CSV.
porque: Muchos archivos pequeños tienen alto costo de apertura. OPTIMIZE los compacta y la escritura optimizada los previene.

## Caché del eventhouse
leccion: cert-azure-fabric-monitoreo-optimizacion
Las consultas de los últimos 14 días deben ser rápidas, y los datos deben conservarse 3 años. ¿Qué configuras en el eventhouse?
- [ ] Retención de 14 días y una copia mensual a un lakehouse.
- [x] Política de caché de 14 días y política de retención de 3 años.
- [ ] Una vista materializada con 3 años de datos crudos.
- [ ] Una política de partición por 14 días.
porque: La caché caliente acelera los datos recientes y la retención define cuánto se conservan.

## @caso farmacias: Farmacias del Litoral
Farmacias del Litoral tiene 320 sucursales y migró su analítica a Microsoft Fabric con una capacidad F64. Hay tres workspaces (Ventas-Dev, Ventas-Test, Ventas-Prod) conectados a Git y a una canalización de despliegue.

Situación actual:
- Las ventas llegan cada noche desde una base Azure SQL; el stock de proveedores está en un ADLS Gen2 de otro equipo.
- Los lectores de temperatura de las heladeras de vacunas envían un evento cada 10 segundos.
- Los martes a las 9 los informes de Power BI tardan mucho o fallan y, a la misma hora, corre un notebook pesado de recálculo de precios.
- Los gerentes regionales solo deben ver las ventas de su región en el warehouse.

## Informes lentos los martes
leccion: cert-azure-fabric-monitoreo-optimizacion
dominio: 3
caso: farmacias
¿Cómo confirmas la causa de la lentitud de los martes?
- [ ] Revisando el historial de Git del workspace de producción para ver qué cambió el martes.
- [x] Con la app Fabric Capacity Metrics, viendo el uso de CU y el throttling en ese horario.
- [ ] Mirando el tamaño de las tablas del lakehouse en el explorador.
- [ ] Revisando las reglas de la canalización de despliegue.
porque: Capacity Metrics muestra el consumo por ítem y operación y si hubo demora o rechazo por exceso de uso.

## Temperatura de las heladeras
leccion: cert-azure-fabric-ingesta-transformacion
dominio: 2
caso: farmacias
Hay que guardar las lecturas de temperatura para analizarlas con KQL y avisar al farmacéutico si una heladera supera los 8 °C. ¿Qué arquitectura usas?
- [ ] Un pipeline programado cada minuto que copia las lecturas a un warehouse y un informe que se actualiza solo.
- [x] Un eventstream con destino eventhouse para el análisis y destino Activator para la alerta.
- [ ] Un Dataflow Gen2 con actualización incremental cada 10 segundos.
- [ ] Un notebook que lee los dispositivos con un bucle infinito.
porque: Eventstream captura y enruta eventos en tiempo real; el eventhouse los almacena para KQL y Activator dispara acciones con reglas.

## Stock del otro equipo
leccion: cert-azure-fabric-plataforma
dominio: 1
caso: farmacias
¿Cómo usas los archivos de stock del ADLS del otro equipo sin copiarlos?
- [ ] Con una copy activity diaria hacia la sección Files del lakehouse, borrando lo anterior.
- [x] Con un shortcut a ADLS Gen2 en el lakehouse.
- [ ] Con mirroring del ADLS Gen2 completo.
- [ ] Con un eventstream que lee los archivos.
porque: Un shortcut expone los datos de ADLS en OneLake sin moverlos; los permisos del origen se respetan.

## Región del gerente
leccion: cert-azure-fabric-plataforma
dominio: 1
caso: farmacias
¿Cómo limitas a cada gerente a las ventas de su región en el warehouse?
- [ ] Creando un warehouse por región y copiando las ventas de cada una en el suyo.
- [x] Con seguridad de nivel de fila: una función de predicado y una política de seguridad.
- [ ] Con enmascaramiento dinámico de la columna región.
- [ ] Con el rol Viewer del workspace.
porque: La seguridad de filas filtra según el usuario que consulta con una función y una `SECURITY POLICY`.

## Roles del workspace
leccion: cert-azure-fabric-plataforma
dominio: 1
Un analista debe poder crear y editar ítems en el workspace, pero no administrar permisos ni compartir el workspace. ¿Qué rol le das?
- [ ] Admin.
- [ ] Member.
- [x] Contributor.
- [ ] Viewer.
porque: Contributor crea y edita contenido; Member además puede compartir y agregar usuarios con permisos menores; Admin administra todo.

## Entorno de Spark
leccion: cert-azure-fabric-plataforma
dominio: 1
Varios notebooks necesitan la misma librería de Python y la misma configuración de Spark. ¿Dónde la defines una sola vez?
- [ ] En la primera celda de cada notebook con `%pip install`, en cada ejecución del pipeline.
- [x] En un ítem Environment asociado a los notebooks o como predeterminado del workspace.
- [ ] En la configuración de la capacidad.
- [ ] En el lakehouse.
porque: Los environments agrupan librerías y propiedades de Spark y se adjuntan a notebooks y jobs.

## Arranque rápido de Spark
leccion: cert-azure-fabric-plataforma
dominio: 1
Los notebooks tardan varios minutos en arrancar porque usan un pool personalizado. ¿Qué opción da sesiones en segundos para cargas comunes?
- [ ] Aumentar el número máximo de nodos del pool personalizado para que arranque más rápido.
- [x] Usar el starter pool, que mantiene nodos listos.
- [ ] Desactivar el autoescalado.
- [ ] Ejecutar el notebook desde un pipeline.
porque: El starter pool tiene clústeres precalentados y las sesiones inician en segundos; los pools personalizados se crean bajo demanda.

## Sesiones compartidas
leccion: cert-azure-fabric-plataforma
dominio: 1
Un pipeline ejecuta 20 notebooks pequeños y cada uno abre su propia sesión de Spark. ¿Qué reduce el tiempo y el consumo?
- [ ] Ejecutar los notebooks en serie, uno detrás del otro, con más nodos en el pool del workspace.
- [x] El modo de alta concurrencia, para compartir sesiones de Spark entre notebooks.
- [ ] Un Dataflow Gen2 por notebook.
- [ ] Un eventstream.
porque: Alta concurrencia permite que varios notebooks compartan la misma sesión de Spark.

## Base de datos como código
leccion: cert-azure-fabric-plataforma
dominio: 1
El esquema del warehouse (tablas, vistas, procedimientos) debe versionarse y desplegarse como código. ¿Qué usas?
- [ ] Copias de seguridad del warehouse guardadas en OneLake después de cada cambio.
- [x] Un proyecto de base de datos SQL (database project) integrado con Git.
- [ ] Un notebook con el esquema escrito en comentarios.
- [ ] Un shortcut al warehouse de desarrollo.
porque: Los proyectos de base de datos describen el esquema como código, se versionan y se despliegan con herramientas de CI/CD.

## Etiquetas de confidencialidad
leccion: cert-azure-fabric-plataforma
dominio: 1
Los datos de clientes deben marcarse como confidenciales y esa marca debe seguir a los informes y archivos exportados. ¿Qué usas?
- [ ] Un prefijo "CONF_" en el nombre de cada tabla y de cada informe.
- [x] Etiquetas de confidencialidad de Microsoft Purview.
- [ ] Respaldo (endorsement) como Certificado.
- [ ] Seguridad de filas.
porque: Las etiquetas de Purview se heredan entre ítems y se mantienen en exportaciones compatibles.

## Certificar un ítem
leccion: cert-azure-fabric-plataforma
dominio: 1
¿Cómo indicas a los usuarios que un modelo semántico es la fuente oficial y confiable?
- [ ] Moviéndolo a un workspace con el nombre "Oficial" y quitando los demás ítems.
- [x] Con el respaldo (endorsement) Certificado, otorgado por revisores autorizados.
- [ ] Con una etiqueta de confidencialidad.
- [ ] Con un shortcut.
porque: El respaldo Promovido o Certificado ayuda a descubrir contenido confiable; Certificado requiere autorización.

## Dominios
leccion: cert-azure-fabric-plataforma
dominio: 1
La empresa quiere agrupar los workspaces por área de negocio (Ventas, Finanzas, RR. HH.) con administradores propios, al estilo data mesh. ¿Qué usa?
- [ ] Una capacidad por área, sin otra configuración en el tenant.
- [x] Dominios de Fabric.
- [ ] Carpetas dentro de un workspace.
- [ ] Etiquetas de confidencialidad.
porque: Los dominios agrupan workspaces por área, con administradores y configuraciones delegadas.

## Copy job
leccion: cert-azure-fabric-ingesta-transformacion
dominio: 2
Hay que copiar 30 tablas de una base SQL a un lakehouse con carga incremental, sin diseñar un pipeline. ¿Qué ítem usas?
- [ ] Un eventstream con 30 orígenes de base de datos.
- [x] Un Copy job con modo incremental.
- [ ] Un notebook por tabla.
- [ ] Un shortcut a la base SQL.
porque: Copy job simplifica la copia de muchas tablas, completa o incremental, sin construir actividades.

## Lookup y ForEach
leccion: cert-azure-fabric-ingesta-transformacion
dominio: 2
Un pipeline debe copiar las tablas listadas en una tabla de configuración. ¿Qué actividades combinas?
- [ ] Una actividad Wait seguida de 30 actividades Copy fijas, una por cada tabla configurada.
- [x] Lookup para leer la lista y ForEach con una actividad Copy parametrizada.
- [ ] Un Dataflow Gen2 por tabla.
- [ ] Set variable y Fail.
porque: Lookup devuelve la lista y ForEach itera ejecutando la copia con parámetros por tabla.

## Pipeline por evento
leccion: cert-azure-fabric-ingesta-transformacion
dominio: 2
Un pipeline debe ejecutarse cuando llega un archivo a una cuenta de almacenamiento de Azure. ¿Qué disparador usas?
- [ ] Una programación cada minuto que revisa si hay archivos nuevos en la cuenta.
- [x] Un disparador de eventos de almacenamiento (desde Real-Time hub/Activator).
- [ ] Un shortcut con actualización automática.
- [ ] Una canalización de despliegue.
porque: Los eventos de Azure Storage pueden disparar pipelines en Fabric al crearse un archivo.

## Fast copy
leccion: cert-azure-fabric-ingesta-transformacion
dominio: 2
Un Dataflow Gen2 tarda horas en cargar 200 millones de filas sin transformaciones complejas. ¿Qué opción acelera la carga?
- [ ] Agregar más pasos de Power Query para dividir los datos en lotes más chicos.
- [x] Habilitar fast copy en el dataflow.
- [ ] Cambiar el destino a un archivo CSV.
- [ ] Desactivar el staging y el destino.
porque: Fast copy usa el motor de copy activity para mover grandes volúmenes en los dataflows.

## T-SQL en el warehouse
leccion: cert-azure-fabric-ingesta-transformacion
dominio: 2
Hay que cargar archivos Parquet de OneLake en una tabla del warehouse con T-SQL. ¿Qué instrucción usas?
- [ ] `BULK INSERT` desde una carpeta local del equipo del desarrollador.
- [x] `COPY INTO` (o `INSERT ... SELECT` desde `OPENROWSET`).
- [ ] `CREATE SHORTCUT`.
- [ ] `MERGE` sin tabla de origen.
porque: `COPY INTO` carga archivos desde almacenamiento de forma eficiente en el warehouse.

## Streaming con Spark
leccion: cert-azure-fabric-ingesta-transformacion
dominio: 2
Hay que procesar un flujo de Event Hubs con lógica compleja en PySpark y escribir en una tabla Delta del lakehouse. ¿Qué usas?
- [ ] Un Dataflow Gen2 con actualización programada cada minuto.
- [x] Spark Structured Streaming en un notebook o Spark job definition, con checkpoint.
- [ ] Una copy activity en un ForEach.
- [ ] Un shortcut a Event Hubs.
porque: Structured Streaming procesa flujos con estado y garantiza la entrega con checkpoints.

## Política de actualización de KQL
leccion: cert-azure-fabric-ingesta-transformacion
dominio: 2
En el eventhouse, los eventos crudos deben transformarse automáticamente al llegar y guardarse en otra tabla. ¿Qué usas?
- [ ] Un pipeline programado que ejecuta una consulta KQL cada cinco minutos.
- [x] Una update policy en la tabla destino.
- [ ] Un shortcut.
- [ ] Una vista materializada de T-SQL.
porque: La update policy ejecuta una consulta sobre los datos nuevos de la tabla origen y escribe el resultado en la tabla destino.

## Ventana deslizante
leccion: cert-azure-fabric-ingesta-transformacion
dominio: 2
¿Qué tipo de ventana calcula el promedio de los últimos 10 minutos, actualizado cada minuto?
- [ ] Tumbling (saltante), que agrupa en intervalos fijos de 10 minutos sin superposición.
- [x] Hopping (deslizante con salto), de 10 minutos con salto de 1 minuto.
- [ ] Session, que se cierra por inactividad.
- [ ] Snapshot.
porque: Las ventanas hopping se superponen: tamaño de 10 minutos que avanza cada minuto.

## Join de tablas en lakehouse
leccion: cert-azure-fabric-ingesta-transformacion
dominio: 2
¿Qué dos herramientas pueden transformar datos de un lakehouse y escribir tablas Delta en él?
- [x] Notebooks de PySpark.
- [x] Dataflow Gen2 con destino lakehouse.
- [ ] El SQL analytics endpoint del lakehouse con `INSERT`.
- [ ] Un informe de Power BI.
- [ ] Una regla de Activator.
porque: El SQL analytics endpoint del lakehouse es de solo lectura; notebooks y dataflows sí escriben.

## Monitoring hub
leccion: cert-azure-fabric-monitoreo-optimizacion
dominio: 3
¿Dónde ves en un solo lugar el estado de las ejecuciones de pipelines, notebooks y dataflows de varios workspaces?
- [ ] En el historial de Git de cada workspace, filtrando por fecha.
- [x] En el Monitoring hub.
- [ ] En la canalización de despliegue.
- [ ] En el explorador de OneLake.
porque: El Monitoring hub centraliza las ejecuciones de los ítems a los que el usuario tiene acceso.

## Falla de una copy activity
leccion: cert-azure-fabric-monitoreo-optimizacion
dominio: 3
Una copy activity falla con un error de conversión de tipos en una columna de fecha. ¿Qué haces?
- [ ] Reintentar la actividad cinco veces seguidas hasta que el error desaparezca.
- [x] Revisar el detalle del error de la ejecución y corregir el mapeo de columnas o el formato de fecha.
- [ ] Aumentar la capacidad a F128.
- [ ] Borrar la tabla destino.
porque: Los errores de conversión se corrigen con el mapeo de tipos o el formato; reintentar no cambia el resultado.

## Reintentos
leccion: cert-azure-fabric-monitoreo-optimizacion
dominio: 3
Una actividad que llama a una API externa falla a veces por errores temporales. ¿Qué configuras?
- [ ] Una actividad Fail que detiene el pipeline ante cualquier error de la API externa.
- [x] Reintentos con intervalo en la actividad.
- [ ] Un shortcut a la API.
- [ ] Una regla de despliegue.
porque: Los reintentos absorben fallas transitorias sin intervención manual.

## Errores de notebook
leccion: cert-azure-fabric-monitoreo-optimizacion
dominio: 3
Un notebook llamado desde un pipeline falla. ¿Dónde encuentras el error de Python completo?
- [ ] En el Capacity Metrics, en la columna de operaciones rechazadas.
- [x] En la ejecución del notebook (snapshot del run) y los logs de Spark desde el Monitoring hub.
- [ ] En el historial de la canalización de despliegue.
- [ ] En las etiquetas de confidencialidad.
porque: Cada ejecución guarda una instantánea del notebook con las salidas y los logs del driver.

## Query insights
leccion: cert-azure-fabric-monitoreo-optimizacion
dominio: 3
¿Qué vistas del warehouse muestran las consultas más largas y más frecuentes de los últimos días?
- [ ] Las vistas `sys.tables` y `sys.columns` del warehouse.
- [x] Las vistas de `queryinsights` (por ejemplo, `exec_requests_history` y `long_running_queries`).
- [ ] El Monitoring hub.
- [ ] El historial de Git.
porque: Query insights guarda el historial de consultas con duración, recursos y texto.

## Estadísticas
leccion: cert-azure-fabric-monitoreo-optimizacion
dominio: 3
Después de una carga masiva, los planes de consulta del warehouse son malos. ¿Qué ayuda?
- [ ] Borrar y recrear las tablas del warehouse después de cada carga masiva.
- [x] Actualizar las estadísticas de las columnas usadas en filtros y joins.
- [ ] Aplicar V-Order a los informes.
- [ ] Usar enmascaramiento dinámico.
porque: Las estadísticas desactualizadas llevan al optimizador a estimaciones malas; actualizarlas mejora los planes.

## Mantenimiento de tablas
leccion: cert-azure-fabric-monitoreo-optimizacion
dominio: 3
¿Qué dos operaciones del mantenimiento de tablas del lakehouse mejoran la lectura y liberan espacio?
- [x] `OPTIMIZE` (con V-Order) para compactar archivos.
- [x] `VACUUM` para borrar archivos que ya no referencia la tabla.
- [ ] `DROP TABLE` y volver a crearla cada semana.
- [ ] Cambiar el formato a CSV.
- [ ] Desactivar el registro de transacciones.
porque: OPTIMIZE compacta y ordena; VACUUM elimina archivos viejos fuera del período de retención.

## Escritura optimizada
leccion: cert-azure-fabric-monitoreo-optimizacion
dominio: 3
Un notebook escribe miles de archivos chicos en cada carga. ¿Qué opción de Spark lo evita al escribir?
- [ ] Aumentar `spark.sql.shuffle.partitions` a 10.000 para escribir más rápido.
- [x] Optimized write (`spark.microsoft.delta.optimizeWrite.enabled`).
- [ ] Desactivar V-Order.
- [ ] Escribir en la sección Files en CSV.
porque: Optimized write agrupa los datos antes de escribir para producir menos archivos y más grandes.

## Motor nativo
leccion: cert-azure-fabric-monitoreo-optimizacion
dominio: 3
¿Qué opción de Fabric acelera consultas de Spark SQL y DataFrames sin cambiar el código?
- [ ] Convertir los notebooks a Dataflow Gen2 para que los ejecute Power Query.
- [x] El native execution engine (motor de ejecución nativo vectorizado).
- [ ] Un shortcut a otro lakehouse.
- [ ] La canalización de despliegue.
porque: El native execution engine ejecuta operaciones de Spark en código nativo vectorizado.

## Eventhouse lento
leccion: cert-azure-fabric-monitoreo-optimizacion
dominio: 3
Las consultas KQL sobre los últimos 7 días son lentas porque los datos están en almacenamiento frío. ¿Qué ajustas?
- [ ] La retención de la tabla a 1 día para que quede menos información.
- [x] La política de caché (hot cache) a 7 días o más.
- [ ] El tamaño de la capacidad del workspace de desarrollo.
- [ ] Las etiquetas de confidencialidad.
porque: La política de caché define cuántos días quedan en almacenamiento rápido para consultas.

## Agregación en KQL
leccion: cert-azure-fabric-monitoreo-optimizacion
dominio: 3
Un tablero en tiempo real consulta cada minuto el promedio por sensor y hora sobre millones de filas. ¿Qué lo acelera?
- [ ] Copiar la tabla completa a un warehouse cada minuto con un pipeline programado.
- [x] Una vista materializada de KQL con la agregación.
- [ ] Una update policy que borra los datos viejos.
- [ ] Bajar la retención.
porque: La vista materializada mantiene la agregación precalculada y actualizada.

## Alerta de pipeline
leccion: cert-azure-fabric-monitoreo-optimizacion
dominio: 3
Hay que avisar por Teams cuando falla cualquier ejecución de un pipeline crítico. ¿Qué configuras?
- [ ] Un informe que muestra las fallas y que alguien revisa cada mañana.
- [x] Una regla de Activator sobre los eventos de ejecución del ítem (o una actividad de Teams en la rama de falla).
- [ ] Un shortcut.
- [ ] Un environment.
porque: Activator reacciona a eventos de ítems de Fabric; también se puede notificar desde el pipeline en caso de error.

## Throttling
leccion: cert-azure-fabric-monitoreo-optimizacion
dominio: 3
¿Qué ocurre primero cuando el consumo acumulado de una capacidad supera lo que puede absorber el suavizado?
- [ ] Se rechazan de inmediato todas las operaciones en segundo plano de la capacidad.
- [x] Se demoran las operaciones interactivas; si sigue, se rechazan.
- [ ] Se borra la capacidad.
- [ ] Se desactiva OneLake.
porque: Fabric aplica penalizaciones progresivas: demora interactiva, rechazo interactivo y luego rechazo en segundo plano.

## Separar cargas
leccion: cert-azure-fabric-monitoreo-optimizacion
dominio: 3
El notebook de precios de los martes compite con los informes. ¿Qué solución estructural evita que vuelva a pasar?
- [ ] Pedir a los usuarios de los informes que no los abran los martes por la mañana.
- [x] Mover el notebook a otro horario o a otra capacidad separada de la de informes.
- [ ] Desactivar V-Order en las tablas.
- [ ] Cambiar el rol de los usuarios a Viewer.
porque: Separar cargas por horario o capacidad evita que una operación pesada consuma las CU de los informes.
