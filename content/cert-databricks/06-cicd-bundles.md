---
titulo: CI/CD - Git folders, Declarative Automation Bundles y la CLI
nivel: Avanzado
duracion: 50
resumen: Trabajar con Git desde el workspace, definir jobs y pipelines como código con Declarative Automation Bundles (antes Databricks Asset Bundles), targets dev y prod, variables, modos development y production, comandos de la CLI, autenticación OAuth de usuario y de service principal, y un pipeline de GitHub Actions con federación de identidad.
objetivos: Usar Git folders para versionar notebooks y código desde el workspace | Escribir un databricks.yml con recursos, variables y targets | Explicar qué cambia entre el modo development y production de un target | Ejecutar el ciclo validate → deploy → run con la CLI | Configurar un despliegue automático desde GitHub Actions sin secretos de larga duración
prerrequisitos: cert-databricks-lakeflow-jobs | databricks-asset-bundles | fundamentos-git
autoevaluacion: ¿Sabes qué permite y qué no permite un Git folder? | ¿Sabes qué hace mode development en un target? | ¿Sabes qué comando muestra los errores del bundle sin desplegar? | ¿Sabes traer a un bundle un job creado desde la interfaz? | ¿Sabes cómo se autentica la CLI en un pipeline de CI?
---

:::escenario
En Rápido, cada ingeniero edita los jobs en la interfaz de producción. La semana pasada alguien cambió el horario de un job "solo para probar" y el reporte de la mañana salió vacío. El nuevo líder técnico decide: **nada se cambia a mano en producción**. Todo vive en Git, se prueba en un entorno de desarrollo y se despliega solo cuando se aprueba un pull request. Las herramientas: **Git folders** para trabajar, **Declarative Automation Bundles** para describir todo como código y la **CLI** para desplegar desde CI.
:::

## Git folders

Un **Git folder** (antes *Repos*) es una carpeta del workspace conectada a un repositorio remoto (GitHub, GitLab, Azure DevOps, Bitbucket). Desde la interfaz puedes clonar, crear y cambiar de rama, ver diferencias, hacer *commit* y *push*, y traer cambios (*pull*).

- Se configura una **credencial de Git** por usuario (token personal o la app de Git del proveedor).
- Guarda notebooks como archivos de código (`.py`, `.sql`) y también archivos comunes (módulos de Python, YAML, tests), que se pueden importar desde los notebooks.
- Para operaciones más complejas (*rebase*, resolver conflictos grandes, *hooks*) conviene la terminal local.

Un Git folder sirve para **desarrollar**; para **desplegar** en producción se usan los bundles desde CI.

## Declarative Automation Bundles

En marzo de 2026, Databricks renombró **Databricks Asset Bundles** a **Declarative Automation Bundles**. La sigla **DAB**, los comandos (`databricks bundle …`) y los archivos de configuración no cambiaron.

Un **bundle** es una carpeta con código (notebooks, archivos `.py` y `.sql`) y un archivo **`databricks.yml`** que describe los **recursos** de Databricks (jobs, pipelines, esquemas, volúmenes, dashboards, apps, endpoints de serving) y los **targets** (entornos) donde se despliegan.

```yaml
bundle:
  name: rapido_pedidos

include:
  - resources/*.yml               # los recursos pueden repartirse en varios archivos

variables:
  catalogo:
    description: Catálogo de destino
    default: dev
  aviso_email:
    default: datos@rapido.pe

resources:
  pipelines:
    pedidos:
      name: pedidos
      catalog: ${var.catalogo}
      schema: rapido
      serverless: true
      libraries:
        - file: { path: ./src/pedidos.sql }

  jobs:
    diario:
      name: rapido_diario
      trigger:
        file_arrival: { url: /Volumes/${var.catalogo}/rapido/aterrizaje/pedidos/ }
      email_notifications:
        on_failure: [ "${var.aviso_email}" ]
      tasks:
        - task_key: ingesta
          pipeline_task: { pipeline_id: "${resources.pipelines.pedidos.id}" }
        - task_key: validar
          depends_on: [ { task_key: ingesta } ]
          notebook_task: { notebook_path: ./src/validar.py }

targets:
  dev:
    mode: development             # recursos con prefijo "[dev usuario]", disparadores en pausa
    default: true
    workspace:
      host: https://adb-1111.11.azuredatabricks.net

  prod:
    mode: production              # validaciones de producción
    workspace:
      host: https://adb-2222.22.azuredatabricks.net
      root_path: /Workspace/Shared/.bundle/${bundle.name}/${bundle.target}
    variables:
      catalogo: prod
    run_as:
      service_principal_name: 6f1e9f3a-0000-4b1c-9d7e-sp-rapido     # el id de aplicación del service principal
    permissions:
      - group_name: equipo-datos
        level: CAN_MANAGE_RUN
```

