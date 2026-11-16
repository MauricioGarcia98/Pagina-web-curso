# examen: cert-gcp
# id: gcp-genai-leader
# titulo: Google Cloud Generative AI Leader

## Modelo fundacional
leccion: cert-gcp-genai-leader
dominio: 1
¿Qué es un modelo fundacional?
- [ ] Un modelo entrenado solo para una tarea específica de la empresa.
- [x] Un modelo grande entrenado con datos amplios que se adapta a muchas tareas.
- [ ] Una base de datos de documentos de la empresa.
- [ ] Un conjunto de reglas escritas por expertos.
porque: Los modelos fundacionales se preentrenan con datos masivos y se adaptan a muchas tareas.

## Alucinación
leccion: cert-gcp-genai-leader
dominio: 1
Un asistente cita una política de devoluciones que no existe. ¿Cómo se llama ese problema?
- [ ] Sobreajuste.
- [x] Alucinación.
- [ ] Deriva de datos.
- [ ] Latencia.
porque: Una alucinación es una respuesta plausible pero falsa.

## Multimodal
leccion: cert-gcp-genai-leader
dominio: 1
Un caso requiere entender fotos de productos y su descripción en texto a la vez. ¿Qué tipo de modelo se necesita?
- [ ] Un modelo de regresión entrenado con las ventas de cada producto.
- [x] Un modelo multimodal como Gemini.
- [ ] Un modelo de clustering que agrupe los productos por similitud de precio.
- [ ] Un modelo solo de texto al que se le pasa el nombre del archivo de la foto.
porque: Los modelos multimodales procesan texto, imágenes, audio y video juntos.

## Gemini Enterprise
leccion: cert-gcp-genai-leader
dominio: 2
Los empleados quieren buscar y obtener respuestas sobre Drive, SharePoint y Jira desde un solo asistente, sin desarrollo. ¿Qué producto se recomienda?
- [ ] Model Garden.
- [x] Gemini Enterprise.
- [ ] Agent Development Kit.
- [ ] BigQuery ML.
porque: Gemini Enterprise conecta las fuentes de la empresa y ofrece un asistente y agentes listos para usar.

## Model Garden
leccion: cert-gcp-genai-leader
dominio: 2
El equipo quiere comparar Gemini con modelos de terceros y abiertos dentro de Google Cloud. ¿Dónde los encuentra?
- [ ] En NotebookLM.
- [x] En Model Garden.
- [ ] En Google Workspace.
- [ ] En Cloud Storage.
porque: Model Garden reúne modelos de Google, de terceros y abiertos.

## Desarrollar agentes
leccion: cert-gcp-genai-leader
dominio: 2
Los desarrolladores quieren construir un agente propio con herramientas y desplegarlo de forma administrada. ¿Qué usan?
- [ ] Gemini en Gmail.
- [x] Agent Development Kit y Agent Engine.
- [ ] Looker Studio.
- [ ] NotebookLM.
porque: ADK sirve para construir agentes y Agent Engine para desplegarlos y operarlos.

## NotebookLM
leccion: cert-gcp-genai-leader
dominio: 2
Una analista quiere hacer preguntas sobre 30 informes propios y obtener respuestas con citas, sin desarrollo. ¿Qué usa?
- [ ] Model Garden.
- [x] NotebookLM.
- [ ] Agent Engine.
- [ ] Cloud Run.
porque: NotebookLM responde y resume sobre las fuentes cargadas, citándolas.

## Grounding
leccion: cert-gcp-genai-leader
dominio: 3
Un asistente responde con información desactualizada sobre noticias recientes. ¿Qué técnica lo mejora?
- [ ] Bajar la temperatura.
- [x] Grounding con Google Search.
- [ ] Reducir la longitud máxima.
- [ ] Usar un modelo más chico.
porque: El grounding basa la respuesta en fuentes actuales y verificables.

## Orden de técnicas
leccion: cert-gcp-genai-leader
dominio: 3
¿En qué orden conviene probar técnicas para mejorar las respuestas de un modelo?
- [ ] Ajuste, después RAG, después prompts.
- [x] Prompts, después grounding o RAG, y ajuste solo si hace falta.
- [ ] RAG, después preentrenamiento, después prompts.
- [ ] Siempre ajuste primero.
porque: Las técnicas más baratas y rápidas van primero; el ajuste se reserva para cuando no alcanzan.

## Temperatura
leccion: cert-gcp-genai-leader
dominio: 3
Marketing quiere ideas de campañas más variadas. ¿Qué parámetro se ajusta?
- [ ] Se baja la temperatura.
- [x] Se sube la temperatura.
- [ ] Se baja la longitud máxima.
- [ ] Se agregan secuencias de parada.
porque: Una temperatura más alta produce respuestas más diversas.

## Piloto
leccion: cert-gcp-genai-leader
dominio: 4
¿Qué caso de uso es mejor para un primer piloto de IA generativa?
- [ ] Decisiones automáticas de crédito sin revisión humana.
- [x] Resumir reclamos de clientes para los agentes, con revisión humana.
- [ ] Reemplazar todo el sistema de facturación.
- [ ] Diagnósticos médicos sin supervisión.
porque: Un buen piloto aporta valor medible con riesgo controlado y humano en el circuito.

## Métricas
leccion: cert-gcp-genai-leader
dominio: 4
¿Qué métrica muestra mejor el valor de un asistente para agentes de soporte?
- [ ] La cantidad de tokens consumidos por mes, comparada con el presupuesto de la nube.
- [x] El tiempo de resolución y la satisfacción del cliente.
- [ ] El número de modelos distintos que el equipo probó durante el desarrollo.
- [ ] La temperatura promedio configurada en las solicitudes del asistente.
porque: Las métricas de negocio (productividad y calidad) reflejan el valor real.

## Seguridad
leccion: cert-gcp-genai-leader
dominio: 4
¿Qué marco de Google guía la seguridad de los sistemas de IA?
- [ ] ITIL, el marco de gestión de servicios de tecnología de la información.
- [x] Secure AI Framework (SAIF).
- [ ] COBIT, el marco de gobierno y control de tecnología de la información.
- [ ] Scrum, el marco ágil para organizar el desarrollo de productos en sprints.
porque: SAIF es el marco de Google para proteger sistemas de IA.

## Datos del cliente
leccion: cert-gcp-genai-leader
dominio: 4
Legales pregunta si los prompts de la empresa se usan para entrenar los modelos de Google en la plataforma empresarial. ¿Qué responde?
- [ ] Sí, siempre se usan para mejorar Gemini.
- [x] No: los datos de los clientes no se usan para entrenar los modelos de Google sin permiso.
- [ ] Solo si se usa la temperatura alta.
- [ ] Solo los prompts en inglés.
porque: En Google Cloud, los datos de los clientes no se usan para entrenar los modelos sin su consentimiento.

