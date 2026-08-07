// Interfaz y bucle de juego.
import { REGIONES, ESTILOS, RITMOS, INICIALES, TIPOS, PORLINEA, spriteUrl } from './datos.js';
import {
  nuevaPartida, simularTemporada, etapaDe, ETAPAS, debeRetirarse, retirar,
  legado, rangoDe, poderEquipo, poderPokemon, apodoDe, elegir,
} from './motor.js';
import { siguienteEvento } from './eventos.js';

const app = document.getElementById('app');
let estado = null;
let feed = null;

// Pokéball de reserva si el sprite remoto no carga (offline)
const BALL = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22%3E%3Ccircle cx=%2232%22 cy=%2232%22 r=%2228%22 fill=%22%23e8ecff%22/%3E%3Cpath d=%22M4 32a28 28 0 0 1 56 0z%22 fill=%22%23ff5470%22/%3E%3Crect x=%224%22 y=%2228%22 width=%2256%22 height=%228%22 fill=%22%23262d4f%22/%3E%3Ccircle cx=%2232%22 cy=%2232%22 r=%229%22 fill=%22%23fff%22 stroke=%22%23262d4f%22 stroke-width=%224%22/%3E%3C/svg%3E';
const img = (dex, cls = '') =>
  `<img class="${cls}" src="${spriteUrl(dex)}" alt="" loading="lazy">`;

// Si un sprite no carga (sin red, fichero movido), cae a la Pokéball dibujada
document.addEventListener('error', ev => {
  const t = ev.target;
  if (t?.tagName === 'IMG' && t.src !== BALL) t.src = BALL;
}, true);

const badgesTipo = tipos => `<div class="tipos">${tipos
  .map(t => `<span class="tipo" style="background:${TIPOS[t]?.color ?? '#888'}">${TIPOS[t]?.nombre ?? t}</span>`)
  .join('')}</div>`;
const esc = s => String(s).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

// ── Pantalla inicial ─────────────────────────────────────────────────────────
const seleccion = { region: REGIONES[0], estilo: ESTILOS[0], inicial: null, ritmo: RITMOS[1] };

function pantallaInicio() {
  seleccion.inicial = null;
  const porRegion = INICIALES.filter(l => l.region === seleccion.region.id);
  app.innerHTML = `
    <div class="portada">
      <div class="bolas">⚡ 🔴 ⚡</div>
      <h1>Conviértete<br>en Leyenda</h1>
      <p class="sub">Veinte años de carrera como entrenador Pokémon.<br>Tú solo tomas las decisiones que importan.</p>
    </div>

    <div class="bloque">
      <label for="nombre">Tu nombre</label>
      <input id="nombre" type="text" maxlength="18" placeholder="Escribe tu nombre" autocomplete="off">
    </div>

    <div class="bloque">
      <span class="titulo-campo">Región natal</span>
      <div class="rejilla tres" id="regiones">
        ${REGIONES.map((r, i) => `
          <button class="opcion" data-i="${i}" aria-pressed="${r.id === seleccion.region.id}">
            <span class="nom">${r.emoji} ${r.nombre}</span>
          </button>`).join('')}
      </div>
      <p class="des" style="color:var(--suave);font-size:12.5px;margin-top:8px" id="sabor-region">${seleccion.region.sabor}</p>
    </div>

    <div class="bloque">
      <span class="titulo-campo">Tu primer compañero</span>
      <div class="rejilla tres" id="iniciales">
        ${porRegion.map(l => `
          <button class="opcion op-inicial" data-id="${l.id}" aria-pressed="false">
            ${img(l.etapas[0].dex)}
            <span class="nom">${l.etapas[0].nombre}</span>
            ${badgesTipo(l.tipos)}
          </button>`).join('')}
      </div>
    </div>

    <div class="bloque">
      <span class="titulo-campo">Estilo de entrenador</span>
      <div class="rejilla dos" id="estilos">
        ${ESTILOS.map((s, i) => `
          <button class="opcion" data-i="${i}" aria-pressed="${s.id === seleccion.estilo.id}">
            <span class="nom">${s.emoji} ${s.nombre}</span>
            <span class="des">${s.desc}</span>
          </button>`).join('')}
      </div>
    </div>

    <div class="bloque">
      <span class="titulo-campo">Ritmo de la partida</span>
      <div class="rejilla tres" id="ritmos">
        ${RITMOS.map((r, i) => `
          <button class="opcion" data-i="${i}" aria-pressed="${r.id === seleccion.ritmo.id}">
            <span class="nom">${r.nombre}</span>
            <span class="des">${r.desc}</span>
          </button>`).join('')}
      </div>
    </div>

    <button class="boton-grande" id="empezar" disabled>Empezar la carrera</button>
    <p class="pie">Cada partida es distinta. Nadie llega dos veces igual al final.</p>`;

  const marcar = (cont, btn) => {
    cont.querySelectorAll('.opcion').forEach(b => b.setAttribute('aria-pressed', 'false'));
    btn.setAttribute('aria-pressed', 'true');
  };

  const regiones = document.getElementById('regiones');
  regiones.onclick = ev => {
    const b = ev.target.closest('.opcion'); if (!b) return;
    seleccion.region = REGIONES[+b.dataset.i];
    pantallaInicio();
    document.getElementById('sabor-region').textContent = seleccion.region.sabor;
  };

  const inics = document.getElementById('iniciales');
  inics.onclick = ev => {
    const b = ev.target.closest('.opcion'); if (!b) return;
    seleccion.inicial = PORLINEA[b.dataset.id];
    marcar(inics, b);
    document.getElementById('empezar').disabled = !document.getElementById('nombre').value.trim();
  };

  const ests = document.getElementById('estilos');
  ests.onclick = ev => { const b = ev.target.closest('.opcion'); if (!b) return; seleccion.estilo = ESTILOS[+b.dataset.i]; marcar(ests, b); };

  const rits = document.getElementById('ritmos');
  rits.onclick = ev => { const b = ev.target.closest('.opcion'); if (!b) return; seleccion.ritmo = RITMOS[+b.dataset.i]; marcar(rits, b); };

  const nombre = document.getElementById('nombre');
  nombre.oninput = () => {
    document.getElementById('empezar').disabled = !(nombre.value.trim() && seleccion.inicial);
  };

  document.getElementById('empezar').onclick = () => {
    estado = nuevaPartida({
      nombre: nombre.value.trim().slice(0, 18),
      region: seleccion.region, estilo: seleccion.estilo,
      inicial: seleccion.inicial, ritmo: seleccion.ritmo,
    });
    pantallaJuego();
  };
}

