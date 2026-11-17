---
titulo: Proyecto final (solo el pedido) - la ingesta de ventas de punta a punta
nivel: 6 · Avanzado completo
duracion: 90
resumen: El pedido final llega como en un trabajo - un mensaje con requisitos. Dejas pl_ingesta_diaria lista para producción - parametrizada, que copia el archivo del día, lo limpia en Databricks, avisa y queda en rojo si algo falla, publicada y con su trigger - y entregas la evidencia y un plan para llevarla a prod. Sin pasos en el enunciado; la solución comentada está al final.
objetivos: Integrar parámetros, variables, Copy, Notebook y rutas de error en un pipeline | Publicar y programar | Verificar una ejecución completa en Monitor | Proponer el paso a producción con Git y plantillas | Documentar la operación
prerrequisitos: data-factory-paso-a-paso-de-la-practica-a-data-factory-real
autoevaluacion: ¿Tu pipeline sirve para cualquier fecha? | ¿Si falta el archivo, la guardia se entera y el pipeline queda en rojo? | ¿Corre solo todos los días? | ¿Tienes un plan para llevarlo a prod?
---

:::escenario El pedido
Mensaje de Lucía, el lunes a las 9:

*"Hoy cerramos la ingesta de ventas. Necesito `pl_ingesta_diaria` lista para producción:*

1. *Que sirva para cualquier día con un parámetro `fecha` (para reprocesar).*
2. *Que arme el nombre del archivo del día una sola vez y lo use para copiar de raw a bronze.*
3. *Que después de copiar, limpie en Databricks con el notebook `limpiar_ventas`, pasándole la fecha.*
4. *Si la copia falla: avisar a la guardia y que el pipeline quede en rojo, con un mensaje que diga qué día falló.*
5. *Publicado y corriendo solo todos los días a las 6:00.*
6. *Evidencia de una ejecución completa disparada por el trigger.*
7. *Un plan corto para pasarlo a prod.*

*Gracias!"*
:::

Tienes todo lo necesario de las lecciones anteriores. Trabaja solo; abre la solución cuando termines.

## Tu entrega

| # | Requisito | Cómo lo cumpliste | Evidencia |
|---|---|---|---|
| 1 | Parámetro `fecha` | | |
| 2 | Nombre calculado una vez | | |
| 3 | Limpieza en Databricks | | |
| 4 | Aviso y estado en rojo | | |
| 5 | Publicado y programado | | |
| 6 | Ejecución completa | | |
| 7 | Plan a prod | | |

## Cómo se ve terminado

```captura
archivo: adf/b24-lienzo.webp
texto: pl_ingesta_diaria - Armar nombre, la copia, el camino de error (guardia y Fail), Registrar exito y Limpiar ventas
```

```captura
archivo: adf/b24-publicar.webp
texto: Publish all con todo lo construido en el curso
```

```captura
archivo: adf/b24-monitor.webp
texto: Monitor - la ejecución disparada por tr_diario_0600 arriba de las anteriores
```

```captura
archivo: adf/b24-run.webp
texto: La ejecución completa (1) - el camino de error Skipped y la limpieza en Databricks Succeeded (2)
```

<details><summary>💡 Solución comentada</summary>

| # | Requisito | Cómo | Evidencia |
|---|---|---|---|
| 1 | Parámetro | Parámetro `fecha` del pipeline, usado con `@pipeline().parameters.fecha` | Parameters del pipeline; Trigger now pide el valor |
| 2 | Nombre una vez | Variable `archivo` asignada en `Armar nombre` con `@concat('ventas_', pipeline().parameters.fecha, '.csv')`; la copia depende de ella y usa `@variables('archivo')` | La salida de Armar nombre muestra el valor |
| 3 | Databricks | Notebook `Limpiar ventas` después de la copia (Upon Success), con base parameter `fecha` | Output con `runOutput` |
| 4 | Aviso y rojo | `Avisar a la guardia` (Upon Failure) → `Marcar como fallido` (Fail con mensaje y código) | Debug con `fecha = 2026-11-16`: copia Failed, aviso Succeeded, pipeline Failed |
| 5 | Programado | `tr_diario_0600` (Schedule diario) activo, todo publicado | Manage → Triggers *Started*; Publish all sin pendientes |
| 6 | Ejecución completa | Disparo del trigger | Monitor: *Triggered by* `tr_diario_0600`, todas las actividades del camino feliz en Succeeded |
| 7 | Plan a prod | Ver abajo | La nota |

