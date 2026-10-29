# Tarjetas: Microsoft DP-700

## Usar datos de ADLS, S3 o GCS sin copiarlos a Fabric
dominio: 1
**Shortcut** en OneLake.

## Réplica casi en tiempo real de Azure SQL, Cosmos DB o Snowflake
dominio: 1
**Mirroring**.

## Rol que crea y edita ítems pero no comparte ni administra
dominio: 1
**Contributor**. Member además comparte; Admin administra todo.

## Cambiar la conexión a la base al pasar de test a prod
dominio: 1
**Reglas de despliegue** en la canalización de despliegue.

## Filtrar filas del warehouse según el usuario
dominio: 1
**RLS**: función de predicado + `SECURITY POLICY`.

## Ocultar parcialmente una columna a ciertos usuarios
dominio: 1
**Enmascaramiento dinámico de datos**.

## Librerías y configuración de Spark compartidas
dominio: 1
Ítem **Environment**.

## Sesiones de Spark en segundos
dominio: 1
**Starter pool**. Varios notebooks compartiendo sesión: **alta concurrencia**.

## Esquema del warehouse como código
dominio: 1
**Proyecto de base de datos SQL** con Git.

## Marcar datos como confidenciales en todos los ítems
dominio: 1
Etiquetas de confidencialidad de **Microsoft Purview**.

## Agrupar workspaces por área de negocio
dominio: 1
**Dominios** de Fabric.

## Copiar muchas tablas con carga incremental sin diseñar un pipeline
dominio: 2
**Copy job**.

## Copiar tablas listadas en una tabla de configuración
dominio: 2
**Lookup** + **ForEach** con una Copy parametrizada.

## Analistas sin código transforman y cargan al warehouse
dominio: 2
**Dataflow Gen2** (con fast copy para volúmenes grandes).

## Carga incremental: cuándo actualizar la marca de agua
dominio: 2
**Después** de que la copia terminó bien.

## Hecho que llega antes que su dimensión
dominio: 2
**Miembro inferido** en la dimensión.

## Eventos en tiempo real a KQL con alertas
dominio: 2
**Eventstream** → **eventhouse** + **Activator**.

## Transformar eventos al llegar al eventhouse
dominio: 2
**Update policy**.

## Ventana fija en KQL
dominio: 2
`summarize … by bin(timestamp, 15m)`.

## Promedio de 10 min actualizado cada minuto
dominio: 2
Ventana **hopping** (salto).

## Por qué los informes fallan a cierta hora
dominio: 3
App **Fabric Capacity Metrics** (CU, suavizado y throttling).

## Orden del throttling
dominio: 3
Demora interactiva → rechazo interactivo → rechazo en segundo plano.

## Ejecuciones de todos los ítems en un lugar
dominio: 3
**Monitoring hub**.

## Consultas lentas del warehouse
dominio: 3
Vistas de **`queryinsights`** y estadísticas actualizadas.

## Menos archivos chicos al escribir con Spark
dominio: 3
**Optimized write**; para compactar: `OPTIMIZE` (V-Order) y `VACUUM`.

## Acelerar Spark sin cambiar el código
dominio: 3
**Native execution engine**.

## Consultas KQL lentas sobre días recientes
dominio: 3
Política de **caché** (hot cache) más larga; agregaciones frecuentes: **vista materializada** de KQL.
