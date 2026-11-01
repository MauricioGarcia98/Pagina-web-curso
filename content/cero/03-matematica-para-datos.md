---
titulo: La matemática justa para datos - porcentajes, tasas, promedios y medianas
nivel: Básico
duracion: 40
resumen: No necesitas ser bueno en matemática para trabajar con datos; necesitas dominar seis cuentas y saber cuándo engañan.
objetivos: Calcular un porcentaje y una variación porcentual sin confundirte | Distinguir puntos porcentuales de porcentaje | Calcular una tasa (conversión, abandono) con el denominador correcto | Elegir entre promedio y mediana según los datos | Evitar el promedio de promedios | Redondear solo al final
prerrequisitos: cero-tu-computadora
autoevaluacion: ¿Sabes calcular cuánto creció algo en porcentaje? | ¿Sabes la diferencia entre "subió 2 puntos" y "subió 2 %"? | ¿Sabes por qué el promedio de sueldos engaña cuando hay un sueldo enorme? | ¿Sabes por qué no se promedian porcentajes de grupos de distinto tamaño? | ¿Sabes por qué conviene redondear al final y no en cada paso?
---

:::escenario "¿Crecimos o no?"
La gerente comercial abre la reunión: *"En marzo vendimos 120.000 y en abril 150.000. Marketing dice que crecimos 30 %, finanzas dice 25 %. ¿Quién tiene razón?"*

Todo el mundo mira al equipo de datos. Esta pregunta (y sus primas: tasas, promedios, medianas) aparece **todas las semanas**. La buena noticia: con seis cuentas, bien hechas, respondes casi todo.
:::

## 1. Porcentaje: una parte sobre el total

Un **porcentaje** dice cuántos de cada 100. Se calcula como **parte ÷ total × 100**.

- De 400 pedidos, 60 se pagaron con tarjeta → 60 ÷ 400 × 100 = **15 %**.
- Un producto de 2.000 con 15 % de descuento → descuento = 2.000 × 15 ÷ 100 = 300 → precio final 1.700. Atajo: 2.000 × 0,85 = 1.700.

:::analogia La pizza en 100 porciones
Un porcentaje es imaginar que el total es una pizza cortada en 100 porciones iguales: 15 % son 15 porciones, sin importar si la pizza "real" eran 400 pedidos o 4 millones.
:::

## 2. Variación porcentual: cuánto cambió

**(nuevo − anterior) ÷ anterior × 100**. Lo importante es **dividir por el valor de antes**.

- Marzo 120.000 → abril 150.000: (150.000 − 120.000) ÷ 120.000 × 100 = **25 %**. Finanzas tenía razón.
- Marketing dividió por 100.000 (otro mes) o calculó al revés. El error más común es dividir por el valor nuevo: 30.000 ÷ 150.000 = 20 %, que es otra cosa.

:::cuidado Subir y bajar no se compensan
Si algo baja 50 % y después sube 50 %, **no vuelve al inicio**: 100 → 50 → 75. Para volver de 50 a 100 hay que subir 100 %. Por eso un "bajamos 20 % y recuperamos 20 %" esconde una pérdida.
:::

## 3. Puntos porcentuales: restar porcentajes

Si la tasa de conversión pasa de **2 %** a **3 %**:

- Subió **1 punto porcentual** (3 − 2 = 1).
- Pero subió **50 %** en términos relativos ((3 − 2) ÷ 2 × 100).

Las dos frases son verdad y dicen cosas distintas. En un informe, decir "la conversión subió 1 % " es ambiguo; di **"subió 1 punto (de 2 % a 3 %)"**.

## 4. Tasas: siempre pregunta "¿de cuántos?"

Una **tasa** es un porcentaje con un denominador elegido con cuidado: tasa de conversión, de abandono (churn), de devolución, de error.

- **Tasa de conversión** = compraron ÷ visitaron. 30 compras de 1.500 visitas = 2 %.
- **Tasa de devolución** = pedidos devueltos ÷ pedidos **entregados** (no ÷ todos los pedidos: los cancelados nunca pudieron devolverse).

La pregunta mágica ante cualquier tasa: **"¿sobre cuántos?"**. La mitad de los errores de los informes están en el denominador.

## 5. Promedio y mediana: el centro de los datos

