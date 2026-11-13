---
titulo: Proyecto 1 (guiado paso a paso) - el presupuesto de una jornada de capacitación
nivel: 1 · Básico
duracion: 45
resumen: Primer proyecto real. Tu área organiza una jornada para 40 personas y te piden el presupuesto en Excel. Armas la tabla, escribes tus primeras cuentas (cantidad por precio y un total), le das formato, la revisas con una lista de control y la entregas en CSV. Con cada paso explicado y capturas, y la versión para hacerlo en Excel real.
objetivos: Pasar un pedido de trabajo a una tabla con encabezados claros | Escribir una multiplicación y un total con AutoSum | Dar formato profesional (negrita, moneda, anchos) | Revisar con una lista de control y entregar el archivo
prerrequisitos: excel-hojas-filas-formato
autoevaluacion: ¿Sabes armar una tabla con encabezados claros? | ¿Sabes escribir =B2*C2? | ¿Sabes hacer un total con AutoSum? | ¿Sabes exportar la hoja a CSV?
---

:::escenario El pedido
Mensaje de tu jefa: *"El jueves 20 hacemos la jornada de capacitación para 40 personas. Necesito el presupuesto en Excel: catering para todos (18 por persona), el alquiler del salón (450), el sonido (220) y una remera para cada asistente (9,50 cada una). Mandámelo hoy así lo aprueba finanzas."*
:::

Este proyecto es **guiado paso a paso**: cada paso dice exactamente qué hacer. En los próximos niveles vas a recibir cada vez menos instrucciones.

## Paso 1 — Antes de abrir Excel: ¿qué columnas necesito?

Lee el pedido y separa lo que se repite en cada renglón:

- Cada cosa a comprar es un **ítem** (catering, salón, sonido, remeras).
- Cada ítem tiene una **cantidad** (40 personas, 1 salón…).
- Cada ítem tiene un **precio unitario**.
- Lo que vas a calcular es el **subtotal** = cantidad × precio.

Esas cuatro son las columnas. Al final, una fila de **Total**.

:::tip La regla de oro de las tablas
Una fila por cosa, una columna por dato, y los encabezados en la fila 1. Si respetas esto desde el principio, todo lo que viene (filtros, tablas dinámicas, gráficos) funciona solo.
:::

## Paso 2 — Prepara la hoja

1. Abre [Excel de práctica](#/excel).
2. Presiona **+** abajo para crear una hoja nueva.
3. Doble clic en la pestaña → escribe `Presupuesto` → **OK**.

## Paso 3 — Escribe la tabla

Escribe exactamente esto (usa **Tab** para ir a la derecha y **Enter** al final de cada fila):

| | A | B | C |
|---|---|---|---|
| 1 | Ítem | Cantidad | Precio unitario |
| 2 | Catering | 40 | 18 |
| 3 | Alquiler del salón | 1 | 450 |
| 4 | Sonido | 1 | 220 |
| 5 | Remeras | 40 | 9.5 |
| 6 | Total | | |

En **D1** escribe `Subtotal`.

:::cuidado Los números sin símbolos
Escribe `9.5`, no `$9,50`. El signo de moneda se agrega después con formato. Si lo escribes a mano, Excel puede tomarlo como texto y no va a multiplicar.
:::

## Paso 4 — Tu primera cuenta: cantidad × precio

1. Haz clic en **D2**.
2. Escribe `=B2*C2` y presiona **Enter**. Aparece **720**.

Qué significa: el `=` le avisa a Excel que viene una cuenta; `B2*C2` es "lo que hay en B2 multiplicado por lo que hay en C2". El asterisco `*` es la multiplicación.

3. Repite en las filas siguientes:
   - **D3**: `=B3*C3`
   - **D4**: `=B4*C4`
   - **D5**: `=B5*C5`

(En el nivel 2 vas a aprender a copiar una fórmula a cien filas de una vez.)

:::tip Comprueba que es una receta
Cambia la cantidad de **B2** de 40 a 45: el subtotal de D2 se actualiza solo. Vuelve a dejarlo en 40.
:::

## Paso 5 — El total con AutoSum

1. Haz clic en **D6**.
2. Presiona **Alt + =** (o Home → **AutoSum**). Excel propone `=SUM(D2:D5)`.
3. Presiona **Enter**. El total es **1770**.

## Paso 6 — Formato profesional

1. Selecciona **A1:D1** → **Ctrl + B** (negrita).
2. Selecciona **C2:D6** → Home → Number → **Currency**.
3. Ensancha la columna **A** para que entre "Alquiler del salón" (arrastra el borde entre A y B).
4. Pon en negrita la fila del total: selecciona **A6:D6** → Ctrl + B.

```captura
archivo: excel/e04-presupuesto.webp
texto: El presupuesto terminado: total $1,770.00
```

## Paso 7 — Revisa antes de entregar

- [ ] Hay un subtotal por cada ítem y ninguno está vacío.
- [ ] El total es **$1,770.00**.
- [ ] Al cambiar una cantidad, cambia el subtotal y el total (las cuentas son fórmulas, no números escritos a mano).
- [ ] Los encabezados están en negrita y los importes con formato de moneda.
- [ ] La hoja se llama `Presupuesto`, no `Sheet2`.

## Paso 8 — Entrega

1. Pestaña **File** → **Export CSV**. Se descarga la hoja activa.
2. Renombra el archivo a algo que cualquiera entienda: `presupuesto_jornada_capacitacion.csv`.
3. Escribe el mensaje de entrega en dos líneas: *"Te paso el presupuesto de la jornada: total $1.770. El 62 % es catering y remeras, que dependen de la cantidad de asistentes; si confirman menos personas, baja."*

:::nota Por qué el mensaje importa
Quien recibe el archivo no tiene tiempo de abrirlo para entender qué le mandaste. Dos líneas con el número principal y una observación útil (qué parte depende de qué) hacen que tu trabajo se use.
:::

## 🖥️ Hazlo también en Excel real

Repite el proyecto en Excel de verdad para comprobar que todo funciona igual:

- **Excel para la web** es gratis con una cuenta personal de Microsoft (office.com → Excel → Blank workbook). La cinta y los nombres son los mismos que en la práctica.
- Si tu Excel está en español, los menús cambian de nombre (**Inicio** en lugar de Home, **Autosuma** en lugar de AutoSum) y las funciones también (`SUMA` en lugar de `SUM`). Las fórmulas con `*` y referencias como `B2` son idénticas.
- En Excel real se guarda como `.xlsx` (File → Save As / Download a copy). El CSV solo guarda los valores, sin formato ni fórmulas.

:::ejercicio quiz
¿Por qué conviene que el subtotal sea `=B2*C2` y no el número 720 escrito a mano?
- [ ] Porque Excel no deja escribir números en esa columna
- [x] Porque si cambia la cantidad o el precio, el subtotal se recalcula solo
- [ ] Porque ocupa menos espacio
- [ ] Porque así se ve con formato de moneda
:::

:::ejercicio quiz
¿Qué hace Alt + = en D6, debajo de los subtotales?
- [ ] Copia la celda de arriba
- [x] Propone =SUM(D2:D5), la suma del rango de arriba
- [ ] Pone el formato de moneda
- [ ] Borra la columna
:::

:::ejercicio quiz
Exportas la hoja a CSV. ¿Qué se pierde?
- [ ] Los números
- [ ] Los encabezados
- [x] El formato (negrita, moneda) y las fórmulas: solo quedan los valores
- [ ] Nada, es igual que un .xlsx
:::
