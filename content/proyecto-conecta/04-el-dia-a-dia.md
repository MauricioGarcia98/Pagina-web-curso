---
titulo: El día a día - un modelo que se retira, una caída, una inyección y preguntas de negocio
nivel: Avanzado
duracion: 35
resumen: En los días siguientes Lumen IA retira el modelo que usabas, el servicio se cae dos horas, un correo intenta darle órdenes al modelo y Gerencia, Finanzas y Cuentas empresas te hacen preguntas. Todo en el tablero.
objetivos: Mantener un pipeline que depende de un proveedor de IA | Defenderse de la inyección de instrucciones | Controlar el costo por día | Responder preguntas con datos clasificados por un modelo
prerrequisitos: proyecto-conecta-la-entrega
autoevaluacion: ¿Sabes cómo enterarte antes de que retiren un modelo? | ¿Sabes cómo separar datos de instrucciones en un prompt? | ¿Sabes cuánto te costó la IA ayer?
---

## El tablero

<div data-conecta="tablero"></div>

:::errores
- **Confiar en la salida sin validarla**: el modelo nuevo devuelve "Facturación" o un bloque ```json.
- **Mandar el correo completo**: lo citado al final confunde al modelo; la firma y la cita no son el mensaje.
- **Pegar el texto del cliente pegado a las instrucciones**: el cliente puede escribir instrucciones. Ponlo entre etiquetas y aclara que son datos.
- **Reclasificar todo cada día**: cuesta plata y tiempo; clasifica solo lo nuevo.
- **Usar el modelo caro para todo**: para clasificar alcanza el chico; mide antes de elegir.
- **Mandar datos personales al proveedor**: enmascáralos antes.
- **Un asistente sin "no sé"**: si el contexto no tiene la respuesta, que lo diga en lugar de inventar.
- **No reintentar**: 429 y 529 son normales; espera lo que dice `Retry-After` y vuelve a intentar.
:::

:::real En tu computadora y en la web real
Cuando el proveedor retira un modelo, avisa con fecha en su página de *deprecations*: se prueba el modelo nuevo con la misma evaluación antes de cambiar. Un intento de inyección de prompt se registra como incidente de seguridad, con su ticket y su arreglo.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio del proyecto y úsalas en el README.

- `04-cambio-modelo.png`: la evaluación del modelo viejo y del nuevo, lado a lado.

Antes de publicar, tapa con un rectángulo los correos, los IDs de suscripción y de tenant, los nombres de cuentas reales y cualquier clave o token.
:::

## Resumen

- Un proveedor de IA cambia: modelos que se retiran, caídas, respuestas distintas.
- Las defensas: validar, reintentar, enmascarar, separar datos de instrucciones y medir.
- Las preguntas de negocio dependen de que la clasificación sea buena: por eso se mide.
