---
titulo: Revisar código - pedir revisión, comentar líneas, aprobar o pedir cambios
nivel: 3 · Intermedio
duracion: 45
resumen: La revisión de código es donde un equipo de datos atrapa errores antes de que lleguen a producción. Pedir revisión a un compañero, leer su revisión, responder comentarios de línea, sugerir cambios, y del otro lado - cómo revisar tú, qué mirar en un PR de datos y cómo escribir comentarios que ayudan.
objetivos: Pedir revisión a compañeros | Distinguir Comment, Approve y Request changes | Comentar una línea y usar sugerencias | Responder y resolver conversaciones | Revisar un PR de datos con una lista de control
prerrequisitos: github-pull-requests
autoevaluacion: ¿Sabes pedir revisión a alguien? | ¿Sabes la diferencia entre Approve y Request changes? | ¿Sabes comentar una línea concreta? | ¿Sabes qué revisar en un PR que toca un pipeline?
---

:::analogia En palabras simples
Revisar código es como pedirle a un compañero que lea tu informe antes de mandarlo al director. No es desconfianza: dos pares de ojos ven más que uno, y el que revisa aprende cómo funciona tu parte.
:::

## Paso 1 — Pedir revisión

En el PR, barra lateral derecha, **Reviewers** → la ruedita → elige a alguien. En la práctica están **camila** y **martin**, compañeros del equipo de datos de Tienda Andina:

```captura
archivo: github/g10-pedir-revision.webp
texto: El menú Reviewers con camila y martin; tú no apareces porque el autor no puede aprobar su propio PR
```

Elige a **camila**. En unos segundos revisa tu PR (en la práctica, la revisión la hace un revisor automático que mira tu código de verdad: si dejas un `print` de depuración, un `except:` sin tipo o una contraseña en el código, te lo comenta).

## Paso 2 — Leer la revisión

```captura
archivo: github/g10-revision.webp
texto: Camila aprobó el PR con "LGTM 🚀" y la caja de merge quedó en verde
```

Hay tres tipos de revisión:

| Tipo | Ícono | Significa |
|---|---|---|
| **Comment** | 💬 | Comentarios sin decidir |
| **Approve** | ✓ verde | "Está bien, puede entrar" |
| **Request changes** | ± rojo | "Hay que cambiar algo antes de fusionar" |

*LGTM* = *Looks good to me* ("me parece bien"), la aprobación más común.

## Paso 3 — Cuando te piden cambios

Si la revisión es **Request changes**, el flujo es:

1. Lee cada comentario de línea (aparecen en **Conversation** y en **Files changed**).
2. Corrige en tu rama, en tu editor.
3. `git commit` y `git push` a la **misma rama**: el PR se actualiza solo.
4. Responde cada comentario ("Listo, lo cambié a logging") y haz clic en **Resolve conversation**.
5. Vuelve a pedir revisión con el ícono 🔄 junto al nombre del revisor.

Pruébalo: en otra rama agrega una línea `print("debug", totales)` dentro de la función, sube, crea el PR y pide revisión a camila. Te va a comentar esa línea.

## Paso 4 — Comentar una línea y sugerir

En **Files changed**, pasa el mouse por una línea y haz clic en el **+** azul:

- **Add single comment**: publica el comentario ya.
- **Start a review**: junta varios comentarios y los publica todos juntos al final con **Review changes** (Comment / Approve / Request changes). Es lo que se usa al revisar un PR completo.

En GitHub real, el botón **±** del comentario inserta un bloque `suggestion`: el autor lo acepta con un clic (**Commit suggestion**) y se crea el commit solo.

````text
```suggestion
    totales[fila["canal"]] += float(fila["total"])
```
````

## Paso 5 — Revisar tú: qué mirar en un PR de datos

| Pregunta | Por qué |
|---|---|
| ¿Hace lo que dice la descripción? | El título y el código no siempre coinciden |
| ¿Hay tests y pasan? | Sin test, nadie sabe si sigue funcionando el mes que viene |
| ¿Qué pasa con nulos, vacíos y duplicados? | Los datos reales los traen siempre |
| ¿Cambia el esquema de una tabla que otros leen? | Puede romper tableros y pipelines de otros |
| ¿Hay credenciales, rutas locales o `SELECT *`? | Seguridad y fragilidad |
| ¿Se reprocesa todo o solo lo nuevo? | Costo y tiempo en producción |

## Paso 6 — Comentarios que ayudan

| No | Sí |
|---|---|
| "Esto está mal." | "Si `total` viene vacío, `float("")` falla. ¿Lo filtramos antes?" |
| "¿Por qué hiciste esto?" | "No entiendo por qué se excluye 'devuelto'; ¿lo agregamos a la descripción?" |
| Diez comentarios de estilo | "nit:" delante de lo menor ("nit: este nombre podría ser `filas_validas`") |

:::tip Revisa como te gustaría que te revisen
Comenta el código, no a la persona. Pregunta antes de afirmar. Y si algo está bien hecho, dilo: también es información útil.
:::

## ✅ Lo que lograste

- Pediste revisión y leíste una aprobación.
- Sabes el flujo cuando te piden cambios.
- Sabes comentar líneas, sugerir y qué revisar en un PR de datos.

:::ejercicio quiz
¿Por qué no puedes pedirte revisión a ti mismo en tu PR?
- [ ] Porque GitHub no te encuentra
- [x] Porque el autor no puede aprobar su propio pull request
- [ ] Porque necesitas ser administrador
- [ ] Sí se puede
:::

:::ejercicio quiz
Te piden cambios en un PR. ¿Qué haces?
- [ ] Cierro el PR y abro otro
- [x] Corrijo en la misma rama, hago push, respondo los comentarios y vuelvo a pedir revisión
- [ ] Fusiono igual
- [ ] Borro los comentarios
:::

:::ejercicio quiz
¿Para qué sirve "Start a review" en lugar de "Add single comment"?
- [ ] Para aprobar sin leer
- [x] Para juntar varios comentarios y publicarlos todos juntos con una decisión final
- [ ] Para cerrar el PR
- [ ] Para crear un issue
:::
