---
titulo: "Del negocio al modelo: conceptual, lógico y físico"
nivel: Intermedio
duracion: 45
resumen: Cómo convertir la descripción de un negocio en entidades, relaciones y tablas, pasando por los tres niveles de modelado y la cardinalidad.
objetivos: Identificar entidades, atributos y relaciones a partir de la descripción de un negocio | Determinar la cardinalidad de una relación (1:1, 1:N, N:M) y cómo se implementa cada una | Pasar de un modelo conceptual a uno lógico y a uno físico | Verificar la cardinalidad real de los datos con SQL
prerrequisitos: sql-joins | sql-joins-avanzados
autoevaluacion: ¿Puedes listar las entidades y relaciones de un negocio a partir de un párrafo? | ¿Sabes cómo se implementa una relación muchos a muchos? | ¿Sabes en qué se diferencian el modelo conceptual, el lógico y el físico? | ¿Puedes comprobar con SQL si una relación es realmente 1:N? | ¿Sabes qué es una clave natural y qué es una clave sustituta?
---

:::escenario Posada Andina abre sus libros
El Grupo Andino compró una cadena de hoteles, **Posada Andina**, que maneja todo en planillas. Martín te pide:

> "Antes de construir pipelines, necesitamos entender el negocio de los hoteles y diseñar cómo van a quedar los datos. Te mando lo que me contó la gerente."

> *"Tenemos 12 hoteles en 4 países. Cada hotel tiene habitaciones de distintos tipos (simple, doble, suite). Un huésped hace una reserva para una o varias habitaciones, en unas fechas. Puede reservar por la web, por teléfono o por agencias. Durante la estadía consume servicios: restaurante, spa, lavandería. Al final se emite una factura que puede pagarse en partes."*

Esta lección te enseña a convertir ese párrafo en un modelo de datos. Es una habilidad que se usa en cada proyecto nuevo.
:::

## Los tres niveles de un modelo

Un modelo de datos se construye de lo general a lo concreto:

```diagrama
titulo: De la conversación con el negocio a las tablas en la base
nodo con: Conceptual | icono=equipo | col=0 | fila=0 | color=violeta | sub=qué cosas existen y cómo se relacionan
nodo log: Lógico | icono=tabla | col=1 | fila=0 | color=azul | sub=atributos, claves, cardinalidades
nodo fis: Físico | icono=base | col=2 | fila=0 | color=verde | sub=tipos, índices, particiones, motor
nodo p1: "Un huésped hace reservas" | icono=usuario | col=0 | fila=1 | forma=nota
nodo p2: reserva(reserva_id PK, huesped_id FK, ...) | icono=codigo | col=1 | fila=1 | forma=nota
nodo p3: CREATE TABLE ... PARTITION BY ... | icono=codigo | col=2 | fila=1 | forma=nota
flecha con -> log
flecha log -> fis
flecha con -- p1 | estilo=punteada
flecha log -- p2 | estilo=punteada
flecha fis -- p3 | estilo=punteada
```

| Nivel | Pregunta | Para quién | Contiene |
|---|---|---|---|
| **Conceptual** | ¿Qué cosas existen en el negocio? | El negocio y el equipo | Entidades y relaciones, sin detalles técnicos |
| **Lógico** | ¿Qué datos tiene cada cosa y cómo se conectan? | Analistas e ingenieros | Atributos, claves primarias y foráneas, cardinalidades |
| **Físico** | ¿Cómo se guarda en esta base concreta? | Ingenieros | Tipos exactos, índices, particiones, formato, motor |

El error más común es saltar directo al físico (escribir `CREATE TABLE`) sin haber entendido el negocio. Las tablas quedan con la forma del primer reporte que pidieron, y hay que rehacerlas en seis meses.

## Paso 1: encontrar las entidades

Una técnica simple: subraya los **sustantivos** del relato. Cada sustantivo importante es candidato a entidad (algo de lo que hay que guardar varios datos y que se repite):

> Tenemos 12 **hoteles** en 4 **países**. Cada hotel tiene **habitaciones** de distintos **tipos**. Un **huésped** hace una **reserva** para una o varias habitaciones, en unas **fechas**. Puede reservar por la web, por teléfono o por **agencias**. Durante la estadía consume **servicios**. Al final se emite una **factura** que puede pagarse en partes (**pagos**).

No todos los sustantivos son entidades:

