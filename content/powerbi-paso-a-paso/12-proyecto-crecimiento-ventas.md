---
titulo: Proyecto 3 (pistas cerradas) - el informe de crecimiento de ventas para dirección
nivel: 3 · Intermedio
duracion: 75
resumen: Dirección quiere saber cuánto crecieron las ventas año contra año, en qué canales y países, y solo con lo que realmente se entregó. Construyes el modelo de medidas completo (ventas entregadas, año anterior, crecimiento, participación) con una tabla de fechas y una página que lo cuente. Las pistas están cerradas - ábrelas solo si te trabas.
objetivos: Definir una medida de negocio con CALCULATE (solo entregados) | Construir medidas de año anterior y crecimiento sobre ella | Calcular la participación por canal | Armar una página que responda las preguntas de dirección | Verificar cada número contra un control
prerrequisitos: powerbi-paso-a-paso-tabla-de-fechas-e-inteligencia-de-tiempo
autoevaluacion: ¿Sabes construir una medida sobre otra medida filtrada? | ¿Sabes calcular un crecimiento interanual por canal? | ¿Sabes qué denominador usar para la participación? | ¿Sabes verificar con una consulta DAX?
---

:::escenario El pedido
Mail de Patricia, directora comercial: *"Para el directorio necesito el crecimiento de las ventas: cuánto vendimos cada año, cuánto crecimos contra el año anterior, qué canal crece más y dónde vendemos más. Ojo: ventas son las entregadas; lo cancelado o devuelto no es venta. Una página, que se entienda sin explicación."*
:::

Pistas cerradas: intenta cada tarea antes de abrirlas.

## Tarea 1 — La medida de negocio

Crea **Ventas entregadas** sobre la medida Ventas, contando solo los pedidos en estado `entregado`.

<details><summary>💡 Pista</summary>

```text
Ventas entregadas = CALCULATE([Ventas], pedidos[estado] = "entregado")
```

</details>

## Tarea 2 — Año anterior, crecimiento y participación

Sobre **Ventas entregadas**: el año anterior, el crecimiento % y la participación de cada canal sobre el total del año.

<details><summary>💡 Pista</summary>

```text
Entregadas año anterior = CALCULATE([Ventas entregadas], SAMEPERIODLASTYEAR(Calendario[Date]))
Crecimiento entregadas % = DIVIDE([Ventas entregadas] - [Entregadas año anterior], [Entregadas año anterior])
Participación canal % = DIVIDE([Ventas entregadas], CALCULATE([Ventas entregadas], ALL(pedidos[canal])))
```

`ALL(pedidos[canal])` quita solo el filtro de canal: el año sigue filtrando, así la participación es "dentro del año". Formato de porcentaje en las dos últimas.

</details>

## Tarea 3 — La página

1. Tarjetas: Ventas entregadas, Crecimiento entregadas % (con una segmentación de año).
2. Columnas agrupadas: `Calendario[Año]` en el eje, Ventas entregadas y Entregadas año anterior.
3. Matriz: `pedidos[canal]` en filas, `Calendario[Año]` en columnas, Ventas entregadas y Crecimiento entregadas % en valores.
4. Barras: top 5 países por Ventas entregadas.
5. Un título y una línea de texto con la conclusión.

<details><summary>💡 Pista</summary>

Para el top 5: arrastra `clientes[pais]` a **Filtros en este objeto visual** → Tipo de filtro **N superior** → Mostrar elementos: Superior 5 → Por valor: Ventas entregadas.

</details>

## Tarea 4 — Verificarlo con una consulta

Comprueba los números por año con la vista de consultas DAX.

<details><summary>💡 Pista</summary>

```text
EVALUATE
    SUMMARIZECOLUMNS(
        Calendario[Año],
        "Entregadas", [Ventas entregadas],
        "Año anterior", [Entregadas año anterior],
        "Crecimiento", [Crecimiento entregadas %]
    )
ORDER BY Calendario[Año]
```

</details>

## ✔ Control

| Control | Esperado |
|---|---|
| Ventas entregadas (todo) | **11 518 639,19** |
| Por año | 2022: 3 098 030,38 · 2023: 3 772 030,05 · 2024: 4 648 578,76 |
| Crecimiento entregadas % | 2023: 21,8 % · 2024: 23,2 % |
| 2024 por canal | web 2 128 988,78 · app 1 160 895,24 · tienda 970 756,75 · telefono 387 937,99 |
| Participación web en 2024 | 45,8 % |
| Canal que más crece 2024 vs 2023 | telefono (387 937,99 contra 277 157,91: +40,0 %) |

Si **Ventas entregadas** da 14 878 014,07, el filtro de estado no se aplicó: revisa el `CALCULATE`.

## Entrega

Mensaje a Patricia: *"Las ventas entregadas crecieron 23 % en 2024 (4,65 M contra 3,77 M). La web es el 46 % del total y el teléfono, aunque es el canal más chico, es el que más crece (+40 %). Todo calculado solo sobre pedidos entregados."*

:::ejercicio quiz
¿Por qué la participación usa ALL(pedidos[canal]) y no ALL(pedidos)?
- [ ] Da lo mismo
- [x] Porque ALL(pedidos) también quitaría el filtro de estado entregado y otros filtros de pedidos; solo hay que ignorar el canal
- [ ] Porque ALL(pedidos) no existe
- [ ] Porque es más rápido
:::

:::ejercicio quiz
Ventas entregadas da lo mismo que Ventas. ¿Qué revisas primero?
- [ ] El tema del informe
- [x] El filtro pedidos[estado] = "entregado" dentro del CALCULATE (que esté bien escrito el valor)
- [ ] La tabla de fechas
- [ ] La segmentación
:::
