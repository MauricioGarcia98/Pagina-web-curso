---
titulo: "Patrones modernos: data mesh, capa semántica, reverse ETL y más"
nivel: Experto
duracion: 45
resumen: Las ideas que vas a escuchar en cualquier equipo de datos actual, qué problema resuelve cada una y cuándo NO conviene adoptarlas.
objetivos: Explicar data mesh y data products y cuándo tienen sentido | Explicar para qué sirve una capa semántica y cómo evita métricas contradictorias | Describir reverse ETL, feature store y zero-ETL con un caso de uso cada uno | Evaluar si un patrón de moda conviene para un equipo y una empresa concretos
prerrequisitos: arquitectura-diseno-lakehouse | arquitectura-calidad-gobierno
autoevaluacion: ¿Puedes explicar los cuatro principios de data mesh? | ¿Sabes qué es un data product y qué lo diferencia de "una tabla"? | ¿Puedes dar un ejemplo de reverse ETL? | ¿Sabes qué problema resuelve una capa semántica? | ¿Puedes argumentar por qué una empresa de 3 ingenieros de datos no necesita data mesh?
---

:::escenario Las ocho empresas quieren autonomía
Pasaron seis meses. La plataforma central funciona, pero el equipo de datos es un cuello de botella: el banco espera tres semanas para un cambio, la aerolínea tiene sus propios ingenieros y quiere publicar sus tablas sin pedir permiso, y marketing quiere que los segmentos de clientes lleguen solos a la herramienta de emails. En la reunión alguien dice: "deberíamos hacer data mesh".

Martín te pide:

> "Antes de que alguien compre algo, investigá qué son estos patrones de los que todos hablan, y decime cuáles nos sirven de verdad y cuáles son moda."
:::

## Data mesh: los datos como producto de cada dominio

En una plataforma **centralizada**, un solo equipo de datos construye todo para todos. Funciona bien hasta que el equipo no da abasto y no conoce el negocio de cada área tan bien como sus dueños.

**Data mesh** propone otra organización, con cuatro principios:

| Principio | Qué significa | En el Grupo Andino |
|---|---|---|
| **Propiedad por dominio** | Cada área es dueña de sus datos y de sus pipelines | El equipo de la aerolínea construye y mantiene sus tablas |
| **Datos como producto** | Lo que publica un dominio tiene usuarios, calidad, documentación y SLA, como un producto | `vuelos.gold.puntualidad_diaria` con dueño, contrato y SLA |
| **Plataforma de autoservicio** | Un equipo central da las herramientas para que los dominios no reinventen nada | El equipo central mantiene el lakehouse, la CI, los permisos y las plantillas |
| **Gobierno federado** | Reglas comunes (nombres, seguridad, calidad) que todos cumplen, decididas en conjunto | Todos usan la misma convención y los mismos controles de PII |

```diagrama
titulo: Data mesh: los dominios publican productos sobre una plataforma común
nodo plat: Plataforma de autoservicio | icono=capas | col=1 | fila=2 | color=gris | sub=lakehouse, CI, catálogo, permisos
nodo d1: Dominio banco | icono=banco | col=0 | fila=0 | color=azul | sub=equipo propio
nodo d2: Dominio aerolínea | icono=avion | col=1 | fila=0 | color=azul | sub=equipo propio
nodo d3: Dominio tienda | icono=carrito | col=2 | fila=0 | color=azul | sub=equipo propio
nodo p1: Producto: clientes_riesgo | icono=tabla | col=0 | fila=1 | color=verde | sub=SLA, dueño, contrato
nodo p2: Producto: puntualidad | icono=tabla | col=1 | fila=1 | color=verde
nodo p3: Producto: ventas_diarias | icono=tabla | col=2 | fila=1 | color=verde
nodo gob: Gobierno federado | icono=escudo | col=3 | fila=1 | color=amarillo | sub=reglas comunes
flecha d1 -> p1
flecha d2 -> p2
flecha d3 -> p3
flecha p1 -- plat
flecha p2 -- plat
flecha p3 -- plat
flecha gob -> p3 | estilo=punteada
```

:::cuidado Data mesh es una organización, no una herramienta
No se "instala" data mesh. Requiere equipos de datos dentro de cada área, una plataforma madura y mucha disciplina de gobierno. Tiene sentido en empresas **grandes** con muchos dominios y equipos. En una empresa con un equipo de datos de 3 personas, lo único que logra es repartir el trabajo entre gente que no está preparada para hacerlo. Puedes adoptar ideas sueltas (tratar las tablas gold como productos, con dueño y SLA) sin hacer data mesh completo.
:::