- **País**: puede ser una entidad (si guardas moneda, impuestos) o un atributo del hotel. Depende de si necesitas más datos de él.
- **Tipo de habitación**: si solo es un nombre, es un atributo; si tiene precio base y capacidad, es una entidad.
- **Fechas**: son atributos de la reserva, no una entidad (aunque en analítica vas a tener una dimensión de fecha).
- **Canal** (web, teléfono, agencia): atributo de la reserva; la **agencia** sí es una entidad (tiene nombre, comisión).

## Paso 2: las relaciones y su cardinalidad

Los **verbos** del relato son las relaciones: un hotel *tiene* habitaciones, un huésped *hace* reservas. Para cada una, la pregunta clave es **cuántos de cada lado**:

| Cardinalidad | Se lee | Ejemplo | Cómo se implementa |
|---|---|---|---|
| **1:1** | uno con uno | Una reserva tiene una factura | Clave foránea en cualquiera de las dos (o la misma tabla) |
| **1:N** | uno con muchos | Un hotel tiene muchas habitaciones | La clave foránea va en el lado "muchos": `habitacion.hotel_id` |
| **N:M** | muchos con muchos | Una reserva incluye varias habitaciones, y una habitación aparece en muchas reservas | **Tabla puente**: `reserva_habitacion(reserva_id, habitacion_id, ...)` |

```diagrama
titulo: Modelo conceptual de Posada Andina
nodo hot: Hotel | icono=hotel | col=0 | fila=0 | color=azul
nodo hab: Habitación | icono=llave | col=1 | fila=0 | color=azul
nodo th: Tipo de habitación | icono=capas | col=2 | fila=0 | color=gris
nodo hue: Huésped | icono=usuario | col=0 | fila=1 | color=verde
nodo res: Reserva | icono=archivo | col=1 | fila=1 | color=naranja
nodo rh: Reserva_habitación | icono=tabla | col=2 | fila=1 | color=amarillo | sub=tabla puente N:M
nodo ag: Agencia | icono=equipo | col=0 | fila=2 | color=gris
nodo con: Consumo | icono=comida | col=1 | fila=2 | color=violeta | sub=restaurante, spa…
nodo fac: Factura | icono=dinero | col=2 | fila=2 | color=rojo | sub=se paga en partes
flecha hot -> hab: 1 : N
flecha th -> hab: 1 : N
flecha hue -> res: 1 : N
flecha res -> rh: 1 : N
flecha hab -> rh: 1 : N
flecha ag -> res: 1 : N (opcional)
flecha res -> con: 1 : N
flecha res -> fac: 1 : 1
```

:::tip La pregunta que lo resuelve
Para cada relación entre A y B, haz las dos preguntas: "¿un A puede tener **varios** B?" y "¿un B puede tener **varios** A?". Si las dos respuestas son sí, es N:M y necesitas una tabla puente. Pregúntalo al negocio, no lo supongas: "¿una reserva puede incluir dos habitaciones?" cambia el modelo entero.
:::

## Paso 3: el modelo lógico

Ahora cada entidad se convierte en una tabla con sus atributos y claves:

| Tabla | Clave primaria | Claves foráneas | Atributos principales |
|---|---|---|---|
| `hoteles` | `hotel_id` | — | nombre, ciudad, país, estrellas |
| `tipos_habitacion` | `tipo_id` | — | nombre, capacidad, precio_base |
| `habitaciones` | `habitacion_id` | `hotel_id`, `tipo_id` | número, piso |
| `huespedes` | `huesped_id` | — | nombre, email, país, documento |
| `agencias` | `agencia_id` | — | nombre, comisión |
| `reservas` | `reserva_id` | `huesped_id`, `agencia_id` (opcional) | fecha_reserva, check_in, check_out, canal, estado |
| `reserva_habitaciones` | (`reserva_id`, `habitacion_id`) | las dos | tarifa_noche |
| `consumos` | `consumo_id` | `reserva_id` | fecha, servicio, importe |
| `facturas` | `factura_id` | `reserva_id` | fecha, total |
| `pagos` | `pago_id` | `factura_id` | fecha, medio, monto |

### Claves naturales y claves sustitutas

- Una **clave natural** sale del negocio: el número de documento del huésped, el código del hotel `"LIM-01"`.
- Una **clave sustituta** (*surrogate key*) es un número o código inventado sin significado: `huesped_id = 48213`.

