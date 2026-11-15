---
titulo: Etiquetas, registro de actividad y costos
nivel: 2 · Básico-intermedio
duracion: 35
resumen: Tres herramientas que responden las preguntas que siempre llegan - ¿de quién es esto?, ¿quién lo cambió? y ¿cuánto cuesta? Editas etiquetas de un recurso, lees el registro de actividad, abres Cost Management para ver el costo por servicio, por recurso y por grupo, y creas un presupuesto con alertas al 50, 80 y 100 por ciento.
objetivos: Editar las etiquetas de un recurso | Leer el registro de actividad para saber quién hizo qué | Ver el costo por servicio, por recurso y por grupo | Crear un presupuesto con umbrales de alerta | Explicar qué hace y qué no hace un presupuesto
prerrequisitos: azure-paso-a-paso-adls-gen2-y-las-capas-del-lago
autoevaluacion: ¿Sabes dónde ver quién borró un recurso? | ¿Sabes cuánto tiempo guarda Azure el registro de actividad? | ¿Sabes ver el costo de un solo grupo? | ¿Sabes si un presupuesto frena el gasto?
---

:::escenario El pedido
Lucía: *"Finanzas nos pide dos cosas: que podamos explicar cada peso que gasta el equipo, y que nos avisen antes de pasarnos de USD 20 por mes en dev."*
:::

## Paso 1 — Editar etiquetas

En `sttiendaandinadev`, menú **Tags**:

```captura
archivo: azure/b07-etiquetas.webp
texto: Tags de la cuenta - se agregan, cambian o borran y se guardan con Apply
```

Cambia, agrega o quita pares y pulsa **Apply**. Si hiciste la pista del proyecto 1, ya tiene `owner`. Las etiquetas típicas en una empresa:

| Etiqueta | Ejemplo | Para qué |
|---|---|---|
| `entorno` | `dev`, `qa`, `prod` | Separar costos y aplicar políticas distintas |
| `owner` | `equipo-datos` | Saber a quién preguntar |
| `proyecto` o `costcenter` | `tienda-andina`, `1234` | Repartir la factura |

## Paso 2 — El registro de actividad

En el buscador escribe `activity log`:

```captura
archivo: azure/b07-actividad.webp
texto: Activity log - cada operación de escritura con su estado, hora, recurso y quién la hizo
```

El **registro de actividad** guarda cada operación de **escritura** sobre los recursos: crear, cambiar, borrar, asignar un rol, generar una clave. Responde la pregunta de todo incidente: *"¿quién cambió esto y cuándo?"*.

- Se guarda **90 días**. Para más tiempo se envía a un Log Analytics workspace o a una cuenta de almacenamiento.
- No registra **lecturas de datos** (quién descargó un archivo). Eso son los *diagnostic logs* de cada recurso.

Cada recurso y cada grupo tienen también su propio **Activity log** en el menú, filtrado a lo suyo.

## Paso 3 — Cost Management

Abre **Cost Management** desde Home:

```captura
archivo: azure/b07-costos.webp
texto: Cost analysis - costo actual, pronóstico y presupuesto (1), y costo por servicio (2)
```

| Dato | Qué es |
|---|---|
| **Actual cost** | Lo gastado en el mes hasta hoy |
| **Forecast** | La proyección a fin de mes con el ritmo actual |
| **Cost by service** | Qué tipo de servicio gasta más |
| **Cost by resource** | Qué recurso puntual gasta más |

:::nota Precios de práctica
Los montos de la práctica son inventados para aprender a leerlos. En Azure real, una cuenta de almacenamiento cobra por **GB guardado**, por **operaciones** y por **datos que salen** de la región; un workspace de Databricks cobra por las **máquinas** y los **DBU** mientras los clústeres están encendidos.
:::

También puedes ver el costo de **un solo grupo**: en `rg-tiendaandina-dev`, menú **Cost analysis**:

```captura
archivo: azure/b07-costos-grupo.webp
texto: Cost analysis del grupo (1) - solo los recursos de rg-tiendaandina-dev (2)
```

## Paso 4 — Un presupuesto con alertas

En Cost Management, **Budgets → + Add**:

1. **Name**: `presupuesto-datos-dev`.
2. **Amount (USD)**: `20`.
3. **Alert conditions**: `50, 80, 100`.
4. **Alert recipients**: el correo del equipo.

```captura
archivo: azure/b07-presupuesto.webp
texto: Create budget - monto (1), umbrales de alerta (2) y destinatarios (3)
```

Haz clic en **Create**:

```captura
archivo: azure/b07-presupuestos.webp
texto: El presupuesto creado (1) con su gasto evaluado y sus alertas (2)
```

:::cuidado Un presupuesto avisa, no frena
Cuando el gasto llega al 50, 80 o 100 %, Azure **manda un correo**. **No apaga nada**. Si un clúster de Databricks queda encendido el fin de semana, el presupuesto avisa y el gasto sigue. Para cortar automáticamente hay que conectar la alerta a una automatización (un *action group* que ejecute un runbook o una Function), o usar los límites propios de cada servicio, como el apagado automático de los clústeres.
:::

## ✅ Lo que lograste

- Editas etiquetas para que cada recurso tenga dueño y entorno.
- Sabes responder "¿quién cambió esto?" con el registro de actividad.
- Lees el costo por servicio, recurso y grupo, y tienes un presupuesto con alertas.

:::ejercicio quiz
Alguien borró un contenedor ayer. ¿Dónde ves quién fue?
- [ ] En Cost Management
- [x] En el Activity log
- [ ] En las etiquetas
- [ ] No se puede saber
:::

:::ejercicio quiz
¿Cuánto tiempo guarda Azure el registro de actividad por defecto?
- [ ] 7 días
- [ ] 30 días
- [x] 90 días
- [ ] Para siempre
:::

:::ejercicio quiz
El gasto llegó al 100 % del presupuesto. ¿Qué hace Azure?
- [ ] Apaga todos los recursos
- [ ] Borra el grupo
- [x] Envía la alerta a los destinatarios; los recursos siguen funcionando y cobrando
- [ ] Bloquea la suscripción
:::

:::ejercicio quiz
¿Cómo ves el costo de solo el entorno dev?
- [x] En el grupo `rg-tiendaandina-dev` → Cost analysis, o filtrando por la etiqueta `entorno=dev`
- [ ] En el Activity log
- [ ] Sumando a mano las facturas
- [ ] No se puede separar
:::