## Data products

Aunque no hagas data mesh, la idea de **producto de datos** es útil. Una tabla es un producto cuando tiene:

- **Dueño** identificado (una persona o un equipo, no "el equipo de datos").
- **Contrato**: esquema, significado de cada columna, reglas de cambio.
- **Calidad medida** y un **SLA** de frescura.
- **Documentación** y ejemplos de uso.
- **Usuarios conocidos**: se sabe quién depende de ella (linaje).

## Capa semántica: una sola definición de cada métrica

El problema: el tablero de comercial dice que en noviembre se vendieron 1,20 millones; el de finanzas, 1,15 millones. Los dos tienen razón: uno resta devoluciones y el otro no. Cada herramienta define "ventas" por su lado.

Una **capa semántica** define las métricas **una sola vez**, en código, y todas las herramientas las piden ahí:

```yaml norun
# metricas.yml (estilo dbt Semantic Layer / MetricFlow)
metrics:
  - name: venta_neta
    description: "Importe de pedidos no cancelados, menos descuentos y devoluciones"
    type: simple
    type_params:
      measure: importe_neto
    filter: "{{ Dimension('pedido__estado') }} not in ('cancelado', 'devuelto')"
```

Después, Power BI, una planilla o un notebook piden "venta_neta por país y mes", y la capa semántica genera el SQL. Herramientas: **dbt Semantic Layer**, **Cube**, **LookML** (Looker), **AtScale** y las métricas de Databricks o Snowflake.

## Reverse ETL: los datos vuelven a las herramientas operativas

El camino normal va de las aplicaciones al warehouse. El **reverse ETL** hace el camino inverso: lleva datos calculados en el warehouse **de vuelta** a las herramientas que usa la gente.

```diagrama
titulo: Reverse ETL: lo que calcula el lakehouse vuelve a las herramientas del negocio
nodo app: CRM, app, pagos | icono=web | col=0 | fila=0 | sub=fuentes
nodo lh: Lakehouse | icono=almacen | col=1 | fila=0 | color=azul | sub=calcula segmentos y scores
nodo crm: CRM (Salesforce) | icono=equipo | col=2 | fila=0 | color=verde | sub=el vendedor ve el riesgo
nodo mail: Herramienta de emails | icono=correo | col=2 | fila=1 | color=verde | sub=segmento "en riesgo"
nodo ads: Publicidad | icono=grafico | col=0 | fila=1 | color=verde | sub=audiencias
flecha app -> lh: ETL / ELT
flecha lh -> crm: reverse ETL
flecha lh -> mail: reverse ETL
flecha lh -> ads: reverse ETL
```

Ejemplo: el lakehouse calcula qué clientes de Ritmo están en riesgo de darse de baja; cada mañana, ese segmento se sincroniza con la herramienta de emails, que les envía una oferta. Herramientas: Hightouch, Census, o un pipeline propio que llama a la API del destino.

## Feature store: los datos de los modelos de ML

Un modelo de machine learning necesita **features** (variables calculadas: "cantidad de compras del cliente en los últimos 30 días"). Un **feature store** guarda esas features con dos garantías:

- Se calculan **igual** para entrenar el modelo (con historia) y para usarlo en producción (en línea, en milisegundos).
- Se puede pedir el valor de una feature **como era en una fecha pasada** (*point-in-time*), para no entrenar con información del futuro.

Herramientas: Databricks Feature Store, Vertex AI Feature Store, SageMaker Feature Store, Feast.

## Zero-ETL y HTAP: menos pipelines de copia

Las nubes ofrecen integraciones que replican automáticamente una base transaccional al warehouse, sin que escribas la ingesta: **zero-ETL** de Aurora a Redshift, **Datastream** a BigQuery, **Lakehouse Federation** de Databricks para consultar bases externas sin copiarlas, y bases **HTAP** que sirven transacciones y análisis a la vez. Son útiles para casos simples, pero no eliminan la necesidad de modelar, limpiar y controlar la calidad.

## ¿Moda o necesidad? Una tabla para decidir

