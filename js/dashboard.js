// Progreso: nivel de viajero, racha protegida, mapa de ciudades de Japón,
// insignias por retención, actividad y copia de seguridad.
// Regla de oro: nada de lo que se muestra aquí puede bajar ni desaparecer.
import { api } from './api.js';
import { ciudadDeLeccion, tiersConseguidos, TIERS } from './ciudades.js';

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatearProximo(ts) {
  if (!ts) return 'nada programado';
  const d = new Date(ts);
  const hoy = new Date();
  const esHoy = d.toDateString() === hoy.toDateString();
  const manana = new Date(hoy); manana.setDate(hoy.getDate() + 1);
  const esManana = d.toDateString() === manana.toDateString();
  const hora = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  if (esHoy) return `hoy a las ${hora}`;
  if (esManana) return `mañana a las ${hora}`;
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) + ` a las ${hora}`;
}

const ORDEN_RUTA = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'];

const ISLAS = [
  'M272,38 Q300,20 322,40 Q340,60 326,84 Q314,102 292,96 Q286,88 276,92 Q258,96 254,78 Q252,56 272,38 Z',
  'M302,112 Q318,132 308,158 Q300,184 286,204 Q272,226 250,240 Q230,256 210,264 Q192,272 174,280 Q158,284 154,272 Q152,260 166,252 Q182,242 198,234 Q214,224 228,210 Q242,196 252,178 Q262,158 272,140 Q282,122 302,112 Z',
  'M178,288 Q192,282 202,290 Q208,300 196,306 Q184,310 176,302 Q172,294 178,288 Z',
  'M112,296 Q126,292 132,304 Q136,318 128,330 Q118,340 108,332 Q100,320 104,308 Q106,300 112,296 Z',
  'M48,422 Q56,416 60,424 Q62,432 54,436 Q46,436 46,428 Z'
];

const COLOR_TIER = { ninguna: 'var(--tinta-tenue)', bronce: '#a8763e', plata: '#8a93a6', oro: '#c9971c' };

function mejorTier(insignias, leccion) {
  if (insignias.includes(`${leccion}:oro`)) return 'oro';
  if (insignias.includes(`${leccion}:plata`)) return 'plata';
  if (insignias.includes(`${leccion}:bronce`)) return 'bronce';
  return 'ninguna';
}

function mapaJapon(codigos, lecciones, insignias) {
  const puntos = [];
  const coordenadas = {};
  let extra = 0;
  for (const cod of codigos) {
    const conocida = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'General'].includes(cod);
    coordenadas[cod] = ciudadDeLeccion(cod, conocida ? 0 : extra++);
  }

  const ruta = ORDEN_RUTA.filter(c => coordenadas[c]);
  let caminoSvg = '';
  if (ruta.length > 1) {
    const pts = ruta.map(c => `${coordenadas[c].x},${coordenadas[c].y}`);
    caminoSvg = `<path class="mapa-ruta" d="M${pts.join(' L')}" />`;
  }

  for (const [cod, c] of Object.entries(coordenadas)) {
    const tier = mejorTier(insignias, cod);
    const titulo = `${c.nombre} · ${lecciones[cod] || cod}`;
    if (cod === 'General') {
      puntos.push(`
        <g class="mapa-ciudad" data-titulo="${esc(titulo)}">
          <path d="M${c.x - 8},${c.y + 5} L${c.x},${c.y - 8} L${c.x + 8},${c.y + 5} Z" fill="${COLOR_TIER[tier]}" stroke="#fff" stroke-width="1.5"/>
          <text x="${c.x}" y="${c.y + 17}" class="mapa-etiqueta">${esc(c.nombre)}</text>
        </g>`);
    } else {
      puntos.push(`
        <g class="mapa-ciudad" data-titulo="${esc(titulo)}">
          <circle cx="${c.x}" cy="${c.y}" r="6.5" fill="${COLOR_TIER[tier]}" stroke="#fff" stroke-width="2"/>
          <text x="${c.x}" y="${c.y + 18}" class="mapa-etiqueta">${esc(c.nombre)}</text>
        </g>`);
    }
  }

  return `
    <svg viewBox="20 10 340 450" class="mapa-svg" role="img" aria-label="Mapa del viaje por Japón">
      ${ISLAS.map(d => `<path d="${d}" class="mapa-isla"/>`).join('')}
      ${caminoSvg}
      ${puntos.join('')}
    </svg>`;
}

