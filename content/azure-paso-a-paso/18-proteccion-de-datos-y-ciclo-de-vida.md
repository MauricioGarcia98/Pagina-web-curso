---
titulo: Protección de datos y ciclo de vida - no perder datos y no pagar de más
nivel: 5 · Avanzado
duracion: 40
resumen: Dos configuraciones de la cuenta que todo lago en producción tiene. La protección de datos (papelera de blobs y contenedores, versiones) para recuperar lo que se borra o se pisa por error, y las reglas de ciclo de vida que mueven los archivos viejos a niveles más baratos y los borran cuando ya no sirven. Configuras ambas para bronze y compruebas que un blob borrado sigue recuperable.
objetivos: Configurar soft delete de blobs y contenedores con los días adecuados | Activar el versionado y entender cuándo conviene | Explicar los niveles Hot, Cool, Cold y Archive | Crear una regla de ciclo de vida por prefijo | Leer la política de ciclo de vida en JSON
prerrequisitos: azure-paso-a-paso-red-claves-y-sas
autoevaluacion: ¿Sabes cuánto tiempo se puede recuperar un blob borrado? | ¿Sabes qué diferencia hay entre soft delete y versionado? | ¿Sabes qué pasa al leer un archivo en Archive? | ¿Sabes limitar una regla a una carpeta?
---

:::escenario El pedido
Lucía: *"Dos pedidos: que un borrado accidental no nos haga perder datos de bronze, y que los archivos viejos no nos cuesten lo mismo que los nuevos. Bronze se lee mucho el primer mes y casi nunca después; a los dos años se puede borrar."*
:::

## Paso 1 — La protección de datos

En `sttiendaandinadev`, menú **Data protection**:

```captura
archivo: azure/b18-proteccion.webp
texto: Días que se conservan los blobs borrados (1), versionado (2) y Save (3)
```

| Opción | Protege contra | Cómo se recupera |
|---|---|---|
| **Soft delete for blobs** | Borrar un archivo | *Undelete* durante los días configurados (1 a 365) |
| **Soft delete for containers** | Borrar un contenedor entero | *Restore* del contenedor |
| **Versioning for blobs** | **Pisar** un archivo con otro contenido | Volver a una versión anterior |

Configura **14 días** de soft delete para blobs, activa el **versionado** y pulsa **Save**.

:::nota Soft delete y versionado se complementan
Soft delete salva un archivo **borrado**. El versionado salva un archivo **sobrescrito**: un job que escribe mal encima de `clientes.csv` no deja rastro sin versiones. Cada versión ocupa espacio y se paga, por eso se combina con una regla de ciclo de vida que borre versiones viejas.
:::

## Paso 2 — Comprobarlo

Abre `bronze`, marca `pedidos/2026/11/pedidos.csv` y pulsa **Delete**:

```captura
archivo: azure/b18-blob-borrado.webp
texto: El archivo ya no aparece en la lista, pero con soft delete sigue recuperable 14 días
```

En el portal real, el interruptor **Show deleted blobs** lo muestra y **Undelete** lo devuelve. Con la CLI:

```bash
az storage blob list --account-name sttiendaandinadev -c bronze --include d --auth-mode login -o table
az storage blob undelete --account-name sttiendaandinadev -c bronze -n pedidos/2026/11/pedidos.csv --auth-mode login
```

## Paso 3 — Los niveles de acceso

| Nivel | Precio por GB | Precio por lectura | Mínimo de días | Para |
|---|---|---|---|---|
| **Hot** | El más alto | El más bajo | — | Lo que se lee seguido |
| **Cool** | Más bajo | Más alto | 30 | Lo que se lee poco |
| **Cold** | Aún más bajo | Aún más alto | 90 | Lo que casi no se lee |
| **Archive** | El más bajo | El más alto | 180 | Lo que se guarda por obligación |

Si sacas un archivo antes de los días mínimos, se cobra igual el resto del período.

:::cuidado Archive está "fuera de línea"
Un archivo en **Archive** no se puede leer directamente: primero hay que **rehidratarlo** a Hot o Cool, y eso tarda **horas**. Nunca pongas en Archive algo que un pipeline pueda necesitar de un momento a otro.
:::

## Paso 4 — Una regla de ciclo de vida

Menú **Lifecycle management**:

```captura
archivo: azure/b18-ciclo-vacio.webp
texto: Lifecycle management sin reglas - Add a rule (1)
```

**+ Add a rule**:

1. **Rule name**: `bronze-a-cool`.
2. **Limit blobs with filter (prefix)**: `bronze/` (solo el contenedor bronze).
3. **Move to cool storage after**: `30` días desde la última modificación.
4. **Move to archive storage after**: `180` días.
5. **Delete the blob after**: `730` días (dos años).

```captura
archivo: azure/b18-ciclo-regla.webp
texto: La regla - prefijo (1), pasar a Cool (2), a Archive (3) y borrar (4)
```

```captura
archivo: azure/b18-ciclo.webp
texto: La regla creada y la política en JSON, que es lo que guarda Azure
```

El **prefijo** empieza por el nombre del contenedor: `bronze/` aplica a todo bronze; `bronze/pedidos/` solo a los pedidos. Silver y gold quedan en Hot porque se consultan todo el tiempo.

:::tip Las reglas corren una vez al día
Azure evalúa las reglas de ciclo de vida una vez por día. Después de crear una regla puede tardar hasta 24 horas en aplicarse por primera vez.
:::

## Paso 5 — La configuración final

Menú **Configuration**:

```captura
archivo: azure/b18-config.webp
texto: Configuration - transferencia segura, acceso anónimo, TLS, nivel por defecto, replicación y espacio de nombres jerárquico
```

Es un buen lugar para revisar de un vistazo los valores de seguridad de la cuenta.

## ✅ Lo que lograste

- Configuraste soft delete de 14 días y versionado.
- Sabes recuperar un blob borrado.
- Creaste una regla que abarata bronze con el tiempo y lo borra a los dos años.

:::ejercicio quiz
Un job sobrescribió `clientes.csv` con datos vacíos. ¿Qué te permite recuperarlo?
- [ ] Soft delete for blobs
- [x] El versionado de blobs
- [ ] La regla de ciclo de vida
- [ ] El nivel Archive
:::

:::ejercicio quiz
Un pipeline necesita leer archivos de hace 8 meses, que una regla movió a Archive. ¿Qué pasa?
- [ ] Los lee normal, un poco más lento
- [x] Falla: hay que rehidratarlos primero y eso tarda horas
- [ ] Azure los rehidrata solo en segundos
- [ ] Ya no existen
:::

:::ejercicio quiz
¿Qué prefijo usas para que una regla aplique solo a los pedidos de bronze?
- [ ] `pedidos/`
- [x] `bronze/pedidos/`
- [ ] `/bronze/pedidos`
- [ ] `*pedidos*`
:::

:::ejercicio quiz
¿Por qué silver y gold no pasan a Cool a los 30 días como bronze?
- [ ] Porque Azure no lo permite
- [x] Porque se leen todo el tiempo y en Cool cada lectura cuesta más
- [ ] Porque son más chicos
- [ ] Porque no tienen fecha de modificación
:::
