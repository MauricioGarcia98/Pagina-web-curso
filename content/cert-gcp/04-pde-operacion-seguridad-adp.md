---
titulo: PDE y ADP - Mantener, automatizar, asegurar y monitorear cargas de datos
nivel: Avanzado
duracion: 65
resumen: La sección 5 del Professional Data Engineer y lo que el Associate Data Practitioner pide de operación - optimizar recursos y costos (slots, reservas, Dataflow, Dataproc), automatizar y desplegar con Composer, Terraform y CI/CD, monitorear con Cloud Monitoring, Cloud Logging y la vista de jobs, recuperación ante fallas, IAM y cuentas de servicio, cifrado con CMEK, VPC Service Controls, Sensitive Data Protection y auditoría, más el temario completo del ADP.
objetivos: Optimizar el costo de BigQuery, Dataflow y Dataproc | Diseñar recuperación ante fallas con RPO y RTO | Monitorear y alertar sobre pipelines | Aplicar IAM con mínimos privilegios y cuentas de servicio | Proteger datos con CMEK, VPC Service Controls y Sensitive Data Protection | Ubicar los temas del Associate Data Practitioner
prerrequisitos: cert-gcp-pde-almacenamiento-analisis | gcp-gcloud-iam
autoevaluacion: ¿Sabes cómo evitar que un analista ejecute una consulta de 50 TB? | ¿Sabes qué protege VPC Service Controls? | ¿Sabes cómo encontrar números de tarjeta en BigQuery? | ¿Sabes dónde ver quién leyó una tabla? | ¿Sabes qué secciones tiene el ADP?
---

:::escenario
Un lunes, el panel de ventas de la cadena de Valentina amaneció vacío: un DAG de Composer falló el sábado y nadie lo vio. Ese mismo día, auditoría pidió demostrar quién consultó la tabla de clientes y garantizar que los datos no puedan copiarse a un proyecto externo. Es la sección 5 del PDE: lo que mantiene una plataforma viva.
:::

## Optimizar recursos y costos

| Servicio | Palancas |
|---|---|
| **BigQuery** | Particionar y agrupar; ediciones con **reservas** y **autoescalado** de slots para cargas estables; on-demand para cargas esporádicas; **maximum bytes billed**; **cuotas** de consulta por usuario o proyecto; vistas materializadas; almacenamiento long-term; separar proyectos de cómputo y almacenamiento para atribuir costos |
| **Dataflow** | Autoescalado horizontal, **FlexRS** (lotes con VMs preemptibles y programación flexible, más barato), Streaming Engine, tipo de máquina adecuado |
| **Dataproc** | Clústeres efímeros, workers secundarios Spot, autoescalado, Dataproc Serverless |
| **Cloud Storage** | Clases, ciclo de vida, Autoclass |

**Etiquetas** (*labels*) en recursos y jobs, **exportación de facturación a BigQuery** y **presupuestos con alertas** para controlar el gasto.

## Automatizar y desplegar

- **Cloud Composer** para orquestar, con reintentos, `sla`, sensores y alertas por correo o callbacks.
- **Infraestructura como código** con **Terraform** (datasets, tablas, buckets, IAM, reservas); **Cloud Build** y **Cloud Deploy** para CI/CD; Dataform con entornos (dev, prod) y **Git**.
- Pipelines **idempotentes**: `MERGE`, reemplazo de particiones (`WRITE_TRUNCATE` sobre una partición), claves de deduplicación.
- Plantillas Flex de Dataflow versionadas en Artifact Registry.

## Monitorear y resolver problemas

- **Cloud Monitoring**: métricas (retraso del sistema y **frescura de datos** en Dataflow, mensajes sin reconocer en Pub/Sub — `num_undelivered_messages`, `oldest_unacked_message_age` —, slots usados en BigQuery), paneles y **políticas de alertas**.
- **Cloud Logging**: registros de jobs y servicios; **métricas basadas en logs**; **sinks** a BigQuery para analizarlos.
- **BigQuery**: `INFORMATION_SCHEMA.JOBS`, **administrative resource charts** y el plan de ejecución.
- **Dataflow**: interfaz de monitoreo del job (etapas, **pasos con retraso**, *hot keys*), **Dataflow insights**.
- **Error Reporting** para excepciones.

## Confiabilidad y recuperación

