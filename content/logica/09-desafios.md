---
titulo: Desafíos - el método completo, de punta a punta
nivel: Avanzado
duracion: 60
resumen: Problemas tipo entrevista para practicar todo junto - entender, aclarar, descomponer, elegir el patrón, probar casos borde y traducir a Python, SQL o PySpark. Cada desafío dice qué patrón esconde recién en la pista, para que lo reconozcas tú primero.
objetivos: Resolver un problema nuevo siguiendo el método sin saltear pasos | Reconocer qué patrón esconde un enunciado sin que te lo digan | Resolver el mismo problema en Python y en SQL | Explicar en voz alta tu solución y sus supuestos
prerrequisitos: logica-pedidos-ambiguos | logica-depurar | logica-spark-con-metodo
autoevaluacion: ¿Puedes resolver un problema nuevo en menos de 20 minutos con el método? | ¿Reconoces el patrón antes de leer la pista? | ¿Pruebas casos borde antes de decir "listo"? | ¿Puedes contar tu solución en tres frases?
---

:::analogia En palabras simples
Hasta acá practicaste cada técnica por separado, como un músico que practica escalas. Ahora tocas canciones enteras: cada desafío mezcla varias técnicas y nadie te dice cuáles.
:::

## Cómo encarar cada desafío

| Paso | Qué haces | Tiempo aproximado |
|---|---|---|
| 1. Entender | Reescribe el enunciado con tus palabras y un ejemplo chico | 2 min |
| 2. Aclarar | Anota los supuestos (empates, vacíos, nulos) | 1 min |
| 3. Planificar | Pasos en castellano: filtrar, agrupar, ordenar… | 3 min |
| 4. Escribir | Una función o CTE por paso | 8 min |
| 5. Probar | Ejemplo del enunciado + casos borde | 3 min |
| 6. Contar | Tres frases: qué hace, qué supuestos, qué mejorarías | 1 min |

:::tip Si te trabas
Vuelve al paso 1 y resuelve el problema **a mano** con 4 datos inventados. Lo que hiciste con la cabeza es el algoritmo; solo falta escribirlo.
:::

:::ejercicio python dificultad=Intermedio titulo="Agrupar en sesiones"
Recibes una lista **ordenada** de minutos en que un usuario hizo clic, por ejemplo `[0, 5, 50, 52, 120]`. Una sesión nueva empieza cuando pasan **más de 30 minutos** desde el clic anterior. Escribe `contar_sesiones(minutos)` que devuelva cuántas sesiones hubo. Lista vacía → `0`.
```python inicial
def contar_sesiones(minutos):
    pass
```
```python solucion
def contar_sesiones(minutos):
    if not minutos:
        return 0
    sesiones = 1
    for i in range(1, len(minutos)):
        if minutos[i] - minutos[i - 1] > 30:
            sesiones += 1
    return sesiones
```
```pista
Patrón: comparar con el anterior. El primer clic siempre abre una sesión; cada vez que la distancia con el anterior supera 30, se abre otra.
```
```python test
assert contar_sesiones([0, 5, 50, 52, 120]) == 3, f"Obtuviste {contar_sesiones([0, 5, 50, 52, 120])}"
assert contar_sesiones([]) == 0
assert contar_sesiones([10]) == 1
assert contar_sesiones([0, 30, 60]) == 1, "Exactamente 30 no corta la sesión"
```
:::

:::ejercicio python dificultad=Intermedio titulo="El segundo mayor"
Escribe `segundo_mayor(numeros)` que devuelva el **segundo valor distinto** más grande de la lista. Si no existe (lista vacía o todos iguales), devuelve `None`.
```python inicial
def segundo_mayor(numeros):
    return sorted(numeros)[-2]
```
```python solucion
def segundo_mayor(numeros):
    distintos = sorted(set(numeros), reverse=True)
    if len(distintos) < 2:
        return None
    return distintos[1]
```
```pista
Casos borde: duplicados (`[5, 5, 3]` → 3, no 5) y listas sin segundo. Quita duplicados con `set`, ordena de mayor a menor y mira si hay al menos dos.
```
```python test
assert segundo_mayor([5, 5, 3]) == 3, f"Obtuviste {segundo_mayor([5, 5, 3])}"
assert segundo_mayor([1, 9, 4]) == 4
assert segundo_mayor([7, 7]) is None
assert segundo_mayor([]) is None
assert segundo_mayor([-1, -5]) == -5
```
:::

:::ejercicio python dificultad=Avanzado titulo="Unir intervalos"
Recibes turnos como pares `(inicio, fin)` en cualquier orden. Escribe `unir_intervalos(turnos)` que junte los que se **superponen o se tocan** y devuelva la lista resultante ordenada por inicio. Ejemplo: `[(1, 3), (2, 5), (8, 9)]` → `[(1, 5), (8, 9)]`.
```python inicial
def unir_intervalos(turnos):
    pass
```
```python solucion
def unir_intervalos(turnos):
    salida = []
    for inicio, fin in sorted(turnos):
        if salida and inicio <= salida[-1][1]:
            salida[-1] = (salida[-1][0], max(salida[-1][1], fin))
        else:
            salida.append((inicio, fin))
    return salida
```
```pista
Ordena por inicio. Después recorre comparando con el último intervalo que guardaste: si el nuevo empieza antes de que el último termine (o justo cuando termina), extiende el último; si no, agrega uno nuevo. Cuidado con un intervalo que queda totalmente adentro de otro: usa `max` para el fin.
```
```python test
assert unir_intervalos([(1, 3), (2, 5), (8, 9)]) == [(1, 5), (8, 9)], f"Obtuviste {unir_intervalos([(1, 3), (2, 5), (8, 9)])}"
assert unir_intervalos([(8, 9), (1, 3)]) == [(1, 3), (8, 9)], "Llegan desordenados"
assert unir_intervalos([(1, 10), (2, 3)]) == [(1, 10)], "Uno adentro de otro"
assert unir_intervalos([(1, 2), (2, 4)]) == [(1, 4)], "Se tocan: se unen"
assert unir_intervalos([]) == []
```
:::