Se prefiere usar claves sustitutas como clave primaria, y guardar la natural como atributo (con un control de unicidad). ¿Por qué? Porque las claves naturales **cambian** (alguien corrige un documento mal cargado), **se repiten entre sistemas** (dos países pueden tener el mismo número de documento) y a veces **faltan** (un huésped extranjero sin documento local).

## Paso 4: el modelo físico

En el físico se decide lo que depende del motor:

```sql norun
CREATE TABLE reservas (
    reserva_id     BIGINT        PRIMARY KEY,
    huesped_id     BIGINT        NOT NULL REFERENCES huespedes(huesped_id),
    agencia_id     BIGINT        REFERENCES agencias(agencia_id),      -- puede ser NULL: reserva directa
    fecha_reserva  DATE          NOT NULL,
    check_in       DATE          NOT NULL,
    check_out      DATE          NOT NULL,
    canal          VARCHAR(20)   NOT NULL CHECK (canal IN ('web', 'telefono', 'agencia')),
    estado         VARCHAR(20)   NOT NULL,
    CHECK (check_out > check_in)
);
CREATE INDEX ix_reservas_check_in ON reservas (check_in);
```

Las restricciones (`NOT NULL`, `CHECK`, `REFERENCES`) son **reglas de negocio escritas en la base**: la base rechaza una reserva con salida anterior a la entrada. En un lakehouse muchas de estas restricciones no se aplican solas, y se reemplazan con tests (dbt, contratos).

## Verificar la cardinalidad con los datos reales

El negocio dice "cada pedido es de un solo cliente". Los datos pueden decir otra cosa. Antes de modelar, **compruébalo**. Con las tablas de Tienda Andina:

```sql
-- ¿Cuántas líneas tiene cada pedido? (esperamos 1:N)
SELECT
    MIN(lineas) AS minimo,
    MAX(lineas) AS maximo,
    ROUND(AVG(lineas), 2) AS promedio
FROM (
    SELECT pedido_id, COUNT(*) AS lineas
    FROM detalle_pedidos
    GROUP BY pedido_id
);
```

```sql
-- ¿Algún pedido tiene más de un pago? (¿es 1:1 o 1:N?)
SELECT pagos_por_pedido, COUNT(*) AS pedidos
FROM (SELECT pedido_id, COUNT(*) AS pagos_por_pedido FROM pagos GROUP BY pedido_id)
GROUP BY pagos_por_pedido
ORDER BY pagos_por_pedido;
```

Si un pedido puede tener varios pagos (por ejemplo, uno rechazado y uno aprobado), la relación es **1:N**, y sumar `pagos.monto` después de unir con pedidos puede duplicar importes. Esa información cambia cómo vas a modelar los hechos.

<!-- estandar:errores -->
:::errores
- **Modelar a partir del primer reporte**: la tabla queda con las columnas de ese reporte y no sirve para el siguiente.
- **Suponer la cardinalidad**: "un pedido tiene un pago" hasta que aparece el primer pago rechazado y reintentado.
- **Relaciones N:M sin tabla puente**: guardar `"101,102,103"` en una columna `habitaciones` hace imposible unir y contar.
- **Usar la clave natural como clave primaria** y descubrir después que se repite o cambia.
:::

<!-- estandar:trabajo -->
:::trabajo
- Antes de modelar, se hace una sesión (o varias) con la gente del negocio. Se dibuja el modelo conceptual **con ellos**, en una pizarra o en Excalidraw, y se validan las cardinalidades con preguntas concretas.
- Los modelos se documentan con diagramas entidad-relación (ER) en herramientas como dbdiagram.io, DBeaver, ERwin o directamente en Excalidraw, y se guardan junto al código.
- En analítica, el modelo lógico de la fuente (normalizado, como este) es el punto de partida; después se construye el modelo dimensional (lecciones siguientes) para consultar.
:::

<!-- estandar:entrevista -->
:::entrevista "Modela una biblioteca: libros, autores, socios y préstamos"
Empieza por las entidades (libro, autor, ejemplar, socio, préstamo) y pregunta las cardinalidades: un libro puede tener varios autores y un autor varios libros (N:M → tabla `libro_autor`); un libro tiene varios **ejemplares** físicos (1:N), y lo que se presta es el ejemplar, no el libro; un socio tiene muchos préstamos (1:N). Distinguir libro de ejemplar es justamente lo que el entrevistador espera ver.
:::

