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

### Azure SQL Database

Es **SQL Server ofrecido como servicio**: Microsoft cuida el servidor, los parches y las copias de seguridad, y tú solo creas la base y la consultas. Suele ser la base **operativa** (la que usa una aplicación) de la que después se copian datos al lago con Data Factory.

- **Servidor lógico y base de datos.** El servidor (`sql-datos-dev.database.windows.net`) no es una máquina: es un nombre que agrupa bases y guarda lo que comparten, como el cortafuegos y el administrador. La base es donde están las tablas y lo que se paga.
- **Cortafuegos.** Por defecto **nadie** puede conectarse. El primer error que ve casi todo el mundo es *"Client with IP address … is not allowed to access the server"*: se resuelve agregando tu IP en **Networking**. No abras `0.0.0.0 – 255.255.255.255` en un servidor real.
- **Autenticación.** Lo recomendado es **solo Microsoft Entra**: sin usuario y contraseña de SQL que haya que guardar o rotar.
- **Cadenas de conexión.** El portal las da listas para ADO.NET, JDBC (Spark y Databricks) y ODBC (Python).

### Colas, tablas y archivos de una cuenta de almacenamiento

Además de blobs, una cuenta de almacenamiento ofrece tres servicios más chicos:

| Servicio | Qué guarda | Ejemplo de uso |
|---|---|---|
| **Queues** | Mensajes cortos, en orden de llegada | "Llegó `ventas.csv`, procésalo": una parte del sistema avisa y otra retira el mensaje cuando puede |
| **Tables** | Filas sin esquema fijo, identificadas por `PartitionKey` y `RowKey` | Configuración o registros simples que se buscan por clave |
| **File shares** | Carpetas compartidas que se montan como un disco de red | Aplicaciones que esperan una carpeta compartida |

## Identidades: Microsoft Entra ID

Todo permiso en Azure se le da a una **identidad**, y las identidades viven en Microsoft Entra ID. Hay cuatro tipos:

| Tipo | Qué es | Cuándo se usa |
|---|---|---|
| **Usuario** | Una persona | Para entrar al portal y trabajar a mano |
| **Grupo** | Un conjunto de usuarios | Para dar permisos a un equipo de una sola vez |
| **Service principal** (registro de aplicación) | La identidad de un programa, con un secreto o un certificado | Para que algo que corre **fuera** de Azure (GitHub Actions, un script) pueda entrar |
| **Identidad administrada** | Una identidad que Azure crea y cuida para un recurso | Para que un recurso de Azure (Data Factory, Databricks) acceda a otro **sin guardar ninguna clave** |

Para que un programa entre con un service principal necesita tres datos: el **tenant ID**, el **client ID** y un **secreto**. Además hay que darle un **rol** en *Access control (IAM)* del recurso: sin rol, entra pero no puede hacer nada.

:::cuidado Los secretos vencen
Un secreto de aplicación dura como máximo 24 meses y **se muestra una sola vez** al crearlo. Si nadie lo rota antes de la fecha, lo que dependa de él deja de funcionar: es una causa frecuente de pipelines que "de repente" fallan. Guárdalo en Key Vault, nunca en el código. Y si el que necesita acceso es un recurso de Azure, usa su identidad administrada: no hay secreto que se filtre ni que venza.
:::

## Costos y supervisión

- **Cost Management**: **Análisis de costos** (por servicio, grupo de recursos o etiqueta), **Presupuestos** con alertas por correo al llegar a un porcentaje, recomendaciones de Advisor.
- **Registro de actividad**: quién creó, cambió o borró cada recurso, y cuándo.
- **Azure Monitor** junta lo que pasa con tus recursos. Tiene tres piezas que se usan juntas:

| Pieza | Qué es | Ejemplo |
|---|---|---|
| **Métricas** | Números que se miden cada minuto | Cuántas ejecuciones de un pipeline fallaron |
| **Reglas de alerta** | "Si esta métrica pasa este umbral, avisa", con una **severidad** de 0 (crítico) a 4 | Si hay más de 0 pipelines fallidos, avisar |
| **Grupos de acciones** | A quién y cómo se avisa (correo, SMS, webhook) | Un correo al equipo de guardia |

Una regla de alerta **sin** grupo de acciones se dispara y queda registrada, pero nadie se entera. Es un error común.

Los logs detallados se consultan en **Log Analytics** con el lenguaje **KQL**.

## Qué tiene la réplica y qué no

| En la réplica | Todavía no |
|---|---|
| Suscripción, grupos de recursos, asistentes de creación con validación y plantilla ARM, implementaciones, notificaciones | Grupos de administración, Azure Policy, varias suscripciones con datos reales |
| Storage (contenedores, blobs, colas, tablas, archivos compartidos, redundancia, ADLS Gen2), Key Vault (secretos, claves y certificados con RBAC), Databricks, Data Factory con Studio | Máquinas virtuales, Synapse, Fabric, Functions, redes virtuales completas |
| Azure SQL Database: servidor, cortafuegos, editor de consultas con T-SQL real y cadenas de conexión | Copias de seguridad y restauración, réplicas, escalado real |
| Microsoft Entra ID: usuarios, grupos y registros de aplicaciones con secretos, que después reciben roles en IAM | Acceso condicional, MFA, PIM |
| Monitor: métricas, reglas de alerta y grupos de acciones | Log Analytics con KQL, métricas reales |
| IAM con roles de control y de datos, bloqueos, etiquetas, registro de actividad, costos y presupuestos estimados, Cloud Shell con `az` | Costos reales |

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

:::ejercicio quiz
Un pipeline de GitHub Actions (corre fuera de Azure) debe subir archivos a tu cuenta de almacenamiento. ¿Qué identidad usa?
- [ ] La identidad administrada de la cuenta de almacenamiento
- [x] Un service principal (registro de aplicación) con un rol de datos sobre la cuenta
- [ ] Tu usuario y tu contraseña guardados en el repositorio
- [ ] La clave de acceso de la cuenta escrita en el archivo del workflow
:::

:::ejercicio quiz
Creaste una base de Azure SQL y, al abrir el editor de consultas, aparece "Client with IP address … is not allowed to access the server". ¿Qué haces?
- [ ] Borrar la base y crearla en otra región
- [x] Agregar tu dirección IP en las reglas del cortafuegos del servidor (Networking)
- [ ] Asignarte el rol Storage Blob Data Reader
- [ ] Subir el nivel de precio de la base
:::

:::ejercicio quiz
Una regla de alerta de Monitor se disparó anoche, pero nadie del equipo recibió nada. ¿Cuál es la causa más probable?
- [ ] La severidad era 0 y las críticas no se notifican
- [x] La regla no tiene un grupo de acciones asociado
- [ ] La métrica usaba la agregación Sum
- [ ] El registro de actividad estaba lleno
:::
