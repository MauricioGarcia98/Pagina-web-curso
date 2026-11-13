---
titulo: Proyecto final (solo el pedido) - del script suelto al repositorio que el equipo puede usar
nivel: 6 · Avanzado completo
duracion: 240
resumen: El proyecto que cierra el curso, como llega en un trabajo real. El equipo depende de un script que solo funciona en la computadora de quien lo escribió, sin tests ni documentación. Te piden convertirlo en un repositorio profesional - estructura, entorno, funciones probadas, código limpio, configuración compartida, historia de Git ordenada y entrega por pull request - para que cualquiera lo clone y lo ejecute. Sin pasos ni pistas.
objetivos: Diagnosticar qué le falta a un script para ser mantenible | Reorganizar código en un repositorio profesional sin cambiar su resultado | Cubrir la lógica con tests y dejar el código limpio | Compartir entorno y configuración con el equipo | Entregar con una historia de Git clara y un pull request completo
prerrequisitos: vscode-de-la-practica-a-vscode-real
autoevaluacion: ¿Sabes comprobar que una reorganización no cambió el resultado? | ¿Sabes qué separar en funciones? | ¿Sabes qué tiene que tener el repositorio para que otro lo use solo? | ¿Sabes contar el trabajo en un PR?
---

:::escenario El pedido
Mensaje de la líder del equipo:

*"El script `resumen_ventas.py` lo usamos todos los meses y solo funciona en la máquina de Martín, que se va de vacaciones. No tiene tests, la ruta del CSV está escrita adentro, nadie sabe qué versión de Python usa y cuando alguien lo tocó, rompió los totales. Necesito que lo conviertas en un repositorio como la gente: que cualquiera lo clone y lo corra con el mes que quiera, con tests, y que quede todo por PR para revisarlo. Que dé exactamente los mismos números que hoy."*
:::

## Las reglas de este proyecto

- **No hay pasos ni pistas.** Todo lo que necesitas está en las lecciones 1 a 23.
- "Exactamente los mismos números que hoy" es un requisito, no una sugerencia: tienes que poder demostrarlo.
- Se entrega como en un trabajo: un repositorio en la [réplica de GitHub](#/github) y un pull request.

## Punto de partida

El script `~/scripts/resumen_ventas.py` y el CSV `~/datos/ventas_2024_12.csv` de la máquina de práctica. Antes de tocar nada, ejecútalo y guarda su salida y el CSV que genera: es tu **referencia**.

## Entregables

1. **El repositorio** `resumen_ventas` con: estructura `src/` y `tests/`, `pyproject.toml` (o `requirements.txt`) con las versiones, `.gitignore` (sin datos ni entornos), `.vscode/` con ajustes, extensiones recomendadas y una tarea de "revisar y probar", y un `README.md` que lleve de cero a ejecutar.
2. **El código**: la lógica en funciones (leer, filtrar, agregar, escribir), el archivo de entrada y el de salida como **argumentos** (no escritos dentro), y un punto de entrada que se ejecute como `python -m resumen_ventas datos/ventas_2024_12.csv salidas/resumen.csv` o similar.
3. **Los tests**: de las funciones de agregación con datos chicos inventados (incluido un mes sin ventas de un canal y filas canceladas), y un test de **regresión** que compruebe que el resultado con el CSV de diciembre es igual a tu referencia.
4. **Calidad**: `ruff check` y `ruff format` sin cambios pendientes; `pytest` en verde.
5. **Git**: rama de trabajo, commits pequeños con mensajes útiles (no "cambios"), push y un **PR** con: qué problema resuelve, qué cambió, cómo se probó (incluida la comparación con la referencia) y qué queda fuera.
6. **Una nota de traspaso** (en el README o en el PR): cómo correrlo para otro mes y qué hacer si falla.

## Rúbrica

| Criterio | Peso | Insuficiente | Competente | Sobresaliente |
|---|---|---|---|---|
| Mismo resultado | 20 % | No se comprobó | La salida coincide con la referencia | Hay un test de regresión que lo demuestra |
| Estructura y entorno | 15 % | Archivos sueltos | src/, tests/, dependencias, .gitignore | Además .vscode compartido y README de cero a ejecutar probado |
| Código | 20 % | Rutas escritas adentro, todo en un bloque | Funciones y argumentos | Funciones chicas, con docstring, y un punto de entrada claro |
| Tests y calidad | 20 % | Sin tests | Tests de las funciones, ruff limpio | Casos borde (canal sin ventas, cancelados) y regresión |
| Git y entrega | 15 % | Un commit en main | Rama, varios commits, PR | Historia que se lee como un relato, PR completo con la prueba de regresión |
| Comunicación | 10 % | Sin nota | Nota de uso | Nota de traspaso: otro mes, errores típicos, a quién preguntar |

**Aprobado**: competente o más en todos los criterios. La prueba final: alguien que nunca vio el proyecto lo clona, sigue el README y obtiene los mismos números.

## Preguntas que te va a hacer quien revise

No son pistas: tu entrega debería responderlas.

- "¿Cómo sé que da lo mismo que el script viejo?"
- "¿Cómo lo corro para enero?"
- "Si mañana agregan un canal nuevo, ¿qué hay que tocar?"
- "¿Qué pasa si el CSV viene sin la columna `estado`?"
- "¿Por qué está la lógica separada en estas funciones?"

## Después de este curso

- **[Git en equipo](#/l/fundamentos-git-en-equipo)** y el [laboratorio de terminal](#/lab/terminal): dominar la línea de comandos.
- **[dbt](#/m/dbt)** y **[Airflow](#/m/airflow)**: los proyectos de datos que vas a editar en VS Code todos los días.
- **[JupyterLab paso a paso](#/m/jupyterlab)**: la exploración que después se convierte en código como el de este proyecto.

:::ejercicio quiz
¿Qué haces antes de reorganizar el script?
- [ ] Borro el script viejo
- [x] Lo ejecuto y guardo su salida como referencia para comprobar después que el resultado no cambió
- [ ] Le agrego tests al final
- [ ] Le cambio el nombre
:::

:::ejercicio quiz
¿Qué es un test de regresión en este proyecto?
- [ ] Un test que vuelve a una versión vieja
- [x] Un test que comprueba que el resultado con los datos reales sigue siendo igual a la referencia
- [ ] Un test que mide la velocidad
- [ ] Un test de la base de datos
:::

:::ejercicio quiz
¿Por qué el archivo de entrada debe ser un argumento y no estar escrito en el código?
- [ ] Porque Python no permite rutas en el código
- [x] Para poder correrlo con cualquier mes sin tocar el código
- [ ] Para que sea más rápido
- [ ] Para que ruff no se queje
:::
