---
titulo: Assets - programar por datos en lugar de por hora
nivel: 4 · Intermedio-avanzado
duracion: 45
resumen: El reporte de ventas no debería correr "a las 7", sino "cuando las ventas estén listas". Con assets, ventas_diarias declara que produce la tabla gold/ventas_diarias y reporte_ventas se programa con ese asset. Ves el asset, el grafo con datos, la corrida disparada por el asset y su historia de eventos.
objetivos: Explicar qué es un asset y para qué sirve | Declarar outlets en la tarea productora | Programar un Dag con schedule=[Asset(...)] | Seguir eventos y corridas disparadas por assets
prerrequisitos: airflow-paso-a-paso-proyecto-ingesta-parametrizada
autoevaluacion: ¿Sabes qué es un asset? | ¿Sabes qué hace outlets? | ¿Sabes por qué es mejor que programar a una hora fija? | ¿Sabes qué tipo de corrida crea un asset?
---

:::escenario El problema
El reporte corría a las 07:00 "porque las ventas suelen estar a las 06:30". El día que la carga tardó una hora más, el reporte salió con los datos de ayer y nadie se dio cuenta.
:::

## Paso 1 — Qué es un asset

Un **asset** es un dato con nombre (una tabla, un archivo) identificado por una URI, por ejemplo `tienda://gold/ventas_diarias`. Una tarea declara que lo **produce**, y otro Dag se programa para correr cuando ese dato **se actualiza**.

```python norun
from airflow.sdk import Asset, dag, task

VENTAS = Asset("tienda://gold/ventas_diarias")

# en ventas_diarias: la tarea que escribe la tabla
@task(outlets=[VENTAS])
def publicar(pedidos):
    ...

# reporte_ventas: corre cuando VENTAS se actualiza
@dag(schedule=[VENTAS], start_date=datetime(2026, 1, 1), catchup=False)
def reporte_ventas():
    ...
```

:::nota Si vienes de Airflow 2
En Airflow 2 se llamaban **Datasets** (`from airflow.datasets import Dataset`). En Airflow 3 son **Assets** y se importan de `airflow.sdk`.
:::

## Paso 2 — La página Assets

```captura
archivo: airflow/a13-assets.webp
texto: Assets - tienda://gold/ventas_diarias, producido por ventas_diarias.publicar y esperado por reporte_ventas
```

## Paso 3 — El grafo con datos

En `ventas_diarias` → **Graph → Tasks and assets**:

```captura
archivo: airflow/a13-graph.webp
texto: extraer → limpiar → publicar → el asset tienda://gold/ventas_diarias
```

## Paso 4 — Que se dispare solo

`reporte_ventas` está pausado. Actívalo:

```captura
archivo: airflow/a13-despausar.webp
texto: reporte_ventas activo - Schedule Asset y "0 of 1 assets updated" en Next Run
```

Ahora dispara `ventas_diarias`. Cuando `publicar` termina bien, registra un evento del asset y el scheduler crea una corrida de `reporte_ventas`:

```captura
archivo: airflow/a13-run-asset.webp
texto: La corrida asset_triggered de reporte_ventas (1) en la grilla (2)
```

## Paso 5 — La historia del asset

Abre el asset:

```captura
archivo: airflow/a13-asset.webp
texto: Quién lo produce y quién lo espera (1) y cada evento con la tarea que lo generó y la corrida que disparó (2)
```

| Programar por hora | Programar por asset |
|---|---|
| Corre aunque los datos no estén | Corre **cuando** los datos están |
| Si la carga se atrasa, el reporte sale con datos viejos | Si la carga se atrasa, el reporte espera |
| Las dependencias entre Dags quedan en la cabeza del equipo | Quedan declaradas y visibles en Assets |

:::tip Varios assets
`schedule=[A, B]` corre cuando **los dos** se actualizaron. También existen `AssetAll` y `AssetAny` para combinar condiciones ("cuando se actualice A o B").
:::

## ✅ Lo que lograste

- Entiendes qué es un asset.
- Conectaste un Dag productor con uno consumidor.
- Seguiste el evento y la corrida que disparó.

:::ejercicio quiz
¿Qué declara `@task(outlets=[VENTAS])`?
- [ ] Que la tarea lee VENTAS
- [x] Que la tarea produce (actualiza) el asset VENTAS
- [ ] Que la tarea borra VENTAS
- [ ] Que la tarea es opcional
:::

:::ejercicio quiz
¿Cuándo corre un Dag con `schedule=[VENTAS]`?
- [ ] Todos los días a las 00:00
- [x] Cuando una tarea productora actualiza VENTAS
- [ ] Nunca
- [ ] Cada hora
:::

:::ejercicio quiz
¿Qué tipo de corrida crea un asset?
- [ ] manual
- [ ] scheduled
- [x] asset_triggered
- [ ] backfill
:::

:::ejercicio quiz
¿Cómo se llamaban los assets en Airflow 2?
- [x] Datasets
- [ ] Tables
- [ ] Sensors
- [ ] Pools
:::
