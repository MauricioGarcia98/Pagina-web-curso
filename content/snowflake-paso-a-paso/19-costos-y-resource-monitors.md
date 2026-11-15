---
titulo: Costos y resource monitors - que la factura no sorprenda
nivel: 5 · Avanzado
duracion: 40
resumen: Snowflake cobra cómputo, almacenamiento y algunos servicios. Lees los créditos consumidos por warehouse, creas un resource monitor que avisa al 80 % y suspende al 100 % de un presupuesto mensual, lo asignas al warehouse de análisis y conoces dónde se mira el consumo en una cuenta real.
objetivos: Entender qué se paga en Snowflake | Leer el consumo de créditos por warehouse | Crear y asignar un resource monitor | Conocer Cost Management y las vistas de uso
prerrequisitos: snowflake-paso-a-paso-grants
autoevaluacion: ¿Sabes qué consume más en una cuenta típica? | ¿Sabes quién puede crear un resource monitor? | ¿Sabes qué hace DO SUSPEND? | ¿Sabes dónde se ve el consumo diario?
---

## Paso 1 — Qué se paga

| Concepto | Cómo se cobra |
|---|---|
| **Cómputo** (warehouses) | Créditos por segundo encendido, según el tamaño. Suele ser la mayor parte |
| **Almacenamiento** | Por TB al mes, incluido Time Travel y Fail-safe |
| **Servicios en la nube** | Solo si superan el 10 % del cómputo diario |
| **Funciones serverless** | Snowpipe, tareas serverless, clustering automático: créditos propios |

```captura
archivo: snowflake/s19-creditos.webp
texto: Créditos consumidos en la práctica (1) y el costo de cada tamaño si se usa una hora por día durante un mes (2)
```

## Paso 2 — Un resource monitor

```sql norun
USE ROLE ACCOUNTADMIN;
CREATE RESOURCE MONITOR limite_mensual
  WITH CREDIT_QUOTA = 50
  FREQUENCY = MONTHLY
  START_TIMESTAMP = IMMEDIATELY
  TRIGGERS ON 80 PERCENT DO NOTIFY
           ON 100 PERCENT DO SUSPEND;
ALTER WAREHOUSE analisis_wh SET RESOURCE_MONITOR = limite_mensual;
SHOW RESOURCE MONITORS;
```

```captura
archivo: snowflake/s19-monitor.webp
texto: El resource monitor (1) - cuota de 50 créditos, usados y restantes, asignado a un warehouse (2)
```

| Acción | Qué hace |
|---|---|
| `DO NOTIFY` | Avisa por correo a los administradores |
| `DO SUSPEND` | Suspende el warehouse cuando terminan las consultas en curso |
| `DO SUSPEND_IMMEDIATE` | Lo suspende ya, cancelando lo que esté corriendo |

Solo **ACCOUNTADMIN** puede crear resource monitors y asignarlos.

## Paso 3 — Mirar el consumo en una cuenta real

```captura
archivo: snowflake/s19-cost-management.webp
texto: Cost Management no está simulado en la práctica
```

| Dónde | Qué muestra |
|---|---|
| **Admin → Cost Management** | Consumo por día, warehouse y servicio, presupuestos y alertas |
| `SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY` | Créditos por warehouse y hora, para consultar con SQL |
| `SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY` | Qué consultas usaron más tiempo de warehouse |

## ✅ Lo que lograste

- Sabes qué se paga en Snowflake.
- Creaste y asignaste un resource monitor.
- Sabes dónde se mira el consumo real.

:::ejercicio quiz
¿Qué suele ser la mayor parte de la factura de Snowflake?
- [x] El cómputo de los warehouses
- [ ] Los usuarios
- [ ] Las hojas SQL
- [ ] El Marketplace
:::

:::ejercicio quiz
¿Quién puede crear un resource monitor?
- [ ] Cualquier rol
- [ ] SYSADMIN
- [x] ACCOUNTADMIN
- [ ] PUBLIC
:::

:::ejercicio quiz
¿Qué hace ON 100 PERCENT DO SUSPEND?
- [ ] Borra el warehouse
- [x] Suspende el warehouse al llegar a la cuota, después de terminar lo que está corriendo
- [ ] Avisa por correo nada más
- [ ] Duplica la cuota
:::

:::ejercicio quiz
¿Qué vista usas para ver créditos por warehouse con SQL?
- [ ] INFORMATION_SCHEMA.TABLES
- [x] SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY
- [ ] PUBLIC.CREDITOS
- [ ] SHOW TABLES
:::
