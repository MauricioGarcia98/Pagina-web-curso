---
titulo: Fechas, zonas horarias y codificación - los bugs que aparecen dos veces al año
nivel: Avanzado
duracion: 55
resumen: Los errores más traicioneros de los datos - ventas que se cambian de día por mezclar UTC y hora local, el cambio de horario que crea días de 23 y 25 horas y horas ambiguas que pisan claves primarias, el BOM que renombra la primera columna de un CSV y el mojibake (Ã¡ en vez de á) por leer UTF-8 como Latin-1.
objetivos: Explicar por qué un total diario cambia según se agrupe por fecha UTC o local | Convertir horas locales a UTC con el desplazamiento de cada zona | Detectar los días de 25 horas y las horas ambiguas del cambio de horario | Diagnosticar un BOM y un mojibake con la terminal | Reparar texto con mojibake en SQL
prerrequisitos: incidentes-datos-tardios-y-backfills
autoevaluacion: ¿Sabes por qué conviene guardar los timestamps en UTC? | ¿Sabes qué pasa con una clave (sensor, hora_local) cuando se atrasa el reloj? | ¿Sabes qué es un BOM y cómo afecta al encabezado de un CSV? | ¿Sabes reconocer un mojibake y su causa? | ¿Sabes agrupar ventas por el día local de cada tienda?
---

:::escenario
Lunes 2 de noviembre. Tres tickets a la vez: (1) "las ventas del domingo de la tienda de Bogotá no coinciden con la caja" (2) "el reporte de sensores de Nueva York perdió casi dos mil lecturas el domingo" y (3) "en el tablero aparece **BogotÃ¡**". Los tres tienen la misma raíz: las fechas y los textos no son tan simples como parecen.
:::

## La idea en una frase

Un timestamp sin zona horaria es **ambiguo** y un texto sin codificación declarada es **una apuesta**. La regla de oro: guarda en **UTC** (o con su desplazamiento), convierte a hora local **solo al mostrar o agrupar para el negocio**, y lee y escribe texto en **UTF-8** declarado.

## UTC y hora local

| Concepto | Ejemplo |
|---|---|
| **UTC** | El reloj de referencia mundial, sin cambios de horario |
| **Desplazamiento** (offset) | Bogotá es UTC−5 todo el año; Nueva York es UTC−4 en verano (EDT) y UTC−5 en invierno (EST) |
| **Zona IANA** | `America/Bogota`, `America/New_York`: el nombre que conoce las reglas de cada país, incluidos los cambios de horario históricos. Se usa este nombre, no un desplazamiento fijo |

Una venta de las 21:30 del sábado en Bogotá es las **02:30 del domingo en UTC**. Si el reporte agrupa por `date(ts_utc)`, esa venta aparece el domingo y la caja de la tienda (que cierra el sábado) no coincide.

## El cambio de horario

```diagrama
titulo: 1 de noviembre de 2026 en Nueva York - la hora que ocurre dos veces
nodo a: 00:59 EDT | icono=reloj | col=0 | fila=0 | sub=04:59 UTC
nodo b: 01:30 EDT | icono=reloj | col=1 | fila=0 | sub=05:30 UTC | color=amarillo
nodo c: 01:59 EDT → 01:00 EST | icono=reloj | col=2 | fila=0 | sub=06:00 UTC: el reloj se atrasa | color=naranja
nodo d: 01:30 EST | icono=reloj | col=3 | fila=0 | sub=06:30 UTC | color=amarillo
nodo e: Misma hora local, dos instantes | icono=alerta | col=2 | fila=1 | color=rojo | sub=(sensor, ts_local) choca
flecha a -> b
flecha b -> c
flecha c -> d
flecha b -> e: estilo=punteada
flecha d -> e: estilo=punteada
```

- Cuando el reloj **se atrasa** (fin del horario de verano), una hora local ocurre **dos veces** y ese día tiene **25 horas**. Una clave primaria `(sensor_id, ts_local)` choca, y un `ON CONFLICT DO NOTHING` descarta en silencio la segunda lectura.
- Cuando el reloj **se adelanta**, una hora local **no existe** y el día tiene **23 horas**: un job programado a las 02:30 hora local no corre ese día (o corre dos veces el otro).
- Los países cambian sus reglas (México eliminó el horario de verano en 2022): por eso se usan zonas IANA actualizadas y no tablas de desplazamientos escritas a mano.

