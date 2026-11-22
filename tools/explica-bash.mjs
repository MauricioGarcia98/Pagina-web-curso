// Explica, en lenguaje simple, cada comando de un bloque de terminal (```bash) de las lecciones.
// El build agrega debajo de cada bloque un desplegable "Qué hace cada comando": por cada línea, qué programa se
// usa, qué subcomando y qué significa cada opción. Así nadie copia un comando sin saber qué hace.
//   import { explicarBash } from './explica-bash.mjs';   explicarBash(codigo) → { html, faltan: [comandos sin explicar] }

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const c = (s) => `<code>${esc(s)}</code>`;

// ---------------------------------------------------------------- opciones que significan lo mismo en las CLIs de nube
const OPC_NUBE = {
  '--output': 'formato de la respuesta (<code>table</code> para leer, <code>json</code> para procesar, <code>tsv</code> para scripts)', '-o': 'formato de la respuesta (table, json, tsv)',
  '--query': 'filtra la respuesta (JMESPath) y muestra solo los campos que te interesan',
  '--region': 'región de la nube donde vive el recurso (por ejemplo, us-east-1)', '--profile': 'qué perfil de credenciales usar (cuenta o rol)',
  '--location': 'región de Azure donde se crea el recurso', '-l': 'región donde se crea el recurso',
  '--resource-group': 'grupo de recursos (la carpeta de Azure que agrupa lo de un proyecto)', '-g': 'grupo de recursos donde está o se crea el recurso',
  '--name': 'nombre del recurso', '-n': 'nombre del recurso', '--project': 'proyecto de Google Cloud donde se trabaja', '--help': 'muestra la ayuda del comando',
  '--sku': 'el plan o tamaño del recurso (define precio y capacidad)', '--tags': 'etiquetas para saber de quién es y cuánto cuesta cada recurso',
  '--yes': 'confirma sin preguntar', '-y': 'confirma sin preguntar', '--recursive': 'incluye todo lo que hay adentro de la carpeta', '--dry-run': 'muestra qué haría sin hacerlo',
};

