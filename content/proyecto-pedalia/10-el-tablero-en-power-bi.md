---
titulo: El tablero en Power BI - tres fuentes, un modelo y números que cuadran
nivel: Intermedio
duracion: 45
resumen: Armas el tablero de operaciones importando datos de Snowflake (ingresos), BigQuery (uso por barrio) y Databricks (viajes por estación). Construyes una tabla de fechas, relacionas las tres fuentes por día, escribes las medidas con DAX y verificas que el tablero dice lo mismo que gold antes de mostrarlo.
objetivos: Conectar Power BI a Snowflake, BigQuery y Databricks | Relacionar tablas de distintas fuentes con una tabla de fechas | Escribir medidas DAX en vez de usar columnas sumadas | Verificar los números del tablero contra la fuente
prerrequisitos: proyecto-pedalia-orquestar-con-airflow | interfaces-power-bi-por-dentro
autoevaluacion: ¿Sabes por qué conviene una tabla de fechas propia? | ¿Sabes qué consulta ejecuta Power BI en Snowflake al importar? | ¿Sabes por qué una medida es mejor que arrastrar una columna? | ¿Sabes cómo comprobar que el tablero cuadra con gold?
---

:::escenario Jueves, 15:00
Rocío (operaciones) quiere el tablero para la reunión del viernes. Finanzas y marketing también van a mirarlo. Si cada área ve un número distinto del mismo día, la reunión se va a tratar de eso y no de las bicis.
:::

:::analogia El mapa con una sola escala
Si juntas tres mapas dibujados en escalas distintas, las calles no coinciden. La tabla de fechas es la escala común: las tres fuentes se pegan a ella, y así "el 9 de noviembre" significa lo mismo en todos los gráficos.
:::

## 1. Traer las tres fuentes

