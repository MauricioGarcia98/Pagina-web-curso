---
titulo: Unity Catalog: permisos y gobierno
nivel: Intermedio
duracion: 25
resumen: Jerarquía de objetos, GRANT/REVOKE, grupos, external locations, volúmenes y tablas de sistema.
---

## Permisos con SQL

Los permisos se dan a **grupos** (no a personas) y se heredan hacia abajo. Para leer una tabla hacen falta `USE CATALOG`, `USE SCHEMA` y `SELECT`:

```sql norun
GRANT USE CATALOG ON CATALOG prod TO `analistas`;
GRANT USE SCHEMA  ON SCHEMA prod.gold TO `analistas`;
GRANT SELECT      ON SCHEMA prod.gold TO `analistas`;           -- todas las tablas del esquema, incluidas las futuras
GRANT MODIFY, SELECT ON TABLE prod.silver.pedidos TO `ingenieros-datos`;
GRANT READ VOLUME ON VOLUME prod.crudo.archivos TO `ingenieros-datos`;
REVOKE SELECT ON TABLE prod.gold.salarios FROM `analistas`;
SHOW GRANTS ON SCHEMA prod.gold;
```

| Privilegio | Permite |
|---|---|
| `USE CATALOG` / `USE SCHEMA` | “Entrar” al catálogo / esquema |
| `SELECT` | Leer |
| `MODIFY` | Insertar, actualizar, borrar |
| `CREATE TABLE` / `CREATE SCHEMA` | Crear objetos |
| `READ VOLUME` / `WRITE VOLUME` | Archivos en volúmenes |
| `ALL PRIVILEGES` | Todo |

## Seguridad fina

- **Row filters** y **column masks**: funciones que filtran filas o enmascaran columnas según quién consulta (por ejemplo, mostrar el email solo al grupo de soporte).
- **Vistas dinámicas** con `is_account_group_member('grupo')`.

## Acceso al almacenamiento

```sql norun
-- Credencial (managed identity vía Access Connector) y ubicación externa
CREATE EXTERNAL LOCATION lake_bronze
URL 'abfss://bronze@stdatosprod001.dfs.core.windows.net/'
WITH (STORAGE CREDENTIAL cred_lake_prod);

CREATE EXTERNAL VOLUME prod.crudo.archivos
LOCATION 'abfss://bronze@stdatosprod001.dfs.core.windows.net/archivos/';
```

## Tablas de sistema

`system.access.audit` (quién hizo qué), `system.billing.usage` (costos), `system.access.table_lineage` (linaje), `system.compute.clusters`… Se consultan con SQL como cualquier tabla.

:::ejercicio abierto
El grupo `finanzas` debe poder **leer** todas las tablas del esquema `prod.gold`, pero nada más. Escribe los `GRANT` necesarios.
```sql solucion
GRANT USE CATALOG ON CATALOG prod TO `finanzas`;
GRANT USE SCHEMA ON SCHEMA prod.gold TO `finanzas`;
GRANT SELECT ON SCHEMA prod.gold TO `finanzas`;
```
:::

:::ejercicio quiz
Diste `SELECT` sobre `prod.gold.ventas` al grupo `analistas`, pero siguen sin poder consultarla. ¿Qué falta probablemente?

- [ ] Reiniciar el cluster
- [x] `USE CATALOG` sobre `prod` y `USE SCHEMA` sobre `prod.gold`
- [ ] `MODIFY`
- [ ] Un token nuevo
:::

:::ejercicio quiz
¿A quién conviene otorgar los permisos?

- [ ] A cada usuario individualmente
- [x] A grupos (por ejemplo, sincronizados desde Entra ID)
- [ ] Al usuario administrador y que comparta su cuenta
- [ ] A nadie: todo público
:::
