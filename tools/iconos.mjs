// Biblioteca de íconos de los diagramas -> assets/js/iconos-lib.js
//   - Lucide (licencia ISC): íconos de trazo en una grilla de 24×24.
//   - Simple Icons (CC0): logos de herramientas, rellenos, con su color de marca.
//   - Distintivos propios: sigla + color, para marcas que no están en Simple Icons (AWS, Azure, dbt…).
//   - Trazos propios: los pocos íconos que no tienen un equivalente bueno en Lucide.
// Se incluye una selección de Lucide más todo ícono que usen las lecciones, para no cargar los 2.000.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// nombres en español usados por los diagramas -> ícono de Lucide
export const ALIAS = {
  base: 'database', archivo: 'file-text', archivos: 'files', csv: 'file-spreadsheet', nube: 'cloud', servidor: 'server',
  usuario: 'user', equipo: 'users', movil: 'smartphone', web: 'app-window', engranaje: 'settings', reloj: 'clock',
  transformar: 'funnel', grafico: 'chart-column', dashboard: 'layout-dashboard', stream: 'waves', candado: 'lock',
  llave: 'key-round', tabla: 'table', notebook: 'notebook-pen', codigo: 'code-xml', git: 'git-branch', cubo: 'box',
  capas: 'layers', almacen: 'warehouse', alerta: 'bell-ring', correo: 'mail', lupa: 'search', ml: 'brain-circuit',
  dinero: 'circle-dollar-sign', carrito: 'shopping-cart', camion: 'truck', avion: 'plane', hospital: 'hospital',
  banco: 'landmark', musica: 'music', auto: 'car', telefono: 'phone', energia: 'zap', hotel: 'hotel', escudo: 'shield-check',
  comida: 'utensils', check: 'circle-check', x: 'circle-x', robot: 'bot', cerebro: 'brain', chispa: 'sparkles',
  mensaje: 'message-square-text', documento: 'file-text', carpeta: 'folder', vector: 'scatter-chart', cola: 'list-ordered',
  monitor: 'activity', cache: 'memory-stick', reglas: 'list-checks', calendario: 'calendar-clock', webhook: 'webhook',
  internet: 'globe', red: 'network', flujo: 'workflow', etiqueta: 'tag', libro: 'book-open', terminal: 'square-terminal',
  prueba: 'flask-conical', bug: 'bug', costo: 'receipt', velocidad: 'gauge', fabrica: 'factory', tienda: 'store',
};

// íconos de trazo propios (grilla 24×24) que conviene conservar
export const TRAZOS = {
  bucket: 'M3 6h18l-2.2 14.2a1 1 0 0 1-1 .8H6.2a1 1 0 0 1-1-.8z M3 6c0-1.4 4-2.5 9-2.5S21 4.6 21 6 M7 11h10',
  json: 'M9 4c-2 0-3 1-3 3v2c0 1.5-1 2.5-2 3 1 .5 2 1.5 2 3v2c0 2 1 3 3 3 M15 4c2 0 3 1 3 3v2c0 1.5 1 2.5 2 3-1 .5-2 1.5-2 3v2c0 2-1 3-3 3',
  api: 'M9 4c-2 0-3 1-3 3v2c0 1.5-1 2.5-2 3 1 .5 2 1.5 2 3v2c0 2 1 3 3 3 M15 4c2 0 3 1 3 3v2c0 1.5 1 2.5 2 3-1 .5-2 1.5-2 3v2c0 2-1 3-3 3 M10 12h.01 M14 12h.01',
  spark: 'M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z M19 3v4 M17 5h4',
  lambda: 'M5 21l6.5-11 M7 3h3l9 18',
  orquestador: 'M12 12c0-4 1.5-8 5-9-0.5 4-2 7-5 9z M12 12c4 0 8 1.5 9 5-4-.5-7-2-9-5z M12 12c0 4-1.5 8-5 9 .5-4 2-7 5-9z M12 12c-4 0-8-1.5-9-5 4 .5 7 2 9 5z',
};

