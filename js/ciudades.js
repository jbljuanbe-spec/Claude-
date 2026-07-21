// Mapa de ciudades: cada lección es una ciudad real de Japón con identidad propia
// (capa narrativa, marco RECIPE). Las insignias certifican habilidades reales y,
// una vez ganadas, no se retiran nunca.

export const CIUDADES = {
  L1: {
    nombre: 'Tokio', kanji: '東京', emoji: '🗼', lat: 35.68, lon: 139.69, jlpt: 'N5', dxEtiqueta: 14, dyEtiqueta: 3,
    habilidad: 'Sabes saludar, presentarte y decir a qué te dedicas'
  },
  L2: {
    nombre: 'Osaka', kanji: '大阪', emoji: '🛍️', lat: 34.69, lon: 135.50, jlpt: 'N5', dxEtiqueta: -14, dyEtiqueta: 8,
    habilidad: 'Sobrevives a una compra: precios, objetos y preguntas'
  },
  L3: {
    nombre: 'Kioto', kanji: '京都', emoji: '⛩️', lat: 35.01, lon: 135.77, jlpt: 'N5', dxEtiqueta: -16, dyEtiqueta: -6,
    habilidad: 'Puedes proponer planes: verbos, tiempos y frecuencia'
  },
  L4: {
    nombre: 'Nara', kanji: '奈良', emoji: '🦌', lat: 34.69, lon: 135.80, jlpt: 'N5', dxEtiqueta: 14, dyEtiqueta: 10,
    habilidad: 'Describes qué hay a tu alrededor y qué hiciste ayer'
  },
  L5: {
    nombre: 'Naha', kanji: '那覇', emoji: '🏝️', lat: 26.21, lon: 127.68, jlpt: 'N5', dxEtiqueta: 0, dyEtiqueta: 14,
    habilidad: 'Opinas sobre lugares y comida con adjetivos bien conjugados'
  },
  L6: {
    nombre: 'Sapporo', kanji: '札幌', emoji: '☕', lat: 43.06, lon: 141.35, jlpt: 'N5', dxEtiqueta: 0, dyEtiqueta: -10,
    habilidad: 'Encadenas acciones con la forma て como un local'
  },
  General: {
    nombre: 'Monte Fuji', kanji: '富士山', emoji: '🗻', lat: 35.36, lon: 138.73, jlpt: 'N5', dxEtiqueta: 6, dyEtiqueta: 12,
    habilidad: 'Los matices transversales que hacen que suene natural'
  }
};

// Ciudades reservadas para lecciones futuras (se asignan en orden de aparición).
const CIUDADES_FUTURAS = [
  { nombre: 'Yokohama', kanji: '横浜', emoji: '🚢', lat: 35.44, lon: 139.64, jlpt: 'N4', dxEtiqueta: 10, dyEtiqueta: 12 },
  { nombre: 'Nagoya', kanji: '名古屋', emoji: '🏯', lat: 35.18, lon: 136.91, jlpt: 'N4', dxEtiqueta: 0, dyEtiqueta: 13 },
  { nombre: 'Hiroshima', kanji: '広島', emoji: '🕊️', lat: 34.39, lon: 132.46, jlpt: 'N4', dxEtiqueta: 0, dyEtiqueta: -10 },
  { nombre: 'Fukuoka', kanji: '福岡', emoji: '🍜', lat: 33.59, lon: 130.40, jlpt: 'N4', dxEtiqueta: -6, dyEtiqueta: -10 },
  { nombre: 'Sendai', kanji: '仙台', emoji: '🎋', lat: 38.27, lon: 140.87, jlpt: 'N4', dxEtiqueta: 12, dyEtiqueta: 0 },
  { nombre: 'Kanazawa', kanji: '金沢', emoji: '🍁', lat: 36.56, lon: 136.66, jlpt: 'N3', dxEtiqueta: 0, dyEtiqueta: -10 },
  { nombre: 'Kobe', kanji: '神戸', emoji: '⛰️', lat: 34.69, lon: 135.19, jlpt: 'N3', dxEtiqueta: -14, dyEtiqueta: 0 },
  { nombre: 'Nagasaki', kanji: '長崎', emoji: '🌉', lat: 32.75, lon: 129.87, jlpt: 'N3', dxEtiqueta: -8, dyEtiqueta: 10 }
];

export function ciudadDeLeccion(codigo, indiceExtra = 0) {
  if (CIUDADES[codigo]) return CIUDADES[codigo];
  const extra = CIUDADES_FUTURAS[indiceExtra % CIUDADES_FUTURAS.length];
  return { ...extra, habilidad: 'Nuevas habilidades por conquistar' };
}

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

// Umbrales de insignia por ciudad. La plata y el oro certifican retención real
// (tarjetas dominadas = intervalos de semanas), no un examen puntual.
export const TIERS = [
  { id: 'bronce', nombre: 'Bronce', icono: '🥉', descripcion: 'Ciudad visitada: su contenido está en marcha' },
  { id: 'plata', nombre: 'Plata', icono: '🥈', descripcion: 'Ciudad conquistada: dominio sostenido en el tiempo' },
  { id: 'oro', nombre: 'Oro', icono: '🥇', descripcion: 'Maestría: todo su contenido dominado con retención de semanas' }
];

export function tiersConseguidos(stats) {
  const empezadas = stats.total - stats.nuevas;
  const t = [];
  if (stats.total > 0 && empezadas / stats.total >= 0.6) t.push('bronce');
  if (stats.total > 0 && stats.dominadas / stats.total >= 0.5) t.push('plata');
  if (stats.total > 0 && stats.dominadas === stats.total) t.push('oro');
  return t;
}
