// Niveles de viajero, tiers de dominio y re-exportación de la geografía del
// curriculum (ciudades › hitos). La estructura del viaje vive en curriculum.js.

export { ciudadDeLeccion, hitoDeLeccion, ciudadDeCodigo, hitosRequeridos, CIUDADES, CIUDADES_FUTURAS } from './curriculum.js';

// Niveles de viajero: el XP solo sube, nunca baja.
export const NIVELES = [
  { nivel: 1, titulo: 'Recién llegado', kanji: '新人' },
  { nivel: 2, titulo: 'Aprendiz', kanji: '見習い' },
  { nivel: 3, titulo: 'Estudiante', kanji: '学生' },
  { nivel: 4, titulo: 'Viajero', kanji: '旅人' },
  { nivel: 5, titulo: 'Explorador', kanji: '探検家' },
  { nivel: 6, titulo: 'Artesano de las palabras', kanji: '職人' },
  { nivel: 7, titulo: 'Senpai', kanji: '先輩' },
  { nivel: 8, titulo: 'Experto', kanji: '達人' },
  { nivel: 9, titulo: 'Sabio', kanji: '賢者' },
  { nivel: 10, titulo: 'Maestro', kanji: '名人' }
];

export function xpParaNivel(n) {
  return 60 * n * (n - 1); // nivel 2: 120 XP, nivel 3: 360, nivel 4: 720...
}

export function nivelDeXp(xp) {
  let n = 1;
  while (n < NIVELES.length && xp >= xpParaNivel(n + 1)) n++;
  const info = NIVELES[Math.min(n, NIVELES.length) - 1];
  const base = xpParaNivel(n);
  const siguiente = n < NIVELES.length ? xpParaNivel(n + 1) : null;
  return {
    nivel: n,
    titulo: info.titulo,
    kanji: info.kanji,
    xp,
    haciaSiguiente: siguiente ? (xp - base) / (siguiente - base) : 1,
    xpSiguiente: siguiente
  };
}

// Tiers de dominio de un hito (según retención real de sus tarjetas). Son una
// capa extra sobre la insignia de conquista: bronce al arrancar, plata/oro por
// tarjetas dominadas (intervalos de semanas), no por un examen puntual.
export const TIERS = [
  { id: 'bronce', nombre: 'Bronce', icono: '🥉', descripcion: 'En marcha: su contenido está empezado' },
  { id: 'plata', nombre: 'Plata', icono: '🥈', descripcion: 'Dominio sostenido en el tiempo' },
  { id: 'oro', nombre: 'Oro', icono: '🥇', descripcion: 'Maestría: todo dominado con retención de semanas' }
];

export function tiersConseguidos(stats) {
  const empezadas = stats.total - stats.nuevas;
  const t = [];
  if (stats.total > 0 && empezadas / stats.total >= 0.6) t.push('bronce');
  if (stats.total > 0 && stats.dominadas / stats.total >= 0.5) t.push('plata');
  if (stats.total > 0 && stats.dominadas === stats.total) t.push('oro');
  return t;
}
