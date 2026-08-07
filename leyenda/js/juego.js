// Interfaz y bucle de juego.
import {
  REGIONES, ESTILOS, RITMOS, INICIALES, TIPOS, PORLINEA, POROBJETO,
  spriteUrl, iconoObjeto,
} from './datos.js?v=10';
import {
  nuevaPartida, simularTemporada, etapaDe, nombreEtapa, debeRetirarse, retirar,
  legado, rangoDe, logrosDe, poderEquipo, poderPokemon, apodoDe, dado,
} from './motor.js?v=10';
import { siguienteEvento } from './eventos.js?v=10';
import { descargarTarjeta } from './tarjeta.js?v=10';

const app = document.getElementById('app');
let estado = null;
let pestaña = 'carrera';

const BALL = 'objetos/poke.png';
const img = (dex, cls = '') => `<img class="${cls}" src="${spriteUrl(dex)}" alt="" loading="lazy">`;
document.addEventListener('error', ev => {
  const t = ev.target;
  if (t?.tagName === 'IMG' && !t.src.endsWith(BALL)) t.src = BALL;
}, true);

const badgesTipo = tipos => `<div class="tipos">${(tipos ?? [])
  .map(t => `<span class="tipo" style="background:${TIPOS[t]?.color ?? '#888'}">${TIPOS[t]?.nombre ?? t}</span>`).join('')}</div>`;
