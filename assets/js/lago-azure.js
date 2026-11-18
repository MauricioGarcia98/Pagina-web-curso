/* El lago de datos compartido: las cuentas de almacenamiento del portal de Azure de práctica.
 *
 * Cada herramienta lee y escribe los mismos blobs, cada una con la dirección que usa en la realidad:
 *   Databricks   abfss://<contenedor>@<cuenta>.dfs.core.windows.net/<ruta>
 *   Snowflake    azure://<cuenta>.blob.core.windows.net/<contenedor>/<ruta>
 *   BigQuery     azure://<cuenta>.blob.core.windows.net/<contenedor>/<ruta>
 *   cualquiera   https://<cuenta>.blob.core.windows.net/<contenedor>/<ruta>  (o .dfs.)
 * Data Factory y el portal ya trabajan directo sobre CloudSim.az().storage.
 */
(function () {
  'use strict';
  const az = () => (window.CloudSim && window.CloudSim.az ? window.CloudSim.az() : null);
  const guardar = () => { try { window.CloudSim.save(); } catch (e) { /* sin terminal */ } };

  class ErrorLago extends Error { constructor(msg, codigo) { super(msg); this.codigo = codigo; } }

  // separa una dirección en cuenta, contenedor y ruta
  function parsear(uri) {
    const u = String(uri || '').trim();
    let m;
    if ((m = /^(abfss?|wasbs?):\/\/([^@/]+)@([a-z0-9]+)\.(dfs|blob)\.core\.windows\.net\/?(.*)$/i.exec(u))) return { esquema: m[1].toLowerCase(), contenedor: m[2], cuenta: m[3].toLowerCase(), ruta: m[5].replace(/^\/+/, '') };
    if ((m = /^(azure|https?):\/\/([a-z0-9]+)\.(blob|dfs)\.core\.windows\.net\/([^/]+)\/?(.*)$/i.exec(u))) return { esquema: m[1].toLowerCase(), contenedor: m[4], cuenta: m[2].toLowerCase(), ruta: m[5].replace(/^\/+/, '') };
    return null;
  }
  const esDelLago = (uri) => !!parsear(uri);

  function contenedorDe(p) {
    const s = az(); if (!s) throw new ErrorLago('El portal de Azure de práctica no está disponible.', 'Unavailable');
    const A = (s.storage || {})[p.cuenta];
    if (!A) throw new ErrorLago(`The storage account '${p.cuenta}' was not found. Créala en el portal de Azure (Create a resource → Storage account).`, 'AccountNotFound');
    const C = (A.containers || {})[p.contenedor];
    if (!C) throw new ErrorLago(`The specified container does not exist. (ContainerNotFound: ${p.contenedor} en ${p.cuenta})`, 'ContainerNotFound');
    C.blobs = C.blobs || {};
    return { A, C };
  }

  // comodines de nombre de archivo: * y ?
  const comodin = (patron) => new RegExp('^' + patron.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]') + '$');

  /** Archivos bajo una dirección: un archivo exacto, una carpeta (todo lo de adentro) o un patrón con *. */
  function listar(uri) {
    const p = parsear(uri); if (!p) throw new ErrorLago(`'${uri}' no es una dirección de Azure Storage.`, 'InvalidUri');
    const { C } = contenedorDe(p);
    const ruta = p.ruta.replace(/\/$/, '');
    const nombres = Object.keys(C.blobs).filter((b) => !b.endsWith('/'));
    let lista;
    if (/[*?]/.test(ruta)) { const re = comodin(ruta); lista = nombres.filter((b) => re.test(b)); }
    else if (!ruta) lista = nombres;
    else lista = nombres.filter((b) => b === ruta || b.startsWith(ruta + '/'));
    // los archivos de control (_SUCCESS, _committed…) y los ocultos no son datos
    lista = lista.filter((b) => !/^[_.]/.test(b.split('/').pop()));
    return lista.sort().map((b) => ({ nombre: b, texto: C.blobs[b], uri: unir(p, b) }));
  }
  function unir(p, blob) {
    if (p.esquema.startsWith('abfs') || p.esquema.startsWith('wasb')) return `${p.esquema}://${p.contenedor}@${p.cuenta}.${p.esquema.startsWith('abfs') ? 'dfs' : 'blob'}.core.windows.net/${blob}`;
    return `${p.esquema === 'azure' ? 'azure' : 'https'}://${p.cuenta}.blob.core.windows.net/${p.contenedor}/${blob}`;
  }

  /** Escribe (o reemplaza) un archivo. */
  function escribir(uri, texto) {
    const p = parsear(uri); if (!p || !p.ruta || p.ruta.endsWith('/')) throw new ErrorLago(`'${uri}' no apunta a un archivo.`, 'InvalidUri');
    const { C } = contenedorDe(p);
    C.blobs[p.ruta] = String(texto);
    guardar();
    return unir(p, p.ruta);
  }
  /** Borra todo lo que hay bajo una carpeta (para escrituras que reemplazan la carpeta completa). */
  function vaciar(uri) {
    const p = parsear(uri); if (!p) throw new ErrorLago(`'${uri}' no es una dirección de Azure Storage.`, 'InvalidUri');
    const { C } = contenedorDe(p);
    const base = p.ruta.replace(/\/$/, '');
    let n = 0;
    for (const b of Object.keys(C.blobs)) if (!base || b === base || b.startsWith(base + '/')) { delete C.blobs[b]; n++; }
    guardar();
    return n;
  }
  /** ¿La cuenta tiene el espacio de nombres jerárquico (ADLS Gen2)? abfss:// lo necesita. */
  function esGen2(uri) { const p = parsear(uri); if (!p) return false; const A = ((az() || {}).storage || {})[p.cuenta]; return !!(A && A.hns); }

  window.LagoAzure = { parsear, esDelLago, listar, escribir, vaciar, esGen2, ErrorLago };
})();
