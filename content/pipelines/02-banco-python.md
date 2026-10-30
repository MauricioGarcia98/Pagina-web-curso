---
titulo: "Banco 🏦: reglas financieras en Python"
nivel: Avanzado
duracion: 50
resumen: Cuota francesa y tabla de amortización, tramos de mora y provisiones, reglas de aprobación de crédito y conciliación de transacciones, programadas y probadas en Python.
---

**Banco Andino** (el caso 🏦 del módulo de SQL) necesita su lógica financiera en código: el área de riesgo quiere poder auditar cada regla. Recordemos el modelo:

```text
banco_clientes (cliente_id, …, segmento, score_crediticio)
banco_prestamos (prestamo_id, cliente_id, fecha_otorgado, monto, tasa_anual, plazo_meses, estado)
banco_cuotas (cuota_id, prestamo_id, numero, fecha_vencimiento, fecha_pago, monto)
banco_transacciones (tx_id, cuenta_id, fecha_hora, tipo, monto, canal, comercio, ciudad, es_fraude)
```

## La cuota francesa

En Latinoamérica casi todos los préstamos personales usan el **sistema francés**: todas las cuotas son **iguales**; al principio pagas sobre todo intereses y al final sobre todo capital.

```text
                 r
cuota = P · ─────────────      P = monto, r = tasa_anual / 12, n = plazo en meses
            1 − (1 + r)^(−n)
```

Ejemplo real del caso: el préstamo 1 es de **11.000** al **30 % anual** en **24 meses** → r = 0,025 → la cuota es **615,04**. Puedes verificarlo en la tabla: `SELECT monto FROM banco_cuotas WHERE prestamo_id = 1 LIMIT 1`.

Cada mes:

- **interés** = saldo pendiente × r
- **capital** = cuota − interés
- **nuevo saldo** = saldo − capital

:::analogia La bola de nieve al revés
Al principio el saldo es grande, así que el interés se come casi toda la cuota. Cada mes el saldo baja un poco, el interés baja, y una parte mayor de la misma cuota va a capital. La deuda se derrite cada vez más rápido.
:::

### Los primeros meses, a mano

Para entender una fórmula financiera, lo mejor es hacer dos o tres filas a mano antes de programarla. Con P = 11.000, r = 0,025 y una cuota de 615,04:

| Mes | Interés (saldo × r) | Capital (cuota − interés) | Saldo nuevo |
|---|---|---|---|
| 1 | 11.000 × 0,025 = **275,00** | 615,04 − 275,00 = **340,04** | 11.000 − 340,04 = **10.659,96** |
| 2 | 10.659,96 × 0,025 = **266,50** | 615,04 − 266,50 = **348,54** | **10.311,42** |
| 3 | 10.311,42 × 0,025 = **257,79** | 615,04 − 257,79 = **357,25** | **9.954,17** |

Fíjate que el interés baja y el capital sube mes a mes, con la misma cuota. Estas tres filas se convierten directamente en **tests**: si tu función de amortización no da 275,00 de interés en el mes 1, está mal, y lo sabes antes de que llegue a un reporte de riesgo.

```recorrido
titulo: La tabla de amortización del préstamo 1, mes a mes
estacion dato: El préstamo | icono=base
estacion cuota: La cuota | icono=engranaje
estacion mes1: Mes 1 | icono=reloj
estacion meses: Mes a mes | icono=flujo
estacion fin: Último mes | icono=check
paso dato: Los datos del préstamo
El préstamo 1 de `banco_prestamos`: 11.000 al 30 % anual en 24 meses.
>>> tabla
prestamo_id,monto,tasa_anual,plazo_meses
1,11000,0.3,24
paso cuota: Se calcula la cuota fija
Con r = 0,30 / 12 = 0,025 y n = 24, la fórmula da **615.04**. Esa cuota es la misma los 24 meses.
>>> python
P, r, n = 11000, 0.30 / 12, 24
cuota = round(P * r / (1 - (1 + r) ** -n), 2)
print(cuota)   # 615.04
paso mes1: Mes 1: casi todo es interés
Interés = saldo × r = 11.000 × 0,025. Lo que sobra de la cuota baja la deuda (capital).
>>> tabla
mes,interes,capital,saldo
1,275.00,340.04,10659.96
paso meses: Cada mes, menos interés y más capital
Como el saldo baja, el interés baja, y una parte mayor de la misma cuota va a capital. Mira los meses 1, 2, 3, 12 y 13:
>>> tabla
mes,interes,capital,saldo
1,275.00,340.04,10659.96
2,266.50,348.54,10311.42
3,257.79,357.25,9954.17
12,168.88,446.16,6308.97
13,157.72,457.32,5851.65
paso fin: El último mes, el saldo llega a 0
En el mes 24 casi toda la cuota es capital. Por el redondeo a centavos, la última cuota se ajusta para que el saldo quede **exactamente en 0**: un detalle que los tests deben cubrir.
>>> tabla
mes,interes,capital,saldo
22,43.91,571.13,1185.47
23,29.64,585.40,600.07
24,15.00,600.07,0.00
```

