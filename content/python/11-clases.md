---
titulo: Programación orientada a objetos
nivel: Avanzado
duracion: 35
resumen: Clases, objetos, métodos, herencia, métodos especiales y dataclasses.
---

Una **clase** es un molde para crear **objetos** que agrupan **datos** (atributos) y **comportamiento** (métodos). Casi todo lo que usarás en PySpark o Airflow son objetos: un `DataFrame`, una `SparkSession`, un `DAG`, un operador…

```python
class Producto:
    def __init__(self, nombre, precio, stock=0):   # constructor: se ejecuta al crear el objeto
        self.nombre = nombre                       # self = "este objeto"
        self.precio = precio
        self.stock = stock

    def valor_inventario(self):
        return self.precio * self.stock

    def vender(self, unidades):
        if unidades > self.stock:
            raise ValueError(f"Stock insuficiente de {self.nombre}")
        self.stock -= unidades

mouse = Producto("Mouse", 25.0, stock=40)    # crear un objeto (instancia)
mouse.vender(3)
print(mouse.nombre, mouse.stock, mouse.valor_inventario())
```

## Métodos especiales (dunder)

Los métodos con doble guion bajo cambian cómo se comporta el objeto con Python:

```python
class Dinero:
    def __init__(self, monto, moneda="USD"):
        self.monto = monto
        self.moneda = moneda

    def __repr__(self):                       # cómo se muestra
        return f"Dinero({self.monto:.2f} {self.moneda})"

    def __add__(self, otro):                  # qué hace el +
        if self.moneda != otro.moneda:
            raise ValueError("No se pueden sumar monedas distintas")
        return Dinero(self.monto + otro.monto, self.moneda)

    def __eq__(self, otro):                   # qué hace el ==
        return (self.monto, self.moneda) == (otro.monto, otro.moneda)

print(Dinero(10) + Dinero(5.5))
```

¡Así es como PySpark permite escribir `F.col("a") + F.col("b")`!

## Herencia

Una clase puede **heredar** de otra y especializarla:

```python
class Fuente:
    def __init__(self, nombre):
        self.nombre = nombre
    def leer(self):
        raise NotImplementedError
    def describir(self):
        return f"Fuente {self.nombre}"

class FuenteCSV(Fuente):
    def __init__(self, nombre, separador=","):
        super().__init__(nombre)            # llama al constructor del padre
        self.separador = separador
    def leer(self):
        return f"leyendo {self.nombre} separado por '{self.separador}'"

class FuenteAPI(Fuente):
    def leer(self):
        return f"llamando a la API {self.nombre}"

for f in [FuenteCSV("ventas.csv", ";"), FuenteAPI("https://api/pedidos")]:
    print(f.describir(), "→", f.leer())     # polimorfismo: misma interfaz, distinto comportamiento
```

Así funcionan los operadores de Airflow: todos heredan de `BaseOperator` e implementan `execute()`.

## dataclasses: clases de datos sin repetir código

```python
from dataclasses import dataclass, field

@dataclass
class Pedido:
    id: int
    cliente: str
    items: list = field(default_factory=list)
    pagado: bool = False

    def total(self):
        return sum(i["cantidad"] * i["precio"] for i in self.items)

p = Pedido(1, "Eva", [{"cantidad": 2, "precio": 10.0}])
print(p, p.total())   # __init__, __repr__ y __eq__ se generan solos
```

## Propiedades y métodos de clase

```python
class Temperatura:
    def __init__(self, celsius):
        self.celsius = celsius

    @property
    def fahrenheit(self):              # se usa como atributo: t.fahrenheit
        return self.celsius * 9 / 5 + 32

    @classmethod
    def desde_fahrenheit(cls, f):      # constructor alternativo
        return cls((f - 32) * 5 / 9)

t = Temperatura.desde_fahrenheit(212)
print(t.celsius, t.fahrenheit)
```

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
