---
titulo: Primeros pasos: print, comentarios y variables
nivel: Básico
duracion: 30
resumen: Qué es programar, tu primer programa y cómo guardar datos en variables.
objetivos: Escribir y ejecutar tu primer programa con `print` | Guardar valores en variables con nombres claros | Hacer cálculos con `+ - * /`, `//`, `%` y `**` | Leer un mensaje de error y corregir el problema
prerrequisitos: fundamentos-bienvenida
autoevaluacion: ¿Puedes imprimir un texto y el valor de una variable en la misma línea? | ¿Sabes qué diferencia hay entre `/` y `//`? | ¿Puedes calcular un precio con descuento usando variables? | ¿Sabes por qué `print(Ciudad)` da error si la variable se llama `ciudad`? | ¿Sabes qué nombres de variables son válidos y cuáles no?
---

<!-- estandar:escenario -->
:::escenario Automatizar una cuenta que se hace a mano
Sofía, de operaciones, arma cada mañana una planilla con cuentas a mano: cuántas cajas completas llenan los pedidos del día, cuánto queda suelto, cuánto cuesta cada envío con descuento. Te pregunta:

> "¿Esto no se puede hacer solo? Pierdo media hora por día."

Sí se puede, y el primer paso es aprender a darle instrucciones a la computadora en **Python**, el lenguaje más usado en datos. Hoy escribes tu primer programa.
:::
## ¿Qué es programar?

**Programar** es escribir instrucciones tan precisas que una computadora pueda seguirlas sin preguntar nada. La computadora es increíblemente rápida pero no tiene sentido común: hace **exactamente** lo que escribiste, en el **orden** en que lo escribiste, una instrucción a la vez, de arriba hacia abajo.

:::analogia La receta para un robot de cocina
Si le dices a una persona "haz un café", lo hace. A un robot tienes que decirle: "toma la taza del estante; coloca la taza bajo la máquina; presiona el botón 2; espera 30 segundos". Si te olvidas de "coloca la taza", el robot sirve el café sobre la mesada sin dudarlo. Un programa es esa receta, escrita en un idioma que la computadora entiende.
:::

Ese idioma es un **lenguaje de programación**. Hay cientos; para datos, el rey es **Python**:

- **Se lee casi como inglés**: `if precio > 100: print("caro")` se entiende sin ser programador.
- **Tiene librerías para todo**: pandas (tablas), PySpark (big data), Airflow (orquestación), las APIs de AWS, Azure y Google… y dbt está escrito en Python.
- **Es el más pedido** en ofertas de Data Engineer, junto con SQL.

### SQL y Python: ¿por qué los dos?

| | SQL | Python |
|---|---|---|
| Estilo | **Declarativo**: dices *qué* quieres | **Imperativo**: dices *cómo*, paso a paso |
| Para qué es ideal | Consultar y transformar tablas | Todo lo demás: leer archivos y APIs, automatizar, reglas complejas, orquestar |
| Ejemplo | `SELECT pais, COUNT(*) FROM clientes GROUP BY pais` | Descargar un archivo de una API cada hora, validarlo y subirlo a S3 |

Un data engineer usa ambos todos los días.

## Dónde se ejecuta Python en este curso

Normalmente Python se instala en tu computadora. Aquí corre **dentro de tu navegador** gracias a **Pyodide** (Python compilado para la web): es Python 3.14 de verdad, con pandas 3 y numpy 2. La primera vez que ejecutas código tarda unos segundos en cargar; después es instantáneo. No puedes romper nada: cada ejecución es independiente.

## Tu primer programa

```python
print("¡Hola, mundo!")
print("Estoy aprendiendo Python")
```

Presiona **▶** y verás dos líneas debajo. Analicemos:

| Parte | Qué es |
|---|---|
| `print` | El nombre de una **función**: una instrucción ya hecha que "imprime" (muestra) algo en pantalla |
| `( … )` | Los paréntesis encierran lo que le pasas a la función (su **argumento**) |
| `"¡Hola, mundo!"` | Un **texto** (en programación se dice *string*). Va entre comillas dobles `"` o simples `'`, da igual, pero las dos iguales |

Cada línea es **una instrucción** y se ejecutan **en orden**: primero aparece "¡Hola, mundo!" y después la segunda frase.

`print` también puede mostrar números y el resultado de cuentas, y varios valores separados por comas (los separa con un espacio):

```python
print(2 + 3)
print("El doble de 21 es", 21 * 2)
```

### Errores: no te asustes

Si escribes `print("Hola"` (olvidando el paréntesis final), Python muestra un error como `SyntaxError: '(' was never closed`. Los errores **no son un fracaso**: son la forma en que Python te dice exactamente qué no entendió y en qué línea. Leerlos con calma es una de las habilidades más importantes que vas a desarrollar. Los errores más comunes al empezar:

| Error | Causa típica |
|---|---|
| `SyntaxError` | Falta un paréntesis, una comilla o dos puntos |
| `NameError: name 'x' is not defined` | Usaste una variable que no creaste (o la escribiste distinto) |
| `IndentationError` | Espacios de más o de menos al principio de la línea |
| `TypeError` | Mezclaste tipos que no se combinan, como texto + número |

## Comentarios

Todo lo que va después de `#` en una línea es un **comentario**: Python lo ignora. Sirven para explicar **por qué** hiciste algo, a otras personas y a tu yo del futuro.

```python
# Calculamos el precio final con IVA del 21 %
precio = 100
print(precio * 1.21)  # también puede ir al final de una línea
```

