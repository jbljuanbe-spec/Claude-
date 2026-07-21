// Hoja de ruta jerárquica: Región › Prefectura › Ciudad › Hito (lección).
//
// - Cada LECCIÓN es un "hito" dentro de una ciudad: una estación, un barrio,
//   una comida o un festival típico. Superar sus ejercicios da una INSIGNIA
//   LOCAL (logro tipo videojuego), consultable en el Perfil.
// - Un PAQUETE de lecciones forma una CIUDAD: cuando todos sus hitos están
//   superados, la ciudad queda conquistada (insignia de ciudad).
// - Las ciudades se agrupan en prefecturas y regiones.
// - Las ciudades sin contenido todavía se muestran en gris ("Próximamente").

// Ciudad real de la primera etapa: sus hitos son las lecciones L1-L6 (+ General
// como hito transversal, opcional para conquistar la ciudad). Los hitos usan
// lugares reales de Tokio que encajan con la habilidad de cada lección.
export const CIUDADES = [
  {
    id: 'tokio', nombre: 'Tokio', kanji: '東京', emoji: '🗼',
    prefectura: 'Tokio', pref: '東京都', region: 'Kantō (関東)', jlpt: 'N5',
    lat: 35.68, lon: 139.69, dxEtiqueta: 14, dyEtiqueta: 3,
    lema: 'Tu llegada a Japón. Aquí das tus primeros pasos.',
    hitos: [
      { codigo: 'L1', nombre: 'Estación de Tokio', kanji: '東京駅', emoji: '🚉', tipo: 'estación',
        insignia: 'Estación de Tokio', logro: 'Llegaste a Japón: sabes saludar, presentarte y decir a qué te dedicas' },
      { codigo: 'L2', nombre: 'Mercado de Ameyoko', kanji: 'アメ横', emoji: '🛍️', tipo: 'barrio',
        insignia: 'Regateo en Ameyoko', logro: 'Sobreviviste a tu primera compra: precios, objetos y preguntas' },
      { codigo: 'L3', nombre: 'Cruce de Shibuya', kanji: '渋谷', emoji: '🚦', tipo: 'barrio',
        insignia: 'Cita en Hachikō', logro: 'Quedaste con alguien: verbos, horas y frecuencia' },
      { codigo: 'L4', nombre: 'Parque de Ueno', kanji: '上野公園', emoji: '🌸', tipo: 'parque',
        insignia: 'Hanami en Ueno', logro: 'Tu primera cita bajo los cerezos: describes lo que hay y lo que hiciste' },
      { codigo: 'L5', nombre: 'Mercado de Tsukiji', kanji: '築地', emoji: '🍣', tipo: 'comida',
        insignia: 'Sibarita de Tsukiji', logro: 'Opinas sobre lugares y comida con adjetivos bien conjugados' },
      { codigo: 'L6', nombre: 'Templo Sensō-ji', kanji: '浅草寺', emoji: '⛩️', tipo: 'festival',
        insignia: 'Amanecer en Asakusa', logro: 'Encadenas un día entero de acciones con la forma て' },
      { codigo: 'General', nombre: 'Monte Fuji', kanji: '富士山', emoji: '🗻', tipo: 'transversal', bonus: true,
        insignia: 'Vistas del Fuji', logro: 'Dominas los matices transversales que hacen que todo suene natural' }
    ]
  }
];

// Ciudades futuras (aún sin contenido): se dibujan en gris como "Próximamente"
// para que se vea la escala del viaje. Al añadir lecciones nuevas del chat, se
// irán convirtiendo en ciudades reales con sus hitos.
export const CIUDADES_FUTURAS = [
  { id: 'yokohama', nombre: 'Yokohama', kanji: '横浜', emoji: '🚢', prefectura: 'Kanagawa', pref: '神奈川県', region: 'Kantō (関東)', jlpt: 'N5', lat: 35.44, lon: 139.64, dxEtiqueta: 12, dyEtiqueta: 12 },
  { id: 'kioto', nombre: 'Kioto', kanji: '京都', emoji: '⛩️', prefectura: 'Kioto', pref: '京都府', region: 'Kansai (関西)', jlpt: 'N4', lat: 35.01, lon: 135.77, dxEtiqueta: -16, dyEtiqueta: -6 },
  { id: 'osaka', nombre: 'Osaka', kanji: '大阪', emoji: '🐙', prefectura: 'Osaka', pref: '大阪府', region: 'Kansai (関西)', jlpt: 'N4', lat: 34.69, lon: 135.50, dxEtiqueta: -14, dyEtiqueta: 8 },
  { id: 'nara', nombre: 'Nara', kanji: '奈良', emoji: '🦌', prefectura: 'Nara', pref: '奈良県', region: 'Kansai (関西)', jlpt: 'N4', lat: 34.69, lon: 135.80, dxEtiqueta: 14, dyEtiqueta: 12 },
  { id: 'kanazawa', nombre: 'Kanazawa', kanji: '金沢', emoji: '🍁', prefectura: 'Ishikawa', pref: '石川県', region: 'Chūbu (中部)', jlpt: 'N4', lat: 36.56, lon: 136.66, dxEtiqueta: 0, dyEtiqueta: -10 },
  { id: 'hiroshima', nombre: 'Hiroshima', kanji: '広島', emoji: '🕊️', prefectura: 'Hiroshima', pref: '広島県', region: 'Chūgoku (中国)', jlpt: 'N3', lat: 34.39, lon: 132.46, dxEtiqueta: 0, dyEtiqueta: -10 },
  { id: 'fukuoka', nombre: 'Fukuoka', kanji: '福岡', emoji: '🍜', prefectura: 'Fukuoka', pref: '福岡県', region: 'Kyūshū (九州)', jlpt: 'N3', lat: 33.59, lon: 130.40, dxEtiqueta: -6, dyEtiqueta: -10 },
  { id: 'sendai', nombre: 'Sendai', kanji: '仙台', emoji: '🎋', prefectura: 'Miyagi', pref: '宮城県', region: 'Tōhoku (東北)', jlpt: 'N3', lat: 38.27, lon: 140.87, dxEtiqueta: 12, dyEtiqueta: 0 },
  { id: 'sapporo', nombre: 'Sapporo', kanji: '札幌', emoji: '❄️', prefectura: 'Hokkaidō', pref: '北海道', region: 'Hokkaidō (北海道)', jlpt: 'N2', lat: 43.06, lon: 141.35, dxEtiqueta: 0, dyEtiqueta: -10 },
  { id: 'naha', nombre: 'Naha', kanji: '那覇', emoji: '🏝️', prefectura: 'Okinawa', pref: '沖縄県', region: 'Okinawa (沖縄)', jlpt: 'N1', lat: 26.21, lon: 127.68, dxEtiqueta: 0, dyEtiqueta: 14 }
];

