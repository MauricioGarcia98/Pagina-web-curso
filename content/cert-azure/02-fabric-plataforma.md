---
titulo: Microsoft Fabric por dentro - OneLake, workspaces, seguridad y ciclo de vida
nivel: Avanzado
duracion: 60
resumen: El primer dominio de DP-700 - capacidades y unidades de cómputo, OneLake, shortcuts y mirroring, los ítems de Fabric (lakehouse, warehouse, eventhouse y más), la configuración del workspace (Spark, dominios, OneLake, Airflow), Git y canalizaciones de despliegue, roles y permisos, seguridad de filas y columnas, etiquetas de confidencialidad, y cómo elegir entre pipeline, notebook y Dataflow Gen2 para orquestar.
objetivos: Explicar cómo se relacionan tenant, capacidad, workspace, ítems y OneLake | Elegir entre lakehouse, warehouse y eventhouse según el caso | Configurar control de versiones con Git y canalizaciones de despliegue con reglas por etapa | Asignar roles de workspace y permisos de ítem con permisos mínimos | Aplicar seguridad de filas, columnas y enmascaramiento en el warehouse
prerrequisitos: cert-azure-mapa-certificaciones | arquitectura-almacenamiento
autoevaluacion: ¿Sabes qué pasa cuando una capacidad se sobrecarga? | ¿Sabes la diferencia entre un shortcut y mirroring? | ¿Sabes qué permite cada rol de workspace? | ¿Sabes cómo cambiar la conexión a la base al pasar de test a prod? | ¿Sabes cuándo orquestar con un pipeline y cuándo con un notebook?
---

:::escenario
La cadena de farmacias de Martín tiene datos en una base Azure SQL (ventas), en archivos de un ADLS Gen2 que maneja otro equipo (stock de proveedores) y en un Snowflake heredado (marketing). La dirección eligió **Microsoft Fabric** para unificar todo. Martín debe armar los workspaces, decidir dónde va cada dato, configurar quién ve qué y garantizar que los cambios pasen de desarrollo a producción sin tocar nada a mano. Es el primer dominio del DP-700: un tercio del examen.
:::

## La idea en una frase

Fabric es una plataforma de analítica **SaaS** (no administras servidores): todos los servicios (ingeniería de datos, warehouse, tiempo real, ciencia de datos, Power BI) comparten **un solo lago, OneLake**, y **una misma capacidad** de cómputo que se paga por tamaño.

```diagrama
titulo: Cómo se organiza Microsoft Fabric
nodo ten: Tenant de Fabric | icono=fabric | col=0 | fila=0 | sub=la organización
nodo cap: Capacidad F64 | icono=velocidad | col=1 | fila=0 | sub=unidades de cómputo (CU) | color=naranja
nodo ws: Workspaces | icono=carpeta | col=2 | fila=0 | sub=Ventas-Dev, Ventas-Prod… | color=azul
nodo it: Ítems | icono=capas | col=3 | fila=0 | sub=lakehouse, warehouse,\neventhouse, pipelines… | color=violeta
nodo ol: OneLake | icono=onelake | col=3 | fila=1 | forma=cilindro | sub=un lago por tenant, Delta Parquet | color=verde
nodo ext: ADLS, S3, Snowflake… | icono=nube | col=1 | fila=1 | sub=fuera de Fabric
flecha ten -> cap
flecha cap -> ws: asigna cómputo
flecha ws -> it
flecha it -> ol: guardan sus datos
flecha ext -> ol: shortcuts y mirroring | estilo=punteada
```

## Capacidad: el cómputo que se comparte

- Una **capacidad** es una cantidad de **unidades de capacidad (CU)** que se compra por tamaño: SKU **F2** a **F2048** (el número indica las CU). Se paga por hora (y se puede **pausar**) o con reserva anual más barata. Una prueba gratuita equivale a una F64.
- Cada **workspace** se asigna a una capacidad, y todos sus ítems consumen de ella.
- **Suavizado** (*smoothing*): el consumo de las operaciones en segundo plano (pipelines, refrescos, Spark) se reparte en 24 horas y el de las interactivas (consultas, informes) en minutos, para absorber picos.
- **Throttling**: si el consumo acumulado supera lo que la capacidad puede pagar, Fabric primero **demora** las operaciones interactivas, después las **rechaza**, y finalmente rechaza también las de segundo plano, hasta que se recupera. Se diagnostica con la app **Fabric Capacity Metrics**.

