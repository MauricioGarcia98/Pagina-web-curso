---
titulo: Quién usa los datos y cómo se cuidan - calidad, linaje y privacidad
nivel: Básico
duracion: 40
resumen: La última parte del viaje. Quién consume los datos (tableros, analistas, modelos, otros sistemas), qué significa que un dato sea de calidad, cómo se rastrea un número hasta su origen (linaje), quién es dueño de cada tabla y cómo se protegen los datos personales. Con un recorrido animado que sigue un número sospechoso del tablero hasta el error que lo causó.
objetivos: Nombrar los principales consumidores de los datos y qué necesita cada uno | Reconocer las dimensiones de calidad (completitud, unicidad, validez, consistencia, frescura) en datos reales | Seguir el linaje de un número desde el tablero hasta el origen | Explicar qué son los datos personales y cómo se protegen (enmascarar, mínimo privilegio) | Escribir checks de calidad simples con SQL
prerrequisitos: fundamentos-como-se-mueven-los-datos
autoevaluacion: ¿Sabes qué necesita un analista y qué necesita un modelo de machine learning de los datos? | ¿Sabes nombrar cinco dimensiones de la calidad de datos? | ¿Sabes qué es el linaje y para qué sirve en un incidente? | ¿Sabes qué datos son personales y por qué se enmascaran? | ¿Escribiste un check de nulos y uno de duplicados?
---

:::escenario
Marketing reporta que el tablero dice **243 clientes nuevos** en el último trimestre, pero el CRM dice 230. Nadie confía en ninguno de los dos números. Tu tarea: encontrar cuál está bien y por qué difieren, sin adivinar.
:::

## La idea en una frase

Los datos valen lo que vale la **confianza** que se les tiene. Esa confianza se construye con calidad medida, dueños claros, linaje para explicar cada número y protección de los datos de las personas.

## Quién usa los datos

| Consumidor | Qué hace con los datos | Qué necesita |
|---|---|---|
| **Tableros y reportes** (BI) | Mostrar métricas al negocio | Tablas gold estables, frescas, con definiciones claras |
| **Analistas** | Responder preguntas nuevas | Datos limpios en silver y gold, documentación, SQL |
| **Científicos de datos y modelos de ML** | Entrenar y predecir | Historia completa, sin fugas del futuro, features reproducibles |
| **Otros sistemas** (reverse ETL, APIs) | Usar datos en la operación: CRM, emails, precios | Datos actualizados con un contrato estable |
| **Reguladores y auditoría** | Verificar números oficiales | Exactitud, trazabilidad y retención |
| **Asistentes de IA generativa** | Responder preguntas en lenguaje natural sobre los datos | Datos bien descritos (nombres, descripciones, métricas definidas) y permisos correctos |

## Las dimensiones de la calidad

| Dimensión | Pregunta | Ejemplo de problema |
|---|---|---|
| **Completitud** | ¿Están todos los datos que deberían? | Clientes sin email |
| **Unicidad** | ¿Cada cosa aparece una sola vez? | El mismo cliente cargado 5 veces |
| **Validez** | ¿Los valores tienen el formato y rango correctos? | Un email sin @, una edad de 230 años |
| **Consistencia** | ¿Lo mismo se escribe igual en todos lados? | "Bogotá", "bogotá" y "BOGOTA" |
| **Frescura** | ¿Los datos están al día? | El tablero muestra datos de anteayer |
| **Exactitud** | ¿Coincide con la realidad o con la fuente? | Las ventas no cuadran con la contabilidad |

## Seguir un número hasta su origen: el linaje

El **linaje** (lineage) es el mapa de qué tabla sale de qué tabla. Cuando un número parece incorrecto, se recorre hacia atrás, mirando el dato en cada paso, hasta encontrar dónde se rompió.