export async function vistaProgreso(cont, avisar) {
  cont.innerHTML = '<p class="vista-sub">Cargando progreso...</p>';
  const { resumen, racha, hoy, ultimos14, lecciones, juego } = await api.dashboard();

  const totalHoy = hoy.repasos + hoy.ejercicios;
  const maxActividad = Math.max(1, ...ultimos14.map(d => d.n));
  const dias = [...ultimos14].reverse();
  const nivel = juego.nivel;

  const codigos = Object.keys(resumen.porLeccion).sort((a, b) => {
    if (a === 'General') return 1;
    if (b === 'General') return -1;
    return a.localeCompare(b, 'es', { numeric: true });
  });

  let extraIdx = 0;
  const cartasCiudad = codigos.map(cod => {
    const stats = resumen.porLeccion[cod];
    const esConocida = ['L1','L2','L3','L4','L5','L6','General'].includes(cod);
    const ciudad = ciudadDeLeccion(cod, esConocida ? 0 : extraIdx++);
    const tiers = TIERS.map(t => ({ ...t, ganada: juego.insignias.includes(`${cod}:${t.id}`) }));
    const conquistada = juego.insignias.includes(`${cod}:plata`);
    const pctReal = stats.total ? (stats.dominadas / stats.total) * 100 : 0;
    const pctEnMarcha = stats.total ? ((stats.dominadas + stats.aprendiendo) / stats.total) * 100 : 0;
    // Progreso "dotado": la barra nunca arranca visualmente de cero (Nunes & Drèze).
    const pctBarra = Math.max(8, pctReal);
    const pctBarraMarcha = Math.max(pctBarra, pctEnMarcha);

    return `
      <div class="carta-ciudad ${conquistada ? 'conquistada' : ''}">
        <div class="carta-ciudad-cab">
          <span class="carta-ciudad-emoji">${ciudad.emoji}</span>
          <div>
            <div class="carta-ciudad-nombre">${esc(ciudad.nombre)} <span lang="ja">${esc(ciudad.kanji)}</span></div>
            <div class="carta-ciudad-leccion">${esc(cod)} · ${esc(lecciones[cod] || '')}</div>
          </div>
        </div>
        <div class="fila-medallas">
          ${tiers.map(t => `<span class="medalla ${t.ganada ? 'ganada' : ''}" title="${esc(t.nombre)}: ${esc(t.descripcion)}">${t.icono}</span>`).join('')}
        </div>
        <div class="barra-ciudad" title="${stats.dominadas} de ${stats.total} dominadas">
          <div class="barra-ciudad-marcha" style="width:${pctBarraMarcha}%"></div>
          <div class="barra-ciudad-dominio" style="width:${pctBarra}%"></div>
        </div>
        <div class="carta-ciudad-datos">${stats.dominadas} dominadas · ${stats.aprendiendo} en estudio · ${stats.nuevas} nuevas</div>
        <div class="carta-ciudad-habilidad">
          ${conquistada ? `<b>Conquistada:</b> ${esc(ciudad.habilidad)}` : `<b>Al conquistarla:</b> ${esc(ciudad.habilidad)}`}
        </div>
      </div>`;
  }).join('');

  cont.innerHTML = `
    <h1 class="vista-titulo">Tu viaje por Japón</h1>
    <p class="vista-sub">Cada lección es una ciudad. Las insignias certifican lo que ya sabes hacer, y nada de lo ganado se pierde nunca.</p>

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
        <div class="stat-detalle">❄️ ${juego.congeladores} ${juego.congeladores === 1 ? 'congelador listo' : 'congeladores listos'}: si un día no estudias, la racha se pausa sola, no se rompe</div>
      </div>
      <div class="stat-caja">
        <b>${totalHoy}</b>
        <span>respuestas hoy</span>
        <div class="stat-detalle">${hoy.repasos} repasos · ${hoy.ejercicios} ejercicios</div>
      </div>
      <div class="stat-caja">
        <b>${resumen.dominadas} / ${resumen.total}</b>
        <span>tarjetas dominadas</span>
        <div class="stat-detalle">${resumen.pendientesAhora > 0 ? `${resumen.pendientesAhora} pendientes te esperan en Repaso` : `Próximo repaso: ${formatearProximo(resumen.proximoDue)}`}</div>
      </div>
    </div>

    <div class="zona-viaje">
      <div class="caja-mapa">
        ${mapaJapon(codigos, lecciones, juego.insignias)}
        <div class="leyenda-mapa">
          <span><i style="background:${COLOR_TIER.ninguna}"></i> Por visitar</span>
          <span><i style="background:${COLOR_TIER.bronce}"></i> Bronce</span>
          <span><i style="background:${COLOR_TIER.plata}"></i> Plata</span>
          <span><i style="background:${COLOR_TIER.oro}"></i> Oro</span>
        </div>
      </div>
      <div class="lista-ciudades">${cartasCiudad}</div>
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
