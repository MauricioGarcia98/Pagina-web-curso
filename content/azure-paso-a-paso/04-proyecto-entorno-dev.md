---
titulo: Proyecto 1 (guiado) - el inventario del entorno dev
nivel: 1 · Básico
duracion: 40
resumen: Lucía quiere saber qué hay en el entorno dev y poder encontrarlo rápido. Usas lo que aprendiste para revisar el grupo y la cuenta - recientes, All resources con filtros, el visualizador de recursos y la vista JSON - y entregas un inventario verificado con nombres, tipos, región, redundancia y etiquetas. Cada paso con su captura y una lista de verificación al final.
objetivos: Encontrar recursos con los filtros de All resources | Ver cómo se relacionan los recursos de un grupo | Leer la definición JSON de un recurso | Verificar nombres, región, redundancia y etiquetas | Entregar un inventario claro
prerrequisitos: azure-paso-a-paso-tu-primera-cuenta-de-almacenamiento
autoevaluacion: ¿Sabes filtrar All resources por tipo y por grupo? | ¿Sabes dónde ver el ID completo de un recurso? | ¿Sabes comprobar la redundancia de una cuenta? | ¿Sabes qué etiquetas debería tener cada recurso?
---

:::escenario El pedido
Mensaje de Lucía: *"Antes de seguir, mándame un inventario del entorno dev: qué recursos hay, en qué grupo, en qué región, con qué redundancia y con qué etiquetas. Y que cualquiera del equipo pueda encontrarlos en el portal en dos clics."*
:::

## Paso 1 — Los recientes

Vuelve a **Home**:

```captura
archivo: azure/b04-recientes.webp
texto: Resources → Recent - el grupo y la cuenta que abriste en las lecciones anteriores
```

La lista **Recent** guarda lo último que abriste. Es el atajo más rápido para volver a algo con lo que estabas trabajando.

## Paso 2 — All resources con filtros

Abre **All resources** y escribe `tienda` en el filtro:

```captura
archivo: azure/b04-todos-recursos.webp
texto: All resources - el filtro de texto (1), el filtro por tipo (2) y el filtro por grupo (3)
```

| Filtro | Para qué |
|---|---|
| **Filter for any field** (1) | Busca en nombre, tipo, grupo y región a la vez |
| **Type** (2) | Solo un tipo de recurso, por ejemplo Storage account |
| **Resource group** (3) | Solo lo de un grupo |

Con 2 recursos parece innecesario. Con 300 recursos de 15 equipos, estos filtros son lo que usas todo el día.

## Paso 3 — El visualizador de recursos

En el grupo `rg-tiendaandina-dev`, menú **Resource visualizer**:

```captura
archivo: azure/b04-visualizador.webp
texto: Resource visualizer - el grupo y los recursos que contiene
```

Muestra el grupo y lo que hay adentro como un diagrama. Cuando el grupo tenga storage, key vault, Databricks y Data Factory (nivel 4), lo vuelves a abrir.

## Paso 4 — La vista JSON

En la cuenta `sttiendaandinadev`, haz clic en **JSON View** (arriba a la derecha de Essentials):

```captura
archivo: azure/b04-json.webp
texto: Resource JSON - el ID completo, la SKU, el tipo de cuenta y sus propiedades
```

Lo más útil de esta vista:

- **id**: el identificador completo del recurso. Tiene la forma `/subscriptions/<id>/resourceGroups/<grupo>/providers/Microsoft.Storage/storageAccounts/<nombre>` y es lo que piden la CLI, las plantillas y los permisos.
- **sku.name**: `Standard_LRS` = rendimiento Standard + redundancia LRS.
- **properties.isHnsEnabled**: `true` confirma que es ADLS Gen2.
- **primaryEndpoints**: las direcciones `blob` y `dfs`.

## Paso 5 — El inventario

Con lo que viste, completa el inventario:

| Recurso | Tipo | Grupo | Región | Configuración | Etiquetas |
|---|---|---|---|---|---|
| `rg-tiendaandina-dev` | Resource group | — | East US 2 | — | proyecto, entorno, owner |
| `sttiendaandinadev` | Storage account (ADLS Gen2) | `rg-tiendaandina-dev` | East US 2 | Standard_LRS, HNS activado, Hot, TLS 1.2 | proyecto, entorno |

<details><summary>💡 Pista: ¿falta algo?</summary>

La cuenta no tiene la etiqueta `owner`. Las etiquetas del grupo **no se copian solas** a los recursos de adentro: cada recurso tiene las suyas. Agrégala en la cuenta desde el menú **Tags** (`owner = equipo-datos`) y pulsa **Apply**. En Azure real, una **Azure Policy** puede heredar o exigir etiquetas automáticamente.
</details>

:::errores
- **Buscar recurso por recurso.** All resources con filtros por tipo y grupo encuentra en segundos.
- **Suponer que las etiquetas del grupo se heredan.** No se copian solas a los recursos; se aplican por plantilla o con Azure Policy.
- **Usar el nombre en vez del id.** La CLI, las plantillas y los permisos usan el id completo del recurso.
:::

## ✅ Lista de verificación

- [ ] `rg-tiendaandina-dev` existe en East US 2 con las tres etiquetas.
- [ ] `sttiendaandinadev` está en ese grupo, en East US 2.
- [ ] La cuenta dice `Standard_LRS` y `isHnsEnabled: true`.
- [ ] La cuenta tiene `proyecto`, `entorno` y `owner`.
- [ ] Puedes llegar a la cuenta desde el buscador escribiendo `tienda`.

## Lo que aprendiste en el nivel 1

- La jerarquía de Azure y qué se hereda.
- El asistente de creación: pestañas, validación, plantilla y despliegue.
- Cómo encontrar, inspeccionar y documentar lo que hay en una suscripción.

En el nivel 2 llenas el data lake: contenedores, archivos y las capas bronze, silver y gold.

:::ejercicio quiz
Tienes 300 recursos y buscas las cuentas de almacenamiento de un grupo. ¿Qué haces?
- [ ] Abro cada recurso hasta encontrarlas
- [x] En All resources filtro por Type = Storage account y por Resource group
- [ ] Uso el Activity log filtrado por tipo de recurso
- [ ] Busco en Cost Management por nombre
:::

:::ejercicio quiz
En la vista JSON ves `"sku": { "name": "Standard_LRS" }`. ¿Qué significa?
- [ ] Que la cuenta es Premium y GRS
- [x] Rendimiento Standard con redundancia local (LRS)
- [ ] Que la cuenta está en Latinoamérica
- [ ] Que es una cuenta de prueba
:::

:::ejercicio quiz
El grupo tiene la etiqueta `owner`, pero la cuenta no. ¿Por qué?
- [ ] Es un error del portal
- [x] Las etiquetas del grupo no se copian solas a sus recursos
- [ ] Las cuentas de almacenamiento no admiten etiquetas
- [ ] Porque la cuenta es LRS
:::

:::ejercicio quiz
¿Para qué sirve el `id` completo de un recurso?
- [ ] Para nada, es solo informativo
- [x] Es el identificador que usan la CLI, las plantillas y las asignaciones de permisos
- [ ] Es la contraseña del recurso
- [ ] Es la dirección web pública
:::
