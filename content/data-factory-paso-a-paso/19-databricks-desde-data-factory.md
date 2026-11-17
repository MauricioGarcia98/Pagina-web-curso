---
titulo: Databricks desde Data Factory - copiar y después limpiar
nivel: 5 · Avanzado
duracion: 50
resumen: Data Factory copia; Databricks transforma. Conectas el factory con el workspace de Databricks, agregas una actividad Notebook después de la copia que recibe la fecha como parámetro, ejecutas el pipeline completo y lees en la salida lo que devolvió el notebook. También ves cómo se elige el clúster y por qué conviene un job cluster.
objetivos: Crear un linked service a Azure Databricks | Agregar una actividad Notebook a un pipeline | Pasar parámetros al notebook con base parameters | Leer el runOutput que devuelve dbutils.notebook.exit | Elegir entre job cluster, clúster existente y serverless
prerrequisitos: data-factory-paso-a-paso-dependencias-y-manejo-de-errores
autoevaluacion: ¿Sabes cómo recibe el notebook un parámetro de Data Factory? | ¿Sabes cómo devuelve un valor el notebook? | ¿Sabes qué permiso necesita el factory en Databricks? | ¿Sabes por qué conviene un job cluster?
---

:::analogia El transportista y la cocina
Data Factory es el transportista que trae los ingredientes; Databricks es la cocina que los transforma. La actividad Notebook le pasa la orden (los parámetros, como la fecha) y la cocina devuelve una nota con el resultado (runOutput).
:::

## Paso 1 — El notebook

En el [Databricks de práctica](#/databricks) está el notebook `limpiar_ventas`:

```captura
archivo: adf/b19-notebook.webp
texto: El notebook - recibe la fecha como widget y termina con dbutils.notebook.exit
```

```python norun
dbutils.widgets.text("fecha", "2026-11-15")
fecha = dbutils.widgets.get("fecha")
print(f"Limpiando las ventas del {fecha}")

filas_limpias = 5  # en el proyecto real: leer bronze, quitar duplicados y escribir silver
dbutils.notebook.exit(f"{filas_limpias} filas limpias del {fecha}")
```

| Pieza | Para qué |
|---|---|
| `dbutils.widgets.text` / `get` | Recibir parámetros (los manda Data Factory) |
| `dbutils.notebook.exit(valor)` | Devolver un valor a quien lo llamó (Data Factory lo ve como `runOutput`) |

## Paso 2 — La conexión a Databricks

**Manage → Linked services → New → Azure Databricks**:

1. **Name**: `ls_databricks`.
2. **Databricks workspace**: `dbw-tiendaandina-dev`.
3. **Select cluster**: **New job cluster**.

```captura
archivo: adf/b19-linked.webp
texto: El tipo (1), el workspace (2) y el clúster (3)
```

| Clúster | Qué hace | Cuándo |
|---|---|---|
| **New job cluster** | Crea un clúster para la ejecución y lo apaga al terminar | **Producción**: se paga solo lo que corre y es más barato por DBU |
| **Existing interactive cluster** | Usa un clúster encendido | Pruebas rápidas; caro si queda encendido |
| **Serverless** (en Databricks real) | Sin clúster que administrar | Cuando el workspace lo tiene habilitado |

Para autenticarse se usa la **identidad administrada** del factory, que en el workspace necesita permisos (por ejemplo, poder ejecutar ese notebook y crear el clúster).

## Paso 3 — La actividad Notebook

En `pl_ingesta_diaria`, selecciona la copia y agrega **Notebook** (`Limpiar ventas`). Queda después de la copia con Upon Success. En **Azure Databricks** elige `ls_databricks`, y en **Settings**:

1. **Notebook path**: `/Users/alumno@academia.dev/limpiar_ventas`.
2. **Base parameters**: `fecha` = `@pipeline().parameters.fecha`.

```captura
archivo: adf/b19-settings.webp
texto: La ruta del notebook (1) y el parámetro fecha, que toma el del pipeline (2)
```

Cada **base parameter** llega al notebook como un **widget** con ese nombre.

## Paso 4 — Ejecutar

**Debug** (el notebook tarda un poco más que una copia):

```captura
archivo: adf/b19-debug.webp
texto: El pipeline completo (1) - copiar, registrar el éxito y limpiar en Databricks (2)
```

El **Output** de `Limpiar ventas`:

```captura
archivo: adf/b19-output.webp
texto: runPageUrl (el enlace a la ejecución en Databricks) y runOutput, lo que devolvió el notebook
```

`runOutput` = `5 filas limpias del 2026-11-15`. Una actividad siguiente puede leerlo con `@activity('Limpiar ventas').output.runOutput`, por ejemplo para decidir con un If si hubo filas. **runPageUrl** lleva a la ejecución en Databricks, con su salida celda por celda: es lo primero que se abre cuando el notebook falla.

:::tip Data Factory o Databricks Jobs
Databricks tiene su propio orquestador (**Jobs / Lakeflow Jobs**). Muchos equipos usan Data Factory para **traer** los datos de sistemas externos y Databricks Jobs para lo que pasa **dentro** del lago. Llamar notebooks desde Data Factory tiene sentido cuando el flujo mezcla las dos cosas y quieres un solo lugar para orquestar y monitorear.
:::

:::errores
- **Clúster interactivo siempre encendido para producción.** Un job cluster se crea para la ejecución y se apaga al terminar.
- **Leer el parámetro como variable de entorno.** Llega como widget: `dbutils.widgets.get("fecha")`.
- **Buscar el error del notebook en Data Factory.** El runPageUrl lleva a la ejecución en Databricks, donde está el detalle.
:::

## ✅ Lo que lograste

- Conectaste el factory con Databricks y elegiste el tipo de clúster.
- Llamaste un notebook con parámetros después de la copia.
- Leíste lo que devolvió el notebook.

:::ejercicio quiz
¿Cómo recibe el notebook el parámetro `fecha` que manda Data Factory?
- [ ] Como variable de entorno
- [x] Como un widget: `dbutils.widgets.get("fecha")`
- [ ] Como argumento de línea de comandos
- [ ] No puede recibirlo
:::

:::ejercicio quiz
¿Cómo devuelve un valor el notebook a Data Factory?
- [ ] Con print
- [x] Con `dbutils.notebook.exit(valor)`, que aparece como runOutput
- [ ] Escribiendo un archivo
- [ ] Con el último valor que imprime la celda final
:::

:::ejercicio quiz
¿Qué tipo de clúster conviene en producción?
- [ ] Un clúster interactivo siempre encendido
- [x] Un job cluster que se crea para la ejecución y se apaga al terminar
- [ ] El más grande disponible
- [ ] Un clúster compartido con todos los analistas
:::

:::ejercicio quiz
El notebook falló. ¿Qué abres primero?
- [ ] El linked service
- [x] El runPageUrl de la salida, que lleva a la ejecución en Databricks
- [ ] El trigger
- [ ] El Input de la actividad Copy anterior
:::
