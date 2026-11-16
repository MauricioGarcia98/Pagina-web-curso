# examen: cert-azure
# id: az-ai300
# titulo: Microsoft AI-300 MLOps Engineer

## Infraestructura como código
leccion: cert-azure-ai300-mlops-genaiops
dominio: 1
La infraestructura de Azure Machine Learning debe poder recrearse igual en dev, test y prod. ¿Cómo se define?
- [ ] Creando los recursos desde el portal y documentando cada paso en una wiki del equipo.
- [x] Bicep o Terraform para Azure, y YAML de la CLI v2 para Azure ML.
- [ ] Copiando el workspace de dev con una exportación manual cada vez que cambia algo.
- [ ] Con un notebook que crea los recursos la primera vez que se ejecuta en cada entorno.
porque: La infraestructura como código hace los entornos reproducibles, revisables y desplegables desde CI.

## Registros
leccion: cert-azure-ai300-mlops-genaiops
dominio: 1
El modelo aprobado en el workspace de dev debe usarse en el de prod sin reentrenarlo y con linaje. ¿Qué usas?
- [ ] Un datastore compartido entre los workspaces con el archivo serializado del modelo.
- [x] Un registro de Azure ML compartido entre los workspaces.
- [ ] Descargar el modelo desde dev y volver a registrarlo a mano en el workspace de prod.
- [ ] Un endpoint en el workspace de dev que la aplicación de producción consume directamente.
porque: Los registros comparten modelos, componentes y entornos entre workspaces conservando el linaje.

## Componentes
leccion: cert-azure-ai300-mlops-genaiops
dominio: 1
Varios equipos repiten el mismo paso de preparación de datos en sus pipelines. ¿Cómo lo reutilizan?
- [ ] Copiando el script de preparación en cada repositorio y manteniendo las copias sincronizadas.
- [x] Como un componente versionado, compartido en un registro.
- [ ] Como un environment que incluye el script de preparación dentro de la imagen de Docker.
- [ ] Como un data asset con los datos ya preparados, que cada equipo vuelve a generar.
porque: Un componente define un paso con entradas, salidas, código y entorno, y se reutiliza en pipelines.

## Hiperparámetros
leccion: cert-azure-ai300-mlops-genaiops
dominio: 2
Hay que probar automáticamente combinaciones de hiperparámetros y cortar temprano las que van mal. ¿Qué tipo de job usas?
- [ ] Un command job por cada combinación lanzado a mano.
- [x] Un sweep job con una política de terminación temprana.
- [ ] Un endpoint batch con los hiperparámetros como entrada.
- [ ] Un pipeline sin parámetros.
porque: El sweep job muestrea combinaciones y la política de terminación detiene las ejecuciones poco prometedoras.

## Azul-verde
leccion: cert-azure-ai300-mlops-genaiops
dominio: 2
Un modelo nuevo debe probarse con el 5 % del tráfico real y poder revertirse al instante. ¿Qué haces?
- [ ] Reemplazar el despliegue actual por el nuevo durante una ventana de mantenimiento nocturna.
- [x] Agregar un segundo despliegue al endpoint y darle el 5 % del tráfico.
- [ ] Crear un endpoint batch paralelo con el modelo nuevo y comparar los resultados al día siguiente.
- [ ] Entrenar el modelo nuevo con el 5 % de los datos para que su impacto sea proporcional.
porque: Un endpoint online puede tener varios despliegues con reparto de tráfico; revertir es cambiar los porcentajes.

## Espejado
leccion: cert-azure-ai300-mlops-genaiops
dominio: 2
Quieres comparar el comportamiento del despliegue nuevo con tráfico real **sin** que sus respuestas lleguen a los usuarios. ¿Qué usas?
- [ ] Un reparto de tráfico de 50 % y 50 %.
- [x] El espejado de tráfico (*mirror traffic*) hacia el despliegue nuevo.
- [ ] Un endpoint batch con las solicitudes del día anterior.
- [ ] El panel de IA responsable.
porque: El espejado copia un porcentaje de las solicitudes al despliegue nuevo y descarta sus respuestas.

## Batch
leccion: cert-azure-ai300-mlops-genaiops
dominio: 2
Hay que puntuar 80 millones de registros cada noche y escribir los resultados en ADLS. ¿Qué despliegue usas?
- [ ] Un endpoint online con autoescalado agresivo.
- [x] Un endpoint batch.
- [ ] Un compute instance con un cron.
- [ ] Un despliegue Provisioned de Foundry.
porque: Los endpoints batch procesan grandes volúmenes de forma asíncrona en clústeres que escalan a cero.

## Deriva
leccion: cert-azure-ai300-mlops-genaiops
dominio: 2
Después de una campaña, la distribución de las entradas del modelo cambió mucho respecto del entrenamiento. ¿Qué lo detecta y qué conviene automatizar?
- [ ] El panel de IA responsable, con un reentrenamiento manual una vez por año.
- [x] Monitoreo de deriva de datos, con una alerta que dispare el reentrenamiento.
- [ ] Application Insights, configurado para reiniciar el endpoint cuando cambian las entradas.
- [ ] Las métricas de CPU del endpoint, con una regla de autoescalado más agresiva.
porque: El monitoreo de modelos compara producción con una referencia y puede disparar el reentrenamiento.

## Compuerta de calidad
leccion: cert-azure-ai300-mlops-genaiops
dominio: 3
¿Qué debe frenar un despliegue de un cambio de prompt de una app generativa en el pipeline de CI?
- [ ] Que el prompt nuevo tenga más palabras que el anterior y supere el límite del equipo.
- [x] Evaluaciones de calidad y seguridad por debajo del umbral.
- [ ] Que el cambio no tenga una etiqueta de versión semántica en el mensaje del commit.
- [ ] Que exista una versión más nueva del modelo base en el catálogo de Foundry.
porque: La evaluación automática con umbrales es la compuerta de calidad en GenAIOps.

## Red teaming
leccion: cert-azure-ai300-mlops-genaiops
dominio: 4
Antes de publicar un agente, seguridad quiere probar automáticamente ataques de jailbreak y contenido dañino. ¿Qué usas?
- [ ] Un test unitario que verifica la respuesta a tres preguntas.
- [x] El agente de red teaming y los evaluadores de seguridad de Foundry.
- [ ] El monitoreo de deriva de datos.
- [ ] Un filtro de contenido con severidad mínima.
porque: El red teaming automatizado genera ataques y los evaluadores de seguridad miden la respuesta del sistema.

## Observabilidad
leccion: cert-azure-ai300-mlops-genaiops
dominio: 4
Para depurar respuestas incorrectas en producción, hay que ver cada llamada al modelo, cada herramienta usada, la latencia y los tokens. ¿Qué configuras?
- [ ] Los registros de actividad del portal de Azure de la suscripción, filtrados por recurso.
- [x] Trazas con OpenTelemetry en Application Insights.
- [ ] Un export diario de las respuestas a un archivo CSV en una cuenta de almacenamiento.
- [ ] El historial de jobs de Azure ML del workspace donde se entrenó el modelo.
porque: Las trazas registran cada paso de la aplicación generativa con su latencia, tokens y errores.

## Costo
leccion: cert-azure-ai300-mlops-genaiops
dominio: 5
Una app usa el modelo más grande para clasificar tickets en 6 categorías simples. ¿Qué optimización es más directa?
- [ ] Ajustar el modelo grande con miles de ejemplos.
- [x] Usar un modelo más chico o enrutar esas tareas a uno más chico, validando con evaluación.
- [ ] Pasar a Provisioned para pagar menos por token.
- [ ] Aumentar el contexto para que el modelo responda más rápido.
porque: Para tareas simples, un modelo más chico baja costo y latencia; la evaluación confirma que la calidad se mantiene.

