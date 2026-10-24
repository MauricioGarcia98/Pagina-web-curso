---
titulo: "Data Vault: hubs, links y satélites"
nivel: Experto
duracion: 45
resumen: Qué problema resuelve Data Vault, sus tres piezas, cómo se cargan y cuándo conviene frente a un modelo dimensional.
objetivos: Explicar el problema que resuelve Data Vault (integrar muchas fuentes que cambian) | Identificar hubs, links y satélites a partir de un modelo de origen | Construir un hub y un satélite con SQL a partir de dos fuentes | Decidir entre Data Vault y modelado dimensional según la empresa
prerrequisitos: modelado-scd
autoevaluacion: ¿Puedes explicar qué va en un hub, en un link y en un satélite? | ¿Sabes por qué los satélites guardan historia por defecto? | ¿Puedes integrar el mismo cliente que viene de dos sistemas en un hub? | ¿Sabes por qué Data Vault no se consulta directamente desde el BI? | ¿Puedes decir cuándo NO conviene Data Vault?
---

:::escenario Dos sistemas, el mismo cliente
El banco del Grupo Andino compró una fintech. Ahora hay dos sistemas con clientes: el **core bancario** (con el documento como identificador) y la **app de la fintech** (con su propio id, pero también con el documento). Cada sistema cambia sus columnas cada pocos meses, y el regulador exige poder reconstruir **qué sabía el banco de cada cliente en cualquier fecha**.

Martín te dice:

> "Con un esquema estrella directo desde las fuentes, cada cambio de un sistema nos obliga a rehacer las dimensiones. Investiga Data Vault: lo usan muchos bancos justamente para esto."
:::

## La idea

**Data Vault** (creado por Dan Linstedt) es una forma de modelar la capa **intermedia** (silver, o "raw vault") pensada para tres cosas:

1. **Integrar muchas fuentes** que describen las mismas entidades de negocio.
2. **Absorber cambios** en las fuentes sin rediseñar lo existente: se **agrega**, nunca se modifica.
3. **Auditar**: guardar toda la historia, con la fuente y la fecha de carga de cada dato.

Separa el modelo en tres tipos de tablas:

```diagrama
titulo: Data Vault: hubs (claves), links (relaciones) y satélites (atributos con historia)
nodo hc: hub_cliente | icono=llave | col=0 | fila=0 | color=azul | sub=documento (clave de negocio)
nodo hcu: hub_cuenta | icono=llave | col=2 | fila=0 | color=azul | sub=número de cuenta
nodo l: link_cliente_cuenta | icono=git | col=1 | fila=0 | color=verde | sub=relación cliente–cuenta
nodo s1: sat_cliente_core | icono=archivos | col=0 | fila=1 | color=amarillo | sub=nombre, segmento (core)
nodo s2: sat_cliente_fintech | icono=archivos | col=1 | fila=1 | color=amarillo | sub=email, app (fintech)
nodo s3: sat_cuenta | icono=archivos | col=2 | fila=1 | color=amarillo | sub=estado, tipo
flecha hc -- l
flecha l -- hcu
flecha hc -- s1
flecha hc -- s2
flecha hcu -- s3
```

| Pieza | Qué guarda | Columnas típicas | Cambia… |
|---|---|---|---|
| **Hub** | Una fila por **clave de negocio** única (el cliente "existe") | `hk_cliente` (hash de la clave), `documento`, `fecha_carga`, `fuente` | Solo se agregan filas |
| **Link** | Una fila por **relación** entre claves | `hk_link`, `hk_cliente`, `hk_cuenta`, `fecha_carga`, `fuente` | Solo se agregan filas |
| **Satélite** | Los **atributos descriptivos** de un hub o link, con su historia | `hk_cliente`, `fecha_carga`, `hash_atributos`, atributos…, `fuente` | Se agrega una fila por cada cambio |

Las claves suelen ser **hashes** de la clave de negocio (por ejemplo, `MD5(documento)`): se pueden calcular en paralelo, sin consultar una secuencia, y son iguales en todos los sistemas.

### Por qué absorbe tan bien los cambios