// ── Pantalla de juego ────────────────────────────────────────────────────────
function pantallaJuego() {
  app.innerHTML = `<div id="hud"></div><div id="feed"></div>`;
  feed = document.getElementById('feed');
  pintarHud();
  añadir(`
    <div class="tarjeta">
      <div class="etiqueta-año">Año 1 · ${estado.edad} años</div>
      <h2>${estado.regionEmoji} ${esc(estado.nombre)} sale de casa</h2>
      <p class="cuerpo">${esc(estado.regionNombre)}. ${estado.stats ? '' : ''}${esc(seleccion.region.sabor)}
      Tu madre te dice que llames. Tú ya estás pensando en el ${esc(estado.equipo[0].nombre)} que llevas en la mochila.</p>
    </div>`);
  siguientePaso();
}

const BARRAS = [
  ['poder', 'Poder', '#ff5470'], ['estrategia', 'Estrategia', '#7c7cff'], ['vinculo', 'Vínculo', '#4ade80'],
  ['fama', 'Fama', '#ffcb3d'], ['salud', 'Salud', '#4dd0e1'], ['moral', 'Moral', '#ff9f1c'],
];

function pintarHud() {
  const et = ETAPAS.find(x => x.id === etapaDe(estado)) ?? ETAPAS[0];
  const s = estado.stats;
  document.getElementById('hud').innerHTML = `
    <div class="hud">
      <div class="hud-fila">
        <span class="hud-nombre">${esc(estado.nombre)}</span>
        <span class="hud-etapa">${et.nombre}</span>
      </div>
      <div class="hud-fila">
        <span class="hud-meta">Año ${estado.año} · ${estado.edad} años · ${estado.regionEmoji} ${esc(estado.regionNombre)}</span>
        <span class="hud-meta">${estado.dinero.toLocaleString('es')} ₽ · 🎖️${estado.medallas} · 🏆${estado.titulos.length}</span>
      </div>
      <div class="barras">
        ${BARRAS.map(([k, n, c]) => `
          <div class="barra">
            <div class="et"><span>${n}</span><span>${Math.round(s[k])}</span></div>
            <div class="pista"><div class="relleno" style="width:${s[k]}%;background:${c}"></div></div>
          </div>`).join('')}
      </div>
      <div class="equipo-tira">
        ${estado.equipo.filter(p => !p.retirado).map(p =>
          `<span class="mini ${p.lesionado ? 'lesion' : ''} ${p.socio ? 'socio' : ''}" title="${p.nombre}">${img(p.dex)}</span>`).join('')
          || '<span class="hud-meta">Sin equipo</span>'}
      </div>
    </div>`;
}

