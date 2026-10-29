# examen: cert-azure
# id: az-ai300
# titulo: Microsoft AI-300 MLOps Engineer

## Infraestructura como código
leccion: cert-azure-ai300-mlops-genaiops
La infraestructura de Azure Machine Learning debe poder recrearse igual en dev, test y prod. ¿Cómo se define?
- [ ] Creando los recursos desde el portal y documentando cada paso en una wiki del equipo.
- [x] Bicep o Terraform para Azure, y YAML de la CLI v2 para Azure ML.
- [ ] Copiando el workspace de dev con una exportación manual cada vez que cambia algo.
- [ ] Con un notebook que crea los recursos la primera vez que se ejecuta en cada entorno.
porque: La infraestructura como código hace los entornos reproducibles, revisables y desplegables desde CI.

## Registros
leccion: cert-azure-ai300-mlops-genaiops
El modelo aprobado en el workspace de dev debe usarse en el de prod sin reentrenarlo y con linaje. ¿Qué usas?
- [ ] Un datastore compartido entre los workspaces con el archivo serializado del modelo.
- [x] Un registro de Azure ML compartido entre los workspaces.
- [ ] Descargar el modelo desde dev y volver a registrarlo a mano en el workspace de prod.
- [ ] Un endpoint en el workspace de dev que la aplicación de producción consume directamente.
porque: Los registros comparten modelos, componentes y entornos entre workspaces conservando el linaje.

## Componentes
leccion: cert-azure-ai300-mlops-genaiops
Varios equipos repiten el mismo paso de preparación de datos en sus pipelines. ¿Cómo lo reutilizan?
- [ ] Copiando el script de preparación en cada repositorio y manteniendo las copias sincronizadas.
- [x] Como un componente versionado, compartido en un registro.
- [ ] Como un environment que incluye el script de preparación dentro de la imagen de Docker.
- [ ] Como un data asset con los datos ya preparados, que cada equipo vuelve a generar.
porque: Un componente define un paso con entradas, salidas, código y entorno, y se reutiliza en pipelines.

## Hiperparámetros
leccion: cert-azure-ai300-mlops-genaiops
Hay que probar automáticamente combinaciones de hiperparámetros y cortar temprano las que van mal. ¿Qué tipo de job usas?
- [ ] Un command job por cada combinación lanzado a mano.
- [x] Un sweep job con una política de terminación temprana.
- [ ] Un endpoint batch con los hiperparámetros como entrada.
- [ ] Un pipeline sin parámetros.
porque: El sweep job muestrea combinaciones y la política de terminación detiene las ejecuciones poco prometedoras.

## Azul-verde
leccion: cert-azure-ai300-mlops-genaiops
Un modelo nuevo debe probarse con el 5 % del tráfico real y poder revertirse al instante. ¿Qué haces?
- [ ] Reemplazar el despliegue actual por el nuevo durante una ventana de mantenimiento nocturna.
- [x] Agregar un segundo despliegue al endpoint y darle el 5 % del tráfico.
- [ ] Crear un endpoint batch paralelo con el modelo nuevo y comparar los resultados al día siguiente.
- [ ] Entrenar el modelo nuevo con el 5 % de los datos para que su impacto sea proporcional.
porque: Un endpoint online puede tener varios despliegues con reparto de tráfico; revertir es cambiar los porcentajes.

## Espejado
leccion: cert-azure-ai300-mlops-genaiops
Quieres comparar el comportamiento del despliegue nuevo con tráfico real **sin** que sus respuestas lleguen a los usuarios. ¿Qué usas?
- [ ] Un reparto de tráfico de 50 % y 50 %.
- [x] El espejado de tráfico (*mirror traffic*) hacia el despliegue nuevo.
- [ ] Un endpoint batch con las solicitudes del día anterior.
- [ ] El panel de IA responsable.
porque: El espejado copia un porcentaje de las solicitudes al despliegue nuevo y descarta sus respuestas.

## Batch
leccion: cert-azure-ai300-mlops-genaiops
Hay que puntuar 80 millones de registros cada noche y escribir los resultados en ADLS. ¿Qué despliegue usas?
- [ ] Un endpoint online con autoescalado agresivo.
- [x] Un endpoint batch.
- [ ] Un compute instance con un cron.
- [ ] Un despliegue Provisioned de Foundry.
porque: Los endpoints batch procesan grandes volúmenes de forma asíncrona en clústeres que escalan a cero.

