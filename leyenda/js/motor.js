// Motor de simulación: media del entrenador, temporadas, equipo, objetos y legado.
import {
  LINEAS, PORLINEA, PESO_RAREZA, NOMBRES_RIVAL, APODOS_PRENSA, RANGOS,
  OBJETOS, POROBJETO, LOGROS, REGIONES, PROFESORES, VILLANOS, CAMPEONES, LIDERES,
} from './datos.js?v=38';

// ── Utilidades ───────────────────────────────────────────────────────────────
export const azar = (a, b) => a + Math.random() * (b - a);
export const entero = (a, b) => Math.floor(azar(a, b + 1));
export const dado = p => Math.random() < p;
export const elegir = arr => arr[Math.floor(Math.random() * arr.length)];
export const limitar = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));

// Rango aleatorio para los efectos: nunca dos partidas dan lo mismo
export const rango = (a, b) => entero(a, b);

function pesado(items, peso) {
  const total = items.reduce((s, i) => s + peso(i), 0);
  if (total <= 0) return elegir(items);
  let r = Math.random() * total;
  for (const i of items) { r -= peso(i); if (r <= 0) return i; }
  return items[items.length - 1];
}

// ── Etapas de carrera ────────────────────────────────────────────────────────
export const ETAPAS = [
  { id: 'novato',    nombre: 'Novato',                 desde: 10 },
  { id: 'gimnasios', nombre: 'Circuito de gimnasios',  desde: 12 },
  { id: 'liga',      nombre: 'Camino a la Liga',       desde: 15 },
  { id: 'pro',       nombre: 'Circuito profesional',   desde: 18 },
  { id: 'cima',      nombre: 'Élite mundial',          desde: 23 },
  { id: 'veterano',  nombre: 'Veterano',               desde: 28 },
];

export function etapaDe(estado) {
  let e = ETAPAS[0];
  for (const et of ETAPAS) if (estado.edad >= et.desde) e = et;
  return e.id;
}
export const nombreEtapa = id => (ETAPAS.find(e => e.id === id) ?? ETAPAS[0]).nombre;

// ── Personajes ───────────────────────────────────────────────────────────────
export const profesorDe = region => (PROFESORES.find(p => p.region === region) ?? PROFESORES[0]).nombre;
export const campeonDe = region => (CAMPEONES.find(c => c.region === region) ?? CAMPEONES[0]).nombre;
export const villanoDe = region => VILLANOS.find(v => v.region === region) ?? elegir(VILLANOS);
export const liderDe = region => elegir(LIDERES.filter(l => l.region === region).length
  ? LIDERES.filter(l => l.region === region) : LIDERES);

// ── Creación del estado ──────────────────────────────────────────────────────
// Easter egg: llamarte Satoshi desbloquea el arco de Kanto del anime. Fuerza
// Kanto, Pikachu de compañero, a Shigeru de rival y una decisión por temporada,
// que si no la historia no cabe en la carrera.
export const esSatoshi = nombre => /^\s*satoshi\s*$/i.test(nombre ?? '');

export function nuevaPartida({ nombre, region, estilo, inicial, ritmo }) {
  const ash = esSatoshi(nombre);
  if (ash) {
    region = REGIONES.find(r => r.id === 'kanto') ?? region;
    inicial = PORLINEA['pikachu'] ?? inicial;
    ritmo = { ...ritmo, cada: 1 };
  }
  const estado = {
    nombre, region: region.id, regionNombre: region.nombre, regionEmoji: region.emoji,
    liga: region.liga,
    estilo: estilo.id, estiloNombre: estilo.nombre,
    ritmo: ritmo.id, cada: ritmo.cada,
    edad: 10, año: 1, retirado: false, causaRetiro: null,

    // Media del entrenador (el "OVR"). No hay techo fijo por partida: cada
    // temporada se tira un crecimiento con mucha varianza, así que la misma
    // carrera puede acabar en 75 o en 90 según cómo venga dada.
    media: 42 + entero(-3, 3),
    talento: 1,                         // multiplica lo que creces; lo suben los eventos
    experiencia: 0,

    stats: { poder: 30, estrategia: 30, vinculo: 45, fama: 5, salud: 90, moral: 75 },
    dinero: 3000,
    medallas: 0, titulos: [], apariciones: 0,
    victorias: 0, derrotas: 0, ligasGanadas: 0, mundiales: 0,
    capturasTotales: 1,
    regionesVisitadas: [region.nombre],
    objetos: [],
    equipo: [], hitos: [], cronica: [], vistos: new Set(),
    ultimoEvento: null,   // para no repetir la misma decisión dos turnos seguidos
    temporales: [],   // efectos que se revierten solos al cabo de N temporadas
    flags: ash ? { esAsh: true, ash: 1 } : {},
    rival: crearRival(ash),
    apodo: null,
  };
  aplicarBonus(estado, estilo.bonus);
  // El de Ash empieza ya siendo Pikachu (no Pichu) y no evoluciona por su
  // cuenta: lo de la piedra trueno es una decisión suya, no del nivel.
  const socio = ash ? crearPokemon('pikachu', { socio: true, etapa: 1, nivel: 8 }) : crearPokemon(inicial.id, { socio: true });
  if (ash) socio.umbrales = [0, 999];
  estado.equipo.push(socio);
  estado.socio = socio.uid;
  return estado;
}

