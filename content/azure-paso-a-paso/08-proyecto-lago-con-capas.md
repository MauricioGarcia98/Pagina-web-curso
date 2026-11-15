---
titulo: Proyecto 2 (semiguiado) - el lago de Tienda Andina listo para recibir datos
nivel: 2 · Básico-intermedio
duracion: 45
resumen: Dejas el data lake de dev listo para que el equipo empiece a cargar datos - las tres capas, los primeros archivos de cada fuente en bronze con la convención de carpetas, etiquetas completas y un presupuesto - y lo verificas sin ayuda paso a paso. Esta vez el enunciado dice qué lograr; las pistas están escondidas por si las necesitas.
objetivos: Aplicar la convención de capas y carpetas sin guía | Subir archivos de varias fuentes a bronze | Dejar etiquetas completas en el grupo y en la cuenta | Verificar con el portal que todo cumple la convención
prerrequisitos: azure-paso-a-paso-etiquetas-actividad-y-costos
autoevaluacion: ¿Tu bronze tiene una carpeta por fuente? | ¿Tus contenedores siguen la convención de nombres? | ¿El grupo y la cuenta tienen las tres etiquetas? | ¿Hay un presupuesto con alertas?
---

:::escenario El pedido
Lucía: *"El lunes empieza a llegar el catálogo de productos además de pedidos y clientes. Deja el lago listo: las tres capas, una carpeta por fuente en bronze, todo etiquetado y el presupuesto activo. Avísame cuando esté y lo reviso."*
:::

## Lo que tienes que lograr

1. La cuenta `sttiendaandinadev` con los contenedores `bronze`, `silver` y `gold`, todos privados.
2. En `bronze`, una carpeta por fuente: `pedidos/2026/11/`, `clientes/` y `productos/`.
3. Un archivo `productos.csv` en `bronze/productos/`.
4. El grupo y la cuenta con las etiquetas `proyecto`, `entorno` y `owner`.
5. Un presupuesto mensual de USD 20 con alertas al 50, 80 y 100 %.

Usa este `productos.csv`:

```text
producto_id,nombre,categoria,precio
1,Café de altura 500 g,Almacén,12.5
2,Yerba mate 1 kg,Almacén,6.9
```

<details><summary>💡 Pista 1: ¿cómo subo a una carpeta que no existe?</summary>

En **Upload**, escribe la carpeta en **Upload to folder** (`productos`). La carpeta se crea con el primer archivo.
</details>

<details><summary>💡 Pista 2: ¿dónde agrego etiquetas al grupo?</summary>

En el grupo `rg-tiendaandina-dev`, menú **Tags**. Escribe en la fila vacía y pulsa **Apply**.
</details>

## Cómo verificar

Abre `bronze`:

```captura
archivo: azure/b08-bronze.webp
texto: bronze con una carpeta por fuente - pedidos por fecha, clientes y productos
```

Revisa las etiquetas del grupo:

```captura
archivo: azure/b08-etiquetas-grupo.webp
texto: Las tres etiquetas del grupo
```

## ✅ Lista de verificación

- [ ] Tres contenedores, todos con acceso **Private**.
- [ ] En `bronze`: `pedidos/2026/11/pedidos.csv`, `clientes/clientes.csv` y `productos/productos.csv`.
- [ ] El grupo tiene `proyecto`, `entorno` y `owner`.
- [ ] La cuenta tiene `proyecto`, `entorno` y `owner`.
- [ ] El presupuesto `presupuesto-datos-dev` existe con USD 20 y alertas al 50, 80 y 100 %.
- [ ] En el **Activity log** aparecen tus subidas (*Upload blob*) y la creación de los contenedores.

<details><summary>💡 Solución comentada</summary>

Si seguiste las lecciones 5 a 7, ya tenías los contenedores, pedidos, clientes y el presupuesto. Lo nuevo es `productos/productos.csv` (Upload con la carpeta `productos`) y revisar que las etiquetas estén **en los dos niveles**: las del grupo no se copian a la cuenta. Un error común es crear el contenedor `productos` en lugar de la carpeta: las fuentes van como **carpetas dentro de bronze**, no como contenedores nuevos, para que las capas sigan siendo tres.
</details>

## Lo que aprendiste en el nivel 2

- Contenedores, blobs y carpetas, y la convención de capas del lago.
- ADLS Gen2, sus endpoints y la dirección `abfss://`.
- La diferencia entre la clave de la cuenta y los roles de datos.
- Etiquetas, registro de actividad, costos y presupuestos.

En el nivel 3 haces lo mismo desde la terminal y aprendes a dar permisos sin claves.

:::ejercicio quiz
Llega una nueva fuente: el inventario de las tiendas. ¿Dónde va?
- [ ] En un contenedor nuevo llamado `inventario`
- [x] En una carpeta `inventario/` dentro del contenedor `bronze`
- [ ] En `gold`, porque es importante
- [ ] En otra cuenta de almacenamiento
:::

:::ejercicio quiz
¿Qué acceso anónimo deberían tener los contenedores del lago?
- [x] Private: nadie entra sin identificarse
- [ ] Blob: cualquiera puede leer un archivo si conoce la dirección
- [ ] Container: cualquiera puede listar y leer
- [ ] Depende del día
:::

:::ejercicio quiz
¿Cómo confirmas que subiste los archivos tú y a qué hora?
- [ ] Mirando el tamaño de los archivos
- [x] En el Activity log, con las operaciones Upload blob
- [ ] En Cost Management
- [ ] No queda registro
:::

:::ejercicio quiz
¿Por qué las capas del lago se mantienen como tres contenedores fijos?
- [ ] Porque Azure no permite más de tres
- [x] Para que los permisos y las reglas se apliquen por capa y la estructura sea predecible
- [ ] Porque los contenedores son caros
- [ ] Por costumbre, no tiene importancia
:::