## IA responsable
leccion: cert-gcp-genai-leader
dominio: 4
Un asistente de selección de personal da peores recomendaciones a ciertos grupos. ¿Qué principio se viola?
- [ ] Escalabilidad.
- [x] Equidad.
- [ ] Latencia.
- [ ] Portabilidad.
porque: La equidad exige evitar resultados injustos para grupos de personas.

## @caso aseguradora: Aseguradora Cordillera
Aseguradora Cordillera tiene 2.000 empleados y quiere adoptar IA generativa. El directorio pidió un plan para:
- que los empleados encuentren respuestas en manuales, correos y planillas repartidos en Drive y SharePoint;
- acelerar la atención de siniestros, donde los peritos escriben informes largos a partir de fotos y notas;
- lanzar en 6 meses un asistente para clientes en la web.

El directorio teme filtraciones de datos de clientes, respuestas inventadas y un gasto sin control.

## Buscar en documentos internos
leccion: cert-gcp-genai-leader
dominio: 2
caso: aseguradora
¿Qué producto resuelve más rápido la búsqueda interna sobre Drive y SharePoint?
- [ ] Un modelo propio entrenado desde cero con todos los documentos de la empresa.
- [x] Gemini Enterprise, con conectores a esas fuentes y respeto de permisos.
- [ ] BigQuery ML.
- [ ] Imagen.
porque: Gemini Enterprise conecta fuentes de la empresa y responde respetando los permisos de cada usuario.

## Informes de siniestros
leccion: cert-gcp-genai-leader
dominio: 2
caso: aseguradora
Los peritos quieren un borrador de informe a partir de fotos y notas. ¿Qué capacidad del modelo es clave?
- [ ] Un modelo solo de texto, al que se le describen las fotos por escrito antes de cada informe.
- [x] Un modelo multimodal como Gemini, que entiende imágenes y texto.
- [ ] Un modelo de embeddings.
- [ ] Un modelo de clustering.
porque: Los modelos multimodales procesan fotos y texto juntos para generar el borrador.

## Respuestas inventadas
leccion: cert-gcp-genai-leader
dominio: 3
caso: aseguradora
¿Qué técnica reduce que el asistente para clientes invente condiciones de pólizas?
- [ ] Aumentar la temperatura para que el modelo explore más respuestas posibles.
- [x] Grounding en las condiciones de pólizas vigentes, con citas.
- [ ] Usar el modelo más chico.
- [ ] Quitar el prompt de sistema.
porque: El grounding basa las respuestas en fuentes verificables de la empresa.

## Miedo a filtraciones
leccion: cert-gcp-genai-leader
dominio: 4
caso: aseguradora
¿Qué dos medidas responden al temor de filtración de datos de clientes?
- [x] Controles de acceso (IAM) y protección de datos sensibles en entradas y salidas (por ejemplo, Model Armor).
- [x] Usar servicios empresariales donde los datos no se usan para entrenar los modelos de Google.
- [ ] Publicar los prompts en un sitio público.
- [ ] Permitir que cualquier empleado use cualquier herramienta externa.
- [ ] Desactivar los registros de auditoría.
porque: El acceso controlado, la protección de datos sensibles y los compromisos de privacidad de la nube reducen el riesgo.

## IA, ML y aprendizaje profundo
leccion: cert-gcp-genai-leader
dominio: 1
¿Cuál es la relación correcta entre estos conceptos?
- [ ] El ML incluye a la IA, y la IA incluye al aprendizaje profundo y a la IA generativa.
- [x] La IA incluye al ML; el ML incluye al aprendizaje profundo; la IA generativa usa aprendizaje profundo.
- [ ] Son sinónimos.
- [ ] La IA generativa no usa ML.
porque: Cada concepto es un subconjunto del anterior; los modelos generativos son redes profundas.

## LLM
leccion: cert-gcp-genai-leader
dominio: 1
¿Qué es un modelo de lenguaje grande (LLM)?
- [ ] Una base de datos que guarda todas las respuestas posibles a las preguntas de los usuarios.
- [x] Un modelo entrenado con grandes cantidades de texto que genera texto prediciendo el siguiente token.
- [ ] Un buscador de páginas web.
- [ ] Un sistema de reglas.
porque: Los LLM aprenden patrones del lenguaje y generan texto token a token.

## Datos no estructurados
leccion: cert-gcp-genai-leader
dominio: 1
¿Cuál es un ejemplo de datos no estructurados?
- [ ] Una tabla de BigQuery con columnas de fecha, monto y número de póliza.
- [x] Correos, fotos de siniestros y grabaciones de llamadas.
- [ ] Un archivo CSV con encabezados.
- [ ] Una planilla con fórmulas.
porque: Los datos no estructurados no siguen un esquema de filas y columnas.

## Datos etiquetados
leccion: cert-gcp-genai-leader
dominio: 1
Una aseguradora tiene 50.000 siniestros marcados como "fraude" o "no fraude". ¿Qué tipo de datos son?
- [ ] Datos no etiquetados, porque no indican el monto exacto del siniestro.
- [x] Datos etiquetados, útiles para aprendizaje supervisado.
- [ ] Datos sintéticos.
- [ ] Datos de streaming.
porque: Las etiquetas indican la respuesta correcta para cada ejemplo.

## Aprendizaje supervisado
leccion: cert-gcp-genai-leader
dominio: 1
Predecir si un siniestro es fraude a partir de ejemplos etiquetados es un caso de:
- [ ] Aprendizaje no supervisado, porque el modelo descubre grupos de siniestros.
- [x] Aprendizaje supervisado.
- [ ] Aprendizaje por refuerzo.
- [ ] IA generativa.
porque: El aprendizaje supervisado aprende de ejemplos con la respuesta conocida.

## Prompt
leccion: cert-gcp-genai-leader
dominio: 1
¿Qué es un prompt?
- [ ] El código fuente del modelo que define cómo se entrena con los datos.
- [x] La instrucción o entrada que se le da al modelo para obtener una respuesta.
- [ ] La factura del servicio.
- [ ] Un tipo de base de datos.
porque: El prompt es el texto (y otros datos) con el que se le pide algo al modelo.

## Tokens
leccion: cert-gcp-genai-leader
dominio: 1
¿Por qué importa la cantidad de tokens al usar un modelo?
- [ ] Porque cada token es una palabra completa y define el idioma de la respuesta.
- [x] Porque determina el costo y si la entrada entra en la ventana de contexto.
- [ ] Porque cambia el color de la interfaz.
- [ ] Porque cifra la respuesta.
porque: Los modelos se cobran y limitan por tokens de entrada y salida.

