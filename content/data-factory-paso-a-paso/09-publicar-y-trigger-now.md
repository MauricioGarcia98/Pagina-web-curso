---
titulo: Publicar y Trigger now - del borrador a una ejecución de verdad
nivel: 3 · Intermedio
duracion: 35
resumen: Hasta ahora todo fue borrador y Debug. Ves por qué Trigger now se niega a ejecutar un pipeline sin publicar, revisas la lista de cambios pendientes de Publish all, publicas, ejecutas el pipeline publicado con Trigger now y lo encuentras en Monitor como una ejecución disparada, separada de tus pruebas.
objetivos: Explicar la diferencia entre borrador, Debug y versión publicada | Revisar los cambios pendientes antes de publicar | Publicar con Publish all | Ejecutar con Trigger now | Encontrar la ejecución en Monitor → Triggered
prerrequisitos: data-factory-paso-a-paso-proyecto-ingesta-diaria
autoevaluacion: ¿Sabes qué versión ejecuta Trigger now? | ¿Sabes qué pasa si publicas con errores de validación? | ¿Sabes dónde aparece una ejecución de Trigger now? | ¿Sabes qué se publica con Publish all?
---

:::analogia Borrador y versión impresa
Lo que editas es un borrador; Publish all lo imprime y lo deja en la vitrina. Los triggers y Trigger now solo leen la versión de la vitrina. Sin Git, Publish all imprime todo lo pendiente del factory, incluido lo que un compañero dejó a medias.
:::

## Paso 1 — Tres versiones del mismo pipeline

| Versión | Dónde vive | Quién la ejecuta |
|---|---|---|
| **Borrador** | En el editor (o en tu rama de Git) | **Debug** |
| **Publicada** | En el servicio de Data Factory | **Trigger now** y los **triggers** |
| **Ejecución** | Un registro en Monitor | — |

Abre `pl_ingesta_diaria`. Arriba, **Publish all** muestra cuántos cambios hay sin publicar:

```captura
archivo: adf/b09-live-mode.webp
texto: Publish all con los cambios pendientes (1) y Live mode (2)
```

## Paso 2 — Trigger now antes de publicar

**Add trigger → Trigger now**:

```captura
archivo: adf/b09-trigger-sin-publicar.webp
texto: Trigger now ejecuta la versión publicada, y este pipeline todavía no se publicó
```

Es justamente la protección que quieres: nada se ejecuta "de verdad" sin haberse publicado. Para probar sin publicar existe Debug.

## Paso 3 — Publish all

Haz clic en **Publish all**:

```captura
archivo: adf/b09-publicar.webp
texto: Publish all - la lista de cambios pendientes (linked services, datasets y pipelines) que se van a publicar
```

**Revisa la lista** antes de publicar: publica **todo** lo pendiente del factory, no solo el pipeline que estás mirando. Si un compañero dejó un cambio a medio hacer en el mismo factory, también se publica. Por eso los equipos usan Git (lección 21): cada uno trabaja en su rama y solo se publica lo revisado.

Si hay errores de validación en cualquier pipeline, la práctica no deja publicar. Haz clic en **Publish**:

```captura
archivo: adf/b09-publicado.webp
texto: Todo publicado - ya no quedan cambios pendientes
```

## Paso 4 — Trigger now

Ahora sí, **Add trigger → Trigger now**:

```captura
archivo: adf/b09-trigger-now.webp
texto: Pipeline run - si el pipeline tuviera parámetros, aquí se completan
```

Haz clic en **OK** y ve a **Monitor → Triggered**:

```captura
archivo: adf/b09-monitor.webp
texto: La ejecución en Triggered, disparada como Manual trigger, con su duración y estado
```

:::nota Trigger now no es un trigger
**Trigger now** ejecuta el pipeline **una vez, ahora**, sin crear ningún trigger. Se usa para probar la versión publicada o para relanzar a mano. Para que corra solo todos los días hace falta un **trigger programado**: la lección siguiente.
:::

:::errores
- **Trigger now sobre un borrador.** Ejecuta la versión publicada; para probar cambios se usa Debug.
- **Publish all sin mirar la lista.** Sin Git, publica cambios ajenos a medias.
- **Buscar la corrida en Debug.** Las de Trigger now aparecen en Monitor → Triggered.
:::

## ✅ Lo que lograste

- Distingues borrador, versión publicada y ejecución.
- Publicaste revisando los cambios pendientes.
- Ejecutaste la versión publicada y la encontraste en Monitor.

:::ejercicio quiz
¿Qué versión ejecuta Trigger now?
- [ ] El borrador del editor
- [x] La versión publicada
- [ ] La del último Debug
- [ ] La de la rama main de Git, aunque no se haya publicado
:::

:::ejercicio quiz
Hiciste un cambio en el pipeline A y un compañero dejó a medias el pipeline B en el mismo factory, sin Git. Haces Publish all. ¿Qué se publica?
- [ ] Solo A
- [x] A y B, porque Publish all publica todo lo pendiente
- [ ] Nada, hay un conflicto
- [ ] Solo B
:::

:::ejercicio quiz
¿Dónde aparece una ejecución lanzada con Trigger now?
- [ ] En Monitor → Debug
- [x] En Monitor → Triggered, como Manual trigger
- [ ] En Manage → Triggers
- [ ] No aparece
:::

:::ejercicio quiz
¿Trigger now crea un trigger que corre todos los días?
- [ ] Sí
- [x] No, ejecuta una sola vez en ese momento
- [ ] Solo si lo publicas
- [ ] Sí, a la misma hora en que se lanzó
:::
