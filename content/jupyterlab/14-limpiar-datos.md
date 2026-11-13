---
titulo: Limpiar datos con pandas - medir, deduplicar por clave, normalizar textos y tratar nulos
nivel: 4 · Intermedio-avanzado
duracion: 55
resumen: El método profesional para limpiar una tabla sucia, en código que se puede repetir. Con clientes_crudo (el mismo cliente cargado varias veces, con mayúsculas, espacios y emails vacíos) mides la calidad, decides qué es un duplicado, te quedas con la carga más reciente, normalizas textos con .str, tratas nulos sin inventar datos y dejas validaciones con assert.
objetivos: Medir la calidad de una tabla antes de limpiarla | Detectar y quitar duplicados por clave conservando el registro más reciente | Normalizar textos con .str.strip, .str.lower y .str.title | Decidir qué hacer con cada nulo (dejar, marcar, rellenar o descartar) | Validar el resultado con assert
prerrequisitos: jupyterlab-unir-tablas
autoevaluacion: ¿Sabes contar duplicados por una columna? | ¿Sabes quedarte con la fila más nueva de cada cliente? | ¿Sabes limpiar un email en una línea? | ¿Sabes escribir una validación con assert?
---

:::analogia En palabras simples
Limpiar en pandas es escribir la receta de la limpieza. La primera vez cuesta lo mismo que hacerlo a mano en Excel; la segunda (el mes que viene, con datos nuevos) es ejecutar el notebook. Y la receta queda como documentación de qué se hizo con los datos.
:::

## Paso 1 — Carga y mide

```python norun
crudo = pd.read_csv("datos/clientes_crudo.csv")
print("filas:", len(crudo))
print("clientes distintos:", crudo["cliente_id"].nunique())
print("repetidos por cliente_id:", crudo["cliente_id"].duplicated().sum())
crudo.isna().sum()
```

400 filas, **243** clientes distintos, **157** filas repetidas y **19** emails vacíos. Mira algunas filas del mismo cliente:

```python norun
crudo[crudo["cliente_id"] == 1638].sort_values("fecha_carga")
```

El mismo Benjamín Torres aparece cinco veces: con el nombre en mayúsculas, el email en mayúsculas o la ciudad en minúscula.

## Paso 2 — Decide qué es un duplicado

| Si comparas | Resultado |
|---|---|
| La fila completa (`crudo.duplicated()`) | 0: `registro_id` y `fecha_carga` siempre cambian |
| `cliente_id` | ✔ La clave: una fila por cliente |

Y de cada cliente repetido te quedas con la **carga más reciente**.

## Paso 3 — Deduplica conservando la más reciente

```python norun
limpio = (crudo
          .sort_values("fecha_carga", ascending=False)
          .drop_duplicates("cliente_id", keep="first"))
len(limpio)
```

Da **243**: coincide con los clientes distintos que mediste. `drop_duplicates` conserva la primera aparición (`keep="first"`); como ordenaste de la más nueva a la más vieja, la primera es la más reciente.

## Paso 4 — Normaliza los textos

```python norun
limpio = limpio.assign(
    nombre=limpio["nombre"].str.strip().str.title(),
    apellido=limpio["apellido"].str.strip().str.title(),
    email=limpio["email"].str.strip().str.lower(),
    ciudad=limpio["ciudad"].str.strip().str.title(),
)
```

```captura
archivo: jupyter/e14-limpieza.webp
texto: La limpieza encadenada: 400 filas con 157 repetidas pasan a 243 clientes con el email normalizado
```

| Método `.str` | Hace |
|---|---|
| `.str.strip()` | Quita espacios al principio y al final |
| `.str.lower()` / `.str.upper()` | Minúsculas / mayúsculas |
| `.str.title()` | Primera letra de cada palabra en mayúscula |
| `.str.replace("-", "")` | Reemplaza texto |
| `.str.contains("@")` | ¿Contiene? (True/False) |
| `.str.split("@").str[1]` | Parte un texto y toma un pedazo (el dominio del email) |

Los métodos `.str` respetan los nulos: un email vacío sigue vacío, no se rompe la cadena.

## Paso 5 — Qué hacer con cada nulo

| Opción | Cuándo | Código |
|---|---|---|
| Dejarlo | El dato falta y no se puede saber | (nada) |
| Marcarlo | Para informar o filtrar después | `limpio["sin_email"] = limpio["email"].isna()` |
| Rellenarlo | Hay un valor por defecto real (0 unidades, "sin canal") | `df["col"].fillna(0)` |
| Descartar la fila | La fila no sirve sin ese dato para este análisis | `df.dropna(subset=["email"])` |

:::cuidado Nunca inventes un dato
Rellenar un email vacío con uno "deducido" del nombre, o una edad vacía con el promedio, sin decirlo, cambia los resultados y puede tener consecuencias (correos que rebotan, decisiones con datos falsos). Si rellenas, que sea con una regla explícita y documentada.
:::

En la carga más reciente quedan **13** clientes sin email.

## Paso 6 — Valida con assert

```python norun
assert limpio["cliente_id"].is_unique, "Hay clientes repetidos"
assert len(limpio) == crudo["cliente_id"].nunique()
assert (limpio["email"].dropna() == limpio["email"].dropna().str.lower()).all(), "Quedan emails con mayúsculas"
```

`assert condición, "mensaje"` no hace nada si la condición se cumple; si no, detiene el notebook con el mensaje. Son tus controles automáticos: si mañana llega un archivo con un problema nuevo, el notebook avisa.

## Paso 7 — Tipos de dato

| Problema | Solución |
|---|---|
| Número leído como texto (`"1.500"`) | `pd.to_numeric(df["col"].str.replace(".", ""), errors="coerce")` |
| Fecha como texto | `pd.to_datetime(df["col"], errors="coerce")` |
| Código con ceros a la izquierda | `pd.read_csv(..., dtype={"codigo": str})` |

`errors="coerce"` convierte lo que no puede en `NaN` en lugar de fallar: después cuenta cuántos quedaron (`isna().sum()`) para saber cuántos valores eran inválidos.

## ✅ Lo que lograste

- Mediste la calidad y deduplicaste por clave con el registro más reciente.
- Normalizaste textos y decidiste qué hacer con cada nulo.
- Dejaste validaciones automáticas con assert.

:::ejercicio quiz
¿Qué devuelve `crudo["cliente_id"].duplicated().sum()`?
- [ ] La cantidad de clientes distintos
- [x] La cantidad de filas cuyo cliente_id ya apareció antes
- [ ] La cantidad de nulos
- [ ] Las filas duplicadas completas
:::

:::ejercicio quiz
¿Cómo te quedas con la carga más reciente de cada cliente?
- [ ] `crudo.drop_duplicates()`
- [ ] `crudo.drop_duplicates("cliente_id")` sin ordenar
- [x] Ordenar por fecha_carga descendente y después `drop_duplicates("cliente_id")`
- [ ] `crudo.groupby("cliente_id").first()` sin ordenar
:::

:::ejercicio quiz
¿Qué hace `assert limpio["cliente_id"].is_unique`?
- [ ] Borra los duplicados
- [x] Detiene el notebook con un error si quedó algún cliente repetido
- [ ] Muestra los repetidos
- [ ] Nada, es un comentario
:::

:::ejercicio quiz
Un cliente no tiene email. ¿Qué haces para la campaña?
- [ ] Le invento uno con su nombre
- [ ] Lo relleno con el email de otro cliente de su ciudad
- [x] Lo marco como sin email, lo dejo fuera del envío y lo informo
- [ ] Borro al cliente de todas las tablas
:::
