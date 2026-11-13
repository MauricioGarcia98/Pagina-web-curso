---
titulo: Tests con pytest - comprobar automáticamente que tu código hace lo que dice
nivel: 3 · Intermedio
duracion: 45
resumen: Un test es un pequeño programa que comprueba que otro funciona. Cómo separar la lógica en funciones, escribir tests con pytest (archivos test_*.py, funciones test_* y assert), ejecutarlos desde VS Code, leer un fallo, cubrir casos borde y por qué los tests son lo que permite cambiar código sin miedo.
objetivos: Separar la lógica de un script en funciones probables | Escribir tests con pytest siguiendo sus convenciones | Ejecutar los tests y leer el resultado | Interpretar un test que falla | Elegir qué casos probar, incluidos los bordes
prerrequisitos: vscode-problemas-y-calidad
autoevaluacion: ¿Sabes cómo tiene que llamarse un archivo de tests? | ¿Sabes escribir un test con assert? | ¿Sabes leer qué falló en un test? | ¿Sabes qué es un caso borde?
---

:::analogia En palabras simples
Un test es una pregunta con respuesta conocida: "si el precio es 100 y el descuento 10 %, ¿el resultado es 90?". Si mañana alguien cambia la función, los tests vuelven a preguntar todo en un segundo y te avisan si algo se rompió.
:::

## Paso 1 — La función a probar

Crea **scripts/precios.py**:

```python norun
def con_descuento(precio, descuento):
    """Precio con descuento (descuento entre 0 y 1)."""
    return round(precio * (1 - descuento), 2)
```

Para poder probar algo, tiene que estar en una **función** que reciba datos y devuelva un resultado. Un script que lee un CSV e imprime no se puede probar fácil; una función sí.

## Paso 2 — Los tests

Crea **scripts/test_precios.py**:

```python norun
from precios import con_descuento


def test_descuento_normal():
    assert con_descuento(100, 0.1) == 90


def test_sin_descuento():
    assert con_descuento(80, 0) == 80
```

| Convención de pytest | Ejemplo |
|---|---|
| El archivo empieza con `test_` | `test_precios.py` |
| Cada test es una función que empieza con `test_` | `def test_sin_descuento():` |
| Adentro, `assert` con lo que esperas | `assert con_descuento(80, 0) == 80` |

## Paso 3 — Ejecuta los tests

En la terminal, desde la carpeta `scripts`:

```bash
cd ~/scripts
pytest
```

(O en la paleta: **Python: ejecutar los tests (pytest)**.)

```captura
archivo: vscode/v11-pytest.webp
texto: pytest encuentra los dos tests y los dos pasan: 2 passed, 0 failed
```

## Paso 4 — Un test que falla

Agrega un test con un error a propósito:

```python norun
def test_descuento_total():
    assert con_descuento(50, 1) == 5
```

Ejecuta `pytest`: aparece **FAILED** con el detalle `assert 0.0 == 5`. Se lee: "esperabas 5, la función devolvió 0.0". Acá el error está en el test (con 100 % de descuento el precio es 0); en la vida real, puede estar en la función. Corrige el test (`== 0`) y vuelve a ejecutar.

## Paso 5 — Qué probar

| Tipo de caso | Ejemplo para `con_descuento` |
|---|---|
| El caso normal | 100 con 10 % → 90 |
| Sin efecto | descuento 0 → el mismo precio |
| El extremo | descuento 1 → 0 |
| Decimales | 19,99 con 15 % → 16,99 (redondeo) |
| Entrada inválida | descuento 1,5 → ¿debería dar error? Decídelo y pruébalo |

:::tip Los tests protegen el futuro
El valor de un test no es el día que lo escribes, sino el día que alguien cambia la función "para mejorarla" y el test avisa que rompió un caso. Con tests, se puede cambiar código sin miedo; sin tests, cada cambio es una apuesta.
:::

## Paso 6 — En VS Code real

La extensión de Python tiene una vista **Testing** (ícono de matraz) que descubre los tests, los ejecuta con un clic y muestra ✓ o ✗ al lado de cada uno, incluso dentro del editor. En esta práctica se ejecutan desde la terminal o la paleta.

## ✅ Lo que lograste

- Separaste lógica en funciones y la probaste con pytest.
- Lees tests que pasan y que fallan.
- Sabes elegir casos, incluidos los bordes.

:::ejercicio quiz
¿Cuál de estos archivos encuentra pytest automáticamente?
- [ ] `pruebas.py`
- [x] `test_ventas.py`
- [ ] `ventas_test.txt`
- [ ] `ventas.py`
:::

:::ejercicio quiz
pytest muestra `assert 0.0 == 5`. ¿Qué significa?
- [ ] Que el test pasó
- [x] Que la función devolvió 0.0 y el test esperaba 5
- [ ] Que falta un import
- [ ] Que pytest no está instalado
:::

:::ejercicio quiz
¿Por qué conviene que la lógica esté en funciones y no suelta en el script?
- [ ] Porque Python no ejecuta código suelto
- [x] Porque una función recibe datos y devuelve un resultado que se puede comprobar con un test
- [ ] Porque ocupa menos líneas
- [ ] Porque así no hace falta ejecutar el script
:::
