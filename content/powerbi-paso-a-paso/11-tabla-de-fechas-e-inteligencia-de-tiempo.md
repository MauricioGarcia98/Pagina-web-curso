---
titulo: Tabla de fechas e inteligencia de tiempo - acumulado del año y año anterior
nivel: 3 · Intermedio
duracion: 50
resumen: Comparar con el año anterior o mostrar el acumulado del año es de lo más pedido en un informe. Para hacerlo bien hace falta una tabla de fechas - crearla con CALENDAR y ADDCOLUMNS, relacionarla con los pedidos, marcarla como tabla de fechas - y después las funciones de inteligencia de tiempo TOTALYTD, SAMEPERIODLASTYEAR y DATEADD, con el crecimiento interanual.
objetivos: Crear una tabla calculada de fechas | Relacionarla con la tabla de hechos | Marcarla como tabla de fechas | Escribir medidas de acumulado y de año anterior | Calcular el crecimiento interanual
prerrequisitos: powerbi-paso-a-paso-calculate-y-contexto
autoevaluacion: ¿Sabes por qué conviene una tabla de fechas propia? | ¿Sabes qué hace SAMEPERIODLASTYEAR? | ¿Sabes calcular el crecimiento contra el año anterior? | ¿Sabes qué pasa con el año anterior de 2022?
---

:::analogia En palabras simples
Para comparar "este marzo con el marzo pasado", Power BI necesita un calendario completo, con todos los días en fila, sin huecos. La tabla de fechas es ese calendario de pared: le cuelgas los pedidos y las funciones de tiempo saben ir para atrás y para adelante.
:::

## Paso 1 — La tabla de fechas

**Modelado → Nueva tabla**:

```text
Calendario = ADDCOLUMNS(
    CALENDAR(DATE(2022, 1, 1), DATE(2024, 12, 31)),
    "Año", YEAR([Date]),
    "Mes", FORMAT([Date], "yyyy-MM"),
    "Nombre mes", FORMAT([Date], "MMM")
)
```

| Parte | Hace |
|---|---|
| `CALENDAR(inicio, fin)` | Una tabla con una columna `Date` y una fila por día, sin huecos |
| `ADDCOLUMNS(tabla, "nombre", expresión, …)` | Agrega columnas calculadas a esa tabla |
| `FORMAT([Date], "yyyy-MM")` | El mes como texto ordenable (`2024-03`) |

Los pedidos van de 2022-01-01 a 2024-12-31: 1096 días. (`CALENDARAUTO()` arma el rango solo mirando las fechas del modelo.)

## Paso 2 — Relacionarla

**Modelado → Administrar relaciones → Nueva relación**:

```captura
archivo: powerbi/b11-nueva-relacion.webp
texto: Desde pedidos (1), columna fecha_pedido (2), a Calendario (3), columna Date (4), varios a uno (5), dirección única (6)
```

El filtro de un mes de `Calendario` llega a `pedidos` y de ahí a `detalle_pedidos`.

## Paso 3 — Marcar como tabla de fechas

En la vista Modelo, clic en la tabla **Calendario** → Propiedades → **Columna de fecha: Date** → **Marcar como tabla de fechas**:

```captura
archivo: powerbi/b11-marcar-fechas.webp
texto: Propiedades de Calendario - la columna de fecha y el botón Marcar como tabla de fechas
```

Marcarla le dice a Power BI que esa es "la" fecha del modelo: las funciones de tiempo la usan con seguridad y se dejan de crear las jerarquías automáticas ocultas de cada columna de fecha.

## Paso 4 — Las medidas de tiempo

```text
Ventas YTD = TOTALYTD([Ventas], Calendario[Date])
Ventas año anterior = CALCULATE([Ventas], SAMEPERIODLASTYEAR(Calendario[Date]))
Crecimiento % = DIVIDE([Ventas] - [Ventas año anterior], [Ventas año anterior])
```

| Función | Hace |
|---|---|
| `TOTALYTD([m], Calendario[Date])` | Acumula desde el 1 de enero hasta la fecha del contexto |
| `SAMEPERIODLASTYEAR(Calendario[Date])` | Cambia el contexto al mismo período del año anterior |
| `DATEADD(Calendario[Date], -1, MONTH)` | Corre el período: −1 mes, −1 trimestre, −1 año |
| `DATESYTD`, `DATESMTD` | Las fechas del año o mes hasta la fecha, para usar dentro de CALCULATE |

Un gráfico de líneas con `Calendario[Mes]` en el eje y **Ventas** y **Ventas año anterior** en los valores:

```captura
archivo: powerbi/b11-inteligencia-tiempo.webp
texto: Ventas y Ventas año anterior por mes (1), con las dos medidas en el Eje Y (2) - en 2022 el año anterior queda en cero porque no hay datos de 2021
```

## Paso 5 — Verificar

| Año | Ventas | Ventas año anterior | Crecimiento % |
|---|---|---|---|
| 2022 | 3 925 013,46 | (vacío) | (vacío) |
| 2023 | 4 925 094,46 | 3 925 013,46 | 25,5 % |
| 2024 | 6 027 906,15 | 4 925 094,46 | 22,4 % |

Arma una tabla con `Calendario[Año]` y las tres medidas y compara. **Ventas YTD** en diciembre de cada año es igual a las ventas del año completo.

:::cuidado La fecha que usas importa
La relación usa `fecha_pedido`. Si el negocio mide ventas por fecha de entrega o de pago, los números por mes cambian. Define con el área cuál es "la" fecha antes de construir; si necesitas las dos, una relación queda inactiva y se usa con `USERELATIONSHIP` dentro de CALCULATE.
:::

:::errores
- **Usar la columna de fecha de la tabla de hechos.** Las funciones de tiempo necesitan un calendario continuo marcado como tabla de fechas.
- **Calendario que no cubre todas las fechas.** Si falta un año, el acumulado y el año anterior dan vacío o mal.
- **Crecimiento como resta.** La resta da la diferencia; el crecimiento es la diferencia dividida por el año anterior.
:::

## ✅ Lo que lograste

- Creaste, relacionaste y marcaste una tabla de fechas.
- Escribiste acumulado del año, año anterior y crecimiento.
- Verificaste los números año por año.

:::ejercicio quiz
¿Por qué crear una tabla de fechas propia en lugar de usar la columna fecha_pedido?
- [ ] Porque fecha_pedido no se puede usar en gráficos
- [x] Porque las funciones de tiempo necesitan un calendario continuo, sin huecos, marcado como tabla de fechas
- [ ] Porque fecha_pedido tiene demasiados valores distintos
- [ ] No hace falta nunca
:::

:::ejercicio quiz
En 2022, ¿qué muestra Ventas año anterior?
- [ ] Las ventas de 2022
- [x] Vacío, porque no hay datos de 2021
- [ ] Las ventas de 2022 repetidas
- [ ] Las ventas de 2023
:::

:::ejercicio quiz
¿Cómo calculas el crecimiento contra el año anterior?
- [ ] [Ventas] - [Ventas año anterior]
- [x] DIVIDE([Ventas] - [Ventas año anterior], [Ventas año anterior])
- [ ] [Ventas] / 12
- [ ] TOTALYTD([Ventas])
:::