:::tip Airflow y las zonas horarias
Airflow trabaja en UTC por dentro. Si programas un DAG con `schedule="0 2 * * *"` y `start_date` con `tz="America/New_York"`, Airflow respeta el cambio de horario. Si lo programas en UTC, a las 02:00 UTC corre siempre, pero eso es las 22:00 o las 21:00 de Nueva York según la época del año.
:::

## Codificación: BOM y mojibake

| Problema | Qué es | Síntoma |
|---|---|---|
| **BOM** (Byte Order Mark) | Tres bytes invisibles (`EF BB BF`) que Excel y algunos programas de Windows ponen al principio de un archivo UTF-8 | La primera columna se llama `﻿venta_id` en lugar de `venta_id`: `KeyError`, "column not found", o un join por esa columna que no encuentra nada |
| **Mojibake** | Texto UTF-8 leído como Latin-1 (o Windows-1252) y guardado otra vez | `BogotÃ¡`, `MedellÃ­n`, `SÃ£o Paulo` |
| **CRLF** | Fin de línea de Windows (`\r\n`) | La última columna termina con `\r`: `'ENTREGADO\r' != 'ENTREGADO'` |

Cómo diagnosticarlos: `file archivo.csv` dice la codificación y si hay BOM o CRLF; `head -c 3 archivo | xxd` muestra los bytes del BOM. Cómo arreglarlos: leer con `encoding="utf-8-sig"` en Python (descarta el BOM), `iconv -f latin1 -t utf-8` para convertir, `sed -i '1s/^\xEF\xBB\xBF//'` para quitar el BOM. Y siempre que se pueda, **reprocesar desde el archivo crudo** con la codificación correcta en vez de "arreglar" el texto ya dañado.

## Práctica

:::ejercicio cli dificultad=Básico titulo="Preparar el incidente"
Prepara los archivos del incidente `zonas`.
```respuesta
incidente-preparar zonas
```
:::

:::ejercicio cli dificultad=Básico titulo="¿Qué tiene el archivo?"
Usa el comando `file` sobre `~/incidentes/zonas/ventas_tienda.csv` para ver su codificación.
```setup
incidente-preparar zonas
```
```respuesta
file \S*ventas_tienda\.csv
```
```solucion
file ~/incidentes/zonas/ventas_tienda.csv
```
:::

:::ejercicio quiz dificultad=Intermedio
`file` dice *UTF-8 (with BOM)*. Un script hace `pd.read_csv("ventas_tienda.csv", encoding="utf-8")` y después `df["venta_id"]`. ¿Qué pasa?

- [ ] Funciona: pandas siempre ignora el BOM
- [x] Falla con `KeyError: 'venta_id'`: la primera columna se llama `﻿venta_id`. Se corrige leyendo con `encoding="utf-8-sig"`
- [ ] pandas convierte el archivo a Latin-1
- [ ] Se pierde la primera fila de datos
:::

:::ejercicio cli dificultad=Intermedio titulo="Contar las filas con mojibake"
Cuenta cuántas líneas de `~/incidentes/zonas/ventas_tienda.csv` contienen el carácter `Ã` (la firma del mojibake).
```setup
incidente-preparar zonas
```
```respuesta
grep -c ['"]?Ã['"]? \S*ventas_tienda\.csv
grep ['"]?Ã['"]? \S*ventas_tienda\.csv \| wc -l
```
```solucion
grep -c "Ã" ~/incidentes/zonas/ventas_tienda.csv
```
```explicacion
10 filas, todas al final del archivo: alguien abrió el archivo con la codificación equivocada, agregó filas y lo volvió a guardar. Las primeras filas están bien y las nuevas, dañadas: por eso un check sobre "la primera muestra" no lo detecta.
```
:::

