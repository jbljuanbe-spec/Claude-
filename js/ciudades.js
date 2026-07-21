// Mapa de ciudades: cada lección es una ciudad real de Japón con identidad propia
// (capa narrativa, marco RECIPE). Las insignias certifican habilidades reales y,
// una vez ganadas, no se retiran nunca.

export const CIUDADES = {
  L1: {
    nombre: 'Tokio', kanji: '東京', emoji: '🗼', x: 268, y: 200,
    habilidad: 'Sabes saludar, presentarte y decir a qué te dedicas'
  },
  L2: {
    nombre: 'Osaka', kanji: '大阪', emoji: '🛍️', x: 200, y: 253,
    habilidad: 'Sobrevives a una compra: precios, objetos y preguntas'
  },
  L3: {
    nombre: 'Kioto', kanji: '京都', emoji: '⛩️', x: 208, y: 232,
    habilidad: 'Puedes proponer planes: verbos, tiempos y frecuencia'
  },
  L4: {
    nombre: 'Nara', kanji: '奈良', emoji: '🦌', x: 224, y: 262,
    habilidad: 'Describes qué hay a tu alrededor y qué hiciste ayer'
  },
  L5: {
    nombre: 'Naha', kanji: '那覇', emoji: '🏝️', x: 52, y: 428,
    habilidad: 'Opinas sobre lugares y comida con adjetivos bien conjugados'
  },
  L6: {
    nombre: 'Sapporo', kanji: '札幌', emoji: '☕', x: 296, y: 64,
    habilidad: 'Encadenas acciones con la forma て como un local'
  },
  General: {
    nombre: 'Monte Fuji', kanji: '富士山', emoji: '🗻', x: 252, y: 222,
    habilidad: 'Los matices transversales que hacen que suene natural'
  }
};

// Ciudades reservadas para lecciones futuras (se asignan en orden de aparición).
const CIUDADES_FUTURAS = [
  { nombre: 'Yokohama', kanji: '横浜', emoji: '🚢', x: 262, y: 214 },
  { nombre: 'Nagoya', kanji: '名古屋', emoji: '🏯', x: 228, y: 240 },
  { nombre: 'Hiroshima', kanji: '広島', emoji: '🕊️', x: 152, y: 280 },
  { nombre: 'Fukuoka', kanji: '福岡', emoji: '🍜', x: 110, y: 305 },
  { nombre: 'Sendai', kanji: '仙台', emoji: '🎋', x: 288, y: 152 },
  { nombre: 'Kanazawa', kanji: '金沢', emoji: '🍁', x: 222, y: 205 },
  { nombre: 'Kobe', kanji: '神戸', emoji: '⛰️', x: 192, y: 258 },
  { nombre: 'Nagasaki', kanji: '長崎', emoji: '🌉', x: 92, y: 322 }
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
