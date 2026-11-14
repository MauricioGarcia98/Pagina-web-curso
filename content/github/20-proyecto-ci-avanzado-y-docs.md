---
titulo: Proyecto 5 (requisitos y rúbrica) - CI con matriz, reporte como artefacto y documentación publicada
nivel: 5 · Avanzado
duracion: 120
resumen: El equipo quiere más de ventas-app - que los tests corran en dos versiones de Python, que cada ejecución en main genere el reporte de ventas como artefacto descargable y que la documentación se publique sola en Pages. Un workflow de varios jobs encadenados con needs, matriz, artefactos, variables y despliegue. Solo requisitos, control y rúbrica.
objetivos: Diseñar un workflow de varios jobs con needs | Usar una matriz de versiones | Generar y subir un artefacto | Publicar documentación con Actions | Mantener todo dentro de un flujo con main protegida
prerrequisitos: github-pages-e-insights
autoevaluacion: ¿Sabes encadenar jobs? | ¿Sabes qué hace strategy.matrix? | ¿Sabes subir un archivo como artefacto? | ¿Sabes que el check obligatorio cambia de nombre con la matriz?
---

:::escenario El pedido
Camila: *"Producción sigue en Python 3.11 y queremos pasar a 3.12, así que los tests tienen que correr en las dos. Además, los de negocio piden el reporte de ventas todas las semanas: que cada vez que algo entra a main se genere solo y quede para descargar. Y la documentación, publicada, que siempre estamos mandando el README por chat."*
:::

## Requisitos

1. **Script del reporte** — `reporte.py` que lea `datos/ventas.csv` (créalo con al menos 8 filas de ejemplo con columnas `canal`, `estado`, `total`; datos inventados), use `totales_por_canal` y `ticket_promedio_por_canal` y escriba `salida/reporte.md` con una tabla Markdown por canal.
2. **Workflow** `.github/workflows/pipeline.yml` con tres jobs:
   - `tests`: matriz `python-version: ["3.11", "3.12"]`, corre `ruff check .` y `pytest`. En cada PR y en cada push a main.
   - `reporte`: `needs: tests`, solo en push a main (`if: github.event_name == 'push'`), corre `reporte.py` y sube `salida/reporte.md` como artefacto `reporte-ventas` con `actions/upload-artifact`.
   - `docs`: `needs: reporte`, solo en push a main, publica la carpeta `docs/` en Pages con `configure-pages`, `upload-pages-artifact` y `deploy-pages`.
3. **Variable** — `vars.MONEDA` (por ejemplo `USD`) que `reporte.py` lee de la variable de entorno y muestra en el encabezado del reporte.
4. **Documentación** — `docs/index.html` con qué hace el proyecto, cómo correrlo, el diccionario de datos y un enlace al repositorio.
5. **Protección** — actualiza la regla de main: los checks obligatorios ahora son los de la matriz.
6. **Todo por PR** — al menos dos PRs fusionados para este proyecto, con descripción.

:::nota El nombre de los checks con matriz
Con matriz, cada combinación es un check distinto: `tests (3.11)` y `tests (3.12)`. Si la regla sigue esperando un check llamado `tests` (o `checks` del proyecto 4), los PRs quedan esperando para siempre. Ese es uno de los errores reales más comunes al cambiar un workflow.
:::

## ✔ Control

| Control | Esperado |
|---|---|
| Ejecución en un PR | 2 jobs (`tests (3.11)`, `tests (3.12)`); `reporte` y `docs` omitidos |
| Ejecución en push a main | 4 jobs en verde, en orden: tests ×2 → reporte → docs |
| Artefacto | `reporte-ventas` descargable desde el resumen de la ejecución |
| Reporte | Un renglón por canal; los cancelados no suman; el encabezado muestra la moneda de `vars.MONEDA` |
| Pages | `https://alumno.github.io/ventas-app/` muestra `docs/index.html` |
| Regla de main | Checks obligatorios `tests (3.11)` y `tests (3.12)` |

Verifica tu reporte a mano con tus 8 filas: suma por canal en una hoja (o en Python) y compara. Si no coincide, el error está en el script, no en el control.

## Rúbrica

| Criterio | Insuficiente | Competente | Sobresaliente |
|---|---|---|---|
| Workflow | Un solo job o jobs sin orden | 3 jobs con needs, matriz y condiciones correctas | Además caché de pip y `permissions` mínimos por job |
| Reporte | No se genera o los números no cierran | Artefacto correcto y verificado | Además lo escribe en el resumen de la ejecución (`$GITHUB_STEP_SUMMARY`) |
| Documentación | Página vacía o README copiado | Página con uso y diccionario | Se regenera con datos del reporte en cada push |
| Flujo de trabajo | Cambios directos o PRs sin descripción | PRs con descripción y checks en verde | Historia de PRs que cuenta cómo se construyó el pipeline |

## Entrega

Mensaje a Camila: *"Listo: tests en 3.11 y 3.12 en cada PR; cada merge a main genera el reporte (artefacto `reporte-ventas`) y publica la documentación en alumno.github.io/ventas-app. Cambié la regla de main para exigir los dos checks de la matriz."*

## 🖥️ Hazlo también en GitHub real

En GitHub real, agrega a `on:` un `schedule` para generar el reporte todos los lunes aunque nadie haga push:

```yaml
on:
  schedule:
    - cron: "0 11 * * 1"   # lunes 11:00 UTC
```

La réplica no corre workflows programados; GitHub real sí (con hasta unos minutos de demora, y se pausan si el repositorio no tiene actividad por 60 días).

:::ejercicio quiz
Agregas una matriz con 3.11 y 3.12 al job tests. ¿Qué pasa con la regla que exigía el check "tests"?
- [ ] Sigue funcionando igual
- [x] Los checks ahora se llaman tests (3.11) y tests (3.12); hay que actualizar la regla o los PRs quedan esperando
- [ ] Se borra sola
- [ ] GitHub la actualiza automáticamente
:::

:::ejercicio quiz
¿Qué hace `needs: tests` en el job reporte?
- [ ] Corre reporte antes que tests
- [x] Hace que reporte espere a que tests termine bien
- [ ] Copia los archivos de tests
- [ ] Nada
:::
