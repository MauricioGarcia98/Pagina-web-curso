---
titulo: Proyecto 3 (semiguiado) - la carga incremental de pedidos
nivel: 3 · Intermedio
duracion: 50
resumen: Al día siguiente llega un nuevo archivo con un pedido corregido y dos nuevos. Lo subes al mismo stage, compruebas que COPY INTO solo carga el archivo nuevo, y aplicas un MERGE que deja una fila por pedido, actualiza solo lo que cambió e inserta lo nuevo. Pistas escondidas.
objetivos: Cargar solo archivos nuevos con COPY INTO | Deduplicar la fuente con QUALIFY | Aplicar un MERGE incremental | Comprobar el resultado final
prerrequisitos: snowflake-paso-a-paso-merge
autoevaluacion: ¿COPY INTO saltó el archivo ya cargado? | ¿El MERGE usa una fila por pedido? | ¿Se actualizó el 90002 y se insertó el 90007? | ¿Sabes qué pasa si corres todo de nuevo?
---

:::escenario El pedido
Lucía: *"Llegó `pedidos_2026_11_15.csv`. Trae el 90002 corregido y los pedidos 90006 y 90007. Quiero `pedidos_actuales` al día sin duplicar nada."*
:::

## Lo que tienes que lograr

1. Subir `pedidos_2026_11_15.csv` a `@carga_pedidos` (el archivo del día anterior sigue ahí).
2. Cargarlo a `raw.pedidos_staging` con COPY INTO sin recargar el anterior.
3. MERGE a `analitica.pedidos_actuales` con una fila por pedido, actualizando solo si cambió el total.
4. Comprobar que quedan 7 pedidos y el 90002 con total 95.

<details><summary>💡 Pista 1: ¿y el archivo de ayer?</summary>

COPY INTO guarda qué archivos ya cargó en cada tabla (durante 64 días) y los saltea. No hace falta moverlos ni borrarlos. Para forzar una recarga existe `FORCE = TRUE`, con cuidado de no duplicar.
</details>

<details><summary>💡 Pista 2: el staging tiene el 90002 dos veces</summary>

El staging acumula las dos versiones del 90002. Antes del MERGE, deja una fila por pedido con `QUALIFY ROW_NUMBER() OVER (PARTITION BY pedido_id ORDER BY ...) = 1`.
</details>

## Cómo se ve terminado

```captura
archivo: snowflake/s12-copy.webp
texto: COPY INTO - el archivo del 14 en LOAD_SKIPPED (ya cargado) y el del 15 en LOADED con 3 filas
```

```captura
archivo: snowflake/s12-merge.webp
texto: El MERGE con la fuente deduplicada (1) - 1 pedido insertado (2)
```

```captura
archivo: snowflake/s12-final.webp
texto: pedidos_actuales con los 7 pedidos
```

:::errores
- **Forzar la recarga con `FORCE = TRUE` sin pensar.** COPY INTO saltea los archivos ya cargados para no duplicar; forzarla duplica filas.
- **No deduplicar la fuente.** Si el archivo trae dos versiones del mismo pedido, el MERGE falla o queda impredecible.
- **Probar una sola vez.** La carga incremental se valida corriéndola dos veces: la segunda no debe cambiar nada.
:::

## ✅ Lista de verificación

- [ ] El resultado de COPY INTO muestra el archivo del 14 como LOAD_SKIPPED.
- [ ] `pedidos_actuales` tiene 7 filas, una por pedido.
- [ ] El 90002 tiene total 95.
- [ ] Correr el COPY INTO y el MERGE otra vez no cambia nada.

<details><summary>💡 Solución comentada</summary>

```sql norun
USE SCHEMA tienda_dev.raw;
COPY INTO pedidos_staging
FROM @carga_pedidos
FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1);

USE SCHEMA tienda_dev.analitica;
MERGE INTO pedidos_actuales t
USING (SELECT * FROM tienda_dev.raw.pedidos_staging
       QUALIFY ROW_NUMBER() OVER (PARTITION BY pedido_id ORDER BY total DESC) = 1) s
ON t.pedido_id = s.pedido_id
WHEN MATCHED AND t.total <> s.total THEN UPDATE SET total = s.total
WHEN NOT MATCHED THEN INSERT (pedido_id, cliente_id, fecha, canal, total)
                      VALUES (s.pedido_id, s.cliente_id, s.fecha, s.canal, s.total);
```

El MERGE da **1 insertada, 0 actualizadas**: el 90006 y la corrección del 90002 ya estaban del ejercicio anterior, y solo falta el 90007. Es justo lo que se busca: **correrlo de nuevo no cambia nada**.

**Mejora para producción:** ordenar por una columna de "cuándo llegó" (por ejemplo `METADATA$FILE_LAST_MODIFIED` o una fecha de carga) en lugar de por `total`, para quedarte siempre con la versión más reciente.
</details>

## Lo que aprendiste en el nivel 3

- Stages y COPY INTO.
- JSON con VARIANT y FLATTEN.
- MERGE e ingesta incremental.

En el nivel 4: Time Travel, UNDROP, clones y SQL analítico.

:::ejercicio quiz
¿Qué hace COPY INTO con un archivo que ya cargó en esa tabla?
- [ ] Lo carga de nuevo y duplica
- [x] Lo saltea (LOAD_SKIPPED) gracias a su historial de cargas
- [ ] Lo borra del stage
- [ ] Da error
:::

:::ejercicio quiz
¿Por qué se deduplica la fuente antes del MERGE?
- [x] Porque si una clave aparece dos veces el MERGE puede fallar o ser impredecible
- [ ] Porque así COPY INTO carga más rápido
- [ ] Porque COPY INTO lo exige
- [ ] No hace falta
:::

:::ejercicio quiz
¿Qué logra `WHEN MATCHED AND t.total <> s.total`?
- [ ] Borra los que cambiaron
- [x] Actualiza solo los pedidos cuyo total cambió
- [ ] Inserta duplicados
- [ ] Inserta una fila nueva por cada cambio de total
:::

:::ejercicio quiz
¿Cuánto tiempo recuerda COPY INTO qué archivos cargó?
- [ ] 1 hora
- [ ] 7 días
- [x] 64 días
- [ ] Para siempre
:::
