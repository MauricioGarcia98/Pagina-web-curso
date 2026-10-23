---
titulo: Bucles: for y while
nivel: Básico
duracion: 35
resumen: Repetir acciones, range, acumuladores, break y continue.
---

## Repetir sin copiar y pegar

Imagina que tienes que imprimir el total de 12.000 pedidos. No vas a escribir 12.000 `print`. Un **bucle** repite un bloque de código tantas veces como haga falta: para cada pedido, para cada línea de un archivo, para cada día de un mes, hasta que se cumpla una condición. Es lo que hace a las computadoras útiles: hacer lo mismo un millón de veces sin cansarse ni equivocarse.

Python tiene dos bucles:

| Bucle | Cuándo usarlo | Ejemplo |
|---|---|---|
| `for` | Cuando **recorres** una colección o sabes cuántas veces repetir | Para cada fila del archivo… |
| `while` | Cuando repites **mientras** se cumpla una condición, sin saber cuántas veces | Mientras queden páginas en la API… |

## for: recorrer una colección

```python
paises = ["Argentina", "Chile", "México"]
for pais in paises:
    print("Procesando", pais)
print("Listo")
```

Qué pasa, vuelta por vuelta (cada vuelta se llama **iteración**):

| Iteración | `pais` vale | Se imprime |
|---|---|---|
| 1 | `"Argentina"` | Procesando Argentina |
| 2 | `"Chile"` | Procesando Chile |
| 3 | `"México"` | Procesando México |
| (fin) | — | Listo |

- `pais` es una variable que **creas en el `for`**; en cada vuelta toma el siguiente elemento. El nombre lo eliges tú: usa el singular de la colección (`for cliente in clientes`, `for linea in lineas`).
- Igual que con `if`: dos puntos al final y bloque con sangría.

Con `for` puedes recorrer cualquier cosa "recorrible" (*iterable*): listas, textos (letra por letra), diccionarios, líneas de un archivo, filas de una consulta.

```python
for letra in "SQL":
    print(letra)
```

## range: repetir un número de veces

`range` genera una secuencia de números sin tener que escribirla:

| Llamada | Genera | Para qué |
|---|---|---|
| `range(5)` | 0, 1, 2, 3, 4 | Repetir 5 veces (empieza en 0, **no** incluye el 5) |
| `range(1, 6)` | 1, 2, 3, 4, 5 | Desde 1 hasta 5 |
| `range(0, 10, 2)` | 0, 2, 4, 6, 8 | De 2 en 2 |
| `range(10, 0, -1)` | 10, 9, … 1 | Cuenta regresiva |

```python
for i in range(5):
    print("Intento", i)

for i in range(1, 11, 2):
    print(i, end=" ")       # end=" " imprime en la misma línea, separado por espacios
```

## El patrón acumulador

Es **el** patrón más común en procesamiento de datos. Una variable empieza en un valor inicial (antes del bucle) y en cada vuelta se actualiza:

```python
ventas = [120, 340, 90, 560, 210]
total = 0              # 1) inicializar ANTES del bucle
mayores_a_200 = 0
for v in ventas:
    total += v         # 2) acumular en cada vuelta (total = total + v)
    if v > 200:
        mayores_a_200 += 1
print("Total:", total, "| Ventas > 200:", mayores_a_200)   # 3) usar DESPUÉS
```

| Vuelta | `v` | `total` después | `mayores_a_200` después |
|---|---|---|---|
| inicio | — | 0 | 0 |
| 1 | 120 | 120 | 0 |
| 2 | 340 | 460 | 1 |
| 3 | 90 | 550 | 1 |
| 4 | 560 | 1110 | 2 |
| 5 | 210 | 1320 | 3 |

Hacer esta tabla a mano (una "prueba de escritorio") es la mejor forma de entender o depurar un bucle.

:::cuidado Inicializar dentro del bucle
Si escribes `total = 0` **dentro** del `for`, se reinicia en cada vuelta y al final solo tendrás la última venta. El acumulador se crea **antes** del bucle y se usa **después**.
:::

