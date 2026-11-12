# examen: cero

## Leer una ruta
leccion: cero-tu-computadora
Te pasan la ruta `datos/2024/diciembre/ventas.csv`. ¿Qué es `diciembre`?
- [ ] Un archivo de texto con las ventas del mes.
- [x] Una carpeta que está dentro de `2024`.
- [ ] La extensión del archivo `ventas`.
- [ ] El nombre del disco donde está guardado todo.
porque: En una ruta, cada parte separada por `/` es una carpeta dentro de la anterior; lo último es el archivo.

## Extensión
leccion: cero-tu-computadora
¿Qué te dice la extensión `.csv` de un archivo?
- [x] Que es una tabla guardada como texto, con los valores separados por comas.
- [ ] Que el archivo está comprimido y hay que descomprimirlo antes de poder abrirlo.
- [ ] Que solo se puede abrir con un programa pago.
- [ ] Que el archivo pesa menos de un megabyte.
porque: La extensión indica el formato. Un CSV es texto plano: una fila por línea y columnas separadas por comas.

## El error rojo
leccion: cero-leer-errores
Tu programa falla y aparece un texto largo en rojo. ¿Por dónde conviene empezar a leerlo?
- [ ] Por la primera línea, que siempre contiene la causa exacta del problema.
- [ ] No hace falta leerlo: se borra todo y se escribe de nuevo.
- [x] Por el final: la última línea dice el tipo de error y el mensaje.
- [ ] Por cualquier parte, porque todas las líneas dicen lo mismo.
porque: En la mayoría de los lenguajes, la última línea resume qué pasó; las anteriores muestran el camino hasta la línea que falló.

## Línea del error
leccion: cero-leer-errores
El mensaje dice `NameError: name 'totl' is not defined` en la línea 7. ¿Qué es lo más probable?
- [ ] Que falte instalar un programa en la computadora.
- [x] Que el nombre esté mal escrito: la variable se llama `total`.
- [ ] Que la línea 7 sea demasiado larga para ejecutarse.
- [ ] Que el archivo esté guardado en la carpeta equivocada del proyecto.
porque: `NameError` significa que se usó un nombre que no existe. Casi siempre es un error de tipeo o una variable que todavía no se creó.

## Variación porcentual
leccion: cero-matematica-para-datos
En marzo se vendieron 200 unidades y en abril 250. ¿Cuánto crecieron las ventas?
- [ ] 20 %
- [x] 25 %
- [ ] 50 %
- [ ] 125 %
porque: (250 − 200) / 200 = 0,25 = 25 %. Se divide por el valor **inicial**.

## Promedio y mediana
leccion: cero-matematica-para-datos
Cinco sueldos: 500, 520, 540, 560 y 5.000. ¿Qué número representa mejor el sueldo típico?
- [ ] El promedio, porque usa todos los valores por igual.
- [x] La mediana, porque un valor extremo no la mueve.
- [ ] El máximo, porque es el dato más llamativo.
- [ ] La suma, porque muestra el total que se paga.
porque: El promedio (1.424) queda inflado por el 5.000. La mediana (540) es el valor del medio y describe mejor al grupo.

## Palabras en inglés
leccion: cero-ingles-tecnico
Un mensaje dice `File not found`. ¿Qué significa?
- [ ] Que el archivo está dañado y no se puede leer.
- [ ] Que el archivo se encontró pero está vacío.
- [x] Que no se encontró el archivo: la ruta o el nombre no coinciden.
- [ ] Que no tienes permiso para abrir el archivo y debes pedírselo a alguien.
porque: *Not found* es "no encontrado". Lo primero a revisar es la ruta y el nombre exacto (mayúsculas incluidas).

## Cómo estudiar
leccion: cero-como-aprender
¿Qué hábito ayuda más a aprender a programar?
- [ ] Leer muchos capítulos seguidos sin detenerse a practicar.
- [ ] Copiar soluciones ya hechas y memorizarlas de principio a fin.
- [x] Practicar un poco cada día y repasar lo visto unos días después.
- [ ] Estudiar ocho horas un solo día a la semana.
porque: La práctica frecuente y el repaso espaciado fijan lo aprendido. Leer sin practicar da sensación de avance, pero se olvida rápido.

## Qué es una API
leccion: cero-internet-apis-json
¿Qué es una API, dicho simple?
- [ ] Un archivo de Excel compartido por internet.
- [x] Una forma ordenada de pedirle datos a otro sistema por internet.
- [ ] Una base de datos instalada en tu computadora, que funciona sin conexión.
- [ ] Un programa para dibujar gráficos.
porque: Una API define qué puedes pedir y cómo. Tu programa hace un pedido y recibe una respuesta, normalmente en JSON.

## Leer JSON
leccion: cero-internet-apis-json
Recibes `{"id": 3, "nombre": "Mate", "precio": 1500}`. ¿Cuál es el valor de `nombre`?
- [ ] `id`
- [ ] `3`
- [x] `"Mate"`
- [ ] `1500`
porque: En JSON, cada dato es un par `"clave": valor`. La clave `nombre` tiene el valor `"Mate"`.
