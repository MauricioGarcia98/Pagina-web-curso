---
titulo: Monitorear y optimizar Fabric
nivel: Avanzado
duracion: 50
resumen: El tercer dominio de DP-700 - el Monitoring hub, el monitoreo del workspace, la app Capacity Metrics, alertas con Activator, diagnóstico de errores en pipelines, dataflows, notebooks, eventstreams, eventhouses y T-SQL, y optimización de tablas del lakehouse (V-Order, OPTIMIZE, VACUUM, perfiles de recursos), de Spark, de pipelines, del warehouse y del tiempo real.
objetivos: Usar el Monitoring hub, el monitoreo del workspace y Capacity Metrics para encontrar la causa de un problema | Configurar alertas ante fallas o condiciones de los datos | Diagnosticar errores típicos de cada tipo de ítem | Optimizar tablas Delta del lakehouse y la configuración de Spark | Mejorar el rendimiento del warehouse, de los pipelines y del eventhouse
prerrequisitos: cert-azure-fabric-ingesta-transformacion
autoevaluacion: ¿Sabes dónde ver todas las ejecuciones de pipelines y notebooks del tenant? | ¿Sabes qué app muestra si la capacidad está saturada? | ¿Sabes qué hace V-Order y cuándo conviene? | ¿Sabes encontrar las consultas más lentas del warehouse? | ¿Sabes qué política de un eventhouse define cuánto se guarda en caché?
---

:::escenario
Un lunes, los informes de ventas de la cadena de farmacias tardan un minuto en abrir, un pipeline nocturno falló y nadie se enteró hasta las 10, y la capacidad marca 140 % de uso. El jefe de Martín pide: saber qué pasó, que no vuelva a pasar sin aviso, y que todo sea más rápido. Es el último tercio del DP-700.
:::

## Dónde mirar

| Herramienta | Qué muestra |
|---|---|
| **Monitoring hub** | Todas las ejecuciones a las que tienes acceso (pipelines, notebooks, trabajos de Spark, dataflows, refrescos de modelos semánticos, Copy jobs): estado, duración, quién la inició, y acceso al detalle |
| **Historial de ejecuciones del pipeline** | Cada actividad con su entrada, salida, duración y error; las copias muestran filas leídas y escritas y el rendimiento |
| **Monitoreo de una aplicación de Spark** | Desde el notebook o el Monitoring hub: la Spark UI, los registros del driver y los executors, el uso de recursos y recomendaciones |
| **Monitoreo del workspace** | Un eventhouse con los registros y métricas de los ítems del workspace, consultable con KQL y con paneles |
| **Fabric Capacity Metrics** (app) | Consumo de la capacidad por ítem y operación, suavizado, *throttling* y rechazos |
| **Query insights** del warehouse | Vistas `queryinsights.*` con el historial de consultas, las más largas y las más frecuentes |
| **Datos y registros del eventstream** y del eventhouse | Eventos que entran y salen, errores de ingesta |

## Alertas

- **Activator** sobre **eventos de Fabric**: por ejemplo, "cuando un trabajo de este workspace falla, enviar un mensaje a Teams". También sobre datos (una regla sobre una columna de un eventstream o un informe).
- **En el pipeline**: una rama con la condición *On failure* que ejecuta una actividad de **Office 365 Outlook** o **Teams** para avisar, o que registra el error en una tabla.
- **Sobre la capacidad**: notificaciones de la capacidad cuando el consumo supera un porcentaje.

```diagrama
titulo: Un pipeline que avisa cuando falla
nodo c: Copiar ventas | icono=sigla:Copy:verde | col=0 | fila=0 | color=verde
nodo n: Notebook silver | icono=notebook | col=1 | fila=0 | color=azul
nodo ok: Registrar éxito | icono=check | col=2 | fila=0
nodo err: Avisar a Teams | icono=mensaje | col=1 | fila=1 | sub=On failure | color=rojo
flecha c -> n: On success
flecha n -> ok: On success
flecha c -> err: On failure | estilo=punteada | color=rojo
flecha n -> err: On failure | estilo=punteada | color=rojo
```

:::cuidado Las dependencias de un pipeline
Una actividad con dos dependencias *On failure* corre solo si **las dos** fallan (se combinan con Y). Para avisar si falla **cualquiera**, se usa una actividad de alerta por cada una, o se agrupan las actividades en un pipeline hijo y se maneja la falla del hijo.
:::

## Diagnosticar errores comunes

