---
titulo: El método - cómo resolver un problema que nunca viste
nivel: Básico
duracion: 35
resumen: Un método de seis pasos que sirve igual para Python, SQL y Spark - entender el pedido, resolver un ejemplo a mano, escribir el plan en palabras, programar de a pasos chicos, probar con casos difíciles y revisar. Con un problema resuelto de principio a fin y qué hacer cuando te quedas en blanco.
objetivos: Aplicar un método de seis pasos antes de escribir código | Resolver un ejemplo chico a mano para descubrir el algoritmo | Escribir el plan en palabras (pseudocódigo) y recién después traducirlo | Saber qué hacer cuando te trabas | Explicar tu solución en voz alta, como en una entrevista
prerrequisitos: python-funciones
autoevaluacion: ¿Sabes qué hacer antes de escribir la primera línea de código? | ¿Puedes resolver un ejemplo a mano y anotar los pasos que seguiste? | ¿Sabes qué es un caso borde y por qué se prueba? | ¿Tienes un plan para cuando te quedas en blanco? | ¿Puedes explicar tu solución en tres frases?
---

:::analogia En palabras simples
Nadie arma un mueble mirando solo la caja: primero mira el dibujo, cuenta las piezas y sigue los pasos en orden. Programar es igual. Quien se sienta a escribir código sin haber entendido el problema termina desarmando todo tres veces. El método de esta lección es el dibujo de instrucciones.
:::

## Por qué necesitas un método

Saber la sintaxis no alcanza. Puedes conocer `for`, `if`, `GROUP BY` y `JOIN` de memoria y aun así quedarte en blanco frente a un problema nuevo. Lo que distingue a quien resuelve de quien se traba no es saber más comandos: es **tener un orden para pensar**.

El método tiene seis pasos. Sirve para un ejercicio de este curso, para una consulta que te pide tu jefa y para una entrevista.

| Paso | Qué haces | Qué te preguntas |
|---|---|---|
| 1. Entender | Decir el problema con tus palabras | ¿Qué entra? ¿Qué tiene que salir? |
| 2. Ejemplo a mano | Resolver un caso chico en papel | ¿Qué pasos seguí yo para llegar? |
| 3. Plan en palabras | Escribir los pasos sin código | ¿Podría seguirlos otra persona? |
| 4. Código de a poco | Traducir un paso por vez y probar | ¿Este pedacito ya funciona? |
| 5. Casos difíciles | Probar lo raro | ¿Y si está vacío? ¿Y si hay empate? |
| 6. Revisar | Leer, simplificar, explicar | ¿Lo entendería en un mes? |

## El método aplicado: un problema completo

> **Pedido:** "Dada la lista de ventas del día, dime qué vendedor vendió más."

### Paso 1 · Entender

Antes de tocar el teclado, responde:

- **¿Qué entra?** Una lista de ventas. ¿Con qué forma? Supongamos pares `(vendedor, monto)`: `[("Ana", 100), ("Luis", 250), ("Ana", 200)]`.
- **¿Qué sale?** El nombre de un vendedor. ¿O el nombre y el total? Lo decidimos: solo el nombre.
- **¿"Vendió más" qué significa?** ¿Más plata o más ventas? Decidimos: más plata en total.

Fíjate cuántas decisiones había escondidas en una frase de doce palabras. Si no las tomas ahora, las vas a tomar sin darte cuenta mientras programas, y quizás mal.

### Paso 2 · Un ejemplo a mano

Con `[("Ana", 100), ("Luis", 250), ("Ana", 200)]`:

- Ana: 100 + 200 = 300
- Luis: 250
- Gana Ana.

¿Qué hiciste? **Sumaste por vendedor** y después **buscaste el mayor**. Acabas de descubrir el algoritmo sin escribir código.

### Paso 3 · El plan en palabras

```text
1. Preparar una tabla vacía: vendedor → total
2. Para cada venta:
     sumar el monto al total de ese vendedor
3. Recorrer la tabla y quedarme con el vendedor de mayor total
4. Devolver ese nombre
```

Esto se llama **pseudocódigo**. No tiene reglas: es tu plan, escrito para que lo entienda una persona.

### Paso 4 · Código de a poco

Traduce un paso, ejecútalo, mira el resultado. Recién ahí el siguiente.

```python
ventas = [("Ana", 100), ("Luis", 250), ("Ana", 200)]

# pasos 1 y 2: sumar por vendedor
totales = {}
for vendedor, monto in ventas:
    totales[vendedor] = totales.get(vendedor, 0) + monto
print(totales)          # compruebo antes de seguir: {'Ana': 300, 'Luis': 250}
```

