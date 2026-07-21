// Progreso: racha, actividad, dominadas por lección y próximo repaso.
import { api } from './api.js';

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatearProximo(ts) {
  if (!ts) return 'nada programado';
  const d = new Date(ts);
  const hoy = new Date();
  const esHoy = d.toDateString() === hoy.toDateString();
  const manana = new Date(hoy); manana.setDate(hoy.getDate() + 1);
  const esManana = d.toDateString() === manana.toDateString();
  const hora = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  if (esHoy) return `hoy a las ${hora}`;
  if (esManana) return `mañana a las ${hora}`;
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) + ` a las ${hora}`;
}

export async function vistaProgreso(cont) {
  cont.innerHTML = '<p class="vista-sub">Cargando progreso...</p>';
  const { resumen, racha, hoy, ultimos14, lecciones } = await api.dashboard();

  const totalHoy = hoy.repasos + hoy.ejercicios;
  const maxActividad = Math.max(1, ...ultimos14.map(d => d.n));
  const dias = [...ultimos14].reverse();

  const filasLeccion = Object.entries(resumen.porLeccion)
    .sort(([a], [b]) => {
      if (a === 'General') return 1;
      if (b === 'General') return -1;
      return a.localeCompare(b, 'es', { numeric: true });
    })
    .map(([cod, l]) => {
      const pctDom = (l.dominadas / l.total) * 100;
      const pctApr = (l.aprendiendo / l.total) * 100;
      return `
        <div class="fila-leccion">
          <div class="fila-leccion-cab">
            <b>${esc(cod)} · ${esc(lecciones[cod] || '')}</b>
            <span>${l.dominadas} dominadas · ${l.aprendiendo} en estudio · ${l.nuevas} nuevas</span>
          </div>
          <div class="barra-leccion">
            <div class="seg-dominadas" style="width:${pctDom}%"></div>
            <div class="seg-aprendiendo" style="width:${pctApr}%"></div>
          </div>
        </div>`;
    }).join('');

  cont.innerHTML = `
    <h1 class="vista-titulo">Progreso</h1>
    <p class="vista-sub">Tu estudio de un vistazo.</p>

    <div class="rejilla-stats">
      <div class="stat-caja">
        <b>${racha} ${racha === 1 ? 'día' : 'días'}</b>
        <span>racha de estudio</span>
        <div class="stat-detalle">${racha > 0 ? 'Sigue así, no la rompas' : 'Estudia hoy para empezar una'}</div>
      </div>
      <div class="stat-caja">
        <b>${totalHoy}</b>
        <span>respuestas hoy</span>
        <div class="stat-detalle">${hoy.repasos} repasos · ${hoy.ejercicios} ejercicios</div>
      </div>
      <div class="stat-caja">
        <b>${resumen.pendientesAhora}</b>
        <span>pendientes ahora</span>
        <div class="stat-detalle">${resumen.pendientesAhora > 0 ? 'Te esperan en Repaso' : `Próximo repaso: ${formatearProximo(resumen.proximoDue)}`}</div>
      </div>
      <div class="stat-caja">
        <b>${resumen.dominadas} / ${resumen.total}</b>
        <span>tarjetas dominadas</span>
        <div class="stat-detalle">${resumen.nuevas} aún sin empezar</div>
      </div>
    </div>

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

    <h2 class="seccion-titulo">Por lección</h2>
    ${filasLeccion || '<p class="vista-sub">Aún no hay contenido importado.</p>'}
  `;
}