## Limitaciones
leccion: cert-gcp-genai-leader
dominio: 1
¿Qué dos son limitaciones conocidas de los modelos generativos?
- [x] Pueden generar respuestas falsas con seguridad (alucinaciones).
- [x] Su conocimiento tiene una fecha de corte.
- [ ] Nunca cometen errores de cálculo.
- [ ] No necesitan datos para entrenarse.
- [ ] Siempre son imparciales.
porque: Los modelos pueden alucinar, no conocen hechos posteriores a su entrenamiento y pueden tener sesgos.

## Ciclo de vida del ML
leccion: cert-gcp-genai-leader
dominio: 1
¿Qué etapa sigue después de desplegar un modelo en producción?
- [ ] Ninguna: una vez desplegado, el modelo funciona igual para siempre.
- [x] Monitorearlo y mantenerlo (reentrenar o ajustar cuando empeora).
- [ ] Borrar los datos.
- [ ] Cambiar de proveedor.
porque: Los modelos se degradan con el tiempo y requieren monitoreo y mantenimiento.

## Modelos fundacionales
leccion: cert-gcp-genai-leader
dominio: 1
¿Qué ventaja principal tiene un modelo fundacional para una empresa?
- [ ] Que no necesita ningún tipo de instrucción para resolver tareas de la empresa.
- [x] Que sirve para muchas tareas sin entrenar un modelo nuevo para cada una.
- [ ] Que es gratuito.
- [ ] Que no puede equivocarse.
porque: Los modelos fundacionales se adaptan a muchas tareas con prompts, grounding o ajuste.

## Sesgo
leccion: cert-gcp-genai-leader
dominio: 1
¿De dónde suele venir el sesgo de un modelo?
- [ ] Del tipo de procesador en el que se ejecuta el modelo al responder.
- [x] De datos de entrenamiento que no representan bien a todos los grupos.
- [ ] De la temperatura.
- [ ] Del idioma de la interfaz.
porque: Los datos desbalanceados o con prejuicios se reflejan en las respuestas del modelo.

## Agentes
leccion: cert-gcp-genai-leader
dominio: 1
¿Qué distingue a un agente de IA de un chatbot que solo responde?
- [ ] Que el agente no usa un modelo de lenguaje para entender las preguntas.
- [x] Que razona, planifica y usa herramientas para completar tareas.
- [ ] Que solo responde con texto predefinido.
- [ ] Que no puede acceder a datos.
porque: Los agentes combinan un modelo con herramientas y memoria para actuar.

## Gemini Flash o Pro
leccion: cert-gcp-genai-leader
dominio: 2
Un asistente de alto volumen necesita respuestas rápidas y baratas a preguntas simples. ¿Qué modelo eliges?
- [ ] Gemini Pro, porque siempre da las mejores respuestas para cualquier tipo de pregunta.
- [x] Gemini Flash (o Flash-Lite).
- [ ] Imagen.
- [ ] Veo.
porque: Flash prioriza velocidad y costo; Pro conviene para razonamiento complejo.

## Imágenes
leccion: cert-gcp-genai-leader
dominio: 2
Marketing quiere generar imágenes para campañas a partir de descripciones. ¿Qué modelo de Google usa?
- [ ] Gemini Flash-Lite, que genera imágenes en alta resolución desde texto.
- [x] Imagen.
- [ ] Chirp.
- [ ] Veo.
porque: Imagen genera y edita imágenes a partir de texto.

## Video
leccion: cert-gcp-genai-leader
dominio: 2
¿Qué modelo de Google genera videos a partir de texto o imágenes?
- [ ] Imagen, que también arma videos con una secuencia de imágenes generadas.
- [x] Veo.
- [ ] Chirp.
- [ ] Gemma.
porque: Veo es el modelo de generación de video de Google.

## Modelos abiertos
leccion: cert-gcp-genai-leader
dominio: 2
La empresa quiere un modelo abierto que pueda ejecutar en su propia infraestructura. ¿Qué familia de Google es abierta?
- [ ] Gemini Pro, que se puede descargar y ejecutar en cualquier servidor.
- [x] Gemma.
- [ ] Imagen.
- [ ] Veo.
porque: Gemma es la familia de modelos abiertos de Google.

## Plataforma de IA
leccion: cert-gcp-genai-leader
dominio: 2
Los desarrolladores necesitan construir, evaluar, ajustar y desplegar modelos y agentes en Google Cloud. ¿Qué plataforma usan?
- [ ] Google Workspace, con Gemini integrado en Docs y Gmail.
- [x] Gemini Enterprise Agent Platform (antes Vertex AI).
- [ ] NotebookLM.
- [ ] Looker Studio.
porque: La plataforma de agentes reúne modelos, ajuste, evaluación, despliegue y agentes.

## Gemini en Workspace
leccion: cert-gcp-genai-leader
dominio: 2
Los empleados quieren ayuda para redactar correos y resumir reuniones dentro de las herramientas que ya usan. ¿Qué producto es?
- [ ] Gemini Enterprise Agent Platform, con un agente desarrollado para cada equipo.
- [x] Gemini en Google Workspace.
- [ ] Model Garden.
- [ ] Imagen.
porque: Gemini en Workspace agrega IA en Gmail, Docs, Sheets y Meet.

## Atención al cliente
leccion: cert-gcp-genai-leader
dominio: 2
¿Qué oferta de Google Cloud está pensada para agentes de atención al cliente en canales de voz y chat?
- [ ] NotebookLM, compartido con los clientes a través de un enlace público.
- [x] Customer Engagement Suite (agentes conversacionales para contact center).
- [ ] Gemini Code Assist.
- [ ] BigQuery.
porque: Customer Engagement Suite ofrece agentes virtuales y asistencia a agentes humanos.

## Asistencia para programar
leccion: cert-gcp-genai-leader
dominio: 2
El equipo de desarrollo quiere sugerencias de código y explicación de funciones en su IDE. ¿Qué producto usa?
- [ ] Gemini en Gmail, con los fragmentos de código enviados por correo.
- [x] Gemini Code Assist.
- [ ] Imagen.
- [ ] Customer Engagement Suite.
porque: Gemini Code Assist ofrece completado, generación y explicación de código.

## Operar la nube
leccion: cert-gcp-genai-leader
dominio: 2
El equipo de operaciones quiere ayuda en lenguaje natural para diagnosticar problemas de su infraestructura en Google Cloud. ¿Qué producto usa?
- [ ] Gemini Code Assist, desde el editor de código de cada ingeniero.
- [x] Gemini Cloud Assist.
- [ ] Imagen.
- [ ] Gemma.
porque: Gemini Cloud Assist ayuda a diseñar, operar y diagnosticar recursos de Google Cloud.

## Agentes sin código
leccion: cert-gcp-genai-leader
dominio: 2
Un área de negocio quiere crear su propio agente simple sin programar. ¿Qué opción ofrece Gemini Enterprise?
- [ ] Escribir el agente en Python con el Agent Development Kit y desplegarlo en Agent Engine.
- [x] Un diseñador de agentes sin código (Agent Designer).
- [ ] BigQuery ML.
- [ ] Looker Studio.
porque: Gemini Enterprise incluye herramientas para crear agentes sin escribir código.

