---
titulo: Cómo armar un portafolio que consigue entrevistas
nivel: Intermedio
duracion: 45
resumen: El método para los 12 proyectos del módulo - elegir un problema con valor de negocio, generar datos realistas, construir primero en tu computadora y después en la nube (Databricks Free Edition y Azure) sin sorpresas en la factura, y presentar cada proyecto en GitHub con README, diagrama, métricas y demo. Incluye qué miran los reclutadores y una rúbrica de junior a senior.
objetivos: Elegir 3 o 4 proyectos que cubran lo que piden las ofertas de trabajo | Generar los datos de un proyecto con el generador o con generar-datos | Preparar el entorno local y las cuentas gratuitas de Databricks y Azure | Escribir el README de un proyecto con problema, arquitectura, decisiones y resultados | Evaluar un proyecto con la rúbrica de junior, semi senior y senior
prerrequisitos: local-proyecto-local
autoevaluacion: ¿Sabes qué 3 proyectos harías para el puesto que buscas? | ¿Sabes generar los datos de un proyecto con una semilla reproducible? | ¿Tienes listo el entorno local (uv, DuckDB, Git)? | ¿Sabes qué debe tener el README de un proyecto? | ¿Sabes cómo evitar costos en Azure y Databricks?
---

:::escenario
Dos candidatos postulan al mismo puesto de data engineer. Uno tiene 15 repositorios de tutoriales ("titanic", "netflix-eda", "airflow-hello-world"). El otro tiene **3 proyectos**: cada uno empieza con un problema de negocio, muestra un diagrama, explica por qué eligió cada herramienta, tiene tests y un número de valor ("detecta el 82 % del fraude con 0,4 % de falsas alarmas"). El segundo consigue la entrevista. Este módulo te ayuda a ser el segundo.
:::

## La idea en una frase

Un proyecto de portafolio no demuestra que sabes usar una herramienta: demuestra que sabes **resolver un problema de negocio con datos, de punta a punta, y explicarlo**.

## Los 12 proyectos del módulo

| # | Proyecto | Escenario de datos | Lo que demuestra | Nube e IA |
|---|---|---|---|---|
| 1 | Lakehouse de ventas | Tienda online | Medallón, dbt, modelado estrella, tablero | Databricks |
| 2 | Fraude en tiempo casi real | Banco | Streaming, reglas, ventanas, alertas | Databricks (Lakeflow) |
| 3 | Mantenimiento predictivo | Sensores IoT | Series de tiempo, features, modelo con MLflow | Databricks + MLflow |
| 4 | Torre de control logística | Logística | Ingesta orquestada, SLA, tablero operativo | Azure (ADLS, Data Factory) |
| 5 | Métricas SaaS y churn | SaaS | dbt incremental, SCD2, MRR, NRR | Databricks o Azure |
| 6 | Ausentismo con privacidad | Clínica | Modelo de no-show, enmascarado, permisos | Unity Catalog |
| 7 | Recomendaciones | Streaming | Features de engagement, co-ocurrencia, A/B | Databricks |
| 8 | Clasificador de tickets con LLM | Soporte | Prompting, evaluación contra etiquetas, costos | `ai_classify` / Foundry |
| 9 | Asistente RAG con citas | Soporte | Chunking, embeddings, búsqueda vectorial, evaluación | Vector Search / AI Search |
| 10 | Agente que consulta datos | Tienda online | Text-to-SQL con guardrails, capa semántica | Genie / Foundry |
| 11 | Plataforma con IaC y CI/CD | Cualquiera | Terraform, Asset Bundles, GitHub Actions, entornos | Azure + Databricks |
| 12 | Observabilidad de datos | Banco (caótico) | Checks, alertas, SLO, costos, incidentes | Databricks |

:::tip ¿Cuáles hago?
No hagas los 12. Elige **3 o 4** según el puesto: para **data engineer**, 1 + 2 o 4 + 11 + 12; para **analytics engineer**, 1 + 5 + 10; para **ML / IA**, 3 + 8 + 9. Un proyecto profundo y bien explicado vale más que cinco a medias.
:::

## El método de cada proyecto

```diagrama
titulo: El recorrido de cada proyecto del módulo
nodo p: 1. Problema y valor | icono=lupa | col=0 | fila=0 | sub=quién, qué decide, qué número mejora
nodo d: 2. Datos | icono=fabrica | col=1 | fila=0 | sub=generador con semilla\ny problemas sembrados
nodo l: 3. Local | icono=laptop | col=2 | fila=0 | sub=uv, DuckDB, dbt, tests\ngratis y rápido
nodo n: 4. Nube | icono=nube | col=3 | fila=0 | sub=Databricks Free Edition\no Azure
nodo a: 5. Automatizar | icono=orquestador | col=3 | fila=1 | sub=orquestación, CI/CD, IaC
nodo e: 6. Entregar | icono=github | col=2 | fila=1 | sub=README, diagrama,\nmétricas y demo
flecha p -> d
flecha d -> l
flecha l -> n
flecha n -> a
flecha a -> e
```

