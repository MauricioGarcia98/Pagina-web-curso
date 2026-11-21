---
titulo: Un stack de datos con Compose que arranca en orden y no pierde datos
nivel: Avanzado
duracion: 60
resumen: Un entorno local de datos suele tener varias piezas - una base PostgreSQL, un almacenamiento compatible con S3, un orquestador y tu pipeline. Con Docker Compose las describes en un archivo y las levantas con un comando. Aprendes cómo se conectan entre sí por nombre de servicio (y por qué localhost no funciona adentro), cómo los volúmenes evitan perder la base al recrear un contenedor, y cómo los healthchecks hacen que cada servicio espere a que el anterior esté realmente listo.
objetivos: Describir un stack de varios servicios en un compose.yaml | Conectar servicios por nombre en la red interna en lugar de localhost | Persistir datos con volúmenes y distinguirlos de los bind mounts | Ordenar el arranque con depends_on y healthchecks | Detectar los errores más comunes de un archivo de Compose
prerrequisitos: docker-dockerfile-de-produccion
autoevaluacion: ¿Por qué el pipeline no se conecta a localhost:5432 si Postgres corre en otro servicio? | ¿Qué pasa con los datos de Postgres si haces docker compose down sin volúmenes? | ¿Qué diferencia hay entre depends_on solo y depends_on con condition service_healthy? | ¿Qué significa "5433:5432" en ports?
---

:::analogia En palabras simples
Compose es el plano de una oficina: dice qué escritorios hay (servicios), cómo se llaman (para que se hablen por nombre), qué armarios con llave tiene cada uno (volúmenes) y quién no puede empezar a trabajar hasta que el otro abrió (dependencias). Con un `docker compose up`, la oficina se arma entera.
:::

## Un stack de datos local

```yaml norun
services:
  db:
    image: postgres:17
    environment:
      POSTGRES_USER: tienda
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
      POSTGRES_DB: tienda
    volumes:
      - datos_db:/var/lib/postgresql/data
    ports:
      - "5433:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U tienda -d tienda"]
      interval: 5s
      retries: 10
    secrets: [db_password]

  pipeline:
    build: .
    environment:
      DB_HOST: db
      DB_PORT: "5432"
    depends_on:
      db:
        condition: service_healthy

volumes:
  datos_db:

secrets:
  db_password:
    file: ./secretos/db_password.txt
```

| Pieza | Qué hace |
|---|---|
| `services` | Cada contenedor del stack, con su imagen o su `build` |
| `DB_HOST: db` | Dentro de la red de Compose, cada servicio se encuentra **por su nombre** |
| `volumes: datos_db:/var/lib/...` | Los datos de la base viven en un volumen con nombre, fuera del contenedor |
| `ports: "5433:5432"` | El puerto 5432 del contenedor se publica en el **5433 de tu computadora** (para conectarte desde DBeaver o psql) |
| `healthcheck` | Cómo saber si la base ya acepta conexiones |
| `depends_on ... service_healthy` | El pipeline arranca recién cuando la base pasa el healthcheck |
| `secrets` | La contraseña llega como archivo montado, no como variable visible en `docker inspect` |

## localhost no es lo que parece

