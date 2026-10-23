---
titulo: "Caso ☁️ Nube Pyme: MRR, retención neta y soporte"
nivel: Experto
duracion: 60
resumen: MRR, movimientos de MRR (nuevo, expansión, contracción, churn), ARPA, NRR, cobranza y SLA de soporte.
---

**Nube Pyme** vende un software de gestión a pequeñas y medianas empresas, con tres planes mensuales. Es el tipo de empresa donde las métricas de suscripción lo son todo, y donde un Analytics/Data Engineer las calcula para el directorio y los inversores.

## El modelo de datos

```text
saas_planes (plan_id, nombre, precio_mensual)            -- 1 Básico 49, 2 Profesional 149, 3 Empresa 499
saas_empresas (empresa_id, nombre, industria, pais, empleados, fecha_alta)
saas_facturas (factura_id, empresa_id, plan_id, mes, monto, estado)   -- una por empresa y mes activo
saas_tickets (ticket_id, empresa_id, fecha_creacion, fecha_cierre, prioridad, categoria, satisfaccion)
```

- Si una empresa tiene factura en un mes, estuvo **activa** ese mes. El **MRR** del mes = suma de `monto` de las facturas del mes.
- Comparando el MRR de cada empresa entre un mes y el anterior se obtienen los **movimientos de MRR**:

| Movimiento | Condición (empresa) |
|---|---|
| **Nuevo** | No facturó el mes anterior y sí este mes (y es su primer mes) |
| **Expansión** | Facturó ambos meses y este mes paga **más** |
| **Contracción** | Facturó ambos meses y paga **menos** |
| **Churn** | Facturó el mes anterior y **no** este mes |

- **NRR** (*Net Revenue Retention*): MRR de hoy de las empresas que ya eran clientes hace 12 meses / su MRR de hace 12 meses. Más de 100% = crecen aunque no entren clientes nuevos.
- **SLA de soporte**: un ticket `critica` debe cerrarse en 24 h; `alta` en 48 h.

## Ejercicios

:::ejercicio sql ordenado titulo="MRR y clientes activos"
Para cada mes de 2024 (`mes`), el MRR (`mrr`), la cantidad de empresas activas (`empresas`) y el **ARPA** (ingreso promedio por cuenta, `arpa` = mrr / empresas, redondeado a 2). Ordena por mes.
```sql solucion
SELECT mes, SUM(monto) AS mrr, COUNT(DISTINCT empresa_id) AS empresas,
       ROUND(1.0 * SUM(monto) / COUNT(DISTINCT empresa_id), 2) AS arpa
FROM saas_facturas
WHERE mes >= '2024-01-01'
GROUP BY mes ORDER BY mes;
```
:::

:::ejercicio sql ordenado titulo="Movimientos de MRR"
Para cada mes de 2024 (`mes`), calcula el MRR `nuevo`, de `expansion`, de `contraccion` (como número **positivo**) y de `churn` (positivo: el MRR que se perdió). Ordena por mes.
```sql solucion
WITH m AS (
  SELECT empresa_id, mes, SUM(monto) AS mrr FROM saas_facturas GROUP BY empresa_id, mes
),
meses AS (SELECT DISTINCT mes FROM saas_facturas),
pares AS (
  -- cada empresa en cada mes, con su MRR de ese mes y el del mes anterior
  SELECT x.mes, e.empresa_id,
         COALESCE(a.mrr, 0) AS actual,
         COALESCE(b.mrr, 0) AS anterior,
         (SELECT MIN(mes) FROM m WHERE m.empresa_id = e.empresa_id) AS primer_mes
  FROM meses x
  CROSS JOIN (SELECT DISTINCT empresa_id FROM m) e
  LEFT JOIN m a ON a.empresa_id = e.empresa_id AND a.mes = x.mes
  LEFT JOIN m b ON b.empresa_id = e.empresa_id AND b.mes = date(x.mes, '-1 month')
)
SELECT mes,
       SUM(CASE WHEN anterior = 0 AND actual > 0 AND mes = primer_mes THEN actual ELSE 0 END) AS nuevo,
       SUM(CASE WHEN anterior > 0 AND actual > anterior THEN actual - anterior ELSE 0 END) AS expansion,
       SUM(CASE WHEN anterior > 0 AND actual > 0 AND actual < anterior THEN anterior - actual ELSE 0 END) AS contraccion,
       SUM(CASE WHEN anterior > 0 AND actual = 0 THEN anterior ELSE 0 END) AS churn
FROM pares
WHERE mes >= '2024-01-01'
GROUP BY mes ORDER BY mes;
```
```pista
Arma una grilla empresa × mes (CROSS JOIN), trae el MRR del mes y el del mes anterior con dos LEFT JOIN (`date(mes, '-1 month')`), y clasifica con CASE.
```
```explicacion
Comprobación de sentido común: **MRR(mes) = MRR(mes anterior) + nuevo + expansión − contracción − churn**. Si tus números no cumplen esta identidad, hay un error lógico.
```
:::

