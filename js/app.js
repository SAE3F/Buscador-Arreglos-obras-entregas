// Ficha Escuelas · interfaz
(function () {
  var $ = U.$, $$ = U.$$, esc = U.esc, n = U.n, T = U.TIPOS;
  var TIPOS = ['E', 'O', 'A'];
  var anioActual = new Date().getFullYear();

  var S = {
    vista: 'buscador', inst: null,
    ficha: fichaNueva('E'),
    lista: { col: 'ultimo', dir: -1 },
    g: { tipos: new Set(TIPOS), anios: new Set(), cat: '', nivel: '', gestion: '', localidad: '', prov: '', medida: 'reg', rank: 'mas', calorN: 25 },
    r: { q: '', tipo: '', anio: '', cat: '', prov: '', fuente: '', col: 'orden', dir: -1, pag: 0 }
  };
  function fichaNueva(tab) {
    return { tab: tab || 'E', anio: '', mes: '', cat: '', prov: '', q: '', periodo: '', desde: '', hasta: '', orden: 'nuevo', sinFecha: true, escala: 'anio', anioMes: '' };
  }
  var MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  var MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  var IDX = { porInst: new Map(), provs: new Map() };   // índices que se arman cuando llegan los datos

  // ── fechas: los registros con solo año ("sin fecha exacta") entran por año si sinFecha está marcado
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function rangoPeriodo(p, desde, hasta) {
    var h = new Date(), y = h.getFullYear();
    if (p === 'mes') return [iso(new Date(y, h.getMonth(), 1)), iso(h)];
    if (p === '3m') return [iso(new Date(y, h.getMonth() - 3, h.getDate())), iso(h)];
    if (p === 'anio') return [y + '-01-01', y + '-12-31'];
    if (p === 'pasado') return [(y - 1) + '-01-01', (y - 1) + '-12-31'];
    if (p === 'pers' && (desde || hasta)) return [desde || '0000-01-01', hasta || '9999-12-31'];
    return null;
  }
  function enRango(r, rg, sinFecha) {
    if (!rg) return true;
    if (r.fecha) return r.fecha >= rg[0] && r.fecha <= rg[1];
    return !!(sinFecha && r.anio && String(r.anio) >= rg[0].slice(0, 4) && String(r.anio) <= rg[1].slice(0, 4));
  }
  var POR_PAGINA = 100;

  // ───────────────────────── helpers
  function valores(arr, fn) { var s = new Set(); arr.forEach(function (x) { var v = fn(x); if (v != null && v !== '') s.add(v); }); return Array.from(s); }
  function ordenEs(a, b) { return String(a).localeCompare(String(b), 'es', { numeric: true }); }
  function fechaReg(r) { return r.fecha ? U.fecha(r.fecha) : (r.anio || 's/f'); }
  function medida(r) { return S.g.medida === 'uni' ? (r.cant || 0) : 1; }
  function linkInst(id, texto) { return '<a data-inst="' + esc(id) + '">' + esc(texto || id) + '</a>'; }
  function botonIr(ref, texto) {
    if (!ref || !Datos.hojas[ref[0]]) return '';
    var t = 'Abrir ' + U.nombreHoja(ref[0]) + (ref[1] ? ' en la celda ' + U.celdaTexto(ref) : '');
    return '<button type="button" class="btn-ir' + (texto ? ' con-texto' : '') + '" data-ref="' + esc(ref.join('|')) + '" title="' + esc(t) + '" aria-label="' + esc(t) + '">↗' + (texto ? ' ' + esc(texto) : '') + '</button>';
  }
  function hayMontos() { return Datos.meta && Datos.meta.montos; }
  function etiquetaTipo(t) { return '<span class="tipo-cel tipo-' + t + '"><i class="marca-tipo"></i>' + T[t].uno + '</span>'; }
  function paraExcel(r) {
    var f = [T[r.t].uno, r.fecha ? U.fechaLarga(r.fecha) : '', r.anio || '', r.inst, r.I.nombre !== r.inst ? r.I.nombre : '', r.I.nivel || '', r.I.localidad || '',
      r.cat, r.det, r.cant, r.prov, r.serv, r.estado, r.fuente, U.celdaTexto(r.ref)];
    if (hayMontos()) f.push(r.monto == null ? '' : r.monto, r.fact || '');
    return f;
  }
  function colsExcel() {
    var c = [{ t: 'Tipo', ancho: 10 }, { t: 'Fecha', ancho: 11 }, { t: 'Año', ancho: 7 }, { t: 'Institución', ancho: 16 }, { t: 'Nombre en la base', ancho: 18 },
      { t: 'Nivel', ancho: 16 }, { t: 'Localidad', ancho: 16 }, { t: 'Categoría / rubro', ancho: 20 }, { t: 'Detalle', ancho: 55 }, { t: 'Cantidad', ancho: 9 },
      { t: 'Proveedor', ancho: 26 }, { t: 'Servicio / OC', ancho: 26 }, { t: 'Estado', ancho: 11 }, { t: 'Planilla', ancho: 22 }, { t: 'Celda', ancho: 9 }];
    if (hayMontos()) c.push({ t: 'Monto', ancho: 14 }, { t: 'N° factura', ancho: 12 });
    return c;
  }
  function hoy() { return new Date().toLocaleDateString('es-AR'); }
  function filtrosTexto() {
    var g = S.g, p = [];
    p.push(TIPOS.filter(function (t) { return g.tipos.has(t); }).map(function (t) { return T[t].nombre; }).join(', '));
    p.push(g.anios.size ? 'Años ' + Array.from(g.anios).sort().join(', ') : 'Todos los años');
    if (g.cat) p.push(g.cat); if (g.nivel) p.push(g.nivel); if (g.gestion) p.push(g.gestion); if (g.localidad) p.push(g.localidad); if (g.prov) p.push(g.prov);
    return p.join(' · ');
  }

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
    S.inst = id; S.ficha = fichaNueva('E');
    var i = Datos.inst.get(id); if (i && !i.E) S.ficha.tab = i.A ? 'A' : i.O ? 'O' : 'E';
    $('#q').value = ''; cerrarSug();
    irA('buscador', true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function pintar() {
    if (!Datos.listo) { esqueleto(); return; }
    $('#cuentaRegistros').textContent = n(Datos.regs.length);
    var nAv = Datos.avisos.length + institucionesFuera().length;   // los nombres ya unificados no cuentan
    $('#cuentaAvisos').textContent = nAv ? n(nAv) : '';
    if (S.vista === 'buscador') { pintarFicha(); pintarLista(); }
    if (S.vista === 'general') pintarGeneral();
    if (S.vista === 'registros') pintarRegistros();
    if (S.vista === 'calidad') pintarCalidad();
    $('#pie').textContent = 'Ficha Escuelas · Tres de Febrero · Entregas, obras y arreglos · versión ' + CONFIG.VERSION_PAGINA +
      (Datos.meta ? ' · script ' + Datos.meta.version : '');
  }
  function esqueleto() {
    $('#tablaInst').innerHTML = '<div style="padding:1rem">' + [1, 2, 3, 4, 5, 6].map(function () { return '<div class="esqueleto" style="height:34px;margin-bottom:8px"></div>'; }).join('') + '</div>';
  }

  // ───────────────────────── BUSCADOR
  var sugIdx = -1, sugLista = [];
  var CAMPOS_B = ['bNivel', 'bGestion', 'bLocalidad', 'bSolo', 'bOrden', 'bInactiva', 'bDesde', 'bHasta', 'bTieneModo', 'bTieneCat', 'bProv', 'bSinFecha'];
  var CLAVE_FILTROS = 'sae-entregas-filtros-buscador';
  function leerFiltrosB() {
    var f = {};
    CAMPOS_B.forEach(function (k) { var el = $('#' + k); f[k] = el.type === 'checkbox' ? el.checked : el.value; });
    return f;
  }
  function guardarFiltrosB() { try { localStorage.setItem(CLAVE_FILTROS, JSON.stringify(leerFiltrosB())); } catch (e) {} }
  function restaurarFiltrosB() {
    var f = null; try { f = JSON.parse(localStorage.getItem(CLAVE_FILTROS) || 'null'); } catch (e) {}
    if (!f) return;
    CAMPOS_B.forEach(function (k) {
      var el = $('#' + k); if (!el || f[k] == null) return;
      if (el.type === 'checkbox') el.checked = !!f[k];
      else if (el.tagName !== 'SELECT' || Array.prototype.some.call(el.options, function (o) { return o.value === String(f[k]); })) el.value = f[k];
      else el.dataset.pendiente = f[k];        // la opción todavía no existe (llega con los datos)
    });
  }
  function limpiarFiltrosB() {
    CAMPOS_B.forEach(function (k) { var el = $('#' + k); if (el.type === 'checkbox') el.checked = true; else el.value = ''; delete el.dataset.pendiente; });
    $('#bSolo').value = 'mov'; $('#bOrden').value = 'ultimo|-1'; $('#bTieneModo').value = 'tiene';
    S.lista = { col: 'ultimo', dir: -1 };
    guardarFiltrosB(); pintarLista();
  }
  function finDeMes(ym) { var p = ym.split('-'); return iso(new Date(+p[0], +p[1], 0)); }
  function filtroInstBuscador(i, f) {
    if (f.bNivel && i.nivel !== f.bNivel) return false;
    if (f.bGestion && i.gestion !== f.bGestion) return false;
    if (f.bLocalidad && i.localidad !== f.bLocalidad) return false;
    var tot = i.E + i.O + i.A;
    if (f.bSolo === 'mov' && !tot) return false;
    if (f.bSolo === 'sin' && tot) return false;
    if (f.bInactiva) {
      var h = new Date(), corte = iso(new Date(h.getFullYear(), h.getMonth() - Number(f.bInactiva), h.getDate()));
      var ult = i.ultimo ? i.ultimo.replace(/-00-00$/, '-12-31') : '';
      if (ult && ult >= corte) return false;
    }
    var regs = IDX.porInst.get(i.id) || [];
    if (f.bDesde || f.bHasta) {
      var rg = [f.bDesde ? f.bDesde + '-01' : '0000-01-01', f.bHasta ? finDeMes(f.bHasta) : '9999-12-31'];
      if (!regs.some(function (r) { return enRango(r, rg, f.bSinFecha); })) return false;
    }
    if (f.bTieneCat) {
      var tiene = regs.some(function (r) { return r.cat === f.bTieneCat; });
      if ((f.bTieneModo === 'nunca') === tiene) return false;
    }
    if (f.bProv && !regs.some(function (r) { return r.prov === f.bProv; })) return false;
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
        '<div class="det">' + esc([i.completo, i.direccion, i.nivel, i.localidad].filter(Boolean).join(' · ') || (i.enBase ? '' : 'No está en ESTABLECIMIENTOS')) + '</div></div>' +
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
    var q = U.norm($('#q').value), f = leerFiltrosB();
    var arr = Array.from(Datos.inst.values()).filter(function (i) { return filtroInstBuscador(i, f) && (!q || q.split(' ').every(function (p) { return i.busca.indexOf(p) >= 0; })); });
    arr.forEach(function (i) { i.total = i.E + i.O + i.A; });
    var col = S.lista.col, dir = S.lista.dir;
    arr.sort(function (a, b) {
      var va = a[col], vb = b[col];
      if (typeof va === 'number') return (va - vb) * dir || ordenEs(a.id, b.id);
      if (!va !== !vb) return va ? -1 : 1;           // sin fecha / vacío: siempre al final
      return ordenEs(va || '', vb || '') * dir || ordenEs(a.id, b.id);
    });
    var sel = col + '|' + dir; $('#bOrden').value = Array.prototype.some.call($('#bOrden').options, function (o) { return o.value === sel; }) ? sel : '';
    var nMas = ['bInactiva', 'bDesde', 'bHasta', 'bTieneCat', 'bProv'].filter(function (k) { return f[k]; }).length;
    $('#bMasCuenta').textContent = nMas ? nMas + ' activo' + (nMas > 1 ? 's' : '') : '';
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

    var cargoTxt = i.cargo ? ' (' + i.cargo.charAt(0).toUpperCase() + i.cargo.slice(1).toLowerCase() + ')' : '';
    var direcTxt = i.directora ? i.directora + cargoTxt : '';
    var etiq = [
      ['📍 Dirección', i.direccion, true],
      ['👤 Directora', direcTxt, true],
      ['🎓 Nivel', i.nivel],
      ['🏛️ Gestión', i.gestion],
      ['🗺️ Localidad', i.localidad],
      ['🔢 CUE', i.cue],
      ['👥 Matrícula / cupo SAE', i.matricula ? n(i.matricula) : ''],
      ['🍽️ Servicio SAE', i.servicio]
    ].filter(function (e) { return e[1]; }).map(function (e) {
      return '<span class="etiqueta' + (e[2] ? ' destacada' : '') + '">' + e[0] + ': <b>' + esc(e[1]) + '</b></span>';
    }).join('');
    var alias = (i.alias || []).length ? '<div class="chico muted" style="margin-top:.65rem">También aparece escrita como: ' + i.alias.map(esc).join(' · ') + '</div>' : '';

    var html = '<article class="card sec"><div class="card-body"><div class="ficha-cab"><div class="ficha-info">' +
      '<h2>🏫 ' + esc(i.id) + '</h2><div class="completo">' + esc(i.completo || (i.enBase ? '' : 'No está en la hoja ESTABLECIMIENTOS')) + '</div>' +
      '<div class="etiquetas">' + etiq + '</div>' + alias + '</div>' +
      '<div class="fila no-print">' + menuPlanillas(i, regs) + '<button class="btn btn-secondary btn-sm" id="fLink">🔗 Copiar link</button><button class="btn btn-secondary btn-sm" id="fExcel">⬇️ Excel</button>' +
      '<button class="btn btn-secondary btn-sm" id="fPrint">🖨️ Imprimir</button><button class="btn btn-secondary btn-sm" id="fCerrar" title="Volver a la lista">✕</button></div></div></div></article>';

    html += '<div class="kpis">' +
      kpi('E', '📦 Entregas', n(por.E.length), n(u) + ' unidades') +
      kpi('O', '🏗️ Obras', n(por.O.length), resumenCats(por.O)) +
      kpi('A', '🛠️ Arreglos', n(por.A.length), resumenCats(por.A)) +
      '<div class="kpi"><div class="et">🕒 Último movimiento</div><div class="val" style="font-size:1.25rem">' + (ult ? fechaReg(ult) : '—') + '</div><div class="sub">' +
      (ult ? esc(T[ult.t].uno + ' · ' + ult.cat) : 'Sin registros') + '</div></div>' +
      '<div class="kpi"><div class="et">📅 En ' + anioActual + '</div><div class="val">' + n(esteAnio) + '</div><div class="sub">registros este año</div></div></div>';

    html += '<div class="grilla g2"><article class="card"><div class="card-header"><div><h2>📈 Línea de tiempo</h2><p class="card-subtitle" id="fAnualSub"></p></div>' +
      '<div class="fila"><select id="fAnioMes" aria-label="Año a ver por mes" class="' + (S.ficha.escala === 'mes' ? '' : 'oculto') + '"></select>' +
      '<div class="pestanas chicas" id="fEscala" role="tablist"><button role="tab" data-e="anio" aria-selected="' + (S.ficha.escala === 'anio') + '">Por año</button>' +
      '<button role="tab" data-e="mes" aria-selected="' + (S.ficha.escala === 'mes') + '">Por mes</button></div></div></div>' +
      '<div class="card-body"><div class="graf" id="fAnual"></div></div></article>' +
      '<article class="card"><div class="card-header"><div><h2>🗂️ Qué recibió</h2><p class="card-subtitle">Por categoría o rubro (registros)</p></div></div><div class="card-body"><div id="fCats"></div></div></article></div>';

    html += '<article class="card"><div class="card-header"><div><h2>📋 Detalle</h2><p class="card-subtitle" id="fSub"></p></div>' +
      '<div class="pestanas chicas" id="fTabs" role="tablist">' + TIPOS.map(function (t) {
        return '<button role="tab" data-t="' + t + '" aria-selected="' + (S.ficha.tab === t) + '">' + T[t].icono + ' ' + T[t].nombre + ' <span class="cuenta">' + por[t].length + '</span></button>';
      }).join('') + '</div></div><div class="card-body"><div class="filtros" style="margin-bottom:.8rem">' +
      '<div class="campo ancho"><label for="fQ">Buscar en el detalle</label><input type="search" id="fQ" placeholder="ej. ventilador, termotanque" value="' + esc(S.ficha.q) + '"></div>' +
      '<div class="campo"><label for="fPeriodo">Período</label><select id="fPeriodo">' + [['', 'Todo'], ['mes', 'Este mes'], ['3m', 'Últimos 3 meses'], ['anio', 'Este año'], ['pasado', 'Año pasado'], ['pers', 'Elegir fechas…']].map(function (o) {
        return '<option value="' + o[0] + '"' + (S.ficha.periodo === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' +
      '<div class="campo' + (S.ficha.periodo === 'pers' ? '' : ' oculto') + '" id="fFechas"><label>Desde / hasta</label><div class="fila" style="gap:.3rem;flex-wrap:nowrap">' +
      '<input type="date" id="fDesde" value="' + esc(S.ficha.desde) + '" aria-label="Desde"><input type="date" id="fHasta" value="' + esc(S.ficha.hasta) + '" aria-label="Hasta"></div></div>' +
      '<div class="campo"><label for="fAnio">Año</label><select id="fAnio"></select></div>' +
      '<div class="campo"><label for="fMes">Mes</label><select id="fMes"></select></div>' +
      '<div class="campo"><label for="fCat">Categoría / rubro</label><select id="fCat"></select></div>' +
      '<div class="campo"><label for="fProv">Proveedor</label><select id="fProv"></select></div>' +
      '<div class="campo"><label for="fOrden">Ordenar</label><select id="fOrden">' + [['nuevo', 'Más nuevo primero'], ['viejo', 'Más viejo primero'], ['cant', 'Mayor cantidad']].map(function (o) {
        return '<option value="' + o[0] + '"' + (S.ficha.orden === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="fila" style="margin:-.2rem 0 .8rem;justify-content:space-between"><label class="check"><input type="checkbox" id="fSinFecha"' + (S.ficha.sinFecha ? ' checked' : '') +
      '> Incluir registros sin fecha exacta (solo año)</label><button type="button" class="btn btn-secondary btn-sm" id="fLimpiar">✖ Limpiar filtros</button></div>' +
      '<div class="tabla-caja alto-max" id="fTabla"></div></div></article>';
    cont.innerHTML = html;

    pintarLineaTiempo(i, regs, por);
    // Qué recibió
    var cats = new Map();
    regs.forEach(function (r) { var k = r.t + '|' + r.cat; var c = cats.get(k) || { t: r.t, cat: r.cat, reg: 0, cant: 0, ult: 0 }; c.reg++; c.cant += r.cant; c.ult = Math.max(c.ult, r.anio || 0); cats.set(k, c); });
    var citems = U.sinAlFinal(Array.from(cats.values()).sort(function (a, b) { return b.reg - a.reg; }), function (c) { return c.cat; }).map(function (c) {
      return { lab: U.icono(c.cat) + ' ' + esc(c.cat), titulo: T[c.t].uno + ' · ' + c.cat, total: c.reg, partes: [{ t: c.t, v: c.reg }],
        sub: (c.t === 'E' ? n(c.cant) + ' unidades · ' : '') + 'último: ' + (c.ult || 's/f'),
        onClick: function () { S.ficha.tab = c.t; S.ficha.cat = c.cat; pintarFicha(); $('#fTabla').scrollIntoView({ behavior: 'smooth', block: 'center' }); } };
    });
    G.barrasH($('#fCats'), citems, { vacio: 'Esta institución todavía no tiene registros' });

    $('#fLink').onclick = function () {
      var u = location.origin + location.pathname + '?vista=buscador&inst=' + encodeURIComponent(i.id);
      copiarTexto(u, '🔗 Link de ' + i.id + ' copiado');
    };
    $('#fPrint').onclick = function () { window.print(); };
    $('#fCerrar').onclick = function () { S.inst = null; guardarUrl(true); pintar(); };
    $('#fExcel').onclick = function () {
      exportarExcel('Ficha Escuelas - ' + i.id + ' - entregas obras arreglos', TIPOS.map(function (t) {
        return { nombre: T[t].nombre, titulo: i.id + ' · ' + T[t].nombre, subtitulo: (i.completo || '') + ' · descargado el ' + hoy(), columnas: colsExcel(), filas: por[t].map(paraExcel) };
      }));
    };
    $$('#fTabs button').forEach(function (b) { b.onclick = function () { S.ficha.tab = b.dataset.t; S.ficha.cat = ''; $$('#fTabs button').forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); }); pintarTablaFicha(regs); }; });
    $('#fQ').oninput = U.debounce(function () { S.ficha.q = $('#fQ').value; pintarTablaFicha(regs); }, 150);
    [['#fAnio', 'anio'], ['#fMes', 'mes'], ['#fCat', 'cat'], ['#fProv', 'prov'], ['#fOrden', 'orden'], ['#fDesde', 'desde'], ['#fHasta', 'hasta']].forEach(function (x) {
      $(x[0]).onchange = function () { S.ficha[x[1]] = this.value; pintarTablaFicha(regs); };
    });
    $('#fPeriodo').onchange = function () { S.ficha.periodo = this.value; $('#fFechas').classList.toggle('oculto', this.value !== 'pers'); pintarTablaFicha(regs); };
    $('#fSinFecha').onchange = function () { S.ficha.sinFecha = this.checked; pintarTablaFicha(regs); };
    $('#fLimpiar').onclick = function () { var t = S.ficha.tab, e = S.ficha.escala, am = S.ficha.anioMes; S.ficha = fichaNueva(t); S.ficha.escala = e; S.ficha.anioMes = am; pintarFicha(); };
    $('#fEscala').onclick = function (ev) { var b = ev.target.closest('[data-e]'); if (!b) return; S.ficha.escala = b.dataset.e; pintarFicha(); };
    $('#fAnioMes').onchange = function () { S.ficha.anioMes = this.value; pintarLineaTiempo(i, regs, por); };
    pintarTablaFicha(regs);
  }
  /** "📄 Ver en planillas": dónde aparece esta institución, con acceso directo a la primera fila de cada hoja */
  function menuPlanillas(i, regs) {
    var porHoja = new Map();
    regs.forEach(function (r) {
      if (!r.ref) return;
      var o = porHoja.get(r.ref[0]) || { n: 0, ref: r.ref, tipos: {} };
      o.n++; o.tipos[r.t] = 1; if (r.ref[1] < o.ref[1]) o.ref = r.ref; porHoja.set(r.ref[0], o);
    });
    var items = [];
    if (i.ref && i.ref[0] === 'ES') items.push(['ESTABLECIMIENTOS', 'Datos de la institución', i.ref]);
    ['EN', 'HI', 'UN', 'OB', 'IT'].forEach(function (h) {
      var o = porHoja.get(h); if (!o) return;
      items.push([U.nombreHoja(h), n(o.n) + ' ' + (o.n === 1 ? 'registro' : 'registros') + ' · ' + Object.keys(o.tipos).map(function (t) { return T[t].nombre.toLowerCase(); }).join(', '), o.ref]);
    });
    if (!items.length || !Object.keys(Datos.hojas).length) return '';
    return '<details class="menu-planillas"><summary class="btn btn-secondary btn-sm">📄 Ver en planillas</summary><div class="menu-caja">' +
      '<div class="chico muted" style="padding:.2rem .3rem .4rem">Abre la planilla en la primera fila de esta institución. Cada registro del detalle tiene su propio ↗.</div>' +
      items.map(function (x) { return '<div class="menu-item"><div><b>' + esc(x[0]) + '</b><div class="chico muted">' + esc(x[1]) + '</div></div>' + botonIr(x[2], 'Abrir') + '</div>'; }).join('') + '</div></details>';
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
    var F = S.ficha, t = F.tab, base = regs.filter(function (r) { return r.t === t; });
    U.opciones($('#fAnio'), valores(base, function (r) { return r.anio; }).sort().reverse(), 'Todos', F.anio);
    U.opciones($('#fMes'), MESES.map(function (m, k) { return [String(k + 1).padStart(2, '0'), m]; }), 'Todos', F.mes);
    U.opciones($('#fCat'), valores(base, function (r) { return r.cat; }).sort(U.ordenTexto), 'Todas', F.cat);
    U.opciones($('#fProv'), valores(base, function (r) { return r.prov; }).sort(U.ordenTexto), 'Todos', F.prov);
    $('#fProv').disabled = !$('#fProv').options[1];
    var q = U.norm(F.q), rg = rangoPeriodo(F.periodo, F.desde, F.hasta), sinF = 0;
    var rs = base.filter(function (r) {
      if (F.anio && String(r.anio) !== F.anio) return false;
      if (F.mes) { if (r.fecha) { if (r.fecha.slice(5, 7) !== F.mes) return false; } else if (!F.sinFecha) return false; }
      if (!enRango(r, rg, F.sinFecha)) return false;
      if (F.cat && r.cat !== F.cat) return false;
      if (F.prov && r.prov !== F.prov) return false;
      if (q && r.busca.indexOf(q) < 0) return false;
      if (!r.fecha && (F.mes || rg)) sinF++;
      return true;
    });
    if (F.orden === 'viejo') rs = rs.slice().reverse();
    else if (F.orden === 'cant') rs = rs.slice().sort(function (a, b) { return b.cant - a.cant || (a.orden < b.orden ? 1 : -1); });
    var u = rs.reduce(function (s, r) { return s + r.cant; }, 0);
    $('#fSub').textContent = n(rs.length) + ' ' + T[t].nombre.toLowerCase() + (t !== 'O' ? ' · ' + n(u) + ' unidades' : '') + (rs.length !== base.length ? ' (filtrado de ' + n(base.length) + ')' : '') +
      (sinF ? ' · ' + n(sinF) + ' sin fecha exacta incluidos por año' : '');
    $$('.kpi[data-kpi]').forEach(function (k) { k.onclick = function () { S.ficha.tab = k.dataset.kpi; S.ficha.cat = ''; S.ficha.prov = ''; pintarFicha(); $('#fTabla').scrollIntoView({ behavior: 'smooth', block: 'center' }); }; });
    $('#fTabla').innerHTML = rs.length ? tablaRegs(rs, false) : '<div class="vacio"><span class="grande">' + T[t].icono + '</span>No hay ' + T[t].nombre.toLowerCase() + ' con estos filtros</div>';
  }

  /** Línea de tiempo de la ficha: por año (todo) o por mes (un año; solo registros con fecha exacta) */
  function pintarLineaTiempo(i, regs, por) {
    var F = S.ficha;
    if (F.escala === 'mes') {
      var conFecha = regs.filter(function (r) { return r.fecha; });
      var anios = valores(conFecha, function (r) { return r.fecha.slice(0, 4); }).sort().reverse();
      if (!F.anioMes || anios.indexOf(F.anioMes) < 0) F.anioMes = anios[0] || String(anioActual);
      U.opciones($('#fAnioMes'), anios, anios.length ? '—' : 'Sin fechas', F.anioMes);
      $('#fAnioMes').classList.remove('oculto');
      var sinF = regs.filter(function (r) { return !r.fecha && String(r.anio) === F.anioMes; }).length;
      $('#fAnualSub').textContent = 'Registros por mes en ' + F.anioMes + (sinF ? ' · ' + n(sinF) + ' de ese año no tienen fecha exacta y no se muestran' : '') + '. Tocá un mes para filtrar';
      G.columnas($('#fAnual'), {
        cats: MESES_CORTOS, aria: 'Registros por mes de ' + i.id,
        series: TIPOS.map(function (t) { return { id: t, nombre: T[t].nombre, color: 'var(--c-' + t + ')', valores: MESES_CORTOS.map(function (_, k) {
          var mm = F.anioMes + '-' + String(k + 1).padStart(2, '0'); return por[t].filter(function (r) { return r.fecha && r.fecha.slice(0, 7) === mm; }).length; }) }; }),
        onClick: function (m, k) { S.ficha.anio = F.anioMes; S.ficha.mes = String(k + 1).padStart(2, '0'); pintarFicha(); U.toast(MESES[k] + ' ' + F.anioMes); $('#fTabla').scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      });
      return;
    }
    $('#fAnioMes').classList.add('oculto');
    $('#fAnualSub').textContent = 'Registros por año. Tocá un año para ver solo ese';
    var an = valores(regs, function (r) { return r.anio; }).sort();
    if (an.length) { var a0 = an[0], a1 = an[an.length - 1]; an = []; for (var a = a0; a <= a1; a++) an.push(a); }
    G.columnas($('#fAnual'), {
      cats: an, aria: 'Registros por año de ' + i.id,
      series: TIPOS.map(function (t) { return { id: t, nombre: T[t].nombre, color: 'var(--c-' + t + ')', valores: an.map(function (a) { return por[t].filter(function (r) { return r.anio === a; }).length; }) }; }),
      onClick: function (a) { S.ficha.anio = String(a); S.ficha.mes = ''; pintarFicha(); U.toast('Año ' + a); $('#fTabla').scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    });
  }

  /** Copiar al portapapeles con respaldo: API moderna → método viejo → cajita para copiar a mano */
  function copiarTexto(texto, ok) {
    function viejo() {
      var ta = document.createElement('textarea'); ta.value = texto; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;'; document.body.appendChild(ta); ta.select();
      var hecho = false; try { hecho = document.execCommand('copy'); } catch (e) {}
      ta.remove();
      if (hecho) U.toast(ok); else cajaCopiar(texto);
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(texto).then(function () { U.toast(ok); }, viejo);
    else viejo();
  }
  function cajaCopiar(texto) {
    var d = document.createElement('div'); d.className = 'caja-copiar';
    d.innerHTML = '<div class="card"><div class="card-body"><b>Copiá el link</b><p class="chico muted">El navegador no dejó copiarlo solo. Está seleccionado: apretá Ctrl+C.</p>' +
      '<input type="text" readonly value="' + esc(texto) + '" style="width:100%"><div class="fila" style="justify-content:flex-end;margin-top:.6rem"><button class="btn btn-primary btn-sm">Listo</button></div></div></div>';
    document.body.appendChild(d);
    var inp = d.querySelector('input'); inp.focus(); inp.select();
    d.querySelector('button').onclick = function () { d.remove(); };
    d.onclick = function (e) { if (e.target === d) d.remove(); };
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
    cols.push(['fuente', 'Planilla', 0, 140], ['ir', '', 0, 46]);
    var minimo = cols.reduce(function (s, c) { return s + (c[3] || 260); }, 0);
    function celda(clase, texto, html) { return '<td class="' + clase + '" title="' + esc(texto) + '">' + (html == null ? esc(texto) : html) + '</td>'; }
    return '<table class="tabla-fija" style="min-width:' + minimo + 'px"><colgroup>' + cols.map(function (c) { return '<col' + (c[3] ? ' style="width:' + c[3] + 'px"' : '') + '>'; }).join('') +
      '</colgroup><thead><tr>' + cols.map(function (c) {
      var o = orden && orden.col === c[0];
      return '<th class="' + (orden && c[0] !== 'ir' ? 'ord' : '') + (c[2] ? ' num' : '') + '" data-col="' + c[0] + '">' + c[1] + (o ? ' <span class="flecha">' + (orden.dir > 0 ? '▲' : '▼') + '</span>' : '') + '</th>';
    }).join('') + '</tr></thead><tbody>' + rs.map(function (r) {
      var detTitulo = r.det + (r.serv && r.t !== 'O' ? ' — ' + r.serv : '');
      return '<tr>' + (conInst ? celda('', T[r.t].uno, etiquetaTipo(r.t)) : '') + celda('fecha', String(fechaReg(r))) +
        (conInst ? celda('inst', r.inst, linkInst(r.inst)) : '') +
        celda('', r.cat, U.icono(r.cat) + '&nbsp;' + esc(r.cat)) + celda('', detTitulo, esc(r.det)) +
        celda('num', n(r.cant)) + celda('chico', r.prov) +
        (m ? celda('num', r.monto == null ? '' : '$ ' + n(r.monto)) + celda('chico', r.fact || '') : '') +
        celda('fuente', r.fuente) + '<td class="ir">' + botonIr(r.ref) + '</td></tr>';
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
    var sin = arr.filter(function (x) { return U.esSin(x.k); });
    arr = arr.filter(function (x) { return !U.esSin(x.k); });
    k = k - sin.length;
    if (arr.length > k) {
      var resto = arr.slice(k - 1), o = { k: nombreOtros || 'Otros', E: 0, O: 0, A: 0, total: 0, otros: resto.length };
      resto.forEach(function (x) { TIPOS.forEach(function (t) { o[t] += x[t]; }); o.total += x.total; });
      arr = arr.slice(0, k - 1).concat([o]);
    }
    return arr.concat(sin);                   // "Sin tipo" / "Sin dato" siempre al final
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
    U.opciones($('#gCat'), valores(base, function (r) { return r.cat; }).sort(U.ordenTexto).map(function (c) { return [c, U.icono(c) + ' ' + c]; }), 'Todas', g.cat);
    var insts = Array.from(Datos.inst.values());
    U.opciones($('#gNivel'), valores(insts, function (i) { return i.nivel; }).sort(U.ordenTexto), 'Todos', g.nivel);
    U.opciones($('#gGestion'), valores(insts, function (i) { return i.gestion; }).sort(U.ordenTexto), 'Todas', g.gestion);
    U.opciones($('#gLocalidad'), valores(insts, function (i) { return i.localidad; }).sort(U.ordenTexto), 'Todas', g.localidad);
    U.opciones($('#gProv'), valores(base, function (r) { return r.prov; }).sort(U.ordenTexto), 'Todos', g.prov);
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
      '<div class="kpi"><div class="et">🚚 Proveedores</div><div class="val">' + n(provs.size) + '</div><div class="sub">con facturación cargada</div></div>' +
      '<div class="kpi click" id="kSinNada"><div class="et">⚠️ Sin ningún registro</div><div class="val">' + n(sinNada.length) + '</div><div class="sub">de ' + n(baseInst.length) + ' en ESTABLECIMIENTOS · ver cuáles</div></div>';
    $('#kSinNada').onclick = function () { S.g.rank = 'sin'; S.g.rankTodas = false; pintarGeneral(); $('#gRank').scrollIntoView({ behavior: 'smooth', block: 'center' }); };

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

    // Ranking instituciones: Más · Menos (1 o más) · Sin registros (0)
    var porInst = agrupar(rs, function (r) { return r.inst; });
    var conAlgo = porInst.filter(function (o) { return o.total > 0; });
    var lista, titulo;
    if (g.rank === 'mas') {
      lista = conAlgo.sort(function (a, b) { return b.total - a.total || ordenEs(a.k, b.k); });
      titulo = 'Las que más ' + med + ' tienen';
    } else if (g.rank === 'menos') {
      lista = conAlgo.sort(function (a, b) { return a.total - b.total || ordenEs(a.k, b.k); });
      titulo = 'Las que menos ' + med + ' tienen (con 1 o más)';
    } else {
      lista = sinNada.slice().sort(function (a, b) { return ordenEs(a.id, b.id); }).map(function (i) { return { k: i.id, E: 0, O: 0, A: 0, total: 0 }; });
      titulo = 'Instituciones de ESTABLECIMIENTOS sin ningún registro con estos filtros';
    }
    S.rankLista = lista;
    var mostrar = g.rankTodas ? lista : lista.slice(0, 15);
    $('#gRankSub').textContent = titulo + ' · ' + (g.rankTodas || lista.length <= 15 ? n(lista.length) : '15 de ' + n(lista.length));
    $('#gRankModo').innerHTML = [['mas', 'Más'], ['menos', 'Menos'], ['sin', 'Sin registros <span class="cuenta">' + n(sinNada.length) + '</span>']].map(function (b) {
      return '<button role="tab" data-m="' + b[0] + '" aria-selected="' + (g.rank === b[0]) + '">' + b[1] + '</button>';
    }).join('');
    if (g.rank === 'sin') {
      $('#gRank').innerHTML = lista.length ? '<div class="tabla-caja' + (g.rankTodas ? ' alto-max' : '') + '"><table><thead><tr><th>Institución</th><th>Nivel</th><th>Localidad</th><th>Gestión</th></tr></thead><tbody>' +
        mostrar.map(function (o) { var i = Datos.inst.get(o.k) || {}; return '<tr><td class="inst">' + linkInst(o.k) + '</td><td>' + esc(i.nivel) + '</td><td>' + esc(i.localidad) + '</td><td>' + esc(i.gestion) + '</td></tr>'; }).join('') +
        '</tbody></table></div>' : '<div class="vacio"><span class="grande">✅</span>Todas tienen al menos un registro con estos filtros</div>';
    } else {
      var maxRank = Math.max.apply(null, lista.map(function (o) { return o.total; }).concat([1]));
      G.barrasH($('#gRank'), mostrar.map(function (o) {
        var i = Datos.inst.get(o.k) || {};
        return { lab: '<b>' + esc(o.k) + '</b>', titulo: o.k + (i.completo ? ' · ' + i.completo : ''), sub: [i.nivel, i.localidad].filter(Boolean).join(' · '), total: o.total, partes: partes(o),
          onClick: function () { abrirFicha(o.k); } };
      }), { max: maxRank });
      if (g.rankTodas) $('#gRank .barras-h').classList.add('alto-max');
    }
    $('#gRankPie').innerHTML = (lista.length > 15 ? '<button class="btn btn-secondary btn-sm" id="gRankTodas">' + (g.rankTodas ? '▴ Ver menos' : '▾ Ver todas (' + n(lista.length) + ')') + '</button>' : '') +
      (lista.length ? '<button class="btn btn-secondary btn-sm" id="gRankExcel">⬇️ Excel</button>' : '');
    if ($('#gRankTodas')) $('#gRankTodas').onclick = function () { g.rankTodas = !g.rankTodas; pintarGeneral(); };
    if ($('#gRankExcel')) $('#gRankExcel').onclick = function () {
      var nom = { mas: 'con más', menos: 'con menos', sin: 'sin registros' }[g.rank];
      exportarExcel('Ficha Escuelas - instituciones ' + nom, [{ nombre: 'Instituciones', titulo: 'Instituciones ' + nom + ' (' + med + ')', subtitulo: filtrosTexto() + ' · descargado el ' + hoy(),
        columnas: [{ t: 'Institución', ancho: 18 }, { t: 'Nombre completo', ancho: 40 }, { t: 'Nivel', ancho: 18 }, { t: 'Localidad', ancho: 18 }, { t: 'Gestión', ancho: 12 },
          { t: 'Entregas' }, { t: 'Obras' }, { t: 'Arreglos' }, { t: 'Total' }],
        filas: lista.map(function (o) { var i = Datos.inst.get(o.k) || {}; return [o.k, i.completo || '', i.nivel || '', i.localidad || '', i.gestion || '', o.E, o.O, o.A, o.total]; }) }]);
    };

    // Proveedores
    var pv = topConOtros(agrupar(rs, function (r) { return r.prov; }), 12);
    G.barrasH($('#gProvs'), pv.map(function (o) {
      var info = o.otros ? null : IDX.provs.get(o.k);
      return { lab: esc(o.k) + (o.otros ? ' (' + o.otros + ')' : '') + (info ? '<span class="lab-sub">' + esc(rubrosTexto(info, 2)) + '</span>' : ''), titulo: o.k, total: o.total, partes: partes(o), sub: med,
        tipHtml: info ? tipProveedor(o.k, info) : null,
        onClick: o.otros ? null : function () { mostrarProveedor(o.k); } };
    }), { vacio: 'Los registros filtrados no tienen proveedor (las obras y entregas de BASE DE DATOS no lo cargan)' });
    if (S.provAbierto && !IDX.provs.has(S.provAbierto)) S.provAbierto = null;
    pintarInfoProveedor();

    // Nivel y localidad
    var nv = U.sinAlFinal(agrupar(rs, function (r) { return r.I.nivel || 'Sin dato'; }).sort(function (a, b) { return b.total - a.total; }), function (o) { return o.k; });
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

  // ── Proveedores: qué hace cada uno, deducido de lo que tiene cargado
  function armarIndices() {
    IDX.porInst = new Map(); IDX.provs = new Map();
    Datos.regs.forEach(function (r) {
      var a = IDX.porInst.get(r.inst); if (!a) IDX.porInst.set(r.inst, a = []); a.push(r);
      if (!r.prov) return;
      var p = IDX.provs.get(r.prov);
      if (!p) IDX.provs.set(r.prov, p = { n: 0, rubros: new Map(), servicios: new Map(), insts: new Set(), anios: new Set(), tipos: {} });
      p.n++; p.rubros.set(r.cat, (p.rubros.get(r.cat) || 0) + 1); p.insts.add(r.inst); if (r.anio) p.anios.add(r.anio); p.tipos[r.t] = (p.tipos[r.t] || 0) + 1;
      var sv = String(r.serv || '').replace(/\s*·\s*ítem.*$/, ''); if (sv) p.servicios.set(sv, (p.servicios.get(sv) || 0) + 1);
    });
  }
  function ordenarMapa(m) { return U.sinAlFinal(Array.from(m.entries()).sort(function (a, b) { return b[1] - a[1]; }), function (e) { return e[0]; }); }
  function rubrosTexto(p, k) { return ordenarMapa(p.rubros).slice(0, k).map(function (e) { return U.icono(e[0]) + ' ' + e[0]; }).join(' · ') + (p.rubros.size > k ? ' · +' + (p.rubros.size - k) : ''); }
  function aniosTexto(p) { var a = Array.from(p.anios).sort(); return a.length ? (a[0] === a[a.length - 1] ? String(a[0]) : a[0] + '–' + a[a.length - 1]) : 's/f'; }
  function tipProveedor(nom, p) {
    return '<div class="t">' + esc(nom) + '</div><div class="chico muted" style="margin-bottom:.3rem">' + n(p.n) + ' registros · ' + n(p.insts.size) + ' instituciones · ' + aniosTexto(p) + '</div>' +
      ordenarMapa(p.rubros).slice(0, 6).map(function (e) { return '<div class="r"><span>' + U.icono(e[0]) + ' ' + esc(e[0]) + '</span><b>' + n(e[1]) + '</b></div>'; }).join('') +
      (p.servicios.size ? '<div class="chico muted" style="margin-top:.3rem">Contratos: ' + esc(ordenarMapa(p.servicios).slice(0, 3).map(function (e) { return e[0]; }).join(' · ')) + '</div>' : '') +
      '<div class="chico muted" style="margin-top:.25rem">Tocá para ver el resumen</div>';
  }
  function mostrarProveedor(nom) { S.provAbierto = S.provAbierto === nom ? null : nom; pintarInfoProveedor(); if (S.provAbierto) $('#gProvInfo').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  function pintarInfoProveedor() {
    var cont = $('#gProvInfo'), nom = S.provAbierto, p = nom && IDX.provs.get(nom);
    if (!p) { cont.innerHTML = ''; return; }
    var insts = Array.from(p.insts).map(function (id) { return [id, (IDX.porInst.get(id) || []).filter(function (r) { return r.prov === nom; }).length]; }).sort(function (a, b) { return b[1] - a[1]; });
    cont.innerHTML = '<div class="info-prov"><div class="fila" style="justify-content:space-between;align-items:flex-start"><div><b>🚚 ' + esc(nom) + '</b>' +
      '<div class="chico muted">' + n(p.n) + ' registros (' + TIPOS.filter(function (t) { return p.tipos[t]; }).map(function (t) { return T[t].nombre.toLowerCase() + ' ' + n(p.tipos[t]); }).join(', ') + ') · ' +
      n(p.insts.size) + ' instituciones · ' + aniosTexto(p) + '</div></div><button class="btn btn-secondary btn-sm" id="pCerrar" aria-label="Cerrar">✕</button></div>' +
      '<div class="etiquetas">' + ordenarMapa(p.rubros).map(function (e) { return '<span class="etiqueta">' + U.icono(e[0]) + ' ' + esc(e[0]) + ': <b>' + n(e[1]) + '</b></span>'; }).join('') + '</div>' +
      (p.servicios.size ? '<div class="chico" style="margin-top:.5rem"><b>Contratos / órdenes de compra:</b> ' + ordenarMapa(p.servicios).map(function (e) { return esc(e[0]) + ' (' + n(e[1]) + ')'; }).join(' · ') + '</div>' : '') +
      '<div class="chico" style="margin-top:.4rem"><b>Donde más trabajó:</b> ' + insts.slice(0, 8).map(function (x) { return linkInst(x[0]) + ' (' + x[1] + ')'; }).join(' · ') + (insts.length > 8 ? ' …' : '') + '</div>' +
      '<div class="fila" style="margin-top:.7rem"><button class="btn btn-primary btn-sm" id="pFiltrar">📊 Filtrar los gráficos</button><button class="btn btn-secondary btn-sm" id="pRegs">📋 Ver sus registros</button></div></div>';
    $('#pCerrar').onclick = function () { S.provAbierto = null; pintarInfoProveedor(); };
    $('#pFiltrar').onclick = function () { S.g.prov = nom; pintarGeneral(); U.toast('Filtrado: ' + nom); };
    $('#pRegs').onclick = function () { S.r = { q: '', tipo: '', anio: '', cat: '', prov: nom, fuente: '', col: 'orden', dir: -1, pag: 0 }; $('#rTexto').value = ''; irA('registros', true); };
  }

  function datosCalor(rs) {
    var catsT = U.sinAlFinal(agrupar(rs, function (r) { return r.cat; }).sort(function (a, b) { return b.total - a.total; }).map(function (o) { return o.k; }));
    var filas = agrupar(rs, function (r) { return r.inst; }).sort(function (a, b) { return b.total - a.total; }).slice(0, S.g.calorN);
    var celdas = new Map();
    rs.forEach(function (r) { var k = r.inst + '|' + r.cat; celdas.set(k, (celdas.get(k) || 0) + medida(r)); });
    return { cats: catsT, filas: filas, celdas: celdas };
  }
  function pintarCalor(rs) {
    var d = datosCalor(rs), dark = document.documentElement.classList.contains('dark');
    if (!d.filas.length) { $('#gCalor').innerHTML = '<div class="vacio"><span class="grande">📭</span>Sin datos para estos filtros</div>'; return; }
    var max = 0; d.celdas.forEach(function (v) { if (v > max) max = v; });
    $('#gCalor').innerHTML = '<table><thead><tr><th>Institución</th>' + d.cats.map(function (c) { return '<th class="rot" title="' + esc(c) + '"><span class="ico">' + U.icono(c) + '</span> ' + esc(c) + '</th>'; }).join('') +
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
      return (!r.tipo || x.t === r.tipo) && (!r.anio || String(x.anio) === r.anio) && (!r.cat || x.cat === r.cat) && (!r.prov || x.prov === r.prov) && (!r.fuente || x.fuente === r.fuente) &&
        (!partesQ.length || partesQ.every(function (p) { return x.busca.indexOf(p) >= 0; }));
    });
  }
  function pintarRegistros() {
    var r = S.r;
    U.opciones($('#rTipo'), TIPOS.map(function (t) { return [t, T[t].icono + ' ' + T[t].nombre]; }), 'Todos', r.tipo);
    var base = Datos.regs.filter(function (x) { return !r.tipo || x.t === r.tipo; });
    U.opciones($('#rAnio'), valores(Datos.regs, function (x) { return x.anio; }).sort().reverse(), 'Todos', r.anio);
    U.opciones($('#rCat'), valores(base, function (x) { return x.cat; }).sort(U.ordenTexto), 'Todas', r.cat);
    U.opciones($('#rFuente'), valores(Datos.regs, function (x) { return x.fuente; }).sort(), 'Todas', r.fuente);
    U.opciones($('#rProv'), valores(base, function (x) { return x.prov; }).sort(U.ordenTexto), 'Todos', r.prov);
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
    return Array.from(Datos.inst.values()).filter(function (i) { return !i.enBase && i.id !== 'SIN DATOS' && (i.E + i.O + i.A); });
  }
  var PROBLEMAS = [
    ['fuera', '🏫', 'No está en ESTABLECIMIENTOS', 'Tiene registros pero no figura en la base. Si falta, agregala en ESTABLECIMIENTOS; si es otra institución escrita distinto, se suma en ALIAS del Apps Script.'],
    ['sin_inst', '❓', 'Fila sin institución', 'El registro no dice a qué institución va, así que no aparece en ninguna ficha. Completá la celda.'],
    ['otra_inst', '🔀', 'El detalle nombra otra institución', 'La obra está cargada en una escuela pero el detalle menciona otra. Revisá cuál es la correcta.'],
    ['sin_datos', '🚫', 'Cargada como "SIN DATOS"', 'La institución figura como SIN DATOS. Si se sabe cuál es, reemplazalo.'],
    ['sin_tipo', '🏗️', 'Obra sin tipo', 'La obra no tiene "Tipo de Obra". En la página aparece como "Sin tipo".'],
    ['repetida', '📑', 'Repetida en ESTABLECIMIENTOS', 'La misma institución está dos veces en la base; la página usa la primera.'],
    ['alias', '✏️', 'Escrita de otra forma (ya unificada)', 'La página ya la junta con la correcta. No hace falta hacer nada; si querés dejarlo prolijo, corregí el nombre en la planilla.'],
    ['hoja', '❌', 'Hoja que no se pudo leer', 'Revisá que la hoja exista con ese nombre y que la cuenta del Apps Script tenga acceso.'],
    ['otros', '⚠️', 'Otros avisos', 'Avisos de una versión anterior del Apps Script.']
  ];
  function problemasCalidad() {
    var L = [];
    institucionesFuera().forEach(function (i) {
      L.push({ tipo: 'fuera', h: i.ref ? i.ref[0] : '', ref: i.ref, inst: i.id,
        texto: i.id + ' · ' + [i.E ? i.E + ' entregas' : '', i.O ? i.O + ' obras' : '', i.A ? i.A + ' arreglos' : ''].filter(Boolean).join(', ') +
          ((i.alias || []).length ? ' · escrita como: ' + i.alias.join(' / ') : '') });
    });
    Datos.inst.forEach(function (i) {
      (i.alias || []).forEach(function (a) {
        var ref = i.aliasRef && Array.isArray(i.aliasRef[a]) ? i.aliasRef[a] : null;
        L.push({ tipo: 'alias', h: ref ? ref[0] : '', ref: ref, inst: i.id, texto: '“' + a + '” se tomó como ' + i.id });
      });
    });
    Datos.avisos.forEach(function (a) {
      var t = a.tipo && PROBLEMAS.some(function (p) { return p[0] === a.tipo; }) ? a.tipo : 'otros';
      L.push({ tipo: t, h: a.h || '', hojaNom: a.hoja, fila: a.fila, ref: a.h && a.fila ? [a.h, a.fila, a.col || 1] : null, texto: a.texto });
    });
    return L;
  }
  function pintarCalidad() {
    var L = problemasCalidad();
    var hojas = valores(L, function (x) { return x.h; });
    if (S.calHoja && hojas.indexOf(S.calHoja) < 0) S.calHoja = '';
    var Lf = L.filter(function (x) { return !S.calHoja || x.h === S.calHoja; });
    var fuera = L.filter(function (x) { return x.tipo === 'fuera'; }).length, alias = L.filter(function (x) { return x.tipo === 'alias'; }).length;
    var html = '<div class="aviso" style="margin-bottom:1rem">🩺 <b>Qué es esto:</b> la lista de cosas que no cierran en las planillas, agrupadas por problema. ' +
      'La página <b>no corrige nada</b>: tocá <b>↗ Ir a la celda</b> para abrir la planilla justo donde hay que revisar. Cuando se corrige en la planilla, ' +
      'el aviso desaparece la próxima vez que tocás 🔄 Actualizar.</div>' +
      '<div class="kpis"><div class="kpi"><div class="et">🧾 Para revisar</div><div class="val">' + n(L.length - alias) + '</div><div class="sub">sin contar los nombres ya unificados</div></div>' +
      '<div class="kpi"><div class="et">🏫 Fuera de ESTABLECIMIENTOS</div><div class="val">' + n(fuera) + '</div><div class="sub">instituciones con registros</div></div>' +
      '<div class="kpi"><div class="et">✏️ Nombres unificados</div><div class="val">' + n(alias) + '</div><div class="sub">no hace falta hacer nada</div></div></div>';
    html += '<article class="card"><div class="card-header"><div><h2>🩺 Problemas por tipo</h2><p class="card-subtitle">' + n(Lf.length) + ' avisos' + (S.calHoja ? ' en ' + esc(U.nombreHoja(S.calHoja)) : '') + '</p></div>' +
      '<button class="btn btn-secondary btn-sm" id="cExcel">⬇️ Excel</button></div><div class="card-body">' +
      '<div class="campo" style="margin-bottom:.8rem"><label>Planilla</label><div class="chips" id="cHojas"><button class="chip" data-h="" aria-pressed="' + !S.calHoja + '">Todas</button>' +
      hojas.sort(function (a, b) { return ordenEs(U.nombreHoja(a), U.nombreHoja(b)); }).map(function (h) {
        return '<button class="chip" data-h="' + esc(h) + '" aria-pressed="' + (S.calHoja === h) + '">' + esc(U.nombreHoja(h)) + ' <span class="n">' + L.filter(function (x) { return x.h === h; }).length + '</span></button>';
      }).join('') + '</div></div>';
    var grupos = PROBLEMAS.map(function (p) { return { p: p, items: Lf.filter(function (x) { return x.tipo === p[0]; }) }; }).filter(function (g) { return g.items.length; });
    html += grupos.length ? grupos.map(function (g) {
      return '<details class="grupo-avisos"><summary><span>' + g.p[1] + ' ' + esc(g.p[2]) + '</span> <span class="pill sin">' + n(g.items.length) + '</span></summary>' +
        '<div class="chico muted" style="margin:0 0 .6rem">' + esc(g.p[3]) + '</div><div class="lista-avisos" style="padding-bottom:.8rem">' +
        g.items.slice(0, 500).map(function (x) {
          var donde = x.ref ? U.nombreHoja(x.ref[0]) + (x.ref[1] ? ' · celda ' + U.celdaTexto(x.ref) : '') : (x.hojaNom ? x.hojaNom + (x.fila ? ' · fila ' + x.fila : '') : '');
          var ir = x.ref && Datos.hojas[x.ref[0]];
          return '<div class="aviso-fila' + (ir ? ' click' : '') + '"' + (ir ? ' data-ref="' + esc(x.ref.join('|')) + '" role="button" tabindex="0" title="Abrir ' + esc(donde) + '"' : '') + '><div><div>' + esc(x.texto) + '</div>' +
            '<div class="chico muted">' + esc(donde) + (x.inst ? ' · <a class="ver-ficha" data-inst="' + esc(x.inst) + '">Ver ficha</a>' : '') + '</div></div>' +
            (ir ? '<span class="btn-ir con-texto" aria-hidden="true">↗ Ir a la celda</span>' : '') + '</div>';
        }).join('') + (g.items.length > 500 ? '<div class="chico muted">Se muestran 500 de ' + n(g.items.length) + '. Bajá el Excel para verlos todos.</div>' : '') + '</div></details>';
    }).join('') : '<div class="vacio"><span class="grande">✅</span>Sin problemas' + (S.calHoja ? ' en esta planilla' : '') + '</div>';
    html += '</div></article>';
    $('#calidad').innerHTML = html;
    $('#cHojas').onclick = function (e) { var b = e.target.closest('[data-h]'); if (b) { S.calHoja = b.dataset.h; pintarCalidad(); } };
    $('#cExcel').onclick = function () {
      exportarExcel('Ficha Escuelas - calidad de datos', [{ nombre: 'Para revisar', titulo: 'Calidad de datos · para revisar', subtitulo: (S.calHoja ? U.nombreHoja(S.calHoja) + ' · ' : '') + 'descargado el ' + hoy(),
        columnas: [{ t: 'Problema', ancho: 34 }, { t: 'Planilla', ancho: 26 }, { t: 'Celda', ancho: 9 }, { t: 'Detalle', ancho: 90 }],
        filas: U.sinAlFinal(PROBLEMAS.map(function (p) { return p; })).reduce(function (acc, p) {
          return acc.concat(Lf.filter(function (x) { return x.tipo === p[0]; }).map(function (x) { return [p[2], x.ref ? U.nombreHoja(x.ref[0]) : (x.hojaNom || ''), x.ref ? U.celdaTexto(x.ref) : (x.fila || ''), x.texto]; }));
        }, []) }]);
    };
  }

  // ───────────────────────── eventos
  function iniciar() {
    leerUrl();
    $$('#nav button').forEach(function (b) { b.onclick = function () { irA(b.dataset.vista, true); }; });
    // links a fichas desde cualquier tabla
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-inst]'); if (a) { e.preventDefault(); abrirFicha(a.dataset.inst); return; }
      var b = e.target.closest('[data-ref]');
      if (b) { e.preventDefault(); var p = b.dataset.ref.split('|'); U.abrirCelda([p[0], +p[1], +p[2]]); }
    });
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.aviso-fila[data-ref]')) { e.preventDefault(); e.target.click(); }
    });

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
    CAMPOS_B.forEach(function (k) { $('#' + k).addEventListener('change', function () { delete this.dataset.pendiente; if (k === 'bOrden' && this.value) { var p = this.value.split('|'); S.lista = { col: p[0], dir: +p[1] }; } guardarFiltrosB(); pintarLista(); }); });
    $('#bLimpiar').onclick = limpiarFiltrosB;
    restaurarFiltrosB();
    if ($('#bOrden').value) { var po = $('#bOrden').value.split('|'); S.lista = { col: po[0], dir: +po[1] }; }
    $('#btnExcelInst').onclick = function () {
      var arr = pintarLista.ultima || [];
      exportarExcel('Ficha Escuelas - instituciones', [{ nombre: 'Instituciones', titulo: 'Instituciones · entregas, obras y arreglos', subtitulo: 'Descargado el ' + hoy(),
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
    $('#gRankModo').addEventListener('click', function (e) { var b = e.target.closest('[data-m]'); if (b) { S.g.rank = b.dataset.m; S.g.rankTodas = false; pintarGeneral(); } });
    $('#gCalorN').addEventListener('change', function () { S.g.calorN = +this.value; pintarCalor(filtrarGeneral()); });
    $('#gLimpiar').onclick = function () { var m = S.g.medida; S.g = { tipos: new Set(TIPOS), anios: new Set(), cat: '', nivel: '', gestion: '', localidad: '', prov: '', medida: m, rank: 'mas', calorN: S.g.calorN }; pintarGeneral(); };
    $('#gCalorExcel').onclick = function () {
      var d = pintarCalor.ultimo; if (!d) return;
      exportarExcel('Ficha Escuelas - institucion x categoria', [{ nombre: 'Institución x categoría', titulo: 'Institución × categoría (' + (S.g.medida === 'uni' ? 'unidades' : 'registros') + ')',
        subtitulo: 'Descargado el ' + hoy(), columnas: [{ t: 'Institución', ancho: 18 }].concat(d.cats.map(function (c) { return { t: c, ancho: 12 }; }), [{ t: 'Total', ancho: 10 }]),
        filas: d.filas.map(function (f) { return [f.k].concat(d.cats.map(function (c) { return d.celdas.get(f.k + '|' + c) || 0; }), [f.total]); }) }]);
    };

    // Registros
    $('#rTexto').addEventListener('input', U.debounce(function () { S.r.q = this.value; S.r.pag = 0; pintarRegistros(); }, 200));
    [['#rTipo', 'tipo'], ['#rAnio', 'anio'], ['#rCat', 'cat'], ['#rProv', 'prov'], ['#rFuente', 'fuente']].forEach(function (p) {
      $(p[0]).addEventListener('change', function () { S.r[p[1]] = this.value; if (p[1] === 'tipo') S.r.cat = ''; S.r.pag = 0; pintarRegistros(); });
    });
    $('#rExcel').onclick = function () {
      var rs = pintarRegistros.ultimos || [];
      exportarExcel('Ficha Escuelas - registros', [{ nombre: 'Registros', titulo: 'Entregas, obras y arreglos', subtitulo: n(rs.length) + ' registros · descargado el ' + hoy(), columnas: colsExcel(), filas: rs.map(paraExcel) }]);
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
      U.opciones($('#bNivel'), valores(insts, function (i) { return i.nivel; }).sort(U.ordenTexto), 'Todos', $('#bNivel').value);
      U.opciones($('#bGestion'), valores(insts, function (i) { return i.gestion; }).sort(U.ordenTexto), 'Todas', $('#bGestion').value);
      U.opciones($('#bLocalidad'), valores(insts, function (i) { return i.localidad; }).sort(U.ordenTexto), 'Todas', $('#bLocalidad').value);
      U.opciones($('#bTieneCat'), valores(Datos.regs, function (r) { return r.cat; }).sort(U.ordenTexto).map(function (c) { return [c, U.icono(c) + ' ' + c]; }), 'Cualquiera', $('#bTieneCat').value);
      U.opciones($('#bProv'), valores(Datos.regs, function (r) { return r.prov; }).sort(U.ordenTexto), 'Todos', $('#bProv').value);
      ['bNivel', 'bGestion', 'bLocalidad', 'bTieneCat', 'bProv'].forEach(function (k) { var el = $('#' + k); if (el.dataset.pendiente) { el.value = el.dataset.pendiente; if (el.value === el.dataset.pendiente) delete el.dataset.pendiente; } });
      if (['bInactiva', 'bDesde', 'bHasta', 'bTieneCat', 'bProv'].some(function (k) { return $('#' + k).value; })) $('#bMas').open = true;
      armarIndices();
      pintar();
    });
    U.opciones($('#bNivel'), [], 'Todos'); U.opciones($('#bGestion'), [], 'Todas'); U.opciones($('#bLocalidad'), [], 'Todas');
    U.opciones($('#bTieneCat'), [], 'Cualquiera'); U.opciones($('#bProv'), [], 'Todos');
    irA(S.vista, false);
    Datos.cargar(false);
  }
  iniciar();
})();
