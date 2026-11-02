---
titulo: Azure Data Factory por dentro - qué es cada parte y para qué sirve
nivel: Intermedio
duracion: 45
resumen: Recorrido completo por Azure Data Factory Studio - Home, Author, Monitor y Manage; linked services, datasets, actividades, dependencias, parámetros, variables y expresiones; integration runtimes, triggers, depuración, publicación, Git y CI/CD.
objetivos: Explicar qué es un linked service, un dataset, una actividad, un pipeline, un trigger y un integration runtime | Ubicar cada zona de Data Factory Studio | Encadenar actividades con dependencias y manejar errores | Usar parámetros, variables y expresiones para pipelines dinámicos | Distinguir Debug, Trigger now, publicar y el modo Git
prerrequisitos: interfaces-portal-azure-por-dentro
autoevaluacion: ¿Sabes qué diferencia hay entre un linked service y un dataset? | ¿Sabes qué versión ejecuta un trigger, la publicada o la que estás editando? | ¿Sabes cuándo usar Upon Failure y Upon Completion? | ¿Sabes qué diferencia hay entre un parámetro y una variable? | ¿Sabes qué integration runtime necesitas para leer una base de datos de tu oficina?
---

:::tip Practícalo mientras lees
En el [portal de práctica](#/azure) crea un data factory y pulsa **Iniciar Studio**. Los **🎯 Retos** de Data Factory siguen el mismo orden que esta lección.
:::

## Qué es Data Factory

**Azure Data Factory (ADF)** es el servicio de Azure para **mover y orquestar datos** sin administrar servidores: copia desde más de 90 conectores (bases de datos, archivos, SaaS, APIs) y coordina en orden y a horario otros trabajos (notebooks de Databricks, procedimientos almacenados, funciones). Hay dos parientes con la misma base: los **pipelines de Synapse** y **Data Factory en Microsoft Fabric**.

El recurso se crea en el portal; el diseño se hace en **Data Factory Studio** (adf.azure.com).

## Los conceptos, de abajo hacia arriba

| Concepto | Qué es | Ejemplo |
|---|---|---|
| **Linked service** | La **conexión**: a qué sistema y con qué credencial (como una cadena de conexión) | ADLS Gen2 `stdatos` con la identidad administrada del factory |
| **Dataset** | **Qué datos** dentro de esa conexión, y en qué formato | `raw/ventas/*.csv` como DelimitedText |
| **Actividad** | **Un paso** de trabajo | Copy data, Notebook, Lookup, ForEach |
| **Pipeline** | Un **conjunto de actividades** con su orden y dependencias | Copiar → transformar con Databricks → avisar |
| **Trigger** | **Cuándo** se ejecuta un pipeline | Todos los días a las 6:00, o al llegar un archivo |
| **Integration runtime (IR)** | **Dónde** se ejecuta el trabajo (el cómputo) | El de Azure, o uno instalado en tu red |

## La ventana del Studio

A la izquierda, una barra con cuatro centros:

### Home

Accesos rápidos: **Ingest** (herramienta Copy data), **Orchestrate** (pipeline nuevo), **Transform data** (data flow), plantillas y recursos de aprendizaje.

### Author (el lápiz)

- **Factory Resources**: el árbol de **pipelines**, **datasets**, **data flows** y **Power Query**, con el botón **+** para crear.
- **Panel de actividades**: las actividades agrupadas: *Move and transform* (Copy data, Data flow), *Azure Databricks* (Notebook, Jar, Python), *General* (Get Metadata, Lookup, Set variable, Wait, Fail, Web, Stored procedure, Script, Execute pipeline), *Iteration & conditionals* (ForEach, If Condition, Switch, Until, Filter).
- **Lienzo**: arrastras actividades y las unes con flechas de dependencia. ForEach, If Condition y Switch son **contenedores**: se abren para editar las actividades de adentro.
- **Barra del pipeline**: **Validate** (revisar errores), **Debug** (ejecutar la versión que estás editando), **Add trigger** (*Trigger now* o *New/Edit*), y el botón **{}** para ver el JSON.
- **Panel inferior**: con nada seleccionado muestra *Parameters*, *Variables*, *Settings* y *Output* (los resultados de Debug). Con una actividad seleccionada, sus pestañas: *General* (nombre, timeout, reintentos), y las propias (*Source*, *Sink*, *Mapping*, *Settings*…).

### Monitor (el velocímetro)

- **Pipeline runs**: cada ejecución con inicio, duración, quién la disparó, estado y **Run ID**. Pestañas *Triggered* y *Debug*.
- Dentro de una ejecución: las **activity runs** con su **Input**, **Output** (por ejemplo, filas leídas y copiadas, DIUs usados) y **Error**; vista de Gantt; **Rerun** desde el principio o desde la actividad que falló.
- **Trigger runs**, **Integration runtimes** (estado y uso) y **Alerts & metrics**.

### Manage (el maletín)

**Linked services**, **Integration runtimes**, **Git configuration**, **ARM template** (exportar e importar), **Triggers**, **Global parameters**, **Credentials** y **Managed private endpoints**.

## Actividades y dependencias

Cada flecha entre actividades tiene una **condición**:

| Condición | Color | La siguiente actividad corre si la anterior… |
|---|---|---|
| **Upon Success** | Verde | terminó bien |
| **Upon Failure** | Rojo | falló (para avisar, limpiar o compensar) |
| **Upon Completion** | Azul | terminó, bien o mal |
| **Upon Skip** | Gris | no se ejecutó |

Cómo decide el resultado del pipeline: si una actividad falla y **ningún camino Upon Failure o Upon Completion la maneja**, el pipeline termina en **Failed**. Si la falla está manejada (patrón *try-catch*), el pipeline puede terminar en **Succeeded**. Las actividades que no se ejecutan quedan **Skipped**.

Las actividades más usadas:

| Actividad | Para qué | Salida que usarás después |
|---|---|---|
| **Copy data** | Copiar de un origen a un destino, con mapeo de columnas, tolerancia a fallas y paralelismo (DIU) | `rowsRead`, `rowsCopied`, `filesWritten` |
| **Get Metadata** | Leer información de un archivo o carpeta | `childItems` (lista de archivos), `exists`, `itemName`, `size` |
| **Lookup** | Leer un valor o una tabla pequeña (máximo 5000 filas) | `firstRow` o `count` + `value` |
| **ForEach** | Repetir actividades por cada elemento de un arreglo | `@item()` dentro del bucle |
| **If Condition** | Bifurcar según una condición verdadera o falsa | Ramas *True* y *False* |
| **Set variable** | Guardar un valor en una variable del pipeline | `@variables('x')` |
| **Fail** | Terminar con un error propio y un código | Mensaje en el monitor |
| **Notebook (Databricks)** | Ejecutar un notebook con parámetros | `runOutput` (lo que devuelve `dbutils.notebook.exit`) |
| **Execute pipeline** | Llamar a otro pipeline | Reutilizar lógica |

## Pipelines dinámicos: parámetros, variables y expresiones

- **Parámetros del pipeline**: valores de entrada **fijos durante la ejecución** (por ejemplo, `fecha`). Se leen con `@pipeline().parameters.fecha`.
- **Variables**: valores que **cambian durante la ejecución** con *Set variable* o *Append variable*. Se leen con `@variables('resumen')`.
- **Parámetros globales**: constantes de todo el factory (por ejemplo, el nombre del entorno).
- **Parámetros de dataset y linked service**: un solo dataset sirve para muchos archivos si su ruta es un parámetro.

Cualquier propiedad que diga **Add dynamic content** acepta el **lenguaje de expresiones**: si empieza con `@` es una expresión (`@concat('a', 'b')`) y dentro de un texto se interpola con `@{…}`: `ventas_@{formatDateTime(utcNow(), 'yyyyMMdd')}.csv`. Funciones frecuentes: `concat`, `equals`, `greater`, `length`, `contains`, `if`, `utcNow`, `formatDateTime`, `addDays`, `split`, `replace`, `activity('X').output`, `item()`.

El patrón clásico de ingesta: **Get Metadata** (lista de archivos) → **If Condition** (¿hay archivos?) → **ForEach** sobre `childItems` → **Copy data** con `@item().name` → **Notebook** que transforma → **Fail** o un aviso si algo sale mal.

## Integration runtimes

| Tipo | Dónde corre | Cuándo |
|---|---|---|
| **Azure (AutoResolve)** | Infraestructura de Microsoft | Orígenes accesibles desde internet o con puntos de conexión privados administrados |
| **Self-hosted** | Un servidor tuyo (Windows) con el software instalado | Orígenes dentro de tu red: SQL Server de la oficina, archivos en un servidor |
| **Azure-SSIS** | Un clúster administrado | Migrar paquetes SSIS existentes |

## Triggers

| Tipo | Se dispara… |
|---|---|
| **Schedule** | A horario (cada N minutos, horas, días, semanas) |
| **Tumbling window** | En ventanas de tiempo fijas que no se superponen, con reintentos y dependencias entre ventanas (útil para recargar períodos) |
| **Storage events** | Cuando se crea o borra un blob en una ruta |
| **Custom events** | Cuando llega un evento de Event Grid |

Un trigger **siempre ejecuta la versión publicada** y tiene que estar **iniciado** (*Started*) para dispararse.

## Debug, publicar y Git

- **Debug** ejecuta lo que estás editando, sin publicar. Las ejecuciones aparecen en la pestaña *Debug* del monitor.
- **Live mode** (sin Git): los cambios se guardan en el navegador hasta que pulsas **Publish all**, que los manda al servicio.
- **Modo Git** (Azure DevOps o GitHub): cada cambio se guarda como commit en tu rama; se hace *pull request* a la **rama de colaboración** (main) y al publicar, ADF genera las **plantillas ARM** en la rama `adf_publish`. Esas plantillas se despliegan a prueba y producción con una canalización de CI/CD (por ejemplo, `az deployment group create` con un archivo de parámetros por entorno).

## Costos

Se paga por **ejecuciones de actividades de orquestación**, por **horas de DIU** en las copias (unidades de integración de datos), por **horas de vCore** de data flows y por las horas del integration runtime. Un pipeline con un ForEach de 100 archivos cuesta bastante más que uno que copia una carpeta entera en una sola actividad.

## Qué tiene la réplica y qué no

| En la réplica | Todavía no |
|---|---|
| Home, Author, Monitor y Manage; linked services ADLS/Blob, Databricks y Key Vault con prueba de conexión y permisos reales del portal | Más de 90 conectores, data flows, Power Query, self-hosted IR |
| Copy data, Notebook, Get Metadata, Lookup, ForEach, If Condition, Set variable, Wait, Fail; dependencias con las cuatro condiciones | Switch, Until, Filter, Web, Execute pipeline, Script, Stored procedure |
| Parámetros, variables y expresiones con los errores de ADF; Debug, Publish all, Trigger now, triggers de programación (disparo simulado) | Triggers que se disparan solos a su hora, tumbling window, eventos |
| Exportar ARM template y la estructura del repositorio Git | Integración con Git en vivo, parámetros globales, alertas |

:::ejercicio quiz
¿Qué guarda un **linked service**?
- [ ] La lista de archivos a copiar
- [x] La conexión a un sistema y la forma de autenticarse
- [ ] El horario de ejecución
- [ ] El resultado de la última copia
:::

:::ejercicio quiz
Editaste un pipeline y pulsas **Trigger now** sin publicar. ¿Qué se ejecuta?
- [ ] La versión que estás editando
- [x] La versión publicada (los cambios sin publicar se prueban con Debug)
- [ ] Nada, da error de sintaxis
- [ ] Las dos versiones
:::

:::ejercicio quiz
Quieres mandar un aviso **solo cuando la copia falla**, sin que el pipeline quede en Failed. ¿Qué haces?
- [ ] Unir el aviso con Upon Success
- [x] Unir la actividad de aviso a la copia con Upon Failure
- [ ] Poner reintentos en la copia
- [ ] Usar un trigger de eventos
:::

:::ejercicio quiz
Tienes que copiar tablas de un SQL Server que está en la red de la oficina. ¿Qué necesitas?
- [ ] El integration runtime de Azure por defecto
- [x] Un integration runtime self-hosted instalado en un servidor de esa red
- [ ] Un trigger de tumbling window
- [ ] Un data flow
:::
