# area: Modelado

## Modelo de datos
alias: modelado de datos, modelar
nino: Antes de ordenar tu cuarto, decides **dónde va cada cosa**: los juguetes en el baúl, la ropa en el placard, los libros en el estante. Un modelo de datos es ese plan: qué cosas existen, dónde se guarda cada una y cómo se relacionan.
que: La representación de **qué entidades hay** (clientes, pedidos, productos), qué atributos tienen y **cómo se relacionan**. Hay modelos para aplicaciones (normalizados, para escribir rápido y sin duplicar) y modelos analíticos (dimensionales, OBT, Data Vault: para leer y analizar fácil). Se diseña en tres niveles: conceptual (las ideas), lógico (tablas y columnas) y físico (tipos, particiones, índices).
ejemplo: Para Posada Andina: un **huésped** hace muchas **reservas**; cada reserva es de un **hotel** y puede tener muchos **consumos**. De ahí salen las tablas `huespedes`, `hoteles`, `reservas`, `consumos` y sus claves.
para: Que los datos se entiendan, no se dupliquen y respondan las preguntas del negocio de forma simple.
ver: Entidad, Normalización, Star schema, Granularidad

## Entidad
alias: entidades
nino: Una entidad es **una "cosa" de la que queremos guardar información**: un alumno, un libro, un préstamo de la biblioteca. Cada una se convierte en una lista (tabla).
que: Un objeto del negocio con identidad propia sobre el que se registran datos: personas (cliente), cosas (producto), lugares (hotel) o eventos (pedido, pago). En el modelo lógico, cada entidad suele ser una tabla, y sus características, columnas (atributos).
ejemplo: En una aerolínea: `vuelo`, `aeropuerto`, `pasajero`, `reserva`. "Ciudad" es un atributo del aeropuerto, no una entidad, salvo que necesites guardar datos propios de cada ciudad.
para: Es el primer paso del modelado: encontrar los sustantivos del negocio.
ver: Modelo de datos, Cardinalidad

## Cardinalidad
alias: relación uno a muchos, 1 a N, muchos a muchos
nino: Es contestar "**¿cuántos de cada uno?**". Una mamá puede tener muchos hijos, pero cada hijo tiene una sola mamá (uno a muchos). Un alumno tiene muchas materias y cada materia tiene muchos alumnos (muchos a muchos).
que: Cuántas filas de una tabla se relacionan con cuántas de otra: **1 a 1** (persona–pasaporte), **1 a N** (cliente–pedidos) o **N a N** (alumnos–materias, que se resuelve con una tabla intermedia: inscripciones). Define dónde va la clave foránea y anticipa duplicaciones al unir.
ejemplo: `pedidos` 1 a N `detalle_pedidos`: al unir, cada pedido aparece tantas veces como líneas tenga. Por eso sumar `pedidos.total` después de ese join infla el resultado (fan-out).
para: Diseñar bien las tablas y escribir joins correctos.
ver: Clave foránea, Fan-out, Entidad

## Normalización
alias: normalizar, formas normales, 1FN, 2FN, 3FN
nino: Normalizar es **no escribir lo mismo en muchos lugares**. Si la dirección de tu abuela está anotada en 20 cuadernos y se muda, tienes que corregir 20 cuadernos (y seguro te olvidas uno). Mejor anotarla en un solo lugar y en los demás poner "ver la ficha de la abuela".
que: Organizar las tablas para **eliminar redundancia** y evitar anomalías al insertar, actualizar o borrar. Se avanza por formas normales: **1FN** (valores atómicos, sin listas en una celda), **2FN** (cada columna depende de toda la clave), **3FN** (no hay columnas que dependan de otras columnas que no son clave). Es el estándar en bases OLTP.
ejemplo: Una tabla `pedidos(pedido_id, cliente_id, nombre_cliente, ciudad_cliente, …)` repite el nombre y la ciudad en cada pedido. Normalizada: `pedidos(pedido_id, cliente_id, …)` y `clientes(cliente_id, nombre, ciudad)`.
para: Que cada dato tenga una sola fuente de verdad y las aplicaciones no generen inconsistencias.
cuidado: Para análisis se hace lo contrario a propósito (desnormalizar), porque unir muchas tablas es lento y difícil para quien consulta.
ver: Desnormalizar, OLTP, Modelo de datos

