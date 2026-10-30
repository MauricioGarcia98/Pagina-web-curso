---
titulo: Grupos de recursos, formatos de salida y --query
nivel: Intermedio
duracion: 40
resumen: Crear y listar recursos, --output (json, table, tsv), consultas JMESPath con --query y uso en scripts.
---

En la lección anterior iniciaste sesión con `az`. Ahora vas a crear tus primeros recursos y, sobre todo, a aprender a **leer y filtrar** lo que `az` responde. Eso se usa todo el tiempo: en scripts de despliegue, en pipelines de CI y cada vez que necesitas un dato puntual ("¿cuál es el id de esta cuenta de almacenamiento?").

Abre la terminal del curso (⌨ Terminal) y escribe cada comando a medida que lees. Antes, ejecuta `az login`.

## Grupos de recursos

Un grupo de recursos es la carpeta donde viven los recursos de un proyecto y un entorno. Su ciclo de vida completo se maneja con cinco comandos:

```bash norun
az group create --name rg-datos-dev --location eastus2 --tags proyecto=tienda entorno=dev
az group list --output table
az group show --name rg-datos-dev
az resource list --resource-group rg-datos-dev --output table      # qué hay adentro
az group delete --name rg-datos-dev --yes --no-wait                 # ¡borra TODO lo que contiene!
```

Qué hace cada parámetro de `az group create`:

- `--name` (o `-n`): el nombre. Tiene que ser único **dentro de la suscripción**.
- `--location` (o `-l`): la región donde se guarda la *información sobre* el grupo. Los recursos que pongas adentro pueden estar en otras regiones, aunque lo normal es que estén en la misma.
- `--tags`: etiquetas `clave=valor` separadas por espacios. Sirven para filtrar costos y recursos después.

Al crearlo, `az` responde con un **JSON** que describe el recurso creado:

```json
{
  "id": "/subscriptions/1111aaaa-1111-4111-8111-111111111111/resourceGroups/rg-datos-dev",
  "location": "eastus2",
  "name": "rg-datos-dev",
  "properties": { "provisioningState": "Succeeded" },
  "tags": { "proyecto": "tienda", "entorno": "dev" },
  "type": "Microsoft.Resources/resourceGroups"
}
```

Fíjate en el **`id`**. Todo recurso de Azure tiene un id con forma de ruta: `/subscriptions/<sub>/resourceGroups/<grupo>/providers/<tipo>/<nombre>`. Lo vas a necesitar para asignar permisos (RBAC) en la lección siguiente.

:::cuidado `az group delete` no tiene papelera
Borrar un grupo elimina **todos** sus recursos: el lake con sus datos, el Databricks, los secretos del Key Vault. `--yes` salta la pregunta "¿estás seguro?" y `--no-wait` devuelve el control sin esperar a que termine. Úsalo en laboratorios, y **nunca** en producción desde un script sin revisar dos veces el nombre. En producción se agregan **locks** (`az lock create --lock-type CanNotDelete`) para impedirlo.
:::

## Formatos de salida: --output / -o

El mismo dato se puede pedir en distintos formatos. Crea un segundo grupo (`az group create -n rg-datos-prod -l brazilsouth`) y compara:

```text
$ az group list -o table
Location     Name
-----------  -------------
eastus2      rg-datos-dev
brazilsouth  rg-datos-prod

$ az group list --query "[].name" -o tsv
rg-datos-dev
rg-datos-prod
```

| Formato | Cómo se ve | Para qué |
|---|---|---|
| `json` (por defecto) | Todo el detalle, con llaves y comillas | Procesar con otras herramientas (`jq`, Python) |
| `table` | Columnas alineadas | **Leer** en pantalla |
| `tsv` | Valores separados por tabulación, sin comillas ni encabezados | Usar en **scripts** |
| `yaml`, `jsonc` | Variantes legibles del JSON | Leer configuraciones largas |
| `none` | Nada | Comandos donde solo importa si funcionó |

:::tip Configúralo una vez
`az config set core.output=table` cambia el formato por defecto para tu usuario. Igual puedes pedir otro con `-o` en cada comando.
:::

## --query: filtrar y transformar con JMESPath

