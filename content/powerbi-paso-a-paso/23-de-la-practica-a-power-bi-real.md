---
titulo: De la práctica a Power BI real - instalar, conectar tus datos, licencias y Fabric
nivel: 6 · Avanzado completo
duracion: 40
resumen: Lo que hiciste funciona igual en Power BI Desktop, con algunas diferencias. Instalar Desktop, llevar el modelo de la práctica con TMDL, conectar orígenes reales, qué cambia en el servicio real (licencias, capacidades, Fabric, Copilot), cómo armar tu portafolio de Power BI y el camino a la certificación PL-300.
objetivos: Instalar Power BI Desktop y abrir un proyecto | Llevar el modelo de la práctica al Desktop real | Conectar orígenes reales y saber qué pide cada uno | Entender licencias, capacidades y Fabric | Planificar portafolio y certificación
prerrequisitos: powerbi-paso-a-paso-modelado-avanzado-y-codigo
autoevaluacion: ¿Sabes cómo llevar tu modelo de la práctica al Desktop real? | ¿Sabes qué licencia necesitas para compartir? | ¿Sabes qué es Fabric respecto de Power BI? | ¿Sabes qué examen certifica lo que aprendiste?
---

:::analogia En palabras simples
La práctica fue el simulador de vuelo con los mismos instrumentos. En el avión real los botones están en el mismo lugar; cambian los trámites (licencia, conexiones a los servidores de tu empresa) y aparecen algunos instrumentos nuevos, como Copilot.
:::

## Paso 1 — Instalar y abrir

- **Power BI Desktop**: gratis, para Windows (Microsoft Store o el centro de descargas de Microsoft). En Mac se usa con una máquina virtual o directamente el servicio y Fabric en el navegador.
- Activa en **Archivo → Opciones → Características en versión preliminar** el guardado como **proyecto .pbip** y el **formato TMDL** si tu versión aún no los trae por defecto.

## Paso 2 — Llevar tu modelo

En la práctica, **Archivo → Exportar el modelo (TMDL)** descarga la definición del modelo. En Desktop real:

1. Crea un proyecto `.pbip` vacío y ciérralo.
2. Reemplaza la carpeta `NombreDelProyecto.SemanticModel/definition/` con la que exportaste.
3. Abre el `.pbip`: tablas, relaciones y medidas están; falta apuntar las consultas a tus datos reales (Inicio → Transformar datos → Configuración del origen de datos).

## Paso 3 — Orígenes reales

| Origen | Qué te van a pedir |
|---|---|
| **Excel / CSV en SharePoint o OneDrive** | Tu cuenta de la organización; en el servicio no hace falta puerta de enlace |
| **SQL Server de la empresa** | Servidor, base, usuario; en el servicio, puerta de enlace |
| **Azure SQL, Synapse, Fabric** | Cuenta de la organización |
| **Databricks** | El *Server hostname* y *HTTP path* del SQL warehouse y autenticación de la organización |
| **Snowflake / BigQuery** | Cuenta, warehouse o proyecto, y credenciales |

Los conectores **Snowflake**, **BigQuery** y **Databricks** de la práctica muestran las tablas de las otras réplicas del curso: lo mismo, pero en real.

## Paso 4 — Licencias, capacidades y Fabric

| Concepto | Qué es |
|---|---|
| **Gratis** | Desktop y Mi área de trabajo; no se puede compartir |
| **Pro** | Publicar en áreas de equipo y compartir con otros usuarios Pro |
| **Premium por usuario (PPU)** | Pro + funciones avanzadas (48 actualizaciones, modelos grandes) |
| **Capacidad (Premium o Fabric F64+)** | La empresa paga capacidad; los lectores no necesitan licencia propia |
| **Microsoft Fabric** | La plataforma de datos de Microsoft que incluye Power BI junto con lakehouse, Data Factory, notebooks y Direct Lake |
| **Copilot en Power BI** | Asistente que crea páginas, sugiere medidas DAX y resume informes; requiere capacidad habilitada |

## Paso 5 — Tu portafolio

1. Tres informes con datos públicos o generados (el [generador de datos del curso](#/datos) sirve), cada uno con una pregunta de negocio clara.
2. Publícalos con **Publicar en la web** solo si los datos son públicos (cualquiera con el vínculo los ve), o muestra capturas.
3. Sube el proyecto `.pbip` a GitHub con un README: la pregunta, el modelo (una captura de la vista Modelo), las medidas clave y las conclusiones.

## Paso 6 — La certificación

El examen **PL-300: Microsoft Power BI Data Analyst** cubre exactamente este recorrido: preparar los datos (Power Query), modelar (relaciones, DAX), visualizar y analizar, e implementar y mantener (servicio, seguridad, actualización). El curso de [Power BI y DAX](#/m/powerbi) profundiza el motor DAX y el de [certificaciones Azure](#/m/cert-azure) te ayuda a organizar el estudio.

:::errores
- **Publicar en la web datos internos.** Cualquiera con el vínculo los ve, sin iniciar sesión.
- **Esperar compartir con licencia gratuita.** Para compartir en áreas de trabajo hace falta Pro, PPU o capacidad.
- **Rehacer el modelo de cero.** El TMDL de la práctica se lleva a un proyecto .pbip.
:::

## ✅ Lo que lograste

- Sabes instalar Desktop y llevar tu modelo.
- Sabes qué pide cada origen real y qué licencia hace falta.
- Tienes un plan para tu portafolio y la certificación.

:::ejercicio quiz
¿Cómo llevas el modelo de la práctica a Power BI Desktop real?
- [ ] Importando las capturas como imágenes de fondo
- [x] Exportando el modelo en TMDL y poniéndolo en la carpeta definition de un proyecto .pbip
- [ ] Copiando las capturas
- [ ] Publicando desde la práctica
:::

:::ejercicio quiz
Tienes licencia gratuita. ¿Qué no puedes hacer?
- [ ] Usar Power BI Desktop
- [ ] Publicar en Mi área de trabajo
- [x] Compartir informes con tu equipo en un área de trabajo
- [ ] Crear medidas DAX
:::

:::ejercicio quiz
¿Cuándo es aceptable usar "Publicar en la web"?
- [ ] Siempre
- [x] Solo con datos públicos: cualquiera con el vínculo puede verlo
- [ ] Con datos de clientes si el informe tiene RLS
- [ ] Con datos internos, si el vínculo no se comparte
:::
