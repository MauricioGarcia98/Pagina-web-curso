---
titulo: Excel por dentro - fórmulas, referencias, tablas dinámicas y gráficos
nivel: Básico
duracion: 45
resumen: Excel sigue siendo la herramienta de datos más usada en las empresas. Recorrido por lo que un analista o ingeniero de datos necesita - celdas y referencias relativas y absolutas, las funciones que más se usan (SUMIFS, COUNTIFS, XLOOKUP, IF), filtros, ordenar, quitar duplicados, tablas dinámicas y gráficos, y cuándo conviene pasar de Excel a SQL o Python.
objetivos: Escribir fórmulas con referencias relativas y absolutas y arrastrarlas sin errores | Usar SUMIFS, COUNTIFS, XLOOKUP e IF para responder preguntas de negocio | Resumir una tabla con una tabla dinámica y graficar el resultado | Leer los errores de Excel (#N/A, #DIV/0!, #NAME?, #VALUE!) y corregirlos | Reconocer los límites de Excel y cuándo pasar a SQL, Python o Power BI
prerrequisitos: fundamentos-datos-y-formatos
autoevaluacion: ¿Sabes qué cambia al arrastrar =B2*C2 una fila hacia abajo? | ¿Sabes para qué sirve el $ en $F$1? | ¿Sabes qué devuelve XLOOKUP cuando no encuentra el valor? | ¿Sabes qué pregunta responde una tabla dinámica? | ¿Sabes qué significa #N/A?
---

:::tip Practícalo mientras lees
Abre [Excel de práctica](#/excel). Las fórmulas se calculan de verdad en tu navegador y con **Data → Get Data** cargas las tablas de la tienda del curso. Las funciones van en inglés y con coma, como en Excel en inglés. Los **🎯 Retos** siguen el orden de esta lección.
:::

:::analogia En palabras simples
Una hoja de cálculo es una cuadrícula donde cada casillero puede guardar un dato o una **cuenta que mira otros casilleros**. Si cambias un dato, todas las cuentas que dependen de él se actualizan solas. Es como una calculadora que recuerda cómo hiciste cada cuenta.
:::

## Celdas, rangos y hojas

| Concepto | Cómo se escribe | Qué es |
|---|---|---|
| **Celda** | `B3` | Columna B, fila 3 |
| **Rango** | `B2:B100` | Todas las celdas de B2 a B100 |
| **Columna entera** | `B:B` | Toda la columna B |
| **Otra hoja** | `Ventas!B2` o `'Ventas 2024'!B2` | Una celda de otra hoja del libro |

Una fórmula siempre empieza con `=`: `=B2*C2`, `=SUM(D2:D50)`. La barra de fórmulas (**fx**) muestra la fórmula; la celda muestra el resultado.

## Referencias relativas y absolutas

Cuando copias o arrastras una fórmula, las referencias **se mueven** con ella:

| Escribes en D2 | Arrastras a D3 | Por qué |
|---|---|---|
| `=B2*C2` | `=B3*C3` | Relativas: se mueven una fila |
| `=B2*$F$1` | `=B3*$F$1` | `$F$1` es absoluta: no se mueve |
| `=B2*F$1` | `=B3*F$1` | Fila fija, columna libre |
| `=B2*$F1` | `=B3*$F2` | Columna fija, fila libre |

Usa `$` cuando todas las filas deben mirar **la misma celda**, por ejemplo una tasa de impuesto o un tipo de cambio. Mientras editas, **F4** alterna entre las cuatro formas.

## Las funciones que más se usan

| Pregunta | Función | Ejemplo |
|---|---|---|
| ¿Cuánto suman? | `SUM` | `=SUM(D2:D100)` |
| ¿Cuánto suman los de Chile? | `SUMIF` / `SUMIFS` | `=SUMIFS(D:D, B:B, "Chile", C:C, ">=2024-01-01")` |
| ¿Cuántos son? | `COUNT` (números), `COUNTA` (no vacíos) | `=COUNTA(A2:A100)` |
| ¿Cuántos cumplen algo? | `COUNTIF` / `COUNTIFS` | `=COUNTIF(F:F, "entregado")` |
| ¿Promedio? | `AVERAGE` / `AVERAGEIFS` | `=AVERAGEIFS(D:D, B:B, "Perú")` |
| Traer un dato de otra tabla | `XLOOKUP` (o `VLOOKUP`) | `=XLOOKUP(A2, Clientes!A:A, Clientes!G:G, "no está")` |
| Decidir | `IF`, `IFS` | `=IF(D2>1000, "grande", "chico")` |
| Que un error no rompa todo | `IFERROR` | `=IFERROR(B2/C2, 0)` |
| Limpiar texto | `TRIM`, `UPPER`, `LOWER`, `PROPER` | `=LOWER(TRIM(E2))` |
| Partes de una fecha | `YEAR`, `MONTH`, `DAY` | `=YEAR(C2)` |

Los criterios de `COUNTIF` y `SUMIF` van entre comillas: `"Chile"`, `">100"`, `"<>cancelado"`, y aceptan comodines: `"Ch*"` empieza con Ch.

:::tip Si sabes SQL, ya sabes Excel
`=SUMIFS(monto, pais, "Chile")` es `SELECT SUM(monto) FROM t WHERE pais = 'Chile'`. `XLOOKUP` es un `LEFT JOIN` de una columna. Una tabla dinámica es un `GROUP BY`. Cambia la forma, no la idea.
:::

## Los errores de Excel

| Error | Qué significa | Causa típica |
|---|---|---|
| `#N/A` | No se encontró el valor | `XLOOKUP` o `VLOOKUP` buscando algo que no existe (o con espacios de más) |
| `#DIV/0!` | División por cero | Dividir por una celda vacía o en cero |
| `#NAME?` | Excel no conoce ese nombre | Función mal escrita (`=SUMA(` en un Excel en inglés) o texto sin comillas |
| `#VALUE!` | Tipo de dato equivocado | Sumar un texto, una fecha guardada como texto |
| `#REF!` | La referencia ya no existe | Se borró la fila o columna a la que apuntaba |

## Filtrar, ordenar y quitar duplicados

- **Filter** (Ctrl+Shift+L) agrega una flecha en cada encabezado para mostrar solo algunos valores. Las filas ocultas siguen ahí: no se borran.
- **Sort** ordena la tabla entera por la columna elegida, manteniendo juntas las celdas de cada fila.
- **Remove Duplicates** borra las filas repetidas. Antes de usarlo, piensa qué hace a dos filas "iguales": ¿todas las columnas o solo el email?

## Tablas dinámicas

Una **tabla dinámica** (PivotTable) resume una tabla grande en segundos: eliges qué campo va en las **filas**, opcionalmente uno en las **columnas**, y qué **valor** resumir con qué operación.

> "¿Cuántos pedidos hay de cada estado y canal?" → Rows: `estado`, Columns: `canal`, Values: Count of `pedido_id`.

Es exactamente un `GROUP BY estado, canal` con `COUNT(*)`. Agrega totales generales por fila y por columna.

## Gráficos

Selecciona un rango con **categorías en la primera columna** y **números en las siguientes**, y elige el tipo:

| Quieres mostrar | Usa |
|---|---|
| Comparar categorías | Columnas o barras |
| Evolución en el tiempo | Líneas |
| Partes de un total (pocas categorías) | Torta |

## Excel, SQL, Python o Power BI

| Situación | Herramienta |
|---|---|
| Un análisis rápido de unos miles de filas, para compartir con alguien de negocio | Excel |
| Datos que viven en una base y se consultan seguido | SQL |
| Limpiezas que se repiten todos los días, o millones de filas | Python o SQL en un pipeline |
| Un tablero que mucha gente mira y se actualiza solo | Power BI |

Excel tiene un límite de 1.048.576 filas por hoja y no deja registro de qué pasos hiciste. Cuando un proceso en Excel se repite cada semana, es candidato a automatizarse.

## Qué tiene la réplica y qué no

| Tiene | No tiene |
|---|---|
| Fórmulas con referencias relativas, absolutas y entre hojas, y más de 70 funciones | Macros, VBA, Power Query y Power Pivot |
| Relleno arrastrando, copiar y pegar con ajuste de referencias, deshacer | Formato condicional y validación de datos |
| Filtro, ordenar, quitar duplicados, tabla dinámica (estática) y gráficos | Tablas dinámicas que se actualizan solas |
| Las tablas del curso con Data → Get Data, abrir y exportar CSV | Archivos .xlsx |

:::ejercicio quiz
En D2 escribes `=B2*C2` y la arrastras hasta D3. ¿Qué fórmula queda en D3?
- [ ] `=B2*C2`
- [x] `=B3*C3`
- [ ] `=C3*D3`
- [ ] `=B2*C3`
:::

:::ejercicio quiz
Todas las filas deben multiplicar su precio por el tipo de cambio que está en F1. ¿Qué escribes en D2 antes de arrastrar?
- [ ] `=B2*F1`
- [x] `=B2*$F$1`
- [ ] `=$B$2*F1`
- [ ] `=B2*F:F`
:::

:::ejercicio quiz
`=XLOOKUP(A2, Clientes!A:A, Clientes!G:G)` devuelve `#N/A`. ¿Qué es lo más probable?
- [ ] Que la fórmula está mal escrita
- [x] Que el valor de A2 no está en la columna A de Clientes (o tiene espacios o un tipo distinto)
- [ ] Que hay una división por cero
- [ ] Que la hoja Clientes está vacía de fórmulas
:::

:::ejercicio quiz
¿Qué fórmula cuenta los pedidos de la columna F con estado "entregado"?
- [ ] `=COUNT(F:F, "entregado")`
- [x] `=COUNTIF(F:F, "entregado")`
- [ ] `=SUMIF(F:F, "entregado")`
- [ ] `=COUNTA("entregado")`
:::

:::ejercicio quiz
Una tabla dinámica con Rows = `pais` y Values = Sum of `monto` es equivalente en SQL a…
- [ ] `SELECT * FROM t ORDER BY pais`
- [x] `SELECT pais, SUM(monto) FROM t GROUP BY pais`
- [ ] `SELECT DISTINCT pais FROM t`
- [ ] `SELECT pais, monto FROM t WHERE monto > 0`
:::

:::ejercicio quiz
Escribes `=SUMA(B2:B10)` en un Excel en inglés y aparece `#NAME?`. ¿Por qué?
- [ ] Porque el rango está vacío
- [ ] Porque falta el signo $
- [x] Porque Excel no reconoce la función: en inglés se llama SUM
- [ ] Porque las sumas no se pueden hacer con rangos
:::
