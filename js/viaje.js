// 📍 El Viaje: mapa real de Japón con la ruta de aprendizaje por paradas.
// Una parada se supera SOLO aprobando los ejercicios de su lección (pestaña
// Lecciones); al conseguirlo, aquí se dispara la animación de conquista.
import { api } from './api.js';
import { ciudadDeLeccion, TIERS } from './ciudades.js';
import { PREFECTURAS, VISTA, proyectar } from './mapa-japon.js';
import { animar } from './lottie.js';
import { TOTAL_PREVISTO } from './roadmap.js';

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const ORO = '#c9971c';
const NOMBRE_ESTADO = { LOCKED: 'Bloqueada', ACTIVE: 'Parada actual', COMPLETED: 'Superada' };
const CONOCIDAS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'General'];

export async function vistaViaje(cont, avisar) {
  cont.innerHTML = '<p class="vista-sub">Cargando el viaje...</p>';
  const { paradas, lecciones, juego } = await api.viaje();

  let extra = 0;
  const conCiudad = paradas.map(p => ({
    ...p,
    ciudad: ciudadDeLeccion(p.codigo, CONOCIDAS.includes(p.codigo) ? 0 : extra++)
  }));
  const ruta = conCiudad.filter(p => p.codigo !== 'General').sort((a, b) => a.orden - b.orden);
  const porCodigo = Object.fromEntries(conCiudad.map(p => [p.codigo, p]));

  const conquista = sessionStorage.getItem('kotoba-conquista');
  sessionStorage.removeItem('kotoba-conquista');

  const recordada = conquista || sessionStorage.getItem('kotoba-sel');
  sessionStorage.removeItem('kotoba-sel');
  let seleccion = (recordada && porCodigo[recordada]) ? recordada
    : (ruta.find(p => p.estado === 'ACTIVE') || ruta[0] || conCiudad[0])?.codigo;

  function colorNodo(p) {
    if (p.estado === 'COMPLETED') return ORO;
    if (p.estado === 'ACTIVE') return 'var(--acento)';
    return p.hasContent ? '#c9c9cf' : '#dcdce2';
  }

  function construirMapa() {
    const prefs = PREFECTURAS.map(pr =>
      `<path d="${pr.d}" class="pref"><title>${esc(pr.nombre)}</title></path>`).join('');

    let rutaSvg = '';
    for (let i = 0; i < ruta.length - 1; i++) {
      const a = proyectar(ruta[i].ciudad.lat, ruta[i].ciudad.lon);
      const b = proyectar(ruta[i + 1].ciudad.lat, ruta[i + 1].ciudad.lon);
      const hecha = ruta[i].estado === 'COMPLETED' && ruta[i + 1].estado === 'COMPLETED';
      const viva = ruta[i].estado === 'COMPLETED' && ruta[i + 1].estado !== 'COMPLETED';
      rutaSvg += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}"
        class="ruta ${hecha || viva ? 'ruta-hecha' : ''}" data-desde="${esc(ruta[i].codigo)}"/>`;
    }

    const nodos = conCiudad.map(p => {
      const { x, y } = proyectar(p.ciudad.lat, p.ciudad.lon);
      const sel = p.codigo === seleccion ? 'seleccionada' : '';
      const dx = p.ciudad.dxEtiqueta || 0, dy = p.ciudad.dyEtiqueta || 0;
      const etiquetaY = dy >= 0 ? y + 13 + dy : y - 8 + dy;
      let nucleo;
      if (p.codigo === 'General') {
        nucleo = `<path d="M${x - 7},${y + 4} L${x},${y - 7} L${x + 7},${y + 4} Z" class="nodo-forma" fill="${colorNodo(p)}"/>`;
      } else if (!p.hasContent) {
        nucleo = `<circle cx="${x}" cy="${y}" r="4" class="nodo-forma nodo-futura" fill="${colorNodo(p)}"/>`;
      } else if (p.estado === 'LOCKED') {
        nucleo = `<circle cx="${x}" cy="${y}" r="5.5" class="nodo-forma" fill="${colorNodo(p)}"/>
                  <text x="${x}" y="${y + 3}" class="nodo-candado">🔒</text>`;
      } else {
        const halo = p.estado === 'ACTIVE' ? `<circle cx="${x}" cy="${y}" r="6.5" class="nodo-halo"/>` : '';
        nucleo = `${halo}<circle cx="${x}" cy="${y}" r="6.5" class="nodo-forma" fill="${colorNodo(p)}"/>`;
      }
      const te = p.needsReview && p.estado !== 'LOCKED'
        ? `<text x="${x + 8}" y="${y - 6}" class="nodo-te">🍵</text>` : '';
      const etiqueta = p.hasContent ? esc(p.ciudad.nombre) : esc(p.codigo);
      return `
        <g class="nodo ${sel}" data-codigo="${esc(p.codigo)}" tabindex="0" role="button"
           aria-label="${esc(p.ciudad.nombre)}: ${p.hasContent ? NOMBRE_ESTADO[p.estado] : 'Próximamente'}">
          <circle cx="${x}" cy="${y}" r="13" fill="transparent"/>
          ${nucleo}${te}
          <text x="${x + dx}" y="${etiquetaY}" class="mapa-etiqueta ${p.hasContent ? '' : 'etiqueta-futura'}">${etiqueta}</text>
        </g>`;
    }).join('');

    return `<svg viewBox="${VISTA}" class="mapa-svg" role="img" aria-label="Mapa del viaje por Japón">
      ${prefs}${rutaSvg}${nodos}
    </svg>`;
  }

  function panelParada() {
    const p = porCodigo[seleccion];
    if (!p) return '';
    const c = p.ciudad;
    const idx = ruta.findIndex(r => r.codigo === p.codigo);
    const anterior = idx > 0 ? ruta[idx - 1] : null;

    if (!p.hasContent) {
      return `
        <div class="panel-cab">
          <span class="carta-ciudad-emoji">🚧</span>
          <div>
            <div class="carta-ciudad-nombre">${esc(c.nombre)} <span lang="ja">${esc(c.kanji)}</span></div>
            <div class="carta-ciudad-leccion">${esc(p.codigo)} · Próximamente</div>
          </div>
        </div>
        <p class="panel-nota">Esta parada aún no tiene contenido. El viaje está trazado hasta la lección ${TOTAL_PREVISTO}: cuando exportes nuevas lecciones del chat, irán ocupando estas estaciones.</p>`;
    }

    const tiers = TIERS.map(t => ({ ...t, ganada: juego.insignias.includes(`${p.codigo}:${t.id}`) }));
    let acciones = '';
    if (p.estado === 'LOCKED') {
      acciones = `
        <p class="panel-nota">🔒 Se desbloquea al superar los ejercicios de ${anterior ? `<b>${esc(anterior.ciudad.nombre)}</b>` : 'la parada anterior'} (o con un billete).</p>
        ${juego.billetes > 0
          ? `<button class="boton boton-primario" id="btn-billete">🎫 Usar un billete de Shinkansen (tienes ${juego.billetes})</button>`
          : '<p class="panel-nota">Consigue billetes superando y conquistando ciudades.</p>'}`;
    } else {
      const te = p.needsReview
        ? `<button class="boton boton-secundario" id="btn-te">🍵 Pausa para el té: ${p.pendientes} ${p.pendientes === 1 ? 'repaso' : 'repasos'}</button>`
        : '';
      acciones = `
        ${p.estado === 'COMPLETED' ? '' : '<p class="panel-nota">Para superar esta parada, aprueba los ejercicios de su lección (leer la teoría no basta).</p>'}
        <div class="fila-botones" style="margin-top:12px">
          ${p.estado === 'COMPLETED'
            ? '<button class="boton boton-secundario" id="btn-leccion">📖 Volver a la lección</button>'
            : '<button class="boton boton-primario" id="btn-leccion">📖 Hacer los ejercicios</button>'}
          <button class="boton ${p.estado === 'COMPLETED' ? 'boton-primario' : 'boton-secundario'}" id="btn-estudiar">⚔️ Repasar aquí</button>
          ${te}
        </div>`;
    }

    return `
      <div class="panel-cab">
        <span class="carta-ciudad-emoji">${c.emoji}</span>
        <div>
          <div class="carta-ciudad-nombre">${esc(c.nombre)} <span lang="ja">${esc(c.kanji)}</span></div>
          <div class="carta-ciudad-leccion">
            ${p.codigo === 'General' ? 'Parada transversal' : `Parada ${p.orden} de ${TOTAL_PREVISTO}`}
            · <span class="chip chip-jlpt">${esc(c.jlpt)}</span>
            · ${NOMBRE_ESTADO[p.estado]}
          </div>
        </div>
        <div class="panel-lottie ${p.needsReview && p.estado !== 'LOCKED' ? '' : 'oculto'}" id="lottie-matcha"></div>
      </div>
      <div class="carta-ciudad-leccion" style="margin:6px 0 8px">${esc(lecciones[p.codigo] || '')}</div>
      <div class="fila-medallas" style="margin:6px 0">
        ${tiers.map(t => `<span class="medalla ${t.ganada ? 'ganada' : ''}" title="${esc(t.nombre)}: ${esc(t.descripcion)}">${t.icono}</span>`).join('')}
      </div>
      <div class="carta-ciudad-datos">${p.stats.dominadas} dominadas · ${p.stats.aprendiendo} en estudio · ${p.stats.nuevas} nuevas</div>
      <div class="carta-ciudad-habilidad" style="border:none;padding-top:6px">
        <b>${p.conquistada ? 'Conquistada:' : 'Al conquistarla:'}</b> ${esc(c.habilidad)}
      </div>
      ${acciones}`;
  }

  function cartas() {
    return conCiudad.filter(p => p.hasContent).map(p => {
      const c = p.ciudad;
      const tiers = TIERS.map(t => ({ ...t, ganada: juego.insignias.includes(`${p.codigo}:${t.id}`) }));
      const pctReal = p.stats.total ? (p.stats.dominadas / p.stats.total) * 100 : 0;
      const pctMarcha = p.stats.total ? ((p.stats.dominadas + p.stats.aprendiendo) / p.stats.total) * 100 : 0;
      const pctBarra = Math.max(8, pctReal);
      return `
        <div class="carta-ciudad ${p.estado === 'COMPLETED' ? 'conquistada' : ''} ${p.estado === 'LOCKED' ? 'bloqueada' : ''} ${p.codigo === seleccion ? 'seleccionada' : ''}" data-codigo="${esc(p.codigo)}">
          <div class="carta-ciudad-cab">
            <span class="carta-ciudad-emoji">${p.estado === 'LOCKED' ? '🔒' : c.emoji}</span>
            <div>
              <div class="carta-ciudad-nombre">${esc(c.nombre)} <span lang="ja">${esc(c.kanji)}</span></div>
              <div class="carta-ciudad-leccion">${esc(p.codigo)} · ${esc(lecciones[p.codigo] || '')}</div>
            </div>
            ${p.estado === 'COMPLETED' ? '<span class="sello-superada">✓</span>' : ''}
            ${p.needsReview && p.estado !== 'LOCKED' ? '<span class="aviso-te" title="Hay repasos pendientes aquí">🍵</span>' : ''}
          </div>
          <div class="fila-medallas">
            ${tiers.map(t => `<span class="medalla ${t.ganada ? 'ganada' : ''}" title="${esc(t.nombre)}: ${esc(t.descripcion)}">${t.icono}</span>`).join('')}
          </div>
          <div class="barra-ciudad" title="${p.stats.dominadas} de ${p.stats.total} dominadas">
            <div class="barra-ciudad-marcha" style="width:${Math.max(pctBarra, pctMarcha)}%"></div>
            <div class="barra-ciudad-dominio" style="width:${pctBarra}%"></div>
          </div>
          <div class="carta-ciudad-datos">${p.stats.dominadas} dominadas · ${p.stats.aprendiendo} en estudio · ${p.stats.nuevas} nuevas</div>
        </div>`;
    }).join('') + `
      <div class="carta-ciudad bloqueada carta-futura">
        <div class="carta-ciudad-cab">
          <span class="carta-ciudad-emoji">🚧</span>
          <div>
            <div class="carta-ciudad-nombre">Y el viaje sigue...</div>
            <div class="carta-ciudad-leccion">Ruta trazada hasta la lección ${TOTAL_PREVISTO}</div>
          </div>
        </div>
      </div>`;
  }

  function pintar() {
    cont.innerHTML = `
      <h1 class="vista-titulo">📍 El Viaje</h1>
      <p class="vista-sub">Cada lección es una estación. Supera sus ejercicios en 📖 Lecciones para abrir el siguiente tramo de vía. Tienes 🎫 ${juego.billetes} ${juego.billetes === 1 ? 'billete' : 'billetes'}.</p>
      <div class="zona-viaje">
        <div class="col-mapa">
          <div class="caja-mapa">
            <div class="mapa-lottie" id="lottie-japon" title="日本"></div>
            ${construirMapa()}
            <div class="leyenda-mapa">
              <span><i style="background:var(--acento)"></i> Actual</span>
              <span><i style="background:${ORO}"></i> Superada</span>
              <span><i style="background:#c9c9cf"></i> Bloqueada</span>
              <span><i style="background:#dcdce2"></i> Próximamente</span>
              <span>🍵 repasos pendientes</span>
            </div>
          </div>
          <div class="panel-parada" id="panel-parada">${panelParada()}</div>
        </div>
        <div class="lista-ciudades">${cartas()}</div>
      </div>`;
    enganchar();
    if (conquista && porCodigo[conquista]) celebrarConquista(conquista);
  }

  function celebrarConquista(codigo) {
    const nodo = cont.querySelector(`.nodo[data-codigo="${codigo}"]`);
    if (nodo) nodo.classList.add('conquistando');
    const via = cont.querySelector(`.ruta[data-desde="${codigo}"]`);
    if (via) {
      const largo = Math.hypot(via.x2.baseVal.value - via.x1.baseVal.value, via.y2.baseVal.value - via.y1.baseVal.value);
      via.classList.add('via-dibujando');
      via.style.strokeDasharray = largo;
      via.style.strokeDashoffset = largo;
      requestAnimationFrame(() => { via.style.strokeDashoffset = '0'; });
    }
    const caja = cont.querySelector('.caja-mapa');
    for (let i = 0; i < 26; i++) {
      const conf = document.createElement('span');
      conf.className = 'confeti';
      conf.textContent = ['🎉', '⭐', '🌸', '🎌', '✨'][i % 5];
      conf.style.left = `${8 + Math.random() * 84}%`;
      conf.style.animationDelay = `${Math.random() * 0.7}s`;
      conf.style.fontSize = `${12 + Math.random() * 14}px`;
      caja.appendChild(conf);
      setTimeout(() => conf.remove(), 3200);
    }
    const nombre = porCodigo[codigo].ciudad.nombre;
    if (avisar) avisar(`🎌 ¡${nombre} superada! El tramo de vía hasta la siguiente parada ya está abierto.`);
  }

  function seleccionar(codigo) {
    seleccion = codigo;
    cont.querySelectorAll('.nodo').forEach(n => n.classList.toggle('seleccionada', n.dataset.codigo === codigo));
    cont.querySelectorAll('.carta-ciudad').forEach(c => c.classList.toggle('seleccionada', c.dataset.codigo === codigo));
    cont.querySelector('#panel-parada').innerHTML = panelParada();
    engancharPanel();
  }

  function engancharPanel() {
    const p = porCodigo[seleccion];
    const btnLeccion = cont.querySelector('#btn-leccion');
    if (btnLeccion) btnLeccion.onclick = () => {
      sessionStorage.setItem('kotoba-leccion', seleccion);
      location.hash = '#lecciones';
    };
    const irRepaso = () => {
      sessionStorage.setItem('kotoba-ciudad', seleccion);
      location.hash = '#repaso';
    };
    const btnEstudiar = cont.querySelector('#btn-estudiar');
    if (btnEstudiar) btnEstudiar.onclick = irRepaso;
    const btnTe = cont.querySelector('#btn-te');
    if (btnTe) btnTe.onclick = irRepaso;
    const btnBillete = cont.querySelector('#btn-billete');
    if (btnBillete) btnBillete.onclick = async () => {
      try {
        await api.gastarBillete(seleccion);
        if (avisar) avisar(`🎫 ¡Billete usado! ${p.ciudad.nombre} queda abierta desde ya.`);
        sessionStorage.setItem('kotoba-sel', seleccion);
        vistaViaje(cont, avisar);
      } catch (e) {
        if (avisar) avisar(e.message);
      }
    };
    const cajaMatcha = cont.querySelector('#lottie-matcha');
    if (cajaMatcha && !cajaMatcha.classList.contains('oculto')) animar(cajaMatcha, 'matcha');
  }

  function enganchar() {
    cont.querySelectorAll('.nodo').forEach(n => {
      n.addEventListener('click', () => seleccionar(n.dataset.codigo));
      n.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); seleccionar(n.dataset.codigo); } });
    });
    cont.querySelectorAll('.carta-ciudad[data-codigo]').forEach(c => {
      c.addEventListener('click', () => {
        seleccionar(c.dataset.codigo);
        cont.querySelector('.caja-mapa').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });
    engancharPanel();
    animar(cont.querySelector('#lottie-japon'), 'japon');
  }

  pintar();
}
