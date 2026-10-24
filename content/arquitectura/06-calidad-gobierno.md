---
titulo: "Calidad, observabilidad y gobierno de datos"
nivel: Avanzado
duracion: 50
resumen: Las seis dimensiones de la calidad, dónde poner cada control, SLAs de frescura, linaje, catálogos, datos personales y control de acceso.
objetivos: Clasificar un problema de datos según las seis dimensiones de la calidad | Ubicar controles de calidad en cada capa del pipeline y decidir si frenan o solo alertan | Definir SLAs de frescura y volumen y monitorearlos | Diseñar el control de acceso y la protección de datos personales con roles, enmascaramiento y filas filtradas
prerrequisitos: arquitectura-diseno-lakehouse | dbt-tests-docs
autoevaluacion: ¿Puedes nombrar las seis dimensiones de la calidad con un ejemplo de cada una? | ¿Sabes cuándo un control debe detener el pipeline y cuándo solo avisar? | ¿Puedes escribir una consulta que mida la frescura de una tabla? | ¿Sabes qué es el linaje y para qué sirve ante un incidente? | ¿Puedes explicar cómo un analista de Chile vería solo los clientes de Chile con el email enmascarado?
---

:::escenario El tablero que mintió tres días
Un lunes, Valentina llama furiosa:

> "El tablero dice que el jueves, viernes y sábado vendimos casi cero en México. Pasé el fin de semana pensando que había un problema comercial. ¡Y era que no se cargaban los datos!"

El pipeline no falló: terminó "en verde" todos los días. Lo que pasó es que la API de México devolvía una lista vacía, y nadie controlaba que llegaran datos. Esta lección es sobre cómo enterarse **antes** que el negocio, y sobre quién puede ver qué.
:::

## Las seis dimensiones de la calidad

| Dimensión | Pregunta | Ejemplo de problema | Control típico |
|---|---|---|---|
| **Completitud** | ¿Está todo lo que debería? | La API de México devolvió 0 pedidos | Volumen por día y país dentro de un rango esperado |
| **Unicidad** | ¿Hay duplicados? | El mismo pago cargado dos veces | `unique` sobre la clave |
| **Validez** | ¿Los valores tienen sentido? | Un total negativo, un estado "perdido" | Rangos, valores aceptados, formatos |
| **Consistencia** | ¿Coincide con otras fuentes? | La suma de ventas no coincide con contabilidad | Conciliación entre sistemas |
| **Integridad referencial** | ¿Las relaciones existen? | Pedidos de un cliente que no existe | `relationships` (anti-join) |
| **Frescura** | ¿Está al día? | El tablero muestra datos de anteayer | Máxima fecha cargada vs. ahora |

El problema de Valentina fue de **completitud**, y ningún test de "valores válidos" lo hubiera detectado: cero filas no tienen valores inválidos.

## Dónde poner cada control

```diagrama
titulo: Controles de calidad a lo largo del pipeline
nodo src: Fuente | icono=api | col=0 | fila=0 | sub=API de México
nodo br: Bronze | icono=bucket | col=1 | fila=0 | color=naranja
nodo sv: Silver | icono=tabla | col=2 | fila=0 | color=gris
nodo gd: Gold | icono=grafico | col=3 | fila=0 | color=amarillo
nodo c1: ¿Llegó algo? ¿Cumple el contrato? | icono=alerta | col=1 | fila=1 | color=rojo | sub=frena la carga
nodo c2: Únicos, no nulos, válidos | icono=check | col=2 | fila=1 | color=rojo | sub=frena la publicación
nodo c3: Rangos y conciliación | icono=grafico | col=3 | fila=1 | color=amarillo | sub=alerta a una persona
flecha src -> br
flecha br -> sv
flecha sv -> gd
flecha c1 -> br | estilo=punteada
flecha c2 -> sv | estilo=punteada
flecha c3 -> gd | estilo=punteada
```

La decisión más importante: **¿el control frena o solo avisa?**