## OneLake

**OneLake** es el lago único de todo el tenant (Microsoft lo compara con "OneDrive para los datos"):

- Cada workspace es una carpeta de OneLake y cada ítem guarda allí sus datos. Las tablas se guardan en **Delta Parquet**, el formato común de todos los motores de Fabric: lo que escribe Spark en un lakehouse lo lee el warehouse, el motor SQL y Power BI sin copiar.
- Es compatible con la API de **ADLS Gen2**: `abfss://Ventas-Prod@onelake.dfs.fabric.microsoft.com/Lakehouse_Ventas.Lakehouse/Tables/ventas`.
- **Shortcuts**: un acceso directo a datos que están **en otro lugar** (otro lakehouse, otro workspace, ADLS Gen2, Amazon S3, Google Cloud Storage, Dataverse) que se ve como una carpeta o tabla propia. **No copia** datos: lee en el origen.
- **Mirroring**: **replica de forma continua** una base externa (Azure SQL Database, Azure SQL Managed Instance, Cosmos DB, Snowflake, un catálogo de Azure Databricks, PostgreSQL y otras) hacia OneLake en Delta, casi en tiempo real, sin construir pipelines. El cómputo de replicación no consume la capacidad.

| Necesito… | Uso |
|---|---|
| Leer archivos de un ADLS que administra otro equipo, sin moverlos | **Shortcut** |
| Tener una copia actualizada de una base Azure SQL para analizarla sin cargar la base | **Mirroring** |
| Traer una API o un archivo con transformaciones | Pipeline, Dataflow Gen2 o notebook |

## Los ítems principales

| Ítem | Qué es | Lenguajes | Cuándo |
|---|---|---|---|
| **Lakehouse** | Tablas Delta (`Tables/`) y archivos (`Files/`) | PySpark, Spark SQL; T-SQL de solo lectura en su **SQL analytics endpoint** | Datos crudos y semiestructurados, ingeniería con Spark, arquitectura medallón |
| **Warehouse** | Data warehouse relacional sobre Delta | T-SQL completo: `INSERT`, `UPDATE`, `MERGE`, transacciones entre tablas | Equipos que trabajan en SQL, modelos dimensionales, cargas con T-SQL |
| **Eventhouse** (bases KQL) | Base optimizada para eventos y series de tiempo | KQL (Kusto Query Language) | Telemetría, logs, IoT, análisis casi en tiempo real |
| **Notebook** | Código interactivo | PySpark, Spark SQL, Scala, R | Transformaciones y ciencia de datos |
| **Pipeline** (Data Factory) | Orquestación y copia de datos | Actividades y expresiones | Mover datos y coordinar pasos |
| **Dataflow Gen2** | Transformación visual con Power Query | Power Query (M) | Transformaciones sin código para analistas |
| **Copy job** | Copia simple, completa o incremental, sin armar un pipeline | Configuración | Replicar tablas o archivos rápidamente |
| **Eventstream** | Captura y enrutamiento de eventos en tiempo real | Configuración visual | Event Hubs, IoT, CDC hacia eventhouse o lakehouse |
| **Activator** | Reglas que disparan acciones cuando los datos cumplen una condición | Configuración | Alertas y automatizaciones |
| **Modelo semántico** e **informe** | Power BI | DAX | Consumo de negocio |
| **Environment** | Librerías y propiedades de Spark reutilizables | — | Configurar notebooks y jobs de Spark |
| **Trabajo de Apache Airflow** | Airflow administrado dentro de Fabric | Python (DAGs) | Orquestar con Airflow |

