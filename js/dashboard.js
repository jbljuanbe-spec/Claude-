// Progreso: nivel, racha protegida, billetes, mapa real de Japón interactivo
// (paradas ordenadas del viaje), insignias por retención, actividad y copia.
// Regla de oro: nada de lo que se muestra aquí puede bajar ni desaparecer.
import { api } from './api.js';
import { ciudadDeLeccion, TIERS } from './ciudades.js';
import { PREFECTURAS, VISTA, proyectar } from './mapa-japon.js';
import { animar } from './lottie.js';

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatearProximo(ts) {
  if (!ts) return 'nada programado';
  const d = new Date(ts);
  const hoy = new Date();
  const manana = new Date(hoy); manana.setDate(hoy.getDate() + 1);
  const hora = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === hoy.toDateString()) return `hoy a las ${hora}`;
  if (d.toDateString() === manana.toDateString()) return `mañana a las ${hora}`;
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) + ` a las ${hora}`;
}

const COLOR_TIER = { ninguna: '#9a9aa2', bronce: '#a8763e', plata: '#8a93a6', oro: '#c9971c' };

function mejorTier(insignias, leccion) {
  if (insignias.includes(`${leccion}:oro`)) return 'oro';
  if (insignias.includes(`${leccion}:plata`)) return 'plata';
  if (insignias.includes(`${leccion}:bronce`)) return 'bronce';
  return 'ninguna';
}

const NOMBRE_ESTADO = { LOCKED: 'Bloqueada', ACTIVE: 'Parada actual', COMPLETED: 'Completada' };

