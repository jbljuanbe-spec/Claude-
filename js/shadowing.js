// 🗣️ Shadowing frase por frase. Entrena la producción oral con las frases
// cortas que ya existen en la app, sin APIs de pago.
//
// - crearReproductor(): motor de audio MODULAR. Usa la Web Speech API
//   (speechSynthesis, ja-JP) por defecto; si una frase trae `audio` (URL/.mp3)
//   reproduce ese archivo nativo en su lugar. Mismo interfaz para ambos.
// - crearShadowing(cont, frases, opts): componente reutilizable con modos
//   (pausa automática / bucle), velocidad, atajos y UI.
// - vistaShadowing(): la pestaña, que reúne frases de los ejercicios existentes.
import { api } from './api.js';
import { kanaARomaji, contieneJapones } from './kana.js';

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- Motor de audio modular ----------
let vozJa = null;
function elegirVoz() {
  if (!('speechSynthesis' in window)) return;
  const voces = speechSynthesis.getVoices();
  vozJa = voces.find(v => v.lang === 'ja-JP') || voces.find(v => v.lang && v.lang.startsWith('ja')) || null;
}
if ('speechSynthesis' in window) { elegirVoz(); speechSynthesis.onvoiceschanged = elegirVoz; }

export function haySpeech() { return 'speechSynthesis' in window; }

// Devuelve un reproductor con la misma interfaz reproducir/parar, elija el
// backend que elija. Para migrar a audio nativo basta con dar `frase.audio`.
export function crearReproductor() {
  const audio = new Audio();
  let backend = null; // 'tts' | 'audio'
  return {
    // frase: { ja, audio? }  opts: { rate, onFin }
    reproducir(frase, { rate = 1, onFin } = {}) {
      this.parar();
      if (frase.audio) {
        backend = 'audio';
        audio.src = frase.audio;
        audio.playbackRate = rate;
        audio.currentTime = 0;
        audio.onended = () => onFin && onFin();
        audio.play().catch(() => onFin && onFin());
      } else if ('speechSynthesis' in window) {
        backend = 'tts';
        const u = new SpeechSynthesisUtterance(frase.ja || '');
        u.lang = 'ja-JP';
        u.rate = rate;
        if (vozJa) u.voice = vozJa;
        u.onend = () => onFin && onFin();
        speechSynthesis.speak(u);
      } else if (onFin) { onFin(); }
    },
    parar() {
      if ('speechSynthesis' in window) speechSynthesis.cancel();
      try { audio.pause(); } catch { /* nada */ }
    }
  };
}

