---
titulo: Azure DevOps por dentro - Boards, Repos y Pipelines de un equipo de datos
nivel: Intermedio
duracion: 45
resumen: Recorrido por Azure DevOps, la plataforma de Microsoft que muchas empresas usan en lugar de (o junto a) GitHub y Jira. El trabajo del equipo se organiza en Boards, con Epic, Feature, User Story, Task y Bug, sobre un tablero Kanban y en sprints. El código vive en Azure Repos, conectado a la terminal. Los cambios entran por pull request con política de rama. Un pipeline YAML corre los tests en cada push.
objetivos: Organizar el trabajo con la jerarquía Epic › Feature › User Story › Task, y Bug | Mover historias por el tablero, estimarlas y planificar un sprint | Subir código a Azure Repos desde la terminal y abrir un pull request enlazado a un work item | Crear un pipeline con azure-pipelines.yml y leer por qué falla un paso | Proteger main con una política de rama
prerrequisitos: fundamentos-git-en-equipo
autoevaluacion: ¿Sabes la diferencia entre una User Story y una Task? | ¿Sabes qué hace AB#9 en un mensaje de commit? | ¿Sabes qué dispara un pipeline con trigger main? | ¿Sabes leer el log de un paso que falló? | ¿Sabes qué exige una política de rama en main?
---

