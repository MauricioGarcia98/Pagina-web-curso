---
titulo: "Docker: bases de datos y servicios sin instalarlos"
nivel: Intermedio
duracion: 70
resumen: Qué es un contenedor y por qué todo el mundo los usa en datos. Instala Docker, corre tu primer contenedor, levanta PostgreSQL con variables, puertos y volúmenes, empaqueta un pipeline de Python en una imagen propia con un Dockerfile y describe varios servicios juntos con Docker Compose.
objetivos: Explicar la diferencia entre imagen, contenedor, volumen y puerto publicado | Instalar Docker Desktop (Windows con WSL, macOS) o Docker Engine (Linux) y comprobar que funciona | Levantar, inspeccionar, detener y borrar contenedores con docker run, ps, logs, exec, stop y rm | Escribir un Dockerfile para un pipeline de Python y construir la imagen | Describir varios servicios con Docker Compose y conservar los datos con volúmenes
prerrequisitos: local-preparar-la-computadora
autoevaluacion: ¿Sabes qué es una imagen y qué es un contenedor? | ¿Sabes qué significa -p 5432:5432 y -e POSTGRES_PASSWORD=…? | ¿Sabes por qué se pierden los datos al borrar un contenedor sin volumen? | ¿Puedes escribir un Dockerfile de un script de Python? | ¿Sabes levantar y bajar un docker-compose.yml?
---

:::escenario Instalar PostgreSQL… o no
Para el proyecto necesitas PostgreSQL, y tu compañera además usa Airflow y MinIO (un S3 local). Instalar cada cosa en tu sistema lleva horas, cada versión choca con otra y desinstalarlas deja basura. Ella te dice:

> "No instales nada de eso. Levántalo con Docker: un comando y tienes Postgres 16; otro y lo borras sin rastro. Y el compose del repo levanta todo el stack igual que en mi máquina."
:::

## Qué es un contenedor

Un **contenedor** es un proceso aislado que trae **todo lo que necesita para correr**: el programa, sus librerías y su configuración. Corre igual en tu laptop, en la de tu compañera y en el servidor.

| Concepto | Qué es | Analogía |
|---|---|---|
| **Imagen** | La plantilla de solo lectura: sistema base + programa + configuración (`postgres:16`) | La receta |
| **Contenedor** | Una ejecución de una imagen, con su propio estado | El plato preparado |
| **Registro** (Docker Hub) | Donde se publican y descargan las imágenes | El libro de recetas |
| **Puerto publicado** (`-p 5432:5432`) | Conecta un puerto de tu máquina con uno del contenedor | La ventanilla para pedir |
| **Volumen** (`-v datos:/var/lib/…`) | Una carpeta que vive fuera del contenedor y sobrevive a borrarlo | La heladera donde guardas lo que sobró |

```diagrama
titulo: Tu máquina, Docker y los contenedores
nodo hub: Docker Hub | icono=nube | col=0 | fila=0 | color=gris | sub=postgres, python,\napache/airflow…
nodo img: Imágenes locales | icono=capas | col=1 | fila=0 | color=azul | sub=docker pull / build
nodo pg: contenedor pg | icono=base | col=2 | fila=0 | color=cian | sub=postgres:16\npuerto 5432
nodo vol: volumen pgdata | icono=almacen | col=3 | fila=0 | color=amarillo | sub=los datos sobreviven
nodo tu: Tu terminal y VS Code | icono=equipo | col=2 | fila=1 | color=verde | sub=psql -h localhost -p 5432
flecha hub -> img: pull
flecha img -> pg: run
flecha pg -> vol
flecha tu -> pg: localhost:5432
```

¿Y una máquina virtual? Una VM trae un sistema operativo completo (minutos para arrancar, GB de memoria); un contenedor comparte el núcleo del sistema y arranca en segundos.

## Instalar Docker

| Sistema | Cómo |
|---|---|
| **Windows** | Docker Desktop (`winget install -e --id Docker.DockerDesktop`). En Settings → General, activa "Use the WSL 2 based engine"; en Resources → WSL Integration, activa tu Ubuntu. Desde Ubuntu, `docker` ya funciona |
| **macOS** | `brew install --cask docker` y abre Docker Desktop una vez (pide permisos). Elige la versión de Apple Silicon si tienes M1–M4 |
| **Linux** | Docker Engine: `sudo apt install docker.io docker-compose-v2`, luego `sudo usermod -aG docker $USER` y cierra sesión (para usar `docker` sin `sudo`) |

Comprueba:

```bash norun
docker --version
docker compose version
docker run hello-world
```

`hello-world` descarga una imagen mínima, crea un contenedor que imprime un mensaje y termina. Si ves "Hello from Docker!", todo funciona.

## PostgreSQL en un contenedor

```bash norun
docker run -d --name pg \
  -e POSTGRES_PASSWORD=secreto \
  -e POSTGRES_DB=rapido \
  -p 5432:5432 \
  -v pgdata:/var/lib/postgresql/data \
  postgres:16
```

