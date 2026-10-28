# examen: dbt

## Qué hace dbt
leccion: dbt-que-es-dbt
¿Cuál de estas tareas **no** hace dbt por sí solo?
- [ ] Ejecutar los modelos en el orden correcto según sus dependencias.
- [ ] Correr pruebas sobre los datos después de construir cada modelo.
- [x] Extraer datos de una API y cargarlos.
- [ ] Generar la documentación y el linaje del proyecto.
porque: dbt hace la **T** de ELT, dentro del warehouse. La extracción y carga la hacen otras herramientas (Airbyte, Fivetran, scripts, Data Factory).

## ref()
leccion: dbt-modelos-ref
¿Por qué se escribe `{{ ref('stg_pedidos') }}` en lugar de `analytics.stg_pedidos`?
- [ ] Porque dbt no permite escribir nombres de tablas directamente en los modelos.
- [x] Para que dbt conozca la dependencia y use el esquema del entorno.
- [ ] Porque `ref` guarda el resultado en caché y la consulta corre más rápido.
- [ ] Porque `ref` copia la tabla al esquema del modelo antes de leerla.
porque: `ref` construye el grafo de dependencias y se compila al nombre correcto del entorno. Con el nombre escrito a mano, dbt no sabe que existe la dependencia y en dev leerías datos de producción.

## source()
leccion: dbt-sources-capas
¿Qué ventaja da declarar las tablas crudas como `sources` en YAML?
- [ ] Hacen que dbt cargue automáticamente las tablas crudas desde el sistema de origen.
- [x] Marcan el inicio del linaje y permiten probar su frescura.
- [ ] Convierten las tablas crudas en vistas para que no ocupen espacio en el warehouse.
- [ ] Generan el SQL de staging automáticamente a partir del esquema de la fuente.
porque: Con `source()` el linaje empieza en los datos crudos, y `dbt source freshness` alerta si la ingesta dejó de llegar.

## Capas
leccion: dbt-sources-capas
¿Qué **no** debería hacerse en un modelo de staging?
- [ ] Renombrar columnas a un estándar común.
- [ ] Convertir los tipos de dato de cada columna.
- [x] Unir varias fuentes y calcular métricas de negocio.
- [ ] Quitar espacios y estandarizar mayúsculas.
porque: Staging es "lavar y cortar": un modelo por fuente, limpieza ligera. Los joins y la lógica de negocio van en las capas intermedias y en los marts.

## Materializaciones
leccion: dbt-materializaciones
Un mart lo consultan 40 tableros cada hora y su cálculo tarda 5 minutos. ¿Qué materialización conviene?
- [ ] `view`, para que los tableros vean siempre los datos más frescos.
- [x] `table`, o `incremental` si es muy grande.
- [ ] `ephemeral`, para que el cálculo se haga dentro de cada consulta del tablero.
- [ ] Ninguna: los marts no se materializan, solo se documentan.
porque: Una vista recalcula los 5 minutos en **cada** consulta de cada tablero. Una tabla se calcula una vez por ejecución de dbt y las lecturas son rápidas.

## Incremental
leccion: dbt-materializaciones
En un modelo incremental, ¿cuándo se aplica el filtro dentro de `{% if is_incremental() %}`?
- [ ] Siempre, incluida la primera vez que se crea la tabla.
- [x] Solo cuando la tabla ya existe y no se usa `--full-refresh`.
- [ ] Solo la primera ejecución, para cargar la historia completa.
- [ ] Nunca: es un comentario que dbt ignora al compilar.
porque: La primera ejecución (o con `--full-refresh`) construye la tabla completa. Después, `is_incremental()` es verdadero y el filtro procesa solo lo nuevo.

## Datos tardíos
leccion: dbt-materializaciones
Tu incremental filtra `where actualizado_en > (select max(actualizado_en) from {{ this }})`. ¿Qué riesgo tiene?
- [ ] Ninguno, porque dbt detecta las filas tardías y las agrega solo.
- [x] Las filas que llegan tarde con fecha anterior al máximo se pierden.
- [ ] Duplica todas las filas de la tabla en cada ejecución del modelo.
- [ ] Borra la tabla y la reconstruye entera en cada ejecución.
porque: Si una fila del día 10 llega cuando ya cargaste el 11, su fecha es menor que el máximo y el filtro la descarta. Reprocesar, por ejemplo, los últimos 3 días con `unique_key` corrige eso sin duplicar.

## Tests
leccion: dbt-tests-docs
¿Qué verifica el test genérico `relationships` en `fct_pedidos.cliente_id` hacia `dim_cliente.cliente_id`?
- [ ] Que `cliente_id` sea único dentro de la tabla de pedidos.
- [x] Que cada `cliente_id` de los pedidos exista en `dim_cliente`.
- [ ] Que `cliente_id` no tenga valores nulos en ninguna de las dos tablas.
- [ ] Que las dos tablas tengan la misma cantidad de clientes distintos.
porque: `relationships` busca valores huérfanos: claves foráneas sin fila correspondiente en la dimensión.

## Snapshots
leccion: dbt-snapshots-comandos
La tabla `clientes` del sistema de origen solo guarda el valor actual. ¿Cómo conservas el historial de cambios con dbt?
- [ ] Con un modelo `incremental` que agrega las filas nuevas de `clientes`.
- [x] Con un snapshot.
- [ ] Con un seed que guarda una copia del CSV de clientes cada día.
- [ ] Con un test que falla cuando un cliente cambia sus datos.
porque: Los snapshots comparan el origen con lo guardado y versionan las filas que cambiaron. Hay que ejecutarlos con frecuencia: solo capturan los cambios visibles cuando corren.

## Selección
leccion: dbt-snapshots-comandos
¿Qué ejecuta `dbt build --select stg_pedidos+`?
- [ ] Solo `stg_pedidos` y sus tests.
- [x] `stg_pedidos` y todo lo que depende de él, con sus tests.
- [ ] `stg_pedidos` y todos los modelos de los que depende.
- [ ] Todo el proyecto, empezando por `stg_pedidos`.
porque: El `+` a la derecha agrega los descendientes; a la izquierda (`+stg_pedidos`), los ancestros. `build` ejecuta modelos, tests, seeds y snapshots en orden.

## Jinja
leccion: dbt-jinja-macros
¿Cuándo se ejecuta el código Jinja de un modelo de dbt?
- [ ] Dentro del warehouse, fila por fila, como una función más de SQL.
- [x] Antes de enviar la consulta: dbt lo compila a SQL puro.
- [ ] En el navegador de quien abre la documentación de dbt.
- [ ] Solo cuando se ejecutan los tests, nunca en los modelos.
porque: Jinja genera texto. `dbt compile` muestra el SQL final en `target/compiled`, útil para depurar macros.
