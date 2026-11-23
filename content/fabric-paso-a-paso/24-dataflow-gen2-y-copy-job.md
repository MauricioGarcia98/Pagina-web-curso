---
titulo: Dataflow Gen2 y Copy job - mover y preparar datos sin código
nivel: 6 · Avanzado completo
duracion: 40
resumen: No todo se resuelve con un notebook. Usas Dataflow Gen2 para limpiar y resumir una tabla con pasos de Power Query (y ves el código M que generan) y un Copy job para copiar una tabla de forma incremental con una marca de agua. Terminas sabiendo cuándo conviene cada uno frente a un pipeline o un notebook.
objetivos: Armar un Dataflow Gen2 con pasos y un destino | Leer el código M que generan los pasos | Configurar un Copy job incremental con marca de agua | Elegir entre Dataflow Gen2, Copy job, pipeline y notebook
prerrequisitos: fabric-paso-a-paso-tiempo-real-eventstream-eventhouse-kql
autoevaluacion: ¿Sabes qué es un paso aplicado? | ¿Sabes qué hace el destino de un dataflow? | ¿Sabes qué es una marca de agua? | ¿Sabes cuándo conviene un notebook?
---

:::tip Practícalo mientras lees
Crea un Lakehouse, un **Dataflow Gen2** y un **Copy job** en tu workspace del [Fabric de práctica](#/fabric).
:::

## Paso 1 — Dataflow Gen2: Power Query en la nube

1. Create → Get data → **Dataflow Gen2** → `LimpiezaPedidos`.
2. **Get data** → *Azure SQL Database (tienda)* → `pedidos`.
3. **Filter rows**: `canal == web`. **Group by**: `estado`, *Count rows*, columna nueva `pedidos`.
4. **Data destination** → tu Lakehouse, tabla `pedidos_web_por_estado`, método **Replace**.
5. **Publish**: se ejecuta y la tabla aparece en el Lakehouse. El historial queda en *Refresh history* y en el **Monitor**.

Cada acción queda como un **paso aplicado** (*Applied steps*). En **Advanced editor (M)** ves el código que generaron:

```text
let
    Source = Sql.Database("tiendaandina.database.windows.net", "tienda"){[Item = "pedidos"]}[Data],
    #"Filtered rows" = Table.SelectRows(#"Source", each [canal] = "web"),
    #"Grouped rows" = Table.Group(#"Filtered rows", {"estado"}, {{"pedidos", each List.Count([estado]), type number}})
in
    #"Grouped rows"
```

Es el mismo lenguaje de Power Query que usa [Power BI](#/m/powerbi-paso-a-paso): quien ya limpió datos en Power BI sabe usar un dataflow.

| Método del destino | Qué hace en cada refresh |
|---|---|
| **Replace** | Borra la tabla y la vuelve a escribir completa |
| **Append** | Agrega las filas nuevas al final (cuidado: si el origen trae todo, duplica) |

## Paso 2 — Copy job incremental

1. Create → Get data → **Copy job** → `CopiaPedidos`.
2. **Edit**: origen `pedidos`, destino tu Lakehouse, tabla `pedidos_copia`, modo **Incremental copy**, columna `pedido_id`.
3. **Run**: copia las 12.000 filas y guarda la **marca de agua** (el `pedido_id` más alto).
4. **Run** otra vez: *Sin filas nuevas desde la última corrida*. Solo se copiarían los pedidos con un id mayor.

```diagrama
titulo: Una copia incremental con marca de agua
nodo o: Tabla de origen | icono=base | col=0 | fila=0 | color=gris | sub=pedidos
nodo w: Marca de agua guardada | icono=reloj | col=1 | fila=0 | color=naranja | sub=pedido_id máximo copiado
nodo d: Tabla de destino | icono=almacen | col=2 | fila=0 | color=verde | sub=pedidos_copia
flecha o -> w | explica=En cada corrida, el Copy job busca en el origen solo las filas con pedido_id mayor que la marca de agua.
flecha w -> d | explica=Agrega esas filas al destino y guarda el nuevo máximo. La próxima corrida empieza desde ahí.
```

La columna de marca de agua tiene que **solo crecer**: un id autoincremental o una fecha de modificación. Si las filas viejas cambian sin cambiar esa columna, la copia incremental no se entera: para eso está CDC (la captura de cambios).

## Paso 3 — ¿Qué uso?

| Si necesitas… | Conviene |
|---|---|
| Copiar tablas tal cual, completas o incrementales | **Copy job** |
| Limpiar y resumir con pasos visuales, desde muchos orígenes | **Dataflow Gen2** |
| Orquestar varios pasos con dependencias, reintentos y horarios | **Pipeline** (que puede llamar a dataflows, copy jobs y notebooks) |
| Lógica compleja, volúmenes grandes o pruebas de código | **Notebook** con PySpark |

:::errores
- **Append en un dataflow cuyo origen trae todo.** Cada refresh duplica la tabla: usa Replace o filtra lo nuevo.
- **Marca de agua en una columna que no siempre crece.** Se pierden filas sin aviso.
- **Un dataflow para todo.** Para miles de millones de filas o lógica con pruebas, un notebook es más rápido y mantenible.
:::

## Ejercicios

:::ejercicio quiz
Un Copy job incremental usa `fecha_pedido` como marca de agua. Ayer se corrigió el monto de un pedido de la semana pasada. ¿Qué pasa en la próxima corrida?
- [ ] Copia la corrección porque detecta el cambio
- [x] No copia la corrección: la fecha de ese pedido es menor que la marca de agua
- [ ] Vuelve a copiar toda la tabla
- [ ] Falla con un error de clave duplicada
:::

:::ejercicio quiz
¿Qué conviene para limpiar una planilla de metas que finanzas sube cada mes y resumirla en una tabla?
- [x] Un Dataflow Gen2 con destino Replace
- [ ] Un Copy job incremental
- [ ] Un Eventstream
- [ ] Un Activator
:::

## ✅ Lo que lograste

- Armaste un Dataflow Gen2 con pasos, destino y refresh.
- Leíste el código M que generan los pasos.
- Configuraste una copia incremental con marca de agua.
- Sabes elegir entre Copy job, Dataflow Gen2, pipeline y notebook.
