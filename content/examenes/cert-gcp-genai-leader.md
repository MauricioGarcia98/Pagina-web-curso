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
