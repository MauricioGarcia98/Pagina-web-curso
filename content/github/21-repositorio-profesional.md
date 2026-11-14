---
titulo: Un repositorio profesional - README, licencia, plantillas, CONTRIBUTING, releases y orden
nivel: 6 · Avanzado completo
duracion: 50
resumen: Lo que distingue un repositorio de equipo (o de portafolio) bien hecho de una carpeta de archivos - la estructura de carpetas, el README con badges, la licencia, CONTRIBUTING, plantillas de issues y PRs, CODEOWNERS, SECURITY.md, etiquetas, topics, releases con versiones semánticas y un CHANGELOG. Una lista de control para revisar cualquier repositorio.
objetivos: Organizar las carpetas de un proyecto de datos | Escribir los archivos de comunidad (LICENSE, CONTRIBUTING, SECURITY, plantillas) | Agregar badges y topics | Publicar releases con versiones semánticas | Revisar un repositorio con una lista de control
prerrequisitos: github-proyecto-ci-avanzado-y-docs
autoevaluacion: ¿Sabes qué licencia elegir para un proyecto de portafolio? | ¿Sabes dónde van las plantillas de issues? | ¿Sabes qué significa la versión 2.1.0? | ¿Sabes qué mira alguien en los primeros 30 segundos en tu repositorio?
---

:::analogia En palabras simples
Un repositorio profesional es como un local bien atendido: cartel claro en la puerta (README), reglas visibles (licencia, cómo contribuir), formularios para pedir cosas (plantillas) y todo en su estante (carpetas). Quien entra sabe qué hacer sin preguntar.
:::

## Paso 1 — Estructura de un proyecto de datos

```text
ventas-app/
├── .github/
│   ├── workflows/          CI, reportes, docs
│   ├── ISSUE_TEMPLATE/     formularios de issues
│   ├── CODEOWNERS
│   ├── dependabot.yml
│   └── pull_request_template.md
├── src/                    el código (o el nombre del paquete)
├── tests/                  los tests
├── docs/                   documentación publicada en Pages
├── datos/ejemplo/          datos de ejemplo pequeños e inventados
├── .gitignore              .venv, __pycache__, .env, datos reales
├── requirements.txt        dependencias con versión
├── README.md
├── LICENSE
├── CONTRIBUTING.md
├── SECURITY.md
└── CHANGELOG.md
```

:::cuidado Los datos no van al repositorio
Git no es un lugar para datos: archivos grandes vuelven el repositorio lento para siempre (quedan en el historial) y los datos reales pueden ser privados. En el repositorio, solo **datos de ejemplo pequeños e inventados**; los reales, en el lakehouse o el almacenamiento.
:::

## Paso 2 — El README de un repositorio profesional

Arriba de todo, los **badges** (insignias) muestran el estado:

```text
# ventas-app

![CI](https://github.com/alumno/ventas-app/actions/workflows/pipeline.yml/badge.svg)
![Python](https://img.shields.io/badge/python-3.11%20%7C%203.12-blue)
![Licencia](https://img.shields.io/badge/licencia-MIT-green)

Resumen semanal de ventas por canal de Tienda Andina: limpieza, métricas y reporte automático.
```

El badge de CI lo da GitHub: en la ejecución de un workflow, **⋯ → Create status badge**. Después vienen las secciones de la lección 7: instalación, uso, estructura, cómo contribuir, licencia.

## Paso 3 — Licencia

Sin licencia, legalmente nadie puede usar tu código aunque sea público.

| Licencia | Permite | Pide |
|---|---|---|
| **MIT** | Casi todo, incluso uso comercial | Mantener el aviso de copyright |
| **Apache 2.0** | Igual que MIT, con protección de patentes | Aviso y documentar cambios |
| **GPL 3.0** | Usar y modificar | Que lo derivado también sea GPL |

Para portafolio y proyectos personales, **MIT** es la elección habitual. Se agrega al crear el repositorio o con **Add file → Create new file → `LICENSE` → Choose a license template**. El código del trabajo pertenece a la empresa: la licencia la decide la empresa.

## Paso 4 — Archivos de comunidad y plantillas

