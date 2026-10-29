---
titulo: "Diseñar el lakehouse: capas, entornos, nombres y contratos"
nivel: Avanzado
duracion: 50
resumen: Las decisiones concretas de un lakehouse profesional: qué va en cada capa, cómo separar dev y prod, convenciones de nombres, contratos de datos y el camino del código a producción.
objetivos: Definir qué transformaciones van en bronze, silver y gold, y qué no va en cada una | Separar entornos de desarrollo, pruebas y producción sin duplicar costos | Proponer una convención de nombres para catálogos, esquemas, tablas y columnas | Escribir un contrato de datos con el equipo que produce la fuente | Describir el camino de un cambio desde la rama de Git hasta producción
prerrequisitos: arquitectura-almacenamiento | dbt-sources-capas | databricks-unity-catalog
autoevaluacion: ¿Sabes en qué capa se deduplica y en cuál se calcula la venta neta? | ¿Puedes proponer cómo se llaman los catálogos y esquemas de dev y prod? | ¿Sabes qué contiene un contrato de datos? | ¿Puedes explicar por qué nadie debería escribir a mano en las tablas de producción? | ¿Sabes cómo probar un cambio con datos reales sin tocar producción?
---

:::escenario Ocho empresas, una plataforma
La arquitectura del Grupo Andino ya está decidida: un lakehouse. Ahora viene lo difícil. Martín te dice:

> "Si no definimos reglas desde el día uno, en seis meses vamos a tener 2.000 tablas que se llaman `ventas_final_v2_ok` y nadie va a saber cuál usar. Necesito que propongas cómo organizamos capas, entornos y nombres, y cómo evitamos que un cambio en la app del banco nos rompa todo sin aviso."

Una arquitectura no es solo el diagrama de cajas: son también las **reglas** que hacen que siga ordenada cuando crece.
:::

## Qué va en cada capa (y qué no)

Ya conoces bronze, silver y gold. La pregunta práctica es: ¿en qué capa va **cada** transformación? Esta tabla es la que usan la mayoría de los equipos:

| | Bronze | Silver | Gold |
|---|---|---|---|
| **Pregunta que responde** | ¿Qué llegó? | ¿Qué pasó, de forma limpia y confiable? | ¿Qué necesita saber el negocio? |
| **Grano** | El de la fuente | Una fila por entidad o evento real | El que pide el consumo (por día, por cliente…) |
| **Se hace** | Agregar metadatos de carga | Tipar, renombrar, deduplicar, normalizar textos, unir con referencias, aplicar CDC | Agregar, calcular métricas, modelar hechos y dimensiones |
| **No se hace** | Ninguna transformación | Reglas de negocio específicas de un área | Limpieza (ya viene limpio) |
| **Esquema** | Flexible (puede cambiar) | Estable y validado | Estable, documentado, versionado |
| **Quién lo lee** | Solo los pipelines | Ingenieros, científicos de datos | Analistas, BI, aplicaciones |
| **Retención** | Larga, en capa fría | Larga | Lo que necesite el negocio |

```diagrama
titulo: Ejemplo: un pedido del banco y uno de la tienda, capa por capa
nodo b1: bronze.tienda_pedidos_raw | icono=archivo | col=0 | fila=0 | color=naranja | sub=JSON tal cual + _fecha_ingesta
nodo s1: silver.pedidos | icono=tabla | col=1 | fila=0 | color=gris | sub=tipado, sin duplicados
nodo g1: gold.fct_ventas | icono=grafico | col=2 | fila=0 | color=amarillo | sub=venta neta por línea
nodo g2: gold.ventas_diarias_pais | icono=dashboard | col=3 | fila=0 | color=verde | sub=para el tablero
nodo s2: silver.clientes | icono=usuario | col=1 | fila=1 | color=gris | sub=última versión (CDC)
nodo d1: gold.dim_cliente | icono=usuario | col=2 | fila=1 | color=amarillo | sub=SCD tipo 2
flecha b1 -> s1
flecha s1 -> g1
flecha g1 -> g2
flecha s2 -> d1
flecha d1 -> g2: país del cliente
```

