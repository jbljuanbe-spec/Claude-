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

// Modos de juego: filtran /discover/movie por productora o género de TMDb.
const MODOS = {
  todas: { nombre: 'Todas', params: {} },
  disney: { nombre: 'Disney', params: { with_companies: 2 } },
  pixar: { nombre: 'Pixar', params: { with_companies: 3 } },
  marvel: { nombre: 'Marvel', params: { with_companies: 420 } },
  ghibli: { nombre: 'Studio Ghibli', params: { with_companies: 10342 } },
  animacion: { nombre: 'Animación', params: { with_genres: 16 } },
  terror: { nombre: 'Terror', params: { with_genres: 27 } },
};

// Bolsa de películas reconocibles del modo elegido (varias páginas de /discover/movie).
async function fetchMoviePool(modoKey, pages = 6) {
  const modo = MODOS[modoKey] || MODOS.todas;
  const base = { sort_by: 'popularity.desc', 'vote_count.gte': 20, include_adult: 'false', ...modo.params };

  const primera = await tmdbGet('/discover/movie', { ...base, page: 1 });
  const totalPaginas = Math.min(primera.total_pages || 1, pages);
  const peticiones = [];
  for (let p = 2; p <= totalPaginas; p++) peticiones.push(tmdbGet('/discover/movie', { ...base, page: p }));
  const paginas = [primera, ...(await Promise.all(peticiones))];

  const vistas = new Set();
  const peliculas = [];
  for (const r of paginas) {
    for (const m of r.results) {
      if (vistas.has(m.id) || !m.backdrop_path) continue;
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