:::tip Practica en el laboratorio de modelado
En el [Laboratorio de modelado](#/modelado) escribes el modelo de ocho negocios (biblioteca, cursos online, restaurante, gimnasio, red social, alquiler de autos, organigrama y una estrella de ventas), ves el diagrama mientras escribes, el sitio revisa claves, formas normales y lo que pide el requerimiento, y genera el SQL de creación para SQLite, PostgreSQL, MySQL o SQL Server. También puedes ver cómo están modeladas las [13 bases del curso](#/datos) y por qué.
:::

## Ejercicios

:::ejercicio quiz
En Posada Andina, una reserva puede incluir varias habitaciones y una habitación aparece en muchas reservas a lo largo del tiempo. ¿Cómo se implementa esa relación?

- [ ] Una columna `habitaciones` en `reservas` con los números separados por comas
- [ ] Una clave foránea `reserva_id` en `habitaciones`
- [x] Una tabla puente `reserva_habitaciones(reserva_id, habitacion_id, …)`
- [ ] No se puede representar
:::

:::ejercicio quiz
¿Por qué se suele preferir una clave sustituta (un id inventado) como clave primaria del huésped, en lugar de su número de documento?

- [ ] Porque ocupa menos espacio
- [x] Porque el documento puede cambiar, repetirse entre países o faltar
- [ ] Porque los documentos son privados
- [ ] Porque SQL no acepta textos como clave
:::

:::ejercicio sql titulo="¿1:1 o 1:N?" ordenado
Comprueba con datos la relación entre `pedidos` y `pagos`: para cada **cantidad de pagos** que puede tener un pedido (0, 1, 2, …), cuántos pedidos la tienen. Incluye los pedidos **sin** ningún pago (cantidad 0). Columnas: `pagos_por_pedido`, `pedidos`, ordenado por `pagos_por_pedido`.
```sql solucion
SELECT pagos_por_pedido, COUNT(*) AS pedidos
FROM (
    SELECT p.pedido_id, COUNT(pg.pago_id) AS pagos_por_pedido
    FROM pedidos p
    LEFT JOIN pagos pg ON pg.pedido_id = p.pedido_id
    GROUP BY p.pedido_id
)
GROUP BY pagos_por_pedido
ORDER BY pagos_por_pedido
```
```pista
Para incluir los pedidos sin pagos necesitas un `LEFT JOIN` desde `pedidos` y `COUNT(pg.pago_id)` (que cuenta 0 cuando no hay pareja).
```
:::

:::ejercicio sql titulo="Clave natural duplicada"
En `clientes_crudo`, el `email` se usaba como clave natural. Comprueba si sirve: ¿cuántos emails distintos (normalizados con `LOWER(TRIM(email))`, sin contar los nulos) aparecen asociados a **más de un** `cliente_id`? Una columna: `emails_ambiguos`.
```sql solucion
SELECT COUNT(*) AS emails_ambiguos
FROM (
    SELECT LOWER(TRIM(email)) AS email_norm
    FROM clientes_crudo
    WHERE email IS NOT NULL
    GROUP BY LOWER(TRIM(email))
    HAVING COUNT(DISTINCT cliente_id) > 1
)
```
:::

:::ejercicio abierto titulo="Modelo conceptual de una academia"
Una academia online dice: "Tenemos cursos. Cada curso tiene módulos y cada módulo, lecciones. Los alumnos se inscriben a cursos (pueden estar en varios) y pagan una suscripción mensual o un curso suelto. Los instructores dictan uno o varios cursos, y un curso puede tener más de un instructor. Registramos qué lecciones completó cada alumno y cuándo". Lista las entidades, las relaciones con su cardinalidad y las tablas puente necesarias.
```solucion
Entidades: curso, módulo, lección, alumno, instructor, inscripción, suscripción, pago, progreso (lección completada).
Relaciones: curso 1:N módulo; módulo 1:N lección; alumno N:M curso → tabla puente inscripciones(alumno_id, curso_id, fecha_inscripcion, tipo_acceso); instructor N:M curso → tabla puente curso_instructores(curso_id, instructor_id, rol); alumno N:M lección → tabla puente progreso(alumno_id, leccion_id, fecha_completada); alumno 1:N suscripciones (con fecha_inicio, fecha_fin, plan); alumno 1:N pagos (cada pago asociado a una suscripción o a una inscripción de curso suelto).
Claves: sustitutas en todas las entidades; claves compuestas en las tablas puente, con atributos propios de la relación (fechas, rol).
```
:::
