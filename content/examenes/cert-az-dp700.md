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

## OneLake
leccion: cert-azure-fabric-plataforma
dominio: 1
Una empresa nueva en Fabric pregunta cuántos data lakes tiene que crear para sus cinco workspaces. ¿Qué respondes?
- [ ] Uno por workspace, cada uno con su propia cuenta de ADLS.
- [x] Ninguno: el tenant tiene un único OneLake y cada workspace es una carpeta dentro de él.
- [ ] Uno por capacidad, que se crea automáticamente al comprar la SKU F en Azure.
- [ ] Uno por lakehouse, porque cada lakehouse guarda sus datos aparte de OneLake.
porque: OneLake es un único lago lógico por tenant, basado en ADLS Gen2. Workspaces e ítems son carpetas dentro de él.

## Integración con Git
leccion: cert-azure-fabric-plataforma
dominio: 1
El equipo quiere versionar notebooks, pipelines y el warehouse de su workspace de desarrollo. ¿Qué usan?
- [ ] Exportar cada ítem a mano como archivo y subirlo por correo.
- [ ] Los puntos de restauración del warehouse, que guardan cada versión de notebooks y pipelines.
- [x] La integración de Git del workspace con Azure DevOps o GitHub, trabajando en ramas.
- [ ] Una deployment pipeline con una sola etapa.
porque: La integración de Git conecta el workspace a una rama; los cambios se confirman y se actualizan desde la interfaz de Fabric.

## Etapas de despliegue
leccion: cert-azure-fabric-plataforma
dominio: 1
Los ítems probados en el workspace de pruebas deben pasar a producción sin recrearlos a mano. ¿Qué herramienta de Fabric usan?
- [x] Deployment pipelines (desarrollo → pruebas → producción).
- [ ] Shortcuts entre los workspaces.
- [ ] Mirroring del workspace de pruebas.
- [ ] Copiar y pegar cada ítem desde el explorador de OneLake.
porque: Las deployment pipelines comparan etapas y despliegan los ítems de un workspace al siguiente, con reglas para cambiar conexiones por etapa.

## Identidad del workspace
leccion: cert-azure-fabric-plataforma
dominio: 1
Un shortcut a una cuenta de ADLS con firewall debe autenticarse sin usar la cuenta de una persona. ¿Qué configuran?
- [ ] La clave de la cuenta de almacenamiento pegada en el notebook.
- [ ] La cuenta personal del administrador de Fabric.
- [ ] Un token SAS que nunca vence, guardado en la configuración del shortcut.
- [x] Una identidad del workspace (workspace identity) con permisos sobre la cuenta.
porque: La workspace identity es una identidad administrada asociada al workspace; se le dan permisos en Azure y se usa para conectarse sin depender de una persona.

## Roles de acceso a OneLake
leccion: cert-azure-fabric-plataforma
dominio: 1
Un grupo debe leer solo la carpeta `Tables/ventas` de un lakehouse, no el resto. ¿Qué usas?
- [ ] El rol Viewer del workspace, que ya restringe por carpeta.
- [x] La seguridad de OneLake (roles de acceso a datos) sobre esa carpeta.
- [ ] Un shortcut en otro workspace sin permisos.
- [ ] Cambiar el nombre de las demás carpetas para que no las encuentren.
porque: Los roles de seguridad de OneLake dan acceso a carpetas o tablas concretas de un lakehouse. Los roles del workspace dan acceso a todo el workspace.

## Bibliotecas de Spark
leccion: cert-azure-fabric-plataforma
dominio: 1
Varios notebooks necesitan la misma versión de una biblioteca de Python y la misma configuración de Spark. ¿Dónde se define una vez?
- [ ] En la primera celda de cada notebook con `pip install`.
- [ ] En la capacidad, desde el portal de Azure, donde se instalan bibliotecas para todos.
- [x] En un ítem Environment, asociado a los notebooks o como predeterminado del workspace.
- [ ] En el warehouse, con un procedimiento almacenado.
porque: Un Environment agrupa bibliotecas, configuración de Spark y pool; se adjunta a notebooks y definiciones de trabajos de Spark.

