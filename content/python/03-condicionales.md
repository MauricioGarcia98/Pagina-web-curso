---
titulo: Condicionales: if, elif, else
nivel: Básico
duracion: 30
resumen: Tomar decisiones con comparaciones, operadores lógicos e indentación.
objetivos: Tomar decisiones en un programa con `if`, `elif` y `else` | Escribir condiciones con comparaciones y con `and`, `or` y `not` | Anticipar qué valores Python considera falsos | Escribir una regla de negocio como código legible
prerrequisitos: python-tipos-y-strings
autoevaluacion: ¿Puedes clasificar un valor en tres categorías con `if/elif/else`? | ¿Sabes por qué el orden de los `elif` importa? | ¿Puedes escribir la regla "envío gratis si el total es al menos 2000 o si es cliente premium"? | ¿Sabes qué valores son falsos en Python (`0`, `""`, `[]`, `None`)? | ¿Sabes la diferencia entre `=` y `==`?
---

<!-- estandar:escenario -->
:::escenario La regla del envío gratis
Valentina define una nueva política comercial:

> "Desde el lunes, el envío es gratis si la compra es de 2000 o más, o si el cliente es premium. Los pedidos cancelados o devueltos no cuentan. ¿Lo puedes implementar en el proceso?"

Las reglas del negocio son, en el fondo, **condiciones**: "si pasa esto, haz aquello". Esta lección te enseña a escribirlas en Python sin errores de lógica.
:::
## Programas que deciden

Hasta ahora tus programas ejecutaban **todas** sus líneas, siempre. Pero la lógica de negocio está llena de decisiones: "si el stock es bajo, avisar", "si el total supera 2.000, el envío es gratis", "si el email está vacío, mandar el registro a revisión". Para eso existen los **condicionales**: bloques de código que se ejecutan **solo si** se cumple una condición.

## if: hacer algo solo si se cumple una condición

```python
stock = 3
if stock < 5:
    print("¡Quedan pocas unidades!")
    print("Reponer pronto")
print("Fin del chequeo")
```

Cómo se lee y cómo se ejecuta:

1. Python evalúa la condición `stock < 5` → `3 < 5` → `True`.
2. Como es verdadera, ejecuta el **bloque** de abajo: las dos líneas con sangría.
3. Sigue con la primera línea **sin** sangría: "Fin del chequeo", que se ejecuta siempre.

Si `stock` fuera 10, la condición daría `False`, Python **saltaría** el bloque y solo imprimiría "Fin del chequeo". Pruébalo cambiando el valor.

### Las dos reglas de sintaxis

| Regla | Detalle | Error si la olvidas |
|---|---|---|
| **Dos puntos** al final de la línea del `if` | `if stock < 5:` | `SyntaxError: expected ':'` |
| **Sangría** (indentación) del bloque | 4 espacios al principio de cada línea "de adentro" | `IndentationError: expected an indented block` |

:::cuidado La indentación no es decorativa
En muchos lenguajes los bloques se marcan con llaves `{ }` y la sangría es solo estética. En Python, **la sangría ES la sintaxis**: los espacios al principio de la línea deciden qué código está dentro del `if`. Usa siempre 4 espacios (el editor los pone solo al presionar Enter después de `:` o con <kbd>Tab</kbd>) y nunca mezcles espacios con tabulaciones.
:::

## elif y else: varias alternativas

```python
total = 1800
if total >= 2000:
    envio = 0
elif total >= 1000:
    envio = 50
else:
    envio = 120
print("Costo de envío:", envio)
```

- `elif` (abreviatura de *else if*, "si no, si…") agrega otra condición. Puede haber todos los que necesites.
- `else` ("si no") es el caso por defecto: se ejecuta si **ninguna** condición anterior se cumplió. Es opcional y va al final.

Python revisa de arriba hacia abajo y ejecuta **solo el primer bloque** cuya condición sea verdadera; los demás se saltean, aunque también se cumplieran. Con `total = 1800`: `1800 >= 2000` es falso → `1800 >= 1000` es verdadero → `envio = 50`, y el `else` ni se mira. Es exactamente la lógica de `CASE WHEN` en SQL, y el **orden** importa igual: si pusieras `total >= 1000` primero, un pedido de 5.000 pagaría 50.