// ---------- Componente reutilizable ----------
export function crearShadowing(cont, frases, opts = {}) {
  const rep = crearReproductor();
  const st = {
    idx: 0,
    modo: opts.modo || 'pausa',      // 'pausa' | 'bucle'
    rate: opts.rate || 1,
    verLectura: false,
    tipoLectura: 'kana',             // 'kana' | 'romaji'
    reproduciendo: false,
    gen: 0                           // token para invalidar callbacks al parar
  };

  const frase = () => frases[st.idx];
  function lecturaDe(f) {
    if (!f.kana) return '';
    return st.tipoLectura === 'romaji' ? kanaARomaji(f.kana) : f.kana;
  }

  function reproducir() {
    const g = ++st.gen;
    st.reproduciendo = true;
    pintarEstado();
    rep.reproducir(frase(), {
      rate: st.rate,
      onFin: () => {
        if (g !== st.gen) return;          // se paró o se avanzó: ignora
        if (st.modo === 'bucle') { reproducir(); return; }
        st.reproduciendo = false;
        pintarEstado();
      }
    });
  }
  function parar() { st.gen++; rep.parar(); st.reproduciendo = false; pintarEstado(); }
  function toggleReproducir() { if (st.reproduciendo) parar(); else reproducir(); }
  function siguiente() { st.gen++; rep.parar(); st.reproduciendo = false; st.idx = (st.idx + 1) % frases.length; pintar(); reproducir(); }
  function anterior() { st.gen++; rep.parar(); st.reproduciendo = false; st.idx = (st.idx - 1 + frases.length) % frases.length; pintar(); reproducir(); }
  function repetir() { st.gen++; rep.parar(); reproducir(); }
  function toggleBucle() {
    st.modo = st.modo === 'bucle' ? 'pausa' : 'bucle';
    pintar();
    if (st.modo === 'bucle' && !st.reproduciendo) reproducir(); else pintarEstado();
  }

  function textoEstado() {
    if (st.reproduciendo) return st.modo === 'bucle'
      ? '<span class="sh-punto bucle"></span> Bucle activo'
      : '<span class="sh-punto oye"></span> Escuchando…';
    return '<span class="sh-punto turno"></span> Tu turno de repetir';
  }
  function pintarEstado() {
    const e = cont.querySelector('#sh-estado'); if (e) e.innerHTML = textoEstado();
    const pp = cont.querySelector('#sh-play'); if (pp) pp.textContent = st.reproduciendo ? '⏸' : '▶';
    const bl = cont.querySelector('#sh-bucle'); if (bl) bl.classList.toggle('activo', st.modo === 'bucle');
  }

  function pintar() {
    const f = frase();
    const lect = lecturaDe(f);
    cont.innerHTML = `
      <div class="sh-caja">
        <div class="sh-cab">
          <span class="sh-contador">${st.idx + 1} / ${frases.length}</span>
          <span class="sh-estado" id="sh-estado">${textoEstado()}</span>
        </div>
        <p class="sh-frase" lang="ja">${esc(f.ja)}</p>
        <p class="sh-lectura ${st.verLectura ? '' : 'oculto'}" id="sh-lectura" lang="${st.tipoLectura === 'romaji' ? 'es' : 'ja'}">${esc(lect || 'lectura no disponible')}</p>
        ${f.es ? `<p class="sh-es">${esc(f.es)}</p>` : ''}
        <div class="sh-controles">
          <button class="boton-audio sh-btn" id="sh-anterior" title="Frase anterior">⏮</button>
          <button class="boton-audio sh-btn" id="sh-repetir" title="Repetir desde el inicio (←)">↺</button>
          <button class="boton-audio sh-btn grande" id="sh-play" title="Reproducir / Pausar (Espacio)">${st.reproduciendo ? '⏸' : '▶'}</button>
          <button class="boton-audio sh-btn" id="sh-siguiente" title="Siguiente frase (→)">⏭</button>
          <button class="boton-audio sh-btn sh-bucle ${st.modo === 'bucle' ? 'activo' : ''}" id="sh-bucle" title="Bucle continuo (L)">🔁</button>
        </div>
        <div class="sh-opciones">
          <div class="sh-veloc" role="group" aria-label="Velocidad">
            ${[0.75, 0.85, 1].map(r => `<button class="sh-vel ${st.rate === r ? 'activo' : ''}" data-rate="${r}">${r}x</button>`).join('')}
          </div>
          <label class="sh-check"><input type="checkbox" id="sh-verlectura" ${st.verLectura ? 'checked' : ''}> Lectura</label>
          <div class="sh-lecttipo ${st.verLectura ? '' : 'oculto'}">
            <button class="sh-vel ${st.tipoLectura === 'kana' ? 'activo' : ''}" data-lect="kana">かな</button>
            <button class="sh-vel ${st.tipoLectura === 'romaji' ? 'activo' : ''}" data-lect="romaji">romaji</button>
          </div>
        </div>
        <p class="sh-ayuda">Atajos: <b>Espacio</b> reproducir/pausar · <b>→</b> siguiente · <b>←</b> repetir · <b>L</b> bucle</p>
      </div>`;
    enganchar();
  }

  function enganchar() {
    cont.querySelector('#sh-play').onclick = toggleReproducir;
    cont.querySelector('#sh-siguiente').onclick = siguiente;
    cont.querySelector('#sh-anterior').onclick = anterior;
    cont.querySelector('#sh-repetir').onclick = repetir;
    cont.querySelector('#sh-bucle').onclick = toggleBucle;
    cont.querySelectorAll('.sh-vel[data-rate]').forEach(b => b.onclick = () => {
      st.rate = parseFloat(b.dataset.rate);
      cont.querySelectorAll('.sh-vel[data-rate]').forEach(x => x.classList.toggle('activo', x === b));
      if (st.reproduciendo) reproducir(); // aplica al vuelo
    });
    cont.querySelector('#sh-verlectura').onchange = e => {
      st.verLectura = e.target.checked;
      cont.querySelector('#sh-lectura').classList.toggle('oculto', !st.verLectura);
      cont.querySelector('.sh-lecttipo').classList.toggle('oculto', !st.verLectura);
    };
    cont.querySelectorAll('.sh-vel[data-lect]').forEach(b => b.onclick = () => {
      st.tipoLectura = b.dataset.lect;
      const el = cont.querySelector('#sh-lectura');
      el.textContent = lecturaDe(frase()) || 'lectura no disponible';
      el.setAttribute('lang', st.tipoLectura === 'romaji' ? 'es' : 'ja');
      cont.querySelectorAll('.sh-vel[data-lect]').forEach(x => x.classList.toggle('activo', x === b));
    });
  }

  // Atajos de teclado (se autolimpian al abandonar la vista)
  function teclado(e) {
    if (!document.body.contains(cont)) { document.removeEventListener('keydown', teclado); rep.parar(); return; }
    if (e.target.matches('input, textarea')) return;
    if (e.code === 'Space') { e.preventDefault(); toggleReproducir(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); siguiente(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); repetir(); }
    else if (e.key === 'l' || e.key === 'L') { e.preventDefault(); toggleBucle(); }
  }
  document.addEventListener('keydown', teclado);
  // Para el audio si se cambia de pestaña (hashchange se autolimpia)
  function alSalir() { if (!document.body.contains(cont)) { rep.parar(); window.removeEventListener('hashchange', alSalir); } }
  window.addEventListener('hashchange', alSalir);

  pintar();
  return { destruir() { parar(); document.removeEventListener('keydown', teclado); } };
}

