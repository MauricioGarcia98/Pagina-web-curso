---
titulo: La nube y Azure en 20 minutos
nivel: Básico
duracion: 20
resumen: Qué es la nube, la jerarquía de Azure (tenant, suscripción, grupo de recursos, recurso), regiones y costos.
---

## ¿Qué es “la nube”?

Usar computadoras, almacenamiento y servicios de un proveedor (Microsoft, Amazon, Google) **a demanda y pagando por uso**, en lugar de comprar servidores propios.

| Modelo | Tú gestionas | Ejemplo en Azure |
|---|---|---|
| **IaaS** (infraestructura) | Sistema operativo, software, datos | Máquinas virtuales |
| **PaaS** (plataforma) | Tu código y datos | Azure SQL Database, Data Factory, Databricks |
| **SaaS** (software) | Solo lo usas | Microsoft 365, Power BI |

## La jerarquía de Azure

```text
Tenant (tu organización en Microsoft Entra ID: usuarios, grupos, identidades)
 └── Management groups (opcional, para empresas grandes)
      └── Suscripciones (unidad de facturación y límites)   ← "sub-datos-prod", "sub-datos-dev"
           └── Grupos de recursos (contenedores lógicos)    ← "rg-datos-dev"
                └── Recursos                                ← cuenta de almacenamiento, workspace de Databricks, Key Vault…
```

- **Microsoft Entra ID** (antes Azure Active Directory): el directorio de identidades. Usuarios, grupos, aplicaciones.
- **Suscripción**: a ella se facturan los recursos. Las empresas separan dev / test / prod en suscripciones distintas.
- **Grupo de recursos**: agrupa recursos que comparten ciclo de vida. Borrar el grupo borra todo lo que contiene (¡útil para limpiar laboratorios!).
- **Región**: centro de datos físico (`eastus2`, `brazilsouth`, `westeurope`, `mexicocentral`…). Elige una cercana a tus usuarios y a tus datos.

## Los servicios de datos que más vas a usar

| Servicio | Para qué |
|---|---|
| **Azure Data Lake Storage Gen2** (una Storage Account con *hierarchical namespace*) | El data lake: archivos Parquet/Delta en contenedores `bronze`, `silver`, `gold` |
| **Azure Databricks** | Spark, notebooks, Delta Lake, SQL warehouses, jobs |
| **Azure Data Factory** | Mover/copiar datos entre sistemas (EL), orquestación visual |
| **Microsoft Fabric / Synapse** | Plataforma analítica de Microsoft (lakehouse, warehouse, Power BI) |
| **Azure Key Vault** | Guardar secretos, llaves y certificados |
| **Event Hubs** | Ingesta de eventos en streaming (compatible con Kafka) |
| **Azure SQL Database** | Base relacional administrada |
| **Azure Monitor / Log Analytics** | Logs, métricas y alertas |

## Costos (¡importante!)

La nube cobra por lo que **está encendido** y lo que **almacenas**. Las sorpresas más comunes: clusters que quedaron prendidos, VMs olvidadas, datos duplicados. Buenas prácticas: alertas de presupuesto (*Cost Management + Budgets*), **etiquetas (tags)** por proyecto y entorno, auto-apagado de clusters, y borrar los grupos de recursos de pruebas.

:::tip Cuenta gratuita
Azure ofrece una cuenta gratuita con crédito inicial para probar. Crea todo lo de este módulo en un grupo de recursos de laboratorio y **bórralo al terminar**.
:::

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
