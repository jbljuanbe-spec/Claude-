// Enrutado por hash + arranque. Cuatro pestañas independientes:
// El Viaje (mapa), Lecciones (teoría + ejercicios), Repaso (SRS) y Perfil.
import { api } from './api.js';
import { vistaRepaso } from './review.js';
import { vistaLecciones } from './lecciones.js';
import { vistaViaje } from './viaje.js';
import { vistaPerfil } from './perfil.js';
import { vistaVocabulario } from './vocabulario.js';

const vista = document.getElementById('vista');
const badge = document.getElementById('badge-pendientes');
const toast = document.getElementById('toast');
let toastTimer = null;

function avisar(mensaje) {
  toast.textContent = mensaje;
  toast.classList.remove('oculto');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('oculto'), 4200);
}

async function refrescarBadge() {
  try {
    const { resumen } = await api.estado();
    const n = resumen.pendientesAhora + resumen.nuevas;
    badge.textContent = n > 99 ? '99+' : n;
    badge.classList.toggle('oculto', n === 0);
  } catch { /* sin red no pasa nada */ }
}

const RUTAS = {
  viaje: () => vistaViaje(vista, avisar),
  lecciones: () => vistaLecciones(vista, avisar, refrescarBadge),
  vocabulario: () => vistaVocabulario(vista, avisar, refrescarBadge),
  repaso: () => vistaRepaso(vista, refrescarBadge),
  perfil: () => vistaPerfil(vista, avisar)
};

// Rutas antiguas que siguen funcionando.
const ALIAS = { progreso: 'viaje', biblioteca: 'lecciones', ejercicios: 'lecciones' };

function enrutar() {
  let nombre = (location.hash || '#viaje').slice(1);
  if (ALIAS[nombre]) nombre = ALIAS[nombre];
  const render = RUTAS[nombre] || RUTAS.viaje;
  document.querySelectorAll('.navegacion a').forEach(a => {
    a.classList.toggle('activa', a.dataset.vista === (RUTAS[nombre] ? nombre : 'viaje'));
  });
  render().catch(e => {
    vista.innerHTML = `<p class="vista-sub">Algo ha fallado: ${e.message}. Recarga la página o revisa tu conexión.</p>`;
  });
}

window.addEventListener('hashchange', enrutar);
enrutar();
refrescarBadge();
