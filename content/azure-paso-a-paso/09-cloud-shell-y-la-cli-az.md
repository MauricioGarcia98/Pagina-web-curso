---
titulo: Cloud Shell y la CLI az - lo mismo, desde la terminal
nivel: 3 · Intermedio
duracion: 40
resumen: Todo lo que hiciste con clics se puede hacer con comandos, y los comandos se pueden repetir, guardar y automatizar. Abres Cloud Shell desde el portal, consultas tu suscripción, grupos y cuentas con az y la opción --query, creas un grupo de recursos de prueba desde la terminal y ves cómo aparece en el portal al instante, y lo borras al terminar.
objetivos: Abrir Cloud Shell desde el portal | Entender la forma de un comando az (grupo, subgrupo, acción, parámetros) | Elegir el formato de salida con -o table, json o tsv | Filtrar columnas con --query | Crear y borrar un grupo de recursos desde la terminal
prerrequisitos: azure-paso-a-paso-proyecto-lago-con-capas
autoevaluacion: ¿Sabes en qué suscripción está trabajando la CLI? | ¿Sabes mostrar solo los nombres de tus grupos? | ¿Sabes qué hace --yes en un borrado? | ¿Sabes por qué la CLI es mejor que el portal para tareas repetidas?
---

:::analogia Del control remoto a escribir la orden
El portal es un control remoto con botones; la CLI es escribir la orden completa. La orden escrita se puede repetir, guardar en un script y revisar en Git, y ambas hablan con el mismo Azure Resource Manager: lo que creas con una aparece en la otra.
:::

## Paso 1 — Qué es Cloud Shell

**Cloud Shell** es una terminal Linux en el navegador, ya conectada a tu cuenta y con la **CLI de Azure (`az`)** instalada. No hay que instalar nada ni iniciar sesión. Ábrela con el ícono de terminal de la barra superior:

```captura
archivo: azure/b09-shell.webp
texto: El botón de Cloud Shell (1) abre la terminal abajo del portal (2)
```

:::nota En el Azure real
La primera vez, Cloud Shell pregunta si quieres **Bash** o **PowerShell** y si quieres guardar tus archivos en una cuenta de almacenamiento o usar una sesión **efímera** (sin almacenamiento, los archivos se pierden al cerrar). En tu computadora puedes instalar la misma CLI y entrar con `az login`.
:::

## Paso 2 — La forma de un comando az

`az storage account list -g rg-tiendaandina-dev -o table`, por partes:

| Parte | Qué es |
|---|---|
| `az` | La CLI de Azure |
| `storage` | El grupo de servicio (almacenamiento) |
| `account` | El subgrupo (cuentas de almacenamiento) |
| `list` | La acción: `list`, `show`, `create`, `delete`, `update` |
| `-g rg-tiendaandina-dev` | Un parámetro: en qué grupo de recursos |
| `-o table` | El formato de salida: tabla (también `json`, `tsv`, `yaml`) |

Siempre es **qué** (grupo y subgrupo) + **qué hacer** (acción) + **sobre qué** (parámetros). Con `--help` al final de cualquier parte ves las opciones: `az storage account create --help`.

## Paso 3 — Consultar

Escribe estos tres comandos:

```bash
az account show -o table
az group list -o table
az storage account list -g rg-tiendaandina-dev --query "[].{nombre:name, sku:sku.name, hns:isHnsEnabled}" -o table
```

Para verlos mejor, usa el botón de maximizar de la terminal:

```captura
archivo: azure/b09-shell-consultas.webp
texto: Cloud Shell maximizado (1) - la suscripción activa, los grupos y la cuenta con las columnas elegidas
```

| Comando | Qué responde |
|---|---|
| `az account show` | ¿En qué **suscripción** estoy trabajando? (lo primero que se revisa siempre) |
| `az group list` | ¿Qué grupos de recursos hay? |
| `az storage account list --query …` | Las cuentas del grupo, con solo las columnas que te interesan |

**Formatos de salida** (`-o`):

