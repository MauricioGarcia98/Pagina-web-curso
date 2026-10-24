---
titulo: Cómo pensar un problema de negocio (el método)
nivel: Intermedio
duracion: 25
resumen: Un método paso a paso para pasar de una pregunta del negocio a una consulta correcta.
objetivos: Aplicar un método de 6 pasos para pasar de una pregunta vaga a una consulta correcta | Definir el grano del resultado y cada métrica como fórmula antes de escribir SQL | Reconocer las trampas lógicas más comunes (denominador, doble conteo, promedio de promedios) | Validar un resultado y comunicarlo como una recomendación de negocio
prerrequisitos: sql-cte | sql-case
autoevaluacion: ¿Puedes convertir "¿cómo vienen las cancelaciones?" en una frase precisa con métrica, grano y período? | ¿Sabes por qué filtrar `estado = 'completado'` arruina una tasa de cancelación? | ¿Puedes explicar con un ejemplo el doble conteo por JOIN? | ¿Sabes al menos dos formas de validar un resultado antes de entregarlo? | ¿Puedes escribir la conclusión de un análisis en dos frases para alguien que no sabe SQL?
---

<!-- estandar:escenario -->
:::escenario El Grupo Andino
Tienda Andina pertenece a un grupo inversor, el **Grupo Andino**, que tiene otras siete empresas: un banco, una app de música, una app de viajes, una clínica, un software para pymes, una aerolínea y una empresa de logística. El grupo decidió que el equipo de datos de Tienda Andina sea también el equipo **central** de todas.

Martín te avisa:

> "Desde ahora vas a recibir pedidos de las ocho empresas. Cada una habla su propio idioma: el banco habla de mora, la app de música de churn, la aerolínea de ocupación. No te preocupes por la sintaxis, que ya la sabes: lo difícil es entender qué te están preguntando."

Este módulo entrena exactamente eso: **la lógica de negocio**. Empieza por el método que vas a usar en todos los casos.
:::
En este módulo vas a trabajar con **8 empresas distintas**. Cada una tiene sus propias tablas y sus propios problemas. Todas están en la misma base de datos, separadas por un prefijo:

| Empresa | Rubro | Tablas |
|---|---|---|
| 🛒 Tienda Andina | E-commerce | `clientes`, `pedidos`, `detalle_pedidos`, … (la que ya conoces) |
| 🏦 Banco Austral | Banca / fintech | `banco_clientes`, `banco_cuentas`, `banco_transacciones`, `banco_prestamos`, `banco_cuotas` |
| 🎧 Ritmo | Streaming de música | `streaming_usuarios`, `streaming_suscripciones`, `streaming_contenidos`, `streaming_reproducciones` |
| 🚕 Ruta | Movilidad (viajes) | `viajes_pasajeros`, `viajes_conductores`, `viajes_viajes` |
| 🏥 Clínica del Sur | Salud | `clinica_pacientes`, `clinica_medicos`, `clinica_turnos`, `clinica_facturas` |
| ☁️ Nube Pyme | Software B2B (SaaS) | `saas_empresas`, `saas_planes`, `saas_facturas`, `saas_tickets` |
| ✈️ Cóndor Air | Aerolínea | `vuelos_aeropuertos`, `vuelos_vuelos`, `vuelos_reservas` |
| 📦 Mercurio | Logística | `logistica_almacenes`, `logistica_movimientos`, `logistica_envios` |

La meta de este módulo no es aprender sintaxis nueva, sino **lógica**: entender qué te piden y traducirlo bien.

## El método de 6 pasos

**1. Traduce la pregunta a una frase precisa.**
“¿Cómo vienen las cancelaciones?” es vago. “Porcentaje de viajes cancelados (por el pasajero o por el conductor) sobre el total de solicitudes, por hora del día, entre julio y diciembre de 2024” es preciso.

**2. Define el grano del resultado: “una fila por…”.**
¿Una fila por hora? ¿Por ciudad y hora? Esto decide tu `GROUP BY`.

**3. Define cada métrica como una fórmula.**
`tasa_cancelacion = cancelados / solicitudes`. ¿Qué cuenta como “cancelado”? ¿Qué va en el denominador? Aquí se cometen la mayoría de los errores.

**4. Identifica las tablas y cómo se unen.**
¿Qué tabla tiene el evento que cuento? ¿Qué tabla tiene el atributo por el que agrupo? ¿La unión **multiplica** filas (uno a muchos)?

**5. Resuélvelo en pasos con CTEs y mira los datos en cada paso.**

**6. Valida el resultado con sentido común.**
¿Los porcentajes están entre 0 y 100? ¿El total coincide con un conteo simple? ¿Hay NULLs inesperados?

