---
titulo: "Caso 🏥 Clínica del Sur: ausentismo, agenda y facturación"
nivel: Avanzado
duracion: 50
resumen: Ausentismo por anticipación, productividad de médicos, pacientes recurrentes y facturación por cobertura.
objetivos: Calcular el ausentismo con el denominador correcto (turnos que debían atenderse) | Relacionar el ausentismo con la anticipación de la reserva y el día de la semana | Medir la productividad de los médicos por día trabajado | Separar lo facturado, lo cubierto y el copago por cobertura
prerrequisitos: casos-metodo | sql-case
autoevaluacion: ¿Sabes por qué los turnos cancelados no entran en la tasa de ausentismo? | ¿Puedes agrupar turnos por días de anticipación de la reserva? | ¿Puedes calcular pacientes atendidos por día trabajado de cada médico? | ¿Puedes detectar pacientes que vuelven a la misma especialidad dentro de 30 días? | ¿Puedes calcular el porcentaje cubierto por cada obra social o seguro?
---

<!-- estandar:escenario -->
:::escenario Clínica del Sur
El director médico de **Clínica del Sur** está preocupado:

> "Casi uno de cada ocho pacientes no viene al turno y nadie avisa. Es tiempo de médico perdido y otro paciente que no consiguió turno. ¿En qué especialidades pasa más? ¿Tiene que ver con cuánto antes reservan? Si confirmamos por mensaje los turnos de mayor riesgo, ¿cuáles serían?"

En salud, cada turno vacío es un costo fijo que no se recupera. Y los datos de salud son de los más sensibles que existen.
:::
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

## Cómo funciona una clínica (y por qué el ausentismo duele tanto)

Una clínica vende **tiempo de profesionales**: cada médico tiene una agenda con turnos de duración fija. Ese tiempo es un recurso **perecedero**: un turno de las 10:00 que nadie usa no se puede guardar para mañana. Por eso el ausentismo (*no-show*) es tan caro: el médico cobra igual, otro paciente que necesitaba ese turno no lo consiguió, y la clínica pierde la facturación.

Los ingresos vienen de dos fuentes: lo que paga el **seguro o la cobertura** del paciente (prepaga, obra social) y el **copago** que paga el paciente. Coberturas distintas pagan montos distintos y tienen comportamientos distintos, así que casi todo análisis se corta por cobertura, especialidad y sede.

| KPI | Fórmula | Por qué importa |
|---|---|---|
| **Tasa de ausentismo** | ausentes / (atendidos + ausentes) | Turnos perdidos; los cancelados no cuentan porque avisaron |
| **Ocupación de agenda** | turnos usados / turnos disponibles | ¿Faltan o sobran médicos? |
| **Anticipación** | días entre reserva y turno | Turnos reservados con mucha anticipación se olvidan más |
| **Tasa de retorno a 30 días** | pacientes que vuelven antes de 30 días / pacientes atendidos | Controles o problemas no resueltos |
| **% cubierto por el seguro** | `SUM(monto_cubierto) / SUM(monto)` | Dependencia de cada cobertura |

## Un ejemplo resuelto paso a paso

**Pregunta:** "¿Algunas coberturas faltan más que otras?"

1. **Grano**: una fila por cobertura. La cobertura es un atributo del **paciente**, así que unimos cada turno con su paciente.
2. **Métrica**: la tasa de ausentismo con el denominador correcto. Contamos todos los turnos en `turnos` (como dato de volumen), pero el porcentaje se calcula solo sobre `atendido` + `ausente`.

```sql
SELECT p.cobertura,
       COUNT(*) AS turnos,
       ROUND(100.0 * SUM(CASE WHEN t.estado = 'ausente' THEN 1 ELSE 0 END)
             / SUM(CASE WHEN t.estado IN ('atendido', 'ausente') THEN 1 ELSE 0 END), 2) AS pct_ausentismo
FROM clinica_turnos t
JOIN clinica_pacientes p ON p.paciente_id = t.paciente_id
GROUP BY p.cobertura
ORDER BY pct_ausentismo DESC;
```

| cobertura | turnos | pct_ausentismo |
|---|---|---|
| Galeno | 1950 | 12.41 |
| OSDE | 1779 | 12.37 |
| Particular | 1562 | 12.09 |
| Swiss Medical | 1167 | 11.89 |
| PAMI | 1296 | 9.82 |

