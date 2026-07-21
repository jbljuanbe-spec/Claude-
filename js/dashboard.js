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

export async function vistaProgreso(cont, avisar) {
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
      vistaProgreso(cont, avisar);
    } catch (e) {
      if (avisar) avisar(e.message);
    }
  };
}