## 429 en producción
leccion: cert-azure-ai300-mlops-genaiops
dominio: 5
La app generativa recibe errores 429 en horas pico. ¿Qué combinación de acciones es la adecuada?
- [ ] Bajar la temperatura y acortar el prompt de sistema.
- [x] Reintentos con espera exponencial y más cuota, Global Standard o Provisioned.
- [ ] Reiniciar el recurso de Foundry cada hora.
- [ ] Desactivar los filtros de contenido para acelerar las respuestas.
porque: 429 es límite de tasa: se mitiga con reintentos y se resuelve con más capacidad o un despliegue con más cuota.

## Destilación
leccion: cert-azure-ai300-mlops-genaiops
dominio: 5
Un modelo grande da muy buena calidad en una tarea concreta pero es caro. ¿Qué técnica permite obtener calidad parecida con un modelo chico?
- [ ] Aumentar la temperatura del modelo chico.
- [x] Destilación: ajustar el modelo chico con las salidas del grande para esa tarea.
- [ ] Usar el modelo grande solo de noche.
- [ ] Agregar más documentos al contexto del modelo chico.
porque: La destilación entrena un modelo más chico para imitar al grande en una tarea, con menor costo y latencia.

## Credenciales de CI
leccion: cert-azure-ai300-mlops-genaiops
dominio: 3
El pipeline de GitHub Actions despliega a Azure ML. ¿Cómo se autentica de la forma recomendada?
- [ ] Con un secreto de service principal sin vencimiento guardado en los secretos del repositorio.
- [x] Con identidad federada (OIDC) hacia un service principal o identidad administrada.
- [ ] Con las credenciales personales del líder técnico, guardadas como secreto de la organización.
- [ ] Con la clave de la cuenta de almacenamiento del workspace en una variable de entorno.
porque: OIDC entrega tokens de corta duración sin secretos guardados en el repositorio.

## @caso banca: Banco Pampa
Banco Pampa tiene un modelo de riesgo crediticio en Azure Machine Learning y un asistente generativo en Microsoft Foundry para los oficiales de crédito.

Hoy:
- El modelo se entrena desde la laptop de un científico y se despliega a mano.
- Nadie sabe qué versión de datos usó el modelo en producción.
- El prompt del asistente se edita directamente en producción.
- En los picos de fin de mes, el asistente devuelve errores 429 y la factura de tokens se duplicó.

La dirección pide un proceso de MLOps y GenAIOps con entornos dev, test y prod.

## Reproducibilidad
leccion: cert-azure-ai300-mlops-genaiops
dominio: 2
caso: banca
¿Qué permite saber qué datos y código produjeron el modelo en producción?
- [ ] Guardar el notebook del científico en una carpeta compartida con la fecha del entrenamiento.
- [x] Jobs con data assets versionados y el modelo registrado con MLflow desde el job.
- [ ] Anotar en un Excel la versión de los datos de cada entrenamiento.
- [ ] Desplegar siempre el último modelo entrenado.
porque: Los jobs registran el código, el entorno y los data assets versionados, y el modelo queda vinculado al job que lo produjo.

## Prompt en producción
leccion: cert-azure-ai300-mlops-genaiops
dominio: 3
caso: banca
¿Cómo debería cambiar el prompt del asistente?
- [ ] Editándolo en el proyecto de producción y avisando al equipo por chat del cambio.
- [x] Versionado en Git, evaluado en CI y promovido por entornos con aprobación.
- [ ] Editándolo solo los viernes por la tarde.
- [ ] Copiándolo de un proyecto a otro a mano.
porque: GenAIOps trata los prompts como código: versión, evaluación con umbrales y despliegue controlado por entornos.

## Picos de fin de mes
leccion: cert-azure-ai300-mlops-genaiops
dominio: 5
caso: banca
¿Qué dos medidas atacan los errores 429 y el aumento de costo?
- [x] Un gateway de IA (por ejemplo, Azure API Management) con límites de tokens por aplicación y balanceo entre despliegues.
- [x] Caché semántica de respuestas a preguntas repetidas y un modelo más chico para tareas simples.
- [ ] Desactivar el registro de trazas del asistente.
- [ ] Bajar la temperatura a 0.
- [ ] Borrar el historial de conversaciones cada día.
porque: El gateway reparte la carga y controla el consumo; la caché y el modelo adecuado reducen tokens y llamadas.

## Infraestructura
leccion: cert-azure-ai300-mlops-genaiops
dominio: 1
caso: banca
¿Cómo crean los entornos dev, test y prod de Azure ML idénticos?
- [ ] Clonando el workspace de dev desde el portal y renombrando los recursos de cada copia.
- [x] Con plantillas Bicep o Terraform parametrizadas por entorno, desplegadas desde CI/CD.
- [ ] Con un script que cada ingeniero ejecuta en su laptop.
- [ ] Usando un único workspace con carpetas por entorno.
porque: La infraestructura como código produce entornos consistentes y auditables.

## Tipos de cómputo
leccion: cert-azure-ai300-mlops-genaiops
dominio: 1
Los jobs de entrenamiento se ejecutan pocas veces por semana y no deben tener máquinas encendidas en reposo. ¿Qué cómputo usas?
- [ ] Una compute instance encendida todo el día con un planificador para lanzar los jobs.
- [x] Un compute cluster con mínimo de 0 nodos (o cómputo serverless).
- [ ] Un clúster de Kubernetes con nodos fijos.
- [ ] La laptop del científico.
porque: Los clusters con mínimo 0 escalan a cero cuando no hay jobs; el cómputo serverless no requiere administrar clústeres.

## Data asset
leccion: cert-azure-ai300-mlops-genaiops
dominio: 1
¿Qué tipo de data asset referencia una carpeta de archivos Parquet en un datastore?
- [ ] `uri_file`, que apunta a un archivo individual dentro del datastore.
- [x] `uri_folder`.
- [ ] Un environment.
- [ ] Un componente.
porque: `uri_folder` apunta a una carpeta; `uri_file` a un archivo; `mltable` agrega un esquema de lectura.

## Environment
leccion: cert-azure-ai300-mlops-genaiops
dominio: 1
Los jobs fallan porque cada científico usa versiones distintas de las librerías. ¿Qué defines?
- [ ] Un archivo de texto con instrucciones de instalación que cada científico sigue a mano.
- [x] Un environment versionado (imagen de Docker y archivo conda) usado por todos los jobs.
- [ ] Un datastore compartido.
- [ ] Un endpoint batch.
porque: Los environments fijan las dependencias y hacen reproducible la ejecución.

## Red administrada
leccion: cert-azure-ai300-mlops-genaiops
dominio: 1
Seguridad exige que el cómputo de Azure ML no tenga salida libre a internet. ¿Qué configuras?
- [ ] Un firewall en la laptop de cada científico de datos que usa el workspace.
- [x] La red virtual administrada con salida solo a destinos aprobados.
- [ ] Acceso público habilitado con claves rotadas.
- [ ] Un endpoint batch.
porque: La red administrada aísla el cómputo y permite reglas de salida controladas.

