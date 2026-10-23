---
titulo: Módulos, archivos, CSV, JSON y fechas
nivel: Intermedio
duracion: 45
resumen: import, la biblioteca estándar, leer y escribir archivos, csv, json, datetime, collections y pathlib.
---

## Más allá de un solo archivo de código

Hasta ahora todo tu código vivía en un solo lugar y los datos estaban escritos dentro del programa. En el trabajo real, los datos vienen de **archivos** (CSV, JSON, logs), y el código se organiza en **módulos** que se reutilizan. Además, Python trae una enorme **biblioteca estándar** con herramientas listas para usar. Esta lección cubre esas tres cosas: importar, leer y escribir archivos, y las herramientas más útiles para datos.

## Importar módulos

Un **módulo** es un archivo `.py` con funciones, clases o variables que puedes usar desde otro programa. Para usarlo, lo **importas**:

```python
import math
from datetime import date, timedelta
from collections import Counter, defaultdict
import json, csv, random as rnd

print(math.sqrt(16), math.pi)
print(date(2024, 12, 31) - timedelta(days=7))
print(Counter("abracadabra").most_common(2))
```

| Forma | Cómo se usa después | Cuándo |
|---|---|---|
| `import math` | `math.sqrt(16)` | Deja claro de dónde viene cada cosa (recomendado) |
| `from datetime import date` | `date(2024, 1, 1)` | Cuando usas mucho una o dos cosas |
| `import pandas as pd` | `pd.read_csv(…)` | Un alias corto (convenciones: `pd`, `np`, `F` para `pyspark.sql.functions`) |
| `from modulo import *` | Todo, sin prefijo | **Evítalo**: no se sabe de dónde viene cada nombre |

Hay tres tipos de módulos:

1. **Biblioteca estándar**: viene con Python ("baterías incluidas"): `math`, `datetime`, `json`, `csv`, `pathlib`, `collections`, `os`, `re`…
2. **Paquetes externos**: los instala la comunidad con `pip install pandas` (lo verás en buenas prácticas): `pandas`, `requests`, `pyspark`, `boto3`…
3. **Tus propios módulos**: si tienes `limpieza.py` con una función `limpiar_email`, desde otro archivo de la misma carpeta haces `from limpieza import limpiar_email`.

## Leer y escribir archivos de texto

```python
# Escribir: modo "w" crea o SOBRESCRIBE; modo "a" agrega al final
with open("notas.txt", "w", encoding="utf-8") as f:
    f.write("línea 1\n")
    f.write("línea 2\n")

# Leer línea por línea
with open("notas.txt", encoding="utf-8") as f:
    for linea in f:
        print(linea.strip())     # strip quita el salto de línea "\n" del final
```

| Modo | Significa |
|---|---|
| `"r"` (por defecto) | Leer. Error si no existe |
| `"w"` | Escribir. **Borra** el contenido anterior |
| `"a"` | Agregar al final (*append*). Ideal para logs |
| `"rb"` / `"wb"` | Binario (imágenes, Parquet, archivos comprimidos) |

:::tip Siempre usa with y encoding
- `with open(...) as f:` **cierra el archivo automáticamente** al salir del bloque, aunque ocurra un error. Un archivo que queda abierto puede no guardarse completo o bloquearse.
- `encoding="utf-8"` evita los famosos caracteres raros (`Ã±` en vez de `ñ`). Los archivos que vienen de Excel en Windows a veces usan `"latin-1"` o `"utf-8-sig"`: si ves caracteres raros, prueba esos.
:::

Leer un archivo **línea por línea** (`for linea in f`) no carga todo en memoria: puedes procesar archivos de varios gigabytes. `f.read()` lee todo de una vez (cómodo para archivos chicos).

## CSV: el formato más común

Un **CSV** (*comma-separated values*) es texto donde cada línea es una fila y las columnas se separan con comas. Parece fácil de leer con `split(",")`, pero **no lo es**: un nombre como `"Pérez, Ana"` tiene una coma adentro (va entre comillas) y `split` lo rompería. El módulo `csv` maneja esos casos:

```python
import csv

filas = [
    {"producto": "Mouse", "unidades": 3, "precio": 25.5},
    {"producto": "Teclado, inalámbrico", "unidades": 1, "precio": 49.9},
]
with open("ventas.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["producto", "unidades", "precio"])
    w.writeheader()          # la fila de encabezados
    w.writerows(filas)

with open("ventas.csv", encoding="utf-8") as f:
    total = 0
    for fila in csv.DictReader(f):
        print(fila)                                          # cada fila es un diccionario
        total += int(fila["unidades"]) * float(fila["precio"])   # ¡convertir tipos!
    print("Total:", total)
```

