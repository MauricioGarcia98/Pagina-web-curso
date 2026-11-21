---
titulo: Simulacro final, preguntas de comportamiento y plan de dos semanas
nivel: Experto
duracion: 90
resumen: Cierras el módulo con una entrevista completa cronometrada - una pregunta de SQL, una de Python, un caso y un diseño - y con la parte que muchos no preparan - las preguntas de comportamiento ("cuéntame de una vez que un pipeline falló"). Aprendes el método STAR para responderlas con hechos, qué preguntarle tú al entrevistador y un plan de estudio de dos semanas para llegar en forma.
objetivos: Resolver una entrevista completa en tiempo real aplicando el guion de seis pasos | Responder preguntas de comportamiento con el método STAR y resultados medibles | Preparar tres historias propias que sirvan para muchas preguntas | Hacer preguntas al entrevistador que muestren criterio | Seguir un plan de repaso de dos semanas con los ejercicios del curso
prerrequisitos: entrevistas-casos-de-analista | entrevistas-pyspark-traducir-patrones | arquitectura-referencias-entrevista
autoevaluacion: ¿Puedes resolver una pregunta de SQL de nivel experto en 20 minutos hablando en voz alta? | ¿Tienes tres historias STAR escritas con un número en el resultado? | ¿Sabes qué preguntarle al entrevistador al final? | ¿Tienes un plan para las dos semanas previas?
---

:::analogia En palabras simples
Un simulacro es el ensayo general de una obra de teatro: con vestuario, luces y sin parar si algo sale mal. Practicar ejercicios sueltos es ensayar escenas; el simulacro te enseña a manejar el tiempo, los nervios y las transiciones entre una pregunta y otra.
:::

## Cómo hacer el simulacro

Pon un reloj y resuelve en orden, **hablando en voz alta** (grábate con el teléfono si estás solo: escucharte es la mejor corrección).