function crearRival(ash = false) {
  return { nombre: ash ? 'Shigeru' : elegir(NOMBRES_RIVAL), poder: 34, derrotasTuyas: 0, victoriasSuyas: 0, activo: true };
}

function aplicarBonus(estado, bonus = {}) {
  for (const [k, v] of Object.entries(bonus)) {
    if (k === 'dinero') estado.dinero += v;
    else if (k === 'media') estado.media = limitar(estado.media + v);
    else if (k in estado.stats) estado.stats[k] = limitar(estado.stats[k] + v);
  }
}

// ── Objetos ──────────────────────────────────────────────────────────────────
export function tieneObjeto(estado, id) { return estado.objetos.includes(id); }

export function darObjeto(estado, id) {
  if (!POROBJETO[id] || tieneObjeto(estado, id)) return null;
  estado.objetos.push(id);
  return POROBJETO[id];
}

export function objetoAleatorio(estado) {
  const pool = OBJETOS.filter(o => !tieneObjeto(estado, o.id));
  if (!pool.length) return null;
  const o = elegir(pool);
  estado.objetos.push(o.id);
  return o;
}

// Suma de todos los pasivos que llevas encima
function pasivos(estado) {
  const t = { salud: 0, moral: 0, media: 0, estrategia: 0, vinculo: 0, crecimiento: 0, suerte: 0, dineroExtra: 0 };
  for (const id of estado.objetos) {
    for (const [k, v] of Object.entries(POROBJETO[id]?.pasivo ?? {})) t[k] = (t[k] ?? 0) + v;
  }
  return t;
}

// ── Guardar y recuperar la partida ───────────────────────────────────────────
// En móvil se cierra la pestaña cada dos por tres (una llamada, cambiar de
// app), así que la carrera en curso se guarda en el navegador. No sale de tu
// dispositivo: es localStorage, no hay servidor ni cuenta de nadie.
const CLAVE = 'hazteconTodos.partida';
const VERSION_GUARDADO = 1;

export function guardarPartida(estado) {
  try {
    const plano = { ...estado, vistos: [...estado.vistos], v: VERSION_GUARDADO };
    localStorage.setItem(CLAVE, JSON.stringify(plano));
    return true;
  } catch { return false; }   // modo incógnito, cuota llena: no es motivo para romper el juego
}

export function cargarPartida() {
  try {
    const bruto = localStorage.getItem(CLAVE);
    if (!bruto) return null;
    const plano = JSON.parse(bruto);
    if (plano.v !== VERSION_GUARDADO || plano.retirado || !plano.equipo?.length) return null;
    plano.vistos = new Set(plano.vistos ?? []);
    // Los uid siguen contando desde el más alto guardado, para que un Pokémon
    // nuevo no choque con uno que ya estaba en el equipo.
    uidSeq = Math.max(uidSeq, ...plano.equipo.map(p => p.uid ?? 0)) + 1;
    return plano;
  } catch { return null; }
}

export function borrarPartida() {
  try { localStorage.removeItem(CLAVE); } catch { /* da igual */ }
}

// ── Palmarés: las carreras terminadas ────────────────────────────────────────
// Se guarda un resumen de cada carrera acabada, no la partida entera: ocupa
// menos de 1 KB, así que caben cientos sin acercarse al límite del navegador.
// Sigue sin salir del dispositivo, y se puede exportar a fichero para llevarlo
// a otro móvil sin cuentas ni servidor de por medio.
const CLAVE_PALMARES = 'hazteconTodos.palmares';
const MAX_PALMARES = 100;

export function leerPalmares() {
  try {
    const bruto = localStorage.getItem(CLAVE_PALMARES);
    const lista = bruto ? JSON.parse(bruto) : [];
    return Array.isArray(lista) ? lista.filter(c => c && c.id) : [];
  } catch { return []; }
}

