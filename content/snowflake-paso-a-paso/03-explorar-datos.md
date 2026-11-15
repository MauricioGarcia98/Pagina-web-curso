---
titulo: Explorar datos - bases, esquemas, columnas y vista previa
nivel: 1 · Básico
duracion: 25
resumen: Antes de escribir SQL conviene saber qué hay. Recorres Data → Databases, abres la tabla PEDIDOS, lees sus columnas y tipos, miras una vista previa y aprendes los tipos de datos de Snowflake que más vas a ver.
objetivos: Navegar bases y esquemas | Leer columnas y tipos de una tabla | Ver una vista previa de los datos | Reconocer los tipos de datos principales de Snowflake
prerrequisitos: snowflake-paso-a-paso-hojas-sql-y-contexto
autoevaluacion: ¿Sabes dónde ver las columnas de una tabla? | ¿Sabes qué tipo usa Snowflake para números? | ¿Sabes qué es SNOWFLAKE_SAMPLE_DATA? | ¿Sabes abrir una tabla en una hoja?
---

## Paso 1 — Databases

**Data → Databases**:

```captura
archivo: snowflake/s03-databases.webp
texto: El explorador (1) y la lista de bases (2) - SNOWFLAKE_SAMPLE_DATA y TIENDA_ANDINA
```

`SNOWFLAKE_SAMPLE_DATA` es la base de muestra que trae toda cuenta de Snowflake (datos TPC-H, por ejemplo). `TIENDA_ANDINA` es la base del curso.

## Paso 2 — Una tabla

Abre `TIENDA_ANDINA → PUBLIC → PEDIDOS`:

```captura
archivo: snowflake/s03-columnas.webp
texto: Las pestañas Columns y Data Preview (1) y las columnas con su tipo (2)
```

| Tipo de Snowflake | Para |
|---|---|
| `NUMBER(38,0)` / `NUMBER(10,2)` | Enteros y decimales (`INT` es un alias de `NUMBER(38,0)`) |
| `VARCHAR` | Texto (sin largo, ocupa solo lo que usa) |
| `DATE`, `TIMESTAMP_NTZ`, `TIMESTAMP_TZ` | Fechas y fechas con hora |
| `BOOLEAN` | Verdadero o falso |
| `VARIANT` | JSON y datos semiestructurados (nivel 3) |

## Paso 3 — Vista previa

**Data Preview**:

```captura
archivo: snowflake/s03-preview.webp
texto: Las primeras filas de PEDIDOS
```

**Open in Worksheet** abre una hoja con `SELECT * FROM ... LIMIT 100` y el contexto ya puesto.

:::cuidado La vista previa también usa el warehouse
Ver datos ejecuta una consulta, así que enciende el warehouse y consume créditos. En tablas enormes, usa siempre `LIMIT`.
:::

## ✅ Lo que lograste

- Navegas bases, esquemas y tablas.
- Lees columnas y tipos.
- Sabes ver datos sin escribir SQL.

:::ejercicio quiz
¿Dónde ves las columnas y tipos de una tabla sin escribir SQL?
- [x] Data → Databases → la tabla → Columns
- [ ] En Query History
- [ ] En Warehouses
- [ ] En Marketplace
:::

:::ejercicio quiz
¿Qué tipo usa Snowflake para JSON?
- [ ] VARCHAR(16)
- [ ] NUMBER
- [x] VARIANT
- [ ] BOOLEAN
:::

:::ejercicio quiz
¿Ver la vista previa de una tabla gasta créditos?
- [ ] No, nunca
- [x] Sí, ejecuta una consulta con el warehouse
- [ ] Solo los domingos
- [ ] Solo si es ACCOUNTADMIN
:::

:::ejercicio quiz
¿Qué es SNOWFLAKE_SAMPLE_DATA?
- [ ] Una base que hay que comprar
- [x] La base de datos de muestra que trae toda cuenta
- [ ] Un warehouse
- [ ] Un rol
:::
