---
titulo: Visuales avanzados y de IA - matriz, mapa, preguntas y respuestas, árbol de descomposición
nivel: 4 · Intermedio-avanzado
duracion: 45
resumen: Más allá de barras y líneas - la matriz con subtotales y formato condicional, el mapa con la categoría de datos correcta, y los visuales de IA de Power BI - Preguntas y respuestas (escribes la pregunta), Árbol de descomposición (abre un total nivel por nivel), Influenciadores clave y Narración inteligente. Qué hace cada uno, cuándo usarlo y cuándo no.
objetivos: Construir una matriz con filas, columnas y subtotales | Configurar un mapa con la categoría geográfica correcta | Usar Preguntas y respuestas y convertir el resultado en un visual | Explorar un total con el árbol de descomposición | Saber los límites de los visuales de IA
prerrequisitos: powerbi-paso-a-paso-filtros-detalles-marcadores-y-botones
autoevaluacion: ¿Sabes en qué se diferencia una matriz de una tabla? | ¿Sabes por qué un mapa ubica mal un país? | ¿Sabes qué hace el árbol de descomposición? | ¿Sabes cuándo no confiar en un visual de IA?
---

:::analogia En palabras simples
Si las barras son las palabras básicas de un informe, estos visuales son las frases largas: la matriz es una tabla dinámica de Excel, el mapa pone los números donde ocurren, y los visuales de IA son un asistente que te ayuda a buscar la explicación.
:::

## Paso 1 — La matriz

Visual **Matriz** → `categorias[nombre]` en **Filas**, `pedidos[canal]` en **Columnas**, **Ventas** en **Valores**:

```captura
archivo: powerbi/b15-matriz.webp
texto: La matriz (1) con sus pozos Filas, Columnas y Valores (2) - subtotales por categoría y total general
```

| Tabla | Matriz |
|---|---|
| Una fila por combinación, columnas planas | Filas y columnas cruzadas, como una tabla dinámica |
| Sin subtotales jerárquicos | Subtotales por nivel y botones **+** para expandir |
| Para listar detalle | Para comparar dos dimensiones a la vez |

**Formato → Elementos de celda → Escalas de color o barras de datos** convierte la matriz en un mapa de calor: el valor más alto salta a la vista.

## Paso 2 — El mapa

Visual **Mapa** → `clientes[pais]` en **Ubicación**, **Ventas** en **Tamaño de burbuja**:

```captura
archivo: powerbi/b15-mapa.webp
texto: Ventas por país como burbujas sobre el mapa
```

:::cuidado La categoría de datos
"Córdoba" es una ciudad de Argentina y de España. Para que el mapa ubique bien, en la vista Modelo marca la columna con su **Categoría de datos** (País o región, Ciudad, Estado o provincia) y, si hace falta, combina ciudad y país en una columna ("Córdoba, Argentina"). En la práctica el mapa es simplificado; en Power BI real usa Bing o Azure Maps.
:::

## Paso 3 — Preguntas y respuestas

**Insertar → Preguntas y respuestas** y escribe *ventas por categoría*:

```captura
archivo: powerbi/b15-qa.webp
texto: El visual interpreta la pregunta y muestra el resultado; Convertir en objeto visual estándar lo deja como un gráfico normal
```

Funciona mejor cuando las columnas y medidas tienen nombres claros y **sinónimos** (vista Modelo → Propiedades). En la práctica la interpretación es simple (sin aprendizaje automático); en Power BI real Copilot y Q&A entienden frases más libres.

## Paso 4 — Árbol de descomposición

**Insertar → Árbol de descomposición** → **Analizar**: Ventas; **Explicar por**: canal y categoría:

```captura
archivo: powerbi/b15-arbol.webp
texto: El total de ventas listo para abrirse - el + elige por qué campo descomponer el nivel siguiente
```

Cada **+** abre el nivel siguiente por el campo que elijas (o por **valor alto** / **valor bajo**, que elige el campo que más explica). Sirve para responder "¿de dónde salen estas ventas?" sin preparar un gráfico por cada combinación.

## Paso 5 — Influenciadores clave y Narración inteligente

| Visual | Qué hace | Cuidado |
|---|---|---|
| **Influenciadores clave** | Qué valores de otros campos hacen que una medida suba o baje respecto del promedio | Muestra correlaciones, no causas |
| **Narración inteligente** | Un texto que resume lo que muestran los visuales de la página y se actualiza con los filtros | Revísalo: es un resumen automático |

:::tip Cuándo usar IA y cuándo no
Los visuales de IA son buenos para **explorar** y encontrar preguntas. Para el tablero que mira dirección todos los lunes, usa visuales clásicos con medidas verificadas: son predecibles y se pueden explicar número por número.
:::

:::errores
- **Mapa sin categoría de datos.** Power BI adivina; una ciudad con el mismo nombre en otro país termina mal ubicada.
- **Leer correlación como causa.** Influenciadores clave muestra asociaciones, no causas.
- **Matriz sin formato condicional.** Muchos números juntos se leen mejor con colores que resaltan lo importante.
:::

## ✅ Lo que lograste

- Construiste una matriz y un mapa.
- Usaste Preguntas y respuestas y el árbol de descomposición.
- Sabes los límites de los visuales de IA.

:::ejercicio quiz
Necesitas comparar ventas de cada categoría en cada canal, con subtotales. ¿Qué visual usas?
- [ ] Tarjeta
- [ ] Línea
- [x] Matriz
- [ ] Segmentación
:::

:::ejercicio quiz
El mapa pone "Córdoba" en España en lugar de Argentina. ¿Qué haces?
- [ ] Cambio el tema
- [x] Defino la categoría de datos de la columna y combino ciudad con país
- [ ] Borro la fila
- [ ] Cambio el idioma del informe a español
:::

:::ejercicio quiz
Influenciadores clave dice que los clientes Pyme compran más. ¿Qué concluyes?
- [ ] Que ser Pyme causa comprar más
- [x] Que hay una correlación que vale la pena investigar, no necesariamente una causa
- [ ] Que el visual está mal
- [ ] Que hay que dar descuentos a los clientes que no son Pyme
:::