## Infraestructura
leccion: cert-gcp-genai-leader
dominio: 2
¿Qué hardware diseñado por Google acelera el entrenamiento y la inferencia de modelos de IA?
- [ ] Discos persistentes de alta velocidad conectados a cada máquina virtual.
- [x] TPU (Tensor Processing Units).
- [ ] Routers de red.
- [ ] Tarjetas de sonido.
porque: Las TPU son aceleradores diseñados por Google para cargas de IA.

## Investigar documentos
leccion: cert-gcp-genai-leader
dominio: 2
Un analista quiere subir 20 informes y obtener resúmenes y respuestas con citas, e incluso un resumen en audio. ¿Qué usa?
- [ ] Model Garden, con un modelo desplegado para cada informe del analista.
- [x] NotebookLM.
- [ ] Gemini Code Assist.
- [ ] Imagen.
porque: NotebookLM trabaja sobre las fuentes cargadas, con citas y resúmenes en audio.

## Protocolos de agentes
leccion: cert-gcp-genai-leader
dominio: 2
¿Qué dos protocolos abiertos facilitan que los agentes usen herramientas y colaboren entre sí?
- [x] MCP (Model Context Protocol).
- [x] A2A (Agent2Agent).
- [ ] FTP.
- [ ] SMTP.
- [ ] HTTP sin autenticación.
porque: MCP conecta agentes con herramientas y A2A permite la comunicación entre agentes.

## Búsqueda empresarial
leccion: cert-gcp-genai-leader
dominio: 2
¿Qué ventaja tiene que el asistente empresarial respete los permisos de origen de cada documento?
- [ ] Que el asistente responde más rápido porque lee menos documentos.
- [x] Que cada empleado solo obtiene respuestas de documentos que ya puede ver.
- [ ] Que no hace falta autenticación.
- [ ] Que los documentos se vuelven públicos.
porque: Respetar los permisos de origen evita exponer información a quien no corresponde.

## Few-shot
leccion: cert-gcp-genai-leader
dominio: 3
Incluir en el prompt tres ejemplos de respuestas bien escritas para guiar al modelo es:
- [ ] Ajuste fino del modelo con un conjunto chico de ejemplos.
- [x] Prompting few-shot.
- [ ] Grounding con Google Search.
- [ ] RAG.
porque: Few-shot da ejemplos en el prompt sin modificar el modelo.

## Rol en el prompt
leccion: cert-gcp-genai-leader
dominio: 3
Comenzar el prompt con "Eres un perito de seguros con 20 años de experiencia" es un ejemplo de:
- [ ] Ajuste supervisado, porque cambia el comportamiento del modelo de forma permanente.
- [x] Asignar un rol (role prompting) para orientar el tono y el enfoque.
- [ ] Grounding.
- [ ] Destilación.
porque: Indicar un rol orienta el estilo y el nivel de detalle de la respuesta.

## Cadena de pensamiento
leccion: cert-gcp-genai-leader
dominio: 3
¿Qué técnica mejora problemas de varios pasos pidiéndole al modelo que razone paso a paso?
- [ ] Bajar la longitud máxima de la respuesta a pocas palabras.
- [x] Chain-of-thought (cadena de pensamiento).
- [ ] Usar Imagen.
- [ ] Desactivar el grounding.
porque: Pedir el razonamiento intermedio suele mejorar la precisión en tareas complejas.

## Grounding con datos propios
leccion: cert-gcp-genai-leader
dominio: 3
¿Qué hace el grounding con datos de la empresa?
- [ ] Reentrena el modelo cada noche con los documentos nuevos de la empresa.
- [x] Recupera información relevante de las fuentes de la empresa y la usa para responder.
- [ ] Traduce las respuestas.
- [ ] Cifra los datos.
porque: El grounding (por ejemplo, con RAG) aporta contexto actualizado en cada respuesta.

## Ajuste fino
leccion: cert-gcp-genai-leader
dominio: 3
¿Cuándo conviene ajustar (fine-tuning) un modelo?
- [ ] Siempre como primer paso, antes de probar prompts o grounding.
- [x] Cuando hay que lograr un estilo o formato muy específico que el prompting no consigue.
- [ ] Para que el modelo conozca noticias de hoy.
- [ ] Para reducir el costo de almacenamiento.
porque: El ajuste cambia el comportamiento; para datos actuales conviene el grounding.

## Humano en el circuito
leccion: cert-gcp-genai-leader
dominio: 3
¿Cuándo es especialmente importante que una persona revise la salida del modelo?
- [ ] Cuando la respuesta es corta y fácil de leer para el usuario final.
- [x] En decisiones de alto impacto, como rechazar un siniestro.
- [ ] Nunca: los modelos no se equivocan.
- [ ] Solo en preguntas sobre el clima.
porque: La revisión humana reduce riesgos en decisiones con consecuencias importantes.

## Temperatura baja
leccion: cert-gcp-genai-leader
dominio: 3
Un asistente que extrae datos de pólizas debe dar siempre la misma respuesta. ¿Cómo configuras la temperatura?
- [ ] Alta, para que el modelo considere más alternativas en cada respuesta.
- [x] Baja.
- [ ] No influye.
- [ ] Máxima.
porque: Una temperatura baja hace las respuestas más deterministas y consistentes.

## Evaluar respuestas
leccion: cert-gcp-genai-leader
dominio: 3
¿Cómo sabes si un cambio de prompt mejoró el asistente?
- [ ] Preguntándole al propio modelo si su nueva respuesta es mejor que la anterior.
- [x] Comparando ambas versiones con un conjunto de preguntas de prueba y criterios definidos.
- [ ] Mirando si la respuesta es más larga.
- [ ] Contando los usuarios activos.
porque: Una evaluación con casos y criterios definidos permite comparar versiones objetivamente.

## Patrocinio
leccion: cert-gcp-genai-leader
dominio: 4
¿Qué factor organizacional aumenta las chances de éxito de un proyecto de IA generativa?
- [ ] Que el área de tecnología lo lleve adelante sin involucrar a las áreas de negocio.
- [x] Patrocinio ejecutivo y objetivos de negocio claros y medibles.
- [ ] Elegir el modelo más grande.
- [ ] Evitar capacitar a los empleados.
porque: El apoyo de la dirección y objetivos claros alinean recursos y miden el valor.

## Gestión del cambio
leccion: cert-gcp-genai-leader
dominio: 4
Los empleados no usan el asistente aunque funciona bien. ¿Qué ayuda?
- [ ] Cambiar el modelo por uno más nuevo, aunque las respuestas ya sean correctas.
- [x] Capacitación, comunicación de beneficios y referentes en cada área.
- [ ] Desactivarlo.
- [ ] Subir la temperatura.
porque: La adopción depende de la gestión del cambio, no solo de la tecnología.

