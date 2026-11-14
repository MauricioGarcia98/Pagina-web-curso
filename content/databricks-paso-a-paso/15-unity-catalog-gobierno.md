---
titulo: Unity Catalog - catálogos, esquemas, permisos, linaje y tablas del sistema
nivel: 4 · Intermedio-avanzado
duracion: 50
resumen: Unity Catalog es el gobierno del lakehouse - quién ve qué, de dónde viene cada tabla y qué hay en cada lugar. Crear catálogos y esquemas con criterio (entornos, áreas, capas), dar y quitar permisos con la interfaz y con GRANT, cómo se heredan, el linaje entre tablas, comentarios y etiquetas, grupos en lugar de personas, y las tablas del sistema para responder preguntas sobre el propio workspace.
objetivos: Diseñar la jerarquía catálogo-esquema de un equipo | Dar permisos con la interfaz y con GRANT, y entender la herencia | Leer el linaje de una tabla | Documentar con comentarios y etiquetas | Consultar information_schema
prerrequisitos: databricks-paso-a-paso-pipelines-declarativos
autoevaluacion: ¿Sabes qué permisos necesita alguien para leer una tabla? | ¿Sabes qué hereda un esquema de su catálogo? | ¿Sabes de dónde sale el linaje? | ¿Sabes por qué los permisos se dan a grupos?
---

:::analogia En palabras simples
Unity Catalog es el conserje del edificio de datos: tiene el plano (qué hay en cada piso), las llaves (quién entra a qué) y el libro de visitas (quién usó qué y de dónde salió cada cosa). Sin conserje, cada equipo guarda copias en su cajón y nadie sabe cuál es la buena.
:::

## Paso 1 — Diseñar catálogos y esquemas

| Nivel | Criterio habitual | Ejemplo |
|---|---|---|
| **Catálogo** | Entorno o área de negocio | `dev`, `prod`; o `ventas`, `finanzas` |
| **Esquema** | Capa o dominio | `bronze`, `silver`, `gold`; o `pedidos`, `clientes` |
| **Tabla / vista / volumen / función / modelo** | El objeto | `pedidos_silver` |

Crea el catálogo `ventas_dev` desde **Catalog → Create catalog**:

```captura
archivo: databricks/d15-nuevo-catalogo.webp
texto: Nombre y comentario (1), y el SQL que ejecuta el asistente (2)
```

```captura
archivo: databricks/d15-catalogo-nuevo.webp
texto: El catálogo nuevo - crear esquemas (1) y administrar permisos (2)
```

Dentro, el esquema `silver`. En SQL es lo mismo: `CREATE CATALOG ventas_dev; CREATE SCHEMA ventas_dev.silver;`

## Paso 2 — Permisos

Para que alguien lea `main.default.ventas_por_canal` necesita **tres** cosas, una por nivel:

```text
USE CATALOG  en main
USE SCHEMA   en main.default
SELECT       en la tabla (o en el esquema, o en el catálogo: se hereda hacia abajo)
```

Pestaña **Permissions** de la tabla → **Grant**:

```captura
archivo: databricks/d15-grant.webp
texto: A quién (1) - un usuario, grupo o service principal - y qué privilegios (2)
```

```captura
archivo: databricks/d15-permisos.webp
texto: La tabla de permisos después del Grant
```

En SQL:

```sql norun
GRANT USE CATALOG ON CATALOG main TO `analistas`;
GRANT USE SCHEMA ON SCHEMA main.default TO `analistas`;
GRANT SELECT ON TABLE main.default.ventas_por_canal TO `analistas`;
SHOW GRANTS ON TABLE main.default.ventas_por_canal;
REVOKE SELECT ON TABLE main.default.ventas_por_canal FROM `analistas`;
```

