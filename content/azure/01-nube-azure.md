---
titulo: La nube y Azure en 20 minutos
nivel: Básico
duracion: 35
resumen: Qué es la nube, la jerarquía de Azure (tenant, suscripción, grupo de recursos, recurso), regiones y costos.
---

## ¿Qué es "la nube"?

"La nube" es usar **computadoras, almacenamiento y servicios de otra empresa** (Microsoft, Amazon o Google) a través de internet, **pagando solo por lo que usas**, en lugar de comprar y mantener servidores propios.

:::analogia Comprar un auto vs. pedir un taxi
Tener servidores propios es como comprar un auto: pagas todo por adelantado, pagas el seguro y el mantenimiento aunque no lo uses, y si un día necesitas diez autos no los tienes. La nube es como pedir un taxi: pagas por kilómetro, nadie te cobra cuando no viajas y puedes pedir diez a la vez durante una hora.
:::

Para un data engineer esto cambia todo. Procesar 2 TB una vez al mes ya no exige comprar un clúster de 40 servidores que pasa 29 días apagado: lo creas a las 3 de la mañana, procesa durante una hora y lo apagas. Pagas una hora.

### Tres formas de usar la nube

Según cuánto administras tú y cuánto el proveedor:

| Modelo | El proveedor se encarga de… | Tú te encargas de… | Ejemplo en Azure |
|---|---|---|---|
| **IaaS** (infraestructura como servicio) | El hardware, la red y la electricidad | Sistema operativo, parches, software y datos | Máquinas virtuales |
| **PaaS** (plataforma como servicio) | Todo lo anterior + sistema operativo y software | Tu código y tus datos | Azure SQL Database, Data Factory, Databricks |
| **SaaS** (software como servicio) | Todo | Solo lo usas | Microsoft 365, Power BI |

Los data engineers trabajan casi siempre con **PaaS**: no instalas Spark ni parchas Linux, creas un workspace de Databricks y escribes código.

## La jerarquía de Azure

Todo lo que creas en Azure vive dentro de una jerarquía de cajas. Entenderla es clave, porque los **permisos**, la **facturación** y las **políticas** se asignan en algún nivel y se heredan hacia abajo.

```text
Tenant (tu organización en Microsoft Entra ID: usuarios, grupos, identidades)
 └── Management groups (opcional, para empresas grandes)
      └── Suscripciones (unidad de facturación y límites)   ← "sub-datos-prod", "sub-datos-dev"
           └── Grupos de recursos (contenedores lógicos)    ← "rg-datos-dev"
                └── Recursos                                ← cuenta de almacenamiento, workspace de Databricks, Key Vault…
```

<!-- dg:az01-jerarquia -->
```diagrama
titulo: La jerarquía de Azure: los permisos y la facturación se heredan hacia abajo
nodo t: Tenant (Entra ID) | icono=equipo | col=1 | fila=0 | color=violeta | sub=usuarios y grupos
nodo s1: sub-datos-dev | icono=dinero | col=0 | fila=1 | color=azul | sub=suscripción
nodo s2: sub-datos-prod | icono=dinero | col=2 | fila=1 | color=azul | sub=suscripción
nodo rg1: rg-datos-dev | icono=capas | col=0 | fila=2 | color=gris | sub=grupo de recursos
nodo rg2: rg-datos-prod | icono=capas | col=2 | fila=2 | color=gris | sub=grupo de recursos
nodo r1: Lake + Databricks | icono=bucket | col=1 | fila=2 | color=naranja | sub=recursos de dev
nodo r2: Lake + Key Vault | icono=candado | col=3 | fila=2 | color=naranja | sub=recursos de prod
flecha t -> s1
flecha t -> s2
flecha s1 -> rg1
flecha s2 -> rg2
flecha rg1 -> r1
flecha rg2 -> r2
```

Nivel por nivel:

- **Tenant y Microsoft Entra ID** (antes llamado Azure Active Directory): el directorio de **identidades** de la empresa. Ahí viven los usuarios (`ana@tiendaandina.com`), los grupos (`grp-data-engineers`) y las identidades de aplicaciones (*service principals* y *managed identities*), que son las "cuentas" que usan los programas, por ejemplo Airflow o Data Factory, para entrar a otros servicios.
- **Management groups**: carpetas para agrupar suscripciones y aplicarles reglas en conjunto ("en ninguna suscripción se pueden crear recursos fuera de Sudamérica").
- **Suscripción**: la unidad de **facturación**. Todo recurso pertenece a una suscripción y su costo llega a esa factura. Las empresas suelen tener una suscripción por entorno (dev, test, prod) para que un error en desarrollo nunca toque producción y para saber cuánto cuesta cada uno.
- **Grupo de recursos**: una carpeta lógica con recursos que **nacen y mueren juntos**: el lake, el Databricks y el Key Vault de un mismo proyecto. Borrar el grupo borra todo lo que contiene, algo muy útil para limpiar un laboratorio.
- **Recurso**: cada servicio concreto que creas: una cuenta de almacenamiento, un workspace de Databricks, un Key Vault.

### Regiones

Un **recurso vive en una región**: un conjunto de centros de datos en una zona geográfica (`eastus2`, `brazilsouth`, `westeurope`, `mexicocentral`, `chilecentral`…). Para elegirla, mira tres cosas:

