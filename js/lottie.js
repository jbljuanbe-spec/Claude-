// Carga perezosa de animaciones Lottie (lottie_light vendorizado, sin CDN).
// Las animaciones solo se descargan cuando su vista las necesita.
let cargando = null;

function cargarLibreria() {
  if (window.lottie) return Promise.resolve();
  if (cargando) return cargando;
  cargando = new Promise((resolver, rechazar) => {
    const s = document.createElement('script');
    s.src = 'vendor/lottie_light.min.js';
    s.onload = () => resolver();
    s.onerror = () => rechazar(new Error('No se pudo cargar el reproductor de animaciones'));
    document.head.appendChild(s);
  });
  return cargando;
}

const RUTAS = {
  matcha: 'assets/lottie/matcha.json',
  conejos: 'assets/lottie/conejos.json',
  japon: 'assets/lottie/japon.json',
  shiba: 'assets/lottie/shiba.json'
};

export async function animar(contenedor, nombre, opciones = {}) {
  if (!contenedor || !RUTAS[nombre]) return null;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  try {
    await cargarLibreria();
    return window.lottie.loadAnimation({
      container: contenedor,
      renderer: 'svg',
      loop: opciones.loop !== false,
      autoplay: true,
      path: RUTAS[nombre]
    });
  } catch {
    return null; // sin animación no pasa nada, la app sigue
  }
}
