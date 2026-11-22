---
titulo: Los tipos de bases NoSQL y cuándo conviene cada una
nivel: Intermedio
duracion: 50
resumen: "NoSQL" no es una base de datos sino una familia - documentos, clave-valor, columnas anchas, grafos, búsqueda y vectores. Cada una está optimizada para un patrón de acceso distinto y renuncia a algo que una base relacional sí da. Aprendes a elegir con criterio, qué significa consistencia eventual, y por qué en ingeniería de datos casi siempre te toca leer de estas bases para llevar sus datos a un lakehouse.
objetivos: Distinguir los seis tipos de bases NoSQL y un caso de uso real de cada uno | Elegir entre relacional y NoSQL a partir del patrón de acceso | Explicar consistencia fuerte y eventual con un ejemplo | Implementar un almacén clave-valor con vencimiento, como Redis | Ubicar el rol de estas bases en una arquitectura de datos
prerrequisitos: fundamentos-donde-viven-los-datos | modelado-normalizacion | modelado-obt-anidados
autoevaluacion: ¿Qué tipo de base usarías para el carrito de compras y cuál para el buscador de productos? | ¿Qué renuncias al elegir una base de documentos frente a una relacional? | ¿Qué es la consistencia eventual? | ¿Por qué un analista no debería consultar directamente la base de la app?
---

:::analogia En palabras simples
Una base relacional es una biblioteca con fichas perfectamente ordenadas: sirve para cualquier pregunta, pero cada pregunta nueva exige cruzar fichas. Las bases NoSQL son herramientas especializadas: un pastillero con un compartimento por día (clave-valor), una carpeta por cliente con todos sus papeles juntos (documentos), un índice al final del libro (búsqueda). Son rapidísimas para lo que fueron hechas y torpes para lo demás.
:::

## Los seis tipos

| Tipo | Cómo guarda | Ejemplos | Ideal para | Malo para |
|---|---|---|---|---|
| **Documentos** | Objetos JSON con forma flexible | MongoDB, Azure Cosmos DB, Firestore | Perfiles, catálogos, contenido que cambia de forma | Uniones entre muchas colecciones |
| **Clave-valor** | Un valor por clave | Redis, Amazon DynamoDB | Sesiones, carritos, caché, contadores | Preguntas que no conocen la clave |
| **Columnas anchas** | Filas con muchas columnas, agrupadas por clave de partición | Apache Cassandra, Google Bigtable | Series de tiempo, IoT, escrituras masivas | Consultas que no usan la clave de partición |
| **Grafos** | Nodos y relaciones | Neo4j, Amazon Neptune | Redes, recomendaciones, fraude | Agregaciones sobre todo el conjunto |
| **Búsqueda** | Índice invertido de texto | Elasticsearch, OpenSearch | Buscador, logs | Ser la fuente de verdad |
| **Vectores** | Vectores numéricos (embeddings) | pgvector, Databricks Vector Search | Búsqueda por significado, RAG | Filtros exactos complejos |

## Qué renuncias

Las bases relacionales dan, de fábrica, uniones entre tablas, transacciones sobre varias filas, un esquema que se valida al escribir y cualquier consulta que se te ocurra. La mayoría de las NoSQL renuncian a parte de eso a cambio de **escalar horizontalmente** (repartir los datos en muchas máquinas) y responder en milisegundos para un patrón de acceso conocido.

:::tip La pregunta que decide
"¿Cómo se va a leer este dato?" Si la respuesta es "siempre por su clave y lo necesito en 5 milisegundos", NoSQL. Si es "no sé todavía, el negocio va a hacer preguntas nuevas", relacional o lakehouse.
:::

## Consistencia fuerte y eventual

Con varias copias de los datos en distintas máquinas, una escritura tarda un poco en llegar a todas. Si lees de una copia que todavía no la recibió:

| Modelo | Qué garantiza | Ejemplo |
|---|---|---|
| **Fuerte** | Toda lectura ve la última escritura | El saldo de una cuenta bancaria |
| **Eventual** | Si dejan de llegar escrituras, todas las copias terminan iguales | El contador de "me gusta" de una publicación |

Muchas bases dejan elegir por consulta: DynamoDB tiene lecturas "eventualmente consistentes" (más baratas) y "fuertemente consistentes" ([documentación](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html)); Cosmos DB ofrece cinco niveles intermedios.

