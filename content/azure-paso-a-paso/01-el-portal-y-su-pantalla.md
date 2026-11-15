---
titulo: Qué es el portal de Azure y cómo es su pantalla
nivel: 1 · Básico
duracion: 30
resumen: El portal de Azure es la página web desde la que un equipo de datos crea y administra todo lo que tiene en la nube de Microsoft. Qué es Azure, qué es el portal y en qué se diferencia de la CLI y de las plantillas, cada zona de la pantalla (barra superior, buscador, menú, servicios, recursos recientes, notificaciones, ajustes) y qué puedes hacer en el portal de práctica, que corre en tu navegador sin cuenta ni costo.
objetivos: Explicar qué es Azure y qué es el portal | Distinguir portal, CLI y plantillas como tres formas de hacer lo mismo | Ubicar cada zona de la pantalla del portal | Usar el buscador y el menú para llegar a un servicio | Saber qué es real y qué es simulado en la práctica
prerrequisitos: fundamentos-bienvenida
autoevaluacion: ¿Sabes qué es una suscripción en una frase? | ¿Sabes encontrar un servicio con el buscador? | ¿Sabes dónde ver si algo terminó de crearse? | ¿Sabes qué tres formas hay de crear recursos en Azure?
---

:::analogia En palabras simples
Azure es un edificio enorme de computadoras que Microsoft alquila por minuto. El **portal** es la recepción del edificio: una página web donde pides lo que necesitas (un disco, una base de datos, un servidor de Spark), ves lo que ya tienes alquilado y cuánto te está costando.
:::

## Paso 1 — Qué es Azure y qué es el portal

**Azure** es la nube de Microsoft: cientos de servicios (almacenamiento, bases de datos, Spark, inteligencia artificial) que se usan por internet y se pagan por uso. Un data engineer en Azure usa casi siempre los mismos: **Storage** (el data lake), **Key Vault** (los secretos), **Databricks** o **Fabric** (el procesamiento), **Data Factory** (la orquestación) y **Azure SQL** (bases operativas).

Hay tres formas de crear y administrar esos servicios, y todas terminan haciendo lo mismo:

| Forma | Qué es | Cuándo se usa |
|---|---|---|
| **Portal** | La página web `portal.azure.com` | Para aprender, explorar y hacer cambios puntuales |
| **CLI** (`az`) | Comandos en una terminal | Para tareas repetidas y scripts |
| **Plantillas** (ARM, Bicep, Terraform) | Archivos de texto que describen la infraestructura | Para producción: se versionan en Git y se repiten igual |

Este curso empieza por el portal, porque es donde se *ve* cada pieza. En el nivel 3 haces lo mismo con la CLI y en el nivel 6 con plantillas.

## Paso 2 — La pantalla de inicio

