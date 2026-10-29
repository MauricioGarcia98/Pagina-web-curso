# Tarjetas: Microsoft AI-300

## Entornos de Azure ML iguales en dev, test y prod
dominio: 1
**Bicep/Terraform** + YAML de la CLI v2, desde CI/CD.

## Compartir modelos, componentes y entornos entre workspaces
dominio: 1
**Registry** de Azure ML.

## Cómputo que no cobra en reposo
dominio: 1
**Compute cluster con mínimo 0** o cómputo **serverless**.

## Dependencias iguales para todos los jobs
dominio: 1
**Environment** versionado.

## Cómputo sin salida libre a internet
dominio: 1
**Red virtual administrada** del workspace + private endpoints.

## Rol para trabajar sin administrar el workspace
dominio: 1
**AzureML Data Scientist**.

## Saber qué datos y código produjeron el modelo
dominio: 2
Jobs con **data assets versionados** + modelo registrado con MLflow desde el job.

## Paso reutilizable entre equipos
dominio: 2
**Componente** versionado en un registry.

## Combinaciones de hiperparámetros con corte temprano
dominio: 2
**Sweep job** + política de terminación temprana.

## Probar un modelo con el 5 % del tráfico
dominio: 2
Segundo **despliegue** en el endpoint online con reparto de tráfico.

## Tráfico real sin afectar usuarios
dominio: 2
**Mirror traffic** (espejado).

## Puntuar millones de registros cada noche
dominio: 2
**Endpoint batch** (modelo o pipeline).

## Datos para el monitoreo del endpoint
dominio: 2
**Data collector** del despliegue.

## Deriva sin etiquetas
dominio: 2
**Data drift** y **prediction drift**.

## Errores por segmento, explicabilidad y contrafactuales
dominio: 2
**Responsible AI dashboard**.

## Cambiar un prompt de forma segura
dominio: 3
Versionado en Git → **evaluación en CI** con umbrales → promoción por entornos con aprobación.

## Autenticación de GitHub Actions a Azure
dominio: 3
**OIDC (identidad federada)** hacia service principal o identidad administrada.

## Aprobación antes de producción en GitHub
dominio: 3
**Environment** de GitHub con revisores requeridos.

## Ataques adversarios automatizados
dominio: 4
**Agente de red teaming** de Foundry + evaluadores de riesgo y seguridad.

## Ver cada llamada, herramienta, latencia y tokens
dominio: 4
Trazas con **OpenTelemetry** en **Application Insights**.

## Calidad en producción
dominio: 4
**Evaluación continua** sobre una muestra de trazas, con alertas en Azure Monitor.

## Errores 429 y factura alta en picos
dominio: 5
**Gateway de IA (APIM)**: límites de tokens, balanceo; **caché semántica**; modelo más chico para tareas simples.

## Elegir el modelo por solicitud
dominio: 5
**Model router**.

## Prefijo largo repetido en cada llamada
dominio: 5
**Prompt caching**.

## Picos sobre un despliegue Provisioned
dominio: 5
**Spillover** a Standard/Global Standard.

## Calidad parecida con un modelo chico
dominio: 5
**Destilación** o ajuste fino del modelo chico.
