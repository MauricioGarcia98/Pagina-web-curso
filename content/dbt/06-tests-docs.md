---
titulo: Tests y documentación
nivel: Avanzado
duracion: 60
resumen: Qué es un test de datos en dbt y cómo funciona por dentro, los cuatro tests genéricos, tests singulares, severidad y umbrales, guardar las fallas, dbt build, unit tests, contratos y documentación. Todo explicado desde cero con la documentación oficial.
objetivos: Explicar qué hace dbt cuando un test "pasa" o "falla" | Declarar unique, not_null, accepted_values y relationships en YAML | Escribir un test singular | Configurar severity, warn_if, error_if y where | Elegir entre data test, unit test y contrato | Documentar modelos y columnas
autoevaluacion: ¿Sabes qué consulta genera dbt para un test unique? | ¿Sabes qué pasa en dbt build cuando un test falla? | ¿Sabes la diferencia entre severity warn y error_if? | ¿Sabes cuándo conviene un unit test en lugar de un data test?
---

:::escenario
El lunes, el tablero de ventas mostró el doble de lo normal. Después de dos horas se descubrió la causa: la tabla de pedidos tenía cada pedido **repetido** porque una carga se ejecutó dos veces. Un test de una línea (`unique` sobre `pedido_id`) lo habría detectado antes de que el número llegara al tablero. Esta lección enseña a escribir esos tests.
:::

## Primero, ¿qué es un "test" en datos?

En programación, un *test* es un pequeño programa que verifica que otro programa hace lo que debe. En datos, la idea es la misma pero aplicada a **tablas**: un test es una **afirmación** sobre los datos que debería ser siempre cierta. Por ejemplo:

- "Cada pedido aparece **una sola vez**."
- "Ningún pedido tiene el cliente **vacío**."
- "El estado de un pago es **solo** `aprobado` o `rechazado`."
- "Cada `cliente_id` de los pedidos **existe** en la tabla de clientes."

Si la afirmación es falsa, algo se rompió: en el origen, en la carga o en tu código. El test te avisa **antes** que el usuario del tablero.

:::analogia El control de calidad de una fábrica
Una fábrica de botellas no espera a que el cliente se queje: al final de la línea hay una máquina que revisa cada botella (que tenga tapa, que no esté rajada, que tenga la cantidad correcta). Los tests de dbt son esa máquina, al final de cada modelo.
:::

## Cómo funciona un test por dentro

La documentación oficial de dbt lo explica en una frase: **un test es una consulta `SELECT` que busca las filas que rompen la regla**.

- Si la consulta devuelve **0 filas**, nadie rompe la regla: el test **pasa** (`PASS`).
- Si devuelve **1 o más filas**, cada fila es un caso que viola la regla: el test **falla** (`FAIL`), y el número que muestra dbt es la cantidad de filas encontradas.

Esto parece al revés la primera vez: uno esperaría que el test "devuelva lo bueno". Pero buscar lo malo tiene una ventaja enorme: cuando falla, **las filas devueltas son exactamente los casos a investigar**.

Por ejemplo, para afirmar "`pedido_id` es único", dbt busca los duplicados:

```sql
select pedido_id
from stg_pedidos
where pedido_id is not null
group by pedido_id
having count(*) > 1
```

Línea por línea:

1. `from stg_pedidos`: la tabla (el modelo) que estamos probando.
2. `where pedido_id is not null`: los nulos no se consideran duplicados (eso lo controla otro test, `not_null`).
3. `group by pedido_id`: junta todas las filas que tienen el mismo `pedido_id`.
4. `having count(*) > 1`: deja solo los grupos con más de una fila, es decir, los repetidos.

Ejecútala: devuelve 0 filas, así que el test pasaría.

## Dos formas de escribir tests

dbt tiene dos tipos de tests de datos (en la documentación se llaman *data tests*, para distinguirlos de los *unit tests* que veremos al final):

