---
titulo: Accesos directos (shortcuts) - usar datos sin copiarlos
nivel: 2 · Básico-intermedio
duracion: 30
resumen: Un acceso directo hace que una tabla de otro lakehouse (o de otro almacenamiento) aparezca en el tuyo sin copiarla. Creas un segundo lakehouse para reportes, le agregas un acceso directo a los pedidos del primero y ves que se lee igual que una tabla propia, siempre actualizada.
objetivos: Crear un acceso directo a una tabla de otro lakehouse | Distinguir una tabla propia de un acceso directo | Explicar las ventajas de no copiar | Conocer los orígenes externos de un acceso directo
prerrequisitos: fabric-paso-a-paso-sql-analytics-endpoint
autoevaluacion: ¿Sabes qué pasa en el acceso directo si cambia el origen? | ¿Sabes qué orígenes admite? | ¿Sabes cómo lo distingues en el explorador? | ¿Sabes por qué conviene no copiar?
---

:::escenario El pedido
Lucía: *"El equipo de reportes quiere su propio lakehouse, pero no quiero dos copias de los pedidos que se desincronicen."*
:::

:::analogia Un acceso directo del escritorio
Un acceso directo de Fabric funciona como el de tu escritorio: el archivo no se mueve ni se copia, solo aparece en otro lugar. Si el original cambia, lo ves al instante; si no tienes permiso sobre el original, el acceso no te deja entrar.
:::

## Paso 1 — Un segundo lakehouse

En el workspace, **New item → Lakehouse**, `lh_reportes`. En su página de inicio, **New shortcut**:

```captura
archivo: fabric/b07-atajo.webp
texto: New shortcut - la tabla de origen (1) y el nombre del acceso directo (2)
```

Elige `Tienda Andina - Datos / lh_ventas / pedidos` y **Create**.

## Paso 2 — Usarlo

```captura
archivo: fabric/b07-atajo-tabla.webp
texto: El acceso directo con su ícono de enlace (1) y el origen al que apunta (2)
```

Se lee igual que una tabla propia (desde Spark, el endpoint SQL o Power BI), pero **los datos siguen en `lh_ventas`**: si alguien carga pedidos nuevos allá, aparecen aquí sin hacer nada.

| | Copiar | Acceso directo |
|---|---|---|
| Almacenamiento | Doble | Una sola vez |
| Actualización | Hay que volver a copiar | Inmediata |
| Riesgo | Dos versiones distintas de "la verdad" | Ninguno de ese tipo |

## Paso 3 — Orígenes de un acceso directo

En el Fabric real, un acceso directo puede apuntar a:

- **OneLake**: otro lakehouse, warehouse o base KQL de cualquier workspace.
- **Azure Data Lake Storage Gen2** y **Azure Blob Storage**.
- **Amazon S3** (y almacenamientos compatibles con S3), **Google Cloud Storage** y **Dataverse**.

Así, una empresa con datos en ADLS o en S3 puede usarlos en Fabric **sin migrarlos**.

:::nota Permisos
Quien lee un acceso directo necesita permiso sobre el **origen**. Un acceso directo no saltea la seguridad: si no puedes leer `lh_ventas`, tampoco puedes leer el acceso directo a sus tablas.
:::

:::errores
- **Copiar tablas entre lakehouses "para tenerlas a mano".** Cada copia se desactualiza; un acceso directo muestra siempre la versión actual.
- **Dar permiso solo sobre el acceso directo.** Hace falta permiso sobre el origen; si no, el acceso directo no muestra nada.
- **Borrar el origen.** El acceso directo queda roto; revisa el linaje antes de borrar.
:::

## ✅ Lo que lograste

- Creaste un acceso directo a una tabla de otro lakehouse.
- Sabes cuándo conviene en lugar de copiar y qué orígenes admite.

:::ejercicio quiz
Se cargan pedidos nuevos en lh_ventas. ¿Qué ve el acceso directo de lh_reportes?
- [x] Los pedidos nuevos, sin hacer nada
- [ ] Nada hasta copiar otra vez
- [ ] Solo los nuevos que se cargaron con un pipeline
- [ ] Los nuevos, después del refresco nocturno
:::

:::ejercicio quiz
¿Cuál de estos orígenes NO es posible para un acceso directo en Fabric real?
- [ ] ADLS Gen2
- [ ] Amazon S3
- [ ] Otro lakehouse
- [x] Una carpeta de tu computadora personal
:::

:::ejercicio quiz
¿Qué ventaja principal tiene un acceso directo frente a copiar?
- [ ] Es más rápido de escribir
- [x] Una sola copia de los datos, siempre actualizada
- [ ] No necesita permisos
- [ ] Convierte los datos a CSV para que los lea Excel
:::

:::ejercicio quiz
No tienes permiso sobre lh_ventas. ¿Puedes leer el acceso directo a sus tablas?
- [ ] Sí
- [x] No, hace falta permiso sobre el origen
- [ ] Solo con SQL
- [ ] Sí, porque el acceso directo está en tu lakehouse
:::
