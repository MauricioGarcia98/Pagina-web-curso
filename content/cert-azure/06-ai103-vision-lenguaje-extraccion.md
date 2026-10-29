---
titulo: AI-103 - visión, análisis de texto y extracción de información
nivel: Avanzado
duracion: 50
resumen: Los otros tres dominios de AI-103 - visión por computadora (análisis de imágenes, OCR, modelos personalizados y modelos multimodales), análisis de texto (sentimiento, entidades, PII, idioma, lenguaje conversacional, preguntas y respuestas, voz y traducción) y extracción de información (Document Intelligence y Content Understanding), y cómo elegir entre un servicio especializado y un modelo generativo.
objetivos: Elegir el servicio de visión adecuado para describir, leer o clasificar imágenes | Extraer sentimiento, entidades y datos personales de textos con Azure AI Language | Extraer campos de facturas, recetas y formularios con modelos precompilados o personalizados | Decidir entre un servicio especializado y un modelo multimodal generativo | Integrar estos servicios con autenticación segura y procesamiento por lotes
prerrequisitos: cert-azure-ai103-foundry-agentes
autoevaluacion: ¿Sabes qué servicio lee texto impreso y manuscrito de una imagen? | ¿Sabes detectar y ocultar datos personales en un texto? | ¿Sabes cuándo usar un modelo precompilado de Document Intelligence y cuándo uno personalizado? | ¿Sabes cuándo conviene un modelo multimodal en lugar de un servicio especializado? | ¿Sabes qué característica de visión tiene acceso restringido?
---

:::escenario
La cadena de farmacias recibe cada día 20.000 recetas escaneadas (algunas manuscritas), fotos de góndolas para controlar faltantes, reseñas de clientes y facturas de proveedores en PDF. Lucía debe automatizar: leer las recetas, detectar productos que faltan en las fotos, entender de qué se quejan los clientes sin guardar sus datos personales, y cargar las facturas en el ERP. Cada tarea tiene un servicio de Azure más adecuado, y elegirlo bien es lo que pregunta este 30–45 % del examen.
:::

## Servicio especializado o modelo generativo

Para muchas tareas hay dos caminos:

| | Servicio especializado (Vision, Language, Document Intelligence) | Modelo multimodal generativo (en Foundry) |
|---|---|---|
| Resultado | Estructurado y predecible (campos, etiquetas, puntajes de confianza) | Flexible, en lenguaje natural o JSON pedido en el prompt |
| Costo y latencia | Bajos y estables por documento o imagen | Mayores, según tokens |
| Ajuste | Modelos precompilados o entrenados con ejemplos etiquetados | Prompts y ejemplos |
| Ideal para | Volumen alto, formatos repetidos, auditoría (confianza por campo) | Casos variados, razonamiento sobre el contenido, prototipos |

La respuesta del examen suele seguir esta regla: **si existe un servicio o modelo precompilado para la tarea exacta, úsalo**; si la tarea requiere razonar o es muy variada, un modelo generativo multimodal.

## Visión por computadora

| Necesito… | Servicio |
|---|---|
| Describir una imagen, generar etiquetas, detectar objetos y personas, recortar inteligentemente | **Azure AI Vision**, análisis de imágenes (*Image Analysis*) |
| Leer texto impreso o **manuscrito** de fotos y documentos | **OCR** (*Read*) de Azure AI Vision, o Document Intelligence para documentos completos |
| Clasificar imágenes o detectar objetos propios (los productos de la góndola) | **Modelo personalizado** entrenado con imágenes etiquetadas (o un modelo multimodal con ejemplos) |
| Buscar imágenes por contenido | Embeddings multimodales (imagen y texto en el mismo espacio) y Azure AI Search |
| Analizar video (escenas, texto, objetos) | Video analysis / Content Understanding |
| Detectar y analizar rostros | **Face**, con **acceso restringido**: requiere solicitud y cumplir los principios de IA responsable de Microsoft; varias funciones de inferencia de atributos fueron retiradas |

```python norun
# Leer el texto de una receta escaneada (OCR) con Azure AI Vision, sin claves
from azure.ai.vision.imageanalysis import ImageAnalysisClient
from azure.ai.vision.imageanalysis.models import VisualFeatures
from azure.identity import DefaultAzureCredential

cliente = ImageAnalysisClient(endpoint="https://vision-farmacias.cognitiveservices.azure.com/",
                              credential=DefaultAzureCredential())
resultado = cliente.analyze_from_url(image_url=url_receta, visual_features=[VisualFeatures.READ])
for linea in resultado.read.blocks[0].lines:
    print(linea.text)
```

