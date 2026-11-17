---
titulo: Proyecto 3 (semiguiado) - un programa externo que entra sin contraseñas en el código
nivel: 3 · Intermedio
duracion: 50
resumen: Un script de ingesta que corre fuera de Azure tiene que subir los pedidos diarios al lago. Registras la aplicación sp-ingesta-ventas en Entra ID, le creas un secreto de cliente, guardas ese secreto en Key Vault en el mismo minuto, le das el rol mínimo sobre la cuenta y verificas las tres piezas que necesita cualquier programa - tenant, client ID y secreto - más su rol. Las pistas están escondidas.
objetivos: Registrar una aplicación y obtener su service principal | Crear un secreto de cliente y guardarlo en Key Vault | Dar a la aplicación el rol mínimo sobre la cuenta | Identificar los tres datos que necesita un programa para entrar | Explicar cuándo usar service principal y cuándo identidad administrada
prerrequisitos: azure-paso-a-paso-key-vault-y-secretos
autoevaluacion: ¿Sabes qué tres datos necesita un programa para autenticarse? | ¿Sabes por qué el secreto se copia en ese momento? | ¿Sabes qué pasa cuando vence el secreto? | ¿Sabes qué rol darle a un programa que sube archivos?
---

:::escenario El pedido
Lucía: *"El sistema de ventas corre en un servidor de la empresa, fuera de Azure, y cada noche tiene que subir los pedidos a bronze. Créale una identidad propia, con el permiso justo, y deja su secreto en el key vault. Que nadie tenga que escribir una contraseña en el código."*
:::

## Lo que tienes que lograr

1. Una aplicación registrada en Entra ID llamada `sp-ingesta-ventas`.
2. Un secreto de cliente de esa aplicación, que vence en 6 meses.
3. Ese secreto guardado en `kv-tiendaandina-dev` como `sp-ingesta-ventas-secret`.
4. El rol **Storage Blob Data Contributor** para la aplicación sobre `sttiendaandinadev`, y nada más.

## Paso 1 — Registrar la aplicación

En **Microsoft Entra ID → App registrations → + New registration**:

```captura
archivo: azure/b12-registrar-app.webp
texto: Register an application - el nombre (1) y quién puede usarla (2)
```

Registrar una aplicación crea su **service principal**: la identidad con la que el programa entra a Azure.

## Paso 2 — El secreto de cliente

En la aplicación, **Certificates & secrets → + New client secret**, con vencimiento de **180 days (6 months)**:

```captura
archivo: azure/b12-secreto-app.webp
texto: Los datos de la aplicación (1), el valor del secreto que se muestra una sola vez (2) y la lista de secretos (3)
```

Un programa necesita **tres datos** para entrar:

| Dato | Dónde está | ¿Es secreto? |
|---|---|---|
| **Directory (tenant) ID** | En la aplicación | No |
| **Application (client) ID** | En la aplicación | No |
| **Client secret** | Se muestra **una sola vez** al crearlo | **Sí** |

:::cuidado Copia el valor ahora
El valor del secreto se ve una vez. Si sales de la página sin copiarlo, hay que crear otro. Cópialo **directamente** al key vault, sin pasar por un chat, un correo ni un archivo.
:::

<details><summary>💡 Pista: ¿dónde lo guardo?</summary>

En `kv-tiendaandina-dev` → **Secrets → + Generate/Import**, con nombre `sp-ingesta-ventas-secret` y el valor que acabas de copiar. Ya tienes el rol Key Vault Secrets Officer de la lección anterior.
</details>

## Paso 3 — Verificar el vault

```captura
archivo: azure/b12-kv-secretos.webp
texto: El vault con los dos secretos - la contraseña de la base y el secreto de la aplicación
```

## Paso 4 — El permiso justo

<details><summary>💡 Pista: ¿qué rol y dónde?</summary>

