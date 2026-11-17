---
titulo: Contenedores y blobs - subir los primeros archivos
nivel: 2 · Básico-intermedio
duracion: 40
resumen: Dentro de una cuenta de almacenamiento los archivos viven en contenedores. Creas los contenedores bronze, silver y gold (con un error de nombre a propósito), subes pedidos.csv y clientes.csv a carpetas dentro de bronze, y descubres la diferencia entre entrar con la clave de la cuenta y entrar con tu usuario de Microsoft Entra - por qué ser Owner no alcanza para leer los datos.
objetivos: Crear contenedores con nombres válidos | Subir archivos a una carpeta dentro de un contenedor | Leer la lista de blobs con su nivel de acceso y tamaño | Distinguir el acceso con clave del acceso con Microsoft Entra | Explicar por qué un Owner no puede listar blobs sin un rol de datos
prerrequisitos: azure-paso-a-paso-proyecto-entorno-dev
autoevaluacion: ¿Sabes qué caracteres admite el nombre de un contenedor? | ¿Sabes subir un archivo a una carpeta? | ¿Sabes qué método de autenticación está usando el portal? | ¿Sabes qué rol hace falta para leer blobs con tu usuario?
---

:::escenario El pedido
Lucía: *"Vamos a organizar el lago en tres capas: `bronze` para lo que llega tal cual, `silver` para lo limpio y `gold` para lo listo para informes. Sube a bronze los primeros archivos de pedidos y clientes."*
:::

:::analogia Cajones dentro del depósito
Los contenedores son los cajones grandes del depósito (bronze, silver, gold) y los blobs son los archivos que guardas adentro. Ser dueño del edificio (Owner) no te da la llave de los cajones: para leer archivos hace falta un rol de datos.
:::

## Paso 1 — Contenedor, blob y carpeta

| Pieza | Qué es | Ejemplo |
|---|---|---|
| **Contenedor** | La raíz donde se guardan archivos. Con ADLS Gen2 también se llama *file system* | `bronze` |
| **Blob** | Un archivo | `pedidos.csv` |
| **Carpeta** | Parte del nombre del blob (`pedidos/2026/11/`). Con ADLS Gen2 es una carpeta real | `pedidos/2026/11/pedidos.csv` |

La dirección completa de un blob es:

```text
https://sttiendaandinadev.blob.core.windows.net/bronze/pedidos/2026/11/pedidos.csv
         └──── cuenta ────┘                     └─ contenedor ┘└──── carpeta + archivo ────┘
```

## Paso 2 — Crear los contenedores

Abre `sttiendaandinadev` → menú **Containers**:

```captura
archivo: azure/b05-contenedores-vacio.webp
texto: Containers vacío - el botón + Container (1)
```

Haz clic en **+ Container** y escribe `Bronze_Raw`:

```captura
archivo: azure/b05-contenedor-invalido.webp
texto: El error - solo minúsculas, números y guiones, de 3 a 63 caracteres
```

Reglas del nombre de un contenedor: de **3 a 63** caracteres, **minúsculas, números y guiones**, empieza con letra o número y sin dos guiones seguidos. Cierra el panel, vuelve a abrirlo y escribe `bronze`:

```captura
archivo: azure/b05-nuevo-contenedor.webp
texto: Nombre bronze (1) y nivel de acceso anónimo (2), bloqueado porque la cuenta no lo permite
```

El **Anonymous access level** está fijo en *Private* porque al crear la cuenta dejaste desmarcado el acceso anónimo. Es lo correcto: nadie lee tus datos sin identificarse. Haz clic en **Create** y repite para `silver` y `gold`:

```captura
archivo: azure/b05-contenedores.webp
texto: Los tres contenedores de las capas del lago
```

## Paso 3 — Subir archivos a una carpeta

Entra a **bronze**:

```captura
archivo: azure/b05-contenedor-vacio.webp
texto: El contenedor vacío - Upload (1) y el método de autenticación (2)
```

Crea en tu computadora un archivo `pedidos.csv` con este contenido:

```text
pedido_id,cliente_id,fecha_pedido,canal,estado
1,101,2026-11-01,web,entregado
2,205,2026-11-01,app,enviado
3,318,2026-11-02,tienda,entregado
```

Haz clic en **Upload**, elige el archivo y en **Upload to folder** escribe `pedidos/2026/11`:

```captura
archivo: azure/b05-subir.webp
texto: Upload blob - el archivo (1) y la carpeta de destino (2)
```

Haz clic en **Upload**. Repite con un `clientes.csv` en la carpeta `clientes`:

```text
cliente_id,nombre,pais,segmento
101,Ana,Perú,Consumidor
205,Luis,Chile,Pyme
318,Sofía,México,Corporativo
```

```captura
archivo: azure/b05-blobs.webp
texto: Los blobs en bronze - nombre con su carpeta, nivel de acceso (Hot), tipo (Block blob) y tamaño
```

:::tip ¿Por qué `pedidos/2026/11`?
Guardar por **fecha de llegada** (año/mes/día) es la convención de la capa bronze. Permite volver a procesar un día puntual, borrar lo viejo con una regla de ciclo de vida y que Spark lea solo las carpetas que necesita.
:::

## Paso 4 — Clave de acceso o Microsoft Entra

Arriba de la lista dice **Authentication method: Access key**. El portal está leyendo los blobs con la **clave de la cuenta**, que da control total. Haz clic en **Switch to Microsoft Entra user account**:

```captura
archivo: azure/b05-entra-sin-permiso.webp
texto: Con tu usuario de Entra (1) no puedes listar los blobs (2) - aunque seas Owner
```

Es uno de los momentos más confusos de Azure, y vale la pena entenderlo:

| Tipo de rol | Ejemplos | Qué permite |
|---|---|---|
| **De administración** (*control plane*) | Owner, Contributor, Reader | Crear, configurar y borrar el **recurso** |
| **De datos** (*data plane*) | Storage Blob Data Reader, Contributor, Owner | Leer y escribir el **contenido** |

Ser **Owner** de la suscripción te deja administrar la cuenta (y leer sus claves), pero **no** te da acceso a los datos con tu usuario. Para eso hace falta un rol **Storage Blob Data…**. Lo asignas en la lección 10.

:::cuidado Por qué importa
La clave de acceso es como la llave maestra del edificio: cualquiera que la tenga entra a todo y no queda registrado *quién* entró. Las empresas desactivan cada vez más el acceso con clave y usan **Microsoft Entra + roles de datos**, que dan permisos por persona o por aplicación y quedan auditados.
:::

Vuelve a **Switch to Access key** para seguir trabajando.

:::errores
- **Ser Owner y esperar ver los datos.** Owner administra el recurso; para leer blobs con tu usuario hace falta Storage Blob Data Reader o Contributor.
- **Nombres de contenedor con mayúsculas o guiones bajos.** Solo minúsculas, números y guiones, de 3 a 63 caracteres.
- **Compartir la clave de la cuenta.** Da acceso total y no queda registrado quién la usó; con Entra cada acceso tiene nombre.
:::

## ✅ Lo que lograste

- Creaste los contenedores `bronze`, `silver` y `gold`.
- Subiste archivos a carpetas por tema y fecha.
- Entiendes la diferencia entre la clave de la cuenta y los roles de datos de Entra.

:::ejercicio quiz
¿Cuál es un nombre válido de contenedor?
- [ ] `Bronze_Raw`
- [x] `bronze`
- [ ] `br`
- [ ] `capa bronze`
:::

:::ejercicio quiz
En la dirección `https://sttiendaandinadev.blob.core.windows.net/bronze/clientes/clientes.csv`, ¿qué es `bronze`?
- [ ] La cuenta
- [x] El contenedor
- [ ] La carpeta
- [ ] La región
:::

:::ejercicio quiz
Eres Owner de la suscripción y al cambiar a "Microsoft Entra user account" no ves los blobs. ¿Por qué?
- [ ] Porque la cuenta está apagada
- [ ] Porque los blobs se borraron
- [x] Porque Owner es un rol de administración; para leer datos hace falta un rol Storage Blob Data
- [ ] Porque los contenedores son privados para todos, incluido Owner, hasta que los publiques
:::

:::ejercicio quiz
¿Por qué se prefiere Microsoft Entra a la clave de la cuenta?
- [ ] Porque es más rápido
- [x] Porque da permisos por persona o aplicación y queda registrado quién accedió
- [ ] Porque la clave de la cuenta vence cada 24 horas
- [ ] Porque es la única forma de subir archivos
:::