Dentro de un contenedor, `localhost` es **ese mismo contenedor**. Si el pipeline usa `DB_HOST=localhost`, busca una base dentro de su propio contenedor y no la encuentra. Entre servicios se usa el nombre del servicio (`db`) y el puerto **interno** (5432); el puerto publicado (5433) es solo para conectarte desde tu computadora ([redes en Compose](https://docs.docker.com/compose/how-tos/networking/)).

## Volúmenes y bind mounts

| | Volumen con nombre | Bind mount |
|---|---|---|
| Ejemplo | `datos_db:/var/lib/postgresql/data` | `./src:/app/src` |
| Lo administra | Docker | Tú (una carpeta de tu computadora) |
| Ideal para | Datos de bases y servicios | Código que editas y quieres ver al instante |
| Se borra con | `docker compose down -v` | Nunca lo borra Docker |

:::cuidado La base sin volumen
Si Postgres no tiene un volumen, sus datos viven en la capa escribible del contenedor. Un `docker compose down` (o recrear el contenedor al cambiar la imagen) **borra todo**. Y `down -v` borra también los volúmenes: úsalo solo cuando quieres empezar de cero a propósito ([volúmenes](https://docs.docker.com/engine/storage/volumes/)).
:::

## Arrancar en orden

`depends_on: [db]` solo garantiza que el contenedor `db` **se inició**, no que Postgres ya acepte conexiones (tarda unos segundos en estar listo). Con `condition: service_healthy`, Compose espera a que el healthcheck pase. Aun así, tu programa debería reintentar la conexión unas veces: en producción no hay Compose que espere por ti ([orden de arranque](https://docs.docker.com/compose/how-tos/startup-order/)).

:::practica python Calcular el orden de arranque de un stack
1. Ejecuta: a partir de las dependencias de cada servicio, la función calcula en qué orden arrancan (un ordenamiento topológico).
2. Agrega un servicio `tablero` que dependa de `pipeline` y vuelve a ejecutar.
3. Crea un ciclo (`db` depende de `pipeline`) y mira el error.

```python
def orden_arranque(dependencias):
    pendientes = {s: set(d) for s, d in dependencias.items()}
    orden = []
    while pendientes:
        listos = sorted(s for s, d in pendientes.items() if not d)
        if not listos:
            raise ValueError(f"Hay un ciclo entre: {sorted(pendientes)}")
        for s in listos:
            orden.append(s)
            del pendientes[s]
        for d in pendientes.values():
            d.difference_update(listos)
    return orden

stack = {
    "db": [],
    "minio": [],
    "airflow": ["db"],
    "pipeline": ["db", "minio"],
}
print(orden_arranque(stack))
```

Reto: devuelve también las "olas" de arranque (los servicios que pueden arrancar en paralelo en cada paso).

Documentación oficial: [Referencia de servicios de Compose](https://docs.docker.com/reference/compose-file/services/) · [Redes](https://docs.docker.com/compose/how-tos/networking/) · [Orden de arranque](https://docs.docker.com/compose/how-tos/startup-order/) · [Volúmenes](https://docs.docker.com/engine/storage/volumes/)
:::

:::errores
- **`localhost` entre servicios.** Usa el nombre del servicio.
- **Bases sin volumen.** Un `down` y los datos desaparecen.
- **`depends_on` sin healthcheck.** El servicio arranca antes de que la base esté lista.
- **Dos servicios publicando el mismo puerto de tu computadora.** El segundo no arranca.
- **Contraseñas escritas en el compose.yaml que se sube al repositorio.** Usa `secrets` o un `.env` que esté en `.gitignore`.
:::

:::entrevista
**Pregunta:** "Tu pipeline en Compose falla al arrancar con 'connection refused', pero si lo reinicias a mano funciona. ¿Qué pasa?"

**Respuesta modelo:** "El pipeline arranca antes de que Postgres esté listo para aceptar conexiones: `depends_on` sin condición solo espera a que el contenedor exista. Agregaría un healthcheck con `pg_isready` a la base y `condition: service_healthy` en el pipeline. Y además pondría reintentos con espera en la conexión del pipeline, porque en producción la base también puede reiniciarse."
:::

## Ejercicios

:::ejercicio quiz
En Compose, el pipeline necesita conectarse a la base del servicio `db`, que publica `"5433:5432"`. ¿Qué host y puerto usa el pipeline?
- [ ] `localhost:5433`
- [ ] `localhost:5432`
- [x] `db:5432`
- [ ] `db:5433`
:::

:::ejercicio python dificultad=Avanzado titulo="El orden de arranque"
Escribe `orden_arranque(dependencias)` donde `dependencias` es un diccionario `{servicio: [servicios de los que depende]}`. Devuelve la lista de servicios en orden de arranque: un servicio va después de todos los suyos; entre los que pueden arrancar en el mismo paso, en orden alfabético. Si hay un ciclo, lanza `ValueError`. Si un servicio depende de uno que no está en el diccionario, también lanza `ValueError`.
```python inicial
def orden_arranque(dependencias):
    pass
```
```python solucion
def orden_arranque(dependencias):
    for s, deps in dependencias.items():
        for d in deps:
            if d not in dependencias:
                raise ValueError(f"{s} depende de {d}, que no existe")
    pendientes = {s: set(d) for s, d in dependencias.items()}
    orden = []
    while pendientes:
        listos = sorted(s for s, d in pendientes.items() if not d)
        if not listos:
            raise ValueError(f"Hay un ciclo entre: {sorted(pendientes)}")
        for s in listos:
            orden.append(s)
            del pendientes[s]
        for d in pendientes.values():
            d.difference_update(listos)
    return orden
```
```pista
En cada paso, los servicios "listos" son los que ya no tienen dependencias pendientes. Agrégalos ordenados y quítalos de las dependencias de los demás.
```
```pista
Si quedan servicios pendientes pero ninguno está listo, hay un ciclo.
```
```python test
assert orden_arranque({"db": [], "minio": [], "airflow": ["db"], "pipeline": ["db", "minio"]}) == ["db", "minio", "airflow", "pipeline"]
assert orden_arranque({"c": ["b"], "b": ["a"], "a": []}) == ["a", "b", "c"]
assert orden_arranque({}) == []
for malo in ({"a": ["b"], "b": ["a"]}, {"a": ["x"]}):
    try:
        orden_arranque(malo)
    except ValueError:
        pass
    else:
        raise AssertionError(f"{malo} debería lanzar ValueError")
```
:::

:::ejercicio python dificultad=Experto titulo="Revisar un archivo de Compose"
Escribe `revisar_compose(compose)`, que recibe el contenido de un compose.yaml ya leído como diccionario (con la clave `"services"`), y devuelve la lista ordenada alfabéticamente de los problemas, cada uno como texto `"CODIGO:servicio"`:
- `"DB_SIN_VOLUMEN:<servicio>"`: la imagen empieza con `postgres`, `mysql`, `mariadb` o `mongo` y el servicio no tiene `volumes`.
- `"PUERTO_REPETIDO:<servicio>"`: el servicio publica un puerto de la computadora (la parte antes de `:` en `"5433:5432"`) que ya publicó un servicio anterior (en el orden del diccionario).
- `"LOCALHOST:<servicio>"`: algún valor de `environment` (un diccionario) contiene `localhost` o `127.0.0.1`.
- `"DEPENDENCIA_INEXISTENTE:<servicio>"`: `depends_on` (una lista o un diccionario) nombra un servicio que no existe.
```python inicial
def revisar_compose(compose):
    pass
```
```python solucion
def revisar_compose(compose):
    servicios = compose.get("services", {})
    problemas, puertos = [], set()
    for nombre, s in servicios.items():
        imagen = s.get("image", "")
        if imagen.startswith(("postgres", "mysql", "mariadb", "mongo")) and not s.get("volumes"):
            problemas.append(f"DB_SIN_VOLUMEN:{nombre}")
        for p in s.get("ports", []):
            host = str(p).split(":")[0]
            if host in puertos:
                problemas.append(f"PUERTO_REPETIDO:{nombre}")
            puertos.add(host)
        for v in (s.get("environment") or {}).values():
            if "localhost" in str(v) or "127.0.0.1" in str(v):
                problemas.append(f"LOCALHOST:{nombre}")
                break
        for d in s.get("depends_on", []):
            if d not in servicios:
                problemas.append(f"DEPENDENCIA_INEXISTENTE:{nombre}")
                break
    return sorted(set(problemas))
```
```pista
Recorre los servicios en orden guardando un conjunto con los puertos de la computadora ya usados. Iterar un diccionario de `depends_on` recorre sus claves, igual que una lista.
```
```python test
bueno = {"services": {
    "db": {"image": "postgres:17", "volumes": ["datos:/var/lib/postgresql/data"], "ports": ["5433:5432"]},
    "pipeline": {"build": ".", "environment": {"DB_HOST": "db"}, "depends_on": {"db": {"condition": "service_healthy"}}}}}
assert revisar_compose(bueno) == [], f"Obtuviste {revisar_compose(bueno)}"
malo = {"services": {
    "db": {"image": "postgres:17", "ports": ["5432:5432"]},
    "db2": {"image": "mongo:8", "volumes": ["m:/data/db"], "ports": ["5432:27017"]},
    "pipeline": {"environment": {"DB_URL": "postgresql://localhost:5432/tienda"}, "depends_on": ["db", "cola"]}}}
assert revisar_compose(malo) == ["DB_SIN_VOLUMEN:db", "DEPENDENCIA_INEXISTENTE:pipeline", "LOCALHOST:pipeline", "PUERTO_REPETIDO:db2"], f"Obtuviste {revisar_compose(malo)}"
assert revisar_compose({"services": {}}) == []
```
:::
