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
        <h2 class="seccion-titulo">Orden de los trazos</h2>
        <div class="kanji-trazo" id="kanji-trazo"><p class="vista-sub">Cargando trazo...</p></div>
      </div>`;
    cont.querySelector('#btn-volver').onclick = pintarLista;
    cont.querySelector('#btn-audio-kanji').onclick = () => hablar(k.kun[0] || k.on[0] || k.kanji);

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

  pintarLista();
}