function escribirPalmares(lista) {
  try {
    localStorage.setItem(CLAVE_PALMARES, JSON.stringify(lista.slice(0, MAX_PALMARES)));
    return true;
  } catch { return false; }   // cuota llena o modo incógnito: no rompe el juego
}

export function apuntarEnPalmares(resumen) {
  const lista = leerPalmares();
  if (lista.some(c => c.id === resumen.id)) return lista;   // no duplicar
  lista.unshift(resumen);
  escribirPalmares(lista);
  return lista;
}

export function borrarPalmares() {
  try { localStorage.removeItem(CLAVE_PALMARES); } catch { /* da igual */ }
}

export function exportarPalmares() {
  return JSON.stringify({ juego: 'hazte-con-todos', v: 1, carreras: leerPalmares(), insignias: leerLogros() }, null, 1);
}

// Importar fusiona: lo que ya tienes se queda, y se añade lo que falte.
// Devuelve cuántas entraron para poder decírselo al jugador.
export function importarPalmares(texto) {
  const datos = JSON.parse(texto);
  const entrantes = Array.isArray(datos) ? datos : datos?.carreras;
  if (!Array.isArray(entrantes)) throw new Error('formato');
  const validas = entrantes.filter(c => c && c.id && c.rango && typeof c.media === 'number');
  if (!validas.length) throw new Error('vacio');
  // Las insignias viajan con la copia; si el fichero es antiguo y no las trae,
  // se reconstruyen a partir de los premios de cada carrera guardada.
  desbloquearLogros(Array.isArray(datos?.insignias) ? datos.insignias
    : validas.flatMap(c => (c.premios ?? []).map(p => p.id).filter(Boolean)));
  const lista = leerPalmares();
  const tengo = new Set(lista.map(c => c.id));
  const nuevas = validas.filter(c => !tengo.has(c.id));
  const total = [...lista, ...nuevas].sort((a, b) => (b.fecha ?? 0) - (a.fecha ?? 0));
  escribirPalmares(total);
  return { nuevas: nuevas.length, total: Math.min(total.length, MAX_PALMARES) };
}

// ── Pokémon ──────────────────────────────────────────────────────────────────
let uidSeq = 1;
// Etapas efectivas de un ejemplar: si su línea tiene evoluciones alternativas,
// la suya es la rama que le tocó al aparecer, y solo esa.
function etapasDe(linea, rama = 0) {
  if (!linea.ramas?.length) return linea.etapas;
  return [...linea.etapas, linea.ramas[rama % linea.ramas.length]];
}
const tiposDe = (linea, etapa, rama = 0) => etapasDe(linea, rama)[etapa].tipos ?? linea.tipos;

export function crearPokemon(lineaId, opts = {}) {
  const linea = PORLINEA[lineaId];
  // Cada Pokémon tiene su nivel (1-100) y sus propios umbrales de evolución,
  // así que dos Charmander de la misma partida no evolucionan a la vez.
  const umbrales = [16 + entero(0, 5), 34 + entero(0, 8)];
  let nivel = Math.min(100, opts.nivel ?? 5);
  let etapa = opts.etapa ?? 0;
  // Si su línea ramifica, este ejemplar ya nace con la suya decidida
  const rama = linea.ramas?.length ? entero(0, linea.ramas.length - 1) : 0;
  const etapas = etapasDe(linea, rama);
  // Si nace ya crecido (un fichaje, un regalo), ajusta la etapa a su nivel
  while (etapa < etapas.length - 1 && nivel >= umbrales[etapa]) etapa++;
  etapa = Math.min(etapa, etapas.length - 1);
  return {
    uid: uidSeq++, linea: lineaId, etapa, nivel, umbrales, rama,
    nombre: etapas[etapa].nombre,
    dex: etapas[etapa].dex,
    tipos: tiposDe(linea, etapa, rama),
    rareza: linea.rareza,
    socio: !!opts.socio,
    shiny: !!opts.shiny,   // los colores raros se conservan al evolucionar
    forma: opts.forma ?? entero(-4, 6),
    vinculo: opts.socio ? 60 : entero(20, 45),
    añoCaptura: opts.año ?? 1,
    lesionado: false, retirado: false,
  };
}

// Fuerza de combate: el potencial de su etapa, aprovechado según su nivel.
// Un Charizard de nivel 30 pega mucho menos que uno de nivel 90.
export function poderPokemon(p) {
  const potencial = etapasDe(PORLINEA[p.linea], p.rama ?? 0)[p.etapa].poder;
  const aprovecha = 0.42 + 0.58 * ((p.nivel ?? 1) / 100);
  return Math.max(1, potencial * aprovecha + p.forma * 0.5
    + (p.vinculo - 40) * 0.1 - (p.lesionado ? 15 : 0));
}

