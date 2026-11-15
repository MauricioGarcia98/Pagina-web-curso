---
titulo: Bloqueos y Azure Monitor - que nada se borre por error y enterarte cuando algo falla
nivel: 5 · Avanzado
duracion: 50
resumen: Un bloqueo impide borrar o cambiar recursos aunque tengas permiso de Owner, y Azure Monitor avisa cuando algo pasa. Pones un bloqueo CanNotDelete en el grupo dev y compruebas que un borrado falla, lees métricas de la cuenta, creas un grupo de acciones para la guardia y dos reglas de alerta - pipelines fallidos en Data Factory y capacidad del lago - y ves una alerta dispararse.
objetivos: Crear un bloqueo Delete o Read-only y entender su herencia | Comprobar que un bloqueo impide un borrado | Leer métricas con distintas agregaciones | Crear un grupo de acciones | Crear reglas de alerta con umbral y severidad, y leer las alertas disparadas
prerrequisitos: azure-paso-a-paso-proteccion-de-datos-y-ciclo-de-vida
autoevaluacion: ¿Sabes qué diferencia hay entre Delete y Read-only? | ¿Sabes por qué un bloqueo se hereda? | ¿Sabes qué agregación usar para contar fallos? | ¿Sabes qué es un grupo de acciones?
---

## Paso 1 — Los bloqueos

En `rg-tiendaandina-dev`, menú **Locks → + Add**:

1. **Lock name**: `no-borrar-dev`.
2. **Lock type**: **Delete**.
3. **Notes**: *Protege la plataforma dev de borrados accidentales*.

```captura
archivo: azure/b19-lock-agregar.webp
texto: Add lock - nombre (1), tipo (2) y notas (3)
```

| Tipo | Nombre técnico | Permite | Impide |
|---|---|---|---|
| **Delete** | `CanNotDelete` | Leer y cambiar | **Borrar** |
| **Read-only** | `ReadOnly` | Solo leer | Borrar **y cambiar** |

```captura
archivo: azure/b19-locks.webp
texto: El bloqueo en el grupo
```

El bloqueo del grupo se **hereda** a todos sus recursos. Pruébalo: en `kv-tiendaandina-dev`, **Delete**, confirma, y abre las notificaciones:

```captura
archivo: azure/b19-borrar-bloqueado.webp
texto: "cannot perform delete operation because following scope(s) are locked" (ScopeLocked)
```

Ni siquiera un **Owner** puede borrar: primero tiene que quitar el bloqueo, a propósito. Ese paso extra es el que evita el desastre del "borré el grupo equivocado".

:::cuidado Read-only es más fuerte de lo que parece
Un bloqueo **Read-only** en una cuenta de almacenamiento impide, por ejemplo, **listar las claves** (porque esa operación es técnicamente un POST). Puede romper herramientas que funcionaban. Para producción, el bloqueo habitual es **Delete**.
:::

## Paso 2 — Azure Monitor

Busca **Monitor**:

```captura
archivo: azure/b19-monitor.webp
texto: Monitor - las pestañas (1) y sus piezas: métricas, alertas, grupos de acciones y registro de actividad (2)
```

| Pieza | Qué es | Ejemplo |
|---|---|---|
| **Metrics** | Números medidos cada minuto | Pipelines fallidos por hora |
| **Alerts** | Reglas: "si la métrica pasa el umbral, avisar" | Más de 0 pipelines fallidos |
| **Action groups** | A quién y cómo se avisa | Correo a la guardia |
| **Logs** (Log Analytics) | Registros detallados que se consultan con KQL | El error exacto de una actividad |

## Paso 3 — Las métricas

Pestaña **Metrics**. Elige la cuenta `sttiendaandinadev`, la métrica **Used capacity** y la agregación **Maximum**:

```captura
archivo: azure/b19-metricas.webp
texto: El recurso, la métrica y la agregación (1), el gráfico de 24 horas y New alert rule (2)
```

| Agregación | Para |
|---|---|
| **Sum** | **Contar** cosas: fallos, transacciones |
| **Average** | Porcentajes y tiempos: disponibilidad, latencia |
| **Maximum / Minimum** | Los extremos: el pico de capacidad |

## Paso 4 — El grupo de acciones

Pestaña **Action groups → + Create**:

```captura
archivo: azure/b19-grupo-acciones.webp
texto: El nombre (1), el nombre corto (2) y el correo de la guardia (3)
```

Un **grupo de acciones** se crea **una vez** y lo reutilizan muchas alertas. En Azure real puede enviar correo, SMS, una notificación a la app de Azure, llamar a un webhook (Teams, Slack, PagerDuty) o ejecutar una Function o un runbook.

## Paso 5 — Las reglas de alerta

Pestaña **Alerts → + Create alert rule**. La primera, para Data Factory:

1. **Scope**: `adf-tiendaandina-dev`.
2. **Signal**: **Failed pipeline runs**, agregación **Sum**.
3. **Operator**: Greater than. **Threshold**: `0`.
4. **Severity**: 1 - Error.
5. **Action group**: `ag-guardia-datos`. **Name**: `adf-pipeline-fallido`.

```captura
archivo: azure/b19-alerta-crear.webp
texto: El recurso (1), la métrica (2), el umbral (3) y el grupo de acciones (4)
```

Crea una segunda regla, `lago-capacidad`, sobre `sttiendaandinadev` con **Used capacity**, **Maximum**, **Greater than 100** (bytes, para que se dispare en la práctica):

```captura
archivo: azure/b19-alertas.webp
texto: Las reglas con su estado (1) y la alerta disparada por la capacidad del lago (2)
```

`adf-pipeline-fallido` está en **OK** (no hubo fallos) y `lago-capacidad` se **disparó** (*Fired*): el lago pasó los 100 bytes y se avisó a `ag-guardia-datos`.

:::tip Severidades
**Sev 0** crítico, **Sev 1** error, **Sev 2** advertencia, **Sev 3** informativo, **Sev 4** detallado. Un buen sistema de alertas tiene pocas Sev 0 y 1, y cada una significa "alguien tiene que hacer algo ahora". Si las alertas suenan todo el día, la guardia deja de mirarlas.
:::

## ✅ Lo que lograste

- Bloqueaste el grupo dev y comprobaste que impide borrar.
- Lees métricas con la agregación correcta.
- Tienes un grupo de acciones y dos reglas de alerta, una disparada.

:::ejercicio quiz
¿Qué bloqueo impide borrar pero permite seguir cambiando la configuración?
- [x] Delete (CanNotDelete)
- [ ] Read-only
- [ ] Ninguno
- [ ] Los dos
:::

:::ejercicio quiz
Hay un bloqueo Delete en el grupo. ¿Puedes borrar una cuenta de almacenamiento de adentro?
- [ ] Sí, el bloqueo es solo del grupo
- [x] No, el bloqueo se hereda a los recursos del grupo
- [ ] Sí, si eres Owner
- [ ] Solo los fines de semana
:::

:::ejercicio quiz
¿Qué agregación usas para saber cuántos pipelines fallaron en la última hora?
- [x] Sum
- [ ] Average
- [ ] Minimum
- [ ] Ninguna
:::

:::ejercicio quiz
¿Para qué sirve un grupo de acciones?
- [ ] Para agrupar recursos
- [x] Para definir una vez a quién y cómo se avisa, y reutilizarlo en muchas alertas
- [ ] Para dar permisos
- [ ] Para guardar logs
:::
