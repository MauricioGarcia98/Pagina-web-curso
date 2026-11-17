---
titulo: Capacidad y costos - cómo se paga Fabric
nivel: 6 · Avanzado completo
duracion: 40
resumen: Fabric no cobra por ítem ni por consulta - cobra por capacidad. Ves la licencia y la capacidad del workspace, el contador de la prueba, y aprendes qué es una capacidad F, las unidades de capacidad (CU), el suavizado y la limitación, cuándo pausar y cómo medir el consumo con la app de métricas.
objetivos: Leer la licencia y capacidad de un workspace | Explicar qué es una capacidad F y sus CU | Entender suavizado y limitación | Bajar costos pausando, dimensionando y midiendo
prerrequisitos: fabric-paso-a-paso-licencias-roles-y-seguridad
autoevaluacion: ¿Sabes qué se paga en Fabric? | ¿Sabes qué pasa al terminar la prueba? | ¿Sabes qué es la limitación? | ¿Sabes con qué app mides el consumo?
---

## Paso 1 — Dónde se ve la capacidad

**Workspace settings → License info**:

```captura
archivo: fabric/b22-licencia.webp
texto: License info - licencia Trial, capacidad Trial-Alumno (F64), región East US, y la conexión a Git del workspace
```

Y arriba a la derecha, el contador de la prueba:

```captura
archivo: fabric/b22-trial.webp
texto: El contador "Trial: 54 days left" en la barra superior
```

La prueba de Fabric dura **60 días** sobre una capacidad equivalente a F64. Al terminar, los ítems de Fabric quedan inaccesibles hasta que el workspace se asigna a una capacidad paga: **antes de que termine**, decide a qué capacidad pasa cada workspace.

## Paso 2 — Cómo se cobra

:::analogia Una potencia contratada
Como la luz de una casa: no pagas por cada lámpara, pagas una **potencia** que comparten todos los aparatos. En Fabric, la capacidad es esa potencia y la comparten los notebooks, pipelines, warehouses e informes de todos los workspaces asignados.
:::

| Concepto | Qué es |
|---|---|
| **Capacidad F** | Un tamaño de potencia: F2, F4, F8… hasta F2048. El número son sus **CU** (unidades de capacidad) |
| **Pago por uso** | Se paga por hora mientras está encendida; se puede **pausar** |
| **Reserva** | Se compromete un año a cambio de un precio menor; no conviene pausarla |
| **Almacenamiento de OneLake** | Se paga aparte, por lo que ocupan los datos |

Los precios cambian por región y fecha: consulta siempre la página oficial de precios de Microsoft Fabric antes de dimensionar.

## Paso 3 — Suavizado y limitación

- **Suavizado (smoothing):** un trabajo pesado no tiene que caber en el minuto en que corre. Fabric reparte su consumo en el tiempo (los trabajos en segundo plano, como notebooks y pipelines, en 24 horas).
- **Limitación (throttling):** si la capacidad se pasa de su potencia por mucho tiempo, Fabric primero demora y después **rechaza** operaciones nuevas hasta recuperarse. Los informes interactivos son lo primero que se nota.

## Paso 4 — Bajar el costo

1. **Mide** con la app **Microsoft Fabric Capacity Metrics**: qué ítem consume más CU y en qué horas.
2. **Pausa** las capacidades de desarrollo fuera de horario (solo en pago por uso).
3. **Dimensiona** con datos: empieza chico (F2, F4) en desarrollo y sube si ves limitación.
4. **Separa** desarrollo y producción en capacidades distintas: una prueba pesada no debe frenar los informes de la gerencia.
5. **Optimiza** lo que más consume: tablas con `OPTIMIZE`, notebooks que leen solo las columnas y particiones necesarias.

:::errores
- **Pensar que se paga por consulta.** Fabric cobra la capacidad por hora (más el almacenamiento); una consulta cara consume capacidad que se nota en otros ítems.
- **Dejar la capacidad encendida sin uso.** Una capacidad F de pago por uso se puede pausar para dejar de pagar cómputo.
- **Ignorar la limitación (throttling).** Si un ítem consume de más por mucho tiempo, demora y después rechaza operaciones de todos.
:::

## ✅ Lo que lograste

- Sabes cómo se paga Fabric y qué pasa al terminar la prueba.
- Entiendes CU, suavizado y limitación.
- Tienes cinco formas concretas de bajar el costo.

:::ejercicio quiz
¿Qué se paga principalmente en Fabric?
- [ ] Cada consulta
- [ ] Cada ítem creado
- [x] La capacidad (más el almacenamiento de OneLake)
- [ ] Cada usuario que entra
:::

:::ejercicio quiz
¿Qué pasa con los ítems de Fabric al terminar la prueba si no asignas una capacidad?
- [ ] Siguen gratis
- [x] Quedan inaccesibles hasta asignar el workspace a una capacidad paga
- [ ] Se borran el mismo día
- [ ] Se pasan a Pro solos
:::

:::ejercicio quiz
¿Qué es la limitación (throttling)?
- [x] Demorar y luego rechazar operaciones cuando la capacidad se excede por mucho tiempo
- [ ] Un descuento
- [ ] Un aviso que solo aparece en la factura
- [ ] Un límite de usuarios por workspace
:::

:::ejercicio quiz
¿Con qué mides qué ítem consume más capacidad?
- [ ] Con el Monitor del workspace
- [x] Con la app Microsoft Fabric Capacity Metrics
- [ ] Con OneLake catalog
- [ ] Con Git
:::
