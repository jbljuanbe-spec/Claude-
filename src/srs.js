// Motor de repetición espaciada (SM-2 adaptado).
// - Acierto: el intervalo crece multiplicado por el ease de la tarjeta.
// - Fallo: el intervalo se resetea a minutos, el ease baja, y la tarjeta vuelve pronto.
// - Las dominadas se espacian mucho (tope INTERVALO_MAX) pero nunca desaparecen.
const { db } = require('./db');

const MIN = 60 * 1000;
const DIA = 24 * 60 * 60 * 1000;
const EASE_MIN = 1.3;
const EASE_MAX = 3.0;
const INTERVALO_MAX = 180;      // días
const PASO_FALLO_MIN = 5;       // minutos hasta reintentar tras fallo
const PASO_NUEVA_MIN = 10;      // minutos tras el primer acierto de una nueva
const INTERVALO_GRADUACION = 1; // días al graduarse de 'aprendiendo' a 'repaso'
const UMBRAL_DOMINADA = 21;     // días de intervalo para considerarla dominada

function fuzz(dias) {
  return dias * (0.95 + Math.random() * 0.1);
}

// resultado: 'bien' | 'mal'
function responder(cardId, resultado) {
  const p = db.prepare('SELECT * FROM progreso WHERE card_id = ?').get(cardId);
  if (!p) throw new Error(`Tarjeta sin progreso: ${cardId}`);
  const ahora = Date.now();

  let { estado, ease, intervalo_dias, repeticiones, fallos, racha } = p;
  let due_at;

  if (resultado === 'mal') {
    fallos++;
    racha = 0;
    ease = Math.max(EASE_MIN, ease - 0.2);
    estado = 'aprendiendo';
    intervalo_dias = 0;
    due_at = ahora + PASO_FALLO_MIN * MIN;
  } else {
    repeticiones++;
    racha++;
    if (estado === 'nueva') {
      estado = 'aprendiendo';
      due_at = ahora + PASO_NUEVA_MIN * MIN;
    } else if (estado === 'aprendiendo') {
      estado = 'repaso';
      intervalo_dias = INTERVALO_GRADUACION;
      due_at = ahora + fuzz(intervalo_dias) * DIA;
    } else {
      ease = Math.min(EASE_MAX, ease + 0.05);
      intervalo_dias = Math.min(INTERVALO_MAX, Math.max(intervalo_dias * ease, intervalo_dias + 1));
      due_at = ahora + fuzz(intervalo_dias) * DIA;
    }
  }

  db.prepare(`
    UPDATE progreso SET estado=?, ease=?, intervalo_dias=?, due_at=?, repeticiones=?, fallos=?, racha=?, ultimo_repaso=?
    WHERE card_id=?
  `).run(estado, ease, intervalo_dias, due_at, repeticiones, fallos, racha, ahora, cardId);

  return { estado, intervalo_dias, due_at };
}

// Cola de estudio: pendientes (due) mezcladas con nuevas, interleaving por tipo.
function colaDeEstudio(limite = 20, maxNuevas = 8) {
  const ahora = Date.now();
  const filas = db.prepare(`
    SELECT c.id, c.leccion, c.tipo, c.contenido, p.estado, p.due_at, p.racha
    FROM cards c JOIN progreso p ON p.card_id = c.id
  `).all();

  const pendientes = filas.filter(f => f.estado !== 'nueva' && f.due_at <= ahora);
  const nuevas = filas.filter(f => f.estado === 'nueva').slice(0, maxNuevas);

  // Interleaving: barajamos y evitamos dos tarjetas seguidas del mismo tipo cuando se puede.
  const mazo = barajar([...pendientes, ...nuevas]).slice(0, limite);
  const mezclado = [];
  while (mazo.length) {
    const anterior = mezclado[mezclado.length - 1];
    let idx = mazo.findIndex(f => !anterior || f.tipo !== anterior.tipo);
    if (idx === -1) idx = 0;
    mezclado.push(mazo.splice(idx, 1)[0]);
  }

  return mezclado.map(f => ({
    id: f.id,
    leccion: f.leccion,
    tipo: f.tipo,
    estado: f.estado,
    ...JSON.parse(f.contenido)
  }));
}

function barajar(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function resumen() {
  const ahora = Date.now();
  const filas = db.prepare(`
    SELECT c.leccion, c.tipo, p.estado, p.intervalo_dias, p.due_at
    FROM cards c JOIN progreso p ON p.card_id = c.id
  `).all();

  const porLeccion = {};
  let pendientesAhora = 0, nuevas = 0, dominadas = 0;
  let proximoDue = null;

  for (const f of filas) {
    const l = (porLeccion[f.leccion] ||= { total: 0, nuevas: 0, aprendiendo: 0, dominadas: 0 });
    l.total++;
    const dominada = f.estado === 'repaso' && f.intervalo_dias >= UMBRAL_DOMINADA;
    if (f.estado === 'nueva') { l.nuevas++; nuevas++; }
    else if (dominada) { l.dominadas++; dominadas++; }
    else l.aprendiendo++;

    if (f.estado !== 'nueva') {
      if (f.due_at <= ahora) pendientesAhora++;
      else if (proximoDue === null || f.due_at < proximoDue) proximoDue = f.due_at;
    }
  }

  return { porLeccion, total: filas.length, nuevas, dominadas, pendientesAhora, proximoDue };
}

module.exports = { responder, colaDeEstudio, resumen, UMBRAL_DOMINADA };
