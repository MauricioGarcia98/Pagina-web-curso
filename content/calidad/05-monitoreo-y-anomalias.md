---
titulo: Monitoreo de datos y detección de anomalías
nivel: Experto
duracion: 65
resumen: Las pruebas revisan reglas que conoces; el monitoreo detecta lo que no esperabas - un día con la mitad de las cargas, una tasa de nulos que se triplica, un canal que de repente pesa el doble. Comparas cada día con su historia reciente, mides cambios de distribución, calculas el cumplimiento de un acuerdo de frescura y cuentas violaciones por regla en PySpark, y aprendes a no ahogar al equipo en falsas alarmas.
objetivos: Comparar el volumen de cada día con el promedio de los días anteriores | Medir la tasa de nulos y su evolución en el tiempo | Detectar cambios de distribución entre un período base y el actual | Implementar un detector de anomalías simple y explicable en Python | Contar violaciones por regla en PySpark para un tablero de calidad | Reducir falsas alarmas con umbrales, ventanas y contexto de negocio
prerrequisitos: calidad-contratos-y-esquemas | entrevistas-sql-acumulados-y-retencion
autoevaluacion: ¿Por qué comparar con los días anteriores y no con el promedio de todo el año? | ¿Qué falsos positivos aparecen al final de una serie? | ¿Cómo mides que la mezcla de canales cambió? | ¿Qué hace que una alerta sea útil y no ruido?
---

:::analogia En palabras simples
Tu médico no te dice "tu pulso es 90" sin más: lo compara con tu pulso habitual. 90 es normal para alguien y alarmante para otro. El monitoreo de datos compara cada número con **su propia historia reciente**, no con un valor fijo inventado.
:::

## Las cuatro señales que se monitorean siempre

| Señal | Pregunta | Ejemplo en la tienda |
|---|---|---|
| **Volumen** | ¿Llegó la cantidad de filas de siempre? | El 17 de julio llegaron 4 cargas contra 16,6 de promedio |
| **Frescura** | ¿El último dato es de cuando debería? | La última carga tiene 32 horas a las 08:00 del 6 de enero |
| **Completitud** | ¿Subió la tasa de nulos de alguna columna? | Montos nulos: 1,2 % en septiembre, 4,8 % en octubre |
| **Distribución** | ¿Cambió la mezcla de valores? | El peso de cada canal en diciembre contra 2023 |

Así lo plantean las herramientas de observabilidad de datos, como el monitoreo de calidad de Databricks Lakehouse Monitoring o los tests de frescura de dbt (`dbt source freshness`).

## Comparar con la historia reciente

Una regla simple y explicable: "alerta si las filas de hoy son menos de la mitad del promedio de los 7 días anteriores". Con funciones de ventana:

```sql
WITH d AS (
  SELECT substr(cargado_en, 1, 10) AS dia, COUNT(*) AS cargas
  FROM bronze_pedidos WHERE archivo <> 'pedidos_qa.json'
  GROUP BY 1
)
SELECT dia, cargas,
       ROUND(AVG(cargas) OVER (ORDER BY dia ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING), 1) AS prom_7d
FROM d
ORDER BY dia;
```

El marco `ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING` excluye el día actual: si lo incluyeras, la caída se diluiría en su propio promedio.

:::cuidado Falsos positivos al final de la serie
Esa regla marca el 17 de julio (una caída real) y también el 2, 3 y 5 de enero de 2025. Esos días no son una caída: es el final de los datos, donde solo llegan reenvíos atrasados. Antes de alertar, piensa qué días son **normalmente** bajos: fines de semana, feriados, el último día parcial. Una alerta que suena por cosas esperables se termina ignorando.
:::

## Cambios de distribución

Que el total no cambie no quiere decir que todo esté igual. Compara el **porcentaje** de cada valor entre un período base y el actual; una diferencia grande en puntos porcentuales indica un cambio de mezcla (o un problema de carga en un canal).

## Un detector explicable

Los métodos sofisticados existen, pero en la mayoría de los equipos lo que funciona es una regla que cualquiera entiende: "el valor se aleja más de X % del promedio de las últimas N observaciones". Es fácil de explicar en una alerta ("hoy 4, lo normal es 17") y fácil de ajustar.

:::practica sql El tablero de volumen diario con alerta
1. Ejecuta: verás las cargas de cada día, el promedio de los 7 días anteriores y una columna `alerta`.
2. Busca las filas con alerta: ¿cuál es una caída real y cuáles son el final de la serie?
3. Cambia el umbral de `0.5` a `0.7` y mira cuántas alertas nuevas aparecen. ¿Valen la pena?

