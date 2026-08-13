// Selector de idioma: es (por defecto) / en / it. Se guarda en el navegador,
// y si nunca se ha elegido, se detecta por el idioma del navegador (para que
// quien te busque desde Italia o EE. UU. lo vea ya en su idioma).
const CLAVE = 'hazteconTodos.idioma';
const IDIOMAS = ['es', 'en', 'it'];

function detectar() {
  try {
    const nav = (navigator.language || navigator.userLanguage || 'es').slice(0, 2).toLowerCase();
    return IDIOMAS.includes(nav) ? nav : 'es';
  } catch { return 'es'; }
}

let actual = null;
export function idioma() {
  if (actual) return actual;
  try {
    const guardado = localStorage.getItem(CLAVE);
    actual = IDIOMAS.includes(guardado) ? guardado : detectar();
  } catch { actual = detectar(); }
  return actual;
}

// Al cambiar de idioma se recarga la página. Motivo: buena parte de los textos
// (títulos de evento, opciones) se resuelven UNA vez, al cargar el módulo, así
// que repintar no bastaría para traducirlos. La carrera en curso está guardada
// en el navegador, de modo que no se pierde nada al recargar.
export function fijarIdioma(id) {
  if (!IDIOMAS.includes(id)) return;
  actual = id;
  try { localStorage.setItem(CLAVE, id); } catch { /* da igual */ }
  document.documentElement.lang = id;
  location.reload();
}

// L(es, en, it): elige el texto según el idioma activo. Si falta la traducción
// en inglés o italiano, cae en español antes que dejar un hueco en blanco.
export function L(es, en, it) {
  const idi = idioma();
  if (idi === 'en') return en ?? es;
  if (idi === 'it') return it ?? es;
  return es;
}

// Números y dinero: coma en español, punto en inglés/italiano.
export function numLocale() { return idioma() === 'es' ? 'es' : idioma() === 'it' ? 'it' : 'en'; }
