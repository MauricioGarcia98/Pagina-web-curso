---
titulo: GRANT - un rol de solo lectura para los analistas
nivel: 5 · Avanzado
duracion: 45
resumen: Creas el rol analista_ventas con SECURITYADMIN, le das USAGE en el warehouse, la base y el esquema, SELECT en todas las tablas de analitica, lo asignas a un usuario y compruebas con SHOW GRANTS. Luego lo pruebas - puede consultar pero no borrar - y aprendes los FUTURE GRANTS.
objetivos: Crear un rol propio | Dar USAGE y SELECT con GRANT | Asignar un rol a un usuario | Comprobar permisos con SHOW GRANTS | Usar FUTURE GRANTS y REVOKE
prerrequisitos: snowflake-paso-a-paso-roles
autoevaluacion: ¿Sabes qué rol crea roles? | ¿Sabes dar SELECT a todas las tablas de un esquema? | ¿Sabes qué hace FUTURE? | ¿Sabes quitar un permiso?
---

:::escenario El pedido
Comercial: *"Necesitamos consultar `analitica` desde Snowsight y Power BI. No queremos tocar nada, solo leer."*
:::

## Paso 1 — El rol y sus permisos

```sql norun
USE ROLE SECURITYADMIN;
CREATE ROLE analista_ventas;
GRANT USAGE ON WAREHOUSE analisis_wh TO ROLE analista_ventas;
GRANT USAGE ON DATABASE tienda_dev TO ROLE analista_ventas;
GRANT USAGE ON SCHEMA tienda_dev.analitica TO ROLE analista_ventas;
GRANT SELECT ON ALL TABLES IN SCHEMA tienda_dev.analitica TO ROLE analista_ventas;
GRANT ROLE analista_ventas TO USER alumno;
SHOW GRANTS TO ROLE analista_ventas;
```

```captura
archivo: snowflake/s18-grants.webp
texto: El script de permisos (1) y SHOW GRANTS - USAGE en el warehouse, la base y el esquema, y SELECT en todas las tablas (2)
```

| Permiso | Sobre | Permite |
|---|---|---|
| `USAGE` | Warehouse | Ejecutar consultas con él |
| `USAGE` | Base / esquema | "Entrar" para ver lo que hay adentro |
| `SELECT` | Tabla / vista | Leer |
| `INSERT`, `UPDATE`, `DELETE` | Tabla | Escribir |
| `CREATE TABLE` | Esquema | Crear tablas |
| `OWNERSHIP` | Objeto | Ser dueño (todo, incluido darlo a otros) |

## Paso 2 — Probarlo

```sql norun
USE ROLE analista_ventas;
USE WAREHOUSE analisis_wh;
SELECT canal, COUNT(*) AS pedidos, SUM(total) AS ventas
FROM tienda_dev.analitica.pedidos_actuales
GROUP BY canal;
```

```captura
archivo: snowflake/s18-analista.webp
texto: Con el rol ANALISTA_VENTAS (1) la consulta funciona (2)
```

```sql norun
DELETE FROM tienda_dev.analitica.pedidos_actuales;
```

```captura
archivo: snowflake/s18-no-puede.webp
texto: Insufficient privileges - falta GRANT DELETE: el rol solo puede leer
```

## Paso 3 — Tablas futuras

`ALL TABLES` da permiso sobre las tablas que **ya existen**. Las que se creen mañana no quedan incluidas. Para eso:

```sql norun
GRANT SELECT ON FUTURE TABLES IN SCHEMA tienda_dev.analitica TO ROLE analista_ventas;
```

## Paso 4 — Quitar

```sql norun
REVOKE SELECT ON ALL TABLES IN SCHEMA tienda_dev.analitica FROM ROLE analista_ventas;
```

:::tip Mínimo privilegio
Da el rol más chico que alcance para el trabajo. Los analistas leen `analitica`; las cargas escriben en `raw`; nadie tiene ACCOUNTADMIN para trabajar.
:::

## ✅ Lo que lograste

- Creaste un rol de solo lectura.
- Lo probaste: lee pero no borra.
- Conoces FUTURE GRANTS y REVOKE.

:::ejercicio quiz
¿Con qué rol del sistema conviene crear roles y dar permisos?
- [ ] PUBLIC
- [ ] SYSADMIN
- [x] SECURITYADMIN (o USERADMIN para crear)
- [ ] El rol del analista
:::

:::ejercicio quiz
¿Cómo das lectura a todas las tablas existentes de un esquema?
- [x] `GRANT SELECT ON ALL TABLES IN SCHEMA ... TO ROLE ...`
- [ ] `GRANT ALL TO EVERYONE`
- [ ] `GRANT USAGE ON TABLE *`
- [ ] No se puede
:::

:::ejercicio quiz
Mañana se crea una tabla nueva en analitica. ¿La puede leer el analista?
- [ ] Sí, siempre
- [x] Solo si se dio GRANT SELECT ON FUTURE TABLES (o se le da permiso a esa tabla)
- [ ] Solo si es ACCOUNTADMIN
- [ ] Nunca
:::

:::ejercicio quiz
¿Por qué falló el DELETE del analista?
- [ ] Por falta de warehouse
- [x] Porque el rol solo tiene SELECT, no DELETE
- [ ] Porque la tabla no existe
- [ ] Por un error de sintaxis
:::
