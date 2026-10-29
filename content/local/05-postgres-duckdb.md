---
titulo: "SQL en tu máquina: PostgreSQL en Docker y DuckDB"
nivel: Intermedio
duracion: 60
resumen: Las dos bases que todo data engineer tiene en su computadora. PostgreSQL en un contenedor para practicar como en una base de producción (psql, carga de CSV con \copy, clientes gráficos) y DuckDB, la base analítica en un archivo que consulta CSV y Parquet directamente, desde la terminal y desde Python.
objetivos: Conectarte a PostgreSQL con psql y con un cliente gráfico y explicar los parámetros de conexión | Crear tablas y cargar archivos CSV con \copy | Consultar archivos CSV y JSON directamente con DuckDB y guardar resultados en Parquet | Usar DuckDB desde Python con pandas | Elegir entre PostgreSQL y DuckDB según el uso
prerrequisitos: local-docker | sql-ddl-dml
autoevaluacion: ¿Sabes cuáles son los cinco datos de una conexión a una base (host, puerto, base, usuario, contraseña)? | ¿Sabes cargar un CSV en una tabla de Postgres? | ¿Puedes consultar un CSV con DuckDB sin crear una tabla? | ¿Sabes exportar un resultado a Parquet? | ¿Sabes cuándo usar Postgres y cuándo DuckDB?
---

:::escenario Dos bases, dos usos
Tienes los CSV de pedidos de Rápido y quieres explorarlos, y además el equipo de la app usa PostgreSQL y necesitas practicar las consultas que vas a correr contra esa base. Tu compañera te recomienda:

> "Para explorar archivos, DuckDB: no instalas servidor, lee el CSV directo y es rapidísimo. Para simular la base de la app, un Postgres en Docker. Las dos cosas en tu laptop."
:::

## Dos bases, dos propósitos

| | PostgreSQL | DuckDB |
|---|---|---|
| Tipo | **OLTP**: transaccional, muchas escrituras chicas | **OLAP**: analítica, consultas grandes sobre columnas |
| Cómo corre | Un **servidor** (aquí, en un contenedor) al que te conectas | Una **librería**: la base es un archivo (o la memoria) |
| Para qué en tu máquina | Simular la base de una app, probar ingestas, practicar SQL de producción | Explorar CSV/Parquet, prototipar transformaciones, correr dbt sin nube |
| Concurrencia | Muchos usuarios a la vez | Un proceso escribe a la vez |
| En la empresa | La base de las aplicaciones (la **fuente**) | Análisis local, pipelines chicos, pruebas de dbt |

## PostgreSQL

### Levantarlo

```bash norun
docker run -d --name pg \
  -e POSTGRES_PASSWORD=secreto -e POSTGRES_DB=rapido \
  -p 5432:5432 -v pgdata:/var/lib/postgresql/data \
  postgres:16
```

### Conectarse: los cinco datos

Toda conexión a una base necesita lo mismo:

| Dato | Valor aquí | En psql |
|---|---|---|
| Host | `localhost` | `-h localhost` |
| Puerto | `5432` | `-p 5432` |
| Base | `rapido` | `-d rapido` |
| Usuario | `postgres` | `-U postgres` |
| Contraseña | `secreto` | la pide, o variable `PGPASSWORD` |

Los mismos datos, escritos como **URL de conexión** (la usan Python, dbt y casi todo): `postgresql://postgres:secreto@localhost:5432/rapido`.

**Con psql** (el cliente de terminal; en macOS `brew install libpq`, en Ubuntu `sudo apt install postgresql-client`, o desde el contenedor con `docker exec -it pg psql -U postgres -d rapido`):

```bash norun
psql -h localhost -p 5432 -U postgres -d rapido
```

**Con un cliente gráfico**: **DBeaver** (gratis, para todas las bases) o la extensión **SQLTools** de VS Code. Nueva conexión → PostgreSQL → los cinco datos de arriba.

### Crear una tabla y cargar un CSV

```sql norun
CREATE TABLE clientes (
  cliente_id INTEGER PRIMARY KEY,
  nombre     VARCHAR(50),
  apellido   VARCHAR(50),
  email      TEXT,
  ciudad     TEXT,
  pais       TEXT,
  segmento   TEXT
);
```

