// 📖 Lecciones: temario agrupado por ciudad. Cada lección es un barrio; aprobar
// sus ejercicios (>=80%) da su insignia. Al completar las lecciones de una
// ciudad se hace su EXAMEN acumulativo (>=80%) para el billete de Shinkansen.
// Toda la estructura (ciudad, barrio, emoji, título) viene del JSON vía el motor.
import { api } from './api.js';
import { hablar } from './tts.js';
import { comprobarJapones, comprobarEspanol, comprobarTraduccion, romajiAHiragana, contieneJapones } from './kana.js';

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function barajar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const UMBRAL = 0.8;
const TIENE_KANJI = /[一-龯]/;

export async function vistaLecciones(cont, avisar, refrescarBadge) {
  cont.innerHTML = '<p class="vista-sub">Cargando lecciones...</p>';
  const [{ ciudades, futuras, fuji }, biblioteca, ejercicios] = await Promise.all([
    api.viaje(), api.biblioteca(), api.ejercicios()
  ]);

  // Mapa código -> hito con su ciudad.
  const hitoDe = {};
  ciudades.forEach(c => c.hitos.forEach(h => { hitoDe[h.codigo] = { ...h, ciudad: c }; }));
  if (fuji) hitoDe.General = { ...fuji, ciudad: { nombre: 'Monte Fuji', emoji: fuji.emoji, kanji: fuji.kanji, region: 'transversal', pref: '', jlpt: '' } };
  const tarjetasDe = cod => biblioteca.tarjetas.filter(t => t.leccion === cod);
  const lecturasVocab = biblioteca.tarjetas.filter(t => t.tipo === 'vocab' && t.reading).map(t => t.reading);

  const abrir = sessionStorage.getItem('kotoba-leccion');
  sessionStorage.removeItem('kotoba-leccion');
  const examenDe = sessionStorage.getItem('kotoba-examen');
  sessionStorage.removeItem('kotoba-examen');

  function chipEstado(h) {
    if (h.superado) return '<span class="chip chip-superada">✓ Conquistado</span>';
    if (h.estado === 'ACTIVE') return '<span class="chip chip-activa">Disponible</span>';
    return '<span class="chip">🔒 Bloqueado</span>';
  }

  function filaHito(h) {
    const bloqueada = h.estado === 'LOCKED';
    return `
      <div class="fila-leccion-tema ${bloqueada ? 'bloqueada' : ''}" data-codigo="${esc(h.codigo)}">
        <span class="hito-emoji-grande">${bloqueada ? '🔒' : h.emoji}</span>
        <div class="leccion-titulo-fila">
          <b>${esc(h.barrio)}</b>
          <div class="carta-ciudad-leccion">${esc(h.codigo)} · ${esc(h.titulo)} · ${h.stats.total} tarjetas${h.needsReview ? ' · 🍵 repasos' : ''}</div>
          ${h.superado ? `<div class="hito-logro" style="color:var(--ambar)">🏅 ${esc(h.barrio)}</div>` : ''}
        </div>
        ${chipEstado(h)}
        <div class="fila-botones" style="margin:0">
          <button class="boton boton-secundario btn-teoria" data-codigo="${esc(h.codigo)}" style="padding:8px 14px">Teoría</button>
          ${bloqueada ? '' : `<button class="boton ${h.superado ? 'boton-secundario' : 'boton-primario'} btn-practica" data-codigo="${esc(h.codigo)}" style="padding:8px 14px">Ejercicios</button>`}
        </div>
      </div>`;
  }

  // ---------- Lista del temario ----------
  function pintarLista() {
    const grupos = ciudades.map(c => {
      const examen = c.examenAprobado
        ? '<span class="chip chip-superada">★ Superada</span>'
        : c.examenDisponible
          ? `<button class="boton boton-primario btn-examen" data-ciudad="${esc(c.id)}" style="padding:6px 12px;font-size:0.82rem">🎫 Examen de ciudad</button>`
          : '';
      return `
        <div class="grupo-ciudad">
          <div class="grupo-ciudad-cab">
            <span class="carta-ciudad-emoji">${c.examenAprobado ? '🏯' : c.emoji}</span>
            <div>
              <b>${esc(c.nombre)} <span lang="ja">${esc(c.kanji)}</span></b> ${examen}
              <div class="carta-ciudad-leccion">${esc(c.pref || '')} · ${esc(c.region)} · ${c.superados}/${c.cupo} barrios</div>
            </div>
          </div>
          <div class="lista-temario">${c.hitos.map(filaHito).join('')}</div>
        </div>`;
    }).join('');

    const fujiHtml = fuji ? `
      <div class="grupo-ciudad">
        <div class="grupo-ciudad-cab"><span class="carta-ciudad-emoji">${fuji.emoji}</span>
          <div><b>${esc(fuji.barrio)} <span lang="ja">${esc(fuji.kanji)}</span></b>
          <div class="carta-ciudad-leccion">Hito transversal · matices de varias lecciones</div></div></div>
        <div class="lista-temario">${filaHito(hitoDe.General)}</div>
      </div>` : '';

    const fut = futuras.map(c => `
      <div class="fila-leccion-tema futura">
        <span class="hito-emoji-grande">${c.emoji}</span>
        <div class="leccion-titulo-fila"><b>${esc(c.nombre)} <span lang="ja" style="font-weight:500">${esc(c.kanji)}</span></b>
          <div class="carta-ciudad-leccion">${esc(c.pref || '')} · ${esc(c.region)} · aún sin contenido</div></div>
        <span class="chip chip-futura">Próximamente</span>
      </div>`).join('');

    cont.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap">
        <div>
          <h1 class="vista-titulo">📖 Lecciones</h1>
          <p class="vista-sub">Temario por ciudad. Cada lección es un barrio: aprueba sus ejercicios (${Math.round(UMBRAL * 100)}%) para su insignia, y el examen de ciudad para el billete de Shinkansen.</p>
        </div>
        <button class="boton boton-secundario" id="btn-importar">Actualizar contenido</button>
      </div>
      ${grupos}${fujiHtml}
      <h2 class="seccion-titulo">Próximas ciudades <small>se abren al viajar en Shinkansen</small></h2>
      <div class="lista-temario">${fut}</div>`;

    cont.querySelectorAll('.btn-teoria').forEach(b => b.onclick = () => pintarTeoria(b.dataset.codigo));
    cont.querySelectorAll('.btn-practica').forEach(b => b.onclick = () => pintarPractica([b.dataset.codigo]));
    cont.querySelectorAll('.btn-examen').forEach(b => b.onclick = () => iniciarExamen(b.dataset.ciudad));

    cont.querySelector('#btn-importar').onclick = async () => {
      const btn = cont.querySelector('#btn-importar');
      btn.disabled = true; btn.textContent = 'Importando...';
      try {
        const r = await api.importar();
        avisar(`Contenido actualizado: ${r.nuevas} tarjetas nuevas, ${r.actualizadas} revisadas. El progreso se conserva.`);
        refrescarBadge();
        vistaLecciones(cont, avisar, refrescarBadge);
      } catch (e) { avisar(e.message); btn.disabled = false; btn.textContent = 'Actualizar contenido'; }
    };
  }

  // ---------- Teoría ----------
  function pintarTeoria(codigo) {
    const h = hitoDe[codigo];
    const tarjetas = tarjetasDe(codigo);
    const vocab = tarjetas.filter(t => t.tipo === 'vocab');
    const gramatica = tarjetas.filter(t => t.tipo === 'grammar');
    const conjugacion = tarjetas.filter(t => t.tipo === 'conj');
    cont.innerHTML = `
      <button class="boton boton-secundario" id="btn-volver" style="margin-bottom:16px">← Todas las lecciones</button>
      <h1 class="vista-titulo">${h.emoji} ${esc(h.barrio)}</h1>
      <p class="vista-sub">${esc(h.codigo)} · ${esc(h.titulo)} · ${esc(h.ciudad.nombre)}. Cuando la tengas fresca, supera sus ejercicios.</p>
      ${h.estado === 'LOCKED' ? '' : `<button class="boton boton-primario" id="btn-a-practica" style="margin-bottom:20px">⚡ Hacer los ejercicios</button>`}
      ${vocab.length ? `
        <h2 class="seccion-titulo">Vocabulario <small>${vocab.length}</small></h2>
        <div class="rejilla-vocab">
          ${vocab.map(t => `
            <div class="celda-vocab">
              <div class="celda-kanji" lang="ja">${esc(t.kanji)}</div>
              <div class="celda-lectura" lang="ja">${esc(t.reading)}${t.readingAlt ? ' · ' + esc(t.readingAlt.join(' · ')) : ''}</div>
              <div class="celda-es">${esc(t.es)}</div>
              <div class="celda-pie">
                <span class="punto-estado ${t.dominada ? 'punto-dominada' : t.estado === 'nueva' ? 'punto-nueva' : 'punto-aprendiendo'}"></span>
                <button class="boton-audio" data-audio="${esc(t.reading || t.kanji)}" style="width:34px;height:34px;font-size:0.95rem">&#128266;</button>
              </div>
            </div>`).join('')}
        </div>` : ''}
      ${gramatica.length ? `
        <h2 class="seccion-titulo">Gramática y matices <small>${gramatica.length}</small></h2>
        ${gramatica.map(t => `<details class="item-gramatica"><summary><span>${esc(t.question)}</span></summary><p>${esc(t.explanation)}</p></details>`).join('')}` : ''}
      ${conjugacion.length ? `
        <h2 class="seccion-titulo">Conjugación <small>${conjugacion.length}</small></h2>
        ${conjugacion.map(t => `<div class="fila-conj"><span class="enunciado" lang="ja">${esc(t.front)}</span><span class="respuesta tapada" lang="ja" title="Pulsa para revelar">${esc(t.answer)}${t.alt ? ' · ' + esc(t.alt.join(' · ')) : ''}</span></div>`).join('')}` : ''}`;
    cont.querySelector('#btn-volver').onclick = pintarLista;
    const aP = cont.querySelector('#btn-a-practica');
    if (aP) aP.onclick = () => pintarPractica([codigo]);
    cont.querySelectorAll('[data-audio]').forEach(b => b.onclick = () => hablar(b.dataset.audio));
    cont.querySelectorAll('.respuesta.tapada').forEach(r => r.onclick = () => r.classList.remove('tapada'));
  }

  // ---------- Generador de ítems (una o varias lecciones) ----------
  function construirItems(codigos, objetivo = 10, conError = false) {
    const cards = biblioteca.tarjetas.filter(t => codigos.includes(t.leccion));
    const vocab = cards.filter(t => t.tipo === 'vocab');
    const conj = cards.filter(t => t.tipo === 'conj');
    const items = [];

    const parts = ejercicios.particulas.filter(e => codigos.includes(e.l));
    const gram = barajar([
      ...parts.map(e => ({ tipo: 'particula', e })),
      ...ejercicios.ordenar.filter(e => codigos.includes(e.l)).map(e => ({ tipo: 'ordenar', e })),
      ...ejercicios.traduccion.filter(e => codigos.includes(e.l)).map(e => ({ tipo: 'traduccion', e }))
    ]);
    items.push(...gram.slice(0, Math.max(3, Math.round(objetivo * 0.4))));

    if (conError && parts.length) {
      const e = barajar(parts)[0];
      const mal = barajar((e.opciones || []).filter(o => o !== e.correcta && !o.startsWith('∅')))[0];
      if (mal) items.push({ tipo: 'error', e, mal });
    }

    const conKanji = vocab.filter(t => TIENE_KANJI.test(t.kanji) && t.reading);
    for (const t of barajar(conKanji).slice(0, Math.round(objetivo * 0.25))) {
      const distractores = barajar(lecturasVocab.filter(r => r !== t.reading)).slice(0, 3);
      if (distractores.length >= 2) items.push({ tipo: 'kanji', e: t, opciones: barajar([t.reading, ...distractores]) });
    }
    items.push(...barajar(conj).slice(0, Math.round(objetivo * 0.2)).map(t => ({ tipo: 'conjescrita', e: t })));
    const restantes = Math.max(2, objetivo - items.length);
    items.push(...barajar(vocab).slice(0, restantes).map(t => ({ tipo: 'vocabescrito', e: t })));
    return barajar(items).slice(0, objetivo);
  }

  function iniciarExamen(ciudadId) {
    const c = ciudades.find(x => x.id === ciudadId);
    if (!c) return;
    const codigos = c.hitos.map(h => h.codigo);
    pintarPractica(codigos, { modo: 'examen', ciudad: c, objetivo: 14 });
  }

  // ---------- Motor de ejercicios (lección suelta o examen de ciudad) ----------
  function pintarPractica(codigos, opts = {}) {
    const examen = opts.modo === 'examen';
    const cabecera = examen ? `🎫 Examen de ${opts.ciudad.nombre}` : `${hitoDe[codigos[0]].emoji} ${hitoDe[codigos[0]].barrio}`;
    const items = construirItems(codigos, opts.objetivo || 10, examen);
    if (!items.length) { avisar('Aún no hay ejercicios para esto.'); return pintarLista(); }
    const sesion = { idx: 0, aciertos: 0 };

    function marco(cuerpo) {
      cont.innerHTML = `
        <div class="zona-repaso">
          <div class="repaso-meta">
            <span>${esc(cabecera)} · ${sesion.idx + 1} de ${items.length}</span>
            <div class="barra-progreso"><div style="width:${(sesion.idx / items.length) * 100}%"></div></div>
            <span>${sesion.aciertos} &#10003;</span>
          </div>
          <div class="tarjeta">${cuerpo}</div>
        </div>`;
    }
    function siguiente(correcto) {
      if (correcto) { sesion.aciertos++; api.registrarEjercicio().catch(() => {}); }
      const btn = cont.querySelector('#btn-sig-item'); btn.focus();
      btn.onclick = () => { sesion.idx++; pintarItem(); };
    }
    function pie(zona, correcto, extraHtml = '') {
      zona.insertAdjacentHTML('beforeend', `
        <div class="panel-feedback ${correcto ? 'correcto' : 'incorrecto'}">
          <div class="feedback-titulo">${correcto ? '<span lang="ja">正解</span> ¡Bien!' : '<span lang="ja">残念</span> No es eso'}${correcto ? '<span class="chip-xp">+6 XP</span>' : ''}</div>
          ${extraHtml}
        </div>
        <div class="fila-botones"><button class="boton boton-primario" id="btn-sig-item">Seguir</button></div>`);
      siguiente(correcto);
    }
    function opcionesParticula(t, correctaVal, fraseFinal, expl) {
      cont.querySelectorAll('.opcion-particula').forEach(b => {
        b.onclick = () => {
          const correcto = b.dataset.op === correctaVal;
          cont.querySelectorAll('.opcion-particula').forEach(x => {
            x.disabled = true;
            if (x.dataset.op === correctaVal) x.classList.add('elegida-bien');
            else if (x === b && !correcto) x.classList.add('elegida-mal');
          });
          hablar(fraseFinal);
          pie(cont.querySelector('.tarjeta'), correcto, `<div class="feedback-respuesta" lang="ja">${esc(fraseFinal)}</div>${expl ? `<div class="feedback-explicacion">${esc(expl)}</div>` : ''}`);
        };
      });
    }

    function pintarItem() {
      if (sesion.idx >= items.length) return pintarResultado();
      const item = items[sesion.idx];
      const t = item.e;

      if (item.tipo === 'particula') {
        marco(`<div class="tarjeta-chips"><span class="chip chip-tipo-vocab">Partícula</span></div>
          <p class="tarjeta-instruccion">Elige la partícula que falta</p>
          <p class="frase-ejercicio" lang="ja">${esc(t.frase).replace('＿', '<span class="hueco">＿</span>')}</p>
          <p class="trad-ejercicio">${esc(t.trad)}</p>
          <div class="opciones-particulas">${barajar(t.opciones).map(o => `<button class="opcion-particula" data-op="${esc(o)}" lang="ja">${esc(o)}</button>`).join('')}</div>`);
        opcionesParticula(t, t.correcta, t.frase.replace('＿', t.correcta.startsWith('∅') ? '' : t.correcta), t.explicacion);

      } else if (item.tipo === 'error') {
        const malStr = t.frase.replace('＿', item.mal);
        marco(`<div class="tarjeta-chips"><span class="chip chip-tipo-grammar">Encuentra el error</span></div>
          <p class="tarjeta-instruccion">Esta frase tiene la partícula MAL. Elige la correcta.</p>
          <p class="frase-ejercicio" lang="ja">${esc(malStr)}</p>
          <p class="trad-ejercicio">${esc(t.trad)}</p>
          <div class="opciones-particulas">${barajar(t.opciones).map(o => `<button class="opcion-particula" data-op="${esc(o)}" lang="ja">${esc(o)}</button>`).join('')}</div>`);
        opcionesParticula(t, t.correcta, t.frase.replace('＿', t.correcta.startsWith('∅') ? '' : t.correcta), t.explicacion);

      } else if (item.tipo === 'ordenar') {
        let construccion = [];
        marco(`<div class="tarjeta-chips"><span class="chip chip-tipo-conj">Ordenar</span></div>
          <p class="tarjeta-instruccion">Toca las palabras en orden para formar la frase</p>
          <p class="trad-ejercicio" style="margin-bottom:14px">${esc(t.es)}</p>
          <div class="zona-construccion" id="construccion"></div>
          <div class="banco-palabras" id="banco">${barajar(t.tokens.map((tk, i) => ({ tk, i }))).map(x => `<button class="ficha-palabra" data-i="${x.i}" lang="ja">${esc(x.tk)}</button>`).join('')}</div>
          <div class="fila-botones"><button class="boton boton-primario" id="btn-comprobar">Comprobar</button></div>`);
        const zonaC = cont.querySelector('#construccion'), banco = cont.querySelector('#banco');
        const repintar = () => {
          zonaC.innerHTML = construccion.map((i, pos) => `<button class="ficha-palabra" data-pos="${pos}" lang="ja">${esc(t.tokens[i])}</button>`).join('');
          zonaC.querySelectorAll('.ficha-palabra').forEach(f => f.onclick = () => { const idx = construccion.splice(parseInt(f.dataset.pos), 1)[0]; banco.querySelector(`[data-i="${idx}"]`).classList.remove('usada'); repintar(); });
        };
        banco.querySelectorAll('.ficha-palabra').forEach(f => f.onclick = () => { construccion.push(parseInt(f.dataset.i)); f.classList.add('usada'); repintar(); });
        cont.querySelector('#btn-comprobar').onclick = () => {
          const correcto = construccion.length === t.tokens.length && construccion.every((v, i) => v === i);
          cont.querySelector('#btn-comprobar').closest('.fila-botones').remove();
          hablar(t.tokens.join(''));
          pie(cont.querySelector('.tarjeta'), correcto, `<div class="feedback-respuesta" lang="ja">${esc(t.tokens.join(''))}</div>`);
        };

      } else if (item.tipo === 'traduccion') {
        marco(`<div class="tarjeta-chips"><span class="chip chip-tipo-grammar">Producción libre</span></div>
          <p class="tarjeta-instruccion">Tradúcelo al japonés (vale kana, kanji o romaji)</p>
          <p class="tarjeta-prompt">${esc(t.es)}</p>
          <input class="campo-respuesta" id="respuesta" autocomplete="off" lang="ja" placeholder="日本語で..." />
          <div class="vista-kana" id="vista-kana"></div>
          <div class="fila-botones"><button class="boton boton-primario" id="btn-comprobar">Comprobar</button></div>`);
        prepararEscrito(v => comprobarTraduccion(v, t.respuestas), () => { hablar(t.respuestas[0]); return `<div class="feedback-respuesta" lang="ja">${esc(t.respuestas[0])}</div>`; });

      } else if (item.tipo === 'kanji') {
        marco(`<div class="tarjeta-chips"><span class="chip chip-tipo-grammar">Lectura</span></div>
          <p class="tarjeta-instruccion">¿Cómo se lee?</p>
          <div class="kanji-grande" lang="ja">${esc(t.kanji)}</div>
          <div class="opciones-particulas">${item.opciones.map(o => `<button class="opcion-particula" data-op="${esc(o)}" lang="ja">${esc(o)}</button>`).join('')}</div>`);
        cont.querySelectorAll('.opcion-particula').forEach(b => b.onclick = () => {
          const correcto = b.dataset.op === t.reading;
          cont.querySelectorAll('.opcion-particula').forEach(x => { x.disabled = true; if (x.dataset.op === t.reading) x.classList.add('elegida-bien'); else if (x === b && !correcto) x.classList.add('elegida-mal'); });
          hablar(t.reading);
          pie(cont.querySelector('.tarjeta'), correcto, `<div class="feedback-respuesta" lang="ja">${esc(t.kanji)} · ${esc(t.reading)}</div><div class="feedback-lectura">${esc(t.es)}</div>`);
        });

      } else if (item.tipo === 'conjescrita') {
        marco(`<div class="tarjeta-chips"><span class="chip chip-tipo-conj">Conjugación</span></div>
          <p class="tarjeta-instruccion">Conjuga (vale kana, kanji o romaji)</p>
          <p class="tarjeta-prompt" lang="ja" style="font-size:1.5rem">${esc(t.front)}</p>
          <input class="campo-respuesta" id="respuesta" autocomplete="off" lang="ja" placeholder="答え..." />
          <div class="vista-kana" id="vista-kana"></div>
          <div class="fila-botones"><button class="boton boton-primario" id="btn-comprobar">Comprobar</button></div>`);
        prepararEscrito(v => comprobarJapones(v, [t.answer, ...(t.alt || [])]), () => { hablar(t.answer); return `<div class="feedback-respuesta" lang="ja">${esc(t.answer)}</div>`; });

      } else {
        const esAJp = t.dir !== 'jp-es';
        marco(`<div class="tarjeta-chips"><span class="chip chip-tipo-vocab">Vocabulario</span></div>
          <p class="tarjeta-instruccion">${esAJp ? 'Escríbelo en japonés (vale kana, kanji o romaji)' : '¿Qué significa en español?'}</p>
          ${esAJp ? `<p class="tarjeta-prompt">${esc(t.es)}</p>` : `<div class="kanji-grande" lang="ja" style="font-size:2.6rem">${esc(t.kanji)}</div>`}
          <input class="campo-respuesta" id="respuesta" autocomplete="off" ${esAJp ? 'lang="ja"' : ''} placeholder="${esAJp ? '日本語で...' : 'En español...'}" />
          <div class="vista-kana" id="vista-kana"></div>
          <div class="fila-botones"><button class="boton boton-primario" id="btn-comprobar">Comprobar</button></div>`);
        prepararEscrito(
          v => esAJp ? comprobarJapones(v, [t.kanji, t.reading, ...(t.readingAlt || [])]) : comprobarEspanol(v, t.es),
          () => { hablar(t.reading || t.kanji); return `<div class="feedback-respuesta" lang="ja">${esc(t.kanji)}</div><div class="feedback-lectura" lang="ja">${esc(t.reading)} · ${esc(t.es)}</div>`; });
      }
    }

    function prepararEscrito(comprobarFn, feedbackFn) {
      const input = cont.querySelector('#respuesta'), vistaKana = cont.querySelector('#vista-kana');
      input.addEventListener('input', () => { const v = input.value.trim(); vistaKana.textContent = v && !contieneJapones(v) && input.getAttribute('lang') === 'ja' ? `→ ${romajiAHiragana(v)}` : ''; });
      input.focus();
      const comprobar = () => { const correcto = comprobarFn(input.value); cont.querySelectorAll('.fila-botones, .campo-respuesta, .vista-kana').forEach(el => el.remove()); pie(cont.querySelector('.tarjeta'), correcto, feedbackFn()); };
      cont.querySelector('#btn-comprobar').onclick = comprobar;
      input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); comprobar(); } });
    }

    async function pintarResultado() {
      const pct = sesion.aciertos / items.length;
      const aprobado = pct >= UMBRAL;
      if (examen) return resultadoExamen(pct, aprobado);
      const h = hitoDe[codigos[0]];
      if (aprobado) {
        const r = await api.superarLeccion(codigos[0]).catch(() => null);
        const completa = r && r.ciudadCompleta;
        cont.innerHTML = `
          <div class="zona-repaso"><div class="tarjeta fin-sesion">
            <div class="fin-kanji" lang="ja">合格</div>
            <h2>🏅 ¡Insignia conseguida!</h2>
            <p class="vista-sub" style="margin-top:6px">${sesion.aciertos} de ${items.length} · ${h.emoji} <b>${esc(h.barrio)}</b></p>
            <p class="vista-sub">${esc(h.titulo)}</p>
            ${completa ? `<div class="aviso-nivel" style="margin-top:14px">🎫 ¡${esc(h.ciudad.nombre)} al completo! Ya puedes hacer el examen de ciudad para el billete de Shinkansen.</div>` : ''}
            <p class="vista-sub">Rumbo al mapa...</p>
          </div></div>`;
        sessionStorage.setItem('kotoba-conquista', codigos[0]);
        sessionStorage.setItem('kotoba-sel', h.ciudad.id || 'Tokio');
        setTimeout(() => { location.hash = '#viaje'; }, completa ? 2000 : 1400);
      } else {
        suspenso(pct, () => pintarPractica(codigos, opts), () => pintarTeoria(codigos[0]));
      }
    }

    async function resultadoExamen(pct, aprobado) {
      if (aprobado) {
        const r = await api.aprobarExamen(opts.ciudad.id, pct).catch(() => null);
        cont.innerHTML = `
          <div class="zona-repaso"><div class="tarjeta fin-sesion">
            <div class="fin-kanji" lang="ja">合格</div>
            <h2>🎫 ¡Examen superado!</h2>
            <p class="vista-sub" style="margin-top:6px">${sesion.aciertos} de ${items.length} (${Math.round(pct * 100)}%) · ${opts.ciudad.emoji} <b>${esc(opts.ciudad.nombre)}</b></p>
            <div class="aviso-nivel" style="margin-top:14px">🏯 ${esc(opts.ciudad.nombre)} superada. ${r && r.billete ? 'Billete de Shinkansen conseguido: ' : ''}la siguiente ciudad se abre.</div>
            <p class="vista-sub">Rumbo al mapa...</p>
          </div></div>`;
        sessionStorage.setItem('kotoba-conquista', opts.ciudad.hitos[0]?.codigo || '');
        sessionStorage.setItem('kotoba-examen-ok', opts.ciudad.id);
        sessionStorage.setItem('kotoba-sel', opts.ciudad.id);
        setTimeout(() => { location.hash = '#viaje'; }, 2200);
      } else {
        suspenso(pct, () => iniciarExamen(opts.ciudad.id), null);
      }
    }

    function suspenso(pct, reintentar, teoria) {
      cont.innerHTML = `
        <div class="zona-repaso"><div class="tarjeta fin-sesion">
          <div class="fin-kanji" lang="ja">もう一度</div>
          <h2>Casi: ${sesion.aciertos} de ${items.length} (${Math.round(pct * 100)}%)</h2>
          <p class="vista-sub" style="margin-top:6px">Necesitas un ${Math.round(UMBRAL * 100)}%. Nada se pierde: repásalo y vuelve a intentarlo las veces que haga falta.</p>
          <div class="fila-botones" style="justify-content:center">
            <button class="boton boton-primario" id="btn-reintentar">Reintentar</button>
            ${teoria ? '<button class="boton boton-secundario" id="btn-teoria-otra">Repasar la teoría</button>' : ''}
            <button class="boton boton-secundario" id="btn-lista">Todas las lecciones</button>
          </div>
        </div></div>`;
      cont.querySelector('#btn-reintentar').onclick = reintentar;
      const bt = cont.querySelector('#btn-teoria-otra'); if (bt && teoria) bt.onclick = teoria;
      cont.querySelector('#btn-lista').onclick = pintarLista;
    }

    pintarItem();
  }

  if (examenDe) iniciarExamen(examenDe);
  else if (abrir && hitoDe[abrir]) pintarTeoria(abrir);
  else pintarLista();
}
