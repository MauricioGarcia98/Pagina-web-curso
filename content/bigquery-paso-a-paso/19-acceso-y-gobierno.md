---
titulo: Acceso y gobierno - roles de IAM, vistas autorizadas y seguridad por filas
nivel: 5 · Avanzado
duracion: 45
resumen: En BigQuery los permisos son de IAM de Google Cloud. Creas el dataset reportes con una vista que solo expone lo que comercial necesita, aprendes los roles predefinidos (Data Viewer, Data Editor, Job User), las vistas autorizadas, la seguridad por filas y por columnas, y cómo compartir datos sin copiarlos.
objetivos: Elegir los roles de IAM correctos | Exponer datos con una vista autorizada | Restringir filas con row access policies | Proteger columnas con policy tags y enmascaramiento | Compartir datos con Analytics Hub
prerrequisitos: bigquery-paso-a-paso-automatizar
autoevaluacion: ¿Sabes qué rol hace falta para ejecutar consultas? | ¿Sabes qué es una vista autorizada? | ¿Sabes cómo hacer que cada gerente vea solo su país? | ¿Sabes compartir un dataset con otra empresa sin copiarlo?
---

## Paso 1 — Una vista para comercial

```sql norun
CREATE SCHEMA IF NOT EXISTS reportes;

-- solo lo que comercial necesita: sin email ni teléfono
CREATE OR REPLACE VIEW reportes.v_clientes_por_pais AS
SELECT pais, segmento, COUNT(*) AS clientes
FROM tienda.clientes
GROUP BY pais, segmento;
```

```captura
archivo: bigquery/q19-vista.webp
texto: El dataset reportes con la vista (1), la vista sin datos personales (2) y su resultado por país y segmento (3)
```

Para que comercial lea la vista **sin** tener acceso a `tienda.clientes`, en BigQuery real se marca como **vista autorizada**: se autoriza la vista (o todo el dataset `reportes`) en el dataset `tienda`, y se le da a comercial acceso solo a `reportes`.

## Paso 2 — Los roles

| Rol de IAM | Permite | Para |
|---|---|---|
| **BigQuery Data Viewer** | Leer tablas y vistas | Analistas (a nivel de dataset) |
| **BigQuery Data Editor** | Leer y escribir tablas | Procesos de carga, ingeniería |
| **BigQuery Data Owner** | Todo sobre el dataset, incluidos sus permisos | Responsables del dataset |
| **BigQuery Job User** | Ejecutar jobs (consultas) en el proyecto | Cualquiera que consulte: **sin este rol no se puede correr nada** |
| **BigQuery Admin** | Todo | Muy pocas personas |

Los permisos se dan a **grupos** (`grp-comercial@tienda.example`) y al nivel más chico posible: el dataset, no todo el proyecto.

## Paso 3 — Seguridad fina

```sql norun
-- cada gerente ve solo las filas de su país
CREATE ROW ACCESS POLICY solo_peru
ON analitica.hechos_ventas
GRANT TO ("group:gerencia-pe@tienda.example")
FILTER USING (pais = 'Perú');
```

| Herramienta | Protege |
|---|---|
| **Row access policies** | Filas según quién consulta |
| **Policy tags** (Dataplex) | Columnas sensibles: sin permiso, la columna no se puede leer |
| **Enmascaramiento dinámico** | Muestra la columna enmascarada (`****`, hash) a quien no debe verla completa |
| **Vistas autorizadas** | Exponen solo un subconjunto sin dar acceso a la tabla de fondo |

## Paso 4 — Compartir sin copiar

```captura
archivo: bigquery/q19-sharing.webp
texto: Sharing (Analytics Hub) - publicar datasets para otras organizaciones sin copiarlos
```

Con **Analytics Hub** se publica un dataset y el otro lo ve como un dataset enlazado de solo lectura; cada uno paga sus propias consultas.

## ✅ Lo que lograste

- Creaste una vista para un área.
- Conoces los roles de IAM de BigQuery.
- Sabes restringir filas y columnas y compartir sin copiar.

:::ejercicio quiz
¿Qué rol hace falta, además de leer la tabla, para ejecutar consultas en un proyecto?
- [ ] Data Owner
- [x] BigQuery Job User
- [ ] Storage Admin
- [ ] Ninguno
:::

:::ejercicio quiz
¿Qué es una vista autorizada?
- [x] Una vista que puede leer tablas a las que el usuario final no tiene acceso
- [ ] Una vista sin datos
- [ ] Una vista que cualquiera puede borrar
- [ ] Una tabla temporal
:::

:::ejercicio quiz
¿Cómo haces que cada gerente vea solo su país en la misma tabla?
- [ ] Una tabla por gerente
- [x] Con una row access policy
- [ ] Con LIMIT
- [ ] Con una scheduled query
:::

:::ejercicio quiz
¿Cómo compartes un dataset con otra empresa sin copiarlo?
- [ ] Exportándolo a CSV
- [x] Publicándolo en Analytics Hub
- [ ] Dándole la contraseña
- [ ] No se puede
:::
