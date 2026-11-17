---
titulo: El SQL analytics endpoint - consultar el lakehouse con T-SQL
nivel: 2 · Básico-intermedio
duracion: 30
resumen: Cada lakehouse trae un endpoint SQL que permite consultar sus tablas con T-SQL, como si fuera una base de datos, sin copiar nada. Cambias al endpoint, consultas los pedidos por canal y ves por qué un DELETE falla - el endpoint es de solo lectura - y qué hacer cuando necesitas escribir.
objetivos: Cambiar entre el lakehouse y su endpoint SQL | Consultar tablas con T-SQL | Entender por qué el endpoint es de solo lectura | Saber dónde escribir datos (Spark o Warehouse)
prerrequisitos: fabric-paso-a-paso-datos-de-ejemplo-y-tablas-delta
autoevaluacion: ¿Sabes cómo llegas al endpoint SQL? | ¿Sabes por qué no puedes hacer un DELETE ahí? | ¿Sabes dónde escribir con T-SQL? | ¿Sabes qué conecta Power BI al endpoint?
---

:::analogia Una vidriera del lakehouse
El SQL analytics endpoint es una vidriera: desde afuera ves y consultas todo lo que hay en las tablas del lakehouse con T-SQL, pero no puedes meter la mano para cambiar nada. Para escribir se entra por la puerta de atrás (Spark) o se usa un warehouse.
:::

## Paso 1 — Cambiar al endpoint

En `lh_ventas`, el selector de arriba a la derecha → **SQL analytics endpoint**:

```captura
archivo: fabric/b06-endpoint.webp
texto: El selector (1), el explorador SQL con esquemas y tablas (2) y el editor de consultas (3)
```

Es una **vista SQL** de las mismas tablas Delta: no hay copia ni sincronización que configurar.

## Paso 2 — Consultar

```sql norun
SELECT canal, COUNT(*) AS pedidos
FROM dbo.pedidos
GROUP BY canal
ORDER BY pedidos DESC;
```

**Run** (o Ctrl+Enter):

```captura
archivo: fabric/b06-consulta.webp
texto: La consulta (1) y el resultado (2) - web 5400, app 2973, tienda 2645, telefono 982
```

## Paso 3 — Solo lectura

Prueba:

```sql norun
DELETE FROM dbo.pedidos WHERE estado = 'cancelado';
```

```captura
archivo: fabric/b06-solo-lectura.webp
texto: "The data manipulation language (DML) statement 'DELETE FROM' is not supported" - el endpoint es de solo lectura
```

El endpoint SQL **no escribe**: las tablas del lakehouse las escribe **Spark** (notebooks, Load to Tables, pipelines). Lo que sí puedes crear en el endpoint son **vistas** y funciones para consultar.

| Necesitas | Dónde |
|---|---|
| Consultar el lakehouse con SQL | **SQL analytics endpoint** |
| Transformar y escribir tablas del lakehouse | **Notebook** (Spark) |
| Escribir con T-SQL (INSERT, UPDATE, MERGE) | **Warehouse** (lección 13) |

:::tip Una cadena de conexión para todo
El endpoint tiene una cadena de conexión SQL: SQL Server Management Studio, Azure Data Studio, Excel o Power BI Desktop se conectan a él como a cualquier base SQL Server.
:::

:::errores
- **Intentar `DELETE` o `INSERT` en el endpoint.** Es de solo lectura sobre las tablas; las escrituras van con Spark o en un warehouse.
- **Creer que el endpoint copia los datos.** Lee las mismas tablas Delta; no hay que sincronizar nada (puede tardar unos segundos en ver una tabla nueva).
- **Repetir la misma lógica en cada informe.** Las vistas sí se pueden crear en el endpoint: guarda ahí la consulta que usan todos.
:::

## ✅ Lo que lograste

- Consultaste el lakehouse con T-SQL desde su endpoint.
- Sabes por qué el endpoint es de solo lectura y dónde escribir.

:::ejercicio quiz
¿Qué es el SQL analytics endpoint?
- [ ] Una copia de las tablas en otra base
- [x] Una vista SQL de solo lectura de las tablas del lakehouse
- [ ] Un warehouse
- [ ] Un warehouse que se llena con una copia nocturna
:::

:::ejercicio quiz
Necesitas borrar los pedidos cancelados de una tabla del lakehouse. ¿Dónde?
- [ ] En el endpoint SQL con DELETE
- [x] En un notebook con Spark
- [ ] En el modelo semántico, con DAX
- [ ] En el endpoint SQL con TRUNCATE
:::

:::ejercicio quiz
¿Qué se puede crear en el endpoint SQL?
- [ ] Tablas nuevas con INSERT
- [x] Vistas
- [ ] Tablas nuevas con SELECT INTO
- [ ] Índices sobre las tablas Delta
:::

:::ejercicio quiz
¿Dónde escribes con T-SQL completo (INSERT, UPDATE, MERGE)?
- [ ] En el endpoint del lakehouse
- [x] En un Warehouse
- [ ] En un notebook Python
- [ ] En el SQL analytics endpoint, con permisos de Admin
:::
