---
titulo: De la práctica a Snowflake real - cuenta de prueba, conexiones y herramientas
nivel: 6 · Avanzado completo
duracion: 35
resumen: Antes de entrar a una cuenta real, repasas qué cambia respecto de la práctica, cómo abrir una prueba gratuita sin riesgos, las ediciones, cómo se conectan las herramientas (Snowflake CLI, conectores, Power BI, dbt, Airflow) y las reglas de seguridad para tu primera semana.
objetivos: Saber qué cambia entre la práctica y Snowflake real | Abrir una cuenta de prueba con cuidado | Conectar herramientas de forma segura | Armar la lista de la primera semana
prerrequisitos: snowflake-paso-a-paso-snowpipe-streams-tasks-y-mas
autoevaluacion: ¿Sabes cuánto dura la prueba gratuita? | ¿Sabes qué autenticación usar para un usuario de servicio? | ¿Sabes con qué herramienta se automatiza desde la terminal? | ¿Sabes qué no compartir en capturas?
---

## Paso 1 — Qué cambia

| En la práctica | En Snowflake real |
|---|---|
| El SQL corre en tu navegador sobre datos chicos | Corre en la nube sobre TB, con el optimizador de Snowflake |
| Los créditos son estimados | Los créditos se facturan |
| Sin usuarios ni MFA | Usuarios, MFA, políticas de red y SSO |
| Marketplace, Notebooks, Task History no simulados | Disponibles según la edición |

```captura
archivo: snowflake/s23-marketplace.webp
texto: Marketplace - en Snowflake real, datos de terceros compartidos sin copiarlos
```

Lo que **no** cambia: el SQL, los objetos, los roles y las decisiones de diseño.

## Paso 2 — Una prueba gratuita

1. En el sitio de Snowflake, **Start for free**: la prueba dura **30 días** e incluye créditos de uso (al escribir esto, USD 400).
2. Elige **edición** (Standard, Enterprise, Business Critical) y **nube y región**. Para aprender alcanza Standard o Enterprise, en la región más cercana.
3. Activa **MFA** en tu usuario el primer día.
4. Crea un warehouse X-Small con auto suspend de 60 segundos y un resource monitor antes de cargar nada.

```captura
archivo: snowflake/s23-cuenta.webp
texto: El menú del usuario - cuenta, roles, apariencia y documentación
```

## Paso 3 — Conectar herramientas

| Herramienta | Cómo se conecta |
|---|---|
| **Snowflake CLI** (`snow`) | Desde la terminal: ejecutar SQL, subir archivos, desplegar apps. `snow sql -q "SELECT CURRENT_VERSION()"` |
| **Conector de Python** | `snowflake-connector-python` o Snowpark |
| **Power BI / Tableau** | Conector nativo de Snowflake con un rol de lectura (proyecto 5) |
| **dbt** | `dbt-snowflake`, con un rol y warehouse de transformación |
| **Airflow** | Provider `apache-airflow-providers-snowflake` y una conexión `snowflake_default` |

:::cuidado Usuarios de servicio
Para herramientas y procesos automáticos, crea **usuarios de servicio** con autenticación por **par de claves** (key-pair) u OAuth, un rol propio y un warehouse propio. Nunca uses tu usuario personal ni pongas contraseñas en el código.
:::

## Paso 4 — Tu primera semana

- [ ] Pedir un rol de desarrollo (no ACCOUNTADMIN) y un warehouse propio.
- [ ] Recorrer las bases y esquemas y entender qué capa es cada una.
- [ ] Leer el Query History de los procesos nocturnos.
- [ ] Revisar quién tiene qué con `SHOW GRANTS`.
- [ ] Hacer tus pruebas en un clon, nunca en producción.

:::tip Capturas
Si compartes capturas de una cuenta real, difumina el nombre de la cuenta, la URL, los usuarios y cualquier dato de clientes.
:::

## ✅ Lo que lograste

- Sabes qué cambia en Snowflake real.
- Sabes abrir una prueba de forma segura.
- Sabes conectar herramientas sin exponer credenciales.

:::ejercicio quiz
¿Cuánto dura la prueba gratuita de Snowflake?
- [ ] 7 días
- [x] 30 días
- [ ] 1 año
- [ ] No existe
:::

:::ejercicio quiz
¿Qué autenticación conviene para un usuario de servicio (por ejemplo, dbt o Airflow)?
- [ ] Tu contraseña personal
- [x] Par de claves (key-pair) u OAuth, con un rol propio
- [ ] Sin autenticación
- [ ] La contraseña de ACCOUNTADMIN
:::

:::ejercicio quiz
¿Con qué herramienta ejecutas SQL de Snowflake desde la terminal?
- [x] Snowflake CLI (snow)
- [ ] Excel
- [ ] Power BI
- [ ] El navegador solamente
:::

:::ejercicio quiz
¿Qué es lo primero que conviene crear en una cuenta de prueba?
- [ ] Un warehouse 4X-Large
- [x] Un warehouse X-Small con auto suspend corto y un resource monitor
- [ ] Cien usuarios
- [ ] Nada
:::