## Rol del científico
leccion: cert-azure-ai300-mlops-genaiops
dominio: 1
Un científico debe poder ejecutar jobs y registrar modelos, pero no crear ni borrar cómputo ni cambiar la red del workspace. ¿Qué rol le asignas?
- [ ] Owner del workspace, para que no tenga problemas de permisos con ninguna operación.
- [x] AzureML Data Scientist.
- [ ] Reader.
- [ ] AzureML Compute Operator.
porque: AzureML Data Scientist permite trabajar en el workspace sin administrar el cómputo ni la configuración.

## Secretos del workspace
leccion: cert-azure-ai300-mlops-genaiops
dominio: 1
Un job necesita la contraseña de una base externa. ¿Dónde se guarda?
- [ ] En el código del job, dentro de un archivo de configuración excluido del repositorio.
- [x] En Azure Key Vault (el del workspace), leída por el job con su identidad.
- [ ] En una variable del pipeline de CI en texto plano.
- [ ] En el nombre del data asset.
porque: Key Vault guarda los secretos y el job los obtiene con su identidad administrada.

## Pipeline de entrenamiento
leccion: cert-azure-ai300-mlops-genaiops
dominio: 2
¿Qué ventaja tiene un pipeline de Azure ML con componentes frente a un único script de entrenamiento?
- [ ] Que no necesita un environment porque cada paso usa las librerías de la laptop.
- [x] Pasos reutilizables, reejecución selectiva y trazabilidad.
- [ ] Que no consume cómputo.
- [ ] Que reemplaza al registro de modelos.
porque: Los pipelines encadenan componentes versionados con entradas y salidas, reutilizan resultados y registran el linaje.

## Registro con MLflow
leccion: cert-azure-ai300-mlops-genaiops
dominio: 2
¿Cómo se registra el modelo desde el job para que quede vinculado a sus métricas?
- [ ] Subiendo el archivo del modelo a un datastore al terminar el job.
- [x] Con `mlflow.sklearn.log_model` dentro del job, y registrándolo.
- [ ] Copiando el modelo al endpoint.
- [ ] Guardándolo en Key Vault.
porque: Azure ML usa MLflow para tracking y registro; el modelo queda asociado al job con sus métricas.

## Endpoint online administrado
leccion: cert-azure-ai300-mlops-genaiops
dominio: 2
¿Qué hay que proveer para desplegar un modelo MLflow en un managed online endpoint?
- [ ] Un script de puntuación y un environment siempre, aunque el modelo sea de MLflow.
- [x] Solo el modelo registrado y el tipo de instancia.
- [ ] Un clúster de Kubernetes propio.
- [ ] Un endpoint batch previo.
porque: Los modelos MLflow admiten despliegue sin código; para otros formatos se provee script de puntuación y environment.

## Autoescalado
leccion: cert-azure-ai300-mlops-genaiops
dominio: 2
El endpoint online tiene picos de tráfico en horario bancario. ¿Qué configuras?
- [ ] Una instancia fija muy grande para cubrir el pico durante todo el día y la noche.
- [x] Reglas de autoescalado con mínimo y máximo de instancias.
- [ ] Un endpoint batch.
- [ ] Un mirror de tráfico del 100 %.
porque: El autoescalado ajusta las instancias al tráfico según métricas.

## Batch con pipeline
leccion: cert-azure-ai300-mlops-genaiops
dominio: 2
La puntuación nocturna necesita preprocesar los datos y luego puntuar, en un solo endpoint invocable. ¿Qué despliegas?
- [ ] Un endpoint online con un script que procesa todos los archivos de la noche.
- [x] Un endpoint batch con un despliegue de pipeline.
- [ ] Una compute instance con cron.
- [ ] Un despliegue de Foundry.
porque: Los endpoints batch admiten despliegues de modelo o de pipeline con varios pasos.

## Validación antes de registrar
leccion: cert-azure-ai300-mlops-genaiops
dominio: 2
El pipeline debe registrar el modelo nuevo solo si supera al actual. ¿Cómo lo implementas?
- [ ] Registrando siempre el modelo nuevo y revisando las métricas a mano después de cada corrida.
- [x] Un paso que compara con el modelo en producción antes de registrar.
- [ ] Un mirror de tráfico.
- [ ] Un filtro de contenido.
porque: Una compuerta de evaluación en el pipeline evita promover modelos peores.

## Tipos de deriva
leccion: cert-azure-ai300-mlops-genaiops
dominio: 2
¿Qué dos señales de monitoreo de modelos de Azure ML detectan cambios sin necesidad de etiquetas reales?
- [x] Deriva de datos (data drift) de las entradas.
- [x] Deriva de predicciones (prediction drift).
- [ ] Exactitud del modelo con las etiquetas del mes.
- [ ] Precisión por clase.
- [ ] Matriz de confusión.
porque: Las derivas comparan distribuciones contra una referencia; las métricas de calidad requieren etiquetas.

## Recolección de datos
leccion: cert-azure-ai300-mlops-genaiops
dominio: 2
¿Qué hay que habilitar en el endpoint para que el monitoreo compare los datos de producción?
- [ ] Un mirror de tráfico del 100 % hacia otro despliegue de prueba.
- [x] El data collector del despliegue.
- [ ] Un environment nuevo.
- [ ] Un datastore público.
porque: El data collector guarda las entradas y salidas del modelo para analizarlas con el monitoreo.

## IA responsable
leccion: cert-azure-ai300-mlops-genaiops
dominio: 2
Antes de aprobar el modelo de crédito, riesgo pide ver errores por segmento, explicabilidad y análisis contrafactual. ¿Qué usas?
- [ ] El panel de métricas del endpoint online, que muestra solicitudes y latencia.
- [x] El panel de IA responsable (Responsible AI dashboard) de Azure ML.
- [ ] Application Insights.
- [ ] Un sweep job.
porque: El panel de IA responsable reúne análisis de errores, explicabilidad, equidad y contrafactuales.

## Reentrenamiento por evento
leccion: cert-azure-ai300-mlops-genaiops
dominio: 2
¿Cómo disparas automáticamente el pipeline de reentrenamiento cuando el monitoreo detecta deriva?
- [ ] Revisando el panel de monitoreo cada mañana y ejecutando el pipeline a mano.
- [x] La alerta del monitoreo emite un evento que inicia el pipeline.
- [ ] Con un filtro de contenido.
- [ ] Con un mirror de tráfico.
porque: Las alertas pueden integrarse con Event Grid, Logic Apps o pipelines de CI para reentrenar.

## Proyectos por entorno
leccion: cert-azure-ai300-mlops-genaiops
dominio: 3
¿Cómo se organiza GenAIOps en Microsoft Foundry para separar desarrollo y producción?
- [ ] Un único proyecto donde todos editan los agentes y el prompt en producción.
- [x] Proyectos separados por entorno, promovidos desde CI/CD.
- [ ] Un proyecto por usuario.
- [ ] Una carpeta por entorno dentro del mismo agente.
porque: Separar entornos aísla los cambios y permite promover versiones evaluadas.

## Versionar agentes
leccion: cert-azure-ai300-mlops-genaiops
dominio: 3
¿Qué hay que versionar de un agente para poder reproducirlo en otro entorno?
- [ ] Solo el nombre del agente, porque el resto se configura en el portal de cada entorno.
- [x] Instrucciones, modelo y versión, herramientas y su configuración, y parámetros.
- [ ] Solo el historial de conversaciones.
- [ ] El número de usuarios.
porque: La definición completa del agente es el "código" que se versiona y despliega.

