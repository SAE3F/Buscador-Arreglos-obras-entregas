// SAE Entregas · interfaz
(function () {
  var $ = U.$, $$ = U.$$, esc = U.esc, n = U.n, T = U.TIPOS;
  var TIPOS = ['E', 'O', 'A'];
  var anioActual = new Date().getFullYear();

  var S = {
    vista: 'buscador', inst: null,
    ficha: { tab: 'E', anio: '', cat: '', q: '' },
    lista: { col: 'total', dir: -1 },
    g: { tipos: new Set(TIPOS), anios: new Set(), cat: '', nivel: '', gestion: '', localidad: '', prov: '', medida: 'reg', rank: 'mas', calorN: 25 },
    r: { q: '', tipo: '', anio: '', cat: '', fuente: '', col: 'orden', dir: -1, pag: 0 }
  };
  var POR_PAGINA = 100;

  // ───────────────────────── helpers
  function valores(arr, fn) { var s = new Set(); arr.forEach(function (x) { var v = fn(x); if (v != null && v !== '') s.add(v); }); return Array.from(s); }
  function ordenEs(a, b) { return String(a).localeCompare(String(b), 'es', { numeric: true }); }
  function fechaReg(r) { return r.fecha ? U.fecha(r.fecha) : (r.anio || 's/f'); }
  function medida(r) { return S.g.medida === 'uni' ? (r.cant || 0) : 1; }
  function linkInst(id, texto) { return '<a data-inst="' + esc(id) + '">' + esc(texto || id) + '</a>'; }
  function hayMontos() { return Datos.meta && Datos.meta.montos; }
  function etiquetaTipo(t) { return '<span class="tipo-cel tipo-' + t + '"><i class="marca-tipo"></i>' + T[t].uno + '</span>'; }
  function paraExcel(r) {
    var f = [T[r.t].uno, r.fecha ? U.fechaLarga(r.fecha) : '', r.anio || '', r.inst, r.I.nombre !== r.inst ? r.I.nombre : '', r.I.nivel || '', r.I.localidad || '',
      r.cat, r.det, r.cant, r.prov, r.serv, r.estado, r.fuente];
    if (hayMontos()) f.push(r.monto == null ? '' : r.monto, r.fact || '');
    return f;
  }
  function colsExcel() {
    var c = [{ t: 'Tipo', ancho: 10 }, { t: 'Fecha', ancho: 11 }, { t: 'Año', ancho: 7 }, { t: 'Institución', ancho: 16 }, { t: 'Nombre en la base', ancho: 18 },
      { t: 'Nivel', ancho: 16 }, { t: 'Localidad', ancho: 16 }, { t: 'Categoría / rubro', ancho: 20 }, { t: 'Detalle', ancho: 55 }, { t: 'Cantidad', ancho: 9 },
      { t: 'Proveedor', ancho: 26 }, { t: 'Servicio / OC', ancho: 26 }, { t: 'Estado', ancho: 11 }, { t: 'Planilla', ancho: 22 }];
    if (hayMontos()) c.push({ t: 'Monto', ancho: 14 }, { t: 'N° factura', ancho: 12 });
    return c;
  }
  function hoy() { return new Date().toLocaleDateString('es-AR'); }

  // ───────────────────────── navegación
  function irA(vista, push) {
    S.vista = vista;
    $$('#nav button').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.vista === vista)); });
    $$('main > section').forEach(function (s) { s.classList.toggle('oculto', s.dataset.vista !== vista); });
    guardarUrl(push);
    pintar();
  }
  function guardarUrl(push) {
    var p = new URLSearchParams(location.search);
    p.set('vista', S.vista);
    if (S.vista === 'buscador' && S.inst) p.set('inst', S.inst); else p.delete('inst');
    var u = location.pathname + '?' + p.toString();
    try { (push ? history.pushState : history.replaceState).call(history, null, '', u); } catch (e) {}
  }
  function leerUrl() {
    var p = new URLSearchParams(location.search);
    var v = p.get('vista'); if (['buscador', 'general', 'registros', 'calidad'].indexOf(v) >= 0) S.vista = v;
    S.inst = p.get('inst') || null;
  }
  window.addEventListener('popstate', function () { leerUrl(); irA(S.vista, false); });

  function abrirFicha(id) {
    S.inst = id; S.ficha = { tab: 'E', anio: '', cat: '', q: '' };
    var i = Datos.inst.get(id); if (i && !i.E) S.ficha.tab = i.A ? 'A' : i.O ? 'O' : 'E';
    $('#q').value = ''; cerrarSug();
    irA('buscador', true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function pintar() {
    if (!Datos.listo) { esqueleto(); return; }
    $('#cuentaRegistros').textContent = n(Datos.regs.length);
    var nAv = Datos.avisos.length + institucionesFuera().length;
    $('#cuentaAvisos').textContent = nAv ? n(nAv) : '';
    if (S.vista === 'buscador') { pintarFicha(); pintarLista(); }
    if (S.vista === 'general') pintarGeneral();
    if (S.vista === 'registros') pintarRegistros();
    if (S.vista === 'calidad') pintarCalidad();
    $('#pie').textContent = 'SAE Tres de Febrero · Entregas, obras y arreglos · versión ' + CONFIG.VERSION_PAGINA +
      (Datos.meta ? ' · script ' + Datos.meta.version : '');
  }
  function esqueleto() {
    $('#tablaInst').innerHTML = '<div style="padding:1rem">' + [1, 2, 3, 4, 5, 6].map(function () { return '<div class="esqueleto" style="height:34px;margin-bottom:8px"></div>'; }).join('') + '</div>';
  }

  // ───────────────────────── BUSCADOR
  var sugIdx = -1, sugLista = [];
  function filtroInstBuscador(i) {
    var f = { nivel: $('#bNivel').value, gestion: $('#bGestion').value, loc: $('#bLocalidad').value, solo: $('#bSolo').value };
    if (f.nivel && i.nivel !== f.nivel) return false;
    if (f.gestion && i.gestion !== f.gestion) return false;
    if (f.loc && i.localidad !== f.loc) return false;
    var tot = i.E + i.O + i.A;
    if (f.solo === 'mov' && !tot) return false;
    if (f.solo === 'sin' && tot) return false;
    return true;
  }
  function buscarInst(q) {
    var t = U.norm(q); if (!t) return [];
    var partes = t.split(' ');
    var res = [];
    Datos.inst.forEach(function (i) {
      if (!partes.every(function (p) { return i.busca.indexOf(p) >= 0; })) return;
      var idn = U.norm(i.id), pts = idn === t ? 0 : idn.indexOf(t) === 0 ? 1 : i.busca.indexOf(t) === 0 ? 2 : 3;
      res.push({ i: i, pts: pts });
    });
    res.sort(function (a, b) { return a.pts - b.pts || (b.i.E + b.i.O + b.i.A) - (a.i.E + a.i.O + a.i.A) || ordenEs(a.i.id, b.i.id); });
    return res.slice(0, 12).map(function (x) { return x.i; });
  }
  function pintarSug() {
    var q = $('#q').value;
    sugLista = buscarInst(q); sugIdx = sugLista.length ? 0 : -1;
    var box = $('#sugerencias');
    if (!q.trim()) { cerrarSug(); return; }
    box.innerHTML = sugLista.length ? sugLista.map(function (i, k) {
      return '<div class="sug" role="option" data-id="' + esc(i.id) + '" aria-selected="' + (k === sugIdx) + '"><div><div class="nom">' + esc(i.id) + '</div>' +
        '<div class="det">' + esc([i.completo, i.nivel, i.localidad].filter(Boolean).join(' · ') || (i.enBase ? '' : 'No está en ESTABLECIMIENTOS')) + '</div></div>' +
        '<div class="cuentas"><span title="Entregas">📦 ' + i.E + '</span><span title="Obras">🏗️ ' + i.O + '</span><span title="Arreglos">🛠️ ' + i.A + '</span></div></div>';
    }).join('') : '<div class="vacio">No encontré instituciones con “' + esc(q) + '”</div>';
    box.classList.remove('oculto'); $('#q').setAttribute('aria-expanded', 'true');
    $$('.sug', box).forEach(function (el) { el.addEventListener('mousedown', function (e) { e.preventDefault(); abrirFicha(el.dataset.id); }); });
  }
  function cerrarSug() { $('#sugerencias').classList.add('oculto'); $('#q').setAttribute('aria-expanded', 'false'); }
  function moverSug(d) {
    if (!sugLista.length) return;
    sugIdx = (sugIdx + d + sugLista.length) % sugLista.length;
    $$('#sugerencias .sug').forEach(function (el, k) { el.setAttribute('aria-selected', String(k === sugIdx)); if (k === sugIdx) el.scrollIntoView({ block: 'nearest' }); });
  }

  function pintarLista() {
    var q = U.norm($('#q').value);
    var arr = Array.from(Datos.inst.values()).filter(function (i) { return filtroInstBuscador(i) && (!q || q.split(' ').every(function (p) { return i.busca.indexOf(p) >= 0; })); });
    arr.forEach(function (i) { i.total = i.E + i.O + i.A; });
    var col = S.lista.col, dir = S.lista.dir;
    arr.sort(function (a, b) {
      var va = a[col], vb = b[col];
      if (typeof va === 'number') return (va - vb) * dir || ordenEs(a.id, b.id);
      return ordenEs(va || '', vb || '') * dir;
    });
    $('#listaInstSub').textContent = n(arr.length) + ' instituciones · tocá una para ver su ficha';
    var cols = [['id', 'Institución'], ['nivel', 'Nivel'], ['localidad', 'Localidad'], ['E', 'Entregas', 1], ['uE', 'Unidades', 1], ['O', 'Obras', 1], ['A', 'Arreglos', 1], ['ultimo', 'Último']];
    var vis = arr.slice(0, 400);
    $('#tablaInst').innerHTML = arr.length ? '<table><thead><tr>' + cols.map(function (c) {
      return '<th class="ord' + (c[2] ? ' num' : '') + '" data-col="' + c[0] + '">' + c[1] + (col === c[0] ? ' <span class="flecha">' + (dir > 0 ? '▲' : '▼') + '</span>' : '') + '</th>';
    }).join('') + '</tr></thead><tbody>' + vis.map(function (i) {
      return '<tr><td class="inst">' + linkInst(i.id) + (i.enBase ? '' : ' <span title="No está en ESTABLECIMIENTOS">⚠️</span>') + '</td><td>' + esc(i.nivel) + '</td><td>' + esc(i.localidad) +
        '</td><td class="num">' + n(i.E) + '</td><td class="num">' + n(i.uE) + '</td><td class="num">' + n(i.O) + '</td><td class="num">' + n(i.A) +
        '</td><td class="fecha">' + (i.ultimo ? (i.ultimo.slice(5) === '00-00' ? i.ultimo.slice(0, 4) : U.fecha(i.ultimo)) : '—') + '</td></tr>';
    }).join('') + '</tbody></table>' + (arr.length > vis.length ? '<div class="vacio chico">Mostrando 400 de ' + n(arr.length) + '. Usá el buscador o los filtros para achicar la lista.</div>' : '')
      : '<div class="vacio"><span class="grande">🔍</span>No hay instituciones con esos filtros</div>';
    $$('#tablaInst th.ord').forEach(function (th) {
      th.addEventListener('click', function () {
        var c = th.dataset.col; if (S.lista.col === c) S.lista.dir *= -1; else { S.lista.col = c; S.lista.dir = /^(E|O|A|uE|total|ultimo)$/.test(c) ? -1 : 1; }
        pintarLista();
      });
    });
    pintarLista.ultima = arr;
  }

  function pintarFicha() {
    var cont = $('#ficha');
    var i = S.inst && Datos.inst.get(S.inst);
    $('#listaInst').classList.toggle('oculto', !!i);
    if (!i) {
      cont.innerHTML = S.inst ? '<div class="aviso naranja" style="margin-bottom:1rem">No encontré la institución “' + esc(S.inst) + '”. Buscala de nuevo arriba.</div>' : '';
      return;
    }
    var regs = Datos.regs.filter(function (r) { return r.inst === i.id; });
    var por = { E: [], O: [], A: [] }; regs.forEach(function (r) { por[r.t].push(r); });
    var u = por.E.reduce(function (s, r) { return s + r.cant; }, 0);
    var ult = regs[0];
    var esteAnio = regs.filter(function (r) { return r.anio === anioActual; }).length;

    var etiq = [['Nivel', i.nivel], ['Gestión', i.gestion], ['Localidad', i.localidad], ['CUE', i.cue], ['Matrícula / cupo SAE', i.matricula ? n(i.matricula) : ''], ['Servicio SAE', i.servicio]]
      .filter(function (e) { return e[1]; }).map(function (e) { return '<span class="etiqueta">' + e[0] + ': <b>' + esc(e[1]) + '</b></span>'; }).join('');
    var alias = (i.alias || []).length ? '<div class="chico muted" style="margin-top:.5rem">También aparece escrita como: ' + i.alias.map(esc).join(' · ') + '</div>' : '';

    var html = '<article class="card sec"><div class="card-body"><div class="ficha-cab"><div>' +
      '<h2>🏫 ' + esc(i.id) + '</h2><div class="completo">' + esc(i.completo || (i.enBase ? '' : 'No está en la hoja ESTABLECIMIENTOS')) + '</div>' +
      '<div class="etiquetas">' + etiq + '</div>' + alias + '</div>' +
      '<div class="fila no-print"><button class="btn btn-secondary btn-sm" id="fLink">🔗 Copiar link</button><button class="btn btn-secondary btn-sm" id="fExcel">⬇️ Excel</button>' +
      '<button class="btn btn-secondary btn-sm" id="fPrint">🖨️ Imprimir</button><button class="btn btn-secondary btn-sm" id="fCerrar" title="Volver a la lista">✕</button></div></div></div></article>';

    html += '<div class="kpis">' +
      kpi('E', '📦 Entregas', n(por.E.length), n(u) + ' unidades') +
      kpi('O', '🏗️ Obras', n(por.O.length), resumenCats(por.O)) +
      kpi('A', '🛠️ Arreglos', n(por.A.length), resumenCats(por.A)) +
      '<div class="kpi"><div class="et">🕒 Último movimiento</div><div class="val" style="font-size:1.25rem">' + (ult ? fechaReg(ult) : '—') + '</div><div class="sub">' +
      (ult ? esc(T[ult.t].uno + ' · ' + ult.cat) : 'Sin registros') + '</div></div>' +
      '<div class="kpi"><div class="et">📅 En ' + anioActual + '</div><div class="val">' + n(esteAnio) + '</div><div class="sub">registros este año</div></div></div>';

    html += '<div class="grilla g2"><article class="card"><div class="card-header"><div><h2>📈 Línea de tiempo</h2><p class="card-subtitle">Registros por año. Tocá un año para ver solo ese</p></div></div>' +
      '<div class="card-body"><div class="graf" id="fAnual"></div></div></article>' +
      '<article class="card"><div class="card-header"><div><h2>🗂️ Qué recibió</h2><p class="card-subtitle">Por categoría o rubro (registros)</p></div></div><div class="card-body"><div id="fCats"></div></div></article></div>';

    html += '<article class="card"><div class="card-header"><div><h2>📋 Detalle</h2><p class="card-subtitle" id="fSub"></p></div>' +
      '<div class="pestanas chicas" id="fTabs" role="tablist">' + TIPOS.map(function (t) {
        return '<button role="tab" data-t="' + t + '" aria-selected="' + (S.ficha.tab === t) + '">' + T[t].icono + ' ' + T[t].nombre + ' <span class="cuenta">' + por[t].length + '</span></button>';
      }).join('') + '</div></div><div class="card-body"><div class="filtros" style="margin-bottom:.8rem">' +
      '<div class="campo ancho"><label for="fQ">Buscar en el detalle</label><input type="search" id="fQ" placeholder="ej. ventilador, termotanque" value="' + esc(S.ficha.q) + '"></div>' +
      '<div class="campo"><label for="fAnio">Año</label><select id="fAnio"></select></div><div class="campo"><label for="fCat">Categoría / rubro</label><select id="fCat"></select></div></div>' +
      '<div class="tabla-caja alto-max" id="fTabla"></div></div></article>';
    cont.innerHTML = html;

    // Línea de tiempo
    var anios = valores(regs, function (r) { return r.anio; }).sort();
    if (anios.length) { var a0 = anios[0], a1 = Math.max(anios[anios.length - 1], a0); anios = []; for (var a = a0; a <= a1; a++) anios.push(a); }
    G.columnas($('#fAnual'), {
      cats: anios, aria: 'Registros por año de ' + i.id,
      series: TIPOS.map(function (t) { return { id: t, nombre: T[t].nombre, color: 'var(--c-' + t + ')', valores: anios.map(function (a) { return por[t].filter(function (r) { return r.anio === a; }).length; }) }; }),
      onClick: function (a) { S.ficha.anio = String(a); pintarTablaFicha(regs); U.toast('Año ' + a); $('#fTabla').scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    });
    // Qué recibió
    var cats = new Map();
    regs.forEach(function (r) { var k = r.t + '|' + r.cat; var c = cats.get(k) || { t: r.t, cat: r.cat, reg: 0, cant: 0, ult: 0 }; c.reg++; c.cant += r.cant; c.ult = Math.max(c.ult, r.anio || 0); cats.set(k, c); });
    var citems = Array.from(cats.values()).sort(function (a, b) { return b.reg - a.reg; }).map(function (c) {
      return { lab: U.icono(c.cat) + ' ' + esc(c.cat), titulo: T[c.t].uno + ' · ' + c.cat, total: c.reg, partes: [{ t: c.t, v: c.reg }],
        sub: (c.t === 'E' ? n(c.cant) + ' unidades · ' : '') + 'último: ' + (c.ult || 's/f'),
        onClick: function () { S.ficha.tab = c.t; S.ficha.cat = c.cat; pintarFicha(); $('#fTabla').scrollIntoView({ behavior: 'smooth', block: 'center' }); } };
    });
    G.barrasH($('#fCats'), citems, { vacio: 'Esta institución todavía no tiene registros' });

    $('#fLink').onclick = function () { navigator.clipboard && navigator.clipboard.writeText(location.href).then(function () { U.toast('🔗 Link copiado'); }); };
    $('#fPrint').onclick = function () { window.print(); };
    $('#fCerrar').onclick = function () { S.inst = null; guardarUrl(true); pintar(); };
    $('#fExcel').onclick = function () {
      exportarExcel('SAE ' + i.id + ' - entregas obras arreglos', TIPOS.map(function (t) {
        return { nombre: T[t].nombre, titulo: i.id + ' · ' + T[t].nombre, subtitulo: (i.completo || '') + ' · descargado el ' + hoy(), columnas: colsExcel(), filas: por[t].map(paraExcel) };
      }));
    };
    $$('#fTabs button').forEach(function (b) { b.onclick = function () { S.ficha.tab = b.dataset.t; S.ficha.cat = ''; $$('#fTabs button').forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); }); pintarTablaFicha(regs); }; });
    $('#fQ').oninput = U.debounce(function () { S.ficha.q = $('#fQ').value; pintarTablaFicha(regs); }, 150);
    $('#fAnio').onchange = function () { S.ficha.anio = this.value; pintarTablaFicha(regs); };
    $('#fCat').onchange = function () { S.ficha.cat = this.value; pintarTablaFicha(regs); };
    pintarTablaFicha(regs);
  }
  function kpi(t, et, val, sub) {
    return '<div class="kpi click tipo-' + t + '" data-kpi="' + t + '"><div class="et"><i class="marca-tipo"></i>' + et + '</div><div class="val">' + val + '</div><div class="sub">' + esc(sub) + '</div></div>';
  }
  function resumenCats(rs) {
    if (!rs.length) return 'Sin registros';
    var m = U.contar(rs, function (r) { return r.cat; });
    return Array.from(m.entries()).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 2).map(function (e) { return e[0] + ' ' + e[1]; }).join(' · ');
  }
  function pintarTablaFicha(regs) {
    var t = S.ficha.tab, base = regs.filter(function (r) { return r.t === t; });
    U.opciones($('#fAnio'), valores(base, function (r) { return r.anio; }).sort().reverse(), 'Todos los años', S.ficha.anio);
    U.opciones($('#fCat'), valores(base, function (r) { return r.cat; }).sort(ordenEs), 'Todas', S.ficha.cat);
    var q = U.norm(S.ficha.q);
    var rs = base.filter(function (r) {
      return (!S.ficha.anio || String(r.anio) === S.ficha.anio) && (!S.ficha.cat || r.cat === S.ficha.cat) && (!q || r.busca.indexOf(q) >= 0);
    });
    var u = rs.reduce(function (s, r) { return s + r.cant; }, 0);
    $('#fSub').textContent = n(rs.length) + ' ' + T[t].nombre.toLowerCase() + (t !== 'O' ? ' · ' + n(u) + ' unidades' : '') + (rs.length !== base.length ? ' (filtrado de ' + n(base.length) + ')' : '');
    $$('.kpi[data-kpi]').forEach(function (k) { k.onclick = function () { S.ficha.tab = k.dataset.kpi; S.ficha.cat = ''; pintarFicha(); $('#fTabla').scrollIntoView({ behavior: 'smooth', block: 'center' }); }; });
    $('#fTabla').innerHTML = rs.length ? tablaRegs(rs, false) : '<div class="vacio"><span class="grande">' + T[t].icono + '</span>No hay ' + T[t].nombre.toLowerCase() + ' con estos filtros</div>';
  }

  /** Tabla de registros (ficha y vista Registros) */
  function tablaRegs(rs, conInst, orden) {
    var m = hayMontos();
    // [clave, título, numérica, ancho en px (0 = el resto)] — anchos fijos: no cambian al filtrar
    var cols = [];
    if (conInst) cols.push(['t', 'Tipo', 0, 96]);
    cols.push(['orden', 'Fecha', 0, 84]);
    if (conInst) cols.push(['inst', 'Institución', 0, 150]);
    cols.push(['cat', 'Categoría', 0, 158], ['det', 'Detalle', 0, 0], ['cant', 'Cant.', 1, 64], ['prov', 'Proveedor', 0, 170]);
    if (m) cols.push(['monto', 'Monto', 1, 110], ['fact', 'Factura', 0, 90]);
    cols.push(['fuente', 'Planilla', 0, 140]);
    var minimo = cols.reduce(function (s, c) { return s + (c[3] || 260); }, 0);
    function celda(clase, texto, html) { return '<td class="' + clase + '" title="' + esc(texto) + '">' + (html == null ? esc(texto) : html) + '</td>'; }
    return '<table class="tabla-fija" style="min-width:' + minimo + 'px"><colgroup>' + cols.map(function (c) { return '<col' + (c[3] ? ' style="width:' + c[3] + 'px"' : '') + '>'; }).join('') +
      '</colgroup><thead><tr>' + cols.map(function (c) {
      var o = orden && orden.col === c[0];
      return '<th class="' + (orden ? 'ord' : '') + (c[2] ? ' num' : '') + '" data-col="' + c[0] + '">' + c[1] + (o ? ' <span class="flecha">' + (orden.dir > 0 ? '▲' : '▼') + '</span>' : '') + '</th>';
    }).join('') + '</tr></thead><tbody>' + rs.map(function (r) {
      var detTitulo = r.det + (r.serv && r.t !== 'O' ? ' — ' + r.serv : '');
      return '<tr>' + (conInst ? celda('', T[r.t].uno, etiquetaTipo(r.t)) : '') + celda('fecha', String(fechaReg(r))) +
        (conInst ? celda('inst', r.inst, linkInst(r.inst)) : '') +
        celda('', r.cat, U.icono(r.cat) + '&nbsp;' + esc(r.cat)) + celda('', detTitulo, esc(r.det)) +
        celda('num', n(r.cant)) + celda('chico', r.prov) +
        (m ? celda('num', r.monto == null ? '' : '$ ' + n(r.monto)) + celda('chico', r.fact || '') : '') +
        celda('fuente', r.fuente) + '</tr>';
    }).join('') + '</tbody></table>';
  }

  // ───────────────────────── VISTA GENERAL
  function instPasa(i) {
    var g = S.g;
    return (!g.nivel || i.nivel === g.nivel) && (!g.gestion || i.gestion === g.gestion) && (!g.localidad || i.localidad === g.localidad);
  }
  function filtrarGeneral() {
    var g = S.g;
    return Datos.regs.filter(function (r) {
      return g.tipos.has(r.t) && (!g.anios.size || g.anios.has(r.anio)) && (!g.cat || r.cat === g.cat) && (!g.prov || r.prov === g.prov) && instPasa(r.I);
    });
  }
  function agrupar(rs, clave) {
    var m = new Map();
    rs.forEach(function (r) {
      var k = clave(r); if (k == null || k === '') return;
      var o = m.get(k); if (!o) { o = { k: k, E: 0, O: 0, A: 0, total: 0 }; m.set(k, o); }
      var v = medida(r); o[r.t] += v; o.total += v;
    });
    return Array.from(m.values());
  }
  function partes(o) { return TIPOS.filter(function (t) { return S.g.tipos.has(t); }).map(function (t) { return { t: t, v: o[t] }; }); }
  function topConOtros(arr, k, nombreOtros) {
    arr.sort(function (a, b) { return b.total - a.total; });
    if (arr.length <= k) return arr;
    var resto = arr.slice(k - 1), o = { k: nombreOtros || 'Otros', E: 0, O: 0, A: 0, total: 0, otros: resto.length };
    resto.forEach(function (x) { TIPOS.forEach(function (t) { o[t] += x[t]; }); o.total += x.total; });
    return arr.slice(0, k - 1).concat([o]);
  }

  function pintarControlesGeneral() {
    var g = S.g;
    $('#gTipos').innerHTML = TIPOS.map(function (t) {
      return '<button class="chip tipo-' + t + '" data-t="' + t + '" aria-pressed="' + g.tipos.has(t) + '"><i class="marca" style="background:var(--c)"></i>' + T[t].icono + ' ' + T[t].nombre + '</button>';
    }).join('');
    var anios = valores(Datos.regs, function (r) { return r.anio; }).sort();
    $('#gAnios').innerHTML = '<button class="chip" data-a="" aria-pressed="' + !g.anios.size + '">Todos</button>' + anios.map(function (a) {
      return '<button class="chip" data-a="' + a + '" aria-pressed="' + g.anios.has(a) + '">' + a + '</button>';
    }).join('');
    var base = Datos.regs.filter(function (r) { return g.tipos.has(r.t); });
    U.opciones($('#gCat'), valores(base, function (r) { return r.cat; }).sort(ordenEs).map(function (c) { return [c, U.icono(c) + ' ' + c]; }), 'Todas', g.cat);
    var insts = Array.from(Datos.inst.values());
    U.opciones($('#gNivel'), valores(insts, function (i) { return i.nivel; }).sort(ordenEs), 'Todos', g.nivel);
    U.opciones($('#gGestion'), valores(insts, function (i) { return i.gestion; }).sort(ordenEs), 'Todas', g.gestion);
    U.opciones($('#gLocalidad'), valores(insts, function (i) { return i.localidad; }).sort(ordenEs), 'Todas', g.localidad);
    U.opciones($('#gProv'), valores(base, function (r) { return r.prov; }).sort(ordenEs), 'Todos', g.prov);
    $$('#gMedida button').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.m === g.medida)); });
    $$('#gRankModo button').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.m === g.rank)); });
  }

  function pintarGeneral() {
    pintarControlesGeneral();
    var g = S.g, rs = filtrarGeneral(), uni = g.medida === 'uni';
    var med = uni ? 'unidades' : 'registros';
    var totUni = rs.reduce(function (s, r) { return s + r.cant; }, 0);
    var instCon = new Set(rs.map(function (r) { return r.inst; }));
    var baseInst = Array.from(Datos.inst.values()).filter(function (i) { return i.enBase && instPasa(i); });
    var sinNada = baseInst.filter(function (i) { return !instCon.has(i.id); });
    var provs = new Set(rs.map(function (r) { return r.prov; }).filter(Boolean));
    var porT = { E: 0, O: 0, A: 0 }; rs.forEach(function (r) { porT[r.t]++; });
    $('#gKpis').innerHTML =
      '<div class="kpi"><div class="et">🧾 Registros</div><div class="val">' + n(rs.length) + '</div><div class="sub">' + TIPOS.filter(function (t) { return g.tipos.has(t); }).map(function (t) { return T[t].nombre + ' ' + n(porT[t]); }).join(' · ') + '</div></div>' +
      '<div class="kpi"><div class="et">📦 Unidades</div><div class="val">' + n(totUni) + '</div><div class="sub">sumando cantidades</div></div>' +
      '<div class="kpi"><div class="et">🏫 Instituciones alcanzadas</div><div class="val">' + n(instCon.size) + '</div><div class="sub">con al menos un registro</div></div>' +
      '<div class="kpi click" id="kSinNada"><div class="et">⚠️ Sin ningún registro</div><div class="val">' + n(sinNada.length) + '</div><div class="sub">de ' + n(baseInst.length) + ' en ESTABLECIMIENTOS · ver</div></div>' +
      '<div class="kpi"><div class="et">🚚 Proveedores</div><div class="val">' + n(provs.size) + '</div><div class="sub">con facturación cargada</div></div>';
    $('#kSinNada').onclick = function () { S.g.rank = 'menos'; pintarGeneral(); $('#gRank').scrollIntoView({ behavior: 'smooth', block: 'center' }); };

    // Evolución anual
    var anios = valores(rs, function (r) { return r.anio; }).sort();
    if (anios.length) { var a0 = anios[0], a1 = anios[anios.length - 1]; anios = []; for (var a = a0; a <= a1; a++) anios.push(a); }
    var porAnio = new Map(agrupar(rs, function (r) { return r.anio; }).map(function (o) { return [o.k, o]; }));
    G.columnas($('#gAnual'), {
      cats: anios, aria: 'Evolución por año',
      series: TIPOS.filter(function (t) { return g.tipos.has(t); }).map(function (t) { return { id: t, nombre: T[t].nombre, color: 'var(--c-' + t + ')', valores: anios.map(function (a) { var o = porAnio.get(a); return o ? o[t] : 0; }) }; }),
      onClick: function (a) { g.anios = new Set([a]); pintarGeneral(); U.toast('Filtrado: ' + a); }
    });

    // Categorías
    var cats = topConOtros(agrupar(rs, function (r) { return r.cat; }), 14, 'Otras');
    G.barrasH($('#gCats'), cats.map(function (o) {
      return { lab: (o.otros ? '' : U.icono(o.k) + ' ') + esc(o.k) + (o.otros ? ' (' + o.otros + ')' : ''), titulo: o.k, total: o.total, partes: partes(o), sub: med,
        onClick: o.otros ? null : function () { g.cat = o.k; pintarGeneral(); U.toast('Filtrado: ' + o.k); } };
    }));

    // Ranking instituciones
    var porInst = agrupar(rs, function (r) { return r.inst; });
    var lista;
    if (g.rank === 'mas') {
      lista = porInst.sort(function (a, b) { return b.total - a.total; }).slice(0, 15);
      $('#gRankSub').textContent = 'Las 15 que más ' + med + ' tienen';
    } else {
      var m = new Map(porInst.map(function (o) { return [o.k, o]; }));
      lista = baseInst.map(function (i) { return m.get(i.id) || { k: i.id, E: 0, O: 0, A: 0, total: 0 }; })
        .sort(function (a, b) { return a.total - b.total || ordenEs(a.k, b.k); }).slice(0, 15);
      $('#gRankSub').textContent = 'Las 15 de ESTABLECIMIENTOS con menos ' + med + ' (incluye las que tienen 0)';
    }
    var maxRank = g.rank === 'menos' ? Math.max.apply(null, porInst.map(function (o) { return o.total; }).concat([1])) : null;
    G.barrasH($('#gRank'), lista.map(function (o) {
      var i = Datos.inst.get(o.k) || {};
      return { lab: '<b>' + esc(o.k) + '</b>', titulo: o.k + (i.completo ? ' · ' + i.completo : ''), sub: [i.nivel, i.localidad].filter(Boolean).join(' · '), total: o.total, partes: partes(o),
        onClick: function () { abrirFicha(o.k); } };
    }), { max: maxRank });

    // Proveedores
    var pv = topConOtros(agrupar(rs, function (r) { return r.prov; }), 12);
    G.barrasH($('#gProvs'), pv.map(function (o) {
      return { lab: esc(o.k) + (o.otros ? ' (' + o.otros + ')' : ''), titulo: o.k, total: o.total, partes: partes(o), sub: med,
        onClick: o.otros ? null : function () { g.prov = o.k; pintarGeneral(); U.toast('Filtrado: ' + o.k); } };
    }), { vacio: 'Los registros filtrados no tienen proveedor (las obras y entregas de BASE DE DATOS no lo cargan)' });

    // Nivel y localidad
    var nv = agrupar(rs, function (r) { return r.I.nivel || 'Sin dato'; }).sort(function (a, b) { return b.total - a.total; });
    G.barrasH($('#gNiveles'), nv.map(function (o) {
      return { lab: esc(o.k), total: o.total, partes: partes(o), sub: med, onClick: o.k === 'Sin dato' ? null : function () { g.nivel = o.k; pintarGeneral(); } };
    }));
    var lc = topConOtros(agrupar(rs, function (r) { return r.I.localidad || 'Sin dato'; }), 16);
    G.barrasH($('#gLocs'), lc.map(function (o) {
      return { lab: esc(o.k) + (o.otros ? ' (' + o.otros + ')' : ''), total: o.total, partes: partes(o), sub: med,
        onClick: o.otros || o.k === 'Sin dato' ? null : function () { g.localidad = o.k; pintarGeneral(); } };
    }));

    pintarCalor(rs);
  }

  function datosCalor(rs) {
    var catsT = agrupar(rs, function (r) { return r.cat; }).sort(function (a, b) { return b.total - a.total; }).map(function (o) { return o.k; });
    var filas = agrupar(rs, function (r) { return r.inst; }).sort(function (a, b) { return b.total - a.total; }).slice(0, S.g.calorN);
    var celdas = new Map();
    rs.forEach(function (r) { var k = r.inst + '|' + r.cat; celdas.set(k, (celdas.get(k) || 0) + medida(r)); });
    return { cats: catsT, filas: filas, celdas: celdas };
  }
  function pintarCalor(rs) {
    var d = datosCalor(rs), dark = document.documentElement.classList.contains('dark');
    if (!d.filas.length) { $('#gCalor').innerHTML = '<div class="vacio"><span class="grande">📭</span>Sin datos para estos filtros</div>'; return; }
    var max = 0; d.celdas.forEach(function (v) { if (v > max) max = v; });
    $('#gCalor').innerHTML = '<table><thead><tr><th>Institución</th>' + d.cats.map(function (c) { return '<th class="rot" title="' + esc(c) + '">' + U.icono(c) + '<br>' + esc(c) + '</th>'; }).join('') +
      '<th class="num">Total</th></tr></thead><tbody>' + d.filas.map(function (f) {
        return '<tr><td class="inst">' + linkInst(f.k) + '</td>' + d.cats.map(function (c) {
          var v = d.celdas.get(f.k + '|' + c) || 0, s = G.secuencial(v / max), i = s.bg.match(/\d/);
          var claro = dark ? (i && +i[0] >= 5) : (i && +i[0] >= 4);
          return '<td class="c' + (v ? '' : ' cero') + '" style="background:' + s.bg + ';color:' + (v ? (claro ? (dark ? '#0f172a' : '#fff') : 'var(--text-primary)') : '') + '" title="' + esc(f.k + ' · ' + c + ': ' + n(v)) + '">' + (v ? n(v) : '·') + '</td>';
        }).join('') + '<td class="num"><b>' + n(f.total) + '</b></td></tr>';
      }).join('') + '</tbody></table>';
    pintarCalor.ultimo = d;
  }

  // ───────────────────────── REGISTROS
  function filtrarRegistros() {
    var r = S.r, q = U.norm(r.q), partesQ = q ? q.split(' ') : [];
    return Datos.regs.filter(function (x) {
      return (!r.tipo || x.t === r.tipo) && (!r.anio || String(x.anio) === r.anio) && (!r.cat || x.cat === r.cat) && (!r.fuente || x.fuente === r.fuente) &&
        (!partesQ.length || partesQ.every(function (p) { return x.busca.indexOf(p) >= 0; }));
    });
  }
  function pintarRegistros() {
    var r = S.r;
    U.opciones($('#rTipo'), TIPOS.map(function (t) { return [t, T[t].icono + ' ' + T[t].nombre]; }), 'Todos', r.tipo);
    var base = Datos.regs.filter(function (x) { return !r.tipo || x.t === r.tipo; });
    U.opciones($('#rAnio'), valores(Datos.regs, function (x) { return x.anio; }).sort().reverse(), 'Todos', r.anio);
    U.opciones($('#rCat'), valores(base, function (x) { return x.cat; }).sort(ordenEs), 'Todas', r.cat);
    U.opciones($('#rFuente'), valores(Datos.regs, function (x) { return x.fuente; }).sort(), 'Todas', r.fuente);
    var rs = filtrarRegistros();
    var col = r.col, dir = r.dir;
    rs.sort(function (a, b) {
      var va = col === 'inst' ? a.inst : a[col], vb = col === 'inst' ? b.inst : b[col];
      if (typeof va === 'number' || typeof vb === 'number') return ((va || 0) - (vb || 0)) * dir;
      return ordenEs(va || '', vb || '') * dir;
    });
    var u = rs.reduce(function (s, x) { return s + x.cant; }, 0);
    $('#rSub').textContent = n(rs.length) + ' registros · ' + n(u) + ' unidades' + (rs.length !== Datos.regs.length ? ' (de ' + n(Datos.regs.length) + ')' : '');
    var pags = Math.max(1, Math.ceil(rs.length / POR_PAGINA)); if (r.pag >= pags) r.pag = pags - 1;
    var vis = rs.slice(r.pag * POR_PAGINA, (r.pag + 1) * POR_PAGINA);
    $('#rTabla').innerHTML = vis.length ? tablaRegs(vis, true, { col: col, dir: dir }) : '<div class="vacio"><span class="grande">🔍</span>No hay registros con estos filtros</div>';
    $('#rPaginas').innerHTML = rs.length > POR_PAGINA ? '<span>Mostrando ' + n(r.pag * POR_PAGINA + 1) + '–' + n(r.pag * POR_PAGINA + vis.length) + ' de ' + n(rs.length) + '</span><span class="fila">' +
      '<button class="btn btn-secondary btn-sm" data-p="-1"' + (r.pag ? '' : ' disabled') + '>◀ Anterior</button><span>Página ' + (r.pag + 1) + ' de ' + pags + '</span>' +
      '<button class="btn btn-secondary btn-sm" data-p="1"' + (r.pag < pags - 1 ? '' : ' disabled') + '>Siguiente ▶</button></span>' : '';
    $$('#rPaginas button').forEach(function (b) { b.onclick = function () { r.pag += +b.dataset.p; pintarRegistros(); $('#rTabla').scrollIntoView({ block: 'start', behavior: 'smooth' }); }; });
    $$('#rTabla th.ord').forEach(function (th) {
      th.onclick = function () { var c = th.dataset.col; if (r.col === c) r.dir *= -1; else { r.col = c; r.dir = c === 'orden' || c === 'cant' ? -1 : 1; } r.pag = 0; pintarRegistros(); };
    });
    pintarRegistros.ultimos = rs;
  }

  // ───────────────────────── CALIDAD
  function institucionesFuera() {
    return Array.from(Datos.inst.values()).filter(function (i) { return !i.enBase && (i.E + i.O + i.A); });
  }
  function pintarCalidad() {
    var fuera = institucionesFuera().sort(function (a, b) { return (b.E + b.O + b.A) - (a.E + a.O + a.A); });
    var conAlias = Array.from(Datos.inst.values()).filter(function (i) { return (i.alias || []).length; });
    var grupos = new Map(); Datos.avisos.forEach(function (a) { var g = grupos.get(a.hoja) || []; g.push(a); grupos.set(a.hoja, g); });
    var html = '<div class="aviso" style="margin-bottom:1rem">🩺 Acá aparece lo que no cierra en las planillas. <b>La página no cambia nada:</b> sirve para que el equipo lo corrija en la planilla o, si es la misma institución escrita distinto, se agregue en <code>ALIAS</code> del Apps Script.</div>' +
      '<div class="kpis"><div class="kpi"><div class="et">🏫 Fuera de ESTABLECIMIENTOS</div><div class="val">' + n(fuera.length) + '</div><div class="sub">nombres con registros que no están en la base</div></div>' +
      '<div class="kpi"><div class="et">✏️ Nombres unificados</div><div class="val">' + n(conAlias.length) + '</div><div class="sub">instituciones escritas de más de una forma</div></div>' +
      '<div class="kpi"><div class="et">⚠️ Avisos</div><div class="val">' + n(Datos.avisos.length) + '</div><div class="sub">filas incompletas o raras</div></div></div>';
    html += '<article class="card"><div class="card-header"><div><h2>🏫 No están en ESTABLECIMIENTOS</h2><p class="card-subtitle">Pueden ser instituciones que faltan en la base o nombres mal escritos</p></div>' +
      '<button class="btn btn-secondary btn-sm" id="cExcel">⬇️ Excel con todo</button></div><div class="card-body"><div class="tabla-caja alto-max">' +
      (fuera.length ? '<table><thead><tr><th>Nombre</th><th class="num">Entregas</th><th class="num">Obras</th><th class="num">Arreglos</th><th>Escrita como</th></tr></thead><tbody>' + fuera.map(function (i) {
        return '<tr><td class="inst">' + linkInst(i.id) + '</td><td class="num">' + i.E + '</td><td class="num">' + i.O + '</td><td class="num">' + i.A + '</td><td class="chico">' + esc((i.alias || []).join(' · ')) + '</td></tr>';
      }).join('') + '</tbody></table>' : '<div class="vacio">✅ Todas las instituciones coinciden con la base</div>') + '</div></div></article>';
    html += '<article class="card"><div class="card-header"><div><h2>✏️ Nombres unificados</h2><p class="card-subtitle">Se juntaron solos porque son la misma institución escrita distinto</p></div></div><div class="card-body"><div class="tabla-caja alto-max">' +
      (conAlias.length ? '<table><thead><tr><th>Queda como</th><th>Aparecía como</th></tr></thead><tbody>' + conAlias.map(function (i) {
        return '<tr><td class="inst">' + linkInst(i.id) + '</td><td>' + i.alias.map(function (a) { return '<code>' + esc(a) + '</code>'; }).join(' ') + '</td></tr>';
      }).join('') + '</tbody></table>' : '<div class="vacio">Sin nombres para unificar</div>') + '</div></div></article>';
    html += '<article class="card"><div class="card-header"><div><h2>⚠️ Avisos por planilla</h2><p class="card-subtitle">Con el número de fila para encontrarla rápido</p></div></div><div class="card-body">' +
      (grupos.size ? Array.from(grupos.entries()).map(function (e) {
        return '<details class="grupo-avisos"><summary>' + esc(e[0]) + ' · ' + n(e[1].length) + '</summary><div class="lista-avisos" style="padding-bottom:.8rem">' +
          e[1].map(function (a) { return '<div class="aviso naranja">Fila <b>' + a.fila + '</b> · ' + esc(a.texto) + '</div>'; }).join('') + '</div></details>';
      }).join('') : '<div class="vacio">✅ Sin avisos</div>') + '</div></article>';
    $('#calidad').innerHTML = html;
    $('#cExcel').onclick = function () {
      exportarExcel('SAE Entregas - calidad de datos', [
        { nombre: 'Fuera de la base', titulo: 'Instituciones que no están en ESTABLECIMIENTOS', subtitulo: 'Descargado el ' + hoy(), columnas: [{ t: 'Nombre', ancho: 30 }, { t: 'Entregas' }, { t: 'Obras' }, { t: 'Arreglos' }, { t: 'Escrita como', ancho: 50 }],
          filas: fuera.map(function (i) { return [i.id, i.E, i.O, i.A, (i.alias || []).join(' · ')]; }) },
        { nombre: 'Nombres unificados', titulo: 'Nombres unificados', columnas: [{ t: 'Queda como', ancho: 30 }, { t: 'Aparecía como', ancho: 60 }], filas: conAlias.map(function (i) { return [i.id, i.alias.join(' · ')]; }) },
        { nombre: 'Avisos', titulo: 'Avisos por planilla', columnas: [{ t: 'Planilla', ancho: 26 }, { t: 'Fila', ancho: 8 }, { t: 'Aviso', ancho: 90 }], filas: Datos.avisos.map(function (a) { return [a.hoja, a.fila, a.texto]; }) }
      ]);
    };
  }

  // ───────────────────────── eventos
  function iniciar() {
    leerUrl();
    $$('#nav button').forEach(function (b) { b.onclick = function () { irA(b.dataset.vista, true); }; });
    // links a fichas desde cualquier tabla
    document.addEventListener('click', function (e) { var a = e.target.closest('[data-inst]'); if (a) { e.preventDefault(); abrirFicha(a.dataset.inst); } });

    var q = $('#q');
    q.addEventListener('input', U.debounce(function () { pintarSug(); pintarLista(); }, 120));
    q.addEventListener('focus', function () { if (q.value.trim()) pintarSug(); });
    q.addEventListener('blur', function () { setTimeout(cerrarSug, 150); });
    q.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); moverSug(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moverSug(-1); }
      else if (e.key === 'Enter') { if (sugIdx >= 0 && sugLista[sugIdx]) abrirFicha(sugLista[sugIdx].id); }
      else if (e.key === 'Escape') cerrarSug();
    });
    ['#bNivel', '#bGestion', '#bLocalidad', '#bSolo'].forEach(function (s) { $(s).addEventListener('change', function () { pintarLista(); }); });
    $('#btnExcelInst').onclick = function () {
      var arr = pintarLista.ultima || [];
      exportarExcel('SAE Entregas - instituciones', [{ nombre: 'Instituciones', titulo: 'Instituciones · entregas, obras y arreglos', subtitulo: 'Descargado el ' + hoy(),
        columnas: [{ t: 'Institución', ancho: 18 }, { t: 'Nombre completo', ancho: 40 }, { t: 'Nivel', ancho: 18 }, { t: 'Gestión', ancho: 12 }, { t: 'Localidad', ancho: 18 },
          { t: 'Entregas' }, { t: 'Unidades entregadas' }, { t: 'Obras' }, { t: 'Arreglos' }, { t: 'Último año', ancho: 10 }, { t: '¿En la base?', ancho: 11 }],
        filas: arr.map(function (i) { return [i.id, i.completo, i.nivel, i.gestion, i.localidad, i.E, i.uE, i.O, i.A, i.ultimoAnio || '', i.enBase ? 'Sí' : 'No']; }) }]);
    };

    // Vista general
    $('#gTipos').addEventListener('click', function (e) {
      var b = e.target.closest('[data-t]'); if (!b) return;
      var t = b.dataset.t; if (S.g.tipos.has(t)) { if (S.g.tipos.size > 1) S.g.tipos.delete(t); } else S.g.tipos.add(t);
      S.g.cat = ''; pintarGeneral();
    });
    $('#gAnios').addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      var a = b.dataset.a; if (!a) S.g.anios.clear(); else { a = +a; if (S.g.anios.has(a)) S.g.anios.delete(a); else S.g.anios.add(a); }
      pintarGeneral();
    });
    [['#gCat', 'cat'], ['#gNivel', 'nivel'], ['#gGestion', 'gestion'], ['#gLocalidad', 'localidad'], ['#gProv', 'prov']].forEach(function (p) {
      $(p[0]).addEventListener('change', function () { S.g[p[1]] = this.value; pintarGeneral(); });
    });
    $('#gMedida').addEventListener('click', function (e) { var b = e.target.closest('[data-m]'); if (b) { S.g.medida = b.dataset.m; pintarGeneral(); } });
    $('#gRankModo').addEventListener('click', function (e) { var b = e.target.closest('[data-m]'); if (b) { S.g.rank = b.dataset.m; pintarGeneral(); } });
    $('#gCalorN').addEventListener('change', function () { S.g.calorN = +this.value; pintarCalor(filtrarGeneral()); });
    $('#gLimpiar').onclick = function () { var m = S.g.medida; S.g = { tipos: new Set(TIPOS), anios: new Set(), cat: '', nivel: '', gestion: '', localidad: '', prov: '', medida: m, rank: 'mas', calorN: S.g.calorN }; pintarGeneral(); };
    $('#gCalorExcel').onclick = function () {
      var d = pintarCalor.ultimo; if (!d) return;
      exportarExcel('SAE Entregas - institucion x categoria', [{ nombre: 'Institución x categoría', titulo: 'Institución × categoría (' + (S.g.medida === 'uni' ? 'unidades' : 'registros') + ')',
        subtitulo: 'Descargado el ' + hoy(), columnas: [{ t: 'Institución', ancho: 18 }].concat(d.cats.map(function (c) { return { t: c, ancho: 12 }; }), [{ t: 'Total', ancho: 10 }]),
        filas: d.filas.map(function (f) { return [f.k].concat(d.cats.map(function (c) { return d.celdas.get(f.k + '|' + c) || 0; }), [f.total]); }) }]);
    };

    // Registros
    $('#rTexto').addEventListener('input', U.debounce(function () { S.r.q = this.value; S.r.pag = 0; pintarRegistros(); }, 200));
    [['#rTipo', 'tipo'], ['#rAnio', 'anio'], ['#rCat', 'cat'], ['#rFuente', 'fuente']].forEach(function (p) {
      $(p[0]).addEventListener('change', function () { S.r[p[1]] = this.value; if (p[1] === 'tipo') S.r.cat = ''; S.r.pag = 0; pintarRegistros(); });
    });
    $('#rExcel').onclick = function () {
      var rs = pintarRegistros.ultimos || [];
      exportarExcel('SAE Entregas - registros', [{ nombre: 'Registros', titulo: 'Entregas, obras y arreglos', subtitulo: n(rs.length) + ' registros · descargado el ' + hoy(), columnas: colsExcel(), filas: rs.map(paraExcel) }]);
    };

    // Encabezado
    $('#btnActualizar').onclick = function () { Datos.cargar(true); };
    var bm = $('#btnModo'), h = document.documentElement;
    function pintarModo() { var o = h.classList.contains('dark'); bm.textContent = o ? '☀️' : '🌙'; bm.setAttribute('aria-label', o ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'); }
    bm.onclick = function () { var o = h.classList.toggle('dark'); try { localStorage.setItem('modo-oscuro', o); } catch (e) {} pintarModo(); if (S.vista === 'general') pintarCalor(filtrarGeneral()); };
    pintarModo();

    window.addEventListener('resize', U.debounce(function () { if (Datos.listo && (S.vista === 'general' || S.inst)) pintar(); }, 250));

    // Selectores del buscador (se llenan cuando llegan los datos)
    Datos.alCambiar(function () {
      var insts = Array.from(Datos.inst.values());
      U.opciones($('#bNivel'), valores(insts, function (i) { return i.nivel; }).sort(ordenEs), 'Todos', $('#bNivel').value);
      U.opciones($('#bGestion'), valores(insts, function (i) { return i.gestion; }).sort(ordenEs), 'Todas', $('#bGestion').value);
      U.opciones($('#bLocalidad'), valores(insts, function (i) { return i.localidad; }).sort(ordenEs), 'Todas', $('#bLocalidad').value);
      pintar();
    });
    U.opciones($('#bNivel'), [], 'Todos'); U.opciones($('#bGestion'), [], 'Todas'); U.opciones($('#bLocalidad'), [], 'Todas');
    irA(S.vista, false);
    Datos.cargar(false);
  }
  iniciar();
})();
