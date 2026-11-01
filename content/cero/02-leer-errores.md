---
titulo: Los errores son tus amigos - cómo leer cualquier mensaje de error
nivel: Básico
duracion: 35
resumen: Un error no es un fracaso: es la computadora diciéndote exactamente qué no entendió. Aprende a leerlo en Python, SQL y la terminal.
objetivos: Reconocer las tres partes de todo mensaje de error (dónde, qué tipo, por qué) | Leer un error de Python de abajo hacia arriba | Leer un error de SQL y de la terminal | Arreglar los errores más comunes de principiante | Seguir un método fijo cuando algo falla
prerrequisitos: cero-tu-computadora
autoevaluacion: ¿Sabes por qué un error de Python se lee desde la última línea? | ¿Sabes qué significa `NameError`? | ¿Sabes qué significa `no such column` en SQL? | ¿Sabes qué hacer cuando la terminal dice `command not found`? | ¿Tienes un método de 5 pasos para cuando algo falla?
---

:::escenario El primer error rojo
Escribes tu primer programa, presionas **Ejecutar** y aparece un texto rojo lleno de palabras en inglés. La reacción natural es pensar "rompí algo" o "esto no es para mí".

Martín, tu líder, que programa hace 15 años, te dice: *"Yo veo errores rojos cien veces por día. La diferencia es que ya no me asustan: los leo. El error casi siempre te dice qué pasó y en qué línea."* En esta lección aprendes a leerlos.
:::

## Un error es un mensaje, no un castigo

La computadora no tiene sentido común: hace exactamente lo que escribiste. Cuando algo no tiene sentido para ella, **se detiene y te explica por qué**. Ese texto rojo es la explicación. Equivocarse es la forma normal de programar: todo programador profesional escribe, ejecuta, lee el error, corrige y vuelve a ejecutar, muchas veces por hora.

:::analogia El GPS que recalcula
Un error es como el GPS diciendo "recalculando". No te reta: te avisa que te desviaste y por dónde. Lo peor que puedes hacer es ignorarlo; lo mejor, leer qué dice.
:::

## Las tres preguntas que responde todo error

Todos los mensajes de error, en cualquier lenguaje, responden tres preguntas:

1. **¿Dónde?** El archivo y la línea donde la computadora se trabó.
2. **¿Qué tipo de problema?** Un nombre que clasifica el error: `NameError`, `SyntaxError`, `no such column`…
3. **¿Por qué?** Una frase que explica el detalle: `name 'precio' is not defined` (el nombre `precio` no está definido).

## Errores de Python: se leen de abajo hacia arriba

Python muestra un **traceback** (el "rastro" de por dónde pasó el programa antes de fallar). La parte importante está **al final**:

```text norun
Traceback (most recent call last):
  File "ventas.py", line 3, in <module>
    total = precio * cantidad
            ^^^^^^
NameError: name 'precio' is not defined
```

- **Última línea**: el tipo (`NameError`) y el porqué (`name 'precio' is not defined`: "el nombre 'precio' no está definido").
- **Arriba**: dónde (`ventas.py`, línea 3) y la línea exacta, con `^^^^` señalando el pedazo culpable.

Traducido: "en la línea 3 usaste `precio`, pero nunca le diste un valor". Quizá lo escribiste distinto más arriba (`Precio`, `precios`) o te olvidaste de crearlo.

### Los errores de Python más comunes al empezar

| Error | Qué significa | La causa típica |
|---|---|---|
| `SyntaxError` | Escribiste algo que no es Python válido | Falta un `:`, un paréntesis o una comilla |
| `IndentationError` | La sangría (espacios al principio) está mal | Mezclar espacios, olvidar sangrar después de `if` o `for` |
| `NameError` | Usaste un nombre que no existe | Error de tipeo, o usar la variable antes de crearla |
| `TypeError` | Mezclaste tipos que no se combinan | Sumar texto con número: `"Total: " + 5` |
| `ValueError` | El tipo está bien pero el valor no sirve | `int("hola")`: no se puede convertir |
| `KeyError` | Pediste una clave que el diccionario no tiene | `cliente["email"]` cuando no hay `email` |
| `IndexError` | Pediste una posición que la lista no tiene | `lista[10]` en una lista de 3 elementos |
| `ZeroDivisionError` | Dividiste por cero | Un promedio de una lista vacía |
| `FileNotFoundError` | El archivo no está donde dijiste | Ruta relativa desde otra carpeta |
| `ModuleNotFoundError` | La librería no está instalada | Falta `pip install` o `uv add` |

## Errores de SQL

