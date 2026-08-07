// Dibuja la tarjeta final en un canvas y la descarga como PNG
// (en móvil intenta compartirla como archivo, que es lo cómodo).
import { spriteUrl } from './datos.js?v=3';

const A = 1080, ALTO = 1600;

const cargar = src => new Promise(res => {
  const i = new Image();
  i.onload = () => res(i);
  i.onerror = () => res(null);
  i.src = src;
});

function texto(c, t, x, y, { tam = 32, fuente = 'Space Grotesk', color = '#171b2e', peso = '400', centro = false, maxAncho = 0 } = {}) {
  c.font = `${peso} ${tam}px "${fuente}", sans-serif`;
  c.fillStyle = color;
  c.textAlign = centro ? 'center' : 'left';
  if (maxAncho) {
    let s = t;
    while (c.measureText(s).width > maxAncho && s.length > 4) s = s.slice(0, -2);
    if (s !== t) s = s.slice(0, -1) + '…';
    c.fillText(s, x, y);
  } else c.fillText(t, x, y);
  c.textAlign = 'left';
}

function caja(c, x, y, an, al, r, relleno, borde) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + an, y, x + an, y + al, r);
  c.arcTo(x + an, y + al, x, y + al, r);
  c.arcTo(x, y + al, x, y, r);
  c.arcTo(x, y, x + an, y, r);
  c.closePath();
  if (relleno) { c.fillStyle = relleno; c.fill(); }
  if (borde) { c.strokeStyle = borde; c.lineWidth = 2; c.stroke(); }
}

