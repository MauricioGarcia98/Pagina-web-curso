---
titulo: Tu computadora por dentro - archivos, carpetas, extensiones y rutas
nivel: Básico
duracion: 30
resumen: Antes de programar, entender cómo guarda las cosas tu computadora. Todo lo demás se apoya en esto.
objetivos: Explicar qué es un archivo y qué es una carpeta | Reconocer la extensión de un archivo y qué te dice | Leer una ruta completa y saber dónde está un archivo | Distinguir una ruta absoluta de una relativa | Ver archivos ocultos y entender por qué existen | Usar los atajos de teclado que vas a usar todos los días
autoevaluacion: ¿Puedes explicar con tus palabras qué es una carpeta? | ¿Sabes qué te dice la extensión `.csv` de un archivo? | Dada la ruta `/home/ana/datos/ventas.csv`, ¿sabes en qué carpeta está el archivo? | ¿Sabes la diferencia entre una ruta absoluta y una relativa? | ¿Sabes por qué algunos archivos empiezan con un punto? | ¿Usas Ctrl+C, Ctrl+V, Ctrl+Z y Ctrl+F sin pensarlo?
---

:::escenario Una carpeta compartida
Ahora que sabes qué son una carpeta, una ruta, un archivo y una extensión, mira cómo aparecen juntos en un mensaje de trabajo. Imagina que ya trabajas en datos y Martín, tu líder, te escribe:

> "Te dejé el archivo de ventas en la carpeta compartida, en `datos/2024/diciembre/ventas.csv`. Ábrelo y dime cuántas filas tiene."

Con lo que viste puedes leerlo entero: `datos`, `2024` y `diciembre` son carpetas, una dentro de otra; `ventas.csv` es el archivo, y su extensión `.csv` te dice que es una tabla de texto separada por comas.
:::

## Qué es un archivo

Un **archivo** es un paquete de información guardado con un nombre: una foto, una canción, una planilla de Excel, un documento de Word, un programa. Por dentro, todo archivo es una larga fila de números (unos y ceros); lo que cambia es **cómo hay que leerlos**.

:::analogia Cajas con etiqueta
Piensa en los archivos como cajas cerradas con una etiqueta. La etiqueta dice qué hay adentro y cómo usarlo: "fotos de las vacaciones", "facturas de marzo". Sin etiqueta, abrirías la caja y verías un montón de cosas sin saber qué hacer con ellas.
:::

## La extensión: el apellido del archivo

El nombre de un archivo suele tener dos partes separadas por un punto: `ventas.csv`, `informe.pdf`, `foto.jpg`. Lo que va después del último punto es la **extensión**. Le dice a la computadora (y a ti) **qué tipo de contenido** hay adentro y con qué programa abrirlo.

| Extensión | Qué es | Con qué se abre | ¿La vas a usar en datos? |
|---|---|---|---|
| `.csv` | Tabla en texto: filas y columnas separadas por comas | Excel, un editor de texto, Python, SQL | **Todo el tiempo** |
| `.json` | Datos en texto con llaves `{ }`, como los que devuelven las APIs | Editor de texto, Python | **Todo el tiempo** |
| `.parquet` | Tabla comprimida en formato binario, muy rápida | Python, Spark, DuckDB | Mucho, en datos grandes |
| `.sql` | Una consulta o script de SQL (texto) | Editor de código | Siempre |
| `.py` | Un programa de Python (texto) | Editor de código | Siempre |
| `.txt`, `.log` | Texto plano; los `.log` guardan lo que pasó en un programa | Editor de texto | Muy seguido (para encontrar errores) |
| `.xlsx` | Planilla de Excel | Excel, Google Sheets | A veces (llegan de las áreas de negocio) |
| `.zip`, `.gz` | Archivo comprimido: uno o varios archivos "aplastados" para ocupar menos | Descompresor | Seguido |
| `.md` | Texto con formato simple (Markdown), como los README | Editor, GitHub | Siempre |

:::cuidado Windows esconde las extensiones
Windows, por defecto, **oculta** las extensiones: ves `ventas` en vez de `ventas.csv`. Para trabajar con datos conviene verlas siempre. En el Explorador de archivos: menú **Ver → Mostrar → Extensiones de nombre de archivo**. En macOS: Finder → Ajustes → Avanzado → *Mostrar todas las extensiones*.
:::

:::nota Texto o binario
Hay archivos de **texto** (`.csv`, `.json`, `.py`, `.sql`, `.md`, `.log`): si los abres con un editor de texto, los puedes leer. Y hay archivos **binarios** (`.parquet`, `.xlsx`, `.zip`, `.jpg`): si los abres con un editor de texto ves símbolos sin sentido, porque necesitan un programa que sepa interpretarlos. No están rotos: están en otro idioma.
:::

## Carpetas: cajas dentro de cajas