// El nivel sube cada temporada: rápido al principio, muy lento cerca de 100.
function subirNivel(p, estado) {
  if (p.nivel >= 100) return 0;
  const margen = 1 - p.nivel / 108;
  const empuje = 5 + estado.media / 22 + (p.vinculo - 40) / 45
    + (estado.flags.entrenaFuerte ? 1.5 : 0) + (estado.stats.salud < 40 ? -1.5 : 0);
  const sube = Math.max(0.6, empuje * margen * azar(0.7, 1.35));
  p.nivel = Math.min(100, p.nivel + sube);
  return sube;
}

export function poderEquipo(estado) {
  const act = estado.equipo.filter(p => !p.retirado);
  if (!act.length) return 8;
  const top = act.map(poderPokemon).sort((a, b) => b - a).slice(0, 6);
  const media = top.reduce((s, v) => s + v, 0) / top.length;
  return media * (0.72 + 0.28 * (Math.min(6, top.length) / 6));
}

export function fichar(estado, lineaId, opts = {}) {
  // Lo que capturas ahora es acorde a lo avanzada que esté tu carrera
  const nivel = opts.nivel ?? Math.min(88, entero(6, 15) + (estado.año - 1) * entero(2, 4));
  const p = crearPokemon(lineaId, { ...opts, nivel, año: estado.año });
  estado.equipo.push(p);
  estado.capturasTotales++;
  return p;
}

export function capturaAleatoria(estado, { rarezaMin = 'comun', region = null, ...opts } = {}) {
  const permitidas = rarezaMin === 'raro' ? ['raro', 'pseudo'] : ['comun', 'raro', 'pseudo'];
  const pool = LINEAS.filter(l =>
    permitidas.includes(l.rareza) && !l.soloEvento &&
    !estado.equipo.some(p => p.linea === l.id) &&
    (!region || l.region === region));
  if (!pool.length) return null;
  // `opts` deja que quien llama fuerce cosas: que salga shiny, o que nazca
  // como cría de nivel 5 si viene de un huevo.
  return fichar(estado, pesado(pool, l => PESO_RAREZA[l.rareza]).id, opts);
}

// Evoluciones por nivel, narradas con el nombre anterior
// ("Marshtomp evolucionó a Swampert").
function evolucionar(estado) {
  const frases = [];
  for (const p of estado.equipo) {
    if (p.retirado) continue;
    const linea = PORLINEA[p.linea];
    const etapas = etapasDe(linea, p.rama ?? 0);
    while (p.etapa < etapas.length - 1 && p.nivel >= p.umbrales[p.etapa]) {
      const antes = p.nombre;
      p.etapa++;
      const et = etapas[p.etapa];
      p.nombre = et.nombre; p.dex = et.dex; p.tipos = tiposDe(linea, p.etapa, p.rama ?? 0);
      frases.push(`${antes} evolucionó a ${p.nombre} (nivel ${Math.round(p.nivel)}).`);
    }
  }
  return frases;
}

// ── Crecimiento de la media ──────────────────────────────────────────────────
// No hay un techo calculado al empezar la partida. Cada temporada se tira un
// crecimiento propio, con mucha varianza, y los años buenos y malos se
// acumulan: dos carreras idénticas de inicio pueden separarse quince puntos.
// Lo único que se hereda es el "talento", un multiplicador que suben ciertos
// eventos (el programa del Profesor, el coaching, un legendario...).
export function subirTalento(estado, n) {
  estado.talento = Math.min(1.35, estado.talento + n * 0.022);
  return estado.talento;
}

// Sube (o baja) la media ya mismo, pero marcado para deshacerse solo al cabo
// de N temporadas: la indigestión de un experimento pasa, la sanción no.
export function mediaTemporal(estado, delta, temporadas = 1) {
  estado.media = limitar(estado.media + delta);
  estado.temporales.push({ delta, restantes: temporadas });
}

function resolverTemporales(estado) {
  const notas = [];
  estado.temporales = estado.temporales.filter(t => {
    t.restantes--;
    if (t.restantes > 0) return true;
    estado.media = limitar(estado.media - t.delta);
    notas.push(t.delta > 0 ? 'Se te pasa el subidón: la media vuelve a su sitio.' : 'Superado el bache, recuperas la media que habías perdido.');
    return false;
  });
  return notas;
}