Los errores de SQL son más cortos y casi siempre nombran el culpable:

```text norun
Error: no such column: emial
```

"No existe la columna `emial`": un error de tipeo (era `email`). Los más comunes:

| Mensaje | Qué significa |
|---|---|
| `no such table: X` | La tabla `X` no existe (tipeo, o el nombre es otro) |
| `no such column: X` | La columna `X` no existe en esas tablas |
| `near "X": syntax error` | Justo **antes** de `X` hay algo mal escrito: una coma de más o de menos, una palabra mal puesta |
| `ambiguous column name: X` | Dos tablas del JOIN tienen la columna `X` y no dijiste de cuál: usa `tabla.X` |
| `misuse of aggregate` | Usaste `SUM` o `COUNT` donde no se puede (por ejemplo en el `WHERE`; va en el `HAVING`) |

:::tip El "near" apunta después del error
En `near "FROM": syntax error`, el problema casi nunca es el `FROM` en sí: es lo que está **justo antes**. Lo más común: una coma después de la última columna del `SELECT` (`SELECT nombre, email, FROM clientes`).
:::

## Errores de la terminal

| Mensaje | Qué significa | Qué hacer |
|---|---|---|
| `command not found` | Ese comando no existe o no está instalado | Revisa cómo lo escribiste; si está bien, instálalo |
| `No such file or directory` | El archivo o la carpeta no está en esa ruta | Usa `pwd` y `ls` para ver dónde estás y qué hay |
| `Permission denied` | No tienes permiso para eso | Revisa de quién es el archivo; en un script, falta `chmod +x` |
| `Is a directory` | Usaste una carpeta donde iba un archivo | Revisa la ruta |

## El método de los 5 pasos

Cuando algo falla, sigue siempre los mismos pasos:

1. **Lee la última línea** del error, con calma, entera.
2. **Ve a la línea** que indica y mírala con lupa: comillas, paréntesis, dos puntos, mayúsculas.
3. **Traduce** el mensaje (la lección de inglés técnico te ayuda) y pregúntate: ¿qué esperaba la computadora y qué le di?
4. **Cambia una sola cosa** y vuelve a ejecutar. Si cambias cinco cosas a la vez, no sabes cuál lo arregló (o cuál lo empeoró).
5. Si después de 15 minutos sigues trabado, **busca el mensaje exacto** o pregunta (te enseñamos cómo en la lección "Cómo aprender esto").

:::experto Leer el error es una habilidad de senior
Los programadores senior no cometen menos errores: los resuelven más rápido porque leen el mensaje completo antes de tocar nada. En una entrevista técnica, decir en voz alta "el error dice que la columna no existe, así que voy a revisar el nombre" suma muchos puntos.
:::

## Practica

En los ejercicios de código, el editor ya trae el programa **con el error**. Ejecútalo (▶ o Ctrl + Enter), lee el mensaje, arréglalo y presiona **Comprobar**.

:::errores
- **Leer solo la primera línea del traceback**: lo importante está al final.
- **Copiar y pegar el error en un buscador sin leerlo**: muchas veces la respuesta está en el propio mensaje.
- **Cambiar muchas cosas a la vez**: pierdes el hilo de qué arregló qué.
:::

:::ejercicio quiz
Este es un error de Python. ¿Qué te está diciendo?

```text norun
  File "pedidos.py", line 7, in <module>
    print(total_pedidos)
NameError: name 'total_pedidos' is not defined
```
- [ ] Que la línea 7 tiene un error de sintaxis
- [x] Que en la línea 7 se usa `total_pedidos`, pero esa variable nunca se creó (o se escribió distinto)
- [ ] Que falta instalar una librería
- [ ] Que el archivo `pedidos.py` no existe
```explicacion
`NameError` + `is not defined` = usaste un nombre que Python no conoce. Busca más arriba dónde debería haberse creado `total_pedidos`: quizá se llama `total_pedido` o `totalPedidos`.
```
:::

:::ejercicio python titulo="Arregla el NameError"
Este programa calcula el total de una compra, pero falla. Ejecútalo, lee el error y arréglalo para que `total` valga `750`.
```python inicial
precio = 250
cantidad = 3
total = precio * cantidd
print(total)
```
```python solucion
precio = 250
cantidad = 3
total = precio * cantidad
print(total)
```
```python test
assert total == 750, f"total debería ser 750 y es {total}"
```
```pista
El error dice `name 'cantidd' is not defined`. Compara cómo se llama la variable cuando se crea y cuando se usa.
```
:::

