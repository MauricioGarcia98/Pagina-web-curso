---
titulo: Proyecto 1 (guiado) - tu primer análisis, guardado como tabla
nivel: 1 · Básico
duracion: 50
resumen: Tu líder quiere saber por qué canal llegan los pedidos de Tienda Andina y en qué estado están, y quiere el resultado guardado como tabla para usarlo después. Lo haces completo en el notebook Ventas por canal - una celda de texto, SQL, Python con display(), guardar en main.default y comprobar en el catálogo. Cada paso con su captura.
objetivos: Documentar un notebook con una celda de texto | Consultar con SQL y con Python en el mismo notebook | Guardar un resultado como tabla en Unity Catalog | Comprobar la tabla en el Catalog Explorer y su historial | Verificar los números antes de entregar
prerrequisitos: databricks-paso-a-paso-catalog-explorer
autoevaluacion: ¿Sabes guardar un DataFrame como tabla? | ¿Sabes dónde aparece la tabla después? | ¿Sabes comprobar que los totales cierran? | ¿Sabes qué celda documenta el notebook?
---

:::escenario El pedido
Mensaje de Lucía, líder de datos: *"Antes de la reunión del jueves necesito saber cuántos pedidos entran por cada canal y cuántos hay en cada estado. Dejalo en un notebook y guardá el resultado por canal como tabla en `main.default`, que después lo quiero en un tablero."*
:::

## Paso 1 — Abrir el notebook y documentarlo

Abre **Workspace → Ventas por canal** (lo creaste en la lección 2). En la primera celda escribe una celda de texto:

```text
%md
# Ventas por canal
Primer análisis sobre `samples.tienda.pedidos`: cuántos pedidos hay por canal y por estado, y una tabla guardada en `main.default`.
```

Al ejecutarla (Shift + Enter) se convierte en texto con formato. Un notebook que empieza explicando qué hace se entiende dentro de seis meses.

## Paso 2 — Pedidos por canal (SQL)

En la celda siguiente:

```sql norun
%sql
SELECT canal, COUNT(*) AS pedidos
FROM samples.tienda.pedidos
GROUP BY canal
ORDER BY pedidos DESC
```

Deberías ver **web 5400**, **app 2973**, **tienda 2645**, **telefono 982**. Suma: 12 000 pedidos.

## Paso 3 — Pedidos por estado (Python)

```python norun
df = spark.table("samples.tienda.pedidos")
display(df.groupBy("estado").count().orderBy("count", ascending=False))
```

`groupBy("estado").count()` es el `GROUP BY` de Spark. Resultado: **entregado 9288**, **cancelado 967**, **enviado 736**, **devuelto 506**, **pendiente 503**. Suma: 12 000 otra vez. Cuando dos caminos distintos dan el mismo total, el número es confiable.

## Paso 4 — Guardar el resultado como tabla

```python norun
(df.groupBy("canal").count()
   .write.mode("overwrite")
   .saveAsTable("main.default.ventas_por_canal"))
```

| Parte | Significa |
|---|---|
| `.write` | Vamos a escribir |
| `.mode("overwrite")` | Si la tabla existe, se reemplaza (`append` agregaría filas) |
| `.saveAsTable("main.default.ventas_por_canal")` | Tabla **Delta administrada** en Unity Catalog, con nombre de tres partes |

Y compruébalo con SQL en la celda siguiente:

```sql norun
%sql
SELECT * FROM main.default.ventas_por_canal ORDER BY count DESC
```

```captura
archivo: databricks/d04-guardar-tabla.webp
texto: La celda que guarda (1) no muestra nada - la consulta siguiente (2) confirma que la tabla existe con los 4 canales
```

## Paso 5 — Verlo en el catálogo

Menú **Catalog → main → default → ventas_por_canal**:

```captura
archivo: databricks/d04-tabla-main.webp
texto: La tabla en main.default (1) - Managed table, Delta, 4 filas, dueño tú (2)
```

```captura
archivo: databricks/d04-historial.webp
texto: History - la primera versión de la tabla, creada por el notebook
```

Cada vez que vuelvas a ejecutar la celda de guardado aparecerá una versión nueva en **History**: en el nivel 3 vas a usar eso para volver atrás en el tiempo.

## ✔ Control

| Control | Esperado |
|---|---|
| Pedidos por canal | web 5400 · app 2973 · tienda 2645 · telefono 982 |
| Pedidos por estado | entregado 9288 · cancelado 967 · enviado 736 · devuelto 506 · pendiente 503 |
| Suma de cada tabla | 12 000 |
| `main.default.ventas_por_canal` | Existe, 4 filas, Managed table · Delta |
| El notebook | Empieza con una celda de texto que explica qué hace |

## Entrega

Respuesta a Lucía: *"Listo: el 45 % de los pedidos entra por la web (5400 de 12 000) y el 77 % está entregado. El detalle está en el notebook `Ventas por canal` y la tabla por canal quedó en `main.default.ventas_por_canal`."*

## 🖥️ Hazlo también en Databricks real

En un workspace real el flujo es idéntico: `samples` también existe (con otras tablas, como `samples.nyctaxi.trips`), tu catálogo se llamará como lo haya definido tu administrador (`main`, `dev`, el nombre de tu área) y el cómputo **Serverless** está listo al instante. La única diferencia que vas a notar: la primera celda de Python tarda unos segundos en conectar, no en cargar.

:::errores
- **Guardar sin elegir el modo.** Sin `overwrite`, la segunda corrida falla porque la tabla ya existe; con `append` se duplica.
- **No cuadrar totales.** Dos cálculos sobre los mismos pedidos deben sumar lo mismo; si no, algo está mal.
- **Dejar el resultado solo en el notebook.** Si no se guarda como tabla, nadie más lo puede usar.
:::

:::ejercicio quiz
¿Qué hace `.mode("overwrite")` al guardar?
- [ ] Agrega las filas al final
- [x] Reemplaza la tabla si ya existe
- [ ] Borra el notebook
- [ ] Agrega una columna con la fecha de carga
:::

:::ejercicio quiz
Guardaste con saveAsTable("main.default.ventas_por_canal"). ¿Dónde la ves?
- [ ] Solo en el notebook
- [x] En Catalog → main → default
- [ ] En samples → tienda
- [ ] En Compute
:::

:::ejercicio quiz
Los pedidos por canal suman 12 000 y los pedidos por estado también. ¿Qué te dice eso?
- [ ] Que hay un error
- [x] Que los dos cálculos son consistentes y el total es confiable
- [ ] Que la tabla está duplicada
- [ ] Que hay que agrupar por las dos columnas a la vez
:::