En el [Power BI de práctica](#/powerbi): **Inicio → Obtener datos**.

| Conector | Qué importar | Qué pasa por detrás |
|---|---|---|
| **Snowflake** | `PEDALIA` → `FINANZAS.INGRESOS_DIARIOS` (warehouse `COMPUTE_WH`) | Power BI ejecuta un `SELECT` con el warehouse: aparece en Query History de Snowflake y consume créditos |
| **Google BigQuery** | `pedalia_mkt.uso_por_barrio` | Un job de consulta en BigQuery, con sus bytes procesados |
| **Azure Databricks** | `pedalia.gold.viajes_por_estacion` | Una consulta al SQL warehouse de Databricks |

En la vista previa de cada tabla, confirma que las fechas vienen como fecha y los números como número. Si una columna de fecha llega como texto, corrígelo en **Transformar datos** (Power Query) antes de cargar.

## 2. La tabla de fechas

Las tres tablas tienen una columna de fecha, pero ninguna tiene todos los días. Crea una tabla de fechas en **Modelado → Nueva tabla**:

```text
Calendario = CALENDAR(DATE(2026, 11, 1), DATE(2026, 11, 30))
```

Márcala como tabla de fechas (**Herramientas de tabla → Marcar como tabla de fechas**) y relaciona, en la vista **Modelo**:

- `Calendario[Date]` → `INGRESOS_DIARIOS[FECHA]`
- `Calendario[Date]` → `uso_por_barrio[fecha]`
- `Calendario[Date]` → `viajes_por_estacion[fecha]`

Las tres relaciones son de uno a muchos, con filtro en una sola dirección (del calendario a cada tabla).

## 3. Las medidas

Arrastrar una columna numérica al gráfico funciona, pero cada visual decide cómo sumarla. Una **medida** se define una vez y vale igual en todos lados:

```text
Ingresos = SUM(INGRESOS_DIARIOS[INGRESOS])
Viajes = SUM(viajes_por_estacion[viajes_salida])
Viajes pase día = SUM(uso_por_barrio[viajes_pase_dia])
% pase día = DIVIDE([Viajes pase día], SUM(uso_por_barrio[viajes]))
Fuera de estación = SUM(viajes_por_estacion[fuera_de_estacion])
```

`DIVIDE` en vez de `/` evita el error de división por cero en un día sin viajes.

## 4. El informe

Una página, pensada para la reunión:

- Tarjetas arriba: **Viajes**, **Ingresos**, **% pase día**, **Fuera de estación**.
- Columnas: **Viajes por día** (eje: `Calendario[Date]`).
- Barras: **% pase día por barrio** (para marketing).
- Tabla: estaciones con viajes, minutos promedio y fuera de estación, ordenada por viajes (para operaciones).
- Segmentador por fecha.

## 5. Antes de mostrarlo: ¿cuadra?

Elige un día en el segmentador y compara con la fuente:

```sql norun
-- en Databricks
SELECT SUM(viajes) AS viajes, SUM(ingresos) AS ingresos
FROM pedalia.gold.ingresos_diarios WHERE fecha = '2026-11-09';
```

La tarjeta **Viajes** del tablero tiene que dar lo mismo que `viajes`, e **Ingresos** lo mismo que `ingresos`. Si no coinciden, no se presenta: se busca la diferencia (una relación mal hecha, una carga duplicada en Snowflake, un día que falta en BigQuery).

:::tip Lo que finanzas va a preguntar
"¿De qué hora es este número?". Agrega al informe una tarjeta con la fecha de la última actualización (la fecha máxima del calendario con datos) y escribe en el pie de página: "Fuente: app de Pedalia, procesado cada día a las 7:00. Viajes válidos según el contrato v1".
:::

:::errores
- **Relacionar las tablas entre sí por fecha** (Snowflake con BigQuery directamente): crea relaciones de muchos a muchos y totales duplicados. Todas van contra la tabla de fechas.
- **Usar la fecha de cada tabla en el eje** en vez de `Calendario[Date]`: los días sin datos en una fuente desaparecen del gráfico y las comparaciones mienten.
- **Columnas sumadas en vez de medidas**: un visual promedia, otro suma, y el mismo número sale distinto.
- **Presentar sin comparar contra la fuente**: el primer número equivocado en una reunión le quita confianza a todo el tablero.
:::

## Ejercicios

:::ejercicio quiz
¿Por qué se relacionan las tres tablas con una tabla de fechas y no entre ellas?
- [ ] Porque Power BI no permite relacionar tablas de distintas fuentes
- [x] Porque la tabla de fechas tiene todos los días una sola vez y cada fuente se relaciona de uno a muchos; entre ellas serían de muchos a muchos
- [ ] Porque así el informe se actualiza más rápido
- [ ] Porque las fechas de Snowflake están en otra zona horaria
:::

:::ejercicio quiz
Al importar desde Snowflake, ¿qué queda registrado en Snowflake?
- [ ] Nada: Power BI copia los archivos del stage directamente
- [x] Una consulta en Query History, ejecutada con el warehouse elegido (y los créditos que consume)
- [ ] Un nuevo stage con los datos del informe
- [ ] Un job en BigQuery
:::

:::ejercicio quiz
La tarjeta de ingresos del tablero da el doble que gold para el mismo día. ¿Qué revisas primero?
- [ ] El color de la tarjeta
- [ ] Si la medida usa SUM o AVERAGE
- [x] Si la tabla de Snowflake tiene filas duplicadas (una carga sin TRUNCATE o con COPY INTO repetido) o si hay una relación de muchos a muchos
- [ ] Si Databricks redondeó los decimales
:::

## Resumen

- Cada conector ejecuta una consulta real en su fuente (con su costo).
- Una **tabla de fechas** marcada como tal es la escala común de todas las fuentes.
- Las **medidas** definen el cálculo una vez; `DIVIDE` evita errores.
- Antes de mostrar, **compara un día contra gold**. Si no cuadra, no se presenta.
