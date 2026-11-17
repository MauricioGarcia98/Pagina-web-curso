---
titulo: De la práctica a Databricks real - cuenta, workspace, costos y lo que cambia
nivel: 6 · Avanzado completo
duracion: 45
resumen: Todo lo que hiciste funciona igual en un workspace real, con algunas diferencias que conviene conocer antes de entrar. Cómo conseguir un workspace (Free Edition, prueba, Azure Databricks de tu empresa), cómo se ve el costo de verdad, los tiempos reales de clusters y pipelines, lo que la práctica simplifica, el asistente y las herramientas de la interfaz que no viste, y cómo seguir aprendiendo (certificaciones, documentación, comunidad).
objetivos: Elegir la forma de acceder a un workspace real según tu situación | Entender la factura - DBU, plan, nube | Anticipar las diferencias de tiempo y comportamiento | Conocer el Assistant, Marketplace, Apps y otras piezas no simuladas | Trazar el camino hacia una certificación
prerrequisitos: databricks-paso-a-paso-databricks-como-codigo
autoevaluacion: ¿Sabes cómo conseguir un workspace gratis para practicar? | ¿Sabes qué dos cosas suma la factura? | ¿Sabes cuánto tarda un cluster real en arrancar? | ¿Sabes qué certificación corresponde a lo que aprendiste?
---

:::analogia En palabras simples
La práctica fue el simulador: mismos controles, sin combustible. En el avión real los controles son los mismos, pero el motor tarda en calentar, el combustible se paga y hay una torre de control (el administrador) que decide a qué pistas puedes salir.
:::

## Paso 1 — Conseguir un workspace

| Opción | Para quién | Qué tiene |
|---|---|---|
| **Databricks Free Edition** | Aprender por tu cuenta, gratis, sin tarjeta | Un workspace serverless con límites de uso; alcanza para repetir todo este curso |
| **Prueba de 14 días** | Evaluar con tu nube (Azure, AWS, GCP) | Todo el producto; pagas la nube, no los DBU |
| **Azure Databricks de tu empresa** | Trabajar | El administrador te invita; llegas a un workspace ya configurado con políticas, catálogos y grupos |

