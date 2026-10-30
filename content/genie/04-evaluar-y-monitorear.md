---
titulo: Probar, evaluar y monitorear un Genie Agent
nivel: Avanzado
duracion: 60
resumen: Cómo saber si un agente responde bien antes y después de cada cambio - probar como usuario y revisar el SQL, corregir y guardar como ejemplo, armar benchmarks con varias formas de la misma pregunta y entender cómo los califica Genie, el modo agente para preguntas exploratorias, la pestaña de monitoreo y el ciclo de mejora con los usuarios.
objetivos: Revisar y corregir una respuesta de Genie y convertirla en ejemplo | Armar un conjunto de benchmarks con respuestas SQL | Explicar las reglas con que Genie califica un benchmark en modo chat | Distinguir el modo chat del modo agente | Usar el monitoreo y la opinión de los usuarios para mejorar el agente
prerrequisitos: genie-crear-y-afinar-un-agente
autoevaluacion: ¿Sabes cuándo un benchmark se califica como Good aunque las filas estén en otro orden? | ¿Sabes por qué un benchmark sin SQL de respuesta necesita revisión manual? | ¿Sabes cuándo usar el modo agente?
---

:::escenario
El agente de ventas lleva una semana en uso y la gerente está contenta. Un viernes, alguien agrega una instrucción de texto para "mejorar los resúmenes"… y sin que nadie lo note, la pregunta "ventas por país" empieza a incluir los pedidos cancelados. ¿Cómo te enteras antes que la gerente? Igual que con el código: con **pruebas automáticas** que se corren después de cada cambio. En Genie se llaman **benchmarks**.
:::

## Paso 1: ser el primer usuario

La documentación insiste: **el autor tiene que ser el primer usuario** del agente. Hazle las preguntas que esperas de los usuarios, con distintas formas de escribirlas, y por cada respuesta:

1. Haz clic en **Show code** y lee el SQL. ¿Usó la tabla correcta? ¿Filtró los cancelados? ¿Agrupó al grano correcto?
2. Si está mal y tienes permiso de edición, **corrige el SQL** directamente y ejecútalo.
3. Desde el menú de la respuesta, **Add as instruction** la guarda como consulta de ejemplo (con la pregunta y el SQL corregido), para que Genie aprenda a responder preguntas parecidas.
4. **Add as benchmark** la guarda como pregunta de prueba (paso 2).

También puedes abrir **Genie Code** desde una respuesta equivocada y describirle el problema. Por ejemplo: "el agente usa trimestres calendario y nosotros usamos el año fiscal que empieza en febrero; actualiza su contexto". Genie Code propone los cambios de contexto y tú aceptas los que correspondan.

:::cuidado Genie no es determinista
Como cualquier modelo de lenguaje, la misma pregunta puede dar respuestas distintas en distintos momentos. Una prueba que salió bien una vez no garantiza que salga bien siempre. Por eso existen los benchmarks: correr las mismas preguntas muchas veces y medir.
:::

## Paso 2: benchmarks, las pruebas automáticas del agente

Un **benchmark** es una pregunta de prueba con su **respuesta correcta**, escrita como una consulta SQL. Se agregan en la pestaña **Benchmarks** → **Add benchmark**: la pregunta, el SQL que la responde bien (*SQL Answer*, que puedes escribir o pedirle a Genie con **Generate SQL** y revisar) y, opcionalmente, una nota de evaluación.

Recomendaciones de la documentación:

- Cubrir las **preguntas más frecuentes** de los usuarios.
- Agregar **varias formas de la misma pregunta** con la misma respuesta SQL: "ventas de marzo por canal", "¿cuánto facturó cada canal en marzo?", "canal con más ventas en marzo de 2024". Así mides si el agente entiende la intención, no una frase exacta.
- Los benchmarks son **solo para evaluar**: Genie no los usa como contexto para responder (a diferencia de las consultas de ejemplo).

Se ejecutan con **Run benchmarks** (todos) o **Run selected** (algunos). Cada pregunta corre como una conversación nueva, sin el contexto de otras preguntas.

### Cómo califica Genie en modo chat

