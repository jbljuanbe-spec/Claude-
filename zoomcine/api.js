// Wrapper mínimo sobre la API de TMDb (gratuita, no comercial).
// TMDb limita por IP, no por clave, así que no hay riesgo de facturación
// por tenerla aquí: https://developer.themoviedb.org/docs/faq
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';
const API_KEY = '9a2005ef801e3132fc8c51b6ce5a6161';

async function tmdbGet(path, params = {}) {
  const url = new URL(TMDB_BASE + path);
  url.searchParams.set('api_key', API_KEY);
  url.searchParams.set('language', 'es-ES');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDb ${res.status}`);
  return res.json();
}

// Bolsa de películas populares y reconocibles (varias páginas de /movie/popular).
async function fetchPopularPool(pages = 8) {
  const peticiones = [];
  for (let p = 1; p <= pages; p++) peticiones.push(tmdbGet('/movie/popular', { page: p }));
  const resultados = await Promise.all(peticiones);
  const vistas = new Set();
  const peliculas = [];
  for (const r of resultados) {
    for (const m of r.results) {
      if (vistas.has(m.id) || !m.backdrop_path || m.vote_count < 300) continue;
      vistas.add(m.id);
      peliculas.push(m);
    }
  }
  return peliculas;
}

// Backdrop sin texto/logo (include_image_language=null) y en buena resolución.
async function fetchBackdrop(movieId) {
  const data = await tmdbGet(`/movie/${movieId}/images`, { include_image_language: 'null' });
  let candidatos = (data.backdrops || []).filter(b => b.width >= 1280);
  if (!candidatos.length) candidatos = data.backdrops || [];
  if (!candidatos.length) return null;
  const elegido = candidatos[Math.floor(Math.random() * candidatos.length)];
  return `${IMG_BASE}/original${elegido.file_path}`;
}

async function searchMovies(query) {
  if (!query.trim()) return [];
  const data = await tmdbGet('/search/movie', { query, include_adult: 'false' });
  return (data.results || []).slice(0, 6);
}