## Deriva
leccion: cert-azure-ai300-mlops-genaiops
Después de una campaña, la distribución de las entradas del modelo cambió mucho respecto del entrenamiento. ¿Qué lo detecta y qué conviene automatizar?
- [ ] El panel de IA responsable, con un reentrenamiento manual una vez por año.
- [x] Monitoreo de deriva de datos, con una alerta que dispare el reentrenamiento.
- [ ] Application Insights, configurado para reiniciar el endpoint cuando cambian las entradas.
- [ ] Las métricas de CPU del endpoint, con una regla de autoescalado más agresiva.
porque: El monitoreo de modelos compara producción con una referencia y puede disparar el reentrenamiento.

## Compuerta de calidad
leccion: cert-azure-ai300-mlops-genaiops
¿Qué debe frenar un despliegue de un cambio de prompt de una app generativa en el pipeline de CI?
- [ ] Que el prompt nuevo tenga más palabras que el anterior y supere el límite del equipo.
- [x] Evaluaciones de calidad y seguridad por debajo del umbral.
- [ ] Que el cambio no tenga una etiqueta de versión semántica en el mensaje del commit.
- [ ] Que exista una versión más nueva del modelo base en el catálogo de Foundry.
porque: La evaluación automática con umbrales es la compuerta de calidad en GenAIOps.

## Red teaming
leccion: cert-azure-ai300-mlops-genaiops
Antes de publicar un agente, seguridad quiere probar automáticamente ataques de jailbreak y contenido dañino. ¿Qué usas?
- [ ] Un test unitario que verifica la respuesta a tres preguntas.
- [x] El agente de red teaming y los evaluadores de seguridad de Foundry.
- [ ] El monitoreo de deriva de datos.
- [ ] Un filtro de contenido con severidad mínima.
porque: El red teaming automatizado genera ataques y los evaluadores de seguridad miden la respuesta del sistema.

## Observabilidad
leccion: cert-azure-ai300-mlops-genaiops
Para depurar respuestas incorrectas en producción, hay que ver cada llamada al modelo, cada herramienta usada, la latencia y los tokens. ¿Qué configuras?
- [ ] Los registros de actividad del portal de Azure de la suscripción, filtrados por recurso.
- [x] Trazas con OpenTelemetry en Application Insights.
- [ ] Un export diario de las respuestas a un archivo CSV en una cuenta de almacenamiento.
- [ ] El historial de jobs de Azure ML del workspace donde se entrenó el modelo.
porque: Las trazas registran cada paso de la aplicación generativa con su latencia, tokens y errores.

## Costo
leccion: cert-azure-ai300-mlops-genaiops
Una app usa el modelo más grande para clasificar tickets en 6 categorías simples. ¿Qué optimización es más directa?
- [ ] Ajustar el modelo grande con miles de ejemplos.
- [x] Usar un modelo más chico o enrutar esas tareas a uno más chico, validando con evaluación.
- [ ] Pasar a Provisioned para pagar menos por token.
- [ ] Aumentar el contexto para que el modelo responda más rápido.
porque: Para tareas simples, un modelo más chico baja costo y latencia; la evaluación confirma que la calidad se mantiene.

## 429 en producción
leccion: cert-azure-ai300-mlops-genaiops
La app generativa recibe errores 429 en horas pico. ¿Qué combinación de acciones es la adecuada?
- [ ] Bajar la temperatura y acortar el prompt de sistema.
- [x] Reintentos con espera exponencial y más cuota, Global Standard o Provisioned.
- [ ] Reiniciar el recurso de Foundry cada hora.
- [ ] Desactivar los filtros de contenido para acelerar las respuestas.
porque: 429 es límite de tasa: se mitiga con reintentos y se resuelve con más capacidad o un despliegue con más cuota.

## Destilación
leccion: cert-azure-ai300-mlops-genaiops
Un modelo grande da muy buena calidad en una tarea concreta pero es caro. ¿Qué técnica permite obtener calidad parecida con un modelo chico?
- [ ] Aumentar la temperatura del modelo chico.
- [x] Destilación: ajustar el modelo chico con las salidas del grande para esa tarea.
- [ ] Usar el modelo grande solo de noche.
- [ ] Agregar más documentos al contexto del modelo chico.
porque: La destilación entrena un modelo más chico para imitar al grande en una tarea, con menor costo y latencia.

## Credenciales de CI
leccion: cert-azure-ai300-mlops-genaiops
El pipeline de GitHub Actions despliega a Azure ML. ¿Cómo se autentica de la forma recomendada?
- [ ] Con un secreto de service principal sin vencimiento guardado en los secretos del repositorio.
- [x] Con identidad federada (OIDC) hacia un service principal o identidad administrada.
- [ ] Con las credenciales personales del líder técnico, guardadas como secreto de la organización.
- [ ] Con la clave de la cuenta de almacenamiento del workspace en una variable de entorno.
porque: OIDC entrega tokens de corta duración sin secretos guardados en el repositorio.
