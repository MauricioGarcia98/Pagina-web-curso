---
titulo: Bases, esquemas y tablas - armar un entorno ordenado
nivel: 2 · Básico-intermedio
duracion: 40
resumen: Creas la base tienda_dev con dos esquemas por capa (raw y analitica), una tabla con CREATE TABLE AS SELECT, la encuentras en el explorador y aprendes los tipos de tabla (permanente, transitoria, temporal) y una convención de nombres para que el equipo encuentre todo.
objetivos: Crear bases y esquemas | Crear una tabla con CTAS | Organizar por capas con esquemas | Distinguir tablas permanentes, transitorias y temporales
prerrequisitos: snowflake-paso-a-paso-warehouses
autoevaluacion: ¿Sabes qué hace CREATE TABLE AS SELECT? | ¿Sabes para qué separar raw y analitica? | ¿Sabes qué es una tabla transitoria? | ¿Sabes cambiar el esquema actual?
---

## Paso 1 — El entorno

```sql norun
CREATE DATABASE tienda_dev;
CREATE SCHEMA tienda_dev.raw;
CREATE SCHEMA tienda_dev.analitica;
USE SCHEMA tienda_dev.analitica;

CREATE TABLE ventas_por_canal AS
SELECT canal, COUNT(*) AS pedidos
FROM tienda_andina.public.pedidos
GROUP BY canal;

SELECT * FROM ventas_por_canal ORDER BY pedidos DESC;
```

Ejecuta todo con **Run all**:

```captura
archivo: snowflake/s06-crear.webp
texto: TIENDA_DEV con sus esquemas en el explorador (1), el contexto ya en TIENDA_DEV.ANALITICA (2) y las 6 sentencias ejecutadas (3)
```

| Sentencia | Qué hace |
|---|---|
| `CREATE DATABASE` | Crea la base (y su esquema `PUBLIC`) |
| `CREATE SCHEMA base.esquema` | Crea un esquema dentro de la base |
| `USE SCHEMA` | Cambia el contexto |
| `CREATE TABLE ... AS SELECT` (CTAS) | Crea la tabla con las columnas y filas del SELECT |

## Paso 2 — En el explorador

```captura
archivo: snowflake/s06-tabla.webp
texto: TIENDA_DEV / ANALITICA / VENTAS_POR_CANAL (1) y sus columnas CANAL y PEDIDOS (2)
```

## Paso 3 — Esquemas por capa

| Esquema | Qué guarda | Quién escribe |
|---|---|---|
| `raw` | Los datos tal como llegan | Las cargas |
| `analitica` | Tablas limpias y agregadas para el negocio | Las transformaciones |

Separar por esquema permite dar permisos distintos (los analistas leen `analitica`, no `raw`) y saber qué está listo para usar.

## Paso 4 — Tipos de tabla

| Tipo | Time Travel | Fail-safe | Para |
|---|---|---|---|
| **Permanente** (por defecto) | 1 día (hasta 90 en Enterprise) | 7 días | Datos que importan |
| **Transitoria** (`CREATE TRANSIENT TABLE`) | 0 o 1 día | No | Datos que se pueden volver a cargar: staging, intermedias |
| **Temporal** (`CREATE TEMPORARY TABLE`) | 0 o 1 día | No | Solo existe en tu sesión |

**Fail-safe** es una copia de recuperación que solo Snowflake puede restaurar; ocupa almacenamiento y por eso cuesta.

## ✅ Lo que lograste

- Creaste una base con esquemas por capa.
- Creaste una tabla con CTAS.
- Conoces los tipos de tabla.

:::ejercicio quiz
¿Qué hace CREATE TABLE ventas AS SELECT ...?
- [ ] Crea una vista
- [x] Crea una tabla con las columnas y filas que devuelve el SELECT
- [ ] Borra la tabla ventas
- [ ] Crea un esquema
:::

:::ejercicio quiz
¿Para qué separar los esquemas raw y analitica?
- [x] Para ordenar por capa y dar permisos distintos a cada una
- [ ] Porque Snowflake lo exige
- [ ] Para gastar menos créditos siempre
- [ ] No sirve
:::

:::ejercicio quiz
¿Qué tabla conviene para un staging que se recarga cada día?
- [ ] Permanente con 90 días de Time Travel
- [x] Transitoria
- [ ] Ninguna
- [ ] Una vista
:::

:::ejercicio quiz
¿Qué esquema crea Snowflake al crear una base?
- [ ] RAW
- [x] PUBLIC
- [ ] MAIN
- [ ] DEFAULT
:::
