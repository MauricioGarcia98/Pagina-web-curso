---
titulo: Proyecto final (solo el pedido) - el repositorio del pipeline de un equipo, de cero a producción
nivel: 6 · Avanzado completo
duracion: 300
resumen: El proyecto que cierra el curso, como llega en un trabajo real - un pedido de una líder de datos para montar desde cero el repositorio de un pipeline nuevo, con el flujo de trabajo de un equipo. Sin pasos ni pistas. Organizas el trabajo en issues, construyes con PRs revisados, automatizas con Actions, proteges, documentas y publicas. Primero en la práctica y después en GitHub real, como pieza central de tu portafolio.
objetivos: Convertir un pedido en un plan de issues | Construir un repositorio con el flujo completo de un equipo | Automatizar calidad, reportes y documentación | Aplicar seguridad y protección | Presentar el repositorio como proyecto de portafolio
prerrequisitos: github-de-la-practica-a-github-real
autoevaluacion: ¿Sabes planificar un proyecto en issues antes de escribir código? | ¿Sabes demostrar que tu flujo funciona con el historial de PRs? | ¿Sabes explicar cada workflow y cada regla? | ¿Sabes contar este proyecto en una entrevista?
---

:::escenario El pedido
Mensaje de Lucía, líder de datos de Tienda Andina, un lunes:

*"Arrancamos el pipeline de devoluciones y lo vas a armar vos. Necesito un repo nuevo, `devoluciones`, que lea el archivo diario de devoluciones, lo limpie y calcule la tasa de devolución por categoría y por canal. Quiero que sea el modelo para los próximos repos del equipo: que nada entre sin revisión y tests, que el reporte se genere solo, que esté documentado y que cualquiera que llegue sepa cómo contribuir. Camila y Martín te revisan. El viernes me mostrás el repo."*
:::

## Las reglas de este proyecto

- **No hay pasos ni pistas.** Todo lo que necesitas está en las lecciones 1 a 23.
- El pedido es ambiguo a propósito: qué columnas tiene "el archivo diario", cómo se define "tasa de devolución" y qué significa "limpio" los decides tú, y lo dejas escrito (en issues y en la documentación).
- Se trabaja como en un equipo: **nada entra a main sin PR**, desde el segundo commit en adelante.

## Datos

Inventa un `datos/ejemplo/devoluciones.csv` pequeño (entre 20 y 50 filas) con lo que consideres necesario: id de pedido, fecha, categoría, canal, motivo, monto. Incluye **a propósito** problemas reales: un email o categoría con espacios y mayúsculas mezcladas, una fila duplicada, un monto vacío. Tus tests tienen que demostrar que la limpieza los resuelve.

## Entregables

1. **El repositorio `devoluciones`** con:
   - Código en `src/` y tests en `tests/` (al menos 8 tests: limpieza, cálculo, casos borde).
   - `requirements.txt`, `.gitignore`, `LICENSE`, `README.md` con badge de CI, `CONTRIBUTING.md`, `SECURITY.md`, `CODEOWNERS`, plantilla de PR y al menos una plantilla de issue.
2. **El plan**: un backlog de al menos 6 issues con etiquetas, criterio de terminado y responsable, creado **antes** de escribir el código. Todos cerrados por PRs al final, salvo los que dejes como "próximos pasos".
3. **La automatización**:
   - CI en cada PR: lint + tests en dos versiones de Python.
   - En cada merge a main: el reporte (tasa por categoría y por canal) como artefacto, y la documentación publicada en Pages con el diccionario de datos y las definiciones.
   - Dependabot para pip y para las acciones.
4. **La protección**: main con PR, 1 aprobación, checks de la matriz obligatorios, conversaciones resueltas y sin bypass.
5. **La historia**: al menos 6 PRs fusionados con descripción completa, al menos uno con cambios pedidos en la revisión y atendidos, y al menos un conflicto resuelto.
6. **La presentación** (máximo 10 líneas, como mensaje a Lucía): qué construiste, las decisiones que tomaste (definiciones, estructura, reglas) y qué harías después.

## Rúbrica