| Tipo | Dónde se escribe | Cuándo usarlo |
|---|---|---|
| **Genérico** | Una línea en un archivo `.yml`, debajo de la columna | Reglas que se repiten en muchas tablas: único, no nulo, valores permitidos, relación con otra tabla |
| **Singular** | Un archivo `.sql` en la carpeta `tests/` | Una regla de negocio específica que no encaja en un genérico |

La recomendación oficial es que los genéricos sean la **mayoría** de tus tests, porque se reutilizan sin escribir SQL.

## Los cuatro tests genéricos que trae dbt

dbt incluye cuatro tests listos para usar. Se declaran en un archivo YAML (un formato de texto para configuración, donde la **sangría** —los espacios al comienzo de la línea— indica qué está dentro de qué).

```yaml norun
# models/marts/_marts.yml
version: 2
models:
  - name: fct_pedidos                 # el modelo (archivo fct_pedidos.sql)
    description: "Una fila por pedido, con unidades y total neto."
    columns:
      - name: pedido_id               # la columna que probamos
        description: "Identificador del pedido."
        data_tests:
          - unique                    # 1. no se repite
          - not_null                  # 2. nunca está vacío
      - name: estado
        data_tests:
          - accepted_values:          # 3. solo estos valores
              arguments:
                values: ['entregado', 'enviado', 'pendiente', 'cancelado', 'devuelto']
      - name: cliente_id
        data_tests:
          - not_null
          - relationships:            # 4. existe en otra tabla
              arguments:
                to: ref('dim_clientes')
                field: cliente_id
```

Cómo leer el archivo:

- `models:` es una lista; cada elemento empieza con `- name:` y es un modelo.
- Dentro de cada modelo, `columns:` es otra lista con las columnas que quieres describir o probar.
- `data_tests:` es la lista de tests de esa columna. En proyectos viejos verás `tests:`: es la misma cosa con el nombre anterior (dbt acepta los dos, pero no los dos juntos en el mismo modelo).
- `arguments:` agrupa los parámetros del test. Es la sintaxis nueva (dbt 1.10.5 en adelante); en versiones anteriores los parámetros (`values:`, `to:`, `field:`) van directamente debajo del nombre del test. Las dos formas funcionan en la terminal del curso.

Qué consulta genera cada uno:

| Test | Afirmación | Busca (filas que fallan) |
|---|---|---|
| `unique` | No hay valores repetidos | Valores con `count(*) > 1` |
| `not_null` | Nunca está vacío | Filas con la columna `is null` |
| `accepted_values` | Solo valores de una lista | Valores `not in (lista)` |
| `relationships` | Cada valor existe en otra tabla (integridad referencial) | Valores sin pareja en la tabla `to` (un `left join` que no encuentra nada) |

`relationships`, por ejemplo, se traduce en algo así:

```sql
select p.cliente_id
from stg_pedidos p
left join stg_clientes c on c.cliente_id = p.cliente_id
where p.cliente_id is not null
  and c.cliente_id is null
```

El `left join` conserva todos los pedidos; si un pedido no encuentra su cliente, las columnas de `c` quedan en `NULL`. Esos son los "huérfanos".

Para más tests genéricos existen **paquetes** (librerías de dbt que se instalan con `dbt deps`): `dbt_utils` agrega, por ejemplo, `unique_combination_of_columns` y `expression_is_true`; `dbt_expectations` trae decenas inspirados en Great Expectations.

## Tests singulares: tu propia regla en SQL

Cuando la regla es específica de tu negocio, escribes la consulta completa en un archivo de la carpeta `tests/`. El nombre del archivo es el nombre del test.

```sql norun
-- tests/assert_pagos_no_superan_total.sql
-- Falla si algún pago aprobado supera el total del pedido en más de 1 centavo
with totales as (
    select pedido_id, sum(cantidad * precio_unitario * (1 - descuento)) as total
    from {{ ref('stg_detalle_pedidos') }}
    group by pedido_id
)
select p.pago_id, p.monto, t.total
from {{ ref('stg_pagos') }} p
join totales t on t.pedido_id = p.pedido_id
where p.estado = 'aprobado'
  and p.monto > t.total + 0.01
```

Tres reglas de la documentación oficial:

1. Usa `{{ ref('...') }}` igual que en un modelo: así dbt sabe de qué modelos depende el test.
2. **No** termines la consulta con punto y coma (`;`): dbt la envuelve en otra consulta y el `;` la rompe.
3. **No** lo declares en el `.yml` de los modelos: todo `.sql` dentro de `tests/` se ejecuta solo con `dbt test`.

## Pruébalo en la terminal

La terminal del curso ejecuta los cuatro tests genéricos y los singulares sobre la base de la tienda. Ábrela con **⌨ En la terminal**:

```bash
cd tienda_dbt
cat models/schema.yml          # los tests declarados
dbt run                        # construye los modelos
dbt test                       # corre todos los tests
dbt test -s top_clientes       # solo los tests de un modelo
```

Después edita `models/schema.yml` (con `nano models/schema.yml`) y agrega un `accepted_values` sobre `canal` de `ventas_por_canal` con solo `['web', 'app']`. Vuelve a correr `dbt test`: va a fallar, y debajo verás el **SQL compilado** del test y cuántas filas lo rompen. Ese es el flujo real de trabajo: el test falla, copias la consulta y miras las filas.

## Severidad: no todo es una emergencia

Por defecto, un test que encuentra **una sola** fila es un error. A veces eso es demasiado estricto: un 0,1 % de emails vacíos puede ser aceptable, pero un 20 % no. dbt tiene tres configuraciones para eso (página `severity` de la referencia oficial):

| Config | Valores | Por defecto |
|---|---|---|
| `severity` | `error` o `warn` | `error` |
| `error_if` | una condición sobre la cantidad de fallas: `">100"`, `"!=0"`… | `"!=0"` |
| `warn_if` | igual, para la advertencia | `"!=0"` |

Cómo decide dbt, paso a paso:

1. Si `severity: error`, primero revisa `error_if`. Si se cumple, el test da **ERROR**.
2. Si no se cumple, revisa `warn_if`. Si se cumple, da **WARN** (advertencia: se muestra pero no detiene nada).
3. Si ninguna se cumple, **PASS**.
4. Si `severity: warn`, dbt **ignora** `error_if` y solo mira `warn_if`: ese test nunca puede dar error.

Entonces, para "avisar desde 10 fallas y frenar desde 100":

```yaml norun
      - name: email
        data_tests:
          - not_null:
              config:
                severity: error   # (es el valor por defecto; se puede omitir)
                warn_if: ">10"
                error_if: ">100"
```

:::cuidado Un error muy común
Escribir `severity: warn` junto con `error_if: ">100"` **no** funciona como uno espera: con `severity: warn` el `error_if` se ignora y el test nunca falla. Para tener los dos niveles, deja `severity: error`.
:::

Otras dos configuraciones útiles:

- `where: "fecha_pedido >= '2024-01-01'"`: aplica el test solo a una parte de la tabla (por ejemplo, ignorar datos históricos que ya sabes que están sucios).
- `store_failures: true` (o la opción `--store-failures` en la línea de comandos): guarda las filas que fallan en una tabla dentro de un esquema que termina en `dbt_test__audit`, para consultarlas después. En la terminal del curso las verás como tablas `dbt_test__audit_...`.

## dbt test frente a dbt build

- `dbt test` solo **prueba**: no construye nada. Si un modelo no existe todavía, su test da error.
- `dbt build` hace todo **en el orden del grafo**: construye un modelo, enseguida corre sus tests y recién después pasa a los modelos que dependen de él. Si un test con severidad error falla, los modelos que dependen de ese modelo se **saltan** (`SKIP`).

Esa regla es lo que impide que un dato roto llegue al tablero: si `stg_pedidos` tiene duplicados, `fct_ventas` ni siquiera se construye y el tablero sigue mostrando la versión anterior, que estaba bien. En producción casi siempre se usa `dbt build`. Pruébalo: pon un `accepted_values` que falle sobre `stg_ventas` y ejecuta `dbt build`; verás los `SKIP` de los modelos de abajo.

## Unit tests: probar la lógica, no los datos

