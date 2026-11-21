---
titulo: Qué es Power BI y cómo es la pantalla de Power BI Desktop
nivel: 1 · Básico
duracion: 30
resumen: Power BI es la herramienta con la que un equipo de datos convierte tablas en informes que el negocio consulta todos los días. Qué son Power BI Desktop, el servicio y el archivo, el flujo completo (obtener datos → transformar → modelar → medir → visualizar → publicar), cada zona de la pantalla (cinta, vistas, lienzo, paneles) y qué puedes hacer en el Power BI de práctica, que corre en tu navegador.
objetivos: Explicar qué es Power BI y cuál es su flujo de trabajo | Distinguir Desktop, servicio y archivo | Ubicar cada zona de la pantalla de Desktop | Reconocer las pestañas de la cinta y las cinco vistas | Saber qué es real y qué es simulado en la práctica
prerrequisitos: fundamentos-bienvenida
autoevaluacion: ¿Sabes en qué orden se construye un informe? | ¿Sabes dónde están los paneles Filtros, Visualizaciones y Datos? | ¿Sabes qué vista muestra las relaciones entre tablas? | ¿Sabes qué se hace en Desktop y qué en el servicio?
---

:::analogia En palabras simples
Power BI es la cocina y el comedor de los datos. En la cocina (**Power BI Desktop**) traes los ingredientes (datos), los limpias, los combinas y preparas los platos (gráficos). En el comedor (**el servicio**, en la nube) los sirves a quien los va a consumir, y se renuevan solos cada día.
:::

## Paso 1 — Qué es Power BI

| Pieza | Qué es | Para qué |
|---|---|---|
| **Power BI Desktop** | La aplicación de escritorio (gratis, Windows) | **Crear**: traer datos, transformarlos, modelarlos, escribir DAX y diseñar el informe |
| **Servicio de Power BI** | El sitio web (app.powerbi.com) | **Compartir y operar**: publicar, actualizar los datos a horario, dar permisos, armar apps |
| **Archivo** | `.pbix` (un archivo) o proyecto `.pbip` (carpeta de texto, ideal para Git) | Guardar el trabajo |

El flujo siempre es el mismo, y este curso lo sigue en ese orden:

```diagrama
titulo: El flujo de trabajo de Power BI (y el orden de este curso)
nodo a: Obtener datos | icono=base | col=0 | fila=0 | color=gris
nodo b: Transformar | icono=transformar | col=1 | fila=0 | color=azul | sub=Power Query
nodo c: Modelar | icono=red | col=2 | fila=0 | color=violeta | sub=relaciones
nodo d: Medir | icono=codigo | col=3 | fila=0 | color=amarillo | sub=DAX
nodo e: Visualizar | icono=grafico | col=4 | fila=0 | color=naranja | sub=informe
nodo f: Publicar | icono=nube | col=5 | fila=0 | color=verde | sub=servicio
flecha a -> b
flecha b -> c
flecha c -> d
flecha d -> e
flecha e -> f
```

## Paso 2 — La pantalla

