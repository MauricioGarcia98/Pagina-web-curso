---
titulo: "Proyecto 9: Asistente de soporte con RAG que cita sus fuentes"
nivel: Experto
duracion: 120
resumen: Un asistente que responde preguntas de clientes usando solo la base de conocimiento de la empresa y dice de qué artículo sacó cada respuesta. Construyes la ingesta de documentos (limpieza y fragmentos), la búsqueda (por palabras, por embeddings y combinada), el prompt con citas, y - lo que separa un demo de un proyecto - la evaluación con un conjunto de preguntas y respuestas esperadas. Primero local con Ollama y una base vectorial en archivo; después con Vector Search en Databricks o Azure AI Search.
objetivos: Dividir documentos en fragmentos con superposición y metadatos | Implementar y comparar búsqueda por palabras, por embeddings e híbrida | Escribir un prompt que obligue a citar y a decir "no sé" | Evaluar la recuperación (acierto en el top k) y la respuesta (fidelidad a la fuente) | Llevar la solución a Vector Search o Azure AI Search con actualización automática
prerrequisitos: portafolio-clasificador-tickets-llm
autoevaluacion: ¿Sabes por qué los fragmentos se superponen? | ¿Sabes qué es el acierto en el top k? | ¿Sabes por qué la búsqueda híbrida suele ganar? | ¿Sabes cómo evitar que el modelo invente una política? | ¿Sabes cómo se actualiza el índice cuando cambia un artículo?
---

:::escenario
El chat de soporte responde 40 % de las veces "un agente te contactará". Los artículos de ayuda existen (devoluciones, envíos, cobros, garantía, cuenta), pero nadie los lee. La gerente de experiencia de cliente quiere un asistente que responda con la política vigente, **cite el artículo** y, si no sabe, lo diga y derive. Una respuesta inventada sobre plazos de devolución es un problema legal.
:::

## Valor y riesgos

- **Valor**: más consultas resueltas sin agente; respuestas consistentes con la política.
- **Riesgo principal**: alucinación (inventar un plazo o una condición). Se mitiga con recuperación buena, un prompt que obliga a citar y una evaluación antes de publicar.

## Los datos