:::analogia El portero de la discoteca
El portero tiene una lista de reglas en orden: "¿Estás en la lista VIP? Pasa por la puerta dorada. ¿Si no, tienes entrada? Pasa por la puerta común. ¿Si no? No entras". Aplica la primera regla que te corresponde y no sigue preguntando.
:::

```recorrido
titulo: Cómo decide un if / elif / else
estacion dato: El dato | icono=codigo
estacion if: if | icono=reglas
estacion elif: elif | icono=reglas
estacion fin: Resultado | icono=check
paso dato: Un pedido de 350
Clasificamos un pedido por su monto.
>>> python
monto = 350
if monto >= 1000:
    tamaño = 'grande'
elif monto >= 100:
    tamaño = 'mediano'
else:
    tamaño = 'chico'
paso if: ¿350 >= 1000?
Falso. Python **salta** el bloque del `if` y pasa a la siguiente condición.
>>> texto
350 >= 1000  →  False
paso elif: ¿350 >= 100?
Verdadero. Ejecuta este bloque y **ya no mira** el `else`: solo se ejecuta una de las ramas.
>>> texto
350 >= 100  →  True   →   tamaño = 'mediano'
paso fin: Una sola rama
Las condiciones se revisan en orden. Si pusieras `monto >= 100` primero, un pedido de 5000 también sería "mediano".
>>> python
tamaño = 'mediano'
```

## Comparaciones

| Operador | Significa | Ejemplo | Resultado |
|---|---|---|---|
| `==` | igual | `3 == 3` | `True` |
| `!=` | distinto | `"web" != "app"` | `True` |
| `<` `<=` `>` `>=` | menor, menor o igual, mayor, mayor o igual | `10 >= 10` | `True` |
| `in` | está contenido en | `"Chile" in ["Chile", "Perú"]` | `True` |
| `not in` | no está contenido en | `"@" not in "anamail.com"` | `True` |
| `is` / `is not` | es el mismo objeto (se usa con `None`) | `x is None` | según `x` |

:::cuidado `=` vs `==`
`=` **asigna** (guarda un valor). `==` **compara** (pregunta si son iguales). Escribir `if total = 100:` da `SyntaxError`. Es el error número uno al empezar.
:::

Las comparaciones de texto distinguen mayúsculas y espacios, igual que en SQL: `"chile" == "Chile"` es `False`. Si los datos pueden venir "sucios", normaliza antes de comparar: `pais.strip().lower() == "chile"`.

Python permite **comparaciones encadenadas**, como en matemática: `0 <= descuento <= 0.5` significa "descuento entre 0 y 0,5, ambos incluidos".

## Combinar condiciones: and, or, not

| Operador | Es verdadero si… | Ejemplo |
|---|---|---|
| `a and b` | se cumplen **las dos** | `edad >= 18 and pais == "Chile"` |
| `a or b` | se cumple **al menos una** | `canal == "web" or canal == "app"` |
| `not a` | `a` es falso | `not es_cliente` |

```python
pais = "Chile"
edad = 17
if pais in ("Chile", "Perú") and not edad < 18:
    print("Puede registrarse")
else:
    print("No puede registrarse")
```

Igual que en SQL, `and` se evalúa antes que `or`. Si mezclas ambos, **usa paréntesis**: `(canal == "web" or canal == "app") and estado == "cancelado"`.

:::experto Evaluación en cortocircuito
Python deja de evaluar en cuanto conoce el resultado: en `a and b`, si `a` es falso ya no mira `b`. Se usa para protegerse: `if lista and lista[0] > 10:` nunca falla con una lista vacía, porque si está vacía no llega a pedir `lista[0]`. Lo mismo con `if usuario is not None and usuario.activo:`.
:::

## Valores "verdaderos" y "falsos" (truthiness)

En un `if` no hace falta que la condición sea literalmente `True` o `False`: cualquier valor se interpreta. Estos cuentan como **falsos**:

| Falsos | Ejemplos |
|---|---|
| `False`, `None` | |
| Cero | `0`, `0.0` |
| Colecciones vacías | `""` (texto vacío), `[]`, `{}`, `()`, `set()` |

**Todo lo demás es verdadero** (incluido `" "`, un texto con un espacio, y `"0"`, un texto con un cero).

```python
email = ""
if not email:
    print("Falta el email")

pedidos = []
if pedidos:
    print("Hay pedidos para procesar")
else:
    print("Nada que procesar hoy")
```

