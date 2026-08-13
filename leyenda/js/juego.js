// Interfaz y bucle de juego.
import {
  REGIONES, ESTILOS, RITMOS, INICIALES, TIPOS, PORLINEA, POROBJETO, LOGROS,
  spriteUrl, iconoObjeto,
} from './datos.js?v=41';
import {
  nuevaPartida, simularTemporada, etapaDe, nombreEtapa, debeRetirarse, retirar,
  legado, rangoDe, logrosDe, poderEquipo, poderPokemon, apodoDe, dado,
  guardarPartida, cargarPartida, borrarPartida, esSatoshi,
  leerPalmares, apuntarEnPalmares, borrarPalmares, exportarPalmares, importarPalmares,
  leerLogros, desbloquearLogros, borrarLogros,
} from './motor.js?v=41';
import { siguienteEvento } from './eventos.js?v=41';
import { descargarTarjeta } from './tarjeta.js?v=41';
import { L, idioma, fijarIdioma, numLocale } from './i18n.js?v=41';

// Título y descripción de la pestaña, ajustados al idioma detectado/elegido.
// El HTML de partida (para buscadores) se queda en español; esto solo
// actualiza lo que ve un navegador real, incluido Google cuando ejecuta JS.
document.title = L('Hazte con Todos · Simulador de carrera Pokémon',
  'Hazte con Todos · Pokémon Career Simulator', 'Hazte con Todos · Simulatore di carriera Pokémon');
document.querySelector('meta[name=description]')?.setAttribute('content', L(
  'Simula 20 años de carrera como entrenador Pokémon en dos minutos. Decisiones, torneos, lesiones, fichajes y una tarjeta final para compartir.',
  'Simulate 20 years of a Pokémon trainer career in two minutes. Decisions, tournaments, injuries, signings and a shareable final card.',
  'Simula 20 anni di carriera come allenatore Pokémon in due minuti. Decisioni, tornei, infortuni, ingaggi e una tessera finale da condividere.'));

// ── Selector de idioma ───────────────────────────────────────────────────────
// Bandera arriba a la derecha, junto al tema. Al cambiar, se recarga la
// pantalla de inicio (si estás en plena carrera se queda donde estabas: solo
// cambia el idioma de lo que se pinte a partir de ahora).
const BANDERAS = { es: '🇪🇸', en: '🇺🇸', it: '🇮🇹' };
function botonIdioma() {
  const actual = idioma();
  return `<button class="boton-idioma" id="idioma" type="button"
    aria-label="${L('Cambiar idioma', 'Change language', 'Cambia lingua')}"
    title="${L('Cambiar idioma', 'Change language', 'Cambia lingua')}">${BANDERAS[actual]}</button>`;
}
document.addEventListener('click', ev => {
  if (!ev.target.closest('#idioma')) return;
  const orden = ['es', 'en', 'it'];
  // fijarIdioma recarga la página: es la forma de que se retraduzca todo,
  // incluidos los textos que se resuelven al cargar los módulos.
  if (estado && !estado.retirado) guardarPartida(estado);
  fijarIdioma(orden[(orden.indexOf(idioma()) + 1) % orden.length]);
});

