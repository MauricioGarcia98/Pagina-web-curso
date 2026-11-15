---
titulo: Proyecto final (sin ayuda) - la plataforma de datos de Tienda Andina
nivel: 6 · Avanzado completo
duracion: 120
resumen: El proyecto integrador del curso. Construyes desde un workspace vacío la plataforma completa - ingesta, transformación, warehouse con vistas, modelo semántico, Git, seguridad y plan de costos - y la defiendes con un documento de una página. Solo se dan los requisitos; no hay solución paso a paso.
objetivos: Diseñar y construir una plataforma en Fabric de punta a punta | Tomar y justificar decisiones de arquitectura | Dejar la plataforma versionada, segura y operable | Presentar el resultado como proyecto de portafolio
prerrequisitos: fabric-paso-a-paso-de-la-practica-a-fabric-real
autoevaluacion: ¿Puedes reconstruir todo desde un workspace vacío? | ¿Cada ítem tiene una razón de existir? | ¿La plataforma está en Git con roles definidos? | ¿Puedes explicar el costo estimado?
---

:::escenario El encargo
Gerencia de Tienda Andina: *"Queremos una plataforma de ventas que se cargue sola cada noche, con un tablero de pedidos por canal y avance de metas. Que esté versionada, que cada uno vea solo lo que le corresponde, y que sepamos cuánto cuesta."*
:::

## Requisitos

**Datos**
1. Un workspace nuevo, `Tienda Andina - Plataforma`.
2. Un lakehouse con los datos crudos en `Files/raw` y las tablas en `Tables`.
3. Las tablas de ejemplo (pedidos, clientes, productos, detalle) más `ventas_tiendas` desde el CSV.

**Transformación**
4. Un notebook que genere `ventas_por_canal` y `unidades_por_tienda` y que **falle** si la tabla de pedidos está vacía.
5. Un pipeline que copie los pedidos y ejecute el notebook, con una programación diaria planeada.

**Presentación**
6. Un warehouse con `metas_tienda` y la vista `v_avance_metas`.
7. Un modelo semántico con al menos dos medidas (`Pedidos` y otra que elijas).

**Operación y gobierno**
8. El workspace conectado a Git con un commit por etapa (datos, transformación, presentación).
9. Una tabla de roles: quién es Admin, Contributor y Viewer, asignado a grupos.
10. Un plan de capacidad: SKU propuesto para desarrollo y producción, y cuándo pausar.

## Cómo se ve terminado

```captura
archivo: fabric/b24-ws.webp
texto: El workspace con sus seis ítems - dos lakehouses, notebook, pipeline, warehouse y modelo semántico
```

```captura
archivo: fabric/b24-linaje.webp
texto: El linaje completo - el notebook y el modelo leen lh_ventas, el pipeline escribe en lh_ventas y llama al notebook
```

## Entregable: el documento de una página

| Sección | Qué responde |
|---|---|
| **Arquitectura** | Un diagrama con los ítems y el flujo de los datos |
| **Decisiones** | Por qué lakehouse para crudo y warehouse para presentación; por qué la medida va en el modelo |
| **Operación** | La rutina de Monitor y el procedimiento para revertir |
| **Seguridad** | La tabla de roles y los permisos SQL de la vista |
| **Costos** | El SKU propuesto, el horario de pausa y cómo se medirá |

## ✅ Rúbrica

| Criterio | Cumple | Destaca |
|---|---|---|
| Datos | Las tablas existen y se ven en el endpoint | Los crudos están ordenados por fecha en carpetas |
| Transformación | El pipeline corre de punta a punta | El notebook valida y falla con un mensaje claro |
| Presentación | La vista responde y el modelo tiene dos medidas | El modelo tiene formato y descripciones |
| Git | El workspace está conectado y hay commits | Un commit por etapa con mensajes claros |
| Seguridad | Hay roles definidos | Por grupos y con permisos SQL en la vista |
| Costos | Hay un SKU propuesto | Con pausa, separación dev/prod y app de métricas |

:::tip Para tu portafolio
Sube el repositorio de Git a tu GitHub con un README que tenga el diagrama, las decisiones y capturas **de la práctica** (no de un tenant real con datos de una empresa). Es un proyecto que muestra justo lo que pide una oferta de ingeniería de datos con Fabric. Si te preparas para la certificación **DP-700**, revisa el banco de preguntas en [Certificaciones Azure](#/m/cert-azure).
:::

## Lo que aprendiste en el curso

- **Nivel 1:** la pantalla, workspaces y tu primer lakehouse.
- **Nivel 2:** tablas Delta, el endpoint SQL y los accesos directos.
- **Nivel 3:** notebooks, Spark y pipelines.
- **Nivel 4:** warehouse, vistas y modelo semántico.
- **Nivel 5:** Monitor, OneLake catalog y Git.
- **Nivel 6:** licencias, seguridad, costos y Fabric real.

:::ejercicio quiz
¿Por qué el notebook debe fallar si la tabla de pedidos está vacía?
- [ ] Para que el Monitor se vea rojo por gusto
- [x] Para no publicar resúmenes vacíos como si estuvieran bien
- [ ] Porque Spark lo exige
- [ ] Para gastar menos
:::

:::ejercicio quiz
¿Dónde conviene guardar los datos crudos y dónde la capa que consume el negocio?
- [x] Crudos en el lakehouse; presentación en el warehouse con vistas
- [ ] Todo en Excel
- [ ] Crudos en el modelo semántico
- [ ] Presentación en Files
:::

:::ejercicio quiz
¿Qué capturas pones en tu portafolio?
- [ ] Las de tu empresa con datos reales
- [x] Las de la práctica, o de un tenant propio sin datos de terceros
- [ ] Ninguna
- [ ] Las de un compañero
:::

:::ejercicio quiz
¿Qué certificación de Microsoft cubre la ingeniería de datos con Fabric?
- [ ] AZ-900
- [x] DP-700
- [ ] PL-300
- [ ] AI-900
:::