// logos de Simple Icons: nombre corto -> slug
export const MARCAS = {
  databricks: 'databricks', spark: 'apachespark', kafka: 'apachekafka', airflow: 'apacheairflow', snowflake: 'snowflake',
  bigquery: 'googlebigquery', gcp: 'googlecloud', googlecloud: 'googlecloud', postgres: 'postgresql', python: 'python',
  docker: 'docker', terraform: 'terraform', github: 'github', duckdb: 'duckdb', mlflow: 'mlflow', pandas: 'pandas',
  jupyter: 'jupyter', flink: 'apacheflink', kubernetes: 'kubernetes', anthropic: 'anthropic', claude: 'claude',
  huggingface: 'huggingface', langchain: 'langchain', looker: 'looker', mysql: 'mysql', mongodb: 'mongodb', redis: 'redis',
  elasticsearch: 'elasticsearch', githubactions: 'githubactions', parquet: 'apacheparquet', linux: 'linux',
  gemini: 'googlegemini', ollama: 'ollama', streamlit: 'streamlit', fastapi: 'fastapi', polars: 'polars',
  hadoop: 'apachehadoop', grafana: 'grafana', prometheus: 'prometheus', cassandra: 'apachecassandra', trino: 'trino',
  clickhouse: 'clickhouse', airbyte: 'airbyte', metabase: 'metabase', superset: 'apachesuperset', pubsub: 'googlepubsub',
  dataproc: 'googledataproc', jenkins: 'jenkins', gitlab: 'gitlab', hive: 'apachehive', nifi: 'apachenifi',
  prefect: 'prefect', sqlite: 'sqlite', jira: 'jira', googleanalytics: 'googleanalytics', stripe: 'stripe',
};

// distintivos propios: [sigla, color de fondo]. No imitan logos: son una sigla en el color de la marca.
export const SIGLAS = {
  aws: ['aws', '#232F3E'], azure: ['Az', '#0078D4'], fabric: ['Fab', '#117865'], onelake: ['OL', '#117865'],
  dbt: ['dbt', '#FF694B'], iceberg: ['ICE', '#2C6FB7'], delta: ['Δ', '#00ADD4'], unity: ['UC', '#FF3621'],
  openai: ['AI', '#111111'], powerbi: ['BI', '#F2C811'], tableau: ['T+', '#E97627'], salesforce: ['SF', '#00A1E0'],
  sqlserver: ['SQL', '#CC2927'], s3: ['S3', '#3F8624'], glue: ['Glue', '#8C4FFF'], athena: ['Ath', '#8C4FFF'],
  redshift: ['RS', '#8C4FFF'], kinesis: ['Kin', '#8C4FFF'], emr: ['EMR', '#8C4FFF'], bedrock: ['BR', '#01A88D'],
  sagemaker: ['SM', '#01A88D'], lambdaaws: ['λ', '#ED7100'], stepfunctions: ['SF', '#E7157B'], iam: ['IAM', '#DD344C'],
  adls: ['ADLS', '#0078D4'], adf: ['ADF', '#0078D4'], synapse: ['Syn', '#0078D4'], eventhubs: ['EH', '#0078D4'],
  keyvault: ['KV', '#0078D4'], entra: ['ID', '#0078D4'], foundry: ['AIF', '#5C2D91'], aisearch: ['Srch', '#0078D4'],
  gcs: ['GCS', '#4285F4'], dataflow: ['DF', '#4285F4'], vertex: ['AI', '#4285F4'], composer: ['Cmp', '#4285F4'],
  dataform: ['Dfm', '#4285F4'], spanner: ['Spn', '#4285F4'], bigtable: ['BT', '#4285F4'], genie: ['Gen', '#FF3621'],
  vectorsearch: ['VS', '#FF3621'], lakeflow: ['LF', '#FF3621'], fivetran: ['5T', '#0073FF'], slack: ['#', '#4A154B'],
};

