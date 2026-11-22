---
titulo: El repositorio - el proyecto vive en GitHub desde el primer minuto
nivel: Intermedio
duracion: 40
resumen: Antes de mover un solo dato, creas el repositorio pedalia-datos en el GitHub de práctica, con una estructura pensada para que otra persona lo entienda, una rama principal protegida, un workflow de Actions que valida cada cambio y una variable para desplegar el DAG. Así trabajan los equipos de datos de verdad.
objetivos: Crear un repositorio y subirlo desde la terminal | Organizar carpetas para DAGs, SQL, pipelines y documentación | Escribir un workflow de GitHub Actions que valide y despliegue | Proteger la rama principal para que todo cambio pase por un pull request
prerrequisitos: proyecto-pedalia-el-encargo | github-que-es-github
autoevaluacion: ¿Sabes qué va en cada carpeta del repositorio? | ¿Sabes qué hace cada paso de tu ci.yml? | ¿Sabes por qué la ruta de despliegue es una variable y no está escrita en el workflow? | ¿Sabes qué pasa si alguien intenta empujar directo a main?
---

:::escenario Lunes, 11:00
Tu jefa aprobó el plan con un comentario: "Todo en GitHub desde el día uno. La última persona guardaba los scripts en su escritorio y cuando se fue no sabíamos qué corría en producción".
:::

:::analogia El cuaderno compartido del laboratorio
En un laboratorio, cada experimento se anota en un cuaderno con fecha, quién lo hizo y qué cambió. Si algo sale mal, se vuelve a la página anterior. El repositorio es ese cuaderno: cada commit es una entrada firmada, cada pull request es una propuesta que otro revisa antes de que entre al cuaderno oficial.
:::

## 1. La estructura

```text
pedalia-datos/
├── README.md                    qué es, cómo se corre, a quién preguntar
├── docs/
│   └── contrato.md              reglas de los datos (lección siguiente)
├── dags/
│   └── pedalia_diario.py        el DAG de Airflow
├── sql/
│   ├── databricks/              silver y gold
│   ├── snowflake/               tabla y stage de finanzas
│   └── bigquery/                carga de marketing
├── adf/                         pipelines de Data Factory (JSON)
└── .github/workflows/ci.yml     validación y despliegue
```

La regla: **si algo corre en producción, está en el repositorio**. Si está en tu computadora o pegado en la interfaz de una herramienta, para el equipo no existe.

## 2. Crear el repositorio y subirlo

