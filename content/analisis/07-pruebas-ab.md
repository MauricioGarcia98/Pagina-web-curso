---
titulo: Pruebas A/B - leer un experimento sin engañarse
nivel: Avanzado
duracion: 55
resumen: Cómo se analiza un experimento con SQL - controlar que la asignación esté sana, calcular conversión e ingreso por grupo, la mejora absoluta y relativa, una prueba de significancia para dos proporciones y la paradoja de Simpson, que hace que un cambio bueno parezca neutro cuando los grupos no son comparables.
objetivos: Revisar el tamaño y la composición de los grupos antes de mirar resultados | Calcular conversión, ingreso por usuario y mejora | Hacer una prueba z para dos proporciones en SQL | Detectar y corregir la paradoja de Simpson estratificando
autoevaluacion: ¿Sabes qué controlar antes de leer un A/B? | ¿Sabes calcular la mejora absoluta y relativa? | ¿Sabes cuándo una diferencia es estadísticamente significativa? | ¿Sabes qué es la paradoja de Simpson?
---

:::escenario
En septiembre de 2024 la tienda probó un checkout nuevo con la mitad de los clientes. El resumen del equipo de producto dice: “sin diferencias: 12,4 % contra 12,5 %, lo descartamos”. Antes de tirar meses de trabajo, te piden revisar el análisis. Los datos están en `experimento_checkout`.
:::

## Antes de mirar el resultado: controlar la asignación

Un experimento solo compara bien si los grupos son **iguales en todo** salvo el cambio que se prueba. Dos controles obligatorios:

1. **Tamaño de los grupos** (*sample ratio mismatch*): si debía ser 50/50 y da 60/40, algo falló en la asignación.
2. **Composición**: los grupos deberían tener la misma mezcla de dispositivos, países, clientes nuevos, etc.

```sql
SELECT grupo, COUNT(*) AS clientes,
       ROUND(100.0 * AVG(CASE WHEN dispositivo = 'movil' THEN 1 ELSE 0 END), 1) AS pct_movil
FROM experimento_checkout
GROUP BY grupo;
```

## Las métricas de un experimento

| Métrica | Fórmula |
|---|---|
| Conversión | convirtieron ÷ asignados |
| Ingreso por usuario | ingreso total ÷ asignados (incluye a los que no compraron) |
| Mejora absoluta | conversión B − conversión A (en puntos porcentuales) |
| Mejora relativa | (B − A) ÷ A |

## ¿Es una diferencia real? La prueba z para dos proporciones

Con muestras chicas, una diferencia puede ser azar. La prueba z compara la diferencia con su ruido:

- p = conversión conjunta de los dos grupos.
- varianza = p × (1 − p) × (1/n₁ + 1/n₂).
- z = (p₂ − p₁) ÷ √varianza. Con 95 % de confianza, la diferencia es significativa si |z| > 1,96.

Como SQLite no trae raíz cuadrada, compara los cuadrados: es significativa si **z² = (p₂ − p₁)² ÷ varianza > 3,84** (1,96²).

## La paradoja de Simpson

Si un grupo recibió más tráfico de un segmento que convierte menos (por ejemplo, móvil), el total compara manzanas con peras. Puede pasar que el cambio **gane en cada segmento** y en el total parezca empatar o perder. La solución es comparar **dentro de cada segmento** o reponderar con la misma mezcla para los dos grupos.

```diagrama
titulo: Simpson - el total esconde lo que pasa en cada segmento
nodo a: Control | icono=usuario | col=0 | fila=0 | sub=60 % escritorio
nodo b: Nuevo checkout | icono=usuario | col=0 | fila=2 | sub=70 % móvil | color=naranja
nodo e: Escritorio | icono=monitor | col=1 | fila=0 | sub=convierte más
nodo m: Móvil | icono=movil | col=1 | fila=2 | sub=convierte menos
nodo t: Total | icono=grafico | col=2 | fila=1 | sub=parece un empate | color=rojo
flecha a -> e
flecha b -> m
flecha e -> t
flecha m -> t
```

:::cuidado Mirar antes de tiempo
Revisar el resultado todos los días y cortar el experimento “cuando da significativo” infla los falsos positivos. Se fija antes cuántos usuarios hacen falta y se lee al final.
:::

## Ejercicios

:::ejercicio sql dificultad=Básico
Tamaño de cada grupo y su porcentaje sobre el total (1 decimal). Columnas: `grupo`, `clientes`, `pct`.
```sql solucion
SELECT grupo, COUNT(*) AS clientes, ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct FROM experimento_checkout GROUP BY grupo;
```
:::