## Mascaramiento dinámico
leccion: cert-azure-fabric-plataforma
dominio: 1
En el warehouse, los analistas deben ver los correos como `aXXX@XXXX.com`, pero el equipo de soporte los ve completos. ¿Qué configuras?
- [ ] Una vista distinta por equipo con `REPLACE`.
- [ ] Un rol de OneLake que oculta la carpeta del warehouse.
- [ ] Cifrar la columna con una clave que solo tiene el equipo de soporte en su computadora.
- [x] Dynamic data masking con la función `email()` y el permiso `UNMASK` para soporte.
porque: El enmascaramiento dinámico oculta el valor al consultar según los permisos; `UNMASK` permite ver el valor real.

## Seguridad por columna
leccion: cert-azure-fabric-plataforma
dominio: 1
Los analistas no deben poder leer la columna `salario` de `dbo.empleados` en el warehouse, pero sí el resto. ¿Qué es lo más directo?
- [x] `GRANT SELECT ON dbo.empleados (id, nombre, area) TO analistas`
- [ ] Borrar la columna `salario`.
- [ ] Poner a los analistas como Viewer del workspace.
- [ ] Un filtro de seguridad de filas que oculte las filas con `salario` alto.
porque: La seguridad a nivel de columna se define con `GRANT` sobre columnas específicas; quien no tiene permiso recibe error al pedir `salario`.

## Promover y certificar
leccion: cert-azure-fabric-plataforma
dominio: 1
Un modelo semántico revisado por el equipo central debe destacarse como fuente oficial frente a copias hechas por otros. ¿Qué haces?
- [ ] Ponerle "OFICIAL" en el nombre.
- [ ] Moverlo a un workspace con otro color y avisar por correo a todos los usuarios.
- [x] Certificarlo (endoso), algo que solo hacen revisores autorizados.
- [ ] Bloquear las copias desde la capacidad.
porque: El endoso tiene dos niveles: promovido (cualquiera con permisos) y certificado (solo revisores autorizados en la configuración del tenant).

## Load to tables
leccion: cert-azure-fabric-ingesta-transformacion
dominio: 2
Un analista subió un CSV a la sección Files de un lakehouse y quiere consultarlo con SQL en dos clics. ¿Qué usa?
- [ ] Un shortcut del archivo a sí mismo.
- [ ] Mirroring del lakehouse.
- [ ] Una deployment pipeline.
- [x] La opción "Load to Tables" sobre el archivo.
porque: "Load to Tables" convierte archivos CSV o Parquet en tablas Delta, visibles en el SQL analytics endpoint.

## Endpoint de solo lectura
leccion: cert-azure-fabric-ingesta-transformacion
dominio: 2
Desde el SQL analytics endpoint de un lakehouse alguien intenta `INSERT INTO ventas ...` y falla. ¿Por qué?
- [x] El SQL analytics endpoint del lakehouse es de solo lectura.
- [ ] Porque falta el permiso `INSERT` en el rol del workspace, que viene desactivado.
- [ ] Porque las tablas del lakehouse no son Delta.
- [ ] Porque el endpoint solo acepta KQL.
porque: El endpoint SQL expone las tablas Delta del lakehouse para consultas T-SQL de lectura. Para DML con T-SQL se usa un warehouse.

## Consulta entre bases
leccion: cert-azure-fabric-ingesta-transformacion
dominio: 2
En el warehouse `wh_ventas` quieres unir con la tabla `clientes` del lakehouse `lh_crm` del mismo workspace. ¿Qué haces?
- [ ] Copiar `clientes` al warehouse cada noche.
- [ ] Crear un shortcut en el warehouse.
- [x] Una consulta entre bases con nombre de tres partes: `lh_crm.dbo.clientes`.
- [ ] Exportar las dos tablas a un modelo de Power BI y hacer la unión con una relación.
porque: En Fabric, un warehouse puede consultar otros warehouses y endpoints SQL del mismo workspace con nombres de tres partes.

## COPY INTO en el warehouse
leccion: cert-azure-fabric-ingesta-transformacion
dominio: 2
Hay que cargar 200 archivos Parquet desde ADLS a una tabla del warehouse con T-SQL, de la forma más eficiente. ¿Qué usas?
- [ ] Un `INSERT ... VALUES` por cada fila.
- [x] `COPY INTO dbo.ventas FROM 'https://.../*.parquet' WITH (FILE_TYPE = 'PARQUET')`
- [ ] `BULK INSERT` desde el disco de tu computadora.
- [ ] Un Dataflow Gen2 que lee un archivo por vez y lo agrega a la tabla.
porque: `COPY INTO` es la forma de alto rendimiento para ingerir archivos externos en el warehouse.

