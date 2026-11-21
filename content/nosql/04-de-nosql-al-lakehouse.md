---
titulo: Llevar una base NoSQL al lakehouse
nivel: Experto
duracion: 70
resumen: El trabajo más común de un ingeniero de datos con una base NoSQL es sacar sus datos hacia el lakehouse sin frenar a la app. Comparas export completo y flujo de cambios (change streams, change feed, DynamoDB Streams), aplicas una secuencia de cambios con inserciones, actualizaciones y borrados en orden, y en PySpark aplanas documentos con from_json, unificas versiones, explotas listas en filas y te quedas con la última versión de cada documento.
objetivos: Elegir entre export completo e incremental por flujo de cambios | Aplicar inserciones, actualizaciones y borrados de un flujo de cambios respetando el orden | Aplanar documentos JSON en columnas con from_json y un esquema | Unificar dos versiones de un documento en PySpark | Explotar listas en filas y deduplicar por la versión más reciente
prerrequisitos: nosql-claves-y-particiones | pyspark-complejos
autoevaluacion: ¿Cuándo alcanza un export diario y cuándo necesitas un flujo de cambios? | ¿Por qué hay que ordenar los cambios por su marca de tiempo antes de aplicarlos? | ¿Qué hace from_json con un documento roto? | ¿Cómo pasas de un pedido con lista de líneas a una fila por línea?
---

:::analogia En palabras simples
Para copiar la agenda de alguien puedes fotocopiarla entera cada noche (export completo) o pedirle que te avise cada vez que agrega, cambia o tacha un contacto (flujo de cambios). La fotocopia es simple pero pesada; los avisos son livianos, pero si llegan desordenados o te pierdes uno, tu copia queda mal.
:::

## Export completo o flujo de cambios

| Estrategia | Cómo | Bueno para | Cuidado |
|---|---|---|---|
| **Export completo** | Copiar toda la colección cada día (por ejemplo, exportar DynamoDB a S3) | Colecciones chicas o medianas, frescura diaria | Costo y tiempo crecen con la colección |
| **Incremental por fecha** | Leer los documentos con `actualizado_en` mayor a la última carga | Cuando la app mantiene bien ese campo | **No ve los borrados** |
| **Flujo de cambios** | Leer el registro de cambios de la base: *change streams* en MongoDB, *change feed* en Cosmos DB, *DynamoDB Streams* | Frescura de minutos, colecciones grandes, borrados | Orden, duplicados y reprocesos |

```diagrama
titulo: Llevar una colección al lakehouse con su flujo de cambios
nodo app: App | icono=movil | col=0 | fila=0 | color=gris
nodo db: Cosmos DB / MongoDB | icono=mongodb | col=1 | fila=0 | color=verde
nodo cf: Change feed / change streams | icono=stream | col=2 | fila=0 | color=azul | sub=insert, update, delete con marca de tiempo
nodo br: bronze | icono=capas | col=3 | fila=0 | color=naranja | sub=cada cambio tal cual
nodo sv: silver | icono=tabla | col=3 | fila=1 | color=gris | sub=última versión por _id (MERGE), borrados aplicados
nodo pl: Tablas planas | icono=tabla | col=2 | fila=1 | color=amarillo | sub=pedidos + lineas (explode)
flecha app -> db
flecha db -> cf
flecha cf -> br
flecha br -> sv
flecha sv -> pl
```

