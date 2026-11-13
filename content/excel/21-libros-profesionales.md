---
titulo: Libros profesionales - estructura, convenciones y controles para que tu Excel aguante el uso real
nivel: 6 · Avanzado completo
duracion: 45
resumen: Un Excel de trabajo lo usan otras personas, se actualiza cada mes y a veces termina en una decisión importante. Cómo estructurarlo (supuestos, datos, cálculos, salida), qué convenciones usan los equipos profesionales, los errores que arruinan libros enteros (números pegados encima de fórmulas, rangos que no crecen, celdas combinadas), cómo agregar controles y cómo versionar y compartir sin perder trabajo.
objetivos: Organizar un libro en capas (supuestos, datos, cálculos, salida) | Aplicar convenciones de nombres, formatos y colores | Reconocer y evitar los errores que rompen libros | Agregar controles automáticos | Versionar, documentar y compartir un libro con criterio
prerrequisitos: excel-proyecto-dashboard
autoevaluacion: ¿Sabes en qué hoja va cada cosa? | ¿Sabes por qué un número escrito encima de una fórmula es peligroso? | ¿Sabes armar una hoja de controles? | ¿Sabes cómo nombrar las versiones de un archivo?
---

:::analogia En palabras simples
Un libro profesional es como una cocina de restaurante: los ingredientes (datos) en un lugar, las recetas (cálculos) en otro y el plato (salida) se sirve aparte. Si todo está mezclado en la misma mesada, funciona para una persona un día, pero no para un equipo todos los días.
:::

## Paso 1 — Las cuatro capas

| Capa | Hoja típica | Qué tiene | Quién la toca |
|---|---|---|---|
| Supuestos | `supuestos` | Año, metas, tipos de cambio, umbrales: cada valor con rótulo, unidad y fuente | Quien define el análisis |
| Datos | `pedidos`, `pagos`… | Los datos tal como llegaron, sin editar a mano | Nadie (solo se reemplazan) |
| Cálculos | `calculos` | Tablas intermedias con fórmulas | Quien construye |
| Salida | `tablero`, `informe` | Lo que se presenta: indicadores, gráficos, notas | Se lee, no se edita |

Más una hoja `LEEME` al principio (qué es el libro, de dónde salen los datos, cómo actualizarlo, quién lo mantiene) y una hoja `control` al final.

```captura
archivo: excel/e21-hojas.webp
texto: Un libro de práctica después del curso: muchas hojas sin orden. En un libro profesional, el nombre y el orden de las hojas cuentan la historia
```

:::tip Ordena las pestañas como se lee
LEEME → supuestos → datos → cálculos → salida → control. Quien abre el archivo por primera vez lo recorre de izquierda a derecha y entiende cómo fluye.
:::

## Paso 2 — Convenciones que usan los equipos

| Convención | Ejemplo | Para qué |
|---|---|---|
| Nombres de hoja cortos, en minúscula, sin espacios | `ventas_mes` | Fórmulas legibles: `=SUM(ventas_mes!B:B)` |
| Una tabla por hoja, empezando en A1 | encabezados en la fila 1 | Filtros, tablas dinámicas y Power Query la reconocen sola |
| Sin filas ni columnas vacías dentro de los datos | | Ctrl + flecha y la detección de rangos funcionan |
| Sin celdas combinadas en los datos | | Combinar rompe orden, filtros y copiar fórmulas |
| Colores con significado | Azul = dato que se escribe a mano; negro = fórmula | Se ve qué se puede cambiar y qué no |
| Unidades en el encabezado | `monto_usd`, `peso_kg` | Nadie suma dólares con pesos |
| Fechas en formato ISO | `2024-03-15` | Sin ambigüedad entre países |

## Paso 3 — Los errores que arruinan libros

| Error | Cómo pasa | Cómo evitarlo |
|---|---|---|
| **Número pegado encima de una fórmula** | Alguien "corrige" un total escribiendo el valor | Revisa con Show Formulas; los totales siempre con fórmula |
| **Rango que no crece** | `=SUM(B2:B100)` y los datos llegan a la fila 150 | Columnas enteras (`B:B`) o, en Excel real, Tablas (Ctrl + T) |
| **Constante escondida** | `=B2*1.21` repetido en 500 celdas | El 1.21 en `supuestos`, referenciado con `$` |
| **Fórmula distinta en una fila** | Una fila se editó a mano y el resto no | Copia la fórmula de nuevo a toda la columna |
| **Copiar sin `$`** | La referencia a la meta se corre al copiar | F4 antes de copiar; revisar la última fila |
| **IFERROR que tapa todo** | Un error real queda oculto como 0 | IFNA en búsquedas; IFERROR solo si sabes qué falla |
| **Datos editados a mano** | Se "arregla" un valor en la tabla original | Los arreglos van en columnas limpias, con fórmula |