```recorrido
titulo: El caso de los clientes nuevos - del tablero al origen
estacion bi: Tablero | icono=dashboard
estacion gold: Gold | icono=dbt
estacion silver: Silver | icono=spark
estacion bronze: Bronze | icono=bucket
estacion origen: CRM (origen) | icono=salesforce
paso bi: El número sospechoso
El tablero de marketing muestra 243 clientes. El CRM dice 230. Antes de opinar, se mira de dónde sale el número: el catálogo de datos dice que el tablero lee `gold.clientes_nuevos`.
>>> tabla
metrica,tablero,crm,diferencia
clientes,243,230,13
paso gold: Gold cuenta clientes por ID
El modelo gold cuenta `cliente_id` distintos de silver. La lógica es correcta… si silver no tiene problemas. Seguimos hacia atrás.
>>> sql
SELECT COUNT(DISTINCT cliente_id) AS clientes
FROM {{ ref('silver_clientes') }}
paso silver: Silver no deduplica por email
En silver, el mismo cliente aparece con **distintos cliente_id** porque el CRM le asignó uno nuevo cada vez que cambió de canal. Si se cuenta por email normalizado, los números cambian.
>>> tabla
cliente_id,email_normalizado,ciudad
1638,benjamin.torres@gmail.com,Bogotá
2201,benjamin.torres@gmail.com,Bogotá
paso bronze: Bronze muestra el problema de raíz
En bronze se ve todo: el mismo cliente cargado varias veces, con el email y la ciudad escritos de formas distintas, y algunos sin email. La limpieza de silver normalizaba la ciudad, pero no unificaba clientes.
>>> tabla
registro_id,cliente_id,nombre,email,ciudad
2,1638,Benjamín,benjamin.torres@gmail.com,Bogotá
3,1638,BENJAMÍN,BENJAMIN.TORRES@GMAIL.COM,Bogotá
4,1638,Benjamín,benjamin.torres@gmail.com,bogotá
1,524,David,,Ciudad de México
paso origen: La causa y el arreglo
El origen permite crear un cliente nuevo por cada canal sin validar si el email ya existe. El arreglo tiene dos partes: en el pipeline, deduplicar por email normalizado (y documentar la regla); en el origen, pedirle al equipo del CRM que valide duplicados al crear. Y un **test de unicidad** que avise si vuelve a pasar.
>>> sql
-- test: un email normalizado = un cliente
SELECT LOWER(TRIM(email)) AS email, COUNT(DISTINCT cliente_id) AS ids
FROM silver_clientes
WHERE email IS NOT NULL AND TRIM(email) <> ''
GROUP BY 1
HAVING COUNT(DISTINCT cliente_id) > 1;
```

:::nota Los números del recorrido
Los 243 clientes distintos y los 230 emails distintos salen de la tabla `clientes_crudo` del curso; el `cliente_id` 2201 es ilustrativo. Los checks reales los haces tú en los ejercicios.
:::

## Dueños, catálogo y contratos

- Cada tabla importante tiene un **dueño** (un equipo, no una persona) que responde por su calidad y sus cambios.
- Un **catálogo de datos** (Unity Catalog, Microsoft Purview, Dataplex, DataHub) lista las tablas con su descripción, dueño, columnas, linaje y quién puede verlas.
- Un **contrato de datos** es el acuerdo entre quien produce y quien consume: columnas, tipos, significado, frescura y cómo se avisan los cambios.

## Privacidad y seguridad

Los **datos personales** (PII) son los que identifican a una persona: nombre, email, teléfono, documento, dirección, y también combinaciones como fecha de nacimiento + ciudad. Las leyes de protección de datos (GDPR en Europa, LGPD en Brasil, la Ley 1581 en Colombia, la Ley 25.326 en Argentina, entre otras) exigen cuidarlos.