export async function descargarTarjeta(estado, { pts, rango, premios, equipo, apodo }) {
  try { await document.fonts.ready; } catch { /* da igual */ }

  const cv = document.createElement('canvas');
  cv.width = A; cv.height = ALTO;
  const c = cv.getContext('2d');

  // Fondo
  const g = c.createLinearGradient(0, 0, 0, ALTO);
  g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e8ecf7');
  c.fillStyle = g; c.fillRect(0, 0, A, ALTO);
  c.fillStyle = '#e94b5c'; c.fillRect(0, 0, A, 12);

  let y = 92;
  texto(c, 'CONVIÉRTETE EN LEYENDA', A / 2, y, { tam: 26, fuente: 'Silkscreen', color: '#8b93b0', centro: true });
  y += 78;
  texto(c, rango.emoji, A / 2, y + 14, { tam: 78, centro: true });
  y += 92;
  texto(c, rango.titulo, A / 2, y, { tam: 64, fuente: 'Pixelify Sans', peso: '700', centro: true });
  y += 52;
  texto(c, `${estado.nombre} "${apodo}" · ${estado.regionNombre}`, A / 2, y, { tam: 32, color: '#6c7391', centro: true });
  y += 42;
  texto(c, `${estado.año} temporadas · retirado a los ${estado.edad}`, A / 2, y, { tam: 28, color: '#6c7391', centro: true });

  // Media y legado
  y += 46;
  const anchoCaja = 460;
  caja(c, A / 2 - anchoCaja - 12, y, anchoCaja, 150, 22, '#171b2e');
  caja(c, A / 2 + 12, y, anchoCaja, 150, 22, '#f5a524');
  texto(c, String(Math.round(estado.media)), A / 2 - anchoCaja / 2 - 12, y + 96, { tam: 78, fuente: 'Pixelify Sans', peso: '700', color: '#fff', centro: true });
  texto(c, 'MEDIA FINAL', A / 2 - anchoCaja / 2 - 12, y + 128, { tam: 22, fuente: 'Silkscreen', color: '#b9c0d8', centro: true });
  texto(c, String(pts), A / 2 + anchoCaja / 2 + 12, y + 96, { tam: 78, fuente: 'Pixelify Sans', peso: '700', color: '#fff', centro: true });
  texto(c, 'LEGADO', A / 2 + anchoCaja / 2 + 12, y + 128, { tam: 22, fuente: 'Silkscreen', color: '#fff6e0', centro: true });
  y += 196;

  // Récords
  const datos = [
    ['Títulos', estado.titulos.length], ['Medallas', `${estado.medallas}/8`], ['Mundiales', estado.mundiales],
    ['Victorias', estado.victorias], ['Derrotas', estado.derrotas], ['Fortuna', `${Math.round(estado.dinero / 1000)}k`],
  ];
  const anCol = (A - 120) / 3;
  datos.forEach((d, i) => {
    const cx = 60 + (i % 3) * anCol, cy = y + Math.floor(i / 3) * 118;
    caja(c, cx + 6, cy, anCol - 12, 102, 18, '#ffffff', '#dfe4f0');
    texto(c, String(d[1]), cx + anCol / 2, cy + 56, { tam: 44, fuente: 'Pixelify Sans', peso: '700', centro: true });
    texto(c, d[0].toUpperCase(), cx + anCol / 2, cy + 84, { tam: 19, fuente: 'Silkscreen', color: '#8b93b0', centro: true });
  });
  y += 254;

  // Equipo
  texto(c, 'EQUIPO FINAL', 60, y, { tam: 22, fuente: 'Silkscreen', color: '#8b93b0' });
  y += 26;
  const sprites = await Promise.all(equipo.slice(0, 6).map(p => cargar(spriteUrl(p.dex))));
  const anP = (A - 120) / 6;
  sprites.forEach((sp, i) => {
    const cx = 60 + i * anP;
    caja(c, cx + 4, y, anP - 8, 176, 16, '#ffffff', '#dfe4f0');
    if (sp) { c.imageSmoothingEnabled = false; c.drawImage(sp, cx + anP / 2 - 48, y + 8, 96, 96); }
    texto(c, equipo[i].nombre, cx + anP / 2, y + 132, { tam: 20, fuente: 'Pixelify Sans', peso: '700', centro: true, maxAncho: anP - 16 });
    texto(c, `NIVEL ${Math.round(equipo[i].nivel)}`, cx + anP / 2, y + 158, { tam: 16, fuente: 'Silkscreen', color: '#8b93b0', centro: true });
  });
  y += 226;

  // Premios
  texto(c, `PREMIOS (${premios.length})`, 60, y, { tam: 22, fuente: 'Silkscreen', color: '#8b93b0' });
  y += 24;
  premios.slice(0, 8).forEach((p, i) => {
    const cx = 60 + (i % 2) * ((A - 120) / 2), cy = y + Math.floor(i / 2) * 86;
    const an = (A - 120) / 2 - 12;
    caja(c, cx, cy, an, 74, 14, '#ffffff', '#dfe4f0');
    c.fillStyle = '#f5a524'; c.fillRect(cx, cy + 8, 5, 58);
    texto(c, p.emoji, cx + 24, cy + 48, { tam: 34 });
    texto(c, p.nombre, cx + 74, cy + 36, { tam: 26, fuente: 'Pixelify Sans', peso: '700', maxAncho: an - 92 });
    texto(c, p.desc, cx + 74, cy + 62, { tam: 19, color: '#8b93b0', maxAncho: an - 92 });
  });

  texto(c, 'jbljuanbe-spec.github.io/Claude-/leyenda', A / 2, ALTO - 42, { tam: 22, fuente: 'Silkscreen', color: '#b0b7cd', centro: true });

  const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
  if (!blob) throw new Error('sin blob');
  const archivo = new File([blob], `leyenda-${estado.nombre.replace(/\s+/g, '-').toLowerCase()}.png`, { type: 'image/png' });

  // En móvil, compartir el archivo directamente (se puede guardar en fotos)
  if (navigator.canShare?.({ files: [archivo] })) {
    try { await navigator.share({ files: [archivo], title: 'Mi carrera Pokémon' }); return; } catch { /* sigue a descarga */ }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = archivo.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
