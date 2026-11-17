---
titulo: De la práctica a Fabric real - lo que cambia y lo que no
nivel: 6 · Avanzado completo
duracion: 35
resumen: Antes de entrar a un tenant real, repasas qué hace igual la práctica y qué es distinto - cuentas, capacidad, conexiones, Spark real y los ítems que la práctica no simula. Recorres la pantalla Create con todos los tipos de ítem y armas una lista de seguridad para tu primera semana.
objetivos: Ubicar todos los tipos de ítem en Create | Saber qué simula la práctica y qué no | Preparar el acceso a una prueba real sin riesgos | Armar la lista de la primera semana
prerrequisitos: fabric-paso-a-paso-capacidad-y-costos
autoevaluacion: ¿Sabes qué ítems no cubrió el curso? | ¿Sabes cómo empezar una prueba real? | ¿Sabes qué datos no compartir en capturas? | ¿Sabes qué hacer el primer día?
---

:::analogia Del simulador al avión
Lo que practicaste (workspace, lakehouse, notebook, pipeline, warehouse, modelo semántico) funciona igual en un tenant real. Lo nuevo es que hay una capacidad que se paga, cuentas de la organización y datos de otras personas: por eso se practica en un workspace propio.
:::

## Paso 1 — Todo lo que se puede crear

```captura
archivo: fabric/b23-create.webp
texto: Create - Store data (Lakehouse, Warehouse, Eventhouse, SQL database), Prepare data (Notebook, Spark Job Definition, Environment) y Get data (Pipeline, Dataflow Gen2, Copy job, Eventstream)
```

| Ítem | Para qué | Lo viste |
|---|---|---|
| Lakehouse, Notebook, Pipeline, Warehouse, Semantic model | El núcleo de la ingeniería de datos | ✅ en este curso |
| **Dataflow Gen2** | Transformar con Power Query, sin código | El editor es el de [Power BI](#/m/powerbi-paso-a-paso) |
| **Copy job** | Copiar datos (incluso incrementales) sin armar un pipeline | Similar a Copy data |
| **Eventstream / Eventhouse** | Datos en tiempo real y consultas KQL | No |
| **SQL database** | Base transaccional (OLTP) que se replica sola a OneLake | No |
| **Spark Job Definition / Environment** | Trabajos Spark desde archivos y bibliotecas compartidas | No |

## Paso 2 — Qué cambia en Fabric real

| En la práctica | En Fabric real |
|---|---|
| Spark y SQL corren en tu navegador sobre datos chicos | Corren en la capacidad, con miles de millones de filas |
| No hay cuentas | Entras con una cuenta de trabajo o escuela de Microsoft Entra |
| Schedule muestra un aviso | Las programaciones corren solas |
| New report muestra el camino | Abre el editor de informes |
| Git usa el GitHub de práctica | Necesita un token o conexión con permisos reales |
| Los datos son de ejemplo | Los datos son de la empresa: cuidado con lo que compartes |

Lo que **no** cambia: la pantalla, los nombres de los ítems, el orden de los pasos, el SQL, el PySpark y las decisiones de diseño.

## Paso 3 — Empezar una prueba real con cuidado

1. Necesitas una cuenta de trabajo o escuela (no una personal de Outlook o Gmail). Si tu empresa ya usa Microsoft 365, pide a TI que habilite Fabric para tu usuario.
2. En `app.fabric.microsoft.com`, el administrador o tú (si está permitido) activa la **prueba gratuita**.
3. Crea un workspace propio de práctica, nunca uses uno de producción para aprender.

:::cuidado Capturas y datos
Si compartes capturas de tu Fabric real (en un foro, un portafolio o un ticket), **difumina** correos, nombres de tenant, IDs de workspace y de capacidad, rutas ABFS y cualquier dato de clientes.
:::

## Paso 4 — Tu primera semana

- [ ] Pedir acceso con el rol justo (Contributor en desarrollo, Viewer en producción).
- [ ] Leer el linaje de los workspaces del equipo antes de tocar nada.
- [ ] Revisar el Monitor y entender qué corre cada noche.
- [ ] Clonar el repo de Git del workspace y leer los notebooks.
- [ ] Hacer el primer cambio en desarrollo, con commit y revisión.

:::errores
- **Practicar en el workspace de producción.** Crea uno propio de prueba.
- **Compartir capturas sin difuminar.** Correos, nombre del tenant, IDs y rutas ABFS identifican a la empresa.
- **Buscar entrar con una cuenta personal.** Fabric usa cuentas de trabajo o escuela de Microsoft Entra.
:::

## ✅ Lo que lograste

- Conoces todos los tipos de ítem y cuáles quedan por aprender.
- Sabes qué cambia al pasar a Fabric real.
- Tienes una lista segura para empezar.

:::ejercicio quiz
¿Qué ítem usas para transformar datos con Power Query, sin código?
- [ ] Notebook
- [x] Dataflow Gen2
- [ ] Pipeline con una actividad Notebook
- [ ] Warehouse
:::

:::ejercicio quiz
¿Qué cuenta necesitas para entrar a Fabric real?
- [ ] Una cuenta personal de Gmail
- [x] Una cuenta de trabajo o escuela de Microsoft Entra
- [ ] Una suscripción de Azure con tarjeta
- [ ] Una cuenta de GitHub
:::

:::ejercicio quiz
¿Dónde conviene aprender en Fabric real?
- [ ] En el workspace de producción
- [x] En un workspace propio de práctica
- [ ] En el workspace de otro equipo
- [ ] En cualquier workspace donde seas Viewer
:::

:::ejercicio quiz
¿Qué difuminas antes de compartir una captura?
- [ ] Nada
- [x] Correos, nombre del tenant, IDs, rutas ABFS y datos de clientes
- [ ] Solo los colores
- [ ] Solo los números de las tablas
:::
