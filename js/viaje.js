// 📍 El Viaje: mapa real de Japón a pantalla completa. UN PUNTO POR CIUDAD.
// Cada lección es un barrio/hito dentro de su ciudad (insignia local). Al
// completar las 6 lecciones de una ciudad se desbloquea su EXAMEN; aprobarlo
// (>=80%) da el billete de Shinkansen que abre la siguiente ciudad.
// Toda la estructura (ciudad, barrio, emoji) viene del JSON vía el motor.
import { api } from './api.js';
import { PREFECTURAS, VISTA, proyectar } from './mapa-japon.js';
import { bezierDesdePuntos } from './mapa-render.js';
import { animar } from './lottie.js';

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fecha(ts) {
  return ts ? new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) : '';
}

const ORO = '#c9971c';
const AMBAR = '#dca01f';
const TIPO_PREF = { Fu: 'prefectura urbana (府)', Ken: 'prefectura (県)', To: 'metrópoli (都)', Do: 'circunscripción (道)' };
const R0 = 5.5;      // radio base de un nodo de ciudad (se escala con el zoom)

export async function vistaViaje(cont, avisar) {
  cont.innerHTML = '<p class="vista-sub">Cargando el viaje...</p>';
  const { ciudades, futuras, fuji, juego } = await api.viaje();

  const codeCiudad = {};
  ciudades.forEach(c => c.hitos.forEach(h => { codeCiudad[h.codigo] = c.id; }));
  const enMapa = [...ciudades, ...futuras];
  const porId = Object.fromEntries(enMapa.map(c => [c.id, c]));

  // Prefecturas: fondo dorado al aprobar el examen; tinte suave en progreso.
  const prefEstado = {};
  ciudades.forEach(c => { if (c.pref) prefEstado[c.pref] = c.examenAprobado ? 'conquistada' : (c.superados > 0 ? 'progreso' : prefEstado[c.pref] || ''); });

  const conquista = sessionStorage.getItem('kotoba-conquista');
  const examenOk = sessionStorage.getItem('kotoba-examen-ok');
  sessionStorage.removeItem('kotoba-conquista');
  sessionStorage.removeItem('kotoba-examen-ok');
  const recordada = sessionStorage.getItem('kotoba-sel');
  sessionStorage.removeItem('kotoba-sel');
  let seleccion = (recordada && porId[recordada]) ? recordada
    : (ciudades.find(c => !c.examenAprobado && !c.bloqueada) || ciudades[0] || enMapa[0])?.id;
  let hitoResaltado = conquista || null;

  function colorCiudad(c) {
    if (c.futura || c.bloqueada) return '#c7c7ce';
    if (c.examenAprobado) return ORO;
    if (c.examenDisponible) return AMBAR;
    return 'var(--acento)';
  }

  // ---------- Mapa ----------
  function svgBase() {
    const prefs = PREFECTURAS.map(pr => {
      const e = prefEstado[pr.nombre];
      const clase = 'pref' + (e === 'conquistada' ? ' pref-conquistada' : e === 'progreso' ? ' pref-progreso' : '');
      return `<path d="${pr.d}" class="${clase}" data-nombre="${esc(pr.nombre)}" data-rom="${esc(pr.rom || '')}"><title>${esc(pr.nombre)}</title></path>`;
    }).join('');
    const defs = `<defs>
      <filter id="sombraTierra" x="-8%" y="-8%" width="116%" height="116%">
        <feDropShadow dx="0" dy="1.4" stdDeviation="1.6" flood-color="#2b3a67" flood-opacity="0.20"/>
      </filter>
      <linearGradient id="mar" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0" stop-color="#eaf3fb"/><stop offset="1" stop-color="#d3e6f5"/>
      </linearGradient>
    </defs>`;

    const pos = enMapa.map(c => proyectar(c.lat, c.lon));
    const viaBase = bezierDesdePuntos(pos);
    let goldN = 0;
    while (goldN < ciudades.length && ciudades[goldN].examenAprobado) goldN++;
    const viaOro = goldN >= 2 ? bezierDesdePuntos(pos.slice(0, goldN)) : '';

    const nodos = enMapa.map(c => {
      const { x, y } = proyectar(c.lat, c.lon);
      const dx = c.dxEtiqueta || 0, dy = c.dyEtiqueta || 0;
      const etiquetaY = dy >= 0 ? y + 12 + dy : y - 8 + dy;
      const sel = c.id === seleccion ? 'seleccionada' : '';
      let nucleo;
      if (c.futura) {
        nucleo = `<circle class="escala nodo-forma nodo-futura" data-r0="3.5" cx="${x}" cy="${y}" r="3.5" fill="${colorCiudad(c)}"/>`;
      } else {
        const halo = (c.examenDisponible || (!c.examenAprobado && !c.bloqueada))
          ? `<circle class="escala nodo-halo ${c.examenDisponible ? 'halo-examen' : ''}" data-r0="${R0}" cx="${x}" cy="${y}" r="${R0}"/>` : '';
        nucleo = `${halo}<circle class="escala nodo-forma" data-r0="${R0}" cx="${x}" cy="${y}" r="${R0}" fill="${colorCiudad(c)}"/>
          <text class="escala nodo-emoji" data-fs="6" x="${x}" y="${y + 2.4}" font-size="6">${c.examenAprobado ? '★' : c.examenDisponible ? '🎫' : ''}</text>`;
      }
      const badge = (!c.futura && c.hitos.length) ? `<text class="escala nodo-progreso" data-fs="6" x="${x}" y="${y - 9}" font-size="6">${c.superados}/${c.cupo}</text>` : '';
      const te = c.hitos.some(h => h.needsReview) ? `<text class="escala nodo-te" data-fs="4.5" x="${x + 5.5}" y="${y - 4}" font-size="4.5">🍵</text>` : '';
      return `
        <g class="nodo ${sel}" data-id="${esc(c.id)}" tabindex="0" role="button"
           aria-label="${esc(c.nombre)}: ${c.futura ? 'Próximamente' : c.examenAprobado ? 'Superada' : c.examenDisponible ? 'Examen listo' : c.bloqueada ? 'Bloqueada' : 'En curso'}">
          <circle class="escala" data-r0="9" cx="${x}" cy="${y}" r="9" fill="transparent"/>
          ${nucleo}${badge}${te}
          <text x="${x + dx}" y="${etiquetaY}" class="mapa-etiqueta ${c.futura ? 'etiqueta-futura' : ''}">${esc(c.nombre)}</text>
        </g>`;
    }).join('');

    // Monte Fuji (hito transversal), fuera de la vía.
    let fujiNodo = '';
    if (fuji && fuji.lat != null) {
      const { x, y } = proyectar(fuji.lat, fuji.lon);
      fujiNodo = `<g class="nodo fuji" data-id="__fuji" tabindex="0" role="button" aria-label="Monte Fuji (matices)">
        <circle class="escala" data-r0="9" cx="${x}" cy="${y}" r="9" fill="transparent"/>
        <path class="escala fuji-forma" data-tri="${x},${y}" d="${triangulo(x, y, 5.5)}" fill="${fuji.superado ? ORO : 'var(--acento)'}"/>
        <text x="${x + (fuji.dx || 6)}" y="${y + 13}" class="mapa-etiqueta">富士</text></g>`;
    }

    return `<svg viewBox="${VISTA}" class="mapa-svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mapa del viaje por Japón">
      ${defs}
      <rect x="${base[0] - base[2]}" y="${base[1] - base[3]}" width="${base[2] * 3}" height="${base[3] * 3}" fill="url(#mar)"/>
      <g class="capa-tierra" filter="url(#sombraTierra)">${prefs}</g>
      <path class="via-base" d="${viaBase}"/>
      ${viaOro ? `<path class="via-progreso-fija" d="${viaOro}"/>` : ''}
      ${nodos}${fujiNodo}
    </svg>`;
  }
  function triangulo(x, y, r) { return `M${(x - r).toFixed(1)},${(y + r * 0.7).toFixed(1)} L${x.toFixed(1)},${(y - r).toFixed(1)} L${(x + r).toFixed(1)},${(y + r * 0.7).toFixed(1)} Z`; }

  // ---------- Línea de tren ----------
  function lineaTren() {
    const totalReq = ciudades.reduce((n, c) => n + c.hitos.length, 0);
    const hechos = ciudades.reduce((n, c) => n + c.hitos.filter(h => h.superado).length, 0);
    const tramos = ciudades.map(c => {
      const paradas = c.hitos.map(h => {
        const clase = h.superado ? 'hecha' : h.estado === 'ACTIVE' ? 'actual' : 'cerrada';
        const icono = h.superado ? '✓' : h.estado === 'ACTIVE' ? h.emoji : '🔒';
        return `<button class="parada-tren ${clase}" data-id="${esc(c.id)}" data-hito="${esc(h.codigo)}" title="${esc(h.barrio)}">
          <span class="pt-punto">${icono}</span><span class="pt-nombre">${esc(h.barrio)}</span></button>`;
      }).join('');
      const sello = c.examenAprobado ? '★ ' : c.examenDisponible ? '🎫 ' : '';
      return `<div class="tren-ciudad ${c.examenAprobado ? 'conq' : ''}">
        <div class="tren-ciudad-nombre">${sello}${c.emoji} ${esc(c.nombre)}</div>
        <div class="tren-paradas">${paradas}</div></div>`;
    }).join('<span class="tren-flecha">→</span>');
    const fut = futuras.slice(0, 6).map(c =>
      `<span class="parada-tren futura" title="${esc(c.nombre)} (próximamente)"><span class="pt-punto">·</span><span class="pt-nombre">${esc(c.nombre)}</span></span>`).join('');
    return `<div class="linea-tren">
      <div class="linea-tren-cab"><b>🚄 Tu recorrido</b><span>${hechos} de ${totalReq} barrios · ${ciudades.filter(c => c.examenAprobado).length} ciudad(es) superada(s)</span></div>
      <div class="linea-tren-pista">${tramos}<span class="tren-flecha">→</span>
        <div class="tren-ciudad futuro-bloque"><div class="tren-ciudad-nombre">Próximas</div><div class="tren-paradas">${fut}</div></div></div></div>`;
  }

  // ---------- Panel de la ciudad ----------
  function panelCiudad() {
    if (seleccion === '__fuji' && fuji) {
      return `<div class="panel-cab"><span class="carta-ciudad-emoji">${fuji.emoji}</span>
        <div><div class="carta-ciudad-nombre">${esc(fuji.barrio)} <span lang="ja">${esc(fuji.kanji)}</span></div>
        <div class="carta-ciudad-leccion">Hito transversal · matices de varias lecciones</div></div></div>
        <p class="carta-ciudad-leccion" style="margin:6px 0">${esc(fuji.titulo)}</p>
        <div class="fila-botones"><button class="boton ${fuji.superado ? 'boton-secundario' : 'boton-primario'} btn-hito-lec" data-codigo="General">${fuji.superado ? '📖 Teoría' : '⚡ Ejercicios'}</button>
        <button class="boton boton-secundario btn-hito-rep" data-codigo="General">⚔️</button></div>`;
    }
    const c = porId[seleccion];
    if (!c) return '';
    if (c.futura || (c.bloqueada && !c.hitos.length)) {
      return `<div class="panel-cab"><span class="carta-ciudad-emoji">${c.emoji}</span>
          <div><div class="carta-ciudad-nombre">${esc(c.nombre)} <span lang="ja">${esc(c.kanji)}</span></div>
          <div class="carta-ciudad-leccion">${esc(c.pref || '')} · ${esc(c.region)}${c.jlpt ? ` · <span class="chip chip-jlpt">${esc(c.jlpt)}</span>` : ''}</div></div></div>
        <p class="panel-nota">🚧 Próximamente. Esta ciudad se abrirá cuando exportes sus lecciones al JSON; llegarás en Shinkansen tras aprobar el examen de la ciudad anterior.</p>
        ${juego.billetes > 0 ? `<button class="boton boton-primario" id="btn-billete">🎫 Usar billete de Shinkansen para adelantar (${juego.billetes})</button>` : ''}`;
    }
    const filas = c.hitos.map(h => {
      const bloqueado = h.estado === 'LOCKED';
      const clase = h.superado ? 'superado' : bloqueado ? 'bloqueado' : 'activo';
      return `<div class="hito-fila ${clase}" data-hito="${esc(h.codigo)}">
        <span class="hito-emoji">${bloqueado ? '🔒' : h.emoji}</span>
        <div class="hito-texto">
          <div class="hito-nombre">${esc(h.barrio)}</div>
          <div class="hito-logro">${h.superado ? `🏅 ${esc(h.barrio)}${h.fecha ? ' · ' + fecha(h.fecha) : ''}` : esc(h.titulo)}</div>
        </div>
        <div class="hito-acciones">
          ${bloqueado ? '<span class="chip">🔒</span>' : `
          ${h.needsReview ? '<span class="aviso-te" title="Repasos pendientes">🍵</span>' : ''}
          <button class="boton ${h.superado ? 'boton-secundario' : 'boton-primario'} btn-hito-lec" data-codigo="${esc(h.codigo)}" style="padding:6px 12px;font-size:0.85rem">${h.superado ? '📖' : '⚡ Ejercicios'}</button>
          <button class="boton boton-secundario btn-hito-rep" data-codigo="${esc(h.codigo)}" style="padding:6px 12px;font-size:0.85rem">⚔️</button>`}
        </div></div>`;
    }).join('');

    let examen = '';
    if (c.examenAprobado) examen = '<div class="examen-bloque aprobado">✓ Examen de ciudad superado · billete de Shinkansen conseguido 🎫</div>';
    else if (c.examenDisponible) examen = `<div class="examen-bloque"><b>🎫 Examen de ${esc(c.nombre)} desbloqueado</b><p>Test acumulativo de las ${c.cupo} lecciones. Necesitas 80% para el billete que abre la siguiente ciudad.</p><button class="boton boton-primario" id="btn-examen">Hacer el examen de ciudad</button></div>`;
    else examen = `<p class="carta-ciudad-leccion" style="margin-top:8px">Completa las ${c.cupo} lecciones (${c.superados}/${c.cupo}) para desbloquear el examen de ciudad.</p>`;

    return `<div class="panel-cab"><span class="carta-ciudad-emoji">${c.examenAprobado ? '🏯' : c.emoji}</span>
        <div><div class="carta-ciudad-nombre">${esc(c.nombre)} <span lang="ja">${esc(c.kanji)}</span>${c.examenAprobado ? ' <span class="chip chip-superada">★ Superada</span>' : ''}</div>
        <div class="carta-ciudad-leccion">${esc(c.pref || '')} · ${esc(c.region)}${c.jlpt ? ` · <span class="chip chip-jlpt">${esc(c.jlpt)}</span>` : ''} · ${c.superados}/${c.cupo} barrios</div></div></div>
      <div class="lista-hitos">${filas}</div>
      ${examen}`;
  }

  // ---------- Render ----------
  function pintar() {
    cont.innerHTML = `
      <div class="viaje-cab"><div>
        <h1 class="vista-titulo">📍 El Viaje</h1>
        <p class="vista-sub">Un punto por ciudad. Cada lección es un barrio con su insignia; completa las 6, aprueba el examen de ciudad y gana el 🎫 billete de Shinkansen para viajar. Tienes 🎫 ${juego.billetes}.</p>
      </div></div>
      ${lineaTren()}
      <div class="mapa-full"><div class="caja-mapa">
        <div class="mapa-lottie" id="lottie-japon" title="日本"></div>
        ${svgBase()}
        <div class="pref-etiqueta oculto" id="pref-nombre"></div>
        <div class="controles-mapa">
          <button class="control-mapa" id="zoom-mas" title="Acercar">＋</button>
          <button class="control-mapa" id="zoom-menos" title="Alejar">−</button>
          <button class="control-mapa" id="zoom-reset" title="Ver todo Japón">⌂</button>
        </div>
        <div class="leyenda-mapa">
          <span><i style="background:var(--acento)"></i> En curso</span>
          <span><i style="background:${AMBAR}"></i> Examen listo</span>
          <span><i style="background:${ORO}"></i> Superada</span>
          <span><i style="background:#c7c7ce"></i> Próximamente</span>
          <span>Toca una prefectura para su nombre</span>
        </div>
      </div></div>
      <div class="panel-parada" id="panel-ciudad">${panelCiudad()}</div>`;
    enganchar();
    reescalarNodos();
    if (conquista && (porId[seleccion] || seleccion === '__fuji')) celebrar(conquista, examenOk);
  }

  // ---------- Zoom, arrastre, vuelo, escala de nodos ----------
  const base = VISTA.split(' ').map(Number);
  let vb = [...base];
  let volando = null;
  function reescalarNodos() {
    const svg = cont.querySelector('.mapa-svg');
    if (!svg) return;
    const f = Math.max(0.28, vb[2] / base[2]); // los nodos mantienen tamaño en pantalla
    svg.querySelectorAll('.escala').forEach(el => {
      if (el.dataset.r0) el.setAttribute('r', (parseFloat(el.dataset.r0) * f).toFixed(2));
      else if (el.dataset.fs) el.setAttribute('font-size', (parseFloat(el.dataset.fs) * f).toFixed(2));
      else if (el.dataset.tri) { const [x, y] = el.dataset.tri.split(',').map(Number); el.setAttribute('d', triangulo(x, y, 5.5 * f)); }
    });
  }
  function aplicarVb(svg) { svg.setAttribute('viewBox', vb.map(v => v.toFixed(2)).join(' ')); reescalarNodos(); }
  function fijar() {
    const mx = vb[2] * 0.4, my = vb[3] * 0.4;
    vb[0] = Math.max(base[0] - mx, Math.min(base[0] + base[2] - vb[2] + mx, vb[0]));
    vb[1] = Math.max(base[1] - my, Math.min(base[1] + base[3] - vb[3] + my, vb[1]));
  }
  function zoomHacia(svg, factor, cx, cy) {
    cancelAnimationFrame(volando);
    const nw = Math.min(base[2], Math.max(base[2] / 12, vb[2] / factor));
    const escala = nw / vb[2];
    vb[0] = cx - (cx - vb[0]) * escala; vb[1] = cy - (cy - vb[1]) * escala;
    vb[2] *= escala; vb[3] *= escala; fijar(); aplicarVb(svg);
  }
  function puntoSvg(svg, cx, cy) {
    const r = svg.getBoundingClientRect();
    return [vb[0] + ((cx - r.left) / r.width) * vb[2], vb[1] + ((cy - r.top) / r.height) * vb[3]];
  }
  function animarVb(svg, hasta, dur = 620) {
    cancelAnimationFrame(volando);
    const desde = [...vb], inicio = performance.now();
    const paso = ahora => {
      const t = Math.min(1, (ahora - inicio) / dur);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      vb = desde.map((v, i) => v + (hasta[i] - v) * e);
      aplicarVb(svg);
      if (t < 1) volando = requestAnimationFrame(paso);
    };
    volando = requestAnimationFrame(paso);
  }
  function volarA(svg, x, y, zoom = 2.6) {
    const w = base[2] / zoom, h = base[3] / zoom;
    animarVb(svg, [x - w / 2, y - h / 2, w, h]);
  }
  function iniciarInteraccion() {
    const svg = cont.querySelector('.mapa-svg');
    if (!svg) return;
    aplicarVb(svg);
    svg.addEventListener('wheel', e => { e.preventDefault(); const [cx, cy] = puntoSvg(svg, e.clientX, e.clientY); zoomHacia(svg, e.deltaY < 0 ? 1.25 : 0.8, cx, cy); }, { passive: false });
    const punteros = new Map(); let arrastre = null, seArrastro = false, capturado = null;
    svg.addEventListener('pointerdown', e => { punteros.set(e.pointerId, [e.clientX, e.clientY]); if (punteros.size === 1) { arrastre = { x: e.clientX, y: e.clientY, vb: [...vb] }; seArrastro = false; } });
    svg.addEventListener('pointermove', e => {
      if (!punteros.has(e.pointerId)) return;
      const previo = [...punteros.values()];
      punteros.set(e.pointerId, [e.clientX, e.clientY]);
      const r = svg.getBoundingClientRect();
      if (punteros.size === 2) {
        if (capturado === null) { capturado = e.pointerId; svg.setPointerCapture(capturado); }
        const [a, b] = [...punteros.values()];
        const [pa, pb] = previo.length === 2 ? previo : [a, b];
        const dA = Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) || 1, dB = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1;
        const [cx, cy] = puntoSvg(svg, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        zoomHacia(svg, dB / dA, cx, cy); seArrastro = true;
      } else if (arrastre) {
        if (!seArrastro && Math.abs(e.clientX - arrastre.x) + Math.abs(e.clientY - arrastre.y) > 6) { seArrastro = true; if (capturado === null) { capturado = e.pointerId; svg.setPointerCapture(capturado); } }
        if (seArrastro) { const dx = ((e.clientX - arrastre.x) / r.width) * vb[2], dy = ((e.clientY - arrastre.y) / r.height) * vb[3]; cancelAnimationFrame(volando); vb[0] = arrastre.vb[0] - dx; vb[1] = arrastre.vb[1] - dy; fijar(); aplicarVb(svg); }
      }
    });
    const soltar = e => { punteros.delete(e.pointerId); if (capturado === e.pointerId) { try { svg.releasePointerCapture(capturado); } catch {} capturado = null; } if (!punteros.size) arrastre = null; };
    svg.addEventListener('pointerup', soltar);
    svg.addEventListener('pointercancel', soltar);
    svg.addEventListener('click', e => { if (seArrastro) { e.stopPropagation(); seArrastro = false; } }, true);
    cont.querySelector('#zoom-mas').onclick = () => zoomHacia(svg, 1.4, vb[0] + vb[2] / 2, vb[1] + vb[3] / 2);
    cont.querySelector('#zoom-menos').onclick = () => zoomHacia(svg, 0.7, vb[0] + vb[2] / 2, vb[1] + vb[3] / 2);
    cont.querySelector('#zoom-reset').onclick = () => animarVb(svg, [...base], 500);
  }

  function seleccionar(id, conVuelo = true) {
    seleccion = id;
    cont.querySelectorAll('.nodo').forEach(n => n.classList.toggle('seleccionada', n.dataset.id === id));
    cont.querySelector('#panel-ciudad').innerHTML = panelCiudad();
    engancharPanel();
    const c = porId[id] || (id === '__fuji' ? fuji : null);
    if (conVuelo && c && c.lat != null) { const svg = cont.querySelector('.mapa-svg'); const { x, y } = proyectar(c.lat, c.lon); volarA(svg, x, y, c.futura ? 2 : 2.8); }
  }

  function irLeccion(codigo) { sessionStorage.setItem('kotoba-leccion', codigo); location.hash = '#lecciones'; }
  function irRepaso(codigo) { sessionStorage.setItem('kotoba-ciudad', codigo); location.hash = '#repaso'; }

  function engancharPanel() {
    cont.querySelectorAll('.btn-hito-lec').forEach(b => b.onclick = () => irLeccion(b.dataset.codigo));
    cont.querySelectorAll('.btn-hito-rep').forEach(b => b.onclick = () => irRepaso(b.dataset.codigo));
    const be = cont.querySelector('#btn-examen');
    if (be) be.onclick = () => { sessionStorage.setItem('kotoba-examen', seleccion); location.hash = '#lecciones'; };
    const bt = cont.querySelector('#btn-billete');
    if (bt) bt.onclick = async () => {
      try { await api.gastarBillete(seleccion); if (avisar) avisar(`🎫 ¡Billete usado! ${porId[seleccion].nombre} queda abierta.`); sessionStorage.setItem('kotoba-sel', seleccion); vistaViaje(cont, avisar); }
      catch (e) { if (avisar) avisar(e.message); }
    };
    if (hitoResaltado) {
      const fila = cont.querySelector(`.hito-fila[data-hito="${hitoResaltado}"]`);
      if (fila) { fila.classList.add('resaltado'); fila.scrollIntoView({ block: 'nearest' }); }
      hitoResaltado = null;
    }
  }

  function engancharPrefecturas() {
    const chip = cont.querySelector('#pref-nombre');
    let temporizador;
    cont.querySelectorAll('.pref').forEach(pr => {
      pr.addEventListener('click', e => {
        e.stopPropagation();
        cont.querySelectorAll('.pref.activa-pref').forEach(x => x.classList.remove('activa-pref'));
        pr.classList.add('activa-pref');
        const romCompleto = pr.dataset.rom || '';
        const tipo = romCompleto.match(/ (Fu|Ken|To|Do)$/);
        const rom = romCompleto.replace(/ (Fu|Ken|To|Do)$/, '');
        chip.innerHTML = `<span lang="ja">${esc(pr.dataset.nombre)}</span> <b>${esc(rom)}</b>${tipo ? `<small>${esc(TIPO_PREF[tipo[1]] || '')}</small>` : ''}`;
        chip.classList.remove('oculto');
        clearTimeout(temporizador);
        temporizador = setTimeout(() => { chip.classList.add('oculto'); pr.classList.remove('activa-pref'); }, 3200);
      });
    });
  }

  function enganchar() {
    iniciarInteraccion();
    cont.querySelectorAll('.nodo').forEach(n => {
      n.addEventListener('click', () => seleccionar(n.dataset.id));
      n.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); seleccionar(n.dataset.id); } });
    });
    cont.querySelectorAll('.parada-tren[data-id]').forEach(t => {
      t.addEventListener('click', () => { hitoResaltado = t.dataset.hito || null; seleccionar(t.dataset.id); cont.querySelector('.caja-mapa').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
    });
    engancharPanel();
    engancharPrefecturas();
    animar(cont.querySelector('#lottie-japon'), 'japon');
  }

  // ---------- Celebración ----------
  function celebrar(codigo, ciudadOk) {
    const cid = codeCiudad[codigo] || (codigo === 'General' ? '__fuji' : null);
    const c = porId[cid] || (cid === '__fuji' ? fuji : null);
    const svg = cont.querySelector('.mapa-svg');
    if (svg && c && c.lat != null) { const { x, y } = proyectar(c.lat, c.lon); setTimeout(() => volarA(svg, x, y, 3), 200); }
    const nodo = cont.querySelector(`.nodo[data-id="${cid}"]`);
    if (nodo) nodo.classList.add('conquistando');
    const caja = cont.querySelector('.caja-mapa');
    const grande = !!ciudadOk;
    for (let i = 0; i < (grande ? 42 : 22); i++) {
      const conf = document.createElement('span');
      conf.className = 'confeti';
      conf.textContent = ['🎉', '⭐', '🌸', '🎌', '✨', '🏮'][i % 6];
      conf.style.left = `${6 + Math.random() * 88}%`;
      conf.style.animationDelay = `${Math.random() * 0.8}s`;
      conf.style.fontSize = `${12 + Math.random() * 16}px`;
      caja.appendChild(conf);
      setTimeout(() => conf.remove(), 3400);
    }
    if (ciudadOk && porId[ciudadOk]) {
      if (porId[ciudadOk].pref) cont.querySelectorAll(`.pref[data-nombre="${porId[ciudadOk].pref}"]`).forEach(pr => { pr.classList.add('pref-conquistada', 'pref-recien'); pr.addEventListener('animationend', () => pr.classList.remove('pref-recien'), { once: true }); });
      if (avisar) avisar(`🏯 ¡${porId[ciudadOk].nombre} superada! Billete de Shinkansen conseguido: la siguiente ciudad se abre.`);
    } else if (avisar && c) {
      const h = c.hitos && c.hitos.find(x => x.codigo === codigo);
      if (h) avisar(`🏅 ¡Insignia conseguida: ${h.barrio}!`);
    }
  }

  pintar();
}