Una **carpeta** (o *directorio*, que es lo mismo) es un contenedor de archivos y de **otras carpetas**. Así se arma un árbol:

```text norun
/                       ← la raíz: la carpeta que contiene todo
└── home
    └── ana             ← tu carpeta personal
        ├── datos
        │   ├── clientes.csv
        │   └── 2024
        │       └── diciembre
        │           └── ventas.csv
        └── informe.md
```

Cada carpeta puede tener adentro archivos y más carpetas, sin límite. Al principio de todo hay una carpeta que contiene a todas las demás: la **raíz**.

## Rutas: la dirección de un archivo

Una **ruta** (*path*, en inglés) es la dirección completa para llegar a un archivo, carpeta por carpeta, como la dirección de una casa: país, ciudad, calle, número.

```text norun
/home/ana/datos/2024/diciembre/ventas.csv
│ │    │   │     │    │         └── el archivo
│ │    │   │     │    └── carpeta "diciembre"
│ │    │   │     └── carpeta "2024"
│ │    │   └── carpeta "datos"
│ │    └── carpeta personal de ana
│ └── carpeta "home"
└── la raíz
```

Cada `/` separa una carpeta de la siguiente. Se lee de izquierda a derecha: "desde la raíz, entra a `home`, después a `ana`, después a `datos`…".

:::nota En Windows las rutas se ven distinto
En Windows la raíz es una letra de disco y las barras van al revés: `C:\Users\Ana\datos\ventas.csv`. La idea es exactamente la misma. En este curso usamos el estilo de Linux y macOS (`/`), que es el que usan los servidores, la nube y las herramientas de datos. Si usas Windows, vas a trabajar con **WSL**, que es un Linux dentro de Windows (lo vemos en el módulo "Desde tu computadora").
:::

### Ruta absoluta y ruta relativa

- Una ruta **absoluta** empieza desde la raíz (`/`) y funciona desde cualquier lugar: `/home/ana/datos/clientes.csv`.
- Una ruta **relativa** empieza desde **donde estás parado**: si ya estás en `/home/ana`, el mismo archivo es `datos/clientes.csv`.

:::analogia Indicaciones para llegar
La absoluta es la dirección completa: "Av. Libertador 1200, Buenos Aires, Argentina". Sirve desde cualquier parte del mundo. La relativa es "dos cuadras a la derecha": solo sirve si sabes desde dónde sale la persona.
:::

Tres atajos que vas a ver todo el tiempo:

| Símbolo | Significa | Ejemplo |
|---|---|---|
| `.` | La carpeta donde estás | `./script.sh` = "el script que está acá" |
| `..` | La carpeta de arriba (la "madre") | `cd ..` = subir un nivel |
| `~` | Tu carpeta personal | `~/datos` = `/home/ana/datos` |

## Archivos ocultos

Los archivos y carpetas cuyo nombre **empieza con un punto** (`.bashrc`, `.git`, `.env`) están **ocultos**: no se muestran a menos que lo pidas. No son secretos; se ocultan porque son configuración que no se toca todos los días y estorbaría verlos. En datos vas a cruzarte seguido con tres:

- `.git`: la carpeta donde Git guarda toda la historia de un proyecto.
- `.env`: un archivo con contraseñas y claves. **Nunca** se sube a internet.
- `.venv`: el "entorno virtual" de un proyecto de Python (sus librerías).

## Comprimir y descomprimir

Un `.zip` es una caja que contiene uno o varios archivos "aplastados" para que ocupen menos y viajen juntos. Para usarlos hay que **descomprimirlos** (en Windows: clic derecho → *Extraer todo*; en macOS: doble clic; en la terminal: `unzip archivo.zip`). Los datos suelen llegar comprimidos: un CSV de 1 GB puede ocupar 150 MB en `.zip` o `.gz`.

## Los atajos de teclado que usa todo el mundo

Programar es mucho teclado. Estos atajos te ahorran horas (en macOS, cambia **Ctrl** por **Cmd**):

| Atajo | Qué hace |
|---|---|
| Ctrl + C / Ctrl + V | Copiar / pegar |
| Ctrl + X | Cortar |
| Ctrl + Z / Ctrl + Y | Deshacer / rehacer |
| Ctrl + A | Seleccionar todo |
| Ctrl + F | Buscar en la página o el archivo |
| Ctrl + S | Guardar |
| Alt + Tab | Cambiar de ventana |
| Ctrl + Enter | En este sitio: **ejecutar** el código del editor |

:::cuidado En la terminal, Ctrl + C no copia
En la terminal, **Ctrl + C detiene el programa que se está ejecutando**. Para copiar en la terminal se usa Ctrl + Shift + C (y Ctrl + Shift + V para pegar). Parece raro, pero es así por una razón histórica: Ctrl + C ya significaba "cancelar" mucho antes de que existiera el copiar y pegar.
:::

## Practica

