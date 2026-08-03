// 🈴 Kanji: consulta de lecturas, significado, ejemplos y mnemotecnia, más
// práctica del orden de los trazos (dataset abierto KanjiVG). Es una pestaña
// de referencia y refuerzo visual, independiente del motor SRS: no toca
// js/motor.js ni el progreso de lecciones.
import { hablar } from './tts.js';
import { api } from './api.js';

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function codepoint(k) { return k.codePointAt(0).toString(16).padStart(5, '0'); }

// Marca en la frase el kanji que se está estudiando, para localizarlo de un vistazo.
function resaltar(frase, kanji) {
  return [...String(frase)].map(ch => ch === kanji
    ? `<span class="kanji-marcado">${esc(ch)}</span>`
    : esc(ch)).join('');
}
function barajar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

let cacheKanji = null;
let cacheMeta = null;
async function cargarKanji() {
  if (cacheKanji) return cacheKanji;
  const res = await fetch(`data/kanji.json?v=${Date.now()}`);
  const d = await res.json();
  cacheKanji = d.kanji || [];
  cacheMeta = d.meta || {};
  return cacheKanji;
}

async function cargarTrazoSvg(k) {
  const res = await fetch(`data/kanjivg/${codepoint(k)}.svg`);
  if (!res.ok) return null;
  const texto = await res.text();
  const m = texto.match(/<svg[\s\S]*<\/svg>/);
  return m ? m[0] : null;
}

// Prepara cada trazo (<path>) para animarse con stroke-dasharray/dashoffset:
// oculto al principio, se revela dibujándose de principio a fin.
function prepararTrazos(lienzo) {
  const svg = lienzo.querySelector('svg');
  if (!svg) return [];
  svg.removeAttribute('width'); svg.removeAttribute('height');
  svg.classList.add('kanji-trazo-svg');
  const paths = [...svg.querySelectorAll('path')];
  paths.forEach(p => {
    const largo = p.getTotalLength();
    p.style.strokeDasharray = String(largo);
    p.style.strokeDashoffset = String(largo);
  });
  return paths;
}