- **Frena** (*blocking*): si falla, el pipeline se detiene y los datos malos **no** llegan a quien los usa. El tablero muestra los datos de ayer, pero no datos incorrectos. Úsalo para lo que hace que el resultado sea falso: claves duplicadas, cero filas, contrato roto.
- **Avisa** (*warning*): el pipeline sigue y alguien revisa. Úsalo para lo dudoso: el volumen bajó un 30 % (¿un feriado?), aparecieron 5 emails inválidos.

:::tip Mejor viejo que incorrecto
Un tablero con datos de ayer y un cartel "datos actualizados al 14/12" es molesto. Un tablero con datos incorrectos es peligroso: alguien toma una decisión con él. Por eso los controles críticos frenan.
:::

## Observabilidad: SLAs de frescura y volumen

La **observabilidad de datos** es monitorear los datos como se monitorea un servidor. Los dos indicadores más útiles:

- **Frescura**: ¿cuándo fue el último dato? Se compara contra un **SLA** (*service level agreement*), por ejemplo "los pedidos de ayer, disponibles antes de las 6:00".
- **Volumen**: ¿cuántas filas llegaron, comparado con lo normal para ese día de la semana?

Consulta de frescura sobre los datos del curso (el último pedido de cada canal):

```sql
SELECT
    canal,
    MAX(fecha_pedido)                                        AS ultimo_pedido,
    CAST(julianday('2024-12-31') - julianday(MAX(fecha_pedido)) AS INTEGER) AS dias_de_atraso
FROM pedidos
GROUP BY canal
ORDER BY dias_de_atraso DESC;
```

En producción, `'2024-12-31'` sería la fecha de hoy, y una alerta se dispara si `dias_de_atraso` supera el SLA.

Y una consulta de volumen que compara cada día con el promedio de los 7 anteriores, para detectar caídas como la de México:

```sql
WITH por_dia AS (
    SELECT fecha_pedido AS dia, COUNT(*) AS pedidos
    FROM pedidos
    WHERE fecha_pedido BETWEEN '2024-11-01' AND '2024-12-31'
    GROUP BY fecha_pedido
),
con_referencia AS (
    SELECT dia, pedidos,
           AVG(pedidos) OVER (ORDER BY dia ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING) AS promedio_7d
    FROM por_dia
)
SELECT dia, pedidos, ROUND(promedio_7d, 1) AS promedio_7d,
       ROUND(100.0 * pedidos / promedio_7d, 1) AS pct_de_lo_normal
FROM con_referencia
WHERE promedio_7d IS NOT NULL
ORDER BY pct_de_lo_normal
LIMIT 5;
```

Los días con menor porcentaje de lo normal son los candidatos a investigar.

## Linaje: qué depende de qué

El **linaje** (*lineage*) es el mapa de dependencias entre tablas: de qué fuentes sale cada tabla y qué tableros dependen de ella. Lo construyen automáticamente dbt, Unity Catalog, Dataplex, Purview y OpenLineage.

Sirve en dos direcciones durante un incidente:

- **Hacia atrás** (*upstream*): "el tablero de ventas está mal: ¿de qué tablas sale?" → encuentras la fuente con el problema.
- **Hacia adelante** (*downstream*): "la API de México falló: ¿a quién afecta?" → avisas a los dueños de esos tableros **antes** de que lo descubran ellos.

## Gobierno: quién puede ver qué

El gobierno de datos responde: ¿quién es dueño de cada dato?, ¿qué significa?, ¿quién puede verlo?, ¿cumplimos la ley?

### Control de acceso por roles

Los permisos se dan a **grupos**, nunca a personas individuales, y a **cuentas de servicio** para los procesos:

| Grupo | Puede |
|---|---|
| `analistas_comercial` | Leer `gold_ventas` |
| `cientificos_datos` | Leer silver y gold, escribir en su esquema de pruebas |
| `ingenieros_datos` | Leer todo, escribir en dev |
| `sa_pipelines_prod` (cuenta de servicio) | Escribir en prod |

