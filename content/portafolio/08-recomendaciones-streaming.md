---
titulo: "Proyecto 7: Recomendaciones y retención en una plataforma de streaming"
nivel: Avanzado
duracion: 100
resumen: Usuarios, catálogo y millones de minutos vistos. Calculas el engagement que importa (usuarios activos, finalización, retención), construyes recomendaciones "quienes vieron esto también vieron" con co-ocurrencia en SQL, las evalúas con un período de prueba y diseñas el experimento para probarlas. Valor - más minutos vistos y menos bajas.
objetivos: Calcular usuarios activos diarios y mensuales y su relación | Medir la tasa de finalización por género y duración | Construir recomendaciones por co-ocurrencia con SQL | Evaluar recomendaciones con precisión en el top 5 sobre un período de prueba | Diseñar un experimento A/B para medir el efecto en retención
prerrequisitos: portafolio-como-armar-tu-portafolio | analisis-cohortes-retencion
autoevaluacion: ¿Sabes calcular DAU, MAU y su cociente? | ¿Sabes qué es co-ocurrencia? | ¿Sabes evaluar una recomendación sin un experimento? | ¿Sabes por qué el contenido más popular es una línea base difícil de superar? | ¿Sabes qué métrica usar en el experimento?
---

:::escenario
El equipo de producto de una plataforma de streaming tiene una fila de "Recomendados para ti" que muestra siempre lo más visto. La tasa de bajas de los usuarios nuevos es alta: en el primer mes no encuentran nada que les guste. Te piden recomendaciones personalizadas "que se puedan explicar" y una forma de demostrar que sirven.
:::

## Valor y métricas

- **Engagement**: DAU/MAU (qué tan habitual es el uso), minutos por usuario, tasa de finalización.
- **Retención**: usuarios que siguen activos 30 días después del alta.
- **Recomendaciones**: precisión en el top 5 (de 5 recomendados, cuántos vio después).

## Los datos

