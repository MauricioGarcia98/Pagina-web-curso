---
titulo: SQL de entrevista 5 - autojoins, pares e intervalos que se superponen
nivel: Experto
duracion: 70
resumen: Las preguntas que obligan a comparar una fila con otra fila de la misma tabla - el empleado contra su jefe, el producto contra el que se compró en el mismo pedido, la búsqueda contra la compra que vino después, una reserva contra otra del mismo huésped. Aprendes el autojoin con la condición que evita pares repetidos, la regla de superposición de intervalos y el barrido con +1 y -1 para saber cuántas cosas pasaban al mismo tiempo.
objetivos: Unir una tabla consigo misma con alias y una condición que no duplique pares | Encontrar "A y después B dentro de N días" con EXISTS | Detectar intervalos que se superponen con la regla inicio_a < fin_b y inicio_b < fin_a | Calcular la concurrencia máxima con un barrido de +1 y -1 y una suma acumulada
prerrequisitos: entrevistas-sql-deduplicar-pivotear-comparar | sql-joins-avanzados | sql-ventanas-2
autoevaluacion: ¿Por qué se usa a.producto_id < b.producto_id y no <> al armar pares? | ¿Cuándo se superponen dos intervalos? | ¿Qué pasa en el barrido si una reserva sale y otra entra el mismo día? | ¿Cuándo conviene EXISTS en lugar de un JOIN?
---

:::analogia En palabras simples
Un autojoin es fotocopiar una lista para poder ponerla al lado de sí misma. Con dos copias de la lista de empleados, en una hoja buscas a cada persona y en la otra a su jefe, y comparas los sueldos renglón por renglón. La tabla es la misma: lo que cambia es el **papel** que juega cada copia, y eso se lo das con el alias.
:::

## Cómo reconocer que hace falta un autojoin

La pista está en la pregunta: compara una cosa **con otra cosa del mismo tipo**.

| La pregunta dice… | Las dos copias son… | La condición de unión es… |
|---|---|---|
| "empleados que ganan más que su jefe" | empleado y jefe | `j.empleado_id = e.jefe_id` |
| "productos que se compran juntos" | producto A y producto B del mismo pedido | `b.pedido_id = a.pedido_id AND a.producto_id < b.producto_id` |
| "buscó y compró dentro de las 24 horas" | evento de búsqueda y evento de compra del mismo cliente | mismo cliente y la compra entre la búsqueda y 24 h después |
| "reservas que se pisan" | reserva A y reserva B del mismo huésped | mismo huésped y los intervalos se superponen |

:::tip Cómo pensarlo en voz alta
1. **Ponle nombre a cada copia** según su papel: `e` (empleado) y `j` (jefe), no `a` y `b` si puedes evitarlo.
2. **Escribe la condición que relaciona las copias** antes que nada: es la que define qué pares existen.
3. **Pregúntate si el par (A, B) y el par (B, A) son lo mismo.** Si lo son, quédate con uno solo usando `<`.
4. **Recién después filtra y agrega.**
:::

## La jerarquía: cada empleado contra su jefe

La tabla `empleados` tiene `jefe_id`, que apunta a otro empleado de la misma tabla. Para traer los datos del jefe, se une la tabla consigo misma:

```sql
SELECT e.nombre || ' ' || e.apellido AS empleado, e.salario,
       j.nombre || ' ' || j.apellido AS jefe,     j.salario AS salario_jefe
FROM empleados e
JOIN empleados j ON j.empleado_id = e.jefe_id
ORDER BY e.empleado_id
LIMIT 5;
```

Con `JOIN` quedan afuera los empleados sin jefe (la dirección general). Si te piden "todos los empleados con su jefe, aunque no tengan", usa `LEFT JOIN` y el jefe queda en `NULL`.

## Pares: lo que se compra junto

Para saber qué productos aparecen en el mismo pedido, se une `detalle_pedidos` consigo misma por `pedido_id`. El detalle importante es **cómo se compara el producto**:

```diagrama
titulo: Con < cada par aparece una sola vez
direccion: abajo
nodo ped: Pedido 501 | icono=carrito | col=1 | fila=0 | color=azul | sub=productos 10, 20 y 30
nodo dist: a.producto_id <> b.producto_id | icono=alerta | col=0 | fila=1 | color=rojo | sub=6 filas: (10,20) y (20,10) …
nodo menor: a.producto_id < b.producto_id | icono=check | col=2 | fila=1 | color=verde | sub=3 filas: (10,20) (10,30) (20,30)
nodo res: Contar pedidos por par | icono=tabla | col=1 | fila=2 | color=violeta | sub=COUNT(DISTINCT pedido_id)
flecha ped -> dist: con <> | estilo=punteada | explica=Con distinto, cada par aparece dos veces: (10, 20) y (20, 10). Al contar, cada par queda duplicado.
flecha ped -> menor: con < | explica=Con menor, de cada par queda solo la versión ordenada, y nunca un producto consigo mismo.
flecha menor -> res | explica=Con una fila por par y por pedido, se cuenta en cuántos pedidos distintos aparece cada par.
```