En modo chat, Genie compara el resultado de su SQL con el del *SQL Answer*. La documentación da reglas precisas:

| Situación | Calificación |
|---|---|
| El SQL generado es idéntico al de la respuesta | **Good** |
| El resultado es idéntico | **Good** |
| Los mismos datos, en otro orden | **Good** |
| Los números coinciden redondeados a 4 cifras significativas | **Good** |
| El resultado está vacío o la consulta da error | **Bad** |
| El resultado tiene columnas de más | **Bad** |
| Un resultado de una sola celda con un valor distinto | **Bad** |
| No hay SQL de respuesta, o los resultados no coinciden exactamente | **Manual review** (revisión manual) |

Dos consecuencias prácticas:

- Escribe el *SQL Answer* con **exactamente las columnas** que esperas: si tu respuesta tiene 2 columnas y Genie devuelve 3, es *Bad*.
- La comparación usa hasta 5.000 filas; para resultados grandes, ordena explícitamente para evitar falsos *Bad*.

El resultado de cada corrida queda en la pestaña **Evaluations** con su **porcentaje de exactitud**, y puedes abrir cada pregunta para comparar la salida del modelo con la respuesta correcta (*ground truth*). Corriendo los benchmarks **antes y después de cada cambio** sabes si el cambio ayudó o empeoró.

## Paso 3: el modo agente, para preguntas exploratorias

El modo normal (chat) responde una pregunta con una consulta. El **modo agente** (*Agent mode*) está pensado para preguntas abiertas como "investiga qué pasó con las ventas de marzo": divide la pregunta en subtareas, ejecuta **varias** consultas, puede pedir aclaraciones y entrega un **informe** con hallazgos, gráficos y citas, que se puede exportar a PDF.

| | Modo chat | Modo agente |
|---|---|---|
| Para qué | Preguntas concretas | Preguntas exploratorias, de varios pasos |
| Qué devuelve | Una tabla, un resumen y un gráfico | Un informe con hallazgos, gráficos y citas |
| Velocidad | Rápida | Más lenta (hay una variante **Flash**, en beta, para respuestas rápidas) |
| Cómo se evalúa en benchmarks | Comparando resultados con el SQL de respuesta | Un modelo juez (*LLM judge*) califica, guiado por la nota de evaluación |

## Paso 4: monitorear y mejorar con los usuarios

Una vez compartido, el agente se mejora con el uso real:

- Cada respuesta pregunta **Is this correct?** El usuario puede responder **Yes**, **Fix it** (marca el error y puede pedir que Genie lo intente de nuevo con esa corrección) o **Request review** (pide que lo revise alguien del equipo).
- En la pestaña **Monitor**, quien tiene permiso `CAN MANAGE` ve todas las preguntas y respuestas, filtra por fecha, calificación o usuario, y responde las revisiones pedidas. El **Weekly digest** muestra mensajes, usuarios activos y opiniones de la semana, y **Analyze Agent Usage** le pide a Genie Code un análisis de tendencias y problemas.
- Importante: el agente **no cambia solo** por las opiniones de los usuarios. Las opiniones te dicen **qué** mejorar; el cambio lo haces tú (un ejemplo nuevo, una SQL expression, un sinónimo) y lo compruebas con los benchmarks.

```recorrido
titulo: El ciclo de mejora de un agente
estacion usuario: Pregunta del usuario | icono=usuario
estacion monitor: Pestaña Monitor | icono=monitor
estacion cambio: Cambio de contexto | icono=engranaje
estacion bench: Benchmarks | icono=prueba
estacion publicar: Versión mejorada | icono=check
paso usuario: Una respuesta equivocada
La gerente pregunta "ventas del local en marzo" y Genie no encuentra datos. Marca **Fix it**.
>>> texto
¿Cuánto vendió el local en marzo de 2024?  →  0 filas  ·  Fix it: "el local es el canal tienda"
paso monitor: El equipo la ve en Monitor
Filtrando por calificación negativa, aparece la pregunta con el SQL que generó Genie.
>>> sql
WHERE canal = 'local'   -- el valor real es 'tienda'
paso cambio: Se corrige con la herramienta adecuada
No con una instrucción de texto: se agrega el sinónimo "local" a la columna canal y se activa entity matching.
>>> yaml
columna: canal
sinónimos: [local, local físico, sucursal]
entity_matching: activado
paso bench: Se agrega el caso a los benchmarks
La pregunta (y dos variantes) se guardan con su SQL de respuesta, y se corren todos los benchmarks para comprobar que nada se rompió.
>>> tabla
corrida,exactitud
antes del cambio,85%
después del cambio,95%
paso publicar: El agente responde bien
La misma pregunta ahora usa canal = 'tienda'. El equipo responde la revisión en Monitor para que la gerente lo sepa.
>>> sql
WHERE canal = 'tienda' AND mes = '2024-03'
```

