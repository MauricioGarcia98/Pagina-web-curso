---
titulo: Texto y fechas - separar, unir y transformar textos; año, mes, períodos y días entre fechas
nivel: 3 · Intermedio
duracion: 50
resumen: Los datos reales traen nombres en mayúsculas, emails que hay que partir y fechas con las que hay que agrupar por mes. Funciones de texto (LEFT, RIGHT, MID, LEN, FIND, PROPER, CONCAT, TEXTJOIN, SUBSTITUTE) y de fecha (YEAR, MONTH, DAY, TEXT, DATE, EOMONTH, WEEKDAY, TODAY, DATEDIF), con por qué una fecha es un número por dentro.
objetivos: Extraer partes de un texto con LEFT, RIGHT, MID y FIND | Unir textos con & , CONCAT y TEXTJOIN | Sacar año, mes y período de una fecha | Calcular días entre fechas y fin de mes | Construir columnas auxiliares para agrupar
prerrequisitos: excel-contar-y-sumar-con-condiciones
autoevaluacion: ¿Sabes sacar el dominio de un email? | ¿Sabes por qué una fecha se puede restar? | ¿Sabes crear una columna "2024-03" para agrupar por mes? | ¿Sabes calcular la edad de un cliente?
---

:::analogia En palabras simples
Las funciones de texto son tijeras y pegamento: cortan un pedazo de un texto (`LEFT`, `MID`) o pegan varios (`&`, `TEXTJOIN`). Las de fecha son un calendario: le preguntas a una fecha en qué año, mes o día de la semana cae.
:::

## Paso 1 — Una fecha es un número

En Excel, cada fecha es la cantidad de días desde el 1 de enero de 1900. El `2024-03-15` es, por dentro, **45366**. Por eso:

- `=D3-D2` da los **días** entre dos fechas.
- `=D2+30` da la fecha **30 días después**.
- Ordenar por fecha funciona como ordenar números.

:::cuidado Fechas que en realidad son texto
Si una fecha quedó alineada a la izquierda, es texto (llegó así de un CSV o alguien la escribió con un formato que Excel no reconoce). No se puede restar ni agrupar. Lo arreglamos en el nivel 4 con `DATEVALUE` y Power Query; por ahora, verifica la alineación.
:::

## Paso 2 — Año, mes y período (columnas auxiliares)

En la hoja **pedidos** (Data → Get Data → pedidos si no la tienes), usa las columnas libres **K**, **L** y **M**:

1. **K1** `anio` · **K2** `=YEAR(D2)`
2. **L1** `mes` · **L2** `=MONTH(D2)`
3. **M1** `periodo` · **M2** `=TEXT(D2,"yyyy-mm")`
4. Selecciona **K2:M6** y Ctrl + D para probar en algunas filas.

```captura
archivo: excel/e11-fechas.webp
texto: TEXT(D2,"yyyy-mm") (1) arma el período; YEAR y MONTH sacan el año y el mes
```

:::tip Por qué "2024-03" y no "marzo"
`TEXT(D2,"yyyy-mm")` da un texto que se ordena bien (2023-12 va antes que 2024-01) y no se confunde entre años. "marzo" se ordena alfabéticamente (abril, agosto, diciembre…) y mezcla marzo de 2023 con marzo de 2024.
:::

| Función | Con `2024-03-15` da |
|---|---|
| `=YEAR(D2)` | 2024 |
| `=MONTH(D2)` | 3 |
| `=DAY(D2)` | 15 |
| `=WEEKDAY(D2,2)` | 5 (viernes; con el 2, lunes = 1) |
| `=TEXT(D2,"yyyy-mm")` | 2024-03 |
| `=EOMONTH(D2,0)` | 45382 → con formato **Date**: 2024-03-31 (último día del mes) |
| `=DATE(2024,3,1)` | 45352 → con formato **Date**: 2024-03-01 (arma una fecha) |
| `=TODAY()` | la fecha de hoy (cambia cada día) |

Cuando una función devuelve una fecha y ves un número como 45382, no está mal: es la fecha por dentro. Dale formato **Date** (Home → Number) y se ve como fecha.

## Paso 3 — Días entre fechas y edades

Carga **clientes** (Data → Get Data → clientes): tiene **I** fecha_nacimiento y **J** fecha_registro.