| Formato | Cuándo |
|---|---|
| `json` (por defecto) | Para leer todo el detalle o pasarlo a otro programa |
| `table` | Para leerlo tú |
| `tsv` | Para usar el valor en un script (sin comillas ni encabezados) |

**`--query`** usa el lenguaje JMESPath: `[]` recorre la lista y `{nombre:name}` elige y renombra campos. `--query "[].name" -o tsv` devuelve solo los nombres, uno por línea.

## Paso 4 — Crear desde la terminal

Sin cerrar la terminal, con la lista de **Resource groups** abierta en el portal, crea un grupo de prueba:

```bash
az storage blob list --account-name sttiendaandinadev -c bronze --auth-mode login --query "[].name" -o tsv
az group create -n rg-tiendaandina-sandbox -l eastus2 --tags entorno=sandbox
```

```captura
archivo: azure/b09-shell-crear.webp
texto: El grupo creado con az group create (1) aparece al instante en la lista del portal (2)
```

El portal y la CLI hablan con **la misma API** de Azure (Azure Resource Manager): lo que creas por un lado aparece en el otro.

:::tip `--auth-mode login`
En los comandos de datos (`az storage blob …`), `--auth-mode login` usa tu usuario de Entra en lugar de la clave de la cuenta, igual que el botón *Switch to Microsoft Entra user account* del portal. Es la forma recomendada.
:::

## Paso 5 — Borrar

```bash
az group delete -n rg-tiendaandina-sandbox --yes
az group list --query "[].name" -o tsv
```

```captura
archivo: azure/b09-shell-borrar.webp
texto: El grupo de prueba borrado y la lista de grupos que queda
```

`--yes` evita la pregunta de confirmación: útil en scripts, peligroso a mano. En Azure real, `az group delete` tarda unos minutos porque borra cada recurso; con `--no-wait` devuelve el control enseguida.

## Paso 6 — Portal o CLI

| Situación | Mejor opción |
|---|---|
| Aprender un servicio, ver sus opciones | Portal |
| Revisar algo puntual | Portal o CLI |
| Hacer lo mismo en 10 recursos | **CLI** (un bucle) |
| Guardar los pasos para que otro los repita | **CLI** en un script, o una plantilla |
| Producción | **Plantillas** (nivel 6) y pipelines de CI/CD |

:::errores
- **Crear o borrar sin `az account show`.** Si estás en otra suscripción, el comando actúa sobre otra cosa.
- **Parsear la salida de tabla en scripts.** Usa `--query` y `-o tsv` para obtener valores limpios.
- **Usar la clave de la cuenta en la CLI.** `--auth-mode login` usa tu identidad y tus roles.
:::

## ✅ Lo que lograste

- Abres Cloud Shell y entiendes la forma de cualquier comando `az`.
- Consultas con `-o table` y `--query`.
- Creas y borras recursos desde la terminal y los ves en el portal.

:::ejercicio quiz
¿Qué comando revisas primero antes de crear o borrar algo con la CLI?
- [ ] `az group list`
- [x] `az account show`, para confirmar en qué suscripción estás
- [ ] `az --version`
- [ ] `az login`
:::

:::ejercicio quiz
Quieres solo los nombres de los grupos, uno por línea, para usarlos en un script. ¿Qué escribes?
- [ ] `az group list -o table`
- [ ] `az group list`
- [x] `az group list --query "[].name" -o tsv`
- [ ] `az group show`
:::

:::ejercicio quiz
Creaste un grupo con la CLI. ¿Aparece en el portal?
- [x] Sí: portal y CLI usan la misma API de Azure Resource Manager
- [ ] No, los recursos de la CLI son invisibles en el portal
- [ ] Solo al día siguiente
- [ ] Sí, pero solo después de refrescar con az portal sync
:::

:::ejercicio quiz
¿Qué hace `--auth-mode login` en `az storage blob list`?
- [ ] Pide la contraseña de la cuenta de almacenamiento
- [x] Usa tu usuario de Microsoft Entra en lugar de la clave de la cuenta
- [ ] Inicia sesión en el portal
- [ ] Desactiva la autenticación
:::