| Patrón | Te conviene si… | No te conviene si… |
|---|---|---|
| Data mesh | Muchos dominios con equipos de datos propios y una plataforma madura | Equipo central chico o plataforma inmadura |
| Data products | Siempre (como forma de trabajar) | — |
| Capa semántica | Varias herramientas de BI o métricas que no coinciden | Un solo tablero y pocas métricas |
| Reverse ETL | Áreas operativas que necesitan datos calculados en sus herramientas | Nadie actúa sobre esos datos |
| Feature store | Varios modelos de ML en producción que comparten features | Un modelo experimental |
| Zero-ETL | Replicar una base a analítica sin transformaciones complejas | Necesitas limpieza, historia (SCD) o combinar muchas fuentes |

<!-- estandar:errores -->
:::errores
- **Adoptar un patrón por el nombre**: "hacemos data mesh" sin equipos por dominio es solo un reorganigrama.
- **Capa semántica sin dueños de métricas**: si nadie decide qué es la "venta neta", la herramienta solo traslada la discusión.
- **Reverse ETL sin cuidado con los datos personales**: estás enviando datos a herramientas de terceros. Revisa qué se envía y con qué permisos.
- **Features calculadas distinto en entrenamiento y en producción**: el modelo funciona en las pruebas y falla en la vida real (*training-serving skew*).
:::

<!-- estandar:trabajo -->
:::trabajo
- En una entrevista para un puesto senior es común que te pregunten tu opinión sobre data mesh. Lo que buscan es criterio: cuándo sí, cuándo no y qué ideas tomarías aunque no lo adoptes completo.
- Los patrones se adoptan de a uno, empezando por el problema más doloroso. "Los tableros no coinciden" pide capa semántica; "el equipo central es un cuello de botella" pide autoservicio y, quizás, dominios.
:::

<!-- estandar:entrevista -->
:::entrevista "¿Qué opinas de data mesh?"
Explica los cuatro principios en una frase cada uno. Luego da criterio: tiene sentido en organizaciones grandes, con muchos dominios y equipos con capacidades de datos, y con una plataforma central madura que dé autoservicio; en organizaciones chicas agrega complejidad sin beneficio. Cierra con lo que sí adoptarías siempre: tratar los datasets publicados como productos, con dueño, contrato, calidad y SLA.
:::

## Ejercicios

:::ejercicio quiz
Comercial y finanzas muestran cifras distintas de "ventas de noviembre" porque cada uno calcula a su manera. ¿Qué patrón ataca directamente ese problema?

- [ ] Reverse ETL
- [x] Una capa semántica con una definición única de cada métrica
- [ ] Data mesh
- [ ] Un feature store
:::

:::ejercicio quiz
Cada mañana, la lista de clientes con alto riesgo de baja calculada en el lakehouse debe aparecer en la herramienta de emails de marketing. ¿Cómo se llama ese patrón?

- [ ] CDC
- [ ] Zero-ETL
- [x] Reverse ETL
- [ ] Lambda
:::

:::ejercicio quiz
Una startup con 2 ingenieros de datos y 15 tablas quiere "implementar data mesh". ¿Qué le recomiendas?

- [ ] Hacerlo ya: es la arquitectura moderna
- [x] No adoptarlo: no tiene dominios con equipos propios; sí tratar sus tablas principales como productos con dueño y SLA
- [ ] Comprar una herramienta de data mesh
- [ ] Separar cada tabla en un dominio
:::

:::ejercicio abierto titulo="¿Qué patrones adopta el Grupo Andino?"
Con la situación del inicio (equipo central saturado, la aerolínea con ingenieros propios, marketing que quiere segmentos en su herramienta de emails, y tableros que no coinciden entre empresas), recomienda qué patrones adoptar, en qué orden y por qué. Indica también qué **no** harías.
```solucion
1) Capa semántica primero: el problema más visible y barato de resolver es que los tableros no coinciden. Definir en código las 20 métricas principales (venta neta, MRR, ausentismo, OTP...) con un dueño por métrica.
2) Data products: las tablas gold publicadas pasan a tener dueño, contrato, tests y SLA, y aparecen en el catálogo como certificadas.
3) Autoservicio + un dominio piloto: la aerolínea, que ya tiene ingenieros, publica sus propios productos sobre la plataforma común (plantillas de proyecto dbt, CI, permisos por grupo). Si funciona, se extiende a otros dominios con capacidad. Es data mesh gradual, no un cambio total.
4) Reverse ETL para marketing: el segmento de clientes en riesgo se sincroniza cada mañana con la herramienta de emails, enviando solo los campos necesarios.
No haría: data mesh completo de golpe (la mayoría de las empresas del grupo no tiene equipos de datos), ni un feature store todavía (no hay varios modelos de ML en producción).
```
:::
