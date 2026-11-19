---
titulo: La entrega - el esquema canónico y la revisión automática
nivel: Avanzado
duracion: 20
resumen: La especificación exacta de red.silver.resultados y red.gold.resultados_diarios, la definición de terminado y el panel que compara tus tablas con lo que mandaron de verdad los laboratorios.
objetivos: Construir una tabla unificada que cumpla un esquema canónico | Seudonimizar de forma consistente entre fuentes | Validar contra la realidad con pistas
prerrequisitos: proyecto-red-analitica-las-notas-del-equipo
autoevaluacion: ¿Sabes qué columnas lleva silver y en qué unidades? | ¿Sabes cómo verificar que tu seudónimo es consistente? | ¿Sabes qué resultados se revisan (y cuáles todavía no)?
---

## red.silver.resultados

| Columna | Regla |
|---|---|
| `laboratorio` | `norte`, `centro`, `sur`, `costa` o `cerro` |
| `id_muestra` | Como lo manda el laboratorio |
| `estudio` | Código canónico: `GLU`, `HB`, `COL`, `CRE`, `TSH` |
| `resultado` | En la unidad canónica (ver Fuentes y accesos) |
| `unidad` | La unidad canónica |
| `fecha_toma` | Día de la toma, hora de Ciudad del Río |
| `paciente_id` | Seudónimo: el mismo para la misma persona en todos los laboratorios |

Un registro por laboratorio + muestra + estudio. **Ninguna** columna con nombre, documento ni fecha de nacimiento. Si un archivo fue reenviado, vale la última versión.

La revisión compara con todos los archivos entregados **antes de hoy** (los de hoy pueden estar o no) y acepta durante unas horas los valores anteriores a una corrección.

## red.gold.resultados_diarios

`fecha_toma`, `laboratorio`, `estudio`, `resultados` (cantidad), `fuera_de_rango` (cantidad fuera del rango canónico).

## Definición de terminado

- [ ] La revisión de abajo pasa completa.
- [ ] Puedes volver a cargar un día sin duplicar nada.
- [ ] Si mañana un laboratorio cambia el encabezado, tu proceso falla con un mensaje claro (no carga basura).
- [ ] La clave SSH y la sal están en el Key Vault; tu código las lee de ahí.

## La revisión

<div data-red="revisar"></div>

## Ejercicios

:::ejercicio quiz
El mismo paciente aparece en Norte como 41.234.567 y en Costa como CI 41234567. ¿Qué necesitas para que tenga un solo paciente_id?
- [ ] Nada: el hash los iguala
- [x] Normalizar el documento (solo dígitos) antes de calcular el seudónimo
- [ ] Usar el nombre en vez del documento
- [ ] Un paciente_id distinto por laboratorio
:::

## Resumen

- Silver: un esquema canónico, sin datos que identifiquen, con la última versión de cada archivo.
- Gold: conteos por día, laboratorio y estudio, con el rango canónico.
- La revisión compara con la realidad y explica qué falló.
