---
titulo: "Guía real: Azure paso a paso, de la cuenta gratuita a Azure Databricks"
nivel: Intermedio
duracion: 90
resumen: Una guía para hacer en tu propia cuenta de Azure - crear la cuenta gratuita (200 USD de crédito por 30 días), un presupuesto con alertas, un grupo de recursos, un lago ADLS Gen2 con contenedores bronze, silver y gold, subir datos desde el portal y desde Cloud Shell con az, y (opcional, con costo) un workspace de Azure Databricks con la prueba de 14 días. Termina con la limpieza completa. Cada paso tiene lugar para tu captura de pantalla.
objetivos: Crear una cuenta de Azure y un presupuesto con alertas antes de crear recursos | Crear un grupo de recursos y una cuenta ADLS Gen2 desde el portal | Hacer lo mismo con az en Cloud Shell | Saber qué cobra Azure Databricks y qué cubre la prueba | Borrar todo y comprobar que no quedó nada
prerrequisitos: azure-nube-azure | azure-storage | laboratorios-como-trabajar
autoevaluacion: ¿Sabes por qué un presupuesto no detiene el gasto? | ¿Sabes qué opción convierte una cuenta de almacenamiento en ADLS Gen2? | ¿Sabes por qué la prueba de Azure Databricks no funciona con la suscripción de prueba gratuita? | ¿Sabes cómo borrar todo lo que creaste de una vez?
---

:::escenario
En el módulo de Azure creaste grupos de recursos, cuentas de almacenamiento y un workspace de Databricks en la terminal simulada. Ahora vas a hacerlo en Azure de verdad. La parte 1 de esta guía cabe en el crédito gratuito y no te cobra nada; la parte 2 (Azure Databricks) es opcional y puede tener un costo pequeño, que te explicamos antes de que hagas clic.
:::

:::nota Cómo usar esta guía
Cada paso tiene un recuadro de **captura pendiente**: cuando lo hagas, saca una captura y súbela con el nombre indicado. **Antes de subirla, tapa** el ID de suscripción, el ID de inquilino (*tenant*), tu correo y cualquier clave: esos datos no deben quedar en una imagen pública. Los nombres de las opciones son los de Microsoft Learn de octubre de 2026; si el portal cambió, busca la opción con un nombre parecido.
:::

## Antes de empezar: cuánto cuesta

| Parte | Qué creas | Costo |
|---|---|---|
| 1 | Cuenta, presupuesto, grupo de recursos, ADLS Gen2 con unos MB de datos | Centavos, cubiertos por el crédito |
| 2 (opcional) | Workspace de Azure Databricks con la prueba de 14 días | La prueba regala las DBU (el uso de Databricks), pero **Azure cobra las máquinas virtuales** del cómputo mientras están encendidas |
| Limpieza | Borrar el grupo de recursos | Deja de cobrar todo |

Según Microsoft, la cuenta gratuita incluye **200 USD de crédito para usar en 30 días**, cantidades mensuales gratis de más de 20 servicios populares por 12 meses (solo para clientes nuevos) y protección: mientras uses la cuenta gratuita, la tarjeta no se cobra salvo que pases a pago por uso.

## Parte 1: la base, sin costo

### Paso 1: crear la cuenta gratuita

1. Entra a la página de la cuenta gratuita de Azure (busca "Azure free account"; la página es de `azure.microsoft.com`) y elige **Try Azure for free** o la opción equivalente.
2. Inicia sesión con una cuenta de Microsoft (o crea una).
3. Completa la verificación por teléfono y la tarjeta: Microsoft la usa para verificar tu identidad.
4. Al terminar, entra al **portal de Azure** (`portal.azure.com`).

```captura
archivo: az-01-cuenta.png
texto: La página de inicio del portal de Azure después de crear la cuenta
```

### Paso 2: el presupuesto, antes que cualquier recurso

Un **presupuesto** te avisa por correo cuando el gasto llega a un porcentaje. Según la documentación de Cost Management, **no detiene ni afecta los recursos**: solo avisa. Por eso es el primer paso, no el último.