:::analogia Como un detective
Antes de escribir código, un buen analista hace preguntas: ¿qué cuenta como “cliente activo”?, ¿los pedidos cancelados suman ventas?, ¿en qué zona horaria están las fechas? Las respuestas cambian el resultado más que cualquier truco de SQL.
:::

## El método aplicado, de punta a punta

Veamos los 6 pasos con un pedido real. La gerente de operaciones de **Ruta** (la app de viajes) te escribe un viernes:

> "Siento que perdemos muchos viajes en las horas pico. ¿Es así?"

**1. Traducir a una frase precisa.** "Perdemos viajes" puede significar tres cosas: que el pasajero cancela, que el conductor cancela o que nadie acepta el viaje (`sin_conductor`). Preguntas y te confirma que le importan **las tres**, pero quiere ver aparte el `sin_conductor`, porque eso se arregla consiguiendo más conductores. La frase queda: *"Porcentaje de solicitudes que no terminaron en un viaje completado, y porcentaje sin conductor, por franja horaria del día, sobre todas las solicitudes."*

**2. El grano.** Una fila **por franja horaria**: madrugada (0 a 5 h), mañana (6 a 11), tarde (12 a 17) y noche (18 a 23).

**3. Las fórmulas.**
- `pct_perdidos = solicitudes con estado distinto de 'completado' / todas las solicitudes`
- `pct_sin_conductor = solicitudes con estado 'sin_conductor' / todas las solicitudes`

El denominador son **todas** las solicitudes. Si filtraras `WHERE estado = 'completado'`, perderías justamente lo que quieres medir.

**4. Las tablas.** Todo está en `viajes_viajes`: una fila por solicitud, con su `estado` y la `fecha_hora_solicitud`. No hace falta ningún JOIN, así que no hay riesgo de multiplicar filas.

**5. Resolver en pasos.** Una CTE extrae la hora, otra asigna la franja y la consulta final calcula las métricas con `CASE` **dentro** de la agregación:

```sql
WITH solicitudes AS (
    SELECT
        viaje_id,
        estado,
        CAST(strftime('%H', fecha_hora_solicitud) AS INTEGER) AS hora
    FROM viajes_viajes
),
con_franja AS (
    SELECT
        *,
        CASE
            WHEN hora < 6  THEN '1 madrugada (0-5)'
            WHEN hora < 12 THEN '2 mañana (6-11)'
            WHEN hora < 18 THEN '3 tarde (12-17)'
            ELSE                '4 noche (18-23)'
        END AS franja
    FROM solicitudes
)
SELECT
    franja,
    COUNT(*) AS solicitudes,
    SUM(CASE WHEN estado <> 'completado' THEN 1 ELSE 0 END) AS perdidos,
    ROUND(100.0 * SUM(CASE WHEN estado <> 'completado' THEN 1 ELSE 0 END) / COUNT(*), 1) AS pct_perdidos,
    ROUND(100.0 * SUM(CASE WHEN estado = 'sin_conductor' THEN 1 ELSE 0 END) / COUNT(*), 1) AS pct_sin_conductor
FROM con_franja
GROUP BY franja
ORDER BY franja;
```

**6. Validar.** Antes de mandar el resultado:

- ¿Las solicitudes de las 4 franjas suman el total de la tabla? 977 + 3.767 + 2.789 + 3.467 = **11.000**, igual que `SELECT COUNT(*) FROM viajes_viajes`. ✓
- ¿Los perdidos suman lo mismo que un conteo directo? 159 + 742 + 496 + 680 = **2.077**. ✓
- ¿Los porcentajes están entre 0 y 100 y tienen sentido? Sí: entre 16 y 20 %.

**La respuesta al negocio** (en lenguaje de negocio, no de SQL):

> "Sí, la mañana (6 a 11 h) y la noche (18 a 23 h) son las franjas con más viajes perdidos, casi el 20 % de las solicitudes. La diferencia viene sobre todo de solicitudes **sin conductor**: 7,5 % en la mañana contra 3,3 % en la madrugada. Es un problema de **oferta**: en las horas pico faltan conductores. Una opción es un incentivo para conectarse en esas franjas."

Fíjate en lo que hiciste: preguntaste qué significaba "perder", definiste el denominador antes de escribir SQL, validaste los totales y respondiste con una **recomendación**, no con una tabla. Eso es lo que distingue un análisis útil de una consulta que "corre".

## Trampas lógicas que vas a encontrar