// ---------- Vista/pestaña ----------
function soloKana(s) { return contieneJapones(s) && !/[一-龯]/.test(s); }
function pickKana(respuestas, ja) {
  if (ja && soloKana(ja)) return ja;
  return (respuestas || []).find(soloKana) || '';
}

export async function vistaShadowing(cont) {
  cont.innerHTML = '<p class="vista-sub">Preparando frases...</p>';
  const ej = await api.ejercicios();
  const frases = [];
  const vistas = new Set();
  const add = (ja, kana, es) => {
    ja = (ja || '').trim();
    if (!ja || vistas.has(ja)) return;
    vistas.add(ja);
    frases.push({ ja, kana: kana || (soloKana(ja) ? ja : ''), es: es || '' });
  };
  (ej.voz || []).forEach(v => add(v.objetivo, pickKana(v.respuestas, v.objetivo), v.es));
  (ej.escritura || []).forEach(e => add((e.respuestas || [])[0], pickKana(e.respuestas), e.es));
  (ej.ordenar || []).forEach(o => add((o.tokens || o.palabras || []).join(''), '', o.es));
  (ej.traduccion || []).forEach(t => add((t.respuestas || [])[0], pickKana(t.respuestas), t.es));

  if (!frases.length) {
    cont.innerHTML = `
      <h1 class="vista-titulo">🗣️ Shadowing</h1>
      <p class="vista-sub">Aún no hay frases disponibles para practicar.</p>`;
    return;
  }
  for (let i = frases.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [frases[i], frases[j]] = [frases[j], frases[i]]; }

  cont.innerHTML = `
    <h1 class="vista-titulo">🗣️ Shadowing</h1>
    <p class="vista-sub">Escucha y repite en voz alta imitando el ritmo y la entonación. Suena la frase, se para y te toca repetir; o ponla en bucle. ${frases.length} frases.</p>
    <div id="sh-host"></div>`;
  crearShadowing(cont.querySelector('#sh-host'), frases);
}