### Dinero y decimales: el detalle que separa a un junior de un senior

Las computadoras guardan los números con decimales (`float`) en binario, y muchos valores no se pueden representar exactos. En Python, `0.1 + 0.2` da `0.30000000000000004`, y `round(2.675, 2)` da `2.67` (no `2.68`), porque `2.675` en realidad se guarda como 2,67499999…

Para cálculos de dinero, Python trae el módulo `decimal`, que trabaja en base 10 como una calculadora:

```python
from decimal import Decimal, ROUND_HALF_UP

print(0.1 + 0.2)                                              # 0.30000000000000004
print(round(2.675, 2))                                        # 2.67  (sorpresa)
print(Decimal("2.675").quantize(Decimal("0.01"), ROUND_HALF_UP))   # 2.68  (redondeo comercial)
```

- `Decimal("2.675")` se crea **desde un texto**, no desde un float (si escribes `Decimal(2.675)`, hereda el error del float).
- `quantize(Decimal("0.01"), ROUND_HALF_UP)` redondea a centavos con la regla que se enseña en la escuela: 5 o más, hacia arriba.

En los ejercicios de abajo alcanza con `round`, pero en un sistema financiero real se usa `Decimal` (en Python) o `DECIMAL(18, 2)` (en SQL), nunca `float`. Y se **define una regla de redondeo**: ¿se redondea cada cuota y la última absorbe la diferencia, o se redondea al final? Esa regla la decide el área de negocio, no el programador, y va escrita en los tests.

:::ejercicio python titulo="Cuota francesa"
Escribe `cuota_francesa(monto, tasa_anual, meses)` que devuelva la cuota mensual redondeada a 2 decimales. Si la tasa es 0, la cuota es simplemente `monto / meses`.
```python inicial
def cuota_francesa(monto, tasa_anual, meses):
    pass

print(cuota_francesa(11000, 0.30, 24))   # debería dar 615.04, como en banco_cuotas
```
```python solucion
def cuota_francesa(monto, tasa_anual, meses):
    r = tasa_anual / 12
    if r == 0:
        return round(monto / meses, 2)
    return round(monto * r / (1 - (1 + r) ** -meses), 2)

print(cuota_francesa(11000, 0.30, 24))
```
```python test
assert cuota_francesa(11000, 0.30, 24) == 615.04, f"Obtuve {cuota_francesa(11000, 0.30, 24)}; debe coincidir con la tabla banco_cuotas"
assert cuota_francesa(18600, 0.25, 12) == 1767.82, f"18600 al 25% en 12 meses: {cuota_francesa(18600, 0.25, 12)}"
assert cuota_francesa(1200, 0, 12) == 100.0, "Con tasa 0 la cuota es monto / meses"
```
:::

:::ejercicio python titulo="Tabla de amortización"
Escribe `amortizacion(monto, tasa_anual, meses)` que devuelva una lista de diccionarios, uno por cuota, con `numero`, `cuota`, `interes`, `capital` y `saldo` (todo redondeado a 2). Usa la cuota francesa sin redondear para los cálculos. En la **última** cuota, ajusta el capital para que el saldo quede exactamente en `0.0` (por los redondeos) y la cuota sea `interes + capital`.
```python inicial
def amortizacion(monto, tasa_anual, meses):
    pass

for fila in amortizacion(1000, 0.24, 3):
    print(fila)
```
```python solucion
def amortizacion(monto, tasa_anual, meses):
    r = tasa_anual / 12
    cuota = monto / meses if r == 0 else monto * r / (1 - (1 + r) ** -meses)
    saldo, filas = monto, []
    for n in range(1, meses + 1):
        interes = saldo * r
        capital = cuota - interes
        if n == meses:
            capital = saldo
        saldo -= capital
        filas.append({"numero": n, "cuota": round(interes + capital, 2), "interes": round(interes, 2),
                      "capital": round(capital, 2), "saldo": round(abs(saldo), 2) if n == meses else round(saldo, 2)})
    return filas

for fila in amortizacion(1000, 0.24, 3):
    print(fila)
```
```python test
t = amortizacion(1000, 0.24, 3)
assert len(t) == 3, "Debe haber una fila por cuota"
assert t[0] == {"numero": 1, "cuota": 346.75, "interes": 20.0, "capital": 326.75, "saldo": 673.25}, f"Primera cuota: {t[0]}"
assert t[-1]["saldo"] == 0.0, f"El saldo final debe ser 0.0, es {t[-1]['saldo']}"
assert abs(sum(f["capital"] for f in t) - 1000) < 0.02, "La suma del capital debe devolver el monto prestado"
t2 = amortizacion(11000, 0.30, 24)
assert t2[0]["cuota"] == 615.04 and t2[0]["interes"] == 275.0, f"Préstamo 1 del caso: {t2[0]}"
assert all(t2[i]["interes"] > t2[i + 1]["interes"] for i in range(23)), "El interés debe bajar mes a mes"
```
:::