**Decisiones que conviene defender.** El nombre se calcula **una vez** en una variable para que la copia y cualquier otra actividad usen el mismo valor. La limpieza depende **solo** de la copia con Upon Success: si la copia falla, no se limpia un día vacío. El camino de error termina en **Fail** para que Monitor y las alertas lo vean en rojo (lección 18).

**Plan a prod (ejemplo):**

1. Conectar el factory de dev a **Git** (GitHub o Azure DevOps) y trabajar por ramas con pull request.
2. Crear `adf-tiendaandina-prod` con su identidad administrada y darle **Blob Data Contributor** sobre la cuenta de prod y permisos en el workspace de prod.
3. Pipeline de **CI/CD** que despliegue la plantilla ARM del factory con los parámetros de prod (cuenta, workspace, vault), deteniendo y reiniciando triggers, con aprobación.
4. En prod: el trigger con la **zona horaria** del negocio, y la fecha tomada de `@trigger().scheduledTime` en lugar del valor por defecto.
5. **Alerta** sobre Failed pipeline runs con el grupo de acciones de la guardia, y un **Web** real que avise a Teams en lugar de la Wait.
6. Diagnostic settings a **Log Analytics** para guardar las ejecuciones más de 45 días.
7. Nota de operación actualizada (lección 12).

</details>

:::errores
- **Calcular el nombre del archivo en cada actividad.** Si una cambia, quedan distintos; una variable lo fija para todas.
- **Usar `utcNow()` en prod.** Un reproceso o un retraso cambia la fecha; usa `@trigger().scheduledTime`.
- **Desactivar alertas porque molestan.** Ajusta su ruido, pero que las fallas avisen.
:::

## ✅ Lista de verificación final

- [ ] El pipeline tiene el parámetro `fecha` y la variable `archivo`.
- [ ] La copia depende de `Armar nombre` y usa la variable.
- [ ] `Limpiar ventas` corre después de la copia y recibe la fecha.
- [ ] Con un día sin archivo, el pipeline avisa y termina **Failed** con tu mensaje.
- [ ] Todo está publicado y `tr_diario_0600` está activo.
- [ ] Hay una ejecución completa disparada por el trigger en Monitor.
- [ ] Tu plan a prod tiene al menos cinco pasos concretos.

## Lo que dominas ahora

- Las piezas de Data Factory y el Studio de punta a punta.
- Conexiones seguras con identidad administrada y Key Vault.
- Copiar, probar, publicar, programar y monitorear.
- Pipelines flexibles con parámetros, variables y expresiones.
- Recorrer y decidir: Get Metadata, ForEach, Lookup, If Condition y Fail.
- Rutas de error, Databricks y el patrón guiado por metadatos.
- Git, plantillas ARM, integration runtimes, seguridad y costos.

:::ejercicio quiz
¿Por qué el nombre del archivo se calcula en una variable y no en cada actividad?
- [ ] Porque Data Factory lo exige
- [x] Para que todas las actividades usen exactamente el mismo valor y se pueda ver en la salida
- [ ] Porque los parámetros no se pueden usar en una copia
- [ ] Porque las variables son más rápidas
:::

:::ejercicio quiz
¿Con qué condición se conecta la limpieza en Databricks a la copia?
- [x] Upon Success, para no limpiar un día que no se copió
- [ ] Upon Failure
- [ ] Upon Completion
- [ ] Upon Skip
:::

:::ejercicio quiz
En prod, ¿de dónde conviene tomar la fecha a procesar?
- [ ] Del valor por defecto del parámetro
- [x] De la hora programada del trigger, por ejemplo `@trigger().scheduledTime`
- [ ] De la hora en que alguien abre Monitor
- [ ] De utcNow(), que siempre coincide con la fecha del trigger
:::

:::ejercicio quiz
¿Cuál de estos es un paso legítimo del plan a prod?
- [ ] Editar el factory de prod a mano cada vez
- [x] Desplegar la plantilla ARM con un pipeline de CI/CD y parámetros de prod, con aprobación
- [ ] Copiar las claves de dev a prod
- [ ] Desactivar las alertas para que no molesten
:::
