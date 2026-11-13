---
titulo: Proyecto 5 (requisitos y rúbrica) - un modelo dbt nuevo, probado y entregado por pull request
nivel: 5 · Avanzado
duracion: 120
resumen: El equipo de análisis necesita ver las ventas por mes y por canal en el proyecto dbt de la tienda. Diseñas el modelo, lo escribes en VS Code con ref, lo construyes con sus dependencias, le agregas tests en el schema.yml, verificas los resultados contra los datos, lo versionas en una rama y lo entregas con un pull request. Requisitos y rúbrica; las decisiones son tuyas.
objetivos: Diseñar un modelo dbt a partir de un pedido | Escribir el SQL con ref y una columna de período | Construir el modelo con sus dependencias | Definir tests de calidad en el schema.yml | Verificar los resultados y entregarlos por pull request
prerrequisitos: vscode-productividad
autoevaluacion: ¿Sabes en qué capa va un modelo de negocio? | ¿Sabes agrupar por mes en SQL? | ¿Sabes qué tests tiene sentido agregar? | ¿Sabes verificar que el total del modelo coincide con el de staging?
---

:::escenario El pedido
Mensaje del equipo de análisis: *"Para el tablero mensual necesitamos una tabla en dbt con las ventas por mes y por canal: pedidos, importe y ticket promedio. Que tenga tests para no publicar datos rotos. Mandalo por PR así lo revisamos."*
:::

Sin pasos ni pistas de código. Requisitos, controles y rúbrica.

## Punto de partida

El proyecto `~/tienda_dbt` en [VS Code de práctica](#/vscode) (`code ~/tienda_dbt`). Si no es un repositorio, inicialízalo y haz un primer commit de lo que hay **antes** de empezar.

## Requisitos

**R1 — El modelo**: `models/marts/ventas_mensuales.sql`, materializado como tabla, con una fila por **mes y canal** y las columnas `mes` (texto `AAAA-MM`), `canal`, `pedidos` (distintos), `importe` (redondeado a 2) y `ticket` (importe / pedidos, redondeado a 2). Construido sobre `stg_ventas` con `ref`.

**R2 — Tests** en `models/schema.yml`: `mes`, `canal` y `pedidos` no nulos, y la combinación mes + canal sin repetidos (pista: dbt tiene tests genéricos; si no hay uno para combinaciones, crea una columna `clave` = mes || '-' || canal y prueba `unique` sobre ella).

**R3 — Construcción**: `dbt run --select +ventas_mensuales` y `dbt test --select ventas_mensuales` sin errores.

**R4 — Verificación**: comprobar en `sqlite3` (o con una consulta) que la suma de `importe` del modelo es igual a la suma de `importe` de `stg_ventas`. Anota los dos números en la descripción del PR.

**R5 — Entrega**: rama `feature/ventas-mensuales`, al menos dos commits (modelo; tests), push y PR con descripción: qué agrega, cómo se probó, los números de la verificación y qué queda fuera.

**R6 — Calidad**: SQL legible (una columna por línea, alias claros, palabras clave en minúscula como el resto del proyecto) y un comentario de una línea arriba del modelo que diga qué es.

## ✔ Controles

- El modelo tiene **una fila por cada combinación** de mes y canal presente en los datos: ni más (duplicados) ni menos.
- Suma de `importe` del modelo = suma de `importe` de `stg_ventas` (si no coincide, revisa el `group by` y el `join`).
- El `ticket` de una fila cualquiera = `importe / pedidos` de esa fila.
- `dbt test` pasa todos los tests.

:::tip Fechas en SQLite y en Databricks
Esta práctica corre dbt sobre SQLite, donde el mes se obtiene con `strftime('%Y-%m', fecha_pedido)`. En Databricks o Snowflake sería `date_format(fecha_pedido, 'yyyy-MM')` o `to_char(...)`. En un proyecto real, para que el SQL funcione en cualquier motor se usan macros (`{{ dbt.date_trunc('month', 'fecha_pedido') }}`).
:::

## Rúbrica

| Criterio | Insuficiente | Bien | Excelente |
|---|---|---|---|
| Modelo | No usa ref o el grano es incorrecto | Una fila por mes y canal, columnas correctas | Además legible y comentado, consistente con el proyecto |
| Tests | Sin tests | not_null en las columnas clave | Unicidad de la combinación mes + canal resuelta |
| Verificación | No se comprobó | Total del modelo = total de staging | Además controla el ticket y explica cómo |
| Git | Todo en un commit en main | Rama y dos commits | Commits con buenos mensajes y PR completo |
| Comunicación | PR sin descripción | Descripción con qué y cómo | Incluye los números de verificación y el alcance |

:::ejercicio quiz
¿En qué carpeta va un modelo de negocio como ventas_mensuales?
- [ ] models/staging
- [x] models/marts
- [ ] seeds
- [ ] La raíz del proyecto
:::

:::ejercicio quiz
¿Cómo compruebas que el modelo no perdió ni duplicó importe?
- [ ] Mirando las primeras filas
- [x] Comparando la suma de importe del modelo con la de stg_ventas
- [ ] Ejecutando dbt run dos veces
- [ ] Contando las columnas
:::

:::ejercicio quiz
¿Qué comando construye el modelo y todo lo que necesita antes?
- [ ] dbt run --select ventas_mensuales
- [x] dbt run --select +ventas_mensuales
- [ ] dbt test
- [ ] dbt compile
:::
