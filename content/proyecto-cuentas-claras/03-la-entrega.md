---
titulo: La entrega - las tablas, el reverse ETL y la revisión
nivel: Avanzado
duracion: 20
resumen: Las columnas exactas de cc.gold.mrr_mensual y cc.gold.cliente_360, qué se espera del reverse ETL y la revisión automática contra la facturación, el CRM y el uso real.
objetivos: Construir métricas auditables | Unir tres sistemas en una vista por cliente | Escribir de vuelta en una herramienta operativa
prerrequisitos: proyecto-cuentas-claras-fuentes-y-accesos
autoevaluacion: ¿Sabes qué clientes entran en cliente_360? | ¿Sabes qué empresa del CRM es la principal cuando hay duplicados?
---

## cc.gold.mrr_mensual

`cliente_id` (id de Cobrable), `mes` (AAAA-MM), `mrr`, `movimiento`. Los últimos 6 meses cerrados; una fila por cliente con MRR > 0 o con churn ese mes.

## cc.gold.cliente_360

`billing_customer_id`, `crm_company_id`, `plan`, `mrr_actual`, `usuarios_activos_30d`, `facturas_30d`, `health_score`. Una fila por cliente que **hoy** paga (MRR > 0).

- `crm_company_id`: la empresa **principal** del CRM. Si Cobrable no trae `metadata.crm_company_id`, se une por dominio normalizado. Si hay duplicados, la principal es la que es `customer` (el duplicado es un `lead` creado después).
- Uso: los últimos 30 días cerrados.

## Reverse ETL

`health_score`, `mrr_actual` y `plan_actual` en la empresa principal del CRM de cada cliente que paga, iguales a `cliente_360`. Se revisa en el ticket de Ventas.

## La revisión

<div data-cc="revisar"></div>

:::real En tu computadora y en la web real
El **reverse ETL** devuelve datos al CRM. En una empresa se hace con una herramienta (Hightouch, Census) o con un job propio que llama a la API del CRM. Pruébalo primero con pocos clientes y deja registro de qué se escribió.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio del proyecto y úsalas en el README.

- `03-mrr.png`: la tabla de MRR mensual.
- `03-cliente360.png`: la vista 360 de un cliente.
- `03-reverse.png`: el campo actualizado en el CRM.

Antes de publicar, tapa con un rectángulo los correos, los IDs de suscripción y de tenant, los nombres de cuentas reales y cualquier clave o token.
:::

## Resumen

- MRR auditable por cliente y mes.
- Una vista 360 con la empresa principal y el uso de 30 días.
- El resultado vuelve al CRM.
