---
titulo: El día a día - categorías nuevas, una sucursal sin internet, una planilla que cambia y preguntas de Dirección
nivel: Avanzado
duracion: 35
resumen: En los días siguientes Compras divide una categoría directo en la base, una sucursal se queda sin internet y manda las ventas repetidas, Planeamiento reorganiza la planilla y Dirección, Comercial y Finanzas te hacen preguntas. Todo en el tablero.
objetivos: Detectar cambios que no pasan por el proceso habitual | Manejar datos que llegan tarde y repetidos | Mantener una ingesta de planillas cuando cambia el formato | Responder preguntas de retail con definiciones claras
prerrequisitos: proyecto-almacenes-sol-la-entrega
autoevaluacion: ¿Sabes por qué un incremental por fecha de modificación pierde cambios? | ¿Sabes qué mostrar mientras faltan los datos de una sucursal? | ¿Sabes calcular el ticket promedio?
---

## El tablero

<div data-sol="tablero"></div>

:::errores
- **Calcular el margen con el costo de hoy**: el margen del pasado cambia cada vez que cambia un costo.
- **Cargar el ERP por `ult_modif`**: los cambios cargados a mano no la actualizan.
- **Saltear un día de foto**: lo que cambió ese día no se puede reconstruir.
- **Mostrar "0" cuando faltan datos**: una sucursal sin datos no es una sucursal sin ventas.
- **No deduplicar al reintentar**: las cajas reenvían tickets cuando vuelve la conexión; `ticket_id` es la llave.
- **Leer la planilla por posición**: cuando Planeamiento cambia columnas o nombres, usa el código de sucursal, no el nombre ni la columna 2.
:::

:::real En tu computadora y en la web real
Una sucursal sin internet manda sus tickets tarde: en la vida real, el pipeline tiene que aceptar datos atrasados y recalcular los días afectados. Cada caso es un ticket con su pull request y un aviso a Comercial si cambian números ya publicados.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio del proyecto y úsalas en el README.

- `04-ticket.png`: un ticket resuelto con la explicación del recálculo.

Antes de publicar, tapa con un rectángulo los correos, los IDs de suscripción y de tenant, los nombres de cuentas reales y cualquier clave o token.
:::

## Resumen

- Los cambios "por fuera" del proceso habitual existen: compara fotos completas.
- Los datos llegan tarde y repetidos: deduplica y distingue "sin datos" de "cero".
- Las planillas cambian: une por códigos, no por nombres ni posiciones.
