---
titulo: Tests de transformaciones que atrapan errores de verdad
nivel: Avanzado
duracion: 60
resumen: Un test que pasa con el código correcto no prueba nada si también pasa con un código equivocado. En esta lección escribes tú los tests, y el corrector los prueba contra versiones con errores típicos - si tus tests no los detectan, no alcanzan. Aprendes a elegir casos que importan (bordes, formatos raros, empates), a escribir tablas de casos y a probar propiedades como la idempotencia.
objetivos: Escribir funciones puras fáciles de probar | Elegir casos de prueba que distingan una implementación correcta de una con errores típicos | Organizar los casos en una tabla de entrada y salida esperada | Probar propiedades generales como la idempotencia | Pasar de un test que falla a un código que lo cumple (TDD)
prerrequisitos: calidad-pruebas-que-devuelven-filas | python-buenas-practicas
autoevaluacion: ¿Cómo sabes si tus tests son buenos y no solo verdes? | ¿Qué casos borde pruebas siempre en una función de limpieza? | ¿Qué es la idempotencia y por qué importa en un pipeline? | ¿Qué ventaja tiene escribir el test antes del código?
---

:::analogia En palabras simples
Una alarma de incendio que nunca suena no prueba que no haya incendios: quizá está desconectada. Para saber si funciona, alguien la prueba con humo. Con los tests pasa igual: para saber si sirven, hay que ver que **fallen** cuando el código está mal.
:::

## Un test verde no alcanza

```python
def limpiar_monto(texto):
    return float(texto.replace(",", "."))   # parece bien…

assert limpiar_monto("974,07") == 974.07   # pasa
assert limpiar_monto("16.99") == 16.99     # pasa
```

```diagrama
titulo: Cómo se mide si tus tests sirven (mutation testing)
nodo t: Tus tests | icono=prueba | col=0 | fila=1 | color=azul
nodo ok: Versión correcta | icono=check | col=1 | fila=0 | color=verde | sub=los tests deben pasar
nodo m1: Mutante: sin strip | icono=bug | col=1 | fila=1 | color=rojo | sub=los tests deben fallar
nodo m2: Mutante: solo cambia la coma | icono=bug | col=1 | fila=2 | color=rojo | sub=los tests deben fallar
nodo r: Mutantes que sobreviven | icono=alerta | col=2 | fila=1 | color=amarillo | sub== casos que te faltan
flecha t -> ok
flecha t -> m1
flecha t -> m2
flecha m1 -> r: si pasa
flecha m2 -> r: si pasa
```

Los dos tests pasan, pero `limpiar_monto("1.402,97")` explota (o, en SQLite, da `1.402` sin avisar). Los tests eligieron casos fáciles. Este es el problema real de la calidad de los tests: **no detectaron el error** que importaba.

La técnica para medirlo se llama *mutation testing*: se introducen errores a propósito en el código ("mutantes") y se cuenta cuántos detectan tus tests. En esta lección el corrector hace exactamente eso: corre tus tests contra la versión correcta (deben pasar) y contra versiones con errores típicos (deben fallar).

## Qué casos elegir

| Tipo de caso | Ejemplos para una función de limpieza |
|---|---|
| El caso feliz | `"16.99"` |
| Cada formato que llega de verdad | `"974,07"`, `"$47.99"`, `"1.402,97"` |
| Vacíos y nulos | `None`, `""`, `"   "` |
| Bordes | `"0"`, un solo carácter, el valor más grande posible |
| Lo que **no** debe pasar | Que `"abc"` devuelva un número |

:::tip Saca los casos del perfil
Los formatos raros no se inventan: salen del perfil de la tabla (lección 1). Cada variante que encontraste (`' USD'`, `usd`, `1.402,97`) es un caso de prueba.
:::

## Tablas de casos

