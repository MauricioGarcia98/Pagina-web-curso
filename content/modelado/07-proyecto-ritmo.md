---
titulo: "Proyecto: el modelo analítico completo de Ritmo"
nivel: Experto
duracion: 75
resumen: Un proyecto de modelado de punta a punta para la app de música: requisitos, matriz de bus, diagrama, construcción de dimensiones y hechos con SQL y validación con las preguntas del negocio.
objetivos: Convertir las preguntas de un negocio en una matriz de bus y un modelo dimensional | Construir con SQL dimensiones, una tabla de hechos transaccional y un snapshot periódico mensual | Validar el modelo respondiendo las preguntas del negocio y comparando contra las tablas de origen | Documentar el grano, las claves y las decisiones del modelo
prerrequisitos: modelado-kimball | modelado-scd | modelado-obt-anidados | casos-streaming
autoevaluacion: ¿Puedes declarar el grano de las dos tablas de hechos de este proyecto? | ¿Puedes construir el snapshot mensual de suscripciones con una fila por suscripción vigente y mes? | ¿Puedes calcular el MRR de un mes desde el snapshot? | ¿Sabes qué validaciones harías antes de publicar el modelo? | ¿Puedes explicar por qué el MRR sale del snapshot y no de la tabla de reproducciones?
---

:::escenario El modelo de Ritmo
El director de producto de **Ritmo** te asigna tu primer proyecto de modelado completo:

> "Necesitamos un modelo de datos para tres usos: (1) el tablero de producto, con horas escuchadas por género, dispositivo y país; (2) el tablero financiero, con MRR, suscriptores pagos y altas y bajas por mes; (3) los científicos de datos quieren un lugar confiable para estudiar qué escucha la gente antes de darse de baja. Tienes las tablas de la app: usuarios, contenidos, reproducciones y suscripciones."

Vas a hacerlo como en un proyecto real: requisitos, diseño, construcción y validación.
:::

## Paso 1: de las preguntas a los procesos

Agrupa las preguntas del negocio por **proceso** (evento que se mide):

| Pregunta | Proceso | Grano necesario |
|---|---|---|
| Horas escuchadas por género, dispositivo y país | Reproducción | Una fila por reproducción |
| Skips (reproducciones de menos de 30 segundos) | Reproducción | Una fila por reproducción |
| MRR y suscriptores pagos por mes | Estado de las suscripciones | Una fila por suscripción **vigente** y mes |
| Altas y bajas por mes | Estado de las suscripciones | Igual (o una tabla de eventos de alta y baja) |
| Qué escuchan antes de darse de baja | Reproducción + suscripción | Las dos tablas, unidas por usuario y fecha |

Dos procesos, por lo tanto **dos tablas de hechos**.

## Paso 2: la matriz de bus

| Proceso \ Dimensión | Fecha | Usuario | Contenido | Dispositivo | Plan |
|---|---|---|---|---|---|
| Reproducciones (transaccional) | ✔ | ✔ | ✔ | ✔ | |
| Suscripciones por mes (snapshot periódico) | ✔ (mes) | ✔ | | | ✔ |

Fecha y usuario son **dimensiones conformadas**: las comparten las dos tablas de hechos. Así se puede cruzar consumo con suscripción.

## Paso 3: el modelo

```diagrama
titulo: El modelo dimensional de Ritmo: dos tablas de hechos con dimensiones conformadas
nodo fr: fct_reproducciones | icono=musica | col=1 | fila=1 | color=naranja | sub=1 fila por reproducción\nsegundos, es_skip
nodo fs: fct_suscripciones_mes | icono=dinero | col=3 | fila=1 | color=naranja | sub=1 fila por suscripción vigente y mes\nprecio (MRR)
nodo du: dim_usuario | icono=usuario | col=2 | fila=0 | color=azul | sub=país, edad, tramo
nodo df: dim_fecha | icono=reloj | col=2 | fila=2 | color=azul | sub=día y mes
nodo dc: dim_contenido | icono=capas | col=0 | fila=0 | color=azul | sub=tipo, género, artista
nodo dd: dispositivo | icono=movil | col=0 | fila=2 | forma=nota | sub=dimensión degenerada
nodo dp: plan | icono=archivo | col=3 | fila=0 | forma=nota | sub=atributo del hecho
flecha dc -- fr
flecha du -- fr
flecha df -- fr
flecha dd -- fr | estilo=punteada
flecha du -- fs
flecha df -- fs
flecha dp -- fs | estilo=punteada
```

Decisiones documentadas:

- **`fct_reproducciones`** — grano: una fila por reproducción. Medidas: `segundos_escuchados` (aditiva), `es_skip` (1 si duró menos de 30 segundos; aditiva como conteo). El dispositivo queda como dimensión degenerada (son 4 valores, sin más atributos).
- **`fct_suscripciones_mes`** — grano: una fila por suscripción **vigente** al primer día de cada mes. Medida: `precio_mensual`. Es un **snapshot periódico**: el MRR de un mes es la suma del precio de las suscripciones pagas de ese mes. No se suma entre meses.
- **`dim_usuario`** — atributos estables (país, edad al registrarse, tramo de edad). Si el país pudiera cambiar, sería SCD tipo 2; en estos datos no cambia.
- **`dim_contenido`** — tipo (canción o podcast), género, artista, duración.

