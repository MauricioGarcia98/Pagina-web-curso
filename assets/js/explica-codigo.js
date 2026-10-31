/* Explicador de código para los laboratorios de SQL, dbt, Python, PySpark y Airflow.
 * Después de ejecutar o entregar, el panel "¿Qué hace tu código?" explica, en lenguaje simple:
 *  - SQL: el orden en que la base ejecuta la consulta (FROM → WHERE → GROUP BY → HAVING → SELECT →
 *    ORDER BY → LIMIT), cada columna, cada condición, cada JOIN y cada función que usaste.
 *  - dbt: cada pieza de Jinja (source, ref, config, var, if, for, macros) y el SQL compilado.
 *  - Python / PySpark / Airflow: línea por línea, cada concepto la primera vez que aparece.
 *  - Errores: qué significa el mensaje, en qué línea está y las causas más comunes.
 * También arma las chuletas de cada laboratorio: ejemplos que se pegan en el editor con un clic.
 * window.ExplicaCodigo = { panel(lab), chuleta(lab, alUsar, opciones), explicar(lab, codigo, r), insertar(ed, texto) } */
(function () {
  'use strict';
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const c = (s) => `<code>${esc(s)}</code>`;
  const corto = (s, n = 90) => { s = String(s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

  // ================================================================== SQL
  // funciones de SQL: qué hacen, con un ejemplo
  const FN = {
    count: 'cuenta filas. <code>COUNT(*)</code> cuenta todas las filas; <code>COUNT(columna)</code> cuenta solo las que <b>no</b> tienen NULL en esa columna; <code>COUNT(DISTINCT columna)</code> cuenta los valores distintos.',
    sum: 'suma los valores de la columna en cada grupo (los NULL se ignoran). Si todo el grupo es NULL, da NULL, no 0.',
    total: 'como SUM, pero devuelve 0.0 en vez de NULL cuando no hay valores (es propia de SQLite).',
    avg: 'calcula el promedio (suma ÷ cantidad de valores no NULL). Ojo: los NULL no cuentan como 0, simplemente no se cuentan.',
    min: 'el valor más chico del grupo. Con texto, el primero en orden alfabético; con fechas ISO, la más antigua.',
    max: 'el valor más grande del grupo. Con fechas ISO (<code>2024-03-15</code>), la más reciente.',
    round: 'redondea: <code>ROUND(x, 2)</code> deja 2 decimales. Sin segundo argumento redondea a entero.',
    abs: 'el valor absoluto (saca el signo negativo).',
    coalesce: 'devuelve el <b>primer valor que no sea NULL</b> de la lista: <code>COALESCE(telefono, \'sin dato\')</code> reemplaza los NULL por un texto. Es la forma estándar de tratar vacíos.',
    ifnull: 'como COALESCE pero con dos argumentos: si el primero es NULL, usa el segundo.',
    nullif: '<code>NULLIF(a, b)</code> devuelve NULL si a = b. Se usa para evitar dividir por cero: <code>x / NULLIF(y, 0)</code>.',
    iif: '<code>IIF(condición, si, no)</code>: un CASE corto de una sola condición.',
    lower: 'pasa el texto a minúsculas. Muy útil para comparar sin que importen las mayúsculas.',
    upper: 'pasa el texto a mayúsculas.',
    trim: 'saca los espacios del principio y del final. <code>LTRIM</code> y <code>RTRIM</code> sacan solo de un lado.',
    ltrim: 'saca los espacios de la izquierda.',
    rtrim: 'saca los espacios de la derecha.',
    length: 'la cantidad de caracteres de un texto.',
    substr: '<code>SUBSTR(texto, desde, cuántos)</code> recorta un pedazo. Empieza a contar en 1: <code>SUBSTR(\'2024-03-15\', 1, 7)</code> = <code>\'2024-03\'</code>.',
    substring: 'igual que SUBSTR: recorta un pedazo del texto (empieza a contar en 1).',
    replace: '<code>REPLACE(texto, \'buscar\', \'poner\')</code> reemplaza todas las apariciones.',
    instr: '<code>INSTR(texto, \'@\')</code> dice en qué posición aparece algo (0 si no aparece).',
    concat: 'une textos: <code>CONCAT(nombre, \' \', apellido)</code>. En SQLite también se usa el operador <code>||</code>.',
    printf: 'arma un texto con formato: <code>PRINTF(\'%.2f\', x)</code> muestra x con 2 decimales.',
    cast: 'convierte un tipo en otro: <code>CAST(x AS INTEGER)</code>, <code>CAST(x AS REAL)</code>, <code>CAST(x AS TEXT)</code>. Sirve, por ejemplo, para que una división de enteros dé decimales.',
    strftime: 'formatea o extrae partes de una fecha (SQLite): <code>strftime(\'%Y\', fecha)</code> = año, <code>\'%m\'</code> = mes, <code>\'%Y-%m\'</code> = año-mes, <code>\'%w\'</code> = día de la semana (0 = domingo). En PostgreSQL se usa <code>EXTRACT</code> o <code>TO_CHAR</code>.',
    date: 'convierte a fecha (<code>AAAA-MM-DD</code>) y permite sumar tiempo: <code>DATE(fecha, \'+30 days\')</code>, <code>DATE(\'now\')</code> es hoy.',
    datetime: 'como DATE pero con hora: <code>DATETIME(fecha_hora, \'+2 hours\')</code>.',
    time: 'extrae la hora de un valor de fecha y hora.',
    julianday: 'convierte una fecha en un número de días. Restando dos se obtienen los días entre fechas: <code>julianday(b) - julianday(a)</code>.',
    group_concat: 'une en un solo texto los valores del grupo, separados por coma: <code>GROUP_CONCAT(nombre, \', \')</code>. En PostgreSQL es <code>STRING_AGG</code>.',
    row_number: 'función de ventana: numera las filas 1, 2, 3… dentro de cada partición, según el ORDER BY del OVER. Nunca repite números, aunque haya empates. Es la clásica para "el primero de cada grupo".',
    rank: 'función de ventana: posición con empates (1, 1, 3): dos filas iguales comparten puesto y se salta el siguiente.',
    dense_rank: 'función de ventana: posición con empates sin saltos (1, 1, 2).',
    ntile: '<code>NTILE(4)</code> reparte las filas en 4 grupos de tamaño parecido (cuartiles).',
    lag: 'función de ventana: trae el valor de la fila <b>anterior</b> (según el ORDER BY del OVER). Sirve para comparar con el período anterior: crecimiento, diferencias.',
    lead: 'función de ventana: trae el valor de la fila <b>siguiente</b>.',
    first_value: 'función de ventana: el primer valor de la ventana.',
    last_value: 'función de ventana: el último valor de la ventana (ojo con el marco: por defecto termina en la fila actual).',
    percent_rank: 'función de ventana: posición relativa entre 0 y 1.',
    cume_dist: 'función de ventana: proporción de filas con un valor menor o igual.',
    exists: '<code>EXISTS (subconsulta)</code> es verdadero si la subconsulta devuelve al menos una fila. Se usa para "clientes que tienen al menos un pedido".',
    date_trunc: 'trunca una fecha (PostgreSQL, Spark): <code>DATE_TRUNC(\'month\', fecha)</code> = el primer día del mes. En SQLite no existe: usa <code>strftime(\'%Y-%m\', fecha)</code>.',
    extract: '<code>EXTRACT(YEAR FROM fecha)</code> saca una parte de la fecha (PostgreSQL, MySQL). En SQLite: <code>strftime(\'%Y\', fecha)</code>.',
    random: 'un número al azar. <code>ORDER BY RANDOM()</code> mezcla las filas.',
    typeof: 'dice el tipo con que SQLite guardó el valor: integer, real, text o null.',
  };
  const AGREG = ['count', 'sum', 'avg', 'min', 'max', 'total', 'group_concat'];
  const VENTANA = ['row_number', 'rank', 'dense_rank', 'ntile', 'lag', 'lead', 'first_value', 'last_value', 'percent_rank', 'cume_dist'];
  const PALABRAS = new Set('select from where group by having order limit offset join inner left right full outer cross on and or not in is null like between as case when then else end distinct union all with asc desc over partition exists natural using window intersect except values set into'.split(' '));

  // saca comentarios y textos entre comillas (para que una coma o un paréntesis dentro de un texto no confunda)
  function enmascarar(sql) {
    const lits = [];
    let s = String(sql).replace(/--[^\n]*/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');
    s = s.replace(/'(?:[^']|'')*'/g, (m) => { lits.push(m); return `'§${lits.length - 1}'`; });
    return { s, des: (t) => String(t).replace(/'§(\d+)'/g, (_, i) => lits[i]) };
  }
  // reemplaza lo que está dentro de paréntesis por espacios: lo que queda es el "nivel de arriba" de la consulta
  function aplanar(s) {
    let d = 0, o = '';
    for (const ch of s) {
      if (ch === '(') { d++; o += d === 1 ? '(' : ' '; continue; }
      if (ch === ')') { d = Math.max(0, d - 1); o += d === 0 ? ')' : ' '; continue; }
      o += d > 0 ? ' ' : ch;
    }
    return o;
  }
  // parte por un separador, solo en el nivel de arriba
  function partir(s, re) {
    const p = aplanar(s), out = [];
    let ult = 0, m;
    const g = new RegExp(re.source, 'gi');
    while ((m = g.exec(p))) { out.push({ txt: s.slice(ult, m.index), sep: m[0] }); ult = m.index + m[0].length; if (!m[0].length) g.lastIndex++; }
    out.push({ txt: s.slice(ult), sep: '' });
    return out.filter((x) => x.txt.trim());
  }
  const filasDe = (t) => { try { const T = window.Engines && window.Engines.SQL && window.Engines.SQL.tables; return T && T[t] ? T[t].rows.length : null; } catch (e) { return null; } };
  const nFil = (t) => { const n = filasDe(t); return n == null ? '' : ` (${n.toLocaleString('es')} filas)`; };

  const CLAUSULAS = [
    ['with', /\bWITH\b/], ['select', /\bSELECT\b/], ['from', /\bFROM\b/], ['where', /\bWHERE\b/], ['group', /\bGROUP\s+BY\b/],
    ['having', /\bHAVING\b/], ['window', /\bWINDOW\b/], ['order', /\bORDER\s+BY\b/], ['limit', /\bLIMIT\b/], ['offset', /\bOFFSET\b/],
  ];
  function clausulas(st) {
    const p = aplanar(st), pos = [];
    for (const [k, re] of CLAUSULAS) {
      const g = new RegExp(re.source, 'gi'); let m;
      while ((m = g.exec(p))) { pos.push({ k, i: m.index, len: m[0].length }); if (k !== 'select') break; }
    }
    // SELECT del nivel de arriba: el primero después del WITH (los de adentro de paréntesis no se ven)
    pos.sort((a, b) => a.i - b.i);
    const out = {};
    const sel = pos.filter((x) => x.k === 'select');
    const usados = pos.filter((x) => x.k !== 'select' || x === sel[0]);
    usados.forEach((x, j) => { const fin = j + 1 < usados.length ? usados[j + 1].i : st.length; if (!(x.k in out)) out[x.k] = st.slice(x.i + x.len, fin).trim(); });
    return out;
  }

  function explicarCondicion(t, des) {
    const x = t.trim(), u = x.toUpperCase(), notas = [];
    if (/^\(?\s*SELECT\b/i.test(x) || /\(\s*SELECT\b/i.test(x)) notas.push('usa una <b>subconsulta</b> (un SELECT adentro de otro): la base la resuelve primero y usa su resultado para comparar');
    if (/\bIS\s+NOT\s+NULL\b/.test(u)) notas.push('<code>IS NOT NULL</code>: que la columna <b>tenga</b> un valor');
    else if (/\bIS\s+NULL\b/.test(u)) notas.push('<code>IS NULL</code>: que la columna esté <b>vacía</b>. Ojo: <code>= NULL</code> nunca funciona, siempre se usa IS NULL');
    if (/\bNOT\s+IN\b/.test(u)) notas.push('<code>NOT IN (…)</code>: que el valor <b>no</b> esté en la lista. Cuidado: si la lista tiene un NULL, no devuelve nada');
    else if (/\bIN\s*\(/.test(u)) notas.push('<code>IN (…)</code>: que el valor sea <b>alguno</b> de la lista (es como varios <code>=</code> unidos con OR)');
    if (/\bBETWEEN\b/.test(u)) notas.push('<code>BETWEEN a AND b</code>: entre a y b, <b>incluyendo</b> los dos extremos. Con fechas con hora, el último día puede quedar afuera');
    if (/\bLIKE\b/.test(u)) notas.push('<code>LIKE</code> busca un patrón de texto: <code>%</code> es "cualquier cosa (o nada)" y <code>_</code> es "exactamente un carácter". En SQLite no distingue mayúsculas en letras sin tilde');
    if (/\bEXISTS\b/.test(u)) notas.push('<code>EXISTS</code>: verdadero si la subconsulta devuelve al menos una fila');
    if (/<>|!=/.test(x)) notas.push('<code>&lt;&gt;</code> o <code>!=</code>: distinto de');
    else if (/>=|<=/.test(x)) notas.push('<code>&gt;=</code> mayor o igual, <code>&lt;=</code> menor o igual');
    else if (/[<>]/.test(x)) notas.push('<code>&gt;</code> mayor que, <code>&lt;</code> menor que (con fechas ISO como texto, compara cronológicamente)');
    else if (/=/.test(x) && !notas.length) notas.push('<code>=</code>: igual a. Con texto, distingue mayúsculas: <code>\'chile\'</code> no es igual a <code>\'Chile\'</code>');
    if (/'\d{4}-\d{2}-\d{2}/.test(des(x))) notas.push('compara fechas escritas como texto <code>AAAA-MM-DD</code>: funciona porque en ese formato el orden alfabético es el cronológico');
    if (/^NOT\b/.test(u)) notas.push('<code>NOT</code> invierte la condición');
    return notas;
  }

  function explicarItem(it, des) {
    let x = it.trim(), alias = '';
    let m = x.match(/^([\s\S]*?)\s+AS\s+("?[\wáéíóúñ]+"?)\s*$/i);
    if (m) { x = m[1]; alias = m[2].replace(/"/g, ''); }
    else if ((m = x.match(/^([\s\S]*[\w)'\]])\s+([a-z_][\w]*)$/i)) && !PALABRAS.has(m[2].toLowerCase()) && !/^\w+\.\w+$|^\w+$/.test(x)) { x = m[1]; alias = m[2]; }
    const u = x.toUpperCase();
    let qué;
    if (x === '*') qué = 'todas las columnas de las tablas del FROM';
    else if (/^\w+\.\*$/.test(x)) qué = `todas las columnas de ${c(x.split('.')[0])}`;
    else if (/^\w+\.\w+$/.test(x)) qué = `la columna ${c(x.split('.')[1])} de la tabla (o alias) ${c(x.split('.')[0])}`;
    else if (/^\w+$/.test(x)) qué = `la columna ${c(x)} tal como está`;
    else if (/^'§\d+'$/.test(x) || /^-?\d+(\.\d+)?$/.test(x)) qué = 'un valor fijo, igual en todas las filas';
    else if (/\bOVER\s*\(/.test(u)) {
      const f = (x.match(/^(\w+)\s*\(/) || [])[1] || '';
      const part = (x.match(/PARTITION\s+BY\s+([\s\S]*?)(ORDER\s+BY|ROWS|RANGE|\)\s*$)/i) || [])[1];
      const ord = (x.match(/ORDER\s+BY\s+([\s\S]*?)(ROWS|RANGE|\)\s*$)/i) || [])[1];
      qué = `una <b>función de ventana</b> (${c(f.toUpperCase())}): calcula sobre un grupo de filas <b>sin juntarlas</b>, cada fila conserva su lugar` +
        (part ? `; la ventana se arma por cada ${c(des(part.trim()))} (PARTITION BY)` : '; sin PARTITION BY la ventana es toda la tabla') +
        (ord ? `, ordenada por ${c(des(ord.trim()))}` : '') + (AGREG.includes(f.toLowerCase()) && ord ? '. Una suma con ORDER BY en la ventana es un <b>acumulado</b>: va sumando fila a fila' : '');
    } else if (/^CASE\b/.test(u)) qué = 'un <b>CASE</b>: revisa las condiciones WHEN en orden, usa el THEN de la primera que se cumple y, si ninguna, el ELSE (sin ELSE da NULL). Es el "si… entonces…" de SQL';
    else {
      const f = (x.match(/^(\w+)\s*\(/) || [])[1];
      if (f && AGREG.includes(f.toLowerCase())) {
        const dist = /\(\s*DISTINCT\b/i.test(x);
        qué = `una <b>agregación</b> (${c(f.toUpperCase())}${dist ? ' con DISTINCT' : ''}): resume muchas filas en un número por grupo`;
      } else if (/\|\|/.test(x)) qué = 'une textos con <code>||</code> (concatenar)';
      else if (/[-+*/%]/.test(aplanar(x))) qué = 'un <b>cálculo</b> fila por fila' + (/\/\s*\d+(?!\.)/.test(x) || /\/\s*\w/.test(x) ? '. Ojo: en SQLite, entero ÷ entero da entero (7 / 2 = 3); multiplica por <code>1.0</code> si quieres decimales' : '');
      else if (f) qué = `el resultado de la función ${c(f.toUpperCase())}`;
      else qué = 'una expresión calculada';
    }
    return `<li>${c(corto(des(it.trim()), 110))} → ${qué}${alias ? `. Se va a llamar ${c(alias)} en el resultado (eso hace <code>AS</code>)` : ''}.</li>`;
  }

  function explicarFrom(txt, des) {
    const out = [];
    const re = /\b((?:NATURAL\s+)?(?:LEFT|RIGHT|FULL)(?:\s+OUTER)?\s+JOIN|INNER\s+JOIN|CROSS\s+JOIN|JOIN)\b/i;
    const partes = partir(txt, re);
    const seps = []; { const g = new RegExp(re.source, 'gi'); let m; const p = aplanar(txt); while ((m = g.exec(p))) seps.push(m[1].toUpperCase().replace(/\s+/g, ' ')); }
    const tabla = (t) => {
      t = t.trim();
      if (/^\(/.test(t)) { const al = (t.match(/\)\s*(?:AS\s+)?(\w+)\s*$/i) || [])[1]; return `una <b>subconsulta</b> usada como tabla${al ? ` con el nombre ${c(al)}` : ''}`; }
      const m = t.match(/^([\w.]+)(?:\s+(?:AS\s+)?(\w+))?/i) || [];
      const n = (m[1] || t).replace(/^main\./, '');
      return `la tabla ${c(n)}${nFil(n)}${m[2] && !PALABRAS.has(m[2].toLowerCase()) ? `, a la que llamas ${c(m[2])} (un <b>alias</b>: un apodo corto para escribir menos)` : ''}`;
    };
    partes.forEach((p, i) => {
      const [t, on] = p.txt.split(/\bON\b|\bUSING\b/i);
      if (i === 0) {
        const comas = partir(t, /,/);
        out.push(`<li><b>FROM</b>: lee ${comas.map((x) => tabla(x.txt)).join(' y ')}.${comas.length > 1 ? ' Varias tablas separadas por coma son un CROSS JOIN: todas las combinaciones (filtra con WHERE o, mejor, usa JOIN … ON).' : ''}</li>`);
        return;
      }
      const tipo = seps[i - 1] || 'JOIN';
      const qué = /LEFT/.test(tipo) ? '<b>LEFT JOIN</b>: se quedan <b>todas</b> las filas de la tabla de la izquierda; si no encuentran pareja en la otra, sus columnas vienen en NULL. Es el que se usa para "los que no tienen…" (con <code>WHERE otra.id IS NULL</code>)'
        : /RIGHT/.test(tipo) ? '<b>RIGHT JOIN</b>: como LEFT, pero se quedan todas las de la derecha'
          : /FULL/.test(tipo) ? '<b>FULL JOIN</b>: se quedan todas las filas de las dos tablas, con NULL donde no hay pareja'
            : /CROSS/.test(tipo) ? '<b>CROSS JOIN</b>: todas las combinaciones posibles (filas de A × filas de B)'
              : '<b>JOIN</b> (INNER): solo quedan las filas que encuentran pareja en las dos tablas; las que no, desaparecen';
      out.push(`<li>Se une con ${tabla(t)}. ${qué}.${on ? ` La pareja se busca con ${c(corto(des(on), 100))}: una fila de cada lado se juntan cuando eso se cumple. Normalmente es la clave de una tabla igualada a la clave foránea de la otra.` : ''}</li>`);
    });
    return out;
  }

  function resumenSelect(st, des) {
    const k = clausulas(st), b = [];
    if (k.from) b.push('lee ' + corto(des(k.from.split(/\bWHERE\b/i)[0]), 50));
    if (k.where) b.push('filtra');
    if (k.group) b.push('agrupa por ' + corto(des(k.group), 40));
    if (k.having) b.push('filtra grupos');
    if (k.order) b.push('ordena');
    return b.join(', ');
  }

  function explicarSelect(st, des) {
    const k = clausulas(st), pasos = [], extra = [], fns = new Set();
    const usado = { from: !!k.from, where: !!k.where, group: !!k.group, having: !!k.having, select: true, order: !!k.order, limit: !!k.limit };
    if (k.with) {
      const ctes = []; const p = aplanar(k.with); const g = /(?:^|,)\s*(\w+)\s*(?:\([^)]*\))?\s+AS\s*(?:MATERIALIZED\s+)?\(/gi; let m;
      while ((m = g.exec(p))) {
        const ini = m.index + m[0].length; let d = 1, j = ini;
        while (j < k.with.length && d > 0) { if (k.with[j] === '(') d++; if (k.with[j] === ')') d--; j++; }
        ctes.push([m[1], k.with.slice(ini, j - 1)]);
      }
      pasos.push(`<li><b>WITH</b> (CTE): antes de la consulta principal se arman ${ctes.length === 1 ? 'una tabla temporal' : ctes.length + ' tablas temporales'} con nombre, que solo existen mientras corre esta consulta:<ul>${ctes.map(([n, body]) => `<li>${c(n)}: ${esc(resumenSelect(body, des)) || 'una consulta'}.</li>`).join('')}</ul>Sirve para escribir una consulta difícil en pasos que se leen de arriba hacia abajo.${/RECURSIVE/i.test(st.slice(0, 30)) ? ' Es <b>RECURSIVE</b>: una parte se llama a sí misma hasta que no agrega filas (para jerarquías o series).' : ''}</li>`);
    }
    if (k.from) pasos.push(...explicarFrom(k.from, des));
    if (k.where) {
      const conds = partir(k.where, /\b(AND|OR)\b/);
      pasos.push(`<li><b>WHERE</b>: revisa <b>fila por fila</b> y se queda solo con las que cumplen ${conds.length > 1 ? 'estas condiciones' : 'esta condición'}:<ul>${conds.map((x, i) => { const n = explicarCondicion(x.txt, des); return `<li>${i ? `<b>${esc(conds[i - 1].sep.toUpperCase())}</b> ` : ''}${c(corto(des(x.txt), 90))}${n.length ? ' — ' + n.join('; ') : ''}.</li>`; }).join('')}</ul>${conds.some((x) => x.sep && /or/i.test(x.sep)) && conds.some((x) => x.sep && /and/i.test(x.sep)) ? '⚠️ Mezclas AND y OR: AND se evalúa primero. Usa paréntesis para dejar claro qué va con qué.' : 'Todo esto pasa <b>antes</b> de agrupar: el WHERE no puede usar SUM o COUNT (para eso está HAVING).'}</li>`);
    }
    let items = [];
    if (k.select != null) {
      let s = k.select; const dist = /^DISTINCT\b/i.test(s); if (dist) s = s.replace(/^DISTINCT\s+/i, '');
      items = partir(s, /,/).map((x) => x.txt);
      if (k.group) {
        const g = partir(k.group, /,/).map((x) => x.txt.trim().toLowerCase());
        pasos.push(`<li><b>GROUP BY</b> ${c(corto(des(k.group), 60))}: junta en un mismo grupo las filas que tienen el mismo valor de ${g.length > 1 ? 'esas columnas (la combinación)' : 'esa columna'}. Desde acá, <b>cada grupo es una fila</b> del resultado, y las otras columnas solo se pueden usar dentro de una agregación (COUNT, SUM, AVG…).</li>`);
        const sueltas = items.map((x) => x.trim().replace(/\s+AS\s+\w+$/i, '')).filter((x) => /^[\w.]+$/.test(x) && !g.includes(x.toLowerCase()) && !g.includes(x.toLowerCase().split('.').pop()) && !/^\d+$/.test(x));
        if (sueltas.length) extra.push(`⚠️ ${sueltas.map(c).join(', ')} está en el SELECT pero no en el GROUP BY ni dentro de una agregación. SQLite lo acepta y elige un valor cualquiera del grupo; PostgreSQL, SQL Server y BigQuery dan error. Agrégala al GROUP BY o envuélvela en una agregación.`);
      } else if (items.some((x) => new RegExp(`^\\s*(${AGREG.join('|')})\\s*\\(`, 'i').test(x) && !/OVER\s*\(/i.test(x))) {
        pasos.push('<li>No hay GROUP BY pero usas agregaciones: <b>toda la tabla (lo que quedó después del WHERE) es un solo grupo</b>, así que el resultado tiene una sola fila.</li>');
      }
      if (k.having) pasos.push(`<li><b>HAVING</b> ${c(corto(des(k.having), 80))}: filtra <b>grupos</b>, después de agrupar. Es el WHERE de los grupos: acá sí puedes usar ${c('COUNT(*) > 10')} o ${c('SUM(x) >= 1000')}.</li>`);
      pasos.push(`<li><b>SELECT</b>${dist ? ' <b>DISTINCT</b>' : ''}: arma las columnas del resultado${dist ? ' y después <b>elimina las filas repetidas</b> (DISTINCT mira la fila completa, no una sola columna)' : ''}:<ul>${items.map((x) => explicarItem(x, des)).join('')}</ul></li>`);
    }
    if (k.order) {
      const os = partir(k.order, /,/).map((x) => x.txt.trim());
      pasos.push(`<li><b>ORDER BY</b>: ordena el resultado por ${os.map((o) => `${c(des(o.replace(/\s+(ASC|DESC)\b.*$/i, '')))} ${/\bDESC\b/i.test(o) ? '<b>de mayor a menor</b> (DESC)' : 'de menor a mayor (ASC, el orden por defecto)'}`).join('; si empatan, por ')}. ${os.length > 1 ? 'Los criterios siguientes solo desempatan.' : 'Si dos filas empatan, el orden entre ellas no está garantizado: agrega un segundo criterio para que sea siempre igual.'} El ORDER BY sí puede usar los alias del SELECT, porque corre después.</li>`);
    }
    if (k.limit) {
      const [n, off] = k.limit.split(/\s*,\s*|\s+OFFSET\s+/i);
      pasos.push(`<li><b>LIMIT ${esc(des(n))}</b>: devuelve como máximo ${esc(des(n))} filas${off || k.offset ? `, salteando las primeras ${esc(des(off || k.offset))} (OFFSET, para paginar)` : ''}. Es lo último que se aplica.${k.order ? '' : ' ⚠️ Sin ORDER BY, <b>cuáles</b> filas salen no está garantizado: la base devuelve las que le quedan más cómodas.'}</li>`);
    }
    const subq = (st.match(/\(\s*SELECT\b/gi) || []).length - ((k.with || '').match(/\(\s*SELECT\b/gi) || []).length;
    if (subq > 0 && !pasos.some((p) => /subconsulta/.test(p))) extra.push(`Tu consulta tiene ${subq === 1 ? 'una subconsulta' : subq + ' subconsultas'} (un SELECT entre paréntesis): la base la resuelve y usa su resultado como si fuera un valor, una lista o una tabla.`);
    for (const m of st.matchAll(/\b([a-z_]+)\s*\(/gi)) { const f = m[1].toLowerCase(); if (FN[f]) fns.add(f); }
    return { pasos, extra, fns, usado };
  }

  function explicarOtra(st, des) {
    const u = st.trim().toUpperCase(), x = (re) => (st.match(re) || [])[1] || '';
    if (/^CREATE\s+(TEMP\s+|TEMPORARY\s+)?TABLE/.test(u)) return /\bAS\s+SELECT\b/.test(u) ? `<b>CREATE TABLE … AS SELECT</b>: crea la tabla ${c(x(/TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w.]+)/i))} y la llena con el resultado de la consulta. Así se "materializa" un resultado.` : `<b>CREATE TABLE</b>: crea la tabla ${c(x(/TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w.]+)/i))} vacía, con sus columnas, tipos y restricciones (PRIMARY KEY = identifica cada fila y no se repite; NOT NULL = no puede quedar vacía; REFERENCES = clave foránea, tiene que existir en la otra tabla).`;
    if (/^CREATE\s+(TEMP\s+)?VIEW/.test(u)) return `<b>CREATE VIEW</b>: guarda la consulta con el nombre ${c(x(/VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w.]+)/i))}. Una vista no guarda datos: cada vez que la consultas, corre la consulta de nuevo.`;
    if (/^CREATE\s+(UNIQUE\s+)?INDEX/.test(u)) return '<b>CREATE INDEX</b>: crea un índice, como el índice de un libro: hace más rápidas las búsquedas y los JOIN por esa columna, a cambio de ocupar espacio y hacer un poco más lentas las escrituras.';
    if (/^INSERT/.test(u)) return `<b>INSERT</b>: agrega filas nuevas a ${c(x(/INTO\s+([\w.]+)/i))}. ${/\bSELECT\b/.test(u) ? 'Las filas salen de una consulta (INSERT … SELECT).' : 'Los valores van en el mismo orden que las columnas entre paréntesis.'}`;
    if (/^UPDATE/.test(u)) return `<b>UPDATE</b>: cambia valores de filas que ya existen en ${c(x(/UPDATE\s+([\w.]+)/i))}. ${/\bWHERE\b/.test(u) ? 'Solo las que cumplen el WHERE.' : '⚠️ <b>No tiene WHERE: cambia TODAS las filas de la tabla.</b> En una base real, esto es un incidente.'}`;
    if (/^DELETE/.test(u)) return `<b>DELETE</b>: borra filas de ${c(x(/FROM\s+([\w.]+)/i))}. ${/\bWHERE\b/.test(u) ? 'Solo las que cumplen el WHERE. Buena práctica: antes corre un SELECT con el mismo WHERE para ver qué se va a borrar.' : '⚠️ <b>No tiene WHERE: borra TODAS las filas.</b>'}`;
    if (/^DROP/.test(u)) return '<b>DROP</b>: elimina el objeto completo (tabla, vista o índice) con sus datos. No hay papelera.';
    if (/^ALTER/.test(u)) return '<b>ALTER TABLE</b>: cambia la estructura de una tabla (agregar o renombrar columnas).';
    if (/^(BEGIN|COMMIT|ROLLBACK)/.test(u)) return '<b>Transacción</b>: BEGIN abre un bloque de cambios; COMMIT los confirma todos juntos y ROLLBACK los deshace. O se hace todo, o nada.';
    if (/^PRAGMA/.test(u)) return '<b>PRAGMA</b>: un comando propio de SQLite para ver o cambiar su configuración (por ejemplo, <code>PRAGMA table_info(clientes)</code> muestra las columnas).';
    return '';
  }

  function explicarSQL(codigo) {
    const { s, des } = enmascarar(codigo);
    const sts = s.split(';').map((x) => x.trim()).filter(Boolean);
    if (!sts.length) return '<p class="muted small">Escribe una consulta y ejecútala para ver la explicación.</p>';
    let html = sts.length > 1 ? `<p class="small">Tu código tiene <b>${sts.length} sentencias</b> (separadas por <code>;</code>). Se ejecutan en orden; explico la última, que es la que da el resultado:</p><ol class="exp-lista small">${sts.slice(0, -1).map((x) => `<li>${c(corto(des(x), 80))}</li>`).join('')}</ol>` : '';
    const st = sts[sts.length - 1];
    if (!/^\s*(WITH|SELECT|VALUES)\b/i.test(st)) return html + `<p>${explicarOtra(st, des) || 'Una sentencia de SQL.'}</p>`;
    const partes = partir(st, /\b(UNION\s+ALL|UNION|INTERSECT|EXCEPT)\b/);
    if (partes.length > 1 && !/^\s*WITH\b/i.test(st)) {
      const ops = []; { const g = /\b(UNION\s+ALL|UNION|INTERSECT|EXCEPT)\b/gi; let m; const p = aplanar(st); while ((m = g.exec(p))) ops.push(m[1].toUpperCase().replace(/\s+/g, ' ')); }
      return html + `<p>Son ${partes.length} consultas combinadas con ${ops.map(c).join(', ')}:</p><ol class="exp-lista">${partes.map((p) => `<li>${esc(resumenSelect(p.txt, des)) || c(corto(des(p.txt), 70))}</li>`).join('')}</ol><p class="small">${ops.includes('UNION ALL') ? '<b>UNION ALL</b> pone una consulta debajo de la otra y deja los repetidos. ' : ''}${ops.includes('UNION') ? '<b>UNION</b> pone una debajo de la otra y <b>elimina repetidos</b> (es más lento). ' : ''}${ops.includes('INTERSECT') ? '<b>INTERSECT</b> deja solo las filas que están en las dos. ' : ''}${ops.includes('EXCEPT') ? '<b>EXCEPT</b> deja las de la primera que no están en la segunda. ' : ''}Todas las partes tienen que tener la misma cantidad de columnas, en el mismo orden.</p>`;
    }
    const e = explicarSelect(st, des);
    const orden = [['from', 'FROM'], ['where', 'WHERE'], ['group', 'GROUP BY'], ['having', 'HAVING'], ['select', 'SELECT'], ['order', 'ORDER BY'], ['limit', 'LIMIT']];
    html += `<div class="exp-orden" title="El orden en que la base de datos ejecuta una consulta">${orden.map(([k, t]) => `<span class="${e.usado[k] ? 'on' : ''}">${t}</span>`).join('<i>→</i>')}</div>
      <p class="small muted">Se escribe empezando por SELECT, pero la base lo ejecuta en este orden. Por eso un alias del SELECT no existe todavía en el WHERE, y sí en el ORDER BY.</p>
      <ol class="exp-lista">${e.pasos.join('')}</ol>`;
    if (e.extra.length) html += e.extra.map((x) => `<p class="small">${x}</p>`).join('');
    if (e.fns.size) html += `<p class="exp-sub">🔧 Funciones que usaste</p><ul class="exp-lista">${[...e.fns].map((f) => `<li>${c(f.toUpperCase())}: ${FN[f]}</li>`).join('')}</ul>`;
    return html;
  }

  const ERR_SQL = [
    [/no such column: ([\w.]+)/i, (m) => `La base no encuentra la columna ${c(m[1])}. Causas comunes:<ul><li>Un error de tipeo (mira los nombres en el panel de bases).</li><li>La columna existe pero en <b>otra tabla</b> que no está en el FROM o en un JOIN.</li><li>Usaste un alias de tabla que no definiste (por ejemplo ${c('p.precio')} sin ${c('FROM productos p')}).</li><li>Escribiste un texto sin comillas simples: ${c("pais = Chile")} busca una columna llamada Chile; lo correcto es ${c("pais = 'Chile'")}.</li></ul>`],
    [/no such table: ([\w.]+)/i, (m) => `No existe la tabla ${c(m[1])}. Revisa el nombre exacto en el panel de bases: los nombres van en minúsculas y con guion bajo (${c('detalle_pedidos')}). Si es una tabla que creas tú, el CREATE tiene que estar antes, en el mismo código.`],
    [/ambiguous column name: (\w+)/i, (m) => `${c(m[1])} existe en más de una de las tablas que uniste, y la base no sabe cuál quieres. Ponle el nombre o alias de la tabla adelante: ${c('p.' + m[1])} o ${c('pedidos.' + m[1])}.`],
    [/misuse of aggregate/i, () => 'Usaste una agregación (COUNT, SUM, AVG…) en un lugar donde todavía no hay grupos, casi siempre el <b>WHERE</b>. El WHERE corre antes de agrupar. Para filtrar por un total usa <b>HAVING</b> después del GROUP BY.'],
    [/GROUP BY clause is required|HAVING clause on a non-aggregate/i, () => 'HAVING filtra grupos, así que necesita un <b>GROUP BY</b> antes. Si quieres filtrar filas sueltas, usa WHERE.'],
    [/near "(.+?)": syntax error/i, (m) => `La base dejó de entender tu consulta justo en ${c(m[1])}. El error suele estar <b>justo antes</b> de esa palabra:<ul><li>Una <b>coma de más</b> antes del FROM (${c('SELECT a, b, FROM t')}) o una coma de menos entre columnas.</li><li>Las cláusulas en otro orden: el orden obligatorio es SELECT → FROM → JOIN → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT.</li><li>Un paréntesis o una comilla que no se cerró.</li><li>Una función que no existe en SQLite (por ejemplo ${c('DATE_TRUNC')} o ${c('TOP')}).</li></ul>`],
    [/incomplete input/i, () => 'La consulta terminó antes de tiempo: casi siempre falta cerrar un <b>paréntesis</b> o una <b>comilla</b>, o quedó un AND o una coma al final.'],
    [/no such function: (\w+)/i, (m) => `La función ${c(m[1])} no existe en SQLite. Cada motor tiene las suyas: para fechas en SQLite se usa ${c('strftime')}, ${c('date')} y ${c('julianday')}.`],
    [/do not have the same number of result columns/i, () => 'En un UNION, todas las consultas tienen que devolver la <b>misma cantidad de columnas</b>, en el mismo orden.'],
    [/wrong number of arguments to function (\w+)/i, (m) => `Le pasaste a ${c(m[1])} una cantidad de argumentos que no acepta. Revisa la chuleta o el panel de funciones.`],
    [/UNIQUE constraint failed/i, () => 'Intentaste guardar un valor que ya existe en una columna que no admite repetidos (una clave primaria o UNIQUE).'],
    [/NOT NULL constraint failed/i, () => 'Una columna marcada NOT NULL quedó vacía: tienes que darle un valor en el INSERT.'],
    [/misuse of window function|may only be used in/i, () => 'Las funciones de ventana (ROW_NUMBER, LAG…) no se pueden usar en WHERE ni en GROUP BY, porque se calculan después. Calcúlala en una CTE o subconsulta y filtra afuera.'],
  ];
  function explicarErrorSQL(msg) {
    for (const [re, f] of ERR_SQL) { const m = msg.match(re); if (m) return f(m); }
    return 'Lee el mensaje de arriba: casi siempre dice qué palabra o nombre no entendió la base.';
  }

  // ================================================================== Python
  // cada regla: re (sobre la línea sin comentarios), clave (para explicar una sola vez) y texto
  const MODULOS = {
    csv: 'lee y escribe archivos CSV respetando comillas y separadores. <code>csv.DictReader</code> te da cada fila como un diccionario con los nombres de las columnas.',
    io: 'herramientas de entrada y salida. <code>io.StringIO(texto)</code> hace que un texto se comporte como un archivo abierto.',
    json: 'convierte entre texto JSON y estructuras de Python: <code>json.loads(texto)</code> → diccionarios y listas; <code>json.dumps(obj)</code> → texto.',
    datetime: 'fechas y horas: <code>datetime</code>, <code>date</code> y <code>timedelta</code> (una duración, para sumar o restar días).',
    re: 'expresiones regulares: buscar patrones en texto (<code>re.search</code>, <code>re.findall</code>, <code>re.sub</code>).',
    math: 'funciones matemáticas (<code>math.sqrt</code>, <code>math.ceil</code>, <code>math.floor</code>).',
    statistics: 'estadística simple: <code>mean</code>, <code>median</code>, <code>stdev</code>.',
    collections: 'estructuras extra: <code>Counter</code> cuenta repeticiones y <code>defaultdict</code> crea valores por defecto.',
    itertools: 'herramientas para recorrer: <code>groupby</code>, <code>chain</code>, <code>combinations</code>.',
    functools: 'herramientas para funciones: <code>reduce</code>, <code>lru_cache</code> (memoria de resultados).',
    pathlib: 'rutas de archivos como objetos: <code>Path("datos") / "ventas.csv"</code>.',
    os: 'el sistema operativo: variables de entorno (<code>os.environ</code>), carpetas y archivos.',
    sys: 'el intérprete de Python: argumentos (<code>sys.argv</code>), salida estándar.',
    time: 'el tiempo: <code>time.sleep(segundos)</code> espera, <code>time.time()</code> da la hora actual en segundos.',
    random: 'números al azar: <code>random.random()</code>, <code>random.choice(lista)</code>.',
    typing: 'tipos para documentar el código: <code>list[str]</code>, <code>Optional</code>, <code>dict[str, int]</code>. Python no los obliga, pero ayudan a leer.',
    dataclasses: '<code>@dataclass</code> crea clases que solo guardan datos, sin escribir el <code>__init__</code>.',
    pandas: 'la librería de tablas (DataFrames) más usada en Python. Por convención se importa como <code>pd</code>.',
    numpy: 'cálculo numérico con arreglos. Por convención se importa como <code>np</code>.',
    duckdb: 'una base de datos analítica que corre dentro de Python: consultas SQL sobre CSV, Parquet o DataFrames.',
    sqlite3: 'una base SQLite desde Python: <code>connect</code>, <code>execute</code>, <code>fetchall</code>.',
    requests: 'llamar APIs por HTTP: <code>requests.get(url).json()</code>.',
    hashlib: 'huellas (hashes) de textos: <code>hashlib.sha256(...).hexdigest()</code>. Sirve para anonimizar o detectar cambios.',
    pyspark: 'la API de Python de Apache Spark: procesar datos grandes repartidos en muchas máquinas.',
    airflow: 'Apache Airflow: definir flujos de tareas (DAGs) que corren solos según un horario.',
  };
  const R = (re, clave, texto) => ({ re, clave, texto });
  let EST = {};   // qué explicaciones generales ya se dieron en este análisis
  const PY_REGLAS = [
    R(/^\s*import\s+([\w.]+)(?:\s+as\s+(\w+))?/, (m) => 'imp:' + m[1], (m) => { const base = m[1].split('.')[0]; const gen = !EST.imp; EST.imp = true; return `${gen ? '<b>import</b> carga un <b>módulo</b>: código que alguien ya escribió y que usas para no reinventarlo. ' : ''}Acá: ${c(m[1])}${m[2] ? `, con el apodo ${c(m[2])}` : ''}: ${MODULOS[base] || 'un módulo con funciones listas para usar.'}`; }),
    R(/^\s*from\s+([\w.]+)\s+import\s+(.+)/, (m) => 'imp:' + m[1], (m) => { const base = m[1].split('.')[0]; const gen = !EST.from; EST.from = true; const vb = EST['m:' + base]; EST['m:' + base] = true; return `${gen ? '<b>from … import</b> trae de un módulo solo lo que vas a usar, para escribirlo sin el nombre del módulo adelante. ' : ''}De ${c(m[1])} traes ${c(m[2].trim())}.${vb ? '' : ' ' + (MODULOS[base] || '')}`; }),
    R(/^\s*def\s+(\w+)\s*\(([^)]*)\)/, () => 'def', (m) => `<b>def</b> define una <b>función</b> llamada ${c(m[1])}: un bloque de código con nombre que se puede usar muchas veces. ${m[2].trim() ? `Recibe ${c(m[2].trim())} (los <b>parámetros</b>: los datos que le pasas al llamarla)${/=/.test(m[2]) ? '; los que tienen <code>=</code> tienen un valor por defecto y se pueden omitir' : ''}.` : 'No recibe parámetros.'} El código de adentro va con sangría (4 espacios) y no corre hasta que alguien la llama: ${c(m[1] + '(…)')}.`),
    R(/^\s*return\b(.*)/, () => 'return', () => '<b>return</b> termina la función y <b>devuelve</b> un valor a quien la llamó. Sin return, una función devuelve <code>None</code>. No es lo mismo que print: print solo muestra en pantalla.'),
    R(/^\s*class\s+(\w+)/, () => 'class', (m) => `<b>class</b> define un tipo de objeto nuevo, ${c(m[1])}: agrupa datos (atributos) y funciones (métodos) que van juntos.`),
    R(/^\s*@(\w[\w.]*)/, (m) => 'deco:' + m[1], (m) => `<b>@${esc(m[1])}</b> es un <b>decorador</b>: envuelve la función de abajo y le agrega comportamiento sin cambiar su código.`),
    R(/^\s*if\b.*:\s*$/, () => 'if', () => '<b>if</b> ejecuta el bloque de abajo (el que tiene sangría) solo si la condición es verdadera. Se pueden encadenar con <code>elif</code> (si no, si…) y terminar con <code>else</code> (en cualquier otro caso).'),
    R(/^\s*elif\b/, () => 'elif', () => '<b>elif</b>: "si no se cumplió lo anterior, prueba esta condición". Se revisan en orden y solo corre el primer bloque que se cumple.'),
    R(/^\s*else\s*:/, () => 'else', () => '<b>else</b>: el bloque que corre cuando ninguna condición anterior se cumplió.'),
    R(/^\s*for\s+(.+?)\s+in\s+enumerate\(/, () => 'enumerate', () => '<b>enumerate</b> recorre una lista entregando también la <b>posición</b>: <code>for i, x in enumerate(lista)</code> da (0, primero), (1, segundo)…'),
    R(/^\s*for\s+(\w+)\s*,\s*(\w+)\s+in\s+.*\.items\(\)/, () => 'for-items', () => '<code>for clave, valor in d.items()</code> recorre un diccionario de a pares: en cada vuelta tienes la clave y su valor.'),
    R(/^\s*for\s+(.+?)\s+in\s+range\((.*)\)/, () => 'range', (m) => `<code>range(${esc(m[2])})</code> genera números: <code>range(5)</code> = 0, 1, 2, 3, 4 (el último no se incluye); <code>range(1, 6)</code> = 1 a 5.`),
    R(/^\s*for\s+(.+?)\s+in\s+(.+):\s*$/, () => 'for', (m) => `<b>for</b> es un <b>bucle</b>: repite el bloque de abajo una vez por cada elemento de ${c(m[2].trim())}, y en cada vuelta guarda el elemento en ${c(m[1].trim())}. Cuando no quedan elementos, sigue con lo que está después del bloque.`),
    R(/^\s*while\b(.*):/, () => 'while', () => '<b>while</b> repite el bloque <b>mientras</b> la condición sea verdadera. Algo dentro del bloque tiene que cambiarla, o el bucle no termina nunca (el sitio corta a los 45 segundos).'),
    R(/^\s*break\b/, () => 'break', () => '<b>break</b> sale del bucle de inmediato.'),
    R(/^\s*continue\b/, () => 'continue', () => '<b>continue</b> saltea lo que queda de esta vuelta y pasa al siguiente elemento. Útil para descartar filas inválidas.'),
    R(/^\s*try\s*:/, () => 'try', () => '<b>try</b> intenta ejecutar el bloque; si ocurre un error, en vez de frenar todo el programa, salta al <code>except</code>. Es cómo un pipeline sobrevive a datos sucios.'),
    R(/^\s*except\b\s*(\w*)/, () => 'except', (m) => `<b>except${m[1] ? ' ' + esc(m[1]) : ''}</b> atrapa ${m[1] ? `los errores de tipo ${c(m[1])}` : '<b>cualquier</b> error (mejor nombrar el tipo, para no esconder errores que no esperabas)'} y ejecuta este bloque en su lugar.`),
    R(/^\s*finally\s*:/, () => 'finally', () => '<b>finally</b>: este bloque corre siempre, haya o no error (para cerrar conexiones o archivos).'),
    R(/^\s*raise\b/, () => 'raise', () => '<b>raise</b> provoca un error a propósito, con un mensaje. Se usa para frenar cuando los datos no cumplen lo esperado.'),
    R(/^\s*with\s+open\((.*)\)/, () => 'with-open', () => '<b>with open(…)</b> abre un archivo y lo <b>cierra solo</b> al terminar el bloque, aunque haya un error. El modo <code>"r"</code> lee, <code>"w"</code> escribe (borra lo anterior) y <code>"a"</code> agrega al final.'),
    R(/^\s*with\b/, () => 'with', () => '<b>with</b> abre un recurso (archivo, conexión, DAG) y se encarga de cerrarlo o terminarlo al salir del bloque.'),
    R(/^\s*assert\b/, () => 'assert', () => '<b>assert</b> verifica que algo sea verdadero; si no, frena con un error. Es la forma más simple de un test.'),
    R(/^\s*lambda\b|\blambda\s+[\w, ]*:/, () => 'lambda', () => '<b>lambda</b> es una función chiquita sin nombre, de una sola expresión: <code>lambda x: x["precio"]</code> recibe x y devuelve su precio. Se usa mucho en <code>sorted(…, key=…)</code>.'),
    R(/\[[^\]]*\bfor\b[^\]]*\bin\b[^\]]*\]/, () => 'comp-list', () => 'una <b>comprensión de lista</b>: <code>[expresión for x in algo if condición]</code> arma una lista nueva en una línea. Se lee: "dame la expresión, para cada x de algo, si se cumple la condición".'),
    R(/\{[^}]*:[^}]*\bfor\b[^}]*\bin\b[^}]*\}/, () => 'comp-dict', () => 'una <b>comprensión de diccionario</b>: <code>{clave: valor for x in algo}</code> arma un diccionario en una línea.'),
    R(/\{[^}:]*\bfor\b[^}]*\bin\b[^}]*\}/, () => 'comp-set', () => 'una <b>comprensión de conjunto</b> (<code>{… for …}</code> sin dos puntos): como la de lista, pero el resultado es un <code>set</code> y elimina repetidos.'),
    R(/\bf"|\bf'/, () => 'fstring', () => 'un <b>f-string</b> (<code>f"…"</code>): lo que va entre llaves se reemplaza por su valor. <code>{x:.2f}</code> lo muestra con 2 decimales y <code>{x:,}</code> con separador de miles.'),
    R(/^\s*(\w+)\s*(\+|-|\*|\/)=/, () => 'aug', (m) => `<code>${esc(m[1])} ${esc(m[2])}= …</code> es un atajo de <code>${esc(m[1])} = ${esc(m[1])} ${esc(m[2])} …</code>: actualiza la variable con su propio valor. Muy usado para acumular.`),
    R(/^\s*(\w+)\s*=\s*\{\s*\}/, () => 'dict-vacio', (m) => `${c(m[1] + ' = {}')} crea un <b>diccionario vacío</b> para ir llenándolo. Un diccionario guarda pares <b>clave → valor</b> y busca por clave al instante.`),
    R(/^\s*(\w+)\s*=\s*\[\s*\]/, () => 'lista-vacia', (m) => `${c(m[1] + ' = []')} crea una <b>lista vacía</b> para ir agregándole elementos con <code>.append()</code>.`),
    R(/^\s*(\w+)\s*=\s*\{.*:.*\}/, () => 'dict', () => 'un <b>diccionario</b> literal: pares <code>clave: valor</code> entre llaves. Se lee con <code>d["clave"]</code> (error si no existe) o <code>d.get("clave")</code> (None si no existe).'),
    R(/^\s*(\w+)\s*=\s*\[.+\]/, () => 'lista', () => 'una <b>lista</b>: varios valores en orden, entre corchetes. Se accede por posición empezando en 0: <code>lista[0]</code> es el primero y <code>lista[-1]</code> el último.'),
    R(/^\s*(\w+)\s*,\s*(\w+)\s*=/, () => 'desempaquetar', () => '<b>Desempaquetar</b>: <code>a, b = algo</code> reparte los valores de una tupla o lista en varias variables a la vez.'),
    R(/^\s*resultado\s*=/, () => 'resultado', () => 'guardas tu respuesta en ' + c('resultado') + ': es la variable que la misión compara con la respuesta esperada.'),
    R(/^\s*([a-z_]\w*)\s*=(?!=)/i, () => 'asig', (m) => `<code>${esc(m[1])} = …</code> es una <b>asignación</b>: calcula lo que está a la derecha y lo guarda con el nombre ${c(m[1])} (una <b>variable</b>: una etiqueta que apunta a un valor). Un solo <code>=</code> guarda; <code>==</code> compara.`),
    R(/\bprint\(/, () => 'print', () => '<b>print()</b> muestra un valor en la consola de abajo. Sirve para mirar qué está pasando; no devuelve nada.'),
    R(/\blen\(/, () => 'len', () => '<b>len()</b> dice cuántos elementos tiene una lista, diccionario o texto.'),
    R(/\bsorted\(/, () => 'sorted', () => '<b>sorted()</b> devuelve una lista <b>nueva</b> ordenada (la original no cambia). <code>key=</code> dice por qué ordenar y <code>reverse=True</code> invierte el orden.'),
    R(/\.sort\(/, () => 'sort', () => '<code>.sort()</code> ordena la lista <b>en el lugar</b> (cambia la original y devuelve None; no hagas <code>x = lista.sort()</code>).'),
    R(/\bsum\(/, () => 'sum', () => '<b>sum()</b> suma todos los números de una lista o de una comprensión.'),
    R(/\b(min|max)\(/, () => 'minmax', () => '<b>min()</b> y <b>max()</b> dan el menor y el mayor. Con <code>key=</code> eligen según un criterio: <code>max(d, key=d.get)</code> es la clave con el valor más grande.'),
    R(/\bround\(/, () => 'round', () => '<b>round(x, 2)</b> redondea a 2 decimales. Los números decimales se guardan aproximados (0.1 + 0.2 = 0.30000000000000004): por eso se redondea al final.'),
    R(/\b(int|float|str)\(/, () => 'conv', () => '<b>int()</b>, <b>float()</b> y <b>str()</b> convierten entre tipos: el texto <code>"120"</code> no es el número 120 hasta que lo conviertes. Si el texto no es un número, <code>float()</code> da ValueError.'),
    R(/\bisinstance\(/, () => 'isinstance', () => '<b>isinstance(x, tipo)</b> pregunta si x es de ese tipo: <code>isinstance(m, (int, float))</code> = "¿es un número?".'),
    R(/\bzip\(/, () => 'zip', () => '<b>zip()</b> recorre dos listas a la vez, de a pares: (primero de A, primero de B), (segundo de A, segundo de B)…'),
    R(/\b(any|all)\(/, () => 'anyall', () => '<b>any()</b> es verdadero si <b>alguno</b> cumple; <b>all()</b> si <b>todos</b> cumplen.'),
    R(/\bset\(/, () => 'set', () => '<b>set()</b> crea un conjunto: una colección <b>sin repetidos</b> y sin orden. La forma más rápida de deduplicar y de preguntar "¿está x?".'),
    R(/\.strip\(\)/, () => 'strip', () => '<code>.strip()</code> saca espacios (y saltos de línea) del principio y del final de un texto.'),
    R(/\.(lower|upper|title)\(\)/, () => 'case', () => '<code>.lower()</code>, <code>.upper()</code> y <code>.title()</code> pasan el texto a minúsculas, mayúsculas o Tipo Título. Normalizar antes de comparar evita que "Web" y "web" cuenten distinto.'),
    R(/\.split\(/, () => 'split', () => '<code>.split(sep)</code> corta un texto en una lista de pedazos: <code>"a,b".split(",")</code> = <code>["a", "b"]</code>.'),
    R(/\.join\(/, () => 'join', () => '<code>"sep".join(lista)</code> une una lista de textos en uno, con el separador entre medio.'),
    R(/\.replace\(/, () => 'replace', () => '<code>.replace(a, b)</code> cambia todas las apariciones de a por b en un texto.'),
    R(/\.(startswith|endswith)\(/, () => 'startswith', () => '<code>.startswith()</code> y <code>.endswith()</code> preguntan cómo empieza o termina un texto.'),
    R(/\.append\(/, () => 'append', () => '<code>.append(x)</code> agrega x al final de la lista.'),
    R(/\.get\(/, () => 'get', () => '<code>d.get(clave, defecto)</code> lee un diccionario sin error: si la clave no existe, devuelve el defecto (o None). <code>d.get(k, 0) + 1</code> es la forma clásica de contar.'),
    R(/\.items\(\)/, () => 'items', () => '<code>.items()</code> da los pares (clave, valor) de un diccionario.'),
    R(/\.(keys|values)\(\)/, () => 'keys', () => '<code>.keys()</code> da las claves y <code>.values()</code> los valores de un diccionario.'),
    R(/\.setdefault\(/, () => 'setdefault', () => '<code>.setdefault(k, [])</code> devuelve el valor de k y, si no existía, lo crea con el valor por defecto.'),
    R(/\bCounter\(/, () => 'Counter', () => '<b>Counter</b> cuenta cuántas veces aparece cada elemento. <code>.most_common(3)</code> da los 3 más frecuentes.'),
    R(/\bdefaultdict\(/, () => 'defaultdict', () => '<b>defaultdict(list)</b> es un diccionario que crea solo el valor por defecto la primera vez que usas una clave: no hace falta preguntar si existe.'),
    R(/\bcsv\.DictReader\(/, () => 'dictreader', () => '<code>csv.DictReader</code> lee el CSV fila por fila; cada fila es un diccionario <code>{columna: valor}</code>. Ojo: <b>todos los valores llegan como texto</b>.'),
    R(/\bjson\.loads?\(/, () => 'jsonload', () => '<code>json.loads(texto)</code> convierte JSON en diccionarios y listas de Python.'),
    R(/\bjson\.dumps?\(/, () => 'jsondump', () => '<code>json.dumps(obj)</code> convierte a texto JSON (para guardar o enviar).'),
    R(/\b(datetime\.)?strptime\(/, () => 'strptime', () => '<code>strptime(texto, formato)</code> convierte texto en fecha: <code>"%Y-%m-%d"</code> = año-mes-día.'),
    R(/\bfromisoformat\(/, () => 'fromiso', () => '<code>fromisoformat("2024-03-15")</code> convierte una fecha ISO en un objeto fecha.'),
    R(/\btimedelta\(/, () => 'timedelta', () => '<b>timedelta</b> es una duración: <code>fecha + timedelta(days=30)</code>. Restar dos fechas da un timedelta; <code>.days</code> da los días.'),
    R(/\bre\.(search|match|findall|sub|fullmatch)\(/, () => 're', () => 'una <b>expresión regular</b>: un patrón para buscar en texto. <code>\\d</code> = dígito, <code>+</code> = uno o más, <code>.*</code> = cualquier cosa.'),
    R(/\bNone\b/, () => 'None', () => '<b>None</b> significa "no hay valor" (como NULL en SQL). Se pregunta con <code>x is None</code>.'),
    R(/^(?!.*\bfor\b).*(\bnot in\b|\bin\b(?=\s+[\w"'(\[{]))/, () => 'in', () => '<code>in</code> pregunta si algo está adentro: <code>"@" in email</code>, <code>canal in ("web", "app")</code>.'),
    R(/[^=!<>]==[^=]|!=/, () => 'cmp', () => '<code>==</code> compara si son iguales y <code>!=</code> si son distintos. Devuelven True o False.'),
    R(/\b(and|or|not)\b/, () => 'bool', () => '<code>and</code> (las dos), <code>or</code> (alguna) y <code>not</code> (lo contrario) combinan condiciones.'),
    R(/\/\/|%(?!\()|\*\*/, () => 'ops', () => '<code>//</code> es la división entera (7 // 2 = 3), <code>%</code> el resto (7 % 2 = 1) y <code>**</code> la potencia (2 ** 3 = 8).'),
    R(/\[\s*-?\d*\s*:\s*-?\d*\s*\]/, () => 'slice', () => 'un <b>slice</b> <code>[a:b]</code> recorta desde la posición a hasta b (sin incluir b): <code>lista[:3]</code> son los 3 primeros.'),
    R(/\byield\b/, () => 'yield', () => '<b>yield</b> convierte la función en un <b>generador</b>: entrega los valores de a uno, sin armar toda la lista en memoria.'),
  ];
  const PANDAS = [
    R(/pd\.read_csv\(/, () => 'pd-read', () => '<code>pd.read_csv</code> lee un CSV y lo convierte en un <b>DataFrame</b> (una tabla con columnas e índice). Intenta adivinar los tipos de cada columna.'),
    R(/pd\.DataFrame\(/, () => 'pd-df', () => '<code>pd.DataFrame(…)</code> crea una tabla a partir de una lista de diccionarios o un diccionario de listas.'),
    R(/\.groupby\(/, () => 'pd-groupby', () => '<code>.groupby(col)</code> agrupa las filas por los valores de esa columna, como GROUP BY en SQL. Siempre va seguido de una agregación (<code>.sum()</code>, <code>.agg(…)</code>).'),
    R(/\.agg\(/, () => 'pd-agg', () => '<code>.agg(nombre=("col", "sum"))</code> calcula varias agregaciones a la vez y les pone nombre.'),
    R(/\.merge\(/, () => 'pd-merge', () => '<code>.merge(otra, on="col", how="left")</code> une dos tablas como un JOIN de SQL. <code>how</code> puede ser inner, left, right u outer.'),
    R(/\.sort_values\(/, () => 'pd-sort', () => '<code>.sort_values("col", ascending=False)</code> ordena las filas.'),
    R(/\.drop_duplicates\(/, () => 'pd-dd', () => '<code>.drop_duplicates()</code> elimina filas repetidas; con <code>subset=[…]</code> mira solo esas columnas.'),
    R(/\.(fillna|dropna)\(/, () => 'pd-na', () => '<code>.fillna(valor)</code> rellena vacíos y <code>.dropna()</code> descarta filas con vacíos. En pandas los vacíos se ven como <code>NaN</code>.'),
    R(/pd\.to_datetime\(/, () => 'pd-dt', () => '<code>pd.to_datetime</code> convierte texto en fechas; después puedes usar <code>.dt.year</code>, <code>.dt.month</code>, <code>.dt.to_period("M")</code>.'),
    R(/\.str\./, () => 'pd-str', () => '<code>.str.</code> aplica funciones de texto a toda la columna: <code>df["canal"].str.strip().str.lower()</code>.'),
    R(/\.loc\[|\.iloc\[/, () => 'pd-loc', () => '<code>.loc[filas, columnas]</code> selecciona por etiqueta o condición; <code>.iloc</code> por posición.'),
    R(/df\[\s*df\[|\]\s*\[\s*\w+\[/, () => 'pd-mask', () => '<code>df[df["col"] &gt; 10]</code> es un <b>filtro</b>: la condición da True/False por fila y se quedan las True. Para combinar condiciones usa <code>&amp;</code> y <code>|</code> con paréntesis.'),
    R(/\.pivot_table\(/, () => 'pd-pivot', () => '<code>.pivot_table</code> arma una tabla dinámica: filas, columnas y un valor agregado.'),
    R(/\.value_counts\(/, () => 'pd-vc', () => '<code>.value_counts()</code> cuenta cuántas veces aparece cada valor, de mayor a menor.'),
    R(/\.reset_index\(/, () => 'pd-ri', () => '<code>.reset_index()</code> convierte el índice (por ejemplo, el de un groupby) de nuevo en una columna normal.'),
    R(/\.apply\(/, () => 'pd-apply', () => '<code>.apply(función)</code> aplica una función fila por fila o valor por valor. Es cómodo pero lento: si existe una operación vectorizada, mejor.'),
    R(/\.head\(|\.tail\(/, () => 'pd-head', () => '<code>.head(n)</code> muestra las primeras n filas (5 por defecto); <code>.tail</code> las últimas.'),
    R(/\.astype\(/, () => 'pd-astype', () => '<code>.astype(tipo)</code> convierte el tipo de una columna.'),
    R(/\.rename\(/, () => 'pd-rename', () => '<code>.rename(columns={"viejo": "nuevo"})</code> cambia nombres de columnas.'),
    R(/\.query\(/, () => 'pd-query', () => '<code>.query("col &gt; 10")</code> filtra escribiendo la condición como texto.'),
  ];

  // ---------------------------------------------------------------- PySpark
  const T = 'transformación', A = 'acción';
  const SPARK = [
    R(/\bspark\.table\(\s*["'](\w+)["']/, (m) => 'sp-table:' + m[1], (m) => `<code>spark.table("${esc(m[1])}")</code> devuelve la tabla ${c(m[1])} del catálogo como un <b>DataFrame</b>: una tabla repartida en particiones que Spark procesa en paralelo. Todavía no lee nada: solo anota de dónde salen los datos.`),
    R(/\bspark\.read\b/, () => 'sp-read', () => '<code>spark.read</code> lee archivos: <code>.option("header", True).csv(ruta)</code>, <code>.parquet(ruta)</code>, <code>.json(ruta)</code>. En Databricks, también <code>.table("catalogo.esquema.tabla")</code>.'),
    R(/\bspark\.sql\(/, () => 'sp-sql', () => '<code>spark.sql("SELECT …")</code> ejecuta SQL y devuelve un DataFrame: puedes mezclar SQL y PySpark en el mismo trabajo.'),
    R(/\bspark\.createDataFrame\(/, () => 'sp-create', () => '<code>spark.createDataFrame(datos, columnas)</code> crea un DataFrame desde listas de Python (útil para pruebas).'),
    R(/\bfunctions\s+as\s+F\b/, () => 'sp-F', () => '<code>from pyspark.sql import functions as F</code> trae todas las funciones de columnas con el apodo <code>F</code> (convención universal): <code>F.col</code>, <code>F.sum</code>, <code>F.when</code>…'),
    R(/\bWindow\b/, () => 'sp-window', () => '<b>Window</b> define una ventana: <code>Window.partitionBy("cliente_id").orderBy(F.desc("fecha"))</code> = "para cada cliente, ordenando por fecha". Después se usa con <code>F.row_number().over(w)</code>, como OVER en SQL.'),
    R(/\.select\(/, () => 'sp-select', () => `<code>.select(…)</code> (${T}) elige o calcula columnas, como el SELECT de SQL.`),
    R(/\.selectExpr\(/, () => 'sp-selexpr', () => `<code>.selectExpr("expr as nombre")</code> (${T}) como select, pero cada columna se escribe como SQL.`),
    R(/\.(filter|where)\(/, () => 'sp-filter', () => `<code>.filter(condición)</code> o <code>.where</code> (${T}) se queda con las filas que cumplen. Las condiciones se combinan con <code>&amp;</code> (y), <code>|</code> (o), <code>~</code> (no), <b>cada una entre paréntesis</b>: <code>(F.col("a") &gt; 1) &amp; (F.col("b") == "x")</code>. <code>and</code>/<code>or</code> de Python no funcionan con columnas.`),
    R(/\.withColumn\(\s*["'](\w+)["']/, () => 'sp-withcol', (m) => `<code>.withColumn("${esc(m[1])}", expresión)</code> (${T}) agrega una columna nueva (o reemplaza una con ese nombre). Los DataFrames no se modifican: cada transformación devuelve uno <b>nuevo</b>, por eso se reasigna o se encadena.`),
    R(/\.withColumnRenamed\(/, () => 'sp-rename', () => `<code>.withColumnRenamed("viejo", "nuevo")</code> (${T}) cambia el nombre de una columna. Útil antes de un join, para que no queden dos columnas con el mismo nombre.`),
    R(/\.drop\(/, () => 'sp-drop', () => `<code>.drop("col")</code> (${T}) saca columnas.`),
    R(/\.groupBy\(/, () => 'sp-groupby', () => `<code>.groupBy(cols)</code> (${T}) agrupa, como GROUP BY. Siempre se sigue con <code>.agg(…)</code> o <code>.count()</code>. En un cluster, agrupar obliga a mover filas entre máquinas (un <b>shuffle</b>): es de lo más caro.`),
    R(/\.agg\(/, () => 'sp-agg', () => `<code>.agg(F.sum("x").alias("total"), …)</code> (${T}) calcula una o varias agregaciones por grupo. <code>.alias()</code> le da nombre a la columna resultante.`),
    R(/\.join\(/, () => 'sp-join', (m, l) => { const how = (l.match(/how\s*=\s*["'](\w+)["']|,\s*["'](inner|left|right|outer|full|left_anti|left_semi|anti|semi|cross)["']\s*\)/) || []); const h = how[1] || how[2] || 'inner'; const exp = { inner: 'solo las filas con pareja en los dos lados', left: 'todas las de la izquierda, con null donde no hay pareja', right: 'todas las de la derecha', outer: 'todas las de los dos lados', full: 'todas las de los dos lados', left_anti: 'las de la izquierda que <b>no</b> tienen pareja (el "anti join")', anti: 'las de la izquierda que no tienen pareja', left_semi: 'las de la izquierda que <b>sí</b> tienen pareja, sin traer columnas de la otra', semi: 'las de la izquierda que tienen pareja', cross: 'todas las combinaciones' }[h] || ''; return `<code>.join(otro, on, how)</code> (${T}) une dos DataFrames como un JOIN. Acá el tipo es ${c(h)}: ${exp}. Si pasas <code>on="col"</code> (texto), la columna queda una sola vez; si pasas una condición, quedan las dos.`; }),
    R(/\.(orderBy|sort)\(/, () => 'sp-order', () => `<code>.orderBy(…)</code> (${T}) ordena. <code>F.desc("x")</code> o <code>F.col("x").desc()</code> es de mayor a menor.`),
    R(/\.limit\(/, () => 'sp-limit', () => `<code>.limit(n)</code> (${T}) se queda con las primeras n filas.`),
    R(/\.distinct\(\)/, () => 'sp-distinct', () => `<code>.distinct()</code> (${T}) elimina filas repetidas.`),
    R(/\.dropDuplicates\(/, () => 'sp-dd', () => `<code>.dropDuplicates(["col"])</code> (${T}) deja una fila por cada valor de esas columnas.`),
    R(/\.(union|unionByName)\(/, () => 'sp-union', () => `<code>.unionByName(otro)</code> (${T}) pone un DataFrame debajo del otro, emparejando columnas por nombre (<code>.union</code> empareja por posición).`),
    R(/\.(fillna|na\.fill|dropna|na\.drop)\(/, () => 'sp-na', () => `<code>.fillna(valor)</code> rellena nulos y <code>.dropna()</code> descarta filas con nulos (${T}).`),
    R(/\.cache\(\)|\.persist\(/, () => 'sp-cache', () => '<code>.cache()</code> guarda el DataFrame en memoria la primera vez que se calcula, para no recalcularlo si lo usas varias veces.'),
    R(/\.createOrReplaceTempView\(/, () => 'sp-view', () => '<code>.createOrReplaceTempView("nombre")</code> registra el DataFrame como una vista temporal para consultarla con <code>spark.sql</code>.'),
    R(/\.show\(/, () => 'sp-show', () => `<code>.show(n)</code> (<b>${A}</b>) calcula y muestra las primeras filas. Recién acá Spark ejecuta todo lo anterior.`),
    R(/\.count\(\)/, () => 'sp-count', () => `<code>.count()</code> después de un DataFrame (<b>${A}</b>) cuenta las filas y devuelve un número. Después de <code>groupBy</code> es una transformación: cuenta por grupo.`),
    R(/\.(collect|take|first|head|toPandas)\(/, () => 'sp-collect', () => `<code>.collect()</code>, <code>.take(n)</code>, <code>.first()</code> y <code>.toPandas()</code> (<b>${A}</b>) traen los datos a tu programa. Con tablas grandes, <code>collect</code> puede quedarse sin memoria: trae solo lo necesario.`),
    R(/\.printSchema\(\)/, () => 'sp-schema', () => '<code>.printSchema()</code> muestra las columnas y sus tipos. Siempre conviene mirarlo después de leer un archivo.'),
    R(/\.write\b/, () => 'sp-write', () => `<code>.write</code> (<b>${A}</b>) guarda el resultado: <code>.mode("overwrite")</code> reemplaza, <code>.mode("append")</code> agrega, <code>.partitionBy("anio")</code> separa en carpetas, <code>.saveAsTable("t")</code> lo deja en el catálogo.`),
    R(/F\.col\(/, () => 'F-col', () => '<code>F.col("x")</code> se refiere a la columna x. Hace falta para comparar u operar: <code>F.col("precio") * 1.21</code>.'),
    R(/F\.lit\(/, () => 'F-lit', () => '<code>F.lit(valor)</code> crea una columna con un valor fijo, igual en todas las filas.'),
    R(/F\.when\(/, () => 'F-when', () => '<code>F.when(cond, valor).when(…).otherwise(valor)</code> es el CASE WHEN de Spark: se revisan en orden y gana la primera condición que se cumple.'),
    R(/F\.(sum|avg|mean|count|countDistinct|min|max)\(/, () => 'F-agg', () => '<code>F.sum</code>, <code>F.avg</code>, <code>F.count</code>, <code>F.countDistinct</code>, <code>F.min</code>, <code>F.max</code>: agregaciones para usar dentro de <code>.agg()</code> (o en una ventana con <code>.over(w)</code>).'),
    R(/F\.round\(/, () => 'F-round', () => '<code>F.round(col, 2)</code> redondea a 2 decimales.'),
    R(/F\.(desc|asc)\(|\.desc\(\)|\.asc\(\)/, () => 'F-desc', () => '<code>F.desc("x")</code> / <code>F.asc("x")</code> indican el sentido del orden.'),
    R(/F\.(row_number|rank|dense_rank|lag|lead)\(/, () => 'F-win', () => '<code>F.row_number()</code>, <code>F.rank()</code>, <code>F.lag()</code>… son funciones de ventana: siempre van con <code>.over(ventana)</code>.'),
    R(/\.over\(/, () => 'over', () => '<code>.over(w)</code> aplica la función sobre la ventana <code>w</code>: cada fila recibe un valor calculado con las filas de su grupo, sin perder filas.'),
    R(/F\.(year|month|dayofmonth|dayofweek|date_format|to_date|datediff|date_add|months_between|current_date|date_trunc)\(/, () => 'F-fecha', () => 'funciones de fecha: <code>F.year</code>, <code>F.month</code>, <code>F.date_format(col, "yyyy-MM")</code> (en Spark el mes es <code>MM</code> y los minutos <code>mm</code>), <code>F.to_date</code>, <code>F.datediff(fin, inicio)</code>.'),
    R(/F\.(lower|upper|trim|concat|concat_ws|regexp_replace|split|substring|length|initcap)\(/, () => 'F-texto', () => 'funciones de texto: <code>F.lower</code>, <code>F.trim</code>, <code>F.concat_ws(" ", a, b)</code>, <code>F.regexp_replace</code>, <code>F.split</code>.'),
    R(/F\.coalesce\(/, () => 'F-coalesce', () => '<code>F.coalesce(a, b)</code> devuelve el primero que no sea nulo.'),
    R(/F\.explode\(/, () => 'F-explode', () => '<code>F.explode(lista)</code> convierte cada elemento de una lista en una fila propia.'),
    R(/\.cast\(/, () => 'cast', () => '<code>.cast("double")</code>, <code>.cast("int")</code>, <code>.cast("date")</code> cambian el tipo de la columna.'),
    R(/\.(isNull|isNotNull)\(\)/, () => 'isnull', () => '<code>.isNull()</code> / <code>.isNotNull()</code> preguntan si la columna está vacía. Como en SQL, <code>== None</code> no sirve.'),
    R(/\.isin\(/, () => 'isin', () => '<code>.isin("a", "b")</code> es el IN de SQL; con <code>~</code> adelante, NOT IN.'),
    R(/\.alias\(/, () => 'alias', () => '<code>.alias("nombre")</code> le pone nombre a una columna calculada (como AS en SQL).'),
  ];

  // ---------------------------------------------------------------- Airflow
  function cron(expr) {
    const p = String(expr).trim();
    const pre = { '@daily': 'todos los días a medianoche', '@hourly': 'cada hora, en punto', '@weekly': 'cada domingo a medianoche', '@monthly': 'el primer día de cada mes a medianoche', '@yearly': 'el 1 de enero', '@once': 'una sola vez', '@continuous': 'apenas termina la anterior' };
    if (pre[p]) return pre[p];
    const f = p.split(/\s+/); if (f.length !== 5) return '';
    const [mi, ho, dm, me, ds] = f;
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const hora = /^\d+$/.test(ho) && /^\d+$/.test(mi) ? `a las ${ho.padStart(2, '0')}:${mi.padStart(2, '0')}` : /^\*\/(\d+)$/.test(ho) ? `cada ${ho.slice(2)} horas` : ho === '*' && /^\d+$/.test(mi) ? `cada hora, en el minuto ${mi}` : /^\*\/(\d+)$/.test(mi) ? `cada ${mi.slice(2)} minutos` : `minuto ${mi}, hora ${ho}`;
    let cuando = 'todos los días';
    if (ds !== '*') cuando = /^1-5$/.test(ds) ? 'de lunes a viernes' : ds.split(',').map((d) => dias[+d % 7] || d).join(', ');
    if (dm !== '*') cuando = `el día ${dm} de cada mes`;
    if (me !== '*') cuando += ` (mes ${me})`;
    return `${cuando} ${hora}`;
  }
  const AIRFLOW = [
    R(/\bDAG\(\s*(?:dag_id\s*=\s*)?["']([\w.-]+)["']/, () => 'af-dag', (m) => `<code>DAG("${esc(m[1])}", …)</code> define un <b>DAG</b> (grafo acíclico dirigido): el flujo de trabajo completo, con un nombre único (${c(m[1])}), un horario y las tareas que lo forman. Usado con <code>with … as dag:</code>, todas las tareas creadas adentro pertenecen a este DAG.`),
    R(/^\s*@dag\b/, () => 'af-@dag', () => '<code>@dag</code> (TaskFlow) convierte la función en un DAG; hay que llamarla al final del archivo para registrarlo.'),
    R(/schedule\s*=\s*["']([^"']+)["']/, () => 'af-sched', (m) => `<code>schedule="${esc(m[1])}"</code>: cuándo corre. ${cron(m[1]) ? `Significa <b>${esc(cron(m[1]))}</b>.` : ''} Un cron tiene 5 campos: minuto, hora, día del mes, mes, día de la semana (<code>*</code> = todos).`),
    R(/schedule\s*=\s*None/, () => 'af-sched-none', () => '<code>schedule=None</code>: no corre solo; solo cuando alguien lo dispara (a mano, por API o desde otro DAG).'),
    R(/start_date\s*=/, () => 'af-start', () => '<code>start_date</code>: desde qué fecha el DAG puede tener ejecuciones. No es "cuándo empieza a correr hoy": cada ejecución representa un <b>intervalo de datos</b> y corre cuando ese intervalo termina.'),
    R(/catchup\s*=\s*(True|False)/, () => 'af-catchup', (m) => `<code>catchup=${m[1]}</code>: ${m[1] === 'False' ? 'al activar el DAG <b>no</b> crea ejecuciones para las fechas pasadas desde el start_date; solo corre la más reciente. Es lo seguro en la mayoría de los casos.' : '<b>sí</b> crea una ejecución por cada intervalo pasado desde el start_date (un "backfill" automático): con un start_date viejo pueden ser cientos.'}`),
    R(/default_args\s*=/, () => 'af-defargs', () => '<code>default_args</code>: parámetros que reciben <b>todas</b> las tareas del DAG (reintentos, dueño, avisos), para no repetirlos en cada una.'),
    R(/retries\s*["']?\s*[:=]\s*(\d+)/, () => 'af-retries', (m) => `<code>retries=${esc(m[1])}</code>: si una tarea falla, Airflow la reintenta hasta ${esc(m[1])} veces antes de marcarla como fallida. Junto con <code>retry_delay</code> (cuánto esperar) resuelve los fallos pasajeros (una API caída un minuto).`),
    R(/retry_delay/, () => 'af-rdelay', () => '<code>retry_delay=timedelta(minutes=5)</code>: cuánto espera entre reintentos. <code>retry_exponential_backoff=True</code> va duplicando la espera.'),
    R(/\bEmptyOperator\(/, () => 'af-empty', () => '<b>EmptyOperator</b>: una tarea que no hace nada. Se usa como marcador de inicio o fin, o para juntar ramas.'),
    R(/\bBashOperator\(/, () => 'af-bash', () => '<b>BashOperator</b>: una tarea que ejecuta un comando de terminal (<code>bash_command="…"</code>). Si el comando termina con un código distinto de 0, la tarea falla.'),
    R(/\bPythonOperator\(/, () => 'af-python', () => '<b>PythonOperator</b>: una tarea que llama a una función de Python (<code>python_callable=mi_funcion</code>, sin paréntesis: le pasas la función, no su resultado). <code>op_kwargs</code> le pasa argumentos.'),
    R(/\bBranchPythonOperator\(|@task\.branch/, () => 'af-branch', () => '<b>Rama</b>: la función devuelve el <code>task_id</code> de la tarea que debe seguir; las otras ramas quedan <b>skipped</b> (salteadas).'),
    R(/\b\w*Sensor\(/, () => 'af-sensor', () => 'un <b>sensor</b>: una tarea que espera a que algo pase (un archivo, otra tarea). <code>poke_interval</code> = cada cuánto revisa, <code>timeout</code> = cuánto espera como máximo, <code>mode="reschedule"</code> = libera el worker mientras espera.'),
    R(/\bTriggerDagRunOperator\(/, () => 'af-trigger', () => '<b>TriggerDagRunOperator</b>: dispara otro DAG.'),
    R(/^\s*@task\b(?!\.branch)/, () => 'af-@task', () => '<code>@task</code> (TaskFlow) convierte una función común en una tarea. Lo que la función <b>devuelve</b> viaja solo a la tarea siguiente como XCom: <code>cargar(transformar(extraer()))</code> arma las dependencias y pasa los datos.'),
    R(/task_id\s*=\s*["'](\w+)["']/, () => 'af-taskid', () => '<code>task_id</code>: el nombre único de la tarea dentro del DAG. Es lo que ves en la interfaz y en los logs.'),
    R(/>>|<</, () => 'af-deps', () => '<code>a &gt;&gt; b</code> significa "<b>b corre después de a</b>" (b depende de a). Con listas se arman ramas en paralelo: <code>a &gt;&gt; [b, c] &gt;&gt; d</code>. <code>&lt;&lt;</code> es lo mismo al revés.'),
    R(/\bchain\(/, () => 'af-chain', () => '<code>chain(a, b, c)</code> encadena tareas en orden; es lo mismo que <code>a &gt;&gt; b &gt;&gt; c</code>.'),
    R(/trigger_rule\s*=\s*["']?(?:TriggerRule\.)?(\w+)/, () => 'af-tr', (m) => `<code>trigger_rule=${esc(m[1])}</code>: cuándo corre la tarea según cómo terminaron las anteriores. Por defecto es <code>all_success</code> (todas bien). ${{ all_done: '<b>all_done</b>: corre cuando todas terminaron, bien o mal (para limpiezas o avisos).', one_failed: '<b>one_failed</b>: corre apenas una falla (para alertas).', none_failed: '<b>none_failed</b>: ninguna falló (saltadas sí valen), típica después de una rama.', none_failed_min_one_success: '<b>none_failed_min_one_success</b>: ninguna falló y al menos una salió bien; la correcta para juntar ramas.', all_failed: '<b>all_failed</b>: solo si todas fallaron.', one_success: '<b>one_success</b>: apenas una sale bien.', always: '<b>always</b>: siempre.' }[m[1].toLowerCase()] || ''}`),
    R(/on_failure_callback/, () => 'af-cb', () => '<code>on_failure_callback</code>: una función que Airflow llama cuando una tarea falla (para avisar por Slack o email). Recibe el contexto con el DAG, la tarea y el error.'),
    R(/xcom_(push|pull)/, () => 'af-xcom', () => '<b>XCom</b>: la forma de pasar datos <b>chicos</b> entre tareas (un número, una ruta, una lista corta). Los datos grandes se guardan en un archivo o tabla y se pasa la ruta.'),
    R(/\{\{\s*(ds|data_interval_start|data_interval_end|logical_date|ts)\b/, () => 'af-tpl', () => 'una <b>plantilla</b> Jinja: <code>{{ ds }}</code> se reemplaza por la fecha lógica de la ejecución (AAAA-MM-DD). Así cada ejecución procesa <b>su</b> día y re-ejecutar un día da el mismo resultado (idempotencia).'),
    R(/max_active_runs\s*=/, () => 'af-mar', () => '<code>max_active_runs</code>: cuántas ejecuciones del DAG pueden correr a la vez.'),
    R(/dagrun_timeout|execution_timeout/, () => 'af-timeout', () => '<code>execution_timeout</code> / <code>dagrun_timeout</code>: tiempo máximo antes de cortar una tarea o una ejecución colgada.'),
    R(/tags\s*=/, () => 'af-tags', () => '<code>tags</code>: etiquetas para filtrar el DAG en la interfaz (por equipo, dominio o criticidad).'),
    R(/TaskGroup\(/, () => 'af-tg', () => '<b>TaskGroup</b>: agrupa tareas visualmente en la interfaz (no cambia cómo corren).'),
    R(/\.test\(/, () => 'af-test', () => '<code>dag.test()</code> ejecuta el DAG completo una vez, en orden, sin scheduler: la forma de probarlo localmente.'),
  ];
  // dependencias "a >> b >> [c, d]" → pares "a → b"
  function dependencias(code) {
    const pares = [];
    for (const l of code.split('\n')) {
      if (!/>>|<</.test(l) || /^\s*#/.test(l)) continue;
      const inv = /<</.test(l) && !/>>/.test(l);
      const ps = l.trim().split(inv ? '<<' : '>>').map((x) => x.trim().replace(/^\[|\]$/g, '').split(',').map((y) => y.trim().replace(/\(.*\)$/, '')).filter(Boolean));
      for (let i = 0; i + 1 < ps.length; i++) for (const a of ps[i]) for (const b of ps[i + 1]) pares.push(inv ? [b, a] : [a, b]);
    }
    return pares;
  }

  // ---------------------------------------------------------------- recorrido línea por línea
  function sinComentario(l) {
    let q = null;
    for (let i = 0; i < l.length; i++) { const ch = l[i]; if (q) { if (ch === q && l[i - 1] !== '\\') q = null; } else if (ch === '"' || ch === "'") q = ch; else if (ch === '#') return l.slice(0, i); }
    return l;
  }
  function explicarPython(codigo, lab) {
    const reglas = [...(lab === 'airflow' ? AIRFLOW : []), ...(lab === 'pyspark' ? SPARK : []), ...(/\bpd\.|import pandas/.test(codigo) ? PANDAS : []), ...PY_REGLAS];
    const vistos = new Set(), lineas = [];
    EST = {};
    let total = 0;
    const ls = String(codigo).split('\n');
    let enTriple = false;
    ls.forEach((raw, i) => {
      const tri = (raw.match(/"""|'''/g) || []).length;
      if (enTriple) { if (tri % 2) enTriple = false; return; }
      if (tri % 2) { enTriple = true; }
      const l = sinComentario(raw);
      if (!l.trim()) return;
      const notas = [];
      for (const r of reglas) {
        const m = l.match(r.re); if (!m) continue;
        const k = r.clave(m); if (vistos.has(k)) continue;
        // una sola explicación de asignación por línea: si ya hay una más específica, no se repite la general
        if (k === 'asig' && notas.some((n) => n.k === 'resultado' || n.k === 'dict' || n.k === 'lista' || n.k === 'dict-vacio' || n.k === 'lista-vacia' || n.k === 'desempaquetar')) continue;
        vistos.add(k); notas.push({ k, t: r.texto(m, l) });
      }
      if (notas.length) { total += notas.length; lineas.push({ n: i + 1, l: raw, notas }); }
    });
    if (!lineas.length) return '<p class="muted small">Escribe código y ejecútalo para ver la explicación.</p>';
    const MAX = 40; let usados = 0;
    let html = `<p class="small muted">Línea por línea: cada concepto se explica la primera vez que aparece.${/\n\s+\S/.test(codigo) && lab !== 'sql' ? ' En Python la <b>sangría</b> (los espacios al principio) no es decoración: marca qué líneas están dentro de un if, un for o una función.' : ''}</p><ol class="exp-lineas">`;
    for (const x of lineas) {
      if (usados >= MAX) break;
      const ns = x.notas.slice(0, MAX - usados); usados += ns.length;
      html += `<li><div class="exp-ln"><span class="exp-num">${x.n}</span><code>${esc(corto(x.l.trim(), 100))}</code></div><ul>${ns.map((n) => `<li>${n.t}</li>`).join('')}</ul></li>`;
    }
    html += '</ol>';
    if (total > MAX) html += `<p class="small muted">…y ${total - MAX} conceptos más.</p>`;
    if (lab === 'pyspark') {
      const tr = (codigo.match(/\.(select|filter|where|withColumn|withColumnRenamed|groupBy|agg|join|orderBy|sort|limit|distinct|dropDuplicates|drop|union|unionByName)\(/g) || []).length;
      const ac = (codigo.match(/\.(show|collect|take|first|toPandas|count\(\)\s*$|write)\b/gm) || []).length;
      html += `<p class="exp-sub">⚡ Cómo lo ejecuta Spark</p><p class="small">Tu código tiene <b>${tr} transformaciones</b> y <b>${ac} acciones</b>. Las transformaciones son <b>perezosas</b>: Spark solo anota el plan. Cuando aparece una acción (show, count, collect, write) arma el plan completo, lo optimiza y recién ahí lee los datos. ${ac ? '' : 'En las misiones no hace falta una acción: el sitio calcula <code>resultado</code> al compararlo.'}</p>`;
    }
    if (lab === 'airflow') {
      const d = dependencias(codigo);
      if (d.length) html += `<p class="exp-sub">🔀 El orden de tus tareas</p><ul class="exp-lista">${d.map(([a, b]) => `<li>${c(a)} → ${c(b)}: ${c(b)} espera a que ${c(a)} termine bien.</li>`).join('')}</ul>`;
      html += '<p class="small muted">Recuerda: el archivo del DAG solo <b>describe</b> el flujo. El scheduler lo lee cada pocos segundos, así que el código de arriba del archivo debe ser liviano: nada de consultas ni llamadas a APIs fuera de las tareas.</p>';
    }
    return html;
  }

  // ---------------------------------------------------------------- dbt
  function explicarDbt(codigo, compilado) {
    const it = [], v = (re) => [...codigo.matchAll(re)];
    for (const m of v(/\{\{\s*config\(([^)]*)\)\s*\}\}/g)) {
      const mat = (m[1].match(/materialized\s*=\s*["'](\w+)["']/) || [])[1];
      it.push(`${c(corto(m[0], 70))}: configura el modelo. ${mat ? { view: '<b>view</b>: dbt crea una vista; no guarda datos, se recalcula cada vez que alguien la consulta. Liviano para staging.', table: '<b>table</b>: dbt borra y vuelve a crear una tabla con el resultado en cada <code>dbt run</code>. Más rápido de consultar, más caro de construir.', incremental: '<b>incremental</b>: la primera vez crea la tabla completa; después solo procesa las filas nuevas (las que filtra el bloque <code>is_incremental()</code>) y las agrega o actualiza.', ephemeral: '<b>ephemeral</b>: no crea nada en la base; dbt pega este SQL como CTE dentro de los modelos que lo usan.' }[mat] || '' : ''}${/unique_key/.test(m[1]) ? ' <code>unique_key</code> dice qué columna identifica una fila, para actualizar en lugar de duplicar.' : ''}`);
    }
    for (const m of v(/\{\{\s*source\(\s*["'](\w+)["']\s*,\s*["'](\w+)["']\s*\)\s*\}\}/g)) it.push(`${c(m[0])}: lee la tabla <b>cruda</b> ${c(m[2])} de la fuente ${c(m[1])}, declarada en un archivo <code>sources.yml</code>. Se usa solo en los modelos de <b>staging</b>; dbt lo reemplaza por el nombre real de la tabla y lo dibuja como origen en el linaje.`);
    for (const m of v(/\{\{\s*ref\(\s*["'](\w+)["']\s*\)\s*\}\}/g)) it.push(`${c(m[0])}: usa otro modelo del proyecto, ${c(m[1])}. dbt lo reemplaza por el nombre de la tabla o vista y, sobre todo, <b>sabe que este modelo depende de aquel</b>: así decide el orden de construcción. Nunca se escribe el nombre de la tabla a mano.`);
    for (const m of v(/\{\{\s*var\(\s*["'](\w+)["'](?:\s*,\s*([^)]+))?\)\s*\}\}/g)) it.push(`${c(m[0])}: una <b>variable</b> del proyecto (se define en <code>dbt_project.yml</code> o con <code>--vars</code>). ${m[2] ? `Si nadie la define, vale ${c(m[2].trim())}.` : ''}`);
    if (/is_incremental\(\)/.test(codigo)) it.push('<code>{% if is_incremental() %} … {% endif %}</code>: ese pedazo solo se agrega cuando la tabla ya existe y no es un <code>--full-refresh</code>. Ahí se filtra "solo lo nuevo", comparando con <code>{{ this }}</code> (la tabla actual del modelo).');
    if (/\{\{\s*this\s*\}\}/.test(codigo)) it.push('<code>{{ this }}</code>: la tabla de este mismo modelo, tal como quedó en la última ejecución.');
    for (const m of v(/\{%-?\s*set\s+(\w+)\s*=\s*([^%]+?)-?%\}/g)) it.push(`<code>{% set ${esc(m[1])} = … %}</code>: guarda un valor de Jinja (${c(corto(m[2], 50))}) para usarlo más abajo con <code>{{ ${esc(m[1])} }}</code>. Existe solo mientras se compila.`);
    for (const m of v(/\{%-?\s*for\s+(\w+)\s+in\s+([^%]+?)-?%\}/g)) it.push(`<code>{% for ${esc(m[1])} in ${esc(m[2].trim())} %}</code>: repite el SQL de adentro una vez por cada elemento, escribiendo código por ti (por ejemplo, una columna por estado). <code>loop.last</code> sirve para no dejar una coma al final.`);
    if (/\{%-?\s*if\b/.test(codigo) && !/is_incremental/.test(codigo)) it.push('<code>{% if … %}</code>: incluye un pedazo de SQL solo si se cumple la condición, al compilar.');
    for (const m of v(/\{%-?\s*macro\s+(\w+)\s*\(([^)]*)\)/g)) it.push(`<code>{% macro ${esc(m[1])}(${esc(m[2])}) %}</code>: define una <b>macro</b>, una función de Jinja que escribe SQL. Se guarda en <code>macros/</code> y se llama con <code>{{ ${esc(m[1])}(…) }}</code> desde cualquier modelo.`);
    for (const m of v(/\{\{\s*(?!source|ref|config|var|this)(\w+(?:\.\w+)?)\(/g)) it.push(`<code>{{ ${esc(m[1])}(…) }}</code>: llama a una macro; se reemplaza por el SQL que ella genera.`);
    if (/^\s*with\s+\w+\s+as\s*\(\s*select\s+\*\s+from\s+\{\{/im.test(codigo)) it.push('Usas el patrón de dbt "<b>CTE de importación</b>": arriba, un <code>with x as (select * from {{ ref/source }})</code> por cada cosa que lees; abajo, la lógica. Así se ve de un vistazo de qué depende el modelo.');
    if (/^\s*select\s+\*\s*$/im.test(codigo.split('\n').pop() || '') || /select\s+\*\s+from\s+\w+\s*$/i.test(codigo.trim())) it.push('Terminas con <code>select * from final</code>: convención de dbt para que la última CTE sea el resultado y se pueda depurar cambiando solo ese nombre.');
    let html = '<p class="small muted">Un modelo de dbt es <b>un archivo con un solo SELECT</b>. dbt no ejecuta tu archivo tal cual: primero lo <b>compila</b> (resuelve el Jinja <code>{{ }}</code> y <code>{% %}</code> y lo convierte en SQL puro) y después lo envuelve en un <code>CREATE VIEW</code> o <code>CREATE TABLE</code> según la materialización.</p>';
    if (it.length) html += `<p class="exp-sub">🧩 El Jinja de tu modelo</p><ul class="exp-lista">${[...new Set(it)].map((x) => `<li>${x}</li>`).join('')}</ul>`;
    else html += '<p class="small">Tu modelo todavía no usa Jinja. En dbt, las tablas se leen con <code>{{ source(…) }}</code> (crudas) o <code>{{ ref(…) }}</code> (otros modelos), nunca por su nombre.</p>';
    if (compilado) html += `<p class="exp-sub">🗃️ El SQL compilado, explicado</p>${explicarSQL(compilado)}`;
    return html;
  }

  // ---------------------------------------------------------------- errores de Python
  const ERR_PY = [
    [/IndentationError|TabError/, () => 'La <b>sangría</b> no es coherente. Python usa los espacios del principio para saber qué está dentro de un if, for o def: todo un bloque tiene que tener exactamente la misma sangría (4 espacios por nivel). Revisa la línea marcada y la de arriba; después de una línea que termina en <code>:</code> siempre va un bloque con más sangría.'],
    [/SyntaxError.*(was never closed|unexpected EOF|EOF while)/, () => 'Abriste un paréntesis, corchete, llave o comilla y no lo cerraste. Ojo: Python a veces marca la línea <b>siguiente</b> a la del error.'],
    [/SyntaxError.*unterminated string/, () => 'Un texto empieza con comilla y no termina en la misma línea. Para textos de varias líneas usa triple comilla <code>"""…"""</code>.'],
    [/SyntaxError.*expected ':'/, () => 'Falta el <b>dos puntos</b> al final de la línea: <code>if</code>, <code>for</code>, <code>while</code>, <code>def</code>, <code>else</code>, <code>try</code> y <code>with</code> siempre terminan en <code>:</code>.'],
    [/SyntaxError.*(Maybe you meant '==')|cannot assign to/, () => 'Usaste <code>=</code> (guardar) donde iba <code>==</code> (comparar), o intentaste guardar en algo que no es una variable.'],
    [/SyntaxError/, () => 'Python no pudo leer tu código: no llegó a ejecutar nada. Mira la línea marcada (y la anterior): suele faltar una coma, un paréntesis, unos dos puntos o sobrar un símbolo.'],
    [/NameError: name '(\w+)' is not defined/, (m) => `Usaste ${c(m[1])} pero Python no sabe qué es. Causas comunes:<ul><li>Un error de tipeo (mayúsculas incluidas: <code>Resultado</code> ≠ <code>resultado</code>).</li><li>La variable se crea <b>más abajo</b> o dentro de un if que no se cumplió.</li><li>Falta el <code>import</code> (por ejemplo ${c('F')} sin <code>from pyspark.sql import functions as F</code>, o ${c('datetime')}).</li><li>Querías un texto y faltan las comillas: ${c(`"${m[1]}"`)}.</li></ul>`],
    [/TypeError: unsupported operand type\(s\) for ([^:]+): '(\w+)' and '(\w+)'/, (m) => `Intentaste hacer ${c(m[1].trim())} entre un ${c(m[2])} y un ${c(m[3])}, y Python no mezcla esos tipos. Lo más común: un número que llegó como texto (de un CSV o un input). Conviértelo con <code>float()</code> o <code>int()</code>.${m[2] === 'NoneType' || m[3] === 'NoneType' ? ' Uno de los valores es <b>None</b>: probablemente una función sin <code>return</code> o un <code>.get()</code> de una clave que no existe.' : ''}`],
    [/TypeError: can only concatenate str/, () => 'Intentaste unir con <code>+</code> un texto y un número. Convierte el número con <code>str()</code> o, mejor, usa un f-string: <code>f"Total: {total}"</code>.'],
    [/TypeError: '(\w+)' object is not callable/, (m) => `Pusiste paréntesis a algo que no es una función (${c(m[1])}). A veces pasa porque una variable tiene el mismo nombre que una función (por ejemplo, llamaste <code>sum = 0</code> y después usas <code>sum(…)</code>).`],
    [/TypeError: '(\w+)' object is not subscriptable/, (m) => `Usaste corchetes <code>[…]</code> sobre un ${c(m[1])}, que no se puede indexar.${m[1] === 'NoneType' ? ' Es <b>None</b>: revisa que la función que lo produce tenga <code>return</code>.' : ''}`],
    [/TypeError: (\w+)\(\) (missing|takes)/, (m) => `Llamaste a ${c(m[1])} con una cantidad de argumentos distinta a la que espera. Compara la llamada con la definición <code>def ${esc(m[1])}(…)</code>.`],
    [/TypeError: unhashable type/, () => 'Una lista o un diccionario no pueden ser <b>clave</b> de un diccionario ni elementos de un set. Usa una tupla <code>(a, b)</code> en su lugar.'],
    [/TypeError/, () => 'Una operación recibió un valor de un <b>tipo</b> que no acepta (texto donde iba número, None donde iba una lista…). Imprime el valor con <code>print(type(x), x)</code> justo antes de la línea marcada.'],
    [/KeyError: (.+)/, (m) => `Buscaste la clave ${c(m[1])} en un diccionario y no existe. Revisa mayúsculas y espacios, o usa <code>d.get(${esc(m[1])})</code>, que devuelve None en vez de error. En pandas, es una columna que no existe (mira <code>df.columns</code>).`],
    [/IndexError/, () => 'Pediste una posición que no existe en la lista: con 3 elementos las posiciones son 0, 1 y 2. Revisa con <code>len()</code>, o que la lista no esté vacía.'],
    [/AttributeError: '(\w+)' object has no attribute '(\w+)'/, (m) => `Un ${c(m[1])} no tiene ${c('.' + m[2])}.${m[1] === 'NoneType' ? ' El valor es <b>None</b>: casi siempre una función sin return, o métodos como <code>.sort()</code> y <code>.append()</code> que devuelven None (no se reasignan).' : m[1] === 'DataFrame' ? ' Revisa el nombre del método (en PySpark van en camelCase: <code>groupBy</code>, <code>orderBy</code>, <code>withColumn</code>).' : ` Revisa el nombre o el tipo: por ejemplo, <code>.lower()</code> es de los textos, no de las listas.`}`],
    [/ValueError: could not convert string to float: (.+)/, (m) => `El texto ${c(m[1])} no se puede convertir en número. Datos sucios: saltéalos con <code>try/except ValueError</code>, o límpialos antes (<code>.strip()</code>, <code>.replace(",", ".")</code>).`],
    [/ValueError: invalid literal for int\(\) with base 10: (.+)/, (m) => `<code>int()</code> no puede convertir ${c(m[1])}. Si tiene decimales, usa <code>float()</code>; si está vacío o tiene letras, hay que limpiarlo o saltearlo.`],
    [/ValueError: time data .* does not match format/, () => 'La fecha no coincide con el formato que le diste a <code>strptime</code>. <code>%Y</code> = año de 4 cifras, <code>%m</code> = mes, <code>%d</code> = día, <code>%H:%M</code> = hora y minuto.'],
    [/ValueError/, () => 'El tipo es correcto pero el <b>valor</b> no sirve (un texto que no es número, una fecha mal formada, demasiados valores para desempaquetar).'],
    [/ZeroDivisionError/, () => 'Dividiste por cero. Antes de dividir pregunta si el divisor es 0 (<code>x / y if y else 0</code>).'],
    [/ModuleNotFoundError: No module named '(\w+)'/, (m) => `El módulo ${c(m[1])} no está disponible acá. En el navegador hay: la biblioteca estándar, pandas, numpy, mini-Spark y mini-Airflow. En tu computadora lo instalarías con <code>pip install ${esc(m[1])}</code> o <code>uv add ${esc(m[1])}</code>.`],
    [/ImportError: cannot import name '(\w+)'/, (m) => `${c(m[1])} no existe en ese módulo (o está en otro). Revisa la ruta del import en la chuleta.`],
    [/AssertionError:?\s*(.*)/, (m) => `Una verificación (<code>assert</code>) no se cumplió${m[1] ? `: <b>${esc(m[1])}</b>` : ''}. En las misiones, los assert son los criterios: el mensaje dice cuál falta.`],
    [/AnalysisException|cannot resolve|Column .* does not exist|UNRESOLVED_COLUMN/i, () => 'Spark no encuentra una columna: revisa el nombre (mira <code>df.columns</code> o <code>df.printSchema()</code>). Después de un <code>groupBy().agg()</code> solo quedan las columnas de agrupación y las que calculaste.'],
    [/RecursionError/, () => 'Una función se llama a sí misma sin parar. Falta el caso que la hace terminar.'],
    [/UnboundLocalError/, () => 'Usas una variable dentro de una función antes de darle valor ahí. Si querías la de afuera, pásala como parámetro.'],
    [/Tiempo agotado/, () => 'El código tardó demasiado: casi siempre un <code>while</code> cuya condición nunca se vuelve falsa. El intérprete se reinició: tu código sigue en el editor.'],
    [/AirflowException|DuplicateTaskIdFound|cycle/i, () => 'Airflow rechazó el DAG: puede haber dos tareas con el mismo <code>task_id</code>, una dependencia circular (a → b → a) o un parámetro inválido. El mensaje dice cuál.'],
    [/TemplateSyntaxError|UndefinedError|jinja/i, () => 'Error de Jinja: revisa que cada <code>{{</code> cierre con <code>}}</code>, cada <code>{%</code> con <code>%}</code>, que cada <code>{% if %}</code> y <code>{% for %}</code> tenga su <code>{% endif %}</code> o <code>{% endfor %}</code>, y que las comillas de <code>ref(\'…\')</code> estén bien.'],
  ];
  function explicarErrorPy(msg) {
    const lin = (msg.match(/línea (\d+)/) || [])[1];
    for (const [re, f] of ERR_PY) { const m = msg.match(re); if (m) return (lin ? `<p class="small">📍 El problema está en la <b>línea ${lin}</b> (mira el número a la izquierda del editor). Python lee la última línea del mensaje: <b>el tipo de error</b> y su descripción.</p>` : '') + `<p>${f(m)}</p>`; }
    return '<p>Lee la última línea del mensaje: dice el <b>tipo de error</b> (NameError, TypeError…) y qué pasó. La línea indicada es donde Python se dio cuenta, que no siempre es donde está el error.</p>';
  }

  // ---------------------------------------------------------------- SQL: los datos en cada paso
  // Arma consultas parciales (solo FROM, FROM+WHERE, …) para mostrar cómo cambian las filas en cada etapa.
  function pasosSQL(codigo) {
    const { s, des } = enmascarar(codigo);
    const sts = s.split(';').map((x) => x.trim()).filter(Boolean);
    const st = sts[sts.length - 1];
    if (!st || !/^\s*(WITH|SELECT)\b/i.test(st)) return { motivo: 'Solo se puede ver paso a paso una consulta SELECT.' };
    if (partir(st, /\b(UNION\s+ALL|UNION|INTERSECT|EXCEPT)\b/).length > 1) return { motivo: 'Las consultas con UNION se ven mejor ejecutando cada parte por separado.' };
    const k = clausulas(st);
    if (!k.from) return { motivo: 'La consulta no tiene FROM: no hay tabla que recorrer.' };
    // lo que va antes (sentencias previas, como CREATE o INSERT) y la parte WITH se repiten en cada paso
    const previo = sts.slice(0, -1).map((x) => des(x) + ';\n').join('');
    const withTxt = k.with != null ? des(st.slice(0, aplanar(st).search(/\bSELECT\b/i))) : '';
    const F = des(k.from), Wh = k.where ? des(k.where) : '', G = k.group ? des(k.group) : '', H = k.having ? des(k.having) : '', Sel = des(k.select || '*'), O = k.order ? des(k.order) : '', L = k.limit ? des(k.limit) + (k.offset ? ' OFFSET ' + des(k.offset) : '') : '';
    const base = (sel, extra = '') => `${previo}${withTxt} SELECT ${sel} FROM ${F}${Wh ? ' WHERE ' + Wh : ''}${extra}`;
    const pasos = [];
    const joins = /\bJOIN\b/i.test(F);
    pasos.push({ c: 'FROM', t: joins ? 'FROM + JOIN: las tablas unidas' : 'FROM: la tabla de partida', d: joins ? 'Todas las combinaciones que cumplen el ON, con las columnas de las tablas unidas. Todavía no se filtró nada.' : 'Todas las filas de la tabla, tal cual están guardadas.', sql: [`${previo}${withTxt} SELECT * FROM ${F}`] });
    if (Wh) pasos.push({ c: 'WHERE', t: 'WHERE: las filas que cumplen la condición', d: `Se revisó cada fila contra <code>${esc(corto(Wh, 80))}</code> y se descartaron las que no cumplen.`, sql: [base('*')] });
    if (G) {
      const gExpr = partir(G, /,/).map((x) => x.txt.trim()).join(', ');
      pasos.push({ c: 'GROUP BY', t: 'GROUP BY: los grupos que se formaron', d: 'Cada fila de abajo es un grupo. La columna <code>filas_en_el_grupo</code> (agregada solo para que la veas) cuenta cuántas filas del paso anterior cayeron en ese grupo.', sql: [base(`${gExpr}, COUNT(*) AS filas_en_el_grupo`, ` GROUP BY ${G}`), base(`${Sel}, COUNT(*) AS filas_en_el_grupo`, ` GROUP BY ${G}`)] });
      if (H) pasos.push({ c: 'HAVING', t: 'HAVING: los grupos que pasan el filtro', d: `Se descartaron los grupos que no cumplen <code>${esc(corto(H, 80))}</code>.`, sql: [base(`${gExpr}, COUNT(*) AS filas_en_el_grupo`, ` GROUP BY ${G} HAVING ${H}`), base(`${Sel}, COUNT(*) AS filas_en_el_grupo`, ` GROUP BY ${G} HAVING ${H}`)] });
    }
    const resto = `${G ? ' GROUP BY ' + G : ''}${H ? ' HAVING ' + H : ''}`;
    pasos.push({ c: 'SELECT', t: 'SELECT: las columnas finales', d: 'Se calcularon las columnas que pediste' + (/^DISTINCT\b/i.test(Sel) ? ' y se eliminaron las filas repetidas (DISTINCT)' : '') + '. Todavía sin ordenar.', sql: [base(Sel, resto)] });
    if (O) pasos.push({ c: 'ORDER BY', t: 'ORDER BY: el mismo resultado, ordenado', d: `Mismas filas, en el orden <code>${esc(corto(O, 60))}</code>.`, sql: [base(Sel, resto + ' ORDER BY ' + O)] });
    if (L) pasos.push({ c: 'LIMIT', t: 'LIMIT: el corte final', d: 'Se quedan solo las primeras filas. Este es tu resultado.', sql: [base(Sel, resto + (O ? ' ORDER BY ' + O : '') + ' LIMIT ' + L)] });
    return { pasos };
  }
  function tablaMini(res, max = 6, maxCols = 8, usadas = null) {
    // las columnas que usa tu consulta van primero, para que no queden escondidas
    let idx = res.columns.map((_, i) => i);
    if (usadas) idx = [...idx.filter((i) => usadas.has(res.columns[i].toLowerCase())), ...idx.filter((i) => !usadas.has(res.columns[i].toLowerCase()))];
    idx = idx.slice(0, maxCols);
    res = { columns: res.columns, values: res.values.slice(0, max).map((r) => idx.map((i) => r[i])), cols: idx.map((i) => res.columns[i]) };
    const cols = res.cols, filas = res.values;
    const cel = (v) => v === null || v === undefined ? '<td class="null">NULL</td>' : `<td>${esc(typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 100) / 100 : v)}</td>`;
    return `<div class="result-table-wrap exp-mini"><table class="result"><thead><tr>${cols.map((x) => `<th>${esc(x)}</th>`).join('')}${res.columns.length > maxCols ? `<th class="muted">+${res.columns.length - maxCols}</th>` : ''}</tr></thead><tbody>${filas.map((r) => `<tr>${r.map(cel).join('')}${res.columns.length > maxCols ? '<td class="muted">…</td>' : ''}</tr>`).join('')}</tbody></table></div>`;
  }
  // ejecuta los pasos con `ejecutar(sql)` → { ok, results } y devuelve el HTML
  function datosEnCadaPaso(codigo, ejecutar) {
    const r = pasosSQL(codigo);
    if (r.motivo) return `<p class="small muted">${r.motivo}</p>`;
    let html = '<p class="small muted">Cada caja es la tabla intermedia que la base tiene en memoria después de esa etapa. Muestro las primeras filas y cuántas hay en total.</p><ol class="exp-pasos-datos">';
    let antes = null;
    const usadas = new Set((enmascarar(codigo).s.match(/[a-z_][\w]*/gi) || []).map((x) => x.toLowerCase()));
    for (const p of r.pasos) {
      let res = null, err = '';
      for (const q of p.sql) { const x = ejecutar(q); if (x.ok) { res = (x.results || []).filter(Boolean).pop() || { columns: [], values: [] }; break; } err = x.error; }
      if (!res) { html += `<li><b>${p.t}</b><p class="small muted">Este paso no se puede mostrar por separado (${esc(corto(String(err).split('\n')[0], 120))}). Suele pasar cuando una etapa usa un alias que se define en el SELECT.</p></li>`; continue; }
      const n = res.values.length;
      const cambio = antes == null ? '' : n < antes ? ` <span class="exp-delta menos">${antes.toLocaleString('es')} → ${n.toLocaleString('es')} filas (−${(antes - n).toLocaleString('es')})</span>` : n > antes ? ` <span class="exp-delta mas">${antes.toLocaleString('es')} → ${n.toLocaleString('es')} filas</span>` : ` <span class="exp-delta">${n.toLocaleString('es')} filas (sin cambios en la cantidad)</span>`;
      html += `<li><div class="exp-paso-cab"><span class="exp-paso-k">${p.c}</span><b>${p.t}</b>${antes == null ? ` <span class="exp-delta">${n.toLocaleString('es')} filas · ${res.columns.length} columnas</span>` : cambio}</div><p class="small">${p.d}</p>${n ? tablaMini(res, 6, 8, usadas) : '<p class="small">⚠️ No quedó ninguna fila: lo que sigue también va a estar vacío. Revisa la condición (mayúsculas, tildes, comillas).</p>'}${n > 6 ? `<p class="small muted">…y ${(n - 6).toLocaleString('es')} filas más.</p>` : ''}</li>`;
      antes = n;
    }
    return html + '</ol>';
  }

  // ---------------------------------------------------------------- panel
  function resumenResultado(lab, r) {
    if (!r) return '';
    if (lab === 'sql' || lab === 'dbt') {
      if (!r.ok) return `<p class="exp-res bad">✗ La consulta dio un error.</p><p class="exp-sub">🩺 Qué significa el error</p><p>${explicarErrorSQL(String(r.error || ''))}</p>`;
      const res = (r.results || []).filter(Boolean); const u = res[res.length - 1];
      if (!u) return `<p class="exp-res ok">✓ Se ejecutó bien${r.changes ? ` y modificó <b>${r.changes}</b> fila${r.changes === 1 ? '' : 's'}` : ' pero no devolvió filas'}.</p>`;
      const n = (u.values || []).length;
      return `<p class="exp-res ok">✓ Devolvió <b>${n.toLocaleString('es')}</b> fila${n === 1 ? '' : 's'} y <b>${u.columns.length}</b> columna${u.columns.length === 1 ? '' : 's'} (${u.columns.map(esc).join(', ')}).${n === 0 ? ' Cero filas suele ser un filtro demasiado estricto o un texto mal escrito (mayúsculas, tildes).' : ''}</p>`;
    }
    if (!r.ok || r.error) return `<p class="exp-res bad">✗ Tu código se detuvo por un error.</p><p class="exp-sub">🩺 Qué significa el error</p>${explicarErrorPy(String(r.error || ''))}`;
    return `<p class="exp-res ok">✓ Se ejecutó sin errores${r.stdout ? '; lo que imprimiste está en la consola' : ''}.</p>`;
  }
  function explicar(lab, codigo, r, extra = {}) {
    if (lab === 'sql') return explicarSQL(codigo);
    if (lab === 'dbt') return explicarDbt(codigo, extra.compilado || (r && r.compiled));
    return explicarPython(codigo, lab);
  }
  const TIT = { sql: 'tu consulta', dbt: 'tu modelo', python: 'tu código', pyspark: 'tu código', airflow: 'tu DAG' };
  function panel(lab) {
    const el = document.createElement('div');
    el.className = 'card exp-panel exp-codigo';
    el.innerHTML = `<div class="exp-tit">🧠 ¿Qué hace ${TIT[lab] || 'tu código'}?</div><div class="exp-cuerpo"><p class="muted small">Ejecuta tu código y acá vas a ver, paso a paso y en lenguaje simple, qué hace cada parte y qué significa el resultado o el error.</p></div>`;
    return {
      el,
      actualizar(codigo, r, extra = {}) {
        let cuerpo;
        try { cuerpo = resumenResultado(lab, r) + `<details class="exp-det" open><summary>📖 Paso a paso</summary>${explicar(lab, codigo, r, extra)}</details>`; } catch (e) { cuerpo = '<p class="muted small">No pude analizar este código, pero se ejecutó normalmente.</p>'; }
        const sqlPasos = lab === 'sql' ? codigo : lab === 'dbt' ? (extra.compilado || (r && r.compiled)) : null;
        const puede = sqlPasos && extra.pasos !== false && r && r.ok !== false && window.Engines && window.Engines.SQL && window.Engines.SQL._bytes;
        if (puede) cuerpo += '<details class="exp-det exp-datos"><summary>🔬 Ver los datos cambiar en cada paso</summary><div class="exp-datos-cuerpo"><p class="small muted">Calculando…</p></div></details>';
        el.querySelector('.exp-cuerpo').innerHTML = cuerpo;
        const det = el.querySelector('.exp-datos');
        if (det) det.addEventListener('toggle', () => {
          if (!det.open || det.dataset.listo) return; det.dataset.listo = '1';
          setTimeout(() => { let h; try { h = datosEnCadaPaso(sqlPasos, (q) => window.Engines.SQL.exec(q)); } catch (e) { h = `<p class="small muted">No se pudo calcular: ${esc(e.message)}</p>`; } det.querySelector('.exp-datos-cuerpo').innerHTML = h; }, 20);
        });
        if (det && extra.abrirDatos) det.open = true;
      },
    };
  }

  // ---------------------------------------------------------------- chuletas
  const CH = {
    sql: [
      { t: '👀 Mirar una tabla', ej: [['SELECT *\nFROM clientes\nLIMIT 10;', 'las primeras 10 filas, todas las columnas'], ['SELECT nombre, apellido, pais\nFROM clientes;', 'solo algunas columnas'], ['SELECT COUNT(*) AS filas\nFROM pedidos;', 'cuántas filas tiene']] },
      { t: '🔎 Filtrar filas (WHERE)', ej: [["SELECT nombre, ciudad\nFROM clientes\nWHERE pais = 'Chile';", 'igual a un texto (con comillas simples)'], ["SELECT nombre, precio\nFROM productos\nWHERE precio > 500 AND activo = 1;", 'dos condiciones a la vez'], ["SELECT pedido_id, canal\nFROM pedidos\nWHERE canal IN ('web', 'app');", 'alguno de una lista'], ["SELECT pedido_id, fecha_pedido\nFROM pedidos\nWHERE fecha_pedido BETWEEN '2024-01-01' AND '2024-01-31';", 'un rango de fechas'], ["SELECT nombre\nFROM productos\nWHERE nombre LIKE '%Smart%';", 'contiene un texto'], ['SELECT nombre, apellido\nFROM clientes\nWHERE telefono IS NULL;', 'los que no tienen dato']] },
      { t: '↕️ Ordenar y limitar', ej: [['SELECT nombre, precio\nFROM productos\nORDER BY precio DESC\nLIMIT 5;', 'los 5 más caros'], ['SELECT nombre, apellido\nFROM empleados\nORDER BY apellido, nombre;', 'por dos columnas'], ['SELECT DISTINCT pais\nFROM clientes\nORDER BY pais;', 'valores sin repetir']] },
      { t: '🧮 Calcular columnas', ej: [['SELECT nombre, precio, costo,\n       ROUND(precio - costo, 2) AS margen\nFROM productos;', 'una cuenta por fila, con nombre'], ["SELECT nombre || ' ' || apellido AS nombre_completo\nFROM clientes;", 'unir textos'], ["SELECT nombre, precio,\n       CASE WHEN precio < 100 THEN 'barato'\n            WHEN precio < 500 THEN 'medio'\n            ELSE 'caro' END AS rango\nFROM productos;", 'clasificar con CASE'], ["SELECT nombre, COALESCE(telefono, 'sin teléfono') AS telefono\nFROM clientes;", 'reemplazar vacíos']] },
      { t: '📊 Resumir (GROUP BY)', ej: [['SELECT estado, COUNT(*) AS pedidos\nFROM pedidos\nGROUP BY estado\nORDER BY pedidos DESC;', 'contar por grupo'], ['SELECT marca, COUNT(*) AS productos, ROUND(AVG(precio), 2) AS precio_medio\nFROM productos\nGROUP BY marca;', 'varias agregaciones'], ['SELECT ciudad, COUNT(*) AS clientes\nFROM clientes\nGROUP BY ciudad\nHAVING COUNT(*) > 50;', 'filtrar grupos con HAVING']] },
      { t: '🔗 Unir tablas (JOIN)', ej: [['SELECT p.nombre, c.nombre AS categoria\nFROM productos p\nJOIN categorias c ON c.categoria_id = p.categoria_id;', 'traer el nombre de la categoría'], ['SELECT c.cliente_id, c.nombre\nFROM clientes c\nLEFT JOIN pedidos p ON p.cliente_id = c.cliente_id\nWHERE p.pedido_id IS NULL;', 'los que nunca compraron (anti join)'], ['SELECT e.nombre, j.nombre AS jefe\nFROM empleados e\nLEFT JOIN empleados j ON j.empleado_id = e.jefe_id;', 'una tabla consigo misma']] },
      { t: '🧱 Subconsultas y CTE', ej: [['SELECT nombre, precio\nFROM productos\nWHERE precio > (SELECT AVG(precio) FROM productos);', 'comparar con un promedio'], ["WITH ventas AS (\n    SELECT p.cliente_id, SUM(d.cantidad * d.precio_unitario) AS total\n    FROM pedidos p\n    JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id\n    GROUP BY p.cliente_id\n)\nSELECT *\nFROM ventas\nORDER BY total DESC\nLIMIT 10;", 'pasos con nombre (WITH)']] },
      { t: '🪟 Funciones de ventana', ej: [['SELECT nombre, categoria_id, precio,\n       ROW_NUMBER() OVER (PARTITION BY categoria_id ORDER BY precio DESC) AS puesto\nFROM productos;', 'numerar dentro de cada grupo'], ["WITH m AS (\n    SELECT strftime('%Y-%m', fecha_pedido) AS mes, COUNT(*) AS pedidos\n    FROM pedidos\n    GROUP BY mes\n)\nSELECT mes, pedidos,\n       pedidos - LAG(pedidos) OVER (ORDER BY mes) AS diferencia,\n       SUM(pedidos) OVER (ORDER BY mes) AS acumulado\nFROM m;", 'comparar con el mes anterior y acumular']] },
      { t: '📅 Fechas (SQLite)', ej: [["SELECT strftime('%Y', fecha_pedido) AS anio, COUNT(*)\nFROM pedidos\nGROUP BY anio;", 'por año'], ["SELECT strftime('%Y-%m', fecha_pedido) AS mes, COUNT(*)\nFROM pedidos\nGROUP BY mes;", 'por mes'], ["SELECT pedido_id,\n       julianday(fecha_pago) - julianday(fecha_pedido) AS dias\nFROM pedidos\nJOIN pagos USING (pedido_id)\nLIMIT 10;", 'días entre dos fechas']] },
      { t: '✍️ Crear y modificar (práctica libre)', ej: [['CREATE TABLE mis_notas (\n    id INTEGER PRIMARY KEY,\n    texto TEXT NOT NULL\n);\nINSERT INTO mis_notas (texto) VALUES (\'hola\'), (\'chau\');\nSELECT * FROM mis_notas;', 'crear, insertar y leer'], ["UPDATE productos SET precio = precio * 1.1\nWHERE marca = 'Apple';\nSELECT nombre, precio FROM productos WHERE marca = 'Apple';", 'cambiar filas (con WHERE)']] },
    ],
    python: [
      { t: '🔤 Variables y tipos', ej: [['precio = 19.99\ncantidad = 3\ntotal = precio * cantidad\nprint(total)\nprint(type(total))', 'guardar y operar'], ['nombre = "Ana"\nprint(f"Hola, {nombre}. Tu total es {59.97:.2f}")', 'f-strings'], ['texto = "120"\nnumero = int(texto)\nprint(numero + 1)', 'convertir texto en número']] },
      { t: '📋 Listas', ej: [['ventas = [120, 80, 310, 45]\nprint(len(ventas), sum(ventas), max(ventas))\nprint(ventas[0], ventas[-1], ventas[:2])', 'medir y acceder'], ['ventas = [120, 80, 310]\nventas.append(99)\nprint(sorted(ventas, reverse=True))', 'agregar y ordenar'], ['precios = [10, 25, 40]\ncon_iva = [round(p * 1.21, 2) for p in precios]\nprint(con_iva)', 'comprensión de lista']] },
      { t: '🔁 Condiciones y bucles', ej: [['monto = 250\nif monto >= 500:\n    print("grande")\nelif monto >= 100:\n    print("mediano")\nelse:\n    print("chico")', 'if / elif / else'], ['for venta in [120, 80, 310]:\n    if venta > 100:\n        print("alta:", venta)', 'recorrer y filtrar'], ['for i in range(3):\n    print("vuelta", i)', 'repetir n veces']] },
      { t: '📒 Diccionarios', ej: [['cliente = {"nombre": "Ana", "pais": "Chile"}\nprint(cliente["nombre"])\nprint(cliente.get("email", "sin email"))', 'leer con y sin error'], ['totales = {}\nfor canal, monto in [("web", 10), ("app", 5), ("web", 7)]:\n    totales[canal] = totales.get(canal, 0) + monto\nprint(totales)', 'acumular por clave'], ['from collections import Counter\nprint(Counter(["web", "app", "web"]).most_common())', 'contar repeticiones']] },
      { t: '🧩 Funciones', ej: [['def neto(cantidad, precio, descuento=0):\n    return round(cantidad * precio * (1 - descuento), 2)\n\nprint(neto(2, 10))\nprint(neto(2, 10, 0.1))', 'definir y usar'], ['productos = [{"n": "A", "p": 30}, {"n": "B", "p": 10}]\nprint(sorted(productos, key=lambda x: x["p"]))', 'ordenar con key y lambda']] },
      { t: '🛟 Errores', ej: [['for t in ["10", "x", "3.5"]:\n    try:\n        print(float(t))\n    except ValueError:\n        print("no es número:", t)', 'try / except']] },
      { t: '📄 CSV y JSON', ej: [['import csv, io\ntexto = "canal,monto\\nweb,10\\napp,5"\nfor fila in csv.DictReader(io.StringIO(texto)):\n    print(fila["canal"], float(fila["monto"]))', 'leer un CSV'], ['import json\ndatos = json.loads(\'{"pedidos": [{"id": 1}, {"id": 2}]}\')\nprint([p["id"] for p in datos["pedidos"]])', 'leer JSON']] },
      { t: '📅 Fechas', ej: [['from datetime import date, timedelta\nd = date.fromisoformat("2024-03-15")\nprint(d + timedelta(days=30))\nprint((date(2024, 12, 31) - d).days)', 'sumar y restar']] },
      { t: '🐼 pandas', ej: [['import pandas as pd\ndf = pd.DataFrame({"canal": ["web", "app", "web"], "monto": [10, 5, 7]})\nprint(df.groupby("canal")["monto"].sum())', 'agrupar'], ['import pandas as pd\ndf = pd.DataFrame({"x": [3, 1, 2]})\nprint(df[df["x"] > 1].sort_values("x"))', 'filtrar y ordenar']] },
    ],
    pyspark: [
      { t: '👀 Leer y mirar', ej: [['df = spark.table("clientes")\ndf.printSchema()\ndf.show(5)', 'columnas, tipos y primeras filas'], ['print(spark.table("pedidos").count())', 'contar filas']] },
      { t: '🔎 Elegir y filtrar', ej: [['from pyspark.sql import functions as F\nspark.table("productos").select("nombre", "precio").filter(F.col("precio") > 1000).show()', 'select + filter'], ['from pyspark.sql import functions as F\nspark.table("pedidos").filter((F.col("canal") == "app") & (F.col("estado") == "entregado")).show(5)', 'dos condiciones (con paréntesis)']] },
      { t: '🧮 Columnas nuevas', ej: [['from pyspark.sql import functions as F\nspark.table("productos").withColumn("margen", F.round(F.col("precio") - F.col("costo"), 2)).select("nombre", "margen").show(5)', 'withColumn'], ['from pyspark.sql import functions as F\nspark.table("productos").withColumn("rango", F.when(F.col("precio") < 100, "barato").when(F.col("precio") < 500, "medio").otherwise("caro")).groupBy("rango").count().show()', 'when / otherwise']] },
      { t: '📊 Agrupar', ej: [['from pyspark.sql import functions as F\nspark.table("productos").groupBy("marca").agg(F.count("*").alias("n"), F.round(F.avg("precio"), 2).alias("precio_medio")).orderBy(F.desc("n")).show(5)', 'groupBy + agg']] },
      { t: '🔗 Joins', ej: [['p = spark.table("productos")\nc = spark.table("categorias").withColumnRenamed("nombre", "categoria")\np.join(c, "categoria_id").select("nombre", "categoria").show(5)', 'inner join por una columna'], ['cl = spark.table("clientes")\npe = spark.table("pedidos")\nprint(cl.join(pe, "cliente_id", "left_anti").count())', 'clientes sin pedidos (anti join)']] },
      { t: '🪟 Ventanas', ej: [['from pyspark.sql import functions as F\nfrom pyspark.sql.window import Window\nw = Window.partitionBy("categoria_id").orderBy(F.desc("precio"))\nspark.table("productos").withColumn("puesto", F.row_number().over(w)).filter(F.col("puesto") <= 2).select("categoria_id", "nombre", "precio").show()', 'el top 2 de cada categoría']] },
      { t: '📅 Fechas', ej: [['from pyspark.sql import functions as F\nspark.table("pedidos").groupBy(F.date_format("fecha_pedido", "yyyy-MM").alias("mes")).count().orderBy("mes").show(5)', 'por mes']] },
      { t: '🧾 SQL dentro de Spark', ej: [['spark.table("pedidos").createOrReplaceTempView("p")\nspark.sql("SELECT canal, COUNT(*) AS n FROM p GROUP BY canal").show()', 'vista temporal + spark.sql']] },
    ],
    dbt: [
      { t: '🌱 Lo básico', ej: [["select *\nfrom {{ source('tienda', 'categorias') }}", 'leer una tabla cruda'], ["select pedido_id, canal\nfrom {{ ref('stg_pedidos') }}\nlimit 10", 'leer otro modelo']] },
      { t: '🧱 El patrón de CTEs', ej: [["with pedidos as (\n    select * from {{ ref('stg_pedidos') }}\n),\n\nfinal as (\n    select canal, count(*) as pedidos\n    from pedidos\n    group by canal\n)\n\nselect * from final", 'importar, transformar, final']] },
      { t: '⚙️ Configuración', ej: [["{{ config(materialized='table') }}\n\nselect * from {{ ref('stg_pedidos') }}", 'materializar como tabla'], ["{{ config(materialized='incremental', unique_key='pedido_id') }}\n\nselect * from {{ ref('stg_pedidos') }}\n{% if is_incremental() %}\nwhere fecha_pedido > (select max(fecha_pedido) from {{ this }})\n{% endif %}", 'incremental']] },
      { t: '🧩 Jinja', ej: [["{% set estados = ['entregado', 'cancelado', 'devuelto'] %}\n\nselect\n    canal,\n    {% for e in estados %}\n    sum(case when estado = '{{ e }}' then 1 else 0 end) as {{ e }}{% if not loop.last %},{% endif %}\n    {% endfor %}\nfrom {{ ref('stg_pedidos') }}\ngroup by canal", 'una columna por estado con un for'], ["select *\nfrom {{ ref('stg_pedidos') }}\nwhere fecha_pedido >= '{{ var(\"desde\", \"2024-12-01\") }}'", 'una variable con valor por defecto'], ["{% macro centavos(col) %}round({{ col }} * 100){% endmacro %}\n\nselect pago_id, {{ centavos('monto') }} as monto_centavos\nfrom {{ ref('stg_pagos') }}\nlimit 5", 'una macro']] },
    ],
    airflow: [
      { t: '🌱 El DAG mínimo', ej: [['from datetime import datetime\nfrom airflow.sdk import DAG\nfrom airflow.providers.standard.operators.empty import EmptyOperator\n\nwith DAG("mi_dag", start_date=datetime(2024, 1, 1), schedule="@daily", catchup=False) as dag:\n    inicio = EmptyOperator(task_id="inicio")\n    fin = EmptyOperator(task_id="fin")\n    inicio >> fin\n\ndag.test()', 'dos tareas en orden']] },
      { t: '🧰 Operadores', ej: [['from datetime import datetime\nfrom airflow.sdk import DAG\nfrom airflow.providers.standard.operators.bash import BashOperator\n\nwith DAG("bash_demo", start_date=datetime(2024, 1, 1), schedule=None) as dag:\n    BashOperator(task_id="saludar", bash_command="echo hola {{ ds }}")\n\ndag.test()', 'un comando de terminal'], ['from datetime import datetime\nfrom airflow.sdk import DAG\nfrom airflow.providers.standard.operators.python import PythonOperator\n\ndef calcular():\n    print("calculando")\n    return 42\n\nwith DAG("py_demo", start_date=datetime(2024, 1, 1), schedule=None) as dag:\n    PythonOperator(task_id="calcular", python_callable=calcular)\n\ndag.test()', 'una función de Python']] },
      { t: '🔀 Dependencias', ej: [['from datetime import datetime\nfrom airflow.sdk import DAG\nfrom airflow.providers.standard.operators.empty import EmptyOperator\n\nwith DAG("ramas", start_date=datetime(2024, 1, 1), schedule=None) as dag:\n    a, b, c, d = [EmptyOperator(task_id=x) for x in "abcd"]\n    a >> [b, c] >> d\n\ndag.test()', 'en paralelo y juntar']] },
      { t: '🎁 TaskFlow', ej: [['from datetime import datetime\nfrom airflow.sdk import dag, task\n\n@dag(start_date=datetime(2024, 1, 1), schedule=None)\ndef etl():\n    @task\n    def extraer():\n        return [1, 2, 3]\n\n    @task\n    def sumar(xs):\n        print("total:", sum(xs))\n\n    sumar(extraer())\n\netl().test()', '@dag y @task con datos entre tareas']] },
      { t: '🛡️ Producción', ej: [['from datetime import datetime, timedelta\nfrom airflow.sdk import DAG\nfrom airflow.providers.standard.operators.empty import EmptyOperator\n\ndef avisar(context):\n    print("falló", context["task_instance"].task_id)\n\nwith DAG("seguro", start_date=datetime(2024, 1, 1), schedule="0 3 * * *", catchup=False,\n         default_args={"retries": 2, "retry_delay": timedelta(minutes=5), "on_failure_callback": avisar}) as dag:\n    EmptyOperator(task_id="tarea")\n\ndag.test()', 'reintentos y aviso de fallo']] },
      { t: '⏰ Horarios (cron)', ej: [['# minuto hora día-del-mes mes día-de-la-semana\n# "0 3 * * *"    todos los días a las 03:00\n# "*/15 * * * *" cada 15 minutos\n# "0 9 * * 1-5"  de lunes a viernes a las 09:00\n# "0 0 1 * *"    el primer día de cada mes\nprint("crontab.guru sirve para probar expresiones")', 'leer un cron']] },
    ],
  };
  function chuleta(lab, alUsar, op = {}) {
    const el = document.createElement('div');
    el.className = 'exp-chuleta';
    const secs = CH[lab] || [];
    el.innerHTML = `<p class="small muted" style="margin-top:0">${op.reemplaza ? 'Haz clic en un ejemplo para <b>cargarlo en el editor y ejecutarlo</b>.' : 'Haz clic en un ejemplo para <b>pegarlo donde está el cursor</b> (tu código no se borra).'} Después cámbialo: es la mejor forma de entender qué hace cada parte.</p>` +
      secs.map((s, i) => `<details class="exp-sec" ${i === 0 ? 'open' : ''}><summary>${s.t}</summary><ul>${s.ej.map(([cod, d], j) => `<li><button type="button" class="exp-ej" data-i="${i}" data-j="${j}"><code>${esc(cod.split('\n').find((x) => x.trim() && !/^\s*(from|import)\b/.test(x)) || cod.split('\n')[0])}${cod.split('\n').length > 1 ? ' …' : ''}</code></button><span class="small muted">${esc(d)}</span></li>`).join('')}</ul></details>`).join('');
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) alUsar(secs[b.dataset.i].ej[b.dataset.j][0]); });
    return el;
  }
  // pega texto en el cursor del editor (CodeMirror o Monaco); si no hay editor rico, lo agrega al final
  function insertar(ed, texto) {
    try {
      if (ed.cm) { const cm = ed.cm; const pos = cm.getCursor(); const pre = pos.ch > 0 ? '\n' : ''; cm.replaceSelection(pre + texto + '\n'); cm.focus(); return; }
      if (ed.monaco) { const m = ed.monaco; const sel = m.getSelection(); m.executeEdits('chuleta', [{ range: sel, text: texto + '\n', forceMoveMarkers: true }]); m.focus(); return; }
    } catch (e) { /* cae al modo simple */ }
    const v = ed.getValue(); ed.setValue((v.trim() ? v.replace(/\s*$/, '\n\n') : '') + texto + '\n');
  }

  window.ExplicaCodigo = { pasosSQL, datosEnCadaPaso, panel, chuleta, explicar, insertar, cron, explicarErrorPy, explicarErrorSQL, CHULETAS: CH };
})();
