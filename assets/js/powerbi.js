/* Power BI Desktop (práctica) — #/powerbi
 *
 * Funciona con CUALQUIER dataset, como el real:
 * - Empieza en blanco: "Agregar datos al informe". Orígenes: libro de Excel (.xlsx, con SheetJS),
 *   texto/CSV, JSON, "Escribir datos" (una tabla a mano), pegar desde una planilla, una URL y las bases
 *   del curso (99 tablas de 13 empresas). El Navegador muestra las tablas y su vista previa: Cargar o
 *   Transformar datos.
 * - Power Query: pasos aplicados (Origen, Encabezados promovidos, Tipo cambiado, Quitar columnas,
 *   Renombrar, Filtrar filas, Reemplazar valores, Quitar duplicados, Ordenar) con la fórmula M de cada paso.
 * - Modelo: relaciones detectadas automáticamente (mismo nombre de columna, lado 1 sin repetidos) y
 *   editables (Administrar relaciones).
 * - Informe: visuales (tarjeta, columnas, barras, líneas, área, anillo, tabla, matriz simple, segmentación),
 *   pozos, filtrado cruzado, filtros de página, formato, varias páginas.
 * - Medidas DAX que se traducen a SQL y corren en un SQLite propio del informe.
 * Los datos importados se guardan en este navegador (clave aparte del progreso del curso).
 */