## Evaluación en CI
leccion: cert-azure-ai300-mlops-genaiops
dominio: 3
¿Qué hace la etapa de evaluación en el pipeline de CI de una app generativa?
- [ ] Compila el código de la aplicación y verifica que el estilo de los archivos sea correcto.
- [x] Corre evaluadores sobre un dataset y falla bajo el umbral.
- [ ] Despliega directo a producción.
- [ ] Borra versiones anteriores.
porque: Las evaluaciones automáticas actúan como compuerta de calidad antes de promover cambios.

## Dataset de evaluación
leccion: cert-azure-ai300-mlops-genaiops
dominio: 3
¿De dónde conviene sacar las preguntas del dataset de evaluación del asistente?
- [ ] Solo de preguntas inventadas por el equipo que el asistente ya responde correctamente.
- [x] De preguntas reales de los usuarios (trazas), revisadas, más casos difíciles y adversarios.
- [ ] Del manual del modelo base.
- [ ] De preguntas generadas sin revisión.
porque: Un dataset representativo y curado mide la calidad real y detecta regresiones.

## Despliegue gradual del asistente
leccion: cert-azure-ai300-mlops-genaiops
dominio: 3
¿Cómo reduces el riesgo al publicar una nueva versión del asistente?
- [ ] Reemplazando la versión anterior para todos los usuarios al mismo tiempo, sin vuelta atrás.
- [x] Liberándola a un grupo pequeño (canary o A/B), comparando métricas y con reversión rápida.
- [ ] Publicándola de noche.
- [ ] Desactivando los filtros de contenido.
porque: La exposición gradual con métricas permite detectar problemas antes de afectar a todos.

## Aprobación manual
leccion: cert-azure-ai300-mlops-genaiops
dominio: 3
¿Dónde se configura la aprobación humana antes de desplegar a producción en GitHub Actions?
- [ ] En el prompt de sistema del asistente, pidiendo confirmación al usuario final.
- [x] En un environment de GitHub con revisores requeridos.
- [ ] En el filtro de contenido.
- [ ] En el data collector.
porque: Los environments de GitHub con revisores requeridos detienen el workflow hasta que alguien aprueba.

## Conexiones por entorno
leccion: cert-azure-ai300-mlops-genaiops
dominio: 3
El agente usa un índice de AI Search distinto en dev y en prod. ¿Cómo evitas cambiar el código?
- [ ] Escribiendo en el código un `if` con el nombre de cada índice según la fecha.
- [x] Parametrizando la conexión por entorno en la configuración del despliegue.
- [ ] Usando el mismo índice en todos los entornos.
- [ ] Copiando el índice a mano.
porque: Las conexiones y parámetros por entorno permiten promover el mismo artefacto sin cambios.

## Pruebas de regresión
leccion: cert-azure-ai300-mlops-genaiops
dominio: 3
¿Qué dos prácticas detectan que un cambio de modelo base empeoró el asistente?
- [x] Ejecutar el mismo dataset de evaluación con el modelo viejo y el nuevo y comparar.
- [x] Revisar las preguntas cuyo resultado cambió entre ambas versiones.
- [ ] Mirar solo la latencia promedio.
- [ ] Contar la cantidad de tokens del prompt.
- [ ] Preguntarle al modelo si mejoró.
porque: La comparación con el mismo dataset y el análisis de diferencias muestran regresiones concretas.

## Versión del modelo base
leccion: cert-azure-ai300-mlops-genaiops
dominio: 3
El proveedor retirará la versión del modelo base que usa el asistente en tres meses. ¿Qué haces?
- [ ] Esperar a que se retire y que Azure elija automáticamente una versión nueva.
- [x] Evaluar la versión nueva en dev y promoverla como cualquier cambio.
- [ ] Cambiar el modelo directamente en producción.
- [ ] Desactivar el asistente.
porque: Los cambios de versión del modelo base se tratan como cualquier cambio: evaluación y promoción controlada.

## Evaluación continua
leccion: cert-azure-ai300-mlops-genaiops
dominio: 4
¿Cómo mides la calidad del asistente en producción sin revisar cada respuesta?
- [ ] Revisando a mano todas las conversaciones del día anterior cada mañana.
- [x] Evaluadores automáticos sobre una muestra de las trazas.
- [ ] Mirando solo los errores 500.
- [ ] Contando usuarios activos.
porque: La evaluación continua aplica evaluadores de calidad y seguridad a una muestra del tráfico real.

## Métricas de seguridad
leccion: cert-azure-ai300-mlops-genaiops
dominio: 4
¿Qué evaluadores de Foundry miden riesgos del contenido generado?
- [ ] Fluency y coherence, que miden la calidad gramatical y lógica de la respuesta.
- [x] Evaluadores de riesgo y seguridad (violencia, contenido sexual, odio, autolesión, material protegido, ataque indirecto).
- [ ] F1 y BLEU.
- [ ] Latencia y tokens.
porque: Los evaluadores de riesgo detectan contenido dañino y vulnerabilidades en las respuestas.

## Red teaming automatizado
leccion: cert-azure-ai300-mlops-genaiops
dominio: 4
¿Qué ofrece el agente de red teaming de Foundry?
- [ ] Un filtro que bloquea automáticamente todas las preguntas de los usuarios sobre seguridad.
- [x] Ataques adversarios generados automáticamente contra la app y un informe de tasa de éxito de ataques.
- [ ] Un panel de costos.
- [ ] Un despliegue batch.
porque: El red teaming automatizado prueba estrategias de ataque y mide qué tan vulnerable es el sistema.

## Trazas con OpenTelemetry
leccion: cert-azure-ai300-mlops-genaiops
dominio: 4
¿Dónde se almacenan y consultan las trazas de una app de Foundry instrumentada con OpenTelemetry?
- [ ] En el datastore de entrenamiento del workspace de Azure Machine Learning.
- [x] En Application Insights (Azure Monitor), conectado al proyecto.
- [ ] En Key Vault.
- [ ] En el registro de modelos.
porque: Las trazas se envían a Application Insights y se visualizan en Foundry.

## Retroalimentación de usuarios
leccion: cert-azure-ai300-mlops-genaiops
dominio: 4
¿Qué hacer con los "pulgar abajo" de los usuarios del asistente?
- [ ] Ignorarlos, porque los usuarios no saben evaluar respuestas generadas por un modelo.
- [x] Registrarlos con la traza, analizarlos y sumar esos casos al dataset de evaluación.
- [ ] Borrar la conversación.
- [ ] Bajar la temperatura cada vez que llega uno.
porque: La retroalimentación vinculada a trazas identifica fallas reales y alimenta las evaluaciones.

## Alertas de calidad
leccion: cert-azure-ai300-mlops-genaiops
dominio: 4
¿Qué configuras para enterarte si la puntuación de groundedness en producción cae bajo 4?
- [ ] Un informe mensual enviado por correo con todas las respuestas del asistente.
- [x] Una alerta de Azure Monitor sobre la métrica de la evaluación continua.
- [ ] Un filtro de contenido.
- [ ] Un sweep job.
porque: Las métricas de evaluación continua se pueden alertar como cualquier métrica de Azure Monitor.

## Model router
leccion: cert-azure-ai300-mlops-genaiops
dominio: 5
¿Qué hace el model router de Foundry?
- [ ] Copia el modelo a varias regiones para reducir la latencia de todas las solicitudes.
- [x] Elige por solicitud el modelo según la complejidad del prompt.
- [ ] Cambia la temperatura automáticamente.
- [ ] Filtra contenido dañino.
porque: El router envía prompts simples a modelos más baratos y complejos a modelos más capaces.

