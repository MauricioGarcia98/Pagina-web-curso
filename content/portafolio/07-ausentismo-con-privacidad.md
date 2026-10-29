---
titulo: "Proyecto 6: Menos turnos perdidos en una clínica, con privacidad"
nivel: Avanzado
duracion: 100
resumen: Turnos médicos con asistencias, ausencias y cancelaciones, y datos personales sensibles. Analizas qué explica el ausentismo (anticipación de la reserva, día, hora, especialidad), construyes un puntaje de riesgo de ausencia para enviar recordatorios dirigidos, y diseñas el acceso a los datos con mínimo privilegio, enmascaramiento de columnas y filtros por fila en Unity Catalog. Valor - recuperar horas de agenda sin exponer datos de salud.
objetivos: Calcular la tasa de ausentismo por segmentos y encontrar sus factores | Construir un puntaje de riesgo simple y medir su efecto | Enmascarar datos personales con SQL y con máscaras de columna | Diseñar permisos por rol con grupos, vistas y filtros por fila | Explicar las obligaciones básicas al trabajar con datos de salud
prerrequisitos: portafolio-como-armar-tu-portafolio | fundamentos-quien-usa-los-datos
autoevaluacion: ¿Sabes calcular la tasa de no-show por anticipación? | ¿Sabes qué datos de este proyecto son personales y cuáles sensibles? | ¿Sabes crear una máscara de columna en Unity Catalog? | ¿Sabes qué es un filtro por fila? | ¿Sabes medir si los recordatorios funcionaron?
---

:::escenario
Una clínica pierde cerca del 9 % de sus turnos porque el paciente no viene y no avisa. Cada turno perdido es una hora de un médico sin trabajo y un paciente que esperaba. La directora quiere enviar recordatorios por WhatsApp, pero solo a los turnos con más riesgo (los mensajes cuestan). Y el área legal pone una condición: **nadie fuera de recepción puede ver nombres, documentos ni datos de salud**.
:::

## Valor

- **Horas recuperadas**: si los recordatorios dirigidos bajan la ausencia del grupo de riesgo de 20 % a 12 %, ¿cuántas horas de agenda vuelven por mes?
- **Cumplimiento**: el analista ve tasas y patrones, nunca a la persona.

## Los datos

