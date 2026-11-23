---
titulo: De la práctica al Azure real
nivel: 6 · Avanzado completo
duracion: 40
resumen: Todo lo que hiciste funciona igual en un Azure de verdad, con algunas diferencias que conviene conocer antes de gastar un peso. Cómo abrir una cuenta gratis y no llevarte sorpresas, cómo se organizan las empresas (grupos de administración, suscripciones por entorno, políticas), la convención de nombres completa, cómo pasar lo que hiciste en el portal a Bicep o a la CLI, y qué certificaciones y siguientes pasos tienen sentido.
objetivos: Abrir una cuenta de Azure de prueba sin riesgos de costo | Entender cómo organiza Azure una empresa | Aplicar la convención de nombres del Cloud Adoption Framework | Convertir lo hecho en el portal a Bicep o CLI | Planificar los siguientes pasos de aprendizaje
prerrequisitos: azure-paso-a-paso-costos-y-presupuestos
autoevaluacion: ¿Sabes qué hacer apenas abres una cuenta nueva? | ¿Sabes para qué sirve Azure Policy? | ¿Sabes exportar lo que creaste a Bicep? | ¿Sabes qué certificación corresponde a tu rol?
---

:::analogia Del simulador al avión
Grupos, cuentas, contenedores, roles, Key Vault y plantillas funcionan igual en un Azure de verdad. Lo que cambia es que cada recurso cuesta dinero real y que en una empresa hay políticas que impiden crear cosas inseguras.
:::

## Paso 1 — Una cuenta propia sin sorpresas

| Opción | Qué incluye | Para |
|---|---|---|
| **Cuenta gratuita de Azure** | Crédito de USD 200 para los primeros 30 días + servicios gratis por 12 meses + algunos siempre gratis | Cualquiera, con tarjeta |
| **Azure for Students** | Crédito anual sin tarjeta, con correo de una institución educativa | Estudiantes |
| **Microsoft Learn sandbox** | Suscripciones temporales gratis dentro de algunos módulos de Learn | Ejercicios guiados |

Lo primero que haces en una cuenta nueva, antes de crear nada:

1. Un **presupuesto** chico (USD 5 o 10) con alertas al 50, 80 y 100 %.
2. Un grupo de recursos **por práctica**, que borras al terminar.
3. Clústeres de Databricks con **apagado automático** de 15 minutos.
4. Revisar **Cost Management** al día siguiente de cada práctica.

:::cuidado Las capturas de tu Azure real
Si compartes capturas de tu portal (en un foro, un informe o un portafolio), tapa el **correo**, el **ID de la suscripción**, el **ID del tenant**, las **claves** y cualquier **SAS**. Una SAS o una clave en una captura es una credencial filtrada.
:::

## Paso 2 — Cómo organiza Azure una empresa

```diagrama
titulo: Cómo organiza Azure una empresa: grupos de administración y suscripciones por entorno
nodo ten: Tenant | icono=entra | col=1 | fila=0 | color=azul
nodo emp: Management group "Empresa" | icono=carpeta | col=1 | fila=1 | color=violeta | sub=políticas para todos
nodo pla: Management group "Plataforma" | icono=carpeta | col=0 | fila=2 | color=gris
nodo dat: Management group "Datos" | icono=carpeta | col=2 | fila=2 | color=violeta
nodo con: Suscripciones de conectividad, identidad y logs | icono=azure | col=0 | fila=3 | color=gris
nodo dev: sub-datos-dev | icono=azure | col=1 | fila=3 | color=verde | sub=presupuestos y permisos de dev
nodo qa: sub-datos-qa | icono=azure | col=2 | fila=3 | color=amarillo
nodo prod: sub-datos-prod | icono=azure | col=3 | fila=3 | color=rojo | sub=bloqueos, alertas, sin acceso manual
flecha ten -> emp | explica=Debajo del tenant hay un grupo de administración raíz, "Empresa", con las políticas que aplican a todos.
flecha emp -> pla | explica=Plataforma agrupa lo compartido por todos los equipos.
flecha emp -> dat | explica=Datos agrupa las suscripciones del equipo de datos.
flecha pla -> con | explica=Ahí están las suscripciones de red, identidad y logs centrales.
flecha dat -> dev | explica=Dev tiene presupuestos y permisos amplios para experimentar.
flecha dat -> qa | explica=QA es para probar antes de producción.
flecha dat -> prod | explica=Prod tiene bloqueos y alertas, y nadie cambia nada a mano: todo llega por pipelines.
```

| Pieza | Para qué |
|---|---|
| **Management groups** | Agrupar suscripciones y heredarles políticas y permisos |
| **Suscripciones por entorno** | Separar costos, límites y permisos de dev, qa y prod |
| **Azure Policy** | Reglas automáticas: "solo estas regiones", "toda cuenta con TLS 1.2", "sin etiqueta `owner` no se crea" |
| **Landing zone** | La plantilla de todo lo anterior que propone el **Cloud Adoption Framework** de Microsoft |