:::examen Lakehouse, warehouse o eventhouse
- "El equipo solo sabe T-SQL y necesita `UPDATE` y transacciones entre varias tablas" → **warehouse**. (El SQL analytics endpoint de un lakehouse es **de solo lectura**.)
- "Datos JSON y archivos sin estructura, transformaciones con PySpark" → **lakehouse**.
- "Millones de eventos por minuto de sensores, consultas sobre los últimos minutos" → **eventhouse** con KQL.
:::

## Configuración del workspace

- **Spark**: el **starter pool** arranca sesiones en segundos con nodos ya listos; los **custom pools** definen tamaño de nodo y autoescalado. Los **environments** fijan librerías y propiedades de Spark. El **modo de alta concurrencia** permite que varios notebooks compartan una misma sesión de Spark. El **motor de ejecución nativo** acelera consultas sin cambiar el código.
- **Dominios**: agrupan workspaces por área de negocio (Finanzas, Ventas), con administradores de dominio; base de una organización tipo data mesh.
- **OneLake**: por ejemplo, si se permite acceder a los datos con aplicaciones externas a Fabric (el explorador de OneLake, herramientas de Azure Storage).
- **Apache Airflow**: la configuración del entorno de Airflow (el tamaño y las opciones del runtime) que usan los trabajos de Airflow del workspace. Desde julio de 2026, el temario la menciona explícitamente.

## Ciclo de vida: Git y canalizaciones de despliegue

- **Integración con Git**: un workspace se conecta a una rama de **Azure DevOps** o **GitHub**. Los ítems (notebooks, pipelines, definiciones de lakehouse y warehouse, informes) se guardan como archivos; desde el workspace se hace *commit* y *update*. Cada desarrollador puede tener su propio workspace conectado a su rama.
- **Canalizaciones de despliegue** (*deployment pipelines*): etapas (por ejemplo Desarrollo → Prueba → Producción, hasta 10), cada una asociada a un workspace. Se **compara** el contenido entre etapas y se despliega todo o una selección. Las **reglas de despliegue** cambian valores por etapa (el origen de datos o un parámetro), así producción apunta a la base de producción sin editar nada a mano. Las **bibliotecas de variables** guardan valores por etapa que usan los ítems.
- **Proyectos de base de datos** (SQL projects): el esquema del warehouse o de una base SQL como código (`.sqlproj`), para versionar y desplegar cambios de esquema.

```diagrama
titulo: Del desarrollo a producción en Fabric
nodo dev: Workspace Dev | icono=codigo | col=0 | fila=0 | color=azul
nodo git: Repositorio Git | icono=github | col=0 | fila=1 | sub=rama main
nodo test: Workspace Test | icono=prueba | col=1 | fila=0 | color=amarillo
nodo prod: Workspace Prod | icono=fabric | col=2 | fila=0 | color=verde
nodo reg: Reglas de despliegue | icono=reglas | col=2 | fila=1 | sub=origen de datos por etapa | forma=nota
flecha dev <-> git: commit / update
flecha dev -> test: desplegar | paso=1
flecha test -> prod: desplegar | paso=2
flecha reg -> prod | estilo=punteada
```

## Seguridad y gobierno

### Roles de workspace

| Rol | Puede |
|---|---|
| **Viewer** | Ver y leer contenido (consultas con el SQL endpoint, informes); no edita |
| **Contributor** | Crear, editar y borrar ítems |
| **Member** | Lo anterior y **compartir** ítems y agregar miembros con su mismo rol o menor |
| **Admin** | Todo, incluida la administración de accesos y la configuración del workspace |

### Permisos de ítem

Se puede compartir **un ítem** sin dar acceso al workspace, con permisos como **Read** (ver el ítem), **ReadData** (consultar con SQL), **ReadAll** (leer los archivos de OneLake con Spark) y **Build** (crear informes sobre un modelo semántico). **OneLake security** define roles de acceso a carpetas y tablas dentro de un lakehouse.

### Seguridad dentro del warehouse (T-SQL)