Los flujos de cambios entregan eventos del tipo `{"operacion": "update", "_id": 101, "documento": {...}, "ts": ...}`. Es la misma idea que el CDC de una base relacional que viste en el proyecto Mercado Vecino ([change streams de MongoDB](https://www.mongodb.com/docs/manual/changestreams/), [DynamoDB Streams](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html)).

:::cuidado Cambios fuera de orden
En un sistema distribuido, el cambio de las 10:05 puede llegar después que el de las 10:07. Si aplicas en orden de llegada, el documento queda con la versión vieja. Siempre ordena por la marca de tiempo (o el número de secuencia) del cambio y, al aplicar, ignora un cambio más viejo que el que ya tienes. Y los **borrados** se aplican como borrados (o como una marca `eliminado = true` en silver), no se ignoran.
:::

## Aplanar documentos en PySpark

`from_json` convierte el texto JSON en una estructura con el esquema que le das, y después cada campo anidado se lee con un punto. Un documento roto da una fila con todos los campos nulos (modo `PERMISSIVE`), sin frenar el proceso:

```python
from pyspark.sql import functions as F

esquema = "v INT, evento STRUCT<tipo: STRING, ts: STRING>, usuario STRUCT<id: INT, logueado: BOOLEAN>, producto STRUCT<id: INT, precio: DOUBLE>"
eventos = (spark.table("bronze_eventos_app")
           .withColumn("e", F.from_json("payload", esquema))
           .filter(F.col("e.v") == 2)
           .select("evento_id", F.col("e.evento.tipo").alias("tipo"),
                   F.col("e.usuario.id").alias("cliente_id"), F.col("e.producto.precio").alias("precio")))
eventos.show(5)
```

Para unificar versiones con esquemas distintos, `get_json_object` lee un camino sin declarar el esquema completo, y `coalesce` elige el que exista.

## Explotar listas

`F.explode("lineas")` produce una fila por elemento de la lista (y descarta los documentos con la lista vacía o nula; `explode_outer` los conserva con nulos). Es el paso que lleva un documento de pedido al grano "una fila por línea" de una tabla de hechos.

:::practica pyspark Del documento al grano de línea
1. Ejecuta: tres pedidos como documentos, con sus líneas embebidas, se convierten en una fila por línea.
2. Fíjate en que el pedido sin líneas desaparece con `explode`. Cámbialo por `explode_outer` y mira qué pasa.
3. Agrega una columna `importe = cantidad * precio` y suma el importe por pedido.

```python
from pyspark.sql import functions as F

docs = spark.createDataFrame(
    [(101, "entregado", [{"producto_id": 3, "cantidad": 2, "precio": 120.0}, {"producto_id": 9, "cantidad": 1, "precio": 45.0}]),
     (102, "enviado", [{"producto_id": 3, "cantidad": 5, "precio": 118.0}]),
     (103, "cancelado", [])],
    "pedido_id INT, estado STRING, lineas ARRAY<STRUCT<producto_id: INT, cantidad: INT, precio: DOUBLE>>")

lineas = (docs.select("pedido_id", "estado", F.explode("lineas").alias("l"))
              .select("pedido_id", "estado", "l.producto_id", "l.cantidad", "l.precio"))
lineas.show()
```

Reto: con `F.posexplode` agrega el número de línea (posición dentro del pedido, empezando en 1).

Documentación oficial: [from_json](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.from_json.html) · [explode](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.explode.html) · [Change streams (MongoDB)](https://www.mongodb.com/docs/manual/changestreams/) · [DynamoDB Streams](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html)
:::

:::errores
- **Incremental por fecha sin pensar en los borrados.** Los documentos borrados nunca vuelven a aparecer: quedan vivos en tu copia.
- **Aplicar cambios en orden de llegada.** Ordena por marca de tiempo y descarta los más viejos.
- **Aplanar sin esquema y con `inferSchema` sobre toda la historia.** Un campo que cambió de tipo rompe la inferencia: declara el esquema.
- **Consultar la base de la app para el export.** Usa el mecanismo de export o de flujo de cambios de la base, que no compite con la app.
:::

:::entrevista
**Pregunta:** "La app guarda pedidos en Cosmos DB. ¿Cómo los llevas a Databricks con frescura de 15 minutos?"

**Respuesta modelo:** "Leo el change feed de Cosmos DB y escribo cada cambio tal cual en una tabla bronze con su `_ts` y su `_id`. Un job cada 15 minutos (o un pipeline declarativo continuo) toma lo nuevo de bronze, se queda con la última versión de cada `_id` por `_ts` y hace `MERGE` en silver, aplicando los borrados. En silver aplano el documento: cabecera en una tabla y líneas explotadas en otra. Como el feed puede reenviar cambios, todo es idempotente por `_id` y `_ts`."
:::

## Ejercicios

:::ejercicio python dificultad=Experto titulo="Aplicar un flujo de cambios"
Escribe `aplicar(cambios)`. Cada cambio es `{"op": "insert" | "update" | "delete", "_id": ..., "ts": número, "doc": {...}}` (los `delete` no traen `doc`). Los cambios pueden venir **desordenados**: aplícalos en orden de `ts`, y si para un `_id` llega un cambio con `ts` **menor o igual** al último aplicado, ignóralo. Devuelve la foto final como lista de documentos (sin borrados), ordenada por `_id`, donde cada documento es `doc` con el campo `_id` agregado.
```python inicial
def aplicar(cambios):
    pass
```
```python solucion
def aplicar(cambios):
    estado, ultimo_ts = {}, {}
    for c in sorted(cambios, key=lambda c: c["ts"]):
        i = c["_id"]
        if i in ultimo_ts and c["ts"] <= ultimo_ts[i]:
            continue
        ultimo_ts[i] = c["ts"]
        if c["op"] == "delete":
            estado.pop(i, None)
        else:
            estado[i] = {"_id": i, **c["doc"]}
    return [estado[i] for i in sorted(estado)]
```
```pista
Ordena por `ts` y recorre guardando, por `_id`, el último `ts` aplicado. Un `delete` saca el documento; `insert` y `update` lo reemplazan.
```
```pista
El `ts` del borrado también cuenta como "último aplicado": un `update` más viejo que llegue después no debe resucitar el documento.
```
```python test
cambios = [
    {"op": "update", "_id": 1, "ts": 30, "doc": {"estado": "entregado"}},
    {"op": "insert", "_id": 1, "ts": 10, "doc": {"estado": "pendiente"}},
    {"op": "insert", "_id": 2, "ts": 12, "doc": {"estado": "pendiente"}},
    {"op": "update", "_id": 1, "ts": 20, "doc": {"estado": "enviado"}},
    {"op": "delete", "_id": 2, "ts": 25},
    {"op": "update", "_id": 2, "ts": 18, "doc": {"estado": "enviado"}},
    {"op": "insert", "_id": 3, "ts": 40, "doc": {"estado": "pendiente"}},
]
r = aplicar(cambios)
assert r == [{"_id": 1, "estado": "entregado"}, {"_id": 3, "estado": "pendiente"}], f"Obtuviste {r}"
assert aplicar([]) == []
assert aplicar([{"op": "update", "_id": 5, "ts": 2, "doc": {"a": 1}}, {"op": "update", "_id": 5, "ts": 2, "doc": {"a": 2}}]) == [{"_id": 5, "a": 1}], "Un cambio con el mismo ts que el último aplicado se ignora"
```
:::

:::ejercicio pyspark dificultad=Experto titulo="Aplanar los eventos de la versión 2"
De `bronze_eventos_app`, interpreta `payload` con `from_json` y el esquema `v INT, evento STRUCT<tipo: STRING, ts: STRING>, usuario STRUCT<id: INT, logueado: BOOLEAN>, producto STRUCT<id: INT, precio: DOUBLE>`, quédate con los de `v = 2` y devuelve: `evento_id`, `tipo`, `cliente_id`, `logueado`, `producto_id`, `precio`.
```python solucion
from pyspark.sql import functions as F

esquema = "v INT, evento STRUCT<tipo: STRING, ts: STRING>, usuario STRUCT<id: INT, logueado: BOOLEAN>, producto STRUCT<id: INT, precio: DOUBLE>"
resultado = (spark.table("bronze_eventos_app")
             .withColumn("e", F.from_json("payload", esquema))
             .filter(F.col("e.v") == 2)
             .select("evento_id",
                     F.col("e.evento.tipo").alias("tipo"),
                     F.col("e.usuario.id").alias("cliente_id"),
                     F.col("e.usuario.logueado").alias("logueado"),
                     F.col("e.producto.id").alias("producto_id"),
                     F.col("e.producto.precio").alias("precio")))
```
```pista
`F.from_json("payload", esquema)` crea una columna estructurada; los campos anidados se leen con `F.col("e.usuario.id")`.
```
```pista
Los JSON cortados dan `v` nulo, así que el filtro `e.v == 2` también los deja afuera.
```
:::

:::ejercicio pyspark dificultad=Avanzado titulo="Eventos por tipo, unificando versiones"
Cuenta los eventos de `bronze_eventos_app` por tipo, unificando versiones: en la v1 el tipo está en `$.tipo` y en la v2 en `$.evento.tipo`. Los JSON cortados no tienen tipo: déjalos fuera. Columnas: `tipo`, `eventos`.
```python solucion
from pyspark.sql import functions as F

resultado = (spark.table("bronze_eventos_app")
             .withColumn("tipo", F.coalesce(F.get_json_object("payload", "$.tipo"), F.get_json_object("payload", "$.evento.tipo")))
             .filter(F.col("tipo").isNotNull())
             .groupBy("tipo")
             .agg(F.count("*").alias("eventos")))
```
```pista
`F.get_json_object("payload", "$.tipo")` lee un camino sin declarar el esquema; con `F.coalesce` te quedas con el que exista.
```
:::

:::ejercicio pyspark dificultad=Avanzado titulo="Una fila por línea de pedido"
Con el DataFrame `docs` del código inicial, devuelve una fila por línea de pedido, **incluyendo** los pedidos sin líneas (con `producto_id` y `cantidad` nulos). Columnas: `pedido_id`, `producto_id`, `cantidad`.
```python inicial
from pyspark.sql import functions as F

docs = spark.createDataFrame(
    [(101, [{"producto_id": 3, "cantidad": 2}, {"producto_id": 9, "cantidad": 1}]),
     (102, [{"producto_id": 3, "cantidad": 5}]),
     (103, [])],
    "pedido_id INT, lineas ARRAY<STRUCT<producto_id: INT, cantidad: INT>>")
resultado = docs
```
```python solucion
from pyspark.sql import functions as F

docs = spark.createDataFrame(
    [(101, [{"producto_id": 3, "cantidad": 2}, {"producto_id": 9, "cantidad": 1}]),
     (102, [{"producto_id": 3, "cantidad": 5}]),
     (103, [])],
    "pedido_id INT, lineas ARRAY<STRUCT<producto_id: INT, cantidad: INT>>")
resultado = (docs.select("pedido_id", F.explode_outer("lineas").alias("l"))
                 .select("pedido_id", F.col("l.producto_id").alias("producto_id"), F.col("l.cantidad").alias("cantidad")))
```
```pista
`F.explode` descarta el pedido 103 (lista vacía); `F.explode_outer` lo conserva con nulos.
```
:::
