---
titulo: Proyecto 4 (con poca ayuda) - reprocesar un día corregido
nivel: 4 · Intermedio-avanzado
duracion: 45
resumen: El proveedor reenvió las ventas del 12 de noviembre corregidas. Hay que volver a validar y publicar solo ese día, sin repetir la extracción de toda la semana, dejar constancia y explicar qué opciones de Clear se usaron. Solo se dice qué lograr; la solución comentada está al final.
objetivos: Elegir entre Clear de corrida, Clear de tarea y backfill | Usar las opciones Upstream y Downstream de Clear | Leer los intentos de una tarea reprocesada | Saber cuándo usar Mark as
prerrequisitos: airflow-paso-a-paso-backfill
autoevaluacion: ¿Reprocesaste solo validar y publicar del 12? | ¿Sabes qué hace Downstream en Clear? | ¿Sabes cómo ver los intentos anteriores? | ¿Sabes por qué no conviene marcar como success a mano?
---

:::escenario El pedido
Comercial: *"El proveedor reenvió el archivo del 12 con 40 ventas que faltaban. Ya está en la carpeta. ¿Pueden volver a validar y publicar ese día? Los demás están bien."*
:::

## Lo que tienes que lograr

1. Volver a correr `validar` **y lo que sigue** (`publicar`) solo en la corrida del 12.
2. No repetir `extraer` (el archivo ya está) ni tocar los otros días.
3. Comprobar en el log que `validar` tiene un intento nuevo.
4. Explicar en una línea cuándo usarías **Mark Run as**.

## Cómo se ve terminado

```captura
archivo: airflow/a16-clear.webp
texto: Clear Task Instance validar - Downstream marcado: se limpian validar y publicar
```

```captura
archivo: airflow/a16-intentos.webp
texto: El log de validar con dos intentos - el original y el del reproceso
```

```captura
archivo: airflow/a16-mark.webp
texto: El menú Mark Run as - success o failed
```

:::errores
- **Clear con Upstream marcado.** Vuelve a correr la extracción, que no hacía falta; para validar y publicar va Downstream.
- **Mark as success para que "se vea verde".** Solo tiene sentido si el trabajo se hizo por fuera.
- **No dejar constancia.** Una nota en la corrida explica después por qué se reprocesó.
:::

## ✅ Lista de verificación

- [ ] La corrida `backfill__2026-11-12...` tiene `validar` y `publicar` con un intento más.
- [ ] `extraer` del 12 conserva su intento original.
- [ ] Las demás corridas no cambiaron.
- [ ] Tienes la línea sobre Mark as.

<details><summary>💡 Solución comentada</summary>

1. Abre la corrida del 12 y la tarea `validar`.
2. **Clear** con **Downstream** marcado y **Upstream** desmarcado: se limpian `validar` y `publicar`, no `extraer`.
3. El scheduler las vuelve a correr; en el log aparece **Attempts 1 · 2**.

| Opción de Clear | Qué agrega |
|---|---|
| **Downstream** | Las tareas que dependen de esta |
| **Upstream** | Las tareas de las que depende esta |
| **Past / Future** | La misma tarea en corridas anteriores o posteriores |

**Mark as success** cambia el estado **sin ejecutar nada**. Sirve cuando el trabajo se hizo por fuera (alguien cargó el dato a mano) y quieres que las tareas siguientes corran. Usarlo para "poner en verde" algo que falló esconde el problema: el Dag queda verde con datos malos.
</details>

## Lo que aprendiste en el nivel 4

- Programar por datos con assets.
- Ramas y trigger rules.
- Backfills, Clear con opciones y Mark as.

En el nivel 5: operar Airflow - errores de importación, pruebas, pools, auditoría y alertas.

:::ejercicio quiz
Quieres repetir validar y publicar pero no extraer. ¿Qué marcas en Clear de validar?
- [ ] Upstream
- [x] Downstream
- [ ] Future
- [ ] Nada: se limpia todo el Dag
:::

:::ejercicio quiz
¿Qué hace Mark as success?
- [ ] Vuelve a correr la tarea
- [x] Cambia el estado a success sin ejecutar nada
- [ ] Reintenta la tarea y la marca en verde si pasa
- [ ] Saltea la tarea en las próximas corridas
:::

:::ejercicio quiz
¿Cuándo tiene sentido Mark as success?
- [x] Cuando el trabajo se hizo por fuera y quieres que las tareas siguientes corran
- [ ] Siempre que algo falle
- [ ] Para que el gerente vea todo en verde
- [ ] Cuando la tarea tarda mucho y quieres que termine
:::

:::ejercicio quiz
¿Por qué no se usó un backfill de toda la semana?
- [ ] Porque los backfills no existen en Airflow 3
- [x] Porque solo cambió un día y repetir los demás era trabajo innecesario
- [ ] Porque un backfill no puede repetir corridas que ya existen
- [ ] Porque el Dag estaba pausado
:::
