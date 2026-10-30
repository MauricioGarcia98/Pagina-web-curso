---
titulo: Materializaciones e incrementales
nivel: Avanzado
duracion: 55
resumen: Desde cero - qué es una vista y qué es una tabla, qué SQL escribe dbt para cada materialización (view, table, ephemeral, incremental), cómo funciona un modelo incremental paso a paso, las estrategias append, merge, delete+insert, insert_overwrite y microbatch, los datos que llegan tarde y los cambios de columnas.
objetivos: Explicar qué guarda una vista y qué guarda una tabla | Elegir la materialización de cada modelo | Escribir un modelo incremental con is_incremental() y this | Elegir una estrategia incremental | Manejar datos tardíos y cambios de esquema
autoevaluacion: ¿Sabes qué SQL ejecuta dbt para una vista y para una tabla? | ¿Sabes qué vale is_incremental() la primera vez? | ¿Sabes cuándo usar merge y cuándo append? | ¿Sabes qué hace --full-refresh?
---

:::escenario
El modelo `fct_eventos` tarda 40 minutos cada mañana porque recalcula **tres años** de clics para agregar los del último día. La factura de la nube crece todos los meses. La solución no es otra herramienta: es cambiar **una línea** de configuración, la materialización, y entender bien lo que eso implica.
:::

## Primero: vista y tabla, desde cero

Todo modelo de dbt es un `SELECT`. La pregunta es **qué se guarda** en la base de datos con el resultado de ese `SELECT`. Hay dos respuestas básicas:

- Una **tabla** guarda las **filas**. Es como una planilla ya escrita: leerla es rápido, pero si cambian los datos de origen, la planilla queda vieja hasta que alguien la vuelva a escribir.
- Una **vista** guarda solo la **consulta**. Cada vez que alguien la lee, la base ejecuta el `SELECT` en ese momento. Siempre está al día, pero cada lectura cuesta lo mismo que ejecutar la consulta.

Puedes ver la diferencia en la base del curso: `stg_pedidos` es una vista. Su "contenido" es una consulta:

```sql
SELECT name, type, substr(sql, 1, 80) AS empieza_con
FROM sqlite_master
WHERE name IN ('stg_pedidos', 'pedidos');
```

`pedidos` es de tipo `table` y su definición solo dice qué columnas tiene; `stg_pedidos` es de tipo `view` y su definición es un `SELECT`.

## Qué es una materialización

La **materialización** es la instrucción que le das a dbt para decidir **cómo** guardar el resultado de un modelo. dbt toma tu `SELECT` y lo **envuelve** en el SQL necesario. Esto es lo que escribe por ti (simplificado):

| Materialización | SQL que dbt ejecuta en tu base |
|---|---|
| `view` | `create or replace view esquema.modelo as (tu select)` |
| `table` | `create table esquema.modelo__tmp as (tu select)`, luego reemplaza la tabla vieja por la nueva |
| `ephemeral` | Nada: tu `select` se copia como un CTE (`with modelo as (...)`) dentro de cada modelo que lo usa |
| `incremental` | La primera vez, como `table`; las siguientes, inserta o fusiona solo las filas nuevas |
| `materialized_view` | `create materialized view ...` (solo en motores que lo soportan) |

| Materialización | Ventaja | Desventaja | Úsala para |
|---|---|---|---|
| `view` | Siempre actualizada, no ocupa espacio | Se recalcula en cada consulta | Staging, modelos livianos |
| `table` | Consultas rápidas | Se reconstruye completa en cada `dbt run` | Marts medianos que consultan los tableros |
| `incremental` | Procesa solo lo nuevo: rápida y barata con mucho volumen | Más compleja; hay que pensar duplicados y datos tardíos | Hechos grandes (eventos, transacciones) |
| `ephemeral` | No crea objetos | No se puede consultar ni probar directamente | Pasos intermedios simples reutilizados |
| `materialized_view` | El motor la mantiene actualizada | Depende del motor y tiene limitaciones | Agregados consultados muy seguido |

Se configura en `dbt_project.yml` para una carpeta entera (el `+` indica que es una configuración que se hereda hacia adentro):

