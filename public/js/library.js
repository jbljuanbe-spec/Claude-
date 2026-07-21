// Biblioteca: todo el contenido por lección, con kanji en grande, furigana y audio.
// Aquí vive también el botón "Actualizar contenido" que reimporta el JSON.
import { api } from './api.js';
import { hablar } from './tts.js';

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export async function vistaBiblioteca(cont, avisar, refrescarBadge) {
  cont.innerHTML = '<p class="vista-sub">Cargando biblioteca...</p>';
  let { lecciones, tarjetas } = await api.biblioteca();

  let filtro = 'todas';
  let conFurigana = true;

  function pintar() {
    const codigos = Object.keys(lecciones);
    const visibles = tarjetas.filter(t => filtro === 'todas' || t.leccion === filtro);
    const vocab = visibles.filter(t => t.tipo === 'vocab');
    const gramatica = visibles.filter(t => t.tipo === 'grammar');
    const conjugacion = visibles.filter(t => t.tipo === 'conj');

    cont.innerHTML = `
      <h1 class="vista-titulo">Biblioteca</h1>
      <p class="vista-sub">Todo el contenido importado, lección a lección. ${tarjetas.length} tarjetas en total.</p>

      <div class="barra-biblioteca">
        <div class="filtros-leccion">
          <button class="tab ${filtro === 'todas' ? 'activa' : ''}" data-l="todas">Todas</button>
          ${codigos.map(c => `<button class="tab ${filtro === c ? 'activa' : ''}" data-l="${esc(c)}" title="${esc(lecciones[c])}">${esc(c)}</button>`).join('')}
        </div>
        <div style="display:flex; gap:14px; align-items:center">
          <label class="interruptor"><input type="checkbox" id="chk-furigana" ${conFurigana ? 'checked' : ''}> Furigana</label>
          <button class="boton boton-secundario" id="btn-importar" style="padding:9px 16px">Actualizar contenido</button>
        </div>
      </div>

      ${filtro !== 'todas' ? `<p class="vista-sub" style="margin-bottom:18px"><b>${esc(filtro)}</b> · ${esc(lecciones[filtro] || '')}</p>` : ''}

      ${vocab.length ? `
        <h2 class="seccion-titulo">Vocabulario <small>${vocab.length}</small></h2>
        <div class="rejilla-vocab">
          ${vocab.map(t => `
            <div class="celda-vocab">
              <div class="celda-kanji" lang="ja">${esc(t.kanji)}</div>
              <div class="celda-lectura celda-furigana ${conFurigana ? '' : 'oculto'}" lang="ja">${esc(t.reading)}${t.readingAlt ? ' · ' + esc(t.readingAlt.join(' · ')) : ''}</div>
              <div class="celda-es">${esc(t.es)}</div>
              <div class="celda-pie">
                <span class="punto-estado ${t.dominada ? 'punto-dominada' : t.estado === 'nueva' ? 'punto-nueva' : 'punto-aprendiendo'}"
                      title="${t.dominada ? 'Dominada' : t.estado === 'nueva' ? 'Nueva' : 'En estudio'}"></span>
                <button class="boton-audio" data-audio="${esc(t.reading || t.kanji)}" title="Escuchar" style="width:34px;height:34px;font-size:0.95rem">&#128266;</button>
              </div>
            </div>`).join('')}
        </div>` : ''}

      ${gramatica.length ? `
        <h2 class="seccion-titulo">Gramática y matices <small>${gramatica.length}</small></h2>
        ${gramatica.map(t => `
          <details class="item-gramatica">
            <summary><span>${esc(t.question)}</span></summary>
            <p>${esc(t.explanation)}</p>
          </details>`).join('')}` : ''}

      ${conjugacion.length ? `
        <h2 class="seccion-titulo">Conjugación <small>${conjugacion.length}</small></h2>
        ${conjugacion.map(t => `
          <div class="fila-conj">
            <span class="enunciado" lang="ja">${esc(t.front)}</span>
            <span class="respuesta tapada" lang="ja" title="Pulsa para revelar">${esc(t.answer)}${t.alt ? ' · ' + esc(t.alt.join(' · ')) : ''}</span>
          </div>`).join('')}` : ''}

      ${!visibles.length ? '<p class="vista-sub">No hay tarjetas en esta lección todavía.</p>' : ''}

      <div class="leyenda-estados">
        <span><span class="punto-estado punto-nueva"></span> Nueva</span>
        <span><span class="punto-estado punto-aprendiendo"></span> En estudio</span>
        <span><span class="punto-estado punto-dominada"></span> Dominada</span>
      </div>`;

    cont.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { filtro = b.dataset.l; pintar(); });

    cont.querySelector('#chk-furigana').onchange = e => {
      conFurigana = e.target.checked;
      cont.querySelectorAll('.celda-furigana').forEach(el => el.classList.toggle('oculto', !conFurigana));
    };

    cont.querySelectorAll('[data-audio]').forEach(b => b.onclick = () => hablar(b.dataset.audio));

    cont.querySelectorAll('.respuesta.tapada').forEach(r => {
      r.onclick = () => r.classList.remove('tapada');
    });

    cont.querySelector('#btn-importar').onclick = async () => {
      const btn = cont.querySelector('#btn-importar');
      btn.disabled = true;
      btn.textContent = 'Importando...';
      try {
        const r = await api.importar();
        avisar(`Contenido actualizado: ${r.nuevas} tarjetas nuevas, ${r.actualizadas} revisadas. El progreso se conserva.`);
        ({ lecciones, tarjetas } = await api.biblioteca());
        refrescarBadge();
        pintar();
      } catch (e) {
        avisar(e.message);
        btn.disabled = false;
        btn.textContent = 'Actualizar contenido';
      }
    };
  }

  pintar();
}
