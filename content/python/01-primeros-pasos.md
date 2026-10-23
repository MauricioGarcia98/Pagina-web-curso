---
titulo: Primeros pasos: print, comentarios y variables
nivel: Básico
duracion: 20
resumen: Qué es programar, tu primer programa y cómo guardar datos en variables.
---

**Programar** es escribir instrucciones precisas para que la computadora las ejecute **en orden**, una por una. **Python** es el lenguaje más popular para datos porque se lee casi como inglés, tiene librerías para todo (pandas, PySpark, Airflow, dbt están hechos con o para Python) y es fácil de aprender.

Aquí Python se ejecuta **en tu navegador** (gracias a Pyodide). La primera vez tarda unos segundos en cargar.

## Tu primer programa

```python
print("¡Hola, mundo!")
print("Estoy aprendiendo Python")
```

`print()` muestra en pantalla lo que pongas entre paréntesis. El texto va entre comillas (simples `'` o dobles `"`, da igual).

## Comentarios

Todo lo que va después de `#` es un **comentario**: Python lo ignora. Sirve para explicar el código a otras personas (¡y a tu yo del futuro!).

```python
# Esto es un comentario
print(2 + 3)  # también puede ir al final de una línea
```

## Variables

Una **variable** es un nombre que guarda un valor, como una caja con etiqueta. Se crea con `=` (asignación):

```python
nombre = "Lucía"
edad = 29
altura = 1.68
es_cliente = True

print(nombre)
print(edad + 1)
print("Nombre:", nombre, "- Edad:", edad)
```

:::analogia Una variable es una etiqueta
`edad = 29` pega la etiqueta `edad` en el valor 29. Si después haces `edad = 30`, despegas la etiqueta y la pegas en el 30.
:::

Reglas para los nombres:

- Letras, números y `_`; no pueden empezar con número; sin espacios ni tildes (mejor evitarlas).
- Distinguen mayúsculas: `Edad` y `edad` son distintas.
- Convención en Python: `snake_case` (minúsculas con guiones bajos): `precio_total`, `fecha_pedido`.

## Operaciones con números

| Operador | Qué hace | Ejemplo | Resultado |
|---|---|---|---|
| `+` `-` `*` | suma, resta, multiplicación | `3 * 4` | `12` |
| `/` | división (siempre decimal) | `7 / 2` | `3.5` |
| `//` | división entera | `7 // 2` | `3` |
| `%` | resto | `7 % 2` | `1` |
| `**` | potencia | `2 ** 10` | `1024` |

```python
precio = 120
cantidad = 3
descuento = 0.1
total = precio * cantidad * (1 - descuento)
print("Total a pagar:", total)
```

:::tip ¿Cómo se corrigen los ejercicios?
Escribes tu código y presionas **✓ Comprobar**. El sitio ejecuta tu código y luego unas **pruebas** que revisan lo que imprimiste o el valor de tus variables.
:::

## Ejercicios

:::ejercicio python
Imprime exactamente el texto `Hola, Python`.
```python inicial
# escribe tu código aquí
```
```python solucion
print("Hola, Python")
```
```python test
assert salida.strip() == "Hola, Python", f"Se esperaba 'Hola, Python' y se imprimió {salida.strip()!r}"
```
:::

:::ejercicio python
Crea una variable `ciudad` con el valor `"Bogotá"` y una variable `habitantes` con el valor `7900000`. Luego imprime `ciudad`.
```python solucion
ciudad = "Bogotá"
habitantes = 7900000
print(ciudad)
```
```python test
assert ciudad == "Bogotá", "La variable ciudad debe valer 'Bogotá'"
assert habitantes == 7900000, "La variable habitantes debe valer 7900000 (sin puntos)"
assert "Bogotá" in salida, "Debes imprimir la ciudad"
```
```pista
Los números grandes se escriben sin puntos de miles: `7900000` (o `7_900_000`, Python permite guiones bajos para leer mejor).
```
:::

:::ejercicio python
Un producto cuesta `250` y tiene un descuento del `15%`. Calcula el precio final en una variable llamada `precio_final` (debe valer `212.5`) e imprímela.
```python inicial
precio = 250
descuento = 0.15
# precio_final = ...
```
```python solucion
precio = 250
descuento = 0.15
precio_final = precio * (1 - descuento)
print(precio_final)
```
```python test
assert abs(precio_final - 212.5) < 1e-9, f"precio_final debería ser 212.5 y es {precio_final}"
```
:::

:::ejercicio python
Tienes `47` huevos y cajas de `12`. Calcula en `cajas_llenas` cuántas cajas completas puedes llenar y en `sobrantes` cuántos huevos quedan sueltos.
```python inicial
huevos = 47
```
```python solucion
huevos = 47
cajas_llenas = huevos // 12
sobrantes = huevos % 12
```
```python test
assert cajas_llenas == 3, "cajas_llenas debería ser 3 (usa //)"
assert sobrantes == 11, "sobrantes debería ser 11 (usa %)"
```
:::