:::ejercicio cli dificultad=Avanzado titulo="Ventas por día local"
La columna 3 (`ts_local`) tiene fecha y hora local. Con `awk`, cuenta las ventas por **fecha** (los primeros 10 caracteres de `ts_local`, con `substr($3, 1, 10)`), saltando el encabezado.
```setup
incidente-preparar zonas
```
```respuesta
awk -F ?['"]?,['"]? .*substr\(\$3, ?1, ?10\).* \S*ventas_tienda\.csv.*
cut -d ?['"]?,['"]? -f ?3 \S*ventas_tienda\.csv \| cut -c ?1-10 \| sort \| uniq -c
```
```solucion
awk -F, 'NR>1 {c[substr($3, 1, 10)]++} END {for (d in c) print d, c[d]}' ~/incidentes/zonas/ventas_tienda.csv
```
```pista
`c[substr($3, 1, 10)]++` suma 1 en la posición de la fecha. Al final, recorre el arreglo con `for (d in c)`.
```
:::

:::ejercicio quiz dificultad=Avanzado
Lee `~/incidentes/zonas/logs/carga_nyc.log`. ¿Por qué se "perdieron" 1.882 lecturas?

- [ ] El archivo de origen venía incompleto
- [ ] El cambio de horario borró una hora de datos
- [x] Entre la 01:00 y las 02:00 locales hubo dos lecturas por sensor con la misma hora local; la clave `(sensor_id, ts_local)` chocó y `ON CONFLICT DO NOTHING` descartó la segunda en silencio
- [ ] El job corrió dos veces y se deduplicó
:::

:::ejercicio sql ordenado dificultad=Intermedio titulo="El mismo día, dos totales"
`ventas_bog(venta_id, ts_utc, monto)` guarda las ventas de la tienda de Bogotá (UTC−5, sin horario de verano) en UTC. Para los días `2026-10-27`, `2026-10-28` y `2026-10-29`, devuelve `dia`, `por_utc` (ventas agrupando por la fecha UTC) y `por_local` (agrupando por la fecha local: `date(ts_utc, '-5 hours')`).
```sql setup
CREATE TABLE ventas_bog (venta_id INTEGER PRIMARY KEY, ts_utc TEXT, monto REAL);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 96)
INSERT INTO ventas_bog SELECT i, datetime('2026-10-27 00:00', '+' || (i * 45) || ' minutes'), 10 + i % 7 FROM n;
```
```sql solucion
WITH dias(dia) AS (VALUES ('2026-10-27'), ('2026-10-28'), ('2026-10-29'))
SELECT d.dia,
       (SELECT COUNT(*) FROM ventas_bog WHERE date(ts_utc) = d.dia) AS por_utc,
       (SELECT COUNT(*) FROM ventas_bog WHERE date(ts_utc, '-5 hours') = d.dia) AS por_local
FROM dias d
ORDER BY d.dia;
```
```pista
`date(ts_utc, '-5 hours')` convierte a la fecha local de Bogotá. Calcula los dos conteos con subconsultas para cada día.
```
```explicacion
Los totales difieren en las ventas de las últimas 5 horas de cada día local. El negocio (y la caja de la tienda) piensa en el día **local**: los reportes de ventas se agrupan por la fecha local de cada tienda, aunque los datos se guarden en UTC.
```
:::

:::ejercicio sql ordenado dificultad=Avanzado titulo="Hora local a UTC por tienda"
`ventas_local(venta_id, tienda, ts_local)` tiene horas locales de varias tiendas y `zonas_tienda(tienda, offset_horas)` el desplazamiento de cada una (−5 para Bogotá, −6 para Ciudad de México, −3 para São Paulo). Devuelve `venta_id`, `tienda` y `ts_utc` (= hora local − desplazamiento), ordenado por `venta_id`.
```sql setup
CREATE TABLE zonas_tienda (tienda TEXT PRIMARY KEY, offset_horas INTEGER);
INSERT INTO zonas_tienda VALUES ('Bogotá', -5), ('Ciudad de México', -6), ('São Paulo', -3);
CREATE TABLE ventas_local (venta_id INTEGER PRIMARY KEY, tienda TEXT, ts_local TEXT);
INSERT INTO ventas_local VALUES (1, 'Bogotá', '2026-10-31 21:30:00'), (2, 'Ciudad de México', '2026-10-31 23:10:00'), (3, 'São Paulo', '2026-11-01 00:20:00'), (4, 'Bogotá', '2026-11-01 08:00:00');
```
```sql solucion
SELECT v.venta_id, v.tienda,
       datetime(v.ts_local, (-z.offset_horas) || ' hours') AS ts_utc
FROM ventas_local v
JOIN zonas_tienda z ON z.tienda = v.tienda
ORDER BY v.venta_id;
```
```pista
Para pasar de local a UTC se **resta** el desplazamiento: con −5, se suman 5 horas. En SQLite: `datetime(ts_local, (-offset_horas) || ' hours')`.
```
```explicacion
Las ventas 1 y 2 son del 31/10 en su hora local y del 1/11 en UTC. Una tabla de desplazamientos fijos sirve solo para zonas sin cambio de horario; en producción se usa la zona IANA y una función del motor (`CONVERT_TIMEZONE` en Snowflake, `AT TIME ZONE` en Postgres y SQL Server, `from_utc_timestamp` en Spark).
```
:::