Es una forma muy idiomática (típica de Python) de escribir "si está vacío" o "si hay algo". Pero cuidado: `if not cantidad:` también es verdadero cuando `cantidad` es `0`, que puede ser un valor válido. Si quieres distinguir "cero" de "sin dato", pregunta explícitamente: `if cantidad is None:`.

## Condicionales anidados

Un `if` puede ir dentro de otro (con más sangría):

```python
es_cliente = True
total = 2500
if es_cliente:
    if total > 2000:
        print("Cliente con compra grande: 15 % de descuento")
    else:
        print("Cliente: 5 % de descuento")
else:
    print("Sin descuento")
```

Más de dos o tres niveles se vuelve difícil de leer. Muchas veces se puede aplanar con `and` (`if es_cliente and total > 2000:`) o con *guardas* (salir temprano con `return` dentro de una función, como verás después).

## La expresión condicional: if en una línea

Para asignar un valor u otro según una condición, existe una forma compacta:

```python
nota = 7
resultado = "aprobado" if nota >= 6 else "desaprobado"
print(resultado)
```

Se lee: "`resultado` es `'aprobado'` **si** `nota >= 6`, **si no** `'desaprobado'`". Úsala para decisiones simples de dos ramas; para más casos, `if/elif/else` es más claro.

<!-- estandar:errores -->
:::errores
- **`=` en lugar de `==`**: `if estado = "entregado":` es un error de sintaxis. `=` asigna, `==` compara.
- **Condiciones en el orden equivocado**: si el primer `if` es `total > 0`, el `elif total > 2000` nunca se ejecuta. Ve de lo más específico a lo más general.
- **`if estado == "cancelado" or "devuelto":`** siempre es verdadero, porque `"devuelto"` (un texto no vacío) es verdadero por sí solo. Se escribe `estado in ("cancelado", "devuelto")`.
- **Olvidar la indentación**: en Python, lo que va "dentro" del `if` se marca con 4 espacios. Sin ellos, `IndentationError`.
:::

<!-- estandar:trabajo -->
:::trabajo
- Las reglas de negocio cambian ("ahora el mínimo es 2500"). En vez de dejar el número escrito dentro del `if`, se guarda en una constante con nombre (`MINIMO_ENVIO_GRATIS = 2000`) o en un archivo de configuración.
- Una regla de negocio importante siempre lleva tests con los casos límite: justo 2000, 1999,99, cliente premium con total 0. Ahí es donde aparecen los errores.
:::

## Resumen

- `if condición:` + bloque con sangría de 4 espacios. Los dos puntos y la sangría son obligatorios.
- `elif` agrega alternativas, `else` es el caso por defecto; solo se ejecuta el primer bloque verdadero.
- `==` compara, `=` asigna. `in` pregunta pertenencia; `is None` pregunta por la ausencia de valor.
- `and`, `or`, `not`; paréntesis cuando los mezcles.
- `0`, `""`, `[]`, `None` son falsos en un `if`; cuidado con el `0` válido.

## Ejercicios

:::ejercicio python
Dado `temperatura = 31`, guarda en `estado` el texto `"calor"` si es mayor a 28, `"templado"` si está entre 15 y 28 (incluidos) y `"frío"` si es menor a 15. Tu código debe funcionar con cualquier temperatura.
```python inicial
temperatura = 31
```
```python solucion
temperatura = 31
if temperatura > 28:
    estado = "calor"
elif temperatura >= 15:
    estado = "templado"
else:
    estado = "frío"
```
```python test
assert estado == "calor", f"Con 31 grados estado debería ser 'calor' y es {estado!r}"
```
:::

:::ejercicio python
Escribe una regla de envío gratis: `gratis = True` si `total` es al menos 2000 **o** si `es_premium` es `True`; si no, `gratis = False`. Prueba con `total = 1500` y `es_premium = True`.
```python inicial
total = 1500
es_premium = True
```
```python solucion
total = 1500
es_premium = True
gratis = total >= 2000 or es_premium
```
```python test
assert gratis is True, "Con un cliente premium el envío debe ser gratis"
```
:::

:::ejercicio python
Clasifica un pedido según su `estado`. Si es `"entregado"` imprime `OK`; si es `"cancelado"` o `"devuelto"` imprime `PROBLEMA`; en cualquier otro caso imprime `EN CURSO`. Prueba con `estado = "devuelto"`.
```python inicial
estado = "devuelto"
```
```python solucion
estado = "devuelto"
if estado == "entregado":
    print("OK")
elif estado in ("cancelado", "devuelto"):
    print("PROBLEMA")
else:
    print("EN CURSO")
```
```python test
assert salida.strip() == "PROBLEMA", f"Con estado 'devuelto' se esperaba PROBLEMA y se imprimió {salida.strip()!r}"
```
:::

