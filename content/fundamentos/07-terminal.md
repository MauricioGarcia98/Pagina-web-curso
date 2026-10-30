---
titulo: La terminal sin miedo
nivel: Básico
duracion: 40
resumen: Qué es la línea de comandos y los 15 comandos que vas a usar siempre.
objetivos: Moverte entre carpetas usando rutas absolutas y relativas | Crear, copiar, mover y borrar archivos y carpetas desde la terminal | Inspeccionar un archivo de datos con `head`, `wc`, `grep`, `cut`, `sort` y `uniq` | Encadenar comandos con tuberías y guardar resultados con redirecciones | Usar variables de entorno y guardar la salida de un comando en una variable
prerrequisitos: fundamentos-datos-y-formatos
autoevaluacion: ¿Sabes en qué carpeta estás y cómo volver a tu carpeta personal? | ¿Puedes contar las filas de un CSV sin contar el encabezado? | ¿Puedes contar los pedidos por canal solo con comandos de terminal? | ¿Puedes buscar los errores de un log y ver en qué línea están? | ¿Sabes la diferencia entre `>` y `>>`? | ¿Sabes por qué `rm -rf` es peligroso?
---

<!-- estandar:escenario -->
:::escenario El pipeline falló anoche
Son las 8:30 de la mañana y Martín, tu líder, te escribe:

> "El dashboard de ventas no se actualizó. El log del pipeline está en `logs/pipeline.log` del servidor. ¿Puedes ver qué falló? Y de paso fíjate si el archivo de ventas de diciembre llegó completo."

El servidor no tiene ventanas ni mouse: solo una terminal. En esta lección aprendes a moverte, mirar archivos y encontrar lo que buscas escribiendo comandos, que es lo que hace un data engineer cuando algo se rompe.
:::
La **terminal** (o consola, o línea de comandos) es una ventana donde le das órdenes a la computadora escribiendo, en vez de hacer clics. Parece antigua, pero los ingenieros de datos la usan todo el día: para Git, para las CLIs de Azure, AWS, Google Cloud y Databricks, para dbt, para Airflow…

¿Por qué escribir si se puede hacer clic? Por tres razones:

1. **Los servidores no tienen pantalla.** Las máquinas de la nube donde corren tus pipelines no tienen ventanas ni mouse: solo terminal.
2. **Se puede repetir y automatizar.** Un comando se copia, se guarda en un script y lo ejecuta un pipeline a las 3 de la mañana. Diez clics no.
3. **Es más rápido** para muchas tareas: "¿cuántas líneas tiene este archivo de 2 GB?" es un comando de una línea, mientras que Excel ni siquiera lo abre.

:::nota ¿Dónde está la terminal?
- **Windows**: instala *Windows Terminal* y usa **WSL** (Ubuntu dentro de Windows) o *Git Bash*. PowerShell también sirve, pero algunos comandos cambian.
- **macOS**: aplicación *Terminal* (o iTerm2).
- **Linux**: ya la tienes (Ctrl + Alt + T).

En este curso usamos comandos de **bash**, el estándar en servidores y en la nube. Y no necesitas instalar nada todavía: el botón **⌨ Terminal** abre una terminal Linux simulada dentro del navegador.
:::

## Anatomía de un comando

```bash norun
ls -l --all /home/ana
```

- `ls` → el **programa** (listar archivos).
- `-l` → una **opción corta** (formato largo). Las cortas llevan un guion y una letra, y se pueden juntar: `-la` es lo mismo que `-l -a`.
- `--all` → una **opción larga** (mostrar ocultos). Llevan dos guiones y una palabra.
- `/home/ana` → un **argumento** (sobre qué carpeta).

El símbolo `$` que verás al inicio de las líneas solo indica "escribe aquí"; **no** se escribe.

Las mayúsculas importan: `ls` funciona y `LS` no. Y los espacios separan las partes: para un archivo con espacios en el nombre, usa comillas (`cat "mis ventas.csv"`).

## Dónde estás: rutas

Los archivos se organizan en un árbol de **carpetas** (directorios). En la terminal siempre estás "parado" en una carpeta, que se llama **directorio de trabajo**. En la terminal del curso, la carpeta inicial es `/home/alumno`:

```text
/                          ← la raíz: todo cuelga de aquí
└── home/
    └── alumno/            ← tu carpeta personal (también se escribe ~)
        ├── README.md
        ├── datos/
        │   ├── clientes.csv
        │   └── ventas_2024_12.csv
        ├── logs/
        │   └── pipeline.log
        ├── dags/          ← DAGs de Airflow
        ├── scripts/
        └── tienda_dbt/    ← un proyecto dbt
```