function añadir(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  const nodo = div.firstElementChild;
  feed.appendChild(nodo);
  requestAnimationFrame(() => nodo.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  return nodo;
}

// Un paso = una decisión + las temporadas que toquen según el ritmo
function siguientePaso() {
  const causa = debeRetirarse(estado);
  if (causa) { retirar(estado, causa); return pantallaFinal(); }

  estado.flags.etapaActual = etapaDe(estado);
  const ev = siguienteEvento(estado);
  if (!ev) { correrTemporadas(); return; }

  const titulo = typeof ev.titulo === 'function' ? ev.titulo(estado) : ev.titulo;
  const texto = typeof ev.texto === 'function' ? ev.texto(estado) : ev.texto;
  const opciones = ev.opciones.filter(o => !o.cond || o.cond(estado));

  const nodo = añadir(`
    <div class="tarjeta">
      <div class="etiqueta-año">Año ${estado.año} · ${estado.edad} años</div>
      <h2>${esc(titulo)}</h2>
      <p class="cuerpo">${esc(texto)}</p>
      <div class="opciones">
        ${opciones.map((o, i) => `
          <button class="opcion-evento" data-i="${i}">
            <span class="nom">${esc(o.txt)}</span>
            ${o.sub ? `<span class="des">${esc(o.sub)}</span>` : ''}
          </button>`).join('')}
      </div>
    </div>`);

  nodo.querySelector('.opciones').onclick = e => {
    const b = e.target.closest('.opcion-evento'); if (!b) return;
    const op = opciones[+b.dataset.i];
    nodo.querySelector('.opciones').remove();
    nodo.insertAdjacentHTML('beforeend',
      `<p class="cuerpo" style="margin-top:10px;color:var(--acento);font-weight:700">▸ ${esc(op.txt)}</p>`);

    const res = op.efecto(estado);
    const [cuerpo, efectos] = String(res).split('\n\n▸ ');
    añadir(`
      <div class="tarjeta consecuencia">
        <p class="cuerpo">${esc(cuerpo)}</p>
        ${efectos ? `<div class="efectos">${esc(efectos)}</div>` : ''}
      </div>`);
    pintarHud();
    correrTemporadas();
  };
}

function correrTemporadas() {
  for (let i = 0; i < estado.cada; i++) {
    const linea = simularTemporada(estado);
    añadir(`
      <div class="tarjeta temporada">
        <div class="etiqueta-año">Temporada ${linea.año} · ${linea.edad} años</div>
        <ul>${linea.sucesos.map(s =>
          `<li class="${s.includes('🏆') ? 'grande' : ''}">${esc(s)}</li>`).join('')}</ul>
      </div>`);
    pintarHud();
    const causa = debeRetirarse(estado);
    if (causa) { retirar(estado, causa); return pantallaFinal(); }
    if (estado.flags.retiroElegido) { retirar(estado, 'eleccion'); return pantallaFinal(); }
  }
  siguientePaso();
}

// ── Pantalla final ───────────────────────────────────────────────────────────
const TEXTO_RETIRO = {
  edad: 'El cuerpo dijo basta. Treinta y tantos años y una vida entera de viajes en la mochila.',
  salud: 'Las lesiones acumuladas te obligan a dejarlo antes de tiempo. Nadie te lo discute.',
  moral: 'Un día te levantas y sabes que ya no quieres esto. Lo anuncias sin dramatismo.',
  olvido: 'Los patrocinadores dejaron de llamar, los torneos dejaron de invitarte. Te retiras casi sin que nadie lo note.',
  eleccion: 'Te retiraste cuando quisiste, como quisiste. Muy pocos pueden decir eso.',
};

function pantallaFinal() {
  const pts = legado(estado);
  const rango = rangoDe(pts);
  const equipo = estado.equipo.filter(p => !p.retirado).sort((a, b) => poderPokemon(b) - poderPokemon(a)).slice(0, 6);
  const s = estado.stats;
  const apodo = apodoDe(estado);

  añadir(`
    <div class="tarjeta final">
      <div class="etiqueta-año">Fin de la carrera · ${estado.edad} años · ${estado.año} temporadas</div>
      <div class="emoji-rango">${rango.emoji}</div>
      <h2>${esc(rango.titulo)}</h2>
      <p class="desc-rango">${esc(rango.desc)}</p>
      <p class="cuerpo" style="margin-top:12px;font-size:14.5px">
        ${esc(estado.nombre)} "${esc(apodo)}", de ${esc(estado.regionNombre)}.<br>
        ${esc(TEXTO_RETIRO[estado.causaRetiro] ?? '')}
      </p>
      <p class="puntos">Puntuación de legado<br><b>${pts}</b></p>

      <div class="stats-final">
        <div><div class="v">${estado.titulos.length}</div><div class="k">Títulos</div></div>
        <div><div class="v">${estado.medallas}</div><div class="k">Medallas</div></div>
        <div><div class="v">${estado.mundiales}</div><div class="k">Mundiales</div></div>
        <div><div class="v">${estado.victorias}</div><div class="k">Victorias</div></div>
        <div><div class="v">${estado.derrotas}</div><div class="k">Derrotas</div></div>
        <div><div class="v">${Math.round(s.fama)}</div><div class="k">Fama</div></div>
        <div><div class="v">${Math.round(poderEquipo(estado))}</div><div class="k">Poder equipo</div></div>
        <div><div class="v">${estado.rival.derrotasTuyas}-${estado.rival.victoriasSuyas}</div><div class="k">vs ${esc(estado.rival.nombre)}</div></div>
        <div><div class="v">${Math.round(estado.dinero / 1000)}k</div><div class="k">Fortuna ₽</div></div>
      </div>

      <div class="titulo-campo" style="margin-top:20px;text-align:left">Equipo final</div>
      <div class="equipo-final">
        ${equipo.map(p => `
          <div class="carta-poke">
            ${img(p.dex)}
            <div class="n">${esc(p.nombre)}</div>
            <div class="p">Poder ${Math.round(poderPokemon(p))}${p.socio ? ' · ★' : ''}</div>
            ${badgesTipo(p.tipos)}
          </div>`).join('') || '<p class="cuerpo">Te retiraste sin equipo. Duro final.</p>'}
      </div>

      ${estado.hitos.length ? `
        <div class="titulo-campo" style="margin-top:20px;text-align:left">Momentos de una vida</div>
        <ul class="hitos">
          ${estado.hitos.map(h => `<li>${h.emoji} ${esc(h.texto)} <span class="año">· año ${h.año}</span></li>`).join('')}
        </ul>` : ''}

      ${estado.titulos.length ? `
        <div class="titulo-campo" style="margin-top:18px;text-align:left">Palmarés</div>
        <ul class="hitos">
          ${estado.titulos.map(t => `<li>🏆 ${esc(t.nombre)} <span class="año">· año ${t.año}</span></li>`).join('')}
        </ul>` : ''}

      <button class="boton-grande" id="compartir">Copiar resumen para compartir</button>
      <button class="boton-secundario" id="otra">Jugar otra vez</button>
    </div>`);

  document.getElementById('otra').onclick = () => { window.scrollTo(0, 0); pantallaInicio(); };
  document.getElementById('compartir').onclick = () => compartir(pts, rango, equipo, apodo);
}

function compartir(pts, rango, equipo, apodo) {
  const txt = [
    `${rango.emoji} ${estado.nombre} "${apodo}" — ${rango.titulo}`,
    `${estado.regionEmoji} ${estado.regionNombre} · ${estado.año} temporadas · retirado a los ${estado.edad}`,
    ``,
    `🏆 ${estado.titulos.length} títulos · 🎖️ ${estado.medallas}/8 medallas · 🌍 ${estado.mundiales} mundiales`,
    `⚔️ ${estado.victorias}V - ${estado.derrotas}D · ✨ Fama ${Math.round(estado.stats.fama)} · 💰 ${estado.dinero.toLocaleString('es')} ₽`,
    `👥 ${equipo.map(p => p.nombre).join(', ')}`,
    ``,
    `Legado: ${pts} puntos`,
    `Conviértete en Leyenda · simulador de carrera Pokémon`,
  ].join('\n');

  const ok = () => {
    const a = document.createElement('div');
    a.className = 'aviso-copia';
    a.textContent = '¡Resumen copiado!';
    document.body.appendChild(a);
    setTimeout(() => a.remove(), 2200);
  };

  if (navigator.share) {
    navigator.share({ text: txt }).catch(() => copiar(txt, ok));
  } else copiar(txt, ok);
}

function copiar(txt, ok) {
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(txt).then(ok).catch(() => fallback(txt, ok));
  else fallback(txt, ok);
}

function fallback(txt, ok) {
  const ta = document.createElement('textarea');
  ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); ok(); } catch { /* nada */ }
  ta.remove();
}

pantallaInicio();
