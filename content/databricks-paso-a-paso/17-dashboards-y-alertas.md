---
titulo: Dashboards AI/BI y alertas - tableros para el negocio y avisos automáticos
nivel: 5 · Avanzado
duracion: 50
resumen: Un dashboard de AI/BI junta consultas (datasets) y gráficos (widgets) en una página con filtros, se edita como borrador y se publica para el negocio. Crear uno, agregar visualizaciones y un filtro, publicarlo y entender la diferencia entre borrador y publicado. Después, alertas - una consulta, una condición y un aviso cuando se cumple, con su historial.
objetivos: Crear un dashboard con dataset, visualización y filtro | Distinguir borrador de versión publicada | Diseñar un dataset que sirva a varios gráficos | Crear y evaluar una alerta | Elegir umbrales y horarios con criterio
prerrequisitos: databricks-paso-a-paso-proyecto-pipeline-orquestado
autoevaluacion: ¿Sabes qué es un dataset en un dashboard? | ¿Sabes qué ve el negocio - el borrador o lo publicado? | ¿Sabes qué estados tiene una alerta? | ¿Sabes qué cómputo usan los dashboards?
---

:::analogia En palabras simples
El dashboard es la vidriera del trabajo del equipo de datos: el director no abre notebooks, abre el tablero. Y la alerta es el vigilante nocturno: mira un número cada hora y te despierta solo si pasa algo.
:::

## Paso 1 — Crear el dashboard

Menú **Analytics → Dashboards → Create dashboard**:

```captura
archivo: databricks/d17-nuevo.webp
texto: Nombre (1) y el primer dataset (2) - una consulta que junta pedidos, detalle, productos, categorías y clientes
```

Un **dataset** es una consulta SQL; los gráficos se construyen sobre sus columnas. El del ejemplo devuelve una fila por línea de pedido con `categoria`, `pais`, `canal` y `monto`: un dataset "ancho" que sirve para muchos gráficos distintos.

## Paso 2 — Visualizaciones y filtros

**Add visualization** → eliges dataset y título → el editor de gráficos:

```captura
archivo: databricks/d17-viz.webp
texto: Tipo (1), eje X (2), eje Y con agregación (3) y vista previa (4)
```

**Add filter** → eliges la columna (`categoria`). El filtro aplica a todos los widgets que usen un dataset con esa columna:

```captura
archivo: databricks/d17-dashboard.webp
texto: El borrador - datasets (1), filtros (2), los widgets en la grilla (3) y Publish (4)
```

Cada widget se puede editar (lápiz), ensanchar o borrar. Un dashboard útil tiene **pocos** gráficos que responden preguntas concretas, un filtro o dos, y contadores arriba para los números clave.

## Paso 3 — Publicar

```captura
archivo: databricks/d17-publicado.webp
texto: La versión publicada - lo que ve el negocio, con el filtro funcionando
```

| | Borrador (Draft) | Publicado |
|---|---|---|
| Quién lo ve | Quien edita | Quien tenga permiso de ver |
| Qué pasa al editar | Cambia el borrador | No cambia hasta volver a publicar |

Así puedes rehacer el tablero con calma mientras el negocio sigue viendo la versión estable. En Databricks real, al publicar eliges si los lectores usan **tus** credenciales (ven todo lo que tú ves) o las **suyas** (solo lo que sus permisos permiten).

## Paso 4 — Alertas

Menú **Analytics → Alerts → Create alert**:

```captura
archivo: databricks/d17-alerta-nueva.webp
texto: La consulta (1), la columna a vigilar (2), el operador (3), el umbral (4) y el horario (5)
```

```captura
archivo: databricks/d17-alerta.webp
texto: La alerta evaluada - TRIGGERED (1) porque hay 967 cancelados, más que el umbral; Evaluate now (2) la evalúa al instante
```

| Estado | Significa |
|---|---|
| **OK** | La condición no se cumple |
| **TRIGGERED** | Se cumple: se envía la notificación |
| **UNKNOWN** | La consulta falló o no devolvió valor |

La alerta mira la **primera fila** de la columna elegida: la consulta debe devolver un solo número (un `COUNT`, un `SUM`, un `MAX`).

:::tip Umbrales que no griten todo el día
Una alerta que se dispara siempre se ignora siempre. Define la condición sobre algo **anormal** ("más de 50 cancelados en la última hora", no "más de 10 cancelados en toda la historia"), con un horario acorde al dato (si los datos se cargan a la mañana, evaluar cada hora de madrugada no aporta).
:::

## Paso 5 — El cómputo de todo esto

Dashboards, alertas y Genie corren sobre un **SQL warehouse** (lección 11). Un tablero con diez gráficos que consultan tablas de millones de filas, abierto por cien personas, necesita un warehouse más grande o más clusters; un tablero sobre tablas **gold** chicas (como `pedidos_por_dia`) vuela en el más pequeño. Por eso la capa gold existe: no para el ingeniero, sino para el tablero.

## ✅ Lo que lograste

- Creaste y publicaste un dashboard con dataset, gráfico y filtro.
- Entiendes borrador y publicado.
- Creaste una alerta y sabes definir umbrales útiles.

:::ejercicio quiz
Editas el borrador de un dashboard publicado. ¿Qué ve el negocio?
- [ ] Los cambios al instante
- [x] La versión publicada, sin cambios, hasta que vuelvas a publicar
- [ ] Un error
- [ ] Nada
:::

:::ejercicio quiz
¿Qué debe devolver la consulta de una alerta?
- [ ] Miles de filas
- [x] Un valor en la columna vigilada (la alerta mira la primera fila)
- [ ] Un gráfico
- [ ] Una tabla nueva
:::

:::ejercicio quiz
¿Por qué los dashboards se construyen sobre tablas gold y no sobre la bronze?
- [ ] Porque la bronze no tiene permisos
- [x] Porque las gold son chicas y ya agregadas: el tablero responde rápido y barato
- [ ] Porque es obligatorio
- [ ] Porque la bronze no se puede consultar
:::
