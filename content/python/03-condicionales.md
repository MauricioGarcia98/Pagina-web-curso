---
titulo: Condicionales: if, elif, else
nivel: Básico
duracion: 20
resumen: Tomar decisiones con comparaciones, operadores lógicos e indentación.
---

## if: hacer algo solo si se cumple una condición

```python
stock = 3
if stock < 5:
    print("¡Quedan pocas unidades!")
    print("Reponer pronto")
print("Fin del chequeo")
```

:::cuidado La indentación es obligatoria
En Python, **los espacios al inicio de la línea** definen qué código está “dentro” del `if`. Usa 4 espacios (el editor lo hace solo con <kbd>Tab</kbd>). Y no olvides los **dos puntos** `:` al final de la línea del `if`.
:::

## elif y else

```python
total = 1800
if total >= 2000:
    envio = 0
elif total >= 1000:
    envio = 50
else:
    envio = 120
print("Costo de envío:", envio)
```

Python revisa las condiciones de arriba hacia abajo y ejecuta **solo el primer bloque** que se cumple (igual que `CASE WHEN` en SQL).

## Comparaciones y lógica

| Comparación | Significado |
|---|---|
| `==` | igual (¡dos signos! uno solo `=` es asignar) |
| `!=` | distinto |
| `<`, `<=`, `>`, `>=` | menor, mayor… |
| `in` | está contenido en |

Combina condiciones con `and`, `or`, `not`:

```python
pais = "Chile"
edad = 17
if pais in ("Chile", "Perú") and not edad < 18:
    print("Puede registrarse")
else:
    print("No puede registrarse")
```

Python permite comparaciones encadenadas: `0 <= descuento <= 0.5`.

## Valores "verdaderos" y "falsos" (truthiness)

En un `if`, estos valores cuentan como **falsos**: `False`, `None`, `0`, `0.0`, `""` (texto vacío), `[]`, `{}`. Todo lo demás es verdadero.

```python
email = ""
if not email:
    print("Falta el email")
```

## Expresión condicional (if en una línea)

```python
nota = 7
resultado = "aprobado" if nota >= 6 else "desaprobado"
print(resultado)
```

## Ejercicios

:::ejercicio python
Dado `temperatura = 31`, guarda en `estado` el texto `"calor"` si es mayor a 28, `"templado"` si está entre 15 y 28 (incluidos) y `"frío"` si es menor a 15. Tu código debe funcionar con cualquier temperatura.
```python inicial
temperatura = 31
```
```python solucion
temperatura = 31
if temperatura > 28:
    estado = "calor"
elif temperatura >= 15:
    estado = "templado"
else:
    estado = "frío"
```
```python test
assert estado == "calor", f"Con 31 grados estado debería ser 'calor' y es {estado!r}"
```
:::

:::ejercicio python
Escribe una regla de envío gratis: `gratis = True` si `total` es al menos 2000 **o** si `es_premium` es `True`; si no, `gratis = False`. Prueba con `total = 1500` y `es_premium = True`.
```python inicial
total = 1500
es_premium = True
```
```python solucion
total = 1500
es_premium = True
gratis = total >= 2000 or es_premium
```
```python test
assert gratis is True, "Con un cliente premium el envío debe ser gratis"
```
:::

:::ejercicio python
Clasifica un pedido según su `estado`. Si es `"entregado"` imprime `OK`; si es `"cancelado"` o `"devuelto"` imprime `PROBLEMA`; en cualquier otro caso imprime `EN CURSO`. Prueba con `estado = "devuelto"`.
```python inicial
estado = "devuelto"
```
```python solucion
estado = "devuelto"
if estado == "entregado":
    print("OK")
elif estado in ("cancelado", "devuelto"):
    print("PROBLEMA")
else:
    print("EN CURSO")
```
```python test
assert salida.strip() == "PROBLEMA", f"Con estado 'devuelto' se esperaba PROBLEMA y se imprimió {salida.strip()!r}"
```
:::
