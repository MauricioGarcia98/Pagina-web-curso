---
titulo: El modelo - relaciones, cardinalidad, dirección del filtro y propiedades
nivel: 2 · Básico-intermedio
duracion: 50
resumen: El modelo es el corazón de Power BI - de cómo se relacionan las tablas dependen todos los números. La vista Modelo, el esquema en estrella, qué es una relación y sus propiedades (cardinalidad, dirección, activa o inactiva), Administrar relaciones, crear y editar una, y el panel Propiedades de tablas y columnas (descripción, oculto, categoría de datos, resumir por, ordenar por columna).
objetivos: Leer un modelo en estrella en la vista Modelo | Entender cardinalidad y dirección del filtro | Crear y editar relaciones | Usar el panel Propiedades en columnas y tablas | Evitar los errores de modelado más comunes
prerrequisitos: powerbi-paso-a-paso-transformaciones-que-mas-se-usan
autoevaluacion: ¿Sabes qué significa *:1? | ¿Sabes hacia dónde viaja el filtro en una relación única? | ¿Sabes por qué un ID no debe resumirse? | ¿Sabes qué pasa si dos tablas no están relacionadas?
---

:::analogia En palabras simples
Las tablas son personas en una reunión; las relaciones son quién conoce a quién. Si alguien pregunta "¿cuánto vendimos por categoría?", la pregunta tiene que pasar de **categorias** a **productos** a **detalle_pedidos**. Si falta un eslabón, la respuesta sale mal (todas las categorías con el mismo número).
:::

## Paso 1 — La vista Modelo

Haz clic en la tercera vista de la barra izquierda:

```captura
archivo: powerbi/b07-modelo.webp
texto: El diagrama con las tablas y sus relaciones (1), el panel Propiedades (2) y la lista de relaciones del modelo (3)
```

Tienda Andina es un **esquema en estrella**:

| Tipo | Tablas | Qué tienen |
|---|---|---|
| **Hechos** | `detalle_pedidos`, `pedidos` | Una fila por evento (una línea de pedido, un pedido); muchas filas, números y claves |
| **Dimensiones** | `clientes`, `productos`, `categorias` (y la `Calendario` que harás en el nivel 3) | Quién, qué, cuándo: pocas filas, descripciones para filtrar y agrupar |

## Paso 2 — Qué es una relación

Una línea entre dos tablas dice "esta columna de acá se corresponde con esa de allá". `pedidos[cliente_id]` → `clientes[cliente_id]`:

| Propiedad | En el ejemplo | Significa |
|---|---|---|
| **Cardinalidad** | Varios a uno (*:1) | Muchos pedidos para un mismo cliente; cada cliente aparece una sola vez en `clientes` |
| **Dirección del filtro cruzado** | Única | El filtro viaja de `clientes` (lado 1) a `pedidos` (lado *): filtrar un país filtra sus pedidos |
| **Activa** | Sí (línea continua) | Se usa siempre. Entre dos tablas solo una relación puede estar activa |

## Paso 3 — Administrar relaciones

**Modelado → Administrar relaciones**:

```captura
archivo: powerbi/b07-relaciones.webp
texto: Las relaciones del modelo con su cardinalidad, dirección y si están activas; Nueva relación y Detección automática
```

**Editar** abre el detalle:

```captura
archivo: powerbi/b07-editar-relacion.webp
texto: Las dos tablas y columnas, la cardinalidad, la dirección y la casilla de relación activa, con una vista previa de las filas
```

También se crea una relación **arrastrando** una columna sobre la equivalente de otra tabla en el diagrama.

:::cuidado La dirección Ambas
La dirección **Ambas** hace que el filtro viaje en los dos sentidos. Parece cómodo, pero con varias tablas crea caminos ambiguos y números difíciles de explicar. Usa **Única** salvo que sepas exactamente por qué necesitas lo contrario.
:::

## Paso 4 — El panel Propiedades

Haz clic en una columna del diagrama, por ejemplo `pedidos[cliente_id]`:

```captura
archivo: powerbi/b07-propiedades-columna.webp
texto: Nombre, descripción, sinónimos, carpeta, oculto, tipo de datos, ordenar por columna, categoría de datos y resumir por
```

| Propiedad | Para qué |
|---|---|
| **Descripción** | Aparece al pasar el mouse en el panel Datos; ayuda a quien use el modelo |
| **Está oculto** | Oculta claves técnicas (`cliente_id`) para que el usuario vea solo lo útil; las relaciones siguen funcionando |
| **Categoría de datos** | País o región, Ciudad, Latitud… le dice al mapa cómo interpretar la columna |
| **Resumir por** | **No resumir** para IDs y años (sumar `cliente_id` no tiene sentido) |
| **Ordenar por columna** | Que los meses se ordenen por número y no alfabéticamente |

```captura
archivo: powerbi/b07-propiedades-precio.webp
texto: Una columna numérica - precio se resume por Suma por defecto
```

Y en una tabla:

```captura
archivo: powerbi/b07-propiedades-tabla.webp
texto: Las propiedades de la tabla pedidos - descripción, sinónimos, marcar como tabla de fechas y jerarquías
```

## Paso 5 — Errores clásicos

| Síntoma | Causa probable |
|---|---|
| Todas las categorías muestran el mismo número | Falta la relación entre la tabla del eje y la de los valores |
| Los totales se duplican | Relación de muchos a muchos o una dimensión con claves repetidas |
| Un filtro no afecta un gráfico | La relación va en la dirección contraria o está inactiva |
| Aparecen `cliente_id` sumados en un gráfico | Falta **Resumir por: No resumir** |

## ✅ Lo que lograste

- Lees un modelo en estrella.
- Entiendes cardinalidad, dirección y relaciones activas.
- Usas el panel Propiedades y reconoces los errores típicos.

:::ejercicio quiz
En una relación *:1 con dirección Única entre pedidos y clientes, ¿hacia dónde viaja el filtro?
- [ ] De pedidos a clientes
- [x] De clientes (lado 1) a pedidos (lado *)
- [ ] En ambos sentidos
- [ ] No viaja
:::

:::ejercicio quiz
Un gráfico de ventas por categoría muestra el mismo total en todas las categorías. ¿Qué revisas?
- [ ] El color del gráfico
- [x] Que exista la cadena de relaciones de categorias a productos a detalle_pedidos
- [ ] El tema
- [ ] La segmentación
:::

:::ejercicio quiz
¿Por qué ocultar las columnas de ID en el panel Datos?
- [ ] Porque rompen las relaciones
- [x] Para que el usuario vea solo los campos útiles; las relaciones siguen funcionando
- [ ] Para que el archivo pese menos
- [ ] No conviene ocultarlas
:::