(function () {
  'use strict';
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const q = (n) => '"' + String(n).replace(/"/g, '""') + '"';
  const PALETA = ['#118DFF', '#12239E', '#E66C37', '#6B007B', '#E044A7', '#744EC2', '#D9B300', '#D64550', '#197278', '#1AAB40'];
  const AGG = { sum: ['Suma', 'SUM'], count: ['Recuento', 'COUNT'], distinct: ['Recuento (distintos)', 'COUNT(DISTINCT'], avg: ['Promedio', 'AVG'], min: ['Mínimo', 'MIN'], max: ['Máximo', 'MAX'], none: ['No resumir', ''] };
  const TIPO_N = { num: 'Número decimal', int: 'Número entero', texto: 'Texto', fecha: 'Fecha', bool: 'Verdadero/falso' };
  // Íconos Fluent UI (Microsoft, licencia MIT), los mismos que usa Power BI Desktop
  const FL = {"arrow_down":["16","<path d=\"M8.5 2.5a.5.5 0 1 0-1 0v9.7L3.87 8.17a.5.5 0 1 0-.74.66l4.5 5a.5.5 0 0 0 .74 0l4.5-5a.5.5 0 0 0-.74-.66L8.5 12.2V2.5Z\"/>"],"arrow_redo":["20","<path d=\"M15 2.5a.5.5 0 0 1 1 0v4.9a.6.6 0 0 1-.6.6h-4.9a.5.5 0 0 1 0-1h3.6l-3.48-3.02a4 4 0 1 0-5.24 6.04l8.17 7.1a.5.5 0 1 1-.66.76l-8.17-7.1a5 5 0 1 1 6.56-7.55L15 6.46V2.5Z\"/>"],"arrow_routing":["24","<path d=\"M17.53 3.22a.75.75 0 1 0-1.06 1.06l2.97 2.97H14.5a3.25 3.25 0 0 0-3.25 3.25v3c0 .82-.57 1.51-1.33 1.7a4 4 0 1 0 .02 1.52 3.25 3.25 0 0 0 2.81-3.22v-3c0-.97.78-1.75 1.75-1.75h4.94l-2.97 2.97a.75.75 0 1 0 1.06 1.06l4.25-4.25c.3-.3.3-.77 0-1.06l-4.25-4.25ZM3.5 16a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0Z\"/>"],"arrow_sort_up_lines":["24","<path d=\"M18 21.25a.75.75 0 0 1-1.5 0V4.56l-2.22 2.22a.75.75 0 1 1-1.06-1.06l3.5-3.5c.3-.3.77-.3 1.06 0l3.5 3.5a.75.75 0 0 1-1.06 1.06L18 4.56v16.69ZM2.75 19.5a.75.75 0 0 1 0-1.5h10.5a.75.75 0 0 1 0 1.5H2.75ZM6 14.75c0 .41.34.75.75.75h6.5a.75.75 0 0 0 0-1.5h-6.5a.75.75 0 0 0-.75.75Zm4.75-3.25a.75.75 0 0 1 0-1.5h2.5a.75.75 0 0 1 0 1.5h-2.5Z\"/>"],"arrow_sync":["24","<path d=\"M16.25 5.18c-.25.33-.19.8.14 1.05a7.24 7.24 0 0 1-3.6 12.98l.68-.68a.75.75 0 0 0-.98-1.13l-.08.07-2 2a.75.75 0 0 0-.07.98l.07.08 2 2a.75.75 0 0 0 1.13-.98l-.07-.08-.75-.75A8.75 8.75 0 0 0 17.3 5.04a.75.75 0 0 0-1.05.14Zm-5.72-3.71c-.3.3-.3.77 0 1.06l.75.75a8.75 8.75 0 0 0-4.85 15.47.75.75 0 1 0 .96-1.16A7.23 7.23 0 0 1 11.2 4.8l-.68.68a.75.75 0 1 0 1.06 1.06l2-2c.3-.3.3-.77 0-1.06l-2-2a.75.75 0 0 0-1.06 0Z\"/>"],"arrow_undo":["20","<path d=\"M5 2.5a.5.5 0 0 0-1 0v4.9c0 .33.27.6.6.6h4.9a.5.5 0 0 0 0-1H5.9l3.48-3.02a4 4 0 0 1 5.25 6.04l-8.17 7.1a.5.5 0 0 0 .65.76l8.17-7.1a5 5 0 0 0-6.56-7.55L5 6.46V2.5Z\"/>"],"arrow_up":["16","<path d=\"M7.5 13.5a.5.5 0 0 0 1 0V3.8l3.63 4.03a.5.5 0 0 0 .74-.66l-4.5-5a.5.5 0 0 0-.74 0l-4.5 5a.5.5 0 0 0 .74.66L7.5 3.8v9.7Z\"/>"],"braces":["24","<path d=\"M4.5 5.75A2.75 2.75 0 0 1 7.25 3a.75.75 0 0 1 0 1.5C6.56 4.5 6 5.06 6 5.75v4.3c0 .75-.3 1.45-.8 1.95.5.5.8 1.2.8 1.94v4.31c0 .69.56 1.25 1.25 1.25a.75.75 0 0 1 0 1.5 2.75 2.75 0 0 1-2.75-2.75v-4.3c0-.55-.34-1.02-.85-1.2l-.14-.04a.75.75 0 0 1 0-1.42l.14-.05c.5-.17.85-.64.85-1.18V5.75Zm15 0A2.75 2.75 0 0 0 16.75 3a.75.75 0 0 0 0 1.5c.69 0 1.25.56 1.25 1.25v4.3c0 .75.3 1.45.8 1.95-.5.5-.8 1.2-.8 1.94v4.31c0 .69-.56 1.25-1.25 1.25a.75.75 0 0 0 0 1.5 2.75 2.75 0 0 0 2.75-2.75v-4.3c0-.55.34-1.02.85-1.2l.14-.04a.75.75 0 0 0 0-1.42l-.14-.05a1.25 1.25 0 0 1-.85-1.18V5.75Z\"/>"],"calculator":["24","<path d=\"M7 7c0-1.1.9-2 2-2h6a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7Zm2-.5a.5.5 0 0 0-.5.5v1c0 .28.22.5.5.5h6a.5.5 0 0 0 .5-.5V7a.5.5 0 0 0-.5-.5H9Zm-.75 8a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Zm1.25 2.75a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm6.25-2.75a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5ZM17 17.25a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm-5-2.75a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Zm1.25 2.75a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0ZM7.25 2A3.25 3.25 0 0 0 4 5.25v13.5C4 20.55 5.46 22 7.25 22h9.5c1.8 0 3.25-1.46 3.25-3.25V5.25C20 3.45 18.54 2 16.75 2h-9.5ZM5.5 5.25c0-.97.78-1.75 1.75-1.75h9.5c.97 0 1.75.78 1.75 1.75v13.5c0 .97-.78 1.75-1.75 1.75h-9.5c-.97 0-1.75-.78-1.75-1.75V5.25Z\"/>"],"calendar_ltr":["16","<path d=\"M5.25 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM6 10.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM8 9a.75.75 0 1 0 0-1.5A.75.75 0 0 0 8 9Zm.75 1.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm2-1.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM14 4.5A2.5 2.5 0 0 0 11.5 2h-7A2.5 2.5 0 0 0 2 4.5v7A2.5 2.5 0 0 0 4.5 14h7a2.5 2.5 0 0 0 2.5-2.5v-7ZM3 6h10v5.5c0 .83-.67 1.5-1.5 1.5h-7A1.5 1.5 0 0 1 3 11.5V6Zm1.5-3h7c.83 0 1.5.67 1.5 1.5V5H3v-.5C3 3.67 3.67 3 4.5 3Z\"/>"],"checkmark":["20","<path d=\"M3.37 10.17a.5.5 0 0 0-.74.66l4 4.5c.19.22.52.23.72.02l10.5-10.5a.5.5 0 0 0-.7-.7L7.02 14.27l-3.65-4.1Z\"/>"],"chevron_down":["16","<path d=\"M3.15 5.65c.2-.2.5-.2.7 0L8 9.79l4.15-4.14a.5.5 0 0 1 .7.7l-4.5 4.5a.5.5 0 0 1-.7 0l-4.5-4.5a.5.5 0 0 1 0-.7Z\"/>"],"chevron_right":["16","<path d=\"M5.65 3.15a.5.5 0 0 0 0 .7L9.79 8l-4.14 4.15a.5.5 0 0 0 .7.7l4.5-4.5a.5.5 0 0 0 0-.7l-4.5-4.5a.5.5 0 0 0-.7 0Z\"/>"],"clipboard_paste":["24","<path d=\"M12.75 2c1.16 0 2.11.88 2.24 2h1.76c1.2 0 2.17.93 2.24 2.1l.01.15c0 .38-.28.7-.65.74h-.1a.75.75 0 0 1-.74-.64l-.01-.1c0-.38-.28-.7-.65-.74l-.1-.01h-2.13c-.4.6-1.09 1-1.87 1h-3.5c-.78 0-1.46-.4-1.87-1H5.25c-.38 0-.7.28-.74.65l-.01.1v13.5c0 .38.28.7.65.75h3.1c.38 0 .7.29.74.65l.01.1c0 .42-.34.75-.75.75h-3c-1.2 0-2.17-.92-2.24-2.1L3 19.76V6.25c0-1.2.93-2.17 2.1-2.24L5.25 4h1.76c.13-1.12 1.08-2 2.24-2h3.5Zm6 6c1.2 0 2.17.93 2.24 2.1l.01.15v9.5c0 1.2-.93 2.17-2.1 2.24l-.15.01h-6.5c-1.2 0-2.17-.93-2.24-2.1l-.01-.15v-9.5c0-1.2.93-2.17 2.1-2.24l.15-.01h6.5Zm0 1.5h-6.5c-.38 0-.7.28-.74.65l-.01.1v9.5c0 .38.28.7.65.74l.1.01h6.5c.38 0 .7-.28.74-.65l.01-.1v-9.5c0-.38-.28-.7-.65-.74l-.1-.01Zm-6-6h-3.5a.75.75 0 0 0 0 1.5h3.5a.75.75 0 1 0 0-1.5Z\"/>"],"cloud_arrow_up":["24","<path d=\"M12 4.5a4.5 4.5 0 0 0-4.5 4.29.75.75 0 0 1-.74.71H6.5a3 3 0 1 0 0 6h3.58a6.55 6.55 0 0 0-.06 1.5H6.5a4.5 4.5 0 0 1-.42-8.98 6 6 0 0 1 11.84 0 4.5 4.5 0 0 1 4.05 4.97 6.53 6.53 0 0 0-1.8-1.85A3 3 0 0 0 17.5 9.5h-.26a.75.75 0 0 1-.74-.71A4.5 4.5 0 0 0 12 4.5Zm10 12a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0Zm-6 3a.5.5 0 0 0 1 0v-4.8l1.65 1.65a.5.5 0 0 0 .7-.7l-2.5-2.5a.5.5 0 0 0-.7 0l-2.5 2.5a.5.5 0 0 0 .7.7L16 14.71v4.79Z\"/>"],"data_bar_vertical":["20","<path d=\"M5 3a2 2 0 0 0-2 2v10a2 2 0 1 0 4 0V5a2 2 0 0 0-2-2ZM4 5a1 1 0 0 1 2 0v10a1 1 0 1 1-2 0V5Zm4 3a2 2 0 1 1 4 0v7a2 2 0 1 1-4 0V8Zm2-1a1 1 0 0 0-1 1v7a1 1 0 1 0 2 0V8a1 1 0 0 0-1-1Zm3 4a2 2 0 1 1 4 0v4a2 2 0 1 1-4 0v-4Zm2-1a1 1 0 0 0-1 1v4a1 1 0 1 0 2 0v-4a1 1 0 0 0-1-1Z\"/>"],"data_bar_vertical_add":["24","<path d=\"M18.25 3C17 3 16 4 16 5.25v5.92c.48-.11.98-.17 1.5-.17V5.25a.75.75 0 0 1 1.5 0v5.92c.53.13 1.03.32 1.5.56V5.25C20.5 4 19.5 3 18.25 3ZM14 9.25v2.77c-.57.36-1.07.81-1.5 1.33v-4.1a.75.75 0 0 0-1.5 0v8.1a6.75 6.75 0 0 0 0 .3v1.1c0 .23.1.43.25.56.18.6.43 1.16.76 1.68l-.26.01c-1.24 0-2.25-1-2.25-2.25v-9.5a2.25 2.25 0 1 1 4.5 0Zm-11 4a2.25 2.25 0 1 1 4.5 0v5.5a2.25 2.25 0 1 1-4.5 0v-5.5Zm3 0a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0v-5.5Zm17 4.25a5.5 5.5 0 1 0-11 0 5.5 5.5 0 0 0 11 0Zm-5 .5v2.5a.5.5 0 1 1-1 0V18h-2.5a.5.5 0 0 1 0-1H17v-2.5a.5.5 0 1 1 1 0V17h2.5a.5.5 0 0 1 0 1H18Z\"/>"],"database":["24","<path d=\"M4 6c0-.7.32-1.3.77-1.78a5.61 5.61 0 0 1 1.8-1.2A13.65 13.65 0 0 1 12 2c2.08 0 4 .38 5.43 1.02.72.32 1.34.72 1.8 1.2.45.49.77 1.09.77 1.78v12c0 .7-.32 1.3-.77 1.78-.46.48-1.08.88-1.8 1.2A13.65 13.65 0 0 1 12 22c-2.08 0-4-.38-5.43-1.02a5.61 5.61 0 0 1-1.8-1.2A2.6 2.6 0 0 1 4 18V6Zm1.5 0c0 .2.09.46.37.75.27.3.71.6 1.31.86 1.2.54 2.9.89 4.82.89 1.92 0 3.62-.35 4.82-.89.6-.26 1.04-.56 1.31-.86.28-.3.37-.54.37-.75 0-.2-.09-.46-.37-.75-.27-.3-.71-.6-1.31-.86-1.2-.54-2.9-.89-4.82-.89-1.92 0-3.62.35-4.82.89-.6.26-1.04.56-1.31.86-.28.3-.37.54-.37.75Zm13 2.4a6.8 6.8 0 0 1-1.07.58A13.65 13.65 0 0 1 12 10c-2.08 0-4-.38-5.43-1.02A6.8 6.8 0 0 1 5.5 8.4V18c0 .2.09.46.37.75.27.3.71.6 1.31.86 1.2.54 2.9.89 4.82.89 1.92 0 3.62-.35 4.82-.89.6-.26 1.04-.56 1.31-.86.28-.3.37-.54.37-.75V8.4Z\"/>"],"delete":["16","<path d=\"M7 3h2a1 1 0 0 0-2 0ZM6 3a2 2 0 1 1 4 0h4a.5.5 0 0 1 0 1h-.56l-1.2 8.84A2.5 2.5 0 0 1 9.74 15h-3.5a2.5 2.5 0 0 1-2.48-2.16L2.57 4H2a.5.5 0 0 1 0-1h4Zm1 3.5a.5.5 0 0 0-1 0v5a.5.5 0 0 0 1 0v-5ZM9.5 6c.28 0 .5.22.5.5v5a.5.5 0 0 1-1 0v-5c0-.28.22-.5.5-.5Zm-4.74 6.7c.1.75.74 1.3 1.49 1.3h3.5a1.5 1.5 0 0 0 1.5-1.3L12.42 4H3.57l1.19 8.7Z\"/>"],"dismiss":["20","<path d=\"m4.09 4.22.06-.07a.5.5 0 0 1 .63-.06l.07.06L10 9.29l5.15-5.14a.5.5 0 0 1 .63-.06l.07.06c.18.17.2.44.06.63l-.06.07L10.71 10l5.14 5.15c.18.17.2.44.06.63l-.06.07a.5.5 0 0 1-.63.06l-.07-.06L10 10.71l-5.15 5.14a.5.5 0 0 1-.63.06l-.07-.06a.5.5 0 0 1-.06-.63l.06-.07L9.29 10 4.15 4.85a.5.5 0 0 1-.06-.63l.06-.07-.06.07Z\"/>"],"document_add":["24","<path d=\"M18.5 20a.5.5 0 0 1-.5.5h-5.73a6.52 6.52 0 0 1-1.08 1.5H18a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L13.6 2.6a.5.5 0 0 0-.05-.04 2.07 2.07 0 0 0-.34-.25l-.05-.03-.05-.03-.16-.09c-.2-.08-.41-.12-.63-.14h-.06a.6.6 0 0 0-.08-.01H6a2 2 0 0 0-2 2v7.5c.47-.2.98-.34 1.5-.42V4c0-.27.22-.5.5-.5h6V8c0 1.1.9 2 2 2h4.5v10Zm-5-15.38 3.88 3.88H14a.5.5 0 0 1-.5-.5V4.62ZM12 17.5a5.5 5.5 0 1 0-11 0 5.5 5.5 0 0 0 11 0ZM7 18v2.5a.5.5 0 1 1-1 0V18H3.5a.5.5 0 0 1 0-1H6v-2.5a.5.5 0 1 1 1 0V17h2.5a.5.5 0 0 1 0 1H7Z\"/>"],"document_table":["20","<path d=\"M6 10.5C6 9.67 6.67 9 7.5 9h5c.83 0 1.5.67 1.5 1.5v4c0 .83-.67 1.5-1.5 1.5h-5A1.5 1.5 0 0 1 6 14.5v-4ZM8 15v-2H7v1.5c0 .28.22.5.5.5H8Zm1-3h4v-1.5a.5.5 0 0 0-.5-.5H9v2Zm0 3h3.5a.5.5 0 0 0 .5-.5V13H9v2Zm-1.5-5a.5.5 0 0 0-.5.5V12h1v-2h-.5ZM6 2a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V7.41c0-.4-.16-.78-.44-1.06l-3.91-3.91A1.5 1.5 0 0 0 10.59 2H6ZM5 4a1 1 0 0 1 1-1h4v3.5c0 .83.67 1.5 1.5 1.5H15v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4Zm9.8 3h-3.3a.5.5 0 0 1-.5-.5V3.2L14.8 7Z\"/>"],"document_text":["24","<path d=\"M8.75 11.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 2.75a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 2.75a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm4.84-14.41L19.4 8.4A2 2 0 0 1 20 9.83V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4c0-1.1.9-2 2-2h6.17a.6.6 0 0 1 .08 0l.06.01c.22.02.43.06.63.14l.16.09c.02 0 .04.02.05.03l.05.02.08.05a2.07 2.07 0 0 1 .3.25ZM18 20.5a.5.5 0 0 0 .5-.5V10H14a2 2 0 0 1-2-2V3.5H6a.5.5 0 0 0-.5.5v16c0 .27.22.5.5.5h12Zm-.62-12L13.5 4.62V8c0 .28.22.5.5.5h3.38Z\"/>"],"edit":["16","<path d=\"M14.24 1.76a2.62 2.62 0 0 0-3.71 0L2.66 9.64c-.38.37-.64.84-.78 1.35l-.86 3.39a.5.5 0 0 0 .6.6l3.39-.86c.51-.14.98-.4 1.35-.78l7.88-7.87a2.62 2.62 0 0 0 0-3.7Zm-3 .71a1.62 1.62 0 1 1 2.29 2.3l-.78.77-2.3-2.29.79-.78ZM9.75 3.96l2.3 2.29-6.4 6.39c-.24.24-.55.42-.89.5l-2.57.67.66-2.57c.09-.34.27-.65.51-.9l6.39-6.38Z\"/>"],"filter":["20","<path d=\"M7.5 13h5a.5.5 0 0 1 .09 1H7.5a.5.5 0 0 1-.09-1h5.09-5Zm-2-4h9a.5.5 0 0 1 .09 1H5.5a.5.5 0 0 1-.09-1h9.09-9Zm-2-4h13a.5.5 0 0 1 .09 1H3.5a.5.5 0 0 1-.09-1H16.5h-13Z\"/>"],"globe":["24","<path d=\"M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm2.94 14.5H9.06c.65 2.41 1.79 4 2.94 4s2.29-1.59 2.94-4Zm-7.43 0H4.79a8.53 8.53 0 0 0 4.09 3.41c-.52-.82-.95-1.85-1.27-3.02l-.1-.39Zm11.7 0H16.5c-.32 1.33-.79 2.5-1.37 3.41a8.53 8.53 0 0 0 3.9-3.13l.2-.28ZM7.1 10H3.74v.02a8.52 8.52 0 0 0 .3 4.98h3.18a20.3 20.3 0 0 1-.13-5Zm8.3 0H8.6a18.97 18.97 0 0 0 .14 5h6.52a18.5 18.5 0 0 0 .14-5Zm4.87 0h-3.35a20.85 20.85 0 0 1-.13 5h3.18a8.48 8.48 0 0 0 .3-5ZM8.88 4.09h-.02a8.53 8.53 0 0 0-4.61 4.4l3.05.01c.31-1.75.86-3.28 1.58-4.41Zm3.12-.6-.12.01c-1.26.12-2.48 2.12-3.05 5h6.34c-.56-2.87-1.78-4.87-3.04-5H12Zm3.12.6.1.17A12.64 12.64 0 0 1 16.7 8.5h3.05a8.53 8.53 0 0 0-4.34-4.29l-.29-.12Z\"/>"],"more_horizontal":["20","<path d=\"M6.25 10a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm5 0a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0ZM15 11.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z\"/>"],"organization_horizontal":["20","<path d=\"M2 10a3 3 0 0 0 5.96.5H9.5v3c0 .83.67 1.5 1.5 1.5h1.04a3 3 0 1 0 0-1H11a.5.5 0 0 1-.5-.5v-7c0-.28.22-.5.5-.5h1.04a3 3 0 1 0 0-1H11c-.83 0-1.5.67-1.5 1.5v3H7.96A3 3 0 0 0 2 10Zm3 2a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm10 4.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm-2-11a2 2 0 1 1 4 0 2 2 0 0 1-4 0Z\"/>"],"save":["20","<path d=\"M3 5c0-1.1.9-2 2-2h8.38a2 2 0 0 1 1.41.59l1.62 1.62A2 2 0 0 1 17 6.62V15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5Zm2-1a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1v-4.5c0-.83.67-1.5 1.5-1.5h7c.83 0 1.5.67 1.5 1.5V16a1 1 0 0 0 1-1V6.62a1 1 0 0 0-.3-.7L14.1 4.28a1 1 0 0 0-.71-.29H13v2.5c0 .83-.67 1.5-1.5 1.5h-4A1.5 1.5 0 0 1 6 6.5V4H5Zm2 0v2.5c0 .28.22.5.5.5h4a.5.5 0 0 0 .5-.5V4H7Zm7 12v-4.5a.5.5 0 0 0-.5-.5h-7a.5.5 0 0 0-.5.5V16h8Z\"/>"],"search":["20","<path d=\"M12.73 13.44a6.5 6.5 0 1 1 .7-.7l3.42 3.4a.5.5 0 0 1-.63.77l-.07-.06-3.42-3.41Zm-.71-.71A5.54 5.54 0 0 0 14 8.5a5.5 5.5 0 1 0-1.98 4.23Z\"/>"],"table":["24","<path d=\"M3 6.25C3 4.45 4.46 3 6.25 3h11.5C19.55 3 21 4.46 21 6.25v11.5c0 1.8-1.46 3.25-3.25 3.25H6.25A3.25 3.25 0 0 1 3 17.75V6.25ZM6.25 4.5c-.97 0-1.75.78-1.75 1.75V8.5h4v-4H6.25ZM4.5 10v4h4v-4h-4Zm5.5 0v4h4v-4h-4Zm5.5 0v4h4v-4h-4ZM14 15.5h-4v4h4v-4Zm1.5 4h2.25c.97 0 1.75-.78 1.75-1.75V15.5h-4v4Zm0-11h4V6.25c0-.97-.78-1.75-1.75-1.75H15.5v4Zm-1.5-4h-4v4h4v-4Zm-9.5 11v2.25c0 .97.78 1.75 1.75 1.75H8.5v-4h-4Z\"/>"],"table_dismiss":["24","<path d=\"M3 6.25C3 4.45 4.46 3 6.25 3h11.5C19.55 3 21 4.46 21 6.25v5.77c-.46-.3-.97-.53-1.5-.7V10h-4v1.31c-.53.18-1.04.42-1.5.71V10h-4v4h2.02c-.3.46-.53.97-.7 1.5H10v4h1.31c.18.53.42 1.04.71 1.5H6.25A3.25 3.25 0 0 1 3 17.75V6.25ZM6.25 4.5c-.97 0-1.75.78-1.75 1.75V8.5h4v-4H6.25ZM4.5 10v4h4v-4h-4Zm11-1.5h4V6.25c0-.97-.78-1.75-1.75-1.75H15.5v4Zm-1.5-4h-4v4h4v-4Zm-9.5 11v2.25c0 .97.78 1.75 1.75 1.75H8.5v-4h-4Zm18.5 2a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0Zm-5.5-.7-1.65-1.65a.5.5 0 0 0-.7.7l1.64 1.65-1.64 1.65a.5.5 0 0 0 .7.7l1.65-1.64 1.65 1.64a.5.5 0 0 0 .7-.7l-1.64-1.65 1.64-1.65a.5.5 0 0 0-.7-.7l-1.65 1.64Z\"/>"],"table_edit":["24","<path d=\"M3 6.25C3 4.45 4.45 3 6.25 3h11.5C19.55 3 21 4.45 21 6.25v4.76a3.3 3.3 0 0 0-1.5.22V10h-4v4h.85L14 16.35v-.85h-4v4h1.54l-.02.08-.36 1.42H6.25A3.25 3.25 0 0 1 3 17.75V6.25ZM6.25 4.5c-.97 0-1.75.78-1.75 1.75V8.5h4v-4H6.25ZM4.5 10v4h4v-4h-4Zm5.5 0v4h4v-4h-4Zm5.5-1.5h4V6.25c0-.97-.78-1.75-1.75-1.75H15.5v4Zm-1.5-4h-4v4h4v-4Zm-9.5 11v2.25c0 .97.78 1.75 1.75 1.75H8.5v-4h-4Zm15.26-3.3a2.27 2.27 0 0 0-.66.47l-5.9 5.9a2.68 2.68 0 0 0-.71 1.25l-.46 1.83c-.2.8.52 1.52 1.32 1.32l1.83-.46c.47-.12.9-.36 1.25-.7l5.9-5.9a2.29 2.29 0 0 0-2.57-3.7Z\"/>"],"table_simple":["20","<path d=\"M3 5.5A2.5 2.5 0 0 1 5.5 3h9A2.5 2.5 0 0 1 17 5.5v9a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 3 14.5v-9Zm1 5v4c0 .83.67 1.5 1.5 1.5h4v-5.5H4Zm5.5-1V4h-4C4.67 4 4 4.67 4 5.5v4h5.5Zm1 1V16h4c.83 0 1.5-.67 1.5-1.5v-4h-5.5Zm5.5-1v-4c0-.83-.67-1.5-1.5-1.5h-4v5.5H16Z\"/>"],"target_arrow":["24","<path d=\"M12 2c1.2 0 2.36.21 3.42.6l-1.19 1.2a8.51 8.51 0 1 0 5.97 5.97l1.2-1.2A10 10 0 1 1 12 2Zm0 4c.52 0 1.02.07 1.5.19v1.57a4.5 4.5 0 1 0 2.74 2.74h1.57A6.01 6.01 0 1 1 12 6Zm2 6a2 2 0 1 1-1.22-1.84l1.72-1.72V5.25c0-.2.08-.39.22-.53l2.5-2.5a.75.75 0 0 1 1.28.53V5.5h2.75a.75.75 0 0 1 .53 1.28l-2.5 2.5a.75.75 0 0 1-.53.22h-3.19l-1.72 1.72c.1.24.16.5.16.78Zm4.44-4 1-1h-1.69a.75.75 0 0 1-.75-.75V4.56l-1 1v2.38a.7.7 0 0 1 .06.06h2.38Z\"/>"],"text_field":["24","<path d=\"M15.5 7.5h-2.75v9h.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1 0-1.5h.5v-9H8.5v.75a.75.75 0 1 1-1.5 0v-1.5c0-.41.34-.75.75-.75h8.5c.41 0 .75.34.75.75v1.5a.75.75 0 0 1-1.5 0V7.5ZM5.75 3A3.75 3.75 0 0 0 2 6.75v10.5A3.75 3.75 0 0 0 5.75 21h12.5A3.75 3.75 0 0 0 22 17.25V6.75A3.75 3.75 0 0 0 18.25 3H5.75ZM3.5 6.75c0-1.24 1-2.25 2.25-2.25h12.5c1.24 0 2.25 1 2.25 2.25v10.5c0 1.24-1 2.25-2.25 2.25H5.75c-1.24 0-2.25-1-2.25-2.25V6.75Z\"/>"]};
  const fl = (n, cls = "") => { const x = FL[n]; return x ? `<svg class="fl ${cls}" viewBox="0 0 ${x[0]} ${x[0]}" fill="currentColor" aria-hidden="true">${x[1]}</svg>` : ""; };
  const ICO = {
    card: '<svg viewBox="0 0 20 20"><rect x="2" y="5" width="16" height="10" rx="1.5" fill="none" stroke="currentColor"/><text x="10" y="13" font-size="7" text-anchor="middle" fill="currentColor" font-weight="700">123</text></svg>',
    column: '<svg viewBox="0 0 20 20"><rect x="3" y="9" width="3" height="8" fill="currentColor"/><rect x="8.5" y="4" width="3" height="13" fill="currentColor"/><rect x="14" y="11" width="3" height="6" fill="currentColor"/></svg>',
    bar: '<svg viewBox="0 0 20 20"><rect x="3" y="3" width="8" height="3" fill="currentColor"/><rect x="3" y="8.5" width="14" height="3" fill="currentColor"/><rect x="3" y="14" width="5" height="3" fill="currentColor"/></svg>',
    line: '<svg viewBox="0 0 20 20"><polyline points="2,15 7,9 11,12 18,4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    area: '<svg viewBox="0 0 20 20"><polygon points="2,17 2,13 7,8 11,11 18,4 18,17" fill="currentColor" opacity=".55"/><polyline points="2,13 7,8 11,11 18,4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
    donut: '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="26 15"/></svg>',
    table: '<svg viewBox="0 0 20 20"><rect x="2.5" y="3.5" width="15" height="13" fill="none" stroke="currentColor"/><path d="M2.5 7.5h15M2.5 11.5h15M8 3.5v13" stroke="currentColor"/></svg>',
    matrix: '<svg viewBox="0 0 20 20"><rect x="2.5" y="3.5" width="15" height="13" fill="none" stroke="currentColor"/><path d="M2.5 7.5h15M7 3.5v13M12 7.5v9" stroke="currentColor"/><rect x="2.5" y="3.5" width="4.5" height="13" fill="currentColor" opacity=".25"/></svg>',
    slicer: '<svg viewBox="0 0 20 20"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor"/><circle cx="7" cy="5" r="1.8" fill="currentColor"/><circle cx="13" cy="10" r="1.8" fill="currentColor"/><circle cx="9" cy="15" r="1.8" fill="currentColor"/></svg>',
    informe: '<svg viewBox="0 0 24 24"><rect x="4" y="12" width="3" height="8" fill="currentColor"/><rect x="10.5" y="6" width="3" height="14" fill="currentColor"/><rect x="17" y="9" width="3" height="11" fill="currentColor"/></svg>',
    tabla: '<svg viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 4.5v15M15 4.5v15" stroke="currentColor" stroke-width="1.2"/></svg>',
    modelo: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="7" height="6" fill="none" stroke="currentColor" stroke-width="1.4"/><rect x="14" y="14" width="7" height="6" fill="none" stroke="currentColor" stroke-width="1.4"/><rect x="14" y="4" width="7" height="6" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M10 7h4M17.5 10v4" stroke="currentColor" stroke-width="1.4"/></svg>',
  };
  const TIPOS = {
    card: { n: 'Tarjeta', pozos: [['valores', 'Campos', 1, 'valor']] },
    column: { n: 'Gráfico de columnas agrupadas', pozos: [['x', 'Eje X', 1, 'cat'], ['y', 'Eje Y', 3, 'valor'], ['leyenda', 'Leyenda', 1, 'cat']] },
    bar: { n: 'Gráfico de barras agrupadas', pozos: [['x', 'Eje Y', 1, 'cat'], ['y', 'Eje X', 3, 'valor'], ['leyenda', 'Leyenda', 1, 'cat']] },
    line: { n: 'Gráfico de líneas', pozos: [['x', 'Eje X', 1, 'cat'], ['y', 'Eje Y', 3, 'valor'], ['leyenda', 'Leyenda', 1, 'cat']] },
    area: { n: 'Gráfico de áreas', pozos: [['x', 'Eje X', 1, 'cat'], ['y', 'Eje Y', 3, 'valor'], ['leyenda', 'Leyenda', 1, 'cat']] },
    donut: { n: 'Gráfico de anillos', pozos: [['x', 'Leyenda', 1, 'cat'], ['y', 'Valores', 1, 'valor']] },
    table: { n: 'Tabla', pozos: [['cols', 'Columnas', 10, 'mixto']] },
    matrix: { n: 'Matriz', pozos: [['x', 'Filas', 1, 'cat'], ['leyenda', 'Columnas', 1, 'cat'], ['y', 'Valores', 1, 'valor']] },
    slicer: { n: 'Segmentación de datos', pozos: [['x', 'Campo', 1, 'cat']] },
  };

  // ---------------------------------------------------------------- estado y datos importados
  const NUEVO = () => ({ vista: 'informe', pagina: 0, paginas: [{ nombre: 'Página 1', visuales: [], filtros: [] }], medidas: [], tablas: {}, rels: [], sel: null, cruz: null, publicado: false, reto: true, tablaDatos: null, nombreArchivo: 'Sin título' });
  const CLAVE_DATOS = 'academia-pbi-datos';
  let S, Store, toast, SQLc, main, DATOS = {}, db = null, dbVersion = -1, version = 0;
  function cargarDatos() { try { DATOS = JSON.parse(localStorage.getItem(CLAVE_DATOS) || '{}'); } catch (e) { DATOS = {}; } }
  function guardarDatos() { try { localStorage.setItem(CLAVE_DATOS, JSON.stringify(DATOS)); return true; } catch (e) { toast('Los datos son grandes para guardarlos en el navegador: vas a poder usarlos en esta sesión, pero no se guardan al cerrar.', 5000); return false; } }
  const guardar = () => { Store.data.powerbi = S; Store.saveSoon(); };
  const pag = () => S.paginas[S.pagina];
  const vis = (id) => pag().visuales.find((v) => v.id === id);
  const cambioModelo = () => { version++; };

  // ---------------------------------------------------------------- lectura de archivos
  function parseCsv(texto) {
    texto = texto.replace(/^﻿/, '');
    const primera = texto.split(/\r?\n/)[0] || '';
    const sep = [',', ';', '\t', '|'].sort((a, b) => primera.split(b).length - primera.split(a).length)[0];
    const filas = []; let fila = [], campo = '', comillas = false;
    for (let i = 0; i < texto.length; i++) {
      const c = texto[i];
      if (comillas) { if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; } else if (c === '"') comillas = false; else campo += c; continue; }
      if (c === '"') comillas = true;
      else if (c === sep) { fila.push(campo); campo = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && texto[i + 1] === '\n') i++; fila.push(campo); filas.push(fila); fila = []; campo = ''; }
      else campo += c;
    }
    if (campo || fila.length) { fila.push(campo); filas.push(fila); }
    return filas.filter((f) => f.length > 1 || (f[0] || '').trim() !== '');
  }
  function deJson(obj) {
    const tablas = [];
    const aTabla = (nombre, arr) => { if (!Array.isArray(arr) || !arr.length) return; if (typeof arr[0] !== 'object' || arr[0] === null) { tablas.push({ nombre, filas: [['valor'], ...arr.map((x) => [x])] }); return; } const cols = [...new Set(arr.flatMap((o) => Object.keys(o || {})))]; tablas.push({ nombre, filas: [cols, ...arr.map((o) => cols.map((c) => (o[c] !== null && typeof o[c] === 'object' ? JSON.stringify(o[c]) : o[c] ?? '')))] }); };
    if (Array.isArray(obj)) aTabla('Tabla', obj); else if (obj && typeof obj === 'object') for (const [k, v] of Object.entries(obj)) { if (Array.isArray(v)) aTabla(k, v); else if (v && typeof v === 'object') for (const [k2, v2] of Object.entries(v)) if (Array.isArray(v2)) aTabla(k2, v2); }
    return tablas;
  }
  async function cargarSheetJS() {
    if (window.XLSX) return window.XLSX;
    await new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar el lector de Excel (SheetJS). Revisa tu conexión.')); document.head.appendChild(s); });
    return window.XLSX;
  }
  async function leerArchivo(file) {
    const nombre = file.name.replace(/\.[^.]+$/, '');
    if (/\.(xlsx|xlsm|xls|ods)$/i.test(file.name)) {
      const X = await cargarSheetJS(); const wb = X.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      return wb.SheetNames.map((h) => ({ nombre: h, filas: X.utils.sheet_to_json(wb.Sheets[h], { header: 1, raw: true, defval: '' }).map((f) => f.map((x) => (x instanceof Date ? x.toISOString().slice(0, 10) : x))) })).filter((t) => t.filas.length);
    }
    const texto = await file.text();
    if (/\.json$/i.test(file.name)) return deJson(JSON.parse(texto));
    return [{ nombre, filas: parseCsv(texto) }];
  }

  // ---------------------------------------------------------------- tipos y Power Query
  const esFechaTxt = (v) => typeof v === 'string' && (/^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?/.test(v) || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v));
  const aNum = (v) => { if (typeof v === 'number') return v; if (v === '' || v == null) return null; const s = String(v).trim().replace(/\s/g, ''); const x = /^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : /^-?\d+,\d+$/.test(s) ? s.replace(',', '.') : s.replace(/^\$/, ''); const n = Number(x); return isNaN(n) ? null : n; };
  const aFecha = (v) => { if (v == null || v === '') return null; const s = String(v); let m = /^(\d{4}-\d{2}-\d{2})/.exec(s); if (m) return m[1]; m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s); if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; return null; };
  function detectarTipo(vals) {
    const v = vals.filter((x) => x !== '' && x != null).slice(0, 300);
    if (!v.length) return 'texto';
    if (v.every((x) => typeof x === 'boolean' || /^(true|false|verdadero|falso)$/i.test(String(x)))) return 'bool';
    if (v.every((x) => typeof x === 'number' || aNum(x) !== null && /^[-$\d.,\s]+$/.test(String(x)))) return v.every((x) => Number.isInteger(aNum(x))) ? 'int' : 'num';
    if (v.every(esFechaTxt)) return 'fecha';
    return 'texto';
  }
  const convertir = (v, t) => (t === 'num' ? aNum(v) : t === 'int' ? (aNum(v) === null ? null : Math.round(aNum(v))) : t === 'fecha' ? aFecha(v) : t === 'bool' ? (v === '' || v == null ? null : /^(true|verdadero|1)$/i.test(String(v)) ? 1 : 0) : v == null ? null : String(v));
  function crudo(nombre) {
    const t = S.tablas[nombre]; if (!t) return { cols: [], rows: [] };
    if (t.fuente.tipo === 'curso') { const T = SQLc.tables[t.fuente.ref]; return T ? { cols: T.columns.slice(), rows: T.rows, yaTipado: true } : { cols: [], rows: [] }; }
    const d = DATOS[t.fuente.clave]; if (!d) return { cols: [], rows: [] };
    return { cols: d.filas[0] ? d.filas[0].map((x, i) => `Column${i + 1}`) : [], rows: d.filas, sinEncabezado: true };
  }
  // aplica los pasos de Power Query; devuelve columnas con tipo y filas
  function aplicar(nombre, hasta) {
    const t = S.tablas[nombre], c = crudo(nombre);
    let cols = c.cols.map((n) => ({ n, t: 'texto' })), rows = c.rows;
    if (c.yaTipado) cols = c.cols.map((n, i) => ({ n, t: detectarTipo(rows.slice(0, 300).map((r) => r[i])) }));
    const pasos = t.pasos.slice(0, hasta === undefined ? t.pasos.length : hasta);
    for (const p of pasos) {
      const i = (n) => cols.findIndex((x) => x.n === n);
      if (p.tipo === 'encabezados') { if (rows.length) { cols = rows[0].map((n, k) => ({ n: String(n || `Column${k + 1}`).trim() || `Column${k + 1}`, t: 'texto' })); rows = rows.slice(1); } }
      else if (p.tipo === 'tipos') { const tipos = cols.map((x) => p.mapa[x.n] || x.t); rows = rows.map((r) => r.map((v, k) => convertir(v, tipos[k]))); cols = cols.map((x, k) => ({ n: x.n, t: tipos[k] })); }
      else if (p.tipo === 'quitar') { const idx = p.cols.map(i).filter((k) => k >= 0); cols = cols.filter((_, k) => !idx.includes(k)); rows = rows.map((r) => r.filter((_, k) => !idx.includes(k))); }
      else if (p.tipo === 'renombrar') { const k = i(p.col); if (k >= 0) cols = cols.map((x, j) => (j === k ? { ...x, n: p.a } : x)); }
      else if (p.tipo === 'filtrar') { const k = i(p.col); if (k >= 0) rows = rows.filter((r) => { const v = r[k]; if (p.op === 'novacio') return v !== null && v !== ''; if (p.op === '=') return String(v) === String(p.val); if (p.op === '<>') return String(v) !== String(p.val); if (p.op === '>') return Number(v) > Number(p.val); if (p.op === '<') return Number(v) < Number(p.val); return true; }); }
      else if (p.tipo === 'reemplazar') { const k = i(p.col); if (k >= 0) rows = rows.map((r) => r.map((v, j) => (j === k && String(v) === String(p.de) ? p.a : v))); }
      else if (p.tipo === 'duplicados') { const idx = (p.cols && p.cols.length ? p.cols : cols.map((x) => x.n)).map(i); const vistos = new Set(); rows = rows.filter((r) => { const key = JSON.stringify(idx.map((k) => r[k])); if (vistos.has(key)) return false; vistos.add(key); return true; }); }
      else if (p.tipo === 'ordenar') { const k = i(p.col); if (k >= 0) rows = rows.slice().sort((a, b) => (a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0) * (p.desc ? -1 : 1)); }
      else if (p.tipo === 'mayus') { const k = i(p.col); if (k >= 0) rows = rows.map((r) => r.map((v, j) => (j === k && typeof v === 'string' ? (p.modo === 'recortar' ? v.trim() : p.modo === 'min' ? v.toLowerCase() : v.toUpperCase()) : v))); }
    }
    return { cols, rows };
  }
  const nombrePaso = (p) => ({ origen: 'Origen', encabezados: 'Encabezados promovidos', tipos: 'Tipo cambiado', quitar: 'Columnas quitadas', renombrar: 'Columnas con nombre cambiado', filtrar: 'Filas filtradas', reemplazar: 'Valor reemplazado', duplicados: 'Duplicados quitados', ordenar: 'Filas ordenadas', mayus: 'Texto transformado' }[p.tipo] || p.tipo);
  function formulaM(p, anterior) {
    const a = `#"${anterior}"`;
    if (p.tipo === 'origen') return p.m || '= Origen';
    if (p.tipo === 'encabezados') return `= Table.PromoteHeaders(${a}, [PromoteAllScalars=true])`;
    if (p.tipo === 'tipos') return `= Table.TransformColumnTypes(${a},{${Object.entries(p.mapa).map(([c, t]) => `{"${c}", ${{ num: 'type number', int: 'Int64.Type', texto: 'type text', fecha: 'type date', bool: 'type logical' }[t]}}`).join(', ')}})`;
    if (p.tipo === 'quitar') return `= Table.RemoveColumns(${a},{${p.cols.map((c) => `"${c}"`).join(', ')}})`;
    if (p.tipo === 'renombrar') return `= Table.RenameColumns(${a},{{"${p.col}", "${p.a}"}})`;
    if (p.tipo === 'filtrar') return `= Table.SelectRows(${a}, each ${p.op === 'novacio' ? `[${p.col}] <> null and [${p.col}] <> ""` : `[${p.col}] ${p.op} ${isNaN(Number(p.val)) ? `"${p.val}"` : p.val}`})`;
    if (p.tipo === 'reemplazar') return `= Table.ReplaceValue(${a},"${p.de}","${p.a}",Replacer.ReplaceValue,{"${p.col}"})`;
    if (p.tipo === 'duplicados') return `= Table.Distinct(${a}${p.cols && p.cols.length ? `, {${p.cols.map((c) => `"${c}"`).join(', ')}}` : ''})`;
    if (p.tipo === 'ordenar') return `= Table.Sort(${a},{{"${p.col}", Order.${p.desc ? 'Descending' : 'Ascending'}}})`;
    if (p.tipo === 'mayus') return `= Table.TransformColumns(${a},{{"${p.col}", ${p.modo === 'recortar' ? 'Text.Trim' : p.modo === 'min' ? 'Text.Lower' : 'Text.Upper'}, type text}})`;
    return '';
  }
  function registrarTabla(nombre, fuente, pasosIniciales) {
    let n = nombre.trim() || 'Tabla', k = 2; while (S.tablas[n]) n = `${nombre} (${k++})`;
    S.tablas[n] = { fuente, pasos: pasosIniciales || [] };
    // tipos detectados automáticamente, como hace Power BI al importar
    const r = aplicar(n);
    const mapa = {}; r.cols.forEach((c, i) => { mapa[c.n] = detectarTipo(r.rows.slice(0, 300).map((x) => x[i])); });
    if (fuente.tipo !== 'curso') S.tablas[n].pasos.push({ tipo: 'tipos', mapa });
    cambioModelo(); return n;
  }
  // relaciones automáticas: misma columna en dos tablas y en una de ellas no se repite (lado 1)
  function autodetectar() {
    construir();
    const nombres = Object.keys(S.tablas), nuevas = [];
    for (const a of nombres) for (const b of nombres) {
      if (a === b) continue;
      for (const c of meta(a)) {
        if (!meta(b).some((x) => x.n === c.n) || !/(_id|id|_key|key|codigo|código|sku)$/i.test(c.n)) continue;
        if (S.rels.some((r) => (r.de === a && r.a === b) || (r.de === b && r.a === a))) continue;
        const unicoB = ejecutar(`SELECT COUNT(*) = COUNT(DISTINCT ${q(c.n)}) AND COUNT(*) > 0 FROM ${q(b)}`)[0][0], unicoA = ejecutar(`SELECT COUNT(*) = COUNT(DISTINCT ${q(c.n)}) FROM ${q(a)}`)[0][0];
        if (unicoB && !unicoA) { S.rels.push({ de: a, cde: c.n, a: b, ca: c.n }); nuevas.push(`${a}[${c.n}] * → 1 ${b}[${c.n}]`); }
      }
    }
    return nuevas;
  }

  // ---------------------------------------------------------------- la base SQLite del informe
  const meta = (t) => (S.tablas[t] && S.tablas[t]._cols) || [];
  function construir() {
    if (db && dbVersion === version) return db;
    if (db) db.close();
    db = new SQLc._SQL.Database();
    for (const [n, t] of Object.entries(S.tablas)) {
      const r = aplicar(n); t._cols = r.cols; t._filas = r.rows.length;
      const tipoSql = (x) => ({ num: 'REAL', int: 'INTEGER', bool: 'INTEGER' }[x] || 'TEXT');
      db.run(`CREATE TABLE ${q(n)} (${r.cols.map((c) => `${q(c.n)} ${tipoSql(c.t)}`).join(', ')})`);
      if (r.rows.length && r.cols.length) {
        const st = db.prepare(`INSERT INTO ${q(n)} VALUES (${r.cols.map(() => '?').join(',')})`);
        db.run('BEGIN'); for (const f of r.rows) st.run(r.cols.map((_, i) => (f[i] === undefined ? null : f[i]))); db.run('COMMIT'); st.free();
      }
    }
    dbVersion = version;
    return db;
  }
  const ejecutar = (sql) => { const r = construir().exec(sql); return r.length ? r[r.length - 1].values : []; };
  const tipoDe = (t, c) => (meta(t).find((x) => x.n === c) || {}).t;
  const esNum = (t, c) => ['num', 'int'].includes(tipoDe(t, c)) && !/(^id$|_id$|^id_|key$)/i.test(c);
  const colSql = (f) => (f.parte === 'anio' ? `substr(${q(f.t)}.${q(f.c)}, 1, 4)` : f.parte === 'trim' ? `substr(${q(f.t)}.${q(f.c)}, 1, 4) || '-T' || ((CAST(substr(${q(f.t)}.${q(f.c)}, 6, 2) AS INTEGER) + 2) / 3)` : f.parte === 'mes' ? `substr(${q(f.t)}.${q(f.c)}, 1, 7)` : `${q(f.t)}.${q(f.c)}`);
  const nomCampo = (f) => (f.medida ? f.medida : f.agg && f.agg !== 'none' ? `${AGG[f.agg][0]} de ${f.c}` : f.parte ? `${f.c} (${{ anio: 'Año', trim: 'Trimestre', mes: 'Mes' }[f.parte]})` : f.c);

  // ---------------------------------------------------------------- DAX → SQL
  function tokens(src) {
    const out = []; let i = 0;
    while (i < src.length) {
      const c = src[i];
      if (/\s/.test(c)) { i++; continue; }
      if (src.startsWith('//', i) || src.startsWith('--', i)) { while (i < src.length && src[i] !== '\n') i++; continue; }
      if (c === '"') { let j = i + 1; while (j < src.length && src[j] !== '"') j++; out.push({ k: 'str', v: src.slice(i + 1, j) }); i = j + 1; continue; }
      if (c === '[') { const j = src.indexOf(']', i); if (j < 0) throw new Error('Falta cerrar el corchete ]'); out.push({ k: 'medida', v: src.slice(i + 1, j) }); i = j + 1; continue; }
      if (/\d/.test(c)) { const m = /^\d+(\.\d+)?/.exec(src.slice(i)); out.push({ k: 'num', v: m[0] }); i += m[0].length; continue; }
      if (c === "'" || /[A-Za-z_À-ÿ]/.test(c)) {
        const m = c === "'" ? /^'([^']+)'/.exec(src.slice(i)) : /^[A-Za-z_À-ÿ][\wÀ-ÿ.]*/.exec(src.slice(i));
        if (!m) throw new Error('Nombre de tabla sin cerrar (falta una comilla simple)');
        const nombre = m[1] || m[0]; i += m[0].length;
        if (src[i] === '[') { const j = src.indexOf(']', i); out.push({ k: 'col', t: nombre, c: src.slice(i + 1, j) }); i = j + 1; } else out.push({ k: 'id', v: nombre.toUpperCase(), orig: nombre });
        continue;
      }
      const dos = src.slice(i, i + 2);
      if (['<=', '>=', '<>', '&&', '||'].includes(dos)) { out.push({ k: 'op', v: dos }); i += 2; continue; }
      if ('+-*/(),=<>{}'.includes(c)) { out.push({ k: 'op', v: c }); i++; continue; }
      throw new Error(`No entiendo el carácter "${c}"`);
    }
    return out;
  }
  const tablaPorNombre = (n) => Object.keys(S.tablas).find((x) => x.toLowerCase() === String(n).toLowerCase());
  function compilarDax(src, medidas, pila = [], condExt = null) {
    const tk = tokens(src); let p = 0; const tablas = new Set(), pisadas = new Set();
    const ver = () => tk[p], tomar = (v) => { const t = tk[p]; if (v && (!t || t.v !== v)) throw new Error(`Se esperaba "${v}"${t ? ` y apareció "${t.v || t.c}"` : ' y la fórmula terminó'}`); p++; return t; };
    const colRef = (t, iter) => {
      const tn = tablaPorNombre(t.t); if (!tn) throw new Error(`No existe la tabla '${t.t}'`);
      if (!meta(tn).some((x) => x.n === t.c)) throw new Error(`La tabla '${tn}' no tiene la columna [${t.c}]`);
      tablas.add(tn);
      if (!iter) throw new Error(`No se puede determinar un único valor para la columna '${tn}'[${t.c}]: envuélvela en una agregación (SUM, COUNT…) o usa una función X (SUMX).`);
      return `${q(tn)}.${q(t.c)}`;
    };
    const cc = (cond, x) => (cond ? `CASE WHEN ${cond} THEN ${x} END` : x);
    const unir = (a, b) => [a, b].filter(Boolean).join(' AND ') || null;
    function expr(cond, iter) { let a = term(cond, iter); while (ver() && (ver().v === '+' || ver().v === '-')) { const o = tomar().v; a = `(${a} ${o} ${term(cond, iter)})`; } return a; }
    function term(cond, iter) { let a = factor(cond, iter); while (ver() && (ver().v === '*' || ver().v === '/')) { const o = tomar().v; const b = factor(cond, iter); a = o === '/' ? `(1.0 * ${a} / NULLIF(${b}, 0))` : `(${a} * ${b})`; } return a; }
    // recorre hasta la coma o el paréntesis de cierre del nivel actual
    const saltarArg = () => { let prof = 0; const ini = p; while (p < tk.length && !(prof === 0 && (tk[p].v === ',' || tk[p].v === ')'))) { if (tk[p].v === '(' || tk[p].v === '{') prof++; if (tk[p].v === ')' || tk[p].v === '}') prof--; p++; } return [ini, p]; };
    function factor(cond, iter) {
      const t = tomar();
      if (!t) throw new Error('La fórmula terminó antes de tiempo');
      if (t.k === 'num') return t.v;
      if (t.k === 'str') return `'${t.v.replace(/'/g, "''")}'`;
      if (t.v === '(') { const e = expr(cond, iter); tomar(')'); return e; }
      if (t.v === '-') return `(-${factor(cond, iter)})`;
      if (t.k === 'col') return colRef(t, iter);
      if (t.k === 'medida') {
        const m = medidas.find((x) => x.nombre.toLowerCase() === t.v.toLowerCase());
        if (!m) { const tb = [...Object.keys(S.tablas)].find((tn) => meta(tn).some((x) => x.n === t.v)); if (tb && iter) return colRef({ t: tb, c: t.v }, iter); throw new Error(`No existe la medida [${t.v}]`); }
        if (pila.includes(m.nombre)) throw new Error(`La medida [${m.nombre}] depende de sí misma`);
        const r = compilarDax(m.expr, medidas, [...pila, m.nombre], cond);
        r.tablas.forEach((x) => tablas.add(x)); r.pisadas.forEach((x) => pisadas.add(x)); return `(${r.sql})`;
      }
      if (t.k !== 'id') throw new Error(`No esperaba "${t.v}"`);
      const f = t.v;
      if (f === 'TRUE' || f === 'FALSE') return f === 'TRUE' ? '1' : '0';
      if (f === 'BLANK') { if (ver() && ver().v === '(') { tomar('('); tomar(')'); } return 'NULL'; }
      tomar('(');
      const agg1 = (fn, distinct) => { const c = tomar(); if (!c || c.k !== 'col') throw new Error(`${f} recibe una columna, por ejemplo ${f}('Tabla'[columna])`); tomar(')'); return `${fn}(${distinct ? 'DISTINCT ' : ''}${cc(cond, colRef(c, true))})`; };
      if (f === 'SUM') return agg1('SUM');
      if (f === 'AVERAGE') return agg1('AVG');
      if (f === 'MIN') return agg1('MIN');
      if (f === 'MAX') return agg1('MAX');
      if (f === 'COUNT' || f === 'COUNTA') return agg1('COUNT');
      if (f === 'DISTINCTCOUNT') return agg1('COUNT', true);
      if (f === 'COUNTROWS') { const tt = tomar(); const nombre = tt && tablaPorNombre(tt.orig || tt.v); if (!nombre) throw new Error('COUNTROWS recibe una tabla, por ejemplo COUNTROWS(Ventas)'); tomar(')'); tablas.add(nombre); return `SUM(${cc(cond, '1')})`; }
      if (['SUMX', 'AVERAGEX', 'MAXX', 'MINX', 'COUNTX'].includes(f)) { const tt = tomar(); const nombre = tt && tablaPorNombre(tt.orig || tt.v); if (!nombre) throw new Error(`${f} recibe primero una tabla, por ejemplo ${f}(Ventas, Ventas[Cantidad] * Ventas[Precio])`); tablas.add(nombre); tomar(','); const e = expr(null, true); tomar(')'); return `${{ SUMX: 'SUM', AVERAGEX: 'AVG', MAXX: 'MAX', MINX: 'MIN', COUNTX: 'COUNT' }[f]}(${cc(cond, e)})`; }
      if (f === 'DIVIDE') { const a = expr(cond, iter); tomar(','); const b = expr(cond, iter); let alt = 'NULL'; if (ver() && ver().v === ',') { tomar(','); alt = expr(cond, iter); } tomar(')'); return `(CASE WHEN (${b}) = 0 OR (${b}) IS NULL THEN ${alt} ELSE 1.0 * (${a}) / (${b}) END)`; }
      if (f === 'RELATED') { const c = tomar(); if (!c || c.k !== 'col') throw new Error("RELATED recibe una columna de la tabla del lado 1, por ejemplo RELATED(Productos[Precio])"); tomar(')'); if (!iter) throw new Error('RELATED solo se usa dentro de una función X (SUMX, AVERAGEX…) que recorre fila por fila.'); return colRef(c, true); }
      if (f === 'ABS') { const a = expr(cond, iter); tomar(')'); return `ABS(${a})`; }
      if (f === 'ROUND') { const a = expr(cond, iter); tomar(','); const n = tomar(); tomar(')'); return `ROUND(${a}, ${n.v})`; }
      if (f === 'IF') { const c1 = expr(cond, iter); let cmp = null, c2 = null; if (ver() && ['=', '<', '>', '<=', '>=', '<>'].includes(ver().v)) { cmp = tomar().v; c2 = expr(cond, iter); } tomar(','); const a = expr(cond, iter); let b = 'NULL'; if (ver() && ver().v === ',') { tomar(','); b = expr(cond, iter); } tomar(')'); return `(CASE WHEN ${cmp ? `${c1} ${cmp} ${c2}` : c1} THEN ${a} ELSE ${b} END)`; }
      if (f === 'CALCULATE') {
        const [ini, fin] = saltarArg(); const conds = [];
        while (ver() && ver().v === ',') {
          tomar(',');
          const c = tomar(); if (!c || c.k !== 'col') throw new Error('Cada filtro de CALCULATE es una condición sobre una columna, por ejemplo Ventas[Canal] = "Web"');
          const col = colRef(c, true); pisadas.add(`${tablaPorNombre(c.t)}|${c.c}`); const op = tomar().v;
          if (op === 'IN') throw new Error('Usa IN con llaves: Tabla[col] IN {"a", "b"}');
          if (ver() && ver().v === '{') { tomar('{'); const vals = []; while (ver() && ver().v !== '}') { const v = tomar(); if (v.v !== ',') vals.push(v.k === 'str' ? `'${v.v}'` : v.v); } tomar('}'); conds.push(`${col} IN (${vals.join(', ')})`); }
          else if (op && op.toUpperCase && op.toUpperCase() === 'IN') { tomar('{'); }
          else { if (!['=', '<>', '<', '>', '<=', '>='].includes(op)) throw new Error(`Operador "${op}" no válido en el filtro`); const v = tomar(); conds.push(`${col} ${op} ${v.k === 'str' ? `'${v.v}'` : v.v}`); }
        }
        tomar(')');
        const resto = p; p = ini; const sub = tk.slice(ini, fin);
        const r = compilarDaxTokens(sub, medidas, pila, unir(unir(condExt, cond), conds.join(' AND ')), iter, tablas, pisadas);
        p = resto; return r;
      }
      throw new Error(`La función ${f} no está disponible en esta práctica (usa SUM, AVERAGE, MIN, MAX, COUNT, COUNTROWS, DISTINCTCOUNT, SUMX, AVERAGEX, RELATED, CALCULATE, DIVIDE, IF, ROUND, ABS)`);
    }
    const sql = expr(condExt, false);
    if (p < tk.length) throw new Error(`Sobra "${tk[p].v || tk[p].c}" al final de la fórmula`);
    return { sql, tablas: [...tablas], pisadas: [...pisadas] };
  }
  function compilarDaxTokens(tk, medidas, pila, cond, iter, tablasExt, pisadasExt) {
    // vuelve a armar el texto de los tokens y lo compila con la condición de CALCULATE
    const texto = tk.map((t) => (t.k === 'str' ? `"${t.v}"` : t.k === 'medida' ? `[${t.v}]` : t.k === 'col' ? `'${t.t}'[${t.c}]` : t.k === 'id' ? (t.orig.includes(' ') ? `'${t.orig}'` : t.orig) : t.v)).join(' ');
    const r = compilarDax(texto, medidas, pila, cond);
    r.tablas.forEach((x) => tablasExt.add(x)); r.pisadas.forEach((x) => pisadasExt.add(x));
    return r.sql;
  }

  // ---------------------------------------------------------------- consultas de los visuales
  function alcanzables(desde) { const v = new Set([desde]), cola = [desde]; while (cola.length) { const t = cola.shift(); for (const r of S.rels) if (r.de === t && !v.has(r.a)) { v.add(r.a); cola.push(r.a); } } return v; }
  function joins(fact, necesarias) {
    const prev = { [fact]: null }, cola = [fact];
    while (cola.length) { const t = cola.shift(); for (const r of S.rels) if (r.de === t && !(r.a in prev)) { prev[r.a] = r; cola.push(r.a); } }
    const usados = new Set(), out = [];
    for (const t of necesarias) {
      if (t === fact) continue;
      if (!(t in prev)) return { error: t };
      const camino = []; for (let x = t; prev[x]; x = prev[x].de) camino.unshift(prev[x]);
      for (const r of camino) if (!usados.has(r.a)) { usados.add(r.a); out.push(`LEFT JOIN ${q(r.a)} ON ${q(r.a)}.${q(r.ca)} = ${q(r.de)}.${q(r.cde)}`); }
    }
    return { sql: out.join('\n') };
  }
  function valorSql(v) {
    if (v.medida) { const m = S.medidas.find((x) => x.nombre === v.medida); if (!m) throw new Error(`La medida [${v.medida}] ya no existe`); return compilarDax(m.expr, S.medidas); }
    return { sql: v.agg === 'distinct' ? `COUNT(DISTINCT ${q(v.t)}.${q(v.c)})` : `${AGG[v.agg || 'count'][1]}(${q(v.t)}.${q(v.c)})`, tablas: [v.t], pisadas: [] };
  }
  function filtrosDe(excluir) {
    const out = [];
    for (const f of pag().filtros) if (f.valores && f.valores.length) out.push(f);
    for (const v of pag().visuales) if (v.tipo === 'slicer' && v.id !== excluir && v.pozos.x && v.pozos.x[0] && (v.slicerSel || []).length) out.push({ campo: v.pozos.x[0], valores: v.slicerSel });
    if (S.cruz && S.cruz.visual !== excluir) out.push({ campo: S.cruz.campo, valores: [S.cruz.valor] });
    return out;
  }
  const lit = (x) => (x === null ? 'NULL' : typeof x === 'number' ? x : `'${String(x).replace(/'/g, "''")}'`);
  function consultar(cats, valor, filtros) {
    const m = valorSql(valor);
    // como en DAX: un filtro de CALCULATE sobre una columna reemplaza al filtro de la segmentación sobre esa misma columna
    filtros = filtros.filter((f) => f.campo.parte || !m.pisadas.includes(`${f.campo.t}|${f.campo.c}`));
    const tm = m.tablas.length ? m.tablas : [cats[0] ? cats[0].t : Object.keys(S.tablas)[0]];
    const fact = tm.find((t) => tm.every((o) => alcanzables(t).has(o))) || tm[0];
    const nec = new Set([...tm, ...cats.map((c) => c.t), ...filtros.map((f) => f.campo.t)]);
    const j = joins(fact, [...nec]);
    if (j.error) throw Object.assign(new Error(`No hay una relación que lleve el filtro de "${j.error}" hasta "${fact}". En Power BI el filtro viaja del lado 1 al lado * de una relación: créala en la vista Modelo (Administrar relaciones).`), { relacion: true });
    const where = filtros.map((f) => (f.valores.includes(null) ? `(${colSql(f.campo)} IN (${f.valores.filter((x) => x !== null).map(lit).join(', ') || 'NULL'}) OR ${colSql(f.campo)} IS NULL)` : `${colSql(f.campo)} IN (${f.valores.map(lit).join(', ')})`));
    const sql = `SELECT ${[...cats.map((c, i) => `${colSql(c)} AS c${i}`), `${m.sql} AS v`].join(', ')}\nFROM ${q(fact)}\n${j.sql}${where.length ? `\nWHERE ${where.join(' AND ')}` : ''}${cats.length ? `\nGROUP BY ${cats.map((_, i) => `c${i}`).join(', ')}` : ''}`;
    return { filas: ejecutar(sql), sql };
  }
  const esFechaCampo = (f) => !!f.parte || tipoDe(f.t, f.c) === 'fecha';
  function datosVisual(v) {
    const filtros = filtrosDe(v.id), P = v.pozos;
    if (v.tipo === 'slicer') { const c = P.x && P.x[0]; if (!c) return null; return { valores: ejecutar(`SELECT DISTINCT ${colSql(c)} FROM ${q(c.t)} ORDER BY 1`).map((x) => x[0]) }; }
    if (v.tipo === 'card') { const val = P.valores && P.valores[0]; if (!val) return null; const r = consultar([], val, filtros); return { valor: r.filas[0] ? r.filas[0][0] : null, sql: r.sql }; }
    if (v.tipo === 'table') {
      const cols = P.cols || []; if (!cols.length) return null;
      const cats = cols.filter((x) => !x.medida && (!x.agg || x.agg === 'none')), vals = cols.filter((x) => x.medida || (x.agg && x.agg !== 'none'));
      if (!vals.length) { const j = joins(cats[0].t, cats.map((c) => c.t)); if (j.error) throw new Error(`No hay relación entre ${cats[0].t} y ${j.error}`); return { cab: cols.map(nomCampo), filas: ejecutar(`SELECT DISTINCT ${cats.map((c, i) => `${colSql(c)} AS c${i}`).join(', ')} FROM ${q(cats[0].t)} ${j.sql} ORDER BY 1 LIMIT 1000`), ncat: cats.length }; }
      const mapa = new Map(); let sql = '';
      vals.forEach((val, k) => { const r = consultar(cats, val, filtros); sql = r.sql; for (const f of r.filas) { const key = JSON.stringify(f.slice(0, cats.length)); if (!mapa.has(key)) mapa.set(key, [...f.slice(0, cats.length), ...vals.map(() => null)]); mapa.get(key)[cats.length + k] = f[cats.length]; } });
      const filas = [...mapa.values()].sort((a, b) => (b[cats.length] ?? 0) - (a[cats.length] ?? 0)).slice(0, 1000);
      return { cab: [...cats.map(nomCampo), ...vals.map(nomCampo)], filas, total: cats.length ? vals.map((val) => (consultar([], val, filtros).filas[0] || [null])[0]) : null, ncat: cats.length, sql };
    }
    if (v.tipo === 'matrix') {
      const x = P.x && P.x[0], col = P.leyenda && P.leyenda[0], y = P.y && P.y[0]; if (!x || !y) return null;
      const r = consultar(col ? [x, col] : [x], y, filtros);
      const filasK = [...new Set(r.filas.map((f) => f[0]))].sort((a, b) => (a < b ? -1 : 1)), colsK = col ? [...new Set(r.filas.map((f) => f[1]))].sort((a, b) => (a < b ? -1 : 1)).slice(0, 12) : ['Total'];
      const val = (a, b) => { const f = r.filas.find((z) => z[0] === a && (!col || z[1] === b)); return f ? f[f.length - 1] : null; };
      return { matriz: true, cab: [nomCampo(x), ...colsK.map(String)], filas: filasK.map((a) => [a, ...colsK.map((b) => val(a, b))]), sql: r.sql };
    }
    const x = P.x && P.x[0], ys = P.y || [], ley = P.leyenda && P.leyenda[0];
    if (!x || !ys.length) return null;
    if (ley) {
      const r = consultar([x, ley], ys[0], filtros);
      let cats = [...new Set(r.filas.map((f) => f[0]))]; if (esFechaCampo(x) || v.tipo === 'line' || v.tipo === 'area') cats.sort();
      const series = [...new Set(r.filas.map((f) => f[1]))].slice(0, 10);
      return { cats: cats.slice(0, 400), series: series.map((s) => ({ nombre: String(s ?? '(en blanco)'), vals: Object.fromEntries(r.filas.filter((f) => f[1] === s).map((f) => [f[0], f[2]])) })), sql: r.sql };
    }
    const series = ys.map((y) => { const r = consultar([x], y, filtros); return { nombre: nomCampo(y), vals: Object.fromEntries(r.filas.map((f) => [f[0], f[1]])), sql: r.sql }; });
    let cats = [...new Set(series.flatMap((s) => Object.keys(s.vals)))];
    cats = esFechaCampo(x) || v.tipo === 'line' || v.tipo === 'area' ? cats.sort() : cats.sort((a, b) => (series[0].vals[b] ?? 0) - (series[0].vals[a] ?? 0));
    return { cats: cats.slice(0, ['line', 'area'].includes(v.tipo) ? 400 : 40), series, sql: series[0].sql };
  }
  const fmt = (n) => (n == null ? '(En blanco)' : typeof n !== 'number' ? String(n) : Math.abs(n) >= 1e9 ? (n / 1e9).toLocaleString('es', { maximumFractionDigits: 2 }) + ' mil M' : Math.abs(n) >= 1e6 ? (n / 1e6).toLocaleString('es', { maximumFractionDigits: 2 }) + ' M' : Math.abs(n) >= 1e3 ? (n / 1e3).toLocaleString('es', { maximumFractionDigits: 2 }) + ' mil' : n.toLocaleString('es', { maximumFractionDigits: 2 }));
  const fmtCel = (x) => (typeof x === 'number' ? x.toLocaleString('es', { maximumFractionDigits: 2 }) : x ?? '');

  // ---------------------------------------------------------------- dibujar visuales
  function dibujar(v, el) {
    const cuerpo = el.querySelector('.pb-v-cuerpo');
    let d;
    try { d = datosVisual(v); } catch (e) { cuerpo.innerHTML = `<div class="pb-v-error"><b>No se puede mostrar este objeto visual.</b><br>${esc(e.message)}</div>`; return; }
    if (!d) { cuerpo.innerHTML = `<div class="pb-v-vacio"><span class="pb-v-vacio-ic">${ICO[v.tipo]}</span>Agregue datos a su objeto visual<br><small>Arrastre campos desde el panel Datos</small></div>`; return; }
    const W = Math.max(120, el.clientWidth - 16), H = Math.max(70, el.clientHeight - (v.formato.titulo === '-' ? 14 : 40));
    const color = v.formato.color || PALETA[0], etq = v.formato.etiquetas;
    const selec = (c) => S.cruz && S.cruz.visual === v.id && String(S.cruz.valor) === String(c);
    const aten = (c) => S.cruz && S.cruz.visual === v.id && String(S.cruz.valor) !== String(c);
    if (v.tipo === 'card') { cuerpo.innerHTML = `<div class="pb-card"><b style="font-size:${Math.max(18, Math.min(H * 0.45, W / Math.max(4, fmt(d.valor).length) * 1.6))}px">${esc(fmt(d.valor))}</b><span>${esc(nomCampo(v.pozos.valores[0]))}</span></div>`; return; }
    if (v.tipo === 'slicer') { const sel = new Set((v.slicerSel || []).map(String)); cuerpo.innerHTML = `<div class="pb-slicer">${d.valores.slice(0, 300).map((x) => `<label><input type="checkbox" data-sl="${esc(x ?? '')}" ${sel.has(String(x)) ? 'checked' : ''}><span>${esc(x ?? '(En blanco)')}</span></label>`).join('')}</div>`; return; }
    if (v.tipo === 'table' || v.tipo === 'matrix') {
      cuerpo.innerHTML = `<div class="pb-tabla"><table><thead><tr>${d.cab.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${d.filas.map((f) => `<tr data-cat="${esc(f[0])}" class="${selec(f[0]) ? 'sel' : ''}">${f.map((x) => `<td class="${typeof x === 'number' ? 'num' : ''}">${esc(fmtCel(x))}</td>`).join('')}</tr>`).join('')}</tbody>${d.total ? `<tfoot><tr><td colspan="${d.ncat}">Total</td>${d.total.map((x) => `<td class="num">${esc(fmtCel(x))}</td>`).join('')}</tr></tfoot>` : ''}</table></div>`;
      return;
    }
    const series = d.series, cats = d.cats, col = (i) => (i ? PALETA[i % PALETA.length] : color);
    const max = Math.max(1e-9, ...series.flatMap((s) => cats.map((c) => s.vals[c] || 0)));
    const leyenda = series.length > 1 ? `<div class="pb-ley">${series.map((s, i) => `<span><i style="background:${col(i)}"></i>${esc(s.nombre)}</span>`).join('')}</div>` : '';
    const tip = (c, s) => `<title>${esc(c)}\n${esc(s.nombre)}: ${esc(fmtCel(s.vals[c]))}</title>`;
    if (v.tipo === 'donut') {
      const s = series[0], tot = cats.reduce((a, c) => a + (s.vals[c] || 0), 0) || 1, r = Math.max(20, Math.min(W * 0.3, H / 2 - 10)), cx = r + 12, cy = H / 2;
      let ang = -Math.PI / 2;
      const arcos = cats.slice(0, 10).map((c, i) => { const f = (s.vals[c] || 0) / tot, a2 = ang + f * Math.PI * 2, gr = f > 0.5 ? 1 : 0, pt = (a, rr) => `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`; const path = `M${pt(ang, r)} A${r},${r} 0 ${gr} 1 ${pt(a2 - 1e-4, r)} L${pt(a2 - 1e-4, r * 0.58)} A${r * 0.58},${r * 0.58} 0 ${gr} 0 ${pt(ang, r * 0.58)} Z`; ang = a2; return `<path d="${path}" fill="${PALETA[i % PALETA.length]}" data-cat="${esc(c)}" opacity="${aten(c) ? 0.3 : 1}">${tip(c, s)}</path>`; });
      cuerpo.innerHTML = `<div class="pb-donut"><svg width="${2 * r + 24}" height="${H}">${arcos.join('')}</svg><div class="pb-ley pb-ley-v">${cats.slice(0, 10).map((c, i) => `<span><i style="background:${PALETA[i % PALETA.length]}"></i>${esc(c)} <small>${fmt(s.vals[c])} (${(((s.vals[c] || 0) / tot) * 100).toFixed(1)} %)</small></span>`).join('')}</div></div>`;
      return;
    }
    const hl = leyenda ? 24 : 0;
    if (v.tipo === 'bar') {
      const izqB = Math.min(140, Math.max(60, Math.max(...cats.map((c) => String(c).length)) * 6.5)), anchoB = W - izqB - 46, banda = (H - hl - 6) / Math.max(1, cats.length), bw = Math.max(2, (banda * 0.72) / series.length);
      cuerpo.innerHTML = leyenda + `<svg width="${W}" height="${H - hl}">${cats.map((c, i) => `<text x="${izqB - 6}" y="${i * banda + banda / 2 + 4}" text-anchor="end" class="pb-eje">${esc(String(c).slice(0, 22))}</text>` + series.map((s, k) => { const w = ((s.vals[c] || 0) / max) * anchoB, y0 = i * banda + banda * 0.14 + k * bw; return `<rect x="${izqB}" y="${y0}" width="${Math.max(0, w)}" height="${bw - 1}" fill="${col(k)}" data-cat="${esc(c)}" opacity="${aten(c) ? 0.3 : 1}" ${selec(c) ? 'stroke="#252423"' : ''}>${tip(c, s)}</rect>${etq ? `<text x="${izqB + w + 4}" y="${y0 + bw - 3}" class="pb-et">${esc(fmt(s.vals[c]))}</text>` : ''}`; }).join('')).join('')}</svg>`;
      return;
    }
    const izq = 54, abajo = 30, ancho = W - izq - 10, alto = H - abajo - hl - 10;
    const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => { const y = 8 + alto - f * alto; return `<line x1="${izq}" x2="${izq + ancho}" y1="${y}" y2="${y}" class="pb-grid"/><text x="${izq - 6}" y="${y + 4}" text-anchor="end" class="pb-eje">${esc(fmt(max * f))}</text>`; }).join('');
    const paso = ancho / Math.max(1, cats.length), cada = Math.ceil(cats.length / Math.max(1, Math.floor(ancho / 48)));
    const ejeX = cats.map((c, i) => (i % cada ? '' : `<text x="${izq + i * paso + paso / 2}" y="${8 + alto + 18}" text-anchor="middle" class="pb-eje">${esc(String(c).slice(0, 12))}</text>`)).join('');
    let marcas = '';
    if (v.tipo === 'line' || v.tipo === 'area') {
      marcas = series.map((s, k) => { const pts = cats.map((c, i) => [izq + i * paso + paso / 2, 8 + alto - ((s.vals[c] || 0) / max) * alto]); const linea = pts.map((p) => p.join(',')).join(' '); return (v.tipo === 'area' ? `<polygon points="${pts[0][0]},${8 + alto} ${linea} ${pts[pts.length - 1][0]},${8 + alto}" fill="${col(k)}" opacity=".28"/>` : '') + `<polyline points="${linea}" fill="none" stroke="${col(k)}" stroke-width="2"/>` + (cats.length <= 60 ? cats.map((c, i) => `<circle cx="${pts[i][0]}" cy="${pts[i][1]}" r="${cats.length <= 24 ? 3.5 : 2}" fill="${col(k)}" data-cat="${esc(c)}">${tip(c, s)}</circle>`).join('') : ''); }).join('');
    } else {
      const bw = (paso * 0.72) / series.length;
      marcas = cats.map((c, i) => series.map((s, k) => { const h = ((s.vals[c] || 0) / max) * alto, x0 = izq + i * paso + paso * 0.14 + k * bw; return `<rect x="${x0}" y="${8 + alto - h}" width="${Math.max(1, bw - 1)}" height="${Math.max(0, h)}" fill="${col(k)}" data-cat="${esc(c)}" opacity="${aten(c) ? 0.3 : 1}" ${selec(c) ? 'stroke="#252423"' : ''}>${tip(c, s)}</rect>${etq && cats.length <= 16 ? `<text x="${x0 + bw / 2}" y="${8 + alto - h - 4}" text-anchor="middle" class="pb-et">${esc(fmt(s.vals[c]))}</text>` : ''}`; }).join('')).join('');
    }
    cuerpo.innerHTML = leyenda + `<svg width="${W}" height="${H - hl}">${grid}<line x1="${izq}" x2="${izq + ancho}" y1="${8 + alto}" y2="${8 + alto}" class="pb-base"/>${marcas}${ejeX}</svg>`;
  }

  // ---------------------------------------------------------------- reto guiado (sirve con cualquier dataset)
  const todos = () => S.paginas.flatMap((p) => p.visuales);
  const RETO = [
    ['Obtén datos: importa al menos una tabla (Inicio → Obtener datos)', () => Object.keys(S.tablas).length > 0],
    ['Transforma: agrega un paso en Power Query (quitar o renombrar una columna, filtrar filas…)', () => Object.values(S.tablas).some((t) => t.pasos.some((p) => !['origen', 'tipos', 'encabezados'].includes(p.tipo)))],
    ['Modela: ten al menos una relación entre dos tablas (vista Modelo)', () => S.rels.length > 0],
    ['Crea una medida DAX (Inicio → Nueva medida)', () => S.medidas.length > 0],
    ['Arma un gráfico de columnas o barras con esa medida', () => todos().some((v) => ['column', 'bar'].includes(v.tipo) && (v.pozos.y || []).some((y) => y.medida) && v.pozos.x && v.pozos.x[0])],
    ['Agrega una segmentación de datos', () => todos().some((v) => v.tipo === 'slicer' && v.pozos.x && v.pozos.x[0])],
    ['Agrega una tarjeta con un KPI', () => todos().some((v) => v.tipo === 'card' && v.pozos.valores && v.pozos.valores[0])],
    ['Publica el informe', () => S.publicado],
  ];

  // ---------------------------------------------------------------- interfaz principal
  function vista(m, ctx) {
    main = m; Store = ctx.Store; toast = ctx.toast; SQLc = window.Engines.SQL;
    S = Store.data.powerbi && Store.data.powerbi.tablas ? Store.data.powerbi : (Store.data.powerbi = NUEVO());
    cargarDatos(); version++;
    main.innerHTML = '<div class="loading-block"><span class="spinner"></span> Abriendo Power BI Desktop…</div>';
    ctx.ensureSql(main).then((ok) => { if (ok) pintar(); });
  }
  const BOTON = (acc, ico, txt, grande = true) => `<button class="pb-cb ${grande ? 'grande' : ''}" data-acc="${acc}"><span class="pb-cb-ic">${ico}</span><span>${txt}</span></button>`;
  function pintar() {
    document.body.classList.add('pb-abierto');
    main.innerHTML = `<div class="pbi" id="pbi">
      <div class="pb-titulo"><span class="pb-logo"><i></i><i></i><i></i></span><span class="pb-tb" title="Guardar (se guarda solo)">${fl('save')}</span><span class="pb-tb">${fl('arrow_undo')}</span><span class="pb-tb">${fl('arrow_redo')}</span><b>${esc(S.nombreArchivo)}</b><span class="pb-dim">- Power BI Desktop</span><div class="pb-busq">${fl('search')} Buscar</div><span class="spacer"></span>${S.publicado ? '<span class="pb-pub">✓ Publicado</span>' : ''}<span class="pb-usuario" title="Cuenta de práctica"><i>AL</i>Alumno</span><a class="pb-salir" href="#/" title="Cerrar Power BI">${fl('dismiss')}</a></div>
      <div class="pb-cinta"><div class="pb-cinta-tabs"><span class="pb-archivo">Archivo</span><span class="on">Inicio</span><span>Insertar</span><span>Modelado</span><span>Vista</span><span>Optimizar</span><span>Ayuda</span></div>
        <div class="pb-cinta-botones">
          <div class="pb-grupo">${BOTON('obtener', fl('database'), 'Obtener<br>datos')}${BOTON('excel', '<b class="pb-x">X</b>', 'Libro de<br>Excel')}${BOTON('curso', fl('document_table'), 'Bases del<br>curso')}${BOTON('escribir', fl('table_edit'), 'Escribir<br>datos')}<div class="pb-grupo-n">Datos</div></div>
          <div class="pb-grupo">${BOTON('transformar', fl('table'), 'Transformar<br>datos')}${BOTON('actualizar', fl('arrow_sync'), 'Actualizar')}<div class="pb-grupo-n">Consultas</div></div>
          <div class="pb-grupo">${BOTON('nuevo-visual', fl('data_bar_vertical_add'), 'Nuevo objeto<br>visual')}${BOTON('cuadro-texto', fl('text_field'), 'Cuadro de<br>texto')}<div class="pb-grupo-n">Insertar</div></div>
          <div class="pb-grupo">${BOTON('nueva-medida', fl('calculator'), 'Nueva<br>medida')}${BOTON('relaciones', fl('organization_horizontal'), 'Administrar<br>relaciones')}<div class="pb-grupo-n">Cálculos</div></div>
          <div class="pb-grupo">${BOTON('publicar', fl('cloud_arrow_up'), 'Publicar')}<div class="pb-grupo-n">Compartir</div></div>
          <div class="pb-grupo">${BOTON('reto', fl('target_arrow'), S.reto ? 'Ocultar<br>reto' : 'Ver<br>reto')}${BOTON('reiniciar', fl('document_add'), 'Informe<br>nuevo')}<div class="pb-grupo-n">Práctica</div></div>
        </div></div>
      <div class="pb-dax" id="pbDax" hidden></div>
      <div class="pb-cuerpo">
        <nav class="pb-vistas"><button data-v="informe" title="Vista de informe">${ICO.informe}</button><button data-v="tabla" title="Vista de tabla">${ICO.tabla}</button><button data-v="modelo" title="Vista de modelo">${ICO.modelo}</button></nav>
        <section class="pb-centro" id="pbCentro"></section>
        <aside class="pb-paneles" id="pbPaneles"></aside>
      </div>
      <div class="pb-pie" id="pbPie"></div>
      <input type="file" id="pbFile" accept=".csv,.txt,.tsv,.json,.xlsx,.xls,.xlsm,.ods" multiple hidden>
    </div>`;
    const $ = (s) => main.querySelector(s);
    $('.pb-cinta').addEventListener('click', (e) => { const a = e.target.closest('[data-acc]'); if (a) accion(a.dataset.acc); });
    $('.pb-vistas').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) { S.vista = b.dataset.v; guardar(); render(); } });
    $('#pbFile').addEventListener('change', async (e) => { const fs = [...e.target.files]; e.target.value = ''; if (!fs.length) return; try { const ts = []; for (const f of fs) ts.push(...(await leerArchivo(f)).map((t) => ({ ...t, archivo: f.name }))); navegador(ts.map((t) => ({ nombre: t.nombre, filas: t.filas, archivo: t.archivo, tipo: 'archivo' })), fs.map((f) => f.name).join(', ')); } catch (err) { toast('No se pudo leer el archivo: ' + err.message, 5000); } });
    render();
  }
  function accion(a) {
    if (a === 'obtener') return dialogoObtener();
    if (a === 'excel') { main.querySelector('#pbFile').click(); return; }
    if (a === 'curso') return navegadorCurso();
    if (a === 'escribir') return escribirDatos();
    if (a === 'transformar') { if (!Object.keys(S.tablas).length) { toast('Primero obtén datos.'); return; } return powerQuery(); }
    if (a === 'actualizar') { cambioModelo(); render(); toast('Datos actualizados'); return; }
    if (a === 'nuevo-visual') { if (!Object.keys(S.tablas).length) { toast('Primero obtén datos: el informe está vacío.'); return; } agregarVisual('column'); return; }
    if (a === 'cuadro-texto') { toast('En esta práctica, usa el título del objeto visual (panel Formato) para escribir texto.'); return; }
    if (a === 'nueva-medida') { if (!Object.keys(S.tablas).length) { toast('Primero obtén datos.'); return; } return editorDax(); }
    if (a === 'relaciones') return dialogoRelaciones();
    if (a === 'publicar') {
      if (!todos().length) { toast('Agrega al menos un objeto visual antes de publicar.'); return; }
      const n = prompt('Publicar en Power BI. Nombre del informe:', S.nombreArchivo === 'Sin título' ? 'Mi informe' : S.nombreArchivo); if (!n) return;
      S.nombreArchivo = n; S.publicado = true; guardar(); pintar(); toast(`✓ "${n}" publicado en el área de trabajo "Mi área de trabajo" de Power BI Service (simulado).`, 4500); return;
    }
    if (a === 'reto') { S.reto = !S.reto; guardar(); pintar(); return; }
    if (a === 'reiniciar') { if (confirm('¿Crear un informe nuevo? Se borran las tablas, el modelo, las medidas y los visuales.')) { Store.data.powerbi = S = NUEVO(); DATOS = {}; guardarDatos(); cambioModelo(); guardar(); pintar(); } }
  }
  // ---------------------------------------------------------------- obtener datos
  function modal(html, clase = '') {
    const prev = main.querySelector('.pb-modal-fondo'); if (prev) prev.remove();
    const f = document.createElement('div'); f.className = 'pb-modal-fondo'; f.innerHTML = `<div class="pb-modal ${clase}">${html}</div>`;
    main.querySelector('#pbi').appendChild(f);
    f.addEventListener('click', (e) => { if (e.target === f || e.target.closest('[data-cerrar-modal]')) f.remove(); });
    return f.querySelector('.pb-modal');
  }
  function dialogoObtener() {
    const m = modal(`<div class="pb-m-cab">Obtener datos<button data-cerrar-modal>✕</button></div><div class="pb-obt"><div class="pb-obt-l"><b>Todo</b><span>Archivo</span><span>Base de datos</span><span>Otros</span></div><div class="pb-obt-r">
      <div class="pb-obt-i" data-o="excel"><b class="pb-x">X</b> Libro de Excel <small>.xlsx, .xls</small></div>
      <div class="pb-obt-i" data-o="csv">${fl('document_text')} Texto/CSV <small>.csv, .txt, .tsv</small></div>
      <div class="pb-obt-i" data-o="json">${fl('braces')} JSON <small>.json</small></div>
      <div class="pb-obt-i" data-o="curso">${fl('database')} Base de datos del curso (SQLite) <small>99 tablas de 13 empresas</small></div>
      <div class="pb-obt-i" data-o="web">${fl('globe')} Web <small>una URL a un CSV o JSON</small></div>
      <div class="pb-obt-i" data-o="escribir">${fl('table_edit')} Escribir datos <small>una tabla a mano</small></div>
      <div class="pb-obt-i" data-o="pegar">${fl('clipboard_paste')} Pegar desde Excel o Google Sheets</div></div></div><div class="pb-m-pie"><button class="pb-btn" data-cerrar-modal>Cancelar</button></div>`, 'ancho');
    m.addEventListener('click', async (e) => {
      const o = e.target.closest('[data-o]'); if (!o) return;
      const t = o.dataset.o; m.parentElement.remove();
      if (t === 'excel' || t === 'csv' || t === 'json') main.querySelector('#pbFile').click();
      else if (t === 'curso') navegadorCurso();
      else if (t === 'escribir') escribirDatos();
      else if (t === 'pegar') pegarDatos();
      else if (t === 'web') {
        const url = prompt('Desde la web. URL de un archivo CSV o JSON (debe permitir CORS):', 'https://raw.githubusercontent.com/datasets/covid-19/main/data/countries-aggregated.csv'); if (!url) return;
        try { const r = await fetch(url); if (!r.ok) throw new Error(`HTTP ${r.status}`); const txt = await r.text(); const nombre = (url.split('/').pop() || 'web').replace(/\?.*$/, '').replace(/\.[^.]+$/, '') || 'web'; const ts = /\.json(\?|$)/i.test(url) || /^\s*[[{]/.test(txt) ? deJson(JSON.parse(txt)) : [{ nombre, filas: parseCsv(txt) }]; navegador(ts.map((x) => ({ ...x, tipo: 'archivo', archivo: url })), url); } catch (err) { toast('No se pudo descargar: ' + err.message + '. Muchas páginas no permiten que otra web lea sus datos (CORS): descárgalo y usa Texto/CSV.', 6000); }
      }
    });
  }
  function navegador(tablas, origen) {
    let elegida = 0;
    const m = modal(`<div class="pb-m-cab">Navegador<button data-cerrar-modal>✕</button></div><div class="pb-nav"><div class="pb-nav-l"><input placeholder="🔍 Buscar" data-nb><div class="pb-nav-lista"></div></div><div class="pb-nav-r"><div class="pb-nav-t"></div><div class="pb-tabla pb-prev"></div></div></div><div class="pb-m-pie"><span class="pb-dim small">${esc(origen)}</span><span class="spacer"></span><button class="pb-btn pb-btn-am" data-cargar>Cargar</button><button class="pb-btn" data-transf>Transformar datos</button><button class="pb-btn" data-cerrar-modal>Cancelar</button></div>`, 'grande');
    const marcadas = new Set(tablas.length === 1 ? [0] : []);
    const lista = () => { const qtxt = (m.querySelector('[data-nb]').value || '').toLowerCase(); m.querySelector('.pb-nav-lista').innerHTML = tablas.map((t, i) => (!qtxt || t.nombre.toLowerCase().includes(qtxt) ? `<label class="${i === elegida ? 'on' : ''}" data-i="${i}"><input type="checkbox" data-c="${i}" ${marcadas.has(i) ? 'checked' : ''}> ▦ ${esc(t.nombre)}${t.grupo ? ` <small>${esc(t.grupo)}</small>` : ''}</label>` : '')).join(''); };
    const prev = () => { const t = tablas[elegida]; if (!t) return; const filas = t.filas || []; m.querySelector('.pb-nav-t').textContent = t.nombre; const cab = t.cols || filas[0] || []; const cuerpo = t.cols ? filas : filas.slice(1); m.querySelector('.pb-prev').innerHTML = `<table><thead><tr>${cab.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${cuerpo.slice(0, 40).map((f) => `<tr>${f.map((x) => `<td>${esc(x ?? 'null')}</td>`).join('')}</tr>`).join('')}</tbody></table>`; };
    lista(); prev();
    m.querySelector('[data-nb]').addEventListener('input', lista);
    const listaEl = m.querySelector('.pb-nav-lista');
    listaEl.addEventListener('click', (e) => { const l = e.target.closest('[data-i]'); if (!l || Number(l.dataset.i) === elegida) return; elegida = Number(l.dataset.i); listaEl.querySelectorAll('[data-i]').forEach((x) => x.classList.toggle('on', x === l)); prev(); });
    listaEl.addEventListener('change', (e) => { const cb = e.target.closest('[data-c]'); if (cb) cb.checked ? marcadas.add(Number(cb.dataset.c)) : marcadas.delete(Number(cb.dataset.c)); });
    const cargar = (transformar) => {
      if (!marcadas.size) { toast('Marca al menos una tabla.'); return; }
      const nuevas = [];
      for (const i of marcadas) {
        const t = tablas[i];
        if (t.tipo === 'curso') nuevas.push(registrarTabla(t.nombre, { tipo: 'curso', ref: t.ref }, [{ tipo: 'origen', m: `= Sqlite.Database("curso.db"){[Name="${t.ref}"]}[Data]` }]));
        else { const clave = 'd' + Date.now().toString(36) + i; DATOS[clave] = { filas: t.filas }; nuevas.push(registrarTabla(t.nombre, { tipo: 'archivo', clave, archivo: t.archivo }, [{ tipo: 'origen', m: /\.xls/i.test(t.archivo || '') ? `= Excel.Workbook(File.Contents("${t.archivo}"), null, true){[Item="${t.nombre}"]}[Data]` : /\.json/i.test(t.archivo || '') ? `= Json.Document(File.Contents("${t.archivo}"))` : t.archivo === 'escritos' ? '= Table.FromRows(Json.Document(...))' : `= Csv.Document(File.Contents("${t.archivo}"), [Delimiter=",", Encoding=65001])` }, { tipo: 'encabezados' }])); }
      }
      guardarDatos();
      m.parentElement.remove();
      const rels = autodetectar(); guardar();
      if (rels.length) toast(`Cargadas ${nuevas.length} tabla(s). Relaciones detectadas: ${rels.join(' · ')}`, 6000); else toast(`Cargadas ${nuevas.length} tabla(s) en el modelo.`);
      if (transformar) powerQuery(nuevas[0]); else render();
    };
    m.querySelector('[data-cargar]').addEventListener('click', () => cargar(false));
    m.querySelector('[data-transf]').addEventListener('click', () => cargar(true));
  }
  function navegadorCurso() {
    const casos = (window.DataGen && window.DataGen.CASOS) || [];
    const grupoDe = {}; if (window.Bases) for (const c of casos) { const b = window.Bases.infoBase(c.id); if (b) b.orden.forEach((t) => { grupoDe[t] = `${c.icono} ${c.nombre}`; }); }
    const nombres = Object.keys(SQLc.tables).sort((a, b) => (grupoDe[a] || 'zz').localeCompare(grupoDe[b] || 'zz') || a.localeCompare(b));
    navegador(nombres.map((n) => ({ nombre: n, ref: n, tipo: 'curso', grupo: grupoDe[n] || '', cols: SQLc.tables[n].columns, filas: SQLc.tables[n].rows.slice(0, 40) })), 'curso.db (SQLite del curso)');
  }
  function escribirDatos() {
    const m = modal(`<div class="pb-m-cab">Crear tabla<button data-cerrar-modal>✕</button></div><div class="pb-escr"><div class="pb-tabla"><table data-grid><thead><tr><th contenteditable>Columna1</th><th contenteditable>Columna2</th></tr></thead><tbody><tr><td contenteditable></td><td contenteditable></td></tr><tr><td contenteditable></td><td contenteditable></td></tr></tbody></table></div><div class="row"><button class="pb-btn" data-fila>+ fila</button><button class="pb-btn" data-col>+ columna</button></div><label class="pb-campo-txt">Nombre <input data-nombre value="Tabla"></label></div><div class="pb-m-pie"><span class="spacer"></span><button class="pb-btn pb-btn-am" data-ok>Cargar</button><button class="pb-btn" data-cerrar-modal>Cancelar</button></div>`, 'ancho');
    const g = m.querySelector('[data-grid]');
    m.querySelector('[data-fila]').addEventListener('click', () => { const n = g.tHead.rows[0].cells.length; g.tBodies[0].insertAdjacentHTML('beforeend', `<tr>${'<td contenteditable></td>'.repeat(n)}</tr>`); });
    m.querySelector('[data-col]').addEventListener('click', () => { const n = g.tHead.rows[0].cells.length + 1; g.tHead.rows[0].insertAdjacentHTML('beforeend', `<th contenteditable>Columna${n}</th>`); [...g.tBodies[0].rows].forEach((r) => r.insertAdjacentHTML('beforeend', '<td contenteditable></td>')); });
    g.addEventListener('paste', (e) => { const txt = (e.clipboardData || window.clipboardData).getData('text'); if (!txt.includes('\t') && !txt.includes('\n')) return; e.preventDefault(); const filas = txt.replace(/\r/g, '').split('\n').filter(Boolean).map((l) => l.split('\t')); g.tHead.rows[0].innerHTML = filas[0].map((c) => `<th contenteditable>${esc(c)}</th>`).join(''); g.tBodies[0].innerHTML = filas.slice(1).map((f) => `<tr>${f.map((c) => `<td contenteditable>${esc(c)}</td>`).join('')}</tr>`).join(''); });
    m.querySelector('[data-ok]').addEventListener('click', () => {
      const filas = [[...g.tHead.rows[0].cells].map((c) => c.textContent.trim()), ...[...g.tBodies[0].rows].map((r) => [...r.cells].map((c) => c.textContent.trim())).filter((f) => f.some((x) => x))];
      if (filas.length < 2) { toast('Escribe al menos una fila de datos.'); return; }
      const clave = 'd' + Date.now().toString(36); DATOS[clave] = { filas }; guardarDatos();
      registrarTabla(m.querySelector('[data-nombre]').value || 'Tabla', { tipo: 'archivo', clave, archivo: 'escritos' }, [{ tipo: 'origen', m: '= Table.FromRows(Json.Document(Binary.Decompress(...)))' }, { tipo: 'encabezados' }]);
      autodetectar(); guardar(); m.parentElement.remove(); render();
    });
  }
  function pegarDatos() {
    const m = modal(`<div class="pb-m-cab">Pegar datos<button data-cerrar-modal>✕</button></div><div class="pb-escr"><p class="pb-dim">Copia un rango en Excel o Google Sheets (con los encabezados en la primera fila) y pégalo aquí.</p><textarea data-pegar rows="10" placeholder="Ctrl+V"></textarea><label class="pb-campo-txt">Nombre <input data-nombre value="Datos pegados"></label></div><div class="pb-m-pie"><span class="spacer"></span><button class="pb-btn pb-btn-am" data-ok>Cargar</button><button class="pb-btn" data-cerrar-modal>Cancelar</button></div>`, 'ancho');
    m.querySelector('[data-ok]').addEventListener('click', () => {
      const txt = m.querySelector('[data-pegar]').value; const filas = txt.includes('\t') ? txt.replace(/\r/g, '').split('\n').filter((l) => l.trim()).map((l) => l.split('\t')) : parseCsv(txt);
      if (filas.length < 2) { toast('Pega al menos un encabezado y una fila.'); return; }
      const clave = 'd' + Date.now().toString(36); DATOS[clave] = { filas }; guardarDatos();
      registrarTabla(m.querySelector('[data-nombre]').value, { tipo: 'archivo', clave, archivo: 'portapapeles' }, [{ tipo: 'origen', m: '= Table.FromRows(Clipboard)' }, { tipo: 'encabezados' }]);
      autodetectar(); guardar(); m.parentElement.remove(); render();
    });
  }
  // ---------------------------------------------------------------- Power Query
  function powerQuery(inicial) {
    let actual = inicial || Object.keys(S.tablas)[0], pasoSel = null;
    const m = modal(`<div class="pq"><div class="pq-titulo"><span class="pq-logo">▦</span>Editor de Power Query<span class="spacer"></span><button data-cerrar-modal>✕</button></div>
      <div class="pq-cinta"><button class="pb-cb grande" data-pq="aplicar"><span class="pb-cb-ic">${fl('checkmark')}</span><span>Cerrar y<br>aplicar</span></button><i></i><button class="pb-cb grande" data-pq="encabezados"><span class="pb-cb-ic">${fl('arrow_up')}</span><span>Usar primera fila<br>como encabezado</span></button><button class="pb-cb grande" data-pq="duplicados"><span class="pb-cb-ic">${fl('table_dismiss')}</span><span>Quitar<br>duplicados</span></button><button class="pb-cb grande" data-pq="vacios"><span class="pb-cb-ic">${fl('filter')}</span><span>Quitar filas<br>vacías</span></button><i></i><span class="pq-ayuda">Clic en el encabezado de una columna para transformarla</span></div>
      <div class="pq-formula"><span>fx</span><input readonly></div>
      <div class="pq-cuerpo"><div class="pq-consultas"><div class="pq-t">Consultas [${Object.keys(S.tablas).length}]</div><div class="pq-lista"></div></div><div class="pq-grid pb-tabla"></div><div class="pq-config"><div class="pq-t">Configuración de la consulta</div><div class="pq-sub">PROPIEDADES</div><label>Nombre<input data-pq-nombre></label><div class="pq-sub">PASOS APLICADOS</div><div class="pq-pasos"></div></div></div>
      <div class="pq-estado"></div></div>`, 'pq-modal');
    function pintarPQ() {
      const t = S.tablas[actual], n = pasoSel === null ? t.pasos.length : pasoSel + 1;
      const r = aplicar(actual, n);
      m.querySelector('.pq-lista').innerHTML = Object.keys(S.tablas).map((x) => `<div class="pq-q ${x === actual ? 'on' : ''}" data-q="${esc(x)}">▦ ${esc(x)}</div>`).join('');
      m.querySelector('[data-pq-nombre]').value = actual;
      m.querySelector('.pq-pasos').innerHTML = t.pasos.map((p, i) => `<div class="pq-paso ${i === n - 1 ? 'on' : ''}" data-paso="${i}"><span>${esc(nombrePaso(p))}</span>${i > 0 ? `<button data-borrar-paso="${i}" title="Eliminar paso">✕</button>` : ''}</div>`).join('');
      const pasoV = t.pasos[n - 1]; m.querySelector('.pq-formula input').value = pasoV ? formulaM(pasoV, n > 1 ? nombrePaso(t.pasos[n - 2]) : 'Origen') : '';
      const icoT = { num: '1.2', int: '1²³', texto: 'ABC', fecha: '📅', bool: '✓✗' };
      m.querySelector('.pq-grid').innerHTML = `<table><thead><tr><th class="pq-n"></th>${r.cols.map((c) => `<th data-col="${esc(c.n)}"><span class="pq-tipo">${icoT[c.t] || 'ABC'}</span>${esc(c.n)} <span class="pq-flecha">▾</span></th>`).join('')}</tr></thead><tbody>${r.rows.slice(0, 100).map((f, i) => `<tr><td class="pq-n">${i + 1}</td>${f.map((x) => `<td class="${x === null || x === '' ? 'pq-null' : typeof x === 'number' ? 'num' : ''}">${x === null ? 'null' : esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      m.querySelector('.pq-estado').textContent = `${r.cols.length} COLUMNAS, ${r.rows.length.toLocaleString('es')} FILAS · Generación de perfiles de columnas basada en las 1000 primeras filas`;
    }
    const agregarPaso = (p) => { S.tablas[actual].pasos.push(p); pasoSel = null; cambioModelo(); guardar(); pintarPQ(); };
    m.addEventListener('click', (e) => {
      const t = e.target;
      const qq = t.closest('[data-q]'); if (qq) { actual = qq.dataset.q; pasoSel = null; pintarPQ(); return; }
      const bp = t.closest('[data-borrar-paso]'); if (bp) { e.stopPropagation(); S.tablas[actual].pasos.splice(Number(bp.dataset.borrarPaso), 1); pasoSel = null; cambioModelo(); guardar(); pintarPQ(); return; }
      const ps = t.closest('[data-paso]'); if (ps) { pasoSel = Number(ps.dataset.paso); pintarPQ(); return; }
      const b = t.closest('[data-pq]');
      if (b) { const a = b.dataset.pq; if (a === 'aplicar') { m.parentElement.remove(); cambioModelo(); const rels = autodetectar(); guardar(); render(); toast('Cambios aplicados al modelo' + (rels.length ? `. Relaciones nuevas: ${rels.join(' · ')}` : '')); return; } if (a === 'encabezados') agregarPaso({ tipo: 'encabezados' }); if (a === 'duplicados') agregarPaso({ tipo: 'duplicados', cols: [] }); if (a === 'vacios') { const c = aplicar(actual).cols[0]; if (c) agregarPaso({ tipo: 'filtrar', col: c.n, op: 'novacio' }); } return; }
      const th = t.closest('[data-col]'); if (th) menuColumna(th);
    });
    m.querySelector('[data-pq-nombre]').addEventListener('change', (e) => {
      const nuevo = e.target.value.trim(); if (!nuevo || nuevo === actual || S.tablas[nuevo]) return;
      S.tablas[nuevo] = S.tablas[actual]; delete S.tablas[actual];
      S.rels.forEach((r) => { if (r.de === actual) r.de = nuevo; if (r.a === actual) r.a = nuevo; });
      for (const v of todos()) for (const k in v.pozos) for (const f of v.pozos[k]) if (f.t === actual) f.t = nuevo;
      S.medidas.forEach((md) => { md.expr = md.expr.split(`'${actual}'[`).join(`'${nuevo}'[`).replace(new RegExp(`\\b${actual}\\[`, 'g'), `'${nuevo}'[`); });
      actual = nuevo; cambioModelo(); guardar(); pintarPQ();
    });
    function menuColumna(th) {
      const col = th.dataset.col, r = th.getBoundingClientRect();
      const prev = m.querySelector('.pq-menu'); if (prev) prev.remove();
      const menu = document.createElement('div'); menu.className = 'pq-menu'; menu.style.left = Math.min(r.left, innerWidth - 240) + 'px'; menu.style.top = r.bottom + 'px';
      menu.innerHTML = `<div data-m="quitar">✕ Quitar columna</div><div data-m="renombrar">✎ Cambiar nombre…</div><div class="pq-menu-sub">Cambiar tipo</div>${Object.entries(TIPO_N).map(([k, n]) => `<div data-m="tipo" data-t="${k}">&nbsp;&nbsp;${n}</div>`).join('')}<hr><div data-m="reemplazar">↔ Reemplazar valores…</div><div data-m="filtrar">⏷ Filtrar: mantener solo un valor…</div><div data-m="excluir">⏷ Filtrar: quitar un valor…</div><div data-m="novacio">∅ Quitar vacíos</div><div data-m="dup">⧉ Quitar duplicados (por esta columna)</div><hr><div data-m="asc">↑ Orden ascendente</div><div data-m="desc">↓ Orden descendente</div><hr><div data-m="recortar">Recortar espacios</div><div data-m="may">MAYÚSCULAS</div><div data-m="min">minúsculas</div>`;
      m.appendChild(menu);
      setTimeout(() => document.addEventListener('mousedown', function f(e) { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('mousedown', f); } }), 0);
      menu.addEventListener('click', (e) => {
        const o = e.target.closest('[data-m]'); if (!o) return; menu.remove();
        const k = o.dataset.m;
        if (k === 'quitar') agregarPaso({ tipo: 'quitar', cols: [col] });
        else if (k === 'renombrar') { const n = prompt('Nuevo nombre de la columna:', col); if (n && n.trim() && n !== col) agregarPaso({ tipo: 'renombrar', col, a: n.trim() }); }
        else if (k === 'tipo') agregarPaso({ tipo: 'tipos', mapa: { [col]: o.dataset.t } });
        else if (k === 'reemplazar') { const de = prompt('Valor que se busca:'); if (de === null) return; const a2 = prompt('Reemplazar con:'); if (a2 === null) return; agregarPaso({ tipo: 'reemplazar', col, de, a: a2 }); }
        else if (k === 'filtrar' || k === 'excluir') { const val = prompt(k === 'filtrar' ? `Mantener las filas donde ${col} es igual a:` : `Quitar las filas donde ${col} es igual a:`); if (val !== null) agregarPaso({ tipo: 'filtrar', col, op: k === 'filtrar' ? '=' : '<>', val }); }
        else if (k === 'novacio') agregarPaso({ tipo: 'filtrar', col, op: 'novacio' });
        else if (k === 'dup') agregarPaso({ tipo: 'duplicados', cols: [col] });
        else if (k === 'asc' || k === 'desc') agregarPaso({ tipo: 'ordenar', col, desc: k === 'desc' });
        else agregarPaso({ tipo: 'mayus', col, modo: k === 'recortar' ? 'recortar' : k === 'min' ? 'min' : 'may' });
      });
    }
    pintarPQ();
  }
  // ---------------------------------------------------------------- relaciones
  function dialogoRelaciones() {
    construir();
    const tablas = Object.keys(S.tablas);
    if (tablas.length < 2) { toast('Necesitas al menos dos tablas para crear una relación.'); return; }
    const m = modal(`<div class="pb-m-cab">Administrar relaciones<button data-cerrar-modal>✕</button></div><div class="pb-rels"><table class="pb-rels-t"><thead><tr><th>Activa</th><th>Desde: tabla (columna)</th><th>Hasta: tabla (columna)</th><th></th></tr></thead><tbody></tbody></table>
      <div class="pb-rel-nueva"><b>Nueva relación</b><div class="row"><select data-ta>${tablas.map((t) => `<option>${esc(t)}</option>`).join('')}</select><select data-ca></select><span>* → 1</span><select data-tb>${tablas.map((t, i) => `<option ${i === 1 ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select><select data-cb></select><button class="pb-btn pb-btn-am" data-crear>Crear</button></div><p class="pb-dim small">La tabla de la izquierda es la del lado "varios" (*): por ejemplo Ventas[cliente_id]. La de la derecha es la del lado "uno" (1), donde ese valor no se repite: Clientes[cliente_id]. El filtro viaja de derecha a izquierda.</p></div>
      <button class="pb-btn" data-auto>Detección automática</button></div><div class="pb-m-pie"><span class="spacer"></span><button class="pb-btn pb-btn-am" data-cerrar-modal>Cerrar</button></div>`, 'ancho');
    const pintarR = () => { m.querySelector('.pb-rels-t tbody').innerHTML = S.rels.map((r, i) => `<tr><td>✓</td><td>${esc(r.de)} (${esc(r.cde)})</td><td>${esc(r.a)} (${esc(r.ca)})</td><td><button class="pb-btn" data-borrar-rel="${i}">Eliminar</button></td></tr>`).join('') || '<tr><td colspan="4" class="pb-dim">No hay relaciones todavía.</td></tr>'; };
    const cols = (sel, t) => { m.querySelector(sel).innerHTML = meta(t).map((c) => `<option>${esc(c.n)}</option>`).join(''); };
    const sync = () => { cols('[data-ca]', m.querySelector('[data-ta]').value); cols('[data-cb]', m.querySelector('[data-tb]').value); const ca = m.querySelector('[data-ca]'), cb = m.querySelector('[data-cb]'); const comun = [...ca.options].map((o) => o.value).find((x) => [...cb.options].some((o) => o.value === x)); if (comun) { ca.value = comun; cb.value = comun; } };
    sync(); pintarR();
    m.querySelector('[data-ta]').addEventListener('change', sync); m.querySelector('[data-tb]').addEventListener('change', sync);
    m.addEventListener('click', (e) => {
      const b = e.target.closest('[data-borrar-rel]'); if (b) { S.rels.splice(Number(b.dataset.borrarRel), 1); guardar(); pintarR(); render(); return; }
      if (e.target.closest('[data-auto]')) { const n = autodetectar(); guardar(); pintarR(); render(); toast(n.length ? `Detectadas: ${n.join(' · ')}` : 'No encontré relaciones nuevas (columnas con el mismo nombre y valores únicos en un lado).'); return; }
      if (e.target.closest('[data-crear]')) {
        const ta = m.querySelector('[data-ta]').value, ca = m.querySelector('[data-ca]').value, tb = m.querySelector('[data-tb]').value, cb = m.querySelector('[data-cb]').value;
        if (ta === tb) { toast('Elige dos tablas distintas.'); return; }
        const unicoB = ejecutar(`SELECT COUNT(*) = COUNT(DISTINCT ${q(cb)}) FROM ${q(tb)}`)[0][0];
        if (!unicoB) { const unicoA = ejecutar(`SELECT COUNT(*) = COUNT(DISTINCT ${q(ca)}) FROM ${q(ta)}`)[0][0]; if (unicoA) { S.rels.push({ de: tb, cde: cb, a: ta, ca }); toast(`Invertí la dirección: ${ta}[${ca}] no repite valores, así que es el lado 1.`); } else { toast(`Ninguna de las dos columnas tiene valores únicos: sería una relación de varios a varios. Usa una tabla puente o una columna clave.`, 5000); return; } }
        else S.rels.push({ de: ta, cde: ca, a: tb, ca: cb });
        guardar(); pintarR(); render();
      }
    });
  }
  // ---------------------------------------------------------------- render de vistas
  function render() {
    construir();
    main.querySelectorAll('.pb-vistas [data-v]').forEach((b) => b.classList.toggle('on', b.dataset.v === S.vista));
    if (S.vista === 'tabla') return renderTabla();
    if (S.vista === 'modelo') return renderModelo();
    const centro = main.querySelector('#pbCentro');
    if (!Object.keys(S.tablas).length) {
      centro.innerHTML = `<div class="pb-lienzo-wrap"><div class="pb-lienzo pb-vacio"><div class="pb-agregar"><h2>Agregar datos al informe</h2><p>Una vez cargados, los datos aparecerán en el panel <b>Datos</b>.</p><div class="pb-agregar-g"><button data-acc2="excel"><b class="pb-x">X</b>Importar datos de Excel</button><button data-acc2="curso">${fl('database')}Importar datos de una base (SQLite del curso)</button><button data-acc2="escribir">${fl('table_edit')}Pegar o escribir datos en una tabla</button><button data-acc2="obtener">${fl('document_text')}Texto/CSV, JSON o web</button></div><a data-acc2="obtener">Obtener datos de otro origen →</a></div></div></div>`;
      centro.querySelectorAll('[data-acc2]').forEach((b) => b.addEventListener('click', () => accion(b.dataset.acc2)));
      renderPaneles(); renderPie(); return;
    }
    centro.innerHTML = `<div class="pb-lienzo-wrap"><div class="pb-lienzo" id="pbLienzo"></div></div>`;
    const lienzo = main.querySelector('#pbLienzo');
    for (const v of pag().visuales) {
      const el = document.createElement('div');
      el.className = 'pb-v' + (S.sel === v.id ? ' sel' : '');
      el.dataset.id = v.id;
      Object.assign(el.style, { left: v.x + '%', top: v.y + '%', width: v.w + '%', height: v.h + '%' });
      const tit = v.formato.titulo === '-' ? '' : (v.formato.titulo || autoTitulo(v));
      el.innerHTML = `${tit ? `<div class="pb-v-tit">${esc(tit)}</div>` : ''}<div class="pb-v-cab"><button class="pb-v-x" title="Más opciones: eliminar">⋯</button></div><div class="pb-v-cuerpo"></div><span class="pb-v-res"></span>`;
      lienzo.appendChild(el);
    }
    requestAnimationFrame(() => { for (const v of pag().visuales) { const el = lienzo.querySelector(`[data-id="${v.id}"]`); if (el) dibujar(v, el); } });
    interaccionLienzo(lienzo);
    renderPaneles(); renderPie();
  }
  function autoTitulo(v) {
    const P = v.pozos;
    if (v.tipo === 'card' || v.tipo === 'table') return '';
    if (v.tipo === 'slicer') return P.x && P.x[0] ? nomCampo(P.x[0]) : '';
    const ys = (P.y || []).map(nomCampo).join(' y '), x = P.x && P.x[0] ? nomCampo(P.x[0]) : '';
    return ys && x ? `${ys} por ${x}${P.leyenda && P.leyenda[0] ? ` y ${nomCampo(P.leyenda[0])}` : ''}` : '';
  }
  function agregarVisual(tipo) {
    const n = pag().visuales.length;
    const v = { id: 'v' + Date.now().toString(36), tipo, pozos: {}, formato: { titulo: '', etiquetas: false, color: PALETA[0] }, x: 1 + (n % 3) * 33, y: 2 + (Math.floor(n / 3) % 3) * 32, w: 32, h: 30 };
    if (tipo === 'card') { v.w = 16; v.h = 16; }
    if (tipo === 'slicer') { v.w = 16; v.h = 30; }
    pag().visuales.push(v); S.sel = v.id; guardar(); render();
  }
  function interaccionLienzo(lienzo) {
    lienzo.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('.pb-v');
      if (!el) { if (S.sel || S.cruz) { S.sel = null; S.cruz = null; guardar(); render(); } return; }
      const v = vis(el.dataset.id);
      if (e.target.closest('.pb-v-x')) { if (confirm('¿Eliminar este objeto visual?')) { pag().visuales = pag().visuales.filter((x) => x.id !== v.id); if (S.cruz && S.cruz.visual === v.id) S.cruz = null; S.sel = null; guardar(); render(); } return; }
      if (e.target.closest('input, label')) return;
      const dato = e.target.closest('[data-cat]');
      if (dato && v.tipo !== 'slicer') {
        const campo = v.tipo === 'table' ? (v.pozos.cols || []).find((c) => !c.medida && (!c.agg || c.agg === 'none')) : v.pozos.x && v.pozos.x[0];
        if (campo) { const raw = dato.dataset.cat; const valor = !campo.parte && ['num', 'int'].includes(tipoDe(campo.t, campo.c)) && raw !== '' ? Number(raw) : raw === '' ? null : raw; S.cruz = S.cruz && S.cruz.visual === v.id && String(S.cruz.valor) === String(valor) ? null : { visual: v.id, campo, valor }; S.sel = v.id; guardar(); render(); return; }
      }
      if (S.sel !== v.id) { S.sel = v.id; guardar(); main.querySelectorAll('.pb-v').forEach((x) => x.classList.toggle('sel', x.dataset.id === v.id)); renderPaneles(); }
      const r = lienzo.getBoundingClientRect(), x0 = e.clientX, y0 = e.clientY, ini = { x: v.x, y: v.y, w: v.w, h: v.h }, redim = !!e.target.closest('.pb-v-res');
      el.setPointerCapture(e.pointerId);
      const mover = (ev) => { const dx = ((ev.clientX - x0) / r.width) * 100, dy = ((ev.clientY - y0) / r.height) * 100; if (redim) { v.w = Math.max(8, Math.min(100 - v.x, ini.w + dx)); v.h = Math.max(8, Math.min(100 - v.y, ini.h + dy)); } else { v.x = Math.max(0, Math.min(100 - v.w, ini.x + dx)); v.y = Math.max(0, Math.min(100 - v.h, ini.y + dy)); } Object.assign(el.style, { left: v.x + '%', top: v.y + '%', width: v.w + '%', height: v.h + '%' }); };
      const soltar = () => { el.removeEventListener('pointermove', mover); el.removeEventListener('pointerup', soltar); guardar(); if (redim) dibujar(v, el); };
      el.addEventListener('pointermove', mover); el.addEventListener('pointerup', soltar);
    });
    lienzo.addEventListener('change', (e) => {
      const cb = e.target.closest('[data-sl]'); if (!cb) return;
      const v = vis(cb.closest('.pb-v').dataset.id), campo = v.pozos.x[0];
      const raw = cb.dataset.sl, val = raw === '' ? null : !campo.parte && ['num', 'int'].includes(tipoDe(campo.t, campo.c)) ? Number(raw) : raw;
      const set = new Set(v.slicerSel || []); cb.checked ? set.add(val) : set.delete(val); v.slicerSel = [...set]; guardar(); render();
    });
  }
  // ---------------------------------------------------------------- paneles
  function campoHtml(t, c) {
    const tp = c.t, num = ['num', 'int'].includes(tp) && !/(^id$|_id$|key$)/i.test(c.n), fecha = tp === 'fecha';
    return `<div class="pb-campo" draggable="true" data-t="${esc(t)}" data-c="${esc(c.n)}"><input type="checkbox" tabindex="-1"><span class="pb-ic">${num ? 'Σ' : fecha ? '📅' : ''}</span>${esc(c.n)}</div>${fecha ? ['anio', 'trim', 'mes'].map((p) => `<div class="pb-campo pb-sub" draggable="true" data-t="${esc(t)}" data-c="${esc(c.n)}" data-parte="${p}"><input type="checkbox" tabindex="-1"><span class="pb-ic"></span>${{ anio: 'Año', trim: 'Trimestre', mes: 'Mes' }[p]}</div>`).join('') : ''}`;
  }
  function renderPaneles() {
    const pan = main.querySelector('#pbPaneles'); if (!pan) return;
    const v = S.sel && vis(S.sel);
    const abiertas = new Set(S.tablasAbiertas || Object.keys(S.tablas).slice(0, 2));
    const usados = new Set(v ? Object.values(v.pozos).flat().map((f) => (f.medida ? 'm:' + f.medida : `${f.t}|${f.c}|${f.parte || ''}`)) : []);
    const datos = `<div class="pb-pan"><div class="pb-pan-t">Datos <span>⟩</span></div><input class="pb-buscar" placeholder="🔍 Buscar" data-buscar value="${esc(S.buscar || '')}"><div class="pb-arbol">
      ${Object.keys(S.tablas).length ? '' : '<p class="pb-ayuda">Todavía no hay datos. Usa <b>Obtener datos</b>.</p>'}
      ${Object.keys(S.tablas).map((t) => { const med = S.medidas.filter((m) => (m.tabla || Object.keys(S.tablas)[0]) === t); return `<div class="pb-tabla-n" data-tabla="${esc(t)}"><span class="pb-chev">${abiertas.has(t) ? '⌄' : '›'}</span><span class="pb-tabla-ic">▦</span>${esc(t)}</div>${abiertas.has(t) ? med.map((m) => `<div class="pb-campo pb-medida ${usados.has('m:' + m.nombre) ? 'usado' : ''}" draggable="true" data-medida="${esc(m.nombre)}"><input type="checkbox" tabindex="-1" ${usados.has('m:' + m.nombre) ? 'checked' : ''}><span class="pb-ic">🧮</span>${esc(m.nombre)}<button data-editar-medida="${esc(m.nombre)}" title="Editar medida">✎</button></div>`).join('') + meta(t).filter((c) => !S.buscar || c.n.toLowerCase().includes(S.buscar.toLowerCase())).map((c) => campoHtml(t, c)).join('').replace(/data-c="([^"]*)"( data-parte="(\w+)")?><input type="checkbox"/g, (mm, c, x, p) => mm.replace('<input type="checkbox"', `<input type="checkbox" ${usados.has(`${t}|${c.replace(/&quot;/g, '"')}|${p || ''}`) ? 'checked' : ''}`)) : ''}`; }).join('')}</div></div>`;
    let viz = `<div class="pb-pan"><div class="pb-pan-t">Visualizaciones <span>⟩</span></div><div class="pb-viz-tabs"><span class="on">Crear objeto visual</span><span>Formato</span></div><div class="pb-galeria">${Object.entries(TIPOS).map(([k, x]) => `<button data-tipo="${k}" class="${v && v.tipo === k ? 'on' : ''}" title="${esc(x.n)}">${ICO[k]}</button>`).join('')}</div>`;
    if (v) {
      viz += TIPOS[v.tipo].pozos.map(([k, nombre, , clase]) => `<div class="pb-pozo-t">${esc(nombre)}</div><div class="pb-pozo" data-pozo="${k}" data-clase="${clase}">${(v.pozos[k] || []).map((f, i) => `<div class="pb-chip"><span>${esc(nomCampo(f))}</span>${f.agg ? `<select data-agg="${k}:${i}" title="Resumen">${Object.entries(AGG).filter(([a]) => clase === 'mixto' || a !== 'none').map(([a, [n]]) => `<option value="${a}" ${f.agg === a ? 'selected' : ''}>${n}</option>`).join('')}</select>` : ''}<button data-quitar="${k}:${i}" title="Quitar">✕</button></div>`).join('') || '<span class="pb-pozo-vacio">Agregar campos de datos aquí</span>'}</div>`).join('');
      viz += `<div class="pb-sub-t">Formato del objeto visual</div><label class="pb-fmt">Título<input data-fmt="titulo" value="${esc(v.formato.titulo)}" placeholder="${esc(autoTitulo(v) || 'automático')} (escribe - para ocultarlo)"></label>${['column', 'bar'].includes(v.tipo) ? `<label class="pb-fmt pb-fmt-chk"><input type="checkbox" data-fmt="etiquetas" ${v.formato.etiquetas ? 'checked' : ''}> Etiquetas de datos</label>` : ''}${['column', 'bar', 'line', 'area'].includes(v.tipo) ? `<label class="pb-fmt">Color<input type="color" data-fmt="color" value="${esc(v.formato.color)}"></label>` : ''}
        <details class="pb-sql"><summary>Consulta que genera el objeto visual</summary><pre>${esc((() => { try { const d = datosVisual(v); return (d && d.sql) || '—'; } catch (e) { return e.message; } })())}</pre></details>`;
    } else viz += '<p class="pb-ayuda">Selecciona un objeto visual en el lienzo para ver sus campos y su formato, o elige un tipo de arriba para crear uno.</p>';
    viz += '</div>';
    const filtros = `<div class="pb-pan pb-pan-filtros"><div class="pb-pan-t">Filtros <span>⟩</span></div><div class="pb-pozo-t">Filtros en esta página</div><div class="pb-pozo" data-pozo="__filtro" data-clase="cat">${pag().filtros.map((f, i) => `<div class="pb-filtro"><div class="pb-filtro-cab"><b>${esc(nomCampo(f.campo))}</b><span class="pb-dim">${f.valores && f.valores.length ? `es ${f.valores.slice(0, 2).map((x) => x ?? '(En blanco)').join(', ')}${f.valores.length > 2 ? '…' : ''}` : 'es (Todos)'}</span><button data-quitar-filtro="${i}">✕</button></div>${valoresFiltro(f, i)}</div>`).join('') || '<span class="pb-pozo-vacio">Agregar campos de datos aquí</span>'}</div>${S.cruz ? `<div class="pb-cruz">Filtrado cruzado: <b>${esc(nomCampo(S.cruz.campo))} = ${esc(S.cruz.valor ?? '(En blanco)')}</b> <button data-limpiar-cruz>Quitar</button></div>` : ''}</div>`;
    const reto = S.reto ? `<div class="pb-pan pb-reto"><div class="pb-pan-t">🎯 Reto: tu primer informe</div>${RETO.map(([t, f]) => `<div class="pb-reto-i ${f() ? 'ok' : ''}">${f() ? '✅' : '⬜'} ${esc(t)}</div>`).join('')}<p class="pb-ayuda">Con cualquier dataset: un CSV tuyo, un Excel o las bases del curso.</p></div>` : '';
    pan.innerHTML = `<div class="pb-pan-col pb-col-filtros">${reto}${filtros}</div><div class="pb-pan-col">${viz}</div><div class="pb-pan-col">${datos}</div>`;
    pan.querySelectorAll('[data-tabla]').forEach((x) => x.addEventListener('click', () => { const s = new Set(S.tablasAbiertas || Object.keys(S.tablas).slice(0, 2)); s.has(x.dataset.tabla) ? s.delete(x.dataset.tabla) : s.add(x.dataset.tabla); S.tablasAbiertas = [...s]; guardar(); renderPaneles(); }));
    const b = pan.querySelector('[data-buscar]'); b.addEventListener('input', () => { S.buscar = b.value; if (b.value) S.tablasAbiertas = Object.keys(S.tablas); renderPaneles(); const nb = main.querySelector('[data-buscar]'); nb.focus(); nb.setSelectionRange(99, 99); });
    pan.querySelectorAll('[data-tipo]').forEach((x) => x.addEventListener('click', () => {
      if (!Object.keys(S.tablas).length) { toast('Primero obtén datos.'); return; }
      if (!v) return agregarVisual(x.dataset.tipo);
      const P = v.pozos, cats = [...(P.x || []), ...(P.leyenda || []), ...(P.cols || []).filter((c) => !c.medida && (!c.agg || c.agg === 'none'))], vals = [...(P.y || []), ...(P.valores || []), ...(P.cols || []).filter((c) => c.medida || (c.agg && c.agg !== 'none'))];
      v.tipo = x.dataset.tipo;
      if (v.tipo === 'card') v.pozos = { valores: vals.slice(0, 1) }; else if (v.tipo === 'table') v.pozos = { cols: [...cats, ...vals] }; else if (v.tipo === 'slicer') v.pozos = { x: cats.slice(0, 1) }; else if (v.tipo === 'matrix') v.pozos = { x: cats.slice(0, 1), leyenda: cats.slice(1, 2), y: vals.slice(0, 1) }; else v.pozos = { x: cats.slice(0, 1), y: vals.slice(0, v.tipo === 'donut' ? 1 : 3), leyenda: v.tipo === 'donut' ? [] : cats.slice(1, 2) };
      guardar(); render();
    }));
    pan.querySelectorAll('[data-quitar]').forEach((x) => x.addEventListener('click', () => { const [k, i] = x.dataset.quitar.split(':'); v.pozos[k].splice(Number(i), 1); if (S.cruz && S.cruz.visual === v.id) S.cruz = null; guardar(); render(); }));
    pan.querySelectorAll('[data-agg]').forEach((x) => x.addEventListener('change', () => { const [k, i] = x.dataset.agg.split(':'); v.pozos[k][Number(i)].agg = x.value; guardar(); render(); }));
    pan.querySelectorAll('[data-fmt]').forEach((x) => x.addEventListener(x.type === 'color' ? 'input' : 'change', () => { v.formato[x.dataset.fmt] = x.type === 'checkbox' ? x.checked : x.value; guardar(); render(); }));
    pan.querySelectorAll('[data-quitar-filtro]').forEach((x) => x.addEventListener('click', () => { pag().filtros.splice(Number(x.dataset.quitarFiltro), 1); guardar(); render(); }));
    pan.querySelectorAll('[data-fv]').forEach((x) => x.addEventListener('change', () => { const f = pag().filtros[Number(x.dataset.fv)]; const raw = x.dataset.val, val = raw === '' ? null : !f.campo.parte && ['num', 'int'].includes(tipoDe(f.campo.t, f.campo.c)) ? Number(raw) : raw; const s = new Set(f.valores || []); x.checked ? s.add(val) : s.delete(val); f.valores = [...s]; guardar(); render(); }));
    const lc = pan.querySelector('[data-limpiar-cruz]'); if (lc) lc.addEventListener('click', () => { S.cruz = null; guardar(); render(); });
    pan.querySelectorAll('[data-editar-medida]').forEach((x) => x.addEventListener('click', (e) => { e.stopPropagation(); editorDax(S.medidas.find((m) => m.nombre === x.dataset.editarMedida)); }));
    pan.querySelectorAll('.pb-campo').forEach((x) => {
      x.addEventListener('click', (e) => { if (e.target.closest('button')) return; e.preventDefault(); if (!v) { agregarVisualCon(campoDe(x)); return; } const cb = x.querySelector('input'); if (cb && cb.checked) { quitarCampo(v, campoDe(x)); return; } agregarCampo(v, campoDe(x)); });
      x.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', JSON.stringify(campoDe(x))));
    });
    pan.querySelectorAll('.pb-pozo').forEach((z) => {
      z.addEventListener('dragover', (e) => { e.preventDefault(); z.classList.add('sobre'); });
      z.addEventListener('dragleave', () => z.classList.remove('sobre'));
      z.addEventListener('drop', (e) => { e.preventDefault(); z.classList.remove('sobre'); let f; try { f = JSON.parse(e.dataTransfer.getData('text/plain')); } catch (err) { return; } if (z.dataset.pozo === '__filtro') { if (f.medida) { toast('Los filtros de página son sobre columnas.'); return; } pag().filtros.push({ campo: f, valores: [] }); guardar(); render(); return; } agregarCampo(v, f, z.dataset.pozo); });
    });
    // arrastrar un campo al lienzo vacío crea un visual, como en el real
    const lienzo = main.querySelector('#pbLienzo');
    if (lienzo && !lienzo.dataset.drop) { lienzo.dataset.drop = 1; lienzo.addEventListener('dragover', (e) => e.preventDefault()); lienzo.addEventListener('drop', (e) => { if (e.target.closest('.pb-v')) return; e.preventDefault(); try { agregarVisualCon(JSON.parse(e.dataTransfer.getData('text/plain'))); } catch (err) { /* nada */ } }); }
  }
  function agregarVisualCon(f) {
    const esValor = !!f.medida || (!f.parte && esNum(f.t, f.c));
    agregarVisual(esValor ? 'column' : 'table');
    agregarCampo(vis(S.sel), f);
  }
  function quitarCampo(v, f) { for (const k in v.pozos) v.pozos[k] = v.pozos[k].filter((x) => !(f.medida ? x.medida === f.medida : x.t === f.t && x.c === f.c && (x.parte || '') === (f.parte || ''))); guardar(); render(); }
  function valoresFiltro(f, i) {
    const vals = ejecutar(`SELECT DISTINCT ${colSql(f.campo)} FROM ${q(f.campo.t)} ORDER BY 1 LIMIT 80`).map((x) => x[0]);
    const sel = new Set((f.valores || []).map(String));
    return `<div class="pb-fvals">${vals.map((x) => `<label><input type="checkbox" data-fv="${i}" data-val="${esc(x ?? '')}" ${sel.has(String(x)) ? 'checked' : ''}> ${esc(x ?? '(En blanco)')}</label>`).join('')}</div>`;
  }
  const campoDe = (x) => (x.dataset.medida ? { medida: x.dataset.medida } : { t: x.dataset.t, c: x.dataset.c, ...(x.dataset.parte ? { parte: x.dataset.parte } : {}) });
  function agregarCampo(v, f, pozo) {
    if (!v) return;
    const pozos = TIPOS[v.tipo].pozos, esValor = !!f.medida || (!f.parte && esNum(f.t, f.c));
    if (!pozo) pozo = (pozos.find(([k, , max, clase]) => (clase === 'mixto' || (esValor ? clase === 'valor' : clase === 'cat')) && (v.pozos[k] || []).length < max) || pozos.find(([, , , clase]) => clase === 'mixto' || (esValor ? clase === 'valor' : clase === 'cat')) || pozos[0])[0];
    const def = pozos.find((p) => p[0] === pozo); if (!def) return;
    const [, , max, clase] = def;
    const campo = { ...f };
    if ((clase === 'valor' || (clase === 'mixto' && esValor)) && !f.medida) campo.agg = esNum(f.t, f.c) ? 'sum' : 'count';
    if (clase === 'mixto' && !esValor && !f.medida) campo.agg = 'none';
    if (clase === 'cat' && f.medida) { toast('Una medida no puede ir en un eje: va en Valores o en el Eje Y.'); return; }
    v.pozos[pozo] = v.pozos[pozo] || [];
    if (v.pozos[pozo].length >= max) v.pozos[pozo].splice(max - 1, 1);
    v.pozos[pozo].push(campo); guardar(); render();
  }
  // ---------------------------------------------------------------- barra de fórmulas DAX
  function editorDax(medida) {
    const bar = main.querySelector('#pbDax'); bar.hidden = false;
    const tablas = Object.keys(S.tablas), t0 = tablas[0], col0 = (meta(t0).find((c) => ['num', 'int'].includes(c.t)) || meta(t0)[0] || { n: 'columna' }).n;
    const ref = (t) => (/^[A-Za-z_]\w*$/.test(t) ? t : `'${t}'`);
    bar.innerHTML = `<span class="pb-dax-x" title="Cancelar">✕</span><span class="pb-dax-ok" title="Confirmar">✓</span><div class="pb-dax-ed"><textarea spellcheck="false" rows="2">${esc(medida ? `${medida.nombre} = ${medida.expr}` : 'Medida = ')}</textarea><div class="pb-dax-ayuda">Ejemplos con tus datos: <code>Total = SUM(${esc(ref(t0))}[${esc(col0)}])</code> · <code>Filas = COUNTROWS(${esc(ref(t0))})</code> · <code>Promedio = DIVIDE([Total], [Filas])</code> · <code>Filtrada = CALCULATE([Total], ${esc(ref(t0))}[columna] = "valor")</code> · <code>SUMX(Tabla, Tabla[a] * Tabla[b])</code></div><div class="pb-dax-err"></div></div><label class="pb-dax-tabla">Tabla de inicio <select>${tablas.map((t) => `<option ${medida && medida.tabla === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
    const ta = bar.querySelector('textarea'); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
    const cerrar = () => { bar.hidden = true; bar.innerHTML = ''; };
    const confirmar = () => {
      const m = /^\s*([^=]+?)\s*=\s*([\s\S]+)$/.exec(ta.value), err = bar.querySelector('.pb-dax-err');
      if (!m) { err.textContent = 'Una medida se escribe "Nombre = expresión".'; return; }
      const nombre = m[1].trim(), expr = m[2].trim(), otras = S.medidas.filter((x) => x !== medida);
      if (otras.some((x) => x.nombre.toLowerCase() === nombre.toLowerCase())) { err.textContent = `Ya existe una medida llamada "${nombre}".`; return; }
      try { const r = compilarDax(expr, [...otras, { nombre, expr }]); const tm = r.tablas.length ? r.tablas : [t0]; const fact = tm.find((t) => tm.every((o) => alcanzables(t).has(o))) || tm[0]; const j = joins(fact, tm); if (j.error) throw new Error(`Las tablas ${tm.join(' y ')} no están relacionadas (créalo en la vista Modelo).`); construir().exec(`SELECT ${r.sql} FROM ${q(fact)} ${j.sql}`); } catch (e) { err.textContent = '⚠️ ' + e.message; return; }
      const tabla = bar.querySelector('select').value;
      if (medida) { for (const v of todos()) for (const k in v.pozos) for (const f of v.pozos[k]) if (f.medida === medida.nombre) f.medida = nombre; Object.assign(medida, { nombre, expr, tabla }); } else S.medidas.push({ nombre, expr, tabla });
      guardar(); cerrar(); render(); toast(`Medida [${nombre}] ${medida ? 'actualizada' : 'creada'} en la tabla ${tabla}.`);
    };
    bar.querySelector('.pb-dax-ok').addEventListener('click', confirmar);
    bar.querySelector('.pb-dax-x').addEventListener('click', cerrar);
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); confirmar(); } if (e.key === 'Escape') cerrar(); });
  }
  // ---------------------------------------------------------------- vista Tabla y vista Modelo
  function renderTabla() {
    const nombres = Object.keys(S.tablas);
    const t = S.tablaDatos && S.tablas[S.tablaDatos] ? S.tablaDatos : nombres[0];
    const centro = main.querySelector('#pbCentro');
    if (!t) { centro.innerHTML = '<div class="pb-datos"><p class="pb-ayuda">No hay tablas. Usa Obtener datos.</p></div>'; renderPie(); main.querySelector('#pbPaneles').innerHTML = ''; return; }
    const filas = ejecutar(`SELECT * FROM ${q(t)} LIMIT 300`), cols = meta(t);
    centro.innerHTML = `<div class="pb-datos"><div class="pb-datos-cab"><b>${esc(t)}</b><span class="pb-dim">${(S.tablas[t]._filas || 0).toLocaleString('es')} filas · ${cols.length} columnas</span></div><div class="pb-tabla pb-tabla-grande"><table><thead><tr>${cols.map((c) => `<th title="${TIPO_N[c.t] || ''}">${['num', 'int'].includes(c.t) ? 'Σ ' : c.t === 'fecha' ? '📅 ' : ''}${esc(c.n)}</th>`).join('')}</tr></thead><tbody>${filas.map((r) => `<tr>${r.map((x) => `<td class="${typeof x === 'number' ? 'num' : ''}">${esc(fmtCel(x))}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
    main.querySelector('#pbPaneles').innerHTML = `<div class="pb-pan-col"><div class="pb-pan"><div class="pb-pan-t">Datos</div>${nombres.map((x) => `<div class="pb-tabla-n ${x === t ? 'abierta' : ''}" data-ver="${esc(x)}"><span class="pb-tabla-ic">▦</span>${esc(x)}</div>`).join('')}</div></div>`;
    main.querySelectorAll('[data-ver]').forEach((x) => x.addEventListener('click', () => { S.tablaDatos = x.dataset.ver; guardar(); renderTabla(); }));
    renderPie();
  }
  function renderModelo() {
    const nombres = Object.keys(S.tablas);
    S.posModelo = S.posModelo || {};
    nombres.forEach((t, i) => { if (!S.posModelo[t]) S.posModelo[t] = [4 + (i % 4) * 24, 6 + Math.floor(i / 4) * 44]; });
    const caja = (t) => { const [x, y] = S.posModelo[t]; return `<div class="pb-mt" data-mt="${esc(t)}" style="left:${x}%;top:${y}%"><div class="pb-mt-t">${esc(t)}</div><div class="pb-mt-cols">${S.medidas.filter((m) => (m.tabla || nombres[0]) === t).map((m) => `<div>🧮 ${esc(m.nombre)}</div>`).join('')}${meta(t).map((c) => `<div>${['num', 'int'].includes(c.t) && !/_id$|^id$/i.test(c.n) ? 'Σ ' : ''}${esc(c.n)}</div>`).join('')}</div></div>`; };
    main.querySelector('#pbCentro').innerHTML = `<div class="pb-modelo" id="pbModelo"><svg class="pb-modelo-svg"></svg>${nombres.map(caja).join('')}</div>`;
    const cont = main.querySelector('#pbModelo'), svg = cont.querySelector('svg');
    const lineas = () => { const R = cont.getBoundingClientRect(); svg.innerHTML = S.rels.map((r) => { const a = cont.querySelector(`[data-mt="${CSS.escape(r.de)}"]`), b = cont.querySelector(`[data-mt="${CSS.escape(r.a)}"]`); if (!a || !b) return ''; const A = a.getBoundingClientRect(), B = b.getBoundingClientRect(); const x1 = A.left + A.width / 2 - R.left, y1 = A.top + A.height / 2 - R.top, x2 = B.left + B.width / 2 - R.left, y2 = B.top + B.height / 2 - R.top; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="pb-rel"/><text x="${x1 + (x2 - x1) * 0.18}" y="${y1 + (y2 - y1) * 0.18 - 4}" class="pb-rel-t">*</text><text x="${x1 + (x2 - x1) * 0.82}" y="${y1 + (y2 - y1) * 0.82 - 4}" class="pb-rel-t">1</text><polygon points="${(x1 + x2) / 2 - 5},${(y1 + y2) / 2 - 4} ${(x1 + x2) / 2 + 5},${(y1 + y2) / 2} ${(x1 + x2) / 2 - 5},${(y1 + y2) / 2 + 4}" transform="rotate(${(Math.atan2(y1 - y2, x1 - x2) * 180) / Math.PI} ${(x1 + x2) / 2} ${(y1 + y2) / 2})" class="pb-rel-flecha"><title>El filtro viaja de ${esc(r.a)} a ${esc(r.de)}</title></polygon>`; }).join(''); };
    requestAnimationFrame(lineas);
    cont.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('[data-mt]'); if (!el || !e.target.closest('.pb-mt-t')) return;
      const t = el.dataset.mt, R = cont.getBoundingClientRect(), x0 = e.clientX, y0 = e.clientY, ini = S.posModelo[t].slice();
      el.setPointerCapture(e.pointerId);
      const mover = (ev) => { S.posModelo[t] = [Math.max(0, Math.min(88, ini[0] + ((ev.clientX - x0) / R.width) * 100)), Math.max(0, Math.min(85, ini[1] + ((ev.clientY - y0) / R.height) * 100))]; el.style.left = S.posModelo[t][0] + '%'; el.style.top = S.posModelo[t][1] + '%'; lineas(); };
      const soltar = () => { el.removeEventListener('pointermove', mover); el.removeEventListener('pointerup', soltar); guardar(); };
      el.addEventListener('pointermove', mover); el.addEventListener('pointerup', soltar);
    });
    main.querySelector('#pbPaneles').innerHTML = `<div class="pb-pan-col"><div class="pb-pan"><div class="pb-pan-t">Propiedades del modelo</div><button class="pb-btn pb-btn-am" data-rel-adm style="margin:8px 10px">Administrar relaciones</button>${S.rels.map((r) => `<div class="pb-rel-i"><b>${esc(r.de)}</b>[${esc(r.cde)}] <span>* → 1</span> <b>${esc(r.a)}</b>[${esc(r.ca)}]</div>`).join('') || '<p class="pb-ayuda">No hay relaciones. Power BI las detecta cuando dos tablas comparten una columna clave (por ejemplo cliente_id); si no, créalas con Administrar relaciones.</p>'}<p class="pb-ayuda">Arrastra las tablas por su título para ordenarlas. El filtro viaja del lado <b>1</b> al lado <b>*</b>: así funciona un esquema estrella.</p></div></div>`;
    main.querySelector('[data-rel-adm]').addEventListener('click', dialogoRelaciones);
    renderPie();
  }
  function renderPie() {
    const pie = main.querySelector('#pbPie');
    if (S.vista !== 'informe') { pie.innerHTML = `<span class="pb-dim">${S.vista === 'tabla' ? 'Vista de tabla' : 'Vista de modelo'}</span>`; return; }
    pie.innerHTML = `<div class="pb-pags">${S.paginas.map((p, i) => `<button class="pb-pag ${i === S.pagina ? 'on' : ''}" data-pag="${i}" title="Doble clic para cambiar el nombre">${esc(p.nombre)}</button>`).join('')}<button class="pb-pag pb-pag-nueva" data-pag-nueva title="Nueva página">+</button></div><div class="pb-estado"><span>Página ${S.pagina + 1} de ${S.paginas.length}</span><span class="spacer"></span><span>${Object.keys(S.tablas).length} tablas · ${S.rels.length} relaciones · ${S.medidas.length} medidas</span><span class="pb-zoom">− ━━━●━━━ + 100 %</span></div>`;
    pie.querySelectorAll('[data-pag]').forEach((b) => { b.addEventListener('click', () => { S.pagina = Number(b.dataset.pag); S.sel = null; S.cruz = null; guardar(); render(); }); b.addEventListener('dblclick', () => { const n = prompt('Nombre de la página:', S.paginas[Number(b.dataset.pag)].nombre); if (n) { S.paginas[Number(b.dataset.pag)].nombre = n; guardar(); renderPie(); } }); });
    pie.querySelector('[data-pag-nueva]').addEventListener('click', () => { S.paginas.push({ nombre: `Página ${S.paginas.length + 1}`, visuales: [], filtros: [] }); S.pagina = S.paginas.length - 1; S.sel = null; S.cruz = null; guardar(); render(); });
  }
  window.addEventListener('hashchange', () => { if (!/^#\/powerbi/.test(location.hash)) document.body.classList.remove('pb-abierto'); });
  window.PowerBI = { vista, compilarDax, parseCsv, NUEVO };
})();
