---
titulo: Git y GitHub: guarda tu trabajo como un profesional
nivel: Básico
duracion: 40
resumen: Control de versiones, commits, ramas, pull requests y el flujo de trabajo en equipo.
objetivos: Crear un repositorio y registrar cambios con `git add` y `git commit` | Leer el estado y el historial con `git status`, `git diff` y `git log` | Trabajar en una rama y unirla con `merge` | Evitar subir secretos con `.gitignore` | Describir el flujo de un pull request con revisión y pruebas automáticas
prerrequisitos: fundamentos-terminal
autoevaluacion: ¿Puedes crear un repositorio, hacer dos commits y ver el historial? | ¿Sabes para qué sirve el staging y por qué no se hace commit de todo junto? | ¿Puedes crear una rama, hacer un cambio y volver a `main`? | ¿Sabes qué hacer si subiste una contraseña por error? | ¿Puedes explicar qué pasa desde que abres un pull request hasta que el cambio llega a producción?
---

<!-- estandar:escenario -->
:::escenario Tu primer pull request
Martín te asigna tu primera tarea de código:

> "Agrega la consulta de ventas por canal al repositorio del equipo. Hazlo en una rama, abre un pull request y yo lo reviso. Ojo: nada de contraseñas en el código, que el repo lo ve toda la empresa."

En un equipo, nadie edita el código de producción directamente. Todo pasa por **Git**: ramas, commits, revisión y pruebas automáticas. Esta lección te enseña el flujo que vas a usar todos los días.
:::
## ¿Para qué sirve Git?

Imagina que trabajas en un documento y guardas `final.sql`, `final2.sql`, `final_AHORA_SI.sql`… **Git** resuelve eso: guarda un historial de cada cambio, quién lo hizo y por qué, y permite volver atrás o trabajar en paralelo con otras personas sin pisarse.

En un equipo de datos, **todo** el código vive en Git: las consultas SQL, los modelos de dbt, los DAGs de Airflow, los notebooks, la infraestructura. Y casi nunca se sube un cambio a producción sin que otra persona lo revise. Saber Git no es opcional: es lo primero que te piden el primer día de trabajo.

- **Git** es el programa que lleva el historial en tu computadora.
- **GitHub** (o GitLab, Azure DevOps, Bitbucket) es un sitio web donde se guardan los repositorios en la nube para compartirlos y colaborar.

## Conceptos clave

| Concepto | Qué es |
|---|---|
| **Repositorio** (repo) | Una carpeta cuyo historial controla Git |
| **Commit** | Una "foto" de tus cambios con un mensaje que explica qué hiciste |
| **Rama** (*branch*) | Una línea de trabajo paralela. La principal suele llamarse `main` |
| **Merge** | Unir los cambios de una rama en otra |
| **Remote** | La copia del repo en la nube (normalmente se llama `origin`) |
| **Pull request** (PR) | Pedido para que revisen y unan tu rama a `main` |

:::analogia Las tres zonas de Git
1. **Directorio de trabajo**: tu escritorio, donde editas.
2. **Staging** (`git add`): la caja donde pones lo que vas a enviar.
3. **Repositorio** (`git commit`): el archivo histórico, con la caja sellada y etiquetada.
:::

¿Por qué existe el paso intermedio (staging)? Porque muchas veces cambias varios archivos y quieres guardarlos en **commits separados**, cada uno con su explicación: "arregla el filtro de fechas" por un lado y "agrega el modelo de clientes" por otro. Con `git add` eliges qué entra en cada foto.

## Una sesión guiada, paso a paso

Abre la terminal (⌨ Terminal) y sigue esta sesión. Vas a crear un repositorio, hacer commits, trabajar en una rama y unirla. Todo funciona igual que en tu computadora.

**1. Crear el repositorio y presentarte.** Git anota en cada commit quién lo hizo, así que hay que decirle tu nombre y email una sola vez:

```bash norun
mkdir -p ~/mi_pipeline && cd ~/mi_pipeline
git init
git config --global user.name "Ana Datos"
git config --global user.email "ana@ejemplo.com"
```

`git init` crea una carpeta oculta `.git` donde se guarda todo el historial. Si la borras, el historial desaparece (los archivos no).

**2. Crear un archivo y mirar el estado.** `git status` es el comando que más vas a usar: te dice qué cambió y qué está listo para guardar.

```text
$ echo "SELECT canal, COUNT(*) FROM pedidos GROUP BY canal;" > ventas.sql
$ git status
En la rama main

No hay commits todavía

Archivos sin seguimiento:
  (usa "git add <archivo>..." para incluirlo a lo que será confirmado)
	ventas.sql
```

