---
titulo: Python para ingeniería de datos
nivel: Avanzado
duracion: 40
resumen: Un mini-pipeline ETL en Python puro, limpieza, validación, APIs y una introducción a pandas.
---

Ya tienes todas las piezas. Ahora vamos a usarlas como lo hace un ingeniero de datos: **extraer, limpiar, transformar, validar y cargar**.

## Un mini ETL en Python puro

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

:::tip Principios que verás en todo el curso
- **Funciones pequeñas** con una responsabilidad (extraer, limpiar, transformar…): fáciles de probar.
- **Nunca confíes en los datos de entrada**: valida tipos, rangos y duplicados.
- **Cuenta lo que descartas**: si de golpe se rechaza el 40% de las filas, algo cambió en el origen.
- **Idempotencia**: ejecutar el pipeline dos veces con la misma entrada debe dar el mismo resultado.
:::

## Consumir una API (para tu computadora)

En tu máquina usarás la librería `requests` (`pip install requests`). Aquí no hay red, pero así se ve:

```python norun
import requests

resp = requests.get("https://api.ejemplo.com/pedidos", params={"desde": "2024-03-01"}, timeout=30)
resp.raise_for_status()               # lanza error si el código HTTP no es 2xx
datos = resp.json()                   # dict / list de Python
for pedido in datos["resultados"]:
    ...
```

Buenas prácticas con APIs: **timeouts**, **reintentos con espera exponencial**, respetar el **rate limit**, **paginar** (`?page=2`), y guardar la respuesta cruda antes de transformarla.

## pandas: el Excel de los programadores

**pandas** es la librería más usada para analizar datos que caben en la memoria de una computadora (hasta unos pocos GB). Su objeto central es el `DataFrame`. Muchas ideas son idénticas a SQL y a PySpark:

```python norun
import pandas as pd

df = pd.read_csv("pedidos.csv", parse_dates=["fecha"])
df.head()                                   # primeras filas
df.info()                                   # columnas y tipos
df = df.dropna(subset=["monto"])            # quitar nulos
df["anio"] = df["fecha"].dt.year            # nueva columna
resumen = (df[df["estado"] != "cancelado"]  # WHERE
             .groupby(["anio", "pais"])     # GROUP BY
             .agg(ventas=("monto", "sum"), pedidos=("pedido_id", "count"))
             .reset_index()
             .sort_values("ventas", ascending=False))
resumen.to_parquet("resumen.parquet")
```

| SQL | pandas | PySpark |
|---|---|---|
| `SELECT a, b` | `df[["a", "b"]]` | `df.select("a", "b")` |
| `WHERE x > 5` | `df[df["x"] > 5]` | `df.filter(F.col("x") > 5)` |
| `GROUP BY` + `SUM` | `df.groupby("a")["x"].sum()` | `df.groupBy("a").agg(F.sum("x"))` |
| `JOIN` | `df.merge(otro, on="id")` | `df.join(otro, "id")` |
| `ORDER BY` | `df.sort_values("x")` | `df.orderBy("x")` |

:::nota ¿pandas o Spark?
Si los datos entran en la memoria de una máquina (digamos, menos de unos GB), pandas (o Polars, o DuckDB) es más simple y rápido. Cuando son decenas de GB o más, o crecen sin parar, necesitas un motor distribuido como **Spark**.
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
