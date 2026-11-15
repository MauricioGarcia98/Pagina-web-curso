---
titulo: Proyecto 5 (requisitos y rúbrica) - el informe en producción, seguro y actualizado
nivel: 5 · Avanzado
duracion: 120
resumen: El informe comercial pasa a producción - publicado en un área de trabajo del equipo, con actualización diaria, credenciales de servicio, seguridad por país con regla dinámica, una app para los vendedores y un documento de operación para que otro pueda mantenerlo. Requisitos, control y rúbrica.
objetivos: Publicar en un área de trabajo de equipo con roles adecuados | Configurar actualización y credenciales | Implementar RLS dinámica con una tabla de asignación | Distribuir con una app | Documentar la operación del informe
prerrequisitos: powerbi-paso-a-paso-seguridad-por-filas
autoevaluacion: ¿Sabes armar la tabla de asignación para RLS dinámica? | ¿Sabes qué rol darle a cada persona? | ¿Sabes qué va en un documento de operación? | ¿Sabes probar la seguridad antes de entregar?
---

:::escenario El pedido
Rodrigo: *"El informe gustó. Ahora lo quiero en serio: que se actualice solo todas las mañanas, que cada gerente de país vea solo su país (México, Argentina y Colombia), que los vendedores lo vean desde una app y que, si vos no estás, alguien sepa qué hacer cuando falle."*
:::

## Requisitos

1. **Tabla de asignación** `gerentes` (escribe los datos en Desktop: Inicio → Escribir datos) con `email` y `pais`: tres gerentes ficticios (`gerente.mx@empresa.com` → México, `gerente.ar@empresa.com` → Argentina, `gerente.co@empresa.com` → Colombia). Sin relación con el resto del modelo, oculta para los usuarios.
2. **Rol dinámico** `Gerente de país` sobre `clientes` con `LOOKUPVALUE` y `USERPRINCIPALNAME()`; probado con **Ver como → Otro usuario** para los tres correos.
3. **Publicación** en un área de trabajo de equipo (créala en el servicio: Áreas de trabajo → Nueva), no en Mi área de trabajo.
4. **Roles del área**: tú Administrador; un compañero (ficticio) Miembro; los gerentes, **Visor** (para que RLS se les aplique).
5. **Seguridad en el servicio**: los tres correos como miembros del rol.
6. **Actualización** diaria a una hora posterior a la carga de datos, con credenciales configuradas.
7. **App** con el informe, para los vendedores.
8. **Documento de operación** (una página de texto en el propio informe, oculta, o un archivo aparte): qué hace el informe, de dónde salen los datos, a qué hora se actualiza, quién es el dueño, cómo dar acceso a alguien nuevo y qué revisar si falla la actualización.

## ✔ Control

| Control | Esperado |
|---|---|
| Ver como `gerente.ar@empresa.com` | Ventas **2 895 224,93**; solo Argentina en el mapa |
| Ver como `gerente.mx@empresa.com` | Ventas **2 621 721,71** |
| Ver como `gerente.co@empresa.com` | Ventas **2 269 767,09** |
| Ver como un correo que no está en `gerentes` | Informe vacío (la regla no encuentra país) |
| Área de trabajo | Gerentes con rol Visor |
| Actualización programada | Activada, con hora y zona horaria del negocio |
| App | Publicada con el informe |

## Rúbrica

| Criterio | Peso | Insuficiente | Competente | Sobresaliente |
|---|---|---|---|---|
| Seguridad | 30 % | Roles estáticos o sin probar | Rol dinámico probado con los tres correos y Visores en el área | Probado también un correo sin asignación y documentado el comportamiento |
| Publicación y distribución | 20 % | En Mi área de trabajo | Área de equipo, roles correctos y app | Explica en el documento por qué app y no compartir |
| Operación | 25 % | Sin actualización | Actualización y credenciales configuradas | Credenciales de servicio, hora justificada y aviso por correo al fallar |
| Documentación | 25 % | Sin documento | Documento con todos los puntos | Alguien nuevo podría operar el informe solo con el documento |

**Aprobado**: competente o más en todos los criterios.

## Entrega

Mensaje a Rodrigo: *"El informe está en producción en el área 'Comercial': se actualiza todos los días a las 7:00, cada gerente ve solo su país (lo probé con los tres) y los vendedores lo tienen en la app 'Ventas'. Dejé un documento de operación con qué hacer si falla la actualización y cómo dar acceso a alguien nuevo."*

:::ejercicio quiz
¿Por qué la tabla gerentes no se relaciona con el resto del modelo?
- [ ] Porque no se puede
- [x] Porque solo la consulta la regla RLS con LOOKUPVALUE; relacionarla no hace falta y podría filtrar donde no corresponde
- [ ] Porque es muy grande
- [ ] Por error
:::

:::ejercicio quiz
¿Qué pasa si un gerente nuevo abre el informe y todavía no está en la tabla gerentes?
- [ ] Ve todo
- [x] No ve datos, porque la regla no encuentra su país
- [ ] Ve el país del gerente anterior
- [ ] El informe falla para todos
:::
