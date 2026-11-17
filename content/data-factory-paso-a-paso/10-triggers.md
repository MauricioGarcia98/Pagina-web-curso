---
titulo: Triggers - programados y por eventos
nivel: 3 · Intermedio
duracion: 40
resumen: Un trigger decide cuándo corre un pipeline sin que nadie lo lance. Creas el trigger diario tr_diario_0600, entiendes por qué un trigger nuevo no hace nada hasta publicarlo, lo ves en Manage y en Monitor, lo publicas y ves su primera ejecución. Además, conoces los otros tipos de trigger - ventana de tiempo y eventos de almacenamiento - y cuándo conviene cada uno.
objetivos: Crear un trigger programado | Entender que un trigger también se publica | Ver y activar triggers en Manage | Distinguir schedule, tumbling window y eventos de almacenamiento | Elegir el tipo de trigger según el caso
prerrequisitos: data-factory-paso-a-paso-publicar-y-trigger-now
autoevaluacion: ¿Sabes por qué un trigger recién creado no dispara? | ¿Sabes cuándo usar un trigger por eventos? | ¿Sabes en qué zona horaria se programa? | ¿Sabes cómo detener un trigger sin borrarlo?
---

:::escenario El pedido
Lucía: *"Las tiendas dejan los archivos hasta las 5:30. Que la ingesta corra sola todos los días a las 6:00."*
:::

:::analogia Despertador, timbre y calendario por turnos
Un trigger Schedule es un despertador: suena a la hora fijada. Uno de eventos de almacenamiento es un timbre: suena cuando llega un archivo. Un tumbling window es un calendario de turnos: cada ventana de tiempo tiene su corrida y se puede volver a procesar.
:::

## Paso 1 — Crear el trigger

En `pl_ingesta_diaria`, **Add trigger → New/Edit**:

1. **Name**: `tr_diario_0600`.
2. **Type**: **Schedule**.
3. **Recurrence**: cada **1 Day(s)**.
4. **Start trigger on creation**: marcado.

```captura
archivo: adf/b10-nuevo-trigger.webp
texto: Add triggers - nombre (1), tipo (2), frecuencia (3 y 4) y activación (5)
```

:::nota La hora y la zona horaria
En el Data Factory real, un trigger Schedule tiene **Start date**, **Time zone** y, en la recurrencia diaria, a qué horas y minutos corre (por ejemplo 6:00). Elige siempre la **zona horaria** del negocio: si no, corre en UTC y "las 6:00" pasan a ser las 3:00 en Buenos Aires o la 1:00 en Lima.
:::

## Paso 2 — Un trigger también se publica

**Manage → Triggers**:

```captura
archivo: adf/b10-triggers.webp
texto: El trigger, activado (Started) y asociado a pl_ingesta_diaria
```

Pero arriba Publish all marca **1 cambio sin publicar**: el trigger. En **Monitor**, la lista de triggers tiene un botón **Simular disparo** (propio de la práctica, porque no vas a esperar hasta mañana a las 6:00). Pruébalo:

```captura
archivo: adf/b10-sin-publicar.webp
texto: "Este trigger no está publicado: el servicio todavía no lo conoce"
```

Un trigger creado o activado **no hace nada hasta publicarlo**. Es un error clásico: "configuré el trigger y nunca corrió".

## Paso 3 — Publicar y disparar

**Publish all → Publish**. Vuelve a Monitor y usa **Simular disparo**:

```captura
archivo: adf/b10-disparado.webp
texto: La ejecución disparada por tr_diario_0600 (1) y el trigger en la lista (2)
```

La columna **Triggered by** dice qué la disparó: `tr_diario_0600`, `Manual trigger` o `Rerun`.

## Paso 4 — Los tipos de trigger

| Tipo | Cuándo dispara | Ideal para |
|---|---|---|
| **Schedule** | En horarios fijos (cada día a las 6:00, cada hora) | Cargas diarias o periódicas |
| **Tumbling window** | En ventanas de tiempo seguidas, sin huecos ni solapamientos, con reintento y backfill | Procesar "la hora 14:00–15:00" y poder reprocesar ventanas pasadas |
| **Storage events** | Cuando se crea o borra un archivo en una cuenta de almacenamiento | "Procesa el archivo apenas llegue" |
| **Custom events** | Cuando llega un evento de Event Grid | Integraciones con otros sistemas |

:::tip ¿Programado o por evento?
Si los archivos llegan a una hora predecible, **Schedule** es simple y fácil de monitorear. Si llegan cuando llegan y hay que procesarlos rápido, **Storage events**. Un trigger por eventos necesita que el proveedor de recursos **Event Grid** esté registrado en la suscripción.
:::

## Paso 5 — Detener sin borrar

En **Manage → Triggers**, el botón **Started** lo pasa a **Stopped**. Igual que al crearlo, **hay que publicar** para que el servicio deje de dispararlo. Lo practicas en el proyecto de este nivel.

:::errores
- **Crear el trigger y no publicarlo.** Un trigger sin publicar no existe para el servicio.
- **Dejar la zona horaria en UTC.** Las 6:00 UTC son las 3:00 en Buenos Aires.
- **Schedule cada 5 minutos para archivos que llegan a cualquier hora.** Un trigger de eventos corre solo cuando llega el archivo.
:::

## ✅ Lo que lograste

- Creaste un trigger diario y lo publicaste.
- Sabes que un trigger sin publicar no dispara.
- Conoces los cuatro tipos y cuándo usar cada uno.

:::ejercicio quiz
Creaste y activaste un trigger ayer y no corrió nunca. ¿Qué es lo más probable?
- [ ] El pipeline tiene un error
- [x] No se publicó el trigger
- [ ] El trigger necesita que lo ejecutes una vez a mano
- [ ] Falta un rol
:::

:::ejercicio quiz
Los archivos llegan a cualquier hora y hay que procesarlos apenas llegan. ¿Qué trigger usas?
- [ ] Schedule cada día
- [x] Storage events
- [ ] Trigger now
- [ ] Tumbling window de 1 minuto
:::

:::ejercicio quiz
Necesitas procesar por horas y poder reprocesar ventanas pasadas. ¿Qué tipo conviene?
- [ ] Schedule
- [x] Tumbling window
- [ ] Storage events
- [ ] Schedule con catchup
:::

:::ejercicio quiz
Programaste el trigger a las 6:00 sin elegir zona horaria y corre a las 3:00 en Buenos Aires. ¿Por qué?
- [x] Porque quedó en UTC
- [ ] Porque el servidor está atrasado
- [ ] Porque Data Factory redondea
- [ ] Porque el trigger está detenido
:::