| Ítem | Error típico | Dónde se ve | Corrección |
|---|---|---|---|
| Pipeline | Credenciales vencidas, puerta de enlace caída, tiempo de espera | Detalle de la actividad en el historial | Renovar la conexión, revisar la gateway, aumentar el *timeout* o los reintentos |
| Dataflow Gen2 | Error de conversión de tipo o de una consulta de Power Query | Historial de actualización | Corregir el tipo o la transformación; revisar el destino |
| Notebook | Excepción de Python, falta de memoria, conflicto de esquema al escribir | Salida de la celda, registros de Spark | Corregir el código, agregar `mergeSchema` si corresponde, ajustar el pool |
| Eventstream | Formato de evento distinto al esperado, destino sin permisos | Registros del eventstream | Ajustar el formato o el mapeo, revisar permisos |
| Eventhouse | Fallas de ingesta por mapeo o esquema | Comandos `.show ingestion failures` | Corregir el mapeo |
| Warehouse | Bloqueos, consultas lentas, errores de T-SQL | Query insights, DMV `sys.dm_exec_requests` | Optimizar la consulta, revisar transacciones largas |
| Shortcut | Acceso denegado al origen | Al abrir la carpeta | Revisar la conexión y los permisos en el origen |

## Optimizar tablas del lakehouse

- **Archivos pequeños**: muchas escrituras chicas (streaming, cargas frecuentes) generan muchos archivos pequeños y las lecturas se vuelven lentas. **`OPTIMIZE`** los compacta; la **escritura optimizada** (*optimized write*) escribe menos archivos y más grandes.
- **V-Order**: una optimización al **escribir** los archivos Parquet (ordenamiento y compresión especiales) que acelera mucho las lecturas de Power BI (Direct Lake) y del motor SQL, a cambio de escrituras un poco más lentas. Sigue siendo Parquet estándar.
- **Perfiles de recursos de Spark**: configuraciones predefinidas según el uso (por ejemplo, centrado en escritura o en lectura); los workspaces nuevos usan uno orientado a escritura, que no aplica V-Order por defecto. Para tablas que se leen mucho desde Power BI conviene activar V-Order.
- **`VACUUM`**: borra los archivos que ya no pertenecen a la tabla (por defecto, de más de 7 días).
- **Z-order y particiones**: `OPTIMIZE tabla ZORDER BY (col)` agrupa datos por columnas que se filtran seguido; particionar solo por columnas de baja cardinalidad en tablas grandes.
- El lakehouse ofrece **mantenimiento de tablas** desde la interfaz (OPTIMIZE con V-Order y VACUUM) y se puede programar desde un notebook.

```sql norun
OPTIMIZE silver_ventas VORDER;                    -- compacta y aplica V-Order
OPTIMIZE silver_ventas ZORDER BY (sucursal_id);   -- agrupa por una columna muy filtrada
VACUUM silver_ventas RETAIN 168 HOURS;            -- borra archivos de más de 7 días
```

## Optimizar Spark

- **Starter pool** para arranque rápido; **custom pool** con nodos más grandes o más nodos para cargas pesadas; **autoescalado** y **asignación dinámica** de executors.
- **Motor de ejecución nativo**: acelera consultas de Spark sobre Delta y Parquet sin cambiar código.
- **Modo de alta concurrencia**: varios notebooks comparten una sesión, lo que ahorra arranques y CU.
- **Environments**: fijar librerías y propiedades de Spark una vez y reutilizarlas.
- Buenas prácticas de siempre: filtrar temprano, evitar `collect()`, *broadcast* de tablas chicas, cuidar el *skew*.

## Optimizar pipelines, warehouse y tiempo real

- **Pipelines**: paralelismo de copia y opciones de partición en la copy activity; copiar en paralelo con `ForEach` (sin la opción secuencial) para muchas tablas; evitar transformar fila a fila lo que puede hacer el destino.
- **Warehouse**: el warehouse crea y mantiene **estadísticas** automáticamente y tiene **caché de resultados**; tipos de datos chicos y precisos (no `varchar(8000)` para todo); evitar `SELECT *`; revisar en query insights las consultas largas y frecuentes.
- **Eventhouse**: la **política de caché** define cuántos días se guardan en caché caliente (consultas rápidas) y la **política de retención** cuánto se conservan los datos; las **vistas materializadas** precalculan agregados; las **políticas de partición** ayudan con filtros frecuentes.
- **Eventstream**: transformar y filtrar antes de los destinos para enviar menos datos.