## Caché de prompts
leccion: cert-azure-ai300-mlops-genaiops
dominio: 5
Todas las llamadas comparten un prompt de sistema de 3.000 tokens al inicio. ¿Qué abarata esas llamadas en Azure OpenAI?
- [ ] Enviar el prompt de sistema al final de cada mensaje del usuario para que se procese después.
- [x] El prompt caching, que descuenta los tokens de entrada repetidos al inicio del prompt.
- [ ] Un despliegue batch.
- [ ] Un modelo de embeddings.
porque: El prompt caching reutiliza el prefijo idéntico de las solicitudes recientes con menor costo y latencia.

## Provisioned con desborde
leccion: cert-azure-ai300-mlops-genaiops
dominio: 5
Un despliegue Provisioned cubre la carga normal, pero en picos se satura. ¿Qué evita errores sin comprar más PTU?
- [ ] Bajar el máximo de tokens de salida solo durante los picos de fin de mes.
- [x] El desborde (spillover) a un despliegue Standard o Global Standard cuando se excede la capacidad.
- [ ] Un mirror de tráfico.
- [ ] Desactivar la caché.
porque: El spillover envía el excedente a un despliegue pay-as-you-go, manteniendo la base en Provisioned.

## Ajuste fino económico
leccion: cert-azure-ai300-mlops-genaiops
dominio: 5
Un modelo chico ajustado alcanza la calidad del grande en una tarea de extracción. ¿Qué ventaja operativa logras?
- [ ] Mayor contexto disponible para cada solicitud del usuario en el asistente.
- [x] Menor costo por token y menor latencia con calidad comparable en esa tarea.
- [ ] No necesitar evaluación.
- [ ] Eliminar los filtros de contenido.
porque: Un modelo chico especializado reduce costo y latencia; la evaluación confirma la calidad.

## Latencia percibida
leccion: cert-azure-ai300-mlops-genaiops
dominio: 5
Los usuarios se quejan de que el asistente "tarda en contestar", aunque la respuesta completa demora 6 segundos. ¿Qué mejora la percepción?
- [ ] Aumentar el máximo de tokens de salida para que la respuesta sea más completa.
- [x] Streaming de la respuesta, para mostrar los primeros tokens enseguida.
- [ ] Un despliegue batch.
- [ ] Más réplicas del índice.
porque: Con streaming, el usuario ve el texto desde el primer token y no espera la respuesta completa.

## Cuantización
leccion: cert-azure-ai300-mlops-genaiops
dominio: 5
¿Qué efecto tiene cuantizar un modelo abierto antes de servirlo?
- [ ] Mejora siempre la calidad de las respuestas porque el modelo usa más precisión.
- [x] Reduce memoria y costo de inferencia, con una posible pérdida pequeña de calidad que hay que evaluar.
- [ ] Elimina la necesidad de GPU para cualquier tamaño de modelo.
- [ ] Cambia el idioma del modelo.
porque: Representar pesos con menos bits reduce recursos; la evaluación verifica que la calidad siga aceptable.

## Registro compartido
leccion: cert-azure-ai300-mlops-genaiops
dominio: 1
¿Qué recurso permite compartir environments, componentes y modelos entre los workspaces de dev, test y prod?
- [ ] Un datastore común montado en los tres workspaces con los archivos de cada recurso.
- [x] Un registro (registry) de Azure Machine Learning.
- [ ] Un endpoint batch compartido.
- [ ] Una compute instance.
porque: Los registries comparten activos versionados entre workspaces y regiones con su linaje.

## Agente como código
leccion: cert-azure-ai300-mlops-genaiops
dominio: 3
¿Cuál es la ventaja de crear los agentes con el SDK desde el pipeline en lugar de configurarlos en el portal?
- [ ] Que el portal no permite elegir el modelo ni las herramientas del agente.
- [x] Que la definición queda versionada y se recrea igual en cada entorno.
- [ ] Que los agentes creados desde el SDK no consumen tokens.
- [ ] Que no necesitan permisos.
porque: Definir el agente como código permite revisarlo, versionarlo y desplegarlo de forma reproducible.

## Identidad del pipeline
leccion: cert-azure-ai300-mlops-genaiops
dominio: 3
¿Con qué identidad conviene que el pipeline de CI/CD despliegue los agentes a producción?
- [ ] Con la cuenta del líder técnico, porque tiene todos los permisos necesarios en la suscripción.
- [x] Con un service principal o identidad administrada con federación (OIDC) y permisos mínimos.
- [ ] Con una clave de API compartida.
- [ ] Con un usuario invitado.
porque: Una identidad de máquina con OIDC evita secretos de larga duración y limita los permisos.

## Evaluar agentes
leccion: cert-azure-ai300-mlops-genaiops
dominio: 4
¿Qué evaluadores específicos de agentes ofrece Foundry además de los de calidad de respuesta?
- [ ] Solo BLEU y ROUGE, que comparan el texto con una respuesta de referencia escrita a mano.
- [x] Resolución de la intención, adherencia a la tarea y exactitud de llamadas a herramientas.
- [ ] Latencia de red y uso de CPU.
- [ ] Cantidad de usuarios activos.
porque: Los evaluadores de agentes miden si entendió la intención, cumplió la tarea y usó bien las herramientas.

## @caso farmacia: Farmacias Del Valle
Farmacias Del Valle tiene un modelo que predice la demanda diaria de cada producto en 400 sucursales y un asistente generativo que responde preguntas de los farmacéuticos sobre el vademécum interno. Hoy el modelo se entrena en la laptop de una científica y el asistente se cambia directamente en producción.

Quieren:
- entrenar y desplegar el modelo de forma reproducible en dev, test y prod;
- recalcular las predicciones de todas las sucursales cada noche;
- que ningún cambio del asistente llegue a producción sin pasar una evaluación;
- ver en un solo lugar las trazas, la latencia y el costo del asistente.

## Predicciones de cada noche
leccion: cert-azure-ai300-mlops-genaiops
dominio: 2
caso: farmacia
¿Cómo se generan cada noche las predicciones de las 400 sucursales?
- [ ] Un endpoint online administrado con tres instancias encendidas todo el día, al que un script llama sucursal por sucursal cada noche.
- [x] Un endpoint batch invocado por un schedule, que lee los datos de entrada y escribe las predicciones en almacenamiento.
- [ ] Una compute instance que la científica deja encendida para ejecutar el notebook a mano cada noche.
- [ ] Un despliegue azul-verde con el 50 % del tráfico en cada versión, invocado desde Power BI.
porque: Para puntuar grandes volúmenes en un horario fijo, un endpoint batch con un schedule es más simple y barato que un endpoint online.

## El mismo modelo en prod
leccion: cert-azure-ai300-mlops-genaiops
dominio: 1
caso: farmacia
¿Cómo se promueve a prod exactamente el mismo modelo validado en test, si cada entorno tiene su propio workspace?
- [ ] Reentrenando el modelo en el workspace de prod con los mismos hiperparámetros y la misma semilla, y esperando que dé igual.
- [x] Registrando el modelo en un registry de Azure Machine Learning compartido y desplegándolo desde ahí en cada workspace.
- [ ] Descargando el archivo del modelo a una laptop y subiéndolo a mano en el workspace de prod.
- [ ] Copiando el notebook de entrenamiento al workspace de prod y ejecutándolo de nuevo con datos de prod.
porque: Un registry comparte modelos, componentes y entornos entre workspaces, de modo que se despliega el mismo artefacto en cada etapa.

