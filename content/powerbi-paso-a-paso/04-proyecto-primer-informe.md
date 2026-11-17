---
titulo: Proyecto 1 (guiado) - el informe de pedidos para la reunión del lunes
nivel: 1 · Básico
duracion: 50
resumen: Tu jefa quiere, para la reunión del lunes, una página que muestre cuántos pedidos hay, por qué canal entran, en qué estado están y cómo evolucionan por mes - y poder filtrar por estado. Lo armas completo con lo que aprendiste - cargar las tablas, cuatro visuales, una segmentación - y verificas los números antes de entregar. Cada paso con su captura.
objetivos: Cargar las tablas necesarias | Construir una página con tarjeta, columnas, líneas y segmentación | Verificar que los totales cierran | Nombrar y guardar el informe
prerrequisitos: powerbi-paso-a-paso-tu-primer-grafico
autoevaluacion: ¿Sabes qué visual usar para una evolución en el tiempo? | ¿Sabes verificar que la suma de las barras es el total de la tarjeta? | ¿Sabes usar la jerarquía de fecha automática? | ¿Sabes guardar el informe con nombre?
---

:::escenario El pedido
Mensaje de Lucía, líder de datos: *"Para el lunes necesito una página simple: total de pedidos, pedidos por canal, pedidos por estado y la evolución mensual. Que se pueda filtrar por estado. Nada de colores raros: claro y que los números cierren."*
:::

## Paso 1 — Los datos

Si ya tienes las cinco tablas de Tienda Andina cargadas (lección 2), sigue. Si no: **Inicio → Obtener datos → Base de datos del curso** → marca `clientes`, `productos`, `categorias`, `pedidos`, `detalle_pedidos` → **Cargar**.

## Paso 2 — La tarjeta del total

Sin nada seleccionado, galería → **Tarjeta** → marca `pedidos → pedido_id` → en el pozo, **Recuento**. Debe decir **12 000** (en la práctica se muestra como "12 mil"). Muévela arriba a la izquierda y hazla chica.

## Paso 3 — Pedidos por canal y por estado

1. Clic en el lienzo vacío → **Gráfico de columnas agrupadas** → `canal` en Eje X, `pedido_id` (Recuento) en Eje Y.
2. Clic en el lienzo vacío → **Gráfico de barras agrupadas** → `estado` en Eje Y, `pedido_id` (Recuento) en Eje X.

Verifica: canal → web 5400 · app 2973 · tienda 2645 · telefono 982 (suma 12 000). Estado → entregado 9288 · cancelado 967 · enviado 736 · devuelto 506 · pendiente 503 (suma 12 000).

## Paso 4 — La evolución mensual

Clic en el lienzo vacío → **Gráfico de líneas** → en Eje X, `pedidos → fecha_pedido` (usa la jerarquía automática: expándela y marca **Año** y **Mes**, o arrastra la columna completa) → Eje Y, `pedido_id` (Recuento).

Los datos van de **enero de 2022 a diciembre de 2024** (36 meses). Si ves un solo punto, estás agrupando por año: agrega el nivel Mes.

## Paso 5 — La segmentación

Clic en el lienzo vacío → **Segmentación de datos** → `pedidos → estado`. Marca `cancelado`: la tarjeta pasa a 967 y las barras cambian. Desmárcala.

## Paso 6 — Orden y nombre

Acomoda: tarjeta arriba a la izquierda, segmentación a la derecha, canal y estado en el medio, la línea abajo a lo ancho. **Insertar → Cuadro de texto** con el título "Pedidos — Tienda Andina". Después **Archivo → Guardar como** con el nombre `Pedidos semanal`.

## ✔ Control

| Control | Esperado |
|---|---|
| Tarjeta | 12 000 pedidos |
| Columnas por canal | web 5400 · app 2973 · tienda 2645 · telefono 982 |
| Barras por estado | entregado 9288 · cancelado 967 · enviado 736 · devuelto 506 · pendiente 503 |
| Línea mensual | 36 puntos, de 2022-01 a 2024-12 |
| Segmentación en `cancelado` | Tarjeta 967; canal web 421 · app 266 · tienda 207 · telefono 73 |
| Barra de estado | 5 tablas · 4 relaciones · 0 medidas |

## Entrega

Mensaje a Lucía: *"Lista la página `Pedidos semanal`: 12 000 pedidos, el 45 % por web, el 77 % entregados y la curva mensual de 2022 a 2024. Se filtra por estado con la segmentación de la derecha."*

## 🖥️ Hazlo también en Power BI real

Descarga Power BI Desktop (gratis, Windows) y repite el proyecto con cualquier tabla tuya: la mecánica de galería, pozos y segmentaciones es idéntica. Si no tienes datos, en la práctica **Archivo → Exportar el modelo (TMDL)** te da el modelo para abrirlo allá.

:::errores
- **Línea mensual sin el nivel Mes.** Con solo Año en el eje, la línea tiene un punto por año.
- **No cuadrar los totales.** Si la suma de las barras no coincide con la tarjeta, algún filtro o relación está mal.
- **Títulos por defecto.** "Recuento de pedido_id por canal" no dice nada a la jefa; el título cuenta qué muestra.
:::

:::ejercicio quiz
La línea mensual muestra un solo punto por año. ¿Qué falta?
- [ ] Más datos
- [x] Agregar el nivel Mes de la jerarquía de fecha al Eje X
- [ ] Cambiar a gráfico de barras
- [ ] Una medida
:::

:::ejercicio quiz
¿Cómo verificas que los gráficos son consistentes entre sí?
- [ ] Mirando los colores
- [x] Comprobando que la suma de las barras de cada gráfico coincide con el total de la tarjeta
- [ ] Publicando
- [ ] Mirando que todos usen el mismo tema
:::
