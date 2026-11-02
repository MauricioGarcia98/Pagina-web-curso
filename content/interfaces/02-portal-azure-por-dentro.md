---
titulo: El portal de Azure por dentro - qué es cada parte y para qué sirve
nivel: Intermedio
duracion: 45
resumen: Recorrido completo por el portal de Azure - la jerarquía tenant, suscripción, grupo de recursos y recurso; la barra superior, las hojas (blades), el asistente de creación, IAM, bloqueos, etiquetas, costos y los recursos de datos (Storage, Key Vault, Databricks, Data Factory).
objetivos: Explicar la jerarquía tenant → grupos de administración → suscripción → grupo de recursos → recurso | Ubicar cada zona del portal y de la hoja de un recurso | Crear recursos con el asistente y entender la implementación (deployment) | Dar permisos con RBAC distinguiendo plano de control y plano de datos | Configurar una cuenta de almacenamiento y un Key Vault para un proyecto de datos
prerrequisitos: azure-nube-azure | azure-identidad-seguridad
autoevaluacion: ¿Sabes en qué orden se anidan tenant, suscripción, grupo de recursos y recurso? | ¿Sabes para qué sirve cada pestaña de la hoja de un recurso? | ¿Sabes por qué un Owner puede no poder leer los blobs de una cuenta? | ¿Sabes cuándo elegir LRS, ZRS o GRS? | ¿Sabes qué diferencia hay entre un bloqueo y un rol?
---