```sql norun
-- Nivel de objeto: el grupo de marketing solo lee la tabla de ventas
GRANT SELECT ON dbo.ventas TO [grp-marketing];

-- Nivel de columna: no ve el costo
DENY SELECT ON dbo.ventas(costo) TO [grp-marketing];

-- Nivel de fila: cada gerente ve solo su región
CREATE FUNCTION seguridad.fn_region(@region varchar(20))
RETURNS TABLE WITH SCHEMABINDING AS
RETURN SELECT 1 AS permitido
       WHERE @region = (SELECT region FROM seguridad.gerentes WHERE email = USER_NAME())
          OR IS_MEMBER('grp-direccion') = 1;
CREATE SECURITY POLICY seguridad.filtro_region
ADD FILTER PREDICATE seguridad.fn_region(region) ON dbo.ventas WITH (STATE = ON);

-- Enmascaramiento dinámico: el email se ve como aXXX@XXXX.com
ALTER TABLE dbo.clientes ALTER COLUMN email ADD MASKED WITH (FUNCTION = 'email()');
GRANT UNMASK TO [grp-atencion];
```

### Etiquetas y respaldo

- **Etiquetas de confidencialidad** (Microsoft Purview Information Protection): marcan un ítem como Público, General, Confidencial…; la etiqueta viaja con los datos exportados.
- **Respaldo** (*endorsement*): **Promoted** (recomendado por su dueño) y **Certified** (validado por personas autorizadas) indican qué ítems son confiables; **Master data** marca la fuente oficial.

## Orquestar: pipeline, notebook o Dataflow Gen2

| Herramienta | Mejor para |
|---|---|
| **Pipeline** | Coordinar pasos (copiar, ejecutar notebooks y procedimientos, ramas `If`, bucles `ForEach`, esperas), con **parámetros** y **expresiones** (`@pipeline().parameters.fecha`), programación horaria o **disparadores por eventos** (por ejemplo, un archivo nuevo en OneLake o Azure Storage) |
| **Notebook** | Transformaciones con código; `notebookutils.notebook.runMultiple` ejecuta varios notebooks con dependencias (un DAG) en la misma sesión |
| **Dataflow Gen2** | Transformaciones visuales con Power Query para quien no programa |
| **Trabajo de Apache Airflow** | Equipos que ya orquestan con DAGs de Airflow |

:::errores
- **Dar Member a todo el equipo "para que puedan trabajar".** Síntoma: cualquiera comparte datos sensibles. Corrección: Contributor para desarrolladores, Viewer o permisos de ítem para consumidores.
- **Copiar con un pipeline los archivos de otro equipo que ya están en ADLS.** Síntoma: datos duplicados y desactualizados. Corrección: shortcut.
- **Cambiar a mano la conexión en producción después de desplegar.** Síntoma: el próximo despliegue la pisa. Corrección: reglas de despliegue o bibliotecas de variables.
- **Esperar `UPDATE` en el SQL analytics endpoint de un lakehouse.** Síntoma: error de solo lectura. Corrección: modificar con Spark, o usar un warehouse.
:::

:::trabajo Una organización típica
Un dominio por área; por cada producto de datos, tres workspaces (Dev, Test, Prod) en una canalización de despliegue, con Dev conectado a Git; capacidades separadas para desarrollo y producción (así una prueba pesada no frena los informes); bronze y silver en lakehouses, gold en un warehouse o lakehouse según el equipo; acceso de los consumidores por permisos de ítem y RLS, y las tablas oficiales certificadas.
:::

:::entrevista
**"¿Shortcut o mirroring?"** El shortcut no copia: lee los datos en su ubicación (otro OneLake, ADLS, S3), ideal cuando ya están en un formato abierto y alguien más los mantiene. Mirroring replica de forma continua una base operativa (Azure SQL, Cosmos DB, Snowflake) a Delta en OneLake, para analizarla sin cargar la base de origen ni construir un pipeline de CDC.
:::

## Ejercicios

