---
titulo: Proyecto 2 (semiguiado) - la ingesta diaria con nombre de archivo del día
nivel: 2 · Básico-intermedio
duracion: 45
resumen: El negocio quiere, además de los archivos sueltos, un archivo por día con todas las ventas, con la fecha en el nombre. Armas el pipeline pl_ingesta_diaria con un nombre de archivo dinámico usando tu primera expresión, lo pruebas y lo verificas en el almacenamiento. El enunciado dice qué lograr; las pistas están escondidas.
objetivos: Crear un pipeline nuevo desde Author | Usar una expresión en el nombre del archivo de destino | Combinar texto y expresiones con @{} | Verificar el resultado de punta a punta
prerrequisitos: data-factory-paso-a-paso-validate-debug-y-errores
autoevaluacion: ¿Sabes qué devuelve utcNow()? | ¿Sabes la diferencia entre @ y @{}? | ¿Sabes en qué formato queda la fecha con 'yyyyMMdd'? | ¿Sabes verificar el archivo generado?
---

:::escenario El pedido
Lucía: *"El equipo de finanzas quiere, cada día, un único archivo `ventas_AAAAMMDD.csv` en `bronze/ventas` con todas las ventas disponibles, y el nombre con la fecha del día en que se generó. Armá un pipeline nuevo para eso, `pl_ingesta_diaria`; ese va a ser nuestro pipeline principal de acá en adelante."*
:::

## Lo que tienes que lograr

1. Un pipeline `pl_ingesta_diaria` con una copia llamada `Copiar ventas del dia`.
2. Origen: `ds_raw_ventas` con comodín `*.csv`.
3. Destino: `ds_bronze_ventas`, unido en un solo archivo.
4. El nombre del archivo, **dinámico**: `ventas_` + la fecha de hoy en formato `yyyyMMdd` + `.csv`.

<details><summary>💡 Pista 1: ¿cómo creo el pipeline?</summary>

En **Author**, botón **+ → Pipeline**, y **Rename**. Agrega **Copy data** desde el panel de actividades.
</details>

<details><summary>💡 Pista 2: ¿cómo escribo un nombre dinámico?</summary>

En **File name** del Sink, mezcla texto con una expresión entre `@{` y `}`:

```text
ventas_@{formatDateTime(utcNow(), 'yyyyMMdd')}.csv
```

`utcNow()` devuelve la fecha y hora actual en UTC y `formatDateTime` la escribe con el formato pedido.
</details>

```captura
archivo: adf/b08-sink-dinamico.webp
texto: El nombre dinámico (1) y la ayuda de contenido dinámico (2)
```

## Dos formas de escribir una expresión

| Forma | Ejemplo | Resultado |
|---|---|---|
| **Todo expresión**: empieza con `@` | `@concat('ventas_', '20261115', '.csv')` | `ventas_20261115.csv` |
| **Texto con partes dinámicas**: `@{ … }` | `ventas_@{formatDateTime(utcNow(), 'yyyyMMdd')}.csv` | `ventas_20261115.csv` |

La segunda se lee mejor cuando casi todo es texto fijo. En la lección 13 las expresiones se usan a fondo.

## Cómo verificar

Haz **Debug**:

```captura
archivo: adf/b08-debug.webp
texto: La copia del día terminó bien
```

Y en el portal, `bronze/ventas`:

```captura
archivo: adf/b08-bronze.webp
texto: El archivo del día, ventas_AAAAMMDD.csv, junto a los anteriores
```

:::errores
- **Mezclar texto y expresión sin `@{}`.** `ventas_formatDateTime(...)` queda como texto literal; la expresión va dentro de `@{...}`.
- **Olvidar que `utcNow()` es UTC.** A las 22:00 en Lima ya es el día siguiente en UTC; ajusta la zona horaria.
- **Formatos de fecha en mayúsculas equivocadas.** `MM` es mes y `mm` es minutos.
:::

## ✅ Lista de verificación

- [ ] Existe `pl_ingesta_diaria` con la copia `Copiar ventas del dia`.
- [ ] El Sink une los archivos y el nombre usa `formatDateTime(utcNow(), 'yyyyMMdd')`.
- [ ] Debug terminó en Succeeded.
- [ ] En `bronze/ventas` hay un archivo con la fecha de hoy y 20 filas más el encabezado.

<details><summary>💡 Solución comentada</summary>

La clave es el **File name** del Sink con `@{…}`. Un detalle importante: `utcNow()` usa la hora **UTC**. Si el pipeline corre a las 22:00 en Lima (UTC−5), en UTC ya es el día siguiente y el archivo quedaría con la fecha de mañana. Para evitarlo se convierte a la zona horaria local (en Azure real existe `convertFromUtc(utcNow(), 'SA Pacific Standard Time')`) o, mejor, se recibe la fecha como **parámetro** (lección 13). Ese "detalle" es la causa de muchos archivos con fecha equivocada en producción.
</details>

## Lo que aprendiste en el nivel 2

- El editor de pipelines, las dependencias y el JSON.
- Copy data con comodines, Merge files y sus métricas.
- Diagnosticar errores y usar reintentos con criterio.
- Tu primera expresión dinámica.

En el nivel 3 el pipeline sale del modo prueba: se publica, se programa y se monitorea.

:::ejercicio quiz
¿Qué devuelve `formatDateTime(utcNow(), 'yyyyMMdd')` el 15 de noviembre de 2026?
- [ ] `15-11-2026`
- [x] `20261115`
- [ ] `2026-11-15`
- [ ] `11/15/2026`
:::

:::ejercicio quiz
¿Cuál es la forma correcta de mezclar texto fijo con una expresión?
- [ ] `ventas_formatDateTime(utcNow()).csv`
- [x] `ventas_@{formatDateTime(utcNow(), 'yyyyMMdd')}.csv`
- [ ] `@ventas_formatDateTime(utcNow())`
- [ ] `ventas_${utcNow()}.csv`
:::

:::ejercicio quiz
El pipeline corre a las 22:00 hora de Lima y el archivo sale con la fecha de mañana. ¿Por qué?
- [ ] Por un error de Data Factory
- [x] Porque utcNow() usa la hora UTC, que ya está en el día siguiente
- [ ] Porque el trigger está adelantado
- [ ] Porque Data Factory suma un día a los archivos programados
:::

:::ejercicio quiz
¿Qué forma de expresión empieza con `@` y es toda expresión?
- [x] `@concat('ventas_', '20261115', '.csv')`
- [ ] `ventas_@{utcNow()}.csv`
- [ ] `ventas_20261115.csv`
- [ ] `ventas_{formatDateTime(utcNow())}.csv`
:::
