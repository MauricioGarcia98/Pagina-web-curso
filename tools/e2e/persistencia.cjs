// Guardado pesado: miles de archivos chicos en la terminal y de blobs en un contenedor van enteros a IndexedDB;
// localStorage solo apunta a la versión ya escrita, sobrevive a una recarga inmediata y lo viejo se limpia.
const { ir, afirmar, correr } = require('./comun.cjs');

correr(async ({ p }) => {
  await ir(p, '/', 2500);
  const ls = await p.evaluate(async () => {
    await window.__discoListo();
    for (let i = 0; i < 3000; i++) window.Shell.writeFile(window.Shell.norm(`~/muchos/f${i}.json`), JSON.stringify({ i, texto: 'x'.repeat(300) }));
    for (const l of ['az login', 'az group create -n rg -l eastus2', 'az storage account create -n stpm -g rg -l eastus2 --sku Standard_LRS', 'az storage container create --account-name stpm -n c']) await window.Shell.runLine(l, { autoLogin: true });
    const C = window.CloudSim.az().storage.stpm.containers.c; C.blobs = C.blobs || {}; for (let i = 0; i < 3000; i++) C.blobs[`wh/${i}.json`] = JSON.stringify({ i, b: 'y'.repeat(400) });
    window.Shell.Machine.save(); await new Promise((ok) => setTimeout(ok, 2500));
    return (localStorage.getItem('academia-datos-maquina-v1') || '').length;
  });
  afirmar(ls < 50000, `localStorage queda chico con 6.000 archivos (${ls} caracteres)`);
  await p.reload(); await p.waitForTimeout(3000);
  const r1 = await p.evaluate(async () => {
    await window.__discoListo();
    const a = await window.Shell.runLine('ls ~/muchos | wc -l', { autoLogin: true });
    const n = Object.keys(window.CloudSim.az().storage.stpm.containers.c.blobs).length;
    await window.Shell.runLine('echo hola > ~/nuevo.txt', { autoLogin: true });
    await new Promise((ok) => setTimeout(ok, 1500)); return { archivos: a.out.trim(), blobs: n };
  });
  afirmar(r1.archivos === '3000' && r1.blobs === 3000, `tras recargar vuelven los 3.000 archivos y los 3.000 blobs (${r1.archivos} y ${r1.blobs})`);
  await p.reload(); await p.waitForTimeout(3000);
  const r2 = await p.evaluate(async () => { await window.__discoListo(); const a = await window.Shell.runLine('cat ~/nuevo.txt', { autoLogin: true }); return a.out.trim(); });
  afirmar(r2 === 'hola', 'un cambio hecho justo antes de recargar se conserva');
  const sinTerminal = await p.evaluate(() => !!(window.CloudSim.az().storage || {}).stpm);
  afirmar(sinTerminal, 'las nubes guardadas se ven sin abrir la terminal');
});
