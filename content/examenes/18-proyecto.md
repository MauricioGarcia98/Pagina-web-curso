# examen: proyecto

## Arquitectura del proyecto
leccion: proyecto-arquitectura
En el proyecto final, ¿qué demuestra más madurez profesional ante un entrevistador?
- [ ] Usar la mayor cantidad posible de herramientas, para mostrar que conoces todo el ecosistema.
- [x] Explicar por qué elegiste cada pieza y qué alternativas descartaste.
- [ ] Tener mucho código, porque los entrevistadores miden el esfuerzo por la cantidad de líneas.
- [ ] Saltear las pruebas para llegar a más funcionalidades antes de la entrevista.
porque: Los entrevistadores evalúan el criterio: entender las compensaciones (costo, complejidad, latencia) vale más que la lista de tecnologías.

## Informe ejecutivo
leccion: proyecto-caso-sql
El directorio pide "el crecimiento de ventas del trimestre". Diciembre todavía no terminó. ¿Qué haces?
- [ ] Comparar el trimestre incompleto con el anterior completo, porque es el dato disponible.
- [x] Comparar períodos equivalentes y dejar explícita la fecha de corte.
- [ ] Esperar a enero para enviar el informe completo, sin avisar al directorio del retraso.
- [ ] Completar los días que faltan con el promedio diario y presentarlo como dato real.
porque: Comparar un período incompleto con uno completo exagera la caída. Las comparaciones deben ser "manzanas con manzanas" y la fecha de corte siempre visible.

## Pipeline PySpark
leccion: proyecto-caso-pyspark
Tu pipeline lee bronze, limpia, une y agrega. ¿Qué estructura facilita probarlo?
- [ ] Un solo notebook de 600 líneas, para ver todo el flujo junto.
- [x] Funciones que reciben y devuelven DataFrames, probadas con datos chicos.
- [ ] Variables globales compartidas entre todos los pasos del pipeline.
- [ ] Probarlo directamente en producción con los datos reales.
porque: Las funciones que transforman DataFrames se prueban con pytest y datos mínimos. El notebook o el job solo las orquesta.

## Grano del modelo
leccion: proyecto-rapido-modelo
En el modelo de Rápido, quieres analizar tiempos de cada etapa del pedido (aceptado, preparado, retirado, entregado). ¿Qué tipo de tabla de hechos corresponde?
- [ ] Una tabla transaccional con una fila por ítem del pedido y la fecha de cada ítem.
- [x] Un accumulating snapshot, con una fila por pedido.
- [ ] Un snapshot periódico con una fila por pedido y por día mientras el pedido siga abierto.
- [ ] Una dimensión de pedidos con una columna por etapa, actualizada con SCD tipo 1.
porque: El *accumulating snapshot* sigue procesos con etapas conocidas y permite calcular la duración entre hitos fácilmente.

## Producción
leccion: proyecto-rapido-pipeline
¿Qué debe tener un pipeline para considerarse "en producción"?
- [ ] Que haya corrido una vez sin errores en tu computadora con los datos de prueba.
- [x] Ejecución programada, idempotencia, pruebas, alertas y despliegue automático.
- [ ] Un notebook con gráficos que muestren el resultado de cada paso para el negocio.
- [ ] Correr en el clúster más grande disponible para que nunca se quede sin memoria.
porque: Producción significa que corre solo, se recupera de fallos, avisa cuando algo sale mal y otra persona puede mantenerlo.

## Entrevista de SQL
leccion: proyecto-entrevistas-carrera
En una entrevista de SQL, te dan un problema y no sabes la solución completa de inmediato. ¿Qué es lo mejor?
- [ ] Quedarte en silencio hasta tener la solución completa, para no mostrar dudas.
- [x] Pensar en voz alta, aclarar supuestos y avanzar por pasos.
- [ ] Escribir algo rápido sin explicar, porque la velocidad es lo que más se evalúa.
- [ ] Pedir pasar a la siguiente pregunta y volver a esta si sobra tiempo al final.
porque: El entrevistador evalúa cómo razonas. Aclarar supuestos y construir paso a paso muestra método aunque la primera versión no sea perfecta.

## Diseño de sistemas
leccion: proyecto-entrevistas-carrera
En una entrevista de diseño, ¿qué deberías mencionar siempre después de dibujar el flujo principal?
- [ ] El nombre de tu herramienta favorita y por qué es mejor que todas las alternativas.
- [x] Fallos, datos tardíos, calidad, monitoreo, seguridad y costo.
- [ ] Nada más: si el flujo principal es correcto, lo demás se resuelve en la implementación.
- [ ] El precio exacto de cada servidor, porque el costo es lo primero que se evalúa.
porque: El "camino feliz" lo dibuja cualquiera. Lo que distingue a un perfil senior es pensar en lo que puede salir mal y cómo se opera el sistema.

## Portafolio
leccion: proyecto-entrevistas-carrera
¿Qué hace más valioso un proyecto de portafolio en GitHub?
- [ ] Muchos archivos y carpetas, para que se note la cantidad de trabajo invertido.
- [x] Un README con el problema, la arquitectura, cómo correrlo y las decisiones.
- [ ] Un tutorial copiado tal cual, porque así es seguro que todo el código funciona.
- [ ] Mantenerlo privado y compartirlo solo si lo piden, para que nadie copie el código.
porque: Quien revisa tu perfil dedica pocos minutos. Un README que cuenta el problema, la solución y las decisiones muestra comunicación y criterio.

## Dimensionar
leccion: proyecto-arquitectura
La empresa tiene 20 GB de datos y un equipo de dos personas. ¿Qué arquitectura es más razonable para empezar?
- [ ] Kafka, Flink, Spark y un data mesh con cinco dominios.
- [x] Un warehouse gestionado (o Postgres y DuckDB), dbt y un orquestador simple.
- [ ] Un clúster de Hadoop propio en servidores de la oficina.
- [ ] Ninguna: con 20 GB no hace falta organizar los datos.
porque: La arquitectura debe ajustarse al tamaño de los datos y del equipo. Sobredimensionar agrega costo y mantenimiento sin beneficio; se escala cuando hace falta.

## Aprender después
leccion: proyecto-entrevistas-carrera
Terminaste el curso. ¿Qué es lo que más acelera tu siguiente paso profesional?
- [ ] Hacer otro curso igual inmediatamente para reforzar.
- [x] Construir y publicar un proyecto propio de punta a punta.
- [ ] Memorizar el glosario completo antes de practicar.
- [ ] Esperar a saberlo todo antes de postularte a un trabajo.
porque: Un proyecto propio demuestra que sabes aplicar lo aprendido y te da material concreto para las entrevistas.
