---
titulo: Databricks como código - View as code, la CLI, bundles y Git
nivel: 6 · Avanzado completo
duracion: 50
resumen: Todo lo que hiciste con clics se puede escribir - y en un equipo, se escribe. Ver un job como YAML y JSON, exportar el workspace como bundle, la CLI databricks desde la terminal (que comparte estado con la práctica), qué es un Declarative Automation Bundle y cómo se despliega a dev y prod, las carpetas Git del workspace y el flujo completo con GitHub Actions.
objetivos: Leer la definición de un job como código | Usar la CLI para listar y crear recursos | Explicar qué es un bundle y qué contiene | Describir el despliegue a dev y prod | Conectar el workspace con Git y CI/CD
prerrequisitos: databricks-paso-a-paso-mlflow-experimentos-y-modelos
autoevaluacion: ¿Sabes dónde ver el YAML de un job? | ¿Sabes qué comando despliega un bundle? | ¿Sabes qué va en databricks.yml? | ¿Sabes por qué un equipo no crea jobs a mano en producción?
---

:::analogia En palabras simples
Hacer un job con clics es cocinar de memoria: sale bien hoy, pero nadie puede repetirlo igual mañana ni en otra cocina. Escribirlo como código es la receta: se guarda en Git, se revisa, se prueba en la cocina de desarrollo y se despliega idéntica en producción.
:::

## Paso 1 — Un job como código

En el job `ventas_diarias`, **View as code**:

```captura
archivo: databricks/d22-view-as-code.webp
texto: El mismo job como YAML de bundle y como JSON de la API
```

```yaml
resources:
  jobs:
    ventas_diarias:
      name: ventas_diarias
      max_concurrent_runs: 1
      tasks:
        - task_key: cargar_ventas
          notebook_task:
            notebook_path: /Workspace/Users/alumno@academia.dev/Ventas por canal
        - task_key: control_calidad
          depends_on:
            - task_key: cargar_ventas
          sql_task:
            query:
              query_text: SELECT COUNT(*) AS filas FROM main.default.ventas_por_canal
            warehouse_id: 1a2b3c4d5e6f7a8b
```

Todo lo que configuraste en el formulario está ahí: tareas, dependencias, cómputo, horario. Ese texto se guarda en un repositorio y se despliega.

## Paso 2 — La CLI

La terminal del curso tiene la CLI `databricks`, conectada al mismo estado que la práctica:

```bash
databricks auth login --host https://adb-123.azuredatabricks.net   # en real: abre el navegador
databricks clusters list
databricks jobs list
databricks jobs run-now --job-id 505991137319
databricks fs cp devoluciones.csv dbfs:/Volumes/main/default/raw/
databricks secrets create-scope kv-datos
databricks workspace export /Workspace/Users/alumno@academia.dev/Ventas\ por\ canal
```

