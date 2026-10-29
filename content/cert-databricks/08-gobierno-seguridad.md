---
titulo: Gobierno y seguridad con Unity Catalog, Delta Sharing y Clean Rooms
nivel: Avanzado
duracion: 60
resumen: El modelo de objetos de Unity Catalog, tablas administradas y externas, volúmenes, privilegios y herencia, ownership, vinculación de catálogos a workspaces, vistas dinámicas, row filters, column masks y políticas ABAC con etiquetas gobernadas, linaje y auditoría, Delta Sharing, Clean Rooms, secretos y cumplimiento.
objetivos: Diseñar la jerarquía de catálogos y esquemas y otorgar los permisos mínimos con GRANT | Distinguir tablas y volúmenes administrados de externos y qué pasa al borrarlos | Restringir filas y columnas con vistas dinámicas, row filters, column masks y políticas ABAC | Compartir datos con otra organización usando Delta Sharing y elegir entre sharing, federation y clean rooms | Usar secretos, linaje y auditoría para cumplir requisitos de seguridad
prerrequisitos: cert-databricks-optimizacion-monitoreo | databricks-unity-catalog
autoevaluacion: ¿Sabes qué permisos hacen falta para leer una tabla? | ¿Sabes qué pasa con los datos al borrar una tabla administrada y una externa? | ¿Puedes escribir un row filter y una column mask? | ¿Sabes qué es una política ABAC y para qué sirven las etiquetas gobernadas? | ¿Sabes cuándo usar Delta Sharing y cuándo Clean Rooms?
---

:::escenario
Rápido firmó un acuerdo con una cadena de restaurantes: les va a compartir sus ventas diarias. Al mismo tiempo, el área legal exige que solo el equipo de fraude vea el email y el teléfono de los clientes, que cada gerente regional vea solo los pedidos de su región, y que se pueda demostrar quién consultó datos personales. Todo esto se resuelve con **Unity Catalog** y **Delta Sharing**, y representa el 15 % del Associate y buena parte del Professional.
:::

## El modelo de objetos

```diagrama
titulo: La jerarquía de Unity Catalog
nodo ms: Metastore | icono=unity | col=0 | fila=0 | sub=uno por región | color=violeta
nodo cat: Catálogo | icono=capas | col=1 | fila=0 | sub=prod, dev, ventas_pg (foráneo)
nodo sch: Esquema | icono=capas | col=2 | fila=0 | sub=silver, gold
nodo t: Tablas y vistas | icono=tabla | col=3 | fila=0 | color=azul
nodo v: Volúmenes | icono=archivos | col=3 | fila=1 | sub=archivos | color=azul
nodo f: Funciones y modelos | icono=ml | col=3 | fila=2 | color=azul
nodo cred: Storage credential\n+ External location | icono=llave | col=1 | fila=2 | color=naranja
nodo sh: Shares y recipients | icono=nube | col=0 | fila=2 | sub=Delta Sharing | color=verde
flecha ms -> cat
flecha cat -> sch
flecha sch -> t
flecha sch -> v
flecha sch -> f
flecha ms -- cred | estilo=punteada
flecha ms -- sh | estilo=punteada
```

- **Metastore**: el contenedor de nivel superior, uno por región; se asigna a los workspaces de esa región.
- **Catálogo → esquema → objeto**: el espacio de nombres de tres niveles (`prod.silver.pedidos`). Los objetos son **tablas**, **vistas**, **materialized views**, **volúmenes** (archivos), **funciones** y **modelos** de ML.
- **Storage credential**: una identidad de nube (rol de IAM, *managed identity*, cuenta de servicio) que Unity Catalog usa para acceder al almacenamiento.
- **External location**: una ruta de almacenamiento (`abfss://…`, `s3://…`) asociada a una storage credential, sobre la que se dan permisos.
- **Connections** (Lakehouse Federation), **shares**, **recipients**, **providers** (Delta Sharing) y **clean rooms** también son objetos gobernados.

## Administradas y externas

