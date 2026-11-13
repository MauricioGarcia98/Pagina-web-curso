---
titulo: Limpiar datos - duplicados por clave, textos desprolijos, vacíos y números guardados como texto
nivel: 4 · Intermedio-avanzado
duracion: 55
resumen: Los datos reales llegan sucios. Con una tabla de clientes cargada varias veces (con mayúsculas, espacios y emails vacíos), aprendes el método completo - primero medir los problemas con fórmulas, después decidir qué es un duplicado, quedarte con el registro más reciente, normalizar textos y dejar documentado qué hiciste. Igual que la capa bronze-silver de un pipeline, pero en Excel.
objetivos: Medir la calidad de una tabla antes de tocarla (vacíos, repetidos, formatos) | Detectar claves repetidas con COUNTIF | Quitar duplicados por clave quedándote con el registro más reciente | Normalizar textos con TRIM, LOWER y PROPER | Convertir números y fechas guardados como texto
prerrequisitos: excel-ordenar-y-filtrar
autoevaluacion: ¿Sabes contar cuántas veces aparece cada id? | ¿Sabes qué columnas marcar en Remove Duplicates? | ¿Sabes quedarte con la carga más nueva de cada cliente? | ¿Sabes limpiar un email con espacios y mayúsculas?
---

:::analogia En palabras simples
Limpiar datos es como ordenar un placard antes de mudarte: primero miras qué hay (cuántas cosas repetidas, cuáles están rotas), después decides qué tirar y qué arreglar, y recién ahí guardas. Si empiezas a tirar sin mirar, tiras cosas que necesitabas.
:::

## Paso 1 — Carga la tabla sucia

1. **Data → Get Data → clientes_crudo → Load**.
2. Es una tabla de **aterrizaje**: cada vez que el sistema de origen manda un cliente, se agrega una fila, con lo que venga.

```captura
archivo: excel/04-crudo.webp
texto: clientes_crudo: el mismo cliente cargado varias veces, con mayúsculas, espacios y emails vacíos
```

Columnas: **A** registro_id (único por fila), **B** cliente_id, **C** nombre, **D** apellido, **E** email, **F** ciudad, **G** fecha_carga.

## Paso 2 — Mide antes de tocar

Antes de limpiar, cuantifica los problemas. En una zona libre (por ejemplo **K1:L6**) arma un pequeño informe de calidad:

| K (rótulo) | L (fórmula) | Resultado |
|---|---|---|
| Filas | `=COUNTA(A:A)-1` | 400 |
| Clientes distintos | `=COUNTA(UNIQUE(B2:B401))` | 243 |
| Filas que sobran | `=L1-L2` | 157 |
| Emails vacíos | `=COUNTBLANK(E2:E401)` | 19 |

:::tip Clientes distintos en cualquier versión de Excel
`UNIQUE` existe en Excel 365, 2021 y la web. En versiones anteriores se usa una columna auxiliar: `=IF(COUNTIF($B$2:B2,B2)=1,1,0)` copiada hacia abajo vale 1 la primera vez que aparece cada cliente y 0 las siguientes; `SUM` de esa columna da los distintos. Fíjate en el rango `$B$2:B2`: el inicio está fijo y el final crece al copiar.
:::

Ya sabes lo que hay: **400 filas para 243 clientes** (157 filas sobran) y 19 emails vacíos. Mirando la tabla también ves nombres en mayúsculas, espacios de más y ciudades en minúscula.

## Paso 3 — ¿Cuántas veces aparece cada cliente?

1. En **I1** escribe `veces` y en **I2**: `=COUNTIF(B:B,B2)`.
2. Cópiala hacia abajo.

```captura
archivo: excel/e15-veces.webp
texto: COUNTIF(B:B,B2) (1): el cliente 1638 aparece 5 veces (2)
```

Activa el filtro y, en la flecha de **veces**, desmarca el **1**: quedan solo los clientes repetidos. Ordena por **cliente_id** para ver los repetidos uno al lado del otro: mismo cliente, con el nombre escrito distinto, el email en mayúsculas o la ciudad en minúsculas. Quita el filtro y borra la columna I cuando termines (selecciona I1:I401 y Supr).

## Paso 4 — Decide qué es un duplicado

Esta es la decisión más importante, y no es técnica:

| Si comparas… | Resultado |
|---|---|
| La fila completa | **0** duplicados: registro_id y fecha_carga siempre cambian |
| nombre + apellido | Junta clientes distintos que se llaman igual |
| **cliente_id** | ✔ La clave del cliente: una fila por cliente |

Y cuando hay varias filas del mismo cliente, ¿con cuál te quedas? Con la **carga más reciente** (la última información que mandó el sistema).

## Paso 5 — Quédate con la carga más reciente de cada cliente

Remove Duplicates se queda con la **primera** fila de cada grupo. El truco: ordenar antes para que la primera sea la más nueva.

1. Haz clic en una celda de **fecha_carga** (por ejemplo **G3**) → **Data → Sort Z→A**. Las cargas más nuevas quedan arriba.
2. Con una celda de la tabla seleccionada: **Data → Remove Duplicates**.
3. Presiona **Unselect All** (1), marca solo **cliente_id** (2) y **OK** (3).

