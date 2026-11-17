---
titulo: Monitor - seguir cada ejecución, ver qué entró y qué salió, y relanzar
nivel: 3 · Intermedio
duracion: 35
resumen: Monitor es la pantalla que mira el equipo cada mañana. Abres una ejecución y ves cada actividad con su duración y estado, lees lo que recibió una actividad (Input) y lo que devolvió (Output), relanzas una ejecución con Rerun, y conoces cuánto tiempo guarda Data Factory el historial y cómo se arman alertas.
objetivos: Abrir el detalle de una ejecución | Leer el Input y el Output de una actividad | Relanzar con Rerun | Saber cuánto tiempo se guarda el historial | Conectar Data Factory con alertas
prerrequisitos: data-factory-paso-a-paso-triggers
autoevaluacion: ¿Sabes qué ves en el Input de una copia? | ¿Sabes qué versión ejecuta Rerun? | ¿Sabes cuántos días guarda Monitor el historial? | ¿Sabes cómo te enteras de un fallo sin abrir Monitor?
---

:::analogia El parte diario de la planta
Monitor es el parte diario de la planta: qué corrió, cuánto tardó, qué recibió cada actividad (Input) y qué devolvió (Output). Para entender un error de nombre dinámico, el Input muestra el archivo que realmente buscó.
:::

## Paso 1 — El detalle de una ejecución

En **Monitor → Triggered**, haz clic en el nombre del pipeline de la ejecución disparada por el trigger:

```captura
archivo: adf/b11-run.webp
texto: La ejecución - estado y datos del run (1), las actividades (2) y Rerun (3)
```

Arriba: el **Run ID** (el identificador único, el que pides cuando reportas un problema), quién la disparó y cuánto tardó. Abajo, una fila por actividad con su duración y estado.

## Paso 2 — Input y Output

El ícono de **Input** muestra lo que recibió la actividad:

```captura
archivo: adf/b11-input.webp
texto: El Input de la copia - el origen con su comodín y el destino con MergeFiles
```

| Columna | Qué tiene | Cuándo la abres |
|---|---|---|
| **Input** | La configuración con las expresiones ya resueltas | "¿Qué archivo buscó de verdad?" |
| **Output** | Lo que devolvió (filas, archivos, valores) | "¿Cuántas filas copió?", "¿qué devolvió el Lookup?" |
| **Error** | El código y el mensaje | Cuando falló |

## Paso 3 — Rerun

**Rerun** vuelve a ejecutar el pipeline con la misma versión publicada y los mismos parámetros. Haz clic y vuelve a la lista:

```captura
archivo: adf/b11-rerun.webp
texto: La nueva ejecución, disparada por Rerun, arriba de las anteriores
```

En el Data Factory real también se puede relanzar **desde la actividad que falló** (*Rerun from failed activity*), sin repetir lo que ya salió bien: útil cuando la copia de una hora terminó y lo que falló fue el notebook de después.

## Paso 4 — Cuánto dura el historial y cómo enterarte de los fallos

:::cuidado 45 días
Monitor guarda las ejecuciones **45 días**. Para conservarlas más tiempo o analizarlas con KQL, se configuran los **Diagnostic settings** del factory para enviar los registros a un **Log Analytics workspace**.
:::

Nadie mira Monitor cada cinco minutos. Para enterarte de un fallo:

| Opción | Cómo |
|---|---|
| **Alertas de Azure Monitor** | Una regla sobre la métrica **Failed pipeline runs** del factory, con un grupo de acciones (curso del portal de Azure, lección 19) |
| **Alertas desde ADF Monitor** | Monitor → Alerts & metrics, que crea lo mismo |
| **Dentro del pipeline** | Una ruta Upon Failure que avise (lección 18) |

:::errores
- **Reportar un problema sin Run ID.** "El pipeline de anoche" es ambiguo; el Run ID identifica la ejecución exacta.
- **Mirar Monitor a mano cada mañana.** Una alerta sobre Failed pipeline runs avisa sola.
- **Esperar historial infinito.** Monitor guarda 45 días; para más, envía los registros a Log Analytics.
:::

## ✅ Lo que lograste

- Lees el detalle de una ejecución, su Input y su Output.
- Relanzas con Rerun.
- Sabes cuánto se guarda el historial y cómo recibir alertas.

:::ejercicio quiz
Quieres saber qué archivo buscó realmente una copia con un nombre dinámico. ¿Qué abres?
- [x] El Input de la actividad en Monitor
- [ ] El dataset
- [ ] El linked service
- [ ] El trigger
:::

:::ejercicio quiz
¿Qué identificador conviene pasar cuando reportas un problema de una ejecución?
- [ ] El nombre del pipeline
- [x] El Run ID
- [ ] El nombre del trigger
- [ ] La hora aproximada
:::

:::ejercicio quiz
¿Cuántos días guarda Monitor el historial de ejecuciones?
- [ ] 7
- [ ] 30
- [x] 45
- [ ] Para siempre
:::

:::ejercicio quiz
¿Cómo te enteras de un pipeline fallido a las 6:00 sin abrir Monitor?
- [ ] No se puede
- [x] Con una alerta sobre la métrica Failed pipeline runs y un grupo de acciones
- [ ] Mirando el portal cada hora
- [ ] Con un trigger de eventos sobre Monitor
:::
