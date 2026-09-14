// Wrapper mínimo sobre la API de TMDb (gratuita). La clave la introduce
// cada usuario y se guarda solo en localStorage: nunca va en el código.
const TMDB_BASE = 'https://api.themoviedb.org/3';
export const IMG_BASE = 'https://image.tmdb.org/t/p';

const KEY_STORAGE = 'zoomcine_tmdb_key';

export function getApiKey() {
  return localStorage.getItem(KEY_STORAGE) || '';
}

export function setApiKey(key) {
  localStorage.setItem(KEY_STORAGE, key.trim());
}

async function tmdbGet(path, params = {}) {
  const url = new URL(TMDB_BASE + path);
  url.searchParams.set('api_key', getApiKey());
  url.searchParams.set('language', 'es-ES');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDb ${res.status}`);
  return res.json();
}

export async function checkApiKey(key) {
  const url = new URL(TMDB_BASE + '/configuration');
  url.searchParams.set('api_key', key.trim());
  const res = await fetch(url);
  return res.ok;
}

// Bolsa de películas populares y reconocibles (varias páginas de /movie/popular).
export async function fetchPopularPool(pages = 8) {
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
export async function fetchBackdrop(movieId) {
  const data = await tmdbGet(`/movie/${movieId}/images`, { include_image_language: 'null' });
  let candidatos = (data.backdrops || []).filter(b => b.width >= 1280);
  if (!candidatos.length) candidatos = data.backdrops || [];
  if (!candidatos.length) return null;
  const elegido = candidatos[Math.floor(Math.random() * candidatos.length)];
  return `${IMG_BASE}/original${elegido.file_path}`;
}

export async function searchMovies(query) {
  if (!query.trim()) return [];
  const data = await tmdbGet('/search/movie', { query, include_adult: 'false' });
  return (data.results || []).slice(0, 6);
}