## CTAS
leccion: cert-azure-fabric-ingesta-transformacion
dominio: 2
Quieres crear `dbo.ventas_2025` en el warehouse con el resultado de una consulta, en un paso. ¿Qué sentencia usas?
- [ ] `SELECT ... INTO OUTFILE`
- [ ] `CREATE VIEW dbo.ventas_2025 AS ...`, que guarda los datos.
- [ ] `MERGE dbo.ventas_2025 ...` sobre una tabla que no existe.
- [x] `CREATE TABLE dbo.ventas_2025 AS SELECT ...` (CTAS).
porque: CTAS crea la tabla y la carga con el resultado de la consulta. Una vista no guarda datos.

## Shortcut a S3
leccion: cert-azure-fabric-ingesta-transformacion
dominio: 2
Los datos de un socio están en un bucket de Amazon S3. Quieres consultarlos desde un lakehouse sin copiarlos. ¿Qué usas?
- [ ] Mirroring de Amazon S3.
- [x] Un shortcut de OneLake a S3.
- [ ] Un Copy job que corre cada minuto.
- [ ] Eventstream con S3 como destino.
porque: Los shortcuts apuntan a datos en ADLS, S3, Google Cloud Storage y otros sin moverlos. (Pueden usar caché para bajar costos de salida.)

## Mirroring de Azure SQL
leccion: cert-azure-fabric-ingesta-transformacion
dominio: 2
Una base Azure SQL de producción debe estar replicada casi en tiempo real en OneLake como Delta, sin construir pipelines. ¿Qué usas?
- [ ] Un shortcut a la base de datos.
- [ ] Un dataflow programado cada hora.
- [x] Mirroring de Azure SQL Database.
- [ ] Exportar backups `.bacpac` a OneLake.
porque: Mirroring replica de forma continua los cambios de la base en tablas Delta de OneLake, listas para consultar.

## Carga incremental con marca
leccion: cert-azure-fabric-ingesta-transformacion
dominio: 2
Un pipeline debe copiar solo las filas nuevas de una tabla de origen con columna `modificado`. ¿Qué patrón usas?
- [x] Lookup de la última marca, Copy con `modificado > marca` y guardar la nueva marca.
- [ ] Copiar la tabla entera en cada corrida y borrar los duplicados después con un notebook.
- [ ] Copy con `TOP 1000` ordenado al azar.
- [ ] Un shortcut, que solo trae lo nuevo.
porque: Es el patrón de marca de agua: se guarda el máximo procesado y la siguiente corrida filtra por encima de ese valor.

## Parámetros del pipeline
leccion: cert-azure-fabric-ingesta-transformacion
dominio: 2
El mismo pipeline debe copiar tablas distintas según quién lo invoque. ¿Cómo lo haces reutilizable?
- [ ] Un pipeline por tabla.
- [ ] Editar el pipeline antes de cada corrida.
- [ ] Una variable de entorno de Windows en la máquina del gateway de datos.
- [x] Parámetros del pipeline usados en expresiones como `@pipeline().parameters.tabla`.
porque: Los parámetros se fijan al ejecutar o al invocar desde otro pipeline y se usan en expresiones dinámicas.

## Orquestar notebooks
leccion: cert-azure-fabric-ingesta-transformacion
dominio: 2
Un notebook "maestro" debe ejecutar otros tres notebooks en paralelo, compartiendo la sesión de Spark. ¿Qué usas?
- [ ] Tres pipelines programados a la misma hora.
- [x] `notebookutils.notebook.runMultiple(...)` desde el notebook maestro.
- [ ] Un Copy job.
- [ ] `%run` de los tres notebooks en una sola celda, que los lanza en paralelo.
porque: `runMultiple` ejecuta varios notebooks en paralelo (o con dependencias) dentro de la misma sesión. `%run` los ejecuta uno tras otro.

