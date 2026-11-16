---
titulo: Capacidad, transferencias y lo que hay más allá del SQL
nivel: 6 · Avanzado completo
duracion: 40
resumen: El panorama de la plataforma - slots y ediciones (el modelo de capacidad), Data Transfer Service, BigQuery ML para entrenar modelos con SQL, BI Engine para tableros rápidos, vistas materializadas, búsqueda y las funciones de IA, con el SQL de cada uno y cuándo conviene.
objetivos: Entender slots, ediciones y reservas | Ubicar Data Transfer Service | Entrenar un modelo con BigQuery ML | Conocer BI Engine, vistas materializadas y las funciones de IA
prerrequisitos: bigquery-paso-a-paso-buenas-practicas
autoevaluacion: ¿Sabes qué es un slot? | ¿Sabes cuándo conviene el modelo de capacidad? | ¿Sabes entrenar un modelo con CREATE MODEL? | ¿Sabes para qué sirve BI Engine?
---

:::nota En la práctica
Estas secciones no están simuladas: la práctica te muestra qué son. El SQL es el de BigQuery real (BigQuery ML también se puede probar con `bq query` en la [terminal del curso](#/lab/terminal)).
:::

:::analogia Pagar por kilo o contratar una cuadrilla
Un slot es un trabajador que procesa parte de la consulta. En on-demand pagas por kilo procesado (los bytes), sin importar cuántos trabajadores se usaron. En el modelo de capacidad contratas una cuadrilla por hora: conviene cuando tienes trabajo grande y constante.
:::

## Paso 1 — Slots y ediciones

```captura
archivo: bigquery/q22-capacidad.webp
texto: Capacity management - reservas de slots con las ediciones Standard, Enterprise y Enterprise Plus
```

Un **slot** es una unidad de cómputo virtual: una consulta usa muchos slots en paralelo durante unos segundos.

| Modelo | Se paga | Conviene |
|---|---|---|
| **On-demand** | Bytes procesados | Uso variable o chico; empezar |
| **Capacidad (ediciones)** | Slots por hora, con autoescalado y compromisos de 1 o 3 años | Volumen grande y estable; costo predecible |

Las ediciones (Standard, Enterprise, Enterprise Plus) se diferencian en funciones de seguridad, gobierno y disponibilidad.

## Paso 2 — Data Transfer Service

```captura
archivo: bigquery/q22-transferencias.webp
texto: Data transfers - copias programadas desde Google Ads, YouTube, Cloud Storage, Amazon S3 y otras fuentes
```

## Paso 3 — BigQuery ML

```sql norun
-- ¿qué clientes van a volver a comprar? un modelo con SQL
CREATE OR REPLACE MODEL analitica.modelo_recompra
OPTIONS (model_type = 'logistic_reg', input_label_cols = ['volvio']) AS
SELECT pais, segmento, pedidos_previos, dias_desde_ultimo, volvio
FROM analitica.entrenamiento_clientes;

SELECT * FROM ML.EVALUATE(MODEL analitica.modelo_recompra);
SELECT cliente_id, predicted_volvio_probs
FROM ML.PREDICT(MODEL analitica.modelo_recompra, TABLE analitica.clientes_actuales);
```

Entrenar y predecir sin sacar los datos de BigQuery: regresión, clasificación, series de tiempo (`ARIMA_PLUS`), k-means y modelos remotos de Vertex AI.

## Paso 4 — Más piezas

| Pieza | Para |
|---|---|
| **BI Engine** | Una caché en memoria que acelera tableros (Looker Studio, Looker, Power BI) |
| **Vistas materializadas** | Agregados precalculados y mantenidos al día |
| **Search indexes** | Búsquedas de texto en tablas enormes (`SEARCH(...)`) |
| **Funciones de IA** | Resumir, clasificar o generar texto desde SQL con modelos de Vertex AI |
| **BigLake** | Consultar archivos abiertos (Parquet, Iceberg) en Cloud Storage con la misma seguridad |

:::errores
- **Pasar a capacidad sin medir.** Con pocas consultas, el modelo on-demand suele ser más barato; mira antes `INFORMATION_SCHEMA.JOBS`.
- **Usar un modelo de BigQuery ML sin evaluarlo.** `ML.EVALUATE` sobre datos que el modelo no vio dice si sirve.
- **Esperar que BI Engine arregle un mal diseño.** Acelera tableros, pero una tabla sin partición sigue leyendo de más.
:::

## ✅ Lo que lograste

- Entiendes slots y ediciones.
- Conoces Data Transfer Service y BigQuery ML.
- Ubicas las demás piezas de la plataforma.

:::ejercicio quiz
¿Qué es un slot en BigQuery?
- [x] Una unidad de cómputo virtual que ejecuta parte de una consulta
- [ ] Un dataset
- [ ] Una partición
- [ ] Una conexión abierta a la consola
:::

:::ejercicio quiz
¿Cuándo conviene el modelo de capacidad (ediciones)?
- [ ] Con dos consultas por semana
- [x] Con volumen grande y estable, buscando un costo predecible
- [ ] Con picos esporádicos y poco volumen
- [ ] Solo para cargas
:::

:::ejercicio quiz
¿Qué sentencia entrena un modelo en BigQuery ML?
- [ ] TRAIN TABLE
- [x] CREATE MODEL ... OPTIONS (model_type = ...) AS SELECT ...
- [ ] ML.FIT()
- [ ] No se puede con SQL
:::

:::ejercicio quiz
¿Para qué sirve BI Engine?
- [ ] Para cargar archivos
- [x] Para acelerar tableros con una caché en memoria
- [ ] Para dar permisos
- [ ] Para guardar copias de las tablas por 7 días
:::
