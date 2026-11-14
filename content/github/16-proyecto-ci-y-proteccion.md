---
titulo: Proyecto 4 (con requisitos) - un repositorio con CI y main protegida, listo para un equipo
nivel: 4 · Intermedio-avanzado
duracion: 90
resumen: Tu líder te pide que ventas-app quede listo para que entren dos personas más al equipo - CI que corre lint y tests en cada PR, main protegida, colaboradores, CODEOWNERS y una plantilla de PR. Lo demuestras con un PR que primero queda bloqueado por un test en rojo y después entra con tests en verde y aprobación. Hay requisitos y control; no hay pasos ni pistas.
objetivos: Configurar CI con lint y tests | Proteger main con PR, aprobación y check obligatorio | Agregar colaboradores, CODEOWNERS y plantilla de PR | Demostrar que la protección funciona con un PR bloqueado y luego aprobado
prerrequisitos: github-trabajo-en-equipo
autoevaluacion: ¿Sabes armar CI desde cero? | ¿Sabes conectar el check del workflow con la regla de la rama? | ¿Sabes demostrar que una regla funciona? | ¿Sabes escribir una plantilla de PR?
---

:::escenario El pedido
Martín: *"La semana que viene entran dos personas al equipo y van a trabajar en `ventas-app`. Antes de eso quiero que nadie pueda romper main: todo por PR, con los tests corriendo solos y al menos una aprobación. Que quede documentado cómo se contribuye. Mandame el link del PR donde se vea que funciona."*
:::

Este proyecto tiene **requisitos y control**, sin pasos. Todo lo necesario está en las lecciones 9 a 15.

## Requisitos

1. **CI** — `.github/workflows/ci.yml` que corra en cada `pull_request` y en cada push a `main`, con un job llamado `checks` que ejecute `ruff check .` y `pytest`.
2. **Tests** — al menos **3** tests en total en el repositorio (los de `resumen.py` cuentan). Agrega un test de `totales_por_canal` con una lista vacía (debe devolver `{}`).
3. **Protección** — regla para `main`: PR obligatorio, **1** aprobación, check `checks` obligatorio.
4. **Equipo** — camila y martin como colaboradores; `.github/CODEOWNERS` con `*` → `@martin` y `/.github/` → `@martin @camila`.
5. **Contribuir** — `.github/pull_request_template.md` con secciones *Qué cambia*, *Por qué*, *Cómo probarlo*; y una sección **Cómo contribuir** en el README (ramas, tests, PR).
6. **La demostración** — un PR (`feature/ticket-promedio`) que agregue `ticket_promedio_por_canal(filas)` a `resumen.py` con su test. El **primer push** de ese PR debe tener un test que falla a propósito (o un error de ruff), para que se vea bloqueado. Después lo arreglas, pides revisión y lo fusionas.

:::nota El orden importa
La regla de protección se crea **después** de que el workflow haya corrido al menos una vez: si no, GitHub no conoce el check `checks` para sugerirlo. Y los archivos de configuración (CI, CODEOWNERS, plantilla) tienen que entrar a main antes de proteger, o por PR después.
:::

## ✔ Control

| Control | Esperado |
|---|---|
| Push directo a main | Rechazado con GH006 |
| Pestaña Actions | Ejecuciones de `ci` en push a main y en el PR |
| PR `feature/ticket-promedio`, primer push | ❌ `checks` en rojo + *Merging is blocked* |
| Mismo PR, después del arreglo | ✓ `checks` en verde + aprobación → fusionado |
| `pytest` en main | Al menos 4 passed (3 requeridos + el de ticket promedio) |
| Descripción del PR | Usa las secciones de la plantilla |
| README | Sección Cómo contribuir |

**Comprobación de la función**: con las filas `[{"canal": "web", "estado": "entregado", "total": "100"}, {"canal": "web", "estado": "entregado", "total": "50"}, {"canal": "app", "estado": "cancelado", "total": "80"}]`, `ticket_promedio_por_canal` debe devolver `{"web": 75.0}` (los cancelados no cuentan).

## Rúbrica

| Criterio | Insuficiente | Competente | Sobresaliente |
|---|---|---|---|
| CI | No corre o corre solo en push | Corre en PR y push a main, lint + tests | Además usa caché de pip o matriz de versiones |
| Protección | Falta alguna condición | PR + 1 aprobación + check | Además *up to date* y sin bypass de admins |
| Demostración | No se ve el bloqueo | Se ve rojo bloqueado y luego verde fusionado | El historial del PR cuenta la historia sin explicación extra |
| Documentación | Sin plantilla ni guía | Plantilla y Cómo contribuir | Alguien nuevo podría hacer su primer PR solo leyendo el README |

## Entrega

Mensaje a Martín con el enlace al PR: *"Listo. main protegida (PR + 1 aprobación + check `checks`). En el PR #N se ve el bloqueo con el test en rojo y después el merge con todo en verde. La guía para contribuir está en el README."*

## 🖥️ Hazlo también en GitHub real

Repite el proyecto en tu repositorio de portafolio en GitHub real. Para la aprobación vas a necesitar a otra persona (un compañero de curso): un repositorio personal no deja que te apruebes tú. Si estás solo, deja **Required approvals** en 0 y conserva el check obligatorio: igual te protege de subir código roto.

:::ejercicio quiz
Creas la regla de protección antes de que el workflow haya corrido nunca. ¿Qué problema hay?
- [ ] Ninguno
- [x] GitHub todavía no conoce el check para sugerirlo; conviene que el workflow corra primero
- [ ] La regla se borra
- [ ] El workflow deja de funcionar
:::

:::ejercicio quiz
¿Por qué el primer push del PR de demostración debe fallar?
- [ ] Para practicar git reset
- [x] Para demostrar que la protección bloquea un PR con el check en rojo
- [ ] Porque GitHub lo exige
- [ ] Para generar un issue
:::
