---
titulo: Problemas y calidad de código - el panel de problemas, ruff y el estilo que espera un equipo
nivel: 3 · Intermedio
duracion: 45
resumen: VS Code marca los errores antes de que ejecutes. Cómo leer los subrayados y el panel de Problemas, ir de un problema a su línea, usar ruff para encontrar imports que sobran, nombres sin definir y problemas de estilo, corregir automáticamente con --fix, formatear con ruff format y por qué un equipo acuerda un estilo común.
objetivos: Leer los subrayados y el panel de Problemas | Saltar de un problema a la línea del código | Revisar un archivo o proyecto con ruff check | Corregir y formatear automáticamente con ruff check --fix y ruff format | Explicar por qué un equipo usa linter y formateador
prerrequisitos: vscode-depurar
autoevaluacion: ¿Sabes dónde ver todos los errores del proyecto? | ¿Sabes qué es un linter? | ¿Sabes qué significa F401? | ¿Sabes formatear un archivo sin hacerlo a mano?
---

:::analogia En palabras simples
Un linter es un corrector ortográfico para código: subraya lo que está mal o es sospechoso (un import que no usas, una variable mal escrita) antes de que ejecutes. El formateador es el que acomoda los espacios y las comillas para que todo el equipo escriba igual.
:::

## Paso 1 — Los errores se ven antes de ejecutar

Crea **scripts/con_errores.py**:

```python norun
import os

def total(precios)
    return sum(precios)

print(totl([1, 2]))
```

VS Code subraya en rojo los errores. Abre el panel **PROBLEMAS** (Ctrl + Shift + M):

```captura
archivo: vscode/v10-problemas.webp
texto: El panel Problemas (1) lista los errores con su línea; la barra de estado (2) los cuenta
```

- Clic en un problema: el editor salta a esa línea.
- Rojo = error; amarillo = advertencia; la barra de estado los cuenta (⊗ errores, ⚠ advertencias).
- Faltan los dos puntos después de `def total(precios)`: es un `SyntaxError` y Python no ejecutaría nada.

## Paso 2 — ruff: el linter que usa la industria

Corrige los dos puntos (`def total(precios):`) y guarda. Ahora, en la paleta (**Ctrl + Shift + P**) busca **Python: ejecutar ruff**, o en la terminal:

```bash
ruff check scripts/con_errores.py
```

```captura
archivo: vscode/v10-ruff.webp
texto: ruff encuentra el import que no se usa (F401) e indica que se puede arreglar solo
```

| Código | Significa |
|---|---|
| `F401` | Importaste algo que no usas |
| `F821` | Usas un nombre que no existe (por ejemplo `totl`) |
| `E711` | Comparación con None usando `==` en lugar de `is` |
| `E501` | Línea demasiado larga (si el proyecto lo configura) |

## Paso 3 — Que se arregle solo

```bash
ruff check --fix scripts/con_errores.py
ruff format scripts/
```

- `--fix` corrige lo que es seguro corregir (por ejemplo, borra el `import os` que sobra). Lo que requiere decidir (como `totl` → ¿`total`?) lo tienes que arreglar tú.
- `ruff format` acomoda espacios, comillas y saltos de línea con un estilo estándar.

:::tip El estilo no se discute, se configura
En un equipo nadie debería discutir "¿comillas simples o dobles?". Se elige una configuración (en `pyproject.toml`, lección 21), el formateador la aplica y el linter la controla. Las revisiones de código se dedican a la lógica, no a los espacios.
:::

## Paso 4 — En VS Code real

Con las extensiones **Python** y **Ruff** instaladas, los problemas aparecen mientras escribes y puedes activar **formatear al guardar** (`"editor.formatOnSave": true`). En esta práctica, ruff se ejecuta desde la terminal o la paleta, y el panel Problemas muestra los errores de sintaxis.

## ✅ Lo que lograste

- Lees los errores en el editor y en el panel Problemas.
- Revisas y corriges código con ruff check y ruff format.
- Sabes por qué un equipo acuerda un estilo automático.

:::ejercicio quiz
ruff muestra `F401 'os' imported but unused`. ¿Qué significa?
- [ ] Que falta instalar os
- [x] Que importaste os y no lo usas: se puede borrar
- [ ] Que os está mal escrito
- [ ] Que el archivo no existe
:::

:::ejercicio quiz
¿Qué hace `ruff check --fix`?
- [ ] Corrige todos los errores lógicos
- [x] Corrige automáticamente los problemas que es seguro corregir, como imports sin usar
- [ ] Ejecuta el script
- [ ] Sube el código a Git
:::

:::ejercicio quiz
¿Por qué un equipo usa un formateador automático?
- [ ] Porque el código corre más rápido
- [x] Para que todo el código tenga el mismo estilo y las revisiones se enfoquen en la lógica
- [ ] Porque Python lo exige
- [ ] Para ocultar errores
:::