:::tip Una regla que evita discusiones
Si una transformación es **verdad para toda la empresa** (un email limpio, un pedido sin duplicar), va en silver. Si es una **definición de un área** (qué cuenta como "venta neta" para finanzas), va en gold, con un nombre que diga de quién es.
:::

## Entornos: dev, staging y prod

Nadie prueba un cambio directamente en producción. Pero tener tres plataformas completas triplica el costo. Lo habitual en un lakehouse:

```diagrama
titulo: Tres entornos, una plataforma: se separan por catálogo y por permisos
nodo git: Rama en Git | icono=git | col=0 | fila=0 | sub=tu cambio
nodo dev: Catálogo dev | icono=almacen | col=1 | fila=0 | color=azul | sub=cada persona su esquema
nodo stg: Catálogo staging | icono=almacen | col=2 | fila=0 | color=amarillo | sub=CI: datos de muestra
nodo prd: Catálogo prod | icono=almacen | col=3 | fila=0 | color=verde | sub=solo la cuenta de servicio escribe
nodo src: Datos de prod (lectura) | icono=bucket | col=1 | fila=1 | color=naranja | sub=bronze compartido
flecha git -> dev: dbt run --target dev
flecha dev -> stg: pull request
flecha stg -> prd: merge a main
flecha src -> dev: lee | estilo=punteada
flecha src -> stg: lee | estilo=punteada
```

| Entorno | Para qué | Quién escribe | Datos |
|---|---|---|---|
| **dev** | Desarrollar y probar a mano | Cada persona, en su propio esquema (`dev.ana_ventas`) | Lee bronze de producción (o una muestra); escribe solo en dev |
| **staging / CI** | Probar automáticamente cada pull request | La CI | Muestra de datos reales o datos sintéticos |
| **prod** | Lo que usa el negocio | **Solo** las cuentas de servicio de los pipelines | Todos |

Dos ideas clave:

1. **En producción no escriben personas.** Todo cambio entra por Git, pasa la CI y lo despliega una cuenta de servicio. Si alguien "arregla a mano" una tabla de producción, el próximo pipeline la pisa y nadie sabe qué pasó.
2. **Dev lee datos de producción, pero escribe en dev.** Así pruebas con datos reales sin riesgo. Los datos sensibles se enmascaran para dev.

## Convención de nombres

Un buen nombre dice **dónde está, qué contiene y a qué nivel**. Una convención típica para un lakehouse con Unity Catalog (catálogo.esquema.tabla):

| Nivel | Regla | Ejemplos |
|---|---|---|
| Catálogo | Entorno (+ dominio si hay muchos) | `prod`, `dev`, `prod_banco` |
| Esquema | Capa + fuente o dominio | `bronze_tienda`, `silver_tienda`, `gold_finanzas` |
| Tabla bronze | `<fuente>_<tabla>_raw` | `postgres_pedidos_raw` |
| Tabla silver | La entidad, en plural | `pedidos`, `clientes` |
| Tabla gold | `fct_` / `dim_` / `agg_` + qué | `fct_ventas`, `dim_cliente`, `agg_ventas_diarias_pais` |
| Columnas | `snake_case`, sin abreviaturas raras | `fecha_pedido`, `importe_neto` |
| Booleanos | `es_` / `tiene_` | `es_cancelado`, `tiene_descuento` |
| Fechas | `fecha_` (DATE) y `_ts` o `_en` (TIMESTAMP) | `fecha_alta`, `creado_en` |
| Importes | Con la moneda si hay varias | `importe_usd`, `importe_local` |
| Claves | `<entidad>_id` y `<entidad>_sk` para claves sustitutas | `cliente_id`, `cliente_sk` |

Lo importante no es esta convención en particular, sino **tener una, escrita, y hacerla cumplir en la revisión de código** (incluso con un linter: sqlfluff, dbt-checkpoint).

## Contratos de datos

El problema más frecuente de un pipeline no es un bug propio: es que **el equipo que produce la fuente cambia algo sin avisar**. La app renombra `total` a `monto_total`, y el pipeline de la noche falla o, peor, carga nulos.

Un **contrato de datos** es un acuerdo escrito entre quien produce los datos y quien los consume, versionado en Git:

```yaml norun
# contratos/tienda_pedidos.yml
dataset: tienda.pedidos
dueno: equipo-checkout@tiendaandina.com
version: 2.1.0
esquema:
  - {nombre: pedido_id,      tipo: bigint,        obligatorio: true, unico: true}
  - {nombre: cliente_id,     tipo: bigint,        obligatorio: true}
  - {nombre: total,          tipo: "decimal(12,2)", obligatorio: true, minimo: 0}
  - {nombre: estado,         tipo: string,        valores: [pendiente, pagado, enviado, entregado, cancelado, devuelto]}
  - {nombre: actualizado_en, tipo: timestamp,     obligatorio: true}
calidad:
  frescura: "datos de ayer disponibles antes de las 02:00"
  volumen: "entre 5.000 y 40.000 filas por día"
cambios: "agregar columnas es compatible; renombrar o borrar exige versión mayor y 30 días de aviso"
```

Con un contrato:

- El productor sabe qué **no** puede cambiar sin avisar (y su CI puede verificarlo).
- El consumidor valida cada carga contra el contrato y, si no se cumple, la frena **antes** de contaminar silver.
- Cuando algo se rompe, se sabe a quién llamar.

## El camino del código a producción

Todo lo anterior se junta en un flujo de CI/CD como el que viste en Git, ahora con la plataforma completa:

1. Creas una rama y desarrollas contra **dev** (`dbt run --target dev`, notebooks en tu esquema).
2. Abres un pull request. La **CI** construye solo los modelos que cambiaron y sus dependientes (`dbt build --select state:modified+`) en **staging**, corre los tests y valida contratos.
3. Una compañera revisa el código y los resultados.
4. Al hacer merge a `main`, el despliegue (Asset Bundles, Terraform, dbt Cloud) actualiza **prod**.
5. El orquestador corre los pipelines con la versión nueva.

<!-- estandar:errores -->
:::errores
- **Lógica de negocio en silver**: cuando finanzas cambia su definición de venta neta, hay que reprocesar silver y se rompen otros consumidores.
- **Limpieza en gold**: cada tabla gold limpia a su manera y los números no coinciden entre tableros.
- **Una sola base para todo**: desarrollar en el mismo esquema que producción. Tarde o temprano alguien borra una tabla real.
- **Nombres que no dicen nada**: `tabla_final`, `ventas2`, `tmp_juan`. Nadie sabe si se puede borrar o si alguien la usa.
- **Contratos solo en la wiki**: si nadie los verifica automáticamente, se desactualizan en semanas.
:::

<!-- estandar:trabajo -->
:::trabajo
- Las convenciones se escriben en un documento corto del equipo y se revisan en cada pull request. Las mejores son las que un linter puede verificar.
- Los contratos de datos se popularizaron en los últimos años y se implementan con herramientas como dbt (contratos de modelo, `contract: enforced: true`), Soda, Great Expectations o el estándar *Open Data Contract*.
- Muchas empresas tienen un "catálogo de datos" donde cada tabla gold tiene dueño, descripción y nivel de confianza (certificada, en desarrollo, deprecada).
:::

<!-- estandar:entrevista -->
:::entrevista "¿Cómo organizarías los entornos de una plataforma de datos?"
Describe dev, staging/CI y prod separados por catálogo o proyecto y por permisos; que en prod solo escriben cuentas de servicio desplegadas desde Git; que dev lee datos de prod (enmascarados si son sensibles) y escribe en esquemas personales; y que la CI construye solo lo modificado y sus dependientes. Menciona el costo: compartir almacenamiento y separar por permisos es mucho más barato que tres plataformas completas.
:::

## Ejercicios

:::ejercicio quiz
¿En qué capa se eliminan los pedidos duplicados que llegan por los reintentos de la ingesta?

- [ ] Bronze
- [x] Silver
- [ ] Gold
- [ ] En el tablero
:::

:::ejercicio quiz
Finanzas define "venta neta" como el importe menos descuentos y devoluciones del mes. ¿Dónde va ese cálculo?

- [ ] En bronze, al cargar
- [ ] En silver, para todos
- [x] En gold, en un modelo de finanzas con nombre y documentación
- [ ] En cada tablero, para que cada uno lo ajuste
:::

