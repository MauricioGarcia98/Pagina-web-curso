---
titulo: El día a día - precios nuevos, un CRM que se limpia, eventos que cambian de nombre y preguntas del directorio
nivel: Avanzado
duracion: 35
resumen: En los días siguientes sube el precio del plan Pro, la app móvil renombra un evento sin avisar, Ventas fusiona los duplicados del CRM y finanzas, CS y producto te hacen preguntas. Todo en el tablero.
objetivos: Responder preguntas de negocio SaaS | Detectar cambios en el tracking de producto | Mantener un reverse ETL cuando cambian los ids del destino
prerrequisitos: proyecto-cuentas-claras-la-entrega
autoevaluacion: ¿Sabes calcular el churn de MRR? | ¿Sabes qué le pasa a tu reverse ETL cuando fusionan registros? | ¿Sabes detectar que un evento cambió de nombre?
---

## El tablero

<div data-cc="tablero"></div>

:::errores
- **Usar el estado actual para meses pasados**: el MRR histórico sale del log de eventos.
- **Sumar el plan anual completo**: se divide por 12.
- **Contar las pruebas gratis como MRR**.
- **Unir por nombre**: los nombres cambian y se escriben distinto; el dominio normalizado es mucho mejor (y el id externo, mejor todavía).
- **Escribir en el duplicado**: después de una fusión, el registro viejo queda archivado y la API lo rechaza.
- **Medir con un solo nombre de evento**: cuando la app cambia su plan de tracking, el uso "cae" sin que nadie haya dejado de usar el producto.
:::

## Resumen

- Las métricas SaaS necesitan historia (eventos) y definiciones.
- Los sistemas operativos cambian (precios, fusiones, tracking): valida lo que llega y lo que escribes.