Las piezas:

- **`variables`**: valores que cambian por entorno; se usan con `${var.nombre}` y se pueden sobrescribir por target o con `--var`.
- **Referencias**: `${resources.pipelines.pedidos.id}` se resuelve al desplegar con el id real del pipeline en ese workspace. `${bundle.target}` es el nombre del target.
- **`targets`**: el mismo código se despliega en `dev` y en `prod` con distinta configuración.
- **`run_as`** y **`permissions`**: con qué identidad corren los recursos y quién puede verlos o ejecutarlos.

### mode development vs. mode production

| | `mode: development` | `mode: production` |
|---|---|---|
| Nombres | Prefija los recursos con `[dev tu_usuario]` | Nombres tal cual |
| Disparadores y horarios | En **pausa** (no corre solo) | Activos |
| Despliegue | En tu carpeta personal; cada desarrollador tiene su copia | En una ruta compartida (`root_path`) |
| Pipelines | En modo desarrollo | Modo producción |
| Validaciones | Pocas | Exige, por ejemplo, que no se desplieguen recursos con la identidad de una persona sin configurarlo explícitamente |

## El ciclo con la CLI

```bash norun
databricks bundle init                        # crea un bundle a partir de una plantilla (default-python, default-sql, dbt-sql…)
databricks bundle validate                    # revisa la sintaxis y resuelve variables; no despliega nada
databricks bundle deploy -t dev               # sube el código y crea o actualiza los recursos del target dev
databricks bundle run -t dev diario           # ejecuta el recurso "diario" (un job o un pipeline)
databricks bundle summary -t prod             # muestra qué recursos tiene desplegados el target
databricks bundle destroy -t dev              # borra los recursos de ese target
databricks bundle generate job --existing-job-id 123456   # genera el YAML de un job creado en la interfaz
databricks bundle deployment bind diario 123456 -t prod    # asocia el recurso del bundle con un job que ya existe
```

`deploy` es **declarativo**: compara el estado del bundle con lo desplegado y crea, modifica o borra recursos para que coincidan. Si borras un job del YAML y despliegas, el job se borra del workspace.

:::examen Comandos que confunden
- **Validar sin desplegar** → `databricks bundle validate`.
- **Pasar a código un job creado a mano** → `databricks bundle generate job --existing-job-id …` (y `deployment bind` para no crear un duplicado).
- **Desplegar a producción** → `databricks bundle deploy -t prod`, idealmente desde CI y no desde una laptop.
:::

```recorrido
titulo: Un cambio, de la rama de Git a producción
estacion git: Git folder | icono=codigo
estacion pr: Pull request | icono=documento
estacion ci: CI | icono=prueba
estacion deploy: bundle deploy | icono=transformar
estacion prod: Producción | icono=check
paso git: Trabajas en una rama desde un Git folder
El Git folder del workspace está conectado al repositorio. Creas una rama, cambias el notebook y haces commit y push desde la interfaz.
>>> texto
rama: feature/nueva-columna
cambio: src/silver_ventas.py
paso pr: Abres un pull request
Otra persona revisa el cambio. Nada llega a producción sin revisión.
>>> texto
PR #42: agregar columna canal_normalizado a silver_ventas
paso ci: CI valida y prueba
GitHub Actions instala la CLI, corre los tests unitarios y `bundle validate` contra el target de staging.
>>> bash
pytest tests/
databricks bundle validate -t staging
paso deploy: Al hacer merge, CI despliega
Con una identidad de servicio (no un usuario), `bundle deploy -t prod` sube el código y actualiza el job en el workspace de producción.
>>> bash
databricks bundle deploy -t prod
paso prod: Producción usa siempre lo que está en Git
En modo `production`, el bundle verifica que la rama de Git coincida con la configurada en el target (si la indicas), y el job corre con la identidad de servicio de `run_as`. Nadie edita a mano en producción.
>>> texto
targets:
  prod:
    mode: production
    run_as:
      service_principal_name: …
```

