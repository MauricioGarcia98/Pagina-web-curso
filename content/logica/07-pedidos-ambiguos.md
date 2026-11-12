---
titulo: Pedidos ambiguos - qué preguntar y qué suponer
nivel: Intermedio
duracion: 45
resumen: En el trabajo real (y en las entrevistas) casi ningún pedido viene completo. Aprende a detectar las palabras ambiguas, la lista de preguntas que aclaran casi todo, a escribir supuestos explícitos cuando no puedes preguntar, a entregar dos versiones cuando conviene y a resolver estimaciones del tipo "cuántos hay" sin datos.
objetivos: Detectar las palabras de un pedido que admiten más de una interpretación | Hacer las preguntas de aclaración que cambian el resultado | Escribir supuestos explícitos y dejarlos en la entrega | Estimar un número sin datos partiendo el problema en factores
prerrequisitos: logica-sql-con-metodo
autoevaluacion: ¿Qué preguntarías ante "cuántos clientes activos tenemos"? | ¿Sabes escribir un supuesto de forma que alguien pueda corregirlo? | ¿Cuándo conviene entregar dos versiones? | ¿Sabes estimar un número sin datos en voz alta?
---

:::analogia En palabras simples
Si un amigo te pide "traeme algo para tomar", puedes traer agua, gaseosa o vino. Si le preguntas "¿frío o caliente, con o sin alcohol?" aciertas seguro. Un pedido de datos es igual: la mitad del trabajo es entender qué te están pidiendo de verdad.
:::

## Las palabras que esconden decisiones

| Palabra del pedido | Lo que no dice | Preguntas para aclarar |
|---|---|---|
| "clientes **activos**" | ¿Activo según qué? | ¿Compró en los últimos 30, 90 o 365 días? ¿Inició sesión? ¿Tiene suscripción vigente? |
| "**ventas**" | ¿Qué cuenta como venta? | ¿Pedidos creados o entregados? ¿Con o sin cancelados y devueltos? ¿Con impuestos? ¿En qué moneda? |
| "**este mes**" | ¿Qué período exacto? | ¿Mes calendario o últimos 30 días? ¿Mes en curso incompleto o el último cerrado? ¿En qué zona horaria? |
| "**por región**" | ¿Qué región? | ¿La del cliente, la de la tienda o la del envío? |
| "**crecimiento**" | ¿Contra qué? | ¿Contra el mes anterior o el mismo mes del año pasado? ¿En porcentaje o en unidades? |
| "**los mejores** clientes" | ¿Mejores en qué? | ¿Más gasto, más pedidos, más margen? ¿Cuántos: top 10 o el 20%? |
| "**promedio**" | ¿De qué unidad? | ¿Por pedido, por cliente o por día? ¿Media o mediana? |

:::tip El truco
Cada vez que leas un adjetivo (activo, mejor, nuevo, grande) o un período (este mes, recientemente), hay una decisión escondida. Subráyalos.
:::

## Las 6 preguntas que aclaran casi todo

1. **¿Para qué lo vas a usar?** La decisión que se va a tomar dice qué definición conviene.
2. **¿Una fila por qué?** (la granularidad del resultado).
3. **¿Qué período?** Fechas exactas, zona horaria, incluir o no el mes en curso.
4. **¿Qué se incluye y qué se excluye?** Cancelados, pruebas internas, devoluciones.
5. **¿Qué hago con lo raro?** Nulos, duplicados, empates.
6. **¿Hay una definición oficial?** Muchas empresas ya definieron "cliente activo": usa la misma para que los números coincidan.

## Si no puedes preguntar: supuestos explícitos

A veces no hay a quién preguntar (o estás en una entrevista y te dicen "decide tú"). Entonces **decides, lo escribes y sigues**. Un supuesto bien escrito se puede corregir en un minuto; uno escondido genera números que nadie entiende.

```sql
-- Supuestos:
-- 1. "Ventas" = pedidos con estado 'entregado' (excluye cancelados y devueltos).
-- 2. Importe = cantidad * precio_unitario, sin descuentos ni impuestos.
-- 3. "Este año" = año calendario 2024 completo.
SELECT ROUND(SUM(d.cantidad * d.precio_unitario), 2) AS ventas_2024
FROM pedidos p
JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
WHERE p.estado = 'entregado'
  AND p.fecha_pedido >= '2024-01-01' AND p.fecha_pedido < '2025-01-01';
```

En Python, los supuestos van en la documentación de la función o en constantes con nombre:

```python
DIAS_ACTIVO = 90   # supuesto: activo = compró en los últimos 90 días

def es_activo(dias_desde_ultima_compra):
    return dias_desde_ultima_compra <= DIAS_ACTIVO
```

Si mañana te dicen "no, activo es 30 días", cambias una línea.

## Entregar dos versiones

Cuando dos interpretaciones son razonables y el costo de calcular ambas es bajo, **entrega las dos lado a lado** y explica la diferencia en una frase. Es mucho mejor que adivinar.

| Mes | Pedidos creados | Pedidos entregados |
|---|---|---|
| Enero | 410 | 372 |

"La diferencia son los cancelados y los que todavía están en camino."

## Estimar sin datos

