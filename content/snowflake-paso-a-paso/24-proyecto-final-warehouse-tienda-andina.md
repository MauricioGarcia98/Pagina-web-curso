---
titulo: Proyecto final (sin ayuda) - el warehouse de Tienda Andina
nivel: 6 · Avanzado completo
duracion: 120
resumen: El proyecto integrador del curso. Diseñas y construyes el warehouse de Tienda Andina en Snowflake - entorno por capas, carga incremental desde un stage, eventos JSON, tabla de negocio con MERGE, recuperación con Time Travel, acceso para analistas y presupuesto - y lo defiendes con un documento de una página. Solo se dan los requisitos.
objetivos: Diseñar un warehouse por capas en Snowflake | Construir la carga incremental de punta a punta | Asegurar el acceso y el costo | Presentar el resultado como proyecto de portafolio
prerrequisitos: snowflake-paso-a-paso-de-la-practica-a-snowflake-real
autoevaluacion: ¿Puedes reconstruir todo con un script? | ¿La carga es incremental e idempotente? | ¿Los analistas leen solo lo que deben? | ¿Puedes explicar el costo mensual estimado?
---

:::escenario El encargo
Gerencia de Tienda Andina: *"Queremos los pedidos y los eventos de la web en Snowflake, actualizados cada día, con un tablero para comercial. Que nadie pueda romper los datos, que se pueda recuperar si pasa algo, y que sepamos cuánto cuesta."*
:::

## Requisitos

**Entorno**
1. Base `tienda_dev` con esquemas `raw` y `analitica`, creados con un script que se pueda correr dos veces.
2. Warehouses `carga_wh` y `analisis_wh`, X-Small, con auto suspend de 60 segundos.

**Carga**
3. Stage `carga_pedidos` y `raw.pedidos_staging` cargada con COPY INTO desde al menos dos archivos de días distintos.
4. `raw.eventos_web` con eventos JSON y una vista `analitica.items_vendidos` hecha con FLATTEN.
5. `analitica.pedidos_actuales` actualizada con un MERGE deduplicado e idempotente.

**Operación y gobierno**
6. Un procedimiento escrito para recuperar `pedidos_actuales` ante un error (Time Travel con el Query ID).
7. Un clon `tienda_qa` para probar cambios.
8. Rol `analista_ventas` de solo lectura sobre `analitica`, con tablas futuras.
9. Resource monitor mensual en `analisis_wh`.

## Cómo se ve terminado

```captura
archivo: snowflake/s24-arbol.webp
texto: TIENDA_DEV con raw (staging, eventos, stage, transitoria) y analitica (pedidos_actuales, ventas_por_canal)
```

```captura
archivo: snowflake/s24-warehouses.webp
texto: Los warehouses con su estado, tamaño, auto suspend y créditos consumidos
```

## Entregable: el documento de una página

| Sección | Qué responde |
|---|---|
| **Arquitectura** | Diagrama: archivos → stage → raw → MERGE → analitica → Power BI |
| **Carga** | Por qué COPY INTO + MERGE, cómo se evita duplicar |
| **Recuperación** | Qué haces si alguien borra o actualiza mal (Time Travel, UNDROP, clon) |
| **Seguridad** | Roles, qué ve cada uno y cómo se conectan las herramientas |
| **Costos** | Warehouses, horas estimadas por día, créditos por mes y el resource monitor |

:::errores
- **Diseñar sin pensar quién consulta qué.** Los roles, esquemas y warehouses salen de cómo trabaja cada equipo.
- **Dar por buena la carga sin correrla dos veces.** La idempotencia se prueba.
- **Documentar la recuperación sin probarla.** Provoca un borrado en un clon y recupéralo siguiendo tus pasos.
:::

## ✅ Rúbrica

| Criterio | Cumple | Destaca |
|---|---|---|
| Entorno | Base, esquemas y warehouses creados | Todo en un script versionado e idempotente |
| Carga | COPY INTO y MERGE funcionan | Deduplicación por fecha de llegada y carga probada dos veces sin cambios |
| JSON | La vista con FLATTEN devuelve un ítem por fila | Maneja arreglos vacíos con `outer => TRUE` |
| Recuperación | El procedimiento está escrito | Lo probaste con un error provocado |
| Seguridad | Rol de solo lectura | Pruebas positivas y negativas documentadas |
| Costos | Resource monitor activo | Estimación mensual justificada |

:::tip Para tu portafolio
Sube el script SQL y el documento a un repositorio de GitHub con un README que tenga el diagrama y capturas **de la práctica** o de tu cuenta de prueba, sin datos de terceros. Si te preparas para la certificación **SnowPro Core**, este proyecto cubre buena parte de sus temas: arquitectura, carga, rendimiento, seguridad y costos.
:::

## Lo que aprendiste en el curso

- **Nivel 1:** qué es Snowflake, Snowsight, hojas SQL y explorar datos.
- **Nivel 2:** warehouses, bases, esquemas, tablas y el historial.
- **Nivel 3:** stages, COPY INTO, JSON y MERGE.
- **Nivel 4:** Time Travel, UNDROP, clones y SQL analítico.
- **Nivel 5:** roles, GRANT, costos y resource monitors.
- **Nivel 6:** buenas prácticas, automatización y Snowflake real.

:::ejercicio quiz
¿Qué hace idempotente la carga del proyecto?
- [ ] Usar INSERT con un warehouse dedicado
- [x] COPY INTO que saltea archivos ya cargados y un MERGE deduplicado
- [ ] Un warehouse grande
- [ ] Borrar todo cada día
:::

:::ejercicio quiz
Alguien borra pedidos_actuales por error. ¿Qué usas primero?
- [x] UNDROP TABLE (si se borró la tabla) o Time Travel con el Query ID (si se borraron filas)
- [ ] Fail-safe
- [ ] Un clon de la tabla creado después del borrado
- [ ] Pedirle a soporte Fail-safe en el momento
:::

:::ejercicio quiz
¿Por qué dos warehouses (carga y análisis)?
- [ ] Porque uno no alcanza para SQL
- [x] Para que no se pisen y para medir y limitar el costo de cada uno
- [ ] Porque Snowflake lo exige
- [ ] Porque un warehouse no puede leer dos esquemas
:::

:::ejercicio quiz
¿Qué certificación de Snowflake cubre los temas del curso?
- [ ] AZ-900
- [x] SnowPro Core
- [ ] PL-300
- [ ] AWS SAA
:::
