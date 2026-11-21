---
titulo: Claves de partición, particiones calientes y claves compuestas
nivel: Experto
duracion: 65
resumen: Las bases NoSQL escalan repartiendo los datos en particiones según una clave. Si la clave está mal elegida, casi todo cae en una sola partición - la partición caliente - y la base entera va a la velocidad de una máquina. Mides con datos reales cómo quedaría repartida la carga con distintas claves, aprendes a "salar" una clave caliente y a diseñar claves compuestas (partición más ordenamiento) que responden consultas por rango, como en DynamoDB y Cassandra.
objetivos: Explicar cómo una clave de partición reparte datos con una función hash | Medir la concentración de una clave candidata y detectar particiones calientes | Repartir una clave caliente con sal y saber qué cuesta al leer | Diseñar una clave compuesta que responda consultas por rango | Relacionar estas ideas con las particiones de un lakehouse y el sesgo en Spark
prerrequisitos: nosql-documentos-y-json | entrevistas-pyspark-traducir-patrones
autoevaluacion: ¿Por qué el dispositivo es una mala clave de partición? | ¿Qué pasa con las escrituras si la clave es la fecha de hoy? | ¿Qué cuesta agregar sal a una clave? | ¿Cómo pides "los pedidos de un cliente en marzo" con una clave compuesta?
---

:::analogia En palabras simples
Un supermercado con diez cajas reparte a los clientes por la inicial del apellido. Si casi todos se apellidan "García", nueve cajas quedan vacías y una tiene una fila enorme. La clave de partición es esa regla de reparto: si está mal elegida, tener diez cajas no sirve de nada.
:::

## Cómo se reparte

La base aplica una función **hash** a la clave de partición y el resultado decide en qué partición (en qué máquina) vive cada registro: `particion = hash(clave) % cantidad_de_particiones`. La misma clave siempre cae en la misma partición, y claves distintas se reparten de forma pareja… **si hay muchas claves distintas y ninguna domina**.

| Clave candidata (eventos de la web) | Valores distintos | % en la partición más cargada |
|---|---|---|
| `dispositivo` | 3 | 59,5 % |
| `pagina` | 7 | 31,1 % |
| `cliente_id` | 1178 | 14,4 % (¡los anónimos, con `NULL`!) |
| día de `fecha_hora` | 366 | 0,5 % |

`dispositivo` tiene tan pocos valores que nunca puede usar más de 3 particiones, y una lleva el 60 %. `cliente_id` parece buena, pero todos los visitantes sin sesión comparten la clave `NULL` y forman una partición caliente.

:::cuidado La fecha como clave de partición
El día reparte bien los datos **guardados** (0,5 % por día), pero mal las **escrituras**: todo lo que llega hoy va a la partición de hoy, y las otras 365 no reciben nada. Para escrituras masivas en tiempo real, la fecha va en la clave de **ordenamiento**, no en la de partición. (En un lakehouse es distinto: particionar archivos por fecha está bien, porque se escribe en lotes y se lee filtrando por fecha.)
:::

## Salar una clave caliente

Si una clave recibe demasiadas escrituras (el `NULL` de los anónimos, o un producto en oferta), se le agrega un sufijo, la **sal**: `anonimo#0`, `anonimo#1`, …, `anonimo#9`. Cada escritura elige uno (por ejemplo, según el id del evento), y la carga se reparte en 10 particiones. El costo: para leer "todo lo anónimo" hay que consultar las 10 claves y juntar los resultados. Es el mismo truco que se usa en Spark para el sesgo (*skew*) en un join, que viste en la lección de PySpark de entrevistas.

