---
titulo: El viaje de una compra - del clic al tablero, paso a paso
nivel: Básico
duracion: 35
resumen: El panorama completo antes de entrar en detalle. Sigues una compra real de Tienda Andina por todas las estaciones de una plataforma de datos (la app, la API, la base de datos, los eventos, el lago con sus capas bronze, silver y gold, la orquestación, la calidad, el tablero y el CRM), viendo en cada paso cómo se ve el dato en ese momento. Después lo compruebas tú con SQL sobre los datos reales.
objetivos: Nombrar en orden las estaciones por las que pasa un dato desde que se genera hasta que se usa | Explicar qué cambia en el dato en cada estación (formato, limpieza, agregación) | Distinguir la base de la app (OLTP) del lago y del warehouse | Ubicar cada herramienta del curso en el recorrido | Encontrar con SQL una compra, su detalle, su pago y su aporte al total del día
prerrequisitos: fundamentos-bienvenida
autoevaluacion: ¿Puedes contar el viaje de una compra en 10 pasos sin mirar? | ¿Sabes qué es bronze, silver y gold? | ¿Sabes por qué no se analizan los datos directamente en la base de la app? | ¿Sabes qué hace Airflow en el recorrido? | ¿Encontraste el pedido 10729 con SQL?
---

:::escenario Tu primera semana
Tu líder te dice: "antes de tocar cualquier pipeline, quiero que sepas por dónde pasa un dato. Elige una compra cualquiera de ayer y síguela hasta el tablero de la gerencia". Vas a seguir la compra **10729**: el sábado 19 de octubre de 2024, **Pablo Aguilar**, de Cali (Colombia), compró tres teléfonos Samsung y una campera desde el navegador de su celular.
:::

## La idea en una frase

Un dato nace en un sistema que **opera** el negocio (la app, la base de pedidos) y viaja, transformándose en cada paso, hasta un sistema donde se **analiza** (el lago, el warehouse, el tablero). La ingeniería de datos construye y cuida ese viaje.

:::analogia
Es como un paquete de correo: se despacha en una sucursal, pasa por centros de clasificación, cambia de camión, se etiqueta, se controla y llega a destino. Cada estación hace una sola cosa y lo deja listo para la siguiente. Si una estación falla, el paquete se atrasa o llega roto, y alguien tiene que averiguar en cuál.
:::

## El recorrido completo

Presiona **▶ Reproducir** o avanza con **Siguiente**. También puedes hacer clic en una estación o usar las flechas del teclado. A la derecha ves **el dato tal como está en ese momento**.

