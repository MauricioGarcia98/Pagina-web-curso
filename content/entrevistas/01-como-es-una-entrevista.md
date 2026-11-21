---
titulo: Cómo es una entrevista de datos y cómo hablar mientras resuelves
nivel: Intermedio
duracion: 45
resumen: Los cinco formatos de entrevista técnica para ingeniería y análisis de datos, qué evalúa cada uno, y un guion de seis pasos para pensar en voz alta. Practicas el guion con una pregunta clásica de SQL y con preguntas de opción múltiple sobre qué decir en cada momento.
objetivos: Reconocer los formatos de entrevista (SQL en vivo, Python, tarea para la casa, caso de negocio, diseño de sistemas) y qué evalúa cada uno | Aplicar el guion de seis pasos sin quedarte en silencio | Convertir una pregunta de negocio en supuestos explícitos antes de escribir código | Probar tu respuesta con un caso chico y decir su complejidad
prerrequisitos: logica-metodo | logica-pedidos-ambiguos | sql-entrevistas
autoevaluacion: ¿Sabes qué evalúa cada formato de entrevista? | ¿Puedes decir el guion de seis pasos de memoria? | ¿Anotas supuestos antes de escribir la primera línea? | ¿Terminas siempre probando con un caso chico?
---

:::analogia En palabras simples
Una entrevista técnica se parece más a un examen oral que a uno escrito. El entrevistador no solo mira si la respuesta final es correcta: escucha **cómo llegas**. Dos personas con la misma consulta correcta reciben notas distintas si una explicó sus supuestos y la otra escribió en silencio.
:::

## Los cinco formatos

Casi todas las empresas combinan algunos de estos formatos. Saber cuál te toca te dice qué practicar.

| Formato | Qué te piden | Qué evalúan | Dónde se practica en este módulo |
|---|---|---|---|
| **SQL en vivo** | Una o varias preguntas sobre 2-4 tablas, en 20-45 minutos | Joins sin duplicar, funciones de ventana, empates, nulos, claridad | Lecciones 2 a 5 |
| **Python** | Una función con estructuras de datos o procesar un archivo | Diccionarios, conjuntos, complejidad, casos borde, código legible | Lecciones 6 y 7 |
| **Spark / PySpark** | Traducir una lógica a DataFrames, o explicar un plan | Ventanas, joins, particiones, por qué algo es lento | Lección 8 |
| **Caso de negocio** (analistas) | "Las ventas bajaron 10 %: ¿qué miras?" | Definir métricas, segmentar, separar causa de casualidad | Lección 9 |
| **Diseño de sistemas** (ingenieros) | "Diseña el pipeline de pedidos de una tienda" | Preguntas de requisitos, capas, idempotencia, costo, calidad | Lección 10 |