## Costo previsible
leccion: cert-gcp-genai-leader
dominio: 4
¿Qué práctica ayuda a controlar el gasto de IA generativa?
- [ ] Usar siempre el modelo más capaz disponible para todas las tareas de la empresa.
- [x] Elegir el modelo más chico que cumpla, monitorear el uso y fijar presupuestos y alertas.
- [ ] No medir el consumo.
- [ ] Permitir uso ilimitado a todos.
porque: Dimensionar el modelo y monitorear el uso evitan sorpresas en la factura.

## Responsabilidad
leccion: cert-gcp-genai-leader
dominio: 4
¿Qué incluye un enfoque de IA responsable en la empresa?
- [ ] Usar IA en todos los procesos lo antes posible, sin revisar sus resultados.
- [x] Evaluar riesgos, revisar sesgos, ser transparente con los usuarios y definir responsables.
- [ ] Ocultar que se usa IA.
- [ ] Eliminar la revisión humana.
porque: La IA responsable combina evaluación de riesgos, equidad, transparencia y gobierno.

## Embeddings
leccion: cert-gcp-genai-leader
dominio: 1
En una búsqueda semántica, ¿qué es un embedding?
- [ ] Una copia comprimida del documento original guardada como imagen.
- [x] Un vector de números que representa el significado de un texto, de modo que textos parecidos quedan cerca.
- [ ] Una lista de palabras prohibidas que el modelo no puede usar.
- [ ] La contraseña que protege el acceso al modelo.
porque: Los embeddings convierten contenido en vectores; la distancia entre vectores mide la similitud de significado.

## Ventana de contexto
leccion: cert-gcp-genai-leader
dominio: 1
¿Qué limita la ventana de contexto de un modelo?
- [ ] La cantidad de usuarios que pueden usar el modelo a la vez en la empresa.
- [x] Cuántos tokens de entrada y salida puede considerar el modelo en una misma interacción.
- [ ] El número de idiomas distintos que el modelo es capaz de entender y de usar al responder a los usuarios.
- [ ] Cuántos días se guardan las conversaciones en el historial.
porque: Todo lo que el modelo "ve" (instrucciones, documentos, historial y respuesta) debe entrar en su ventana de contexto, medida en tokens.

## Aprendizaje no supervisado
leccion: cert-gcp-genai-leader
dominio: 1
¿Cuál es un ejemplo de aprendizaje no supervisado?
- [ ] Predecir si un cliente se dará de baja a partir de casos históricos ya marcados.
- [x] Agrupar clientes por comportamiento parecido sin etiquetas previas.
- [ ] Clasificar correos como spam usando miles de correos etiquetados.
- [ ] Estimar el precio de una casa a partir de ventas anteriores con precio conocido.
porque: En el aprendizaje no supervisado no hay etiquetas: el modelo encuentra estructura, como grupos, por su cuenta.

## IA generativa o predictiva
leccion: cert-gcp-genai-leader
dominio: 1
Una empresa quiere estimar cuántas unidades venderá el mes próximo. ¿Qué tipo de IA encaja mejor?
- [ ] IA generativa, porque puede escribir un informe largo sobre las ventas.
- [x] Un modelo predictivo de ML (pronóstico) entrenado con el historial de ventas.
- [ ] Un modelo de generación de imágenes con fotos de los productos.
- [ ] Ninguna: los pronósticos no se pueden hacer con IA.
porque: La IA generativa crea contenido nuevo; para estimar un número a partir de historia se usa ML predictivo.

## Calidad de los datos
leccion: cert-gcp-genai-leader
dominio: 1
El equipo conecta un asistente a documentos internos desactualizados y contradictorios. ¿Qué es lo más probable?
- [ ] Que el modelo detecte solo cuál es la versión correcta de cada documento.
- [x] Que las respuestas hereden los errores y contradicciones de esos documentos.
- [ ] Que el modelo deje de funcionar hasta que se borren los documentos.
- [ ] Que las respuestas mejoren porque hay más información disponible.
porque: La calidad de la respuesta depende de la calidad de los datos con los que se fundamenta: datos malos dan respuestas malas.

## Top-p
leccion: cert-gcp-genai-leader
dominio: 3
¿Qué controla el parámetro top-p al generar texto?
- [ ] La cantidad máxima de respuestas que se generan en paralelo.
- [x] Que el modelo elija solo entre los tokens más probables cuya probabilidad acumulada llega a p.
- [ ] El idioma en que el modelo escribe la respuesta, según el país desde donde llega cada pedido del usuario.
- [ ] El tiempo máximo que puede tardar el modelo en responder.
porque: Top-p (muestreo por núcleo) recorta las opciones a las más probables; junto con la temperatura regula la variedad de la salida.

## Límite de salida
leccion: cert-gcp-genai-leader
dominio: 3
Las respuestas de un asistente se cortan a mitad de oración. ¿Qué parámetro revisas?
- [ ] La temperatura, que está demasiado baja.
- [x] El máximo de tokens de salida.
- [ ] El top-k, que limita los idiomas disponibles.
- [ ] La región donde está desplegado el modelo.
porque: Si la respuesta supera el máximo de tokens de salida configurado, el modelo la corta.

## Zero-shot
leccion: cert-gcp-genai-leader
dominio: 3
Un prompt pide "clasifica este reclamo como facturación, envío u otro" sin dar ejemplos. ¿Cómo se llama esa técnica?
- [ ] Few-shot, porque hay tres categorías posibles.
- [x] Zero-shot.
- [ ] Ajuste fino supervisado.
- [ ] Cadena de pensamiento.
porque: Zero-shot pide la tarea sin ejemplos; few-shot incluye algunos ejemplos en el prompt.

## Encadenar prompts
leccion: cert-gcp-genai-leader
dominio: 3
Una tarea compleja (resumir un contrato, extraer riesgos y redactar un correo) da resultados flojos en un solo prompt. ¿Qué ayuda?
- [ ] Escribir todo en mayúsculas para que el modelo preste más atención.
- [x] Dividirla en pasos encadenados, donde la salida de uno es la entrada del siguiente.
- [ ] Subir la temperatura al máximo para obtener más creatividad.
- [ ] Repetir el mismo prompt hasta que salga bien por azar.
porque: Encadenar prompts descompone la tarea en pasos más simples, que se pueden revisar y mejorar por separado.