```recorrido
titulo: La compra 10729, del celular de Pablo al tablero de la gerencia
estacion cli: Pablo | icono=usuario
estacion app: Web y app | icono=movil
estacion api: API | icono=api
estacion db: Base de la tienda | icono=postgres
estacion ev: Eventos | icono=kafka
estacion bronze: Lago: bronze | icono=bucket
estacion silver: Silver | icono=spark
estacion gold: Gold | icono=dbt
estacion orq: Airflow y calidad | icono=airflow
estacion bi: Tablero | icono=dashboard
estacion crm: CRM y modelos | icono=salesforce
paso cli: Pablo navega la tienda
Sábado 19/10, 14:17. Pablo abre la web en su celular, mira categorías, busca y entra a dos productos. Cada toque genera un **evento** de navegación: un registro chico con quién, cuándo, qué y desde dónde. Todavía no compró nada, pero ya hay datos.
>>> tabla
evento_id,fecha_hora,tipo_evento,pagina,dispositivo
15744,2024-10-19 14:17:02,vista,inicio,movil
15745,2024-10-19 14:21:27,vista,categoria,movil
15746,2024-10-19 14:31:04,vista,producto,movil
15754,2024-10-19 14:57:09,busqueda,busqueda,movil
15756,2024-10-19 14:59:22,vista,producto,movil
paso app: Toca "Comprar"
La web arma un **pedido** con lo que hay en el carrito y lo envía a la API como un mensaje JSON (el formato de intercambio más común entre sistemas). Es el primer dato de negocio de esta historia.
>>> json
{
  "cliente_id": 1722,
  "canal": "web",
  "metodo_pago": "tarjeta_debito",
  "items": [
    { "producto_id": 23, "cantidad": 3, "precio_unitario": 1111.99, "descuento": 0.15 },
    { "producto_id": 54, "cantidad": 1, "precio_unitario": 17.99, "descuento": 0.05 }
  ]
}
paso api: La API valida y registra
La **API** (el programa que recibe los pedidos) revisa que haya stock y que los precios sean los vigentes, asigna un número de pedido y lo guarda. Todo en milisegundos: el cliente está esperando la confirmación en la pantalla.
>>> sql
BEGIN;
INSERT INTO pedidos (pedido_id, cliente_id, fecha_pedido, estado, canal, metodo_pago)
VALUES (10729, 1722, '2024-10-19', 'pendiente', 'web', 'tarjeta_debito');
INSERT INTO detalle_pedidos (pedido_id, producto_id, cantidad, precio_unitario, descuento)
VALUES (10729, 23, 3, 1111.99, 0.15), (10729, 54, 1, 17.99, 0.05);
COMMIT;
paso db: El pedido queda en la base de la tienda
La base de la app es **OLTP** (procesamiento de transacciones): está optimizada para escribir y leer **un pedido a la vez**, muy rápido y sin errores. No está pensada para preguntas como "¿cuánto vendimos por país este año?": esa consulta la haría lenta para los clientes que están comprando.
>>> tabla
pedido_id,cliente_id,fecha_pedido,estado,canal,metodo_pago
10729,1722,2024-10-19,pendiente,web,tarjeta_debito
paso db: El pago se aprueba
Dos días después, el 21/10, la pasarela de pagos confirma el cobro y el sistema registra el pago y actualiza el estado. Un mismo pedido **cambia** con el tiempo: pendiente, pagado, enviado, entregado. Esos cambios también son datos.
>>> tabla
pago_id,pedido_id,fecha_pago,monto,estado
9903,10729,2024-10-21,2852.67,aprobado
paso ev: Cada cambio se publica como evento
Para que otros sistemas se enteren sin consultar la base todo el tiempo, cada cambio se publica en una **cola de eventos** (Kafka, Event Hubs, Pub/Sub). Una técnica común es el **CDC** (captura de cambios): leer el registro interno de la base y emitir un evento por cada INSERT o UPDATE.
>>> json
{
  "op": "u",
  "tabla": "pedidos",
  "antes":   { "pedido_id": 10729, "estado": "pendiente" },
  "despues": { "pedido_id": 10729, "estado": "pagado" },
  "ts": "2024-10-21T09:12:44Z"
}
paso bronze: Llega al lago, tal cual
De madrugada, el pipeline copia los datos nuevos al **data lake** (S3, ADLS o Cloud Storage) en la capa **bronze**: una copia fiel, sin tocar, con la fecha de carga. Si mañana se descubre un error en la limpieza, se puede reprocesar desde acá.
>>> texto
s3://tienda-andina-lago/bronze/pedidos/fecha_carga=2024-10-20/part-0000.parquet
s3://tienda-andina-lago/bronze/detalle_pedidos/fecha_carga=2024-10-20/part-0000.parquet
s3://tienda-andina-lago/bronze/eventos_web/fecha=2024-10-19/hora=14/part-0003.parquet
paso silver: Silver: limpio y unido
Un job de **Spark** (o SQL) limpia: tipos correctos, sin duplicados, textos normalizados, y une el pedido con su detalle y el producto. En **silver** cada fila tiene el grano claro: **una línea de pedido**. Fíjate en el `importe`: ya está calculado con el descuento.
>>> tabla
pedido_id,fecha,pais,producto,categoria,cantidad,importe
10729,2024-10-19,Colombia,Teléfono Samsung Ultra,Celulares,3,2835.57
10729,2024-10-19,Colombia,Campera Puma Lite,Ropa,1,17.09
paso gold: Gold: la métrica del negocio
Un modelo de **dbt** agrupa silver en las tablas que usa el negocio. Acá la compra de Pablo deja de ser "una compra" y se convierte en parte de un número: las ventas del día en Colombia.
>>> sql
-- models/gold/ventas_diarias_pais.sql
SELECT fecha, pais,
       COUNT(DISTINCT pedido_id) AS pedidos,
       ROUND(SUM(importe), 2)    AS ventas
FROM {{ ref('silver_lineas_pedido') }}
GROUP BY fecha, pais
paso gold: El resultado en gold
Así queda la fila de Colombia del 19/10. Los 2.852,66 de Pablo son casi un tercio de las ventas del día en su país.
>>> tabla
fecha,pais,pedidos,ventas
2024-10-19,Colombia,4,9339.87
2024-10-19,España,5,4220.44
2024-10-19,Argentina,4,3897.04
paso orq: Airflow orquesta y los tests vigilan
Nadie ejecuta esto a mano. **Airflow** dispara cada paso en orden a las 3:00 y, entre paso y paso, corren **tests de calidad**: que no haya pedidos duplicados, que las ventas no sean negativas, que llegaron datos de todos los países. Si un test falla, gold no se actualiza y la guardia recibe una alerta.
>>> log
03:00:02  extraer_pedidos       success   1.184 filas nuevas
03:06:40  silver_lineas_pedido  success   2.511 filas
03:12:15  gold_ventas_diarias   success   9 países
03:12:31  test unique(pedido_id, linea)      PASS
03:12:33  test ventas >= 0                   PASS
03:12:35  test frescura < 6 h                PASS
paso bi: 8:00 - La gerente abre el tablero
El tablero (Power BI, Looker, Tableau) consulta gold y muestra las ventas del día. La gerente comercial ve que Colombia lideró el sábado. No sabe que todo esto pasó, y **así tiene que ser**: cuando el viaje funciona, nadie lo nota.
>>> tabla
pais,pedidos,ventas,participacion
Colombia,4,9339.87,35%
España,5,4220.44,16%
Argentina,4,3897.04,15%
paso crm: Los datos vuelven a operar el negocio
El viaje no termina en el tablero. Los datos de gold también alimentan un **modelo de recomendaciones** y vuelven al **CRM** (reverse ETL): Pablo pasa a un segmento de clientes de alto valor y el lunes recibe una oferta de fundas para sus teléfonos.
>>> json
{
  "cliente_id": 1722,
  "segmento_crm": "alto_valor",
  "compras_90d": 2852.66,
  "recomendacion": ["fundas", "cargadores rápidos"],
  "actualizado": "2024-10-20T04:10:00Z"
}
```

