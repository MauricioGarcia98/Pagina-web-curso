---
titulo: Módulos, archivos, CSV, JSON y fechas
nivel: Intermedio
duracion: 35
resumen: import, la biblioteca estándar, leer y escribir archivos, csv, json, datetime, collections y pathlib.
---

## Importar módulos

Un **módulo** es un archivo con código reutilizable. Python trae una enorme **biblioteca estándar** (“baterías incluidas”):

```python
import math
from datetime import date, timedelta
from collections import Counter, defaultdict
import json, csv, random as rnd

print(math.sqrt(16), math.pi)
print(date.today() - timedelta(days=7))
print(Counter("abracadabra").most_common(2))
```

Paquetes externos (pandas, requests, pyspark…) se instalan con `pip install paquete`. Lo veremos en “Buenas prácticas”.

## Leer y escribir archivos

```python
# Escribir (modo "w" sobrescribe, "a" agrega)
with open("notas.txt", "w", encoding="utf-8") as f:
    f.write("línea 1\n")
    f.write("línea 2\n")

# Leer
with open("notas.txt", encoding="utf-8") as f:
    for linea in f:
        print(linea.strip())
```

:::tip Siempre usa with
`with open(...) as f:` cierra el archivo automáticamente, aunque ocurra un error. Y especifica `encoding="utf-8"` para no tener problemas con tildes y eñes.
:::

## CSV

```python
import csv

filas = [
    {"producto": "Mouse", "unidades": 3, "precio": 25.5},
    {"producto": "Teclado", "unidades": 1, "precio": 49.9},
]
with open("ventas.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["producto", "unidades", "precio"])
    w.writeheader()
    w.writerows(filas)

with open("ventas.csv", encoding="utf-8") as f:
    for fila in csv.DictReader(f):
        print(fila)          # ¡todo llega como texto! Hay que convertir tipos
```

## JSON

```python
import json

pedido = {"id": 1, "cliente": "Eva", "items": [{"sku": "A1", "cant": 2}], "pagado": True}
texto = json.dumps(pedido, ensure_ascii=False, indent=2)   # dict -> texto JSON
print(texto)
de_vuelta = json.loads(texto)                              # texto JSON -> dict
print(de_vuelta["items"][0]["sku"])
# Con archivos: json.dump(obj, f) y json.load(f)
```

## Fechas con datetime

```python
from datetime import datetime, date, timedelta

f = datetime.strptime("2024-03-15 14:30", "%Y-%m-%d %H:%M")   # texto -> fecha
print(f.year, f.month, f.strftime("%d/%m/%Y"))                 # fecha -> texto
print(f + timedelta(days=30))
print((date(2024, 12, 25) - date(2024, 3, 15)).days)          # diferencia en días
print(date(2024, 3, 15).isoformat(), date.fromisoformat("2024-03-15").weekday())  # 0 = lunes
```

## collections: estructuras extra

```python
from collections import Counter, defaultdict

canales = ["web", "app", "web", "tienda", "web"]
print(Counter(canales))                        # contar en una línea

por_pais = defaultdict(list)                   # diccionario con valor por defecto
for nombre, pais in [("Ana", "Chile"), ("Luis", "Perú"), ("Eva", "Chile")]:
    por_pais[pais].append(nombre)
print(dict(por_pais))
```

## pathlib: rutas de archivos

```python
from pathlib import Path
carpeta = Path("datos") / "crudos"
carpeta.mkdir(parents=True, exist_ok=True)
(carpeta / "a.txt").write_text("hola", encoding="utf-8")
print([p.name for p in carpeta.glob("*.txt")])
```

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
