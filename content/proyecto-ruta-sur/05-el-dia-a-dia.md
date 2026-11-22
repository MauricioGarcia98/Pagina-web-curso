---
titulo: El día a día - firmware nuevo, relojes, apagones y preguntas del negocio
nivel: Avanzado
duracion: 35
resumen: La flota sigue andando y tu pipeline también. En los próximos días el proveedor actualiza el firmware de la mitad de los equipos, una camioneta amanece con el reloj adelantado, otra se queda sin datos toda la tarde, y comercial, mantenimiento y plataforma te hacen preguntas. Todo llega al tablero.
objetivos: Absorber un cambio de esquema en un stream | Corregir datos con un reloj equivocado | Recalcular resultados con eventos tardíos | Responder preguntas operativas con definiciones claras
prerrequisitos: proyecto-ruta-sur-la-entrega
autoevaluacion: ¿Sabes detectar un reloj adelantado? | ¿Sabes calcular kilómetros con posiciones GPS? | ¿Sabes medir cuánto llegan tarde los eventos?
---

## El tablero

<div data-ruta="tablero"></div>

:::errores
- **Ordenar por offset en vez de por hora del evento**: los eventos guardados sin señal llegan juntos y desordenados; los kilómetros y las secuencias salen mal.
- **Leer siempre el mismo campo**: el firmware 2.0 manda `speed_mps` y `ts` en milisegundos.
- **Confiar ciegamente en la hora del dispositivo**: si un equipo perdió la hora, sus eventos aparecen en el futuro.
- **Cerrar el día y no volver a mirarlo**: los eventos tardíos cambian el SLA de días ya calculados.
:::

:::real En tu computadora y en la web real
Un firmware nuevo o un apagón, en la vida real, se detectan por las alertas de calidad del pipeline o por un aviso del proveedor. Cada caso es un ticket, un pull request y un aviso a operaciones con qué datos están afectados y desde cuándo.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio del proyecto y úsalas en el README.

- `05-alerta.png`: la alerta de calidad y el ticket que la resolvió.

Antes de publicar, tapa con un rectángulo los correos, los IDs de suscripción y de tenant, los nombres de cuentas reales y cualquier clave o token.
:::

## Resumen

- Los streams también cambian de esquema: valida y normaliza por versión.
- Dos relojes: usa el del evento, pero vigila el de llegada (demoras, relojes rotos).
- Decide tu **watermark** y recalcula lo que cambió.
