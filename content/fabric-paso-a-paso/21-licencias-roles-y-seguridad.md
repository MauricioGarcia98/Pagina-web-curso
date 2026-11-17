---
titulo: Licencias, roles y seguridad - quién puede hacer qué
nivel: 6 · Avanzado completo
duracion: 45
resumen: No todos los workspaces pueden tener lakehouses y no todos los usuarios deben poder editarlos. Creas un workspace con licencia Pro y ves por qué no admite ítems de Fabric, aprendes los cuatro roles del workspace y las capas de seguridad (workspace, ítem, SQL y OneLake) para dar el acceso justo.
objetivos: Distinguir licencia Pro, Trial y capacidad de Fabric | Asignar los roles Admin, Member, Contributor y Viewer | Aplicar el principio de mínimo privilegio | Conocer la seguridad a nivel de ítem, SQL y OneLake
prerrequisitos: fabric-paso-a-paso-proyecto-workspace-versionado
autoevaluacion: ¿Sabes por qué un workspace Pro no admite un lakehouse? | ¿Sabes qué rol darle a quien solo mira informes? | ¿Sabes qué puede hacer un Contributor? | ¿Sabes cómo restringir filas de una tabla?
---

:::escenario El pedido
Lucía: *"Comercial quiere su propio workspace para informes, y vamos a sumar dos analistas que solo tienen que leer. No quiero que nadie borre el lakehouse por error."*
:::

:::analogia Llaves del edificio y llaves de cada cajón
Los roles del workspace son llaves del edificio: Admin, Member, Contributor o Viewer deciden qué puedes hacer con los ítems. Los permisos SQL son llaves de cada cajón: dentro del warehouse, deciden qué tabla o vista puede leer cada uno.
:::

## Paso 1 — Un workspace con licencia Pro

Crea `Informes Pro` y en **License mode** elige **Pro**:

```captura
archivo: fabric/b21-pro.webp
texto: El aviso - un workspace Pro solo admite ítems de Power BI; lakehouse, notebooks o pipelines necesitan una capacidad de Fabric
```

| Modo | Qué admite |
|---|---|
| **Pro / Premium Per User** | Solo ítems de Power BI (informes, modelos semánticos, dashboards) |
| **Trial** | Todo Fabric durante la prueba, sobre una capacidad F64 compartida |
| **Fabric capacity (F SKU)** | Todo Fabric; la capacidad la paga la organización |

La licencia **del workspace** decide qué ítems puede tener. La licencia **del usuario** decide qué puede ver: en capacidades chicas, quien consume informes de Power BI necesita licencia Pro; desde **F64**, los usuarios con licencia gratuita pueden ver los informes.

## Paso 2 — Los roles del workspace

En el workspace, **Manage access**:

| Rol | Puede… | Para quién |
|---|---|---|
| **Admin** | Todo, incluido borrar el workspace y gestionar accesos | Uno o dos responsables |
| **Member** | Editar y compartir, agregar personas con roles menores | Líderes del equipo |
| **Contributor** | Crear, editar y borrar ítems; no gestiona accesos | Ingenieros de datos |
| **Viewer** | Ver y consultar, sin editar | Analistas que solo leen |

Para los dos analistas: **Viewer**. Para Lucía y otra persona: **Admin**. Para el resto del equipo técnico: **Contributor**.

:::cuidado Mínimo privilegio
Da el rol más bajo que alcance para el trabajo. Asigna los roles a **grupos** de Microsoft Entra (por ejemplo `grp-tienda-andina-viewers`), no a personas sueltas: cuando alguien entra o sale del equipo, se cambia el grupo y no cada workspace.
:::

## Paso 3 — Seguridad más fina

| Capa | Qué controla | Ejemplo |
|---|---|---|
| **Workspace** | Roles sobre todos los ítems | Viewer en todo el workspace |
| **Ítem** | Compartir un solo ítem sin dar acceso al workspace | Compartir solo el modelo semántico con finanzas |
| **SQL** (warehouse y endpoint) | `GRANT`/`DENY` sobre tablas y vistas, seguridad por filas y por columnas | Que comercial lea `v_avance_metas` pero no `metas_tienda` |
| **OneLake security** | Roles sobre carpetas y tablas del lakehouse, para todos los motores | Que un equipo solo vea `Tables/ventas_*` |
| **Modelo semántico** | Seguridad por filas (RLS) con DAX | Cada gerente ve solo su país |

```sql norun
GRANT SELECT ON dbo.v_avance_metas TO [grp-comercial];
DENY SELECT ON dbo.metas_tienda TO [grp-comercial];
```

:::errores
- **Dar Member a quien solo lee.** Viewer alcanza para consultar y ver informes.
- **Usar el rol del workspace para ocultar una tabla.** El rol abre todo el workspace; para una tabla o vista se usan permisos SQL (GRANT y DENY).
- **Crear ítems de Fabric en un workspace Pro.** Pro solo admite Power BI; hace falta capacidad.
:::

## ✅ Lo que lograste

- Sabes qué licencia admite qué ítems.
- Asignas roles con mínimo privilegio y por grupos.
- Conoces las capas de seguridad de Fabric.

:::ejercicio quiz
¿Por qué el workspace Informes Pro no admite un lakehouse?
- [ ] Porque el nombre tiene espacios
- [x] Porque la licencia Pro solo admite ítems de Power BI
- [ ] Porque falta un notebook
- [ ] Porque un workspace Pro necesita un notebook primero
:::

:::ejercicio quiz
Dos analistas solo tienen que leer. ¿Qué rol les das?
- [ ] Admin
- [ ] Member
- [ ] Contributor
- [x] Viewer
:::

:::ejercicio quiz
¿Qué NO puede hacer un Contributor?
- [ ] Crear ítems
- [ ] Editar notebooks
- [x] Gestionar quién tiene acceso al workspace
- [ ] Ejecutar pipelines
:::

:::ejercicio quiz
Comercial debe leer la vista pero no la tabla de metas. ¿Qué capa usas?
- [ ] Rol de workspace
- [x] Permisos SQL: GRANT sobre la vista y DENY sobre la tabla
- [ ] Cambiar la licencia
- [ ] Mover la tabla a otro workspace
:::
