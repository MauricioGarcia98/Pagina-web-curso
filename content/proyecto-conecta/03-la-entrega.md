---
titulo: La entrega - las tablas, el asistente y la revisión
nivel: Avanzado
duracion: 20
resumen: Las columnas exactas de conecta.silver.interacciones, conecta.gold.sla_empresas y conecta.gold.evaluacion_rag, y la revisión automática contra la mesa de ayuda, los correos, los contratos y el registro de Lumen IA.
objetivos: Unificar canales distintos en una tabla | Medir un SLA con datos de contratos | Evaluar un RAG con recall@3 y exactitud
prerrequisitos: proyecto-conecta-fuentes-y-accesos
autoevaluacion: ¿Sabes qué id lleva un correo? | ¿Sabes cuántas veces cuenta un correo que llegó a dos buzones?
---

## conecta.silver.interacciones

`id` (el del ticket, o el `Message-ID` del correo), `canal` (`ticket` o `correo`), `cliente_id`, `fecha`, `categoria` (una de `facturacion`, `tecnico`, `baja`, `mudanza`, `ventas`, `reclamo`).

Desde dos días antes del arranque del proyecto hasta ayer. Sin repetidos. Al menos 92% de aciertos.

## conecta.gold.sla_empresas

`cliente_id`, `tickets`, `dentro_plazo`, `cumplimiento_pct` (un decimal). Una fila por empresa con contrato, con los tickets creados en los 7 días cerrados que terminan anteayer.

## conecta.gold.evaluacion_rag

`pregunta_id`, `articulos` (los ids de los 3 artículos que recuperó tu buscador, separados por coma, en orden), `respuesta`.

## El consumo

<div data-conecta="gasto"></div>

## La revisión

<div data-conecta="revisar"></div>

:::real En tu computadora y en la web real
La evaluación de un asistente (RAG) se guarda como tabla para compararla en el tiempo. En una empresa, se corre en cada cambio de prompt o de modelo, igual que una prueba del CI. Antes del pull request, revisa a mano algunas respuestas además de las métricas.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio del proyecto y úsalas en el README.

- `03-sla.png`: la tabla de SLA por empresa.
- `03-evaluacion.png`: la evaluación del asistente con sus métricas.

Antes de publicar, tapa con un rectángulo los correos, los IDs de suscripción y de tenant, los nombres de cuentas reales y cualquier clave o token.
:::

## Resumen

- Una tabla para dos canales, deduplicada y clasificada.
- El plazo vigente de cada contrato, con sus adendas.
- El asistente se evalúa con preguntas reales, también con las que no tienen respuesta.