1. Abre el [GitHub de práctica](#/github) y crea un repositorio nuevo llamado **`pedalia-datos`** (botón **New**). Déjalo vacío: sin README ni .gitignore.
2. En la terminal (botón **⌨** abajo a la derecha):

```bash
mkdir -p ~/pedalia-datos/dags ~/pedalia-datos/sql/databricks ~/pedalia-datos/docs ~/pedalia-datos/.github/workflows
cd ~/pedalia-datos
git init -b main
git config user.name "Tu Nombre"
git config user.email "tu@correo.com"
```

3. Crea un README mínimo y el primer DAG de prueba (el definitivo llega en la lección de Airflow):

```bash
cat > README.md << 'EOF'
# pedalia-datos
Pipelines de datos de Pedalia: ingesta de la app, limpieza en Databricks y cargas a Snowflake y BigQuery.
Contacto: equipo de datos.
EOF

cat > dags/pedalia_diario.py << 'EOF'
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.standard.operators.empty import EmptyOperator

with DAG("pedalia_diario", start_date=datetime(2026, 11, 9), schedule="@daily", catchup=False):
    EmptyOperator(task_id="inicio")
EOF

echo "-- silver de viajes (lección 6)" > sql/databricks/silver_viajes.sql
echo "-- gold (lección 7)" > sql/databricks/gold.sql
```

## 3. El workflow de Actions

Este archivo corre **en cada push y en cada pull request**. El job `validar` revisa que el DAG compile y que el SQL esté en su lugar; el job `desplegar` copia el DAG a Airflow, pero **solo** cuando el cambio llega a `main`.

```bash
cat > .github/workflows/ci.yml << 'EOF'
name: ci
on:
  push:
    branches: [main]
  pull_request:

jobs:
  validar:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: El DAG compila
        run: python -c "import ast; ast.parse(open('dags/pedalia_diario.py').read()); print('DAG OK')"
      - name: Está el SQL de cada capa
        run: ls sql/databricks/silver_viajes.sql sql/databricks/gold.sql

  desplegar:
    needs: validar
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Copiar el DAG al Airflow del equipo
        run: |
          mkdir -p "${{ vars.AIRFLOW_DAGS_DIR }}"
          cp dags/*.py "${{ vars.AIRFLOW_DAGS_DIR }}/"
          ls "${{ vars.AIRFLOW_DAGS_DIR }}"
EOF
```

:::nota ¿Por qué la ruta de despliegue es una variable?
En la vida real, "desplegar un DAG" es copiarlo al lugar que lee Airflow: el bucket de Cloud Composer, el de MWAA en AWS o la carpeta del servidor. Esa ruta cambia entre desarrollo y producción, así que **no se escribe en el workflow**: va en una variable del repositorio. En esta práctica, el Airflow de práctica lee la carpeta `/home/alumno/airflow/dags`.
:::

4. En el GitHub de práctica: **Settings → Secrets and variables → Actions → Variables → New repository variable**:
   - Name: `AIRFLOW_DAGS_DIR`
   - Value: `/home/alumno/airflow/dags`

5. Sube todo:

```bash
git add .
git commit -m "Estructura del proyecto, DAG inicial y CI"
git remote add origin https://github.com/alumno/pedalia-datos.git
git push -u origin main
```

6. En la pestaña **Actions** del repositorio vas a ver la corrida: `validar` y después `desplegar`, las dos en verde. Abre [Airflow](#/airflow): el DAG `pedalia_diario` ya aparece en la lista. **Lo desplegó el workflow, no tú.**

## 4. Proteger main

En **Settings → Branches → Add classic branch protection rule**, con el patrón `main`:

- **Require a pull request before merging** (con al menos una aprobación).
- **Require status checks to pass**, con el check `validar`.

Desde ahora nadie empuja directo a `main`: cada cambio va en una rama, con PR, revisión y CI en verde. Pruébalo:

```bash
git checkout -b docs/contacto
echo "Guardia: ver canal #datos-pedalia" >> README.md
git commit -am "Agrega el canal de guardia al README"
git push -u origin docs/contacto
```

Abre el PR en el GitHub de práctica, espera el check verde y fusiónalo con **Merge pull request**.

:::errores
- **Empujar directo a main** "porque es un cambio chico": así entran los errores que nadie revisó. La protección de rama lo impide.
- **Escribir rutas, contraseñas o claves en el workflow**. Las rutas van en variables y las claves en *secrets*, que Actions oculta en los logs con `***`.
- **Un CI que no valida nada**: si el workflow solo imprime "hola", el check verde no significa nada. Lo mínimo es que el código compile y que estén los archivos que se despliegan.
- **Desplegar desde un pull request**: el `if: github.ref == 'refs/heads/main'` evita que una rama a medio hacer llegue a producción.
:::

:::real En tu computadora y en la web real
Todo esto se hace igual en tu computadora y en **github.com**:

1. **Terminal** (Terminal en macOS, Ubuntu/WSL o Git Bash en Windows): `git init`, `git add`, `git commit` y `git push` como en la lección. Antes, una sola vez: `git config --global user.name "Tu Nombre"` y `git config --global user.email tu@correo`.
2. **github.com → botón + → New repository**: lo creas vacío (sin README) y copias los comandos de *…or push an existing repository*.
3. **Settings → Branches → Add branch ruleset** (o *Rules → Rulesets*): proteges `main` pidiendo pull request y que pase el check.
4. **Actions**: el workflow corre solo con cada push. Lo ves en la pestaña *Actions* del repositorio.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio del proyecto y úsalas en el README.

- `02-estructura.png`: el árbol de carpetas del repositorio en github.com (pestaña *Code*).
- `02-actions-verde.png`: la pestaña *Actions* con el workflow en verde.
- `02-regla-main.png`: la regla de protección de `main` (Settings → Rules).

Antes de publicar, tapa con un rectángulo los correos, los IDs de suscripción y de tenant, los nombres de cuentas reales y cualquier clave o token.
:::

## Ejercicios

:::ejercicio quiz
El job `desplegar` tiene `needs: validar`. ¿Qué significa?
- [ ] Que corre al mismo tiempo que `validar`
- [x] Que solo empieza si `validar` terminó bien; si la validación falla, no se despliega nada
- [ ] Que necesita instalar el paquete validar
- [ ] Que corre solo en pull requests
:::

:::ejercicio quiz
Abres un pull request desde una rama. ¿Qué jobs del workflow corren?
- [ ] Ninguno: Actions solo corre en main
- [ ] `validar` y `desplegar`
- [x] Solo `validar`: `desplegar` tiene la condición de que el cambio esté en main
- [ ] Solo `desplegar`
:::

:::ejercicio quiz
¿Por qué la ruta donde se copia el DAG está en una variable del repositorio (`vars.AIRFLOW_DAGS_DIR`)?
- [ ] Porque GitHub no permite escribir rutas en un YAML
- [ ] Porque así el workflow corre más rápido
- [x] Porque cambia entre entornos (desarrollo, producción) y no conviene tocar el código para eso
- [ ] Porque es un secreto que nadie puede ver
:::

## Resumen

- El repositorio es la **única fuente de verdad** de lo que corre en producción.
- El workflow valida **en cada cambio** y despliega **solo desde main**.
- La configuración por entorno va en **variables**; las claves, en **secrets**.
- Con la rama protegida, todo cambio pasa por **PR + revisión + CI en verde**.
