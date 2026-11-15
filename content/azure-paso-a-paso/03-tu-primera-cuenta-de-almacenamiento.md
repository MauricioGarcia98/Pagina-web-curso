---
titulo: Tu primera cuenta de almacenamiento (el futuro data lake)
nivel: 1 · Básico
duracion: 45
resumen: La cuenta de almacenamiento es donde un equipo de datos guarda sus archivos en Azure, y con el espacio de nombres jerárquico se convierte en un data lake (ADLS Gen2). Creas sttiendaandinadev recorriendo cada pestaña del asistente - Basics, Advanced, Networking, Data protection, Tags - con dos errores de nombre a propósito, eliges rendimiento y redundancia sabiendo qué significa cada opción, ves la plantilla ARM que el portal genera y sigues el despliegue hasta la hoja del recurso.
objetivos: Elegir un nombre válido y único para una cuenta de almacenamiento | Entender rendimiento (Standard/Premium) y redundancia (LRS, ZRS, GRS, GZRS) | Activar el espacio de nombres jerárquico para ADLS Gen2 | Recorrer las pestañas del asistente y sus valores por defecto | Ver la plantilla que el portal genera antes de crear
prerrequisitos: azure-paso-a-paso-suscripciones-y-grupos-de-recursos
autoevaluacion: ¿Sabes por qué el nombre de una cuenta tiene que ser único en todo Azure? | ¿Sabes la diferencia entre LRS y GRS? | ¿Sabes qué activa el espacio de nombres jerárquico? | ¿Sabes dónde ver la plantilla de lo que vas a crear?
---

:::escenario El pedido
Lucía: *"Necesitamos dónde guardar los archivos que llegan de las tiendas y de la web. Crea la cuenta `sttiendaandinadev` como data lake (ADLS Gen2), barata, en East US 2. Es dev: no hace falta copia en otra región."*
:::

## Paso 1 — Qué es una cuenta de almacenamiento

Una **cuenta de almacenamiento** (*storage account*) agrupa cuatro servicios de datos:

| Servicio | Qué guarda | Para un data engineer |
|---|---|---|
| **Blob** | Archivos de cualquier tipo (CSV, Parquet, JSON, imágenes) | El data lake: es lo que más se usa |
| **Files** | Carpetas compartidas que se montan como disco de red | Poco: aplicaciones que esperan una carpeta |
| **Queues** | Mensajes cortos entre aplicaciones | A veces: avisos de "llegó un archivo" |
| **Tables** | Datos clave-valor NoSQL | Poco |

Con el **espacio de nombres jerárquico** activado, el servicio Blob se convierte en **Azure Data Lake Storage Gen2 (ADLS Gen2)**: carpetas de verdad, permisos por carpeta y la dirección `abfss://` que usan Spark, Databricks, Fabric y Synapse.

## Paso 2 — Abrir el asistente

**Create a resource** muestra el catálogo (en el portal real se llama Marketplace):

```captura
archivo: azure/b03-crear-recurso.webp
texto: Create a resource - el catálogo de servicios que se pueden crear
```

Elige **Storage account → Create**.

## Paso 3 — Basics: el nombre, dos errores a propósito

Elige el grupo `rg-tiendaandina-dev`. En **Storage account name** escribe `datos`:

```captura
archivo: azure/b03-storage-nombre-tomado.webp
texto: "The storage account named datos is already taken" - el nombre es único en todo Azure
```

El nombre de la cuenta forma parte de su dirección web (`https://datos.blob.core.windows.net`), así que tiene que ser **único en todo Azure**, no solo en tu suscripción. Prueba ahora `StTiendaAndina`:

```captura
archivo: azure/b03-storage-nombre-mayus.webp
texto: Solo minúsculas y números, de 3 a 24 caracteres
```

Reglas del nombre:

- De **3 a 24** caracteres.
- Solo **minúsculas y números**: sin guiones, sin mayúsculas, sin espacios.
- Único en todo Azure.

Por eso la convención para storage es `st` + proyecto + entorno, todo junto: `sttiendaandinadev`.

## Paso 4 — Basics: rendimiento y redundancia

Completa:

1. **Resource group**: `rg-tiendaandina-dev`.
2. **Storage account name**: `sttiendaandinadev`.
3. **Region**: `(US) East US 2`.
4. **Primary workload / Performance**: **Standard**.
5. **Redundancy**: **Locally-redundant storage (LRS)**.

```captura
archivo: azure/b03-storage-basics.webp
texto: Basics completo - grupo (1), nombre (2), región (3), rendimiento (4) y redundancia (5)
```

**Rendimiento:**

| Opción | Qué es | Cuándo |
|---|---|---|
| **Standard** | Discos HDD/SSD compartidos, precio por GB bajo | Data lakes y casi todo lo demás |
| **Premium** | SSD con latencia muy baja, más caro | Muchas operaciones pequeñas por segundo |

**Redundancia** (cuántas copias guarda Azure y dónde):

| Opción | Copias | Sobrevive a… | Uso típico |
|---|---|---|---|
| **LRS** | 3 en un mismo datacenter | Falla de un disco o servidor | Dev, datos que se pueden regenerar |
| **ZRS** | 3 en zonas distintas de la región | Caída de un datacenter entero | Producción en una región |
| **GRS** | 3 locales + 3 en la región pareada | Caída de toda la región | Producción con recuperación ante desastres |
| **GZRS** | ZRS + 3 en la región pareada | Lo anterior, con más disponibilidad | Lo más crítico |

