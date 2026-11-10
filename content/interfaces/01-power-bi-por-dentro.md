---
titulo: Power BI por dentro - qué es cada parte y para qué sirve
nivel: Intermedio
duracion: 70
resumen: Recorrido completo por Power BI Desktop y el servicio - la cinta, las vistas, los paneles, Power Query, la vista de modelo, DAX, el diseño del informe (drill, obtener detalles, marcadores, botones, interacciones, análisis, parámetros, IA), seguridad, publicación, actualización y formas de compartir.
objetivos: Ubicar cada zona de Power BI Desktop y saber para qué sirve | Entender qué se hace en Power Query, en la vista de modelo y en la vista de informe | Modelar un esquema en estrella con relaciones, propiedades, jerarquías y tabla de fechas | Distinguir medida, columna calculada, tabla calculada, rol y grupo de cálculo | Saber qué pasa al publicar y qué licencia hace falta para compartir
prerrequisitos: powerbi-power-bi-y-el-modelo | modelado-kimball
autoevaluacion: ¿Sabes en qué vista se crean las relaciones y qué es la cardinalidad? | ¿Sabes cuándo usar una medida y cuándo una columna calculada? | ¿Sabes para qué sirve marcar una tabla como tabla de fechas? | ¿Sabes qué ve un usuario con un rol de seguridad por filas? | ¿Sabes qué diferencia hay entre un informe, un modelo semántico y un panel en el servicio?
---

