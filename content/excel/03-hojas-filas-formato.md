---
titulo: Hojas, columnas y formato - ordenar el libro para que otros lo entiendan
nivel: 1 · Básico
duracion: 35
resumen: Un libro bien armado se entiende sin explicaciones. Cómo crear, renombrar y borrar hojas, ajustar el ancho de las columnas, poner encabezados en negrita y centrados, y aplicar formatos de número (moneda, porcentaje, fecha) sabiendo que el formato cambia cómo se ve el dato, no el dato.
objetivos: Crear, renombrar y borrar hojas | Ajustar el ancho de una columna | Dar formato a encabezados (negrita, alineación) | Aplicar formatos de número y distinguir valor de formato
prerrequisitos: excel-escribir-y-editar
autoevaluacion: ¿Sabes renombrar una hoja? | ¿Sabes qué nombres de hoja no se permiten? | ¿Sabes ensanchar una columna? | ¿Sabes por qué el formato moneda no cambia el valor?
---

:::analogia En palabras simples
Un libro de Excel es una carpeta; cada hoja es una pestaña de la carpeta. Si las pestañas se llaman "Sheet1", "Sheet2" y "Copia de Sheet1 (2)", nadie sabe dónde está cada cosa. Nombres claros y encabezados prolijos son la diferencia entre un archivo que se usa y uno que se descarta.
:::

## Paso 1 — Crea una hoja nueva

1. En [Excel de práctica](#/excel), mira la barra de abajo: ahí están las pestañas de las hojas.
2. Presiona el botón **+** (1). Aparece una hoja nueva y queda activa (2).

```captura
archivo: excel/e03-hoja-nueva.webp
texto: El botón + (1) agrega una hoja; la pestaña activa (2) se ve resaltada
```

Para cambiar de hoja, haz clic en su pestaña.

## Paso 2 — Ponle un nombre que diga qué tiene

1. Haz **doble clic** en la pestaña de la hoja.
2. Se abre el cuadro **Rename sheet**. Escribe `Datos` y presiona **OK**.

```captura
archivo: excel/e03-renombrar.webp
texto: El cuadro Rename sheet: escribe el nombre nuevo
```

Reglas para el nombre:

| Regla | Ejemplo |
|---|---|
| Máximo 31 caracteres | `ventas_2024` ✔ |
| Sin `\ / ? * [ ] :` | `ventas/2024` ✘ |
| No se puede repetir en el libro | dos hojas `Datos` ✘ |

:::tip Nombres que funcionan en todos lados
Usa nombres cortos, en minúscula y sin espacios (`ventas_2024`, `clientes`). Más adelante vas a escribir fórmulas como `=SUM(ventas_2024!B:B)` y, si la hoja tiene espacios, hay que encerrarla entre comillas simples: `='ventas 2024'!B:B`.
:::

En el mismo cuadro está **Delete sheet**, para borrar la hoja. Cuidado: se borra con todo lo que tiene (Ctrl + Z la recupera si te arrepientes enseguida).

## Paso 3 — Ensancha una columna

Cuando un texto no entra, se corta o invade la celda de al lado.

1. Lleva el mouse al **borde derecho del encabezado** de la columna (entre la letra A y la B). El cursor cambia a ↔.
2. Arrastra hacia la derecha hasta que el texto entre.

```captura
archivo: excel/e03-ancho-columna.webp
texto: El borde del encabezado de columna: arrástralo para cambiar el ancho
```

:::nota Los ######
Si un **número** no entra en la columna, Excel muestra `#####` en lugar de cortarlo (cortarlo podría mostrar un número equivocado). No es un error: ensancha la columna.
:::

## Paso 4 — Encabezados en negrita y centrados

1. Selecciona la fila de encabezados, **A1:D1**.
2. Pestaña **Home** → **B** (Bold, atajo **Ctrl + B**) (1).
3. En **Alignment**, presiona el botón del centro (2).

```captura
archivo: excel/e03-formato-cinta.webp
texto: Bold (1), Center (2) y el desplegable de formato de número (3) en la pestaña Home
```

## Paso 5 — Formato de número: cómo se ve, no qué es

1. Selecciona **B2:B3** (los números).
2. En **Number** (3), elige **Currency**. `12.5` se ve como `$12.50`.
3. Haz clic en **B2** y mira la barra de fórmulas: sigue diciendo `12.5`.

| Formato | El valor `0.256` se ve | Uso típico |
|---|---|---|
| General | 0.256 | Lo que Excel decida |
| Number | 0.26 | Cantidades con decimales fijos |
| Currency | $0.26 | Dinero |
| Percentage | 25.6% | Tasas, participaciones |
| Integer | 0 | Cantidades enteras |
| Date | (para números de fecha) | Fechas |

:::cuidado El formato no redondea el valor
Si una celda vale `0.256` y la ves como `26%`, al sumarla Excel usa `0.256`. Por eso a veces un total "no cierra" por centavos con lo que ves en pantalla. Si necesitas redondear de verdad, se usa la función `ROUND` (nivel 2).
:::

## ✅ Lo que lograste

- Creaste y renombraste hojas con nombres útiles.
- Ajustaste anchos y diste formato a encabezados.
- Entendiste la diferencia entre valor y formato.

:::ejercicio quiz
¿Cuál de estos nombres de hoja NO se permite?
- [ ] ventas_2024
- [x] ventas/2024
- [ ] Clientes
- [ ] resumen-final
:::

:::ejercicio quiz
Una celda muestra `#####`. ¿Qué significa?
- [ ] Que la fórmula tiene un error
- [x] Que el número no entra en el ancho de la columna
- [ ] Que la celda está protegida
- [ ] Que el dato se borró
:::

:::ejercicio quiz
Una celda vale `0.256` y tiene formato Percentage sin decimales: se ve `26%`. Si la multiplicas por 100, ¿qué da?
- [ ] 26
- [x] 25.6
- [ ] 26%
- [ ] 0.26
:::