### Más práctica

:::ejercicio python titulo="Par o impar"
Dado `n = 17`, guarda en `tipo` el texto `"par"` o `"impar"`. Debe funcionar con cualquier número.
```python inicial
n = 17
tipo = ""
```
```python solucion
n = 17
if n % 2 == 0:
    tipo = "par"
else:
    tipo = "impar"
```
```python test
assert tipo == "impar", f"tipo es {tipo!r}"
assert "%" in _codigo, "Usa el resto de la división (%) por 2"
```
:::

:::ejercicio python titulo="Segmento del cliente"
Según lo que compró en el año (`compras = 850000`), el cliente es `"oro"` si supera 1.000.000, `"plata"` si supera 500.000 y `"bronce"` en otro caso. Guarda el segmento en `segmento`.
```python inicial
compras = 850000
segmento = ""
```
```python solucion
compras = 850000
if compras > 1000000:
    segmento = "oro"
elif compras > 500000:
    segmento = "plata"
else:
    segmento = "bronce"
```
```python test
assert segmento == "plata", f"segmento es {segmento!r}"
```
:::

:::ejercicio python titulo="Validar una fila"
Una fila es válida si `cantidad` es mayor que 0 **y** `precio` no es `None`. Con `cantidad = 3` y `precio = None`, guarda en `valida` `True` o `False`.
```python inicial
cantidad = 3
precio = None
valida = None
```
```python solucion
cantidad = 3
precio = None
valida = cantidad > 0 and precio is not None
```
```python test
assert valida is False, f"valida es {valida!r}"
```
```pista
Para preguntar si algo es `None` se usa `is None` / `is not None`.
```
:::

:::ejercicio python titulo="Año bisiesto"
Un año es bisiesto si es divisible por 4, salvo los divisibles por 100, que solo lo son si también son divisibles por 400. Con `anio = 2024`, guarda en `bisiesto` `True` o `False`.
```python inicial
anio = 2024
bisiesto = None
```
```python solucion
anio = 2024
bisiesto = (anio % 4 == 0 and anio % 100 != 0) or anio % 400 == 0
```
```python test
assert bisiesto is True, f"2024 es bisiesto y obtuviste {bisiesto!r}"
```
:::

:::ejercicio python titulo="Envío según país"
El costo de envío (`envio`) es 0 si `pais` es `"Chile"` y el total supera 30000; 2990 si es `"Chile"` y no lo supera; y 9990 para cualquier otro país. Con `pais = "Perú"` y `total = 50000`, calcula `envio`.
```python inicial
pais = "Perú"
total = 50000
envio = None
```
```python solucion
pais = "Perú"
total = 50000
if pais == "Chile":
    if total > 30000:
        envio = 0
    else:
        envio = 2990
else:
    envio = 9990
```
```python test
assert envio == 9990, f"envio es {envio!r}"
```
:::

:::ejercicio python titulo="if en una línea"
Con `stock = 0`, guarda en `estado` `"agotado"` si el stock es 0 y `"disponible"` si no, usando la expresión condicional de una línea (`x if condición else y`).
```python inicial
stock = 0
estado = ""
```
```python solucion
stock = 0
estado = "agotado" if stock == 0 else "disponible"
```
```python test
assert estado == "agotado", f"estado es {estado!r}"
assert " if " in _codigo and " else " in _codigo and "\nif " not in "\n" + _codigo.split("estado")[1], "Usa la forma de una línea: 'agotado' if stock == 0 else 'disponible'"
```
:::

:::ejercicio python titulo="Texto vacío"
Un campo `comentario = ""` llegó vacío. Usando que un texto vacío es "falso", guarda en `tiene_comentario` `True` si el comentario tiene algo y `False` si está vacío.
```python inicial
comentario = ""
tiene_comentario = None
```
```python solucion
comentario = ""
tiene_comentario = bool(comentario)
```
```python test
assert tiene_comentario is False, f"tiene_comentario es {tiene_comentario!r}"
```
```pista
`bool("")` es `False` y `bool("hola")` es `True`.
```
:::