export async function vistaProgreso(cont, avisar) {
  cont.innerHTML = '<p class="vista-sub">Cargando progreso...</p>';
  const { resumen, racha, hoy, ultimos14, lecciones, juego, paradas } = await api.dashboard();

  const totalHoy = hoy.repasos + hoy.ejercicios;
  const maxActividad = Math.max(1, ...ultimos14.map(d => d.n));
  const dias = [...ultimos14].reverse();
  const nivel = juego.nivel;

  // Asignación estable de ciudad a cada parada (las conocidas van fijas).
  const CONOCIDAS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'General'];
  let extra = 0;
  const conCiudad = paradas.map(p => ({
    ...p,
    ciudad: ciudadDeLeccion(p.codigo, CONOCIDAS.includes(p.codigo) ? 0 : extra++)
  }));
  const ruta = conCiudad.filter(p => p.codigo !== 'General').sort((a, b) => a.orden - b.orden);
  const porCodigo = Object.fromEntries(conCiudad.map(p => [p.codigo, p]));

  const recordada = sessionStorage.getItem('kotoba-sel');
  let seleccion = (recordada && porCodigo[recordada]) ? recordada
    : (ruta.find(p => p.estado === 'ACTIVE') || ruta[0] || conCiudad[0])?.codigo;
  sessionStorage.removeItem('kotoba-sel');

  function construirMapa() {
    const prefs = PREFECTURAS.map(pr =>
      `<path d="${pr.d}" class="pref"><title>${esc(pr.nombre)}</title></path>`).join('');

    let rutaSvg = '';
    for (let i = 0; i < ruta.length - 1; i++) {
      const a = proyectar(ruta[i].ciudad.lat, ruta[i].ciudad.lon);
      const b = proyectar(ruta[i + 1].ciudad.lat, ruta[i + 1].ciudad.lon);
      const hecha = ruta[i].estado === 'COMPLETED' && ruta[i + 1].estado !== 'LOCKED';
      rutaSvg += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" class="ruta ${hecha ? 'ruta-hecha' : ''}"/>`;
    }

    const nodos = conCiudad.map(p => {
      const { x, y } = proyectar(p.ciudad.lat, p.ciudad.lon);
      const tier = mejorTier(juego.insignias, p.codigo);
      const sel = p.codigo === seleccion ? 'seleccionada' : '';
      const dx = p.ciudad.dxEtiqueta || 0, dy = p.ciudad.dyEtiqueta || 0;
      const etiquetaY = dy >= 0 ? y + 13 + dy : y - 8 + dy;
      let nucleo;
      if (p.codigo === 'General') {
        nucleo = `<path d="M${x - 7},${y + 4} L${x},${y - 7} L${x + 7},${y + 4} Z" class="nodo-forma" fill="${p.estado === 'COMPLETED' ? COLOR_TIER[tier] : 'var(--acento)'}"/>`;
      } else if (p.estado === 'LOCKED') {
        nucleo = `<circle cx="${x}" cy="${y}" r="5.5" class="nodo-forma" fill="#c9c9cf"/>
                  <text x="${x}" y="${y + 3}" class="nodo-candado">🔒</text>`;
      } else {
        const color = p.estado === 'COMPLETED' && tier !== 'ninguna' ? COLOR_TIER[tier] : 'var(--acento)';
        const halo = p.estado === 'ACTIVE' ? `<circle cx="${x}" cy="${y}" r="6.5" class="nodo-halo"/>` : '';
        nucleo = `${halo}<circle cx="${x}" cy="${y}" r="6.5" class="nodo-forma" fill="${color}"/>`;
      }
      const te = p.needsReview && p.estado !== 'LOCKED'
        ? `<text x="${x + 8}" y="${y - 6}" class="nodo-te">🍵</text>` : '';
      return `
        <g class="nodo ${sel}" data-codigo="${esc(p.codigo)}" tabindex="0" role="button"
           aria-label="${esc(p.ciudad.nombre)}: ${NOMBRE_ESTADO[p.estado]}">
          <circle cx="${x}" cy="${y}" r="13" fill="transparent"/>
          ${nucleo}${te}
          <text x="${x + dx}" y="${etiquetaY}" class="mapa-etiqueta">${esc(p.ciudad.nombre)}</text>
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
    const tiers = TIERS.map(t => ({ ...t, ganada: juego.insignias.includes(`${p.codigo}:${t.id}`) }));

    let acciones = '';
    if (p.estado === 'LOCKED') {
      acciones = `
        <p class="panel-nota">🔒 Se desbloquea al completar ${anterior ? `<b>${esc(anterior.ciudad.nombre)}</b>` : 'la parada anterior'} (o con un billete).</p>
        ${juego.billetes > 0
          ? `<button class="boton boton-primario" id="btn-billete">🎫 Usar un billete de Shinkansen (tienes ${juego.billetes})</button>`
          : '<p class="panel-nota">Consigue billetes completando y conquistando ciudades.</p>'}`;
    } else {
      const te = p.needsReview
        ? `<button class="boton boton-secundario" id="btn-te">🍵 Pausa para el té: ${p.pendientes} ${p.pendientes === 1 ? 'repaso' : 'repasos'}</button>`
        : '';
      acciones = `
        <div class="fila-botones" style="margin-top:12px">
          <button class="boton boton-primario" id="btn-estudiar">Estudiar aquí</button>
          ${te}
        </div>`;
    }

    return `
      <div class="panel-cab">
        <span class="carta-ciudad-emoji">${c.emoji}</span>
        <div>
          <div class="carta-ciudad-nombre">${esc(c.nombre)} <span lang="ja">${esc(c.kanji)}</span></div>
          <div class="carta-ciudad-leccion">
            ${p.codigo === 'General' ? 'Parada transversal' : `Parada ${p.orden} de ${ruta.length}`}
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
    return conCiudad.map(p => {
      const c = p.ciudad;
      const tiers = TIERS.map(t => ({ ...t, ganada: juego.insignias.includes(`${p.codigo}:${t.id}`) }));
      const pctReal = p.stats.total ? (p.stats.dominadas / p.stats.total) * 100 : 0;
      const pctMarcha = p.stats.total ? ((p.stats.dominadas + p.stats.aprendiendo) / p.stats.total) * 100 : 0;
      // Progreso "dotado": la barra nunca arranca visualmente de cero.
      const pctBarra = Math.max(8, pctReal);
      return `
        <div class="carta-ciudad ${p.conquistada ? 'conquistada' : ''} ${p.estado === 'LOCKED' ? 'bloqueada' : ''} ${p.codigo === seleccion ? 'seleccionada' : ''}" data-codigo="${esc(p.codigo)}">
          <div class="carta-ciudad-cab">
            <span class="carta-ciudad-emoji">${p.estado === 'LOCKED' ? '🔒' : c.emoji}</span>
            <div>
              <div class="carta-ciudad-nombre">${esc(c.nombre)} <span lang="ja">${esc(c.kanji)}</span></div>
              <div class="carta-ciudad-leccion">${esc(p.codigo)} · ${esc(lecciones[p.codigo] || '')}</div>
            </div>
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
    }).join('');
  }

  function pintar() {
    cont.innerHTML = `
      <h1 class="vista-titulo">Tu viaje por Japón</h1>
      <p class="vista-sub">Un viaje con paradas en orden: completa cada ciudad para abrir la siguiente, o adelanta con un billete. Nada de lo ganado se pierde nunca.</p>

      <div class="rejilla-stats">
        <div class="stat-caja stat-nivel">
          <div class="nivel-cab">
            <span class="nivel-numero">${nivel.nivel}</span>
            <div>
              <b style="font-size:1.15rem">${esc(nivel.titulo)} <span lang="ja" style="color:var(--acento)">${esc(nivel.kanji)}</span></b>
              <span style="display:block">${nivel.xp} XP ${nivel.xpSiguiente ? `· siguiente nivel a ${nivel.xpSiguiente}` : '· nivel máximo'}</span>
            </div>
          </div>
          <div class="barra-nivel"><div style="width:${Math.round(nivel.haciaSiguiente * 100)}%"></div></div>
        </div>
        <div class="stat-caja">
          <b>${racha} ${racha === 1 ? 'día' : 'días'} 🔥</b>
          <span>racha de estudio</span>
          <div class="stat-detalle">❄️ ${juego.congeladores} ${juego.congeladores === 1 ? 'congelador' : 'congeladores'}: un día sin estudiar pausa la racha, no la rompe</div>
        </div>
        <div class="stat-caja">
          <b>🎫 ${juego.billetes}</b>
          <span>billetes de Shinkansen</span>
          <div class="stat-detalle">Se ganan completando y conquistando ciudades; sirven para adelantar el viaje</div>
        </div>
        <div class="stat-caja">
          <b>${resumen.dominadas} / ${resumen.total}</b>
          <span>tarjetas dominadas</span>
          <div class="stat-detalle">${totalHoy} respuestas hoy · ${resumen.pendientesAhora > 0 ? `${resumen.pendientesAhora} pendientes ahora` : `próximo repaso: ${formatearProximo(resumen.proximoDue)}`}</div>
        </div>
      </div>

      <div class="zona-viaje">
        <div class="col-mapa">
          <div class="caja-mapa">
            <div class="mapa-lottie" id="lottie-japon" title="日本"></div>
            ${construirMapa()}
            <div class="leyenda-mapa">
              <span><i style="background:var(--acento)"></i> Actual</span>
              <span><i style="background:#c9c9cf"></i> Bloqueada</span>
              <span><i style="background:${COLOR_TIER.bronce}"></i> Bronce</span>
              <span><i style="background:${COLOR_TIER.plata}"></i> Plata</span>
              <span><i style="background:${COLOR_TIER.oro}"></i> Oro</span>
              <span>🍵 repasos pendientes</span>
            </div>
          </div>
          <div class="panel-parada" id="panel-parada">${panelParada()}</div>
        </div>
        <div class="lista-ciudades">${cartas()}</div>
      </div>

      <h2 class="seccion-titulo">Actividad de los últimos 14 días</h2>
      <div class="stat-caja">
        <div class="actividad-mini">
          ${Array.from({ length: 14 }, (_, i) => {
            const d = dias[i - (14 - dias.length)];
            if (!d) return '<div class="actividad-dia vacio" style="height:3px"></div>';
            return `<div class="actividad-dia ${d.n ? '' : 'vacio'}" style="height:${Math.max(6, (d.n / maxActividad) * 100)}%" title="${esc(d.fecha)}: ${d.n}"></div>`;
          }).join('')}
        </div>
      </div>

      <h2 class="seccion-titulo">Copia de seguridad</h2>
      <div class="stat-caja">
        <p style="color:var(--tinta-suave); font-size:0.92rem; margin-bottom:14px">
          Tu progreso vive en este navegador. Descarga una copia de vez en cuando por si cambias
          de navegador o de dispositivo, y restáurala aquí cuando la necesites.
        </p>
        <div class="fila-botones" style="margin-top:0">
          <button class="boton boton-secundario" id="btn-exportar">Descargar copia</button>
          <button class="boton boton-secundario" id="btn-restaurar">Restaurar copia</button>
          <input type="file" id="archivo-copia" accept="application/json" class="oculto">
        </div>
      </div>
    `;
    enganchar();
  }

  function seleccionar(codigo) {
    seleccion = codigo;
    cont.querySelectorAll('.nodo').forEach(n => n.classList.toggle('seleccionada', n.dataset.codigo === codigo));
    cont.querySelectorAll('.carta-ciudad').forEach(c => c.classList.toggle('seleccionada', c.dataset.codigo === codigo));
    const panel = cont.querySelector('#panel-parada');
    panel.innerHTML = panelParada();
    engancharPanel();
  }

  function engancharPanel() {
    const p = porCodigo[seleccion];
    const btnEstudiar = cont.querySelector('#btn-estudiar');
    if (btnEstudiar) btnEstudiar.onclick = () => {
      sessionStorage.setItem('kotoba-ciudad', seleccion);
      location.hash = '#repaso';
    };
    const btnTe = cont.querySelector('#btn-te');
    if (btnTe) btnTe.onclick = () => {
      sessionStorage.setItem('kotoba-ciudad', seleccion);
      location.hash = '#repaso';
    };
    const btnBillete = cont.querySelector('#btn-billete');
    if (btnBillete) btnBillete.onclick = async () => {
      try {
        await api.gastarBillete(seleccion);
        if (avisar) avisar(`🎫 ¡Billete usado! ${p.ciudad.nombre} queda abierta desde ya.`);
        sessionStorage.setItem('kotoba-sel', seleccion);
        vistaProgreso(cont, avisar);
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
    cont.querySelectorAll('.carta-ciudad').forEach(c => {
      c.addEventListener('click', () => {
        seleccionar(c.dataset.codigo);
        cont.querySelector('.caja-mapa').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });
    engancharPanel();
    animar(cont.querySelector('#lottie-japon'), 'japon');

    cont.querySelector('#btn-exportar').onclick = async () => {
      const datos = await api.exportarCopia();
      const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `kotoba-progreso-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    };

    const inputArchivo = cont.querySelector('#archivo-copia');
    cont.querySelector('#btn-restaurar').onclick = () => inputArchivo.click();
    inputArchivo.onchange = async () => {
      const archivo = inputArchivo.files[0];
      if (!archivo) return;
      try {
        const datos = JSON.parse(await archivo.text());
        await api.restaurarCopia(datos);
        if (avisar) avisar('Copia restaurada. Tu progreso está de vuelta.');
        vistaProgreso(cont, avisar);
      } catch (e) {
        if (avisar) avisar(e.message);
      }
    };
  }

  pintar();
}