## Compuerta del asistente
leccion: cert-azure-ai300-mlops-genaiops
dominio: 3
caso: farmacia
¿Qué impide que un cambio del asistente llegue a producción sin evaluación?
- [ ] Una regla en el README que pide a cada desarrollador probar a mano diez preguntas antes de publicar y dejar las respuestas en el PR.
- [x] Un pipeline de CI que corre la evaluación con un dataset fijo y bloquea el despliegue si las métricas quedan bajo el umbral.
- [ ] Un content filter más estricto en el despliegue del modelo, que reemplaza la evaluación de calidad.
- [ ] Una revisión manual una vez por trimestre de las conversaciones de producción.
porque: La evaluación automática en CI con umbrales es la compuerta que frena cambios que empeoran la calidad o la seguridad.

## Un solo lugar para observar
leccion: cert-azure-ai300-mlops-genaiops
dominio: 4
caso: farmacia
¿Dónde ve el equipo las trazas, la latencia y los tokens del asistente?
- [ ] En los logs del navegador de cada farmacéutico, que se envían por correo al equipo.
- [x] En el tracing del proyecto de Foundry, que envía trazas OpenTelemetry a Application Insights.
- [ ] En el historial de commits del repositorio.
- [ ] En la factura mensual de Azure, que detalla cada conversación.
porque: El tracing de Foundry instrumenta la app con OpenTelemetry y Application Insights centraliza trazas, latencia y uso.

## Entrenamiento reproducible
leccion: cert-azure-ai300-mlops-genaiops
dominio: 2
caso: farmacia
¿Qué hace reproducible el entrenamiento que hoy corre en la laptop?
- [ ] Guardar una captura de pantalla de las celdas del notebook y una lista de las librerías instaladas después de cada entrenamiento.
- [x] Un job de Azure ML definido en YAML con un environment versionado, un data asset versionado y el código en Git.
- [ ] Usar siempre la misma laptop y no actualizar nunca las librerías.
- [ ] Entrenar con más épocas para que el resultado sea siempre el mismo.
porque: Versionar código, datos y entorno en un job permite volver a ejecutar el entrenamiento y obtener el mismo modelo.

## Escalar a cero
leccion: cert-azure-ai300-mlops-genaiops
dominio: 1
¿Qué configuración de un compute cluster evita pagar cuando no hay jobs?
- [ ] Un número fijo de nodos igual al máximo, para que los jobs no esperen.
- [x] `min_instances: 0`, con un tiempo de inactividad antes de reducir nodos.
- [ ] Una compute instance en lugar de un cluster, que nunca cobra.
- [ ] Un clúster de Kubernetes adjunto sin límites.
porque: Con mínimo cero, el cluster libera los nodos al quedar inactivo y solo cobra mientras hay jobs.

## Cómputo serverless
leccion: cert-azure-ai300-mlops-genaiops
dominio: 1
El equipo no quiere crear ni administrar clusters para jobs ocasionales. ¿Qué opción usa?
- [ ] Una máquina virtual con un `cron` que lanza los scripts de entrenamiento cada noche.
- [x] Cómputo serverless de Azure ML, indicando solo el tamaño de máquina en el job.
- [ ] Una compute instance compartida por todo el equipo.
- [ ] Un endpoint online como máquina de entrenamiento.
porque: Con cómputo serverless, Azure ML aprovisiona y libera la capacidad por job sin administrar un cluster.

## Acceso a datos sin claves
leccion: cert-azure-ai300-mlops-genaiops
dominio: 1
¿Cómo accede el cómputo de Azure ML al almacenamiento sin guardar claves de cuenta?
- [ ] Con la clave de la cuenta de almacenamiento escrita en el script de entrenamiento y en el YAML del job, cifrada en Base64.
- [x] Con una identidad administrada que tiene un rol de datos (por ejemplo, Storage Blob Data Reader) sobre la cuenta.
- [ ] Con un token SAS sin vencimiento guardado en el repositorio.
- [ ] Haciendo pública la cuenta de almacenamiento.
porque: Las identidades administradas con RBAC evitan secretos en el código y se pueden auditar.

## Salida de red controlada
leccion: cert-azure-ai300-mlops-genaiops
dominio: 1
Seguridad exige que el workspace solo pueda salir a destinos aprobados. ¿Qué configuras?
- [ ] Nada: los workspaces de Azure ML no tienen acceso a internet por defecto en ningún modo de red.
- [x] La red virtual administrada del workspace en modo "solo salida aprobada", con reglas para los destinos necesarios.
- [ ] Un content filter en el despliegue del modelo.
- [ ] Un registry compartido entre workspaces.
porque: La red administrada con aislamiento "allow only approved outbound" limita la salida a destinos aprobados.

## Bicep o Terraform
leccion: cert-azure-ai300-mlops-genaiops
dominio: 1
¿Por qué definir el workspace, el almacenamiento y el Key Vault con Bicep o Terraform?
- [ ] Porque el portal de Azure no permite crear workspaces con almacenamiento y Key Vault asociados.
- [x] Para crear entornos idénticos y repetibles (dev, test, prod) desde código revisado en Git.
- [ ] Para que los jobs de entrenamiento corran más rápido.
- [ ] Porque así no hace falta definir permisos.
porque: La infraestructura como código hace los entornos reproducibles, versionados y revisables.

## Federación con GitHub
leccion: cert-azure-ai300-mlops-genaiops
dominio: 1
¿Cómo se autentica un workflow de GitHub Actions en Azure sin guardar un secreto de cliente?
- [ ] Con el usuario y la contraseña de un administrador de la suscripción guardados como secreto del repositorio.
- [x] Con credenciales federadas (OIDC) en una identidad de Entra ID, que confía en los tokens de GitHub.
- [ ] Con una clave de la cuenta de almacenamiento.
- [ ] Sin autenticación, porque GitHub es de confianza.
porque: La federación OIDC permite obtener tokens de Azure sin secretos de larga duración.

## Componentes reutilizables
leccion: cert-azure-ai300-mlops-genaiops
dominio: 2
Tres pipelines distintos usan el mismo paso de limpieza. ¿Cómo evitas copiar el código?
- [ ] Copiando el script en cada pipeline y actualizando las tres copias a mano cuando cambia la lógica de limpieza.
- [x] Definiendo un componente con entradas, salidas, código y environment, y registrándolo para reutilizarlo.
- [ ] Usando un endpoint online para la limpieza.
- [ ] Guardando el paso en un data asset.
porque: Un componente es un paso reutilizable y versionado que se usa en varios pipelines.

## Sweep con parada temprana
leccion: cert-azure-ai300-mlops-genaiops
dominio: 2
En un sweep de hiperparámetros, ¿qué política corta las pruebas cuya métrica queda muy por debajo de la mejor?
- [ ] `sampling_algorithm: grid`, que prueba todas las combinaciones hasta el final.
- [x] Una política de terminación temprana, como Bandit (o median stopping).
- [ ] `max_total_trials: 1`.
- [ ] Un environment con más librerías.
porque: Las políticas de terminación temprana detienen pruebas con bajo desempeño y ahorran cómputo.

## Modelo MLflow sin script
leccion: cert-azure-ai300-mlops-genaiops
dominio: 2
¿Qué ventaja tiene registrar el modelo en formato MLflow al desplegarlo en un endpoint online?
- [ ] Ninguna: siempre hay que escribir un script de scoring y un environment a mano para cada despliegue.
- [x] Se puede desplegar sin escribir script de scoring ni environment (despliegue sin código).
- [ ] El endpoint queda gratis.
- [ ] El modelo se reentrena solo con cada solicitud.
porque: Para modelos MLflow, Azure ML genera el script de scoring y el entorno a partir del modelo registrado.

