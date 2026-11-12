# examen: portafolio

## Qué mostrar
leccion: portafolio-como-armar-tu-portafolio
¿Qué convence más en un proyecto de portafolio de datos?
- [ ] Usar la mayor cantidad posible de herramientas.
- [x] Un problema claro, las decisiones explicadas y un resultado que se puede ejecutar.
- [ ] Un repositorio con cientos de archivos y carpetas, aunque no tenga README ni instrucciones.
- [ ] Capturas de pantalla sin el código.
porque: Quien evalúa quiere ver criterio: qué problema resolviste, por qué elegiste cada cosa y que funcione.

## README
leccion: portafolio-como-armar-tu-portafolio
¿Qué no puede faltar en el README de un proyecto?
- [ ] La lista completa de comandos de Git que usaste, en el orden en que los ejecutaste.
- [ ] Tu currículum entero.
- [x] Qué hace, cómo ejecutarlo y un diagrama o resumen de la arquitectura.
- [ ] Las contraseñas de las cuentas de prueba.
porque: El README es la portada: debe permitir entender y correr el proyecto en pocos minutos. Nunca incluye credenciales.

## Capas medallón
leccion: portafolio-lakehouse-de-ventas
En un lakehouse con capas bronze, silver y gold, ¿qué contiene silver?
- [ ] Los archivos tal como llegaron de la fuente, sin cambios.
- [x] Datos limpios, con tipos correctos y sin duplicados.
- [ ] Solo las métricas finales para el tablero.
- [ ] Las copias de seguridad de bronze.
porque: Bronze es el dato crudo; silver, el dato limpio y confiable; gold, las tablas listas para el negocio.

## Tiempo real
leccion: portafolio-fraude-tiempo-real
En detección de fraude, ¿por qué se usa streaming y no un proceso nocturno?
- [ ] Porque el streaming siempre es más barato.
- [x] Porque la respuesta sirve solo si llega antes de aprobar el pago.
- [ ] Porque los procesos nocturnos no pueden leer datos de pagos con tarjeta.
- [ ] Porque así no hace falta guardar los datos.
porque: Se elige streaming cuando el valor de la respuesta depende de los segundos. Si no, batch es más simple y barato.

## Mantenimiento predictivo
leccion: portafolio-mantenimiento-predictivo
Un modelo predice fallas de máquinas que ocurren en el 1 % de los casos. ¿Por qué la exactitud (accuracy) engaña?
- [ ] Porque nunca supera el 50 %.
- [x] Porque un modelo que dice siempre "no falla" acierta el 99 % y no sirve.
- [ ] Porque la exactitud solo se puede medir con datos de texto y no con sensores.
- [ ] Porque depende del tamaño de la pantalla.
porque: Con clases desbalanceadas hay que mirar precisión y recall sobre la clase rara, no la exactitud global.

## Churn
leccion: portafolio-metricas-saas-churn
¿Qué mide el churn en un negocio de suscripción?
- [ ] Los clientes nuevos de cada mes.
- [x] La proporción de clientes (o ingresos) que se pierde en un período.
- [ ] El tiempo que tarda en cargar la aplicación para los clientes que pagan.
- [ ] El costo de los servidores.
porque: El churn es la pérdida: clientes que cancelan o ingresos que se van. Se sigue por cohorte para ver si mejora.

## Privacidad
leccion: portafolio-ausentismo-con-privacidad
Un tablero de ausentismo muestra datos de salud de empleados. ¿Qué práctica corresponde?
- [ ] Mostrar el nombre de cada persona junto a su diagnóstico, para que el área pueda actuar.
- [x] Agregar los datos y ocultar grupos muy chicos donde se podría identificar a alguien.
- [ ] Publicar el tablero sin control de acceso.
- [ ] Guardar los datos sin cifrar para consultarlos más rápido.
porque: Los datos sensibles se muestran agregados, con mínimos por grupo y acceso restringido.

## RAG con citas
leccion: portafolio-asistente-rag-con-citas
¿Por qué un asistente RAG debería mostrar las fuentes de cada respuesta?
- [ ] Para que la respuesta sea más larga.
- [x] Para que la persona pueda verificar y detectar cuando el modelo se equivoca.
- [ ] Porque sin las citas el modelo no puede generar ninguna respuesta sobre los documentos.
- [ ] Para ocupar menos tokens.
porque: Las citas permiten comprobar la respuesta contra el documento original y dan confianza.

## Infraestructura como código
leccion: portafolio-plataforma-iac-cicd
¿Qué ventaja da definir la infraestructura con Terraform en vez de crearla a mano?
- [ ] Los recursos se vuelven gratuitos.
- [x] Queda versionada, se puede revisar y recrear igual en otro entorno.
- [ ] Ya no hace falta tener una cuenta en la nube ni permisos para crear recursos.
- [ ] Las consultas SQL corren más rápido.
porque: Con infraestructura como código, los cambios pasan por pull request y los entornos son reproducibles.

## Observabilidad
leccion: portafolio-observabilidad-de-datos
El pipeline terminó "en verde", pero la tabla quedó vacía. ¿Qué control lo habría detectado?
- [ ] Un control de que el job terminó sin errores y dentro del horario.
- [x] Un control de volumen: cantidad de filas contra lo esperado.
- [ ] Un control del color del tablero.
- [ ] Un control de la versión de Python.
porque: Que el proceso termine no garantiza datos correctos. La observabilidad mide frescura, volumen y calidad de los datos.