:::nota Tarea para la casa (take-home)
Algunas empresas mandan un ejercicio de 3-6 horas: un CSV sucio y preguntas. Ahí evalúan lo mismo que en vivo más **la presentación**: un README con supuestos, pruebas y qué harías con más tiempo. Los proyectos de [Portafolio](#/m/portafolio) te dan exactamente esa práctica.
:::

## El guion de seis pasos

Este guion es el mismo método del módulo Lógica, adaptado a que alguien te escucha. Úsalo **siempre**, incluso con preguntas que parecen fáciles: las fáciles suelen esconder una trampa (empates, nulos, cancelados).

| Paso | Qué dices en voz alta | Ejemplo |
|---|---|---|
| 1. Repetir | La pregunta con tus palabras y el **grano** del resultado | "Quieres una fila por departamento con su segundo salario más alto." |
| 2. Aclarar | Supuestos sobre empates, nulos, período, filtros | "Si dos personas comparten el máximo, ¿el segundo es el siguiente valor distinto?" |
| 3. Ejemplo | Un caso chico resuelto a mano | "Con 10, 10 y 8, el segundo distinto es 8." |
| 4. Plan | Pasos en castellano antes del código | "Saco salarios distintos, los ordeno por departamento y tomo la posición 2." |
| 5. Código | Escribes por capas, nombrando cada CTE o función | `WITH distintos AS (...), ranking AS (...)` |
| 6. Probar | Corres el ejemplo, un caso borde y dices la complejidad | "Un departamento con una sola persona no aparece: ¿está bien así?" |

:::tip Si no sabes algo
Dilo y propone un camino: "No recuerdo si este motor tiene `QUALIFY`; lo hago con una subconsulta, que funciona en todos". Inventar una función que no existe resta mucho más que admitir la duda.
:::

## Un ejemplo completo, narrado

**Pregunta:** "¿Cuál es el segundo salario más alto de la empresa?"

1. **Repetir:** "Un solo número: el segundo valor más alto de `empleados.salario`."
2. **Aclarar:** "¿Cuento empleados que ya se fueron? Asumo que sí, porque no lo pediste. Si el máximo está repetido, tomo el siguiente valor **distinto**."
3. **Ejemplo:** "Con 9000, 9000 y 7000 la respuesta es 7000, no 9000."
4. **Plan:** "Valores distintos, de mayor a menor, salteo uno y tomo uno."
5. **Código:**

```sql
SELECT DISTINCT salario
FROM empleados
ORDER BY salario DESC
LIMIT 1 OFFSET 1;
```

6. **Probar:** "Si hubiera un solo salario distinto, esta consulta devuelve **cero filas**. Si me piden `NULL` en ese caso, lo envuelvo en una subconsulta: `SELECT (SELECT ... LIMIT 1 OFFSET 1) AS segundo`."

:::cuidado Olvidar el DISTINCT
Sin `DISTINCT`, si dos personas comparten el máximo, `OFFSET 1` devuelve el **mismo** máximo. Es el error más común en esta pregunta, y los entrevistadores la usan justamente para ver si piensas en empates.
:::

## Qué preguntar siempre (la lista de aclaraciones)

- **Grano:** ¿una fila por qué? (cliente, día, cliente-mes…)
- **Empates:** ¿todos los empatados, uno solo, o el siguiente valor distinto?
- **Nulos:** ¿cuentan como cero, se excluyen o son un grupo propio?
- **Período y zona horaria:** ¿qué fechas? ¿la fecha del pedido o la del pago?
- **Filtros de negocio:** ¿se excluyen cancelados, devueltos, pruebas internas?
- **Formato de salida:** nombres de columnas, orden, redondeo.

:::practica sql El guion completo con una pregunta clásica
1. Lee la pregunta: "el segundo salario más alto **de cada departamento**". Antes de ejecutar, di en voz alta el grano y qué haces con los empates.
2. Ejecuta: la consulta está escrita por capas, una CTE por paso del plan.
3. Cambia `pos = 2` por `pos = 1` y verifica que coincide con `MAX(salario)` por departamento: así se prueba una consulta contra otra más simple.

```sql
WITH distintos AS (
  SELECT DISTINCT departamento_id, salario FROM empleados
),
ranking AS (
  SELECT departamento_id, salario,
         DENSE_RANK() OVER (PARTITION BY departamento_id ORDER BY salario DESC) AS pos
  FROM distintos
)
SELECT departamento_id, salario AS segundo_salario
FROM ranking
WHERE pos = 2
ORDER BY departamento_id;
```

Reto: el departamento 1 tiene una sola persona y no aparece. Reescribe la consulta para que aparezca con `NULL` (pista: parte de `departamentos` y usa `LEFT JOIN`).

Documentación oficial: [Funciones de ventana](https://duckdb.org/docs/current/sql/functions/window_functions) · [LIMIT y OFFSET](https://duckdb.org/docs/current/sql/query_syntax/limit)
:::

:::errores
- **Escribir antes de aclarar.** Dos minutos de preguntas te ahorran rehacer la consulta entera.
- **Quedarte en silencio.** Si estás pensando, dilo: "estoy decidiendo si necesito una ventana o alcanza con GROUP BY".
- **Decir "listo" sin probar.** Siempre cierra con un caso chico y un caso borde.
- **Optimizar demasiado pronto.** Primero una versión correcta y clara; después, si te lo piden, la más rápida.
:::

:::entrevista
**Pregunta:** "Tu consulta está bien, pero la tabla tiene 2.000 millones de filas. ¿Qué cambia?"

**Respuesta modelo:** "Primero filtraría por la partición de fecha para leer menos datos. Después miraría el plan con `EXPLAIN`: si hay un join grande, revisaría si una tabla es chica para hacer broadcast. Y si esta pregunta se hace todos los días, la materializaría en una tabla agregada que se actualiza incremental."
:::

## Ejercicios

:::ejercicio quiz
El entrevistador pregunta "¿cuántos clientes compraron el mes pasado?". ¿Qué haces primero?
- [ ] Escribo `SELECT COUNT(*) FROM pedidos` y lo voy ajustando
- [x] Aclaro qué es "compró" (¿cancelados cuentan?), qué es "el mes pasado" y si cuento clientes distintos
- [ ] Pregunto qué motor de base de datos usan
- [ ] Digo que necesito ver los datos antes de responder cualquier cosa
:::

:::ejercicio quiz
¿Para qué sirve resolver un ejemplo chico a mano en una entrevista?
- [ ] Para ganar tiempo mientras pienso la consulta real
- [x] Para acordar con el entrevistador qué resultado se espera y descubrir los pasos del algoritmo
- [ ] Para mostrar que sé hacer cuentas sin computadora
- [ ] No sirve: lo importante es escribir código rápido
:::

:::ejercicio quiz
Terminaste la consulta. ¿Qué es lo más valioso que puedes decir antes de entregarla?
- [ ] "Creo que está bien"
- [ ] "En mi trabajo anterior usábamos otra herramienta"
- [x] "La probé con el ejemplo; si un departamento tiene una sola persona no aparece: ¿lo quieres con NULL?"
- [ ] "Se podría hacer más rápido pero no sé cómo"
:::

:::ejercicio quiz
No recuerdas si el motor de la entrevista soporta `QUALIFY`. ¿Qué haces?
- [ ] Lo uso igual y si falla, culpo al motor
- [ ] Me quedo callado hasta acordarme
- [x] Lo digo y uso una subconsulta con la función de ventana, que funciona en todos los motores
- [ ] Pido pasar a la pregunta siguiente
:::

:::ejercicio quiz
¿Qué formato de entrevista evalúa sobre todo definir métricas y segmentar para explicar un cambio?
- [ ] SQL en vivo
- [ ] Diseño de sistemas
- [x] Caso de negocio
- [ ] Python
:::

:::ejercicio sql dificultad=Intermedio titulo="El segundo precio más alto, con NULL si no existe"
Devuelve **una sola fila** con una columna `segundo_precio`: el segundo precio **distinto** más alto de los productos de la categoría `9`. Si la categoría tuviera un solo precio distinto, la fila debe existir igual con `NULL` (escribe la consulta para que funcione en ese caso).
```sql solucion
SELECT (
  SELECT DISTINCT precio FROM productos
  WHERE categoria_id = 9
  ORDER BY precio DESC
  LIMIT 1 OFFSET 1
) AS segundo_precio;
```
```pista
Ordena los precios distintos de mayor a menor y saltea uno con `LIMIT 1 OFFSET 1`.
```
```pista
Para que siempre haya una fila, pon esa consulta **dentro** de otro `SELECT (...) AS segundo_precio`: una subconsulta escalar sin resultado vale `NULL`.
```
:::

:::ejercicio sql dificultad=Intermedio titulo="Aclarar antes de contar"
El pedido es: "¿cuántos clientes compraron en diciembre de 2024?". Los supuestos acordados son: un cliente cuenta **una vez**, los pedidos `cancelado` no cuentan, y se usa `fecha_pedido`. Devuelve una columna `clientes`.
```sql solucion
SELECT COUNT(DISTINCT cliente_id) AS clientes
FROM pedidos
WHERE estado <> 'cancelado'
  AND fecha_pedido >= '2024-12-01' AND fecha_pedido < '2025-01-01';
```
```pista
"Una vez por cliente" es `COUNT(DISTINCT cliente_id)`, no `COUNT(*)`.
```
```pista
Filtra el mes con un rango semiabierto: `>= '2024-12-01' AND < '2025-01-01'`. Así no dependes de cómo está guardada la hora.
```
:::
