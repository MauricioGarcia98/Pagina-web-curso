# Estándar de lecciones

Cada lección del curso se escribe y se revisa desde cuatro roles. Una lección se publica solo cuando cumple la checklist de los cuatro.

## Los cuatro roles

| Rol | Pregunta que se hace | Qué aporta |
|---|---|---|
| 🎓 **Diseñador instruccional** | ¿Qué va a poder **hacer** el alumno al terminar, y cómo lo sabe? | Objetivos medibles, prerrequisitos, secuencia, práctica graduada, autoevaluación |
| 🧑‍💻 **Ingeniero de datos senior** | ¿Así se hace en una empresa? ¿Qué se rompe en producción? | El caso de negocio, "En el trabajo real", errores frecuentes, preguntas de entrevista |
| 🐣 **Alumno principiante** | ¿Entiendo cada palabra? ¿Puedo seguir cada paso sin saltos? | Marca términos sin definir, pasos implícitos, ejemplos que no se entienden |
| 🔍 **QA técnico** | ¿Todo lo que dice la lección es cierto y funciona? | Ejecuta cada ejemplo y cada ejercicio, verifica números y salidas mostradas |

## Estructura de una lección

```markdown
---
titulo: …
nivel: Básico | Intermedio | Avanzado | Experto
duracion: 40
resumen: Una línea.
objetivos: Verbo + qué, medible | … | …            (3 a 5, empiezan con verbo: escribir, calcular, explicar, detectar…)
prerrequisitos: sql-select | sql-where             (ids de lecciones; aparecen como enlaces)
autoevaluacion: ¿Puedes …? | …                     (4 a 6 preguntas que el alumno marca)
---

:::escenario
El problema de negocio concreto que motiva la lección (quién pide qué y por qué importa).
:::

## La idea en una frase / Analogía
## El concepto, paso a paso         (cada término nuevo se define la primera vez que aparece)
## Ejemplo resuelto                  (se ejecuta; se explica línea por línea y se muestra el resultado)
## Variantes y casos borde           (NULL, vacíos, duplicados, empates, fechas…)
:::errores                           (los 3–5 errores reales más comunes, con el síntoma y la corrección)
:::trabajo                           (cómo se usa en una empresa: convenciones, rendimiento, revisión de código)
:::entrevista                        (una pregunta típica y cómo responderla)
## Resumen                           (tabla o lista corta)
## Ejercicios                        (de guiado a independiente: completar → escribir → caso de negocio)
```

## Checklist por rol

**🎓 Diseñador instruccional**
- [ ] Los objetivos empiezan con un verbo observable y cada uno tiene al menos un ejercicio que lo evalúa.
- [ ] Los prerrequisitos existen y están enlazados.
- [ ] Hay un ejemplo resuelto antes del primer ejercicio.
- [ ] Los ejercicios suben de dificultad: al menos uno guiado (con código inicial) y uno de caso de negocio.
- [ ] La autoevaluación cubre todos los objetivos.

**🧑‍💻 Ingeniero de datos senior**
- [ ] El caso inicial es un problema que de verdad pasa en una empresa, con un pedido concreto.
- [ ] "En el trabajo real" explica convenciones, rendimiento o cómo se revisa ese código.
- [ ] Los errores frecuentes son los que se ven en producción, con su síntoma.
- [ ] Lo que se enseña no es una mala práctica (nada de `SELECT *` en producción sin aclararlo, secretos en el código, etc.).

**🐣 Alumno principiante**
- [ ] Ningún término aparece sin definirse antes (o sin enlace a donde se definió).
- [ ] Cada bloque de código se explica: qué hace cada parte y qué resultado esperar.
- [ ] No hay saltos del tipo "es obvio que…".

**🔍 QA técnico**
- [ ] `node tools/validate.mjs <módulo>` pasa sin errores (ejemplos y ejercicios).
- [ ] Los números y salidas que muestra el texto coinciden con los datos reales.
- [ ] Los comandos de terminal se probaron en el simulador.

## Diagramas

Los diagramas se escriben dentro de la lección en un bloque `diagrama`. El sitio los dibuja con trazo a mano (rough.js, la librería de Excalidraw), con íconos y logos, y cada diagrama trae una barra con **▶ Ver el flujo** (anima cómo viajan los datos por las flechas), **👣 Paso a paso** (recorre el diagrama de a una flecha, con su explicación), descarga en **PNG** y **SVG**, y ampliación a pantalla completa. Al pasar el mouse por un nodo se resaltan sus conexiones.

