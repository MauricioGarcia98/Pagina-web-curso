---
titulo: "Proyecto 3: Mantenimiento predictivo con sensores IoT y MLflow"
nivel: Experto
duracion: 120
resumen: Lecturas horarias de temperatura, vibración y presión de máquinas industriales, con huecos de conectividad, deriva y fallas registradas. Construyes features por ventana de tiempo, etiquetas "falla en las próximas 24 horas" sin fuga de información, entrenas y registras un modelo con MLflow, y lo programas para puntuar cada hora. Valor - pasar de reparar después de la falla a intervenir antes.
objetivos: Detectar huecos y anomalías en series de tiempo con SQL | Construir features con ventanas móviles (media, desvío, tendencia) | Etiquetar "falla en las próximas N horas" sin fuga de información del futuro | Entrenar, comparar y registrar modelos con MLflow | Diseñar la puntuación periódica y su monitoreo
prerrequisitos: portafolio-como-armar-tu-portafolio | analisis-series-de-tiempo
autoevaluacion: ¿Sabes encontrar horas faltantes en una serie? | ¿Sabes calcular una media móvil de 6 horas por dispositivo? | ¿Sabes por qué una partición aleatoria de entrenamiento y prueba es un error en series de tiempo? | ¿Sabes qué registra MLflow? | ¿Sabes qué mide un buen modelo de mantenimiento?
---

:::escenario
Una planta con 40 máquinas tiene, en promedio, una falla por máquina cada dos meses. Cada falla imprevista detiene la línea 12 horas. El jefe de mantenimiento pregunta: "si me avisan con 24 horas, puedo cambiar el rodamiento en el turno de noche. ¿Se puede?". Los sensores ya miden; nadie mira los datos.
:::

## Valor

Cada falla anticipada ahorra la parada no planificada (12 h) a cambio de una intervención planificada (2 h). La métrica que importa es **cuántas fallas se anticipan** y **cuántas intervenciones innecesarias** genera el modelo, no la exactitud.

## Los datos

