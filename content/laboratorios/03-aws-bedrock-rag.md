---
titulo: "Laboratorio AWS: RAG con Bedrock Knowledge Bases, Guardrails y lotes"
nivel: Experto
duracion: 75
resumen: Arma un asistente de postventa con Amazon Bedrock - documentos con metadatos en S3, una Knowledge Base con S3 Vectors y chunking de tamaño fijo, ingesta, recuperación con filtros por país, respuesta con citas, un guardrail que bloquea temas y anonimiza correos, y una clasificación masiva con inferencia por lotes. Es la práctica de AIF-C01 y AIP-C01.
objetivos: Crear una Knowledge Base con un modelo de embeddings y un almacén vectorial de bajo costo | Configurar la fuente de datos con prefijos y estrategia de chunking | Recuperar con filtros por metadatos y generar respuestas con citas | Crear un guardrail con temas denegados, PII y ataques de prompt, y publicar una versión | Ejecutar inferencia por lotes desde un JSONL en S3 | Borrar la Knowledge Base, el guardrail y el bucket
autoevaluacion: ¿Sabes qué hace un archivo .metadata.json junto a un documento? | ¿Sabes la diferencia entre Retrieve y RetrieveAndGenerate? | ¿Sabes por qué el modelo se invoca con un perfil de inferencia como us.amazon.nova-pro-v1:0? | ¿Sabes qué acciones tiene un guardrail sobre PII? | ¿Sabes cuándo conviene la inferencia por lotes?
---

:::escenario
El equipo de postventa responde 2.000 consultas por día buscando a mano en tres políticas. Quieren un asistente que conteste con la fuente citada, que solo use las políticas del país del cliente, que no dé consejos de inversión y que nunca muestre correos en sus respuestas. Además, quieren clasificar todos los reclamos del mes de una vez y barato.
:::

## Arquitectura

```diagrama
titulo: Asistente de postventa con Amazon Bedrock
nodo doc: Políticas .md + .metadata.json | icono=documento | col=0 | fila=1
nodo s3: S3 politicas/ | icono=s3 | col=1 | fila=1 | sub=kb-politicas-lab | color=verde
nodo kb: Knowledge Base | icono=knowledgebases | col=2 | fila=1 | sub=chunks de 60 tokens | color=azul
nodo emb: Titan Embeddings V2 | icono=bedrock | col=2 | fila=0 | sub=vectores | color=verde
nodo vec: S3 Vectors | icono=vectorsearch | col=3 | fila=0 | forma=cilindro | color=violeta
nodo app: Aplicación | icono=usuario | col=4 | fila=1
nodo gr: Guardrail | icono=guardrails | col=3 | fila=2 | sub=temas, PII, prompt attack | color=rojo
nodo fm: Nova Pro (perfil us.) | icono=bedrock | col=3 | fila=1 | sub=responde con citas | color=verde
flecha doc -> s3
flecha s3 -> kb: ingesta
flecha kb -> emb
flecha emb -> vec
flecha app -> fm
flecha fm -> kb: retrieve
flecha app -> gr | estilo=punteada
```

## Costo en una cuenta real

| Recurso | Costo del laboratorio |
|---|---|
| Embeddings de Titan V2 (unos 2.000 tokens) | Menos de un centavo |
| **S3 Vectors** como almacén | Por uso: centavos |
| Consultas a Nova Lite y Nova Pro | Centavos |
| Guardrail | Por cada 1.000 unidades de texto evaluadas: centavos |
| Inferencia por lotes | Alrededor del 50 % del precio bajo demanda |

:::cuidado No uses OpenSearch Serverless para practicar
El asistente de la consola propone por defecto **OpenSearch Serverless**, que cobra un mínimo de OCU por hora aunque no consultes: cientos de dólares al mes. Para el laboratorio elige **S3 Vectors** (o Aurora PostgreSQL con escalado a cero). Si ya creaste una colección de OpenSearch, bórrala hoy.
:::

## Práctica guiada

:::ejercicio cli
Paso 1. Crea los archivos del laboratorio con `lab-preparar rag` y revisa la carpeta.
```respuesta
lab-preparar rag
```
:::

