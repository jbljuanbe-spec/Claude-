// Reconocimiento de voz con la Web Speech API: el usuario habla en japonés y el
// navegador transcribe lo dicho para poder corregirlo. No sale nada a terceros
// más allá de lo que haga el propio navegador (Chrome usa su motor de voz).
const R = window.SpeechRecognition || window.webkitSpeechRecognition;

export function hayReconocimiento() { return !!R; }

// Arranca la escucha. Devuelve un mando con parar(). Los callbacks reciben el
// texto parcial (mientras hablas) y el final (al terminar).
export function escuchar({ onParcial, onFinal, onError, onFin, lang = 'ja-JP' } = {}) {
  if (!R) { onError && onError('no-soportado'); return { parar() {} }; }
  const rec = new R();
  rec.lang = lang;
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  let acumulado = '';
  rec.onresult = e => {
    let parcial = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      if (res.isFinal) acumulado += res[0].transcript;
      else parcial += res[0].transcript;
    }
    if (parcial && onParcial) onParcial(parcial);
    if (acumulado && onFinal) onFinal(acumulado);
  };
  rec.onerror = e => onError && onError(e.error || 'error');
  rec.onend = () => onFin && onFin(acumulado);
  try { rec.start(); } catch { onError && onError('inicio'); }
  return { parar() { try { rec.stop(); } catch { /* ya parado */ } } };
}