- **Promedio** (o media): sumas todo y divides por la cantidad. Sueldos 800, 900, 1.000, 1.100 → 3.800 ÷ 4 = 950.
- **Mediana**: ordenas y tomas el del medio (si son pares, el promedio de los dos del medio). En el ejemplo: (900 + 1.000) ÷ 2 = 950.

Hasta acá dan igual. Ahora entra el gerente general, que gana 20.000:

| | 800, 900, 1.000, 1.100 | 800, 900, 1.000, 1.100, 20.000 |
|---|---|---|
| Promedio | 950 | **4.760** |
| Mediana | 950 | **1.000** |

El promedio dice que "el empleado típico gana 4.760", y nadie gana eso. La mediana (1.000) describe mucho mejor al empleado típico. **Cuando hay valores extremos (sueldos, precios de casas, tiempos de espera, montos de compra), usa la mediana**, o muestra las dos.

## 6. El promedio de promedios engaña

Dos tiendas:

| Tienda | Pedidos | Devueltos | Tasa |
|---|---|---|---|
| Centro | 1.000 | 100 | 10 % |
| Norte | 10 | 5 | 50 % |

¿La tasa de devolución de la empresa es (10 % + 50 %) ÷ 2 = 30 %? **No**. La empresa tuvo 105 devoluciones de 1.010 pedidos = **10,4 %**. Promediar porcentajes trata igual a una tienda de 10 pedidos que a una de 1.000. Regla: **suma las partes y suma los totales, y recién ahí divide**.

## 7. Redondear al final

Si redondeas en cada paso, los errores se acumulan. Calcula con todos los decimales y redondea **solo lo que muestras**. En dinero, además, ten presente que las computadoras guardan algunos decimales de forma aproximada (`0.1 + 0.2` da `0.30000000000000004` en Python): por eso las bases de datos usan tipos como `DECIMAL` para montos.

:::trabajo
En el trabajo vas a ver cada uno de estos errores en informes reales, a veces hechos por personas con mucha experiencia. Detectarlos (y explicarlos sin hacer sentir mal a nadie) es una de las cosas que más valora un equipo de datos.
:::

## Practica

Estos ejercicios usan Python como calculadora. No hace falta saber Python todavía: en cada uno tienes las variables listas y solo escribes la cuenta. `/` divide, `*` multiplica, `round(x, 1)` redondea a un decimal.

:::errores
- Dividir la variación por el valor **nuevo** en vez del anterior.
- Decir "subió 1 %" cuando subió 1 punto porcentual.
- Promediar porcentajes de grupos de distinto tamaño.
- Usar el promedio con valores extremos.
:::

:::ejercicio python titulo="Porcentaje del total"
De `pedidos = 400` pedidos, `con_tarjeta = 60` se pagaron con tarjeta. Guarda en `porcentaje` qué porcentaje del total es (debería dar 15).
```python inicial
pedidos = 400
con_tarjeta = 60
porcentaje = 0  # reemplaza el 0 por la cuenta
```
```python solucion
pedidos = 400
con_tarjeta = 60
porcentaje = con_tarjeta / pedidos * 100
```
```python test
assert abs(porcentaje - 15) < 1e-9, f"porcentaje debería ser 15 y es {porcentaje}"
```
```pista
Parte ÷ total × 100.
```
:::

:::ejercicio python titulo="¿Cuánto crecimos?"
Las ventas pasaron de `marzo = 120000` a `abril = 150000`. Guarda en `variacion` la variación porcentual (debería dar 25).
```python inicial
marzo = 120000
abril = 150000
variacion = 0
```
```python solucion
marzo = 120000
abril = 150000
variacion = (abril - marzo) / marzo * 100
```
```python test
assert abs(variacion - 25) < 1e-9, f"variacion debería ser 25 y es {variacion}. ¿Dividiste por el valor anterior (marzo)?"
```
```pista
(nuevo − anterior) ÷ anterior × 100. El anterior es marzo.
```
:::

:::ejercicio python titulo="Precio con descuento"
Un producto cuesta `precio = 2000` y tiene `descuento = 15` (por ciento). Guarda en `final` el precio con el descuento aplicado.
```python inicial
precio = 2000
descuento = 15
final = 0
```
```python solucion
precio = 2000
descuento = 15
final = precio * (1 - descuento / 100)
```
```python test
assert abs(final - 1700) < 1e-9, f"final debería ser 1700 y es {final}"
```
```pista
Si descuentan 15 %, pagas el 85 %: precio × 0,85. En general, precio × (1 − descuento ÷ 100).
```
:::