:::ejercicio cli
Paso 2. Crea el bucket `kb-politicas-lab` y sube **toda** la carpeta `labs/rag/politicas` al prefijo `politicas/`.
```respuesta
todos: aws s3 cp labs/rag/politicas/? s3://kb-politicas-lab/politicas/ || --recursive
aws s3 mb s3://kb-politicas-lab && aws s3 cp labs/rag/politicas/? s3://kb-politicas-lab/politicas/ --recursive
```
```solucion
aws s3 mb s3://kb-politicas-lab && aws s3 cp labs/rag/politicas s3://kb-politicas-lab/politicas/ --recursive
```
```setup
lab-preparar rag
```
```explicacion
Cada documento viaja con su `.metadata.json` (por ejemplo `{"metadataAttributes": {"pais": "AR"}}`). Bedrock los lee en la ingesta y permite filtrar por esos atributos al recuperar.
```
:::

:::ejercicio cli
Paso 3. Busca qué modelos de **embeddings** ofrece Bedrock: lista los `modelId` de los modelos cuya modalidad de salida es `EMBEDDING`.
```respuesta
todos: aws bedrock list-foundation-models || --by-output-modality EMBEDDING || --query ['"]?modelSummaries\[\]\.modelId['"]?
```
```solucion
aws bedrock list-foundation-models --by-output-modality EMBEDDING --query "modelSummaries[].modelId"
```
:::

:::ejercicio cli
Paso 4. Crea la Knowledge Base `kb-politicas` con el rol `arn:aws:iam::123456789012:role/rol-kb`, el modelo de embeddings `amazon.titan-embed-text-v2:0` y almacenamiento `S3_VECTORS`. Muestra solo el `knowledgeBaseId`.
```respuesta
todos: aws bedrock-agent create-knowledge-base || --name kb-politicas || --role-arn arn:aws:iam::123456789012:role/rol-kb || \S*amazon\.titan-embed-text-v2:0\S* || \S*S3_VECTORS\S* || --query ['"]?knowledgeBase\.knowledgeBaseId['"]?
```
```solucion
aws bedrock-agent create-knowledge-base --name kb-politicas --role-arn arn:aws:iam::123456789012:role/rol-kb --knowledge-base-configuration '{"type":"VECTOR","vectorKnowledgeBaseConfiguration":{"embeddingModelArn":"arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v2:0"}}' --storage-configuration '{"type":"S3_VECTORS"}' --query knowledgeBase.knowledgeBaseId --output text
```
:::

