---
titulo: De la práctica a Airflow real - instalar, desplegar y elegir servicio
nivel: 6 · Avanzado completo
duracion: 40
resumen: Antes de usar Airflow en un proyecto real, repasas qué cambia y qué no respecto de la práctica, las formas de instalarlo en tu computadora (pip con constraints, Docker Compose, Astro CLI), los servicios administrados (Amazon MWAA, Google Cloud Composer, Astronomer, Fabric) y cómo llegan los Dags a producción con Git y CI.
objetivos: Saber qué cambia entre la práctica y Airflow real | Instalar Airflow en tu computadora | Comparar los servicios administrados | Desplegar Dags con Git y CI
prerrequisitos: airflow-paso-a-paso-mapeo-dinamico
autoevaluacion: ¿Sabes por qué se instala con un archivo de constraints? | ¿Sabes qué es un provider? | ¿Sabes qué servicio administrado usa cada nube? | ¿Sabes cómo llegan los Dags a producción?
---

:::analogia Del simulador al avión
Los Dags, operadores, assets, pools y callbacks que practicaste funcionan igual en un Airflow real. Lo que cambia es dónde corre (tu computadora, Docker, un servicio administrado), cómo llegan los Dags (por Git) y que las credenciales y los datos son de verdad.
:::

## Paso 1 — Qué cambia

| En la práctica | En Airflow real |
|---|---|
| Scheduler y dag processor en el navegador | Procesos (o contenedores) separados, con su base PostgreSQL |
| Los operadores de nube registran lo que harían | Llaman de verdad a S3, BigQuery, Databricks |
| Sin usuarios | Inicio de sesión y roles (Admin, Op, User, Viewer) |
| Tiempos acelerados | Una tarea de 40 minutos tarda 40 minutos |

Lo que **no** cambia: el código de los Dags, la interfaz, la CLI y las decisiones de diseño.

## Paso 2 — Providers

```captura
archivo: airflow/a23-providers.webp
texto: Providers - los paquetes instalados y qué operadores traen
```

Cada integración es un paquete aparte (`apache-airflow-providers-<servicio>`). Se instala solo lo que se usa, en la versión que se probó.

```captura
archivo: airflow/a23-info.webp
texto: airflow version y airflow info - versión, executor, base de metadatos y carpetas
```

## Paso 3 — En tu computadora

| Forma | Comando | Para |
|---|---|---|
| **pip** | `pip install "apache-airflow==3.x.y" --constraint <url de constraints para tu Python>` y `airflow standalone` | Probar rápido |
| **Docker Compose** | El `docker-compose.yaml` oficial de la documentación y `docker compose up` | Un entorno parecido a producción |
| **Astro CLI** | `astro dev init` y `astro dev start` | Desarrollo cómodo, gratis y de código abierto |

:::cuidado Siempre con constraints
Airflow depende de cientos de paquetes. Instalarlo sin el archivo de **constraints** de su versión suele terminar en versiones incompatibles. La documentación oficial publica uno por versión de Airflow y de Python.
:::

## Paso 4 — Servicios administrados

| Servicio | Nube | Qué administra |
|---|---|---|
| **Amazon MWAA** | AWS | Scheduler, workers, base y la interfaz; los Dags se suben a S3 |
| **Google Cloud Composer** | GCP | Lo mismo, sobre GKE; los Dags van a un bucket de GCS |
| **Astronomer (Astro)** | Varias | Airflow administrado por una empresa muy activa en el proyecto, con su propia CLI |
| **Apache Airflow job en Fabric** | Microsoft | Airflow dentro de Data Factory de Fabric |

Elegir: la nube donde ya están los datos y el equipo suele decidir. Compara también la versión de Airflow que ofrece cada uno y cómo se cobra (por entorno y por hora).

## Paso 5 — Cómo llegan los Dags a producción

1. Los Dags viven en un **repositorio de Git**.
2. Cada pull request corre el **CI**: lint, la prueba de DagBag (lección 17) y revisión de otra persona.
3. Al fusionar, el **CD** copia la carpeta `dags/` al entorno: a S3 (MWAA), a GCS (Composer), a una imagen (`astro deploy`) o con **git-sync** en Kubernetes.
4. Nadie edita Dags directamente en el servidor de producción.

:::tip Datos sensibles
Si compartes capturas de tu Airflow real, difumina hosts, nombres de conexiones, correos y cualquier dato de clientes que aparezca en los logs.
:::

:::errores
- **Instalar Airflow con pip sin constraints.** Alguna dependencia incompatible termina rompiendo la instalación.
- **Editar Dags directo en el servidor.** Llegan por Git, con pull request, CI y revisión.
- **Olvidar los providers.** Cada servicio (Slack, Databricks, BigQuery) necesita su paquete instalado en el entorno.
:::

## ✅ Lo que lograste

- Sabes qué cambia al pasar a Airflow real.
- Conoces las formas de instalarlo y los servicios administrados.
- Sabes cómo se despliegan los Dags.

:::ejercicio quiz
¿Por qué se instala Airflow con un archivo de constraints?
- [ ] Para limitar la memoria que usa el scheduler
- [x] Para fijar versiones compatibles de sus muchas dependencias
- [ ] Porque es obligatorio para Docker
- [ ] Para que Airflow corra sin base de metadatos
:::

:::ejercicio quiz
¿Qué es un provider de Airflow?
- [x] Un paquete aparte con operadores, hooks y conexiones para un servicio
- [ ] El servicio de nube donde se instala Airflow
- [ ] Un tipo de Dag
- [ ] La base de metadatos
:::

:::ejercicio quiz
¿Cuál es el Airflow administrado de Google Cloud?
- [ ] MWAA
- [x] Cloud Composer
- [ ] Astro CLI
- [ ] Dataflow
:::

:::ejercicio quiz
¿Cómo debería llegar un Dag nuevo a producción?
- [ ] Editándolo directo en el servidor
- [x] Por Git: pull request con CI y revisión, y despliegue automático al fusionar
- [ ] Copiándolo a la carpeta de Dags del servidor con scp
- [ ] Copiándolo a mano un viernes a la noche
:::
