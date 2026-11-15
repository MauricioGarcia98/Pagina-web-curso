---
titulo: Medidas DAX - la barra de fórmulas, SUM, SUMX, COUNTROWS y DIVIDE
nivel: 3 · Intermedio
duracion: 50
resumen: Las medidas son los números del informe - ventas, pedidos, ticket promedio - calculados al instante según lo que filtra el usuario. Crear una medida en la barra de fórmulas, la diferencia entre SUM y SUMX (y por qué las ventas necesitan SUMX), COUNTROWS, DIVIDE en lugar de dividir, medidas que usan otras medidas, formato, carpetas y dónde se guardan.
objetivos: Crear una medida en la barra de fórmulas | Elegir entre SUM y SUMX | Contar filas con COUNTROWS y dividir con DIVIDE | Reutilizar medidas dentro de otras | Dar formato y organizar las medidas
prerrequisitos: powerbi-paso-a-paso-proyecto-clientes-limpios
autoevaluacion: ¿Sabes por qué Ventas usa SUMX y no SUM? | ¿Sabes qué devuelve DIVIDE si el divisor es 0? | ¿Sabes en qué tabla queda guardada una medida? | ¿Sabes qué ventaja tiene usar [Ventas] dentro de otra medida?
---

:::analogia En palabras simples
Una medida es una pregunta guardada: "¿cuánto vendimos?". No guarda un número fijo: cada vez que un gráfico la usa, Power BI la responde para ese pedacito de datos (para la barra de web, para el mes de marzo, para Argentina). Escribes la pregunta una vez y sirve en todo el informe.
:::

## Paso 1 — La primera medida

**Inicio → Nueva medida**. Aparece la **barra de fórmulas** arriba del lienzo:

```captura
archivo: powerbi/b09-barra-dax.webp
texto: La fórmula (1), el ✓ para confirmar (2) y la tabla donde se guarda la medida (3)
```

```text
Ventas = SUMX(detalle_pedidos, detalle_pedidos[cantidad] * detalle_pedidos[precio_unitario])
```

**Enter** o ✓. La medida aparece en el panel Datos con el ícono de calculadora, y la cinta muestra **Herramientas de medición**:

```captura
archivo: powerbi/b09-herramientas-medicion.webp
texto: Herramientas de medición - nombre, tabla principal, formato y decimales (1); la medida en el panel Datos (2)
```

## Paso 2 — SUM o SUMX

| Función | Hace | Ejemplo |
|---|---|---|
| `SUM(tabla[col])` | Suma una columna que ya existe | `SUM(pagos[monto])` |
| `SUMX(tabla, expresión)` | Recorre la tabla **fila por fila**, calcula la expresión y suma los resultados | `SUMX(detalle_pedidos, [cantidad] * [precio_unitario])` |

Las ventas son **cantidad × precio de cada línea**, y no existe una columna "importe" en el origen: por eso SUMX. Multiplicar `SUM(cantidad) * SUM(precio_unitario)` daría un número sin sentido (la suma de todas las cantidades por la suma de todos los precios).

:::nota Las X son iteradores
`SUMX`, `AVERAGEX`, `MINX`, `MAXX`, `COUNTX` recorren una tabla fila por fila. Se usan cuando la cuenta se hace por fila antes de agregar. Si en Power Query ya creaste la columna `importe` (lección 6), `SUM(detalle_pedidos[importe])` da lo mismo.
:::

## Paso 3 — Más medidas

```text
Pedidos = COUNTROWS(pedidos)
Ticket promedio = DIVIDE([Ventas], [Pedidos])
```

| Función | Hace |
|---|---|
| `COUNTROWS(tabla)` | Cuenta filas de la tabla, en el contexto actual |
| `DIVIDE(a, b)` | Divide; si `b` es 0 o vacío devuelve vacío en lugar de error (`DIVIDE(a, b, 0)` devuelve 0) |
| `[Ventas]` | Usa otra medida: si mañana cambias cómo se calculan las ventas, todas las que la usan se actualizan solas |

## Paso 4 — Usarlas en el informe

Selecciona la tarjeta, quita el recuento de `pedido_id` y pon **Ventas**:

```captura
archivo: powerbi/b09-tarjeta-medida.webp
texto: La tarjeta con la medida Ventas - 14,88 M
```

Control: **Ventas = 14 878 014,07** · **Pedidos = 12 000** · **Ticket promedio = 1 239,83**. Pon `canal` y las tres medidas en una tabla: web vende 6 807 135,34 en 5400 pedidos, ticket 1 260,58.

## Paso 5 — Formato y orden

| Qué | Dónde |
|---|---|
| Formato (moneda, decimales, porcentaje) | Herramientas de medición → Formato |
| Tabla donde vive la medida | Herramientas de medición → Tabla principal (no cambia el cálculo, solo dónde aparece) |
| Carpeta | Vista Modelo → Propiedades → Carpeta para mostrar |
| Descripción | Vista Modelo → Propiedades → Descripción |

:::tip Una tabla solo para medidas
Muchos equipos crean una tabla vacía llamada `_Medidas` y guardan ahí todas las medidas: el panel Datos queda ordenado (medidas arriba, tablas abajo) y nadie busca "¿en qué tabla estaba Ventas?".
:::

## ✅ Lo que lograste

- Creaste tus primeras medidas.
- Sabes cuándo usar SUMX y por qué DIVIDE.
- Reutilizas medidas y las organizas.

:::ejercicio quiz
¿Por qué Ventas se calcula con SUMX y no con SUM(cantidad) * SUM(precio_unitario)?
- [ ] Porque SUMX es más rápido
- [x] Porque hay que multiplicar cantidad por precio en cada línea y después sumar; multiplicar las sumas da otro número
- [ ] Porque SUM no existe
- [ ] Da lo mismo
:::

:::ejercicio quiz
¿Qué devuelve DIVIDE([Ventas], [Pedidos]) en un canal sin pedidos?
- [ ] Un error
- [x] Vacío (en blanco)
- [ ] Cero siempre
- [ ] Infinito
:::

:::ejercicio quiz
Ticket promedio usa [Ventas]. Mañana cambias Ventas para restar el descuento. ¿Qué pasa con Ticket promedio?
- [ ] Hay que reescribirla
- [x] Se actualiza sola, porque usa la medida
- [ ] Da error
- [ ] Se borra
:::
