---
titulo: Análisis exploratorio - distribuciones, valores extremos y preguntas que llevan a hallazgos
nivel: 5 · Avanzado
duracion: 55
resumen: Cómo explorar datos con método en lugar de mirar tablas al azar. Construir la métrica de importe por pedido a partir del detalle, leer su distribución con describe e histograma, detectar valores extremos con el rango intercuartílico, comparar grupos con medianas, cruzar dos variables y convertir cada observación en un hallazgo con número.
objetivos: Construir una métrica de negocio desde una tabla de detalle | Leer una distribución asimétrica con describe, mediana e histograma | Detectar valores extremos con el criterio del rango intercuartílico | Comparar grupos con mediana y percentiles | Formular hallazgos verificables
prerrequisitos: jupyterlab-proyecto-lista-campana
autoevaluacion: ¿Sabes calcular el importe de cada pedido desde el detalle? | ¿Sabes por qué el promedio es mayor que la mediana? | ¿Sabes qué es un valor extremo según el IQR? | ¿Sabes escribir un hallazgo con número?
---

:::analogia En palabras simples
Explorar datos es como hacer un chequeo médico antes de diagnosticar: tomas medidas (describe), miras la forma (histograma), buscas lo anormal (extremos) y comparas contra lo esperado (grupos). Recién después opinas.
:::

## Paso 1 — Construye la métrica: importe por pedido

La tabla `detalle_pedidos` tiene una fila por **producto dentro de un pedido**. El importe de cada línea es cantidad × precio × (1 − descuento):

```python norun
detalle = pd.read_csv("datos/detalle_pedidos.csv")
detalle["importe"] = detalle["cantidad"] * detalle["precio_unitario"] * (1 - detalle["descuento"])
ticket = detalle.groupby("pedido_id")["importe"].sum()
ticket.describe()
```

```captura
archivo: jupyter/e17-describe.webp
texto: El importe por pedido: promedio 1.202,97, mediana 710,96 y un máximo de 16.258,85
```

:::tip El grano de una tabla
Antes de sumar, pregúntate "¿qué es una fila?". En `detalle_pedidos` una fila es una línea de producto; en `pedidos`, un pedido. Para el importe **por pedido** hay que sumar las líneas de cada pedido (`groupby("pedido_id")`). Confundir el grano es la fuente número uno de totales inflados.
:::

## Paso 2 — Lee la distribución

| Medida | Valor | Qué dice |
|---|---|---|
| mean (promedio) | 1,202.97 | Lo "arrastran" los pedidos grandes |
| 50% (mediana) | 710.96 | La mitad de los pedidos está por debajo |
| 75% | 1,648.66 | Tres de cada cuatro están por debajo |
| max | 16,258.85 | Hay pedidos muy grandes |

El promedio es mucho mayor que la mediana: la distribución es **asimétrica** (muchos pedidos chicos y pocos muy grandes). Míralo:

```python norun
ticket.plot(kind="hist", bins=40, title="Importe por pedido", figsize=(7, 3))
```

```captura
archivo: jupyter/e17-hist.webp
texto: El histograma muestra la cola larga: la mayoría de los pedidos son chicos
```

:::cuidado Qué número informar
Con distribuciones así, "el pedido promedio es de 1.203" da una idea equivocada del pedido típico. Informa la **mediana** (711) y, si hace falta, el promedio aclarando por qué difieren.
:::

## Paso 3 — Valores extremos con el rango intercuartílico

```python norun
q1, q3 = ticket.quantile([0.25, 0.75])
iqr = q3 - q1
limite = q3 + 1.5 * iqr
extremos = ticket[ticket > limite]
round(limite, 2), len(extremos)
```

Da un límite de **3,804.42** y **716** pedidos por encima. El criterio Q3 + 1,5 × IQR es una convención: no dice que esos pedidos estén mal, dice que son **inusuales** y merecen una mirada.

| Antes de "sacar" un extremo, pregúntate | |
|---|---|
| ¿Es un error? (cantidad 1000 en lugar de 10) | Corrígelo o descártalo, documentándolo |
| ¿Es real? (una empresa que compra 20 notebooks) | Déjalo: es parte del negocio |
| ¿Distorsiona la métrica que informas? | Usa mediana o informa con y sin extremos |

## Paso 4 — Compara grupos

```python norun
pedidos = pd.read_csv("datos/pedidos.csv")
t = pedidos.merge(ticket.rename("importe").reset_index(), on="pedido_id")
t.groupby("canal")["importe"].agg(["count", "median", "mean"]).round(0)
```

Compara **medianas** entre canales: es más robusto que comparar promedios cuando hay pedidos muy grandes.

## Paso 5 — Cruza dos variables

```python norun
t["fecha_pedido"] = pd.to_datetime(t["fecha_pedido"])
t["mes"] = t["fecha_pedido"].dt.month
t.groupby("mes")["importe"].median().plot(kind="bar", title="Mediana del importe por mes", figsize=(8, 3))
```

¿Los pedidos de fin de año son más **grandes** o solo hay **más** pedidos? Separar "cantidad" de "tamaño" es una de las preguntas más útiles de un análisis.

## Paso 6 — De observación a hallazgo

| Observación (débil) | Hallazgo (útil) |
|---|---|
| "Hay pedidos grandes" | "716 pedidos (6 %) superan los 3.800; conviene revisarlos como segmento aparte" |
| "La distribución es asimétrica" | "El pedido típico es de 711 (mediana); el promedio de 1.203 está inflado por pedidos grandes" |
| "Diciembre es alto" | "Diciembre tiene más pedidos, pero de tamaño similar: el pico es de volumen, no de ticket" |

Un hallazgo tiene **un número, una comparación y una consecuencia**. Verifica cada uno antes de escribirlo (el último ejemplo es una hipótesis: compruébala con el gráfico del paso 5).

## ✅ Lo que lograste

- Construiste una métrica respetando el grano de la tabla.
- Leíste una distribución asimétrica y detectaste extremos.
- Comparaste grupos y escribiste hallazgos verificables.

:::ejercicio quiz
El promedio del importe es 1.203 y la mediana 711. ¿Qué indica?
- [ ] Que hay un error en los datos
- [x] Que la distribución es asimétrica: pocos pedidos muy grandes suben el promedio
- [ ] Que la mayoría de los pedidos supera 1.203
- [ ] Que hay que borrar los pedidos grandes
:::

:::ejercicio quiz
En `detalle_pedidos` cada fila es una línea de producto. ¿Qué haces para obtener el importe de cada pedido?
- [ ] Usar la columna precio_unitario tal cual
- [x] Calcular el importe de cada línea y sumarlo agrupando por pedido_id
- [ ] Contar las filas de cada pedido
- [ ] Promediar los importes de todo el detalle
:::

:::ejercicio quiz
Con Q1 = 200, Q3 = 1600, ¿cuál es el límite superior por el criterio del IQR?
- [ ] 1600
- [ ] 2300
- [x] 3700
- [ ] 1400
:::
