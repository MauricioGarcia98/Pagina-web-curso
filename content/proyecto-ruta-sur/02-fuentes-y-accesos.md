---
titulo: Fuentes y accesos - el stream de telemetría y la API del TMS
nivel: Avanzado
duracion: 35
resumen: La referencia técnica - el tópico de telemetría (particiones, retención, formato de cada mensaje y sus dos versiones de firmware), cómo consumirlo con kcat y con read_kafka y tablas de streaming en Databricks, y la API del TMS con el plan de rutas.
objetivos: Consumir un tópico con varias particiones y entender el orden dentro de cada una | Usar tablas de streaming con checkpoint sobre Kafka | Leer dos versiones de un esquema en el mismo stream | Traer un plan que cambia durante el día
prerrequisitos: proyecto-ruta-sur-el-pedido
autoevaluacion: ¿Sabes en qué orden llegan los mensajes de distintas particiones? | ¿Sabes qué guarda el checkpoint de una tabla de streaming? | ¿Sabes en qué unidad viene la velocidad en cada firmware?
---

<div data-ruta="fuentes"></div>

## 1. Accesos

```bash
ruta accesos
```

Credenciales de prueba, solo tuyas. Van a un Key Vault.

## 2. La telemetría

| Dato | Valor |
|---|---|
| Broker | `rutasur-telemetria.servicebus.windows.net:9093` (SASL_SSL, PLAIN, usuario `$ConnectionString`) |
| Tópico | `rutasur.telemetria` |
| Particiones | 4. La **clave** del mensaje es el vehículo: todos los mensajes de una camioneta van a la misma partición |
| Retención | 3 días |

El orden está garantizado **dentro de una partición** y por orden de **llegada**, no de ocurrencia.

### El mensaje (firmware 1.4)

```json
{"fw": "1.4", "event_id": "7b47…", "vehiculo": "V12", "evento": "ping", "ts_dispositivo": "2026-11-18T13:21:07.000Z",
 "lat": -34.8311, "lon": -56.1575, "velocidad_kmh": 23}
```

Eventos: `inicio_jornada`, `ping` (cada 3 minutos), `llegada_parada`, `entrega_completada`, `entrega_fallida` (con `motivo`), `fin_jornada`. Los de parada y entrega traen `pedido_id`.

> **Nota del proveedor de GPS (hace un mes):** "Estamos preparando el firmware 2.0, con mejor precisión. Más detalles cuando esté disponible."

## 3. Consumir

```bash
kcat -L
kcat -C -t rutasur.telemetria -p 0 -o -5 -e -f '%p %o %T %k %s\n'
kcat -G ruta-lago rutasur.telemetria -o beginning -e > telemetria.jsonl
```

```sql norun
-- Databricks: una tabla de streaming lee de Kafka y guarda hasta dónde leyó (checkpoint)
CREATE OR REFRESH STREAMING TABLE ruta.bronze.telemetria AS
SELECT CAST(value AS STRING) AS valor, partition, offset, timestamp AS ts_ingesta
FROM STREAM read_kafka(
  bootstrapServers => 'rutasur-telemetria.servicebus.windows.net:9093',
  subscribe => 'rutasur.telemetria',
  startingOffsets => 'earliest',
  `kafka.security.protocol` => 'SASL_SSL',
  `kafka.sasl.mechanism` => 'PLAIN',
  `kafka.sasl.jaas.config` => 'kafkashaded.org.apache.kafka.common.security.plain.PlainLoginModule required username="$ConnectionString" password="<cadena de conexión>";'
);

REFRESH STREAMING TABLE ruta.bronze.telemetria;   -- solo agrega los mensajes nuevos
```

## 4. El TMS

`https://api.rutasur.example/v1` · cabecera `X-Api-Key` · 30 pedidos por minuto.

| Ruta | Qué devuelve |
|---|---|
| `GET /v1/rutas?fecha=AAAA-MM-DD` | El plan del día: por vehículo, sus pedidos con `pedido_id`, `zona`, `lat`, `lon`, `ventana_inicio`, `ventana_fin` (UTC) y `urgente`. Se publica a las 18:00 del día anterior y puede cambiar durante el día (`actualizado_en`) |
| `GET /v1/pedidos/{pedido_id}` | Un pedido |

```bash
curl -s "https://api.rutasur.example/v1/rutas?fecha=2026-11-18" -H "X-Api-Key: $RS_API_KEY" | head -40
```

## Ejercicios

:::ejercicio quiz
La tabla de streaming se creó ayer. Hoy ejecutas REFRESH. ¿Qué lee?
- [ ] Todo el tópico desde el principio
- [x] Solo los mensajes que llegaron después del checkpoint (los offsets que ya procesó, por partición)
- [ ] Solo los mensajes de hoy según la hora del dispositivo
- [ ] Nada, hay que borrarla y crearla de nuevo
:::

:::ejercicio quiz
Dos mensajes de V03 están en la partición 2 con offsets 900 y 901. ¿Qué puedes asegurar?
- [x] Que el 900 llegó al stream antes que el 901 (no necesariamente que pasó antes)
- [ ] Que el 900 pasó antes que el 901
- [ ] Que son el mismo evento
- [ ] Nada
:::

## Resumen

- Un tópico, 4 particiones, clave = vehículo; orden por llegada dentro de cada partición.
- Tablas de streaming con **checkpoint**: cada REFRESH lee solo lo nuevo.
- El plan sale del **TMS** y puede cambiar durante el día.
