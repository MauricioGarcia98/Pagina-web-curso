---
titulo: Catalog Explorer - dónde están los datos
nivel: 1 · Básico
duracion: 35
resumen: Todo dato en Databricks tiene un nombre de tres partes - catálogo.esquema.tabla. Recorrer el Catalog Explorer, entender qué son los catálogos samples, main y system, abrir una tabla y leer sus pestañas (columnas, muestra de datos, detalles, permisos, historial, linaje), y saltar de una tabla al editor SQL con un clic.
objetivos: Explicar el nombre de tres partes | Distinguir los catálogos samples, main y system | Leer las columnas y la muestra de una tabla | Saber qué muestra cada pestaña de una tabla | Consultar una tabla desde el explorador
prerrequisitos: databricks-paso-a-paso-workspace-y-primer-notebook
autoevaluacion: ¿Sabes qué significa samples.tienda.pedidos? | ¿Sabes en qué catálogo puedes crear tablas? | ¿Sabes dónde ver las columnas y sus tipos? | ¿Sabes qué hace el botón Query?
---

:::analogia En palabras simples
El catálogo es el plano de un archivo gigante: **catálogo** es el edificio, **esquema** es el piso y **tabla** es el cajón. `samples.tienda.pedidos` dice exactamente dónde está el cajón de los pedidos de la tienda. Con el plano no hace falta preguntarle a nadie dónde están las cosas.
:::

## Paso 1 — El nombre de tres partes

`samples.tienda.pedidos`, por partes:

| Parte | Nivel | Qué es |
|---|---|---|
| `samples` | Catálogo | El nivel más alto; suele separar entornos (dev, prod) o áreas |
| `tienda` | Esquema | Agrupa objetos de un tema o una capa (bronze, silver, gold) |
| `pedidos` | Objeto | La tabla (o vista, volumen, función, modelo) |

En SQL se usa completo (`SELECT * FROM samples.tienda.pedidos`) o se fija un catálogo y esquema por defecto con `USE CATALOG main; USE SCHEMA default;` y después solo `pedidos`.

## Paso 2 — El Catalog Explorer

Menú lateral → **Catalog**:

```captura
archivo: databricks/d03-catalogo.webp
texto: El árbol de catálogos (1), el filtro (2) y el botón para crear un catálogo (3)
```

| Catálogo | Qué es |
|---|---|
| **samples** | Las bases del curso, de solo lectura: `tienda`, `banco`, `clinica`, `delivery`, `energia`… cada una es un esquema con sus tablas |
| **main** | Tu catálogo: aquí creas tablas (empieza con el esquema `default`) |
| **system** | Tablas del sistema: `information_schema` (qué tablas y columnas existen), uso, auditoría |

Haz clic en **samples → tienda**:

```captura
archivo: databricks/d03-esquema.webp
texto: El esquema tienda y sus tablas - clientes, productos, pedidos, detalle_pedidos, pagos…
```

## Paso 3 — Una tabla por dentro

Haz clic en **pedidos**:

```captura
archivo: databricks/d03-tabla.webp
texto: Tipo, dueño y cantidad de filas (1), las pestañas (2) y el botón Query (3)
```

| Pestaña | Qué muestra |
|---|---|
| **Overview** | Las columnas con su tipo (`STRING`, `INT`, `DATE`…) y comentario |
| **Sample Data** | Las primeras filas, para ver cómo son los datos de verdad |
| **Details** | Formato (Delta), ubicación, tamaño, cantidad de archivos |
| **Permissions** | Quién puede leer y escribir |
| **History** | Las versiones de la tabla (cada escritura crea una) — nivel 3 |
| **Lineage** | De qué tablas viene y qué tablas se construyen con ella — nivel 4 |

```captura
archivo: databricks/d03-muestra.webp
texto: Sample Data - los pedidos tal cual están guardados
```

:::tip Mira la muestra antes de escribir SQL
Treinta segundos en **Sample Data** evitan media hora de consultas equivocadas: ves si `estado` está en minúsculas, cómo vienen las fechas, si hay nulos.
:::

## Paso 4 — De la tabla al SQL

El botón **Query** abre el editor SQL con `SELECT * FROM samples.tienda.pedidos LIMIT 100;` ya escrito. Es el camino más rápido para empezar a consultar una tabla que acabas de encontrar. El menú **⋯** permite editar el comentario de la tabla o crear un notebook que la explore.

:::errores
- **Invertir el orden del nombre.** Es `catalogo.esquema.tabla`: en `samples.tienda.pedidos`, `tienda` es el esquema.
- **Intentar escribir en catálogos de solo lectura.** `samples` es para leer; tus tablas van donde tienes permiso (en la práctica, `main`).
- **Filtrar sin mirar los valores.** Sample Data muestra cómo están escritos ("entregado" o "Entregado") antes de escribir el WHERE.
:::

## ✅ Lo que lograste

- Entiendes el nombre de tres partes.
- Sabes qué hay en `samples`, `main` y `system`.
- Lees una tabla desde el Catalog Explorer y saltas al SQL.

:::ejercicio quiz
En `samples.tienda.pedidos`, ¿qué es `tienda`?
- [ ] El catálogo
- [x] El esquema
- [ ] La tabla
- [ ] Una carpeta del workspace
:::

:::ejercicio quiz
¿En qué catálogo puedes crear tus tablas en la práctica?
- [ ] samples
- [x] main
- [ ] system
- [ ] En samples, que se puede escribir
:::

:::ejercicio quiz
Quieres ver cómo vienen escritos los valores de la columna estado. ¿Qué pestaña abres?
- [ ] Permissions
- [x] Sample Data
- [ ] Lineage
- [ ] Details
:::
