---
titulo: Proyecto 3 (semiguiado) - la tabla de hechos de ventas
nivel: 3 · Intermedio
duracion: 50
resumen: Comercial va a consultar ventas por fecha, canal y país todos los días. Construyes analitica.hechos_ventas - el detalle de pedidos entregados con su país, particionada por fecha y con clustering por canal y país - y compruebas que la consulta típica lee una fracción mínima de la tabla. Pistas escondidas.
objetivos: Diseñar una tabla de hechos para las consultas del negocio | Elegir partición y clustering según los filtros reales | Medir lo que lee la consulta típica | Justificar el diseño
prerrequisitos: bigquery-paso-a-paso-vistas-struct-array-y-unnest
autoevaluacion: ¿La tabla está particionada por la fecha que filtra el negocio? | ¿El clustering usa canal y país? | ¿La consulta típica lee menos del 10 % de la tabla? | ¿Sabes defender por qué no una vista?
---

:::escenario El pedido
Comercial: *"Todos los días miramos ventas del último trimestre por país, a veces solo un canal. Que sea rápido y barato."*
:::

## Lo que tienes que lograr

1. `analitica.hechos_ventas` con fecha, canal, país, producto, cantidad e importe de los pedidos **entregados**.
2. Partición y clustering según cómo consulta comercial.
3. La consulta "ventas web del cuarto trimestre por país" leyendo una fracción chica de la tabla.

<details><summary>💡 Pista: ¿por qué columnas?</summary>

Comercial **siempre** filtra por fecha (partición) y **a veces** por canal y país (clustering, hasta 4 columnas, en orden de cuánto se filtran).
</details>

## Cómo se ve terminado

```captura
archivo: bigquery/q12-consulta.webp
texto: La estimación de la consulta típica (1), las ventas web del trimestre por país (2) y lo que se leyó - 4 columnas y una fracción de la tabla (3)
```

## ✅ Lista de verificación

- [ ] La tabla está particionada por `fecha` y con clustering por `canal, pais`.
- [ ] La consulta del trimestre lee una fracción chica (mira "Qué se leyó" en el job).
- [ ] Sabes por qué es una tabla y no una vista.

<details><summary>💡 Solución comentada</summary>

```sql norun
CREATE OR REPLACE TABLE analitica.hechos_ventas
PARTITION BY fecha
CLUSTER BY canal, pais
AS
SELECT p.fecha_pedido AS fecha, p.canal, c.pais,
       d.producto_id, d.cantidad,
       ROUND(d.cantidad * d.precio_unitario, 2) AS importe
FROM tienda.pedidos AS p
JOIN tienda.clientes AS c ON c.cliente_id = p.cliente_id
JOIN tienda.detalle_pedidos AS d ON d.pedido_id = p.pedido_id
WHERE p.estado = 'entregado';

SELECT pais, ROUND(SUM(importe), 2) AS ventas
FROM analitica.hechos_ventas
WHERE fecha BETWEEN '2024-10-01' AND '2024-12-31'
  AND canal = 'web'
GROUP BY pais
ORDER BY ventas DESC
LIMIT 5;
```

**Por qué una tabla y no una vista:** la vista repetiría los dos JOIN en cada consulta de comercial (y los cobraría). La tabla los paga una vez, al construirse, y queda optimizada para el filtro real. En producción se refresca cada día (nivel 5) o con un MERGE incremental (nivel 4).
</details>

## Lo que aprendiste en el nivel 3

- Particiones y clustering.
- Cargas desde archivos.
- Vistas y datos anidados.

En el nivel 4: MERGE, time travel y SQL analítico.

:::ejercicio quiz
Comercial siempre filtra por fecha y a veces por canal y país. ¿Qué diseño eliges?
- [x] Partición por fecha y clustering por canal y país
- [ ] Partición por país y clustering por fecha
- [ ] Sin partición
- [ ] Una vista sin filtros
:::

:::ejercicio quiz
¿Por qué conviene una tabla de hechos y no una vista con los JOIN?
- [ ] Porque las vistas no existen
- [x] Porque la vista repetiría (y cobraría) los JOIN en cada consulta
- [ ] Porque la tabla nunca cambia
- [ ] Da igual
:::

:::ejercicio quiz
¿Dónde ves qué fracción de la tabla leyó una consulta?
- [ ] En el explorador
- [x] En la información del job, "Qué se leyó"
- [ ] En Preview
- [ ] No se puede ver
:::

:::ejercicio quiz
¿En qué orden van las columnas de CLUSTER BY?
- [x] De la que más se filtra a la que menos
- [ ] Alfabético
- [ ] Al azar
- [ ] Da igual
:::
