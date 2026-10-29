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
