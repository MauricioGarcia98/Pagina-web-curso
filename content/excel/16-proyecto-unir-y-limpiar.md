---
titulo: Proyecto 4 (entregables y pistas mínimas) - la lista limpia para una campaña de email
nivel: 4 · Intermedio-avanzado
duracion: 90
resumen: Marketing quiere mandar una campaña a los clientes que compraron en 2024, y la única fuente es una tabla de clientes cargada varias veces y sucia. Limpias, quitas duplicados quedándote con la versión más nueva, unes con pedidos y clientes para traer cuántas compras hizo cada uno y de qué país es, separas a quienes no se puede contactar y entregas la lista con un informe de calidad. Pistas solo para los puntos difíciles.
objetivos: Planificar una limpieza antes de ejecutarla | Deduplicar por clave conservando el registro más reciente | Unir tablas con XLOOKUP y contar con COUNTIFS entre hojas | Separar registros no contactables sin inventar datos | Entregar un dataset con su informe de calidad
prerrequisitos: excel-limpiar-datos
autoevaluacion: ¿Sabes planificar los pasos de una limpieza? | ¿Sabes contar las compras de cada cliente en otra hoja? | ¿Sabes qué hacer con un email vacío? | ¿Sabes escribir un informe de calidad de datos?
---

:::escenario El pedido
Mensaje de Sofía, de marketing: *"Queremos mandar el newsletter de fin de año a los clientes que compraron en 2024. Me pasaron la tabla `clientes_crudo` pero está llena de repetidos y emails en mayúsculas, y la herramienta de envío rechaza el archivo si hay duplicados. Necesito una lista con nombre, apellido, email, país y cuántas compras hizo cada uno en 2024 (para segmentar). Y avisame cuántos clientes no vamos a poder contactar."*
:::

Este proyecto se parece a un pedido real: **sabes qué hay que entregar, no cómo**. Primero planifica; después ejecuta. Hay pistas solo para las partes difíciles.

## Las fuentes

| Hoja | Para qué |
|---|---|
| `clientes_crudo` | Nombre, apellido, email, ciudad (sucios y repetidos) |
| `pedidos` | Para contar compras de 2024 por cliente (**B** cliente_id, **D** fecha) |
| `clientes` | Para traer el país (**A** cliente_id, **G** pais) |

## Antes de empezar: tu plan

Escribe en una hoja `Plan` (o en un papel) los pasos en orden, **antes de tocar los datos**. Un buen plan responde: ¿qué columna es la clave? ¿qué versión de cada cliente me quedo? ¿qué limpio? ¿con qué uno? ¿qué hago con lo que falta?

<details><summary>Comparar con un plan de referencia (después de escribir el tuyo)</summary>

1. Medir: filas, clientes distintos, emails vacíos.
2. Copiar `clientes_crudo` a una hoja de trabajo (la original no se toca).
3. Ordenar por fecha_carga de nueva a vieja y quitar duplicados por cliente_id.
4. Columnas limpias: nombre y apellido con PROPER/TRIM, email con LOWER/TRIM.
5. Traer el país desde `clientes` y contar las compras 2024 desde `pedidos`.
6. Marcar quién compró en 2024 y quién tiene email.
7. Filtrar los contactables, exportar y escribir el informe de calidad.

</details>

## Entregable 1 — La hoja de trabajo deduplicada

Una fila por cliente, con la carga **más reciente** de cada uno. La original queda intacta.

<details><summary>💡 Pista: cómo copiar la tabla a otra hoja</summary>

En `clientes_crudo`: escribe `A1:G401` en el cuadro de nombres y Enter, Ctrl + C. Crea una hoja `campana` (+), clic en A1 y Ctrl + V.

</details>

## Entregable 2 — Las columnas de la lista

En la hoja de trabajo, agrega (con fórmulas):

| Columna | Contenido |
|---|---|
| nombre_ok | Nombre sin espacios de más, con mayúscula inicial |
| apellido_ok | Igual para el apellido |
| email_ok | Email sin espacios y en minúsculas |
| pais | El país del cliente, desde la hoja `clientes` |
| compras_2024 | Cantidad de pedidos del cliente con fecha en 2024 |
| contactable | `sí` si compró en 2024 **y** tiene email; `no` en otro caso |

<details><summary>💡 Pista: compras_2024</summary>

Un COUNTIFS con tres condiciones sobre la hoja pedidos: el cliente_id igual al de la fila, la fecha mayor o igual al 1/1/2024 y menor al 1/1/2025.

</details>

