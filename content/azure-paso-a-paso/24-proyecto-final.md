---
titulo: Proyecto final (solo el pedido) - la plataforma de producción de Tienda Andina
nivel: 6 · Avanzado completo
duracion: 90
resumen: El pedido final llega como llegaría en un trabajo - un mensaje con requisitos y una fecha. Despliegas producción desde la plantilla, con la redundancia que corresponde, la proteges con un bloqueo, das acceso por grupos con mínimo privilegio, conectas alertas y costos, y entregas la evidencia y un informe de pendientes. Sin pasos ni pistas en el enunciado; la solución comentada está al final.
objetivos: Desplegar un entorno de producción completo desde una plantilla | Aplicar redundancia, bloqueo, permisos y alertas de producción | Dar acceso a grupos con el mínimo privilegio | Verificar cada requisito con evidencia | Redactar los pendientes y riesgos
prerrequisitos: azure-paso-a-paso-de-la-practica-a-azure-real
autoevaluacion: ¿Tu producción salió de la plantilla y no a mano? | ¿Tiene redundancia de zona? | ¿Nadie puede borrarla por error? | ¿Cada acceso es de un grupo y es el mínimo?
---

:::escenario El pedido
Mensaje de Lucía, el lunes a las 9:

*"Hoy pasamos a producción. Necesito el entorno prod de Tienda Andina para el viernes:*

1. *Creado desde nuestra plantilla, en `rg-tiendaandina-prod`, nada a mano.*
2. *El lago con redundancia entre zonas, porque si se cae un datacenter no podemos parar.*
3. *Que nadie pueda borrar producción por error, ni yo.*
4. *Los analistas pueden ver los recursos de prod pero no cambiar nada. Los ingenieros de datos administran el factory.*
5. *Seguridad y la guardia, como en el lago dev: alertas si fallan los pipelines.*
6. *Finanzas quiere el costo de prod separado del de dev.*
7. *Un informe corto: qué hiciste, la evidencia y qué queda pendiente para la semana que viene.*

*Gracias!"*
:::

Tienes todo lo necesario de las lecciones anteriores. Trabaja solo; abre la solución cuando termines.

## Tu entrega

| # | Requisito | Cómo lo cumpliste | Evidencia |
|---|---|---|---|
| 1 | Desde la plantilla | | |
| 2 | Redundancia entre zonas | | |
| 3 | Sin borrados accidentales | | |
| 4 | Accesos por grupo, mínimos | | |
| 5 | Alertas | | |
| 6 | Costo separado | | |
| 7 | Pendientes | | |

## Cómo se ve terminado

```captura
archivo: azure/b24-revisar.webp
texto: El despliegue de la plantilla con entorno = prod (1) y los seis recursos (2)
```

```captura
archivo: azure/b24-visualizador.webp
texto: rg-tiendaandina-prod con su cuenta, vault y factory
```

```captura
archivo: azure/b24-storage-prod.webp
texto: La cuenta de producción con Zone-redundant storage (ZRS) y las etiquetas de prod
```

```captura
archivo: azure/b24-iam-prod.webp
texto: Los accesos de prod - analistas como Reader e ingenieros como Data Factory Contributor
```

```captura
archivo: azure/b24-costos-prod.webp
texto: El costo de producción, separado por grupo
```

```captura
archivo: azure/b24-grupos.webp
texto: Los grupos de la suscripción - dev, el administrado de Databricks y prod
```

<details><summary>💡 Solución comentada</summary>

| # | Requisito | Cómo | Evidencia |
|---|---|---|---|
| 1 | Desde la plantilla | **Template deployment** con la plantilla de la lección 21, grupo nuevo `rg-tiendaandina-prod`, parámetro `entorno = prod` | El despliegue *Microsoft.Template-…* en **Deployments** del grupo, con los seis recursos en OK |
| 2 | Redundancia entre zonas | La plantilla elige `Standard_ZRS` cuando `entorno` es `prod` (función `if`) | Overview de `sttiendaandinaprod`: *Replication: Zone-redundant storage (ZRS)* |
| 3 | Sin borrados | Bloqueo **Delete** `no-borrar-prod` en el grupo | **Locks** del grupo; los recursos lo muestran *Inherited* |
| 4 | Accesos | **Reader** sobre el grupo para `analistas-datos`; **Data Factory Contributor** sobre el grupo para `ingenieros-datos` | **Access control (IAM)** del grupo: dos asignaciones a grupos, ninguna a personas |
| 5 | Alertas | Grupo de acciones de la guardia y regla *Sum de Failed pipeline runs > 0* sobre `adf-tiendaandina-prod` | La regla en **Monitor → Alerts** |
| 6 | Costo separado | Todo prod vive en su grupo y lleva `entorno = prod` | **Cost analysis** del grupo prod; o Cost Management filtrado por etiqueta |
| 7 | Pendientes | Ver abajo | El informe |