- `csv.DictReader` usa la primera línea como encabezado y devuelve cada fila como un **diccionario** `{"producto": "Mouse", …}`.
- **Todo llega como texto**: `"3"`, no `3`. Hay que convertir con `int()` y `float()`, y prepararse para valores vacíos o inválidos (lección de errores).
- `newline=""` al escribir evita líneas en blanco de más en Windows.
- Para otro separador (muy común en países que usan coma decimal): `csv.DictReader(f, delimiter=";")`.

## JSON: el formato de las APIs

**JSON** representa diccionarios, listas, textos, números, `true/false` y `null`. Es el formato de casi todas las APIs y de muchos eventos. El módulo `json` convierte en ambas direcciones:

```python
import json

pedido = {"id": 1, "cliente": "Eva", "items": [{"sku": "A1", "cant": 2}], "pagado": True, "cupon": None}
texto = json.dumps(pedido, ensure_ascii=False, indent=2)   # dict -> texto JSON (dump String)
print(texto)
de_vuelta = json.loads(texto)                              # texto JSON -> dict (load String)
print(de_vuelta["items"][0]["sku"])
```

| Función | Convierte | Con archivos |
|---|---|---|
| `json.dumps(obj)` | objeto Python → texto | `json.dump(obj, f)` |
| `json.loads(texto)` | texto → objeto Python | `json.load(f)` |

Fíjate cómo `True` se escribe `true` y `None` se escribe `null` en JSON. `ensure_ascii=False` conserva las tildes; `indent=2` lo hace legible para humanos.

:::nota JSON Lines
En datos se usa mucho **JSON Lines** (`.jsonl`): un objeto JSON **por línea**. Se lee línea por línea con `json.loads(linea)`, sin cargar todo el archivo, y es fácil de dividir entre muchas máquinas. Spark lo lee directamente.
:::

## Fechas con datetime

```python
from datetime import datetime, date, timedelta

f = datetime.strptime("2024-03-15 14:30", "%Y-%m-%d %H:%M")   # texto -> fecha (string parse time)
print(f.year, f.month, f.strftime("%d/%m/%Y"))                 # fecha -> texto (string format time)
print(f + timedelta(days=30))                                  # sumar tiempo
print((date(2024, 12, 25) - date(2024, 3, 15)).days)          # restar fechas → timedelta → .days
print(date(2024, 3, 15).isoformat(), date.fromisoformat("2024-03-15").weekday())  # 0 = lunes
```

| Necesitas | Herramienta |
|---|---|
| Texto → fecha | `datetime.strptime(texto, formato)` o `date.fromisoformat("2024-03-15")` |
| Fecha → texto | `fecha.strftime("%d/%m/%Y")` o `fecha.isoformat()` |
| Sumar/restar tiempo | `fecha + timedelta(days=7, hours=3)` |
| Diferencia entre fechas | `(b - a).days` |
| Día de la semana | `fecha.weekday()` (0 = lunes … 6 = domingo) |

Los códigos de formato (`%Y`, `%m`, `%d`, `%H`, `%M`) son los mismos que viste en `strftime` de SQLite.

## collections: estructuras extra

```python
from collections import Counter, defaultdict

canales = ["web", "app", "web", "tienda", "web"]
print(Counter(canales))                        # contar en una línea: {'web': 3, 'app': 1, 'tienda': 1}
print(Counter(canales).most_common(1))         # el más frecuente

por_pais = defaultdict(list)                   # diccionario que crea una lista vacía si la clave no existe
for nombre, pais in [("Ana", "Chile"), ("Luis", "Perú"), ("Eva", "Chile")]:
    por_pais[pais].append(nombre)
print(dict(por_pais))                          # {'Chile': ['Ana', 'Eva'], 'Perú': ['Luis']}
```

`Counter` y `defaultdict` son atajos del patrón "contar y agrupar" que hiciste a mano con `.get(k, 0)`.

## pathlib: rutas de archivos sin dolor

Las rutas se escriben distinto en Windows (`datos\crudos`) y en Linux/Mac (`datos/crudos`). `pathlib` las maneja como objetos y funciona igual en todos lados:

```python
from pathlib import Path

carpeta = Path("datos") / "crudos"                      # el operador / une partes de la ruta
carpeta.mkdir(parents=True, exist_ok=True)              # crea la carpeta (y las intermedias) si no existe
(carpeta / "a.txt").write_text("hola", encoding="utf-8")
(carpeta / "b.txt").write_text("chau", encoding="utf-8")
print([p.name for p in carpeta.glob("*.txt")])          # listar archivos que coinciden con un patrón
print((carpeta / "a.txt").exists(), (carpeta / "a.txt").suffix)
```

