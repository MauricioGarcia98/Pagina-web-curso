---
titulo: De la regla de negocio al código
nivel: Intermedio
duracion: 35
resumen: Cómo convertir una regla escrita en palabras en una función probada, qué va en Python, qué va en SQL/dbt, qué va en Spark y qué va en Airflow, y los principios que hacen confiable un pipeline.
---

## El trabajo real de un data engineer

En las empresas casi nunca te piden "haz un `GROUP BY`". Te dicen cosas como:

> "Un préstamo está **en mora** si tiene alguna cuota vencida sin pagar. Si el atraso supera 90 días se considera **incobrable** y hay que provisionar el 100 %."

Tu trabajo es convertir esa frase en **código correcto, probado y que corra todos los días sin que nadie lo mire**. Este módulo toma los ocho casos del curso (banco, streaming, movilidad, clínica, SaaS, aerolínea, logística y tienda) y los resuelve con **todas** las herramientas.

## El método en 5 pasos

1. **Escribe la regla con tus palabras y con ejemplos.** "Cuota con vencimiento 10/03, pagada el 15/03 → 5 días de atraso. No pagada al 31/12 → atraso = 31/12 − 10/03."
2. **Encuentra los casos borde.** ¿Pagada el mismo día del vencimiento? ¿Sin fecha de pago? ¿Monto cero? ¿Fechas en el futuro?
3. **Escribe primero los tests** (los ejemplos del paso 1 y 2 como `assert`).
4. **Programa la función más simple** que pase los tests.
5. **Decide dónde vive** esa lógica en el pipeline (tabla de abajo).

:::analogia La receta antes de cocinar
Un cocinero no improvisa con 200 comensales esperando: escribe la receta, la prueba con una porción y recién ahí cocina para todos. Los tests son la porción de prueba; el pipeline es cocinar para todos, todos los días.
:::

## ¿Dónde vive cada pieza?

| Herramienta | Qué lógica le toca | Ejemplo en el banco |
|---|---|---|
| **Python** (funciones puras) | Reglas con muchas condiciones, cálculos financieros, validaciones, llamadas a APIs | Cuota francesa, decisión de aprobar un préstamo |
| **SQL / dbt** | Uniones, agregaciones, métricas de negocio, capas staging → marts, tests de datos | Mora por cartera, saldo por cuenta |
| **PySpark** | Lo mismo que SQL pero a gran escala o con lógica que no cabe en SQL (UDF, ML, archivos crudos) | Limpiar 500 millones de transacciones |
| **Airflow** | **Cuándo** y **en qué orden** corre todo; reintentos, alertas, dependencias | "Cada día: cargar → limpiar → calcular mora → avisar" |

:::cuidado Airflow orquesta, no procesa
Un error muy común es meter el procesamiento pesado *dentro* de una tarea de Airflow (por ejemplo, leer millones de filas con pandas en un `PythonOperator`). Airflow debe **disparar** el trabajo (un job de Spark, un `dbt build`, una consulta en el warehouse) y esperar el resultado.
:::

## Los 6 principios de un pipeline confiable

| Principio | Qué significa | Cómo se logra |
|---|---|---|
| **Idempotencia** | Correr dos veces lo mismo da el mismo resultado (no duplica) | Sobrescribir la partición del día, `MERGE` por clave, nunca `INSERT` ciego |
| **Determinismo** | Mismo input → mismo output | Nada de `now()` escondido: la fecha de proceso entra como parámetro (`{{ ds }}`) |
| **Atomicidad** | O se publica todo, o nada | Escribir en una tabla temporal y renombrar; formatos con transacciones (Delta, Iceberg) |
| **Observabilidad** | Saber qué pasó sin adivinar | Logs, conteos por paso, alertas, métricas de frescura |
| **Calidad en la puerta** | Los datos malos se detectan antes de llegar al reporte | Tests (dbt, asserts), cuarentena de filas inválidas |
| **Reprocesable** | Poder recalcular un día o un mes | Guardar bronze inmutable, parametrizar por fecha, *backfill* |

## Ejercicios

:::ejercicio python titulo="Porcentaje seguro"
Muchas métricas son "parte sobre total" (tasa de mora, de churn, de puntualidad). Escribe `pct(parte, total, decimales=2)` que devuelva el porcentaje redondeado, y `None` si el total es 0 o `None` (no queremos un error ni un falso 0 %).
```python inicial
def pct(parte, total, decimales=2):
    pass
```
```python solucion
def pct(parte, total, decimales=2):
    if not total:
        return None
    return round(100 * parte / total, decimales)
```
```python test
assert pct(1, 3) == 33.33, f"pct(1, 3) = {pct(1, 3)}"
assert pct(1, 3, 1) == 33.3, "Debe respetar los decimales pedidos"
assert pct(5, 0) is None, "Total 0 → None (no ZeroDivisionError)"
assert pct(5, None) is None, "Total None → None"
assert pct(0, 10) == 0.0, "0 de 10 es 0 %, no None"
```
:::

:::ejercicio python titulo="Validador de registros con cuarentena"
Escribe `validar(filas)` que reciba diccionarios de transacciones con `tx_id`, `cuenta_id`, `monto` y `tipo`, y devuelva `(validas, cuarentena)`. Cada elemento de `cuarentena` es `(fila, motivo)`. Reglas, **en este orden** (se informa el primer motivo que falle):

