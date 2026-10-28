# examen: pipelines

## De la regla al código
leccion: pipelines-de-la-regla-al-codigo
El negocio dice: "un cliente está en mora si tiene una cuota vencida hace más de 30 días". ¿Qué es lo primero que conviene escribir?
- [ ] El DAG de Airflow, para saber en qué orden van a correr los pasos.
- [x] Casos de ejemplo con la respuesta esperada, incluidos los bordes.
- [ ] El código de PySpark más eficiente posible para el volumen actual.
- [ ] El tablero, para que el negocio confirme que es lo que necesita.
porque: Los casos de ejemplo obligan a aclarar la regla con el negocio y se transforman en pruebas automáticas. ¿"Más de 30" incluye el día 30? Mejor resolverlo antes de programar.

## Dinero
leccion: pipelines-banco-python
¿Por qué no se usan números de punto flotante (`float`) para montos de dinero?
- [ ] Porque `float` no acepta decimales con más de dos cifras.
- [x] Porque no representan exactamente valores como 0,1 y el error se acumula.
- [ ] Porque `float` ocupa el doble de memoria que un entero.
- [ ] Porque no se pueden sumar `float` con enteros sin convertirlos antes.
porque: `0.1 + 0.2` da `0.30000000000000004`. En un banco, esos centavos acumulados en millones de operaciones descuadran los balances.

## Idempotencia
leccion: pipelines-banco-pipeline
¿Qué patrón hace idempotente una carga diaria en una tabla particionada por fecha?
- [ ] Un `INSERT` con los datos del día cada vez que corre la tarea.
- [x] Reemplazar la partición del día o hacer MERGE por clave.
- [ ] Borrar la tabla completa y cargar solo el día que se está procesando.
- [ ] Agregar un `DISTINCT` en todas las consultas de los tableros.
porque: Reemplazar exactamente lo que el proceso produce deja el mismo resultado sin importar cuántas veces corra. El `INSERT` duplica en cada reintento.

## Features
leccion: pipelines-streaming
Para entrenar un modelo de churn, calculas "días desde la última reproducción" usando los datos de **hoy** para todos los meses de entrenamiento. ¿Qué error es?
- [ ] Ninguno, porque los datos de hoy son los más completos y confiables.
- [x] Fuga de información del futuro (*data leakage*).
- [ ] Skew, porque los clientes antiguos tienen más reproducciones.
- [ ] Fan-out, porque cada cliente aparece en varios meses.
porque: Si una feature usa información posterior a la fecha de corte, el modelo parece muy bueno en el entrenamiento y falla en producción. Las features se calculan "a fecha de corte".

## Zonas horarias
leccion: pipelines-viajes
Un viaje en Lima empezó el 31/12 a las 22:00 hora local y se guardó en UTC. ¿En qué día debe contarse para el reporte local?
- [ ] El 1/1, porque en UTC ya era el 1/1 a las 03:00.
- [x] El 31/12, porque se convierte a la hora local antes de truncar al día.
- [ ] Depende de la zona horaria del servidor donde corre el pipeline.
- [ ] Se descarta, porque cae entre dos días distintos.
porque: Guardar en UTC es buena práctica, pero los reportes se agrupan por el día **local** del negocio. Truncar en UTC mueve viajes de la noche al día siguiente.

## Prorrateo
leccion: pipelines-saas
Un cliente sube de un plan de 30 a uno de 90 el día 16 de un mes de 30 días. Con prorrateo diario, ¿cuánto se le cobra extra ese mes?
- [ ] 60
- [x] 30
- [ ] 90
- [ ] 45
porque: Le quedan 15 de 30 días con el plan nuevo: la diferencia (90 − 30 = 60) por la mitad del mes = 30. Los prorrateos son una fuente clásica de errores de redondeo y de bordes.

## Costo FIFO
leccion: pipelines-logistica
Compraste 10 unidades a 5 y luego 10 a 7. Vendes 15 unidades. Con método FIFO, ¿cuál es el costo de lo vendido?
- [ ] 105
- [x] 85
- [ ] 90
- [ ] 75
porque: FIFO consume primero lo más antiguo: 10 × 5 = 50 y 5 × 7 = 35, en total 85. Quedan 5 unidades a 7 en stock.

## Generar tareas
leccion: pipelines-vuelos
Tienes que procesar 40 aeropuertos con la misma lógica. ¿Qué es mejor en Airflow?
- [ ] Escribir las 40 tareas a mano, para que cada una se pueda personalizar.
- [x] Generar las tareas desde una lista o con `.expand()`.
- [ ] Un bucle dentro de una sola tarea que procese los 40 en serie.
- [ ] Un DAG por aeropuerto, copiado y pegado a partir de una plantilla.
porque: Generar tareas por código mantiene una sola lógica, permite paralelismo y reintentar solo el aeropuerto que falló.

## RFM
leccion: pipelines-tienda
¿Qué miden las letras de la segmentación RFM?
- [ ] Rentabilidad, Fidelidad y Marca.
- [x] Recencia, Frecuencia y Monto.
- [ ] Región, Fecha y Margen.
- [ ] Reclamos, Facturas y Mora.
porque: RFM es un método simple y muy usado para segmentar clientes: los que compraron hace poco, seguido y por montos altos son los más valiosos.

## Cuarentena
leccion: pipelines-clinica
¿Qué ventaja tiene mandar las filas inválidas a una tabla de cuarentena con el motivo, en lugar de descartarlas?
- [ ] Ninguna: ocupa más espacio y nadie revisa esas tablas.
- [x] Se puede medir, avisar, corregir y reprocesar sin perder nada.
- [ ] Hace que el pipeline no falle nunca, aunque cambie el esquema.
- [ ] Evita tener que escribir reglas de validación.
porque: La cuarentena convierte los datos malos en información accionable. Con una alerta por umbral, el equipo se entera si la proporción de errores se dispara.