Todas las respuestas de `az` son JSON, y `--query` aplica sobre ellas una consulta **JMESPath**. Es como un mini-SQL para JSON: eliges qué campos quieres (como un `SELECT`) y qué elementos (como un `WHERE`). Lo bueno es que el filtro se aplica **antes** de formatear, así que funciona con cualquier `-o`.

Piensa en `az group list` como una **lista de objetos**:

```json
[
  { "name": "rg-datos-dev",  "location": "eastus2",     "tags": { "proyecto": "tienda", "entorno": "dev" } },
  { "name": "rg-datos-prod", "location": "brazilsouth", "tags": {} }
]
```

Ahora mira qué devuelve cada consulta sobre esa lista:

| Consulta | Se lee como | Resultado |
|---|---|---|
| `"[].name"` | De cada elemento, el campo `name` | `rg-datos-dev`, `rg-datos-prod` |
| `"[0].name"` | El `name` del primer elemento | `rg-datos-dev` |
| `"[?location=='eastus2'].name"` | Los que están en eastus2 → su `name` | `rg-datos-dev` |
| `"[?tags.entorno=='dev'].name"` | Los que tienen la etiqueta entorno=dev | `rg-datos-dev` |
| `"[].{Nombre:name, Region:location}"` | De cada uno, un objeto nuevo con dos columnas renombradas | Una tabla de dos columnas |
| `"length(@)"` | Cuántos elementos hay (`@` es "el dato actual") | `2` |
| `"[?contains(name, 'prod')].name"` | Los que tienen "prod" en el nombre | `rg-datos-prod` |

Y en comandos completos:

```bash norun
# Solo el nombre de la suscripción activa
az account show --query name -o tsv

# Nombres de todos los grupos de recursos
az group list --query "[].name" -o tsv

# Grupos en eastus2 (filtro con ?)
az group list --query "[?location=='eastus2'].name" -o tsv

# Proyectar varias columnas con nombre
az group list --query "[].{Nombre:name, Region:location}" -o table

# Recursos de tipo cuenta de almacenamiento
az resource list --query "[?type=='Microsoft.Storage/storageAccounts'].name" -o tsv
```

Resumen de la sintaxis:

| JMESPath | Significado |
|---|---|
| `[]` | Recorrer la lista |
| `.campo` | Acceder a un campo (se pueden encadenar: `.tags.entorno`) |
| `[?cond]` | Filtrar: `==`, `!=`, `<`, `>`, `&&`, `\|\|`, `contains()`, `starts_with()` |
| `{A:a, B:b}` | Proyectar con nombres nuevos |
| `[0]`, `[-1]` | Primer y último elemento |
| `length(@)` | Cantidad |

:::cuidado Comillas
Los textos dentro de JMESPath van entre **comillas simples** (`'eastus2'`), y toda la consulta entre **comillas dobles** para que bash no interprete `[`, `?` ni `@`. Si las mezclas al revés, bash corta la consulta y `az` responde con un error de sintaxis.
:::

```recorrido
titulo: JMESPath paso a paso: del JSON completo a lo que necesitas
estacion json: JSON completo | icono=codigo
estacion lista: [] | icono=capas
estacion filtro: [?…] | icono=lupa
estacion proy: {…} | icono=transformar
estacion salida: -o table / tsv | icono=check
paso json: La respuesta completa
`az group list` devuelve una **lista** de objetos, uno por grupo (resumido: el real tiene más campos, como `id` y `properties`).
>>> json
[
  {
    "name": "rg-datos-dev",
    "location": "eastus2",
    "tags": { "proyecto": "tienda", "entorno": "dev" }
  },
  {
    "name": "rg-datos-prod",
    "location": "eastus2",
    "tags": {}
  }
]
paso lista: [].name: un campo de cada elemento
`[]` recorre la lista y `.name` toma ese campo de cada elemento.
>>> log
$ az group list --query "[].name"
[
  "rg-datos-dev",
  "rg-datos-prod"
]
paso filtro: [?condición]: filtrar elementos
`[?tags.entorno=='dev']` deja solo los elementos que cumplen. Los textos van entre comillas simples dentro de la consulta.
>>> log
$ az group list --query "[?tags.entorno=='dev'].name"
[
  "rg-datos-dev"
]
paso proy: {Alias:campo}: armar columnas
Las llaves crean un objeto nuevo con los nombres que elijas. Ideal para una tabla legible.
>>> log
$ az group list --query "[].{Nombre:name, Region:location}" -o table
Nombre         Region
-------------  -------
rg-datos-dev   eastus2
rg-datos-prod  eastus2
paso salida: -o tsv para scripts
Sin comillas ni corchetes: un valor por línea, listo para un `for` o una variable.
>>> log
$ az group list --query "[?location=='eastus2'].name" -o tsv
rg-datos-dev
rg-datos-prod
```

