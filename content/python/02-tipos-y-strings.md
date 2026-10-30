---
titulo: Tipos de datos y textos (strings)
nivel: Básico
duracion: 35
resumen: int, float, str, bool, None, conversiones, f-strings y métodos de texto.
objetivos: Reconocer los tipos `int`, `float`, `str`, `bool` y `None` y convertir entre ellos | Armar textos con f-strings | Limpiar textos con métodos como `strip`, `lower`, `replace` y `split` | Extraer partes de un texto con índices y slices
prerrequisitos: python-primeros-pasos
autoevaluacion: ¿Sabes por qué `"12" + 8` da error y cómo arreglarlo? | ¿Puedes limpiar un email con espacios y mayúsculas en una línea? | ¿Puedes imprimir un texto con un precio formateado a 2 decimales con un f-string? | ¿Puedes sacar el año, el mes y el día de `"2024-03-15"` con slices? | ¿Sabes qué representa `None` y en qué se diferencia de `0` o de `""`?
---

<!-- estandar:escenario -->
:::escenario Los emails sucios del formulario
Camila, de marketing, te reenvía la lista de emails del formulario de suscripción:

> "La mitad rebota. Hay emails con espacios, con mayúsculas, algunos vacíos… ¿Los puedes limpiar antes de que los cargue en la herramienta de envíos?"

Casi todos los datos que vas a recibir llegan como **texto**, aunque sean números o fechas. Esta lección te enseña a reconocer los tipos, convertirlos y limpiar textos, que es una parte enorme del trabajo diario.
:::
## Cada valor tiene un tipo

Para Python no es lo mismo `29` que `"29"`. El primero es un **número** (se puede sumar, multiplicar); el segundo es un **texto** formado por los caracteres "2" y "9" (se puede poner en mayúsculas o cortar, pero no sumar). El **tipo** de un valor determina qué puedes hacer con él.

| Tipo | Nombre | Ejemplos | Para qué |
|---|---|---|---|
| `int` | entero | `42`, `-7`, `0`, `1_000_000` | Cantidades, ids, contadores |
| `float` | decimal ("de punto flotante") | `3.14`, `0.5`, `1e6` (= 1.000.000) | Precios, porcentajes, medidas |
| `str` | texto (*string*) | `"hola"`, `'datos'`, `""` (vacío) | Nombres, emails, códigos |
| `bool` | booleano (verdadero/falso) | `True`, `False` | Condiciones, banderas (`es_cliente`) |
| `NoneType` | "nada" | `None` | Falta de valor: el `NULL` de SQL |

`type()` te dice el tipo de cualquier valor:

```python
print(type(42), type(3.14), type("hola"), type(True), type(None))
```

:::nota Los guiones bajos en los números
`1_000_000` es lo mismo que `1000000`: Python ignora los `_` dentro de los números para que se lean mejor. Muy útil con cifras grandes.
:::

## Convertir de un tipo a otro

Los datos que llegan de afuera (un archivo CSV, un formulario, una API) muchas veces llegan como **texto**, aunque representen números. Para operar con ellos, hay que convertirlos:

```python
edad_texto = "29"
edad = int(edad_texto)      # str -> int
precio = float("19.99")     # str -> float
codigo = str(1234)          # int -> str
print(edad + 1, precio * 2, codigo + "-A")
```

| Función | Convierte a | Ejemplo | Resultado |
|---|---|---|---|
| `int(x)` | entero | `int("42")`, `int(3.9)` | `42`, `3` (trunca, no redondea) |
| `float(x)` | decimal | `float("1.5")` | `1.5` |
| `str(x)` | texto | `str(3.5)` | `"3.5"` |
| `bool(x)` | booleano | `bool(0)`, `bool("hola")` | `False`, `True` |

:::cuidado "29" + 1 da error
Python **no** mezcla texto y números por su cuenta: `"29" + 1` lanza `TypeError: can only concatenate str (not "int") to str`. Tiene que ser explícito: `int("29") + 1` → `30`, o `"29" + str(1)` → `"291"`. Que no adivine es bueno: evita errores silenciosos como los de SQLite con `CAST`.
:::

Si el texto no representa un número válido, la conversión **falla** con un error: `int("abc")` → `ValueError: invalid literal for int()`. En la lección de errores aprenderás a manejar estos casos sin que se detenga el programa (muy común al limpiar datos).

