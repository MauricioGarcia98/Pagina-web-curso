---
titulo: Obtener datos - orígenes, el Navegador y Cargar o Transformar
nivel: 1 · Básico
duracion: 35
resumen: Todo empieza por traer datos. El diálogo Obtener datos y sus orígenes (Excel, CSV, JSON, bases de datos, la web), el Navegador para elegir tablas con vista previa, la diferencia entre Cargar y Transformar datos, qué pasa al cargar (el panel Datos, las relaciones detectadas) y qué es el modo Importar.
objetivos: Elegir el origen adecuado en Obtener datos | Usar el Navegador para seleccionar tablas | Decidir entre Cargar y Transformar | Leer el panel Datos después de cargar | Entender qué es importar datos al modelo
prerrequisitos: powerbi-paso-a-paso-que-es-power-bi-y-la-pantalla
autoevaluacion: ¿Sabes dónde está Obtener datos? | ¿Sabes qué hace el Navegador? | ¿Sabes cuándo elegir Transformar en lugar de Cargar? | ¿Sabes qué significa el ícono Σ junto a un campo?
---

:::analogia En palabras simples
Obtener datos es ir al mercado: eliges el puesto (el origen), miras la mercadería (la vista previa del Navegador) y la llevas a la cocina (Cargar). Si algo viene sucio, pasa primero por la mesada (Transformar datos) antes de guardarlo.
:::

## Paso 1 — Obtener datos

**Inicio → Obtener datos**:

```captura
archivo: powerbi/b02-obtener.webp
texto: Los orígenes por categoría (1) - la base de datos del curso (2), Excel (3), CSV, JSON, Snowflake, BigQuery, Databricks, Fabric, web, escribir o pegar datos
```

| Origen | Cuándo |
|---|---|
| **Libro de Excel**, **Texto/CSV**, **JSON** | Archivos tuyos (en la práctica, los subes desde tu computadora) |
| **Base de datos del curso (SQLite)** | 99 tablas de 13 empresas ficticias: lo que usamos en el curso |
| **Snowflake**, **BigQuery**, **Databricks**, **Fabric** | Las tablas de las otras réplicas del curso: lo que construyas allá se consulta acá |
| **Web** | Una URL a un CSV o JSON |
| **Escribir datos** / **Pegar** | Una tabla chica a mano, o copiada de Excel |

En Power BI real la lista tiene cientos de conectores (SQL Server, SharePoint, Salesforce, Dataverse…), pero la mecánica es la misma.

## Paso 2 — El Navegador

Elige **Base de datos del curso**:

```captura
archivo: powerbi/b02-navegador.webp
texto: Buscar (1), la lista de tablas con casillas (2), la vista previa de la tabla seleccionada (3), Cargar (4) y Transformar datos (5)
```

- Escribe `pedidos` en el buscador para filtrar la lista.
- Haz clic en el nombre para ver la **vista previa**; marca la **casilla** para incluirla.
- Marca **clientes**, **productos**, **categorias**, **pedidos** y **detalle_pedidos**: las cinco tablas de Tienda Andina que usaremos en todo el curso.

| Botón | Hace |
|---|---|
| **Cargar** | Trae las tablas tal cual al modelo |
| **Transformar datos** | Abre el **Editor de Power Query** para limpiarlas antes de cargar (nivel 2) |

:::tip ¿Cargar o Transformar?
Si los datos vienen de una base bien armada, **Cargar**. Si vienen de un Excel con encabezados en la fila 3, columnas de más o tipos mal detectados, **Transformar datos**. Siempre puedes volver a Power Query después con **Inicio → Transformar datos**.
:::

## Paso 3 — Después de cargar

**Cargar**:

```captura
archivo: powerbi/b02-cargado.webp
texto: El panel Datos con las cinco tablas y sus campos (1); la barra de estado dice 5 tablas · 4 relaciones (2)
```

| Qué ves | Significa |
|---|---|
| Las tablas en el panel **Datos**, con sus campos | Ya están en el modelo |
| **Σ** junto a un campo | Columna numérica que se suma por defecto (`precio`, `cantidad`) |
| 📅 con Año, Trimestre, Mes | Columna de fecha con jerarquía automática |
| **4 relaciones** | Power BI detectó columnas con el mismo nombre (`cliente_id`, `producto_id`…) y las relacionó solo; lo revisamos en la lección 7 |

## Paso 4 — Importar: qué pasó con los datos

Al cargar, Power BI **copió** los datos al modelo (modo **Importar**): el informe es rápido porque consulta su propia copia, y para ver datos nuevos hay que **Actualizar** (botón en Inicio, o a horario en el servicio). Existen otros modos para datos que cambian a cada segundo (DirectQuery) o para lagos de datos (Direct Lake en Fabric); el curso de [Power BI y DAX](#/m/powerbi) los compara.

:::errores
- **Cargar directo datos sucios.** Si hay filas de título, columnas mal tipadas o vacíos, usa Transformar datos antes de cargar.
- **Marcar todas las tablas "por las dudas".** Cada tabla extra pesa en el modelo y confunde a quien arma el informe.
- **Esperar que los datos nuevos aparezcan solos.** Hace falta Actualizar en Desktop o una actualización programada en el servicio.
:::

## ✅ Lo que lograste

- Sabes elegir un origen y usar el Navegador.
- Cargaste las cinco tablas de Tienda Andina.
- Lees el panel Datos y entiendes qué es importar.

:::ejercicio quiz
¿Para qué sirve la casilla junto a cada tabla en el Navegador?
- [ ] Para borrar la tabla
- [x] Para incluirla en la carga; el clic en el nombre solo muestra la vista previa
- [ ] Para cargarla con las relaciones ya creadas
- [ ] Para renombrarla
:::

:::ejercicio quiz
Los datos vienen de un Excel con dos filas de título antes de los encabezados. ¿Qué botón usas en el Navegador?
- [ ] Cargar
- [x] Transformar datos, para arreglarlos en Power Query antes de cargar
- [ ] Cancelar
- [ ] Cargar, y después borrar las filas en la vista Tabla
:::

:::ejercicio quiz
Cargaste las tablas ayer y hoy hay pedidos nuevos en el origen. ¿Qué haces para verlos?
- [ ] Nada, se ven solos
- [x] Inicio → Actualizar (o programar la actualización en el servicio)
- [ ] Volver a crear el informe
- [ ] Publicar el informe de nuevo
:::