export async function vistaKanji(cont) {
  cont.innerHTML = '<p class="vista-sub">Cargando kanji...</p>';
  const [kanjis, bib] = await Promise.all([cargarKanji(), api.biblioteca().catch(() => null)]);
  const enTemario = new Set();
  if (bib) bib.tarjetas.forEach(t => {
    for (const ch of (t.kanji || '')) if (/[一-龯]/.test(ch)) enTemario.add(ch);
  });

  let filtroNivel = 'todos';
  let filtroTemario = false;

  // Cobertura real frente al número oficial de kanji de cada nivel JLPT,
  // para poder ver de un vistazo si falta alguno por añadir.
  function cobertura(nivel) {
    const objetivo = (cacheMeta?.objetivo || {})[nivel];
    const hay = kanjis.filter(k => k.nivel === nivel).length;
    return objetivo ? { hay, objetivo, completo: hay >= objetivo } : null;
  }
  function etiquetaNivel(nivel) {
    const c = cobertura(nivel);
    if (!c) return nivel;
    return `${nivel} ${c.hay}/${c.objetivo}${c.completo ? ' ✓' : ''}`;
  }

  function pintarLista() {
    const filtrados = kanjis.filter(k =>
      (filtroNivel === 'todos' || k.nivel === filtroNivel) &&
      (!filtroTemario || enTemario.has(k.kanji))
    );
    const extras = kanjis.filter(k => k.nivel === 'Extra').length;
    cont.innerHTML = `
      <h1 class="vista-titulo">🈴 Kanji</h1>
      <p class="vista-sub">Lecturas, significado, ejemplos, mnemotecnia y práctica del orden de los trazos. ${kanjis.length} kanji en total: N5 ${cobertura('N5')?.hay ?? 0}/${cobertura('N5')?.objetivo ?? '?'}, N4 ${cobertura('N4')?.hay ?? 0}/${cobertura('N4')?.objetivo ?? '?'}${extras ? `, más ${extras} extra que salen en tus lecciones` : ''}.</p>
      <div class="kanji-filtros">
        <div class="kanji-filtro-grupo">
          <button class="kanji-chip ${filtroNivel === 'todos' ? 'activo' : ''}" data-nivel="todos">Todos</button>
          <button class="kanji-chip ${filtroNivel === 'N5' ? 'activo' : ''}" data-nivel="N5">${etiquetaNivel('N5')}</button>
          <button class="kanji-chip ${filtroNivel === 'N4' ? 'activo' : ''}" data-nivel="N4">${etiquetaNivel('N4')}</button>
          ${extras ? `<button class="kanji-chip ${filtroNivel === 'Extra' ? 'activo' : ''}" data-nivel="Extra">Extra</button>` : ''}
        </div>
        <label class="kanji-filtro-check">
          <input type="checkbox" id="chk-temario" ${filtroTemario ? 'checked' : ''}> Solo los que ya aparecen en mis lecciones
        </label>
      </div>
      <button class="boton boton-primario" id="btn-practicar" style="margin-bottom:18px">✍️ Practicar estos ${filtrados.length} kanji</button>
      <div class="kanji-grid">
        ${filtrados.map(k => `
          <button class="kanji-card" data-id="${esc(k.id)}">
            <span class="kanji-card-caracter" lang="ja">${esc(k.kanji)}</span>
            <span class="kanji-card-lectura" lang="ja">${esc(k.kun[0] || k.on[0] || '')}</span>
            <span class="kanji-card-nivel">${esc(k.nivel)}</span>
          </button>`).join('')}
      </div>
      ${!filtrados.length ? '<p class="vista-sub">No hay kanji con este filtro todavía.</p>' : ''}
      <p class="kanji-atribucion">Trazo: dataset abierto <a href="https://kanjivg.tagaini.net" target="_blank" rel="noopener">KanjiVG</a> (CC BY-SA 3.0).</p>`;

    cont.querySelectorAll('[data-nivel]').forEach(b => b.onclick = () => { filtroNivel = b.dataset.nivel; pintarLista(); });
    const chk = cont.querySelector('#chk-temario');
    if (chk) chk.onchange = () => { filtroTemario = chk.checked; pintarLista(); };
    const bp = cont.querySelector('#btn-practicar');
    if (bp) bp.onclick = pintarPractica;
    cont.querySelectorAll('.kanji-card').forEach(b => b.onclick = () => pintarDetalle(kanjis.find(k => k.id === b.dataset.id)));
  }

  async function pintarDetalle(k) {
    cont.innerHTML = `
      <button class="boton boton-secundario" id="btn-volver" style="margin-bottom:16px">← Volver a la lista</button>
      <div class="kanji-detalle">
        <div class="kanji-detalle-cab">
          <span class="kanji-detalle-caracter" lang="ja">${esc(k.kanji)}</span>
          <div class="kanji-detalle-info">
            ${k.on.length ? `<div><b>On'yomi</b> <span lang="ja">${k.on.map(esc).join('、')}</span></div>` : ''}
            ${k.kun.length ? `<div><b>Kun'yomi</b> <span lang="ja">${k.kun.map(esc).join('、')}</span></div>` : ''}
            <div class="kanji-detalle-significado">${esc(k.significado)}</div>
            <button class="boton-audio" id="btn-audio-kanji" title="Oír">&#128266;</button>
          </div>
        </div>
        ${k.mnemonico ? `<div class="kanji-mnemonico">💡 ${esc(k.mnemonico)}</div>` : ''}
        ${k.ejemplos.length ? `
          <h2 class="seccion-titulo">Ejemplos</h2>
          <div class="kanji-ejemplos">
            ${k.ejemplos.map(e => `<div class="kanji-ejemplo"><span lang="ja">${esc(e.palabra)}</span><span class="kanji-ejemplo-lectura" lang="ja">${esc(e.lectura)}</span><span class="kanji-ejemplo-es">${esc(e.es)}</span></div>`).join('')}
          </div>` : ''}
        ${(k.frases || []).length ? `
          <h2 class="seccion-titulo">Frases</h2>
          <div class="kanji-frases">
            ${k.frases.map(f => `
              <div class="kanji-frase">
                <div class="kanji-frase-ja" lang="ja">${resaltar(f.ja, k.kanji)}</div>
                <div class="kanji-frase-kana" lang="ja">${esc(f.kana)}</div>
                <div class="kanji-frase-es">${esc(f.es)}</div>
                <button class="boton-audio kanji-frase-audio" data-audio="${esc(f.ja)}" title="Oír">&#128266;</button>
              </div>`).join('')}
          </div>` : ''}
        <h2 class="seccion-titulo">Orden de los trazos</h2>
        <div class="kanji-trazo" id="kanji-trazo"><p class="vista-sub">Cargando trazo...</p></div>
      </div>`;
    cont.querySelector('#btn-volver').onclick = pintarLista;
    cont.querySelector('#btn-audio-kanji').onclick = () => hablar(k.kun[0] || k.on[0] || k.kanji);
    cont.querySelectorAll('[data-audio]').forEach(b => b.onclick = () => hablar(b.dataset.audio));

    const zona = cont.querySelector('#kanji-trazo');
    const svgTexto = await cargarTrazoSvg(k.kanji);
    if (!svgTexto) { zona.innerHTML = '<p class="vista-sub">Trazo no disponible todavía para este kanji.</p>'; return; }
    zona.innerHTML = `
      <div class="kanji-trazo-lienzo">${svgTexto}</div>
      <div class="fila-botones">
        <button class="boton boton-secundario" id="btn-trazo-reiniciar">↺ Reiniciar</button>
        <button class="boton boton-secundario" id="btn-trazo-paso">Siguiente trazo</button>
        <button class="boton boton-primario" id="btn-trazo-animar">▶ Ver animado</button>
      </div>`;
    const lienzo = zona.querySelector('.kanji-trazo-lienzo');
    const paths = prepararTrazos(lienzo);
    let pasoActual = 0;
    let animando = false;

    function reiniciar() {
      animando = false;
      paths.forEach(p => { p.style.transition = 'none'; p.style.strokeDashoffset = p.style.strokeDasharray; });
      pasoActual = 0;
    }
    function mostrarPaso(i) {
      const p = paths[i];
      if (!p) return;
      p.style.transition = 'stroke-dashoffset 0.5s ease-in-out';
      p.style.strokeDashoffset = '0';
    }
    async function animar() {
      if (animando) return;
      reiniciar();
      animando = true;
      for (let i = 0; i < paths.length && animando; i++) {
        mostrarPaso(i);
        pasoActual = i + 1;
        await new Promise(r => setTimeout(r, 550));
      }
      animando = false;
    }

    zona.querySelector('#btn-trazo-reiniciar').onclick = reiniciar;
    zona.querySelector('#btn-trazo-paso').onclick = () => {
      animando = false;
      if (pasoActual < paths.length) { mostrarPaso(pasoActual); pasoActual++; }
      else reiniciar();
    };
    zona.querySelector('#btn-trazo-animar').onclick = animar;
  }

  // ---------- Práctica ----------
  // Quiz de repaso rápido sobre los kanji del filtro actual. No toca el SRS ni
  // el progreso de lecciones: es entrenamiento libre, se puede repetir sin
  // penalización (fallar no resta nada, igual que en el resto de la app).
  function construirPreguntas(pool, objetivo = 10) {
    const conFrase = pool.filter(k => (k.frases || []).length);
    const preguntas = [];
    for (const k of barajar(pool).slice(0, objetivo)) {
      const tipos = ['significado', 'lectura'];
      if (k.ejemplos.length) tipos.push('palabra');
      if ((k.frases || []).length && conFrase.length >= 4) tipos.push('hueco');
      const tipo = tipos[Math.floor(Math.random() * tipos.length)];
      const otros = barajar(pool.filter(x => x.kanji !== k.kanji));

      if (tipo === 'significado') {
        const distr = otros.slice(0, 3).map(x => x.significado);
        if (distr.length < 3) continue;
        preguntas.push({ tipo, k, enunciado: k.kanji, jp: true,
          pregunta: '¿Qué significa este kanji?',
          correcta: k.significado, opciones: barajar([k.significado, ...distr]) });

      } else if (tipo === 'lectura') {
        const lec = k.kun[0] || k.on[0];
        const distr = otros.map(x => x.kun[0] || x.on[0]).filter(r => r && r !== lec).slice(0, 3);
        if (!lec || distr.length < 3) continue;
        preguntas.push({ tipo, k, enunciado: k.kanji, jp: true,
          pregunta: '¿Cómo se lee este kanji?',
          correcta: lec, opciones: barajar([lec, ...distr]), opcionesJp: true });

      } else if (tipo === 'palabra') {
        const e = k.ejemplos[Math.floor(Math.random() * k.ejemplos.length)];
        const distr = otros.flatMap(x => x.ejemplos.map(y => y.lectura))
          .filter(r => r && r !== e.lectura).slice(0, 3);
        if (distr.length < 3) continue;
        preguntas.push({ tipo, k, enunciado: e.palabra, jp: true,
          pregunta: `¿Cómo se lee esta palabra? (${e.es})`,
          correcta: e.lectura, opciones: barajar([e.lectura, ...distr]), opcionesJp: true });

      } else {
        const f = k.frases[0];
        const distr = otros.filter(x => x.kanji !== k.kanji).slice(0, 3).map(x => x.kanji);
        if (distr.length < 3) continue;
        preguntas.push({ tipo, k, frase: f,
          enunciado: [...f.ja].map(ch => ch === k.kanji ? '＿' : ch).join(''), jp: true,
          pregunta: `¿Qué kanji falta? (${f.es})`,
          correcta: k.kanji, opciones: barajar([k.kanji, ...distr]), opcionesJp: true });
      }
    }
    return preguntas;
  }

  function pintarPractica() {
    const pool = kanjis.filter(k =>
      (filtroNivel === 'todos' || k.nivel === filtroNivel) &&
      (!filtroTemario || enTemario.has(k.kanji))
    );
    if (pool.length < 4) {
      cont.innerHTML = `<button class="boton boton-secundario" id="btn-volver">← Volver</button>
        <p class="vista-sub" style="margin-top:16px">Hacen falta al menos 4 kanji en el filtro para practicar.</p>`;
      cont.querySelector('#btn-volver').onclick = pintarLista;
      return;
    }
    const preguntas = construirPreguntas(pool, 10);
    const sesion = { idx: 0, aciertos: 0 };

    function pintarPregunta() {
      if (sesion.idx >= preguntas.length) return pintarResultado();
      const q = preguntas[sesion.idx];
      cont.innerHTML = `
        <div class="zona-repaso">
          <div class="repaso-meta">
            <span>✍️ Práctica de kanji · ${sesion.idx + 1} de ${preguntas.length}</span>
            <div class="barra-progreso"><div style="width:${(sesion.idx / preguntas.length) * 100}%"></div></div>
            <span>${sesion.aciertos} &#10003;</span>
          </div>
          <div class="tarjeta">
            <p class="tarjeta-instruccion">${esc(q.pregunta)}</p>
            <p class="${q.tipo === 'hueco' ? 'frase-ejercicio' : 'kanji-quiz-grande'}" lang="ja">${
              q.tipo === 'hueco' ? esc(q.enunciado).replace('＿', '<span class="hueco">＿</span>') : esc(q.enunciado)}</p>
            <div class="opciones-particulas">
              ${q.opciones.map(o => `<button class="opcion-particula ${q.opcionesJp ? '' : 'opcion-texto'}" data-op="${esc(o)}" ${q.opcionesJp ? 'lang="ja"' : ''}>${esc(o)}</button>`).join('')}
            </div>
          </div>
        </div>`;
      cont.querySelectorAll('.opcion-particula').forEach(b => b.onclick = () => {
        const correcto = b.dataset.op === q.correcta;
        if (correcto) sesion.aciertos++;
        cont.querySelectorAll('.opcion-particula').forEach(x => {
          x.disabled = true;
          if (x.dataset.op === q.correcta) x.classList.add('elegida-bien');
          else if (x === b && !correcto) x.classList.add('elegida-mal');
        });
        const f = (q.k.frases || [])[0];
        hablar(q.tipo === 'hueco' && f ? f.ja : (q.k.kun[0] || q.k.on[0] || q.k.kanji));
        cont.querySelector('.tarjeta').insertAdjacentHTML('beforeend', `
          <div class="panel-feedback ${correcto ? 'correcto' : 'incorrecto'}">
            <div class="feedback-titulo">${correcto ? '<span lang="ja">正解</span> ¡Bien!' : '<span lang="ja">残念</span> No es eso'}</div>
            <div class="feedback-respuesta" lang="ja">${esc(q.k.kanji)} · ${esc(q.k.kun.concat(q.k.on).slice(0, 3).join('、'))}</div>
            <div class="feedback-explicacion">${esc(q.k.significado)}${q.k.mnemonico ? ' — ' + esc(q.k.mnemonico) : ''}</div>
            ${f ? `<div class="feedback-respuesta" lang="ja" style="margin-top:8px">${resaltar(f.ja, q.k.kanji)}</div><div class="feedback-explicacion">${esc(f.es)}</div>` : ''}
          </div>
          <div class="fila-botones"><button class="boton boton-primario" id="btn-sig">Seguir</button></div>`);
        const sig = cont.querySelector('#btn-sig');
        sig.focus();
        sig.onclick = () => { sesion.idx++; pintarPregunta(); };
      });
    }

    function pintarResultado() {
      const pct = Math.round((sesion.aciertos / preguntas.length) * 100);
      cont.innerHTML = `
        <div class="zona-repaso"><div class="tarjeta fin-sesion">
          <div class="fin-kanji" lang="ja">${pct >= 80 ? '上手' : 'もう一度'}</div>
          <h2>${sesion.aciertos} de ${preguntas.length} (${pct}%)</h2>
          <p class="vista-sub" style="margin-top:6px">Practicar kanji no penaliza nunca: repite las veces que quieras.</p>
          <div class="fila-botones" style="justify-content:center">
            <button class="boton boton-primario" id="btn-otra">Otra ronda</button>
            <button class="boton boton-secundario" id="btn-lista">Volver a la lista</button>
          </div>
        </div></div>`;
      cont.querySelector('#btn-otra').onclick = pintarPractica;
      cont.querySelector('#btn-lista').onclick = pintarLista;
    }

    pintarPregunta();
  }

  pintarLista();
}
