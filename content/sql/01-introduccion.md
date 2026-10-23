---
titulo: ¿Qué es SQL? Tu primera consulta
nivel: Básico
duracion: 15
resumen: Bases de datos relacionales, el dataset del curso y SELECT * FROM.
---

**SQL** (*Structured Query Language*, se pronuncia “ese-cu-ele” o “sícuel”) es el lenguaje para hablar con las **bases de datos relacionales**: conjuntos de tablas relacionadas entre sí. Lo inventó IBM en los años 70 y hoy lo usan desde una app del celular hasta Databricks procesando petabytes. Aprender SQL es **la habilidad número uno** de cualquier perfil de datos.

:::analogia SQL es pedir en un restaurante
No le dices al cocinero *cómo* cocinar (“prende el fuego, corta la cebolla…”). Le dices **qué** quieres: “un plato de pasta, sin queso, para dos”. SQL es igual: es un lenguaje **declarativo**. Describes el resultado que quieres y la base de datos decide la mejor forma de obtenerlo.
:::

## Las tablas de Tienda Andina

Trabajaremos con una base de datos **SQLite** que corre en tu navegador. Las tablas principales:

| Tabla | Qué contiene |
|---|---|
| `clientes` | 2.000 clientes con nombre, email, ciudad, país, segmento… |
| `productos` | 300 productos con precio, costo, marca, stock |
| `categorias` | Categorías de productos (con subcategorías) |
| `pedidos` | 12.000 pedidos con fecha, estado y canal |
| `detalle_pedidos` | Qué productos y cuántas unidades tiene cada pedido |
| `pagos`, `empleados`, `departamentos`, `eventos_web`, … | ¡Y más! Míralas en [Los datos](#/datos) |

## Tu primera consulta

```sql
SELECT * FROM productos;
```

Se lee: “**selecciona** todas las columnas (`*`) **de** la tabla `productos`”. Pruébala con el botón ▶.

- `SELECT` dice **qué columnas** quieres.
- `FROM` dice **de qué tabla**.
- El `;` marca el final de la sentencia (en una sola consulta es opcional).
- Las mayúsculas en `SELECT` y `FROM` son una convención para leer mejor: SQL no distingue mayúsculas en las palabras clave. `select * from productos` también funciona.

## Ver solo algunas filas

Las tablas reales pueden tener millones de filas. Para echar un vistazo usa `LIMIT`:

```sql
SELECT * FROM clientes LIMIT 5;
```

:::tip Explora sin miedo
Haz clic en **📋 Tablas** en cualquier ejercicio para ver las columnas de cada tabla, o ve al [Laboratorio SQL](#/lab/sql) para experimentar libremente.
:::

## Ejercicios

:::ejercicio sql
Muestra **todas las columnas** de la tabla `departamentos`.
```sql inicial
SELECT 
```
```sql solucion
SELECT * FROM departamentos;
```
```pista
Usa `SELECT *` y después `FROM` con el nombre de la tabla.
```
:::

:::ejercicio sql
Muestra todas las columnas de las **primeras 10 filas** de la tabla `pedidos`.
```sql solucion
SELECT * FROM pedidos LIMIT 10;
```
```pista
Agrega `LIMIT 10` al final.
```
:::

:::ejercicio quiz
SQL es un lenguaje **declarativo**. ¿Qué significa eso?

- [ ] Que hay que declarar variables antes de usarlas
- [x] Que describes **qué** resultado quieres y el motor decide **cómo** obtenerlo
- [ ] Que solo sirve para declarar tablas
- [ ] Que distingue mayúsculas de minúsculas
:::
