// Motor de simulación: media del entrenador, temporadas, equipo, objetos y legado.
import {
  LINEAS, PORLINEA, PESO_RAREZA, NOMBRES_RIVAL, APODOS_PRENSA, RANGOS,
  OBJETOS, POROBJETO, LOGROS, REGIONES, PROFESORES, VILLANOS, CAMPEONES, LIDERES,
} from './datos.js?v=11';

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
export function nuevaPartida({ nombre, region, estilo, inicial, ritmo }) {
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
    flags: {},
    rival: crearRival(),
    apodo: null,
  };
  aplicarBonus(estado, estilo.bonus);
  const socio = crearPokemon(inicial.id, { socio: true });
  estado.equipo.push(socio);
  estado.socio = socio.uid;
  return estado;
}

function crearRival() {
  return { nombre: elegir(NOMBRES_RIVAL), poder: 34, derrotasTuyas: 0, victoriasSuyas: 0, activo: true };
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

// ── Pokémon ──────────────────────────────────────────────────────────────────
let uidSeq = 1;
const tiposDe = (linea, etapa) => linea.etapas[etapa].tipos ?? linea.tipos;

export function crearPokemon(lineaId, opts = {}) {
  const linea = PORLINEA[lineaId];
  // Cada Pokémon tiene su nivel (1-100) y sus propios umbrales de evolución,
  // así que dos Charmander de la misma partida no evolucionan a la vez.
  const umbrales = [16 + entero(0, 5), 34 + entero(0, 8)];
  let nivel = Math.min(100, opts.nivel ?? 5);
  let etapa = opts.etapa ?? 0;
  // Si nace ya crecido (un fichaje, un regalo), ajusta la etapa a su nivel
  while (etapa < linea.etapas.length - 1 && nivel >= umbrales[etapa]) etapa++;
  etapa = Math.min(etapa, linea.etapas.length - 1);
  return {
    uid: uidSeq++, linea: lineaId, etapa, nivel, umbrales,
    nombre: linea.etapas[etapa].nombre,
    dex: linea.etapas[etapa].dex,
    tipos: tiposDe(linea, etapa),
    rareza: linea.rareza,
    socio: !!opts.socio,
    forma: opts.forma ?? entero(-4, 6),
    vinculo: opts.socio ? 60 : entero(20, 45),
    añoCaptura: opts.año ?? 1,
    lesionado: false, retirado: false,
  };
}

// Fuerza de combate: el potencial de su etapa, aprovechado según su nivel.
// Un Charizard de nivel 30 pega mucho menos que uno de nivel 90.
export function poderPokemon(p) {
  const potencial = PORLINEA[p.linea].etapas[p.etapa].poder;
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

export function capturaAleatoria(estado, { rarezaMin = 'comun', region = null } = {}) {
  const permitidas = rarezaMin === 'raro' ? ['raro', 'pseudo'] : ['comun', 'raro', 'pseudo'];
  const pool = LINEAS.filter(l =>
    permitidas.includes(l.rareza) &&
    !estado.equipo.some(p => p.linea === l.id) &&
    (!region || l.region === region));
  if (!pool.length) return null;
  return fichar(estado, pesado(pool, l => PESO_RAREZA[l.rareza]).id);
}

// Evoluciones por nivel, narradas con el nombre anterior
// ("Marshtomp evolucionó a Swampert").
function evolucionar(estado) {
  const frases = [];
  for (const p of estado.equipo) {
    if (p.retirado) continue;
    const linea = PORLINEA[p.linea];
    while (p.etapa < linea.etapas.length - 1 && p.nivel >= p.umbrales[p.etapa]) {
      const antes = p.nombre;
      p.etapa++;
      const et = linea.etapas[p.etapa];
      p.nombre = et.nombre; p.dex = et.dex; p.tipos = tiposDe(linea, p.etapa);
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
  estado.talento = Math.min(1.6, estado.talento + n * 0.035);
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
function rangoPorEdad(edad) {
  if (edad <= 15) return [2.6, 6.4];
  if (edad <= 18) return [2.0, 5.4];
  if (edad <= 21) return [1.2, 4.2];
  if (edad <= 24) return [0.6, 3.2];
  if (edad <= 27) return [0.1, 2.3];
  if (edad <= 30) return [-0.4, 1.5];
  return [-1.6, 0.7];
}

function crecerMedia(estado) {
  const p = pasivos(estado);
  const [min, max] = rangoPorEdad(estado.edad);
  // Frena solo al acercarse a 99: no es un tope de la partida, es que
  // ganarle un punto al mejor del mundo cuesta cada vez más.
  const freno = Math.max(0.12, Math.pow(1 - estado.media / 101, 0.85));
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
  if (etapa === 'gimnasios' && estado.medallas < 8) {
    const nuevas = Math.min(8 - estado.medallas, Math.max(0, Math.round((rendimiento - 25) / 12)));
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
  } else if (rendimiento > 84 && etapa !== 'novato') {
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
    .map(l => ({ emoji: l.emoji, nombre: l.nombre, desc: l.desc(estado) }));
}

export function apodoDe(estado) {
  if (!estado.apodo) estado.apodo = elegir(APODOS_PRENSA);
  return estado.apodo;
}