| | Administrada (*managed*) | Externa (*external*) |
|---|---|---|
| Dónde están los archivos | En el almacenamiento administrado de Unity Catalog (del metastore, catálogo o esquema) | En la ruta que indicas (`LOCATION`), dentro de una external location |
| Al hacer `DROP TABLE` | Se borran los metadatos **y** los datos (se pueden recuperar con `UNDROP` por un tiempo limitado) | Se borran **solo** los metadatos; los archivos quedan |
| Optimización automática | Sí (Predictive Optimization, mejoras de rendimiento) | No |
| Recomendación | **Por defecto** | Cuando otros sistemas fuera de Databricks deben escribir los mismos archivos, o por requisitos de ubicación |

Los **volúmenes** siguen la misma lógica para archivos: administrados o externos. Se accede a ellos con rutas `/Volumes/catálogo/esquema/volumen/…`.

## Privilegios

Los permisos se otorgan con `GRANT` sobre un objeto a un **principal** (usuario, grupo o service principal). La buena práctica es otorgar a **grupos** de la cuenta, nunca a personas.

| Privilegio | Sobre | Permite |
|---|---|---|
| `USE CATALOG` | Catálogo | "Entrar" al catálogo (necesario para todo lo de adentro) |
| `USE SCHEMA` | Esquema | "Entrar" al esquema |
| `SELECT` | Tabla, vista, MV (o esquema/catálogo, y se hereda) | Leer |
| `MODIFY` | Tabla | Insertar, actualizar, borrar |
| `CREATE TABLE`, `CREATE SCHEMA`, `CREATE VOLUME`, `CREATE FUNCTION` | Esquema o catálogo | Crear objetos |
| `READ VOLUME`, `WRITE VOLUME` | Volumen | Leer y escribir archivos |
| `EXECUTE` | Función o modelo | Ejecutar la función o usar el modelo |
| `BROWSE` | Catálogo | Ver que los objetos existen (metadatos) sin leer los datos |
| `MANAGE` | Objeto | Administrar permisos del objeto sin ser dueño |
| `ALL PRIVILEGES` | Objeto | Todos los privilegios aplicables |

```sql norun
GRANT USE CATALOG ON CATALOG prod TO `analistas`;
GRANT USE SCHEMA, SELECT ON SCHEMA prod.gold TO `analistas`;   -- SELECT se hereda a todas las tablas del esquema, presentes y futuras
GRANT MODIFY ON TABLE prod.silver.pedidos TO `sp-etl`;
REVOKE SELECT ON SCHEMA prod.gold FROM `analistas`;
SHOW GRANTS ON SCHEMA prod.gold;
```

- **Herencia**: un privilegio otorgado en un catálogo o esquema se aplica a todos los objetos que contiene, incluidos los que se creen después.
- **Ownership**: cada objeto tiene un **dueño** (quien lo creó, o a quien se le transfiere con `ALTER … OWNER TO`), que tiene todos los permisos sobre él. En producción, el dueño debería ser un grupo o un service principal.
- **Vinculación de catálogos a workspaces** (*workspace-catalog binding*): restringe un catálogo a ciertos workspaces, por ejemplo para que `prod` solo sea accesible desde el workspace de producción.

:::examen La cadena completa
Para leer `prod.gold.ventas`, un usuario necesita **los tres**: `USE CATALOG` en `prod`, `USE SCHEMA` en `prod.gold` y `SELECT` en la tabla (o heredado). La pregunta típica: "dimos SELECT y sigue sin poder leer" → falta `USE CATALOG` o `USE SCHEMA`.
:::

## Seguridad a nivel de fila y columna

### Vistas dinámicas

Una vista que filtra o enmascara según **quién** consulta:

```sql norun
CREATE VIEW prod.gold.clientes_seguro AS
SELECT
  cliente_id,
  CASE WHEN is_account_group_member('fraude') THEN email ELSE '***' END AS email,
  region
FROM prod.silver.clientes
WHERE is_account_group_member('admins') OR region = current_region_of_user();   -- función propia que devuelve la región del usuario
```

### Row filters y column masks

Se aplican **a la tabla misma**, así que valen para cualquier consulta, sin crear vistas aparte. Ambos se escriben como **funciones SQL** de Unity Catalog:

```sql norun
-- Row filter: cada gerente ve su región; admins ven todo
CREATE FUNCTION prod.seguridad.filtro_region(region STRING)
RETURN is_account_group_member('admins') OR is_account_group_member(concat('gerentes_', region));

ALTER TABLE prod.silver.pedidos SET ROW FILTER prod.seguridad.filtro_region ON (region);

-- Column mask: solo fraude ve el email
CREATE FUNCTION prod.seguridad.mascara_email(email STRING)
RETURN CASE WHEN is_account_group_member('fraude') THEN email ELSE regexp_replace(email, '^[^@]+', '***') END;

ALTER TABLE prod.silver.clientes ALTER COLUMN email SET MASK prod.seguridad.mascara_email;
```

### Políticas ABAC con etiquetas gobernadas

Con cientos de tablas, poner un filtro o una máscara tabla por tabla no escala. **ABAC** (control de acceso basado en atributos) lo resuelve con **etiquetas gobernadas** (*governed tags*: etiquetas con valores permitidos y permisos para asignarlas) y **políticas** definidas una vez en un catálogo o esquema:

1. Se etiquetan las columnas sensibles: `pii = email`, `pii = telefono`.
2. Se crea una **política** que dice: "en este catálogo, a todos excepto el grupo `fraude`, aplicar la función `mascara_pii` a las columnas con etiqueta `pii`".
3. Toda tabla nueva con una columna etiquetada queda protegida sin tocar la política.

```sql norun
CREATE POLICY ocultar_pii
ON CATALOG prod
COMMENT 'Enmascara columnas personales'
COLUMN MASK prod.seguridad.mascara_pii
TO `account users` EXCEPT `fraude`
FOR TABLES
MATCH COLUMNS has_tag('pii') AS col
ON COLUMN col;
```

Las políticas ABAC necesitan cómputo serverless o un runtime reciente (16.4 o superior). La sintaxis de `CREATE POLICY` se estuvo ajustando durante la vista previa: verifica la referencia SQL de tu workspace.

:::examen ¿Vista dinámica, row filter o ABAC?
- Un caso puntual en una tabla → **row filter** o **column mask**.
- Exponer a un público un subconjunto con columnas renombradas → **vista dinámica**.
- La misma regla en muchas tablas, basada en una clasificación (PII, región) → **política ABAC** con etiquetas gobernadas.
:::

## Linaje y auditoría

- **Linaje**: Unity Catalog registra automáticamente, a nivel de **tabla y columna**, de dónde salió cada dato (notebooks, jobs, pipelines, consultas SQL). Se ve en el Catalog Explorer y en `system.access.table_lineage` y `system.access.column_lineage`. Sirve para análisis de impacto ("¿qué se rompe si cambio esta columna?").
- **Auditoría**: `system.access.audit` registra las acciones: quién leyó qué tabla, quién cambió permisos, quién creó un token.
- **Etiquetas y clasificación**: además de las etiquetas manuales, la **clasificación de datos** puede detectar y etiquetar columnas con datos personales automáticamente.

## Delta Sharing: compartir sin copiar

**Delta Sharing** es un protocolo abierto para compartir datos **en vivo, sin copiarlos**: el destinatario lee directamente los archivos del proveedor con credenciales de corta duración.

| Modalidad | Destinatario | Qué se puede compartir |
|---|---|---|
| **Databricks a Databricks** | Otra cuenta o región con Unity Catalog | Tablas, vistas, volúmenes, notebooks, modelos; con historial para lecturas incrementales |
| **Abierto** (*open sharing*) | Cualquier cliente: pandas, Spark, Power BI, Tableau… | Tablas (y vistas) mediante un archivo de credenciales o federación OIDC |

```sql norun
CREATE SHARE ventas_restaurantes COMMENT 'Ventas diarias para socios';
ALTER SHARE ventas_restaurantes ADD TABLE prod.gold.ventas_diarias
  PARTITION (ciudad = 'Lima');                           -- compartir solo una parte
CREATE RECIPIENT cadena_sabor USING ID 'aws:us-east-1:7f3c...';   -- Databricks a Databricks (id de su metastore)
GRANT SELECT ON SHARE ventas_restaurantes TO RECIPIENT cadena_sabor;
```

