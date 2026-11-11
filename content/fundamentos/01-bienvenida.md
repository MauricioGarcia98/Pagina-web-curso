---
titulo: Bienvenida: qué es la ingeniería de datos
nivel: Básico
duracion: 25
resumen: Qué hace un ingeniero de datos, qué vas a aprender y cómo usar este sitio.
objetivos: Explicar con tus palabras qué hace un ingeniero o ingeniera de datos y en qué se diferencia de un analista o un científico de datos | Describir las etapas de un pipeline (extraer, transformar, cargar) con un ejemplo | Ubicar cada herramienta del curso en el recorrido de un dato | Usar el sitio: ejecutar ejemplos, comprobar ejercicios y abrir la terminal
autoevaluacion: ¿Puedes contarle a alguien que no sabe nada qué hace un data engineer, usando el ejemplo de una compra? | ¿Sabes qué diferencia hay entre ETL y ELT y cuál es más común hoy? | ¿Sabes cuándo conviene batch y cuándo streaming? | ¿Puedes nombrar para qué sirve SQL, Spark, dbt y Airflow en una frase cada uno? | ¿Ejecutaste el ejemplo de SQL de esta lección y cambiaste el número del LIMIT?
---

:::nota Cómo está pensado este curso
**Primero aprendes, después trabajas.** Cada lección empieza explicando el tema desde cero, con ejemplos simples y práctica, como en una clase. Nadie espera que ya sepas algo.

Recién **al final** de cada lección vas a encontrar un **caso real**: un pedido como los que te harían en una empresa, para que veas dónde se usa lo que acabas de aprender. La empresa de los ejemplos se llama **Tienda Andina**, un comercio en línea de tecnología que vende en Latinoamérica y España.

Cuando termines las etapas de aprendizaje llega la parte de **💼 Trabajo real**: casos de negocio completos, incidentes de guardia, proyectos de portafolio y una semana simulada en tu primer empleo.
:::
¡Hola! Si llegaste hasta aquí sin saber nada de programación ni de datos, **este es exactamente tu lugar**. Vamos a ir paso a paso, sin dar nada por sabido. Al terminar el curso vas a poder hacer el trabajo diario de un ingeniero o ingeniera de datos: juntar los datos que una empresa tiene desparramados, limpiarlos, ordenarlos y dejarlos listos para que otros tomen decisiones con ellos.

En esta lección vas a ver algunos nombres de herramientas (SQL, Spark, Airflow…). **No tienes que recordarlos ahora**: cada uno tiene su propia etapa más adelante, y los términos subrayados muestran una explicación si pasas el mouse por encima (o los tocas en el celular).

