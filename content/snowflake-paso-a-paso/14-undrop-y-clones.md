---
titulo: UNDROP y clones - deshacer un DROP y copiar entornos sin duplicar datos
nivel: 4 · Intermedio-avanzado
duracion: 35
resumen: Recuperas una tabla borrada con UNDROP y creas tienda_qa como clon de tienda_dev en segundos. Entiendes cómo funciona el zero-copy clone (comparte las micro-particiones hasta que algo cambia), para qué se usa (pruebas, QA, análisis puntuales) y cómo combinarlo con Time Travel.
objetivos: Recuperar una tabla, esquema o base con UNDROP | Clonar tablas, esquemas y bases | Explicar el zero-copy clone y su costo | Usar clones para pruebas y QA
prerrequisitos: snowflake-paso-a-paso-time-travel
autoevaluacion: ¿Sabes qué hace UNDROP? | ¿Sabes cuánto almacenamiento ocupa un clon recién creado? | ¿Sabes clonar una tabla como estaba ayer? | ¿Sabes para qué sirve un clon de la base?
---

## Paso 1 — UNDROP

```sql norun
USE SCHEMA tienda_dev.analitica;
DROP TABLE ventas_por_canal;
UNDROP TABLE ventas_por_canal;
SELECT * FROM ventas_por_canal;
```

```captura
archivo: snowflake/s14-undrop.webp
texto: DROP y UNDROP (1) - la tabla vuelve con sus 4 filas (2)
```

`UNDROP` funciona mientras la tabla esté dentro de su retención de Time Travel. También existe `UNDROP SCHEMA` y `UNDROP DATABASE`.

## Paso 2 — Clonar una base

```sql norun
CREATE DATABASE tienda_qa CLONE tienda_dev;
SHOW SCHEMAS IN DATABASE tienda_qa;
```

```captura
archivo: snowflake/s14-clone.webp
texto: TIENDA_QA en el explorador con las mismas tablas (1) y sus esquemas (2)
```

:::analogia Zero-copy clone
Un clon es como una fotocopia que **no gasta papel** hasta que la escribes: al crearlo comparte las mismas micro-particiones que el original, así que no ocupa almacenamiento extra ni tarda aunque la base tenga terabytes. Solo lo que cambies en el clon (o en el original) después ocupa espacio nuevo.
:::

## Paso 3 — Para qué sirve

| Uso | Cómo |
|---|---|
| Probar un cambio sin riesgo | `CREATE DATABASE tienda_qa CLONE tienda_prod;` y probar ahí |
| Entorno de QA con datos reales | Un clon nuevo cada mañana |
| Analizar "cómo estaba ayer" | `CREATE TABLE pedidos_ayer CLONE pedidos AT(OFFSET => -86400);` |
| Copia de seguridad antes de una migración | Clonar la tabla antes de tocarla |

:::cuidado Los clones no copian todo
Un clon de base o esquema copia tablas, vistas y otros objetos, y los permisos sobre los objetos hijos; pero no copia los stages internos con sus archivos, ni el historial de cargas de COPY INTO. Revisa la documentación antes de clonar producción.
:::

:::errores
- **`UNDROP` cuando ya existe otra tabla con ese nombre.** Falla; renombra la tabla nueva antes de recuperar la borrada.
- **Creer que un clon es una vista.** Es una tabla independiente: lo que cambies en el clon no toca el original.
- **Dejar clones viejos para siempre.** Al principio no ocupan espacio, pero cada cambio sobre el clon o el original va sumando almacenamiento propio.
:::

## ✅ Lo que lograste

- Recuperaste una tabla con UNDROP.
- Clonaste una base entera.
- Sabes cuándo usar clones.

:::ejercicio quiz
¿Qué hace UNDROP TABLE?
- [ ] Borra la tabla para siempre
- [x] Recupera una tabla borrada mientras esté dentro de la retención de Time Travel
- [ ] Clona la tabla
- [ ] Recupera la tabla desde Fail-safe, sin límite de tiempo
:::

:::ejercicio quiz
¿Cuánto almacenamiento extra ocupa un clon recién creado?
- [x] Prácticamente nada: comparte las micro-particiones del original
- [ ] El doble de la base
- [ ] Lo mismo que el original
- [ ] La mitad del original, por la compresión
:::

:::ejercicio quiz
¿Cómo creas una copia de la tabla como estaba hace un día?
- [ ] `UNDROP pedidos AT(OFFSET => -86400)`
- [x] `CREATE TABLE pedidos_ayer CLONE pedidos AT(OFFSET => -86400);`
- [ ] `COPY INTO pedidos_ayer`
- [ ] `UNDROP pedidos`
:::

:::ejercicio quiz
Quieres probar una migración riesgosa con datos reales. ¿Qué haces?
- [ ] La pruebas en producción
- [x] La pruebas en un clon de la base
- [ ] La pruebas en producción, de noche y con un backup
- [ ] La pruebas en una vista de la base
:::
