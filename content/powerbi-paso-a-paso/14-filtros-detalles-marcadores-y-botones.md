---
titulo: Interactividad - niveles de filtro, Obtener detalles, marcadores y botones
nivel: 4 · Intermedio-avanzado
duracion: 50
resumen: Lo que hace que un informe se explore en lugar de leerse - los tres niveles del panel Filtros (objeto visual, página, todas las páginas) y sus tipos (básico, avanzado, N superior), las páginas de Obtener detalles a las que se llega con clic derecho, explorar en profundidad con jerarquías, marcadores para guardar vistas y botones para navegar.
objetivos: Elegir el nivel de filtro correcto | Usar filtros básicos, avanzados y N superior | Crear una página de Obtener detalles | Guardar vistas con marcadores | Navegar con botones
prerrequisitos: powerbi-paso-a-paso-diseno-formato-temas-y-paginas
autoevaluacion: ¿Sabes la diferencia entre un filtro de página y uno de todas las páginas? | ¿Sabes armar un top 5 con un filtro? | ¿Sabes cómo se llega a una página de detalle? | ¿Sabes qué guarda un marcador?
---

:::analogia En palabras simples
Un informe interactivo es como un mapa con lupa: miras el país entero y, cuando algo te llama la atención, haces zoom en una provincia, después en una ciudad, y vuelves. Los filtros son la lupa, Obtener detalles es el zoom, y los marcadores y botones son los atajos.
:::

## Paso 1 — Los tres niveles de filtro

```captura
archivo: powerbi/b14-filtros.webp
texto: Filtros en este objeto visual (1), en esta página (2) - con segmento como filtro básico - y en todas las páginas (3)
```

| Nivel | Afecta a | Ejemplo |
|---|---|---|
| **En este objeto visual** | Solo ese gráfico | El top 5 de países |
| **En esta página** | Todos los visuales de la página | Solo segmento Pyme en la página "Empresas" |
| **En todas las páginas** | Todo el informe | Solo año 2024 |

Arrastra un campo del panel Datos al nivel que corresponda. Los filtros no se ven en el lienzo (a diferencia de las segmentaciones): úsalos para reglas fijas, y segmentaciones para lo que el usuario cambia.

| Tipo de filtro | Para qué |
|---|---|
| **Básico** | Marcar valores de una lista |
| **Avanzado** | Condiciones: contiene, empieza por, mayor que, está en blanco… |
| **N superior** | Los N primeros o últimos según una medida (top 5 países por ventas) |

## Paso 2 — Obtener detalles

Una página de **detalle** muestra todo sobre un elemento (una categoría, un cliente) y se llega a ella con clic derecho desde cualquier otra página.

1. Crea una página "Detalle de categoría" con una matriz y un mapa.
2. En **Visualizaciones → Obtener detalles**, arrastra `categorias[nombre]`.

```captura
archivo: powerbi/b14-obtener-detalles.webp
texto: El campo de obtención de detalles en la página; la pestaña muestra el ícono de página de detalle
```

Ahora, en la página principal, **clic derecho en una barra de una categoría → Obtener detalles → Detalle de categoría** abre la página filtrada por esa categoría, con un botón **←** para volver.

## Paso 3 — Explorar en profundidad

Un visual con una **jerarquía** en el eje (Año → Mes, o Categoría → Producto) muestra flechas arriba: **subir** un nivel, **modo explorar** (clic en una barra baja a su detalle), **ir al siguiente nivel** y **expandir** todos un nivel. Es la forma de ir del total al detalle sin crear otro gráfico.

## Paso 4 — Marcadores

**Vista → Marcadores**:

```captura
archivo: powerbi/b14-marcadores.webp
texto: Agregar (1) guarda la vista actual - filtros, segmentaciones, página y visibilidad; Ver (2) los recorre como una presentación
```

Un marcador guarda el **estado** de la página. Sirve para "vistas guardadas" (Solo 2024, Solo web) y, combinado con el panel **Selección** (mostrar u ocultar visuales), para armar pestañas dentro de una misma página.

## Paso 5 — Botones

**Insertar → Botones**:

```captura
archivo: powerbi/b14-botones.webp
texto: Atrás, Marcador, Navegación de páginas, Obtener detalles, Preguntas y respuestas, URL
```

| Botón | Acción |
|---|---|
| **Navegación de páginas** | Ir a otra página (un menú dentro del informe) |
| **Marcador** | Aplicar un marcador |
| **Atrás** | Volver desde una página de detalle |
| **Obtener detalles** | Ir al detalle del elemento seleccionado |

En Power BI Desktop se hace **Ctrl + clic** sobre un botón para probarlo; en el servicio, clic normal.

## ✅ Lo que lograste

- Usas los tres niveles y tipos de filtro.
- Armaste una página de detalle y conoces la exploración en profundidad.
- Guardas vistas con marcadores y navegas con botones.

:::ejercicio quiz
Quieres que todo el informe muestre solo 2024, sin que el usuario lo pueda cambiar desde el lienzo. ¿Qué usas?
- [ ] Una segmentación
- [x] Un filtro en todas las páginas
- [ ] Un marcador
- [ ] Un botón
:::

:::ejercicio quiz
¿Cómo armas un gráfico con los 5 países que más venden?
- [ ] Ordeno y borro el resto
- [x] Filtro de objeto visual por país, tipo N superior, 5, por la medida de ventas
- [ ] Con un marcador
- [ ] No se puede
:::

:::ejercicio quiz
¿Cómo llega el usuario a una página de Obtener detalles?
- [ ] Desde el menú Archivo
- [x] Con clic derecho en un dato de otra página → Obtener detalles (o un botón)
- [ ] Solo desde el servicio
- [ ] Escribiendo una URL
:::
