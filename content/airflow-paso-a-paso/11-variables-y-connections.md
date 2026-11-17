---
titulo: Variables y Connections - configuración fuera del código
nivel: 3 · Intermedio
duracion: 40
resumen: Lo que cambia entre entornos (dev o prod, umbrales, hosts, usuarios y contraseñas) no va en el código. Creas las variables entorno y umbral_alerta, la conexión api_tienda, y aprendes cómo se leen en un Dag, por qué Airflow cifra los valores y qué alternativas se usan en producción.
objetivos: Crear y editar variables | Crear una conexión con host, puerto y usuario | Leer variables con Variable.get y en plantillas | Conocer variables de entorno y secrets backends
prerrequisitos: airflow-paso-a-paso-xcoms-y-plantillas
autoevaluacion: ¿Sabes qué va en una variable y qué en una conexión? | ¿Sabes leer una variable con valor por defecto? | ¿Sabes por qué no se pone una contraseña en el Dag? | ¿Sabes qué es un secrets backend?
---

:::analogia La configuración fuera de la receta
Variables y Connections son lo que cambia entre cocinas: en qué entorno estás, qué umbral usar, la dirección y la llave de la base. La receta (el Dag) no las trae escritas: las pide al momento de cocinar.
:::

## Paso 1 — Una variable

**Admin → Variables → Add Variable**:

```captura
archivo: airflow/a11-var-nueva.webp
texto: Add Variable - clave entorno, valor dev y una descripción
```

Agrega también `umbral_alerta` = `100`:

```captura
archivo: airflow/a11-vars.webp
texto: Las dos variables, con su descripción y cifradas
```

En el Dag:

```python norun
from airflow.sdk import Variable

entorno = Variable.get("entorno", default="dev")
umbral = float(Variable.get("umbral_alerta", default="100"))
```

En una plantilla: `{{ var.value.entorno }}`.

:::cuidado Léelas dentro de las tareas
`Variable.get` fuera de una tarea (en el nivel superior del archivo) se ejecuta **cada vez que el dag processor lee el archivo**, cada pocos segundos, y carga la base de metadatos. Léelas dentro de la función de la tarea o en una plantilla.
:::

## Paso 2 — Una conexión

**Admin → Connections → Add Connection**:

```captura
archivo: airflow/a11-conn-nueva.webp
texto: Add Connection - api_tienda de tipo http, host, puerto, usuario y contraseña
```

```captura
archivo: airflow/a11-conns.webp
texto: Las conexiones - postgres_tienda y la nueva api_tienda
```

Los operadores usan la conexión por su id:

```python norun
SQLExecuteQueryOperator(task_id="contar", conn_id="postgres_tienda", sql="SELECT COUNT(*) FROM ventas")
```

| Va en una **variable** | Va en una **conexión** |
|---|---|
| Un entorno, un umbral, una lista de tiendas | Dónde y cómo conectarse: host, puerto, usuario, contraseña |

## Paso 3 — Dónde viven en producción

| Forma | Cómo | Cuándo |
|---|---|---|
| Interfaz o CLI | Admin o `airflow variables set entorno prod` | Pruebas y equipos chicos |
| Variables de entorno | `AIRFLOW_VAR_ENTORNO=prod`, `AIRFLOW_CONN_API_TIENDA='http://...'` | Contenedores y despliegues |
| **Secrets backend** | AWS Secrets Manager, Azure Key Vault, GCP Secret Manager, HashiCorp Vault | Producción: las contraseñas nunca pasan por Airflow |

Airflow cifra contraseñas y variables en la base con una clave **Fernet**. Igual, la regla es: **nunca** una contraseña en el código del Dag ni en Git.

:::errores
- **Contraseñas en el código o en Variables.** Las credenciales van en Connections o en un secrets backend.
- **`Variable.get` en el nivel superior del archivo.** Se ejecuta en cada lectura del archivo y carga la base de metadatos; léela dentro de la tarea o con plantillas.
- **Sin valor por defecto.** Si la variable no existe, la tarea falla; usa `default=` cuando tenga sentido.
:::

## ✅ Lo que lograste

- Creaste variables y una conexión.
- Sabes leerlas sin cargar la base.
- Conoces las opciones de producción.

:::ejercicio quiz
¿Dónde guardas el host, usuario y contraseña de la base de la tienda?
- [ ] En el código del Dag
- [ ] En un comentario
- [x] En una Connection (o un secrets backend)
- [ ] En un XCom
:::

:::ejercicio quiz
¿Cómo lees una variable con un valor por defecto en Airflow 3?
- [x] `Variable.get("entorno", default="dev")`
- [ ] `Variable("entorno")`
- [ ] `Variable.get("entorno") or "dev"`, que también lee las Connections
- [ ] `{{ entorno }}`
:::

:::ejercicio quiz
¿Por qué no conviene llamar a Variable.get en el nivel superior del archivo?
- [ ] Porque no funciona nunca
- [x] Porque se ejecuta cada vez que se lee el archivo y carga la base de metadatos
- [ ] Porque las variables solo existen durante la corrida
- [ ] Porque es de Airflow 1
:::

:::ejercicio quiz
¿Qué es un secrets backend?
- [ ] Una Variable cifrada dentro de Airflow
- [x] Un servicio externo (Key Vault, Secrets Manager, Vault) de donde Airflow lee las credenciales
- [ ] El archivo airflow.cfg con las contraseñas
- [ ] Un tipo de operador
:::
