---
titulo: Proyecto 4 (con poca ayuda) - del lakehouse al informe de ventas
nivel: 4 · Intermedio-avanzado
duracion: 45
resumen: Comercial quiere un tablero con pedidos por canal y avance de metas. Dejas lista toda la cadena - tablas en el lakehouse, metas y vista en el warehouse, modelo semántico con sus medidas - y preparas el paso al informe. Solo se dice qué lograr; la solución comentada está al final.
objetivos: Integrar lakehouse, warehouse y modelo semántico | Definir las medidas que pide el negocio | Preparar los datos para el informe | Leer el linaje de punta a punta
prerrequisitos: fabric-paso-a-paso-modelo-semantico
autoevaluacion: ¿El modelo tiene las medidas que pidió comercial? | ¿La vista de avance responde? | ¿El linaje muestra la cadena completa? | ¿Sabes cómo seguiría el informe?
---

:::escenario El pedido
Comercial: *"Queremos un tablero con la cantidad de pedidos por canal y el avance de cada tienda contra su meta. Que los números salgan siempre de la misma definición."*
:::

## Lo que tienes que lograr

1. El modelo semántico sobre `lh_ventas` con la medida **Pedidos**.
2. La vista `v_avance_metas` en `wh_ventas`.
3. El linaje del workspace con la cadena completa.
4. Un plan de tres líneas para el informe.

## Cómo se ve terminado

```captura
archivo: fabric/b16-informe.webp
texto: El modelo con New report (1) y Exportar CSV (2), los caminos para llegar al informe
```

```captura
archivo: fabric/b16-linaje.webp
texto: El linaje - lakehouses, notebook, pipeline, warehouse y el modelo semántico que lee lh_ventas
```

## ✅ Lista de verificación

- [ ] El modelo tiene la medida `Pedidos = COUNTROWS(pedidos)`.
- [ ] `SELECT * FROM dbo.v_avance_metas` devuelve las cuatro tiendas con su porcentaje.
- [ ] El linaje muestra `lh_ventas_model1 → lh_ventas`.
- [ ] Tienes el plan del informe.

<details><summary>💡 Solución comentada</summary>

La medida y la vista son las de las lecciones 14 y 15. El plan del informe puede ser:

1. **New report** sobre el modelo (en Fabric real abre el editor de informes en el navegador). En la práctica, **Exportar CSV** y cargarlo en el [Power BI de práctica](#/powerbi).
2. Página 1: tarjeta con **Pedidos**, gráfico de columnas por **canal**.
3. Página 2: tabla con `v_avance_metas` y formato condicional en `pct_avance`.

**Decisión de diseño a defender:** la medida vive en el **modelo** y el cálculo del avance en la **vista**. Así comercial, finanzas y cualquier otro informe usan la misma definición. Para que el modelo también lea el avance, en Fabric real se crea un modelo sobre el warehouse (que incluye la vista) o se agrega la tabla de metas al lakehouse.
</details>

## Lo que aprendiste en el nivel 4

- Warehouse con T-SQL y consultas entre ítems.
- Vistas como capa para el negocio.
- Modelo semántico, Direct Lake y medidas.

En el nivel 5: operar el workspace - monitorear, catalogar y versionar con Git.

:::ejercicio quiz
¿Dónde conviene definir el cálculo del avance contra la meta?
- [ ] En cada gráfico
- [x] En una vista (o una medida) que usen todos los informes
- [ ] En un correo a comercial
- [ ] En el pipeline
:::

:::ejercicio quiz
¿Qué ítem lee el modelo semántico creado desde el lakehouse?
- [x] lh_ventas
- [ ] wh_ventas
- [ ] El pipeline
- [ ] Monitor
:::

:::ejercicio quiz
¿Qué hace New report en Fabric real?
- [ ] Descarga un archivo
- [x] Abre el editor de informes de Power BI en el navegador sobre ese modelo
- [ ] Borra el modelo
- [ ] Crea un lakehouse
:::

:::ejercicio quiz
¿Por qué se pide que "los números salgan de la misma definición"?
- [ ] Por estética
- [x] Para que dos informes no muestren valores distintos para lo mismo
- [ ] Porque Fabric lo exige
- [ ] Para que cargue más rápido
:::
