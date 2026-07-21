// Pronunciación con la Web Speech API (voz japonesa del navegador).
let vozJa = null;

function elegirVoz() {
  const voces = speechSynthesis.getVoices();
  vozJa = voces.find(v => v.lang === 'ja-JP') || voces.find(v => v.lang.startsWith('ja')) || null;
}

if ('speechSynthesis' in window) {
  elegirVoz();
  speechSynthesis.onvoiceschanged = elegirVoz;
}

export function hablar(texto) {
  if (!('speechSynthesis' in window) || !texto) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = 'ja-JP';
  if (vozJa) u.voice = vozJa;
  u.rate = 0.9;
  speechSynthesis.speak(u);
}

export function hayVozJaponesa() {
  return vozJa !== null;
}
