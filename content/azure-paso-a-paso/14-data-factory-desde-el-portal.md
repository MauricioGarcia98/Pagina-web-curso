---
titulo: Data Factory desde el portal - el recurso, su identidad y el Studio
nivel: 4 · Intermedio-avanzado
duracion: 40
resumen: Azure Data Factory orquesta el movimiento de datos - copia desde las fuentes al lago y dispara los notebooks. Creas adf-tiendaandina-dev, decides qué hacer con Git, conoces su identidad administrada, le das permiso de escritura sobre el lago sin guardar ni un secreto, y abres el Studio, donde se diseñan los pipelines.
objetivos: Crear un data factory con un nombre válido | Entender la opción de Git y cuándo configurarla | Explicar la identidad administrada del factory | Dar un rol de datos a una identidad administrada | Abrir Data Factory Studio desde el portal
prerrequisitos: azure-paso-a-paso-azure-databricks-desde-el-portal
autoevaluacion: ¿Sabes con qué identidad lee el lago un data factory? | ¿Sabes qué rol necesita para escribir en bronze? | ¿Sabes dónde se diseñan los pipelines? | ¿Sabes para qué sirve conectar Git?
---

## Paso 1 — Qué es Data Factory

**Azure Data Factory** (ADF) es el orquestador de datos de Azure: **copia** datos entre más de 90 tipos de origen y destino, **transforma** con data flows o llamando a Databricks, y **programa** todo con triggers. En Tienda Andina, ADF copia cada noche los pedidos de la base de ventas a `bronze` y después ejecuta el notebook que los limpia.

Igual que Databricks: el **recurso** se crea en el portal y los **pipelines** se diseñan en el **Studio**. El módulo [Azure y Azure CLI](#/m/azure) explica sus piezas, y el Studio de práctica trae su propia guía de inicio.

## Paso 2 — Crear el factory

**Create a resource → Data Factory**:

1. **Resource group**: `rg-tiendaandina-dev`.
2. **Name**: `adf-tiendaandina-dev` (3 a 63 caracteres, letras, números y guiones; **único en todo Azure**).
3. **Region**: East US 2. **Version**: V2.

```captura
archivo: azure/b14-adf-basics.webp
texto: Basics - el nombre (1) y la versión (2)
```

Pasa a **Git configuration**:

```captura
archivo: azure/b14-adf-git.webp
texto: Git configuration - Configure Git later
```

Con **Git** conectado (Azure DevOps o GitHub), cada cambio del Studio queda en una rama, se revisa con un pull request y se publica a otros entornos con CI/CD. Para aprender, marca **Configure Git later**; en un equipo real, el factory de **dev** se conecta a Git y los de **qa** y **prod** reciben los cambios solo por el pipeline de despliegue.

**Review + create → Create**:

```captura
archivo: azure/b14-adf-overview.webp
texto: El factory creado (1) y Launch studio (2)
```

## Paso 3 — La identidad administrada

Menú **Identity**:

```captura
archivo: azure/b14-adf-identidad.webp
texto: System assigned: On - la identidad administrada del factory
```

Cada data factory nace con una **identidad administrada** (*system-assigned managed identity*): una identidad de Entra ID que **pertenece al recurso**. Azure le administra las credenciales; tú no ves ni guardas ningún secreto, y nada vence.

## Paso 4 — Darle permiso sobre el lago

El factory va a **escribir** en bronze. En `sttiendaandinadev` → **Access control (IAM) → + Add role assignment**:

1. Rol: **Storage Blob Data Contributor**.
2. **Assign access to**: **Managed identity**.
3. **Members**: `adf-tiendaandina-dev`.

```captura
archivo: azure/b14-adf-rol.webp
texto: Assign access to Managed identity (1) y el factory como miembro (2)
```

Compáralo con el proyecto 3: para el programa externo hubo que registrar una aplicación, crear un secreto, guardarlo en el vault y anotar su vencimiento. Para el factory, **un rol y listo**.

:::tip La regla
Si quien necesita acceso **es un recurso de Azure** (Data Factory, Databricks, una Function, una VM), usa su **identidad administrada**. Usa un service principal con secreto solo para lo que corre **fuera** de Azure.
:::

Si el factory también necesita la contraseña de la base de ventas, se le da **Key Vault Secrets User** sobre `kv-tiendaandina-dev`, con el mismo procedimiento.

## Paso 5 — El Studio

En la hoja del factory, **Launch studio**:

```captura
archivo: azure/b14-adf-studio.webp
texto: Azure Data Factory Studio - Home, Author, Monitor y Manage
```

| Pestaña | Para qué |
|---|---|
| **Home** | Accesos rápidos y guía de inicio |
| **Author** | Diseñar pipelines, datasets y data flows |
| **Monitor** | Ver cada ejecución, su duración y sus errores |
| **Manage** | Linked services (conexiones), integration runtimes, triggers, Git |

Lo que sigue (linked service al lago, la actividad Copy, el trigger) se hace en el Studio, siguiendo la guía **Por dónde empezar** de su página Home.

## ✅ Lo que lograste

- Creaste el factory y sabes cuándo conectar Git.
- Entiendes la identidad administrada y le diste un rol de datos.
- Llegas al Studio desde el portal.

:::ejercicio quiz
¿Con qué identidad debería escribir Data Factory en el lago?
- [ ] Con la clave de la cuenta guardada en el pipeline
- [ ] Con el usuario de quien creó el factory
- [x] Con su identidad administrada y un rol de datos
- [ ] Con un service principal con secreto
:::

:::ejercicio quiz
El factory copia archivos a bronze. ¿Qué rol necesita sobre la cuenta?
- [ ] Storage Blob Data Reader
- [x] Storage Blob Data Contributor
- [ ] Owner
- [ ] Contributor
:::

:::ejercicio quiz
¿Dónde se diseña un pipeline de Data Factory?
- [ ] En la hoja del recurso en el portal
- [x] En Data Factory Studio, en la pestaña Author
- [ ] En Cloud Shell
- [ ] En Cost Management
:::

:::ejercicio quiz
¿Para qué se conecta un factory a Git?
- [ ] Para que corra más rápido
- [x] Para versionar los cambios, revisarlos y desplegarlos a otros entornos con CI/CD
- [ ] Para guardar los datos copiados
- [ ] Es obligatorio para crearlo
:::
