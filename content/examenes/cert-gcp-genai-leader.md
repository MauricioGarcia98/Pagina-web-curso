# examen: cert-gcp
# id: gcp-genai-leader
# titulo: Google Cloud Generative AI Leader

## Modelo fundacional
leccion: cert-gcp-genai-leader
¿Qué es un modelo fundacional?
- [ ] Un modelo entrenado solo para una tarea específica de la empresa.
- [x] Un modelo grande entrenado con datos amplios que se adapta a muchas tareas.
- [ ] Una base de datos de documentos de la empresa.
- [ ] Un conjunto de reglas escritas por expertos.
porque: Los modelos fundacionales se preentrenan con datos masivos y se adaptan a muchas tareas.

## Alucinación
leccion: cert-gcp-genai-leader
Un asistente cita una política de devoluciones que no existe. ¿Cómo se llama ese problema?
- [ ] Sobreajuste.
- [x] Alucinación.
- [ ] Deriva de datos.
- [ ] Latencia.
porque: Una alucinación es una respuesta plausible pero falsa.

## Multimodal
leccion: cert-gcp-genai-leader
Un caso requiere entender fotos de productos y su descripción en texto a la vez. ¿Qué tipo de modelo se necesita?
- [ ] Un modelo de regresión entrenado con las ventas de cada producto.
- [x] Un modelo multimodal como Gemini.
- [ ] Un modelo de clustering que agrupe los productos por similitud de precio.
- [ ] Un modelo solo de texto al que se le pasa el nombre del archivo de la foto.
porque: Los modelos multimodales procesan texto, imágenes, audio y video juntos.

## Gemini Enterprise
leccion: cert-gcp-genai-leader
Los empleados quieren buscar y obtener respuestas sobre Drive, SharePoint y Jira desde un solo asistente, sin desarrollo. ¿Qué producto se recomienda?
- [ ] Model Garden.
- [x] Gemini Enterprise.
- [ ] Agent Development Kit.
- [ ] BigQuery ML.
porque: Gemini Enterprise conecta las fuentes de la empresa y ofrece un asistente y agentes listos para usar.

## Model Garden
leccion: cert-gcp-genai-leader
El equipo quiere comparar Gemini con modelos de terceros y abiertos dentro de Google Cloud. ¿Dónde los encuentra?
- [ ] En NotebookLM.
- [x] En Model Garden.
- [ ] En Google Workspace.
- [ ] En Cloud Storage.
porque: Model Garden reúne modelos de Google, de terceros y abiertos.

## Desarrollar agentes
leccion: cert-gcp-genai-leader
Los desarrolladores quieren construir un agente propio con herramientas y desplegarlo de forma administrada. ¿Qué usan?
- [ ] Gemini en Gmail.
- [x] Agent Development Kit y Agent Engine.
- [ ] Looker Studio.
- [ ] NotebookLM.
porque: ADK sirve para construir agentes y Agent Engine para desplegarlos y operarlos.

## NotebookLM
leccion: cert-gcp-genai-leader
Una analista quiere hacer preguntas sobre 30 informes propios y obtener respuestas con citas, sin desarrollo. ¿Qué usa?
- [ ] Model Garden.
- [x] NotebookLM.
- [ ] Agent Engine.
- [ ] Cloud Run.
porque: NotebookLM responde y resume sobre las fuentes cargadas, citándolas.

## Grounding
leccion: cert-gcp-genai-leader
Un asistente responde con información desactualizada sobre noticias recientes. ¿Qué técnica lo mejora?
- [ ] Bajar la temperatura.
- [x] Grounding con Google Search.
- [ ] Reducir la longitud máxima.
- [ ] Usar un modelo más chico.
porque: El grounding basa la respuesta en fuentes actuales y verificables.

## Orden de técnicas
leccion: cert-gcp-genai-leader
¿En qué orden conviene probar técnicas para mejorar las respuestas de un modelo?
- [ ] Ajuste, después RAG, después prompts.
- [x] Prompts, después grounding o RAG, y ajuste solo si hace falta.
- [ ] RAG, después preentrenamiento, después prompts.
- [ ] Siempre ajuste primero.
porque: Las técnicas más baratas y rápidas van primero; el ajuste se reserva para cuando no alcanzan.

## Temperatura
leccion: cert-gcp-genai-leader
Marketing quiere ideas de campañas más variadas. ¿Qué parámetro se ajusta?
- [ ] Se baja la temperatura.
- [x] Se sube la temperatura.
- [ ] Se baja la longitud máxima.
- [ ] Se agregan secuencias de parada.
porque: Una temperatura más alta produce respuestas más diversas.

## Piloto
leccion: cert-gcp-genai-leader
¿Qué caso de uso es mejor para un primer piloto de IA generativa?
- [ ] Decisiones automáticas de crédito sin revisión humana.
- [x] Resumir reclamos de clientes para los agentes, con revisión humana.
- [ ] Reemplazar todo el sistema de facturación.
- [ ] Diagnósticos médicos sin supervisión.
porque: Un buen piloto aporta valor medible con riesgo controlado y humano en el circuito.

## Métricas
leccion: cert-gcp-genai-leader
¿Qué métrica muestra mejor el valor de un asistente para agentes de soporte?
- [ ] La cantidad de tokens consumidos por mes, comparada con el presupuesto de la nube.
- [x] El tiempo de resolución y la satisfacción del cliente.
- [ ] El número de modelos distintos que el equipo probó durante el desarrollo.
- [ ] La temperatura promedio configurada en las solicitudes del asistente.
porque: Las métricas de negocio (productividad y calidad) reflejan el valor real.

## Seguridad
leccion: cert-gcp-genai-leader
¿Qué marco de Google guía la seguridad de los sistemas de IA?
- [ ] ITIL, el marco de gestión de servicios de tecnología de la información.
- [x] Secure AI Framework (SAIF).
- [ ] COBIT, el marco de gobierno y control de tecnología de la información.
- [ ] Scrum, el marco ágil para organizar el desarrollo de productos en sprints.
porque: SAIF es el marco de Google para proteger sistemas de IA.

## Datos del cliente
leccion: cert-gcp-genai-leader
Legales pregunta si los prompts de la empresa se usan para entrenar los modelos de Google en la plataforma empresarial. ¿Qué responde?
- [ ] Sí, siempre se usan para mejorar Gemini.
- [x] No: los datos de los clientes no se usan para entrenar los modelos de Google sin permiso.
- [ ] Solo si se usa la temperatura alta.
- [ ] Solo los prompts en inglés.
porque: En Google Cloud, los datos de los clientes no se usan para entrenar los modelos sin su consentimiento.

## IA responsable
leccion: cert-gcp-genai-leader
Un asistente de selección de personal da peores recomendaciones a ciertos grupos. ¿Qué principio se viola?
- [ ] Escalabilidad.
- [x] Equidad.
- [ ] Latencia.
- [ ] Portabilidad.
porque: La equidad exige evitar resultados injustos para grupos de personas.