## Mora y provisiones

El regulador exige **provisionar** (reservar dinero) según los días de atraso de cada préstamo:

| Días de atraso | Tramo | Provisión |
|---|---|---|
| 0 o menos | `al_dia` | 1 % |
| 1 a 30 | `1-30` | 5 % |
| 31 a 60 | `31-60` | 20 % |
| 61 a 90 | `61-90` | 50 % |
| más de 90 | `90+` | 100 % |

:::ejercicio python titulo="Días de atraso, tramo y provisión"
1. `dias_atraso(vencimiento, pago, fecha_corte)`: fechas como texto `YYYY-MM-DD`; `pago` puede ser `None`. Si se pagó, el atraso es `pago − vencimiento` (mínimo 0). Si no se pagó: `fecha_corte − vencimiento` (mínimo 0; si aún no venció, 0).
2. `tramo(dias)`: devuelve el tramo según la tabla.
3. `provision(saldos)`: recibe una lista de `(saldo, dias)` y devuelve el total a provisionar redondeado a 2.
```python inicial
from datetime import date

PORCENTAJES = {"al_dia": 0.01, "1-30": 0.05, "31-60": 0.20, "61-90": 0.50, "90+": 1.00}

def dias_atraso(vencimiento, pago, fecha_corte):
    pass

def tramo(dias):
    pass

def provision(saldos):
    pass
```
```python solucion
from datetime import date

PORCENTAJES = {"al_dia": 0.01, "1-30": 0.05, "31-60": 0.20, "61-90": 0.50, "90+": 1.00}

def dias_atraso(vencimiento, pago, fecha_corte):
    v = date.fromisoformat(vencimiento)
    hasta = date.fromisoformat(pago) if pago else date.fromisoformat(fecha_corte)
    return max(0, (hasta - v).days)

def tramo(dias):
    if dias <= 0:
        return "al_dia"
    if dias <= 30:
        return "1-30"
    if dias <= 60:
        return "31-60"
    if dias <= 90:
        return "61-90"
    return "90+"

def provision(saldos):
    return round(sum(s * PORCENTAJES[tramo(d)] for s, d in saldos), 2)
```
```python test
assert dias_atraso("2024-03-10", "2024-03-15", "2024-12-31") == 5, "Pagada 5 días tarde"
assert dias_atraso("2024-03-10", "2024-03-01", "2024-12-31") == 0, "Pagada antes: 0 días (no negativo)"
assert dias_atraso("2024-12-01", None, "2024-12-31") == 30, "Impaga al corte: 30 días"
assert dias_atraso("2025-01-15", None, "2024-12-31") == 0, "Todavía no vence: 0"
assert [tramo(d) for d in (0, 1, 30, 31, 60, 61, 90, 91)] == ["al_dia", "1-30", "1-30", "31-60", "31-60", "61-90", "61-90", "90+"], "Revisa los límites de los tramos (30 es 1-30, 31 es 31-60…)"
assert provision([(1000, 0), (1000, 15), (1000, 45), (1000, 75), (1000, 200)]) == 1760.0, f"Provisión: {provision([(1000, 0), (1000, 15), (1000, 45), (1000, 75), (1000, 200)])}"
```
:::

## Aprobar o rechazar un crédito

Un **motor de decisión** es una función que recibe los datos de una solicitud y devuelve una respuesta (aprobar, rechazar o derivar a un analista) **con el motivo**. El motivo no es un detalle: el regulador y el cliente tienen derecho a saber por qué se rechazó un crédito, así que cada `return` dice qué regla se aplicó. Las reglas se evalúan **en orden**, de la más grave a la más leve, y la primera que se cumple decide. Escribirlas en una función pura (sin leer bases ni la hora actual) permite probar cada regla con un `assert` y auditar la decisión años después con los mismos datos.