[🏭 Generar los datos del proyecto](#/generador?esc=soporte&n=1500&semilla=88&desde=2024-01-01&hasta=2024-12-31) · `base_conocimiento` (7 artículos: devoluciones, envíos, cobros, garantía, cuenta, paquetes dañados y facturación) y `tickets` con preguntas reales y su `articulo_relacionado`: **ese par es tu conjunto de evaluación**.

## Arquitectura

```diagrama
titulo: RAG con citas y evaluación
nodo kb: Base de conocimiento | icono=libro | col=0 | fila=0
nodo ch: Fragmentos | icono=documento | col=1 | fila=0 | sub=~300 tokens,\nsuperposición, metadatos
nodo idx: Índice | icono=vectorsearch | col=2 | fila=0 | sub=embeddings + palabras
nodo q: Pregunta | icono=usuario | col=0 | fila=1
nodo r: Recuperación | icono=lupa | col=1 | fila=1 | sub=top 4 híbrido
nodo llm: Generación | icono=bot | col=2 | fila=1 | sub=responde solo con\nlos fragmentos y cita
nodo ev: Evaluación | icono=check | col=3 | fila=1 | sub=acierto@k, fidelidad,\n"no sé" correcto
flecha kb -> ch
flecha ch -> idx
flecha q -> r
flecha idx -> r
flecha r -> llm
flecha llm -> ev
```

## Fase 1: local

```python norun
# ingesta: fragmentos con superposición y metadatos (artículo, título, fecha)
def fragmentar(texto, tam=600, solape=120):
    return [texto[i:i + tam] for i in range(0, max(1, len(texto) - solape), tam - solape)]

import chromadb, ollama
col = chromadb.PersistentClient("data/index").get_or_create_collection("kb")
for a in articulos:
    for k, frag in enumerate(fragmentar(a["contenido"])):
        emb = ollama.embed(model="nomic-embed-text", input=frag)["embeddings"][0]
        col.add(ids=[f'{a["articulo_id"]}-{k}'], embeddings=[emb], documents=[frag],
                metadatas=[{"articulo_id": a["articulo_id"], "titulo": a["titulo"]}])
```

El prompt de generación:

```text
Responde la pregunta del cliente usando SOLO los fragmentos.
Después de cada afirmación, cita el artículo entre corchetes: [art. 3].
Si los fragmentos no alcanzan para responder, di exactamente:
"No tengo esa información; te derivo con un agente." No inventes plazos ni montos.

Fragmentos:
{fragmentos}

Pregunta: {pregunta}
```

## Fase 2: evaluar antes de publicar

| Qué se mide | Cómo |
|---|---|
| **Acierto@k** de la recuperación | ¿El artículo correcto está entre los k fragmentos recuperados? (con los tickets etiquetados) |
| **Fidelidad** | ¿Cada afirmación de la respuesta está en los fragmentos citados? (revisión humana de una muestra, o un modelo juez con criterios explícitos) |
| **"No sé" correcto** | Preguntas fuera de la base (por ejemplo, sobre sucursales) deben derivar |
| **Latencia y costo** | Por pregunta |

Compara tres recuperadores (palabras, embeddings, híbrido) con el **mismo** conjunto de preguntas. Esa tabla es el centro del README.

## Fase 3: en la nube

- **Databricks**: los fragmentos en una tabla Delta con *Change Data Feed*, un índice de **Vector Search** sincronizado con esa tabla (si cambia un artículo, se reindexa solo) y un endpoint de modelo para generar. Si tu edición no incluye Vector Search, mantén el índice local y usa Databricks para la ingesta y la evaluación.
- **Azure**: **Azure AI Search** con búsqueda híbrida (palabras + vectores) y reranking semántico, y un modelo desplegado en **Microsoft Foundry**.

:::errores
- **Responder sin citas**: no se puede verificar.
- **Chunks sin metadatos** (producto, versión, fecha): el asistente mezcla documentación vieja y nueva.
- **No evaluar la recuperación**: si el documento correcto no aparece entre los recuperados, ningún modelo va a responder bien.
- **No contemplar "no lo sé"**: el asistente inventa cuando no tiene contexto.
:::

:::trabajo
- En las empresas, un RAG se mide con un conjunto de preguntas reales y respuestas esperadas, y se vuelve a evaluar cada vez que cambian los documentos, el chunking o el modelo.
:::

:::entrevista "¿Cómo evaluarías un asistente RAG?"
En dos partes. La recuperación: para un conjunto de preguntas sé qué documento contiene la respuesta y mido si aparece entre los primeros recuperados. La generación: si la respuesta es fiel al contexto, si cita las fuentes correctas y si dice no saber cuando corresponde, con revisión humana de una muestra o con un modelo evaluador calibrado. Lo corro en cada cambio.
:::

## Entregables

- [ ] Pipeline de ingesta (fragmentos con metadatos) y su actualización.
- [ ] Tabla de evaluación: acierto@k de los tres recuperadores, fidelidad y "no sé" correcto.
- [ ] Ejemplos de respuestas buenas y de fallas analizadas.
- [ ] Costo y latencia por pregunta.

## Práctica

:::ejercicio cli dificultad=Básico titulo="La base de conocimiento"
Genera el escenario `soporte` y muestra el archivo `~/datos/generados/soporte/base_conocimiento.csv` con `cat`.
```setup
generar-datos soporte --filas 200 --semilla 88
```
```respuesta
cat \S*soporte/base_conocimiento\.csv
```
```solucion
cat ~/datos/generados/soporte/base_conocimiento.csv
```
:::

:::ejercicio sql ordenado dificultad=Avanzado titulo="Búsqueda por palabras"
`kb(articulo_id, titulo, contenido)` y `terminos(termino)` tienen los artículos y las palabras de la pregunta "me cobraron dos veces la compra". Puntúa cada artículo por cuántos términos aparecen en su contenido (`LIKE`, sin distinguir mayúsculas) y devuelve el top 2: `articulo_id`, `titulo`, `puntaje`, de mayor a menor puntaje.
```sql setup
CREATE TABLE kb (articulo_id INTEGER, titulo TEXT, contenido TEXT);
INSERT INTO kb VALUES
(1, 'Cómo devolver un producto', 'Puedes devolver un producto dentro de los 30 días. El reembolso se acredita en el mismo medio de pago.'),
(2, 'Plazos y costos de envío', 'Los envíos demoran entre 3 y 5 días hábiles. El envío es gratis en compras mayores a 50 dólares.'),
(3, 'Cobros duplicados o no reconocidos', 'Si ves dos cobros por la misma compra, normalmente uno es una preautorización que se libera en 72 horas.'),
(4, 'Facturación y comprobantes', 'La factura se envía por email al confirmarse el pago de la compra.');
CREATE TABLE terminos (termino TEXT);
INSERT INTO terminos VALUES ('cobr'), ('dos'), ('compra');
```
```sql solucion
SELECT k.articulo_id, k.titulo, COUNT(t.termino) AS puntaje
FROM kb k
JOIN terminos t ON LOWER(k.contenido) LIKE '%' || t.termino || '%'
GROUP BY k.articulo_id, k.titulo
ORDER BY puntaje DESC, k.articulo_id
LIMIT 2;
```
```pista
Une `kb` con `terminos` por `LOWER(contenido) LIKE '%' || termino || '%'` y cuenta los términos por artículo.
```
```explicacion
El artículo 3 gana con los tres términos. Fíjate que se usa la raíz "cobr" para encontrar "cobros" y "cobraron": las búsquedas por palabras reales (BM25) normalizan las palabras con un *stemmer*. Los embeddings resuelven sinónimos ("me debitaron dos veces") que las palabras no encuentran: por eso la búsqueda híbrida suele ganar.
```
:::

:::ejercicio sql ordenado dificultad=Avanzado titulo="Acierto en el top k"
`resultados(pregunta_id, recuperador, posicion, articulo_id)` tiene los artículos que devolvió cada recuperador para cada pregunta (posición 1 a 3), y `esperado(pregunta_id, articulo_id)` el artículo correcto. Calcula por recuperador el **acierto@3** (% de preguntas cuyo artículo correcto aparece en las 3 posiciones, 1 decimal), de mayor a menor.
```sql setup
CREATE TABLE esperado (pregunta_id INTEGER, articulo_id INTEGER);
INSERT INTO esperado VALUES (1, 3), (2, 2), (3, 1), (4, 5);
CREATE TABLE resultados (pregunta_id INTEGER, recuperador TEXT, posicion INTEGER, articulo_id INTEGER);
INSERT INTO resultados VALUES
(1, 'palabras', 1, 3), (1, 'palabras', 2, 4), (1, 'palabras', 3, 1), (2, 'palabras', 1, 6), (2, 'palabras', 2, 1), (2, 'palabras', 3, 4),
(3, 'palabras', 1, 1), (3, 'palabras', 2, 2), (3, 'palabras', 3, 3), (4, 'palabras', 1, 7), (4, 'palabras', 2, 6), (4, 'palabras', 3, 2),
(1, 'hibrido', 1, 3), (1, 'hibrido', 2, 7), (1, 'hibrido', 3, 4), (2, 'hibrido', 1, 2), (2, 'hibrido', 2, 6), (2, 'hibrido', 3, 1),
(3, 'hibrido', 1, 4), (3, 'hibrido', 2, 1), (3, 'hibrido', 3, 6), (4, 'hibrido', 1, 5), (4, 'hibrido', 2, 2), (4, 'hibrido', 3, 3);
```
```sql solucion
WITH aciertos AS (
  SELECT r.recuperador, r.pregunta_id, MAX(CASE WHEN r.articulo_id = e.articulo_id AND r.posicion <= 3 THEN 1 ELSE 0 END) AS acierto
  FROM resultados r JOIN esperado e ON e.pregunta_id = r.pregunta_id
  GROUP BY r.recuperador, r.pregunta_id
)
SELECT recuperador, ROUND(100.0 * SUM(acierto) / COUNT(*), 1) AS acierto_3
FROM aciertos GROUP BY recuperador ORDER BY acierto_3 DESC;
```
```pista
Por recuperador y pregunta, marca 1 si alguna de las posiciones 1 a 3 tiene el artículo esperado (`MAX(CASE …)`); después promedia por recuperador.
```
:::

:::ejercicio quiz dificultad=Avanzado
¿Por qué los fragmentos se cortan con **superposición** (por ejemplo, 120 caracteres compartidos con el anterior)?

- [ ] Para que el índice ocupe más
- [x] Para que una idea que cae justo en el corte no quede partida en dos fragmentos sin contexto
- [ ] Porque los modelos de embeddings lo exigen
- [ ] Para que haya más resultados duplicados
:::

:::ejercicio quiz dificultad=Avanzado
Un cliente pregunta por el horario de las sucursales, que no está en la base. ¿Qué debe hacer el asistente?

- [ ] Responder un horario habitual de comercios
- [x] Decir que no tiene esa información y derivar a un agente, como indica el prompt; y la evaluación tiene que incluir preguntas así
- [ ] Buscar en internet
- [ ] Responder con el artículo más parecido
:::

:::ejercicio quiz dificultad=Intermedio
Cambia la política de devoluciones de 30 a 15 días. ¿Qué tiene que pasar en el sistema?

- [ ] Nada: el modelo lo aprende solo
- [x] Actualizar el artículo y que el índice se resincronice (por ejemplo, Vector Search sincronizado con la tabla con Change Data Feed), para que no se recupere el fragmento viejo
- [ ] Reentrenar el modelo de lenguaje
- [ ] Borrar el historial de conversaciones
:::

## Para ir más lejos

- Reranking de los fragmentos recuperados antes de generar.
- Un agente que, además de responder, consulte el estado del pedido (herramienta) cuando la pregunta lo requiera.
- Evaluación automática con MLflow (evaluadores de fidelidad y relevancia) en cada cambio del prompt o del índice.