:::ejercicio sql ordenado dificultad=Experto titulo="El día de 25 horas"
`lecturas_ny(ts_utc)` tiene una lectura por hora en UTC. En Nueva York el 1/11/2026 a las 06:00 UTC el reloj se atrasa: antes de ese instante la hora local es UTC−4 y desde ese instante es UTC−5. Cuenta cuántas lecturas (horas) tiene cada **día local**. Columnas `dia_local` y `horas`, ordenadas.
```sql setup
CREATE TABLE lecturas_ny (ts_utc TEXT PRIMARY KEY);
WITH RECURSIVE n(i) AS (SELECT 0 UNION ALL SELECT i + 1 FROM n WHERE i < 35)
INSERT INTO lecturas_ny SELECT datetime('2026-11-01 00:00', '+' || i || ' hours') FROM n;
```
```sql solucion
SELECT date(ts_utc, CASE WHEN ts_utc < '2026-11-01 06:00:00' THEN '-4 hours' ELSE '-5 hours' END) AS dia_local,
       COUNT(*) AS horas
FROM lecturas_ny
GROUP BY dia_local
ORDER BY dia_local;
```
```pista
El desplazamiento depende del instante: `CASE WHEN ts_utc < '2026-11-01 06:00:00' THEN '-4 hours' ELSE '-5 hours' END`.
```
```explicacion
El 1/11 local tiene 25 lecturas: es correcto, ese día duró 25 horas. Un check de completitud que espera "24 horas por día" fallaría ese día y otro, en marzo, cuando el día tiene 23. Los checks de completitud se calculan en UTC o con la duración real del día local.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="Las claves que chocan"
`lecturas_local(sensor_id, ts_local, valor)` se cargó guardando solo la hora local de Nueva York. Devuelve los pares `(sensor_id, ts_local)` que aparecen **más de una vez** y cuántas veces (`veces`), ordenados por sensor y hora.
```sql setup
CREATE TABLE lecturas_local (sensor_id INTEGER, ts_local TEXT, valor REAL);
WITH RECURSIVE n(i) AS (SELECT 0 UNION ALL SELECT i + 1 FROM n WHERE i < 35),
s(sensor_id) AS (VALUES (1), (2), (3))
INSERT INTO lecturas_local
SELECT sensor_id,
       datetime('2026-11-01 00:00', '+' || i || ' hours', CASE WHEN i < 6 THEN '-4 hours' ELSE '-5 hours' END),
       20 + (i * sensor_id) % 7
