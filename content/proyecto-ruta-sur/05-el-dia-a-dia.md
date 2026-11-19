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

## Resumen

- Los streams también cambian de esquema: valida y normaliza por versión.
- Dos relojes: usa el del evento, pero vigila el de llegada (demoras, relojes rotos).
- Decide tu **watermark** y recalcula lo que cambió.
