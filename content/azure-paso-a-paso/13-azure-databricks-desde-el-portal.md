---
titulo: Azure Databricks desde el portal - el workspace y su grupo administrado
nivel: 4 · Intermedio-avanzado
duracion: 40
resumen: Desde el portal se crea el recurso de Azure Databricks; lo de adentro (notebooks, clústeres, tablas) se trabaja en el workspace. Creas dbw-tiendaandina-dev eligiendo el nivel de precio y la conectividad segura, ves qué es el grupo de recursos administrado que Azure crea solo, por qué no puedes borrarlo ni tocarlo (deny assignment) y cómo se pasa del portal al workspace con Launch Workspace.
objetivos: Crear un workspace de Azure Databricks con sus opciones de red | Explicar qué administra el portal y qué el workspace | Entender el grupo de recursos administrado y su deny assignment | Saber qué genera costo en Databricks | Abrir el workspace desde el portal
prerrequisitos: azure-paso-a-paso-proyecto-un-programa-sin-contrasenas
autoevaluacion: ¿Sabes qué hay en el grupo administrado? | ¿Sabes por qué no puedes borrarlo? | ¿Sabes qué es Secure Cluster Connectivity? | ¿Sabes qué genera costo en Databricks?
---

## Paso 1 — Portal y workspace: dos lugares distintos

| Dónde | Qué se administra | Quién |
|---|---|---|
| **Portal de Azure** | El **recurso** Azure Databricks: región, red, cifrado, permisos de Azure, costo | Quien administra la nube |
| **Workspace de Databricks** | Lo de **adentro**: notebooks, clústeres, jobs, Unity Catalog, SQL warehouses | El equipo de datos |

Este curso cubre la parte del portal. Lo de adentro está en el curso [Databricks paso a paso](#/m/databricks-paso-a-paso).

## Paso 2 — Crear el workspace

**Create a resource → Azure Databricks**:

1. **Resource group**: `rg-tiendaandina-dev`.
2. **Workspace name**: `dbw-tiendaandina-dev` (3 a 64 caracteres: letras, números, `_` y `-`).
3. **Region**: East US 2.
4. **Pricing Tier**: **Premium**.
5. **Managed Resource Group name**: déjalo vacío para que Azure lo nombre.

```captura
archivo: azure/b13-dbw-basics.webp
texto: Basics - el nombre (1), el nivel de precio (2) y el grupo administrado (3)
```

:::nota Premium
Hoy los workspaces nuevos de Azure Databricks son **Premium** (control de acceso por roles, Unity Catalog, SQL warehouses). La opción **Trial** da 14 días de DBU gratis para probar; las máquinas virtuales se pagan igual.
:::

Pasa a **Networking**:

```captura
archivo: azure/b13-dbw-red.webp
texto: Networking - Secure Cluster Connectivity (sin IP pública) y despliegue en tu propia red virtual
```

| Opción | Qué hace | Recomendación |
|---|---|---|
| **Secure Cluster Connectivity (No Public IP)** | Las máquinas de los clústeres no tienen IP pública | **Yes**, siempre |
| **Deploy in your own Virtual Network (VNet injection)** | Los clústeres viven en una red tuya | En empresas con redes privadas; para aprender, **No** |

**Review + create**:

```captura
archivo: azure/b13-dbw-revisar.webp
texto: Validation passed (1) y el resumen con el grupo administrado que se va a crear (2)
```

Haz clic en **Create**. Un workspace tarda algo más que una cuenta (en Azure real, varios minutos).

## Paso 3 — La hoja del workspace

```captura
archivo: azure/b13-dbw-overview.webp
texto: El workspace - Essentials con el grupo administrado y la URL (1), y Launch Workspace (2)
```

- **Managed Resource Group**: un grupo nuevo, `databricks-rg-dbw-tiendaandina-dev-…`.
- **URL**: la dirección del workspace, `adb-….azuredatabricks.net`.
- **Launch Workspace** abre el workspace. En la práctica te lleva al [Databricks de práctica](#/databricks).

## Paso 4 — El grupo de recursos administrado

Haz clic en el **Managed Resource Group**:

```captura
archivo: azure/b13-rg-administrado.webp
texto: El grupo administrado por Databricks - su red, su grupo de seguridad, la cuenta del workspace y el conector de Unity Catalog
```

Azure Databricks crea este grupo con lo que necesita para funcionar: una **red virtual**, un **grupo de seguridad de red**, una **cuenta de almacenamiento** interna del workspace y el **Access Connector** que usa Unity Catalog. Cuando enciendes un clúster, sus **máquinas virtuales** también aparecen aquí.

Prueba **Delete resource group**:

```captura
archivo: azure/b13-rg-administrado-error.webp
texto: El borrado falla - "denied because of the deny assignment" creada por Azure Databricks
```

El grupo tiene una **deny assignment**: una regla que niega cambios aunque seas Owner. Así nadie rompe el workspace borrando su red por error. El grupo se borra **solo** cuando borras el workspace.

:::cuidado Qué cuesta en Databricks
El workspace en sí no cobra. Cobran las **máquinas virtuales** de los clústeres (en tu suscripción, dentro del grupo administrado) y los **DBU** (la unidad de Databricks) mientras están encendidos. Un clúster olvidado encendido todo el fin de semana es el clásico susto en la factura: configura siempre el **apagado automático** (*auto termination*).
:::

## ✅ Lo que lograste

- Creaste un workspace Premium con conectividad segura.
- Distingues lo que se administra en el portal y en el workspace.
- Entiendes el grupo administrado y su deny assignment.

:::ejercicio quiz
¿Dónde creas un notebook de Databricks?
- [ ] En el portal de Azure, en la hoja del workspace
- [x] En el workspace de Databricks, al que llegas con Launch Workspace
- [ ] En Cloud Shell
- [ ] En el grupo administrado
:::

:::ejercicio quiz
¿Por qué no puedes borrar el grupo `databricks-rg-…` aunque seas Owner?
- [ ] Porque tiene un bloqueo que pusiste tú
- [x] Porque Azure Databricks le puso una deny assignment; se borra al borrar el workspace
- [ ] Porque está en otra suscripción
- [ ] Porque está vacío
:::

:::ejercicio quiz
¿Qué hace Secure Cluster Connectivity (No Public IP)?
- [ ] Cifra los datos del lago
- [x] Las máquinas de los clústeres no tienen IP pública
- [ ] Desactiva internet en el workspace
- [ ] Obliga a usar VPN
:::

:::ejercicio quiz
¿Qué genera costo en Azure Databricks?
- [ ] El workspace, aunque no se use
- [x] Las máquinas virtuales y los DBU mientras los clústeres están encendidos
- [ ] Solo los notebooks guardados
- [ ] Nada, es gratis
:::