Los porcentajes del recorrido son ilustrativos.

:::errores
- **Probar con una sola forma de cada pregunta**: los usuarios escriben de mil maneras. Varias variantes por pregunta.
- **Benchmarks sin SQL de respuesta**: no se califican solos; quedan en revisión manual.
- **SQL de respuesta con columnas de más o de menos** respecto de lo que se pregunta: falsos *Bad* o *Good*.
- **Cambiar instrucciones sin volver a correr los benchmarks**: el escenario de esta lección.
- **Esperar que el agente aprenda solo de los "pulgares abajo"**: el feedback indica qué mejorar; el cambio lo hace el equipo.
:::

:::trabajo
- Un agente en producción tiene un conjunto de benchmarks (decenas de preguntas con variantes) y una meta de exactitud; se corre después de cada cambio de contexto y de los datos de origen.
- La revisión semanal de la pestaña Monitor es parte del trabajo del dueño del agente, igual que revisar los tests fallidos de un pipeline.
- Los benchmarks son la versión para IA de los tests de datos: la misma disciplina de "probar antes de publicar" que viste con dbt.
:::

:::entrevista "¿Cómo medirías la calidad de un asistente que responde preguntas sobre datos?"
Con un conjunto de preguntas de prueba con su respuesta correcta en SQL, que cubra las preguntas frecuentes con varias formas de escribirlas, y lo correría después de cada cambio para medir la exactitud y detectar regresiones. En Genie eso son los benchmarks: comparan el resultado de la consulta generada con el de la respuesta. Además revisaría el uso real en el monitoreo, las respuestas marcadas como incorrectas y las revisiones pedidas, y convertiría cada error corregido en un nuevo ejemplo y un nuevo benchmark.
:::

## Ejercicios

:::ejercicio python dificultad=Avanzado titulo="Un calificador de benchmarks como el de Genie"
Escribe `calificar(esperado, generado)` que compare dos resultados como lo hace Genie en modo chat. Cada resultado es `None` (la consulta dio error) o un diccionario `{"columnas": [...], "filas": [[...], ...]}`. Devuelve `"Good"` o `"Bad"` con estas reglas, en orden:

1. `generado` es `None` o no tiene filas → `"Bad"`.
2. `generado` tiene columnas que no están en `esperado` → `"Bad"`.
3. Si, después de redondear cada número a **4 cifras significativas**, las filas de los dos coinciden **sin importar el orden** → `"Good"`.
4. En cualquier otro caso → `"Bad"`.