| Práctica | Qué es | Ejemplo |
|---|---|---|
| **Mínimo privilegio** | Cada persona y cada sistema ve solo lo que necesita | El tablero de ventas no necesita emails |
| **Enmascarar** | Mostrar el dato parcialmente | `pa***@gmail.com` |
| **Seudonimizar** | Reemplazar el dato por un identificador | Un hash del email en lugar del email |
| **Minimizar** | No copiar datos personales que nadie usa | El lago no guarda el número de tarjeta |
| **Retención** | Borrar cuando ya no se necesitan o el titular lo pide | Derecho al olvido |

## Práctica

:::ejercicio sql dificultad=Básico titulo="Check de completitud"
Cuenta cuántas filas de `clientes_crudo` no tienen email (nulo o vacío). Columna `sin_email`.
```sql inicial
SELECT COUNT(*) AS sin_email
FROM clientes_crudo
WHERE email IS NULL OR ...;
```
```pista
Además de los nulos, cuenta los vacíos: `TRIM(email) = ''`.
```
```sql solucion
SELECT COUNT(*) AS sin_email FROM clientes_crudo WHERE email IS NULL OR TRIM(email) = '';
```
```explicacion
19 filas sin email. Fíjate en que se revisa `NULL` **y** texto vacío: los dos significan "no hay email", pero SQL los trata distinto.
```
:::

:::ejercicio sql dificultad=Intermedio titulo="Check de unicidad"
Cuenta cuántos `cliente_id` aparecen **más de una vez** en `clientes_crudo`. Columna `clientes_repetidos`.
```sql inicial
SELECT COUNT(*) AS clientes_repetidos
FROM (
  SELECT cliente_id
  FROM clientes_crudo
  GROUP BY cliente_id
  HAVING ...
);
```
```pista
Quédate con los grupos de más de una fila: `HAVING COUNT(*) > 1`.
```
```sql solucion
SELECT COUNT(*) AS clientes_repetidos FROM (SELECT cliente_id FROM clientes_crudo GROUP BY cliente_id HAVING COUNT(*) > 1);
```
```explicacion
106 clientes tienen más de una fila. `GROUP BY … HAVING COUNT(*) > 1` es el check de unicidad más usado de todos.
```
:::

:::ejercicio sql dificultad=Básico titulo="Check de consistencia"
Compara cuántas ciudades distintas hay tal como están escritas (`tal_cual`) y después de normalizar con `LOWER(TRIM(ciudad))` (`normalizadas`).
```sql solucion
SELECT COUNT(DISTINCT ciudad) AS tal_cual, COUNT(DISTINCT LOWER(TRIM(ciudad))) AS normalizadas FROM clientes_crudo;
```
```pista
Dos `COUNT(DISTINCT …)` en la misma consulta: uno sobre `ciudad` y otro sobre `LOWER(TRIM(ciudad))`.
```
```explicacion
42 contra 24: casi la mitad de las "ciudades" son la misma escrita de otra forma. Un tablero por ciudad sin normalizar mostraría "Bogotá" y "bogotá" como dos barras.
```
:::

:::ejercicio sql dificultad=Básico titulo="Emails sin normalizar"
Cuenta los emails que **no** están normalizados: los que cambian al aplicarles `LOWER(TRIM(email))`. Columna `sin_normalizar`.
```sql solucion
SELECT COUNT(*) AS sin_normalizar FROM clientes_crudo WHERE email <> LOWER(TRIM(email));
```
```pista
`WHERE email <> LOWER(TRIM(email))`.
```
:::