Hay dos formas de nombrar un archivo:

- **Ruta absoluta**: empieza con `/` y describe el camino completo desde la raíz: `/home/alumno/datos/clientes.csv`. Funciona estés donde estés.
- **Ruta relativa**: empieza desde donde estás. Si estás en `/home/alumno`, la misma ruta es `datos/clientes.csv`.

Y tres atajos que vas a usar siempre:

| Atajo | Significa |
|---|---|
| `.` | La carpeta actual |
| `..` | La carpeta de arriba (la "madre") |
| `~` | Tu carpeta personal (`/home/alumno`) |

## Moverse por las carpetas

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `pwd` | Muestra en qué carpeta estás (*print working directory*) | `pwd` → `/home/alumno` |
| `ls` | Lista el contenido | `ls -la` |
| `cd` | Cambia de carpeta | `cd proyectos`, `cd ..` (subir), `cd ~` (inicio) |
| `mkdir` | Crea una carpeta | `mkdir -p datos/crudos` |
| `touch` | Crea un archivo vacío | `touch notas.txt` |
| `cp` | Copia | `cp ventas.csv respaldo.csv` |
| `mv` | Mueve o renombra | `mv viejo.csv nuevo.csv` |
| `rm` | Borra (¡sin papelera!) | `rm archivo.csv`, `rm -r carpeta` |
| `find` | Busca archivos por nombre | `find . -name "*.csv"` |

`mkdir -p datos/crudos` crea `datos` y adentro `crudos`, aunque `datos` no exista todavía, y no se queja si ya existen. Por eso `-p` aparece en todos los scripts.

:::cuidado rm no perdona
`rm -rf` borra todo sin preguntar y sin papelera de reciclaje. Revisa dos veces antes de presionar Enter.
:::

## Mirar archivos

| Comando | Qué hace |
|---|---|
| `cat archivo` | Muestra todo el archivo |
| `head -n 5 archivo` | Las primeras 5 líneas |
| `tail -n 5 archivo` | Las últimas 5 líneas (`tail -f` sigue un log en vivo) |
| `tail -n +2 archivo` | Desde la línea 2 hasta el final (saltar el encabezado de un CSV) |
| `wc -l archivo` | Cuenta líneas |
| `less archivo` | Navega un archivo grande (salir con `q`) |
| `grep texto archivo` | Busca líneas que contienen un texto |
| `cut -d, -f3 archivo` | Se queda con la columna 3, separando por comas |
| `sort` / `uniq -c` | Ordena / cuenta líneas repetidas seguidas |

Opciones de `grep` que vas a usar mucho: `-i` (ignora mayúsculas), `-c` (cuenta en vez de mostrar), `-v` (las líneas que **no** coinciden) y `-n` (muestra el número de línea).

## Tuberías (pipes) y redirección

La barra vertical `|` envía la salida de un comando como entrada del siguiente. Es la idea central de un *pipeline*, ¡en miniatura! Cada comando hace **una sola cosa** y se encadenan como piezas de Lego.

```bash norun
# ¿Cuántas líneas de clientes.csv mencionan "Chile"?
grep "Chile" datos/clientes.csv | wc -l

# Guardar el resultado en un archivo (> sobrescribe, >> agrega al final)
grep "Chile" datos/clientes.csv > clientes_chile.csv
```

| Símbolo | Qué hace |
|---|---|
| `a \| b` | La salida de `a` es la entrada de `b` |
| `a > archivo` | Guarda la salida en el archivo (lo **reemplaza**) |
| `a >> archivo` | Agrega la salida al final del archivo |
| `a && b` | Ejecuta `b` solo si `a` funcionó |

