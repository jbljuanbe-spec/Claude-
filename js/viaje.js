// 📍 El Viaje: mapa real de Japón a pantalla completa e interactivo.
// UN PUNTO POR CIUDAD (no por lección): todas las lecciones de una ciudad son
// barrios/hitos DENTRO de ella. Cada lección superada da la insignia de su
// barrio/comida/festival; completar TODA la ciudad da un billete de Shinkansen
// para viajar a la siguiente. Las ciudades futuras salen en gris.
import { api } from './api.js';
import { CIUDADES, CIUDADES_FUTURAS, ciudadDeLeccion } from './curriculum.js';
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
const SVGNS = 'http://www.w3.org/2000/svg';
const TIPO_PREF = { Fu: 'prefectura urbana (府)', Ken: 'prefectura (県)', To: 'metrópoli (都)', Do: 'circunscripción (道)' };

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
    const req = ciudad.hitos.filter(h => !h.bonus).map(h => h.codigo).filter(c => estadoPorCodigo[c]);
    const conquistada = req.length > 0 && req.every(c => estadoPorCodigo[c].estado === 'COMPLETED');
    const bloqueada = hitos.length > 0 && hitos.every(h => h.estado === 'LOCKED');
    return { ...ciudad, hitos, conquistada, bloqueada, superados: hitos.filter(h => h.superado).length, futura: false };
  }).filter(c => c.hitos.length);

  // Lecciones nuevas aún sin ciudad temática: grupo aparte (no va al mapa).
  const mapeadas = new Set(Object.keys(codeCiudad));
  const huerfanas = paradas.filter(p => /^L\d+$/.test(p.codigo) && !mapeadas.has(p.codigo));
  let ciudadNuevas = null;
  if (huerfanas.length) {
    const hitos = huerfanas.map(p => {
      codeCiudad[p.codigo] = 'nuevas';
      const c = ciudadDeLeccion(p.codigo);
      return { codigo: p.codigo, nombre: c.nombre, kanji: c.kanji, emoji: '📍', tipo: 'hito',
        insignia: `Lección ${p.codigo}`, logro: lecciones[p.codigo] || 'Nueva lección',
        estado: p.estado, stats: p.stats, needsReview: p.needsReview, pendientes: p.pendientes,
        superado: p.estado === 'COMPLETED', fecha: juego.fechas ? juego.fechas[p.codigo] : null };
    });
    ciudadNuevas = { id: 'nuevas', nombre: 'Nuevas lecciones', kanji: '新', emoji: '🆕', prefectura: '—',
      region: '—', jlpt: '', lema: 'Lecciones recién añadidas, aún sin ciudad temática asignada.', hitos,
      conquistada: false, bloqueada: false, superados: hitos.filter(h => h.superado).length, futura: false };
  }

  const futuras = CIUDADES_FUTURAS.map(c => ({ ...c, hitos: [], futura: true, conquistada: false, bloqueada: true, superados: 0 }));
  const enMapa = [...ciudades, ...futuras];                 // lo que se dibuja como nodo
  const porId = Object.fromEntries([...ciudades, ...(ciudadNuevas ? [ciudadNuevas] : []), ...futuras].map(c => [c.id, c]));

  // Prefecturas: fondo dorado al conquistar su ciudad; tinte suave en progreso.
  const prefEstado = {};
  ciudades.forEach(c => { if (c.pref) prefEstado[c.pref] = c.conquistada ? 'conquistada' : (c.superados > 0 ? 'progreso' : prefEstado[c.pref] || ''); });

  const conquista = sessionStorage.getItem('kotoba-conquista');
  const ciudadConq = sessionStorage.getItem('kotoba-ciudad-conq');
  sessionStorage.removeItem('kotoba-conquista');
  sessionStorage.removeItem('kotoba-ciudad-conq');
  const recordada = sessionStorage.getItem('kotoba-sel');
  sessionStorage.removeItem('kotoba-sel');
  let seleccion = (recordada && porId[recordada]) ? recordada
    : (ciudades.find(c => !c.conquistada && !c.bloqueada) || ciudades[0] || enMapa[0])?.id;
  let hitoResaltado = conquista || null;

  function colorCiudad(c) {
    if (c.conquistada) return ORO;
    if (c.futura || c.bloqueada) return '#c7c7ce';
    return 'var(--acento)';
  }

  // ---------- Mapa ----------
  function svgBase() {
    const prefs = PREFECTURAS.map(pr => {
      const e = prefEstado[pr.nombre];
      const clase = 'pref' + (e === 'conquistada' ? ' pref-conquistada' : e === 'progreso' ? ' pref-progreso' : '');
      return `<path d="${pr.d}" class="${clase}" data-nombre="${esc(pr.nombre)}" data-rom="${esc(pr.rom || '')}"><title>${esc(pr.nombre)}</title></path>`;
    }).join('');

    // Vía del tren a través de las ciudades (curva suave). Dorada la parte ya hecha.
    const pos = enMapa.map(c => proyectar(c.lat, c.lon));
    const viaBase = bezierDesdePuntos(pos);
    let goldN = 0;
    while (goldN < ciudades.length && ciudades[goldN].conquistada) goldN++;
    const viaOro = goldN >= 2 ? bezierDesdePuntos(pos.slice(0, goldN)) : '';

    const nodos = enMapa.map(c => {
      const { x, y } = proyectar(c.lat, c.lon);
      const dx = c.dxEtiqueta || 0, dy = c.dyEtiqueta || 0;
      const etiquetaY = dy >= 0 ? y + 16 + dy : y - 10 + dy;
      const sel = c.id === seleccion ? 'seleccionada' : '';
      let nucleo;
      if (c.futura) {
        nucleo = `<circle cx="${x}" cy="${y}" r="5" class="nodo-forma nodo-futura" fill="${colorCiudad(c)}"/>`;
      } else {
        const halo = (!c.conquistada && !c.bloqueada) ? `<circle cx="${x}" cy="${y}" r="8.5" class="nodo-halo"/>` : '';
        nucleo = `${halo}<circle cx="${x}" cy="${y}" r="8.5" class="nodo-forma" fill="${colorCiudad(c)}"/>
          <text x="${x}" y="${y + 3.6}" class="nodo-emoji">${c.conquistada ? '★' : ''}</text>`;
      }
      const total = c.hitos.filter(h => !h.bonus).length;
      const badge = (!c.futura && total) ? `<text x="${x}" y="${y - 12}" class="nodo-progreso">${c.superados}/${total}</text>` : '';
      const te = c.hitos.some(h => h.needsReview) ? `<text x="${x + 9}" y="${y - 6}" class="nodo-te">🍵</text>` : '';
      return `
        <g class="nodo ${sel}" data-id="${esc(c.id)}" tabindex="0" role="button"
           aria-label="${esc(c.nombre)}: ${c.futura ? 'Próximamente' : c.conquistada ? 'Conquistada' : c.bloqueada ? 'Bloqueada' : 'En curso'}">
          <circle cx="${x}" cy="${y}" r="12" fill="transparent"/>
          ${nucleo}${badge}${te}
          <text x="${x + dx}" y="${etiquetaY}" class="mapa-etiqueta ${c.futura ? 'etiqueta-futura' : ''}">${esc(c.nombre)}</text>
        </g>`;
    }).join('');

    return `<svg viewBox="${VISTA}" class="mapa-svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mapa del viaje por Japón">
      ${prefs}
      <path class="via-base" d="${viaBase}"/>
      ${viaOro ? `<path class="via-progreso-fija" d="${viaOro}"/>` : ''}
      ${nodos}
    </svg>`;
  }

  // ---------- Línea de tren ----------
  function lineaTren() {
    const grupos = [...ciudades, ...(ciudadNuevas ? [ciudadNuevas] : [])];
    const totalReq = grupos.reduce((n, c) => n + c.hitos.filter(h => !h.bonus).length, 0);
    const hechos = grupos.reduce((n, c) => n + c.hitos.filter(h => h.superado && !h.bonus).length, 0);
    const tramos = grupos.map(c => {
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

  // ---------- Panel de la ciudad ----------
  function panelCiudad() {
    const c = porId[seleccion];
    if (!c) return '';
    if (c.futura || (c.bloqueada && !c.hitos.length)) {
      return `<div class="panel-cab"><span class="carta-ciudad-emoji">${c.emoji}</span>
          <div><div class="carta-ciudad-nombre">${esc(c.nombre)} <span lang="ja">${esc(c.kanji)}</span></div>
          <div class="carta-ciudad-leccion">${esc(c.prefectura)} · ${esc(c.region)}${c.jlpt ? ` · <span class="chip chip-jlpt">${esc(c.jlpt)}</span>` : ''}</div></div></div>
        <p class="panel-nota">🚧 Próximamente. Esta ciudad se abrirá cuando exportes nuevas lecciones del chat: cada paquete de lecciones conquista una ciudad y te da el billete de Shinkansen para viajar aquí.</p>
        ${juego.billetes > 0 ? `<button class="boton boton-primario" id="btn-billete">🎫 Usar billete de Shinkansen para adelantar (${juego.billetes})</button>` : ''}`;
    }
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
    return `<div class="panel-cab"><span class="carta-ciudad-emoji">${c.conquistada ? '🏯' : c.emoji}</span>
        <div><div class="carta-ciudad-nombre">${esc(c.nombre)} <span lang="ja">${esc(c.kanji)}</span>${c.conquistada ? ' <span class="chip chip-superada">★ Conquistada</span>' : ''}</div>
        <div class="carta-ciudad-leccion">${esc(c.prefectura)} · ${esc(c.region)}${c.jlpt ? ` · <span class="chip chip-jlpt">${esc(c.jlpt)}</span>` : ''}</div></div></div>
      <p class="carta-ciudad-leccion" style="margin:4px 0 10px">${esc(c.lema || '')} · ${c.superados}/${totalReq} barrios conquistados${totalReq && c.superados === totalReq ? ' · 🎫 billete conseguido' : ''}</p>
      <div class="lista-hitos">${filas}</div>`;
  }

  // ---------- Render ----------
  function pintar() {
    cont.innerHTML = `
      <div class="viaje-cab"><div>
        <h1 class="vista-titulo">📍 El Viaje</h1>
        <p class="vista-sub">Un punto por ciudad. Cada lección es un barrio/hito dentro de ella con su insignia; completa toda la ciudad para ganar el 🎫 billete de Shinkansen y viajar a la siguiente. Tienes 🎫 ${juego.billetes}.</p>
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
          <span><i style="background:${ORO}"></i> Conquistada</span>
          <span><i style="background:#c7c7ce"></i> Próximamente</span>
          <span>Toca una prefectura para ver su nombre</span>
        </div>
      </div></div>
      <div class="panel-parada" id="panel-ciudad">${panelCiudad()}</div>`;
    enganchar();
    if (conquista && porId[seleccion]) celebrar(conquista, ciudadConq);
  }

  // ---------- Zoom, arrastre y vuelo ----------
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
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      vb = desde.map((v, i) => v + (hasta[i] - v) * e);
      aplicarVb(svg);
      if (t < 1) volando = requestAnimationFrame(paso);
    };
    volando = requestAnimationFrame(paso);
  }
  function volarA(svg, x, y, zoom = 2.4) {
    const w = base[2] / zoom, h = base[3] / zoom;
    animarVb(svg, [x - w / 2, y - h / 2, w, h]);
  }
  function iniciarInteraccion() {
    const svg = cont.querySelector('.mapa-svg');
    if (!svg) return;
    aplicarVb(svg);
    svg.addEventListener('wheel', e => { e.preventDefault(); const [cx, cy] = puntoSvg(svg, e.clientX, e.clientY); zoomHacia(svg, e.deltaY < 0 ? 1.25 : 0.8, cx, cy); }, { passive: false });
    // Importante: NO se captura el puntero en el pointerdown. Si se hace de
    // entrada, el navegador retarget-ea el "click" resultante al propio <svg>
    // en vez de al elemento tocado (.pref, .nodo...), y los taps dejan de
    // llegar a sus listeners. Solo se captura una vez confirmado el arrastre
    // real (movimiento > umbral), así un simple tap sigue siendo un click normal.
    const punteros = new Map(); let arrastre = null, seArrastro = false, capturado = null;
    svg.addEventListener('pointerdown', e => {
      punteros.set(e.pointerId, [e.clientX, e.clientY]);
      if (punteros.size === 1) { arrastre = { x: e.clientX, y: e.clientY, vb: [...vb] }; seArrastro = false; }
    });
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
        if (!seArrastro && Math.abs(e.clientX - arrastre.x) + Math.abs(e.clientY - arrastre.y) > 6) {
          seArrastro = true;
          if (capturado === null) { capturado = e.pointerId; svg.setPointerCapture(capturado); }
        }
        if (seArrastro) {
          const dx = ((e.clientX - arrastre.x) / r.width) * vb[2], dy = ((e.clientY - arrastre.y) / r.height) * vb[3];
          cancelAnimationFrame(volando); vb[0] = arrastre.vb[0] - dx; vb[1] = arrastre.vb[1] - dy; fijar(); aplicarVb(svg);
        }
      }
    });
    const soltar = e => {
      punteros.delete(e.pointerId);
      if (capturado === e.pointerId) { try { svg.releasePointerCapture(capturado); } catch {} capturado = null; }
      if (!punteros.size) arrastre = null;
    };
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
    const c = porId[id];
    if (conVuelo && c && c.lat != null) {
      const svg = cont.querySelector('.mapa-svg');
      const { x, y } = proyectar(c.lat, c.lon);
      volarA(svg, x, y, c.futura ? 2 : 2.6);
    }
  }

  function irLeccion(codigo) { sessionStorage.setItem('kotoba-leccion', codigo); location.hash = '#lecciones'; }
  function irRepaso(codigo) { sessionStorage.setItem('kotoba-ciudad', codigo); location.hash = '#repaso'; }

  function engancharPanel() {
    cont.querySelectorAll('.btn-hito-lec').forEach(b => b.onclick = () => irLeccion(b.dataset.codigo));
    cont.querySelectorAll('.btn-hito-rep').forEach(b => b.onclick = () => irRepaso(b.dataset.codigo));
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
  function celebrar(codigo, ciudadIdConq) {
    const cid = codeCiudad[codigo];
    const c = porId[cid];
    const svg = cont.querySelector('.mapa-svg');
    if (svg && c && c.lat != null) { const { x, y } = proyectar(c.lat, c.lon); setTimeout(() => volarA(svg, x, y, 2.6), 200); }
    const nodo = cont.querySelector(`.nodo[data-id="${cid}"]`);
    if (nodo) nodo.classList.add('conquistando');
    const caja = cont.querySelector('.caja-mapa');
    const grande = !!ciudadIdConq;
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
    if (ciudadIdConq && porId[ciudadIdConq] && porId[ciudadIdConq].pref) {
      cont.querySelectorAll(`.pref[data-nombre="${porId[ciudadIdConq].pref}"]`).forEach(pr => {
        pr.classList.add('pref-conquistada', 'pref-recien');
        pr.addEventListener('animationend', () => pr.classList.remove('pref-recien'), { once: true });
      });
      if (avisar) avisar(`🏯 ¡${porId[ciudadIdConq].nombre} conquistada! Se ilumina su prefectura y ganas un billete de Shinkansen.`);
    } else if (avisar) {
      const h = c && c.hitos.find(x => x.codigo === codigo);
      if (h) avisar(`🏅 ¡Insignia conseguida: ${h.insignia}!`);
    }
  }

  pintar();
}