:::ejercicio sql ordenado dificultad=Intermedio titulo="Enmascarar emails"
Muestra `cliente_id`, `nombre` y el email **enmascarado** de los clientes 1 a 5 de `clientes`: las dos primeras letras, `***` y todo desde la `@`. Usa `substr(email, 1, 2) || '***' || substr(email, instr(email, '@'))`. Ordena por `cliente_id`.
```sql inicial
SELECT cliente_id, nombre,
       substr(email, 1, 2) || '***' || ... AS email_enmascarado
FROM clientes
WHERE cliente_id <= 5
ORDER BY cliente_id;
```
```pista
La parte final es todo desde la `@`: `substr(email, instr(email, '@'))`.
```
```sql solucion
SELECT cliente_id, nombre, substr(email, 1, 2) || '***' || substr(email, instr(email, '@')) AS email_enmascarado
FROM clientes
WHERE cliente_id <= 5
ORDER BY cliente_id;
```
```explicacion
`||` concatena textos, `substr` corta y `instr` busca la posición de la `@`. En las plataformas reales esto se hace con **máscaras de columna** (Unity Catalog, Snowflake, BigQuery): la misma consulta muestra el email completo a quien tiene permiso y enmascarado al resto.
```
:::

:::ejercicio quiz dificultad=Básico
"Bogotá", "bogotá" y "BOGOTA" en la misma columna es un problema de…

- [ ] Frescura
- [ ] Completitud
- [x] Consistencia
- [ ] Exactitud
:::

:::ejercicio quiz dificultad=Básico
¿Para qué sirve el **linaje** en un incidente de datos?

- [ ] Para saber cuánto cuesta cada tabla
- [x] Para recorrer hacia atrás de qué tablas sale un número hasta encontrar dónde se rompió
- [ ] Para darle permisos a los usuarios
- [ ] Para comprimir los archivos del lago
:::

:::ejercicio quiz dificultad=Intermedio
El equipo de ventas pide acceso a la tabla de clientes para un tablero de ventas por ciudad. ¿Qué haces?

- [ ] Les das acceso a toda la tabla, con emails y teléfonos
- [x] Les das una vista con ciudad y métricas, sin datos personales (mínimo privilegio)
- [ ] Les mandas un Excel con todos los datos por email
- [ ] Les dices que no se puede
:::

:::ejercicio quiz dificultad=Intermedio
¿Qué necesita especialmente un **modelo de machine learning** de los datos con los que se entrena?

- [ ] Que estén en Excel
- [ ] Que tengan colores en el tablero
- [x] Historia completa y que cada dato use solo información disponible en su fecha (sin fugas del futuro)
- [ ] Que sean pocos para entrenar rápido
:::

:::ejercicio quiz dificultad=Básico
¿Cuál de estos es un **dato personal**?

- [ ] La cantidad de pedidos por país
- [x] El email de un cliente
- [ ] El precio de un producto
- [ ] El nombre de una categoría
:::

:::errores
- **Arreglar el número en el tablero**: un filtro "a mano" en el BI esconde el problema y otro tablero mostrará el número viejo. Se arregla en el pipeline, lo más cerca del origen posible.
- **Copiar datos personales "por si acaso"**: cada copia es un riesgo y una obligación legal.
- **Tablas sin dueño**: cuando se rompen, nadie sabe a quién avisar.
- **Checks que nadie mira**: un test que falla en silencio es igual a no tener test.
:::

## Resumen del viaje

```diagrama
titulo: El viaje completo, con lo que cuida cada parte
nodo o: Origen | icono=movil | col=0 | fila=0 | sub=apps, bases, APIs
nodo m: Movimiento | icono=airflow | col=1 | fila=0 | sub=batch o streaming\nETL / ELT
nodo a: Almacenamiento | icono=delta | col=2 | fila=0 | sub=lago, warehouse\nbronze, silver, gold
nodo u: Uso | icono=dashboard | col=3 | fila=0 | sub=BI, analistas, ML, CRM
nodo c: Calidad, linaje, dueños y privacidad | icono=escudo | col=1 | fila=1 | color=verde | ancho=420
flecha o -> m
flecha m -> a
flecha a -> u
flecha c -- a: cuida todo el camino | estilo=punteada
```

Con estas cinco lecciones tienes el mapa completo. Las siguientes de Fundamentos te dan las herramientas para empezar a recorrerlo: **formatos de datos**, **la terminal** y **Git**.