1. **K1** `antiguedad_dias` · **K2** `=TODAY()-J2` → días desde que se registró.
2. **L1** `edad` · **L2** `=DATEDIF(I2,TODAY(),"y")` → años cumplidos.

| `DATEDIF(inicio, fin, unidad)` | Devuelve |
|---|---|
| `"y"` | años completos |
| `"m"` | meses completos |
| `"d"` | días |

:::nota TODAY cambia todos los días
Una hoja con `TODAY()` da resultados distintos mañana. Para un informe que tiene que poder repetirse, escribe la fecha de corte en una celda (por ejemplo `2024-12-31` en **N1**) y usa `=DATEDIF(I2,$N$1,"y")`.
:::

## Paso 4 — Cortar textos: LEFT, RIGHT, MID, FIND, LEN

Sigue en **clientes**. La columna **D** tiene el email (`lucia.aguilar@correo.com`).

| Quiero | Fórmula | Resultado |
|---|---|---|
| Largo del texto | `=LEN(D2)` | 24 |
| Posición de la @ | `=FIND("@",D2)` | 14 |
| Usuario (antes de la @) | `=LEFT(D2,FIND("@",D2)-1)` | lucia.aguilar |
| Dominio (después de la @) | `=MID(D2,FIND("@",D2)+1,100)` | correo.com |
| Últimos 3 caracteres | `=RIGHT(D2,3)` | com |

Escribe el **dominio** en **M2** (rótulo `dominio` en M1). Así puedes contar cuántos clientes usan cada proveedor de correo con `COUNTIF`.

:::tip Cómo leer una fórmula anidada
Léela de adentro hacia afuera: `FIND("@",D2)` da 14; `14+1` es 15; `MID(D2,15,100)` toma desde el carácter 15 hasta 100 caracteres (o hasta el final). El 100 es "suficientemente largo".
:::

## Paso 5 — Unir y transformar textos

| Quiero | Fórmula | Resultado |
|---|---|---|
| Nombre completo | `=B2&" "&C2` | Lucía Aguilar |
| Lo mismo con función | `=CONCAT(B2," ",C2)` | Lucía Aguilar |
| Varios con separador | `=TEXTJOIN(", ",TRUE,B2,C2,F2)` | Lucía, Aguilar, Madrid |
| Inicial y apellido | `=LEFT(B2,1)&". "&C2` | L. Aguilar |
| Todo en mayúsculas | `=UPPER(C2)` | AGUILAR |
| Primera letra en mayúscula | `=PROPER("juan pérez")` | Juan Pérez |
| Reemplazar | `=SUBSTITUTE(E2," ","")` | el teléfono sin espacios |

`TEXTJOIN` con `TRUE` ignora las celdas vacías: no quedan comas dobles.

## Paso 6 — Texto que parece número

`TEXT` convierte un número en texto con formato, útil para armar frases:

```text
="Ventas del mes: "&TEXT(57500,"#,##0")
```

Da `Ventas del mes: 57,500`. Y al revés, `VALUE("1500")` convierte un texto con forma de número en número.

## ✅ Lo que lograste

- Sacaste año, mes y período de fechas para poder agrupar.
- Calculaste días y edades entre fechas.
- Cortaste, uniste y transformaste textos.

:::ejercicio quiz
¿Qué devuelve `=LEFT("ana.ruiz@correo.com",FIND("@","ana.ruiz@correo.com")-1)`?
- [ ] ana.ruiz@
- [x] ana.ruiz
- [ ] correo.com
- [ ] 8
:::

:::ejercicio quiz
Quieres agrupar pedidos por mes sin mezclar años. ¿Qué columna auxiliar armas?
- [ ] `=MONTH(D2)`
- [x] `=TEXT(D2,"yyyy-mm")`
- [ ] `=DAY(D2)`
- [ ] `=TEXT(D2,"mmmm")`
:::

:::ejercicio quiz
En A2 está `2024-03-01` y en B2 `2024-03-15`. ¿Qué da `=B2-A2`?
- [x] 14
- [ ] 15
- [ ] #VALUE!
- [ ] 2024-00-14
:::

:::ejercicio quiz
¿Por qué conviene una fecha de corte en una celda en lugar de TODAY() en un informe mensual?
- [ ] Porque TODAY() no existe en Excel en inglés
- [x] Porque con TODAY() los resultados cambian cada día y el informe no se puede repetir
- [ ] Porque es más rápido
- [ ] Porque TODAY() da error en fechas viejas
:::