En lugar de diez `assert` sueltos, una lista de `(entrada, esperado)` se lee como una especificación y es fácil de ampliar. Es la idea de `@pytest.mark.parametrize` ([documentación de pytest](https://docs.pytest.org/en/stable/how-to/parametrize.html)):

```python norun
CASOS = [
    ("16.99", 16.99),
    ("974,07", 974.07),
    ("$47.99", 47.99),
    ("1.402,97", 1402.97),
    (None, None),
]
for entrada, esperado in CASOS:
    assert limpiar(entrada) == esperado, f"limpiar({entrada!r}) dio {limpiar(entrada)!r}, se esperaba {esperado!r}"
```

## Propiedades: la idempotencia

Algunas reglas valen para **cualquier** entrada. La más importante en datos es la **idempotencia**: aplicar la transformación dos veces da lo mismo que una (`f(f(x)) == f(x)`). Normalizar un email ya normalizado no debe cambiarlo; reprocesar un día ya cargado no debe duplicarlo. Un pipeline idempotente se puede reintentar sin miedo.

:::cuidado Tests que dependen de lo que no controlas
Un test que usa la fecha de hoy, un orden de un `set` o una llamada a una API real pasa hoy y falla mañana. Pasa la fecha como parámetro, ordena antes de comparar y reemplaza lo externo por datos fijos.
:::

:::practica python Medir tus tests contra mutantes
1. Ejecuta: hay una función correcta, tres versiones con errores y un conjunto de tests. El programa dice qué mutantes sobreviven (no fueron detectados).
2. Agrega casos a `CASOS` hasta que no sobreviva ningún mutante.
3. Inventa un cuarto mutante (por ejemplo, que no quite espacios a los costados) y comprueba si tus casos lo detectan.

```python
def correcta(estado):
    mapa = {"delivered": "entregado", "shipped": "enviado", "canceled": "cancelado"}
    e = estado.strip().lower()
    return mapa.get(e, e)

def mutante_sin_strip(estado):
    mapa = {"delivered": "entregado", "shipped": "enviado", "canceled": "cancelado"}
    e = estado.lower()
    return mapa.get(e, e)

def mutante_sin_lower(estado):
    mapa = {"delivered": "entregado", "shipped": "enviado", "canceled": "cancelado"}
    e = estado.strip()
    return mapa.get(e, e)

def mutante_sin_traducir(estado):
    return estado.strip().lower()

CASOS = [("entregado", "entregado")]   # ← agrega casos aquí

def pasa(f):
    return all(f(entrada) == esperado for entrada, esperado in CASOS)

assert pasa(correcta), "Tus casos tienen que pasar con la versión correcta"
for m in (mutante_sin_strip, mutante_sin_lower, mutante_sin_traducir):
    print(f"{m.__name__:22}", "detectado ✓" if not pasa(m) else "SOBREVIVE ✗")
```

Reto: escribe la misma idea para `limpiar_monto` con un mutante que solo cambie la coma por punto.

Documentación oficial: [pytest: parametrize](https://docs.pytest.org/en/stable/how-to/parametrize.html) · [pytest: primeros pasos](https://docs.pytest.org/en/stable/getting-started.html)
:::

:::errores
- **Probar solo el caso feliz.** Los errores viven en los bordes y en los formatos raros.
- **Copiar el resultado del código como "esperado".** Si el código está mal, el test queda mal. Calcula el esperado a mano.
- **Un test gigante que prueba todo.** Cuando falla no sabes qué se rompió.
- **Tests que dependen del día o de internet.** Pasa esos valores como parámetros.
:::

:::entrevista
**Pregunta:** "¿Cómo pruebas un pipeline de datos?"

**Respuesta modelo:** "En tres niveles. Tests unitarios de cada transformación como función pura, con casos sacados del perfil de los datos reales, incluidos los formatos raros. Pruebas de datos sobre la salida (unicidad, nulos, relaciones, rangos) que corren en cada ejecución. Y una prueba de punta a punta con un conjunto chico y fijo de entrada cuya salida conozco. Además verifico que el pipeline sea idempotente: correrlo dos veces sobre el mismo día no debe cambiar el resultado."
:::

## Ejercicios

:::ejercicio quiz
Tus tests pasan con la función correcta y también con una versión que tiene un error conocido. ¿Qué significa?
- [ ] Que el error no importa
- [ ] Que la función correcta está mal
- [x] Que a tus tests les falta un caso que distinga las dos versiones
- [ ] Que hay que borrar ese test
:::

:::ejercicio python dificultad=Avanzado titulo="Tests que atrapan los errores de normalizar_estado"
Escribe `probar_normalizar(f)`: una función que reciba una implementación de `normalizar_estado` y haga `assert` sobre ella. La versión correcta quita espacios a los costados, pasa a minúsculas y traduce `delivered`→`entregado`, `shipped`→`enviado`, `canceled`→`cancelado` (lo demás queda igual, en minúsculas). Tus asserts deben **pasar** con la versión correcta y **fallar** con tres versiones con errores: una que no quita espacios, una que no pasa a minúsculas y una que no traduce.
```python inicial
def probar_normalizar(f):
    assert f("entregado") == "entregado"
    # agrega asserts que detecten cada error
```
```python solucion
def probar_normalizar(f):
    assert f("entregado") == "entregado"
    assert f("  enviado ") == "enviado"
    assert f("ENTREGADO") == "entregado"
    assert f("delivered") == "entregado"
    assert f(" Shipped") == "enviado"
```
```pista
Necesitas al menos un caso con espacios, uno con mayúsculas y uno en inglés. Cada caso "mata" a un mutante.
```
```python test
def _ok(e):
    m = {"delivered": "entregado", "shipped": "enviado", "canceled": "cancelado"}
    e = e.strip().lower(); return m.get(e, e)
def _sin_strip(e):
    m = {"delivered": "entregado", "shipped": "enviado", "canceled": "cancelado"}
    e = e.lower(); return m.get(e, e)
def _sin_lower(e):
    m = {"delivered": "entregado", "shipped": "enviado", "canceled": "cancelado"}
    e = e.strip(); return m.get(e, e)
def _sin_traducir(e):
    return e.strip().lower()
probar_normalizar(_ok)
for _m, _nombre in [(_sin_strip, "no quita espacios"), (_sin_lower, "no pasa a minúsculas"), (_sin_traducir, "no traduce del inglés")]:
    try:
        probar_normalizar(_m)
    except AssertionError:
        pass
    else:
        raise AssertionError(f"Tus tests no detectan la versión que {_nombre}")
```
:::

:::ejercicio python dificultad=Experto titulo="Tests que atrapan los errores de limpiar_monto"
Escribe `probar_monto(f)` para una función que convierte montos de texto a número: `"16.99"`→`16.99`, `"$47.99"`→`47.99`, `"974,07"`→`974.07`, `"1.402,97"`→`1402.97` y `None`→`None`. Tus asserts deben pasar con la versión correcta y fallar con tres versiones con errores: una que solo cambia la coma por punto (rompe `1.402,97`), una que no quita el `$` y una que no acepta `None`.
```python inicial
def probar_monto(f):
    assert f("16.99") == 16.99
```
```python solucion
def probar_monto(f):
    assert f("16.99") == 16.99
    assert f("$47.99") == 47.99
    assert f("974,07") == 974.07
    assert f("1.402,97") == 1402.97
    assert f(None) is None
```
```pista
Un caso por cada mutante: `"1.402,97"` detecta al que solo cambia la coma, `"$47.99"` al que no quita el signo y `None` al que no acepta nulos. Como en pytest, si el mutante lanza una excepción con tu caso, también cuenta como detectado.
```
```python test
def _ok(t):
    if t is None: return None
    t = t.replace("$", "")
    if "," in t: t = t.replace(".", "").replace(",", ".")
    return float(t)
def _solo_coma(t):
    if t is None: return None
    return float(t.replace("$", "").replace(",", "."))
def _sin_signo(t):
    if t is None: return None
    if "," in t: t = t.replace(".", "").replace(",", ".")
    return float(t)
def _sin_none(t):
    t = t.replace("$", "")
    if "," in t: t = t.replace(".", "").replace(",", ".")
    return float(t)
probar_monto(_ok)
for _m, _nombre in [(_solo_coma, "solo cambia la coma por punto"), (_sin_signo, "no quita el $"), (_sin_none, "no acepta None")]:
    try:
        probar_monto(_m)
    except Exception:
        pass  # como en pytest: un assert que falla o una excepción inesperada cuentan como test fallado
    else:
        raise AssertionError(f"Tus tests no detectan la versión que {_nombre}")
```
:::

:::ejercicio python dificultad=Avanzado titulo="¿Es idempotente?"
Escribe `es_idempotente(f, casos)` que devuelva `True` si para **todos** los casos aplicar `f` dos veces da lo mismo que aplicarla una (`f(f(x)) == f(x)`), y `False` si alguno no cumple.
```python inicial
def es_idempotente(f, casos):
    pass
```
```python solucion
def es_idempotente(f, casos):
    return all(f(f(x)) == f(x) for x in casos)
```
```pista
`all(...)` con una expresión generadora recorre los casos y se detiene en el primero que no cumple.
```
```python test
assert es_idempotente(lambda s: s.strip().lower(), ["  Ana ", "LUIS", ""]) is True
assert es_idempotente(lambda n: n + 1, [1, 2]) is False
assert es_idempotente(lambda xs: sorted(set(xs)), [[3, 1, 3], []]) is True
assert es_idempotente(lambda s: "x" + s, ["a"]) is False
assert es_idempotente(abs, []) is True
```
:::

:::ejercicio python dificultad=Avanzado titulo="Primero el test, después el código"
Los tests ya están escritos (así se trabaja con TDD). Escribe `normalizar_email(texto)` para que los cumpla: quita espacios a los costados, pasa a minúsculas, y devuelve `None` si el texto es `None`, está vacío o no tiene exactamente un `@` con algo antes y después.
```python inicial
def normalizar_email(texto):
    pass
```
```python solucion
def normalizar_email(texto):
    if texto is None:
        return None
    t = texto.strip().lower()
    if t.count("@") != 1:
        return None
    usuario, dominio = t.split("@")
    if not usuario or not dominio:
        return None
    return t
```
```pista
Primero los casos que devuelven `None` (nulo, vacío, cantidad de `@` distinta de 1, nada antes o después del `@`), y al final el caso feliz.
```
```python test
assert normalizar_email("  Ana@Correo.COM ") == "ana@correo.com", f"Obtuviste {normalizar_email('  Ana@Correo.COM ')!r}"
assert normalizar_email(None) is None
assert normalizar_email("   ") is None
assert normalizar_email("sin-arroba.com") is None
assert normalizar_email("a@@b.com") is None
assert normalizar_email("@b.com") is None
assert normalizar_email("a@") is None
assert normalizar_email(normalizar_email("X@Y.com")) == "x@y.com"
```
:::
