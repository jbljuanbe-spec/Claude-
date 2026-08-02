// Pronunciación japonesa. Dos motores, con el mismo interfaz de siempre:
//
//   1. Audio pre-generado con VOICEVOX (data/audio/*.mp3). Es voz neuronal
//      japonesa de verdad, con entonación y acento tonal correctos, así que
//      suena mucho más natural que la voz del sistema. Cubre todo el material
//      fijo de la app (vocabulario, frases de ejercicios, lecturas de kanji).
//   2. Web Speech API, como hasta ahora, para cualquier texto que no tenga
//      audio pre-generado y como red de seguridad si el mp3 falla.
//
// El manifiesto se carga una sola vez al arrancar, así que hablar() sigue
// siendo síncrona: eso es importante porque en iOS reproducir audio requiere
// estar dentro del gesto del usuario, y un await intermedio lo rompería.
//
// Voz: VOICEVOX:四国めたん (ver tools/generar_audio.py y el crédito en la app).

let vozJa = null;

// Orden de preferencia: las voces japonesas de calidad que suelen traer los
// sistemas. Antes se cogía la primera ja-JP que apareciera, que en algunos
// navegadores es una voz local bastante pobre.
const VOCES_PREFERIDAS = [
  'google 日本語', 'google japanese',
  'kyoko', 'otoya', 'o-ren',
  'nanami', 'ayumi', 'haruka', 'ichiro', 'sayaka'
];

function elegirVoz() {
  const voces = speechSynthesis.getVoices().filter(v => (v.lang || '').toLowerCase().startsWith('ja'));
  if (!voces.length) { vozJa = null; return; }
  for (const preferida of VOCES_PREFERIDAS) {
    const v = voces.find(x => (x.name || '').toLowerCase().includes(preferida));
    if (v) { vozJa = v; return; }
  }
  // Si no reconocemos ninguna, mejor una remota (suelen ser neuronales) que
  // una local sintetizada por formantes.
  vozJa = voces.find(v => !v.localService) || voces[0];
}

if ('speechSynthesis' in window) {
  elegirVoz();
  speechSynthesis.onvoiceschanged = elegirVoz;
}

// ---------- Audio pre-generado ----------
const BASE_AUDIO = 'data/audio/';
let archivos = null;          // texto -> ruta relativa del mp3
let audioActual = null;
let creditoVoz = '';

const manifiestoListo = fetch(`${BASE_AUDIO}manifest.json`)
  .then(r => (r.ok ? r.json() : null))
  .then(d => {
    if (d && d.archivos) { archivos = d.archivos; creditoVoz = d.credito || ''; }
  })
  .catch(() => { /* sin manifiesto seguimos con la voz del navegador */ });

function normalizar(texto) {
  return String(texto == null ? '' : texto).trim();
}

/** Ruta del mp3 de un texto, o null si no hay audio pre-generado. */
export function rutaAudio(texto) {
  const t = normalizar(texto);
  if (!t || !archivos) return null;
  const rel = archivos[t];
  return rel ? BASE_AUDIO + rel : null;
}

/** ¿Este texto se puede reproducir con la voz buena? */
export function tieneAudioPropio(texto) {
  return rutaAudio(texto) !== null;
}

/** Promesa que se resuelve cuando el manifiesto está cargado (o ha fallado). */
export function audioPreparado() {
  return manifiestoListo;
}

/** Nombre/crédito de la voz pre-generada, para mostrarlo donde toque. */
export function creditoAudio() {
  return creditoVoz;
}

function pararTodo() {
  if (audioActual) {
    audioActual.pause();
    audioActual.onended = null;
    audioActual.onerror = null;
    audioActual = null;
  }
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

function hablarConNavegador(texto, { velocidad = 0.9, alTerminar } = {}) {
  if (!('speechSynthesis' in window) || !texto) { alTerminar?.(); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = 'ja-JP';
  if (vozJa) u.voice = vozJa;
  u.rate = velocidad;
  if (alTerminar) { u.onend = alTerminar; u.onerror = alTerminar; }
  speechSynthesis.speak(u);
}

/**
 * Pronuncia un texto en japonés. Usa el audio de VOICEVOX si existe y, si no,
 * la voz del navegador. Mantiene la firma de siempre: hablar(texto).
 *
 * opciones.velocidad  1 = normal (se aplica a los dos motores)
 * opciones.alTerminar callback al acabar (o al fallar)
 */
export function hablar(texto, opciones = {}) {
  const t = normalizar(texto);
  if (!t) return;
  const { velocidad = 0.9, alTerminar } = opciones;
  pararTodo();

  const url = rutaAudio(t);
  if (!url) { hablarConNavegador(t, { velocidad, alTerminar }); return; }

  const audio = new Audio(url);
  // El audio se generó a ritmo natural; 0.9 era el ritmo que ya usaba la app
  // con la voz del sistema, así que se mantiene la misma sensación.
  audio.playbackRate = velocidad;
  audio.preservesPitch = true;
  audioActual = audio;
  audio.onended = () => { if (audioActual === audio) audioActual = null; alTerminar?.(); };
  audio.onerror = () => {
    // mp3 ausente o corrupto: no dejamos al usuario sin audio.
    if (audioActual === audio) audioActual = null;
    hablarConNavegador(t, { velocidad, alTerminar });
  };
  const p = audio.play();
  if (p && p.catch) p.catch(() => {
    if (audioActual === audio) audioActual = null;
    hablarConNavegador(t, { velocidad, alTerminar });
  });
}

/** Corta cualquier reproducción en curso (audio o voz del navegador). */
export function callar() {
  pararTodo();
}

export function hayVozJaponesa() {
  return vozJa !== null || archivos !== null;
}