El mismo patrón sirve para contar, buscar el máximo, armar una lista nueva:

```python
precios = [25.0, 120.5, 8.9, 64.0]
maximo = precios[0]
baratos = []
for p in precios:
    if p > maximo:
        maximo = p
    if p < 30:
        baratos.append(p)      # agregar a una lista (lección siguiente)
print(maximo, baratos)
```

Ese "recorro, filtro y acumulo" es exactamente lo que hacen `WHERE` + `SUM` en SQL, o `filter` + `agg` en PySpark: el motor hace el bucle por ti.

## while: repetir mientras se cumpla una condición

```python
saldo = 1000
meses = 0
while saldo < 2000:
    saldo = saldo * 1.05   # 5 % de interés mensual
    meses += 1
print(f"Se duplica en {meses} meses (saldo: {saldo:.2f})")
```

Antes de cada vuelta, Python evalúa la condición: si es verdadera ejecuta el bloque y vuelve a preguntar; cuando es falsa, sigue con el código de abajo. No sabíamos de antemano cuántas vueltas haría (resultan 15): por eso `while`.

Usos reales en ingeniería de datos: pedir páginas a una API **mientras** haya más resultados, reintentar una conexión **mientras** no se logre (y no se superen 5 intentos), esperar a que aparezca un archivo.

:::cuidado Bucles infinitos
Si la condición del `while` nunca se vuelve falsa, el programa no termina nunca. Asegúrate de que **algo dentro del bloque** acerque la condición a su fin (aquí, `saldo` crece). En este sitio la ejecución se corta sola a los 45 segundos; en tu computadora tendrás que presionar <kbd>Ctrl</kbd>+<kbd>C</kbd>.
:::

## break y continue: controlar el bucle desde adentro

| Instrucción | Qué hace |
|---|---|
| `break` | Sale del bucle **inmediatamente** (no hace más vueltas) |
| `continue` | Abandona la vuelta actual y pasa a la **siguiente** |

```python
lecturas = [22, 23, -999, 24, 25, None, 26]
for x in lecturas:
    if x is None:          # marca de fin de datos
        print("Fin de datos")
        break
    if x == -999:          # valor de error del sensor: ignorarlo
        continue
    print("Lectura válida:", x)
```

Resultado: 22, 23, (salta el −999), 24, 25, "Fin de datos" (el 26 nunca se procesa). `continue` es ideal para **descartar** registros inválidos sin anidar todo el resto en un `if`.

## enumerate y zip

Dos ayudantes que evitan manejar índices a mano:

```python
productos = ["Mouse", "Teclado", "Monitor"]
precios = [25, 49, 210]

# enumerate: el elemento y su posición
for i, p in enumerate(productos, start=1):
    print(i, p)

# zip: recorrer dos listas en paralelo
for p, precio in zip(productos, precios):
    print(f"{p}: ${precio}")
```

`enumerate` es útil para numerar líneas ("error en la fila 37 del archivo"). `zip` empareja elementos de igual posición; si las listas tienen distinto largo, se detiene en la más corta.

:::experto ¿Bucles en big data?
En Python puro, un bucle sobre 10 millones de filas es lento (segundos o minutos). Por eso en datos grandes se usan herramientas que ejecutan el bucle "por dentro" de forma optimizada: SQL, pandas, PySpark. Pero la **lógica** es la misma, y entender bucles te permite entender qué hacen esas herramientas.
:::

## Resumen

- `for x in coleccion:` recorre elemento por elemento; `range(n)` genera números (sin incluir `n`).
- Patrón acumulador: inicializa antes, actualiza dentro, usa después.
- `while condición:` repite mientras sea verdadera; asegúrate de que termine.
- `break` sale del bucle; `continue` salta a la siguiente vuelta.
- `enumerate` da posición + elemento; `zip` recorre listas en paralelo.

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