```yaml norun
models:
  tienda_dbt:
    staging:
      +materialized: view
    marts:
      +materialized: table
```

o en el propio modelo con `config()`, que tiene prioridad sobre lo del proyecto:

```dbt
{{ config(materialized='table') }}

select canal, count(*) as pedidos
from {{ ref('stg_pedidos') }}
group by canal
```

:::analogia Fotocopia vs. libreta
Una **vista** es una nota que dice "para saber la respuesta, calcula esto": no guarda nada, se recalcula cada vez que alguien la lee. Una **tabla** es una fotocopia de la respuesta: rápida de leer, pero hay que volver a sacarla completa cada vez que cambian los datos. Un modelo **incremental** es una libreta: cada día solo **agregas las páginas nuevas** en vez de reescribir el cuaderno entero.
:::

### Pruébalo en la terminal

```bash
cd tienda_dbt
cat dbt_project.yml                 # mira +materialized por carpeta
dbt run
dbt compile -s top_clientes         # el SELECT que dbt envuelve
```

En la salida de `dbt run` cada línea dice `created sql view model` o `created sql table model`, según la materialización.

## Modelos incrementales, paso a paso

Un modelo incremental resuelve el problema del escenario: en vez de recalcular tres años, procesa **solo lo nuevo** y lo agrega a la tabla que ya existe. Para eso dbt te da dos herramientas:

- `is_incremental()`: una función que vale **verdadero** solo si la tabla ya existe, es incremental y no pediste `--full-refresh`. La primera vez vale **falso**.
- `{{ this }}`: el nombre de **la propia tabla** del modelo tal como está ahora en la base. Sirve para preguntar "¿hasta dónde ya cargué?".

```dbt norun
{{ config(
    materialized='incremental',
    unique_key='evento_id',
    incremental_strategy='merge'
) }}

select evento_id, cliente_id, fecha_hora, tipo_evento, pagina
from {{ source('tienda', 'eventos_web') }}

{% if is_incremental() %}
  -- solo eventos posteriores al último que ya cargamos
  where fecha_hora > (select max(fecha_hora) from {{ this }})
{% endif %}
```

Línea por línea:

1. `materialized='incremental'`: este modelo es una tabla que crece.
2. `unique_key='evento_id'`: la columna que identifica cada fila. Con ella dbt sabe si una fila que llega es **nueva** (se inserta) o **ya existía** (se actualiza).
3. `incremental_strategy='merge'`: cómo combinar lo nuevo con lo viejo (ver la tabla de estrategias).
4. `{% if is_incremental() %} ... {% endif %}`: el filtro solo se agrega desde la segunda ejecución. La primera vez el `if` es falso y el `SELECT` trae **todo**.
5. `(select max(fecha_hora) from {{ this }})`: la fecha más nueva que ya está en la tabla. El filtro dice "tráeme lo posterior a eso".

### Cómo se comporta en el tiempo

Supón una tabla de eventos con 500 millones de filas que crece 2 millones por día:

| Ejecución | `is_incremental()` | Qué hace dbt | Filas procesadas |
|---|---|---|---|
| Primera vez (la tabla no existe) | `false` | Crea la tabla con **todo** el `SELECT` (el `if` no se aplica) | 500 millones |
| Día siguiente | `true` | Ejecuta el `SELECT` **con** el filtro, guarda el resultado en una tabla temporal y lo combina con `{{ this }}` | ~2 millones |
| `dbt run --full-refresh` | `false` | Borra y reconstruye desde cero | 500 millones |

Con `materialized='table'`, **cada** ejecución procesaría los 500 millones. Con incremental, solo los nuevos: la diferencia es de horas y de mucho dinero en la nube.

