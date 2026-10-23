---
titulo: Tests y documentación
nivel: Avanzado
duracion: 35
resumen: Tests genéricos (unique, not_null, accepted_values, relationships), tests singulares, unit tests, contratos y docs.
---

Un modelo sin tests es una promesa sin garantía. dbt hace que probar los datos sea trivial.

## Tests genéricos en YAML

```yaml norun
# models/marts/_marts.yml
version: 2
models:
  - name: fct_pedidos
    description: "Una fila por pedido, con unidades y total neto."
    columns:
      - name: pedido_id
        description: "Identificador del pedido."
        data_tests:
          - unique
          - not_null
      - name: estado
        data_tests:
          - accepted_values:
              values: ['entregado', 'enviado', 'pendiente', 'cancelado', 'devuelto']
      - name: cliente_id
        data_tests:
          - not_null
          - relationships:
              to: ref('dim_clientes')
              field: cliente_id
```

`dbt test` convierte cada test en una consulta SQL que **busca filas que violan la regla**. Si devuelve 0 filas, el test pasa. Por ejemplo, `unique` sobre `pedido_id` compila a algo como:

```sql
select pedido_id, count(*) as n
from stg_pedidos
group by pedido_id
having count(*) > 1
```

### Pruébalo en la terminal

El proyecto `tienda_dbt` tiene tests declarados en `models/schema.yml`. Ejecútalos y mira cómo dbt informa cada uno:

```bash
cd tienda_dbt
cat models/schema.yml
dbt run
dbt test
dbt build
```

`dbt build` hace `run` + `test` en el orden del DAG: si un test de un modelo falla, **no** se construyen los modelos que dependen de él. Así, un dato malo no se propaga hacia los dashboards. En producción se usa casi siempre `dbt build`.

## Tests singulares

Un archivo `.sql` en `tests/` con una consulta que devuelve las filas “malas”:

```sql
-- tests/assert_pagos_no_superan_total.sql
-- Falla si algún pago aprobado supera el total del pedido en más de 1 centavo
with totales as (
    select pedido_id, sum(cantidad * precio_unitario * (1 - descuento)) as total
    from detalle_pedidos group by pedido_id
)
select p.pago_id, p.monto, t.total
from pagos p join totales t using (pedido_id)
where p.estado = 'aprobado' and p.monto > t.total + 0.01
```

## Severidad, umbrales y paquetes

```yaml norun
      - name: email
        data_tests:
          - not_null:
              config:
                severity: warn          # avisa pero no falla
                warn_if: ">10"
                error_if: ">100"
```

Paquetes como **dbt_utils**, **dbt_expectations** o **elementary** agregan decenas de tests (rangos, recency, unique_combination_of_columns, detección de anomalías…).

## Unit tests y contratos

- **Unit tests** (dbt ≥ 1.8): pruebas de la **lógica** de un modelo con datos de entrada y salida esperada escritos en YAML, sin tocar datos reales.
- **Model contracts**: declaras columnas y tipos; si el modelo no los cumple, el build falla. Ideal para modelos que consumen otros equipos.

## Documentación

`dbt docs generate` y `dbt docs serve` crean un sitio con la descripción de cada modelo y columna, los tests y el **grafo de linaje**. Las descripciones salen del YAML.

## Ejercicios

:::ejercicio dbt vacio
Escribe el **test singular** “ningún pedido tiene fecha anterior al registro de su cliente”: la consulta debe devolver `pedido_id`, `fecha_pedido` y `fecha_registro` de los pedidos que **violan** la regla (usa `stg_pedidos` y `stg_clientes`). Si los datos están bien, devolverá 0 filas, ¡y eso es lo que queremos!
```sql solucion
select p.pedido_id, p.fecha_pedido, c.fecha_registro
from {{ ref('stg_pedidos') }} p
join {{ ref('stg_clientes') }} c on c.cliente_id = p.cliente_id
where p.fecha_pedido < c.fecha_registro
```
:::

:::ejercicio dbt
Escribe la consulta que generaría el test `accepted_values` para la columna `estado` de `stg_pagos` con el único valor permitido `'aprobado'`: devuelve **cada valor no permitido** y cuántas filas lo tienen (columnas `estado`, `n`). (Spoiler: el test fallaría. ¿Tiene sentido como test?)
```sql solucion
select estado, count(*) as n
from {{ ref('stg_pagos') }}
where estado not in ('aprobado')
group by estado
```
```explicacion
Hay pagos `rechazado`, que son válidos. El test correcto sería `accepted_values: ['aprobado', 'rechazado']`. Un test que falla siempre no sirve: los tests deben codificar reglas de negocio reales.
```
:::

:::ejercicio dbt
Escribe la consulta del test `unique` para la combinación de columnas (`cliente_id`, `fecha_pedido`) en `stg_pedidos`: devuelve las combinaciones duplicadas con su cantidad (`n`). ¿Es una buena clave única?
```sql solucion
select cliente_id, fecha_pedido, count(*) as n
from {{ ref('stg_pedidos') }}
group by cliente_id, fecha_pedido
having count(*) > 1
```
```explicacion
Hay clientes con más de un pedido el mismo día, así que (`cliente_id`, `fecha_pedido`) **no** identifica un pedido. La clave correcta es `pedido_id`.
```
:::

:::ejercicio quiz
¿Qué significa que un test de dbt “pasa”?

- [ ] Que la consulta devolvió al menos una fila
- [x] Que la consulta que busca violaciones devolvió 0 filas
- [ ] Que el modelo se compiló
- [ ] Que el YAML es válido
:::