:::cuidado Consultar la base de la app para analítica
La base NoSQL de una app está optimizada para las consultas de la app. Una consulta analítica (recorrer todos los pedidos del año) le roba capacidad y puede frenar la app de los clientes. En ingeniería de datos, esos datos se **copian** al lakehouse (con un export o con CDC, lección 4) y la analítica se hace allí.
:::

## Dónde aparecen en tu trabajo

1. **Como fuente**: la app guarda pedidos en MongoDB o en Cosmos DB y tú los llevas a bronze.
2. **Como destino de servicio**: después de calcular una métrica o una recomendación en el lakehouse, la publicas en Redis o DynamoDB para que la app la lea en milisegundos (es el *reverse ETL* que viste en el proyecto Cuentas Claras).
3. **Como índice**: los textos de soporte se indexan en un buscador o en una base de vectores para un asistente con RAG (proyecto Conecta).

```diagrama
titulo: Dónde aparecen las bases NoSQL en una plataforma de datos
nodo app: App | icono=movil | col=0 | fila=1 | color=gris
nodo doc: MongoDB / Cosmos DB | icono=mongodb | col=1 | fila=1 | color=verde | sub=fuente: los datos de la app
nodo lh: Lakehouse | icono=capas | col=2 | fila=1 | color=naranja | sub=bronze, silver, gold
nodo kv: Redis / DynamoDB | icono=redis | col=3 | fila=0 | color=rojo | sub=servicio: métricas listas en milisegundos
nodo vec: Buscador / vectores | icono=vector | col=3 | fila=2 | color=violeta | sub=índice para RAG
flecha app -> doc | explica=La app guarda sus datos en una base de documentos (MongoDB, Cosmos DB): es una fuente más de la plataforma.
flecha doc -> lh: export o CDC | explica=Esos datos llegan al lakehouse por exportación o por CDC, para analizarlos.
flecha lh -> kv: reverse ETL | explica=Las métricas calculadas en el lakehouse se copian a una base clave-valor (Redis, DynamoDB)…
flecha lh -> vec: indexar | explica=Los textos se indexan en un buscador o una base vectorial, para búsquedas con IA (RAG).
flecha kv -> app: lee | estilo=punteada | explica=…de donde la app las lee en milisegundos. Cada base NoSQL resuelve un uso concreto.
```

:::practica python Un almacén clave-valor con vencimiento
1. Ejecuta: la clase imita lo básico de Redis, con `set`, `get` y un vencimiento (TTL). El tiempo se pasa como parámetro para poder probarla.
2. Mira cómo la sesión vence a los 30 segundos y `get` devuelve `None`.
3. Agrega un método `incr(clave, ahora)` que sume 1 a un contador (y lo cree en 0 si no existe), como `INCR` de Redis.

```python
class MiniRedis:
    def __init__(self):
        self.datos = {}          # clave -> (valor, vence_en o None)

    def set(self, clave, valor, ahora, ttl=None):
        self.datos[clave] = (valor, ahora + ttl if ttl else None)

    def get(self, clave, ahora):
        if clave not in self.datos:
            return None
        valor, vence = self.datos[clave]
        if vence is not None and ahora >= vence:
            del self.datos[clave]      # vencida: se borra al leerla
            return None
        return valor

r = MiniRedis()
r.set("sesion:ana", {"carrito": [3, 7]}, ahora=0, ttl=30)
r.set("config:tema", "oscuro", ahora=0)
for t in (10, 29, 30, 100):
    print(t, r.get("sesion:ana", t), r.get("config:tema", t))
```

Reto: agrega `ttl(clave, ahora)` que devuelva los segundos que le quedan a una clave, `-1` si no vence y `-2` si no existe, igual que el comando `TTL` de Redis.

