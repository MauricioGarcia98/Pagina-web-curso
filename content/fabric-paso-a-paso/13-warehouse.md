---
titulo: Warehouse - T-SQL con escritura y consultas entre ítems
nivel: 4 · Intermedio-avanzado
duracion: 45
resumen: El warehouse de Fabric es una base analítica con T-SQL completo, que también guarda sus tablas en OneLake en formato Delta. Creas wh_ventas, una tabla de metas por tienda con CREATE TABLE e INSERT, y la cruzas con las ventas del lakehouse en una sola consulta usando nombres de tres partes.
objetivos: Crear un warehouse | Crear tablas e insertar datos con T-SQL | Consultar tablas de un lakehouse desde el warehouse con nombres de tres partes | Elegir entre lakehouse y warehouse
prerrequisitos: fabric-paso-a-paso-proyecto-cargar-y-transformar
autoevaluacion: ¿Sabes qué puede hacer el warehouse que el endpoint SQL no? | ¿Sabes escribir un nombre de tres partes? | ¿Sabes en qué formato guarda el warehouse? | ¿Sabes cuándo elegir warehouse?
---

:::escenario El pedido
Lucía: *"Comercial nos manda las metas de unidades de cada tienda para noviembre. Necesito ver la meta junto a lo vendido."*
:::

:::analogia La base de siempre, guardada en el lago
El warehouse es la base relacional que conocen los analistas SQL (CREATE TABLE, INSERT, UPDATE, MERGE), con una diferencia: sus tablas también se guardan como Delta en OneLake, así que Spark y Power BI las pueden leer sin copiarlas.
:::

## Paso 1 — Crear el warehouse

**New item → Warehouse**, `wh_ventas`:

```captura
archivo: fabric/b13-warehouse.webp
texto: La cinta (1), el explorador con esquemas, tablas, vistas y procedimientos (2) y el editor SQL (3)
```

## Paso 2 — Crear e insertar

```sql norun
CREATE TABLE dbo.metas_tienda (
  tienda VARCHAR(50),
  mes DATE,
  meta_unidades INT
);
INSERT INTO dbo.metas_tienda VALUES
  ('Lima Centro', '2026-11-01', 40),
  ('Bogotá Norte', '2026-11-01', 35),
  ('CDMX Roma', '2026-11-01', 30),
  ('Santiago Providencia', '2026-11-01', 25);
```

```captura
archivo: fabric/b13-create-insert.webp
texto: El T-SQL (1) y "Commands completed successfully" (2)
```

A diferencia del endpoint SQL del lakehouse, el warehouse acepta **CREATE TABLE, INSERT, UPDATE, DELETE, MERGE** y transacciones.

## Paso 3 — Consultar entre ítems

Desde el warehouse se leen las tablas de un lakehouse del mismo workspace con **tres partes**: `ítem.esquema.tabla`:

```sql norun
SELECT m.tienda, m.meta_unidades, u.unidades
FROM dbo.metas_tienda AS m
JOIN (SELECT tienda, SUM(cantidad) AS unidades
      FROM lh_ventas.dbo.ventas_tiendas GROUP BY tienda) AS u
  ON u.tienda = m.tienda;
```

```captura
archivo: fabric/b13-cruzada.webp
texto: La consulta que une el warehouse con el lakehouse (1) y su resultado (2)
```

Sin copiar nada: los dos guardan en OneLake y el motor SQL los lee juntos.

## Paso 4 — ¿Lakehouse o warehouse?

| Si el equipo… | Conviene |
|---|---|
| Trabaja con Spark, Python, archivos y datos semiestructurados | **Lakehouse** |
| Trabaja con SQL y necesita escribir con T-SQL (cargas, MERGE, procedimientos) | **Warehouse** |
| Tiene los dos perfiles | **Los dos**: el lakehouse para ingesta y transformación, el warehouse como capa de presentación |

:::errores
- **Buscar las tablas del lakehouse sin nombre completo.** Desde el warehouse se leen con `lh_ventas.dbo.tabla`.
- **Elegir lakehouse para un equipo 100 % SQL que escribe con MERGE.** El endpoint del lakehouse no escribe; el warehouse sí.
- **Pensar que el warehouse guarda en un formato cerrado.** Guarda Delta en OneLake, legible por otras herramientas.
:::

## ✅ Lo que lograste

- Creaste un warehouse y escribiste con T-SQL.
- Cruzaste el warehouse con el lakehouse en una consulta.
- Sabes cuándo elegir cada uno.

:::ejercicio quiz
¿Qué puede hacer el warehouse que el endpoint SQL del lakehouse no?
- [ ] Consultar con SELECT
- [x] Escribir: CREATE TABLE, INSERT, UPDATE, DELETE, MERGE
- [ ] Mostrar tablas
- [ ] Crear vistas
:::

:::ejercicio quiz
¿Cómo lees la tabla ventas_tiendas de lh_ventas desde el warehouse?
- [ ] `ventas_tiendas@lh_ventas`
- [x] `lh_ventas.dbo.ventas_tiendas`
- [ ] `Files/ventas_tiendas`
- [ ] Con un acceso directo obligatorio en el warehouse
:::

:::ejercicio quiz
¿En qué formato guarda el warehouse sus tablas?
- [ ] CSV
- [x] Delta, en OneLake
- [ ] Parquet sin registro de transacciones
- [ ] Un formato propio que nadie más lee
:::

:::ejercicio quiz
El equipo es de analistas SQL que cargan datos con MERGE. ¿Qué ítem conviene?
- [x] Warehouse
- [ ] Lakehouse con su endpoint
- [ ] Solo notebooks
- [ ] Un Dataflow Gen2
:::
