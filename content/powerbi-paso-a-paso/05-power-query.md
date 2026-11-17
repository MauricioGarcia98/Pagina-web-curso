---
titulo: Power Query - el editor, los pasos aplicados y el lenguaje M
nivel: 2 · Básico-intermedio
duracion: 45
resumen: Power Query es donde se limpian los datos antes de que lleguen al modelo. Las zonas del editor (cinta, consultas, vista previa, barra de fórmulas, pasos aplicados), el menú de cada columna para ordenar, quitar y filtrar, cómo cada clic se graba como un paso en lenguaje M, el perfil de columna para medir la calidad y el Editor avanzado con la consulta completa.
objetivos: Reconocer las zonas del Editor de Power Query | Quitar columnas, cambiar mayúsculas y filtrar valores | Leer y editar los pasos aplicados | Medir la calidad de una columna con el perfil | Leer una consulta completa en M
prerrequisitos: powerbi-paso-a-paso-proyecto-primer-informe
autoevaluacion: ¿Sabes qué es un paso aplicado? | ¿Sabes dónde ver el código M de un paso? | ¿Sabes qué dice el perfil de columna sobre los vacíos? | ¿Sabes qué hace Cerrar y aplicar?
---

:::analogia En palabras simples
Power Query es una receta que se graba sola: cada vez que haces algo (quitar una columna, cambiar mayúsculas, filtrar), queda anotado como un paso. Cuando llegan datos nuevos, Power BI repite la receta entera sin que vuelvas a hacer nada.
:::

## Paso 1 — Abrir el editor

**Inicio → Transformar datos**:

```captura
archivo: powerbi/b05-editor.webp
texto: Las pestañas de la cinta (1), las consultas (2), la vista previa de los datos (3), la configuración con los pasos aplicados (4) y la barra de fórmulas con el M del paso (5)
```

| Zona | Qué es |
|---|---|
| **Cinta** | Inicio (quitar columnas y filas, agrupar, combinar), Transformar (tipos, reemplazar, mayúsculas, anular dinamización), Agregar columna (personalizada, condicional, índice), Vista (perfil, Editor avanzado) |
| **Consultas** | Una por tabla. Al hacer clic, la vista previa cambia a esa tabla |
| **Vista previa** | Las primeras filas; arriba de cada columna, el ícono del tipo (`1²3` entero, `ABC` texto, 📅 fecha) y la flecha ▾ del menú |
| **Pasos aplicados** | La receta de la consulta, en orden |
| **Barra de fórmulas** | El código M del paso seleccionado |

## Paso 2 — El menú de una columna

En la consulta **clientes**, haz clic en la flecha ▾ de la columna `pais`:

```captura
archivo: powerbi/b05-menu-columna.webp
texto: Ordenar, quitar, quitar duplicados o vacíos, filtros por condición y la lista de valores para quedarte solo con algunos
```

Desmarcar un valor de la lista y **Aceptar** crea un paso **Filas filtradas**: esas filas no llegan al modelo.

## Paso 3 — Transformar y mirar los pasos

1. Selecciona la columna `telefono` (clic en el encabezado) → **Inicio → Quitar columnas**.
2. Selecciona `segmento` → **Transformar → MAYÚSCULAS**.

```captura
archivo: powerbi/b05-pasos.webp
texto: Cada acción quedó como un paso (1); la barra de fórmulas muestra su M (2)
```

| Acción con los pasos | Cómo |
|---|---|
| Ver cómo estaba la tabla en un paso anterior | Clic en ese paso |
| Borrar un paso | La ✕ junto al paso |
| Leer qué hace | La barra de fórmulas: `= Table.RemoveColumns(#"Navegación", {"telefono"})` |

:::cuidado Borrar un paso del medio
Si borras un paso del que dependen los siguientes (por ejemplo, el que cambió el nombre de una columna que después se usa), los pasos siguientes fallan. Revisa la vista previa después de borrar.
:::

## Paso 4 — El perfil de columna

**Vista → Perfil de columna**:

```captura
archivo: powerbi/b05-perfil.webp
texto: Encima de cada columna, el porcentaje de valores válidos y vacíos y cuántos distintos hay
```

Antes de modelar, mira: ¿cuántos vacíos tiene `email`? ¿`pais` tiene solo los valores que esperas? Lo que veas acá explica los números raros de después.

## Paso 5 — El Editor avanzado

**Vista → Editor avanzado** muestra la consulta entera en **M**:

```captura
archivo: powerbi/b05-editor-avanzado.webp
texto: La consulta completa - let con un paso por línea, in con el resultado
```

```text
let
    Origen = Sqlite.Database(File.Contents("curso.db")),
    #"Navegación" = Origen{[Name="clientes"]}[Data],
    #"Columnas quitadas" = Table.RemoveColumns(#"Navegación", {"telefono"})
in
    #"Columnas quitadas"
```

Cada paso usa el resultado del anterior por su nombre. No hace falta escribir M para usar Power Query, pero leerlo ayuda a entender qué pasa y a copiar una consulta de un archivo a otro.

## Paso 6 — Cerrar y aplicar

**Cerrar y aplicar** (arriba a la izquierda) ejecuta todas las consultas y carga el resultado al modelo. Hasta que no lo hagas, los cambios no llegan al informe.

:::errores
- **Editar en Power Query y olvidar Cerrar y aplicar.** Los cambios no llegan al modelo hasta aplicarlos.
- **Borrar un paso del medio sin mirar los siguientes.** Los pasos de después pueden depender de él y fallar.
- **Limpiar a mano en Excel antes de cargar.** Esa limpieza no se repite sola; en Power Query queda grabada y se aplica en cada actualización.
:::

## ✅ Lo que lograste

- Conoces las zonas del editor.
- Transformaste columnas y leíste los pasos y su M.
- Mediste la calidad con el perfil y viste la consulta completa.

:::ejercicio quiz
¿Qué es un paso aplicado?
- [ ] Una copia de la tabla guardada en cada momento
- [x] Una transformación grabada que Power Query repite cada vez que se actualizan los datos
- [ ] Una relación entre tablas
- [ ] Una medida DAX
:::

:::ejercicio quiz
Quitaste una columna en Power Query pero sigue apareciendo en el panel Datos. ¿Qué falta?
- [ ] Publicar
- [x] Cerrar y aplicar
- [ ] Crear una medida
- [ ] Ocultarla en la vista Modelo
:::

:::ejercicio quiz
¿Dónde ves rápidamente cuántos vacíos tiene una columna?
- [ ] En la vista Modelo
- [x] En el perfil de columna (Vista → Perfil de columna)
- [ ] En la barra de estado
- [ ] En el panel Filtros
:::
