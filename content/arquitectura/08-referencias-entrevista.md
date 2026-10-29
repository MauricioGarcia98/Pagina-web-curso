---
titulo: "Arquitecturas de referencia y la entrevista de diseño"
nivel: Experto
duracion: 60
resumen: Un método de 6 pasos para diseñar (y defender) una plataforma, estimaciones rápidas de volumen y costo, y tres arquitecturas completas en AWS, Google Cloud y Azure.
objetivos: Aplicar un método de 6 pasos para resolver una pregunta de diseño de sistemas de datos | Estimar volumen, almacenamiento y costo con cuentas rápidas | Explicar tres arquitecturas de referencia completas (batch en AWS, streaming en GCP, regulada en Azure) | Defender las decisiones y sus alternativas descartadas
prerrequisitos: arquitectura-que-es | arquitectura-ingesta | arquitectura-batch-streaming | arquitectura-calidad-gobierno
autoevaluacion: ¿Puedes recitar los 6 pasos del método de diseño? | ¿Puedes estimar cuántos TB por año generan 50 millones de eventos diarios de 1 KB? | ¿Puedes dibujar de memoria una de las tres arquitecturas y explicar cada flecha? | ¿Sabes nombrar el servicio equivalente en las tres nubes para ingesta, almacenamiento, procesamiento y orquestación? | ¿Puedes explicar qué alternativa descartaste en un diseño y por qué?
---

:::escenario La entrevista de diseño
Volvemos a la entrevista para data engineer semi senior. Superaste SQL y Python. La última etapa es con el arquitecto principal:

> "Tienes 45 minutos y una pizarra. Diseña la plataforma de datos de una app de delivery de comida que opera en 5 países. Pregunta lo que necesites."

No hay una respuesta correcta. Lo que evalúan es si haces las preguntas correctas, si tus decisiones tienen fundamento y si conoces las alternativas. Esta lección te da el método y tres diseños de referencia para practicar.
:::

## El método en 6 pasos

```diagrama
titulo: Seis pasos para cualquier pregunta de diseño de datos
nodo p1: 1. Preguntar | icono=lupa | col=0 | fila=0 | color=azul | sub=casos de uso y requisitos
nodo p2: 2. Estimar | icono=grafico | col=1 | fila=0 | color=azul | sub=volumen, crecimiento, costo
nodo p3: 3. Dibujar | icono=codigo | col=2 | fila=0 | color=verde | sub=los 7 componentes, de izquierda a derecha
nodo p4: 4. Profundizar | icono=engranaje | col=2 | fila=1 | color=verde | sub=2 o 3 piezas críticas
nodo p5: 5. Cuidar | icono=escudo | col=1 | fila=1 | color=amarillo | sub=calidad, seguridad, fallas
nodo p6: 6. Alternativas | icono=capas | col=0 | fila=1 | color=violeta | sub=qué descartaste y por qué
flecha p1 -> p2
flecha p2 -> p3
flecha p3 -> p4
flecha p4 -> p5
flecha p5 -> p6
```

1. **Preguntar (5 minutos).** ¿Qué decisiones se van a tomar con los datos? ¿Quién los usa? ¿Qué latencia? ¿Qué volumen? ¿Qué nube usan hoy? ¿Hay regulación? Anota los requisitos en un costado de la pizarra.
2. **Estimar (3 minutos).** Cuentas rápidas de volumen y almacenamiento. No hace falta exactitud: el orden de magnitud decide si alcanza una base de datos o hace falta un motor distribuido.
3. **Dibujar (10 minutos).** Los siete componentes, de izquierda a derecha, con una herramienta concreta en cada caja.
4. **Profundizar (15 minutos).** Elige 2 o 3 partes críticas y explícalas en detalle: cómo es la ingesta incremental, cómo se manejan los eventos tardíos, cómo es el modelo de datos de gold.
5. **Cuidar (5 minutos).** Calidad (qué controles y dónde), seguridad (PII, permisos), y qué pasa cuando algo falla (reintentos, reproceso, alertas).
6. **Alternativas (5 minutos).** "Consideré X pero elegí Y porque…". Mostrar que conoces las opciones vale tanto como el diseño.

## Estimaciones rápidas

Las cuentas que más se usan, con números redondos:

| Dato | Valor para estimar |
|---|---|
| Un evento JSON típico (clic, GPS) | 0,5 a 1 KB |
| Una fila de pedido en Parquet | 100 a 200 bytes |
| Compresión de JSON a Parquet | 5 a 10 veces menos |
| Segundos en un día | ~86.400 (redondea a 100.000) |
| 1 millón de eventos de 1 KB | ~1 GB |

