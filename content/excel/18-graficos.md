---
titulo: Gráficos que se entienden - elegir el tipo, preparar los datos y no engañar
nivel: 5 · Avanzado
duracion: 45
resumen: Un gráfico sirve si se entiende en cinco segundos. Cómo elegir entre columnas, barras, líneas y torta según la pregunta, cómo preparar una tabla para graficar (una serie mensual con COUNTIFS), cómo crear y mover gráficos y las reglas que separan un gráfico profesional de uno confuso o engañoso.
objetivos: Elegir el gráfico según la pregunta (comparar, evolución, partes de un total) | Preparar una tabla de dos columnas para graficar | Crear gráficos de columnas, barras, líneas y torta | Aplicar reglas de claridad (orden, título, eje en cero, pocas categorías) | Detectar gráficos engañosos
prerrequisitos: excel-tablas-dinamicas
autoevaluacion: ¿Sabes qué gráfico usar para una evolución mensual? | ¿Sabes cuándo no usar torta? | ¿Sabes preparar una serie por mes? | ¿Sabes por qué el eje de columnas empieza en cero?
---

:::analogia En palabras simples
Un gráfico es una respuesta dibujada. Antes de elegir el tipo, escribe la pregunta: "¿qué canal vende más?" (comparar), "¿cómo evolucionaron los pedidos?" (tiempo), "¿qué parte del total es cada medio de pago?" (partes). El tipo de gráfico sale de la pregunta.
:::

## Paso 1 — Qué gráfico para qué pregunta

| Quieres mostrar | Gráfico | Ejemplo |
|---|---|---|
| Comparar categorías | **Columnas** (pocas) o **barras** (muchas o nombres largos) | Pedidos por canal |
| Evolución en el tiempo | **Líneas** | Pedidos por mes |
| Partes de un total, con 2 a 5 categorías | **Torta** | Medios de pago |
| Ranking | **Barras** ordenadas de mayor a menor | Top 10 productos |

## Paso 2 — Columnas desde una tabla dinámica

1. En la hoja **PivotTable** de la lección anterior (canal × estado), haz clic dentro de la tabla (por ejemplo en **A4**).
2. Pestaña **Insert** → **Column**.
3. Aparece un gráfico de columnas, con una serie por estado. Arrástralo por el título para moverlo; la ✕ lo borra.

```captura
archivo: excel/05-grafico.webp
texto: El gráfico de columnas creado desde la tabla dinámica
```

## Paso 3 — Torta: partes de un total

1. Vuelve a **pedidos** y crea otra tabla dinámica: Rows = `metodo_pago`, Values = `pedido_id`, Count.
2. Haz clic dentro del resultado y elige **Insert → Pie**.

```captura
archivo: excel/05-torta.webp
texto: La proporción de pedidos por método de pago
```

:::cuidado Cuándo NO usar torta
Con más de cinco o seis porciones, o con porciones parecidas, el ojo no puede comparar ángulos: usa barras. Y nunca uses torta para cosas que no suman un total (por ejemplo, el ticket promedio de cada canal).
:::

## Paso 4 — Líneas: prepara una serie mensual

Un gráfico de líneas necesita una tabla con el tiempo en la primera columna y el valor en la segunda. La armas con COUNTIFS:

1. Crea una hoja `Mensual`.
2. **A1** `mes`, **B1** `pedidos 2024`.
3. En **A2:A13** escribe los números del 1 al 12. (Truco: escribe `1` y `2`, selecciona las dos celdas y arrastra el controlador de relleno: Excel continúa la serie.)
4. En **B2**:

```text
=COUNTIFS(pedidos!D:D,">="&DATE(2024,A2,1),pedidos!D:D,"<"&DATE(2024,A2+1,1))
```

5. Copia B2 hasta **B13**. Control: la suma de B2:B13 debe dar **4,633**.
6. Selecciona **A1:B13** → **Insert → Line**.

```captura
archivo: excel/e18-linea.webp
texto: La serie mensual armada con COUNTIFS (1) y su gráfico de líneas (2)
```

La línea muestra lo que ninguna tabla deja ver tan rápido: los pedidos se mantienen entre 300 y 450 por mes y se disparan en **noviembre y diciembre**.

## Paso 5 — Reglas de un gráfico profesional

| Regla | Por qué |
|---|---|
| Un título que diga la conclusión ("Los pedidos se duplican en diciembre") | Quien lo mira entiende sin leer los ejes |
| Ordena las barras de mayor a menor (salvo que sea tiempo) | El ranking se lee solo |
| El eje de columnas y barras empieza en **cero** | Si empieza en 300, una diferencia de 10 % parece del 300 % |
| Una sola idea por gráfico | Dos gráficos claros valen más que uno recargado |
| Sin 3D, sombras ni efectos | Distorsionan las proporciones |
| Pocos colores, con intención | Resalta en color solo lo que quieres que miren |

:::cuidado El gráfico engañoso más común
Un gráfico de columnas con el eje que empieza en un valor alto exagera las diferencias. Si ves un "salto enorme" en un gráfico, mira primero dónde empieza el eje. En líneas, en cambio, no siempre hace falta empezar en cero: importa la forma de la evolución.
:::

## Paso 6 — Del gráfico al mensaje

Un gráfico va acompañado de una frase. Para la serie mensual, por ejemplo: *"Noviembre y diciembre concentran el 24 % de los pedidos del año: hay que reforzar stock y logística desde octubre."* La frase dice qué pasó, cuánto y qué hacer.

## ✅ Lo que lograste

- Elegiste el gráfico según la pregunta.
- Preparaste una serie mensual con COUNTIFS y la graficaste.
- Conoces las reglas que hacen un gráfico claro y honesto.

:::ejercicio quiz
¿Qué gráfico conviene para mostrar cómo evolucionaron las ventas mes a mes?
- [ ] Torta
- [x] Líneas
- [ ] Barras sin orden
- [ ] Ninguno: se muestra en una tabla
:::

:::ejercicio quiz
Tienes 12 categorías de productos con participaciones parecidas. ¿Qué gráfico usas?
- [ ] Torta
- [x] Barras ordenadas de mayor a menor
- [ ] Líneas
- [ ] Torta 3D
:::

:::ejercicio quiz
Un gráfico de columnas muestra 480 contra 520 y la segunda parece el triple de alta. ¿Qué pasa?
- [ ] Los datos están mal
- [x] El eje vertical no empieza en cero y exagera la diferencia
- [ ] Es un gráfico de torta
- [ ] Falta el título
:::
