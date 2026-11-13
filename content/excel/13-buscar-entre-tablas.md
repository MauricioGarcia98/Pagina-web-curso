---
titulo: Buscar entre tablas - XLOOKUP, VLOOKUP, INDEX con MATCH y el error #N/A
nivel: 4 · Intermedio-avanzado
duracion: 50
resumen: Unir dos tablas por una clave es lo que más se hace con datos, en Excel y en SQL. Cómo traer el país del cliente a cada pedido con XLOOKUP, qué hace VLOOKUP y por qué falla cuando insertas columnas, la combinación INDEX/MATCH, cómo leer y tratar #N/A, y cómo comprobar que la búsqueda no perdió filas.
objetivos: Traer datos de otra tabla con XLOOKUP | Leer y escribir un VLOOKUP con coincidencia exacta | Buscar con INDEX y MATCH | Tratar los #N/A con el cuarto argumento de XLOOKUP o IFNA | Verificar una búsqueda contando los no encontrados
prerrequisitos: excel-proyecto-reporte-comercial
autoevaluacion: ¿Sabes los tres argumentos obligatorios de XLOOKUP? | ¿Sabes por qué VLOOKUP lleva FALSE al final? | ¿Sabes qué significa #N/A? | ¿Sabes verificar cuántas filas no encontraron pareja?
---

:::analogia En palabras simples
Buscar es como usar una agenda: tienes el **número de cliente** en el pedido y quieres su **país**. Vas a la tabla de clientes, buscas ese número en la columna de ids y lees el país en la misma fila. XLOOKUP hace eso mismo, para 12.000 pedidos en un segundo.
:::

## Paso 1 — Una búsqueda en la misma hoja

En la hoja **pedidos**: **¿por qué canal entró el pedido número 5?**

1. En **I3** escribe `Canal del pedido 5`.
2. En **J3** escribe `=XLOOKUP(5,A:A,F:F,"no está")`.

```captura
archivo: excel/03-xlookup.webp
texto: XLOOKUP (1) busca el 5 en la columna A y devuelve lo de la columna F (2)
```

```text
=XLOOKUP(qué_busco, dónde_lo_busco, qué_devuelvo, [si_no_lo_encuentra])
```

Se lee: "buscá **5** en **A:A**, y devolvé lo que está en la misma fila de **F:F**; si no lo encontrás, poné *no está*".

## Paso 2 — Unir dos tablas: el país del cliente

Cada pedido tiene un **cliente_id** (columna B), pero el país está en la tabla **clientes**.

1. Carga **clientes** si no la tienes (Data → Get Data → clientes). Su columna **A** es cliente_id y la **G** es pais.
2. Vuelve a **pedidos**. En **O1** escribe `pais_cliente`.
3. En **O2** escribe:

```text
=XLOOKUP(B2,clientes!A:A,clientes!G:G,"sin cliente")
```

4. Cópiala hacia abajo (selecciona **O2:O8** y Ctrl + D para probar).

```captura
archivo: excel/e13-xlookup-hojas.webp
texto: XLOOKUP entre hojas (1): cada pedido trae el país de su cliente (2)
```

:::tip Es un JOIN
Esto es exactamente un `LEFT JOIN` de SQL: cada pedido busca su cliente; si no lo encuentra, queda "sin cliente".

```sql
SELECT p.*, c.pais AS pais_cliente
FROM pedidos p LEFT JOIN clientes c ON c.cliente_id = p.cliente_id;
```
:::

:::cuidado Copiar a 12.000 filas
Para llenar toda la columna: escribe `O2:O12001` en el cuadro de nombres y Enter (queda seleccionado el rango), y presiona **Ctrl + D**. Con miles de búsquedas la hoja tarda unos segundos en recalcular: es normal.
:::

## Paso 3 — VLOOKUP, la clásica

Vas a encontrar `VLOOKUP` en casi todos los archivos de las empresas. Hace lo mismo con otra forma:

```text
=VLOOKUP(qué_busco, tabla, número_de_columna, FALSE)
=VLOOKUP(B2, clientes!A:J, 7, FALSE)
```

- Busca **siempre en la primera columna** de la tabla (A).
- Devuelve la columna número **7** contando desde la primera (G = pais).
- **FALSE** pide coincidencia exacta. Si lo omites, VLOOKUP hace una coincidencia aproximada y puede devolver el país de **otro** cliente sin avisar.