Ejemplo para la app de delivery: 2 millones de pedidos por día y, por cada pedido, unos 200 eventos (clics, búsquedas, posiciones del repartidor):

```text
Eventos por día:     2.000.000 × 200          = 400 millones
Volumen crudo/día:   400 M × 1 KB             ≈ 400 GB en JSON
En Parquet:          400 GB ÷ 8               ≈ 50 GB por día
Por año:             50 GB × 365              ≈ 18 TB por año (más el crudo si se guarda)
Eventos por segundo: 400 M ÷ 100.000 s        ≈ 4.000 por segundo (picos de 3 a 5 veces más)
```

Conclusión que dices en voz alta: "Son decenas de TB por año y miles de eventos por segundo: necesito un motor distribuido y una cola de eventos; no alcanza con una base de datos".

## Referencia 1: e-commerce batch en AWS

**Caso:** Tienda Andina. Reportes diarios, analistas con SQL, volumen moderado (cientos de GB), equipo chico.

```diagrama
titulo: Referencia 1 · E-commerce batch en AWS
nodo pg: PostgreSQL (RDS) | icono=base | col=0 | fila=0 | forma=cilindro | sub=pedidos, clientes
nodo api: APIs de pagos | icono=api | col=0 | fila=1 | sub=JSON
nodo dms: DMS (CDC) | icono=engranaje | col=1 | fila=0 | color=naranja | sub=cambios cada 15 min
nodo lam: Lambda | icono=lambda | col=1 | fila=1 | color=naranja | sub=extrae la API
nodo s3: S3 + Iceberg | icono=bucket | col=2 | fila=0 | color=verde | sub=bronze · silver · gold
nodo glue: Glue / dbt | icono=transformar | col=2 | fila=1 | color=rojo | sub=silver y gold
nodo ath: Athena / Redshift | icono=lupa | col=3 | fila=0 | color=azul | sub=SQL para BI
nodo qs: QuickSight | icono=dashboard | col=3 | fila=1 | color=violeta
flecha pg -> dms
flecha api -> lam
flecha dms -> s3
flecha lam -> s3
flecha s3 <-> glue
flecha s3 -> ath
flecha ath -> qs
```

- **Orquestación:** MWAA (Airflow administrado) o Step Functions, diario a las 3:00.
- **Calidad:** tests de dbt; volumen por día con alertas en Slack.
- **Gobierno:** Lake Formation con permisos por grupo; Glue Data Catalog.
- **Por qué así:** todo administrado (equipo chico), Iceberg para no quedar atado a un motor, CDC para no cargar la base de la app.
- **Alternativa descartada:** Redshift como único almacén: más simple al principio, pero más caro y cerrado para los científicos de datos.

## Referencia 2: app de movilidad con streaming en Google Cloud

**Caso:** Ruta. Tarifa dinámica en menos de un minuto, millones de eventos GPS, reportes diarios exactos.

```diagrama
titulo: Referencia 2 · Movilidad con streaming en Google Cloud (Kappa)
nodo app: Apps de pasajeros\ny conductores | icono=movil | col=0 | fila=0 | sub=solicitudes, GPS
nodo ps: Pub/Sub | icono=stream | col=1 | fila=0 | color=azul | sub=eventos con id único
nodo df: Dataflow | icono=transformar | col=2 | fila=0 | color=azul | sub=ventanas por zona
nodo red: Memorystore | icono=energia | col=3 | fila=0 | color=rojo | sub=multiplicador por zona
nodo bq: BigQuery | icono=almacen | col=2 | fila=1 | color=verde | sub=eventos + gold con Dataform
nodo lk: Looker | icono=dashboard | col=3 | fila=1 | color=violeta | sub=reportes diarios
nodo gcs: Cloud Storage | icono=bucket | col=1 | fila=1 | color=naranja | sub=crudo para reprocesar
flecha app -> ps
flecha ps -> df
flecha df -> red: < 1 minuto
flecha df -> bq: streaming insert
flecha ps -> gcs: archivo
flecha bq -> lk
```

- **Orquestación:** Cloud Composer para el batch diario de Dataform y los controles.
- **Calidad:** deduplicación por id de evento, marca de agua de 2 minutos, monitoreo del retraso de Pub/Sub, conciliación diaria.
- **Por qué así:** Dataflow hace batch y streaming con el mismo código (Kappa); BigQuery absorbe el volumen sin administrar clústeres.
- **Alternativa descartada:** Lambda con dos implementaciones: duplica código y genera diferencias entre el número en vivo y el del día siguiente.

## Referencia 3: banco regulado en Azure

