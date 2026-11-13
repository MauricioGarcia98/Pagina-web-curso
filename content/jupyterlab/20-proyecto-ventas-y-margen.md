---
titulo: Proyecto 5 (requisitos y rúbrica) - ventas y margen por rubro, con categorías en tres niveles
nivel: 5 · Avanzado
duracion: 120
resumen: El gerente de producto quiere saber qué rubros y categorías dejan más plata en 2024, no solo cuáles venden más, y cómo crecieron contra 2023. Unes cuatro tablas, resuelves una jerarquía de categorías de tres niveles, calculas ventas y margen respetando el grano, lo empaquetas en funciones probadas y entregas un notebook reproducible con gráficos y un CSV. Requisitos y rúbrica; las decisiones son tuyas.
objetivos: Unir cuatro tablas respetando el grano de cada una | Resolver una jerarquía padre-hijo de varios niveles | Calcular ventas, margen y crecimiento por grupo | Encapsular la lógica en funciones probadas en un módulo | Entregar un análisis reproducible con controles
prerrequisitos: jupyterlab-rendimiento-y-buenas-practicas
autoevaluacion: ¿Sabes unir detalle, pedidos, productos y categorías sin duplicar? | ¿Sabes llevar cada categoría a su rubro de primer nivel? | ¿Sabes calcular margen y % de margen? | ¿Sabes demostrar que tus totales cierran?
---

:::escenario El pedido
Reunión con el gerente de producto: *"Siempre miramos qué vende más, pero quiero saber qué nos deja más plata. Para 2024: ventas y margen por rubro (Tecnología, Hogar, Deportes, Moda) y por categoría, cuánto creció cada rubro contra 2023, y los cinco productos que más venden. Solo pedidos entregados: lo cancelado no es venta."*
:::

Sin pasos ni pistas de código. Tienes requisitos, números de control y una rúbrica.

## Las tablas (en datos/)

| Tabla | Grano (una fila es…) | Columnas clave |
|---|---|---|
| `detalle_pedidos` | una línea de producto en un pedido | pedido_id, producto_id, cantidad, precio_unitario, descuento |
| `pedidos` | un pedido | pedido_id, fecha_pedido, estado |
| `productos` | un producto | producto_id, nombre, categoria_id, costo |
| `categorias` | una categoría | categoria_id, nombre, categoria_padre_id |

:::cuidado La jerarquía tiene tres niveles
`Laptops` tiene como padre a `Computadoras`, y `Computadoras` a `Tecnología`. Si unes solo un nivel, Laptops queda bajo "Computadoras", que no es un rubro. Tienes que subir hasta la categoría que no tiene padre.
:::

## Requisitos

**R1 — Parámetros**: `ANIO = 2024` y `ESTADO_VENTA = "entregado"` en la primera celda de código. Ningún año escrito en otro lugar.

**R2 — Módulo**: un archivo `ventas.py` con, al menos, una función que agregue la columna `rubro` a la tabla de categorías (resolviendo la jerarquía) y otra que calcule importe y margen de cada línea. Cada función con docstring y probada con `assert` en el notebook (incluido un caso borde).

**R3 — Definiciones** (escritas en Markdown):
- Importe de una línea = cantidad × precio_unitario × (1 − descuento).
- Margen de una línea = importe − cantidad × costo.
- % de margen = margen / importe.

**R4 — Tablas de resultado**:
1. Por rubro en el año: ventas, margen y % de margen, ordenado por ventas.
2. Crecimiento de ventas por rubro contra el año anterior (%).
3. Por categoría en el año: ventas, margen y % de margen.
4. Los 5 productos con más ventas del año.

**R5 — Gráficos**: al menos dos, con títulos que concluyan (por ejemplo, ventas contra % de margen por rubro).

**R6 — Controles** (`assert`): la cantidad de líneas no cambia al unir con productos y categorías; la suma de ventas por rubro es igual a la suma total de importes del año.

**R7 — Entrega**: `ventas_por_categoria_{ANIO}.csv` y una sección `## Conclusiones` con 3 hallazgos y una recomendación.

## ✔ Números de control (ANIO = 2024, solo entregados)

| Control | Valor |
|---|---|
| Líneas de detalle de pedidos entregados en 2024 | 7,592 |
| Ventas 2024 | 4,509,913.91 |
| Margen 2024 | 1,793,408.71 (39.8 %) |

| Rubro (2024) | Ventas | % margen | Crecimiento vs 2023 |
|---|---|---|---|
| Tecnología | 2,337,903.7 | 39.9 % | +25.7 % |
| Deportes | 1,324,689.5 | 38.8 % | +19.1 % |
| Hogar | 667,648.2 | 41.1 % | +24.1 % |
| Moda | 179,672.6 | 40.0 % | +19.9 % |

Categoría con más ventas en 2024: **Laptops** (1,187,630.5). Producto con más ventas: **Notebook HP Mini 300** (232,543.28).

:::tip Si tus números no coinciden
Revisa en este orden: (1) ¿filtraste solo entregados y el año correcto? (2) ¿subiste la jerarquía hasta el primer nivel? (3) ¿el merge con productos o categorías cambió la cantidad de filas? (4) ¿aplicaste el descuento?
:::

## Rúbrica

| Criterio | Insuficiente | Bien | Excelente |
|---|---|---|---|
| Exactitud | No coincide con el control | Coincide | Coincide y los assert lo demuestran |
| Grano y uniones | Totales inflados o líneas perdidas | Uniones correctas | Verificadas con validate o conteos |
| Código | Celdas copiadas | Funciones en un .py | Funciones probadas, con casos borde y docstring |
| Reproducibilidad | Depende del orden de ejecución | Restart and Run All funciona | Cambiar ANIO a 2023 funciona sin tocar nada más |
| Comunicación | Describe tablas | 3 hallazgos con números | Hallazgos que distinguen "vende más" de "deja más" y recomendación accionable |

<details><summary>Ver un ejemplo de conclusión (después de escribir la tuya)</summary>

*"Tecnología concentra el 52 % de las ventas de 2024 y es el rubro que más creció (+25,7 %). Hogar vende tres veces y media menos, pero tiene el mejor margen (41,1 %). Recomendación: en Hogar, dar más visibilidad a Muebles, la categoría que más vende del rubro y una de las de mayor margen (41,8 %)."*

</details>

:::ejercicio quiz
¿Por qué hay que filtrar solo pedidos entregados?
- [ ] Porque los demás no tienen detalle
- [x] Porque lo cancelado o devuelto no es venta: incluirlo inflaría ventas y margen
- [ ] Porque pandas no une estados distintos
- [ ] Porque los entregados tienen descuento
:::

:::ejercicio quiz
Unes detalle con productos y la cantidad de filas aumenta. ¿Qué significa?
- [ ] Que es normal en un merge left
- [x] Que algún producto_id está repetido en productos y duplicó líneas
- [ ] Que faltan productos
- [ ] Que hay descuentos
:::

:::ejercicio quiz
Un rubro tiene ventas de 600 y margen de 240. ¿Cuál es el % de margen?
- [ ] 24 %
- [x] 40 %
- [ ] 60 %
- [ ] 250 %
:::
