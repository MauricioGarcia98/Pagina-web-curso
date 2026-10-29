---
titulo: APIs, credenciales y costos - el extractor que dijo OK y la consulta de miles de dólares
nivel: Avanzado
duracion: 55
resumen: Tres incidentes de la vida real - un extractor de una API que recibe 429 (demasiadas peticiones), reintenta mal, se salta páginas, pierde el token a mitad de camino y termina en "Fin OK" con un tercio de los datos; secretos que vencen y que pertenecían a alguien que ya no está; y un tablero que escanea 4 TB cada 15 minutos. Reconciliación, reintentos con backoff, identidades de servicio y control de costos.
objetivos: Reconocer en un log de extracción los errores 429 y 401 y sus consecuencias | Reconciliar lo cargado contra el total que informa el origen | Calcular una política de reintentos con backoff exponencial y tope | Encontrar los secretos que vencen pronto y explicar por qué no deben depender de una persona | Calcular el costo de las consultas y encontrar las que más gastan
prerrequisitos: incidentes-monitoreo-y-checks
autoevaluacion: ¿Sabes qué significan los códigos HTTP 429 y 401 para un extractor? | ¿Sabes qué es Retry-After y el backoff exponencial con jitter? | ¿Sabes reconciliar una extracción contra el total del origen? | ¿Sabes por qué un pipeline no debe usar credenciales personales? | ¿Sabes calcular el costo de una consulta en un warehouse que cobra por datos escaneados?
---

:::escenario
El equipo comercial dice que en el CRM hay 21.480 contactos actualizados ayer, pero en el warehouse aparecen 14.500. El extractor terminó con **Fin OK**. Mientras lo investigas, Finanzas te reenvía la factura de BigQuery de octubre: **el triple** que septiembre.
:::

## La idea en una frase

Un extractor confiable **falla fuerte** cuando no pudo traer todo y **demuestra** que trajo todo cuando termina. Los dos incidentes de esta lección vienen de lo contrario: errores que se convierten en "seguir adelante" y nadie que compare lo cargado con lo que había.

## Los códigos HTTP que importan

| Código | Significado | Qué hacer |
|---|---|---|
| **429** Too Many Requests | Superaste el límite de peticiones (rate limit) | Esperar lo que dice el encabezado `Retry-After`; si no lo hay, backoff exponencial con jitter |
| **401** Unauthorized | Credencial inválida o vencida | Renovar el token (OAuth: refresh token) y reintentar **una** vez; si sigue, fallar |
| **403** Forbidden | La credencial no tiene permiso | Fallar y avisar: reintentar no sirve |
| **5xx** | Error del servidor | Reintentar con backoff; si persiste, fallar |
| **200** con datos incompletos | La API devolvió menos de lo esperado | Solo lo detecta la reconciliación |

:::cuidado Paginación: el fin no es "el cursor vino vacío"
Una API paginada por cursor devuelve `next_cursor` hasta la última página. Si una petición falla y el código interpreta "no hay cursor" como "terminé", el extractor corta a la mitad y termina bien. Y la paginación por **offset** (`?page=37`) tiene otro problema: si los datos cambian durante la lectura, una fila puede aparecer en dos páginas o en ninguna. Se prefiere el cursor, o paginar sobre una clave estable (`updated_at, id`).
:::

## Reintentos con backoff exponencial y jitter

Esperar siempre lo mismo (o nada) hace que todos los clientes reintenten a la vez y la API siga saturada. La política estándar:

- Espera = `base × 2^(intento − 1)`, con un **tope** (por ejemplo, 60 s): 2, 4, 8, 16, 32, 60, 60…
- **Jitter**: se agrega un valor aleatorio a la espera para que los clientes no reintenten sincronizados.
- **Límite de intentos** y, al agotarse, **fallar** (nunca saltear la página).
- Respetar `Retry-After` cuando la API lo manda: es la API diciéndote exactamente cuánto esperar.

## Credenciales: el problema de las personas

Muchos pipelines empiezan con el token personal de quien los construyó. Cuando esa persona se va o su contraseña cambia, el pipeline falla a las 2 de la mañana. Las reglas:

- Los pipelines usan **identidades de servicio**: service principals (Azure, Databricks), service accounts (GCP), roles de IAM (AWS). Mejor aún, **identidad federada** (workload identity, OIDC) en lugar de claves de larga duración.
- Los secretos viven en un **gestor de secretos** (Key Vault, Secrets Manager, Secret Manager, Vault) con **rotación automática** y alerta antes del vencimiento.
- Cada secreto tiene un **dueño que es un equipo**, no una persona.

## Costos: el incidente que no despierta a nadie

En BigQuery on-demand se paga por datos escaneados (USD 6,25 por TiB en la tarifa de referencia). Un `SELECT *` sin filtro de partición sobre una tabla de 4 TB cuesta unos USD 26 **cada vez**. Si un tablero lo ejecuta cada 15 minutos, son 96 veces por día. Las señales y las defensas:

| Defensa | Cómo |
|---|---|
| Tablas particionadas y agrupadas (clustering) | Las consultas que filtran por fecha leen solo esas particiones |
| `require_partition_filter` | La tabla rechaza consultas sin filtro de partición |
| Tablas agregadas o materializadas para los tableros | El tablero lee 50 MB, no 4 TB |
| Límites | `maximum_bytes_billed` por consulta, cuotas por usuario o proyecto, presupuestos con alertas |
| Revisión semanal | `INFORMATION_SCHEMA.JOBS` (BigQuery), `ACCOUNT_USAGE.QUERY_HISTORY` (Snowflake), `system.billing.usage` (Databricks) |

## Práctica

:::ejercicio cli dificultad=Básico titulo="Preparar el incidente"
Prepara los archivos del incidente `api`.
```respuesta
incidente-preparar api
```
:::

:::ejercicio cli dificultad=Básico titulo="Contar los 429"
Cuenta las líneas de `~/incidentes/api/logs/extractor_crm.log` que contienen `HTTP 429`.
```setup
incidente-preparar api
```
```respuesta
grep -c ['"]?(HTTP )?429['"]? \S*extractor_crm\.log
grep ['"]?(HTTP )?429['"]? \S*extractor_crm\.log \| wc -l
```
```solucion
grep -c "HTTP 429" ~/incidentes/api/logs/extractor_crm.log
```
:::

:::ejercicio quiz dificultad=Avanzado
Lee las líneas con 429. ¿Qué hizo mal el extractor?

- [ ] Nada: reintentar inmediatamente es lo más rápido
- [x] Reintentó de inmediato ignorando `Retry-After: 30`, se quedó sin intentos y **se salteó** la página 24 en vez de esperar o fallar
- [ ] Debió cambiar de API key para evitar el límite
- [ ] Debió pedir páginas más grandes
:::

:::ejercicio cli dificultad=Intermedio titulo="El final del extractor"
Muestra las líneas del log que contienen `401` **o** `null`.
```setup
incidente-preparar api
```
```respuesta
grep -E ['"][^'"]*\|[^'"]*['"] \S*extractor_crm\.log
```
```solucion
grep -E "401|null" ~/incidentes/api/logs/extractor_crm.log
```
:::

:::ejercicio quiz dificultad=Avanzado
Juntando todo el log, ¿por qué faltan unos 7.000 contactos?

- [ ] El CRM borró contactos durante la noche
- [x] Se perdió la página 24 por los 429 y, en la página 31, el token venció (401); el código tomó `next_cursor=null` como fin de la paginación y terminó con "Fin OK"
- [ ] El warehouse rechazó las filas por un esquema distinto
- [ ] El total del CRM incluye contactos de prueba
:::

:::ejercicio cli dificultad=Intermedio titulo="Reconciliar"
Muestra las dos líneas que permiten reconciliar la extracción: la que tiene `total_count` y la que tiene `Fin OK`.
```setup
incidente-preparar api
```
```respuesta
grep -E ['"][^'"]*\|[^'"]*['"] \S*extractor_crm\.log
```
```solucion
grep -E "total_count|Fin OK" ~/incidentes/api/logs/extractor_crm.log
```
```explicacion
21.480 informados por la API contra 14.500 escritos: un 32,5 % menos. Con un check que compare estos dos números y falle si difieren, el extractor no habría podido terminar en "OK".
```
:::