## Desnormalizar
alias: desnormalización
nino: Es **copiar a propósito un dato en varios lugares para encontrarlo más rápido**. Como pegar el teléfono de emergencia en la heladera, en la agenda y en el celular: está repetido, pero siempre lo tienes a mano.
que: Juntar en una tabla datos que en un modelo normalizado estarían separados (por ejemplo, el nombre de la categoría dentro de la tabla de productos, o atributos del cliente dentro de la tabla de hechos). Reduce joins y simplifica las consultas analíticas, a cambio de duplicar datos.
ejemplo: `dim_producto(producto_id, nombre, marca, categoria, categoria_padre)` en lugar de tres tablas `productos` → `categorias` → `categorias_padre`.
para: Modelos analíticos (estrella, OBT) más simples y rápidos.
cuidado: Si un dato copiado cambia (la categoría de un producto), hay que actualizar todas las copias o versionarlas (SCD).
ver: Normalización, Star schema, OBT

## Granularidad
alias: grano, grain
nino: Es decidir **qué tan "de cerca" miras las cosas**: puedes anotar cuánto llovió cada día, cada mes o cada año. Si anotas por mes, ya no puedes saber qué día llovió más. El grano es "qué es exactamente un renglón".
que: El nivel de detalle que representa **una fila** de una tabla: "una fila por línea de pedido", "una fila por cliente y día", "una fila por póliza". Es la decisión más importante al diseñar una tabla de hechos y lo primero que hay que preguntar de cualquier tabla.
ejemplo: `fct_ventas` con grano "línea de pedido" permite sumar por producto; con grano "pedido", no (ya no sabes qué productos tenía). `mart_operaciones_diario` tiene grano "ciudad × día".
para: Evitar mezclar niveles (sumar cosas de distinto grano) y saber qué preguntas puede responder una tabla.
cuidado: Siempre conviene guardar el grano más fino posible: de lo detallado se puede agregar; de lo agregado no se puede volver al detalle.
ver: Tabla de hechos, GROUP BY, Fan-out

## Tabla de hechos
alias: fact table, hechos, fct
nino: Es el **cuaderno donde anotas cada cosa que pasó**: cada venta, cada viaje, cada partido jugado. Cada renglón es un evento, con números que se pueden sumar (cuánto costó, cuántos goles).
que: En el modelo dimensional (Kimball), la tabla que registra **eventos o mediciones del negocio** con un grano definido. Tiene **claves** hacia las dimensiones (quién, qué, dónde, cuándo) y **medidas** numéricas (importe, cantidad, minutos). Es la tabla grande del modelo. Tipos: transaccional (un evento por fila), snapshot periódico (foto cada día/mes) y accumulating snapshot (un proceso con varias etapas).
ejemplo:
```text
fct_ventas (fecha_key, cliente_key, producto_key, tienda_key,   ← claves a dimensiones
            cantidad, importe_neto, descuento)                   ← medidas
```
para: Es donde se calculan los KPI: se filtra y agrupa por las dimensiones y se suman las medidas.
ver: Dimensión, Star schema, Granularidad, Medidas aditivas

## Dimensión
alias: tabla de dimensión, dim
nino: Las dimensiones son las **fichas descriptivas**: la ficha de cada cliente (nombre, ciudad, edad), la de cada producto (marca, color, categoría). La tabla de hechos dice "el cliente 77 compró el producto 10"; las fichas te cuentan quiénes son.
que: Tabla que describe el **contexto** de los hechos: quién, qué, dónde, cuándo. Tiene una clave (normalmente subrogada) y muchos atributos de texto que se usan para **filtrar y agrupar**. Ejemplos: `dim_cliente`, `dim_producto`, `dim_fecha`, `dim_tienda`.
ejemplo:
```text
dim_producto (producto_key, producto_id, nombre, marca, categoria, categoria_padre, activo)
```
para: Poder preguntar "ventas por **categoría**, por **ciudad del cliente**, por **mes**" con una sola unión por dimensión.
ver: Tabla de hechos, Star schema, SCD, Dimensión de fecha

## Star schema
alias: esquema estrella, modelo estrella, modelo dimensional
nino: Imagina una **estrella**: en el centro, el cuaderno de las cosas que pasaron (hechos), y en cada punta, una ficha (cliente, producto, fecha, tienda). Para cualquier pregunta, vas del centro a una punta en un solo paso.
que: El diseño dimensional de Kimball: una **tabla de hechos** en el centro unida directamente a varias **dimensiones** desnormalizadas. Es simple de entender, rápido de consultar y el estándar en warehouses y herramientas de BI. Si las dimensiones se normalizan en subtablas, se llama **snowflake** (copo de nieve).
ejemplo:
```sql
SELECT d.mes, p.categoria, SUM(f.importe_neto) AS ventas
FROM fct_ventas f
JOIN dim_fecha d    ON d.fecha_key = f.fecha_key
JOIN dim_producto p ON p.producto_key = f.producto_key
GROUP BY d.mes, p.categoria;
```
para: Que analistas y tableros respondan preguntas con joins simples y consistentes.
ver: Tabla de hechos, Dimensión, Desnormalizar