Los ejercicios con terminal se escriben en la terminal que aparece debajo del enunciado. No te preocupes por romper algo: es una terminal de práctica.

:::errores
- **"No encuentro el archivo"**: casi siempre es una ruta relativa usada desde otra carpeta. Revisa dónde estás.
- **Llamar `ventas` a un archivo que en realidad es `ventas.csv.txt`**: pasa cuando Windows esconde las extensiones. Actívalas.
- **Espacios y tildes en los nombres** (`Ventas Diciembre Año.csv`): funcionan, pero en la terminal y en el código te van a complicar. Usa minúsculas, sin tildes y con guion bajo: `ventas_diciembre_2024.csv`.
:::

:::trabajo
En un equipo de datos, la forma de nombrar carpetas y archivos se acuerda entre todos (por ejemplo `datos/AAAA/MM/DD/tabla.parquet`). Esa convención hace que los programas encuentren solos los archivos de cada día. Respetarla es parte del trabajo.
:::

:::ejercicio quiz
En el archivo `reporte_marzo.csv`, ¿qué te dice la parte `.csv`?
- [ ] La fecha en que se creó el archivo
- [x] El tipo de contenido: una tabla en texto con valores separados por comas
- [ ] Que el archivo está comprimido
- [ ] Que solo se puede abrir con Excel
```explicacion
La extensión indica el formato. Un `.csv` es texto plano con filas y columnas separadas por comas: se puede abrir con Excel, con un editor de texto, con Python o cargar en una base de datos.
```
:::

:::ejercicio quiz
Dada la ruta `/home/ana/datos/2024/ventas.csv`, ¿en qué carpeta está el archivo `ventas.csv`?
- [ ] En `home`
- [ ] En `ana`
- [x] En `2024`, que está dentro de `datos`
- [ ] En la raíz
```explicacion
La carpeta que contiene al archivo es la que está justo antes de su nombre: `2024`. Y `2024` está dentro de `datos`, que está dentro de `ana`, y así hacia atrás hasta la raíz.
```
:::

:::ejercicio quiz
¿Cuál de estas rutas es **absoluta**?
- [ ] `datos/clientes.csv`
- [ ] `../logs/pipeline.log`
- [x] `/home/ana/datos/clientes.csv`
- [ ] `./script.sh`
```explicacion
Una ruta absoluta empieza en la raíz, con `/`. Las demás son relativas: dependen de la carpeta en la que estés.
```
:::

:::ejercicio quiz
Abres un archivo `.parquet` con el Bloc de notas y ves símbolos raros. ¿Qué pasó?
- [ ] El archivo está dañado
- [ ] Hay que cambiarle la extensión a `.txt`
- [x] Es un formato binario: hay que abrirlo con un programa que lo entienda, como Python o DuckDB
- [ ] Falta descomprimirlo
```explicacion
Parquet es binario: está pensado para que lo lean programas de datos, no personas. No está roto. Cambiarle la extensión no cambia su contenido.
```
:::

:::ejercicio quiz
Estás en la terminal y un comando no termina nunca. ¿Qué haces para detenerlo?
- [ ] Ctrl + Z
- [x] Ctrl + C
- [ ] Ctrl + S
- [ ] Cerrar el navegador
```explicacion
En la terminal, **Ctrl + C** interrumpe el programa que se está ejecutando. Es el freno de mano: vas a usarlo muchísimo.
```
:::

:::ejercicio cli
Muestra **en qué carpeta estás** ahora mismo. (Pista: el comando es la sigla de *print working directory*).
```respuesta
pwd
```
```solucion
pwd
```
```pista
Son tres letras: p, w, d.
```
:::

:::ejercicio cli
Lista qué hay dentro de la carpeta `datos`.
```respuesta
ls (\./)?datos/?
ls -\w+ (\./)?datos/?
```
```solucion
ls datos
```
```pista
`ls` lista el contenido de una carpeta. Escribe `ls` seguido del nombre de la carpeta.
```
:::

:::ejercicio cli
Lista **todos** los archivos de tu carpeta personal, **incluidos los ocultos** (los que empiezan con punto).
```respuesta
ls -a
ls -la
ls -al
ls -a ~
ls -la ~
ls -al ~
ls -A
```
```solucion
ls -a
```
```pista
La opción `-a` de `ls` significa *all*: todo, también lo oculto.
```
:::

:::ejercicio cli
Entra a la carpeta `datos` usando una ruta **relativa**.
```respuesta
cd (\./)?datos/?
```
```solucion
cd datos
```
```pista
`cd` significa *change directory*. Como estás en tu carpeta personal y `datos` está ahí, alcanza con su nombre.
```
:::

:::ejercicio cli
Vuelve a tu carpeta personal desde donde estés, usando el atajo `~`.
```respuesta
cd ~/?
cd
cd \$HOME
```
```solucion
cd ~
```
:::