Documentación oficial: [Redis: comandos SET y EXPIRE](https://redis.io/docs/latest/commands/set/) · [DynamoDB: consistencia de lectura](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html) · [MongoDB: modelo de documentos](https://www.mongodb.com/docs/manual/core/document/)
:::

:::errores
- **Elegir NoSQL "porque escala".** Si no sabes cómo se va a leer el dato, una base relacional o un lakehouse te dan más flexibilidad.
- **Hacer analítica sobre la base de la app.** Copia los datos al lakehouse.
- **Usar un buscador como fuente de verdad.** Un índice se reconstruye desde la fuente; no al revés.
- **Ignorar la consistencia eventual.** Leer justo después de escribir puede devolver el valor viejo.
:::

:::entrevista
**Pregunta:** "¿Cuándo usarías MongoDB en lugar de PostgreSQL?"

**Respuesta modelo:** "Cuando los registros cambian de forma seguido y se leen casi siempre completos por su id, por ejemplo un catálogo con atributos distintos por categoría, y el equipo necesita escalar escrituras horizontalmente. Si hay muchas relaciones entre entidades o transacciones sobre varias tablas, prefiero PostgreSQL, que además ya maneja JSON con `jsonb` para la parte flexible. Y para analítica, ninguna de las dos: copio los datos al lakehouse."
:::

## Ejercicios

:::ejercicio quiz
La app necesita guardar el carrito de cada usuario y leerlo en cada pantalla, siempre por el id del usuario, en pocos milisegundos. ¿Qué tipo de base es la más adecuada?
- [ ] Grafos
- [x] Clave-valor
- [ ] Búsqueda
- [ ] Un data warehouse
:::

:::ejercicio quiz
Un usuario da "me gusta" y, al recargar la página, por un segundo el contador muestra el número anterior. ¿Qué explica este comportamiento?
- [ ] Un error en la base de datos
- [x] Consistencia eventual: la lectura fue a una copia que todavía no recibió la escritura
- [ ] Que la base no tiene transacciones
- [ ] Que el contador está en caché del navegador, siempre
:::

:::ejercicio quiz
El equipo de producto quiere saber las ventas por categoría y mes de los últimos tres años. Los pedidos están en la base de documentos de la app. ¿Qué haces?
- [ ] Una consulta de agregación directamente sobre la base de la app, en horario de mucho uso
- [x] Llevar los pedidos al lakehouse (export o CDC) y calcular allí
- [ ] Crear un índice de búsqueda con todos los pedidos
- [ ] Pedirle a la app que guarde un contador por categoría y mes
:::

:::ejercicio python dificultad=Avanzado titulo="Clave-valor con vencimiento"
Escribe la clase `KV` con los métodos `set(clave, valor, ahora, ttl=None)`, `get(clave, ahora)` y `incr(clave, ahora)`. `get` devuelve `None` si la clave no existe o venció (`ahora >= momento_de_escritura + ttl`). `incr` suma 1 al valor (si no existe o venció, empieza en 0) y devuelve el nuevo valor; **conserva el vencimiento** que tenía la clave si sigue vigente.
```python inicial
class KV:
    def __init__(self):
        pass
```
```python solucion
class KV:
    def __init__(self):
        self.datos = {}

    def set(self, clave, valor, ahora, ttl=None):
        self.datos[clave] = (valor, ahora + ttl if ttl is not None else None)

    def _vigente(self, clave, ahora):
        if clave not in self.datos:
            return None
        valor, vence = self.datos[clave]
        if vence is not None and ahora >= vence:
            del self.datos[clave]
            return None
        return self.datos[clave]

    def get(self, clave, ahora):
        par = self._vigente(clave, ahora)
        return par[0] if par else None

    def incr(self, clave, ahora):
        par = self._vigente(clave, ahora)
        valor, vence = par if par else (0, None)
        self.datos[clave] = (valor + 1, vence)
        return valor + 1
```
```pista
Guarda por clave una tupla `(valor, vence_en)`, con `vence_en = ahora + ttl` o `None`. Un método auxiliar que devuelva el par vigente (o borre el vencido) evita repetir la lógica.
```
```pista
En `incr`, si la clave sigue vigente, guarda el valor nuevo con el **mismo** `vence_en`.
```
```python test
kv = KV()
kv.set("a", "x", 0, ttl=10)
assert kv.get("a", 9) == "x" and kv.get("a", 10) is None, "La clave vence justo a los 10"
assert kv.get("nada", 0) is None
kv.set("visitas", 5, 0, ttl=60)
assert kv.incr("visitas", 1) == 6 and kv.incr("visitas", 2) == 7
assert kv.get("visitas", 59) == 7 and kv.get("visitas", 60) is None, "incr debe conservar el vencimiento"
assert kv.incr("nuevo", 0) == 1 and kv.get("nuevo", 10**9) == 1, "Una clave creada por incr no vence"
```
:::
