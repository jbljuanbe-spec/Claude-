// Enrutado por hash + arranque.
import { api } from './api.js';
import { vistaRepaso } from './review.js';
import { vistaEjercicios } from './exercises.js';
import { vistaBiblioteca } from './library.js';
import { vistaProgreso } from './dashboard.js';

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
  repaso: () => vistaRepaso(vista, refrescarBadge),
  ejercicios: () => vistaEjercicios(vista),
  biblioteca: () => vistaBiblioteca(vista, avisar, refrescarBadge),
  progreso: () => vistaProgreso(vista)
};

function enrutar() {
  const nombre = (location.hash || '#repaso').slice(1);
  const render = RUTAS[nombre] || RUTAS.repaso;
  document.querySelectorAll('.navegacion a').forEach(a => {
    a.classList.toggle('activa', a.dataset.vista === (RUTAS[nombre] ? nombre : 'repaso'));
  });
  render().catch(e => {
    vista.innerHTML = `<p class="vista-sub">Algo ha fallado: ${e.message}. Recarga la página o revisa que el servidor esté corriendo.</p>`;
  });
}

window.addEventListener('hashchange', enrutar);
enrutar();
refrescarBadge();