:::nota ¿Nunca programaste ni usaste una terminal?
Si palabras como *carpeta*, *ruta*, *extensión* o *error* te suenan lejanas, haz primero la etapa **🌱 Antes de empezar**: seis lecciones cortas sobre cómo funciona tu computadora, cómo leer un error, la matemática justa, el inglés técnico mínimo, cómo estudiar y qué es una API. [Ir a la primera lección →](#/l/cero-tu-computadora)
:::

## ¿Qué es un dato?

Un **dato** es cualquier hecho registrado: el precio de un producto, la fecha de una compra, el país de un cliente, un clic en una página web. Uno solo no dice mucho; millones de datos juntos y bien organizados permiten responder preguntas como:

- ¿Qué producto vendemos más en diciembre?
- ¿Qué clientes dejaron de comprar?
- ¿Cuánto vamos a vender el mes que viene?

El problema es que esos datos casi nunca están listos para responder nada. Están **repartidos** en muchos sistemas (la tienda online, la app, el sistema de pagos, el CRM), **sucios** (emails con mayúsculas y espacios, fechas en tres formatos, clientes duplicados) y **cambian todo el tiempo** (llegan miles de pedidos nuevos cada hora). Resolver eso es el trabajo de la ingeniería de datos.

## ¿Qué hace un ingeniero o ingeniera de datos?

:::analogia Una analogía: el agua potable
Piensa en el agua de tu casa. Nace en un río (sucia, lejos, desordenada). Alguien construyó **tuberías** para traerla, **plantas de tratamiento** para limpiarla y **tanques** para almacenarla. Tú solo abres el grifo.

La ingeniería de datos es lo mismo, pero con datos: construye las tuberías (*pipelines*) que llevan los datos desde donde nacen (apps, sistemas de ventas, sensores) hasta donde se usan (reportes, tableros, modelos de inteligencia artificial), limpiándolos en el camino.
:::

### El viaje de una compra

Para que se vea concreto, sigamos una sola compra en **Tienda Andina**, la empresa ficticia que usamos en todo el curso:

1. **10:22 de la mañana.** Lucía compra unos auriculares en la app. La app guarda el pedido en su base de datos, que está pensada para registrar ventas rápido, no para analizarlas.
2. **3:00 de la madrugada.** Un programa que arranca solo, todas las noches, copia los pedidos del día a un gran depósito de archivos en la nube. Esa primera parada guarda los datos **tal como llegaron**, con errores y todo (por si hay que volver a mirarlos).
3. **3:15.** Otro programa **limpia** esos pedidos: convierte el total de texto a número, pone los emails en minúsculas, elimina los pedidos repetidos.
4. **3:40.** Un tercer paso **cruza** pedidos con clientes y productos y calcula las ventas por día, país y categoría. Antes de publicar, revisa que no haya totales negativos ni días vacíos.
5. **8:00.** La gerente comercial abre su tablero y ve que ayer se vendieron 1.284 pedidos en Chile. No sabe que todo eso pasó, y **así tiene que ser**: si todo funciona, nadie lo nota.

Esa cadena de pasos automáticos se llama **pipeline** (tubería). Cada paso tiene una herramienta que lo hace bien, y las vas a aprender en orden:

| Paso | En palabras simples | Nombre técnico | Herramienta (y en qué etapa la ves) |
|---|---|---|---|
| Arrancar todo a las 3:00, en orden | El despertador del pipeline | Orquestación | Airflow (etapa 4) |
| Guardar lo que llegó, tal cual | El depósito de entrada | Capa *bronze* de un *data lake* | S3, ADLS o Cloud Storage (etapa 5) |
| Limpiar | La planta de tratamiento | Capa *silver* | SQL (etapa 2), Python y Spark (etapa 3) |
| Cruzar y calcular | La cocina | Capa *gold* | SQL y dbt (etapas 2 y 4) |
| Mostrar | El grifo | Tablero (*dashboard*) | Power BI, Looker, Tableau |

```diagrama
titulo: El recorrido de una compra en Tienda Andina, de la app al tablero de la gerente
nodo app: App y web | icono=movil | col=0 | fila=0 | sub=10:22 Lucía compra
nodo oltp: Base de la app | icono=base | col=1 | fila=0 | forma=cilindro | sub=OLTP · PostgreSQL
nodo orq: Airflow | icono=orquestador | col=2 | fila=0 | color=violeta | sub=arranca a las 3:00
nodo bronze: Bronze | icono=bucket | col=0 | fila=1 | color=naranja | sub=datos crudos
nodo silver: Silver | icono=spark | col=1 | fila=1 | color=gris | sub=limpios con Spark
nodo gold: Gold | icono=transformar | col=2 | fila=1 | color=amarillo | sub=métricas con dbt
nodo bi: Tablero | icono=dashboard | col=3 | fila=1 | color=verde | sub=8:00 la gerente
grupo lake: Data lake en la nube | nodos=bronze,silver,gold | color=azul
flecha app -> oltp: guarda
flecha oltp -> bronze: copia nocturna
flecha bronze -> silver: limpia
flecha silver -> gold: calcula
flecha gold -> bi: consulta
flecha orq -> silver: orquesta | estilo=punteada | color=violeta
```

:::tip Lo vas a ver en movimiento
En la lección siguiente, **El viaje de una compra**, sigues una compra real paso a paso con un recorrido animado que muestra cómo se ve el dato en cada estación, y después lo compruebas con SQL.
:::

Un ingeniero o ingeniera de datos diseña, construye y mantiene ese recorrido. Un día normal puede incluir conectar una fuente nueva (la API de un proveedor), escribir una transformación en SQL o PySpark, revisar por qué el job de anoche falló, optimizar una consulta que tardaba una hora o agregar un test de calidad.

### ETL y ELT

Un pipeline típico tiene tres pasos que vas a escuchar todo el tiempo:

| Paso | En inglés | Qué significa | Ejemplo |
|---|---|---|---|
| Extraer | **E**xtract | Sacar los datos de su origen | Descargar las ventas del sistema de la tienda |
| Transformar | **T**ransform | Limpiarlos, unirlos, calcular cosas | Quitar duplicados, calcular el total por día |
| Cargar | **L**oad | Guardarlos donde se van a usar | Escribir la tabla final en el *data warehouse* |

Según el orden se habla de **ETL** (transformar antes de cargar) o **ELT** (cargar crudo y transformar dentro del almacén, que es lo más común hoy con herramientas como dbt y Databricks). ELT ganó porque el almacenamiento en la nube es barato y conservar los datos crudos permite **reprocesar** si mañana descubres un error en la limpieza.

### Batch y streaming

- **Batch** (por lotes): se procesa un bloque de datos cada cierto tiempo, por ejemplo todos los pedidos de ayer, a las 3 de la mañana. Es lo más común, lo más simple y lo más barato.
- **Streaming** (en tiempo real o casi): cada evento se procesa segundos después de ocurrir. Se usa cuando la espera cuesta dinero: detectar un fraude con tarjeta mientras ocurre, o cambiar el precio de un viaje según la demanda de este minuto.

## ¿Y los otros roles?

En un equipo de datos hay varios roles que trabajan juntos. Se parecen, pero no son lo mismo:

| Rol | Pregunta que responde | Herramientas típicas |
|---|---|---|
| **Data engineer** | "¿Cómo hago que los datos lleguen, limpios y a tiempo, a donde se necesitan?" | SQL, Python, Spark, Airflow, la nube |
| **Analytics engineer** | "¿Cómo modelo los datos para que el negocio los entienda y confíe en ellos?" | SQL, dbt, el data warehouse |
| **Data analyst** | "¿Qué pasó y por qué?" | SQL, Excel, Power BI, Tableau |
| **Data scientist** | "¿Qué va a pasar?" (predecir, recomendar) | Python, estadística, machine learning |

Todos usan SQL. Por eso es lo primero que vas a aprender después de estos fundamentos.

## Las herramientas de este curso (y para qué sirve cada una)

| Herramienta | Para qué sirve | Analogía |
|---|---|---|
| **SQL** | Preguntarle cosas a una base de datos | El idioma para hablar con los datos |
| **Python** | Programar y automatizar cualquier tarea | La navaja suiza |
| **Spark / PySpark** | Procesar volúmenes gigantes repartiendo el trabajo entre muchas computadoras | Un ejército de cocineros en vez de uno solo |
| **Databricks** | Plataforma en la nube donde corre Spark, con notebooks y tablas Delta | La cocina industrial ya equipada |
| **dbt** | Organizar las transformaciones SQL como un proyecto con tests y documentación | Un recetario ordenado y verificado |
| **Airflow** | Programar y coordinar cuándo corre cada paso del pipeline | El director de orquesta |
| **Azure, AWS y Google Cloud** | Las tres grandes nubes: almacenamiento, cómputo y servicios de datos | El terreno donde se construye todo |
| **Terminal, Git y las CLIs** (`az`, `aws`, `gcloud`, `databricks`) | Controlar tu computadora, tu código y la nube escribiendo comandos | El control remoto |

## El mapa del curso

Los módulos están pensados para hacerse **en orden**, porque cada uno usa lo anterior:

1. 🧱 **Fundamentos** (estás aquí): el viaje de un dato de punta a punta (dónde vive, cómo se mueve, quién lo usa y cómo se cuida), formatos, terminal y Git.
2. 🗄️ **SQL** y 💼 **Casos de negocio con SQL**: la base de todo, de tu primer `SELECT` a problemas de entrevista, y cómo traducir una pregunta del negocio a una consulta.
3. 🐍 **Python**: programar y automatizar.
4. ⚡ **Spark** y 🔥 **PySpark**: procesar datos que no caben en una computadora.
5. 🔧 **dbt** y 🌬️ **Airflow**: ordenar las transformaciones y automatizarlas.
6. ☁️ **Azure**, 🟧 **AWS** y 🔷 **Google Cloud**: las tres nubes, orientadas a datos. No hace falta hacer las tres: elige la que más se use donde quieres trabajar.
7. 🧩 **Databricks**: la plataforma lakehouse.
8. 🧠 **Casos de punta a punta** y 🏆 **Proyecto final**: todo junto, como en un trabajo real, más la preparación para entrevistas.

:::tip ¿Cuánto tiempo lleva?
Cada lección indica su duración estimada. Con una o dos horas por día, en unos 3 a 4 meses puedes recorrer el núcleo (Fundamentos, SQL, Python, PySpark, dbt, Airflow y una nube). Lo importante no es la velocidad, sino **hacer los ejercicios**: se aprende escribiendo código, no leyendo.
:::

## Cómo usar este sitio

1. **Lee la lección.** Están escritas para alguien que empieza de cero.
2. **Prueba los ejemplos.** Los bloques de código con el botón **▶ Probar** se ejecutan aquí mismo. ¡Modifícalos! Nada se rompe: siempre puedes volver al original.
3. **Resuelve los ejercicios.** Escribe tu código y presiona **✓ Comprobar**. El sitio te dice si está bien y, si no, por qué.
4. **Usa las pistas** (💡) cuando te trabes. Ver la solución (👁) está permitido, pero intenta primero.
5. **Abre la terminal** (botón ⌨ Terminal) cuando una lección lo pida: es una terminal Linux simulada donde puedes usar `git`, `python`, `dbt`, `airflow` y las CLIs de la nube sin instalar nada ni pagar nada.
6. Tu progreso se guarda **en este navegador**. Puedes exportarlo desde "Mi progreso".

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

Todavía no hace falta entenderlo, pero intenta adivinar: `SELECT` elige qué columnas mostrar, `FROM` dice de qué tabla y `LIMIT 5` pide solo 5 filas. Cambia el `5` por un `10` y vuelve a probar. En unas lecciones vas a poder escribir esto (y cosas mucho más potentes) tú solo.

<!-- estandar:trabajo -->
:::trabajo
- Las ofertas de trabajo de data engineer piden casi siempre lo mismo: **SQL** (siempre), **Python**, una herramienta de procesamiento (**Spark**), una de orquestación (**Airflow**), una de transformación (**dbt**), una **nube** y **Git**. Es exactamente el recorrido de este curso.
- Un junior no necesita saberlo todo: necesita SQL muy sólido, Python básico, Git y saber aprender rápido. Lo demás se aprende en el trabajo, pero llegar sabiéndolo te pone muy por delante.
- La habilidad que más se valora y menos se enseña: **entender el negocio**. Saber qué es una venta neta, por qué importa la tasa de cancelación o qué espera finanzas de un cierre de mes. Por eso cada lección parte de un pedido del negocio.
:::

## Ejercicios

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
