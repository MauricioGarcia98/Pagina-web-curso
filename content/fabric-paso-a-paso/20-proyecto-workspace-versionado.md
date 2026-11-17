---
titulo: Proyecto 5 (solo el objetivo) - el workspace versionado y operado
nivel: 5 · Avanzado
duracion: 50
resumen: El equipo quiere dejar de trabajar a ciegas. Dejas el workspace versionado en GitHub con un primer commit con mensaje claro, verificas el repo, y documentas cómo se revisa la operación cada día y cómo se vuelve atrás un cambio. Solo se da el objetivo y el criterio de aceptación.
objetivos: Hacer el primer commit del workspace | Verificar el contenido del repositorio | Documentar la rutina de operación | Planear el paso a varios entornos
prerrequisitos: fabric-paso-a-paso-git-en-fabric
autoevaluacion: ¿El repo tiene la carpeta fabric con los ítems? | ¿El commit tiene un mensaje que explica qué incluye? | ¿Sabes cómo volver atrás un cambio? | ¿Sabes cómo se separarían desarrollo y producción?
---

:::escenario El objetivo
Lucía: *"Quiero el workspace en Git, una rutina diaria de revisión escrita, y saber qué hacemos cuando alguien rompe algo."*
:::

## Criterio de aceptación

- El repositorio `fabric-tienda-andina` tiene la carpeta `fabric` con los seis ítems.
- El commit dice qué incluye.
- Hay un documento corto (en el README del repo o en una nota) con la rutina de Monitor y el procedimiento para revertir.
- Hay una propuesta de cómo separar desarrollo y producción.

## Cómo se ve terminado

```captura
archivo: fabric/b20-repo.webp
texto: El repositorio con el commit "Primera versión: lakehouse, notebook, pipeline, warehouse y modelo" y la carpeta fabric
```

<details><summary>💡 Solución comentada</summary>

**Commit:** en Source control, mensaje `Primera versión: lakehouse, notebook, pipeline, warehouse y modelo` y **Commit**. Un buen mensaje dice *qué* y, si hace falta, *por qué*.

**Rutina diaria (lección 17):** Failed primero, después Duration, después que existan las corridas programadas.

**Volver atrás un cambio:**
1. En GitHub, revertir el commit que rompió (`git revert <sha>` o el botón Revert del PR).
2. En Fabric, **Source control → Updates → Update all**: el workspace toma la versión anterior.
3. Volver a ejecutar el pipeline para regenerar las tablas.

**Desarrollo y producción:** dos workspaces, `Tienda Andina - Datos (dev)` conectado a una rama `dev`, y `Tienda Andina - Datos` (prod) sin edición directa. Se pasa de uno a otro con un **pull request** a `main` o con **Deployment pipelines** de Fabric, que copian los ítems entre etapas (Development → Test → Production) y permiten cambiar conexiones por etapa.

**Decisión a defender:** nadie edita producción a mano; todo cambio pasa por Git y por una revisión.
</details>

:::errores
- **Commits con mensajes como "cambios".** Dentro de un mes nadie sabe qué se cambió ni por qué.
- **Editar producción a mano.** Los cambios quedan sin revisión ni historial; pasan por dev, Git y el despliegue.
- **No probar la vuelta atrás.** Un procedimiento de reversión que nunca se probó suele fallar el día que hace falta.
:::

## Lo que aprendiste en el nivel 5

- Monitor y una rutina de operación.
- OneLake catalog y las rutas de los datos.
- Git en Fabric y cómo volver atrás.

En el nivel 6: licencias, seguridad, costos y el paso a Fabric real.

:::ejercicio quiz
Alguien rompió el notebook ayer. ¿Cuál es el procedimiento?
- [ ] Reescribirlo de memoria
- [x] Revertir el commit en GitHub y actualizar el workspace desde Updates
- [ ] Borrar el workspace
- [ ] Restaurar el workspace desde la papelera de OneLake
:::

:::ejercicio quiz
¿Qué copian los Deployment pipelines de Fabric?
- [ ] Los datos de las tablas a otro país
- [x] Los ítems entre etapas: desarrollo, prueba y producción
- [ ] Los correos del equipo
- [ ] Las filas nuevas de las tablas de desarrollo a producción
:::

:::ejercicio quiz
¿Por qué no conviene editar producción a mano?
- [ ] Porque Fabric no lo permite nunca
- [x] Porque los cambios quedan sin revisión ni historial y es fácil romper algo
- [ ] Porque cuesta más
- [ ] Porque Fabric cobra el doble en producción
:::

:::ejercicio quiz
¿Qué debe decir un buen mensaje de commit?
- [ ] "cambios"
- [x] Qué incluye el cambio y, si hace falta, por qué
- [ ] La fecha
- [ ] El nombre del autor
:::