:::ejercicio quiz
Un analista encuentra un error en `prod.gold_finanzas.fct_ventas`. ¿Qué debería hacer?

- [ ] Corregirlo con un UPDATE directo, para que esté bien ya
- [x] Abrir un issue o pull request que corrija el modelo; el pipeline lo despliega y reprocesa
- [ ] Copiar la tabla a su esquema y corregirla ahí
- [ ] Borrar la tabla
:::

:::ejercicio sql titulo="Validar una carga contra el contrato" ordenado
Antes de pasar a silver, valida la carga de hoy contra el contrato de `pedidos`: `pedido_id` obligatorio y único, `total` obligatorio y mayor o igual a 0, y `estado` dentro de los valores permitidos (`pendiente`, `pagado`, `enviado`, `entregado`, `cancelado`, `devuelto`). Devuelve una fila por regla incumplida con `regla` y `filas` (cuántas filas la incumplen), solo las reglas con al menos una fila, ordenadas por `regla`. Las reglas se llaman `pedido_id_duplicado`, `pedido_id_nulo`, `total_invalido` y `estado_invalido`.
```sql inicial
WITH carga(pedido_id, total, estado) AS (
    VALUES (1, 120.5, 'pagado'), (2, NULL, 'pagado'), (2, 80.0, 'enviado'),
           (3, -5.0, 'pagado'), (NULL, 10.0, 'pendiente'), (4, 30.0, 'perdido'),
           (5, 99.9, 'entregado')
)
SELECT ...
```
```sql solucion
WITH carga(pedido_id, total, estado) AS (
    VALUES (1, 120.5, 'pagado'), (2, NULL, 'pagado'), (2, 80.0, 'enviado'),
           (3, -5.0, 'pagado'), (NULL, 10.0, 'pendiente'), (4, 30.0, 'perdido'),
           (5, 99.9, 'entregado')
),
reglas AS (
    SELECT 'pedido_id_nulo' AS regla, COUNT(*) AS filas FROM carga WHERE pedido_id IS NULL
    UNION ALL
    SELECT 'pedido_id_duplicado', COUNT(*) FROM carga
    WHERE pedido_id IN (SELECT pedido_id FROM carga WHERE pedido_id IS NOT NULL GROUP BY pedido_id HAVING COUNT(*) > 1)
    UNION ALL
    SELECT 'total_invalido', COUNT(*) FROM carga WHERE total IS NULL OR total < 0
    UNION ALL
    SELECT 'estado_invalido', COUNT(*) FROM carga
    WHERE estado NOT IN ('pendiente', 'pagado', 'enviado', 'entregado', 'cancelado', 'devuelto')
)
SELECT regla, filas FROM reglas WHERE filas > 0 ORDER BY regla
```
```pista
Escribe una consulta por regla que devuelva `('nombre_regla', COUNT(*))` y únelas con `UNION ALL`. Para los duplicados, cuenta las filas cuyo `pedido_id` aparece más de una vez. Al final filtra las que tienen `filas > 0`.
```
:::

:::ejercicio abierto titulo="La convención de nombres del Grupo Andino"
Propón los nombres (catálogo.esquema.tabla) para: (1) los pedidos crudos de la tienda que llegan de PostgreSQL; (2) los pedidos limpios; (3) la tabla de hechos de ventas; (4) la dimensión de clientes del banco; (5) un agregado diario de ausentismo de la clínica; (6) la versión de desarrollo de la tabla 3 de una persona llamada Ana. Explica la regla que seguiste.
```solucion
Regla: catálogo = entorno (prod / dev); esquema = capa + fuente o dominio; tablas bronze con sufijo _raw y la fuente; silver con el nombre de la entidad; gold con prefijo fct_/dim_/agg_.
1. prod.bronze_tienda.postgres_pedidos_raw
2. prod.silver_tienda.pedidos
3. prod.gold_ventas.fct_ventas
4. prod.gold_banco.dim_cliente
5. prod.gold_clinica.agg_ausentismo_diario
6. dev.ana_gold_ventas.fct_ventas (o dev.ana.fct_ventas): mismo nombre de tabla, esquema personal en el catálogo de desarrollo, así el código no cambia entre entornos, solo el target.
```
:::