Del lado del destinatario, el share aparece como un **catálogo** de solo lectura (`CREATE CATALOG socios USING SHARE rapido.ventas_restaurantes`). El cómputo lo paga quien consulta; si están en regiones o nubes distintas, la transferencia de datos puede generar costos de salida para el proveedor.

## Clean Rooms

Un **clean room** permite que dos o más organizaciones **analicen juntas** datos que no se pueden mostrar mutuamente. Cada parte aporta tablas, y solo se ejecutan **notebooks aprobados** por todos, que devuelven resultados agregados. Ninguna parte ve los datos crudos de la otra.

| Necesito… | Uso |
|---|---|
| Que un socio lea mis tablas | Delta Sharing |
| Consultar una base externa sin copiarla | Lakehouse Federation |
| Cruzar mis datos con los de otra empresa sin que ninguna vea los de la otra | Clean Rooms |

## Secretos y cumplimiento

- **Secretos**: credenciales guardadas en *secret scopes* (o respaldadas por Azure Key Vault). En código: `dbutils.secrets.get("scope", "clave")`; en SQL: `secret('scope', 'clave')`. Los valores aparecen como `[REDACTED]` si se intentan imprimir.
- **Identidades de servicio**: jobs, pipelines y CI corren como **service principals** con permisos mínimos.
- **Borrar datos personales** (derecho al olvido): `DELETE FROM … WHERE cliente_id = …` crea una versión nueva, pero los archivos viejos siguen existiendo hasta el `VACUUM` (y con deletion vectors, hasta reescribir los archivos). Para cumplir, hay que ejecutar `VACUUM` (y `REORG TABLE … APPLY (PURGE)` si hay deletion vectors) dentro del plazo legal.
- **Red y cifrado**: Private Link, listas de IP permitidas y claves administradas por el cliente (CMK) para cifrar datos y metadatos.

:::errores
- **Dar permisos a personas.** Síntoma: permisos imposibles de auditar cuando alguien cambia de rol. Corrección: grupos de la cuenta.
- **`ALL PRIVILEGES` a analistas.** Síntoma: alguien borra una tabla de producción. Corrección: `SELECT` y `USE`, nada más.
- **Tablas externas "por costumbre".** Síntoma: sin Predictive Optimization y con archivos que quedan huérfanos al borrar. Corrección: administradas por defecto.
- **Borrar un cliente y creer que ya no está.** Síntoma: los datos siguen en versiones anteriores (*time travel*). Corrección: `VACUUM` y purga dentro del plazo.
:::

:::trabajo Un esquema de permisos típico
Catálogos por entorno (`dev`, `prod`) vinculados a sus workspaces; esquemas por capa (`bronze`, `silver`, `gold`); el service principal del pipeline es dueño de silver y gold; los analistas tienen `USE` y `SELECT` sobre gold; las columnas con PII están etiquetadas y una política ABAC las enmascara para todos menos los grupos autorizados; un dashboard sobre `system.access.audit` muestra quién leyó tablas con PII.
:::

:::entrevista
**"¿Cómo le das acceso a un socio externo a una tabla sin copiarla?"** Con Delta Sharing: creo un share, agrego la tabla (o una vista o una partición si comparto solo una parte), creo el recipient y le doy `SELECT` sobre el share. Si el socio tiene Databricks, uso el modo Databricks a Databricks; si no, el modo abierto. Si en cambio necesitamos cruzar datos sin que ninguno vea los del otro, propongo un clean room.
:::

## Ejercicios

:::ejercicio quiz
Le diste `SELECT` sobre la tabla `prod.gold.ventas` al grupo `analistas`, pero siguen recibiendo un error de permisos. ¿Qué falta?
- [ ] `MODIFY` sobre la tabla.
- [x] `USE CATALOG` sobre `prod` y `USE SCHEMA` sobre `prod.gold`.
- [ ] `ALL PRIVILEGES` sobre el esquema.
- [ ] Reiniciar el SQL warehouse.
```explicacion
Para llegar a la tabla hay que poder usar el catálogo y el esquema que la contienen. Es la causa más común de este error.
```
:::

