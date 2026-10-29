---
titulo: La plataforma por dentro - arquitectura, cómputo y costos
nivel: Intermedio
duracion: 45
resumen: Plano de control y plano de cómputo, serverless y cómputo clásico, SQL warehouses, job clusters, modos de acceso Standard y Dedicated, Photon, pools, políticas y cómo se calcula lo que pagas.
objetivos: Explicar qué vive en el plano de control y qué en el plano de cómputo | Elegir el tipo de cómputo correcto para notebooks, jobs, pipelines y consultas SQL | Distinguir los modos de acceso Standard y Dedicated y sus limitaciones | Calcular el costo de una carga con DBU y consultarlo en las tablas de sistema | Usar políticas de clúster y pools para controlar costos y tiempos de arranque
prerrequisitos: cert-databricks-mapa-certificaciones | databricks-que-es-databricks
autoevaluacion: ¿Sabes dónde se procesan los datos en serverless y en cómputo clásico? | ¿Puedes elegir entre all-purpose, job cluster, serverless y SQL warehouse para un caso dado? | ¿Sabes qué no se puede hacer en modo Standard? | ¿Sabes consultar el gasto por producto en system.billing.usage? | ¿Sabes para qué sirve una política de clúster?
---

:::escenario
La factura de Databricks de la empresa de Valentina subió 40 % en dos meses. El gerente pregunta qué pasó. Al revisar, aparecen tres clústeres *all-purpose* encendidos todo el día que ejecutan jobs nocturnos, y un SQL warehouse clásico sin autoapagado. Entender **qué tipo de cómputo existe, cuánto cuesta cada uno y cuándo usarlo** es el primer dominio del examen y, en el trabajo, la forma más rápida de ahorrar dinero.
:::

## La idea en una frase

Databricks separa **dónde se coordina** el trabajo (el *plano de control*, que administra Databricks) de **dónde se procesan los datos** (el *plano de cómputo*), y tus datos viven siempre en **tu** almacenamiento en la nube.

## Los dos planos

```diagrama
titulo: Arquitectura de Databricks: plano de control, plano de cómputo y tu almacenamiento
nodo usr: Usuarios y CI/CD | icono=usuario | col=0 | fila=0 | sub=web, CLI, API
nodo ctl: Plano de control | icono=engranaje | col=1 | fila=0 | sub=web app, notebooks,\nscheduler de jobs, Unity Catalog | color=violeta
nodo srv: Cómputo serverless | icono=nube | col=2 | fila=0 | sub=en la cuenta de Databricks | color=verde
nodo cls: Cómputo clásico | icono=servidor | col=2 | fila=1 | sub=VMs en TU cuenta de nube | color=naranja
nodo lake: Tu almacenamiento | icono=bucket | col=3 | fila=0 | forma=cilindro | sub=S3, ADLS, GCS: tablas Delta | color=azul
grupo cdb: Administrado por Databricks | nodos=ctl,srv | color=violeta
flecha usr -> ctl
flecha ctl -> srv: lanza
flecha ctl -> cls: lanza | estilo=punteada
flecha srv -> lake: lee/escribe
flecha cls -> lake: lee/escribe
```

- **Plano de control.** Lo opera Databricks: la interfaz web, el servicio de notebooks, el *scheduler* de Lakeflow Jobs, la API REST, el servicio de Unity Catalog (metadatos y permisos). Tus datos de negocio **no** se guardan acá; sí los metadatos, el código de los notebooks y los resultados que muestras en pantalla.
- **Plano de cómputo.** Donde corre Spark (o Photon) sobre tus datos. Puede ser:
  - **Clásico:** las máquinas virtuales se crean en **tu** cuenta de nube (tu VPC o VNet). Pagas a Databricks los DBU **y** a tu proveedor de nube las máquinas.
  - **Serverless:** las máquinas viven en una cuenta que administra Databricks, en la misma región. Arrancan en segundos, escalan solas y pagas solo DBU (la infraestructura va incluida en el precio).
- **Almacenamiento.** Las tablas Delta y los volúmenes están en tu S3, ADLS Gen2 o GCS. Unity Catalog decide quién puede leer qué y entrega credenciales temporales al cómputo.

Una **cuenta** de Databricks contiene uno o más **workspaces** (entornos de trabajo con su URL). Unity Catalog tiene **un metastore por región**, al que se asignan los workspaces de esa región.

## Los tipos de cómputo