:::ejercicio sql dificultad=Básico
Conversión de cada grupo en porcentaje con 2 decimales. Columnas: `grupo`, `asignados`, `convirtieron`, `conversion`.
```sql solucion
SELECT grupo, COUNT(*) AS asignados, SUM(convirtio) AS convirtieron, ROUND(100.0 * SUM(convirtio) / COUNT(*), 2) AS conversion
FROM experimento_checkout GROUP BY grupo;
```
:::

:::ejercicio sql dificultad=Intermedio
Ingreso por usuario asignado (todos, compren o no) y ticket promedio (solo los que compraron) por grupo, 2 decimales. Columnas: `grupo`, `ingreso_por_usuario`, `ticket`.
```pista
El ingreso por usuario divide por todos los asignados; el ticket, solo por los que convirtieron.
```
```sql solucion
SELECT grupo, ROUND(SUM(ingreso) / COUNT(*), 2) AS ingreso_por_usuario, ROUND(SUM(ingreso) / SUM(convirtio), 2) AS ticket
FROM experimento_checkout GROUP BY grupo;
```
:::

:::ejercicio sql dificultad=Intermedio
Control de composición: porcentaje de clientes de **móvil** en cada grupo (1 decimal). Columnas: `grupo`, `pct_movil`. ¿Los grupos son comparables?
```sql solucion
SELECT grupo, ROUND(100.0 * SUM(CASE WHEN dispositivo = 'movil' THEN 1 ELSE 0 END) / COUNT(*), 1) AS pct_movil FROM experimento_checkout GROUP BY grupo;
```
:::

:::ejercicio sql dificultad=Intermedio
Mejora absoluta (en puntos, 2 decimales) y relativa (%, 1 decimal) de la conversión del nuevo checkout contra el control, en el total. Columnas: `mejora_puntos`, `mejora_relativa_pct`.
```pista
Calcula la conversión de cada grupo con agregación condicional en una CTE.
```
```sql solucion
WITH c AS (
  SELECT 1.0 * SUM(CASE WHEN grupo = 'control' THEN convirtio END) / SUM(CASE WHEN grupo = 'control' THEN 1 END) AS a,
         1.0 * SUM(CASE WHEN grupo = 'nuevo_checkout' THEN convirtio END) / SUM(CASE WHEN grupo = 'nuevo_checkout' THEN 1 END) AS b
  FROM experimento_checkout
)
SELECT ROUND(100 * (b - a), 2) AS mejora_puntos, ROUND(100 * (b - a) / a, 1) AS mejora_relativa_pct FROM c;
```
:::

:::ejercicio sql ordenado dificultad=Intermedio
Conversión por **grupo y dispositivo** (%, 2 decimales). Columnas: `dispositivo`, `grupo`, `asignados`, `conversion`. Ordena por dispositivo y grupo.
```sql solucion
SELECT dispositivo, grupo, COUNT(*) AS asignados, ROUND(100.0 * SUM(convirtio) / COUNT(*), 2) AS conversion
FROM experimento_checkout GROUP BY dispositivo, grupo ORDER BY dispositivo, grupo;
```
:::

:::ejercicio sql dificultad=Avanzado
Prueba z² del total: con la conversión conjunta `p`, la varianza `p (1 − p) (1/n₁ + 1/n₂)` y `z² = (p₂ − p₁)² ÷ varianza`. Devuelve `z2` (3 decimales) y `significativo` (1 si `z2 > 3.84`, 0 si no).
```pista
Calcula n y conversiones de cada grupo en una CTE; `p` es el total de conversiones ÷ total de asignados.
```
```pista
Usa `1.0 *` para que todas las divisiones sean decimales.
```
```sql solucion
WITH g AS (
  SELECT SUM(CASE WHEN grupo = 'control' THEN 1 ELSE 0 END) AS n1,
         SUM(CASE WHEN grupo = 'control' THEN convirtio ELSE 0 END) AS c1,
         SUM(CASE WHEN grupo = 'nuevo_checkout' THEN 1 ELSE 0 END) AS n2,
         SUM(CASE WHEN grupo = 'nuevo_checkout' THEN convirtio ELSE 0 END) AS c2
  FROM experimento_checkout
), z AS (
  SELECT 1.0 * c1 / n1 AS p1, 1.0 * c2 / n2 AS p2, 1.0 * (c1 + c2) / (n1 + n2) AS p, n1, n2 FROM g
)
SELECT ROUND((p2 - p1) * (p2 - p1) / (p * (1 - p) * (1.0 / n1 + 1.0 / n2)), 3) AS z2,
       CASE WHEN (p2 - p1) * (p2 - p1) / (p * (1 - p) * (1.0 / n1 + 1.0 / n2)) > 3.84 THEN 1 ELSE 0 END AS significativo
FROM z;
```
:::