| Trampa | Ejemplo | Cómo evitarla |
|---|---|---|
| **Denominador equivocado** | Tasa de ausentismo calculada sobre turnos atendidos en vez de turnos agendados | Escribe la fórmula antes de la consulta |
| **Doble conteo por JOIN** | Sumar el monto de préstamos después de unirlos con sus cuotas | Agrega en el grano correcto **antes** de unir |
| **Promedio de promedios** | Promediar el % de ocupación de cada vuelo en vez de sumar pasajeros / sumar asientos | Decide si quieres la media simple o la ponderada |
| **NULL que desaparece** | `COUNT(calificacion)` ignora los viajes sin calificar | Sé consciente de qué ignora cada función |
| **Filtros que cambian la población** | Filtrar `estado = 'completado'` y luego calcular la tasa de cancelación (¡siempre da 0!) | Filtra dentro de la métrica con `CASE`, no en el `WHERE` |
| **Fechas** | Comparar `'2024-12-31 18:00:00' <= '2024-12-31'` (da falso) | Usa `date(...)` o rangos semiabiertos |

<!-- estandar:trabajo -->
:::trabajo
- En el trabajo real, el paso 1 (traducir la pregunta) suele ser una conversación de 10 minutos con quien pidió el análisis. Ahorra días: la mayoría de los "números que no cuadran" vienen de definiciones distintas, no de errores de SQL.
- Las definiciones acordadas ("cliente activo = compró en los últimos 90 días") se escriben en un documento o en la descripción del modelo en dbt. La próxima vez que alguien pregunte, la respuesta ya está.
- Entregar una tabla sin conclusión obliga al otro a interpretarla, y puede interpretarla mal. Acompaña siempre los números con dos o tres frases: qué encontraste, qué tan seguro es y qué recomiendas.
:::

<!-- estandar:entrevista -->
:::entrevista "Te piden la tasa de conversión del sitio. ¿Qué preguntas haces antes de calcularla?"
¿Conversión de qué a qué (visita a compra, carrito a compra)? ¿Por sesión o por usuario? ¿En qué período? ¿Se excluyen bots, empleados o pedidos cancelados? ¿Cómo se trata a un usuario que compra dos veces? Mostrar que el número depende de esas decisiones es exactamente lo que buscan con esta pregunta.
:::

:::ejercicio quiz
Te piden la “tasa de cancelación de viajes”. Escribes `SELECT COUNT(*) FROM viajes_viajes WHERE estado = 'completado'` y luego divides cancelados por ese número. ¿Qué error lógico cometiste?

- [ ] Ninguno
- [x] El denominador debería ser el total de solicitudes (todas las filas), no solo los completados
- [ ] Debiste usar AVG
- [ ] Falta un ORDER BY
:::

:::ejercicio quiz
Un préstamo tiene 12 cuotas. Unes `banco_prestamos` con `banco_cuotas` y calculas `SUM(p.monto)`. ¿Qué pasa?

- [ ] Da el monto prestado correcto
- [x] El monto de cada préstamo se suma 12 veces (una por cuota): doble conteo
- [ ] Da error
- [ ] Da NULL
:::

:::ejercicio quiz
El vuelo A tiene 10 de 100 asientos ocupados (10%) y el vuelo B 180 de 200 (90%). ¿Cuál es la ocupación **total** de la aerolínea?

- [ ] 50% (promedio de 10% y 90%)
- [x] 63,3% (190 pasajeros / 300 asientos)
- [ ] 90%
- [ ] 100%
```explicacion
Promediar porcentajes ignora que los vuelos tienen tamaños distintos. La ocupación total es **suma de pasajeros / suma de asientos** (promedio ponderado).
```
:::

:::ejercicio sql
Calentamiento: cuenta cuántas filas tiene cada tabla principal de los casos. Devuelve una fila por empresa con columnas `empresa` y `filas`, usando `UNION ALL` de estos conteos: `banco_transacciones` (`'banco'`), `streaming_reproducciones` (`'streaming'`), `viajes_viajes` (`'viajes'`), `clinica_turnos` (`'clinica'`), `saas_facturas` (`'saas'`), `vuelos_vuelos` (`'vuelos'`) y `logistica_envios` (`'logistica'`).
```sql solucion
SELECT 'banco' AS empresa, COUNT(*) AS filas FROM banco_transacciones
UNION ALL SELECT 'streaming', COUNT(*) FROM streaming_reproducciones
UNION ALL SELECT 'viajes', COUNT(*) FROM viajes_viajes
UNION ALL SELECT 'clinica', COUNT(*) FROM clinica_turnos
UNION ALL SELECT 'saas', COUNT(*) FROM saas_facturas
UNION ALL SELECT 'vuelos', COUNT(*) FROM vuelos_vuelos
UNION ALL SELECT 'logistica', COUNT(*) FROM logistica_envios;
```
:::
