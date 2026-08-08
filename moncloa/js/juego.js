// Interfaz y bucle de juego.
import {
  PARTIDOS, PERFILES, RITMOS, COMUNIDADES, NOMBRE_EJE, EJES,
} from './datos.js?v=1';
import {
  nuevaPartida, simularTemporada, etapaDe, nombreEtapa, debeRetirarse, retirar,
  legado, rangoDe, logrosDe, apodoDe, dado, partidoDe, afinidad, apoyoDe,
  escanosDe, guardarPartida, cargarPartida, borrarPartida, ETIQ,
} from './motor.js?v=1';
import { siguienteEvento } from './eventos.js?v=1';
import { descargarTarjeta } from './tarjeta.js?v=1';

const app = document.getElementById('app');
let estado = null;
let pestaña = 'carrera';

const esc = s => String(s ?? '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
const eur = n => `${Math.round(n / 1000)}k €`;
const colorMedia = v => (v >= 88 ? '#7a5cf0' : v >= 78 ? '#17a673' : v >= 62 ? '#2f7fe0' : v >= 46 ? '#f0a020' : '#8b93b0');

// El fondo de toda la web es el color del partido en el que estás ahora mismo.
// Si te vas a otro, cambia con él: es la señal más visible del transfuguismo.
function pintarColorPartido(p) {
  const r = document.documentElement.style;
  r.setProperty('--partido', p.color);
  r.setProperty('--partido-osc', p.color2);
  r.setProperty('--partido-claro', p.claro);
  const meta = document.querySelector('meta[name=theme-color]');
  if (meta) meta.setAttribute('content', p.color2);
}

// ── Pantalla de creación ─────────────────────────────────────────────────────
const seleccion = { partido: PARTIDOS[2], perfil: PERFILES[0], comunidad: 'Madrid', ritmo: RITMOS[1] };

function pantallaInicio() {
  pintarColorPartido(seleccion.partido);
  const guardada = cargarPartida();
  app.innerHTML = `
    <div class="portada">
      <div class="marquesina">🚉 próxima salida · andén 3 · con retraso</div>
      <h1>A la Moncloa<br>en Cercanías</h1>
      <p class="sub">Simulador satírico de carrera política española.<br>Cuarenta años de escaños, plenos y platós en dos minutos.</p>
      <p class="premisa">
        Empiezas pegando carteles en una agrupación de barrio y acabas —o no— en una
        investidura. Por el camino: leyes que tienen coste y rédito según a quién
        representes, ofertas de otro partido con dinero encima de la mesa, y un país
        que te juzga por un corte de doce segundos.
      </p>
    </div>

    ${guardada ? `
      <div class="tarjeta continuar">
        <div class="etiqueta-anio">Tienes una carrera a medias</div>
        <div class="continuar-datos">
          <span class="ovr" style="background:${colorMedia(Math.round(guardada.media))}">
            <span class="n">${Math.round(guardada.media)}</span><span class="k">Peso</span>
          </span>
          <div>
            <div class="continuar-nombre">${esc(guardada.nombre)}</div>
            <div class="continuar-meta">${guardada.partidoEmoji} ${esc(guardada.partidoNombre)} · Año ${guardada.año} · ${guardada.edad} años</div>
          </div>
        </div>
        <button class="boton-grande" id="continuar">Continuar esa carrera ▸</button>
        <button class="boton-secundario" id="descartar">Empezar una nueva y descartarla</button>
      </div>` : ''}

    <div class="bloque">
      <label for="nombre">Tu nombre</label>
      <input id="nombre" type="text" maxlength="20" placeholder="Escribe tu nombre" autocomplete="off">
    </div>

    <div class="bloque">
      <span class="titulo-campo">Partido con el que empiezas</span>
      <div class="rejilla cinco" id="partidos">
        ${PARTIDOS.map((p, i) => `<button class="opcion op-partido" data-i="${i}" aria-pressed="${p.id === seleccion.partido.id}" style="--c:${p.color}">
          <span class="pastilla" style="background:${p.color}"></span>
          <span class="nom">${p.corto}</span></button>`).join('')}
      </div>
      <div class="ficha-partido">
        <p class="lema">“${esc(seleccion.partido.lema)}”</p>
        <p>${esc(seleccion.partido.sabor)}</p>
        <p class="electorado"><b>Tu electorado:</b> ${esc(seleccion.partido.electorado)}</p>
        ${brujula(seleccion.partido.eje)}
        <p class="apoyo-ini">Intención de voto de partida: <b>${seleccion.partido.apoyo}%</b> · unos ${escanosDe(seleccion.partido.apoyo)} escaños</p>
      </div>
    </div>

    <div class="bloque">
      <span class="titulo-campo">Perfil de político</span>
      <div class="rejilla dos" id="perfiles">
        ${PERFILES.map((s, i) => `<button class="opcion" data-i="${i}" aria-pressed="${s.id === seleccion.perfil.id}">
          <span class="nom">${s.emoji} ${s.nombre}</span><span class="des">${s.desc}</span></button>`).join('')}
      </div>
    </div>

    <div class="bloque">
      <label for="comunidad">Comunidad de origen</label>
      <select id="comunidad">
        ${COMUNIDADES.map(c => `<option ${c === seleccion.comunidad ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
    </div>

    <div class="bloque">
      <span class="titulo-campo">Ritmo de la partida</span>
      <div class="rejilla tres" id="ritmos">
        ${RITMOS.map((r, i) => `<button class="opcion" data-i="${i}" aria-pressed="${r.id === seleccion.ritmo.id}">
          <span class="nom">${r.nombre}</span><span class="des">${r.desc}</span></button>`).join('')}
      </div>
    </div>

    <button class="boton-grande" id="empezar" disabled>Afiliarse y empezar</button>
    <p class="pie">Cada partida es distinta. Nadie llega dos veces igual al final.</p>
    <p class="aviso-legal">
      <b>Esto es sátira.</b> Juego de ficción sin ánimo de lucro y <b>sin relación ni afiliación</b>
      con ningún partido político, medio de comunicación, empresa ni institución.
      Los partidos y las figuras públicas aparecen por su papel político o mediático, y
      <b>todas las situaciones están inventadas</b>: nadie ha dicho ni hecho nada de lo
      que aquí se cuenta, y no se atribuye a ninguna persona ningún hecho delictivo.
      Los cargos internos, rivales y compañeros de partido del juego son personajes
      ficticios. Tipografías de Google Fonts (licencia OFL), autoalojadas.
    </p>`;

  const marcar = (cont, btn) => {
    cont.querySelectorAll('.opcion').forEach(b => b.setAttribute('aria-pressed', 'false'));
    btn.setAttribute('aria-pressed', 'true');
  };
  const revisar = () => {
    document.getElementById('empezar').disabled = !document.getElementById('nombre').value.trim();
  };

  document.getElementById('partidos').onclick = ev => {
    const b = ev.target.closest('.opcion'); if (!b) return;
    const nombre = document.getElementById('nombre').value;
    seleccion.partido = PARTIDOS[+b.dataset.i];
    seleccion.comunidad = document.getElementById('comunidad').value;
    pantallaInicio();
    document.getElementById('nombre').value = nombre;
    revisar();
  };
  const perfs = document.getElementById('perfiles');
  perfs.onclick = ev => { const b = ev.target.closest('.opcion'); if (!b) return; seleccion.perfil = PERFILES[+b.dataset.i]; marcar(perfs, b); };
  const rits = document.getElementById('ritmos');
  rits.onclick = ev => { const b = ev.target.closest('.opcion'); if (!b) return; seleccion.ritmo = RITMOS[+b.dataset.i]; marcar(rits, b); };
  document.getElementById('nombre').oninput = revisar;
  document.getElementById('comunidad').onchange = ev => { seleccion.comunidad = ev.target.value; };

  if (guardada) {
    document.getElementById('continuar').onclick = () => {
      estado = guardada;
      pintarColorPartido(partidoDe(estado));
      pestaña = 'carrera';
      app.innerHTML = `<div id="barra"></div><div id="vista"></div>`;
      pintarBarra();
      pintarCarrera(`
        <div class="tarjeta">
          <div class="etiqueta-anio">Año ${estado.año} · ${estado.edad} años</div>
          <h2>Se reanuda el servicio</h2>
          <p class="cuerpo">Retomas la carrera donde la dejaste, con ${esc(estado.nombre)} y el carné de ${esc(estado.partidoNombre)} en el bolsillo.</p>
        </div>`);
      siguientePaso();
    };
    document.getElementById('descartar').onclick = () => { borrarPartida(); pantallaInicio(); };
  }

  document.getElementById('empezar').onclick = () => {
    estado = nuevaPartida({
      nombre: document.getElementById('nombre').value.trim().slice(0, 20),
      partido: seleccion.partido, perfil: seleccion.perfil,
      comunidad: document.getElementById('comunidad').value, ritmo: seleccion.ritmo,
    });
    pestaña = 'carrera';
    pantallaJuego();
  };
  revisar();
}

// ── Brújula ideológica ───────────────────────────────────────────────────────
// Tres barras con el centro en el medio: es lo que hace legible que una ley
// esté a favor o en contra de lo tuyo sin tener que explicarlo con un párrafo.
function brujula(eje, cls = '') {
  return `<div class="brujula ${cls}">
    ${EJES.map(k => {
    const v = eje[k] ?? 0;
    const pos = 50 + v / 2;
    const [izq, der] = NOMBRE_EJE[k];
    return `<div class="eje">
        <div class="eje-et"><span>${izq}</span><span>${der}</span></div>
        <div class="eje-pista"><i style="left:${pos}%"></i></div>
      </div>`;
  }).join('')}
  </div>`;
}

// ── Estructura de juego: barra fija + pestañas ───────────────────────────────
function pantallaJuego() {
  pintarColorPartido(partidoDe(estado));
  app.innerHTML = `<div id="barra"></div><div id="vista"></div>`;
  pintarBarra();
  pintarCarrera(`
    <div class="tarjeta">
      <div class="etiqueta-anio">Año 1 · ${estado.edad} años · ${esc(estado.comunidad)}</div>
      <h2>${estado.partidoEmoji} ${esc(estado.nombre)} se afilia</h2>
      <p class="cuerpo">Sede de ${esc(estado.partidoNombre)} en ${esc(estado.comunidad)}, un local con fluorescentes
      y una mesa camilla. Firmas la ficha de afiliación, te dan un carné plastificado y nadie
      te dice qué va a pasar a partir de aquí. ${esc(seleccion.perfil.desc)}</p>
    </div>`);
  siguientePaso();
}

function pintarBarra() {
  const media = Math.round(estado.media);
  const ap = apoyoDe(estado);
  document.getElementById('barra').innerHTML = `
    <div class="barra">
      <div class="barra-fila">
        <div class="ovr" style="background:${colorMedia(media)}">
          <span class="n">${media}</span><span class="k">Peso</span>
        </div>
        <div class="barra-datos">
          <div class="barra-nombre">${esc(estado.nombre)}</div>
          <div class="barra-meta">${estado.partidoEmoji} ${esc(estado.partidoNombre)} · Año ${estado.año} · ${estado.edad} años</div>
          <div class="barra-etapa">${esc(estado.cargo ?? nombreEtapa(etapaDe(estado)))}</div>
        </div>
        <div class="barra-dinero">${eur(estado.dinero)}<small>${ap.toFixed(1)}% · 🪑${estado.escanos}</small></div>
      </div>
      <div class="tabs">
        <button data-p="carrera" aria-selected="${pestaña === 'carrera'}">Carrera</button>
        <button data-p="ficha" aria-selected="${pestaña === 'ficha'}">Ficha política</button>
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

// ── Ficha política ───────────────────────────────────────────────────────────
const BARRAS = [
  ['carisma', '#e0603b'], ['gestion', '#2f7fe0'], ['aparato', '#6b5bd6'],
  ['credibilidad', '#17a673'], ['mediatico', '#f0a020'], ['aguante', '#00a6c0'], ['moral', '#e05a8a'],
];

function pintarFicha() {
  const s = estado.stats;
  const p = partidoDe(estado);
  const media = Math.round(estado.media);
  const leyes = estado.leyes.slice().reverse();
  document.getElementById('vista').innerHTML = `
    <div class="tarjeta">
      <div class="etiqueta-anio">Peso político</div>
      <div class="medidor-techo">
        <div class="pista"><div class="actual" style="width:${media}%"></div></div>
        <div class="pie"><span>${media} · ${nombreEtapa(etapaDe(estado))}</span><span>100</span></div>
      </div>
      <p class="nota">
        Cada año creces lo que toque: los buenos y los malos se acumulan y no hay dos
        carreras iguales. A los treinta se dan saltos; pasados los sesenta, un buen año
        es no perder nada. A partir de <b>81</b> eres líder nacional, y ahí te empiezan
        a llamar de los platós grandes.
      </p>
      <div class="barras">
        ${BARRAS.map(([k, c]) => `<div class="medidor">
          <div class="et"><span>${ETIQ[k]}</span><span>${Math.round(s[k] ?? 0)}</span></div>
          <div class="pista"><div class="relleno" style="width:${s[k] ?? 0}%;background:${c}"></div></div>
        </div>`).join('')}
      </div>
    </div>

    <div class="tarjeta">
      <div class="etiqueta-anio">${esc(estado.partidoNombre)} · dónde estás en el mapa</div>
      ${brujula(p.eje)}
      <p class="electorado"><b>Tu electorado:</b> ${esc(p.electorado)}</p>
      ${estado.transfuguismos ? `<p class="nota">Has cambiado de partido <b>${estado.transfuguismos}</b> ${estado.transfuguismos > 1 ? 'veces' : 'vez'}${estado.cobradoPorFichar ? ` y has cobrado <b>${estado.cobradoPorFichar.toLocaleString('es')} €</b> por hacerlo` : ''}.</p>` : ''}
    </div>

    <div class="tarjeta">
      <div class="etiqueta-anio">Encuestas</div>
      <div class="encuestas">
        ${PARTIDOS.concat(estado.partidoPropio ? [estado.partidoPropio] : []).map(x => {
    const v = estado.panorama[x.id] ?? 0;
    const mio = x.id === estado.partido;
    return `<div class="fila-enc ${mio ? 'mio' : ''}">
            <span class="nom">${x.corto ?? x.nombre}</span>
            <span class="pista"><i style="width:${Math.min(100, v * 2.4)}%;background:${x.color}"></i></span>
            <span class="val">${v.toFixed(1)}% · ${escanosDe(v)}</span>
          </div>`;
  }).join('')}
      </div>
    </div>

    <div class="tarjeta">
      <div class="etiqueta-anio">Votaciones (${estado.leyes.length})</div>
      ${leyes.length ? `<ul class="lista-leyes">
        ${leyes.map(l => `<li class="${l.coherencia > 0.25 ? 'coh' : l.coherencia < -0.25 ? 'inc' : ''}">
          <span class="v">${l.sentido === 'favor' ? 'SÍ' : l.sentido === 'contra' ? 'NO' : 'ABS'}</span>
          <span class="t">${esc(l.nombre)}</span>
          <span class="r">${l.aprobada ? 'aprobada' : 'decayó'} · año ${l.año}</span>
        </li>`).join('')}
      </ul>` : '<p class="cuerpo nota">Todavía no has votado nada. Los plenos empiezan cuando llegas al Congreso (peso 60).</p>'}
    </div>

    <div class="tarjeta">
      <div class="etiqueta-anio">Palmarés</div>
      <div class="stats-final">
        <div><div class="v">${estado.presidencias}</div><div class="k">Investiduras</div></div>
        <div><div class="v">${estado.ministerios.length}</div><div class="k">Ministerios</div></div>
        <div><div class="v">${estado.escanos}</div><div class="k">Escaños</div></div>
        <div><div class="v">${estado.legislaturas}</div><div class="k">Legislaturas</div></div>
        <div><div class="v">${estado.transfuguismos}</div><div class="k">Cambios</div></div>
        <div><div class="v">${estado.rival.derrotasTuyas}-${estado.rival.victoriasSuyas}</div><div class="k">vs ${esc(estado.rival.nombre.split(' ')[0])}</div></div>
      </div>
      ${estado.hitos.length ? `<div class="etiqueta-anio" style="margin-top:14px">Momentos</div>
        <ul class="lista-limpia">${estado.hitos.map(h => `<li>${h.emoji} ${esc(h.texto)} <span class="año">· año ${h.año}</span></li>`).join('')}</ul>` : ''}
    </div>`;
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// ── Celebración: trofeos electorales ─────────────────────────────────────────
const TROFEOS = {
  moncloa: { et: 'INVESTIDURA GANADA', icono: '🏛️', cinta: '#c9a227' },
  absoluta: { et: 'MAYORÍA ABSOLUTA', icono: '🟦', cinta: '#c9a227' },
  ministerio: { et: 'CONSEJO DE MINISTROS', icono: '🎖️', cinta: '#2f7fe0' },
};

function tarjetaTrofeo(t) {
  const c = TROFEOS[t.tipo] ?? TROFEOS.ministerio;
  const confeti = Array.from({ length: 14 }, (_, i) => {
    const col = [c.cinta, '#fff', 'var(--partido-claro)', '#17a673', '#e0603b'][i % 5];
    return `<i style="left:${6 + i * 6.6}%;background:${col};animation-delay:${(i % 7) * 0.12}s"></i>`;
  }).join('');
  return `
    <div class="tarjeta trofeo" style="--cinta:${c.cinta}">
      <div class="confeti">${confeti}</div>
      <div class="trofeo-icono">${c.icono}</div>
      <div class="trofeo-et">${c.et}</div>
      <div class="trofeo-nombre">${esc(t.nombre)}</div>
      <div class="trofeo-anio">Año ${t.año}${t.detalle ? ` · ${esc(t.detalle)}` : ''}</div>
    </div>`;
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

const azarUI = (a, b) => a + Math.random() * (b - a);

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

// ── Bucle: una decisión + sus años ───────────────────────────────────────────
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
  const ops = (typeof ev.opciones === 'function' ? ev.opciones(estado) : ev.opciones)
    .filter(o => !o.cond || o.cond(estado));

  // Si la decisión es un pleno, se enseña la brújula de la ley al lado de la
  // de tu partido: así se ve de un vistazo si votar sí es coherente o no.
  const p = partidoDe(estado);
  const extra = ev.esLey ? bloqueLey(ev.ley, p) : '';

  const html = `
    <div class="tarjeta">
      <div class="etiqueta-anio">Año ${estado.año} · ${estado.edad} años · ${esc(nombreEtapa(estado.flags.etapaActual))}</div>
      <h2>${esc(titulo)}</h2>
      <p class="cuerpo">${esc(texto)}</p>
      ${extra}
      <div class="opciones ${ops.length === 2 ? 'dos' : ''}">
        ${ops.map((o, i) => `<button class="opcion-evento" data-i="${i}">
          <span class="nom">${esc(o.txt)}</span>
          ${o.sub ? `<span class="des">${esc(o.sub)}</span>` : ''}
          ${o.riesgo != null ? barraProb(o.riesgo) : '<span class="prob segura">Sin riesgo</span>'}
        </button>`).join('')}
      </div>
    </div>`;

  const enlazar = v => {
    v.querySelector('.opciones').onclick = async e => {
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
      // El partido puede haber cambiado dentro del efecto: el fondo va detrás
      pintarColorPartido(partidoDe(estado));

      pintarCarrera(`
        <div class="tarjeta consecuencia ${ok ? 'bien' : ''}">
          <div class="etiqueta-anio">Año ${estado.año} · ${esc(titulo)}</div>
          <div class="elegida">▸ ${esc(op.txt)}</div>
          ${op.riesgo != null
          ? `<div class="veredicto ${ok ? 'bien' : 'mal'}">${ok ? 'Salió bien' : 'Salió mal'} · era ${Math.round(op.riesgo * 100)}%</div>`
          : ''}
          <p class="cuerpo">${esc(cuerpo)}</p>
          ${efectos ? `<div class="efectos">${esc(efectos)}</div>` : ''}
        </div>`);
      pintarBarra();
      correrTemporadas();
    };
  };

  pintarCarrera(html, { enlazar });
}

// Bloque de contexto para las leyes: hacia dónde empuja, cómo de popular es y
// cuánto se parece a lo que defiende tu partido.
function bloqueLey(ley, partido) {
  const af = afinidad(partido.eje, ley.eje);
  const et = af > 0.5 ? 'Muy afín a tu programa' : af > 0.15 ? 'Compatible con lo tuyo'
    : af > -0.15 ? 'Ni tuya ni suya' : af > -0.5 ? 'Choca con tu programa' : 'Es lo contrario de lo tuyo';
  const cls = af > 0.15 ? 'afin' : af < -0.15 ? 'contra' : 'neutro';
  const pop = ley.popular > 0.4 ? 'La gente la quiere' : ley.popular > 0.1 ? 'Gusta a medias'
    : ley.popular > -0.1 ? 'A la gente le da igual' : 'La gente no la pide';
  return `
    <div class="bloque-ley">
      <div class="ley-cab"><span class="emoji">${ley.emoji}</span>
        <span class="afin-tag ${cls}">${et}</span>
        <span class="pop-tag">${pop}</span></div>
      <div class="ley-brujulas">
        <div><span class="mini">Empuja la ley</span>${brujula(ley.eje, 'ley')}</div>
        <div><span class="mini">Está ${esc(partido.corto ?? partido.nombre)}</span>${brujula(partido.eje, 'mia')}</div>
      </div>
    </div>`;
}

function correrTemporadas() {
  let html = '';
  for (let i = 0; i < estado.cada; i++) {
    const linea = simularTemporada(estado);
    if (linea.trofeo) html += tarjetaTrofeo(linea.trofeo);
    html += `
      <div class="tarjeta temporada">
        <div class="etiqueta-anio">Año ${linea.año} · ${linea.edad} años</div>
        <ul>${linea.sucesos.map(s => `<li class="${/🏛️|🎖️|🪑|⚖️/.test(s) ? 'grande' : ''}">${esc(s)}</li>`).join('')}</ul>
      </div>`;
    const causa = debeRetirarse(estado);
    if (causa || estado.flags.retiroElegido) {
      retirar(estado, causa || estado.flags.causaElegida || 'eleccion');
      pintarCarrera(html, { añadir: true }); pintarBarra();
      return pantallaFinal();
    }
  }
  html += `<button class="boton-grande" id="seguir">Seguir en política ▸</button>`;
  pintarCarrera(html, {
    añadir: true,
    enlazar: v => { v.querySelector('#seguir').onclick = siguientePaso; },
  });
  pintarBarra();
}

// ── Pantalla final ───────────────────────────────────────────────────────────
const TEXTO_RETIRO = {
  edad: 'Setenta y tantos años y una vida entera de trenes, cenas frías y plenos de madrugada. El cuerpo dijo basta.',
  salud: 'El cuerpo te pasó la factura antes de tiempo. Nadie te lo discutió.',
  moral: 'Un día te levantaste y ya no querías esto. Lo anunciaste sin dramatismo y sin rueda de prensa.',
  listas: 'No te pusieron en las listas. No hubo comunicado ni despedida: simplemente no aparecías en el papel.',
  eleccion: 'Lo dejaste cuando quisiste, como quisiste y con el discurso escrito por ti. Muy pocos pueden decir eso.',
  puertas: 'Consejo de administración, dos reuniones al mes y ninguna rueda de prensa nunca más. Legal, publicado y comentadísimo.',
  bruselas: 'Bruselas, un despacho con vistas y una vida de reuniones en inglés. Aquí, a los tres meses, ya nadie se acordaba.',
};

function pantallaFinal() {
  borrarPartida();
  const pts = legado(estado);
  const rango = rangoDe(pts, estado);
  const premios = logrosDe(estado);
  const apodo = apodoDe(estado);
  const p = partidoDe(estado);
  pintarColorPartido(p);

  app.innerHTML = `<div id="vista"></div>`;
  document.getElementById('vista').innerHTML = `
    <div class="tarjeta final">
      <div class="etiqueta-anio">Fin de carrera · ${estado.edad} años · ${estado.año} años en política</div>
      <div class="emoji-rango">${rango.emoji}</div>
      <h2>${esc(rango.titulo)}</h2>
      <p class="desc-rango">${esc(rango.desc)}</p>
      <p class="cuerpo" style="margin-top:10px;font-size:14px">
        ${esc(estado.nombre)} “${esc(apodo)}” · ${estado.partidoEmoji} ${esc(estado.partidoNombre)} · peso final ${Math.round(estado.media)}<br>
        ${esc(TEXTO_RETIRO[estado.causaRetiro] ?? '')}</p>
      <p class="puntos">Puntuación de legado<b>${pts}</b></p>
      <div class="stats-final">
        <div><div class="v">${estado.presidencias}</div><div class="k">Investiduras</div></div>
        <div><div class="v">${estado.ministerios.length}</div><div class="k">Ministerios</div></div>
        <div><div class="v">${estado.escanos}</div><div class="k">Escaños</div></div>
        <div><div class="v">${estado.leyes.length}</div><div class="k">Leyes votadas</div></div>
        <div><div class="v">${estado.transfuguismos}</div><div class="k">Cambios de partido</div></div>
        <div><div class="v">${eur(estado.dinero)}</div><div class="k">Patrimonio</div></div>
      </div>
    </div>

    ${estado.leyes.length ? `<div class="tarjeta">
      <div class="etiqueta-anio">Tu hoja de votaciones</div>
      <ul class="lista-leyes">
        ${estado.leyes.map(l => `<li class="${l.coherencia > 0.25 ? 'coh' : l.coherencia < -0.25 ? 'inc' : ''}">
          <span class="v">${l.sentido === 'favor' ? 'SÍ' : l.sentido === 'contra' ? 'NO' : 'ABS'}</span>
          <span class="t">${esc(l.nombre)}</span>
          <span class="r">${l.aprobada ? 'aprobada' : 'decayó'}</span>
        </li>`).join('')}
      </ul>
      <p class="nota">${estado.votosCoherentes} votos coherentes con tu electorado · ${estado.votosIncoherentes} en contra de él.</p>
    </div>` : ''}

    <div class="tarjeta">
      <div class="etiqueta-anio">Logros de esta carrera (${premios.length})</div>
      <div class="premios">
        ${premios.map(x => `<div class="premio">
          <div class="e">${x.emoji}</div><div class="n">${esc(x.nombre)}</div><div class="d">${esc(x.desc)}</div>
        </div>`).join('') || '<p class="cuerpo">Ningún logro. Empieza otra y a por ellos.</p>'}
      </div>
    </div>

    ${estado.hitos.length ? `<div class="tarjeta">
      <div class="etiqueta-anio">Momentos de una vida política</div>
      <ul class="lista-limpia">${estado.hitos.map(h => `<li>${h.emoji} ${esc(h.texto)} <span class="año">· año ${h.año}</span></li>`).join('')}</ul>
    </div>` : ''}

    <button class="boton-grande" id="guardar">📸 Guardar la tarjeta como imagen</button>
    <button class="boton-secundario" id="copiar">Copiar resumen en texto</button>
    <button class="boton-secundario" id="otra">Jugar otra vez</button>

    <p class="aviso-legal">
      Sátira. Sin relación ni afiliación con ningún partido, medio ni institución.
      Todas las situaciones son ficticias.
    </p>`;

  window.scrollTo({ top: 0, behavior: 'instant' });
  document.getElementById('otra').onclick = () => pantallaInicio();
  document.getElementById('guardar').onclick = async () => {
    const b = document.getElementById('guardar');
    b.textContent = 'Generando imagen…';
    try { await descargarTarjeta(estado, { pts, rango, premios, apodo, partido: p }); aviso('¡Imagen guardada!'); }
    catch { aviso('No se pudo generar la imagen'); }
    b.textContent = '📸 Guardar la tarjeta como imagen';
  };
  document.getElementById('copiar').onclick = () => copiarResumen(pts, rango, apodo, premios);
}

function aviso(txt) {
  const a = document.createElement('div');
  a.className = 'aviso'; a.textContent = txt;
  document.body.appendChild(a);
  setTimeout(() => a.remove(), 2200);
}

function copiarResumen(pts, rango, apodo, premios) {
  const txt = [
    `${rango.emoji} ${estado.nombre} “${apodo}” — ${rango.titulo}`,
    `${estado.partidoEmoji} ${estado.partidoNombre} · ${estado.año} años en política · retirado a los ${estado.edad} · peso ${Math.round(estado.media)}`,
    ``,
    `🏛️ ${estado.presidencias} investiduras · 🎖️ ${estado.ministerios.length} ministerios · 🪑 ${estado.escanos} escaños`,
    `📜 ${estado.leyes.length} leyes votadas (${estado.votosCoherentes} coherentes, ${estado.votosIncoherentes} no)`,
    `🔀 ${estado.transfuguismos} cambios de partido · 💰 ${estado.dinero.toLocaleString('es')} €`,
    `🏅 ${premios.map(x => x.nombre).join(' · ')}`,
    ``,
    `Legado: ${pts} puntos · A la Moncloa en Cercanías`,
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
