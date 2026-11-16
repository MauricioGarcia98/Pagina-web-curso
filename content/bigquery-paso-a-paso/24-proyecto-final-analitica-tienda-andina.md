---
titulo: Proyecto final (sin ayuda) - la analítica de Tienda Andina en BigQuery
nivel: 6 · Avanzado completo
duracion: 120
resumen: El proyecto integrador del curso. Diseñas y construyes la analítica de Tienda Andina en BigQuery - datasets por capa, tabla de hechos particionada y con clustering, eventos cargados desde archivo, vistas para cada área, stock actualizado con MERGE, recuperación con time travel, accesos y control de costos - y lo defiendes con un documento de una página. Solo se dan los requisitos.
objetivos: Diseñar datasets y tablas para las consultas reales | Construir cargas incrementales idempotentes | Asegurar accesos y costos | Presentar el resultado como proyecto de portafolio
prerrequisitos: bigquery-paso-a-paso-de-la-practica-a-bigquery-real
autoevaluacion: ¿Cada tabla grande está particionada por la fecha de uso? | ¿Las consultas típicas leen una fracción chica? | ¿Cada área ve solo lo que necesita? | ¿Puedes explicar el costo mensual estimado?
---

:::escenario El encargo
Gerencia de Tienda Andina: *"Queremos ventas, eventos de la app y stock en BigQuery, con vistas para comercial y operaciones, que cueste poco aunque los datos crezcan cien veces, y que podamos recuperarnos si alguien se equivoca."*
:::

## Requisitos

**Estructura**
1. Datasets `analitica` y `reportes`, creados con un script que se pueda repetir.
2. `analitica.hechos_ventas` particionada por fecha y con clustering según las consultas de comercial.
3. `analitica.eventos_app` cargada desde archivo y particionada por fecha.

**Lógica**
4. Una vista para comercial en `reportes` sin datos personales.
5. `analitica.stock_tiendas` actualizada con un MERGE idempotente.
6. Una consulta de tendencia mensual con QUALIFY o funciones de ventana.

**Operación**
7. Procedimiento de recuperación con time travel (y snapshot antes de cargas grandes).
8. Inventario y control de costos con `INFORMATION_SCHEMA`.
9. Tabla de accesos (roles de IAM por dataset) y límites de bytes.

## Cómo se ve terminado

```captura
archivo: bigquery/q24-explorer.webp
texto: El proyecto con analitica (tablas particionadas, vistas, stock) y reportes (la vista para comercial)
```

```captura
archivo: bigquery/q24-dataset.webp
texto: El dataset analitica - tablas particionadas, tablas comunes y la vista, con filas y tamaño
```

## Entregable: el documento de una página

| Sección | Qué responde |
|---|---|
| **Diseño** | Datasets, tablas, partición y clustering de cada una, y por qué |
| **Cargas** | Cómo llegan los datos y cómo se evita duplicar |
| **Accesos** | Qué rol tiene cada grupo y qué vistas usa cada área |
| **Recuperación** | Qué hacer ante un borrado o una carga mala |
| **Costos** | Bytes de las consultas típicas, costo mensual estimado y límites |

:::errores
- **Diseñar las tablas antes de conocer las consultas.** La partición y el clustering salen de cómo filtra cada área; pregúntalo primero.
- **Dar por buena la carga sin correrla dos veces.** La idempotencia se prueba, no se supone.
- **Escribir el procedimiento de recuperación sin probarlo.** Provoca un borrado en una copia y restáurala siguiendo tu documento.
:::

## ✅ Rúbrica

| Criterio | Cumple | Destaca |
|---|---|---|
| Diseño | Tablas grandes particionadas | Clustering justificado con las consultas reales y `require_partition_filter` |
| Cargas | MERGE funciona | Idempotencia comprobada corriendo dos veces |
| Consultas | Resultados correctos | Cada consulta típica lee una fracción mínima (mostrar "qué se leyó") |
| Accesos | Vista sin datos personales | Vista autorizada y row access policy propuestas |
| Recuperación | Procedimiento escrito | Probado con un borrado provocado |
| Costos | Estimación mensual | Tablero con `INFORMATION_SCHEMA.JOBS` y límites de bytes |

:::tip Para tu portafolio
Sube el SQL, el documento y capturas **de la práctica** (o del sandbox con datos públicos) a un repositorio con un README claro. Si te preparas para la certificación **Professional Data Engineer** de Google Cloud, revisa el banco de preguntas en [Certificaciones GCP](#/m/cert-gcp): diseño de tablas, costos y seguridad en BigQuery son de lo más evaluado.
:::

## Lo que aprendiste en el curso

- **Nivel 1:** qué es BigQuery, consultas, bytes y exploración.
- **Nivel 2:** datasets, costos, caché y jobs.
- **Nivel 3:** particiones, clustering, cargas y datos anidados.
- **Nivel 4:** MERGE, time travel y SQL analítico.
- **Nivel 5:** INFORMATION_SCHEMA, automatización, accesos y costos.
- **Nivel 6:** buenas prácticas, capacidad, BigQuery real.

:::ejercicio quiz
¿Qué hace que la consulta típica de comercial cueste poco aunque los datos crezcan cien veces?
- [x] Partición por fecha, clustering por sus filtros y columnas justas
- [ ] LIMIT 100
- [ ] Usar vistas sin filtros
- [ ] Copiar la tabla cada día
:::

:::ejercicio quiz
¿Cómo te aseguras de que comercial no vea datos personales?
- [ ] Pidiéndole por escrito que no consulte esas columnas
- [x] Con una vista (autorizada) sin esas columnas y acceso solo a reportes
- [ ] Borrando las columnas de la tabla original
- [ ] Con una scheduled query que borra esas columnas cada noche
:::

:::ejercicio quiz
¿Qué conviene hacer antes de una carga grande y riesgosa?
- [x] Un snapshot de la tabla
- [ ] Nada: time travel guarda copias por 90 días
- [ ] Borrar la tabla
- [ ] Cambiar de región
:::

:::ejercicio quiz
¿Qué certificación de Google Cloud evalúa diseño, costos y seguridad en BigQuery?
- [ ] AZ-900
- [x] Professional Data Engineer
- [ ] SnowPro Core
- [ ] PL-300
:::
