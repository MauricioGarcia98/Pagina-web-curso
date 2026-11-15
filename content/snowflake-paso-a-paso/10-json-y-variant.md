---
titulo: JSON y VARIANT - datos semiestructurados sin esquema fijo
nivel: 3 · Intermedio
duracion: 45
resumen: Los eventos de la web llegan en JSON y cada uno trae campos distintos. Los guardas tal cual en una columna VARIANT, lees campos anidados con la notación de dos puntos y los conviertes con ::, y abres los arreglos en filas con LATERAL FLATTEN.
objetivos: Guardar JSON en una columna VARIANT | Leer campos anidados con columna:campo.sub | Convertir tipos con :: | Abrir arreglos en filas con LATERAL FLATTEN
prerrequisitos: snowflake-paso-a-paso-stages-y-copy-into
autoevaluacion: ¿Sabes qué tipo guarda JSON? | ¿Sabes leer datos:cliente.pais? | ¿Sabes para qué sirve ::string? | ¿Sabes qué devuelve FLATTEN?
---

## Paso 1 — Guardar JSON

```sql norun
CREATE TABLE eventos_web (datos VARIANT);

INSERT INTO eventos_web
SELECT PARSE_JSON('{"evento":"compra","cliente":{"id":5,"pais":"PE"},"items":[{"sku":"A1","cant":2},{"sku":"B7","cant":1}]}')
UNION ALL SELECT PARSE_JSON('{"evento":"compra","cliente":{"id":8,"pais":"CO"},"items":[{"sku":"C3","cant":4}]}')
UNION ALL SELECT PARSE_JSON('{"evento":"visita","cliente":{"id":12,"pais":"MX"},"items":[]}');
```

Una columna **VARIANT** guarda cualquier JSON (hasta 16 MB por valor) sin definir el esquema antes. Si mañana el evento trae un campo nuevo, no hay que cambiar la tabla.

## Paso 2 — Leer campos

```sql norun
SELECT datos:evento::string       AS evento,
       datos:cliente.id::int       AS cliente_id,
       datos:cliente.pais::string  AS pais
FROM eventos_web;
```

```captura
archivo: snowflake/s10-rutas.webp
texto: La consulta con la notación de dos puntos (1) y una fila por evento con su tipo, cliente y país (2)
```

| Sintaxis | Qué hace |
|---|---|
| `datos:evento` | El campo `evento` del JSON |
| `datos:cliente.pais` | Un campo anidado |
| `datos:items[0]` | El primer elemento de un arreglo |
| `::string`, `::int`, `::date` | Convierte el valor al tipo (sin `::` queda como VARIANT, con comillas) |

## Paso 3 — Abrir los arreglos

Cada compra trae una lista de ítems. Para tener una fila por ítem:

```sql norun
SELECT e.datos:cliente.pais::string AS pais,
       f.value:sku::string          AS sku,
       f.value:cant::int            AS cantidad,
       f.index                      AS posicion
FROM eventos_web e,
     LATERAL FLATTEN(input => e.datos:items) f;
```

```captura
archivo: snowflake/s10-flatten.webp
texto: LATERAL FLATTEN (1) - una fila por ítem: PE A1 y B7, CO C3; la visita sin ítems no aparece (2)
```

| Columna de FLATTEN | Qué es |
|---|---|
| `value` | El elemento del arreglo |
| `index` | Su posición, desde 0 |

:::tip Sin ítems
La visita no aparece porque su arreglo está vacío. Para conservarla, `FLATTEN(input => ..., outer => TRUE)` devuelve una fila con `value` nulo.
:::

## ✅ Lo que lograste

- Guardaste JSON en VARIANT.
- Leíste campos anidados y convertiste tipos.
- Abriste arreglos en filas con FLATTEN.

:::ejercicio quiz
¿Qué tipo de columna guarda JSON sin esquema fijo?
- [ ] VARCHAR(100)
- [x] VARIANT
- [ ] NUMBER
- [ ] DATE
:::

:::ejercicio quiz
¿Cómo lees el país dentro de cliente?
- [x] `datos:cliente.pais`
- [ ] `datos[cliente][pais]` con corchetes y sin dos puntos
- [ ] `JSON(datos, pais)`
- [ ] `datos.cliente->pais`
:::

:::ejercicio quiz
¿Para qué sirve `::string` al final?
- [ ] Para borrar el campo
- [x] Para convertir el valor VARIANT a texto
- [ ] Para ordenar
- [ ] No hace nada
:::

:::ejercicio quiz
¿Qué hace LATERAL FLATTEN sobre un arreglo de 2 ítems?
- [ ] Devuelve 1 fila con los 2 ítems juntos
- [x] Devuelve 2 filas, una por ítem, con value e index
- [ ] Borra el arreglo
- [ ] Da error
:::