## Medidas aditivas
alias: aditiva, semiaditiva, no aditiva
nino: Unas cosas **se pueden sumar** y otras no. Si el lunes vendiste 10 helados y el martes 5, en la semana vendiste 15 (se suma). Pero si el lunes tenías 20 helados en el freezer y el martes 18, en la semana no "tienes 38": eso es una foto, no se suma por días.
que: **Aditivas**: se pueden sumar por cualquier dimensión (importe, cantidad). **Semiaditivas**: se suman por algunas dimensiones pero no por el tiempo (saldos, stock, cantidad de clientes activos: por fecha se toma el último o el promedio). **No aditivas**: no se suman nunca (porcentajes, promedios, ratios): se guardan sus partes (numerador y denominador) y se dividen al final.
ejemplo: En el mart de Rápido se guarda `suma_min_total` y `entregados`, no `min_promedio`; así el promedio del mes es `SUM(suma_min_total) / SUM(entregados)`, que es correcto.
para: Que cualquier agregación (por semana, por todas las ciudades) dé el número correcto.
cuidado: Sumar porcentajes o promediar promedios es uno de los errores más comunes en reportes.
ver: Tabla de hechos, Agregación

## Clave subrogada
alias: surrogate key, sk, clave artificial
nino: En el colegio, cada alumno tiene su DNI, pero la escuela le da además un **número de legajo propio**. Aunque el DNI cambie o venga mal escrito de otro colegio, el legajo interno nunca cambia.
que: Una clave **inventada por el warehouse** (un número secuencial o un hash) que identifica cada fila de una dimensión, independiente de la clave del sistema de origen (**clave natural**). Permite versionar filas (SCD tipo 2: un mismo cliente con varias versiones), combinar fuentes con claves que chocan y aislarse de cambios en la fuente.
ejemplo: El cliente con `cliente_id = 77` (clave natural) se mudó: en `dim_cliente` tiene dos filas, `cliente_key = 1001` (Lima, hasta marzo) y `cliente_key = 2350` (Bogotá, desde marzo). Cada venta apunta a la versión vigente cuando ocurrió.
para: Historizar dimensiones y unir datos de varios sistemas.
ver: Clave primaria, SCD, Dimensión

## SCD
alias: slowly changing dimension, dimensión lentamente cambiante, SCD tipo 2
nino: Tu **álbum de fotos**: cuando te cortas el pelo, no tiras la foto vieja, agregas una nueva con la fecha. Así puedes ver cómo eras en cada momento. Una SCD tipo 2 guarda las "fotos" de cada cliente cuando cambia.
que: Técnicas para manejar dimensiones cuyos atributos cambian con el tiempo. **Tipo 1**: se sobrescribe (se pierde la historia). **Tipo 2**: se agrega una fila nueva por cada cambio, con `valido_desde`, `valido_hasta` y `es_actual`, y una clave subrogada por versión. **Tipo 3**: se guarda el valor anterior en otra columna. El tipo 2 es el más usado cuando la historia importa.
ejemplo:
```text
cliente_key | cliente_id | ciudad | valido_desde | valido_hasta | es_actual
1001        | 77         | Lima   | 2023-01-10   | 2024-03-01   | false
2350        | 77         | Bogotá | 2024-03-01   | 9999-12-31   | true
```
para: Que las ventas de 2023 se atribuyan a Lima aunque hoy el cliente viva en Bogotá.
cuidado: Al unir con una SCD2 hay que elegir la versión correcta: por `es_actual` (hoy) o por fecha (`fecha BETWEEN valido_desde AND valido_hasta`, el join *point-in-time*).
ver: Clave subrogada, Dimensión, Snapshot (dbt)

