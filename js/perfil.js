// 🏆 Perfil y estadísticas: nivel, racha protegida, medallas, tarjetas
// sanguijuela, actividad y copia de seguridad. Nada de esto baja nunca.
import { api } from './api.js';
import { TIERS, CIUDADES } from './ciudades.js';

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
  cont.innerHTML = '<p class="vista-sub">Cargando perfil...</p>';
  const { resumen, racha, hoy, ultimos14, lecciones, juego, sanguijuelas } = await api.perfil();

  const totalHoy = hoy.repasos + hoy.ejercicios;
  const maxActividad = Math.max(1, ...ultimos14.map(d => d.n));
  const dias = [...ultimos14].reverse();
  const nivel = juego.nivel;
  const superadas = new Set(juego.superadas || []);
  const ciudadesConq = new Set(juego.ciudadesConquistadas || []);
  const fechas = juego.fechas || {};

  // Galería de insignias locales: una por hito (lección), agrupada por ciudad.
  const totalHitos = CIUDADES.reduce((n, c) => n + c.hitos.length, 0);
  const ganadas = CIUDADES.reduce((n, c) => n + c.hitos.filter(h => superadas.has(h.codigo)).length, 0);

  const galeria = CIUDADES.map(ciudad => {
    const conq = ciudadesConq.has(ciudad.id);
    const cartas = ciudad.hitos.map(h => {
      const tiene = superadas.has(h.codigo);
      const tiers = TIERS.filter(t => juego.insignias.includes(`${h.codigo}:${t.id}`));
      return `
        <div class="insignia-card ${tiene ? 'ganada' : ''}" title="${tiene ? esc(h.logro) : 'Aún por conquistar'}">
          <div class="insignia-medalla">${tiene ? h.emoji : '🔒'}</div>
          <div class="insignia-nombre">${esc(h.insignia)}</div>
          <div class="insignia-sub">${tiene ? (fechas[h.codigo] ? fechaCorta(fechas[h.codigo]) : 'Conquistada') : esc(h.tipo)}</div>
          ${tiers.length ? `<div class="insignia-tiers">${tiers.map(t => t.icono).join('')}</div>` : ''}
        </div>`;
    }).join('');
    return `
      <div class="galeria-ciudad">
        <div class="galeria-ciudad-cab">
          <span>${conq ? '🏯' : ciudad.emoji} <b>${esc(ciudad.nombre)}</b> <span lang="ja" style="color:var(--tinta-tenue)">${esc(ciudad.kanji)}</span></span>
          ${conq ? '<span class="chip chip-superada">★ Conquistada</span>' : ''}
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

  cont.innerHTML = `
    <h1 class="vista-titulo">🏆 Perfil</h1>
    <p class="vista-sub">Tu historial de viajero. Nada de lo ganado se pierde nunca.</p>

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