Algunas preguntas de entrevista no tienen datos a propósito: "¿cuántos litros de café se toman por día en tu ciudad?". No buscan el número exacto; buscan ver **cómo descompones**. Es el mismo método: partir en factores que puedas estimar.

1. Habitantes de la ciudad: digamos 3 millones.
2. Adultos que toman café: quizás la mitad → 1,5 millones.
3. Tazas por persona por día: 2.
4. Litros por taza: 0,2.
5. Resultado: 1,5 millones × 2 × 0,2 = **600.000 litros por día**.

Dilo en voz alta, anota cada supuesto y termina con un chequeo de sentido común ("¿600.000 litros es razonable? Son unas 30 cisternas de camión: plausible").

:::ejercicio quiz
Te piden "la cantidad de clientes activos". ¿Cuál es la mejor primera respuesta?
- [ ] Contar todas las filas de la tabla clientes
- [ ] Contar los clientes con al menos un pedido en toda la historia
- [x] Preguntar qué significa activo (por ejemplo, compra en los últimos 90 días) y para qué se usará el número
- [ ] Responder que el pedido está mal hecho
:::

:::ejercicio quiz
"¿Cuánto crecieron las ventas en marzo?" ¿Qué ambigüedad cambia más el resultado?
- [ ] El color del gráfico
- [x] Si se compara contra febrero o contra marzo del año anterior
- [ ] Si la consulta usa mayúsculas
- [ ] El nombre de la columna
:::

:::ejercicio quiz
No puedes contactar a quien hizo el pedido y hay dos definiciones razonables. ¿Qué haces?
- [ ] Eliges una en secreto y entregas solo ese número
- [ ] No entregas nada hasta que respondan
- [x] Eliges una, escribes el supuesto en la entrega y, si es barato, muestras también la otra versión
- [ ] Promedias las dos versiones
:::

:::ejercicio quiz
"El ticket promedio." ¿Cuál es la pregunta de granularidad correcta?
- [ ] ¿En qué base de datos está?
- [x] ¿Promedio por pedido, por cliente o por día?
- [ ] ¿Cuántas columnas tiene la tabla?
- [ ] ¿Se usa ROUND o CAST?
:::

:::ejercicio quiz
En una estimación sin datos ("¿cuántas pizzerías hay en tu ciudad?"), ¿qué evalúa el entrevistador?
- [ ] Que sepas el número exacto de memoria
- [x] Cómo partes el problema en factores, qué supuestos haces y si chequeas que el resultado tenga sentido
- [ ] Que uses una calculadora científica
- [ ] Que te niegues a responder sin datos
:::

:::ejercicio sql dificultad=Intermedio
Pedido ambiguo: "¿cuántos clientes **activos** tenemos?". Supuesto (escríbelo como comentario): activo = hizo al menos un pedido **no cancelado** en los **90 días anteriores al 2025-01-01** (desde el `2024-10-03` inclusive). Columna: `clientes_activos`.
```sql solucion
-- Supuesto: activo = al menos un pedido no cancelado entre 2024-10-03 y 2024-12-31
SELECT COUNT(DISTINCT cliente_id) AS clientes_activos
FROM pedidos
WHERE estado <> 'cancelado'
  AND fecha_pedido >= '2024-10-03' AND fecha_pedido < '2025-01-01';
```
```pista
Una sola fila: contar clientes distintos (`COUNT(DISTINCT cliente_id)`) entre los pedidos que cumplen el supuesto. Un cliente con 3 pedidos cuenta una vez.
```
:::

:::ejercicio sql dificultad=Intermedio
Dos versiones lado a lado. Para cada año (`anio`), muestra `pedidos_creados` (todos) y `pedidos_entregados` (solo estado `entregado`), en una sola consulta. Así quien lo pidió elige la definición.
```sql solucion
SELECT CAST(strftime('%Y', fecha_pedido) AS INTEGER) AS anio,
       COUNT(*) AS pedidos_creados,
       SUM(CASE WHEN estado = 'entregado' THEN 1 ELSE 0 END) AS pedidos_entregados
FROM pedidos
GROUP BY anio;
```
```pista
Una fila por año. La segunda versión es un conteo condicional: `SUM(CASE WHEN estado = 'entregado' THEN 1 ELSE 0 END)`.
```
:::

:::ejercicio python
Escribe `estimar(factores)` que reciba una lista de pares `(descripcion, valor)` y devuelva el **producto** de todos los valores redondeado a entero. Es la cuenta de una estimación sin datos; las descripciones son los supuestos que dirías en voz alta. Lista vacía → `0`.
```python inicial
def estimar(factores):
    pass
```
```python solucion
def estimar(factores):
    if not factores:
        return 0
    resultado = 1
    for descripcion, valor in factores:
        resultado *= valor
    return round(resultado)
```
```pista
Patrón acumulador, pero multiplicando: empieza en 1 (no en 0) y multiplica cada valor. Ojo con la lista vacía.
```
```python test
cafe = [("habitantes", 3_000_000), ("toman café", 0.5), ("tazas por día", 2), ("litros por taza", 0.2)]
assert estimar(cafe) == 600000, f"Obtuviste {estimar(cafe)}"
assert estimar([]) == 0
assert estimar([("uno", 7)]) == 7
```
:::
