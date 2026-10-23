---
titulo: Tipos de datos y textos (strings)
nivel: Básico
duracion: 25
resumen: int, float, str, bool, None, conversiones, f-strings y métodos de texto.
---

## Los tipos básicos

| Tipo | Nombre | Ejemplos |
|---|---|---|
| `int` | entero | `42`, `-7`, `0` |
| `float` | decimal | `3.14`, `0.5`, `1e6` |
| `str` | texto (string) | `"hola"`, `'datos'` |
| `bool` | booleano | `True`, `False` |
| `NoneType` | nada | `None` (como el NULL de SQL) |

Con `type()` puedes preguntar el tipo de cualquier valor:

```python
print(type(42), type(3.14), type("hola"), type(True), type(None))
```

## Convertir tipos

```python
edad_texto = "29"
edad = int(edad_texto)      # str -> int
precio = float("19.99")     # str -> float
codigo = str(1234)          # int -> str
print(edad + 1, precio * 2, codigo + "-A")
```

:::cuidado "29" + 1 da error
Python no mezcla texto y números automáticamente: `"29" + 1` lanza `TypeError`. Convierte primero: `int("29") + 1`.
:::

## Strings (textos)

```python
nombre = "Ana"
apellido = "Pérez"
completo = nombre + " " + apellido   # concatenar
print(completo)
print(len(completo))                  # largo: 9
print(completo[0])                    # primer carácter: A
print(completo[-1])                   # último carácter: z
print(completo[0:3])                  # rebanada (slice): Ana
print("=" * 20)                       # repetir
```

Los índices empiezan en **0**. En un slice `[inicio:fin]`, el fin **no** se incluye.

## f-strings: el mejor invento

Pon una `f` antes de las comillas y escribe variables o expresiones entre `{}`:

```python
producto = "Laptop"
precio = 1234.5
unidades = 3
print(f"{unidades} x {producto} = {precio * unidades}")
print(f"Precio con 2 decimales: {precio:.2f}")
print(f"Con separador de miles: {precio * 1000:,.2f}")
```

## Métodos de texto más usados

| Método | Ejemplo | Resultado |
|---|---|---|
| `.upper()` / `.lower()` | `"Hola".upper()` | `"HOLA"` |
| `.strip()` | `"  hola  ".strip()` | `"hola"` |
| `.replace(a, b)` | `"a-b".replace("-", "/")` | `"a/b"` |
| `.split(sep)` | `"a,b,c".split(",")` | `["a", "b", "c"]` |
| `sep.join(lista)` | `"-".join(["a", "b"])` | `"a-b"` |
| `.startswith(x)` / `.endswith(x)` | `"data.csv".endswith(".csv")` | `True` |
| `x in texto` | `"@" in "ana@mail.com"` | `True` |
| `.title()` | `"ana pérez".title()` | `"Ana Pérez"` |

Los strings son **inmutables**: los métodos devuelven un string **nuevo**; el original no cambia.

```python
email = "  Ana.Perez@Gmail.COM "
limpio = email.strip().lower()
usuario, dominio = limpio.split("@")
print(limpio, usuario, dominio)
```

## Ejercicios

:::ejercicio python
Convierte el texto `cantidad_txt = "12"` a número entero, súmale 8 y guarda el resultado en `total`.
```python inicial
cantidad_txt = "12"
```
```python solucion
cantidad_txt = "12"
total = int(cantidad_txt) + 8
```
```python test
assert total == 20 and isinstance(total, int), f"total debería ser el entero 20 y es {total!r}"
```
:::

:::ejercicio python
Limpia el email `crudo = "  LUCIA.Gomez@Hotmail.com  "`: sin espacios y en minúsculas, en la variable `email`. Luego extrae el dominio (lo que va después de `@`) en `dominio`.
```python inicial
crudo = "  LUCIA.Gomez@Hotmail.com  "
```
```python solucion
crudo = "  LUCIA.Gomez@Hotmail.com  "
email = crudo.strip().lower()
dominio = email.split("@")[1]
```
```python test
assert email == "lucia.gomez@hotmail.com", f"email incorrecto: {email!r}"
assert dominio == "hotmail.com", f"dominio incorrecto: {dominio!r}"
```
:::

:::ejercicio python
Con `producto = "Auriculares"`, `precio = 59.9` y `unidades = 4`, imprime exactamente: `4 x Auriculares = 239.60` (el total con **2 decimales**), usando un f-string.
```python inicial
producto = "Auriculares"
precio = 59.9
unidades = 4
```
```python solucion
producto = "Auriculares"
precio = 59.9
unidades = 4
print(f"{unidades} x {producto} = {precio * unidades:.2f}")
```
```python test
assert salida.strip() == "4 x Auriculares = 239.60", f"Se imprimió {salida.strip()!r}"
```
```pista
Formato con 2 decimales dentro de un f-string: `{valor:.2f}`.
```
:::

:::ejercicio python
De la fecha `fecha = "2024-03-15"`, extrae con **slices** el año en `anio` (como texto `"2024"`) y el mes en `mes` (como entero `3`).
```python inicial
fecha = "2024-03-15"
```
```python solucion
fecha = "2024-03-15"
anio = fecha[0:4]
mes = int(fecha[5:7])
```
```python test
assert anio == "2024", f"anio debería ser '2024' y es {anio!r}"
assert mes == 3, f"mes debería ser el entero 3 y es {mes!r}"
```
:::