const esc = s => String(s ?? '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
const colorOvr = v => (v >= 85 ? '#7a5cf0' : v >= 75 ? '#17a673' : v >= 62 ? '#3b6fe0' : v >= 50 ? '#f5a524' : '#8b93b0');

// ── Pantalla de creación ─────────────────────────────────────────────────────
const seleccion = { region: REGIONES[0], estilo: ESTILOS[0], inicial: null, ritmo: RITMOS[1] };

function pantallaInicio() {
  seleccion.inicial = null;
  const porRegion = INICIALES.filter(l => l.region === seleccion.region.id);
  app.innerHTML = `
    <div class="portada">
      <div class="bolas">⚡ 🔴 ⚡</div>
      <h1>Conviértete<br>en Leyenda</h1>
      <p class="sub">Veinte años de carrera como entrenador Pokémon.<br>Solo tomas las decisiones que importan.</p>
    </div>

    <div class="bloque">
      <label for="nombre">Tu nombre</label>
      <input id="nombre" type="text" maxlength="18" placeholder="Escribe tu nombre" autocomplete="off">
    </div>

    <div class="bloque">
      <span class="titulo-campo">Región natal</span>
      <div class="rejilla tres" id="regiones">
        ${REGIONES.map((r, i) => `<button class="opcion" data-i="${i}" aria-pressed="${r.id === seleccion.region.id}">
          <span class="nom">${r.emoji} ${r.nombre}</span></button>`).join('')}
      </div>
      <p style="color:var(--suave);font-size:12.5px;margin-top:8px">${esc(seleccion.region.sabor)}</p>
    </div>

    <div class="bloque">
      <span class="titulo-campo">Tu primer compañero</span>
      <div class="rejilla tres" id="iniciales">
        ${porRegion.map(l => `<button class="opcion op-inicial" data-id="${l.id}" aria-pressed="false">
          ${img(l.etapas[0].dex)}<span class="nom">${l.etapas[0].nombre}</span>
          ${badgesTipo(l.etapas[0].tipos ?? l.tipos)}</button>`).join('')}
      </div>
    </div>

    <div class="bloque">
      <span class="titulo-campo">Estilo de entrenador</span>
      <div class="rejilla dos" id="estilos">
        ${ESTILOS.map((s, i) => `<button class="opcion" data-i="${i}" aria-pressed="${s.id === seleccion.estilo.id}">
          <span class="nom">${s.emoji} ${s.nombre}</span><span class="des">${s.desc}</span></button>`).join('')}
      </div>
    </div>

    <div class="bloque">
      <span class="titulo-campo">Ritmo de la partida</span>
      <div class="rejilla tres" id="ritmos">
        ${RITMOS.map((r, i) => `<button class="opcion" data-i="${i}" aria-pressed="${r.id === seleccion.ritmo.id}">
          <span class="nom">${r.nombre}</span><span class="des">${r.desc}</span></button>`).join('')}
      </div>
    </div>

    <button class="boton-grande" id="empezar" disabled>Empezar la carrera</button>
    <p class="pie">Cada partida es distinta. Nadie llega dos veces igual al final.</p>`;

  const marcar = (cont, btn) => {
    cont.querySelectorAll('.opcion').forEach(b => b.setAttribute('aria-pressed', 'false'));
    btn.setAttribute('aria-pressed', 'true');
  };
  const revisar = () => {
    document.getElementById('empezar').disabled =
      !(document.getElementById('nombre').value.trim() && seleccion.inicial);
  };

  document.getElementById('regiones').onclick = ev => {
    const b = ev.target.closest('.opcion'); if (!b) return;
    const nombre = document.getElementById('nombre').value;
    seleccion.region = REGIONES[+b.dataset.i];
    pantallaInicio();
    document.getElementById('nombre').value = nombre;
  };
  const inics = document.getElementById('iniciales');
  inics.onclick = ev => {
    const b = ev.target.closest('.opcion'); if (!b) return;
    seleccion.inicial = PORLINEA[b.dataset.id]; marcar(inics, b); revisar();
  };
  const ests = document.getElementById('estilos');
  ests.onclick = ev => { const b = ev.target.closest('.opcion'); if (!b) return; seleccion.estilo = ESTILOS[+b.dataset.i]; marcar(ests, b); };
  const rits = document.getElementById('ritmos');
  rits.onclick = ev => { const b = ev.target.closest('.opcion'); if (!b) return; seleccion.ritmo = RITMOS[+b.dataset.i]; marcar(rits, b); };
  document.getElementById('nombre').oninput = revisar;

  document.getElementById('empezar').onclick = () => {
    estado = nuevaPartida({
      nombre: document.getElementById('nombre').value.trim().slice(0, 18),
      region: seleccion.region, estilo: seleccion.estilo,
      inicial: seleccion.inicial, ritmo: seleccion.ritmo,
    });
    pestaña = 'carrera';
    pantallaJuego();
  };
}

// ── Estructura de juego: barra fija + tabs ───────────────────────────────
function pantallaJuego() {
  app.innerHTML = `<div id="barra"></div><div id="vista"></div>`;
  pintarBarra();
  const prof = estado.regionEmoji;
  pintarCarrera(`
    <div class="tarjeta">
      <div class="etiqueta-anio">Año 1 · ${estado.edad} años</div>
      <h2>${prof} ${esc(estado.nombre)} sale de casa</h2>
      <p class="cuerpo">${esc(estado.regionNombre)}. ${esc(seleccion.region.sabor)}
      Tu madre te dice que llames. Tú ya piensas en el ${esc(estado.equipo[0].nombre)} que llevas en la mochila.</p>
    </div>`);
  siguientePaso();
}

function pintarBarra() {
  const media = Math.round(estado.media);
  document.getElementById('barra').innerHTML = `
    <div class="barra">
      <div class="barra-fila">
        <div class="ovr" style="background:${colorOvr(media)}">
          <span class="n">${media}</span><span class="k">Media</span>
        </div>
        <div class="barra-datos">
          <div class="barra-nombre">${esc(estado.nombre)}</div>
          <div class="barra-meta">${estado.regionEmoji} ${esc(estado.regionNombre)} · Año ${estado.año} · ${estado.edad} años</div>
          <div class="barra-etapa">${nombreEtapa(etapaDe(estado))}</div>
        </div>
        <div class="barra-dinero">${(estado.dinero / 1000).toFixed(0)}k<small>₽ · 🎖️${estado.medallas} · 🏆${estado.titulos.length}</small></div>
      </div>
      <div class="tabs">
        <button data-p="carrera" aria-selected="${pestaña === 'carrera'}">Carrera</button>
        <button data-p="ficha" aria-selected="${pestaña === 'ficha'}">Ficha del entrenador</button>
      </div>
    </div>`;
  document.querySelector('.tabs').onclick = ev => {
    const b = ev.target.closest('button'); if (!b) return;
    pestaña = b.dataset.p;
    pintarBarra();
    if (pestaña === 'ficha') pintarFicha(); else restaurarCarrera();
  };
}

// La vista de Carrera se guarda como HTML + su enlazador de eventos, para poder
// volver de la pestaña Ficha sin perder los botones de la decisión en curso.
let ultimaVista = '';
let enlazador = null;

function pintarCarrera(html, { añadir = false, enlazar = null } = {}) {
  ultimaVista = añadir ? ultimaVista + html : html;
  enlazador = enlazar;
  if (pestaña !== 'carrera') { pestaña = 'carrera'; pintarBarra(); }
  return restaurarCarrera();
}

function restaurarCarrera() {
  const v = document.getElementById('vista');
  v.innerHTML = ultimaVista;
  enlazador?.(v);
  window.scrollTo({ top: 0, behavior: 'instant' });
  return v;
}

// ── Ficha del entrenador ─────────────────────────────────────────────────────
const BARRAS = [
  ['estrategia', 'Estrategia', '#3b6fe0'], ['vinculo', 'Vínculo', '#17a673'],
  ['fama', 'Fama', '#f5a524'], ['salud', 'Salud', '#00b8d4'],
  ['moral', 'Moral', '#ff7a45'], ['poder', 'Potencia', '#e94b5c'],
];

function pintarFicha() {
  const s = estado.stats;
  const equipo = estado.equipo.filter(p => !p.retirado).sort((a, b) => b.nivel - a.nivel);
  const media = Math.round(estado.media);
  document.getElementById('vista').innerHTML = `
    <div class="tarjeta">
      <div class="etiqueta-anio">Progresión</div>
      <div class="medidor-techo">
        <div class="pista"><div class="actual" style="width:${media}%"></div></div>
        <div class="pie"><span>Media ${media}</span><span>100</span></div>
      </div>
      <p style="font-size:12.5px;color:var(--suave);margin-top:8px">
        La media sube con la experiencia: rápido de joven, más despacio con los años.
        Hasta dónde puedes llegar, eso ya se verá.
      </p>
      <div class="barras" style="margin-top:14px">
        ${BARRAS.map(([k, n, c]) => `<div class="barra">
          <div class="et"><span>${n}</span><span>${Math.round(s[k] ?? 0)}</span></div>
          <div class="pista"><div class="relleno" style="width:${s[k] ?? 0}%;background:${c}"></div></div>
        </div>`).join('')}
      </div>
    </div>

    <div class="tarjeta">
      <div class="etiqueta-anio">Equipo (${equipo.length})</div>
      <div class="equipo-rejilla">
        ${equipo.map(p => `<div class="carta-poke">
          ${img(p.dex)}<div class="n">${esc(p.nombre)}${p.socio ? ' ★' : ''}</div>
          <div class="p">Nivel ${Math.round(p.nivel)}${p.lesionado ? ' · 🩹' : ''}</div>
          ${badgesTipo(p.tipos)}</div>`).join('') || '<p class="cuerpo">Sin equipo ahora mismo.</p>'}
      </div>
    </div>

    <div class="tarjeta">
      <div class="etiqueta-anio">Mochila (${estado.objetos.length})</div>
      ${estado.objetos.length ? `
        <div class="objetos-rejilla">
          ${estado.objetos.map(id => { const o = POROBJETO[id]; return `<div class="objeto">
            <img src="${iconoObjeto(o.icono)}" alt="">
            <div class="objeto-txt">
              <span class="n">${esc(o.nombre)}</span>
              <span class="ef">${textoPasivo(o.pasivo) || 'Recuerdo de carrera'}</span>
            </div></div>`; }).join('')}
        </div>
        <div class="mochila-total">Cada temporada: ${textoPasivo(sumaPasivos()) || 'sin efecto'}</div>`
      : `<p class="cuerpo" style="font-size:13.5px;color:var(--suave)">
          Todavía no llevas nada. Los objetos se ganan en eventos y aplican su efecto
          <b>cada temporada</b>: más salud, más media, más dinero o crecer más rápido.</p>`}
    </div>

    <div class="tarjeta">
      <div class="etiqueta-anio">Palmarés y récords</div>
      <div class="stats-final">
        <div><div class="v">${estado.titulos.length}</div><div class="k">Títulos</div></div>
        <div><div class="v">${estado.medallas}/8</div><div class="k">Medallas</div></div>
        <div><div class="v">${estado.mundiales}</div><div class="k">Mundiales</div></div>
        <div><div class="v">${estado.victorias}</div><div class="k">Victorias</div></div>
        <div><div class="v">${estado.derrotas}</div><div class="k">Derrotas</div></div>
        <div><div class="v">${estado.rival.derrotasTuyas}-${estado.rival.victoriasSuyas}</div><div class="k">vs ${esc(estado.rival.nombre)}</div></div>
      </div>
      ${estado.titulos.length ? `<ul class="lista-limpia" style="margin-top:12px">
        ${estado.titulos.map(t => `<li>🏆 ${esc(t.nombre)} <span class="año">· año ${t.año}</span></li>`).join('')}</ul>` : ''}
      ${estado.hitos.length ? `<div class="etiqueta-anio" style="margin-top:14px">Momentos</div>
        <ul class="lista-limpia">${estado.hitos.map(h => `<li>${h.emoji} ${esc(h.texto)} <span class="año">· año ${h.año}</span></li>`).join('')}</ul>` : ''}
    </div>`;
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// ── Celebración de títulos ───────────────────────────────────────────────────
// Copa dibujada a mano (SVG) con la cinta del color del torneo, para que
// ganar se note en pantalla en vez de pasar como una línea más del resumen.
const COPAS = {
  liga:     { cinta: '#3b6fe0', metal: '#f5c344', metal2: '#e09a12', pie: '#8b5e2b', et: 'CAMPEÓN DE LIGA' },
  mundial:  { cinta: '#e94b5c', metal: '#ffd970', metal2: '#f2a516', pie: '#5c3c18', et: 'CAMPEÓN DEL MUNDO' },
  medallas: { cinta: '#17a673', metal: '#d8dce8', metal2: '#a8b0c6', pie: '#6c7391', et: 'LAS OCHO MEDALLAS' },
};

function copaSvg(tipo) {
  const c = COPAS[tipo] ?? COPAS.liga;
  return `
  <svg class="copa" viewBox="0 0 120 140" role="img" aria-label="Trofeo">
    <defs>
      <linearGradient id="oro-${tipo}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${c.metal}"/><stop offset="100%" stop-color="${c.metal2}"/>
      </linearGradient>
    </defs>
    <path d="M28 18h64v26a32 32 0 0 1-64 0z" fill="url(#oro-${tipo})"/>
    <path d="M28 24H16a14 14 0 0 0 14 22z" fill="url(#oro-${tipo})"/>
    <path d="M92 24h12a14 14 0 0 1-14 22z" fill="url(#oro-${tipo})"/>
    <rect x="52" y="74" width="16" height="20" fill="${c.metal2}"/>
    <path d="M36 94h48l6 14H30z" fill="url(#oro-${tipo})"/>
    <rect x="26" y="108" width="68" height="12" rx="3" fill="${c.pie}"/>
    <path d="M60 26l4.6 9.4 10.4 1.5-7.5 7.3 1.8 10.3L60 49.6l-9.3 4.9 1.8-10.3-7.5-7.3 10.4-1.5z" fill="#fff" opacity=".85"/>
    <rect x="44" y="120" width="32" height="7" rx="3" fill="${c.cinta}"/>
  </svg>`;
}

function tarjetaTrofeo(t) {
  const c = COPAS[t.tipo] ?? COPAS.liga;
  const confeti = Array.from({ length: 14 }, (_, i) => {
    const col = [c.cinta, c.metal, '#17a673', '#e94b5c', '#7a5cf0'][i % 5];
    return `<i style="left:${6 + i * 6.6}%;background:${col};animation-delay:${(i % 7) * 0.12}s"></i>`;
  }).join('');
  return `
    <div class="tarjeta trofeo" style="--cinta:${c.cinta}">
      <div class="confeti">${confeti}</div>
      ${copaSvg(t.tipo)}
      <div class="trofeo-et">${c.et}</div>
      <div class="trofeo-nombre">${esc(t.nombre)}</div>
      <div class="trofeo-anio">Año ${t.año}</div>
    </div>`;
}

// ── Objetos: traducir sus pasivos a algo legible ─────────────────────────────
const ETIQ_PASIVO = {
  salud: 'Salud', moral: 'Moral', media: 'Media', estrategia: 'Estrategia',
  vinculo: 'Vínculo', crecimiento: 'ritmo de mejora', suerte: 'Suerte',
};

function textoPasivo(pasivo = {}) {
  return Object.entries(pasivo).map(([k, v]) => {
    if (!v) return null;
    if (k === 'dineroExtra') return `+${v.toLocaleString('es')} ₽/año`;
    if (k === 'crecimiento') return `+${Math.round(v * 100)}% ritmo de mejora`;
    return `${v > 0 ? '+' : ''}${v} ${ETIQ_PASIVO[k] ?? k}`;
  }).filter(Boolean).join(' · ');
}

function sumaPasivos() {
  const t = {};
  for (const id of estado.objetos) {
    for (const [k, v] of Object.entries(POROBJETO[id]?.pasivo ?? {})) t[k] = (t[k] ?? 0) + v;
  }
  return t;
}

// ── Ruleta de probabilidad ───────────────────────────────────────────────────
// La barra reparte el espacio entre lo que puede salir bien y lo que puede
// salir mal. La aguja recorre la barra, frena y se para donde toca.
function barraProb(riesgo, grande = false) {
  const bien = Math.round(riesgo * 100);
  return `
    <div class="ruleta-pista ${grande ? 'grande' : ''}">
      <div class="seg bien" style="width:${bien}%"><span>${bien}%</span></div>
      <div class="seg mal" style="width:${100 - bien}%"><span>${100 - bien}%</span></div>
      <div class="aguja" style="left:50%"></div>
    </div>`;
}

function girarRuleta(caja, riesgo, ok) {
  return new Promise(resolve => {
    const aguja = caja.querySelector('.aguja');
    const pista = caja.querySelector('.ruleta-pista');
    const estadoTxt = caja.querySelector('.ruleta-estado');
    const bien = riesgo * 100;
    // Destino: un punto al azar dentro del tramo que ha salido de verdad.
    // Los márgenes evitan que la aguja pare justo encima de la frontera.
    const margen = Math.min(3, bien / 4, (100 - bien) / 4);
    const destino = ok ? azarUI(margen, Math.max(margen + 0.5, bien - margen))
                       : azarUI(bien + margen, 100 - margen);
    // Vueltas ENTERAS: así el último fotograma cae exactamente en el destino
    // y la aguja nunca da un salto al terminar.
    const vueltas = 3;
    const dur = 1600 + Math.random() * 350;
    const t0 = performance.now();

    const paso = ahora => {
      const t = Math.min(1, (ahora - t0) / dur);
      const suave = 1 - Math.pow(1 - t, 3);            // frena al final
      const pos = t < 1 ? (vueltas * 100 * suave + destino) % 100 : destino;
      aguja.style.left = `${pos}%`;
      pista.classList.toggle('en-bien', pos <= bien);
      pista.classList.toggle('en-mal', pos > bien);
      if (t < 1) return requestAnimationFrame(paso);
      // Estado final: lo que marca la aguja es exactamente lo que se aplica
      pista.classList.remove('en-bien', 'en-mal');
      pista.classList.add(ok ? 'gana-bien' : 'gana-mal');
      caja.classList.add(ok ? 'salio-bien' : 'salio-mal');
      estadoTxt.textContent = ok ? '¡Sale bien!' : 'Sale mal…';
      setTimeout(resolve, 700);
    };
    requestAnimationFrame(paso);
  });
}

const azarUI = (a, b) => a + Math.random() * (b - a);

// ── Bucle: una decisión + sus temporadas ─────────────────────────────────────
function siguientePaso() {
  const causa = debeRetirarse(estado);
  if (causa) { retirar(estado, causa); return pantallaFinal(); }

  estado.flags.etapaActual = etapaDe(estado);
  const ev = siguienteEvento(estado);
  if (!ev) return correrTemporadas();

  const titulo = typeof ev.titulo === 'function' ? ev.titulo(estado) : ev.titulo;
  const texto = typeof ev.texto === 'function' ? ev.texto(estado) : ev.texto;
  const ops = ev.opciones.filter(o => !o.cond || o.cond(estado));

  const html = `
    <div class="tarjeta">
      <div class="etiqueta-anio">Año ${estado.año} · ${estado.edad} años · ${nombreEtapa(estado.flags.etapaActual)}</div>
      <h2>${esc(titulo)}</h2>
      <p class="cuerpo">${esc(texto)}</p>
      <div class="opciones ${ops.length === 2 ? 'dos' : ''}">
        ${ops.map((o, i) => `<button class="opcion-evento" data-i="${i}">
          ${o.icono ? `<img class="ico" src="${iconoObjeto(o.icono)}" alt="">` : '<span class="ico-txt">▸</span>'}
          <span class="nom">${esc(o.txt)}</span>
          ${o.sub ? `<span class="des">${esc(o.sub)}</span>` : ''}
          ${o.riesgo != null ? barraProb(o.riesgo) : '<span class="prob segura">Sin riesgo</span>'}
        </button>`).join('')}
      </div>
    </div>`;

  const elegir = v => { v.querySelector('.opciones').onclick = async e => {
    const b = e.target.closest('.opcion-evento'); if (!b) return;
    const op = ops[+b.dataset.i];
    const ok = op.riesgo == null ? true : dado(op.riesgo);

    // Con riesgo: se gira la ruleta delante del jugador antes de saber nada
    if (op.riesgo != null) {
      const caja = v.querySelector('.opciones');
      caja.outerHTML = `
        <div class="ruleta">
          <div class="ruleta-titulo">${esc(op.txt)}</div>
          ${barraProb(op.riesgo, true)}
          <div class="ruleta-estado">Girando…</div>
        </div>`;
      await girarRuleta(document.querySelector('.ruleta'), op.riesgo, ok);
    }

    const res = String(op.efecto(estado, ok));
    const [cuerpo, efectos] = res.split('\n\n▸ ');

    pintarCarrera(`
      <div class="tarjeta consecuencia ${ok ? 'bien' : ''}">
        <div class="etiqueta-anio">Año ${estado.año} · ${esc(titulo)}</div>
        <div class="elegida">▸ ${esc(op.txt)}</div>
        ${op.riesgo != null
          ? `<div class="veredicto ${ok ? 'bien' : 'mal'}" style="margin-top:8px">${ok ? 'Salió bien' : 'Salió mal'} · era ${Math.round(op.riesgo * 100)}%</div>`
          : ''}
        <p class="cuerpo">${esc(cuerpo)}</p>
        ${efectos ? `<div class="efectos">${esc(efectos)}</div>` : ''}
      </div>`);
    pintarBarra();
    correrTemporadas();
  }; };

  pintarCarrera(html, { enlazar: elegir });
}

function correrTemporadas() {
  let html = '';
  for (let i = 0; i < estado.cada; i++) {
    const linea = simularTemporada(estado);
    if (linea.trofeo) html += tarjetaTrofeo(linea.trofeo);
    html += `
      <div class="tarjeta temporada">
        <div class="etiqueta-anio">Temporada ${linea.año} · ${linea.edad} años</div>
        <ul>${linea.sucesos.map(s => `<li class="${s.includes('🏆') ? 'grande' : ''}">${esc(s)}</li>`).join('')}</ul>
      </div>`;
    const causa = debeRetirarse(estado);
    if (causa || estado.flags.retiroElegido) {
      retirar(estado, causa || 'eleccion');
      pintarCarrera(html, { añadir: true }); pintarBarra();
      return pantallaFinal();
    }
  }
  html += `<button class="boton-grande" id="seguir">Sigue tu aventura ▸</button>`;
  pintarCarrera(html, {
    añadir: true,
    enlazar: v => { v.querySelector('#seguir').onclick = siguientePaso; },
  });
  pintarBarra();
}

// ── Pantalla final ───────────────────────────────────────────────────────────
const TEXTO_RETIRO = {
  edad: 'El cuerpo dijo basta. Treinta y tantos años y una vida entera de viajes en la mochila.',
  salud: 'Las lesiones acumuladas te obligan a dejarlo antes de tiempo. Nadie te lo discute.',
  moral: 'Un día te levantas y sabes que ya no quieres esto. Lo anuncias sin dramatismo.',
  olvido: 'Los patrocinadores dejaron de llamar y los torneos de invitarte. Te retiras casi sin ruido.',
  eleccion: 'Te retiraste cuando quisiste, como quisiste. Muy pocos pueden decir eso.',
};

function pantallaFinal() {
  const pts = legado(estado);
  const rango = rangoDe(pts);
  const premios = logrosDe(estado);
  const equipo = estado.equipo.filter(p => !p.retirado).sort((a, b) => b.nivel - a.nivel).slice(0, 6);
  const apodo = apodoDe(estado);

  app.innerHTML = `<div id="vista"></div>`;
  document.getElementById('vista').innerHTML = `
    <div class="tarjeta final">
      <div class="etiqueta-anio">Fin de la carrera · ${estado.edad} años · ${estado.año} temporadas</div>
      <div class="emoji-rango">${rango.emoji}</div>
      <h2>${esc(rango.titulo)}</h2>
      <p class="desc-rango">${esc(rango.desc)}</p>
      <p class="cuerpo" style="margin-top:10px;font-size:14px">
        ${esc(estado.nombre)} "${esc(apodo)}", de ${esc(estado.regionNombre)} · media final ${Math.round(estado.media)}<br>
        ${esc(TEXTO_RETIRO[estado.causaRetiro] ?? '')}</p>
      <p class="puntos">Puntuación de legado<b>${pts}</b></p>
      <div class="stats-final">
        <div><div class="v">${estado.titulos.length}</div><div class="k">Títulos</div></div>
        <div><div class="v">${estado.medallas}</div><div class="k">Medallas</div></div>
        <div><div class="v">${estado.mundiales}</div><div class="k">Mundiales</div></div>
        <div><div class="v">${estado.victorias}</div><div class="k">Victorias</div></div>
        <div><div class="v">${estado.derrotas}</div><div class="k">Derrotas</div></div>
        <div><div class="v">${Math.round(estado.dinero / 1000)}k</div><div class="k">Fortuna ₽</div></div>
      </div>
    </div>

    <div class="tarjeta">
      <div class="etiqueta-anio">Equipo final</div>
      <div class="equipo-rejilla">
        ${equipo.map(p => `<div class="carta-poke">${img(p.dex)}
          <div class="n">${esc(p.nombre)}${p.socio ? ' ★' : ''}</div>
          <div class="p">Nivel ${Math.round(p.nivel)}</div>${badgesTipo(p.tipos)}</div>`).join('')
          || '<p class="cuerpo">Te retiraste sin equipo.</p>'}
      </div>
    </div>

    <div class="tarjeta">
      <div class="etiqueta-anio">Premios de esta carrera (${premios.length})</div>
      <div class="premios">
        ${premios.map(p => `<div class="premio">
          <div class="e">${p.emoji}</div><div class="n">${esc(p.nombre)}</div><div class="d">${esc(p.desc)}</div>
        </div>`).join('') || '<p class="cuerpo">Ningún premio. Empieza otra y a por ellos.</p>'}
      </div>
    </div>

    ${estado.hitos.length ? `<div class="tarjeta">
      <div class="etiqueta-anio">Momentos de una vida</div>
      <ul class="lista-limpia">${estado.hitos.map(h => `<li>${h.emoji} ${esc(h.texto)} <span class="año">· año ${h.año}</span></li>`).join('')}</ul>
    </div>` : ''}

    <button class="boton-grande" id="guardar">📸 Guardar la tarjeta como imagen</button>
    <button class="boton-secundario" id="copiar">Copiar resumen en texto</button>
    <button class="boton-secundario" id="otra">Jugar otra vez</button>`;

  window.scrollTo({ top: 0, behavior: 'instant' });
  document.getElementById('otra').onclick = () => pantallaInicio();
  document.getElementById('guardar').onclick = async () => {
    const b = document.getElementById('guardar');
    b.textContent = 'Generando imagen…';
    try { await descargarTarjeta(estado, { pts, rango, premios, equipo, apodo }); aviso('¡Imagen guardada!'); }
    catch { aviso('No se pudo generar la imagen'); }
    b.textContent = '📸 Guardar la tarjeta como imagen';
  };
  document.getElementById('copiar').onclick = () => copiarResumen(pts, rango, equipo, apodo, premios);
}

function aviso(txt) {
  const a = document.createElement('div');
  a.className = 'aviso'; a.textContent = txt;
  document.body.appendChild(a);
  setTimeout(() => a.remove(), 2200);
}

function copiarResumen(pts, rango, equipo, apodo, premios) {
  const txt = [
    `${rango.emoji} ${estado.nombre} "${apodo}" — ${rango.titulo}`,
    `${estado.regionEmoji} ${estado.regionNombre} · ${estado.año} temporadas · retirado a los ${estado.edad} · media ${Math.round(estado.media)}`,
    ``,
    `🏆 ${estado.titulos.length} títulos · 🎖️ ${estado.medallas}/8 medallas · 🌍 ${estado.mundiales} mundiales`,
    `⚔️ ${estado.victorias}V-${estado.derrotas}D · ✨ Fama ${Math.round(estado.stats.fama)} · 💰 ${estado.dinero.toLocaleString('es')} ₽`,
    `👥 ${equipo.map(p => p.nombre).join(', ')}`,
    `🏅 ${premios.map(p => p.nombre).join(' · ')}`,
    ``,
    `Legado: ${pts} puntos · Conviértete en Leyenda`,
  ].join('\n');
  const ok = () => aviso('¡Resumen copiado!');
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(txt).then(ok).catch(() => respaldo(txt, ok));
  else respaldo(txt, ok);
}

function respaldo(txt, ok) {
  const ta = document.createElement('textarea');
  ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); ok(); } catch { /* nada */ }
  ta.remove();
}

pantallaInicio();