```recorrido
titulo: Una tubería: cada comando le pasa su salida al siguiente
estacion cat: cat | icono=archivo
estacion grep: grep | icono=lupa
estacion pipe: | wc -l | icono=flujo
estacion redir: > archivo | icono=capas
estacion ls: Verificar | icono=check
paso cat: cat muestra el archivo entero
Un CSV chico de ventas. `cat` (de *concatenate*) imprime su contenido en la pantalla.
>>> log
$ cat ventas.csv
fecha,canal,total
2024-12-30,web,99.5
2024-12-30,app,120
2024-12-31,web,45
2024-12-31,tienda,80
2024-12-31,web,15.25
paso grep: grep se queda con las líneas que contienen un texto
`grep web ventas.csv` imprime solo las líneas donde aparece "web".
>>> log
$ grep web ventas.csv
2024-12-30,web,99.5
2024-12-31,web,45
2024-12-31,web,15.25
paso pipe: La barra | conecta dos comandos
La salida de `grep` no va a la pantalla: entra como entrada de `wc -l`, que **cuenta líneas**. Cada comando hace una cosa; la tubería los combina.
>>> log
$ grep web ventas.csv | wc -l
3
paso redir: > guarda la salida en un archivo
En lugar de mostrar el resultado, `>` lo escribe en un archivo (si existe, lo **reemplaza**; `>>` agrega al final).
>>> log
$ grep web ventas.csv > solo_web.csv
paso ls: Comprobar que se creó
`ls` lista la carpeta: el archivo nuevo está ahí.
>>> log
$ ls
README.md  dags/  datos/  logs/  scripts/  solo_web.csv  tienda_dbt/  ventas.csv
```

## Una sesión real, paso a paso

Abre la terminal (⌨ Terminal) y haz esta sesión. Es exactamente lo que hace un ingeniero de datos cuando recibe un archivo nuevo: **mirarlo antes de procesarlo**.

**1. ¿Dónde estoy y qué hay?**

```text
$ pwd
/home/alumno
$ ls datos
clientes.csv  ventas_2024_12.csv
```

**2. ¿Qué columnas tiene el archivo de ventas?** Las primeras líneas de un CSV dicen mucho:

```text
$ head -n 3 datos/ventas_2024_12.csv
pedido_id,fecha,cliente_id,canal,estado,total
11407,2024-12-01,562,app,entregado,359.97
11408,2024-12-01,1744,tienda,entregado,63.96
```

**3. ¿Cuántas filas tiene?**

```text
$ wc -l datos/ventas_2024_12.csv
 595 datos/ventas_2024_12.csv
```

Son 595 líneas: 1 de encabezado + **594 pedidos**.

**4. ¿Cuántos pedidos hay por canal?** Aquí se ve la potencia de las tuberías. Se lee de izquierda a derecha:

```text
$ cut -d, -f4 datos/ventas_2024_12.csv | tail -n +2 | sort | uniq -c | sort -rn
    258 web
    152 app
    136 tienda
     48 telefono
```

- `cut -d, -f4` → de cada línea, solo la columna 4 (`canal`).
- `tail -n +2` → salta la primera línea (el encabezado).
- `sort` → ordena, para que los iguales queden juntos (`uniq` solo cuenta repetidos **seguidos**).
- `uniq -c` → cuenta cuántas veces aparece cada valor.
- `sort -rn` → ordena por ese número (`-n`), de mayor a menor (`-r`).

Es un `SELECT canal, COUNT(*) ... GROUP BY canal ORDER BY 2 DESC` hecho con comandos de terminal.

**5. ¿Hubo errores en el pipeline de anoche?**

```text
$ grep -n ERROR logs/pipeline.log
36:2025-01-01 02:21:00 ERROR [cargar_silver] MERGE falló: duplicate key pedido_id=8812
42:2025-01-01 02:41:10 ERROR [dbt_build] Compilation Error in model fct_ventas: ref("stg_pagos_v2") not found
```

Dos errores, con su número de línea y la tarea que falló. Esto es lo primero que haces cuando te avisan "el dashboard no se actualizó".

## Variables de entorno

Son valores con nombre que el sistema guarda y que cualquier programa puede leer. Se usan muchísimo para **configuraciones** (en qué entorno estoy) y **secretos** (una contraseña que no debe quedar escrita en el código).

```bash norun
export AMBIENTE=desarrollo
echo $AMBIENTE        # imprime: desarrollo
echo $HOME            # tu carpeta personal: /home/alumno
```

- `export NOMBRE=valor` crea la variable (sin espacios alrededor del `=`).
- `$NOMBRE` la lee.
- Duran mientras la terminal está abierta. Para que queden siempre, se agregan al archivo `~/.bashrc`.

También se puede guardar en una variable **el resultado de un comando** con `$( ... )`. Lo vas a usar mucho con las CLIs de la nube:

```bash norun
TOTAL=$(wc -l < datos/ventas_2024_12.csv)
echo "El archivo tiene $TOTAL líneas"
```

:::tip Truco de supervivencia
- <kbd>Tab</kbd> autocompleta nombres de archivos y comandos. Escribe `cat da` + Tab y se completa `datos/`.
- <kbd>↑</kbd> recupera el comando anterior.
- <kbd>Ctrl</kbd> + <kbd>C</kbd> cancela lo que se está ejecutando.
- <kbd>Ctrl</kbd> + <kbd>L</kbd> (o `clear`) limpia la pantalla.
- `comando --help` o `man comando` muestran la ayuda.
:::