:::ejercicio python dificultad=Avanzado titulo="Clientes que volvieron"
Recibes pedidos como diccionarios con `"cliente"` y `"mes"` (entero de 1 a 12). Escribe `volvieron(pedidos)` que devuelva la lista **ordenada** de clientes que compraron en **dos meses seguidos** al menos una vez.
```python inicial
def volvieron(pedidos):
    pass
```
```python solucion
def volvieron(pedidos):
    meses = {}
    for p in pedidos:
        meses.setdefault(p["cliente"], set()).add(p["mes"])
    salida = []
    for cliente, ms in meses.items():
        if any(m + 1 in ms for m in ms):
            salida.append(cliente)
    return sorted(salida)
```
```pista
Descompón: (1) arma un diccionario cliente → conjunto de meses (contador/índice); (2) para cada cliente, busca si algún mes `m` tiene también `m + 1` (bandera). Usar un conjunto evita problemas con pedidos repetidos en el mismo mes.
```
```python test
ps = [{"cliente": "Ana", "mes": 1}, {"cliente": "Ana", "mes": 2}, {"cliente": "Luis", "mes": 1}, {"cliente": "Luis", "mes": 3}, {"cliente": "Eva", "mes": 5}, {"cliente": "Eva", "mes": 5}, {"cliente": "Eva", "mes": 6}]
assert volvieron(ps) == ["Ana", "Eva"], f"Obtuviste {volvieron(ps)}"
assert volvieron([]) == []
```
:::

:::ejercicio sql dificultad=Avanzado titulo="El segundo mayor, en SQL"
El mismo desafío en SQL: muestra el **segundo salario distinto más alto** de la tabla `empleados`. Una fila con la columna `segundo_salario`.
```sql solucion
SELECT MAX(salario) AS segundo_salario
FROM empleados
WHERE salario < (SELECT MAX(salario) FROM empleados);
```
```pista
El segundo mayor es "el máximo de los que son menores que el máximo". También se puede con `DENSE_RANK()`.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="Mejor mes de cada año"
Para cada año, muestra el **mes con más pedidos entregados**. Columnas: `anio`, `mes`, `pedidos`. Si dos meses empatan, muestra ambos.
```sql solucion
WITH por_mes AS (
  SELECT CAST(strftime('%Y', fecha_pedido) AS INTEGER) AS anio,
         CAST(strftime('%m', fecha_pedido) AS INTEGER) AS mes,
         COUNT(*) AS pedidos
  FROM pedidos
  WHERE estado = 'entregado'
  GROUP BY anio, mes
),
r AS (
  SELECT *, RANK() OVER (PARTITION BY anio ORDER BY pedidos DESC) AS puesto
  FROM por_mes
)
SELECT anio, mes, pedidos FROM r WHERE puesto = 1;
```
```pista
Por capas: (1) una fila por año y mes con el conteo; (2) un puesto dentro de cada año con `RANK()` (que respeta empates); (3) quedarse con el puesto 1.
```
:::

:::ejercicio sql dificultad=Experto titulo="Clientes con compras en meses seguidos"
¿Cuántos clientes hicieron pedidos en **dos meses calendario consecutivos** al menos una vez (por ejemplo, enero y febrero de 2023, o diciembre de 2023 y enero de 2024)? Una fila con la columna `clientes`.
```sql solucion
WITH meses AS (
  SELECT DISTINCT cliente_id,
         CAST(strftime('%Y', fecha_pedido) AS INTEGER) * 12 + CAST(strftime('%m', fecha_pedido) AS INTEGER) AS n_mes
  FROM pedidos
)
SELECT COUNT(DISTINCT a.cliente_id) AS clientes
FROM meses a
JOIN meses b ON b.cliente_id = a.cliente_id AND b.n_mes = a.n_mes + 1;
```
```pista
Es el mismo desafío de Python "Clientes que volvieron". Convierte cada fecha en un número de mes continuo (`año * 12 + mes`) para que diciembre y enero sean consecutivos. Después busca, para cada cliente, si existe el mes `n + 1` (un self-join).
```
:::

:::ejercicio pyspark dificultad=Avanzado titulo="Mejor mes de cada año, en PySpark"
El desafío anterior en PySpark: para cada año, el mes (o los meses empatados) con más pedidos **entregados**. Columnas: `anio`, `mes`, `pedidos`.
```python solucion
from pyspark.sql import functions as F
from pyspark.sql.window import Window

por_mes = (spark.table("pedidos")
    .filter(F.col("estado") == "entregado")
    .groupBy(F.year("fecha_pedido").alias("anio"), F.month("fecha_pedido").alias("mes"))
    .agg(F.count("*").alias("pedidos")))
w = Window.partitionBy("anio").orderBy(F.desc("pedidos"))
resultado = (por_mes
    .withColumn("puesto", F.rank().over(w))
    .filter(F.col("puesto") == 1)
    .select("anio", "mes", "pedidos"))
```
```pista
Mismo plan que en SQL: agrupar por año y mes, numerar con `F.rank()` en una ventana por año ordenada por pedidos descendente, y quedarse con el puesto 1.
```
:::
