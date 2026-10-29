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