[🏭 Generar los datos del proyecto](#/generador?esc=streaming&n=2000&semilla=77&desde=2024-01-01&hasta=2024-12-31&duplicados=1&nulos=2) · Escenario **Streaming**: `usuarios` (alta y baja), `contenidos` (tipo, género, duración) y `reproducciones` (minutos vistos, completado).

## Arquitectura

```diagrama
titulo: Recomendaciones explicables
nodo r: reproducciones | icono=tabla | col=0 | fila=0
nodo e: Engagement | icono=grafico | col=1 | fila=0 | sub=DAU/MAU, finalización
nodo c: Co-ocurrencia | icono=red | col=1 | fila=1 | sub=pares de contenidos\nvistos por los mismos
nodo rec: recomendaciones | icono=star | col=2 | fila=1 | sub=top 5 por usuario\n+ "porque viste X"
nodo ev: Evaluación | icono=check | col=3 | fila=1 | sub=precisión@5 vs popular
nodo ab: Experimento | icono=prueba | col=3 | fila=0 | sub=retención a 30 días
flecha r -> e
flecha r -> c
flecha c -> rec
flecha rec -> ev
flecha ev -> ab
```

## La co-ocurrencia, en SQL

"Quienes vieron A también vieron B": cuenta cuántos usuarios vieron ambos contenidos. Es simple, escala con SQL y **se explica sola** ("te lo recomendamos porque viste *El último código*").

```sql norun
WITH vistos AS (SELECT DISTINCT usuario_id, contenido_id FROM reproducciones WHERE completado OR minutos_vistos >= 20)
SELECT a.contenido_id AS desde, b.contenido_id AS hacia, count(*) AS usuarios
FROM vistos a JOIN vistos b ON a.usuario_id = b.usuario_id AND a.contenido_id <> b.contenido_id
GROUP BY 1, 2
HAVING count(*) >= 3;
```

Para no recomendar siempre lo más popular, se normaliza (por ejemplo, dividir por la raíz del producto de las popularidades: similitud coseno).

## Evaluar sin experimento: el corte temporal

Entrena (calcula co-ocurrencias) con los datos **hasta septiembre**; recomienda a cada usuario 5 contenidos que no vio; y mide en **octubre-diciembre** cuántos de esos 5 vio. Compara contra la línea base "los 5 más populares". Si no le ganas a lo popular, no tienes un recomendador: tienes complejidad.

## Entregables

- [ ] Tablero de engagement: DAU, MAU, DAU/MAU, finalización por género.
- [ ] Tabla de recomendaciones con su explicación.
- [ ] Precisión@5 del modelo contra la línea base popular.
- [ ] Diseño del experimento: grupos, métrica principal (retención a 30 días de usuarios nuevos), duración y tamaño de muestra.

## Práctica

:::ejercicio cli dificultad=Básico titulo="Los datos de streaming"
Genera el escenario `streaming` con 300 usuarios y semilla 77.
```respuesta
todos: generar-datos streaming || --filas 300 || --semilla 77
```
```solucion
generar-datos streaming --filas 300 --semilla 77
```
:::

:::ejercicio sql ordenado dificultad=Intermedio titulo="Finalización por género"
`reps(usuario_id, contenido_id, genero, minutos_vistos, duracion_min)`. Calcula por género la `finalizacion_pct`: porcentaje de reproducciones con `minutos_vistos >= 0.9 * duracion_min` (1 decimal). Ordena de mayor a menor.
```sql setup
CREATE TABLE reps (usuario_id INTEGER, contenido_id INTEGER, genero TEXT, minutos_vistos INTEGER, duracion_min INTEGER);
INSERT INTO reps VALUES (1, 10, 'drama', 95, 100), (2, 10, 'drama', 30, 100), (3, 11, 'drama', 120, 120), (1, 20, 'comedia', 90, 90), (2, 20, 'comedia', 85, 90),
(3, 21, 'comedia', 10, 95), (4, 21, 'comedia', 95, 95), (1, 30, 'terror', 20, 110), (4, 30, 'terror', 15, 110);
```
```sql solucion
SELECT genero, ROUND(100.0 * SUM(CASE WHEN minutos_vistos >= 0.9 * duracion_min THEN 1 ELSE 0 END) / COUNT(*), 1) AS finalizacion_pct
FROM reps GROUP BY genero ORDER BY finalizacion_pct DESC;
```
:::

:::ejercicio sql ordenado dificultad=Avanzado titulo="Quienes vieron esto también vieron"
`vistos(usuario_id, contenido_id)`. Devuelve los contenidos vistos por usuarios que también vieron el contenido `1` (sin incluir el `1`), con cuántos usuarios en común (`usuarios`), de más a menos (desempate por `contenido_id`).
```sql setup
CREATE TABLE vistos (usuario_id INTEGER, contenido_id INTEGER);
INSERT INTO vistos VALUES (1, 1), (1, 2), (1, 3), (2, 1), (2, 2), (3, 1), (3, 2), (3, 4), (4, 3), (4, 4), (5, 1), (5, 4);
```
```sql solucion
SELECT b.contenido_id, COUNT(*) AS usuarios
FROM vistos a
JOIN vistos b ON b.usuario_id = a.usuario_id AND b.contenido_id <> a.contenido_id
WHERE a.contenido_id = 1
GROUP BY b.contenido_id
ORDER BY usuarios DESC, b.contenido_id;
```
```pista
Une la tabla consigo misma por `usuario_id`: `a` es "vio el 1" y `b` es "qué más vio".
```
:::

:::ejercicio sql dificultad=Intermedio titulo="DAU/MAU"
`actividad(usuario_id, fecha)` tiene un registro por usuario y día activo de junio de 2024. Calcula `dau_promedio` (promedio de usuarios distintos por día, 1 decimal), `mau` (usuarios distintos del mes) y `dau_mau_pct` (1 decimal).
```sql setup
CREATE TABLE actividad (usuario_id INTEGER, fecha TEXT);
WITH RECURSIVE d(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM d WHERE n < 30)
INSERT INTO actividad
SELECT u, printf('2024-06-%02d', n) FROM d, (SELECT 1 AS u UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5)
WHERE (u = 1) OR (u = 2 AND n % 2 = 0) OR (u = 3 AND n % 5 = 0) OR (u = 4 AND n <= 3) OR (u = 5 AND n = 15);
```
```sql solucion
WITH diario AS (SELECT fecha, COUNT(DISTINCT usuario_id) AS u FROM actividad GROUP BY fecha)
SELECT ROUND((SELECT SUM(u) FROM diario) / 30.0, 1) AS dau_promedio,
       (SELECT COUNT(DISTINCT usuario_id) FROM actividad) AS mau,
       ROUND(100.0 * (SELECT SUM(u) FROM diario) / 30.0 / (SELECT COUNT(DISTINCT usuario_id) FROM actividad), 1) AS dau_mau_pct;
```
```pista
El DAU promedio divide por los 30 días del mes (los días sin actividad cuentan como 0), no solo por los días con datos.
```
:::

:::ejercicio quiz dificultad=Avanzado
Tu recomendador tiene precisión@5 de 6 % y la línea base "los más populares" tiene 9 %. ¿Qué haces?

- [ ] Publicarlo igual: es personalizado
- [x] No publicarlo todavía: mejorar (normalizar por popularidad, mezclar con lo popular) o quedarse con la línea base, que es más simple y mejor
- [ ] Cambiar la métrica hasta que gane
- [ ] Bajar el corte temporal
:::

:::ejercicio quiz dificultad=Intermedio
¿Por qué se evalúa con un corte temporal (entrenar hasta septiembre, medir en octubre-diciembre)?

- [ ] Porque es más rápido
- [x] Porque simula el uso real: recomendar con lo que se sabe hoy y ver qué hace el usuario después, sin información del futuro
- [ ] Porque diciembre tiene más datos
- [ ] Porque así lo pide SQL
:::

:::ejercicio quiz dificultad=Avanzado
En el experimento, ¿cuál es la mejor métrica principal?

- [ ] Clics en la fila de recomendados
- [x] Retención a 30 días de los usuarios nuevos (lo que el negocio quiere mejorar), con minutos vistos como métrica secundaria
- [ ] Cantidad de recomendaciones mostradas
- [ ] Precisión@5
:::

## Para ir más lejos

- Factorización de matrices (ALS en Spark MLlib) contra la co-ocurrencia.
- Embeddings de los títulos y descripciones para el "arranque en frío" de contenidos nuevos.
