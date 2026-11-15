---
titulo: Publicar y compartir - el servicio de Power BI, áreas de trabajo, apps y permisos
nivel: 5 · Avanzado
duracion: 50
resumen: Un informe que solo existe en tu computadora no sirve al negocio. Publicar desde Desktop, qué se sube (modelo semántico e informe), el servicio de Power BI - áreas de trabajo y sus roles, el informe en el navegador, compartir con un vínculo, apps para muchas personas - y cuándo usar cada forma de distribución.
objetivos: Publicar un informe en un área de trabajo | Distinguir modelo semántico e informe en el servicio | Elegir entre compartir, rol en el área de trabajo y app | Conocer los roles del área de trabajo | Recorrer el servicio
prerrequisitos: powerbi-paso-a-paso-proyecto-informe-interactivo
autoevaluacion: ¿Sabes qué dos elementos se crean al publicar? | ¿Sabes qué rol darle a alguien que solo consulta? | ¿Sabes cuándo conviene una app? | ¿Sabes qué es Mi área de trabajo?
---

:::analogia En palabras simples
Publicar es pasar el plato de la cocina al comedor. El servicio de Power BI es el restaurante: las **áreas de trabajo** son las cocinas de cada equipo, los **roles** dicen quién puede cocinar y quién solo come, y las **apps** son el menú del día que se entrega a cientos de comensales.
:::

## Paso 1 — Publicar

**Inicio → Publicar**:

```captura
archivo: powerbi/b17-publicar.webp
texto: El nombre del informe (1), el área de trabajo de destino (2) y Seleccionar (3)
```

```captura
archivo: powerbi/b17-publicado.webp
texto: Publicado - el vínculo abre el informe en el servicio
```

Al publicar se suben **dos elementos**: el **modelo semántico** (tablas, relaciones, medidas, roles) y el **informe** (las páginas) que lo usa. Un mismo modelo puede alimentar muchos informes.

## Paso 2 — El informe en el servicio

```captura
archivo: powerbi/b17-informe-servicio.webp
texto: El informe en el navegador - Compartir, Modelo semántico, Editar en Desktop y Ver como
```

Quien lo abre en el navegador puede filtrar, usar segmentaciones, Obtener detalles y marcadores, pero no cambiar el diseño (salvo que tenga permiso de edición).

## Paso 3 — Áreas de trabajo y roles

```captura
archivo: powerbi/b17-areas.webp
texto: Las áreas de trabajo - Mi área de trabajo (personal) y las de cada equipo
```

```captura
archivo: powerbi/b17-area-trabajo.webp
texto: Dentro de un área de trabajo - el modelo semántico y el informe publicados
```

| Rol | Puede |
|---|---|
| **Administrador** | Todo: miembros, configuración, borrar el área |
| **Miembro** | Publicar, editar, compartir y gestionar contenido |
| **Colaborador** | Publicar y editar contenido, sin compartir ni gestionar el área |
| **Visor** | Solo ver e interactuar (y es el único al que se le aplica la seguridad por filas) |

**Mi área de trabajo** es personal: sirve para pruebas, no para compartir con el equipo.

## Paso 4 — Tres formas de distribuir

**Compartir** en el informe:

```captura
archivo: powerbi/b17-compartir.webp
texto: Enviar vínculo - para quién funciona, si pueden volver a compartir y el permiso de compilación
```

| Forma | Para | Ventaja |
|---|---|---|
| **Compartir** (vínculo) | Pocas personas, puntualmente | Rápido |
| **Rol en el área de trabajo** | El equipo que construye | Trabajan juntos sobre el contenido |
| **App** | Muchas personas que consumen | Un paquete ordenado de informes con navegación; se actualiza cuando el equipo la republica |

```captura
archivo: powerbi/b17-apps.webp
texto: Apps - el contenido que publicaron las áreas de trabajo para consumir
```

:::nota Licencias
En Power BI real, compartir y ver contenido de otros requiere licencia **Pro** o **Premium por usuario** para cada persona, salvo que el área de trabajo esté en una capacidad (Premium o Fabric F64 o superior), donde los lectores no necesitan licencia propia. Es una conversación que tu empresa ya tuvo: pregunta cuál usan.
:::

## ✅ Lo que lograste

- Publicaste un informe y lo abriste en el servicio.
- Conoces las áreas de trabajo y sus roles.
- Sabes cuándo compartir, dar un rol o armar una app.

:::ejercicio quiz
¿Qué elementos se crean en el área de trabajo al publicar?
- [ ] Solo el informe
- [x] El modelo semántico y el informe
- [ ] Un archivo .pbix
- [ ] Un panel
:::

:::ejercicio quiz
200 vendedores tienen que consultar tres informes. ¿Qué conviene?
- [ ] Compartir cada informe con cada persona
- [ ] Darles rol de Miembro
- [x] Publicar una app con los tres informes
- [ ] Mandarles el .pbix
:::

:::ejercicio quiz
¿Qué rol le das a alguien que solo consulta los informes?
- [ ] Administrador
- [ ] Miembro
- [ ] Colaborador
- [x] Visor
:::
