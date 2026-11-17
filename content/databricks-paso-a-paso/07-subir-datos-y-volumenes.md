---
titulo: Subir datos - de un CSV a una tabla Delta, y los volúmenes para archivos
nivel: 2 · Básico-intermedio
duracion: 45
resumen: Dos formas de meter datos propios en Databricks desde la interfaz - el asistente Add data, que convierte un CSV o JSON en una tabla Delta en tres clics, y los volúmenes de Unity Catalog, carpetas gobernadas para archivos que después lees con read_files o COPY INTO. Cuándo usar cada una y qué pasa con los tipos de datos.
objetivos: Crear una tabla Delta desde un archivo con Add data | Crear un volumen y subir archivos | Leer un archivo de un volumen con read_files | Distinguir tabla de volumen y cuándo usar cada uno | Revisar tipos y nombres de columnas al cargar
prerrequisitos: databricks-paso-a-paso-notebooks-a-fondo
autoevaluacion: ¿Sabes qué crea Add data? | ¿Sabes qué es un volumen? | ¿Sabes leer un CSV con read_files? | ¿Sabes por qué una columna de montos puede quedar como texto?
---

:::analogia En palabras simples
Una **tabla** es un estante ordenado: filas y columnas con tipos, listo para consultar. Un **volumen** es un cajón para archivos tal cual llegan (CSV, JSON, imágenes, PDF). Los datos suelen entrar al cajón primero y de ahí pasan al estante.
:::

## Paso 1 — El archivo de práctica

Crea en tu computadora un archivo `devoluciones.csv` con este contenido (un editor de texto alcanza; guárdalo con extensión `.csv`):

```text
pedido_id,fecha,categoria,canal,motivo,monto
1001,2024-11-02,Electrónica,web,defectuoso,129.90
1002,2024-11-02,Hogar,app,no le gustó,45.00
1003,2024-11-03,Electrónica,tienda,defectuoso,89.50
1004,2024-11-03,Ropa,web,talle incorrecto,32.00
1005,2024-11-04,Ropa,app,talle incorrecto,54.90
1006,2024-11-04,Hogar,web,llegó roto,210.00
1007,2024-11-05,Electrónica,web,no era lo pedido,399.00
1008,2024-11-05,Juguetes,tienda,defectuoso,25.50
1009,2024-11-06,Ropa,web,no le gustó,61.00
1010,2024-11-06,Electrónica,app,defectuoso,149.00
1011,2024-11-07,Hogar,tienda,llegó roto,78.00
1012,2024-11-07,Juguetes,web,no era lo pedido,19.90
```

## Paso 2 — Add data: de CSV a tabla

Menú **Data Engineering → Data Ingestion** (o **New → Add or upload data**):

```captura
archivo: databricks/d07-add-data.webp
texto: Crear una tabla desde un archivo (1), subir archivos a un volumen (2) o un pipeline de Lakeflow (3)
```

Elige **Create or modify table** y selecciona `devoluciones.csv`:

```captura
archivo: databricks/d07-preview.webp
texto: El catálogo (1), el esquema (2), el nombre de la tabla (3), la vista previa con los tipos detectados y Create table (4)
```

Revisa la vista previa antes de crear: los nombres de columna, y sobre todo los **tipos** (`monto` tiene que ser numérico, `fecha` una fecha). **Create table**:

```captura
archivo: databricks/d07-tabla-creada.webp
texto: La tabla main.default.devoluciones ya existe como tabla Delta administrada
```

:::cuidado Lo que el asistente adivina mal
Un CSV con punto y coma como separador, decimales con coma (`129,90`) o fechas como `02/11/2024` puede quedar con montos como texto o fechas mal interpretadas. Si la vista previa muestra `STRING` donde esperabas un número, arregla el archivo o crea la tabla con SQL (paso 4) indicando el formato.
:::

## Paso 3 — Volúmenes: archivos gobernados