// selección de Lucide para datos, nube, IA y negocio (las que no existan en la versión instalada se ignoran)
const SELECCION = `database database-zap database-backup server server-cog cloud cloud-upload cloud-download cloud-cog hard-drive
file file-text files file-spreadsheet file-json file-code file-search folder folder-open archive table table-2 sheet layers boxes box
package container cpu brain brain-circuit bot bot-message-square sparkles wand-sparkles message-square message-square-text messages-square
search scan-search text-search funnel git-branch git-merge git-pull-request git-fork git-compare workflow network share-2 link
arrow-right-left repeat refresh-cw rotate-ccw history clock timer calendar calendar-clock alarm-clock hourglass bell bell-ring mail send inbox
user users user-cog user-check users-round contact id-card handshake shield shield-check shield-alert lock lock-keyhole unlock key key-round
fingerprint eye eye-off scan-eye badge-check circle-check circle-x circle-alert triangle-alert octagon-x check x info circle-help settings
settings-2 cog sliders-horizontal wrench hammer gauge activity chart-line chart-column chart-bar chart-pie chart-area chart-scatter
scatter-chart trending-up trending-down layout-dashboard presentation monitor laptop smartphone tablet globe app-window code code-xml braces
terminal square-terminal binary variable square-function sigma calculator hash tag tags bookmark book-open notebook notebook-pen notebook-text
library graduation-cap lightbulb zap flame rocket plug plug-zap cable radio radio-tower wifi satellite waves siren construction factory
warehouse store shopping-cart shopping-bag credit-card wallet banknote receipt receipt-text circle-dollar-sign dollar-sign coins piggy-bank
landmark building building-2 hospital hotel plane truck car bike bus ship train-front map map-pin route waypoints navigation compass utensils
pizza coffee music headphones phone video camera image mic film heart-pulse stethoscope pill scale gavel briefcase clipboard-list
clipboard-check list-checks list-todo list-ordered kanban ticket trash-2 recycle leaf sun thermometer droplets puzzle shapes component
blocks merge split combine shuffle arrow-up-down group ungroup diff undo-2 save download upload import log-in log-out external-link webhook
router memory-stick microchip battery power bug flask-conical microscope target crosshair flag milestone signpost spline quote languages
audio-lines speech scan-text scan-face award medal trophy star thumbs-up thumbs-down smile frown goal crown`.split(/\s+/).filter(Boolean);

function lucide(nombre, dir) {
  const f = path.join(dir, nombre + '.svg');
  if (!fs.existsSync(f)) return null;
  return fs.readFileSync(f, 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
    .replace(/\s*\n\s*/g, '').trim();
}

// usados: nombres que aparecen en "icono=" de las lecciones. Devuelve el conjunto de nombres válidos.
export function generarIconos(ROOT, usados = []) {
  const dir = path.join(ROOT, 'node_modules/lucide-static/icons');
  const si = require(path.join(ROOT, 'node_modules/simple-icons'));
  const porSlug = Object.fromEntries(Object.values(si).filter((x) => x && x.slug).map((x) => [x.slug, x]));
  const out = { lucide: {}, trazos: TRAZOS, alias: ALIAS, marcas: {}, siglas: SIGLAS };
  const pedir = new Set([...SELECCION, ...Object.values(ALIAS), ...usados.filter((n) => !ALIAS[n] && !TRAZOS[n] && !MARCAS[n] && !SIGLAS[n])]);
  for (const n of pedir) { const svg = lucide(n, dir); if (svg) out.lucide[n] = svg; }
  for (const [k, slug] of Object.entries(MARCAS)) {
    const x = porSlug[slug];
    if (!x) throw new Error(`Simple Icons no tiene el ícono "${slug}"`);
    out.marcas[k] = { path: x.path, hex: '#' + x.hex, titulo: x.title };
  }
  for (const [a, l] of Object.entries(ALIAS)) if (!out.lucide[l]) throw new Error(`El alias "${a}" apunta al ícono de Lucide "${l}", que no existe`);
  fs.writeFileSync(path.join(ROOT, 'assets/js/iconos-lib.js'),
    '// Archivo generado por tools/iconos.mjs. Íconos: Lucide (ISC, lucide.dev) y Simple Icons (CC0, simpleicons.org).\n' +
    'window.ICONOS_LIB = ' + JSON.stringify(out) + ';\n');
  return new Set([...Object.keys(out.lucide), ...Object.keys(TRAZOS), ...Object.keys(ALIAS), ...Object.keys(out.marcas), ...Object.keys(SIGLAS)]);
}