**`\copy`** carga un archivo de **tu máquina** a una tabla (es un comando de psql, empieza con `\` y no lleva `;`):

```text
rapido=# \copy clientes FROM 'datos/clientes.csv' WITH (FORMAT csv, HEADER)
COPY 300
rapido=# SELECT pais, COUNT(*) FROM clientes GROUP BY pais ORDER BY 2 DESC LIMIT 3;
   pais   | count
----------+-------
 México   |    65
 España   |    51
 Colombia |    47
(3 rows)
```

| Comando de psql | Qué hace |
|---|---|
| `\dt` | Lista las tablas |
| `\d clientes` | Columnas y tipos de una tabla |
| `\l` | Lista las bases |
| `\copy tabla FROM 'archivo.csv' WITH (FORMAT csv, HEADER)` | Carga un CSV |
| `\copy (SELECT …) TO 'salida.csv' WITH (FORMAT csv, HEADER)` | Exporta una consulta |
| `\q` | Sale |

:::nota COPY y \copy
`COPY` (sin barra) es SQL y lee archivos **del servidor**: dentro del contenedor, no tu disco. `\copy` es de psql y lee archivos **de tu máquina**. Por eso en local casi siempre usas `\copy`.
:::

## DuckDB

**Instalar:** `brew install duckdb` (macOS), o en Linux/WSL el binario de [duckdb.org](https://duckdb.org) (`curl https://install.duckdb.org | sh`). En Python: `uv add duckdb`.

### Consultar archivos sin cargarlos

```text
$ duckdb
D SELECT pais, COUNT(*) AS clientes
  FROM 'datos/clientes.csv'
  GROUP BY pais ORDER BY clientes DESC LIMIT 3;
┌──────────┬──────────┐
│   pais   │ clientes │
│ varchar  │  int64   │
├──────────┼──────────┤
│ México   │       65 │
│ España   │       51 │
│ Colombia │       47 │
└──────────┴──────────┘
```

El archivo **es** la tabla: DuckDB detecta el separador, la cabecera y los tipos. También: `read_csv_auto('x.csv')`, `read_json_auto('x.json')`, `read_parquet('x.parquet')`, y comodines: `FROM 'datos/ventas_*.csv'`.

```sql norun
DESCRIBE SELECT * FROM read_csv_auto('datos/ventas_2024_12.csv');   -- columnas y tipos detectados
```

### Una base persistente y exportar a Parquet

```bash norun
duckdb lago.duckdb                     # crea (o abre) la base en un archivo
```

```sql norun
CREATE TABLE clientes AS SELECT * FROM 'datos/clientes.csv';
COPY (SELECT pais, COUNT(*) AS n FROM clientes GROUP BY pais)
  TO 'clientes_por_pais.parquet' (FORMAT parquet);
```

**Parquet** es el formato columnar de los lagos de datos: comprimido, con tipos, y se lee rapidísimo. Convertir CSV a Parquet con DuckDB es una línea.

### DuckDB desde Python

```python norun
import duckdb

con = duckdb.connect("lago.duckdb")
df = con.sql("""
    SELECT pais, COUNT(*) AS clientes
    FROM 'datos/clientes.csv'
    GROUP BY pais
""").df()                        # el resultado como DataFrame de pandas

# y al revés: consultar un DataFrame de pandas con SQL
top = duckdb.sql("SELECT * FROM df ORDER BY clientes DESC LIMIT 5").df()
```

DuckDB puede consultar un DataFrame de pandas **por su nombre de variable**. Es la forma más cómoda de mezclar Python y SQL en un análisis.

<!-- estandar:errores -->
:::errores
- **`connection refused` en psql**: el contenedor no está corriendo (`docker ps`) o publicaste otro puerto.
- **`relation "clientes" does not exist`**: estás en otra base (`\conninfo` dice cuál), o la tabla se creó en otro esquema.
- **`COPY … could not open file … No such file or directory`**: usaste `COPY` (busca en el servidor/contenedor). Usa `\copy`.
- **Fechas o números como texto en DuckDB**: el CSV tiene formatos mezclados (`01/02/2024` y `2024-02-01`). Usa `read_csv('x.csv', dateformat='%d/%m/%Y')` o `types={'col': 'DATE'}`.
- **`Could not set lock on file lago.duckdb`**: otro proceso (por ejemplo, un notebook) tiene la base abierta para escribir. Cierra el otro o ábrela en solo lectura (`duckdb -readonly`).
:::

<!-- estandar:trabajo -->
:::trabajo
- Muchos equipos usan DuckDB para **prototipar** transformaciones (y correr dbt localmente) antes de llevarlas al warehouse de la nube, y para pipelines chicos que no justifican Spark.
- La conexión a las bases de producción nunca se hace con el usuario administrador: cada persona y cada pipeline tiene su usuario con permisos de solo lectura sobre lo que necesita, y las contraseñas viven en un gestor de secretos.
- Para mover datos de Postgres a un lago, la práctica es leer de una **réplica de lectura**, no de la base principal de la app.
:::

## Ejercicios

:::ejercicio quiz
¿Cuál es la diferencia entre `COPY` y `\copy` en PostgreSQL?

- [ ] Ninguna, son sinónimos
- [x] `COPY` lee archivos del servidor; `\copy` (de psql) lee archivos de tu máquina
- [ ] `\copy` solo funciona con Parquet
- [ ] `COPY` es más lento
:::

:::ejercicio quiz
Quieres explorar un CSV de 2 GB en tu laptop con SQL, sin crear tablas ni levantar servidores. ¿Qué usas?

- [ ] PostgreSQL en Docker
- [x] DuckDB: `SELECT … FROM 'archivo.csv'`
- [ ] Excel
- [ ] Un clúster de Spark
:::

:::ejercicio cli
Con DuckDB y sin crear tablas, cuenta los clientes por `pais` del archivo `datos/clientes.csv` (columnas `pais` y `clientes`), de mayor a menor.
```respuesta
duckdb -c ["'].*from ['"]?datos/clientes\.csv['"]?.*group by pais.*["']
```
```solucion
duckdb -c "SELECT pais, COUNT(*) AS clientes FROM 'datos/clientes.csv' GROUP BY pais ORDER BY clientes DESC"
```
:::

:::ejercicio cli
Con DuckDB, muestra las columnas y los tipos que detecta en `datos/ventas_2024_12.csv`.
```respuesta
duckdb -c ["']DESCRIBE (SELECT \* FROM )?(read_csv_auto\()?['"]datos/ventas_2024_12\.csv['"]\)?;?["']
```
```solucion
duckdb -c "DESCRIBE SELECT * FROM 'datos/ventas_2024_12.csv'"
```
:::

:::ejercicio cli
Hay un Postgres corriendo en el puerto 5432 con la base `rapido` y una tabla `clientes` vacía. Con `psql` y el usuario `postgres`, carga `datos/clientes.csv` (tiene cabecera) usando `\copy`.
```respuesta
psql (-h localhost )?(-p 5432 )?-U postgres -d rapido -c ["']\\copy clientes FROM 'datos/clientes\.csv' (WITH )?\(?(FORMAT )?csv,? HEADER\)?["']
psql -d rapido -U postgres -c ["']\\copy clientes FROM 'datos/clientes\.csv' (WITH )?\(?(FORMAT )?csv,? HEADER\)?["']
```
```solucion
psql -h localhost -U postgres -d rapido -c "\copy clientes FROM 'datos/clientes.csv' WITH (FORMAT csv, HEADER)"
```
```setup
docker run -d --name pg -e POSTGRES_PASSWORD=secreto -e POSTGRES_DB=rapido -p 5432:5432 postgres:16
psql -U postgres -d rapido -c "CREATE TABLE clientes (cliente_id INTEGER PRIMARY KEY, nombre TEXT, apellido TEXT, email TEXT, ciudad TEXT, pais TEXT, segmento TEXT)"
```
:::

:::ejercicio cli
En la base `lago.duckdb` hay una tabla `clientes`. Exporta a `por_pais.parquet` (formato Parquet) el conteo de clientes por país.
```respuesta
duckdb lago\.duckdb -c ["']COPY \(SELECT .*GROUP BY pais\) TO 'por_pais\.parquet' \(FORMAT (parquet|PARQUET)\);?["']
```
```solucion
duckdb lago.duckdb -c "COPY (SELECT pais, COUNT(*) AS n FROM clientes GROUP BY pais) TO 'por_pais.parquet' (FORMAT parquet)"
```
```setup
duckdb lago.duckdb -c "CREATE TABLE clientes AS SELECT * FROM 'datos/clientes.csv'"
```
:::
