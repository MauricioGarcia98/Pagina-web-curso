---
titulo: MLflow - experimentos, corridas, comparación y registro de modelos
nivel: 6 · Avanzado completo
duracion: 50
resumen: Cuando el equipo entrena modelos, Databricks guarda cada intento con MLflow - qué parámetros se probaron, qué métricas dieron y el modelo resultante. Correr el notebook de ejemplo, leer el experimento y sus corridas, compararlas, registrar el mejor modelo en Unity Catalog con versiones y alias, y usarlo desde cualquier notebook por su alias. Lo mínimo que un ingeniero de datos necesita para trabajar con un equipo de ciencia de datos.
objetivos: Explicar experimento, corrida, parámetro, métrica y artefacto | Leer y comparar corridas en Experiments | Registrar un modelo en Unity Catalog con versiones | Usar alias (champion) para separar entrenar de usar | Cargar un modelo por alias desde un notebook
prerrequisitos: databricks-paso-a-paso-proyecto-analitica-gobernada
autoevaluacion: ¿Sabes qué guarda una corrida? | ¿Sabes qué es el alias champion? | ¿Sabes cómo carga un notebook el modelo en producción? | ¿Sabes dónde vive un modelo registrado?
---

:::analogia En palabras simples
Entrenar modelos es cocinar probando recetas: un poco más de sal, menos tiempo de horno. MLflow es el cuaderno donde queda anotado cada intento (ingredientes = parámetros, puntaje = métricas, el plato = el modelo). El **registro de modelos** es la vitrina donde se expone la receta ganadora con su etiqueta: *champion*.
:::

## Paso 1 — Los conceptos

| Término | Qué es |
|---|---|
| **Experimento** | Una carpeta de intentos para un mismo problema (`precio-envios`) |
| **Corrida** (*run*) | Un intento: una ejecución del entrenamiento |
| **Parámetros** | Lo que decidiste probar (`base=3`, `tasa=2.0`) |
| **Métricas** | Cómo salió (`mae=0.12`) |
| **Artefactos** | Lo que produjo: el modelo, gráficos, archivos |
| **Modelo registrado** | Un modelo con nombre de tres partes en Unity Catalog (`main.default.precio_envio`) y **versiones** |
| **Alias** | Una etiqueta movible sobre una versión: `@champion` (la que se usa), `@challenger` (la candidata) |

## Paso 2 — Correr el ejemplo

Menú **AI/ML → Experiments**:

```captura
archivo: databricks/d21-experimentos.webp
texto: Experiments - el botón crea un notebook de ejemplo listo para correr
```

El notebook entrena tres versiones de un modelo mínimo (costo de envío = base + tasa × peso) y registra cada una:

```python norun
import mlflow
mlflow.set_experiment("/Users/alumno@academia.dev/precio-envios")

for base, tasa in [(3, 2.0), (3.5, 1.9), (4, 1.6)]:
    with mlflow.start_run(run_name=f"base={base} tasa={tasa}"):
        modelo = ModeloEnvio(base, tasa)
        mae = ...  # error promedio sobre los datos conocidos
        mlflow.log_params({"base": base, "tasa": tasa})
        mlflow.log_metric("mae", mae)
        mlflow.sklearn.log_model(modelo, "model", registered_model_name="main.default.precio_envio")
```

```captura
archivo: databricks/d21-notebook.webp
texto: Cada corrida imprime sus parámetros y su MAE; MLflow las guarda
```

`with mlflow.start_run()` abre la corrida; dentro, `log_params`, `log_metric` y `log_model` la llenan; al salir del `with`, se cierra.

## Paso 3 — Leer y comparar

```captura
archivo: databricks/d21-runs.webp
texto: El experimento con sus tres corridas (1) - parámetros y métrica en columnas; Compare selected (2)
```

```captura
archivo: databricks/d21-comparar.webp
texto: La comparación - base=3 tasa=2.0 tiene el menor error (MAE 0.12)
```

Una tabla donde cada fila es un intento y cada columna un parámetro o métrica: así se decide con datos cuál modelo gana, y así se puede volver a ver dentro de seis meses por qué se eligió.

## Paso 4 — El registro de modelos

Menú **AI/ML → Models**:

```captura
archivo: databricks/d21-modelos.webp
texto: Los modelos registrados en Unity Catalog, con versiones y alias
```

```captura
archivo: databricks/d21-modelo.webp
texto: main.default.precio_envio - una versión por corrida que lo registró (1) y Set alias (2) para marcar la que se usa
```

Cada `log_model` con `registered_model_name` creó una **versión** (1, 2, 3). Pon el alias `champion` a la versión con menor MAE. El modelo vive en Unity Catalog: con los mismos permisos, linaje y nombre de tres partes que una tabla.

## Paso 5 — Usar el modelo por alias

```python norun
import mlflow
modelo = mlflow.pyfunc.load_model("models:/main.default.precio_envio@champion")
modelo.predict([4, 10])
```

El notebook que predice no sabe qué versión usa: pide `@champion`. Cuando el equipo entrena una versión mejor, mueve el alias y el pipeline de predicción cambia de modelo **sin tocar código**. Esa separación entre entrenar y usar es lo que hace mantenible un sistema de ML.

## Paso 6 — Lo que sigue (en Databricks real)

| Pieza | Para |
|---|---|
| **Model Serving** | Exponer el modelo como API para que una aplicación lo llame en tiempo real |
| **Feature Store** (*Features*) | Compartir variables calculadas (features) entre modelos y evitar que entrenamiento y producción las calculen distinto |
| **AutoML** | Un primer modelo automático con el notebook generado para seguir desde ahí |
| **Playground / Agents / AI Gateway** | Modelos de lenguaje, agentes y su gobierno |

Como ingeniero de datos, tu parte suele ser: tablas gold limpias y a tiempo para entrenar, un job que ejecute el entrenamiento y otro que aplique `@champion` a los datos nuevos.

## ✅ Lo que lograste

- Entiendes experimento, corrida, parámetros, métricas y modelo registrado.
- Comparaste corridas y registraste un modelo con alias.
- Sabes cargar un modelo por alias y por qué eso importa.

:::ejercicio quiz
¿Qué guarda una corrida de MLflow?
- [ ] Solo el modelo
- [x] Parámetros, métricas, artefactos (el modelo) y metadatos del intento
- [ ] Solo las métricas
- [ ] La tabla de entrenamiento
:::

:::ejercicio quiz
El equipo entrenó una versión 4 mejor que la 3. ¿Qué cambian para que producción la use?
- [ ] El código del notebook de predicción
- [x] El alias champion, que pasa de la versión 3 a la 4
- [ ] El nombre del modelo
- [ ] El catálogo
:::

:::ejercicio quiz
¿Dónde vive un modelo registrado?
- [ ] En el notebook
- [x] En Unity Catalog, con nombre de tres partes, versiones y permisos
- [ ] En un volumen
- [ ] En el cluster
:::
