---
titulo: Proyecto 3 (semiguiado) - cargar, transformar y comprobar de punta a punta
nivel: 3 · Intermedio
duracion: 45
resumen: El equipo quiere la carga de pedidos automatizada - un pipeline que copia y un notebook que arma los resúmenes. Lo terminas, lo ejecutas, lo compruebas en Monitor y revisas con la vista de linaje cómo quedaron conectados los ítems. Pistas escondidas.
objetivos: Integrar pipeline, notebook y lakehouse | Verificar ejecuciones en el Monitor de Fabric | Leer el linaje del workspace | Documentar qué escribe cada ítem
prerrequisitos: fabric-paso-a-paso-pipelines
autoevaluacion: ¿El pipeline corre la copia y después el notebook? | ¿Las ejecuciones aparecen en Monitor? | ¿El linaje muestra qué usa cada ítem? | ¿Sabes qué tablas escribe el notebook?
---

:::escenario El pedido
Lucía: *"Quiero que una sola ejecución traiga los pedidos y deje al día los resúmenes `ventas_por_canal` y `unidades_por_tienda`. Mostrame en Monitor que corrió y cómo se conectan las piezas."*
:::

## Lo que tienes que lograr

1. `pl_cargar_pedidos`: Copy data a `pedidos_copia` y después el notebook con los resúmenes.
2. Una ejecución exitosa visible en **Monitor**.
3. La vista **Lineage** del workspace mostrando las conexiones.

<details><summary>💡 Pista: ¿dónde está Monitor?</summary>

En la barra de navegación de la izquierda: **Monitor** junta las ejecuciones de todos los workspaces.
</details>

## Cómo se ve terminado

```captura
archivo: fabric/b12-monitor.webp
texto: Monitor - el pipeline, las celdas del notebook, la carga de datos de ejemplo y Load to Tables, todos con su estado
```

```captura
archivo: fabric/b12-linaje.webp
texto: Lineage - el notebook usa lh_ventas, y el pipeline escribe en lh_ventas y llama al notebook
```

## ✅ Lista de verificación

- [ ] La última ejecución de `pl_cargar_pedidos` está en **Succeeded**.
- [ ] `pedidos_copia`, `ventas_por_canal` y `unidades_por_tienda` existen en Tables.
- [ ] Monitor muestra el pipeline con su duración.
- [ ] El linaje muestra `Notebook1 → lh_ventas` y `pl_cargar_pedidos → lh_ventas, Notebook1`.

<details><summary>💡 Solución comentada</summary>

Si seguiste las lecciones 9 a 11 ya tienes todo. Lo que importa del proyecto es **comprobar**: Monitor confirma que corrió y cuánto tardó, y el linaje confirma qué depende de qué. Antes de borrar o cambiar un ítem, mira el linaje: si borras `lh_ventas`, se rompen el notebook, el pipeline y lo que se arme encima. En Fabric real, el pipeline se programa con **Schedule** (en la práctica, Schedule solo muestra un aviso).
</details>

## Lo que aprendiste en el nivel 3

- Notebooks con PySpark y Spark SQL.
- Escribir tablas Delta y los modos de escritura.
- Pipelines con Copy data y Notebook.
- Monitor y linaje.

En el nivel 4 sumas el warehouse, las vistas y el modelo semántico.

:::ejercicio quiz
¿Dónde confirmas que el pipeline corrió y cuánto tardó?
- [ ] En el lakehouse
- [x] En Monitor
- [ ] En Create
- [ ] En OneLake catalog
:::

:::ejercicio quiz
¿Para qué sirve mirar el linaje antes de borrar un ítem?
- [x] Para ver qué otros ítems dependen de él y se romperían
- [ ] Para ver la factura
- [ ] Para cambiarle el nombre
- [ ] No sirve
:::

:::ejercicio quiz
¿Cómo se programa un pipeline en Fabric real?
- [ ] No se puede
- [x] Con Schedule en el pipeline
- [ ] Con un notebook que nunca termina
- [ ] Desde Power BI Desktop
:::

:::ejercicio quiz
¿Qué muestra Monitor además del pipeline?
- [ ] Nada más
- [x] Las ejecuciones de notebooks, cargas y otros ítems de todos los workspaces
- [ ] Solo errores
- [ ] Los correos del equipo
:::