## Las estaciones, en una tabla

| Estación | Qué hace | Cómo está el dato | Herramientas típicas | Dónde lo profundizas |
|---|---|---|---|---|
| Web, app y API | Generar y registrar operaciones | JSON, una operación a la vez | Python, Java, Node.js | — |
| Base de la tienda (OLTP) | Guardar el estado actual del negocio | Filas normalizadas en muchas tablas | PostgreSQL, MySQL, SQL Server | SQL, Modelado |
| Eventos | Avisar de cada cambio | Mensajes en una cola | Kafka, Event Hubs, Pub/Sub | Arquitectura, Spark |
| Lago: bronze | Copia fiel e histórica | Archivos Parquet o JSON, tal como llegaron | S3, ADLS, Cloud Storage | Formatos, nubes |
| Silver | Limpiar, tipar, deduplicar, unir | Filas limpias con un grano claro | Spark, PySpark, SQL | PySpark, Databricks |
| Gold | Calcular las métricas del negocio | Tablas agregadas o modelo estrella | dbt, SQL | dbt, Análisis |
| Orquestación y calidad | Ejecutar en orden y verificar | — | Airflow, dbt tests | Airflow, Guardia |
| Tablero, CRM y modelos | Usar los datos para decidir y actuar | Gráficos, segmentos, predicciones | Power BI, Looker, ML | Análisis, proyectos |

```diagrama
titulo: Las capas del lago (arquitectura medallón)
nodo br: Bronze | icono=bucket | col=0 | fila=0 | color=naranja | sub=crudo, tal cual llegó\nsirve para reprocesar
nodo si: Silver | icono=spark | col=1 | fila=0 | color=gris | sub=limpio y unido\nuna fila = una línea de pedido
nodo go: Gold | icono=dbt | col=2 | fila=0 | color=amarillo | sub=métricas del negocio\nlisto para tableros
flecha br -> si: limpiar | paso=1 | explica=Se corrigen tipos, se eliminan duplicados, se normalizan textos y se unen tablas.
flecha si -> go: agregar | paso=2 | explica=Se calculan las métricas con las reglas del negocio: ventas por día y país, clientes activos, margen.
```