Es la forma moderna de trabajar con archivos y carpetas: procesar todos los CSV de una carpeta es `for archivo in Path("entrada").glob("*.csv"):`.

## Resumen

- `import modulo` / `from modulo import nombre`: biblioteca estándar, paquetes con `pip`, y tus propios archivos.
- `with open(ruta, modo, encoding="utf-8") as f:` para leer y escribir; recorre línea por línea los archivos grandes.
- `csv.DictReader`/`DictWriter` para CSV (todo llega como texto); `json.loads`/`dumps` para JSON.
- `datetime`: `strptime` (texto → fecha), `strftime` (fecha → texto), `timedelta` para sumar.
- `Counter` y `defaultdict` para contar y agrupar; `pathlib.Path` para rutas.

## Ejercicios

:::ejercicio python
Escribe el archivo `clientes.csv` con encabezado `nombre,pais` y las filas de `clientes`. Luego léelo con `csv.DictReader` y guarda en `paises` la lista de países **en el orden del archivo**.
```python inicial
import csv
clientes = [("Ana", "Chile"), ("Luis", "Perú"), ("Eva", "México")]
```
```python solucion
import csv
clientes = [("Ana", "Chile"), ("Luis", "Perú"), ("Eva", "México")]
with open("clientes.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["nombre", "pais"])
    w.writerows(clientes)
with open("clientes.csv", encoding="utf-8") as f:
    paises = [fila["pais"] for fila in csv.DictReader(f)]
```
```python test
contenido = open("clientes.csv", encoding="utf-8").read().splitlines()
assert contenido[0] == "nombre,pais", f"Encabezado incorrecto: {contenido[0]!r}"
assert paises == ["Chile", "Perú", "México"], f"paises = {paises}"
```
:::

:::ejercicio python
Parsea el texto JSON `respuesta_api` y calcula en `total_aprobado` la suma de `monto` de los pagos con `estado == "aprobado"`.
```python inicial
import json
respuesta_api = '{"pagos": [{"id": 1, "monto": 120.5, "estado": "aprobado"}, {"id": 2, "monto": 80, "estado": "rechazado"}, {"id": 3, "monto": 99.5, "estado": "aprobado"}]}'
```
```python solucion
import json
respuesta_api = '{"pagos": [{"id": 1, "monto": 120.5, "estado": "aprobado"}, {"id": 2, "monto": 80, "estado": "rechazado"}, {"id": 3, "monto": 99.5, "estado": "aprobado"}]}'
datos = json.loads(respuesta_api)
total_aprobado = sum(p["monto"] for p in datos["pagos"] if p["estado"] == "aprobado")
```
```python test
assert total_aprobado == 220.0, f"total_aprobado = {total_aprobado}"
```
:::

:::ejercicio python
Escribe `dias_entre(desde, hasta)` que reciba fechas como texto `"YYYY-MM-DD"` y devuelva los días entre ambas (entero). Además, calcula en `dia_semana` el nombre del día de la semana (en español, minúsculas) de `"2024-03-15"` usando `.weekday()` y la lista `dias`.
```python inicial
from datetime import date
dias = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]

def dias_entre(desde, hasta):
    pass
```
```python solucion
from datetime import date
dias = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]

def dias_entre(desde, hasta):
    return (date.fromisoformat(hasta) - date.fromisoformat(desde)).days

dia_semana = dias[date.fromisoformat("2024-03-15").weekday()]
```
```python test
assert dias_entre("2024-01-01", "2024-03-01") == 60, "2024 es bisiesto: entre 1/1 y 1/3 hay 60 días"
assert dias_entre("2024-03-15", "2024-03-15") == 0
assert dia_semana == "viernes", f"dia_semana = {dia_semana!r}"
```
:::

:::ejercicio python
Usa `Counter` para encontrar los **2 dominios de email más frecuentes** en `emails`. Guarda en `top2` una lista de tuplas `(dominio, cantidad)` como la que devuelve `most_common(2)`.
```python inicial
from collections import Counter
emails = ["a@gmail.com", "b@hotmail.com", "c@gmail.com", "d@yahoo.com", "e@gmail.com", "f@hotmail.com"]
```
```python solucion
from collections import Counter
emails = ["a@gmail.com", "b@hotmail.com", "c@gmail.com", "d@yahoo.com", "e@gmail.com", "f@hotmail.com"]
top2 = Counter(e.split("@")[1] for e in emails).most_common(2)
```
```python test
assert top2 == [("gmail.com", 3), ("hotmail.com", 2)], f"top2 = {top2}"
```
:::