| Parte | Qué hace |
|---|---|
| `-d` | En segundo plano (*detached*): te devuelve la terminal |
| `--name pg` | Un nombre para referirte al contenedor (si no, Docker inventa uno) |
| `-e POSTGRES_PASSWORD=…` | Variable de entorno: la imagen de Postgres **exige** una contraseña |
| `-e POSTGRES_DB=rapido` | Crea esa base al iniciar |
| `-p 5432:5432` | Puerto de tu máquina : puerto del contenedor |
| `-v pgdata:/var/lib/postgresql/data` | Guarda los datos en el volumen `pgdata` |
| `postgres:16` | La imagen y su versión (*tag*). Siempre fija la versión; `latest` cambia sin aviso |

Para mirarlo y manejarlo:

```bash norun
docker ps                    # contenedores corriendo
docker ps -a                 # también los detenidos
docker logs pg               # lo que imprimió (aquí: "database system is ready to accept connections")
docker exec -it pg psql -U postgres -d rapido     # una consola SQL dentro del contenedor
docker stop pg               # lo detiene (los datos quedan)
docker start pg              # lo vuelve a arrancar
docker rm -f pg              # lo borra (si no había volumen, los datos se van con él)
```

:::cuidado Sin volumen, los datos viven en el contenedor
Si creas el contenedor **sin** `-v` y después lo borras con `docker rm`, se borra la base. Con un volumen con nombre (`pgdata`), puedes borrar el contenedor, crear otro con el mismo `-v pgdata:…` y los datos siguen ahí. Pruébalo en la terminal del curso: crea una tabla, borra el contenedor, créalo de nuevo con y sin volumen.
:::

## Tu propia imagen: un Dockerfile

Para que tu pipeline corra igual en todos lados, se empaqueta en una imagen. El **Dockerfile** es la receta:

```dockerfile
# Dockerfile
FROM python:3.12-slim

WORKDIR /app

# primero las dependencias (se cachean si no cambian)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# después el código
COPY . .

CMD ["python", "pipeline.py"]
```

| Instrucción | Qué hace |
|---|---|
| `FROM` | La imagen base (`python:3.12-slim`: Python sobre un Debian mínimo) |
| `WORKDIR` | La carpeta de trabajo dentro de la imagen |
| `COPY origen destino` | Copia archivos de tu proyecto a la imagen |
| `RUN` | Ejecuta un comando al **construir** (instalar dependencias) |
| `CMD` | El comando que se ejecuta al **correr** el contenedor |

```bash norun
docker build -t rapido-pipeline .       # construye la imagen con el Dockerfile de esta carpeta
docker images                           # aparece rapido-pipeline:latest
docker run --rm --env-file .env rapido-pipeline   # la corre; --rm la borra al terminar
```

:::tip El orden importa: la caché de capas
Cada instrucción es una **capa**. Si copias `requirements.txt` e instalas **antes** de copiar el código, cambiar una línea de código no reinstala todas las dependencias: Docker reutiliza las capas que no cambiaron, y el build pasa de minutos a segundos. Agrega un `.dockerignore` con `.venv`, `.git` y `data/` para no copiarlos a la imagen.
:::

## Docker Compose: varios servicios juntos

Con varios servicios, en lugar de largos `docker run`, se describen en un archivo `compose.yaml` (o `docker-compose.yml`):

```yaml
# compose.yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: rapido
      POSTGRES_PASSWORD: rapido
      POSTGRES_DB: operaciones
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  pgadmin:
    image: dpage/pgadmin4
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@rapido.com
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "8081:80"
    depends_on:
      - db

volumes:
  pgdata:
```

```bash norun
docker compose up -d          # crea la red, los volúmenes y los contenedores, en orden (depends_on)
docker compose ps             # el estado de cada servicio
docker compose logs db        # los logs de un servicio
docker compose exec db psql -U rapido -d operaciones
docker compose down           # borra contenedores y red (los volúmenes quedan)
docker compose down -v        # …y también los volúmenes: empezar de cero
```

Dentro de la red de Compose, cada servicio se llama por su **nombre**: pgAdmin se conecta a Postgres con host `db`, no `localhost`. Desde tu máquina, por el puerto publicado: `localhost:5432`.

<!-- estandar:errores -->
:::errores
- **`Cannot connect to the Docker daemon`**: Docker Desktop no está abierto (Windows/macOS) o el servicio no está corriendo (Linux: `sudo systemctl start docker`).
- **`port is already allocated`**: otro contenedor (o un Postgres instalado en tu sistema) ya usa ese puerto. Detén el otro o publica en otro puerto: `-p 5433:5432`.
- **El contenedor de Postgres se cierra apenas arranca**: faltó `POSTGRES_PASSWORD`. Mira `docker logs`.
- **`permission denied while trying to connect to the Docker daemon socket`** (Linux): falta agregar tu usuario al grupo `docker` y volver a iniciar sesión.
- **Desde otro contenedor, `localhost` no encuentra la base**: dentro de Docker, `localhost` es el propio contenedor. Usa el nombre del servicio (`db`).
- **El disco se llena**: imágenes y contenedores viejos. `docker system prune` limpia lo que no se usa.
:::

