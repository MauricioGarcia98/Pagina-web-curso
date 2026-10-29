---
titulo: "Ingesta: carga completa, incremental, CDC y streaming"
nivel: Avanzado
duracion: 55
resumen: Las cuatro formas de traer datos, cuándo usar cada una, la marca de agua, el CDC con Debezium y cómo lograr que una carga sea idempotente.
objetivos: Elegir entre carga completa, incremental, CDC y streaming según la fuente y la latencia | Implementar una carga incremental con marca de agua (watermark) sin perder ni duplicar filas | Aplicar un flujo de cambios CDC (insert, update, delete) para reconstruir el estado de una tabla | Diseñar cargas idempotentes que se pueden repetir sin efectos secundarios
prerrequisitos: arquitectura-que-es | sql-ventanas-1 | python-diccionarios
autoevaluacion: ¿Puedes explicar cuándo conviene una carga completa aunque parezca ineficiente? | ¿Sabes por qué una carga incremental por `updated_at` no detecta los registros borrados? | ¿Puedes reconstruir el estado de una tabla a partir de eventos CDC? | ¿Sabes qué es una marca de agua y dónde se guarda? | ¿Puedes explicar qué significa que una carga sea idempotente y cómo lograrlo?
---

:::escenario El export que tarda cuatro horas
Sofía, de operaciones, se queja:

> "El export nocturno de la base de pedidos empieza a las 0:00 y termina a las 4:00. La base se pone lenta toda la noche y el call center de México, que trabaja hasta tarde, no puede consultar nada. Y encima, si un pedido se cancela a las 10 de la mañana, recién lo vemos al día siguiente."

El problema no es la herramienta: es la **forma** de ingerir. Hoy copian la tabla completa todas las noches. En esta lección vas a ver las alternativas y cuándo conviene cada una.
:::

## Las cuatro formas de traer datos

```diagrama
titulo: Las cuatro estrategias de ingesta, de la más simple a la de menor latencia
nodo full: Carga completa | icono=archivos | col=0 | fila=0 | color=gris | sub=copia todo, siempre
nodo inc: Incremental | icono=reloj | col=1 | fila=0 | color=azul | sub=solo lo nuevo (watermark)
nodo cdc: CDC | icono=base | col=2 | fila=0 | color=violeta | sub=lee el log de la base
nodo str: Streaming | icono=stream | col=3 | fila=0 | color=naranja | sub=eventos al instante
flecha full -> inc: más volumen
flecha inc -> cdc: necesitas borrados
flecha cdc -> str: segundos
```

| Estrategia | Cómo funciona | Latencia típica | Ventajas | Desventajas | Úsala cuando… |
|---|---|---|---|---|---|
| **Carga completa** (*full load*) | Se copia toda la tabla y se reemplaza la anterior | Horas o un día | Simplísima, siempre correcta, detecta borrados | Lenta y cara con tablas grandes; carga la base de origen | La tabla es chica (países, productos, categorías) |
| **Incremental** | Se copian solo las filas creadas o modificadas desde la última carga | Minutos a horas | Mucho menos volumen | Necesita una columna confiable (`updated_at`); **no ve los borrados** | Tablas grandes con columna de modificación |
| **CDC** (*change data capture*) | Se lee el **registro de transacciones** de la base: cada insert, update y delete | Segundos a minutos | Ve todo, incluso los borrados, y casi no carga la base | Más piezas que operar (Debezium, Kafka, DMS, Datastream) | Tablas transaccionales grandes y críticas |
| **Streaming de eventos** | La aplicación publica cada evento en una cola (Kafka, Kinesis, Pub/Sub) | Segundos | Latencia mínima, desacopla sistemas | Hay que manejar orden, duplicados y esquemas | Clics, GPS, sensores, pagos |