**Por qué estas decisiones.** El bloqueo es **Delete** y no Read-only porque producción tiene que poder cambiarse (por plantilla); Read-only rompería operaciones normales. Los analistas reciben **Reader** (ven la configuración) y **no** un rol de datos sobre el lago de prod: si necesitan datos, los leen de gold a través de Power BI, Databricks SQL o Unity Catalog, con permisos por tabla. Los ingenieros administran el factory, pero **no** son Owner del grupo: no pueden dar permisos ni borrar el bloqueo.

**Pendientes razonables para el informe:**

1. La red de prod está abierta: pasar a **private endpoints** para la cuenta, el vault y la base, y una red administrada para el factory.
2. Mover prod a la suscripción **`sub-datos-prod`** y aplicar **Azure Policy** (regiones permitidas, TLS, etiquetas obligatorias).
3. Desplegar la plantilla desde un **pipeline de CI/CD** (GitHub Actions o Azure DevOps) con aprobación, en lugar de a mano desde el portal.
4. Agregar a la plantilla la **protección de datos** (soft delete, versionado) y la **regla de ciclo de vida** de bronze, para que prod no dependa de configurarlas a mano.
5. Conectar el factory de prod al **Git** del equipo para publicar desde dev.
6. Activar **purge protection** en el vault de prod.
7. Enviar el Activity log a **Log Analytics** con retención de un año.

</details>

## ✅ Lista de verificación final

- [ ] `rg-tiendaandina-prod` y sus recursos salieron de un único despliegue de plantilla.
- [ ] `sttiendaandinaprod` es ZRS y tiene los tres contenedores.
- [ ] El grupo tiene un bloqueo Delete.
- [ ] Las asignaciones de prod son solo a grupos, con roles mínimos.
- [ ] Hay una alerta de pipelines fallidos con su grupo de acciones.
- [ ] El costo de prod se ve separado del de dev.
- [ ] Tu informe tiene al menos cuatro pendientes concretos.

## Lo que dominas ahora

- El portal de Azure de punta a punta: suscripciones, grupos, asistentes, despliegues y hojas.
- El data lake en ADLS Gen2: capas, contenedores, red, claves, SAS, protección y ciclo de vida.
- Identidad y acceso: Entra ID, RBAC, identidades administradas, service principals y Key Vault.
- Los servicios de datos desde el portal: Databricks, Data Factory y Azure SQL.
- Operación: bloqueos, monitoreo, alertas, costos y presupuestos.
- Infraestructura como código con plantillas ARM, y el puente a Bicep y Terraform.

:::ejercicio quiz
¿Por qué la cuenta de prod salió ZRS sin elegirlo en ningún asistente?
- [ ] Porque Azure usa ZRS por defecto en prod
- [x] Porque la plantilla usa `if(equals(parameters('entorno'), 'prod'), 'Standard_ZRS', 'Standard_LRS')`
- [ ] Porque la región lo exige
- [ ] Porque el grupo se llama prod
:::

:::ejercicio quiz
¿Qué bloqueo conviene en producción y por qué?
- [ ] Read-only, para que nadie toque nada nunca
- [x] Delete, porque impide borrar pero permite los cambios normales por plantilla
- [ ] Ninguno, los permisos alcanzan
- [ ] Los dos a la vez
:::

:::ejercicio quiz
Los analistas tienen que ver qué hay en prod sin cambiar nada. ¿Qué asignas?
- [ ] Owner al grupo analistas-datos
- [ ] Contributor a cada analista
- [x] Reader sobre el grupo de prod al grupo analistas-datos
- [ ] La clave de la cuenta
:::

:::ejercicio quiz
¿Cuál de estos es un pendiente legítimo para el informe?
- [ ] "Todo está perfecto"
- [x] Desplegar la plantilla desde un pipeline de CI/CD con aprobación en lugar de a mano
- [ ] Borrar el bloqueo para trabajar más rápido
- [ ] Dar Owner a todos los ingenieros
:::
