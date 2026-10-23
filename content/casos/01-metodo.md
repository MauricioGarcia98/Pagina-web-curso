---
titulo: Cómo pensar un problema de negocio (el método)
nivel: Intermedio
duracion: 25
resumen: Un método paso a paso para pasar de una pregunta del negocio a una consulta correcta.
---

En este módulo vas a trabajar con **8 empresas distintas**. Cada una tiene sus propias tablas y sus propios problemas. Todas están en la misma base de datos, separadas por un prefijo:

| Empresa | Rubro | Tablas |
|---|---|---|
| 🛒 Tienda Andina | E-commerce | `clientes`, `pedidos`, `detalle_pedidos`, … (la que ya conoces) |
| 🏦 Banco Austral | Banca / fintech | `banco_clientes`, `banco_cuentas`, `banco_transacciones`, `banco_prestamos`, `banco_cuotas` |
| 🎧 Ritmo | Streaming de música | `streaming_usuarios`, `streaming_suscripciones`, `streaming_contenidos`, `streaming_reproducciones` |
| 🚕 Ruta | Movilidad (viajes) | `viajes_pasajeros`, `viajes_conductores`, `viajes_viajes` |
| 🏥 Clínica del Sur | Salud | `clinica_pacientes`, `clinica_medicos`, `clinica_turnos`, `clinica_facturas` |
| ☁️ Nube Pyme | Software B2B (SaaS) | `saas_empresas`, `saas_planes`, `saas_facturas`, `saas_tickets` |
| ✈️ Cóndor Air | Aerolínea | `vuelos_aeropuertos`, `vuelos_vuelos`, `vuelos_reservas` |
| 📦 Mercurio | Logística | `logistica_almacenes`, `logistica_movimientos`, `logistica_envios` |

La meta de este módulo no es aprender sintaxis nueva, sino **lógica**: entender qué te piden y traducirlo bien.

## El método de 6 pasos

**1. Traduce la pregunta a una frase precisa.**
“¿Cómo vienen las cancelaciones?” es vago. “Porcentaje de viajes cancelados (por el pasajero o por el conductor) sobre el total de solicitudes, por hora del día, entre julio y diciembre de 2024” es preciso.

**2. Define el grano del resultado: “una fila por…”.**
¿Una fila por hora? ¿Por ciudad y hora? Esto decide tu `GROUP BY`.

**3. Define cada métrica como una fórmula.**
`tasa_cancelacion = cancelados / solicitudes`. ¿Qué cuenta como “cancelado”? ¿Qué va en el denominador? Aquí se cometen la mayoría de los errores.

**4. Identifica las tablas y cómo se unen.**
¿Qué tabla tiene el evento que cuento? ¿Qué tabla tiene el atributo por el que agrupo? ¿La unión **multiplica** filas (uno a muchos)?

**5. Resuélvelo en pasos con CTEs y mira los datos en cada paso.**

**6. Valida el resultado con sentido común.**
¿Los porcentajes están entre 0 y 100? ¿El total coincide con un conteo simple? ¿Hay NULLs inesperados?

:::analogia Como un detective
Antes de escribir código, un buen analista hace preguntas: ¿qué cuenta como “cliente activo”?, ¿los pedidos cancelados suman ventas?, ¿en qué zona horaria están las fechas? Las respuestas cambian el resultado más que cualquier truco de SQL.
:::

## Trampas lógicas que vas a encontrar

| Trampa | Ejemplo | Cómo evitarla |
|---|---|---|
| **Denominador equivocado** | Tasa de ausentismo calculada sobre turnos atendidos en vez de turnos agendados | Escribe la fórmula antes de la consulta |
| **Doble conteo por JOIN** | Sumar el monto de préstamos después de unirlos con sus cuotas | Agrega en el grano correcto **antes** de unir |
| **Promedio de promedios** | Promediar el % de ocupación de cada vuelo en vez de sumar pasajeros / sumar asientos | Decide si quieres la media simple o la ponderada |
| **NULL que desaparece** | `COUNT(calificacion)` ignora los viajes sin calificar | Sé consciente de qué ignora cada función |
| **Filtros que cambian la población** | Filtrar `estado = 'completado'` y luego calcular la tasa de cancelación (¡siempre da 0!) | Filtra dentro de la métrica con `CASE`, no en el `WHERE` |
| **Fechas** | Comparar `'2024-12-31 18:00:00' <= '2024-12-31'` (da falso) | Usa `date(...)` o rangos semiabiertos |

:::ejercicio quiz
Te piden la “tasa de cancelación de viajes”. Escribes `SELECT COUNT(*) FROM viajes_viajes WHERE estado = 'completado'` y luego divides cancelados por ese número. ¿Qué error lógico cometiste?

- [ ] Ninguno
- [x] El denominador debería ser el total de solicitudes (todas las filas), no solo los completados
- [ ] Debiste usar AVG
- [ ] Falta un ORDER BY
:::

:::ejercicio quiz
Un préstamo tiene 12 cuotas. Unes `banco_prestamos` con `banco_cuotas` y calculas `SUM(p.monto)`. ¿Qué pasa?

- [ ] Da el monto prestado correcto
- [x] El monto de cada préstamo se suma 12 veces (una por cuota): doble conteo
- [ ] Da error
- [ ] Da NULL
:::

:::ejercicio quiz
El vuelo A tiene 10 de 100 asientos ocupados (10%) y el vuelo B 180 de 200 (90%). ¿Cuál es la ocupación **total** de la aerolínea?

- [ ] 50% (promedio de 10% y 90%)
- [x] 63,3% (190 pasajeros / 300 asientos)
- [ ] 90%
- [ ] 100%
```explicacion
Promediar porcentajes ignora que los vuelos tienen tamaños distintos. La ocupación total es **suma de pasajeros / suma de asientos** (promedio ponderado).
```
:::

:::ejercicio sql
Calentamiento: cuenta cuántas filas tiene cada tabla principal de los casos. Devuelve una fila por empresa con columnas `empresa` y `filas`, usando `UNION ALL` de estos conteos: `banco_transacciones` (`'banco'`), `streaming_reproducciones` (`'streaming'`), `viajes_viajes` (`'viajes'`), `clinica_turnos` (`'clinica'`), `saas_facturas` (`'saas'`), `vuelos_vuelos` (`'vuelos'`) y `logistica_envios` (`'logistica'`).
```sql solucion
SELECT 'banco' AS empresa, COUNT(*) AS filas FROM banco_transacciones
UNION ALL SELECT 'streaming', COUNT(*) FROM streaming_reproducciones
UNION ALL SELECT 'viajes', COUNT(*) FROM viajes_viajes
UNION ALL SELECT 'clinica', COUNT(*) FROM clinica_turnos
UNION ALL SELECT 'saas', COUNT(*) FROM saas_facturas
UNION ALL SELECT 'vuelos', COUNT(*) FROM vuelos_vuelos
UNION ALL SELECT 'logistica', COUNT(*) FROM logistica_envios;
```
:::