| Bloque | Tiempo | Dónde está |
|---|---|---|
| SQL de nivel experto | 20 min | Ejercicio "El mejor cliente de cada país y su peso" (abajo) |
| Python | 20 min | Ejercicio "Top-k por grupo en Python puro" (abajo) |
| Caso de negocio | 15 min | Ejercicio abierto "La caída de agosto" (abajo) |
| Diseño de sistemas | 25 min | Ejercicio abierto "El pipeline de pedidos" (abajo) y el método de [Arquitectura: la entrevista de diseño](#/l/arquitectura-referencias-entrevista) |
| Comportamiento | 10 min | Ejercicio abierto "Tu historia STAR" (abajo) |

:::tip Si te pasas de tiempo
En una entrevista real, a los 15 minutos de un problema de 20, di: "Me quedan 5 minutos; prefiero entregar esta versión correcta sin el caso borde de empates y explicarte cómo lo agregaría". Una solución parcial bien explicada vale más que una completa que no llegaste a terminar.
:::

## Preguntas de comportamiento: el método STAR

Las preguntas de comportamiento buscan evidencia de cómo trabajas: "cuéntame de una vez que…". La respuesta se ordena en cuatro partes:

| Letra | Qué cuentas | Peso aproximado |
|---|---|---|
| **S**ituación | El contexto en una o dos frases | 10 % |
| **T**area | Qué te tocaba resolver a **ti** | 10 % |
| **A**cción | Qué hiciste, paso a paso, en primera persona | 60 % |
| **R**esultado | Qué cambió, con un número si es posible, y qué aprendiste | 20 % |

**Ejemplo (con un proyecto del curso, si todavía no tienes experiencia laboral):**

- **S:** "En mi proyecto de portafolio de la tienda, el tablero de ventas mostraba cifras distintas cada mañana."
- **T:** "Me tocaba encontrar por qué y evitar que volviera a pasar."
- **A:** "Comparé las cargas de dos días y vi que el mismo pedido llegaba repetido cuando se reenviaba un archivo. Agregué una deduplicación por `pedido_id` quedándome con la carga más reciente, una prueba que falla si hay claves repetidas en silver, y una alerta si el conteo diario varía más de un 20 %."
- **R:** "Las cifras quedaron estables, la prueba detectó dos reenvíos más en el mes siguiente, y aprendí a poner las pruebas de unicidad desde el primer día."

:::cuidado Hablar en plural todo el tiempo
"Hicimos", "decidimos", "el equipo implementó"… El entrevistador no sabe qué hiciste **tú**. Reconoce al equipo en la situación y cuenta tus acciones en primera persona.
:::

### Tres historias que sirven para casi todo

Prepara por escrito tres historias y adáptalas a la pregunta:

| Historia | Responde preguntas como |
|---|---|
| **Algo que falló y arreglaste** | "Un error tuyo", "un incidente", "trabajar bajo presión" |
| **Algo que mejoraste por iniciativa propia** | "Ir más allá de lo pedido", "optimizar algo", "automatizar" |
| **Un desacuerdo o un pedido ambiguo** | "Un conflicto", "un cliente difícil", "convencer a alguien con datos" |

## Qué preguntarle al entrevistador

Al final siempre te dan la palabra. Usa ese momento para mostrar criterio:

- "¿Cómo se enteran hoy de que un dato está mal: por una alerta o por un usuario?"
- "¿Qué parte de la plataforma les gustaría reconstruir si pudieran?"
- "¿Cómo se ve un buen primer trimestre para esta posición?"
- "¿Cómo se revisa el código y quién aprueba los cambios en producción?"

## Plan de dos semanas

| Días | Qué repasar | Ejercicios del curso |
|---|---|---|
| 1-2 | Top-N, empates, N-ésimo valor | Lección 2 de este módulo + [SQL: Entrevistas](#/l/sql-entrevistas) |
| 3-4 | Rachas, acumulados, retención | Lecciones 3 y 4 + [Análisis: cohortes](#/l/analisis-cohortes-retencion) |
| 5 | Deduplicar, pivotear, anti-join | Lección 5 + [SQL: capa bronze](#/l/sql-capa-bronze) |
| 6-7 | Python: estructuras y datos | Lecciones 6 y 7 + [Python: desafíos](#/l/python-desafios) |
| 8 | PySpark y rendimiento | Lección 8 + [PySpark: desafíos](#/l/pyspark-desafios) |
| 9 | Casos de negocio | Lección 9 + [Casos](#/m/casos) |
| 10-11 | Diseño de sistemas | [Arquitectura](#/m/arquitectura), lecciones 1 a 8 |
| 12 | Historias STAR escritas y ensayadas en voz alta | Este ejercicio abierto |
| 13 | Simulacro completo cronometrado | Esta lección |
| 14 | Descanso y repaso liviano de tus errores | Tus notas |

:::practica notas Tu banco de historias y tu registro de errores
1. Crea una nota con la plantilla de abajo.
2. Escribe tus tres historias STAR: si todavía no trabajaste con datos, usa los proyectos del curso.
3. Cada vez que falles un ejercicio de este módulo, anota en el registro qué patrón no reconociste. Antes de la entrevista, repasa solo ese registro.

```text norun
# Preparación de entrevistas

## Historia 1: algo que falló y arreglé
- S:
- T:
- A:
- R (con un número):

## Historia 2: algo que mejoré por iniciativa propia
- S / T / A / R:

## Historia 3: un pedido ambiguo o un desacuerdo
- S / T / A / R:

## Registro de errores
| Fecha | Ejercicio | Qué patrón no vi | Cómo lo reconozco la próxima vez |
|---|---|---|---|

## Preguntas para el entrevistador
-
```

Reto: graba tu respuesta STAR de la historia 1 y verifica que dure menos de dos minutos y que la parte de **Acción** sea la más larga.

:::

:::errores
- **Practicar sin reloj.** El tiempo es parte de la prueba.
- **Historias sin resultado.** Termina siempre con qué cambió y qué aprendiste.
- **Memorizar respuestas palabra por palabra.** Memoriza la estructura y los hechos; las palabras salen solas.
- **No hacer preguntas al final.** Parece falta de interés.
:::

:::entrevista
**Pregunta:** "¿Cuál es tu mayor debilidad?"

**Respuesta modelo:** "Me costaba pedir ayuda cuando me trababa: perdía horas en algo que un compañero resolvía en minutos. Ahora me pongo un límite de 30 minutos; si no avanzo, escribo qué probé y pregunto. Eso me obligó a documentar mejor y, de paso, mis preguntas ayudan a otros que tienen la misma duda."
:::

## Ejercicios

:::ejercicio quiz
En una respuesta STAR, ¿qué parte debería ocupar la mayor parte del tiempo?
- [ ] La situación, para que se entienda el contexto
- [ ] La tarea, para dejar claro qué se esperaba
- [x] La acción, contada en primera persona y paso a paso
- [ ] El resultado, aunque no tenga números
:::

:::ejercicio quiz
Te quedan 5 minutos y tu consulta todavía no maneja empates. ¿Qué haces?
- [ ] Sigo escribiendo en silencio para intentar terminar
- [x] Lo digo, entrego la versión correcta sin empates y explico en una frase cómo los agregaría
- [ ] Borro todo y empiezo con un enfoque más simple
- [ ] Pido más tiempo
:::

:::ejercicio sql dificultad=Experto titulo="El mejor cliente de cada país y su peso"
**Simulacro (20 minutos).** Para cada país, devuelve el cliente que más gastó en 2024 (pedidos no cancelados; gasto = `cantidad * precio_unitario * (1 - descuento)`), su gasto redondeado a 2, y qué porcentaje representa del gasto total de ese país en 2024 (1 decimal). Si dos clientes empatan, gana el de menor `cliente_id`. Columnas: `pais`, `cliente_id`, `gasto`, `pct_del_pais`.
```sql solucion
WITH g AS (
  SELECT c.pais, p.cliente_id, SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)) AS gasto
  FROM pedidos p
  JOIN clientes c ON c.cliente_id = p.cliente_id
  JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  WHERE p.estado <> 'cancelado' AND p.fecha_pedido >= '2024-01-01' AND p.fecha_pedido < '2025-01-01'
  GROUP BY c.pais, p.cliente_id
),
r AS (
  SELECT pais, cliente_id, gasto,
         SUM(gasto) OVER (PARTITION BY pais) AS total_pais,
         ROW_NUMBER() OVER (PARTITION BY pais ORDER BY gasto DESC, cliente_id) AS rn
  FROM g
)
SELECT pais, cliente_id, ROUND(gasto, 2) AS gasto, ROUND(100.0 * gasto / total_pais, 1) AS pct_del_pais
FROM r WHERE rn = 1;
```
```pista
Dos patrones juntos: gasto por (país, cliente) en una CTE; después, en la misma capa, el total del país con `SUM(gasto) OVER (PARTITION BY pais)` y la posición con `ROW_NUMBER()`.
```
```pista
Calcula el total del país **antes** de filtrar `rn = 1`: si filtras primero, el total sería solo el del mejor cliente.
```
:::

:::ejercicio python dificultad=Experto titulo="Top-k por grupo en Python puro"
**Simulacro (20 minutos).** Escribe `top_k_por_grupo(filas, k)` donde `filas` es una lista de tuplas `(categoria, producto, ventas)`. Un producto puede aparecer en varias filas: suma sus ventas. Devuelve un diccionario `{categoria: [productos]}` con los `k` productos de más ventas de cada categoría, de mayor a menor; si empatan, primero el de nombre alfabéticamente menor.
```python inicial
def top_k_por_grupo(filas, k):
    pass
```
```python solucion
def top_k_por_grupo(filas, k):
    totales = {}
    for cat, prod, ventas in filas:
        totales.setdefault(cat, {})
        totales[cat][prod] = totales[cat].get(prod, 0) + ventas
    res = {}
    for cat, prods in totales.items():
        orden = sorted(prods.items(), key=lambda par: (-par[1], par[0]))
        res[cat] = [p for p, _ in orden[:k]]
    return res
```
```pista
Es el `GROUP BY` + `ROW_NUMBER` de SQL en Python: primero un diccionario de diccionarios `{categoria: {producto: total}}`.
```
```pista
Ordena con una clave de dos partes: `key=lambda par: (-par[1], par[0])` ordena por ventas descendente y, si empatan, por nombre ascendente.
```
```python test
filas = [
    ("audio", "parlante", 10), ("audio", "auricular", 7), ("audio", "parlante", 2),
    ("audio", "micro", 7), ("hogar", "lampara", 3), ("hogar", "silla", 9),
]
r = top_k_por_grupo(filas, 2)
assert r == {"audio": ["parlante", "auricular"], "hogar": ["silla", "lampara"]}, f"Obtuviste {r}"
assert top_k_por_grupo(filas, 10)["audio"] == ["parlante", "auricular", "micro"]
assert top_k_por_grupo([], 3) == {}
```
:::

:::ejercicio abierto titulo="La caída de agosto"
**Simulacro (15 minutos).** "Las ventas de agosto de 2024 cayeron un 33 % respecto de julio. Tienes 15 minutos y acceso a las tablas del curso. ¿Qué haces y qué le dices al gerente?" Escribe tu respuesta siguiendo el marco de cinco pasos de la lección 9 (definir, validar, descomponer, segmentar, recomendar).
```solucion
Definir: ventas netas (cantidad × precio × (1 − descuento)) de pedidos no cancelados, por fecha de pedido, agosto contra julio de 2024; agrego agosto de 2023 para separar estacionalidad.
Validar: verifico que agosto tenga todos los días cargados (calendario contra fechas con pedidos) y que la proporción de cancelados no haya saltado por un cambio de definición.
Descomponer: ventas = pedidos × ticket. Con los datos del curso, los pedidos no cancelados bajan en los cuatro canales (web 179 → 117, app 103 → 73, tienda 76 → 60, teléfono 44 → 22), mientras el ticket sube en app y tienda y baja en web y teléfono: la caída es sobre todo de volumen.
Segmentar: miro por canal (web aporta la mayor caída absoluta), por país y por cliente nuevo o recurrente; reviso si julio tuvo una campaña que infló la base de comparación.
Recomendar: "La caída es de cantidad de pedidos, no de precio, y se concentra en web. Propongo revisar el tráfico y la conversión de la web en agosto, confirmar si julio tuvo una campaña puntual, y comparar con agosto de 2023 antes de tomar medidas. Si se confirma una caída de tráfico, priorizar la campaña de septiembre en web."
```
:::

:::ejercicio abierto titulo="El pipeline de pedidos"
**Simulacro (25 minutos).** "Diseña el pipeline que lleva los pedidos de la tienda (una base PostgreSQL transaccional con 50.000 pedidos por día) a un tablero que el equipo comercial revisa cada mañana a las 8:00, y a un modelo de recomendaciones que se reentrena cada semana." Incluye preguntas de requisitos, estimación de volumen, capas, herramientas, carga incremental, calidad y qué pasa si algo falla.
```solucion
Preguntas: ¿cuánta historia se necesita (3 años)? ¿El tablero necesita los datos de ayer completos o casi en tiempo real? ¿Hay datos personales (emails) que restringir? ¿Qué nube y qué presupuesto?
Estimación: 50.000 pedidos/día × ~3 líneas × ~200 bytes ≈ 30 MB/día de detalle; 3 años ≈ 33 GB. Es un volumen chico: no hace falta streaming ni un clúster grande; un batch diario alcanza.
Ingesta: carga incremental por `updated_at` (o CDC con Debezium si se necesitan borrados) a la capa bronze en formato Delta/Iceberg, particionada por fecha de carga. Corre a las 02:00.
Transformación: silver deduplica por pedido_id (última versión gana con MERGE), normaliza estados y montos y enmascara emails; gold arma fct_pedidos y dim_cliente/dim_producto (modelo estrella) con dbt, con pruebas unique/not_null/relationships.
Orquestación: Airflow o Lakeflow Jobs con dependencias ingesta → silver → gold → refresco del tablero; reintentos con backoff y SLA a las 07:00 con alerta al canal del equipo.
Consumo: Power BI o el tablero sobre gold; el reentrenamiento semanal lee fct_pedidos de gold, versionado con time travel para reproducir el entrenamiento.
Calidad y fallas: conteo de filas contra el origen, frescura (max(fecha) = ayer), cuarentena de filas inválidas en lugar de frenar todo; todas las cargas son idempotentes (MERGE por clave), así que reintentar no duplica. Si a las 07:00 no terminó, el tablero muestra la fecha del último dato y se avisa al equipo comercial.
Costo: clúster chico o serverless unos minutos por día; almacenamiento de decenas de GB: costo bajo; revisar mensualmente.
```
:::

:::ejercicio abierto titulo="Tu historia STAR"
Escribe tu respuesta a "Cuéntame de una vez que un dato o un proceso falló y cómo lo resolviste", con el método STAR. Si todavía no tienes experiencia laboral, usa un proyecto o un incidente del curso. Debe tener un resultado concreto y lo que aprendiste.
```solucion
Ejemplo de respuesta bien armada:
S: (Ejemplo inspirado en los incidentes del proyecto Ruta Sur.) El tablero de entregas a tiempo mostraba un 120 % algunos días.
T: Me tocaba encontrar el error y asegurar que no volviera a pasar.
A: Reduje el problema a un día concreto y comparé los conteos por capa: en silver había más entregas que viajes. Encontré que el stream reprocesaba eventos después de un reinicio y no deduplicaba por id de evento. Agregué la deduplicación con marca de agua, una prueba que compara entregas contra viajes por día, y documenté el incidente con la causa y la corrección.
R: El indicador volvió a valores posibles, la prueba detectó un reprocesamiento más la semana siguiente antes de que llegara al tablero, y aprendí a validar invariantes del negocio (nunca más de 100 %) además de los nulos y duplicados.
Qué revisar en tu respuesta: ¿la acción está en primera persona y es la parte más larga? ¿Hay un resultado medible? ¿Dice qué aprendiste?
```
:::