1. En el buscador de arriba del portal, escribe **Budgets** (o entra a **Cost Management** → **Budgets**).
2. Elige como alcance (*scope*) tu suscripción y haz clic en **Add**.
3. Nombre `presupuesto-lab`, período mensual, monto **10 USD**.
4. En las alertas, agrega umbrales de **50 %, 80 % y 100 %** sobre el costo real, con tu correo.

```captura
archivo: az-02-presupuesto.png
texto: El presupuesto presupuesto-lab con alertas al 50, 80 y 100 por ciento
```

:::cuidado Los avisos llegan con demora
Microsoft aclara que los datos de costo aparecen entre 8 y 24 horas después del uso, que los presupuestos se evalúan cada 24 horas y que en una suscripción nueva Cost Management puede tardar hasta 48 horas en estar disponible. Un presupuesto no reemplaza borrar los recursos al terminar.
:::

### Paso 3: el grupo de recursos

Un **grupo de recursos** es una carpeta lógica para todo lo de un proyecto. La ventaja para un laboratorio: al final se borra el grupo y desaparece todo lo que tiene adentro.

1. Busca **Resource groups** → **Create**.
2. Nombre `rg-datos-lab`, región **East US 2** (o una cercana; usa siempre la misma).
3. En **Tags**, agrega `proyecto = lab`.
4. **Review + create** → **Create**.

```captura
archivo: az-03-grupo.png
texto: El grupo de recursos rg-datos-lab creado, con su región y la etiqueta proyecto=lab
```

### Paso 4: el lago de datos (ADLS Gen2)

Una cuenta de almacenamiento se convierte en **ADLS Gen2** (el lago de datos) con una sola opción: el **espacio de nombres jerárquico**, que permite carpetas reales y permisos por carpeta.

1. Busca **Storage accounts** → **Create**.
2. Pestaña **Basics**: grupo `rg-datos-lab`; nombre `stdatoslab` seguido de números para que sea único (solo minúsculas y números, de 3 a 24 caracteres); misma región; rendimiento **Standard**; redundancia **LRS** (la más barata: tres copias en un centro de datos).
3. Pestaña **Advanced**: marca **Enable hierarchical namespace**. Según Microsoft Learn, esta es la opción que habilita las capacidades de Data Lake Storage.
4. **Review + create** → **Create**.
5. Cuando termine, abre la cuenta → **Containers** → crea tres contenedores: `bronze`, `silver` y `gold`.

```captura
archivo: az-04-hns.png
texto: La pestaña Advanced con Enable hierarchical namespace marcado
```

```captura
archivo: az-05-contenedores.png
texto: Los contenedores bronze, silver y gold dentro de la cuenta de almacenamiento
```

### Paso 5: subir datos al lago

1. Descarga del **Generador de datos** del curso el escenario Tienda online en CSV y descomprime el ZIP.
2. Abre el contenedor `bronze` → **Upload** → elige `pedidos.csv`. En **Advanced**, escribe la carpeta `ventas/2024/` para que quede organizado.
3. Haz clic en el archivo subido para ver sus propiedades (tamaño, tipo, fecha).

```captura
archivo: az-06-subida.png
texto: pedidos.csv dentro de bronze/ventas/2024 en el contenedor
```

### Paso 6: lo mismo con az en Cloud Shell

**Cloud Shell** es una terminal en el navegador, ya conectada a tu cuenta y con `az` instalado. Ábrela con el ícono `>_` de la barra superior del portal y elige **Bash**. Los comandos son los del módulo de Azure del curso:

```bash norun
az account show --query "{suscripcion:name, usuario:user.name}" -o table
az group list -o table
az storage account list -g rg-datos-lab --query "[].{nombre:name, hns:isHnsEnabled, sku:sku.name}" -o table
az storage blob list --account-name <tu_cuenta> --container-name bronze --auth-mode login -o table
```

Si el último comando da un error de permisos, es porque `--auth-mode login` usa tu identidad de Entra ID y no las claves de la cuenta. Asígnate el rol de datos (como en la lección de identidad) y espera unos minutos:

```bash norun
az role assignment create --assignee "$(az ad signed-in-user show --query id -o tsv)" \
  --role "Storage Blob Data Contributor" \
  --scope "$(az storage account show -n <tu_cuenta> -g rg-datos-lab --query id -o tsv)"
```

```captura
archivo: az-07-cloud-shell.png
texto: Cloud Shell con la tabla de cuentas de almacenamiento (hns = True)
```

## Parte 2 (opcional, con costo): Azure Databricks

:::cuidado Lee esto antes de crear el workspace
Según Microsoft Learn, para la prueba gratuita de Azure Databricks necesitas una suscripción que **no** sea de prueba gratuita: hay que pasar la cuenta a **pago por uso** (*pay-as-you-go*), quitar el límite de gasto y, a veces, pedir más cuota de vCPU en la región. La prueba (nivel *Trial (Premium - 14-Days Free DBUs)*) regala las **DBU** (la tarifa de Databricks) por 14 días, pero **Azure cobra las máquinas virtuales** del cómputo mientras estén encendidas. Con un clúster chico, auto-terminación de 10 minutos y una hora de práctica, son unos pocos dólares. Si no quieres ningún costo, haz la guía de **Databricks Free Edition**: tiene la misma interfaz.
:::

### Paso 7: crear el workspace

1. En el portal: **Create a resource** → **Analytics** → **Azure Databricks**.
2. Grupo `rg-datos-lab`, nombre `dbw-datos-lab`, la misma región, nivel de precios **Trial (Premium - 14-Days Free DBUs)**.
3. **Review + create** → **Create**. Tarda unos minutos. Tu usuario queda como administrador del workspace.
4. Abre el recurso y haz clic en **Launch Workspace**.

Fíjate que Azure creó además un **grupo de recursos administrado** (su nombre empieza con `databricks-rg-`): ahí Databricks pone las máquinas y la red. No lo toques; se borra solo cuando borras el workspace.

```captura
archivo: az-08-databricks-crear.png
texto: El formulario de Azure Databricks con el nivel Trial (Premium - 14-Days Free DBUs)
```

```captura
archivo: az-09-databricks-workspace.png
texto: El workspace de Azure Databricks abierto después de Launch Workspace
```

### Paso 8: un cómputo barato y tu primer notebook

1. En el workspace, **Compute** → **Create compute**: un solo nodo (*Single node*), el tipo de máquina más chico que ofrezca y **Terminate after 10 minutes of inactivity**.
2. **+ New** → **Notebook**, conéctalo a ese cómputo y repite los pasos 4 y 5 de la guía de Free Edition (subir el CSV a un volumen y crear las tablas `pedidos_crudos` y `pedidos_silver`).
3. Para leer **directamente** desde tu ADLS Gen2 (en vez de subir a un volumen), Unity Catalog usa una *storage credential* (con un *Access Connector for Azure Databricks*) y una *external location*: es el paso siguiente, explicado en la lección de Unity Catalog.

```captura
archivo: az-10-compute.png
texto: El cómputo de un solo nodo con auto-terminación de 10 minutos
```

Para llevar el proyecto dbt del curso a este workspace, sigue la sección "De dbt en tu terminal a Azure" de la lección de servicios de datos: usa el SQL warehouse del workspace y un job con tarea dbt.

## Parte 3: limpieza (no es opcional)

1. Detén el cómputo de Databricks si lo creaste (**Compute** → **Terminate**).
2. En el portal: **Resource groups** → `rg-datos-lab` → **Delete resource group**. Escribe el nombre para confirmar. Esto borra la cuenta de almacenamiento, el workspace y, con él, el grupo administrado `databricks-rg-...`.
3. Comprueba en Cloud Shell que no quedó nada:

```bash norun
az group list --query "[?starts_with(name, 'rg-datos-lab') || starts_with(name, 'databricks-rg')].name" -o tsv
az resource list --tag proyecto=lab -o table
```

Ambos comandos deben devolver vacío. Al día siguiente, revisa **Cost Management** → **Cost analysis** para confirmar que el gasto dejó de crecer.