:::ejercicio cli dificultad=Avanzado titulo="Secretos que vencen"
`~/incidentes/api/secretos.csv` tiene `nombre,tipo,dueño,vence_utc`. Con `awk`, muestra el nombre y la fecha de los secretos que vencen **antes del 2026-11-05** (compara la columna 4 como texto).
```setup
incidente-preparar api
```
```respuesta
awk -F ?['"]?,['"]? ['"]?(NR ?> ?1 ?&& ?)?\$4 ?< ?"2026-11-05" ?\{ ?print \$1, ?\$4;? ?\}['"]? \S*secretos\.csv
```
```solucion
awk -F, 'NR>1 && $4 < "2026-11-05" {print $1, $4}' ~/incidentes/api/secretos.csv
```
```pista
Las fechas en formato ISO (`AAAA-MM-DD`) se pueden comparar como texto: `$4 < "2026-11-05"`.
```
:::

:::ejercicio quiz dificultad=Intermedio
El token del CRM era un secreto de `juan.diaz`, que se fue de la empresa, y vencía el 29/10 a la 01:30. ¿Cuál es la corrección de fondo?

- [ ] Pedirle a Juan que renueve el token desde su casa
- [ ] Crear otro token personal con una persona del equipo
- [x] Usar una identidad de servicio (o credencial federada) con dueño de equipo, guardada en el gestor de secretos, con rotación automática y alerta antes del vencimiento
- [ ] Poner el token en el código para que no se pierda
:::

:::ejercicio cli dificultad=Intermedio titulo="La consulta más cara de ayer"
`~/incidentes/api/bq_jobs_ayer.csv` tiene `job_id,usuario,origen,bytes_facturados,duracion_s,consulta`. Ordena numéricamente por la columna 4 y muestra la **última** línea (la que más bytes facturó).
```setup
incidente-preparar api
```
```respuesta
sort -t ?['"]?,['"]? -k ?4( -n|n)? \S*bq_jobs_ayer\.csv \| tail -n ?1
sort -n -t ?['"]?,['"]? -k ?4 \S*bq_jobs_ayer\.csv \| tail -n ?1
sort -t ?['"]?,['"]? -n -k ?4 \S*bq_jobs_ayer\.csv \| tail -n ?1
sort -t ?['"]?,['"]? -k ?4 -n \S*bq_jobs_ayer\.csv \| tail -1
```
```solucion
sort -t, -k4 -n ~/incidentes/api/bq_jobs_ayer.csv | tail -n 1
```
:::

:::ejercicio sql ordenado dificultad=Intermedio titulo="Reconciliación de extracciones"
`extracciones(ds, fuente, total_origen, filas_cargadas)` guarda, por cada carga, el total que informó el origen y lo que se escribió. Devuelve las cargas donde la diferencia supera el **0,5 %**: `ds`, `fuente`, `faltantes` y `pct_faltante` (1 decimal), ordenadas por `ds` y `fuente`.
```sql setup
CREATE TABLE extracciones (ds TEXT, fuente TEXT, total_origen INTEGER, filas_cargadas INTEGER);
INSERT INTO extracciones VALUES
('2026-10-26', 'crm_contacts', 20110, 20110), ('2026-10-27', 'crm_contacts', 19874, 19874), ('2026-10-28', 'crm_contacts', 21480, 14500),
('2026-10-26', 'erp_facturas', 8812, 8805), ('2026-10-27', 'erp_facturas', 9004, 9004), ('2026-10-28', 'erp_facturas', 8930, 8752),
('2026-10-28', 'stripe_charges', 4420, 4420);
```
```sql solucion
SELECT ds, fuente, total_origen - filas_cargadas AS faltantes,
       ROUND(100.0 * (total_origen - filas_cargadas) / total_origen, 1) AS pct_faltante
FROM extracciones
WHERE 1.0 * (total_origen - filas_cargadas) / total_origen > 0.005
ORDER BY ds, fuente;
```
```pista
Usa `1.0 *` o `100.0 *` para que la división no sea entera.
```
```explicacion
Además del CRM, las facturas del ERP del 28/10 tienen un 2 % menos. El 26/10 faltaron 7 facturas (0,08 %): dentro de la tolerancia, que se define con el negocio (en finanzas suele ser cero).
```
:::

