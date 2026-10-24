---
titulo: Qué es la arquitectura de datos
nivel: Intermedio
duracion: 45
resumen: Los siete componentes de toda plataforma de datos, los requisitos que deciden su forma y cómo leer (y dibujar) una arquitectura.
objetivos: Nombrar los siete componentes de una plataforma de datos y qué problema resuelve cada uno | Traducir requisitos del negocio (latencia, volumen, costo, regulación) en decisiones de arquitectura | Leer un diagrama de arquitectura y explicar el recorrido de un dato | Dibujar la arquitectura actual de una empresa a partir de una descripción
prerrequisitos: fundamentos-datos-y-formatos | spark-formatos-delta | airflow-orquestacion
autoevaluacion: ¿Puedes nombrar los siete componentes y dar una herramienta de ejemplo para cada uno? | ¿Puedes explicar por qué la latencia requerida cambia toda la arquitectura? | ¿Sabes qué es un requisito no funcional y dar tres ejemplos? | ¿Puedes dibujar la arquitectura de Tienda Andina con sus componentes? | ¿Sabes por qué "la mejor herramienta" no existe sin requisitos?
---

:::escenario La primera reunión de arquitectura
Martín te invita a una reunión con la gerencia de tecnología:

> "El Grupo Andino quiere una plataforma de datos única para las ocho empresas. Hoy cada una tiene sus scripts, sus planillas y sus bases sueltas. Vamos a diseñar la arquitectura juntos y quiero que propongas una parte. Antes de hablar de herramientas, quiero que entiendas qué piezas tiene que tener y de qué depende cada decisión."

Hasta ahora aprendiste herramientas: SQL, Spark, dbt, Airflow, las nubes. La **arquitectura de datos** es cómo se combinan esas herramientas para que los datos lleguen, correctos y a tiempo, a quien los necesita. Es lo que separa a quien "sabe usar Spark" de quien puede diseñar una plataforma.
:::

## La idea en una frase

Una arquitectura de datos es **el conjunto de piezas, y las reglas para conectarlas**, que lleva los datos desde donde nacen hasta donde se usan, cumpliendo requisitos de tiempo, costo, calidad y seguridad.

:::analogia La red de agua de una ciudad
Una ciudad no tiene "un caño": tiene captación en el río, plantas potabilizadoras, tanques de reserva, una red de distribución, medidores, controles de calidad y un centro de control que abre y cierra válvulas. Si diseñas mal una pieza (un tanque muy chico, una planta lenta), toda la ciudad lo sufre. Una plataforma de datos es igual: muchas piezas que tienen que funcionar juntas.
:::

## Los siete componentes

Toda plataforma de datos, desde una startup hasta un banco, tiene estas siete piezas. Cambian las herramientas, no las piezas.

```diagrama
titulo: Los siete componentes de una plataforma de datos
nodo src: Fuentes | icono=base | col=0 | fila=0 | sub=apps, ERP, APIs, archivos, eventos
nodo ing: 1. Ingesta | icono=archivos | col=1 | fila=0 | color=azul | sub=traer los datos
nodo alm: 2. Almacenamiento | icono=bucket | col=2 | fila=0 | color=naranja | sub=lake, warehouse
nodo proc: 3. Procesamiento | icono=spark | col=2 | fila=1 | color=rojo | sub=limpiar, unir, calcular
nodo serv: 4. Servicio | icono=dashboard | col=3 | fila=0 | color=verde | sub=BI, APIs, ML, reverse ETL
nodo orq: 5. Orquestación | icono=orquestador | col=1 | fila=1 | color=violeta | sub=qué corre y cuándo
nodo gob: 6. Gobierno y seguridad | icono=candado | col=0 | fila=2 | color=amarillo | sub=permisos, catálogo, PII
nodo obs: 7. Calidad y observabilidad | icono=alerta | col=2 | fila=2 | color=cian | sub=tests, alertas, linaje
flecha src -> ing
flecha ing -> alm
flecha alm <-> proc
flecha alm -> serv
flecha orq -> ing: dispara | estilo=punteada | color=violeta
flecha orq -> proc | estilo=punteada | color=violeta
```