Un buen comentario explica la **intención** ("aplicamos IVA de Argentina"), no repite lo obvio ("multiplico por 1.21").

## Variables: guardar valores con un nombre

Una **variable** es un nombre que guarda un valor para usarlo después. Se crea con el signo `=`, que en programación significa **asignar** ("guarda esto aquí"), no "es igual":

```python
nombre = "Lucía"
edad = 29
altura = 1.68
es_cliente = True

print(nombre)
print(edad + 1)
print("Nombre:", nombre, "- Edad:", edad)
```

Se lee de derecha a izquierda: "toma el valor `29` y guárdalo con el nombre `edad`". Desde ese momento, cada vez que escribes `edad`, Python usa 29.

:::analogia Una variable es una etiqueta
`edad = 29` pega la etiqueta `edad` sobre el valor 29. Si después escribes `edad = 30`, despegas la etiqueta y la pegas sobre el 30: el 29 ya no tiene nombre y Python lo descarta.
:::

### Las variables pueden cambiar

```python
saldo = 1000
print("Saldo inicial:", saldo)
saldo = saldo - 250        # a la derecha se usa el valor VIEJO (1000); el resultado se guarda en saldo
print("Después de una compra:", saldo)
saldo += 100               # atajo de saldo = saldo + 100
print("Después de un depósito:", saldo)
```

`saldo = saldo - 250` parece absurdo en matemática, pero en programación es lo normal: primero se calcula la derecha (1000 − 250 = 750) y después se guarda en `saldo`. Los atajos `+=`, `-=`, `*=` hacen lo mismo en menos letras.

### Reglas y convenciones para los nombres

- Solo letras, números y guion bajo `_`. No pueden **empezar** con un número (`2do` no; `segundo` sí). Sin espacios.
- Distinguen mayúsculas: `Edad` y `edad` son variables **distintas**.
- No uses palabras reservadas de Python como nombre (`if`, `for`, `class`, `print`…).
- Convención: **`snake_case`** (minúsculas y guiones bajos): `precio_total`, `fecha_pedido`, `es_cliente`. Las tildes funcionan pero conviene evitarlas.
- Usa **nombres que expliquen** el contenido: `total_ventas` y no `x` o `tv`. Leer código es mucho más frecuente que escribirlo.

## Operaciones con números

| Operador | Qué hace | Ejemplo | Resultado |
|---|---|---|---|
| `+` `-` `*` | suma, resta, multiplicación | `3 * 4` | `12` |
| `/` | división (**siempre** da decimal) | `7 / 2` | `3.5` |
| `//` | división entera (descarta decimales) | `7 // 2` | `3` |
| `%` | resto de la división | `7 % 2` | `1` |
| `**` | potencia | `2 ** 10` | `1024` |

El orden de las operaciones es el de la matemática: primero `**`, después `*` `/` `//` `%`, y al final `+` `-`. Usa **paréntesis** para cambiarlo o simplemente para que se lea mejor.

```python
precio = 120
cantidad = 3
descuento = 0.1                                   # 10 %
total = precio * cantidad * (1 - descuento)       # 120 × 3 × 0,9
print("Total a pagar:", total)
```

:::nota Diferencia con SQL
En SQLite `7 / 2` da `3` (división entera). En Python, `/` **siempre** da decimal (`3.5`), y si quieres la división entera usas `//`. Es uno de esos detalles que cambian entre lenguajes.
:::

## Cómo se corrigen los ejercicios

Escribes tu código en el editor y presionas **✓ Comprobar** (o Ctrl+Shift+Enter). El sitio:

1. Ejecuta tu código.
2. Ejecuta unas **pruebas** escondidas que revisan lo que imprimiste o el valor de tus variables (por ejemplo, que exista una variable `total` con el valor correcto).
3. Si alguna prueba falla, te muestra un mensaje que indica qué esperaba.

Usa **▶ Ejecutar** las veces que quieras para probar sin que se califique, y **💡 Pista** si te trabas.

<!-- estandar:errores -->
:::errores
- **`NameError: name 'x' is not defined`**: usaste una variable antes de crearla, o la escribiste distinto (Python distingue mayúsculas: `Total` y `total` son dos variables).
- **`SyntaxError`**: falta un paréntesis o unas comillas, o hay un carácter raro. Python te marca la línea con una flecha `^`.
- **Comillas "inteligentes"**: si copias código de Word o de un chat, las comillas `“ ”` no son las de Python (`" "`). Escríbelas de nuevo.
- **Números con separador de miles**: `7.900.000` no es un número válido. Escribe `7900000` o `7_900_000`.
:::

<!-- estandar:trabajo -->
:::trabajo
- En el trabajo, Python se usa para todo lo que SQL no resuelve bien: leer APIs, mover archivos, validar datos, orquestar procesos (Airflow está escrito en Python) y transformar datos con PySpark.
- Los nombres de variables importan muchísimo: el código se lee muchas más veces de las que se escribe. `precio_con_descuento` se entiende solo; `p2` obliga a leer todo el programa.
:::

## Resumen

- Un programa es una lista de instrucciones que se ejecutan en orden, de arriba hacia abajo.
- `print(...)` muestra valores; los textos van entre comillas.
- `#` inicia un comentario. Los errores te dicen qué falló y dónde: léelos.
- `nombre = valor` crea o cambia una variable; usa `snake_case` y nombres descriptivos.
- Operadores: `+ - * / // % **`; `/` siempre da decimal en Python.

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
