---
titulo: El inglés técnico mínimo - las palabras que aparecen en errores y documentación
nivel: Básico
duracion: 30
resumen: No necesitas hablar inglés para programar. Necesitas reconocer unas 100 palabras que se repiten en todos lados. Aquí están, agrupadas y con ejemplos reales.
objetivos: Reconocer las palabras más comunes de los mensajes de error | Entender los verbos de los comandos (get, set, list, create, delete…) | Leer el título de una página de documentación y saber de qué trata | Usar un traductor sin perder el sentido técnico
prerrequisitos: cero-leer-errores
autoevaluacion: ¿Sabes qué significa `not found`? ¿Y `denied`? | ¿Sabes qué hace un comando que empieza con `list`? ¿Y con `describe`? | ¿Sabes qué es algo `deprecated`? | ¿Sabes qué significa `expected` en un error? | ¿Sabes cómo traducir un error sin que el traductor cambie los nombres de las variables?
---

:::escenario Todo está en inglés
Ahora que conoces las palabras que más se repiten, imagina esta situación de trabajo: Martín, tu líder, te pasa el enlace a la documentación de dbt y te dice: *"Lee la parte de `incremental models`"*. La página está toda en inglés, igual que los errores, los comandos y los nombres de las funciones.

No hace falta hablar inglés para entenderla: con el vocabulario de esta lección y un traductor al lado, alcanza para la mayoría de los casos. El resto se aprende de a poco, usándolo.
:::

## Por qué todo está en inglés

Casi todos los lenguajes y herramientas se crearon pensando en una audiencia mundial, y el inglés quedó como idioma común. Los nombres de los comandos son palabras en inglés simplificadas: `list` (listar), `copy` → `cp`, `move` → `mv`, `make directory` → `mkdir`. Saber la palabra original te ayuda a **recordar** el comando.

## Las palabras de los errores

| Inglés | Español | Ejemplo real |
|---|---|---|
| error / exception | error / excepción | `ValueError`, `Exception` |
| not found | no encontrado | `command not found`, `404 Not Found` |
| no such | no existe tal | `no such file or directory`, `no such column` |
| denied / forbidden | denegado / prohibido | `Permission denied`, `403 Forbidden` |
| invalid | inválido | `invalid syntax`, `invalid literal for int()` |
| expected | se esperaba | `expected ':'` (se esperaban dos puntos) |
| unexpected | inesperado | `unexpected EOF` (el archivo terminó antes de tiempo) |
| missing | falta | `missing 1 required positional argument` |
| required | obligatorio | `field required` |
| already exists | ya existe | `table already exists` |
| failed | falló | `Task failed`, `connection failed` |
| timeout / timed out | se agotó el tiempo | `Read timed out` |
| retry | reintentar | `retrying in 5 seconds` |
| unauthorized | no autorizado (no te identificaste bien) | `401 Unauthorized` |
| deprecated | obsoleto (todavía funciona, pero lo van a quitar) | `DeprecationWarning` |
| warning | advertencia (no frena el programa) | `UserWarning` |
| null / none | vacío, sin valor | `NOT NULL constraint failed` |
| constraint | restricción, regla | `UNIQUE constraint failed` |
| out of memory | sin memoria | `OutOfMemoryError` |
| out of range | fuera de rango | `list index out of range` |

## Los verbos de los comandos

Casi todas las herramientas de la nube y de datos usan los mismos verbos:

| Verbo | Qué hace | Ejemplos |
|---|---|---|
| list / ls | listar varias cosas | `aws s3 ls`, `az group list` |
| get / show / describe | ver el detalle de **una** cosa | `kubectl get`, `az storage account show`, `gcloud ... describe` |
| create / new / init | crear | `az group create`, `git init`, `dbt init` |
| delete / remove / rm | borrar | `gcloud storage rm`, `docker rm` |
| update / set | cambiar | `az account set`, `gcloud config set` |
| run / exec / start | ejecutar, arrancar | `dbt run`, `docker run`, `spark-submit` |
| stop / kill | detener | `docker stop` |
| deploy | desplegar (poner en producción) | `databricks bundle deploy` |
| install / add | instalar | `pip install`, `uv add` |
| push / pull | subir / bajar | `git push`, `docker pull` |
| load / read / write | cargar / leer / escribir | `spark.read`, `df.write` |
| fetch | traer (de otro lado) | `git fetch` |

## Las palabras de la documentación

| Inglés | Qué te dice |
|---|---|
| Getting started / Quickstart | Por dónde empezar: el tutorial básico |
| Overview | Resumen general |
| How-to / Guide | Cómo hacer una tarea concreta |
| Reference | La lista completa de opciones (para consultar, no para leer de corrido) |
| Example | Un ejemplo listo para copiar |
| Prerequisites | Lo que necesitas antes |
| Default | El valor que se usa si no dices nada |
| Optional / Required | Opcional / obligatorio |
| Best practices | Buenas prácticas |
| Troubleshooting | Solución de problemas comunes |
| Release notes / Changelog | Qué cambió en cada versión |

