// 🏆 Perfil y estadísticas: nivel, racha protegida, medallas, tarjetas
// sanguijuela, actividad y copia de seguridad. Nada de esto baja nunca.
import { api } from './api.js';
import { animar } from './lottie.js';

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatearProximo(ts) {
  if (!ts) return 'nada programado';
  const d = new Date(ts);
  const hoy = new Date();
  const manana = new Date(hoy); manana.setDate(hoy.getDate() + 1);
  const hora = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === hoy.toDateString()) return `hoy a las ${hora}`;
  if (d.toDateString() === manana.toDateString()) return `mañana a las ${hora}`;
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) + ` a las ${hora}`;
}

function fechaCorta(ts) {
  return ts ? new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

export async function vistaPerfil(cont, avisar) {
  cont.innerHTML = `
    <div class="perfil-carga">
      <div class="perfil-carga-anim" id="carga-shiba"></div>
      <p class="vista-sub">Cargando tu viaje...</p>
    </div>`;
  animar(cont.querySelector('#carga-shiba'), 'shiba');
  const { resumen, racha, hoy, ultimos14, ciudades, fuji, juego, sanguijuelas } = await api.perfil();

  const totalHoy = hoy.repasos + hoy.ejercicios;
  const maxActividad = Math.max(1, ...ultimos14.map(d => d.n));
  const dias = [...ultimos14].reverse();
  const nivel = juego.nivel;

  // Anillo de progreso semanal, estilo "impact score": respuestas de los últimos 7 días.
  const semana = ultimos14.slice(0, 7).reduce((s, d) => s + d.n, 0);
  const metaSemana = 70;
  const pct = Math.min(1, semana / metaSemana);
  const RAD = 95, CX = 110, CY = 110;
  const CIRC = 2 * Math.PI * RAD;
  const offset = CIRC * (1 - pct);
  const ang = (-90 + 360 * pct) * Math.PI / 180;
  const mkx = CX + RAD * Math.cos(ang), mky = CY + RAD * Math.sin(ang);

  // Galería de insignias locales: una por barrio (lección), agrupada por ciudad.
  const grupos = [...ciudades];
  if (fuji) grupos.push({ nombre: 'Monte Fuji', kanji: fuji.kanji, emoji: fuji.emoji, examenAprobado: false, hitos: [fuji] });
  const totalHitos = grupos.reduce((n, c) => n + c.hitos.length, 0);
  const ganadas = grupos.reduce((n, c) => n + c.hitos.filter(h => h.superado).length, 0);

  const galeria = grupos.map(ciudad => {
    const cartas = ciudad.hitos.map(h => `
      <div class="insignia-card ${h.superado ? 'ganada' : ''}" title="${h.superado ? esc(h.titulo || '') : 'Aún por conquistar'}">
        <div class="insignia-medalla">${h.superado ? h.emoji : '🔒'}</div>
        <div class="insignia-nombre">${esc(h.barrio)}</div>
        <div class="insignia-sub">${h.superado ? (h.fecha ? fechaCorta(h.fecha) : 'Conquistada') : (h.codigo || '')}</div>
      </div>`).join('');
    return `
      <div class="galeria-ciudad">
        <div class="galeria-ciudad-cab">
          <span>${ciudad.examenAprobado ? '🏯' : ciudad.emoji} <b>${esc(ciudad.nombre)}</b> <span lang="ja" style="color:var(--tinta-tenue)">${esc(ciudad.kanji)}</span></span>
          ${ciudad.examenAprobado ? '<span class="chip chip-superada">★ Superada</span>' : ''}
        </div>
        <div class="galeria-insignias">${cartas}</div>
      </div>`;
  }).join('');

  const filasSanguijuelas = sanguijuelas.length ? sanguijuelas.map(s => `
    <div class="fila-sanguijuela">
      <span class="sanguijuela-prompt" lang="ja">${esc(s.prompt)}</span>
      <span class="carta-ciudad-leccion">${esc(s.respuesta)}${s.es ? ' · ' + esc(s.es) : ''}</span>
      <span class="chip chip-sanguijuela" title="Fallos acumulados">${s.fallos} fallos</span>
    </div>`).join('')
    : '<p class="vista-sub" style="margin:0">Ninguna por ahora. Las tarjetas que falles 5 o más veces aparecerán aquí para que las vigiles de cerca.</p>';

  // Misiones activas: acciones reales a partir del estado, al estilo de la referencia.
  const pendientes = resumen.pendientesAhora + resumen.nuevas;
  const ciudadActual = ciudades.find(c => c.hitos.some(h => !h.superado)) || ciudades[ciudades.length - 1];
  const hitosCiudad = ciudadActual ? ciudadActual.hitos.length : 0;
  const hitosHechos = ciudadActual ? ciudadActual.hitos.filter(h => h.superado).length : 0;
  const misiones = `
    <a class="mision-card" href="#repaso">
      <div class="mision-emoji">🈺</div>
      <div class="mision-cuerpo">
        <b>Repaso diario</b>
        <span>${pendientes > 0 ? `${pendientes} tarjeta${pendientes === 1 ? '' : 's'} esperándote` : 'Todo al día, ¡bien!'}</span>
      </div>
      <span class="mision-cta">${pendientes > 0 ? 'Repasar' : 'Ver'}</span>
    </a>
    ${ciudadActual ? `
    <a class="mision-card" href="#lecciones">
      <div class="mision-emoji">${ciudadActual.examenAprobado ? '🏯' : ciudadActual.emoji}</div>
      <div class="mision-cuerpo">
        <b>Sigue en ${esc(ciudadActual.nombre)}</b>
        <span>${hitosHechos} de ${hitosCiudad} barrios conquistados</span>
      </div>
      <span class="mision-cta">Seguir</span>
    </a>` : ''}`;

  cont.innerHTML = `
    <section class="perfil-hero">
      <div class="perfil-hero-top">
        <span class="hero-marca"><span lang="ja">言葉</span> KOTOBA</span>
        <span class="hero-kicker">Puntuación de viaje</span>
        <span class="hero-nivel-pill">Nivel: ${esc(nivel.titulo)}</span>
      </div>
      <div class="hero-anillo">
        <svg viewBox="0 0 220 220" class="anillo-svg" aria-hidden="true">
          <circle class="anillo-pista" cx="${CX}" cy="${CY}" r="${RAD}"></circle>
          <circle class="anillo-fill" cx="${CX}" cy="${CY}" r="${RAD}"
                  stroke-dasharray="${CIRC.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"></circle>
          <circle class="anillo-punta" cx="${mkx.toFixed(1)}" cy="${mky.toFixed(1)}" r="7.5"></circle>
          <text class="anillo-hoja" x="${mkx.toFixed(1)}" y="${(mky + 3.4).toFixed(1)}" text-anchor="middle">🍃</text>
        </svg>
        <div class="hero-centro">
          <span class="hero-pre">Has estudiado</span>
          <span class="hero-num">${semana}</span>
          <span class="hero-post">respuestas esta semana</span>
        </div>
      </div>
    </section>

    <h2 class="seccion-titulo">🎌 Misiones</h2>
    <div class="misiones-rejilla">${misiones}</div>

    <div class="rejilla-stats">
      <div class="stat-caja stat-nivel">
        <div class="nivel-cab">
          <span class="nivel-numero">${nivel.nivel}</span>
          <div>
            <b style="font-size:1.15rem">${esc(nivel.titulo)} <span lang="ja" style="color:var(--acento)">${esc(nivel.kanji)}</span></b>
            <span style="display:block">${nivel.xp} XP ${nivel.xpSiguiente ? `· siguiente nivel a ${nivel.xpSiguiente}` : '· nivel máximo'}</span>
          </div>
        </div>
        <div class="barra-nivel"><div style="width:${Math.round(nivel.haciaSiguiente * 100)}%"></div></div>
      </div>
      <div class="stat-caja">
        <b>${racha} ${racha === 1 ? 'día' : 'días'} 🔥</b>
        <span>racha de estudio</span>
        <div class="stat-detalle">❄️ ${juego.congeladores} ${juego.congeladores === 1 ? 'congelador' : 'congeladores'} (1 cada 4 días activos, máx. 4): se usan solos en días sin actividad</div>
      </div>
      <div class="stat-caja">
        <b>🎫 ${juego.billetes}</b>
        <span>billetes de Shinkansen</span>
        <div class="stat-detalle">Se ganan superando y conquistando ciudades</div>
      </div>
      <div class="stat-caja">
        <b>${resumen.dominadas} / ${resumen.total}</b>
        <span>tarjetas dominadas</span>
        <div class="stat-detalle">${totalHoy} respuestas hoy · ${resumen.pendientesAhora > 0 ? `${resumen.pendientesAhora} pendientes ahora` : `próximo repaso: ${formatearProximo(resumen.proximoDue)}`}</div>
      </div>
    </div>

    <h2 class="seccion-titulo">🏅 Insignias locales <small>${ganadas} de ${totalHitos} conquistadas · una por hito superado</small></h2>
    ${galeria}

    <h2 class="seccion-titulo">🩸 Tarjetas sanguijuela <small>las que más se te resisten</small></h2>
    <div class="stat-caja">${filasSanguijuelas}</div>

    <h2 class="seccion-titulo">Actividad de los últimos 14 días</h2>
    <div class="stat-caja">
      <div class="actividad-mini">
        ${Array.from({ length: 14 }, (_, i) => {
          const d = dias[i - (14 - dias.length)];
          if (!d) return '<div class="actividad-dia vacio" style="height:3px"></div>';
          return `<div class="actividad-dia ${d.n ? '' : 'vacio'}" style="height:${Math.max(6, (d.n / maxActividad) * 100)}%" title="${esc(d.fecha)}: ${d.n}"></div>`;
        }).join('')}
      </div>
    </div>

    <h2 class="seccion-titulo">Copia de seguridad</h2>
    <div class="stat-caja">
      <p style="color:var(--tinta-suave); font-size:0.92rem; margin-bottom:14px">
        Tu progreso vive en este navegador. Descarga una copia de vez en cuando por si cambias
        de navegador o de dispositivo, y restáurala aquí cuando la necesites.
      </p>
      <div class="fila-botones" style="margin-top:0">
        <button class="boton boton-secundario" id="btn-exportar">Descargar copia</button>
        <button class="boton boton-secundario" id="btn-restaurar">Restaurar copia</button>
        <input type="file" id="archivo-copia" accept="application/json" class="oculto">
      </div>
    </div>
  `;

  cont.querySelector('#btn-exportar').onclick = async () => {
    const datos = await api.exportarCopia();
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kotoba-progreso-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const inputArchivo = cont.querySelector('#archivo-copia');
  cont.querySelector('#btn-restaurar').onclick = () => inputArchivo.click();
  inputArchivo.onchange = async () => {
    const archivo = inputArchivo.files[0];
    if (!archivo) return;
    try {
      const datos = JSON.parse(await archivo.text());
      await api.restaurarCopia(datos);
      if (avisar) avisar('Copia restaurada. Tu progreso está de vuelta.');
      vistaPerfil(cont, avisar);
    } catch (e) {
      if (avisar) avisar(e.message);
    }
  };
}
