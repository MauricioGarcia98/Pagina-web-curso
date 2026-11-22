---
titulo: Tiempo real - Eventstream, Eventhouse, KQL y Activator
nivel: 6 · Avanzado completo
duracion: 50
resumen: Real-Time Intelligence es la parte de Fabric para los datos que llegan de a uno y hay que mirar ya - sensores, clics, pagos. Armas el recorrido completo con las cámaras de frío de un depósito - un Eventstream que recibe las lecturas, un Eventhouse donde se consultan con KQL en segundos y un Activator que avisa cuando una cámara se calienta.
objetivos: Explicar para qué sirven Eventstream, Eventhouse y Activator | Configurar un Eventstream con origen, filtro y destino | Consultar con KQL (where, summarize, bin, top, render) | Crear una regla de Activator por objeto
prerrequisitos: fabric-paso-a-paso-capacidad-y-costos
autoevaluacion: ¿Sabes qué hace cada uno de los tres ítems? | ¿Sabes leer una consulta KQL de arriba abajo? | ¿Sabes para qué sirve bin()? | ¿Sabes por qué Activator evalúa "por objeto"?
---

:::tip Practícalo mientras lees
Todo corre en el [Fabric de práctica](#/fabric): crea un Eventhouse, un Eventstream y un Activator en tu workspace. Los eventos se generan solos mientras el stream está activo.
:::

:::analogia La sala de control de un depósito
El Eventstream es el cable que trae las lecturas de los termómetros; el Eventhouse es la pantalla donde las ves al instante y les haces preguntas; el Activator es la alarma que suena cuando una cámara pasa los 8 °C, sin que nadie tenga que estar mirando.
:::

## Paso 1 — El recorrido

```diagrama
titulo: De los sensores a la alerta, en segundos
nodo s: Sensores de las cámaras | icono=thermometer | col=0 | fila=0 | color=gris | sub=una lectura cada 5 s
nodo es: Eventstream | icono=stream | col=1 | fila=0 | color=violeta | sub=filtra y enruta, sin código
nodo eh: Eventhouse | icono=base | col=2 | fila=0 | color=verde | sub=tabla Lecturas, consultas KQL
nodo lh: Lakehouse | icono=almacen | col=2 | fila=1 | color=azul | sub=histórico en Delta
nodo ac: Activator | icono=alerta | col=3 | fila=0 | color=rojo | sub=temperatura > 8 por cámara
flecha s -> es | explica=Cada cámara manda su temperatura y si la puerta está abierta. En una empresa llegan por IoT Hub o Event Hubs; en la práctica, la fuente de ejemplo Cámaras de frío.
flecha es -> eh | explica=El Eventstream guarda cada evento en una tabla del Eventhouse, donde queda consultable en segundos.
flecha es -> lh: copia | estilo=punteada | explica=El mismo stream puede mandar una copia a un lakehouse para el histórico de largo plazo, en Delta.
flecha eh -> ac | explica=Activator vigila los eventos y dispara una acción (Teams, correo, un pipeline) cuando una cámara cumple la condición.
```

| Ítem | Qué es | Se parece a |
|---|---|---|
| **Eventstream** | Recibe eventos de una fuente, los transforma sin código y los manda a uno o más destinos | Azure Stream Analytics, Kafka Connect |
| **Eventhouse** | Base de datos para eventos y series de tiempo, que se consulta con KQL | Azure Data Explorer |
| **Activator** | Reglas que vigilan datos y disparan acciones | Una alerta con lógica por objeto |

## Paso 2 — El Eventstream

1. Crea un **Eventhouse** llamado `Deposito` (Create → Store data → Eventhouse).
2. Crea un **Eventstream** `StreamFrio` → **Add source** → *Cámaras de frío (sensores IoT)*.
3. **Add destination** → `Deposito`, tabla `Lecturas`.
4. **Publish**: el estado pasa a *Active*. En unos segundos, **Data preview** muestra las lecturas.

Con **Transform events → Filter** puedes dejar pasar solo una parte (por ejemplo, `temperatura > 2`): lo que se filtra en el stream no ocupa lugar ni se paga en el destino.

```captura
archivo: fabric/b23-eventstream.webp
texto: Un Eventstream activo - el origen de ejemplo, el stream y su destino en el Eventhouse, con la vista previa de los eventos
```

## Paso 3 — KQL: preguntas en segundos

Abre `Deposito`. Una consulta **KQL** empieza con el nombre de la tabla y cada `|` pasa el resultado al operador siguiente: se lee de arriba abajo, como una receta.

```sql norun
Lecturas
| where ts > ago(1h)                                   // la última hora
| summarize lecturas = count(), maxima = max(temperatura) by camara
| order by maxima desc
```

| Operador | Qué hace | En SQL sería |
|---|---|---|
| `where` | Filtra filas | `WHERE` |
| `project` | Elige (y renombra) columnas | `SELECT a, b` |
| `extend` | Agrega columnas calculadas | `SELECT *, x AS nueva` |
| `summarize … by` | Agrega por grupos | `GROUP BY` |
| `bin(ts, 5m)` | Redondea el tiempo a intervalos de 5 minutos | `DATE_TRUNC` |
| `top 10 by x` | Los 10 mayores | `ORDER BY x DESC LIMIT 10` |
| `render timechart` | Dibuja el resultado | (no existe en SQL) |

La consulta típica de una serie de tiempo:

```sql norun
Lecturas
| summarize promedio = avg(temperatura) by camara, bin(ts, 5m)
| render timechart
```

```captura
archivo: fabric/b23-kql.webp
texto: El KQL queryset del Eventhouse - la consulta, el gráfico y la tabla de resultados
```

:::cuidado Texto entre comillas dobles y == para comparar
En KQL los textos van entre comillas dobles (`camara == "CAM-03"`) y la igualdad es `==`, no `=`. `contains` busca un texto dentro de otro sin importar mayúsculas, y `has` busca una palabra entera (más rápido).
:::

## Paso 4 — Activator

1. Crea un **Activator** `AlertasFrio` → **New rule**.
2. Monitor: `StreamFrio`. Condición: `temperatura > 8`. **Per object**: `camara`.
3. Acción: *Teams message* con el texto `La cámara {objeto} está a {valor} °C: revisar la puerta`.
4. En **Activations** aparecen los avisos, uno por cámara.

"Por objeto" quiere decir que la regla se evalúa para cada cámara por separado: si la CAM-03 se calienta, avisa por la CAM-03 y no vuelve a avisar por ella durante unos minutos, aunque sigan llegando lecturas altas. Sin eso, una puerta abierta mandaría un aviso cada 5 segundos.

:::practica fabric Las cámaras de frío, de punta a punta
1. Crea `Deposito` (Eventhouse), `StreamFrio` (Eventstream con la fuente de cámaras y destino `Lecturas`) y publícalo.
2. En `Deposito`, la cámara que más se calentó: `Lecturas | top 1 by temperatura`.
3. Cuántas lecturas con la puerta abierta tiene cada cámara: `Lecturas | where puerta_abierta == true | summarize abiertas = count() by camara`.
4. El promedio cada 5 minutos con `render timechart`.
5. Crea la regla de Activator y mira las activaciones.
:::

:::errores
- **Usar `=` para comparar en KQL.** Es `==`; `=` se usa solo para nombrar columnas (`extend f = temperatura * 1.8 + 32`).
- **Mandar todo al Eventhouse sin filtrar.** Lo que no sirve se descarta en el Eventstream: es más barato.
- **Una regla sin "por objeto".** Mezcla todas las cámaras y avisa de más o de menos.
- **Usar tiempo real para un reporte de cierre mensual.** Para eso alcanza con un lakehouse y un pipeline diario.
:::

## Ejercicios

:::ejercicio quiz
¿Qué devuelve `Lecturas | summarize n = count() by bin(ts, 1h)`?
- [ ] Una fila por lectura con su hora
- [x] Cuántas lecturas hubo en cada hora
- [ ] Las lecturas de la última hora
- [ ] La lectura más alta de cada hora
:::

:::ejercicio quiz
Una regla de Activator `temperatura > 8` **por cámara** recibe 30 lecturas altas seguidas de la CAM-02. ¿Cuántos avisos manda?
- [ ] 30, uno por lectura
- [x] Uno por la CAM-02, y no repite durante unos minutos
- [ ] Ninguno, porque necesita una lectura normal antes
- [ ] Uno por cada cámara del depósito
:::

## ✅ Lo que lograste

- Conoces los tres ítems de Real-Time Intelligence y cómo se conectan.
- Configuraste un Eventstream con origen, filtro y destino.
- Consultas con KQL: where, summarize, bin, top y render.
- Creaste una regla de Activator por objeto.