## Cómo usar un traductor sin perder el sentido

Un traductor automático te ayuda mucho, pero a veces **traduce lo que no debe**: los nombres de variables, columnas o comandos. `table` puede volverse "mesa", `bucket` "cubo", `pipeline` "tubería" y `spark.read` "chispa.leer". Dos trucos:

1. Copia **solo la frase** del error, no el código.
2. Si una palabra suena rara traducida (mesa, cubo, huevo), es probablemente un **nombre técnico**: déjala en inglés.

:::tip Pregúntale a una IA
Una IA (como Claude o ChatGPT) es muy buena para esto: pega el error y pide "explícamelo en español, simple, sin resolverlo todavía". La lección "Cómo aprender esto" explica cómo usarla bien.
:::

:::trabajo
En los equipos de datos de Latinoamérica y España es normal hablar en español y escribir el código, los nombres de tablas y los commits en inglés. No hace falta un inglés perfecto: hace falta reconocer estas palabras y no tenerle miedo a una página de documentación.
:::

## Practica

:::ejercicio quiz
El error dice `PermissionError: [Errno 13] Permission denied: 'reporte.csv'`. ¿Qué significa?
- [ ] El archivo no existe
- [x] No tienes permiso para leer o escribir ese archivo
- [ ] El archivo está vacío
- [ ] Falta instalar una librería
```explicacion
*Denied* = denegado. El archivo existe, pero tu usuario no tiene permiso (o el archivo está abierto en Excel, que en Windows lo bloquea).
```
:::

:::ejercicio quiz
Al ejecutar un programa aparece `DeprecationWarning: this function is deprecated`. ¿Qué haces?
- [ ] Nada se ejecutó: hay que arreglarlo ya
- [x] El programa funcionó, pero esa función va a desaparecer en una versión futura: conviene cambiarla por la nueva cuando puedas
- [ ] Hay que reinstalar Python
- [ ] Significa que el archivo está dañado
```explicacion
Un *warning* (advertencia) no detiene el programa. *Deprecated* = obsoleto: todavía anda, pero está marcado para quitarse.
```
:::

:::ejercicio quiz
En la nube, ¿qué esperas que haga `az storage account list`?
- [ ] Crear una cuenta de almacenamiento
- [x] Mostrar las cuentas de almacenamiento que existen
- [ ] Borrar las cuentas de almacenamiento
- [ ] Mostrar el detalle de una sola cuenta
```explicacion
*List* = listar varias cosas. Para el detalle de una sola se usa *show* o *describe*.
```
:::

:::ejercicio quiz
El error dice `TypeError: greet() missing 1 required positional argument: 'name'`. ¿Qué falta?
- [ ] Instalar la función `greet`
- [x] Pasarle a la función `greet` el argumento `name`, que es obligatorio
- [ ] Un archivo llamado `name`
- [ ] Nada, es solo una advertencia
```explicacion
*Missing* = falta; *required* = obligatorio. Llamaste a `greet()` sin el dato que necesita: había que escribir `greet("Ana")`.
```
:::

:::ejercicio quiz
Una consulta a una API responde `401 Unauthorized`. ¿Qué revisas primero?
- [ ] La conexión a internet
- [x] Las credenciales: el token o la clave con que te identificas
- [ ] Que la URL tenga una barra al final
- [ ] El tamaño de la respuesta
```explicacion
*Unauthorized* = no te identificaste bien (token vencido, clave mal copiada). Si te identificaras bien pero no tuvieras permiso, sería `403 Forbidden`.
```
:::

:::ejercicio quiz
En la documentación de una herramienta, ¿qué sección lees primero si nunca la usaste?
- [x] Getting started / Quickstart
- [ ] Reference
- [ ] Release notes
- [ ] Troubleshooting
```explicacion
*Getting started* es el tutorial de inicio. *Reference* es el diccionario completo: se consulta cuando ya sabes qué buscar.
```
:::

:::ejercicio quiz
El log de un pipeline dice `Read timed out. Retrying in 30 seconds (attempt 2 of 5)`. ¿Qué está pasando?
- [ ] El pipeline terminó bien
- [x] Una lectura tardó demasiado; el programa espera 30 segundos y lo intenta de nuevo (es el segundo de cinco intentos)
- [ ] Falta memoria
- [ ] El archivo no existe
```explicacion
*Timed out* = se agotó el tiempo; *retrying* = reintentando; *attempt* = intento. Es normal que haya reintentos: preocúpate si se agotan los cinco.
```
:::

:::ejercicio quiz
`sqlite3.IntegrityError: UNIQUE constraint failed: clientes.email`. ¿Qué intentaste hacer?
- [ ] Borrar un cliente
- [x] Guardar un cliente con un email que ya existe en la tabla, y la tabla no permite emails repetidos
- [ ] Leer una columna que no existe
- [ ] Crear la tabla dos veces
```explicacion
*Constraint* = regla; *unique* = único. La tabla tiene la regla "el email no se repite" y la nueva fila la rompe.
```
:::
