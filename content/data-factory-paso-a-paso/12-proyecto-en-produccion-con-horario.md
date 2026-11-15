---
titulo: Proyecto 3 (semiguiado) - la ingesta en producción, con horario y con freno
nivel: 3 · Intermedio
duracion: 40
resumen: La ingesta diaria pasa a correr sola. Dejas pl_ingesta_diaria publicada con su trigger de las 6:00, compruebas las ejecuciones en Monitor y en el registro de actividad del portal, y practicas la maniobra que todo equipo necesita - detener el trigger durante un mantenimiento sin borrarlo, y volver a activarlo.
objetivos: Dejar un pipeline programado y publicado | Verificar ejecuciones en Monitor y en el registro de actividad | Detener y reactivar un trigger publicando cada cambio | Documentar cómo opera el pipeline
prerrequisitos: data-factory-paso-a-paso-monitor
autoevaluacion: ¿Puedes mostrar que el trigger está publicado y activo? | ¿Sabes dónde aparecen las ejecuciones en el portal? | ¿Sabes detener la ingesta sin perder la configuración? | ¿Dejaste escrito cómo se opera?
---

:::escenario El pedido
Lucía: *"Mañana arranca en serio. Quiero la ingesta corriendo sola a las 6:00. El jueves hay mantenimiento del sistema de las tiendas y no deben llegar archivos: hay que poder frenar la ingesta ese día y volver a encenderla el viernes, sin rearmar nada."*
:::

## Lo que tienes que lograr

1. `pl_ingesta_diaria` publicada, con `tr_diario_0600` activo y publicado.
2. Evidencia de al menos una ejecución disparada por el trigger.
3. Evidencia en el **registro de actividad** del portal.
4. Detener el trigger (y publicar), y volver a activarlo (y publicar).
5. Una nota de operación de cinco líneas.

## Las evidencias

En el portal, **Activity log**:

```captura
archivo: adf/b12-actividad.webp
texto: El registro de actividad del portal - las publicaciones del factory y las ejecuciones del pipeline
```

El registro de actividad de Azure guarda las **publicaciones** y, en la práctica, también el resultado de las ejecuciones. En Azure real, el detalle de cada ejecución está en Monitor; el registro de actividad muestra sobre todo los cambios del recurso.

## Detener para el mantenimiento

<details><summary>💡 Pista: ¿dónde se detiene?</summary>

**Manage → Triggers**, el botón **Started** pasa a **Stopped**. Después, **Publish all**: si no publicas, el servicio sigue disparando.
</details>

```captura
archivo: adf/b12-trigger-parado.webp
texto: El trigger en Stopped (1) y el cambio pendiente de publicar (2)
```

## La nota de operación

Escribe algo así y guárdalo junto al pipeline (en Git, en la wiki del equipo):

```text
pl_ingesta_diaria
- Qué hace: copia raw/ventas/*.csv a bronze/ventas y genera ventas_AAAAMMDD.csv.
- Cuándo: tr_diario_0600, todos los días 6:00 (hora del negocio).
- Si falla: ver Monitor → Triggered → error de la actividad; relanzar con Rerun.
- Para frenarlo: Manage → Triggers → Stopped → Publish all.
- Dueño: equipo de datos (Lucía).
```

## ✅ Lista de verificación

- [ ] El trigger está **Started** y **publicado** (Publish all sin cambios pendientes).
- [ ] En Monitor hay una ejecución con *Triggered by* `tr_diario_0600`.
- [ ] En el registro de actividad están las publicaciones del factory.
- [ ] Detuviste el trigger, publicaste, lo reactivaste y volviste a publicar.
- [ ] Tienes la nota de operación.

<details><summary>💡 Solución comentada</summary>

La trampa del proyecto es la misma de la lección 10: **cada cambio de un trigger se publica**. Detenerlo sin publicar no frena nada, y reactivarlo sin publicar deja la ingesta apagada el viernes. Otra opción para un mantenimiento puntual es dejar el trigger activo y que el pipeline verifique si llegaron archivos antes de copiar (lección 17): así no falla los días sin datos.
</details>

## Lo que aprendiste en el nivel 3

- Publicar, Trigger now y la diferencia con Debug.
- Triggers programados y por eventos, y que también se publican.
- Monitor: detalle, Input, Output, Rerun, historial y alertas.
- Operar un pipeline programado.

En el nivel 4 el pipeline se vuelve flexible: parámetros, variables y bucles.

:::ejercicio quiz
Detuviste el trigger en Manage pero no publicaste. ¿Qué pasa a las 6:00?
- [ ] No corre
- [x] Corre igual, porque el servicio sigue con la versión publicada del trigger
- [ ] Corre a medias
- [ ] Se borra el trigger
:::

:::ejercicio quiz
¿Qué conviene para frenar la ingesta un día sin perder la configuración?
- [ ] Borrar el trigger y crearlo otra vez
- [x] Pasar el trigger a Stopped y publicar; reactivarlo y publicar después
- [ ] Borrar el pipeline
- [ ] Quitar el rol del factory
:::

:::ejercicio quiz
¿Para qué sirve la nota de operación?
- [ ] Para nada, el pipeline se explica solo
- [x] Para que cualquiera del equipo sepa qué hace, cuándo corre y qué hacer si falla
- [ ] Para que Azure la lea
- [ ] Para cobrar menos
:::

:::ejercicio quiz
Además de Monitor, ¿dónde quedan registradas las publicaciones del factory?
- [x] En el registro de actividad del portal
- [ ] En el dataset
- [ ] En el linked service
- [ ] En ningún otro lugar
:::