```sql
WITH d AS (
  SELECT substr(cargado_en, 1, 10) AS dia, COUNT(*) AS cargas
  FROM bronze_pedidos WHERE archivo <> 'pedidos_qa.json'
  GROUP BY 1
),
m AS (
  SELECT dia, cargas,
         AVG(cargas) OVER (ORDER BY dia ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING) AS prom_7d
  FROM d
)
SELECT dia, cargas, ROUND(prom_7d, 1) AS prom_7d,
       CASE WHEN prom_7d IS NOT NULL AND cargas < 0.5 * prom_7d THEN '⚠ caída' ELSE '' END AS alerta
FROM m
ORDER BY dia;
```

Reto: agrega la regla opuesta, "pico": más del doble del promedio. ¿Aparece el día de recuperación después de la caída?

Documentación oficial: [Marcos de ventana (SQLite)](https://www.sqlite.org/windowfunctions.html#frame_specifications) · [Frescura de fuentes (dbt)](https://docs.getdbt.com/reference/resource-properties/freshness) · [Lakehouse Monitoring (Databricks)](https://docs.databricks.com/aws/en/lakehouse-monitoring/)
:::

:::errores
- **Umbrales fijos inventados.** "Alerta si hay menos de 100 filas" deja de servir cuando el negocio crece. Compara con la historia.
- **Incluir el día actual en su propio promedio.** Suaviza la anomalía que quieres ver.
- **Alertar por todo.** Pocas alertas, accionables y con contexto ("hoy 4, lo normal es 17").
- **Monitorear solo el volumen.** Un día puede tener las filas de siempre y la mitad de los montos nulos.
:::

:::entrevista
**Pregunta:** "¿Cómo te enteras de que un pipeline cargó datos malos si no falló?"

**Respuesta modelo:** "Con monitoreo de cuatro señales sobre la salida: volumen comparado con los días anteriores, frescura contra el SLA, tasa de nulos por columna y distribución de las columnas clave contra un período base. Cada señal tiene un umbral relativo, y las alertas dicen el valor actual y el esperado. Reviso las alertas que fueron falsas para ajustar: si una alerta suena seguido y nadie actúa, está mal calibrada."
:::

## Ejercicios

:::ejercicio sql dificultad=Experto titulo="Días con caída de cargas"
Con las cargas por día de `bronze_pedidos` (día = primeros 10 caracteres de `cargado_en`, sin el archivo `pedidos_qa.json`), devuelve los días en que hubo **menos de la mitad** del promedio de los 7 días anteriores (sin contar el día actual). Columnas: `dia`, `cargas`, `prom_7d` (redondeado a 1).
```sql solucion
WITH d AS (
  SELECT substr(cargado_en, 1, 10) AS dia, COUNT(*) AS cargas
  FROM bronze_pedidos WHERE archivo <> 'pedidos_qa.json'
  GROUP BY 1
),
m AS (
  SELECT dia, cargas, AVG(cargas) OVER (ORDER BY dia ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING) AS prom_7d
  FROM d
)
SELECT dia, cargas, ROUND(prom_7d, 1) AS prom_7d
FROM m
WHERE prom_7d IS NOT NULL AND cargas < 0.5 * prom_7d;
```
```pista
El promedio de los días anteriores sin el actual: `AVG(cargas) OVER (ORDER BY dia ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING)`.
```
```pista
Filtra en una capa externa: las funciones de ventana no se pueden usar en el `WHERE` de la misma consulta.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="Tasa de montos nulos por mes"
Para cada mes de carga de `bronze_pedidos` (primeros 7 caracteres de `cargado_en`), devuelve las filas y el porcentaje de montos nulos con 1 decimal. Columnas: `mes`, `filas`, `pct_nulos`.
```sql solucion
SELECT substr(cargado_en, 1, 7) AS mes, COUNT(*) AS filas,
       ROUND(100.0 * SUM(CASE WHEN monto IS NULL THEN 1 ELSE 0 END) / COUNT(*), 1) AS pct_nulos
FROM bronze_pedidos
GROUP BY 1;
```
```pista
`100.0 * SUM(CASE WHEN monto IS NULL THEN 1 ELSE 0 END) / COUNT(*)`: el `100.0` evita la división entera.
```
:::

:::ejercicio sql dificultad=Experto titulo="¿Cambió la mezcla de canales?"
Compara el porcentaje de pedidos de cada canal en **todo 2023** (base) con **diciembre de 2024** (actual), sobre todos los estados. Devuelve los dos porcentajes con 1 decimal y la diferencia en puntos porcentuales (actual menos base, 1 decimal, calculada sin redondear antes). Columnas: `canal`, `pct_base`, `pct_actual`, `diferencia_pts`.
```sql solucion
WITH base AS (
  SELECT canal, 100.0 * COUNT(*) / SUM(COUNT(*)) OVER () AS pct
  FROM pedidos WHERE fecha_pedido >= '2023-01-01' AND fecha_pedido < '2024-01-01'
  GROUP BY canal
),
actual AS (
  SELECT canal, 100.0 * COUNT(*) / SUM(COUNT(*)) OVER () AS pct
  FROM pedidos WHERE fecha_pedido >= '2024-12-01' AND fecha_pedido < '2025-01-01'
  GROUP BY canal
)
SELECT b.canal, ROUND(b.pct, 1) AS pct_base, ROUND(a.pct, 1) AS pct_actual, ROUND(a.pct - b.pct, 1) AS diferencia_pts
FROM base b JOIN actual a ON a.canal = b.canal;
```
```pista
Dos CTE con el porcentaje de cada canal en su período: `100.0 * COUNT(*) / SUM(COUNT(*)) OVER ()`.
```
```pista
Únelas por canal y resta los porcentajes sin redondear; redondea solo al mostrar.
```
:::

:::ejercicio python dificultad=Avanzado titulo="Detector de anomalías explicable"
Escribe `anomalias(serie, ventana, umbral)` que devuelva los **índices** de los valores que se alejan del promedio de los `ventana` valores **anteriores** en más de `umbral` (proporción: `0.5` = 50 %). Es decir, `abs(valor - promedio) > umbral * promedio`. Los primeros `ventana` valores no se evalúan (no tienen historia suficiente).
```python inicial
def anomalias(serie, ventana, umbral):
    pass
```
```python solucion
def anomalias(serie, ventana, umbral):
    res = []
    for i in range(ventana, len(serie)):
        prom = sum(serie[i - ventana:i]) / ventana
        if abs(serie[i] - prom) > umbral * prom:
            res.append(i)
    return res
```
```pista
Para cada índice `i` desde `ventana`, el promedio de la historia es `sum(serie[i - ventana:i]) / ventana`: el corte no incluye `serie[i]`.
```
```python test
s = [10, 12, 11, 10, 4, 11, 30, 12]
assert anomalias(s, 3, 0.5) == [4, 6], f"Obtuviste {anomalias(s, 3, 0.5)}"
assert anomalias([5, 5, 5], 3, 0.1) == []
assert anomalias([10, 10, 10, 10], 2, 0.0) == []
assert anomalias([10, 10, 16], 2, 0.5) == [2]
```
:::

:::ejercicio python dificultad=Intermedio titulo="Cumplimiento del acuerdo de frescura"
Escribe `cumplimiento(atrasos, limite)` donde `atrasos` es una lista con las horas de atraso de cada día y `limite` el máximo acordado. Devuelve el porcentaje de días que cumplieron (atraso menor o igual al límite), redondeado a 1 decimal. Con una lista vacía devuelve `100.0`.
```python inicial
def cumplimiento(atrasos, limite):
    pass
```
```python solucion
def cumplimiento(atrasos, limite):
    if not atrasos:
        return 100.0
    ok = sum(1 for a in atrasos if a <= limite)
    return round(100 * ok / len(atrasos), 1)
```
```pista
Cuenta los días que cumplen con `sum(1 for a in atrasos if a <= limite)` y divide por el total.
```
```python test
assert cumplimiento([2, 5, 30, 4], 24) == 75.0, f"Obtuviste {cumplimiento([2, 5, 30, 4], 24)}"
assert cumplimiento([], 24) == 100.0
assert cumplimiento([24, 24.5, 1], 24) == 66.7
```
:::

:::ejercicio pyspark dificultad=Experto titulo="Violaciones por regla, para el tablero de calidad"
Sobre `bronze_pedidos`, cuenta en una sola fila cuántas filas violan cada regla: `montos_nulos` (monto nulo), `moneda_invalida` (`moneda` sin espacios y en mayúsculas distinta de `USD`, o nula) y `estado_desconocido` (estado en minúsculas y sin espacios que no está en `entregado, enviado, pendiente, cancelado, devuelto, delivered, shipped, pending, canceled, returned`). Columnas: `montos_nulos`, `moneda_invalida`, `estado_desconocido`.
```python solucion
from pyspark.sql import functions as F

validos = ["entregado", "enviado", "pendiente", "cancelado", "devuelto",
           "delivered", "shipped", "pending", "canceled", "returned"]
b = spark.table("bronze_pedidos")
resultado = b.agg(
    F.sum(F.when(F.col("monto").isNull(), 1).otherwise(0)).alias("montos_nulos"),
    F.sum(F.when(F.col("moneda").isNull() | (F.upper(F.trim("moneda")) != "USD"), 1).otherwise(0)).alias("moneda_invalida"),
    F.sum(F.when(~F.lower(F.trim("estado")).isin(validos), 1).otherwise(0)).alias("estado_desconocido"),
)
```
```pista
Una sola agregación con tres sumas condicionales: `F.sum(F.when(condición, 1).otherwise(0))`.
```
```pista
Para "no está en la lista" usa `~F.lower(F.trim("estado")).isin(validos)`.
```
:::