En Azure, un workspace se crea desde el portal como cualquier recurso (grupo de recursos, región, plan *Premium* para Unity Catalog). El [curso del portal de Azure](#/m/azure) lo hace paso a paso.

## Paso 2 — La factura

```text
Costo = DBU consumidos × tarifa por DBU (según plan y tipo de cómputo)
      + máquinas de la nube (cuando el cómputo es clásico, no serverless)
      + almacenamiento de los datos (centavos por GB)
```

| Cómputo | Tarifa por DBU (orientativa) | Las máquinas las pagas |
|---|---|---|
| Jobs (job compute) | La más baja | Sí, a la nube |
| All-purpose (interactivo) | Más alta | Sí |
| SQL warehouse serverless | Media | No: va incluido |
| Serverless para notebooks y jobs | Media | No |

**Las tablas del sistema** (`system.billing.usage`) muestran el gasto por cluster, job, usuario y etiqueta. Un equipo serio las mira cada semana. Las reglas de la lección 11 (autoterminación, job compute, etiquetas, políticas) son lo que separa una factura razonable de una sorpresa.

## Paso 3 — Lo que tarda de verdad

| En la práctica | En Databricks real |
|---|---|
| Un cluster arranca en segundos | 3 a 7 minutos (serverless: segundos) |
| Un pipeline corre en segundos | La primera actualización, varios minutos; después depende del volumen |
| Python carga una vez en tu navegador | Cada cluster nuevo instala las librerías (por eso existen las políticas y los pools) |
| Las consultas son instantáneas | Sobre millones de filas, segundos; el warehouse se enciende si estaba apagado |

Esto cambia la forma de trabajar: en real, **agrupas** lo que vas a ejecutar, usas serverless para explorar y dejas los clusters para jobs.

## Paso 4 — Lo que la práctica simplifica

| Tema | En la práctica | En real |
|---|---|---|
| Grupos | Entras y sales tú mismo | Los administra la cuenta; se prueban con usuarios de prueba |
| Correos de alertas y jobs | Simulados | Llegan de verdad (y por Slack, Teams, webhooks) |
| Git | Exportar e importar notebooks | **Git folders** con ramas, commit, pull request desde la interfaz |
| Conectores | CSV y tablas del curso | **Lakeflow Connect**: bases de datos, Salesforce, SharePoint, Kafka… sin código |
| Datos externos | No | **External locations** y **storage credentials** para leer tu almacenamiento |
| Compartir con otras empresas | No | **Delta Sharing**: compartir tablas sin copiarlas |
| Datos de terceros | No | **Marketplace**: datasets y modelos listos para usar |
| Aplicaciones | No | **Databricks Apps**: aplicaciones web (Streamlit, Dash) dentro del workspace |
| Asistente de IA | No | **Databricks Assistant**: escribe y corrige SQL y Python en el notebook y el editor, explica errores |

## Paso 5 — Tus primeras horas en un workspace real

1. **Mira el catálogo** antes de crear nada: qué catálogos hay, dónde te dejan escribir (pregunta por el de desarrollo).
2. **Usa serverless** para explorar; crea compute solo con una política y con autoterminación.
3. **Pide los grupos** que necesitas en lugar de permisos personales.
4. **Trabaja en una Git folder** desde el primer día.
5. **No subas datos reales a volúmenes de prueba** sin saber las reglas de la empresa sobre datos personales.
6. **Revisa el costo** de tu primera semana en `system.billing.usage`.

## Paso 6 — Ajustes personales

Menú de usuario → **Settings → Preferences**: tema claro, oscuro o el del sistema, idioma y otros ajustes de la interfaz. En **Developer** están los tokens (lección 19). En un workspace real, además, la pestaña de administración (si tienes el rol) controla usuarios, políticas de compute y funciones habilitadas.

```captura
archivo: databricks/d23-apariencia.webp
texto: Preferences - el tema del workspace
```

## Paso 7 — Seguir aprendiendo

- **Certificaciones**: lo que hiciste cubre buena parte del **Databricks Certified Data Engineer Associate**; el módulo de [certificaciones Databricks](#/m/cert-databricks) tiene el plan de estudio y los simulacros.
- **Documentación**: `docs.databricks.com` (y `learn.microsoft.com/azure/databricks` para Azure). Cada pantalla de la práctica sigue la documentación pública.
- **Práctica en Free Edition**: repite los seis proyectos con tus propios datos.
- Los cursos de [PySpark](#/m/pyspark), [dbt](#/m/dbt) y [Airflow](#/m/airflow) del sitio se conectan directamente con lo que hace Databricks por dentro y alrededor.

:::errores
- **Practicar en el workspace de la empresa.** Usa Free Edition o un workspace propio.
- **Clusters grandes para explorar.** Serverless o un cluster chico con autoterminación.
- **Subir datos de clientes a un volumen de prueba.** Usa datos de ejemplo.
:::

## ✅ Lo que lograste

- Sabes cómo conseguir un workspace y qué vas a pagar.
- Anticipas las diferencias de tiempo y de funciones.
- Tienes un plan para tus primeras horas y para seguir.

:::ejercicio quiz
Quieres seguir practicando por tu cuenta, gratis. ¿Qué usas?
- [ ] Un cluster grande en la prueba de 14 días
- [x] Databricks Free Edition
- [ ] El workspace de producción de tu empresa
- [ ] La prueba de 14 días, repetida con otro correo
:::

:::ejercicio quiz
¿Qué compone el costo de un cluster clásico?
- [ ] Solo los DBU
- [x] Los DBU por hora más las máquinas de la nube mientras está encendido
- [ ] Solo las máquinas
- [ ] Solo el almacenamiento de las tablas
:::

:::ejercicio quiz
Llegas a un workspace real. ¿Qué haces primero?
- [ ] Creo un cluster de 8 máquinas
- [x] Miro el catálogo, averiguo dónde puedo escribir y uso serverless para explorar
- [ ] Subo un CSV con datos de clientes a un volumen
- [ ] Borro los notebooks de ejemplo
:::