```recorrido
titulo: Un modelo incremental en dos ejecuciones, con eventos reales
estacion r1: Primera ejecución | icono=chispa
estacion this: {{ this }} | icono=base
estacion filtro: El filtro | icono=lupa
estacion merge: merge | icono=capas
estacion res: Resultado | icono=check
paso r1: Primera vez: is_incremental() es falso
Supongamos que el 30/12 a la noche se ejecuta por primera vez. La tabla no existe, el `if` no se aplica y se cargan **todos** los eventos hasta ese momento.
>>> tabla
eventos_cargados,ultimo
19719,2024-12-30 23:08:25
paso this: Al día siguiente: ¿hasta dónde cargué?
Ahora la tabla existe: `is_incremental()` es verdadero. `select max(fecha_hora) from {{ this }}` lee la tabla del modelo y responde con el último evento ya guardado.
>>> sql
select max(fecha_hora) from main.eventos_incremental
-- '2024-12-30 23:08:25'
paso filtro: Solo lo posterior
El `where` agregado deja pasar solo los eventos nuevos: los del 31 de diciembre.
>>> tabla
eventos_nuevos,desde,hasta
63,2024-12-31 09:27:18,2024-12-31 22:16:45
paso merge: merge con unique_key
Los nuevos se guardan en una tabla temporal y se combinan con la existente usando `evento_id`: si el id ya estaba, se **actualiza**; si no, se **inserta**. Así, reprocesar no duplica.
>>> texto
evento_id ya existe → UPDATE
evento_id nuevo     → INSERT
paso res: Mismo resultado, mucho menos trabajo
La tabla final tiene todos los eventos, pero la segunda ejecución procesó solo los del último día.
>>> tabla
primera_ejecucion,segunda_ejecucion,total_en_tabla
19719,63,19782
```

## Estrategias: cómo se combinan lo nuevo y lo viejo

La `incremental_strategy` decide qué SQL usa dbt para juntar las filas nuevas con la tabla existente. No todos los motores tienen todas (la documentación oficial tiene una tabla por adaptador: Databricks y Snowflake tienen todas; BigQuery no tiene `append` ni `delete+insert`).

| Estrategia | Qué hace | Necesita `unique_key` | Cuándo |
|---|---|---|---|
| `append` | Inserta las filas nuevas, sin mirar si ya existían | No | Eventos que nunca cambian y no se repiten (logs, clics) |
| `merge` | Si la clave ya existe, **actualiza** la fila; si no, la **inserta** | Sí | Registros que cambian (un pedido que pasa de `pendiente` a `entregado`) |
| `delete+insert` | Borra las filas cuyas claves llegan de nuevo y las vuelve a insertar | Sí | Motores donde `merge` es lento, o reemplazo por lotes |
| `insert_overwrite` | Reemplaza **particiones completas** (por ejemplo, todo un día) | No (usa la partición) | Reprocesar días enteros en Spark o BigQuery |
| `microbatch` | Divide el trabajo en lotes por tiempo (un día, una hora…) y procesa cada lote por separado | Depende del motor | Series de tiempo muy grandes (dbt 1.9 o más nuevo) |

En Databricks existe además `replace_where`, que reemplaza las filas que cumplen una condición (por ejemplo, `fecha >= '2024-06-01'`).

Con `merge` puedes limitar qué columnas se actualizan: `merge_update_columns=['estado', 'actualizado_en']` actualiza solo esas y deja las demás como estaban.

:::cuidado append con duplicados
`append` no revisa nada: si la misma fila llega dos veces (porque reintentaste una carga), queda **dos veces**. Si no tienes la garantía de que el origen nunca repite filas, usa `merge` con una `unique_key`, y ponle un test `unique` a esa columna.
:::

## Datos que llegan tarde

`where fecha_hora > max(fecha_hora)` tiene un problema: si un evento de ayer llega hoy con atraso (un celular sin señal que sincroniza después), su fecha es **menor** que el máximo y el filtro lo deja afuera **para siempre**.

La solución habitual es reprocesar una **ventana**: los últimos días, siempre, con una estrategia que no duplique (`merge`, `delete+insert` o `insert_overwrite`).

```dbt norun
{% if is_incremental() %}
  where fecha_hora >= (select datetime(max(fecha_hora), '-3 days') from {{ this }})
{% endif %}
```

Así, cada día se vuelven a leer los últimos 3 días: lo que llegó tarde entra, y lo que ya estaba se actualiza sin duplicarse gracias a la `unique_key`.

### Microbatch: la ventana hecha configuración

Desde dbt 1.9, la estrategia `microbatch` resuelve esto sin `is_incremental()`. Le dices qué columna es el tiempo del evento y el tamaño de cada lote, y dbt arma un filtro por cada lote:

```dbt norun
{{ config(
    materialized='incremental',
    incremental_strategy='microbatch',
    event_time='fecha_hora',      -- la columna de tiempo
    batch_size='day',             -- un lote por día (hour, day, month, year)
    lookback=3,                   -- reprocesa también los 3 días anteriores
    begin='2024-01-01'            -- desde cuándo construir la primera vez
) }}

select evento_id, cliente_id, fecha_hora, tipo_evento
from {{ ref('stg_eventos') }}
```

Cada lote es **independiente**: si falla el del martes, `dbt retry` vuelve a correr solo ese. Para reconstruir un período: `dbt run --event-time-start "2024-09-01" --event-time-end "2024-09-04"`. Los modelos de origen también deben declarar su `event_time` para que dbt los filtre.

## Cuando cambian las columnas

¿Qué pasa si agregas una columna nueva al `SELECT` de un modelo incremental que ya existe? La tabla vieja no la tiene. La configuración `on_schema_change` decide:

| Valor | Qué hace |
|---|---|
| `ignore` (por defecto) | No agrega la columna: la columna nueva no aparece en la tabla |
| `fail` | Detiene la ejecución con un error |
| `append_new_columns` | Agrega las columnas nuevas (no borra las que ya no están) |
| `sync_all_columns` | Agrega las nuevas y quita las que ya no están, incluidos cambios de tipo |

Ninguna opción completa los valores de la columna nueva en las filas **viejas**: quedan en `NULL`. Si las necesitas, corre `dbt run --full-refresh -s modelo`.

## Cómo elegir, en cuatro preguntas

1. ¿El modelo es liviano o es un paso de limpieza? → `view`.
2. ¿Lo consulta un tablero muchas veces al día y tarda poco en construirse? → `table`.
3. ¿Tiene millones de filas y crece todos los días? → `incremental`. ¿Las filas cambian? → `merge`. ¿Nunca cambian ni se repiten? → `append`.
4. ¿Es un cálculo intermedio que nadie consulta directamente? → `ephemeral` (con moderación: si muchos modelos lo usan, se recalcula en cada uno).

:::errores
- **Hacer incremental todo**: un modelo de 10.000 filas no necesita la complejidad. Empieza con `table` y pasa a incremental cuando el tiempo o el costo lo justifiquen.
- **Olvidar el `{% if is_incremental() %}`**: sin él, cada ejecución vuelve a traer todo y, con `append`, duplica la tabla entera.
- **`unique_key` que no es única**: `merge` falla o actualiza filas equivocadas. Prueba la clave con un test `unique`.
- **Filtrar con `>` estricto sin ventana**: los datos tardíos se pierden en silencio.
- **Cambiar la lógica de un incremental y no hacer `--full-refresh`**: las filas viejas quedan con la lógica anterior y las nuevas con la nueva.
:::

:::trabajo
- En Databricks, los hechos grandes suelen ser incrementales con `merge` sobre Delta, y los marts que consulta Power BI, `table`.
- Muchos equipos programan un `--full-refresh` semanal o mensual de los incrementales críticos, para corregir cualquier deriva acumulada.
- En CI se construyen los incrementales con `--empty` o con una muestra, para validar el SQL sin procesar todo.
- Cuando un incremental "pierde filas", lo primero que se revisa es el filtro de `is_incremental()` y los datos tardíos.
:::

:::entrevista "¿Cómo harías que un modelo de 3 años de eventos no tarde 40 minutos cada día?"
Lo convertiría en incremental: en la primera ejecución construye todo, y en las siguientes filtra con `is_incremental()` solo lo nuevo respecto de `{{ this }}`. Elegiría `merge` con una `unique_key` si las filas pueden cambiar o repetirse, y reprocesaría una ventana de algunos días para capturar los datos tardíos (o usaría `microbatch` con `lookback`). Agregaría un test `unique` a la clave y programaría un `--full-refresh` periódico. También revisaría si la tabla está particionada por fecha para que el filtro lea menos datos.
:::