1. **Cercanía**: a tus usuarios y, sobre todo, **a tus datos**. Si el lake está en `brazilsouth` y Databricks en `eastus2`, cada lectura cruza el continente: es más lento y además **se cobra la transferencia** entre regiones.
2. **Leyes**: algunas regulaciones (salud, banca) exigen que los datos se queden en el país o la región.
3. **Disponibilidad y precio**: no todos los servicios ni tipos de máquina existen en todas las regiones, y los precios cambian de una región a otra.

:::tip Regla práctica
Pon el almacenamiento y el cómputo que lo procesa **en la misma región**.
:::

### Nombres y etiquetas

Las empresas usan una **convención de nombres** para saber qué es cada cosa con solo leerla. Una muy común es `<tipo>-<proyecto>-<entorno>-<región>`:

| Recurso | Nombre de ejemplo |
|---|---|
| Grupo de recursos | `rg-datos-prod-brs` |
| Cuenta de almacenamiento (solo minúsculas y números, máximo 24, único en todo Azure) | `stlakeandinaprod` |
| Databricks | `dbw-datos-prod-brs` |
| Key Vault | `kv-datos-prod-brs` |

Además se ponen **etiquetas (tags)**, pares clave-valor como `proyecto=lakehouse`, `entorno=prod` y `responsable=equipo-datos`, que después permiten filtrar la factura por proyecto.

## Los servicios de datos que más vas a usar

| Servicio | Para qué | Equivalente en AWS / GCP |
|---|---|---|
| **Azure Data Lake Storage Gen2** (una Storage Account con *hierarchical namespace*) | El data lake: archivos Parquet/Delta en contenedores `bronze`, `silver` y `gold` | S3 / Cloud Storage |
| **Azure Databricks** | Spark, notebooks, Delta Lake, SQL warehouses y jobs | Databricks en AWS o GCP, EMR, Dataproc |
| **Azure Data Factory** | Copiar datos entre sistemas (EL) y orquestación visual | Glue, Data Fusion |
| **Microsoft Fabric / Synapse** | Plataforma analítica de Microsoft (lakehouse, warehouse, Power BI) | Redshift / BigQuery |
| **Azure Key Vault** | Guardar secretos, llaves y certificados | Secrets Manager / Secret Manager |
| **Event Hubs** | Ingesta de eventos en streaming (compatible con Kafka) | Kinesis / Pub/Sub |
| **Azure SQL Database** | Base relacional administrada | RDS / Cloud SQL |
| **Azure Monitor / Log Analytics** | Logs, métricas y alertas | CloudWatch / Cloud Logging |

### Cómo encajan en un lakehouse

Así se vería la plataforma de datos de Tienda Andina en Azure:

```text
  ERP / web / app ──► Data Factory ──► ADLS Gen2 (bronze) ──► Databricks ──► ADLS (silver, gold) ──► Power BI
       eventos     ──► Event Hubs  ──┘                         ▲    │
                                         Key Vault (secretos) ─┘    └─► Azure Monitor (logs y alertas)
                          Airflow o Data Factory orquestan todo el flujo cada noche
```

## Costos (¡importante!)

La nube cobra principalmente por tres cosas:

1. **Cómputo encendido**, por minuto: máquinas virtuales, clústeres de Databricks, SQL warehouses.
2. **Almacenamiento**, por GB al mes: barato, pero se acumula.
3. **Transferencia de datos** que sale de la región o de Azure.

Un ejemplo para dimensionarlo: un clúster de 4 máquinas que cuesta unos 3 USD la hora, si alguien lo deja prendido un fin de semana largo (72 horas), cuesta 216 USD **sin procesar nada**. Las sorpresas más comunes son clústeres que quedaron prendidos, VMs olvidadas y datos duplicados.

Buenas prácticas desde el primer día:

- **Alertas de presupuesto** (*Cost Management + Budgets*): un correo cuando gastas el 50 %, 80 % y 100 % de lo previsto.
- **Etiquetas** por proyecto y entorno, para saber quién gasta qué.
- **Auto-apagado** de clústeres de Databricks después de 15–30 minutos sin uso.
- **Borrar los grupos de recursos** de pruebas al terminar.

:::tip Cuenta gratuita
Azure ofrece una cuenta gratuita con crédito inicial para probar. Crea todo lo de este módulo en un grupo de recursos de laboratorio y **bórralo al terminar**.
:::

## Pruébalo en la terminal

En las próximas lecciones vas a manejar Azure con la **Azure CLI** (`az`). Abre la terminal del curso (botón ⌨ Terminal) y prueba: `az login`, luego `az account show` (en qué suscripción estás) y `az group list -o table` (los grupos de recursos que existen; al principio, ninguno). Es un simulador: nada se crea de verdad ni cuesta dinero.

## Ejercicios

:::ejercicio quiz
¿Qué pasa si borras un **grupo de recursos**?

- [ ] Solo se borra el nombre
- [x] Se borran todos los recursos que contiene
- [ ] Se borra la suscripción
- [ ] Nada, hay que borrar cada recurso antes
:::

:::ejercicio quiz
¿Dónde se gestionan los usuarios, grupos e identidades de aplicaciones en Azure?

- [ ] En Azure Storage
- [x] En Microsoft Entra ID (antes Azure Active Directory)
- [ ] En el grupo de recursos
- [ ] En Databricks
:::

:::ejercicio quiz
¿Qué servicio usarías como **data lake** para guardar archivos Delta en capas bronze/silver/gold?

- [ ] Azure SQL Database
- [ ] Key Vault
- [x] Azure Data Lake Storage Gen2
- [ ] Event Hubs
:::
