---
titulo: Proyecto 2 (semiguiado) - el entorno de desarrollo del equipo
nivel: 2 · Básico-intermedio
duracion: 45
resumen: El equipo necesita un lugar propio para trabajar sin tocar los datos de producción. Dejas armado tienda_dev con sus esquemas, un warehouse de análisis que se apaga solo y una primera tabla, y lo compruebas con SHOW. Pistas escondidas.
objetivos: Armar una base con esquemas por capa | Dejar un warehouse dimensionado y con auto suspend | Comprobar objetos con SHOW | Documentar el entorno
prerrequisitos: snowflake-paso-a-paso-historial-de-consultas
autoevaluacion: ¿Existe tienda_dev con raw y analitica? | ¿El warehouse tiene AUTO_SUSPEND = 60? | ¿Hay una tabla en analitica? | ¿Sabes comprobarlo con SHOW?
---

:::escenario El pedido
Lucía: *"Quiero `tienda_dev` con `raw` y `analitica`, un warehouse X-Small para análisis que se apague al minuto, y la tabla `ventas_por_canal` como primera prueba. Mostrame que está todo con SHOW."*
:::

## Lo que tienes que lograr

1. Base `tienda_dev` con esquemas `raw` y `analitica`.
2. Warehouse `analisis_wh`, X-Small, `AUTO_SUSPEND = 60`, `AUTO_RESUME = TRUE`.
3. Tabla `tienda_dev.analitica.ventas_por_canal`.
4. Comprobarlo con `SHOW`.

<details><summary>💡 Pista: comprobar</summary>

`SHOW WAREHOUSES;` lista los warehouses con su tamaño y auto suspend. `SHOW SCHEMAS IN DATABASE tienda_dev;` lista los esquemas.
</details>

## Cómo se ve terminado

```captura
archivo: snowflake/s08-esquemas.webp
texto: SHOW SCHEMAS IN DATABASE tienda_dev - ANALITICA, PUBLIC y RAW
```

```captura
archivo: snowflake/s08-warehouses.webp
texto: SHOW WAREHOUSES - COMPUTE_WH y ANALISIS_WH en X-Small con auto_suspend 60
```

## ✅ Lista de verificación

- [ ] `SHOW SCHEMAS IN DATABASE tienda_dev` devuelve ANALITICA, PUBLIC y RAW.
- [ ] `SHOW WAREHOUSES` muestra ANALISIS_WH en X-Small con auto_suspend 60.
- [ ] `SELECT * FROM tienda_dev.analitica.ventas_por_canal` devuelve 4 canales.

<details><summary>💡 Solución comentada</summary>

```sql norun
CREATE WAREHOUSE IF NOT EXISTS analisis_wh
  WAREHOUSE_SIZE = 'XSMALL' AUTO_SUSPEND = 60 AUTO_RESUME = TRUE INITIALLY_SUSPENDED = TRUE;
CREATE DATABASE IF NOT EXISTS tienda_dev;
CREATE SCHEMA IF NOT EXISTS tienda_dev.raw;
CREATE SCHEMA IF NOT EXISTS tienda_dev.analitica;
USE WAREHOUSE analisis_wh;
CREATE OR REPLACE TABLE tienda_dev.analitica.ventas_por_canal AS
SELECT canal, COUNT(*) AS pedidos FROM tienda_andina.public.pedidos GROUP BY canal;
SHOW SCHEMAS IN DATABASE tienda_dev;
SHOW WAREHOUSES;
```

`IF NOT EXISTS` y `CREATE OR REPLACE` hacen que el script se pueda correr dos veces sin error: es la base para automatizar el entorno (con Terraform o con el Snowflake CLI, nivel 6).
</details>

## Lo que aprendiste en el nivel 2

- Warehouses, tamaños y créditos.
- Bases, esquemas y tipos de tabla.
- Query History.

En el nivel 3: cargar archivos con stages y COPY INTO, JSON y MERGE.

:::ejercicio quiz
¿Para qué sirve IF NOT EXISTS en un CREATE?
- [x] Para que el script no falle si el objeto ya existe
- [ ] Para borrar el objeto
- [ ] Para que sea más rápido
- [ ] No hace nada
:::

:::ejercicio quiz
¿Qué comando lista los esquemas de una base?
- [ ] LIST SCHEMAS
- [x] SHOW SCHEMAS IN DATABASE tienda_dev
- [ ] SELECT * FROM schemas
- [ ] DESCRIBE tienda_dev
:::

:::ejercicio quiz
¿Por qué un warehouse para análisis separado de la carga?
- [ ] Porque cuesta menos siempre
- [x] Para que no se pisen y para saber qué gasta cada uno
- [ ] Porque Snowflake solo permite una consulta por warehouse
- [ ] No hay razón
:::

:::ejercicio quiz
¿Qué hace CREATE OR REPLACE TABLE?
- [ ] Falla si existe
- [x] Reemplaza la tabla si ya existe
- [ ] Agrega filas
- [ ] Crea una vista
:::
