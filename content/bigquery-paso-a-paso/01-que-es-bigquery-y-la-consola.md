---
titulo: Qué es BigQuery y cómo es su consola
nivel: 1 · Básico
duracion: 30
resumen: BigQuery es el data warehouse sin servidores de Google Cloud - no administras máquinas, escribes SQL y pagas por los datos que cada consulta lee (o por capacidad reservada). Qué problema resuelve, cómo se organiza (proyecto, dataset, tabla), cómo guarda los datos por columnas y cada zona de BigQuery Studio.
objetivos: Explicar qué es BigQuery y qué significa "sin servidores" | Nombrar la jerarquía proyecto → dataset → tabla | Entender por qué guardar por columnas cambia el costo | Ubicar el explorador, el editor y el validador en Studio | Saber qué es real y qué es simulado en la práctica
prerrequisitos: fundamentos-bienvenida
autoevaluacion: ¿Sabes qué es un dataset? | ¿Sabes qué cobra BigQuery en el modelo on-demand? | ¿Sabes cuál es el nombre completo de una tabla? | ¿Sabes dónde ves cuántos datos va a leer una consulta?
---

:::analogia En palabras simples
Con una base tradicional alquilas un local y lo amueblas: eliges el tamaño del servidor, lo prendes y lo mantienes. **BigQuery es un servicio de mensajería**: le das la consulta, Google pone las máquinas que hagan falta durante unos segundos y te cobra según el tamaño del paquete, es decir, los datos que leyó.
:::

## Paso 1 — Qué lo hace distinto

| Característica | Qué significa |
|---|---|
| **Sin servidores** | No hay clústeres que crear ni apagar: escribes SQL y corre |
| **Almacenamiento por columnas** | Cada columna se guarda por separado: una consulta solo lee las columnas que nombra |
| **Separación de almacenamiento y cómputo** | Los datos se guardan una vez; el cómputo (*slots*) se asigna por consulta |
| **Pago por uso (on-demand)** | Se cobra por los **bytes que procesa** cada consulta, no por el tiempo ni por las filas devueltas |

## Paso 2 — La jerarquía

```diagrama
titulo: Proyecto → dataset → tablas y vistas
nodo p: Proyecto de Google Cloud | icono=gcp | col=0 | fila=0 | color=gris | sub=tienda-andina-dev
nodo d: Dataset | icono=carpeta | col=1 | fila=0 | color=azul | sub=tienda, analitica… · región y permisos
nodo t: Tablas | icono=tabla | col=2 | fila=0 | color=naranja
nodo v: Vistas | icono=lupa | col=2 | fila=1 | color=verde
flecha p -> d | explica=El proyecto factura las consultas. Adentro se crean datasets, cada uno con su región y sus permisos.
flecha d -> t | explica=Las tablas guardan datos.
flecha d -> v | explica=Las vistas guardan una consulta, que se ejecuta cada vez que las usas.
```

El nombre completo de una tabla es **`proyecto.dataset.tabla`**, por ejemplo `` `tienda-andina-dev.tienda.pedidos` `` (con backticks porque el proyecto tiene guiones). El SQL de BigQuery se llama **GoogleSQL**.

## Paso 3 — BigQuery Studio

Abre el [BigQuery de práctica](#/bigquery):

```captura
archivo: bigquery/q01-studio.webp
texto: La navegación de BigQuery (1), el explorador con el proyecto y sus datasets (2), el editor (3) y el validador que anticipa los bytes (4)
```

| Zona | Qué tiene |
|---|---|
| **Studio** | Explorador, pestañas de consultas, editor y resultados: donde se trabaja |
| **Pipelines and integration** | Data transfers, Scheduled queries, Dataform |
| **Governance** | Sharing (Analytics Hub) |
| **Administration** | Jobs explorer, costos y Capacity management |

El **validador** (arriba a la derecha del editor) hace un *dry run*: dice cuántos datos va a procesar la consulta **antes** de ejecutarla, sin costo. Es el hábito más importante de BigQuery.

## Paso 4 — Qué es real en la práctica

```captura
archivo: bigquery/q01-no-simulado.webp
texto: Overview - el proyecto, sus datasets y tablas, las consultas recientes y qué se puede practicar en cada sección
```

| Real | Simulado |
|---|---|
| GoogleSQL corre de verdad (sobre DuckDB en tu navegador) | No hay proyecto de Google Cloud ni facturación |
| La estimación de bytes por columnas y particiones, la caché y el historial de jobs | Los precios son los de lista y los datos son chicos |
| Particiones, clustering, cargas, MERGE, time travel, INFORMATION_SCHEMA | Las transferencias leen los buckets de la práctica, no Google Ads ni YouTube |
| Scheduled queries, Data transfers desde S3 y Cloud Storage, Dataform, Analytics Hub y reservas de slots | Los horarios corren cuando abres la consola, como si hubieran corrido a su hora |

:::errores
- **Pensar que se paga por tiempo o por filas devueltas.** En el modelo on-demand se paga por los bytes que la consulta *lee*: una consulta que devuelve 5 filas puede leer toda la tabla.
- **Buscar el servidor.** No hay máquinas que encender ni apagar; el dataset es un contenedor con región y permisos, no una base de datos en un servidor.
- **Ejecutar sin mirar el validador.** La estimación de bytes aparece antes de correr la consulta: mirarla es gratis y evita sorpresas.
:::

## ✅ Lo que lograste

- Sabes qué es BigQuery y qué lo hace distinto.
- Conoces la jerarquía proyecto → dataset → tabla.
- Ubicas cada zona de Studio.

:::ejercicio quiz
¿Qué cobra BigQuery en el modelo on-demand?
- [ ] El tiempo que tarda la consulta
- [x] Los bytes que procesa cada consulta
- [ ] Las filas que devuelve
- [ ] Una tarifa fija por usuario
:::

:::ejercicio quiz
¿Qué es un dataset en BigQuery?
- [x] Un contenedor de tablas y vistas con su región y sus permisos
- [ ] Un servidor que hay que encender antes de consultar
- [ ] Una carpeta de Cloud Storage con archivos CSV
- [ ] Un grupo de usuarios con permisos sobre el proyecto
:::

:::ejercicio quiz
¿Por qué guardar por columnas abarata las consultas?
- [ ] Porque comprime las filas
- [x] Porque una consulta solo lee las columnas que nombra
- [ ] Porque guarda las filas ordenadas por fecha
- [ ] Porque cada columna se guarda en una región distinta
:::

:::ejercicio quiz
¿Dónde ves cuántos datos va a leer una consulta antes de ejecutarla?
- [ ] En la factura
- [x] En el validador del editor (dry run)
- [ ] En el Overview
- [ ] En el historial de jobs, antes de ejecutar
:::
