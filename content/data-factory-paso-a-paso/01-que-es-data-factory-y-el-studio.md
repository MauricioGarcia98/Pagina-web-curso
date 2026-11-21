---
titulo: Qué es Azure Data Factory y cómo es el Studio
nivel: 1 · Básico
duracion: 30
resumen: Azure Data Factory es el servicio con el que un equipo de datos mueve información entre sistemas y orquesta el trabajo de cada noche. Qué problema resuelve, sus cinco piezas (linked services, datasets, pipelines, actividades y triggers), cómo se llega al Studio desde el portal, qué hay en cada zona (Home, Author, Monitor, Manage) y qué significa trabajar en "live mode" con Publish all.
objetivos: Explicar qué resuelve Data Factory y cuándo se usa | Nombrar sus cinco piezas y cómo se relacionan | Abrir el Studio desde el portal | Ubicar Home, Author, Monitor y Manage | Entender qué significa Publish all y live mode
prerrequisitos: azure-paso-a-paso-data-factory-desde-el-portal
autoevaluacion: ¿Sabes qué es un linked service en una frase? | ¿Sabes en qué pestaña del Studio se diseñan los pipelines? | ¿Sabes dónde ves si una ejecución falló? | ¿Sabes qué hace Publish all?
---

:::escenario El problema de Tienda Andina
Cada noche, el sistema de cada tienda deja un archivo CSV con las ventas del día en la zona de aterrizaje del lago (`raw/ventas/`). Hoy alguien del equipo los copia a mano a `bronze`, avisa por chat y corre un notebook. Si esa persona se enferma, no hay datos. Lucía, la líder del equipo, quiere automatizarlo de punta a punta: **eso es lo que hace Data Factory**.
:::

## Paso 1 — Qué es Data Factory

**Azure Data Factory (ADF)** es el servicio de integración y orquestación de datos de Azure. Hace tres cosas:

| Qué hace | Ejemplo en Tienda Andina |
|---|---|
| **Mover** datos entre más de 90 tipos de origen y destino | Copiar los CSV de `raw` a `bronze` |
| **Orquestar** pasos que dependen unos de otros | "Primero copia, después corre el notebook que limpia, y si algo falla avisa" |
| **Programar** la ejecución | Todos los días a las 6:00 |

No es una herramienta para *escribir* transformaciones complejas: para eso están Databricks, Spark o SQL. Data Factory es el **director de orquesta** que llama a cada uno en el orden correcto.

:::analogia El director de orquesta
Los músicos (Databricks, la base SQL, el almacenamiento) saben tocar. El director (Data Factory) no toca ningún instrumento: decide quién entra, cuándo y qué pasa si alguien se equivoca.
:::

## Paso 2 — Las cinco piezas

```diagrama
titulo: Las cinco piezas de Data Factory
nodo tr: Trigger | icono=reloj | col=0 | fila=0 | color=amarillo | sub=cuándo corre
nodo pl: Pipeline | icono=flujo | col=1 | fila=0 | color=azul | sub=el proceso completo
nodo ac: Actividades | icono=engranaje | col=2 | fila=0 | color=violeta | sub=Copy, Lookup, ForEach…
nodo ds: Datasets | icono=tabla | col=2 | fila=1 | color=naranja | sub=qué datos: un archivo, una tabla
nodo ls: Linked services | icono=llave | col=1 | fila=1 | color=verde | sub=cómo conectarse: la "cadena de conexión"
flecha tr -> pl: dispara
flecha pl -> ac: contiene
flecha ac -> ds: usan
flecha ds -> ls: se conectan con
```

| Pieza | Qué es | Ejemplo |
|---|---|---|
| **Linked service** | La conexión: a dónde conectarse y con qué credencial | La cuenta `sttiendaandinadev` con la identidad del factory |
| **Dataset** | Qué datos dentro de esa conexión | Los CSV de `raw/ventas` |
| **Pipeline** | Un flujo de trabajo: un conjunto de actividades | `pl_ingesta_diaria` |
| **Actividad** | Un paso del pipeline | Copy data, Notebook, If Condition |
| **Trigger** | Cuándo se ejecuta | Todos los días a las 6:00 |

Este curso las construye en ese orden, con el mismo caso de punta a punta.

## Paso 3 — Del portal al Studio