"Sin seguimiento" (*untracked*) significa que Git ve el archivo, pero todavía no lo controla.

**3. Agregar al staging y hacer el commit:**

```text
$ git add ventas.sql
$ git commit -m "Agrega consulta de ventas por canal"
[main (commit-raíz) aad6f3d] Agrega consulta de ventas por canal
 1 archivo(s) cambiado(s)
```

`aad6f3d` es el **identificador** del commit (un *hash*). Cada commit tiene uno distinto, y con él puedes volver a esa versión cuando quieras.

**4. Cambiar el archivo y ver la diferencia:**

```text
$ echo "-- total por canal" >> ventas.sql
$ git diff
diff --git a/ventas.sql b/ventas.sql
+-- total por canal
$ git add ventas.sql && git commit -m "Documenta la consulta"
$ git log --oneline
95826db Documenta la consulta
aad6f3d Agrega consulta de ventas por canal
```

`git diff` muestra qué cambió desde el último commit (las líneas con `+` son nuevas, las con `-`, borradas). `git log --oneline` muestra el historial, del más nuevo al más viejo.

**5. Trabajar en una rama.** Para un cambio nuevo, **nunca** trabajes directo en `main`: crea una rama.

```text
$ git switch -c feature/clientes
Cambiado a nueva rama 'feature/clientes'
$ echo "SELECT pais, COUNT(*) FROM clientes GROUP BY pais;" > clientes.sql
$ git add clientes.sql && git commit -m "Agrega clientes por país"
$ git switch main
$ ls
ventas.sql
```

Al volver a `main`, `clientes.sql` **desaparece**: ese archivo existe solo en la rama `feature/clientes`. Así, si tu cambio no está listo, `main` sigue funcionando.

**6. Unir la rama:**

```text
$ git merge feature/clientes
$ ls
clientes.sql  ventas.sql
```

En un equipo, este paso no lo haces tú en la terminal: lo hace GitHub cuando aprueban tu **pull request**.

**7. Deshacer un cambio que todavía no guardaste:**

```text
$ echo "basura" >> ventas.sql
$ git restore ventas.sql
$ cat ventas.sql
SELECT canal, COUNT(*) FROM pedidos GROUP BY canal;
-- total por canal
```

`git restore` vuelve el archivo a como estaba en el último commit. Es el "deshacer" más usado.

**8. No subir secretos: `.gitignore`.** Un archivo `.gitignore` lista lo que Git debe ignorar:

```text
$ echo "PASSWORD=1234" > .env
$ echo ".env" > .gitignore
$ git status
Archivos sin seguimiento:
	.gitignore
```

`.env` ya no aparece: Git lo ignora y nunca va a terminar en GitHub. Lo mismo se hace con carpetas de datos, entornos virtuales (`.venv/`) y archivos generados (`target/` en dbt, `__pycache__/` en Python).

## El ciclo diario en un equipo

```bash norun
git clone https://github.com/empresa/pipelines.git   # 1. descargar el repo (una sola vez)
cd pipelines
git switch -c feature/nuevo-modelo                   # 2. crear una rama para tu cambio
# ... editas archivos ...
git status                                           # 3. ver qué cambió
git add modelos/ventas.sql                           # 4. elegir qué cambios guardar
git commit -m "Agrega modelo de ventas diarias"      # 5. guardar la foto
git push -u origin feature/nuevo-modelo              # 6. subir la rama a GitHub
# 7. en GitHub abres un Pull Request, alguien lo revisa y se hace merge
git switch main && git pull                          # 8. actualizar tu main
```

Qué pasa en el paso 7, el **pull request**:

1. En GitHub abres el PR: "quiero unir `feature/nuevo-modelo` a `main`", con una descripción de qué cambia y por qué.
2. Se ejecuta la **integración continua** (CI): pruebas automáticas, por ejemplo `dbt build` contra datos de prueba o `pytest`. Si fallan, el PR queda en rojo.
3. Una compañera **revisa** el código y deja comentarios ("este filtro excluye los devueltos, ¿es a propósito?"). Respondes o corriges con nuevos commits en la misma rama.
4. Cuando está aprobado y en verde, se hace **merge** y el cambio llega a `main`. Muchas veces eso dispara el despliegue automático a producción.