1. **Problema y valor**: quién usa el resultado, qué decisión toma y qué número mejora (dinero, tiempo, riesgo).
2. **Datos**: cada proyecto trae un enlace al generador con la configuración exacta (escenario, escala, semilla y problemas). Mismos datos para todos: puedes comparar tus resultados.
3. **Local primero**: todo el pipeline corre en tu computadora con herramientas gratuitas. Iteras en segundos y sin costo.
4. **Nube después**: llevas lo mismo a Databricks Free Edition o a Azure. Ahí aparecen los temas reales: permisos, almacenamiento, cómputo, costos.
5. **Automatizar**: orquestación, tests en CI y despliegue reproducible.
6. **Entregar**: README, diagrama, decisiones, resultados y una demo corta.

## Los datos: el generador

Cada proyecto empieza con un botón **🏭 Generar los datos del proyecto** que abre el [generador](#/generador) con la configuración lista. También puedes hacerlo desde la terminal:

```bash
generar-datos ecommerce --filas 500 --semilla 42 --problemas realista
duckdb -c "SELECT COUNT(*) FROM '~/datos/generados/ecommerce/pedidos.csv'"
```

En tu computadora, descarga el `.zip` del generador (incluye un `README.md` con el diccionario de datos y los problemas sembrados) y descomprímelo en `data/raw/` de tu proyecto.

:::nota ¿Por qué datos generados y no un dataset de Kaggle?
Porque puedes elegir la escala, la semilla y **los problemas de calidad** (duplicados, nulos, datos tardíos…), que son lo que hace interesante un proyecto de ingeniería. Y porque nadie más tiene exactamente tu dataset: el proyecto es tuyo. En el README aclara que los datos son sintéticos y cómo regenerarlos.
:::

## Las cuentas en la nube, sin sorpresas

| Plataforma | Qué usar | Costo | Cuidado con |
|---|---|---|---|
| **Databricks Free Edition** | Cuenta gratuita con cómputo serverless, Unity Catalog, notebooks, Jobs, pipelines y tableros | Gratis, con límites de cómputo y de uso diario | Algunas funciones avanzadas pueden no estar disponibles o estar limitadas; cada proyecto indica la alternativa local |
| **Azure** (cuenta gratuita) | Crédito inicial y servicios gratuitos por 12 meses | Gratis dentro del crédito; después, pago por uso | Presupuesto con alertas, un grupo de recursos por proyecto y borrarlo al terminar |
| **Local** | uv, DuckDB, dbt, Airflow en Docker, Ollama para modelos de lenguaje | Gratis | Memoria de tu computadora con datasets grandes |

Las reglas del módulo de laboratorios siguen valiendo: presupuesto con alertas, una región, nombres con sufijo `-lab`, etiquetas y **limpieza el mismo día**.

## La estructura de cada repositorio

```text
proyecto-ventas-lakehouse/
├── README.md            ← lo primero (y a veces lo único) que leen
├── docs/arquitectura.png
├── data/raw/            ← en .gitignore: los datos se regeneran con la semilla
├── src/                 ← código de ingesta y utilidades (Python)
├── transform/           ← proyecto dbt o notebooks/pipelines
├── tests/               ← pytest y tests de datos
├── orchestration/       ← DAG de Airflow o Asset Bundle de Databricks
├── infra/               ← Terraform (si aplica)
├── .github/workflows/   ← CI: lint, tests, validate
└── pyproject.toml       ← dependencias con uv
```

## El README que funciona

```markdown
# Detección de fraude en tiempo casi real

**Problema**: el banco detecta el fraude con tarjeta al día siguiente; cada hora de demora cuesta dinero.
**Resultado**: alertas en menos de 2 minutos; las reglas detectan el 82 % del fraude etiquetado
con 0,4 % de falsas alarmas sobre 38.000 transacciones sintéticas.

![Arquitectura](docs/arquitectura.png)

## Cómo correrlo (5 minutos)
## Decisiones y alternativas descartadas
## Calidad de datos: qué problemas encontré y cómo los traté
## Qué haría con más tiempo
```

Lo que más pesa: el **resultado con un número** al principio, las **decisiones** (por qué streaming y no batch, por qué esta clave de partición) y la sección de **calidad de datos**: muestra que trabajaste con datos reales, no con un CSV perfecto.

## La rúbrica

| Aspecto | Junior | Semi senior | Senior |
|---|---|---|---|
| Problema | Describe qué hace el código | Explica el problema de negocio | Cuantifica el valor y los compromisos |
| Datos | Carga un CSV | Trata los problemas de calidad | Checks automáticos, contratos, datos tardíos |
| Pipeline | Un script | Capas, idempotente, incremental | Orquestado, observable, con backfills |
| Calidad | — | Tests de dbt / pytest | Tests en CI, alertas, runbook |
| Nube | Local | Desplegado a mano en la nube | IaC + CI/CD + entornos dev/prod |
| IA (si aplica) | Llama a un modelo | Prompt + evaluación contra etiquetas | Evaluación, costos, guardrails, monitoreo |
| Comunicación | README mínimo | README con diagrama y decisiones | Demo, métricas, qué haría distinto |

## Práctica

:::ejercicio cli dificultad=Básico titulo="Generar los datos de un proyecto"
Genera en la terminal el dataset de la tienda online con **500** clientes, semilla **42** y problemas **realista**.
```respuesta
todos: generar-datos ecommerce || --filas 500 || --semilla 42 || --problemas realista
```
```solucion
generar-datos ecommerce --filas 500 --semilla 42 --problemas realista
```
```pista
`generar-datos <escenario> --filas N --semilla N --problemas limpio|realista|caotico`.
```
:::

:::ejercicio cli dificultad=Básico titulo="Leer el diccionario de datos"
Muestra las primeras 20 líneas del README que generó el comando: `~/datos/generados/ecommerce/README.md`.
```setup
generar-datos ecommerce --filas 500 --semilla 42 --problemas realista
```
```respuesta
head -n ?20 \S*generados/ecommerce/README\.md
head -20 \S*generados/ecommerce/README\.md
```
```solucion
head -n 20 ~/datos/generados/ecommerce/README.md
```
:::

:::ejercicio cli dificultad=Intermedio titulo="Primera consulta con DuckDB"
Con `duckdb -c`, cuenta los pedidos de `~/datos/generados/ecommerce/pedidos.csv`.
```setup
generar-datos ecommerce --filas 500 --semilla 42 --problemas realista
```
```respuesta
duckdb -c ['"]SELECT COUNT\(\*\).*FROM.*pedidos\.csv.*['"]
```
```solucion
duckdb -c "SELECT COUNT(*) FROM '~/datos/generados/ecommerce/pedidos.csv'"
```
```pista
DuckDB lee un CSV como si fuera una tabla: `SELECT COUNT(*) FROM 'ruta/archivo.csv'`.
```
:::

:::ejercicio quiz dificultad=Básico
Buscas tu primer puesto de **analytics engineer**. ¿Qué combinación de proyectos te conviene?

- [ ] Fraude en streaming, mantenimiento predictivo y RAG
- [x] Lakehouse de ventas, métricas SaaS con dbt y el agente que consulta datos
- [ ] Los 12, para mostrar todo
- [ ] Solo la plataforma con Terraform
:::

:::ejercicio quiz dificultad=Intermedio
¿Qué va **primero** en el README de un proyecto?

- [ ] La lista de tecnologías usadas
- [ ] La instalación paso a paso
- [x] El problema de negocio y el resultado con un número
- [ ] Los agradecimientos
:::

:::ejercicio quiz dificultad=Intermedio
¿Por qué conviene sembrar problemas de calidad en los datos del proyecto?

- [ ] Para que el proyecto tarde más
- [x] Porque tratar duplicados, nulos y datos tardíos es lo que muestra experiencia de ingeniería real
- [ ] Porque los reclutadores no miran los datos
- [ ] Porque los datos limpios no se pueden cargar en Databricks
:::

:::ejercicio quiz dificultad=Básico
Terminaste un laboratorio en Azure. ¿Qué haces antes de cerrar la sesión?

- [ ] Nada: los recursos se apagan solos
- [x] Borrar el grupo de recursos del proyecto y verificar que no quedó nada encendido
- [ ] Bajar el plan de la suscripción
- [ ] Cambiar la contraseña
:::

:::trabajo
- Fija los proyectos en tu perfil de GitHub y enlázalos desde LinkedIn con una línea de valor cada uno.
- Graba una demo de 2 minutos (pantalla y voz): problema, arquitectura, resultado. Muchos reclutadores ven el video y no el código.
- En la entrevista, prepárate para "¿qué harías distinto con 10 veces más datos?" y "¿qué falló y cómo lo resolviste?". Las secciones de decisiones y de calidad del README son tu guion.
:::

## Resumen

| Paso | Qué produce |
|---|---|
| Problema y valor | Una frase con un número |
| Datos | Un dataset reproducible con semilla |
| Local | Un pipeline que corre en minutos y gratis |
| Nube | El mismo pipeline en Databricks o Azure |
| Automatizar | Orquestación, tests en CI, IaC |
| Entregar | README, diagrama, demo |