Los tests de datos revisan los datos **reales** cada vez que corren. Pero a veces lo que quieres probar es tu **lógica**: "si el pedido tiene descuento del 100 %, el importe debe dar 0". Esperar a que aparezca ese caso en los datos reales no sirve. Para eso, dbt (desde la versión 1.8) tiene **unit tests**: le das filas de entrada inventadas y la salida que esperas.

```yaml norun
unit_tests:
  - name: importe_con_descuento_total
    model: stg_detalle_pedidos         # el modelo cuya lógica pruebas
    given:                             # datos de entrada inventados
      - input: source('tienda', 'detalle_pedidos')
        rows:
          - {detalle_id: 1, cantidad: 2, precio_unitario: 100, descuento: 0}
          - {detalle_id: 2, cantidad: 1, precio_unitario: 50, descuento: 1}
    expect:                            # lo que el modelo debe devolver
      rows:
        - {detalle_id: 1, importe: 200}
        - {detalle_id: 2, importe: 0}
```

Cuándo escribirlos, según la documentación oficial: cuando hay lógica difícil (expresiones regulares, cálculos de fechas, funciones de ventana, `case when` con muchos casos), cuando ya hubo un bug en ese modelo, para casos que todavía no aparecen en los datos reales y **antes de reescribir** un modelo importante. No hace falta probar funciones del motor como `min()` o `sum()`.

Como sus entradas son fijas, la recomendación es correrlos en desarrollo y en CI (las pruebas automáticas de cada *pull request*), **no** en cada ejecución de producción: `dbt test --select "test_type:unit"` corre solo los unit tests y `test_type:data` solo los de datos.

## Contratos: prometer la forma de la tabla

Un **contrato** es una promesa sobre las **columnas y sus tipos**. Si otro equipo consume tu tabla `dim_clientes`, un cambio pequeño (que `cliente_id` pase de número a texto) puede romper sus consultas. Con el contrato activado, dbt compara el resultado del modelo con lo declarado **antes** de crear la tabla, y si no coincide, falla:

```yaml norun
models:
  - name: dim_clientes
    config:
      materialized: table
      contract:
        enforced: true
    columns:
      - name: cliente_id
        data_type: int
        constraints:
          - type: not_null
      - name: nombre
        data_type: string
```

Diferencia clave: un **test** revisa los **valores** después de construir; un **contrato** revisa la **forma** (nombres y tipos de columnas) antes de construir.

## Documentación: que cualquiera entienda tus tablas

Las mismas `description:` del YAML se convierten en un sitio web de documentación:

```bash
dbt docs generate   # crea target/manifest.json y target/catalog.json
dbt docs serve      # abre el sitio en el navegador
```

- `manifest.json` describe el proyecto: modelos, tests, descripciones y dependencias.
- `catalog.json` agrega lo que dbt lee de la base: columnas reales y tipos.
- El sitio muestra cada modelo, sus columnas, sus tests y el **grafo de linaje** (de qué tablas sale y qué tablas lo usan).

Para textos largos se usan bloques `{% docs nombre %} … {% enddocs %}` en un archivo `.md` dentro de `models/`, y se reutilizan con `description: '{{ doc("nombre") }}'`.

:::errores
- **Tests que siempre fallan**: un `accepted_values` con una lista incompleta enseña al equipo a ignorar los fallos. Un test debe codificar una regla de negocio real.
- **Solo probar el final**: si pruebas solo `fct_ventas`, cuando falla no sabes en qué paso se rompió. Prueba también las claves de staging.
- **`severity: warn` con `error_if`**: el `error_if` se ignora.
- **Punto y coma al final de un test singular**: rompe la consulta que arma dbt.
- **Correr `dbt run` y después `dbt test` en producción**: si el test falla, el dato malo ya se publicó. Usa `dbt build`.
:::