```recorrido
titulo: Un monto que llega como texto, paso a paso
estacion txt: Es texto | icono=archivo
estacion suma: El problema | icono=alerta
estacion float: float() | icono=transformar
estacion int: int() | icono=x
estacion ok: Resultado | icono=check
paso txt: Lo que llega de un archivo es texto
Todo lo que se lee de un CSV o de un formulario llega como `str`, aunque *parezca* un número.
>>> python
monto = "120.50"
print(type(monto))
print(type(monto))
paso suma: Sumar textos los pega
Con textos, `+` **concatena**: no da error, da un resultado absurdo. Por eso hay que convertir.
>>> log
<class 'str'>
120.50120.50
paso float: float() lo convierte en número decimal
Ahora `+` suma de verdad. (Las líneas que empiezan con `»` son lo que escribes; las demás, lo que responde Python.)
>>> log
» monto = float("120.50")
» print(type(monto))
» print(monto + monto)
<class 'float'>
241.0
paso int: int() no acepta decimales en un texto
`int("120.50")` falla: el texto no representa un entero. El error dice exactamente qué valor no pudo convertir.
>>> log
» print(int("120.50"))
ValueError: invalid literal for int() with base 10: '120.50'
paso ok: Primero a float, después a int
`int()` **corta** los decimales (no redondea); `round()` redondea. Elige según la regla de negocio.
>>> log
» print(int(float("99.90")))
» print(round(float("99.90")))
99
100
```

## Strings: trabajar con texto

```python
nombre = "Ana"
apellido = "Pérez"
completo = nombre + " " + apellido   # concatenar (unir) con +
print(completo)
print(len(completo))                  # largo: 9 caracteres (el espacio cuenta)
print(completo[0])                    # primer carácter: A
print(completo[-1])                   # último carácter: z
print(completo[0:3])                  # rebanada (slice): Ana
print("=" * 20)                       # repetir 20 veces
```

### Índices: cada carácter tiene una posición

```text
 A   n   a       P   é   r   e   z
 0   1   2   3   4   5   6   7   8     ← índices desde el principio
-9  -8  -7  -6  -5  -4  -3  -2  -1     ← índices desde el final
```

- Los índices empiezan en **0** (no en 1, a diferencia de `SUBSTR` en SQL).
- Los negativos cuentan desde el final: `-1` es el último.
- Un **slice** `texto[inicio:fin]` toma desde `inicio` **hasta antes de** `fin` (el fin **no** se incluye). `completo[0:3]` = posiciones 0, 1 y 2 = `"Ana"`.
- Si omites un extremo, va hasta el borde: `completo[4:]` = `"Pérez"`, `completo[:3]` = `"Ana"`.

```python
fecha = "2024-03-15"
print(fecha[:4], fecha[5:7], fecha[8:])   # 2024 03 15
```

## f-strings: armar textos con valores adentro

Concatenar con `+` y `str()` es incómodo. Las **f-strings** (de *formatted*) permiten escribir expresiones entre llaves `{}` directamente dentro del texto. Solo hay que poner una `f` antes de las comillas:

```python
producto = "Laptop"
precio = 1234.5
unidades = 3
print(f"{unidades} x {producto} = {precio * unidades}")
print(f"Precio con 2 decimales: {precio:.2f}")
print(f"Con separador de miles: {precio * 1000:,.2f}")
print(f"Porcentaje: {0.4567:.1%}")
```

Dentro de las llaves puede ir cualquier expresión, y después de `:` un **formato**:

| Formato | Significa | Ejemplo | Resultado |
|---|---|---|---|
| `:.2f` | 2 decimales | `f"{3.14159:.2f}"` | `3.14` |
| `:,` | separador de miles | `f"{1234567:,}"` | `1,234,567` |
| `:.1%` | porcentaje con 1 decimal | `f"{0.256:.1%}"` | `25.6%` |
| `:>10` | alinear a la derecha en 10 espacios | `f"{'ok':>10}"` | `        ok` |
| `:05d` | rellenar con ceros | `f"{42:05d}"` | `00042` |

Las f-strings son la forma moderna y recomendada; verás código viejo con `"%s" % x` o `"{}".format(x)`, que hacen lo mismo.

## Métodos de texto

Un **método** es una función que "pertenece" a un tipo de dato y se escribe con un punto: `texto.upper()`. Los strings traen decenas; estos son los que más usarás para **limpiar datos**:

| Método | Qué hace | Ejemplo | Resultado |
|---|---|---|---|
| `.upper()` / `.lower()` | Mayúsculas / minúsculas | `"Hola".upper()` | `"HOLA"` |
| `.strip()` | Quita espacios (y saltos de línea) a los lados | `"  hola \n".strip()` | `"hola"` |
| `.replace(a, b)` | Reemplaza todas las apariciones | `"a-b".replace("-", "/")` | `"a/b"` |
| `.split(sep)` | Corta en una **lista** de pedazos | `"a,b,c".split(",")` | `["a", "b", "c"]` |
| `sep.join(lista)` | Une una lista con un separador | `"-".join(["a", "b"])` | `"a-b"` |
| `.startswith(x)` / `.endswith(x)` | ¿Empieza / termina con…? | `"data.csv".endswith(".csv")` | `True` |
| `x in texto` | ¿Contiene…? | `"@" in "ana@mail.com"` | `True` |
| `.find(x)` | Posición de `x` (−1 si no está) | `"ana@mail".find("@")` | `3` |
| `.title()` | Primera letra de cada palabra en mayúscula | `"ana pérez".title()` | `"Ana Pérez"` |
| `.zfill(n)` | Rellena con ceros a la izquierda | `"42".zfill(5)` | `"00042"` |

### Los strings no se modifican: se crean nuevos

Los strings son **inmutables**: ningún método cambia el texto original, todos **devuelven uno nuevo**. Si quieres conservar el resultado, guárdalo:

```python
email = "  Ana.Perez@Gmail.COM "
email.strip()                 # devuelve un texto nuevo, pero no lo guardamos: se pierde
print(repr(email))            # sigue con espacios
limpio = email.strip().lower()   # métodos encadenados: primero strip, después lower
usuario, dominio = limpio.split("@")
print(limpio, usuario, dominio)
```

`repr()` muestra el texto con sus comillas, útil para ver espacios escondidos. La última línea usa **desempaquetado**: `split("@")` devuelve una lista de dos elementos y se guarda cada uno en una variable.

:::experto Limpieza de textos en pipelines reales
Un paso típico de la capa *silver* es normalizar textos: `strip()` para espacios, `lower()` para emails, `title()` para nombres, reemplazar valores vacíos por `None`. En PySpark harás lo mismo con `F.trim`, `F.lower`, `F.initcap`. Los conceptos son idénticos.
:::

## Booleanos y None

`True` y `False` (con mayúscula inicial) son el resultado de cualquier comparación: `5 > 3` → `True`, `"a" == "b"` → `False`. Los usarás en la próxima lección con `if`.

`None` representa la **ausencia de valor**. Para preguntar si algo es `None` se usa `is`: `if telefono is None:`. Igual que en SQL con `IS NULL`.

<!-- estandar:errores -->
:::errores
- **`TypeError: can only concatenate str (not "int") to str`**: intentaste sumar texto y número. Convierte con `int(...)`/`str(...)` o usa un f-string.
- **`int("12.5")` da `ValueError`**: un texto con decimales se convierte con `float(...)` primero.
- **Los textos no se modifican**: `email.lower()` **devuelve** un texto nuevo, no cambia `email`. Tienes que guardarlo: `email = email.lower()`.
- **Índices fuera de rango**: `texto[10]` en un texto de 5 letras da `IndexError`. Los slices (`texto[0:10]`) no fallan, devuelven lo que haya.
:::

<!-- estandar:trabajo -->
:::trabajo
- La limpieza de textos (espacios, mayúsculas, acentos, formatos de teléfono) es de las tareas más frecuentes de un data engineer. Se hace **una vez**, en una función reutilizable y probada, y todos los procesos la usan.
- Los decimales con `float` no son exactos (`0.1 + 0.2` da `0.30000000000000004`). Para dinero, en Python se usa el módulo `decimal`, y en las bases de datos, el tipo `DECIMAL`.
:::

## Resumen

- Tipos básicos: `int`, `float`, `str`, `bool`, `None`. `type()` dice el tipo.
- Convierte con `int()`, `float()`, `str()`; Python no mezcla texto y números solo.
- Índices desde 0; slices `[inicio:fin]` sin incluir el fin; negativos desde el final.
- f-strings: `f"Total: {total:,.2f}"`.
- Los métodos de texto devuelven un string nuevo: guarda el resultado.

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
