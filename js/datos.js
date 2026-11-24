// Carga de datos: copia guardada en el navegador (abre al instante) + datos frescos del Apps Script.
(function () {
  var C = window.CONFIG;
  var Datos = { listo: false, regs: [], inst: new Map(), avisos: [], hojas: {}, meta: null, oyentes: [] };

  function preparar(j) {
    var inst = new Map();
    (j.instituciones || []).forEach(function (i) {
      i.E = 0; i.O = 0; i.A = 0; i.uE = 0; i.ultimo = ''; i.ultimoAnio = 0;
      i.busca = U.norm([i.id, i.nombre, i.completo, i.localidad].concat(i.alias || []).join(' '));
      inst.set(i.id, i);
    });
    var regs = (j.registros || []).map(function (r, k) {
      var o = { k: k, t: r[0], anio: r[1] || null, fecha: r[2] || '', inst: r[3], cat: r[4] || 'Sin categoría', det: r[5] || '',
        cant: Number(r[6]) || 0, prov: r[7] || '', fuente: r[8] || '', serv: r[9] || '', estado: r[10] || '', monto: r[11], fact: r[12],
        ref: r[13] ? [r[13], r[14], r[15]] : null };
      var i = inst.get(o.inst);
      if (!i) { i = { id: o.inst, nombre: o.inst, completo: '', nivel: '', gestion: '', localidad: '', enBase: false, alias: [], aliasRef: {}, ref: null, E: 0, O: 0, A: 0, uE: 0, ultimo: '', ultimoAnio: 0, busca: U.norm(o.inst) }; inst.set(o.inst, i); }
      o.I = i;
      i[o.t]++;
      if (o.t === 'E') i.uE += o.cant;
      var orden = o.fecha || (o.anio ? o.anio + '-00-00' : '');
      if (orden > i.ultimo) i.ultimo = orden;
      if (o.anio > i.ultimoAnio) i.ultimoAnio = o.anio;
      o.orden = orden;
      o.busca = U.norm([o.inst, i.nombre, o.cat, o.det, o.prov, o.serv].join(' '));
      return o;
    });
    regs.sort(function (a, b) { return a.orden < b.orden ? 1 : a.orden > b.orden ? -1 : 0; });
    Datos.regs = regs; Datos.inst = inst; Datos.avisos = j.avisos || []; Datos.hojas = j.hojas || {};
    Datos.meta = { version: j.version, generado: j.generado, montos: !!j.montos, resumen: j.resumen };
    Datos.listo = true;
    Datos.oyentes.forEach(function (f) { try { f(); } catch (e) { console.error(e); } });
  }

  function estado(clase, texto, titulo) {
    var e = U.$('#estadoDatos'); e.className = 'estado-datos ' + clase;
    U.$('.txt', e).textContent = texto; e.title = titulo || texto;
  }
  function cuando(iso) {
    if (!iso) return '';
    var d = new Date(iso), min = Math.round((Date.now() - d) / 60000);
    if (min < 1) return 'recién';
    if (min < 60) return 'hace ' + min + ' min';
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }
  function mostrarEstado() {
    if (!Datos.meta) return;
    estado('ok', 'Datos ' + cuando(Datos.meta.generado), 'Datos leídos de las planillas: ' + new Date(Datos.meta.generado).toLocaleString('es-AR') + ' · script v' + Datos.meta.version);
  }

  function avisoGlobal(html, clase) {
    U.$('#avisoGlobal').innerHTML = html ? '<div class="aviso ' + (clase || 'naranja') + '" style="margin-bottom:1rem">' + html + '</div>' : '';
  }

  function leerCopia() {
    try { var t = localStorage.getItem(C.CLAVE_COPIA); return t ? JSON.parse(t) : null; } catch (e) { return null; }
  }
  function guardarCopia(j) {
    try { localStorage.setItem(C.CLAVE_COPIA, JSON.stringify(j)); } catch (e) {}
  }

  // ?datos=archivo.json → solo para probar en la compu con un archivo de la misma carpeta
  function urlDatos(forzar) {
    var p = new URLSearchParams(location.search).get('datos');
    if (p && /^[\w\-\/.]+\.json$/.test(p) && p.indexOf('..') < 0) return p;
    if (!C.SCRIPT_URL) return null;
    return C.SCRIPT_URL + (C.SCRIPT_URL.indexOf('?') < 0 ? '?' : '&') + (forzar ? 'actualizar=1&' : '') + 't=' + Date.now();
  }

  Datos.cargar = function (forzar) {
    var url = urlDatos(forzar);
    var esPrueba = /\.json$/.test(url || '') && url.indexOf('http') !== 0;
    if (!url) {
      estado('error', 'Sin conexión configurada');
      avisoGlobal('⚙️ <b>Falta conectar la página con las planillas.</b> Publicá el Apps Script (ver <code>apps-script/PUBLICAR.md</code>) y pegá su URL en <code>js/config.js</code> → <code>SCRIPT_URL</code>.', 'naranja');
      return Promise.resolve();
    }
    if (!Datos.listo && !esPrueba) {
      var copia = leerCopia();
      if (copia && copia.ok) { preparar(copia); mostrarEstado(); }
    }
    estado('cargando', Datos.listo ? 'Actualizando…' : 'Leyendo planillas…');
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, C.TIEMPO_ESPERA_MS);
    return fetch(url, { signal: ctrl && ctrl.signal, cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) {
        clearTimeout(timer);
        if (!j || !j.ok) throw new Error((j && j.error) || 'Respuesta inválida del script');
        if (!esPrueba) guardarCopia(j);
        preparar(j); mostrarEstado(); avisoGlobal('');
        var cmp = compararVersion(j.version, C.VERSION_SCRIPT_ESPERADA);
        if (cmp < 0) {
          avisoGlobal('⚠️ <b>El Apps Script quedó atrasado:</b> está en la versión <b>' + U.esc(j.version) + '</b> y la página necesita la <b>' + U.esc(C.VERSION_SCRIPT_ESPERADA) +
            '</b>. Pegá el <code>Codigo.gs</code> de esta actualización en script.google.com y publicalo (Implementar → Administrar implementaciones → ✏️ → Nueva versión).', 'naranja');
        } else if (cmp > 0) {
          avisoGlobal('⚠️ <b>La página quedó atrasada:</b> el Apps Script ya está en la versión <b>' + U.esc(j.version) + '</b> y estos archivos esperan la <b>' + U.esc(C.VERSION_SCRIPT_ESPERADA) +
            '</b>. Subí los archivos de la última actualización de la página (incluido <code>js/version.js</code>).', 'naranja');
        }
        if (forzar) U.toast('✅ Datos actualizados');
      })
      .catch(function (err) {
        clearTimeout(timer);
        console.error(err);
        if (Datos.listo) {
          estado('error', 'Sin actualizar', 'No se pudieron leer las planillas: ' + err.message);
          avisoGlobal('⚠️ No se pudieron leer las planillas ahora (' + U.esc(err.message) + '). Estás viendo la última copia guardada. Probá con 🔄 Actualizar en un rato.', 'naranja');
        } else {
          estado('error', 'Error');
          avisoGlobal('❌ No se pudieron leer las planillas (' + U.esc(err.message) + '). Revisá que el Apps Script esté publicado con acceso "Cualquier persona" y que la URL de <code>js/config.js</code> sea la correcta.', 'rojo');
        }
      });
  };
  function compararVersion(a, b) {
    var x = String(a || '0').split('.').map(Number), y = String(b || '0').split('.').map(Number);
    for (var i = 0; i < 3; i++) { var d = (x[i] || 0) - (y[i] || 0); if (d) return d < 0 ? -1 : 1; }
    return 0;
  }
  Datos.alCambiar = function (f) { Datos.oyentes.push(f); };
  setInterval(mostrarEstado, 60000);
  window.Datos = Datos;
})();
