---
titulo: ADLS Gen2 y las capas del lago (bronze, silver, gold)
nivel: 2 · Básico-intermedio
duracion: 35
resumen: Qué cambia el espacio de nombres jerárquico - carpetas reales, permisos por carpeta y el endpoint dfs - y cómo se organiza un data lake por capas. Lees los endpoints blob y dfs, armas la dirección abfss:// que usan Spark, Databricks y Fabric, usas el Storage browser y defines una convención de carpetas para Tienda Andina que el resto del curso respeta.
objetivos: Explicar qué agrega ADLS Gen2 sobre Blob Storage | Leer los endpoints blob y dfs de una cuenta | Armar una dirección abfss:// para Spark | Organizar el lago en bronze, silver y gold con una convención de carpetas | Usar el Storage browser
prerrequisitos: azure-paso-a-paso-contenedores-y-blobs
autoevaluacion: ¿Sabes qué endpoint usa Spark para ADLS Gen2? | ¿Sabes armar una dirección abfss://? | ¿Sabes qué va en cada capa? | ¿Sabes por qué renombrar una carpeta es más rápido en ADLS Gen2?
---

## Paso 1 — Qué agrega ADLS Gen2

En Blob Storage común, las "carpetas" son solo parte del nombre del archivo: renombrar `pedidos/` a `ventas/` obliga a copiar cada archivo. Con el **espacio de nombres jerárquico** (ADLS Gen2):

| Característica | Blob común | ADLS Gen2 |
|---|---|---|
| Carpetas | Simuladas (prefijo del nombre) | **Reales** |
| Renombrar o mover una carpeta | Copia archivo por archivo | **Una sola operación**, instantánea |
| Permisos | Por cuenta o contenedor | También **por carpeta y archivo** (ACL estilo POSIX) |
| Endpoint para analítica | `blob` | `dfs` (Data Lake) |
| Lo usan | Aplicaciones en general | **Spark, Databricks, Fabric, Synapse, Data Factory** |

Renombrar es lo que hace un job de Spark al terminar de escribir: escribe en una carpeta temporal y la renombra. Con ADLS Gen2 eso es rápido y atómico.

## Paso 2 — Los endpoints

En el **Overview** de `sttiendaandinadev`, baja hasta **Endpoints**:

```captura
archivo: azure/b06-endpoints.webp
texto: Los endpoints - Blob service, Data Lake Storage y la dirección abfss para Databricks
```

| Endpoint | Dirección | Quién lo usa |
|---|---|---|
| **Blob** | `https://sttiendaandinadev.blob.core.windows.net/` | El portal, aplicaciones, `az storage blob` |
| **Data Lake (dfs)** | `https://sttiendaandinadev.dfs.core.windows.net/` | Herramientas de analítica |

## Paso 3 — La dirección abfss://

Spark, Databricks y Fabric leen ADLS Gen2 con el esquema **abfss** (*Azure Blob File System, Secure*):

```text
abfss://<contenedor>@<cuenta>.dfs.core.windows.net/<ruta>
```

Para los pedidos de noviembre:

```text
abfss://bronze@sttiendaandinadev.dfs.core.windows.net/pedidos/2026/11/
```

En un notebook de Databricks se lee así (con los permisos configurados, que ves en el nivel 4):

```python norun
df = spark.read.option("header", True).csv(
    "abfss://bronze@sttiendaandinadev.dfs.core.windows.net/pedidos/2026/11/"
)
df.show()
```

:::nota Unity Catalog
En Databricks moderno, en lugar de escribir la dirección en cada notebook, un administrador registra la cuenta como **external location** en Unity Catalog y da permisos por tabla. La dirección `abfss://` sigue siendo la que hay debajo.
:::

## Paso 4 — El Storage browser

Menú **Storage browser**:

```captura
archivo: azure/b06-navegador.webp
texto: Storage browser (1) - los contenedores del lago (2)
```

Es el explorador de archivos del portal: contenedores, carpetas, subir, descargar y borrar. En tu computadora, la herramienta equivalente es **Azure Storage Explorer** (gratis, de Microsoft).

## Paso 5 — La convención de capas de Tienda Andina

| Capa | Qué guarda | Formato | Quién escribe | Ejemplo de ruta |
|---|---|---|---|---|
| **bronze** | Lo que llega, sin tocar | Igual que el origen (CSV, JSON) | Data Factory o la ingesta | `bronze/pedidos/2026/11/15/pedidos.csv` |
| **silver** | Limpio, tipado y sin duplicados | Delta o Parquet | Databricks | `silver/pedidos/` (tabla Delta) |
| **gold** | Agregado y listo para el negocio | Delta | Databricks | `gold/ventas_diarias/` |

Reglas que el equipo acuerda:

1. **Bronze no se modifica**: si un archivo vino mal, se vuelve a cargar, no se edita.
2. Bronze se organiza por **fuente y fecha de llegada**; silver y gold, por **tema**.
3. Nadie fuera del equipo de datos escribe en el lago; los analistas **leen gold**.

:::analogia La cocina de un restaurante
Bronze es la mercadería tal como llega del proveedor. Silver es la mercadería lavada, cortada y en recipientes rotulados. Gold son los platos listos para servir. Nadie sirve la mercadería sin lavar, y nadie tira la caja original hasta estar seguro.
:::

## ✅ Lo que lograste

- Sabes qué agrega ADLS Gen2 y por qué importa para Spark.
- Lees los endpoints y armas la dirección `abfss://`.
- Tienes una convención de capas y carpetas para el resto del curso.

:::ejercicio quiz
¿Qué endpoint usa Spark para leer ADLS Gen2?
- [ ] `blob.core.windows.net`
- [x] `dfs.core.windows.net`
- [ ] `file.core.windows.net`
- [ ] `queue.core.windows.net`
:::

:::ejercicio quiz
¿Cuál es la dirección correcta de la carpeta `clientes` del contenedor `bronze`?
- [ ] `abfss://sttiendaandinadev@bronze.dfs.core.windows.net/clientes/`
- [x] `abfss://bronze@sttiendaandinadev.dfs.core.windows.net/clientes/`
- [ ] `https://bronze.blob.core.windows.net/clientes/`
- [ ] `abfss://sttiendaandinadev/bronze/clientes/`
:::

:::ejercicio quiz
Un archivo de pedidos llegó con un error. ¿Qué haces en bronze?
- [ ] Lo edito a mano para corregirlo
- [x] No lo modifico: pido que se vuelva a enviar y lo cargo de nuevo
- [ ] Lo muevo a gold
- [ ] Lo borro y no aviso
:::

:::ejercicio quiz
¿Por qué un job de Spark termina más rápido en ADLS Gen2 que en Blob común?
- [ ] Porque ADLS Gen2 tiene discos más rápidos
- [x] Porque renombrar la carpeta temporal al terminar es una sola operación
- [ ] Porque no cifra los datos
- [ ] Porque usa menos réplicas
:::