## MERGE en el lakehouse
leccion: cert-azure-fabric-ingesta-transformacion
dominio: 2
En un notebook, quieres actualizar la tabla Delta `clientes` con los cambios de `clientes_stage` (actualizar existentes, insertar nuevos). ¿Qué usas?
- [ ] `df.write.mode("append")` con los cambios.
- [ ] `df.write.mode("overwrite")` solo con los cambios, que conserva las filas que no cambiaron.
- [x] `MERGE INTO clientes USING clientes_stage ON ...` en Spark SQL.
- [ ] Un shortcut de `clientes_stage` a `clientes`.
porque: MERGE hace el upsert de forma atómica. Append duplica y overwrite borra lo que no vino en los cambios.

## Dataflow con staging
leccion: cert-azure-fabric-ingesta-transformacion
dominio: 2
Un Dataflow Gen2 transforma millones de filas y tarda mucho. ¿Qué opción ayuda a que las transformaciones se calculen con un motor escalable?
- [ ] Desactivar todos los pasos de Power Query.
- [ ] Cargar el resultado a un archivo de Excel.
- [ ] Ejecutarlo desde Power BI Desktop.
- [x] Activar el staging del Dataflow Gen2.
porque: Con staging, Dataflow Gen2 escribe en un almacenamiento intermedio y puede usar el motor SQL para las transformaciones pesadas.

## Destino de Eventstream
leccion: cert-azure-fabric-ingesta-transformacion
dominio: 2
Lecturas de sensores llegan a un Eventstream y deben quedar consultables con KQL en segundos. ¿Qué destino eliges?
- [x] Una tabla de un eventhouse (base KQL).
- [ ] Un archivo CSV en la sección Files.
- [ ] Un Dataflow Gen2.
- [ ] Un modelo semántico en modo Import.
porque: El eventhouse está pensado para datos de series de tiempo y eventos, con ingesta continua y consultas KQL rápidas.

## Vista materializada en KQL
leccion: cert-azure-fabric-ingesta-transformacion
dominio: 2
Los tableros consultan siempre la última lectura de cada sensor sobre una tabla con miles de millones de filas. ¿Qué usas en el eventhouse?
- [ ] Un `take 1` en cada consulta.
- [ ] Copiar la tabla a un warehouse cada hora y consultar desde ahí con T-SQL.
- [x] Una vista materializada con `arg_max(timestamp, *) by sensor_id`.
- [ ] Un shortcut a la misma tabla.
porque: Las vistas materializadas de KQL mantienen el resultado de una agregación actualizado a medida que llegan datos; la consulta lee el resultado ya calculado.

## SCD tipo 1
leccion: cert-azure-fabric-ingesta-transformacion
dominio: 2
En la dimensión `producto`, solo importa el valor actual de la categoría; no hace falta historial. ¿Qué tipo de dimensión lentamente cambiante implementas?
- [ ] Tipo 2, con fechas de vigencia.
- [x] Tipo 1: se sobrescribe el valor.
- [ ] Tipo 3, con una columna por cada valor anterior.
- [ ] Tipo 6, combinando todos los tipos.
porque: El tipo 1 sobrescribe el atributo y no guarda historial; el tipo 2 agrega filas con vigencia.

## Métricas de capacidad
leccion: cert-azure-fabric-monitoreo-optimizacion
dominio: 3
El administrador quiere ver qué ítems consumen más CU de la capacidad y si hubo throttling. ¿Qué usa?
- [ ] El monitoring hub del workspace.
- [ ] Azure Cost Management, que muestra cada ítem.
- [ ] El historial de ejecuciones del pipeline.
- [x] La aplicación Microsoft Fabric Capacity Metrics.
porque: La app Capacity Metrics muestra el consumo de CU por ítem y operación, el suavizado y los eventos de throttling.

## Suavizado
leccion: cert-azure-fabric-monitoreo-optimizacion
dominio: 3
Un trabajo de Spark usó el doble de la capacidad durante 10 minutos y no hubo throttling. ¿Por qué?
- [x] Porque Fabric suaviza el consumo de las operaciones de fondo en 24 horas.
- [ ] Porque Spark no consume capacidad.
- [ ] Porque la capacidad se agranda sola de forma permanente cuando detecta picos de uso.
- [ ] Porque el throttling solo se aplica a Power BI.
porque: El suavizado reparte el consumo (las operaciones de fondo, en 24 horas); el throttling aparece cuando el consumo acumulado supera lo que la capacidad puede absorber.

