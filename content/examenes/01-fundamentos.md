# examen: fundamentos

## Rol del data engineer
leccion: fundamentos-bienvenida
Una empresa tiene ventas en una base PostgreSQL, campañas en una API de marketing y un tablero que hoy se arma a mano en Excel cada lunes. ¿Qué parte de ese trabajo le corresponde **principalmente** a un ingeniero de datos?
- [ ] Decidir qué campañas de marketing conviene seguir financiando, ya que es quien mejor conoce los datos.
- [x] Construir el pipeline que lleva los datos de la base y la API a un lugar central, limpios y a tiempo.
- [ ] Diseñar los gráficos del tablero, porque el tablero es el producto final de los datos.
- [ ] Entrenar un modelo que prediga las ventas, porque es la parte técnica más compleja del proyecto.
porque: El ingeniero de datos construye la "tubería": extraer de las fuentes, transformar y dejar los datos confiables y a tiempo donde se usan. Decidir campañas es del negocio o analistas, el diseño del tablero es de BI y entrenar modelos es de data science (que **usa** los datos que prepara el ingeniero).

## ETL vs. ELT
leccion: fundamentos-bienvenida
¿Cuál es la diferencia entre ETL y ELT?
- [ ] En ETL los datos se transforman en el origen; en ELT nunca se transforman, solo se copian tal cual.
- [x] En ETL se transforma antes de cargar; en ELT se carga lo crudo y se transforma en el destino.
- [ ] ETL se usa para datos en tiempo real y ELT para cargas batch nocturnas en el warehouse.
- [ ] Son sinónimos: los proveedores usan una u otra sigla, pero el proceso es exactamente el mismo.
porque: El orden de las letras es el orden de los pasos. ELT se volvió el estándar con los warehouses en la nube: cargas lo crudo (barato y reprocesable) y transformas con SQL dentro del warehouse, por ejemplo con dbt.

## Formatos de archivo
leccion: fundamentos-datos-y-formatos
Tienes una tabla de 500 millones de filas y 80 columnas, y casi todas las consultas leen 3 o 4 columnas. ¿Qué formato conviene para guardarla en el data lake?
- [ ] CSV, porque al ser texto plano cualquier motor lo lee rápido y se puede abrir con Excel.
- [ ] JSON, porque guarda el nombre de cada campo en cada fila y así se leen solo los campos usados.
- [x] Parquet, porque es columnar y comprimido: se leen solo las columnas usadas.
- [ ] TXT separado por tabulaciones, porque ocupa menos que CSV y se procesa en paralelo.
porque: En un formato **columnar** como Parquet, los valores de cada columna se guardan juntos: leer 4 de 80 columnas significa leer una fracción del archivo, y además se comprime muy bien. CSV y JSON obligan a leer todas las filas completas.

## JSON
leccion: fundamentos-datos-y-formatos
¿Qué ventaja tiene JSON frente a CSV?
- [ ] Ocupa menos espacio que CSV porque no repite separadores en cada fila del archivo.
- [ ] Se lee más rápido en consultas analíticas porque cada campo tiene nombre.
- [x] Puede representar datos anidados, como un pedido con su lista de ítems.
- [ ] Tiene tipos de dato estrictos que se validan al escribir, como en una base de datos.
porque: JSON representa estructuras anidadas de forma natural, por eso lo usan casi todas las APIs. CSV es plano (una fila, columnas simples). JSON ocupa más (repite los nombres de los campos) y sus tipos son básicos (texto, número, booleano, null, lista y objeto).

## Rutas en la terminal
leccion: fundamentos-terminal
Estás en `/home/ana/proyecto/datos` y ejecutas `cd ../scripts`. ¿Dónde quedas?
- [ ] `/home/ana/proyecto/datos/scripts`
- [x] `/home/ana/proyecto/scripts`
- [ ] `/home/ana/scripts`
- [ ] `/scripts`
porque: `..` es la carpeta de arriba (`/home/ana/proyecto`) y desde ahí entras a `scripts`. Las rutas que no empiezan con `/` son **relativas** a donde estás.

## Tuberías
leccion: fundamentos-terminal
¿Qué hace `grep "Lima" ventas.csv | wc -l`?
- [ ] Borra de `ventas.csv` las líneas que contienen "Lima" y muestra cuántas quedaron.
- [x] Cuenta cuántas líneas de `ventas.csv` contienen "Lima".
- [ ] Guarda las líneas de Lima en un archivo nuevo llamado `wc` y muestra su tamaño.
- [ ] Muestra las primeras líneas de Lima, ordenadas por cantidad de palabras.
porque: `grep` filtra las líneas que contienen el texto y la tubería `|` pasa esa salida como entrada a `wc -l`, que cuenta líneas.

## Redirecciones
leccion: fundamentos-terminal
¿Cuál es la diferencia entre `echo hola > notas.txt` y `echo hola >> notas.txt`?
- [ ] No hay diferencia: `>>` es la forma antigua de escribir `>` y se mantiene por compatibilidad.
- [x] `>` reemplaza el contenido del archivo; `>>` agrega al final.
- [ ] `>` agrega al final del archivo; `>>` lo reemplaza por completo.
- [ ] `>>` escribe en el archivo y en la pantalla a la vez; `>` solo en el archivo.
porque: `>` sobrescribe (si el archivo tenía algo, se pierde) y `>>` agrega. Confundirlos es una forma clásica de borrar un log sin querer.

## Flujo de Git
leccion: fundamentos-git
Modificaste `limpieza.py` y quieres guardar ese cambio en la historia de Git. ¿Cuál es el orden correcto?
- [ ] `git commit -m "..."` → `git add limpieza.py` → `git push`
- [x] `git add limpieza.py` → `git commit -m "..."` → `git push`
- [ ] `git push` → `git add limpieza.py` → `git commit -m "..."`
- [ ] `git add limpieza.py` → `git push` → `git commit -m "..."`
porque: Primero preparas el cambio (`add`, lo pones en el área de preparación), después sacas la "foto" (`commit`) y por último la subes al repositorio remoto (`push`).

## Ramas
leccion: fundamentos-git
¿Para qué se crea una rama nueva antes de hacer un cambio?
- [ ] Para que Git ocupe menos espacio, porque cada rama guarda solo los archivos que cambian.
- [x] Para trabajar aislado de `main` y revisar el cambio en un pull request antes de fusionarlo.
- [ ] Porque Git no permite hacer commits directamente en `main` sin una rama intermedia.
- [ ] Para guardar una copia de seguridad del repositorio en caso de que se borre `main`.
porque: Una rama es una línea de trabajo separada: puedes experimentar sin romper `main`, otra persona revisa el cambio en un pull request y recién entonces se fusiona.

## .gitignore
leccion: fundamentos-git
Subiste por error un archivo `.env` con la contraseña de la base de datos a GitHub. Lo agregas al `.gitignore` y haces un commit que lo borra. ¿El problema está resuelto?
- [ ] Sí: al borrar el archivo con un commit, GitHub elimina también las versiones anteriores.
- [ ] Sí: al agregarlo al `.gitignore`, Git lo quita de todos los commits anteriores.
- [x] No: sigue en la historia de commits; hay que cambiar la contraseña cuanto antes.
- [ ] No: hay que borrar el repositorio, aunque la contraseña sigue siendo segura de usar.
porque: Git guarda toda la historia: cualquiera puede ver el commit anterior. Un secreto que llegó a Git se considera filtrado y se debe rotar. El `.gitignore` solo evita que se agregue en el futuro.