## Espejar tráfico
leccion: cert-azure-ai300-mlops-genaiops
dominio: 2
¿Cómo pruebas un despliegue nuevo con tráfico real sin que sus respuestas lleguen a los usuarios?
- [ ] Enviándole el 50 % del tráfico en vivo durante una semana y comparando la cantidad de quejas de los usuarios de cada versión.
- [x] Espejando (mirror) un porcentaje del tráfico al despliegue nuevo: recibe copias de las solicitudes, pero sus respuestas no se devuelven.
- [ ] Borrando el despliegue actual durante la prueba.
- [ ] Probándolo solo con los datos de entrenamiento.
porque: El tráfico espejado prueba el despliegue nuevo con solicitudes reales sin afectar a los usuarios.

## Pasar todo al verde
leccion: cert-azure-ai300-mlops-genaiops
dominio: 2
El despliegue `green` funcionó bien con el 10 % del tráfico. ¿Qué haces?
- [ ] Borrar el endpoint y crear uno nuevo solo con `green`, con otra URL para los clientes.
- [x] Subir gradualmente el tráfico de `green` hasta el 100 % y luego eliminar `blue`.
- [ ] Dejar 10 % para siempre en `green`.
- [ ] Reentrenar `blue` para que se parezca a `green`.
porque: En el despliegue azul-verde se mueve el tráfico gradualmente y se retira la versión anterior al final.

## Minilotes del endpoint batch
leccion: cert-azure-ai300-mlops-genaiops
dominio: 2
¿Qué controla `mini_batch_size` en un despliegue batch?
- [ ] El número de instancias del cluster.
- [x] Cuántos archivos (o filas) procesa cada llamada al script de scoring.
- [ ] El tamaño máximo del modelo.
- [ ] El porcentaje de tráfico del despliegue.
porque: El trabajo batch divide la entrada en minilotes que se reparten entre los nodos.

## Pipeline programado
leccion: cert-azure-ai300-mlops-genaiops
dominio: 2
¿Cómo ejecutas el pipeline de entrenamiento cada domingo sin depender de una persona?
- [ ] Con un recordatorio en el calendario de la científica para lanzar el job desde su compute instance.
- [x] Con un schedule de Azure ML (`az ml schedule create`) con una expresión cron o recurrencia.
- [ ] Con un endpoint online que se llama a sí mismo.
- [ ] Con una compute instance encendida todo el fin de semana.
porque: Los schedules de Azure ML disparan jobs o pipelines con cron o recurrencia.

## Recolectar datos del endpoint
leccion: cert-azure-ai300-mlops-genaiops
dominio: 2
¿Qué hace falta para monitorear la deriva de un modelo desplegado en un endpoint online?
- [ ] Nada: el endpoint calcula la deriva por su cuenta, sin guardar entradas ni salidas y sin una línea base de comparación.
- [x] Habilitar la recolección de datos (data collector) de entradas y salidas, y configurar el monitor con una línea base.
- [ ] Reentrenar el modelo cada hora.
- [ ] Desactivar los logs del endpoint.
porque: El monitoreo compara los datos de producción recolectados con una línea base, como los datos de entrenamiento.

## Señales del monitoreo
leccion: cert-azure-ai300-mlops-genaiops
dominio: 2
¿Qué señal del monitoreo de modelos detecta que cambió la distribución de las predicciones?
- [ ] Data quality, que solo revisa nulos y tipos.
- [x] Prediction drift.
- [ ] La latencia del endpoint.
- [ ] El conteo de jobs del workspace.
porque: Prediction drift compara la distribución de salidas en producción con la línea base.

## Calidad de datos
leccion: cert-azure-ai300-mlops-genaiops
dominio: 2
De un día para otro, una columna del endpoint llega con muchos nulos y valores fuera de rango. ¿Qué señal lo detecta?
- [ ] Prediction drift, que solo mira las salidas.
- [x] Data quality.
- [ ] Feature attribution drift sin datos de entrada.
- [ ] El uso de CPU del endpoint.
porque: La señal de calidad de datos revisa nulos, tipos y rangos de las entradas.

## Disparar por evento
leccion: cert-azure-ai300-mlops-genaiops
dominio: 2
Quieres que, al registrarse una nueva versión de un modelo, se ejecute un flujo de validación. ¿Qué mecanismo usas?
- [ ] Un script en la laptop de un ingeniero que revisa el registro de modelos cada mañana y lanza la validación a mano.
- [x] Los eventos de Azure ML publicados en Event Grid, que disparan una Logic App, una función o un pipeline.
- [ ] Un content filter.
- [ ] Una conexión del proyecto de Foundry.
porque: Azure ML emite eventos (por ejemplo, modelo registrado o deriva detectada) a Event Grid para automatizar acciones.

## Panel de IA responsable
leccion: cert-azure-ai300-mlops-genaiops
dominio: 2
Antes de aprobar el modelo, el comité quiere ver el análisis de errores por segmento y la importancia de variables. ¿Qué usas?
- [ ] El historial de jobs del workspace.
- [x] El panel de IA responsable (Responsible AI dashboard) de Azure ML.
- [ ] Un content filter de Foundry.
- [ ] La página de costos de la suscripción.
porque: El panel de IA responsable reúne análisis de errores, explicabilidad, equidad y análisis contrafactual.

## Conexiones del proyecto
leccion: cert-azure-ai300-mlops-genaiops
dominio: 3
¿Cómo usa el código del asistente el índice de búsqueda distinto de cada entorno sin cambiar el código?
- [ ] Escribiendo la clave y la URL de cada índice en el código, con un `if` por entorno que lee una variable al arrancar la app.
- [x] Con una conexión del proyecto de Foundry en cada entorno, con el mismo nombre y apuntando a su recurso.
- [ ] Usando el mismo índice de prod en todos los entornos.
- [ ] Copiando el índice a una tabla Excel.
porque: Las conexiones por proyecto separan la configuración del código y permiten promover sin cambios.

## Prompt versionado
leccion: cert-azure-ai300-mlops-genaiops
dominio: 3
¿Por qué guardar los prompts del asistente en archivos versionados en Git (por ejemplo, Prompty)?
- [ ] Porque Foundry no permite escribir prompts en el código de la app.
- [x] Para revisar cada cambio, evaluarlo en CI y volver atrás si empeora.
- [ ] Para que el modelo use menos tokens.
- [ ] Para que el content filter no se aplique.
porque: Versionar los prompts los hace revisables, evaluables y reversibles como cualquier código.

## Evaluadores de calidad
leccion: cert-azure-ai300-mlops-genaiops
dominio: 3
¿Qué evaluador del SDK de evaluación detecta respuestas que no se apoyan en el contexto recuperado?
- [ ] `FluencyEvaluator`.
- [x] `GroundednessEvaluator`.
- [ ] `BleuScoreEvaluator`, sin respuesta de referencia.
- [ ] Un evaluador de latencia.
porque: El evaluador de groundedness mide si la respuesta está respaldada por el contexto entregado.

## Evaluadores de seguridad
leccion: cert-azure-ai300-mlops-genaiops
dominio: 3
¿Qué mide un evaluador de seguridad de contenido sobre las respuestas del asistente?
- [ ] La cantidad de tokens por respuesta y si supera el límite configurado del despliegue, con un nivel de severidad.
- [x] Si las respuestas contienen contenido violento, sexual, de odio o de autolesión, con un nivel de severidad.
- [ ] La similitud con una respuesta de referencia.
- [ ] El costo de cada llamada.
porque: Los evaluadores de seguridad clasifican el contenido dañino por categoría y severidad.

