---
titulo: Perfilar una tabla antes de usarla
nivel: Intermedio
duracion: 50
resumen: Antes de transformar una tabla nueva, la perfilas - cuántas filas y cuántas claves distintas tiene, qué columnas traen nulos, qué valores aparecen escritos de varias formas, en cuántos formatos llegan las fechas y desde cuándo cambió el esquema. Cada hallazgo del perfil se convierte después en una regla de calidad. Practicas sobre la capa bronze real de la tienda.
objetivos: Medir filas, claves distintas, duplicados y nulos de una tabla en una sola consulta | Listar los valores distintos de una columna para encontrar variantes de escritura | Clasificar formatos de fecha y JSON inválidos con GLOB y json_valid | Fechar un cambio de esquema buscando la primera aparición de una columna o un valor | Convertir cada hallazgo del perfil en una regla escrita
prerrequisitos: sql-capa-bronze | sql-agregaciones
autoevaluacion: ¿Qué cinco números miras primero de una tabla nueva? | ¿Cómo encuentras las variantes de escritura de un valor? | ¿Por qué json_extract puede romper una consulta entera? | ¿Cómo sabes desde cuándo llega una columna nueva?
---

:::analogia En palabras simples
Antes de cocinar con ingredientes que te mandó un proveedor nuevo, abres las cajas y miras: cuántos hay, si alguno está roto, si las etiquetas coinciden con lo pedido. Perfilar es eso con una tabla: mirar **antes** de usar, en lugar de descubrir los problemas cuando el tablero ya muestra un número raro.
:::

## Los cinco números de cualquier tabla nueva

| Número | Consulta | Qué te dice |
|---|---|---|
| Filas | `COUNT(*)` | El tamaño, y si coincide con lo que dice el origen |
| Claves distintas | `COUNT(DISTINCT clave)` | Si la clave es realmente única |
| Duplicados | `COUNT(*) - COUNT(DISTINCT clave)` | Cuántas filas sobran |
| Nulos por columna | `SUM(CASE WHEN col IS NULL THEN 1 ELSE 0 END)` | Qué columnas no son confiables |
| Rango | `MIN(col)`, `MAX(col)` | Fechas imposibles, montos negativos, el período que cubre |

`COUNT(col)` cuenta los valores **no nulos**, así que `COUNT(*) - COUNT(col)` también da los nulos.

## Valores distintos: las variantes de escritura

Para una columna con pocos valores posibles (estado, moneda, canal), lista los distintos con su conteo. Las variantes aparecen solas: `USD`, `usd`, ` USD` (con un espacio adelante). Para verlas, ayuda mostrar el largo: `LENGTH(moneda)` delata los espacios.

## Formatos y estructuras

| Problema | Cómo detectarlo en SQLite |
|---|---|
| Fechas en varios formatos | `fecha GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'` y patrones parecidos |
| JSON cortado o inválido | `json_valid(payload) = 0` |
| Números guardados como texto | `monto GLOB '*[^0-9.]*'` (tiene algo que no es dígito ni punto) |

:::cuidado json_extract sobre un JSON roto
En SQLite, `json_extract` sobre un texto que no es JSON válido **lanza un error y frena toda la consulta**. Protégelo: `CASE WHEN json_valid(payload) THEN json_extract(payload, '$.v') END`. En Spark, `from_json` en modo `PERMISSIVE` devuelve nulos en lugar de fallar, que es lo mismo pensado de otra forma.
:::

## Del perfil a las reglas

El perfil no es el entregable: lo son las **reglas** que salen de él. Cada hallazgo se escribe como una regla verificable, que en la lección siguiente se convierte en una prueba.

| Hallazgo del perfil | Regla |
|---|---|
| 106 filas con `pedido_id` repetido | "En silver, `pedido_id` es único: la carga más reciente gana" |
| 3 variantes de `moneda` | "`moneda` se normaliza con `UPPER(TRIM())` y debe ser `USD`" |
| 82 montos nulos | "Monto nulo va a cuarentena, no a silver" |
| Fechas en 3 formatos | "Toda fecha se convierte a `AAAA-MM-DD`; la que no se pueda convertir, a cuarentena" |

:::practica sql El perfil completo de bronze_pedidos
1. Ejecuta: verás los cinco números de la tabla en una sola fila.
2. Ejecuta la segunda consulta: los valores distintos de `moneda` con su largo. ¿Cuál tiene un espacio?
3. Agrega a la primera consulta el rango de `cargado_en` (`MIN` y `MAX`) para saber qué período cubre.

```sql
SELECT COUNT(*) AS filas,
       COUNT(DISTINCT pedido_id) AS pedidos,
       COUNT(*) - COUNT(DISTINCT pedido_id) AS duplicados,
       COUNT(*) - COUNT(monto) AS montos_nulos,
       COUNT(*) - COUNT(cliente_email) AS emails_nulos
FROM bronze_pedidos;

SELECT moneda, LENGTH(moneda) AS largo, COUNT(*) AS filas
FROM bronze_pedidos
GROUP BY moneda
ORDER BY filas DESC;
```

Reto: haz lo mismo con `estado` y cuenta cuántas formas distintas hay de escribir "entregado".

