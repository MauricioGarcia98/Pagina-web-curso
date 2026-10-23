---
titulo: Grupos de recursos, formatos de salida y --query
nivel: Intermedio
duracion: 30
resumen: Crear y listar recursos, --output (json, table, tsv), consultas JMESPath con --query y uso en scripts.
---

## Grupos de recursos

```bash norun
az group create --name rg-datos-dev --location eastus2 --tags proyecto=tienda entorno=dev
az group list --output table
az group show --name rg-datos-dev
az resource list --resource-group rg-datos-dev --output table      # qué hay adentro
az group delete --name rg-datos-dev --yes --no-wait                 # ¡borra TODO lo que contiene!
```

## Formatos de salida: --output / -o

| Formato | Para qué |
|---|---|
| `json` (por defecto) | Completo, para procesar con otras herramientas |
| `table` | Para leer en pantalla |
| `tsv` | Para usar en **scripts** (sin comillas ni encabezados) |
| `yaml`, `jsonc` | Variantes legibles |
| `none` | No imprimir nada |

## --query: filtrar y transformar con JMESPath

Todas las respuestas de `az` son JSON, y `--query` aplica una consulta **JMESPath** sobre ellas. Es como un mini-SQL para JSON:

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

| JMESPath | Significado |
|---|---|
| `[]` | Recorrer la lista |
| `.campo` | Acceder a un campo |
| `[?cond]` | Filtrar |
| `{A:a, B:b}` | Proyectar con nuevos nombres |
| `[0]` | Primer elemento |
| `length(@)` | Cantidad |

## Usar resultados en scripts

```bash norun
SUB_ID=$(az account show --query id -o tsv)
RG_ID=$(az group show --name rg-datos-dev --query id -o tsv)
echo "Suscripción: $SUB_ID"
```

:::tip ¿Por qué tsv en scripts?
Con `-o json` obtienes `"valor"` con comillas; con `-o tsv` obtienes `valor` limpio, listo para asignar a una variable.
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
