---
titulo: Fuentes y accesos - el ERP, las cajas y la planilla de metas
nivel: Avanzado
duracion: 40
resumen: Cómo conectarte al ERP (PostgreSQL de solo lectura), la API de las cajas (tickets por sucursal y día, paginada), la planilla de metas y las reglas de negocio acordadas con Dirección y Comercial.
objetivos: Sacar una foto diaria de una base de datos operativa | Paginar una API por sucursal y día | Leer una planilla hecha para personas | Aplicar reglas de negocio de ventas y margen
prerrequisitos: proyecto-almacenes-sol-el-pedido
autoevaluacion: ¿Sabes cómo exportar una consulta a CSV con psql? | ¿Sabes cuándo están disponibles las ventas de un día? | ¿Sabes qué es una venta neta?
---

## Accesos

```bash
sol accesos
```

## El ERP · PostgreSQL 9.6 · `erp-sol.almacenes.example`

Usuario de **solo lectura**. Tablas: `sucursales`, `categorias` y `productos` (`id`, `sku`, `nombre`, `categoria`, `precio`, `costo`, `activo`, `ult_modif`).

```bash
PGPASSWORD='…' psql -h erp-sol.almacenes.example -U consulta_bi -d erp -c "SELECT sku, nombre, categoria, precio, costo FROM productos LIMIT 5"
```

- El **proceso nocturno de precios** corre a las **03:00** y pisa `precio` y `costo`. Actualiza `ult_modif`. Saca la foto **después** de las 03:00 (y antes de que abran las sucursales, a las 08:00) para que sea el catálogo con el que se vendió ese día.
- No hay tabla de historial. Lo que cambió ayer ya no se ve hoy.
- Para llevarte una foto a un archivo: `\copy (SELECT …) TO 'archivo.csv' WITH CSV HEADER`. Ponle la fecha al nombre del archivo.

:::cuidado ult_modif no es la verdad
Es tentador hacer una carga incremental "lo que cambió desde la última vez" con `WHERE ult_modif > …`. Funciona mientras **todos** los cambios pasen por el proceso que la actualiza. Un cambio cargado a mano directo en la base no la toca, y tu incremental no lo ve. Comparar la foto completa con la anterior no tiene ese problema.
:::

## Las cajas · `https://api.possol.example/v1`

Cabecera `X-Api-Key`.

| Ruta | Qué devuelve |
|---|---|
| `GET /v1/sucursales` | Las 8 sucursales |
| `GET /v1/tickets?sucursal=S01&fecha=AAAA-MM-DD&pagina=1` | Los tickets de una sucursal y un día, de a **200** por página. La respuesta trae `paginas` |

- Cada sucursal sincroniza el cierre de caja a las **02:00 del día siguiente**. Antes, la API responde **404**.
- `fecha_hora` es la hora **local** de la sucursal, sin zona.
- Cada ticket trae `medio_pago`, `anulado` y sus `lineas` (`sku`, `cantidad`, `precio_unitario`, `descuento`).

## La planilla de metas

```bash
sol metas descargar
```

La mantiene Planeamiento a mano: una meta de ventas por sucursal y semana (de lunes a domingo). Es una planilla pensada para leerla una persona: títulos, separador `;`, montos con `$` y puntos de miles, una fila de totales. Puede cambiar de forma sin aviso.

## Las reglas (acordadas con Dirección y Comercial)

- **Venta neta** de una línea = `cantidad × precio_unitario − descuento`.
- Los tickets **anulados** no cuentan (ni en ventas ni en cantidad de tickets).
- **Margen bruto** = ventas netas − `cantidad × costo`, con el costo **vigente el día de la venta**.
- Un día es el día local de la sucursal. Una semana va de lunes a domingo; `semana_desde` es el lunes.
- **Cumplimiento** = ventas de la semana / meta × 100, con un decimal.

```sql norun
-- unir cada venta con la versión del producto vigente en ese momento
SELECT v.*, d.costo
FROM ventas v
JOIN sol.silver.dim_producto d
  ON d.sku = v.sku
 AND v.fecha >= d.valido_desde
 AND (d.valido_hasta IS NULL OR v.fecha < d.valido_hasta);
```

## Ejercicios

:::ejercicio quiz
Son las 23:00 y pides los tickets de hoy de S03. ¿Qué responde la API?
- [ ] Los tickets hasta ahora
- [x] 404: el cierre de caja se sincroniza a las 02:00 del día siguiente
- [ ] Una lista vacía
- [ ] 401
:::

:::ejercicio quiz
Un ticket tiene dos líneas: 2 × $500 con $100 de descuento, y 1 × $300. Está anulado. ¿Cuánto suma a las ventas netas?
- [ ] $1.300
- [ ] $1.200
- [x] $0: los anulados no cuentan
- [ ] $1.100
:::

## Resumen

- ERP: foto diaria completa con `\copy`, no un incremental por `ult_modif`.
- Cajas: por sucursal y día, paginado, disponible desde las 02:00 del día siguiente.
- Planilla: hecha para personas, puede cambiar de forma.
- Venta neta, sin anulados, margen con el costo del día.