:::trabajo
- La convención más usada: **toda clave primaria** tiene `unique` + `not_null`, y **toda clave foránea** tiene `relationships`. Es lo mínimo que se pide en una revisión de código.
- En CI se corre `dbt build --select state:modified+` (solo lo que cambió y lo que depende de eso), incluidos los unit tests.
- Los warnings se revisan cada semana: si un test lleva un mes en `WARN`, o se arregla el origen o se ajusta el umbral, pero no se deja sonando.
- Herramientas como **Elementary** leen los resultados de los tests para armar tableros de calidad y alertas.
:::

:::entrevista "¿Qué diferencia hay entre un data test, un unit test y un contrato en dbt?"
El data test revisa los valores de los datos reales después de construir el modelo (por ejemplo, que no haya duplicados). El unit test revisa la lógica del SQL con datos de entrada inventados y una salida esperada, y se corre en desarrollo y CI. El contrato revisa la forma del resultado (nombres y tipos de columnas) antes de crear la tabla, para no romper a quienes la consumen. Se complementan: el contrato protege la estructura, el unit test la lógica y el data test los datos.
:::

| Concepto | En una línea |
|---|---|
| Data test | `SELECT` que busca filas que rompen una regla; 0 filas = pasa |
| Genérico | Test reutilizable declarado en YAML (`unique`, `not_null`, `accepted_values`, `relationships`) |
| Singular | Archivo `.sql` en `tests/` con tu propia regla |
| `severity` / `warn_if` / `error_if` | Cuándo una falla es advertencia y cuándo error |
| `dbt build` | Construye y prueba en orden; salta lo que depende de un test fallido |
| Unit test | Entrada inventada + salida esperada para probar la lógica |
| Contrato | Columnas y tipos garantizados antes de crear la tabla |

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

:::ejercicio dbt vacio dificultad=Intermedio titulo="El test relationships por dentro"
Escribe la consulta que generaría un test `relationships` para `cliente_id` de `stg_pedidos` hacia `stg_clientes`: devuelve el `pedido_id` y el `cliente_id` de los pedidos cuyo cliente **no existe** en `stg_clientes` (ignora los `cliente_id` nulos).
```sql solucion
select p.pedido_id, p.cliente_id
from {{ ref('stg_pedidos') }} p
left join {{ ref('stg_clientes') }} c on c.cliente_id = p.cliente_id
where p.cliente_id is not null
  and c.cliente_id is null
```
```pista
Un `left join` conserva todos los pedidos. Si no encuentra el cliente, las columnas de `c` quedan en `NULL`.
```
```explicacion
Devuelve 0 filas: todos los pedidos tienen su cliente. Ese es el resultado que hace "pasar" al test.
```
:::

:::ejercicio quiz dificultad=Intermedio
Un test tiene `severity: warn` y `error_if: ">100"`. Encuentra 500 filas que fallan. ¿Qué muestra dbt?

- [ ] ERROR, porque 500 es mayor que 100
- [x] WARN: con `severity: warn`, dbt ignora `error_if` y solo mira `warn_if`
- [ ] PASS
- [ ] Un error de configuración
:::

:::ejercicio quiz dificultad=Intermedio
En `dbt build`, el test `unique` de `stg_pedidos` falla con severidad error. ¿Qué pasa con `fct_ventas`, que hace `ref('stg_pedidos')`?

- [ ] Se construye igual y se marca en rojo
- [x] Se salta (SKIP): no se construye para que el dato roto no llegue a los tableros
- [ ] dbt borra `stg_pedidos`
- [ ] Se construye con los duplicados eliminados
:::

:::ejercicio quiz dificultad=Avanzado
Quieres comprobar que tu `case when` de 12 ramas clasifica bien un caso que todavía no existe en los datos reales. ¿Qué usas?

- [ ] Un test `accepted_values`
- [ ] Un contrato
- [x] Un unit test con filas de entrada inventadas y la salida esperada
- [ ] `store_failures`
:::

:::ejercicio quiz dificultad=Básico
¿Por qué un test singular no debe terminar con `;`?

- [ ] Porque YAML no acepta punto y coma
- [x] Porque dbt envuelve la consulta dentro de otra para contar las filas, y el `;` la corta
- [ ] Porque es más lento
- [ ] Porque los tests no son SQL
:::
