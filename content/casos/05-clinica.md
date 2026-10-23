---
titulo: "Caso 🏥 Clínica del Sur: ausentismo, agenda y facturación"
nivel: Avanzado
duracion: 50
resumen: Ausentismo por anticipación, productividad de médicos, pacientes recurrentes y facturación por cobertura.
---

**Clínica del Sur** atiende en tres sedes. El problema número uno es el **ausentismo** (*no-show*): pacientes que reservan un turno y no vienen, dejando a un médico sin atender a nadie.

## El modelo de datos

```text
clinica_pacientes (paciente_id, sexo, fecha_nacimiento, cobertura, ciudad)
clinica_medicos (medico_id, nombre, especialidad, sede)
clinica_turnos (turno_id, paciente_id, medico_id, fecha_hora, estado, fecha_reserva)
clinica_facturas (factura_id, turno_id, monto, monto_cubierto, pagada)
```

- `estado` del turno: `atendido`, `ausente` (no vino) o `cancelado` (avisó).
- **Anticipación** = días entre `fecha_reserva` y el día del turno.
- **Tasa de ausentismo** = ausentes / (atendidos + ausentes). Los cancelados **no** cuentan: avisaron y el turno se pudo reasignar.
- En `clinica_facturas`, `monto_cubierto` es lo que paga el seguro; el resto (`monto - monto_cubierto`) lo paga el paciente (copago).

## Ejercicios

:::ejercicio sql ordenado titulo="Ausentismo por especialidad"
Por `especialidad`: `turnos` (atendidos + ausentes), `ausentes` y `ausentismo_pct` (redondeado a 2). Ordena de mayor a menor ausentismo.
```sql solucion
SELECT m.especialidad,
       COUNT(*) AS turnos,
       SUM(CASE WHEN t.estado = 'ausente' THEN 1 ELSE 0 END) AS ausentes,
       ROUND(100.0 * SUM(CASE WHEN t.estado = 'ausente' THEN 1 ELSE 0 END) / COUNT(*), 2) AS ausentismo_pct
FROM clinica_turnos t JOIN clinica_medicos m ON m.medico_id = t.medico_id
WHERE t.estado IN ('atendido', 'ausente')
GROUP BY m.especialidad
ORDER BY ausentismo_pct DESC;
```
```pista
Los cancelados se excluyen del denominador: filtra `estado IN ('atendido', 'ausente')`.
```
:::

:::ejercicio sql ordenado titulo="¿La anticipación influye?"
Agrupa los turnos (atendidos o ausentes) por anticipación de la reserva: `'0-2 días'`, `'3-10 días'`, `'11+ días'`. Para cada grupo (`anticipacion`): `turnos` y `ausentismo_pct` (redondeado a 2). Ordena por anticipación usando el orden indicado.
```sql solucion
WITH t AS (
  SELECT estado, julianday(date(fecha_hora)) - julianday(fecha_reserva) AS dias
  FROM clinica_turnos WHERE estado IN ('atendido', 'ausente')
),
g AS (
  SELECT CASE WHEN dias <= 2 THEN '0-2 días' WHEN dias <= 10 THEN '3-10 días' ELSE '11+ días' END AS anticipacion,
         CASE WHEN dias <= 2 THEN 1 WHEN dias <= 10 THEN 2 ELSE 3 END AS orden,
         estado
  FROM t
)
SELECT anticipacion, COUNT(*) AS turnos,
       ROUND(100.0 * SUM(CASE WHEN estado = 'ausente' THEN 1 ELSE 0 END) / COUNT(*), 2) AS ausentismo_pct
FROM g GROUP BY anticipacion, orden ORDER BY orden;
```
```explicacion
Cuanto antes se reserva, más probable es olvidarlo. Con este dato la clínica puede decidir **enviar recordatorios** a los turnos reservados con más de 10 días de anticipación o permitir **sobreturnos** en esas franjas.
```
:::

