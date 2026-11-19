---
titulo: La entrega - qué tablas, con qué columnas, y la revisión automática
nivel: Avanzado
duracion: 25
resumen: La especificación exacta de las cuatro tablas que hay que entregar, la definición de terminado y el panel que revisa tu trabajo contra lo que pasó de verdad en la tienda. Lo que no está acá lo decides tú - herramientas, orden, cómo organizas bronze, cuántas veces corres cada cosa.
objetivos: Construir tablas que cumplan una especificación exacta | Mantener una tabla al día con snapshot + CDC sin perder ni duplicar cambios | Conciliar dos sistemas con categorías acordadas | Usar una revisión automática como lo harías con los tests de un equipo
prerrequisitos: proyecto-mercado-vecino-las-notas-del-equipo
autoevaluacion: ¿Sabes qué es _lsn y por qué lo pide la entrega? | ¿Sabes qué pagos entran en la conciliación y cuáles no? | ¿Sabes qué hacer cuando la revisión dice que un pedido tiene otro estado?
---

## Las tablas

Todas en el catálogo `mercado` del [Databricks de práctica](#/databricks). Los nombres de columna tienen que ser exactamente estos (puedes agregar otras).

### mercado.silver.pedidos

| Columna | Tipo | Regla |
|---|---|---|
| `pedido_id` | entero | Un registro por pedido que **existe en la base** (los de CobroSur también) |
| `cliente_id` | entero | |
| `estado` | texto | El de la base |
| `total` | decimal | En pesos |
| `creado_en`, `actualizado_en` | timestamp | |
| `_lsn` | entero | El `source.lsn` del último cambio aplicado a esa fila. **0** si la fila viene del snapshot y no tuvo cambios después |

La revisión toma el `_lsn` más alto de tu tabla y compara **todas** las filas con el estado de la base en ese punto: ni pedidos de más (borrados que no aplicaste), ni de menos, ni con otro estado o total.

### mercado.silver.clientes

`cliente_id`, `nombre`, `email`, `telefono`, `barrio`, `_lsn`. Un cliente que pidió el borrado de sus datos queda con el `email` en NULL, como en la base.

### mercado.silver.pagoya_eventos

| Columna | Regla |
|---|---|
| `evento_id` | Único |
| `tipo` | Al menos `pago.aprobado`, `reembolso.creado`, `disputa.abierta`, `disputa.cerrada` |
| `creado` | Timestamp del evento |
| `pago_id`, `pedido_id`, `monto` | Los que correspondan al tipo |

Tiene que tener **todos** los eventos de esos tipos de los días cerrados (también los de antes de que configuraras el webhook) y **ninguno** que no sea de PagoYa.

### mercado.gold.conciliacion

| Columna | Regla |
|---|---|
| `pago_id` | Un registro por pago **aprobado** cuyo día de aprobación (hora de la tienda) ya terminó |
| `pedido_id` | entero |
| `fecha` | Día de aprobación, hora de la tienda (UTC-3) |
| `monto` | En pesos |
| `categoria` | `contracargo`, `en_disputa`, `reembolsado`, `pago_sin_pedido`, `cobrado_y_cancelado` u `ok` (ver [El pedido](#/l/proyecto-mercado-vecino-el-pedido)) |
| `liquidado_el` | La fecha de la liquidación que incluyó el cobro, o NULL si todavía no se publicó |

La realidad sigue cambiando (llegan disputas, reembolsos, liquidaciones): la revisión acepta lo que era cierto en las **últimas 6 horas**. Si tu tabla es más vieja, vuelve a correr tu proceso.

## Definición de terminado

- [ ] Las cuatro tablas pasan la revisión.
- [ ] Las credenciales están en un Key Vault y tu código las lee de ahí (o de variables de entorno), no las tiene escritas.
- [ ] Puedes volver a correr todo sin duplicar nada (idempotente).
- [ ] Si mañana tu proceso no corre, sabes qué se pierde y cómo recuperarlo (escríbelo en una nota de operación).
- [ ] Le puedes explicar a Valentina, sin jerga, por qué la liquidación de un día no coincide con las ventas de ese día.

## La revisión

<div data-mercado="revisar"></div>

:::tip Cómo usar la revisión
Úsala como los tests de un equipo: córrela seguido, lee la pista completa y arregla de a una cosa. Las pistas dicen **qué** está mal y dan una idea de **por qué**, pero no cómo arreglarlo. Si algo que crees correcto no pasa, probablemente tu suposición es la de las notas de Diego.
:::

## Para ir más allá (no se revisa)

- **Orquestar**: un DAG de Airflow o un job de Databricks que corra todo cada hora, con el offset de Kafka guardado en una tabla de control.
- **Alertas**: avisar si el grupo de consumo se atrasa más de 12 horas (antes de que la retención borre algo).
- **Calidad**: una tabla de "entregas rechazadas" (firma inválida, repetición) con el motivo, para que seguridad la mire.
- **El correo a Valentina**: una tabla `gold.conciliacion_diaria` con, por día, cobrado, reembolsado, contracargos, comisiones y neto, que cuadre con cada liquidación.

## Ejercicios

:::ejercicio quiz
Hiciste el snapshot a las 10:00 y consumiste el CDC a las 9:30 (antes del snapshot). La revisión dice que hay pedidos con otro estado. ¿Qué pasó?
- [ ] El CDC tiene errores
- [x] Tu _lsn más alto es de antes del snapshot, pero las filas del snapshot ya tienen cambios posteriores: hay que consumir el CDC después del snapshot (y aplicar todo lo que se solape)
- [ ] La réplica estaba atrasada 30 minutos
- [ ] Hay que esperar 24 horas
:::

:::ejercicio quiz
Hoy a las 9:00 se aprobaron 12 pagos. ¿Van en la conciliación que entregas hoy?
- [ ] Sí, todos los pagos aprobados van
- [x] No: solo entran los pagos de días ya cerrados (hora de la tienda)
- [ ] Solo los que ya se liquidaron
- [ ] Solo si tienen pedido
:::

## Resumen

- Cuatro tablas con columnas exactas; `_lsn` dice hasta dónde aplicaste el CDC.
- La conciliación: un registro por pago aprobado de días cerrados, con categoría y fecha de liquidación.
- La revisión compara contra lo que pasó de verdad en la tienda, con pistas.
- Terminado no es "pasa la revisión": también es seguro, idempotente y explicable.