## Practica

Cada ejercicio trae su propia **terminal**: escribe el comando y presiona Enter. Se ejecuta de verdad sobre una máquina simulada (la misma del **Laboratorio → Terminal**), que ya tiene archivos en las carpetas `datos/` y `logs/`. Puedes explorar con `ls` antes de responder.

<!-- estandar:errores -->
:::errores
- **"No existe el archivo o el directorio"**: casi siempre estás en otra carpeta. Ejecuta `pwd` y `ls` para ver dónde estás, o usa la ruta completa.
- **Espacios en los nombres**: `cat mis ventas.csv` busca dos archivos (`mis` y `ventas.csv`). Usa comillas: `cat "mis ventas.csv"`, o mejor, no uses espacios en nombres de archivos.
- **`>` en lugar de `>>`**: `>` **reemplaza** el contenido del archivo. Si querías agregar líneas al final, perdiste lo que había.
- **`uniq -c` sin `sort` antes**: `uniq` solo junta repetidos que están **seguidos**. Sin ordenar, cuenta mal.
- **Contar el encabezado**: `wc -l` en un CSV incluye la línea de títulos. Resta 1 o usa `tail -n +2`.
:::

<!-- estandar:trabajo -->
:::trabajo
- Cuando un pipeline falla, lo primero es **leer el log**: `tail -n 50` para ver el final, `grep -n ERROR` para encontrar el error y su línea. Es una habilidad que se usa todas las semanas.
- Antes de procesar un archivo grande, se inspecciona con `head`, `wc -l` y `cut | sort | uniq -c`. En segundos sabes si el archivo llegó completo y si tiene valores raros, sin cargarlo en ninguna herramienta.
- Los comandos que repites se guardan en un **script** (`.sh`) dentro del repositorio, para que cualquiera del equipo los pueda ejecutar igual.
:::

<!-- estandar:entrevista -->
:::entrevista "¿Cómo verías las 10 IPs que más aparecen en un archivo de log enorme?"
Con una tubería: `cut -d' ' -f1 acceso.log | sort | uniq -c | sort -rn | head -10`. Explica cada paso: extraer la columna, ordenar para juntar los iguales, contar, ordenar por cantidad de mayor a menor y quedarse con 10. Mencionar que funciona con archivos de gigabytes sin cargarlos en memoria suma puntos.
:::

:::ejercicio cli
¿Con qué comando ves **en qué carpeta estás**?
```respuesta
pwd
```
```salida
/home/ana/proyectos
```
:::

:::ejercicio cli
Crea una carpeta llamada `reportes`.
```respuesta
mkdir reportes
mkdir -p reportes
```
:::

:::ejercicio cli
Muestra las **primeras 10 líneas** del archivo `datos/ventas_2024_12.csv`.
```respuesta
head (\./)?datos/ventas_2024_12\.csv
head -n ?10 (\./)?datos/ventas_2024_12\.csv
head -10 (\./)?datos/ventas_2024_12\.csv
```
```solucion
head -n 10 datos/ventas_2024_12.csv
```
```pista
El comando es `head`. Por defecto ya muestra 10 líneas, pero también puedes usar `-n 10`.
```
:::

:::ejercicio cli
Cuenta cuántas líneas tiene `datos/clientes.csv`.
```respuesta
wc -l (\./)?datos/clientes\.csv
wc -l < (\./)?datos/clientes\.csv
cat (\./)?datos/clientes\.csv \| wc -l
```
```solucion
wc -l datos/clientes.csv
```
```pista
`wc` significa *word count*; con la opción `-l` cuenta líneas.
```
:::

:::ejercicio cli
Busca las líneas que contienen la palabra `ERROR` en el archivo `logs/pipeline.log` y **cuéntalas**, usando una tubería.
```respuesta
grep ['"]?ERROR['"]? (\./)?logs/pipeline\.log \| wc -l
cat (\./)?logs/pipeline\.log \| grep ['"]?ERROR['"]? \| wc -l
```
```solucion
grep "ERROR" logs/pipeline.log | wc -l
```
```pista
Primero `grep` filtra las líneas, luego `|` las pasa a `wc -l`.
```
:::

:::ejercicio cli
Sube a la carpeta **padre** de la actual.
```respuesta
cd \.\.
cd \.\./
```
```solucion
cd ..
```
:::
