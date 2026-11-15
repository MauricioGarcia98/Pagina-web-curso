---
titulo: Proyecto 2 (guiado, con pistas) - la cartera de clientes, limpia y modelada
nivel: 2 · Básico-intermedio
duracion: 60
resumen: El área comercial quiere conocer su cartera de clientes - cuántos hay por país y segmento, cuántos no tienen correo para las campañas, y qué pide cada segmento. Los datos personales que no se usan no deben llegar al informe. Lo resuelves en Power Query y en el modelo, con un informe de una página. Cada tarea dice qué hacer; el cómo está en las pistas.
objetivos: Quitar columnas innecesarias y datos personales en Power Query | Crear una columna condicional útil para el negocio | Revisar relaciones y propiedades del modelo | Construir una página con los números que pidió el área | Verificar los totales antes de entregar
prerrequisitos: powerbi-paso-a-paso-el-modelo-relaciones-y-propiedades
autoevaluacion: ¿Sabes quitar columnas en Power Query? | ¿Sabes armar una columna condicional sobre un campo vacío? | ¿Sabes ocultar claves en el modelo? | ¿Sabes cruzar clientes con pedidos en un gráfico?
---

:::escenario El pedido
Mensaje de Andrés, de marketing: *"Vamos a armar campañas por país y segmento. Necesito saber cuántos clientes tenemos en cada país y en cada segmento, cuántos no tienen email (no les podemos escribir) y cuántos pedidos hace cada segmento. Ah, y que en el informe no aparezcan teléfonos ni fechas de nacimiento: no los necesitamos y legal nos lo pidió."*
:::

Usa las cinco tablas de Tienda Andina. Cada tarea dice **qué**; las pistas, **cómo**.

## Tarea 1 — Sacar los datos personales que no se usan

En Power Query, en la consulta `clientes`, quita `telefono` y `fecha_nacimiento`.

<details><summary>💡 Pista</summary>

Inicio → Transformar datos → consulta **clientes** → clic en el encabezado `telefono`, Ctrl + clic en `fecha_nacimiento` → **Inicio → Quitar columnas**. Debe aparecer el paso **Columnas quitadas**.

</details>

## Tarea 2 — ¿Tiene email?

Agrega una columna `contactable` que diga `Sí` si el cliente tiene email y `No` si no.

<details><summary>💡 Pista</summary>

**Agregar columna → Columna condicional** → nombre `contactable` → columna `email`, operador **no está en blanco** → entonces `Sí`, si no `No`. Después **Cerrar y aplicar**.

</details>

## Tarea 3 — El modelo prolijo

En la vista Modelo: comprueba que `pedidos[cliente_id]` se relaciona con `clientes[cliente_id]` (*:1, única), oculta las columnas de ID de `clientes` y `pedidos` y pon **No resumir** en `cliente_id`.

<details><summary>💡 Pista</summary>

**Modelado → Administrar relaciones** para revisar. Clic en cada columna del diagrama → panel Propiedades → **Está oculto**; en `cliente_id`, **Resumir por → No resumir**.

</details>

## Tarea 4 — La página

Arma una página con:

1. Una tarjeta con la cantidad de clientes.
2. Barras de clientes por país.
3. Un gráfico de anillos de clientes por segmento.
4. Una tarjeta con los clientes no contactables (filtro de objeto visual `contactable` = `No`).
5. Columnas de **pedidos** por segmento de cliente.
6. Una segmentación por `contactable`.

<details><summary>💡 Pista</summary>

Recuento de `clientes[cliente_id]` para contar clientes (aunque esté oculto, puedes mostrarlo con el ojo del panel Datos, o contar `nombre`). Para la tarjeta de no contactables: crea la tarjeta, después arrastra `contactable` a **Filtros en este objeto visual** y marca solo `No`. Para pedidos por segmento: `clientes[segmento]` en el eje y Recuento de `pedidos[pedido_id]` en los valores; funciona porque la relación lleva el filtro de clientes a pedidos.

</details>

## ✔ Control

| Control | Esperado |
|---|---|
| Columnas de `clientes` en el panel Datos | Sin `telefono` ni `fecha_nacimiento` |
| Clientes | 2000 |
| Por país (los primeros) | México 387 · Argentina 363 · Colombia 312 · España 300 · Chile 167 · Perú 166 |
| Por segmento | Consumidor 1377 · Pyme 400 · Corporativo 223 |
| No contactables | **89** |
| Pedidos por segmento | Suman 12 000 entre los tres segmentos |
| Segmentación en `No` | La tarjeta de clientes muestra 89 |

Si los pedidos por segmento muestran 12 000 en cada barra, falta la relación o va en la dirección contraria.

## Entrega

Mensaje a Andrés: *"Tenemos 2000 clientes: México, Argentina y Colombia concentran más de la mitad. El 69 % es Consumidor. Hay 89 sin email que no entran en las campañas por correo. Teléfonos y fechas de nacimiento quedaron fuera del modelo."*

## 🖥️ Hazlo también en Power BI real

Power Query es igual en Power BI Desktop, en Excel (Datos → Obtener datos) y en los Dataflows de Fabric: lo que aprendiste sirve en los tres. Quitar los datos personales lo antes posible (en Power Query o, mejor, en la vista del origen) es una buena práctica que vas a ver en cualquier empresa.

:::ejercicio quiz
¿Por qué quitar telefono en Power Query y no solo ocultarlo en el informe?
- [ ] Porque ocultar no existe
- [x] Porque así el dato ni siquiera se carga al modelo: nadie puede verlo ni exportarlo
- [ ] Porque es más rápido de hacer
- [ ] Da lo mismo
:::

:::ejercicio quiz
Los pedidos por segmento muestran 12 000 en cada barra. ¿Qué pasa?
- [ ] Todos los segmentos hacen los mismos pedidos
- [x] El filtro de clientes no llega a pedidos: falta la relación o su dirección está mal
- [ ] Hay que usar otra agregación
- [ ] Es un error de Power BI
:::