## Autenticación de la CLI

| Escenario | Método |
|---|---|
| Tú, desde tu computadora | **OAuth de usuario a máquina (U2M)**: `databricks auth login --host <url>`. Abre el navegador, guarda un **perfil** en `~/.databrickscfg` y renueva los tokens solo |
| Un proceso automático con secreto | **OAuth de máquina a máquina (M2M)** con un **service principal**: `DATABRICKS_HOST`, `DATABRICKS_CLIENT_ID`, `DATABRICKS_CLIENT_SECRET` |
| CI/CD sin secretos guardados | **Federación de identidad de cargas de trabajo** (OIDC): GitHub Actions, Azure DevOps y otros obtienen un token de corta duración que Databricks acepta para un service principal |
| Heredado | Tokens personales de acceso (PAT): funcionan, pero se desaconsejan por ser de larga duración |

### GitHub Actions: desplegar al aprobar un PR

```yaml
name: deploy-prod
on:
  push:
    branches: [ main ]
permissions:
  id-token: write          # permite pedir el token OIDC
  contents: read
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: prod
    env:
      DATABRICKS_HOST: https://adb-2222.22.azuredatabricks.net
      DATABRICKS_CLIENT_ID: ${{ vars.SP_CLIENT_ID }}
      DATABRICKS_AUTH_TYPE: github-oidc
    steps:
      - uses: actions/checkout@v4
      - uses: databricks/setup-cli@main
      - run: databricks bundle validate -t prod
      - run: databricks bundle deploy -t prod
```

En los pull requests, otro workflow ejecuta las pruebas unitarias (`pytest`) y `databricks bundle validate`; si se quiere más, despliega a un target de prueba y corre un job de integración.

## Probar el código

- **Pruebas unitarias**: la lógica de transformación vive en funciones (`def limpiar(df): ...`) dentro de módulos, y se prueba con `pytest` y DataFrames chicos. Para comparar resultados, `pyspark.testing.assertDataFrameEqual`.
- **Databricks Connect**: ejecuta código PySpark desde tu IDE local contra cómputo de Databricks (incluido serverless), útil para probar con datos reales sin subir notebooks.
- **Pruebas de integración**: desplegar el bundle en un target de pruebas y ejecutar el job completo con datos de prueba.

:::errores
- **Editar en la interfaz un job desplegado con un bundle.** Síntoma: el siguiente `deploy` borra tus cambios. Corrección: cambiar el YAML.
- **Desplegar a prod desde la laptop.** Síntoma: versiones que nadie revisó en producción. Corrección: solo CI despliega a prod.
- **Tokens personales en secretos de CI.** Síntoma: el pipeline se rompe cuando la persona se va, y el token es una llave de larga duración. Corrección: service principal con OIDC.
- **Olvidar `mode: development` en dev.** Síntoma: el job de desarrollo corre con su horario y compite con producción. Corrección: usar el modo, que pausa los disparadores.
:::

:::trabajo La estructura que verás en las empresas
```text
rapido_pedidos/
├── databricks.yml
├── resources/            ← jobs.yml, pipelines.yml
├── src/                  ← notebooks, .sql y paquete de Python
├── tests/                ← pytest
└── .github/workflows/    ← pr.yml (tests + validate), deploy.yml (deploy a prod)
```
Cada desarrollador despliega su copia con `-t dev`, abre un pull request, CI corre las pruebas y, al aprobarse, despliega a producción con el service principal.
:::

:::entrevista
**"¿Cómo llevas a producción un job que alguien armó a mano en la interfaz?"** Genero su YAML con `databricks bundle generate job --existing-job-id`, lo agrego al bundle, lo vinculo con `bundle deployment bind` para no duplicarlo, reviso que corra como service principal y, desde ese momento, los cambios solo entran por pull request y CI.
:::