| # | Componente | Qué resuelve | Herramientas típicas |
|---|---|---|---|
| 1 | **Ingesta** | Traer los datos desde las fuentes, completos y sin duplicar | Fivetran, Airbyte, Data Factory, Glue, Debezium, Kafka Connect, scripts de Python |
| 2 | **Almacenamiento** | Guardarlos de forma barata, segura y consultable | S3, ADLS, GCS con Parquet/Delta/Iceberg; BigQuery, Snowflake, Redshift |
| 3 | **Procesamiento** | Limpiarlos, unirlos y calcular lo que el negocio necesita | Spark, dbt + SQL, Dataflow, Flink |
| 4 | **Servicio** (*serving*) | Entregarlos a quien los usa, en la forma que los necesita | Power BI, Looker, APIs, feature stores, reverse ETL |
| 5 | **Orquestación** | Decidir qué corre, en qué orden y qué pasa si algo falla | Airflow, Databricks Workflows, Step Functions, Dagster |
| 6 | **Gobierno y seguridad** | Quién puede ver qué, qué significa cada dato, cumplir la ley | Unity Catalog, Lake Formation, Dataplex, Purview, IAM |
| 7 | **Calidad y observabilidad** | Enterarse antes que el negocio de que algo está mal | Tests de dbt, Great Expectations, alertas, monitoreo de frescura |

Los componentes 1 a 4 son el **camino** del dato. Los componentes 5 a 7 son **transversales**: tocan todo el camino. Un error común al empezar es diseñar solo el camino y dejar para "después" la orquestación, el gobierno y la calidad. Ese "después" suele llegar como un incidente.

## Los requisitos deciden la forma

No existe "la mejor arquitectura". Existe la mejor arquitectura **para unos requisitos**. Antes de elegir herramientas, un arquitecto hace preguntas. Las más importantes:

| Pregunta | Ejemplo de respuesta | Qué decide |
|---|---|---|
| **¿Cada cuánto se necesita el dato?** (latencia) | "El tablero se mira una vez por día" vs. "detectar fraude en menos de 2 segundos" | Batch o streaming. Es la decisión más cara de cambiar |
| **¿Cuánto volumen hay y cómo crece?** | 5 GB en total vs. 2 TB por día | Una base de datos o un motor distribuido |
| **¿Quién lo usa y cómo?** | Analistas con SQL, científicos con Python, una app vía API | Warehouse, lakehouse, API, feature store |
| **¿Qué tan correcto tiene que ser?** | Un tablero de tendencias vs. la facturación | Cuántos controles de calidad y conciliaciones |
| **¿Hay regulación?** | Datos de salud, bancarios, personales | Región de los datos, cifrado, enmascaramiento, auditoría |
| **¿Cuánto se puede gastar?** | Presupuesto mensual | Serverless vs. clústeres, retención de datos |
| **¿Qué sabe hacer el equipo?** | Un equipo de 2 personas con SQL vs. 20 ingenieros | Herramientas administradas o a medida |

A estos se los llama **requisitos no funcionales**: no dicen *qué* calcula la plataforma, sino *cómo* tiene que comportarse (rápido, barato, seguro, confiable).

:::cuidado La trampa del "tiempo real"
Cuando le preguntas al negocio "¿lo necesitas en tiempo real?", casi siempre dice que sí. Pregunta mejor: **"¿qué decisión vas a tomar con este dato, y qué pasa si llega una hora tarde?"**. Si la respuesta es "lo miro en la reunión de los lunes", un batch diario alcanza y cuesta diez veces menos de construir y mantener.
:::

## Cómo leer un diagrama de arquitectura

Los diagramas de arquitectura se leen **de izquierda a derecha**, siguiendo al dato:

1. **A la izquierda, las fuentes**: dónde nace el dato.
2. **En el medio, el camino**: cómo entra, dónde se guarda, cómo se transforma.
3. **A la derecha, el consumo**: quién lo usa.
4. **Arriba o abajo, lo transversal**: orquestación, seguridad, monitoreo.

Este es el diagrama de la plataforma actual de Tienda Andina. Intenta contar, antes de leer la explicación, el recorrido de un pedido:

```diagrama
titulo: La plataforma de datos actual de Tienda Andina (batch diario en AWS)
nodo pg: PostgreSQL de la app | icono=base | col=0 | fila=0 | forma=cilindro | sub=pedidos, clientes
nodo ga: Eventos web | icono=web | col=0 | fila=1 | sub=JSON por hora
nodo s3: S3 bronze | icono=bucket | col=1 | fila=0 | color=naranja | sub=Parquet por fecha
nodo glue: Glue (Spark) | icono=spark | col=2 | fila=0 | color=rojo | sub=silver
nodo rs: Redshift | icono=almacen | col=3 | fila=0 | color=azul | sub=gold con dbt
nodo bi: Power BI | icono=dashboard | col=3 | fila=1 | color=verde | sub=comercial, finanzas
nodo af: Airflow (MWAA) | icono=orquestador | col=2 | fila=1 | color=violeta | sub=diario 03:00
flecha pg -> s3: export nocturno
flecha ga -> s3: Firehose
flecha s3 -> glue
flecha glue -> rs: COPY
flecha rs -> bi
flecha af -> glue: dispara | estilo=punteada | color=violeta
```

El recorrido: el pedido se guarda en PostgreSQL; a la noche, un export lo copia a S3 (bronze) en Parquet; Airflow dispara un job de Glue (Spark) que limpia y deja silver; un `COPY` lo carga en Redshift, donde dbt construye gold; Power BI lo muestra a la mañana. Los eventos web siguen otro camino de entrada (Firehose) pero se juntan en S3.

Fíjate que este diagrama ya responde preguntas de requisitos: la latencia es de **un día** (todo depende del export nocturno), y la plataforma vive en **AWS**.

## Las decisiones que vas a tomar como arquitecto

Las próximas lecciones de este módulo recorren las grandes decisiones, una por una:

| Lección | Decisión |
|---|---|
| Ingesta | ¿Cargo todo cada vez o solo lo nuevo? ¿Cómo capturo los cambios? |
| Almacenamiento | ¿Warehouse, lake o lakehouse? ¿Qué formato de tabla? |
| Batch y streaming | ¿Cada cuánto proceso? ¿Lambda o Kappa? |
| Diseño del lakehouse | ¿Cómo organizo capas, entornos y nombres? |
| Calidad y gobierno | ¿Cómo me entero de que algo está mal? ¿Quién ve qué? |
| Patrones modernos | ¿Data mesh, capa semántica, reverse ETL? |
| Arquitecturas de referencia | ¿Cómo junto todo en un diseño y lo defiendo? |

<!-- estandar:errores -->
:::errores
- **Empezar por la herramienta**: "usemos Kafka" antes de saber si alguien necesita los datos en menos de un día. Primero los requisitos, después las herramientas.
- **Diseñar para un volumen imaginario**: un clúster de Spark para 3 GB cuesta más y es más complejo que una base de datos. Diseña para el volumen de hoy y para el crecimiento esperado de 1 a 2 años, no para "por si algún día somos Netflix".
- **Olvidar lo transversal**: una plataforma sin orquestación, sin monitoreo y sin permisos funciona en la demo y falla en producción.
- **Un diagrama sin flechas claras**: si no se entiende por dónde va el dato, el diagrama no sirve para tomar decisiones.
:::