| Cómputo | Para qué | Cómo se paga | Arranque |
|---|---|---|---|
| **Serverless para notebooks** | Desarrollo interactivo en Python y SQL | DBU serverless | Segundos |
| **Serverless para jobs y pipelines** | Jobs y Declarative Pipelines en producción sin administrar máquinas | DBU serverless | Segundos |
| **SQL warehouse** (serverless, pro o clásico) | Consultas SQL, dashboards, herramientas de BI, dbt | DBU de SQL | Serverless: segundos; clásico/pro: minutos |
| **Clúster all-purpose** (clásico) | Trabajo interactivo compartido cuando necesitas configuración propia (librerías, GPU, init scripts) | DBU *all-purpose* (los más caros) + VMs | Minutos |
| **Job cluster** (clásico) | Un job en producción: se crea al empezar y se borra al terminar | DBU *jobs* (más baratos) + VMs | Minutos |

:::analogia
El **clúster all-purpose** es un auto propio que dejas estacionado con el motor prendido para que cualquiera lo use: cómodo, pero pagas aunque nadie lo maneje. El **job cluster** es un taxi que pides para un viaje y se va al llegar. **Serverless** es un servicio de autos que aparece en segundos y te cobra solo el trayecto.
:::

### Las configuraciones que importan en el cómputo clásico

- **Databricks Runtime (DBR):** la versión de Spark más las librerías de Databricks. Las versiones **LTS** (*long term support*) tienen soporte extendido: úsalas en producción. La variante **ML** trae librerías de machine learning.
- **Photon:** motor vectorizado escrito en C++ que acelera SQL y DataFrames (agregaciones, joins, escritura Delta). Consume DBU con un multiplicador, pero suele terminar antes y costar menos en total. Viene activado en los SQL warehouses y en serverless.
- **Autoscaling:** mínimo y máximo de *workers*; Databricks agrega o quita nodos según la carga.
- **Auto termination:** apaga un clúster all-purpose tras N minutos sin uso. Es la configuración que más dinero ahorra.
- **Instance pools:** máquinas ya creadas y en espera, que bajan el tiempo de arranque de minutos a segundos. Las máquinas inactivas del pool no consumen DBU, pero sí costo de nube.
- **Políticas de clúster (*compute policies*):** reglas que limitan qué pueden crear los usuarios (tipos de máquina, máximo de workers, autoapagado obligatorio, etiquetas de costo). Son la herramienta de gobierno de costos del administrador.

## Modos de acceso: Standard y Dedicated

Para usar Unity Catalog, el cómputo clásico tiene un **modo de acceso**:

| Modo | Antes se llamaba | Quién lo usa | Limitaciones |
|---|---|---|---|
| **Standard** | *Shared* | Varios usuarios a la vez, aislados entre sí (Lakeguard) | Python y SQL (Scala desde DBR 13.3 LTS); sin R; sin API de RDD; sin acceso privilegiado a la máquina |
| **Dedicated** | *Single user* | Un usuario o un grupo asignado | Permite RDD, R, GPU, ML distribuido y acceso a la máquina |

Databricks recomienda **Standard** para la mayoría de las cargas. **Serverless** está construido sobre la misma arquitectura que Standard, por eso tiene restricciones parecidas (por ejemplo, no hay API de RDD ni `sparkContext`).

:::examen Cómo suelen preguntarlo
"Un científico de datos necesita usar la API de RDD y librerías de R en un clúster con Unity Catalog. ¿Qué modo de acceso?" → **Dedicated**. "Diez analistas comparten un clúster y cada uno debe ver solo lo que sus permisos permiten" → **Standard**.
:::

## SQL warehouses: tres tipos

| Tipo | Arranque | Funciones avanzadas | Cuándo |
|---|---|---|---|
| **Serverless** | Segundos | Todas (Photon, *Intelligent Workload Management*, caché de resultados, escalado rápido) | Opción por defecto recomendada |
| **Pro** | Minutos | Casi todas (incluye funciones de Lakehouse Federation y Python UDFs) | Cuando la red exige cómputo en tu cuenta |
| **Classic** | Minutos | Básicas | Casos heredados |

Un warehouse tiene un **tamaño** (2X-Small a 4X-Large: cuánta potencia por clúster) y un **escalado** (mínimo y máximo de clústeres, para atender más consultas a la vez). Si las consultas son **lentas** sube el tamaño; si **se encolan** porque hay muchos usuarios, sube el máximo de clústeres.

## Cuánto cuesta: DBU

Databricks cobra en **DBU** (*Databricks Units*): una unidad de capacidad de procesamiento por hora. El costo es:

```text
costo = DBU consumidos × precio del DBU según el SKU    (+ VMs de tu nube, si es cómputo clásico)
```

El precio del DBU cambia según el **SKU**: *Jobs Compute* es mucho más barato que *All-Purpose Compute*, y serverless incluye la infraestructura. Por eso el mismo notebook cuesta bastante menos ejecutado como job que en un clúster interactivo.

### Medir el gasto con las tablas de sistema

Las **tablas de sistema** (`system.*`) son tablas que Databricks llena con datos operativos de tu cuenta: facturación, consultas, jobs, linaje, auditoría. Las de costo son `system.billing.usage` (cuánto se consumió) y `system.billing.list_prices` (a qué precio de lista).

```sql norun
-- Gasto aproximado de los últimos 30 días por producto, a precio de lista
SELECT
  u.billing_origin_product                       AS producto,     -- JOBS, SQL, ALL_PURPOSE, DLT, MODEL_SERVING…
  ROUND(SUM(u.usage_quantity), 1)                AS dbu,
  ROUND(SUM(u.usage_quantity * lp.pricing.default), 2) AS usd_lista
FROM system.billing.usage u
JOIN system.billing.list_prices lp
  ON  u.sku_name = lp.sku_name
  AND u.usage_start_time >= lp.price_start_time
  AND (lp.price_end_time IS NULL OR u.usage_start_time < lp.price_end_time)
WHERE u.usage_date >= current_date() - INTERVAL 30 DAYS
GROUP BY ALL
ORDER BY usd_lista DESC;
```

Línea por línea:

- `usage_quantity` es la cantidad consumida en la unidad del SKU (normalmente DBU).
- El *join* con `list_prices` busca el precio vigente **en el momento del consumo** (los precios tienen fecha de inicio y de fin).
- `GROUP BY ALL` agrupa por todas las columnas que no son agregaciones (sintaxis de Databricks SQL).
- `usage_metadata` (no usado acá) trae el `job_id`, `cluster_id` o `warehouse_id` para bajar al detalle de qué recurso gastó.

:::errores
- **Jobs nocturnos en clústeres all-purpose.** Síntoma: factura alta con poco uso interactivo. Corrección: job clusters o serverless para jobs.
- **Sin autoapagado.** Síntoma: clústeres con 24 h de uptime y CPU casi en cero. Corrección: `autotermination_minutes` en una política obligatoria.
- **Agrandar el warehouse cuando el problema es concurrencia.** Síntoma: las consultas esperan en cola pero cada una es rápida. Corrección: subir el máximo de clústeres, no el tamaño.
- **Usar Dedicated "por las dudas".** Síntoma: un clúster por persona, caro y subutilizado. Corrección: Standard compartido salvo que haga falta RDD, R o GPU.
:::

:::trabajo Cómo se gobierna el costo en una empresa
El equipo de plataforma define **políticas de clúster** (por ejemplo, "jobs: máximo 8 workers, Photon activado, etiqueta `centro_costo` obligatoria"), activa **serverless** por defecto para notebooks y jobs, y arma un **dashboard** sobre `system.billing.usage` agrupado por etiqueta y por job. Con **budgets** de la cuenta se envían alertas cuando un equipo supera su presupuesto mensual.
:::

:::entrevista
**"¿Cuándo usarías un job cluster clásico en vez de serverless para jobs?"** Cuando necesito algo que serverless no permite: un tipo de máquina específico (GPU), init scripts o librerías del sistema, conectividad de red particular hacia recursos privados, o la API de RDD. Si no hay una restricción así, serverless es más simple: arranca en segundos, no administro máquinas y no pago tiempo ocioso.
:::

## Resumen

| Necesito… | Uso |
|---|---|
| Explorar datos con Python y SQL | Serverless para notebooks |
| Un job en producción sin requisitos especiales | Serverless para jobs |
| Un job que necesita GPU o librerías del sistema | Job cluster clásico (modo Dedicated si hace falta) |
| Dashboards, BI o dbt | SQL warehouse serverless |
| Varios usuarios compartiendo un clúster con Unity Catalog | Modo Standard |
| RDD, R o ML distribuido | Modo Dedicated |
| Saber qué gasta cada cosa | `system.billing.usage` + `system.billing.list_prices` |

## Ejercicios

