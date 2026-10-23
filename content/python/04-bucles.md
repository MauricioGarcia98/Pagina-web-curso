---
titulo: Bucles: for y while
nivel: Básico
duracion: 25
resumen: Repetir acciones, range, acumuladores, break y continue.
---

Un **bucle** repite un bloque de código. Es lo que hace a las computadoras útiles: hacer lo mismo un millón de veces sin cansarse.

## for: recorrer una colección

```python
paises = ["Argentina", "Chile", "México"]
for pais in paises:
    print("Procesando", pais)
```

En cada vuelta, la variable `pais` toma el siguiente elemento.

También puedes recorrer los caracteres de un texto: `for letra in "hola":`.

## range: repetir N veces

```python
for i in range(5):        # 0, 1, 2, 3, 4
    print(i)

for i in range(1, 11, 2): # desde 1 hasta 10, de 2 en 2: 1, 3, 5, 7, 9
    print(i, end=" ")
```

## El patrón acumulador

Muy común en datos: recorrer y **acumular** un total, un conteo, un máximo…

```python
ventas = [120, 340, 90, 560, 210]
total = 0
mayores_a_200 = 0
for v in ventas:
    total += v              # es lo mismo que total = total + v
    if v > 200:
        mayores_a_200 += 1
print("Total:", total, "| Ventas > 200:", mayores_a_200)
```

## while: repetir mientras se cumpla una condición

```python
saldo = 1000
meses = 0
while saldo < 2000:
    saldo = saldo * 1.05   # 5% de interés mensual
    meses += 1
print(f"Se duplica en {meses} meses (saldo: {saldo:.2f})")
```

:::cuidado Bucles infinitos
Si la condición del `while` nunca se vuelve falsa, el programa no termina. Aquí el sitio corta la ejecución a los 45 segundos, pero en tu computadora tendrás que presionar <kbd>Ctrl</kbd>+<kbd>C</kbd>.
:::

## break y continue

- `break` sale del bucle inmediatamente.
- `continue` salta a la siguiente vuelta.

```python
lecturas = [22, 23, -999, 24, 25, None, 26]
for x in lecturas:
    if x is None:
        print("Fin de datos")
        break
    if x == -999:          # valor de error del sensor
        continue
    print("Lectura válida:", x)
```

## enumerate y zip

```python
productos = ["Mouse", "Teclado", "Monitor"]
precios = [25, 49, 210]

for i, p in enumerate(productos, start=1):
    print(i, p)

for p, precio in zip(productos, precios):
    print(f"{p}: ${precio}")
```

## Ejercicios

:::ejercicio python
Calcula la suma de todos los números del 1 al 100 (incluidos) con un bucle `for` y guárdala en `suma`.
```python solucion
suma = 0
for i in range(1, 101):
    suma += i
```
```python test
assert suma == 5050, f"suma debería ser 5050 y es {suma}"
```
:::

:::ejercicio python
Dada la lista `montos`, calcula en `total_validos` la suma de los montos **positivos** (ignora los negativos y los ceros) y en `cantidad_invalidos` cuántos no son positivos.
```python inicial
montos = [120.5, -30, 0, 45.5, 300, -1, 89]
```
```python solucion
montos = [120.5, -30, 0, 45.5, 300, -1, 89]
total_validos = 0
cantidad_invalidos = 0
for m in montos:
    if m > 0:
        total_validos += m
    else:
        cantidad_invalidos += 1
```
```python test
assert abs(total_validos - 555.0) < 1e-9, f"total_validos debería ser 555.0 y es {total_validos}"
assert cantidad_invalidos == 3, f"cantidad_invalidos debería ser 3 y es {cantidad_invalidos}"
```
:::

:::ejercicio python
Imprime los números del 1 al 15, uno por línea, pero: si es múltiplo de 3 imprime `Fizz`, si es múltiplo de 5 imprime `Buzz` y si es múltiplo de ambos imprime `FizzBuzz`. (¡El clásico FizzBuzz de entrevistas!)
```python solucion
for i in range(1, 16):
    if i % 15 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)
```
```python test
esperado = ["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz"]
lineas = salida.strip().split("\n")
assert lineas == esperado, f"Salida incorrecta. Primeras líneas: {lineas[:6]}"
```
```pista
Pregunta primero por el múltiplo de 15 (de 3 **y** de 5); si no, el `if` de 3 se lo “ganaría”.
```
:::

:::ejercicio python
Con un `while`, calcula cuántos **años** (`anios`) tarda una población de `1000` en superar `5000` si crece un `12%` por año.
```python solucion
poblacion = 1000
anios = 0
while poblacion <= 5000:
    poblacion *= 1.12
    anios += 1
```
```python test
assert anios == 15, f"anios debería ser 15 y es {anios}"
```
:::
