---
titulo: Trabajo en equipo - colaboradores, permisos, CODEOWNERS, forks y notificaciones
nivel: 4 · Intermedio-avanzado
duracion: 45
resumen: Cómo se organiza un equipo en GitHub - invitar colaboradores y elegir su rol, organizaciones y equipos, el archivo CODEOWNERS que asigna revisores automáticamente por carpeta, el modelo fork + pull request de los proyectos open source, y cómo controlar las notificaciones para no perderte lo importante.
objetivos: Agregar colaboradores y elegir el rol adecuado | Entender organizaciones y equipos | Escribir un archivo CODEOWNERS | Explicar el flujo fork + pull request | Configurar Watch y filtrar notificaciones
prerrequisitos: github-proteger-main
autoevaluacion: ¿Sabes qué rol necesita alguien que solo revisa? | ¿Sabes qué hace una línea de CODEOWNERS? | ¿Sabes cuándo se usa un fork en lugar de una rama? | ¿Sabes dejar de recibir notificaciones de un repositorio sin dejar de verlo?
---

:::analogia En palabras simples
Un repositorio es como una oficina: el dueño entrega llaves (permisos) según lo que cada uno necesita. Algunos solo pueden mirar, otros pueden trabajar, y unos pocos pueden cambiar las cerraduras. CODEOWNERS es el cartel que dice "lo que toque esta carpeta lo revisa tal persona".
:::

## Paso 1 — Agregar colaboradores

En `ventas-app`: **Settings → Collaborators → Add people**. En la práctica existen **camila** y **martin**; agrégalos.

En un repositorio personal, un colaborador tiene permiso de escritura. En una **organización** (como `tienda-andina`) se elige el rol:

| Rol | Puede |
|---|---|
| **Read** | Ver, clonar, comentar issues |
| **Triage** | Además, etiquetar, asignar y cerrar issues y PRs |
| **Write** | Además, hacer push a ramas y fusionar PRs (si las reglas lo permiten) |
| **Maintain** | Además, gestionar el repositorio sin acceso a lo delicado |
| **Admin** | Todo: settings, reglas, secretos, borrar el repositorio |

:::tip Mínimo privilegio
Da el rol más bajo que alcance. Un analista que solo lee el código: Read. Un ingeniero del equipo: Write. Admin, dos o tres personas. En `tienda-andina/pipelines` tú tienes **Write**: por eso puedes abrir y fusionar PRs, pero en **Settings** te aparece un aviso: la configuración (reglas, secretos) es solo para administradores.
:::

## Paso 2 — Organizaciones y equipos

Una **organización** es una cuenta compartida de la empresa (`tienda-andina`). Adentro hay **equipos** (`@tienda-andina/datos`, `@tienda-andina/bi`) y los permisos se dan al equipo, no persona por persona: cuando alguien entra al equipo, recibe los accesos; cuando se va, se le quitan todos de una vez.

## Paso 3 — CODEOWNERS

El archivo `.github/CODEOWNERS` dice quién es dueño de cada parte del código. Cuando un PR toca esos archivos, GitHub **pide revisión automáticamente** a esos dueños:

```text
# Todo el repositorio: el equipo de datos
*                       @tienda-andina/datos

# El ETL lo revisa Martín
/pipelines/             @martin

# Los modelos de dbt, Camila
/dbt/models/            @camila

# Los workflows, Martín y Camila
/.github/workflows/     @martin @camila
```

- Se lee de arriba hacia abajo y **gana la última línea que coincide**.
- Con la regla **Require review from Code Owners** (lección 14), el PR no se fusiona sin la aprobación de esos dueños.

:::nota En la práctica
La réplica no asigna revisores por CODEOWNERS: pides la revisión a mano. Escribe el archivo igual en `ventas-app` (es parte del proyecto 4) y pruébalo en tu GitHub real.
:::

## Paso 4 — Forks: contribuir sin permiso de escritura

En un proyecto open source no tienes permiso de push. El flujo es:

1. **Fork** (botón arriba a la derecha): una copia del repositorio en tu cuenta.
2. Clonas **tu** fork, creas una rama, haces commits y push a tu fork.
3. Abres un PR **desde tu fork hacia el repositorio original**.
4. Los mantenedores revisan y fusionan.

Para traer cambios nuevos del original a tu fork: botón **Sync fork**, o en la terminal `git remote add upstream <url-original>` y `git pull upstream main`.

| | Rama | Fork |
|---|---|---|
| Permiso necesario | Write en el repositorio | Ninguno |
| Dónde | Dentro del repositorio del equipo | En tu cuenta |
| Típico en | Equipos de una empresa | Open source |

:::nota En la práctica
El botón **Fork** se ve pero no está simulado. Para practicarlo de verdad, haz un fork de un repositorio open source pequeño que uses y corrige un error de tipeo en su documentación: es la primera contribución más común.
:::

## Paso 5 — Notificaciones

| Herramienta | Qué hace |
|---|---|
| **Watch → All Activity** | Te avisa de todo (útil en el repositorio de tu equipo) |
| **Watch → Participating and @mentions** | Solo lo que te menciona o donde participaste |
| **Watch → Custom** | Elegir: issues, PRs, releases… |
| Bandeja (🔔 arriba) | Filtros: *Review requested*, *Assigned*, *Mentioned* |

En un equipo, la notificación que no puedes perder es **Review requested**: alguien está esperando tu revisión para seguir.

## ✅ Lo que lograste

- Sabes dar el permiso justo a cada persona.
- Sabes escribir un CODEOWNERS.
- Entiendes el flujo fork + PR del open source.
- Sabes controlar las notificaciones.

:::ejercicio quiz
Un analista necesita leer el código y comentar issues, nada más. ¿Qué rol le das?
- [x] Read
- [ ] Write
- [ ] Maintain
- [ ] Admin
:::

:::ejercicio quiz
En CODEOWNERS tienes `* @tienda-andina/datos` y más abajo `/pipelines/ @martin`. Un PR cambia pipelines/etl.py. ¿A quién se pide revisión?
- [ ] Al equipo datos
- [x] A martin, porque gana la última línea que coincide
- [ ] A los dos siempre
- [ ] A nadie
:::

:::ejercicio quiz
Quieres corregir algo en un proyecto open source donde no tienes permiso de escritura. ¿Qué haces?
- [ ] Pido que me den Admin
- [x] Hago un fork, trabajo en mi copia y abro un PR hacia el original
- [ ] Hago push directo
- [ ] Copio el código a un repositorio nuevo
:::
