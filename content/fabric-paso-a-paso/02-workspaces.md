---
titulo: Workspaces - el espacio del equipo, su licencia y sus ajustes
nivel: 1 · Básico
duracion: 30
resumen: El workspace es la unidad de trabajo de Fabric - agrupa ítems, define quién puede hacer qué y a qué capacidad se cobra. Creas el workspace del equipo con nombre, descripción y modo de licencia, conoces la vista de lista y de linaje, y revisas los ajustes donde están la licencia y la integración con Git.
objetivos: Crear un workspace con nombre, descripción y licencia | Distinguir los modos de licencia Trial, capacidad de Fabric y Pro | Ubicar los ajustes del workspace | Saber cómo se organizan los workspaces en un equipo
prerrequisitos: fabric-paso-a-paso-que-es-fabric-y-la-pantalla
autoevaluacion: ¿Sabes qué licencia hace falta para un lakehouse? | ¿Sabes dónde se conecta Git? | ¿Sabes por qué separar dev y prod en workspaces distintos? | ¿Sabes qué es la vista de linaje?
---

:::escenario El pedido
Lucía, la líder del equipo de datos de Tienda Andina: *"Vamos a probar Fabric para la analítica de ventas. Creá un workspace del equipo para desarrollo, que después hacemos el de producción."*
:::

## Paso 1 — Crear el workspace

En **Workspaces → New workspace**:

1. **Name**: `Tienda Andina - Datos`.
2. **Description**: *Analítica de ventas de Tienda Andina (entorno de desarrollo)*.
3. **Advanced → License mode**: **Trial**.

```captura
archivo: fabric/b02-nuevo-ws.webp
texto: Create a workspace - nombre (1), descripción (2) y el modo de licencia (3)
```

| Modo de licencia | Qué permite |
|---|---|
| **Trial** | Una capacidad de prueba (F64) por tiempo limitado: todos los ítems de Fabric |
| **Fabric capacity** | Una capacidad paga (F2, F4… F64…): todos los ítems |
| **Pro / Premium per user** | Solo ítems de **Power BI** (modelos e informes): **sin** lakehouse, notebooks ni pipelines |

Haz clic en **Apply**:

```captura
archivo: fabric/b02-ws-vacio.webp
texto: El workspace vacío - su nombre (1), New item (2) y Workspace settings (3)
```

Arriba a la derecha están las vistas **List** (los ítems en tabla) y **Lineage** (cómo se conectan entre sí). Las usas cuando el workspace tenga contenido.

## Paso 2 — Los ajustes

**Workspace settings**:

```captura
archivo: fabric/b02-ajustes.webp
texto: Workspace settings - nombre, descripción, la licencia y la integración con Git
```

| Sección | Para qué |
|---|---|
| **General** | Nombre y descripción |
| **License info** | Qué licencia y qué capacidad usa (aquí, Trial F64) |
| **Git integration** | Conectar el workspace a un repositorio (lección 19) |

En el Fabric real, **Manage access** (en el workspace) asigna los roles **Admin**, **Member**, **Contributor** y **Viewer** a personas o grupos (lección 21).

:::tip Cómo se organizan los equipos
Lo habitual es **un workspace por equipo y por entorno**: `Tienda Andina - Datos [Dev]`, `[Test]`, `[Prod]`. Así cada entorno tiene sus permisos y el paso de dev a prod se hace con Git o con *deployment pipelines*, no a mano.
:::

## ✅ Lo que lograste

- Creaste el workspace del equipo con licencia Trial.
- Conoces los modos de licencia y los ajustes del workspace.

:::ejercicio quiz
Un workspace con licencia Pro, ¿puede tener un lakehouse?
- [ ] Sí
- [x] No, Pro solo admite ítems de Power BI
- [ ] Solo los lunes
- [ ] Solo si es pequeño
:::

:::ejercicio quiz
¿Dónde se conecta un workspace a Git?
- [ ] En el lakehouse
- [x] En Workspace settings → Git integration
- [ ] En Monitor
- [ ] En OneLake
:::

:::ejercicio quiz
¿Por qué separar dev y prod en workspaces distintos?
- [ ] Porque Fabric lo exige
- [x] Para tener permisos distintos y pasar cambios de forma controlada
- [ ] Porque es más barato
- [ ] Para que tengan colores distintos
:::

:::ejercicio quiz
¿Qué muestra la vista Lineage de un workspace?
- [ ] La factura
- [x] Cómo se conectan los ítems entre sí
- [ ] Los usuarios
- [ ] Los errores
:::