- ¿La fintech agrega una columna "nivel de fidelidad"? Se agrega un **satélite nuevo** (o una columna nueva en el suyo). Nada de lo existente cambia.
- ¿Llega un tercer sistema con clientes? Se carga en el **mismo hub** (las claves de negocio coinciden) y en un **satélite propio**.
- ¿El regulador pregunta qué segmento tenía el cliente el 3 de marzo? Los satélites guardan todas las versiones con su fecha de carga.

## Cargar un hub y un satélite

Integrar el cliente de las dos fuentes en el hub: la clave de negocio (el documento) se normaliza y se quedan los valores distintos, con la primera fuente y fecha en que se vio:

```sql
WITH core(documento, nombre, segmento, fecha_carga) AS (
    VALUES ('12.345.678', 'Ana Ruiz',  'Pyme',       '2024-01-10'),
           ('20.111.222', 'Luis Paz',  'Consumidor', '2024-01-10')
),
fintech(id_app, documento, email, fecha_carga) AS (
    VALUES ('A-9', '12345678', 'ana@mail.com',   '2024-02-01'),
           ('A-7', '30999888', 'eva@correo.com', '2024-02-01')
),
claves AS (
    SELECT REPLACE(documento, '.', '') AS documento, fecha_carga, 'core' AS fuente FROM core
    UNION ALL
    SELECT REPLACE(documento, '.', ''), fecha_carga, 'fintech' FROM fintech
),
primera_vez AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY documento ORDER BY fecha_carga, fuente) AS rn FROM claves
)
SELECT 'hk_' || documento AS hk_cliente, documento, fecha_carga, fuente
FROM primera_vez
WHERE rn = 1
ORDER BY documento;
```

(En un motor real, `hk_cliente` sería `MD5(documento)`; SQLite no tiene MD5, así que lo simulamos con un prefijo.) Ana aparece **una sola vez** aunque esté en los dos sistemas con formatos distintos de documento: esa es la integración. Eva solo existe en la fintech y Luis solo en el core.

El satélite guarda una fila por **cambio** de los atributos. Para detectar cambios se compara un hash de todos los atributos con el de la última versión: si es igual, no se inserta nada.

## De Data Vault al modelo dimensional

Data Vault **no** se consulta directamente desde el BI: para responder "ventas por segmento" habría que unir hubs, links y varios satélites, eligiendo la versión vigente de cada uno. Por eso la arquitectura típica es:

```diagrama
titulo: Data Vault en el medio, estrella para consumir
nodo f1: Core bancario | icono=banco | col=0 | fila=0
nodo f2: App fintech | icono=movil | col=0 | fila=1
nodo st: Staging | icono=bucket | col=1 | fila=0 | color=naranja | sub=copia cruda
nodo rv: Raw Vault | icono=llave | col=2 | fila=0 | color=azul | sub=hubs, links, satélites
nodo bv: Business Vault | icono=engranaje | col=2 | fila=1 | color=violeta | sub=reglas de negocio
nodo mt: Marts (estrella) | icono=grafico | col=3 | fila=0 | color=verde | sub=fct_ y dim_ para el BI
flecha f1 -> st
flecha f2 -> st
flecha st -> rv
flecha rv -> bv
flecha rv -> mt
flecha bv -> mt
```

## ¿Cuándo sí y cuándo no?

| Conviene Data Vault si… | No conviene si… |
|---|---|
| Muchas fuentes describen las mismas entidades | Hay una o dos fuentes estables |
| Las fuentes cambian seguido | El equipo es chico |
| Hay exigencias fuertes de auditoría (banca, seguros, salud) | Se necesita entregar valor rápido |
| El modelo va a vivir muchos años y crecer mucho | El modelo dimensional directo alcanza |

Data Vault multiplica la cantidad de tablas y de JOINs. En una empresa mediana, una capa silver bien hecha (con SCD tipo 2 donde importa) más un modelo dimensional suele ser suficiente.

