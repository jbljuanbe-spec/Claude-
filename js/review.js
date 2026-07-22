// Modo Repaso: motor SRS con recall activo e interleaving de tipos.
import { api } from './api.js';
import { hablar } from './tts.js';
import { comprobarJapones, comprobarEspanol, romajiAHiragana, contieneJapones } from './kana.js';
import { TIERS } from './ciudades.js';
import { animar } from './lottie.js';

const NOMBRES_TIPO = { vocab: 'Vocabulario', grammar: 'Gramática', conj: 'Conjugación' };

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export async function vistaRepaso(cont, refrescarBadge) {
  cont.innerHTML = '<p class="vista-sub">Cargando tarjetas...</p>';
  // Si se llega desde el mapa ("Estudiar aquí" / "Pausa para el té"),
  // la sesión se limita a esa ciudad.
  const ciudadFiltro = sessionStorage.getItem('kotoba-ciudad');
  sessionStorage.removeItem('kotoba-ciudad');
  const { cola } = await api.cola(20, ciudadFiltro);
  const nombreCiudad = ciudadFiltro || null;

  if (!cola.length) {
    cont.innerHTML = `
      <div class="zona-repaso"><div class="tarjeta fin-sesion">
        <div class="lottie-fin" id="lottie-descanso"></div>
        <div class="fin-kanji" lang="ja">休憩</div>
        <h2>Todo al día${nombreCiudad ? ` en ${esc(nombreCiudad)}` : ''}</h2>
        <p class="vista-sub" style="margin-top:6px">No hay tarjetas pendientes ahora mismo. Momento perfecto para un té, unos ejercicios o la biblioteca.</p>
        <div class="fila-botones" style="justify-content:center">
          <button class="boton boton-primario" id="ir-ejercicios">Ir a las lecciones</button>
          <button class="boton boton-secundario" id="ir-progreso">Ver el mapa</button>
        </div>
      </div></div>`;
    animar(cont.querySelector('#lottie-descanso'), 'matcha');
    cont.querySelector('#ir-ejercicios').onclick = () => location.hash = '#lecciones';
    cont.querySelector('#ir-progreso').onclick = () => location.hash = '#viaje';
    return;
  }

  const sesion = { idx: 0, aciertos: 0, fallos: 0, xp: 0, insignias: [], nivelNuevo: null };

  function pintarTarjeta() {
    if (sesion.idx >= cola.length) return pintarFin();
    const t = cola[sesion.idx];

    const chips = `
      <div class="tarjeta-chips">
        <span class="chip chip-tipo-${t.tipo}">${NOMBRES_TIPO[t.tipo]}</span>
        <span class="chip">${esc(t.leccion)}</span>
        ${t.estado === 'nueva' ? '<span class="chip">Nueva</span>' : ''}
      </div>`;

    let cuerpo = '';
    if (t.tipo === 'vocab' && t.dir === 'jp-es') {
      cuerpo = `
        <p class="tarjeta-instruccion">¿Qué significa en español?</p>
        <div class="fila-audio">
          <div class="kanji-grande" lang="ja" style="margin:0">${esc(t.kanji)}</div>
          <button class="boton-audio" id="btn-audio" title="Escuchar">&#128266;</button>
        </div>
        <input class="campo-respuesta" id="respuesta" autocomplete="off" placeholder="Escribe el significado..." />
        <div class="fila-botones"><button class="boton boton-primario" id="btn-comprobar">Comprobar</button></div>`;
    } else if (t.tipo === 'vocab') {
      cuerpo = `
        <p class="tarjeta-instruccion">Escríbelo en japonés (vale kana, kanji o romaji)</p>
        <p class="tarjeta-prompt">${esc(t.es)}</p>
        <input class="campo-respuesta" id="respuesta" autocomplete="off" lang="ja" placeholder="日本語で..." />
        <div class="vista-kana" id="vista-kana"></div>
        <div class="fila-botones"><button class="boton boton-primario" id="btn-comprobar">Comprobar</button></div>`;
    } else if (t.tipo === 'conj') {
      cuerpo = `
        <p class="tarjeta-instruccion">Conjuga (vale kana, kanji o romaji)</p>
        <p class="tarjeta-prompt" lang="ja" style="font-size:1.5rem">${esc(t.front)}</p>
        <input class="campo-respuesta" id="respuesta" autocomplete="off" lang="ja" placeholder="答え..." />
        <div class="vista-kana" id="vista-kana"></div>
        <div class="fila-botones"><button class="boton boton-primario" id="btn-comprobar">Comprobar</button></div>`;
    } else {
      cuerpo = `
        <p class="tarjeta-instruccion">Piensa la respuesta y compruébala</p>
        <p class="tarjeta-prompt" style="font-size:1.25rem">${esc(t.question)}</p>
        <div class="fila-botones"><button class="boton boton-primario" id="btn-mostrar">Mostrar explicación</button></div>
        <div id="zona-explicacion"></div>`;
    }

    cont.innerHTML = `
      <div class="zona-repaso">
        <div class="repaso-meta">
          <span>${nombreCiudad ? `${esc(nombreCiudad)} · ` : ''}${sesion.idx + 1} de ${cola.length}</span>
          <div class="barra-progreso"><div style="width:${(sesion.idx / cola.length) * 100}%"></div></div>
          <span>${sesion.aciertos} &#10003; · ${sesion.fallos} &#10007;</span>
        </div>
        <div class="tarjeta">${chips}${cuerpo}</div>
      </div>`;

    const input = cont.querySelector('#respuesta');
    const vistaKana = cont.querySelector('#vista-kana');
    if (input && vistaKana) {
      input.addEventListener('input', () => {
        const v = input.value.trim();
        vistaKana.textContent = v && !contieneJapones(v) ? `→ ${romajiAHiragana(v)}` : '';
      });
    }
    if (input) input.focus();

    const btnAudio = cont.querySelector('#btn-audio');
    if (btnAudio) btnAudio.onclick = () => hablar(t.reading || t.kanji);

    if (t.tipo === 'grammar') {
      cont.querySelector('#btn-mostrar').onclick = () => {
        cont.querySelector('#zona-explicacion').innerHTML = `
          <div class="explicacion-gramatica">${esc(t.explanation)}</div>
          <div class="fila-botones">
            <button class="boton boton-error" id="btn-mal">A repasar</button>
            <button class="boton boton-exito" id="btn-bien">La sabía</button>
          </div>`;
        cont.querySelector('#btn-mostrar').remove();
        cont.querySelector('#btn-bien').onclick = () => resolver(t, true, null);
        cont.querySelector('#btn-mal').onclick = () => resolver(t, false, null);
      };
      return;
    }

    const comprobar = () => {
      const valor = input.value;
      let acierto;
      if (t.tipo === 'vocab' && t.dir === 'jp-es') {
        acierto = comprobarEspanol(valor, t.es);
      } else if (t.tipo === 'vocab') {
        acierto = comprobarJapones(valor, [t.kanji, t.reading, ...(t.readingAlt || [])]);
      } else {
        acierto = comprobarJapones(valor, [t.answer, ...(t.alt || [])]);
      }
      resolver(t, acierto, valor);
    };
    cont.querySelector('#btn-comprobar').onclick = comprobar;
    // preventDefault: si no, el mismo Enter "pulsa" el botón Siguiente recién enfocado y salta el feedback.
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); comprobar(); } });
  }

  async function resolver(t, acierto, valorUsuario) {
    if (acierto) sesion.aciertos++; else sesion.fallos++;
    api.responder(t.id, acierto ? 'bien' : 'mal').then(r => {
      sesion.xp += r.xpGanado || 0;
      if (r.insigniasNuevas) sesion.insignias.push(...r.insigniasNuevas);
      if (r.subeNivel) sesion.nivelNuevo = r.nivel;
      const titulo = cont.querySelector('.panel-feedback .feedback-titulo');
      if (titulo && r.xpGanado) titulo.insertAdjacentHTML('beforeend', `<span class="chip-xp">+${r.xpGanado} XP</span>`);
      refrescarBadge();
    }).catch(() => {});

    const tarjeta = cont.querySelector('.tarjeta');
    tarjeta.querySelectorAll('.fila-botones, .campo-respuesta, .vista-kana').forEach(el => el.remove());

    let detalle = '';
    if (t.tipo === 'vocab') {
      detalle = `
        <div class="feedback-respuesta" lang="ja">${esc(t.kanji)}</div>
        <div class="feedback-lectura" lang="ja">${esc(t.reading)}${t.readingAlt ? ' · ' + esc(t.readingAlt.join(' · ')) : ''} · ${esc(t.es)}</div>`;
    } else if (t.tipo === 'conj') {
      detalle = `
        <div class="feedback-respuesta" lang="ja">${esc(t.answer)}</div>
        ${t.alt ? `<div class="feedback-lectura" lang="ja">También vale: ${esc(t.alt.join(' · '))}</div>` : ''}`;
    } else {
      detalle = `<div class="feedback-explicacion" style="border:none;padding:0;margin:0">${esc(t.explanation)}</div>`;
    }

    const titulo = acierto
      ? '<span lang="ja">正解</span> ¡Bien!'
      : (valorUsuario === null ? 'A repasar' : '<span lang="ja">残念</span> No exactamente');

    tarjeta.insertAdjacentHTML('beforeend', `
      <div class="panel-feedback ${acierto ? 'correcto' : 'incorrecto'}">
        <div class="feedback-titulo">${titulo}</div>
        ${detalle}
      </div>
      <div class="fila-botones"><button class="boton boton-primario" id="btn-siguiente">Siguiente</button></div>`);

    if (t.tipo === 'vocab') hablar(t.reading || t.kanji);
    if (t.tipo === 'conj') hablar(t.answer);

    const siguiente = () => { sesion.idx++; pintarTarjeta(); };
    const btn = cont.querySelector('#btn-siguiente');
    btn.focus();
    btn.onclick = siguiente;
  }

  function pintarFin() {
    const total = sesion.aciertos + sesion.fallos;
    const pct = total ? Math.round((sesion.aciertos / total) * 100) : 0;

    const nivelHtml = sesion.nivelNuevo ? `
      <div class="aviso-nivel">🎉 ¡Nivel ${sesion.nivelNuevo.nivel}! Ahora eres <b>${esc(sesion.nivelNuevo.titulo)}</b> <span lang="ja">${esc(sesion.nivelNuevo.kanji)}</span></div>` : '';


    const insigniasHtml = sesion.insignias.length ? `
      <div class="fin-insignias">
        ${sesion.insignias.map(i => {
          const tier = TIERS.find(t => t.id === i.tier);
          return `<div class="insignia-nueva">
            <span class="insignia-icono">${tier.icono}</span>
            <div><b>${esc(i.leccion)} · ${esc(tier.nombre)}</b><br><small>${esc(tier.descripcion)}</small></div>
          </div>`;
        }).join('')}
      </div>` : '';

    cont.innerHTML = `
      <div class="zona-repaso"><div class="tarjeta fin-sesion">
        <div class="lottie-fin" id="lottie-fin"></div>
        <div class="fin-kanji" lang="ja">${pct >= 80 ? 'お見事' : 'お疲れ様'}</div>
        <h2>Sesión terminada</h2>
        <div class="fin-stats">
          <div class="fin-stat"><b>${total}</b><span>tarjetas</span></div>
          <div class="fin-stat"><b style="color:var(--exito)">${sesion.aciertos}</b><span>aciertos</span></div>
          <div class="fin-stat"><b style="color:var(--error)">${sesion.fallos}</b><span>fallos</span></div>
          <div class="fin-stat"><b style="color:var(--acento)">+${sesion.xp}</b><span>XP</span></div>
        </div>
        ${nivelHtml}
        ${insigniasHtml}
        <div class="fila-botones" style="justify-content:center">
          <button class="boton boton-primario" id="btn-otra">Seguir estudiando</button>
          <button class="boton boton-secundario" id="btn-progreso">Ver mi viaje</button>
        </div>
      </div></div>`;
    animar(cont.querySelector('#lottie-fin'), 'conejos');
    cont.querySelector('#btn-otra').onclick = () => vistaRepaso(cont, refrescarBadge);
    cont.querySelector('#btn-progreso').onclick = () => location.hash = '#viaje';
    refrescarBadge();
  }

  pintarTarjeta();
}
