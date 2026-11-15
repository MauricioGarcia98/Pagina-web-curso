---
titulo: Proyecto final (sin ayuda) - la orquestación de Tienda Andina
nivel: 6 · Avanzado completo
duracion: 120
resumen: El proyecto integrador del curso. Diseñas y construyes la orquestación diaria de Tienda Andina - ingesta parametrizada, carga de ventas programada, reporte disparado por datos, proceso por tienda, alertas, pools y pruebas - y la defiendes con un documento de una página. Solo se dan los requisitos.
objetivos: Diseñar la orquestación de una plataforma de datos de punta a punta | Combinar horarios, assets, ramas, mapeo, pools y alertas | Dejar los Dags probados y documentados | Presentar el resultado como proyecto de portafolio
prerrequisitos: airflow-paso-a-paso-de-la-practica-a-airflow-real
autoevaluacion: ¿Cada Dag tiene una razón de existir y un dueño? | ¿El reporte corre cuando los datos están, no a una hora? | ¿Una falla avisa sola? | ¿Puedes reprocesar un día sin duplicar datos?
---

:::escenario El encargo
Gerencia de Tienda Andina: *"Queremos que todo lo de datos corra solo cada mañana: clientes, ventas, el reporte y el detalle por tienda. Si algo falla, que avise. Que se pueda recargar un día sin romper nada y que quede todo documentado."*
:::

## Requisitos

**Ingesta**
1. `ingesta_clientes` a las 05:00 UTC, con parámetros de país y límite.
2. `catalogo_api` a las 04:00 UTC, con sus descargas limitadas por el pool `api_tienda` (2 lugares).

**Carga y reporte**
3. `carga_ventas_tienda` a las 06:00 UTC: extraer → validar → publicar, con reintentos, y `publicar` produce el asset `tienda://gold/ventas`.
4. `reporte_ventas` programado por ese asset, con una rama que avisa si el total queda bajo el umbral de la variable `umbral_alerta`.
5. `ventas_por_tienda`: procesa cada tienda con mapeo dinámico y consolida.

**Operación**
6. Callback de falla en todos los Dags, con tarea y corrida en el aviso.
7. Todas las tareas idempotentes: explica en el documento cómo lo garantizas en `publicar`.
8. Una prueba de DagBag sin errores de importación.
9. Ningún Dag con errores en **Dag Import Errors**.

## Cómo se ve terminado

```captura
archivo: airflow/a24-dags.webp
texto: Los Dags de la tienda activos, con su horario, próxima corrida, última corrida y etiquetas
```

```captura
archivo: airflow/a24-home.webp
texto: Home - los indicadores, la salud de los componentes, los eventos de assets y el historial del día
```

## Entregable: el documento de una página

| Sección | Qué responde |
|---|---|
| **Mapa** | Un diagrama con los Dags, sus horarios y el asset que conecta la carga con el reporte |
| **Decisiones** | Por qué el reporte va por asset, por qué el pool, por qué mapeo en `ventas_por_tienda` |
| **Idempotencia** | Cómo se recarga un día (Clear o backfill) sin duplicar |
| **Operación** | La rutina de la guardia y qué dice cada aviso |
| **Despliegue** | Cómo llegaría a producción (repositorio, CI, servicio elegido) |

## ✅ Rúbrica

| Criterio | Cumple | Destaca |
|---|---|---|
| Programación | Los horarios son los pedidos | Horarios en UTC explicados para cada país |
| Datos | El reporte corre por asset | El grafo con assets muestra toda la cadena |
| Robustez | Reintentos y callback de falla | Tareas idempotentes y probadas con tasks test |
| Recursos | El pool limita la API | `max_active_runs` pensado para backfills |
| Calidad | Sin errores de importación | Prueba de DagBag en el CI con dueño y tags obligatorios |
| Documentación | `doc_md` en cada Dag | El documento de una página defiende cada decisión |

:::tip Para tu portafolio
Sube la carpeta `dags/`, las pruebas y el documento a un repositorio de GitHub con un README que tenga el diagrama y capturas **de la práctica**. Si además lo levantas con Docker Compose o Astro CLI y muestras una corrida real, mejor. Para el detalle de orquestar Databricks y dbt, mira el curso de [Airflow](#/m/airflow) y el de [Databricks paso a paso](#/m/databricks-paso-a-paso).
:::

## Lo que aprendiste en el curso

- **Nivel 1:** qué es Airflow, la interfaz y tu primer Dag.
- **Nivel 2:** grilla, grafo, errores, reintentos y programación.
- **Nivel 3:** TaskFlow, XComs, variables, conexiones y parámetros.
- **Nivel 4:** assets, ramas, trigger rules y backfills.
- **Nivel 5:** errores de importación, pruebas, pools, auditoría y alertas.
- **Nivel 6:** buenas prácticas, mapeo dinámico y Airflow real.

:::ejercicio quiz
¿Por qué el reporte se programa por asset y no a las 07:00?
- [ ] Porque es más lindo
- [x] Porque así corre cuando los datos están, aunque la carga se atrase
- [ ] Porque Airflow 3 no acepta horas
- [ ] Porque el asset es más barato
:::

:::ejercicio quiz
¿Qué garantiza que recargar el día 12 no duplique ventas?
- [ ] Correrlo dos veces
- [x] Que publicar sea idempotente: borra o hace MERGE de esa fecha antes de escribir
- [ ] El pool
- [ ] El callback de falla
:::

:::ejercicio quiz
¿Para qué está el pool api_tienda en catalogo_api?
- [x] Para no mandar más de 2 solicitudes a la vez a la API
- [ ] Para guardar el catálogo
- [ ] Para programar el Dag
- [ ] Para avisar fallas
:::

:::ejercicio quiz
¿Qué capturas pones en tu portafolio?
- [ ] Las de la empresa con datos de clientes
- [x] Las de la práctica o de un entorno propio sin datos de terceros
- [ ] Ninguna
- [ ] Las de otro estudiante
:::
