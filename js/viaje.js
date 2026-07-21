// 📍 El Viaje: mapa real de Japón a pantalla completa e interactivo (zoom,
// arrastre y vuelo de cámara). Las estaciones (lecciones) se reparten SOLAS a
// lo largo de la vía principal (curva Bézier entre hitos madre) por
// interpolación con getPointAtLength(): da igual que haya 6, 86 o 300 lecciones,
// el mapa se redistribuye automáticamente sin tocar coordenadas.
//
// Jerarquía conceptual (en el panel y en Lecciones/Perfil): cada lección es un
// HITO de una ciudad; superar sus ejercicios da su insignia local; completar
// todos los hitos conquista la ciudad.
import { api } from './api.js';
import { CIUDADES, CIUDADES_FUTURAS, ciudadDeLeccion, TOTAL_PREVISTO } from './curriculum.js';
import { PREFECTURAS, VISTA, proyectar } from './mapa-japon.js';
import { caminoBezier, repartirEstaciones, etiquetasRegion } from './mapa-render.js';
import { animar } from './lottie.js';

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fecha(ts) {
  return ts ? new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) : '';
}
function numLeccion(codigo) {
  const m = /^L(\d+)$/.exec(codigo);
  return m ? parseInt(m[1], 10) : null;
}

const ORO = '#c9971c';
const AZUL = 'var(--acento)';
const SVGNS = 'http://www.w3.org/2000/svg';
const BUFFER_FUTURO = 14; // estaciones "en construcción" visibles por delante

