---
titulo: El pedido - tres sistemas, un cliente y nadie sabe cuánto facturamos de verdad
nivel: Avanzado
duracion: 25
resumen: Cuentas Claras vende un software de facturación por suscripción a pymes. Finanzas no sabe explicar el MRR, Customer Success mira tres sistemas para entender a un cliente y Ventas quiere ver todo sin salir del CRM. El pedido, sin paso a paso.
objetivos: Entender métricas de negocio SaaS (MRR y sus movimientos) antes de calcularlas | Unir entidades entre sistemas que no comparten identificadores | Planificar un reverse ETL hacia una herramienta operativa
prerrequisitos: proyecto-mercado-vecino-el-pedido
autoevaluacion: ¿Sabes qué es el MRR y por qué un plan anual no suma 12 veces? | ¿Sabes cómo unir un cliente de facturación con una empresa del CRM? | ¿Sabes qué es un reverse ETL?
---

:::escenario Martes, 9:00 · Cuentas Claras
Cuentas Claras tiene 400 clientes que pagan una suscripción mensual o anual. Tres sistemas: **Contacto CRM** (lo usa Ventas), **Cobrable** (la plataforma de cobros por suscripción) y **Medidor** (la analítica del producto). Cada uno tiene su id del cliente y ninguno conoce los otros.
:::

## Los pedidos

> **Andrea Molina (CFO):** el directorio me pregunta cuánto crecimos y de dónde viene el crecimiento. Necesito el MRR de cada mes y separado en nuevos, expansión, contracción, bajas y reactivaciones. Que se pueda auditar cliente por cliente.

> **Customer Success:** para saber si un cliente está bien abrimos el CRM, Cobrable y Medidor. Queremos una sola tabla con todo y un *health score*.

> **Ventas:** nosotros vivimos en el CRM. Si el health score existe, lo queremos ver ahí, en la ficha de la empresa.

## Lo que hay que entregar

| Entrega | Qué es |
|---|---|
| `cc.gold.mrr_mensual` | Por cliente y mes (últimos 6 meses cerrados): MRR y movimiento |
| `cc.gold.cliente_360` | Por cada cliente que hoy paga: empresa del CRM, plan, MRR, uso de los últimos 30 días y health score |
| Reverse ETL | `health_score`, `mrr_actual` y `plan_actual` escritos en la empresa del CRM |

Las definiciones exactas están en [Fuentes y accesos](#/l/proyecto-cuentas-claras-fuentes-y-accesos). Lo que viene después, en [El día a día](#/l/proyecto-cuentas-claras-el-dia-a-dia).

:::trabajo Las métricas se definen antes de calcularse
"MRR" parece obvio hasta que preguntas: ¿un plan anual de 790 USD es 790 de MRR? (No: es 65,83.) ¿Una prueba gratis cuenta? (No.) ¿Un cliente moroso? (Depende de la empresa: acá sí, hasta que se da de baja.) Escribe la definición con finanzas **antes** de escribir SQL.
:::

:::real En tu computadora y en la web real
En una empresa SaaS, "cuánto facturamos" tiene varias respuestas. Antes de tocar datos, escribe en `docs/definiciones.md` qué es **MRR**, qué cuenta como cliente activo y cómo se trata un descuento, y hazlo aprobar por finanzas.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio del proyecto y úsalas en el README.

- `01-definiciones.png`: tus definiciones de negocio aprobadas.

Antes de publicar, tapa con un rectángulo los correos, los IDs de suscripción y de tenant, los nombres de cuentas reales y cualquier clave o token.
:::

## Ejercicios

:::ejercicio quiz
Un cliente tiene el plan Pro anual (790 USD por año) con un 20 % de descuento vigente. ¿Cuál es su MRR?
- [ ] 790
- [ ] 65,83
- [x] 52,67 (790 / 12 × 0,8)
- [ ] 632
:::

:::ejercicio quiz
Un cliente se dio de baja en marzo y volvió en junio. En junio, ¿qué movimiento es?
- [ ] Nuevo
- [x] Reactivación: ya había tenido MRR antes
- [ ] Expansión
- [ ] Ninguno
:::

## Resumen

- Tres sistemas, tres ids, ninguna llave común confiable.
- Métricas de negocio con **definiciones acordadas**.
- La salida no termina en el lago: vuelve al CRM (**reverse ETL**).
