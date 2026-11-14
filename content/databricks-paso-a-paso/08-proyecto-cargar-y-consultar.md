---
titulo: Proyecto 2 (guiado, con pistas) - cargar las devoluciones y responder al área de atención al cliente
nivel: 2 · Básico-intermedio
duracion: 60
resumen: Atención al cliente te manda las devoluciones de la semana en un CSV y quiere saber en qué categorías y canales se concentran, con un gráfico y una consulta que puedan reutilizar cambiando el canal. Lo resuelves con lo aprendido en el nivel - esquema propio, carga del archivo, consultas, parámetro, gráfico y consulta guardada. Cada tarea dice qué hacer; el cómo está en las pistas.
objetivos: Organizar tus tablas en un esquema propio | Cargar un archivo como tabla y como archivo en un volumen | Responder preguntas de negocio con SQL | Dejar una consulta parametrizada y un gráfico reutilizables | Verificar los números antes de entregar
prerrequisitos: databricks-paso-a-paso-subir-datos-y-volumenes
autoevaluacion: ¿Sabes crear un esquema? | ¿Sabes cargar un CSV a un esquema que no es default? | ¿Sabes sumar montos por categoría y por canal? | ¿Sabes dejar la consulta lista para otra persona?
---

:::escenario El pedido
Mensaje de Sofía, de atención al cliente: *"Te paso las devoluciones de la primera semana de noviembre (`devoluciones.csv`). ¿Me podés decir en qué categorías y por qué canal se nos van más pesos? Y si puede ser, dejame algo donde yo cambie el canal y vea el detalle, que lo voy a mirar todas las semanas."*
:::

Usa el archivo `devoluciones.csv` de la lección 7. Cada tarea dice **qué**; las pistas, **cómo**.

## Tarea 1 — Un esquema para el área

Las tablas de atención al cliente no van en `default`. Crea el esquema `main.atencion` desde el Catalog Explorer o con SQL.

<details><summary>💡 Pista</summary>

Catalog → main → **Create schema** → `atencion`. O en el editor SQL: `CREATE SCHEMA main.atencion;`

</details>

## Tarea 2 — Cargar el archivo dos veces

1. Como tabla `main.atencion.devoluciones` con **Add data** (elige el esquema `atencion`).
2. Como archivo en un volumen `main.atencion.archivos`, para conservar el original tal cual llegó.

<details><summary>💡 Pista</summary>

Data Ingestion → Create or modify table → archivo → Catalog `main`, Schema `atencion`, nombre `devoluciones` → Create table. Para el volumen: Catalog → main → atencion → **Create volume** → `archivos` → entra y **Upload to this volume**.

</details>

## Tarea 3 — Las dos preguntas

En el editor SQL, calcula el monto total y la cantidad de devoluciones **por categoría** y **por canal**, ordenados de mayor a menor monto.

<details><summary>💡 Pista</summary>

```sql norun
SELECT categoria, COUNT(*) AS devoluciones, ROUND(SUM(monto), 2) AS monto
FROM main.atencion.devoluciones
GROUP BY categoria
ORDER BY monto DESC;
```

Y lo mismo con `canal`.

</details>

## Tarea 4 — La consulta para Sofía

Una consulta con un parámetro `canal` que muestre el detalle de las devoluciones de ese canal (pedido, fecha, categoría, motivo, monto), guardada con el nombre **Devoluciones por canal** en tu carpeta.

<details><summary>💡 Pista</summary>

`WHERE canal = :canal` crea el campo arriba del editor. **Save** → nombre → tu carpeta. Sofía la encontrará en **Queries**.

</details>

## Tarea 5 — El gráfico

Sobre la consulta por categoría, agrega un gráfico de barras (categoría en X, monto en Y).

<details><summary>💡 Pista</summary>

En el resultado, **+** → Bar → X `categoria` → Y `monto` → Save. Queda como pestaña junto a Table.

</details>

## ✔ Control

| Control | Esperado |
|---|---|
| Esquema | `main.atencion` existe, con la tabla `devoluciones` y el volumen `archivos` |
| Filas cargadas | 12 |
| Por categoría (monto) | Electrónica 767.40 (4) · Hogar 333.00 (3) · Ropa 147.90 (3) · Juguetes 45.40 (2) |
| Por canal (monto) | web 851.80 (6) · app 248.90 (3) · tienda 193.00 (3) |
| Total | 1293.70 en las dos tablas |
| Consulta guardada | "Devoluciones por canal" aparece en Queries y pide el parámetro canal |
| Con canal = `app` | 3 filas: pedidos 1002, 1005 y 1010 |

Si el total por categoría no coincide con el total por canal, revisa el tipo de la columna `monto`: si quedó como texto, `SUM` no suma lo que esperas.

## Entrega

Respuesta a Sofía: *"Electrónica concentra el 59 % del monto devuelto (767 de 1294) y la web el 66 %. Casi todo lo de Electrónica es 'defectuoso'. Te dejé la consulta 'Devoluciones por canal' en Queries: cambiás el canal arriba y ves el detalle."*

## 🖥️ Hazlo también en Databricks real

El asistente **Add data** y los volúmenes funcionan igual. Para archivos que llegan cada semana, en lugar de subirlos a mano se deja una carpeta del volumen como buzón y se automatiza la carga con `COPY INTO` o un pipeline (niveles 3 y 4).

:::ejercicio quiz
¿Por qué guardar también el archivo original en un volumen?
- [ ] Porque Add data lo exige
- [x] Para conservar el dato tal como llegó: si hay dudas o errores en la tabla, se vuelve al original
- [ ] Para que ocupe menos
- [ ] No tiene sentido
:::

:::ejercicio quiz
El total por categoría da 1293.70 pero por canal da 0. ¿Qué pasó, probablemente?
- [ ] Hay más canales que categorías
- [x] Algo en la columna usada o en el tipo de monto está mal: hay que revisar la tabla, no entregar
- [ ] Es normal
- [ ] Faltan permisos
:::
