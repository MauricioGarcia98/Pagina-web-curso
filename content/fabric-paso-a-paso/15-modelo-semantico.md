---
titulo: El modelo semántico - de las tablas al modelo de Power BI
nivel: 4 · Intermedio-avanzado
duracion: 40
resumen: El modelo semántico es lo que Power BI usa para los informes - tablas, relaciones y medidas DAX. Creas uno desde el lakehouse, ves sus tablas en modo Direct Lake, agregas la medida Pedidos con COUNTROWS y entiendes qué es Direct Lake y por qué cambia la forma de hacer informes.
objetivos: Crear un modelo semántico desde un lakehouse | Entender el modo Direct Lake | Agregar una medida DAX | Ubicar las tablas, columnas y medidas del modelo
prerrequisitos: fabric-paso-a-paso-vistas-y-la-capa-de-negocio
autoevaluacion: ¿Sabes qué es un modelo semántico? | ¿Sabes qué ventaja tiene Direct Lake? | ¿Sabes escribir una medida que cuente filas? | ¿Sabes de dónde lee el modelo?
---

:::analogia El diccionario del negocio
El modelo semántico es el diccionario del negocio para Power BI: qué tablas hay, cómo se relacionan y qué significa "pedidos" o "ventas" (las medidas). Con Direct Lake, ese diccionario lee las tablas Delta directamente del lago, sin importar una copia.
:::

## Paso 1 — Crear el modelo

En `lh_ventas`, **New semantic model**:

```captura
archivo: fabric/b15-modelo.webp
texto: Las tablas del lakehouse en el modelo (1) y la cinta con Edit tables, New measure, New report y Exportar CSV (2)
```

Arriba a la derecha dice **Storage mode: Direct Lake**.

## Paso 2 — Qué es Direct Lake

| Modo | Cómo lee Power BI los datos | Ventaja | Desventaja |
|---|---|---|---|
| **Import** | Copia los datos al modelo y los actualiza a horario | Muy rápido | Copia y refresco programado |
| **DirectQuery** | Consulta la fuente en cada interacción | Siempre al día | Más lento |
| **Direct Lake** | Lee directo los archivos **Delta** de OneLake | Rápido como Import y al día como DirectQuery, **sin copiar** | Solo sobre tablas Delta de OneLake |

Direct Lake es una de las grandes razones para usar Fabric: el informe lee las mismas tablas que escribe el notebook.

## Paso 3 — Una medida

**New measure**:

- **Name**: `Pedidos`.
- **DAX**: `COUNTROWS(pedidos)`.

```captura
archivo: fabric/b15-medida.webp
texto: El nombre (1) y la expresión DAX (2)
```

```captura
archivo: fabric/b15-modelo-medida.webp
texto: La medida Pedidos en la sección Measures del modelo
```

Las medidas viven en el modelo, no en cada informe: todos los informes que usan este modelo comparten la misma definición de "Pedidos". El curso [Power BI paso a paso](#/m/powerbi-paso-a-paso) cubre DAX a fondo.

:::errores
- **Definir la misma medida en cada informe.** Las medidas compartidas van en el modelo; así todos calculan igual.
- **`COUNT(*)` en DAX.** No existe; se cuenta con `COUNTROWS(tabla)`.
- **Esperar Direct Lake desde cualquier fuente.** Lee tablas Delta de OneLake; otras fuentes usan importación o DirectQuery.
:::

## ✅ Lo que lograste

- Creaste un modelo semántico sobre el lakehouse.
- Sabes qué es Direct Lake y por qué importa.
- Agregaste una medida DAX.

:::ejercicio quiz
¿Qué es un modelo semántico?
- [ ] Un archivo CSV
- [x] Las tablas, relaciones y medidas que usa Power BI para los informes
- [ ] Una copia de las tablas del lakehouse en Excel
- [ ] Un lakehouse
:::

:::ejercicio quiz
¿Qué ventaja tiene Direct Lake?
- [ ] Copia los datos cada noche
- [x] Lee las tablas Delta de OneLake directamente: rápido y al día, sin copiar
- [ ] Funciona con cualquier base
- [ ] Importa los datos cada vez que se abre el informe
:::

:::ejercicio quiz
¿Qué medida cuenta las filas de la tabla pedidos?
- [ ] `SUM(pedidos)`
- [x] `COUNTROWS(pedidos)`
- [ ] `COUNT(*)`
- [ ] `ROWS(pedidos)`
:::

:::ejercicio quiz
¿Dónde viven las medidas que comparten varios informes?
- [ ] En cada informe
- [x] En el modelo semántico
- [ ] En el lakehouse
- [ ] En una vista del warehouse
:::
