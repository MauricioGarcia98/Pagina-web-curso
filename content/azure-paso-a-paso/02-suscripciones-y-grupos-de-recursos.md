---
titulo: Suscripciones y grupos de recursos - tu primer recurso en Azure
nivel: 1 · Básico
duracion: 35
resumen: Todo lo que creas en Azure vive dentro de una suscripción (quién paga) y de un grupo de recursos (una carpeta que se crea, se permisa y se borra junta). Ves tus suscripciones, entiendes la jerarquía tenant → suscripción → grupo → recurso, y creas tu primer grupo de recursos con el asistente de tres pestañas - Basics, Tags y Review + create - incluyendo un error de nombre a propósito, las etiquetas y las notificaciones del despliegue.
objetivos: Explicar la jerarquía tenant, suscripción, grupo de recursos y recurso | Ver tus suscripciones y tu rol | Crear un grupo de recursos con nombre, región y etiquetas | Leer los errores de validación del asistente | Seguir un despliegue en las notificaciones
prerrequisitos: azure-paso-a-paso-el-portal-y-su-pantalla
autoevaluacion: ¿Sabes qué se hereda de un grupo de recursos a sus recursos? | ¿Sabes qué caracteres admite el nombre de un grupo? | ¿Sabes para qué sirven las etiquetas? | ¿Sabes qué pasa con los recursos si borras su grupo?
---

:::escenario Tu primer día en Tienda Andina
Entras al equipo de datos de **Tienda Andina**, una cadena de tiendas con venta web y por app. Lucía, la líder del equipo, te pide: *"Armemos el entorno de desarrollo en Azure. Empieza por el grupo de recursos `rg-tiendaandina-dev` en East US 2, con las etiquetas del proyecto."* En este nivel lo construyes de a poco.
:::

:::analogia La tarjeta y las carpetas
La suscripción es la tarjeta con la que se paga; los grupos de recursos son carpetas dentro de ella. Lo que pongas en una carpeta se permisa, se etiqueta y se borra junto. Por eso conviene una carpeta por proyecto y entorno.
:::

## Paso 1 — La jerarquía de Azure

```diagrama
titulo: La jerarquía de Azure, de la organización a cada recurso
nodo ten: Tenant (Microsoft Entra ID) | icono=entra | col=0 | fila=0 | color=azul | sub=la organización: usuarios, grupos, identidades
nodo sub: Suscripción | icono=azure | col=1 | fila=0 | color=cian | sub=quién paga y límite de acceso: sub-datos-dev, sub-datos-prod
nodo rg: Grupo de recursos | icono=carpeta | col=2 | fila=0 | color=verde | sub=carpeta lógica de un proyecto o entorno: rg-datos-dev
nodo rec: Recursos | icono=cubo | col=3 | fila=0 | color=naranja | sub=cuenta de almacenamiento, Key Vault, workspace de Databricks
flecha ten -> sub | explica=El tenant de Entra ID es la organización. Las suscripciones dependen de él.
flecha sub -> rg | explica=Cada suscripción tiene su facturación y sus permisos. Adentro se crean grupos de recursos.
flecha rg -> rec | explica=Los recursos viven en un grupo de recursos. Si borras el grupo, se borra todo lo que contiene.
```

| Nivel | Qué es | Ejemplo en Tienda Andina |
|---|---|---|
| **Tenant** | El directorio de la empresa: usuarios, grupos y aplicaciones | `academia.dev` |
| **Suscripción** | La unidad de facturación. Muchas empresas separan dev y prod en suscripciones distintas | `sub-datos-dev`, `sub-datos-prod` |
| **Grupo de recursos** | Recursos que nacen, se permisan y se borran juntos | `rg-tiendaandina-dev` |
| **Recurso** | Cada servicio que creas | `sttiendaandinadev` |

Lo importante: los **permisos**, las **etiquetas de costos**, los **bloqueos** y las **políticas** se asignan en un nivel y se **heredan hacia abajo**. Si te dan permiso en un grupo, lo tienes sobre todo lo que hay adentro.

## Paso 2 — Tus suscripciones

En el buscador escribe `subscriptions` o usa **Navigate → Subscriptions**:

```captura
archivo: azure/b02-suscripciones.webp
texto: Subscriptions - las dos suscripciones de práctica, tu rol (Owner) y el costo actual
```

Entra a `sub-datos-dev`:

```captura
archivo: azure/b02-suscripcion.webp
texto: La hoja de una suscripción - los datos esenciales (Essentials) y su menú lateral
```

Esta forma de pantalla se repite en todo el portal y se llama **hoja** (*blade*): arriba los **Essentials** (los datos principales) y a la izquierda un **menú propio** del recurso (Activity log, Access control (IAM), Cost analysis…). Tu rol es **Owner**: puedes crear, cambiar, borrar y dar permisos.

## Paso 3 — Crear el grupo de recursos

Ve a **Resource groups** (desde Home o el buscador):

```captura
archivo: azure/b02-grupos-vacio.webp
texto: Resource groups sin grupos todavía - el botón Create (1)
```

Haz clic en **+ Create**. Se abre el **asistente de creación**, con pestañas arriba y botones abajo. Todos los recursos de Azure se crean con un asistente parecido.

### Primero, un error a propósito

En **Resource group** escribe `rg tienda andina.` (con espacios y un punto al final):

```captura
archivo: azure/b02-grupo-error.webp
texto: El asistente valida mientras escribes - los espacios no están permitidos y el nombre no puede terminar en punto
```

