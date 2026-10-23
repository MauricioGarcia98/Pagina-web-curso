---
titulo: Bienvenida: qué es la ingeniería de datos
nivel: Básico
duracion: 15
resumen: Qué hace un ingeniero de datos, qué vas a aprender y cómo usar este sitio.
---

¡Hola! Si llegaste hasta aquí sin saber nada de programación ni de datos, **este es exactamente tu lugar**. Vamos a ir paso a paso, sin dar nada por sabido.

## ¿Qué es un dato?

Un **dato** es cualquier hecho registrado: el precio de un producto, la fecha de una compra, el país de un cliente, un clic en una página web. Uno solo no dice mucho; millones de datos juntos y bien organizados permiten responder preguntas como:

- ¿Qué producto vendemos más en diciembre?
- ¿Qué clientes dejaron de comprar?
- ¿Cuánto vamos a vender el mes que viene?

## ¿Qué hace un ingeniero o ingeniera de datos?

:::analogia Una analogía: el agua potable
Piensa en el agua de tu casa. Nace en un río (sucia, lejos, desordenada). Alguien construyó **tuberías** para traerla, **plantas de tratamiento** para limpiarla y **tanques** para almacenarla. Tú solo abres el grifo.

La ingeniería de datos es lo mismo, pero con datos: construye las tuberías (*pipelines*) que llevan los datos desde donde nacen (apps, sistemas de ventas, sensores) hasta donde se usan (reportes, tableros, modelos de inteligencia artificial), limpiándolos en el camino.
:::

Un pipeline típico tiene tres pasos que vas a escuchar todo el tiempo:

| Paso | En inglés | Qué significa | Ejemplo |
|---|---|---|---|
| Extraer | **E**xtract | Sacar los datos de su origen | Descargar las ventas del sistema de la tienda |
| Transformar | **T**ransform | Limpiarlos, unirlos, calcular cosas | Quitar duplicados, calcular el total por día |
| Cargar | **L**oad | Guardarlos donde se van a usar | Escribir la tabla final en el *data warehouse* |

Según el orden se habla de **ETL** (transformar antes de cargar) o **ELT** (cargar crudo y transformar dentro del almacén, que es lo más común hoy con herramientas como dbt y Databricks).

## Las herramientas de este curso (y para qué sirve cada una)

| Herramienta | Para qué sirve | Analogía |
|---|---|---|
| **SQL** | Preguntarle cosas a una base de datos | El idioma para hablar con los datos |
| **Python** | Programar y automatizar cualquier tarea | La navaja suiza |
| **Spark / PySpark** | Procesar volúmenes gigantes repartiendo el trabajo entre muchas computadoras | Un ejército de cocineros en vez de uno solo |
| **Databricks** | Plataforma en la nube donde corre Spark, con notebooks y tablas Delta | La cocina industrial ya equipada |
| **dbt** | Organizar las transformaciones SQL como un proyecto con tests y documentación | Un recetario ordenado y verificado |
| **Airflow** | Programar y coordinar cuándo corre cada paso del pipeline | El director de orquesta |
| **Azure CLI / Databricks CLI** | Controlar la nube desde la terminal | El control remoto |

## Cómo usar este sitio

1. **Lee la lección.** Están escritas para alguien que empieza de cero.
2. **Prueba los ejemplos.** Los bloques de código con el botón **▶ Probar** se ejecutan aquí mismo. ¡Modifícalos!
3. **Resuelve los ejercicios.** Escribe tu código y presiona **✓ Comprobar**. El sitio te dice si está bien y, si no, por qué.
4. **Usa las pistas** (💡) cuando te trabes. Ver la solución (👁) está permitido, pero intenta primero.
5. Tu progreso se guarda **en este navegador**. Puedes exportarlo desde “Mi progreso”.

:::tip Atajos de teclado
- <kbd>Ctrl</kbd> + <kbd>Enter</kbd>: ejecutar el código del editor.
- <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Enter</kbd>: comprobar el ejercicio.
- <kbd>Ctrl</kbd> + <kbd>Espacio</kbd>: autocompletar nombres de tablas y columnas en SQL.
- <kbd>/</kbd>: buscar en todo el curso.
:::

## Tu primer contacto con código

Este bloque es SQL. Presiona **▶ Probar** y mira lo que aparece: son los primeros 5 productos de nuestra tienda ficticia.

```sql
SELECT nombre, marca, precio
FROM productos
LIMIT 5;
```

Todavía no hace falta entenderlo. En unas lecciones vas a poder escribir esto (y cosas mucho más potentes) tú solo.

:::ejercicio quiz
¿Qué significa la **T** en ETL?

- [ ] Tabla
- [x] Transformar (limpiar, unir y calcular)
- [ ] Terminal
- [ ] Tiempo real
```explicacion
ETL = **E**xtraer, **T**ransformar, **L**oad (cargar). Transformar es limpiar, combinar y calcular sobre los datos.
```
:::

:::ejercicio quiz
Necesitas que un pipeline corra **todos los días a las 6 de la mañana** y que, si falla un paso, se reintente. ¿Qué herramienta del curso se encarga de eso?

- [ ] SQL
- [ ] dbt
- [x] Airflow
- [ ] Azure CLI
```explicacion
Airflow es un **orquestador**: decide cuándo corre cada tarea, en qué orden, y qué hacer si falla.
```
:::