| Concepto | En una línea |
|---|---|
| `view` | Guarda la consulta; se calcula al leer |
| `table` | Guarda las filas; se reconstruye completa |
| `ephemeral` | Se inserta como CTE en quien lo usa |
| `incremental` | Agrega o fusiona solo lo nuevo |
| `is_incremental()` | Falso la primera vez y con `--full-refresh` |
| `{{ this }}` | La tabla actual del propio modelo |
| `on_schema_change` | Qué hacer si cambian las columnas de un incremental |

## Ejercicios

:::ejercicio dbt incremental this=fct_pedidos_diarios
La tabla incremental `fct_pedidos_diarios` ya existe y tiene cargados los días **hasta el 30 de noviembre de 2024**. Escribe el modelo incremental que cuenta los pedidos por `fecha_pedido` (columnas `fecha_pedido`, `pedidos`) desde `stg_pedidos` y que, cuando `is_incremental()` es verdadero, **solo procese las fechas posteriores** a la máxima fecha de `{{ this }}`. (El corrector simula una ejecución incremental: verás solo las filas nuevas.)
```sql previo
CREATE TABLE fct_pedidos_diarios AS
SELECT fecha_pedido, COUNT(*) AS pedidos FROM pedidos WHERE fecha_pedido < '2024-12-01' GROUP BY fecha_pedido
```
```sql inicial
{{ config(materialized='incremental', unique_key='fecha_pedido') }}

select fecha_pedido, count(*) as pedidos
from {{ ref('stg_pedidos') }}
-- agrega aquí el filtro incremental
group by fecha_pedido
```
```sql solucion
{{ config(materialized='incremental', unique_key='fecha_pedido') }}

select fecha_pedido, count(*) as pedidos
from {{ ref('stg_pedidos') }}
{% if is_incremental() %}
where fecha_pedido > (select max(fecha_pedido) from {{ this }})
{% endif %}
group by fecha_pedido
```
```pista
`{% if is_incremental() %} where fecha_pedido > (select max(fecha_pedido) from {{ this }}) {% endif %}`
```
:::

:::ejercicio quiz
Un modelo de staging muy simple se consulta pocas veces y siempre debe reflejar el último dato de la fuente. ¿Qué materialización usas?

- [x] view
- [ ] table
- [ ] incremental
- [ ] snapshot
:::

:::ejercicio quiz
La tabla de pedidos tiene 2.000 millones de filas y los pedidos **cambian de estado** durante días. ¿Qué configuración es la más adecuada?

- [ ] `materialized='table'`
- [ ] `materialized='incremental'` con estrategia `append`
- [x] `materialized='incremental'` con `unique_key='pedido_id'` y estrategia `merge`
- [ ] `materialized='ephemeral'`
:::

:::ejercicio quiz dificultad=Básico
¿Qué guarda una **vista** en la base de datos?

- [ ] Una copia de las filas
- [x] Solo la consulta: las filas se calculan cada vez que alguien la lee
- [ ] Un índice
- [ ] Un archivo CSV
:::

:::ejercicio quiz dificultad=Intermedio
Un modelo incremental con `append` se ejecutó dos veces seguidas sin el bloque `{% if is_incremental() %}`. ¿Qué pasa?

- [ ] Nada, dbt detecta las filas repetidas
- [x] La segunda ejecución vuelve a insertar todas las filas: la tabla queda duplicada
- [ ] dbt da error
- [ ] La tabla se reconstruye desde cero
:::

:::ejercicio quiz dificultad=Avanzado
Agregaste la columna `canal` al `SELECT` de un incremental con `on_schema_change='append_new_columns'`. ¿Qué valor tiene `canal` en las filas cargadas antes del cambio?

- [ ] El valor correcto, dbt lo recalcula
- [x] `NULL`: ninguna opción completa las filas viejas; para eso hay que hacer `--full-refresh`
- [ ] Una cadena vacía
- [ ] La ejecución falla
:::

:::ejercicio quiz dificultad=Avanzado
Los eventos pueden llegar hasta 2 días tarde y nunca cambian una vez llegados, pero a veces el origen reenvía el mismo evento. ¿Qué configuración es la más segura?

- [ ] `append` con `where fecha > max(fecha)`
- [x] `merge` con `unique_key='evento_id'` y reprocesar una ventana de los últimos días
- [ ] `table`
- [ ] `ephemeral`
:::
