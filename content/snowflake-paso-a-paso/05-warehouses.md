---
titulo: Warehouses - el cómputo que se paga por segundo
nivel: 2 · Básico-intermedio
duracion: 45
resumen: El warehouse decide qué tan rápido corre una consulta y cuánto cuesta. Creas ANALISIS_WH desde la interfaz, entiendes tamaños y créditos, AUTO_SUSPEND y AUTO_RESUME, lo cambias de tamaño con ALTER WAREHOUSE y aprendes cuándo conviene agrandar (scale up) y cuándo agregar clústeres (scale out).
objetivos: Crear un warehouse desde la interfaz y con SQL | Entender tamaños, créditos y facturación por segundo | Configurar AUTO_SUSPEND y AUTO_RESUME | Cambiar el tamaño con ALTER WAREHOUSE | Elegir entre scale up y scale out
prerrequisitos: snowflake-paso-a-paso-proyecto-ventas-por-pais
autoevaluacion: ¿Sabes cuántos créditos por hora gasta un X-Small? | ¿Sabes qué hace AUTO_SUSPEND? | ¿Sabes qué pasa con el costo al subir un tamaño? | ¿Sabes cuándo conviene un warehouse multi-clúster?
---

:::escenario El pedido
Lucía, líder de datos: *"Los analistas y la carga nocturna usan el mismo warehouse y se pisan. Quiero uno aparte para análisis, chico y que se apague solo."*
:::

## Paso 1 — Crear el warehouse

**Admin → Warehouses → + Warehouse**:

```captura
archivo: snowflake/s05-nuevo.webp
texto: New Warehouse - nombre ANALISIS_WH, tamaño X-Small (1 crédito/hora), Auto suspend 1 minuto y el SQL equivalente
```

```sql norun
CREATE WAREHOUSE analisis_wh
  WAREHOUSE_SIZE = 'XSMALL'
  AUTO_SUSPEND = 60
  AUTO_RESUME = TRUE
  INITIALLY_SUSPENDED = TRUE;
```

## Paso 2 — Cómo se cobra

```captura
archivo: snowflake/s05-lista.webp
texto: Los créditos consumidos y su equivalente en dólares (1) y los warehouses con estado, tamaño, créditos por hora y auto suspend (2)
```

| Tamaño | Créditos por hora |
|---|---|
| X-Small | 1 |
| Small | 2 |
| Medium | 4 |
| Large | 8 |
| X-Large | 16 |

- Se cobra **por segundo** mientras está encendido, con un **mínimo de 60 segundos** cada vez que arranca.
- Suspendido **no cobra**.
- El precio del crédito depende de la edición y la región (en la práctica se estima en USD 3).

| Opción | Qué hace |
|---|---|
| `AUTO_SUSPEND = 60` | Se apaga tras 60 segundos sin consultas |
| `AUTO_RESUME = TRUE` | La próxima consulta lo prende sola |

## Paso 3 — Cambiar el tamaño

```sql norun
USE WAREHOUSE analisis_wh;
ALTER WAREHOUSE analisis_wh SET WAREHOUSE_SIZE = 'SMALL';
SHOW WAREHOUSES;
```

```captura
archivo: snowflake/s05-alter.webp
texto: La hoja usa ANALISIS_WH (1) y SHOW WAREHOUSES lo muestra en Small (2)
```

## Paso 4 — ¿Más grande o más clústeres?

| Problema | Solución | Cómo |
|---|---|---|
| **Una** consulta pesada tarda mucho | **Scale up**: un tamaño más | `WAREHOUSE_SIZE = 'MEDIUM'` |
| **Muchas** consultas chicas hacen cola | **Scale out**: más clústeres del mismo tamaño | `MIN_CLUSTER_COUNT = 1 MAX_CLUSTER_COUNT = 3` (edición Enterprise) |

Duplicar el tamaño duplica el costo por hora, pero si la consulta tarda la mitad, el costo total es el mismo y el resultado llega antes.

## ✅ Lo que lograste

- Creaste un warehouse con auto suspend.
- Entiendes tamaños y créditos.
- Sabes cuándo agrandar y cuándo agregar clústeres.

:::ejercicio quiz
¿Cuántos créditos por hora gasta un warehouse Small?
- [ ] 1
- [x] 2
- [ ] 4
- [ ] 8
:::

:::ejercicio quiz
¿Qué hace AUTO_SUSPEND = 60?
- [x] Apaga el warehouse después de 60 segundos sin consultas
- [ ] Lo prende cada 60 segundos
- [ ] Limita las consultas a 60
- [ ] Borra el warehouse
:::

:::ejercicio quiz
Una consulta pesada tarda 20 minutos en X-Small. ¿Qué pruebas primero?
- [x] Subir el tamaño (scale up)
- [ ] Agregar clústeres (scale out)
- [ ] Apagar el warehouse
- [ ] Cambiar de rol
:::

:::ejercicio quiz
50 analistas lanzan consultas chicas a la vez y hacen cola. ¿Qué conviene?
- [ ] Un warehouse 4X-Large
- [x] Un warehouse multi-clúster (scale out)
- [ ] AUTO_SUSPEND = 0
- [ ] Un esquema nuevo
:::
