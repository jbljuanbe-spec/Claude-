// Conversión romaji -> hiragana y utilidades de normalización/corrección tolerante.

const ROMAJI = {
  kya: 'きゃ', kyu: 'きゅ', kyo: 'きょ', gya: 'ぎゃ', gyu: 'ぎゅ', gyo: 'ぎょ',
  sha: 'しゃ', shu: 'しゅ', sho: 'しょ', sya: 'しゃ', syu: 'しゅ', syo: 'しょ',
  ja: 'じゃ', ju: 'じゅ', jo: 'じょ', jya: 'じゃ', jyu: 'じゅ', jyo: 'じょ',
  cha: 'ちゃ', chu: 'ちゅ', cho: 'ちょ', tya: 'ちゃ', tyu: 'ちゅ', tyo: 'ちょ',
  nya: 'にゃ', nyu: 'にゅ', nyo: 'にょ', hya: 'ひゃ', hyu: 'ひゅ', hyo: 'ひょ',
  bya: 'びゃ', byu: 'びゅ', byo: 'びょ', pya: 'ぴゃ', pyu: 'ぴゅ', pyo: 'ぴょ',
  mya: 'みゃ', myu: 'みゅ', myo: 'みょ', rya: 'りゃ', ryu: 'りゅ', ryo: 'りょ',
  shi: 'し', chi: 'ち', tsu: 'つ', dzu: 'づ',
  ka: 'か', ki: 'き', ku: 'く', ke: 'け', ko: 'こ',
  ga: 'が', gi: 'ぎ', gu: 'ぐ', ge: 'げ', go: 'ご',
  sa: 'さ', si: 'し', su: 'す', se: 'せ', so: 'そ',
  za: 'ざ', zi: 'じ', ji: 'じ', zu: 'ず', ze: 'ぜ', zo: 'ぞ',
  ta: 'た', ti: 'ち', tu: 'つ', te: 'て', to: 'と',
  da: 'だ', di: 'ぢ', du: 'づ', de: 'で', do: 'ど',
  na: 'な', ni: 'に', nu: 'ぬ', ne: 'ね', no: 'の',
  ha: 'は', hi: 'ひ', hu: 'ふ', fu: 'ふ', he: 'へ', ho: 'ほ',
  ba: 'ば', bi: 'び', bu: 'ぶ', be: 'べ', bo: 'ぼ',
  pa: 'ぱ', pi: 'ぴ', pu: 'ぷ', pe: 'ぺ', po: 'ぽ',
  ma: 'ま', mi: 'み', mu: 'む', me: 'め', mo: 'も',
  ya: 'や', yu: 'ゆ', yo: 'よ',
  ra: 'ら', ri: 'り', ru: 'る', re: 'れ', ro: 'ろ',
  wa: 'わ', wo: 'を',
  a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お',
  n: 'ん', '-': 'ー'
};

const CONSONANTES = 'kgsztdnhbpmyrwjfc';

export function romajiAHiragana(texto) {
  let s = texto.toLowerCase().trim();
  let out = '';
  let i = 0;
  while (i < s.length) {
    const resto = s.slice(i);
    // nn -> ん, n antes de consonante (no y) o al final -> ん
    if (resto.startsWith('nn')) { out += 'ん'; i += 2; continue; }
    if (resto[0] === 'n' && (resto.length === 1 || (!'aiueoyn'.includes(resto[1]) && CONSONANTES.includes(resto[1])))) {
      out += 'ん'; i += 1; continue;
    }
    if (resto[0] === "n" && resto[1] === "'") { out += 'ん'; i += 2; continue; }
    // Consonante doble -> っ (kk, tt, pp, ss...)
    if (resto.length >= 2 && resto[0] === resto[1] && CONSONANTES.includes(resto[0]) && resto[0] !== 'n') {
      out += 'っ'; i += 1; continue;
    }
    let emparejado = false;
    for (const largo of [3, 2, 1]) {
      const trozo = resto.slice(0, largo);
      if (ROMAJI[trozo]) { out += ROMAJI[trozo]; i += largo; emparejado = true; break; }
    }
    if (!emparejado) { out += s[i]; i += 1; }
  }
  return out;
}

export function contieneJapones(texto) {
  return /[぀-ヿ㐀-鿿ｦ-ﾟ]/.test(texto);
}

function katakanaAHiragana(texto) {
  return texto.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

// Normaliza japonés para comparar: NFKC, katakana->hiragana, sin espacios ni puntuación.
export function normalizarJp(texto) {
  return katakanaAHiragana(String(texto).normalize('NFKC'))
    .replace(/[\s。、．，,.!?！？・「」『』()（）]/g, '')
    .toLowerCase();
}

// Prepara la respuesta del usuario: si escribió romaji, se convierte a hiragana.
export function respuestaUsuarioJp(texto) {
  const limpio = String(texto).trim();
  if (!limpio) return '';
  return normalizarJp(contieneJapones(limpio) ? limpio : romajiAHiragana(limpio));
}

// Normaliza español: minúsculas, sin acentos ni signos.
export function normalizarEs(texto) {
  return String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[¿?¡!.,;:()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const fila = [i];
    for (let j = 1; j <= n; j++) {
      fila[j] = Math.min(prev[j] + 1, fila[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = fila;
  }
  return prev[n];
}

// ---------- Correctores por tipo de tarjeta ----------

// Vocab es->jp y conjugación: acepta kanji, lectura, alternativas y romaji.
export function comprobarJapones(entrada, candidatos) {
  const usuario = respuestaUsuarioJp(entrada);
  if (!usuario) return false;
  return candidatos.some(c => normalizarJp(c) === usuario);
}

// Vocab jp->es: acepta cualquiera de las variantes del campo "es", con errores leves.
export function comprobarEspanol(entrada, esCampo) {
  const usuario = normalizarEs(entrada);
  if (!usuario) return false;
  const sinParentesis = String(esCampo).replace(/\([^)]*\)/g, '');
  const variantes = sinParentesis.split(/[\/,]/).map(normalizarEs).filter(Boolean);
  return variantes.some(v => {
    if (v === usuario) return true;
    const d = levenshtein(v, usuario);
    if (v.length >= 9) return d <= 2;
    if (v.length >= 5) return d <= 1;
    return d === 0;
  });
}

// Traducción libre: comparación aproximada contra varias respuestas aceptadas.
export function comprobarTraduccion(entrada, respuestas) {
  const usuario = respuestaUsuarioJp(entrada);
  if (!usuario) return false;
  return respuestas.some(r => {
    const objetivo = normalizarJp(r);
    if (objetivo === usuario) return true;
    const d = levenshtein(objetivo, usuario);
    return d <= Math.max(1, Math.floor(objetivo.length * 0.15));
  });
}