```captura
archivo: az-11-limpieza.png
texto: Cloud Shell sin grupos ni recursos con la etiqueta proyecto=lab
```

:::errores
- **Crear recursos antes del presupuesto**: si algo se olvida encendido, te enteras por la factura.
- **Creer que el presupuesto corta el gasto**: solo avisa, y con hasta un día de demora.
- **Olvidar el espacio de nombres jerárquico** al crear la cuenta: no es un lago ADLS Gen2 (se puede actualizar después, pero es un trámite).
- **Intentar la prueba de Databricks con la suscripción de prueba gratuita**: falla; hay que pasar a pago por uso.
- **Clústeres sin auto-terminación**: cobran máquinas por hora aunque nadie los use.
- **Borrar el workspace y no el grupo de recursos**: la cuenta de almacenamiento sigue cobrando (poco, pero sigue).
- **Subir capturas con el ID de suscripción o claves visibles**.
:::

:::trabajo
- En las empresas no se crea nada desde el portal en producción: estos mismos pasos se escriben en Bicep o Terraform (lección de automatización) y se despliegan desde CI/CD. Hacerlo una vez a mano sirve para entender qué hace cada opción.
- El presupuesto con alertas y las etiquetas `proyecto` y `responsable` son obligatorios en casi todas las organizaciones; Azure Policy puede impedir crear recursos sin etiquetas.
- Las suscripciones de laboratorio (*sandbox*) suelen tener un límite de gasto y un proceso que borra grupos viejos.
:::

:::entrevista "¿Qué harías antes de crear recursos en una suscripción de Azure nueva?"
Configuraría un presupuesto con alertas en varios umbrales y destinatarios, sabiendo que solo avisa y con demora. Definiría una región y una convención de nombres y etiquetas, por ejemplo proyecto, entorno y responsable, y si es posible una política que las exija. Agruparía los recursos de cada proyecto y entorno en su propio grupo de recursos para poder controlar costos y borrarlos juntos, y crearía la infraestructura como código en lugar de a mano.
:::

## Práctica

:::ejercicio quiz dificultad=Básico
¿Qué opción de la pestaña Advanced convierte una cuenta de almacenamiento en ADLS Gen2?

- [ ] Enable large file shares
- [x] Enable hierarchical namespace
- [ ] Enable SFTP
- [ ] Require secure transfer
:::

:::ejercicio quiz dificultad=Intermedio
Configuraste un presupuesto de 10 USD con alerta al 100 %. ¿Qué pasa cuando el gasto lo supera?

- [ ] Azure apaga todos los recursos
- [x] Recibes un correo (con demora de horas); los recursos siguen funcionando y cobrando
- [ ] Se bloquea la tarjeta
- [ ] Se borra el grupo de recursos
:::

:::ejercicio quiz dificultad=Intermedio
Con la prueba de 14 días de Azure Databricks, ¿qué se sigue cobrando?

- [ ] Nada
- [x] Las máquinas virtuales de Azure que usa el cómputo mientras están encendidas (la prueba solo regala las DBU)
- [ ] Solo el almacenamiento de los notebooks
- [ ] Una tarifa fija mensual
:::

:::ejercicio quiz dificultad=Básico
¿Cuál es la forma más segura de borrar todo lo del laboratorio?

- [ ] Borrar cada recurso de a uno
- [x] Borrar el grupo de recursos `rg-datos-lab` y comprobar con `az group list` y `az resource list --tag proyecto=lab` que no quedó nada
- [ ] Cancelar la tarjeta de crédito
- [ ] Esperar a que venza el crédito
:::

:::ejercicio cli dificultad=Intermedio titulo="Comprobar la limpieza"
Después de borrar el laboratorio, lista los recursos que todavía tengan la etiqueta `proyecto=lab`, en formato tabla.
```respuesta
todos: az resource list || --tag[= ]proyecto=lab || (-o|--output)[= ]table
```
```solucion
az resource list --tag proyecto=lab -o table
```
```setup
az login
```
:::
