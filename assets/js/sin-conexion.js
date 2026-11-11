/* Uso sin conexión: registra el service worker (sw.js) y ofrece "Guardar todo el curso" desde Mis datos.
 * Solo funciona en https o en localhost (es una regla del navegador). */
(function () {
  'use strict';
  const soportado = 'serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname));
  let registro = null;
  if (soportado) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then((r) => { registro = r; }).catch(() => { /* sin service worker: el sitio funciona igual con internet */ });
    });
  }
  // envía un mensaje al service worker activo y espera las respuestas por un canal propio
  function hablar(datos, alAvanzar) {
    return new Promise((res, rej) => {
      const sw = navigator.serviceWorker && navigator.serviceWorker.controller;
      if (!sw) { rej(new Error('El modo sin conexión todavía no está activo: recarga la página una vez.')); return; }
      const canal = new MessageChannel();
      canal.port1.onmessage = (e) => { if (alAvanzar) alAvanzar(e.data); if (e.data.fin || e.data.archivos !== undefined || e.data.ok) res(e.data); };
      sw.postMessage(datos, [canal.port2]);
    });
  }
  window.SinConexion = {
    soportado,
    activo: () => !!(navigator.serviceWorker && navigator.serviceWorker.controller),
    estado: () => hablar({ tipo: 'estado' }),
    // urls: las direcciones del contenido del curso y de las herramientas (las arma app.js)
    guardarTodo: (alAvanzar) => hablar({ tipo: 'guardar', urls: window.__urlsCurso ? window.__urlsCurso() : [] }, alAvanzar),
    borrar: () => hablar({ tipo: 'borrar' }),
    get registro() { return registro; },
  };
})();
