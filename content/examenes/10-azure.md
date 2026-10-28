# examen: azure

## Jerarquía
leccion: azure-nube-azure
¿Cuál es el orden correcto de la jerarquía de Azure, de lo más amplio a lo más específico?
- [ ] Recurso → grupo de recursos → suscripción → tenant
- [x] Tenant → grupo de administración → suscripción → grupo de recursos → recurso
- [ ] Suscripción → tenant → grupo de recursos → recurso → grupo de administración
- [ ] Grupo de administración → grupo de recursos → tenant → suscripción → recurso
porque: El tenant es la organización en Entra ID; las suscripciones agrupan facturación y límites; los grupos de recursos agrupan recursos de un proyecto o entorno. Los permisos RBAC asignados arriba se heredan hacia abajo.

## Borrar un grupo
leccion: azure-grupos-query
¿Qué pasa al ejecutar `az group delete -n rg-datos-dev --yes`?
- [ ] Se borra el grupo y los recursos quedan sin grupo hasta que se asignen a otro.
- [x] Se borran el grupo y todos los recursos que contiene.
- [ ] El grupo se archiva 30 días sin costo y después se elimina.
- [ ] Da error si el grupo tiene recursos: primero hay que borrarlos uno por uno.
porque: Es la manera más rápida de limpiar un laboratorio, y también la más peligrosa: por eso conviene separar entornos en grupos distintos y proteger producción con bloqueos (*resource locks*).

## --query
leccion: azure-grupos-query
¿Qué devuelve `az storage account list --query "[?location=='eastus2'].name" -o tsv`?
- [ ] Todas las cuentas de eastus2 con todos sus campos, en formato JSON.
- [x] Los nombres de las cuentas ubicadas en eastus2, uno por línea.
- [ ] La cantidad de cuentas de almacenamiento que hay en eastus2.
- [ ] Un error, porque `--query` no admite filtros con condiciones.
porque: `[?condición]` filtra la lista con JMESPath, `.name` proyecta un campo y `-o tsv` saca texto plano, ideal para usar en scripts.

## ADLS Gen2
leccion: azure-storage
¿Qué convierte a una Storage Account en ADLS Gen2?
- [ ] Elegir el nivel de acceso "hot" para que los archivos se lean más rápido.
- [x] Habilitar el espacio de nombres jerárquico.
- [ ] Crear más de un contenedor dentro de la misma Storage Account.
- [ ] Elegir la redundancia geográfica (GRS) para la cuenta.
porque: El espacio de nombres jerárquico aporta directorios reales (renombrado atómico) y ACL por carpeta, que necesitan Spark, Databricks y Synapse para trabajar bien con el lago.

## RBAC sobre datos
leccion: azure-identidad-seguridad
Un usuario tiene el rol **Contributor** sobre la Storage Account, pero recibe "permiso denegado" al leer blobs con `--auth-mode login`. ¿Por qué?
- [ ] Porque Contributor solo permite ver la cuenta, no modificarla ni leerla.
- [x] Porque leer blobs requiere un rol de datos, como *Storage Blob Data Reader*.
- [ ] Porque los permisos de Azure tardan 24 horas en aplicarse.
- [ ] Porque solo el propietario de la suscripción puede leer blobs con `--auth-mode login`.
porque: Azure separa el **plano de control** (crear, configurar) del **plano de datos** (leer y escribir el contenido). Son roles distintos.

## Managed identity
leccion: azure-identidad-seguridad
Data Factory necesita escribir en el lago. ¿Cuál es la opción más segura?
- [ ] Guardar la clave de acceso de la Storage Account como parámetro del pipeline.
- [ ] Crear un usuario de Entra ID con contraseña para que lo use Data Factory.
- [x] La managed identity de Data Factory con un rol de datos sobre el contenedor.
- [ ] Hacer público el contenedor para que Data Factory no necesite credenciales.
porque: La managed identity no tiene secretos que guardar ni rotar, y el permiso se acota al recurso exacto (permisos mínimos).

## Key Vault
leccion: azure-identidad-seguridad
¿Qué comando lee solo el valor de un secreto para usarlo en un script?
- [ ] `az keyvault secret list --vault-name kv --query "[].value" -o tsv`
- [x] `az keyvault secret show --vault-name kv --name pg-pass --query value -o tsv`
- [ ] `az keyvault show --name kv --query "secrets.pg-pass" -o tsv`
- [ ] `az keyvault secret set --vault-name kv --name pg-pass -o tsv`
porque: `show` trae el secreto completo (con metadatos) y `--query value -o tsv` extrae solo el valor como texto plano. `list` no muestra valores.

## Data Factory
leccion: azure-servicios-datos
Necesitas copiar datos de un SQL Server que está en la oficina (red privada, sin acceso desde internet) a ADLS. ¿Qué componente de Data Factory hace falta?
- [ ] Un trigger de eventos que se dispare cuando cambie la base de la oficina.
- [x] Un self-hosted integration runtime dentro de esa red.
- [ ] Un data flow, que se conecta a cualquier red mediante Spark.
- [ ] Nada: el integration runtime de Azure llega a cualquier red privada.
porque: El integration runtime de Azure no ve redes privadas locales. El self-hosted IR corre dentro de la red y conecta la fuente con Data Factory.

## Scripts seguros
leccion: azure-automatizacion
¿Por qué un script de bash que crea recursos de Azure debería empezar con `set -euo pipefail`?
- [ ] Para que el script corra más rápido al ejecutar los comandos en paralelo.
- [x] Para que se detenga ante el primer error o variable no definida.
- [ ] Para que pida confirmación antes de ejecutar cada comando de `az`.
- [ ] Porque `az` exige esas opciones para poder autenticarse.
porque: Sin esas opciones, bash sigue después de un fallo: un `az group create` que falló puede dejar al resto del script operando con nombres vacíos o en el lugar equivocado.

## IaC en Azure
leccion: azure-automatizacion
¿Qué ventaja tiene definir los recursos con Bicep o Terraform frente a una lista de comandos `az`?
- [ ] Que permite crear recursos sin tener una suscripción de Azure activa.
- [x] Que es declarativo: calcula los cambios y se puede re-ejecutar sin duplicar.
- [ ] Que los recursos creados con IaC no se cobran durante el primer año.
- [ ] Que no requiere permisos de RBAC para crear los recursos.
porque: Un script imperativo puede fallar o duplicar recursos si lo corres dos veces. Las herramientas de IaC comparan lo deseado con lo existente y aplican solo la diferencia.
