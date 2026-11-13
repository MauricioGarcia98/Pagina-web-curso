---
titulo: Proyecto 4 (entregables y pistas mínimas) - la lista limpia para una campaña, como un pipeline en un notebook
nivel: 4 · Intermedio-avanzado
duracion: 90
resumen: Marketing necesita la lista de clientes que compraron en 2024 para una campaña, y la fuente es la tabla de clientes sucia. Planificas, limpias, deduplicas quedándote con la carga más reciente, unes con pedidos y clientes, separas a quienes no se pueden contactar y entregas un CSV con validaciones automáticas y un informe de calidad. Pistas solo para lo difícil, y una función reutilizable en un .py.
objetivos: Planificar una limpieza como pasos de un pipeline | Deduplicar, normalizar y unir tablas en código reutilizable | Contar compras por cliente con groupby y unirlas | Separar registros no contactables sin inventar datos | Entregar un dataset con validaciones assert e informe de calidad
prerrequisitos: jupyterlab-notebooks-reproducibles
autoevaluacion: ¿Sabes planificar una limpieza antes de escribir código? | ¿Sabes contar compras por cliente y unirlas a otra tabla? | ¿Sabes validar el resultado con assert? | ¿Sabes informar lo que no se pudo resolver?
---

:::escenario El pedido
Mensaje de Sofía, de marketing: *"Queremos mandar el newsletter de fin de año a los clientes que compraron en 2024. Tengo la tabla `clientes_crudo` pero está llena de repetidos y emails en mayúsculas, y la herramienta de envío rechaza el archivo si hay duplicados. Necesito nombre, apellido, email, país y cuántas compras hizo cada uno en 2024. Y decime cuántos no vamos a poder contactar. Ah, y probablemente lo pidamos de nuevo en marzo."*
:::

Sabes **qué** entregar, no **cómo**. "Lo pedimos de nuevo en marzo" significa que tiene que poder repetirse: piensa en parámetros y en una función.

## Fuentes (en datos/)

| Archivo | Para qué |
|---|---|
| `clientes_crudo.csv` | Nombre, apellido, email (sucios y repetidos) |
| `pedidos.csv` | Compras del año por cliente |
| `clientes.csv` | País del cliente |

## Antes del código: el plan

Escribe en una celda Markdown los pasos en orden. Respóndete: ¿cuál es la clave? ¿qué versión de cada cliente me quedo? ¿qué limpio? ¿con qué uno? ¿qué hago con lo que falta? ¿cómo sé que salió bien?

<details><summary>Comparar con un plan de referencia (después de escribir el tuyo)</summary>

1. Parámetros: `ANIO = 2024`, nombres de archivo.
2. Medir el crudo: filas, clientes distintos, emails vacíos.
3. Deduplicar por cliente_id quedándome con la fecha_carga más reciente.
4. Normalizar nombre, apellido y email.
5. Contar pedidos del año por cliente (groupby) y unir; traer el país (merge).
6. Marcar `contactable` = compró en el año y tiene email.
7. Validar con assert y exportar solo los contactables con las columnas pedidas.
8. Informe de calidad en Markdown.

</details>

## Entregable 1 — La función de limpieza en un .py

Un archivo `limpieza.py` (con `%%writefile`) con una función `limpiar_clientes(crudo)` que reciba el DataFrame crudo y devuelva uno deduplicado y normalizado. El notebook la importa y la usa.

<details><summary>💡 Pista</summary>

Adentro de la función van los pasos 3 y 4 de la lección 14: `sort_values` + `drop_duplicates` + `assign` con `.str.strip()`, `.str.title()` y `.str.lower()`. Recuerda: si editas el .py, reinicia el kernel.

</details>

## Entregable 2 — La tabla de trabajo

Una tabla con una fila por cliente y las columnas: `cliente_id`, `nombre`, `apellido`, `email`, `pais`, `compras_anio` (0 si no compró) y `contactable` (True/False).

<details><summary>💡 Pista: compras del año</summary>

`pedidos[pedidos["fecha_pedido"].str[:4] == str(ANIO)].groupby("cliente_id").size().rename("compras_anio")`; únelo con `merge(..., on="cliente_id", how="left")` y completa los vacíos con `fillna(0)`: aquí rellenar con 0 es correcto, porque no comprar es cero compras.

</details>

## Entregable 3 — Validaciones

Al menos tres `assert`: que no haya clientes repetidos, que la cantidad de filas sea la de clientes distintos del crudo y que ningún email contactable tenga mayúsculas o espacios.

## Entregable 4 — El archivo para la herramienta de envío

`newsletter_{ANIO}.csv` con **solo** los contactables y **solo** las columnas nombre, apellido, email, pais y compras_anio, sin índice.

## Entregable 5 — El informe de calidad (Markdown)

Filas recibidas, clientes únicos, clientes que compraron en el año, cuántos de ellos no tienen email y cuántos van en la lista. Con una recomendación.

## ✔ Números de control (ANIO = 2024)

| Control | Valor |
|---|---|
| Filas en clientes_crudo | 400 |
| Clientes únicos | 243 |
| Con al menos una compra en 2024 | 147 |
| Pedidos de 2024 de esos clientes | 509 |
| Sin email en su carga más reciente | 13 |
| Compraron en 2024 pero no tienen email | 8 |
| **Filas del CSV para la campaña** | **139** |
| País con más clientes entre los 147 | Colombia (33) |

:::cuidado La trampa de este proyecto
El cliente que más compró en 2024 (11 pedidos) no tiene email en su carga más reciente. No lo busques en cargas viejas ni lo "deduzcas": un email desactualizado rebota y daña la reputación del dominio de envío. Infórmalo como recomendación: pedir el dato en la próxima compra.
:::

## La prueba de marzo

Cambia `ANIO = 2023`, **Restart Kernel and Run All Cells**. Todo tiene que correr y generar `newsletter_2023.csv`. Si algo falla o sigue diciendo 2024, hay un año escrito a mano.

## Rúbrica

| Criterio | Bien | Muy bien |
|---|---|---|
| Plan | Pasos listados | Pasos con la decisión de cada uno (clave, versión, nulos) |
| Limpieza | Una fila por cliente, emails normalizados | En una función de un .py, reutilizable |
| Unión | País y compras correctos | Verificado con validate o comparando filas |
| Validaciones | Hay assert | Cubren duplicados, cantidad y formato |
| Entrega | CSV con 139 filas | Solo columnas pedidas, sin índice, nombre con el año |
| Comunicación | Informa los no contactables | Informe con números y recomendación |

:::ejercicio quiz
¿Por qué conviene la limpieza en una función de un .py?
- [ ] Porque los notebooks no aceptan funciones
- [x] Porque se reutiliza en marzo, en otros notebooks o en un pipeline, y se corrige en un solo lugar
- [ ] Porque corre más rápido
- [ ] Porque Jupyter lo exige
:::

:::ejercicio quiz
Un cliente no compró en 2024. ¿Qué pones en compras_anio?
- [ ] NaN
- [x] 0, porque no comprar es cero compras
- [ ] El promedio
- [ ] Lo borras de la tabla
:::

:::ejercicio quiz
¿Para qué sirve `index=False` en `to_csv`?
- [ ] Para no guardar los encabezados
- [x] Para no agregar el índice como una columna extra que la herramienta de envío no espera
- [ ] Para ordenar el archivo
- [ ] Para comprimirlo
:::