<!-- estandar:trabajo -->
:::trabajo
- Casi todo pipeline en producción corre en un contenedor: un job de Airflow con KubernetesPodOperator, un Cloud Run job, un task de ECS, un job de Databricks con una imagen propia. El Dockerfile es parte del código del pipeline.
- Los repositorios de los equipos traen un `compose.yaml` para levantar el entorno local completo (base, MinIO como S3, Airflow) con un comando: así un nuevo integrante trabaja el primer día.
- Las imágenes se construyen en la CI, se etiquetan con el commit (`rapido-pipeline:3f2a1c9`) y se publican en un registro privado (ECR, Artifact Registry, ACR). Nunca se usa `latest` en producción.
:::

## Ejercicios

:::ejercicio quiz
Corres `docker run -d --name pg -p 5432:5432 postgres:16` y `docker ps` no muestra el contenedor. `docker logs pg` dice "superuser password is not specified". ¿Qué falta?

- [ ] El volumen
- [x] La variable `-e POSTGRES_PASSWORD=…`
- [ ] Publicar otro puerto
- [ ] Ejecutar como administrador
:::

:::ejercicio quiz
En `-p 5433:5432`, ¿qué puerto usas desde tu computadora para conectarte?

- [x] 5433
- [ ] 5432
- [ ] Los dos
- [ ] Ninguno: hay que usar docker exec
:::

:::ejercicio quiz
¿Por qué en el Dockerfile se copia `requirements.txt` e instala **antes** de `COPY . .`?

- [ ] Porque si no, el build falla
- [x] Para que Docker reutilice la capa de las dependencias cuando solo cambia el código, y el build sea rápido
- [ ] Para que la imagen pese menos
- [ ] Porque `COPY . .` no copia el requirements.txt
:::

:::ejercicio cli
Levanta en segundo plano un contenedor llamado `pg` con la imagen `postgres:16`, contraseña `secreto` (variable `POSTGRES_PASSWORD`) y el puerto 5432 publicado.
```respuesta
docker run -d --name pg -e POSTGRES_PASSWORD=secreto -p 5432:5432 postgres:16
docker run -d --name pg -p 5432:5432 -e POSTGRES_PASSWORD=secreto postgres:16
docker run --name pg -d -e POSTGRES_PASSWORD=secreto -p 5432:5432 postgres:16
docker run --name pg -e POSTGRES_PASSWORD=secreto -p 5432:5432 -d postgres:16
docker run -d -e POSTGRES_PASSWORD=secreto -p 5432:5432 --name pg postgres:16
docker run -d --name pg -e POSTGRES_PASSWORD=secreto -p 5432:5432 postgres:16.\d+
```
```solucion
docker run -d --name pg -e POSTGRES_PASSWORD=secreto -p 5432:5432 postgres:16
```
:::

:::ejercicio cli
Hay un contenedor `etl` que se detuvo con error. Muestra **todos** los contenedores, incluidos los detenidos.
```respuesta
docker ps -a
docker ps --all
docker container ls -a
```
```setup
docker run -d --name etl postgres:16
```
:::

:::ejercicio cli
El contenedor `pg` ya está corriendo. Mira sus logs para confirmar que la base está lista.
```respuesta
docker logs pg
docker container logs pg
```
```setup
docker run -d --name pg -e POSTGRES_PASSWORD=secreto -p 5432:5432 postgres:16
```
:::

:::ejercicio cli
En `~/rapido-app` hay un `Dockerfile`. Construye la imagen con el nombre `rapido-pipeline`.
```respuesta
docker build -t rapido-pipeline \.
docker build --tag rapido-pipeline \.
docker build -t rapido-pipeline:latest \.
docker build \. -t rapido-pipeline
```
```solucion
docker build -t rapido-pipeline .
```
```setup
mkdir -p ~/rapido-app
cd ~/rapido-app
printf 'pandas==2.2.3\n' > requirements.txt
printf 'print("pipeline ok")\n' > pipeline.py
printf 'FROM python:3.12-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY . .\nCMD ["python", "pipeline.py"]\n' > Dockerfile
```
:::

:::ejercicio cli
En `~/stack` hay un `compose.yaml` con Postgres y pgAdmin. Levanta todos los servicios en segundo plano.
```respuesta
docker compose up -d
docker compose up --detach
docker-compose up -d
```
```setup
mkdir -p ~/stack
cd ~/stack
printf 'services:\n  db:\n    image: postgres:16\n    environment:\n      POSTGRES_USER: rapido\n      POSTGRES_PASSWORD: rapido\n      POSTGRES_DB: operaciones\n    ports:\n      - "5432:5432"\n    volumes:\n      - pgdata:/var/lib/postgresql/data\n  pgadmin:\n    image: dpage/pgadmin4\n    ports:\n      - "8081:80"\n    depends_on:\n      - db\nvolumes:\n  pgdata:\n' > compose.yaml
```
:::