Ya funciona la primera mitad. Ahora el paso 3:

```python
ventas = [("Ana", 100), ("Luis", 250), ("Ana", 200)]
totales = {}
for vendedor, monto in ventas:
    totales[vendedor] = totales.get(vendedor, 0) + monto

mejor = None
for vendedor, total in totales.items():
    if mejor is None or total > totales[mejor]:
        mejor = vendedor
print(mejor)            # Ana
```

### Paso 5 · Los casos difíciles

El ejemplo fácil ya pasa. Ahora los que rompen programas:

| Caso | ¿Qué debería pasar? |
|---|---|
| Lista vacía | No hay vendedor: devolver `None` |
| Un solo vendedor | Ese |
| Empate | Hay que decidirlo: ¿el primero? ¿todos? |
| Montos negativos (devoluciones) | Siguen sumando: el total puede bajar |

El código de arriba ya devuelve `None` con la lista vacía y, en un empate, se queda con el primero que encontró. Lo importante es que **lo sepas y lo hayas decidido**, no que salga así por casualidad.

### Paso 6 · Revisar

Ahora que funciona, se puede mejorar:

```python
def mejor_vendedor(ventas):
    totales = {}
    for vendedor, monto in ventas:
        totales[vendedor] = totales.get(vendedor, 0) + monto
    if not totales:
        return None
    return max(totales, key=totales.get)

print(mejor_vendedor([("Ana", 100), ("Luis", 250), ("Ana", 200)]))
print(mejor_vendedor([]))
```

Primero que funcione; después que quede lindo. Nunca al revés.

## Cuando te quedas en blanco

Le pasa a todo el mundo. Estas salidas funcionan, en este orden:

1. **Vuelve al paso 2.** Si no puedes resolverlo a mano con un ejemplo de tres elementos, todavía no entendiste el problema. El problema no es el código.
2. **Achica el problema.** ¿No sabes el mejor vendedor? Resuelve primero "el total de un solo vendedor". Después "el total de cada uno". Después "el mayor".
3. **Resuelve uno parecido que ya sepas.** "Buscar el vendedor con más ventas" es "buscar el máximo de una lista" con un paso previo.
4. **Escribe lo que sí sabes.** Aunque sea leer la entrada e imprimirla. Tener algo que corre desbloquea.
5. **Explícalo en voz alta**, a otra persona o a un objeto. Al decirlo, casi siempre aparece el paso que faltaba.

## El mismo método en SQL y en Spark

El método no cambia; cambia la herramienta del paso 4.

| Paso | Python | SQL | Spark |
|---|---|---|---|
| Sumar por vendedor | diccionario y `for` | `GROUP BY vendedor` | `groupBy("vendedor")` |
| Quedarse con el mayor | `max(...)` | `ORDER BY total DESC LIMIT 1` | `orderBy(desc("total")).limit(1)` |

Por eso conviene pensar el plan **en palabras**: el mismo plan se traduce a los tres.

## Explicar tu solución

En una entrevista y en el trabajo, resolver en silencio vale la mitad. Acostúmbrate a decir:

1. **Qué entendí** ("me piden el vendedor con mayor monto total").
2. **Qué supuse** ("si hay empate, devuelvo el primero").
3. **Cómo lo resuelvo** ("sumo por vendedor y busco el máximo").
4. **Qué probé** ("lista vacía, un solo vendedor y un empate").

:::ejercicio quiz
Te dan un problema nuevo. ¿Qué haces primero?
- [ ] Empiezo a escribir código y voy viendo
- [x] Lo digo con mis palabras: qué entra, qué tiene que salir y qué significa cada término
- [ ] Busco una solución parecida en internet y la copio
- [ ] Elijo la herramienta más avanzada que conozco
:::

:::ejercicio quiz
¿Para qué sirve resolver un ejemplo chico a mano antes de programar?
- [ ] Para perder menos tiempo escribiendo
- [ ] Para no tener que probar el código después
- [x] Para descubrir los pasos que seguiste: esos pasos son el algoritmo
- [ ] Para memorizar la respuesta
:::

:::ejercicio quiz
Escribiste todo el programa de una vez, lo ejecutas y da un resultado equivocado. ¿Qué habría evitado el problema?
- [ ] Usar nombres de variables más cortos
- [x] Programar un paso por vez y comprobar cada uno antes de seguir
- [ ] Escribir más comentarios
- [ ] Usar una computadora más rápida
:::

