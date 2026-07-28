// 📇 Vocabulario — "Gimnasio": 30 palabras nuevas al día, en 3 series de 10.
// Sencillo y eficaz: aprende las 10, entrénalas hasta clavarlas. Al clavarlas
// entran en el SRS (no se olvidan). Se renueva cada día.
import { api } from './api.js';
import { hablar } from './tts.js';

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const CLAVE = 'kotoba-gym';
function estadoDia(fecha, nSeries) {
  try {
    const o = JSON.parse(localStorage.getItem(CLAVE) || '{}');
    if (o.fecha === fecha && Array.isArray(o.series)) return o;
  } catch { /* nada */ }
  return { fecha, series: Array(nSeries).fill(false) };
}
function guardarDia(st) { try { localStorage.setItem(CLAVE, JSON.stringify(st)); } catch { /* nada */ } }

export async function vistaVocabulario(cont, avisar, refrescarBadge) {
  cont.innerHTML = '<p class="vista-sub">Preparando el gimnasio...</p>';
  const { fecha, cartas, restantesNuevas } = await api.vocabularioDia(30);

  const series = [];
  for (let i = 0; i < cartas.length; i += 10) series.push(cartas.slice(i, i + 10));
  const st = estadoDia(fecha, Math.max(series.length, 1));

  function pintarInicio() {
    if (!cartas.length) {
      cont.innerHTML = `
        <h1 class="vista-titulo">📇 Vocabulario</h1>
        <p class="vista-sub">Gimnasio de japonés. 30 palabras nuevas cada día, en series de 10.</p>
        <div class="tarjeta" style="text-align:center">
          <div class="fin-kanji" lang="ja">満点</div>
          <h2>¡No quedan palabras nuevas!</h2>
          <p class="vista-sub" style="margin-top:6px">Has abierto todo el vocabulario disponible. Consolídalo en <b>⚔️ Repaso</b>; cuando se añada contenido nuevo, volverá a llenarse.</p>
        </div>`;
      return;
    }
    const hechas = st.series.filter(Boolean).length;
    const tarjetas = series.map((grupo, i) => {
      const done = st.series[i];
      const desde = i * 10 + 1, hasta = i * 10 + grupo.length;
      return `
        <div class="gym-serie ${done ? 'hecha' : ''}">
          <div class="gym-serie-num">${done ? '✅' : i + 1}</div>
          <div class="gym-serie-cuerpo">
            <b>Serie ${i + 1}</b>
            <span>Palabras ${desde}–${hasta}${done ? ' · completada' : ''}</span>
          </div>
          <button class="boton ${done ? 'boton-secundario' : 'boton-primario'} btn-serie" data-i="${i}" style="padding:9px 16px">${done ? 'Repetir' : 'Entrenar'}</button>
        </div>`;
    }).join('');
    cont.innerHTML = `
      <h1 class="vista-titulo">📇 Vocabulario</h1>
      <p class="vista-sub">Gimnasio de japonés: <b>${cartas.length} palabras nuevas hoy</b> en ${series.length} serie${series.length === 1 ? '' : 's'} de 10. Se renueva cada día. Quedan ${restantesNuevas} palabras nuevas por descubrir.</p>
      <div class="gym-progreso"><div class="gym-progreso-barra"><div style="width:${(hechas / series.length) * 100}%"></div></div><span>${hechas} de ${series.length} series hoy</span></div>
      <div class="gym-series">${tarjetas}</div>
      ${hechas === series.length ? '<div class="aviso-nivel" style="margin-top:20px">🏆 ¡Entrenamiento del día completado! Vuelve mañana por 30 nuevas.</div>' : ''}`;
    cont.querySelectorAll('.btn-serie').forEach(b => b.onclick = () => entrenarSerie(+b.dataset.i));
  }

  function botonSalir() {
    const b = cont.querySelector('#btn-salir-gym');
    if (b) b.onclick = pintarInicio;
  }

  // ---- Fase 1: aprender las 10 ----
  function entrenarSerie(idx) {
    const grupo = series[idx];
    let pos = 0;
    function pintarAprende() {
      const c = grupo[pos];
      cont.innerHTML = `
        <div class="zona-repaso">
          <div class="repaso-meta">
            <span>💪 Serie ${idx + 1} · Aprende ${pos + 1}/${grupo.length}</span>
            <div class="barra-progreso"><div style="width:${(pos / grupo.length) * 100}%"></div></div>
            <button class="boton-enlace" id="btn-salir-gym">Salir</button>
          </div>
          <div class="tarjeta" style="text-align:center">
            <div class="kanji-grande" lang="ja">${esc(c.kanji)}</div>
            <div class="gym-lectura" lang="ja">${esc(c.reading || '')}</div>
            <div class="gym-significado">${esc(c.es || '')}</div>
            <div class="fila-audio" style="justify-content:center">
              <button class="boton-audio" id="btn-oir">&#128266;</button>
            </div>
            <div class="fila-botones" style="justify-content:center">
              <button class="boton boton-primario" id="btn-sig">${pos + 1 < grupo.length ? 'Siguiente' : 'Entrenar estas 10'}</button>
            </div>
          </div>
        </div>`;
      hablar(c.reading || c.kanji);
      cont.querySelector('#btn-oir').onclick = () => hablar(c.reading || c.kanji);
      cont.querySelector('#btn-sig').onclick = () => { pos++; if (pos < grupo.length) pintarAprende(); else pintarEntrena(); };
      botonSalir();
    }

    // ---- Fase 2: entrenar (recuerdo + autoeval, repite hasta clavarlas) ----
    function pintarEntrena() {
      const cola = [...grupo];
      let clavadas = 0;
      const total = grupo.length;
      function siguiente() {
        if (!cola.length) return fin();
        const c = cola[0];
        cont.innerHTML = `
          <div class="zona-repaso">
            <div class="repaso-meta">
              <span>🏋️ Serie ${idx + 1} · Entrena</span>
              <div class="barra-progreso"><div style="width:${(clavadas / total) * 100}%"></div></div>
              <button class="boton-enlace" id="btn-salir-gym">Salir</button>
            </div>
            <div class="tarjeta" style="text-align:center">
              <div class="tarjeta-instruccion">¿Cómo se dice en japonés?</div>
              <div class="gym-significado grande">${esc(c.es || '')}</div>
              <div class="gym-revelado oculto" id="revelado">
                <div class="kanji-grande" lang="ja">${esc(c.kanji)}</div>
                <div class="gym-lectura" lang="ja">${esc(c.reading || '')}</div>
              </div>
              <div class="fila-botones" style="justify-content:center" id="zona-acc">
                <button class="boton boton-primario" id="btn-mostrar">Mostrar</button>
              </div>
            </div>
          </div>`;
        botonSalir();
        cont.querySelector('#btn-mostrar').onclick = () => {
          cont.querySelector('#revelado').classList.remove('oculto');
          hablar(c.reading || c.kanji);
          cont.querySelector('#zona-acc').innerHTML = `
            <button class="boton boton-secundario" id="btn-repasar">🔁 Repasar</button>
            <button class="boton boton-exito" id="btn-sabia">✅ La sabía</button>`;
          cont.querySelector('#btn-repasar').onclick = () => { cola.push(cola.shift()); siguiente(); };
          cont.querySelector('#btn-sabia').onclick = async () => {
            cola.shift(); clavadas++;
            api.responder(c.id, 'bien').catch(() => {});
            siguiente();
          };
        };
      }
      async function fin() {
        st.series[idx] = true; guardarDia(st);
        if (refrescarBadge) refrescarBadge();
        cont.innerHTML = `
          <div class="zona-repaso"><div class="tarjeta fin-sesion" style="text-align:center">
            <div class="fin-kanji" lang="ja">合格</div>
            <h2>💪 Serie ${idx + 1} completada</h2>
            <p class="vista-sub" style="margin-top:6px">${total} palabras entrenadas y metidas en tu repaso. No se te olvidarán si sigues repasando.</p>
            <div class="fila-botones" style="justify-content:center">
              <button class="boton boton-primario" id="btn-seguir">Seguir</button>
            </div>
          </div></div>`;
        cont.querySelector('#btn-seguir').onclick = pintarInicio;
      }
      siguiente();
    }

    pintarAprende();
  }

  pintarInicio();
}
