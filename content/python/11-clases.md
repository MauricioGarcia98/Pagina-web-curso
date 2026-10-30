---
titulo: Programación orientada a objetos
nivel: Avanzado
duracion: 45
resumen: Clases, objetos, métodos, herencia, métodos especiales y dataclasses.
objetivos: Explicar qué son una clase y un objeto con un ejemplo de datos | Definir clases con `__init__`, atributos y métodos | Reutilizar código con herencia | Usar `@dataclass` para representar registros con poco código
prerrequisitos: python-funciones
autoevaluacion: ¿Puedes crear una clase `CuentaBancaria` con métodos para depositar y retirar que validen el monto? | ¿Sabes qué es `self`? | ¿Puedes crear una `@dataclass` con valores por defecto? | ¿Puedes explicar para qué sirve la herencia con un ejemplo de validadores? | ¿Sabes reconocer clases en el código de Airflow o PySpark?
---

<!-- estandar:escenario -->
:::escenario Los validadores de calidad
Martín quiere ordenar las reglas de calidad de datos del equipo:

> "Tenemos validaciones copiadas por todos lados: que el email tenga arroba, que el monto sea positivo, que la fecha no sea futura. Quiero una estructura común: cada regla con el mismo formato, que se puedan combinar y probar."

Las **clases** permiten crear tus propios tipos de objetos, con datos y comportamiento juntos. No las vas a escribir todos los días, pero las usas todo el tiempo: un DAG de Airflow, un DataFrame de Spark y un operador son objetos.
:::
## Por qué aprender clases si vas a trabajar con datos

Quizás pienses que la programación orientada a objetos es "para programadores de aplicaciones". Pero casi todo lo que usarás como data engineer **son objetos**: un `DataFrame` de PySpark, la `SparkSession`, un `DAG` y sus operadores en Airflow, un cliente de S3 de `boto3`, una conexión a una base. Entender clases te permite **leer** esas librerías, entender sus errores y, cuando haga falta, escribir tus propias piezas reutilizables (un lector de una API, un validador, un operador personalizado).

## Clase y objeto

- Una **clase** es un **molde**: describe qué datos tiene algo y qué puede hacer.
- Un **objeto** (o **instancia**) es **una cosa concreta** hecha con ese molde.

:::analogia El molde de galletitas
La clase `Producto` es el molde: dice que todo producto tiene nombre, precio y stock, y que se puede vender. Con ese molde haces muchas galletitas (objetos): el mouse, el teclado, el monitor. Cada una tiene **sus propios** valores, pero todas tienen la misma forma y saben hacer lo mismo.
:::

```python
class Producto:
    def __init__(self, nombre, precio, stock=0):   # constructor: se ejecuta al crear cada objeto
        self.nombre = nombre                       # atributos: los datos de ESTE objeto
        self.precio = precio
        self.stock = stock

    def valor_inventario(self):                    # métodos: lo que el objeto sabe hacer
        return self.precio * self.stock

    def vender(self, unidades):
        if unidades > self.stock:
            raise ValueError(f"Stock insuficiente de {self.nombre}")
        self.stock -= unidades

mouse = Producto("Mouse", 25.0, stock=40)      # crear un objeto (instanciar)
teclado = Producto("Teclado", 49.9, stock=5)
mouse.vender(3)
print(mouse.nombre, mouse.stock, mouse.valor_inventario())
print(teclado.nombre, teclado.stock)           # el teclado no se vio afectado
```

Pieza por pieza:

| Pieza | Qué es |
|---|---|
| `class Producto:` | Define la clase. Por convención, los nombres de clases van en `CamelCase` |
| `def __init__(self, …)` | El **constructor**: se ejecuta automáticamente al hacer `Producto(...)`. Prepara los atributos |
| `self` | "Este objeto". Es el primer parámetro de todo método; Python lo pasa solo |
| `self.nombre = nombre` | Guarda un **atributo** en el objeto |
| `def vender(self, unidades)` | Un **método**: una función que pertenece a la clase y trabaja con los datos de `self` |
| `mouse = Producto(…)` | Crea un objeto. Python llama a `__init__` con `self = mouse` |
| `mouse.vender(3)` | Llama al método. Python lo traduce a `Producto.vender(mouse, 3)` |

