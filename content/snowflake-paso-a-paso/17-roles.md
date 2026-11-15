---
titulo: Roles - quién puede hacer qué en Snowflake
nivel: 5 · Avanzado
duracion: 40
resumen: En Snowflake los permisos se dan a roles y los roles a usuarios. Recorres los roles del sistema (ACCOUNTADMIN, SECURITYADMIN, USERADMIN, SYSADMIN, PUBLIC) y su jerarquía, cambias de rol desde el menú del usuario y ves qué pasa cuando un rol sin permisos intenta leer una tabla.
objetivos: Explicar el control de acceso basado en roles | Describir cada rol del sistema y su jerarquía | Cambiar de rol en una sesión | Interpretar un error de permisos
prerrequisitos: snowflake-paso-a-paso-proyecto-incidente-del-update
autoevaluacion: ¿Sabes a quién se dan los permisos en Snowflake? | ¿Sabes qué rol usar para el trabajo diario de ingeniería? | ¿Sabes por qué ACCOUNTADMIN se usa lo menos posible? | ¿Sabes qué pasa si PUBLIC lee una tabla sin permiso?
---

## Paso 1 — El modelo

:::analogia Llaves y llaveros
Los **permisos** son llaves (leer esta tabla, usar este warehouse). Un **rol** es un llavero con varias llaves. Un **usuario** recibe uno o más llaveros y en cada sesión usa uno. Nunca se dan llaves sueltas a una persona: se agregan al llavero y se entrega el llavero.
:::

**Admin → Users & Roles**:

```captura
archivo: snowflake/s17-roles.webp
texto: Los roles del sistema con su descripción
```

## Paso 2 — Los roles del sistema

| Rol | Para | Hereda |
|---|---|---|
| **ACCOUNTADMIN** | Todo, incluida facturación y resource monitors | SYSADMIN y SECURITYADMIN |
| **SECURITYADMIN** | Administrar permisos (GRANT) y usuarios | USERADMIN |
| **USERADMIN** | Crear usuarios y roles | - |
| **SYSADMIN** | Crear warehouses, bases y objetos: el rol de ingeniería | Los roles propios que se le asignan |
| **PUBLIC** | Lo que tienen todos los usuarios | - |

:::cuidado ACCOUNTADMIN lo menos posible
Es el rol más poderoso: puede cambiar la facturación y ver todo. Úsalo solo para tareas de cuenta, con MFA, y que lo tengan pocas personas. El trabajo diario de ingeniería se hace con SYSADMIN o un rol propio.
:::

Buena práctica: los roles propios (por ejemplo `analista_ventas`) se asignan a SYSADMIN, así SYSADMIN puede administrar los objetos que esos roles creen.

## Paso 3 — Cambiar de rol

Menú del usuario (abajo a la izquierda) → **Switch Role**, o `USE ROLE`:

```captura
archivo: snowflake/s17-cambiar.webp
texto: El menú del usuario - Switch Role con los roles disponibles
```

## Paso 4 — Sin permiso

```sql norun
USE ROLE PUBLIC;
SELECT COUNT(*) FROM tienda_dev.analitica.pedidos_actuales;
```

```captura
archivo: snowflake/s17-sin-permiso.webp
texto: El rol actual PUBLIC (1) y el error - does not exist or not authorized, con lo que le falta (2)
```

Para leer una tabla, un rol necesita **tres** permisos: `USAGE` en la base, `USAGE` en el esquema y `SELECT` en la tabla (además de `USAGE` en un warehouse para ejecutar). Los das en la próxima lección.

## ✅ Lo que lograste

- Entiendes el modelo de roles.
- Conoces los roles del sistema y su jerarquía.
- Interpretas un error de permisos.

:::ejercicio quiz
¿A quién se dan los permisos en Snowflake?
- [ ] Directamente a los usuarios
- [x] A roles, y los roles a usuarios
- [ ] A los warehouses
- [ ] A las tablas
:::

:::ejercicio quiz
¿Qué rol se usa para el trabajo diario de ingeniería (crear bases, tablas, warehouses)?
- [ ] ACCOUNTADMIN
- [x] SYSADMIN (o un rol propio)
- [ ] PUBLIC
- [ ] USERADMIN
:::

:::ejercicio quiz
¿Qué permisos necesita un rol para leer una tabla?
- [ ] Solo SELECT en la tabla
- [x] USAGE en la base, USAGE en el esquema y SELECT en la tabla
- [ ] OWNERSHIP de la cuenta
- [ ] Ninguno
:::

:::ejercicio quiz
¿Por qué ACCOUNTADMIN se usa lo menos posible?
- [ ] Porque es lento
- [x] Porque es el rol más poderoso, incluida la facturación
- [ ] Porque no puede leer datos
- [ ] Porque cuesta más créditos
:::