<details><summary>💡 Pista: contactable</summary>

`IF` con `AND`: compras mayor a 0 **y** email_ok distinto de vacío (`<>""`).

</details>

## Entregable 3 — El archivo para la herramienta de envío

Filtra `contactable` = `sí` y prepara el archivo: **solo** las columnas nombre_ok, apellido_ok, email_ok, pais y compras_2024, con encabezados. Expórtalo como `newsletter_2024.csv`.

<details><summary>💡 Pista: solo algunas columnas</summary>

Una forma: crea una hoja `envio` y trae cada columna con referencias (`=campana!H2`) o copia y pega las columnas filtradas. Lo que importa es que el CSV tenga solo lo que pide la herramienta, sin columnas auxiliares.

</details>

## Entregable 4 — El informe de calidad (para Sofía)

Una tabla corta en una hoja `calidad`, con fórmulas, y el mensaje de entrega. Tiene que responder:

- ¿Cuántas filas llegaron y cuántos clientes únicos había?
- ¿Cuántos compraron en 2024?
- ¿Cuántos de esos no tienen email (y por lo tanto no van en la lista)?
- ¿Cuántos van en la lista final?

## ✔ Números de control

| Control | Valor |
|---|---|
| Filas en clientes_crudo | 400 |
| Clientes únicos (después de deduplicar) | 243 |
| Clientes con al menos una compra en 2024 | 147 |
| Pedidos de 2024 de esos clientes | 509 |
| Clientes sin email (en su carga más reciente) | 13 |
| Compraron en 2024 pero no tienen email | 8 |
| **Filas del archivo para la campaña** | **139** |
| País con más clientes en la lista de 147 | Colombia (33) |

:::cuidado La trampa de este proyecto
El cliente que más compró en 2024 (11 pedidos) **no tiene email** en su carga más reciente. Es tentador buscar su email en una carga vieja o "deducirlo" de su nombre. No lo hagas: un email inventado o desactualizado rebota, daña la reputación del dominio de envío y puede violar normas de privacidad. Lo correcto es informarlo: *"8 clientes activos no tienen email, entre ellos el que más compró; sugiero pedir el dato en la próxima compra."*
:::

## Rúbrica

| Criterio | Bien | Muy bien |
|---|---|---|
| Deduplicación | Una fila por cliente | Además se conservó la carga más reciente y la original quedó intacta |
| Limpieza | Emails en minúscula sin espacios | Nombres, apellidos y emails normalizados con fórmulas |
| Unión | País y compras traídos con fórmulas | Se verificó que ningún cliente quedó sin país |
| Entrega | CSV con 139 filas | CSV solo con las columnas pedidas y nombre de archivo claro |
| Comunicación | Informa cuántos no se pueden contactar | Informe de calidad con números y una recomendación |

## 🖥️ Hazlo también en Excel real

En Excel real hay dos herramientas que hacen esto más cómodo, y vale la pena probarlas con este mismo ejercicio:

- **Data → Remove Duplicates** es igual que en la práctica (eliges las columnas).
- **Data → Get Data → From Table/Range** abre **Power Query**, donde cada paso de limpieza (quitar espacios, minúsculas, quitar duplicados, combinar con otra tabla) queda grabado y se repite solo cuando llegan datos nuevos. Lo vemos en el nivel 6.

:::ejercicio quiz
¿Por qué conviene trabajar en una copia de `clientes_crudo`?
- [ ] Porque Excel no deja modificar tablas cargadas
- [x] Para poder volver al dato original si la limpieza sale mal y comparar antes y después
- [ ] Porque la copia ocupa menos espacio
- [ ] No conviene, es más trabajo
:::

:::ejercicio quiz
Un cliente compró en 2024 pero no tiene email. ¿Qué haces?
- [ ] Le invento un email con su nombre y apellido
- [ ] Busco cualquier email parecido en otra tabla
- [x] Lo dejo fuera de la lista y lo informo como no contactable
- [ ] Lo borro de todas las tablas
:::

:::ejercicio quiz
¿Qué fórmula cuenta las compras de 2024 del cliente de A2 (pedidos: B cliente_id, D fecha)?
- [ ] `=COUNTIF(pedidos!B:B,A2)`
- [x] `=COUNTIFS(pedidos!B:B,A2,pedidos!D:D,">=2024-01-01",pedidos!D:D,"<2025-01-01")`
- [ ] `=XLOOKUP(A2,pedidos!B:B,pedidos!D:D)`
- [ ] `=SUMIF(pedidos!B:B,A2,pedidos!D:D)`
:::