<!-- dg:f04-pr -->
```diagrama
titulo: El camino de un cambio: de tu rama a producción
nodo rama: Tu rama | icono=git | col=0 | fila=0 | sub=feature/nuevo-modelo
nodo pr: Pull request | icono=codigo | col=1 | fila=0 | color=azul | sub=descripción del cambio
nodo ci: CI automática | icono=engranaje | col=2 | fila=0 | color=amarillo | sub=pytest · dbt build
nodo rev: Revisión | icono=equipo | col=2 | fila=1 | color=violeta | sub=una compañera aprueba
nodo main: main | icono=git | col=1 | fila=1 | color=verde | sub=siempre funciona
nodo prod: Producción | icono=nube | col=0 | fila=1 | color=naranja | sub=despliegue automático
flecha rama -> pr: git push
flecha pr -> ci: ejecuta
flecha ci -> rev: en verde
flecha rev -> main: merge
flecha main -> prod: deploy
flecha rev -> rama: pide cambios | estilo=punteada | color=rojo
```

## Buenas prácticas

- Commits **pequeños y frecuentes**, con mensajes claros en imperativo: "Agrega test de unicidad", no "cambios" ni "arreglo".
- **Nunca** subas contraseñas ni llaves. Usa un archivo `.gitignore` para excluir archivos como `.env`. Si se te escapó una, cámbiala de inmediato: borrar el archivo no la saca del historial.
- Trabaja siempre en una rama; `main` debe estar siempre funcionando.
- Haz `git pull` antes de empezar a trabajar, para partir de la última versión.
- En equipos de datos, los PR se revisan y además corren **CI** (pruebas automáticas, por ejemplo `dbt build`).

<!-- estandar:errores -->
:::errores
- **Trabajar directo en `main`**: si tu cambio rompe algo, rompe lo de todos. Crea una rama para cada cambio.
- **Commits gigantes con mensaje "cambios"**: nadie puede revisarlos ni entender después qué pasó. Un commit = un cambio con sentido, con un mensaje que explique qué y por qué.
- **Subir un secreto**: borrar el archivo en el siguiente commit **no** lo saca del historial. Cambia la contraseña de inmediato y avisa.
- **Olvidar `git pull` antes de empezar**: trabajas sobre una versión vieja y después aparecen conflictos al unir.
- **Conflictos de merge**: aparecen cuando dos personas cambiaron las mismas líneas. Git marca el archivo con `<<<<<<<` y `>>>>>>>`; tienes que elegir qué queda, borrar las marcas y hacer commit.
:::

<!-- estandar:trabajo -->
:::trabajo
- La revisión de código (*code review*) es donde más se aprende en los primeros meses. Lee los comentarios como consejos, no como críticas, y revisa también el código de otros: es la forma más rápida de aprender cómo trabaja el equipo.
- En equipos de datos, el CI de un pull request suele ejecutar los tests de dbt, `pytest` de las transformaciones de Python y un chequeo de estilo de SQL (por ejemplo, con sqlfluff).
- Las herramientas de datos modernas se despliegan desde Git: dbt Cloud, Databricks Asset Bundles y Airflow leen el código de la rama `main`. Lo que no está en Git, no existe.
:::

## Ejercicios

:::ejercicio cli
Descarga (clona) el repositorio `https://github.com/empresa/pipelines.git`.
```respuesta
git clone https://github\.com/empresa/pipelines(\.git)?
```
```solucion
git clone https://github.com/empresa/pipelines.git
```
:::

:::ejercicio cli
Mira qué archivos cambiaron y cuáles están preparados para el commit.
```respuesta
git status
git status -s
```
```setup
git init
```
:::

:::ejercicio cli
Agrega **todos** los cambios de la carpeta actual al área de staging.
```respuesta
git add \.
git add -A
git add --all
```
```solucion
git add .
```
```setup
git init
echo "# práctica $(date)" > limpiar_clientes.py
```
:::

:::ejercicio cli
Haz un commit con el mensaje `Agrega limpieza de clientes`.
```respuesta
git commit -m ["']Agrega limpieza de clientes["']
```
```solucion
git commit -m "Agrega limpieza de clientes"
```
```setup
git init
echo "# práctica $(date)" > limpiar_clientes.py
git add .
```
:::

:::ejercicio cli
Crea una rama nueva llamada `feature/airflow-dag` y cámbiate a ella en un solo comando.
```respuesta
git switch -c feature/airflow-dag
git checkout -b feature/airflow-dag
```
```setup
git init
```
:::

:::ejercicio quiz
¿Qué archivo usas para que Git **ignore** tu archivo `.env` con contraseñas?

- [ ] README.md
- [x] .gitignore
- [ ] .env.example
- [ ] git.config
:::
