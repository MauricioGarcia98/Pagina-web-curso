---
titulo: Materializaciones e incrementales
nivel: Avanzado
duracion: 35
resumen: view, table, ephemeral, incremental (append, merge, insert_overwrite), config() e is_incremental().
---

La **materialización** decide **cómo** dbt construye el modelo en la base de datos.

| Materialización | Qué crea | Ventaja | Desventaja | Úsala para |
|---|---|---|---|---|
| `view` | Una vista | Siempre actualizada, no ocupa espacio | Se recalcula en cada consulta | Staging, modelos livianos |
| `table` | Una tabla (se recrea completa en cada `dbt run`) | Consultas rápidas | Reconstruir todo puede ser lento/caro | Marts medianos |
| `incremental` | Una tabla que en cada ejecución **solo procesa lo nuevo** | Rápida y barata con mucho volumen | Más compleja | Hechos grandes (eventos, ventas) |
| `ephemeral` | Nada: se inyecta como CTE en quien lo usa | Sin objetos extra | No se puede consultar directamente | Pasos intermedios simples |
| `materialized_view` | Vista materializada (si el motor la soporta) | Rápida y gestionada | Depende del motor | Agregados frecuentes |

Se configura en `dbt_project.yml` (por carpeta) o en el propio modelo con `config()`:

```dbt
{{ config(materialized='table') }}

select canal, count(*) as pedidos
from {{ ref('stg_pedidos') }}
group by canal
```

:::analogia Fotocopia vs. libreta
Una **vista** es una nota que dice "para saber la respuesta, calculá esto": no guarda nada, se recalcula cada vez que alguien la lee. Una **tabla** es una fotocopia de la respuesta: rápida de leer, pero hay que volver a sacarla completa cada vez que cambian los datos. Un modelo **incremental** es una libreta: cada día solo **agregas las páginas nuevas** en vez de reescribir el cuaderno entero.
:::

## Modelos incrementales

En la **primera** ejecución, dbt crea la tabla con todo el resultado. En las **siguientes**, `is_incremental()` es verdadero y solo procesas las filas nuevas, que dbt **agrega o fusiona** en la tabla existente, referenciada como `{{ this }}`.

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

### Cómo se comporta en el tiempo

Supón una tabla de eventos con 500 millones de filas que crece 2 millones por día:

| Ejecución | `is_incremental()` | Qué hace dbt | Filas procesadas |
|---|---|---|---|
| Primera vez (la tabla no existe) | `false` | Crea la tabla con **todo** el `SELECT` (el `if` no se aplica) | 500 millones |
| Día siguiente | `true` | Ejecuta el `SELECT` **con** el filtro y fusiona el resultado en `{{ this }}` | ~2 millones |
| `dbt run --full-refresh` | `false` | Borra y reconstruye desde cero | 500 millones |

Con `materialized='table'`, **cada** ejecución procesaría los 500 millones. Con incremental, solo los nuevos: la diferencia es de horas y de mucho dinero en la nube.

`{{ this }}` es la propia tabla del modelo tal como existe ahora en la base: por eso el filtro `fecha_hora > (select max(fecha_hora) from {{ this }})` significa "lo que es más nuevo que lo último que ya cargué".

### Estrategias de incremental

| Estrategia | Qué hace | Cuándo |
|---|---|---|
| `append` | Inserta las filas nuevas | Eventos inmutables, sin duplicados posibles |
| `merge` | Inserta o actualiza según `unique_key` | Registros que pueden cambiar (pedidos que cambian de estado) |
| `insert_overwrite` / `replace_where` | Reemplaza particiones completas (por ejemplo, el día) | Reprocesar días enteros de forma idempotente |
| `delete+insert` | Borra las claves y vuelve a insertar | Motores sin MERGE eficiente |

:::cuidado Datos que llegan tarde
`where fecha > max(fecha)` pierde filas que llegan con atraso. Patrón común: reprocesar una **ventana** (por ejemplo, los últimos 3 días) con `merge` o `insert_overwrite`: `where fecha >= (select date_sub(max(fecha), 3) from {{ this }})`.
:::

Para reconstruir todo desde cero: `dbt run --full-refresh -s fct_eventos`.

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