## Paso 4: construir las tablas

### `dim_usuario`

```sql
SELECT
    usuario_id,
    pais,
    edad,
    CASE WHEN edad < 25 THEN '18-24' WHEN edad < 35 THEN '25-34'
         WHEN edad < 50 THEN '35-49' ELSE '50+' END AS tramo_edad,
    fecha_registro,
    dispositivo_principal
FROM streaming_usuarios
LIMIT 5;
```

### `fct_reproducciones`

```sql
SELECT
    r.repro_id,
    DATE(r.fecha_hora)                                AS fecha,
    r.usuario_id,
    r.contenido_id,
    r.dispositivo,
    r.segundos_escuchados,
    CASE WHEN r.segundos_escuchados < 30 THEN 1 ELSE 0 END AS es_skip
FROM streaming_reproducciones r
LIMIT 5;
```

### `fct_suscripciones_mes` (el snapshot)

La parte más interesante. Hay que "expandir" cada suscripción en una fila por cada mes en que estuvo vigente el día 1. Primero se generan los meses con una CTE recursiva, y después se cruza cada mes con las suscripciones vigentes ese día:

```sql
WITH RECURSIVE meses(mes) AS (
    SELECT DATE('2024-01-01')
    UNION ALL
    SELECT DATE(mes, '+1 month') FROM meses WHERE mes < '2024-12-01'
)
SELECT
    m.mes,
    s.suscripcion_id,
    s.usuario_id,
    s.plan,
    s.precio_mensual
FROM meses m
JOIN streaming_suscripciones s
  ON s.fecha_inicio <= m.mes
 AND (s.fecha_fin IS NULL OR s.fecha_fin > m.mes)
ORDER BY m.mes, s.suscripcion_id
LIMIT 8;
```

Fíjate en la condición de vigencia: empezó **en o antes** del día 1 y terminó **después** del día 1 (o no terminó). Es el mismo rango semiabierto de las SCD.

## Paso 5: validar con las preguntas del negocio

Un modelo se valida respondiendo las preguntas para las que se hizo, y comparando contra las tablas de origen. Por ejemplo, el MRR por mes desde el snapshot:

```sql
WITH RECURSIVE meses(mes) AS (
    SELECT DATE('2024-01-01')
    UNION ALL
    SELECT DATE(mes, '+1 month') FROM meses WHERE mes < '2024-12-01'
),
snapshot AS (
    SELECT m.mes, s.suscripcion_id, s.precio_mensual
    FROM meses m
    JOIN streaming_suscripciones s
      ON s.fecha_inicio <= m.mes AND (s.fecha_fin IS NULL OR s.fecha_fin > m.mes)
)
SELECT mes,
       SUM(CASE WHEN precio_mensual > 0 THEN 1 ELSE 0 END) AS suscriptores_pagos,
       ROUND(SUM(precio_mensual), 2)                      AS mrr
FROM snapshot
GROUP BY mes
ORDER BY mes;
```

Checklist de validación antes de publicar:

1. **Unicidad del grano**: en `fct_reproducciones`, `repro_id` es único; en el snapshot, (`mes`, `suscripcion_id`) es único.
2. **Conteos contra el origen**: la cantidad de filas de `fct_reproducciones` es igual a la de `streaming_reproducciones`.
3. **Integridad**: toda reproducción tiene un usuario y un contenido que existen en sus dimensiones.
4. **Sentido de negocio**: el MRR no salta de golpe sin explicación; las horas por mes son razonables.
5. **Comparación con lo que ya existía**: si finanzas tenía un MRR calculado a mano, se compara mes a mes y se explican las diferencias.

<!-- estandar:errores -->
:::errores
- **Calcular el MRR desde las reproducciones**: escuchar música no es pagar. El MRR sale del estado de las suscripciones.
- **Sumar el snapshot entre meses**: el "MRR del año" no es la suma de los MRR mensuales (eso es otra métrica: los ingresos del año).
- **Vigencia mal definida**: usar `fecha_fin >= mes` incluye las suscripciones que terminaron justo el día 1. Define el criterio y documéntalo.
- **No conformar dimensiones**: si el tablero de producto usa una `dim_usuario` y el financiero otra, cruzar consumo con bajas da resultados raros.
:::

<!-- estandar:trabajo -->
:::trabajo
- En un proyecto real, este modelo se implementa en dbt: un modelo por tabla (`dim_usuario.sql`, `fct_reproducciones.sql`, `fct_suscripciones_mes.sql`), con tests de unicidad del grano, `relationships` y descripciones de cada columna. La documentación de dbt genera el diagrama de linaje solo.
- El proyecto se entrega en etapas: primero las dimensiones conformadas y una tabla de hechos con un tablero; después la segunda. Cada etapa se valida con el negocio antes de seguir.
:::

## Ejercicios