Abre el [Power BI de práctica](#/powerbi):

```captura
archivo: powerbi/b01-pantalla.webp
texto: Power BI Desktop recién abierto, antes de cargar datos
```

```captura
archivo: powerbi/b01-zonas.webp
texto: Las zonas - la cinta (1), las vistas (2), el lienzo (3), los paneles (4) y la barra de páginas y estado (5)
```

| Zona | Qué tiene |
|---|---|
| **1. Cinta** | Pestañas Archivo, Inicio, Insertar, Modelado, Vista, Optimizar, Ayuda; y pestañas que aparecen según lo que selecciones (Herramientas de medición, Formato) |
| **2. Vistas** (barra vertical izquierda) | Informe, Tabla, Modelo, Consultas DAX, TMDL |
| **3. Lienzo** | La página del informe donde van los gráficos |
| **4. Paneles** | **Filtros**, **Visualizaciones** (galería, pozos de campos y formato) y **Datos** (las tablas y campos) |
| **5. Páginas y estado** | Pestañas de página, cuántas tablas, relaciones y medidas tiene el modelo, zoom |

## Paso 3 — La cinta

```captura
archivo: powerbi/b01-cinta-insertar.webp
texto: Insertar - páginas, objetos visuales, cuadro de texto, botones, formas y los visuales de IA
```

```captura
archivo: powerbi/b01-cinta-modelado.webp
texto: Modelado - relaciones, medidas, columnas y tablas calculadas, roles de seguridad, vistas de código
```

```captura
archivo: powerbi/b01-cinta-vista.webp
texto: Vista - temas, cuadrícula, qué paneles mostrar y el analizador de rendimiento
```

| Pestaña | Lo más usado |
|---|---|
| **Inicio** | Obtener datos, Transformar datos, Actualizar, Nueva medida, Publicar |
| **Insertar** | Nueva página, objetos visuales, cuadro de texto, botones, visuales de IA |
| **Modelado** | Administrar relaciones, Nueva medida / columna / tabla, Administrar roles, Ver como, vistas DAX y TMDL |
| **Vista** | Temas, paneles, marcadores, analizador de rendimiento |
| **Optimizar** | Analizador de rendimiento, pausar objetos visuales |
| **Archivo** | Nuevo, abrir, guardar, exportar el modelo (TMDL), publicar |

## Paso 4 — Las cinco vistas

| Vista | Para qué |
|---|---|
| **Informe** | Armar las páginas con objetos visuales: lo que verá el usuario |
| **Tabla** | Ver las filas de cada tabla ya cargada |
| **Modelo** | El diagrama de tablas y relaciones, y las propiedades de cada campo |
| **Consultas DAX** | Escribir `EVALUATE …` y ver el resultado como tabla |
| **TMDL** | El modelo como texto, para verlo o editarlo como código |

## Paso 5 — Qué es real y qué es simulado en la práctica

| Real | Simulado |
|---|---|
| El flujo completo: Power Query con pasos y M, modelo con relaciones, motor DAX con contexto de filtro, visuales, filtros, formato, publicación | Los datos vienen de las bases del curso o de archivos tuyos; no se conecta a servidores |
| Los nombres de botones, pozos y diálogos siguen a Power BI Desktop | El servicio (áreas de trabajo, actualización, apps) está simulado en el navegador |
| El modelo se puede exportar en **TMDL** y abrir en Power BI Desktop real | Mapas simplificados y visuales de IA sin aprendizaje automático |

:::tip Tu trabajo queda guardado
El informe se guarda en tu navegador. **Archivo → Guardar como** descarga un archivo para llevarlo a otra computadora; **Archivo → Nuevo** empieza de cero. El panel **🎯 Reto** de la derecha propone una lista de logros: puedes cerrarlo y volver a abrirlo desde Ayuda → Ver reto.
:::

:::errores
- **Compartir el archivo .pbix por correo.** Se desactualiza y cada copia es un riesgo; se publica en el servicio y se comparte desde ahí.
- **Empezar por los gráficos.** Si los datos no están limpios y el modelo no está bien relacionado, los gráficos muestran números equivocados con buen aspecto.
- **Buscar las relaciones en la vista Informe.** Se ven y se editan en la vista Modelo.
:::

## ✅ Lo que lograste

- Sabes qué es Power BI, sus piezas y su flujo.
- Reconoces cada zona de la pantalla, la cinta y las vistas.
- Sabes qué puedes practicar aquí.

:::ejercicio quiz
¿Cuál es el orden del flujo de trabajo en Power BI?
- [ ] Publicar → visualizar → obtener datos
- [x] Obtener datos → transformar → modelar → medir → visualizar → publicar
- [ ] Modelar → obtener datos → transformar
- [ ] Visualizar → medir → modelar → obtener datos
:::

:::ejercicio quiz
¿Dónde se comparte un informe con el equipo?
- [ ] En Power BI Desktop
- [x] En el servicio de Power BI, después de publicar
- [ ] En el archivo .pbix
- [ ] En OneDrive, subiendo el .pbix
:::

:::ejercicio quiz
¿En qué vista ves y editas las relaciones entre tablas?
- [ ] Informe
- [ ] Tabla
- [x] Modelo
- [ ] TMDL
:::

:::ejercicio quiz
¿Qué panel muestra las tablas y campos disponibles?
- [ ] Filtros
- [ ] Visualizaciones
- [x] Datos
- [ ] Marcadores
:::
