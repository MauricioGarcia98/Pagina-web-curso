# examen: modelado

## Niveles del modelo
leccion: modelado-del-negocio-al-modelo
¿En qué nivel del modelado se deciden los tipos de dato, los índices y las particiones?
- [ ] En el conceptual, porque ahí se acuerda con el negocio cómo se guardará cada dato.
- [ ] En el lógico, porque ahí se definen las claves y por eso también los índices.
- [x] En el físico.
- [ ] En ninguno: el motor los elige automáticamente al crear las tablas.
porque: El **conceptual** identifica entidades y relaciones con el negocio; el **lógico** define atributos, claves y cardinalidades sin pensar en el motor; el **físico** baja a un motor concreto: tipos, índices, particiones, nombres.

## Normalización
leccion: modelado-normalizacion
Una planilla de pedidos repite en cada fila el nombre y la dirección del cliente. Si el cliente se muda, hay que cambiar 40 filas y una quedó sin cambiar. ¿Cómo se llama ese problema?
- [ ] Fan-out, porque el cliente se repite en muchas filas del join.
- [x] Una anomalía de actualización causada por la redundancia.
- [ ] Skew, porque un mismo cliente concentra demasiadas filas de la planilla.
- [ ] Un deadlock, porque dos procesos intentaron actualizar al mismo cliente.
porque: Cuando un dato vive en varios lugares, actualizarlo en todos es fácil de olvidar y aparecen contradicciones. Normalizar (mover el cliente a su propia tabla) hace que cada dato se guarde una sola vez.

## Granularidad
leccion: modelado-kimball
¿Cuál es el primer paso al diseñar una tabla de hechos con el método de Kimball?
- [ ] Elegir las métricas que se van a mostrar en el tablero para saber qué columnas crear.
- [x] Declarar el grano: qué representa exactamente una fila.
- [ ] Crear todas las dimensiones primero, para después conectar los hechos con ellas.
- [ ] Elegir la herramienta de BI, porque cada una exige un formato de tabla distinto.
porque: Kimball: proceso de negocio → **grano** → dimensiones → hechos. Si el grano no está claro, se mezclan filas de distinto nivel y las sumas se duplican.

## Hechos y dimensiones
leccion: modelado-kimball
En un star schema de ventas, ¿dónde va la columna `categoria_producto`?
- [ ] En la tabla de hechos, junto al monto, para no tener que hacer un join al filtrar.
- [x] En la dimensión de producto.
- [ ] En la dimensión de fecha, porque la categoría de un producto cambia con el tiempo.
- [ ] En una tabla aparte, sin relación con los hechos, para poder cambiarla libremente.
porque: Las **dimensiones** contienen los atributos descriptivos con los que se filtra y agrupa (el "por"). La tabla de **hechos** contiene las medidas numéricas y las claves hacia las dimensiones.

## Medidas aditivas
leccion: modelado-kimball
¿Cuál de estas medidas **no** se puede sumar a través del tiempo?
- [ ] Monto vendido
- [ ] Cantidad de unidades vendidas
- [x] Saldo de una cuenta al final del día
- [ ] Costo de envío de cada pedido
porque: El saldo es una medida **semiaditiva**: se puede sumar entre cuentas en un mismo día, pero sumar el saldo de 30 días no tiene sentido. Para el tiempo se usa el último valor o el promedio.

## SCD tipo 2
leccion: modelado-scd
Un cliente se muda de Lima a Arequipa. Quieres que las ventas anteriores sigan contando para Lima y las nuevas para Arequipa. ¿Qué tipo de SCD usas?
- [ ] Tipo 1: sobrescribir la ciudad, porque la venta ya guardó la ciudad en su propia fila.
- [x] Tipo 2: cerrar la versión vieja y crear una nueva fila con otra clave subrogada.
- [ ] Tipo 0: no permitir cambios en la ciudad para que la historia no se altere.
- [ ] Borrar el cliente y crearlo con otro ID de negocio para que las ventas nuevas queden separadas.
porque: El tipo 2 guarda la **historia**: cada versión tiene su propia clave subrogada y vigencia, y cada venta apunta a la versión vigente en su fecha. El tipo 1 reescribe la historia y todas las ventas pasarían a Arequipa.

## Clave subrogada
leccion: modelado-scd
¿Por qué una dimensión con SCD tipo 2 necesita una clave subrogada además del ID del sistema de origen?
- [ ] Porque los IDs de los sistemas de origen siempre son texto y los joins con texto son lentos.
- [x] Porque cada cliente tiene una fila por versión y el ID de origen se repite.
- [ ] Porque el estándar de Kimball prohíbe usar el ID del sistema de origen en cualquier tabla.
- [ ] No la necesita: alcanza con el ID de origen más la fecha de la venta.
porque: Con historia, `cliente_id = 42` aparece varias veces. La clave subrogada (`cliente_sk`) identifica cada **versión**, y es la que se guarda en la tabla de hechos.

## Data Vault
leccion: modelado-data-vault
En Data Vault, ¿dónde se guardan los atributos descriptivos que cambian con el tiempo, como el email o el plan de un cliente?
- [ ] En el hub, junto a la clave de negocio, para tener todo el cliente en un solo lugar.
- [ ] En el link, porque el email relaciona al cliente con el sistema de marketing.
- [x] En un satélite, con su fecha de carga.
- [ ] En la tabla de hechos, porque es un dato que cambia con cada transacción.
porque: El **hub** guarda solo la clave de negocio, el **link** las relaciones entre hubs, y los **satélites** los atributos con su historia. Así se agregan fuentes nuevas sin rediseñar lo existente.

## OBT
leccion: modelado-obt-anidados
¿Cuándo tiene sentido una tabla ancha (OBT) en lugar de un star schema?
- [ ] Nunca: repetir atributos siempre es un error de diseño en cualquier motor.
- [x] Cuando las consultas se repiten, el motor es columnar y se prioriza la simplicidad.
- [ ] Cuando las dimensiones cambian seguido y hay que conservar toda su historia.
- [ ] Cuando la base es transaccional (OLTP) y recibe miles de escrituras por segundo.
porque: En warehouses columnares, repetir atributos en una tabla ancha cuesta poco y evita joins. A cambio, pierde flexibilidad y complica los cambios en las dimensiones. Muchas veces se construye **encima** de un star schema.

## Dimensión de fecha
leccion: modelado-kimball
¿Por qué se usa una dimensión de fecha en lugar de solo la columna `fecha` en los hechos?
- [ ] Porque la mayoría de los motores no sabe calcular el mes o el año a partir de una fecha.
- [x] Para tener feriados, semanas fiscales y temporadas ya calculados y consistentes.
- [ ] Para ahorrar espacio, porque una clave entera ocupa menos que una fecha completa.
- [ ] Porque las tablas de hechos no pueden tener columnas de tipo fecha.
porque: Muchos atributos (feriados, trimestre fiscal, temporada alta) no se pueden derivar de la fecha con una función. Tenerlos en una dimensión evita que cada analista los calcule distinto.
