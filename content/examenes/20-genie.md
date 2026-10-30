# examen: genie

## Qué producto
leccion: genie-que-es-genie
Un analista quiere ayuda para escribir y corregir el PySpark de su notebook. ¿Qué producto de la familia Genie usa?
- [ ] Un Genie Agent configurado con las tablas del notebook.
- [ ] Genie One, desde la aplicación móvil.
- [x] Genie Code.
- [ ] Un benchmark con el código esperado.
porque: Genie Code es el asistente de código para personas técnicas. Los Genie Agents responden preguntas de negocio sobre datos y Genie One es la interfaz para personas de negocio.

## Preguntas que responde
leccion: genie-que-es-genie
¿Cuál de estas preguntas responde bien un Genie Agent de ventas?
- [ ] ¿Por qué cayeron las ventas en abril respecto de marzo?
- [x] ¿Cuántos pedidos hubo por canal en abril de 2024?
- [ ] ¿Qué estrategia de precios conviene para el próximo trimestre?
- [ ] ¿Cuáles son los mejores clientes de la tienda?
porque: Genie traduce preguntas a SQL: responde preguntas específicas y medibles. Las preguntas de causas u opinión, o ambiguas ("mejores"), no tienen una consulta única que las responda.

## Permisos
leccion: genie-que-es-genie
El autor de un agente tiene acceso a la tabla de sueldos. Un usuario sin ese permiso le pregunta al agente por sueldos. ¿Qué pasa?
- [ ] Ve los sueldos, porque el agente siempre consulta con las credenciales y permisos de su autor.
- [x] No ve esos datos: Genie los lee con los permisos de Unity Catalog de quien pregunta.
- [ ] El agente da un error de permisos y queda desactivado para todos los usuarios.
- [ ] Ve los sueldos, pero agregados por área para proteger a cada persona.
porque: El agente usa las credenciales del autor solo para el SQL warehouse; el acceso a datos siempre se evalúa con la identidad del usuario.

## Cantidad de tablas
leccion: genie-preparar-los-datos
Vas a crear el primer agente para el área de compras. ¿Qué haces con las tablas?
- [ ] Agrego las 50 tablas del esquema, el máximo permitido, para que Genie elija las que necesite en cada pregunta.
- [x] Elijo las pocas que responden las preguntas del área (idealmente cinco o menos) y las simplifico.
- [ ] Agrego una sola tabla cruda de bronze, porque tiene todos los datos originales sin transformar.
- [ ] Agrego todas las tablas y dejo que Genie Code escriba las descripciones.
porque: La documentación recomienda agentes enfocados, con pocas tablas bien documentadas y simplificadas con vistas o vistas de métricas.

## Vista de métricas
leccion: genie-preparar-los-datos
¿Qué ventaja tiene definir "ticket promedio" en una vista de métricas?
- [ ] Se calcula siempre más rápido que cualquier consulta, porque guarda los resultados por adelantado en una tabla.
- [x] Se define una sola vez y se puede agrupar por cualquier campo de la vista, en Genie, tableros y BI.
- [ ] Ya no necesita permisos de Unity Catalog, así que cualquier usuario de la empresa puede consultarla.
- [ ] Reemplaza a las tablas Delta.
porque: Una vista de métricas separa las medidas de los campos de agrupación; el motor calcula cada medida al grano que se pide.

## Orden de las herramientas
leccion: genie-crear-y-afinar-un-agente
Los usuarios usan mucho el término "clientes corporativos". ¿Cómo lo defines en el agente?
- [ ] Con una instrucción de texto larga que explique el término con ejemplos de preguntas.
- [x] Con una SQL expression de tipo filtro (`segmento = 'Corporativo'`) y sus sinónimos.
- [ ] Con un benchmark que tenga la pregunta y su respuesta correcta en SQL.
- [ ] No hace falta definirlo.
porque: Para términos de negocio que se repiten, la documentación recomienda SQL expressions; las instrucciones de texto son el último recurso.

