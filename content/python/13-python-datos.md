---
titulo: Python para ingeniería de datos
nivel: Avanzado
duracion: 60
resumen: Un mini-pipeline ETL en Python puro, limpieza, validación, APIs y una introducción a pandas.
objetivos: Construir un pipeline ETL en Python con funciones pequeñas: extraer, limpiar, deduplicar, agregar | Separar las filas inválidas con su motivo en lugar de descartarlas en silencio | Describir cómo extraer datos de una API con timeouts, reintentos y paginación | Limpiar y agregar datos con pandas y traducir entre SQL, pandas y PySpark
prerrequisitos: python-archivos-modulos | python-errores
autoevaluacion: ¿Puedes escribir una función que limpie un registro y devuelva `None` si es inválido? | ¿Sabes por qué conviene guardar las filas rechazadas con su motivo? | ¿Puedes explicar por qué una extracción de una API necesita timeout, reintentos y paginación? | ¿Puedes agrupar y sumar con pandas usando `groupby(...).agg(...)`? | ¿Sabes cuándo usar pandas y cuándo Spark?
---

<!-- estandar:escenario -->
:::escenario El primer pipeline de verdad
Martín te asigna tu primer pipeline completo:

> "El sistema de pedidos viejo nos manda un CSV cada noche. Hay que limpiarlo, sacar duplicados, rechazar lo inválido (pero guardarlo, que operaciones lo quiere revisar) y calcular las ventas por país. Hazlo en Python, con funciones chicas y probadas."

Esta lección junta todo lo que aprendiste de Python en un pipeline real, y te presenta pandas, la herramienta para analizar datos que entran en una computadora.
:::
Ya tienes todas las piezas de Python: tipos, colecciones, funciones, errores y archivos. Ahora vamos a usarlas como lo hace un ingeniero de datos: **extraer, limpiar, transformar, validar y cargar**. Esta lección arma un pipeline completo en Python puro, explica cómo se consume una API de verdad y termina con **pandas**, la librería que vas a usar cuando los datos entran en una computadora.

## Un mini ETL en Python puro

Este es un archivo de pedidos tal como podría llegar de un sistema viejo. Míralo con ojo de data engineer antes de leer el código: ¿qué problemas ves?

```text
pedido_id,fecha,cliente,pais,monto
1,2024-03-01,  ana ,chile,120.50
2,2024-03-01,LUIS,Perú,80
3,2024-03-02,Eva,Chile,              ← monto vacío
4,2024-03-02,ana,Chile,99.90
4,2024-03-02,ana,Chile,99.90         ← pedido duplicado
5,2024-13-02,Tom,México,40           ← mes 13: fecha imposible
```

Hay espacios y mayúsculas mezcladas, un monto vacío, un duplicado y una fecha inválida. Es un archivo **normal**: así llegan los datos casi siempre. El pipeline tiene que limpiarlo sin perder información en silencio.

```python
import csv, io, json
from datetime import date
from collections import defaultdict

CRUDO = """pedido_id,fecha,cliente,pais,monto
1,2024-03-01,  ana ,chile,120.50
2,2024-03-01,LUIS,Perú,80
3,2024-03-02,Eva,Chile,
4,2024-03-02,ana,Chile,99.90
4,2024-03-02,ana,Chile,99.90
5,2024-13-02,Tom,México,40
"""

def extraer(texto):
    return list(csv.DictReader(io.StringIO(texto)))

def limpiar(fila):
    """Normaliza tipos y formatos. Devuelve None si la fila es inválida."""
    try:
        return {
            "pedido_id": int(fila["pedido_id"]),
            "fecha": date.fromisoformat(fila["fecha"]),
            "cliente": fila["cliente"].strip().title(),
            "pais": fila["pais"].strip().title(),
            "monto": float(fila["monto"]),
        }
    except (ValueError, KeyError):
        return None

def transformar(filas):
    vistos, limpias, rechazadas = set(), [], 0
    for f in filas:
        l = limpiar(f)
        if l is None:
            rechazadas += 1
            continue
        if l["pedido_id"] in vistos:          # deduplicar
            continue
        vistos.add(l["pedido_id"])
        limpias.append(l)
    return limpias, rechazadas

def agregar(filas):
    por_pais = defaultdict(float)
    for f in filas:
        por_pais[f["pais"]] += f["monto"]
    return {k: round(v, 2) for k, v in sorted(por_pais.items())}

filas, rechazadas = transformar(extraer(CRUDO))
print(f"{len(filas)} filas válidas, {rechazadas} rechazadas")
print(json.dumps(agregar(filas), ensure_ascii=False))
```