:::examen Lo que más se pregunta
- "¿Qué ítem o qué operación consume más capacidad?" → **Fabric Capacity Metrics**.
- "Ver en un solo lugar las ejecuciones fallidas de pipelines y notebooks" → **Monitoring hub**.
- "Avisar en Teams cuando falla cualquier trabajo del workspace" → **Activator** sobre eventos de Fabric (o actividades *On failure*).
- "Los informes Direct Lake leen lento una tabla que se escribe una vez por día" → **V-Order** y `OPTIMIZE`.
- "Consultas lentas en una tabla con miles de archivos chicos" → `OPTIMIZE` (y escritura optimizada).
- "Las consultas de los últimos 30 días deben ser rápidas, pero hay que guardar 2 años" → **caché de 30 días** y **retención de 2 años** en el eventhouse.
:::

:::trabajo Lo que hace un equipo maduro
Un panel de Capacity Metrics revisado cada semana, alertas de Activator ante fallas, mantenimiento programado (OPTIMIZE con V-Order y VACUUM) para las tablas que consume Power BI, capacidades separadas para desarrollo y producción, y query insights para encontrar las 10 consultas más caras del mes y optimizarlas.
:::

## Ejercicios

:::ejercicio quiz
La capacidad de producción está rechazando operaciones. ¿Dónde ves qué ítems y operaciones consumen más unidades de capacidad?
- [ ] En el historial de ejecuciones de cada pipeline.
- [x] En la app Fabric Capacity Metrics.
- [ ] En el registro de cambios de Git del workspace.
- [ ] En la vista de linaje del workspace.
```explicacion
Capacity Metrics muestra el consumo por ítem y operación, el suavizado y los eventos de throttling y rechazo.
```
:::

:::ejercicio quiz
Un modelo semántico en modo Direct Lake lee lento una tabla del lakehouse que se escribe una vez por noche y se consulta todo el día. ¿Qué mejora es la más indicada?
- [ ] Desactivar la escritura optimizada para escribir más rápido.
- [x] Escribir la tabla con V-Order y compactarla con `OPTIMIZE`.
- [ ] Particionar la tabla por el id de cliente.
- [ ] Moverla a un eventhouse.
```explicacion
V-Order optimiza los archivos para lecturas rápidas desde Power BI y el motor SQL; conviene en tablas que se escriben poco y se leen mucho.
```
:::

:::ejercicio quiz
En un pipeline, una actividad "Avisar" depende de "Copiar" y de "Notebook", ambas con la condición *On failure*. Falla solo "Copiar". ¿Se ejecuta "Avisar"?
- [ ] Sí, porque falló una de las dos.
- [x] No, porque las dependencias se combinan con Y y "Notebook" no falló.
- [ ] Sí, pero solo si el pipeline tiene reintentos.
- [ ] Depende del orden en que se agregaron las dependencias.
```explicacion
Varias dependencias en una actividad se combinan con Y. Para avisar ante cualquier falla hay que usar una alerta por actividad o un pipeline hijo.
```
:::

:::ejercicio quiz
Quieres encontrar las consultas que más tardaron en el warehouse durante la última semana. ¿Qué usas?
- [ ] La app Capacity Metrics.
- [x] Las vistas de query insights (`queryinsights.*`).
- [ ] El historial de Git del warehouse.
- [ ] La política de retención.
```explicacion
Query insights guarda el historial de consultas con su duración y permite encontrar las más largas y frecuentes.
```
:::

:::ejercicio quiz
En un eventhouse, las consultas sobre los últimos 7 días deben ser rápidas, pero los datos se conservan 1 año por auditoría. ¿Qué configuras?
- [ ] Retención de 7 días.
- [x] Política de caché de 7 días y retención de 1 año.
- [ ] Una vista materializada de 1 año.
- [ ] Un shortcut a otro eventhouse.
```explicacion
La caché caliente acelera las consultas sobre datos recientes; la retención define cuánto tiempo se guardan los datos.
```
:::

:::ejercicio abierto
Escribe las sentencias para compactar la tabla `silver_ventas` aplicando V-Order, agruparla por `sucursal_id` y borrar los archivos que ya no usa con más de 7 días.
```sql solucion
OPTIMIZE silver_ventas VORDER;
OPTIMIZE silver_ventas ZORDER BY (sucursal_id);
VACUUM silver_ventas RETAIN 168 HOURS;
```
:::