```text
```diagrama
titulo: Texto que va debajo del diagrama
nodo app: App y web | icono=movil | col=0 | fila=0 | sub=texto chico
nodo db: Base de datos | icono=postgres | col=1 | fila=0 | forma=cilindro | color=azul
nodo ok: ¿Datos válidos? | forma=rombo | col=2 | fila=0 | color=amarillo
grupo nube: AWS | nodos=db | color=naranja
flecha app -> db: guarda el pedido | estilo=punteada | paso=1 | explica=La app escribe cada pedido en la base.
```
```

- **Hasta 4 columnas** (`col` 0 a 3). Si el recorrido es más largo, sigue en la fila de abajo. Si un nodo no tiene `col`/`fila`, se ubica solo según las flechas.
- `forma`: `caja` (por defecto), `cilindro`, `nube`, `nota`, `rombo` (decisiones), `documento`, `circulo`, `hexagono`.
- `color`: azul, verde, naranja, rojo, violeta, amarillo, gris, cian, rosa. `ancho=` cambia el ancho del nodo.
- **Flechas**: `a -> b`, `a <-> b` (doble) o `a -- b` (sin punta); `estilo=punteada`. Se dibujan con codos y eligen solas la ruta que no atraviesa otros nodos. `paso=N` numera la flecha y fija su orden en el modo paso a paso (sin `paso`, el orden se calcula siguiendo el flujo); `explica=` es el texto que aparece en ese paso.
- Saltos de línea en textos: `\n`.
- **Íconos** (`icono=`), en este orden de búsqueda:
  1. **Logos** (Simple Icons, CC0): `databricks`, `spark`, `kafka`, `airflow`, `snowflake`, `bigquery`, `gcp`, `postgres`, `mysql`, `mongodb`, `redis`, `python`, `pandas`, `polars`, `duckdb`, `jupyter`, `docker`, `kubernetes`, `terraform`, `github`, `githubactions`, `gitlab`, `mlflow`, `huggingface`, `langchain`, `anthropic`, `claude`, `gemini`, `ollama`, `flink`, `trino`, `clickhouse`, `airbyte`, `metabase`, `superset`, `looker`, `grafana`, `prometheus`, `parquet`, `pubsub`, `dataproc`, `hadoop`, `hive`, `cassandra`, `elasticsearch`, `streamlit`, `fastapi`, `prefect`, `jenkins`, `jira`, `sqlite`, `linux`, `stripe`.
  2. **Distintivos propios** (sigla en el color de la marca, para lo que no está en Simple Icons): `aws`, `s3`, `glue`, `athena`, `redshift`, `kinesis`, `emr`, `lambdaaws`, `stepfunctions`, `iam`, `bedrock`, `sagemaker`, `azure`, `adls`, `adf`, `synapse`, `eventhubs`, `keyvault`, `entra`, `foundry`, `aisearch`, `fabric`, `onelake`, `powerbi`, `gcs`, `dataflow`, `vertex`, `composer`, `dataform`, `spanner`, `bigtable`, `dbt`, `iceberg`, `delta`, `unity`, `lakeflow`, `genie`, `vectorsearch`, `openai`, `tableau`, `salesforce`, `sqlserver`, `fivetran`, `slack`. También `sigla:TEXTO:color` para uno a medida (por ejemplo `sigla:CRM:azul`).
  3. **Nombres en español**: `base`, `bucket`, `archivo`, `archivos`, `csv`, `json`, `nube`, `servidor`, `usuario`, `equipo`, `movil`, `web`, `api`, `engranaje`, `spark`, `reloj`, `orquestador`, `transformar`, `grafico`, `dashboard`, `stream`, `lambda`, `candado`, `llave`, `tabla`, `notebook`, `codigo`, `git`, `cubo`, `capas`, `almacen`, `alerta`, `correo`, `lupa`, `ml`, `robot`, `cerebro`, `chispa`, `mensaje`, `documento`, `carpeta`, `vector`, `cola`, `monitor`, `cache`, `reglas`, `calendario`, `webhook`, `internet`, `red`, `flujo`, `etiqueta`, `libro`, `terminal`, `prueba`, `bug`, `costo`, `velocidad`, `fabrica`, `tienda`, `dinero`, `carrito`, `camion`, `avion`, `hospital`, `banco`, `musica`, `auto`, `telefono`, `energia`, `hotel`, `escudo`, `comida`, `check`, `x`.
  4. **Cualquier ícono de Lucide** por su nombre (ISC, lucide.dev): `bot`, `brain-circuit`, `shield-check`, `workflow`, `scan-search`…
- El build falla si un diagrama usa un ícono, color o forma que no existe. La biblioteca se genera en `assets/js/iconos-lib.js` desde `tools/iconos.mjs` (solo con los íconos de Lucide seleccionados y los que usan las lecciones).

## Exámenes de práctica de certificaciones

Los exámenes viven en `content/examenes/*.md`. Además del formato común (`## Tema`, `leccion:`, opciones y `porque:`), los de certificaciones admiten:

- **Dominio**: `dominio: N` (1 = primer dominio de la certificación en `certificaciones.json`). Si se omite, el build lo deduce de la lección cuando solo un dominio la cubre; si es ambiguo, el build falla y pide el dominio.
- **Respuesta múltiple**: varias opciones `- [x]`. La pregunta muestra "Elige N" y se puntúa todo o nada, como en los exámenes oficiales. Necesita al menos N + 2 opciones.
- **Casos de estudio**: un bloque `## @caso id: Título` con el escenario (Markdown libre) y, en cada pregunta del caso, `caso: id`. Las preguntas de un caso se muestran juntas y el escenario se puede releer desde cada una.

```text
## @caso retail: Mercado Austral
Descripción del escenario…

## Factura de Athena
leccion: cert-aws-dea-operacion-seguridad
dominio: 3
caso: retail
¿Qué dos cambios reducen el costo de Athena?
- [x] Convertir los JSON a Parquet particionado por fecha.
- [x] Crear workgroups con límites de datos escaneados.
- [ ] Mover la capa silver a Glacier Deep Archive.
- [ ] Desactivar el Glue Data Catalog.
porque: Athena cobra por datos escaneados…
```

El build rechaza un examen si en más del 40 % de las preguntas la opción correcta es la más larga (en las de respuesta múltiple, si las correctas son justamente las más largas): hay que emparejar el largo de las opciones.

### Simulacro

Cada certificación declara en `certificaciones.json` el bloque `simulacro: { preguntas, minutos, aprobar }` con la cantidad de preguntas, el tiempo y el corte del examen oficial. El simulacro (`#/simulacro/<id>`) elige preguntas del banco repartidas según el peso de cada dominio, muestra una por pantalla con reloj y marcas para revisar, y termina con el resultado por dominio. Conviene que el banco tenga al menos tantas preguntas como el examen oficial; si tiene menos, el tiempo se ajusta en proporción.

### Tarjetas de palabras clave

`content/claves/<id-certificación>.md` contiene las tarjetas de cada certificación: el título `##` es la situación del examen y el cuerpo, la respuesta. `dominio: N` es opcional. Se repasan con el mismo repaso espaciado que el glosario (`#/claves/<id>`), y el plan de estudio (`#/plan/<id>`) las asigna por dominio.

## Recorridos animados

Para contar un proceso paso a paso (el viaje de un dato, una noche de un pipeline, un incidente), usa un bloque `recorrido`. Se dibuja como una línea de estaciones por la que viaja un paquete de datos; en cada paso se ve el texto y **el dato en ese momento**. Tiene botones de reproducir, anterior y siguiente, y se maneja con las flechas del teclado.

````
```recorrido
titulo: La compra 10729, del celular al tablero
estacion app: Web y app | icono=movil
estacion db: Base de la tienda | icono=postgres
paso app: Toca "Comprar"
Texto del paso, en Markdown.
>>> json
{"cliente_id": 1722}
paso db: El pedido queda guardado
>>> tabla
pedido_id,cliente_id,estado
10729,1722,pendiente
```
````

- `estacion id: Etiqueta | icono=…` define las paradas (mismos íconos que los diagramas).
- `paso id-estación: Título` abre un paso; varios pasos pueden usar la misma estación.
- `>>> tipo` empieza el dato del paso: `json`, `sql`, `python`, `bash`, `yaml`, `log`, `texto`, `csv` o `tabla` (CSV que se dibuja como tabla, con las filas entrando de a una).
- Los datos de un recorrido deben ser reales (consultables en la base del curso) o estar marcados como ilustrativos en una nota.

## La misma consulta en varios motores

Para mostrar cómo se escribe algo en cada motor, usa un bloque `motores`. Cada variante empieza con `[motor]`; los motores posibles son `sqlite`, `postgres`, `mysql`, `sqlserver` (se ejecutan en el navegador: PostgreSQL real con PGlite, MySQL y SQL Server en modo compatible) y `bigquery`, `databricks`, `snowflake`, `oracle` (solo se muestran). Agrega `norun` para mostrar una variante sin botón de ejecutar.

````
```motores
titulo: Los 5 productos más caros
[sqlite]
SELECT nombre, precio FROM productos ORDER BY precio DESC LIMIT 5;
[sqlserver]
SELECT TOP (5) nombre, precio FROM productos ORDER BY precio DESC;
[mysql norun]
…
```
````

- Todas las variantes deben devolver lo mismo; agrega `ORDER BY` para que el orden coincida.
- Si el bloque muestra un error a propósito, el título empieza con `Error típico:` (en SQLite debe funcionar y en los demás motores debe fallar).
- La pestaña elegida se recuerda y cambia todos los bloques de la página.
