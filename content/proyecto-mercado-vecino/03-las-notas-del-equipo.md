---
titulo: Las notas del equipo - lo que dejó el ingeniero anterior
nivel: Avanzado
duracion: 20
resumen: Antes de irse, Diego dejó un documento con lo que sabía del sistema, un script de carga incremental y una lista de "cosas raras". Como pasa siempre, mezcla información valiosa con suposiciones que nunca verificó. Leerlo con ojo crítico es parte del trabajo.
objetivos: Aprovechar la documentación heredada sin creérsela entera | Detectar por qué una carga incremental por fecha de modificación pierde cambios | Distinguir un síntoma de su causa | Convertir las "cosas raras" en casos de prueba
prerrequisitos: proyecto-mercado-vecino-fuentes-y-accesos
autoevaluacion: ¿Sabes qué cambios no ve una carga incremental por actualizado_en? | ¿Sabes por qué un borrado físico no aparece en una consulta? | ¿Sabes qué afirmaciones de las notas hay que verificar antes de usarlas?
---

:::escenario Martes, 11:30
Encuentras en la wiki una página llamada "Handover - datos de ventas (Diego)". Última edición: hace una semana. Debajo, un archivo `carga_pedidos.sql` y un hilo de Slack pegado.
:::

## El documento de Diego

> **Cómo armo el reporte de ventas hoy**
>
> 1. Todas las mañanas corro `carga_pedidos.sql` contra la réplica: trae los pedidos modificados desde la última corrida (por `actualizado_en`) y los pego en la planilla.
> 2. Los pagos los saco del panel de PagoYa, exportando a Excel.
> 3. Cruzo por `pago_ref`.
>
> **Cosas que sé**
>
> - `actualizado_en` se actualiza siempre que cambia un pedido. (Lo puso el equipo de la app hace un año.)
> - Los pedidos nunca se borran: cuando hay fraude se cancelan.
> - Los webhooks de PagoYa ya los guarda la función mv-webhooks. Están firmados, así que son confiables.
> - La liquidación es "día siguiente", fácil de cruzar por fecha.
> - Las fechas de la base están en hora local. Creo.
>
> **Cosas raras que vi y no llegué a mirar**
>
> - Hay días en que la planilla tiene menos cancelados que el panel de la app.
> - Contracargos de pedidos que no encuentro en la base.
> - El total de algún pedido cambió después de que lo cargué.
> - Una vez la función guardó un pago aprobado de $8.400 de un pedido que no existe.
> - Algunos webhooks repetidos (¿bug de PagoYa?).

## carga_pedidos.sql

```sql norun
-- corre cada mañana; :ultima_corrida la guardo a mano en un txt
SELECT id, cliente_id, estado, total, pago_ref, actualizado_en
FROM pedidos
WHERE actualizado_en > :ultima_corrida
ORDER BY actualizado_en;
```

## El hilo de Slack

> **Martín (backend, app):** el endpoint del backoffice para cancelar es viejo, hace un UPDATE del estado y listo. Nunca lo migramos al ORM nuevo.
>
> **Lucía (riesgo):** cuando confirmamos fraude borramos el pedido y sus ítems, para que no aparezca en el panel de los comercios. Lo hacemos desde hace dos semanas, antes los cancelábamos.
>
> **Martín:** ojo que la función de webhooks tiene un timeout de 3 segundos. Si la escritura en el storage tarda, PagoYa reintenta.
>
> **Valentina (finanzas):** soporte a veces devuelve la plata directo desde el panel de PagoYa, sin tocar el pedido en la app.

:::trabajo Qué hacer con esto
Ninguna nota es mala intención: es lo que Diego sabía. Pero cada "cosa que sé" es una **hipótesis** hasta que la verificas contra las fuentes. Y cada "cosa rara" es un **caso de prueba** gratis: si tu solución explica todas, vas bien. Contrasta el documento con el hilo de Slack: ahí ya hay varias respuestas.
:::

:::real En tu computadora y en la web real
En la empresa, estas notas están en la **wiki** (Confluence, Notion), en un repositorio viejo y en hilos de Slack/Teams. Léelas con un archivo abierto al lado (`docs/hallazgos.md` en VS Code) y anota, por cada nota: **qué dice**, **si sigue siendo cierto** (lo verificas con una consulta) y **qué decisión implica** para tu diseño.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio del proyecto y úsalas en el README.

- `03-hallazgos.png`: tu `hallazgos.md` con lo que se confirmó y lo que no.

Antes de publicar, tapa con un rectángulo los correos, los IDs de suscripción y de tenant, los nombres de cuentas reales y cualquier clave o token.
:::

## Ejercicios

:::ejercicio quiz
Según el hilo, el backoffice cancela con un UPDATE del estado "y listo". ¿Qué le pasa a carga_pedidos.sql?
- [ ] Nada, porque el estado cambió
- [x] No ve esas cancelaciones: si actualizado_en no cambia, la fila no entra en WHERE actualizado_en > :ultima_corrida
- [ ] Las trae dos veces
- [ ] Falla con un error de permisos
:::

:::ejercicio quiz
Riesgo borra los pedidos con fraude. ¿Cómo te enteras de esos borrados?
- [ ] Con un SELECT de los pedidos con estado = 'borrado'
- [ ] Comparando actualizado_en
- [x] Con el CDC (mensajes op = 'd'), o comparando el conjunto completo de ids contra tu copia
- [ ] No hace falta: un pedido borrado no tiene pagos
:::

:::ejercicio quiz
Diego dice que los webhooks "están firmados, así que son confiables". ¿Qué falta en ese razonamiento?
- [ ] Nada: si llegaron al endpoint son de PagoYa
- [x] Que la función guarda todo sin verificar: estar firmado solo sirve si alguien verifica la firma (y la antigüedad de t)
- [ ] Que hay que pedirle a PagoYa que deje de firmarlos
- [ ] Que la firma solo vale para pagos rechazados
:::

:::ejercicio quiz
¿Cuál de las "cosas raras" se explica con los reintentos de la función de webhooks?
- [ ] Contracargos de pedidos que no están en la base
- [ ] Menos cancelados en la planilla que en el panel
- [x] Webhooks repetidos
- [ ] Totales que cambian
:::

## Resumen

- La documentación heredada es un punto de partida, no la verdad: **verifica cada afirmación** contra las fuentes.
- Una carga incremental por fecha de modificación **pierde** los cambios que no tocan esa fecha y **todos los borrados**.
- "Firmado" no es "verificado".
- Las cosas raras son tus casos de prueba.