:::tip Practícalo mientras lees
Abre el [Power BI de práctica](#/powerbi) en otra pestaña y busca cada zona a medida que aparece. La réplica copia la estructura de Power BI Desktop: lo que aprendas acá dónde está, lo vas a encontrar en el mismo lugar en el real.
:::

## El mapa: Desktop, servicio y archivo

Power BI son **dos aplicaciones** que trabajan juntas:

| Pieza | Qué es | Dónde corre | Para qué |
|---|---|---|---|
| **Power BI Desktop** | La aplicación de escritorio (gratis, Windows) | Tu computadora | **Crear**: traer datos, transformarlos, modelarlos, escribir DAX y diseñar el informe |
| **Servicio de Power BI** | El sitio web (app.powerbi.com, parte de Microsoft Fabric) | La nube | **Compartir y operar**: publicar, actualizar los datos a horario, dar permisos, armar apps y paneles |
| **Archivo .pbix** | Un solo archivo binario con datos + modelo + informe | Donde lo guardes | Lo clásico: se abre con doble clic |
| **Proyecto .pbip** | El mismo contenido pero como **carpeta de texto** (TMDL para el modelo, JSON para el informe) | Una carpeta, ideal en Git | Trabajar en equipo: diferencias legibles, pull requests, CI/CD |

Lo que haces en Desktop termina publicado como **dos objetos** en el servicio: un **modelo semántico** (antes llamado *dataset*: tablas, relaciones, medidas, seguridad) y un **informe** (las páginas con objetos visuales) que lee ese modelo.

## La ventana de Power BI Desktop

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Barra de título: guardar · deshacer · nombre del archivo · buscar    │
├──────────────────────────────────────────────────────────────────────┤
│ Cinta: Archivo | Inicio | Insertar | Modelado | Vista | Optimizar…   │
├──┬───────────────────────────────────────┬─────────┬────────┬────────┤
│▣ │                                       │ Filtros │ Visua- │ Datos  │
│▦ │            LIENZO                     │         │ liza-  │        │
│⧉ │      (las páginas del informe)        │         │ ciones │        │
│</│                                       │         │        │        │
│T │                                       │         │        │        │
├──┴───────────────────────────────────────┴─────────┴────────┴────────┤
│ Pestañas de página: Página 1 | + ·············· zoom · ajustar        │
└──────────────────────────────────────────────────────────────────────┘
```

### La cinta

| Pestaña | Lo más usado |
|---|---|
| **Archivo** | Guardar, guardar como proyecto (.pbip), exportar a PDF, **Opciones y configuración** (vista previa de funciones, carga de datos, auto fecha/hora), publicar |
| **Inicio** | **Obtener datos**, **Transformar datos** (abre Power Query), Actualizar, Nueva medida, Publicar |
| **Insertar** | Nuevo objeto visual, cuadro de texto, botones, formas, imágenes, preguntas y respuestas, narrativa inteligente |
| **Modelado** | Administrar relaciones, Nueva medida / columna / tabla, Nuevo parámetro, **Administrar roles** y **Ver como** (seguridad), grupos de cálculo |
| **Vista** | Temas, tamaño de página, cuadrícula, paneles visibles (marcadores, selección, rendimiento, sincronizar segmentaciones) |
| **Optimizar** | Analizador de rendimiento, pausar objetos visuales, ajustes preestablecidos para modelos grandes |
| **Ayuda** | Documentación, comunidad, novedades |
| *Pestañas contextuales* | Aparecen según lo que selecciones: **Herramientas de tabla**, **Herramientas de columnas** (tipo de datos, formato, categoría, ordenar por columna), **Herramientas de medición**, **Formato** del objeto visual |

### Las cinco vistas (la barra vertical de la izquierda)

1. **Informe**: el lienzo donde se arman las páginas con objetos visuales. Es lo que verá el usuario final.
2. **Tabla**: muestra las filas de cada tabla **después** de cargarlas al modelo. Sirve para revisar datos, tipos y columnas calculadas (no es Power Query: acá no se transforma el origen).
3. **Modelo**: el diagrama del **modelo de datos**: tablas, relaciones y propiedades. Es la respuesta a "¿Power BI tiene modelado de datos?": sí, y es su corazón (ver abajo).
4. **Consultas DAX**: un editor para escribir `EVALUATE …` y ver el resultado como tabla. Ideal para probar medidas sin armar un visual.
5. **TMDL**: el modelo como **texto** (Tabular Model Definition Language). Puedes ver y editar tablas, medidas, relaciones y roles como código y aplicar los cambios con `createOrReplace`.

### Los tres paneles de la derecha

- **Filtros**: tres niveles, de más chico a más grande: *en este objeto visual*, *en esta página*, *en todas las páginas*. Tipos de filtro: básico (marcar valores), avanzado (condiciones), N superior.
- **Visualizaciones**: arriba la galería de tipos de objeto visual; abajo dos modos:
  - **Crear objeto visual**: los **pozos de campos** (Eje X, Eje Y, Leyenda, Valores, Información sobre herramientas…). Arrastras campos del panel Datos a cada pozo.
  - **Formato**: todas las opciones de diseño, separadas en *Objeto visual* (ejes, etiquetas, colores) y *General* (título, fondo, borde, tamaño).
- **Datos**: las tablas del modelo con sus campos. Los íconos dicen qué es cada cosa: **Σ** columna numérica que se resume, **calculadora** medida, **globo** columna geográfica, **calendario** jerarquía de fechas, ojo tachado = oculto.

## Power Query: preparar los datos antes de cargarlos

**Inicio → Transformar datos** abre el **Editor de Power Query**, una ventana aparte. Es un **ETL visual**: cada clic se graba como un paso en lenguaje **M**.

| Zona | Qué es |
|---|---|
| **Consultas** (izquierda) | Una consulta por tabla. Las que tienen la carga deshabilitada sirven de pasos intermedios |
| **Vista previa** (centro) | Las primeras filas del resultado. Arriba de cada columna: tipo de datos y menú de filtro |
| **Barra de fórmulas** | El código M del paso seleccionado |
| **Pasos aplicados** (derecha) | La receta: Origen → Encabezados promovidos → Tipo cambiado → … Puedes editar o borrar cualquier paso |
| **Perfil de columna** (pestaña Vista) | Calidad (válido/error/vacío), distribución y estadísticas de cada columna |
| **Editor avanzado** | Toda la consulta en M para editarla a mano |
| **Cerrar y aplicar** | Ejecuta las consultas y carga el resultado en el modelo |

Conceptos clave:

- **Modos de almacenamiento**: *Importar* (los datos se copian al modelo, lo más rápido), *DirectQuery* (cada visual consulta el origen en vivo), *Direct Lake* (en Fabric: lee archivos Delta del lago sin importarlos) y *Dual*.
- **Plegado de consultas** (*query folding*): cuando el origen es una base de datos, Power Query traduce los pasos a SQL y los ejecuta en el origen. Un paso que no se puede plegar obliga a traer todo y filtrar en Power BI: más lento.
- **Parámetros**: valores reutilizables (por ejemplo, el servidor o una fecha de corte) que cambian sin tocar los pasos.

## La vista de modelo: el modelado de datos

Esta vista es donde se decide **cómo se relacionan las tablas**, y de eso depende que todos los números sean correctos.

### Esquema en estrella

La forma recomendada es el **esquema en estrella**: una **tabla de hechos** en el centro (ventas, pedidos: muchas filas, números y claves) rodeada de **tablas de dimensión** (clientes, productos, calendario: quién, qué, cuándo, dónde). Los filtros viajan desde las dimensiones hacia los hechos.

### Relaciones

Para crear una relación, arrastras una columna de una tabla sobre la columna equivalente de otra, o usas **Administrar relaciones**. Cada relación tiene:

| Propiedad | Opciones | Qué significa |
|---|---|---|
| **Cardinalidad** | Varios a uno (*:1), Uno a uno (1:1), Varios a varios (*:*) | Cuántas filas de cada lado comparten un valor. Lo normal: muchos pedidos para un cliente (*:1) |
| **Dirección del filtro cruzado** | Única / Ambas | Por dónde viaja el filtro. Única (de la dimensión a los hechos) es lo seguro; *Ambas* sirve en casos puntuales y puede crear ambigüedad |
| **Activa / inactiva** | Línea continua / punteada | Entre dos tablas solo una relación puede estar activa. Las inactivas se usan en una medida con `USERELATIONSHIP` (por ejemplo, fecha de pedido vs fecha de envío) |
| **Integridad referencial** | Solo DirectQuery | Permite usar INNER JOIN en vez de OUTER (más rápido) si sabes que no faltan claves |

### El panel Propiedades

Al seleccionar una tabla, columna o medida en la vista de modelo aparece **Propiedades**:

- **Nombre, descripción y sinónimos**: la descripción aparece al pasar el mouse; los sinónimos ayudan a Copilot y a preguntas y respuestas.
- **Carpeta de presentación**: agrupa medidas o columnas en carpetas dentro del panel Datos.
- **Está oculto**: oculta claves y columnas técnicas para que el usuario vea solo lo útil (siguen funcionando en las relaciones).
- **Tipo de datos y formato**: entero, decimal, fecha, texto; formato de moneda, porcentaje o personalizado.
- **Categoría de datos**: País/región, Ciudad, Latitud, URL de imagen… Le dice a los visuales cómo interpretar la columna (por ejemplo, para un mapa).
- **Resumir por**: suma, promedio o *No resumir* (los IDs y años no se suman).
- **Ordenar por columna**: para que *enero, febrero…* se ordenen por número de mes y no alfabéticamente.

### Jerarquías y tabla de fechas

- **Jerarquía**: un camino de columnas para explorar en profundidad (Año → Trimestre → Mes → Día; Categoría → Subcategoría → Producto).
- **Tabla de fechas**: una tabla con una fila por día sin huecos. Con **Marcar como tabla de fechas** las funciones de inteligencia de tiempo clásicas (`TOTALYTD`, `SAMEPERIODLASTYEAR`) funcionan bien. Si no la creas, la opción *Fecha/hora automática* genera tablas ocultas por cada columna de fecha (cómodo, pero pesado y limitado).

### El explorador de modelo

En la vista de modelo, el panel **Modelo** lista todo lo que no se ve en el diagrama: **relaciones**, **roles** de seguridad, **grupos de cálculo**, **perspectivas** (subconjuntos del modelo), **culturas** (traducciones) y **expresiones compartidas** de Power Query.

## DAX: medidas, columnas y tablas calculadas

| Objeto | Se calcula… | Se guarda en el modelo | Úsalo para |
|---|---|---|---|
| **Medida** | En el momento, según los filtros del visual (**contexto de filtro**) | Solo la fórmula | Totales, ratios, comparaciones: casi todo |
| **Columna calculada** | Una vez por fila al actualizar (**contexto de fila**) | Sí, ocupa memoria | Clasificar filas para usarlas como eje o filtro (por ejemplo, "rango de edad") |
| **Tabla calculada** | Al actualizar | Sí | Tablas auxiliares: calendario, tablas de parámetros |

La función más importante es **`CALCULATE`**: evalúa una expresión **cambiando los filtros** (agrega, reemplaza o quita filtros con `ALL`/`REMOVEFILTERS`). Las variables (`VAR … RETURN`) hacen las fórmulas legibles y más rápidas.

## Seguridad y grupos de cálculo

- **Seguridad de nivel de fila (RLS)**: en **Modelado → Administrar roles** defines roles con un filtro DAX por tabla (por ejemplo, `[pais] = "Argentina"`). En **Ver como** pruebas cómo lo ve cada rol. La RLS **dinámica** usa `USERPRINCIPALNAME()` para filtrar según quién inició sesión. En el servicio se asignan personas o grupos a cada rol. Ojo: la RLS no aplica a quien tiene permiso de edición en el área de trabajo.
- **Seguridad de nivel de objeto (OLS)**: oculta tablas o columnas enteras a un rol (se configura en TMDL o herramientas externas).
- **Grupos de cálculo**: una tabla especial con **elementos de cálculo** que usan `SELECTEDMEASURE()`. Un grupo "Inteligencia de tiempo" con *Actual*, *Año anterior* y *Acumulado* sirve para **todas** las medidas, en vez de escribir tres versiones de cada una.

## Diseñar el informe: de "gráficos sueltos" a una herramienta que la gente usa

Un informe no es solo poner gráficos. Es como armar una **revista interactiva**: tiene portada, botones para pasar de página, un índice y notas al pie. Estas son las piezas, en el orden en que suelen aparecer en un proyecto real.

### Explorar en profundidad (drill down): bajar de lo general a lo particular

Imagina una muñeca rusa: adentro de "Año" está "Trimestre", adentro está "Mes", adentro está "Día". Si pones **varios campos en el mismo eje** (o arrastras una **jerarquía** entera), el gráfico muestra primero el nivel de arriba y te deja bajar.

Los botones aparecen arriba del gráfico al pasar el mouse:

| Botón | Qué hace | Ejemplo |
|---|---|---|
| ↑ Subir | Vuelve al nivel anterior | De "meses" a "trimestres" |
| ↓ Modo explorar | Si está prendido, un clic en una barra **entra** en ese valor | Clic en "Bikes" → ves solo las subcategorías de Bikes |
| ↘ Siguiente nivel | Muestra el nivel de abajo para **todos** los valores | Todas las subcategorías, de todas las categorías |
| ⤓ Expandir | Muestra el nivel de abajo **pegado** al de arriba | "Bikes · Road Bikes", "Bikes · Mountain Bikes"… |

> **Pruébalo**: crea una jerarquía con clic derecho en una columna → *Crear jerarquía*; agrega niveles con clic derecho → *Agregar a jerarquía*. Después haz clic en la jerarquía del panel Datos con el lienzo vacío.

### Obtener detalles (drillthrough): una página "lupa"

Es una página preparada para mostrar **el detalle de una sola cosa**: un cliente, un producto, un país. Se arma así:

1. Crea una página nueva (por ejemplo, "Detalle de producto").
2. Sin nada seleccionado, en *Crear objeto visual*, arrastra el campo (por ejemplo, *Categoría*) al pozo **Obtener detalles**. Power BI agrega solo un **botón Atrás**.
3. En cualquier otra página, **clic derecho** en un dato de ese campo → *Obtener detalles* → la página. Llegas filtrado por ese valor.

### Marcadores, panel Selección y botones: informes que parecen una app

- Un **marcador** es una **foto** del estado del informe: qué página, qué filtros, qué está seleccionado en cada segmentación y qué objetos se ven. Vista → *Marcadores* → *Agregar*.
- El **panel Selección** (Vista → *Selección*) lista todo lo que hay en la página, en capas: lo de arriba de la lista queda adelante. Con el ojo ocultas o muestras cada objeto.
- Un **botón** (Insertar → *Botones*) hace una **acción**: ir atrás, aplicar un marcador, ir a una página o abrir una URL. En Desktop se usa con **Ctrl + clic** (con clic solo lo seleccionas para editarlo); en el servicio alcanza con un clic.

La receta clásica de "pestañas": dos gráficos superpuestos, un marcador con uno oculto y otro marcador con el otro oculto, y dos botones que aplican cada marcador.

### Que los gráficos se hablen (o no): interacciones y segmentaciones sincronizadas

- Por defecto, al hacer clic en una barra **se filtran los demás objetos** de la página. Con **Formato → Editar interacciones** eliges, para cada par de objetos, si filtra, resalta o **no hace nada** (ícono "Ninguno"). Sirve, por ejemplo, para que un gráfico de "Total histórico" no cambie con la segmentación de año.
- **Sincronizar segmentaciones** (Vista) hace que una misma segmentación (por ejemplo, Año) filtre **varias páginas**. *Sincronizar* = filtra esa página; *Visible* = además se ve ahí.

### Análisis, formato condicional y tooltips: que el número "se explique solo"

- **Panel Análisis** (la lupa al lado de Formato): agrega líneas de referencia sobre el gráfico, como el **promedio**, un **objetivo fijo** (línea constante) o la **tendencia**. Así se ve de un vistazo qué está por encima o por debajo.
- **Formato condicional** (el botón **fx**): pinta cada celda o barra según su valor. *Degradado*: del rojo (bajo) al verde (alto). *Reglas*: "si es menor que 0, rojo". También hay **barras de datos** dentro de las celdas e **íconos** (▲ ● ▼).
- **Información sobre herramientas de página**: una página chiquita (tipo *Información sobre herramientas*) que aparece **al pasar el mouse** por un dato de otro gráfico, ya filtrada por ese dato.

### Parámetros: que la persona juegue con "¿y si…?"

- **Rango numérico** (Modelado → *Nuevo parámetro*): crea una tabla con valores (por ejemplo, descuento de 0 % a 50 %) y una medida que lee el valor elegido. Así puedes mostrar "¿cuánto venderíamos con un 10 % de descuento?" sin escribir nada más.
- **Campos**: una segmentación que cambia **qué campo** está en el eje (por ejemplo, ver ventas por País, por Categoría o por Canal con el mismo gráfico).

### Objetos visuales de IA

| Objeto | Para qué | Cuidado |
|---|---|---|
| **Preguntas y respuestas** | Escribes "ventas por país" y arma el gráfico | Los nombres de las columnas tienen que ser claros (y sus *sinónimos* ayudan) |
| **Árbol de descomposición** | Abrir un total por distintos campos, nivel por nivel, para encontrar el porqué | Con muchos campos se vuelve difícil de leer |
| **Influenciadores clave** | Qué valores hacen que un número suba | Muestra relación, **no** causa |
| **Narración inteligente** | Un párrafo que resume la página y se actualiza al filtrar | Revisa que diga lo que importa |

## Publicar y compartir

Al pulsar **Publicar** eliges un **área de trabajo** del servicio. Ahí aparecen:

| Objeto | Qué es |
|---|---|
| **Área de trabajo** | Carpeta compartida de un equipo, con roles: Administrador, Miembro, Colaborador, Visor |
| **Modelo semántico** | Tus datos y cálculos. Se configura la **actualización programada** y las credenciales |
| **Informe** | Las páginas interactivas |
| **Panel (dashboard)** | Una sola página con mosaicos anclados desde varios informes |
| **Aplicación** | El paquete que se publica para los consumidores, con permisos propios |
| **Puerta de enlace (gateway)** | Software que permite al servicio leer datos de tu red local para actualizar |

**Licencias** (resumido): con *Free* creas solo para ti; para compartir hace falta **Pro** o **Premium por usuario** para cada persona, o que el contenido esté en una **capacidad** (Premium o Fabric F64 y superiores), donde los visores pueden ser gratuitos.

Para equipos: **canalizaciones de implementación** (desarrollo → prueba → producción) e **integración con Git** del área de trabajo usando el formato .pbip.

### La actualización: por qué "anda en mi compu" pero falla en el servicio

Tu informe en Desktop lee los datos **desde tu computadora**. El servicio vive **en la nube**: no puede entrar a tu disco ni a un servidor de tu oficina. Por eso, para que se actualice solo:

1. **Puerta de enlace de datos local**: un programa que se instala en una computadora de la red (que esté siempre prendida). El servicio le pide los datos y ella se los busca. Los orígenes que ya están en la nube (Azure SQL, SharePoint Online) no la necesitan.
2. **Credenciales del origen**: con qué usuario se conecta y su **nivel de privacidad**.
3. **Actualización programada**: los horarios. Con Pro, hasta **8 por día**; con Premium o Fabric, hasta **48**.

Si falta alguno de los tres, la actualización **falla** y el historial te dice por qué.

> **Pruébalo**: en Desktop pulsa **Publicar**, abre el informe en el servicio de práctica, ve a su **Modelo semántico** y pulsa *Actualizar ahora* sin puerta de enlace. Lee el error, instala la puerta de enlace (simulada) en *Configuración*, asígnala y completa las credenciales: ahora sí funciona.

### Tres formas de compartir (y cuándo usar cada una)

| Forma | Para quién | Ejemplo |
|---|---|---|
| **Rol en el área de trabajo** | Quienes **construyen** el contenido | El equipo de datos (Miembro o Colaborador) |
| **Compartir** un informe | **Pocas** personas puntuales | Tu jefa y dos compañeros |
| **App** | **Muchas** personas que solo consumen | Toda el área de ventas |

Recuerda: la seguridad por filas (RLS) se aplica a los **Visores**. Quien es Administrador, Miembro o Colaborador ve todo.

## Qué tiene la réplica y qué no

| En la réplica | Todavía no |
|---|---|
| Obtener datos (CSV, Excel, JSON, bases del curso), Power Query con pasos y M, vistas Informe/Tabla/Modelo/DAX/TMDL | Conectores a bases reales y servicios en línea, DirectQuery, Direct Lake |
| Relaciones con cardinalidad, dirección y activa/inactiva; detección automática; panel Propiedades (nombre, carpetas, sinónimos, categoría, ordenar por columna), jerarquías, marcar tabla de fechas | Varios diseños del diagrama, relaciones de varios a varios con tabla puente automática |
| Motor DAX con contexto de filtro, CALCULATE, iteradores, inteligencia de tiempo | Todas las funciones DAX, depuración y análisis de rendimiento |
| 28 objetos visuales (incluidos Preguntas y respuestas, Árbol de descomposición, Influenciadores clave y Narración inteligente), formato, formato condicional, panel Análisis, filtros, segmentaciones, filtrado cruzado | Mapas de Bing/Azure Maps reales, visuales personalizados de AppSource, Copilot |
| Formas, botones, marcadores, panel Selección, explorar en profundidad, obtener detalles, tooltips de página, editar interacciones, sincronizar segmentaciones, parámetros de rango y de campos | Agrupar objetos visuales, temas JSON completos, informes paginados |
| RLS con Ver como, grupos de cálculo, exportación a TMDL | OLS, perspectivas |
| Servicio de práctica: publicar, áreas de trabajo y roles, actualización programada, puerta de enlace, credenciales, miembros de RLS, compartir, paneles, apps, aval, confidencialidad, linaje y canalizaciones | Cuentas reales, suscripciones por correo, alertas de datos, métricas |

:::ejercicio quiz
Tienes una tabla `ventas` (una fila por venta) y una tabla `clientes` (una fila por cliente). ¿Qué relación creas?
- [ ] Uno a uno, dirección ambas
- [x] Varios a uno desde ventas hacia clientes, filtro en una dirección (de clientes hacia ventas)
- [ ] Varios a varios
- [ ] Ninguna: se resuelve con una columna calculada
:::

:::ejercicio quiz
Quieres que el usuario vea "Ventas", "Margen" y "Ventas año anterior" pero no las columnas `cliente_id` ni `producto_id`. ¿Qué haces en la vista de modelo?
- [ ] Borrar las columnas de ID
- [x] Ocultar las columnas de ID (Está oculto) y dejar las medidas visibles
- [ ] Moverlas a otra página
- [ ] Convertirlas en medidas
:::

:::ejercicio quiz
Los meses aparecen en el eje como "abril, agosto, diciembre…". ¿Cómo lo arreglas?
- [ ] Renombrando los meses con números
- [x] Con "Ordenar por columna" usando el número de mes
- [ ] Cambiando el tipo de datos a fecha
- [ ] Con un filtro de N superior
:::

:::ejercicio quiz
¿Qué es lo que se publica en el servicio y guarda los datos, las relaciones y las medidas?
- [ ] El informe
- [ ] El panel
- [x] El modelo semántico
- [ ] La aplicación
:::

:::ejercicio quiz
Quieres que al hacer clic derecho en un producto, la persona vea una página con todo el detalle de ese producto. ¿Qué usas?
- [ ] Un marcador
- [x] Una página de Obtener detalles (drillthrough) con el campo Producto en su pozo
- [ ] Sincronizar segmentaciones
- [ ] Una línea de tendencia
:::

:::ejercicio quiz
El informe se actualiza bien en Power BI Desktop, pero en el servicio la actualización programada falla con "No se pudo conectar con el origen de datos local". ¿Qué falta?
- [ ] Una licencia Premium
- [ ] Volver a publicar el informe
- [x] Una puerta de enlace de datos local (y sus credenciales) configurada para el modelo semántico
- [ ] Un panel con mosaicos
:::

:::ejercicio quiz
Toda el área comercial (300 personas) necesita ver tres informes, pero nadie debe ver los cambios a medio hacer del equipo de datos. ¿Cuál es la mejor forma de distribuirlos?
- [ ] Darles el rol Miembro en el área de trabajo
- [ ] Compartir cada informe con las 300 personas
- [x] Publicar una app desde el área de trabajo
- [ ] Exportar los informes a PDF
:::
