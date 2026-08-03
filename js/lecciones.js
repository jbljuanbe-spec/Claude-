// 📖 Lecciones: temario agrupado por ciudad. Cada lección es un barrio; aprobar
// sus ejercicios (>=80%) da su insignia. Al completar las lecciones de una
// ciudad se hace su EXAMEN acumulativo (>=80%) para el billete de Shinkansen.
// Toda la estructura (ciudad, barrio, emoji, título) viene del JSON vía el motor.
import { api } from './api.js';
import { hablar } from './tts.js';
import { comprobarJapones, comprobarEspanol, comprobarTraduccion, romajiAHiragana, contieneJapones } from './kana.js';
import { hayReconocimiento, escuchar } from './voz.js';

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
  const [{ ciudades, futuras, fuji }, biblioteca, ejercicios, teoria] = await Promise.all([
    api.viaje(), api.biblioteca(), api.ejercicios(),
    // La teoría es opcional: si falta el archivo, la lección sigue funcionando
    // igual que antes, solo que sin el botón de gramática.
    fetch(`data/teoria.json?v=${Date.now()}`).then(r => (r.ok ? r.json() : { lecciones: {} })).catch(() => ({ lecciones: {} }))
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

  // ---------- Gramática explicada (data/teoria.json) ----------
  // Cada lección tiene sus puntos gramaticales para estudiarlos de uno en uno,
  // con explicación, estructura, tabla, ejemplos con audio y errores típicos.
  function puntosDe(codigo) { return (teoria.lecciones || {})[codigo] || []; }

  function pintarGramatica(codigo) {
    const h = hitoDe[codigo];
    const puntos = puntosDe(codigo);
    cont.innerHTML = `
      <button class="boton boton-secundario" id="btn-volver" style="margin-bottom:16px">← Volver a la lección</button>
      <h1 class="vista-titulo">📚 Gramática · ${esc(h.barrio)}</h1>
      <p class="vista-sub">${esc(h.codigo)} · ${esc(h.titulo)}. ${puntos.length} punto${puntos.length === 1 ? '' : 's'} para estudiar de uno en uno.</p>
      <div class="gram-indice">
        ${puntos.map((pt, i) => `
          <button class="gram-tarjeta" data-i="${i}">
            <span class="gram-num">${i + 1}</span>
            <span class="gram-tarjeta-texto">
              <b lang="ja">${esc(pt.titulo)}</b>
              <small>${esc(pt.resumen || '')}</small>
            </span>
            <span class="gram-flecha">→</span>
          </button>`).join('')}
      </div>`;
    cont.querySelector('#btn-volver').onclick = () => pintarTeoria(codigo);
    cont.querySelectorAll('.gram-tarjeta').forEach(b =>
      b.onclick = () => pintarPunto(codigo, parseInt(b.dataset.i)));
  }

  function pintarPunto(codigo, i) {
    const puntos = puntosDe(codigo);
    const pt = puntos[i];
    if (!pt) return pintarGramatica(codigo);
    cont.innerHTML = `
      <button class="boton boton-secundario" id="btn-indice" style="margin-bottom:16px">← Todos los puntos</button>
      <div class="gram-punto">
        <div class="gram-punto-cab">
          <span class="gram-num grande">${i + 1}<small>/${puntos.length}</small></span>
          <div>
            <h1 class="gram-punto-titulo" lang="ja">${esc(pt.titulo)}</h1>
            ${pt.resumen ? `<p class="gram-punto-resumen">${esc(pt.resumen)}</p>` : ''}
          </div>
        </div>

        ${(pt.estructura || []).length ? `
          <div class="gram-estructura">
            ${pt.estructura.map(e => `<div class="gram-estructura-linea" lang="ja">${esc(e)}</div>`).join('')}
          </div>` : ''}

        ${(pt.explicacion || []).map(par => `<p class="gram-parrafo">${esc(par)}</p>`).join('')}

        ${pt.tabla ? `
          <div class="gram-tabla-caja">
            <table class="gram-tabla">
              <thead><tr>${pt.tabla.cabecera.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
              <tbody>${pt.tabla.filas.map(f => `<tr>${f.map(c => `<td lang="ja">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
            </table>
          </div>` : ''}

        ${(pt.ejemplos || []).length ? `
          <h2 class="seccion-titulo">Ejemplos</h2>
          <div class="gram-ejemplos">
            ${pt.ejemplos.map(e => `
              <div class="gram-ejemplo">
                <div class="gram-ejemplo-ja" lang="ja">${esc(e.ja)}</div>
                <div class="gram-ejemplo-kana" lang="ja">${esc(e.kana)}</div>
                <div class="gram-ejemplo-es">${esc(e.es)}</div>
                <button class="boton-audio gram-ejemplo-audio" data-audio="${esc(e.ja)}" title="Oír">&#128266;</button>
              </div>`).join('')}
          </div>` : ''}

        ${(pt.avisos || []).length ? `
          <h2 class="seccion-titulo">Ojo con esto</h2>
          ${pt.avisos.map(a => `<div class="gram-aviso">⚠️ ${esc(a)}</div>`).join('')}` : ''}

        <div class="gram-nav">
          <button class="boton boton-secundario" id="btn-ant" ${i === 0 ? 'disabled' : ''}>← Anterior</button>
          <span class="gram-nav-pos">${i + 1} de ${puntos.length}</span>
          ${i < puntos.length - 1
            ? '<button class="boton boton-primario" id="btn-sig">Siguiente →</button>'
            : '<button class="boton boton-primario" id="btn-a-ejercicios">⚡ A los ejercicios</button>'}
        </div>
      </div>`;
    cont.querySelector('#btn-indice').onclick = () => pintarGramatica(codigo);
    cont.querySelectorAll('[data-audio]').forEach(b => b.onclick = () => hablar(b.dataset.audio));
    const ant = cont.querySelector('#btn-ant');
    if (ant && i > 0) ant.onclick = () => pintarPunto(codigo, i - 1);
    const sig = cont.querySelector('#btn-sig');
    if (sig) sig.onclick = () => pintarPunto(codigo, i + 1);
    const aE = cont.querySelector('#btn-a-ejercicios');
    if (aE) aE.onclick = () => pintarPractica([codigo]);
    window.scrollTo(0, 0);
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
      <div class="fila-botones" style="margin-bottom:20px">
        ${puntosDe(codigo).length ? `<button class="boton boton-primario" id="btn-gramatica">📚 Estudiar la gramática <small>(${puntosDe(codigo).length})</small></button>` : ''}
        ${h.estado === 'LOCKED' ? '' : `<button class="boton ${puntosDe(codigo).length ? 'boton-secundario' : 'boton-primario'}" id="btn-a-practica">⚡ Hacer los ejercicios</button>`}
      </div>
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
    const bG = cont.querySelector('#btn-gramatica');
    if (bG) bG.onclick = () => pintarGramatica(codigo);
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

    // Producción larga (archivo curado): como mucho una por sesión, no satura.
    const larga = barajar((ejercicios.produccion_larga || []).filter(e => codigos.includes(e.l)));
    if (larga.length) items.push({ tipo: 'produccion', e: larga[0] });

    // Escribir una frase entera en japonés (es -> ja, corregida).
    const frases = barajar((ejercicios.escritura || []).filter(e => codigos.includes(e.l)));
    items.push(...frases.slice(0, Math.max(1, Math.round(objetivo * 0.15))).map(e => ({ tipo: 'escritura', e })));

    // Hablar: decirla en voz alta; el navegador transcribe para corregir.
    const habla = barajar((ejercicios.voz || []).filter(e => codigos.includes(e.l)));
    if (habla.length) items.push({ tipo: 'voz', e: habla[0] });

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

    // Ejercicios estilo examen JLPT: lectura de kanji y hueco gramatical siguen
    // siendo globales (no por lección). Comprensión de párrafo, error-en-texto y
    // hueco-con-gramática-resaltada sí van por lección: se busca primero
    // contenido propio de la lección; si aún no existe, se cae al pool general
    // (o a cualquier otro, como red de seguridad mientras se amplía lección a
    // lección). Pocos en práctica normal; más en el examen de ciudad.
    const mapKanji = x => ({ tipo: 'kanji', e: { kanji: x.kanji, reading: x.respuesta, es: x.significado || '' }, opciones: x.opciones });
    const mapBunpo = x => ({ tipo: 'particula', e: { frase: x.frase_con_hueco, opciones: x.opciones, correcta: x.respuesta, trad: '', explicacion: '' } });
    const porLeccion = pool => {
      const propio = pool.filter(x => codigos.includes(x.l));
      if (propio.length) return propio;
      const general = pool.filter(x => !x.l);
      if (general.length) return general;
      return pool;
    };
    const extra = [];
    const nK = conError ? 3 : 1, nB = conError ? 3 : 1, nLect = conError ? 2 : 1, nErr = conError ? 2 : 1, nGram = conError ? 2 : 1;
    extra.push(...barajar([...(ejercicios.kanji_lectura || [])]).slice(0, nK).map(mapKanji));
    extra.push(...barajar([...(ejercicios.bunpo_choice || [])]).slice(0, nB).map(mapBunpo));
    for (const par of barajar(porLeccion(ejercicios.lectura_parrafo || [])).slice(0, nLect)) {
      const preguntas = conError ? par.preguntas : barajar([...par.preguntas]).slice(0, 1);
      extra.push(...preguntas.map(q => ({ tipo: 'lectura', e: { texto: par.texto, pregunta: q.pregunta, opciones: q.opciones, respuesta: q.respuesta } })));
    }
    extra.push(...barajar(porLeccion(ejercicios.texto_error || [])).slice(0, nErr).map(x => ({ tipo: 'error_texto', e: x })));
    extra.push(...barajar(porLeccion(ejercicios.texto_gramatica || [])).slice(0, nGram).map(x => ({ tipo: 'textogram', e: x })));

    // Reserva plaza para las cartas curadas (hablar/escribir/producción) y para
    // los ejercicios de examen: son el objetivo y no deben caer al recortar.
    const esCurada = x => x.tipo === 'voz' || x.tipo === 'escritura' || x.tipo === 'produccion';
    const curadas = barajar(items.filter(esCurada)).slice(0, Math.max(2, Math.round(objetivo * 0.4)));
    const resto = barajar(items.filter(x => !esCurada(x)));
    return barajar([...extra, ...curadas, ...resto].slice(0, objetivo));
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
    function pie(zona, correcto, extraHtml = '', permitirOverride = false) {
      // Red de seguridad: en respuestas escritas, si el autocorrector fue
      // demasiado estricto, se puede marcar como válida (autoevaluación).
      const override = (!correcto && permitirOverride) ? '<button class="boton-enlace" id="btn-override" title="Marcar tu respuesta como correcta">Mi respuesta era válida →</button>' : '';
      zona.insertAdjacentHTML('beforeend', `
        <div class="panel-feedback ${correcto ? 'correcto' : 'incorrecto'}">
          <div class="feedback-titulo">${correcto ? '<span lang="ja">正解</span> ¡Bien!' : '<span lang="ja">残念</span> No es eso'}${correcto ? '<span class="chip-xp">+6 XP</span>' : override}</div>
          ${extraHtml}
        </div>
        <div class="fila-botones"><button class="boton boton-primario" id="btn-sig-item">Seguir</button></div>`);
      siguiente(correcto);
      const ov = cont.querySelector('#btn-override');
      if (ov) ov.onclick = () => {
        ov.remove();
        sesion.aciertos++;
        api.registrarEjercicio().catch(() => {});
        const panel = cont.querySelector('.panel-feedback');
        panel.classList.remove('incorrecto'); panel.classList.add('correcto');
        panel.querySelector('.feedback-titulo').innerHTML = '<span lang="ja">正解</span> Aceptada <span class="chip-xp">+6 XP</span>';
      };
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

      } else if (item.tipo === 'lectura') {
        marco(`<div class="tarjeta-chips"><span class="chip chip-tipo-grammar">Comprensión</span></div>
          <p class="tarjeta-instruccion">Lee el texto y responde</p>
          <div class="texto-lectura" lang="ja">${esc(t.texto)}</div>
          <p class="frase-ejercicio" lang="ja" style="font-size:1.15rem">${esc(t.pregunta)}</p>
          <div class="opciones-particulas">${barajar([...t.opciones]).map(o => `<button class="opcion-particula" data-op="${esc(o)}" lang="ja">${esc(o)}</button>`).join('')}</div>`);
        cont.querySelectorAll('.opcion-particula').forEach(b => b.onclick = () => {
          const correcto = b.dataset.op === t.respuesta;
          cont.querySelectorAll('.opcion-particula').forEach(x => { x.disabled = true; if (x.dataset.op === t.respuesta) x.classList.add('elegida-bien'); else if (x === b && !correcto) x.classList.add('elegida-mal'); });
          pie(cont.querySelector('.tarjeta'), correcto, `<div class="feedback-respuesta" lang="ja">${esc(t.respuesta)}</div>`);
        });

      } else if (item.tipo === 'error_texto') {
        marco(`<div class="tarjeta-chips"><span class="chip chip-tipo-grammar">Encuentra el error</span></div>
          <p class="tarjeta-instruccion">Una de estas frases tiene un error gramatical. Tócala.</p>
          <div class="texto-lectura texto-candidatos" lang="ja">${t.candidatos.map((c, i) => `<span class="palabra-candidata" data-i="${i}">${esc(c)}</span>`).join(' ')}</div>`);
        cont.querySelectorAll('.palabra-candidata').forEach(b => b.onclick = () => {
          const correcto = parseInt(b.dataset.i) === t.incorrectaIdx;
          cont.querySelectorAll('.palabra-candidata').forEach(x => {
            x.classList.add('candidata-desactivada');
            if (parseInt(x.dataset.i) === t.incorrectaIdx) x.classList.add('candidata-bien');
            else if (x === b && !correcto) x.classList.add('candidata-mal');
          });
          pie(cont.querySelector('.tarjeta'), correcto, `<div class="feedback-respuesta" lang="ja">${esc(t.correcta)}</div>${t.explicacion ? `<div class="feedback-explicacion">${esc(t.explicacion)}</div>` : ''}`);
        });

      } else if (item.tipo === 'textogram') {
        const piezasHtml = t.partes.map((p, i) => i === t.huecoIdx
          ? '<span class="hueco">＿</span>'
          : `<span class="${p.marca ? 'resaltado-gramatica' : ''}">${esc(p.t)}</span>`
        ).join('');
        marco(`<div class="tarjeta-chips"><span class="chip chip-tipo-grammar">Completa y fíjate en lo resaltado</span></div>
          <p class="tarjeta-instruccion">Lo resaltado en naranja es el punto gramatical de esta lección. Elige qué falta.</p>
          <p class="frase-ejercicio" lang="ja">${piezasHtml}</p>
          <div class="opciones-particulas">${barajar(t.opciones).map(o => `<button class="opcion-particula" data-op="${esc(o)}" lang="ja">${esc(o)}</button>`).join('')}</div>`);
        cont.querySelectorAll('.opcion-particula').forEach(b => b.onclick = () => {
          const correcto = b.dataset.op === t.respuesta;
          cont.querySelectorAll('.opcion-particula').forEach(x => { x.disabled = true; if (x.dataset.op === t.respuesta) x.classList.add('elegida-bien'); else if (x === b && !correcto) x.classList.add('elegida-mal'); });
          const fraseFinal = t.partes.map((p, i) => i === t.huecoIdx ? t.respuesta : p.t).join('');
          hablar(fraseFinal);
          pie(cont.querySelector('.tarjeta'), correcto, `<div class="feedback-respuesta" lang="ja">${esc(fraseFinal)}</div>${t.explicacion ? `<div class="feedback-explicacion">${esc(t.explicacion)}</div>` : ''}`);
        });

      } else if (item.tipo === 'produccion') {
        marco(`<div class="tarjeta-chips"><span class="chip chip-tipo-grammar">Producción larga</span></div>
          <p class="tarjeta-instruccion">Escribe tu propia respuesta en japonés. No hay una única correcta: al comprobar verás un ejemplo de referencia.</p>
          <p class="tarjeta-prompt">${esc(t.prompt)}</p>
          ${t.puntos && t.puntos.length ? `<p class="trad-ejercicio">💡 Usa: <span lang="ja">${t.puntos.map(esc).join(' · ')}</span></p>` : ''}
          <textarea class="campo-respuesta campo-respuesta-largo" id="respuesta" lang="ja" rows="3" placeholder="日本語で書いてみて..."></textarea>
          <div class="fila-botones"><button class="boton boton-primario" id="btn-comprobar">Comprobar</button></div>`);
        const ta = cont.querySelector('#respuesta'); ta.focus();
        const comprobar = () => {
          const v = ta.value.trim();
          const correcto = contieneJapones(v) && v.replace(/\s/g, '').length >= 4;
          cont.querySelectorAll('.fila-botones, .campo-respuesta').forEach(el => el.remove());
          hablar(t.ejemplo);
          pie(cont.querySelector('.tarjeta'), correcto,
            `<div class="feedback-explicacion">Ejemplo de referencia:</div><div class="feedback-respuesta" lang="ja">${esc(t.ejemplo)}</div>`,
            true);
        };
        cont.querySelector('#btn-comprobar').onclick = comprobar;
        ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); comprobar(); } });

      } else if (item.tipo === 'escritura') {
        marco(`<div class="tarjeta-chips"><span class="chip chip-tipo-grammar">Escribe la frase</span></div>
          <p class="tarjeta-instruccion">Escribe la frase entera en japonés (vale kana, kanji o romaji)</p>
          <p class="tarjeta-prompt">${esc(t.es)}</p>
          ${t.pista ? `<p class="trad-ejercicio">💡 <span lang="ja">${esc(t.pista)}</span></p>` : ''}
          <input class="campo-respuesta" id="respuesta" autocomplete="off" lang="ja" placeholder="日本語で..." />
          <div class="vista-kana" id="vista-kana"></div>
          <div class="fila-botones"><button class="boton boton-primario" id="btn-comprobar">Comprobar</button></div>`);
        prepararEscrito(v => comprobarTraduccion(v, t.respuestas), () => { hablar(t.respuestas[0]); return `<div class="feedback-respuesta" lang="ja">${esc(t.respuestas[0])}</div>`; });

      } else if (item.tipo === 'voz') {
        const soporta = hayReconocimiento();
        marco(`<div class="tarjeta-chips"><span class="chip chip-tipo-conj">🎤 Habla</span></div>
          <p class="tarjeta-instruccion">${soporta ? 'Dilo en voz alta en japonés: el navegador escribirá lo que oiga para que lo corrijas. También puedes teclearlo.' : 'Tu navegador no admite dictado por voz: escríbelo con el teclado.'}</p>
          <p class="tarjeta-prompt">${esc(t.es)}</p>
          <div class="frase-objetivo-fila"><span class="frase-objetivo" lang="ja">${esc(t.objetivo)}</span><button class="boton-audio" id="btn-oir" title="Oír">&#128266;</button></div>
          ${soporta ? '<button class="boton boton-secundario boton-mic" id="btn-mic" type="button">🎤 Hablar</button>' : ''}
          <input class="campo-respuesta" id="respuesta" autocomplete="off" lang="ja" placeholder="Lo que digas aparecerá aquí..." />
          <div class="vista-kana" id="vista-kana" aria-live="polite"></div>
          <div class="fila-botones"><button class="boton boton-primario" id="btn-comprobar">Comprobar</button></div>`);
        const input = cont.querySelector('#respuesta');
        cont.querySelector('#btn-oir').onclick = () => hablar(t.objetivo);
        if (soporta) {
          const btn = cont.querySelector('#btn-mic'), vk = cont.querySelector('#vista-kana');
          let mando = null;
          btn.onclick = () => {
            if (mando) { mando.parar(); return; }
            btn.classList.add('escuchando'); btn.textContent = '● Escuchando… (toca para parar)'; vk.textContent = '';
            mando = escuchar({
              onParcial: p => { vk.textContent = '… ' + p; },
              onFinal: p => { input.value = p; },
              onError: () => { vk.textContent = 'No se pudo escuchar. Prueba otra vez o teclea.'; },
              onFin: () => { btn.classList.remove('escuchando'); btn.textContent = '🎤 Hablar'; mando = null; }
            });
          };
        }
        prepararEscrito(v => comprobarJapones(v, t.respuestas), () => { hablar(t.objetivo); return `<div class="feedback-respuesta" lang="ja">${esc(t.objetivo)}</div><div class="feedback-lectura">${esc(t.es)}</div>`; });

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
      const comprobar = () => { const correcto = comprobarFn(input.value); cont.querySelectorAll('.fila-botones, .campo-respuesta, .vista-kana').forEach(el => el.remove()); pie(cont.querySelector('.tarjeta'), correcto, feedbackFn(), true); };
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
