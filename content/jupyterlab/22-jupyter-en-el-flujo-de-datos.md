---
titulo: Jupyter en el flujo de datos - del notebook al pipeline, la automatización y otras plataformas
nivel: 6 · Avanzado completo
duracion: 45
resumen: En un equipo de datos, el notebook es donde se explora y se prototipa; lo que se repite todos los días vive en otro lado. Cuándo un notebook está bien y cuándo hay que convertirlo, cómo ejecutar notebooks con parámetros de forma automática (papermill, nbconvert), cómo pasar la lógica a scripts y pipelines, y cómo se usan los notebooks en Databricks, Fabric, Colab y VS Code.
objetivos: Decidir cuándo un análisis debe dejar de ser un notebook | Ejecutar notebooks de forma automática con parámetros | Convertir notebooks a scripts, HTML o PDF | Llevar la lógica de un notebook a un pipeline | Reconocer las diferencias de los notebooks en Databricks, Fabric, Colab y VS Code
prerrequisitos: jupyterlab-notebook-profesional
autoevaluacion: ¿Sabes cuándo un notebook ya no alcanza? | ¿Sabes qué hace papermill? | ¿Sabes exportar un notebook a HTML para alguien sin Jupyter? | ¿Sabes qué cambia en un notebook de Databricks?
---

:::analogia En palabras simples
El notebook es la mesa de trabajo del taller: ahí pruebas, ajustas y entiendes. Cuando algo tiene que fabricarse todos los días igual, se lleva a la línea de producción (un script o un pipeline programado). Sacar algo de la mesa no es abandonarla: es el siguiente paso.
:::

## Paso 1 — Cuándo un notebook está bien y cuándo no

| Está bien en un notebook | Mejor como script o pipeline |
|---|---|
| Explorar un dataset nuevo | Un proceso que corre todos los días |
| Un análisis puntual con su informe | Una carga que alimenta un tablero |
| Prototipar una limpieza | Lógica que usan varios equipos |
| Enseñar o documentar un resultado | Algo que necesita pruebas, revisión de código y alertas si falla |

Señales de que llegó el momento: lo ejecutas a mano todos los lunes, alguien te pide "que corra solo", o el notebook pasó las 100 celdas.

## Paso 2 — Ejecutar notebooks con parámetros (papermill)

El patrón de la celda de parámetros (proyectos 3, 4 y 5) existe por esto. En Jupyter real, marcas esa celda con la etiqueta `parameters` y **papermill** ejecuta el notebook con otros valores:

```text
papermill reporte.ipynb salidas/reporte_2025.ipynb -p ANIO 2025
```

El resultado es un notebook nuevo, ejecutado, con las salidas de 2025. Un programador de tareas (cron, Airflow, Azure Data Factory) puede lanzarlo todos los meses.

## Paso 3 — Convertir notebooks (nbconvert)

| Comando (Jupyter real) | Produce | Para |
|---|---|---|
| `jupyter nbconvert --to html reporte.ipynb` | Una página HTML con texto, código y gráficos | Mandarlo a alguien que no tiene Jupyter |
| `jupyter nbconvert --to html --no-input reporte.ipynb` | El HTML **sin el código** | Un informe para negocio |
| `jupyter nbconvert --to script reporte.ipynb` | Un `.py` con todo el código | Empezar a llevarlo a un script |
| `jupyter nbconvert --to notebook --execute reporte.ipynb` | El notebook ejecutado de punta a punta | Comprobar que corre |

En JupyterLab también está en **File → Save and Export Notebook As…**. En esta práctica, **File → Download** descarga el `.ipynb`.

## Paso 4 — Del notebook al pipeline

El camino habitual, que ya empezaste en los niveles 4 y 5:

1. **Notebook de exploración**: entiendes los datos y decides la lógica.
2. **Funciones en un `.py`**, probadas (lección 18).
3. **Un script** que llama a esas funciones de principio a fin (`python limpiar_clientes.py`).
4. **Un pipeline** que ejecuta el script o el notebook en un horario, con reintentos y alertas: Airflow, Data Factory, Databricks Jobs, Fabric.

Puedes ver ese último paso en las réplicas de [Airflow](#/airflow), [Data Factory](#/azure/servicio/adf) y [Databricks](#/databricks) del curso.

## Paso 5 — Los notebooks en otras plataformas

| Plataforma | Qué cambia respecto de JupyterLab |
|---|---|
| **Databricks** | El kernel es un clúster de Spark; celdas en Python, SQL, Scala o R (`%sql`, `%python`); **widgets** para parámetros; se programan como **Jobs**; tablas en Unity Catalog en lugar de CSV locales |
| **Microsoft Fabric** | Notebooks sobre Spark conectados a un Lakehouse; se orquestan desde Data Pipelines |
| **Google Colab** | Jupyter en la nube de Google, gratis con límites; se guarda en Drive; ideal para practicar |
| **VS Code** | Abre `.ipynb` con su propio editor: depurador, Git integrado y el mismo kernel de Jupyter |
| **JupyterHub** | JupyterLab compartido por un equipo, cada uno con su espacio, en un servidor de la empresa |

Lo que aprendiste (celdas, kernel, Markdown, reproducibilidad, parámetros) es igual en todas.

## Paso 6 — De pandas a Spark

En Databricks y Fabric los datos suelen ser demasiado grandes para pandas, y se usa PySpark con la misma lógica:

| pandas | PySpark |
|---|---|
| `df[df["estado"] == "entregado"]` | `df.filter(df.estado == "entregado")` |
| `df.groupby("canal").size()` | `df.groupBy("canal").count()` |
| `a.merge(b, on="id", how="left")` | `a.join(b, on="id", how="left")` |
| `df["x"] = df["a"] * df["b"]` | `df = df.withColumn("x", df.a * df.b)` |

Si quieres seguir por ese camino, el módulo [PySpark](#/m/pyspark) parte de lo que ya sabes de pandas.

## ✅ Lo que lograste

- Sabes cuándo un notebook debe convertirse en script o pipeline.
- Conoces papermill y nbconvert para automatizar y compartir.
- Reconoces cómo cambian los notebooks en Databricks, Fabric, Colab y VS Code.

:::ejercicio quiz
Ejecutas el mismo notebook a mano todos los lunes para actualizar un tablero. ¿Qué conviene?
- [ ] Seguir así, es lo normal
- [x] Parametrizarlo y programarlo (papermill + un orquestador) o llevar la lógica a un script en un pipeline
- [ ] Copiarlo cada semana con otro nombre
- [ ] Mandar el notebook por mail
:::

:::ejercicio quiz
Necesitas mandar el resultado a alguien de negocio que no tiene Jupyter y no quiere ver código. ¿Qué haces?
- [ ] Le mando el .ipynb
- [x] Exporto a HTML sin el código (nbconvert --no-input)
- [ ] Le mando capturas de cada celda
- [ ] Le instalo Jupyter
:::

:::ejercicio quiz
¿Qué cumple el papel de la celda de parámetros en un notebook de Databricks?
- [ ] Los magics %sql
- [x] Los widgets
- [ ] Unity Catalog
- [ ] El clúster
:::