:::tip La carga completa no es "de principiante"
Para tablas chicas (hasta algunos millones de filas) la carga completa es muchas veces **la mejor opción**: es simple, se recupera sola de cualquier error y detecta borrados. No compliques lo que no hace falta.
:::

## Carga incremental con marca de agua

La idea: guardar **hasta dónde llegaste** la última vez (la *marca de agua* o *watermark*) y pedir solo lo posterior.

```text
Ejecución del lunes:   SELECT * FROM pedidos WHERE updated_at >  '2024-12-01 00:00:00'   → máximo visto: '2024-12-01 23:58:10'
Ejecución del martes:  SELECT * FROM pedidos WHERE updated_at >  '2024-12-01 23:58:10'   → máximo visto: '2024-12-02 23:59:41'
```

Tres reglas para que no se pierdan filas:

1. **La marca se guarda solo si la carga terminó bien.** Si la guardas antes y la carga falla, la próxima ejecución salta esos datos para siempre.
2. **La marca es el máximo que viste en los datos**, no "la hora de ahora". Entre que lees y que terminas pueden llegar filas nuevas con un `updated_at` anterior al reloj del servidor.
3. **Deja un margen de seguridad** (*lookback*): pide desde la marca menos unos minutos, porque las transacciones que estaban abiertas pueden confirmarse con un `updated_at` levemente anterior. Esto trae algunos duplicados, que se resuelven con la regla siguiente.

### Idempotencia: poder repetir sin miedo

Una carga es **idempotente** si ejecutarla dos veces con los mismos datos deja el destino igual que ejecutarla una vez. Con el margen de seguridad vas a recibir filas repetidas, y con los reintentos, cargas repetidas. Por eso el destino no se escribe con `INSERT`, sino con un **upsert** (`MERGE`): si la fila existe, se actualiza; si no, se inserta.

Practica la lógica con datos escritos a mano. Esta consulta simula "lo que ya tengo en el destino" y "lo que llegó en la carga de hoy", y calcula cómo queda la tabla después del upsert:

```sql
WITH destino(pedido_id, estado, updated_at) AS (
    VALUES (1, 'pagado',    '2024-12-01 10:00'),
           (2, 'pagado',    '2024-12-01 11:00'),
           (3, 'pendiente', '2024-12-01 12:00')
),
llegada(pedido_id, estado, updated_at) AS (
    VALUES (2, 'enviado',   '2024-12-02 09:00'),   -- cambió
           (3, 'pendiente', '2024-12-01 12:00'),   -- repetido por el margen de seguridad
           (4, 'pagado',    '2024-12-02 10:30')    -- nuevo
),
todo AS (
    SELECT * FROM destino UNION ALL SELECT * FROM llegada
),
ultima_version AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY pedido_id ORDER BY updated_at DESC) AS rn
    FROM todo
)
SELECT pedido_id, estado, updated_at
FROM ultima_version
WHERE rn = 1
ORDER BY pedido_id;
```

El pedido 2 quedó `enviado`, el 3 no se duplicó y el 4 se agregó. Si vuelves a "cargar" la misma llegada, el resultado es idéntico: eso es idempotencia. En una base real, lo mismo se escribe con `MERGE INTO destino USING llegada ON ...`.

## CDC: leer el diario de la base de datos

Toda base transaccional escribe cada cambio en un **registro de transacciones** (el *WAL* en PostgreSQL, el *binlog* en MySQL) para poder recuperarse de una caída. El CDC lee ese registro y lo convierte en un flujo de eventos:

```diagrama
titulo: CDC con Debezium: cada cambio de la base se convierte en un evento
nodo app: App | icono=movil | col=0 | fila=0 | sub=INSERT, UPDATE, DELETE
nodo db: PostgreSQL | icono=base | col=1 | fila=0 | forma=cilindro | sub=escribe el WAL
nodo dbz: Debezium | icono=engranaje | col=2 | fila=0 | color=violeta | sub=lee el WAL
nodo k: Kafka | icono=kafka | col=3 | fila=0 | color=gris | sub=un tópico por tabla
nodo br: Bronze (cambios) | icono=bucket | col=3 | fila=1 | color=naranja | sub=todos los eventos
nodo sv: Silver (estado) | icono=tabla | col=2 | fila=1 | color=azul | sub=MERGE: última versión
flecha app -> db
flecha db -> dbz: log de transacciones
flecha dbz -> k: eventos
flecha k -> br
flecha br -> sv: aplica cambios
```

Cada evento dice **qué operación** fue, el estado **antes** y **después**, y cuándo pasó. Simplificado:

```json
{"op": "u", "antes": {"pedido_id": 2, "estado": "pagado"}, "despues": {"pedido_id": 2, "estado": "enviado"}, "ts_ms": 1733130000000}
{"op": "d", "antes": {"pedido_id": 5, "estado": "pendiente"}, "despues": null, "ts_ms": 1733130060000}
```

`op` vale `c` (create), `u` (update), `d` (delete) o `r` (lectura inicial, *snapshot*). Las herramientas más usadas: **Debezium** (open source), **AWS DMS**, **Google Datastream**, **Azure Data Factory** con CDC, **Fivetran** y **Airbyte**.

:::nota ¿Por qué el CDC no carga la base?
Porque no ejecuta consultas sobre las tablas: lee un archivo que la base escribe de todos modos. Por eso resuelve exactamente el problema de Sofía: la base deja de sufrir el export nocturno y los cambios llegan en minutos.
:::

### Los borrados: lo que la carga incremental no ve

Si un pedido de prueba se **borra** en el origen, una carga por `updated_at` nunca se entera: la fila simplemente deja de existir y no hay nada "nuevo" que traer. En el destino queda para siempre. El CDC sí trae el evento `d`. Las alternativas sin CDC son el *soft delete* (el origen marca `borrado = true` en vez de borrar) o una carga completa periódica de las claves para comparar.

## Streaming de eventos

Cuando el dato **es** un evento (un clic, una posición GPS, un pago), la aplicación lo publica directamente en una cola o *log* de mensajes. Lo verás en detalle en la lección de batch y streaming. Lo importante para la ingesta:

- **Los mensajes pueden llegar repetidos** (casi todas las colas garantizan "al menos una vez"). El destino debe deduplicar por un id de evento.
- **Pueden llegar desordenados**: el evento de las 10:01 puede llegar después del de las 10:02.
- **El esquema cambia**: un día la app agrega un campo. Un *schema registry* (registro de esquemas) controla qué cambios se permiten.

## Bronze: guarda lo que llegó, tal cual

Sea cual sea la estrategia, la regla de oro es la misma: **lo que llega se guarda primero sin transformar**, en bronze, con metadatos de la carga:

| Columna extra | Para qué |
|---|---|
| `_fecha_ingesta` | Cuándo llegó (para reprocesar un día y para medir frescura) |
| `_archivo_origen` / `_offset` | De dónde vino exactamente |
| `_id_carga` | Qué ejecución la trajo (para borrar una carga mala) |

Así, si mañana descubres un error en la limpieza, reprocesas desde bronze sin volver a molestar a la fuente.

<!-- estandar:errores -->
:::errores
- **Guardar la marca de agua antes de terminar la carga**: si la carga falla, la próxima salta esos datos y se pierden para siempre.
- **Usar la hora del servidor como marca**: las filas confirmadas un poco tarde quedan afuera. Usa el máximo visto en los datos y un margen de seguridad.
- **`INSERT` en lugar de `MERGE`**: cada reintento o margen de seguridad duplica filas.
- **Confiar en un `updated_at` que no siempre se actualiza**: muchos sistemas tienen procesos que cambian filas sin tocar esa columna. Verifica con el equipo del origen antes de basar una carga en ella.
- **Olvidar los borrados**: el dashboard sigue mostrando pedidos que ya no existen.
:::