:::ejercicio quiz
Ejecutas `DROP TABLE` sobre una tabla **externa** creada con `LOCATION 'abfss://…/ventas'`. ¿Qué pasa con los archivos?
- [ ] Se borran junto con la tabla.
- [x] Quedan en la ruta: solo se borran los metadatos de Unity Catalog.
- [ ] Se mueven al almacenamiento administrado.
- [ ] Se borran después de 7 días.
```explicacion
En una tabla externa, Unity Catalog no administra los archivos: el `DROP` borra la definición y los datos quedan. En una administrada se borran también los datos.
```
:::

:::ejercicio quiz
En 300 tablas hay columnas con datos personales, y cada mes se crean tablas nuevas. Hay que enmascararlas para todos excepto el grupo `fraude`, sin tener que acordarse de configurar cada tabla nueva. ¿Qué usas?
- [ ] Una column mask en cada tabla.
- [ ] Una vista dinámica por tabla.
- [x] Etiquetas gobernadas en las columnas y una política ABAC de column mask a nivel de catálogo.
- [ ] Quitar el `SELECT` de todas las tablas al resto de los usuarios.
```explicacion
ABAC define la regla una vez y la aplica a toda columna etiquetada, incluidas las de tablas futuras. Las máscaras por tabla funcionan, pero no escalan.
```
:::

:::ejercicio quiz
Una empresa socia sin Databricks quiere leer en Power BI una tabla de ventas que se actualiza cada día, sin que tú le envíes archivos. ¿Qué usas?
- [ ] Lakehouse Federation.
- [x] Delta Sharing en modo abierto.
- [ ] Un clean room.
- [ ] Un export diario a CSV en un bucket público.
```explicacion
El modo abierto de Delta Sharing permite a clientes como Power BI leer los datos en vivo, sin copiar, con credenciales controladas. Federation es para consultar bases externas desde Databricks, no para compartir.
```
:::

:::ejercicio quiz
Dos bancos quieren saber cuántos clientes tienen en común sin revelar sus listas de clientes. ¿Qué usan?
- [ ] Delta Sharing de ida y vuelta.
- [x] Un clean room, con un notebook aprobado por ambos que devuelve solo el conteo.
- [ ] Lakehouse Federation entre sus bases.
- [ ] Una vista dinámica en cada banco.
```explicacion
Clean Rooms permite analizar juntos datos que ninguna parte puede ver de la otra, ejecutando solo código aprobado que devuelve resultados agregados.
```
:::

:::ejercicio quiz
Borras con `DELETE` los datos de un cliente que pidió ejercer su derecho al olvido. ¿Qué falta para que los datos desaparezcan de verdad?
- [ ] Nada: `DELETE` borra los archivos.
- [ ] Ejecutar `OPTIMIZE`.
- [x] Ejecutar `VACUUM` (y purgar los deletion vectors si están activos) para que se borren los archivos con las versiones anteriores.
- [ ] Hacer `RESTORE` a la versión anterior.
```explicacion
Delta conserva las versiones anteriores para el time travel hasta el `VACUUM`. Con deletion vectors, las filas solo se marcan como borradas hasta que los archivos se reescriben.
```
:::

:::ejercicio abierto
Escribe las sentencias para que el grupo `marketing` pueda leer todas las tablas presentes y futuras del esquema `prod.gold`, y nada más.
```sql solucion
GRANT USE CATALOG ON CATALOG prod TO `marketing`;
GRANT USE SCHEMA ON SCHEMA prod.gold TO `marketing`;
GRANT SELECT ON SCHEMA prod.gold TO `marketing`;
```
:::

:::ejercicio abierto
Escribe la función y el `ALTER TABLE` para que la columna `telefono` de `prod.silver.clientes` se muestre completa solo al grupo `soporte`, y al resto como `XXXX` seguido de los últimos 3 dígitos.
```sql solucion
CREATE FUNCTION prod.seguridad.mascara_telefono(telefono STRING)
RETURN CASE WHEN is_account_group_member('soporte') THEN telefono
            ELSE concat('XXXX', right(telefono, 3)) END;

ALTER TABLE prod.silver.clientes ALTER COLUMN telefono SET MASK prod.seguridad.mascara_telefono;
```
:::