## Agente de red teaming
leccion: cert-azure-ai300-mlops-genaiops
dominio: 3
¿Qué hace el AI Red Teaming Agent de Foundry?
- [ ] Entrena un modelo nuevo y más seguro con los ataques conocidos de internet y lo despliega en lugar del actual.
- [x] Genera ataques adversarios automáticos contra la app y mide qué porcentaje logra respuestas indebidas.
- [ ] Bloquea a los usuarios que hacen preguntas difíciles.
- [ ] Reemplaza al content filter.
porque: El agente de red teaming automatiza sondeos adversarios y reporta la tasa de éxito de los ataques.

## Modelo base que cambia
leccion: cert-azure-ai300-mlops-genaiops
dominio: 3
El proveedor anuncia el retiro de la versión del modelo que usa el asistente. ¿Qué haces?
- [ ] Esperar a que deje de funcionar y entonces cambiar la versión en la configuración del despliegue.
- [x] Probar la versión nueva con el mismo dataset de evaluación y promoverla solo si mantiene las métricas.
- [ ] Cambiar la versión en producción sin probar.
- [ ] Desactivar el content filter.
porque: Cambiar el modelo base es un cambio de la app: se evalúa con el mismo conjunto antes de promover.

## Despliegue global o regional
leccion: cert-azure-ai300-mlops-genaiops
dominio: 3
La empresa exige que los datos se procesen dentro de su zona geográfica. ¿Qué tipo de despliegue del modelo elige?
- [ ] Global, que puede procesar en cualquier región del mundo.
- [x] Data zone (o regional), que mantiene el procesamiento dentro de la zona.
- [ ] Cualquiera: el tipo de despliegue no afecta dónde se procesan los datos.
- [ ] Un despliegue sin content filter.
porque: Los despliegues de zona de datos y regionales limitan dónde se procesan las solicitudes.

## Evaluación continua
leccion: cert-azure-ai300-mlops-genaiops
dominio: 4
¿Cómo vigilas la calidad del asistente en producción sin evaluar todas las conversaciones?
- [ ] No se vigila en producción: alcanza con la evaluación de CI, porque las preguntas reales son iguales a las del dataset.
- [x] Con evaluación continua sobre una muestra de las trazas de producción y alertas cuando una métrica baja.
- [ ] Leyendo todas las conversaciones a mano cada día.
- [ ] Mirando solo la latencia.
porque: La evaluación continua aplica evaluadores a una muestra del tráfico y avisa ante degradaciones.

## Feedback del usuario
leccion: cert-azure-ai300-mlops-genaiops
dominio: 4
¿Cómo aprovechas los "me gusta / no me gusta" que dan los farmacéuticos?
- [ ] Usarlos para cambiar automáticamente el prompt de producción cada vez que llega un "no me gusta", sin revisión.
- [x] Registrándolos asociados a la traza de cada respuesta para analizar fallas y alimentar el dataset de evaluación.
- [ ] Borrándolos cada semana.
- [ ] Usándolos para cambiar el modelo en tiempo real sin revisión.
porque: El feedback vinculado a trazas ayuda a encontrar casos problemáticos y mejora los datasets de evaluación.

## Métrica de tokens
leccion: cert-azure-ai300-mlops-genaiops
dominio: 4
El costo del asistente subió 40 % en un mes sin más usuarios. ¿Qué miras primero?
- [ ] La cantidad de commits del repositorio.
- [x] Los tokens de entrada y salida por solicitud en las trazas, para ver qué parte del prompt o del contexto creció.
- [ ] La versión del navegador de los usuarios.
- [ ] El tamaño del modelo de demanda.
porque: Los tokens por solicitud explican el costo; un contexto más largo o más llamadas por respuesta lo disparan.

## Alerta de latencia
leccion: cert-azure-ai300-mlops-genaiops
dominio: 4
¿Cómo te enteras si la latencia del asistente supera los 5 segundos en el percentil 95?
- [ ] Revisando cada mañana el promedio de duración en el panel del endpoint.
- [x] Con una alerta de Azure Monitor sobre la métrica de duración en Application Insights.
- [ ] Revisando la factura mensual.
- [ ] Con el panel de IA responsable.
porque: Azure Monitor permite alertas sobre métricas de Application Insights, como el percentil 95 de duración.

## Desborde de capacidad
leccion: cert-azure-ai300-mlops-genaiops
dominio: 5
Tienes capacidad aprovisionada (PTU) para el tráfico normal, pero a fin de mes hay picos. ¿Qué configuras?
- [ ] Más PTU fijas para cubrir el pico durante todo el mes, aunque queden ociosas.
- [x] Desborde (spillover) a un despliegue de pago por uso cuando se agota la capacidad aprovisionada.
- [ ] Rechazar las solicitudes del pico con un error 429.
- [ ] Un despliegue batch para las solicitudes en línea.
porque: El spillover envía el exceso a un despliegue estándar y evita pagar PTU de más todo el mes.

## Elegir el modelo por consulta
leccion: cert-azure-ai300-mlops-genaiops
dominio: 5
Muchas preguntas son simples y pocas requieren razonamiento. ¿Qué opción baja el costo sin perder calidad en las difíciles?
- [ ] Usar siempre el modelo más grande, que responde bien a todo.
- [x] Model router, que elige un modelo más chico o más grande según la consulta.
- [ ] Usar siempre el modelo más chico.
- [ ] Desactivar la evaluación.
porque: El model router asigna cada consulta al modelo adecuado y reduce el costo promedio.

## Prompt largo repetido
leccion: cert-azure-ai300-mlops-genaiops
dominio: 5
Todas las solicitudes empiezan con las mismas 3.000 palabras de instrucciones. ¿Qué abarata esas llamadas?
- [ ] Mover las instrucciones al final del mensaje del usuario.
- [x] El prompt caching, que reutiliza el prefijo común y cobra menos por los tokens en caché.
- [ ] Cambiar a un despliegue batch para las consultas en línea.
- [ ] Repetir las instrucciones al final también.
porque: Con prompt caching, el prefijo repetido se procesa una vez y sus tokens se cobran con descuento.

## Destilar un modelo
leccion: cert-azure-ai300-mlops-genaiops
dominio: 5
Un modelo grande da buenas respuestas en una tarea acotada, pero es caro. ¿Qué técnica produce un modelo chico que lo imita?
- [ ] Bajar la temperatura del modelo grande para que use menos tokens por respuesta.
- [x] Destilación: ajustar un modelo chico con las salidas (completions guardadas) del modelo grande.
- [ ] Cuantizar el prompt.
- [ ] Usar más PTU.
porque: La destilación transfiere el comportamiento del modelo grande a uno chico con datos generados por el grande.

## Batch para tareas sin urgencia
leccion: cert-azure-ai300-mlops-genaiops
dominio: 5
Hay que clasificar 500.000 documentos y el resultado puede esperar hasta mañana. ¿Qué tipo de despliegue conviene?
- [ ] Un despliegue estándar llamado de a un documento en tiempo real.
- [x] Un despliegue batch (global batch), más barato a cambio de un plazo de respuesta mayor.
- [ ] Más PTU.
- [ ] Un endpoint online de Azure ML.
porque: Los despliegues batch procesan grandes volúmenes de forma asíncrona con descuento sobre el precio estándar.