[🏭 Generar los datos del proyecto](#/generador?esc=iot&n=40&semilla=11&desde=2024-01-01&hasta=2024-12-31&nulos=2&atipicos=1&tardios=2) · Escenario **Sensores industriales**: `plantas`, `dispositivos`, `lecturas` (una por hora y dispositivo, con huecos) y `fallas`. Antes de cada falla, la temperatura y la vibración derivan durante unas 48 horas.

```bash
generar-datos iot --filas 6 --semilla 11
duckdb -c "SELECT estado, COUNT(*), ROUND(AVG(vibracion_mm_s),2) FROM '~/datos/generados/iot/lecturas.csv' GROUP BY estado"
```

## Arquitectura

```diagrama
titulo: Mantenimiento predictivo
nodo s: Lecturas horarias | icono=fabrica | col=0 | fila=0
nodo f: Features por ventana | icono=spark | col=1 | fila=0 | sub=media, desvío, tendencia\n6 h, 24 h
nodo l: Etiqueta | icono=etiqueta | col=1 | fila=1 | sub=¿falla en las\npróximas 24 h?
nodo m: Entrenamiento | icono=mlflow | col=2 | fila=0 | sub=MLflow: parámetros,\nmétricas, modelo
nodo r: Registro | icono=unity | col=3 | fila=0 | sub=modelo en Unity Catalog\nalias "campeon"
nodo p: Puntuación horaria | icono=reloj | col=3 | fila=1 | sub=Job cada hora
nodo a: Alertas a mantenimiento | icono=alerta | col=2 | fila=1 | color=rojo
flecha s -> f
flecha l -> m
flecha f -> m
flecha m -> r
flecha r -> p
flecha p -> a
```

## Fase 1: entender la serie (local, DuckDB)

1. **Huecos**: genera la serie esperada de horas por dispositivo y compárala con las lecturas. Un hueco de 18 horas en una máquina que después falla es información.
2. **Ciclo diario**: la temperatura sube de día. Sin quitar ese ciclo, el modelo confunde "son las 15:00" con "se va a romper".
3. **Deriva**: grafica vibración en las 72 horas previas a cada falla. Ese gráfico va al README.

## Fase 2: features y etiqueta sin fuga del futuro

```sql norun
CREATE TABLE features AS
SELECT dispositivo_id, ts,
       avg(temperatura_c)  OVER w6   AS temp_media_6h,
       stddev(vibracion_mm_s) OVER w6 AS vib_desvio_6h,
       avg(vibracion_mm_s) OVER w24  AS vib_media_24h,
       vibracion_mm_s - avg(vibracion_mm_s) OVER w24 AS vib_vs_24h
FROM lecturas
WINDOW w6  AS (PARTITION BY dispositivo_id ORDER BY ts RANGE BETWEEN INTERVAL 6 HOURS PRECEDING AND CURRENT ROW),
       w24 AS (PARTITION BY dispositivo_id ORDER BY ts RANGE BETWEEN INTERVAL 24 HOURS PRECEDING AND CURRENT ROW);

-- etiqueta: ¿hay una falla en las próximas 24 horas? (mira hacia adelante SOLO para la etiqueta)
CREATE TABLE dataset AS
SELECT f.*, EXISTS (SELECT 1 FROM fallas x WHERE x.dispositivo_id = f.dispositivo_id
                    AND x.ts_falla > f.ts AND x.ts_falla <= f.ts + INTERVAL 24 HOURS) AS falla_24h
FROM features f;
```

:::cuidado Las dos fugas más comunes
1. **Features que miran el futuro**: una ventana centrada o que incluye filas posteriores. Todas las features usan solo el pasado.
2. **Partición aleatoria**: mezclar horas de enero y diciembre en entrenamiento y prueba deja que el modelo "vea" el futuro. Se divide **por tiempo** (entrenar hasta octubre, probar noviembre y diciembre) o por dispositivo.
:::

## Fase 3: entrenar y registrar con MLflow

```python norun
import mlflow, mlflow.sklearn
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import average_precision_score, recall_score

mlflow.set_experiment("/Shared/mantenimiento")
with mlflow.start_run(run_name="hgb_v1"):
    modelo = HistGradientBoostingClassifier(max_depth=4, learning_rate=0.1)
    modelo.fit(X_train, y_train)
    prob = modelo.predict_proba(X_test)[:, 1]
    mlflow.log_params({"max_depth": 4, "ventanas": "6h,24h"})
    mlflow.log_metrics({"pr_auc": average_precision_score(y_test, prob),
                        "fallas_anticipadas": recall_score(y_test, prob > 0.5)})
    mlflow.sklearn.log_model(modelo, "modelo", registered_model_name="workspace.mantenimiento.falla_24h")
```

En Databricks, el modelo queda en Unity Catalog; el job horario carga la versión con alias `campeon`, puntúa la última hora y escribe en `predicciones`. En local, MLflow corre con `uv run mlflow ui` y guarda todo en una carpeta.

:::errores
- **Mezclar datos de entrenamiento y prueba en el tiempo**: con series de sensores, la prueba tiene que ser posterior al entrenamiento.
- **No registrar el experimento en MLflow**: después no sabes qué parámetros dieron el mejor modelo.
- **Features calculadas con datos del futuro** (la ventana incluye la falla que querés predecir).
- **Medir solo la exactitud** cuando las fallas son raras: un modelo que nunca predice falla tiene 99 % de exactitud.
:::

:::trabajo
- En mantenimiento predictivo el costo de una falla no detectada es mucho mayor que el de una inspección de más, así que el umbral del modelo se elige con el área de operaciones, no solo por métricas.
:::

:::entrevista "¿Qué métricas usarías para un modelo que predice fallas poco frecuentes?"
No la exactitud, porque con fallas raras engaña. Usaría precisión y recall, o el área bajo la curva de precisión y recall, y elegiría el umbral según el costo de cada error con el área de operaciones: una falla no detectada cuesta mucho más que una inspección innecesaria. Evaluaría con una partición temporal, entrenando con el pasado y probando con el futuro, y registraría todo en MLflow.
:::

## Entregables

- [ ] Análisis de la serie: huecos, ciclo diario y deriva antes de las fallas (con gráfico).
- [ ] Tabla de features documentada y explicación de cómo evitaste la fuga.
- [ ] Comparación de al menos dos modelos (o un modelo contra una regla simple) en MLflow.
- [ ] Métrica de negocio: fallas anticipadas y falsas alarmas por semana sobre el período de prueba.

## Práctica

:::ejercicio cli dificultad=Básico titulo="Los datos de los sensores"
Genera los datos del escenario `iot` con 6 dispositivos y semilla 11.
```respuesta
todos: generar-datos iot || --filas 6 || --semilla 11
```
```solucion
generar-datos iot --filas 6 --semilla 11
```
:::

:::ejercicio sql ordenado dificultad=Avanzado titulo="Media móvil de 3 horas"
Para el dispositivo `SN-0001`, calcula la media móvil de `vibracion` de las últimas 3 lecturas (la actual y las 2 anteriores), con 2 decimales. Devuelve `ts`, `vibracion` y `media_3`, ordenado por `ts`.
```sql setup
CREATE TABLE lecturas_iot (dispositivo_id TEXT, ts TEXT, temperatura REAL, vibracion REAL);
INSERT INTO lecturas_iot VALUES
('SN-0001', '2024-06-01 00:00', 61.2, 2.1), ('SN-0001', '2024-06-01 01:00', 60.8, 2.3), ('SN-0001', '2024-06-01 02:00', 61.5, 2.2),
('SN-0001', '2024-06-01 03:00', 63.9, 3.4), ('SN-0001', '2024-06-01 04:00', 66.1, 4.8), ('SN-0001', '2024-06-01 05:00', 70.4, 6.9),
('SN-0002', '2024-06-01 00:00', 58.0, 1.9), ('SN-0002', '2024-06-01 01:00', 58.4, 2.0);
```
```sql solucion
SELECT ts, vibracion,
       ROUND(AVG(vibracion) OVER (ORDER BY ts ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS media_3
FROM lecturas_iot
WHERE dispositivo_id = 'SN-0001'
ORDER BY ts;
```
```pista
`AVG(vibracion) OVER (ORDER BY ts ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)`.
```
:::

:::ejercicio sql ordenado dificultad=Experto titulo="La etiqueta sin fuga"
`fallas_iot(dispositivo_id, ts_falla)` tiene las fallas. Para cada lectura de `SN-0001`, calcula `falla_3h` = 1 si hay una falla del mismo dispositivo **después** de la lectura y **como máximo 3 horas después**; si no, 0. Devuelve `ts` y `falla_3h`, ordenado por `ts`.
```sql setup
CREATE TABLE lecturas_iot (dispositivo_id TEXT, ts TEXT, temperatura REAL, vibracion REAL);
INSERT INTO lecturas_iot VALUES
('SN-0001', '2024-06-01 00:00', 61.2, 2.1), ('SN-0001', '2024-06-01 01:00', 60.8, 2.3), ('SN-0001', '2024-06-01 02:00', 61.5, 2.2),
('SN-0001', '2024-06-01 03:00', 63.9, 3.4), ('SN-0001', '2024-06-01 04:00', 66.1, 4.8), ('SN-0001', '2024-06-01 05:00', 70.4, 6.9);
CREATE TABLE fallas_iot (dispositivo_id TEXT, ts_falla TEXT);
INSERT INTO fallas_iot VALUES ('SN-0001', '2024-06-01 05:30'), ('SN-0002', '2024-06-01 01:00');
```
```sql solucion
SELECT l.ts,
       CASE WHEN EXISTS (SELECT 1 FROM fallas_iot f WHERE f.dispositivo_id = l.dispositivo_id
                         AND f.ts_falla > l.ts AND f.ts_falla <= datetime(l.ts, '+3 hours')) THEN 1 ELSE 0 END AS falla_3h
FROM lecturas_iot l
WHERE l.dispositivo_id = 'SN-0001'
ORDER BY l.ts;
```
```pista
`EXISTS` con la condición `f.ts_falla > l.ts AND f.ts_falla <= datetime(l.ts, '+3 hours')`.
```
```explicacion
Las lecturas de las 03:00, 04:00 y 05:00 tienen etiqueta 1. La etiqueta mira hacia adelante (es lo que queremos predecir); las features nunca. Y la falla de `SN-0002` no se mezcla gracias a la condición por dispositivo.
```
:::

:::ejercicio quiz dificultad=Avanzado
Divides el dataset en entrenamiento y prueba con un `train_test_split` aleatorio y obtienes PR-AUC de 0,97. ¿Qué sospechas?

- [ ] Que el modelo es excelente y está listo
- [x] Fuga: lecturas de la misma falla (horas consecutivas, casi iguales) quedaron en entrenamiento y en prueba. Hay que dividir por tiempo o por dispositivo
- [ ] Que faltan más features
- [ ] Que hay que usar exactitud en lugar de PR-AUC
:::

:::ejercicio quiz dificultad=Intermedio
¿Qué guarda MLflow de cada entrenamiento?

- [ ] Solo el archivo del modelo
- [x] Parámetros, métricas, artefactos (como gráficos) y el modelo, para comparar corridas y reproducirlas
- [ ] Los datos de entrenamiento completos, siempre
- [ ] Solo el código fuente
:::

:::ejercicio quiz dificultad=Avanzado
La temperatura sube todos los días a las 15:00 por el calor ambiente. ¿Qué haces con eso?

- [ ] Nada: el modelo lo aprende solo
- [x] Usar features relativas (contra la media de 24 h o contra la misma hora de días anteriores) para que el modelo no confunda el ciclo diario con una falla
- [ ] Eliminar las lecturas de la tarde
- [ ] Convertir la temperatura a Fahrenheit
:::

## Para ir más lejos

- Monitoreo del modelo: distribución de las features por semana (deriva de datos) y fallas anticipadas reales contra las esperadas.
- Umbral elegido con el costo: una parada imprevista (12 h) contra una intervención innecesaria (2 h).
- Ingesta en streaming de las lecturas y puntuación cada 15 minutos.