Recórrelo función por función:

1. **`extraer`** convierte el texto en una lista de diccionarios con `csv.DictReader`, uno por fila, con los nombres de columna como claves. Todos los valores son **texto**: `"120.50"`, no `120.5`. En la vida real, aquí leerías un archivo, una base o una API.
2. **`limpiar`** recibe **una** fila y devuelve una fila limpia o `None`:
   - `int(...)`, `date.fromisoformat(...)` y `float(...)` convierten los textos a sus tipos. Si un valor no se puede convertir (el monto vacío, el mes 13), Python lanza `ValueError`.
   - `.strip().title()` quita los espacios y deja la primera letra en mayúscula: `"  ana "` → `"Ana"`, `"chile"` → `"Chile"`.
   - El `try/except` atrapa ese error y devuelve `None`: la fila se **rechaza** en lugar de romper todo el pipeline.
3. **`transformar`** recorre las filas, cuenta las rechazadas y **deduplica** con un `set` de ids ya vistos: la segunda aparición del pedido 4 se descarta.
4. **`agregar`** suma los montos por país con un `defaultdict(float)` (un diccionario que empieza en 0 para cada clave nueva) y redondea a 2 decimales.

El resultado: 3 filas válidas (los pedidos 1, 2 y 4), 2 rechazadas (el monto vacío del pedido 3 y la fecha imposible del 5) y el duplicado del pedido 4 eliminado sin contarlo como rechazo. Ejecútalo y comprueba que los totales por país coinciden con lo que calcularías a mano.

:::tip Principios que verás en todo el curso
- **Funciones pequeñas** con una responsabilidad (extraer, limpiar, transformar…): fáciles de probar y de reutilizar.
- **Nunca confíes en los datos de entrada**: valida tipos, rangos y duplicados.
- **Cuenta lo que descartas**: si de golpe se rechaza el 40 % de las filas, algo cambió en el origen.
- **Idempotencia**: ejecutar el pipeline dos veces con la misma entrada debe dar el mismo resultado.
:::

### Del ejercicio al trabajo real: no tirar los rechazos

En el ejemplo, las filas inválidas solo se cuentan. En producción se **guardan aparte**, con el motivo, en una tabla de "cuarentena". Así alguien puede revisarlas, corregir el origen y reprocesarlas. Una versión mejorada de `limpiar` devuelve el motivo:

```python
from datetime import date

def validar(fila):
    """Devuelve (fila_limpia, None) o (None, motivo)."""
    if not fila.get("monto", "").strip():
        return None, "monto vacío"
    try:
        fecha = date.fromisoformat(fila["fecha"])
    except ValueError:
        return None, f"fecha inválida: {fila['fecha']}"
    return {"pedido_id": int(fila["pedido_id"]), "fecha": fecha, "monto": float(fila["monto"])}, None

filas = [
    {"pedido_id": "3", "fecha": "2024-03-02", "monto": ""},
    {"pedido_id": "5", "fecha": "2024-13-02", "monto": "40"},
    {"pedido_id": "6", "fecha": "2024-03-03", "monto": "15.5"},
]
validas, cuarentena = [], []
for f in filas:
    ok, motivo = validar(f)
    if ok:
        validas.append(ok)
    else:
        cuarentena.append({**f, "motivo": motivo})

print("Válidas:", validas)
print("Cuarentena:", cuarentena)
```

`{**f, "motivo": motivo}` crea un diccionario nuevo con todo lo que tenía `f` más la clave `motivo`. Es una forma muy común de "agregar una columna" a un registro.

## Consumir una API (para tu computadora)

Muchos datos no llegan en archivos: se piden a una **API**, un servicio web que responde en JSON. En tu máquina usarás la librería `requests` (`pip install requests`). Aquí no hay red, pero así se ve una extracción profesional:

```python norun
import time
import requests

def traer_pedidos(desde, token):
    url = "https://api.ejemplo.com/v1/pedidos"
    headers = {"Authorization": f"Bearer {token}"}      # el token llega de una variable de entorno, nunca escrito aquí
    pagina, todos = 1, []
    while True:
        for intento in range(4):                         # reintentos con espera exponencial
            resp = requests.get(url, headers=headers, params={"desde": desde, "page": pagina}, timeout=30)
            if resp.status_code == 429 or resp.status_code >= 500:
                time.sleep(2 ** intento)                 # 1, 2, 4, 8 segundos
                continue
            resp.raise_for_status()                      # error claro si es 401, 404…
            break
        datos = resp.json()
        todos.extend(datos["resultados"])
        if not datos.get("siguiente"):                   # no hay más páginas
            return todos
        pagina += 1
```

Qué hace cada parte y por qué:

| Práctica | Por qué |
|---|---|
| `timeout=30` | Sin timeout, si el servidor no responde, tu pipeline queda colgado para siempre |
| Reintentos ante `429` y `5xx` | `429` = "demasiadas solicitudes" (*rate limit*); `5xx` = error pasajero del servidor. Vale la pena reintentar |
| Espera exponencial (`2 ** intento`) | Darle al servidor cada vez más tiempo para recuperarse, en vez de bombardearlo |
| `raise_for_status()` | Un `401` (token inválido) o `404` no se arregla reintentando: hay que fallar con un error claro |
| Paginación | Las APIs devuelven los datos de a 100 o 1.000 registros: hay que pedir página por página |
| Token en variable de entorno | Los secretos nunca van en el código, que está en Git |

Y una regla más: **guarda la respuesta cruda** (el JSON tal cual) en el lake antes de transformarla. Si mañana descubres un error en la transformación, reprocesas sin volver a llamar a la API, que quizá ya no tenga esos datos.

## pandas: el Excel de los programadores

**pandas** es la librería más usada para analizar datos que caben en la memoria de una computadora (hasta unos pocos GB). Su objeto central es el **DataFrame**: una tabla con columnas con nombre y tipo, como una tabla de SQL o una hoja de Excel.

En este sitio pandas funciona de verdad (la primera vez tarda unos segundos en cargar). Este ejemplo hace el mismo ETL de arriba, pero con pandas:

```python
import io
import pandas as pd

CRUDO = """pedido_id,fecha,cliente,pais,monto,estado
1,2024-03-01,  ana ,chile,120.50,entregado
2,2024-03-01,LUIS,Perú,80,entregado
3,2024-03-02,Eva,Chile,,cancelado
4,2024-03-02,ana,Chile,99.90,entregado
4,2024-03-02,ana,Chile,99.90,entregado
5,2024-03-05,Tom,México,40,entregado
"""

df = pd.read_csv(io.StringIO(CRUDO))
print(df.dtypes, "\n")                                   # qué tipo adivinó pandas para cada columna

df["cliente"] = df["cliente"].str.strip().str.title()   # limpiar textos en toda la columna
df["pais"] = df["pais"].str.strip().str.title()
df["fecha"] = pd.to_datetime(df["fecha"])
df = df.drop_duplicates(subset="pedido_id")             # deduplicar
df = df.dropna(subset=["monto"])                        # quitar montos vacíos

resumen = (df[df["estado"] != "cancelado"]              # WHERE
             .groupby("pais", as_index=False)           # GROUP BY
             .agg(ventas=("monto", "sum"), pedidos=("pedido_id", "count"))
             .sort_values("ventas", ascending=False))   # ORDER BY
print(resumen.to_string(index=False))
```

Fíjate en la diferencia con Python puro: no hay bucles. `df["cliente"].str.strip()` aplica la operación a **toda la columna** de una vez. Esto se llama **operación vectorizada**: es más corto de escribir y, con millones de filas, mucho más rápido que un `for`.

Lo que hace cada paso:

- `pd.read_csv(...)` lee el CSV y **adivina los tipos**: `monto` queda como número decimal y el vacío se convierte en `NaN` (el "nulo" de pandas).
- `.str.strip().str.title()`: los métodos de texto de Python, aplicados columna entera a través de `.str`.
- `drop_duplicates(subset="pedido_id")` deja la primera aparición de cada pedido.
- `dropna(subset=["monto"])` elimina las filas sin monto.
- `df[df["estado"] != "cancelado"]` filtra: la condición devuelve una columna de `True`/`False`, y `df[...]` se queda con las filas `True`.
- `groupby(...).agg(ventas=("monto", "sum"), ...)` agrupa y calcula varias métricas con nombre, igual que `SUM(monto) AS ventas`.

Las mismas operaciones en SQL, pandas y PySpark se parecen mucho. Si sabes una, las otras se aprenden rápido:

| SQL | pandas | PySpark |
|---|---|---|
| `SELECT a, b` | `df[["a", "b"]]` | `df.select("a", "b")` |
| `WHERE x > 5` | `df[df["x"] > 5]` | `df.filter(F.col("x") > 5)` |
| `GROUP BY` + `SUM` | `df.groupby("a")["x"].sum()` | `df.groupBy("a").agg(F.sum("x"))` |
| `JOIN` | `df.merge(otro, on="id")` | `df.join(otro, "id")` |
| `ORDER BY` | `df.sort_values("x")` | `df.orderBy("x")` |
| `COUNT(DISTINCT a)` | `df["a"].nunique()` | `F.countDistinct("a")` |
| Quitar duplicados | `df.drop_duplicates()` | `df.dropDuplicates()` |

Para guardar el resultado en tu computadora: `resumen.to_parquet("resumen.parquet")` (necesita `pip install pyarrow`) o `resumen.to_csv("resumen.csv", index=False)`.

:::nota ¿pandas, Polars, DuckDB o Spark?
- **pandas**: el estándar para datos que entran en memoria. Enorme comunidad y documentación.
- **Polars**: una alternativa moderna, mucho más rápida y con mejor manejo de memoria. Cada vez más usada en pipelines.
- **DuckDB**: SQL sobre archivos (CSV, Parquet) en tu computadora, muy rápido. Ideal para explorar.
- **Spark**: cuando los datos son decenas de GB o más, o crecen sin parar, y necesitas repartir el trabajo entre muchas máquinas.

La regla práctica: empieza por lo más simple que alcance. Usar Spark para 50 MB es como contratar un camión para llevar una carta.
:::

<!-- estandar:errores -->
:::errores
- **Rechazar sin contar ni guardar**: si un día el 40 % de las filas son inválidas y nadie lo sabe, el dashboard muestra ventas que bajaron "de golpe".
- **Deduplicar por la fila completa**: dos registros del mismo pedido con distinta hora de carga no son idénticos, pero son el mismo pedido. Deduplica por la **clave** (`pedido_id`) y decide cuál versión conservar.
- **pandas con datos enormes**: pandas carga todo en memoria y suele necesitar de 5 a 10 veces el tamaño del archivo en RAM. Con un CSV de 5 GB, tu computadora no alcanza.
- **`SettingWithCopyWarning` en pandas**: modificaste una "vista" de un DataFrame filtrado. Usa `.copy()` después de filtrar si vas a modificar el resultado.
:::

<!-- estandar:trabajo -->
:::trabajo
- Los pipelines en Python puro siguen existiendo para fuentes chicas: APIs, archivos de proveedores, planillas. En cuanto el volumen crece, la misma lógica se lleva a PySpark o a SQL con dbt.
- La "cuarentena" de filas inválidas es una práctica estándar: una tabla con la fila original, el motivo y la fecha. Operaciones la revisa, corrige el origen y se reprocesa.
:::

<!-- estandar:entrevista -->
:::entrevista "¿Cómo diseñarías la extracción diaria de una API paginada con límite de solicitudes?"
Menciona: autenticación con un token desde un gestor de secretos; extracción incremental (pedir solo lo nuevo desde la última fecha cargada); paginación hasta que no haya más resultados; reintentos con espera exponencial ante `429` y `5xx`; timeout en cada llamada; guardar la respuesta cruda en el lake antes de transformar; y que todo sea idempotente, para poder volver a correr un día sin duplicar.
:::

## Ejercicios