Documentación oficial: [Funciones de agregación (SQLite)](https://www.sqlite.org/lang_aggfunc.html) · [Funciones JSON (SQLite)](https://www.sqlite.org/json1.html) · [GLOB (SQLite)](https://www.sqlite.org/lang_expr.html#the_like_glob_regexp_match_and_extract_operators)
:::

:::errores
- **Perfilar con una muestra de 10 filas.** Los problemas raros (el 1 %) no aparecen en las primeras filas.
- **Confundir `COUNT(*)` con `COUNT(col)`.** El segundo no cuenta nulos.
- **No guardar el perfil.** El perfil de hoy es la línea base para detectar cambios mañana.
- **Arreglar sin anotar la regla.** Si el arreglo no queda escrito como regla y prueba, el problema vuelve.
:::

:::entrevista
**Pregunta:** "Te dan acceso a una tabla que nunca viste y te piden un número para mañana. ¿Qué haces?"

**Respuesta modelo:** "Antes de calcular, la perfilo en diez minutos: filas, si la clave es única, nulos de las columnas que voy a usar, rango de fechas y valores distintos de las columnas de filtro. Si encuentro duplicados o variantes, lo digo junto con el número y explico qué supuesto usé. Un número con sus supuestos escritos vale más que un número limpio que nadie puede verificar."
:::

## Ejercicios

:::ejercicio sql dificultad=Intermedio titulo="Los cinco números de bronze_pedidos"
Devuelve una fila con el perfil de `bronze_pedidos`. Columnas: `filas`, `pedidos` (distintos), `duplicados` (filas de más), `montos_nulos`, `emails_nulos`.
```sql solucion
SELECT COUNT(*) AS filas,
       COUNT(DISTINCT pedido_id) AS pedidos,
       COUNT(*) - COUNT(DISTINCT pedido_id) AS duplicados,
       COUNT(*) - COUNT(monto) AS montos_nulos,
       COUNT(*) - COUNT(cliente_email) AS emails_nulos
FROM bronze_pedidos;
```
```pista
`COUNT(col)` no cuenta nulos: `COUNT(*) - COUNT(monto)` son los montos nulos.
```
:::

:::ejercicio sql dificultad=Intermedio titulo="Variantes de la moneda"
Lista cada valor distinto de `moneda` tal como llega, con su largo, cuántas filas tiene y si es válido (`1` si es exactamente `'USD'`, `0` si no). Columnas: `moneda`, `largo`, `filas`, `valida`.
```sql solucion
SELECT moneda, LENGTH(moneda) AS largo, COUNT(*) AS filas,
       CASE WHEN moneda = 'USD' THEN 1 ELSE 0 END AS valida
FROM bronze_pedidos
GROUP BY moneda;
```
```pista
`LENGTH(moneda)` delata los espacios: `' USD'` tiene largo 4.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="Formatos de fecha en bronze"
Clasifica la columna `fecha` de `bronze_pedidos` en formatos y cuenta las filas de cada uno: `AAAA-MM-DD` (exactamente 10 caracteres de fecha), `ISO con zona` (contiene una `T` y termina en `Z`), `DD/MM/AAAA HH:MM` (empieza con dos dígitos y una barra) y `otro`. Columnas: `formato`, `filas`.
```sql solucion
SELECT CASE
         WHEN fecha GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' THEN 'AAAA-MM-DD'
         WHEN fecha GLOB '*T*Z' THEN 'ISO con zona'
         WHEN fecha GLOB '[0-9][0-9]/[0-9][0-9]/*' THEN 'DD/MM/AAAA HH:MM'
         ELSE 'otro'
       END AS formato,
       COUNT(*) AS filas
FROM bronze_pedidos
GROUP BY 1;
```
```pista
`GLOB` usa `*` para "cualquier cosa" y `[0-9]` para un dígito, y distingue mayúsculas.
```
```pista
Los 12 que caen en `otro` son los pedidos de prueba de QA, con fecha y hora: mira cuáles son con un `WHERE`.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="Eventos con JSON cortado"
Lista los eventos de `bronze_eventos_app` cuyo `payload` no es un JSON válido. Columnas: `evento_id`, `recibido_en`, `largo` (largo del payload).
```sql solucion
SELECT evento_id, recibido_en, LENGTH(payload) AS largo
FROM bronze_eventos_app
WHERE json_valid(payload) = 0;
```
```pista
`json_valid(texto)` devuelve 1 si el texto es JSON válido y 0 si no.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="Versión del formato por mes"
Cuenta los eventos de `bronze_eventos_app` por mes de `recibido_en` y por versión del formato (el campo `v` del JSON). Los JSON inválidos deben aparecer con versión `NULL` **sin que la consulta falle**. Columnas: `mes` (`AAAA-MM`), `v`, `eventos`.
```sql solucion
SELECT substr(recibido_en, 1, 7) AS mes,
       CASE WHEN json_valid(payload) THEN json_extract(payload, '$.v') END AS v,
       COUNT(*) AS eventos
FROM bronze_eventos_app
GROUP BY 1, 2;
```
```pista
`json_extract` sobre un JSON roto frena toda la consulta: envuélvelo en `CASE WHEN json_valid(payload) THEN ... END`.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="¿Desde cuándo cambió el esquema?"
En `bronze_pedidos` aparecieron dos cambios: la columna `cupon` empezó a traer valores y apareció el estado `en_disputa`. Devuelve una fila con la **primera carga** (`cargado_en`) de cada cambio. Columnas: `primer_cupon`, `primera_disputa`.
```sql solucion
SELECT (SELECT MIN(cargado_en) FROM bronze_pedidos WHERE cupon IS NOT NULL) AS primer_cupon,
       (SELECT MIN(cargado_en) FROM bronze_pedidos WHERE estado = 'en_disputa') AS primera_disputa;
```
```pista
Dos subconsultas escalares con `MIN(cargado_en)` y un filtro cada una, en un mismo `SELECT`.
```
:::