Un volumen vive en un esquema, como una tabla, y hereda sus permisos. **Catalog → main → default → Create volume**:

```captura
archivo: databricks/d07-volumen-nuevo.webp
texto: Nombre del volumen (1) y el SQL equivalente que ejecuta el asistente (2)
```

Llámalo `raw`. Su ruta es `/Volumes/main/default/raw/`. Entra al volumen y usa **Upload to this volume** con el mismo CSV:

```captura
archivo: databricks/d07-volumen.webp
texto: Subir archivos al volumen (1) y, para cada archivo, Preview o Create table (2)
```

Desde la terminal del curso es lo mismo: `databricks fs cp devoluciones.csv dbfs:/Volumes/main/default/raw/`.

## Paso 4 — Leer el archivo con SQL

**Create table** junto al archivo abre el editor SQL con la consulta lista:

```sql norun
CREATE OR REPLACE TABLE main.default.devoluciones AS
SELECT * EXCEPT (_rescued_data)
FROM read_files('/Volumes/main/default/raw/devoluciones.csv', format => 'csv', header => true);
```

```captura
archivo: databricks/d07-read-files.webp
texto: read_files lee el archivo del volumen (1) y el resultado confirma las 12 filas (2)
```

- `read_files` lee archivos de un volumen o de una ubicación externa, infiere el esquema y agrega la columna `_rescued_data` con lo que no pudo interpretar; por eso se excluye al crear la tabla.
- También puedes solo consultarlo sin crear tabla: `SELECT * FROM read_files('/Volumes/main/default/raw/*.csv', format => 'csv', header => true)`.
- `COPY INTO` (nivel 3) carga archivos nuevos en una tabla existente sin repetir los ya cargados.

## Paso 5 — ¿Tabla o volumen?

| Situación | Usa |
|---|---|
| Datos tabulares para consultar y transformar | **Tabla** |
| Archivos que llegan de otro sistema y hay que guardar tal cual | **Volumen** (y de ahí a una tabla) |
| Imágenes, PDF, modelos, librerías | **Volumen** |
| Carga puntual de un CSV pequeño | **Add data** directo a tabla |
| Archivos que llegan todos los días | Volumen + `COPY INTO` o un **pipeline** (nivel 4) |

:::errores
- **Crear la tabla con montos como texto.** Después no suman; revisa separador y decimales en la vista previa.
- **Guardar archivos fuera de un volumen.** Sin volumen, los archivos no tienen los permisos de Unity Catalog.
- **Borrar el archivo original después de cargarlo.** Si hay dudas sobre la tabla, el original es la referencia.
:::

## ✅ Lo que lograste

- Creaste una tabla Delta desde un CSV con el asistente.
- Creaste un volumen, subiste un archivo y lo leíste con `read_files`.
- Sabes cuándo usar tabla y cuándo volumen.

:::ejercicio quiz
¿Qué es un volumen de Unity Catalog?
- [ ] Una tabla muy grande
- [x] Una carpeta gobernada para archivos, que vive en un esquema y hereda sus permisos
- [ ] Un tipo de cluster
- [ ] Un disco que se adjunta al cluster
:::

:::ejercicio quiz
La vista previa de Add data muestra la columna monto como STRING. ¿Qué haces?
- [ ] La creo igual y después la sumo
- [x] Reviso el archivo (separador, decimales) y la corrijo antes de crear la tabla, o la creo con SQL indicando el formato
- [ ] Borro la columna
- [ ] La sumo con CAST en cada consulta y dejo la tabla así
:::

:::ejercicio quiz
¿Qué hace `read_files('/Volumes/main/default/raw/devoluciones.csv', format => 'csv', header => true)`?
- [ ] Borra el archivo
- [x] Lee el CSV del volumen como una tabla, usando la primera fila como nombres de columna
- [ ] Sube el archivo al volumen
- [ ] Crea un volumen
:::
