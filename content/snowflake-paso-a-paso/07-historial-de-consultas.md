---
titulo: Query History - qué corrió, quién, con qué y cuánto tardó
nivel: 2 · Básico-intermedio
duracion: 30
resumen: Cada sentencia queda registrada con su Query ID, rol, warehouse, duración y estado. Recorres el historial, filtras las fallidas, abres el detalle de una consulta y aprendes a usarlo para encontrar errores, consultas lentas y quién gasta créditos.
objetivos: Leer el historial de consultas | Filtrar consultas fallidas | Abrir el detalle de una consulta | Usar el historial para diagnosticar lentitud y costo
prerrequisitos: snowflake-paso-a-paso-bases-esquemas-y-tablas
autoevaluacion: ¿Sabes filtrar las fallidas? | ¿Sabes qué warehouse usó una consulta? | ¿Sabes reabrir una consulta del historial? | ¿Sabes dónde consultar el historial con SQL?
---

:::analogia La caja negra del avión
El historial de consultas es la caja negra: registra cada sentencia con quién la ejecutó, con qué rol y warehouse, cuánto tardó y si falló. Cuando algo sale mal, primero se lee la caja negra.
:::

## Paso 1 — El historial

**Monitoring → Query History**:

```captura
archivo: snowflake/s07-historial.webp
texto: Los filtros All, Succeeded y Failed (1) y cada sentencia con su estado, SQL, Query ID, warehouse, rol, duración y filas (2)
```

## Paso 2 — Las fallidas

**Failed**:

```captura
archivo: snowflake/s07-fallidas.webp
texto: La consulta fallida del proyecto 1 - FROM pedido
```

Haz clic en la fila:

```captura
archivo: snowflake/s07-detalle.webp
texto: El detalle - estado, rol, warehouse, contexto, duración, el SQL y el error, con Open in Worksheet
```

## Paso 3 — Para qué sirve

| Pregunta | Qué mirar |
|---|---|
| ¿Por qué falló el reporte de esta mañana? | Failed, el error y el rol con el que corrió |
| ¿Qué consulta tarda tanto? | Ordenar por **Duration** |
| ¿Quién gasta el warehouse? | El rol y el warehouse de las consultas más largas |
| ¿Qué SQL ejecutó la carga? | El texto completo, que se puede reabrir |

:::nota En Snowflake real, con SQL
El historial también se consulta con SQL: `SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY` guarda un año de historia (con hasta 45 minutos de demora) y la función `INFORMATION_SCHEMA.QUERY_HISTORY()` los últimos 7 días al instante. El **Query Profile** de cada consulta muestra paso a paso dónde se fue el tiempo.
:::

:::errores
- **Buscar solo en la hoja.** Si la consulta la corrió otra persona o un proceso, está en Query History (o en ACCOUNT_USAGE), no en tu hoja.
- **Mirar solo la duración.** Una consulta lenta puede estar esperando en cola por un warehouse saturado; el Query Profile muestra dónde se fue el tiempo.
- **Olvidar el retraso de ACCOUNT_USAGE.** Sus vistas tienen hasta unas horas de demora; para lo de hace minutos usa Query History o INFORMATION_SCHEMA.
:::

## ✅ Lo que lograste

- Lees y filtras el historial.
- Abres el detalle de una consulta.
- Sabes usarlo para diagnosticar.

:::ejercicio quiz
¿Dónde encuentras la consulta que falló esta mañana?
- [x] Query History con el filtro Failed
- [ ] Warehouses
- [ ] Marketplace
- [ ] Users & Roles
:::

:::ejercicio quiz
¿Qué columna ordenas para encontrar la consulta más lenta?
- [ ] Rows
- [x] Duration
- [ ] Role
- [ ] Status
:::

:::ejercicio quiz
¿Qué vista de Snowflake guarda un año de historial de consultas?
- [ ] INFORMATION_SCHEMA.TABLES
- [x] SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
- [ ] PUBLIC.HISTORIAL
- [ ] INFORMATION_SCHEMA.QUERY_HISTORY
:::

:::ejercicio quiz
¿Qué muestra el Query Profile?
- [ ] El texto SQL de la consulta, formateado
- [x] Paso a paso dónde se fue el tiempo de una consulta
- [ ] Los créditos de la cuenta
- [ ] Los roles
:::