La gran ventaja: **datos y comportamiento viajan juntos**. El objeto `mouse` sabe su stock y sabe cómo venderse, incluida la regla "no vender más de lo que hay". Nadie puede olvidarse de esa validación porque está **dentro** del método.

```recorrido
titulo: De la clase a dos objetos independientes
estacion clase: La clase | icono=libro
estacion init: __init__ | icono=engranaje
estacion objs: Dos objetos | icono=cubo
estacion metodo: Un método | icono=transformar
estacion error: Una regla | icono=escudo
paso clase: La clase es el molde
`class Producto` describe **qué datos** tiene un producto (nombre, precio, stock) y **qué sabe hacer** (vender, calcular su inventario). Todavía no existe ningún producto.
>>> python
class Producto:
    def __init__(self, nombre, precio, stock=0): ...
    def valor_inventario(self): ...
    def vender(self, unidades): ...
paso init: __init__ arma cada objeto
Al escribir `Producto("Mouse", 25.0, stock=40)`, Python crea un objeto vacío y llama a `__init__` con él como `self`. Cada `self.algo = …` guarda un dato **en ese objeto**.
>>> python
mouse = Producto("Mouse", 25.0, stock=40)
# self.nombre = "Mouse", self.precio = 25.0, self.stock = 40
paso objs: Dos objetos, cada uno con sus datos
Del mismo molde salen objetos **independientes**.
>>> tabla
objeto,nombre,precio,stock
mouse,Mouse,25.0,40
teclado,Teclado,49.9,5
paso metodo: Un método cambia solo su objeto
`mouse.vender(3)` ejecuta `vender` con `self = mouse`. El teclado no se entera.
>>> log
» mouse.vender(3)
» print(mouse.nombre, mouse.stock, mouse.valor_inventario())
Mouse 37 925.0
» print(teclado.nombre, teclado.stock)
Teclado 5
paso error: La clase protege sus reglas
Vender más de lo que hay lanza un error con un mensaje claro, en lugar de dejar stock negativo.
>>> log
» teclado.vender(10)
ValueError: Stock insuficiente de Teclado
```

## Métodos especiales (dunder)

Los métodos con doble guion bajo al principio y al final (*double underscore*, "dunder") definen cómo se comporta el objeto con las operaciones de Python: cómo se muestra, qué hace el `+`, cómo se compara.

```python
class Dinero:
    def __init__(self, monto, moneda="USD"):
        self.monto = monto
        self.moneda = moneda

    def __repr__(self):                       # cómo se muestra con print o en la consola
        return f"Dinero({self.monto:.2f} {self.moneda})"

    def __add__(self, otro):                  # qué hace el operador +
        if self.moneda != otro.moneda:
            raise ValueError("No se pueden sumar monedas distintas")
        return Dinero(self.monto + otro.monto, self.moneda)

    def __eq__(self, otro):                   # qué hace el operador ==
        return (self.monto, self.moneda) == (otro.monto, otro.moneda)

print(Dinero(10) + Dinero(5.5))
print(Dinero(10) == Dinero(10.0))
```

| Método | Se activa con |
|---|---|
| `__init__` | `Clase(…)` |
| `__repr__` / `__str__` | `print(obj)`, la consola |
| `__add__`, `__sub__`, `__mul__` | `+`, `-`, `*` |
| `__eq__`, `__lt__` | `==`, `<` |
| `__len__` | `len(obj)` |
| `__getitem__` | `obj[clave]` |

:::experto Así funciona PySpark
Cuando escribes `F.col("precio") * F.col("cantidad")` en PySpark, no se multiplica nada en ese momento: el objeto `Column` tiene un `__mul__` que **construye** una expresión "precio × cantidad" para ejecutarla más tarde en el cluster. Lo mismo `F.col("a") > 5` (con `__gt__`). Esa "magia" son métodos dunder.
:::

## Herencia: especializar una clase

Una clase puede **heredar** de otra: recibe todos sus atributos y métodos, y puede agregar o **reemplazar** (*sobrescribir*) algunos.