1. `tx_id` repetido (ya visto antes en la lista) → `"duplicado"`
2. `cuenta_id` es `None` → `"sin_cuenta"`
3. `tipo` no está en `{"compra", "deposito", "retiro", "transferencia", "pago_tarjeta"}` → `"tipo_invalido"`
4. el signo no corresponde: `deposito` debe tener `monto > 0`, el resto `monto < 0` → `"signo_incorrecto"`
```python inicial
def validar(filas):
    pass

filas = [
    {"tx_id": 1, "cuenta_id": 10, "monto": 500.0, "tipo": "deposito"},
    {"tx_id": 2, "cuenta_id": 10, "monto": -30.0, "tipo": "compra"},
    {"tx_id": 2, "cuenta_id": 10, "monto": -30.0, "tipo": "compra"},
    {"tx_id": 3, "cuenta_id": None, "monto": -5.0, "tipo": "retiro"},
    {"tx_id": 4, "cuenta_id": 11, "monto": -9.0, "tipo": "regalo"},
    {"tx_id": 5, "cuenta_id": 11, "monto": 20.0, "tipo": "compra"},
]
v, q = validar(filas)
print(len(v), "válidas;", [(f["tx_id"], m) for f, m in q])
```
```python solucion
TIPOS = {"compra", "deposito", "retiro", "transferencia", "pago_tarjeta"}

def validar(filas):
    validas, cuarentena, vistos = [], [], set()
    for f in filas:
        if f["tx_id"] in vistos:
            motivo = "duplicado"
        elif f["cuenta_id"] is None:
            motivo = "sin_cuenta"
        elif f["tipo"] not in TIPOS:
            motivo = "tipo_invalido"
        elif (f["tipo"] == "deposito") != (f["monto"] > 0) or f["monto"] == 0:
            motivo = "signo_incorrecto"
        else:
            motivo = None
        vistos.add(f["tx_id"])
        if motivo:
            cuarentena.append((f, motivo))
        else:
            validas.append(f)
    return validas, cuarentena

filas = [
    {"tx_id": 1, "cuenta_id": 10, "monto": 500.0, "tipo": "deposito"},
    {"tx_id": 2, "cuenta_id": 10, "monto": -30.0, "tipo": "compra"},
    {"tx_id": 2, "cuenta_id": 10, "monto": -30.0, "tipo": "compra"},
    {"tx_id": 3, "cuenta_id": None, "monto": -5.0, "tipo": "retiro"},
    {"tx_id": 4, "cuenta_id": 11, "monto": -9.0, "tipo": "regalo"},
    {"tx_id": 5, "cuenta_id": 11, "monto": 20.0, "tipo": "compra"},
]
v, q = validar(filas)
print(len(v), "válidas;", [(f["tx_id"], m) for f, m in q])
```
```python test
v, q = validar(filas)
assert [f["tx_id"] for f in v] == [1, 2], f"Válidas: {[f['tx_id'] for f in v]}"
assert [(f["tx_id"], m) for f, m in q] == [(2, "duplicado"), (3, "sin_cuenta"), (4, "tipo_invalido"), (5, "signo_incorrecto")], f"Cuarentena: {[(f['tx_id'], m) for f, m in q]}"
v2, q2 = validar([{"tx_id": 9, "cuenta_id": 1, "monto": -1.0, "tipo": "deposito"}])
assert v2 == [] and q2[0][1] == "signo_incorrecto", "Un depósito negativo tiene el signo incorrecto"
assert validar([]) == ([], []), "Sin filas"
```
```pista
Usa un `set` con los `tx_id` vistos. Para el signo: un depósito debe ser positivo y todo lo demás negativo, es decir, `(tipo == "deposito") != (monto > 0)` indica error.
```
:::

:::ejercicio quiz
Tu DAG diario hace `INSERT INTO gold.ventas SELECT … WHERE fecha = '{{ ds }}'`. Un día falla a la mitad y lo re-ejecutas. ¿Qué problema aparece?

- [ ] Ninguno
- [x] Puede duplicar filas: el paso no es idempotente. Mejor borrar/sobrescribir la partición de esa fecha o usar `MERGE`
- [ ] Airflow no permite re-ejecutar
- [ ] Se pierden los datos de bronze
:::

:::ejercicio quiz
Un compañero calcula "clientes inactivos" con `WHERE ultima_compra < date('now', '-90 days')`. ¿Qué principio rompe?

- [ ] Atomicidad
- [x] Determinismo: re-ejecutar el mismo día en otro momento da otro resultado. La fecha de referencia debe entrar como parámetro (la fecha lógica del DAG)
- [ ] Ninguno, es correcto
- [ ] Observabilidad
:::

:::ejercicio quiz
¿Dónde pondrías la regla "aprobar un préstamo si el score ≥ 500 y la cuota no supera el 35 % del ingreso"?

- [ ] En la configuración de Airflow
- [x] En una función de Python (o una expresión SQL) con tests unitarios, que luego usa el pipeline
- [ ] En un comentario del DAG
- [ ] En un dashboard
:::