Reglas del nombre de un grupo de recursos:

- Hasta **90** caracteres.
- Letras, números, guiones (`-`), guiones bajos (`_`), puntos y paréntesis.
- **Sin espacios** y **sin punto al final**.
- Único dentro de la suscripción (otra suscripción puede tener uno con el mismo nombre).

### Ahora, bien

Completa:

1. **Subscription**: `sub-datos-dev`.
2. **Resource group**: `rg-tiendaandina-dev`.
3. **Region**: `(US) East US 2`.

```captura
archivo: azure/b02-grupo-basics.webp
texto: Basics completo - suscripción (1), nombre (2) y región (3)
```

:::nota ¿Por qué la región importa en un grupo?
El grupo guarda sus **metadatos** en esa región. Los recursos de adentro pueden estar en otras regiones, pero lo normal es usar la misma para todo: los datos no viajan entre regiones (más rápido y sin costo de transferencia).
:::

:::tip La convención de nombres
`rg-tiendaandina-dev` sigue la convención que recomienda Microsoft: **tipo** (`rg` = resource group) + **proyecto** + **entorno**. Con solo leer el nombre sabes qué es, de quién es y si es dev o prod. Este curso la usa siempre: `st…` para storage, `kv-…` para key vault, `dbw-…` para Databricks, `adf-…` para Data Factory.
:::

## Paso 4 — Las etiquetas (Tags)

Pasa a la pestaña **Tags** (o **Next : Tags >**) y agrega tres:

| Name | Value |
|---|---|
| `proyecto` | `tienda-andina` |
| `entorno` | `dev` |
| `owner` | `equipo-datos` |

```captura
archivo: azure/b02-grupo-tags.webp
texto: Tags - pares nombre/valor para clasificar recursos y repartir costos
```

Las **etiquetas** son pares nombre/valor. Sirven para **filtrar** (todo lo de `entorno=dev`) y, sobre todo, para **repartir la factura** por proyecto o equipo en Cost Management. Una regla común en las empresas: sin las etiquetas `owner` y `entorno` no se puede crear nada.

## Paso 5 — Review + create

Haz clic en **Review + create**. Azure ejecuta una **validación final**:

```captura
archivo: azure/b02-grupo-revisar.webp
texto: Validation passed (1) y el resumen de lo que se va a crear; recién ahora se habilita Create (2)
```

Si algo estuviera mal, verías **Validation failed** y un punto rojo en la pestaña con el problema. Revisa el resumen y haz clic en **Create**.

## Paso 6 — El despliegue y las notificaciones

Crear algo en Azure se llama **desplegar** (*deploy*). Abre la campana 🔔:

```captura
archivo: azure/b02-notificaciones.webp
texto: El despliegue - "Your deployment is complete" y las notificaciones Deployment in progress y Deployment succeeded
```

Cada creación genera un **deployment** con nombre, estado, hora y el detalle de lo que se creó. Más adelante verás que un despliegue es en realidad una plantilla ARM que el portal arma por ti.

Entra al grupo:

```captura
archivo: azure/b02-grupo-overview.webp
texto: El grupo rg-tiendaandina-dev - sus Essentials con las etiquetas (1) y su menú (2)
```

El grupo está vacío. En la lección siguiente le agregas la cuenta de almacenamiento.

:::cuidado Borrar un grupo borra todo lo que tiene
**Delete resource group** borra el grupo **y todos sus recursos**, sin papelera. Por eso los grupos se arman por ciclo de vida: lo que se crea y se borra junto va en el mismo grupo. Un grupo para "pruebas de hoy" se borra al terminar y no deja nada cobrando.
:::

:::errores
- **Mezclar dev y prod en el mismo grupo.** Al borrar o permisar el grupo, afectas a los dos.
- **Borrar un grupo "para limpiar".** Se borran todos sus recursos, sin papelera para la mayoría.
- **Creer que las etiquetas dan permisos.** Sirven para filtrar y repartir costos, no para controlar acceso.
:::

## ✅ Lo que lograste

- Entiendes la jerarquía tenant → suscripción → grupo → recurso y qué se hereda.
- Creaste `rg-tiendaandina-dev` con nombre válido, región y etiquetas.
- Sabes leer la validación y seguir el despliegue.

:::ejercicio quiz
Te dan el rol Reader en el grupo `rg-tiendaandina-dev`. ¿Sobre qué lo tienes?
- [ ] Solo sobre el grupo, no sobre sus recursos
- [x] Sobre el grupo y todos los recursos que contiene, porque los permisos se heredan
- [ ] Sobre toda la suscripción
- [ ] Sobre nada hasta que lo asignes recurso por recurso
:::

:::ejercicio quiz
¿Cuál de estos nombres es válido para un grupo de recursos?
- [ ] `rg tienda andina`
- [ ] `rg-tiendaandina.`
- [x] `rg-tiendaandina-dev`
- [ ] `rg_tienda andina`
:::

:::ejercicio quiz
¿Para qué sirven sobre todo las etiquetas?
- [ ] Para cambiar el nombre del recurso
- [x] Para filtrar y repartir costos por proyecto, entorno o equipo
- [ ] Para dar permisos
- [ ] Para elegir la región
:::

:::ejercicio quiz
¿Qué pasa si borras un grupo de recursos?
- [ ] Solo se borra el grupo y los recursos pasan a otro
- [x] Se borran el grupo y todos sus recursos
- [ ] Nada, hay que borrar cada recurso antes
- [ ] Se borra el grupo y los recursos quedan sin grupo
:::
