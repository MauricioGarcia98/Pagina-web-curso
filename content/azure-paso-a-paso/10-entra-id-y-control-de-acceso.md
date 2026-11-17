---
titulo: Microsoft Entra ID y control de acceso (RBAC)
nivel: 3 · Intermedio
duracion: 50
resumen: Quién puede hacer qué en Azure se decide con dos piezas - las identidades de Microsoft Entra ID (usuarios, grupos, aplicaciones e identidades administradas) y los roles de Access control (IAM). Creas una usuaria y un grupo de analistas, le das al grupo un rol de solo lectura sobre el lago, te das a ti un rol de escritura de datos, compruebas los permisos con Check access y vuelves a abrir el contenedor con tu usuario - esta vez sí funciona.
objetivos: Distinguir usuario, grupo, service principal e identidad administrada | Crear un usuario y un grupo en Entra ID | Asignar un rol en Access control (IAM) a un grupo | Comprobar permisos con Check access | Explicar el principio de mínimo privilegio
prerrequisitos: azure-paso-a-paso-cloud-shell-y-la-cli-az
autoevaluacion: ¿Sabes por qué se asignan roles a grupos y no a personas? | ¿Sabes la diferencia entre Contributor y Storage Blob Data Contributor? | ¿Sabes en qué alcance conviene asignar un rol? | ¿Sabes revisar qué permisos tiene alguien?
---

:::escenario El pedido
Lucía: *"Entra María López, analista. Tiene que poder leer el lago pero no cambiar nada. Y tú necesitas escribir en el lago con tu usuario, no con la clave de la cuenta."*
:::

:::analogia Quién eres y qué puedes tocar
Entra ID responde "quién eres" (un usuario, un grupo, una aplicación, una identidad administrada). El control de acceso responde "qué puedes hacer y dónde": un rol, asignado en un alcance (la suscripción, un grupo, un recurso). Sin las dos piezas, no hay acceso.
:::

## Paso 1 — Las identidades

Abre **Microsoft Entra ID** (en el buscador, `entra`):

```captura
archivo: azure/b10-entra.webp
texto: Microsoft Entra ID - las pestañas Users, Groups y App registrations (1) y los datos del tenant (2)
```

**Microsoft Entra ID** (antes Azure Active Directory) es el **directorio**: la lista de quién existe para Azure. Hay cuatro tipos de identidad:

| Identidad | Qué es | Ejemplo |
|---|---|---|
| **Usuario** | Una persona | `maria.lopez@academia.dev` |
| **Grupo** | Un conjunto de usuarios | `analistas-datos` |
| **Service principal** | La identidad de un programa externo, con secreto o certificado | Un pipeline de GitHub Actions |
| **Identidad administrada** | La identidad de un recurso de Azure, sin secretos | El Data Factory leyendo el lago |

## Paso 2 — Crear la usuaria

**Users → + New user**:

```captura
archivo: azure/b10-nuevo-usuario.webp
texto: Create new user - el nombre principal (1) y el nombre para mostrar (2)
```

- **User principal name**: `maria.lopez` (se completa con `@academia.dev`).
- **Display name**: `María López`.

```captura
archivo: azure/b10-usuarios.webp
texto: Users - la nueva usuaria en el directorio
```

## Paso 3 — Crear el grupo y agregarla

**Groups → + New group**, con nombre `analistas-datos` y descripción *Analistas que leen la capa gold*. Después, con el ícono de miembros del grupo, marca a María:

```captura
archivo: azure/b10-miembros.webp
texto: Members - quién pertenece al grupo
```

```captura
archivo: azure/b10-grupos.webp
texto: El grupo analistas-datos con María como miembro
```

:::tip Roles a grupos, no a personas
Si das el rol a María, cuando entre otro analista tienes que repetirlo, y cuando María se vaya tienes que acordarte de quitarlo. Si das el rol al **grupo**, solo cambias la membresía. Es la práctica estándar.
:::

## Paso 4 — Access control (IAM)

En `sttiendaandinadev`, menú **Access control (IAM)**:

```captura
archivo: azure/b10-iam.webp
texto: IAM - Add role assignment (1), las pestañas (2) y las asignaciones actuales (3)
```

Ya hay una asignación: tú eres **Owner**, heredado de la suscripción (*Subscription (Inherited)*). Una asignación de rol tiene tres partes:

```text
QUIÉN (identidad)  +  QUÉ (rol)  +  DÓNDE (alcance)
analistas-datos       Storage Blob   sttiendaandinadev
                      Data Reader
```