```python
class Fuente:
    def __init__(self, nombre):
        self.nombre = nombre
    def leer(self):
        raise NotImplementedError("Cada fuente debe implementar leer()")
    def describir(self):
        return f"Fuente {self.nombre}"

class FuenteCSV(Fuente):                    # FuenteCSV hereda de Fuente
    def __init__(self, nombre, separador=","):
        super().__init__(nombre)            # reutiliza el constructor del padre
        self.separador = separador
    def leer(self):                          # sobrescribe leer()
        return f"leyendo {self.nombre} separado por '{self.separador}'"

class FuenteAPI(Fuente):
    def leer(self):
        return f"llamando a la API {self.nombre}"

for f in [FuenteCSV("ventas.csv", ";"), FuenteAPI("https://api/pedidos")]:
    print(f.describir(), "→", f.leer())     # polimorfismo: misma interfaz, distinto comportamiento
```

- `class FuenteCSV(Fuente)` = "una FuenteCSV **es una** Fuente".
- `super().__init__(nombre)` llama al constructor de la clase padre, para no repetir código.
- `describir()` no está en `FuenteCSV`: lo hereda de `Fuente`.

El bucle final muestra la idea más poderosa, el **polimorfismo**: el código que recorre las fuentes no necesita saber de qué tipo es cada una; solo llama a `leer()`, y cada clase responde a su manera. Agregar una `FuenteS3` no requiere tocar ese bucle.

Así está construido Airflow: todos los operadores (`PythonOperator`, `BashOperator`, los de AWS o Databricks) **heredan de `BaseOperator`** y cada uno implementa su propio `execute()`. Airflow solo sabe "llamar a `execute()`".

:::tip No abuses de la herencia
Usa herencia cuando hay una relación clara "es un" y un comportamiento compartido. Para combinar capacidades, muchas veces es más simple **componer**: que un objeto *tenga* otro como atributo (un `Pipeline` que tiene una lista de `Fuente`s).
:::

## dataclasses: clases de datos sin escribir de más

Muchas clases solo existen para **agrupar datos** (un pedido, un evento, una fila). Escribir `__init__`, `__repr__` y `__eq__` a mano es repetitivo. El decorador `@dataclass` los genera por ti a partir de las anotaciones de tipo:

```python
from dataclasses import dataclass, field

@dataclass
class Pedido:
    id: int
    cliente: str
    items: list = field(default_factory=list)   # una lista nueva para cada pedido (¡no compartida!)
    pagado: bool = False

    def total(self):
        return sum(i["cantidad"] * i["precio"] for i in self.items)

p = Pedido(1, "Eva", [{"cantidad": 2, "precio": 10.0}])
print(p, p.total())            # __init__, __repr__ y __eq__ se generaron solos
print(p == Pedido(1, "Eva", [{"cantidad": 2, "precio": 10.0}]))
```

`field(default_factory=list)` resuelve la misma trampa de los valores por defecto mutables que viste en funciones. Con `@dataclass(frozen=True)` el objeto se vuelve inmutable, ideal para registros que no deben cambiar.

## Propiedades y métodos de clase

```python
class Temperatura:
    def __init__(self, celsius):
        self.celsius = celsius

    @property
    def fahrenheit(self):              # se calcula al pedirlo, pero se usa como atributo: t.fahrenheit
        return self.celsius * 9 / 5 + 32

    @classmethod
    def desde_fahrenheit(cls, f):      # un constructor alternativo
        return cls((f - 32) * 5 / 9)

t = Temperatura.desde_fahrenheit(212)
print(t.celsius, t.fahrenheit)
```

- `@property` convierte un método en un "atributo calculado": `t.fahrenheit` sin paréntesis, siempre coherente con `celsius`.
- `@classmethod` recibe la **clase** (`cls`) en vez del objeto. Se usa para constructores alternativos. Lo verás en librerías: `SparkSession.builder…getOrCreate()`, `datetime.fromisoformat(…)`.

<!-- estandar:errores -->
:::errores
- **Olvidar `self`**: un método sin `self` como primer parámetro da `TypeError: takes 0 positional arguments but 1 was given`.
- **Atributos de clase compartidos por accidente**: una lista definida en el cuerpo de la clase (fuera de `__init__`) la comparten todos los objetos.
- **Usar clases donde basta una función**: una clase con un solo método y sin estado es una función disfrazada.
:::

<!-- estandar:trabajo -->
:::trabajo
- En ingeniería de datos se usan mucho las `dataclass` (o modelos de **pydantic**) para definir la forma de los registros que llegan de una API y validarlos al entrar.
- Leer código de librerías (Airflow, PySpark, dbt) exige entender clases: un operador de Airflow es una clase que hereda de `BaseOperator` y define `execute`. Si algún día escribes un operador propio, es exactamente lo que vas a hacer.
:::