## Salida estructurada
leccion: cert-gcp-genai-leader
dominio: 3
Un sistema necesita que el modelo devuelva siempre los campos nombre, fecha y monto para guardarlos en una base. ¿Qué haces?
- [ ] Pedir una respuesta libre y que alguien copie los datos a mano.
- [x] Pedir la salida en un formato estructurado (por ejemplo, JSON con un esquema).
- [ ] Usar un modelo de generación de imágenes.
- [ ] Aumentar la ventana de contexto al máximo y confiar en que el modelo ordene los campos siempre del mismo modo.
porque: Una salida estructurada con esquema es fácil de validar y de cargar en otros sistemas.

## Construir o comprar
leccion: cert-gcp-genai-leader
dominio: 4
Una empresa quiere que sus empleados busquen en el correo y los documentos de la oficina con IA, lo antes posible. ¿Qué conviene evaluar primero?
- [ ] Entrenar un modelo propio desde cero con sus datos.
- [x] Una solución lista para usar que ya se integra con esas herramientas, antes de construir algo a medida.
- [ ] Contratar un equipo de investigación para diseñar un modelo nuevo y entrenarlo con todos los documentos de la empresa.
- [ ] Esperar a que salga una nueva generación de modelos.
porque: Si una solución existente cubre el caso, da valor más rápido y con menos riesgo; construir a medida se justifica cuando hay necesidades específicas.

## Medir el éxito
leccion: cert-gcp-genai-leader
dominio: 4
Lanzaron un asistente para el centro de atención. ¿Qué métrica muestra mejor si genera valor de negocio?
- [ ] La cantidad de parámetros del modelo elegido.
- [x] El cambio en el tiempo de resolución y en la satisfacción de los clientes frente a antes del asistente.
- [ ] El número de veces que se abrió la página del asistente.
- [ ] La cantidad de prompts distintos que escribió el equipo técnico durante el desarrollo y las pruebas del asistente.
porque: Las métricas de éxito deben conectar con objetivos del negocio y compararse con la situación previa.

## Explicar decisiones
leccion: cert-gcp-genai-leader
dominio: 4
Un banco usa IA para ayudar a decidir créditos. ¿Qué práctica de IA responsable es clave?
- [ ] Ocultar a los clientes que interviene un sistema de IA.
- [x] Poder explicar los factores de cada decisión y que una persona revise los casos sensibles.
- [ ] Usar el modelo más grande disponible para que no haya errores.
- [ ] Aprobar automáticamente todas las solicitudes para evitar sesgos.
porque: La transparencia, la explicabilidad y la supervisión humana son pilares de la IA responsable en decisiones de alto impacto.

## Marco de seguridad
leccion: cert-gcp-genai-leader
dominio: 4
¿Para qué sirve el Secure AI Framework (SAIF) de Google?
- [ ] Para medir cuántos tokens consume cada usuario por mes.
- [x] Para guiar la seguridad de los sistemas de IA en todo su ciclo de vida, desde los datos hasta el uso en producción.
- [ ] Para entrenar modelos más rápido en TPUs y reducir el costo de cómputo de cada experimento que hace el equipo de datos.
- [ ] Para traducir prompts entre idiomas.
porque: SAIF es un marco conceptual de Google con prácticas para proteger sistemas de IA frente a riesgos propios de esta tecnología.

## @caso retail: Almacenes del Sur
Almacenes del Sur es una cadena de 80 tiendas. La dirección quiere usar IA generativa en tres áreas: que los empleados encuentren rápido las políticas internas repartidas en Drive y en la intranet, que el área de marketing produzca más rápido las descripciones de productos y que el centro de atención responda mejor por chat. Hay preocupación por el costo, por la privacidad de los datos de los clientes y por cómo medir si la inversión vale la pena.

## Políticas para empleados
leccion: cert-gcp-genai-leader
dominio: 2
caso: retail
¿Qué solución de Google Cloud permite a los empleados buscar y preguntar sobre las políticas internas en Drive y la intranet sin desarrollar una aplicación?
- [ ] Entrenar desde cero un modelo de lenguaje propio con todas las políticas y desplegarlo en un clúster de GPU administrado por el equipo de TI.
- [x] Gemini Enterprise, conectado a Drive y a la intranet para buscar y responder con los permisos de cada empleado.
- [ ] Imagen, que genera imágenes con el contenido de cada política.
- [ ] Una hoja de cálculo compartida con las políticas copiadas y pegadas.
porque: Gemini Enterprise ofrece búsqueda y asistentes sobre las fuentes de la empresa, respetando los permisos de acceso.

## Descripciones de productos
leccion: cert-gcp-genai-leader
dominio: 3
caso: retail
Marketing quiere descripciones con el tono de la marca y un formato fijo. ¿Qué técnica pruebas primero?
- [ ] Ajustar un modelo con millones de descripciones antes de probar cualquier prompt, porque el prompting nunca logra un tono consistente.
- [x] Un prompt con instrucciones de tono, el formato esperado y algunos ejemplos aprobados (few-shot).
- [ ] Subir la temperatura al máximo para que cada descripción sea original.
- [ ] Pedir descripciones sin ninguna instrucción y corregirlas a mano.
porque: Instrucciones claras con ejemplos suelen lograr el tono y el formato sin ajuste; el ajuste fino se considera si eso no alcanza.

## Medir la inversión
leccion: cert-gcp-genai-leader
dominio: 4
caso: retail
¿Cómo demuestra la dirección que el asistente de atención vale la pena?
- [ ] Contando cuántos parámetros tiene el modelo que eligió el proveedor y comparándolo con los de la competencia.
- [x] Comparando antes y después indicadores como el tiempo de resolución, la satisfacción del cliente y el costo por contacto.
- [ ] Midiendo cuántas veces se abrió la consola de Google Cloud.
- [ ] Preguntándole al modelo si está funcionando bien.
porque: El éxito se mide con indicadores de negocio definidos antes del piloto.

## Datos de los clientes
leccion: cert-gcp-genai-leader
dominio: 2
caso: retail
¿Qué compromiso de Google Cloud responde a la preocupación por los datos de los clientes en los servicios de IA generativa empresariales?
- [ ] Que los datos del cliente se publican para mejorar los modelos de todos, salvo que se pague una licencia premium de privacidad.
- [x] Que los datos del cliente no se usan para entrenar los modelos de Google sin su permiso y quedan bajo sus controles de acceso.
- [ ] Que los datos se borran cada hora y no se pueden usar en ninguna respuesta.
- [ ] Que solo se puede usar IA generativa con datos públicos.
porque: Google Cloud se compromete a no usar los datos del cliente para entrenar sus modelos sin permiso y a mantenerlos bajo su control.

## Qué es la IA generativa
leccion: cert-gcp-genai-leader
dominio: 1
¿Qué distingue a la IA generativa de un modelo predictivo tradicional?
- [ ] Que solo funciona con números y tablas, mientras que los modelos tradicionales trabajan con texto e imágenes.
- [x] Que crea contenido nuevo (texto, imágenes, código, audio) en lugar de solo clasificar o predecir un valor.
- [ ] Que no necesita datos para aprender.
- [ ] Que siempre es más barata.
porque: Los modelos generativos producen contenido nuevo; los predictivos asignan una etiqueta o un número.

