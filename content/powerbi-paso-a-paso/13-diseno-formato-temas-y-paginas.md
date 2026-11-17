---
titulo: Diseño del informe - formato de objetos visuales, temas, páginas y cuadros de texto
nivel: 4 · Intermedio-avanzado
duracion: 45
resumen: Un informe que se entiende sin explicación se diseña. El panel Formato (objeto visual y general), los temas de colores, las páginas y su tamaño, cuadros de texto para títulos y conclusiones, y las reglas de diseño que usan los equipos de BI - jerarquía visual, pocos colores con significado, el número más importante arriba a la izquierda.
objetivos: Dar formato a un objeto visual desde el panel Formato | Aplicar y exportar un tema | Crear, renombrar y ordenar páginas | Usar cuadros de texto para títulos y conclusiones | Aplicar reglas básicas de diseño de tableros
prerrequisitos: powerbi-paso-a-paso-proyecto-crecimiento-ventas
autoevaluacion: ¿Sabes dónde se cambia el título de un gráfico? | ¿Sabes qué es un tema? | ¿Sabes dónde va el número más importante? | ¿Sabes para qué sirve una página oculta?
---

:::analogia En palabras simples
Los datos son la comida y el diseño es el emplatado. El mismo plato servido en un orden lógico, con poco adorno y el ingrediente principal a la vista, se disfruta; tirado en el plato, se deja.
:::

## Paso 1 — El panel Formato

Selecciona un visual → panel Visualizaciones → **Formato**:

```captura
archivo: powerbi/b13-formato.webp
texto: La pestaña Formato (1) - secciones del objeto visual (ejes, leyenda, colores, etiquetas) y General (título, fondo, borde, tamaño)
```

| Sección | Lo más usado |
|---|---|
| **Objeto visual → Eje X / Eje Y** | Mostrar u ocultar, título del eje, rango, unidades (miles, millones) |
| **Leyenda** | Posición o quitarla si hay una sola serie |
| **Colores** | Color de cada serie o barra; **Colores según el valor** (formato condicional) |
| **Etiquetas de datos** | Mostrar el número sobre cada barra |
| **General → Título** | El texto del título: escribe la pregunta que responde ("¿Qué canal vende más?") |
| **General → Efectos** | Fondo, borde, sombra |

El buscador de arriba del panel encuentra cualquier opción por nombre.

## Paso 2 — Temas

**Vista → Temas**:

```captura
archivo: powerbi/b13-temas.webp
texto: La galería de temas (1) cambia los colores de todo el informe a la vez (2)
```

Un **tema** es un archivo JSON con la paleta de colores, fuentes y estilos de todos los visuales. **Guardar tema actual** lo exporta para usar el mismo estilo en todos los informes del equipo; **Examinar temas** importa el de la empresa. Hay un tema **Accesible** pensado para personas con daltonismo.

## Paso 3 — Páginas

**Insertar → Nueva página** o el **+** de la barra inferior:

```captura
archivo: powerbi/b13-paginas.webp
texto: Las pestañas de página - clic derecho para cambiar el nombre, duplicar, ocultar o borrar
```

| Acción | Para qué |
|---|---|
| Renombrar | "Resumen", "Por canal", "Detalle de producto": quien abre el informe sabe dónde ir |
| Duplicar | Armar una página parecida sin empezar de cero |
| Ocultar | Páginas de detalle a las que se llega con un botón o con "Obtener detalles", no navegando |
| Tamaño de página | Formato → Lienzo: 16:9, 4:3, carta o personalizado (para imprimir o para el móvil) |

## Paso 4 — Cuadros de texto

**Insertar → Cuadro de texto**: el título del informe y, sobre todo, la **conclusión**. Un tablero que dice arriba "Las ventas crecieron 23 % en 2024; el teléfono es el canal que más crece" se entiende en cinco segundos.

## Paso 5 — Reglas que usan los equipos de BI

| Regla | Por qué |
|---|---|
| El número más importante arriba a la izquierda, grande | Es donde se empieza a leer |
| Pocos colores, y que signifiquen algo (rojo = problema) | Muchos colores no dicen nada |
| Un gráfico = una pregunta, y el título es la pregunta | Quien mira sabe qué está viendo |
| Barras para comparar, líneas para el tiempo, tarjetas para KPIs | Cada forma tiene su uso |
| Evitar tortas con más de 4 porciones | No se distinguen |
| Alinear y dejar aire | El orden transmite confianza en los números |
| Mismo formato de número en todo el informe | 14,9 M en un lado y 14 878 014 en otro confunde |

:::errores
- **Títulos técnicos.** "Suma de ventas por canal" describe el visual; un buen título dice qué conclusión mirar.
- **Tortas para todo.** Para tendencias va línea; para comparar categorías, barras.
- **Cada informe con sus colores.** Un tema guardado mantiene el estilo del equipo.
:::

## ✅ Lo que lograste

- Das formato a los visuales y aplicas temas.
- Organizas el informe en páginas con títulos y conclusiones.
- Conoces las reglas básicas de diseño de tableros.

:::ejercicio quiz
¿Qué título le pondrías a un gráfico de ventas por canal?
- [ ] "Gráfico 1"
- [ ] "Suma de ventas por canal"
- [x] Una pregunta o conclusión: "¿Qué canal vende más?" o "La web vende casi la mitad"
- [ ] El nombre de la tabla de origen
:::

:::ejercicio quiz
¿Para qué sirve guardar el tema actual?
- [ ] Para cambiar los datos
- [x] Para usar los mismos colores y estilos en todos los informes del equipo
- [ ] Para publicar
- [ ] Para guardar una copia del informe con otro nombre
:::

:::ejercicio quiz
¿Qué visual conviene para mostrar la evolución mensual?
- [ ] Torta
- [x] Línea
- [ ] Tarjeta
- [ ] Segmentación
:::