:::ejercicio quiz
El equipo de proveedores mantiene archivos Parquet en un ADLS Gen2. Martín necesita consultarlos desde un lakehouse sin duplicarlos. ¿Qué crea?
- [ ] Un pipeline con una copy activity diaria hacia el lakehouse.
- [x] Un shortcut en el lakehouse que apunte a esa ruta de ADLS Gen2.
- [ ] Mirroring de la cuenta de almacenamiento.
- [ ] Un Dataflow Gen2 que lea y guarde los archivos.
```explicacion
El shortcut expone los datos externos como una carpeta o tabla del lakehouse sin copiarlos. Mirroring es para bases de datos, no para archivos en ADLS.
```
:::

:::ejercicio quiz
Hay que tener en Fabric una copia casi en tiempo real de una base Azure SQL Database, sin construir pipelines ni cargar la base con consultas. ¿Qué usas?
- [ ] Un shortcut a la base Azure SQL.
- [x] Mirroring de Azure SQL Database.
- [ ] Una copy activity programada cada 5 minutos.
- [ ] Un eventstream conectado a la base.
```explicacion
Mirroring replica continuamente la base hacia OneLake en Delta. Los shortcuts apuntan a almacenamiento, no a bases relacionales.
```
:::

:::ejercicio quiz
Un analista debe poder crear y editar notebooks y pipelines en el workspace, pero no compartir ítems ni administrar accesos. ¿Qué rol le das?
- [ ] Viewer
- [x] Contributor
- [ ] Member
- [ ] Admin
```explicacion
Contributor crea, edita y borra ítems. Member además comparte, y Admin administra accesos y configuración.
```
:::

:::ejercicio quiz
Al desplegar de Prueba a Producción, el pipeline debe conectarse a la base de producción en lugar de la de prueba, sin editar nada a mano. ¿Qué configuras?
- [ ] Dos versiones del pipeline, una por base.
- [x] Una regla de despliegue (o una biblioteca de variables) con el origen de datos de cada etapa.
- [ ] Un parámetro que el operador cambia después de cada despliegue.
- [ ] La integración con Git en el workspace de producción.
```explicacion
Las reglas de despliegue y las bibliotecas de variables cambian valores por etapa automáticamente al desplegar.
```
:::

:::ejercicio quiz
Un equipo que trabaja solo en T-SQL necesita cargar tablas con `MERGE` y transacciones que afecten varias tablas a la vez. ¿Qué ítem usa?
- [ ] El SQL analytics endpoint de un lakehouse.
- [x] Un warehouse.
- [ ] Un eventhouse.
- [ ] Un Dataflow Gen2.
```explicacion
El warehouse soporta T-SQL completo con transacciones entre tablas. El SQL analytics endpoint del lakehouse es de solo lectura.
```
:::

:::ejercicio quiz
Los informes de la mañana empiezan a fallar con errores de rechazo y la app Capacity Metrics muestra el consumo por encima del 100 % durante horas. ¿Qué está pasando?
- [ ] El workspace perdió la conexión con Git.
- [x] La capacidad entró en throttling por exceso de consumo acumulado.
- [ ] OneLake alcanzó su límite de almacenamiento.
- [ ] Los informes no tienen etiqueta de confidencialidad.
```explicacion
Cuando el consumo suavizado supera la capacidad, Fabric demora y luego rechaza operaciones. Se resuelve optimizando las cargas, moviendo trabajo a otra capacidad o ampliándola.
```
:::

:::ejercicio abierto
En el warehouse, escribe las sentencias para que el grupo `grp-call-center` vea la columna `telefono` de `dbo.clientes` enmascarada, salvo el grupo `grp-supervisores`, que la ve completa.
```sql solucion
ALTER TABLE dbo.clientes ALTER COLUMN telefono ADD MASKED WITH (FUNCTION = 'partial(0,"XXX-XXX-",4)');
GRANT SELECT ON dbo.clientes TO [grp-call-center];
GRANT SELECT ON dbo.clientes TO [grp-supervisores];
GRANT UNMASK TO [grp-supervisores];
```
:::
