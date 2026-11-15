---
titulo: Hojas SQL y el contexto - rol, warehouse, base y esquema
nivel: 1 · Básico
duracion: 35
resumen: Las worksheets son donde se escribe y ejecuta SQL. Creas una hoja, entiendes los cuatro datos de contexto que decide cada consulta (rol, warehouse, base y esquema), ejecutas la sentencia del cursor o todas, y lees el resultado con su Query ID, duración y filas.
objetivos: Crear y nombrar una hoja SQL | Entender el contexto de la sesión | Ejecutar una sentencia o todas | Leer el resultado y los Query Details
prerrequisitos: snowflake-paso-a-paso-que-es-snowflake-y-snowsight
autoevaluacion: ¿Sabes qué cuatro datos forman el contexto? | ¿Sabes qué hace Ctrl+Enter? | ¿Sabes qué es el Query ID? | ¿Sabes cambiar de rol o de warehouse?
---

## Paso 1 — Una hoja nueva

**+ SQL Worksheet** (o **Create → SQL Worksheet**). Ponle nombre y escribe:

```sql norun
-- Pedidos de la tienda por canal de venta
SELECT canal, COUNT(*) AS pedidos
FROM pedidos
GROUP BY canal
ORDER BY pedidos DESC;
```

```captura
archivo: snowflake/s02-hoja.webp
texto: El nombre de la hoja (1), el rol y el warehouse (2), la base y el esquema (3), el botón de ejecutar (4) y el explorador de objetos (5)
```

## Paso 2 — El contexto

Cada consulta corre con cuatro datos de contexto:

| Dato | Qué decide | Cómo se cambia |
|---|---|---|
| **Rol** | Qué puedes ver y hacer | `USE ROLE sysadmin;` o el selector |
| **Warehouse** | Con qué cómputo corre (y quién paga) | `USE WAREHOUSE compute_wh;` |
| **Base** | Dónde buscar las tablas sin nombre completo | `USE DATABASE tienda_andina;` |
| **Esquema** | Ídem, dentro de la base | `USE SCHEMA tienda_andina.public;` |

Como el contexto es `TIENDA_ANDINA.PUBLIC`, `FROM pedidos` encuentra `TIENDA_ANDINA.PUBLIC.PEDIDOS`.

```captura
archivo: snowflake/s02-contexto.webp
texto: El selector de rol y warehouse - roles del sistema y COMPUTE_WH (X-Small)
```

## Paso 3 — Ejecutar

| Atajo | Qué ejecuta |
|---|---|
| **Ctrl+Enter** o ▶ | La sentencia donde está el cursor (o lo seleccionado) |
| **Ctrl+Shift+Enter** o Run all | Todas las sentencias de la hoja, en orden |

## Paso 4 — El resultado

```captura
archivo: snowflake/s02-resultado.webp
texto: El resultado (1) - web, app, tienda y teléfono - y los Query Details (2) con el Query ID, la duración y las filas
```

El **Query ID** identifica la consulta para siempre: sirve para buscarla en el historial, para Time Travel (nivel 4) y para pedir ayuda a soporte.

:::tip El warehouse se prende solo
Si el warehouse estaba suspendido, la primera consulta lo enciende (`AUTO_RESUME`). Por eso la primera puede tardar un segundo más.
:::

## ✅ Lo que lograste

- Creaste una hoja y ejecutaste SQL.
- Entiendes el contexto de la sesión.
- Lees el resultado y el Query ID.

:::ejercicio quiz
¿Qué cuatro datos forman el contexto de una consulta?
- [x] Rol, warehouse, base y esquema
- [ ] Usuario, contraseña, IP y fecha
- [ ] Tabla, columna, fila y valor
- [ ] Cuenta, región, nube y edición
:::

:::ejercicio quiz
¿Qué hace Ctrl+Enter en una hoja?
- [ ] Ejecuta todas las sentencias
- [x] Ejecuta la sentencia donde está el cursor
- [ ] Guarda la hoja
- [ ] Borra la hoja
:::

:::ejercicio quiz
El contexto es TIENDA_ANDINA.PUBLIC. ¿Qué tabla lee `FROM pedidos`?
- [ ] Ninguna, falta el nombre completo
- [x] TIENDA_ANDINA.PUBLIC.PEDIDOS
- [ ] Todas las tablas pedidos de la cuenta
- [ ] La primera que encuentre
:::

:::ejercicio quiz
¿Para qué sirve el Query ID?
- [ ] Para nada
- [x] Para identificar la consulta en el historial, en Time Travel y con soporte
- [ ] Para cambiar de rol
- [ ] Para borrar la tabla
:::