## Falla de un notebook en un pipeline
leccion: cert-azure-fabric-monitoreo-optimizacion
dominio: 3
Un pipeline falló en la actividad Notebook. ¿Dónde ves el error de Python y en qué celda ocurrió?
- [ ] En la app Capacity Metrics.
- [x] En la ejecución de la actividad, que enlaza a la instantánea del notebook.
- [ ] En el registro de auditoría del tenant, en el centro de administración de Microsoft 365.
- [ ] En el SQL analytics endpoint.
porque: Desde la ejecución del pipeline se abre la salida de la actividad y la instantánea del notebook con la celda que falló.

## Consultas lentas en el warehouse
leccion: cert-azure-fabric-monitoreo-optimizacion
dominio: 3
Quieres saber cuáles fueron las consultas más largas de la última semana en el warehouse. ¿Qué consultas?
- [x] Las vistas del esquema `queryinsights`.
- [ ] `sys.tables`.
- [ ] El log de Spark.
- [ ] `DESCRIBE HISTORY` del warehouse.
porque: Query insights guarda el historial de consultas con duración, usuario y texto, y vistas agregadas de las más frecuentes y las más largas.

## Mantenimiento de tablas del lakehouse
leccion: cert-azure-fabric-monitoreo-optimizacion
dominio: 3
Una tabla Delta del lakehouse que recibe pequeñas cargas cada 5 minutos se volvió lenta. ¿Qué haces?
- [ ] Recrear la tabla desde cero todos los días.
- [ ] Pasarla a CSV.
- [x] Ejecutar `OPTIMIZE` y `VACUUM` sobre la tabla.
- [ ] Aumentar la SKU de la capacidad.
porque: Las cargas frecuentes generan muchos archivos chicos. OPTIMIZE los compacta y VACUUM elimina los que ya no se usan.

## Direct Lake y fallback
leccion: cert-azure-fabric-monitoreo-optimizacion
dominio: 3
Un informe en Direct Lake a veces se vuelve lento y el monitoreo indica consultas en DirectQuery. ¿Qué está pasando?
- [ ] Direct Lake siempre usa DirectQuery.
- [ ] El informe se pasó solo a modo Import y ahora espera la actualización programada.
- [ ] Se borró el modelo semántico.
- [x] El modelo hace fallback a DirectQuery, por ejemplo por superar los límites de la SKU.
porque: Direct Lake lee los archivos Delta directamente; si no puede (vistas, seguridad del endpoint SQL o límites de la capacidad), recurre a DirectQuery, que es más lento.

## Errores de ingesta en KQL
leccion: cert-azure-fabric-monitoreo-optimizacion
dominio: 3
Faltan eventos en una tabla del eventhouse y sospechas que algunos fallaron al ingerirse por un formato inválido. ¿Qué comando usas?
- [ ] `.show tables`
- [x] `.show ingestion failures`
- [ ] `.drop table`
- [ ] `.show version`
porque: `.show ingestion failures` lista los errores de ingesta con el detalle de la causa.

## Caché de resultados
leccion: cert-azure-fabric-monitoreo-optimizacion
dominio: 3
Un tablero ejecuta la misma consulta pesada en el warehouse decenas de veces por hora sin que cambien los datos. ¿Qué característica ayuda?
- [ ] Desactivar las estadísticas.
- [ ] Crear un índice clúster en cada columna que usa la consulta del tablero.
- [x] La caché de conjuntos de resultados del warehouse.
- [ ] Pasar la tabla a un lakehouse.
porque: Con la caché de resultados, las consultas repetidas devuelven el resultado guardado si los datos subyacentes no cambiaron.

## Alta concurrencia
leccion: cert-azure-fabric-monitoreo-optimizacion
dominio: 3
Varios notebooks de un pipeline arrancan cada uno su propia sesión de Spark y la espera suma minutos. ¿Qué opción reduce el arranque?
- [x] El modo de alta concurrencia para pipelines.
- [ ] Un Dataflow en lugar de notebooks.
- [ ] Bajar el número de executors a 1 para que la sesión arranque más liviana.
- [ ] Ejecutar los notebooks a mano.
porque: En alta concurrencia, varios notebooks reutilizan una misma sesión de Spark (con el mismo usuario, entorno y lakehouse predeterminado).