:::ejercicio sql ordenado dificultad=Intermedio titulo="Secretos por vencer"
`secretos(nombre, dueno, vence_utc)`. Son las `2026-10-29 07:30`. Devuelve los secretos **vencidos o que vencen en los próximos 14 días**: `nombre`, `dueno` y `dias_restantes` (1 decimal; negativo si ya venció), del más urgente al menos.
```sql setup
CREATE TABLE secretos (nombre TEXT, dueno TEXT, vence_utc TEXT);
INSERT INTO secretos VALUES
('crm-api-token', 'juan.diaz', '2026-10-29 01:30'), ('erp-sftp-key', 'equipo-datos', '2027-03-01 00:00'),
('snowflake-svc', 'equipo-datos', '2026-11-04 00:00'), ('stripe-readonly', 'payments', '2027-01-15 00:00'),
('gcs-sa-key', 'equipo-datos', '2026-11-02 00:00'), ('looker-api', 'bi', '2026-11-20 00:00');
```
```sql solucion
SELECT nombre, dueno, ROUND(julianday(vence_utc) - julianday('2026-10-29 07:30'), 1) AS dias_restantes
FROM secretos
WHERE julianday(vence_utc) - julianday('2026-10-29 07:30') <= 14
ORDER BY dias_restantes;
```
:::

:::ejercicio sql ordenado dificultad=Avanzado titulo="¿Quién gasta?"
`jobs(job_id, usuario, origen, bytes_facturados)` tiene las consultas de ayer. Calcula por `usuario` los `tib` facturados (bytes ÷ 1024⁴, 2 decimales) y el costo en `usd` a 6,25 USD por TiB (2 decimales), de mayor a menor costo (en caso de empate, por `usuario`).
```sql setup
CREATE TABLE jobs (job_id TEXT, usuario TEXT, origen TEXT, bytes_facturados INTEGER);
WITH RECURSIVE n(i) AS (SELECT 0 UNION ALL SELECT i + 1 FROM n WHERE i < 59)
INSERT INTO jobs
SELECT 'bqjob_' || (1000 + i),
       CASE WHEN i % 6 = 5 THEN 'looker_svc' ELSE CASE i % 4 WHEN 0 THEN 'svc_dbt' WHEN 1 THEN 'svc_airflow' WHEN 2 THEN 'ana.perez' ELSE 'luis.gomez' END END,
       CASE WHEN i % 6 = 5 THEN 'tablero ventas' WHEN i % 4 < 2 THEN 'pipeline' ELSE 'consola' END,
       CASE WHEN i % 6 = 5 THEN 4618946961619 ELSE (50 + (i * 37) % 900) * 1048576 END
FROM n;
```
```sql solucion
SELECT usuario,
       ROUND(SUM(bytes_facturados) / 1099511627776.0, 2) AS tib,
       ROUND(SUM(bytes_facturados) / 1099511627776.0 * 6.25, 2) AS usd
FROM jobs
GROUP BY usuario
ORDER BY usd DESC, usuario;
```
```pista
1 TiB = 1024⁴ = 1.099.511.627.776 bytes. Divide con un decimal (`1099511627776.0`) para no perder precisión.
```
```explicacion
La cuenta del tablero gasta unos USD 260 por día, unos USD 7.900 por mes, en una muestra donde el resto de los usuarios gasta centavos. En la realidad esta consulta se corre sobre `region-us.INFORMATION_SCHEMA.JOBS` en BigQuery o sobre el historial de consultas del warehouse que uses.
```
:::