:::cuidado Un caso real
Errores así no son teóricos: hay casos públicos de informes económicos y de salud con conclusiones equivocadas por un rango que dejaba filas afuera, o por una tabla que se quedó sin espacio y perdió registros en silencio. La lección es siempre la misma: **controles automáticos** y nunca confiar en un número que nadie verificó.
:::

## Paso 4 — La hoja de controles

Cada control es una fórmula que dice `OK` o `REVISAR`. Ejemplos:

| Control | Fórmula |
|---|---|
| Las partes suman el total | `=IF(SUM(calculos!B2:B5)=tablero!B2,"OK","REVISAR")` |
| No hay errores en los cálculos | `=IF(SUMPRODUCT(--ISERROR(calculos!B2:E20))=0,"OK","REVISAR")` (en Excel real) |
| No faltan datos clave | `=IF(COUNTBLANK(pedidos!A2:A12001)=0,"OK","REVISAR")` |
| La cantidad de filas es la esperada | `=IF(COUNTA(pedidos!A:A)-1=12000,"OK","REVISAR")` |
| El resultado está en un rango razonable | `=IF(AND(tablero!B3>0.5,tablero!B3<1),"OK","REVISAR")` |

Y arriba de todo, un resumen: `=IF(COUNTIF(B2:B10,"REVISAR")=0,"✔ Todo cierra","✘ Hay controles en rojo")`.

## Paso 5 — Documentar sin escribir un manual

La hoja `LEEME` con cinco cosas alcanza:

1. **Qué es**: "Tablero comercial anual de Tienda Andina".
2. **Fuente**: "Tablas pedidos y pagos exportadas del sistema el 2025-01-05".
3. **Cómo actualizar**: "Reemplazar las hojas de datos, cambiar el año en supuestos, revisar control".
4. **Definiciones**: "Cobrado = pagos aprobados por fecha de pago".
5. **Responsable y fecha** de la última actualización.

## Paso 6 — Versionar y compartir

| Práctica | En lugar de |
|---|---|
| `tablero_comercial_2024-12-31_v3.xlsx` (fecha y versión) | `tablero FINAL final (2) corregido.xlsx` |
| Un archivo compartido en OneDrive/SharePoint con historial de versiones | Mandar copias por mail que divergen |
| Comentarios en la celda para preguntas y decisiones | Cambios sin explicar |
| Proteger las hojas de cálculo y salida (Excel real: Review → Protect Sheet) | Que cualquiera pise una fórmula |

:::cuidado Datos personales
Si el libro tiene emails, teléfonos o documentos de clientes, compártelo solo con quien lo necesita, no lo subas a sitios públicos y, si es para un análisis, quita o enmascara esas columnas. En las capturas que publiques (portafolio, LinkedIn), usa siempre datos ficticios como los de este curso.
:::

## ✅ Lo que lograste

- Sabes organizar un libro en capas y documentarlo.
- Conoces las convenciones y los errores más caros.
- Sabes agregar controles y versionar con criterio.

:::ejercicio quiz
Un compañero "corrige" un total escribiendo el número encima de la fórmula. ¿Cuál es el problema?
- [ ] Ninguno, si el número es correcto
- [x] El total deja de actualizarse cuando cambian los datos y nadie lo nota
- [ ] Excel muestra un error
- [ ] Se pierde el formato de moneda
:::

:::ejercicio quiz
¿Dónde va el tipo de cambio que usan 300 fórmulas?
- [ ] Escrito dentro de cada fórmula
- [x] En una celda de la hoja supuestos, con rótulo y fuente, referenciada con $
- [ ] En un comentario
- [ ] En la hoja de datos, en la primera fila
:::

:::ejercicio quiz
`=SUM(B2:B100)` suma las ventas, pero este mes los datos llegan a la fila 140. ¿Qué pasa?
- [ ] Excel extiende el rango solo
- [x] Las filas 101 a 140 quedan afuera del total sin ningún aviso
- [ ] Aparece #REF!
- [ ] La fórmula da error hasta que la corrijas
:::

:::ejercicio quiz
¿Qué nombre de archivo es el más profesional?
- [ ] `tablero final (2).xlsx`
- [ ] `nuevo tablero corregido FINAL.xlsx`
- [x] `tablero_comercial_2024-12-31_v3.xlsx`
- [ ] `Libro1.xlsx`
:::