// ── Tema claro / oscuro ──────────────────────────────────────────────────────
// Sin elección guardada seguimos al sistema; al pulsar, se fija a mano.
const CLAVE_TEMA = 'hazteconTodos.tema';
const temaSistema = () => (matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro');
const temaActual = () => document.documentElement.dataset.tema || temaSistema();

function botonTema() {
  const oscuro = temaActual() === 'oscuro';
  return `<button class="boton-tema" id="tema" type="button"
    aria-label="${L(`Cambiar a modo ${oscuro ? 'claro' : 'oscuro'}`, `Switch to ${oscuro ? 'light' : 'dark'} mode`, `Passa alla modalità ${oscuro ? 'chiara' : 'scura'}`)}"
    title="${L(`Cambiar a modo ${oscuro ? 'claro' : 'oscuro'}`, `Switch to ${oscuro ? 'light' : 'dark'} mode`, `Passa alla modalità ${oscuro ? 'chiara' : 'scura'}`)}">${oscuro ? '☀️' : '🌙'}</button>`;
}

function alternarTema() {
  const nuevo = temaActual() === 'oscuro' ? 'claro' : 'oscuro';
  document.documentElement.dataset.tema = nuevo;
  try { localStorage.setItem(CLAVE_TEMA, nuevo); } catch { /* da igual */ }
  document.querySelector('meta[name=theme-color]')
    ?.setAttribute('content', nuevo === 'oscuro' ? '#101320' : '#eaeef7');
  document.querySelectorAll('#tema').forEach(b => {
    const osc = nuevo === 'oscuro';
    b.textContent = osc ? '☀️' : '🌙';
    const t = L(`Cambiar a modo ${osc ? 'claro' : 'oscuro'}`, `Switch to ${osc ? 'light' : 'dark'} mode`, `Passa alla modalità ${osc ? 'chiara' : 'scura'}`);
    b.setAttribute('aria-label', t); b.setAttribute('title', t);
  });
}
// Delegado: el botón se repinta muchas veces, el listener vive una sola vez.
document.addEventListener('click', ev => {
  if (ev.target.closest('#tema')) alternarTema();
});

const app = document.getElementById('app');
let estado = null;
let pestaña = 'carrera';

const BALL = 'objetos/poke.png';
const img = (dex, cls = '', shiny = false) => `<img class="${cls}" src="${spriteUrl(dex, shiny)}" alt="" loading="lazy">`;
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

// Una línea del palmarés: rango, quién fue y cómo acabó.
const fila = c => `<button class="palmares-fila" data-id="${c.id}" type="button"
  title="Recuperar la tarjeta de esta carrera">
  <span class="palmares-emoji">${c.rangoEmoji ?? '🎖️'}</span>
  <span class="palmares-datos">
    <b>${esc(c.rango)}</b>
    <small>${esc(c.nombre)} · ${c.emoji ?? ''} ${esc(c.region)} · ${c.años} temporadas${c.ash ? ' · ⚡ Kanto' : ''}</small>
  </span>
  <span class="palmares-cifras"><b>${c.media}</b><small>${c.pts} pts</small></span>
  <span class="palmares-compartir">📸</span>
</button>`;

// Reconstruye la tarjeta de una carrera vieja a partir de su resumen guardado.
// La tarjeta solo lee un puñado de campos, así que basta con recomponerlos.
async function tarjetaDeCarrera(c) {
  await descargarTarjeta({
    nombre: c.nombre, regionNombre: c.region, media: c.media,
    año: c.años, edad: c.edad, titulos: Array(c.titulos ?? 0),
    medallas: c.medallas, mundiales: c.mundiales,
    victorias: c.victorias, derrotas: c.derrotas, dinero: c.dinero,
  }, {
    pts: c.pts,
    rango: { emoji: c.rangoEmoji ?? '🎖️', titulo: c.rango },
    premios: (c.premios ?? []).map(p => ({ ...p, desc: p.desc ?? '' })),
    equipo: c.equipo ?? [],
    apodo: c.apodo ?? '',
  });
}

// ── Medallero ────────────────────────────────────────────────────────────────
// Lo único que se acumula entre carreras: las insignias que has llegado a
// conseguir alguna vez. Las que faltan se ven, con su pista, para que sepas
// qué te queda por hacer.
function pantallaMedallero() {
  const tengo = new Set(leerLogros());
  const conseguidas = LOGROS.filter(l => tengo.has(l.id)).length;
  app.innerHTML = `
    <div class="tarjeta medallero">
      <div class="etiqueta-anio">${L('Medallero', 'Badge case', 'Medagliere')}</div>
      <h2>${L(`${conseguidas} de ${LOGROS.length}`, `${conseguidas} of ${LOGROS.length}`, `${conseguidas} su ${LOGROS.length}`)}</h2>
      <p class="cuerpo">${L('Las insignias se quedan aquí de una carrera a otra. Se guardan solo en este navegador: viajan con la copia del palmarés, sin cuentas ni servidores.',
        'Badges stay here from one career to the next. They\'re saved only in this browser: they travel with your palmarès backup, no accounts or servers.',
        'I distintivi restano qui da una carriera all\'altra. Si salvano solo in questo browser: viaggiano con la copia del palmarès, senza account né server.')}</p>
      <div class="barra-medallero"><span style="width:${Math.round(100 * conseguidas / LOGROS.length)}%"></span></div>
      <div class="rejilla-insignias">
        ${LOGROS.map(l => {
          const ok = tengo.has(l.id);
          return `<div class="insignia${ok ? '' : ' bloqueada'}">
            <span class="ins-emoji">${ok ? l.emoji : '🔒'}</span>
            <span class="ins-txt"><b>${esc(l.nombre)}</b><small>${esc(l.pista)}</small></span>
          </div>`;
        }).join('')}
      </div>
      <button class="boton-grande" id="volver-inicio">◂ Volver</button>
    </div>`;
  document.getElementById('volver-inicio').textContent = L('◂ Volver', '◂ Back', '◂ Indietro');
  document.getElementById('volver-inicio').onclick = pantallaInicio;
  scrollTo(0, 0);
}

function pantallaInicio() {
  seleccion.inicial = null;
  const guardada = cargarPartida();
  const palmares = leerPalmares();
  const porRegion = INICIALES.filter(l => l.region === seleccion.region.id);
  app.innerHTML = `
    <div class="portada">
      ${botonTema()}${botonIdioma()}
      <div class="bolas">⚡ 🔴 ⚡</div>
      <h1>Hazte<br>con Todos</h1>
      <p class="sub">${L('Veinte años de carrera como entrenador Pokémon.<br>Solo tomas las decisiones que importan.',
        'Twenty years of a Pokémon trainer career.<br>You only make the decisions that matter.',
        'Vent\'anni di carriera come allenatore Pokémon.<br>Prendi solo le decisioni che contano.')}</p>
      <p class="premisa">${L('Un mundo donde la Liga es un deporte profesional de verdad: empiezas con diez años cazando bichos por las rutas y acabas en regionales con jueces, patrocinadores y control de legalidad.',
        'A world where the League is a real professional sport: you start at age ten catching bugs on the routes and end up at regionals with judges, sponsors and legality checks.',
        'Un mondo dove la Lega è uno sport professionistico vero: inizi a dieci anni catturando insetti sui sentieri e finisci ai regionali con giudici, sponsor e controlli di legalità.')}</p>
    </div>

    ${guardada ? `
      <div class="tarjeta continuar">
        <div class="etiqueta-anio">${L('Tienes una carrera a medias', 'You have a career in progress', 'Hai una carriera in corso')}</div>
        <div class="continuar-datos">
          <span class="ovr" style="background:${colorOvr(Math.round(guardada.media))}">
            <span class="n">${Math.round(guardada.media)}</span><span class="k">Media</span>
          </span>
          <div>
            <div class="continuar-nombre">${esc(guardada.nombre)}</div>
            <div class="continuar-meta">${guardada.regionEmoji} ${esc(guardada.regionNombre)} · ${L('Año', 'Year', 'Anno')} ${guardada.año} · ${guardada.edad} ${L('años', 'y/o', 'anni')}</div>
          </div>
        </div>
        <button class="boton-grande" id="continuar">${L('Continuar esa carrera ▸', 'Continue that career ▸', 'Continua quella carriera ▸')}</button>
        <button class="boton-secundario" id="descartar">${L('Empezar una nueva y descartarla', 'Start a new one and discard it', 'Iniziane una nuova e scartala')}</button>
      </div>` : ''}

    ${palmares.length ? `
      <div class="tarjeta palmares">
        <div class="etiqueta-anio">${L(`Tu palmarés · ${palmares.length} carrera${palmares.length > 1 ? 's' : ''}`, `Your record · ${palmares.length} career${palmares.length > 1 ? 's' : ''}`, `Il tuo palmarès · ${palmares.length} carrier${palmares.length > 1 ? 'e' : 'a'}`)}</div>
        <div class="palmares-lista">
          ${palmares.slice(0, 5).map(fila).join('')}
        </div>
        ${palmares.length > 5 ? `<div class="palmares-lista oculto" id="palmares-resto">${palmares.slice(5).map(fila).join('')}</div>
        <button class="boton-secundario" id="ver-todas">${L(`Ver las ${palmares.length}`, `See all ${palmares.length}`, `Vedi tutte e ${palmares.length}`)}</button>` : ''}
        <div class="palmares-acciones">
          <button id="exportar">⬇️ ${L('Guardar copia', 'Save backup', 'Salva copia')}</button>
          <button id="importar">⬆️ ${L('Recuperar copia', 'Restore backup', 'Ripristina copia')}</button>
          <button id="olvidar" class="peligro">${L('Borrar', 'Delete', 'Elimina')}</button>
        </div>
        <input type="file" id="fichero" accept="application/json,.json" hidden>
        <p class="palmares-nota">${L('Se guarda solo en este navegador, sin cuentas ni servidores. Si cambias de móvil, usa', 'It\'s only saved in this browser, no accounts or servers. If you switch phones, use', 'Si salva solo in questo browser, senza account né server. Se cambi telefono, usa')} <b>${L('Guardar copia', 'Save backup', 'Salva copia')}</b> ${L('y luego', 'and then', 'e poi')} <b>${L('Recuperar copia', 'Restore backup', 'Ripristina copia')}</b> ${L('allí.', 'there.', 'lì.')}</p>
      </div>` : `
      <p class="recuperar">${L('¿Vienes de otro móvil?', 'Coming from another phone?', 'Vieni da un altro telefono?')}
        <button id="importar">${L('Recupera tu palmarés', 'Restore your record', 'Ripristina il tuo palmarès')}</button>
        <input type="file" id="fichero" accept="application/json,.json" hidden>
      </p>`}

    <button class="boton-medallero" id="ir-medallero" type="button">
      🎖️ ${L('Medallero', 'Badges', 'Medagliere')} <b>${leerLogros().length}/${LOGROS.length}</b>
    </button>

    <div class="bloque">
      <label for="nombre">${L('Tu nombre', 'Your name', 'Il tuo nome')}</label>
      <input id="nombre" type="text" maxlength="18" placeholder="${L('Escribe tu nombre', 'Type your name', 'Scrivi il tuo nome')}" autocomplete="off">
      <p class="pista-secreta oculto" id="pista-ash">
        ⚡ <b>${L('Arco de Kanto desbloqueado.', 'Kanto arc unlocked.', 'Arco di Kanto sbloccato.')}</b> ${L('Jugarás en Kanto, con Pikachu de compañero, Shigeru de rival y una decisión por temporada. La historia manda.',
        'You\'ll play in Kanto, with Pikachu as your partner, Shigeru as your rival, and one decision per season. The story takes over.',
        'Giocherai a Kanto, con Pikachu come compagno, Shigeru come rivale e una decisione a stagione. Comanda la storia.')}
      </p>
    </div>

    <div class="bloque">
      <span class="titulo-campo">${L('Región natal', 'Home region', 'Regione natale')}</span>
      <div class="rejilla tres" id="regiones">
        ${REGIONES.map((r, i) => `<button class="opcion" data-i="${i}" aria-pressed="${r.id === seleccion.region.id}">
          <span class="nom">${r.emoji} ${r.nombre}</span></button>`).join('')}
      </div>
      <p style="color:var(--suave);font-size:12.5px;margin-top:8px">${esc(seleccion.region.sabor)}</p>
    </div>

    <div class="bloque">
      <span class="titulo-campo">${L('Tu primer compañero', 'Your first partner', 'Il tuo primo compagno')}</span>
      <div class="rejilla tres" id="iniciales">
        ${porRegion.map(l => `<button class="opcion op-inicial" data-id="${l.id}" aria-pressed="false">
          ${img(l.etapas[0].dex)}<span class="nom">${l.etapas[0].nombre}</span>
          ${badgesTipo(l.etapas[0].tipos ?? l.tipos)}</button>`).join('')}
      </div>
    </div>

    <div class="bloque">
      <span class="titulo-campo">${L('Estilo de entrenador', 'Trainer style', 'Stile dell\'allenatore')}</span>
      <div class="rejilla dos" id="estilos">
        ${ESTILOS.map((s, i) => `<button class="opcion" data-i="${i}" aria-pressed="${s.id === seleccion.estilo.id}">
          <span class="nom">${s.emoji} ${s.nombre}</span><span class="des">${s.desc}</span></button>`).join('')}
      </div>
    </div>

    <div class="bloque">
      <span class="titulo-campo">${L('Ritmo de la partida', 'Game pace', 'Ritmo della partita')}</span>
      <div class="rejilla tres" id="ritmos">
        ${RITMOS.map((r, i) => `<button class="opcion" data-i="${i}" aria-pressed="${r.id === seleccion.ritmo.id}">
          <span class="nom">${r.nombre}</span><span class="des">${r.desc}</span></button>`).join('')}
      </div>
    </div>

    <button class="boton-grande" id="empezar" disabled>${L('Empezar la carrera', 'Start the career', 'Inizia la carriera')}</button>
    <p class="pie">${L('Cada partida es distinta. Nadie llega dos veces igual al final.', 'Every playthrough is different. Nobody reaches the end the same way twice.', 'Ogni partita è diversa. Nessuno arriva due volte uguale alla fine.')}</p>
    <a class="firma" href="https://x.com/soypalo_" target="_blank" rel="noopener noreferrer">
      <span class="firma-x">X</span>
      <span>${L('Hecho por', 'Made by', 'Creato da')} <b>@SoyPalo_</b> · ${L('sígueme para más cosas así', 'follow me for more stuff like this', 'seguimi per altre cose così')}</span>
    </a>
    <p class="aviso-legal">${L('Proyecto de fan, sin ánimo de lucro y sin relación con Nintendo, Creatures o GAME FREAK. Pokémon es marca registrada de sus propietarios. Sprites de',
      'Fan project, non-profit and unaffiliated with Nintendo, Creatures or GAME FREAK. Pokémon is a trademark of its owners. Sprites from',
      'Progetto di fan, senza scopo di lucro e senza alcun legame con Nintendo, Creatures o GAME FREAK. Pokémon è un marchio registrato dei rispettivi proprietari. Sprite di')}
      <b>PokeAPI</b> ${L('y', 'and', 'e')} <b>pokesprite</b>; ${L('tipografías de', 'fonts from', 'font di')} <b>Google Fonts</b> (OFL).<br>
      ${L('Los guiños a personas reales de la comunidad competitiva son', 'The nods to real people from the competitive community are', 'I riferimenti a persone reali della comunità competitiva sono')} <b>${L('ficción y cariño', 'fiction and affection', 'finzione e affetto')}</b>:
      ${L('las situaciones están inventadas y nadie las ha dicho ni hecho.', 'the situations are made up and nobody said or did them.', 'le situazioni sono inventate e nessuno le ha dette o fatte.')}
    </p>`;

  const marcar = (cont, btn) => {
    cont.querySelectorAll('.opcion').forEach(b => b.setAttribute('aria-pressed', 'false'));
    btn.setAttribute('aria-pressed', 'true');
  };
  const revisar = () => {
    const nom = document.getElementById('nombre').value;
    document.getElementById('empezar').disabled = !(nom.trim() && seleccion.inicial);
    document.getElementById('pista-ash').classList.toggle('oculto', !esSatoshi(nom));
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
  document.getElementById('ir-medallero').onclick = pantallaMedallero;

  // Recuperar copia tiene que estar SIEMPRE, incluso sin palmarés: es
  // justo lo que necesita alguien que acaba de estrenar móvil.
  const fichero = document.getElementById('fichero');
  document.getElementById('importar').onclick = () => fichero.click();
  fichero.onchange = async () => {
    const f = fichero.files?.[0];
    if (!f) return;
    try {
      const { nuevas, total } = importarPalmares(await f.text());
      aviso(nuevas ? L(`Recuperadas ${nuevas} carrera${nuevas > 1 ? 's' : ''} (${total} en total).`, `Restored ${nuevas} career${nuevas > 1 ? 's' : ''} (${total} total).`, `Recuperate ${nuevas} carrier${nuevas > 1 ? 'e' : 'a'} (${total} in totale).`) : L('Ya las tenías todas.', 'You already had them all.', 'Le avevi già tutte.'));
      const nom = document.getElementById('nombre').value;
      pantallaInicio();
      document.getElementById('nombre').value = nom;
    } catch { aviso(L('Ese fichero no es un palmarés válido.', 'That file is not a valid record.', 'Quel file non è un palmarès valido.')); }
    fichero.value = '';
  };

  if (palmares.length) {
    for (const b of document.querySelectorAll('.palmares-fila')) {
      b.onclick = async () => {
        const c = palmares.find(x => x.id === b.dataset.id);
        if (!c) return;
        try { await tarjetaDeCarrera(c); aviso(L('Tarjeta de esa carrera lista.', 'That career\'s card is ready.', 'Tessera di quella carriera pronta.')); }
        catch { aviso(L('No se ha podido generar la tarjeta.', 'The card could not be generated.', 'Impossibile generare la tessera.')); }
      };
    }

    document.getElementById('ver-todas')?.addEventListener('click', ev => {
      document.getElementById('palmares-resto').classList.remove('oculto');
      ev.target.remove();
    });

    // Guardar copia: un fichero pequeño que el jugador se lleva donde quiera.
    document.getElementById('exportar').onclick = () => {
      const blob = new Blob([exportarPalmares()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'palmares-hazte-con-todos.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      aviso(L('Copia guardada. Llévatela al otro móvil.', 'Backup saved. Take it to your other phone.', 'Copia salvata. Portala sull\'altro telefono.'));
    };

    document.getElementById('olvidar').onclick = () => {
      if (!confirm(L('¿Borrar tu palmarés entero y las insignias del medallero? No se puede deshacer.', 'Delete your entire record and badge case? This can\'t be undone.', 'Cancellare tutto il tuo palmarès e i distintivi? Non si può annullare.'))) return;
      borrarPalmares();
      borrarLogros();
      pantallaInicio();
    };
  }

  if (guardada) {
    document.getElementById('continuar').onclick = () => {
      estado = guardada;
      pestaña = 'carrera';
      app.innerHTML = `<div id="barra"></div><div id="vista"></div>`;
      pintarBarra();
      pintarCarrera(`
        <div class="tarjeta">
          <div class="etiqueta-anio">Año ${estado.año} · ${estado.edad} años</div>
          <h2>De vuelta al circuito</h2>
          <p class="cuerpo">Retomas la carrera donde la dejaste, con ${esc(estado.nombre)} y su equipo.</p>
        </div>`);
      siguientePaso();
    };
    document.getElementById('descartar').onclick = () => { borrarPartida(); pantallaInicio(); };
  }

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
          <div class="barra-meta">${estado.regionEmoji} ${esc(estado.regionNombre)} · ${L('Año', 'Year', 'Anno')} ${estado.año} · ${estado.edad} ${L('años', 'y/o', 'anni')}</div>
          <div class="barra-etapa">${nombreEtapa(etapaDe(estado))}</div>
        </div>
        <div class="barra-dinero">${(estado.dinero / 1000).toFixed(0)}k<small>₽ · 🎖️${estado.medallas} · 🏆${estado.titulos.length}</small></div>
      </div>
      <div class="tabs">
        ${botonTema()}${botonIdioma()}
        <button data-p="carrera" aria-selected="${pestaña === 'carrera'}">${L('Carrera', 'Career', 'Carriera')}</button>
        <button data-p="ficha" aria-selected="${pestaña === 'ficha'}">${L('Ficha del entrenador', 'Trainer profile', 'Scheda allenatore')}</button>
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
const BARRAS = () => [
  ['estrategia', L('Estrategia', 'Strategy', 'Strategia'), '#3b6fe0'], ['vinculo', L('Vínculo', 'Bond', 'Legame'), '#17a673'],
  ['fama', L('Fama', 'Fame', 'Fama'), '#f5a524'], ['salud', L('Salud', 'Health', 'Salute'), '#00b8d4'],
  ['moral', L('Moral', 'Morale', 'Morale'), '#ff7a45'], ['poder', L('Potencia', 'Power', 'Potenza'), '#e94b5c'],
];

function pintarFicha() {
  const s = estado.stats;
  const equipo = estado.equipo.filter(p => !p.retirado).sort((a, b) => b.nivel - a.nivel);
  const media = Math.round(estado.media);
  document.getElementById('vista').innerHTML = `
    <div class="tarjeta">
      <div class="etiqueta-anio">${L('Progresión', 'Progression', 'Progressione')}</div>
      <div class="medidor-techo">
        <div class="pista"><div class="actual" style="width:${media}%"></div></div>
        <div class="pie"><span>${L('Media', 'Rating', 'Media')} ${media}</span><span>100</span></div>
      </div>
      <p style="font-size:12.5px;color:var(--suave);margin-top:8px">${L('Cada temporada creces lo que toque: los años buenos y los malos se acumulan y no hay dos carreras iguales. De joven se dan saltos; pasados los treinta, un buen año es no perder nada.',
        'Every season you grow whatever comes: good years and bad years pile up and no two careers are alike. Young, you leap forward; past thirty, a good year is losing nothing.',
        'Ogni stagione cresci quel che capita: gli anni buoni e quelli cattivi si accumulano e non ci sono due carriere uguali. Da giovane si fanno salti; passati i trent\'anni, un buon anno è non perdere nulla.')}
      </p>
      <div class="barras" style="margin-top:14px">
        ${BARRAS().map(([k, n, c]) => `<div class="barra">
          <div class="et"><span>${n}</span><span>${Math.round(s[k] ?? 0)}</span></div>
          <div class="pista"><div class="relleno" style="width:${s[k] ?? 0}%;background:${c}"></div></div>
        </div>`).join('')}
      </div>
    </div>

    <div class="tarjeta">
      <div class="etiqueta-anio">${L('Equipo', 'Team', 'Squadra')} (${equipo.length})</div>
      <div class="equipo-rejilla">
        ${equipo.map(p => `<div class="carta-poke">
          ${img(p.dex, '', p.shiny)}<div class="n">${esc(p.nombre)}${p.socio ? ' ★' : ''}${p.shiny ? ' ✨' : ''}</div>
          <div class="p">${L('Nivel', 'Level', 'Livello')} ${Math.round(p.nivel)}${p.lesionado ? ' · 🩹' : ''}</div>
          ${badgesTipo(p.tipos)}</div>`).join('') || `<p class="cuerpo">${L('Sin equipo ahora mismo.', 'No team right now.', 'Nessuna squadra al momento.')}</p>`}
      </div>
    </div>

    <div class="tarjeta">
      <div class="etiqueta-anio">${L('Mochila', 'Bag', 'Zaino')} (${estado.objetos.length})</div>
      ${estado.objetos.length ? `
        <div class="objetos-rejilla">
          ${estado.objetos.map(id => { const o = POROBJETO[id]; return `<div class="objeto">
            <img src="${iconoObjeto(o.icono)}" alt="">
            <div class="objeto-txt">
              <span class="n">${esc(o.nombre)}</span>
              <span class="ef">${textoPasivo(o.pasivo) || L('Recuerdo de carrera', 'Career memento', 'Ricordo di carriera')}</span>
            </div></div>`; }).join('')}
        </div>
        <div class="mochila-total">${L('Cada temporada:', 'Each season:', 'Ogni stagione:')} ${textoPasivo(sumaPasivos()) || L('sin efecto', 'no effect', 'nessun effetto')}</div>`
      : `<p class="cuerpo" style="font-size:13.5px;color:var(--suave)">${L('Todavía no llevas nada. Los objetos se ganan en eventos y aplican su efecto <b>cada temporada</b>: más salud, más media, más dinero o crecer más rápido.',
          'You don\'t have anything yet. Items are earned through events and apply their effect <b>every season</b>: more health, more rating, more money, or faster growth.',
          'Non hai ancora nulla. Gli oggetti si ottengono negli eventi e applicano il loro effetto <b>ogni stagione</b>: più salute, più media, più soldi o crescita più veloce.')}</p>`}
    </div>

    <div class="tarjeta">
      <div class="etiqueta-anio">${L('Palmarés y récords', 'Record and stats', 'Palmarès e record')}</div>
      <div class="stats-final">
        <div><div class="v">${estado.titulos.length}</div><div class="k">${L('Títulos', 'Titles', 'Titoli')}</div></div>
        <div><div class="v">${estado.medallas}/8</div><div class="k">${L('Medallas', 'Badges', 'Medaglie')}</div></div>
        <div><div class="v">${estado.mundiales}</div><div class="k">${L('Mundiales', 'World titles', 'Mondiali')}</div></div>
        <div><div class="v">${estado.victorias}</div><div class="k">${L('Victorias', 'Wins', 'Vittorie')}</div></div>
        <div><div class="v">${estado.derrotas}</div><div class="k">${L('Derrotas', 'Losses', 'Sconfitte')}</div></div>
        <div><div class="v">${estado.rival.derrotasTuyas}-${estado.rival.victoriasSuyas}</div><div class="k">vs ${esc(estado.rival.nombre)}</div></div>
      </div>
      ${estado.titulos.length ? `<ul class="lista-limpia" style="margin-top:12px">
        ${estado.titulos.map(t => `<li>🏆 ${esc(t.nombre)} <span class="año">· ${L('año', 'year', 'anno')} ${t.año}</span></li>`).join('')}</ul>` : ''}
      ${estado.hitos.length ? `<div class="etiqueta-anio" style="margin-top:14px">${L('Momentos', 'Highlights', 'Momenti')}</div>
        <ul class="lista-limpia">${estado.hitos.map(h => `<li>${h.emoji} ${esc(h.texto)} <span class="año">· ${L('año', 'year', 'anno')} ${h.año}</span></li>`).join('')}</ul>` : ''}
    </div>`;
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// ── Celebración de títulos ───────────────────────────────────────────────────
// Copa dibujada a mano (SVG) con la cinta del color del torneo, para que
// ganar se note en pantalla en vez de pasar como una línea más del resumen.
const COPAS = {
  liga:     { cinta: '#3b6fe0', metal: '#f5c344', metal2: '#e09a12', pie: '#8b5e2b', et: () => L('CAMPEÓN DE LIGA', 'LEAGUE CHAMPION', 'CAMPIONE DI LEGA') },
  mundial:  { cinta: '#e94b5c', metal: '#ffd970', metal2: '#f2a516', pie: '#5c3c18', et: () => L('CAMPEÓN DEL MUNDO', 'WORLD CHAMPION', 'CAMPIONE DEL MONDO') },
  medallas: { cinta: '#17a673', metal: '#d8dce8', metal2: '#a8b0c6', pie: '#6c7391', et: () => L('LAS OCHO MEDALLAS', 'THE EIGHT BADGES', 'LE OTTO MEDAGLIE') },
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
      <div class="trofeo-et">${c.et()}</div>
      <div class="trofeo-nombre">${esc(t.nombre)}</div>
      <div class="trofeo-anio">${L('Año', 'Year', 'Anno')} ${t.año}</div>
    </div>`;
}

// ── Objetos: traducir sus pasivos a algo legible ─────────────────────────────
const ETIQ_PASIVO = () => ({
  salud: L('Salud', 'Health', 'Salute'), moral: L('Moral', 'Morale', 'Morale'), media: L('Media', 'Rating', 'Media'), estrategia: L('Estrategia', 'Strategy', 'Strategia'),
  vinculo: L('Vínculo', 'Bond', 'Legame'), crecimiento: L('ritmo de mejora', 'growth rate', 'ritmo di crescita'), suerte: L('Suerte', 'Luck', 'Fortuna'),
});

function textoPasivo(pasivo = {}) {
  const etiq = ETIQ_PASIVO();
  return Object.entries(pasivo).map(([k, v]) => {
    if (!v) return null;
    if (k === 'dineroExtra') return `+${v.toLocaleString(numLocale())} ₽/${L('año', 'yr', 'anno')}`;
    if (k === 'crecimiento') return L(`+${Math.round(v * 100)}% ritmo de mejora`, `+${Math.round(v * 100)}% growth rate`, `+${Math.round(v * 100)}% ritmo di crescita`);
    return `${v > 0 ? '+' : ''}${v} ${etiq[k] ?? k}`;
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
      estadoTxt.textContent = ok ? L('¡Sale bien!', 'It goes well!', 'Va bene!') : L('Sale mal…', 'It goes badly…', 'Va male…');
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
  // Punto estable: si cierras aquí, al volver retomas por esta misma decisión
  guardarPartida(estado);

  estado.flags.etapaActual = etapaDe(estado);
  const ev = siguienteEvento(estado);
  if (!ev) return correrTemporadas();

  const titulo = typeof ev.titulo === 'function' ? ev.titulo(estado) : ev.titulo;
  const texto = typeof ev.texto === 'function' ? ev.texto(estado) : ev.texto;
  const ops = ev.opciones.filter(o => !o.cond || o.cond(estado));

  const html = `
    <div class="tarjeta">
      <div class="etiqueta-anio">${L('Año', 'Year', 'Anno')} ${estado.año} · ${estado.edad} ${L('años', 'y/o', 'anni')} · ${nombreEtapa(estado.flags.etapaActual)}</div>
      <h2>${esc(titulo)}</h2>
      <p class="cuerpo">${esc(texto)}</p>
      <div class="opciones ${ops.length === 2 ? 'dos' : ''}">
        ${ops.map((o, i) => `<button class="opcion-evento" data-i="${i}">
          ${o.icono ? `<img class="ico" src="${iconoObjeto(o.icono)}" alt="">` : '<span class="ico-txt">▸</span>'}
          <span class="nom">${esc(o.txt)}</span>
          ${o.sub ? `<span class="des">${esc(o.sub)}</span>` : ''}
          ${o.riesgo != null ? barraProb(o.riesgo) : `<span class="prob segura">${L('Sin riesgo', 'No risk', 'Nessun rischio')}</span>`}
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
          <div class="ruleta-estado">${L('Girando…', 'Spinning…', 'In corso…')}</div>
        </div>`;
      await girarRuleta(document.querySelector('.ruleta'), op.riesgo, ok);
    }

    const res = String(op.efecto(estado, ok));
    const [cuerpo, efectos] = res.split('\n\n▸ ');

    pintarCarrera(`
      <div class="tarjeta consecuencia ${ok ? 'bien' : ''}">
        <div class="etiqueta-anio">${L('Año', 'Year', 'Anno')} ${estado.año} · ${esc(titulo)}</div>
        <div class="elegida">▸ ${esc(op.txt)}</div>
        ${op.riesgo != null
          ? `<div class="veredicto ${ok ? 'bien' : 'mal'}" style="margin-top:8px">${ok ? L('Salió bien', 'Went well', 'Andato bene') : L('Salió mal', 'Went badly', 'Andato male')} · ${L('era', 'was', 'era')} ${Math.round(op.riesgo * 100)}%</div>`
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
        <div class="etiqueta-anio">${L('Temporada', 'Season', 'Stagione')} ${linea.año} · ${linea.edad} ${L('años', 'y/o', 'anni')}</div>
        <ul>${linea.sucesos.map(s => `<li class="${s.includes('🏆') ? 'grande' : ''}">${esc(s)}</li>`).join('')}</ul>
      </div>`;
    const causa = debeRetirarse(estado);
    if (causa || estado.flags.retiroElegido) {
      retirar(estado, causa || 'eleccion');
      // Antes saltaba directo al resumen y te quedabas sin ver la última
      // temporada, que es justo donde se decidió cómo acaba todo.
      html += `<button class="boton-grande" id="cerrar">${L('Ver cómo acabó todo ▸', 'See how it all ended ▸', 'Guarda come è finita ▸')}</button>`;
      pintarCarrera(html, {
        añadir: true,
        enlazar: v => { v.querySelector('#cerrar').onclick = pantallaFinal; },
      });
      pintarBarra();
      return;
    }
  }
  html += `<button class="boton-grande" id="seguir">${L('Sigue tu aventura ▸', 'Continue your adventure ▸', 'Continua la tua avventura ▸')}</button>`;
  pintarCarrera(html, {
    añadir: true,
    enlazar: v => { v.querySelector('#seguir').onclick = siguientePaso; },
  });
  pintarBarra();
}

// ── Pantalla final ───────────────────────────────────────────────────────────
const TEXTO_RETIRO = () => ({
  edad: L('El cuerpo dijo basta. Treinta y tantos años y una vida entera de viajes en la mochila.',
    'The body said enough. Thirty-something years old and a whole life of travel in a backpack.',
    'Il corpo ha detto basta. Trent\'anni e passa e una vita intera di viaggi nello zaino.'),
  salud: L('Las lesiones acumuladas te obligan a dejarlo antes de tiempo. Nadie te lo discute.',
    'Accumulated injuries force you to stop early. Nobody argues with that.',
    'Gli infortuni accumulati ti costringono a smettere in anticipo. Nessuno lo discute.'),
  moral: L('Un día te levantas y sabes que ya no quieres esto. Lo anuncias sin dramatismo.',
    'One day you wake up and know you don\'t want this anymore. You announce it without drama.',
    'Un giorno ti svegli e sai che non vuoi più questo. Lo annunci senza drammi.'),
  olvido: L('Los patrocinadores dejaron de llamar y los torneos de invitarte. Te retiras casi sin ruido.',
    'The sponsors stopped calling and the tournaments stopped inviting you. You retire almost silently.',
    'Gli sponsor hanno smesso di chiamare e i tornei di invitarti. Ti ritiri quasi senza rumore.'),
  eleccion: L('Te retiraste cuando quisiste, como quisiste. Muy pocos pueden decir eso.',
    'You retired when you wanted, how you wanted. Very few can say that.',
    'Ti sei ritirato quando hai voluto, come hai voluto. Pochissimi possono dirlo.'),
});

function pantallaFinal() {
  borrarPartida();
  const pts = legado(estado);
  const rango = rangoDe(pts, estado.media);
  const premios = logrosDe(estado);
  const equipo = estado.equipo.filter(p => !p.retirado).sort((a, b) => b.nivel - a.nivel).slice(0, 6);
  const apodo = apodoDe(estado);
  // Al palmarés va un resumen, no la partida entera. Solo la primera vez que
  // se pinta esta pantalla, que si no se duplicaría al volver atrás.
  if (!estado.apuntada) {
    estado.apuntada = true;
    apuntarEnPalmares({
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      fecha: Date.now(),
      nombre: estado.nombre, apodo, region: estado.regionNombre, emoji: estado.regionEmoji,
      años: estado.año, edad: estado.edad, media: Math.round(estado.media), pts,
      rango: rango.titulo, rangoEmoji: rango.emoji,
      titulos: estado.titulos.length, medallas: estado.medallas, mundiales: estado.mundiales,
      victorias: estado.victorias, derrotas: estado.derrotas, dinero: estado.dinero,
      equipo: equipo.map(p => ({ dex: p.dex, nombre: p.nombre, nivel: Math.round(p.nivel), shiny: !!p.shiny })),
      premios: premios.map(p => ({ emoji: p.emoji, nombre: p.nombre, desc: p.desc })),
      ash: !!estado.flags.esAsh,
    });
    // Las insignias de esta carrera se suman al medallero permanente.
    desbloquearLogros(premios.map(p => p.id));
  }

  app.innerHTML = `<div id="vista"></div>`;
  document.getElementById('vista').innerHTML = `
    <div class="tarjeta final">
      <div class="etiqueta-anio">${L('Fin de la carrera', 'End of career', 'Fine carriera')} · ${estado.edad} ${L('años', 'y/o', 'anni')} · ${estado.año} ${L('temporadas', 'seasons', 'stagioni')}</div>
      <div class="emoji-rango">${rango.emoji}</div>
      <h2>${esc(rango.titulo)}</h2>
      <p class="desc-rango">${esc(rango.desc)}</p>
      <p class="cuerpo" style="margin-top:10px;font-size:14px">
        ${esc(estado.nombre)} "${esc(apodo)}", ${L('de', 'from', 'di')} ${esc(estado.regionNombre)} · ${L('media final', 'final rating', 'media finale')} ${Math.round(estado.media)}<br>
        ${esc(TEXTO_RETIRO()[estado.causaRetiro] ?? '')}</p>
      <p class="puntos">${L('Puntuación de legado', 'Legacy score', 'Punteggio di leggenda')}<b>${pts}</b></p>
      <div class="stats-final">
        <div><div class="v">${estado.titulos.length}</div><div class="k">${L('Títulos', 'Titles', 'Titoli')}</div></div>
        <div><div class="v">${estado.medallas}</div><div class="k">${L('Medallas', 'Badges', 'Medaglie')}</div></div>
        <div><div class="v">${estado.mundiales}</div><div class="k">${L('Mundiales', 'World titles', 'Mondiali')}</div></div>
        <div><div class="v">${estado.victorias}</div><div class="k">${L('Victorias', 'Wins', 'Vittorie')}</div></div>
        <div><div class="v">${estado.derrotas}</div><div class="k">${L('Derrotas', 'Losses', 'Sconfitte')}</div></div>
        <div><div class="v">${Math.round(estado.dinero / 1000)}k</div><div class="k">${L('Fortuna ₽', 'Fortune ₽', 'Fortuna ₽')}</div></div>
      </div>
    </div>

    <div class="tarjeta">
      <div class="etiqueta-anio">${L('Equipo final', 'Final team', 'Squadra finale')}</div>
      <div class="equipo-rejilla">
        ${equipo.map(p => `<div class="carta-poke">${img(p.dex, '', p.shiny)}
          <div class="n">${esc(p.nombre)}${p.socio ? ' ★' : ''}</div>
          <div class="p">${L('Nivel', 'Level', 'Livello')} ${Math.round(p.nivel)}</div>${badgesTipo(p.tipos)}</div>`).join('')
          || `<p class="cuerpo">${L('Te retiraste sin equipo.', 'You retired without a team.', 'Ti sei ritirato senza squadra.')}</p>`}
      </div>
    </div>

    <div class="tarjeta">
      <div class="etiqueta-anio">${L('Premios de esta carrera', 'Awards from this career', 'Premi di questa carriera')} (${premios.length})</div>
      <div class="premios">
        ${premios.map(p => `<div class="premio">
          <div class="e">${p.emoji}</div><div class="n">${esc(p.nombre)}</div><div class="d">${esc(p.desc)}</div>
        </div>`).join('') || `<p class="cuerpo">${L('Ningún premio. Empieza otra y a por ellos.', 'No awards. Start another and go get them.', 'Nessun premio. Iniziane un\'altra e vai a prenderteli.')}</p>`}
      </div>
    </div>

    ${estado.hitos.length ? `<div class="tarjeta">
      <div class="etiqueta-anio">${L('Momentos de una vida', 'Moments of a lifetime', 'Momenti di una vita')}</div>
      <ul class="lista-limpia">${estado.hitos.map(h => `<li>${h.emoji} ${esc(h.texto)} <span class="año">· ${L('año', 'year', 'anno')} ${h.año}</span></li>`).join('')}</ul>
    </div>` : ''}

    <button class="boton-grande" id="guardar">📸 ${L('Guardar la tarjeta como imagen', 'Save the card as an image', 'Salva la tessera come immagine')}</button>
    <button class="boton-secundario" id="copiar">${L('Copiar resumen en texto', 'Copy summary as text', 'Copia riepilogo come testo')}</button>
    <button class="boton-secundario" id="otra">${L('Jugar otra vez', 'Play again', 'Gioca di nuovo')}</button>

    <a class="firma firma-final" href="https://x.com/soypalo_" target="_blank" rel="noopener noreferrer">
      <span class="firma-x">X</span>
      <span>${L('Si te ha molado, sígueme en X:', 'If you liked it, follow me on X:', 'Se ti è piaciuto, seguimi su X:')} <b>@SoyPalo_</b></span>
    </a>
    <a class="cafe" href="https://ko-fi.com/soypalo" target="_blank" rel="noopener noreferrer">
      ☕ ${L('Invítame a un café', 'Buy me a coffee', 'Offrimi un caffè')}
    </a>`;

  window.scrollTo({ top: 0, behavior: 'instant' });
  document.getElementById('otra').onclick = () => pantallaInicio();
  document.getElementById('guardar').onclick = async () => {
    const b = document.getElementById('guardar');
    b.textContent = L('Generando imagen…', 'Generating image…', 'Generazione immagine…');
    try { await descargarTarjeta(estado, { pts, rango, premios, equipo, apodo }); aviso(L('¡Imagen guardada!', 'Image saved!', 'Immagine salvata!')); }
    catch { aviso(L('No se pudo generar la imagen', 'Could not generate the image', 'Impossibile generare l\'immagine')); }
    b.textContent = `📸 ${L('Guardar la tarjeta como imagen', 'Save the card as an image', 'Salva la tessera come immagine')}`;
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
    L(`${estado.regionEmoji} ${estado.regionNombre} · ${estado.año} temporadas · retirado a los ${estado.edad} · media ${Math.round(estado.media)}`,
      `${estado.regionEmoji} ${estado.regionNombre} · ${estado.año} seasons · retired at ${estado.edad} · rating ${Math.round(estado.media)}`,
      `${estado.regionEmoji} ${estado.regionNombre} · ${estado.año} stagioni · ritirato a ${estado.edad} anni · media ${Math.round(estado.media)}`),
    ``,
    L(`🏆 ${estado.titulos.length} títulos · 🎖️ ${estado.medallas}/8 medallas · 🌍 ${estado.mundiales} mundiales`,
      `🏆 ${estado.titulos.length} titles · 🎖️ ${estado.medallas}/8 badges · 🌍 ${estado.mundiales} world titles`,
      `🏆 ${estado.titulos.length} titoli · 🎖️ ${estado.medallas}/8 medaglie · 🌍 ${estado.mundiales} mondiali`),
    L(`⚔️ ${estado.victorias}V-${estado.derrotas}D · ✨ Fama ${Math.round(estado.stats.fama)} · 💰 ${estado.dinero.toLocaleString(numLocale())} ₽`,
      `⚔️ ${estado.victorias}W-${estado.derrotas}L · ✨ Fame ${Math.round(estado.stats.fama)} · 💰 ${estado.dinero.toLocaleString(numLocale())} ₽`,
      `⚔️ ${estado.victorias}V-${estado.derrotas}S · ✨ Fama ${Math.round(estado.stats.fama)} · 💰 ${estado.dinero.toLocaleString(numLocale())} ₽`),
    `👥 ${equipo.map(p => p.nombre).join(', ')}`,
    `🏅 ${premios.map(p => p.nombre).join(' · ')}`,
    ``,
    L(`Legado: ${pts} puntos · Hazte con Todos`, `Legacy: ${pts} points · Hazte con Todos`, `Leggenda: ${pts} punti · Hazte con Todos`),
    L(`Juego de @SoyPalo_`, `Game by @SoyPalo_`, `Gioco di @SoyPalo_`),
  ].join('\n');
  const ok = () => aviso(L('¡Resumen copiado!', 'Summary copied!', 'Riepilogo copiato!'));
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