:::ejercicio sql titulo="Turnos por médico y día"
Para cada médico, el **promedio de pacientes atendidos por día trabajado** (días con al menos un turno atendido). Columnas: `medico_id`, `especialidad`, `dias_trabajados`, `atendidos`, `por_dia` (redondeado a 2).
```sql solucion
SELECT m.medico_id, m.especialidad,
       COUNT(DISTINCT date(t.fecha_hora)) AS dias_trabajados,
       COUNT(*) AS atendidos,
       ROUND(1.0 * COUNT(*) / COUNT(DISTINCT date(t.fecha_hora)), 2) AS por_dia
FROM clinica_turnos t JOIN clinica_medicos m ON m.medico_id = t.medico_id
WHERE t.estado = 'atendido'
GROUP BY m.medico_id, m.especialidad;
```
:::

:::ejercicio sql titulo="Pacientes que vuelven en 30 días"
Un paciente “vuelve” si, después de un turno **atendido**, tiene otro turno **atendido** de la **misma especialidad** dentro de los 30 días siguientes. ¿Qué porcentaje de los turnos atendidos tuvo una vuelta así? Columnas: `atendidos`, `con_vuelta`, `pct` (redondeado a 2).
```sql solucion
WITH a AS (
  SELECT t.turno_id, t.paciente_id, m.especialidad, t.fecha_hora,
         LEAD(t.fecha_hora) OVER (PARTITION BY t.paciente_id, m.especialidad ORDER BY t.fecha_hora, t.turno_id) AS siguiente
  FROM clinica_turnos t JOIN clinica_medicos m ON m.medico_id = t.medico_id
  WHERE t.estado = 'atendido'
)
SELECT COUNT(*) AS atendidos,
       SUM(CASE WHEN siguiente IS NOT NULL AND julianday(siguiente) - julianday(fecha_hora) <= 30 THEN 1 ELSE 0 END) AS con_vuelta,
       ROUND(100.0 * SUM(CASE WHEN siguiente IS NOT NULL AND julianday(siguiente) - julianday(fecha_hora) <= 30 THEN 1 ELSE 0 END) / COUNT(*), 2) AS pct
FROM a;
```
:::

:::ejercicio sql ordenado titulo="Facturación por cobertura"
Por `cobertura` del paciente: `facturado` (suma de `monto`), `cubierto` (suma de `monto_cubierto`), `copago` (lo que paga el paciente) y `pct_cubierto`. Todo redondeado a 2. Ordena por facturado descendente.
```sql solucion
SELECT p.cobertura,
       ROUND(SUM(f.monto), 2) AS facturado,
       ROUND(SUM(f.monto_cubierto), 2) AS cubierto,
       ROUND(SUM(f.monto - f.monto_cubierto), 2) AS copago,
       ROUND(100.0 * SUM(f.monto_cubierto) / SUM(f.monto), 2) AS pct_cubierto
FROM clinica_facturas f
JOIN clinica_turnos t ON t.turno_id = f.turno_id
JOIN clinica_pacientes p ON p.paciente_id = t.paciente_id
GROUP BY p.cobertura
ORDER BY facturado DESC;
```
:::

:::ejercicio sql ordenado titulo="Ausentismo por día de la semana"
Ausentismo por día de la semana del turno (`dia` con nombre en español: lunes … sábado; no hay turnos los domingos). Columnas: `dia`, `turnos`, `ausentismo_pct` (redondeado a 2). Ordena de lunes a sábado.
```sql solucion
WITH t AS (
  SELECT CAST(strftime('%w', fecha_hora) AS INTEGER) AS dw, estado
  FROM clinica_turnos WHERE estado IN ('atendido', 'ausente')
)
SELECT CASE dw WHEN 1 THEN 'lunes' WHEN 2 THEN 'martes' WHEN 3 THEN 'miércoles' WHEN 4 THEN 'jueves' WHEN 5 THEN 'viernes' ELSE 'sábado' END AS dia,
       COUNT(*) AS turnos,
       ROUND(100.0 * SUM(CASE WHEN estado = 'ausente' THEN 1 ELSE 0 END) / COUNT(*), 2) AS ausentismo_pct
FROM t GROUP BY dw ORDER BY dw;
```
:::