:::ejercicio quiz
Un pipeline de ingesta corre todas las noches durante 40 minutos y no tiene requisitos especiales de red ni librerías. Hoy usa un clúster all-purpose que queda encendido. ¿Qué cambio reduce más el costo sin agregar trabajo de administración?
- [ ] Activar el autoapagado del clúster all-purpose a los 120 minutos.
- [x] Ejecutarlo en un job con cómputo serverless para jobs.
- [ ] Crear un instance pool para que el clúster arranque más rápido.
- [ ] Pasar el clúster all-purpose a modo de acceso Dedicated.
```explicacion
Serverless para jobs cobra solo el tiempo de ejecución, sin VMs ociosas ni administración. El autoapagado ayuda, pero sigues pagando DBU all-purpose (más caros) y el tiempo hasta que se apaga. El pool reduce el arranque, no el costo de DBU.
```
:::

:::ejercicio quiz
Un equipo de 12 analistas comparte un clúster clásico para notebooks de Python y SQL. Cada uno debe ver solo las tablas que sus permisos de Unity Catalog permiten. ¿Qué modo de acceso usas?
- [x] Standard
- [ ] Dedicated asignado a un usuario
- [ ] Sin aislamiento (*no isolation shared*)
- [ ] Cualquiera: Unity Catalog funciona igual en todos los modos
```explicacion
Standard está pensado para varios usuarios con aislamiento entre ellos (Lakeguard) y aplica los permisos de Unity Catalog. El modo sin aislamiento no es compatible con Unity Catalog.
```
:::

:::ejercicio quiz
Un científico de datos necesita entrenar un modelo con GPU y usar código heredado que usa la API de RDD. ¿Qué cómputo corresponde?
- [ ] Serverless para notebooks, porque escala solo.
- [ ] Un clúster en modo Standard con muchos workers.
- [x] Un clúster clásico en modo Dedicated con un runtime ML y GPU.
- [ ] Un SQL warehouse serverless de tamaño grande.
```explicacion
La API de RDD no está disponible en Standard ni en serverless, y las GPU requieren cómputo clásico configurado para eso. Dedicated permite ambas cosas.
```
:::

:::ejercicio quiz
En un SQL warehouse, las consultas tardan 2 segundos cada una, pero en horario pico los usuarios esperan 30 segundos antes de que empiecen. ¿Qué ajustas?
- [ ] El tamaño del warehouse, de Small a Large.
- [x] El máximo de clústeres del escalado, para atender más consultas en paralelo.
- [ ] El runtime de Databricks a una versión LTS.
- [ ] Desactivar Photon para liberar recursos.
```explicacion
La espera antes de empezar es **cola** por concurrencia: más clústeres atienden más consultas a la vez. El tamaño ayuda cuando cada consulta es lenta.
```
:::

:::ejercicio quiz
¿Qué parte de la arquitectura administra Databricks en cómputo **clásico**?
- [ ] Las máquinas virtuales donde corre Spark.
- [x] El plano de control: interfaz web, scheduler de jobs, notebooks y servicio de Unity Catalog.
- [ ] El almacenamiento donde se guardan las tablas Delta.
- [ ] La red virtual de la empresa.
```explicacion
En cómputo clásico, las VMs se crean en tu cuenta de nube y los datos están en tu almacenamiento. Databricks opera el plano de control. En serverless, Databricks además opera el cómputo.
```
:::

:::ejercicio abierto
Escribe la consulta que muestre, para el mes en curso, los 10 jobs que más DBU consumieron. Pista: el id del job está en `usage_metadata.job_id`.
```sql solucion
SELECT
  usage_metadata.job_id AS job_id,
  ROUND(SUM(usage_quantity), 1) AS dbu
FROM system.billing.usage
WHERE usage_date >= date_trunc('MONTH', current_date())
  AND usage_metadata.job_id IS NOT NULL
GROUP BY usage_metadata.job_id
ORDER BY dbu DESC
LIMIT 10;
```
:::

:::ejercicio cli
Con la CLI de Databricks, lista los clústeres del workspace.
```respuesta
databricks clusters list
```
:::

:::ejercicio abierto
Tu empresa quiere que ningún usuario pueda crear clústeres all-purpose de más de 4 workers ni sin autoapagado. Describe qué herramienta de la plataforma usas y qué reglas le pondrías.
```text solucion
Una política de clúster (compute policy) asignada a los usuarios, con reglas como:
- autoscale.max_workers: máximo 4 (tipo "range", maxValue 4).
- autotermination_minutes: fijo o con máximo de 60 (no se puede desactivar).
- custom_tags.centro_costo: obligatoria, para repartir el gasto.
- node_type_id: lista permitida de tipos de máquina.
Los usuarios sin permiso de crear clústeres sin política solo pueden crear dentro de esos límites.
```
:::
