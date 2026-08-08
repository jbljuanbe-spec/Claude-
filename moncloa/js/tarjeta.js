// Dibuja la tarjeta final en un canvas y la descarga como PNG
// (en móvil intenta compartirla como archivo, que es lo cómodo).

const A = 1080, ALTO = 1600;

function texto(c, t, x, y, { tam = 32, fuente = 'Space Grotesk', color = '#14161f', peso = '400', centro = false, maxAncho = 0 } = {}) {
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

export async function descargarTarjeta(estado, { pts, rango, premios, apodo, partido }) {
  try { await document.fonts.ready; } catch { /* da igual */ }

  const cv = document.createElement('canvas');
  cv.width = A; cv.height = ALTO;
  const c = cv.getContext('2d');

  // Fondo: blanco roto con la franja del partido arriba. El color de tu último
  // partido es lo primero que se ve al compartir la imagen.
  const g = c.createLinearGradient(0, 0, 0, ALTO);
  g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#eef0f6');
  c.fillStyle = g; c.fillRect(0, 0, A, ALTO);
  c.fillStyle = partido.color2; c.fillRect(0, 0, A, 150);
  c.fillStyle = partido.color; c.fillRect(0, 150, A, 14);

  texto(c, 'A LA MONCLOA EN CERCANÍAS', A / 2, 68, { tam: 24, fuente: 'Silkscreen', color: 'rgba(255,255,255,.72)', centro: true });
  texto(c, `${partido.emoji}  ${partido.nombre}`, A / 2, 118, { tam: 38, peso: '700', color: '#fff', centro: true });

  let y = 250;
  texto(c, rango.emoji, A / 2, y, { tam: 78, centro: true });
  y += 76;
  texto(c, rango.titulo, A / 2, y, { tam: 58, peso: '700', centro: true, maxAncho: A - 90 });
  y += 48;
  texto(c, `${estado.nombre} “${apodo}”`, A / 2, y, { tam: 30, color: '#5c6376', centro: true, maxAncho: A - 120 });
  y += 38;
  texto(c, `${estado.año} años en política · retirado a los ${estado.edad}`, A / 2, y, { tam: 26, color: '#7b8296', centro: true });

  // Peso político y legado
  y += 40;
  const anchoCaja = 456;
  caja(c, A / 2 - anchoCaja - 12, y, anchoCaja, 148, 22, '#14161f');
  caja(c, A / 2 + 12, y, anchoCaja, 148, 22, partido.color);
  texto(c, String(Math.round(estado.media)), A / 2 - anchoCaja / 2 - 12, y + 94, { tam: 74, peso: '700', color: '#fff', centro: true });
  texto(c, 'PESO POLÍTICO', A / 2 - anchoCaja / 2 - 12, y + 126, { tam: 20, fuente: 'Silkscreen', color: 'rgba(255,255,255,.66)', centro: true });
  texto(c, String(pts), A / 2 + anchoCaja / 2 + 12, y + 94, { tam: 74, peso: '700', color: '#fff', centro: true });
  texto(c, 'LEGADO', A / 2 + anchoCaja / 2 + 12, y + 126, { tam: 20, fuente: 'Silkscreen', color: 'rgba(255,255,255,.78)', centro: true });
  y += 194;

  // Récords
  const datos = [
    ['Investiduras', estado.presidencias], ['Ministerios', estado.ministerios.length], ['Escaños', estado.escanos],
    ['Leyes', estado.leyes.length], ['Cambios', estado.transfuguismos], ['Patrimonio', `${Math.round(estado.dinero / 1000)}k`],
  ];
  const anCol = (A - 120) / 3;
  datos.forEach((d, i) => {
    const cx = 60 + (i % 3) * anCol, cy = y + Math.floor(i / 3) * 116;
    caja(c, cx + 6, cy, anCol - 12, 100, 18, '#ffffff', '#dfe3ee');
    texto(c, String(d[1]), cx + anCol / 2, cy + 55, { tam: 42, peso: '700', centro: true });
    texto(c, d[0].toUpperCase(), cx + anCol / 2, cy + 82, { tam: 17, fuente: 'Silkscreen', color: '#8b93a8', centro: true });
  });
  y += 250;

  // Últimas votaciones: la hoja de votos es la biografía real de un político
  texto(c, 'ÚLTIMAS VOTACIONES', 60, y, { tam: 21, fuente: 'Silkscreen', color: '#8b93a8' });
  y += 24;
  const votos = estado.leyes.slice(-5);
  if (!votos.length) {
    caja(c, 60, y, A - 120, 62, 14, '#ffffff', '#dfe3ee');
    texto(c, 'Nunca llegaste a votar una ley en el Congreso.', 82, y + 39, { tam: 24, color: '#8b93a8' });
    y += 78;
  } else {
    votos.forEach((l, i) => {
      const cy = y + i * 64;
      caja(c, 60, cy, A - 120, 56, 14, '#ffffff', '#dfe3ee');
      const col = l.sentido === 'favor' ? '#17a673' : l.sentido === 'contra' ? '#d63b4b' : '#8b93a8';
      caja(c, 74, cy + 10, 74, 36, 8, col);
      texto(c, l.sentido === 'favor' ? 'SÍ' : l.sentido === 'contra' ? 'NO' : 'ABS', 111, cy + 36, { tam: 22, peso: '700', color: '#fff', centro: true });
      texto(c, l.nombre, 166, cy + 30, { tam: 23, peso: '700', maxAncho: A - 400 });
      texto(c, l.aprobada ? 'aprobada' : 'decayó', A - 84, cy + 30, { tam: 20, color: '#8b93a8', centro: true });
    });
    y += votos.length * 64 + 14;
  }

  // Logros
  texto(c, `LOGROS (${premios.length})`, 60, y, { tam: 21, fuente: 'Silkscreen', color: '#8b93a8' });
  y += 22;
  premios.slice(0, 6).forEach((p, i) => {
    const cx = 60 + (i % 2) * ((A - 120) / 2), cy = y + Math.floor(i / 2) * 84;
    const an = (A - 120) / 2 - 12;
    caja(c, cx, cy, an, 72, 14, '#ffffff', '#dfe3ee');
    c.fillStyle = partido.color; c.fillRect(cx, cy + 8, 5, 56);
    texto(c, p.emoji, cx + 22, cy + 46, { tam: 32 });
    texto(c, p.nombre, cx + 70, cy + 34, { tam: 24, peso: '700', maxAncho: an - 88 });
    texto(c, p.desc, cx + 70, cy + 58, { tam: 18, color: '#8b93a8', maxAncho: an - 88 });
  });

  // Pie: la firma que viaja con la imagen y el dominio real donde esté alojado
  // el juego, sin URLs escritas a fuego.
  const dominio = (location.host + location.pathname).replace(/\/index\.html$/, '').replace(/\/$/, '');
  texto(c, '🚉 Llegó con retraso, pero llegó', A / 2, ALTO - 62, { tam: 26, color: '#7b8296', centro: true });
  if (dominio) texto(c, dominio, A / 2, ALTO - 28, { tam: 19, fuente: 'Silkscreen', color: '#aab0c0', centro: true });

  const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
  if (!blob) throw new Error('sin blob');
  const archivo = new File([blob], `carrera-${estado.nombre.replace(/\s+/g, '-').toLowerCase()}.png`, { type: 'image/png' });

  // En móvil, compartir el archivo directamente (se puede guardar en fotos)
  if (navigator.canShare?.({ files: [archivo] })) {
    try { await navigator.share({ files: [archivo], title: 'Mi carrera política' }); return; } catch { /* sigue a descarga */ }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = archivo.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