:::ejercicio python titulo="Arregla el TypeError"
Queremos guardar en `mensaje` el texto `Total: 750`. El programa falla con `TypeError: can only concatenate str (not "int") to str`. Arréglalo.
```python inicial
total = 750
mensaje = "Total: " + total
print(mensaje)
```
```python solucion
total = 750
mensaje = "Total: " + str(total)
print(mensaje)
```
```python test
assert mensaje == "Total: 750", f"mensaje debería ser 'Total: 750' y es {mensaje!r}"
```
```pista
Python no suma texto con números. Convierte el número a texto con `str(total)` (o usa una f-string: `f"Total: {total}"`).
```
:::

:::ejercicio python titulo="Arregla el SyntaxError"
Este `if` debería guardar `"caro"` en `etiqueta` porque el precio supera 100, pero ni siquiera arranca: `SyntaxError: expected ':'`. Arréglalo.
```python inicial
precio = 180
if precio > 100
    etiqueta = "caro"
else:
    etiqueta = "barato"
```
```python solucion
precio = 180
if precio > 100:
    etiqueta = "caro"
else:
    etiqueta = "barato"
```
```python test
assert etiqueta == "caro", f"etiqueta debería ser 'caro' y es {etiqueta!r}"
```
```pista
`expected ':'` significa "esperaba dos puntos". ¿Qué línea debería terminar en `:`?
```
:::

:::ejercicio python titulo="Arregla el KeyError"
El diccionario `cliente` no tiene la clave `"mail"`, por eso falla con `KeyError: 'mail'`. Guarda en `correo` el email del cliente.
```python inicial
cliente = {"nombre": "Ana", "email": "ana@correo.com"}
correo = cliente["mail"]
```
```python solucion
cliente = {"nombre": "Ana", "email": "ana@correo.com"}
correo = cliente["email"]
```
```python test
assert correo == "ana@correo.com", f"correo debería ser 'ana@correo.com' y es {correo!r}"
```
```pista
Mira qué claves tiene el diccionario: `nombre` y `email`.
```
:::

:::ejercicio sql titulo="Arregla el error de SQL"
Esta consulta falla con `near "FROM": syntax error`. Arréglala para mostrar `nombre` y `email` de la tabla `clientes`.
```sql inicial
SELECT nombre, email,
FROM clientes;
```
```sql solucion
SELECT nombre, email
FROM clientes;
```
```pista
El problema está justo **antes** del `FROM`: después de la última columna no va coma.
```
:::

:::ejercicio sql titulo="no such column"
Esta consulta falla con `no such column: apelido`. Arréglala para mostrar `nombre` y `apellido` de los clientes.
```sql inicial
SELECT nombre, apelido FROM clientes;
```
```sql solucion
SELECT nombre, apellido FROM clientes;
```
```pista
Es un error de tipeo en el nombre de la columna.
```
:::

:::ejercicio quiz
En la terminal escribes `pyhton script.py` y aparece `pyhton: command not found`. ¿Qué pasó?
- [ ] Python no está instalado en la computadora
- [x] Escribiste mal el nombre del comando: es `python`
- [ ] El archivo `script.py` no existe
- [ ] No tienes permisos
```explicacion
`command not found` dice que el **comando** no existe. Antes de instalar nada, revisa cómo lo escribiste. Si el archivo no existiera, el error sería `No such file or directory`.
```
:::

:::ejercicio quiz
Un error dice `FileNotFoundError: [Errno 2] No such file or directory: 'datos/ventas.csv'`, pero el archivo existe. ¿Cuál es la causa más probable?
- [ ] El archivo está dañado
- [x] El programa se ejecuta desde otra carpeta, y la ruta relativa `datos/ventas.csv` apunta a otro lugar
- [ ] Python no lee archivos CSV
- [ ] Hay que reiniciar la computadora
```explicacion
Una ruta relativa depende de la carpeta desde donde ejecutas. Revisa con `pwd` dónde estás, o usa una ruta absoluta.
```
:::

:::ejercicio quiz
Arreglaste un error y ahora aparece **otro distinto**, más abajo en el código. ¿Qué significa?
- [ ] Que empeoraste el programa
- [x] Que avanzaste: el primer problema está resuelto y Python llegó más lejos antes de encontrar el siguiente
- [ ] Que hay que borrar todo y empezar de nuevo
- [ ] Que el primer arreglo estaba mal
```explicacion
Python se detiene en el **primer** error que encuentra. Cuando lo arreglas, sigue ejecutando hasta el próximo. Un error nuevo, más adelante, casi siempre es una buena noticia.
```
:::