<!-- estandar:trabajo -->
:::trabajo
- En la mayoría de las empresas no se escribe la ingesta desde cero: se usan **conectores** administrados (Fivetran, Airbyte, Data Factory, Datastream, DMS). El trabajo del data engineer es elegir la estrategia, configurar, monitorear y resolver lo que el conector no cubre.
- Antes de conectar CDC a una base de producción hay que hablar con el equipo que la administra: requiere permisos especiales y configurar la retención del log.
- Las ingestas tienen un **SLA** de frescura ("los pedidos de ayer, antes de las 6:00") y una alerta si no se cumple. Lo verás en la lección de calidad.
:::

<!-- estandar:entrevista -->
:::entrevista "¿Cómo cargarías incrementalmente una tabla de 2.000 millones de filas?"
Pregunta primero si hay una columna de modificación confiable y si hay borrados. Si hay columna y no hay borrados: incremental con marca de agua (guardada al final y con margen de seguridad) y `MERGE` en el destino para que sea idempotente. Si hay borrados o la tabla es crítica: CDC desde el log de transacciones (Debezium, DMS, Datastream). Menciona la carga inicial (un *snapshot* histórico en paralelo, por particiones), la deduplicación en silver y cómo verificarías que no se pierden filas (conteos por día contra el origen).
:::

## Ejercicios

:::ejercicio quiz
La tabla `paises` tiene 40 filas y cambia dos veces al año. ¿Qué estrategia de ingesta usas?

- [x] Carga completa: es chica, simple y detecta cualquier cambio o borrado
- [ ] CDC con Debezium y Kafka
- [ ] Streaming
- [ ] Incremental por `updated_at`
:::

:::ejercicio quiz
Una carga incremental guarda la marca de agua **al empezar**, y a mitad de la carga se cae la red. ¿Qué pasa en la próxima ejecución?

- [ ] Nada, retoma donde quedó
- [x] Pide datos desde la marca nueva y las filas que no llegaron a cargarse se pierden para siempre
- [ ] Duplica todo
- [ ] Carga la tabla completa
:::

:::ejercicio sql titulo="Upsert idempotente" ordenado
Simula un upsert. En `destino` está lo que ya cargaste y en `llegada` lo de hoy, con un repetido y una versión **más vieja** del cliente 10 (llegó tarde). Devuelve el estado final: una fila por `cliente_id` con su versión de `updated_at` más reciente. Columnas: `cliente_id`, `email`, `updated_at`, ordenado por `cliente_id`.
```sql inicial
WITH destino(cliente_id, email, updated_at) AS (
    VALUES (10, 'ana@nuevo.com',  '2024-12-05'),
           (11, 'luis@correo.com', '2024-11-20')
),
llegada(cliente_id, email, updated_at) AS (
    VALUES (10, 'ana@viejo.com',   '2024-12-01'),
           (11, 'luis@correo.com', '2024-11-20'),
           (12, 'eva@correo.com',  '2024-12-06')
)
SELECT ...
```
```sql solucion
WITH destino(cliente_id, email, updated_at) AS (
    VALUES (10, 'ana@nuevo.com',  '2024-12-05'),
           (11, 'luis@correo.com', '2024-11-20')
),
llegada(cliente_id, email, updated_at) AS (
    VALUES (10, 'ana@viejo.com',   '2024-12-01'),
           (11, 'luis@correo.com', '2024-11-20'),
           (12, 'eva@correo.com',  '2024-12-06')
),
todo AS (SELECT * FROM destino UNION ALL SELECT * FROM llegada),
rankeado AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY updated_at DESC) AS rn
    FROM todo
)
SELECT cliente_id, email, updated_at FROM rankeado WHERE rn = 1 ORDER BY cliente_id
```
```pista
Junta las dos tablas con `UNION ALL` y quédate con la fila de `updated_at` más reciente de cada cliente usando `ROW_NUMBER()`. Fíjate que la versión vieja de Ana **no** debe pisar a la nueva.
```
:::

