// Ejercicios estilo Duolingo: partículas, ordenar frases (SOV) y traducción libre.
import { api } from './api.js';
import { hablar } from './tts.js';
import { comprobarTraduccion, romajiAHiragana, contieneJapones } from './kana.js';

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function barajar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function vistaEjercicios(cont) {
  cont.innerHTML = '<p class="vista-sub">Cargando ejercicios...</p>';
  const data = await api.ejercicios();

  let tab = 'particulas';
  const mazos = {};   // por pestaña: cola barajada que se va consumiendo

  function siguienteEjercicio(tipo) {
    if (!mazos[tipo] || !mazos[tipo].length) mazos[tipo] = barajar(data[tipo]);
    return mazos[tipo].pop();
  }

  function pintarMarco() {
    cont.innerHTML = `
      <h1 class="vista-titulo">Ejercicios</h1>
      <p class="vista-sub">Práctica variada generada a partir del contenido de tus lecciones.</p>
      <div class="tabs">
        <button class="tab" data-tab="particulas">Partículas</button>
        <button class="tab" data-tab="ordenar">Ordenar frases</button>
        <button class="tab" data-tab="traduccion">Traducción</button>
      </div>
      <div class="zona-repaso" id="zona-ejercicio"></div>`;
    cont.querySelectorAll('.tab').forEach(b => {
      b.classList.toggle('activa', b.dataset.tab === tab);
      b.onclick = () => { tab = b.dataset.tab; pintarMarco(); };
    });
    pintarEjercicio();
  }

  function pintarEjercicio() {
    const zona = cont.querySelector('#zona-ejercicio');
    const ej = siguienteEjercicio(tab);
    if (tab === 'particulas') pintarParticulas(zona, ej);
    else if (tab === 'ordenar') pintarOrdenar(zona, ej);
    else pintarTraduccion(zona, ej);
  }

  function piePosterior(zona, correcto, extraHtml = '') {
    zona.querySelector('.tarjeta').insertAdjacentHTML('beforeend', `
      <div class="panel-feedback ${correcto ? 'correcto' : 'incorrecto'}">
        <div class="feedback-titulo">${correcto ? '<span lang="ja">正解</span> ¡Bien!' : '<span lang="ja">残念</span> No es eso'}</div>
        ${extraHtml}
      </div>
      <div class="fila-botones"><button class="boton boton-primario" id="btn-sig">Otro ejercicio</button></div>`);
    api.registrarEjercicio().catch(() => {});
    const btn = zona.querySelector('#btn-sig');
    btn.focus();
    btn.onclick = pintarEjercicio;
  }

  // ---------- Partículas ----------
  function pintarParticulas(zona, ej) {
    zona.innerHTML = `
      <div class="tarjeta">
        <div class="tarjeta-chips"><span class="chip chip-tipo-vocab">Partículas</span><span class="chip">${esc(ej.l)}</span></div>
        <p class="tarjeta-instruccion">Elige la partícula que falta</p>
        <p class="frase-ejercicio" lang="ja">${esc(ej.frase).replace('＿', '<span class="hueco">＿</span>')}</p>
        <p class="trad-ejercicio">${esc(ej.trad)}</p>
        <div class="opciones-particulas">
          ${barajar(ej.opciones).map(o => `<button class="opcion-particula" data-op="${esc(o)}" lang="ja">${esc(o)}</button>`).join('')}
        </div>
      </div>`;

    zona.querySelectorAll('.opcion-particula').forEach(b => {
      b.onclick = () => {
        const elegida = b.dataset.op;
        const correcto = elegida === ej.correcta;
        zona.querySelectorAll('.opcion-particula').forEach(x => {
          x.disabled = true;
          if (x.dataset.op === ej.correcta) x.classList.add('elegida-bien');
          else if (x === b && !correcto) x.classList.add('elegida-mal');
        });
        const fraseCompleta = ej.frase.replace('＿', ej.correcta.startsWith('∅') ? '' : ej.correcta);
        hablar(fraseCompleta);
        piePosterior(zona, correcto, `
          <div class="feedback-respuesta" lang="ja">${esc(fraseCompleta)}</div>
          <div class="feedback-explicacion">${esc(ej.explicacion)}</div>`);
      };
    });
  }

  // ---------- Ordenar frases ----------
  function pintarOrdenar(zona, ej) {
    let construccion = [];
    zona.innerHTML = `
      <div class="tarjeta">
        <div class="tarjeta-chips"><span class="chip chip-tipo-conj">Ordenar</span><span class="chip">${esc(ej.l)}</span></div>
        <p class="tarjeta-instruccion">Toca las palabras en orden para formar la frase</p>
        <p class="trad-ejercicio" style="margin-bottom:14px">${esc(ej.es)}</p>
        <div class="zona-construccion" id="construccion"></div>
        <div class="banco-palabras" id="banco">
          ${barajar(ej.tokens.map((t, i) => ({ t, i }))).map(x =>
            `<button class="ficha-palabra" data-i="${x.i}" lang="ja">${esc(x.t)}</button>`).join('')}
        </div>
        <div class="fila-botones">
          <button class="boton boton-primario" id="btn-comprobar">Comprobar</button>
          <button class="boton boton-secundario" id="btn-deshacer">Deshacer</button>
        </div>
      </div>`;

    const zonaC = zona.querySelector('#construccion');
    const banco = zona.querySelector('#banco');

    function repintarConstruccion() {
      zonaC.innerHTML = construccion.map((i, pos) =>
        `<button class="ficha-palabra" data-pos="${pos}" lang="ja">${esc(ej.tokens[i])}</button>`).join('');
      zonaC.querySelectorAll('.ficha-palabra').forEach(f => {
        f.onclick = () => {
          const pos = parseInt(f.dataset.pos);
          const idx = construccion[pos];
          construccion.splice(pos, 1);
          banco.querySelector(`[data-i="${idx}"]`).classList.remove('usada');
          repintarConstruccion();
        };
      });
    }

    banco.querySelectorAll('.ficha-palabra').forEach(f => {
      f.onclick = () => {
        construccion.push(parseInt(f.dataset.i));
        f.classList.add('usada');
        repintarConstruccion();
      };
    });

    zona.querySelector('#btn-deshacer').onclick = () => {
      const idx = construccion.pop();
      if (idx !== undefined) banco.querySelector(`[data-i="${idx}"]`).classList.remove('usada');
      repintarConstruccion();
    };

    zona.querySelector('#btn-comprobar').onclick = () => {
      const correcto = construccion.length === ej.tokens.length && construccion.every((v, i) => v === i);
      const fraseCorrecta = ej.tokens.join('');
      zona.querySelectorAll('#btn-comprobar, #btn-deshacer').forEach(b => b.remove());
      hablar(fraseCorrecta);
      piePosterior(zona, correcto, `<div class="feedback-respuesta" lang="ja">${esc(fraseCorrecta)}</div>`);
    };
  }

  // ---------- Traducción libre ----------
  function pintarTraduccion(zona, ej) {
    zona.innerHTML = `
      <div class="tarjeta">
        <div class="tarjeta-chips"><span class="chip chip-tipo-grammar">Traducción</span><span class="chip">${esc(ej.l)}</span></div>
        <p class="tarjeta-instruccion">Tradúcelo al japonés (vale kana, kanji o romaji; la corrección es flexible)</p>
        <p class="tarjeta-prompt">${esc(ej.es)}</p>
        <input class="campo-respuesta" id="respuesta" autocomplete="off" lang="ja" placeholder="日本語で..." />
        <div class="vista-kana" id="vista-kana"></div>
        <div class="fila-botones"><button class="boton boton-primario" id="btn-comprobar">Comprobar</button></div>
      </div>`;

    const input = zona.querySelector('#respuesta');
    const vistaKana = zona.querySelector('#vista-kana');
    input.addEventListener('input', () => {
      const v = input.value.trim();
      vistaKana.textContent = v && !contieneJapones(v) ? `→ ${romajiAHiragana(v)}` : '';
    });
    input.focus();

    const comprobar = () => {
      const correcto = comprobarTraduccion(input.value, ej.respuestas);
      zona.querySelectorAll('.fila-botones, .campo-respuesta, .vista-kana').forEach(el => el.remove());
      hablar(ej.respuestas[0]);
      piePosterior(zona, correcto, `
        <div class="feedback-respuesta" lang="ja">${esc(ej.respuestas[0])}</div>
        ${ej.respuestas.length > 1 ? `<div class="feedback-lectura" lang="ja">También vale: ${esc(ej.respuestas.slice(1).join(' · '))}</div>` : ''}`);
    };
    zona.querySelector('#btn-comprobar').onclick = comprobar;
    // preventDefault: si no, el mismo Enter "pulsa" el botón recién enfocado y salta el feedback.
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); comprobar(); } });
  }

  pintarMarco();
}