El factory `adf-tiendaandina-dev` se creó en el curso del portal de Azure. Ábrelo en el [portal de práctica](#/azure/servicio/adf):

```captura
archivo: adf/b01-portal.webp
texto: El data factory en el portal (1) y el botón Launch studio (2)
```

En el portal se administra el **recurso** (identidad, red, permisos). Lo de adentro (pipelines, datasets, triggers) se hace en **Azure Data Factory Studio**, que se abre con **Launch studio** (en Azure real, en `adf.azure.com`).

## Paso 4 — Home

```captura
archivo: adf/b01-home.webp
texto: El Studio - la barra lateral (1), la barra de publicación (2), los accesos rápidos (3) y la guía "Por dónde empezar" (4)
```

La guía **Por dónde empezar** de la práctica marca cada paso que completas. Es el mismo orden de este curso.

## Paso 5 — Author, Monitor y Manage

**Author** es donde se diseña:

```captura
archivo: adf/b01-author.webp
texto: Author - Factory Resources con pipelines y datasets (1), y la pestaña activa (2)
```

**Monitor** muestra cada ejecución:

```captura
archivo: adf/b01-monitor.webp
texto: Monitor - las ejecuciones disparadas (Triggered) y las de prueba (Debug)
```

**Manage** tiene la configuración del factory:

```captura
archivo: adf/b01-manage.webp
texto: Manage - linked services, integration runtimes, triggers, Git y plantillas ARM
```

| Zona | Para qué | Lecciones |
|---|---|---|
| **Home** | Accesos rápidos y guía | Esta |
| **Author** | Datasets y pipelines | 3 a 8, 13 a 20 |
| **Monitor** | Ejecuciones, errores, reintentos | 7, 11 |
| **Manage** | Conexiones, triggers, Git, ARM | 2, 10, 21, 22 |

## Paso 6 — Live mode y Publish all

Arriba dice **Live mode** y **Publish all**. Es una idea central de Data Factory:

- Lo que creas o cambias en Author es un **borrador**. Puedes probarlo con **Debug**.
- **Publish all** lo guarda en el servicio. Solo lo publicado puede ejecutarse con un **trigger**.
- El número junto a Publish all cuenta los cambios **sin publicar**.

Con Git configurado (lección 21) el borrador vive en una rama del repositorio y "Live mode" cambia por el nombre de la rama.

:::nota Qué es real y qué es simulado en la práctica
Las pantallas, nombres de botones, el JSON de cada objeto, las expresiones (`@concat`, `@item()`, `@pipeline().parameters`), la lógica de dependencias y los mensajes de error siguen a Data Factory. Las copias mueven archivos de verdad entre los contenedores de tu cuenta de práctica y el notebook corre en el Databricks de práctica. Lo simulado: no hay conexión a sistemas reales, los tiempos son cortos y algunos tipos de actividad y conector no están.
:::

:::errores
- **Esperar que el trigger use tus cambios sin publicar.** Los triggers ejecutan la última versión publicada; lo que está en el editor es un borrador.
- **Transformar datos pesados dentro de Data Factory.** Su papel es mover y orquestar; las transformaciones grandes van en Databricks, Spark o el warehouse.
- **Buscar las fallas en Author.** Las ejecuciones y sus errores están en Monitor.
:::

## ✅ Lo que lograste

- Sabes qué resuelve Data Factory y cuáles son sus cinco piezas.
- Llegas al Studio desde el portal y reconoces cada zona.
- Entiendes la diferencia entre borrador, Debug y publicado.

:::ejercicio quiz
¿Cuál es el papel principal de Data Factory en una plataforma de datos?
- [ ] Guardar los datos
- [x] Mover datos y orquestar los pasos del procesamiento en el orden correcto
- [ ] Guardar una copia histórica de cada archivo que mueve
- [ ] Reemplazar a Databricks
:::

:::ejercicio quiz
¿Qué pieza dice a dónde conectarse y con qué credencial?
- [x] El linked service
- [ ] El dataset
- [ ] El trigger
- [ ] La actividad
:::

:::ejercicio quiz
¿Dónde ves si la ejecución de anoche falló?
- [ ] En Author
- [x] En Monitor
- [ ] En Manage
- [ ] En Manage, en la lista de triggers
:::

:::ejercicio quiz
Cambiaste un pipeline y no hiciste Publish all. ¿Qué ejecuta el trigger de las 6:00?
- [ ] La versión con tus cambios
- [x] La última versión publicada
- [ ] Nada, el trigger se desactiva
- [ ] Una mezcla de las dos
:::