export async function vistaViaje(cont, avisar) {
  cont.innerHTML = '<p class="vista-sub">Cargando el viaje...</p>';
  const { paradas, lecciones, juego } = await api.viaje();
  const estadoPorCodigo = Object.fromEntries(paradas.map(p => [p.codigo, p]));

  // Estado de cada ciudad real a partir de sus hitos (lecciones).
  const codeCiudad = {};
  const ciudades = CIUDADES.map(ciudad => {
    const hitos = ciudad.hitos.filter(h => estadoPorCodigo[h.codigo]).map(h => {
      const st = estadoPorCodigo[h.codigo];
      codeCiudad[h.codigo] = ciudad.id;
      return { ...h, estado: st.estado, stats: st.stats, needsReview: st.needsReview, pendientes: st.pendientes,
        superado: st.estado === 'COMPLETED', fecha: juego.fechas ? juego.fechas[h.codigo] : null };
    });
    const req = ciudad.hitos.filter(h => !h.bonus).map(h => h.codigo);
    const conquistada = req.length > 0 && req.every(c => estadoPorCodigo[c] && estadoPorCodigo[c].estado === 'COMPLETED');
    return { ...ciudad, hitos, conquistada, superados: hitos.filter(h => h.superado).length };
  }).filter(c => c.hitos.length);

  // Robustez: lecciones con contenido que aún no están mapeadas a una ciudad
  // (p. ej. las que añadas nuevas en el JSON) se agrupan solas, sin tocar código.
  const mapeadas = new Set(Object.keys(codeCiudad));
  const huerfanas = paradas.filter(p => numLeccion(p.codigo) && !mapeadas.has(p.codigo));
  if (huerfanas.length) {
    const hitos = huerfanas.map(p => {
      codeCiudad[p.codigo] = 'nuevas';
      const c = ciudadDeLeccion(p.codigo);
      return { codigo: p.codigo, nombre: c.nombre, kanji: c.kanji, emoji: '📍', tipo: 'hito',
        insignia: `Lección ${p.codigo}`, logro: lecciones[p.codigo] || 'Nueva lección',
        estado: p.estado, stats: p.stats, needsReview: p.needsReview, pendientes: p.pendientes,
        superado: p.estado === 'COMPLETED', fecha: juego.fechas ? juego.fechas[p.codigo] : null };
    });
    ciudades.push({ id: 'nuevas', nombre: 'Nuevas lecciones', kanji: '新', emoji: '🆕', prefectura: '—',
      region: '—', jlpt: '', lema: 'Lecciones recién añadidas del chat, aún sin ciudad temática asignada.',
      hitos, conquistada: false, superados: hitos.filter(h => h.superado).length });
  }
  const porId = Object.fromEntries(ciudades.map(c => [c.id, c]));

  const conquista = sessionStorage.getItem('kotoba-conquista');
  const ciudadConq = sessionStorage.getItem('kotoba-ciudad-conq');
  sessionStorage.removeItem('kotoba-conquista');
  sessionStorage.removeItem('kotoba-ciudad-conq');
  const recordada = sessionStorage.getItem('kotoba-sel');
  sessionStorage.removeItem('kotoba-sel');

  let seleccion = (recordada && porId[recordada]) ? recordada
    : (ciudades.find(c => !c.conquistada) || ciudades[0])?.id;
  let hitoResaltado = conquista || null;

  // Reparto de estaciones: nº total = última lección + margen (auto-escala).
  const numeros = paradas.map(p => numLeccion(p.codigo)).filter(Boolean);
  const maxNum = numeros.length ? Math.max(...numeros) : 6;
  const N = Math.min(TOTAL_PREVISTO, Math.max(maxNum + BUFFER_FUTURO, 20));
  const via = caminoBezier();
  let posMap = {};       // codigo -> {x,y}
  let posFuji = null;

  // ---------- SVG base (prefecturas + vía) ----------
  function svgBase() {
    const prefs = PREFECTURAS.map(pr => `<path d="${pr.d}" class="pref" data-nombre="${esc(pr.nombre)}" data-rom="${esc(pr.rom || '')}"><title>${esc(pr.nombre)}</title></path>`).join('');
    const regiones = etiquetasRegion().map(r =>
      `<text x="${r.x.toFixed(1)}" y="${(r.y - 12).toFixed(1)}" class="mapa-region">${esc(r.region)}</text>`).join('');
    return `<svg viewBox="${VISTA}" class="mapa-svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mapa del viaje por Japón">
      ${prefs}
      <path id="via-base" class="via-base" d="${via.d}"/>
      <path id="via-progreso" class="via-progreso" d="${via.d}"/>
      <g id="capa-estaciones"></g>
      ${regiones}
    </svg>`;
  }

  function decorarEstaciones() {
    const svg = cont.querySelector('.mapa-svg');
    const viaBase = svg.querySelector('#via-base');
    const capa = svg.querySelector('#capa-estaciones');
    const { posiciones, paso } = repartirEstaciones(viaBase, N);
    posMap = {};

    // Vía dorada: progreso conquistado hasta la última lección superada.
    let maxSuperadaIdx = -1;
    posiciones.forEach((_, i) => {
      const code = 'L' + (i + 1);
      if (estadoPorCodigo[code] && estadoPorCodigo[code].estado === 'COMPLETED') maxSuperadaIdx = i;
    });
    const prog = svg.querySelector('#via-progreso');
    const total = viaBase.getTotalLength();
    const goldLen = maxSuperadaIdx >= 0 ? maxSuperadaIdx * paso : 0;
    prog.style.strokeDasharray = `${goldLen.toFixed(1)} ${(total + 1).toFixed(1)}`;

    posiciones.forEach((pt, i) => {
      const num = i + 1;
      const code = 'L' + num;
      const st = estadoPorCodigo[code];
      posMap[code] = pt;
      const g = document.createElementNS(SVGNS, 'g');
      g.setAttribute('class', 'estacion');
      g.setAttribute('data-codigo', code);
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');

      let clase, r;
      if (!st) { clase = 'placeholder'; r = 2; }
      else if (st.estado === 'COMPLETED') { clase = 'superada'; r = 5.5; }
      else if (st.estado === 'ACTIVE') { clase = 'activa'; r = 5.5; }
      else { clase = 'bloqueada'; r = 4.5; }
      g.classList.add(clase);
      if (code === seleccion + '__none') {/* noop */}

      // área de toque
      const hit = document.createElementNS(SVGNS, 'circle');
      hit.setAttribute('cx', pt.x); hit.setAttribute('cy', pt.y); hit.setAttribute('r', 9);
      hit.setAttribute('fill', 'transparent');
      g.appendChild(hit);

      if (st && st.estado === 'ACTIVE') {
        const halo = document.createElementNS(SVGNS, 'circle');
        halo.setAttribute('cx', pt.x); halo.setAttribute('cy', pt.y); halo.setAttribute('r', r);
        halo.setAttribute('class', 'estacion-halo');
        g.appendChild(halo);
      }
      const c = document.createElementNS(SVGNS, 'circle');
      c.setAttribute('cx', pt.x); c.setAttribute('cy', pt.y); c.setAttribute('r', r);
      c.setAttribute('class', 'estacion-punto');
      g.appendChild(c);

      if (st && st.estado === 'COMPLETED') {
        const t = document.createElementNS(SVGNS, 'text');
        t.setAttribute('x', pt.x); t.setAttribute('y', pt.y + 2.6); t.setAttribute('class', 'estacion-check');
        t.textContent = '✓'; g.appendChild(t);
      }
      if (st && (st.needsReview) && st.estado !== 'LOCKED') {
        const te = document.createElementNS(SVGNS, 'text');
        te.setAttribute('x', pt.x + 7); te.setAttribute('y', pt.y - 5); te.setAttribute('class', 'nodo-te');
        te.textContent = '🍵'; g.appendChild(te);
      }
      capa.appendChild(g);
    });

    // Monte Fuji (General): hito transversal fuera de la vía principal.
    const gen = estadoPorCodigo.General;
    if (gen) {
      const f = ciudadDeLeccion('General');
      const p = proyectar(f.lat, f.lon);
      posFuji = p; posMap.General = p;
      const g = document.createElementNS(SVGNS, 'g');
      g.setAttribute('class', 'estacion fuji ' + (gen.estado === 'COMPLETED' ? 'superada' : 'activa'));
      g.setAttribute('data-codigo', 'General');
      g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button');
      g.innerHTML = `<circle cx="${p.x}" cy="${p.y}" r="9" fill="transparent"/>
        <path d="M${p.x - 6},${p.y + 4} L${p.x},${p.y - 6} L${p.x + 6},${p.y + 4} Z" class="fuji-forma" fill="${gen.estado === 'COMPLETED' ? ORO : AZUL}"/>
        <text x="${p.x}" y="${p.y + 15}" class="mapa-etiqueta">富士</text>`;
      capa.appendChild(g);
    }

    // Etiquetas de la primera y última estación con contenido, para orientar.
    marcarEtiqueta(capa, posMap['L1'], 'Inicio');
    if (maxNum >= 1) marcarEtiqueta(capa, posMap['L' + maxNum], `L${maxNum}`);
    marcarEtiqueta(capa, posiciones[N - 1], `~L${TOTAL_PREVISTO}`, true);
  }

  function marcarEtiqueta(capa, pt, texto, tenue) {
    if (!pt) return;
    const t = document.createElementNS(SVGNS, 'text');
    t.setAttribute('x', pt.x); t.setAttribute('y', pt.y - 9);
    t.setAttribute('class', 'mapa-etiqueta' + (tenue ? ' etiqueta-futura' : ''));
    t.textContent = texto;
    capa.appendChild(t);
  }

  // ---------- Línea de tren (índice lineal compacto) ----------
  function lineaTren() {
    const totalReq = ciudades.reduce((n, c) => n + c.hitos.filter(h => !h.bonus).length, 0);
    const hechos = ciudades.reduce((n, c) => n + c.hitos.filter(h => h.superado && !h.bonus).length, 0);
    const tramos = ciudades.map(c => {
      const paradas = c.hitos.map(h => {
        const clase = h.superado ? 'hecha' : h.estado === 'ACTIVE' ? 'actual' : 'cerrada';
        const icono = h.superado ? '✓' : h.estado === 'ACTIVE' ? h.emoji : '🔒';
        return `<button class="parada-tren ${clase}" data-id="${esc(c.id)}" data-hito="${esc(h.codigo)}" title="${esc(h.nombre)}">
          <span class="pt-punto">${icono}</span><span class="pt-nombre">${esc(h.nombre)}</span></button>`;
      }).join('');
      return `<div class="tren-ciudad ${c.conquistada ? 'conq' : ''}">
        <div class="tren-ciudad-nombre">${c.conquistada ? '★ ' : ''}${c.emoji} ${esc(c.nombre)}</div>
        <div class="tren-paradas">${paradas}</div></div>`;
    }).join('<span class="tren-flecha">→</span>');
    const fut = CIUDADES_FUTURAS.slice(0, 6).map(c =>
      `<span class="parada-tren futura" title="${esc(c.nombre)} (próximamente)"><span class="pt-punto">·</span><span class="pt-nombre">${esc(c.nombre)}</span></span>`).join('');
    return `<div class="linea-tren">
      <div class="linea-tren-cab"><b>🚄 Tu recorrido</b><span>${hechos} de ${totalReq} hitos · ${ciudades.filter(c => c.conquistada).length} ciudad(es) conquistada(s)</span></div>
      <div class="linea-tren-pista">${tramos}<span class="tren-flecha">→</span>
        <div class="tren-ciudad futuro-bloque"><div class="tren-ciudad-nombre">Próximas</div><div class="tren-paradas">${fut}</div></div></div></div>`;
  }

  // ---------- Panel de la ciudad seleccionada ----------
  function panelCiudad() {
    const c = porId[seleccion];
    if (!c) return '';
    const totalReq = c.hitos.filter(h => !h.bonus).length;
    const filas = c.hitos.map(h => {
      const clase = h.superado ? 'superado' : h.estado === 'ACTIVE' ? 'activo' : 'bloqueado';
      return `<div class="hito-fila ${clase}" data-hito="${esc(h.codigo)}">
        <span class="hito-emoji">${h.superado ? h.emoji : (h.estado === 'ACTIVE' ? h.emoji : '🔒')}</span>
        <div class="hito-texto">
          <div class="hito-nombre">${esc(h.nombre)} <span lang="ja">${esc(h.kanji)}</span>${h.bonus ? ' <span class="chip chip-bonus">Bonus</span>' : ''}</div>
          <div class="hito-logro">${h.superado ? `🏅 ${esc(h.insignia)}${h.fecha ? ' · ' + fecha(h.fecha) : ''}` : esc(h.logro)}</div>
        </div>
        <div class="hito-acciones">
          ${h.needsReview ? '<span class="aviso-te" title="Repasos pendientes">🍵</span>' : ''}
          <button class="boton ${h.superado ? 'boton-secundario' : 'boton-primario'} btn-hito-lec" data-codigo="${esc(h.codigo)}" style="padding:6px 12px;font-size:0.85rem">${h.superado ? '📖' : '⚡ Ejercicios'}</button>
          <button class="boton boton-secundario btn-hito-rep" data-codigo="${esc(h.codigo)}" style="padding:6px 12px;font-size:0.85rem">⚔️</button>
        </div></div>`;
    }).join('');
    return `<div class="panel-cab">
        <span class="carta-ciudad-emoji">${c.conquistada ? '🏯' : c.emoji}</span>
        <div>
          <div class="carta-ciudad-nombre">${esc(c.nombre)} <span lang="ja">${esc(c.kanji)}</span>${c.conquistada ? ' <span class="chip chip-superada">★ Conquistada</span>' : ''}</div>
          <div class="carta-ciudad-leccion">${esc(c.prefectura)} · ${esc(c.region)}${c.jlpt ? ` · <span class="chip chip-jlpt">${esc(c.jlpt)}</span>` : ''}</div>
        </div>
      </div>
      <p class="carta-ciudad-leccion" style="margin:4px 0 10px">${esc(c.lema)} · ${c.superados}/${totalReq} hitos superados</p>
      <div class="lista-hitos">${filas}</div>`;
  }

  // ---------- Render ----------
  function pintar() {
    cont.innerHTML = `
      <div class="viaje-cab">
        <div>
          <h1 class="vista-titulo">📍 El Viaje</h1>
          <p class="vista-sub">Cada estación es una lección. Se reparten solas a lo largo de Japón; supera sus ejercicios para conquistarlas. Tienes 🎫 ${juego.billetes} ${juego.billetes === 1 ? 'billete' : 'billetes'}.</p>
        </div>
      </div>
      ${lineaTren()}
      <div class="mapa-full">
        <div class="caja-mapa">
          <div class="mapa-lottie" id="lottie-japon" title="日本"></div>
          ${svgBase()}
          <div class="pref-etiqueta oculto" id="pref-nombre"></div>
          <div class="controles-mapa">
            <button class="control-mapa" id="zoom-mas" title="Acercar">＋</button>
            <button class="control-mapa" id="zoom-menos" title="Alejar">−</button>
            <button class="control-mapa" id="zoom-reset" title="Ver todo Japón">⌂</button>
          </div>
          <div class="leyenda-mapa">
            <span><i style="background:var(--acento)"></i> Actual</span>
            <span><i style="background:${ORO}"></i> Conquistada</span>
            <span><i style="background:#c9c9cf"></i> Bloqueada</span>
            <span><i style="background:#dcdce2"></i> En construcción</span>
            <span>Rueda para zoom · arrastra para mover</span>
          </div>
        </div>
      </div>
      <div class="panel-parada" id="panel-ciudad">${panelCiudad()}</div>`;
    decorarEstaciones();
    enganchar();
    if (conquista && posMap[conquista]) celebrar(conquista, ciudadConq);
  }

  // ---------- Zoom, arrastre y vuelo de cámara ----------
  const base = VISTA.split(' ').map(Number);
  let vb = [...base];
  let volando = null;
  function aplicarVb(svg) { svg.setAttribute('viewBox', vb.map(v => v.toFixed(2)).join(' ')); }
  function fijar() {
    const mx = vb[2] * 0.4, my = vb[3] * 0.4;
    vb[0] = Math.max(base[0] - mx, Math.min(base[0] + base[2] - vb[2] + mx, vb[0]));
    vb[1] = Math.max(base[1] - my, Math.min(base[1] + base[3] - vb[3] + my, vb[1]));
  }
  function zoomHacia(svg, factor, cx, cy) {
    cancelAnimationFrame(volando);
    const nw = Math.min(base[2], Math.max(base[2] / 10, vb[2] / factor));
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
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // easeInOutCubic
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
    const punteros = new Map(); let arrastre = null, seArrastro = false;
    svg.addEventListener('pointerdown', e => {
      punteros.set(e.pointerId, [e.clientX, e.clientY]);
      if (punteros.size === 1) { arrastre = { x: e.clientX, y: e.clientY, vb: [...vb] }; seArrastro = false; svg.setPointerCapture(e.pointerId); }
    });
    svg.addEventListener('pointermove', e => {
      if (!punteros.has(e.pointerId)) return;
      const previo = [...punteros.values()];
      punteros.set(e.pointerId, [e.clientX, e.clientY]);
      const r = svg.getBoundingClientRect();
      if (punteros.size === 2) {
        const [a, b] = [...punteros.values()];
        const [pa, pb] = previo.length === 2 ? previo : [a, b];
        const dA = Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) || 1, dB = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1;
        const [cx, cy] = puntoSvg(svg, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        zoomHacia(svg, dB / dA, cx, cy); seArrastro = true;
      } else if (arrastre) {
        const dx = ((e.clientX - arrastre.x) / r.width) * vb[2], dy = ((e.clientY - arrastre.y) / r.height) * vb[3];
        if (Math.abs(e.clientX - arrastre.x) + Math.abs(e.clientY - arrastre.y) > 6) seArrastro = true;
        if (seArrastro) { cancelAnimationFrame(volando); vb[0] = arrastre.vb[0] - dx; vb[1] = arrastre.vb[1] - dy; fijar(); aplicarVb(svg); }
      }
    });
    const soltar = e => { punteros.delete(e.pointerId); if (!punteros.size) arrastre = null; };
    svg.addEventListener('pointerup', soltar);
    svg.addEventListener('pointercancel', soltar);
    svg.addEventListener('click', e => { if (seArrastro) { e.stopPropagation(); seArrastro = false; } }, true);
    cont.querySelector('#zoom-mas').onclick = () => zoomHacia(svg, 1.4, vb[0] + vb[2] / 2, vb[1] + vb[3] / 2);
    cont.querySelector('#zoom-menos').onclick = () => zoomHacia(svg, 0.7, vb[0] + vb[2] / 2, vb[1] + vb[3] / 2);
    cont.querySelector('#zoom-reset').onclick = () => animarVb(svg, [...base], 500);
  }

  function seleccionarCiudad(id, codigoVuelo) {
    seleccion = id;
    cont.querySelectorAll('.estacion').forEach(n => n.classList.toggle('seleccionada', codeCiudad[n.dataset.codigo] === id));
    cont.querySelector('#panel-ciudad').innerHTML = panelCiudad();
    engancharPanel();
    if (codigoVuelo && posMap[codigoVuelo]) {
      const svg = cont.querySelector('.mapa-svg');
      volarA(svg, posMap[codigoVuelo].x, posMap[codigoVuelo].y, 2.4);
    }
  }

  function irLeccion(codigo) { sessionStorage.setItem('kotoba-leccion', codigo); location.hash = '#lecciones'; }
  function irRepaso(codigo) { sessionStorage.setItem('kotoba-ciudad', codigo); location.hash = '#repaso'; }

  function engancharPanel() {
    cont.querySelectorAll('.btn-hito-lec').forEach(b => b.onclick = () => irLeccion(b.dataset.codigo));
    cont.querySelectorAll('.btn-hito-rep').forEach(b => b.onclick = () => irRepaso(b.dataset.codigo));
    if (hitoResaltado) {
      const fila = cont.querySelector(`.hito-fila[data-hito="${hitoResaltado}"]`);
      if (fila) { fila.classList.add('resaltado'); fila.scrollIntoView({ block: 'nearest' }); }
      hitoResaltado = null;
    }
  }

  function enganchar() {
    iniciarInteraccion();
    cont.querySelectorAll('.estacion').forEach(n => {
      const code = n.dataset.codigo;
      const ciudad = codeCiudad[code];
      const ir = () => {
        if (ciudad) { hitoResaltado = code; seleccionarCiudad(ciudad, code); }
      };
      n.addEventListener('click', ir);
      n.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ir(); } });
    });
    cont.querySelectorAll('.parada-tren[data-id]').forEach(t => {
      t.addEventListener('click', () => { hitoResaltado = t.dataset.hito || null; seleccionarCiudad(t.dataset.id, t.dataset.hito); cont.querySelector('.caja-mapa').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
    });
    engancharPanel();
    engancharPrefecturas();
    animar(cont.querySelector('#lottie-japon'), 'japon');
  }

  // Al tocar una prefectura, muestra su nombre (kanji + romaji): cultura mientras juegas.
  const TIPO_PREF = { Fu: 'prefectura urbana (府)', Ken: 'prefectura (県)', To: 'metrópoli (都)', Do: 'circunscripción (道)' };
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

  // ---------- Celebración de conquista (cámara + confeti) ----------
  function celebrar(codigo, ciudadIdConq) {
    const svg = cont.querySelector('.mapa-svg');
    const pt = posMap[codigo];
    if (svg && pt) setTimeout(() => volarA(svg, pt.x, pt.y, 2.6), 200);
    const nodo = cont.querySelector(`.estacion[data-codigo="${codigo}"]`);
    if (nodo) nodo.classList.add('conquistando');
    const caja = cont.querySelector('.caja-mapa');
    const grande = !!ciudadIdConq;
    for (let i = 0; i < (grande ? 42 : 24); i++) {
      const conf = document.createElement('span');
      conf.className = 'confeti';
      conf.textContent = ['🎉', '⭐', '🌸', '🎌', '✨', '🏮'][i % 6];
      conf.style.left = `${6 + Math.random() * 88}%`;
      conf.style.animationDelay = `${Math.random() * 0.8}s`;
      conf.style.fontSize = `${12 + Math.random() * 16}px`;
      caja.appendChild(conf);
      setTimeout(() => conf.remove(), 3400);
    }
    if (ciudadIdConq && porId[ciudadIdConq] && avisar) avisar(`🏯 ¡${porId[ciudadIdConq].nombre} conquistada! Has completado todos sus hitos.`);
    else if (avisar) {
      const c = porId[seleccion];
      const h = c && c.hitos.find(x => x.codigo === codigo);
      if (h) avisar(`🏅 ¡Insignia conseguida: ${h.insignia}!`);
    }
  }

  pintar();
}
