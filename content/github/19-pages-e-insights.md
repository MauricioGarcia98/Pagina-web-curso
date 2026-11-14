---
titulo: GitHub Pages e Insights - publicar documentación y medir la actividad del proyecto
nivel: 5 · Avanzado
duracion: 45
resumen: GitHub Pages publica un sitio estático gratis desde tu repositorio - ideal para la documentación de un pipeline, un diccionario de datos o tu portafolio. Publicar desde una rama y desde GitHub Actions, la URL que recibes, y después Insights - Pulse y Contributors para ver qué pasó en el proyecto.
objetivos: Publicar un sitio con Pages desde una rama | Publicar con un workflow de Actions | Saber qué puede y qué no puede alojar Pages | Leer Pulse y Contributors
prerrequisitos: github-seguridad
autoevaluacion: ¿Sabes cuál es la URL de un sitio de Pages de proyecto? | ¿Sabes la diferencia entre publicar desde rama y desde Actions? | ¿Sabes por qué Pages no sirve para una API? | ¿Sabes qué muestra Pulse?
---

:::analogia En palabras simples
GitHub Pages es una vidriera gratis pegada a tu repositorio: lo que pongas en una carpeta (páginas HTML, imágenes, el README) se muestra como sitio web en una dirección pública. Este mismo curso está publicado con GitHub Pages.
:::

## Paso 1 — Publicar desde una rama

En `ventas-app`: **Settings → Pages**. En **Source** elige **Deploy from a branch**, rama `main`, carpeta `/ (root)`, **Save**:

```captura
archivo: github/g19-pages.webp
texto: Source Deploy from a branch (1) y la rama main con la carpeta root (2)
```

En uno o dos minutos el sitio queda en:

```text
https://alumno.github.io/ventas-app/
```

| Tipo de sitio | Repositorio | URL |
|---|---|---|
| **De proyecto** | Cualquiera (`ventas-app`) | `https://<usuario>.github.io/<repo>/` |
| **De usuario** | Uno llamado exactamente `<usuario>.github.io` | `https://<usuario>.github.io/` |

Si hay un `index.html`, se muestra ese; si no, GitHub convierte el `README.md` en página. La carpeta puede ser `/ (root)` o `/docs` (para separar la documentación del código).

## Paso 2 — Una página de documentación

Crea `docs/index.html` (y elige la carpeta `/docs` en Pages) con lo mínimo de un diccionario de datos:

```html
<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>ventas-app - documentación</title></head>
<body>
  <h1>ventas-app</h1>
  <p>Resumen de ventas por canal de Tienda Andina.</p>
  <h2>Diccionario de datos</h2>
  <table>
    <tr><th>Columna</th><th>Tipo</th><th>Descripción</th></tr>
    <tr><td>canal</td><td>texto</td><td>web, app o tienda</td></tr>
    <tr><td>estado</td><td>texto</td><td>entregado, cancelado, devuelto…</td></tr>
    <tr><td>total</td><td>decimal</td><td>Monto del pedido</td></tr>
  </table>
</body>
</html>
```

Entra por PR (main está protegida). Al fusionar, Pages vuelve a publicar solo.

## Paso 3 — Publicar con GitHub Actions

Cuando el sitio se **genera** (por ejemplo, la documentación de dbt con `dbt docs generate`, o un reporte que crea un script), se publica con un workflow. En **Settings → Pages → Source** elige **GitHub Actions**, y en **Actions → New workflow** está la plantilla **Static HTML**. Lo esencial:

```yaml
name: docs
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  deploy:
    environment:
      name: github-pages
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: docs
      - uses: actions/deploy-pages@v4
```

Entre `checkout` y `upload-pages-artifact` puedes agregar pasos que generan archivos en `docs/` (correr un script de Python que escribe un HTML, por ejemplo). Lo que esté en esa carpeta al final es lo que se publica.

## Paso 4 — Qué puede y qué no puede alojar Pages

| Sí | No |
|---|---|
| HTML, CSS, JavaScript, imágenes | Código de servidor (Python, una API, una base de datos) |
| Documentación, portafolios, reportes estáticos | Datos privados: un sitio de Pages es **público** aunque el repositorio sea privado (salvo en planes empresariales) |
| Un dominio propio (`docs.tuempresa.com`) | Sitios de mucho tráfico comercial (tiene límites de uso) |

:::cuidado No publiques datos reales
Un reporte con datos de clientes publicado en Pages queda en internet para cualquiera. Para reportes internos, usa Power BI, un tablero interno o un sitio con acceso controlado.
:::

## Paso 5 — Insights: Pulse y Contributors

Pestaña **Insights**:

```captura
archivo: github/g19-insights.webp
texto: Pulse - 1 PR fusionado, 1 issue cerrado, y alumno con 6 commits en Contributors
```

| Vista | Qué muestra |
|---|---|
| **Pulse** | PRs fusionados y abiertos, issues cerrados y abiertos en un período |
| **Contributors** | Commits por persona a lo largo del tiempo |
| **Traffic** (GitHub real) | Visitas y clones de las últimas dos semanas (útil para tu portafolio) |
| **Network / Forks** (GitHub real) | Ramas y forks |

:::tip Insights no mide el rendimiento de una persona
Más commits no es más trabajo: un commit puede ser un error de tipeo y otro una semana de diseño. Usa Insights para ver el ritmo del proyecto (¿se acumulan PRs sin revisar?), no para comparar personas.
:::

## ✅ Lo que lograste

- Publicaste un sitio con Pages desde una rama.
- Sabes publicar con un workflow cuando el sitio se genera.
- Sabes qué no poner en Pages.
- Lees Pulse y Contributors.

:::ejercicio quiz
Publicas Pages desde el repositorio `ventas-app` del usuario `alumno`. ¿Cuál es la URL?
- [ ] https://github.com/alumno/ventas-app
- [x] https://alumno.github.io/ventas-app/
- [ ] https://ventas-app.github.io/
- [ ] https://pages.github.com/alumno
:::

:::ejercicio quiz
La documentación se genera con un comando (por ejemplo, dbt docs generate). ¿Cómo la publicas?
- [ ] Subiendo a mano los archivos cada semana
- [x] Con un workflow de Actions que la genera y la publica con upload-pages-artifact y deploy-pages
- [ ] No se puede con Pages
- [ ] Desde Insights
:::

:::ejercicio quiz
¿Puedes alojar una API en Python con GitHub Pages?
- [ ] Sí
- [x] No: Pages solo sirve archivos estáticos
- [ ] Sí, si el repositorio es privado
- [ ] Solo los fines de semana
:::
