// Geografía de las ciudades del viaje. La ASIGNACIÓN de lecciones a ciudades y
// el nombre del barrio/insignia vienen del JSON (campos ciudad/barrio/emoji por
// lección); aquí solo vive lo que el JSON no trae: posición en el mapa,
// prefectura, región y nivel JLPT de cada ciudad, más un emoji genérico de
// respaldo si una lección nueva no trae el suyo.

export const ORDEN_CIUDADES_DEFAULT = [
  'Tokio', 'Yokohama', 'Kioto', 'Osaka', 'Nara', 'Kanazawa',
  'Hiroshima', 'Fukuoka', 'Sendai', 'Sapporo', 'Naha'
];

export const CIUDAD_GEO = {
  Tokio:     { kanji: '東京', emoji: '🗼', generico: '🏙️', pref: '東京都', region: 'Kantō (関東)', jlpt: 'N5', lat: 35.68, lon: 139.69, dx: 14, dy: 3 },
  Yokohama:  { kanji: '横浜', emoji: '🚢', generico: '⚓', pref: '神奈川県', region: 'Kantō (関東)', jlpt: 'N5', lat: 35.44, lon: 139.64, dx: 12, dy: 12 },
  Kioto:     { kanji: '京都', emoji: '⛩️', generico: '🏯', pref: '京都府', region: 'Kansai (関西)', jlpt: 'N4', lat: 35.01, lon: 135.77, dx: -16, dy: -6 },
  Osaka:     { kanji: '大阪', emoji: '🐙', generico: '🍢', pref: '大阪府', region: 'Kansai (関西)', jlpt: 'N4', lat: 34.69, lon: 135.50, dx: -14, dy: 8 },
  Nara:      { kanji: '奈良', emoji: '🦌', generico: '🦌', pref: '奈良県', region: 'Kansai (関西)', jlpt: 'N4', lat: 34.69, lon: 135.80, dx: 14, dy: 12 },
  Kanazawa:  { kanji: '金沢', emoji: '🍁', generico: '🍁', pref: '石川県', region: 'Chūbu (中部)', jlpt: 'N4', lat: 36.56, lon: 136.66, dx: 0, dy: -10 },
  Hiroshima: { kanji: '広島', emoji: '🕊️', generico: '🕊️', pref: '広島県', region: 'Chūgoku (中国)', jlpt: 'N3', lat: 34.39, lon: 132.46, dx: 0, dy: -10 },
  Fukuoka:   { kanji: '福岡', emoji: '🍜', generico: '🍜', pref: '福岡県', region: 'Kyūshū (九州)', jlpt: 'N3', lat: 33.59, lon: 130.40, dx: -6, dy: -10 },
  Sendai:    { kanji: '仙台', emoji: '🎋', generico: '🎋', pref: '宮城県', region: 'Tōhoku (東北)', jlpt: 'N3', lat: 38.27, lon: 140.87, dx: 12, dy: 0 },
  Sapporo:   { kanji: '札幌', emoji: '❄️', generico: '❄️', pref: '北海道', region: 'Hokkaidō (北海道)', jlpt: 'N2', lat: 43.06, lon: 141.35, dx: 0, dy: -10 },
  Naha:      { kanji: '那覇', emoji: '🏝️', generico: '🌊', pref: '沖縄県', region: 'Okinawa (沖縄)', jlpt: 'N1', lat: 26.21, lon: 127.68, dx: 0, dy: 14 }
};

// Hito transversal (los matices de la lección "General"): fuera de toda ciudad.
export const FUJI = { nombre: 'Monte Fuji', kanji: '富士山', emoji: '🗻', lat: 35.36, lon: 138.73, dx: 6, dy: 12 };

// Anclas para la curva del mapa (compat con mapa-render.caminoBezier, sin uso
// directo ahora que la vía se traza entre las ciudades reales).
export const ANCLAS = ORDEN_CIUDADES_DEFAULT.map(n => ({ lat: CIUDAD_GEO[n].lat, lon: CIUDAD_GEO[n].lon }));