```captura
archivo: excel/04-duplicados-columnas.webp
texto: Remove Duplicates: quitar todas las marcas (1), marcar solo la clave cliente_id (2) y OK (3)
```

4. Excel informa cuántas filas quitó y cuántas quedan.

```captura
archivo: excel/04-duplicados.webp
texto: 157 duplicados quitados; quedan 243 clientes, uno por cliente_id
```

El resultado coincide con lo que mediste en el paso 2 (243 clientes distintos). **Si no coincide, algo salió mal**: deshaz con Ctrl + Z y revisa.

:::cuidado Remove Duplicates borra sin preguntar
Las filas quitadas desaparecen. En el trabajo real, nunca limpies la única copia: trabaja sobre una copia de la hoja o, mejor, deja la tabla original intacta y limpia en otra (la capa *bronze* se conserva tal como llegó; la limpia es la *silver*).
:::

## Paso 6 — Normaliza los textos

1. En **H1** escribe `email_limpio` y en **H2**: `=LOWER(TRIM(E2))`. Cópiala hacia abajo.

```captura
archivo: excel/04-limpiar-texto.webp
texto: LOWER(TRIM(...)) quita los espacios y pasa a minúsculas
```

2. Haz lo mismo con el nombre: en **I1** `nombre_limpio`, **I2**: `=PROPER(TRIM(C2))` → `"  DIEGO "` queda `Diego`.
3. Y la ciudad: **J1** `ciudad_limpia`, **J2**: `=PROPER(TRIM(F2))` → `bogotá` queda `Bogotá`.

| Función | Hace | Ejemplo |
|---|---|---|
| `TRIM` | Quita espacios al inicio, al final y repetidos | `"  ana "` → `"ana"` |
| `LOWER` / `UPPER` | Minúsculas / mayúsculas | |
| `PROPER` | Primera letra de cada palabra en mayúscula | `"juan pérez"` → `"Juan Pérez"` |
| `SUBSTITUTE` | Reemplaza un texto | `=SUBSTITUTE(A2,"-","")` |
| `CLEAN` (Excel real) | Quita caracteres invisibles de sistemas viejos | |

:::nota Email vacío no se inventa
`=LOWER(TRIM(E2))` de un email vacío da un texto vacío. Está bien: un dato que falta se informa ("19 clientes sin email"), no se rellena con un valor inventado.
:::

## Paso 7 — Números y fechas que llegaron como texto

Cuando un archivo trae `"1500"` como texto (alineado a la izquierda), las sumas lo ignoran. Para convertirlo:

| Problema | Fórmula | Resultado |
|---|---|---|
| Número como texto | `=VALUE(A2)` | 1500 |
| Número con espacios | `=VALUE(TRIM(A2))` | 1500 |
| Decimal con coma en un Excel en inglés | `=VALUE(SUBSTITUTE(A2,",","."))` | 12.5 |
| ¿Es número de verdad? | `=ISNUMBER(A2)` | TRUE / FALSE |

Comprueba siempre con `ISNUMBER` o mirando la alineación.

## Paso 8 — Reemplaza las columnas sucias por las limpias

Las columnas con fórmulas dependen de las originales. Para quedarte solo con lo limpio en Excel real: copia **H:J** y usa **Paste Special → Values** (pega los resultados, no las fórmulas). Después ya puedes borrar las columnas originales. En esta réplica, exporta la hoja con **File → Export CSV**: el CSV guarda los valores.

## ✅ Lo que lograste

- Mediste la calidad de una tabla antes de limpiarla.
- Quitaste duplicados por clave, quedándote con el registro más reciente.
- Normalizaste textos y sabes convertir números guardados como texto.

:::ejercicio quiz
Remove Duplicates con todas las columnas marcadas quita 0 filas, pero sabes que hay clientes repetidos. ¿Por qué?
- [ ] Porque la función no anda con textos
- [x] Porque registro_id y fecha_carga cambian en cada fila: ninguna fila completa es igual a otra
- [ ] Porque hay que quitar el filtro primero
- [ ] Porque los duplicados están en otra hoja
:::

:::ejercicio quiz
Quieres quedarte con la carga más reciente de cada cliente. ¿Qué haces antes de Remove Duplicates por cliente_id?
- [ ] Nada, Excel elige la más nueva solo
- [x] Ordenar por fecha_carga de la más nueva a la más vieja, porque se queda la primera de cada grupo
- [ ] Ordenar por nombre
- [ ] Borrar la columna fecha_carga
:::

:::ejercicio quiz
¿Qué devuelve `=PROPER(TRIM("  MARÍA  josé "))`?
- [ ] "MARÍA JOSÉ"
- [ ] "  María José "
- [x] "María José"
- [ ] "maría josé"
:::

:::ejercicio quiz
Después de quitar duplicados quedan 250 filas, pero tu fórmula de clientes distintos daba 243. ¿Qué haces?
- [ ] Entrego igual, la diferencia es chica
- [x] Deshago y reviso: el resultado debería coincidir con lo medido (por ejemplo, marqué una columna de más)
- [ ] Borro 7 filas al azar
- [ ] Cambio la fórmula para que dé 250
:::
