---
titulo: Git en Fabric - conectar el workspace a un repositorio
nivel: 5 · Avanzado
duracion: 45
resumen: Conectas el workspace a un repositorio de GitHub para que cada ítem quede versionado como archivos de texto. Creas el repo fabric-tienda-andina, lo conectas desde Workspace settings con rama y carpeta, y revisas en Source control los cambios pendientes de cada ítem.
objetivos: Crear un repositorio para el workspace | Conectar el workspace con repositorio, rama y carpeta | Leer el panel Source control | Saber qué se versiona y qué no
prerrequisitos: fabric-paso-a-paso-onelake-catalog
autoevaluacion: ¿Sabes qué tres datos pide la conexión? | ¿Sabes qué muestra Changes? | ¿Sabes si se versionan los datos de las tablas? | ¿Sabes qué proveedores admite Fabric?
---

:::escenario El pedido
Lucía: *"Ayer alguien cambió el notebook y rompió el resumen por canal. No sabemos qué cambió ni cómo volver atrás. Quiero historial."*
:::

## Paso 1 — Crear el repositorio

En el [GitHub de práctica](#/github/new), un repositorio nuevo llamado `fabric-tienda-andina`. En una empresa real, el repositorio lo crea el equipo de plataforma con los permisos ya configurados.

## Paso 2 — Conectar el workspace

En el workspace, **Workspace settings → Git integration**:

```captura
archivo: fabric/b19-git-conectar.webp
texto: El repositorio (1), la rama main (2) y la carpeta fabric (3), y el botón Connect and sync
```

| Dato | Qué es |
|---|---|
| **Repository** | Dónde se guardan los archivos |
| **Branch** | La rama que sigue este workspace |
| **Git folder** | La carpeta del repo donde van los ítems (útil si el repo tiene más cosas) |

**Connect and sync**.

:::nota Proveedores
Fabric admite **Azure DevOps** y **GitHub** (incluido GitHub Enterprise). En Fabric real necesitas un token o una conexión con permisos sobre el repo.
:::

## Paso 3 — Source control

En la cabecera del workspace aparece **Source control** con el número de cambios:

```captura
archivo: fabric/b19-source-control.webp
texto: El botón Source control con los cambios pendientes
```

```captura
archivo: fabric/b19-cambios.webp
texto: Changes - cada ítem con su tipo (Lakehouse, Notebook, DataPipeline, Warehouse, SemanticModel), el mensaje y Commit
```

| Pestaña | Sentido | Qué hace |
|---|---|---|
| **Changes** | Workspace → Git | Lo que cambiaste en Fabric y todavía no subiste |
| **Updates** | Git → Workspace | Lo que alguien subió al repo y todavía no está en el workspace |

## Paso 4 — Qué se versiona

| Se versiona | No se versiona |
|---|---|
| La **definición** de cada ítem: el código del notebook, el JSON del pipeline, el esquema del warehouse, el modelo semántico (TMDL) | Los **datos** de las tablas y los archivos de Files |
| | Las conexiones con credenciales |

Git guarda **cómo se construye** el workspace, no los datos. Los datos viven en OneLake.

## ✅ Lo que lograste

- Conectaste el workspace a un repositorio.
- Sabes leer Changes y Updates.
- Sabes qué entra a Git y qué no.

:::ejercicio quiz
¿Qué tres datos pide la conexión a Git?
- [ ] Usuario, contraseña y correo
- [x] Repositorio, rama y carpeta
- [ ] Capacidad, región y SKU
- [ ] Lakehouse, tabla y columna
:::

:::ejercicio quiz
¿Qué muestra la pestaña Changes?
- [x] Lo cambiado en el workspace que todavía no se subió al repo
- [ ] Lo que alguien subió al repo
- [ ] Las ejecuciones del Monitor
- [ ] Las tablas con datos nuevos
:::

:::ejercicio quiz
¿Se guardan en Git las filas de la tabla ventas_tiendas?
- [ ] Sí
- [x] No: Git guarda la definición de los ítems, los datos viven en OneLake
- [ ] Solo las primeras mil
- [ ] Solo en Pro
:::

:::ejercicio quiz
¿Qué proveedores de Git admite Fabric?
- [ ] Solo GitLab
- [x] Azure DevOps y GitHub
- [ ] Ninguno
- [ ] Solo Bitbucket
:::