```sql
SELECT a.producto_id AS producto_a, b.producto_id AS producto_b,
       COUNT(DISTINCT a.pedido_id) AS pedidos
FROM detalle_pedidos a
JOIN detalle_pedidos b
  ON b.pedido_id = a.pedido_id
 AND a.producto_id < b.producto_id
GROUP BY a.producto_id, b.producto_id
ORDER BY pedidos DESC, producto_a, producto_b
LIMIT 5;
```

:::cuidado El autojoin multiplica filas
Un pedido con 4 productos genera 6 pares; uno con 20 productos genera 190. En una tabla grande, un autojoin sin una condición que lo limite (mismo pedido, mismo cliente, misma semana) puede tardar muchísimo. En una entrevista, decir "esto crece como n² por pedido, así que primero filtro" suma puntos.
:::

## "A y después B dentro de N días": EXISTS

"¿Cuántos clientes buscaron algo y compraron dentro de las 24 horas siguientes?" También compara dos eventos del mismo cliente, pero no te interesan los pares: solo saber **si existe** al menos una compra. Para eso, `EXISTS` es más claro que un `JOIN` y no multiplica filas:

```sql
SELECT COUNT(DISTINCT b.cliente_id) AS clientes
FROM eventos_web b
WHERE b.tipo_evento = 'busqueda'
  AND EXISTS (
    SELECT 1
    FROM eventos_web c
    WHERE c.cliente_id  = b.cliente_id
      AND c.tipo_evento = 'compra'
      AND c.fecha_hora >  b.fecha_hora
      AND c.fecha_hora <= datetime(b.fecha_hora, '+1 day')
  );
```

| Si te piden… | Usa |
|---|---|
| Los pares en sí (qué con qué, cuántas veces) | `JOIN` de la tabla consigo misma |
| Solo saber si hay al menos uno | `EXISTS` |
| Saber si no hay ninguno | `NOT EXISTS` |
| El evento inmediatamente anterior o siguiente | `LAG` / `LEAD` (lección 2) |

## Intervalos que se superponen

Dos intervalos se pisan cuando **cada uno empieza antes de que termine el otro**:

```text
A:   |-------|
B:        |-------|        se superponen: inicio_a < fin_b  y  inicio_b < fin_a
C:                  |---|  no se superpone con A: inicio_c >= fin_a
```

```sql
SELECT a.huesped_id, a.reserva_id AS reserva_a, b.reserva_id AS reserva_b
FROM hotel_reservas a
JOIN hotel_reservas b
  ON b.huesped_id = a.huesped_id
 AND a.reserva_id < b.reserva_id
WHERE a.estado <> 'cancelada' AND b.estado <> 'cancelada'
  AND a.check_in < b.check_out
  AND b.check_in < a.check_out
LIMIT 5;
```

Con `<` estricto, una reserva que sale el 10 y otra que entra el 10 **no** se superponen: es lo correcto en un hotel, porque la habitación se libera a la mañana y se ocupa a la tarde. Si la regla del negocio fuera distinta, cambias a `<=`. **Pregúntalo**: es el caso borde de esta familia.

## ¿Cuántos al mismo tiempo? El barrido con +1 y -1

"¿Cuál fue la mayor cantidad de habitaciones ocupadas a la vez en cada hotel?" Comparar cada reserva con todas las demás es lento. El truco es convertir cada reserva en **dos eventos**: `+1` el día que entra y `-1` el día que sale. Ordenados por fecha, la suma acumulada dice cuántas había en cada momento.

```diagrama
titulo: Cada reserva suma 1 al entrar y resta 1 al salir
nodo r: Reservas (check_in, check_out) | icono=calendario | col=0 | fila=0 | color=azul
nodo e: Eventos: +1 en check_in, -1 en check_out | icono=list | col=1 | fila=0 | color=violeta | sub=UNION ALL
nodo s: Suma acumulada por fecha | icono=grafico | col=2 | fila=0 | color=naranja | sub=SUM(...) OVER (ORDER BY fecha)
nodo m: Máximo de la suma | icono=target | col=3 | fila=0 | color=verde | sub=el pico de ocupación
flecha r -> e | explica=Cada reserva se parte en dos filas: una que suma al entrar y otra que resta al salir.
flecha e -> s | explica=Se agrupan los eventos de cada fecha (así una salida y una entrada del mismo día se compensan) y se acumula en orden.
flecha s -> m | explica=La suma acumulada es cuántas reservas había en curso ese día. Su máximo es el pico.
```