## Dimensión de fecha
alias: dim_fecha, calendario
nino: Es un **calendario gigante en una tabla**: cada día tiene su renglón, y al lado dice qué día de la semana es, si es feriado, a qué mes, trimestre y año pertenece.
que: Una dimensión con **una fila por día** (años hacia atrás y adelante) y atributos de calendario: año, trimestre, mes, nombre del mes, semana, día de la semana, fin de semana, feriado, período fiscal. Se genera una vez (con una CTE recursiva o un script) y todas las tablas de hechos la usan.
ejemplo:
```text
fecha_key | fecha      | anio | mes | nombre_mes | dia_semana | es_fin_de_semana | es_feriado
20241225  | 2024-12-25 | 2024 | 12  | diciembre  | miércoles  | false            | true
```
para: Agrupar por cualquier unidad de tiempo, comparar días hábiles, y mostrar días **sin ventas** (con un LEFT JOIN desde el calendario).
ver: Dimensión, CTE recursiva

## Snapshot periódico
alias: periodic snapshot, foto periódica
nino: Es **sacarle una foto al freezer todos los días a la misma hora**: no anotas cada helado que entra o sale, solo cuántos hay en el momento de la foto.
que: Un tipo de tabla de hechos con **una fila por entidad y período** (día, mes) que registra el estado en ese momento: saldo de cada cuenta al cierre del día, stock de cada producto, MRR de cada empresa por mes. Sus medidas suelen ser semiaditivas.
ejemplo: `fct_stock_diario (fecha, producto_id, almacen_id, unidades)`: para saber el stock de fin de mes no se suman los días: se toma el último.
para: Seguir la evolución de estados (saldos, inventario, suscripciones) sin recalcular desde todos los movimientos.
ver: Tabla de hechos, Medidas aditivas, Accumulating snapshot

## Accumulating snapshot
alias: snapshot acumulativo
nino: Es la **ficha de seguimiento de un paquete**: una sola ficha por paquete que vas completando: "recibido el lunes, salió del depósito el martes, entregado el jueves".
que: Un tipo de tabla de hechos con **una fila por proceso** (un pedido, una solicitud) que se va actualizando a medida que avanza, con una columna de fecha para cada etapa y las duraciones entre etapas.
ejemplo: `fct_rapido_pedidos (pedido_id, creado, aceptado, retirado, entregado, min_aceptacion, min_preparacion, min_viaje, min_total)`.
para: Medir tiempos entre etapas y cuellos de botella de procesos (entregas, préstamos, tickets de soporte).
ver: Tabla de hechos, Snapshot periódico

## Data Vault
alias: hub, link, satellite
nino: Imagina un **archivo de detectives**: una caja con las fichas de cada persona (hubs), una caja con los hilos rojos que unen a las personas (links) y una caja con todo lo que se fue sabiendo de cada una, con fecha (satellites). Nunca se tira nada: solo se agrega.
que: Una metodología de modelado para la capa de **integración** de warehouses grandes con muchas fuentes. Separa: **hubs** (claves de negocio únicas), **links** (relaciones entre claves) y **satellites** (atributos descriptivos con historia, por fuente). Se carga solo agregando filas (*insert-only*), es auditable y tolera cambios en las fuentes; para consultar se construyen modelos estrella encima.
ejemplo: `hub_cliente(cliente_hk, cliente_id)`, `link_cliente_pedido(cliente_hk, pedido_hk)`, `sat_cliente_crm(cliente_hk, fecha_carga, email, ciudad)` y `sat_cliente_erp(…)` con lo que dice cada sistema.
para: Bancos, aseguradoras y empresas grandes con decenas de fuentes y requisitos de auditoría.
cuidado: Es más complejo que un modelo estrella; para equipos chicos suele ser excesivo.
ver: Star schema, Modelo de datos

## OBT
alias: one big table, tabla ancha
nino: Es **juntar todo en una sola planilla enorme**: cada renglón tiene la venta y al lado todos los datos del cliente, del producto y de la fecha. No tienes que buscar en otras listas: está todo ahí.
que: *One Big Table*: una tabla ancha y totalmente desnormalizada que trae los hechos y todos los atributos de sus dimensiones. Con los warehouses columnares (que solo leen las columnas usadas) es una opción práctica para tableros y analistas.
ejemplo: `obt_ventas (fecha, mes, anio, cliente_id, cliente_ciudad, cliente_segmento, producto, categoria, marca, cantidad, importe_neto)`.
para: Tableros simples y rápidos, sin joins.
cuidado: Si cambia un atributo de una dimensión hay que reconstruir la tabla; y es fácil terminar con muchas OBT parecidas que no coinciden entre sí.
ver: Desnormalizar, Star schema
