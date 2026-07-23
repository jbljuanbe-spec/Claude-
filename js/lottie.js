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
  shiba: 'assets/lottie/shiba.json',
  shinkansen: 'assets/lottie/shinkansen.json'
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

// Transición a pantalla completa: reproduce una animación una vez y resuelve
// al terminar. Si no hay animación (reduced-motion o fallo), no bloquea.
export async function transicion(nombre, opciones = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!RUTAS[nombre]) return;
  const capa = document.createElement('div');
  capa.className = 'transicion-lottie';
  const caja = document.createElement('div');
  caja.className = 'transicion-lottie-anim';
  capa.appendChild(caja);
  document.body.appendChild(capa);
  requestAnimationFrame(() => capa.classList.add('visible'));
  await new Promise(resolver => {
    let hecho = false;
    const fin = () => { if (!hecho) { hecho = true; resolver(); } };
    animar(caja, nombre, { loop: false }).then(anim => {
      if (!anim) return fin();
      anim.addEventListener('complete', fin);
    }).catch(fin);
    setTimeout(fin, opciones.maxMs || 4500); // salvaguarda por si algo falla
  });
  capa.classList.remove('visible');
  await new Promise(r => setTimeout(r, 280));
  capa.remove();
}
