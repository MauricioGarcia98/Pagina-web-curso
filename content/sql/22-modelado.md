---
titulo: Modelado de datos: normalización y esquema estrella
nivel: Experto
duracion: 35
resumen: Normalización, OLTP vs OLAP, hechos y dimensiones, granularidad y SCD tipo 2.
---

Saber consultar es la mitad del trabajo. La otra mitad es **diseñar** las tablas para que las consultas sean simples, correctas y rápidas.

## Normalización (mundo OLTP)

**Normalizar** es repartir los datos en tablas para que cada dato viva en **un solo lugar**. Así evitas inconsistencias (el mismo cliente con dos direcciones distintas en dos pedidos).

| Forma normal | Regla (simplificada) |
|---|---|
| **1FN** | Cada celda tiene un solo valor (nada de “tel1, tel2” en una celda) |
| **2FN** | Cada columna depende de **toda** la clave primaria |
| **3FN** | Las columnas no dependen de otras columnas que no son clave (el nombre del cliente no se guarda en la tabla de pedidos) |

Nuestras tablas `pedidos`, `clientes`, `detalle_pedidos` están normalizadas: por eso necesitamos JOINs.

## Modelado dimensional (mundo OLAP / analítica)

Para **analizar**, conviene lo contrario: menos tablas y más anchas, pensadas para agregar rápido. El modelo más usado es el **esquema estrella** (*star schema*), de Ralph Kimball:

- **Tabla de hechos** (*fact*): los eventos medibles del negocio, con **métricas** numéricas y **claves** a dimensiones. Ej.: `fct_ventas` (una fila por línea de pedido: unidades, importe, descuento).
- **Tablas de dimensiones** (*dim*): el contexto descriptivo: `dim_cliente`, `dim_producto`, `dim_fecha`, `dim_canal`.

```text
                 dim_fecha
                     |
  dim_cliente — fct_ventas — dim_producto
                     |
                 dim_canal
```

:::tip La pregunta más importante: ¿cuál es la granularidad?
Antes de diseñar una tabla de hechos, define su **grano**: “una fila representa…”. Por ejemplo: “una fila por producto en cada pedido”. Mezclar granos (líneas y pedidos en la misma tabla) es la fuente número uno de totales duplicados.
:::

## Dimensiones lentamente cambiantes (SCD)

¿Qué pasa si un cliente se muda de Lima a Santiago? Las ventas viejas, ¿se reportan en Lima o en Santiago?

| Tipo | Estrategia | Resultado |
|---|---|---|
| **SCD tipo 1** | Sobrescribir | Se pierde la historia: todo aparece en Santiago |
| **SCD tipo 2** | Agregar una fila nueva con vigencia (`valido_desde`, `valido_hasta`, `es_actual`) | Se conserva la historia |
| SCD tipo 3 | Columna “valor anterior” | Historia limitada |

Ejemplo de SCD2:

| cliente_sk | cliente_id | ciudad | valido_desde | valido_hasta | es_actual |
|---|---|---|---|---|---|
| 101 | 7 | Lima | 2022-01-01 | 2024-05-31 | 0 |
| 245 | 7 | Santiago | 2024-06-01 | 9999-12-31 | 1 |

`cliente_sk` es una **clave subrogada** (*surrogate key*): un identificador interno de cada versión. En dbt esto se automatiza con **snapshots**.

## Otras arquitecturas que vas a escuchar

- **One Big Table (OBT)**: una sola tabla gigante y desnormalizada; simple para BI, costosa de mantener.
- **Data Vault**: hubs, links y satellites; muy auditable, usado en empresas grandes.
- **Medallón** (bronze / silver / gold): capas de calidad en un lakehouse. Bronze = crudo, Silver = limpio y conformado, Gold = listo para negocio (a menudo en esquema estrella).

## Ejercicios

:::ejercicio sql
Construye una **tabla de hechos** de ventas con grano “una fila por línea de pedido” para pedidos no cancelados, con: `detalle_id`, `pedido_id`, `fecha` (fecha del pedido), `cliente_id`, `producto_id`, `canal`, `unidades` (cantidad), `importe_bruto` (cantidad × precio, redondeado a 2) e `importe_neto` (con descuento, redondeado a 2).
```sql solucion
SELECT d.detalle_id, d.pedido_id, p.fecha_pedido AS fecha, p.cliente_id, d.producto_id, p.canal,
       d.cantidad AS unidades,
       ROUND(d.cantidad * d.precio_unitario, 2) AS importe_bruto,
       ROUND(d.cantidad * d.precio_unitario * (1 - d.descuento), 2) AS importe_neto
FROM detalle_pedidos d JOIN pedidos p ON p.pedido_id = d.pedido_id
WHERE p.estado <> 'cancelado';
```
:::

:::ejercicio sql
Construye una **dimensión de producto** desnormalizada: `producto_id`, `producto` (nombre), `marca`, `subcategoria` (nombre de su categoría) y `categoria` (nombre de la categoría **padre** de esa subcategoría; si no tiene padre, la propia subcategoría).
```sql solucion
SELECT p.producto_id, p.nombre AS producto, p.marca, c.nombre AS subcategoria,
       COALESCE(padre.nombre, c.nombre) AS categoria
FROM productos p
JOIN categorias c ON c.categoria_id = p.categoria_id
LEFT JOIN categorias padre ON padre.categoria_id = c.categoria_padre_id;
```
```pista
Une `categorias` dos veces: una para la subcategoría y otra (LEFT JOIN) para su padre.
```
:::

:::ejercicio quiz
En una tabla de hechos `fct_pedidos` (una fila por pedido) agregas la columna `unidades` de cada **producto**. ¿Cuál es el problema?

- [ ] Ninguno, es más eficiente
- [x] Mezclas granularidades: un pedido tiene varios productos, así que las filas se duplican o los totales se distorsionan
- [ ] Los pedidos no tienen unidades
- [ ] SQL no permite esa columna
:::

:::ejercicio quiz
Un cliente cambia de segmento de “Pyme” a “Corporativo”. Necesitas que los informes de ventas **pasadas** sigan mostrando “Pyme”. ¿Qué técnica usas?

- [ ] SCD tipo 1
- [x] SCD tipo 2
- [ ] Borrar el cliente y crearlo de nuevo
- [ ] Un índice
:::