FROM n, s;
```
```sql solucion
SELECT sensor_id, ts_local, COUNT(*) AS veces
FROM lecturas_local
GROUP BY sensor_id, ts_local
HAVING COUNT(*) > 1
ORDER BY sensor_id, ts_local;
```
```pista
Agrupa por la clave que se usó y quédate con `HAVING COUNT(*) > 1`.
```
```explicacion
La 01:00 local de cada sensor aparece dos veces: una en EDT y otra en EST. Con la clave `(sensor_id, ts_utc)` no habría choque. Si el origen solo manda hora local, hay que pedirle el desplazamiento (`2026-11-01T01:30:00-05:00`) o la zona.
```
:::

:::ejercicio sql ordenado dificultad=Intermedio titulo="Reparar el mojibake"
En `tiendas_crudo(tienda)` algunos nombres tienen mojibake. Reemplaza `Ã¡` por `á`, `Ã©` por `é` y `Ã£` por `ã`, y devuelve `tienda_ok` y cuántas filas tiene cada nombre ya corregido (`filas`), ordenado por `tienda_ok`.
```sql setup
CREATE TABLE tiendas_crudo (tienda TEXT);
INSERT INTO tiendas_crudo VALUES ('Bogotá'), ('BogotÃ¡'), ('BogotÃ¡'), ('São Paulo'), ('SÃ£o Paulo'), ('José C. Paz'), ('JosÃ© C. Paz'), ('Ciudad de México');
```
```sql solucion
SELECT REPLACE(REPLACE(REPLACE(tienda, 'Ã¡', 'á'), 'Ã©', 'é'), 'Ã£', 'ã') AS tienda_ok, COUNT(*) AS filas
FROM tiendas_crudo
GROUP BY tienda_ok
ORDER BY tienda_ok;
```
```pista
Anida `REPLACE`: `REPLACE(REPLACE(REPLACE(tienda, 'Ã¡', 'á'), 'Ã©', 'é'), 'Ã£', 'ã')`.
```
```explicacion
Esto sirve para un arreglo puntual y conocido. La solución de fondo es encontrar el paso que leyó con la codificación equivocada y reprocesar desde el crudo: los mojibakes con otros caracteres (`Ã±` por `ñ`, `Ã³` por `ó`…) son muchos y algunos usan caracteres invisibles.
```
:::

:::ejercicio quiz dificultad=Avanzado
¿Cuál es la mejor forma de guardar el momento de un evento en una tabla de hechos?

- [ ] Texto con la hora local de la tienda, sin zona
- [ ] La hora local y una columna con el desplazamiento fijo de la tienda
- [x] Un timestamp en UTC (o con zona: `TIMESTAMP WITH TIME ZONE` / `TIMESTAMP_TZ`) y, si el negocio lo necesita, la zona IANA de la tienda para calcular el día local
- [ ] Un entero con la cantidad de segundos desde la apertura de la tienda
:::

:::errores
- **Agrupar ventas por `date(ts_utc)`**: el día del negocio es el local de cada tienda o usuario.
- **Desplazamientos fijos para zonas con horario de verano**: dos veces al año los datos se corren una hora.
- **Claves con hora local**: chocan en el día de 25 horas y dejan un hueco en el de 23.
- **Programar jobs en una hora local que no existe**: las 02:30 del día que se adelanta el reloj.
- **"Arreglar" el mojibake sin encontrar dónde se produjo**: vuelve con el próximo archivo.
- **Abrir y guardar CSV con Excel en el medio del pipeline**: agrega BOM, cambia separadores y formatos de fecha.
:::

:::trabajo
- Las tablas de hechos guardan `*_ts_utc` y, si hace falta, la zona del lugar (`tienda.zona = 'America/Bogota'`); las vistas para el negocio calculan `fecha_local`.
- Todos los servidores, contenedores y bases trabajan en UTC (`TZ=UTC`), y la conversión es explícita en el código.
- Los contratos de archivos dicen codificación (UTF-8 sin BOM), separador, fin de línea, formato de fecha (ISO 8601 con zona: `2026-11-01T01:30:00-05:00`) y separador decimal.
- Se agregan pruebas con fechas de cambio de horario (el último domingo de octubre en Europa, el primero de noviembre en EE. UU.) a los tests del pipeline.
:::

:::entrevista
**"¿Qué problemas pueden aparecer con las zonas horarias en un pipeline?"** Agrupar por fecha UTC en lugar de la local; días de 23 y 25 horas; horas ambiguas que rompen claves; jobs programados en horas que no existen; desplazamientos fijos para zonas con horario de verano. Y la solución: almacenar en UTC con zona, convertir con zonas IANA al presentar y probar los días de cambio.
:::

## Resumen

| Síntoma | Causa | Corrección |
|---|---|---|
| Totales diarios que no coinciden con la caja | Agrupación por fecha UTC | Agrupar por fecha local |
| Lecturas perdidas o duplicadas una vez al año | Clave con hora local + cambio de horario | Clave en UTC, guardar desplazamiento |
| Primera columna "no existe" | BOM | `utf-8-sig`, quitar el BOM |
| `BogotÃ¡` | UTF-8 leído como Latin-1 | Reprocesar con la codificación correcta |
