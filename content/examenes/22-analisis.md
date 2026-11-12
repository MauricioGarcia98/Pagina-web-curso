# examen: analisis

## La pregunta antes que la consulta
leccion: analisis-pensar-como-analista
Te piden "un informe de ventas". ¿Qué haces primero?
- [ ] Escribir una consulta con todas las tablas disponibles.
- [x] Preguntar qué decisión se quiere tomar con ese informe.
- [ ] Armar un tablero con veinte gráficos distintos.
- [ ] Exportar todo a una planilla y enviarla.
porque: Un análisis sirve si ayuda a decidir algo. Sin saber la decisión, no se sabe qué medir ni con qué detalle.

## Tasa mal calculada
leccion: analisis-kpis-sin-trampas
La tasa de conversión de la semana se calcula como el promedio de las tasas diarias. ¿Cuál es el problema?
- [ ] Ninguno: promediar las tasas de cada día siempre da el valor correcto.
- [x] Los días con pocas visitas pesan igual que los días con muchas.
- [ ] Las tasas no se pueden calcular por día.
- [ ] El promedio siempre da un número mayor que el real.
porque: La tasa correcta es total de compras / total de visitas. Promediar tasas diarias da el mismo peso a un día de 10 visitas que a uno de 10.000.

## Métrica vanidosa
leccion: analisis-kpis-sin-trampas
¿Cuál de estas es una métrica "de vanidad" para un producto?
- [x] El total acumulado de usuarios registrados desde el inicio.
- [ ] Los usuarios activos de la última semana.
- [ ] La retención a 30 días de cada cohorte de usuarios nuevos del producto.
- [ ] El ingreso por usuario activo.
porque: Un acumulado solo puede subir: no dice si el producto se usa hoy. Las otras cambian cuando el negocio mejora o empeora.

## Segmentar
leccion: analisis-segmentacion
Las ventas totales no cambiaron, pero el equipo sospecha que algo pasa. ¿Qué conviene hacer?
- [ ] Esperar un mes para ver si cambian solas.
- [ ] Mostrar el total con más decimales.
- [x] Abrir el total por segmentos: país, canal, tipo de cliente.
- [ ] Cambiar el gráfico de barras por uno de torta para verlo mejor.
porque: Un total estable puede esconder un segmento que cae y otro que sube. Segmentar muestra lo que el promedio tapa.

## Cohortes
leccion: analisis-cohortes-retencion
¿Qué agrupa una cohorte en un análisis de retención?
- [ ] A los usuarios que más compraron durante el último año.
- [x] A los usuarios que empezaron en el mismo período.
- [ ] A los usuarios de un mismo país.
- [ ] A los usuarios que cancelaron el servicio.
porque: Una cohorte es un grupo que comparte el momento de inicio (por ejemplo, registrados en enero). Se sigue cuántos siguen activos después.

## Embudo
leccion: analisis-embudos
En un embudo: 1.000 visitas → 400 ven un producto → 40 agregan al carrito → 30 compran. ¿Dónde está la mayor pérdida relativa?
- [ ] De visita a ver producto.
- [x] De ver producto a agregar al carrito.
- [ ] De carrito a compra.
- [ ] Las tres etapas pierden lo mismo.
porque: Pasan 40 %, 10 % y 75 %. El paso con peor conversión (10 %) es donde más conviene investigar.

## Unit economics
leccion: analisis-unit-economics
Conseguir un cliente cuesta 100 y cada cliente deja en total una ganancia de 80. ¿Qué significa?
- [ ] Que el negocio gana 80 por cada cliente nuevo.
- [ ] Que hay que conseguir más clientes lo antes posible.
- [x] Que se pierde plata con cada cliente: el costo supera lo que deja.
- [ ] Que el costo de adquisición no importa mientras las ventas sigan creciendo.
porque: Si el costo de adquisición (CAC) es mayor que el valor del cliente (LTV), crecer agranda la pérdida.

## Prueba A/B
leccion: analisis-pruebas-ab
En una prueba A/B, ¿por qué se asignan los usuarios al azar a cada versión?
- [ ] Para que la prueba termine más rápido.
- [x] Para que los grupos sean comparables y la diferencia se deba al cambio.
- [ ] Para que cada usuario vea las dos versiones.
- [ ] Para que la versión nueva reciba más usuarios y gane con más facilidad.
porque: El azar reparte parejo todo lo demás (país, dispositivo, hábitos). Así, lo único distinto entre los grupos es la versión.

## Estacionalidad
leccion: analisis-series-de-tiempo
Las ventas de diciembre son 40 % más altas que las de noviembre. ¿Con qué conviene compararlas para saber si el negocio creció?
- [ ] Con noviembre del mismo año.
- [x] Con diciembre del año anterior.
- [ ] Con el promedio de todos los meses.
- [ ] Con el mejor mes de la historia.
porque: Diciembre siempre es alto por la temporada. Comparar contra el mismo mes del año anterior quita ese efecto.

## Causa raíz
leccion: analisis-causa-raiz
Las ventas cayeron 15 % ayer. ¿Cuál es un buen primer paso?
- [ ] Avisar a toda la empresa que el producto dejó de gustar a los clientes.
- [ ] Bajar los precios para recuperar las ventas.
- [x] Verificar que los datos estén completos y abrir la caída por dimensión.
- [ ] Esperar una semana antes de mirar nada.
porque: Muchas "caídas" son datos que no llegaron. Si el dato está bien, se abre por país, canal o producto hasta encontrar dónde se concentra.