| Privilegio | Permite |
|---|---|
| `USE CATALOG`, `USE SCHEMA` | Entrar al nivel (sin esto, lo de abajo no sirve) |
| `SELECT` | Leer |
| `MODIFY` | Insertar, actualizar, borrar |
| `CREATE TABLE`, `CREATE SCHEMA`, `CREATE VOLUME` | Crear objetos |
| `ALL PRIVILEGES` | Todo |
| **Owner** | Quien creó el objeto: puede todo y da permisos |

:::tip Grupos, no personas
Da permisos a grupos (`analistas`, `equipo-datos`) y agrega personas a los grupos. Cuando alguien entra o se va, cambias el grupo, no cincuenta tablas. Los grupos se administran en **Settings → Identity and access** (en Databricks real, en la consola de la cuenta, sincronizados desde el directorio de la empresa).
:::

## Paso 3 — Linaje

```captura
archivo: databricks/d15-linaje.webp
texto: Lineage de pedidos_silver - viene de pedidos_bronze y alimenta pedidos_por_dia
```

El linaje se captura **solo**: cada vez que una consulta, un notebook o un pipeline escribe una tabla a partir de otras, Unity Catalog anota de dónde salió. Sirve para responder "si cambio esta columna, ¿qué se rompe?" y "¿de qué fuente viene este número del tablero?".

## Paso 4 — Documentar: comentarios y etiquetas

```sql norun
COMMENT ON TABLE main.default.ventas_por_canal IS 'Pedidos por canal, fuente samples.tienda.pedidos, se recalcula a diario';
ALTER TABLE main.default.clientes_demo ALTER COLUMN email COMMENT 'Correo del cliente (dato personal)';
ALTER TABLE main.default.clientes_demo ALTER COLUMN email SET TAGS ('pii' = 'email');
```

Los comentarios aparecen en el Catalog Explorer y los usa el buscador y Genie; las **etiquetas** permiten encontrar todos los datos personales del workspace.

## Paso 5 — Tablas del sistema

El catálogo `system` responde preguntas sobre el propio workspace:

```sql norun
-- qué tablas hay y quién es dueño
SELECT table_catalog, table_schema, table_name, table_owner
FROM system.information_schema.tables
WHERE table_catalog = 'main';

-- columnas con etiqueta pii
SELECT * FROM system.information_schema.column_tags WHERE tag_name = 'pii';
```

En Databricks real hay además `system.billing.usage` (costo por cluster, job y etiqueta), `system.access.audit` (quién hizo qué) y `system.query.history`.

## ✅ Lo que lograste

- Diseñas catálogos y esquemas con criterio.
- Das permisos por nivel, a grupos, con la interfaz y con SQL.
- Lees el linaje, documentas y consultas `information_schema`.

:::ejercicio quiz
Le diste SELECT en la tabla a analistas y no pueden leerla. ¿Qué falta, probablemente?
- [ ] MODIFY
- [x] USE CATALOG en el catálogo y USE SCHEMA en el esquema
- [ ] ALL PRIVILEGES
- [ ] Nada, es un error de Databricks
:::

:::ejercicio quiz
¿De dónde sale el linaje de una tabla?
- [ ] Lo escribe a mano el dueño
- [x] Unity Catalog lo captura solo cuando una consulta, notebook o pipeline escribe la tabla a partir de otras
- [ ] De los comentarios
- [ ] De la pestaña Details
:::

:::ejercicio quiz
¿Por qué conviene dar permisos a grupos?
- [ ] Porque es obligatorio
- [x] Porque al entrar o salir una persona cambias el grupo, no cada objeto
- [ ] Porque es más barato
- [ ] Porque los usuarios no pueden tener permisos
:::

:::ejercicio quiz
¿Qué consulta responde "qué tablas hay en main y quién es dueño de cada una"?
- [ ] SHOW GRANTS
- [x] SELECT … FROM system.information_schema.tables WHERE table_catalog = 'main'
- [ ] DESCRIBE HISTORY
- [ ] SELECT * FROM main
:::
