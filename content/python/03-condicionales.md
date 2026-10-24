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
