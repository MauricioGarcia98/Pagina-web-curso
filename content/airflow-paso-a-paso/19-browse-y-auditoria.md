---
titulo: Browse y auditoría - buscar en toda la instalación
nivel: 5 · Avanzado
duracion: 30
resumen: Cuando hay decenas de Dags, entrar uno por uno no escala. Usas Browse para ver todas las corridas, todas las instancias de tareas filtradas por estado y el Audit Log con quién disparó, pausó, limpió o creó cada cosa, y armas una rutina de revisión de la guardia.
objetivos: Ver todas las corridas de todos los Dags | Filtrar instancias de tareas por estado | Usar el Audit Log para reconstruir qué pasó | Armar una rutina de guardia
prerrequisitos: airflow-paso-a-paso-pools-y-concurrencia
autoevaluacion: ¿Sabes dónde ver todas las tareas fallidas? | ¿Sabes qué registra el Audit Log? | ¿Sabes reconstruir quién pausó un Dag? | ¿Sabes qué revisar al empezar la guardia?
---

## Paso 1 — Todas las corridas

**Browse → Dag Runs**:

```captura
archivo: airflow/a19-dag-runs.webp
texto: Dag Runs - las corridas de todos los Dags con su tipo, fecha lógica, inicio y duración
```

## Paso 2 — Todas las tareas

**Browse → Task Instances**:

```captura
archivo: airflow/a19-task-instances.webp
texto: Task Instances - cada tarea de cada corrida, con filtros por estado (Success, Failed, Upstream Failed, Skipped, Running)
```

El filtro **Failed** junta todas las tareas fallidas de la instalación en una sola lista: es la vista de la guardia.

## Paso 3 — El Audit Log

**Browse → Audit Log**:

```captura
archivo: airflow/a19-audit.webp
texto: Audit Log - cuándo, qué evento (trigger, unpaused, clear, pool.create, backfill), sobre qué Dag y corrida, y quién
```

| Pregunta | Cómo la responde el Audit Log |
|---|---|
| ¿Quién despausó este Dag? | Evento `unpaused` con usuario y hora |
| ¿Alguien limpió la corrida del 12? | Evento `clear` con la tarea |
| ¿Cuándo se creó el pool? | Evento `pool.create` |

Cada Dag tiene también su propia pestaña **Audit Log**.

## Paso 4 — La rutina de la guardia

1. **Home**: ¿hay Dag Import Errors o Failed Dags?
2. **Browse → Task Instances → Failed**: abrir el log de cada una, de la más antigua a la más nueva.
3. **Dags → Running**: ¿algo lleva horas corriendo? Puede estar colgado.
4. **Audit Log**: si algo cambió de comportamiento, ¿alguien lo tocó?

:::cuidado La interfaz no es el sistema de alertas
Nadie mira la pantalla a las 3 de la mañana. La guardia revisa la interfaz, pero las fallas importantes tienen que **avisar solas** (siguiente lección).
:::

## ✅ Lo que lograste

- Buscas corridas y tareas en toda la instalación.
- Reconstruyes qué pasó con el Audit Log.
- Tienes una rutina de guardia.

:::ejercicio quiz
¿Dónde ves todas las tareas fallidas de todos los Dags juntas?
- [ ] En la página de cada Dag
- [x] Browse → Task Instances con el filtro Failed
- [ ] Admin → Pools
- [ ] Assets
:::

:::ejercicio quiz
¿Qué registra el Audit Log?
- [ ] Solo los errores de Python
- [x] Las acciones sobre Dags, corridas y configuración, con usuario y hora
- [ ] Los datos de las tablas
- [ ] Las contraseñas
:::

:::ejercicio quiz
Un Dag empezó a correr solo y nadie sabe por qué. ¿Qué buscas en el Audit Log?
- [x] El evento unpaused de ese Dag
- [ ] El evento pool.create
- [ ] Nada, no sirve
- [ ] El color de la grilla
:::

:::ejercicio quiz
¿Alcanza con revisar la interfaz para enterarse de las fallas?
- [ ] Sí, siempre
- [x] No: las fallas importantes tienen que avisar solas
- [ ] Solo los fines de semana
- [ ] Solo en Airflow 2
:::