:::ejercicio quiz
Estás trabado y no sabes cómo seguir. ¿Cuál es la mejor salida?
- [ ] Mirar la solución de inmediato
- [ ] Borrar todo y empezar de nuevo igual que antes
- [x] Achicar el problema: resolver primero una versión más simple
- [ ] Agregar más variables hasta que funcione
:::

:::ejercicio python
Aplica el método. **Pedido:** escribe `cuantos_superan(numeros, limite)` que devuelva cuántos números de la lista son **mayores** que `limite`. Antes de programar: ¿qué devuelve con una lista vacía? ¿Y si un número es igual al límite?
```python inicial
def cuantos_superan(numeros, limite):
    pass
```
```python solucion
def cuantos_superan(numeros, limite):
    cantidad = 0
    for n in numeros:
        if n > limite:
            cantidad += 1
    return cantidad
```
```pista
Plan en palabras: empiezo un contador en 0; por cada número, si es mayor que el límite, sumo 1; al final devuelvo el contador. "Mayor" no incluye al igual.
```
```python test
assert cuantos_superan([5, 12, 8, 20], 10) == 2, f"Obtuviste {cuantos_superan([5, 12, 8, 20], 10)}"
assert cuantos_superan([], 10) == 0, "Con la lista vacía debe dar 0"
assert cuantos_superan([10, 10], 10) == 0, "Igual al límite no cuenta: se pide mayor"
```
:::

:::ejercicio python
**Pedido:** escribe `total_por_vendedor(ventas)` que reciba una lista de pares `(vendedor, monto)` y devuelva un diccionario `vendedor → total`. Es la primera mitad del problema resuelto en la lección: hazla sin mirar.
```python inicial
def total_por_vendedor(ventas):
    pass
```
```python solucion
def total_por_vendedor(ventas):
    totales = {}
    for vendedor, monto in ventas:
        totales[vendedor] = totales.get(vendedor, 0) + monto
    return totales
```
```pista
Un diccionario vacío. Por cada venta: `totales[vendedor] = totales.get(vendedor, 0) + monto`.
```
```python test
assert total_por_vendedor([("Ana", 100), ("Luis", 250), ("Ana", 200)]) == {"Ana": 300, "Luis": 250}
assert total_por_vendedor([]) == {}, "Sin ventas, diccionario vacío"
assert total_por_vendedor([("Ana", 100), ("Ana", -30)]) == {"Ana": 70}, "Las devoluciones (negativos) también suman"
```
:::

:::ejercicio python
**Pedido:** "dime el producto más caro". Escribe `mas_caro(productos)`, donde `productos` es una lista de pares `(nombre, precio)`, que devuelva el **nombre** del más caro. Decisiones ya tomadas: con la lista vacía devuelve `None`; si hay empate, el que aparece primero.
```python inicial
def mas_caro(productos):
    pass
```
```python solucion
def mas_caro(productos):
    mejor_nombre = None
    mejor_precio = None
    for nombre, precio in productos:
        if mejor_precio is None or precio > mejor_precio:
            mejor_nombre = nombre
            mejor_precio = precio
    return mejor_nombre
```
```pista
Guarda dos cosas: el mejor precio visto y de quién era. Usa `>` y no `>=` para que, en un empate, se quede el primero.
```
```python test
assert mas_caro([("Mate", 1500), ("Termo", 9000), ("Bombilla", 800)]) == "Termo"
assert mas_caro([]) is None, "Con la lista vacía debe devolver None"
assert mas_caro([("A", 10), ("B", 10)]) == "A", "En un empate, el primero"
```
:::

:::ejercicio python
**Pedido:** escribe `promedio_aprobados(notas)` que devuelva el promedio de las notas **mayores o iguales a 6**, redondeado a 1 decimal. Si ninguna aprueba, devuelve `None` (dividir por cero rompería el programa).
```python inicial
def promedio_aprobados(notas):
    pass
```
```python solucion
def promedio_aprobados(notas):
    aprobadas = [n for n in notas if n >= 6]
    if not aprobadas:
        return None
    return round(sum(aprobadas) / len(aprobadas), 1)
```
```pista
Dos pasos: primero quédate con las aprobadas; después promedia. Antes de dividir, comprueba que haya al menos una.
```
```python test
assert promedio_aprobados([4, 6, 8, 10]) == 8.0, f"Obtuviste {promedio_aprobados([4, 6, 8, 10])}"
assert promedio_aprobados([2, 5]) is None, "Si nadie aprueba, None"
assert promedio_aprobados([]) is None
assert promedio_aprobados([6, 7]) == 6.5
```
:::
