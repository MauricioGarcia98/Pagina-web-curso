---
titulo: Key Vault - dónde se guardan los secretos
nivel: 3 · Intermedio
duracion: 45
resumen: Las contraseñas, claves y cadenas de conexión no van en el código ni en un archivo de texto - van en Key Vault. Creas kv-tiendaandina-dev con el modelo de permisos RBAC, chocas con el error "not allowed by RBAC" aunque seas Owner, te asignas Key Vault Secrets Officer, guardas la contraseña de la base de ventas como secreto y ves su identificador versionado, que es lo que usan Databricks y Data Factory.
objetivos: Crear un key vault con un nombre válido y el modelo RBAC | Explicar soft delete y purge protection | Entender por qué un Owner no puede leer secretos sin un rol de datos | Crear un secreto con tipo y vencimiento | Usar el identificador de un secreto
prerrequisitos: azure-paso-a-paso-entra-id-y-control-de-acceso
autoevaluacion: ¿Sabes qué rol necesitas para crear secretos? | ¿Sabes qué pasa si borras un key vault por error? | ¿Sabes qué es una versión de un secreto? | ¿Sabes por qué no se escribe una contraseña en un notebook?
---

:::escenario El pedido
Lucía: *"Vamos a conectar la base de ventas al lago. La contraseña no puede quedar en ningún notebook ni en Git: créate el key vault del entorno y guárdala ahí."*
:::

## Paso 1 — Qué es Key Vault

**Key Vault** guarda tres tipos de objetos:

| Objeto | Qué es | Ejemplo |
|---|---|---|
| **Secrets** | Cualquier texto secreto | Contraseñas, cadenas de conexión, claves de API |
| **Keys** | Claves criptográficas para cifrar o firmar | La clave con la que se cifra una cuenta (CMK) |
| **Certificates** | Certificados TLS con su renovación | El certificado HTTPS de una aplicación |

El código pide el secreto **por nombre** cuando lo necesita; nunca lo contiene. Si la contraseña cambia, se cambia en un solo lugar.

## Paso 2 — Crear el key vault

**Create a resource → Key Vault**:

1. **Resource group**: `rg-tiendaandina-dev`.
2. **Key vault name**: `kv-tiendaandina-dev` (3 a 24 caracteres, letras, números y guiones, empieza con letra, **único en todo Azure** porque forma la dirección `https://kv-tiendaandina-dev.vault.azure.net`).
3. **Region**: East US 2. **Pricing tier**: **Standard**.

```captura
archivo: azure/b11-kv-basics.webp
texto: Basics - el nombre (1), el nivel de precio (2) y los días de retención de lo borrado (3)
```

**Recovery options**:

| Opción | Qué hace |
|---|---|
| **Soft delete** (siempre activo) | Un vault o secreto borrado se puede **recuperar** durante 7 a 90 días |
| **Purge protection** | Impide **purgar** (borrar definitivamente) antes de que pasen esos días, ni siquiera un administrador |

:::cuidado Purge protection no se puede desactivar
Una vez activada, queda para siempre. En producción conviene activarla; en dev se suele dejar desactivada para poder borrar y volver a crear vaults con el mismo nombre.
:::

Pasa a **Access configuration**:

```captura
archivo: azure/b11-kv-acceso.webp
texto: Permission model - Azure role-based access control (recomendado) o Vault access policy
```

Elige **Azure role-based access control**: los permisos se dan con roles en IAM, igual que en el storage. El modelo viejo (*access policies*) se sigue viendo en vaults antiguos. **Review + create → Create**.

```captura
archivo: azure/b11-kv-overview.webp
texto: El key vault creado - Vault URI, soft delete y modelo de permisos (1) y su menú (2)
```

## Paso 3 — El error que todos ven

Menú **Secrets**:

```captura
archivo: azure/b11-kv-sin-rol.webp
texto: "The operation is not allowed by RBAC" - ser Owner no da acceso a los secretos
```

Es la misma idea del storage: **Owner** administra el vault (puede borrarlo, cambiar la red), pero **no** lee ni crea secretos. Hace falta un rol del plano de datos:

| Rol | Puede |
|---|---|
| **Key Vault Secrets User** | Leer el valor de los secretos (lo que necesita una aplicación) |
| **Key Vault Secrets Officer** | Crear, cambiar y borrar secretos (lo que necesita quien los administra) |
| **Key Vault Reader** | Ver que existen, **no** sus valores |
| **Key Vault Administrator** | Todo el plano de datos |

## Paso 4 — Asignarte el rol

En el vault, **Access control (IAM) → + Add role assignment**, busca `Key Vault Secrets`, elige **Key Vault Secrets Officer** y tu usuario:

```captura
archivo: azure/b11-kv-rol.webp
texto: Key Vault Secrets Officer para tu usuario, con alcance en este vault
```

## Paso 5 — Crear el secreto

**Secrets → + Generate/Import**:

1. **Name**: `sql-ventas-password`.
2. **Secret value**: una contraseña de práctica, por ejemplo `Practica-NoEsReal-2026!`.
3. **Content type**: `password` (opcional, ayuda a saber qué es).
4. **Set expiration date**: opcional; en producción conviene para obligar a rotar.

```captura
archivo: azure/b11-kv-crear-secreto.webp
texto: Create a secret - nombre (1), valor (2) y vencimiento (3)
```

:::cuidado Nunca pegues secretos reales en la práctica
Este portal guarda todo en tu navegador. Usa siempre valores inventados.
:::

```captura
archivo: azure/b11-kv-secretos.webp
texto: El secreto creado, habilitado
```

Haz clic en el nombre:

```captura
archivo: azure/b11-kv-secreto.webp
texto: El identificador del secreto, con su versión, y Show Secret Value
```

El **Secret Identifier** es `https://kv-tiendaandina-dev.vault.azure.net/secrets/sql-ventas-password/<versión>`. Cada vez que cambias el valor se crea una **versión nueva**; si pides el secreto sin versión, recibes la última.

## Paso 6 — Cómo lo usan las herramientas

| Herramienta | Cómo lee el secreto |
|---|---|
| **Databricks** | Un *secret scope* respaldado por Key Vault: `dbutils.secrets.get("kv-dev", "sql-ventas-password")`. En la salida aparece `[REDACTED]` |
| **Data Factory** | Un *linked service* de Key Vault; en la conexión a la base eliges "Azure Key Vault" y el nombre del secreto |
| **CLI** | `az keyvault secret show --vault-name kv-tiendaandina-dev -n sql-ventas-password --query value -o tsv` |

En los tres casos, quien lee necesita el rol **Key Vault Secrets User** sobre el vault. Para Data Factory y Databricks se le da a su **identidad**, no a una persona.

## ✅ Lo que lograste

- Creaste un key vault con RBAC y entiendes soft delete y purge protection.
- Resolviste el error de RBAC con el rol correcto.
- Guardaste un secreto y sabes cómo lo leen Databricks, Data Factory y la CLI.

:::ejercicio quiz
Eres Owner y al abrir Secrets ves "not allowed by RBAC". ¿Qué falta?
- [ ] Reiniciar el vault
- [x] Un rol del plano de datos, como Key Vault Secrets Officer
- [ ] Cambiar a Premium
- [ ] Activar purge protection
:::

:::ejercicio quiz
Un pipeline solo tiene que leer una contraseña del vault. ¿Qué rol le das a su identidad?
- [ ] Key Vault Administrator
- [ ] Owner
- [x] Key Vault Secrets User
- [ ] Key Vault Reader
:::

:::ejercicio quiz
Borraste un key vault por error ayer. ¿Qué pasa?
- [ ] Se perdió para siempre
- [x] Con soft delete se puede recuperar durante los días de retención configurados
- [ ] Microsoft lo restaura si llamas al soporte
- [ ] Vuelve solo al día siguiente
:::

:::ejercicio quiz
¿Dónde va la contraseña de la base de ventas que usa un notebook?
- [ ] En una celda del notebook, comentada
- [ ] En un archivo `.txt` del repositorio
- [x] En Key Vault, y el notebook la pide por nombre
- [ ] En el nombre de la tabla
:::
