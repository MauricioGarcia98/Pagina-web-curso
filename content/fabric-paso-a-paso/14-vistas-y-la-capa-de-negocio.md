---
titulo: Vistas - la capa que consume el negocio
nivel: 4 · Intermedio-avanzado
duracion: 30
resumen: Una vista guarda una consulta con nombre para que el negocio y Power BI la usen sin repetir la lógica. Creas v_avance_metas con el porcentaje de avance de cada tienda, la consultas, la ves en el explorador y conoces por qué las vistas son la forma de exponer datos limpios y estables.
objetivos: Crear una vista con CREATE VIEW | Consultar una vista como una tabla | Explicar para qué sirve una capa de vistas | Saber dónde se pueden crear vistas en Fabric
prerrequisitos: fabric-paso-a-paso-warehouse
autoevaluacion: ¿Sabes qué guarda una vista? | ¿Sabes si una vista copia datos? | ¿Sabes por qué conviene exponer vistas y no tablas? | ¿Sabes dónde aparecen las vistas?
---

## Paso 1 — Crear la vista

En `wh_ventas`:

```sql norun
CREATE VIEW dbo.v_avance_metas AS
SELECT m.tienda, m.meta_unidades, u.unidades,
       ROUND(100.0 * u.unidades / m.meta_unidades, 1) AS pct_avance
FROM dbo.metas_tienda AS m
JOIN (SELECT tienda, SUM(cantidad) AS unidades
      FROM lh_ventas.dbo.ventas_tiendas GROUP BY tienda) AS u
  ON u.tienda = m.tienda;
```

```captura
archivo: fabric/b14-create-view.webp
texto: El CREATE VIEW (1) y la confirmación (2)
```

## Paso 2 — Consultarla

```sql norun
SELECT * FROM dbo.v_avance_metas ORDER BY pct_avance DESC;
```

```captura
archivo: fabric/b14-vista.webp
texto: La vista en Views del explorador (1) y su resultado (2) - Santiago Providencia 48 %, CDMX Roma 30 %, Bogotá Norte 17,1 %, Lima Centro 7,5 %
```

Una vista **no copia datos**: cada vez que se consulta, ejecuta su SELECT sobre los datos actuales. Si mañana se cargan más ventas, el avance se actualiza solo.

## Paso 3 — Por qué una capa de vistas

| Exponer tablas | Exponer vistas |
|---|---|
| Cada informe repite la fórmula del avance | La fórmula vive en un solo lugar |
| Si cambias una columna, se rompen los informes | Cambias la tabla y ajustas la vista; los informes no se enteran |
| El negocio ve columnas técnicas | Solo ve lo que necesita, con nombres claros |

:::tip Dónde se crean vistas en Fabric
En el **warehouse** y en el **SQL analytics endpoint** de un lakehouse (aunque el endpoint no escriba tablas, sí admite vistas). Power BI y cualquier cliente SQL las consultan como tablas.
:::

## ✅ Lo que lograste

- Creaste y consultaste una vista con el avance de metas.
- Sabes por qué conviene exponer vistas al negocio.

:::ejercicio quiz
¿Una vista copia los datos?
- [ ] Sí, al crearla
- [x] No, ejecuta su consulta sobre los datos actuales cada vez
- [ ] Solo los lunes
- [ ] Solo si es grande
:::

:::ejercicio quiz
¿Por qué conviene que Power BI lea una vista y no las tablas directamente?
- [ ] Porque es más lindo
- [x] Porque la lógica vive en un lugar y los cambios de las tablas no rompen los informes
- [ ] Porque las tablas no se pueden leer
- [ ] Porque cuesta menos siempre
:::

:::ejercicio quiz
¿Dónde aparece la vista creada en el warehouse?
- [x] En la carpeta Views del explorador
- [ ] En Files
- [ ] En Monitor
- [ ] En Workspaces
:::

:::ejercicio quiz
¿Se pueden crear vistas en el SQL analytics endpoint de un lakehouse?
- [x] Sí, aunque no se puedan escribir tablas
- [ ] No
- [ ] Solo con Spark
- [ ] Solo en Pro
:::