## Análisis de texto

**Azure AI Language** agrupa capacidades de lenguaje natural:

| Capacidad | Qué devuelve |
|---|---|
| **Análisis de sentimiento** y minería de opiniones | Positivo, negativo, neutro o mixto, por documento y por oración; opiniones sobre aspectos ("la atención" → negativa) |
| **Reconocimiento de entidades** (NER) | Personas, lugares, organizaciones, fechas, cantidades… |
| **Detección de PII** | Datos personales (nombres, teléfonos, documentos, emails) con su categoría, y el texto **redactado** (con los datos reemplazados) |
| **Frases clave** | Los temas principales |
| **Detección de idioma** | El idioma y la confianza |
| **Resumen** | Resumen extractivo o abstractivo |
| **Text Analytics for health** | Entidades médicas (medicamentos, dosis, diagnósticos) y sus relaciones |
| **Lenguaje conversacional (CLU)** | La **intención** y las **entidades** de un mensaje ("reservar turno" + fecha), entrenado con ejemplos propios |
| **Respuesta a preguntas personalizada** | Pares pregunta-respuesta a partir de preguntas frecuentes y documentos |

Y servicios relacionados:

- **Azure AI Speech**: voz a texto (transcripción en tiempo real o por lotes), texto a voz (voces neuronales), traducción de voz.
- **Azure AI Translator**: traducción de textos y de documentos completos, con glosarios.

```python norun
# Ocultar datos personales de las reseñas antes de analizarlas
from azure.ai.textanalytics import TextAnalyticsClient
cliente = TextAnalyticsClient(endpoint=endpoint_language, credential=DefaultAzureCredential())
for doc in cliente.recognize_pii_entities(["Soy Ana Pérez, mi teléfono es 11 5555 0000 y me atendieron mal."], language="es"):
    print(doc.redacted_text)        # "Soy *********, mi teléfono es ************ y me atendieron mal."
```

## Extracción de información

**Azure AI Document Intelligence** extrae texto, estructura y campos de documentos:

| Modelo | Qué hace |
|---|---|
| **Read** | Texto (impreso y manuscrito) e idioma |
| **Layout** | Texto, tablas, marcas de selección, títulos y estructura (también en Markdown, útil para RAG) |
| **Precompilados** | Facturas, recibos, documentos de identidad, tarjetas de presentación, formularios fiscales, contratos… con sus campos ya definidos (proveedor, total, fecha de vencimiento) y una **confianza** por campo |
| **Personalizados de plantilla** | Documentos con diseño fijo (un formulario propio), entrenados con pocos ejemplos etiquetados |
| **Personalizados neuronales** | Documentos con estructura variable (recetas de distintos médicos), más ejemplos |
| **Clasificador personalizado** | Identifica el tipo de documento antes de extraer |
| **Modelos compuestos** | Agrupan varios modelos personalizados y eligen el adecuado para cada documento |

**Azure Content Understanding** procesa contenido multimodal (documentos, imágenes, audio y video) y extrae campos definidos en un **esquema** propio usando modelos generativos, con resultados estructurados: es la opción para fuentes variadas o mezcla de formatos.

```diagrama
titulo: Facturas de proveedores al ERP
nodo f: Facturas PDF | icono=archivos | col=0 | fila=0
nodo c: Clasificador | icono=etiqueta | col=1 | fila=0 | sub=¿factura o remito? | color=amarillo
nodo di: Modelo precompilado\nde facturas | icono=documento | col=2 | fila=0 | sub=campos + confianza | color=azul
nodo r: ¿Confianza > 0,9? | col=3 | fila=0 | forma=rombo | color=naranja | ancho=190
nodo erp: ERP | icono=base | col=3 | fila=1 | forma=cilindro | color=verde
nodo h: Revisión humana | icono=usuario | col=2 | fila=1 | color=rojo
flecha f -> c
flecha c -> di
flecha di -> r
flecha r -> erp: sí
flecha r -> h: no
flecha h -> erp | estilo=punteada
```