:::ejercicio sql titulo="Retención neta (NRR) anual"
Calcula el **NRR** de diciembre de 2024 contra diciembre de 2023: toma las empresas que facturaron en `2023-12-01`; suma su MRR en ese mes (`mrr_inicial`) y su MRR en `2024-12-01` (`mrr_final`, 0 si se fueron). Columnas: `empresas`, `mrr_inicial`, `mrr_final`, `nrr_pct` (redondeado a 2).
```sql solucion
WITH ini AS (SELECT empresa_id, SUM(monto) AS mrr FROM saas_facturas WHERE mes = '2023-12-01' GROUP BY empresa_id),
fin AS (SELECT empresa_id, SUM(monto) AS mrr FROM saas_facturas WHERE mes = '2024-12-01' GROUP BY empresa_id)
SELECT COUNT(*) AS empresas, SUM(i.mrr) AS mrr_inicial, SUM(COALESCE(f.mrr, 0)) AS mrr_final,
       ROUND(100.0 * SUM(COALESCE(f.mrr, 0)) / SUM(i.mrr), 2) AS nrr_pct
FROM ini i LEFT JOIN fin f ON f.empresa_id = i.empresa_id;
```
:::

:::ejercicio sql ordenado titulo="Cobranza: facturas vencidas"
¿Qué industrias tienen peor cobranza? Por `industria`: facturas totales (`facturas`), `vencidas` y `pct_vencidas` (redondeado a 2). Ordena de mayor a menor porcentaje.
```sql solucion
SELECT e.industria, COUNT(*) AS facturas,
       SUM(CASE WHEN f.estado = 'vencida' THEN 1 ELSE 0 END) AS vencidas,
       ROUND(100.0 * SUM(CASE WHEN f.estado = 'vencida' THEN 1 ELSE 0 END) / COUNT(*), 2) AS pct_vencidas
FROM saas_facturas f JOIN saas_empresas e ON e.empresa_id = f.empresa_id
GROUP BY e.industria ORDER BY pct_vencidas DESC;
```
:::

:::ejercicio sql ordenado titulo="SLA de soporte"
Para los tickets **cerrados** de prioridad `critica` y `alta`, el porcentaje que **incumplió** el SLA (crítica > 24 h, alta > 48 h hasta el cierre). Columnas: `prioridad`, `tickets`, `incumplidos`, `pct_incumplidos` (redondeado a 2). Ordena por prioridad.
```sql solucion
WITH t AS (
  SELECT prioridad, (julianday(fecha_cierre) - julianday(fecha_creacion)) * 24 AS horas
  FROM saas_tickets
  WHERE fecha_cierre IS NOT NULL AND prioridad IN ('critica', 'alta')
)
SELECT prioridad, COUNT(*) AS tickets,
       SUM(CASE WHEN (prioridad = 'critica' AND horas > 24) OR (prioridad = 'alta' AND horas > 48) THEN 1 ELSE 0 END) AS incumplidos,
       ROUND(100.0 * SUM(CASE WHEN (prioridad = 'critica' AND horas > 24) OR (prioridad = 'alta' AND horas > 48) THEN 1 ELSE 0 END) / COUNT(*), 2) AS pct_incumplidos
FROM t GROUP BY prioridad ORDER BY prioridad;
```
:::

:::ejercicio sql titulo="¿El soporte lento hace perder clientes?"
Compara la satisfacción y el churn. Para cada empresa con tickets calificados, calcula su satisfacción promedio y si **churneó** (su última factura es anterior a `2024-12-01`). Luego agrupa por `churn` (`'sí'` / `'no'`): `empresas` y `satisfaccion_promedio` (redondeada a 2).
```sql solucion
WITH s AS (
  SELECT empresa_id, AVG(satisfaccion) AS sat FROM saas_tickets WHERE satisfaccion IS NOT NULL GROUP BY empresa_id
),
u AS (SELECT empresa_id, MAX(mes) AS ultima FROM saas_facturas GROUP BY empresa_id)
SELECT CASE WHEN u.ultima < '2024-12-01' THEN 'sí' ELSE 'no' END AS churn,
       COUNT(*) AS empresas, ROUND(AVG(s.sat), 2) AS satisfaccion_promedio
FROM s JOIN u ON u.empresa_id = s.empresa_id
GROUP BY churn;
```
```explicacion
Una diferencia aquí es una **correlación**, no prueba causalidad. Pero es el tipo de hallazgo que justifica investigar más (por ejemplo, entrevistando a los clientes perdidos).
```
:::
