// 📖 Lecciones: el temario ordenado (L1 → L300+). Aquí se consulta la teoría
// y se hacen los EJERCICIOS de cada lección. Leer la teoría NO completa la
// lección: solo aprobar sus ejercicios (≥80%) la marca como superada.
import { api } from './api.js';
import { hablar } from './tts.js';
import { ciudadDeLeccion, CIUDADES, CIUDADES_FUTURAS } from './ciudades.js';
import { comprobarJapones, comprobarEspanol, comprobarTraduccion, romajiAHiragana, contieneJapones } from './kana.js';

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

const UMBRAL_APROBADO = 0.8;
const TIENE_KANJI = /[一-龯]/;

export async function vistaLecciones(cont, avisar, refrescarBadge) {
  cont.innerHTML = '<p class="vista-sub">Cargando lecciones...</p>';
  const [{ paradas, lecciones, juego }, biblioteca, ejercicios] = await Promise.all([
    api.viaje(), api.biblioteca(), api.ejercicios()
  ]);

  const conCiudad = paradas.map(p => ({ ...p, ciudad: ciudadDeLeccion(p.codigo) }));
  const porCodigo = Object.fromEntries(conCiudad.map(p => [p.codigo, p]));
  const tarjetasDe = cod => biblioteca.tarjetas.filter(t => t.leccion === cod);

  // Agrupa las lecciones por su ciudad, en el orden de la hoja de ruta.
  const ciudadesConHitos = CIUDADES.map(ciudad => ({
    ciudad,
    hitos: ciudad.hitos.map(h => porCodigo[h.codigo]).filter(Boolean)
  })).filter(g => g.hitos.length);

  // Robustez: lecciones con contenido que aún no están en el curriculum (las que
  // añadas nuevas en el JSON) se agrupan solas, sin tocar código.
  const cubiertas = new Set(CIUDADES.flatMap(c => c.hitos.map(h => h.codigo)));
  const huerfanas = conCiudad.filter(p => /^L\d+$/.test(p.codigo) && !cubiertas.has(p.codigo))
    .sort((a, b) => a.codigo.localeCompare(b.codigo, 'es', { numeric: true }));
  if (huerfanas.length) {
    ciudadesConHitos.push({
      ciudad: { nombre: 'Nuevas lecciones', kanji: '新', emoji: '🆕', prefectura: '—', region: 'recién añadidas', hitos: huerfanas.map(p => ({ codigo: p.codigo })) },
      hitos: huerfanas
    });
  }

  // Si venimos del mapa ("Hacer los ejercicios"), se abre esa lección.
  const abrir = sessionStorage.getItem('kotoba-leccion');
  sessionStorage.removeItem('kotoba-leccion');

  function chipEstado(p) {
    if (p.estado === 'COMPLETED') return '<span class="chip chip-superada">✓ Conquistado</span>';
    if (p.estado === 'ACTIVE') return '<span class="chip chip-activa">Disponible</span>';
    return '<span class="chip">🔒 Bloqueado</span>';
  }

  function filaHito(p) {
    const c = p.ciudad;
    const bloqueada = p.estado === 'LOCKED';
    return `
      <div class="fila-leccion-tema ${bloqueada ? 'bloqueada' : ''}" data-codigo="${esc(p.codigo)}">
        <span class="hito-emoji-grande">${c.emoji}</span>
        <div class="leccion-titulo-fila">
          <b>${esc(c.nombre)} <span lang="ja" style="color:var(--tinta-tenue);font-weight:500">${esc(c.kanji)}</span></b>
          <div class="carta-ciudad-leccion">${esc(p.codigo)} · ${esc(lecciones[p.codigo] || '')} · ${p.stats.total} tarjetas${p.needsReview ? ' · 🍵 repasos' : ''}</div>
          ${p.estado === 'COMPLETED' ? `<div class="hito-logro" style="color:var(--ambar)">🏅 ${esc(c.insignia)}</div>` : ''}
        </div>
        ${chipEstado(p)}
        <div class="fila-botones" style="margin:0">
          <button class="boton boton-secundario btn-teoria" data-codigo="${esc(p.codigo)}" style="padding:8px 14px">Teoría</button>
          ${bloqueada ? '' : `<button class="boton ${p.estado === 'COMPLETED' ? 'boton-secundario' : 'boton-primario'} btn-practica" data-codigo="${esc(p.codigo)}" style="padding:8px 14px">Ejercicios</button>`}
        </div>
      </div>`;
  }

  // ---------- Lista del temario, agrupada por ciudad ----------
  function pintarLista() {
    const grupos = ciudadesConHitos.map(({ ciudad, hitos }) => {
      const req = ciudad.hitos.filter(h => !h.bonus).map(h => h.codigo);
      const superados = req.filter(c => porCodigo[c] && porCodigo[c].estado === 'COMPLETED').length;
      const conquistada = req.length && superados === req.length;
      return `
        <div class="grupo-ciudad">
          <div class="grupo-ciudad-cab">
            <span class="carta-ciudad-emoji">${conquistada ? '🏯' : ciudad.emoji}</span>
            <div>
              <b>${esc(ciudad.nombre)} <span lang="ja">${esc(ciudad.kanji)}</span></b>
              ${conquistada ? '<span class="chip chip-superada">★ Conquistada</span>' : ''}
              <div class="carta-ciudad-leccion">${esc(ciudad.prefectura)} · ${esc(ciudad.region)} · ${superados}/${req.length} hitos</div>
            </div>
          </div>
          <div class="lista-temario">${hitos.map(filaHito).join('')}</div>
        </div>`;
    }).join('');

    const futuras = CIUDADES_FUTURAS.map(c => `
      <div class="fila-leccion-tema futura">
        <span class="hito-emoji-grande">${c.emoji}</span>
        <div class="leccion-titulo-fila"><b>${esc(c.nombre)} <span lang="ja" style="font-weight:500">${esc(c.kanji)}</span></b>
          <div class="carta-ciudad-leccion">${esc(c.prefectura)} · ${esc(c.region)} · aún sin contenido</div></div>
        <span class="chip chip-futura">Próximamente</span>
      </div>`).join('');

    cont.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap">
        <div>
          <h1 class="vista-titulo">📖 Lecciones</h1>
          <p class="vista-sub">El temario agrupado por ciudad. Cada lección es un hito: leer la teoría no basta, hay que aprobar sus ejercicios (${Math.round(UMBRAL_APROBADO * 100)}%) para ganar su insignia.</p>
        </div>
        <button class="boton boton-secundario" id="btn-importar">Actualizar contenido</button>
      </div>
      ${grupos}
      <h2 class="seccion-titulo">Próximas ciudades <small>se abren con cada paquete de lecciones</small></h2>
      <div class="lista-temario">${futuras}</div>`;

    cont.querySelectorAll('.btn-teoria').forEach(b => b.onclick = () => pintarTeoria(b.dataset.codigo));
    cont.querySelectorAll('.btn-practica').forEach(b => b.onclick = () => pintarPractica(b.dataset.codigo));

    cont.querySelector('#btn-importar').onclick = async () => {
      const btn = cont.querySelector('#btn-importar');
      btn.disabled = true;
      btn.textContent = 'Importando...';
      try {
        const r = await api.importar();
        avisar(`Contenido actualizado: ${r.nuevas} tarjetas nuevas, ${r.actualizadas} revisadas. El progreso se conserva.`);
        refrescarBadge();
        vistaLecciones(cont, avisar, refrescarBadge);
      } catch (e) {
        avisar(e.message);
        btn.disabled = false;
        btn.textContent = 'Actualizar contenido';
      }
    };
  }

  // ---------- Teoría ----------
  function pintarTeoria(codigo) {
    const p = porCodigo[codigo];
    const c = p.ciudad;
    const tarjetas = tarjetasDe(codigo);
    const vocab = tarjetas.filter(t => t.tipo === 'vocab');
    const gramatica = tarjetas.filter(t => t.tipo === 'grammar');
    const conjugacion = tarjetas.filter(t => t.tipo === 'conj');

    cont.innerHTML = `
      <button class="boton boton-secundario" id="btn-volver" style="margin-bottom:16px">← Todas las lecciones</button>
      <h1 class="vista-titulo">${c.emoji} ${esc(codigo)} · ${esc(lecciones[codigo] || '')}</h1>
      <p class="vista-sub">Teoría de la lección. Cuando la tengas fresca, supera sus ejercicios: leer no basta para conquistar ${esc(c.nombre)}.</p>
      ${p.estado === 'LOCKED' ? '' : `<button class="boton boton-primario" id="btn-a-practica" style="margin-bottom:20px">⚡ Hacer los ejercicios de la lección</button>`}

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
          </div>`).join('')}` : ''}`;

    cont.querySelector('#btn-volver').onclick = pintarLista;
    const aPractica = cont.querySelector('#btn-a-practica');
    if (aPractica) aPractica.onclick = () => pintarPractica(codigo);
    cont.querySelectorAll('[data-audio]').forEach(b => b.onclick = () => hablar(b.dataset.audio));
    cont.querySelectorAll('.respuesta.tapada').forEach(r => r.onclick = () => r.classList.remove('tapada'));
  }

  // ---------- Ejercicios de la lección (lo que la supera) ----------
  function construirItems(codigo) {
    const tarjetas = tarjetasDe(codigo);
    const vocab = tarjetas.filter(t => t.tipo === 'vocab');
    const conj = tarjetas.filter(t => t.tipo === 'conj');
    const items = [];

    const gram = barajar([
      ...ejercicios.particulas.filter(e => e.l === codigo).map(e => ({ tipo: 'particula', e })),
      ...ejercicios.ordenar.filter(e => e.l === codigo).map(e => ({ tipo: 'ordenar', e })),
      ...ejercicios.traduccion.filter(e => e.l === codigo).map(e => ({ tipo: 'traduccion', e }))
    ]).slice(0, 4);
    items.push(...gram);

    const conKanji = vocab.filter(t => TIENE_KANJI.test(t.kanji) && t.reading);
    for (const t of barajar(conKanji).slice(0, 3)) {
      const distractores = barajar(biblioteca.tarjetas
        .filter(o => o.tipo === 'vocab' && o.reading && o.reading !== t.reading)
        .map(o => o.reading)).slice(0, 3);
      if (distractores.length >= 2) items.push({ tipo: 'kanji', e: t, opciones: barajar([t.reading, ...distractores]) });
    }

    items.push(...barajar(conj).slice(0, 2).map(t => ({ tipo: 'conjescrita', e: t })));

    const restantes = Math.max(2, 10 - items.length);
    items.push(...barajar(vocab).slice(0, restantes).map(t => ({ tipo: 'vocabescrito', e: t })));

    return barajar(items).slice(0, 10);
  }

  function pintarPractica(codigo) {
    const p = porCodigo[codigo];
    const c = p.ciudad;
    const items = construirItems(codigo);
    if (!items.length) {
      avisar('Esta lección aún no tiene ejercicios.');
      return pintarLista();
    }
    const sesion = { idx: 0, aciertos: 0 };

    function marco(cuerpo) {
      cont.innerHTML = `
        <div class="zona-repaso">
          <div class="repaso-meta">
            <span>${c.emoji} ${esc(c.nombre)} · ${sesion.idx + 1} de ${items.length}</span>
            <div class="barra-progreso"><div style="width:${(sesion.idx / items.length) * 100}%"></div></div>
            <span>${sesion.aciertos} &#10003;</span>
          </div>
          <div class="tarjeta">${cuerpo}</div>
        </div>`;
    }

    function siguiente(correcto) {
      if (correcto) {
        sesion.aciertos++;
        api.registrarEjercicio().catch(() => {}); // XP solo por acierto: el fallo da +0
      }
      const btn = cont.querySelector('#btn-sig-item');
      btn.focus();
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

    function pintarItem() {
      if (sesion.idx >= items.length) return pintarResultado();
      const item = items[sesion.idx];
      const t = item.e;

      if (item.tipo === 'particula') {
        marco(`
          <div class="tarjeta-chips"><span class="chip chip-tipo-vocab">Gramática</span></div>
          <p class="tarjeta-instruccion">Elige la partícula que falta</p>
          <p class="frase-ejercicio" lang="ja">${esc(t.frase).replace('＿', '<span class="hueco">＿</span>')}</p>
          <p class="trad-ejercicio">${esc(t.trad)}</p>
          <div class="opciones-particulas">
            ${barajar(t.opciones).map(o => `<button class="opcion-particula" data-op="${esc(o)}" lang="ja">${esc(o)}</button>`).join('')}
          </div>`);
        cont.querySelectorAll('.opcion-particula').forEach(b => {
          b.onclick = () => {
            const correcto = b.dataset.op === t.correcta;
            cont.querySelectorAll('.opcion-particula').forEach(x => {
              x.disabled = true;
              if (x.dataset.op === t.correcta) x.classList.add('elegida-bien');
              else if (x === b && !correcto) x.classList.add('elegida-mal');
            });
            const frase = t.frase.replace('＿', t.correcta.startsWith('∅') ? '' : t.correcta);
            hablar(frase);
            pie(cont.querySelector('.tarjeta'), correcto, `
              <div class="feedback-respuesta" lang="ja">${esc(frase)}</div>
              <div class="feedback-explicacion">${esc(t.explicacion)}</div>`);
          };
        });

      } else if (item.tipo === 'ordenar') {
        let construccion = [];
        marco(`
          <div class="tarjeta-chips"><span class="chip chip-tipo-conj">Gramática</span></div>
          <p class="tarjeta-instruccion">Toca las palabras en orden para formar la frase</p>
          <p class="trad-ejercicio" style="margin-bottom:14px">${esc(t.es)}</p>
          <div class="zona-construccion" id="construccion"></div>
          <div class="banco-palabras" id="banco">
            ${barajar(t.tokens.map((tk, i) => ({ tk, i }))).map(x => `<button class="ficha-palabra" data-i="${x.i}" lang="ja">${esc(x.tk)}</button>`).join('')}
          </div>
          <div class="fila-botones"><button class="boton boton-primario" id="btn-comprobar">Comprobar</button></div>`);
        const zonaC = cont.querySelector('#construccion');
        const banco = cont.querySelector('#banco');
        const repintar = () => {
          zonaC.innerHTML = construccion.map((i, pos) => `<button class="ficha-palabra" data-pos="${pos}" lang="ja">${esc(t.tokens[i])}</button>`).join('');
          zonaC.querySelectorAll('.ficha-palabra').forEach(f => {
            f.onclick = () => {
              const idx = construccion.splice(parseInt(f.dataset.pos), 1)[0];
              banco.querySelector(`[data-i="${idx}"]`).classList.remove('usada');
              repintar();
            };
          });
        };
        banco.querySelectorAll('.ficha-palabra').forEach(f => {
          f.onclick = () => { construccion.push(parseInt(f.dataset.i)); f.classList.add('usada'); repintar(); };
        });
        cont.querySelector('#btn-comprobar').onclick = () => {
          const correcto = construccion.length === t.tokens.length && construccion.every((v, i) => v === i);
          cont.querySelector('#btn-comprobar').closest('.fila-botones').remove();
          hablar(t.tokens.join(''));
          pie(cont.querySelector('.tarjeta'), correcto, `<div class="feedback-respuesta" lang="ja">${esc(t.tokens.join(''))}</div>`);
        };

      } else if (item.tipo === 'traduccion') {
        marco(`
          <div class="tarjeta-chips"><span class="chip chip-tipo-grammar">Gramática</span></div>
          <p class="tarjeta-instruccion">Tradúcelo al japonés (vale kana, kanji o romaji)</p>
          <p class="tarjeta-prompt">${esc(t.es)}</p>
          <input class="campo-respuesta" id="respuesta" autocomplete="off" lang="ja" placeholder="日本語で..." />
          <div class="vista-kana" id="vista-kana"></div>
          <div class="fila-botones"><button class="boton boton-primario" id="btn-comprobar">Comprobar</button></div>`);
        prepararEscrito(valor => comprobarTraduccion(valor, t.respuestas), () => {
          hablar(t.respuestas[0]);
          return `<div class="feedback-respuesta" lang="ja">${esc(t.respuestas[0])}</div>`;
        });

      } else if (item.tipo === 'kanji') {
        marco(`
          <div class="tarjeta-chips"><span class="chip chip-tipo-grammar">Kanji</span></div>
          <p class="tarjeta-instruccion">¿Cómo se lee?</p>
          <div class="kanji-grande" lang="ja">${esc(t.kanji)}</div>
          <div class="opciones-particulas">
            ${item.opciones.map(o => `<button class="opcion-particula" data-op="${esc(o)}" lang="ja">${esc(o)}</button>`).join('')}
          </div>`);
        cont.querySelectorAll('.opcion-particula').forEach(b => {
          b.onclick = () => {
            const correcto = b.dataset.op === t.reading;
            cont.querySelectorAll('.opcion-particula').forEach(x => {
              x.disabled = true;
              if (x.dataset.op === t.reading) x.classList.add('elegida-bien');
              else if (x === b && !correcto) x.classList.add('elegida-mal');
            });
            hablar(t.reading);
            pie(cont.querySelector('.tarjeta'), correcto, `
              <div class="feedback-respuesta" lang="ja">${esc(t.kanji)} · ${esc(t.reading)}</div>
              <div class="feedback-lectura">${esc(t.es)}</div>`);
          };
        });

      } else if (item.tipo === 'conjescrita') {
        marco(`
          <div class="tarjeta-chips"><span class="chip chip-tipo-conj">Conjugación</span></div>
          <p class="tarjeta-instruccion">Conjuga (vale kana, kanji o romaji)</p>
          <p class="tarjeta-prompt" lang="ja" style="font-size:1.5rem">${esc(t.front)}</p>
          <input class="campo-respuesta" id="respuesta" autocomplete="off" lang="ja" placeholder="答え..." />
          <div class="vista-kana" id="vista-kana"></div>
          <div class="fila-botones"><button class="boton boton-primario" id="btn-comprobar">Comprobar</button></div>`);
        prepararEscrito(valor => comprobarJapones(valor, [t.answer, ...(t.alt || [])]), () => {
          hablar(t.answer);
          return `<div class="feedback-respuesta" lang="ja">${esc(t.answer)}</div>`;
        });

      } else { // vocabescrito
        const esAJp = t.dir !== 'jp-es';
        marco(`
          <div class="tarjeta-chips"><span class="chip chip-tipo-vocab">Vocabulario</span></div>
          <p class="tarjeta-instruccion">${esAJp ? 'Escríbelo en japonés (vale kana, kanji o romaji)' : '¿Qué significa en español?'}</p>
          ${esAJp
            ? `<p class="tarjeta-prompt">${esc(t.es)}</p>`
            : `<div class="kanji-grande" lang="ja" style="font-size:2.6rem">${esc(t.kanji)}</div>`}
          <input class="campo-respuesta" id="respuesta" autocomplete="off" ${esAJp ? 'lang="ja"' : ''} placeholder="${esAJp ? '日本語で...' : 'En español...'}" />
          <div class="vista-kana" id="vista-kana"></div>
          <div class="fila-botones"><button class="boton boton-primario" id="btn-comprobar">Comprobar</button></div>`);
        prepararEscrito(
          valor => esAJp
            ? comprobarJapones(valor, [t.kanji, t.reading, ...(t.readingAlt || [])])
            : comprobarEspanol(valor, t.es),
          () => {
            hablar(t.reading || t.kanji);
            return `<div class="feedback-respuesta" lang="ja">${esc(t.kanji)}</div>
                    <div class="feedback-lectura" lang="ja">${esc(t.reading)} · ${esc(t.es)}</div>`;
          });
      }
    }

    function prepararEscrito(comprobarFn, feedbackFn) {
      const input = cont.querySelector('#respuesta');
      const vistaKana = cont.querySelector('#vista-kana');
      input.addEventListener('input', () => {
        const v = input.value.trim();
        vistaKana.textContent = v && !contieneJapones(v) && input.getAttribute('lang') === 'ja' ? `→ ${romajiAHiragana(v)}` : '';
      });
      input.focus();
      const comprobar = () => {
        const correcto = comprobarFn(input.value);
        cont.querySelectorAll('.fila-botones, .campo-respuesta, .vista-kana').forEach(el => el.remove());
        pie(cont.querySelector('.tarjeta'), correcto, feedbackFn());
      };
      cont.querySelector('#btn-comprobar').onclick = comprobar;
      // preventDefault: si no, el mismo Enter pulsa el botón recién enfocado.
      input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); comprobar(); } });
    }

    async function pintarResultado() {
      const pct = sesion.aciertos / items.length;
      const aprobado = pct >= UMBRAL_APROBADO;
      if (aprobado) {
        const r = await api.superarLeccion(codigo).catch(() => null);
        const conq = r && r.ciudadConquistada;
        cont.innerHTML = `
          <div class="zona-repaso"><div class="tarjeta fin-sesion">
            <div class="fin-kanji" lang="ja">合格</div>
            <h2>🏅 ¡Insignia conseguida!</h2>
            <p class="vista-sub" style="margin-top:6px">${sesion.aciertos} de ${items.length} · ${c.emoji} <b>${esc(c.insignia)}</b></p>
            <p class="vista-sub">${esc(c.logro)}</p>
            ${conq ? `<div class="aviso-nivel" style="margin-top:14px">🏯 ¡Y con esto conquistas <b>${esc(conq.nombre)}</b> entera!</div>` : ''}
            ${r && r.nueva ? '<p class="vista-sub">🎫 +1 billete de Shinkansen</p>' : ''}
            <p class="vista-sub">Rumbo al mapa...</p>
          </div></div>`;
        sessionStorage.setItem('kotoba-conquista', codigo);
        if (conq) sessionStorage.setItem('kotoba-ciudad-conq', conq.id);
        sessionStorage.setItem('kotoba-sel', c.ciudadId);
        setTimeout(() => { location.hash = '#viaje'; }, conq ? 2200 : 1500);
      } else {
        cont.innerHTML = `
          <div class="zona-repaso"><div class="tarjeta fin-sesion">
            <div class="fin-kanji" lang="ja">もう一度</div>
            <h2>Casi: ${sesion.aciertos} de ${items.length}</h2>
            <p class="vista-sub" style="margin-top:6px">Necesitas un ${Math.round(UMBRAL_APROBADO * 100)}% para superar la lección. Nada se pierde: repásala y vuelve a intentarlo.</p>
            <div class="fila-botones" style="justify-content:center">
              <button class="boton boton-primario" id="btn-reintentar">Reintentar</button>
              <button class="boton boton-secundario" id="btn-teoria-otra">Repasar la teoría</button>
              <button class="boton boton-secundario" id="btn-lista">Todas las lecciones</button>
            </div>
          </div></div>`;
        cont.querySelector('#btn-reintentar').onclick = () => pintarPractica(codigo);
        cont.querySelector('#btn-teoria-otra').onclick = () => pintarTeoria(codigo);
        cont.querySelector('#btn-lista').onclick = pintarLista;
      }
    }

    pintarItem();
  }

  if (abrir && porCodigo[abrir]) pintarTeoria(abrir);
  else pintarLista();
}
