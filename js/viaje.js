// 📍 El Viaje: mapa real de Japón, interactivo (zoom, arrastre y vuelo a cada
// parada), con la línea de tren de tu recorrido (hecho y futuro).
//
// Jerarquía: cada CIUDAD agrupa varios HITOS (las lecciones: estación, barrio,
// comida, festival...). Superar los ejercicios de un hito da su INSIGNIA LOCAL;
// completar todos los hitos conquista la ciudad. Las ciudades futuras salen en
// gris ("Próximamente") para ver la escala del viaje.
import { api } from './api.js';
import { CIUDADES, CIUDADES_FUTURAS, hitosRequeridos } from './curriculum.js';
import { PREFECTURAS, VISTA, proyectar } from './mapa-japon.js';
import { animar } from './lottie.js';

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fecha(ts) {
  return ts ? new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) : '';
}

const ORO = '#c9971c';
const ESTADO_HITO = { LOCKED: 'Bloqueado', ACTIVE: 'Disponible', COMPLETED: 'Conquistado' };

export async function vistaViaje(cont, avisar) {
  cont.innerHTML = '<p class="vista-sub">Cargando el viaje...</p>';
  const { paradas, lecciones, juego } = await api.viaje();
  const estadoPorCodigo = Object.fromEntries(paradas.map(p => [p.codigo, p]));

  // Construye el estado de cada ciudad real a partir de sus hitos (lecciones).
  const ciudades = CIUDADES.map(ciudad => {
    const hitos = ciudad.hitos
      .filter(h => estadoPorCodigo[h.codigo]) // solo hitos con contenido cargado
      .map(h => {
        const st = estadoPorCodigo[h.codigo];
        return {
          ...h, estado: st.estado, stats: st.stats, needsReview: st.needsReview,
          pendientes: st.pendientes, superado: st.estado === 'COMPLETED',
          fecha: juego.fechas ? juego.fechas[h.codigo] : null
        };
      });
    const requeridos = hitosRequeridos(ciudad.id);
    const conquistada = requeridos.length > 0 && requeridos.every(c => estadoPorCodigo[c] && estadoPorCodigo[c].estado === 'COMPLETED');
    const superados = hitos.filter(h => h.superado).length;
    return { ...ciudad, hitos, conquistada, superados, futura: false, estado: conquistada ? 'CONQUISTADA' : 'ACTIVE' };
  }).filter(c => c.hitos.length > 0);

  const futuras = CIUDADES_FUTURAS.map(c => ({ ...c, hitos: [], futura: true, estado: 'PROXIMA', conquistada: false, superados: 0 }));
  const todas = [...ciudades, ...futuras];
  const porId = Object.fromEntries(todas.map(c => [c.id, c]));

  const conquista = sessionStorage.getItem('kotoba-conquista');
  const ciudadConq = sessionStorage.getItem('kotoba-ciudad-conq');
  sessionStorage.removeItem('kotoba-conquista');
  sessionStorage.removeItem('kotoba-ciudad-conq');

  const recordada = sessionStorage.getItem('kotoba-sel');
  sessionStorage.removeItem('kotoba-sel');
  let seleccion = (recordada && porId[recordada]) ? recordada
    : (ciudades.find(c => !c.conquistada) || ciudades[0] || todas[0])?.id;
  let hitoResaltado = conquista || null;

  function colorCiudad(c) {
    if (c.conquistada) return ORO;
    if (c.estado === 'ACTIVE') return 'var(--acento)';
    return '#c9c9cf';
  }

  // ---------- Mapa SVG ----------
  function construirMapa() {
    const prefs = PREFECTURAS.map(pr => `<path d="${pr.d}" class="pref"><title>${esc(pr.nombre)}</title></path>`).join('');

    // Vías entre ciudades reales consecutivas + hacia las futuras.
    let vias = '';
    const secuencia = [...ciudades, ...futuras];
    for (let i = 0; i < secuencia.length - 1; i++) {
      const a = proyectar(secuencia[i].lat, secuencia[i].lon);
      const b = proyectar(secuencia[i + 1].lat, secuencia[i + 1].lon);
      const hecha = secuencia[i].conquistada && secuencia[i + 1].conquistada;
      const futura = secuencia[i].futura || secuencia[i + 1].futura;
      vias += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}"
        class="ruta ${hecha ? 'ruta-hecha' : ''} ${futura ? 'ruta-futura' : ''}" data-desde="${esc(secuencia[i].id)}"/>`;
    }

    const nodos = todas.map(c => {
      const { x, y } = proyectar(c.lat, c.lon);
      const sel = c.id === seleccion ? 'seleccionada' : '';
      const dx = c.dxEtiqueta || 0, dy = c.dyEtiqueta || 0;
      const etiquetaY = dy >= 0 ? y + 15 + dy : y - 9 + dy;
      let nucleo;
      if (c.futura) {
        nucleo = `<circle cx="${x}" cy="${y}" r="4.5" class="nodo-forma nodo-futura" fill="${colorCiudad(c)}"/>`;
      } else {
        const halo = !c.conquistada ? `<circle cx="${x}" cy="${y}" r="7.5" class="nodo-halo"/>` : '';
        nucleo = `${halo}<circle cx="${x}" cy="${y}" r="7.5" class="nodo-forma" fill="${colorCiudad(c)}"/>
                  <text x="${x}" y="${y + 3.4}" class="nodo-emoji">${c.conquistada ? '★' : ''}</text>`;
      }
      const badge = !c.futura && c.hitos.length
        ? `<text x="${x}" y="${y - 11}" class="nodo-progreso">${c.superados}/${c.hitos.filter(h => !h.bonus).length}</text>` : '';
      return `
        <g class="nodo ${sel}" data-id="${esc(c.id)}" tabindex="0" role="button"
           aria-label="${esc(c.nombre)}: ${c.futura ? 'Próximamente' : (c.conquistada ? 'Conquistada' : 'En curso')}">
          <circle cx="${x}" cy="${y}" r="10" fill="transparent"/>
          ${nucleo}${badge}
          <text x="${x + dx}" y="${etiquetaY}" class="mapa-etiqueta ${c.futura ? 'etiqueta-futura' : ''}">${esc(c.nombre)}</text>
        </g>`;
    }).join('');

    return `<svg viewBox="${VISTA}" class="mapa-svg" role="img" aria-label="Mapa del viaje por Japón">
      ${prefs}${vias}${nodos}
    </svg>`;
  }

  // ---------- Línea de tren (recorrido lineal) ----------
  function lineaTren() {
    const totalReq = ciudades.reduce((n, c) => n + c.hitos.filter(h => !h.bonus).length, 0);
    const hechos = ciudades.reduce((n, c) => n + c.hitos.filter(h => h.superado && !h.bonus).length, 0);

    let tramos = ciudades.map(c => {
      const paradas = c.hitos.map(h => {
        const clase = h.superado ? 'hecha' : h.estado === 'ACTIVE' ? 'actual' : 'cerrada';
        const icono = h.superado ? '✓' : h.estado === 'ACTIVE' ? h.emoji : '🔒';
        return `
          <button class="parada-tren ${clase} ${h.codigo === seleccion + '::' + h.codigo ? '' : ''}" data-id="${esc(c.id)}" data-hito="${esc(h.codigo)}"
                  title="${esc(h.nombre)} · ${ESTADO_HITO[h.estado]}">
            <span class="pt-punto">${icono}</span>
            <span class="pt-nombre">${esc(h.nombre)}</span>
          </button>`;
      }).join('');
      return `<div class="tren-ciudad ${c.conquistada ? 'conq' : ''}">
        <div class="tren-ciudad-nombre">${c.conquistada ? '★ ' : ''}${c.emoji} ${esc(c.nombre)}</div>
        <div class="tren-paradas">${paradas}</div>
      </div>`;
    }).join('<span class="tren-flecha">→</span>');

    const futurasTren = futuras.slice(0, 6).map(c =>
      `<button class="parada-tren futura" data-id="${esc(c.id)}" title="${esc(c.nombre)} (próximamente)">
        <span class="pt-punto">·</span><span class="pt-nombre">${esc(c.nombre)}</span>
      </button>`).join('');

    return `
      <div class="linea-tren">
        <div class="linea-tren-cab">
          <b>🚄 Tu recorrido</b>
          <span>${hechos} de ${totalReq} hitos · ${ciudades.filter(c => c.conquistada).length} ciudad(es) conquistada(s)</span>
        </div>
        <div class="linea-tren-pista">
          ${tramos}
          <span class="tren-flecha">→</span>
          <div class="tren-ciudad futuro-bloque">
            <div class="tren-ciudad-nombre">Próximas ciudades</div>
            <div class="tren-paradas">${futurasTren}</div>
          </div>
        </div>
      </div>`;
  }

  // ---------- Panel de la ciudad seleccionada ----------
  function panelCiudad() {
    const c = porId[seleccion];
    if (!c) return '';
    if (c.futura) {
      return `
        <div class="panel-cab">
          <span class="carta-ciudad-emoji">${c.emoji}</span>
          <div>
            <div class="carta-ciudad-nombre">${esc(c.nombre)} <span lang="ja">${esc(c.kanji)}</span></div>
            <div class="carta-ciudad-leccion">${esc(c.prefectura)} · ${esc(c.region)} · <span class="chip chip-jlpt">${esc(c.jlpt)}</span></div>
          </div>
        </div>
        <p class="panel-nota">🚧 Próximamente. Esta ciudad se abrirá cuando exportes nuevas lecciones del chat: cada paquete de lecciones conquista una ciudad nueva.</p>`;
    }

    const totalReq = c.hitos.filter(h => !h.bonus).length;
    const filasHitos = c.hitos.map(h => {
      const clase = h.superado ? 'superado' : h.estado === 'ACTIVE' ? 'activo' : 'bloqueado';
      return `
        <div class="hito-fila ${clase}" data-hito="${esc(h.codigo)}">
          <span class="hito-emoji">${h.superado ? h.emoji : (h.estado === 'ACTIVE' ? h.emoji : '🔒')}</span>
          <div class="hito-texto">
            <div class="hito-nombre">${esc(h.nombre)} <span lang="ja">${esc(h.kanji)}</span>${h.bonus ? ' <span class="chip chip-bonus">Bonus</span>' : ''}</div>
            <div class="hito-logro">${h.superado ? `🏅 ${esc(h.insignia)}${h.fecha ? ' · ' + fecha(h.fecha) : ''}` : esc(h.logro)}</div>
          </div>
          <div class="hito-acciones">
            ${h.needsReview ? '<span class="aviso-te" title="Repasos pendientes">🍵</span>' : ''}
            <button class="boton ${h.superado ? 'boton-secundario' : 'boton-primario'} btn-hito-lec" data-codigo="${esc(h.codigo)}" style="padding:6px 12px;font-size:0.85rem">${h.superado ? '📖' : '⚡ Ejercicios'}</button>
            <button class="boton boton-secundario btn-hito-rep" data-codigo="${esc(h.codigo)}" style="padding:6px 12px;font-size:0.85rem">⚔️</button>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="panel-cab">
        <span class="carta-ciudad-emoji">${c.conquistada ? '🏯' : c.emoji}</span>
        <div>
          <div class="carta-ciudad-nombre">${esc(c.nombre)} <span lang="ja">${esc(c.kanji)}</span>${c.conquistada ? ' <span class="chip chip-superada">★ Conquistada</span>' : ''}</div>
          <div class="carta-ciudad-leccion">${esc(c.prefectura)} · ${esc(c.region)} · <span class="chip chip-jlpt">${esc(c.jlpt)}</span></div>
        </div>
      </div>
      <p class="carta-ciudad-leccion" style="margin:4px 0 10px">${esc(c.lema)} · ${c.superados}/${totalReq} hitos superados</p>
      <div class="lista-hitos">${filasHitos}</div>`;
  }

  // ---------- Render + interacción ----------
  function pintar() {
    const totalBilletes = juego.billetes;
    cont.innerHTML = `
      <h1 class="vista-titulo">📍 El Viaje</h1>
      <p class="vista-sub">Cada lección es un hito de una ciudad (una estación, un barrio, una comida, un festival). Supéralos para conquistar la ciudad. Tienes 🎫 ${totalBilletes} ${totalBilletes === 1 ? 'billete' : 'billetes'}.</p>
      ${lineaTren()}
      <div class="zona-viaje">
        <div class="col-mapa">
          <div class="caja-mapa">
            <div class="mapa-lottie" id="lottie-japon" title="日本"></div>
            ${construirMapa()}
            <div class="controles-mapa">
              <button class="control-mapa" id="zoom-mas" title="Acercar">＋</button>
              <button class="control-mapa" id="zoom-menos" title="Alejar">−</button>
              <button class="control-mapa" id="zoom-reset" title="Ver todo Japón">⌂</button>
            </div>
            <div class="leyenda-mapa">
              <span><i style="background:var(--acento)"></i> En curso</span>
              <span><i style="background:${ORO}"></i> Conquistada</span>
              <span><i style="background:#c9c9cf"></i> Próximamente</span>
              <span>Arrastra y usa la rueda para explorar</span>
            </div>
          </div>
          <div class="panel-parada" id="panel-ciudad">${panelCiudad()}</div>
        </div>
      </div>`;
    enganchar();
    if (conquista && porId[seleccion]) celebrar(conquista, ciudadConq);
  }

  // ---------- Zoom, arrastre y vuelo ----------
  const base = VISTA.split(' ').map(Number);
  let vb = [...base];
  let volando = null;

  function aplicarVb(svg) { svg.setAttribute('viewBox', vb.map(v => v.toFixed(2)).join(' ')); }
  function fijar() {
    const mx = vb[2] * 0.35, my = vb[3] * 0.35;
    vb[0] = Math.max(base[0] - mx, Math.min(base[0] + base[2] - vb[2] + mx, vb[0]));
    vb[1] = Math.max(base[1] - my, Math.min(base[1] + base[3] - vb[3] + my, vb[1]));
  }
  function zoomHacia(svg, factor, cx, cy) {
    cancelAnimationFrame(volando);
    const nw = Math.min(base[2], Math.max(base[2] / 9, vb[2] / factor));
    const escala = nw / vb[2];
    vb[0] = cx - (cx - vb[0]) * escala;
    vb[1] = cy - (cy - vb[1]) * escala;
    vb[2] *= escala; vb[3] *= escala;
    fijar(); aplicarVb(svg);
  }
  function puntoSvg(svg, clientX, clientY) {
    const r = svg.getBoundingClientRect();
    return [vb[0] + ((clientX - r.left) / r.width) * vb[2], vb[1] + ((clientY - r.top) / r.height) * vb[3]];
  }
  function animarVb(svg, hasta, dur = 480) {
    cancelAnimationFrame(volando);
    const desde = [...vb], inicio = performance.now();
    const paso = ahora => {
      const t = Math.min(1, (ahora - inicio) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      vb = desde.map((v, i) => v + (hasta[i] - v) * e);
      aplicarVb(svg);
      if (t < 1) volando = requestAnimationFrame(paso);
    };
    volando = requestAnimationFrame(paso);
  }
  function volarA(svg, x, y, anchoObjetivo) {
    const w = anchoObjetivo || Math.min(vb[2], base[2] / 2.6);
    const h = w * base[3] / base[2];
    animarVb(svg, [x - w / 2, y - h / 2, w, h]);
  }

  function iniciarInteraccion() {
    const svg = cont.querySelector('.mapa-svg');
    if (!svg) return;
    aplicarVb(svg);
    svg.addEventListener('wheel', e => {
      e.preventDefault();
      const [cx, cy] = puntoSvg(svg, e.clientX, e.clientY);
      zoomHacia(svg, e.deltaY < 0 ? 1.25 : 0.8, cx, cy);
    }, { passive: false });

    const punteros = new Map();
    let arrastre = null, seArrastro = false;
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
        const dA = Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) || 1;
        const dB = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1;
        const [cx, cy] = puntoSvg(svg, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        zoomHacia(svg, dB / dA, cx, cy); seArrastro = true;
      } else if (arrastre) {
        const dx = ((e.clientX - arrastre.x) / r.width) * vb[2];
        const dy = ((e.clientY - arrastre.y) / r.height) * vb[3];
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
    cont.querySelector('#zoom-reset').onclick = () => animarVb(svg, [...base], 420);
  }

  function seleccionar(id, conVuelo = true) {
    seleccion = id;
    cont.querySelectorAll('.nodo').forEach(n => n.classList.toggle('seleccionada', n.dataset.id === id));
    cont.querySelector('#panel-ciudad').innerHTML = panelCiudad();
    engancharPanel();
    const c = porId[id];
    if (conVuelo && c) {
      const svg = cont.querySelector('.mapa-svg');
      const { x, y } = proyectar(c.lat, c.lon);
      volarA(svg, x, y, c.futura ? base[2] / 2 : base[2] / 3.2);
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
    cont.querySelectorAll('.nodo').forEach(n => {
      n.addEventListener('click', () => seleccionar(n.dataset.id));
      n.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); seleccionar(n.dataset.id); } });
    });
    cont.querySelectorAll('.parada-tren').forEach(t => {
      t.addEventListener('click', () => {
        hitoResaltado = t.dataset.hito || null;
        seleccionar(t.dataset.id);
        cont.querySelector('.caja-mapa').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });
    engancharPanel();
    animar(cont.querySelector('#lottie-japon'), 'japon');
  }

  // ---------- Celebración de conquista ----------
  function celebrar(codigoHito, ciudadIdConq) {
    const c = porId[seleccion];
    const svg = cont.querySelector('.mapa-svg');
    if (svg && c) { const { x, y } = proyectar(c.lat, c.lon); setTimeout(() => volarA(svg, x, y, base[2] / 3.6), 200); }
    const nodo = cont.querySelector(`.nodo[data-id="${seleccion}"]`);
    if (nodo) nodo.classList.add('conquistando');

    const caja = cont.querySelector('.caja-mapa');
    const grande = !!ciudadIdConq;
    for (let i = 0; i < (grande ? 40 : 22); i++) {
      const conf = document.createElement('span');
      conf.className = 'confeti';
      conf.textContent = ['🎉', '⭐', '🌸', '🎌', '✨', '🏮'][i % 6];
      conf.style.left = `${6 + Math.random() * 88}%`;
      conf.style.animationDelay = `${Math.random() * 0.8}s`;
      conf.style.fontSize = `${12 + Math.random() * 16}px`;
      caja.appendChild(conf);
      setTimeout(() => conf.remove(), 3400);
    }
    if (ciudadIdConq && porId[ciudadIdConq] && avisar) {
      avisar(`🏯 ¡${porId[ciudadIdConq].nombre} conquistada! Has completado todos sus hitos.`);
    } else if (avisar) {
      const hito = c && c.hitos.find(h => h.codigo === codigoHito);
      if (hito) avisar(`🏅 ¡Insignia conseguida: ${hito.insignia}!`);
    }
  }

  pintar();
}