| | XLOOKUP | VLOOKUP |
|---|---|---|
| Busca a la izquierda | Sí | No (solo en la primera columna) |
| Si insertas una columna en medio | Sigue bien | El número 7 queda apuntando a otra columna |
| Exacta por defecto | Sí | No: hay que poner FALSE |
| Valor si no encuentra | 4.º argumento | Hay que envolverla en IFNA |
| Disponible en | Excel 2021, 365 y la web | Todas las versiones |

## Paso 4 — El error #N/A

1. En **I4** escribe `Pedido 999999` y en **J4**: `=VLOOKUP(999999,A:F,6,FALSE)`.

```captura
archivo: excel/03-error-na.webp
texto: #N/A significa "no se encontró"
```

`#N/A` no es un fallo de la fórmula: es la respuesta "**no existe**". Para mostrar otra cosa:

```text
=IFNA(VLOOKUP(999999,A:F,6,FALSE),"no existe")
```

Prefiere `IFNA` a `IFERROR` en búsquedas: IFNA solo tapa el "no encontrado"; IFERROR taparía también un `#REF!` por una tabla mal escrita.

## Paso 5 — INDEX con MATCH

Antes de XLOOKUP, la forma flexible de buscar era combinar dos funciones:

- `MATCH(qué, dónde, 0)` devuelve la **posición** (fila) donde está el valor.
- `INDEX(columna, posición)` devuelve el valor de esa posición.

```text
=INDEX(clientes!G:G, MATCH(B2, clientes!A:A, 0))
```

Da lo mismo que el XLOOKUP del paso 2. Vale la pena reconocerla porque aparece en muchos archivos heredados, y funciona en cualquier versión de Excel.

## Paso 6 — Verifica la búsqueda

Una unión que pierde filas en silencio es un error grave. Después de buscar, controla:

| Control | Fórmula |
|---|---|
| ¿Cuántos no encontraron cliente? | `=COUNTIF(O:O,"sin cliente")` |
| ¿Cuántas filas tiene la columna? | `=COUNTA(O:O)-1` (debe ser igual a las filas de pedidos) |
| ¿Hay ids de cliente repetidos en clientes? | `=COUNTIF(clientes!A:A,B2)` debe dar 1 |

:::cuidado La clave repetida
Si un cliente_id aparece **dos veces** en la tabla de clientes, XLOOKUP devuelve el primero y no avisa. En SQL, el JOIN duplicaría el pedido. Por eso, antes de unir, se verifica que la clave sea única en la tabla que buscas (nivel 4, lección de limpieza).
:::

## ✅ Lo que lograste

- Uniste dos tablas por una clave con XLOOKUP.
- Sabes leer VLOOKUP e INDEX/MATCH, y sus trampas.
- Sabes tratar #N/A y verificar que la unión no perdió filas.

:::ejercicio quiz
¿Qué devuelve `=XLOOKUP(5,A:A,F:F)` si el 5 no está en la columna A?
- [ ] 0
- [ ] Una celda vacía
- [x] #N/A
- [ ] #DIV/0!
:::

:::ejercicio quiz
`=VLOOKUP(B2,clientes!A:J,7)` (sin el FALSE). ¿Cuál es el riesgo?
- [ ] Ninguno, es lo mismo
- [x] Hace coincidencia aproximada y puede devolver el dato de otro cliente sin avisar
- [ ] Siempre devuelve #N/A
- [ ] Devuelve la columna A
:::

:::ejercicio quiz
Quieres traer el email (columna D de clientes) a cada pedido. ¿Cuál es correcta?
- [x] `=XLOOKUP(B2,clientes!A:A,clientes!D:D)`
- [ ] `=XLOOKUP(clientes!A:A,B2,clientes!D:D)`
- [ ] `=XLOOKUP(B2,clientes!D:D,clientes!A:A)`
- [ ] `=VLOOKUP(B2,clientes!A:J,3,FALSE)`
:::

:::ejercicio quiz
¿Por qué conviene IFNA en lugar de IFERROR alrededor de una búsqueda?
- [ ] Porque IFNA es más rápida
- [x] Porque IFNA solo reemplaza el "no encontrado" y deja ver otros errores reales
- [ ] Porque IFERROR no existe en Excel en inglés
- [ ] Es indistinto
:::
