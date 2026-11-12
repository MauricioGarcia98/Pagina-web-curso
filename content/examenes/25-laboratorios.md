# examen: laboratorios

## Antes de crear recursos
leccion: laboratorios-como-trabajar
Vas a seguir un laboratorio en una cuenta real de nube. ¿Qué conviene hacer antes de crear nada?
- [ ] Elegir las máquinas más grandes disponibles para que el laboratorio termine rápido.
- [x] Configurar un presupuesto con alertas y anotar qué vas a borrar al final.
- [ ] Desactivar la autenticación de dos factores.
- [ ] Compartir las claves de acceso con el grupo de estudio.
porque: En la nube todo lo encendido cuesta. Un presupuesto con alertas y una lista de limpieza evitan sorpresas en la factura.

## Calidad en el lake
leccion: laboratorios-aws-lake-calidad
En un data lake en S3, ¿para qué sirve registrar las tablas en el Glue Data Catalog?
- [ ] Para cifrar los archivos del bucket.
- [x] Para que Athena y otros motores sepan el esquema y dónde están los datos.
- [ ] Para que los archivos ocupen menos espacio.
- [ ] Para borrar automáticamente los archivos viejos del bucket después de consultarlos.
porque: El catálogo guarda los metadatos (columnas, tipos, ubicación, particiones). Los motores de consulta lo leen para encontrar los datos.

## RAG
leccion: laboratorios-aws-bedrock-rag
En una aplicación RAG, ¿qué pasa antes de que el modelo redacte la respuesta?
- [ ] Se vuelve a entrenar el modelo completo usando la pregunta del usuario.
- [x] Se buscan los fragmentos de documentos más parecidos a la pregunta.
- [ ] Se traduce la pregunta a SQL.
- [ ] Se borra el historial de la conversación.
porque: RAG recupera texto relevante de una base de conocimiento y lo pasa al modelo como contexto, sin reentrenar.

## Entrenar y desplegar
leccion: laboratorios-aws-sagemaker
Terminaste de probar un endpoint de inferencia en tiempo real. ¿Qué haces para no seguir pagando?
- [ ] Nada: los endpoints se apagan solos al no recibir pedidos.
- [x] Borrar el endpoint: cobra por hora mientras exista.
- [ ] Borrar solo el notebook donde se creó.
- [ ] Cambiar la región de la consola.
porque: Un endpoint en tiempo real mantiene instancias encendidas. Hay que eliminarlo explícitamente al terminar.

## Mínimo privilegio
leccion: laboratorios-aws-operacion-seguridad
Un job necesita leer un único bucket. ¿Qué permisos le das a su rol?
- [ ] Administrador, para evitar errores de acceso.
- [ ] Lectura y escritura sobre todos los buckets de la cuenta.
- [x] Solo lectura sobre ese bucket.
- [ ] Ninguno: se usan las claves personales de quien lo programó.
porque: Mínimo privilegio: cada identidad recibe solo lo que necesita. Limita el daño si algo sale mal.

## BigQuery ML
leccion: laboratorios-gcp-bigquery-bqml
¿Qué permite BigQuery ML?
- [ ] Ejecutar notebooks de Python dentro de una tabla, con las bibliotecas que elijas instalar.
- [x] Entrenar y usar modelos con sentencias SQL, sin sacar los datos del warehouse.
- [ ] Convertir tablas en hojas de cálculo.
- [ ] Reemplazar el particionamiento de las tablas.
porque: Con `CREATE MODEL` y `ML.PREDICT` se entrena y predice en SQL, donde ya están los datos.

## Ingesta con Pub/Sub
leccion: laboratorios-gcp-ingesta-vertex
¿Qué rol cumple Pub/Sub en un pipeline de eventos?
- [ ] Guardar los datos para siempre en formato columnar, listos para consultarlos con SQL.
- [x] Recibir mensajes de los productores y entregarlos a los consumidores, desacoplándolos.
- [ ] Entrenar modelos con los eventos.
- [ ] Dibujar tableros en tiempo real.
porque: Pub/Sub es mensajería: quien publica no necesita saber quién consume ni si está disponible en ese instante.

## Tráfico entre versiones
leccion: laboratorios-azure-foundry-ml
Tienes un endpoint con la versión estable (blue) y una nueva (green). ¿Cómo la pruebas con poco riesgo?
- [ ] Mandando el 100 % del tráfico a green de una vez, para detectar los errores más rápido.
- [x] Enviando un porcentaje chico a green y subiéndolo si los resultados son buenos.
- [ ] Borrando blue antes de crear green.
- [ ] Probándola solo en la computadora personal.
porque: El despliegue gradual (blue/green o canary) limita el impacto si la versión nueva falla.

## Bundles
leccion: laboratorios-databricks-bundles-gobierno
¿Qué resuelve un Databricks Asset Bundle?
- [ ] Hace que las consultas corran más rápido.
- [x] Define jobs y pipelines como archivos, para desplegar lo mismo en dev y prod.
- [ ] Reemplaza a Unity Catalog para dar permisos sobre catálogos, esquemas y tablas.
- [ ] Comprime las tablas Delta.
porque: El bundle (`databricks.yml`) describe los recursos como código y se despliega con `databricks bundle deploy -t <target>`.

## Limpieza
leccion: laboratorios-guia-azure-paso-a-paso
Terminaste un laboratorio en Azure. ¿Cuál es la forma más segura de no dejar nada cobrando?
- [ ] Cerrar la pestaña del navegador.
- [ ] Detener las máquinas virtuales una por una.
- [x] Borrar el grupo de recursos que usaste para el laboratorio.
- [ ] Cambiar la suscripción a otra región.
porque: Si todo el laboratorio vive en un grupo de recursos, borrarlo elimina todos sus recursos de una vez.
