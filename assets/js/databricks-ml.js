/* Databricks de práctica: Experiments y Models (MLflow) — learn.microsoft.com/azure/databricks/mlflow
 * Lo que registras en un notebook con el mini-MLflow (mlflow.start_run, log_param, log_metric, log_model,
 * register_model, alias) aparece acá: lista de corridas con parámetros y métricas, comparación, detalle de cada
 * corrida y el registro de modelos de Unity Catalog con versiones y alias (@champion, @challenger). */
(function () {
  'use strict';
  const D = (window.DBX = window.DBX || {});
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const ic = (n) => `<i class="codicon codicon-${n}"></i>`;
  const hora = (seg) => (seg ? new Date(seg * 1000).toLocaleString('es') : '—');
  const ML = () => { const w = D.ws(); w.mlflow = w.mlflow || { experimentos: [], runs: [], modelos: {} }; return w.mlflow; };
  const COL = ['#2272B4', '#FF3621', '#00A972', '#FFAB00', '#AB4057', '#8BCAE7'];

  // lo que devuelve el notebook se mezcla con lo guardado (si Python se reinició, no se pierde la historia)
  D.sincronizarMlflow = (m) => {
    if (!m) return; const g = ML();
    for (const e of m.experimentos || []) if (!g.experimentos.some((x) => x.nombre === e.nombre)) g.experimentos.push(e);
    for (const r of m.runs || []) { const i = g.runs.findIndex((x) => x.id === r.id); if (i >= 0) g.runs[i] = r; else g.runs.push(r); }
    for (const [n, mod] of Object.entries(m.modelos || {})) {
      const prev = g.modelos[n] || { versiones: [], alias: {} };
      for (const v of mod.versiones) if (!prev.versiones.some((x) => x.version === v.version)) prev.versiones.push(v);
      prev.alias = { ...prev.alias, ...mod.alias }; prev.creado = prev.creado || mod.creado; g.modelos[n] = prev;
    }
    D.guardar();
  };
  const EJEMPLO = `# Seguimiento de experimentos con MLflow (mini-MLflow de la práctica)
import mlflow
mlflow.set_experiment("/Users/alumno@academia.dev/precio-envios")

# un "modelo" mínimo: predice el costo de envío como base + tasa * peso
class ModeloEnvio:
    def __init__(self, base, tasa): self.base, self.tasa = base, tasa
    def predict(self, pesos): return [self.base + self.tasa * p for p in pesos]

datos = [(1, 5.2), (2, 7.1), (3, 8.9), (5, 13.2), (8, 19.0)]   # (peso, costo real)
for base, tasa in [(3, 2.0), (3.5, 1.9), (4, 1.6)]:
    with mlflow.start_run(run_name=f"base={base} tasa={tasa}"):
        modelo = ModeloEnvio(base, tasa)
        pred = modelo.predict([p for p, _ in datos])
        mae = sum(abs(y - yh) for (_, y), yh in zip(datos, pred)) / len(datos)
        mlflow.log_params({"base": base, "tasa": tasa})
        mlflow.log_metric("mae", mae)
        mlflow.sklearn.log_model(modelo, "model", registered_model_name="main.default.precio_envio")
        print(f"base={base} tasa={tasa} -> MAE {mae:.2f}")
`;
  const EJEMPLO2 = `# El mejor modelo pasa a ser el "champion" y se usa por su alias
from mlflow import MlflowClient
runs = mlflow.search_runs(order_by=["metrics.mae ASC"])
print(runs[["run_name", "metrics.mae"]])
mejor = MlflowClient().search_model_versions("name='main.default.precio_envio'")
MlflowClient().set_registered_model_alias("main.default.precio_envio", "champion", 3)
campeon = mlflow.pyfunc.load_model("models:/main.default.precio_envio@champion")
print(campeon.predict([4, 10]))
`;
  function crearEjemplo() {
    const W = D.ws();
    const base = Object.keys(W.items).find((k) => /\/Users\/[^/]+$/.test(k)) || '/Workspace/Shared';
    const p = base + '/MLflow - precio de envíos';
    const t = new Date().toISOString();
    W.items[p] = { tipo: 'notebook', lang: 'python', celdas: [{ id: 'c1', src: '%md\n## MLflow paso a paso\n1. Corre la celda 2: entrena tres versiones y registra cada una (parámetros, métrica MAE y el modelo).\n2. Mira **Experiments** en el menú: compara las tres corridas.\n3. Corre la celda 3: el mejor modelo recibe el alias **@champion** y se carga por ese alias.\n4. Mira **Models**: versiones y alias.' }, { id: 'c2', src: EJEMPLO }, { id: 'c3', src: EJEMPLO2 }], creado: t, modificado: t, compute: 'serverless' };
    D.guardar(); location.hash = '#/databricks/notebook/' + D.ruta(p);
  }

  // ---------------------------------------------------------------- Experiments
  D.registrar('experimentos', (cont, p) => { if (p[0] === 'run') return corrida(cont, p[1]); if (p[0]) return experimento(cont, p[0], p[1]); listaExperimentos(cont); });
  function listaExperimentos(cont) {
    const g = ML();
    cont.innerHTML = `<div class="dbx-pag"><div class="dbx-pag-cab"><h1>Experiments</h1><div class="dbx-acciones"><button class="dbx-btn primario" data-ej>${ic('notebook')} Crear notebook de ejemplo</button></div></div>
      <p class="dbx-dim">Un <b>experimento</b> agrupa corridas (<b>runs</b>) de entrenamiento. Cada corrida guarda los <b>parámetros</b> que probaste, las <b>métricas</b> que obtuviste y el <b>modelo</b>. Así comparas y no pierdes qué combinación dio el mejor resultado.</p>
      ${g.experimentos.length ? `<table class="dbx-tabla"><thead><tr><th>Name</th><th>Runs</th><th>Created</th></tr></thead><tbody>${g.experimentos.map((e) => `<tr><td><a href="#/databricks/experimentos/${encodeURIComponent(e.nombre)}">${ic('beaker')} ${esc(e.nombre)}</a></td><td>${g.runs.filter((r) => r.experimento === e.nombre).length}</td><td>${hora(e.creado)}</td></tr>`).join('')}</tbody></table>` : `<div class="dbx-vacio">${ic('beaker')}<p>Todavía no hay experimentos. Crea el notebook de ejemplo y córrelo: usa <code>mlflow.start_run()</code>, <code>log_param</code>, <code>log_metric</code> y <code>log_model</code>.</p></div>`}</div>`;
    cont.querySelector('[data-ej]').onclick = crearEjemplo;
  }
  function experimento(cont, nombre, comparar) {
    const g = ML(); const rs = g.runs.filter((r) => r.experimento === nombre).sort((a, b) => b.inicio - a.inicio);
    const params = [...new Set(rs.flatMap((r) => Object.keys(r.params)))], mets = [...new Set(rs.flatMap((r) => Object.keys(r.metricas)))];
    const ultima = (r, m) => (r.metricas[m] ? r.metricas[m][r.metricas[m].length - 1].valor : null);
    cont.innerHTML = `<div class="dbx-pag"><div class="dbx-pag-cab"><h1>${ic('beaker')} ${esc(nombre)}</h1><div class="dbx-acciones"><button class="dbx-btn" data-comparar>Compare selected</button></div></div>
      <table class="dbx-tabla"><thead><tr><th></th><th>Run name</th><th>Status</th><th>Created</th>${params.map((x) => `<th>${esc(x)}</th>`).join('')}${mets.map((x) => `<th>${esc(x)}</th>`).join('')}<th>Models</th></tr></thead><tbody>${rs.map((r) => `<tr><td><input type="checkbox" data-sel="${r.id}"></td><td><a href="#/databricks/experimentos/run/${r.id}">${esc(r.nombre)}</a></td><td>${r.estado === 'FINISHED' ? `<span class="dbx-ok">${ic('pass-filled')}</span>` : r.estado === 'FAILED' ? `<span class="dbx-mal">${ic('error')}</span>` : r.estado}</td><td>${hora(r.inicio)}</td>${params.map((x) => `<td>${esc(r.params[x] ?? '')}</td>`).join('')}${mets.map((x) => `<td class="num">${ultima(r, x) == null ? '' : Math.round(ultima(r, x) * 10000) / 10000}</td>`).join('')}<td>${r.modelos.length ? ic('package') : ''}</td></tr>`).join('')}</tbody></table>
      <div id="mlComp"></div></div>`;
    cont.querySelector('[data-comparar]').onclick = () => {
      const sel = [...cont.querySelectorAll('[data-sel]:checked')].map((x) => g.runs.find((r) => r.id === x.dataset.sel)); if (sel.length < 2) { D.toast('Elige al menos dos corridas.'); return; }
      const box = cont.querySelector('#mlComp');
      box.innerHTML = `<h3>Compare ${sel.length} runs</h3>${mets.map((m) => { const vals = sel.map((r) => ultima(r, m)); const mx = Math.max(...vals.map((v) => Math.abs(v || 0)), 1e-9); return `<div class="dbx-ml-comp"><b>${esc(m)}</b>${sel.map((r, i) => `<div class="dbx-ml-barra"><span>${esc(r.nombre)}</span><i style="width:${(Math.abs(vals[i] || 0) / mx) * 100}%;background:${COL[i % COL.length]}"></i><em>${vals[i] == null ? '—' : Math.round(vals[i] * 10000) / 10000}</em></div>`).join('')}</div>`; }).join('')}<table class="dbx-tabla"><thead><tr><th>Param</th>${sel.map((r) => `<th>${esc(r.nombre)}</th>`).join('')}</tr></thead><tbody>${params.map((x) => `<tr><td>${esc(x)}</td>${sel.map((r) => `<td>${esc(r.params[x] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    };
    void comparar;
  }
  function corrida(cont, rid) {
    const g = ML(); const r = g.runs.find((x) => x.id === rid); if (!r) return D.stub(cont, 'Run no encontrado', 'Esa corrida no existe.', [['Experiments', '#/databricks/experimentos']]);
    cont.innerHTML = `<div class="dbx-pag"><div class="dbx-pag-cab"><h1>${ic('beaker')} ${esc(r.nombre)}</h1><div class="dbx-acciones"><a class="dbx-btn" href="#/databricks/experimentos/${encodeURIComponent(r.experimento)}">${esc(r.experimento.split('/').pop())}</a></div></div>
      <table class="dbx-kv"><tr><th>Run ID</th><td><code>${esc(r.id)}</code></td></tr><tr><th>Status</th><td>${esc(r.estado)}</td></tr><tr><th>Duration</th><td>${r.fin ? ((r.fin - r.inicio) * 1000).toFixed(0) + ' ms' : '—'}</td></tr>${r.padre ? `<tr><th>Parent run</th><td><a href="#/databricks/experimentos/run/${r.padre}">${esc(r.padre)}</a></td></tr>` : ''}</table>
      <h3>Parameters</h3>${Object.keys(r.params).length ? `<table class="dbx-tabla">${Object.entries(r.params).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>` : '<p class="dbx-dim">Sin parámetros.</p>'}
      <h3>Metrics</h3>${Object.keys(r.metricas).length ? Object.entries(r.metricas).map(([k, serie]) => `<div class="dbx-ml-met"><b>${esc(k)}</b> = ${Math.round(serie[serie.length - 1].valor * 10000) / 10000}${serie.length > 1 ? linea(serie) : ''}</div>`).join('') : '<p class="dbx-dim">Sin métricas.</p>'}
      <h3>Tags</h3><p>${Object.entries(r.tags).map(([k, v]) => `<code>${esc(k)}=${esc(v)}</code>`).join(' ') || '<span class="dbx-dim">—</span>'}</p>
      <h3>Logged models</h3>${r.modelos.length ? r.modelos.map((m) => `<div class="dbx-ml-mod">${ic('package')} <code>runs:/${esc(r.id)}/${esc(m.ruta)}</code> · ${esc(m.flavor)} · ${esc(m.tipo)} ${m.firma ? '' : '<span class="dbx-dim">(sin firma: Unity Catalog pide signature o input_example)</span>'}</div>`).join('') : '<p class="dbx-dim">Sin modelos.</p>'}</div>`;
  }
  function linea(serie) {
    const W = 260, H = 60; const vs = serie.map((p) => p.valor); const mn = Math.min(...vs), mx = Math.max(...vs);
    return `<svg class="dbx-ml-sv" viewBox="0 0 ${W} ${H}"><polyline fill="none" stroke="#2272B4" stroke-width="2" points="${vs.map((v, i) => `${(i / (vs.length - 1)) * (W - 8) + 4},${H - 4 - ((v - mn) / ((mx - mn) || 1)) * (H - 8)}`).join(' ')}"/></svg>`;
  }

  // ---------------------------------------------------------------- Models (registro de Unity Catalog)
  D.registrar('modelos', (cont, p) => { if (p[0]) return modelo(cont, p[0]); listaModelos(cont); });
  function listaModelos(cont) {
    const g = ML(); const ms = Object.entries(g.modelos);
    cont.innerHTML = `<div class="dbx-pag"><div class="dbx-pag-cab"><h1>Models</h1></div><p class="dbx-dim">En Unity Catalog un modelo se nombra como una tabla, <code>catalogo.esquema.modelo</code>, y tiene <b>versiones</b>. Un <b>alias</b> (por ejemplo <code>@champion</code>) apunta a la versión que se usa en producción: para cambiar de modelo se mueve el alias, sin tocar el código que lo carga.</p>
      ${ms.length ? `<table class="dbx-tabla"><thead><tr><th>Name</th><th>Versions</th><th>Aliases</th><th>Created</th></tr></thead><tbody>${ms.map(([n, m]) => `<tr><td><a href="#/databricks/modelos/${encodeURIComponent(n)}">${ic('package')} ${esc(n)}</a></td><td>${m.versiones.length}</td><td>${Object.entries(m.alias).map(([a, v]) => `<span class="dbx-chip">@${esc(a)} → v${v}</span>`).join(' ')}</td><td>${hora(m.creado)}</td></tr>`).join('')}</tbody></table>` : `<div class="dbx-vacio">${ic('package')}<p>No hay modelos registrados. En un notebook: <code>mlflow.sklearn.log_model(modelo, "model", registered_model_name="main.default.mi_modelo")</code>.</p></div>`}</div>`;
  }
  function modelo(cont, nombre) {
    const g = ML(); const m = g.modelos[nombre]; if (!m) return D.stub(cont, 'Modelo no encontrado', 'Ese modelo no existe.', [['Models', '#/databricks/modelos']]);
    const aliasDe = (v) => Object.entries(m.alias).filter(([, x]) => String(x) === String(v)).map(([a]) => a);
    cont.innerHTML = `<div class="dbx-pag"><div class="dbx-pag-cab"><h1>${ic('package')} ${esc(nombre)}</h1></div>
      <table class="dbx-tabla"><thead><tr><th>Version</th><th>Aliases</th><th>Source run</th><th>Registered</th><th></th></tr></thead><tbody>${m.versiones.slice().reverse().map((v) => `<tr><td>Version ${v.version}</td><td>${aliasDe(v.version).map((a) => `<span class="dbx-chip">@${esc(a)}</span>`).join(' ')}</td><td><a href="#/databricks/experimentos/run/${v.run_id}">${esc((g.runs.find((r) => r.id === v.run_id) || {}).nombre || v.run_id.slice(0, 8))}</a></td><td>${hora(v.creado)}</td><td><button class="dbx-btn" data-alias="${v.version}">Set alias</button></td></tr>`).join('')}</tbody></table>
      <h3>Usar el modelo</h3><pre class="dbx-mono">import mlflow\nmodelo = mlflow.pyfunc.load_model("models:/${esc(nombre)}@champion")\nmodelo.predict(datos)</pre></div>`;
    cont.querySelectorAll('[data-alias]').forEach((b) => (b.onclick = () => D.dialogo({ titulo: `Set alias (version ${b.dataset.alias})`, ok: 'Save', cuerpo: '<label class="dbx-campo"><span>Alias</span><input id="mA" value="champion"></label><p class="dbx-dim">Si el alias ya apuntaba a otra versión, se mueve a esta.</p>', alOk: async (dlg) => {
      const a = dlg.querySelector('#mA').value.trim().replace(/^@/, ''); if (!/^[a-z][\w-]*$/i.test(a)) throw new Error('Alias inválido');
      try { await D.Py.correr(`from mlflow import MlflowClient\nMlflowClient().set_registered_model_alias(${JSON.stringify(nombre)}, ${JSON.stringify(a)}, ${b.dataset.alias})`, {}); } catch (e) { /* sin Python: solo la interfaz */ }
      m.alias[a] = Number(b.dataset.alias); D.guardar(); modelo(cont, nombre);
    } })));
  }
})();
