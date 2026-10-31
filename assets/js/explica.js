/* Academia de Datos — la terminal como espacio para aprender.
 *  - explicar(línea): separa un comando en tuberías, redirecciones, comando, subcomando, opciones y argumentos,
 *    y explica cada parte en lenguaje simple.
 *  - panel(): el recuadro "¿Qué hizo tu último comando?" que se actualiza con cada comando.
 *  - chuleta(alUsar): los comandos del día a día, por tema, con ejemplos que se pegan en la terminal. */
(function () {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // ------------------------------------------------------------------ diccionario
  // que: qué hace · op: opciones frecuentes · sub: subcomandos (git, docker…) · arg: qué suelen ser los argumentos
  const D = {
    pwd: { que: 'muestra la ruta completa de la carpeta donde estás (<i>print working directory</i>).' },
    ls: { que: 'lista los archivos y carpetas.', arg: 'la carpeta a listar (si no pones nada, la actual)', op: { '-l': 'formato largo: permisos, dueño, tamaño y fecha', '-a': 'incluye los ocultos (los que empiezan con punto)', '-h': 'tamaños legibles (K, M, G) en lugar de bytes', '-t': 'ordena por fecha de modificación, lo más nuevo primero', '-r': 'invierte el orden', '-R': 'entra también en las subcarpetas', '-1': 'un nombre por línea' } },
    cd: { que: 'cambia de carpeta.', arg: 'la carpeta destino: <code>..</code> sube un nivel, <code>~</code> es tu carpeta personal, <code>-</code> vuelve a la anterior' },
    mkdir: { que: 'crea carpetas.', arg: 'el nombre de la carpeta', op: { '-p': 'crea también las carpetas intermedias que falten y no da error si ya existe' } },
    touch: { que: 'crea un archivo vacío (o actualiza su fecha si ya existe).', arg: 'el nombre del archivo' },
    cat: { que: 'muestra el contenido completo de uno o varios archivos (y los une, de ahí el nombre: <i>concatenate</i>).', arg: 'los archivos a mostrar', op: { '-n': 'numera las líneas' } },
    head: { que: 'muestra las primeras líneas de un archivo (10 por defecto).', arg: 'el archivo', op: { '-n': 'cuántas líneas mostrar (por ejemplo <code>-n 5</code>)' } },
    tail: { que: 'muestra las últimas líneas de un archivo (10 por defecto).', arg: 'el archivo', op: { '-n': 'cuántas líneas mostrar', '-f': 'sigue mostrando las líneas nuevas a medida que se escriben (ideal para logs)' } },
    less: { que: 'abre un archivo para leerlo de a una pantalla (q para salir).', arg: 'el archivo' },
    more: { que: 'muestra un archivo de a una pantalla.', arg: 'el archivo' },
    wc: { que: 'cuenta líneas, palabras y caracteres (<i>word count</i>).', arg: 'el archivo (o lo que llega por la tubería)', op: { '-l': 'solo cuenta líneas', '-w': 'solo cuenta palabras', '-c': 'solo cuenta bytes' } },
    cp: { que: 'copia archivos o carpetas.', arg: 'primero el origen, después el destino', op: { '-r': 'copia carpetas con todo su contenido', '-i': 'pregunta antes de pisar un archivo' } },
    mv: { que: 'mueve o renombra archivos y carpetas.', arg: 'primero el origen, después el destino (o el nombre nuevo)', op: { '-i': 'pregunta antes de pisar un archivo' } },
    rm: { que: 'borra archivos. <b>No hay papelera</b>: lo borrado no se recupera.', arg: 'lo que se borra', op: { '-r': 'borra carpetas con todo su contenido', '-f': 'no pregunta ni avisa si algo no existe', '-i': 'pregunta antes de borrar cada archivo' } },
    tree: { que: 'dibuja el árbol de carpetas y archivos.', arg: 'la carpeta (por defecto, la actual)', op: { '-L': 'cuántos niveles mostrar' } },
    find: { que: 'busca archivos y carpetas por nombre, tipo, tamaño o fecha.', arg: 'dónde empezar a buscar (<code>.</code> es la carpeta actual)', op: { '-name': 'por nombre; acepta comodines entre comillas, como <code>"*.csv"</code>', '-type': '<code>f</code> solo archivos, <code>d</code> solo carpetas', '-size': 'por tamaño, como <code>+1M</code>', '-mtime': 'por días desde la última modificación' } },
    echo: { que: 'imprime un texto. Muy usado con <code>&gt;</code> para escribir archivos.', arg: 'el texto (entre comillas si tiene espacios)', op: { '-n': 'sin salto de línea al final', '-e': 'interpreta <code>\\n</code> y <code>\\t</code>' } },
    printf: { que: 'imprime texto con formato (como echo, pero con más control).', arg: 'el formato y los valores' },
    grep: { que: 'muestra solo las líneas que contienen un texto o patrón.', arg: 'primero lo que buscas, después el archivo (o lo que llega por la tubería)', op: { '-i': 'sin distinguir mayúsculas de minúsculas', '-v': 'al revés: las líneas que <b>no</b> contienen el texto', '-c': 'cuenta las líneas que coinciden en vez de mostrarlas', '-n': 'muestra el número de línea', '-r': 'busca en todos los archivos de una carpeta', '-E': 'patrones extendidos (por ejemplo <code>ERROR|WARN</code>)', '-o': 'muestra solo la parte que coincide', '-l': 'muestra solo los nombres de archivo con coincidencias' } },
    sed: { que: 'edita texto línea por línea; lo más común es reemplazar.', arg: 'la orden (como <code>s/viejo/nuevo/g</code>) y el archivo', op: { '-i': 'modifica el archivo en lugar de mostrar el resultado', '-n': 'no imprime nada salvo lo que pidas' } },
    sort: { que: 'ordena líneas.', arg: 'el archivo (o lo que llega por la tubería)', op: { '-n': 'orden numérico (10 después de 9)', '-r': 'de mayor a menor', '-u': 'quita repetidas', '-t': 'el separador de columnas', '-k': 'por qué columna ordenar' } },
    uniq: { que: 'junta líneas repetidas <b>seguidas</b> (por eso casi siempre va después de <code>sort</code>).', op: { '-c': 'antepone cuántas veces aparece cada una', '-d': 'solo las repetidas' } },
    cut: { que: 'recorta columnas de cada línea.', arg: 'el archivo', op: { '-d': 'el separador (en un CSV, <code>-d,</code>)', '-f': 'qué columnas (por ejemplo <code>-f2</code> o <code>-f1,3</code>)', '-c': 'qué caracteres' } },
    tr: { que: 'reemplaza o borra caracteres.', arg: 'los caracteres de origen y de destino', op: { '-d': 'borra los caracteres indicados', '-s': 'junta repetidos en uno' } },
    diff: { que: 'muestra las diferencias entre dos archivos.', arg: 'los dos archivos', op: { '-u': 'formato unificado (el que usa Git)' } },
    jq: { que: 'consulta y da formato a JSON.', arg: 'el filtro (como <code>.items[0].name</code>) y el archivo' , op: { '-r': 'imprime textos sin comillas' } },
    clear: { que: 'limpia la pantalla (también con Ctrl+L).' },
    history: { que: 'muestra los comandos que escribiste. <code>!!</code> repite el último y Ctrl+R busca.' },
    which: { que: 'dice dónde está instalado un programa.', arg: 'el nombre del programa' },
    type: { que: 'dice qué es un nombre: un programa, un alias o un comando interno.' },
    export: { que: 'crea una variable de entorno, que verán los programas que ejecutes después en esta sesión.', arg: '<code>NOMBRE=valor</code>' },
    env: { que: 'lista las variables de entorno de la sesión.' },
    source: { que: 'ejecuta un archivo dentro de la sesión actual (así se activa un entorno virtual).', arg: 'el archivo, por ejemplo <code>.venv/bin/activate</code>' },
    deactivate: { que: 'sale del entorno virtual de Python.' },
    chmod: { que: 'cambia los permisos de un archivo.', arg: 'los permisos (como <code>+x</code>, para poder ejecutarlo) y el archivo' },
    alias: { que: 'crea un atajo: un nombre corto para un comando largo.', arg: '<code>nombre=\'comando\'</code>' },
    unalias: { que: 'borra un atajo creado con alias.' },
    whoami: { que: 'muestra tu nombre de usuario.' },
    date: { que: 'muestra la fecha y la hora. Con un formato que empieza con <code>+</code> elige cómo: <code>date +%F</code> da <code>2024-12-31</code>.', arg: 'el formato: <code>%Y</code> año, <code>%m</code> mes, <code>%d</code> día, <code>%H:%M</code> hora y minuto, <code>%F</code> = AAAA-MM-DD, <code>%s</code> segundos desde 1970', op: { '-d': 'otra fecha en vez de hoy: <code>-d "2024-01-31 +1 day"</code>, <code>-d yesterday</code>', '-u': 'en hora UTC', '-I': 'formato ISO (AAAA-MM-DD)' } },
    curl: { que: 'hace una petición a una URL (descargar un archivo, llamar a una API).', arg: 'la URL', op: { '-o': 'guarda la respuesta en un archivo', '-s': 'sin barra de progreso', '-H': 'agrega un encabezado (como un token)', '-X': 'el método HTTP (GET, POST…)', '-d': 'los datos que se envían' } },
    code: { que: 'abre un archivo en el editor.', arg: 'el archivo' },
    make: { que: 'ejecuta una tarea definida en el <code>Makefile</code> del proyecto.', arg: 'el nombre de la tarea' },
    python: { que: 'ejecuta Python: sin argumentos abre la consola; con un archivo, ejecuta ese script.', arg: 'el script <code>.py</code>', op: { '-m': 'ejecuta un módulo (por ejemplo <code>python -m venv .venv</code>)', '-c': 'ejecuta el código que escribes entre comillas', '--version': 'muestra la versión' } },
    python3: { que: 'igual que <code>python</code>.' },
    pip: { que: 'instala paquetes de Python.', sub: { install: 'instala paquetes', list: 'lista lo instalado', freeze: 'lista lo instalado con versiones exactas (para <code>requirements.txt</code>)', uninstall: 'desinstala' }, op: { '-r': 'instala todo lo que dice un archivo, como <code>requirements.txt</code>' } },
    uv: { que: 'administra proyectos y paquetes de Python (rápido, moderno).', sub: { init: 'crea un proyecto nuevo', add: 'agrega una dependencia', run: 'ejecuta un comando dentro del entorno del proyecto', sync: 'instala exactamente lo del archivo de bloqueo', venv: 'crea un entorno virtual' } },
    pytest: { que: 'ejecuta los tests de Python (los archivos <code>test_*.py</code>).', op: { '-q': 'salida resumida', '-v': 'detalle de cada test', '-k': 'solo los tests cuyo nombre contiene un texto', '-x': 'se detiene en la primera falla' } },
    sqlite3: { que: 'abre una base SQLite para escribir consultas (<code>.tables</code> lista tablas, <code>.quit</code> sale).', arg: 'el archivo de la base' },
    duckdb: { que: 'abre DuckDB, una base para análisis que lee CSV y Parquet directamente.', arg: 'el archivo de la base (opcional)' },
    psql: { que: 'cliente de PostgreSQL: conecta a una base y ejecuta consultas.', op: { '-U': 'el usuario', '-h': 'el servidor', '-d': 'la base de datos', '-c': 'ejecuta una consulta y sale' } },
    git: { que: 'control de versiones: guarda la historia de los cambios de un proyecto.', sub: { init: 'crea un repositorio en la carpeta actual', status: 'muestra qué cambió y qué está preparado para el commit', add: 'prepara cambios para el próximo commit (<code>.</code> es todo)', commit: 'guarda una "foto" de los cambios preparados, con un mensaje', log: 'muestra la historia de commits', diff: 'muestra las diferencias todavía no preparadas', switch: 'cambia de rama (<code>-c</code> la crea)', checkout: 'cambia de rama o restaura archivos (forma vieja de switch)', branch: 'lista, crea o borra ramas', merge: 'une otra rama a la actual', pull: 'trae y une los cambios del remoto', push: 'sube tus commits al remoto', clone: 'copia un repositorio remoto', remote: 'administra los remotos (como <code>origin</code>)', restore: 'descarta cambios de un archivo', stash: 'guarda cambios a un costado por un rato', reset: 'mueve la rama o saca archivos del área de preparación' }, op: { '-m': 'el mensaje del commit', '-c': 'crea la rama nueva', '-b': 'crea la rama nueva (con checkout)', '-u': 'recuerda el remoto para los próximos push', '--oneline': 'una línea por commit', '-a': 'incluye todos los archivos modificados', '-s': 'formato corto' } },
    gh: { que: 'la CLI de GitHub: pull requests, issues y repos desde la terminal.' },
    docker: { que: 'contenedores: programas empaquetados con todo lo que necesitan.', arg: 'la imagen (<code>nombre:versión</code>) o el contenedor', sub: { run: 'crea y arranca un contenedor desde una imagen', ps: 'lista los contenedores en ejecución', images: 'lista las imágenes descargadas', pull: 'descarga una imagen', build: 'construye una imagen desde un Dockerfile', stop: 'detiene un contenedor', start: 'arranca un contenedor detenido', rm: 'borra un contenedor', logs: 'muestra lo que escribió un contenedor', exec: 'ejecuta un comando dentro de un contenedor', compose: 'levanta varios contenedores definidos en un archivo' }, op: { '-d': 'en segundo plano', '--name': 'el nombre del contenedor', '-p': 'publica un puerto: <code>local:contenedor</code>', '-e': 'una variable de entorno', '-v': 'monta una carpeta o volumen', '-a': 'incluye también los detenidos', '-it': 'interactivo, con terminal', '-t': 'el nombre de la imagen al construir', '-f': 'sigue mostrando los logs nuevos' } },
    dbt: { que: 'transforma datos con modelos SQL versionados.', sub: { init: 'crea un proyecto', debug: 'prueba la configuración y la conexión', run: 'construye los modelos', test: 'ejecuta los tests', build: 'run + test + seeds + snapshots, en el orden del DAG', seed: 'carga los CSV de <code>seeds/</code> como tablas', snapshot: 'guarda el historial de cambios (SCD2)', compile: 'muestra el SQL compilado sin ejecutarlo', ls: 'lista los recursos del proyecto', docs: 'genera la documentación' }, op: { '-s': 'selecciona qué modelos (<code>--select</code>)', '--select': 'selecciona qué modelos', '--full-refresh': 'reconstruye los incrementales desde cero', '-t': 'el target (dev, prod)' } },
    airflow: { que: 'orquestador: programa y ejecuta DAGs.', sub: { dags: 'comandos sobre DAGs (list, test, trigger, pause…)', tasks: 'comandos sobre tareas (list, test…)', db: 'la base de metadatos de Airflow', standalone: 'levanta Airflow completo para probar en tu computadora' } },
    az: { que: 'la CLI de Azure.', sub: { login: 'inicia sesión', account: 'suscripciones (list, show, set)', group: 'grupos de recursos', storage: 'cuentas de almacenamiento y archivos', keyvault: 'secretos', role: 'permisos (RBAC)', deployment: 'despliegues de Bicep', databricks: 'workspaces de Databricks' }, op: { '-g': 'el grupo de recursos (<code>--resource-group</code>)', '-n': 'el nombre (<code>--name</code>)', '-l': 'la región (<code>--location</code>)', '-o': 'el formato de salida: json, table, tsv', '--query': 'filtra la salida con JMESPath' } },
    aws: { que: 'la CLI de AWS.', sub: { s3: 'archivos en S3 (ls, cp, mb, sync…)', s3api: 'la API de S3 de bajo nivel', sts: 'identidad (<code>get-caller-identity</code>: ¿quién soy?)', iam: 'usuarios, roles y políticas', glue: 'catálogo, crawlers y jobs', athena: 'consultas SQL sobre S3', kinesis: 'streams', lambda: 'funciones', configure: 'configura credenciales y región', sso: 'inicio de sesión con SSO' }, op: { '--profile': 'qué perfil de credenciales usar', '--region': 'la región', '--output': 'el formato: json, table, text', '--query': 'filtra la salida con JMESPath', '--recursive': 'incluye todo lo que hay debajo' } },
    gcloud: { que: 'la CLI de Google Cloud.', sub: { auth: 'inicio de sesión', config: 'proyecto y región por defecto', storage: 'buckets y archivos', projects: 'proyectos', pubsub: 'topics y suscripciones', dataproc: 'Spark administrado', composer: 'Airflow administrado' }, op: { '--project': 'el proyecto', '--region': 'la región', '--format': 'cómo mostrar la salida (json, table, value)', '--filter': 'qué filas mostrar' } },
    gsutil: { que: 'la herramienta clásica para Cloud Storage (hoy se recomienda <code>gcloud storage</code>).' },
    bq: { que: 'la CLI de BigQuery.', sub: { ls: 'lista datasets o tablas', mk: 'crea datasets o tablas', show: 'muestra una tabla', query: 'ejecuta una consulta', load: 'carga un archivo en una tabla', rm: 'borra' }, op: { '--use_legacy_sql': 'con <code>=false</code> usa GoogleSQL (el estándar)', '--dry_run': 'calcula cuántos bytes leería, sin ejecutar ni cobrar', '--dataset': 'crea un dataset' } },
    databricks: { que: 'la CLI de Databricks.', sub: { auth: 'inicio de sesión y perfiles', clusters: 'clústeres', jobs: 'jobs (create, run-now, list-runs…)', bundle: 'Declarative Automation Bundles (validate, deploy, run…)', fs: 'archivos en volúmenes', secrets: 'secretos', workspace: 'notebooks y carpetas', 'current-user': 'tu usuario' }, op: { '-p': 'el perfil (<code>--profile</code>)', '-t': 'el target del bundle', '--json': 'la definición en JSON' } },
    terraform: { que: 'infraestructura como código.', sub: { init: 'descarga los providers y prepara la carpeta', plan: 'muestra qué va a crear, cambiar o borrar, sin tocar nada', apply: 'aplica los cambios', destroy: 'borra todo lo que administra', validate: 'revisa que los archivos estén bien escritos', fmt: 'da formato a los archivos', output: 'muestra las salidas', state: 'consulta o modifica el estado', import: 'trae un recurso existente al estado', workspace: 'entornos separados con el mismo código' }, op: { '-auto-approve': 'no pide confirmación (solo en automatizaciones)', '-var-file': 'un archivo de variables', '-var': 'una variable', '-raw': 'el valor sin comillas' } },
    'spark-submit': { que: 'envía un programa de Spark a ejecutar.', arg: 'el script de PySpark' },
    java: { que: 'Java, que Spark necesita para correr.', op: { '-version': 'muestra la versión instalada' } },
    awk: { que: 'procesa texto por columnas: filtra, calcula y suma. Un programa es <code>condición { acción }</code>.', arg: "el programa entre comillas simples (como <code>'{print $1}'</code>) y el archivo", op: { '-F': 'el separador de columnas (en un CSV, <code>-F,</code>)', '-v': 'define una variable para el programa' } },
    tee: { que: 'muestra lo que recibe y además lo guarda en un archivo (como una T en una cañería).', arg: 'el archivo donde guardar', op: { '-a': 'agrega al final en vez de reemplazar' } },
    xargs: { que: 'toma lo que recibe por la tubería y lo pasa como argumentos a otro comando.', arg: 'el comando a ejecutar', op: { '-n': 'cuántos argumentos por ejecución', '-I': 'un comando por línea, reemplazando la marca (por ejemplo <code>{}</code>) por la línea: <code>xargs -I{} cp {} copia/</code>' } },
    seq: { que: 'genera una secuencia de números.', arg: 'hasta dónde (o desde, paso y hasta)' },
    nl: { que: 'numera las líneas.' },
    rev: { que: 'invierte cada línea.' },
    paste: { que: 'une archivos lado a lado, línea por línea.', op: { '-d': 'el separador' } },
    column: { que: 'alinea columnas para leerlas mejor.', op: { '-t': 'arma una tabla', '-s': 'el separador de entrada (en un CSV, <code>-s,</code>)' } },
    basename: { que: 'el nombre del archivo, sin la carpeta.' },
    dirname: { que: 'la carpeta de una ruta, sin el nombre del archivo.' },
    realpath: { que: 'la ruta completa (absoluta) de un archivo.' },
    stat: { que: 'información de un archivo: tamaño, permisos y fecha.' },
    du: { que: 'cuánto ocupan archivos y carpetas (<i>disk usage</i>).', arg: 'la carpeta', op: { '-s': 'solo el total', '-h': 'tamaños legibles (K, M, G)' } },
    df: { que: 'el espacio libre de los discos (<i>disk free</i>).', op: { '-h': 'tamaños legibles' } },
    ps: { que: 'lista los procesos (programas en ejecución) y su número, el PID.', op: { aux: 'todos los procesos de la máquina, con su usuario' } },
    kill: { que: 'le pide a un proceso que termine.', arg: 'el número de proceso (PID)', op: { '-9': 'lo termina a la fuerza (último recurso)' } },
    man: { que: 'abre el manual de un comando.', arg: 'el comando' },
    tar: { que: 'empaqueta (y comprime) archivos y carpetas en uno solo.', arg: 'primero el archivo .tar.gz, después lo que se empaqueta', op: { '-czf': '<code>c</code> crear, <code>z</code> comprimir con gzip, <code>f</code> el nombre del archivo', '-tzf': '<code>t</code> listar el contenido', '-xzf': '<code>x</code> extraer', '-C': 'en qué carpeta extraer', '-v': 'muestra cada archivo' } },
    gzip: { que: 'comprime un archivo (queda con extensión .gz).' },
    gunzip: { que: 'descomprime un archivo .gz.' },
    zip: { que: 'comprime en un .zip (el formato más común para compartir).', op: { '-r': 'incluye carpetas con todo su contenido' } },
    unzip: { que: 'descomprime un .zip.', op: { '-l': 'solo lista el contenido', '-d': 'la carpeta destino' } },
    bash: { que: 'ejecuta un script de comandos (un archivo con comandos, uno por línea, que puede tener for, if y funciones).', arg: 'el script y sus argumentos, que adentro se leen como <code>$1</code>, <code>$2</code>…', op: { '-c': 'ejecuta el texto que sigue como comandos', '-n': 'solo revisa la sintaxis, sin ejecutar', '-x': 'muestra cada comando antes de ejecutarlo (para depurar)', '-s': 'lee el script de la tubería (<code>curl … | bash -s</code>)' } },
    test: { que: 'evalúa una condición y termina con código 0 (verdadero) o 1 (falso). Lo usan <code>if</code>, <code>while</code>, <code>&amp;&amp;</code> y <code>||</code>.', arg: 'la condición: <code>-f archivo</code> (existe y es archivo), <code>-d carpeta</code>, <code>-z "$x"</code> (texto vacío), <code>"$a" = "$b"</code> (textos iguales), <code>$n -gt 5</code> (número mayor; también -lt, -ge, -le, -eq, -ne)' },
    '[': { que: 'es lo mismo que <code>test</code>: evalúa una condición. Necesita espacios adentro y cerrar con <code>]</code>: <code>[ -f datos.csv ]</code>.', arg: '<code>-f</code> archivo existe, <code>-d</code> carpeta existe, <code>-z</code> texto vacío, <code>-n</code> texto no vacío, <code>=</code> / <code>!=</code> para textos, <code>-eq -ne -lt -le -gt -ge</code> para números, <code>!</code> niega' },
    '[[': { que: 'la versión de bash de <code>[ ]</code>: permite <code>&amp;&amp;</code>, <code>||</code> y patrones (<code>[[ $f == *.csv ]]</code>).', arg: 'la condición' },
    set: { que: 'cambia opciones del shell. Las de cualquier script serio: <code>set -euo pipefail</code>.', op: { '-e': 'corta el script apenas un comando falla (sin esto, sigue como si nada)', '-u': 'error si usas una variable que no existe (atrapa errores de tipeo)', '-x': 'muestra cada comando antes de ejecutarlo', '-o': 'activa una opción por nombre: <code>-o pipefail</code> hace que una tubería falle si falla cualquier parte, no solo la última' } },
    read: { que: 'lee una línea de la entrada y la guarda en una variable. Se usa en <code>while read linea; do …; done &lt; archivo</code> para recorrer un archivo.', arg: 'el nombre de la variable (o varias: la línea se reparte por espacios)', op: { '-r': 'no interpreta las barras invertidas (usa siempre -r)', '-p': 'muestra una pregunta antes de leer' } },
    for: { que: 'un <b>bucle</b>: repite los comandos entre <code>do</code> y <code>done</code> una vez por cada elemento de la lista.', arg: '<code>for VARIABLE in LISTA; do COMANDOS; done</code>. La lista puede ser palabras, un comodín (<code>*.csv</code>), llaves (<code>{1..5}</code>) o <code>$(comando)</code>' },
    while: { que: 'un <b>bucle</b> que repite <b>mientras</b> la condición termine bien (código 0).', arg: '<code>while CONDICIÓN; do COMANDOS; done</code>' },
    until: { que: 'un bucle que repite <b>hasta que</b> la condición termine bien.', arg: '<code>until CONDICIÓN; do COMANDOS; done</code>' },
    if: { que: 'ejecuta comandos <b>solo si</b> la condición termina bien (código 0).', arg: '<code>if CONDICIÓN; then …; elif OTRA; then …; else …; fi</code>. La condición suele ser <code>[ … ]</code>, pero puede ser cualquier comando: <code>if grep -q ERROR log; then …</code>' },
    case: { que: 'elige qué hacer según el valor de una palabra, comparándola con patrones.', arg: '<code>case "$x" in dev) …;; prod) …;; *) …;; esac</code> (<code>*</code> = cualquier otro caso)' },
    break: { que: 'sale del bucle de inmediato.' },
    continue: { que: 'salta a la siguiente vuelta del bucle.' },
    exit: { que: 'termina el script con un código: 0 = todo bien, cualquier otro = error.', arg: 'el código de salida' },
    return: { que: 'termina una función con un código de salida.', arg: 'el código (0 = bien)' },
    local: { que: 'crea una variable que solo existe dentro de la función.', arg: '<code>nombre=valor</code>' },
    shift: { que: 'corre los argumentos del script: el <code>$2</code> pasa a ser <code>$1</code>.' },
    unset: { que: 'borra una variable o una función.', arg: 'el nombre' },
    let: { que: 'hace una cuenta con enteros y la guarda: <code>let "n = n + 1"</code>. Hoy se prefiere <code>n=$((n + 1))</code>.' },
    id: { que: 'muestra tu usuario, tu número de usuario (uid) y los grupos a los que perteneces.' },
    ln: { que: 'crea un enlace (un acceso directo a otro archivo o carpeta).', arg: 'primero a dónde apunta, después el nombre del enlace', op: { '-s': 'enlace simbólico (el que se usa casi siempre)', '-f': 'reemplaza el enlace si ya existe' } },
    ruff: { que: 'el linter y formateador de Python más usado hoy: encuentra errores y estilo inconsistente.', sub: { check: 'revisa el código y lista los problemas (imports sin usar, comparaciones con None…)', format: 'reformatea el código con un estilo uniforme', rule: 'explica una regla (por ejemplo F401)' }, op: { '--fix': 'arregla solo lo que se puede arreglar sin riesgo', '--check': 'con format: solo avisa, no cambia nada (para CI)' } },
    pyspark: { que: 'abre la consola interactiva de PySpark, con la variable <code>spark</code> lista para usar. Se sale con <code>exit()</code>.' },
    'xcode-select': { que: 'en Mac, instala las herramientas de línea de comandos de Apple (git, make, compilador).', op: { '--install': 'abre el instalador', '-p': 'muestra dónde están instaladas' } },
    nano: { que: 'editor de texto dentro de la terminal (aquí abre el editor del curso).' },
    sudo: { que: 'ejecuta un comando como administrador.' },
    apt: { que: 'instala programas en Ubuntu o WSL.', sub: { install: 'instala', update: 'actualiza la lista de paquetes', upgrade: 'actualiza lo instalado' } },
    ssh: { que: 'se conecta a otra computadora de forma segura.' },
    'ssh-keygen': { que: 'crea un par de claves SSH (pública y privada).' },
    'reset-maquina': { que: 'reinicia la máquina de práctica: borra tus archivos y vuelve al estado inicial.' },
  };
  const OPERADORES = {
    '|': '<b>tubería</b>: la salida del comando de la izquierda entra al de la derecha, sin pasar por un archivo',
    '>': '<b>redirige</b> la salida a un archivo; si el archivo existe, lo <b>reemplaza</b>',
    '>>': '<b>redirige</b> la salida a un archivo, <b>agregando</b> al final',
    '<': 'usa un archivo como entrada del comando',
    '2>': 'redirige los <b>errores</b> a un archivo',
    '&&': 'ejecuta lo siguiente <b>solo si</b> lo anterior terminó bien',
    '||': 'ejecuta lo siguiente <b>solo si</b> lo anterior falló',
    ';': 'ejecuta lo siguiente siempre, una cosa después de la otra',
  };

  // ------------------------------------------------------------------ análisis
  // separa por operadores respetando comillas
  function partir(linea) {
    const partes = []; let cur = '', q = null;
    for (let i = 0; i < linea.length; i++) {
      const c = linea[i], c2 = linea.slice(i, i + 2);
      if (q) { cur += c; if (c === q) q = null; continue; }
      if (c === '"' || c === "'") { q = c; cur += c; continue; }
      const op = ['&&', '||', '>>', '2>'].includes(c2) ? c2 : ['|', ';', '>', '<'].includes(c) ? c : null;
      if (op) { partes.push({ t: 'cmd', v: cur.trim() }); partes.push({ t: 'op', v: op }); cur = ''; i += op.length - 1; continue; }
      cur += c;
    }
    partes.push({ t: 'cmd', v: cur.trim() });
    return partes.filter((p) => p.v);
  }
  function palabras(s) { return (s.match(/"[^"]*"|'[^']*'|\S+/g) || []); }

  function explicarComando(seg, tras) {
    const w = palabras(seg);
    const vars = [];
    while (w.length && /^[A-Za-z_]\w*=/.test(w[0])) vars.push(w.shift());
    if (tras === '>' || tras === '>>' || tras === '<' || tras === '2>') return `<li><code>${esc(seg)}</code>: el archivo.</li>`;
    if (!w.length) return vars.length ? `<li><code>${esc(vars.join(' '))}</code>: crea una variable de la sesión.</li>` : '';
    const nombre = w[0], d = D[nombre];
    let html = `<li><code>${esc(nombre)}</code>: ${d ? d.que : 'un comando de esta terminal. Escribe <code>help</code> para ver la lista, o <code>' + esc(nombre) + ' --help</code>.'}`;
    if (vars.length) html += ` <span class="muted">(con la variable <code>${esc(vars.join(' '))}</code> solo para este comando)</span>`;
    const det = [];
    let i = 1;
    if (d && d.sub && w[1] && !w[1].startsWith('-')) { det.push(`<code>${esc(w[1])}</code>: ${d.sub[w[1]] || 'subcomando de ' + esc(nombre)}`); i = 2; }
    for (; i < w.length; i++) {
      const x = w[i];
      if (/^--?[\w-]/.test(x) && !/^-\d/.test(x)) {
        const [flag, valor] = x.split('=');
        let descr = d && d.op && d.op[flag];
        // valor pegado a la opción: -d, · -f6 · -n5 · -L2
        // -la = -l + -a (primero: si todas las letras son opciones conocidas, son opciones juntas)
        if (!descr && /^-[a-zA-Z]{2,}$/.test(flag) && d && d.op) {
          const sueltas = flag.slice(1).split('').map((c) => '-' + c);
          if (sueltas.every((s) => d.op[s])) descr = sueltas.map((s) => `<code>${s}</code> ${d.op[s]}`).join('; ');
        }
        if (!descr && d && d.op && /^-[a-zA-Z]./.test(flag) && d.op[flag.slice(0, 2)]) descr = `${d.op[flag.slice(0, 2)]} (valor: <code>${esc(flag.slice(2))}</code>)`;
        det.push(`<code>${esc(x)}</code>: ${descr || `opción de ${esc(nombre)}${valor ? '' : ''} (para saber qué hace: <code>${esc(nombre)} --help</code>)`}`);
        // el valor que sigue a una opción como -n 5, -m "mensaje", -d,
        if (!valor && w[i + 1] && !w[i + 1].startsWith('-') && /^-(n|m|d|f|k|t|g|l|o|e|p|u|L|U|h|c|s|name|type|size|mtime|-?(name|profile|region|output|query|select|format|filter|project|resource-group|location|var-file|json))$/.test(flag) && !(nombre === 'ls' || nombre === 'rm' || nombre === 'cp' || nombre === 'grep')) { det.push(`<code>${esc(w[i + 1])}</code>: el valor de <code>${esc(flag)}</code>`); i++; }
      } else {
        const tipo = /^['"].*['"]$/.test(x) ? 'texto' : /[*?]/.test(x) ? 'comodín (<code>*</code> = cualquier cosa)' : x === '.' ? 'la carpeta actual' : x === '..' ? 'la carpeta de arriba' : x.startsWith('~') ? 'ruta desde tu carpeta personal' : x.startsWith('/') ? 'ruta completa (absoluta)' : x.startsWith('$') ? 'una variable' : /\.\w{1,5}$/.test(x) ? 'archivo' : (d && d.arg ? d.arg : 'argumento');
        det.push(`<code>${esc(x)}</code>: ${tipo}`);
      }
    }
    if (det.length) html += `<ul>${det.map((x) => `<li>${x}</li>`).join('')}</ul>`;
    return html + '</li>';
  }

  // estructuras de control: se explica la estructura y después cada comando de adentro
  function explicarEstructura(linea) {
    const t = linea.replace(/\n+/g, '; ').replace(/;\s*;/g, ';').replace(/\s+/g, ' ');
    const cmds = (txt) => `<ul>${String(txt).split(/\s*;\s*/).filter((x) => x.trim()).map((c) => explicar(c.trim()).replace(/^<ul class="exp-lista">|<\/ul>$/g, '')).join('')}</ul>`;
    let m;
    if ((m = t.match(/^for (\w+) in (.*?); ?do (.*?);? ?done(.*)$/))) return `<ul class="exp-lista"><li><b>Bucle <code>for</code></b>: para cada elemento de <code>${esc(m[2])}</code>, guarda el elemento en la variable <code>${esc(m[1])}</code> (se lee como <code>$${esc(m[1])}</code>) y ejecuta lo que está entre <code>do</code> y <code>done</code>. ${/[*?]/.test(m[2]) ? 'El comodín se reemplaza por los archivos que coinciden, así que hay una vuelta por archivo.' : /\{\d+\.\.\d+\}/.test(m[2]) ? 'Las llaves <code>{a..b}</code> generan la secuencia de números.' : /\$\(/.test(m[2]) ? 'La lista sale de ejecutar el comando entre <code>$( )</code>: una vuelta por palabra de su salida.' : ''}<br>En cada vuelta:${cmds(m[3])}</li>${m[4].trim() ? `<li>Lo que sigue a <code>done</code> (<code>${esc(m[4].trim())}</code>) se aplica al bucle completo.</li>` : ''}</ul>`;
    if ((m = t.match(/^(?:(.*?) \| )?(while|until) (.*?); ?do (.*?);? ?done(.*)$/))) return `<ul class="exp-lista">${m[1] ? `<li>Primero <code>${esc(m[1])}</code>, y su salida entra por la tubería al bucle: cada <code>read</code> toma una línea.</li>` : ''}<li><b>Bucle <code>${m[2]}</code></b>: ${m[2] === 'while' ? 'repite <b>mientras</b>' : 'repite <b>hasta que</b>'} <code>${esc(m[3])}</code> termine bien.${/^read\b/.test(m[3]) ? ' <code>read</code> lee una línea por vuelta; cuando no quedan líneas, falla y el bucle termina. Es la forma de recorrer un archivo línea por línea.' : ' Algo adentro tiene que cambiar la condición, o el bucle no termina nunca.'}<br>En cada vuelta:${cmds(m[4])}</li>${/^\s*</.test(m[5]) ? `<li><code>${esc(m[5].trim())}</code>: el bucle lee las líneas de ese archivo.</li>` : ''}</ul>`;
    if ((m = t.match(/^if (.*?); ?then (.*?)(?:; ?else (.*?))?;? ?fi$/))) return `<ul class="exp-lista"><li><b>Condicional <code>if</code></b>: ejecuta <code>${esc(m[1])}</code>; si termina bien (código 0), se cumple la condición.${/^\[/.test(m[1]) ? ` ${D['['].que}` : ''}</li><li><b>Si se cumple</b> (<code>then</code>):${cmds(m[2].replace(/; ?elif .*/, ''))}</li>${/; ?elif /.test(m[2]) ? '<li><code>elif</code>: si no se cumplió, prueba otra condición.</li>' : ''}${m[3] ? `<li><b>Si no se cumple</b> (<code>else</code>):${cmds(m[3])}</li>` : '<li>Sin <code>else</code>: si no se cumple, no hace nada.</li>'}</ul>`;
    if ((m = t.match(/^case (.*?) in (.*) esac$/))) return `<ul class="exp-lista"><li><b><code>case</code></b>: compara <code>${esc(m[1])}</code> con cada patrón en orden y ejecuta el primero que coincide (<code>*</code> = cualquier otro valor). <code>;;</code> cierra cada caso.</li></ul>`;
    if ((m = t.match(/^(?:function )?(\w+) ?\(\) ?\{ ?(.*?);? ?\}(.*)$/))) return `<ul class="exp-lista"><li><b>Define la función <code>${esc(m[1])}</code></b>: un nombre para un grupo de comandos. No se ejecuta todavía: se ejecuta cuando escribes <code>${esc(m[1])}</code>, y adentro los argumentos se leen como <code>$1</code>, <code>$2</code>…${cmds(m[2])}</li>${m[3].trim() ? `<li>Después:${cmds(m[3].replace(/^;\s*/, ''))}</li>` : ''}</ul>`;
    return '';
  }
  function explicar(linea, r) {
    linea = (linea || '').trim();
    if (!linea) return '';
    if (/^(for|while|until|if|case|function)\b|^\w+\s*\(\)|\|\s*while\b|\n/.test(linea)) {
      const e = explicarEstructura(linea);
      if (e) return e + (r ? (r.code === 0 ? '<p class="exp-res ok">✓ Terminó bien (código de salida 0).</p>' : `<p class="exp-res bad">✗ Terminó con error (código ${r.code}).</p>`) : '');
    }
    const partes = partir(linea);
    let html = '<ul class="exp-lista">';
    partes.forEach((p, i) => {
      if (p.t === 'op') html += `<li class="exp-op"><code>${esc(p.v)}</code>: ${OPERADORES[p.v]}</li>`;
      else html += explicarComando(p.v, i > 0 ? partes[i - 1].v : null);
    });
    html += '</ul>';
    if (r) html += r.code === 0 ? '<p class="exp-res ok">✓ Terminó bien (código de salida 0).</p>' : `<p class="exp-res bad">✗ Terminó con error (código ${r.code}). Lee el mensaje: casi siempre dice qué falta o qué está mal escrito.</p>`;
    return html;
  }

  // ------------------------------------------------------------------ panel
  function panel() {
    const el = document.createElement('div');
    el.className = 'card exp-panel';
    el.innerHTML = '<div class="exp-tit">🧠 ¿Qué hizo tu último comando?</div><div class="exp-cuerpo"><p class="muted small">Escribe un comando en la terminal y acá vas a ver qué hace cada parte: el comando, sus opciones, los archivos y los símbolos como <code>|</code> o <code>&gt;</code>.</p></div>';
    return {
      el,
      actualizar(linea, r, modo) {
        if (modo) return;   // dentro de sqlite3, psql o python no se explica la línea
        el.querySelector('.exp-cuerpo').innerHTML = `<p class="exp-cmd"><code>${esc(linea)}</code></p>${explicar(linea, r)}`;
      },
    };
  }

  // ------------------------------------------------------------------ chuleta
  // ejemplos pensados para la máquina del curso (los archivos existen)
  const CHULETA = [
    { t: '📍 Dónde estoy y qué hay', cmds: [['pwd', 'ver en qué carpeta estás'], ['ls', 'listar lo que hay'], ['ls -la', 'con detalle y archivos ocultos'], ['ls -lh datos', 'tamaños legibles de otra carpeta'], ['tree -L 2', 'el árbol de carpetas, 2 niveles']] },
    { t: '🚶 Moverse', cmds: [['cd datos', 'entrar a una carpeta'], ['cd ..', 'subir un nivel'], ['cd ~', 'volver a tu carpeta personal'], ['cd -', 'volver a la carpeta anterior']] },
    { t: '👀 Mirar archivos', cmds: [['cat README.md', 'ver un archivo completo'], ['head -n 5 datos/clientes.csv', 'las primeras 5 líneas'], ['tail -n 3 logs/pipeline.log', 'las últimas 3 líneas'], ['wc -l datos/clientes.csv', 'cuántas líneas tiene']] },
    { t: '🔎 Buscar y filtrar', cmds: [['grep ERROR logs/pipeline.log', 'líneas que contienen ERROR'], ['grep -c ERROR logs/pipeline.log', 'cuántas son'], ['grep -i chile datos/clientes.csv | head', 'sin importar mayúsculas, las primeras'], ['find . -name "*.csv"', 'buscar archivos por nombre']] },
    { t: '🧮 Columnas y conteos (CSV)', cmds: [['cut -d, -f6 datos/clientes.csv | head', 'la columna 6 de un CSV'], ['cut -d, -f6 datos/clientes.csv | sort | uniq -c', 'cuántos hay de cada valor'], ['cut -d, -f6 datos/clientes.csv | sort | uniq -c | sort -nr | head -3', 'los 3 más frecuentes']] },
    { t: '📝 Crear, copiar y mover', cmds: [['mkdir -p proyecto/datos proyecto/src', 'crear carpetas (y las intermedias)'], ['touch proyecto/notas.txt', 'crear un archivo vacío'], ['echo "hola" > proyecto/saludo.txt', 'escribir un archivo (lo reemplaza)'], ['echo "otra línea" >> proyecto/saludo.txt', 'agregar al final'], ['cp proyecto/saludo.txt proyecto/copia.txt', 'copiar'], ['mv proyecto/copia.txt proyecto/final.txt', 'mover o renombrar'], ['rm proyecto/final.txt', 'borrar (sin papelera)']] },
    { t: '🔗 Tuberías y redirecciones', cmds: [['grep ERROR logs/pipeline.log > errores.txt', 'guardar el resultado en un archivo'], ['grep ERROR logs/pipeline.log | wc -l', 'contar sin crear archivos'], ['ls datos && echo "listo"', 'el segundo solo si el primero salió bien'], ['history | tail -5', 'tus últimos 5 comandos']] },
    { t: '🐍 Python y entornos', cmds: [['python --version', 'qué versión hay'], ['python -m venv .venv', 'crear un entorno virtual'], ['source .venv/bin/activate', 'activarlo (aparece (.venv) en el prompt)'], ['pip install pandas', 'instalar un paquete'], ['python scripts/resumen_ventas.py', 'ejecutar un script'], ['deactivate', 'salir del entorno']] },
    { t: '🔁 Scripts: variables, bucles y condiciones', cmds: [['for f in datos/*.csv; do echo "$f: $(wc -l < $f) líneas"; done', 'repetir algo para cada archivo'], ['for capa in bronze silver gold; do mkdir -p lago/$capa; done', 'crear varias carpetas con un bucle'], ['if [ -f datos/clientes.csv ]; then echo "está"; else echo "falta"; fi', 'decidir según si existe un archivo'], ['head -4 datos/clientes.csv | while read -r linea; do echo "→ $linea"; done', 'recorrer líneas una por una'], ['n=$(grep -c ERROR logs/pipeline.log); [ "$n" -gt 0 ] && echo "hay $n errores"', 'guardar la salida de un comando y comparar números'], ['hoy=$(date +%F); echo "corrida del $hoy"', 'la fecha de hoy en una variable'], ['saludar() { echo "hola, $1"; }; saludar Ana', 'definir y usar una función'], ['printf \'#!/bin/bash\\nset -euo pipefail\\necho "procesando $1"\\n\' > tarea.sh && chmod +x tarea.sh && ./tarea.sh ventas', 'un script con argumentos']] },
    { t: '🌿 Git', cmds: [['git init proyecto', 'crear un repositorio'], ['git status', 'qué cambió'], ['git add .', 'preparar todos los cambios'], ['git commit -m "Primer commit"', 'guardar la foto con un mensaje'], ['git log --oneline', 'la historia, una línea por commit'], ['git switch -c feature/limpieza', 'crear una rama y pasarse a ella']] },
    { t: '🗃️ Bases de datos', cmds: [['sqlite3', 'abrir la base del curso (.tables, .quit)'], ['duckdb', 'abrir DuckDB'], ['docker run -d --name pg -e POSTGRES_PASSWORD=secreto -p 5432:5432 postgres:16', 'un Postgres en un contenedor'], ['docker ps', 'ver los contenedores']] },
    { t: '🔧 dbt y Airflow', cmds: [['cd ~/tienda_dbt', 'entrar al proyecto dbt'], ['dbt run', 'construir los modelos'], ['dbt test', 'ejecutar los tests'], ['airflow dags list', 'ver los DAGs'], ['airflow dags list-import-errors', 'DAGs que no cargan y por qué']] },
    { t: '☁️ Nube', cmds: [['az login', 'iniciar sesión en Azure'], ['az group list -o table', 'tus grupos de recursos, en tabla'], ['aws sts get-caller-identity', 'AWS: ¿quién soy?'], ['aws s3 ls', 'tus buckets de S3'], ['gcloud config list', 'Google Cloud: proyecto y región activos'], ['databricks auth login --host https://adb-1234567890123456.7.azuredatabricks.net', 'Databricks: iniciar sesión']] },
    { t: '🆘 Ayuda', cmds: [['help', 'todos los comandos de esta terminal'], ['git --help', 'la ayuda de un comando'], ['history', 'lo que escribiste'], ['clear', 'limpiar la pantalla']] },
  ];
  function chuleta(alUsar) {
    const el = document.createElement('div');
    el.className = 'exp-chuleta';
    el.innerHTML = `<p class="small muted" style="margin-top:0">Los comandos que más se usan en el trabajo diario. Haz clic en uno para <b>pegarlo en la terminal</b>; después presiona Enter. Mejor todavía: escríbelo tú, así se aprende de memoria.</p>` +
      CHULETA.map((s) => `<details class="exp-sec"><summary>${s.t}</summary><ul>${s.cmds.map(([c, d]) => `<li><button type="button" class="exp-ej" data-cmd="${esc(c)}"><code>${esc(c)}</code></button><span class="small muted">${esc(d)}</span></li>`).join('')}</ul></details>`).join('');
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-cmd]'); if (b) alUsar(b.dataset.cmd); });
    el.querySelector('details').open = true;
    return el;
  }

  window.ExplicaCmd = { explicar, panel, chuleta, DICCIONARIO: D };
})();
