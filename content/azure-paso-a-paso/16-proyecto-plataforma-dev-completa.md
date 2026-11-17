---
titulo: Proyecto 4 (con poca ayuda) - la revisión de la plataforma dev
nivel: 4 · Intermedio-avanzado
duracion: 50
resumen: La plataforma dev de Tienda Andina ya tiene lago, secretos, procesamiento, orquestación y base operativa. Antes de mostrarla al resto de la empresa, haces la revisión que haría un arquitecto - qué hay, quién tiene acceso a qué, si cada acceso es el mínimo y si todo se creó bien - y entregas un informe con los hallazgos. El enunciado dice qué revisar, no cómo.
objetivos: Revisar el contenido de un grupo con varios servicios | Auditar las asignaciones de roles de una cuenta | Detectar permisos de más o de menos | Revisar el historial de despliegues | Redactar hallazgos y recomendaciones
prerrequisitos: azure-paso-a-paso-azure-sql-database
autoevaluacion: ¿Puedes decir quién puede escribir en el lago y por qué? | ¿Puedes explicar cada asignación de rol? | ¿Sabes qué despliegues se hicieron y cuándo? | ¿Sabes qué cambiarías antes de producción?
---

:::escenario El pedido
Lucía: *"El jueves presentamos la plataforma dev a Seguridad. Hazme una revisión: qué tenemos, quién tiene acceso a qué y qué cambiarías antes de pasar a producción. Quiero hallazgos concretos, no generalidades."*
:::

## Lo que tienes que revisar

1. **El inventario**: qué recursos hay en `rg-tiendaandina-dev` y cómo se relacionan.
2. **Los accesos al lago**: cada asignación de rol de `sttiendaandinadev`, y si es la mínima necesaria.
3. **Los accesos a los secretos**: quién puede leer o crear secretos en `kv-tiendaandina-dev`.
4. **El historial**: qué despliegues se hicieron, en qué orden y si alguno falló.
5. **La base**: cómo está su cortafuegos.

## Las evidencias

El grupo y sus recursos:

```captura
archivo: azure/b16-grupo.webp
texto: rg-tiendaandina-dev con storage, key vault, Databricks y Data Factory
```

```captura
archivo: azure/b16-visualizador.webp
texto: El visualizador del grupo con los cuatro recursos
```

Las asignaciones de la cuenta:

```captura
archivo: azure/b16-iam-storage.webp
texto: Las asignaciones de roles de sttiendaandinadev
```

Los despliegues:

```captura
archivo: azure/b16-despliegues.webp
texto: Deployments - cada recurso creado desde el portal, con su estado y duración
```

<details><summary>💡 Pista: ¿por qué la base SQL no aparece en el grupo?</summary>

En la práctica, Azure SQL se muestra en su propia lista (**SQL databases**). En Azure real verías el servidor y la base dentro de `rg-tiendaandina-dev`. Revísala desde **SQL databases**.
</details>

## Tu informe

Arma una tabla como esta, con tus propios hallazgos:

| # | Hallazgo | Riesgo | Recomendación |
|---|---|---|---|
| 1 | … | … | … |

<details><summary>💡 Ejemplo de informe (míralo después de hacer el tuyo)</summary>

| # | Hallazgo | Riesgo | Recomendación |
|---|---|---|---|
| 1 | El grupo `analistas-datos` tiene Storage Blob Data Reader sobre **toda** la cuenta | Los analistas leen también bronze y silver, con datos sin limpiar y posiblemente personales | En Azure real, asignar el rol solo sobre el contenedor `gold` |
| 2 | Tu usuario tiene Storage Blob Data Contributor | Está bien en dev; en prod nadie debería escribir a mano en el lago | En prod, escritura solo para las identidades de ADF y Databricks |
| 3 | `sp-ingesta-ventas` tiene Blob Data Contributor sobre toda la cuenta | Un secreto filtrado permitiría borrar silver y gold | Limitar el rol al contenedor `bronze` |
| 4 | `adf-tiendaandina-dev` escribe con su identidad administrada | Ninguno: es el patrón correcto | Mantener |
| 5 | La cuenta acepta conexiones desde todas las redes y con clave | Cualquiera con la clave entra desde internet | Nivel 5: limitar la red y desactivar el acceso con clave cuando todo use Entra |
| 6 | La base SQL tiene "Allow Azure services" activado | Cualquier servicio de Azure, de cualquier cliente, llega al servidor (aunque necesite identidad) | En prod, private endpoint |
| 7 | Todos los despliegues fueron desde el portal, a mano | No se puede repetir igual en prod | Nivel 6: plantillas |
| 8 | Ningún recurso tiene bloqueo | Un borrado accidental del grupo borra todo | Nivel 5: bloqueo CanNotDelete en prod |

</details>

:::errores
- **Dar acceso de lectura a todo el lago a los analistas.** Solo necesitan gold.
- **Patrones con usuarios personales o claves.** Los procesos usan identidades administradas con roles de datos.
- **No mirar Deployments.** Ahí se ve qué se creó, en qué orden y qué falló.
:::

## ✅ Lista de verificación

- [ ] Tu inventario nombra los 5 servicios y para qué sirve cada uno.
- [ ] Cada asignación de rol de la cuenta está explicada: quién, qué rol, por qué.
- [ ] Tienes al menos tres recomendaciones concretas antes de producción.
- [ ] Revisaste que ningún despliegue esté en estado Failed.

## Lo que aprendiste en el nivel 4

- Azure Databricks: el recurso, el grupo administrado y lo que cuesta.
- Data Factory: el recurso, la identidad administrada y el Studio.
- Azure SQL: servidor, base, cortafuegos y cadenas de conexión.
- Revisar una plataforma como lo haría un arquitecto.

En el nivel 5 corriges los hallazgos: red, claves, protección de datos, bloqueos y monitoreo.

:::ejercicio quiz
Los analistas solo deberían ver datos listos para el negocio. ¿Qué ajuste propones?
- [ ] Quitarles todo acceso
- [x] Asignar el rol de lectura solo sobre el contenedor gold
- [ ] Darles Contributor para que se arreglen solos
- [ ] Copiar gold a otra cuenta pública
:::

:::ejercicio quiz
¿Cuál de estas asignaciones es el patrón correcto?
- [ ] Un usuario con Owner sobre la suscripción para correr pipelines
- [x] La identidad administrada del factory con Storage Blob Data Contributor sobre el lago
- [ ] La clave de la cuenta en el código del pipeline
- [ ] Un grupo de analistas con Contributor
:::

:::ejercicio quiz
¿Dónde ves qué se creó, en qué orden y si falló algo?
- [ ] En Cost Management
- [x] En Deployments del grupo (y en el Activity log)
- [ ] En las etiquetas
- [ ] En el Storage browser
:::

:::ejercicio quiz
¿Por qué "todo se creó a mano desde el portal" es un hallazgo?
- [ ] Porque el portal es inseguro
- [x] Porque no se puede repetir exactamente igual en otro entorno
- [ ] Porque cuesta más
- [ ] Porque el portal no registra lo que se crea
:::
