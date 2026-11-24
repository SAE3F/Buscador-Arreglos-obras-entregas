// Utilidades chicas compartidas
(function () {
  var U = {};
  U.$ = function (s, r) { return (r || document).querySelector(s); };
  U.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  U.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); };
  U.n = function (x) { return (Number(x) || 0).toLocaleString('es-AR'); };
  U.norm = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); };
  U.fecha = function (iso) { if (!iso) return ''; var p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0].slice(2); };
  U.fechaLarga = function (iso) { if (!iso) return ''; var p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
  U.TIPOS = { E: { nombre: 'Entregas', uno: 'Entrega', icono: '📦' }, O: { nombre: 'Obras', uno: 'Obra', icono: '🏗️' }, A: { nombre: 'Arreglos', uno: 'Arreglo', icono: '🛠️' } };
  U.ICONOS_CAT = {
    'Utensilios': '🥣', 'Equipamiento': '🍳', 'Equipos eléctricos': '🔌', 'Mobiliario': '🪑', 'Material escolar': '📚',
    'Material deportivo': '⚽', 'Textiles y ornamentos': '🎌', 'Gas': '🔥', 'Electricidad': '⚡', 'Plomería': '🚰',
    'Refrigeración': '❄️', 'Atmosférico': '🚛', 'Canaletas': '🌧️', 'Puesta en valor': '🏗️', 'Cubiertas': '🏠', 'Mantenimiento': '🔧',
    'Pintura': '🎨', 'Entornos escolares': '🌳', 'Aulas': '🏫', 'Sin tipo': '❔'
  };
  U.icono = function (c) { return U.ICONOS_CAT[c] || '•'; };
  U.toast = function (t) {
    var d = document.createElement('div'); d.className = 'toast'; d.textContent = t;
    U.$('#toasts').appendChild(d); setTimeout(function () { d.remove(); }, 2800);
  };
  U.debounce = function (f, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { f.apply(s, a); }, ms); }; };
  U.contar = function (arr, fn) { var m = new Map(); arr.forEach(function (x) { var k = fn(x); if (k == null || k === '') return; m.set(k, (m.get(k) || 0) + 1); }); return m; };
  U.opciones = function (sel, valores, todos, actual) {
    sel.innerHTML = '<option value="">' + U.esc(todos) + '</option>' + valores.map(function (v) {
      var val = Array.isArray(v) ? v[0] : v, lab = Array.isArray(v) ? v[1] : v;
      return '<option value="' + U.esc(val) + '"' + (String(val) === String(actual) ? ' selected' : '') + '>' + U.esc(lab) + '</option>';
    }).join('');
  };
  window.U = U;
})();