## Valores que no coinciden
leccion: genie-crear-y-afinar-un-agente
Los usuarios preguntan por "el local" y en los datos el canal es `tienda`. Genie escribe `WHERE canal ILIKE '%local%'` y no encuentra nada. ¿Qué lo resuelve mejor?
- [ ] Renombrar el valor `tienda` como `local` en la tabla de origen y en todos los tableros.
- [x] Sinónimos en la columna y entity matching, para que Genie conozca los valores.
- [ ] Un benchmark nuevo con la pregunta del local y su respuesta correcta.
- [ ] Desactivar format assistance para que Genie no se confunda con los valores de muestra.
porque: Entity matching guarda los valores distintos de la columna y los sinónimos conectan el lenguaje de los usuarios con esos valores.

## Respuesta verificada
leccion: genie-crear-y-afinar-un-agente
¿Qué hace que una respuesta de Genie aparezca como verificada?
- [ ] Que el usuario la marque como correcta con Yes y el autor apruebe esa calificación.
- [x] Que Genie use exactamente un trusted asset: consulta con parámetros o función de UC.
- [ ] Que la respuesta incluya un gráfico generado automáticamente a partir de la tabla.
- [ ] Que el agente esté certificado con la etiqueta de certificación de Unity Catalog.
porque: Los trusted assets son lógica verificada por el autor; cuando Genie responde con uno, la respuesta se marca como verificada.

## Calificación de benchmarks
leccion: genie-evaluar-y-monitorear
El SQL Answer devuelve `canal` y `ventas`. Genie devuelve las mismas filas en otro orden. ¿Cómo se califica en modo chat?
- [x] Good.
- [ ] Bad.
- [ ] Manual review.
- [ ] No se califica.
porque: Mismos datos en distinto orden es Good. Columnas de más, resultado vacío o error son Bad; sin SQL Answer queda en revisión manual.

## Benchmarks y contexto
leccion: genie-evaluar-y-monitorear
¿Genie usa las preguntas de los benchmarks para responder mejor?
- [ ] Sí: Genie los usa como consultas de ejemplo cuando llega una pregunta parecida.
- [x] No: los benchmarks son solo para evaluar.
- [ ] Solo los que tienen SQL Answer, que se agregan al knowledge store.
- [ ] Solo en modo agente, donde el modelo juez los incorpora al contexto.
porque: Para enseñarle algo a Genie se usan consultas de ejemplo, SQL expressions o instrucciones; los benchmarks miden.

## Genie Code y /fix
leccion: genie-genie-code
Aceptas la corrección que propone `/fix`. ¿Qué pasa?
- [ ] Se ejecuta la celda automáticamente con la corrección aplicada y se muestra el resultado.
- [x] El código cambia en la celda pero no se ejecuta: lo revisas y ejecutas tú.
- [ ] Se hace commit en la carpeta Git del notebook con un mensaje generado.
- [ ] Se crea un job que ejecuta el notebook corregido.
porque: La documentación indica que el código aceptado no se ejecuta solo; la revisión sigue siendo responsabilidad de quien programa.

## Sondeo de la API
leccion: genie-genie-one-tableros-y-api
Tu aplicación envió una pregunta por la API de Genie. ¿Cómo consultas el estado?
- [ ] Cada 100 milisegundos y sin límite de tiempo, para mostrar la respuesta lo antes posible al usuario.
- [x] Cada 1 a 5 segundos con espera creciente hasta un estado final, cortando a los 10 minutos.
- [ ] Una sola vez, a los 30 segundos, que es lo que tarda en promedio una respuesta de Genie.
- [ ] No hace falta: el resultado llega completo en la respuesta de la llamada que inicia la conversación.
porque: Son las buenas prácticas de la documentación: evita carga innecesaria y no espera para siempre.

## Datos por región
leccion: genie-genie-one-tableros-y-api
Cada vendedor debe ver solo su región en el mismo agente. ¿Qué haces?
- [ ] Un agente por región, cada uno con su copia de la tabla filtrada.
- [x] Un filtro de filas en Unity Catalog sobre la tabla.
- [ ] Una instrucción de texto que diga que muestre solo la región del usuario.
- [ ] Un benchmark por región para comprobar qué ve cada vendedor.
porque: Genie respeta los filtros de filas y máscaras de Unity Catalog para cada usuario: un solo agente sirve a todos.