El **alcance** puede ser la suscripción, un grupo, un recurso o incluso un contenedor. Cuanto más chico, mejor.

## Paso 5 — Asignar el rol al grupo

**+ Add role assignment**. Busca `Storage Blob Data`, elige **Storage Blob Data Reader** y en **Members** elige `analistas-datos`:

```captura
archivo: azure/b10-asignar-rol.webp
texto: Add role assignment - buscar el rol (1), elegir Storage Blob Data Reader (2) y el grupo (3)
```

Haz clic en **Review + assign**. Repite para ti con **Storage Blob Data Contributor**:

```captura
archivo: azure/b10-asignaciones.webp
texto: Las tres asignaciones - tu Owner heredado, el lector del grupo y tu rol de escritura de datos
```

Los roles de almacenamiento más usados:

| Rol | Puede | Para |
|---|---|---|
| **Storage Blob Data Reader** | Leer y listar | Analistas, dashboards |
| **Storage Blob Data Contributor** | Leer, escribir y borrar | Pipelines, ingenieros |
| **Storage Blob Data Owner** | Todo lo anterior + permisos POSIX (ACL) | Administradores del lago |
| **Contributor** | Administrar el recurso, **no** los datos | Quien configura la cuenta |

## Paso 6 — Comprobar con Check access

Pestaña **Check access**, elige `analistas-datos`:

```captura
archivo: azure/b10-check-access.webp
texto: Check access - qué roles tiene el grupo (1) y en qué alcance (2)
```

**Check access** responde "¿qué puede hacer esta identidad aquí?", incluyendo lo heredado. En el portal real también muestra lo que una persona recibe **por pertenecer a un grupo**.

## Paso 7 — Volver al contenedor

Abre `bronze` y cambia a **Microsoft Entra user account**:

```captura
archivo: azure/b10-entra-con-rol.webp
texto: Ahora sí - con tu usuario de Entra (1) ves los blobs (2), porque tienes un rol de datos
```

:::nota Los roles tardan en aplicarse
En Azure real, una asignación nueva puede tardar **hasta 10 minutos** en hacer efecto (a veces más). Si después de asignar un rol sigues viendo "no tienes permisos", espera y vuelve a intentar antes de buscar otro problema.
:::

:::cuidado Mínimo privilegio
Da el rol **más chico**, en el **alcance más chico**, al **grupo** correcto. Un Contributor sobre toda la suscripción "para que no moleste" es la puerta por la que se cuelan los incidentes de seguridad.
:::

:::errores
- **Asignar roles a personas una por una.** Se asignan a grupos; cuando alguien entra o sale, solo cambia la membresía.
- **Dar Contributor para leer datos.** Contributor administra el recurso pero no lee blobs; el rol de datos es otro.
- **Reintentar enseguida.** Una asignación nueva puede tardar varios minutos en propagarse.
:::

## ✅ Lo que lograste

- Conoces los cuatro tipos de identidad de Entra ID.
- Creaste una usuaria y un grupo, y diste un rol de datos al grupo.
- Compruebas permisos con Check access y accedes al lago sin la clave.

:::ejercicio quiz
María tiene que leer el lago sin cambiar nada. ¿Qué asignas?
- [ ] Owner sobre la suscripción a María
- [ ] Contributor sobre la cuenta a María
- [x] Storage Blob Data Reader sobre la cuenta al grupo analistas-datos, del que María es miembro
- [ ] La clave de la cuenta por correo
:::

:::ejercicio quiz
¿Qué diferencia hay entre Contributor y Storage Blob Data Contributor?
- [ ] Ninguna
- [x] Contributor administra el recurso; Storage Blob Data Contributor lee y escribe sus datos
- [ ] Contributor es para Azure y el otro es para Fabric
- [ ] Storage Blob Data Contributor puede borrar la cuenta
:::

:::ejercicio quiz
¿Qué identidad usa un Data Factory para leer el lago sin guardar secretos?
- [ ] Un usuario con contraseña
- [ ] La clave de la cuenta
- [x] Su identidad administrada
- [ ] Un grupo
:::

:::ejercicio quiz
Asignaste un rol hace un minuto y la persona sigue sin acceso. ¿Qué es lo más probable?
- [x] La asignación todavía no se propagó; puede tardar varios minutos
- [ ] El rol no existe
- [ ] Hay que asignar el rol también a nivel de suscripción
- [ ] Azure perdió la asignación
:::