:::ejercicio python titulo="Aplicar eventos CDC"
Escribe `aplicar_cdc(estado, eventos)`. `estado` es un diccionario `{id: fila}` con la tabla actual. Cada evento es un diccionario con `op` (`"c"`, `"u"` o `"d"`), `id` y `despues` (la fila nueva, o `None` en un borrado). Aplica los eventos **en orden** y devuelve el estado final. Un `"u"` sobre un id que no existe debe insertarlo (puede pasar si se perdió el `"c"`), y un `"d"` sobre un id inexistente no debe fallar.
```python inicial
def aplicar_cdc(estado, eventos):
    resultado = dict(estado)   # no modifiques el original
    # tu código aquí
    return resultado
```
```python solucion
def aplicar_cdc(estado, eventos):
    resultado = dict(estado)
    for ev in eventos:
        if ev["op"] in ("c", "u"):
            resultado[ev["id"]] = ev["despues"]
        elif ev["op"] == "d":
            resultado.pop(ev["id"], None)
    return resultado
```
```python test
inicial = {1: {"estado": "pagado"}, 2: {"estado": "pagado"}}
eventos = [
    {"op": "u", "id": 2, "despues": {"estado": "enviado"}},
    {"op": "c", "id": 3, "despues": {"estado": "pendiente"}},
    {"op": "d", "id": 1, "despues": None},
    {"op": "u", "id": 7, "despues": {"estado": "pagado"}},
    {"op": "d", "id": 99, "despues": None},
]
r = aplicar_cdc(inicial, eventos)
assert r == {2: {"estado": "enviado"}, 3: {"estado": "pendiente"}, 7: {"estado": "pagado"}}, f"Resultado: {r}"
assert inicial == {1: {"estado": "pagado"}, 2: {"estado": "pagado"}}, "No modifiques el diccionario original"
assert aplicar_cdc({}, []) == {}
```
:::

:::ejercicio python titulo="Marca de agua segura"
Escribe `cargar_incremental(filas, marca, margen_min=5)`. `filas` es una lista de diccionarios con `id` y `updated_at` (texto `"YYYY-MM-DD HH:MM"`), y `marca` es el texto de la última marca guardada. Devuelve una tupla `(seleccionadas, nueva_marca)`: las filas con `updated_at` **mayor o igual** a la marca menos `margen_min` minutos, y la nueva marca = el máximo `updated_at` de las seleccionadas (o la misma marca si no hay ninguna).
```python inicial
from datetime import datetime, timedelta

def cargar_incremental(filas, marca, margen_min=5):
    ...
```
```python solucion
from datetime import datetime, timedelta

def cargar_incremental(filas, marca, margen_min=5):
    fmt = "%Y-%m-%d %H:%M"
    desde = datetime.strptime(marca, fmt) - timedelta(minutes=margen_min)
    sel = [f for f in filas if datetime.strptime(f["updated_at"], fmt) >= desde]
    nueva = max((f["updated_at"] for f in sel), default=marca)
    return sel, nueva
```
```python test
filas = [
    {"id": 1, "updated_at": "2024-12-01 09:00"},
    {"id": 2, "updated_at": "2024-12-01 09:57"},
    {"id": 3, "updated_at": "2024-12-01 10:20"},
]
sel, marca = cargar_incremental(filas, "2024-12-01 10:00")
assert [f["id"] for f in sel] == [2, 3], f"Deberían entrar el 2 (dentro del margen) y el 3: {sel}"
assert marca == "2024-12-01 10:20"
sel, marca = cargar_incremental(filas, "2024-12-01 11:00")
assert sel == [] and marca == "2024-12-01 11:00", "Sin filas nuevas, la marca no cambia"
```
:::