```diagrama
titulo: Salar una clave caliente: repartir las escrituras en varias particiones
nodo ev: Eventos de anónimos | icono=stream | col=0 | fila=1 | color=gris | sub=todos con clave NULL
nodo a0: anon#0 | icono=cubo | col=1 | fila=0 | color=azul
nodo a1: anon#1 | icono=cubo | col=1 | fila=1 | color=azul
nodo a9: anon#9 | icono=cubo | col=1 | fila=2 | color=azul
nodo lec: Leer todo lo anónimo | icono=lupa | col=2 | fila=1 | color=naranja | sub=consultar las 10 claves y juntar
flecha ev -> a0: evento_id % 10
flecha ev -> a1
flecha ev -> a9
flecha a0 -> lec
flecha a1 -> lec
flecha a9 -> lec
```

## Claves compuestas: partición más ordenamiento

DynamoDB y Cassandra permiten una clave de **dos partes**: la clave de partición decide dónde vive el registro, y la clave de **ordenamiento** lo mantiene ordenado dentro de la partición. Eso habilita consultas por rango dentro de una partición:

| Patrón de acceso | Clave de partición | Clave de ordenamiento | Consulta |
|---|---|---|---|
| Pedidos de un cliente por fecha | `CLIENTE#7` | `PEDIDO#2024-03-15#101` | `sk BETWEEN 'PEDIDO#2024-03' AND 'PEDIDO#2024-03~'` |
| Lecturas de un sensor | `SENSOR#42` | marca de tiempo | Las de la última hora |
| Mensajes de un chat | `CHAT#9` | marca de tiempo | Los 50 más recientes |

En DynamoDB, la operación `Query` exige la clave de partición exacta y permite condiciones sobre la de ordenamiento (`=`, `BETWEEN`, `begins_with`…). Sin la clave de partición, solo queda un `Scan` de toda la tabla, lento y caro ([documentación](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html)).

:::tip Primero los patrones de acceso
En NoSQL el diseño empieza al revés que en relacional: primero escribes la lista de consultas que la app va a hacer ("pedidos de un cliente por fecha", "último estado de un pedido") y recién después eliges las claves que las responden con una sola lectura.
:::

:::practica sql Medir las claves candidatas con datos reales
1. Ejecuta: la consulta calcula, para cuatro claves candidatas, cuántos valores distintos tienen y qué porcentaje cae en el valor más frecuente.
2. Explica por qué `cliente_id` tiene 14,4 % en una sola partición (pista: filtra `WHERE cliente_id IS NULL`).
3. Agrega una quinta candidata: la combinación `cliente_id || '-' || substr(fecha_hora, 1, 7)` (cliente y mes). ¿Mejora?

```sql
WITH total AS (SELECT COUNT(*) AS n FROM eventos_web)
SELECT 'dispositivo' AS clave, COUNT(*) AS valores, ROUND(100.0 * MAX(c) / (SELECT n FROM total), 1) AS pct_max
FROM (SELECT dispositivo, COUNT(*) AS c FROM eventos_web GROUP BY dispositivo)
UNION ALL
SELECT 'pagina', COUNT(*), ROUND(100.0 * MAX(c) / (SELECT n FROM total), 1)
FROM (SELECT pagina, COUNT(*) AS c FROM eventos_web GROUP BY pagina)
UNION ALL
SELECT 'cliente_id', COUNT(*), ROUND(100.0 * MAX(c) / (SELECT n FROM total), 1)
FROM (SELECT cliente_id, COUNT(*) AS c FROM eventos_web GROUP BY cliente_id)
UNION ALL
SELECT 'dia', COUNT(*), ROUND(100.0 * MAX(c) / (SELECT n FROM total), 1)
FROM (SELECT substr(fecha_hora, 1, 10) AS dia, COUNT(*) AS c FROM eventos_web GROUP BY dia);
```

Reto: calcula la misma medida para `cliente_id` pero tratando los `NULL` con sal: `COALESCE(CAST(cliente_id AS TEXT), 'anon#' || (evento_id % 10))`. ¿Cuánto baja el máximo?