:::ejercicio sql ordenado dificultad=Avanzado titulo="La política de reintentos"
Calcula la espera de cada reintento con backoff exponencial: base de 2 segundos, se duplica en cada intento y tiene un tope de 60 segundos. Devuelve `intento` (1 a 7) y `espera_s`.
```sql setup
CREATE TABLE politica (base_s INTEGER, tope_s INTEGER, intentos INTEGER);
INSERT INTO politica VALUES (2, 60, 7);
```
```sql solucion
WITH RECURSIVE r(intento, espera) AS (
  SELECT 1, (SELECT base_s FROM politica)
  UNION ALL
  SELECT intento + 1, espera * 2 FROM r WHERE intento < (SELECT intentos FROM politica)
)
SELECT intento, MIN(espera, (SELECT tope_s FROM politica)) AS espera_s
FROM r
ORDER BY intento;
```
```pista
Una CTE recursiva que empieza en `(1, 2)` y en cada paso duplica la espera.
```
```pista
Aplica el tope con `MIN(espera, 60)` (en SQLite, `MIN` con dos argumentos devuelve el menor; en otros motores, `LEAST`).
```
```explicacion
2, 4, 8, 16, 32, 60, 60: casi 3 minutos en total, contra los 5 reintentos inmediatos (0 segundos) que hizo el extractor. En la implementación real se suma el jitter (por ejemplo, un valor aleatorio entre 0 y la espera) y, si llega `Retry-After`, manda esa cifra.
```
:::

:::ejercicio quiz dificultad=Avanzado
¿Qué cambio reduce más el costo del tablero que escanea 4 TB cada 15 minutos?

- [ ] Pasar el refresco a cada 10 minutos para que use la caché
- [x] Que el tablero lea una tabla agregada (o una vista materializada) particionada por fecha, con `require_partition_filter` en la tabla cruda y un `maximum_bytes_billed` para la cuenta del tablero
- [ ] Comprimir la tabla con gzip
- [ ] Mover la tabla a otra región
:::

:::errores
- **Saltear lo que falla**: una página omitida es un dato perdido que nadie ve. Si no se puede traer, el extractor falla.
- **Interpretar un error como fin**: `next_cursor=null` después de un error no es la última página.
- **Reintentar sin esperar**: con un 429, cada reintento inmediato empeora el límite.
- **Credenciales personales en pipelines**: el pipeline muere con la cuenta de la persona.
- **Costos sin dueño**: si nadie mira el gasto por usuario y por consulta cada semana, la factura es el monitoreo.
:::

:::trabajo
- Las librerías de reintentos (`tenacity` en Python, los reintentos de los SDK de las nubes, los de `requests` con `urllib3.Retry`) implementan backoff y jitter; no se escriben bucles a mano.
- Cada extracción guarda un **registro de reconciliación** (total del origen, filas leídas, filas escritas, páginas) en una tabla de control, y un check compara.
- Las herramientas de ingesta administradas (Fivetran, Airbyte, Lakeflow Connect) manejan rate limits y paginación, pero igual conviene reconciliar las tablas críticas.
- Los presupuestos de la nube tienen alertas; los warehouses tienen límites por consulta y por usuario; y hay un tablero semanal de costo por equipo (*FinOps*).
:::

:::entrevista
**"¿Cómo harías robusto un extractor de una API?"** Reintentos solo para errores transitorios (429, 5xx) con backoff exponencial, jitter y respeto de `Retry-After`; renovación del token ante un 401; paginación por cursor o clave estable; fallar en vez de saltear; escritura idempotente por ventana; y reconciliación contra el total del origen al terminar. Credenciales de servicio en un gestor de secretos con rotación.
:::

## Resumen

| Problema | Señal | Defensa |
|---|---|---|
| Rate limit | HTTP 429, `Retry-After` | Backoff exponencial con jitter y tope |
| Token vencido | HTTP 401 | Renovar y reintentar una vez; si no, fallar |
| Extracción incompleta con "OK" | Total del origen ≠ filas escritas | Reconciliación obligatoria |
| Secretos que vencen | Fecha de vencimiento cercana, dueño persona | Identidad de servicio, rotación, alertas |
| Factura que se dispara | Bytes por usuario y consulta | Particiones, tablas agregadas, límites, revisión semanal |
