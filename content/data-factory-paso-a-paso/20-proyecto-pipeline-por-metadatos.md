---
titulo: Proyecto 5 (con mínima ayuda) - un pipeline guiado por metadatos
nivel: 5 · Avanzado
duracion: 60
resumen: En lugar de un pipeline por fuente, uno solo que lee una tabla de control y copia cada fuente activa. Combinas Lookup, ForEach, If Condition y Copy con expresiones sobre item() para que agregar una fuente nueva sea agregar una fila a un CSV. Es el patrón que usan los equipos con decenas de fuentes. Solo hay pistas mínimas.
objetivos: Diseñar un pipeline guiado por una tabla de control | Anidar If Condition dentro de ForEach | Armar rutas de origen con @{item().columna} | Verificar que las fuentes inactivas se saltan | Explicar las ventajas del patrón
prerrequisitos: data-factory-paso-a-paso-databricks-desde-data-factory
autoevaluacion: ¿Agregar una fuente nueva requiere cambiar el pipeline? | ¿Las fuentes inactivas se saltan? | ¿Usaste item() y no valores fijos? | ¿Sabes dónde quedan los archivos copiados?
---

:::escenario El pedido
Lucía: *"Ya tenemos ventas y devoluciones, y vienen inventario, precios y promociones. No quiero un pipeline por fuente. Quiero uno solo que lea `config/tablas_a_copiar.csv` y copie a `bronze/por_fuente` cada fuente que esté activa. Para sumar una fuente, se agrega una fila y listo."*
:::

## La tabla de control

| fuente | patron | activo |
|---|---|---|
| ventas | `*.csv` | 1 |
| devoluciones | `*.json` | 1 |
| inventario | `*.csv` | 0 |

## Lo que tienes que lograr

1. Dos datasets nuevos: `ds_raw_raiz` (contenedor `raw`, sin carpeta) y `ds_bronze_por_fuente` (`bronze/por_fuente`).
2. Un pipeline `pl_ingesta_por_config` que lea la tabla, recorra sus filas y, solo si `activo` es `1`, copie los archivos de esa fuente.
3. Debug en Succeeded, con inventario saltado.

<details><summary>💡 Pista mínima</summary>

Lookup (sin First row only) → ForEach sobre `output.value` → adentro, If con `equals` sobre `item().activo` → en True, Copy con el comodín armado con `item().fuente` y `item().patron`.
</details>

## Cómo se ve terminado

```captura
archivo: adf/b20-lienzo.webp
texto: El pipeline - Leer config y Por cada fuente
```

```captura
archivo: adf/b20-if.webp
texto: Dentro del ForEach (1) - el If con la condición sobre la columna activo (2)
```

```captura
archivo: adf/b20-copy.webp
texto: Dentro de la rama True (1) - el comodín armado con las columnas de la fila (2)
```

```captura
archivo: adf/b20-debug.webp
texto: La ejecución - el Lookup, el ForEach y, por cada fuente activa, el If y la copia
```

```captura
archivo: adf/b20-bronze.webp
texto: bronze/por_fuente con los archivos de ventas y devoluciones; inventario no se copió
```

:::errores
- **Comparar un CSV con números.** Los valores leídos de CSV son texto: compara con `'1'`, no con `1`.
- **Un pipeline por fuente "por ahora".** Cada fuente nueva duplica trabajo; una fila en la tabla de control escala.
- **Tabla de control sin dueño.** Si nadie la mantiene, las fuentes inactivas siguen corriendo.
:::

## ✅ Lista de verificación

- [ ] El Lookup devuelve las tres filas (`count: 3`).
- [ ] El ForEach recorre `@activity('Leer config').output.value`.
- [ ] El If usa `@equals(item().activo, '1')`.
- [ ] La copia usa `@{item().fuente}/@{item().patron}` en el comodín.
- [ ] En `bronze/por_fuente` hay archivos de ventas y devoluciones, y ninguno de inventario.

<details><summary>💡 Solución comentada</summary>

- **Datasets**: `ds_raw_raiz` apunta a la **raíz** de `raw` para que el comodín pueda incluir la carpeta de cada fuente (`ventas/*.csv`). `ds_bronze_por_fuente` apunta a `bronze/por_fuente`.
- **If**: los valores del CSV llegan como **texto**, por eso se compara con `'1'` entre comillas. `@equals(item().activo, 1)` (número) daría `false` siempre: un error clásico.
- **Comodín**: `@{item().fuente}/@{item().patron}` produce `ventas/*.csv` y `devoluciones/*.json`.

**Por qué este patrón vale la pena.** Sumar "precios" es agregar una fila `precios,*.csv,1`; apagar una fuente es poner `0`. No se toca, no se prueba ni se publica el pipeline. En empresas grandes la tabla de control vive en una base de datos (Azure SQL) y agrega columnas como destino, carga completa o incremental, y la última fecha cargada.

**Qué le falta para producción.** Copiar cada fuente a su propia carpeta (con `sinkFile` o un dataset parametrizado en Data Factory real), registrar el resultado de cada fuente y un camino de error por fuente, para que una falla no frene a las demás.
</details>

## Lo que aprendiste en el nivel 5

- Lookup, If Condition y Fail para decidir y fallar con claridad.
- Rutas de éxito y de error, y la regla del estado del pipeline.
- Notebooks de Databricks con parámetros y valores de salida.
- El patrón de pipeline guiado por metadatos.

En el nivel 6: equipo, despliegue entre entornos, seguridad, costos y el paso al Data Factory real.

:::ejercicio quiz
En el pipeline guiado por metadatos, ¿cómo se agrega una fuente nueva?
- [ ] Se copia el pipeline
- [x] Se agrega una fila a la tabla de control
- [ ] Se agrega un linked service con el nombre de la fuente
- [ ] Se agrega una actividad
:::

:::ejercicio quiz
`@equals(item().activo, 1)` siempre da false. ¿Por qué?
- [x] Porque el valor del CSV es texto: hay que comparar con '1'
- [ ] Porque equals solo compara fechas
- [ ] Porque item() está vacío
- [ ] Porque el If Condition necesita un reintento
:::

:::ejercicio quiz
¿Qué produce `@{item().fuente}/@{item().patron}` para la fila de devoluciones?
- [ ] `devoluciones`
- [x] `devoluciones/*.json`
- [ ] `*.json/devoluciones`
- [ ] `item().fuente/item().patron`
:::

:::ejercicio quiz
¿Dónde suele vivir la tabla de control en empresas grandes?
- [ ] En el código del pipeline
- [x] En una base de datos, con columnas como destino, tipo de carga y última fecha cargada
- [ ] En una variable del pipeline
- [ ] En el trigger
:::