En la práctica, el grupo `rg-tiendaandina-prod` quedó en la misma suscripción que dev para simplificar. En una empresa iría en `sub-datos-prod`.

## Paso 3 — La convención de nombres

El **Cloud Adoption Framework** propone abreviaturas por tipo de recurso. Las de este curso:

| Recurso | Abreviatura | Ejemplo | Reglas propias |
|---|---|---|---|
| Resource group | `rg` | `rg-tiendaandina-prod` | Hasta 90 caracteres |
| Storage account | `st` | `sttiendaandinaprod` | 3–24, solo minúsculas y números, único global |
| Key vault | `kv` | `kv-tiendaandina-prod` | 3–24, único global |
| Azure Databricks | `dbw` | `dbw-tiendaandina-prod` | 3–64 |
| Data factory | `adf` | `adf-tiendaandina-prod` | 3–63, único global |
| SQL server / base | `sql` / `sqldb` | `sql-tiendaandina-prod` | Servidor único global |

Forma general: **tipo-proyecto-entorno[-región][-número]**. Lo importante no es la convención exacta sino que **todo el equipo use la misma**.

## Paso 4 — Del portal al código

Cada asistente del portal ofrece la plantilla de lo que vas a crear. En **Review + create → Download a template for automation**, pestaña **Bicep**:

```captura
archivo: azure/b23-bicep.webp
texto: Las pestañas ARM, Bicep y Azure CLI (1) y la versión Bicep de la cuenta (2)
```

Y la pestaña **Azure CLI**:

```captura
archivo: azure/b23-cli.webp
texto: El mismo recurso como un comando az storage account create
```

En Azure real, además, cada grupo de recursos tiene **Export template**, que genera la plantilla de **lo que ya existe**. Es un buen punto de partida para pasar a código algo que se creó a mano (conviene limpiarla antes de usarla).

## Paso 5 — Detalles del portal real

- El portal real tiene muchas más opciones en cada pestaña; las que viste son las que importan para datos.
- Se puede elegir el **tema** y el **idioma** en los ajustes:

```captura
archivo: azure/b23-tema-oscuro.webp
texto: El portal con el tema oscuro
```

- Puedes crear **dashboards** propios con gráficos de métricas y costos, y fijar recursos a **favoritos**.
- **Azure Advisor** revisa tu suscripción y propone mejoras de costo, seguridad y confiabilidad.

## Paso 6 — Siguientes pasos

| Si quieres… | Sigue con |
|---|---|
| Procesar los datos del lago | [Databricks paso a paso](#/m/databricks-paso-a-paso) |
| Llevar los datos a informes | [Power BI paso a paso](#/m/powerbi-paso-a-paso) |
| Automatizar la infraestructura | [Terraform](#/m/terraform) |
| Ver la teoría de Azure y la CLI | [Azure y Azure CLI](#/m/azure) |
| Certificarte | [Certificaciones Azure](#/m/cert-azure): **DP-700** (Fabric Data Engineer) para ingeniería de datos; **AZ-900** como introducción general |

:::errores
- **Crear recursos antes de poner un presupuesto.** Configura alertas el primer día.
- **Compartir IDs de suscripción o tenant en foros.** Difumínalos en capturas.
- **Reescribir de cero lo que se creó a mano.** Export template da una base para pasarlo a código.
:::

## ✅ Lo que lograste

- Sabes abrir una cuenta propia y protegerte de costos inesperados.
- Entiendes cómo organiza Azure una empresa y para qué sirve Azure Policy.
- Pasas lo hecho en el portal a Bicep o CLI y sabes por dónde seguir.

:::ejercicio quiz
Abriste una cuenta gratis. ¿Qué haces antes de crear el primer recurso?
- [ ] Crear un clúster grande para probar
- [x] Un presupuesto chico con alertas
- [ ] Pedir un aumento de cuota de CPU
- [ ] Compartir el ID de la suscripción en un foro
:::

:::ejercicio quiz
¿Qué herramienta impide crear una cuenta de almacenamiento sin TLS 1.2 en toda la empresa?
- [ ] Un bloqueo Delete
- [ ] Un presupuesto
- [x] Azure Policy
- [ ] Una etiqueta
:::

:::ejercicio quiz
¿Por qué las empresas separan dev y prod en suscripciones distintas?
- [ ] Porque Azure lo exige
- [x] Para separar costos, límites y permisos
- [ ] Porque es más barato
- [ ] Porque una suscripción no puede tener más de un grupo
:::

:::ejercicio quiz
Creaste a mano un grupo con varios recursos y quieres pasarlo a código. ¿Por dónde empiezas?
- [ ] Lo borro y escribo la plantilla de cero
- [x] Con Export template del grupo, y limpio la plantilla generada
- [ ] Con una captura de pantalla
- [ ] Con el Activity log
:::