// ---------------------------------------------------------------- diccionario de comandos
// texto: qué hace el programa; sub: subcomandos (la segunda palabra); opc: opciones propias
const D = {
  // archivos y carpetas
  cd: { texto: 'entra a una carpeta (cambia el directorio de trabajo). <code>cd ..</code> sube un nivel y <code>cd ~</code> vuelve a tu carpeta personal' },
  ls: { texto: 'lista los archivos y carpetas', opc: { '-l': 'en formato largo: permisos, tamaño y fecha', '-a': 'incluye los ocultos (los que empiezan con punto)', '-h': 'tamaños legibles (K, M, G)', '-R': 'entra también a las subcarpetas', '-la': 'formato largo e incluye los ocultos', '-lh': 'formato largo con tamaños legibles', '-1': 'un archivo por línea' } },
  pwd: { texto: 'muestra en qué carpeta estás' },
  mkdir: { texto: 'crea una carpeta', opc: { '-p': 'crea también las carpetas intermedias y no falla si ya existe' } },
  touch: { texto: 'crea un archivo vacío (o actualiza su fecha si ya existe)' },
  rm: { texto: 'borra archivos (no van a la papelera: no se pueden recuperar)', opc: { '-r': 'borra carpetas con todo su contenido', '-f': 'no pregunta ni avisa si no existe', '-rf': 'borra la carpeta y todo su contenido sin preguntar: úsalo con mucho cuidado' } },
  cp: { texto: 'copia archivos', opc: { '-r': 'copia carpetas completas' } },
  mv: { texto: 'mueve o renombra archivos y carpetas' },
  cat: { texto: 'muestra el contenido de un archivo (o, con <code>&gt;</code> y <code>&lt;&lt; EOF</code>, escribe uno nuevo)' },
  less: { texto: 'abre un archivo largo para leerlo de a páginas (q para salir)' },
  head: { texto: 'muestra las primeras líneas de un archivo (10 si no dices cuántas)', opc: { '-n': 'cuántas líneas mostrar' } },
  tail: { texto: 'muestra las últimas líneas de un archivo', opc: { '-n': 'cuántas líneas mostrar', '-f': 'se queda mirando y muestra lo nuevo a medida que llega (ideal para logs)' } },
  wc: { texto: 'cuenta líneas, palabras y caracteres', opc: { '-l': 'solo cuenta líneas (en un CSV, filas + el encabezado)' } },
  cut: { texto: 'corta columnas de un texto', opc: { '-d': 'el separador de columnas (en un CSV, la coma)', '-f': 'qué columnas quedarse (1, 2-4…)' } },
  sort: { texto: 'ordena líneas', opc: { '-n': 'como números, no como texto', '-r': 'de mayor a menor', '-u': 'quita repetidos', '-k': 'ordena por una columna', '-t': 'el separador de columnas', '-nr': 'como números, de mayor a menor', '-rn': 'como números, de mayor a menor' } },
  uniq: { texto: 'junta líneas iguales que están seguidas (por eso casi siempre va después de <code>sort</code>)', opc: { '-c': 'antepone cuántas veces aparece cada una', '-d': 'muestra solo las repetidas' } },
  awk: { texto: 'recorre un archivo línea por línea y filtra o calcula por columnas (<code>$1</code> es la primera, <code>NR</code> el número de fila)', opc: { '-F': 'el separador de columnas' } },
  sed: { texto: 'busca y reemplaza texto en cada línea', opc: { '-i': 'modifica el archivo en el lugar', '-n': 'solo imprime lo que se pide', '-E': 'expresiones regulares extendidas' } },
  grep: { texto: 'busca líneas que contienen un texto o patrón', opc: { '-i': 'sin distinguir mayúsculas', '-v': 'las que NO contienen el texto', '-c': 'solo cuenta cuántas líneas coinciden', '-r': 'busca en todas las subcarpetas', '-n': 'muestra el número de línea', '-E': 'expresiones regulares extendidas', '-l': 'solo el nombre de los archivos que coinciden', '-o': 'solo la parte que coincide' } },
  find: { texto: 'busca archivos por nombre, tipo o fecha', opc: { '-name': 'por nombre (acepta comodines como *.csv)', '-type': 'f = archivos, d = carpetas', '-mtime': 'por días desde la última modificación' } },
  tree: { texto: 'muestra las carpetas y archivos como un árbol' },
  echo: { texto: 'escribe un texto en pantalla (o en un archivo, con <code>&gt;</code> o <code>&gt;&gt;</code>)' },
  printf: { texto: 'escribe texto con formato (como echo, pero controlando saltos de línea y columnas)' },
  tee: { texto: 'muestra lo que recibe y a la vez lo guarda en un archivo' },
  xargs: { texto: 'toma lo que recibe y lo usa como argumentos de otro comando' },
  diff: { texto: 'muestra las diferencias entre dos archivos' },
  chmod: { texto: 'cambia los permisos de un archivo (+x lo vuelve ejecutable)' },
  tar: { texto: 'empaqueta o desempaqueta archivos (.tar, .tar.gz)', opc: { '-czf': 'crea un .tar.gz', '-xzf': 'extrae un .tar.gz' } },
  zip: { texto: 'comprime archivos en un .zip' }, unzip: { texto: 'descomprime un .zip' },
  gzip: { texto: 'comprime un archivo (.gz)' }, gunzip: { texto: 'descomprime un .gz' }, zcat: { texto: 'muestra un archivo .gz sin descomprimirlo en disco' },
  jq: { texto: 'lee y filtra JSON en la terminal (<code>.campo</code>, <code>.[0]</code>, <code>map(...)</code>)', opc: { '-r': 'texto sin comillas', '-c': 'una línea por objeto' } },
  date: { texto: 'muestra la fecha y hora (o la formatea)' }, sleep: { texto: 'espera la cantidad de segundos indicada' },
  clear: { texto: 'limpia la pantalla de la terminal' }, history: { texto: 'muestra los últimos comandos que escribiste' },
  which: { texto: 'dice dónde está instalado un programa (y si está instalado)' }, man: { texto: 'abre el manual de un comando' },
  open: { texto: 'abre un archivo o carpeta con su programa (en macOS)' }, code: { texto: 'abre un archivo o carpeta en VS Code (<code>code .</code> abre la carpeta actual)' },
  nano: { texto: 'editor de texto simple dentro de la terminal (Ctrl+O guarda, Ctrl+X sale)' }, vim: { texto: 'editor de texto de la terminal (:wq guarda y sale)' },
  source: { texto: 'ejecuta un archivo en la terminal actual (por ejemplo, para activar un entorno virtual)' },
  export: { texto: 'define una variable de entorno para esta terminal y los programas que lances desde ella' },
  env: { texto: 'muestra las variables de entorno (o ejecuta un comando con algunas definidas)' },
  ps: { texto: 'lista los procesos en ejecución' }, kill: { texto: 'detiene un proceso por su número' }, top: { texto: 'muestra los procesos que más CPU y memoria usan' },
  df: { texto: 'muestra el espacio libre en disco', opc: { '-h': 'tamaños legibles' } }, du: { texto: 'muestra cuánto ocupa una carpeta', opc: { '-sh': 'el total, con tamaño legible' } },
  ssh: { texto: 'se conecta a otra computadora por la red, de forma segura' }, scp: { texto: 'copia archivos a otra computadora por SSH' },
  curl: { texto: 'hace un pedido HTTP a una URL (bajar un archivo o llamar a una API)', opc: { '-s': 'sin barra de progreso', '-X': 'el método HTTP (GET, POST, PUT, DELETE)', '-H': 'agrega un encabezado (por ejemplo, el token o el tipo de contenido)', '-d': 'el cuerpo que se envía (datos o JSON)', '-o': 'guarda la respuesta en un archivo', '-L': 'sigue las redirecciones', '-i': 'muestra también los encabezados de la respuesta', '-f': 'falla si la respuesta es un error HTTP', '-sS': 'sin barra de progreso, pero mostrando los errores' } },
  wget: { texto: 'descarga un archivo desde una URL' },
  // instalar y ejecutar
  brew: { texto: 'Homebrew: el instalador de programas de macOS', sub: { install: 'instala un programa', update: 'actualiza la lista de programas', upgrade: 'actualiza los programas instalados' } },
  apt: { texto: 'el instalador de programas de Ubuntu/Debian (Linux y WSL)', sub: { install: 'instala un paquete', update: 'actualiza la lista de paquetes' } }, 'apt-get': { texto: 'el instalador de programas de Ubuntu/Debian' },
  winget: { texto: 'el instalador de programas de Windows', sub: { install: 'instala un programa' } },
  python: { texto: 'ejecuta Python: un archivo .py, un módulo (<code>-m</code>) o la consola interactiva', opc: { '-m': 'ejecuta un módulo instalado (por ejemplo, <code>python -m venv</code> o <code>python -m pytest</code>)', '-c': 'ejecuta el código que va entre comillas' } },
  python3: { texto: 'ejecuta Python 3 (en macOS y Linux suele llamarse así)', opc: { '-m': 'ejecuta un módulo instalado', '-c': 'ejecuta el código entre comillas' } },
  pip: { texto: 'el instalador de paquetes de Python', sub: { install: 'instala paquetes (de PyPI o de un requirements.txt con <code>-r</code>)', freeze: 'lista los paquetes instalados con su versión exacta (para requirements.txt)', list: 'lista los paquetes instalados', uninstall: 'desinstala un paquete', show: 'muestra datos de un paquete' }, opc: { '-r': 'instala todo lo que dice el archivo', '-U': 'actualiza a la última versión', '--upgrade': 'actualiza a la última versión' } },
  uv: { texto: 'uv: administra proyectos de Python (versión de Python, entorno virtual y dependencias) y es muy rápido', sub: { init: 'crea un proyecto nuevo con su pyproject.toml', add: 'agrega una dependencia al proyecto y la instala', remove: 'quita una dependencia', run: 'ejecuta un comando dentro del entorno del proyecto', sync: 'instala exactamente lo que dice el lockfile', venv: 'crea un entorno virtual', lock: 'actualiza el lockfile (uv.lock)', python: 'instala o elige versiones de Python', tool: 'instala herramientas de línea de comandos (como ruff) aparte del proyecto', pip: 'usa uv con la misma interfaz que pip' }, opc: { '--dev': 'como dependencia de desarrollo (tests, linters), no de producción' } },
  pytest: { texto: 'ejecuta las pruebas automáticas (los archivos test_*.py)', opc: { '-v': 'muestra cada prueba', '-q': 'salida corta', '-k': 'solo las pruebas cuyo nombre coincide', '-x': 'para en el primer error' } },
  ruff: { texto: 'revisa el estilo y errores comunes del código Python (linter) y lo formatea', sub: { check: 'busca problemas (con <code>--fix</code> arregla los automáticos)', format: 'formatea el código con un estilo uniforme' } },
  black: { texto: 'formatea código Python con un estilo uniforme' }, mypy: { texto: 'revisa los tipos del código Python' },
  jupyter: { texto: 'Jupyter: notebooks en el navegador', sub: { lab: 'abre JupyterLab', notebook: 'abre el Jupyter clásico' } },
  streamlit: { texto: 'Streamlit: convierte un script de Python en una app web', sub: { run: 'levanta la app en http://localhost:8501' } },
  uvicorn: { texto: 'servidor que levanta una API de FastAPI', opc: { '--reload': 'reinicia solo cuando cambias el código (solo para desarrollo)', '--port': 'el puerto donde escucha' } },
  fastapi: { texto: 'la CLI de FastAPI', sub: { dev: 'levanta la API en modo desarrollo, con recarga automática', run: 'levanta la API en modo producción' } },
  node: { texto: 'ejecuta JavaScript fuera del navegador' }, npm: { texto: 'el instalador de paquetes de JavaScript', sub: { install: 'instala las dependencias del proyecto', run: 'ejecuta un script del package.json' } }, npx: { texto: 'ejecuta un paquete de npm sin instalarlo' },
  make: { texto: 'ejecuta una receta definida en el Makefile (por ejemplo, <code>make test</code>)' },
  // bases de datos
  psql: { texto: 'el cliente de PostgreSQL en la terminal', opc: { '-h': 'el servidor', '-U': 'el usuario', '-d': 'la base de datos', '-c': 'ejecuta esa consulta y sale', '-f': 'ejecuta un archivo .sql' } },
  sqlite3: { texto: 'el cliente de SQLite: abre (o crea) un archivo de base de datos' },
  duckdb: { texto: 'DuckDB: base de datos analítica en un solo archivo; consulta CSV y Parquet directamente', opc: { '-c': 'ejecuta esa consulta y sale' } },
  mysql: { texto: 'el cliente de MySQL en la terminal' },
  // git y GitHub
  git: { texto: 'Git: guarda la historia de tu código', sub: {
    init: 'convierte la carpeta en un repositorio (crea la carpeta oculta .git)', clone: 'descarga una copia completa de un repositorio remoto, con toda su historia',
    status: 'muestra qué cambió y qué está listo para el próximo commit', add: 'prepara cambios para el próximo commit (los pasa al área de preparación)',
    commit: 'guarda una foto de los cambios preparados, con un mensaje', push: 'sube tus commits al repositorio remoto (GitHub)', pull: 'trae los commits nuevos del remoto y los une a tu rama',
    fetch: 'trae los commits nuevos del remoto sin tocar tu rama', checkout: 'cambia de rama (con <code>-b</code>, crea una rama nueva y se pasa a ella)', switch: 'cambia de rama (con <code>-c</code>, crea una nueva)',
    branch: 'lista, crea o borra ramas', merge: 'une otra rama a la rama actual', rebase: 'reaplica tus commits encima de otra rama (historia lineal)',
    log: 'muestra la historia de commits', diff: 'muestra las líneas que cambiaron', remote: 'administra las direcciones de los repositorios remotos (origin)',
    stash: 'guarda tus cambios a un costado para tener la carpeta limpia (y <code>stash pop</code> los devuelve)', tag: 'marca un commit con un nombre (por ejemplo, una versión v1.0)',
    reset: 'mueve la rama a otro commit (con <code>--hard</code> descarta cambios: cuidado)', revert: 'crea un commit nuevo que deshace otro (seguro en ramas compartidas)',
    restore: 'descarta cambios de un archivo o lo saca del área de preparación', config: 'configura Git (tu nombre, tu correo, la rama por defecto)', show: 'muestra un commit y sus cambios',
    blame: 'muestra quién cambió cada línea y en qué commit', 'cherry-pick': 'copia un commit puntual a la rama actual', mv: 'renombra un archivo y Git lo registra', rm: 'borra un archivo y Git lo registra' },
    opc: { '-m': 'el mensaje del commit', '-u': 'recuerda la rama remota: después alcanza con <code>git push</code>', '-b': 'crea la rama nueva', '--oneline': 'una línea por commit', '--graph': 'dibuja las ramas', '-a': 'incluye todas las ramas (o todos los archivos modificados, en commit)', '-d': 'borra la rama (si ya está unida)', '-M': 'renombra la rama', '--global': 'para todos tus repositorios', '--hard': 'descarta los cambios del directorio de trabajo: no se pueden recuperar', '-v': 'muestra más detalle', '--all': 'todas las ramas', '-c': 'crea la rama nueva', '.': 'todos los archivos de la carpeta actual', '--no-ff': 'siempre crea un commit de merge' } },
  gh: { texto: 'la CLI de GitHub: hace desde la terminal lo que harías en github.com', sub: { auth: 'inicia sesión con tu cuenta de GitHub', repo: 'crea, clona o mira repositorios', pr: 'crea, revisa o une pull requests', issue: 'crea o lista issues', run: 'mira las ejecuciones de GitHub Actions', workflow: 'lista o lanza workflows de Actions', secret: 'guarda secretos del repositorio para Actions', release: 'publica versiones' } },
  // contenedores e infraestructura
  docker: { texto: 'Docker: empaqueta una app con todo lo que necesita (imagen) y la ejecuta aislada (contenedor)', sub: { build: 'construye una imagen a partir del Dockerfile', run: 'crea y arranca un contenedor desde una imagen', ps: 'lista los contenedores en ejecución (con <code>-a</code>, también los detenidos)', images: 'lista las imágenes descargadas', compose: 'levanta varios servicios juntos según docker-compose.yml', exec: 'ejecuta un comando dentro de un contenedor que ya está corriendo', logs: 'muestra lo que escribió el contenedor', stop: 'detiene un contenedor', rm: 'borra un contenedor', rmi: 'borra una imagen', pull: 'descarga una imagen de un registro', push: 'sube una imagen a un registro', tag: 'le pone otro nombre o versión a una imagen', volume: 'administra volúmenes (datos que sobreviven al contenedor)', network: 'administra redes entre contenedores', inspect: 'muestra todos los detalles de un contenedor o imagen', login: 'inicia sesión en un registro de imágenes' }, opc: { '-t': 'el nombre (y versión) de la imagen', '-it': 'interactivo, con terminal', '--rm': 'borra el contenedor al terminar', '-p': 'conecta un puerto de tu computadora con uno del contenedor (local:contenedor)', '-v': 'monta una carpeta de tu computadora dentro del contenedor', '-e': 'define una variable de entorno', '-d': 'lo deja corriendo en segundo plano', '--name': 'el nombre del contenedor', '-f': 'sigue mostrando lo nuevo', 'up': 'levanta los servicios', 'down': 'apaga y borra los servicios' } },
  terraform: { texto: 'Terraform: crea y cambia infraestructura en la nube a partir de archivos .tf', sub: { init: 'prepara la carpeta: descarga los proveedores y configura dónde se guarda el estado', plan: 'muestra qué va a crear, cambiar o borrar, sin hacerlo', apply: 'aplica los cambios en la nube (pide confirmación)', destroy: 'borra todo lo que creó esta configuración', fmt: 'ordena el formato de los archivos .tf', validate: 'revisa que la configuración sea válida', output: 'muestra los valores de salida (URLs, nombres)', state: 'mira o mueve recursos del estado', import: 'incorpora al estado un recurso que ya existía', workspace: 'usa estados separados (dev, prod)' }, opc: { '-auto-approve': 'aplica sin preguntar (solo en pipelines automáticos)', '-out': 'guarda el plan en un archivo para aplicar exactamente ese', '-var': 'pasa el valor de una variable' } },
  kubectl: { texto: 'la CLI de Kubernetes', sub: { get: 'lista recursos (pods, servicios)', apply: 'crea o actualiza recursos desde un YAML', describe: 'muestra el detalle de un recurso', logs: 'muestra los logs de un pod', delete: 'borra un recurso' } },
  // herramientas de datos
  dbt: { texto: 'dbt: transforma datos dentro del almacén con modelos SQL versionados y probados', sub: { init: 'crea un proyecto nuevo', debug: 'revisa la conexión y la configuración', run: 'ejecuta los modelos (crea las tablas y vistas)', test: 'ejecuta las pruebas de datos (not_null, unique…)', build: 'ejecuta modelos, pruebas, seeds y snapshots en orden', seed: 'carga los CSV de la carpeta seeds como tablas', snapshot: 'guarda la historia de los cambios de una tabla (SCD tipo 2)', docs: 'genera y sirve la documentación con el linaje', compile: 'muestra el SQL final sin ejecutarlo', deps: 'instala los paquetes de packages.yml', source: 'revisa la frescura de las fuentes', ls: 'lista los modelos y recursos', show: 'muestra unas filas del resultado de un modelo' }, opc: { '--select': 'solo esos modelos (con + incluye los anteriores o los siguientes)', '-s': 'solo esos modelos', '--full-refresh': 'reconstruye los modelos incrementales desde cero', '--target': 'a qué entorno conectarse (dev, prod)' } },
  airflow: { texto: 'la CLI de Apache Airflow', sub: { dags: 'lista, pausa o ejecuta DAGs', tasks: 'prueba o mira tareas', db: 'prepara la base de datos de Airflow', users: 'crea usuarios de la interfaz web', standalone: 'levanta todo Airflow en tu computadora para practicar', webserver: 'levanta la interfaz web', scheduler: 'levanta el planificador que dispara los DAGs', connections: 'administra conexiones a sistemas externos', variables: 'administra variables' } },
  'spark-submit': { texto: 'envía un programa de Spark a un clúster para que lo ejecute' }, pyspark: { texto: 'abre una consola de PySpark' },
  kcat: { texto: 'cliente de Kafka en la terminal: lee o escribe mensajes de un tópico', opc: { '-b': 'el servidor de Kafka (broker)', '-t': 'el tópico', '-C': 'modo consumidor: lee mensajes', '-P': 'modo productor: escribe mensajes', '-o': 'desde qué posición (offset) leer', '-e': 'sale al llegar al final' } },
  // nubes
  az: { texto: 'la CLI de Azure: hace desde la terminal lo mismo que el portal de Azure', sub: { login: 'inicia sesión en tu cuenta de Azure (abre el navegador)', account: 'mira o elige la suscripción con la que trabajas', group: 'crea, lista o borra grupos de recursos', storage: 'cuentas de almacenamiento: contenedores y archivos (blobs) del lago', datafactory: 'Azure Data Factory: fábricas, pipelines y ejecuciones', databricks: 'espacios de trabajo de Azure Databricks', keyvault: 'Key Vault: guarda secretos, claves y certificados', sql: 'bases de datos Azure SQL', synapse: 'Azure Synapse Analytics', monitor: 'métricas, logs y alertas', role: 'permisos: quién puede hacer qué (RBAC)', ad: 'identidades de Microsoft Entra ID', identity: 'identidades administradas', eventhubs: 'Event Hubs: mensajes en tiempo real', functionapp: 'Azure Functions', resource: 'cualquier recurso, de forma genérica', deployment: 'despliega plantillas (ARM o Bicep)', consumption: 'consumo y costos', configure: 'configura valores por defecto de la CLI', extension: 'instala extensiones de la CLI', cosmosdb: 'Azure Cosmos DB', vm: 'máquinas virtuales', postgres: 'Azure Database for PostgreSQL', acr: 'registro de imágenes de contenedores' }, opc: OPC_NUBE },
  aws: { texto: 'la CLI de AWS: hace desde la terminal lo mismo que la consola de AWS', sub: { configure: 'guarda tus credenciales y la región por defecto', sts: 'credenciales temporales (<code>get-caller-identity</code> dice con qué cuenta y usuario estás)', s3: 'Amazon S3: buckets y archivos del lago (ls, cp, sync, mb, rm)', s3api: 'S3 con todas las opciones de la API', iam: 'usuarios, roles y políticas de permisos', glue: 'AWS Glue: catálogo de datos, crawlers y jobs de ETL', athena: 'Amazon Athena: consultas SQL sobre archivos en S3', lambda: 'funciones Lambda', logs: 'CloudWatch Logs', cloudwatch: 'métricas y alarmas', kinesis: 'Kinesis: datos en tiempo real', firehose: 'Firehose: entrega datos en tiempo real a S3 o Redshift', redshift: 'Amazon Redshift', 'redshift-data': 'consultas a Redshift por API', emr: 'clústeres de Spark administrados', secretsmanager: 'guarda secretos (contraseñas, tokens)', cloudformation: 'infraestructura como código de AWS', stepfunctions: 'orquestación de pasos', events: 'EventBridge: reglas y horarios', ec2: 'máquinas virtuales', dynamodb: 'DynamoDB (NoSQL)', sns: 'notificaciones', sqs: 'colas de mensajes', ce: 'costos (Cost Explorer)', lakeformation: 'permisos del lago de datos', mwaa: 'Airflow administrado', kms: 'claves de cifrado', organizations: 'cuentas de la organización', dms: 'migración de bases de datos', sagemaker: 'machine learning', bedrock: 'modelos de IA generativa' }, opc: OPC_NUBE },
  gcloud: { texto: 'la CLI de Google Cloud: hace desde la terminal lo mismo que la consola de Google Cloud', sub: { auth: 'inicia sesión y maneja credenciales', config: 'elige proyecto, región y otros valores por defecto', projects: 'lista o crea proyectos', storage: 'Cloud Storage: buckets y archivos del lago', dataproc: 'clústeres de Spark administrados', composer: 'Cloud Composer (Airflow administrado)', pubsub: 'Pub/Sub: mensajes en tiempo real', functions: 'Cloud Functions', run: 'Cloud Run: contenedores sin servidores', iam: 'permisos y cuentas de servicio', services: 'activa las APIs que vas a usar', dataflow: 'Dataflow (Apache Beam)', sql: 'Cloud SQL', scheduler: 'tareas programadas', billing: 'facturación', logging: 'logs', secrets: 'Secret Manager', builds: 'Cloud Build', artifacts: 'Artifact Registry' }, opc: OPC_NUBE },
  gsutil: { texto: 'la herramienta clásica de Cloud Storage (copiar y listar archivos de buckets)', sub: { ls: 'lista buckets o archivos', cp: 'copia archivos (de tu computadora al bucket o al revés)', mb: 'crea un bucket', rm: 'borra archivos', rsync: 'sincroniza una carpeta con un bucket' } },
  bq: { texto: 'la CLI de BigQuery', sub: { query: 'ejecuta una consulta SQL', mk: 'crea un dataset o una tabla', ls: 'lista datasets o tablas', load: 'carga un archivo (CSV, Parquet) en una tabla', show: 'muestra el esquema y los datos de una tabla', rm: 'borra un dataset o tabla', head: 'muestra las primeras filas', cp: 'copia una tabla', extract: 'exporta una tabla a Cloud Storage' }, opc: { '--use_legacy_sql=false': 'usa SQL estándar', '--dry_run': 'calcula cuántos bytes leería, sin ejecutar (para saber el costo)', '--location': 'región del dataset' } },
  databricks: { texto: 'la CLI de Databricks: maneja el espacio de trabajo desde la terminal', sub: { auth: 'inicia sesión y guarda el perfil del espacio de trabajo', configure: 'configura el acceso con un token', clusters: 'crea, lista o enciende clústeres', jobs: 'crea, lista o ejecuta jobs (trabajos programados)', fs: 'archivos de DBFS y de los volúmenes de Unity Catalog', workspace: 'notebooks y carpetas del espacio de trabajo', bundle: 'Declarative Automation Bundles: despliega jobs y pipelines como código', secrets: 'guarda secretos para usar desde los notebooks', catalogs: 'catálogos de Unity Catalog', schemas: 'esquemas de Unity Catalog', tables: 'tablas de Unity Catalog', warehouses: 'SQL warehouses', pipelines: 'pipelines declarativos (Lakeflow)', repos: 'carpetas Git del espacio de trabajo', volumes: 'volúmenes de Unity Catalog', grants: 'permisos de Unity Catalog', 'current-user': 'muestra con qué usuario estás conectado' } },
  snowsql: { texto: 'el cliente de Snowflake en la terminal' }, snow: { texto: 'la CLI de Snowflake', sub: { sql: 'ejecuta SQL en Snowflake', connection: 'configura la conexión' } },
  // CLIs del curso
  pedalia: { texto: 'el sistema de la app de Pedalia en la terminal del curso (en una empresa sería su API o una exportación automática)', sub: { exportar: 'genera la exportación de un día, como haría el sistema de la app', estado: 'muestra qué días ya se exportaron y qué falta' } },
  'generar-datos': { texto: 'comando del curso que genera los datos de práctica (tus datos salen de una semilla propia)' },
  'reiniciar-remoto': { texto: 'comando del curso que deja el repositorio remoto de práctica como al principio' },
  conecta: { texto: 'la herramienta de la empresa Conecta en la terminal del curso (simula su sistema interno)' },
  // herramientas de cada empresa de los proyectos (en el curso simulan los sistemas internos; en una empresa serían su portal, su API o un correo de IT)
  conecta: { texto: 'el sistema interno de Conecta en la terminal del curso (en la empresa real serían sus portales y su correo)', sub: { accesos: 'muestra los accesos que te dio IT: servidores, usuarios y dónde están los secretos', correo: 'baja los correos con adjuntos que llegan al buzón del equipo', contratos: 'baja los contratos que publica el área comercial' } },
  sol: { texto: 'el sistema interno de Almacenes del Sol en la terminal del curso', sub: { accesos: 'muestra los accesos que te dio IT', metas: 'baja la planilla de metas que mantiene el área comercial' } },
  red: { texto: 'el sistema interno de Red Analítica en la terminal del curso', sub: { accesos: 'muestra el correo de IT con host, puerto, usuario y la huella del servidor SFTP', 'alta-clave': 'le pide a IT que autorice tu clave SSH pública (nunca la privada)', estado: 'muestra si tu clave ya está autorizada' } },
  ruta: { texto: 'el sistema interno de Ruta Sur en la terminal del curso', sub: { accesos: 'muestra los accesos que te dio IT (la API del TMS y su token)' } },
  cuentas: { texto: 'el sistema interno de Cuentas Claras en la terminal del curso', sub: { accesos: 'muestra los accesos que te dio IT' } },
  mercado: { texto: 'el sistema interno de Mercado Vecino en la terminal del curso', sub: { accesos: 'muestra los accesos que te dio IT' } },
  pagoya: { texto: 'el panel de PagoYa (la pasarela de pagos) en la terminal del curso; en la vida real se configura en su portal web', sub: { webhooks: 'configura o mira los avisos automáticos (webhooks) que PagoYa manda a tu lago con cada pago' } },
  astro: { texto: 'la CLI de Astronomer para correr Airflow en tu computadora con Docker', sub: { dev: 'comandos de desarrollo local (init crea el proyecto, start lo levanta, pytest prueba los DAGs)' } },
  // otros comandos
  java: { texto: 'ejecuta un programa de Java (Spark lo necesita instalado)', opc: { '-version': 'muestra la versión instalada' } },
  'ssh-keygen': { texto: 'crea un par de claves SSH: la privada (queda en tu computadora) y la pública (.pub, la que se comparte)', opc: { '-t': 'el tipo de clave (ed25519 es la recomendada)', '-f': 'dónde guardarla', '-C': 'un comentario para reconocerla (tu correo)' } },
  'ssh-keyscan': { texto: 'obtiene la huella del servidor para compararla con la que te dio IT antes de confiar en él' },
  sftp: { texto: 'se conecta a un servidor SFTP para subir o bajar archivos de forma segura', opc: { '-i': 'la clave privada que usas para entrar', '-P': 'el puerto', '-b': 'ejecuta los comandos de un archivo' } },
  file: { texto: 'dice qué tipo de archivo es y su codificación (UTF-8, Latin-1…)' }, iconv: { texto: 'convierte la codificación de un archivo (por ejemplo, de Latin-1 a UTF-8)', opc: { '-f': 'la codificación de origen', '-t': 'la codificación de destino' } },
  column: { texto: 'acomoda un texto en columnas alineadas', opc: { '-t': 'detecta las columnas', '-s': 'el separador' } }, pdftotext: { texto: 'extrae el texto de un PDF' },
  ln: { texto: 'crea un enlace a un archivo o carpeta', opc: { '-s': 'enlace simbólico (un acceso directo)' } },
  jobs: { texto: 'lista los comandos que dejaste corriendo en segundo plano' }, fg: { texto: 'trae al frente un comando que estaba en segundo plano' }, wait: { texto: 'espera a que terminen los comandos en segundo plano' },
  deactivate: { texto: 'sale del entorno virtual de Python' }, bash: { texto: 'ejecuta un script con Bash (o abre otra terminal Bash)' }, sh: { texto: 'ejecuta un script de shell' },
  set: { texto: 'cambia el comportamiento de la terminal (<code>set -e</code>: un script se detiene en el primer error)' },
  'xcode-select': { texto: 'instala las herramientas de desarrollo de macOS (incluye git)', opc: { '--install': 'abre el instalador' } },
  for: { texto: 'repite los comandos que siguen (entre <code>do</code> y <code>done</code>) una vez por cada elemento de la lista' },
  while: { texto: 'repite los comandos mientras la condición se cumpla' },
  do: { texto: 'empieza el bloque de comandos que se repite (en un for o un while)' }, done: { texto: 'cierra el bloque del for o del while' },
  then: { texto: 'empieza lo que se ejecuta si la condición del if se cumple' }, else: { texto: 'lo que se ejecuta si la condición no se cumple' }, fi: { texto: 'cierra el if' },
  if: { texto: 'ejecuta los comandos que siguen solo si la condición se cumple (termina con <code>fi</code>)' },
};
// alias
D['git-lfs'] = { texto: 'guarda archivos grandes fuera del repositorio de Git' };
D.powershell = { texto: 'abre PowerShell' };