// Lo que puedes crecer en bruto según la edad: de crío das saltos, pasados
// los treinta el año bueno es no perder nada.
// Cuánto puede moverse la media en una temporada, por edad: [centro, amplitud].
// VARIANZA ensancha el abanico sin mover el centro, así que un año puede salir
// redondo o irse al garete sin que tú hayas hecho nada distinto.
const VARIANZA = 1.8;
const CURVA_EDAD = [
  [15, 4.5, 1.9], [18, 3.7, 1.7], [21, 2.7, 1.5],
  [24, 1.9, 1.3], [27, 1.2, 1.1], [30, 0.55, 0.95],
];
function rangoPorEdad(edad) {
  const [, centro, ancho] = CURVA_EDAD.find(([tope]) => edad <= tope) ?? [0, -0.45, 1.15];
  const w = ancho * VARIANZA;
  return [centro - w, centro + w];
}

// El freno de la élite: subir de 92 a 93 no puede costar lo mismo que de 60 a
// 61. Lo comparten el crecimiento anual y las subidas que dan los eventos, así
// que encadenar buenas decisiones tampoco te dispara hasta 98.
const ELITE_DESDE = 82, ELITE_PENDIENTE = 0.12, ELITE_SUELO = 0.2;

// Solo el tramo de élite: hasta ELITE_DESDE no recorta nada, a partir de ahí
// cada punto cuesta más. Es lo que impide que encadenar aciertos te lleve a 98.
function frenoElite(media) {
  return media > ELITE_DESDE ? Math.max(ELITE_SUELO, 1 - (media - ELITE_DESDE) * ELITE_PENDIENTE) : 1;
}

// Freno del crecimiento anual: el de élite más el de acercarse al 100.
function frenoDe(media) {
  return Math.max(0.08, Math.pow(1 - media / 101, 0.85)) * frenoElite(media);
}

// Suma media aplicando solo el freno de élite a lo que sube (lo que baja entra
// entero). Así un acierto vale lo mismo a media 60 que antes, pero a 90 no.
export function sumarMedia(estado, v) {
  const real = v > 0 ? v * frenoElite(estado.media) : v;
  estado.media = limitar(estado.media + real);
  return real;
}

function crecerMedia(estado) {
  const p = pasivos(estado);
  const [min, max] = rangoPorEdad(estado.edad);
  const freno = frenoDe(estado.media);
  const contexto = 1 + p.crecimiento
    + (estado.stats.moral > 70 ? 0.12 : 0)
    + (estado.stats.salud < 45 ? -0.3 : 0);

  let sube = azar(min, max) * estado.talento * contexto;
  if (sube > 0) sube *= freno;               // el freno solo afecta a lo que sube
  estado.media = limitar(estado.media + sube);
  estado.experiencia++;
  return Math.abs(sube) >= 0.35 ? sube : null;
}

// ── Simulación de temporada ──────────────────────────────────────────────────
const NOMBRE_TORNEO = {
  novato: ['Torneo de la Escuela', 'Copa de Novatos', 'Liga Junior'],
  gimnasios: ['Circuito de Gimnasios', 'Reto de las Medallas', 'Ruta de los Líderes'],
  liga: ['Conferencia Regional', 'Clasificatorio de la Liga', 'Torneo de la Liga'],
  pro: ['Copa Máster', 'Circuito Profesional', 'Torneo de Campeones'],
  cima: ['Campeonato Mundial', 'Copa de Campeones', 'Torneo de Élite'],
  veterano: ['Copa Máster', 'Liga Sénior', 'Torneo de Veteranos'],
};

// Golpes de suerte: lo que no decides tú. Un torneo se juega un fin de semana y
// a veces lo arruina un autobús que no pasa, o te lo regala un cuadro amable.
// Van en dos caras simétricas para que la carrera no sea solo la suma de tus
// decisiones: hay años en los que simplemente toca.
const GOLPES_MALOS = [
  { txt: 'Te quedas sin repelentes a mitad de la cueva y los Zubat os retrasan dos días: llegas al torneo con tu primera ronda ya jugada. Eliminado sin combatir.', pronto: true },
  { txt: 'El ferry se cancela por temporal y llegas al pabellón con la primera ronda perdida por incomparecencia.' },
  { txt: 'Una gastroenteritis en el hotel oficial se lleva por delante a media expedición, tú incluido. Caes a la primera.' },
  { txt: 'El control de legalidad te tumba el equipo por una nimiedad del registro. Combates con el equipo B y caes en la primera ronda.' },
  { txt: 'Te toca el peor cuadro posible: el vigente campeón en primera ronda. Fuera el viernes por la mañana.' },
];
const GOLPES_BUENOS = [
  { txt: 'El sorteo te regala un bye en la primera ronda: entras descansado mientras los demás se destrozan entre ellos.' },
  { txt: 'Tu rival de octavos no se presenta y pasas de ronda desde el hotel.' },
  { txt: 'El cuadro se abre entero: los tres favoritos de tu lado caen antes de cruzarse contigo.' },
  { txt: 'Media hora de retraso por lluvia y a tu equipo le viene de cine: salís enchufados y arrasáis las primeras rondas.' },
];

