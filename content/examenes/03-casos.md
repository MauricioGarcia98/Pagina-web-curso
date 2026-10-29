# examen: casos

## El método
leccion: casos-metodo
Un gerente pide "la tasa de cancelación de marzo". ¿Qué es lo **primero** que deberías definir antes de escribir SQL?
- [ ] Qué tipo de gráfico va a usar el gerente, para que el resultado tenga el formato correcto.
- [x] El numerador, el denominador y el período exactos de la tasa.
- [ ] Qué índices hay que crear en la tabla de clientes para que la consulta sea rápida.
- [ ] Si conviene escribir la consulta con CTEs o con subconsultas anidadas.
porque: La mayoría de los errores de negocio no son de sintaxis sino de **definición**. Un KPI mal definido da un número prolijo pero incorrecto. Primero se acuerda la fórmula y el grano, después se escribe el SQL.

## Promedio de promedios
leccion: casos-metodo
Tienes una tabla con `ciudad`, `pedidos` y `ticket_promedio`. Lima tiene 9.000 pedidos con ticket de 20 y Cusco 1.000 con ticket de 40. ¿Cuál es el ticket promedio total?
- [ ] 30
- [x] 22
- [ ] 60
- [ ] 25
porque: (9.000 × 20 + 1.000 × 40) / 10.000 = 220.000 / 10.000 = 22. Promediar los promedios (20 + 40) / 2 = 30 le da a Cusco el mismo peso que a Lima, aunque tiene 9 veces menos pedidos.

## Denominador de churn
leccion: casos-streaming
Para el churn mensual de suscripciones, ¿cuál es el denominador correcto?
- [ ] Todos los clientes que alguna vez se suscribieron.
- [ ] Los clientes activos al final del mes.
- [x] Los clientes activos al **inicio** del mes.
- [ ] Los clientes que cancelaron en el mes.
porque: El churn mide qué parte de la base que tenías **al empezar** el período se perdió. Usar el final del mes o la historia completa mezcla clientes nuevos o ya perdidos y distorsiona la tasa.

## MRR
leccion: casos-saas
Un cliente paga un plan anual de 1.200 por adelantado en enero. ¿Cuánto aporta al MRR de enero?
- [ ] 1.200
- [x] 100
- [ ] 0, porque el MRR solo considera planes mensuales.
- [ ] 1.200 en enero y 0 el resto del año.
porque: El MRR **normaliza** los ingresos recurrentes a un mes: 1.200 / 12 = 100, todos los meses que la suscripción esté activa. El cobro de 1.200 es caja, no MRR.

## Retención neta
leccion: casos-saas
Una base de clientes facturaba 10.000 en enero. Un año después, **esos mismos clientes** facturan 11.000 (algunos subieron de plan y otros se fueron). ¿Cuál es la retención neta de ingresos (NRR)?
- [ ] 90 %
- [x] 110 %
- [ ] 100 %
- [ ] No se puede calcular sin los clientes nuevos.
porque: NRR = ingreso actual de la cohorte inicial / ingreso inicial = 11.000 / 10.000 = 110 %. Los clientes **nuevos** no se cuentan: por eso una NRR mayor a 100 % significa que la base existente crece sola.

## Siniestralidad
leccion: casos-seguros
Una aseguradora devengó primas por 5 millones y tuvo siniestros incurridos por 3,5 millones. ¿Cuál es la siniestralidad?
- [ ] 143 %
- [x] 70 %
- [ ] 30 %
- [ ] 3,5 millones
porque: Siniestralidad = siniestros incurridos / primas devengadas = 3,5 / 5 = 70 %. Indica qué parte de lo que cobró se fue en pagar siniestros.

## RevPAR
leccion: casos-hoteleria
Un hotel de 50 habitaciones, en 30 días, vendió 1.200 noches por 96.000. ¿Cuál es el RevPAR?
- [ ] 80
- [x] 64
- [ ] 1.920
- [ ] 3.200
porque: Noches disponibles = 50 × 30 = 1.500. RevPAR = ingreso / noches **disponibles** = 96.000 / 1.500 = 64. El ADR sería 96.000 / 1.200 = 80 (sobre noches vendidas). También: ocupación 80 % × ADR 80 = 64.

## Take rate
leccion: casos-delivery
En una app de delivery el GMV del mes fue 2.000.000 y la app se quedó con 300.000 en comisiones y tarifas. ¿Cuál es el take rate?
- [ ] 6,7 %
- [x] 15 %
- [ ] 85 %
- [ ] 300.000
porque: Take rate = ingreso de la plataforma / GMV = 300.000 / 2.000.000 = 15 %. El GMV es lo que se transaccionó en total, no el ingreso de la empresa.

## Puntualidad
leccion: casos-vuelos
Para la "puntualidad" de una aerolínea, ¿qué hay que decidir sobre los vuelos **cancelados**?
- [ ] Nada: los cancelados no tienen hora de llegada, así que quedan afuera automáticamente.
- [x] Si se excluyen o se cuentan como impuntuales, y dejarlo escrito en la definición.
- [ ] Contarlos como puntuales, porque la aerolínea avisó con anticipación a los pasajeros.
- [ ] Asignarles 0 minutos de demora para que no afecten el promedio de minutos de atraso.
porque: Si los cancelados se excluyen sin decirlo, una aerolínea que cancela mucho podría mostrar mejor puntualidad. Cada filtro del denominador debe ser una decisión explícita y documentada.

## Doble conteo
leccion: casos-tienda-avanzado
"¿Cuántos clientes compraron en la categoría Electrónica?". Si haces `COUNT(cliente_id)` sobre el join de pedidos con sus ítems, ¿qué error cometes?
- [ ] Ninguno, porque cada cliente aparece una sola vez en la tabla `pedidos`.
- [x] Cuentas una vez por ítem, no por cliente; hace falta `COUNT(DISTINCT cliente_id)`.
- [ ] Cuentas solo los pedidos que tienen un único ítem, porque el join descarta el resto.
- [ ] Cuentas solo a los clientes con más de un pedido, porque el join necesita repeticiones.
porque: Después del join hay una fila por ítem. Un cliente con 3 pedidos de 2 ítems aparece 6 veces. La pregunta es por **clientes**, así que la unidad que se cuenta debe ser el cliente distinto.

## Cohortes
leccion: casos-delivery
¿Por qué se analiza la retención por **cohortes** en lugar de mirar solo "clientes activos por mes"?
- [ ] Porque es más rápido de calcular que los activos por mes y usa menos memoria del warehouse.
- [x] Porque los clientes nuevos pueden esconder que los antiguos se van.
- [ ] Porque los clientes activos por mes no se pueden calcular con SQL estándar.
- [ ] Porque las cohortes excluyen a los clientes que nunca compraron y eso mejora el indicador.
porque: Si cada mes llegan muchos clientes nuevos, el total de activos puede subir aunque la retención empeore. Seguir a cada cohorte (mes 0, 1, 2…) separa la adquisición de la retención.