:::ejercicio sql ordenado dificultad=Avanzado
La misma prueba **dentro de cada dispositivo**: `dispositivo`, `mejora_puntos` (2 decimales), `z2` (3 decimales). Ordena por dispositivo.
```pista
Es la consulta anterior con `GROUP BY dispositivo` en la primera CTE.
```
```sql solucion
WITH g AS (
  SELECT dispositivo,
         SUM(CASE WHEN grupo = 'control' THEN 1 ELSE 0 END) AS n1,
         SUM(CASE WHEN grupo = 'control' THEN convirtio ELSE 0 END) AS c1,
         SUM(CASE WHEN grupo = 'nuevo_checkout' THEN 1 ELSE 0 END) AS n2,
         SUM(CASE WHEN grupo = 'nuevo_checkout' THEN convirtio ELSE 0 END) AS c2
  FROM experimento_checkout GROUP BY dispositivo
), z AS (
  SELECT dispositivo, 1.0 * c1 / n1 AS p1, 1.0 * c2 / n2 AS p2, 1.0 * (c1 + c2) / (n1 + n2) AS p, n1, n2 FROM g
)
SELECT dispositivo, ROUND(100 * (p2 - p1), 2) AS mejora_puntos,
       ROUND((p2 - p1) * (p2 - p1) / (p * (1 - p) * (1.0 / n1 + 1.0 / n2)), 3) AS z2
FROM z ORDER BY dispositivo;
```
:::

:::ejercicio sql dificultad=Avanzado
Corrige la comparación reponderando: calcula la conversión de cada grupo **con la mezcla de dispositivos del total del experimento** (conversión por dispositivo del grupo × peso del dispositivo en el total). Columnas: `grupo`, `conversion_ajustada` (%, 2 decimales).
```pista
Pesos: proporción de cada dispositivo sobre todos los asignados. Conversión: por grupo y dispositivo.
```
```pista
Une las dos CTE por dispositivo y suma `conversion × peso` por grupo.
```
```sql solucion
WITH pesos AS (
  SELECT dispositivo, 1.0 * COUNT(*) / (SELECT COUNT(*) FROM experimento_checkout) AS peso FROM experimento_checkout GROUP BY dispositivo
), conv AS (
  SELECT grupo, dispositivo, 1.0 * SUM(convirtio) / COUNT(*) AS c FROM experimento_checkout GROUP BY grupo, dispositivo
)
SELECT conv.grupo, ROUND(100 * SUM(conv.c * pesos.peso), 2) AS conversion_ajustada
FROM conv JOIN pesos ON pesos.dispositivo = conv.dispositivo
GROUP BY conv.grupo;
```
:::

:::ejercicio sql ordenado dificultad=Intermedio
Evolución diaria: conversiones acumuladas por grupo a lo largo de septiembre. Columnas: `fecha_asignacion`, `grupo`, `conv_acumuladas`. Ordena por fecha y grupo. (Así se ve por qué mirar antes de tiempo engaña: las curvas se cruzan varias veces.)
```pista
Agrupa por día y grupo, y acumula con `SUM(...) OVER (PARTITION BY grupo ORDER BY fecha_asignacion)`.
```
```sql solucion
WITH d AS (SELECT fecha_asignacion, grupo, SUM(convirtio) AS conv FROM experimento_checkout GROUP BY fecha_asignacion, grupo)
SELECT fecha_asignacion, grupo, SUM(conv) OVER (PARTITION BY grupo ORDER BY fecha_asignacion) AS conv_acumuladas
FROM d ORDER BY fecha_asignacion, grupo;
```
:::

:::ejercicio quiz dificultad=Avanzado
Con lo que calculaste, ¿qué le recomiendas al equipo?

- [ ] Descartar el checkout nuevo: en el total no hay diferencia
- [x] No descartarlo: mejora la conversión en escritorio y en móvil; el total empata porque el grupo nuevo recibió mucho más tráfico móvil. Hay que corregir la asignación y repetir la prueba
- [ ] Lanzarlo solo en móvil, porque ahí está la mayoría del grupo nuevo
- [ ] Extender la prueba hasta que el total dé significativo
:::