## Ejercicios

:::ejercicio quiz
En el target `dev` tienes `mode: development`. Despliegas un job que en el YAML tiene un horario diario. ¿Qué pasa con el horario en dev?
- [ ] Se activa igual que en producción.
- [x] Queda en pausa: el job no corre solo hasta que lo ejecutes.
- [ ] El despliegue falla porque los jobs en dev no pueden tener horario.
- [ ] Se convierte en un disparador continuo.
```explicacion
El modo development pausa horarios y disparadores, y prefija los nombres con `[dev usuario]`, para que las copias de desarrollo no compitan con producción.
```
:::

:::ejercicio quiz
Quieres comprobar que el `databricks.yml` es válido y que las variables se resuelven, **sin crear ni modificar nada** en el workspace. ¿Qué comando usas?
- [x] `databricks bundle validate`
- [ ] `databricks bundle deploy --dry-run`
- [ ] `databricks bundle summary`
- [ ] `databricks bundle run --check`
```explicacion
`validate` revisa la configuración y muestra el resultado resuelto sin desplegar. `summary` muestra lo que ya está desplegado.
```
:::

:::ejercicio quiz
Un job de producción fue creado a mano en la interfaz y ahora quieres administrarlo con el bundle sin crear un duplicado. ¿Qué haces?
- [ ] Copias el JSON del job desde la interfaz y lo pegas como YAML, y despliegas.
- [x] `databricks bundle generate job --existing-job-id <id>` para generar el YAML y `databricks bundle deployment bind` para asociarlo al job existente.
- [ ] Borras el job de la interfaz y despliegas el bundle.
- [ ] Usas un Git folder, que sincroniza los jobs automáticamente.
```explicacion
`generate` crea la definición en código y `bind` asocia el recurso del bundle con el job que ya existe, así el `deploy` lo actualiza en lugar de crear otro.
```
:::

:::ejercicio quiz
¿Cuál es la forma recomendada de autenticar la CLI de Databricks en un pipeline de GitHub Actions?
- [ ] Un token personal de acceso de un administrador guardado como secreto.
- [ ] El usuario y la contraseña de un ingeniero en variables de entorno.
- [x] Federación de identidad (OIDC) con un service principal, sin secretos de larga duración.
- [ ] Copiar el archivo `~/.databrickscfg` de un desarrollador al repositorio.
```explicacion
Con OIDC, GitHub emite un token de corta duración que Databricks acepta para el service principal configurado. No hay credenciales permanentes que puedan filtrarse.
```
:::

:::ejercicio quiz
Borras la definición de un job del `databricks.yml` y ejecutas `databricks bundle deploy -t prod`. ¿Qué pasa con ese job en el workspace de producción?
- [ ] Nada: `deploy` solo crea y actualiza recursos.
- [x] Se borra, porque el despliegue deja el workspace igual que la definición del bundle.
- [ ] Se pausa, pero no se borra.
- [ ] El despliegue falla hasta que lo borres a mano.
```explicacion
El despliegue es declarativo: los recursos que ya no están en el bundle se eliminan del target. Por eso conviene revisar los cambios en el pull request.
```
:::

:::ejercicio cli
Despliega el bundle en el target `prod`.
```respuesta
databricks bundle deploy (-t|--target) prod
```
```solucion
databricks bundle deploy -t prod
```
:::

:::ejercicio cli
Ejecuta en el target `dev` el recurso `diario` del bundle.
```respuesta
databricks bundle run (-t|--target) dev diario
```
```solucion
databricks bundle run -t dev diario
```
:::

:::ejercicio abierto
Agrega a `databricks.yml` un target `staging` que use el workspace `https://adb-3333.33.azuredatabricks.net`, el catálogo `staging` y que corra como el service principal `sp-staging-0001`.
```yaml solucion
targets:
  staging:
    mode: production
    workspace:
      host: https://adb-3333.33.azuredatabricks.net
      root_path: /Workspace/Shared/.bundle/${bundle.name}/${bundle.target}
    variables:
      catalogo: staging
    run_as:
      service_principal_name: sp-staging-0001
```
:::