- **RPO** (cuántos datos se pueden perder) y **RTO** (cuánto puede tardar en recuperarse).
- BigQuery: **time travel** (hasta 7 días), **fail-safe** de 7 días adicionales, **snapshots** de tablas, **replicación entre regiones** de datasets (y **managed disaster recovery** con failover en Enterprise Plus).
- Cloud Storage dual-región o multirregión; Bigtable con replicación; Spanner multirregional (99,999 %); Cloud SQL con alta disponibilidad y réplicas de lectura entre regiones.
- Pub/Sub con **snapshots** y **seek** para reprocesar.

```recorrido
titulo: Recuperar una tabla de BigQuery borrada por error
estacion error: El error | icono=alerta
estacion tt: Time travel | icono=reloj
estacion restaurar: Restaurar | icono=transformar
estacion verificar: Verificar | icono=lupa
estacion prevenir: Prevenir | icono=escudo
paso error: Alguien borra filas por error
Un `DELETE` con la condición al revés deja `ventas` con una fracción de sus filas (ejemplo).
>>> sql
DELETE FROM tienda.ventas
WHERE fecha < '2024-12-31';   -- quería borrar solo el 31, no todo lo anterior
paso tt: Time travel: la tabla "como era"
BigQuery guarda el historial de cada tabla durante la ventana de time travel (7 días por defecto; configurable entre 2 y 7). Se consulta con `FOR SYSTEM_TIME AS OF`.
>>> sql
SELECT COUNT(*)
FROM tienda.ventas
  FOR SYSTEM_TIME AS OF TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR);
paso restaurar: Restaurar a una tabla nueva
Se copia el estado anterior a otra tabla, se revisa y recién después se reemplaza la original.
>>> sql
CREATE TABLE tienda.ventas_restaurada AS
SELECT * FROM tienda.ventas
  FOR SYSTEM_TIME AS OF TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR);
paso verificar: Comparar antes de reemplazar
Conteos y totales contra el último valor conocido (por ejemplo, el del tablero de ayer).
>>> tabla
tabla,filas
ventas (después del error),63
ventas_restaurada,11033
paso prevenir: Prevenir la próxima vez
Pasada la ventana de time travel queda el **fail-safe** de 7 días más, pero solo se recupera pidiéndolo a soporte. Para tablas críticas: **snapshots** programados y permisos que impidan reemplazar tablas de producción a mano.
>>> texto
0–7 días   → time travel (lo haces tú)
+7 días    → fail-safe (solo vía soporte)
siempre    → snapshots programados de las tablas críticas
```

## Seguridad y cumplimiento

### Identidad y acceso

- **IAM**: roles predefinidos (`roles/bigquery.dataViewer`, `dataEditor`, `jobUser`, `user`), personalizados, a nivel de organización, carpeta, proyecto, dataset, tabla o columna. Separar **quién ejecuta consultas** (`jobUser` en el proyecto) de **qué datos puede leer** (`dataViewer` en el dataset).
- **Cuentas de servicio** con mínimos privilegios para cada pipeline; **Workload Identity Federation** para que sistemas externos (GitHub Actions, AWS) se autentiquen sin claves.
- **Grupos** en lugar de usuarios individuales.

### Protección de datos

- **Cifrado**: siempre en reposo con claves de Google; **CMEK** con **Cloud KMS** cuando la empresa debe controlar y rotar la clave (y poder revocarla); **Cloud EKM** para claves fuera de Google; **CSEK** en Cloud Storage.
- **VPC Service Controls**: un **perímetro** alrededor de proyectos que impide **exfiltrar** datos de BigQuery o Cloud Storage hacia fuera aunque alguien tenga credenciales válidas.
- **Private Google Access** y **Private Service Connect** para llegar a las APIs sin IP pública.
- **Sensitive Data Protection** (antes Cloud DLP): **descubrimiento** e **inspección** de datos sensibles en BigQuery y Cloud Storage, y **desidentificación** (enmascarado, tokenización con **cifrado preservando formato**, generalización, *date shifting*).
- **Etiquetas de política** y enmascaramiento dinámico en BigQuery para columnas sensibles.

### Auditoría

- **Cloud Audit Logs**: **Admin Activity** (siempre activos: cambios de configuración), **Data Access** (lecturas de datos; se habilitan y cuestan), **System Event** y **Policy Denied**. Responden "quién leyó la tabla" con los registros de Data Access.
- **Access Transparency** registra los accesos del personal de Google.
- **Organization Policies** para restringir ubicaciones de recursos (residencia) y servicios.

:::examen Palabras clave
- "Impedir copiar datos a proyectos fuera de la organización" → **VPC Service Controls**.
- "La empresa debe poder revocar la clave" → **CMEK** con Cloud KMS.
- "Encontrar y enmascarar PII" → **Sensitive Data Protection**.
- "Quién consultó la tabla" → **Data Access audit logs**.
- "Un analista no puede gastar más de X por consulta" → **maximum bytes billed** o **cuotas personalizadas**.
- "Mensajes acumulándose en la suscripción" → `oldest_unacked_message_age` en Cloud Monitoring.
:::

