---
titulo: Proyecto 4 (con poca ayuda) - el incidente del UPDATE
nivel: 4 · Intermedio-avanzado
duracion: 45
resumen: Alguien quiso corregir el total de un pedido y puso en 0 los de todos. Encuentras la sentencia en el historial, restauras la tabla con Time Travel y propones cómo evitar que vuelva a pasar con un clon de pruebas. Solo se dice qué lograr; la solución comentada está al final.
objetivos: Encontrar la sentencia culpable en Query History | Restaurar una tabla con CREATE OR REPLACE y BEFORE | Comprobar la restauración | Proponer una práctica para evitarlo
prerrequisitos: snowflake-paso-a-paso-sql-analitico
autoevaluacion: ¿Encontraste el Query ID del UPDATE? | ¿Los totales volvieron a los valores correctos? | ¿Sabes por qué CREATE OR REPLACE y no INSERT? | ¿Tienes una propuesta para prevenirlo?
---

:::escenario El incidente
Finanzas: *"El tablero muestra ventas en 0. ¿Qué pasó? Necesitamos los números de vuelta antes de la reunión."*
:::

## Lo que tienes que lograr

1. Encontrar en Query History la sentencia que dejó los totales en 0.
2. Restaurar `pedidos_actuales` a como estaba justo antes.
3. Comprobar que los totales volvieron (el 90004 vale 310).
4. Escribir una propuesta de una línea para que no se repita.

## Cómo se ve terminado

```captura
archivo: snowflake/s16-error.webp
texto: El UPDATE sin WHERE (1) - 7 filas actualizadas (2)
```

```captura
archivo: snowflake/s16-recuperado.webp
texto: La tabla restaurada con BEFORE (1) y los totales correctos (2)
```

## ✅ Lista de verificación

- [ ] Tienes el Query ID del UPDATE.
- [ ] `SELECT pedido_id, total FROM pedidos_actuales` muestra los totales originales.
- [ ] Tienes la propuesta.

<details><summary>💡 Solución comentada</summary>

1. **Query History**: buscar un `UPDATE pedidos_actuales SET total = 0` reciente y copiar su Query ID.
2. Restaurar:

```sql norun
CREATE OR REPLACE TABLE pedidos_actuales AS
SELECT * FROM pedidos_actuales BEFORE(STATEMENT => '<query id del UPDATE>');
```

**Por qué CREATE OR REPLACE y no INSERT:** el UPDATE no borró filas, las **cambió**. Insertar las versiones anteriores duplicaría los pedidos; reemplazar la tabla deja exactamente el estado anterior. (Si después del error hubo cambios buenos, hay que rescatarlos aparte o usar un MERGE desde el pasado.)

**Propuestas para prevenirlo:**
- Probar los cambios en un **clon** (`CREATE TABLE pedidos_prueba CLONE pedidos_actuales;`) antes de tocar la tabla real.
- Que los analistas tengan solo `SELECT` sobre `analitica` (nivel 5): un rol que no puede escribir no puede romper.
- Siempre correr primero un `SELECT ... WHERE ...` con la misma condición del UPDATE para ver qué filas toca.
</details>

## Lo que aprendiste en el nivel 4

- Time Travel con AT y BEFORE.
- UNDROP y zero-copy clones.
- QUALIFY, ventanas y SAMPLE.

En el nivel 5: roles, permisos y costos.

:::ejercicio quiz
Un UPDATE cambió todos los totales. ¿Cómo restauras sin duplicar filas?
- [ ] INSERT de la versión anterior
- [x] CREATE OR REPLACE TABLE ... AS SELECT de la versión anterior con BEFORE
- [ ] UNDROP TABLE
- [ ] DELETE y esperar
:::

:::ejercicio quiz
¿Dónde encuentras la sentencia que causó el problema?
- [x] Query History
- [ ] Marketplace
- [ ] Warehouses
- [ ] Copy History
:::

:::ejercicio quiz
¿Qué práctica evita que un analista rompa una tabla por error?
- [ ] Darle ACCOUNTADMIN
- [x] Darle un rol con solo SELECT sobre lo que necesita
- [ ] Apagar el warehouse
- [ ] Borrar el historial
:::

:::ejercicio quiz
¿Qué conviene correr antes de un UPDATE con WHERE?
- [ ] Nada
- [x] Un SELECT con la misma condición para ver qué filas va a tocar
- [ ] Un DROP
- [ ] Un COPY INTO
:::
