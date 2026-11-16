---
titulo: De la práctica a BigQuery real - sandbox, CLI y conexiones
nivel: 6 · Avanzado completo
duracion: 35
resumen: Antes de usar un proyecto real, repasas qué cambia respecto de la práctica, cómo empezar gratis con el sandbox, la CLI bq (que también tienes en la terminal del curso), las librerías y conectores, y las reglas de seguridad y costo para tu primera semana.
objetivos: Saber qué cambia entre la práctica y BigQuery real | Empezar gratis con el sandbox | Usar la CLI bq | Conectar herramientas de forma segura | Armar la lista de la primera semana
prerrequisitos: bigquery-paso-a-paso-capacidad-y-mas
autoevaluacion: ¿Sabes qué ofrece el sandbox sin tarjeta? | ¿Sabes hacer un dry run con bq? | ¿Sabes con qué cuenta se conecta un proceso automático? | ¿Sabes qué configurar el primer día?
---

:::analogia Del simulador al avión
Pasar de la práctica a BigQuery real es pasar del simulador de vuelo al avión: los controles son los mismos (GoogleSQL, particiones, MERGE, time travel), pero el combustible se paga de verdad y hay más gente a bordo con distintos permisos.
:::

## Paso 1 — Qué cambia

| En la práctica | En BigQuery real |
|---|---|
| Tablas de miles de filas en tu navegador | Tablas de miles de millones de filas en Google Cloud |
| Costos de centavos | Una consulta mal escrita puede leer terabytes |
| Sin IAM | Roles de IAM, grupos y cuentas de servicio |
| Scheduled queries, Dataform y transferencias explicados | Disponibles |

Lo que **no** cambia: GoogleSQL, el validador, particiones, clustering, MERGE, time travel e INFORMATION_SCHEMA.

## Paso 2 — Empezar gratis

El **sandbox de BigQuery** funciona sin tarjeta: 10 GB de almacenamiento y 1 TB de consultas por mes, con tablas que vencen a los 60 días. Para seguir después, se activa la facturación del proyecto y conviene poner antes un **presupuesto con alertas** y cuotas de consulta.

Hay datasets públicos para practicar con volumen real (`bigquery-public-data`).

## Paso 3 — La CLI bq

En la [terminal del curso](#/lab/terminal):

```bash norun
gcloud auth login
gcloud config set project tienda-andina-dev
bq ls
bq query --use_legacy_sql=false 'SELECT canal, COUNT(*) AS pedidos FROM tienda.pedidos GROUP BY canal'
```

```captura
archivo: bigquery/q23-bq-cli.webp
texto: bq ls y bq query en la terminal del curso (con su propio proyecto simulado)
```

| Comando | Para |
|---|---|
| `bq query --dry_run --use_legacy_sql=false '...'` | Ver los bytes sin ejecutar |
| `bq query --maximum_bytes_billed=1000000000 ...` | Cortar si supera 1 GB |
| `bq mk --dataset --location=US proyecto:analitica` | Crear un dataset |
| `bq load ...` / `bq extract ...` | Cargar y exportar |
| `bq show --format=prettyjson tienda.pedidos` | Ver el esquema y los detalles |

:::nota Legacy SQL
`--use_legacy_sql=false` usa GoogleSQL. Legacy SQL es el dialecto antiguo; no lo uses en código nuevo.
:::

## Paso 4 — Conectar herramientas

| Herramienta | Cómo |
|---|---|
| **Python** | `google-cloud-bigquery` (y `bigframes` para trabajar con DataFrames que corren en BigQuery) |
| **Looker Studio / Power BI / Tableau** | Conector nativo con un rol de lectura |
| **dbt / Dataform** | Con una cuenta de servicio de transformación |
| **Airflow / Cloud Composer** | Provider de Google y una conexión con cuenta de servicio |

:::cuidado Cuentas de servicio
Los procesos automáticos usan **cuentas de servicio** con el rol mínimo, idealmente sin claves descargadas (Workload Identity). Nunca subas un archivo de credenciales a Git.
:::

## Paso 5 — Tu primera semana

- [ ] Presupuesto con alertas y cuota diaria de bytes en el proyecto.
- [ ] Tu acceso: Job User en el proyecto y Data Viewer en los datasets que necesitas.
- [ ] Revisar `INFORMATION_SCHEMA.JOBS` para entender qué corre y cuánto cuesta.
- [ ] Aprender las tablas grandes: cómo están particionadas y con qué clustering.
- [ ] Cada consulta, primero con el validador.

:::errores
- **Conectar procesos automáticos con tu usuario personal.** Si te vas o cambias de contraseña, se rompen; usa cuentas de servicio con el rol mínimo.
- **Subir un archivo de credenciales a Git.** Aunque lo borres después, queda en el historial; revoca la clave y usa Workload Identity.
- **Activar la facturación sin presupuesto.** Configura alertas y cuotas de bytes el primer día.
:::

## ✅ Lo que lograste

- Sabes qué cambia en BigQuery real.
- Sabes empezar gratis y usar la CLI.
- Sabes conectar herramientas de forma segura.

:::ejercicio quiz
¿Qué ofrece el sandbox de BigQuery sin tarjeta?
- [x] 10 GB de almacenamiento y 1 TB de consultas por mes, con tablas que vencen a los 60 días
- [ ] Todo ilimitado
- [ ] 1 TB de almacenamiento y consultas ilimitadas
- [ ] Solo consultas sobre datasets públicos, sin tablas propias
:::

:::ejercicio quiz
¿Cómo ves con bq cuántos bytes procesaría una consulta sin ejecutarla?
- [ ] bq ls
- [x] bq query --dry_run
- [ ] bq show
- [ ] bq mk
:::

:::ejercicio quiz
¿Con qué identidad debería conectarse un proceso automático como dbt o Airflow?
- [ ] Tu usuario personal
- [x] Una cuenta de servicio con el rol mínimo
- [ ] Un usuario Admin compartido
- [ ] Sin identidad
:::

:::ejercicio quiz
¿Qué configuras el primer día en un proyecto con facturación?
- [ ] Una reserva de capacidad por 3 años
- [x] Un presupuesto con alertas y cuotas de bytes
- [ ] Un dataset por usuario, sin vencimiento
- [ ] Permisos de Admin para todos
:::