**Caso:** Banco Austral. Datos sensibles, auditoría, detección de fraude, reportes al regulador.

```diagrama
titulo: Referencia 3 · Banco regulado en Azure con Databricks
nodo core: Core bancario | icono=banco | col=0 | fila=0 | sub=SQL Server
nodo tx: Transacciones | icono=dinero | col=0 | fila=1 | sub=eventos de tarjetas
nodo adf: Data Factory | icono=engranaje | col=1 | fila=0 | color=azul | sub=CDC nocturno
nodo eh: Event Hubs | icono=stream | col=1 | fila=1 | color=azul | sub=streaming
nodo dbx: Databricks + Unity Catalog | icono=spark | col=2 | fila=0 | color=rojo | sub=medallón Delta, PII enmascarada
nodo fr: Modelo de fraude | icono=ml | col=2 | fila=1 | color=violeta | sub=streaming, < 2 s
nodo pbi: Power BI | icono=dashboard | col=3 | fila=0 | color=amarillo | sub=riesgo y regulador
nodo kv: Key Vault + red privada | icono=candado | col=3 | fila=1 | color=gris | sub=secretos, sin internet público
flecha core -> adf
flecha tx -> eh
flecha adf -> dbx
flecha eh -> fr
flecha fr -> dbx: alertas y features
flecha dbx -> pbi
flecha kv -> dbx | estilo=punteada
```

- **Seguridad:** todo en la región del país, red privada (private endpoints), llaves de cifrado propias, enmascaramiento y filtros por fila en Unity Catalog, auditoría de accesos, cuentas de servicio por pipeline.
- **Calidad:** conciliación diaria contra el core contable (cualquier diferencia frena la publicación).
- **Infraestructura:** todo declarado en Terraform, con cambios revisados y aprobados (lo verás en el módulo de Terraform).
- **Alternativa descartada:** copiar los datos a una herramienta SaaS externa: más rápido de montar, pero complica la residencia de datos y las auditorías.

## Las tres nubes, pieza por pieza

| Componente | AWS | Google Cloud | Azure | Multinube |
|---|---|---|---|---|
| Ingesta batch / CDC | DMS, Glue, AppFlow | Datastream, Data Fusion | Data Factory | Fivetran, Airbyte, Debezium |
| Streaming | Kinesis, MSK | Pub/Sub | Event Hubs | Kafka (Confluent) |
| Almacenamiento | S3 | Cloud Storage | ADLS Gen2 | — |
| Warehouse | Redshift | BigQuery | Synapse / Fabric | Snowflake, Databricks SQL |
| Procesamiento | Glue, EMR | Dataflow, Dataproc | Databricks, Synapse Spark | Databricks, Spark |
| Transformación SQL | dbt | Dataform, dbt | dbt | dbt |
| Orquestación | MWAA, Step Functions | Composer, Workflows | Data Factory, Airflow | Airflow, Dagster |
| Catálogo y gobierno | Glue Catalog, Lake Formation | Dataplex | Purview, Unity Catalog | Unity Catalog |
| BI | QuickSight | Looker | Power BI | Tableau |
| Infraestructura como código | CloudFormation, Terraform | Terraform | Bicep, Terraform | Terraform |

<!-- estandar:errores -->
:::errores
- **Dibujar antes de preguntar**: el entrevistador pide "delivery" y dibujas Kafka. Pregunta primero qué necesitan.
- **Nombrar herramientas sin decir por qué**: "uso Databricks" no dice nada; "uso Databricks porque el equipo ya sabe Spark y necesitamos ML sobre los mismos datos" sí.
- **Olvidar lo que falla**: no mencionar reintentos, reproceso, alertas ni costos.
- **Diseñar para escala infinita**: mostrar criterio incluye decir "con este volumen, esto alcanza; si se multiplica por 10, cambiaría X".
:::

<!-- estandar:trabajo -->
:::trabajo
- En el trabajo, el diseño se escribe en un documento (*design doc*) que revisan otros ingenieros antes de construir. Tiene las mismas partes que la entrevista: contexto, requisitos, estimaciones, diagrama, decisiones, alternativas y riesgos.
- Las nubes publican sus propias arquitecturas de referencia (AWS Architecture Center, Google Cloud Architecture Center, Azure Architecture Center). Son un buen punto de partida, pero siempre se adaptan a los requisitos propios.
:::

## Ejercicios

