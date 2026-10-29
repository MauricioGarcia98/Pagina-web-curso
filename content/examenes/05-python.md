# examen: python

## Tipos
leccion: python-tipos-y-strings
¿Qué imprime este código?
```python norun
total = "10" + "5"
print(total)
```
- [ ] 15, porque Python convierte automáticamente los textos numéricos al sumarlos.
- [x] 105
- [ ] Un `TypeError`, porque no se pueden sumar dos textos.
- [ ] `10 5`, porque `+` agrega un espacio entre los textos.
porque: Son dos **textos** (strings), y `+` entre textos los concatena. Para sumar hay que convertir: `int("10") + int("5")`. Por eso al leer CSV hay que convertir los tipos.

## Listas mutables
leccion: python-listas
¿Qué imprime?
```python norun
a = [1, 2, 3]
b = a
b.append(4)
print(a)
```
- [ ] [1, 2, 3], porque `b = a` crea una copia independiente de la lista.
- [x] [1, 2, 3, 4]
- [ ] [4], porque `append` sobre `b` reemplaza el contenido de la lista.
- [ ] Un error, porque no se puede modificar una lista asignada a dos nombres.
porque: `b = a` no copia la lista: ambos nombres apuntan al **mismo** objeto. Para una copia independiente: `b = a.copy()` o `b = list(a)`.

## Diccionarios
leccion: python-diccionarios
`precios = {"pan": 2.5, "leche": 1.8}`. ¿Cuál es la forma segura de obtener el precio de "queso", que puede no estar?
- [ ] `precios["queso"]`
- [x] `precios.get("queso", 0)`
- [ ] `precios.queso or 0`
- [ ] `precios.find("queso")`
porque: `precios["queso"]` lanza `KeyError` si la clave no existe. `.get(clave, valor_por_defecto)` devuelve el valor por defecto en ese caso.

## Comprensiones
leccion: python-comprensiones
¿Qué produce `[x * 2 for x in range(5) if x % 2 == 0]`?
- [ ] [0, 2, 4, 6, 8]
- [x] [0, 4, 8]
- [ ] [2, 6]
- [ ] [0, 2, 4]
porque: `range(5)` es 0, 1, 2, 3, 4; el filtro deja los pares (0, 2, 4) y cada uno se multiplica por 2.

## Argumento por defecto mutable
leccion: python-funciones
¿Qué imprime?
```python norun
def agregar(x, lista=[]):
    lista.append(x)
    return lista

agregar(1)
print(agregar(2))
```
- [ ] [2], porque la lista por defecto se crea vacía en cada llamada.
- [x] [1, 2]
- [ ] [1], porque la segunda llamada no modifica la lista ya devuelta.
- [ ] Un error, porque no se permiten listas como valor por defecto.
porque: El valor por defecto `[]` se crea **una sola vez**, al definir la función, y se comparte entre llamadas. La forma correcta es `lista=None` y adentro `if lista is None: lista = []`.

## Excepciones
leccion: python-errores
Estás procesando 10.000 filas y algunas tienen montos como "N/A". ¿Cuál es el mejor manejo?
- [ ] Envolver todo el programa en `try: ... except: pass` para que nunca se detenga.
- [x] Capturar `ValueError` en la conversión de cada fila, registrar la fila y seguir.
- [ ] Dejar que el programa se detenga en la primera fila mala para no procesar datos dudosos.
- [ ] Reemplazar cualquier error por 0, así las sumas siguen funcionando sin interrupciones.
porque: Hay que capturar la excepción **específica**, en el lugar justo, y dejar registro. `except: pass` esconde todos los errores (incluso bugs reales) y reemplazar por 0 en silencio cambia los resultados sin que nadie lo sepa.

## Archivos
leccion: python-archivos-modulos
¿Por qué se recomienda `with open("datos.csv") as f:` en lugar de `f = open("datos.csv")`?
- [ ] Porque lee el archivo más rápido, ya que lo carga entero en memoria de una sola vez.
- [x] Porque cierra el archivo al salir del bloque, aunque ocurra un error.
- [ ] Porque convierte automáticamente el CSV en una lista de diccionarios.
- [ ] Porque `open` sin `with` está prohibido desde Python 3 y genera un error.
porque: `with` usa un *context manager*: garantiza el cierre del archivo pase lo que pase. Archivos que quedan abiertos pueden perder datos al escribir o agotar recursos.

## Generadores
leccion: python-python-avanzado
Tienes que procesar un archivo de 50 GB línea por línea en una máquina de 8 GB de RAM. ¿Qué enfoque funciona?
- [ ] `lineas = f.readlines()` y luego recorrer la lista, liberando memoria al avanzar.
- [x] Recorrer el archivo con `for linea in f:`, una línea a la vez.
- [ ] `datos = f.read()` y dividir con `split("\n")`, que es más rápido que leer por líneas.
- [ ] Cargarlo en un diccionario, porque ocupa menos memoria que una lista.
porque: `readlines()` y `read()` cargan todo el archivo en memoria. Iterar el archivo o usar generadores produce los elementos de a uno, con memoria constante.

## Entornos virtuales
leccion: python-buenas-practicas
¿Para qué sirve un entorno virtual (`.venv`)?
- [ ] Para que Python corra más rápido, porque el entorno compila las librerías del proyecto.
- [x] Para que cada proyecto tenga sus propias versiones de librerías, aisladas.
- [ ] Para ejecutar el código en la nube sin instalar Python en tu computadora.
- [ ] Para no tener que escribir pruebas, porque el entorno verifica las dependencias.
porque: Sin entornos, dos proyectos que necesitan versiones distintas de pandas chocan. El entorno aísla dependencias; con un archivo de bloqueo (`uv.lock`) se reproducen exactamente en otra máquina.

## Pruebas
leccion: python-buenas-practicas
¿Qué es lo **más** importante que debe probar una prueba unitaria de una función `limpiar_telefono(texto)`?
- [ ] Que la función tarde menos de un segundo con un millón de teléfonos.
- [x] Que con entradas conocidas, incluidos los casos borde, devuelva lo esperado.
- [ ] Que la función se pueda importar sin errores desde cualquier módulo del proyecto.
- [ ] Que el código de la función siga la guía de estilo y tenga comentarios en cada línea.
porque: Una prueba unitaria fija el **comportamiento**: entrada → salida esperada, sobre todo en los bordes, que es donde se esconden los errores. Así, al cambiar el código, sabes si rompiste algo.

## Decoradores
leccion: python-python-avanzado
¿Qué hace un decorador como `@reintentar(3)` sobre una función?
- [ ] Cambia el nombre de la función a `reintentar` para que aparezca así en los logs.
- [x] Envuelve la función para reintentarla hasta 3 veces si falla, sin cambiar su código.
- [ ] Ejecuta la función tres veces seguidas siempre y devuelve el último resultado.
- [ ] Convierte la función en una clase con tres métodos, uno por cada intento.
porque: Un decorador recibe una función y devuelve otra que la envuelve. Es la forma de agregar lógica transversal (reintentos, logs, medición de tiempo, caché) sin repetirla.
