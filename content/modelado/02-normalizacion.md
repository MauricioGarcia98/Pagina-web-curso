---
titulo: "Normalización: de la planilla a tablas sanas (1FN, 2FN, 3FN)"
nivel: Intermedio
duracion: 50
resumen: Las anomalías de una tabla mal diseñada, las tres formas normales paso a paso con un ejemplo real, y cuándo conviene desnormalizar a propósito.
objetivos: Detectar las anomalías de inserción, actualización y borrado en una tabla plana | Llevar una tabla a primera, segunda y tercera forma normal explicando cada paso | Identificar dependencias funcionales entre columnas | Decidir cuándo desnormalizar para analítica y qué se gana y se pierde
prerrequisitos: modelado-del-negocio-al-modelo | sql-group-by
autoevaluacion: ¿Puedes dar un ejemplo de anomalía de actualización? | ¿Sabes qué viola una columna con varios valores separados por comas? | ¿Puedes explicar la 2FN con una clave compuesta? | ¿Puedes explicar la 3FN con un ejemplo de dependencia transitiva? | ¿Sabes por qué un esquema estrella está desnormalizado a propósito?
---

:::escenario La planilla de reservas
La gerente de Posada Andina te comparte la planilla con la que manejan las reservas desde hace años:

| reserva | fecha | huesped | email_huesped | hotel | ciudad_hotel | habitaciones | noches | tarifa |
|---|---|---|---|---|---|---|---|---|
| R-101 | 2024-03-01 | Ana Ruiz | ana@mail.com | Posada Lima Centro | Lima | 201, 202 | 3 | 85 |
| R-102 | 2024-03-02 | Luis Paz | luis@mail.com | Posada Cusco | Cusco | 105 | 2 | 70 |
| R-103 | 2024-03-05 | Ana Ruiz | ana.ruiz@mail.com | Posada Lima Centro | Lima | 305 | 1 | 120 |

> "Funciona, pero cada tanto encontramos cosas raras: Ana aparece con dos emails, y cuando cambiamos el nombre de un hotel hay que corregirlo en cientos de filas. ¿Lo pueden pasar a una base de datos bien hecha?"

Eso que "cada tanto pasa" tiene nombre: **anomalías**. La normalización es el método para eliminarlas.
:::

## Las tres anomalías de una tabla plana

Guardar todo en una sola tabla parece cómodo, pero provoca tres problemas:

| Anomalía | Qué pasa | En la planilla |
|---|---|---|
| **De actualización** | El mismo dato está repetido y al cambiarlo hay que tocar muchas filas; si te olvidas una, quedan contradicciones | Ana tiene `ana@mail.com` en una fila y `ana.ruiz@mail.com` en otra. ¿Cuál es el correcto? |
| **De inserción** | No puedes guardar un dato sin inventar otro | Para registrar un hotel nuevo, sin reservas todavía, tendrías que crear una "reserva" falsa |
| **De borrado** | Al borrar una fila pierdes datos que no querías perder | Si se cancela y borra la única reserva de Luis, se pierde que Luis existe y su email |

## Dependencias funcionales: la idea de fondo

Una columna B **depende funcionalmente** de A (se escribe A → B) si conocer A determina B. En la planilla:

- `reserva` → `fecha`, `huesped`, `hotel`, `noches`
- `huesped` → `email_huesped` (o debería: una persona tiene un email)
- `hotel` → `ciudad_hotel`

Normalizar es, en esencia, **poner cada dato en la tabla de la cosa de la que depende**. El email depende del huésped, no de la reserva: va en la tabla de huéspedes.

## Primera forma normal (1FN): un valor por celda

**Regla:** cada celda tiene un solo valor, y no hay grupos repetidos.

La columna `habitaciones` con `201, 202` viola la 1FN: no puedes unir, filtrar ni contar habitaciones dentro de un texto. La solución es una fila por cada habitación de la reserva:

| reserva | habitacion | fecha | huesped | email_huesped | hotel | ciudad_hotel | noches | tarifa |
|---|---|---|---|---|---|---|---|---|
| R-101 | 201 | 2024-03-01 | Ana Ruiz | ana@mail.com | Posada Lima Centro | Lima | 3 | 85 |
| R-101 | 202 | 2024-03-01 | Ana Ruiz | ana@mail.com | Posada Lima Centro | Lima | 3 | 85 |
| R-102 | 105 | 2024-03-02 | Luis Paz | luis@mail.com | Posada Cusco | Cusco | 2 | 70 |
| R-103 | 305 | 2024-03-05 | Ana Ruiz | ana.ruiz@mail.com | Posada Lima Centro | Lima | 1 | 120 |

Ahora la clave de la tabla es **compuesta**: (`reserva`, `habitacion`).

## Segunda forma normal (2FN): todo depende de la clave completa

**Regla:** estar en 1FN, y que cada columna dependa de **toda** la clave, no de una parte.

Con la clave (`reserva`, `habitacion`): la `fecha`, el `huesped` y las `noches` dependen solo de `reserva` (una parte de la clave). Están repetidas en las dos filas de R-101. La `tarifa` sí depende de las dos cosas (cada habitación puede tener su tarifa).

La solución: separar lo que depende de una parte:

- `reservas(reserva, fecha, huesped, email_huesped, hotel, ciudad_hotel, noches)` → clave `reserva`
- `reserva_habitaciones(reserva, habitacion, tarifa)` → clave (`reserva`, `habitacion`)

## Tercera forma normal (3FN): nada depende de algo que no es la clave

**Regla:** estar en 2FN, y que ninguna columna dependa de **otra columna que no es clave** (las llamadas dependencias **transitivas**).

En `reservas` quedan dos dependencias transitivas:

- `reserva` → `huesped` → `email_huesped`: el email depende del huésped, no de la reserva.
- `reserva` → `hotel` → `ciudad_hotel`: la ciudad depende del hotel.

Se separan en sus propias tablas. El modelo final:

```diagrama
titulo: La planilla normalizada en 3FN: cada dato vive en un solo lugar
nodo hue: huespedes | icono=usuario | col=0 | fila=0 | color=verde | sub=huesped_id, nombre, email
nodo hot: hoteles | icono=hotel | col=2 | fila=0 | color=azul | sub=hotel_id, nombre, ciudad
nodo res: reservas | icono=archivo | col=1 | fila=0 | color=naranja | sub=reserva_id, fecha, noches\nhuesped_id, hotel_id
nodo rh: reserva_habitaciones | icono=tabla | col=1 | fila=1 | color=amarillo | sub=reserva_id, habitacion, tarifa
flecha hue -> res: 1 : N
flecha hot -> res: 1 : N
flecha res -> rh: 1 : N
```

Ahora:

- El email de Ana está **una sola vez**: la anomalía de actualización desapareció (y la base puede exigir que sea único).
- Puedes dar de alta un hotel **sin** reservas: desapareció la anomalía de inserción.
- Borrar una reserva **no** borra al huésped: desapareció la anomalía de borrado.

:::tip Un truco para recordarlas
Una frase clásica resume las tres formas normales: cada columna debe depender **de la clave (1FN), de toda la clave (2FN) y de nada más que la clave (3FN)**.
:::

## Hazlo con SQL: separar la planilla

Así se separa la tabla plana con consultas. Primero, los huéspedes distintos y sus emails, donde aparece la contradicción:

```sql
WITH planilla(reserva, fecha, huesped, email_huesped, hotel, ciudad_hotel, habitacion, noches, tarifa) AS (
    VALUES ('R-101', '2024-03-01', 'Ana Ruiz', 'ana@mail.com',      'Posada Lima Centro', 'Lima',  201, 3, 85),
           ('R-101', '2024-03-01', 'Ana Ruiz', 'ana@mail.com',      'Posada Lima Centro', 'Lima',  202, 3, 85),
           ('R-102', '2024-03-02', 'Luis Paz', 'luis@mail.com',     'Posada Cusco',       'Cusco', 105, 2, 70),
           ('R-103', '2024-03-05', 'Ana Ruiz', 'ana.ruiz@mail.com', 'Posada Lima Centro', 'Lima',  305, 1, 120)
)
SELECT huesped, COUNT(DISTINCT email_huesped) AS emails_distintos, GROUP_CONCAT(DISTINCT email_huesped) AS emails
FROM planilla
GROUP BY huesped;
```

Ana tiene 2 emails: antes de cargar la tabla `huespedes` hay que decidir cuál es el correcto (por ejemplo, el más reciente). Normalizar **hace visibles** los problemas que la planilla escondía.

## ¿Y en analítica? Desnormalizar a propósito

La 3FN es ideal para sistemas **transaccionales** (OLTP): muchas escrituras chicas, sin contradicciones. Pero en **analítica** (OLAP) las consultas leen millones de filas y unen muchas tablas; cada `JOIN` cuesta.

Por eso los modelos analíticos se **desnormalizan a propósito**:

| | Normalizado (3FN) | Desnormalizado (estrella, tabla ancha) |
|---|---|---|
| Para qué sistema | OLTP: la app | OLAP: análisis y BI |
| Repetición de datos | Ninguna | Algo de repetición (la ciudad en cada fila de la dimensión hotel) |
| Escrituras | Simples y seguras | Las hace un pipeline, en lote |
| Consultas | Muchos JOIN | Pocos JOIN, más rápidas |
| Riesgo de contradicciones | Bajo | Controlado: el pipeline reconstruye desde la fuente normalizada |

La diferencia clave: en analítica, la repetición **no es peligrosa** porque nadie edita a mano la tabla desnormalizada. La regenera un pipeline desde la fuente normalizada. Las próximas lecciones tratan justamente de ese modelo: el dimensional.

<!-- estandar:errores -->
:::errores
- **Listas en una celda**: `"201, 202"` o un JSON con varios valores en una columna de una base relacional. Rompe la 1FN y todo lo que viene después.
- **Normalizar el modelo analítico como si fuera transaccional**: 15 tablas que hay que unir para cada tablero, lentas y difíciles de entender.
- **Desnormalizar el sistema transaccional**: la app escribe la ciudad del hotel en cada reserva y aparecen las anomalías.
- **Elegir un valor al azar ante una contradicción**: decide una regla (el más reciente, el de la fuente maestra) y documéntala.
:::

<!-- estandar:trabajo -->
:::trabajo
- Los ingenieros de datos casi nunca diseñan la base transaccional (eso lo hace el equipo de la aplicación), pero **leen** bases normalizadas todo el tiempo como fuente. Entender las formas normales es entender por qué los datos de origen están repartidos en 40 tablas.
- La migración de planillas a una base es un proyecto muy común en empresas medianas. La parte difícil no es crear las tablas: es resolver las contradicciones que aparecen (como los dos emails de Ana) con la gente del negocio.
:::

<!-- estandar:entrevista -->
:::entrevista "¿Qué es la tercera forma normal y por qué un data warehouse no la usa?"
3FN: cada columna depende de la clave, de toda la clave y de nada más que la clave; elimina repeticiones y anomalías de actualización, inserción y borrado, ideal para sistemas transaccionales con muchas escrituras. Un warehouse se desnormaliza a propósito (esquema estrella) porque prioriza consultas rápidas y simples sobre grandes volúmenes; la repetición no es un riesgo porque las tablas las regenera un pipeline desde la fuente normalizada, no se editan a mano.
:::

## Ejercicios

:::ejercicio quiz
En la planilla, si se cancela y se borra la única reserva de Luis, se pierde su email. ¿Qué anomalía es?

- [ ] De inserción
- [ ] De actualización
- [x] De borrado
- [ ] De lectura
:::