// Se tira una vez por temporada. Nunca las dos caras a la vez.
function golpeDeSuerte(estado, etapa) {
  if (estado.flags.sancionado) return null;
  if (dado(0.10)) {
    const pool = etapa === 'novato' || etapa === 'gimnasios'
      ? GOLPES_MALOS
      : GOLPES_MALOS.filter(g => !g.pronto);
    return { ...elegir(pool), fuera: true };
  }
  if (dado(0.09)) return { ...elegir(GOLPES_BUENOS), delta: 6 };
  return null;
}

export function simularTemporada(estado) {
  const etapa = etapaDe(estado);
  const s = estado.stats;
  const p = pasivos(estado);
  estado.año++; estado.edad++;

  const linea = { año: estado.año, edad: estado.edad, etapa, sucesos: [], destacado: null, trofeo: null };

  // Desgaste natural, amortiguado por los objetos que llevas
  s.salud = limitar(s.salud - entero(estado.edad > 26 ? 2 : 0, estado.edad > 26 ? 6 : 3)
    - (estado.flags.lesionCronica ? 2 : 0) + p.salud);
  s.moral = limitar(s.moral + entero(-4, 4) + p.moral + (48 - s.moral) * 0.07);
  s.estrategia = limitar(s.estrategia + p.estrategia * 0.5);
  if (etapa === 'veterano') s.fama = limitar(s.fama - entero(1, 3));

  for (const pk of estado.equipo) {
    if (pk.retirado) continue;
    pk.vinculo = limitar(pk.vinculo + entero(1, 4) + (estado.estilo === 'criador' ? 2 : 0) + p.vinculo * 0.5);
    if (pk.lesionado && dado(0.5)) pk.lesionado = false;
    subirNivel(pk, estado);
  }

  resolverTemporales(estado).forEach(n => linea.sucesos.push(n));
  const subida = crecerMedia(estado);
  if (subida > 0) linea.sucesos.push(`Buen año de trabajo: media ${Math.round(estado.media)} (+${subida.toFixed(1)}).`);
  else if (subida < 0) linea.sucesos.push(`Los años pesan: media ${Math.round(estado.media)} (${subida.toFixed(1)}).`);

  evolucionar(estado).forEach(f => linea.sucesos.push(f));

  // Plantilla: nunca te quedas sin equipo, y vas ampliando con los años
  if (!estado.equipo.some(pk => !pk.retirado)) {
    const nuevo = capturaAleatoria(estado);
    if (nuevo) linea.sucesos.push(`Sin equipo: el Centro Pokémon te cede un ${nuevo.nombre} para seguir compitiendo.`);
  } else if (estado.equipo.filter(pk => !pk.retirado).length < 6 && dado(0.4)) {
    const nuevo = capturaAleatoria(estado, { rarezaMin: s.fama > 45 && dado(0.3) ? 'raro' : 'comun' });
    if (nuevo) linea.sucesos.push(`Se une ${nuevo.nombre} al equipo.`);
  }

  // Rendimiento: manda la media, el equipo acompaña
  const pe = poderEquipo(estado);
  const forma = estado.media * 0.62 + pe * 0.22 + s.estrategia * 0.08 + s.salud * 0.05 + s.moral * 0.03;
  const rendimiento = forma + azar(-13, 13) + p.suerte
    - (estado.flags.sancionado ? 30 : 0) - (estado.flags.lesionado ? 12 : 0);

  // Un título se juega en un fin de semana, no en una media anual: ser el mejor
  // te pone en la pelea, pero el sorteo, el speed tie y el día que tengas
  // deciden. Por eso el trofeo lleva su propia tirada, mucho más loca.
  const golpe = golpeDeSuerte(estado, etapa);
  const rendTorneo = rendimiento + azar(-34, 34) + (golpe?.delta ?? 0);

  if (estado.rival.activo) estado.rival.poder = limitar(estado.rival.poder + entero(2, 7));

  const partidos = entero(14, 26);
  const g = Math.round(partidos * limitar((rendimiento - 22) / 68, 0.08, 0.94));
  estado.victorias += g; estado.derrotas += partidos - g;
  linea.sucesos.push(`Temporada cerrada con ${g}-${partidos - g}.`);

  estado.dinero += Math.round(rendimiento * (etapa === 'novato' ? 20 : etapa === 'gimnasios' ? 60 : etapa === 'liga' ? 140 : 400))
    + (estado.flags.patrocinio ? 12000 : 0) + p.dineroExtra;

  // Resultado del torneo
  const torneo = elegir(NOMBRE_TORNEO[etapa]);
  estado.apariciones++;
  if (golpe) linea.sucesos.push(golpe.txt);
  if (etapa === 'gimnasios' && estado.medallas < 8) {
    // En el circuito de medallas el golpe se nota en una medalla arriba o abajo.
    const ajuste = golpe ? (golpe.fuera ? -1 : 1) : 0;
    const nuevas = Math.min(8 - estado.medallas, Math.max(0, Math.round((rendimiento - 25) / 12) + ajuste));
    estado.medallas += nuevas;
    linea.sucesos.push(nuevas
      ? `Consigues ${nuevas} medalla${nuevas > 1 ? 's' : ''} (${estado.medallas}/8).`
      : 'Ni una sola medalla este año. Duro.');
    if (estado.medallas === 8 && !estado.flags.ochoMedallas) {
      estado.flags.ochoMedallas = true;
      hito(estado, '🎖️', `Las 8 medallas de ${estado.regionNombre}`);
      linea.trofeo = { tipo: 'medallas', nombre: `Las 8 medallas de ${estado.regionNombre}`, año: estado.año };
      s.fama = limitar(s.fama + rango(6, 14));
    }
  // Un golpe malo te deja fuera antes de empezar: ese año no hay torneo que valga.
  } else if (golpe?.fuera) {
    linea.sucesos.push(`Adiós a ${torneo} sin haber podido competir.`);
    s.moral = limitar(s.moral - rango(4, 10));
  // El Mundial pide bastante más que un regional: es el techo del circuito.
  } else if (rendTorneo > (etapa === 'cima' ? 113 : 104) && etapa !== 'novato') {
    const titulo = etapa === 'cima' ? 'Campeonato Mundial' : `${torneo} de ${estado.regionNombre}`;
    estado.titulos.push({ año: estado.año, nombre: titulo });
    if (etapa === 'cima') estado.mundiales++; else estado.ligasGanadas++;
    s.fama = limitar(s.fama + rango(9, 18)); s.moral = limitar(s.moral + rango(8, 16));
    linea.destacado = `🏆 ¡GANAS ${titulo.toUpperCase()}!`;
    linea.trofeo = { tipo: etapa === 'cima' ? 'mundial' : 'liga', nombre: titulo, año: estado.año };
    hito(estado, '🏆', `${titulo} (año ${estado.año})`);
  } else if (rendimiento > 70) {
    linea.sucesos.push(`Finalista en ${torneo}. Tan cerca.`);
    s.fama = limitar(s.fama + rango(3, 8));
  } else if (rendimiento > 50) {
    linea.sucesos.push(`Cuartos de final en ${torneo}.`);
    s.fama = limitar(s.fama + rango(1, 5));
  } else {
    linea.sucesos.push(`Eliminado pronto en ${torneo}.`);
    s.moral = limitar(s.moral - rango(3, 8));
  }

  // Duelo con el rival
  const r = estado.rival;
  if (r.activo && dado(0.45)) {
    if (estado.media + azar(-9, 11) >= r.poder) {
      r.derrotasTuyas++; s.moral = limitar(s.moral + rango(5, 11)); s.fama = limitar(s.fama + rango(2, 5));
      linea.sucesos.push(`Vences a ${r.nombre} otra vez. Se marcha sin mirarte.`);
    } else {
      r.victoriasSuyas++; s.moral = limitar(s.moral - rango(4, 10));
      linea.sucesos.push(`${r.nombre} te gana. Duele más de lo que admites.`);
    }
  }

  if (estado.flags.sancionado) {
    estado.flags.sancionadoAños = (estado.flags.sancionadoAños ?? 1) - 1;
    linea.sucesos.push('Sigues cumpliendo sanción. La temporada no cuenta para nada.');
    if (estado.flags.sancionadoAños <= 0) { estado.flags.sancionado = false; linea.sucesos.push('Sanción cumplida. Vuelves.'); }
  }

  estado.cronica.push(linea);
  return linea;
}