Con **RA-** delante (RA-GRS, RA-GZRS) además puedes **leer** la copia secundaria sin esperar a que Microsoft declare el desastre. Más copias = más caro. Para dev, **LRS** alcanza.

## Paso 5 — Advanced: activar ADLS Gen2

Pasa a **Advanced**:

```captura
archivo: azure/b03-storage-advanced.webp
texto: Advanced - Enable hierarchical namespace (1) y el nivel de acceso por defecto (2)
```

- Marca **Enable hierarchical namespace** (1). Esto la convierte en **ADLS Gen2**.
- **Access tier** (2): deja **Hot**, para datos que se leen seguido. **Cool** y **Cold** son más baratos por GB pero cobran más por cada lectura.
- Deja **Require secure transfer** marcado (solo HTTPS) y la versión mínima de TLS en **1.2**.
- **Allow enabling anonymous access** queda desmarcado: nadie puede leer tus datos sin identificarse.

:::cuidado El espacio de nombres jerárquico se decide al crear
Se puede activar después con una migración, pero **nunca se puede desactivar**. Si la cuenta va a ser un data lake, actívalo desde el principio.
:::

## Paso 6 — Networking, Data protection y Tags

```captura
archivo: azure/b03-storage-red.webp
texto: Networking - acceso público desde todas las redes (por ahora) y el aviso de seguridad
```

Para practicar deja **Enable public access from all networks**. El aviso amarillo dice algo importante: en producción se limita a ciertas redes o se usa un *private endpoint*. Lo ves en el nivel 5.

```captura
archivo: azure/b03-storage-proteccion.webp
texto: Data protection - la papelera de blobs y de contenedores (soft delete)
```

**Soft delete** es la papelera: un blob borrado se puede recuperar durante 7 días. Déjalo activado.

En **Tags** agrega `proyecto = tienda-andina` y `entorno = dev`.

## Paso 7 — Review + create y la plantilla

Haz clic en **Review + create**:

```captura
archivo: azure/b03-storage-revisar.webp
texto: Validation passed (1) y el enlace para descargar la plantilla (2)
```

Antes de crear, haz clic en **Download a template for automation**:

```captura
archivo: azure/b03-plantilla.webp
texto: La plantilla ARM que el portal arma con lo que elegiste - también en Bicep y Azure CLI
```

Ese JSON es **exactamente** lo que el portal le pide a Azure. Si lo guardas, puedes crear la misma cuenta otra vez sin pasar por el asistente. Mira las pestañas **Bicep** y **Azure CLI**: son lo mismo en otros formatos. En el nivel 6 escribes tus propias plantillas.

Cierra el panel y haz clic en **Create**:

```captura
archivo: azure/b03-despliegue-progreso.webp
texto: Deployment is in progress
```

```captura
archivo: azure/b03-despliegue-ok.webp
texto: Your deployment is complete (1) y Go to resource (2)
```

## Paso 8 — La hoja de la cuenta

Haz clic en **Go to resource**:

```captura
archivo: azure/b03-storage-overview.webp
texto: La cuenta sttiendaandinadev - Essentials (1), propiedades del servicio Blob (2) y el menú del recurso (3)
```

Revisa que diga **Hierarchical namespace: Enabled** y **Replication: Locally-redundant storage (LRS)**. Más abajo están los **Endpoints**: la dirección `blob` y la dirección `dfs` de Data Lake. El menú de la izquierda tiene todo lo que harás en el nivel 2: **Containers**, **Storage browser**, **Access keys**, **Data protection**, **Lifecycle management**.

## ✅ Lo que lograste

- Creaste `sttiendaandinadev` como ADLS Gen2 con Standard y LRS.
- Sabes qué significa cada opción de rendimiento y redundancia.
- Viste la plantilla que hay detrás de cada creación en el portal.

:::ejercicio quiz
¿Por qué falla el nombre `datos` para una cuenta de almacenamiento?
- [ ] Porque es muy corto
- [x] Porque el nombre es parte de una dirección web y tiene que ser único en todo Azure
- [ ] Porque no tiene números
- [ ] Porque falta el prefijo `st`
:::

:::ejercicio quiz
Es un entorno de desarrollo y los datos se pueden volver a cargar. ¿Qué redundancia conviene?
- [x] LRS: tres copias en un datacenter, la más barata
- [ ] GZRS: es la más segura
- [ ] RA-GRS: siempre hay que poder leer la copia
- [ ] Ninguna: Azure no copia nada
:::

:::ejercicio quiz
¿Qué hace "Enable hierarchical namespace"?
- [ ] Activa el cifrado
- [x] Convierte el servicio Blob en ADLS Gen2, con carpetas reales y permisos por carpeta
- [ ] Copia los datos a otra región
- [ ] Permite el acceso anónimo
:::

:::ejercicio quiz
¿Qué es la plantilla que muestra "Download a template for automation"?
- [ ] Un informe de costos
- [ ] Un manual de uso
- [x] La definición en JSON (ARM) de lo que el portal va a crear, para repetirlo sin el asistente
- [ ] La lista de permisos del recurso
:::
