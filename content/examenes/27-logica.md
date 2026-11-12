# examen: logica

## Primer paso
leccion: logica-metodo
Te dan un problema que nunca viste. ¿Qué haces primero?
- [ ] Empiezas a escribir código para ver qué sale y lo vas corrigiendo sobre la marcha.
- [x] Lo reescribes con tus palabras y lo resuelves a mano con un ejemplo chico.
- [ ] Buscas en internet una solución completa y la copias sin cambios.
- [ ] Eliges la herramienta más potente que conozcas.
porque: Si no puedes resolverlo a mano con 4 datos, todavía no lo entendiste. Lo que haces con la cabeza es el algoritmo.

## Orden de operaciones
leccion: logica-descomponer
"El promedio de los pedidos entregados por país." ¿En qué orden van las operaciones?
- [ ] Agrupar por país, promediar todo y después quitar los cancelados del resultado.
- [x] Filtrar los entregados, agrupar por país y promediar.
- [ ] Promediar todos los pedidos y después agrupar por país.
- [ ] Ordenar por país, tomar los primeros y después filtrar los entregados.
porque: Se filtra lo antes posible. Después de agrupar ya es tarde para sacar filas del promedio.

## Máximo con negativos
leccion: logica-casos-borde
Una función busca el mayor empezando con `mayor = 0`. ¿Con qué entrada falla?
- [ ] Con una lista de números positivos que tiene un solo elemento repetido varias veces.
- [x] Con una lista donde todos los números son negativos.
- [ ] Con una lista ordenada de menor a mayor.
- [ ] Con una lista de enteros grandes, por ejemplo mayores a un millón.
porque: Si todos son negativos, ninguno supera a 0 y la función devuelve 0, que ni siquiera está en la lista. Hay que empezar con el primer elemento.

## Empates
leccion: logica-casos-borde
"Muestra el vendedor que más vendió" y dos empatan. ¿Qué es lo correcto?
- [ ] Devolver el primero que aparezca en la lista, sin avisar, porque el enunciado dice "el" vendedor.
- [x] Devolver los dos, o elegir un desempate y dejarlo escrito.
- [ ] Devolver un error porque el enunciado está mal planteado y no tiene solución.
- [ ] Devolver ninguno.
porque: Un empate es un caso borde: la respuesta segura es devolver todos o declarar el criterio de desempate.

## Diccionario índice
leccion: logica-patrones
¿Por qué usar un `set` para encontrar dos números que suman un objetivo?
- [ ] Porque un set guarda los números ordenados de menor a mayor automáticamente.
- [x] Porque buscar en un set es casi instantáneo y evita un bucle dentro de otro.
- [ ] Porque un set permite elementos repetidos.
- [ ] Porque así el código queda más largo y más fácil de leer para el equipo.
porque: Con un set recorres la lista una sola vez y preguntas "¿ya vi a mi compañero?" en tiempo casi constante. Es la misma idea que hace rápido a un JOIN.

## Comparar con el anterior
leccion: logica-patrones
"Días seguidos en que subieron las ventas." ¿Qué herramienta de SQL corresponde a ese patrón?
- [ ] `GROUP BY` por día con `COUNT(*)` y después `HAVING` para quedarte con los mayores.
- [x] `LAG()` sobre una ventana ordenada por fecha.
- [ ] `DISTINCT` sobre la columna de ventas.
- [ ] Un `UNION ALL` de la tabla consigo misma, ordenado por fecha y sin otra condición.
porque: `LAG()` trae el valor de la fila anterior: es la variable `anterior` del bucle de Python.

## Granularidad
leccion: logica-sql-con-metodo
Antes de escribir una consulta, ¿qué conviene decidir primero?
- [ ] Qué motor de base de datos usar.
- [x] Qué representa cada fila del resultado.
- [ ] Si se usan mayúsculas o minúsculas para las palabras clave de SQL.
- [ ] Cuántos índices tiene cada tabla de la base de datos que vas a consultar.
porque: La granularidad ("una fila por qué") define el GROUP BY, los JOIN y cómo verificas el resultado.

## JOIN que duplica
leccion: logica-sql-con-metodo
Unes pedidos con su detalle y cuentas con `COUNT(*)`. El número es mucho mayor que la cantidad de pedidos. ¿Por qué?
- [ ] Porque el motor cuenta dos veces las filas que tienen valores nulos en alguna columna.
- [x] Porque el JOIN deja una fila por línea de detalle.
- [ ] Porque faltó un ORDER BY.
- [ ] Porque COUNT(*) también cuenta las columnas de la tabla además de las filas.
porque: Después de unir con una tabla de muchas filas por pedido, hay que contar `COUNT(DISTINCT pedido_id)` o agregar antes de unir.

## Spark sin for
leccion: logica-spark-con-metodo
¿Por qué en PySpark no conviene `for fila in df.collect()` para sumar montos?
- [ ] Porque `collect()` borra los datos de la tabla original después de leerlos.
- [x] Porque trae todo a una sola máquina y pierde el trabajo distribuido.
- [ ] Porque los bucles `for` no existen en Python cuando se usa Spark.
- [ ] Porque solo funciona con columnas de texto.
porque: En Spark describes operaciones sobre columnas (`groupBy().agg(...)`) y Spark reparte el trabajo. `collect()` concentra todo en el driver.

## Cliente activo
leccion: logica-pedidos-ambiguos
Te piden "la cantidad de clientes activos". ¿Qué haces?
- [ ] Cuentas todas las filas de la tabla de clientes y entregas ese número.
- [x] Preguntas qué significa "activo" y para qué se usará el número.
- [ ] Cuentas los clientes que alguna vez compraron, en toda la historia de la empresa.
- [ ] Respondes que el pedido está mal hecho y esperas a que lo reescriban completo.
porque: "Activo" esconde una decisión (compra en 30, 90 o 365 días, sesión iniciada…). Preguntar evita entregar el número equivocado.

## Supuestos
leccion: logica-pedidos-ambiguos
No puedes preguntar y hay dos definiciones razonables. ¿Qué es lo más profesional?
- [ ] Elegir una en silencio y entregar solo ese número.
- [x] Elegir una, escribir el supuesto y, si es barato, mostrar también la otra.
- [ ] Promediar el resultado de las dos definiciones y entregar ese promedio como respuesta.
- [ ] No entregar nada hasta que alguien responda, aunque pasen varias semanas.
porque: Un supuesto escrito se corrige en un minuto; uno escondido genera números que nadie entiende.

## Traceback
leccion: logica-depurar
En un traceback de Python, ¿dónde está la información más útil?
- [ ] En la primera línea, la que dice "Traceback (most recent call last)", que indica la causa.
- [x] En la última línea y en la línea de código justo arriba.
- [ ] En el nombre del archivo.
- [ ] En ninguna parte: hay que probar cambios al azar hasta que el error desaparezca.
porque: Se lee de abajo hacia arriba: la última línea dice qué pasó y la de arriba, dónde.

## Error silencioso
leccion: logica-depurar
Una función devuelve un total incorrecto pero no da error. ¿Qué te ayuda más?
- [ ] Volver a ejecutarla varias veces hasta que el resultado cambie por sí solo.
- [x] Probarla con un caso chico que puedas calcular a mano, con un assert.
- [ ] Cambiar los nombres de todas las variables.
- [ ] Agregar más líneas de código para que el programa sea más completo y robusto.
porque: Un assert con un caso conocido convierte un error silencioso en uno que avisa, y te muestra exactamente qué dio.