:::tip ¿Por qué tantas copias del mismo dato?
Cada capa responde a una necesidad distinta. Bronze permite **reprocesar** si mañana descubres un error. Silver es la versión **confiable** sobre la que trabajan analistas y científicos de datos. Gold es lo que **consume el negocio**, rápido y sin ambigüedades. El almacenamiento es barato; recalcular sin la fuente original es imposible.
:::

## Ahora tú: sigue la compra con SQL

Los datos de Tienda Andina están en el editor de cada ejercicio. No necesitas saber SQL todavía: cada ejercicio trae la consulta casi lista o una pista con la respuesta. Lo importante es **ver** que el viaje es real.

:::ejercicio sql dificultad=Básico titulo="El pedido en la base de la tienda"
Muestra todas las columnas del pedido `10729` de la tabla `pedidos`.
```sql inicial
SELECT *
FROM pedidos
WHERE pedido_id = ...;
```
```sql solucion
SELECT * FROM pedidos WHERE pedido_id = 10729;
```
```pista
Reemplaza los puntos suspensivos por `10729`.
```
```explicacion
Hoy el pedido figura como `entregado`: la tabla OLTP guarda el **estado actual**. El historial de estados (pendiente, pagado, enviado…) solo existe si alguien guardó los eventos de cambio: por eso la estación de eventos es importante.
```
:::

:::ejercicio sql dificultad=Básico titulo="Lo que compró Pablo"
Muestra las líneas del pedido `10729` en `detalle_pedidos`: `producto_id`, `cantidad`, `precio_unitario` y `descuento`.
```sql inicial
SELECT producto_id, cantidad, precio_unitario, descuento
FROM detalle_pedidos
WHERE ...;
```
```sql solucion
SELECT producto_id, cantidad, precio_unitario, descuento
FROM detalle_pedidos
WHERE pedido_id = 10729;
```
```pista
La condición es `pedido_id = 10729`.
```
:::

:::ejercicio sql dificultad=Básico titulo="El pago"
Muestra el pago del pedido `10729` desde la tabla `pagos` (todas las columnas).
```sql solucion
SELECT * FROM pagos WHERE pedido_id = 10729;
```
```pista
Es igual que el primer ejercicio, pero en la tabla `pagos`.
```
:::

:::ejercicio sql ordenado dificultad=Intermedio titulo="Lo que hizo antes de comprar"
Muestra la navegación de Pablo (`cliente_id = 1722`) el `2024-10-19`: `fecha_hora`, `tipo_evento` y `pagina` de `eventos_web`, en orden cronológico.
```sql inicial
SELECT fecha_hora, tipo_evento, pagina
FROM eventos_web
WHERE cliente_id = 1722
  AND date(fecha_hora) = '2024-10-19'
ORDER BY ...;
```
```sql solucion
SELECT fecha_hora, tipo_evento, pagina
FROM eventos_web
WHERE cliente_id = 1722 AND date(fecha_hora) = '2024-10-19'
ORDER BY fecha_hora;
```
```pista
Ordena por `fecha_hora`.
```
:::

:::ejercicio sql dificultad=Intermedio titulo="El importe de cada línea (silver)"
Calcula, para cada línea del pedido `10729`, el `importe` = cantidad × precio_unitario × (1 − descuento), redondeado a 2 decimales. Devuelve `producto_id` e `importe`.
```sql inicial
SELECT producto_id,
       ROUND(cantidad * precio_unitario * (1 - ...), 2) AS importe
FROM detalle_pedidos
WHERE pedido_id = 10729;
```
```pista
Completa con la columna del descuento: `(1 - descuento)`.
```
```sql solucion
SELECT producto_id, ROUND(cantidad * precio_unitario * (1 - descuento), 2) AS importe
FROM detalle_pedidos
WHERE pedido_id = 10729;
```
```explicacion
2.835,57 y 17,09: los mismos números de la estación silver. Sumados dan 2.852,66, y el pago fue de 2.852,67. ¿Un centavo de diferencia? La pasarela redondeó el total y el pipeline redondea cada línea. Las diferencias de redondeo son de los primeros "misterios" que aparecen al conciliar datos de dos sistemas.
```
:::

