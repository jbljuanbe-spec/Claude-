// MapRenderer: traza la vía principal (curva Bézier suave a través de los hitos
// madre) y reparte las estaciones a lo largo de ella por interpolación.
// El reparto usa getPointAtLength() sobre el <path> real, así que da igual que
// haya 6, 86 o 300 lecciones: el mapa se redistribuye solo.
import { ANCLAS } from './curriculum.js';
import { proyectar } from './mapa-japon.js';

// Catmull-Rom -> Bézier: curva continua y suave que pasa por todos los puntos.
export function caminoBezier() {
  const pts = ANCLAS.map(a => proyectar(a.lat, a.lon));
  if (pts.length < 2) return { d: '', puntos: pts };
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return { d, puntos: pts };
}

// Dado un <path> de la vía ya en el DOM y el número de estaciones a repartir,
// devuelve la posición {x,y} de cada índice (0..n-1) sobre la curva.
export function repartirEstaciones(pathEl, n) {
  const L = pathEl.getTotalLength();
  const d = n > 1 ? L / (n - 1) : 0;
  const pos = [];
  for (let i = 0; i < n; i++) {
    const p = pathEl.getPointAtLength(i * d);
    pos.push({ x: p.x, y: p.y, len: i * d });
  }
  return { posiciones: pos, longitud: L, paso: d };
}

// Etiquetas de región en las anclas que la definen (referencia geográfica suave).
export function etiquetasRegion() {
  return ANCLAS.map(a => a.region ? { ...proyectar(a.lat, a.lon), region: a.region } : null).filter(Boolean);
}