```sql
WITH movimientos AS (
  SELECT hotel_id, check_in AS fecha,  1 AS delta FROM hotel_reservas WHERE estado = 'completada'
  UNION ALL
  SELECT hotel_id, check_out,         -1         FROM hotel_reservas WHERE estado = 'completada'
),
en_curso AS (
  SELECT hotel_id, fecha,
         SUM(SUM(delta)) OVER (PARTITION BY hotel_id ORDER BY fecha) AS ocupadas
  FROM movimientos
  GROUP BY hotel_id, fecha
)
SELECT hotel_id, MAX(ocupadas) AS pico
FROM en_curso
GROUP BY hotel_id;
```

`SUM(SUM(delta)) OVER (...)` parece raro: el `SUM` de adentro suma los eventos de cada fecha (por el `GROUP BY`) y el de afuera los acumula. Agrupar por fecha antes de acumular es lo que hace que una salida y una entrada del mismo día se compensen, en lugar de mostrar un pico falso.

:::errores
- **Usar `<>` para armar pares.** Cada par aparece dos veces y todos los conteos se duplican.
- **Olvidar la condición de unión del autojoin.** Sin `pedido_id = pedido_id` (o mismo cliente, mismo huésped), cada fila se une con todas las demás.
- **Superposición con `BETWEEN`.** Comprobar si el inicio de B cae dentro de A no detecta el caso en que B envuelve a A por completo. La regla correcta compara los cuatro extremos.
- **Un `JOIN` donde bastaba `EXISTS`.** Si un cliente tiene tres compras después de una búsqueda, el `JOIN` lo cuenta tres veces.
- **Acumular sin agrupar por fecha en el barrido.** El orden entre el `+1` y el `-1` del mismo día queda al azar y aparecen picos que no existieron.
:::

:::entrevista
**Pregunta:** "¿Cómo encontrarías los productos que más se compran juntos en una tabla de mil millones de líneas?"

**Respuesta modelo:** "La idea es un autojoin de las líneas por pedido con `producto_a < producto_b` para no repetir pares, y después contar pedidos por par. Pero el autojoin crece con el cuadrado de los productos por pedido, así que primero reduciría: solo pedidos de los últimos 90 días, sacaría los pedidos gigantes (que suelen ser compras de empresas y meten ruido) y me quedaría con los productos que aparecen en un mínimo de pedidos. En Spark haría lo mismo, con la tabla particionada por fecha."
:::