export function hito(estado, emoji, texto) {
  estado.hitos.push({ emoji, texto, año: estado.año });
}

// Mudanza de región (por oferta, por dinero o por ganas de empezar de cero)
export function mudarse(estado, nombreRegion = null) {
  const destino = nombreRegion
    ? REGIONES.find(r => r.nombre === nombreRegion)
    : elegir(REGIONES.filter(r => r.nombre !== estado.regionNombre));
  if (!destino) return null;
  estado.region = destino.id;
  estado.regionNombre = destino.nombre;
  estado.regionEmoji = destino.emoji;
  estado.liga = destino.liga;
  if (!estado.regionesVisitadas.includes(destino.nombre)) estado.regionesVisitadas.push(destino.nombre);
  return destino;
}

// ── Retiro ───────────────────────────────────────────────────────────────────
// Antes de esta edad una mala racha de salud o moral es un bache, no el fin
// de la carrera: con 13 años nadie "se retira", simplemente lo pasa mal un
// tiempo y sigue. El límite por edad (34) es el único techo real.
const EDAD_MIN_RETIRO_FORZOSO = 20;

export function debeRetirarse(estado) {
  if (estado.retirado) return false;
  if (estado.edad >= 34) return 'edad';
  if (estado.edad >= EDAD_MIN_RETIRO_FORZOSO) {
    if (estado.stats.salud <= 12) return 'salud';
    if (estado.stats.moral <= 5) return 'moral';
    if (estado.edad >= 29 && estado.stats.fama < 18 && dado(0.35)) return 'olvido';
  }
  return false;
}