**Lectura de negocio:** PAMI (la cobertura de jubilados) falta claramente menos. Las diferencias entre las demás son chicas: antes de lanzar una acción por cobertura, conviene mirar otras variables (anticipación, día de la semana), que son justamente los ejercicios.

```recorrido
titulo: Ausentismo por cobertura, paso a paso
estacion t: Turnos | icono=reloj
estacion join: JOIN pacientes | icono=capas
estacion marcas: Marcas 0/1 | icono=reglas
estacion den: El denominador | icono=engranaje
estacion res: Resultado | icono=check
paso t: Los turnos
Cada turno termina `atendido`, `ausente` o `cancelado`. La cobertura no está aquí: es del paciente.
>>> tabla
turno_id,paciente_id,estado
1,1000,atendido
2,69,atendido
3,1531,atendido
4,939,atendido
5,1235,atendido
6,895,atendido
paso join: Traer la cobertura
`JOIN clinica_pacientes` agrega la cobertura de cada turno.
>>> tabla
turno_id,cobertura,estado
1,Galeno,atendido
2,OSDE,atendido
3,OSDE,atendido
4,PAMI,atendido
5,Swiss Medical,atendido
6,PAMI,atendido
paso marcas: Dos marcas por turno
`ausente` = 1 si faltó. `base` = 1 si el turno tuvo resultado (atendido o ausente). Un **cancelado** con anticipación no cuenta en ninguna de las dos.
>>> tabla
turno_id,cobertura,estado,ausente,base
1,Galeno,atendido,0,1
2,OSDE,atendido,0,1
3,OSDE,atendido,0,1
4,PAMI,atendido,0,1
5,Swiss Medical,atendido,0,1
6,PAMI,atendido,0,1
paso den: Sumar y dividir
Por cobertura: `SUM(ausente) / SUM(base) × 100`. Si dividieras por `COUNT(*)`, los cancelados bajarían la tasa sin que nadie haya venido más.
>>> sql
ROUND(100.0 * SUM(CASE WHEN t.estado = 'ausente' THEN 1 ELSE 0 END)
      / SUM(CASE WHEN t.estado IN ('atendido', 'ausente') THEN 1 ELSE 0 END), 2)
paso res: Una fila por cobertura
PAMI falta claramente menos; entre las demás, las diferencias son chicas.
>>> tabla
cobertura,turnos,pct_ausentismo
Galeno,1950,12.41
OSDE,1779,12.37
Particular,1562,12.09
Swiss Medical,1167,11.89
PAMI,1296,9.82
```

:::cuidado Las trampas de este caso
- **El denominador del ausentismo**: incluir los cancelados en el total baja artificialmente la tasa.
- **Fecha vs. fecha-hora**: `fecha_hora` del turno tiene hora; `fecha_reserva` es solo fecha. Para calcular la anticipación en días, lleva el turno a fecha con `date(fecha_hora)`.
- **Una factura por turno, pero no todos los turnos facturan**: los ausentes y cancelados no generan factura; un `JOIN` con facturas los hace desaparecer.
:::

<!-- estandar:trabajo -->
:::trabajo
- Los datos de salud tienen leyes específicas de privacidad. En los entornos de análisis, los pacientes se identifican con ids seudónimos, los datos de diagnóstico tienen acceso restringido y cada consulta queda auditada.
- Las clínicas usan modelos de predicción de ausentismo para decidir a quién confirmar o a quién sobreagendar. La base de esos modelos son exactamente las variables de este caso: anticipación, día, especialidad e historial del paciente.
:::

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

:::errores
- **Ausentismo calculado sobre turnos futuros**: todavía no se sabe si el paciente va a venir.
- **Productividad de médicos sin considerar sus horas disponibles**: más turnos atendidos puede ser solo más horas.
- **Facturación sumando turnos cancelados**.
- **Datos personales de pacientes en los resultados** cuando bastan los identificadores.
:::

:::entrevista "¿Cómo medirías el efecto de la anticipación del turno en el ausentismo?"
Calcularía para cada turno pasado los días entre la reserva y la cita, lo agruparía en tramos (mismo día, 1 a 7, 8 a 30, más de 30) y mediría la tasa de ausencias por tramo sobre los turnos que ya ocurrieron. Controlaría por especialidad y tipo de paciente, porque pueden explicar la diferencia, y mostraría la cantidad de turnos por tramo para no sacar conclusiones de grupos chicos.
:::
