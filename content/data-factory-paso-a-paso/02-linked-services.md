---
titulo: Linked services - las conexiones, con la identidad del factory
nivel: 1 · Básico
duracion: 40
resumen: Un linked service es la conexión que usan los datasets y las actividades. Creas la conexión al lago con la identidad administrada del factory, ves fallar el Test connection por falta de permiso, asignas el rol justo en el portal y vuelves a probar con éxito; después agregas la conexión a Key Vault y lees el JSON de un linked service para comprobar que no guarda ningún secreto.
objetivos: Crear un linked service a ADLS Gen2 con identidad administrada | Interpretar un error AuthorizationPermissionMismatch | Asignar el rol de datos correcto al factory | Crear un linked service a Key Vault | Leer la definición JSON de una conexión
prerrequisitos: data-factory-paso-a-paso-que-es-data-factory-y-el-studio
autoevaluacion: ¿Sabes qué método de autenticación conviene para el lago? | ¿Sabes qué rol necesita el factory para escribir? | ¿Sabes para qué sirve probar la conexión antes de crear? | ¿Sabes por qué el JSON no tiene contraseña?
---

:::analogia La agenda de contactos con la llave
Un linked service es una ficha de la agenda: dice a dónde llamar (la cuenta, la base, el workspace) y con qué llave entrar. Con identidad administrada, la llave es el propio factory: no hay contraseña que guardar ni que se filtre, pero alguien tiene que darle permiso en la puerta (un rol).
:::

## Paso 1 — Qué es un linked service

Un **linked service** es como una cadena de conexión con nombre: dice **a dónde** conectarse (la cuenta, el servidor, el workspace) y **con qué credencial**. Se crea una vez y lo reutilizan todos los datasets y actividades.

Ve a **Manage → Linked services**:

```captura
archivo: adf/b02-linked-vacio.webp
texto: Linked services, todavía vacío - el botón New (1)
```

## Paso 2 — La conexión al lago

Haz clic en **New** y completa:

1. **Data store**: Azure Data Lake Storage Gen2.
2. **Name**: `ls_adls_tiendaandina`.
3. **Authentication type**: **System-assigned managed identity**.
4. **Storage account name**: `sttiendaandinadev`.

```captura
archivo: adf/b02-nuevo-linked.webp
texto: New linked service - tipo (1), nombre (2), autenticación con identidad administrada (3) y cuenta (4)
```

:::tip Convención de nombres
`ls_` para linked services, `ds_` para datasets, `pl_` para pipelines, `tr_` para triggers. Con 50 objetos en un factory, el prefijo te dice qué es cada uno sin abrirlo.
:::

## Paso 3 — Test connection: el error esperado

Antes de crear, haz clic en **Test connection**:

```captura
archivo: adf/b02-test-falla.webp
texto: Connection failed - AuthorizationPermissionMismatch, la identidad del factory no tiene permiso sobre la cuenta
```

Es el error más común de Data Factory. Léelo por partes:

- **Forbidden / AuthorizationPermissionMismatch**: la conexión llegó a la cuenta, pero la identidad **no tiene permiso** para esa operación.
- La identidad es la del factory (`adf-tiendaandina-dev`), no la tuya. Que tú puedas ver los archivos no significa nada para el factory.

Cancela el diálogo.

## Paso 4 — El rol en el portal

En el portal, `sttiendaandinadev` → **Access control (IAM) → Add role assignment**:

1. Rol: **Storage Blob Data Contributor** (el factory va a leer de `raw` y escribir en `bronze`).
2. **Assign access to**: **Managed identity**.
3. **Members**: `adf-tiendaandina-dev`.

```captura
archivo: adf/b02-rol-portal.webp
texto: El rol de datos (1), asignado a una identidad administrada (2): la del factory (3)
```

:::nota En Azure real
La asignación puede tardar unos minutos en aplicarse. Si el Test connection sigue fallando justo después, espera y vuelve a probar.
:::

## Paso 5 — Probar otra vez y crear

Vuelve al Studio, **New** con los mismos datos y **Test connection**:

```captura
archivo: adf/b02-test-ok.webp
texto: Connection successful
```

Haz clic en **Create**.

## Paso 6 — La conexión a Key Vault

Si un día necesitas la contraseña de una base de datos, Data Factory la lee de Key Vault. Crea otro: **Data store** Azure Key Vault, nombre `ls_keyvault`, vault `kv-tiendaandina-dev`:

```captura
archivo: adf/b02-linked-kv.webp
texto: Linked service a Key Vault - el tipo (1) y el vault (2)
```

Para que funcione de verdad, el factory necesita el rol **Key Vault Secrets User** sobre el vault (mismo procedimiento que en el paso 4). Después, en cualquier otro linked service que pida contraseña, eliges "Azure Key Vault" y el nombre del secreto en lugar de escribirla.

```captura
archivo: adf/b02-linked-lista.webp
texto: Los dos linked services
```

## Paso 7 — El JSON de un linked service

Haz clic en `ls_adls_tiendaandina`:

```captura
archivo: adf/b02-linked-json.webp
texto: La definición JSON - tipo AzureBlobFS y la dirección dfs de la cuenta, sin ninguna credencial
```

Todo en Data Factory es **JSON**. Esta conexión solo tiene el tipo y la dirección `https://sttiendaandinadev.dfs.core.windows.net/`: **no hay contraseña ni clave**, porque usa la identidad administrada. Si exportas el factory o lo guardas en Git, no se filtra nada.

| Autenticación | Dónde queda el secreto | Recomendación |
|---|---|---|
| **Managed identity** | En ninguna parte | **Siempre que el destino sea de Azure** |
| Account key | En el linked service o en Key Vault | Evitar |
| Service principal | Secreto en Key Vault | Para conectarse a otro tenant |
| SQL auth (usuario y contraseña) | En Key Vault | Bases que no admiten Entra |

:::errores
- **Ser Owner y creer que alcanza.** Tu permiso no cuenta: la identidad del factory necesita su propio rol de datos sobre la cuenta.
- **Dar Contributor para leer datos.** Contributor administra el recurso pero no lee los blobs; el rol correcto es Storage Blob Data Reader o Contributor.
- **Usar la Account key "porque funciona".** Es una llave maestra que hay que guardar y rotar; con identidad administrada no hay secreto.
:::

## ✅ Lo que lograste

- Creaste la conexión al lago con identidad administrada.
- Diagnosticaste y resolviste un error de permisos con el rol justo.
- Agregaste la conexión a Key Vault y comprobaste que el JSON no guarda secretos.

:::ejercicio quiz
El Test connection dice "AuthorizationPermissionMismatch". ¿Qué falta?
- [ ] Esperar unos minutos a que se sincronice el linked service
- [x] Un rol de datos para la identidad del factory sobre la cuenta
- [ ] Que tú seas Owner de la cuenta
- [ ] Cambiar a Account key
:::

:::ejercicio quiz
El factory tiene que leer de raw y escribir en bronze. ¿Qué rol le das?
- [ ] Storage Blob Data Reader
- [x] Storage Blob Data Contributor
- [ ] Contributor
- [ ] Reader
:::

:::ejercicio quiz
¿Por qué conviene la identidad administrada para el lago?
- [ ] Porque es más rápida
- [x] Porque no hay ningún secreto que guardar, rotar o filtrar
- [ ] Porque no hace falta asignarle ningún rol
- [ ] Porque no necesita roles
:::

:::ejercicio quiz
¿Qué rol necesita el factory para leer secretos de Key Vault?
- [ ] Key Vault Administrator
- [x] Key Vault Secrets User
- [ ] Owner
- [ ] Ninguno
:::
