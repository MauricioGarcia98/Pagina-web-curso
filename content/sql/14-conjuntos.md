---
titulo: UNION, INTERSECT y EXCEPT
nivel: Intermedio
duracion: 15
resumen: Combinar resultados de varias consultas verticalmente.
---

Los JOIN combinan tablas **a lo ancho** (agregan columnas). Los operadores de conjuntos combinan resultados **a lo largo** (agregan filas).

| Operador | Resultado |
|---|---|
| `UNION` | Filas de ambas consultas, **sin duplicados** |
| `UNION ALL` | Filas de ambas consultas, **con duplicados** (más rápido) |
| `INTERSECT` | Filas que están en **ambas** |
| `EXCEPT` (`MINUS` en Oracle) | Filas de la primera que **no están** en la segunda |

Reglas: ambas consultas deben tener **el mismo número de columnas** y tipos compatibles. Los nombres de las columnas salen de la primera consulta. El `ORDER BY` va una sola vez, al final.

```sql
-- Un directorio de contactos: clientes y empleados juntos
SELECT nombre, apellido, email, 'cliente' AS tipo FROM clientes WHERE pais = 'Uruguay'
UNION ALL
SELECT nombre, apellido, email, 'empleado' FROM empleados WHERE departamento_id = 8
ORDER BY apellido;
```

:::tip ¿UNION o UNION ALL?
Usa `UNION ALL` salvo que **necesites** eliminar duplicados. `UNION` tiene que ordenar o comparar todo para quitarlos, lo cual es costoso con muchos datos.
:::

```sql
-- Ciudades donde hay clientes Y oficinas de algún departamento
SELECT ciudad FROM clientes
INTERSECT
SELECT ciudad FROM departamentos;
```

## Ejercicios

:::ejercicio sql
Muestra una lista **sin duplicados** de todas las ciudades donde hay clientes **o** departamentos. Una columna: `ciudad`.
```sql solucion
SELECT ciudad FROM clientes UNION SELECT ciudad FROM departamentos;
```
:::

:::ejercicio sql
¿Qué `cliente_id` compraron en **2022** pero **no** volvieron a comprar en **2024**? Usa `EXCEPT`.
```sql solucion
SELECT cliente_id FROM pedidos WHERE fecha_pedido < '2023-01-01' AND fecha_pedido >= '2022-01-01'
EXCEPT
SELECT cliente_id FROM pedidos WHERE fecha_pedido >= '2024-01-01';
```
:::

:::ejercicio sql
¿Qué `cliente_id` compraron por el canal `web` **y también** por el canal `tienda`? Usa `INTERSECT`.
```sql solucion
SELECT cliente_id FROM pedidos WHERE canal = 'web'
INTERSECT
SELECT cliente_id FROM pedidos WHERE canal = 'tienda';
```
:::