Lo que creas con la CLI aparece en la interfaz y al revés. El curso de [Databricks y Databricks CLI](#/m/databricks) la cubre a fondo.

## Paso 3 — Bundles

Un **Declarative Automation Bundle** (antes *Asset Bundle*) es una carpeta con:

```text
mi-proyecto/
├── databricks.yml          # nombre del bundle, targets (dev, prod) y a qué workspace va cada uno
├── resources/
│   ├── ventas_diarias.job.yml
│   └── pedidos_diarios.pipeline.yml
└── src/
    ├── ventas_por_canal.py  # los notebooks como archivos fuente
    └── pipeline.sql
```

```yaml
# databricks.yml
bundle:
  name: ventas

targets:
  dev:
    mode: development          # recursos con prefijo [dev tu_usuario], horarios pausados
    default: true
    workspace:
      host: https://adb-dev.azuredatabricks.net
  prod:
    mode: production
    workspace:
      host: https://adb-prod.azuredatabricks.net
    run_as:
      service_principal_name: sp-datos-prod
```

```bash
databricks bundle validate            # ¿está bien escrito?
databricks bundle deploy -t dev       # crea o actualiza jobs, pipelines y notebooks en dev
databricks bundle run ventas_diarias  # lo ejecuta
databricks bundle deploy -t prod      # lo mismo, en producción (normalmente desde CI/CD)
```

El botón **Export as bundle** de la página de jobs descarga tus jobs y pipelines de práctica con esta estructura, listos para `databricks bundle deploy` en un workspace real.

## Paso 4 — Git en el workspace

En Databricks real, **Workspace → Create → Git folder** clona un repositorio (GitHub, Azure DevOps, GitLab) dentro del workspace: editas notebooks ahí, cambias de rama, haces commit y push desde la interfaz, y abres el pull request en GitHub. Los notebooks se guardan como archivos `.py`/`.sql` con separadores de celda, que Git compara línea a línea.

## Paso 5 — El flujo completo

```diagrama
titulo: De un cambio en una rama a producción, sin pasos manuales
nodo gf: Git folder | icono=git | col=0 | fila=0 | color=gris | sub=rama feature
nodo pr: Pull request | icono=github | col=1 | fila=0 | color=azul | sub=revisión de código
nodo ci: CI | icono=check | col=2 | fila=0 | color=amarillo | sub=bundle validate + tests
nodo mg: Merge a main | icono=git | col=3 | fila=0 | color=violeta
nodo cd: CD | icono=databricks | col=4 | fila=0 | color=verde | sub=bundle deploy -t prod con OIDC, sin tokens guardados
flecha gf -> pr: commit | explica=Trabajas en una rama dentro de un Git folder del workspace y haces commit.
flecha pr -> ci | explica=Al abrir el pull request, CI corre bundle validate y los tests.
flecha ci -> mg: aprobado | explica=Si CI pasa y alguien aprueba la revisión, se hace merge a main.
flecha mg -> cd | explica=El merge dispara bundle deploy -t prod. La autenticación es con OIDC, así que no hay tokens guardados en el repositorio.
```

```yaml
# .github/workflows/deploy.yml (resumen)
- uses: databricks/setup-cli@main
- run: databricks bundle validate -t prod
- run: databricks bundle deploy -t prod
  env:
    DATABRICKS_HOST: ${{ vars.DATABRICKS_HOST }}
    DATABRICKS_CLIENT_ID: ${{ vars.DATABRICKS_CLIENT_ID }}
    DATABRICKS_AUTH_TYPE: github-oidc
```

El curso de [GitHub](#/m/github) (lecciones 17 y 22) arma este flujo paso a paso.

:::tip Por qué nadie toca producción con clics
Un job creado a mano en prod no tiene historial, no se puede revisar, no se puede reproducir en otro workspace y se pierde si alguien lo borra. Con bundles, producción es el resultado de un archivo en Git: se sabe quién cambió qué, se puede volver atrás y dev y prod son iguales salvo por el target.
:::

:::errores
- **Desplegar a mano en producción.** Sin historial ni revisión; el bundle se despliega desde CI/CD.
- **Confundir validate con deploy.** `validate` revisa la configuración; `deploy` crea o actualiza los recursos.
- **Un archivo distinto por entorno.** Un solo `databricks.yml` con targets dev y prod.
:::

## ✅ Lo que lograste

- Lees un job como código y sabes exportarlo.
- Usas la CLI y entiendes qué es un bundle.
- Conoces el flujo Git → CI/CD → producción.

:::ejercicio quiz
¿Qué comando crea o actualiza en el workspace los recursos de un bundle?
- [ ] databricks bundle validate
- [x] databricks bundle deploy -t <target>
- [ ] databricks jobs list
- [ ] databricks fs cp
:::

:::ejercicio quiz
¿Qué define databricks.yml?
- [ ] El código de los notebooks
- [x] El nombre del bundle y los targets (dev, prod) con el workspace de cada uno
- [ ] Los permisos de Unity Catalog
- [ ] El tamaño del cluster
:::

:::ejercicio quiz
¿Por qué conviene desplegar a producción desde CI/CD y no a mano?
- [ ] Porque es más rápido escribir YAML
- [x] Porque queda historial, revisión y reproducibilidad, y dev y prod salen del mismo código
- [ ] Porque la interfaz no permite crear jobs en prod
- [ ] Porque la interfaz de Databricks no deja editar jobs
:::
