---
titulo: Proyecto 5 (con mínima ayuda) - endurecer el lago antes de producción
nivel: 5 · Avanzado
duracion: 55
resumen: Seguridad revisó tu informe del proyecto 4 y te devuelve una lista de controles obligatorios para cualquier lago que vaya a producción. Los aplicas en el lago dev sin instrucciones paso a paso - protección de datos, ciclo de vida, bloqueo, alertas y acceso temporal para terceros - y entregas la evidencia que pide Seguridad. Solo hay pistas mínimas.
objetivos: Aplicar un conjunto de controles de seguridad y operación sin guía | Elegir valores razonables y justificarlos | Reunir evidencia verificable de cada control | Distinguir lo que se puede hacer en el portal de práctica de lo que requiere Azure real
prerrequisitos: azure-paso-a-paso-logs-con-log-analytics-y-kql
autoevaluacion: ¿Puedes mostrar evidencia de cada control? | ¿Justificaste los días de retención elegidos? | ¿Tu alerta tiene a quién avisar? | ¿Sabes qué controles quedaron pendientes y por qué?
---

:::escenario Los controles obligatorios de Seguridad
*"Todo lago que pase a producción tiene que cumplir: (1) recuperación de borrados y sobrescrituras por al menos 14 días; (2) datos crudos que no se acumulen sin límite; (3) imposibilidad de borrar la plataforma por error; (4) aviso a la guardia si falla la ingesta; (5) los terceros solo con acceso temporal, de solo lectura y por HTTPS; (6) solo TLS 1.2 o superior, sin acceso anónimo; (7) trazabilidad de cada cambio."*
:::

## Tu tarea

Para cada control, aplícalo en `sttiendaandinadev` o en `rg-tiendaandina-dev` y anota la evidencia (qué pantalla lo demuestra). Si un control no se puede completar en la práctica, explica qué harías en Azure real.

| # | Control | Lo aplicaste en… | Evidencia |
|---|---|---|---|
| 1 | Recuperación ≥ 14 días | | |
| 2 | Crudos con límite | | |
| 3 | Sin borrados accidentales | | |
| 4 | Aviso si falla la ingesta | | |
| 5 | Terceros temporales | | |
| 6 | TLS y sin anónimo | | |
| 7 | Trazabilidad | | |

<details><summary>💡 Pista mínima</summary>

Cada control corresponde a una pantalla que ya usaste en las lecciones 17 a 19 (y la 7 para el último).
</details>

## Evidencias de referencia

Así se ven los controles aplicados en la práctica:

```captura
archivo: azure/b20-storage-props.webp
texto: Las propiedades de la cuenta - soft delete de 14 días, versionado, TLS 1.2 y sin acceso anónimo
```

```captura
archivo: azure/b20-locks-heredados.webp
texto: El bloqueo del grupo, heredado por la cuenta (Inherited)
```

```captura
archivo: azure/b20-actividad.webp
texto: El registro de actividad con cada cambio de esta etapa
```

<details><summary>💡 Solución comentada</summary>

| # | Control | Dónde | Evidencia |
|---|---|---|---|
| 1 | Recuperación ≥ 14 días | Data protection: soft delete de blobs 14 días, de contenedores activado, versionado activado | Overview → Blob service: *Blob soft delete: Enabled (14 days)*, *Versioning: Enabled* |
| 2 | Crudos con límite | Lifecycle management: `bronze-a-cool` (Cool a 30, Archive a 180, borrar a 730 días) | La regla y su JSON |
| 3 | Sin borrados accidentales | Locks del grupo: `no-borrar-dev` (Delete) | La cuenta muestra el bloqueo *Inherited*; el intento de borrar el vault falló con *ScopeLocked* |
| 4 | Aviso si falla la ingesta | Monitor: `adf-pipeline-fallido` (Sum de Failed pipeline runs > 0) con `ag-guardia-datos` | La regla en Alerts con su grupo de acciones |
| 5 | Terceros temporales | SAS con Blob, Read + List, 8 horas, HTTPS only | El token con `sp=rl`, `spr=https` y su vencimiento |
| 6 | TLS y sin anónimo | Se configuró al crear la cuenta | Configuration: *Minimum TLS version 1.2*, *Allow Blob anonymous access: Disabled* |
| 7 | Trazabilidad | Activity log y resource logs (lago, vault, factory) enviados a `log-tiendaandina-dev` (lección 20) | Una consulta en Logs: `AzureActivity` con quién cambió qué, y `StorageBlobLogs` sin operaciones con `AccountKey` |

**Pendientes para Azure real**, que conviene declarar en la entrega: subir la **retención** del workspace a lo que pida auditoría (por ejemplo, un año); **desactivar el acceso con clave** cuando todo use Entra; reemplazar la SAS de cuenta por una **user delegation SAS**; y cerrar la red con **private endpoint**. Declarar lo pendiente es parte de un buen informe: Seguridad confía más en quien dice qué falta que en quien dice que está todo.
</details>

:::errores
- **Confundir los controles.** Soft delete recupera borrados; versionado recupera sobrescrituras; el bloqueo impide borrar el recurso.
- **Esconder lo pendiente.** El informe tiene que decir qué riesgo queda abierto.
- **Evidencia en capturas mensuales.** Para auditoría de un año, el Activity log va a Log Analytics o a una cuenta de almacenamiento.
:::

## ✅ Lista de verificación

- [ ] Los siete controles tienen evidencia o una explicación de qué falta.
- [ ] Justificaste los días elegidos (retención, Cool, Archive, borrado).
- [ ] La alerta de ingesta avisa a un grupo de acciones.
- [ ] Hay un bloqueo y comprobaste que funciona.

## Lo que aprendiste en el nivel 5

- Red, claves, SAS y cómo elegir la credencial correcta.
- Protección de datos y ciclo de vida.
- Bloqueos, métricas, alertas y grupos de acciones.
- Aplicar y evidenciar controles de seguridad como en una auditoría real.

En el nivel 6 dejas de hacer todo a mano: plantillas, costos a escala y el paso al Azure real.

:::ejercicio quiz
Seguridad pide recuperar archivos sobrescritos. ¿Qué control lo cumple?
- [ ] Soft delete de contenedores
- [x] El versionado de blobs
- [ ] El bloqueo Delete
- [ ] La regla de ciclo de vida
:::

:::ejercicio quiz
¿Cuál es la evidencia de que el bloqueo protege la cuenta aunque se puso en el grupo?
- [x] En Locks de la cuenta aparece el bloqueo como Inherited
- [ ] El costo bajó
- [ ] La cuenta cambió de región
- [ ] En las etiquetas de la cuenta
:::

:::ejercicio quiz
El Activity log guarda 90 días y auditoría pide un año. ¿Qué propones?
- [ ] Hacer capturas de pantalla cada mes
- [x] Enviar el Activity log a un Log Analytics workspace o a una cuenta de almacenamiento
- [ ] Pedir a Microsoft que lo extienda
- [ ] Nada, no se puede
:::

:::ejercicio quiz
¿Por qué conviene declarar en el informe lo que quedó pendiente?
- [ ] Para que el proyecto dure más
- [x] Porque deja claro el riesgo real y qué falta para cerrarlo
- [ ] Porque es obligatorio por ley
- [ ] No conviene, es mejor no mencionarlo
:::