:::ejercicio python titulo="Estimación rápida de volumen"
Escribe `estimar(pedidos_dia, eventos_por_pedido, kb_por_evento, compresion=8)` que devuelva un diccionario con: `eventos_dia` (pedidos × eventos), `gb_crudo_dia` (eventos × KB ÷ 1.000.000, redondeado a 1), `gb_parquet_dia` (crudo ÷ compresión, redondeado a 1), `tb_parquet_anio` (Parquet diario × 365 ÷ 1.000, redondeado a 1) y `eventos_por_segundo` (eventos del día ÷ 86.400, redondeado al entero).
```python inicial
def estimar(pedidos_dia, eventos_por_pedido, kb_por_evento, compresion=8):
    ...
```
```python solucion
def estimar(pedidos_dia, eventos_por_pedido, kb_por_evento, compresion=8):
    eventos = pedidos_dia * eventos_por_pedido
    crudo = eventos * kb_por_evento / 1_000_000
    parquet = crudo / compresion
    return {
        "eventos_dia": eventos,
        "gb_crudo_dia": round(crudo, 1),
        "gb_parquet_dia": round(parquet, 1),
        "tb_parquet_anio": round(parquet * 365 / 1000, 1),
        "eventos_por_segundo": round(eventos / 86400),
    }
```
```python test
r = estimar(2_000_000, 200, 1)
assert r == {"eventos_dia": 400_000_000, "gb_crudo_dia": 400.0, "gb_parquet_dia": 50.0, "tb_parquet_anio": 18.2, "eventos_por_segundo": 4630}, r
r = estimar(10_000, 50, 0.5, compresion=5)
assert r["gb_crudo_dia"] == 0.2 and r["eventos_por_segundo"] == 6, r
```
:::

:::ejercicio quiz
En el paso 1 del método, ¿cuál de estas preguntas es la más importante para decidir entre batch y streaming?

- [ ] ¿Qué nube les gusta más?
- [x] ¿Qué decisión se toma con el dato y cuánto pierde valor si llega tarde?
- [ ] ¿Cuántas columnas tiene la tabla de pedidos?
- [ ] ¿Qué color usan los tableros?
:::

:::ejercicio quiz
¿Cuál es el equivalente de Pub/Sub (Google Cloud) en AWS y en Azure?

- [ ] S3 y ADLS
- [x] Kinesis (o MSK) y Event Hubs
- [ ] Glue y Data Factory
- [ ] Athena y Synapse
:::

:::ejercicio abierto titulo="Diseña la plataforma de la app de delivery"
Resuelve la pregunta del inicio aplicando los 6 pasos. Supón: 2 millones de pedidos diarios en 5 países; necesitan (a) un tablero operativo con pedidos en curso y demoras por ciudad, actualizado cada minuto; (b) reportes financieros diarios exactos por país; (c) un modelo que estime el tiempo de entrega; (d) cumplir leyes de datos personales. La empresa ya usa AWS. Escribe los requisitos, la estimación, la arquitectura (componente por componente con herramienta y motivo), dos profundizaciones, los controles y una alternativa descartada.
```solucion
1. Requisitos: latencia de 1 minuto para el tablero operativo, diaria y exacta para finanzas, features para ML; volumen alto; PII de clientes y repartidores; AWS.
2. Estimación: ~400 millones de eventos/día (≈4.600/s, picos de 15-20 mil), ≈50 GB/día en Parquet, ≈18 TB/año: motor distribuido + cola de eventos.
3. Arquitectura: apps → Kinesis Data Streams (eventos con id único) → (a) Flink administrado (Managed Service for Apache Flink) con ventanas de 1 minuto por ciudad → tabla operativa en una base rápida (o Redshift con streaming ingestion) → tablero; (b) Firehose → S3 bronze en Iceberg particionado por fecha y país → Glue/EMR o dbt sobre Athena/Redshift para silver y gold → QuickSight. Base transaccional de pedidos (Aurora) con CDC por DMS a bronze. Orquestación con MWAA. Catálogo y permisos con Glue Catalog + Lake Formation.
4. Profundizaciones: (i) tiempo del evento con marca de agua de 2 minutos y deduplicación por id; los tardíos sí entran al batch financiero, que es la cifra oficial; (ii) modelo de gold: fct_pedidos (una fila por pedido) con dim_ciudad, dim_restaurante y dim_repartidor (SCD2), particionada por fecha.
5. Controles: volumen por país y hora con alertas; conciliación diaria de pedidos y montos con el sistema de pagos (frena la publicación); PII enmascarada con Lake Formation y filtros por país; datos en regiones permitidas; reintentos e idempotencia (MERGE por id); reproceso desde bronze.
6. Alternativa descartada: arquitectura Lambda con un camino de streaming y otro batch con códigos distintos (dos lógicas a mantener); también se descartó Redshift como único almacén, para que el equipo de ML lea los mismos datos en Iceberg sin copiarlos.
```
:::