:::examen Elegir el servicio
- "Extraer proveedor, fecha y total de facturas de distintos proveedores" → **Document Intelligence, modelo precompilado de facturas**.
- "Un formulario interno con diseño fijo" → **modelo personalizado de plantilla**.
- "Recetas manuscritas de distintos formatos" → **modelo personalizado neuronal** (o Content Understanding).
- "Saber si las reseñas son positivas y sobre qué aspecto se quejan" → **análisis de sentimiento con minería de opiniones**.
- "Quitar nombres y teléfonos de textos antes de guardarlos" → **detección de PII** con texto redactado.
- "Entender la intención de un mensaje para un bot" → **lenguaje conversacional (CLU)**.
- "Analizar rostros" → **Face**, con acceso restringido y revisión de IA responsable.
:::

:::errores
- **Usar un modelo generativo para extraer el total de 500.000 facturas iguales.** Síntoma: costo alto y resultados que varían. Corrección: modelo precompilado de facturas.
- **Confiar en todos los campos extraídos.** Síntoma: errores en el ERP. Corrección: umbral de confianza por campo y revisión humana de los dudosos.
- **Guardar reseñas con datos personales "para analizarlas después".** Síntoma: riesgo de cumplimiento. Corrección: redactar la PII al ingerir.
- **Entrenar un modelo personalizado cuando hay uno precompilado.** Síntoma: semanas de etiquetado innecesario. Corrección: probar primero el precompilado.
:::

## Ejercicios

:::ejercicio quiz
Hay que leer el texto de recetas escaneadas, muchas escritas a mano, para buscarlas después. ¿Qué capacidad usas?
- [ ] Análisis de sentimiento de Azure AI Language.
- [x] OCR (Read) de Azure AI Vision o el modelo Read de Document Intelligence.
- [ ] Detección de objetos de Azure AI Vision.
- [ ] Azure AI Translator.
```explicacion
Los modelos Read leen texto impreso y manuscrito de imágenes y documentos.
```
:::

:::ejercicio quiz
Los proveedores envían facturas con diseños distintos y hay que extraer proveedor, fecha, total e impuestos con la menor configuración posible. ¿Qué usas?
- [ ] Un modelo personalizado de plantilla entrenado con una factura de cada proveedor.
- [x] El modelo precompilado de facturas de Document Intelligence.
- [ ] Un modelo de clasificación de imágenes personalizado.
- [ ] El reconocimiento de entidades de Azure AI Language.
```explicacion
El modelo precompilado de facturas ya conoce esos campos en diseños variados, sin entrenamiento.
```
:::

:::ejercicio quiz
Antes de guardar los comentarios del chat de atención, hay que reemplazar nombres, teléfonos y documentos por asteriscos. ¿Qué capacidad usas?
- [ ] Extracción de frases clave.
- [x] Detección de PII, que devuelve el texto redactado.
- [ ] Detección de idioma.
- [ ] Análisis de sentimiento.
```explicacion
La detección de PII identifica los datos personales y devuelve una versión del texto con esos datos ocultos.
```
:::

:::ejercicio quiz
Un bot debe entender si un cliente quiere "reservar un turno", "cancelar un turno" o "consultar un precio", y extraer la fecha y el producto. ¿Qué usas?
- [ ] Respuesta a preguntas personalizada.
- [x] Lenguaje conversacional (CLU) con intenciones y entidades propias.
- [ ] Análisis de sentimiento con minería de opiniones.
- [ ] Azure AI Translator.
```explicacion
CLU se entrena con ejemplos para reconocer intenciones y entidades del dominio. La respuesta a preguntas devuelve respuestas fijas, no intenciones.
```
:::

:::ejercicio quiz
Un formulario de alta de proveedores tiene siempre el mismo diseño, y no existe un modelo precompilado para él. ¿Qué modelo de Document Intelligence entrenas?
- [x] Un modelo personalizado de plantilla.
- [ ] Un modelo personalizado neuronal con miles de ejemplos.
- [ ] El modelo precompilado de recibos.
- [ ] Un clasificador personalizado solamente.
```explicacion
Para documentos de diseño fijo, el modelo de plantilla aprende con pocos ejemplos etiquetados. El neuronal es para documentos de estructura variable.
```
:::

:::ejercicio quiz
Hay que procesar documentos, imágenes y audios de reclamos y extraer en todos los mismos campos (producto, problema, gravedad) en un esquema propio. ¿Qué servicio se ajusta mejor?
- [ ] Azure AI Vision, análisis de imágenes.
- [ ] El modelo Layout de Document Intelligence.
- [x] Azure Content Understanding con un esquema de campos propio.
- [ ] La detección de idioma de Azure AI Language.
```explicacion
Content Understanding procesa contenido multimodal y extrae campos definidos en un esquema propio con resultados estructurados.
```
:::
