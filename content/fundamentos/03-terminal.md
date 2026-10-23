---
titulo: La terminal sin miedo
nivel: Básico
duracion: 25
resumen: Qué es la línea de comandos y los 15 comandos que vas a usar siempre.
---

La **terminal** (o consola, o línea de comandos) es una ventana donde le das órdenes a la computadora escribiendo, en vez de hacer clics. Parece antigua, pero los ingenieros de datos la usan todo el día: para Git, Azure CLI, Databricks CLI, dbt, Airflow…

:::nota ¿Dónde está la terminal?
- **Windows**: instala *Windows Terminal* y usa **WSL** (Ubuntu dentro de Windows) o *Git Bash*. PowerShell también sirve, pero algunos comandos cambian.
- **macOS**: aplicación *Terminal* (o iTerm2).
- **Linux**: ya la tienes (Ctrl + Alt + T).

En este curso usamos comandos de **bash**, el estándar en servidores y en la nube.
:::

## Anatomía de un comando

```bash norun
ls -l --all /home/ana
```

- `ls` → el **programa** (listar archivos).
- `-l` → una **opción corta** (formato largo).
- `--all` → una **opción larga** (mostrar ocultos).
- `/home/ana` → un **argumento** (sobre qué carpeta).

El símbolo `$` que verás al inicio de las líneas solo indica “escribe aquí”; **no** se escribe.

## Moverse por las carpetas

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `pwd` | Muestra en qué carpeta estás (*print working directory*) | `pwd` → `/home/ana` |
| `ls` | Lista el contenido | `ls -la` |
| `cd` | Cambia de carpeta | `cd proyectos`, `cd ..` (subir), `cd ~` (inicio) |
| `mkdir` | Crea una carpeta | `mkdir -p datos/crudos` |
| `touch` | Crea un archivo vacío | `touch notas.txt` |
| `cp` | Copia | `cp ventas.csv respaldo.csv` |
| `mv` | Mueve o renombra | `mv viejo.csv nuevo.csv` |
| `rm` | Borra (¡sin papelera!) | `rm archivo.csv`, `rm -r carpeta` |

:::cuidado rm no perdona
`rm -rf` borra todo sin preguntar y sin papelera de reciclaje. Revisa dos veces antes de presionar Enter.
:::

## Mirar archivos

| Comando | Qué hace |
|---|---|
| `cat archivo` | Muestra todo el archivo |
| `head -n 5 archivo` | Las primeras 5 líneas |
| `tail -n 5 archivo` | Las últimas 5 líneas (`tail -f` sigue un log en vivo) |
| `wc -l archivo` | Cuenta líneas |
| `less archivo` | Navega un archivo grande (salir con `q`) |
| `grep texto archivo` | Busca líneas que contienen un texto |

## Tuberías (pipes) y redirección

La barra vertical `|` envía la salida de un comando como entrada del siguiente. Es la idea central de un *pipeline*, ¡en miniatura!

```bash norun
# ¿Cuántas líneas de ventas.csv mencionan "Chile"?
grep "Chile" ventas.csv | wc -l

# Guardar el resultado en un archivo (> sobrescribe, >> agrega al final)
grep "Chile" ventas.csv > ventas_chile.csv
```

## Variables de entorno

Son valores que los programas leen del sistema, muy usados para configuraciones y secretos.

```bash norun
export AMBIENTE=desarrollo
echo $AMBIENTE        # imprime: desarrollo
```

:::tip Truco de supervivencia
- <kbd>Tab</kbd> autocompleta nombres de archivos y comandos.
- <kbd>↑</kbd> recupera el comando anterior.
- <kbd>Ctrl</kbd> + <kbd>C</kbd> cancela lo que se está ejecutando.
- `comando --help` o `man comando` muestran la ayuda.
:::

## Practica

Cada ejercicio trae su propia **terminal**: escribe el comando y presiona Enter. Se ejecuta de verdad sobre una máquina simulada (la misma del **Laboratorio → Terminal**), que ya tiene archivos en las carpetas `datos/` y `logs/`. Puedes explorar con `ls` antes de responder.

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