:::tip Practica como en una entrevista
El [banco de problemas de SQL](#/sql-problemas?e=1) reúne todos los ejercicios SQL del curso con filtros por nivel, técnica y empresa. Presiona **🎲 Al azar** para resolver uno sin saber de antemano qué técnica pide: así son las entrevistas.
:::

## Ejercicios

:::ejercicio quiz
Dos reservas del mismo huésped: A del 3 al 7 y B del 7 al 9 (check_out a la mañana). ¿Se superponen con la regla `a.check_in < b.check_out AND b.check_in < a.check_out`?
- [ ] Sí, porque comparten el día 7
- [x] No: 7 < 7 es falso, así que la segunda condición no se cumple
- [ ] Depende de cuál tenga el id más chico
- [ ] Solo si las dos están completadas
:::

:::ejercicio sql dificultad=Intermedio titulo="Empleados que ganan más que su jefe"
Lista a los empleados cuyo salario es **mayor** que el de su jefe directo. Columnas: `empleado` (nombre y apellido separados por un espacio), `salario`, `jefe` (nombre y apellido del jefe), `salario_jefe`.
```sql solucion
SELECT e.nombre || ' ' || e.apellido AS empleado, e.salario,
       j.nombre || ' ' || j.apellido AS jefe, j.salario AS salario_jefe
FROM empleados e
JOIN empleados j ON j.empleado_id = e.jefe_id
WHERE e.salario > j.salario;
```
```pista
Necesitas dos copias de `empleados`: una para la persona (`e`) y otra para su jefe (`j`).
```
```pista
La unión es `j.empleado_id = e.jefe_id`: el jefe es el empleado cuyo id aparece en la columna `jefe_id` de la persona.
```
```explicacion
**Cómo pensarlo.** El grano del resultado es un empleado. Cada fila necesita datos de dos personas distintas de la misma tabla, así que hacen falta dos copias con papeles distintos. La condición `j.empleado_id = e.jefe_id` es la que convierte la segunda copia en "el jefe de la primera". Con `JOIN` (y no `LEFT JOIN`) quedan afuera quienes no tienen jefe, lo que está bien: sin jefe no hay con quién comparar.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="Los 10 pares de productos que más se compran juntos"
Encuentra los **10 pares de productos** que aparecen juntos en más pedidos. Cada par aparece una sola vez, con el id más chico en `producto_a`. Columnas: `producto_a`, `producto_b`, `pedidos` (cantidad de pedidos distintos donde están los dos). Ordena por `pedidos` de mayor a menor y, si empatan, por `producto_a` y `producto_b`.
```sql solucion
SELECT a.producto_id AS producto_a, b.producto_id AS producto_b,
       COUNT(DISTINCT a.pedido_id) AS pedidos
FROM detalle_pedidos a
JOIN detalle_pedidos b
  ON b.pedido_id = a.pedido_id
 AND a.producto_id < b.producto_id
GROUP BY a.producto_id, b.producto_id
ORDER BY pedidos DESC, producto_a, producto_b
LIMIT 10;
```
```pista
Une `detalle_pedidos` consigo misma por `pedido_id`.
```
```pista
Para no contar (10, 20) y (20, 10) como pares distintos, ni un producto consigo mismo, usa `a.producto_id < b.producto_id` en la condición de unión.
```
```explicacion
**Cómo pensarlo.** El grano es un par de productos. Los pares salen de cruzar las líneas de un mismo pedido entre sí, y la condición `<` deja una sola versión de cada par. `COUNT(DISTINCT a.pedido_id)` protege del caso en que un producto aparezca en dos líneas del mismo pedido. El desempate en el `ORDER BY` hace que el `LIMIT 10` sea siempre el mismo: sin él, dos pares empatados en el puesto 10 podrían salir uno u otro.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="Buscaron y compraron dentro de las 24 horas"
¿Cuántos clientes distintos tuvieron al menos un evento `busqueda` seguido de un evento `compra` **dentro de las 24 horas siguientes** (la compra después de la búsqueda, como máximo 24 horas más tarde)? Usa `eventos_web`. Columna: `clientes`.
```sql solucion
SELECT COUNT(DISTINCT b.cliente_id) AS clientes
FROM eventos_web b
WHERE b.tipo_evento = 'busqueda'
  AND EXISTS (
    SELECT 1 FROM eventos_web c
    WHERE c.cliente_id = b.cliente_id
      AND c.tipo_evento = 'compra'
      AND c.fecha_hora > b.fecha_hora
      AND c.fecha_hora <= datetime(b.fecha_hora, '+1 day')
  );
```
```pista
Recorre las búsquedas y pregunta, para cada una, si **existe** una compra del mismo cliente en la ventana: `EXISTS (SELECT 1 FROM eventos_web c WHERE …)`.
```
```pista
La ventana es `c.fecha_hora > b.fecha_hora AND c.fecha_hora <= datetime(b.fecha_hora, '+1 day')`. Cuenta con `COUNT(DISTINCT b.cliente_id)`: un cliente puede tener varias búsquedas que cumplen.
```
```explicacion
**Cómo pensarlo.** La pregunta es por clientes, no por pares de eventos, así que no hace falta traer la compra: alcanza con saber que existe. `EXISTS` deja de buscar en cuanto encuentra una y no multiplica filas. El `DISTINCT` del conteo es imprescindible porque el mismo cliente puede tener muchas búsquedas que califican. Como `fecha_hora` está en formato ISO (`AAAA-MM-DD HH:MM:SS`), comparar textos ordena igual que comparar fechas.
```
:::

:::ejercicio sql dificultad=Experto titulo="Reservas superpuestas del mismo huésped"
Encuentra los pares de reservas **no canceladas** del mismo huésped cuyas estadías se superponen (la salida de una a la mañana y la entrada de otra ese mismo día **no** es superposición). Cada par una sola vez, con el id más chico en `reserva_a`. Columnas: `huesped_id`, `reserva_a`, `reserva_b`.
```sql solucion
SELECT a.huesped_id, a.reserva_id AS reserva_a, b.reserva_id AS reserva_b
FROM hotel_reservas a
JOIN hotel_reservas b
  ON b.huesped_id = a.huesped_id
 AND a.reserva_id < b.reserva_id
WHERE a.estado <> 'cancelada' AND b.estado <> 'cancelada'
  AND a.check_in < b.check_out
  AND b.check_in < a.check_out;
```
```pista
Autojoin de `hotel_reservas` por `huesped_id`, con `a.reserva_id < b.reserva_id` para no repetir pares.
```
```pista
Dos intervalos se superponen si `a.check_in < b.check_out AND b.check_in < a.check_out`. Con `<` estricto, salir y entrar el mismo día no cuenta.
```
```explicacion
**Cómo pensarlo.** Primero el par: mismo huésped, una sola versión de cada par. Después la regla de superposición, que compara los cuatro extremos y cubre todos los casos (B empieza dentro de A, B termina dentro de A, B envuelve a A, A envuelve a B). Comprobar solo si un `check_in` cae entre las fechas de la otra reserva se pierde el caso en que una envuelve a la otra. En la vida real, estos pares suelen ser reservas duplicadas por un reintento del sitio web, o una persona que reservó para otra con su propia cuenta.
```
:::

:::ejercicio sql dificultad=Experto titulo="El pico de ocupación de cada hotel"
Para cada hotel, calcula la **mayor cantidad de reservas completadas en curso al mismo tiempo** (una reserva está en curso desde su `check_in` hasta el día anterior a su `check_out`). Compáralo con su capacidad. Columnas: `hotel_id`, `nombre`, `habitaciones`, `pico`.
```sql solucion
WITH movimientos AS (
  SELECT hotel_id, check_in AS fecha, 1 AS delta FROM hotel_reservas WHERE estado = 'completada'
  UNION ALL
  SELECT hotel_id, check_out, -1 FROM hotel_reservas WHERE estado = 'completada'
),
en_curso AS (
  SELECT hotel_id, fecha,
         SUM(SUM(delta)) OVER (PARTITION BY hotel_id ORDER BY fecha) AS ocupadas
  FROM movimientos
  GROUP BY hotel_id, fecha
)
SELECT e.hotel_id, h.nombre, h.habitaciones, MAX(e.ocupadas) AS pico
FROM en_curso e
JOIN hotel_hoteles h ON h.hotel_id = e.hotel_id
GROUP BY e.hotel_id, h.nombre, h.habitaciones;
```
```pista
Convierte cada reserva en dos filas con `UNION ALL`: `+1` en `check_in` y `-1` en `check_out`.
```
```pista
Agrupa por hotel y fecha, y acumula con `SUM(SUM(delta)) OVER (PARTITION BY hotel_id ORDER BY fecha)`. El máximo de esa suma es el pico.
```
```explicacion
**Cómo pensarlo.** "Cuántos al mismo tiempo" es la señal del barrido. Comparar cada reserva con todas las demás funciona, pero crece como n²; el barrido solo necesita ordenar los eventos. Agrupar por fecha antes de acumular hace que una salida y una entrada del mismo día se compensen (la habitación se libera a la mañana y se ocupa a la tarde). El resultado muestra que ningún hotel superó su capacidad: es una buena prueba de que la consulta está bien, porque un pico mayor que las habitaciones indicaría un error en la lógica o sobreventa real.
```
:::

:::ejercicio sql dificultad=Experto titulo="Conductores con dos viajes a la vez"
En la app de viajes, un conductor no puede estar en dos viajes al mismo tiempo, pero los datos dicen lo contrario en algunos casos (es un error de registro que hay que reportar). Encuentra los pares de viajes **completados** del mismo conductor cuyos intervalos `fecha_hora_inicio`–`fecha_hora_fin` se superponen. Cada par una vez, con el id más chico en `viaje_a`. Columnas: `conductor_id`, `viaje_a`, `viaje_b`.
```sql solucion
SELECT a.conductor_id, a.viaje_id AS viaje_a, b.viaje_id AS viaje_b
FROM viajes_viajes a
JOIN viajes_viajes b
  ON b.conductor_id = a.conductor_id
 AND a.viaje_id < b.viaje_id
WHERE a.estado = 'completado' AND b.estado = 'completado'
  AND a.fecha_hora_inicio < b.fecha_hora_fin
  AND b.fecha_hora_inicio < a.fecha_hora_fin;
```
```pista
Es el mismo patrón que las reservas: autojoin por `conductor_id` y `a.viaje_id < b.viaje_id`.
```
```explicacion
**Cómo pensarlo.** Reconocer el patrón es la mitad del trabajo: "dos cosas del mismo dueño que ocurren a la vez" es siempre autojoin más regla de superposición, sean reservas, turnos, viajes o sesiones. Como las fechas tienen hora y están en formato ISO, la comparación de textos sirve. Este tipo de consulta suele terminar convertida en un test de calidad de datos que corre todos los días y alerta si aparece algún par.
```
:::