:::ejercicio cli
Paso 5. Guarda en la variable `KB` el id de la Knowledge Base llamada `kb-politicas` (filtra con `[?name=='kb-politicas']`).
```respuesta
todos: KB=\$\(aws bedrock-agent list-knowledge-bases || --query ['"]knowledgeBaseSummaries\[\?name==[`']kb-politicas[`']\]\.knowledgeBaseId['"] || --output text\)
```
```solucion
KB=$(aws bedrock-agent list-knowledge-bases --query "knowledgeBaseSummaries[?name=='kb-politicas'].knowledgeBaseId" --output text)
```
```setup
aws bedrock-agent create-knowledge-base --name kb-politicas --role-arn arn:aws:iam::123456789012:role/rol-kb --knowledge-base-configuration '{"type":"VECTOR","vectorKnowledgeBaseConfiguration":{"embeddingModelArn":"arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v2:0"}}' --storage-configuration '{"type":"S3_VECTORS"}'
```
:::

:::ejercicio cli
Paso 6. Crea la fuente de datos `politicas-s3` en `$KB`: bucket `arn:aws:s3:::kb-politicas-lab`, solo el prefijo `politicas/`, y chunking `FIXED_SIZE` de 60 tokens con 10 % de solapamiento.
```respuesta
todos: aws bedrock-agent create-data-source || --knowledge-base-id \$KB || --name politicas-s3 || \S*arn:aws:s3:::kb-politicas-lab\S* || \S*politicas/\S* || \S*FIXED_SIZE\S* || \S*"maxTokens"\s*:\s*60\S* || \S*"overlapPercentage"\s*:\s*10\S*
```
```solucion
aws bedrock-agent create-data-source --knowledge-base-id $KB --name politicas-s3 --data-source-configuration '{"type":"S3","s3Configuration":{"bucketArn":"arn:aws:s3:::kb-politicas-lab","inclusionPrefixes":["politicas/"]}}' --vector-ingestion-configuration '{"chunkingConfiguration":{"chunkingStrategy":"FIXED_SIZE","fixedSizeChunkingConfiguration":{"maxTokens":60,"overlapPercentage":10}}}'
```
```setup
lab-preparar rag
aws s3 mb s3://kb-politicas-lab
aws s3 cp labs/rag/politicas s3://kb-politicas-lab/politicas/ --recursive
aws bedrock-agent create-knowledge-base --name kb-politicas --role-arn arn:aws:iam::123456789012:role/rol-kb --knowledge-base-configuration '{"type":"VECTOR","vectorKnowledgeBaseConfiguration":{"embeddingModelArn":"arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v2:0"}}' --storage-configuration '{"type":"S3_VECTORS"}'
KB=$(aws bedrock-agent list-knowledge-bases --query "knowledgeBaseSummaries[?name=='kb-politicas'].knowledgeBaseId" --output text)
```
```explicacion
Con chunks chicos cada fragmento trata un solo tema y la recuperación es más precisa; con chunks grandes el modelo recibe más contexto pero también más ruido. Para documentos con secciones claras, la estrategia `HIERARCHICAL` busca con el fragmento chico y devuelve el grande.
```
:::

:::ejercicio cli
Paso 7. Guarda el id de la fuente de datos en `DS` y lanza la **ingesta**. Muestra solo `ingestionJob.statistics`.
```respuesta
todos: DS=\$\(aws bedrock-agent list-data-sources --knowledge-base-id \$KB || aws bedrock-agent start-ingestion-job || --data-source-id \$DS || --query ['"]?ingestionJob\.statistics['"]?
```
```solucion
DS=$(aws bedrock-agent list-data-sources --knowledge-base-id $KB --query "dataSourceSummaries[0].dataSourceId" --output text) && aws bedrock-agent start-ingestion-job --knowledge-base-id $KB --data-source-id $DS --query ingestionJob.statistics
```
```setup
lab-preparar rag
aws s3 mb s3://kb-politicas-lab
aws s3 cp labs/rag/politicas s3://kb-politicas-lab/politicas/ --recursive
aws bedrock-agent create-knowledge-base --name kb-politicas --role-arn arn:aws:iam::123456789012:role/rol-kb --knowledge-base-configuration '{"type":"VECTOR","vectorKnowledgeBaseConfiguration":{"embeddingModelArn":"arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v2:0"}}' --storage-configuration '{"type":"S3_VECTORS"}'
KB=$(aws bedrock-agent list-knowledge-bases --query "knowledgeBaseSummaries[?name=='kb-politicas'].knowledgeBaseId" --output text)
aws bedrock-agent create-data-source --knowledge-base-id $KB --name politicas-s3 --data-source-configuration '{"type":"S3","s3Configuration":{"bucketArn":"arn:aws:s3:::kb-politicas-lab","inclusionPrefixes":["politicas/"]}}' --vector-ingestion-configuration '{"chunkingConfiguration":{"chunkingStrategy":"FIXED_SIZE","fixedSizeChunkingConfiguration":{"maxTokens":60,"overlapPercentage":10}}}'
```
:::

:::ejercicio cli
Paso 8. Recupera los fragmentos para la pregunta `cuántos días tengo para devolver un producto` y muestra el `score` y la `uri` de cada resultado.
```respuesta
todos: aws bedrock-agent-runtime retrieve || --knowledge-base-id \$KB || --retrieval-query || \S*devolver\S* || --query ['"]?retrievalResults\[\]\.\{\S*
```
```solucion
aws bedrock-agent-runtime retrieve --knowledge-base-id $KB --retrieval-query '{"text":"cuántos días tengo para devolver un producto"}' --query "retrievalResults[].{score:score,uri:location.s3Location.uri}"
```
```setup
lab-preparar rag
aws s3 mb s3://kb-politicas-lab
aws s3 cp labs/rag/politicas s3://kb-politicas-lab/politicas/ --recursive
aws bedrock-agent create-knowledge-base --name kb-politicas --role-arn arn:aws:iam::123456789012:role/rol-kb --knowledge-base-configuration '{"type":"VECTOR","vectorKnowledgeBaseConfiguration":{"embeddingModelArn":"arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v2:0"}}' --storage-configuration '{"type":"S3_VECTORS"}'
KB=$(aws bedrock-agent list-knowledge-bases --query "knowledgeBaseSummaries[?name=='kb-politicas'].knowledgeBaseId" --output text)
aws bedrock-agent create-data-source --knowledge-base-id $KB --name politicas-s3 --data-source-configuration '{"type":"S3","s3Configuration":{"bucketArn":"arn:aws:s3:::kb-politicas-lab","inclusionPrefixes":["politicas/"]}}' --vector-ingestion-configuration '{"chunkingConfiguration":{"chunkingStrategy":"FIXED_SIZE","fixedSizeChunkingConfiguration":{"maxTokens":60,"overlapPercentage":10}}}'
DS=$(aws bedrock-agent list-data-sources --knowledge-base-id $KB --query "dataSourceSummaries[0].dataSourceId" --output text) && aws bedrock-agent start-ingestion-job --knowledge-base-id $KB --data-source-id $DS
```
:::

:::ejercicio cli
Paso 9. Un cliente de México pregunta por la `garantía`. Recupera hasta 3 resultados **solo de documentos con `pais` igual a `MX`** y muestra sus URI.
```respuesta
todos: aws bedrock-agent-runtime retrieve || --knowledge-base-id \$KB || \S*garant\S* || \S*"equals"\S* || \S*"key"\s*:\s*"pais"\S* || \S*"value"\s*:\s*"MX"\S*
```
```solucion
aws bedrock-agent-runtime retrieve --knowledge-base-id $KB --retrieval-query '{"text":"garantía"}' --retrieval-configuration '{"vectorSearchConfiguration":{"numberOfResults":3,"filter":{"equals":{"key":"pais","value":"MX"}}}}' --query "retrievalResults[].location.s3Location.uri"
```
```setup
lab-preparar rag
aws s3 mb s3://kb-politicas-lab
aws s3 cp labs/rag/politicas s3://kb-politicas-lab/politicas/ --recursive
aws bedrock-agent create-knowledge-base --name kb-politicas --role-arn arn:aws:iam::123456789012:role/rol-kb --knowledge-base-configuration '{"type":"VECTOR","vectorKnowledgeBaseConfiguration":{"embeddingModelArn":"arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v2:0"}}' --storage-configuration '{"type":"S3_VECTORS"}'
KB=$(aws bedrock-agent list-knowledge-bases --query "knowledgeBaseSummaries[?name=='kb-politicas'].knowledgeBaseId" --output text)
aws bedrock-agent create-data-source --knowledge-base-id $KB --name politicas-s3 --data-source-configuration '{"type":"S3","s3Configuration":{"bucketArn":"arn:aws:s3:::kb-politicas-lab","inclusionPrefixes":["politicas/"]}}' --vector-ingestion-configuration '{"chunkingConfiguration":{"chunkingStrategy":"FIXED_SIZE","fixedSizeChunkingConfiguration":{"maxTokens":60,"overlapPercentage":10}}}'
DS=$(aws bedrock-agent list-data-sources --knowledge-base-id $KB --query "dataSourceSummaries[0].dataSourceId" --output text) && aws bedrock-agent start-ingestion-job --knowledge-base-id $KB --data-source-id $DS
```
```explicacion
El filtro se aplica **antes** de ordenar por similitud: los documentos de otros países ni siquiera compiten. Así se implementa también el aislamiento por cliente (`cliente_id` en los metadatos).
```
:::

:::ejercicio cli
Paso 10. Genera la respuesta con citas usando `retrieve-and-generate` sobre `$KB` con el modelo `us.amazon.nova-pro-v1:0`. Muestra el texto de la respuesta (`output.text`).
```respuesta
todos: aws bedrock-agent-runtime retrieve-and-generate || --input || --retrieve-and-generate-configuration || \S*KNOWLEDGE_BASE\S* || \S*us\.amazon\.nova-pro-v1:0\S*
```
```solucion
aws bedrock-agent-runtime retrieve-and-generate --input '{"text":"cuántos días tengo para devolver un producto"}' --retrieve-and-generate-configuration "{\"type\":\"KNOWLEDGE_BASE\",\"knowledgeBaseConfiguration\":{\"knowledgeBaseId\":\"$KB\",\"modelArn\":\"us.amazon.nova-pro-v1:0\"}}" --query "{respuesta:output.text,fuentes:citations[0].retrievedReferences[].location.s3Location.uri}"
```
```setup
lab-preparar rag
aws s3 mb s3://kb-politicas-lab
aws s3 cp labs/rag/politicas s3://kb-politicas-lab/politicas/ --recursive
aws bedrock-agent create-knowledge-base --name kb-politicas --role-arn arn:aws:iam::123456789012:role/rol-kb --knowledge-base-configuration '{"type":"VECTOR","vectorKnowledgeBaseConfiguration":{"embeddingModelArn":"arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v2:0"}}' --storage-configuration '{"type":"S3_VECTORS"}'
KB=$(aws bedrock-agent list-knowledge-bases --query "knowledgeBaseSummaries[?name=='kb-politicas'].knowledgeBaseId" --output text)
aws bedrock-agent create-data-source --knowledge-base-id $KB --name politicas-s3 --data-source-configuration '{"type":"S3","s3Configuration":{"bucketArn":"arn:aws:s3:::kb-politicas-lab","inclusionPrefixes":["politicas/"]}}' --vector-ingestion-configuration '{"chunkingConfiguration":{"chunkingStrategy":"FIXED_SIZE","fixedSizeChunkingConfiguration":{"maxTokens":60,"overlapPercentage":10}}}'
DS=$(aws bedrock-agent list-data-sources --knowledge-base-id $KB --query "dataSourceSummaries[0].dataSourceId" --output text) && aws bedrock-agent start-ingestion-job --knowledge-base-id $KB --data-source-id $DS
```
```explicacion
Muchos modelos nuevos solo se invocan con un **perfil de inferencia entre regiones** (`us.`, `eu.`, `apac.` o `global.`): Bedrock reparte la carga entre regiones para darte más capacidad. Si pasas el id sin prefijo, la llamada falla con `ValidationException`.
```
:::

:::ejercicio cli
Paso 11. Crea el guardrail `gr-atencion` que: deniegue el tema `inversiones`, **anonimice** los `EMAIL` y filtre `PROMPT_ATTACK` con fuerza `HIGH` en la entrada. Mensajes de bloqueo: `No puedo ayudar con eso.` (entrada) y `No puedo responder eso.` (salida).
```respuesta
todos: aws bedrock create-guardrail || --name gr-atencion || --blocked-input-messaging || --blocked-outputs-messaging || --topic-policy-config || \S*"type"\s*:\s*"DENY"\S* || --sensitive-information-policy-config || \S*"EMAIL"\S* || \S*ANONYMIZE\S* || \S*PROMPT_ATTACK\S*
```
```solucion
aws bedrock create-guardrail --name gr-atencion --blocked-input-messaging "No puedo ayudar con eso." --blocked-outputs-messaging "No puedo responder eso." --topic-policy-config '{"topicsConfig":[{"name":"inversiones","definition":"Consejos sobre inversiones, acciones o criptomonedas","examples":["en qué acciones invierto"],"type":"DENY"}]}' --sensitive-information-policy-config '{"piiEntitiesConfig":[{"type":"EMAIL","action":"ANONYMIZE"}]}' --content-policy-config '{"filtersConfig":[{"type":"PROMPT_ATTACK","inputStrength":"HIGH","outputStrength":"NONE"}]}' --query guardrailId --output text
```
:::

:::ejercicio cli
Paso 12. Guarda el id del guardrail en `GR` y pruébalo sobre la **entrada** `¿En qué criptomonedas me conviene invertir?` con la versión `DRAFT`. Muestra `action` y el texto de salida.
```respuesta
todos: GR=\$\(aws bedrock list-guardrails || aws bedrock-runtime apply-guardrail || --guardrail-identifier \$GR || --guardrail-version DRAFT || --source INPUT || --content
```
```solucion
GR=$(aws bedrock list-guardrails --query "guardrails[?name=='gr-atencion'].id" --output text) && aws bedrock-runtime apply-guardrail --guardrail-identifier $GR --guardrail-version DRAFT --source INPUT --content '[{"text":{"text":"¿En qué criptomonedas me conviene invertir?"}}]' --query "{accion:action,texto:outputs[0].text}"
```
```setup
aws bedrock create-guardrail --name gr-atencion --blocked-input-messaging "No puedo ayudar con eso." --blocked-outputs-messaging "No puedo responder eso." --topic-policy-config '{"topicsConfig":[{"name":"inversiones","definition":"Consejos sobre inversiones, acciones o criptomonedas","examples":["en qué acciones invierto"],"type":"DENY"}]}' --sensitive-information-policy-config '{"piiEntitiesConfig":[{"type":"EMAIL","action":"ANONYMIZE"}]}' --content-policy-config '{"filtersConfig":[{"type":"PROMPT_ATTACK","inputStrength":"HIGH","outputStrength":"NONE"}]}'
```
:::

:::ejercicio cli
Paso 13. Ahora evalúa una **salida** del modelo: `Escribile a ana.perez@correo.com`. Muestra solo el texto resultante.
```respuesta
todos: aws bedrock-runtime apply-guardrail || --guardrail-identifier \$GR || --source OUTPUT || \S*ana\.perez@correo\.com\S*
```
```solucion
aws bedrock-runtime apply-guardrail --guardrail-identifier $GR --guardrail-version DRAFT --source OUTPUT --content '[{"text":{"text":"Escribile a ana.perez@correo.com"}}]' --query "outputs[0].text"
```
```setup
aws bedrock create-guardrail --name gr-atencion --blocked-input-messaging "No puedo ayudar con eso." --blocked-outputs-messaging "No puedo responder eso." --topic-policy-config '{"topicsConfig":[{"name":"inversiones","definition":"Consejos sobre inversiones, acciones o criptomonedas","examples":["en qué acciones invierto"],"type":"DENY"}]}' --sensitive-information-policy-config '{"piiEntitiesConfig":[{"type":"EMAIL","action":"ANONYMIZE"}]}' --content-policy-config '{"filtersConfig":[{"type":"PROMPT_ATTACK","inputStrength":"HIGH","outputStrength":"NONE"}]}'
GR=$(aws bedrock list-guardrails --query "guardrails[?name=='gr-atencion'].id" --output text)
```
```explicacion
Con `ANONYMIZE` el texto sigue pero el dato queda como `{EMAIL}`; con `BLOCK` se reemplaza todo por el mensaje de bloqueo.
```
:::

:::ejercicio cli
Paso 14. Publica una **versión** inmutable del guardrail `$GR` con la descripción `primera versión`. En producción se invoca la versión, nunca `DRAFT`.
```respuesta
todos: aws bedrock create-guardrail-version || --guardrail-identifier \$GR
```
```solucion
aws bedrock create-guardrail-version --guardrail-identifier $GR --description "primera versión"
```
```setup
aws bedrock create-guardrail --name gr-atencion --blocked-input-messaging "No puedo ayudar con eso." --blocked-outputs-messaging "No puedo responder eso." --topic-policy-config '{"topicsConfig":[{"name":"inversiones","definition":"Consejos sobre inversiones, acciones o criptomonedas","examples":["en qué acciones invierto"],"type":"DENY"}]}' --sensitive-information-policy-config '{"piiEntitiesConfig":[{"type":"EMAIL","action":"ANONYMIZE"}]}' --content-policy-config '{"filtersConfig":[{"type":"PROMPT_ATTACK","inputStrength":"HIGH","outputStrength":"NONE"}]}'
GR=$(aws bedrock list-guardrails --query "guardrails[?name=='gr-atencion'].id" --output text)
```
:::

:::ejercicio cli
Paso 15. Sube `labs/rag/lote.jsonl` a `s3://kb-politicas-lab/lotes/entrada/lote.jsonl` y crea el job por lotes `clasificar-reclamos` con `amazon.nova-lite-v1:0`, el rol `arn:aws:iam::123456789012:role/rol-batch` y salida en `s3://kb-politicas-lab/lotes/salida/`.
```respuesta
todos: aws s3 cp labs/rag/lote\.jsonl s3://kb-politicas-lab/lotes/entrada/(lote\.jsonl)? || aws bedrock create-model-invocation-job || --job-name clasificar-reclamos || --model-id amazon\.nova-lite-v1:0 || --role-arn arn:aws:iam::123456789012:role/rol-batch || \S*s3://kb-politicas-lab/lotes/salida/\S*
```
```solucion
aws s3 cp labs/rag/lote.jsonl s3://kb-politicas-lab/lotes/entrada/lote.jsonl && aws bedrock create-model-invocation-job --job-name clasificar-reclamos --model-id amazon.nova-lite-v1:0 --role-arn arn:aws:iam::123456789012:role/rol-batch --input-data-config '{"s3InputDataConfig":{"s3Uri":"s3://kb-politicas-lab/lotes/entrada/lote.jsonl"}}' --output-data-config '{"s3OutputDataConfig":{"s3Uri":"s3://kb-politicas-lab/lotes/salida/"}}'
```
```setup
lab-preparar rag
aws s3 mb s3://kb-politicas-lab
```
```explicacion
Cada línea del JSONL tiene `recordId` y `modelInput`. El resultado queda en `salida/<job>/lote.jsonl.out`: revísalo con `aws s3 ls s3://kb-politicas-lab/lotes/salida/ --recursive`. En una cuenta real el mínimo de registros por job es mayor (100 o más según el modelo).
```
:::

## En tu cuenta real

- **Acceso a modelos**: en la consola de Bedrock, *Model access*, habilita Titan Text Embeddings V2 y Amazon Nova (es inmediato).
- **Rol de la Knowledge Base**: lo crea la consola si eliges *Create and use a new service role*. Por CLI necesita confianza para `bedrock.amazonaws.com`, lectura del bucket e invocación del modelo de embeddings.
- **S3 Vectors**: crea antes el vector bucket y el índice, y pasa sus ARN en `--storage-configuration` (`{"type":"S3_VECTORS","s3VectorsConfiguration":{"indexArn":"…"}}`). La consola lo hace con *Quick create*.
- **La ingesta tarda**: consulta `aws bedrock-agent get-ingestion-job` hasta ver `COMPLETE`.

```python norun
import boto3

rt = boto3.client("bedrock-agent-runtime", region_name="us-east-1")
resp = rt.retrieve_and_generate(
    input={"text": "¿Cuántos días tengo para devolver un producto?"},
    retrieveAndGenerateConfiguration={
        "type": "KNOWLEDGE_BASE",
        "knowledgeBaseConfiguration": {
            "knowledgeBaseId": "KB12345678",
            "modelArn": "arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.amazon.nova-pro-v1:0",
            "retrievalConfiguration": {"vectorSearchConfiguration": {
                "numberOfResults": 4,
                "filter": {"equals": {"key": "pais", "value": "AR"}},
            }},
            "generationConfiguration": {"guardrailConfiguration": {
                "guardrailId": "abc123", "guardrailVersion": "1"}},
        },
    },
)
print(resp["output"]["text"])
for c in resp["citations"]:
    for r in c["retrievedReferences"]:
        print("fuente:", r["location"]["s3Location"]["uri"])
```

## Limpieza

```bash norun
aws bedrock-agent delete-data-source --knowledge-base-id $KB --data-source-id $DS
aws bedrock-agent delete-knowledge-base --knowledge-base-id $KB
aws bedrock delete-guardrail --guardrail-identifier $GR
aws s3 rb s3://kb-politicas-lab --force
# si usaste S3 Vectors: borra el índice y el vector bucket
# si usaste OpenSearch Serverless: aws opensearchserverless delete-collection --id <id>
```

:::ejercicio cli
Limpieza en la terminal del curso: borra la Knowledge Base `$KB`.
```respuesta
aws bedrock-agent delete-knowledge-base --knowledge-base-id \$KB
```
```solucion
aws bedrock-agent delete-knowledge-base --knowledge-base-id $KB
```
```setup
aws bedrock-agent create-knowledge-base --name kb-politicas --role-arn arn:aws:iam::123456789012:role/rol-kb --knowledge-base-configuration '{"type":"VECTOR","vectorKnowledgeBaseConfiguration":{"embeddingModelArn":"arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v2:0"}}' --storage-configuration '{"type":"S3_VECTORS"}'
KB=$(aws bedrock-agent list-knowledge-bases --query "knowledgeBaseSummaries[?name=='kb-politicas'].knowledgeBaseId" --output text)
```
:::

:::ejercicio cli
Termina la limpieza: borra el guardrail `$GR` y el bucket `kb-politicas-lab` con todo su contenido.
```respuesta
todos: aws bedrock delete-guardrail --guardrail-identifier \$GR || aws s3 rb s3://kb-politicas-lab/? --force
aws s3 rb s3://kb-politicas-lab/? --force && aws bedrock delete-guardrail --guardrail-identifier \$GR
```
```solucion
aws bedrock delete-guardrail --guardrail-identifier $GR && aws s3 rb s3://kb-politicas-lab --force
```
```setup
aws s3 mb s3://kb-politicas-lab
aws bedrock create-guardrail --name gr-atencion --blocked-input-messaging "No puedo ayudar con eso." --blocked-outputs-messaging "No puedo responder eso." --topic-policy-config '{"topicsConfig":[{"name":"inversiones","definition":"Consejos sobre inversiones","examples":["en qué acciones invierto"],"type":"DENY"}]}'
GR=$(aws bedrock list-guardrails --query "guardrails[?name=='gr-atencion'].id" --output text)
```
:::

:::errores
- **Chunks demasiado grandes o demasiado chicos**: muy grandes y la búsqueda trae texto irrelevante; muy chicos y se pierde el contexto. Se ajusta probando preguntas reales.
- **No cargar metadatos** con los documentos: después no se puede filtrar por país, producto o fecha, y el asistente mezcla políticas de distintos lugares.
- **Olvidar volver a ingerir** después de cambiar documentos en S3: la Knowledge Base responde con la versión vieja.
- **Respuestas sin citas**: nadie puede verificar de dónde salió una respuesta, y los errores no se detectan.
- **Guardrails solo en la entrada**: también hay que revisar la salida (por ejemplo, para anonimizar datos personales en la respuesta).
- **Elegir un almacén vectorial con costo mínimo por hora** para un laboratorio: OpenSearch Serverless cobra aunque no se use.
:::

:::trabajo
- Un asistente RAG en producción se evalúa con un conjunto de preguntas y respuestas esperadas, y se mide si recupera el documento correcto y si la respuesta es fiel a él, antes y después de cada cambio.
- Los documentos fuente tienen dueño y fecha de vigencia; un pipeline los sincroniza con la base de conocimiento y avisa si un documento venció.
:::

:::entrevista "¿Cómo evitarías que un asistente RAG responda con información equivocada?"
Trabajaría la recuperación: buenos metadatos para filtrar, un tamaño de chunk probado con preguntas reales y, si hace falta, reordenamiento de resultados. Obligaría a responder con citas de los fragmentos recuperados y a decir "no lo sé" cuando no hay contexto suficiente. Agregaría guardrails en entrada y salida, y un conjunto de evaluación con preguntas reales que corra en cada cambio de documentos, chunking o modelo.
:::

## Preguntas de examen

:::ejercicio quiz
Un asistente de RAG atiende a clientes de varios países y cada uno solo debe ver las políticas de su país. ¿Qué es lo más simple y seguro?

- [ ] Una Knowledge Base distinta por país
- [x] Un atributo `pais` en los metadatos y un filtro en cada recuperación
- [ ] Pedirle al modelo en el prompt que ignore otros países
- [ ] Reentrenar el modelo de embeddings por país
```explicacion
El filtro por metadatos se aplica antes de la búsqueda vectorial. Las instrucciones en el prompt no garantizan nada.
```
:::

:::ejercicio quiz
La llamada `converse --model-id amazon.nova-pro-v1:0` devuelve `ValidationException: Invocation of model ID ... with on-demand throughput isn't supported`. ¿Qué haces?

- [ ] Comprar Provisioned Throughput
- [x] Invocar el perfil de inferencia, por ejemplo `us.amazon.nova-pro-v1:0`
- [ ] Cambiar de región a `eu-west-1`
- [ ] Usar `invoke-model` en lugar de `converse`
:::

:::ejercicio quiz
Hay que clasificar 400.000 reclamos acumulados del mes y la respuesta puede tardar hasta el día siguiente. ¿Qué opción es la más económica?

- [ ] Llamadas a `converse` en paralelo desde una Lambda
- [ ] Provisioned Throughput por un mes
- [x] Inferencia por lotes con un JSONL en S3
- [ ] Un endpoint de SageMaker con el mismo modelo
```explicacion
La inferencia por lotes de Bedrock cuesta alrededor de la mitad que bajo demanda y no tiene límites de solicitudes por minuto que administrar.
```
:::

:::ejercicio quiz
Quieres que el asistente siga respondiendo aunque el usuario incluya su correo, pero sin que el correo aparezca en la respuesta. ¿Qué acción configuras para `EMAIL`?

- [ ] `BLOCK`
- [x] `ANONYMIZE`
- [ ] Un tema denegado llamado "correo"
- [ ] Un filtro de contenido `MISCONDUCT`
:::
