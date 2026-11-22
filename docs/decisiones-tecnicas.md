# Decisiones técnicas

Herramientas que se evaluaron para el sitio, qué se decidió y por qué. Antes de volver a proponer una, revisa si cambió la razón.

| Herramienta | Decisión | Estado |
|---|---|---|
| Pagefind (buscador) | No se usa: se mejoró el buscador propio | Hecho (PR #88) |
| FSRS (repaso espaciado) | Adoptado | Hecho (PR #89) |
| sqlglot (formatear y traducir SQL) | Adoptado | Hecho (PR #90) |
| sqlfluff (linter de SQL) | No por ahora | — |
| CodeMirror 6 (editor) | No por ahora: se sigue con CodeMirror 5 | — |
| JupyterLite (notebooks) | No: alcanza la réplica de JupyterLab | — |
| Cloudflare y Supabase | Fuera del alcance por pedido del dueño del proyecto | — |

## Pagefind

El sitio se publica directo desde el repositorio en GitHub Pages. Para usar Pagefind habría que generar y subir su índice (cientos de archivos) en cada cambio de contenido, y sumar un binario a la construcción. El buscador propio (`assets/content/_buscar.js`) busca por sección y muestra fragmentos con la palabra resaltada. Además entiende plurales, sinónimos del glosario y errores de tipeo, y responde en menos de 10 ms.

## FSRS

Reemplazó las cajas fijas de 1, 2, 4, 8 y 16 días. Está implementado en `assets/js/fsrs.js` a partir de la descripción pública del algoritmo (open-spaced-repetition, MIT) y se prueba en `tools/fsrs.mjs`. Las tarjetas del sistema anterior se convierten solas.

## sqlglot

Es Python puro (MIT), así que corre en Pyodide, que el curso ya usa. La rueda (*wheel*) está alojada en `assets/vendor/` con su licencia. En el laboratorio SQL formatea las consultas, las traduce entre once dialectos y explica los errores de sintaxis. Se prueba en `tools/ejercicios-navegador.mjs`.

## sqlfluff

Sus reglas de estilo serían útiles, pero tiene muchas dependencias (`regex`, `tblib`, `pathspec`, `diff-cover`, `chardet`, `jinja2`…) y en Pyodide tarda varios segundos en cargar, aun para consultas cortas. sqlglot ya cubre el formato, y el explicador de SQL del laboratorio ya marca los errores más comunes de quien empieza (columnas sin agregar en un GROUP BY, comparaciones con NULL, etc.).

**Revisar si**: se quiere un módulo de "estilo de SQL en equipo", con reglas configurables como las de una empresa. En ese caso conviene correr sqlfluff en el CI del repositorio del estudiante (GitHub Actions), no en el navegador.

## CodeMirror 6

CodeMirror 5 funciona bien en todos los editores del sitio: ejercicios, laboratorios y réplicas. Tiene etiquetas para lectores de pantalla y los temas claro y oscuro con contraste revisado. Monaco se usa donde hace falta un editor tipo VS Code. Migrar a CodeMirror 6 implicaría:

- traer más de 20 módulos ES desde un CDN, o sumar un *bundler* que el sitio hoy no tiene;
- reescribir cada lugar que crea un editor, el autocompletado de SQL y los atajos;
- volver a validar los 3566 ejercicios en el navegador.

La mejora real (mejor manejo táctil en el teléfono) no compensa ese riesgo hoy.

**Revisar si**: aparece un error de CodeMirror 5 que bloquee a los estudiantes en el teléfono, o si el sitio suma un paso de *bundling* por otra razón.

## JupyterLite

Haría falta publicar entre 30 y 60 MB de archivos estáticos en el repositorio. Además la primera carga es pesada en el teléfono. La réplica de JupyterLab del curso (`assets/js/jupyter.js` con el kernel de Pyodide) ya permite notebooks con pandas, celdas Markdown, archivos y reinicio del kernel. Y está integrada con los datos y los retos del curso.

**Revisar si**: se necesitan extensiones de Jupyter que la réplica no tiene (widgets interactivos, varios kernels).