[🏭 Generar los datos del proyecto](#/generador?esc=salud&n=2000&semilla=55&desde=2024-01-01&hasta=2024-12-31&nulos=3&formatos=3&duplicados=1) · Escenario **Clínica**: `pacientes` (con documento, email y fecha de nacimiento), `medicos` y `turnos` (fecha de reserva, fecha del turno y estado: atendido, ausente o cancelado). La ausencia crece con la anticipación de la reserva y es mayor los lunes.

## Arquitectura y acceso

```diagrama
titulo: Datos de salud con mínimo privilegio
nodo raw: bronze_pacientes\nbronze_turnos | icono=tabla | col=0 | fila=0 | color=naranja | sub=solo el pipeline
nodo sv: silver | icono=escudo | col=1 | fila=0 | sub=máscaras de columna\ny filtro por sede
nodo g: gold_ausentismo | icono=grafico | col=2 | fila=0 | color=amarillo | sub=sin datos personales
nodo rec: Recepción | icono=usuario | col=1 | fila=1 | sub=ve su sede, con nombres
nodo an: Analistas | icono=usuario | col=2 | fila=1 | sub=ven tasas, no personas
nodo wa: Recordatorios | icono=mensaje | col=3 | fila=0 | sub=solo id del turno\ny teléfono
flecha raw -> sv
flecha sv -> g
flecha sv -> rec: SELECT con máscara
flecha g -> an
flecha sv -> wa: lista diaria | estilo=punteada
```

## Fase 1: entender el ausentismo

Tasa de ausencia = ausentes ÷ (atendidos + ausentes). Las cancelaciones con aviso no son ausencias: liberan el turno. Abre la tasa por:

- **Anticipación** (días entre reserva y turno): 0–2, 3–10, más de 10.
- **Día de la semana** y **franja horaria**.
- **Especialidad** y **paciente nuevo o recurrente**.

## Fase 2: puntaje de riesgo y experimento

Un puntaje simple (por ejemplo: +2 si la anticipación es mayor a 10 días, +1 si es lunes, +2 si el paciente faltó antes) ordena los turnos de mañana. Los recordatorios van al 30 % con más puntaje. Para saber si **funcionan**, durante un mes se envían a la mitad del grupo de riesgo (al azar) y se compara la ausencia: es un experimento A/B como los del módulo de Análisis.

## Fase 3: privacidad en Unity Catalog

```sql norun
-- máscara de columna: recepción ve el documento; el resto, solo los últimos 3 dígitos
CREATE FUNCTION workspace.clinica.mask_documento(doc STRING)
RETURN CASE WHEN is_account_group_member('recepcion') THEN doc ELSE concat('*****', right(doc, 3)) END;
ALTER TABLE workspace.clinica.silver_pacientes ALTER COLUMN documento SET MASK workspace.clinica.mask_documento;

-- filtro por fila: cada recepción ve solo los turnos de su sede
CREATE FUNCTION workspace.clinica.filtro_sede(sede STRING)
RETURN is_account_group_member('direccion') OR is_account_group_member(concat('recepcion_', lower(sede)));
ALTER TABLE workspace.clinica.silver_turnos SET ROW FILTER workspace.clinica.filtro_sede ON (sede);

-- los analistas leen solo gold
GRANT SELECT ON TABLE workspace.clinica.gold_ausentismo TO `analistas`;
```

:::cuidado Datos sensibles
Los datos de salud son una **categoría especial** en la mayoría de las leyes de protección de datos: requieren una base legal, finalidad clara, acceso mínimo y registro de quién los consulta. En el proyecto, los datos son sintéticos, pero diseña como si fueran reales: es lo que se evalúa.
:::

## Entregables

- [ ] Tabla de ausentismo por anticipación, día y especialidad, con la conclusión.
- [ ] Puntaje de riesgo y la estimación de horas recuperadas.
- [ ] Diseño del experimento de recordatorios (grupos, duración, métrica).
- [ ] Matriz de acceso por rol (qué ve cada uno) y el SQL de máscaras, filtros y permisos.

## Práctica

:::ejercicio cli dificultad=Básico titulo="Los datos de la clínica"
Genera el escenario `salud` con 500 pacientes y semilla 55.
```respuesta
todos: generar-datos salud || --filas 500 || --semilla 55
```
```solucion
generar-datos salud --filas 500 --semilla 55
```
:::

:::ejercicio sql ordenado dificultad=Intermedio titulo="Ausentismo por anticipación"
`turnos_cl(turno_id, fecha_reserva, fecha_turno, estado)`. Clasifica la anticipación (días entre reserva y turno) en `0-2`, `3-10` y `11+`, y calcula la tasa de ausencia (`ausente` ÷ (`atendido` + `ausente`), en %, 1 decimal), sin contar los cancelados. Columnas `anticipacion` y `ausencia_pct`, en ese orden de rangos.
```sql setup
CREATE TABLE turnos_cl (turno_id INTEGER, fecha_reserva TEXT, fecha_turno TEXT, estado TEXT);
INSERT INTO turnos_cl VALUES
(1, '2024-05-01', '2024-05-02', 'atendido'), (2, '2024-05-01', '2024-05-02', 'atendido'), (3, '2024-05-01', '2024-05-03', 'ausente'), (4, '2024-05-02', '2024-05-03', 'atendido'),
(5, '2024-05-01', '2024-05-08', 'atendido'), (6, '2024-05-01', '2024-05-09', 'ausente'), (7, '2024-05-01', '2024-05-10', 'atendido'), (8, '2024-05-01', '2024-05-06', 'cancelado'),
(9, '2024-04-01', '2024-05-02', 'ausente'), (10, '2024-04-05', '2024-05-02', 'ausente'), (11, '2024-04-10', '2024-05-03', 'atendido'), (12, '2024-04-12', '2024-05-06', 'atendido');
```
```sql solucion
WITH t AS (
  SELECT estado, julianday(fecha_turno) - julianday(fecha_reserva) AS dias FROM turnos_cl WHERE estado IN ('atendido', 'ausente')
),
c AS (
  SELECT CASE WHEN dias <= 2 THEN '0-2' WHEN dias <= 10 THEN '3-10' ELSE '11+' END AS anticipacion,
         CASE WHEN dias <= 2 THEN 1 WHEN dias <= 10 THEN 2 ELSE 3 END AS orden, estado
  FROM t
)
SELECT anticipacion, ROUND(100.0 * SUM(estado = 'ausente') / COUNT(*), 1) AS ausencia_pct
FROM c GROUP BY anticipacion, orden ORDER BY orden;
```
```pista
Calcula los días con `julianday(fecha_turno) - julianday(fecha_reserva)`, clasifica con `CASE` (y una columna de orden) y excluye los cancelados antes de contar.
```
:::

:::ejercicio sql ordenado dificultad=Intermedio titulo="Una vista sin datos personales"
Para el equipo de análisis, devuelve de `pacientes_cl` el `paciente_id`, el **documento enmascarado** (`*****` y los últimos 3 dígitos), el **rango de edad** al `2024-12-31` (`<30`, `30-59`, `60+`) y la ciudad. Sin nombre ni email. Ordena por `paciente_id`.
```sql setup
CREATE TABLE pacientes_cl (paciente_id INTEGER, nombre TEXT, documento TEXT, email TEXT, fecha_nacimiento TEXT, ciudad TEXT);
INSERT INTO pacientes_cl VALUES (1, 'Ana Ruiz', '30123456', 'ana@correo.com', '1990-04-12', 'Bogotá'), (2, 'Luis Peña', '22987654', 'luis@correo.com', '1958-11-02', 'Lima'), (3, 'Sol Díaz', '41555333', NULL, '2001-07-30', 'Quito');
```
```sql solucion
SELECT paciente_id,
       '*****' || substr(documento, -3) AS documento,
       CASE WHEN (julianday('2024-12-31') - julianday(fecha_nacimiento)) / 365.25 < 30 THEN '<30'
            WHEN (julianday('2024-12-31') - julianday(fecha_nacimiento)) / 365.25 < 60 THEN '30-59' ELSE '60+' END AS rango_edad,
       ciudad
FROM pacientes_cl
ORDER BY paciente_id;
```
```pista
`substr(documento, -3)` devuelve los últimos 3 caracteres. La edad aproximada es `(julianday(corte) - julianday(nacimiento)) / 365.25`.
```
```explicacion
Generalizar (edad en rangos en lugar de fecha de nacimiento) y enmascarar reduce el riesgo de reidentificar a una persona combinando columnas. En Unity Catalog esto se hace con máscaras de columna, para que la regla viva en la tabla y no en cada consulta.
```
:::

:::ejercicio quiz dificultad=Intermedio
¿Por qué las cancelaciones con aviso no cuentan como ausencias?

- [ ] Porque son pocas
- [x] Porque liberan el turno para otro paciente: el problema a resolver es la ausencia sin aviso
- [ ] Porque no tienen fecha
- [ ] Porque lo exige la ley
:::

:::ejercicio quiz dificultad=Avanzado
¿Cómo sabes si los recordatorios **causan** menos ausencias?

- [ ] Comparando la ausencia de este mes con la del mes pasado
- [x] Enviándolos al azar a la mitad del grupo de riesgo y comparando con la otra mitad (experimento A/B)
- [ ] Preguntando a los pacientes si leyeron el mensaje
- [ ] Mirando si bajó la ausencia de los que recibieron el mensaje
:::

:::ejercicio quiz dificultad=Avanzado
¿Qué hace un **filtro por fila** (`ROW FILTER`) en Unity Catalog?

- [ ] Borra las filas que el usuario no puede ver
- [x] Aplica una función a cada consulta para que cada usuario vea solo las filas permitidas (por ejemplo, las de su sede)
- [ ] Cifra las filas en disco
- [ ] Ordena las filas por sede
:::

## Para ir más lejos

- Auditoría: consulta las tablas de sistema de acceso para mostrar quién leyó datos sensibles.
- Modelo de riesgo con MLflow comparado contra el puntaje de reglas.