:::ejercicio sql ordenado dificultad=Avanzado titulo="Gold: ventas por país del día"
Calcula la tabla gold del 19/10/2024: por `pais` del cliente, la cantidad de `pedidos` distintos y las `ventas` (suma de los importes, 2 decimales), de mayor a menor venta. Une `pedidos`, `detalle_pedidos` y `clientes`.
```sql inicial
SELECT c.pais,
       COUNT(DISTINCT p.pedido_id) AS pedidos,
       ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS ventas
FROM pedidos p
JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
JOIN clientes c ON c.cliente_id = p.cliente_id
WHERE p.fecha_pedido = '2024-10-19'
GROUP BY c.pais
ORDER BY ...;
```
```sql solucion
SELECT c.pais,
       COUNT(DISTINCT p.pedido_id) AS pedidos,
       ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS ventas
FROM pedidos p
JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
JOIN clientes c ON c.cliente_id = p.cliente_id
WHERE p.fecha_pedido = '2024-10-19'
GROUP BY c.pais
ORDER BY ventas DESC;
```
```pista
Ordena por `ventas DESC`.
```
```explicacion
Es exactamente la consulta de un modelo gold. Fíjate en `COUNT(DISTINCT p.pedido_id)`: después del `JOIN` con el detalle, cada pedido aparece una vez por línea, así que `COUNT(*)` contaría líneas, no pedidos. Es uno de los errores más comunes (y lo vas a ver en detalle en el curso de SQL).
```
:::

:::ejercicio quiz dificultad=Básico
¿En qué orden pasa la compra por las capas del lago?

- [ ] Gold → silver → bronze
- [x] Bronze → silver → gold
- [ ] Silver → bronze → gold
- [ ] Bronze → gold → silver
:::

:::ejercicio quiz dificultad=Básico
¿Por qué no se calculan las ventas por país directamente sobre la base de la tienda (OLTP)?

- [ ] Porque la base OLTP no guarda el país del cliente
- [x] Porque está optimizada para operar de a una transacción; las consultas analíticas grandes la hacen lenta para los clientes que están comprando
- [ ] Porque SQL no puede agrupar por país
- [ ] Porque está prohibido por ley
:::

:::ejercicio quiz dificultad=Básico
En el recorrido, ¿qué hace Airflow?

- [ ] Guarda los pedidos de la tienda
- [ ] Dibuja el tablero de la gerencia
- [x] Ejecuta cada paso del pipeline en orden y a la hora programada
- [ ] Limpia los datos con Spark
:::

:::ejercicio quiz dificultad=Intermedio
Un analista descubre que la limpieza de silver tenía un error desde hace un mes. ¿Qué capa permite recalcular todo sin pedirle nada a la base de la tienda?

- [x] Bronze, porque guarda una copia fiel de lo que llegó
- [ ] Gold, porque tiene los totales
- [ ] El tablero, porque guarda los gráficos
- [ ] Ninguna: hay que volver a extraer todo de la app
:::

:::ejercicio quiz dificultad=Intermedio
¿Qué estación agrega datos del negocio de vuelta a una herramienta operativa como el CRM?

- [ ] La API
- [ ] Bronze
- [x] El reverse ETL desde gold
- [ ] Kafka
:::

## Resumen

| # | Estación | El dato es… |
|---|---|---|
| 1-3 | Cliente, web, API | Un evento o un JSON de una operación |
| 4-5 | Base de la tienda (OLTP) | Filas que guardan el estado actual |
| 6 | Eventos (CDC) | Un mensaje por cada cambio |
| 7 | Bronze | Un archivo, copia fiel |
| 8 | Silver | Filas limpias con grano claro |
| 9 | Gold | Una métrica del negocio |
| 10 | Airflow y calidad | La garantía de que todo lo anterior pasó y está bien |
| 11-12 | Tablero, CRM y modelos | Decisiones y acciones |

En las próximas lecciones abrimos cada tramo: **dónde viven** los datos (bases, lagos, warehouses, filas y columnas), **cómo se mueven** (batch, streaming, ETL y ELT, orquestación) y **quién los usa y cómo se cuidan** (calidad, seguridad y gobierno).
