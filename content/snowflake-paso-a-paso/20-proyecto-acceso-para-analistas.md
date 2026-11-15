---
titulo: Proyecto 5 (solo el objetivo) - acceso seguro y con presupuesto para analistas
nivel: 5 · Avanzado
duracion: 50
resumen: Comercial va a usar Snowflake todos los días. Dejas un rol de solo lectura sobre analitica que incluya las tablas futuras, un warehouse propio con presupuesto mensual, y lo compruebas con una consulta permitida y una prohibida. Solo se dan el objetivo y el criterio de aceptación.
objetivos: Diseñar un rol de solo lectura completo | Separar el cómputo y el presupuesto por equipo | Comprobar permisos con pruebas positivas y negativas | Documentar el acceso
prerrequisitos: snowflake-paso-a-paso-costos-y-resource-monitors
autoevaluacion: ¿El rol lee analitica y no raw? | ¿Incluye tablas futuras? | ¿El warehouse tiene un resource monitor? | ¿Probaste una consulta permitida y una prohibida?
---

:::escenario El objetivo
Lucía: *"Comercial necesita leer `analitica` todos los días, incluidas las tablas que agreguemos, sin poder escribir ni ver `raw`, y sin pasar de 50 créditos al mes."*
:::

## Criterio de aceptación

- Rol `analista_ventas` con USAGE en `analisis_wh`, en `tienda_dev` y en `tienda_dev.analitica`.
- SELECT en todas las tablas actuales **y futuras** de `analitica`.
- Ningún permiso en `raw`.
- `analisis_wh` con el resource monitor `limite_mensual` (50 créditos, aviso al 80 %, suspensión al 100 %).
- Una prueba que funciona (SELECT en `analitica`) y dos que fallan (DELETE en `analitica`, SELECT en `raw`).

## Cómo se ve terminado

```captura
archivo: snowflake/s20-roles.webp
texto: El rol ANALISTA_VENTAS (1) y sus permisos otorgados (2)
```

```captura
archivo: snowflake/s20-historial.webp
texto: Query History - las pruebas con el rol analista_ventas: la consulta que funciona y el DELETE que falla
```

<details><summary>💡 Solución comentada</summary>

```sql norun
USE ROLE SECURITYADMIN;
CREATE ROLE IF NOT EXISTS analista_ventas;
GRANT USAGE ON WAREHOUSE analisis_wh TO ROLE analista_ventas;
GRANT USAGE ON DATABASE tienda_dev TO ROLE analista_ventas;
GRANT USAGE ON SCHEMA tienda_dev.analitica TO ROLE analista_ventas;
GRANT SELECT ON ALL TABLES IN SCHEMA tienda_dev.analitica TO ROLE analista_ventas;
GRANT SELECT ON FUTURE TABLES IN SCHEMA tienda_dev.analitica TO ROLE analista_ventas;
GRANT ROLE analista_ventas TO ROLE SYSADMIN;   -- buena práctica: la jerarquía queda bajo SYSADMIN

USE ROLE ACCOUNTADMIN;
CREATE RESOURCE MONITOR IF NOT EXISTS limite_mensual WITH CREDIT_QUOTA = 50 FREQUENCY = MONTHLY
  START_TIMESTAMP = IMMEDIATELY TRIGGERS ON 80 PERCENT DO NOTIFY ON 100 PERCENT DO SUSPEND;
ALTER WAREHOUSE analisis_wh SET RESOURCE_MONITOR = limite_mensual;

-- pruebas
USE ROLE analista_ventas;
SELECT COUNT(*) FROM tienda_dev.analitica.pedidos_actuales;   -- funciona
DELETE FROM tienda_dev.analitica.pedidos_actuales;            -- falla: sin DELETE
SELECT COUNT(*) FROM tienda_dev.raw.pedidos_staging;          -- falla: sin USAGE en raw
```

**Decisiones a defender:**
- Un **warehouse por equipo** permite saber quién gasta y ponerle un presupuesto propio.
- **FUTURE TABLES** evita que cada tabla nueva requiera un ticket de permisos.
- Las pruebas **negativas** (lo que no debe poder hacer) son tan importantes como las positivas.
- Con Power BI, la conexión usa un usuario de servicio con este mismo rol.
</details>

## Lo que aprendiste en el nivel 5

- Roles del sistema y jerarquía.
- GRANT, FUTURE GRANTS y REVOKE.
- Costos y resource monitors.

En el nivel 6: buenas prácticas, las funciones de plataforma (Snowpipe, streams, tasks, dynamic tables) y el paso a Snowflake real.

:::ejercicio quiz
¿Por qué un warehouse propio para comercial?
- [ ] Porque Snowflake lo exige
- [x] Para saber cuánto gasta ese equipo y ponerle su presupuesto
- [ ] Porque los warehouses no se comparten
- [ ] Para que sea más lento
:::

:::ejercicio quiz
¿Cómo te aseguras de que el rol no ve raw?
- [x] No dándole USAGE en el esquema raw
- [ ] Borrando raw
- [ ] Con un comentario
- [ ] No se puede
:::

:::ejercicio quiz
¿Para qué sirven las pruebas negativas?
- [ ] Para nada
- [x] Para comprobar que el rol NO puede hacer lo que no debe
- [ ] Para gastar créditos
- [ ] Para borrar datos
:::

:::ejercicio quiz
¿Por qué se asigna analista_ventas a SYSADMIN?
- [x] Para que la jerarquía de roles propios quede bajo SYSADMIN y pueda administrar sus objetos
- [ ] Para que el analista sea administrador
- [ ] Porque es obligatorio para leer
- [ ] No tiene sentido
:::