:::ejercicio python titulo="Tasa de conversión"
Hubo `visitas = 1500` y `compras = 30`. Guarda en `conversion` la tasa de conversión en porcentaje.
```python inicial
visitas = 1500
compras = 30
conversion = 0
```
```python solucion
visitas = 1500
compras = 30
conversion = compras / visitas * 100
```
```python test
assert abs(conversion - 2) < 1e-9, f"conversion debería ser 2 y es {conversion}"
```
:::

:::ejercicio python titulo="Promedio y mediana"
Calcula el `promedio` y la `mediana` de los sueldos. Para la mediana puedes usar `statistics.median(sueldos)` (ya está importado). Mira qué tan distintos dan.
```python inicial
import statistics
sueldos = [800, 900, 1000, 1100, 20000]
promedio = 0
mediana = 0
print(promedio, mediana)
```
```python solucion
import statistics
sueldos = [800, 900, 1000, 1100, 20000]
promedio = sum(sueldos) / len(sueldos)
mediana = statistics.median(sueldos)
print(promedio, mediana)
```
```python test
assert abs(promedio - 4760) < 1e-9, f"promedio debería ser 4760 y es {promedio}"
assert mediana == 1000, f"mediana debería ser 1000 y es {mediana}"
```
```pista
El promedio es `sum(sueldos) / len(sueldos)`: la suma dividida por la cantidad.
```
:::

:::ejercicio python titulo="Sin promedio de promedios"
Calcula la tasa de devolución **de toda la empresa** (`tasa_total`, en porcentaje) con los datos de las dos tiendas. No promedies las tasas: suma devueltos y suma pedidos.
```python inicial
pedidos_centro, devueltos_centro = 1000, 100
pedidos_norte, devueltos_norte = 10, 5
tasa_total = 0
```
```python solucion
pedidos_centro, devueltos_centro = 1000, 100
pedidos_norte, devueltos_norte = 10, 5
tasa_total = (devueltos_centro + devueltos_norte) / (pedidos_centro + pedidos_norte) * 100
```
```python test
assert abs(tasa_total - 105 / 1010 * 100) < 1e-9, f"tasa_total debería ser ~10.4 y es {tasa_total}. ¿Promediaste 10 % y 50 %?"
```
```pista
Total de devueltos ÷ total de pedidos × 100.
```
:::

:::ejercicio quiz
La tasa de abandono del carrito pasó de 60 % a 66 %. ¿Cuál frase es correcta?
- [ ] Subió 6 %
- [x] Subió 6 puntos porcentuales (un 10 % en términos relativos)
- [ ] Subió 66 %
- [ ] Bajó 10 %
```explicacion
66 − 60 = 6 **puntos**. En términos relativos: 6 ÷ 60 = 10 %. Decir "subió 6 %" es ambiguo.
```
:::

:::ejercicio quiz
Quieres describir el monto típico de compra y hay unos pocos clientes empresa que compran 100 veces más que el resto. ¿Qué usas?
- [ ] El promedio, porque es el más usado
- [x] La mediana, porque no se deja arrastrar por los valores extremos
- [ ] El máximo
- [ ] La suma
```explicacion
Con valores extremos, el promedio sube mucho y ya no describe al cliente típico. La mediana sí.
```
:::

:::ejercicio quiz
Un producto bajó su precio 20 % en enero y lo subió 20 % en febrero. ¿Cómo quedó respecto del precio original?
- [ ] Igual
- [x] 4 % más barato
- [ ] 4 % más caro
- [ ] 20 % más caro
```explicacion
100 → 80 (−20 %) → 96 (+20 % de 80). Quedó 4 % abajo: los porcentajes se calculan sobre bases distintas.
```
:::

:::ejercicio sql titulo="El promedio con SQL"
SQL también sabe hacer estas cuentas. Muestra el **promedio** de la columna `precio` de la tabla `productos`, con el nombre `precio_promedio`.
```sql inicial
SELECT AVG(...) AS precio_promedio
FROM productos;
```
```sql solucion
SELECT AVG(precio) AS precio_promedio FROM productos;
```
```pista
`AVG` es la función de promedio (*average*). `AS` le pone nombre a la columna.
```
:::