Documentación oficial: [Diseño de claves de partición (DynamoDB)](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html) · [Claves de ordenamiento (DynamoDB)](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-sort-keys.html) · [Modelado de datos (Cassandra)](https://cassandra.apache.org/doc/latest/cassandra/developing/data-modeling/index.html)
:::

:::errores
- **Claves con pocos valores.** Estado, país o dispositivo nunca usan más que unas pocas particiones.
- **Un valor por defecto compartido.** `NULL`, `"desconocido"` o `0` concentran todo lo que no tiene dato.
- **La fecha actual como clave de partición en escrituras en tiempo real.** Va en la clave de ordenamiento.
- **Diseñar sin la lista de consultas.** En NoSQL, una consulta que no usa la clave es un recorrido completo.
:::

:::entrevista
**Pregunta:** "Diseña la tabla de DynamoDB para guardar el estado de los pedidos de una tienda."

**Respuesta modelo:** "Empiezo por los patrones de acceso: ver un pedido por id, listar los pedidos de un cliente por fecha y listar los pedidos pendientes. Para los dos primeros uso una tabla con clave de partición `CLIENTE#id` y clave de ordenamiento `PEDIDO#fecha#id`, más un índice secundario por `pedido_id`. Para 'pendientes', un índice secundario disperso que solo tiene los pedidos con estado pendiente, con la clave de partición salada en 10 valores para no concentrar escrituras. Y para analítica, no consulto DynamoDB: exporto o uso DynamoDB Streams hacia el lakehouse."
:::

## Ejercicios

:::ejercicio quiz
Una app de sensores escribe miles de lecturas por segundo. ¿Qué clave de partición evita una partición caliente?
- [ ] La fecha y hora de la lectura
- [ ] El tipo de sensor (temperatura, humedad o presión)
- [x] El id del sensor, con la marca de tiempo como clave de ordenamiento
- [ ] Un valor fijo, para que todo quede junto
:::

:::ejercicio python dificultad=Avanzado titulo="¿Cómo quedaría repartida la carga?"
Escribe `carga(registros, campo, n)` que simule el reparto en `n` particiones: para cada registro, la partición es `zlib.crc32(str(registro[campo]).encode()) % n` (un `None` se convierte en el texto `"None"`, como cualquier otro valor). Devuelve una lista de `n` conteos y, aparte, escribe `desbalance(conteos)` que devuelva el máximo dividido por el promedio, redondeado a 2 (1.0 es un reparto perfecto). Si no hay registros, `desbalance` devuelve 1.0.
```python inicial
import zlib

def carga(registros, campo, n):
    pass

def desbalance(conteos):
    pass
```
```python solucion
import zlib

def carga(registros, campo, n):
    conteos = [0] * n
    for r in registros:
        conteos[zlib.crc32(str(r[campo]).encode()) % n] += 1
    return conteos

def desbalance(conteos):
    total = sum(conteos)
    if total == 0:
        return 1.0
    return round(max(conteos) / (total / len(conteos)), 2)
```
```pista
`zlib.crc32` es una función hash determinista: el mismo texto da siempre el mismo número, en cualquier computadora (`hash()` de Python cambia entre ejecuciones).
```
```python test
import zlib
regs = [{"disp": d, "cli": i} for i, d in enumerate(["movil"] * 6 + ["escritorio"] * 3 + ["tablet"])]
c = carga(regs, "disp", 4)
assert sum(c) == 10 and len(c) == 4 and max(c) >= 6, f"Obtuviste {c}"
assert c[zlib.crc32(b"movil") % 4] >= 6
assert desbalance([5, 5, 5, 5]) == 1.0
assert desbalance([10, 0, 0, 0]) == 4.0
assert desbalance([]) == 1.0 and desbalance([0, 0]) == 1.0
assert desbalance(carga(regs, "cli", 4)) < desbalance(carga(regs, "disp", 4)), "El id reparte mejor que el dispositivo"
```
:::

:::ejercicio python dificultad=Avanzado titulo="Salar una clave caliente"
Escribe `clave_salada(clave, evento_id, k)` que devuelva `f"{clave}#{evento_id % k}"`, y `claves_a_leer(clave, k)` que devuelva la lista de las `k` claves que hay que consultar para leer todo lo de esa clave, en orden (`clave#0`, `clave#1`, …).
```python inicial
def clave_salada(clave, evento_id, k):
    pass

def claves_a_leer(clave, k):
    pass
```
```python solucion
def clave_salada(clave, evento_id, k):
    return f"{clave}#{evento_id % k}"

def claves_a_leer(clave, k):
    return [f"{clave}#{i}" for i in range(k)]
```
```pista
El resto de la división (`%`) reparte los eventos entre 0 y `k - 1`. Para leer, hay que pedir todas esas claves.
```
```python test
assert clave_salada("anon", 23, 10) == "anon#3"
assert claves_a_leer("anon", 3) == ["anon#0", "anon#1", "anon#2"]
salados = {clave_salada("anon", i, 4) for i in range(100)}
assert salados == set(claves_a_leer("anon", 4)), "Toda clave salada debe estar entre las que se leen"
```
:::

:::ejercicio python dificultad=Experto titulo="Una consulta con clave compuesta"
Los registros tienen `pk` (clave de partición) y `sk` (clave de ordenamiento, texto). Escribe `query(items, pk, desde, hasta)` que devuelva, ordenados por `sk`, los registros de esa `pk` con `desde <= sk <= hasta`, como `Query` con `BETWEEN` en DynamoDB. Y `empieza_con(items, pk, prefijo)` para la condición `begins_with`.
```python inicial
def query(items, pk, desde, hasta):
    pass

def empieza_con(items, pk, prefijo):
    pass
```
```python solucion
def query(items, pk, desde, hasta):
    return sorted((i for i in items if i["pk"] == pk and desde <= i["sk"] <= hasta), key=lambda i: i["sk"])

def empieza_con(items, pk, prefijo):
    return sorted((i for i in items if i["pk"] == pk and i["sk"].startswith(prefijo)), key=lambda i: i["sk"])
```
```pista
Filtra por la partición exacta y por la condición sobre `sk`; ordena por `sk`. Las claves de ordenamiento son texto, así que `'PEDIDO#2024-03' <= sk` compara alfabéticamente.
```
```python test
items = [{"pk": "CLIENTE#7", "sk": "PEDIDO#2024-03-15#101"}, {"pk": "CLIENTE#7", "sk": "PERFIL"},
         {"pk": "CLIENTE#7", "sk": "PEDIDO#2024-02-01#90"}, {"pk": "CLIENTE#7", "sk": "PEDIDO#2024-03-02#98"},
         {"pk": "CLIENTE#9", "sk": "PEDIDO#2024-03-05#99"}]
r = query(items, "CLIENTE#7", "PEDIDO#2024-03", "PEDIDO#2024-03~")
assert [i["sk"] for i in r] == ["PEDIDO#2024-03-02#98", "PEDIDO#2024-03-15#101"], f"Obtuviste {[i['sk'] for i in r]}"
assert len(empieza_con(items, "CLIENTE#7", "PEDIDO#")) == 3
assert empieza_con(items, "CLIENTE#7", "PERFIL") == [{"pk": "CLIENTE#7", "sk": "PERFIL"}]
assert query(items, "CLIENTE#1", "A", "Z") == []
```
:::

:::ejercicio sql dificultad=Avanzado titulo="¿Qué tan caliente queda cada clave?"
Para la clave candidata `canal` de `pedidos` (todos los años y estados), devuelve cada valor con su cantidad de pedidos y el porcentaje sobre el total con 1 decimal. Columnas: `canal`, `pedidos`, `pct`.
```sql solucion
SELECT canal, COUNT(*) AS pedidos, ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM pedidos
GROUP BY canal;
```
```pista
`SUM(COUNT(*)) OVER ()` es el total de pedidos de todas las particiones; divide cada conteo por ese total.
```
:::
