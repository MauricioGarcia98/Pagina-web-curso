---
titulo: Proyecto 2 (semiguiado) - el lakehouse de ventas, ordenado
nivel: 2 · Básico-intermedio
duracion: 40
resumen: Antes de construir encima, el equipo quiere el lakehouse ordenado - los crudos en Files por carpetas, las tablas limpias en Tables, una consulta de control desde el endpoint y el lakehouse de reportes con su acceso directo. Lo armas y lo verificas con el enunciado y pistas escondidas.
objetivos: Organizar Files por carpetas | Tener las tablas principales en Tables | Verificar datos con una consulta SQL | Revisar el contenido del workspace
prerrequisitos: fabric-paso-a-paso-accesos-directos
autoevaluacion: ¿Los crudos están en carpetas de Files? | ¿Las tablas responden desde el endpoint? | ¿lh_reportes no copia datos? | ¿Sabes cuántos pedidos hay por canal?
---

:::escenario El pedido
Lucía: *"Dejemos `lh_ventas` como la base de todo: crudos en `Files/raw`, tablas en Tables, y `lh_reportes` leyendo pedidos con un acceso directo. Mandame la cantidad de pedidos por canal como control."*
:::

## Lo que tienes que lograr

1. En `lh_ventas`: los crudos en `Files/raw`, y en Tables `ventas_tiendas`, `clientes`, `productos`, `pedidos` y `detalle_pedidos`.
2. En `lh_reportes`: el acceso directo `pedidos`.
3. La consulta de control desde el endpoint SQL.

<details><summary>💡 Pista: ¿cómo creo una carpeta en Files?</summary>

En el menú **…** de Files, **New subfolder**; o sube un archivo estando dentro de la carpeta. Los datos de ejemplo ya crean `Files/raw`.
</details>

## Cómo se ve terminado

```captura
archivo: fabric/b08-files-raw.webp
texto: Las tablas en Tables (1) y el crudo en Files/raw (2)
```

```captura
archivo: fabric/b08-ws-items.webp
texto: El workspace con los dos lakehouses, cada uno con su SQL analytics endpoint
```

:::errores
- **Mezclar crudos y tablas limpias.** Los crudos van en Files por carpetas; lo limpio, en Tables. Si se mezclan, nadie sabe qué usar.
- **Verificar a ojo.** Una consulta de control desde el endpoint (conteos, nulos) deja la comprobación escrita y repetible.
- **Copiar en vez de crear un acceso directo.** El lakehouse de reportes debe leer los mismos datos, no una copia que se desactualiza.
:::

## ✅ Lista de verificación

- [ ] `Files/raw` tiene los archivos crudos.
- [ ] Las cinco tablas están en Tables/dbo.
- [ ] `lh_reportes` tiene el acceso directo `pedidos` (con ícono de enlace).
- [ ] La consulta de control da: web 5400, app 2973, tienda 2645, telefono 982.

<details><summary>💡 Solución comentada</summary>

La consulta de control es la de la lección 6, desde el endpoint de `lh_ventas` (o desde el de `lh_reportes`, sobre el acceso directo: da lo mismo, porque son los mismos datos). Cada lakehouse trae su **SQL analytics endpoint**, que aparece debajo en la lista del workspace. El orden **Files/raw → Tables** es la versión de Fabric de las capas bronze y silver: en proyectos grandes se usan lakehouses separados (`lh_bronze`, `lh_silver`, `lh_gold`) o esquemas distintos.
</details>

## Lo que aprendiste en el nivel 2

- Datos de ejemplo, Delta y su mantenimiento.
- El SQL analytics endpoint y por qué es de solo lectura.
- Accesos directos para no copiar datos.

En el nivel 3 transformas con notebooks y automatizas con pipelines.

:::ejercicio quiz
¿Qué zona del lakehouse equivale a la capa bronze?
- [x] Files (los crudos tal como llegan)
- [ ] Tables
- [ ] El endpoint SQL
- [ ] El modelo semántico
:::

:::ejercicio quiz
¿Da lo mismo contar pedidos desde lh_ventas o desde el acceso directo de lh_reportes?
- [x] Sí, son los mismos datos
- [ ] No, el acceso directo tiene menos filas
- [ ] No, el acceso directo está atrasado un día
- [ ] No, el acceso directo solo muestra las tablas, no las filas
:::

:::ejercicio quiz
¿Qué aparece debajo de cada lakehouse en la lista del workspace?
- [ ] Su informe
- [x] Su SQL analytics endpoint
- [ ] Su pipeline
- [ ] Su capacidad
:::

:::ejercicio quiz
¿Cómo se organizan las capas en proyectos grandes de Fabric?
- [ ] Todo en un solo lakehouse sin carpetas
- [x] Con lakehouses o esquemas separados para bronze, silver y gold
- [ ] En workspaces Pro
- [ ] Un workspace distinto por cada tabla
:::
