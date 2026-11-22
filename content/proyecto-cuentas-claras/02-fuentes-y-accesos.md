---
titulo: Fuentes y accesos - CRM, Cobrable, Medidor y las definiciones de negocio
nivel: Avanzado
duracion: 40
resumen: La referencia de las tres APIs (autenticación, paginación, límites y formatos) y las definiciones que acordó finanzas para el MRR, los movimientos y el health score.
objetivos: Paginar APIs con cursor y con starting_after | Reconstruir el estado de suscripciones a partir de un log de eventos | Unir entidades por id externo y por dominio | Escribir en una API respetando límites
prerrequisitos: proyecto-cuentas-claras-el-pedido
autoevaluacion: ¿Sabes cómo pasar de un log de eventos al estado al cierre de cada mes? | ¿Sabes qué hacer con un 429? | ¿Sabes calcular el health score?
---

## Accesos

```bash
cuentas accesos
```

```diagrama
titulo: Tres sistemas, una métrica de ingresos que tiene que cuadrar con finanzas
nodo crm: Contacto CRM | icono=equipo | col=0 | fila=0 | color=azul | sub=empresas, contactos, oportunidades
nodo cob: Cobrable | icono=dinero | col=0 | fila=1 | color=verde | sub=suscripciones y facturas
nodo med: Medidor | icono=grafico | col=0 | fila=2 | color=violeta | sub=uso del producto
nodo lake: Lakehouse | icono=capas | col=1 | fila=1 | color=naranja | sub=MRR, churn, cuentas en riesgo
nodo rev: Reverse ETL | icono=transformar | col=2 | fila=0 | color=amarillo | sub=puntaje de riesgo de vuelta al CRM
flecha crm -> lake | explica=Del CRM llegan las empresas, los contactos y las oportunidades.
flecha cob -> lake | explica=De Cobrable, las suscripciones y las facturas: de ahí sale el MRR, que tiene que cuadrar con finanzas.
flecha med -> lake | explica=Del Medidor, el uso del producto: si una cuenta usa cada vez menos, está en riesgo.
flecha lake -> rev | explica=El lakehouse calcula un puntaje de riesgo por cuenta.
flecha rev -> crm | estilo=punteada | explica=El reverse ETL lo escribe de vuelta en el CRM, para que el equipo comercial lo vea donde trabaja.
```

## Contacto CRM · `https://api.contactocrm.example`

`Authorization: Bearer pat-…` · **100 pedidos cada 10 segundos** (429 con `Retry-After`).

| Ruta | Qué devuelve |
|---|---|
| `GET /crm/v3/objects/companies?limit=100&after=<id>&properties=name,domain,hubspot_owner_id,lifecyclestage&archived=false` | Empresas, de a 100. La respuesta trae `paging.next.after` mientras haya más. `archived=true` lista las archivadas (con `mergedInto` si se fusionaron) |
| `GET /crm/v3/objects/companies/{id}` | Una empresa |
| `PATCH /crm/v3/objects/companies/{id}` | Cuerpo `{"properties": {"health_score": "72", "mrr_actual": "79.00", "plan_actual": "pro"}}`. Solo esas tres propiedades personalizadas. No se puede escribir en una empresa archivada |
| `GET /crm/v3/owners` | Vendedores |

El `domain` lo escriben los vendedores a mano: a veces con `www.`, a veces en mayúsculas.

## Cobrable · `https://api.cobrable.example`

`Authorization: Bearer ck_live_…` · solo lectura · listas del **más nuevo al más viejo** con `limit` y `starting_after`.

| Ruta | Qué devuelve |
|---|---|
| `GET /v1/customers` | Clientes. `metadata.crm_company_id` cuando Ventas lo cargó (no siempre) |
| `GET /v1/subscriptions` | El estado **actual** de cada suscripción |
| `GET /v1/events` | Toda la historia: `customer.subscription.created`, `.updated` (con `previous_attributes`) y `.deleted`. Cada evento trae la suscripción completa como quedó |