// Hitos madre (anchor waypoints): 11 puntos fijos por los que pasa la vía
// principal del tren. La curva se traza entre ellos y las estaciones (lecciones)
// se reparten AUTOMÁTICAMENTE a lo largo de la curva por interpolación, así que
// el mapa crece solo al añadir lecciones sin tocar coordenadas. La ruta baja por
// el Pacífico hasta Kyūshū y sube por la costa del Mar de Japón hasta Hokkaidō.
export const ANCLAS = [
  { lat: 35.68, lon: 139.69, region: 'Kantō' },      // Tokio (inicio)
  { lat: 35.18, lon: 136.91 },                        // Nagoya
  { lat: 35.01, lon: 135.77, region: 'Kansai' },      // Kioto
  { lat: 34.69, lon: 135.50 },                        // Osaka
  { lat: 34.39, lon: 132.46, region: 'Chūgoku' },     // Hiroshima
  { lat: 33.59, lon: 130.40, region: 'Kyūshū' },      // Fukuoka (extremo suroeste)
  { lat: 35.47, lon: 133.05 },                        // Matsue (subida por el Mar de Japón)
  { lat: 36.56, lon: 136.66, region: 'Chūbu' },       // Kanazawa
  { lat: 37.90, lon: 139.02 },                        // Niigata
  { lat: 38.27, lon: 140.87, region: 'Tōhoku' },      // Sendai
  { lat: 43.06, lon: 141.35, region: 'Hokkaidō' }     // Sapporo (extremo norte)
];

// Total de lecciones previstas en todo el curso (para dibujar la escala del
// viaje). El reparto real usa las que existan + un margen, y se recalcula solo.
export const TOTAL_PREVISTO = 300;

// ---------- Índices y helpers ----------
const HITO_POR_CODIGO = {};
for (const ciudad of CIUDADES) {
  for (const hito of ciudad.hitos) HITO_POR_CODIGO[hito.codigo] = { hito, ciudad };
}

export function hitoDeLeccion(codigo) {
  return HITO_POR_CODIGO[codigo] || null;
}

export function ciudadDeCodigo(codigo) {
  const h = HITO_POR_CODIGO[codigo];
  return h ? h.ciudad : null;
}

// Devuelve el hito fusionado con datos de su ciudad (compat con las vistas:
// mantiene nombre/kanji/emoji/lat/lon/jlpt/habilidad/dxEtiqueta/dyEtiqueta).
export function ciudadDeLeccion(codigo) {
  const info = HITO_POR_CODIGO[codigo];
  if (info) {
    const { hito, ciudad } = info;
    return {
      nombre: hito.nombre, kanji: hito.kanji, emoji: hito.emoji, tipo: hito.tipo,
      insignia: hito.insignia, logro: hito.logro, habilidad: hito.logro, bonus: !!hito.bonus,
      jlpt: ciudad.jlpt, lat: ciudad.lat, lon: ciudad.lon,
      dxEtiqueta: ciudad.dxEtiqueta, dyEtiqueta: ciudad.dyEtiqueta,
      ciudadId: ciudad.id, ciudadNombre: ciudad.nombre, ciudadKanji: ciudad.kanji,
      ciudadEmoji: ciudad.emoji, prefectura: ciudad.prefectura, region: ciudad.region
    };
  }
  // Lección sin ciudad asignada todavía (contenido nuevo aún sin mapear).
  return {
    nombre: codigo, kanji: '', emoji: '📍', tipo: 'hito', insignia: codigo,
    logro: 'Nuevo hito por conquistar', habilidad: 'Nuevo hito por conquistar',
    jlpt: 'N5', lat: 35.68, lon: 139.69, dxEtiqueta: 0, dyEtiqueta: 12,
    ciudadId: 'tokio', ciudadNombre: 'Tokio', ciudadKanji: '東京', ciudadEmoji: '🗼',
    prefectura: 'Tokio', region: 'Kantō (関東)'
  };
}

// Códigos de lección requeridos para conquistar una ciudad (excluye los bonus).
export function hitosRequeridos(ciudadId) {
  const ciudad = CIUDADES.find(c => c.id === ciudadId);
  if (!ciudad) return [];
  return ciudad.hitos.filter(h => !h.bonus).map(h => h.codigo);
}