## Autotune
leccion: cert-azure-fabric-monitoreo-optimizacion
dominio: 3
El equipo no sabe qué valores poner en `spark.sql.shuffle.partitions` y otros parámetros de sus consultas repetitivas. ¿Qué función de Fabric los ajusta automáticamente?
- [ ] V-Order.
- [ ] El Copy job.
- [ ] La caché de OneLake.
- [x] Autotune de Spark.
porque: Autotune ajusta configuraciones de Spark (como particiones de shuffle o tamaño de broadcast) aprendiendo de ejecuciones anteriores.

## Alerta con Activator
leccion: cert-azure-fabric-monitoreo-optimizacion
dominio: 3
Si un Eventstream deja de recibir datos de una planta durante 10 minutos, alguien debe recibir un mensaje en Teams. ¿Qué usas?
- [ ] Un informe de Power BI que se revisa cada hora.
- [x] Activator, con una regla sobre el flujo de eventos y una acción de Teams.
- [ ] Una vista materializada.
- [ ] El historial de deployment pipelines.
porque: Activator evalúa condiciones sobre datos en movimiento (incluida la ausencia de eventos) y dispara acciones como correo, Teams o un pipeline.

## @caso energia: Eólica Patagonia
Eólica Patagonia opera 300 aerogeneradores. Cada uno envía una lectura por segundo (velocidad del viento, potencia, temperatura del rotor) a Azure Event Hubs. Finanzas tiene la facturación en una base Azure SQL y los informes de gerencia están en Power BI.

Problemas actuales:
- Las lecturas se guardan en archivos y se analizan al día siguiente.
- Para cruzar producción con facturación, alguien exporta la base a Excel cada semana.
- Mantenimiento quiere enterarse en el momento si la temperatura del rotor supera 90 °C.
- Los informes de gerencia tardan en cargar porque usan DirectQuery sobre tablas grandes.

## Lecturas en tiempo real
leccion: cert-azure-fabric-ingesta-transformacion
dominio: 2
caso: energia
¿Qué arquitectura resuelve el primer problema?
- [ ] Un pipeline con una actividad Copy que lee Event Hubs una vez por día.
- [ ] Un Dataflow Gen2 conectado a Event Hubs.
- [x] Eventstream desde Event Hubs hacia un eventhouse.
- [ ] Un shortcut de OneLake a Event Hubs.
porque: Eventstream recibe los eventos de forma continua y el eventhouse los deja consultables en segundos.

## Facturación sin exportar
leccion: cert-azure-fabric-ingesta-transformacion
dominio: 2
caso: energia
¿Qué elimina la exportación semanal a Excel?
- [x] Mirroring de la base Azure SQL en OneLake, para unirla con la producción.
- [ ] Un correo semanal automatizado con el Excel.
- [ ] Copiar la base a un eventhouse con Eventstream.
- [ ] Una vista en Power BI Desktop.
porque: Mirroring mantiene una réplica Delta casi en tiempo real, disponible para unir con otros datos de Fabric.

## Rotor caliente
leccion: cert-azure-fabric-monitoreo-optimizacion
dominio: 3
caso: energia
¿Cómo avisas a mantenimiento en el momento?
- [ ] Un informe de Power BI con un filtro de temperatura.
- [ ] Una consulta KQL que alguien ejecuta cada mañana.
- [ ] Un notebook que corre una vez por hora.
- [x] Una regla de Activator sobre el Eventstream.
porque: Activator evalúa cada evento a medida que llega y dispara la acción sin esperar un proceso programado.

## Informes de gerencia
leccion: cert-azure-fabric-monitoreo-optimizacion
dominio: 3
caso: energia
Las tablas de producción agregada están en un lakehouse. ¿Qué modo de almacenamiento mejora los informes sin copias programadas?
- [ ] DirectQuery con más visuales por página.
- [x] Direct Lake sobre las tablas Delta del lakehouse.
- [ ] Import con una actualización programada cada 5 minutos durante todo el día.
- [ ] Exportar los informes a PDF.
porque: Direct Lake carga en memoria los datos de los archivos Delta sin importarlos ni consultar la fuente en cada visual, con rendimiento cercano a Import.