Suscripción: `status` (`trialing`, `active`, `past_due`, `canceled`), `plan.interval` (`month` o `year`), `plan.amount` en **centavos** (el anual cobra 10 meses), `quantity` (asientos, solo el plan Empresa) y `discount.coupon.percent_off`.

## Medidor · `https://api.medidor.example`

HTTP Basic: el secreto del proyecto como usuario, contraseña vacía (`curl -u mx_…:`).

| Ruta | Qué devuelve |
|---|---|
| `GET /api/2.0/export?from_date=AAAA-MM-DD&to_date=AAAA-MM-DD` | Eventos en JSON por líneas. Máximo **7 días** por pedido y solo días completos |
| `GET /api/2.0/users` | Usuarios: `user_id`, `account_id`, `billing_customer_id` |

Eventos: `pagina_vista` (antes del login, con un id **anónimo**), `$identify` (une el id anónimo con el usuario), `login`, `factura_emitida`, `usuario_invitado`. `time` en milisegundos.

## Las definiciones (acordadas con finanzas)

**MRR** de una suscripción en un instante: si `status` es `active` o `past_due`, precio mensual (el anual dividido por 12) × asientos × (1 − descuento). Si no, 0. El MRR de un mes es el del **cierre del mes** (hora de Ciudad del Río).

**Movimiento** de un cliente en un mes, comparando con el cierre del mes anterior:

| Antes → ahora | Movimiento |
|---|---|
| 0 → > 0, nunca tuvo MRR | `nuevo` |
| 0 → > 0, ya había tenido | `reactivacion` |
| > 0 → 0 | `churn` |
| sube / baja | `expansion` / `contraccion` |
| igual (> 0) | `sin_cambio` |

**Health score** (0 a 100) = `round(50 × activos / usuarios + 50 × min(1, facturas / 60))`, donde, en los últimos 30 días cerrados: `activos` = usuarios distintos de la cuenta que hicieron login, `usuarios` = total de usuarios de la cuenta y `facturas` = facturas emitidas.

```sql norun
-- del log de eventos al estado al cierre de cada mes: el último evento de cada suscripción hasta esa fecha
SELECT * FROM (
  SELECT m.mes, e.*, ROW_NUMBER() OVER (PARTITION BY m.mes, e.cliente ORDER BY e.creado DESC) AS rn
  FROM meses m JOIN eventos e ON e.creado <= m.cierre) x WHERE rn = 1;
```

:::real En tu computadora y en la web real
Cada API se prueba primero desde la terminal con `curl` (o con Postman/Bruno), mirando la paginación y los límites de uso. Los tokens van en variables de entorno (`export CRM_TOKEN=…` solo en tu terminal) o en el Key Vault; nunca en el repositorio. Las URLs reales de cada proveedor están en su portal de desarrolladores.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio del proyecto y úsalas en el README.

- `02-apis.png`: una respuesta de cada API (sin tokens).

Antes de publicar, tapa con un rectángulo los correos, los IDs de suscripción y de tenant, los nombres de cuentas reales y cualquier clave o token.
:::

## Ejercicios

:::ejercicio quiz
Pides /v1/subscriptions para calcular el MRR de hace tres meses. ¿Qué problema hay?
- [ ] Ninguno
- [x] Devuelve el estado de hoy; para un mes pasado hay que reconstruir el estado con el log de eventos
- [ ] Solo devuelve 10
- [ ] Está en centavos
:::

:::ejercicio quiz
El reverse ETL recibe un 429. ¿Qué haces?
- [x] Esperar lo que dice Retry-After y reintentar ese pedido; idealmente, ir más despacio para no llegar al límite
- [ ] Saltear esa empresa
- [ ] Reintentar enseguida en un bucle
- [ ] Pedir otro token
:::

## Resumen

- CRM: cursor `after`, archivadas aparte, 100 pedidos / 10 s, PATCH de tres propiedades.
- Cobrable: el **log de eventos** es la historia; `/v1/subscriptions` es solo el presente.
- Medidor: export de 7 días, identidad anónima y usuarios por cuenta.
- Definiciones exactas de MRR, movimiento y health score.
