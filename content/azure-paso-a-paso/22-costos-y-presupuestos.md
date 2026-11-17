---
titulo: Costos a escala - leer la factura, alertas tempranas y optimizar
nivel: 6 · Avanzado completo
duracion: 45
resumen: Con varios entornos y servicios, el costo deja de ser un número y se vuelve una conversación con Finanzas. Lees el costo por servicio y por recurso de toda la plataforma, configuras un presupuesto de alerta temprana y lo ves dispararse, y repasas las palancas que más ahorran en una plataforma de datos en Azure - apagar, achicar, reservar, ordenar el almacenamiento y etiquetar.
objetivos: Leer el costo por servicio y por recurso de varios entornos | Configurar un presupuesto con alertas tempranas | Identificar los mayores costos de una plataforma de datos | Aplicar las palancas de ahorro más comunes | Explicar la diferencia entre costo real, pronóstico y amortizado
prerrequisitos: azure-paso-a-paso-plantillas-arm
autoevaluacion: ¿Sabes qué servicio gasta más en tu plataforma? | ¿Sabes qué presupuesto avisaría antes de un problema? | ¿Sabes qué ahorra más en Databricks? | ¿Sabes qué es una reserva?
---

:::escenario El pedido
Finanzas: *"El mes que viene entra producción. Necesitamos saber cuánto va a costar, enterarnos rápido si algo se dispara y un plan para gastar menos sin romper nada."*
:::

:::analogia Leer la factura como un detective
El costo total no dice mucho: hay que abrirlo por servicio, por recurso y por etiqueta para encontrar qué creció. Después se elige la palanca: apagar lo que no se usa, achicar lo sobredimensionado o comprometer uso estable con reservas.
:::

## Paso 1 — La foto actual

Abre **Cost Management**:

```captura
archivo: azure/b22-costos.webp
texto: El costo por servicio (1) y por recurso (2) de toda la plataforma dev
```

Preguntas que respondes con esta pantalla:

- ¿Qué **servicio** gasta más? (en la práctica, el almacenamiento y el factory)
- ¿Qué **recurso** puntual? (para saber a quién preguntar, mira su etiqueta `owner`)
- ¿Cuál es el **pronóstico** a fin de mes con el ritmo actual?

| Vista del costo | Qué muestra |
|---|---|
| **Actual cost** | Lo que se cobra, cuando se cobra (una reserva anual aparece entera el día que se compra) |
| **Amortized cost** | Las compras por adelantado repartidas por día; mejor para comparar meses |
| **Forecast** | La proyección a fin de mes |

## Paso 2 — Una alerta temprana

Un presupuesto de USD 20 avisa al llegar a 10, 16 y 20. Para practicar cómo llega una alerta, crea otro muy chico: **Budgets → + Add** con nombre `alerta-temprana`, monto `0.1` y umbrales `50, 100`. Al volver a Cost Management, abre las notificaciones:

```captura
archivo: azure/b22-alerta-presupuesto.webp
texto: "Budget alert: alerta-temprana" - el gasto llegó al 50 % del presupuesto
```

```captura
archivo: azure/b22-presupuestos.webp
texto: Los dos presupuestos, con el gasto evaluado y los umbrales alcanzados
```

En Azure real la alerta llega por **correo** a los destinatarios y, si lo configuras, a un **grupo de acciones** (Teams, una Function que apague clústeres de dev, etc.). Además de presupuestos, Cost Management tiene **anomaly alerts**: avisan cuando el gasto diario se sale de su patrón, aunque no llegue al presupuesto.

## Paso 3 — Dónde se va el dinero en una plataforma de datos

| Servicio | Qué cobra | El error caro típico |
|---|---|---|
| **Databricks** | Máquinas virtuales + DBU por hora encendida | Clústeres interactivos sin apagado automático |
| **Storage** | GB guardados por nivel + operaciones + salida de datos | Todo en Hot para siempre; versiones sin límite |
| **Data Factory** | Ejecuciones de actividades + horas de movimiento de datos | Pipelines que corren cada 5 minutos sin necesidad |
| **Azure SQL** | vCore u horas de DTU | Bases de dev en niveles de producción, encendidas 24/7 |
| **Salida de datos** | GB que salen de la región o a internet | Leer el lago desde otra región |

## Paso 4 — Las palancas de ahorro

| Palanca | Cómo | Ahorro típico |
|---|---|---|
| **Apagar** | Auto termination de 15–30 min en clústeres; bases serverless con pausa; nada de dev encendido el fin de semana | El más grande y el más simple |
| **Achicar** | Clústeres del tamaño justo; job clusters en lugar de interactivos; serverless donde convenga | Grande |
| **Ordenar el almacenamiento** | Reglas de ciclo de vida; borrar versiones viejas; formatos columnares (Parquet/Delta) que ocupan menos | Medio, crece con los años |
| **Comprometer** | **Reservas** de 1 o 3 años y *savings plans* para lo que corre siempre (prod) | Hasta ~70 % en lo reservado |
| **Ver** | Etiquetas obligatorias, presupuestos por equipo, revisión mensual | Lo que no se mide no baja |

Revisa la lista de recursos con esa mirada:

```captura
archivo: azure/b22-todos-recursos.webp
texto: Todos los recursos de dev - ¿cuál podría apagarse, achicarse o borrarse?
```

:::tip La revisión mensual de 15 minutos
Una vez por mes: abrir Cost Management agrupado por **etiqueta `owner`**, mirar los cinco recursos más caros, preguntar a cada dueño si sigue haciendo falta, y borrar lo huérfano. Es la práctica de FinOps que más dinero ahorra.
:::

:::errores
- **Mirar solo el total.** Ábrelo por servicio y recurso para encontrar qué creció.
- **Reservas para cargas variables.** Convienen con uso estable 24/7; si se apaga, se paga igual.
- **Comparar meses con Actual cost después de una reserva.** El pago anual aparece entero un mes; Amortized cost lo reparte.
:::

## ✅ Lo que lograste

- Lees el costo por servicio, recurso y vista (real, amortizado, pronóstico).
- Configuraste y viste dispararse una alerta de presupuesto.
- Conoces los costos típicos de una plataforma de datos y cómo bajarlos.

:::ejercicio quiz
El costo de Databricks se duplicó. ¿Qué revisas primero?
- [ ] Las etiquetas del lago
- [x] Clústeres encendidos sin apagado automático y su tamaño
- [ ] El tamaño de los archivos de gold
- [ ] Las reglas de ciclo de vida
:::

:::ejercicio quiz
Producción corre 24/7 con la misma capacidad todo el año. ¿Qué palanca conviene?
- [ ] Apagarla los fines de semana
- [x] Una reserva o un savings plan de 1 o 3 años
- [ ] Pasar todo a Archive
- [ ] Borrar el presupuesto
:::

:::ejercicio quiz
¿Qué vista del costo usas para comparar meses cuando compraste una reserva anual?
- [ ] Actual cost
- [x] Amortized cost
- [ ] Forecast
- [ ] Ninguna
:::

:::ejercicio quiz
¿Qué hace una anomaly alert de Cost Management?
- [ ] Apaga los recursos caros
- [x] Avisa cuando el gasto diario se sale de su patrón habitual
- [ ] Cambia la redundancia del storage
- [ ] Borra los recursos que no tienen etiquetas
:::