Para redondear a 4 cifras significativas puedes usar `float(f"{x:.4g}")`. Compara solo las columnas de `esperado`, en su orden.
```python inicial
def calificar(esperado, generado):
    pass
```
```python solucion
def calificar(esperado, generado):
    if generado is None or not generado["filas"]:
        return "Bad"
    if any(c not in esperado["columnas"] for c in generado["columnas"]):
        return "Bad"

    def normalizar(resultado):
        idx = [resultado["columnas"].index(c) for c in esperado["columnas"]]
        filas = []
        for fila in resultado["filas"]:
            valores = []
            for i in idx:
                v = fila[i]
                if isinstance(v, (int, float)) and not isinstance(v, bool):
                    v = float(f"{v:.4g}")
                valores.append(v)
            filas.append(tuple(valores))
        return sorted(filas, key=repr)

    try:
        return "Good" if normalizar(esperado) == normalizar(generado) else "Bad"
    except ValueError:
        return "Bad"
```
```pista
Normaliza los dos resultados igual: reordena las columnas según `esperado`, redondea los números con `float(f"{v:.4g}")`, convierte cada fila en tupla y ordena la lista. Si alguna columna esperada falta en `generado`, `.index()` lanza `ValueError`: eso también es `"Bad"`.
```
```python test
E = {"columnas": ["canal", "ventas"], "filas": [["web", 192098.47], ["app", 106357.03]]}
assert calificar(E, {"columnas": ["canal", "ventas"], "filas": [["web", 192098.47], ["app", 106357.03]]}) == "Good", "Resultado idéntico → Good"
assert calificar(E, {"columnas": ["canal", "ventas"], "filas": [["app", 106357.03], ["web", 192098.47]]}) == "Good", "Mismo resultado en otro orden → Good"
assert calificar(E, {"columnas": ["ventas", "canal"], "filas": [[192098.47, "web"], [106357.03, "app"]]}) == "Good", "Columnas en otro orden → Good"
assert calificar(E, {"columnas": ["canal", "ventas"], "filas": [["web", 192100.0], ["app", 106400.0]]}) == "Good", "Iguales a 4 cifras significativas → Good"
assert calificar(E, {"columnas": ["canal", "ventas", "pedidos"], "filas": [["web", 192098.47, 10], ["app", 106357.03, 8]]}) == "Bad", "Columnas de más → Bad"
assert calificar(E, None) == "Bad", "Error → Bad"
assert calificar(E, {"columnas": ["canal", "ventas"], "filas": []}) == "Bad", "Vacío → Bad"
assert calificar(E, {"columnas": ["canal", "ventas"], "filas": [["web", 150000.0], ["app", 106357.03]]}) == "Bad", "Valores distintos → Bad"
assert calificar({"columnas": ["total"], "filas": [[1234.5]]}, {"columnas": ["total"], "filas": [[1290.0]]}) == "Bad", "Celda única distinta → Bad"
```
:::

:::ejercicio sql dificultad=Intermedio titulo="El SQL de respuesta de un benchmark"
Escribe el *SQL Answer* del benchmark "¿Qué canal vendió más en marzo de 2024?": una sola fila con `canal` y `ventas` (ventas netas sin cancelados, redondeadas a 2) del canal con más ventas. Solo esas dos columnas.
```sql solucion
SELECT p.canal,
       ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS ventas
FROM pedidos p
JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
WHERE p.estado <> 'cancelado'
  AND p.fecha_pedido >= '2024-03-01' AND p.fecha_pedido < '2024-04-01'
GROUP BY p.canal
ORDER BY ventas DESC
LIMIT 1;
```
```pista
Agrupa por canal, ordena por ventas de mayor a menor y quédate con la primera fila. Si devolvieras una tercera columna, Genie calificaría como Bad una respuesta correcta de dos columnas.
```
:::

:::ejercicio quiz dificultad=Intermedio
Un benchmark no tiene SQL de respuesta. ¿Qué pasa al correrlo en modo chat?

- [ ] Se califica Good
- [ ] Se califica Bad
- [x] Queda marcado para revisión manual (Manual review)
- [ ] No se puede correr
:::

:::ejercicio quiz dificultad=Básico
¿Los benchmarks mejoran las respuestas del agente?

- [ ] Sí, Genie los usa como ejemplos
- [x] No: son solo para evaluar; para enseñarle algo a Genie se usan consultas de ejemplo, SQL expressions o instrucciones
- [ ] Solo en modo agente
- [ ] Solo si tienen parámetros
:::

:::ejercicio quiz dificultad=Intermedio
La pregunta es "investiga qué cambió en las ventas de marzo y por qué canal". ¿Qué modo conviene?

- [ ] El modo chat
- [x] El modo agente: hace varias consultas y entrega un informe con hallazgos
- [ ] Un benchmark
- [ ] Ninguno: Genie no responde eso
:::
