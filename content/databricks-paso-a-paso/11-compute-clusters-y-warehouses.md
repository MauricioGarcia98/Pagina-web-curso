---
titulo: Compute - clusters, SQL warehouses, serverless y el costo
nivel: 3 · Intermedio
duracion: 50
resumen: Nada corre sin cómputo. Qué es un cluster y qué es un SQL warehouse, crear un cluster leyendo cada campo del formulario (runtime, tipo de nodo, workers, autoescalado, autoterminación, Photon, spot), los estados de un cluster y su registro de eventos, los tamaños de un warehouse, qué es serverless y cómo se calcula el costo en DBU - lo que más errores caros causa en los equipos nuevos.
objetivos: Distinguir cluster de uso general, job compute, SQL warehouse y serverless | Crear un cluster entendiendo cada campo | Leer estados y eventos de un cluster | Crear un SQL warehouse y elegir su tamaño | Estimar y controlar el costo (DBU, autoterminación)
prerrequisitos: databricks-paso-a-paso-merge-y-cargas-incrementales
autoevaluacion: ¿Sabes qué es un DBU? | ¿Sabes qué pasa si no pones autoterminación? | ¿Sabes cuándo usar un warehouse y cuándo un cluster? | ¿Sabes qué cambia al marcar Photon?
---

:::analogia En palabras simples
El cómputo son las máquinas alquiladas por hora. Un **cluster** es un grupo de máquinas para tus notebooks y jobs; un **SQL warehouse** es un grupo de máquinas afinadas para SQL; **serverless** es que Databricks las tenga listas y te cobre solo lo que usas. Como en cualquier alquiler por hora, lo caro no es usarlas: es olvidarlas encendidas.
:::

## Paso 1 — Los tipos de cómputo

| Tipo | Para | Quién lo enciende |
|---|---|---|
| **All-purpose compute** (cluster) | Notebooks interactivos, exploración | Tú; se queda encendido hasta la autoterminación |
| **Job compute** | Jobs programados | El job lo crea al empezar y lo borra al terminar: más barato |
| **SQL warehouse** | Editor SQL, dashboards, Genie, Power BI | Se enciende al llegar una consulta y se apaga solo |
| **Serverless** | Cualquiera de los anteriores sin administrar máquinas | Databricks; listo en segundos |

```captura
archivo: databricks/d11-compute.webp
texto: La página Compute - pestañas por tipo (1) y Create compute (2)
```

## Paso 2 — Crear un cluster

**Create compute**:

```captura
archivo: databricks/d11-nuevo.webp
texto: Nombre (1), Databricks runtime (2), tipo de nodo (3), workers y autoescalado (4), autoterminación (5) y el resumen con DBU por hora (6)
```

| Campo | Qué es | Qué elegir |
|---|---|---|
| **Policy** | Reglas del administrador que limitan opciones | *Personal Compute* para uno; *Shared* para el equipo |
| **Databricks runtime** | La versión de Spark y librerías | La última **LTS** (soporte largo); **ML** si necesitas librerías de aprendizaje automático |
| **Photon** | Motor vectorizado | Más rápido para SQL y DataFrames; cobra más DBU por hora |
| **Worker type** | El tamaño de cada máquina | Empieza chico; sube si falta memoria |
| **Single node** | Solo el driver | Datos chicos, pruebas, librerías que no son Spark |
| **Workers / autoescalado** | Cuántas máquinas; con autoescalado, un mínimo y un máximo | Autoescalado para cargas variables |
| **Terminate after** | Minutos sin uso antes de apagarse | **Siempre**: 30–60 min en desarrollo |
| **Spot instances** | Máquinas más baratas que la nube puede quitar | Sí para desarrollo y jobs tolerantes; no para el driver |

El **resumen** de la derecha estima los **DBU/h**: la unidad de cómputo de Databricks. El costo = DBU × tarifa del plan + el precio de las máquinas de la nube.

## Paso 3 — Estados y eventos

Al crear, el cluster pasa por **PENDING** (pidiendo máquinas) → **RUNNING**:

```captura
archivo: databricks/d11-iniciando.webp
texto: Recién creado, arrancando
```

```captura
archivo: databricks/d11-cluster.webp
texto: El cluster en RUNNING - acciones (1) y pestañas de configuración, notebooks, librerías, eventos, Spark UI, logs y métricas (2)
```

```captura
archivo: databricks/d11-eventos.webp
texto: Event log - quién lo creó, cuándo arrancó, por qué se apagó
```

| Estado | Significa |
|---|---|
| **PENDING** | Arrancando (en Databricks real, 3 a 7 minutos) |
| **RUNNING** | Listo; cobra |
| **TERMINATED** | Apagado; no cobra. El evento dice si fue por inactividad o a mano |
| **ERROR** | No pudo arrancar (cuota de la nube, tipo de máquina sin stock) |

En la pestaña **Libraries** se instalan paquetes para todos los notebooks del cluster (`%pip` instala solo para uno).

## Paso 4 — SQL warehouses

```captura
archivo: databricks/d11-warehouses.webp
texto: El Serverless Starter Warehouse siempre disponible
```

```captura
archivo: databricks/d11-warehouse-nuevo.webp
texto: Tamaño (1), auto stop (2), tipo (3) y el costo máximo por hora (4)
```

| Campo | Qué elegir |
|---|---|
| **Cluster size** | De 2X-Small a 4X-Large: duplica potencia y DBU en cada paso. Empieza en Small y mide |
| **Auto stop** | 10 minutos para desarrollo; para tableros, lo que tarde la gente en pedir la siguiente consulta |
| **Scaling** | Más clusters para muchos usuarios a la vez (concurrencia), no para consultas más grandes |
| **Type** | **Serverless** (arranca en segundos), Pro o Classic |

## Paso 5 — Elegir el cómputo en un notebook

```captura
archivo: databricks/d11-nb-compute.webp
texto: El selector del notebook - Serverless o tu cluster, con su estado
```

Si eliges un cluster apagado, la primera celda lo enciende y espera. En la práctica tarda segundos; en Databricks real, minutos: por eso para explorar casi siempre conviene **Serverless**.

## Paso 6 — Las reglas del costo

1. **Autoterminación siempre**: un cluster de 8 máquinas olvidado un fin de semana cuesta más que un mes de trabajo cuidadoso.
2. **Job compute para jobs**, no clusters de uso general.
3. **Serverless** para interactivo: pagas por segundos de uso real.
4. **Warehouse chico + medir** antes de subir de tamaño.
5. **Etiquetas** (*tags*) en cada cluster: `equipo=datos`, `entorno=dev`, para saber quién gasta qué.
6. Las **políticas** del administrador limitan tamaños y obligan autoterminación: en una empresa casi siempre vas a crear compute con una política.

## ✅ Lo que lograste

- Distingues los tipos de cómputo y cuándo usar cada uno.
- Creas un cluster y un warehouse entendiendo cada campo.
- Sabes leer estados y eventos y controlar el costo.

:::ejercicio quiz
¿Qué es un DBU?
- [ ] Un tipo de tabla
- [x] La unidad de cómputo de Databricks: se cobran por hora según el tamaño del cluster
- [ ] Un usuario
- [ ] Una versión del runtime
:::

:::ejercicio quiz
Creas un cluster sin autoterminación y te vas el viernes. ¿Qué pasa?
- [ ] Se apaga solo
- [x] Sigue encendido y cobrando todo el fin de semana
- [ ] Databricks te avisa
- [ ] Pasa a serverless
:::

:::ejercicio quiz
Un tablero de Power BI consulta tablas de Databricks. ¿Qué cómputo usa?
- [ ] Un cluster de uso general
- [x] Un SQL warehouse
- [ ] Job compute
- [ ] Un notebook
:::

:::ejercicio quiz
¿Para qué sirve Scaling (min y max clusters) en un warehouse?
- [ ] Para consultas más grandes
- [x] Para atender a muchos usuarios a la vez
- [ ] Para guardar más datos
- [ ] Para apagarlo antes
:::