// separa una línea en segmentos unidos por |, &&, || o ; (respetando comillas)
function segmentos(linea) {
  const out = []; let cur = '', q = null;
  for (let i = 0; i < linea.length; i++) {
    const ch = linea[i];
    if (q) { cur += ch; if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    const dos = linea.slice(i, i + 2);
    if (dos === '&&' || dos === '||') { out.push([cur, dos]); cur = ''; i++; continue; }
    if (ch === '|' || ch === ';') { out.push([cur, ch]); cur = ''; continue; }
    cur += ch;
  }
  out.push([cur, '']);
  return out.map(([s, sep]) => [s.trim(), sep]).filter(([s]) => s);
}
function palabras(s) { return (s.match(/"[^"]*"|'[^']*'|\S+/g) || []); }

function explicarSegmento(seg, faltan) {
  let w = palabras(seg);
  while (w.length && /^[A-Z_][A-Z0-9_]*=/.test(w[0])) w.shift();          // VARIABLE=valor comando
  if (w[0] === 'sudo') w = w.slice(1);
  if (!w.length) return null;
  const cmd = w[0].replace(/^\.\//, '');
  const d = D[cmd];
  if (!d) { if (/^[a-z][\w.-]*$/.test(cmd)) faltan.add(cmd); return null; }
  let txt = `${c(cmd)}: ${d.texto}`;
  const resto = w.slice(1);
  // subcomando (la primera palabra que no es una opción); en las nubes puede haber dos niveles (az storage blob)
  const subI = resto.findIndex((x) => !x.startsWith('-'));
  if (d.sub && subI === 0 && d.sub[resto[0]]) {
    txt += `. ${c(resto[0])} ${d.sub[resto[0]]}`;
    const sub2 = resto[1] && !resto[1].startsWith('-') && /^[a-z][a-z0-9-]+$/.test(resto[1]) && ['az', 'aws', 'gcloud', 'databricks', 'gh', 'bq', 'docker'].includes(cmd) ? resto.slice(1, 3).filter((x) => /^[a-z][a-z0-9-]+$/.test(x)) : [];
    if (sub2.length) txt += ` (${c(sub2.join(' '))})`;
  }
  // opciones conocidas
  const opcs = [];
  const tabla = { ...(d.opc || {}) };
  for (const x of resto) {
    const k = x.split('=')[0];
    if ((cmd === 'head' || cmd === 'tail') && /^-\d+$/.test(k)) opcs.push([k, `${cmd === 'head' ? 'las primeras' : 'las últimas'} ${k.slice(1)} líneas`]);
    else if (k.startsWith('-') && tabla[k] && !opcs.some((o) => o[0] === k)) opcs.push([k, tabla[k]]);
    else if (cmd === 'git' && x === '.' && !opcs.some((o) => o[0] === '.')) opcs.push(['.', tabla['.']]);
  }
  if (opcs.length) txt += '. ' + opcs.map(([k, v]) => `${c(k)} = ${v}`).join('; ');
  // redirecciones
  if (/(^|\s)>>(\s|$)/.test(seg)) txt += '. <code>&gt;&gt;</code> agrega al final del archivo';
  else if (/(^|\s)>(\s|$)/.test(seg)) txt += '. <code>&gt;</code> guarda la salida en un archivo (lo reemplaza si existe)';
  if (/<<\s*'?EOF'?/.test(seg)) txt += '. Lo que sigue hasta <code>EOF</code> es el contenido del archivo';
  return txt;
}

// recorre el bloque: une las líneas cortadas con \, salta comentarios y el contenido de los heredoc (<< EOF … EOF)
export function explicarBash(codigo) {
  const faltan = new Set();
  const lineas = [];
  let acum = '', fin = null;
  for (const cruda of String(codigo).split('\n')) {
    if (fin) { if (cruda.trim() === fin) fin = null; continue; }
    const l = cruda.replace(/\s+$/, '');
    if (!acum && (/^\s*#/.test(l) || !l.trim())) continue;
    if (/\\$/.test(l)) { acum += l.slice(0, -1) + ' '; continue; }
    const completa = (acum + l).trim(); acum = '';
    const h = completa.match(/<<-?\s*'?(\w+)'?/); if (h) fin = h[1];
    lineas.push(completa);
  }
  const items = [];
  for (const linea of lineas) {
    const sinComentario = linea.replace(/\s+#\s.*$/, '');
    const comentario = (linea.match(/\s+#\s(.*)$/) || [])[1];
    if (/^(\$|>>>|\.\.\.|[A-Z][a-z]+:)/.test(sinComentario)) continue;   // salidas o pseudo-código
    const partes = segmentos(sinComentario);
    const exp = [];
    partes.forEach(([seg, sep], k) => {
      const e = explicarSegmento(seg, faltan);
      if (e) exp.push(e + (sep === '|' && k < partes.length - 1 ? ' <span class="bx-tubo">→ su salida pasa al siguiente comando</span>' : sep === '&&' ? ' <span class="bx-tubo">→ si sale bien, sigue el próximo</span>' : ''));
    });
    if (!exp.length) continue;
    items.push(`<li><code class="bx-linea">${esc(sinComentario.length > 140 ? sinComentario.slice(0, 137) + '…' : sinComentario)}</code><span>${exp.join('<br>')}${comentario ? `<br><i class="bx-com">Nota del ejemplo: ${esc(comentario)}</i>` : ''}</span></li>`);
  }
  if (!items.length) return { html: '', faltan: [...faltan] };
  return {
    html: `<details class="bx"><summary>🔍 Qué hace cada comando <span>(${items.length})</span></summary><ol>${items.join('')}</ol><p class="bx-donde">Se escribe en la <b>terminal</b>: la del curso (botón ⌨ Terminal) o la de tu computadora — <b>Terminal</b> en macOS, <b>Ubuntu (WSL)</b> o <b>Git Bash</b> en Windows. Escribe una línea y presiona Enter.</p></details>\n`,
    faltan: [...faltan],
  };
}
