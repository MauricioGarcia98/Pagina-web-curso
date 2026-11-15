---
titulo: Proyecto 4 (con requisitos) - el informe comercial interactivo de tres páginas
nivel: 4 · Intermedio-avanzado
duracion: 90
resumen: El área comercial quiere un informe que puedan explorar solos - una página de resumen con los KPI, una de análisis por canal y categoría, y una de detalle de producto a la que se llegue con clic derecho. Con navegación por botones, filtros correctos, un tema coherente y conclusiones escritas. Requisitos y control; sin pasos.
objetivos: Diseñar un informe de varias páginas con navegación | Aplicar filtros en el nivel correcto | Construir una página de Obtener detalles útil | Usar marcadores para vistas guardadas | Cumplir reglas de diseño y verificar los números
prerrequisitos: powerbi-paso-a-paso-visuales-avanzados-e-ia
autoevaluacion: ¿Sabes decidir qué va en cada página? | ¿Sabes conectar páginas con botones? | ¿Sabes armar una página de detalle por producto? | ¿Sabes verificar un informe completo?
---

:::escenario El pedido
Rodrigo, gerente comercial: *"Quiero un informe para mi equipo. Primero, un resumen con los números del año. Después, poder ver por canal y por categoría, comparando con el año anterior. Y si algo llama la atención, hacer clic y ver el detalle de esa categoría: qué productos, en qué países. Que puedan moverse sin perderse."*
:::

Este proyecto tiene **requisitos y control**, sin pasos. Todo está en las lecciones 9 a 15.

## Requisitos

1. **Modelo**: las cinco tablas de Tienda Andina, `Calendario` marcada como tabla de fechas, las medidas **Ventas**, **Ventas entregadas**, **Pedidos**, **Ticket promedio**, **Entregadas año anterior** y **Crecimiento entregadas %**, en una tabla `_Medidas` o carpeta.
2. **Página "Resumen"**: cuatro tarjetas (Ventas entregadas, Pedidos, Ticket promedio, Crecimiento entregadas %), una línea mensual de Ventas entregadas contra el año anterior, una segmentación de año y un cuadro de texto con la conclusión.
3. **Página "Canales y categorías"**: matriz canal × año con Ventas entregadas y crecimiento; barras de categorías por Ventas entregadas con formato condicional; filtro **en esta página** para excluir el canal teléfono si el equipo no lo atiende (déjalo preparado y desactivado).
4. **Página "Detalle de categoría"** (oculta): de Obtener detalles por `categorias[nombre]`, con una tabla de productos (nombre, Ventas entregadas, Pedidos) y el top 5 de países.
5. **Navegación**: botones de navegación de página en las dos primeras páginas y botón Atrás en la de detalle.
6. **Marcadores**: "Solo 2024" y "Solo web".
7. **Diseño**: un tema aplicado, títulos que sean preguntas o conclusiones, el KPI principal arriba a la izquierda.

## ✔ Control

| Control | Esperado |
|---|---|
| Ventas entregadas (sin filtros) | 11 518 639,19 |
| Con año 2024 | 4 648 578,76 · crecimiento 23,2 % |
| Pedidos (sin filtros) | 12 000 (son todos los pedidos; las ventas son solo de entregados) |
| Clic derecho en "Laptops" → Obtener detalles | La página de detalle filtrada por Laptops, con sus productos |
| Marcador "Solo web" | Matriz con una sola fila (web) |
| Página de detalle | Oculta en la barra de páginas |

:::nota Pedidos y ventas entregadas
"Pedidos" cuenta todos los pedidos y "Ventas entregadas" solo lo entregado: el Ticket promedio con esas dos medidas mezcla universos. Decide y escribe en el informe qué usa tu ticket (por ejemplo, crea **Pedidos entregados** con CALCULATE y úsalo en el ticket). Esa decisión es parte de la nota de la rúbrica.
:::

## Rúbrica

| Criterio | Insuficiente | Competente | Sobresaliente |
|---|---|---|---|
| Medidas | Números que no cierran | Todas las medidas con control OK | Ticket coherente (mismo universo) y medidas documentadas |
| Navegación | Hay que buscar las páginas | Botones y Obtener detalles funcionan | El recorrido resumen → análisis → detalle se hace sin explicación |
| Filtros | Filtros en el nivel equivocado | Cada filtro en su nivel | Segmentaciones sincronizadas entre páginas (Vista → Sincronizar segmentaciones) |
| Diseño | Colores y títulos genéricos | Tema, títulos-pregunta, KPI arriba | Conclusiones escritas que coinciden con los números |

## Entrega

Mensaje a Rodrigo: *"Listo el informe comercial: Resumen, Canales y categorías, y un detalle por categoría al que llegás con clic derecho. Los marcadores 'Solo 2024' y 'Solo web' dejan las vistas más usadas a un clic. Ventas son siempre las entregadas."*

## 🖥️ Hazlo también en Power BI real

En Power BI Desktop, guarda este informe como **proyecto (.pbip)** (Archivo → Guardar como): queda una carpeta de texto que puedes subir a Git. En la práctica, **Archivo → Exportar el modelo (TMDL)** descarga la definición del modelo para abrirla allá.

:::ejercicio quiz
¿Por qué la página de detalle va oculta?
- [ ] Porque está incompleta
- [x] Porque se llega a ella con clic derecho o un botón ya filtrada; navegarla sola no tiene sentido
- [ ] Porque Power BI lo exige
- [ ] Para que no se publique
:::

:::ejercicio quiz
Ticket promedio = DIVIDE([Ventas entregadas], [Pedidos]). ¿Qué problema tiene?
- [ ] Ninguno
- [x] Divide ventas de pedidos entregados por todos los pedidos: mezcla universos y da un ticket más bajo del real
- [ ] DIVIDE no acepta medidas
- [ ] Da error
:::