## Preentrenamiento
leccion: cert-gcp-genai-leader
dominio: 1
¿Qué ocurre durante el preentrenamiento de un modelo de lenguaje?
- [ ] El modelo aprende las políticas internas de cada empresa que lo va a usar antes de ser publicado.
- [x] Aprende patrones del lenguaje con enormes volúmenes de texto, prediciendo el siguiente token.
- [ ] Se le escriben reglas a mano para cada pregunta posible.
- [ ] Se conecta a internet en tiempo real.
porque: El preentrenamiento usa grandes corpus para que el modelo aprenda a predecir texto; la adaptación a una empresa viene después.

## Modelos de difusión
leccion: cert-gcp-genai-leader
dominio: 1
¿Para qué se usan principalmente los modelos de difusión?
- [ ] Para calcular promedios de ventas y proyectarlos hacia el próximo trimestre con un intervalo de confianza.
- [x] Para generar imágenes (y video) a partir de ruido guiado por una descripción.
- [ ] Para guardar documentos en una base de datos.
- [ ] Para traducir código entre lenguajes.
porque: Los modelos de difusión generan imágenes partiendo de ruido y refinándolo según el prompt.

## Datos de entrenamiento y sesgo
leccion: cert-gcp-genai-leader
dominio: 1
Un modelo de selección de candidatos favorece a un grupo porque los datos históricos lo hacían. ¿Qué limitación muestra?
- [ ] Que el modelo tiene una ventana de contexto demasiado chica para leer todos los currículums de una vez.
- [x] Que los modelos reproducen los sesgos presentes en sus datos de entrenamiento.
- [ ] Que la temperatura está mal configurada.
- [ ] Que falta GPU.
porque: Si los datos reflejan sesgos, el modelo los aprende y los repite.

## Fecha de corte del conocimiento
leccion: cert-gcp-genai-leader
dominio: 1
Un usuario pregunta por una noticia de ayer y el modelo no la conoce. ¿Por qué?
- [ ] Porque el modelo tiene la temperatura demasiado baja y no se anima a responder sobre hechos recientes.
- [x] Porque su conocimiento llega hasta la fecha de corte de sus datos de entrenamiento, salvo que se conecte a fuentes actuales (grounding).
- [ ] Porque los modelos no pueden hablar de noticias.
- [ ] Porque falta un prompt de rol.
porque: Sin grounding, el modelo solo sabe lo que había en sus datos hasta la fecha de corte.

## Modelo de lenguaje y chatbot
leccion: cert-gcp-genai-leader
dominio: 1
¿Qué relación hay entre un LLM y una aplicación de chat?
- [ ] Son lo mismo: el LLM ya incluye la interfaz, el historial y los permisos de cada usuario.
- [x] El LLM es el motor que genera texto; la aplicación agrega la interfaz, el historial, las fuentes y los controles.
- [ ] La aplicación de chat entrena el LLM con cada mensaje.
- [ ] El chat funciona sin modelo.
porque: Una aplicación combina el modelo con otros componentes, como datos, memoria y seguridad.

## Datos semiestructurados
leccion: cert-gcp-genai-leader
dominio: 1
¿Qué ejemplo es de datos semiestructurados?
- [ ] Una tabla de base de datos con columnas fijas y tipos definidos para cada campo de cada fila.
- [x] Archivos JSON con campos que pueden variar entre registros.
- [ ] Una foto de un producto.
- [ ] Una grabación de audio.
porque: JSON y XML tienen estructura con etiquetas, pero sin un esquema rígido.

## Aprendizaje por refuerzo
leccion: cert-gcp-genai-leader
dominio: 1
¿Cómo aprende un sistema con aprendizaje por refuerzo?
- [ ] A partir de ejemplos etiquetados con la respuesta correcta para cada entrada, igual que en el aprendizaje supervisado.
- [x] Probando acciones y recibiendo recompensas o penalizaciones según el resultado.
- [ ] Agrupando datos sin etiquetas.
- [ ] Copiando las respuestas de otro modelo.
porque: El refuerzo aprende por prueba y error maximizando una recompensa.

## Modelos más chicos
leccion: cert-gcp-genai-leader
dominio: 1
¿Por qué una empresa elegiría un modelo más chico para una tarea simple?
- [ ] Porque los modelos chicos siempre son más precisos que los grandes en cualquier tarea, incluso las complejas.
- [x] Porque responde más rápido y cuesta menos, y puede alcanzar la calidad necesaria para esa tarea.
- [ ] Porque no necesita prompts.
- [ ] Porque no tiene limitaciones.
porque: Para tareas simples, un modelo chico suele equilibrar mejor costo, latencia y calidad.

## Generar video
leccion: cert-gcp-genai-leader
dominio: 2
¿Qué modelo de Google genera video a partir de texto o imágenes?
- [ ] Chirp, el modelo de Google para reconocimiento y generación de voz.
- [x] Veo.
- [ ] Gemini Code Assist.
- [ ] BigQuery.
porque: Veo es el modelo de generación de video de Google.

## Voz a texto
leccion: cert-gcp-genai-leader
dominio: 2
El centro de atención quiere transcribir llamadas con alta precisión en varios idiomas. ¿Qué modelo de Google usa?
- [ ] Imagen, el modelo de Google para generar y editar imágenes a partir de texto.
- [x] Chirp (en Speech-to-Text).
- [ ] Veo.
- [ ] NotebookLM.
porque: Chirp es el modelo de voz de Google para transcripción en muchos idiomas.

## Probar prompts rápido
leccion: cert-gcp-genai-leader
dominio: 2
Un desarrollador quiere probar prompts con Gemini y obtener una clave de API para prototipar rápidamente. ¿Qué usa?
- [ ] Un contrato empresarial de Gemini Enterprise firmado por compras antes de escribir el primer prompt.
- [x] Google AI Studio.
- [ ] Cloud Storage.
- [ ] Looker Studio.
porque: Google AI Studio permite probar modelos Gemini y prototipar con una clave de API.

## Plataforma empresarial
leccion: cert-gcp-genai-leader
dominio: 2
Una empresa necesita desplegar modelos con controles de seguridad, gobierno, evaluación y MLOps en Google Cloud. ¿Qué plataforma usa?
- [ ] Google AI Studio, que es la opción recomendada para producción empresarial con controles de red y auditoría.
- [x] Gemini Enterprise Agent Platform (antes Vertex AI).
- [ ] Google Sheets.
- [ ] Gmail.
porque: La plataforma de IA de Google Cloud ofrece modelos, ajuste, evaluación, agentes y MLOps con controles empresariales.

