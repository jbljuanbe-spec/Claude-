// Motor de simulación: estado de la carrera, temporadas, equipo y consecuencias.
import { LINEAS, PORLINEA, PESO_RAREZA, NOMBRES_RIVAL, APODOS_PRENSA, RANGOS } from './datos.js';

// ── Utilidades ───────────────────────────────────────────────────────────────
export const azar = (a, b) => a + Math.random() * (b - a);
export const entero = (a, b) => Math.floor(azar(a, b + 1));
export const dado = p => Math.random() < p;
export const elegir = arr => arr[Math.floor(Math.random() * arr.length)];
export const limitar = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));

function pesado(items, peso) {
  const total = items.reduce((s, i) => s + peso(i), 0);
  if (total <= 0) return elegir(items);
  let r = Math.random() * total;
  for (const i of items) { r -= peso(i); if (r <= 0) return i; }
  return items[items.length - 1];
}

// ── Etapas de carrera ────────────────────────────────────────────────────────
export const ETAPAS = [
  { id: 'novato',   nombre: 'Novato',            desde: 10 },
  { id: 'gimnasios',nombre: 'Circuito de gimnasios', desde: 12 },
  { id: 'liga',     nombre: 'Camino a la Liga',  desde: 15 },
  { id: 'pro',      nombre: 'Circuito profesional', desde: 18 },
  { id: 'cima',     nombre: 'Élite mundial',     desde: 23 },
  { id: 'veterano', nombre: 'Veterano',          desde: 28 },
];

export function etapaDe(estado) {
  if (estado.flags.leyendaViva) return 'cima';
  let e = ETAPAS[0];
  for (const et of ETAPAS) if (estado.edad >= et.desde) e = et;
  return e.id;
}