Abre el [portal de Azure de práctica](#/azure):

```captura
archivo: azure/b01-inicio.webp
texto: La página de inicio - la barra superior (1), los servicios de Azure (2), Navigate (3) y Tools (4)
```

| Zona | Qué tiene |
|---|---|
| **1. Barra superior** | El botón de menú (☰), el **buscador**, y a la derecha Cloud Shell, notificaciones (🔔), ajustes (⚙), ayuda y tu cuenta |
| **2. Azure services** | Accesos directos a los servicios más usados, y **Create a resource** para crear cualquier cosa |
| **Resources** | Lo último que abriste (Recent) y la lista completa (All resources) |
| **3. Navigate** | Suscripciones, grupos de recursos, todos los recursos y el registro de actividad |
| **4. Tools** | Microsoft Learn (la capacitación oficial gratis), Cost Management y Cloud Shell |

:::nota El portal está en inglés
El portal real se puede poner en español desde los ajustes, pero casi todos los equipos lo usan en inglés: la documentación, los mensajes de error y las búsquedas en internet están en inglés. Este curso usa los nombres en inglés tal como aparecen, con la explicación en español.
:::

## Paso 3 — El menú del portal

Haz clic en **☰** (arriba a la izquierda):

```captura
archivo: azure/b01-menu.webp
texto: El menú del portal - crear un recurso, inicio, todos los servicios, favoritos y Volver al curso
```

El menú tiene **Create a resource**, **Home**, **All services** y una lista de **favoritos**. En el portal real puedes elegir qué servicios aparecen como favoritos con la estrella ☆ de cada servicio. Al final está **Volver al curso**, que es propio de la práctica.

Desde **More services** (en la página de inicio) llegas a la lista completa:

```captura
archivo: azure/b01-todos-servicios.webp
texto: All services - todos los servicios que tiene el portal de práctica
```

## Paso 4 — El buscador: la forma más rápida de moverse

Escribe `stor` en el buscador de arriba:

```captura
archivo: azure/b01-buscar.webp
texto: El buscador encuentra servicios, recursos, grupos de recursos y documentación mientras escribes
```

El buscador encuentra **servicios** (Storage accounts), **recursos** que ya creaste (por nombre), **grupos de recursos** y **documentación**. Quien usa Azure todos los días casi no toca el menú: escribe dos o tres letras y presiona Enter.

:::tip Atajo
En el portal real, `G` y luego `/` llevan el cursor al buscador. En la práctica basta con presionar `/`.
:::

## Paso 5 — Tu cuenta, las notificaciones y los ajustes

Haz clic en tu nombre, arriba a la derecha:

```captura
archivo: azure/b01-cuenta.webp
texto: El menú de la cuenta - quién eres, en qué suscripción estás y Volver al curso
```

Ahí ves con qué usuario entraste y en qué **suscripción** estás trabajando. En la práctica también está **Borrar todo lo creado en Azure (práctica)**, para empezar de cero.

La campana 🔔 muestra las **notificaciones**: cada vez que creas, cambias o borras algo, Azure avisa ahí cuando empieza y cuando termina. Lo usas en la lección siguiente.

El engranaje ⚙ abre los **ajustes del portal**, donde se elige el tema (claro, oscuro o el azul de Azure):

```captura
archivo: azure/b01-ajustes.webp
texto: Portal settings - el tema del portal
```

## Paso 6 — Qué es real y qué es simulado en la práctica

| Real | Simulado |
|---|---|
| Los nombres de pantallas, botones, pestañas y mensajes de error siguen al portal de Azure | Nada se crea en una suscripción real: todo vive en tu navegador |
| Las reglas de nombres, validaciones, permisos (RBAC), bloqueos y plantillas ARM funcionan como en Azure | Los precios son de práctica, para aprender a leer el costo |
| Lo que creas en el portal aparece en la **CLI `az`** de Cloud Shell y de la terminal del curso, y al revés | Algunas secciones avanzadas muestran solo una explicación |

:::cuidado Si después usas un Azure real
En un Azure real cada recurso cuesta dinero mientras exista, aunque no lo uses. Las capturas de este curso usan nombres de práctica: si tomas capturas de tu propio portal para compartirlas, tapa tu correo, el ID de la suscripción, el ID del tenant y cualquier clave.
:::

El botón **🎯 Retos** (abajo a la derecha del portal de práctica) propone una lista de logros que se marcan solos a medida que avanzas.

## ✅ Lo que lograste

- Sabes qué es Azure y para qué sirve el portal.
- Conoces las tres formas de trabajar: portal, CLI y plantillas.
- Ubicas cada zona de la pantalla y te mueves con el buscador.

:::ejercicio quiz
¿Para qué se usa más el portal de Azure en un equipo de datos?
- [ ] Para todo lo de producción, porque es lo más seguro
- [x] Para aprender, explorar y hacer cambios puntuales; producción se automatiza con plantillas
- [ ] Solo para ver la factura
- [ ] Para escribir código de Spark
:::

:::ejercicio quiz
¿Cuál es la forma más rápida de llegar a un servicio o recurso en el portal?
- [ ] Recorrer el menú de arriba abajo
- [x] Escribir parte del nombre en el buscador
- [ ] Volver siempre a Home
- [ ] Abrir Cloud Shell
:::

:::ejercicio quiz
¿Dónde ves si un recurso que pediste terminó de crearse?
- [ ] En Microsoft Learn
- [ ] En los ajustes del portal
- [x] En las notificaciones (la campana)
- [ ] En el menú de la cuenta
:::

:::ejercicio quiz
¿Qué es una plantilla ARM, Bicep o Terraform?
- [ ] Un tema visual del portal
- [x] Un archivo de texto que describe la infraestructura para crearla siempre igual
- [ ] Un tipo de cuenta de almacenamiento
- [ ] Un informe de costos
:::
