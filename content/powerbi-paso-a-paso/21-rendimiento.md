---
titulo: Rendimiento - el analizador, el tamaño del modelo y las buenas prácticas
nivel: 6 · Avanzado completo
duracion: 45
resumen: Un informe lento no se usa. El analizador de rendimiento para medir cuánto tarda cada visual (consulta DAX y dibujo), qué hace pesado a un modelo, las prácticas que más impacto tienen - esquema en estrella, quitar columnas, medidas en lugar de columnas calculadas, pocas tablas grandes, menos visuales por página - y cuándo pasar a DirectQuery, Direct Lake o actualización incremental.
objetivos: Medir con el analizador de rendimiento | Identificar si lo lento es la consulta o el dibujo | Reducir el tamaño del modelo | Aplicar las prácticas de diseño que más impactan | Conocer las alternativas para modelos grandes
prerrequisitos: powerbi-paso-a-paso-proyecto-informe-en-produccion
autoevaluacion: ¿Sabes qué mide el analizador? | ¿Sabes por qué una columna con valores únicos pesa tanto? | ¿Sabes por qué conviene una medida antes que una columna calculada? | ¿Sabes qué es la actualización incremental?
---

:::analogia En palabras simples
Un informe lento es como una cocina desordenada: no falta comida, sobran cosas en el medio. El analizador de rendimiento te dice qué plato tarda más; las buenas prácticas son ordenar la cocina para que todo salga rápido.
:::

## Paso 1 — El analizador de rendimiento

**Optimizar → Analizador de rendimiento → Actualizar objetos visuales**:

```captura
archivo: powerbi/b21-analizador.webp
texto: Actualizar objetos visuales (1) mide cada visual de la página (2) - consulta DAX y tiempo de dibujo
```

| Tiempo | Significa | Si es alto |
|---|---|---|
| **Consulta DAX** | Lo que tarda el modelo en calcular | Medidas complejas, modelo mal diseñado, demasiadas filas |
| **Objeto visual** | Lo que tarda en dibujarse | Demasiados puntos o filas en un visual (una tabla de 50 000 filas) |
| **Otros** | Esperar a otros visuales | Demasiados visuales en la página |

**Copiar consulta** permite pegar la consulta DAX del visual en la vista de consultas DAX (o en DAX Studio) para estudiarla.

## Paso 2 — Qué hace pesado a un modelo

En modo Importar, Power BI comprime cada columna por separado. Lo que más pesa:

| Pesa mucho | Por qué | Qué hacer |
|---|---|---|
| Columnas con muchos valores distintos (ID de transacción, timestamps con segundos, textos largos) | Comprimen mal | Quitarlas si no se usan; separar fecha y hora |
| Columnas que nadie usa | Ocupan igual | Quitarlas en Power Query |
| Columnas calculadas en tablas grandes | Se guardan fila por fila | Medidas, o calcular en Power Query/origen |
| Tablas planas gigantes (todo junto) | Repiten textos millones de veces | Esquema en estrella |
| Historia que nadie mira | Filas de más | Filtrar en Power Query (últimos 3 años) |

## Paso 3 — Las prácticas que más impactan

1. **Esquema en estrella**: hechos delgados (claves y números) y dimensiones con los textos.
2. **Relaciones únicas** de dimensión a hechos; evitar *Ambas* y muchos a muchos.
3. **Medidas** en lugar de columnas calculadas cuando el resultado depende del contexto.
4. **Variables** (`VAR … RETURN`) en medidas largas: se calcula una vez y se reutiliza.
5. **Menos visuales por página**: 6 a 8; cada visual es al menos una consulta.
6. **Segmentaciones** con pocas opciones; filtros de página para reglas fijas.
7. **Tabla de fechas propia** y apagar *Fecha/hora automática* (Opciones → Carga de datos).

## Paso 4 — Cuando el modelo no entra

| Opción | Cómo funciona | Cuándo |
|---|---|---|
| **Actualización incremental** | Solo se recarga lo reciente (los últimos días); la historia queda | Tablas de hechos grandes que solo crecen |
| **DirectQuery** | Cada visual consulta el origen en vivo, sin copiar datos | Datos que cambian a cada minuto o demasiado grandes; más lento por visual |
| **Direct Lake** (Fabric) | Lee tablas Delta del lago directo, casi tan rápido como Importar | Si los datos ya están en OneLake |
| **Agregaciones** | Una tabla resumida en memoria responde la mayoría de las consultas; el detalle va a DirectQuery | Modelos de miles de millones de filas |

## ✅ Lo que lograste

- Mides el rendimiento y sabes dónde está el problema.
- Sabes qué hace pesado a un modelo y cómo aliviarlo.
- Conoces las alternativas para modelos grandes.

:::ejercicio quiz
El analizador muestra que un visual tarda 3 segundos en "Consulta DAX" y 50 ms en "Objeto visual". ¿Dónde está el problema?
- [ ] En el dibujo
- [x] En el cálculo: la medida o el modelo
- [ ] En el tema
- [ ] En la red
:::

:::ejercicio quiz
¿Qué columna pesa más en un modelo importado?
- [ ] canal (4 valores distintos)
- [ ] estado (5 valores)
- [x] un ID de transacción único por fila
- [ ] año (3 valores)
:::

:::ejercicio quiz
Una tabla de hechos tiene 5 años de historia y solo cambian los últimos días. ¿Qué conviene?
- [ ] Recargar todo cada vez
- [x] Actualización incremental
- [ ] Borrar la historia
- [ ] Pasar todo a columnas calculadas
:::
