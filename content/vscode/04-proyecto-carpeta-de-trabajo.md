---
titulo: Proyecto 1 (guiado paso a paso) - armar y documentar la carpeta de un proyecto nuevo
nivel: 1 · Básico
duracion: 40
resumen: Primer proyecto real. Te sumas a un análisis y te piden dejar lista la carpeta - estructura de carpetas, un README que explique qué es y cómo se usa, un archivo de notas y un primer script que salude y muestre la fecha de corte. Todo desde VS Code, con capturas, y la versión para hacerlo en tu computadora.
objetivos: Crear la estructura de carpetas de un proyecto | Escribir un README útil en Markdown | Crear y ejecutar un primer script de Python | Revisar el trabajo con una lista de control
prerrequisitos: vscode-editar-codigo
autoevaluacion: ¿Sabes crear una estructura de carpetas en VS Code? | ¿Sabes qué va en un README? | ¿Sabes ejecutar un script desde el editor? | ¿Sabes comprobar que todo está guardado?
---

:::escenario El pedido
Mensaje de tu líder: *"Arrancamos el análisis de ventas de diciembre. Armá la carpeta del proyecto en tu máquina: una carpeta para scripts, otra para notas, un README que diga qué es y cómo se corre, y un script de prueba que muestre la fecha de corte (2024-12-31). Así cualquiera del equipo entiende la carpeta al abrirla."*
:::

Proyecto **guiado paso a paso**.

## Paso 1 — Abre VS Code en tu carpeta personal

1. [VS Code de práctica](#/vscode) → **Abrir la carpeta personal (~)**.

## Paso 2 — La estructura

En el explorador, con **Archivo nuevo…** y **Carpeta nueva…**, crea:

```text
analisis_diciembre/
├── README.md
├── notas/
│   └── decisiones.md
└── scripts/
    └── hola.py
```

Truco: en **Archivo nuevo…** escribe directamente `analisis_diciembre/scripts/hola.py` y VS Code crea las carpetas que faltan.

```captura
archivo: vscode/v02-nuevo-archivo.webp
texto: Archivo nuevo… (1) y la fila para escribir la ruta (2)
```

## Paso 3 — El README

Abre `analisis_diciembre/README.md` y escribe:

```text
# Análisis de ventas de diciembre

Resumen de las ventas de diciembre de 2024 por canal, para el comité de enero.

## Cómo se ejecuta

python scripts/hola.py

## Carpetas

- scripts/: el código
- notas/: decisiones y dudas del análisis
```

Guarda con **Ctrl + S**.

:::tip Qué va en un README
Un README responde tres preguntas: **qué es** (una línea), **cómo se usa** (el comando exacto) y **qué hay en cada carpeta**. Es lo primero que lee quien abre el proyecto, incluido tú dentro de tres meses.
:::

## Paso 4 — El script

Abre `analisis_diciembre/scripts/hola.py` y escribe:

```python norun
FECHA_CORTE = "2024-12-31"
print("Análisis de ventas de diciembre")
print(f"Fecha de corte: {FECHA_CORTE}")
```

Guarda y presiona el **▷** de arriba a la derecha del editor (Ejecutar archivo de Python).

```captura
archivo: vscode/v06-ejecutar.webp
texto: El botón Ejecutar (1) corre el archivo y la salida aparece en la terminal (2)
```

La terminal muestra el comando que VS Code ejecutó (`python …/hola.py`) y lo que imprimió el script.

## Paso 5 — Las notas

En `notas/decisiones.md`:

```text
# Decisiones

- 2024-12-31: la fecha de corte del análisis es el 31 de diciembre.
```

## Paso 6 — Revisa antes de avisar

- [ ] La estructura tiene `README.md`, `notas/` y `scripts/`.
- [ ] Ninguna pestaña ni archivo muestra **●** (todo guardado).
- [ ] El README dice qué es, cómo se ejecuta y qué hay en cada carpeta.
- [ ] El script imprime la fecha de corte sin errores.
- [ ] Los nombres no tienen espacios ni tildes.

## 🖥️ Hazlo también en tu computadora

1. Instala VS Code desde code.visualstudio.com (gratis, Windows, Mac y Linux) y Python desde python.org (lección 23).
2. **Archivo → Abrir carpeta…** y elige o crea `analisis_diciembre`.
3. Repite los pasos. La primera vez que abras un `.py`, VS Code te ofrece instalar la extensión de Python: acéptala.

:::ejercicio quiz
¿Qué tres cosas debería responder un README?
- [ ] Autor, fecha y licencia
- [x] Qué es el proyecto, cómo se ejecuta y qué hay en cada carpeta
- [ ] El código completo
- [ ] Los errores conocidos
:::

:::ejercicio quiz
En Archivo nuevo… escribes `analisis_diciembre/scripts/hola.py`. ¿Qué crea VS Code?
- [ ] Solo el archivo, en la raíz
- [x] Las carpetas analisis_diciembre y scripts, y el archivo hola.py adentro
- [ ] Un error
- [ ] Una carpeta llamada hola.py
:::

:::ejercicio quiz
Ejecutas el script escribiendo `python scripts/hola.py` en la terminal y no aparece el cambio que acabas de escribir. ¿Qué es lo más probable?
- [ ] Python está roto
- [x] El archivo no está guardado (la pestaña muestra ●)
- [ ] Falta una extensión
- [ ] La terminal está cerrada
:::
