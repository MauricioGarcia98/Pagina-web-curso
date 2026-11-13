---
titulo: Extensiones, temas y perfiles - armar el VS Code de un profesional de datos
nivel: 5 · Avanzado
duracion: 40
resumen: VS Code sin extensiones es un buen editor; con las extensiones adecuadas es un entorno completo para Python, SQL, dbt, Jupyter, Docker y la nube. Cuáles instalar para trabajar con datos, cómo instalarlas y desactivarlas, los temas de color e íconos, y cómo no llenar el editor de extensiones que lo vuelven lento o inseguro.
objetivos: Buscar, instalar y desinstalar extensiones | Elegir las extensiones esenciales para un perfil de datos | Cambiar el tema de color y de íconos | Recomendar extensiones a un equipo desde el proyecto | Evaluar si una extensión es confiable
prerrequisitos: vscode-sql-y-dbt-en-vscode
autoevaluacion: ¿Sabes instalar una extensión? | ¿Sabes qué extensiones usa un equipo de datos? | ¿Sabes cambiar el tema? | ¿Sabes revisar si una extensión es confiable?
---

:::analogia En palabras simples
VS Code es un teléfono recién comprado y las extensiones son las aplicaciones. Unas pocas bien elegidas lo vuelven indispensable; cien aplicaciones de cualquier origen lo vuelven lento y riesgoso.
:::

## Paso 1 — La vista de extensiones

**Ctrl + Shift + X** (o el ícono de los cuadrados):

```captura
archivo: vscode/v18-extensiones.webp
texto: Las extensiones instaladas y las recomendadas para datos, con su botón Instalar
```

Cada extensión muestra nombre, autor, qué hace y el botón **Instalar** / **Desinstalar**. En VS Code real también ves cantidad de descargas, calificación y si el autor está **verificado**.

## Paso 2 — Las esenciales para datos

| Extensión | Autor | Para |
|---|---|---|
| **Python** | Microsoft | Ejecutar, depurar y elegir el intérprete |
| **Pylance** | Microsoft | Autocompletado y detección de errores de tipos |
| **Jupyter** | Microsoft | Abrir y ejecutar notebooks dentro de VS Code |
| **Ruff** | Astral | Linter y formateador mientras escribes |
| **dbt Power User** | AltimateAI | Ejecutar modelos, ver linaje y SQL compilado |
| **YAML** | Red Hat | Validar YAML (dbt, GitHub Actions, Docker Compose) |
| **GitLens** | GitKraken | Quién cambió cada línea y cuándo |
| **Docker** | Microsoft | Contenedores e imágenes |
| **Databricks** | Databricks | Sincronizar código y ejecutar en un clúster |

:::cuidado Las extensiones pueden leer tu código
Una extensión corre con los mismos permisos que VS Code: puede leer tus archivos y, en teoría, tus claves. Instala solo extensiones de autores verificados o muy conocidas, revisa las descargas y las reseñas, y desinstala las que no uses. En las empresas, muchas veces hay una lista de extensiones permitidas.
:::

## Paso 3 — Recomendar extensiones al equipo

En el proyecto, un archivo `.vscode/extensions.json`:

```json
{
  "recommendations": ["ms-python.python", "charliermarsh.ruff", "innoverio.vscode-dbt-power-user"]
}
```

Quien abre el proyecto ve un aviso: "Este proyecto recomienda estas extensiones". Así todo el equipo trabaja con las mismas herramientas.

## Paso 4 — Temas de color e íconos

Paleta (**Ctrl + Shift + P**) → **Preferencias: tema de color** (o **Ctrl + K Ctrl + T**):

```captura
archivo: vscode/v18-temas.webp
texto: El selector de temas: se aplican al moverte por la lista, antes de elegir
```

Elige **Light Modern** para ver un tema claro:

```captura
archivo: vscode/v18-tema-claro.webp
texto: El mismo VS Code con el tema Light Modern
```

Los temas son preferencia personal; los de **alto contraste** existen por accesibilidad. **Preferencias: tema de íconos de archivo** cambia los íconos del explorador.

## Paso 5 — Perfiles (VS Code real)

Un **perfil** es un conjunto de extensiones y ajustes: "Datos" con Python, Jupyter y dbt; "Web" con otras. Se cambia desde la ruedita → **Perfiles**. Útil si usas el mismo VS Code para cosas muy distintas, o para tener un perfil limpio cuando enseñas o presentas.

## ✅ Lo que lograste

- Instalas y desinstalas extensiones con criterio.
- Conoces las extensiones esenciales para datos y cómo recomendarlas al equipo.
- Cambias temas de color e íconos.

:::ejercicio quiz
¿Qué extensión permite elegir el intérprete y depurar Python?
- [ ] YAML
- [x] Python (Microsoft)
- [ ] GitLens
- [ ] Docker
:::

:::ejercicio quiz
¿Qué conviene revisar antes de instalar una extensión desconocida?
- [ ] Solo el ícono
- [x] El autor (verificado), las descargas, las reseñas y qué permisos necesita
- [ ] Que sea gratis
- [ ] Nada, todas son seguras
:::

:::ejercicio quiz
¿Cómo haces que todo el equipo vea las mismas extensiones recomendadas al abrir el proyecto?
- [ ] Mando un mail con la lista
- [x] Un archivo .vscode/extensions.json en el repositorio
- [ ] Las instalo en la computadora de cada uno
- [ ] En el README
:::
