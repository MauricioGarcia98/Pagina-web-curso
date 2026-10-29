---
titulo: ¿Qué es SQL? Tu primera consulta
nivel: Básico
duracion: 25
resumen: Bases de datos relacionales, el dataset del curso y SELECT * FROM.
objetivos: Explicar qué es una base de datos relacional con tus palabras: tablas, filas, columnas y claves | Distinguir una clave primaria de una clave foránea en una tabla real | Escribir y ejecutar tu primera consulta con `SELECT * FROM` | Explorar una tabla desconocida de forma segura con `LIMIT`
prerrequisitos: fundamentos-datos-y-formatos
autoevaluacion: ¿Puedes explicar, sin mirar, qué es una fila, una columna y una clave primaria? | ¿Sabes por qué `categoria_id` en `productos` es una clave foránea y a qué tabla apunta? | ¿Puedes escribir de memoria una consulta que muestre las 5 primeras filas de `pedidos`? | ¿Sabes qué significa que SQL sea un lenguaje declarativo? | ¿Sabes qué hacer si aparece el error `no such table`?
---

<!-- estandar:escenario -->
:::escenario Tu primer día en Tienda Andina
Hoy empiezas como **data engineer junior** en **Tienda Andina**, un e-commerce de tecnología que vende en Latinoamérica y España. Martín, el líder del equipo de datos, te da la bienvenida con un pedido sencillo:

> "Antes de tocar nada, quiero que conozcas los datos. Entra a la base, mira qué tablas hay y qué tiene cada una. Mañana me cuentas qué entendiste."

Eso es exactamente lo que vas a aprender en esta lección: qué es una base de datos, cómo está organizada y cómo hacerle tu primera pregunta. A lo largo del curso vas a recibir pedidos de distintas personas de la empresa: Valentina (gerente comercial), Camila (marketing), Diego (finanzas), Sofía (operaciones) y Tomás (personas). Cada lección resuelve uno.
:::
## Antes de empezar: ¿qué es un dato y dónde se guarda?

Cada vez que compras algo en una tienda online se generan **datos**: quién compró, qué producto, cuántas unidades, a qué precio, en qué fecha, con qué medio de pago. Una empresa mediana genera miles de estos registros por día; una grande, millones por hora. Esos datos tienen que guardarse en algún lugar ordenado, para después poder responder preguntas como:

- ¿Cuánto vendimos ayer?
- ¿Cuál es el producto más vendido en Chile?
- ¿Qué clientes no compran hace más de 3 meses?

Ese "lugar ordenado" es una **base de datos**. Y el idioma que se usa para hacerle preguntas es **SQL**.

## ¿Qué es una base de datos relacional?

Una **base de datos relacional** guarda la información en **tablas**, muy parecidas a una hoja de Excel:

- Cada **tabla** guarda un tipo de cosa: clientes, productos, pedidos.
- Cada **fila** (también llamada *registro*) es **una** de esas cosas: un cliente, un producto, un pedido.
- Cada **columna** (también llamada *campo*) es **una característica**: el nombre, el precio, la fecha.

Así se ven las primeras filas de la tabla `productos` del curso:

| producto_id | nombre | categoria_id | marca | precio | costo | stock | activo | fecha_lanzamiento |
|---|---|---|---|---|---|---|---|---|
| 1 | Smartphone Apple Mini 300 | 6 | Apple | 484.99 | 310.41 | 38 | 1 | 2022-05-27 |
| 2 | Parlante Xiaomi Sport 900 | 7 | Xiaomi | 425.99 | 242.21 | 0 | 1 | 2022-06-17 |
| 3 | Notebook Apple X | 8 | Apple | 1044.99 | 718.28 | 468 | 1 | 2019-09-28 |

Fíjate en tres cosas:

1. **`producto_id`** es un número único para cada producto. Se llama **clave primaria** (*primary key*): es como el DNI del producto. Nunca hay dos productos con el mismo id.
2. **`categoria_id`** no dice "Celulares" sino un número (6). Ese número apunta a una fila de **otra** tabla, `categorias`. Eso se llama **clave foránea** (*foreign key*) y es lo que hace que la base sea *relacional*: las tablas están **relacionadas** entre sí por estos números.
3. Cada columna tiene un **tipo de dato**: `precio` es un número con decimales, `nombre` es texto, `fecha_lanzamiento` es una fecha.

:::analogia Una biblioteca con fichas cruzadas
Imagina una biblioteca con tres ficheros: uno de **libros**, uno de **autores** y uno de **préstamos**. La ficha de un préstamo no copia el nombre completo del autor ni el título del libro: solo anota "libro n.º 152, socio n.º 37". Para saber el título, buscas la ficha 152 en el fichero de libros. Así no se repite información y, si un autor cambia su nombre, se corrige en un solo lugar. Las bases relacionales funcionan exactamente así.
:::

### ¿Por qué no guardar todo en una sola tabla gigante?

Si cada pedido repitiera el nombre, el email y la ciudad del cliente, un cliente con 50 pedidos tendría sus datos copiados 50 veces. Si cambia de email, habría que corregir 50 filas (y seguro alguna queda mal). Separar en tablas evita esas repeticiones. Este principio se llama **normalización** y lo verás a fondo en la lección de modelado.

## ¿Qué es SQL?

**SQL** (*Structured Query Language*, "lenguaje de consultas estructurado"; se pronuncia "ese-cu-ele" o "sícuel") es el idioma estándar para trabajar con bases relacionales. Con SQL puedes:

| Qué quieres hacer | Ejemplo de instrucción | Se llama |
|---|---|---|
| **Consultar** datos | `SELECT … FROM …` | DQL (consulta) |
| **Agregar, modificar o borrar** filas | `INSERT`, `UPDATE`, `DELETE` | DML (manipulación) |
| **Crear o cambiar** tablas | `CREATE TABLE`, `ALTER TABLE` | DDL (definición) |
| **Dar permisos** | `GRANT`, `REVOKE` | DCL (control) |

En el trabajo de datos, el **90 %** del tiempo usarás `SELECT`: hacer preguntas a los datos. Por eso el curso empieza ahí.

SQL nació en IBM en los años 70 y hoy lo hablan casi todas las herramientas de datos: PostgreSQL, MySQL, SQL Server, Oracle, SQLite, y también las plataformas modernas como **BigQuery, Snowflake, Redshift, Athena y Databricks**. Cada una tiene pequeñas diferencias (llamadas *dialectos*), pero lo que aprendas aquí sirve en todas.

:::analogia SQL es pedir en un restaurante
No le dices al cocinero *cómo* cocinar ("prende el fuego, corta la cebolla, hierve el agua…"). Le dices **qué** quieres: "un plato de pasta, sin queso, para dos". SQL es igual: es un lenguaje **declarativo**. Describes el **resultado** que quieres y la base de datos decide la mejor forma de obtenerlo (qué leer primero, qué índices usar, cómo combinar las tablas). Esa parte la hace un componente llamado **optimizador**.
:::

Compáralo con Python, que es **imperativo**: ahí sí escribes los pasos uno por uno ("recorre esta lista; si el precio es mayor a 100, agrégalo a otra lista…"). Ambas formas son útiles; un data engineer usa las dos todos los días.

## La base de datos del curso: Tienda Andina

Para practicar usarás una base **SQLite** que corre **dentro de tu navegador**: no hay que instalar nada y no puedes romper nada (si algo sale mal, se recarga). Representa a **Tienda Andina**, un e-commerce de tecnología que vende en varios países de Latinoamérica y España. Las tablas principales:

| Tabla | Qué contiene | Filas |
|---|---|---|
| `clientes` | Nombre, email, teléfono, ciudad, país, segmento, fechas de nacimiento y registro | 2.000 |
| `productos` | Nombre, categoría, marca, precio, costo, stock, si está activo | 300 |
| `categorias` | Categorías y subcategorías (una categoría puede tener una "madre") | ~20 |
| `pedidos` | Quién compró, cuándo, en qué canal (web, app, tienda, teléfono), estado | 12.000 |
| `detalle_pedidos` | Las líneas de cada pedido: producto, cantidad, precio unitario, descuento | ~30.000 |
| `pagos` | Pagos de cada pedido | ~12.000 |
| `empleados`, `departamentos` | La empresa por dentro: sueldos, jefes, áreas | ~100 |
| `eventos_web` | Visitas, búsquedas y clics en el sitio | ~20.000 |

Además hay tablas de **siete empresas más** (un banco, una app de música, una de viajes, una clínica, un SaaS, una aerolínea y una empresa de logística) que usarás en el módulo de casos de negocio. Puedes verlas todas en [Los datos](#/datos).

La relación entre las tablas principales es esta:

```text
clientes ──< pedidos ──< detalle_pedidos >── productos >── categorias
   1      N    1      N                  N   1         N   1
```

Se lee: "un cliente tiene **muchos** pedidos; un pedido tiene **muchas** líneas de detalle; cada línea apunta a **un** producto; cada producto pertenece a **una** categoría". Los símbolos `<` indican el lado "muchos".

## Tu primera consulta

```sql
SELECT * FROM productos;
```

Léela en voz alta, palabra por palabra:

| Parte | Significa |
|---|---|
| `SELECT` | "Quiero ver…" |
| `*` | "…todas las columnas…" (el asterisco es un comodín: *todas*) |
| `FROM productos` | "…de la tabla `productos`." |
| `;` | Fin de la instrucción. Con una sola consulta es opcional, pero es buena costumbre ponerlo. |

Pruébala con el botón **▶**. Vas a ver las 300 filas de la tabla y, debajo, cuántas filas devolvió y cuánto tardó.

### Reglas de escritura que conviene saber desde ya

- **Mayúsculas y minúsculas**: SQL no distingue mayúsculas en las palabras clave. `select * from productos` funciona igual. La costumbre (que usaremos) es escribir las palabras clave en MAYÚSCULAS y los nombres de tablas y columnas en minúsculas, para leer más fácil.
- **Espacios y saltos de línea**: no importan. Puedes escribir una consulta en una línea o en diez. En consultas largas, una cláusula por línea se lee mucho mejor.
- **Texto entre comillas simples**: los valores de texto se escriben `'así'` (lo verás en la lección de `WHERE`). Las comillas dobles se reservan para nombres de columnas raros.
- **Comentarios**: todo lo que va después de `--` en una línea es un comentario, y SQL lo ignora. Úsalos para explicar tu consulta.

```sql
-- Esto es un comentario: SQL lo ignora
SELECT *          -- todas las columnas
FROM clientes     -- de la tabla de clientes
LIMIT 5;          -- solo 5 filas
```

## Ver solo algunas filas: LIMIT

Las tablas reales pueden tener **millones** de filas. Pedirlas todas para "echar un vistazo" es lento y, en la nube, puede costar dinero. Para explorar usa `LIMIT`, que corta el resultado a la cantidad de filas que indiques:

```sql
SELECT * FROM clientes LIMIT 5;
```

`LIMIT` siempre va **al final** de la consulta. Sin un orden explícito (lo verás con `ORDER BY`), la base devuelve "las primeras que encuentre", que no tienen por qué ser siempre las mismas: `LIMIT` sirve para mirar, no para pedir "los 5 mejores".

:::cuidado Errores típicos del primer día
- **Escribir mal el nombre de la tabla**: `SELECT * FROM producto;` da el error `no such table: producto`. El nombre correcto es `productos` (en plural). Usa el botón **📋 Tablas** para verificar nombres.
- **Olvidar el `FROM`**: `SELECT *;` no sabe de dónde sacar los datos.
- **Poner `LIMIT` antes del `FROM`**: el orden de las cláusulas importa. Siempre es `SELECT … FROM … LIMIT …`.
:::

## ¿Cómo sé qué columnas tiene una tabla?

Tienes tres formas:

1. El botón **📋 Tablas** de cualquier ejercicio muestra todas las tablas y sus columnas (y haciendo clic en una columna se escribe en el editor).
2. La página [Los datos](#/datos) describe cada tabla.
3. Una consulta rápida con `LIMIT 1`: verás todos los nombres de columnas en el encabezado del resultado.

```sql
SELECT * FROM pedidos LIMIT 1;
```

:::tip Explora sin miedo
En el [Laboratorio SQL](#/lab/sql) puedes escribir cualquier consulta, sobre cualquier tabla, sin que nada se califique. Ninguna consulta `SELECT` modifica los datos: solo los lee. Equivocarse es parte de aprender, y los mensajes de error te dicen exactamente qué falló.
:::





<!-- estandar:trabajo -->
:::trabajo
- En una empresa, lo primero que hace alguien nuevo en datos es justamente esto: **explorar**. Abre las tablas principales con `LIMIT`, lee la documentación (si existe) y pregunta qué significa cada columna rara. Nadie espera que lo sepas todo el primer día.
- En bases grandes (BigQuery, Snowflake, Databricks), un `SELECT *` sin `LIMIT` sobre una tabla de miles de millones de filas puede tardar minutos y **costar dinero**, porque esas plataformas cobran por datos leídos. Muchas incluso muestran una vista previa gratuita de la tabla: úsala.
- Los equipos suelen tener un **catálogo de datos** (Unity Catalog, Dataplex, un wiki) con la descripción de cada tabla. Si no existe, los ingenieros de datos son quienes lo construyen.
:::

<!-- estandar:entrevista -->
:::entrevista "¿Qué es una clave primaria y para qué sirve?"
Respuesta modelo: "Es una columna (o combinación de columnas) cuyo valor identifica de forma **única** cada fila y nunca es nulo, como `cliente_id` en `clientes`. Sirve para referirse a una fila sin ambigüedad y es lo que usan las claves foráneas de otras tablas para relacionarse con ella, como `pedidos.cliente_id`." Si puedes, menciona que la base la usa además para crear un índice y que no debería cambiar con el tiempo.
:::

## Resumen

- Una **base de datos relacional** guarda datos en **tablas** (filas y columnas) relacionadas por **claves**.
- **SQL** es el idioma para consultarlas; es **declarativo**: dices qué quieres, no cómo obtenerlo.
- `SELECT * FROM tabla` muestra todas las columnas de una tabla; `LIMIT n` muestra solo `n` filas.
- La palabra clave va en mayúsculas por costumbre, el texto entre comillas simples y los comentarios después de `--`.

## Ejercicios

:::ejercicio sql
Muestra **todas las columnas** de la tabla `departamentos`.
```sql inicial
SELECT 
```
```sql solucion
SELECT * FROM departamentos;
```
```pista
Usa `SELECT *` y después `FROM` con el nombre de la tabla.
```
:::

:::ejercicio sql
Muestra todas las columnas de las **primeras 10 filas** de la tabla `pedidos`.
```sql solucion
SELECT * FROM pedidos LIMIT 10;
```
```pista
Agrega `LIMIT 10` al final.
```
:::

:::ejercicio quiz
SQL es un lenguaje **declarativo**. ¿Qué significa eso?

- [ ] Que hay que declarar variables antes de usarlas
- [x] Que describes **qué** resultado quieres y el motor decide **cómo** obtenerlo
- [ ] Que solo sirve para declarar tablas
- [ ] Que distingue mayúsculas de minúsculas
:::