## Resumen

- Clase = molde; objeto = instancia concreta. `__init__` prepara los atributos; `self` es "este objeto".
- Los métodos agrupan comportamiento con los datos (y protegen sus reglas).
- Los métodos dunder definen `print`, `+`, `==`… (así funciona `F.col(...) * ...` en PySpark).
- Herencia: `class Hija(Padre)`, `super().__init__()`, polimorfismo (así funcionan los operadores de Airflow).
- `@dataclass` para clases de datos; `@property` para atributos calculados; `@classmethod` para constructores alternativos.

## Ejercicios

:::ejercicio python
Crea la clase `CuentaBancaria` con `titular` y `saldo` (por defecto 0), y los métodos `depositar(monto)` y `retirar(monto)`. `retirar` debe lanzar `ValueError` si no hay saldo suficiente. Ambos deben rechazar montos ≤ 0 con `ValueError`.
```python inicial
class CuentaBancaria:
    pass
```
```python solucion
class CuentaBancaria:
    def __init__(self, titular, saldo=0):
        self.titular = titular
        self.saldo = saldo

    def depositar(self, monto):
        if monto <= 0:
            raise ValueError("Monto inválido")
        self.saldo += monto

    def retirar(self, monto):
        if monto <= 0:
            raise ValueError("Monto inválido")
        if monto > self.saldo:
            raise ValueError("Saldo insuficiente")
        self.saldo -= monto
```
```python test
c = CuentaBancaria("Eva")
assert c.saldo == 0 and c.titular == "Eva", "El saldo inicial debe ser 0"
c.depositar(100); c.retirar(30)
assert c.saldo == 70, f"El saldo debería ser 70 y es {c.saldo}"
for accion, monto in [("retirar", 1000), ("depositar", -5), ("retirar", 0)]:
    try:
        getattr(c, accion)(monto)
        raise AssertionError(f"{accion}({monto}) debería lanzar ValueError")
    except ValueError:
        pass
assert c.saldo == 70, "Las operaciones inválidas no deben cambiar el saldo"
```
:::

:::ejercicio python
Crea una `@dataclass` llamada `Linea` con `producto: str`, `cantidad: int`, `precio: float` y `descuento: float = 0.0`, y un método `importe()` que devuelva `cantidad * precio * (1 - descuento)` redondeado a 2.
```python inicial
from dataclasses import dataclass
```
```python solucion
from dataclasses import dataclass

@dataclass
class Linea:
    producto: str
    cantidad: int
    precio: float
    descuento: float = 0.0

    def importe(self):
        return round(self.cantidad * self.precio * (1 - self.descuento), 2)
```
```python test
l = Linea("Mouse", 3, 25.0)
assert l.importe() == 75.0, f"importe() = {l.importe()}"
assert Linea("Monitor", 2, 199.99, 0.1).importe() == 359.98, "Con descuento 0.1 debería dar 359.98"
assert Linea("A", 1, 1.0) == Linea("A", 1, 1.0), "Las dataclasses comparan por valor"
```
:::

:::ejercicio python
Crea una clase base `Validador` con el método `validar(valor)` que lance `NotImplementedError`, y dos subclases: `NoVacio` (válido si el valor no es `None` ni `""`) y `RangoNumerico(minimo, maximo)` (válido si `minimo <= valor <= maximo`). `validar` devuelve `True`/`False`.
```python solucion
class Validador:
    def validar(self, valor):
        raise NotImplementedError

class NoVacio(Validador):
    def validar(self, valor):
        return valor is not None and valor != ""

class RangoNumerico(Validador):
    def __init__(self, minimo, maximo):
        self.minimo = minimo
        self.maximo = maximo

    def validar(self, valor):
        return self.minimo <= valor <= self.maximo
```
```python test
assert issubclass(NoVacio, Validador) and issubclass(RangoNumerico, Validador), "Ambas deben heredar de Validador"
assert NoVacio().validar("x") and not NoVacio().validar("") and not NoVacio().validar(None)
r = RangoNumerico(0, 10)
assert r.validar(0) and r.validar(10) and not r.validar(11) and not r.validar(-1)
try:
    Validador().validar(1)
    raise AssertionError("Validador.validar debería lanzar NotImplementedError")
except NotImplementedError:
    pass
```
:::