## Associate Data Practitioner (ADP)

El ADP cubre los mismos productos a menor profundidad, con foco en ejecutar más que en diseñar. Sus cuatro secciones (pesos aproximados):

| Sección | Peso aprox. | Temas | Dónde se estudia |
|---|---|---|---|
| **Preparación e ingesta de datos** | ~30 % | Limpieza, formatos, elegir herramienta de carga (Storage Transfer, Data Transfer Service, Datastream, Dataflow), Cloud Storage | Lección de diseño e ingesta |
| **Análisis y presentación de datos** | ~27 % | SQL en BigQuery, BigQuery ML, Looker y Looker Studio, Gemini en BigQuery | Lección de almacenamiento y análisis |
| **Orquestación de pipelines** | ~18 % | Composer, Dataform, Workflows, consultas programadas, elegir ETL o ELT | Lección de diseño e ingesta |
| **Gestión de datos** | ~25 % | IAM, clases y ciclo de vida de Cloud Storage, retención, copias, Sensitive Data Protection, Dataplex | Esta lección |

## Ejercicios

:::ejercicio quiz
Seguridad exige que, aunque alguien robe credenciales válidas, no pueda copiar tablas de BigQuery a un proyecto fuera de la organización. ¿Qué configuras?
- [ ] Rotación diaria de las claves de las cuentas de servicio.
- [x] Un perímetro de VPC Service Controls alrededor de los proyectos de datos.
- [ ] CMEK en todos los datasets.
- [ ] Políticas de acceso por fila.
```explicacion
VPC Service Controls bloquea el movimiento de datos fuera del perímetro, incluso con credenciales válidas.
```
:::

:::ejercicio quiz
Auditoría pregunta qué usuarios leyeron la tabla `clientes` la semana pasada. ¿Dónde se busca?
- [ ] En los registros de Admin Activity.
- [x] En los registros de auditoría de Data Access (si estaban habilitados) o en INFORMATION_SCHEMA.JOBS.
- [ ] En las métricas de Cloud Monitoring de BigQuery.
- [ ] En el historial de versiones de la tabla.
```explicacion
Los registros de Data Access registran las lecturas; INFORMATION_SCHEMA.JOBS muestra las consultas ejecutadas y quién las lanzó.
```
:::

:::ejercicio quiz
Un analista ejecutó por error una consulta que escaneó 80 TB. ¿Qué evita que vuelva a pasar sin bloquear su trabajo normal?
- [ ] Quitarle el rol `bigquery.jobUser`.
- [x] Un límite de bytes facturados por consulta o una cuota personalizada por usuario.
- [ ] Pasar el proyecto a la edición Enterprise Plus.
- [ ] Borrar las tablas grandes.
```explicacion
El límite de bytes facturados hace fallar la consulta antes de ejecutarse si supera el máximo; las cuotas limitan el total diario.
```
:::

:::ejercicio quiz
Hay que detectar columnas con números de tarjeta en cientos de tablas de BigQuery y tokenizarlas conservando el formato. ¿Qué usas?
- [ ] Knowledge Catalog con etiquetas manuales.
- [x] Sensitive Data Protection: descubrimiento y desidentificación con cifrado preservando formato.
- [ ] Cloud KMS con CMEK en cada tabla.
- [ ] Una vista autorizada que excluye la columna.
```explicacion
Sensitive Data Protection descubre datos sensibles y los desidentifica, incluida la tokenización que preserva el formato.
```
:::

:::ejercicio abierto
Diseña el monitoreo para que el problema del lunes no se repita: el DAG de Composer que carga ventas, el pipeline de Dataflow en streaming y la tabla final en BigQuery.
```text solucion
Composer: reintentos con espera en cada tarea, callback de falla que notifica, y alerta de Cloud Monitoring sobre ejecuciones fallidas del DAG.
Dataflow: alertas sobre data freshness y system lag por encima de 5 minutos, y sobre errores en la salida a la tabla de dead-letter.
Pub/Sub: alerta si oldest_unacked_message_age supera 10 minutos.
BigQuery: una consulta programada (o un data quality scan de Dataplex) que verifica que la partición de hoy tiene filas y que la última venta tiene menos de 30 minutos; si falla, alerta.
Las alertas van a un canal de guardia (correo, chat o PagerDuty) con un runbook enlazado.
```
:::
