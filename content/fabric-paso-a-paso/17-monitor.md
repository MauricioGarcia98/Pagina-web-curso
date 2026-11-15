---
titulo: Monitor - qué corrió, cuánto tardó y qué falló
nivel: 5 · Avanzado
duracion: 30
resumen: Cuando el workspace crece, necesitas saber qué se ejecutó sin abrir ítem por ítem. Recorres el Monitor de Fabric - nombre de la actividad, estado, tipo, inicio, quién la lanzó, duración y workspace - y armas una rutina de revisión diaria para detectar fallas y ejecuciones lentas.
objetivos: Leer cada columna del Monitor | Detectar una ejecución fallida o lenta | Distinguir el Monitor del historial de un ítem | Armar una rutina de revisión diaria
prerrequisitos: fabric-paso-a-paso-proyecto-modelo-de-ventas
autoevaluacion: ¿Sabes qué muestra la columna Duration? | ¿Sabes de qué workspaces muestra ejecuciones el Monitor? | ¿Sabes qué revisar primero cada mañana? | ¿Sabes dónde ver el detalle de una corrida?
---

:::escenario El pedido
Lucía: *"Desde que agregamos el warehouse y el modelo, no sé qué corre y qué no. Quiero revisarlo todo en un solo lugar, cada mañana, en cinco minutos."*
:::

## Paso 1 — Abrir el Monitor

Barra izquierda → **Monitor**:

```captura
archivo: fabric/b17-monitor.webp
texto: Monitor - el pipeline, las celdas del notebook, la carga de datos de ejemplo y Load to Tables, con estado, tipo, inicio, quién lo lanzó, duración y workspace
```

## Paso 2 — Leer las columnas

| Columna | Qué dice | Para qué la usas |
|---|---|---|
| **Activity name** | Qué se ejecutó | Ubicar la corrida |
| **Status** | Succeeded, Failed, In progress, Cancelled | Lo primero que miras |
| **Item type** | Pipeline, Notebook, Lakehouse… | Saber dónde abrir el detalle |
| **Start time** | Cuándo empezó | Ver si corrió a la hora esperada |
| **Submitted by** | Quién o qué la lanzó | Distinguir corridas manuales de programadas |
| **Duration** | Cuánto tardó | Detectar corridas lentas |
| **Location** | El workspace | Filtrar por proyecto |

El Monitor junta **todos los workspaces** a los que tienes acceso. El historial de un ítem (por ejemplo, **Output** del pipeline) muestra solo ese ítem, con el detalle de cada actividad.

## Paso 3 — La rutina de cinco minutos

1. Ordena por **Status** y busca **Failed**. Si hay, abre el ítem y lee el error de la actividad que falló.
2. Mira **Duration** de las corridas habituales. Si un pipeline que tarda 2 minutos tardó 40, algo cambió: más datos, un recurso más chico o una consulta que dejó de usar el filtro.
3. Revisa que las corridas programadas **existan**: si falta la de la noche, la programación se desactivó o la capacidad estaba pausada.

:::cuidado Un "Succeeded" no garantiza datos correctos
Un pipeline puede terminar bien y copiar cero filas. Para los procesos importantes, agrega una comprobación (un notebook que cuente filas y falle si da cero) o una alerta. El curso de [Data Factory](#/m/data-factory-paso-a-paso) muestra cómo leer las filas copiadas en la salida de Copy data.
:::

## ✅ Lo que lograste

- Sabes leer el Monitor columna por columna.
- Tienes una rutina diaria para encontrar fallas y lentitud.

:::ejercicio quiz
¿De qué workspaces muestra ejecuciones el Monitor?
- [ ] Solo del actual
- [x] De todos los workspaces a los que tienes acceso
- [ ] Solo de los Pro
- [ ] De ninguno
:::

:::ejercicio quiz
Un pipeline que siempre tarda 2 minutos hoy tardó 40. ¿Qué columna lo muestra?
- [ ] Status
- [x] Duration
- [ ] Item type
- [ ] Location
:::

:::ejercicio quiz
¿Qué revisas primero cada mañana?
- [x] Las corridas en Failed
- [ ] Los nombres de los ítems
- [ ] El color del tema
- [ ] La lista de workspaces
:::

:::ejercicio quiz
El pipeline terminó en Succeeded pero copió cero filas. ¿Qué conviene?
- [ ] Nada, si dice Succeeded está bien
- [x] Agregar una comprobación que cuente filas y falle si da cero
- [ ] Borrar el pipeline
- [ ] Cambiar de workspace
:::