<!-- estandar:errores -->
:::errores
- **Poner atributos en el hub**: el hub solo tiene la clave de negocio. Si pones el nombre, cada cambio rompe el principio de "solo agregar".
- **Elegir mal la clave de negocio**: usar el id interno de un sistema en lugar de una clave que compartan todas las fuentes (el documento, el número de cuenta) impide integrar.
- **Consultar el vault desde el BI**: consultas de 15 JOINs, lentas y fáciles de equivocar. Siempre se construye una capa de marts encima.
- **Adoptarlo "porque es lo moderno"** en una empresa con dos fuentes: meses de trabajo para un problema que no existe.
:::

<!-- estandar:trabajo -->
:::trabajo
- Data Vault es común en bancos, aseguradoras y grandes empresas europeas. En dbt existe el paquete **AutomateDV** (antes dbtvault), que genera hubs, links y satélites a partir de configuraciones.
- Aunque no uses Data Vault completo, dos de sus ideas se usan en todos lados: guardar `fuente` y `fecha_carga` en cada fila, y detectar cambios comparando un **hash** de los atributos.
:::

<!-- estandar:entrevista -->
:::entrevista "¿Data Vault o Kimball?"
No son excluyentes: Data Vault es una forma de modelar la capa de integración (historia completa, muchas fuentes, auditoría, cambios sin rediseño) y Kimball es la forma de modelar la capa de consumo (simple y rápida para el BI). En empresas con muchas fuentes y regulación, se usa Data Vault en el medio y estrellas encima. En empresas chicas, silver con SCD donde haga falta y estrellas en gold es más simple y suficiente.
:::

## Ejercicios

:::ejercicio quiz
¿Qué guarda un **hub** en Data Vault?

- [ ] Todos los atributos de la entidad
- [x] Solo la clave de negocio (y su hash), con la fecha y la fuente de la primera carga
- [ ] Las relaciones entre entidades
- [ ] Las métricas
:::

:::ejercicio quiz
La app de la fintech empieza a enviar un campo nuevo, "nivel de fidelidad". ¿Qué cambia en el Data Vault?

- [ ] Hay que rediseñar el hub de clientes
- [x] Se agrega un satélite nuevo (o una columna al satélite de esa fuente); hubs y links no cambian
- [ ] Hay que borrar la historia
- [ ] Nada: Data Vault ignora los campos nuevos
:::

:::ejercicio sql titulo="Hub de clientes desde dos fuentes" ordenado
Carga el hub de clientes integrando las dos fuentes. La clave de negocio es el documento **sin puntos ni espacios**. Devuelve una fila por documento con `documento`, `primera_carga` (la fecha más temprana en que apareció en cualquier fuente) y `fuentes` (cuántas fuentes distintas lo tienen). Ordena por `documento`.
```sql inicial
WITH core(documento, fecha_carga) AS (
    VALUES ('12.345.678', '2024-01-10'), ('20.111.222', '2024-01-10'), ('30 999 888', '2024-03-05')
),
fintech(documento, fecha_carga) AS (
    VALUES ('12345678', '2024-02-01'), ('30999888', '2024-02-01'), ('41.000.111', '2024-02-15')
)
SELECT ...
```
```sql solucion
WITH core(documento, fecha_carga) AS (
    VALUES ('12.345.678', '2024-01-10'), ('20.111.222', '2024-01-10'), ('30 999 888', '2024-03-05')
),
fintech(documento, fecha_carga) AS (
    VALUES ('12345678', '2024-02-01'), ('30999888', '2024-02-01'), ('41.000.111', '2024-02-15')
),
claves AS (
    SELECT REPLACE(REPLACE(documento, '.', ''), ' ', '') AS documento, fecha_carga, 'core' AS fuente FROM core
    UNION ALL
    SELECT REPLACE(REPLACE(documento, '.', ''), ' ', ''), fecha_carga, 'fintech' FROM fintech
)
SELECT documento, MIN(fecha_carga) AS primera_carga, COUNT(DISTINCT fuente) AS fuentes
FROM claves
GROUP BY documento
ORDER BY documento
```
```pista
Normaliza el documento con dos `REPLACE` anidados, une las fuentes con `UNION ALL` (agregando una columna `fuente`) y agrupa por documento.
```
:::
