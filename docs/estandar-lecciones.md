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