export function retirar(estado, causa) {
  estado.retirado = true;
  estado.causaRetiro = causa;
}

// ── Puntuación final y logros ────────────────────────────────────────────────
export function legado(estado) {
  const s = estado.stats;
  let pts = 0;
  pts += estado.mundiales * 190;
  pts += estado.ligasGanadas * 95;
  pts += estado.medallas * 9;
  pts += s.fama * 2.2;
  pts += estado.media * 3.4;
  pts += poderEquipo(estado) * 1.2;
  pts += estado.victorias * 0.7;
  pts += estado.equipo.filter(p => p.rareza === 'legendario').length * 45;
  pts += estado.hitos.length * 6;
  pts += estado.objetos.length * 8;
  pts += Math.min(estado.dinero / 4000, 45);
  pts += (s.vinculo - 40) * 0.9;
  if (estado.flags.dopaje) pts -= 90;
  if (estado.flags.exsancionado) pts -= 55;
  if (estado.flags.traicion) pts -= 40;
  if (estado.flags.heroe) pts += 60;
  pts -= estado.derrotas * 0.18;
  return Math.round(pts);
}

// Un rango puede exigir además una media mínima: ser Leyenda no va solo de
// palmarés, hay que haber llegado de verdad ahí arriba.
export function rangoDe(pts, media = 0) {
  return RANGOS.find(r => pts >= r.min && media >= (r.minMedia ?? 0)) ?? RANGOS[RANGOS.length - 1];
}

export function logrosDe(estado) {
  return LOGROS.filter(l => { try { return l.cond(estado); } catch { return false; } })
    .map(l => ({ id: l.id, emoji: l.emoji, nombre: l.nombre, desc: l.desc(estado) }));
}

// ── Medallero: las insignias que llevas coleccionadas ────────────────────────
// Es la única cosa que sobrevive de una carrera a otra. Igual que el palmarés:
// una lista de ids en este navegador, sin cuenta y sin servidor.
const CLAVE_LOGROS = 'hazteconTodos.logros';

export function leerLogros() {
  try {
    const bruto = localStorage.getItem(CLAVE_LOGROS);
    const lista = bruto ? JSON.parse(bruto) : [];
    return Array.isArray(lista) ? lista.filter(id => typeof id === 'string') : [];
  } catch { return []; }
}

// Devuelve solo los que no tenías, para poder cantarlos si hace falta.
export function desbloquearLogros(ids = []) {
  const tengo = new Set(leerLogros());
  const nuevos = ids.filter(id => id && !tengo.has(id));
  if (!nuevos.length) return [];
  try { localStorage.setItem(CLAVE_LOGROS, JSON.stringify([...tengo, ...nuevos])); } catch { /* cuota llena */ }
  return nuevos;
}

export function borrarLogros() {
  try { localStorage.removeItem(CLAVE_LOGROS); } catch { /* da igual */ }
}

export function apodoDe(estado) {
  if (!estado.apodo) estado.apodo = elegir(APODOS_PRENSA);
  return estado.apodo;
}