<!-- estandar:trabajo -->
:::trabajo
- En las empresas, las decisiones de arquitectura se documentan en **ADRs** (*Architecture Decision Records*): un documento corto por decisión con el contexto, las opciones evaluadas, la elegida y por qué. Dentro de dos años, alguien va a preguntar "¿por qué usamos esto?", y la respuesta va a estar escrita.
- Los diagramas se mantienen como **código** (en Excalidraw, draw.io o Mermaid dentro del repositorio), para que cambien junto con la plataforma.
- La pregunta "diseñá la plataforma de datos de X" es la más común en las entrevistas de data engineer semi senior y senior. Este módulo te prepara para responderla.
:::

<!-- estandar:entrevista -->
:::entrevista "Diseña la plataforma de datos para una empresa de e-commerce"
No empieces por las herramientas. Pregunta primero: ¿qué preguntas quieren responder?, ¿cada cuánto?, ¿cuánto volumen hay?, ¿quién consume los datos?, ¿en qué nube están? Después recorre los siete componentes en orden (fuentes → ingesta → almacenamiento → procesamiento → servicio, y luego orquestación, calidad y gobierno), nombrando una herramienta para cada uno y **por qué**. Termina con los riesgos: costos, puntos únicos de falla y cómo escalaría.
:::

## Ejercicios

:::ejercicio quiz
Un banco necesita bloquear una compra fraudulenta **antes** de aprobarla. ¿Qué requisito decide la arquitectura?

- [ ] El volumen de datos
- [x] La latencia: la decisión tiene que tomarse en segundos, así que hace falta procesamiento en streaming o en línea
- [ ] El formato de archivo
- [ ] El color del tablero
:::

:::ejercicio quiz
¿Cuál de estos es un componente **transversal** de la plataforma (toca todo el camino del dato)?

- [ ] La ingesta
- [ ] El almacenamiento
- [x] La orquestación
- [ ] El tablero de Power BI
:::

:::ejercicio quiz
Comercial pide "las ventas en tiempo real". Preguntas para qué y te dicen: "para la reunión de los lunes". ¿Qué propones?

- [ ] Kafka y Spark Streaming
- [x] Un proceso batch diario (o semanal): la decisión se toma una vez por semana
- [ ] Una réplica de la base de producción para que consulten directo
- [ ] Nada, que lo calculen en Excel
:::

:::ejercicio quiz
¿Qué es un requisito **no funcional**?

- [ ] Un cálculo que pide el negocio, como la venta neta
- [x] Una condición sobre cómo debe comportarse el sistema, como la latencia, el costo, la seguridad o la disponibilidad
- [ ] Un requisito que no funciona
- [ ] Una tabla sin usar
:::

:::ejercicio abierto titulo="Dibuja la arquitectura actual de Ruta"
Ruta (la app de viajes) te describe su situación: "Los viajes se guardan en MySQL. Cada noche un script de Python exporta un CSV a un bucket de Google Cloud Storage. Un analista lo carga a mano en BigQuery los lunes y arma un Looker Studio. Las posiciones GPS de los conductores llegan por Pub/Sub, pero nadie las guarda". Enumera los siete componentes y di qué pieza cumple cada uno hoy (o si falta), y señala los tres problemas más graves.
```solucion
Fuentes: MySQL (viajes) y eventos GPS en Pub/Sub.
1. Ingesta: script de Python nocturno (frágil: sin reintentos ni control de completitud). Los GPS no se ingieren (se pierden).
2. Almacenamiento: GCS (bronze en CSV) y BigQuery (cargado a mano).
3. Procesamiento: no hay; el analista transforma a mano o en Looker Studio.
4. Servicio: Looker Studio.
5. Orquestación: falta (cron del script + paso manual del lunes).
6. Gobierno: no se menciona; probablemente cualquiera ve todo.
7. Calidad y observabilidad: falta; si el script falla, nadie se entera.
Problemas más graves: (1) el paso manual del lunes hace que los datos tengan hasta una semana de atraso y dependan de una persona; (2) los eventos GPS se pierden: sin ellos no se pueden calcular tiempos de espera ni la oferta por zona; (3) no hay orquestación ni monitoreo: los errores se descubren cuando alguien mira el tablero.
```
:::
