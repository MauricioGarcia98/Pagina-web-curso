---
titulo: Seguridad por filas (RLS) - roles, reglas, Ver como y miembros en el servicio
nivel: 5 · Avanzado
duracion: 45
resumen: Un mismo informe, y cada gerente ve solo su país. La seguridad por filas (RLS) se define en Desktop con roles y reglas DAX, se prueba con Ver como, y en el servicio se asignan personas o grupos a cada rol. Reglas estáticas y dinámicas con USERPRINCIPALNAME, cómo el filtro se propaga por las relaciones y a quién no se le aplica.
objetivos: Crear un rol con una regla de filtro | Probar el rol con Ver como | Escribir una regla dinámica con USERPRINCIPALNAME | Asignar miembros en el servicio | Conocer los límites de RLS
prerrequisitos: powerbi-paso-a-paso-actualizacion-gateway-y-credenciales
autoevaluacion: ¿Sabes dónde se crean los roles? | ¿Sabes qué hace la regla [pais] = "Argentina"? | ¿Sabes probar un rol sin publicar? | ¿Sabes a quién no se le aplica RLS?
---

:::analogia En palabras simples
RLS es como darle a cada gerente unos anteojos que solo dejan ver su parte del mapa. El informe es el mismo para todos; lo que cambia es lo que cada uno puede ver a través de sus anteojos.
:::

## Paso 1 — Crear el rol

**Modelado → Administrar roles → + Nuevo**:

```captura
archivo: powerbi/b19-roles.webp
texto: El rol Gerente Argentina, la tabla clientes y la regla pais Es igual a Argentina, con su DAX equivalente
```

| Parte | Qué es |
|---|---|
| **Rol** | Un nombre (Gerente Argentina) |
| **Tabla** | Dónde se aplica el filtro (`clientes`) |
| **Regla** | Una condición DAX: `[pais] = "Argentina"` |

El filtro de `clientes` se **propaga por las relaciones**: los pedidos y el detalle de los clientes de otros países también desaparecen. Por eso conviene poner las reglas en las dimensiones.

## Paso 2 — Probar con Ver como

**Modelado → Ver como**:

```captura
archivo: powerbi/b19-ver-como.webp
texto: Elegir el rol a probar (y opcionalmente otro usuario, para reglas dinámicas)
```

Con **Gerente Argentina**, la tarjeta de ventas muestra **2 895 224,93** (las ventas de clientes argentinos) en lugar de 14 878 014,07. Un aviso arriba del lienzo recuerda que estás viendo como un rol; **Detener la vista** vuelve a todo.

## Paso 3 — Reglas dinámicas

Con 20 países, 20 roles es inmanejable. La alternativa es **una** regla que use quién está mirando:

```text
-- en una tabla de asignación: gerentes[email], gerentes[pais]
[pais] = LOOKUPVALUE(gerentes[pais], gerentes[email], USERPRINCIPALNAME())
```

`USERPRINCIPALNAME()` devuelve el correo de quien abre el informe. Se mantiene una tabla `gerentes` (quién ve qué país) y el modelo hace el resto. En **Ver como → Otro usuario** se escribe un correo para probarla.

## Paso 4 — En el servicio

Al publicar, en el modelo semántico → **Seguridad (RLS)**:

```captura
archivo: powerbi/b19-rls-servicio.webp
texto: El rol con su regla - agregar correos o grupos como miembros y probar como rol
```

Asigna **grupos** (por ejemplo, el grupo de gerentes de Argentina) en lugar de personas: cuando alguien entra o sale, se cambia el grupo.

:::cuidado A quién no se le aplica
RLS se aplica a quienes tienen rol **Visor** en el área de trabajo (o acceden por app o vínculo). **Administradores, Miembros y Colaboradores ven todo**, porque pueden editar el modelo. Si un gerente es Miembro del área, ve todos los países.
:::

## Paso 5 — RLS y otras formas de proteger

| Necesitas | Usa |
|---|---|
| Que cada persona vea solo sus filas | **RLS** |
| Ocultar una columna entera (salarios) a algunos | **Seguridad a nivel de objeto (OLS)**, con herramientas externas como Tabular Editor |
| Que nadie vea datos personales | Quitarlos en Power Query o en el origen (proyecto 2) |
| Proteger en el lakehouse para todas las herramientas | Filtros de fila y máscaras en el origen (Databricks Unity Catalog, Snowflake) |

:::errores
- **Probar RLS con un usuario Miembro.** RLS no se aplica a Administradores, Miembros ni Colaboradores; prueba con Ver como y asigna Visor.
- **Crear roles y no asignar miembros en el servicio.** Sin miembros, el rol no filtra a nadie.
- **Reglas con correos escritos a mano.** Una tabla de usuarios con `USERPRINCIPALNAME()` escala mejor.
:::

## ✅ Lo que lograste

- Creaste un rol con una regla y lo probaste con Ver como.
- Sabes escribir una regla dinámica.
- Sabes asignar miembros y a quién no se aplica RLS.

:::ejercicio quiz
¿Dónde se crean las reglas de seguridad por filas?
- [ ] En el servicio
- [x] En Power BI Desktop: Modelado → Administrar roles
- [ ] En Power Query
- [ ] En el servicio, en la configuración del modelo semántico
:::

:::ejercicio quiz
Un gerente con rol Miembro en el área de trabajo ve todos los países aunque está en el rol Gerente Argentina. ¿Por qué?
- [ ] Por un error del servicio
- [x] Porque RLS no se aplica a Miembros, Colaboradores ni Administradores; debería tener rol Visor
- [ ] Porque falta una medida
- [ ] Porque la regla está mal escrita
:::

:::ejercicio quiz
¿Qué devuelve USERPRINCIPALNAME() en una regla?
- [ ] El nombre del informe
- [x] El correo de quien está viendo el informe
- [ ] El país del cliente
- [ ] El área de trabajo donde está publicado el informe
:::