:::ejercicio python titulo="Motor de decisión de crédito"
Escribe `decidir(score, ingreso_mensual, monto, meses)` que devuelva un diccionario `{"decision": ..., "tasa": ..., "cuota": ..., "motivo": ...}` con estas reglas, **en orden**:

1. `score < 500` → rechazado, motivo `"score_bajo"`.
2. La tasa anual depende del score: `>= 750` → 0.22; `>= 650` → 0.27; si no → 0.32.
3. Calcula la cuota francesa con esa tasa (redondeada a 2). Si `cuota > 35 %` del ingreso → rechazado, motivo `"cuota_alta"`.
4. Si no, aprobado con motivo `None`.

En los rechazos por score, `tasa` y `cuota` son `None`; en los rechazos por cuota alta se informan igual (sirven para explicarle al cliente).
```python inicial
def cuota_francesa(monto, tasa_anual, meses):
    r = tasa_anual / 12
    return round(monto * r / (1 - (1 + r) ** -meses), 2)

def decidir(score, ingreso_mensual, monto, meses):
    pass
```
```python solucion
def cuota_francesa(monto, tasa_anual, meses):
    r = tasa_anual / 12
    return round(monto * r / (1 - (1 + r) ** -meses), 2)

def decidir(score, ingreso_mensual, monto, meses):
    if score < 500:
        return {"decision": "rechazado", "tasa": None, "cuota": None, "motivo": "score_bajo"}
    tasa = 0.22 if score >= 750 else 0.27 if score >= 650 else 0.32
    cuota = cuota_francesa(monto, tasa, meses)
    if cuota > 0.35 * ingreso_mensual:
        return {"decision": "rechazado", "tasa": tasa, "cuota": cuota, "motivo": "cuota_alta"}
    return {"decision": "aprobado", "tasa": tasa, "cuota": cuota, "motivo": None}
```
```python test
assert decidir(480, 5000, 1000, 12) == {"decision": "rechazado", "tasa": None, "cuota": None, "motivo": "score_bajo"}
r = decidir(760, 3000, 10000, 24)
assert r["decision"] == "aprobado" and r["tasa"] == 0.22 and r["cuota"] == 518.78, f"{r}"
r = decidir(700, 1000, 10000, 12)
assert r["decision"] == "rechazado" and r["motivo"] == "cuota_alta" and r["tasa"] == 0.27, f"{r}"
assert decidir(650, 9000, 5000, 12)["tasa"] == 0.27, "650 exacto ya es tramo 0.27"
assert decidir(649, 9000, 5000, 12)["tasa"] == 0.32
assert decidir(500, 9000, 5000, 12)["decision"] == "aprobado", "500 exacto no es score bajo"
```
:::

## Conciliación

Cada noche el banco compara sus transacciones con las del **procesador de tarjetas**. Las diferencias se investigan: puede ser un error, una demora o un fraude.

Conciliar dos fuentes siempre tiene la misma forma, sea en Python, en SQL o en Spark. Se arman los dos conjuntos por una **clave común** (el `tx_id`) y cada transacción cae en uno de cuatro grupos:

| Grupo | Significado | Qué se hace |
|---|---|---|
| En las dos, con el mismo monto | Conciliada | Nada |
| En las dos, con distinto monto | Diferencia de importe | Se investiga (comisión, error de redondeo, fraude) |
| Solo en el banco | Falta en el procesador | Puede ser una demora: se revisa al día siguiente |
| Solo en el procesador | Falta en el banco | La más grave: dinero que se movió sin registro interno |

En SQL esto es un `FULL OUTER JOIN` por la clave; en Python, operaciones con conjuntos de claves (`a.keys() & b.keys()`, `a.keys() - b.keys()`). Lo que nunca se hace es comparar solo los **totales**: dos errores opuestos se cancelan y el total cuadra aunque haya dos transacciones mal.


:::ejercicio python titulo="Conciliar dos fuentes"
Escribe `conciliar(banco, procesador)` donde ambas son listas de diccionarios `{"tx_id": ..., "monto": ...}`. Devuelve un diccionario con:

- `"solo_banco"`: `tx_id` que están en el banco y no en el procesador (ordenados)
- `"solo_procesador"`: al revés (ordenados)
- `"diferencias"`: lista de `(tx_id, monto_banco, monto_procesador)` de los que están en ambos con montos que difieren en más de 0.01 (ordenada por `tx_id`)
- `"conciliadas"`: cantidad de `tx_id` presentes en ambos con el mismo monto
```python inicial
def conciliar(banco, procesador):
    pass

banco = [{"tx_id": 1, "monto": -10.0}, {"tx_id": 2, "monto": -25.5}, {"tx_id": 3, "monto": -7.0}, {"tx_id": 5, "monto": -1.0}]
proc = [{"tx_id": 2, "monto": -25.5}, {"tx_id": 3, "monto": -70.0}, {"tx_id": 4, "monto": -3.0}, {"tx_id": 1, "monto": -10.004}]
print(conciliar(banco, proc))
```
```python solucion
def conciliar(banco, procesador):
    b = {t["tx_id"]: t["monto"] for t in banco}
    p = {t["tx_id"]: t["monto"] for t in procesador}
    comunes = sorted(b.keys() & p.keys())
    diferencias = [(k, b[k], p[k]) for k in comunes if abs(b[k] - p[k]) > 0.01]
    return {
        "solo_banco": sorted(b.keys() - p.keys()),
        "solo_procesador": sorted(p.keys() - b.keys()),
        "diferencias": diferencias,
        "conciliadas": len(comunes) - len(diferencias),
    }

banco = [{"tx_id": 1, "monto": -10.0}, {"tx_id": 2, "monto": -25.5}, {"tx_id": 3, "monto": -7.0}, {"tx_id": 5, "monto": -1.0}]
proc = [{"tx_id": 2, "monto": -25.5}, {"tx_id": 3, "monto": -70.0}, {"tx_id": 4, "monto": -3.0}, {"tx_id": 1, "monto": -10.004}]
print(conciliar(banco, proc))
```
```python test
r = conciliar(banco, proc)
assert r["solo_banco"] == [5], f"solo_banco: {r['solo_banco']}"
assert r["solo_procesador"] == [4], f"solo_procesador: {r['solo_procesador']}"
assert r["diferencias"] == [(3, -7.0, -70.0)], f"diferencias: {r['diferencias']} (una diferencia de 0.004 se tolera)"
assert r["conciliadas"] == 2, f"conciliadas: {r['conciliadas']}"
assert conciliar([], []) == {"solo_banco": [], "solo_procesador": [], "diferencias": [], "conciliadas": 0}
```
```pista
Convierte cada lista en un diccionario `tx_id → monto` y usa operaciones de conjuntos sobre las claves: `&` (intersección) y `-` (diferencia).
```
:::

:::ejercicio quiz
¿Por qué conviene que estas reglas sean **funciones puras** (sin leer bases de datos ni la fecha actual adentro)?

- [ ] Porque Python es más rápido así
- [x] Porque se pueden probar con tests unitarios, reutilizar en Spark (como UDF), en una API o en Airflow, y dan siempre el mismo resultado para la misma entrada
- [ ] Porque el regulador lo prohíbe
- [ ] No conviene
:::

:::errores
- **Usar `float` para dinero** y comparar con `==`: `0.1 + 0.2 == 0.3` es `False`. Usa `Decimal`, o compara con tolerancia (`abs(a - b) < 0.005`) cuando solo verificas.
- **Calcular los días de atraso con la fecha de hoy** (`date.today()`): reprocesar el mes pasado da otro resultado. La fecha de corte entra como parámetro.
- **Motor de decisión sin motivo**: un "rechazado" sin explicación no se puede auditar ni explicar al cliente.
- **Conciliar por totales**: dos errores opuestos se cancelan.
- **Olvidar las cuotas sin fecha de pago**: no pagadas no es lo mismo que pagadas el día cero; el atraso se calcula hasta la fecha de corte.
:::

:::trabajo
- En bancos y fintechs, las reglas de riesgo viven en código versionado y cada cambio de regla queda registrado con la fecha desde la que aplica, porque una auditoría puede preguntar "¿por qué se aprobó este crédito en 2023?".
- La conciliación diaria es un pipeline clásico: se carga el archivo del procesador, se cruza con las transacciones internas y las diferencias van a una tabla que un equipo de operaciones revisa cada mañana.
- Los tests de estas funciones usan ejemplos que da el área de negocio (con los números de un préstamo real anonimizado): así los dos lados acuerdan qué es "correcto".
:::

:::entrevista "¿Cómo garantizarías que un cálculo financiero en un pipeline es correcto?"
Primero pediría al área de negocio ejemplos resueltos a mano, incluidos los casos borde (pago el mismo día del vencimiento, cuotas sin pago, montos cero), y los convertiría en tests antes de programar. Usaría `Decimal` o tipos `DECIMAL` en SQL para evitar errores de punto flotante, con una regla de redondeo explícita. La función sería pura, con la fecha de corte como parámetro, para que reprocesar dé el mismo resultado. Y en el pipeline agregaría controles de cuadre, por ejemplo que la suma de capital de la tabla de amortización sea igual al monto del préstamo.
:::