:::ejercicio quiz
Con clave (`reserva`, `habitacion`), la columna `fecha` depende solo de `reserva`. ¿Qué forma normal se viola?

- [ ] La primera
- [x] La segunda
- [ ] La tercera
- [ ] Ninguna
:::

:::ejercicio quiz
En una tabla de empleados, `departamento_id` → `nombre_departamento`. Si `nombre_departamento` está en la tabla de empleados, ¿qué forma normal se viola?

- [ ] La primera
- [ ] La segunda
- [x] La tercera: es una dependencia transitiva (empleado → departamento → nombre)
- [ ] Ninguna
:::

:::ejercicio sql titulo="Extraer la tabla de hoteles" ordenado
A partir de la planilla (ya en primera forma normal), construye la tabla `hoteles`: una fila por hotel con un `hotel_id` sustituto (1, 2, … en orden alfabético de nombre), `nombre` y `ciudad`. Columnas: `hotel_id`, `nombre`, `ciudad`, ordenado por `hotel_id`.
```sql inicial
WITH planilla(reserva, huesped, hotel, ciudad_hotel, habitacion, tarifa) AS (
    VALUES ('R-101', 'Ana Ruiz', 'Posada Lima Centro', 'Lima', 201, 85),
           ('R-101', 'Ana Ruiz', 'Posada Lima Centro', 'Lima', 202, 85),
           ('R-102', 'Luis Paz', 'Posada Cusco', 'Cusco', 105, 70),
           ('R-103', 'Ana Ruiz', 'Posada Lima Centro', 'Lima', 305, 120),
           ('R-104', 'Eva Soto', 'Posada Arequipa', 'Arequipa', 12, 60)
)
SELECT ...
```
```sql solucion
WITH planilla(reserva, huesped, hotel, ciudad_hotel, habitacion, tarifa) AS (
    VALUES ('R-101', 'Ana Ruiz', 'Posada Lima Centro', 'Lima', 201, 85),
           ('R-101', 'Ana Ruiz', 'Posada Lima Centro', 'Lima', 202, 85),
           ('R-102', 'Luis Paz', 'Posada Cusco', 'Cusco', 105, 70),
           ('R-103', 'Ana Ruiz', 'Posada Lima Centro', 'Lima', 305, 120),
           ('R-104', 'Eva Soto', 'Posada Arequipa', 'Arequipa', 12, 60)
),
hoteles AS (SELECT DISTINCT hotel, ciudad_hotel FROM planilla)
SELECT ROW_NUMBER() OVER (ORDER BY hotel) AS hotel_id, hotel AS nombre, ciudad_hotel AS ciudad
FROM hoteles
ORDER BY hotel_id
```
```pista
Quédate con las combinaciones distintas de hotel y ciudad, y numera con `ROW_NUMBER() OVER (ORDER BY hotel)`.
```
:::

:::ejercicio sql titulo="¿Dependencia rota o solo formato?" ordenado
En `clientes_crudo` se supone que `cliente_id` → `ciudad` (cada cliente vive en una ciudad). Encuentra los `cliente_id` que tienen **más de una variante** de ciudad tal como está escrita, y muestra cuántas ciudades **reales** quedan después de normalizar con `LOWER(TRIM(ciudad))`. Columnas: `cliente_id`, `variantes` (valores distintos de `ciudad` sin tocar) y `ciudades_reales`. Ordena por `cliente_id`.
```sql solucion
SELECT cliente_id,
       COUNT(DISTINCT ciudad) AS variantes,
       COUNT(DISTINCT LOWER(TRIM(ciudad))) AS ciudades_reales
FROM clientes_crudo
GROUP BY cliente_id
HAVING COUNT(DISTINCT ciudad) > 1
ORDER BY cliente_id
```
```explicacion
Todos los clientes con varias variantes tienen **una sola** ciudad real: la dependencia `cliente_id → ciudad` se cumple, y lo que hay son problemas de formato (mayúsculas, espacios). La solución no es cambiar el modelo, sino normalizar los textos en silver.
```
:::