| Archivo | Para qué |
|---|---|
| `CONTRIBUTING.md` | Cómo preparar el entorno, convenciones de ramas y commits, cómo correr los tests, cómo abrir un PR |
| `SECURITY.md` | Cómo reportar una vulnerabilidad en privado |
| `.github/pull_request_template.md` | El texto con el que empieza cada PR |
| `.github/ISSUE_TEMPLATE/*.yml` | Formularios para issues (bug, pedido de datos) |
| `CODE_OF_CONDUCT.md` | Normas de convivencia (proyectos abiertos) |

Un formulario de issue para pedidos de datos:

```yaml
name: Pedido de datos
description: Pedir un reporte o una tabla nueva
labels: ["pedido-de-datos"]
body:
  - type: textarea
    id: pregunta
    attributes:
      label: ¿Qué pregunta de negocio quieres responder?
    validations:
      required: true
  - type: input
    id: fecha
    attributes:
      label: ¿Para cuándo lo necesitas?
  - type: dropdown
    id: frecuencia
    attributes:
      label: Frecuencia
      options: ["Una vez", "Semanal", "Mensual"]
```

## Paso 5 — Releases y versiones semánticas

Una **release** marca una versión del proyecto (una *etiqueta* de git + notas). **Versionado semántico**: `MAYOR.MENOR.PARCHE`.

| Cambio | Ejemplo | Sube |
|---|---|---|
| Rompe a quien lo usa (cambia una columna de salida) | 1.4.2 → **2.0.0** | MAYOR |
| Agrega algo compatible (una métrica nueva) | 1.4.2 → **1.5.0** | MENOR |
| Corrige un error | 1.4.2 → **1.4.3** | PARCHE |

```bash
git tag -a v1.0.0 -m "Primera versión estable"
git push origin v1.0.0
gh release create v1.0.0 --generate-notes
```

`--generate-notes` arma las notas con los títulos de los PRs fusionados desde la versión anterior: otra razón para escribir buenos títulos. El `CHANGELOG.md` lleva lo mismo en el repositorio.

:::nota En la práctica
La réplica no simula releases ni etiquetas en la web. Créalas en tu repositorio de portafolio en GitHub real.
:::

## Paso 6 — La lista de control

| ✔ | Revisión |
|---|---|
| ☐ | Descripción y **topics** (⚙️ junto a *About*: `data-engineering`, `python`, `etl`) |
| ☐ | README: qué es, cómo se instala, cómo se usa, con un ejemplo de salida |
| ☐ | Badge de CI en verde |
| ☐ | LICENSE |
| ☐ | `.gitignore` sin `.venv`, `.env` ni datos reales en el repositorio |
| ☐ | `requirements.txt` con versiones |
| ☐ | Tests y CI en cada PR |
| ☐ | main protegida |
| ☐ | Plantilla de PR y CONTRIBUTING |
| ☐ | Sin secretos en el historial (Security sin alertas abiertas) |
| ☐ | Etiquetas de issues útiles y sin issues abandonados de hace meses |

## ✅ Lo que lograste

- Sabes cómo se ordena un proyecto de datos y qué no va al repositorio.
- Escribiste los archivos de comunidad y una plantilla de issue.
- Sabes publicar releases con versiones semánticas.
- Tienes una lista de control para cualquier repositorio.

:::ejercicio quiz
Tu reporte cambia el nombre de una columna de salida que usa otro equipo. Estás en la versión 1.4.2. ¿Cuál es la siguiente?
- [ ] 1.4.3
- [ ] 1.5.0
- [x] 2.0.0
- [ ] 1.4.2-b
:::

:::ejercicio quiz
Un repositorio público no tiene archivo LICENSE. ¿Qué pasa?
- [ ] Es de dominio público
- [x] Legalmente nadie tiene permiso para usar, copiar o modificar el código
- [ ] Se aplica MIT automáticamente
- [ ] GitHub lo borra
:::

:::ejercicio quiz
¿Dónde van los formularios de issues?
- [ ] En la raíz como ISSUES.md
- [x] En .github/ISSUE_TEMPLATE/
- [ ] En Settings → Issues
- [ ] En docs/
:::
