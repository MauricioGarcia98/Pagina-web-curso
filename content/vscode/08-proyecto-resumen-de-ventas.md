---
titulo: Proyecto 2 (guiado, con pistas) - mejorar el script de resumen de ventas
nivel: 2 · Básico-intermedio
duracion: 60
resumen: El gerente comercial usa el script de resumen de ventas de diciembre y pide tres cambios - ver el ticket promedio por canal, una fila de total y cuántos pedidos se cancelaron. Modificas un script real en VS Code, lo ejecutas, verificas los números de control y entregas el CSV actualizado. Esta vez cada tarea dice qué hacer; el código está en pistas.
objetivos: Leer y entender un script ajeno antes de modificarlo | Agregar columnas calculadas a una salida | Contar casos con una condición | Verificar resultados con números de control | Dejar el archivo de salida actualizado y documentado
prerrequisitos: vscode-buscar-y-configurar
autoevaluacion: ¿Sabes modificar un script sin romper lo que ya hacía? | ¿Sabes calcular un promedio a partir de un total y un conteo? | ¿Sabes verificar un total de dos formas? | ¿Sabes comprobar que el CSV de salida cambió?
---

:::escenario El pedido
Mensaje del gerente comercial: *"El resumen de diciembre está bien, pero para el comité necesito: el ticket promedio de cada canal, una fila con el total, y cuántos pedidos se cancelaron. ¿Lo podés agregar al script? Y que el CSV también tenga el ticket promedio."*
:::

No hay capturas de cada clic: ya sabes moverte. Cada tarea dice **qué** hacer; el código está en la pista.

## Antes de empezar

1. Abre **scripts/resumen_ventas.py** en [VS Code de práctica](#/vscode).
2. Ejecútalo con ▷ y guarda la salida en tu cabeza (o en `notas/`): es la referencia para comprobar que no rompiste nada.
3. Haz una copia de seguridad: clic derecho en el explorador no tiene "duplicar", así que en la terminal: `cp scripts/resumen_ventas.py scripts/resumen_ventas_original.py`.

## Tarea 1 — Ticket promedio por canal

Agrega una columna `ticket` a la tabla impresa: ventas del canal dividido por pedidos del canal, con 2 decimales.

<details><summary>💡 Pista</summary>

En el `print` del encabezado agrega `{'ticket':>12}` y en el del `for`:

```python norun
ticket = totales[canal] / pedidos[canal]
print(f"{canal:<10}{pedidos[canal]:>10}{totales[canal]:>14,.2f}{ticket:>12,.2f}")
```

</details>

## Tarea 2 — Fila de total

Después del `for`, imprime una fila `TOTAL` con la suma de pedidos, la suma de ventas y el ticket promedio **general** (ventas totales / pedidos totales, no el promedio de los tickets).

<details><summary>💡 Pista</summary>

```python norun
total_pedidos = sum(pedidos.values())
total_ventas = sum(totales.values())
print(f"{'TOTAL':<10}{total_pedidos:>10}{total_ventas:>14,.2f}{total_ventas / total_pedidos:>12,.2f}")
```

</details>

## Tarea 3 — Cancelados

Cuenta los pedidos cancelados (hoy el script los salta con `continue`) e imprímelos al final: `Pedidos cancelados: N`.

<details><summary>💡 Pista</summary>

Crea `cancelados = 0` antes del `with` y, dentro del `if fila["estado"] == "cancelado":`, suma 1 antes del `continue`.

</details>

## Tarea 4 — El CSV con el ticket

Agrega la columna `ticket` al encabezado y a cada fila de `datos/resumen_canales.csv`.

<details><summary>💡 Pista</summary>

`f.write("canal,pedidos,ventas,ticket\n")` y en cada fila `f"{canal},{pedidos[canal]},{totales[canal]:.2f},{totales[canal] / pedidos[canal]:.2f}\n"`.

</details>

## ✔ Números de control

| Control | Valor esperado |
|---|---|
| Ticket web / app / tienda / teléfono | 1,306.47 / 1,284.96 / 1,027.64 / 1,271.75 |
| Total de pedidos (no cancelados) | 549 |
| Total de ventas | 677,549.74 |
| Ticket promedio general | 1,234.15 |
| Pedidos cancelados | 45 |
| Pedidos + cancelados | 594 (todas las filas del CSV de origen) |

:::tip Comprueba de dos formas
La última fila del control es una verificación cruzada: los pedidos que sumaste más los que saltaste tienen que dar todas las filas del archivo (`wc -l datos/ventas_2024_12.csv` da 595: 594 + el encabezado).
:::

## Entrega

1. Ejecuta el script y compara con los números de control.
2. Abre `datos/resumen_canales.csv` y confirma que tiene la columna `ticket`.
3. Borra la copia `resumen_ventas_original.py` cuando todo funcione (en el nivel 4 vas a usar Git para no necesitar copias).
4. Mensaje: *"Listo el resumen con ticket promedio y total: diciembre cerró en 677.549,74 con 549 pedidos (ticket 1.234,15); se cancelaron 45. La web tiene el ticket más alto."*

## 🖥️ Hazlo también en tu computadora

Copia el script a un proyecto en tu VS Code y crea `datos/ventas_2024_12.csv` con algunas filas: en la terminal de práctica, `head -20 datos/ventas_2024_12.csv` te muestra el formato (columnas `pedido_id,fecha,cliente_id,canal,estado,total`) para copiarlo y pegarlo. El script funciona igual con cualquier CSV que tenga esas columnas.

:::ejercicio quiz
¿Cómo calculas el ticket promedio general correcto?
- [ ] Promediando los cuatro tickets de los canales
- [x] Ventas totales divididas por pedidos totales
- [ ] Sumando los cuatro tickets
- [ ] Dividiendo las ventas por 4
:::

:::ejercicio quiz
¿Por qué conviene guardar la salida del script antes de modificarlo?
- [ ] Porque VS Code lo pide
- [x] Para comprobar después que lo que ya funcionaba sigue dando lo mismo
- [ ] Para que el script corra más rápido
- [ ] No conviene
:::

:::ejercicio quiz
Pedidos contados (549) + cancelados (45) dan 594 y el archivo tiene 594 filas de datos. ¿Qué te dice?
- [ ] Que hay un error
- [x] Que ninguna fila se perdió ni se contó dos veces
- [ ] Que faltan filas
- [ ] Nada útil
:::
