---
titulo: Proyecto 1 (guiado) - las ventas por país
nivel: 1 · Básico
duracion: 40
resumen: Comercial pide las ventas de pedidos entregados por país. Escribes la consulta que une pedidos, clientes y detalle, la ejecutas en una hoja propia, interpretas el resultado y aprendes a leer un error de Snowflake. Guiado paso a paso.
objetivos: Escribir una consulta con dos JOIN y agregación | Ejecutarla en una hoja con nombre | Interpretar el resultado | Leer y corregir un error de compilación
prerrequisitos: snowflake-paso-a-paso-explorar-datos
autoevaluacion: ¿La consulta une las tres tablas correctamente? | ¿Filtra solo entregados? | ¿Sabes qué significa "does not exist or not authorized"? | ¿Sabes dónde está el error en el mensaje?
---

:::escenario El pedido
Comercial: *"Necesito cuántos pedidos entregados y cuánto vendimos en cada país, ordenado de mayor a menor."*
:::

## Paso 1 — La consulta

Hoja nueva, nombre **Ventas por país**:

```sql norun
SELECT c.pais,
       COUNT(DISTINCT p.pedido_id) AS pedidos,
       ROUND(SUM(d.cantidad * d.precio_unitario), 2) AS ventas
FROM pedidos p
JOIN clientes c ON c.cliente_id = p.cliente_id
JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
WHERE p.estado = 'entregado'
GROUP BY c.pais
ORDER BY ventas DESC;
```

| Parte | Por qué |
|---|---|
| `JOIN clientes` | El país está en el cliente, no en el pedido |
| `JOIN detalle_pedidos` | El importe está en cada línea del pedido |
| `COUNT(DISTINCT p.pedido_id)` | Un pedido tiene varias líneas: sin `DISTINCT` contarías líneas |
| `WHERE p.estado = 'entregado'` | Solo lo que se concretó |

## Paso 2 — El resultado

```captura
archivo: snowflake/s04-ventas.webp
texto: La consulta (1) y el resultado por país (2) - Argentina, México y España a la cabeza
```

## Paso 3 — Un error a propósito

Escribe `FROM pedido` (sin la s):

```captura
archivo: snowflake/s04-error.webp
texto: SQL compilation error - Object 'PEDIDO' does not exist or not authorized
```

| Parte del mensaje | Qué dice |
|---|---|
| `000904 (42000)` | Código del error |
| `SQL compilation error` | Falló al compilar: la consulta ni empezó a correr |
| `does not exist or not authorized` | O el nombre está mal, **o** tu rol no tiene permiso. Snowflake no dice cuál, por seguridad |

:::tip Antes de pedir permiso
Ante "does not exist or not authorized", revisa primero el nombre y el contexto (base y esquema). Si están bien, es un tema de permisos (nivel 5).
:::

## ✅ Lista de verificación

- [ ] La hoja se llama "Ventas por país".
- [ ] El resultado tiene una fila por país, ordenado por ventas.
- [ ] Sabes por qué va `COUNT(DISTINCT ...)`.
- [ ] Sabes leer el mensaje de error.

## Lo que aprendiste en el nivel 1

- Qué es Snowflake y Snowsight.
- Hojas SQL y el contexto.
- Explorar datos y leer errores.

En el nivel 2: warehouses, bases, esquemas, tablas y el historial.

:::ejercicio quiz
¿Por qué se usa COUNT(DISTINCT p.pedido_id)?
- [ ] Porque COUNT no existe
- [x] Porque al unir con el detalle cada pedido aparece una vez por línea
- [ ] Para que sea más rápido
- [ ] Por estética
:::

:::ejercicio quiz
¿Qué significa "does not exist or not authorized"?
- [ ] Que Snowflake está caído
- [x] Que el nombre está mal o el rol no tiene permiso
- [ ] Que la tabla está vacía
- [ ] Que falta un warehouse
:::

:::ejercicio quiz
¿Qué indica "SQL compilation error"?
- [x] Que la consulta falló antes de empezar a ejecutarse
- [ ] Que corrió a medias
- [ ] Que se borró la tabla
- [ ] Que gastó muchos créditos
:::

:::ejercicio quiz
¿Dónde está el país del pedido en este modelo?
- [ ] En pedidos
- [x] En clientes
- [ ] En detalle_pedidos
- [ ] En productos
:::