En `sttiendaandinadev` → **Access control (IAM) → + Add role assignment** → **Storage Blob Data Contributor** → en Members, `sp-ingesta-ventas`. El alcance es la cuenta; si quisieras ser más estricto, en Azure real puedes asignarlo solo sobre el contenedor `bronze`.
</details>

```captura
archivo: azure/b12-iam-app.webp
texto: La aplicación sp-ingesta-ventas como Storage Blob Data Contributor, junto a las asignaciones anteriores
```

## Cómo lo usa el programa

El servidor de ventas recibe el tenant ID y el client ID como configuración, y el secreto desde el vault o desde una variable de entorno que carga el equipo de infraestructura. Con la CLI, entrar como la aplicación es:

```bash
az login --service-principal -u <client-id> --tenant <tenant-id> -p "$SECRETO_DESDE_EL_VAULT"
az storage blob upload --account-name sttiendaandinadev -c bronze -n pedidos/2026/11/16/pedidos.csv -f pedidos.csv --auth-mode login
```

:::errores
- **No copiar el valor del secreto al crearlo.** Solo se muestra una vez; hay que crear otro.
- **Secretos sin fecha de vencimiento anotada.** El día que vencen, el programa deja de funcionar sin aviso.
- **Service principal con secreto para algo que corre dentro de Azure.** Ahí conviene una identidad administrada.
:::

## ✅ Lista de verificación

- [ ] `sp-ingesta-ventas` existe en App registrations.
- [ ] Tiene un secreto que vence en 6 meses.
- [ ] El vault tiene `sp-ingesta-ventas-secret`.
- [ ] En IAM de la cuenta, la aplicación tiene **solo** Storage Blob Data Contributor.
- [ ] El valor del secreto no quedó en ningún archivo, chat ni nota.

<details><summary>💡 Solución comentada</summary>

El orden importa: crear el secreto y **en el mismo momento** guardarlo en el vault. El rol es de **datos** (Blob Data Contributor) y no de administración (Contributor): el programa sube archivos, no cambia la configuración de la cuenta. Anota la fecha de vencimiento en el calendario del equipo: cuando un secreto vence, el programa deja de entrar y la ingesta "falla de repente" — es una de las causas más comunes de incidentes. Si el programa corriera **dentro** de Azure (una VM, una Function, Data Factory), no harías nada de esto: usarías su **identidad administrada**, que no tiene secreto que guardar ni que venza.
</details>

## Lo que aprendiste en el nivel 3

- La CLI `az` y Cloud Shell.
- Identidades de Entra ID y roles de IAM con mínimo privilegio.
- Key Vault, sus roles y el ciclo de un secreto.
- Cómo dar acceso a un programa sin poner contraseñas en el código.

:::ejercicio quiz
¿Qué tres datos necesita un programa para entrar como service principal?
- [ ] Usuario, contraseña y región
- [x] Tenant ID, client ID y el secreto de cliente
- [ ] La clave de la cuenta de almacenamiento y el nombre del contenedor
- [ ] Solo el client ID
:::

:::ejercicio quiz
Saliste de la página sin copiar el valor del secreto. ¿Qué haces?
- [ ] Lo pides a soporte
- [ ] Lo buscas en el Activity log
- [x] Creas un secreto nuevo y borras el que no copiaste
- [ ] Lo ves en Show Secret Value
:::

:::ejercicio quiz
El script de ingesta empezó a fallar con "invalid client secret" después de seis meses sin cambios. ¿Qué pasó?
- [ ] Se borró la cuenta
- [x] Venció el secreto de cliente y hay que rotarlo
- [ ] El contenedor se llenó
- [ ] El service principal se desactivó por inactividad
:::

:::ejercicio quiz
Si el programa corriera dentro de Azure, ¿qué convendría usar?
- [ ] Un service principal con secreto de 24 meses
- [ ] La clave de la cuenta
- [x] Una identidad administrada, sin secretos
- [ ] El usuario de un empleado
:::