Cuando alguien cambia de área, se lo mueve de grupo y sus permisos cambian solos.

### Datos personales: enmascarar y filtrar

Los datos que identifican a una persona (nombre, email, documento, teléfono, dirección) se tratan especial por leyes de protección de datos. Tres herramientas:

```diagrama
titulo: La misma tabla, vista por dos personas distintas
nodo t: silver.clientes | icono=tabla | col=1 | fila=0 | color=gris | sub=todos los países, emails reales
nodo a: Analista de Chile | icono=usuario | col=0 | fila=1 | color=azul | sub=solo Chile · email ****@gmail.com
nodo s: Soporte (autorizado) | icono=usuario | col=2 | fila=1 | color=verde | sub=todos los países · email completo
flecha t -> a: filtro de filas + máscara
flecha t -> s: acceso completo
```

| Técnica | Qué hace | Ejemplo |
|---|---|---|
| **Enmascaramiento de columnas** | Oculta parte del valor según quién consulta | `ana@gmail.com` → `****@gmail.com` |
| **Filtro de filas** (*row-level security*) | Cada usuario ve solo las filas que le corresponden | El analista de Chile ve solo clientes de Chile |
| **Seudonimización** | Reemplaza el identificador por un código | `cliente_id` → hash; útil para análisis sin saber quién es |

Así se ve el enmascaramiento con SQL simple (en Databricks, BigQuery o Snowflake se define una vez como política y se aplica sola):

```sql
SELECT
    cliente_id,
    pais,
    '****' || SUBSTR(email, INSTR(email, '@')) AS email_enmascarado
FROM clientes
WHERE pais = 'Chile'
LIMIT 5;
```

<!-- estandar:errores -->
:::errores
- **Solo testear valores, no volumen**: cero filas pasan todos los tests de validez.
- **Todos los controles en "warning"**: llegan 200 alertas por día, nadie las lee y la importante se pierde.
- **Permisos a personas**: cuando alguien se va de la empresa, conserva accesos que nadie recuerda haber dado.
- **Copiar datos personales a dev sin enmascarar**: una laptop perdida con una tabla de clientes es un incidente legal.
- **Avisar tarde**: el negocio descubre el problema antes que el equipo de datos. Con linaje y alertas, el equipo avisa primero.
:::

<!-- estandar:trabajo -->
:::trabajo
- Las herramientas de observabilidad (Monte Carlo, Soda, Elementary para dbt, Databricks Lakehouse Monitoring, Dataplex) aprenden el volumen y la frescura "normales" de cada tabla y alertan cuando se salen del patrón.
- Cada incidente de datos se documenta en un **post-mortem** sin culpables: qué pasó, cómo se detectó, cuánto duró y qué control se agrega para que no vuelva a pasar. El control de volumen por país nace de un incidente como el de México.
- En empresas reguladas (bancos, salud) hay auditorías: hay que poder demostrar quién accedió a qué dato y cuándo. Los catálogos guardan esos registros.
:::

<!-- estandar:entrevista -->
:::entrevista "¿Cómo te aseguras de que los datos de un tablero son confiables?"
Habla de capas: contratos y controles de volumen en la ingesta; tests de unicidad, nulos, valores e integridad en silver (que frenan); conciliación y rangos en gold (que alertan); SLAs de frescura con alertas; linaje para saber a quién afecta un problema; y un proceso de incidentes con post-mortem. Menciona el principio "mejor viejo que incorrecto".
:::

## Ejercicios

:::ejercicio quiz
El pipeline terminó "en verde", pero cargó 0 pedidos de México. ¿Qué dimensión de calidad falló y qué control lo detecta?

- [ ] Validez: un test de valores aceptados
- [x] Completitud: un control de volumen por país y día comparado con lo esperado
- [ ] Unicidad: un test de duplicados
- [ ] Ninguna, el pipeline estaba bien
:::