:::tip Practícalo mientras lees
Abre el [portal de Azure de práctica](#/azure) y busca cada parte. Usa el botón **🎯 Retos** de abajo a la derecha: los retos te llevan por casi todo lo que explica esta lección.
:::

## La jerarquía: dónde vive cada cosa

```text
Tenant de Microsoft Entra ID  (tu organización: usuarios, grupos, aplicaciones)
└── Grupos de administración   (opcional: agrupar suscripciones para aplicar políticas)
    └── Suscripción            (la "cuenta de facturación" y límite de permisos)
        └── Grupo de recursos  (carpeta lógica: todo lo de un proyecto o entorno)
            └── Recurso        (una cuenta de almacenamiento, un Key Vault, un workspace…)
```

- **Tenant (inquilino)**: la identidad de tu organización en Microsoft Entra ID (antes Azure Active Directory). Ahí viven los usuarios y grupos.
- **Suscripción**: todo lo que se crea se cobra a una suscripción. Las empresas suelen separar *desarrollo* y *producción* en suscripciones distintas.
- **Grupo de recursos**: agrupa recursos que nacen, se administran y se borran juntos. Borrar el grupo borra todo lo de adentro.
- **Región**: dónde están físicamente los datos (East US, Brazil South…). Muchas regiones tienen **zonas de disponibilidad**: centros de datos separados dentro de la región.

Los **permisos, bloqueos, etiquetas y políticas se heredan** hacia abajo: un rol dado en la suscripción vale para todos sus grupos y recursos.

## La ventana del portal

| Zona | Qué es |
|---|---|
| **☰ Menú del portal** | Inicio, Panel, Todos los servicios, **Favoritos** (los servicios que fijas) |
| **Buscar** (atajo `G` + `/`) | Busca recursos, servicios, grupos y documentación a la vez |
| **Cloud Shell** (ícono `>_`) | Una terminal con **Azure CLI** y PowerShell ya autenticadas en tu cuenta |
| **Notificaciones** (campana) | El avance de las implementaciones y operaciones largas |
| **Configuración** (engranaje) | Directorios y suscripciones, idioma, tema, filtro de suscripciones |
| **Ayuda** y **cuenta** | Soporte, comentarios; cambiar de directorio, cerrar sesión |
| **Inicio** | Servicios de Azure, recursos recientes, herramientas (Microsoft Learn, Cost Management) |

### La hoja (blade) de un recurso

Cuando abres un recurso, se abre una **hoja**: un menú a la izquierda y el contenido a la derecha. Las hojas se apilan hacia la derecha y la **ruta de navegación** (*breadcrumb*) arriba te deja volver.

| Sección del menú | Qué hay |
|---|---|
| **Información general** (*Overview*) | **Essentials**: grupo de recursos, ubicación, suscripción, etiquetas, estado. Arriba, la barra de comandos (Eliminar, Mover, Actualizar). **Vista JSON**: el recurso completo con su ID |
| **Registro de actividad** | Quién hizo qué y cuándo sobre el recurso (crear, cambiar, borrar, dar permisos) |
| **Control de acceso (IAM)** | Asignaciones de roles, comprobar acceso, roles disponibles |
| **Etiquetas** | Pares clave=valor (entorno=dev, equipo=datos) para organizar y repartir costos |
| **Diagnosticar y solucionar problemas** | Detectores automáticos de problemas comunes |
| **Configuración** | Lo propio de cada servicio, más **Bloqueos**, **Propiedades** y **Exportar plantilla** (el recurso como ARM/Bicep) |
| **Supervisión** | **Métricas**, **Alertas**, **Configuración de diagnóstico** (enviar logs a Log Analytics), **Registros** |
| **Automatización** | Tareas, exportar plantilla, CLI/PowerShell de ejemplo |

## Crear un recurso: el asistente

**Crear un recurso** abre un asistente con pestañas. En casi todos los servicios:

1. **Aspectos básicos** (*Basics*): suscripción, grupo de recursos, **nombre** (muchos deben ser únicos en todo Azure) y región.
2. Pestañas propias del servicio: *Opciones avanzadas*, *Redes*, *Protección de datos*, *Cifrado*…
3. **Etiquetas**.
4. **Revisar y crear**: Azure **valida** la configuración. Desde ahí puedes **descargar la plantilla para automatización** (ARM).
5. **Crear** lanza una **implementación** (*deployment*): verás *La implementación está en curso* y después *Se completó*, con un botón **Ir al recurso**. El historial queda en *Grupo de recursos → Implementaciones*.

Todo lo que haces en el portal es una llamada a **Azure Resource Manager (ARM)**, la misma API que usan la CLI, Bicep y Terraform. Por eso un recurso creado con clics se puede exportar como código.

## Permisos: Azure RBAC

Una **asignación de rol** une tres cosas:

| Pieza | Ejemplos |
|---|---|
| **Entidad de seguridad** (quién) | Usuario, grupo, **service principal** (una aplicación), **identidad administrada** (la identidad propia de un recurso, sin contraseñas) |
| **Rol** (qué puede hacer) | Owner, Contributor, Reader, *Storage Blob Data Contributor*, *Key Vault Secrets User*… |
| **Ámbito** (dónde) | Grupo de administración, suscripción, grupo de recursos o un recurso puntual |

La diferencia que más confunde:

- **Plano de control**: administrar el recurso (crearlo, configurarlo, borrarlo). Lo dan **Owner**, **Contributor** y **Reader**.
- **Plano de datos**: el contenido (leer blobs, leer secretos). Lo dan los roles **de datos**: *Storage Blob Data Reader/Contributor*, *Key Vault Secrets User/Officer*.

Por eso un **Owner** de la suscripción puede administrar una cuenta de almacenamiento y aun así recibir *"This request is not authorized to perform this operation using this permission"* al listar sus blobs: le falta el rol de datos. La regla de oro es el **mínimo privilegio**: el rol más chico, en el ámbito más chico. Para permisos temporales de administrador existe **Privileged Identity Management (PIM)**.

## Bloqueos, etiquetas y políticas

- **Bloqueos** (*Locks*): **No se puede eliminar** (*CanNotDelete*) o **Solo lectura** (*ReadOnly*). Frenan **incluso a un Owner**. Se usan en producción para evitar borrados por error.
- **Etiquetas**: no dan permisos; sirven para buscar, organizar y **repartir costos** (Cost Management agrupa por etiqueta).
- **Azure Policy**: reglas que se evalúan al crear o cambiar recursos ("solo estas regiones", "toda cuenta de almacenamiento sin acceso público", "etiqueta *entorno* obligatoria").

## Los recursos de un proyecto de datos

### Cuenta de almacenamiento (Storage account)

| Opción | Qué decide |
|---|---|
| **Rendimiento** | *Standard* (discos HDD, lo normal para datos) o *Premium* (SSD, baja latencia) |
| **Redundancia** | **LRS** (3 copias en un centro de datos), **ZRS** (3 zonas de la región), **GRS** (además, copia en otra región), **RA-GRS** (y lectura en la otra región), **GZRS** |
| **Espacio de nombres jerárquico** | Activarlo la convierte en **Azure Data Lake Storage Gen2**: carpetas reales, permisos por carpeta (ACL) y la ruta `abfss://` que usan Spark y Databricks |
| **Nivel de acceso** | **Hot** (acceso frecuente), **Cool** (30 días), **Cold** (90 días), **Archive** (horas para recuperar). Las reglas de **administración del ciclo de vida** mueven archivos viejos a niveles más baratos |
| **Acceso a los datos** | Con **Entra ID + RBAC** (recomendado), **claves de acceso** (dan control total: evitarlas) o **SAS** (un enlace con permisos y vencimiento) |
| **Redes** | Acceso público desde todas las redes, desde redes seleccionadas, o deshabilitado con **puntos de conexión privados** |
| **Protección de datos** | Eliminación temporal (*soft delete*) de blobs y contenedores, versionado, inmutabilidad |

Dentro de la cuenta: **contenedores** (en ADLS Gen2, *sistemas de archivos*) y dentro, **blobs** (archivos). El **Explorador de almacenamiento** del portal permite subir, descargar y borrar.

### Key Vault

Guarda **secretos** (contraseñas, cadenas de conexión), **claves** de cifrado y **certificados**. Lo importante:

- **Modelo de permisos**: **RBAC de Azure** (recomendado) o el antiguo **directivas de acceso**.
- **Eliminación temporal** (obligatoria) y **protección de purga**: un secreto borrado se puede recuperar durante el período de retención, y con protección de purga ni un administrador puede borrarlo definitivamente antes de tiempo.
- Se usa desde Databricks (*secret scope* respaldado por Key Vault), Data Factory (linked service de Key Vault) y las aplicaciones, siempre con **identidades administradas**.

### Azure Databricks (el recurso)

En el portal creas el **workspace**: nivel de precios (*Premium* para Unity Catalog), región y redes (**inyección en tu VNet**, **conectividad segura de clúster** sin IP públicas). Azure crea además un **grupo de recursos administrado** con las máquinas y discos de los clústeres: no lo toques a mano. Lo de adentro (notebooks, tablas, jobs) se administra en el workspace, con el botón **Iniciar área de trabajo**.

### Data Factory

En el portal creas el factory (nombre único, región, Git ahora o después). Todo el diseño se hace en **Azure Data Factory Studio** (botón **Iniciar Studio**): ver la lección siguiente. El factory tiene su **identidad administrada**, a la que le das roles de datos sobre el almacenamiento.

## Costos y supervisión

- **Cost Management**: **Análisis de costos** (por servicio, grupo de recursos o etiqueta), **Presupuestos** con alertas por correo al llegar a un porcentaje, recomendaciones de Advisor.
- **Azure Monitor**: métricas, alertas, **Log Analytics** (consultas KQL sobre los logs) y el **registro de actividad** de toda la suscripción.
- **Microsoft Entra ID**: usuarios, grupos, **registros de aplicaciones** (service principals) y aplicaciones empresariales.

## Qué tiene la réplica y qué no

| En la réplica | Todavía no |
|---|---|
| Suscripción, grupos de recursos, asistentes de creación con validación y plantilla ARM, implementaciones, notificaciones | Grupos de administración, Azure Policy, varias suscripciones con datos reales |
| Storage (contenedores, blobs, redundancia, ADLS Gen2), Key Vault (secretos, RBAC), Databricks, Data Factory con Studio, Event Hubs básico | Máquinas virtuales, SQL Database, Synapse, Fabric, Functions, redes virtuales completas, Monitor con KQL |
| IAM con roles de control y de datos, bloqueos, etiquetas, registro de actividad, costos y presupuestos estimados, Cloud Shell con `az` | Costos reales, métricas reales, PIM, Entra ID completo |

:::ejercicio quiz
Eres Owner de la suscripción y, al abrir un contenedor, el portal dice que no tienes permiso para listar los blobs. ¿Qué falta?
- [ ] Ser Owner de la cuenta de almacenamiento
- [x] Un rol de datos, por ejemplo Storage Blob Data Reader o Contributor
- [ ] Un bloqueo de solo lectura
- [ ] Una etiqueta de acceso
:::

:::ejercicio quiz
Necesitas que tu lago de datos tenga carpetas reales y que Spark lo lea con `abfss://`. ¿Qué activas al crear la cuenta?
- [ ] Redundancia GRS
- [ ] Nivel de acceso Archive
- [x] El espacio de nombres jerárquico (ADLS Gen2)
- [ ] La eliminación temporal
:::

:::ejercicio quiz
¿Qué evita que alguien borre por error el grupo de recursos de producción, aunque sea Owner?
- [ ] Una etiqueta entorno=prod
- [x] Un bloqueo No se puede eliminar (CanNotDelete)
- [ ] Quitarle el rol Reader
- [ ] Un presupuesto
:::

:::ejercicio quiz
Data Factory necesita leer tu almacenamiento sin guardar contraseñas en ningún lado. ¿Qué usas?
- [ ] La clave de acceso de la cuenta en el linked service
- [ ] Un SAS sin vencimiento
- [x] La identidad administrada del factory con un rol de datos sobre la cuenta
- [ ] Hacer público el contenedor
:::