:::ejercicio python
Completa la función `limpiar_cliente(fila)` que recibe un diccionario con textos crudos y devuelve uno limpio: `nombre` con `strip()` y `title()`, `email` con `strip()` y `lower()` (o `None` si queda vacío), y `edad` como `int` (o `None` si no es un número).
```python inicial
def limpiar_cliente(fila):
    pass
```
```python solucion
def limpiar_cliente(fila):
    email = (fila.get("email") or "").strip().lower()
    try:
        edad = int(fila.get("edad"))
    except (TypeError, ValueError):
        edad = None
    return {
        "nombre": (fila.get("nombre") or "").strip().title(),
        "email": email or None,
        "edad": edad,
    }
```
```python test
assert limpiar_cliente({"nombre": "  ana PÉREZ ", "email": " Ana@MAIL.com ", "edad": "34"}) == {"nombre": "Ana Pérez", "email": "ana@mail.com", "edad": 34}
assert limpiar_cliente({"nombre": "luis", "email": "   ", "edad": "N/A"}) == {"nombre": "Luis", "email": None, "edad": None}
```
:::

:::ejercicio python
Deduplica `eventos` quedándote, para cada `id`, con el evento de **mayor `version`**. Guarda en `ultimos` la lista resultante **ordenada por `id`**.
```python inicial
eventos = [
    {"id": 1, "version": 1, "estado": "creado"},
    {"id": 2, "version": 1, "estado": "creado"},
    {"id": 1, "version": 3, "estado": "enviado"},
    {"id": 1, "version": 2, "estado": "pagado"},
    {"id": 2, "version": 2, "estado": "cancelado"},
    {"id": 3, "version": 1, "estado": "creado"},
]
```
```python solucion
eventos = [
    {"id": 1, "version": 1, "estado": "creado"},
    {"id": 2, "version": 1, "estado": "creado"},
    {"id": 1, "version": 3, "estado": "enviado"},
    {"id": 1, "version": 2, "estado": "pagado"},
    {"id": 2, "version": 2, "estado": "cancelado"},
    {"id": 3, "version": 1, "estado": "creado"},
]
mejor = {}
for e in eventos:
    if e["id"] not in mejor or e["version"] > mejor[e["id"]]["version"]:
        mejor[e["id"]] = e
ultimos = sorted(mejor.values(), key=lambda e: e["id"])
```
```python test
assert [(e["id"], e["estado"]) for e in ultimos] == [(1, "enviado"), (2, "cancelado"), (3, "creado")], f"ultimos = {ultimos}"
```
```pista
Es el mismo patrón que `ROW_NUMBER() OVER (PARTITION BY id ORDER BY version DESC) = 1` en SQL, pero con un diccionario.
```
:::

:::ejercicio python
Escribe `validar_lote(filas)` que devuelva un diccionario de **reglas de calidad** con la cantidad de filas que **fallan** cada regla: `"id_nulo"` (id es None), `"id_duplicado"` (cuántas filas repiten un id ya visto, sin contar la primera), `"monto_negativo"` (monto < 0).
```python inicial
def validar_lote(filas):
    pass

lote = [
    {"id": 1, "monto": 10}, {"id": 2, "monto": -5}, {"id": None, "monto": 3},
    {"id": 2, "monto": 7}, {"id": 3, "monto": 0}, {"id": 2, "monto": 1},
]
```
```python solucion
def validar_lote(filas):
    resultado = {"id_nulo": 0, "id_duplicado": 0, "monto_negativo": 0}
    vistos = set()
    for f in filas:
        if f["id"] is None:
            resultado["id_nulo"] += 1
        elif f["id"] in vistos:
            resultado["id_duplicado"] += 1
        else:
            vistos.add(f["id"])
        if f["monto"] < 0:
            resultado["monto_negativo"] += 1
    return resultado

lote = [
    {"id": 1, "monto": 10}, {"id": 2, "monto": -5}, {"id": None, "monto": 3},
    {"id": 2, "monto": 7}, {"id": 3, "monto": 0}, {"id": 2, "monto": 1},
]
```
```python test
assert validar_lote(lote) == {"id_nulo": 1, "id_duplicado": 2, "monto_negativo": 1}, f"validar_lote(lote) = {validar_lote(lote)}"
assert validar_lote([]) == {"id_nulo": 0, "id_duplicado": 0, "monto_negativo": 0}
```
:::
