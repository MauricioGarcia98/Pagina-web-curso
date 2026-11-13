---
titulo: El notebook profesional - estructura, narrativa, tabla de contenidos y cómo se comparte
nivel: 6 · Avanzado completo
duracion: 45
resumen: Un notebook de trabajo lo leen personas que no estuvieron cuando lo escribiste. La estructura que usan los equipos (contexto, parámetros, carga, preparación, análisis, conclusiones), cómo escribir la narrativa en Markdown, la tabla de contenidos, qué dejar y qué sacar antes de compartir, nombres y carpetas de proyecto, notebooks en Git y el tema oscuro.
objetivos: Estructurar un notebook en secciones estándar | Escribir narrativa que explique decisiones, no solo código | Navegar con la tabla de contenidos | Preparar un notebook para compartir (limpieza, salidas, datos sensibles) | Organizar un proyecto y versionar notebooks con Git
prerrequisitos: jupyterlab-proyecto-ventas-y-margen
autoevaluacion: ¿Sabes en qué orden van las secciones de un notebook? | ¿Sabes qué escribir en Markdown además de títulos? | ¿Sabes qué revisar antes de compartir? | ¿Sabes por qué los notebooks dan problemas en Git?
---

:::analogia En palabras simples
Un notebook profesional se lee como un informe que, además, se puede volver a ejecutar. Quien lo abre tiene que entender en dos minutos qué pregunta responde, con qué datos, qué decidiste y qué encontraste, sin leer una línea de código.
:::

## Paso 1 — La estructura estándar

| Sección | Contenido |
|---|---|
| **Título y contexto** | Qué pregunta responde, para quién, fecha de corte, autor |
| **Resumen** | 3 a 5 hallazgos arriba de todo: lo que el lector quiere ver primero |
| **Parámetros** | Años, umbrales, rutas: todo lo que cambia entre ejecuciones |
| **Imports y carga** | Bibliotecas y lectura de datos, con la fuente de cada archivo |
| **Preparación** | Limpieza y uniones, con las decisiones explicadas |
| **Análisis** | Una sección por pregunta, cada una con su conclusión parcial |
| **Conclusiones y próximos pasos** | Qué significa, qué recomendás, qué falta saber |

## Paso 2 — La tabla de contenidos

Cada título Markdown (`#`, `##`, `###`) aparece en la **tabla de contenidos**: el tercer ícono de la barra lateral.

```captura
archivo: jupyter/e21-toc.webp
texto: La tabla de contenidos arma un índice con los títulos del notebook; un clic salta a esa sección
```

Con un buen índice, un notebook de 80 celdas se recorre en segundos.

## Paso 3 — Narrativa: explica las decisiones

| Débil | Útil |
|---|---|
| `## Limpieza` | `## Limpieza: una fila por cliente (nos quedamos con la carga más reciente)` |
| (sin texto) | "Se excluyen los pedidos cancelados y devueltos porque no son venta." |
| "Gráfico de ventas" | "Las ventas crecen todos los años; el pico es siempre noviembre-diciembre." |

Escribe en Markdown **lo que el código no dice**: por qué filtraste, qué supusiste, qué te llamó la atención.

## Paso 4 — Antes de compartir

- [ ] **Restart Kernel and Run All Cells** sin errores.
- [ ] Sin celdas de prueba sueltas (`df.head()` repetidos, celdas vacías, código comentado que ya no sirve).
- [ ] Sin salidas enormes (una tabla de 12.000 filas impresa vuelve el archivo pesado e ilegible: muestra `head()`).
- [ ] Sin **datos sensibles** en las salidas (emails, teléfonos, documentos): si el notebook va a terceros, agrega o enmascara.
- [ ] Sin contraseñas ni claves en el código: en Jupyter real se leen de variables de entorno o de un gestor de secretos.
- [ ] Rutas relativas.
- [ ] Nombre del archivo claro y con fecha o versión si corresponde.

:::cuidado Las salidas se guardan dentro del .ipynb
Si imprimiste una tabla con emails de clientes, esos emails quedan **dentro del archivo**. Aunque después cambies el código de la celda (por ejemplo, para mostrar solo conteos), la salida vieja sigue guardada hasta que vuelvas a ejecutar esa celda o limpies las salidas (**Edit → Clear Outputs of All Cells**). Revisa antes de mandar un notebook por mail o subirlo a un repositorio.
:::

## Paso 5 — Un proyecto ordenado

```text
analisis_retencion/
├── README.md              ← qué es, cómo se ejecuta
├── datos/                 ← entradas (o cómo conseguirlas, si son grandes o privadas)
├── notebooks/
│   ├── 01_exploracion.ipynb
│   └── 02_analisis_retencion.ipynb
├── src/
│   └── metricas.py        ← funciones reutilizables
└── salidas/               ← CSV y gráficos generados
```

Los prefijos `01_`, `02_` indican el orden en que se ejecutan.

## Paso 6 — Notebooks en Git

Un `.ipynb` es un JSON con el código **y las salidas** (incluidas las imágenes en base64). En Git eso trae dos problemas: los cambios son ilegibles y los conflictos son difíciles de resolver.

| Práctica | Cómo |
|---|---|
| Limpiar salidas antes de hacer commit | Clear Outputs, o la herramienta `nbstripout` en Jupyter real |
| Ver diferencias legibles | `nbdime` (diff de notebooks) o la vista de diferencias de VS Code |
| Llevar la lógica estable a `.py` | Los `.py` se versionan y revisan como cualquier código |
| Alternativa | Jupytext: guarda el notebook también como `.py` |

Puedes practicar Git en la [terminal de práctica](#/lab/terminal) y en la lección [Git en equipo](#/l/fundamentos-git-en-equipo).

## Paso 7 — Tema claro u oscuro

**Settings → Theme**: JupyterLab Light, Dark o sincronizado con el sistema. Es solo visual, pero conviene saber dónde está.

```captura
archivo: jupyter/e23-oscuro.webp
texto: El tema JupyterLab Dark
```

## ✅ Lo que lograste

- Estructuras notebooks como informes reproducibles.
- Escribes narrativa que explica decisiones.
- Sabes preparar un notebook para compartir y versionarlo.

:::ejercicio quiz
¿Dónde conviene poner los hallazgos principales en un notebook que lee un gerente?
- [ ] Al final, después de todo el código
- [x] Arriba, en un resumen, y repetidos en las conclusiones
- [ ] En un comentario de código
- [ ] En el nombre del archivo
:::

:::ejercicio quiz
Mostraste una tabla con emails y después cambiaste el código de esa celda por `df.shape`, sin ejecutarla. ¿Los emails siguen en el archivo?
- [ ] No, se borraron al cambiar el código
- [x] Sí: la salida vieja queda guardada hasta reejecutar la celda o limpiar las salidas
- [ ] Solo si el kernel está encendido
- [ ] Solo en la versión descargada
:::

:::ejercicio quiz
¿Por qué los notebooks dan problemas en Git?
- [ ] Porque Git no acepta archivos .ipynb
- [x] Porque guardan salidas e imágenes en JSON: los cambios son ilegibles y los conflictos difíciles
- [ ] Porque no tienen extensión
- [ ] Porque se ejecutan solos
:::