## Usar resultados en scripts

Lo que hace útil a `--query` + `-o tsv` es guardar un valor en una **variable de shell** con `$( ... )` y usarlo en el siguiente comando:

```bash norun
SUB_ID=$(az account show --query id -o tsv)
RG_ID=$(az group show --name rg-datos-dev --query id -o tsv)
echo "Suscripción: $SUB_ID"
echo "Grupo: $RG_ID"
```

`$( ... )` ejecuta el comando de adentro y lo reemplaza por lo que imprimió. Así `SUB_ID` queda con `1111aaaa-1111-4111-8111-111111111111`, sin comillas.

Un script real recorre una lista con un bucle:

```bash norun
# Imprime cuántos recursos tiene cada grupo
for rg in $(az group list --query "[].name" -o tsv); do
  n=$(az resource list -g "$rg" --query "length(@)")
  echo "$rg: $n recursos"
done
```

:::tip ¿Por qué tsv en scripts?
Con `-o json` obtienes `"valor"`, con comillas, y con `-o table` obtienes también el encabezado. Con `-o tsv` obtienes `valor` limpio, listo para asignar a una variable.
:::

## Ejercicios

:::ejercicio cli
Crea el grupo de recursos `rg-datos-dev` en la región `eastus2`.
```respuesta
az group create (--name|-n) rg-datos-dev (--location|-l) eastus2
az group create (--location|-l) eastus2 (--name|-n) rg-datos-dev
```
```solucion
az group create --name rg-datos-dev --location eastus2
```
:::

:::ejercicio cli
Lista **solo los nombres** de todos los grupos de recursos, uno por línea (usa `--query` y salida `tsv`).
```respuesta
az group list --query ['"]\[\]\.name['"] (-o|--output) tsv
az group list (-o|--output) tsv --query ['"]\[\]\.name['"]
```
```solucion
az group list --query "[].name" -o tsv
```
:::

:::ejercicio cli
Guarda en la variable de shell `SUB_ID` el **id** de la suscripción activa.
```respuesta
SUB_ID=\$\(az account show --query ['"]?id['"]? (-o|--output) tsv\)
SUB_ID=\$\(az account show (-o|--output) tsv --query ['"]?id['"]?\)
```
```solucion
SUB_ID=$(az account show --query id -o tsv)
```
:::

:::ejercicio cli
Lista los recursos del grupo `rg-datos-dev` en formato tabla.
```respuesta
az resource list (--resource-group|-g) rg-datos-dev (--output|-o) table
az resource list (--output|-o) table (--resource-group|-g) rg-datos-dev
```
```solucion
az resource list --resource-group rg-datos-dev --output table
```
:::

:::ejercicio cli
Borra el grupo de recursos `rg-lab-temporal` **sin pedir confirmación** y sin esperar a que termine.
```respuesta
az group delete (--name|-n) rg-lab-temporal (--yes|-y) --no-wait
az group delete (--name|-n) rg-lab-temporal --no-wait (--yes|-y)
az group delete (--yes|-y) --no-wait (--name|-n) rg-lab-temporal
```
```solucion
az group delete --name rg-lab-temporal --yes --no-wait
```
```setup
az group create --name rg-lab-temporal --location eastus2
```
:::

:::ejercicio quiz
¿Qué devuelve `az group list --query "[?location=='brazilsouth'].name" -o tsv`?

- [ ] Todos los grupos
- [x] Los nombres de los grupos ubicados en brazilsouth, uno por línea
- [ ] La cantidad de grupos en brazilsouth
- [ ] Un error: no se puede filtrar
:::
