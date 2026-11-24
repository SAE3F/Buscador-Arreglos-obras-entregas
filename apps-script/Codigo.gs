/**
 * SAE Entregas · Apps Script de SOLO LECTURA
 * Municipalidad de Tres de Febrero · equipo SAE
 *
 * Qué hace: abre las 3 planillas, junta entregas, obras y arreglos de cada institución,
 * corrige los nombres que vienen escritos distinto y devuelve todo en JSON para la página.
 * NO escribe, NO borra y NO modifica ninguna planilla.
 *
 * Cómo se publica (una sola vez): ver apps-script/PUBLICAR.md
 * Si cambiás este archivo: subí VERSION_SCRIPT y volvé a publicar
 * (Implementar → Administrar implementaciones → editar → Nueva versión).
 */

var VERSION_SCRIPT = '1.1.0';

// ─────────────────────────────── Planillas ───────────────────────────────
var PLANILLAS = {
  baseDatos:   '1HHI99Y8T2MAII1cFBRV8sJ1rhSOwoel42qt_KeDAFuw', // BASE DE DATOS
  tablero:     '1P57PeQ8WeLJbEovcGNKsT-4K_2AmCXpWF1W-MrwYShQ', // SAE | Tablero Gestión
  facturacion: '1mku6iQQSy2Vjfa51QhXJ_WUMphHIlT3yYvMdB3baiIc'  // Facturación SAE 2026
};

// cod: código corto que viaja en cada registro para poder abrir la planilla justo en esa celda
var HOJAS = {
  establecimientos: { planilla: 'baseDatos',   hoja: 'ESTABLECIMIENTOS',      cod: 'ES' },
  entregas:         { planilla: 'baseDatos',   hoja: 'ENTREGAS',              cod: 'EN' },
  obras:            { planilla: 'baseDatos',   hoja: 'OBRAS-INFRAESTRUCTURA', cod: 'OB' },
  historico:        { planilla: 'tablero',     hoja: 'HISTORICOENTREGAS',     cod: 'HI' },
  items:            { planilla: 'facturacion', hoja: 'FACTURACION ITEMS',     cod: 'IT' },
  unidades:         { planilla: 'facturacion', hoja: 'FACTURACION UNIDADES',  cod: 'UN' }
};

// Montos y N° de factura: se dejan preparados pero APAGADOS. Cuando el equipo decida
// mostrarlos, se pone en true y se vuelve a publicar (la página ya sabe leerlos).
var INCLUIR_MONTOS = false;

// Minutos que se guarda la respuesta armada (para que abra rápido). ?actualizar=1 la rehace.
var MINUTOS_CACHE = 10;

// Nombres escritos distinto en las planillas → nombre correcto. Se puede ampliar sin miedo.
// Los que no coinciden con ESTABLECIMIENTOS aparecen en la página, pestaña "Calidad de datos".
var ALIAS = {
  'EEE 501': 'EE 501',
  'ESS 15': 'EES 15',
  'EPI ESTRELLA DEL BELEN': 'EPI ESTRELLA DE BELEN'
};

// FACTURACION UNIDADES: qué hacer con cada servicio (se compara el principio del nombre).
// tipo E = entrega · A = arreglo/servicio · null = no va (servicio alimentario, viandas, etc.)
var SERVICIOS_UNIDADES = [
  { empieza: 'UTENSILIOS',   tipo: 'E', categoria: 'Utensilios' },
  { empieza: 'EQUIPAMIENTO', tipo: 'E', categoria: 'Equipamiento' },
  { empieza: 'ATMOSFERICO',  tipo: 'A', categoria: 'Atmosférico' },
  { empieza: 'CANALETAS',    tipo: 'A', categoria: 'Canaletas' }
];

// ─────────────────────────────── Web app ───────────────────────────────
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.accion === 'version') return json_({ ok: true, version: VERSION_SCRIPT });
  try {
    var datos = null;
    if (p.actualizar !== '1') datos = leerCache_();
    if (!datos) {
      datos = JSON.stringify(construirDatos(leerHojas_()));
      guardarCache_(datos);
    }
    return ContentService.createTextOutput(datos).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return json_({ ok: false, version: VERSION_SCRIPT, error: String(err && err.message || err) });
  }
}

