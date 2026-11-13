---
titulo: Decisiones con IF - clasificar filas con condiciones, AND, OR, IFS e IFERROR
nivel: 3 · Intermedio
duracion: 45
resumen: Cómo hacer que Excel decida - si el pedido entró por web o app es "online", si no "presencial". IF paso a paso, cómo encadenar varias condiciones (IF anidado e IFS), cómo combinarlas con AND y OR, y cómo atajar errores con IFERROR. Sobre la tabla real de 12.000 pedidos de la tienda del curso.
objetivos: Cargar una tabla del curso con Get Data | Escribir un IF con prueba lógica, valor si es verdadero y valor si es falso | Encadenar condiciones con IF anidado e IFS | Combinar condiciones con AND y OR | Reemplazar errores con IFERROR
prerrequisitos: excel-proyecto-ventas-diarias
autoevaluacion: ¿Sabes las tres partes de un IF? | ¿Sabes cuándo usar AND y cuándo OR? | ¿Sabes clasificar en tres o más grupos? | ¿Sabes por qué el texto va entre comillas?
---

:::analogia En palabras simples
`IF` es una pregunta con dos respuestas posibles: "**si** el canal es web, escribe *online*; **si no**, escribe *presencial*". Es lo mismo que decides tú todos los días: si llueve, llevo paraguas; si no, no.
:::

## Paso 1 — Carga los pedidos de la tienda

Desde este nivel trabajamos con datos reales de **Tienda Andina**, la empresa del curso: 12.000 pedidos de 2022 a 2024.

1. En [Excel de práctica](#/excel), pestaña **Data** → **Get Data**.
2. Elige **pedidos** (ya viene marcado) y presiona **Load**.

```captura
archivo: excel/03-get-data.webp
texto: Get Data: elige la tabla y presiona Load (2)
```

3. Se abre la hoja **pedidos**, con una fila por pedido.

```captura
archivo: excel/03-pedidos.webp
texto: La hoja pedidos (1), con una fila por pedido
```

| Columna | Dato | Valores |
|---|---|---|
| A | pedido_id | 1 a 12000 |
| B | cliente_id | id del cliente |
| D | fecha_pedido | 2022-01-01 a 2024-12-31 |
| E | estado | entregado, enviado, pendiente, cancelado, devuelto |
| F | canal | web, app, tienda, telefono (sin tilde) |
| G | metodo_pago | tarjeta_credito, tarjeta_debito, transferencia, efectivo, billetera_virtual |

:::tip Muévete rápido en tablas largas
**Ctrl + ↓** te lleva a la última fila; **Ctrl + ↑** vuelve arriba. Para ir a una celda lejana, escríbela en el cuadro de nombres (por ejemplo `N2`) y Enter.
:::

## Paso 2 — Tu primer IF

Queremos una columna **tipo** que diga si el pedido fue *online* o *presencial*. Usaremos la columna **N** (deja I a M libres: las usamos en las próximas lecciones).

```text
=IF(prueba_lógica, valor_si_verdadero, valor_si_falso)
```

1. En **N1** escribe `tipo`.
2. En **N2** escribe `=IF(F2="tienda","presencial","online")` y Enter.

Se lee: "si F2 es igual a *tienda*, escribe *presencial*; si no, *online*".

:::cuidado Los textos van entre comillas
`"tienda"` con comillas es un texto. Sin comillas, `tienda` es un nombre que Excel no conoce y da `#NAME?`. Los números van sin comillas: `=IF(B2>100,"grande","chico")`.
:::

Pero hay un problema: los pedidos por **teléfono** quedaron como *online*. Hace falta más de una condición.

## Paso 3 — Varias condiciones: IF dentro de IF

Reemplaza N2 por:

```text
=IF(F2="web","online",IF(F2="app","online","presencial"))
```

El segundo IF está en el lugar del "si no": si no es web, pregunta si es app; si tampoco, es presencial (tienda o teléfono).

```captura
archivo: excel/e09-if.webp
texto: El IF anidado en la barra de fórmulas (1) y su resultado (2)
```

Cópiala hacia abajo (selecciona **N2:N6** y Ctrl + D para probar en pocas filas).

## Paso 4 — Más claro con OR y AND

| Función | Devuelve TRUE si… | Ejemplo |
|---|---|---|
| `OR(c1, c2, …)` | **alguna** condición se cumple | `OR(F2="web",F2="app")` |
| `AND(c1, c2, …)` | **todas** se cumplen | `AND(E2="entregado",F2="web")` |
| `NOT(c)` | la condición **no** se cumple | `NOT(E2="cancelado")` |

La misma clasificación, más fácil de leer:

```text
=IF(OR(F2="web",F2="app"),"online","presencial")
```

Y una con AND: marcar los pedidos web que se perdieron.

```text
=IF(AND(F2="web",E2="cancelado"),"revisar","")
```

`""` (dos comillas juntas) es un texto vacío: la celda queda en blanco.

## Paso 5 — Tres o más grupos: IFS

Para clasificar el estado en tres grupos, IFS evita anidar:

```text
=IFS(E2="entregado","cerrado",OR(E2="cancelado",E2="devuelto"),"perdido",TRUE,"en curso")
```

IFS recibe pares **condición, resultado** y devuelve el primero que se cumple. El último par `TRUE,"en curso"` es el "en cualquier otro caso".

:::cuidado El orden importa
IFS e IF anidado se detienen en la **primera** condición verdadera. Para clasificar montos: `=IFS(B2>=1000,"alto",B2>=500,"medio",TRUE,"bajo")` funciona; si pones primero `B2>=500`, un pedido de 2000 queda como "medio".
:::

## Paso 6 — Atajar errores: IFERROR

Cuando una cuenta puede fallar (dividir por cero, buscar algo que no existe), IFERROR muestra otra cosa en lugar del error:

```text
=IFERROR(C2/B2, 0)
=IFERROR(C2/B2, "sin datos")
```

:::cuidado No escondas errores que importan
IFERROR tapa **cualquier** error, incluido uno que te avisa de un dato mal cargado. Úsalo cuando sabes por qué puede fallar (por ejemplo, un día sin ventas) y no para que "la hoja se vea limpia".
:::

## ✅ Lo que lograste

- Cargaste una tabla real de 12.000 filas.
- Clasificaste filas con IF, IF anidado, OR, AND e IFS.
- Sabes atajar errores esperables con IFERROR.

:::ejercicio quiz
¿Qué devuelve `=IF(B2>100,"grande","chico")` si B2 vale 100?
- [ ] grande
- [x] chico
- [ ] TRUE
- [ ] Un error
:::

:::ejercicio quiz
Quieres marcar los pedidos que son de la app **y** se pagaron en efectivo. ¿Qué usas dentro del IF?
- [ ] `OR(F2="app",G2="efectivo")`
- [x] `AND(F2="app",G2="efectivo")`
- [ ] `F2="app"+G2="efectivo"`
- [ ] `NOT(F2="app")`
:::

:::ejercicio quiz
Escribes `=IF(F2=web,"online","presencial")` y da `#NAME?`. ¿Por qué?
- [ ] Porque F2 está vacía
- [x] Porque falta poner web entre comillas: "web"
- [ ] Porque IF necesita cuatro argumentos
- [ ] Porque la columna F tiene números
:::

:::ejercicio quiz
`=IFS(A2>=50,"medio",A2>=80,"alto",TRUE,"bajo")`. ¿Qué devuelve con A2 = 90?
- [ ] alto
- [x] medio, porque la primera condición verdadera es A2>=50
- [ ] bajo
- [ ] Un error
:::
