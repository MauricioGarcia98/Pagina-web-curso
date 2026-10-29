# examen: arquitectura

## Requisitos primero
leccion: arquitectura-que-es
En una entrevista te piden "diseña la plataforma de datos de una app de delivery". ¿Qué haces primero?
- [ ] Dibujar Kafka, Spark y Snowflake, que son el estándar para este tipo de empresa.
- [x] Preguntar por los requisitos: latencia, volumen, usuarios y presupuesto.
- [ ] Elegir la nube más barata, porque el costo es la restricción más importante.
- [ ] Escribir el SQL del tablero principal para saber qué tablas hacen falta.
porque: La arquitectura sale de los requisitos. Un tablero diario y un sistema antifraude en tiempo real llevan diseños muy distintos. Empezar por las herramientas es el error más común.

## CDC
leccion: arquitectura-ingesta
La tabla `pedidos` de PostgreSQL tiene 200 millones de filas, cambia todo el día y también se **borran** filas. ¿Qué tipo de ingesta captura todo sin cargar la base?
- [ ] Una carga completa cada hora, que siempre trae el estado exacto de la tabla.
- [ ] Una carga incremental filtrando por la columna `actualizado_en`.
- [x] CDC leyendo el log de transacciones.
- [ ] Una exportación diaria a CSV desde la base de producción.
porque: La carga completa es pesada; la incremental por fecha no ve los **borrados** (la fila ya no está para consultarla). El CDC lee el log y captura inserts, updates y deletes.

## Lago vs. warehouse
leccion: arquitectura-almacenamiento
¿Qué característica es propia de un data lake y no de un warehouse clásico?
- [ ] Permitir consultar los datos con SQL estándar.
- [x] Guardar archivos de cualquier tipo, incluso crudos, en almacenamiento barato.
- [ ] Ofrecer transacciones ACID sobre tablas.
- [ ] Estar optimizado para tableros de BI con muchos usuarios.
porque: El lago acepta todo, tal como llega, a bajo costo (*schema-on-read*). El warehouse exige esquema al escribir. El lakehouse agrega al lago transacciones y rendimiento con formatos de tabla.

## Lakehouse
leccion: arquitectura-almacenamiento
¿Qué tecnología hace posible un lakehouse?
- [ ] Los archivos CSV, que todos los motores pueden leer sin configuración.
- [x] Los formatos de tabla abiertos, como Delta Lake o Iceberg.
- [ ] Las bases transaccionales (OLTP), replicadas en el lago.
- [ ] Las hojas de cálculo compartidas, conectadas al almacenamiento de objetos.
porque: Sin un formato de tabla, los archivos del lago no tienen transacciones, MERGE ni time travel. Con él, el lago se comporta como un warehouse.

## Batch o streaming
leccion: arquitectura-batch-streaming
¿Qué caso necesita realmente streaming?
- [ ] El reporte de ventas que el directorio revisa cada lunes.
- [ ] El cierre contable de fin de mes.
- [x] Bloquear una compra con tarjeta sospechosa en menos de un segundo.
- [ ] El tablero de marketing que se actualiza cada mañana.
porque: Streaming agrega complejidad y costo; se justifica cuando la decisión pierde valor en segundos. Para lo demás, un batch diario u horario alcanza.

## Medallón
leccion: arquitectura-diseno-lakehouse
¿Por qué la capa bronze guarda los datos **tal como llegan**, sin limpiar?
- [ ] Para ahorrar espacio, porque los datos crudos se comprimen mejor que los limpios.
- [x] Para poder reprocesar desde el origen y auditar lo que llegó.
- [ ] Porque los analistas consultan bronze directamente para sus tableros.
- [ ] Porque los formatos de tabla no permiten transformar en la primera capa.
porque: Si solo guardas datos ya transformados y la transformación estaba mal, no hay vuelta atrás. Bronze es el respaldo reproducible.

## Contratos
leccion: arquitectura-diseno-lakehouse
El equipo de la app renombró la columna `monto` a `importe` sin avisar y se rompieron los tableros. ¿Qué práctica lo hubiera evitado?
- [ ] Más memoria en el clúster, para que el pipeline tolere columnas desconocidas.
- [x] Un contrato de datos validado en el CI del equipo que produce los datos.
- [ ] Un clúster más grande, para reprocesar más rápido cuando algo se rompe.
- [ ] Migrar a otra nube con mejor compatibilidad entre esquemas.
porque: El contrato hace explícito qué se promete a los consumidores. Si un cambio lo rompe, el CI del productor falla antes de llegar a producción.

## Observabilidad
leccion: arquitectura-calidad-gobierno
El pipeline terminó "en verde", pero hoy cargó 900 filas cuando lo normal son 50.000. ¿Qué tipo de control lo detecta?
- [ ] El reintento automático de la tarea, que detecta cuando faltan filas.
- [x] Monitoreo del volumen con alertas ante desvíos.
- [ ] Un índice sobre la tabla, que avisa cuando cambia la cantidad de filas.
- [ ] El linaje de la tabla, que marca en rojo las cargas incompletas.
porque: Que un proceso termine sin error no significa que los datos estén bien. La observabilidad de datos mira volumen, frescura, esquema y distribución.

## Data mesh
leccion: arquitectura-patrones-modernos
¿Qué propone el data mesh?
- [ ] Juntar todos los datos de la empresa en una única tabla ancha compartida.
- [x] Que cada dominio sea dueño de sus datos y los publique como productos.
- [ ] Reemplazar SQL por Python en todos los equipos de datos.
- [ ] Procesar todos los datos en streaming para eliminar los procesos batch.
porque: Es una respuesta organizacional al cuello de botella de un equipo central de datos. Tiene sentido en organizaciones grandes con muchos dominios.

## Capa semántica
leccion: arquitectura-patrones-modernos
En la reunión de directorio, finanzas y marketing muestran dos números distintos de "ventas del mes". ¿Qué lo resuelve de raíz?
- [ ] Que cada área tenga su propio tablero con su propia definición de ventas.
- [x] Una capa semántica donde "ventas" se define una sola vez.
- [ ] Exportar los datos a Excel para que cada área calcule las ventas.
- [ ] Agregar memoria al warehouse para que los dos cálculos coincidan.
porque: Si cada herramienta define la métrica a su manera, las diferencias son inevitables. La capa semántica centraliza la fórmula, los filtros y las granularidades.