/** Para probar desde el editor: Ejecutar → probar. Mirá el resultado en "Registro de ejecución". */
function probar() {
  var d = construirDatos(leerHojas_());
  Logger.log('Versión %s · %s registros · %s instituciones · %s avisos',
    d.version, d.registros.length, d.instituciones.length, d.avisos.length);
  Logger.log(JSON.stringify(d.resumen));
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function leerHojas_() {
  var abiertas = {}, out = { meta: {} };
  Object.keys(HOJAS).forEach(function (k) {
    var h = HOJAS[k];
    var ss = abiertas[h.planilla] || (abiertas[h.planilla] = SpreadsheetApp.openById(PLANILLAS[h.planilla]));
    var sh = ss.getSheetByName(h.hoja);
    out[k] = sh ? sh.getDataRange().getValues() : null;
    out.meta[h.cod] = { id: PLANILLAS[h.planilla], gid: sh ? sh.getSheetId() : null, hoja: h.hoja, planilla: ss.getName() };
  });
  out.zona = Session.getScriptTimeZone() || 'America/Argentina/Buenos_Aires';
  return out;
}

// Cache en trozos (Google limita cada valor a ~100 KB)
function guardarCache_(texto) {
  try {
    var c = CacheService.getScriptCache(), trozos = [], T = 90000;
    for (var i = 0; i < texto.length; i += T) trozos.push(texto.substring(i, i + T));
    var o = { 'sae_n': String(trozos.length), 'sae_v': VERSION_SCRIPT };
    trozos.forEach(function (t, i) { o['sae_' + i] = t; });
    c.putAll(o, MINUTOS_CACHE * 60);
  } catch (e) {}
}
function leerCache_() {
  try {
    var c = CacheService.getScriptCache(), n = Number(c.get('sae_n'));
    if (!n || c.get('sae_v') !== VERSION_SCRIPT) return null;
    var keys = []; for (var i = 0; i < n; i++) keys.push('sae_' + i);
    var all = c.getAll(keys), s = '';
    for (var j = 0; j < n; j++) { if (all['sae_' + j] == null) return null; s += all['sae_' + j]; }
    return s;
  } catch (e) { return null; }
}

// ─────────────────────────────── Armado de datos ───────────────────────────────
// Todo lo de abajo es "puro": recibe las tablas y devuelve el JSON. Así se puede probar fuera de Google.

/**
 * Registro (array, para que pese poco):
 * [0 tipo 'E'|'O'|'A', 1 año, 2 fecha 'AAAA-MM-DD' o '', 3 id institución, 4 categoría, 5 detalle,
 *  6 cantidad, 7 proveedor, 8 fuente, 9 servicio/OC, 10 estado, 11 monto (null si apagado), 12 factura (null),
 *  13 hoja (ES/EN/OB/HI/IT/UN), 14 fila, 15 columna]  ← celda de origen, para el botón ↗ de la página
 */
function construirDatos(h) {
  var zona = h.zona || 'America/Argentina/Buenos_Aires';
  var ctx = { inst: {}, avisos: [], zona: zona, registros: [], h: '' };

  ctx.h = 'ES'; cargarEstablecimientos_(h.establecimientos, ctx);
  [['entregas', 'EN', leerEntregas_], ['historico', 'HI', leerHistorico_], ['unidades', 'UN', leerUnidades_],
   ['obras', 'OB', leerObras_], ['items', 'IT', leerItems_]].forEach(function (x) {
    ctx.h = x[1];
    if (h[x[0]]) x[2](h[x[0]], ctx); else aviso_(ctx, 'hoja', 0, 0, 'No se pudo leer la hoja');
  });

  // Instituciones con movimientos (más las de la base aunque no tengan nada, para poder buscarlas)
  var lista = Object.keys(ctx.inst).map(function (id) {
    var i = ctx.inst[id];
    return { id: id, nombre: i.nombre, completo: i.completo || '', gestion: i.gestion || '', tipo: i.tipo || '',
      nivel: i.nivel || '', cue: i.cue || '', matricula: i.matricula || 0, servicio: i.servicio || '',
      localidad: i.localidad || '', enBase: !!i.enBase, ref: i.ref || null,
      alias: i.alias ? Object.keys(i.alias) : [], aliasRef: i.alias || {} };
  }).sort(function (a, b) { return a.id < b.id ? -1 : 1; });

  var res = { E: 0, O: 0, A: 0 };
  ctx.registros.forEach(function (r) { res[r[0]]++; });

  return {
    ok: true,
    version: VERSION_SCRIPT,
    generado: new Date().toISOString(),
    montos: INCLUIR_MONTOS,
    resumen: { entregas: res.E, obras: res.O, arreglos: res.A, instituciones: lista.length },
    hojas: h.meta || {},
    instituciones: lista,
    registros: ctx.registros,
    avisos: ctx.avisos.slice(0, 1500)
  };
}

// ── utilidades
function txt_(v) { return v == null ? '' : String(v).replace(/\s+/g, ' ').trim(); }
function sinAcentos_(s) { return s.normalize ? s.normalize('NFD').replace(/[̀-ͯ]/g, '') : s; }
function clave_(v) { return sinAcentos_(txt_(v)).toUpperCase(); }
function num_(v) {
  if (typeof v === 'number') return v;
  var s = txt_(v).replace(/\$/g, '').replace(/\./g, '').replace(',', '.');
  var n = parseFloat(s);
  return isNaN(n) ? null : n;
}
function titulo_(s) {
  s = txt_(s).toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
/** Aviso para la pestaña Calidad de datos. tipo: sin_inst | sin_tipo | otra_inst | repetida | sin_datos | hoja */
function aviso_(ctx, tipo, fila, col, texto) {
  var nom = ''; for (var k in HOJAS) if (HOJAS[k].cod === ctx.h) nom = HOJAS[k].hoja;
  ctx.avisos.push({ tipo: tipo, h: ctx.h, hoja: nom, fila: fila, col: col, texto: texto });
}

function pad2_(n) { n = String(Number(n)); return n.length < 2 ? '0' + n : n; }

/** Fecha → 'AAAA-MM-DD'. Acepta Date de Sheets o texto d/m/aaaa. */
function fecha_(v, zona) {
  if (v instanceof Date && !isNaN(v)) {
    if (typeof Utilities !== 'undefined') return Utilities.formatDate(v, zona, 'yyyy-MM-dd');
    return v.getFullYear() + '-' + pad2_(v.getMonth() + 1) + '-' + pad2_(v.getDate());
  }
  var m = txt_(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    var a = m[3].length === 2 ? '20' + m[3] : m[3];
    return a + '-' + pad2_(m[2]) + '-' + pad2_(m[1]);
  }
  return '';
}
function anio_(v, fecha) {
  var n = num_(v);
  if (n && n > 1990 && n < 2100) return Math.round(n);
  if (fecha) return Number(fecha.slice(0, 4));
  var m = txt_(v).match(/(20\d\d)/);
  return m ? Number(m[1]) : null;
}

/** Nombre de institución → id normalizado ("ep 8" → "EP 08", "SEC 2 (EES 02)" → "EES 02"). */
function idInst_(v) {
  var s = clave_(v);
  if (!s) return '';
  var par = s.match(/\(([^)]+)\)\s*$/);           // "SEC 2 (EES 02)" → "EES 02" (pero no "(ANEXO)")
  if (par && /\d/.test(par[1])) s = par[1].trim();
  s = s.replace(/\s*\(\s*ANEXO\s*\)/, ' (ANEXO)');
  if (ALIAS[s]) s = ALIAS[s];
  var m = s.match(/^(EP|EES|EE|JI|TEC|CFI|CEC|CENS|EEST|EST|EMMU|EMAC)\s*N?°?\s*0*(\d+)(.*)$/);
  if (m) {
    var num = (m[1] === 'EP' || m[1] === 'EES') ? pad2_(m[2]) : String(Number(m[2]));
    s = m[1] + ' ' + num + (m[3] ? ' ' + m[3].trim() : '');
    s = s.trim();
  }
  if (ALIAS[s]) s = ALIAS[s];
  return s;
}

/** fila y col (desde 1) = celda donde aparece el nombre, para poder ir a revisarla */
function inst_(ctx, nombre, fila, col) {
  var id = idInst_(nombre);
  if (!id) return '';
  var ref = [ctx.h, fila || 0, col || 0];
  var i = ctx.inst[id];
  if (!i) i = ctx.inst[id] = { nombre: txt_(nombre), alias: {} };
  if (!i.ref) i.ref = ref;
  var crudo = txt_(nombre);
  if (clave_(crudo) !== id && !i.alias[crudo]) i.alias[crudo] = ref;
  return id;
}

function cols_(cab, nombres, porDefecto) {
  var k = cab.map(clave_);
  for (var i = 0; i < nombres.length; i++) {
    var j = k.indexOf(clave_(nombres[i]));
    if (j >= 0) return j;
  }
  for (var x = 0; x < nombres.length; x++) {          // coincidencia parcial
    for (var y = 0; y < k.length; y++) if (k[y] && k[y].indexOf(clave_(nombres[x])) === 0) return y;
  }
  return porDefecto == null ? -1 : porDefecto;
}

/** [13] hoja, [14] fila, [15] columna: celda a la que lleva el botón ↗ de la página */
function reg_(ctx, r, fila, col) {
  if (!INCLUIR_MONTOS) { r[11] = null; r[12] = null; }
  r[13] = ctx.h; r[14] = fila; r[15] = col;
  ctx.registros.push(r);
}

// ── ESTABLECIMIENTOS (BASE DE DATOS)
function cargarEstablecimientos_(t, ctx) {
  if (!t || !t.length) { aviso_(ctx, 'hoja', 0, 0, 'No se pudo leer la hoja'); return; }
  var c = t[0];
  var C = {
    inst: cols_(c, ['INSTITUCION'], 0), comp: cols_(c, ['NOMBRE COMPLETO INSTITUCION'], 1),
    gest: cols_(c, ['GESTION'], 2), tipo: cols_(c, ['TIPO'], 3), nivel: cols_(c, ['NIVEL'], 4), cue: cols_(c, ['CUE'], 5),
    mat: cols_(c, ['MATRICULA / CUPO S.A.E', 'MATRICULA'], 9), serv: cols_(c, ['SERVICIO SAE'], 10),
    loc: cols_(c, ['LOCALIDAD'], 15)
  };
  for (var f = 1; f < t.length; f++) {
    var row = t[f];
    var nombre = txt_(row[C.inst]);
    if (!nombre) continue;
    var id = idInst_(nombre);
    var i = ctx.inst[id];
    if (i && i.enBase) { aviso_(ctx, 'repetida', f + 1, C.inst + 1, 'Institución repetida: ' + nombre); continue; }
    i = ctx.inst[id] = i || { alias: {} };
    i.nombre = nombre; i.enBase = true; i.ref = ['ES', f + 1, C.inst + 1];
    i.completo = txt_(row[C.comp]); i.gestion = txt_(row[C.gest]); i.tipo = txt_(row[C.tipo]);
    i.nivel = txt_(row[C.nivel]); i.cue = txt_(row[C.cue]); i.matricula = num_(row[C.mat]) || 0;
    i.servicio = txt_(row[C.serv]); i.localidad = txt_(row[C.loc]);
  }
}

// ── ENTREGAS (BASE DE DATOS)
var CAT_ENTREGAS = {
  'EQUIPO ELECTRICO': 'Equipos eléctricos', 'EQUIPO ELECTRONICO': 'Equipos eléctricos', 'EQUIPOS ELECTRICOS': 'Equipos eléctricos',
  'UTENSILLO': 'Utensilios', 'UTENSILIO': 'Utensilios', 'UTENSILIOS': 'Utensilios',
  'TEXTILES Y ORNEMENTOS': 'Textiles y ornamentos', 'TEXTILES Y ORNAMENTOS': 'Textiles y ornamentos',
  'MOBILIARIO': 'Mobiliario', 'MATERIAL ESCOLAR': 'Material escolar', 'MATERIAL DEPORTIVO': 'Material deportivo',
  'EQUIPAMIENTO': 'Equipamiento'
};
function catEntrega_(v) { var k = clave_(v); return CAT_ENTREGAS[k] || (k ? titulo_(v) : 'Sin categoría'); }

function leerEntregas_(t, ctx) {
  var c = t[0];
  var C = { fecha: cols_(c, ['Fecha_Entrega', 'FECHA'], 0), anio: cols_(c, ['AÑO', 'ANIO'], 1), inst: cols_(c, ['INSTITUCION'], 2),
    cat: cols_(c, ['Categoria'], 3), det: cols_(c, ['Descripcion_material', 'DESCRIPCION'], 4), cant: cols_(c, ['Cantidad'], 5),
    estado: cols_(c, ['Estado(entregado/planificado)', 'ESTADO'], 7) };
  for (var f = 1; f < t.length; f++) {
    var row = t[f];
    if (!txt_(row[C.inst]) && !txt_(row[C.det])) continue;
    var fecha = fecha_(row[C.fecha], ctx.zona);
    var id = inst_(ctx, row[C.inst], f + 1, C.inst + 1);
    if (!id) { aviso_(ctx, 'sin_inst', f + 1, C.inst + 1, 'Entrega sin institución: ' + txt_(row[C.det])); continue; }
    var est = titulo_(row[C.estado]) || 'Entregado';
    reg_(ctx, ['E', anio_(row[C.anio], fecha), fecha, id, catEntrega_(row[C.cat]), txt_(row[C.det]),
      num_(row[C.cant]) || 0, '', 'ENTREGAS', '', est], f + 1, C.det + 1);
  }
}

// ── HISTORICOENTREGAS (Tablero): matriz AÑO | TIPO | DETALLE | una columna por institución
function leerHistorico_(t, ctx) {
  var c = t[0];
  var ids = [];
  for (var j = 3; j < c.length; j++) ids[j] = txt_(c[j]) ? inst_(ctx, c[j], 1, j + 1) : '';
  for (var f = 1; f < t.length; f++) {
    var row = t[f];
    var anio = anio_(row[0]); var det = txt_(row[2]);
    if (!anio || !det) continue;
    var cat = catEntrega_(row[1]);
    for (var k = 3; k < row.length; k++) {
      if (!ids[k]) continue;
      var v = row[k];
      if (v === '' || v == null) continue;
      var n = num_(v);
      if (n === 0) continue;
      var detalle = det;
      if (n == null) { detalle = det + ' · ' + txt_(v); n = 1; }   // texto en vez de número
      reg_(ctx, ['E', anio, '', ids[k], cat, titulo_(detalle), n, '', 'HISTORICOENTREGAS', '', 'Entregado'], f + 1, k + 1);
    }
  }
}

// ── FACTURACION UNIDADES: utensilios y equipamiento (entregas) + atmosférico y canaletas (servicios)
function leerUnidades_(t, ctx) {
  var c = t[0];
  var C = { fecha: cols_(c, ['FECHA'], 0), serv: cols_(c, ['SERVICIO'], 1), det: cols_(c, ['DETALLE'], 2), prov: cols_(c, ['PROVEEDOR'], 3),
    oc: cols_(c, ['OC'], 5), cant: cols_(c, ['UNIDADES A FACTURAR'], 8), monto: cols_(c, ['MONTO'], 9),
    fact: cols_(c, ['N° FACTURA', 'N FACTURA'], 10), obs: cols_(c, ['OBSERVACIONES'], 12) };
  for (var f = 1; f < t.length; f++) {
    var row = t[f];
    var serv = clave_(row[C.serv]);
    if (!serv) continue;
    var regla = null;
    for (var s = 0; s < SERVICIOS_UNIDADES.length; s++) if (serv.indexOf(SERVICIOS_UNIDADES[s].empieza) === 0) { regla = SERVICIOS_UNIDADES[s]; break; }
    if (!regla) continue;                                    // servicio alimentario: no es entrega ni arreglo
    var cant = num_(row[C.cant]);
    if (!cant) continue;                                     // filas en 0 o vacías (ajustes)
    var destino = txt_(row[C.obs]);
    if (!destino) { aviso_(ctx, 'sin_inst', f + 1, C.obs + 1, 'Sin institución en OBSERVACIONES: ' + txt_(row[C.det])); continue; }
    var fecha = fecha_(row[C.fecha], ctx.zona);
    reg_(ctx, [regla.tipo, anio_(null, fecha) || anio_(row[C.serv]), fecha, inst_(ctx, destino, f + 1, C.obs + 1), regla.categoria,
      txt_(row[C.det]), cant, limpiarProv_(row[C.prov]), 'FACTURACION UNIDADES', txt_(row[C.serv]), 'Entregado',
      num_(row[C.monto]), txt_(row[C.fact])], f + 1, C.det + 1);
  }
}

// ── FACTURACION ITEMS: arreglos (gas, electricidad, plomería, refrigeración…)
function rubro_(serv) {
  var s = clave_(serv).replace(/^\d+\s*-\s*/, '').replace(/\b20\d\d\b/g, '').trim();
  var mapa = { 'GAS': 'Gas', 'ELECTRICIDAD': 'Electricidad', 'PLOMERIA': 'Plomería', 'REFRIGERACION': 'Refrigeración' };
  return mapa[s] || titulo_(s) || 'Sin rubro';
}
function limpiarProv_(v) { return txt_(v).replace(/^\d+\s*-\s*/, ''); }

function leerItems_(t, ctx) {
  var c = t[0];
  var C = { fecha: cols_(c, ['FECHA', 'Columna 1'], 0), serv: cols_(c, ['SERVICIO'], 1), prov: cols_(c, ['PROVEEDOR'], 2),
    oc: cols_(c, ['OC'], 4), item: cols_(c, ['N°ITEM', 'N° ITEM'], 5), det: cols_(c, ['DETALLE'], 6), cant: cols_(c, ['UNIDADES'], 7),
    monto: cols_(c, ['MONTO'], 8), fact: cols_(c, ['N° FACTURA'], 9), esc: cols_(c, ['ESCUELA'], 11) };
  for (var f = 1; f < t.length; f++) {
    var row = t[f];
    var esc = txt_(row[C.esc]), det = txt_(row[C.det]);
    if (!esc && !det) continue;
    if (!esc) { aviso_(ctx, 'sin_inst', f + 1, C.esc + 1, 'Arreglo sin escuela: ' + det); continue; }
    var fecha = fecha_(row[C.fecha], ctx.zona);
    reg_(ctx, ['A', anio_(null, fecha) || anio_(row[C.serv]), fecha, inst_(ctx, esc, f + 1, C.esc + 1), rubro_(row[C.serv]), det,
      num_(row[C.cant]) || 1, limpiarProv_(row[C.prov]), 'FACTURACION ITEMS', 'OC ' + txt_(row[C.oc]) + ' · ítem ' + txt_(row[C.item]),
      'Facturado', num_(row[C.monto]), txt_(row[C.fact])], f + 1, C.det + 1);
  }
}

// ── OBRAS-INFRAESTRUCTURA
function leerObras_(t, ctx) {
  var c = t[0];
  var C = { anio: cols_(c, ['Año'], 0), inst: cols_(c, ['INSTITUCION'], 1), tipo: cols_(c, ['Tipo de Obra'], 2),
    det: cols_(c, ['Detalle _obra', 'Detalle obra', 'DETALLE'], 3), cant: cols_(c, ['Cantidad'], 4) };
  for (var f = 1; f < t.length; f++) {
    var row = t[f];
    var nombre = txt_(row[C.inst]);
    if (!nombre) { if (txt_(row[C.det])) aviso_(ctx, 'sin_inst', f + 1, C.inst + 1, 'Obra sin institución: ' + txt_(row[C.det])); continue; }
    var anio = anio_(row[C.anio]);
    var id = inst_(ctx, nombre, f + 1, C.inst + 1);
    if (id === 'SIN DATOS') { aviso_(ctx, 'sin_datos', f + 1, C.inst + 1, 'Obra cargada con institución "SIN DATOS" (' + (anio || 's/a') + ')'); }
    var tipo = txt_(row[C.tipo]) ? titulo_(row[C.tipo]) : 'Sin tipo';
    if (tipo === 'Sin tipo') aviso_(ctx, 'sin_tipo', f + 1, C.tipo + 1, 'Obra sin tipo: ' + nombre + ' (' + (anio || 's/a') + ')');
    // "EP 07 | REFACCION DE COCINAS" → "Refacción de cocinas" (se saca el nombre de la escuela)
    var partes = txt_(row[C.det]).split('|').map(txt_).filter(String);
    var resto = [];
    partes.forEach(function (p) {
      var pid = idInst_(p);
      if (pid === id) return;
      if (/^(EP|EES|EE|JI|TEC|CFI|JM)\s*\d+$/.test(pid) && pid !== id) aviso_(ctx, 'otra_inst', f + 1, C.det + 1,
        'El detalle nombra otra institución (' + p + ') en una obra de ' + nombre);
      resto.push(p);
    });
    var det = resto.join(' · ');
    if (det && det === det.toUpperCase()) det = titulo_(det);
    reg_(ctx, ['O', anio, '', id, tipo, det || tipo, num_(row[C.cant]) || 1, '', 'OBRAS-INFRAESTRUCTURA', '', 'Realizada'], f + 1, C.det + 1);
  }
}

// Para poder probarlo fuera de Google (node)
if (typeof module !== 'undefined') module.exports = { construirDatos: construirDatos, idInst_: idInst_, VERSION_SCRIPT: VERSION_SCRIPT };