| Criterio | Peso | Insuficiente | Competente | Sobresaliente |
|---|---|---|---|---|
| Planificación | 15 % | Issues creados al final o sin criterio | Backlog previo, etiquetado, cerrado por PRs | Issues chicos y bien cortados; los "próximos pasos" están justificados |
| Código y tests | 20 % | Sin tests o tests que no prueban los problemas de los datos | 8+ tests que cubren limpieza, cálculo y casos borde | Los tests documentan las definiciones (se leen como especificación) |
| Automatización | 25 % | CI incompleto | CI con matriz, reporte como artefacto, docs en Pages, Dependabot | Además permisos mínimos, caché y resumen en `$GITHUB_STEP_SUMMARY` |
| Flujo de equipo | 20 % | Cambios directos a main o PRs sin descripción | 6+ PRs revisados, uno con cambios pedidos, un conflicto resuelto | El historial cuenta la construcción del proyecto sin explicación extra |
| Documentación y presentación | 20 % | README mínimo | README, CONTRIBUTING, docs y presentación claros | Alguien nuevo hace su primer PR solo con lo escrito; la presentación prioriza decisiones |

**Aprobado**: competente o más en todos los criterios. Evalúate con honestidad; si algo queda insuficiente, rehazlo antes de darlo por terminado.

## Preguntas que te harían al presentarlo

No son pistas: son las preguntas que te van a hacer. Tu repositorio debería poder responderlas.

- "¿Cómo definiste la tasa de devolución y dónde está escrito?"
- "Si mañana llega una categoría nueva o una columna cambia de nombre, ¿qué falla y cómo te enteras?"
- "¿Qué pasa si alguien intenta fusionar con un test en rojo? ¿Y si es admin?"
- "¿Dónde estarían las credenciales de la base de producción?"
- "¿Qué harías para que esto corra todos los días en producción?"

## La segunda vuelta: en GitHub real, para tu portafolio

1. Crea el repositorio `devoluciones` en tu cuenta real (público, con licencia MIT).
2. Sube el código y rehaz la historia con PRs reales; para las revisiones, invita a un compañero de curso como colaborador (si estás solo, deja 0 aprobaciones obligatorias y mantén los checks).
3. Activa Pages con Actions, Dependabot, secret scanning y push protection.
4. Agrega un `schedule` para generar el reporte todos los días.
5. Fíjalo en tu perfil, con descripción y topics, y enlázalo desde tu README de perfil.
6. Comprueba que un desconocido pueda clonarlo y correr los tests siguiendo solo el README.

:::tip Cómo contarlo en una entrevista
"Monté desde cero el repositorio de un pipeline de devoluciones con el flujo de un equipo: backlog en issues, todo por pull requests revisados, CI con tests en dos versiones de Python, main protegida, reporte automático como artefacto y documentación publicada. Definí la tasa de devolución como [tu definición] y los tests la documentan." Contexto, decisiones, resultado: eso buscan.
:::

## Después de este curso

Ya dominas GitHub como lo usa un equipo de datos. Los caminos naturales desde aquí:

- **[dbt](#/m/dbt)**: modelos de datos con el mismo flujo de PRs y CI.
- **[Terraform](#/m/terraform)**: infraestructura como código revisada en PRs.
- **[Databricks](#/m/databricks)**: desplegar jobs desde GitHub con bundles.
- **[Portafolio](#/m/portafolio)**: más proyectos para tu perfil.

:::ejercicio quiz
¿Qué haces antes de escribir la primera línea de código del pipeline?
- [ ] Creo el workflow de CI
- [x] Escribo el backlog en issues con definiciones y criterio de terminado
- [ ] Protejo main
- [ ] Publico Pages
:::

:::ejercicio quiz
¿Por qué el proyecto pide al menos un PR con cambios pedidos en la revisión?
- [ ] Para alargar el proyecto
- [x] Para demostrar que el flujo de revisión funciona y que sabes atender comentarios
- [ ] Porque GitHub lo exige
- [ ] Para generar conflictos
:::

:::ejercicio quiz
En la presentación a Lucía, ¿qué conviene priorizar?
- [ ] La lista de todos los archivos
- [x] Las decisiones que tomaste (definiciones, reglas, estructura) y qué harías después
- [ ] Los comandos de git que usaste
- [ ] Las capturas de cada pantalla
:::
