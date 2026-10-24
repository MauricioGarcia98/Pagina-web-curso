---
titulo: Unity Catalog: permisos y gobierno
nivel: Intermedio
duracion: 25
resumen: Jerarquía de objetos, GRANT/REVOKE, grupos, external locations, volúmenes y tablas de sistema.
---

## Por qué existe Unity Catalog

Antes de Unity Catalog, cada workspace de Databricks tenía su propio catálogo (el *Hive metastore*) y los permisos se manejaban por separado en cada uno, muchas veces con llaves de almacenamiento compartidas. En una empresa con 10 workspaces, nadie podía responder con certeza "¿quién puede ver la tabla de salarios?".

**Unity Catalog** centraliza el **gobierno** de todos los datos de la cuenta:

| Necesidad | Cómo la resuelve |
|---|---|
| ¿Quién puede ver qué? | Permisos con `GRANT`/`REVOKE` sobre catálogos, esquemas, tablas, vistas, volúmenes y funciones, en **un solo lugar** para todos los workspaces |
| ¿De dónde sale esta tabla y quién la usa? | **Linaje** automático, hasta el nivel de columna |
| ¿Quién consultó la tabla de clientes ayer? | **Auditoría** en tablas de sistema |
| Ocultar datos sensibles | Filtros de filas y máscaras de columnas |
| Acceso al almacenamiento sin llaves | *Storage credentials* y *external locations* |

```text
Metastore (uno por región, compartido por los workspaces)
 └── Catálogo        dev, prod, main             ← normalmente por entorno o unidad de negocio
      └── Esquema    bronze, silver, gold, ventas ← por capa o dominio
           ├── Tabla / Vista       prod.gold.ventas_diarias
           ├── Volumen (archivos)  /Volumes/prod/crudo/archivos/
           └── Función, Modelo
```

Los permisos se **heredan** hacia abajo: `GRANT SELECT ON SCHEMA prod.gold TO analistas` da lectura sobre todas las tablas del esquema, incluidas las que se creen después. Y para leer una tabla hacen falta tres permisos encadenados: `USE CATALOG` en el catálogo, `USE SCHEMA` en el esquema y `SELECT` en la tabla.

<!-- dg:dbx04-uc -->
```diagrama
titulo: La jerarquía de Unity Catalog: catálogo.esquema.tabla
nodo meta: Metastore | icono=capas | col=1 | fila=0 | color=violeta | sub=uno por región
nodo c1: prod | icono=almacen | col=0 | fila=1 | color=azul | sub=catálogo
nodo c2: dev | icono=almacen | col=2 | fila=1 | color=azul | sub=catálogo
nodo e1: ventas | icono=capas | col=0 | fila=2 | color=gris | sub=esquema
nodo t1: pedidos | icono=tabla | col=1 | fila=2 | color=naranja | sub=prod.ventas.pedidos
nodo v1: vol_crudos | icono=archivos | col=1 | fila=1 | color=amarillo | sub=volumen (archivos)
flecha meta -> c1
flecha meta -> c2
flecha c1 -> e1
flecha e1 -> t1
flecha e1 -> v1
```

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