:::ejercicio quiz
En silver aparecen 1.200 `pedido_id` duplicados. ¿El control debe frenar o avisar?

- [x] Frenar: los duplicados inflan todas las ventas de los tableros
- [ ] Avisar y seguir
- [ ] Ignorarlo
- [ ] Borrar los duplicados a mano en producción
:::

:::ejercicio sql titulo="Control de volumen por canal"
Para cada `canal`, compara los pedidos de **diciembre de 2024** con el promedio mensual de **enero a noviembre de 2024**. Devuelve `canal`, `pedidos_dic`, `promedio_mensual` (redondeado a 1) y `variacion_pct` (diciembre contra el promedio, en porcentaje, redondeado a 1). Ordena por `variacion_pct`.
```sql solucion
WITH mensual AS (
    SELECT canal, strftime('%m', fecha_pedido) AS mes, COUNT(*) AS pedidos
    FROM pedidos
    WHERE fecha_pedido >= '2024-01-01' AND fecha_pedido < '2025-01-01'
    GROUP BY canal, mes
),
resumen AS (
    SELECT canal,
           SUM(CASE WHEN mes = '12' THEN pedidos END) AS pedidos_dic,
           AVG(CASE WHEN mes <> '12' THEN pedidos END) AS promedio_mensual
    FROM mensual
    GROUP BY canal
)
SELECT canal, pedidos_dic, ROUND(promedio_mensual, 1) AS promedio_mensual,
       ROUND(100.0 * (pedidos_dic - promedio_mensual) / promedio_mensual, 1) AS variacion_pct
FROM resumen
ORDER BY variacion_pct
```
```pista
Primero cuenta pedidos por canal y mes de 2024. Después, con agregación condicional, saca por canal los pedidos de diciembre y el promedio de los otros meses.
```
:::

:::ejercicio sql titulo="Integridad referencial"
Control de integridad: ¿hay líneas de `detalle_pedidos` cuyo `pedido_id` no existe en `pedidos`, o cuyo `producto_id` no existe en `productos`? Devuelve dos columnas: `detalles_sin_pedido` y `detalles_sin_producto` (cantidades).
```sql solucion
SELECT
    (SELECT COUNT(*) FROM detalle_pedidos d WHERE NOT EXISTS (SELECT 1 FROM pedidos p WHERE p.pedido_id = d.pedido_id))      AS detalles_sin_pedido,
    (SELECT COUNT(*) FROM detalle_pedidos d WHERE NOT EXISTS (SELECT 1 FROM productos pr WHERE pr.producto_id = d.producto_id)) AS detalles_sin_producto
```
:::

:::ejercicio abierto titulo="Plan de calidad y acceso para la clínica"
La clínica pide: el tablero de ausentismo debe estar actualizado a las 7:00; nadie fuera de su sede debe ver los pacientes de otra sede; los analistas no deben ver nombres ni documentos; y quieren enterarse si un día se cargan menos turnos de lo normal. Propón los controles (con su capa y si frenan o avisan), los SLAs y el modelo de acceso.
```solucion
Controles: en bronze, contrato de la agenda (columnas y tipos) y volumen de turnos por sede vs. el mismo día de la semana anterior (frena si es 0, avisa si cae más de 40 %). En silver: turno_id único y no nulo, paciente_id y medico_id existentes (relationships), estado dentro de los valores permitidos (todos frenan). En gold: ausentismo entre 0 y 100 % y conciliación de turnos totales con silver (avisa).
SLA: frescura de gold antes de las 6:30 (margen para el tablero de las 7:00); alerta al canal de guardia si a las 6:30 la última fecha cargada no es la de ayer; el tablero muestra la fecha de actualización.
Acceso: grupos por sede con filtro de filas por sede_id; enmascaramiento de nombre, documento, teléfono y diagnóstico para el grupo analistas (ven ids seudónimos); acceso completo solo para un grupo administrativo autorizado; cuentas de servicio para los pipelines; auditoría de accesos activada; dev con datos enmascarados.
```
:::
