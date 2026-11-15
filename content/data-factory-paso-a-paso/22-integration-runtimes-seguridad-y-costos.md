---
titulo: Integration runtimes, seguridad y costos
nivel: 6 · Avanzado completo
duracion: 45
resumen: Tres temas que deciden si un factory llega bien a producción. Qué es un integration runtime y cuándo hace falta uno propio para llegar a una base dentro de la red de la empresa, cómo se asegura un factory (identidad administrada, Key Vault, red administrada, roles del equipo) y cómo se cobra, con las palancas que más bajan la factura.
objetivos: Explicar qué es un integration runtime y sus tres tipos | Saber cuándo hace falta un self-hosted IR | Aplicar las prácticas de seguridad de un factory | Entender cómo se cobra Data Factory | Bajar el costo de un factory sin romperlo
prerrequisitos: data-factory-paso-a-paso-git-ci-cd-y-plantillas-arm
autoevaluacion: ¿Sabes cuándo usar un self-hosted IR? | ¿Sabes qué roles dar al equipo? | ¿Sabes qué se cobra por cada actividad? | ¿Sabes qué ahorra más en un factory?
---

## Paso 1 — Integration runtimes

El **integration runtime (IR)** es el cómputo que hace el trabajo: mueve los datos, ejecuta las actividades, llega a las fuentes. **Manage → Integration runtimes**:

```captura
archivo: adf/b22-ir.webp
texto: El AutoResolveIntegrationRuntime - el runtime de Azure que administra Microsoft
```

| Tipo | Dónde corre | Cuándo |
|---|---|---|
| **Azure IR** (AutoResolve o uno propio) | En Azure, administrado por Microsoft | Fuentes accesibles desde Azure: almacenamiento, bases de Azure, APIs públicas |
| **Self-hosted IR** | Un programa que instalas en un servidor de tu red | Fuentes **dentro de la red de la empresa**: un SQL Server en la oficina, archivos en un servidor local |
| **Azure-SSIS IR** | Un clúster que ejecuta paquetes SSIS | Migrar paquetes de SQL Server Integration Services |

:::escenario Un caso típico
El sistema de inventario de Tienda Andina es un SQL Server en el centro de datos de la empresa, sin acceso desde internet. Para traerlo, se instala un **self-hosted IR** en un servidor de esa red: el IR se conecta **hacia afuera** con Data Factory (no hay que abrir puertos de entrada) y mueve los datos.
:::

Un Azure IR propio con **Managed Virtual Network** permite llegar a recursos de Azure por **private endpoints**, sin exponerlos a internet.

## Paso 2 — Seguridad de un factory

| Práctica | Por qué |
|---|---|
| **Identidad administrada** en todos los linked services de Azure | Nada que guardar ni rotar (lección 2) |
| **Key Vault** para lo que necesite contraseña | Los secretos no viven en el factory ni en Git |
| **Roles mínimos** para el factory | Blob Data Contributor sobre la cuenta del lago, no Owner de la suscripción |
| **Roles del equipo** | **Data Factory Contributor** para quien diseña en dev; en prod, solo lectura y Monitor (rol **Reader** + permisos de monitoreo) |
| **Red administrada y private endpoints** | Que el tráfico no salga a internet |
| **Secure input / output** en actividades con datos sensibles | Que Monitor no muestre esos valores en Input y Output |

## Paso 3 — Cómo se cobra

Data Factory se paga por uso, con varios conceptos:

| Concepto | Qué se cobra | Ejemplo |
|---|---|---|
| **Orquestación** | Cada ejecución de actividad, de trigger y de debug | Un pipeline de 5 actividades que corre cada hora |
| **Movimiento de datos** | **DIU × horas** de cada Copy (en el Azure IR) | `billingReference` con `DIUHours` en la salida de la copia |
| **Actividades de pipeline y externas** | El tiempo de actividades como Lookup, Get Metadata o el seguimiento de un Notebook | El rato que espera al notebook de Databricks |
| **Data flows** | Horas de núcleo del clúster Spark de los mapping data flows | No están en la práctica |

El costo de Databricks (máquinas y DBU) se paga **aparte**, en Databricks. En Cost Management lo ves todo junto:

```captura
archivo: adf/b22-costos.webp
texto: Cost Management - el factory junto al almacenamiento, el vault y Databricks
```

:::tip Lo que más baja la factura
1. **No ejecutar de más**: un trigger cada 5 minutos que casi nunca encuentra datos paga orquestación todo el día; un trigger por eventos paga solo cuando llega algo.
2. **Copiar solo lo nuevo** (cargas incrementales) en lugar de todo cada vez.
3. **Ajustar las DIU** de copias grandes: más DIU terminan antes pero no siempre salen más baratas.
4. **Job clusters** para los notebooks, que se apagan al terminar (lección 19).
5. **Debug con cuidado**: las pruebas también se cobran.
:::

## ✅ Lo que lograste

- Sabes qué es un integration runtime y cuándo hace falta uno propio.
- Conoces las prácticas de seguridad de un factory.
- Entiendes cómo se cobra y qué ahorra más.

:::ejercicio quiz
La fuente es un SQL Server en la oficina, sin acceso desde internet. ¿Qué necesitas?
- [ ] Un Azure IR AutoResolve
- [x] Un self-hosted integration runtime en un servidor de esa red
- [ ] Un trigger por eventos
- [ ] Abrir el SQL Server a internet
:::

:::ejercicio quiz
¿Qué rol le das a quien diseña pipelines en el factory de dev?
- [ ] Owner de la suscripción
- [x] Data Factory Contributor
- [ ] Ninguno
- [ ] Storage Blob Data Owner
:::

:::ejercicio quiz
¿Qué se cobra en una actividad Copy en el Azure IR?
- [ ] Nada
- [x] DIU por hora de copia, además de la ejecución de la actividad
- [ ] Solo los GB guardados
- [ ] Un monto fijo mensual
:::

:::ejercicio quiz
Un trigger corre cada 5 minutos y casi nunca hay archivos nuevos. ¿Qué cambias?
- [ ] Nada
- [x] Un trigger por eventos de almacenamiento, que corre solo cuando llega un archivo
- [ ] Más DIU
- [ ] Un clúster más grande
:::
