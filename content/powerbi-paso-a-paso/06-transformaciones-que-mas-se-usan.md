---
titulo: Las transformaciones que más se usan - columnas personalizadas, condicionales, agrupar y combinar
nivel: 2 · Básico-intermedio
duracion: 45
resumen: Las transformaciones que vas a usar en casi todos los informes - columna personalizada con una fórmula M, columna condicional sin escribir código, agrupar por, cambiar tipos, reemplazar valores, dividir columnas, anular dinamización y combinar o anexar consultas. Cuándo conviene hacerlo en Power Query y cuándo con DAX.
objetivos: Crear una columna personalizada con M | Crear una columna condicional | Agrupar filas con una operación | Cambiar tipos, reemplazar y dividir | Elegir entre Power Query y DAX para cada cálculo
prerrequisitos: powerbi-paso-a-paso-power-query
autoevaluacion: ¿Sabes escribir = [cantidad] * [precio_unitario]? | ¿Sabes qué hace Agrupar por con la tabla? | ¿Sabes la diferencia entre combinar y anexar? | ¿Sabes cuándo hacer una columna en Power Query y no en DAX?
---

:::analogia En palabras simples
Si el paso anterior era aprender a usar la cocina, este es aprender las cinco técnicas que se usan en todos los platos: cortar (dividir), mezclar (combinar), calcular una porción (columna personalizada), clasificar (condicional) y resumir (agrupar).
:::

## Paso 1 — Columna personalizada

En la consulta **detalle_pedidos**: **Agregar columna → Columna personalizada**:

```captura
archivo: powerbi/b06-personalizada.webp
texto: El nombre de la columna (1) y la fórmula M (2), con las columnas entre corchetes
```

| Fórmula | Resultado |
|---|---|
| `= [cantidad] * [precio_unitario]` | El importe de la línea |
| `= Text.Upper([pais])` | El país en mayúsculas |
| `= Date.Year([fecha])` | El año de una fecha |
| `= if [monto] > 1000 then "Alto" else "Bajo"` | Una clasificación |

## Paso 2 — Columna condicional

En **pedidos**: **Agregar columna → Columna condicional**, sin escribir código:

```captura
archivo: powerbi/b06-condicional.webp
texto: La columna a evaluar (1), el operador (2), el valor (3), el resultado si se cumple (4) y si no (5)
```

Con `canal` *es igual a* `tienda` → `Presencial`, si no → `Digital`, la nueva columna `tipo_canal` clasifica cada pedido. Power Query escribe el `if … then … else` por ti.

## Paso 3 — Agrupar por

**Inicio → Agrupar por**:

```captura
archivo: powerbi/b06-agrupar.webp
texto: La columna de agrupación (1), el nombre de la nueva columna (2) y la operación (3) - Recuento, Suma, Promedio, Mínimo, Máximo, Mediana
```

:::cuidado Agrupar reemplaza la tabla
Agrupar convierte la consulta en una tabla resumida (una fila por canal) y pierdes el detalle. Casi siempre conviene **no** agrupar en Power Query y dejar que los visuales y las medidas resuman. Agrupa solo cuando de verdad necesitas una tabla resumida (por ejemplo, una dimensión sin duplicados).
:::

## Paso 4 — Otras que vas a usar

| Transformación | Dónde | Para qué |
|---|---|---|
| **Tipo de datos** | Transformar, o el ícono del encabezado | Que un número no quede como texto |
| **Detectar tipo de datos** | Transformar | Power Query adivina los tipos de las columnas seleccionadas |
| **Reemplazar valores** | Transformar | `"Mexico"` → `"México"` |
| **Recortar**, **minúsculas**, **Poner en mayúsculas cada palabra** | Transformar | Normalizar texto |
| **Dividir columna** | Inicio | `"ana@correo.com"` por `@` → usuario y dominio |
| **Usar la primera fila como encabezado** | Inicio | Archivos donde los títulos vienen como fila |
| **Anular dinamización** | Transformar | Una tabla con una columna por mes → una fila por mes |
| **Combinar consultas** | Inicio | Un JOIN: traer columnas de otra tabla por una clave |
| **Anexar consultas** | Inicio | Un UNION: poner una tabla debajo de otra (ventas 2023 + ventas 2024) |

## Paso 5 — Cerrar y aplicar

```captura
archivo: powerbi/b06-cerrar-aplicar.webp
texto: Cerrar y aplicar lleva todas las transformaciones al modelo
```

## Paso 6 — ¿Power Query o DAX?

| Si el cálculo… | Hazlo en |
|---|---|
| Limpia o corrige el dato (tipos, mayúsculas, valores mal escritos) | **Power Query** |
| Es una propiedad fija de cada fila que no depende de filtros (importe de la línea, tipo de canal) | **Power Query** (o columna calculada DAX) |
| Depende de lo que el usuario filtra (total de ventas, % del total, año anterior) | **Medida DAX** (nivel 3) |

La regla general de los equipos de BI: **lo más arriba posible**. Si se puede limpiar en el origen (SQL, el lakehouse), mejor; si no, en Power Query; y en DAX lo que depende del contexto.

:::errores
- **Confundir anexar con combinar.** Anexar apila filas (mismas columnas); combinar une columnas por una clave, como un JOIN.
- **Agrupar en Power Query lo que el usuario debe poder filtrar.** Agrupar pierde el detalle; los totales que cambian con los filtros van en medidas.
- **Calcular porcentajes en Power Query.** Quedan fijos y no reaccionan a las segmentaciones; van en DAX.
:::

## ✅ Lo que lograste

- Creaste columnas personalizadas y condicionales.
- Sabes agrupar, cambiar tipos, reemplazar, dividir, combinar y anexar.
- Sabes dónde conviene cada cálculo.

:::ejercicio quiz
Quieres poner las ventas de 2023 y las de 2024 (mismas columnas) en una sola tabla. ¿Qué usas?
- [ ] Combinar consultas
- [x] Anexar consultas
- [ ] Agrupar por
- [ ] Dividir columna
:::

:::ejercicio quiz
¿Qué pasa con la tabla al aplicar Agrupar por canal con Recuento?
- [ ] Se agrega una columna y se conservan todas las filas
- [x] Queda una fila por canal con el recuento; se pierde el detalle
- [ ] No cambia nada
- [ ] Se ordena por canal y se agrega una columna de subtotal
:::

:::ejercicio quiz
"Porcentaje de ventas sobre el total, según lo que filtre el usuario". ¿Dónde se calcula?
- [ ] En Power Query
- [x] En una medida DAX
- [ ] En una columna condicional
- [ ] En una columna personalizada de Power Query
:::