## Ayuda para operar la nube
leccion: cert-gcp-genai-leader
dominio: 2
El equipo de operaciones quiere ayuda para entender costos, diagnosticar problemas y diseñar infraestructura en Google Cloud. ¿Qué asistente usa?
- [ ] Gemini Code Assist, pensado para escribir código dentro del editor de cada desarrollador.
- [x] Gemini Cloud Assist.
- [ ] NotebookLM.
- [ ] Veo.
porque: Gemini Cloud Assist ayuda a diseñar, operar y optimizar recursos de Google Cloud.

## Gemini en las apps de trabajo
leccion: cert-gcp-genai-leader
dominio: 2
¿Dónde usan los empleados Gemini para redactar correos y resumir documentos sin cambiar de herramienta?
- [ ] En BigQuery, escribiendo consultas SQL sobre la bandeja de entrada de cada empleado.
- [x] En Google Workspace (Gmail, Docs, Meet y otras apps).
- [ ] En Cloud Run.
- [ ] En Compute Engine.
porque: Gemini está integrado en las aplicaciones de Workspace.

## Kit para construir agentes
leccion: cert-gcp-genai-leader
dominio: 2
Un equipo de desarrollo quiere construir agentes con código, herramientas y orquestación de varios agentes. ¿Qué framework de Google usa?
- [ ] Looker, con un modelo semántico que define los pasos de cada agente.
- [x] Agent Development Kit (ADK).
- [ ] Google Forms.
- [ ] Cloud DNS.
porque: ADK es el framework de código abierto de Google para desarrollar agentes y sistemas multiagente.

## Agentes que hablan entre sí
leccion: cert-gcp-genai-leader
dominio: 2
¿Qué protocolo abierto permite que agentes de distintos proveedores se comuniquen y colaboren?
- [ ] HTTP sin ninguna convención adicional, porque cada agente entiende automáticamente a los demás.
- [x] Agent2Agent (A2A).
- [ ] SMTP.
- [ ] FTP.
porque: A2A define cómo los agentes descubren capacidades y colaboran entre sí.

## Acceso a herramientas
leccion: cert-gcp-genai-leader
dominio: 2
¿Qué protocolo estandariza cómo un agente se conecta a herramientas y fuentes de datos externas?
- [ ] Agent2Agent, que define cómo un agente llama a cualquier base de datos.
- [x] Model Context Protocol (MCP).
- [ ] DNS.
- [ ] SSH.
porque: MCP estandariza la conexión de modelos y agentes con herramientas y datos; A2A conecta agentes entre sí.

## Agentes de atención
leccion: cert-gcp-genai-leader
dominio: 2
¿Qué oferta de Google Cloud se orienta a agentes conversacionales para centros de contacto, con asistencia a los agentes humanos?
- [ ] NotebookLM, que convierte los manuales del centro de contacto en podcasts para los clientes.
- [x] Customer Engagement Suite (con agentes conversacionales y asistencia a agentes).
- [ ] Cloud Storage.
- [ ] BigQuery ML.
porque: Customer Engagement Suite reúne agentes conversacionales, asistencia a agentes humanos y analítica del contacto.

## Infraestructura para IA
leccion: cert-gcp-genai-leader
dominio: 2
¿Qué hardware diseñado por Google acelera el entrenamiento y la inferencia de modelos grandes?
- [ ] Discos persistentes estándar, que aceleran el cálculo de los modelos.
- [x] TPU (Tensor Processing Units).
- [ ] Balanceadores de carga.
- [ ] Buckets de Cloud Storage.
porque: Las TPU son aceleradores de Google para cargas de ML a gran escala.

## Modelos de terceros
leccion: cert-gcp-genai-leader
dominio: 2
La empresa quiere comparar Gemini con modelos de otros proveedores y modelos abiertos en la misma plataforma. ¿Dónde los encuentra?
- [ ] En Google Drive, en una carpeta compartida con los modelos descargados.
- [x] En Model Garden.
- [ ] En Gmail.
- [ ] En Cloud Billing.
porque: Model Garden ofrece modelos de Google, de terceros y abiertos.

## Fuentes en un cuaderno
leccion: cert-gcp-genai-leader
dominio: 2
Un analista quiere subir diez informes y hacer preguntas solo sobre ellos, con citas a las fuentes. ¿Qué herramienta usa?
- [ ] Veo, que convierte los informes en un video resumido con la respuesta a cada pregunta.
- [x] NotebookLM.
- [ ] Cloud Scheduler.
- [ ] Artifact Registry.
porque: NotebookLM responde con base en las fuentes cargadas y cita los fragmentos usados.

## Grounding con búsqueda
leccion: cert-gcp-genai-leader
dominio: 3
Un asistente debe responder sobre noticias recientes con fuentes verificables. ¿Qué técnica aplicas?
- [ ] Ajustar el modelo cada noche con las noticias del día para que las recuerde sin buscar.
- [x] Grounding con Google Search, que agrega resultados actuales y citas a la respuesta.
- [ ] Bajar la temperatura a cero.
- [ ] Acortar el prompt.
porque: El grounding con búsqueda conecta la respuesta con información actual y verificable.

## Iterar el prompt
leccion: cert-gcp-genai-leader
dominio: 3
Las primeras respuestas son demasiado largas. ¿Qué haces?
- [ ] Cambiar de proveedor de nube, porque la longitud depende de la región donde corre el modelo.
- [x] Ajustar el prompt (pedir una extensión o formato concretos) y limitar los tokens de salida, y volver a probar.
- [ ] Subir la temperatura.
- [ ] Borrar el historial.
porque: El prompt engineering es iterativo: se ajustan instrucciones y parámetros hasta lograr la salida esperada.

## Evaluar antes de escalar
leccion: cert-gcp-genai-leader
dominio: 3
Antes de lanzar un asistente a toda la empresa, ¿qué conviene hacer?
- [ ] Lanzarlo a todos el mismo día y corregir los errores a medida que los empleados los reporten por correo.
- [x] Evaluarlo con un conjunto de preguntas reales y criterios de calidad, y empezar con un piloto acotado.
- [ ] Desactivar los filtros de seguridad para que responda más.
- [ ] Usar solo la temperatura máxima.
porque: Evaluar y pilotar reduce riesgos y permite ajustar antes de escalar.

## Responsable del sistema
leccion: cert-gcp-genai-leader
dominio: 4
¿Quién debe responder por las decisiones que toma un sistema de IA en la empresa?
- [ ] El proveedor del modelo, que asume toda la responsabilidad por cómo cada cliente lo usa en su negocio.
- [x] Personas y roles definidos en la empresa, con supervisión humana y procesos de revisión.
- [ ] El propio modelo.
- [ ] Nadie.
porque: La rendición de cuentas es un principio de IA responsable: siempre hay personas responsables.