// ── Creación del estado ──────────────────────────────────────────────────────
export function nuevaPartida({ nombre, region, estilo, inicial, ritmo }) {
  const estado = {
    nombre, region: region.id, regionNombre: region.nombre, regionEmoji: region.emoji,
    liga: region.liga,
    estilo: estilo.id, estiloNombre: estilo.nombre,
    ritmo: ritmo.id, cada: ritmo.cada,
    edad: 10, año: 1, retirado: false, causaRetiro: null,
    stats: { poder: 30, estrategia: 30, vinculo: 45, fama: 5, salud: 90, moral: 75 },
    dinero: 3000,
    medallas: 0, titulos: [], apariciones: 0,
    victorias: 0, derrotas: 0, ligasGanadas: 0, mundiales: 0,
    equipo: [], hitos: [], cronica: [], vistos: new Set(),
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
  return { nombre: elegir(NOMBRES_RIVAL), poder: 34, relacion: 0, derrotasTuyas: 0, victoriasSuyas: 0, activo: true };
}

function aplicarBonus(estado, bonus = {}) {
  for (const [k, v] of Object.entries(bonus)) {
    if (k === 'dinero') estado.dinero += v;
    else if (k in estado.stats) estado.stats[k] = limitar(estado.stats[k] + v);
  }
}

// ── Pokémon ──────────────────────────────────────────────────────────────────
let uidSeq = 1;
export function crearPokemon(lineaId, opts = {}) {
  const linea = PORLINEA[lineaId];
  // Hay líneas de una sola etapa (Snorlax, Mimikyu, Rotom...): nunca pedir más de las que hay
  const etapa = Math.min(opts.etapa ?? 0, linea.etapas.length - 1);
  return {
    uid: uidSeq++, linea: lineaId, etapa,
    nombre: linea.etapas[etapa].nombre,
    dex: linea.etapas[etapa].dex,
    tipos: linea.tipos,
    rareza: linea.rareza,
    socio: !!opts.socio,
    forma: opts.forma ?? entero(-4, 6),   // pequeña varianza individual
    vinculo: opts.socio ? 60 : entero(20, 45),
    añoCaptura: opts.año ?? 1,
    lesionado: false,
    retirado: false,
    nota: opts.nota ?? null,
  };
}

export function poderPokemon(p) {
  const base = PORLINEA[p.linea].etapas[p.etapa].poder;
  const bonoVinculo = (p.vinculo - 40) * 0.12;
  return Math.max(1, base + p.forma + bonoVinculo - (p.lesionado ? 18 : 0));
}

export function poderEquipo(estado) {
  const activos = estado.equipo.filter(p => !p.retirado);
  if (!activos.length) return 8;
  const top = activos.map(poderPokemon).sort((a, b) => b - a).slice(0, 6);
  const media = top.reduce((s, v) => s + v, 0) / top.length;
  const profundidad = Math.min(6, top.length) / 6;          // tener banquillo importa
  return media * (0.72 + 0.28 * profundidad);
}

export function fichar(estado, lineaId, opts = {}) {
  const p = crearPokemon(lineaId, { ...opts, año: estado.año });
  estado.equipo.push(p);
  return p;
}

// Captura aleatoria coherente con la etapa de la carrera
export function capturaAleatoria(estado, { rarezaMin = 'comun', region = null } = {}) {
  const permitidas = rarezaMin === 'raro' ? ['raro', 'pseudo'] : ['comun', 'raro', 'pseudo'];
  const pool = LINEAS.filter(l =>
    permitidas.includes(l.rareza) &&
    !estado.equipo.some(p => p.linea === l.id) &&
    (!region || l.region === region));
  if (!pool.length) return null;
  const linea = pesado(pool, l => PESO_RAREZA[l.rareza]);
  return fichar(estado, linea.id);
}

// Evoluciones: dependen de años juntos, vínculo y poder del entrenador
function evolucionar(estado) {
  const nuevos = [];
  for (const p of estado.equipo) {
    if (p.retirado) continue;
    const linea = PORLINEA[p.linea];
    if (p.etapa >= linea.etapas.length - 1) continue;
    const años = estado.año - p.añoCaptura;
    const listo = años >= (p.etapa === 0 ? 1 : 2) || p.rareza === 'legendario';
    const empuje = (estado.stats.poder + p.vinculo) / 2;
    const umbral = p.etapa === 0 ? 34 : 58;
    if (listo && empuje > umbral - años * 4) {
      p.etapa++;
      const et = linea.etapas[p.etapa];
      p.nombre = et.nombre; p.dex = et.dex;
      nuevos.push(p);
    }
  }
  return nuevos;
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
  estado.año++; estado.edad++;

  // Desgaste y deriva natural
  s.salud = limitar(s.salud - (estado.edad > 26 ? entero(2, 5) : entero(0, 2)) - (estado.flags.lesionCronica ? 2 : 0));
  s.moral = limitar(s.moral + entero(-4, 4));
  s.fama = limitar(s.fama - (etapa === 'veterano' ? 2 : 0));
  if (estado.flags.entrenaFuerte) s.poder = limitar(s.poder + 1);

  // Los Pokémon crecen contigo
  for (const p of estado.equipo) {
    if (p.retirado) continue;
    p.vinculo = limitar(p.vinculo + entero(1, 4) + (estado.estilo === 'criador' ? 2 : 0));
    if (p.lesionado && dado(0.5)) p.lesionado = false;
  }
  const evolucionados = evolucionar(estado);

  // Red de seguridad: nunca te quedas sin equipo (el juego no puede seguir sin Pokémon)
  const rescate = [];
  if (!estado.equipo.some(p => !p.retirado)) {
    const p = capturaAleatoria(estado);
    if (p) rescate.push(`Sin equipo y sin excusas: el Centro Pokémon te cede un ${p.nombre} para poder seguir compitiendo.`);
  } else if (estado.equipo.filter(p => !p.retirado).length < 6 && dado(0.42)) {
    // Vas ampliando plantilla con los años, como cualquier entrenador
    const p = capturaAleatoria(estado, { rarezaMin: estado.stats.fama > 45 && dado(0.3) ? 'raro' : 'comun' });
    if (p) rescate.push(`Se une ${p.nombre} al equipo.`);
  }

  // Rendimiento de la temporada
  const pe = poderEquipo(estado);
  const forma = pe * 0.55 + s.estrategia * 0.22 + s.poder * 0.13 + (s.salud * 0.06) + (s.moral * 0.04);
  const suerte = azar(-12, 12);
  let rendimiento = forma + suerte - (estado.flags.sancionado ? 30 : 0) - (estado.flags.lesionado ? 15 : 0);

  // El rival también progresa
  const r = estado.rival;
  if (r.activo) r.poder = limitar(r.poder + entero(3, 7));

  const partidos = entero(14, 26);
  const ratio = limitar((rendimiento - 20) / 70, 0.08, 0.94);
  const g = Math.round(partidos * ratio);
  estado.victorias += g; estado.derrotas += partidos - g;

  // Premios y dinero
  const bolsa = Math.round(rendimiento * (etapa === 'novato' ? 20 : etapa === 'gimnasios' ? 60 : etapa === 'liga' ? 140 : 400));
  estado.dinero += bolsa + (estado.flags.patrocinio ? 12000 : 0);

  const linea = { año: estado.año, edad: estado.edad, etapa, sucesos: [] };
  linea.sucesos.push(`Temporada cerrada con ${g}-${partidos - g}.`);
  rescate.forEach(t => linea.sucesos.push(t));
  if (evolucionados.length) {
    linea.sucesos.push(`${evolucionados.map(p => p.nombre).join(' y ')} ${evolucionados.length > 1 ? 'evolucionaron' : 'evolucionó'}.`);
  }

  // Resultado del torneo de la etapa
  const torneo = elegir(NOMBRE_TORNEO[etapa]);
  estado.apariciones++;
  if (etapa === 'gimnasios' && estado.medallas < 8) {
    const nuevas = Math.min(8 - estado.medallas, Math.max(0, Math.round((rendimiento - 25) / 12)));
    estado.medallas += nuevas;
    linea.sucesos.push(nuevas ? `Consigues ${nuevas} medalla${nuevas > 1 ? 's' : ''} (${estado.medallas}/8).` : 'Ni una sola medalla este año. Duro.');
    if (estado.medallas === 8 && !estado.flags.ochoMedallas) {
      estado.flags.ochoMedallas = true;
      hito(estado, '🎖️', `Las 8 medallas de ${estado.regionNombre}`);
      s.fama = limitar(s.fama + 10);
    }
  } else if (rendimiento > 82 && (etapa === 'liga' || etapa === 'pro' || etapa === 'cima' || etapa === 'veterano')) {
    const titulo = etapa === 'cima' ? 'Campeonato Mundial' : `${torneo} de ${estado.regionNombre}`;
    estado.titulos.push({ año: estado.año, nombre: titulo });
    if (etapa === 'cima') estado.mundiales++; else estado.ligasGanadas++;
    s.fama = limitar(s.fama + 14); s.moral = limitar(s.moral + 12);
    linea.sucesos.push(`🏆 ¡GANAS ${titulo.toUpperCase()}!`);
    hito(estado, '🏆', `${titulo} (año ${estado.año})`);
    if (etapa !== 'cima' && !estado.flags.leyendaViva && estado.titulos.length >= 1 && estado.edad >= 17) estado.flags.campeonRegional = true;
  } else if (rendimiento > 68) {
    linea.sucesos.push(`Finalista en ${torneo}. Tan cerca.`);
    s.fama = limitar(s.fama + 6);
  } else if (rendimiento > 48) {
    linea.sucesos.push(`Cuartos de final en ${torneo}.`);
    s.fama = limitar(s.fama + 3);
  } else {
    linea.sucesos.push(`Eliminado pronto en ${torneo}.`);
    s.moral = limitar(s.moral - 5);
  }

  // Duelo con el rival (no todos los años)
  if (r.activo && dado(0.45)) {
    const tuyo = pe + s.estrategia * 0.3 + azar(-10, 10);
    const suyo = r.poder + azar(-10, 14);
    if (tuyo >= suyo) {
      r.derrotasTuyas++; s.moral = limitar(s.moral + 8); s.fama = limitar(s.fama + 3);
      linea.sucesos.push(`Vences a ${r.nombre} otra vez. Se marcha sin mirarte.`);
    } else {
      r.victoriasSuyas++; s.moral = limitar(s.moral - 7);
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

// ── Retiro ───────────────────────────────────────────────────────────────────
export function debeRetirarse(estado) {
  if (estado.retirado) return false;
  if (estado.edad >= 34) return 'edad';
  if (estado.stats.salud <= 12) return 'salud';
  if (estado.stats.moral <= 8) return 'moral';
  if (estado.edad >= 29 && estado.stats.fama < 18 && dado(0.35)) return 'olvido';
  return false;
}

export function retirar(estado, causa) {
  estado.retirado = true;
  estado.causaRetiro = causa;
}

// ── Puntuación final ─────────────────────────────────────────────────────────
export function legado(estado) {
  const s = estado.stats;
  let pts = 0;
  pts += estado.mundiales * 190;
  pts += estado.ligasGanadas * 95;
  pts += estado.medallas * 9;
  pts += s.fama * 2.2;
  pts += poderEquipo(estado) * 2.0;
  pts += estado.victorias * 0.7;
  pts += estado.equipo.filter(p => PORLINEA[p.linea].rareza === 'legendario').length * 45;
  pts += estado.hitos.length * 6;
  pts += Math.min(estado.dinero / 4000, 45);
  pts += (s.vinculo - 40) * 0.9;
  if (estado.flags.dopaje) pts -= 90;
  if (estado.flags.exsancionado) pts -= 55;
  if (estado.flags.traicion) pts -= 40;
  if (estado.flags.heroe) pts += 60;
  if (estado.flags.leyendaViva) pts += 70;
  pts -= estado.derrotas * 0.18;
  return Math.round(pts);
}

export function rangoDe(pts) {
  return RANGOS.find(r => pts >= r.min) ?? RANGOS[RANGOS.length - 1];
}

export function apodoDe(estado) {
  if (estado.apodo) return estado.apodo;
  estado.apodo = elegir(APODOS_PRENSA);
  return estado.apodo;
}
