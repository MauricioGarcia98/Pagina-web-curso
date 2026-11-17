---
titulo: Proyecto 4 (con requisitos) - un pipeline de pedidos orquestado, con calidad y permisos
nivel: 4 · Intermedio-avanzado
duracion: 90
resumen: El equipo quiere que los pedidos lleguen a una tabla gold todos los días sin que nadie toque nada - un pipeline declarativo con expectativas que descarten los cancelados, un job que lo ejecute, controle la calidad y avise, y los permisos para que el área de ventas consulte la gold y nada más. Requisitos y control; sin pasos.
objetivos: Diseñar un pipeline bronze-silver-gold con expectativas | Orquestarlo desde un job con control de calidad y aviso | Dar permisos mínimos a un grupo | Verificar números de calidad y de salida | Documentar las tablas
prerrequisitos: databricks-paso-a-paso-unity-catalog-gobierno
autoevaluacion: ¿Sabes qué expectativa descarta filas? | ¿Sabes encadenar un pipeline y una consulta en un job? | ¿Sabes dar solo lectura a un grupo sobre un esquema? | ¿Sabes verificar que la calidad hizo lo que debía?
---

:::escenario El pedido
Lucía: *"Quiero `main.ventas_gold.pedidos_por_dia` actualizada sola cada mañana, sin pedidos cancelados y sin pedidos sin cliente. Que si algo falla me llegue un correo, y que el grupo `ventas` pueda consultar la gold pero no tocar la silver ni la bronze. Documentá las tablas: la gente de ventas tiene que entender qué es cada columna sin preguntarnos."*
:::

Este proyecto tiene **requisitos y control**, sin pasos. Todo está en las lecciones 13 a 15.

## Requisitos

1. **Esquemas** — `main.ventas_silver` (donde escribe el pipeline) y `main.ventas_gold` (lo que consulta el negocio).
2. **Pipeline** `pedidos_diarios`, con destino `main.ventas_silver`, que produzca:
   - `pedidos_bronze`: tabla de streaming desde `samples.tienda.pedidos`.
   - `pedidos_silver`: vista materializada con `fecha` como `DATE`, y expectativas: `sin_cancelados` (`estado <> 'cancelado'`, **DROP ROW**), `con_cliente` (`cliente_id IS NOT NULL`, **FAIL UPDATE**) y `canal_valido` (canal en la lista de cuatro, solo avisar).
   - `pedidos_por_dia`: vista materializada con los pedidos por `fecha` y `canal` a partir de la silver.
3. **Job** `pedidos_diarios_job` con tres tareas: (a) tipo **Pipeline** que ejecute el pipeline; (b) tipo **SQL** `control_calidad`, que dependa de (a), con una consulta que **falle** si `main.ventas_silver.pedidos_por_dia` tiene menos de 3000 filas (por ejemplo, dividiendo por cero cuando la condición no se cumple); (c) tipo **Notebook** `publicar`, que dependa de (b), que copie `pedidos_por_dia` a **`main.ventas_gold.pedidos_por_dia`** y escriba `main.ventas_gold.resumen_canal` (total de pedidos por canal desde la silver) con `saveAsTable`. Correo de aviso al fallar y horario diario.
4. **Permisos** — el grupo `ventas`: `USE CATALOG` en `main`, `USE SCHEMA` + `SELECT` en `main.ventas_gold`, y **nada** en `ventas_silver`. Crea el grupo en **Settings** si no existe.
5. **Documentación** — comentario en cada esquema y tabla, y en las columnas de `pedidos_por_dia`.
6. **Dos corridas del job** — la primera completa; la segunda después de cambiar el umbral del control a 100 000 (debe fallar en `control_calidad` y `publicar` debe quedar `UPSTREAM_FAILED`); después vuelve el umbral a 3000 y repara la corrida.

## ✔ Control

| Control | Esperado |
|---|---|
| `pedidos_bronze` | 12 000 filas escritas |
| `pedidos_silver` | **11 033** filas (12 000 − 967 cancelados); `sin_cancelados` 967 fallidas con Drop row; `con_cliente` 0 fallidas; `canal_valido` 0 fallidas |
| `main.ventas_gold.pedidos_por_dia` | **3640** filas |
| `main.ventas_gold.resumen_canal` | 4 filas; web 4979 · app 2707 · tienda 2438 · telefono 909 (suma 11 033) |
| Corrida 1 del job | Las tres tareas SUCCESS |
| Corrida 2 | `control_calidad` FAILED, `publicar` UPSTREAM_FAILED; tras reparar, SUCCESS sin repetir el pipeline |
| `SHOW GRANTS ON SCHEMA main.ventas_gold` | `ventas` con USE SCHEMA y SELECT; `SHOW GRANTS ON SCHEMA main.ventas_silver` sin `ventas` |
| Lineage de `main.ventas_gold.pedidos_por_dia` | Viene de `main.ventas_silver.pedidos_por_dia` |

Los totales por canal de `resumen_canal` son los de la lección 4 menos los cancelados de cada canal (web 421, app 266, tienda 207, telefono 73): si no te dan, revisa que se calculen desde la silver y no desde la bronze.

## Rúbrica

| Criterio | Insuficiente | Competente | Sobresaliente |
|---|---|---|---|
| Pipeline | Sin expectativas o sin las tres acciones | Expectativas correctas y números que cierran | Comentarios en cada dataset y nombres de constraint que explican la regla |
| Orquestación | Tareas sin dependencias o sin control | Pipeline → control → publicar, con aviso y horario | Reintentos solo donde corresponde y parámetro de umbral en lugar de número fijo |
| Permisos | El grupo ve todo o no ve nada | Mínimo necesario en gold, nada en silver | Verificado con SHOW GRANTS y documentado en el comentario del esquema |
| Verificación | Sin números | Control completo | Una consulta de control guardada que cualquiera puede correr |

## Entrega

Mensaje a Lucía: *"`main.ventas_gold.pedidos_por_dia` se actualiza sola cada mañana (job `pedidos_diarios_job`): bronze → silver con 967 cancelados descartados → gold con 3640 filas. Si la gold queda corta, el job falla y te llega correo. El grupo `ventas` solo puede leer la gold. Las tablas tienen comentarios por columna."*

## 🖥️ Hazlo también en Databricks real

Idéntico, con dos diferencias: el pipeline corre en **serverless** y tarda minutos la primera vez, y los correos de aviso llegan de verdad. Si tu workspace tiene **Lakeflow Connect**, la bronze puede venir directamente de una base de datos o de Salesforce sin escribir código.

:::errores
- **Misma acción para todas las expectativas.** Lo grave detiene (FAIL UPDATE); lo esperable se excluye (DROP ROW).
- **Publicar aunque falle el control.** `publicar` depende del control de calidad: si falla, no corre.
- **Permisos amplios "para probar".** El grupo de analistas lee solo la capa gold.
:::

:::ejercicio quiz
¿Por qué `con_cliente` lleva FAIL UPDATE y `sin_cancelados` DROP ROW?
- [ ] Porque FAIL UPDATE solo funciona con claves
- [x] Un pedido sin cliente indica un problema grave en el origen y conviene detener todo; un cancelado es normal y solo hay que excluirlo
- [ ] FAIL UPDATE es más rápido
- [ ] DROP ROW no funciona con estados
:::

:::ejercicio quiz
En la corrida 2, ¿por qué `publicar` no debe correr?
- [ ] Porque está mal configurada
- [x] Porque depende de control_calidad, que falló: no se publica un resumen sobre datos que no pasaron el control
- [ ] Porque el pipeline falló
- [ ] Porque los jobs solo publican los lunes
:::