:::tip Practícalo mientras lees
Abre [Azure DevOps de práctica](#/azure-devops/tienda-andina). Los repositorios son los mismos remotos de la [terminal](#/lab/terminal): `git push` a `https://dev.azure.com/academia/tienda-andina/_git/pipelines` aparece en Repos y dispara el pipeline. No necesitas cuenta de Microsoft.
:::

:::analogia En palabras simples
Azure DevOps junta en un solo lugar tres cosas que un equipo necesita:
- la **pizarra** con las tareas (*Boards*);
- el **archivo** con el código y su historia (*Repos*);
- la **línea de producción** que revisa cada cambio antes de que llegue a producción (*Pipelines*).

Es como si GitHub, Jira y un robot de control de calidad vivieran en la misma oficina.
:::

## La organización y el proyecto

La dirección es `dev.azure.com/<organización>/<proyecto>`. La **organización** es la empresa. Cada **proyecto** agrupa el tablero, los repositorios y los pipelines de un producto o equipo. En la práctica: `academia/tienda-andina`.

| Sección del menú | Para qué la usa un equipo de datos |
|---|---|
| **Overview** | Resumen del proyecto, miembros y estadísticas |
| **Boards** | Tareas: tablero Kanban, backlog, sprints |
| **Repos** | Código: archivos, commits, ramas y pull requests |
| **Pipelines** | CI/CD: tests y despliegues automáticos |
| Test Plans, Artifacts | Pruebas manuales y paquetes internos (casi no se usan en datos) |

## Boards: el trabajo del equipo

Con el proceso **Agile**, el trabajo se parte en una jerarquía:

```diagrama
titulo: De la iniciativa a la tarea de hoy
direccion: abajo
nodo ep: Epic | icono=etiqueta | color=naranja | sub=Lago de datos de ventas (meses)
nodo fe: Feature | icono=capas | color=violeta | sub=Ingesta diaria de pedidos (semanas)
nodo us: User Story | icono=usuario | color=azul | sub=Como analista, quiero… (un sprint)
nodo ta: Task | icono=check | color=amarillo | sub=Escribir la carga incremental (horas)
nodo bu: Bug | icono=alerta | color=rojo | sub=El ETL no incluye a México
flecha ep -> fe: se parte en | paso=1 | explica=Un Epic es una iniciativa grande, de meses. Se divide en Features que entregan algo usable.
flecha fe -> us: se parte en | paso=2 | explica=Cada Feature se cuenta en User Stories, escritas desde quien la usa: "Como analista, quiero… para…". Entra en un sprint y se estima en Story Points.
flecha us -> ta: se parte en | paso=3 | explica=Las Tasks son el trabajo técnico concreto (horas) que hace falta para terminar la historia.
flecha fe -> bu: también | paso=4 | estilo=punteada | explica=Un Bug es algo que funciona mal. Va al tablero junto a las historias y se prioriza igual.
```

- **Tablero (Boards)**: columnas *New → Active → Resolved → Closed*. Arrastras una tarjeta cuando cambia su estado. Cada tarjeta muestra quién la tiene, sus puntos y cuántas tasks están hechas.
- **Backlog**: la lista priorizada de todo, con la jerarquía.
- **Sprints**: lo que el equipo se comprometió a terminar en dos semanas, con su avance.

```captura
archivo: azure-devops/d01-tablero.webp
texto: El tablero: una columna por estado y una tarjeta por historia o bug
```

## Repos: el código, conectado a la terminal

Azure Repos es Git, igual que GitHub. Desde la terminal del curso:

```bash
git clone https://dev.azure.com/academia/tienda-andina/_git/pipelines
cd pipelines
git checkout -b feature/tests
printf "pytest\n" > requirements.txt
git add . && git commit -m "Agrega requirements AB#9"
git push -u origin feature/tests
```

`AB#9` en el mensaje **enlaza el commit con el work item 9**. En el ítem, la sección *Development* muestra el commit y el pull request: cualquiera puede ver qué código resolvió qué pedido.

Después: **Repos → Pull requests → New pull request**, de `feature/tests` a `main`, enlazado al ítem. Un compañero revisa y aprueba, y **Complete** une la rama.

:::trabajo Una empresa real
La primera vez que haces `git clone`, Git abre el navegador para que entres con tu cuenta de Microsoft (Git Credential Manager). No se usan contraseñas en la URL. En los pipelines, el acceso a Azure se da con una *service connection*, sin secretos en el YAML.
:::

## Pipelines: los tests en cada cambio

**Pipelines → New pipeline → Azure Repos Git → el repositorio → Python package**. El asistente crea `azure-pipelines.yml` en el repositorio:

```yaml norun
trigger:
- main

pool:
  vmImage: ubuntu-latest

steps:
- task: UsePythonVersion@0
  inputs:
    versionSpec: '3.12'

- script: pip install -r requirements.txt
  displayName: 'Install dependencies'

- script: pytest -q
  displayName: 'Run tests'
```

| Parte | Qué significa |
|---|---|
| `trigger: - main` | Corre solo con cada push a `main` |
| `pool: vmImage` | La máquina que presta Microsoft para correrlo (un *agente*) |
| `steps` | Los pasos, en orden. Si uno falla, los siguientes no corren |

Si el repositorio no tiene `requirements.txt`, el paso *Install dependencies* falla. Si no tiene tests, `pytest` termina con código 5 (*no tests ran*). **Lee el paso en rojo**: el log dice exactamente qué faltó.

```captura
archivo: azure-devops/d02-run.webp
texto: Una ejecución fallida: los pasos a la izquierda y el log del que falló a la derecha
```

## Políticas de rama

**Repos → Branches → main → Add branch policies**: desde ese momento, a `main` solo se entra por pull request, con **1 revisor** y la **build de validación en verde**. El botón *Complete* queda deshabilitado hasta que se cumpla todo.

## Azure DevOps, GitHub y Jira

| Necesidad | Azure DevOps | GitHub | Atlassian |
|---|---|---|---|
| Tareas | Boards | Issues y Projects | Jira |
| Código | Repos | Repositorios | Bitbucket |
| CI/CD | Pipelines (YAML) | Actions (YAML) | Bitbucket Pipelines |

Los conceptos son los mismos: si sabes uno, aprendes los otros en una tarde. Muchas empresas que usan Azure y Microsoft 365 eligen Azure DevOps.

## Qué tiene la réplica y qué no

| En la réplica | Todavía no |
|---|---|
| Boards: tablero, backlog con jerarquía, sprints, work items con comentarios | Consultas guardadas (WIQL), dashboards, capacidad por persona |
| Repos conectados a la terminal: archivos, commits, ramas, pull requests con revisión | Comentarios en líneas del diff, *squash merge*, forks |
| Pipelines YAML con ejecución por pasos, logs y triggers por push | Varias etapas y entornos con aprobación, variables y grupos de variables |
| Política de rama en main | Revisores obligatorios por carpeta, *status checks* externos |

Los pasos del pipeline se simulan a partir de lo que hay en el repositorio: `pip install -r` busca el archivo, `pytest` cuenta las funciones `test_` de `tests/test_*.py`.

:::practica azure-devops Del ítem al pipeline en verde
1. En **Boards**, mueve la historia 9 a *Active* y estímala en puntos.
2. Crea el pipeline con la plantilla *Python package*: va a fallar. Lee por qué.
3. Desde la terminal, clona el repositorio y sube `requirements.txt` y `tests/test_etl.py` con un commit que diga `AB#9` (si el push se rechaza, primero `git pull`).
4. Mira cómo el push dispara el pipeline y queda en verde.
5. Agrega la política de rama a `main` y completa un pull request enlazado a la historia.

Documentación oficial: [Azure Boards](https://learn.microsoft.com/azure/devops/boards/) · [crear tu primer pipeline](https://learn.microsoft.com/azure/devops/pipelines/create-first-pipeline) · [políticas de rama](https://learn.microsoft.com/azure/devops/repos/git/branch-policies)
:::

:::errores
- **Tareas sin historia**: si las tasks no cuelgan de una historia, nadie sabe para qué sirve el trabajo.
- **Commits sin `AB#`**: en tres meses nadie sabe qué pedido resolvió ese cambio.
- **Cambiar el YAML en `main` sin probarlo**: el pipeline falla para todo el equipo. Pruébalo en una rama con un PR.
- **Dejar `main` sin política**: cualquiera sube código sin revisión y sin tests.
:::

## Ejercicios

:::ejercicio quiz
¿Qué va dentro de una User Story?
- [ ] Varios Epics
- [x] Las Tasks técnicas necesarias para terminarla
- [ ] Los Features del proyecto
- [ ] Los pipelines
:::

:::ejercicio quiz
Escribes `git commit -m "Corrige el ETL AB#7"`. ¿Qué logra `AB#7`?
- [ ] Asigna el commit a la rama 7
- [x] Enlaza el commit con el work item 7 en Boards
- [ ] Crea un pull request número 7
- [ ] Nada: es solo texto
:::

:::ejercicio quiz
El pipeline falla en "Install dependencies" con *Could not open requirements file*. ¿Qué haces?
- [ ] Borras el pipeline y lo creas de nuevo
- [ ] Desactivas el paso
- [x] Subes el requirements.txt al repositorio; el push vuelve a disparar el pipeline
- [ ] Esperas a que se arregle solo
:::

:::ejercicio quiz
`main` tiene política de rama con 1 revisor y build de validación. ¿Cuándo se puede completar el PR?
- [ ] Cuando lo crea su autor
- [ ] Cuando pasa la build, aunque nadie lo revise
- [x] Cuando un revisor lo aprueba y la build está en verde
- [ ] Nunca: main es de solo lectura
:::

## Resumen

- Azure DevOps reúne **Boards** (trabajo), **Repos** (código) y **Pipelines** (CI/CD) en `dev.azure.com/organización/proyecto`.
- Jerarquía Agile: Epic › Feature › User Story › Task, y Bug. Las historias se estiman y entran en sprints.
- `AB#ID` en un commit enlaza el código con el pedido.
- Un pipeline YAML con `trigger: main` corre los tests en cada push. Si falla, el log del paso en rojo dice qué faltó.
- Una política de rama en `main` exige pull request, revisión y build en verde.
