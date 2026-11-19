---
titulo: El pedido - cinco laboratorios, cinco formatos y datos de salud
nivel: Avanzado
duracion: 25
resumen: Red Analítica junta cinco laboratorios clínicos que nunca compartieron datos. Cada uno deja sus resultados en un servidor SFTP, a su manera. Dirección médica quiere ver a cada paciente completo; protección de datos exige que nadie del equipo vea nombres ni documentos. Esta página es el pedido, sin paso a paso.
objetivos: Entender un pedido con requisitos de negocio y de privacidad a la vez | Identificar los riesgos de integrar fuentes heterogéneas | Planificar una ingesta por archivos con llegadas irregulares | Distinguir anonimizar de seudonimizar
prerrequisitos: proyecto-mercado-vecino-el-pedido
autoevaluacion: ¿Sabes por qué seudonimizar no es lo mismo que anonimizar? | ¿Sabes qué puede cambiar de un día para otro en un archivo que manda un tercero? | ¿Sabes qué se entrega y cómo se revisa?
---

:::escenario Lunes, 8:30 · Red Analítica
La red se formó hace un mes uniendo cinco laboratorios de la ciudad: Norte, Centro, Sur, Costa y Cerro. Cada uno tiene su sistema, su gente y sus costumbres. Lo único en común es un servidor SFTP donde cada laboratorio deja un archivo por día con los resultados del día anterior. Eres la primera persona de datos de la red.
:::

## Los dos correos

> **De:** Dra. Silvia Prado (Dirección médica)
>
> Hoy un paciente que se atiende en Norte y en Cerro tiene sus análisis en dos lugares que no se hablan. Necesito un solo lugar con todos los resultados, comparables entre sí: la glucosa de un laboratorio tiene que significar lo mismo que la del otro. Y quiero indicadores por día y por laboratorio.

> **De:** Delegado de protección de datos
>
> Recordatorio: son datos de salud, la categoría más sensible. El equipo de datos **no** trabaja con nombres ni documentos: cada paciente se identifica con un seudónimo estable. Y si una persona pide que borremos sus datos, se borran de todas las copias que controlamos, en 72 horas.

## Lo que tienes

| Sistema | Qué es |
|---|---|
| **Servidor SFTP** `sftp.redanalitica.example` | Una carpeta por laboratorio en `/entrantes/`. Cada laboratorio sube un archivo por día, cuando puede. Los archivos se borran a los 7 días |
| **Documentación de cada laboratorio** | Formato, codificación, códigos de estudio y unidades (página siguiente) |
| **Herramientas** | Terminal (`sftp`, `scp`, `iconv`, `file`), portal de Azure (lago y Key Vault), Databricks, Airflow y Power BI de práctica |

Las fuentes están **vivas**: los archivos llegan cada día con los resultados del día anterior, y los laboratorios cambian cosas sin avisar.

## Lo que hay que entregar

| Tabla | Qué es |
|---|---|
| `red.silver.resultados` | Un registro por **resultado** de los 5 laboratorios: laboratorio, muestra, estudio en **código canónico**, resultado en **unidad canónica**, fecha de toma (hora de la ciudad) y **paciente_id** (seudónimo). Sin nombres, documentos ni fechas de nacimiento |
| `red.gold.resultados_diarios` | Por día, laboratorio y estudio: cantidad de resultados y cuántos fuera del rango de referencia |

El detalle está en [La entrega](#/l/proyecto-red-analitica-la-entrega) y el tablero con lo que va llegando, en [El día a día](#/l/proyecto-red-analitica-el-dia-a-dia).

:::trabajo Seudonimizar no es anonimizar
Un **seudónimo** reemplaza el documento por un identificador que no lo revela, pero que es el mismo cada vez (por ejemplo, un hash del documento con una **sal** secreta). Con la sal se puede volver a calcular, y por eso la sal se guarda en un Key Vault y no la tiene cualquiera. **Anonimizar** es que ya no se pueda volver a la persona de ninguna forma. Para unir los análisis de un paciente entre laboratorios necesitas un seudónimo, no anonimizar.
:::

## Antes de empezar

Escribe en tus notas:

- Cómo vas a reconocer al mismo paciente si cada laboratorio escribe el documento distinto.
- Qué haces si un archivo no llega, llega dos veces o llega corregido.
- Dónde guardas la clave SSH y la sal.
- Cómo vas a enterarte si un laboratorio cambia el formato sin avisar.

## Ejercicios

:::ejercicio quiz
¿Por qué el seudónimo se calcula con una sal secreta y no solo con sha2(documento)?
- [ ] Porque sha2 es lento
- [x] Porque los documentos son pocos y predecibles: sin sal, cualquiera puede calcular el hash de todos los documentos posibles y revertir el seudónimo
- [ ] Porque la sal hace que cada análisis tenga un seudónimo distinto
- [ ] Porque Databricks no tiene sha2
:::

:::ejercicio quiz
Norte informa la glucosa en mg/dL y Sur en mmol/L. ¿Qué haces en silver?
- [ ] Guardas cada valor como vino, con su unidad, y que cada analista convierta
- [x] Conviertes todo a una unidad canónica (mg/dL), así los resultados son comparables y los indicadores no mezclan escalas
- [ ] Descartas los del Sur
- [ ] Promedias los dos
:::

## Resumen

- Cinco fuentes de archivos, un SFTP, llegadas irregulares y cambios sin aviso.
- Dos exigencias que conviven: **integrar** (comparables entre laboratorios) y **proteger** (seudónimos, derecho al olvido).
- Dos tablas de entrega con revisión automática, y un tablero que sigue llenándose con los días.