:::ejercicio sql titulo="Horas por género y dispositivo" ordenado
Usando el grano de `fct_reproducciones` (unido con los contenidos), calcula las **horas escuchadas** de **canciones** por `genero` y `dispositivo`, redondeadas a 1 decimal. Devuelve solo las combinaciones con más de 20 horas, ordenadas por `horas` descendente.
```sql solucion
SELECT c.genero, r.dispositivo,
       ROUND(SUM(r.segundos_escuchados) / 3600.0, 1) AS horas
FROM streaming_reproducciones r
JOIN streaming_contenidos c ON c.contenido_id = r.contenido_id
WHERE c.tipo = 'cancion'
GROUP BY c.genero, r.dispositivo
HAVING SUM(r.segundos_escuchados) / 3600.0 > 20
ORDER BY horas DESC
```
:::

:::ejercicio sql titulo="Altas y bajas pagas por mes" ordenado
Desde el snapshot mensual (suscripciones vigentes el día 1 de cada mes de 2024), calcula para cada `mes` la cantidad de suscripciones **pagas** vigentes (`pagas`) y cuántas de ellas **no** estaban vigentes el mes anterior (`nuevas_en_snapshot`). Para enero, cuenta todas como nuevas. Ordena por `mes`.
```sql solucion
WITH RECURSIVE meses(mes) AS (
    SELECT DATE('2024-01-01')
    UNION ALL
    SELECT DATE(mes, '+1 month') FROM meses WHERE mes < '2024-12-01'
),
snapshot AS (
    SELECT m.mes, s.suscripcion_id
    FROM meses m
    JOIN streaming_suscripciones s
      ON s.fecha_inicio <= m.mes AND (s.fecha_fin IS NULL OR s.fecha_fin > m.mes)
    WHERE s.precio_mensual > 0
)
SELECT a.mes,
       COUNT(*) AS pagas,
       SUM(CASE WHEN b.suscripcion_id IS NULL THEN 1 ELSE 0 END) AS nuevas_en_snapshot
FROM snapshot a
LEFT JOIN snapshot b ON b.suscripcion_id = a.suscripcion_id AND b.mes = DATE(a.mes, '-1 month')
GROUP BY a.mes
ORDER BY a.mes
```
```pista
Construye el snapshot de suscripciones pagas y únelo consigo mismo con un `LEFT JOIN` contra el mes anterior (`DATE(mes, '-1 month')`). Las que no tienen pareja son nuevas en ese mes.
```
:::

:::ejercicio sql titulo="Validación del grano" ordenado
Valida el modelo: devuelve tres filas con `chequeo` y `resultado`: `filas_fct_vs_origen` (filas de `streaming_reproducciones` menos filas distintas de `repro_id`; debe ser 0), `repros_sin_contenido` (reproducciones cuyo `contenido_id` no existe en `streaming_contenidos`) y `repros_sin_usuario` (cuyo `usuario_id` no existe en `streaming_usuarios`). Ordena por `chequeo`.
```sql solucion
SELECT 'filas_fct_vs_origen' AS chequeo, COUNT(*) - COUNT(DISTINCT repro_id) AS resultado FROM streaming_reproducciones
UNION ALL
SELECT 'repros_sin_contenido', COUNT(*) FROM streaming_reproducciones r
WHERE NOT EXISTS (SELECT 1 FROM streaming_contenidos c WHERE c.contenido_id = r.contenido_id)
UNION ALL
SELECT 'repros_sin_usuario', COUNT(*) FROM streaming_reproducciones r
WHERE NOT EXISTS (SELECT 1 FROM streaming_usuarios u WHERE u.usuario_id = r.usuario_id)
ORDER BY chequeo
```
:::

:::ejercicio abierto titulo="Extiende el modelo: playlists"
Ritmo lanza las playlists: un usuario crea playlists, cada playlist tiene muchas canciones (en un orden) y una canción está en muchas playlists; los usuarios pueden seguir playlists de otros. Producto quiere saber qué playlists generan más horas escuchadas y cuántos seguidores ganan por semana. ¿Qué tablas de hechos y dimensiones agregas, con qué grano? ¿Qué cambias en `fct_reproducciones`?
```solucion
Dimensiones nuevas: dim_playlist (playlist_id, nombre, creador usuario_id, fecha de creación, es_publica). La relación N:M playlist-canción es una tabla puente (bridge) playlist_contenido(playlist_id, contenido_id, posicion, fecha_agregado), útil para analizar composición.
fct_reproducciones: se agrega la columna playlist_id (nullable: NULL si la reproducción no vino de una playlist), que conecta con dim_playlist. Así las horas por playlist son un SUM agrupado por playlist_id, sin pasar por la tabla puente (que multiplicaría filas).
Nueva tabla de hechos fct_seguimientos (transaccional): una fila por evento de seguir o dejar de seguir (fecha, usuario seguidor, playlist, tipo_evento). Seguidores ganados por semana = conteo de eventos 'seguir' menos 'dejar' por semana.
Opcional: snapshot periódico fct_playlist_semana con seguidores al cierre de cada semana (semiaditivo) y horas escuchadas de esa semana, para el tablero.
```
:::
