---
titulo: Azure SQL Database - la base operativa, su cortafuegos y sus conexiones
nivel: 4 · Intermedio-avanzado
duracion: 45
resumen: Azure SQL Database es SQL Server como servicio, y es una de las fuentes de datos más comunes de un equipo de datos. Creas la base ventas en el servidor sql-tiendaandina-dev con autenticación solo de Microsoft Entra y datos de ejemplo, chocas con el primer error que ve todo el mundo (el cortafuegos), agregas tu IP, consultas los pedidos por canal en el editor de consultas y lees las cadenas de conexión para Spark, Python y Data Factory.
objetivos: Distinguir servidor lógico y base de datos | Crear una base con autenticación solo de Microsoft Entra | Resolver el error de cortafuegos agregando una regla de IP | Consultar con el editor de consultas | Leer las cadenas de conexión ADO.NET, JDBC y ODBC
prerrequisitos: azure-paso-a-paso-data-factory-desde-el-portal
autoevaluacion: ¿Sabes qué guarda el servidor lógico? | ¿Sabes por qué no te puedes conectar recién creada la base? | ¿Sabes qué hace "Allow Azure services"? | ¿Sabes qué cadena de conexión usa Spark?
---

:::escenario El pedido
Lucía: *"Para practicar la ingesta, montemos en dev una copia de la base de ventas. Sin usuarios ni contraseñas de SQL: solo Entra."*
:::

## Paso 1 — Servidor lógico y base

| Pieza | Qué es | Ejemplo |
|---|---|---|
| **Servidor lógico** | Un nombre que agrupa bases y guarda lo que comparten: cortafuegos, administrador, conexiones. No es una máquina | `sql-tiendaandina-dev.database.windows.net` |
| **Base de datos** | Donde están las tablas; es lo que se paga según su nivel | `ventas` |

## Paso 2 — Crear la base

Busca **SQL databases**:

```captura
archivo: azure/b15-sql-vacio.webp
texto: SQL databases - Create (1)
```

Haz clic en **+ Create** y completa:

1. **Resource group**: `rg-tiendaandina-dev`. **Database name**: `ventas`.
2. **Server name**: `sql-tiendaandina-dev` (nuevo; único en todo Azure).
3. **Authentication method**: **Microsoft Entra-only**.
4. **Compute + storage**: **General Purpose - Serverless** (tiene una oferta gratis mensual).
5. **Use existing data**: **Sample (tienda del curso)**.

```captura
archivo: azure/b15-sql-crear.webp
texto: Create SQL Database - base (1), servidor (2), autenticación (3), cómputo (4) y datos de ejemplo (5)
```

| Opción de cómputo | Qué es |
|---|---|
| **Serverless** | Escala sola y se **pausa** cuando no se usa: se paga por segundo de uso. Ideal para dev |
| **Basic / Standard (DTU)** | Capacidad fija con precio fijo mensual |

**Microsoft Entra-only** significa que no existen usuario y contraseña de SQL: se entra con identidades de Entra (tu usuario, el factory, un grupo). Es lo que recomienda Microsoft.

## Paso 3 — El primer error: el cortafuegos

Abre la base:

```captura
archivo: azure/b15-sql-overview.webp
texto: La base ventas - las pestañas (1) y el aviso del cortafuegos (2)
```

Ve a **Query editor**:

```captura
archivo: azure/b15-sql-firewall.webp
texto: "Client with IP address … is not allowed to access the server" (1) y el botón para permitir tu IP (2)
```

El **cortafuegos del servidor bloquea todo por defecto**. Hay que abrir explícitamente cada dirección IP. Ve a **Networking** y haz clic en **Add your client IPv4 address**:

```captura
archivo: azure/b15-sql-red.webp
texto: La regla para tu IP (1) y la excepción para los servicios de Azure (2)
```

| Opción | Qué deja pasar |
|---|---|
| **Regla de IP** | Una dirección o un rango, por ejemplo la oficina |
| **Allow Azure services and resources to access this server** | Cualquier servicio de Azure, incluido Data Factory con su runtime de Azure |
| **Private endpoint** (producción) | Solo tu red privada; el servidor no queda expuesto a internet |

:::cuidado Nunca abras 0.0.0.0 – 255.255.255.255
Esa regla deja entrar a todo internet. Es la configuración que aparece en las noticias de bases filtradas.
:::

## Paso 4 — Consultar

Vuelve a **Query editor** y ejecuta:

```sql norun
SELECT canal, COUNT(*) AS pedidos
FROM pedidos
GROUP BY canal
ORDER BY pedidos DESC;
```

```captura
archivo: azure/b15-sql-editor.webp
texto: El editor - las tablas (1), la consulta T-SQL (2) y el resultado (3)
```

Resultado esperado: **web 5400, app 2973, tienda 2645, telefono 982** (12 000 pedidos). El editor ejecuta T-SQL de verdad en tu navegador.

## Paso 5 — Las cadenas de conexión

Pestaña **Connection strings**:

```captura
archivo: azure/b15-sql-conexion.webp
texto: Las cadenas ADO.NET, JDBC, ODBC y sqlcmd, todas con autenticación de Entra y sin contraseña
```

| Cadena | La usa |
|---|---|
| **ADO.NET** | Aplicaciones .NET |
| **JDBC** | **Spark y Databricks** |
| **ODBC** | **Python** con `pyodbc` |
| **sqlcmd** | La terminal |

Todas dicen `Authentication=ActiveDirectoryDefault` (o equivalente): toman la identidad del entorno, sin contraseña. Si algún día usas una cadena con contraseña, va en Key Vault, nunca en el código.

## ✅ Lo que lograste

- Creaste una base con autenticación solo de Entra y datos de ejemplo.
- Resolviste el error de cortafuegos con una regla de IP.
- Consultaste con el editor y conoces las cadenas de conexión.

:::ejercicio quiz
Creaste la base y al conectarte ves "Client with IP address … is not allowed". ¿Qué haces?
- [ ] Borro la base y la creo de nuevo
- [x] Agrego una regla de cortafuegos para mi IP en Networking
- [ ] Cambio a Premium
- [ ] Abro 0.0.0.0 – 255.255.255.255
:::

:::ejercicio quiz
¿Qué guarda el servidor lógico?
- [ ] Las tablas
- [x] Lo que comparten sus bases: cortafuegos, administrador y conexiones
- [ ] Los backups de la máquina
- [ ] Los secretos
:::

:::ejercicio quiz
¿Qué cadena de conexión usarías en Databricks?
- [ ] ADO.NET
- [x] JDBC
- [ ] sqlcmd
- [ ] Ninguna, Databricks no lee SQL
:::

:::ejercicio quiz
¿Por qué Serverless conviene en dev?
- [ ] Porque es más rápido que todo lo demás
- [x] Porque se pausa cuando no se usa y se paga por uso
- [ ] Porque no necesita cortafuegos
- [ ] Porque no tiene límite de tamaño
:::
