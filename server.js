const express = require('express');
const fs = require('fs');
const path = require('path');
const { db, importarContenido, getMeta, registrarActividad, calcularRacha, hoyLocal } = require('./src/db');
const srs = require('./src/srs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Importación inicial: si la BD está vacía, carga el JSON automáticamente.
const totalCards = db.prepare('SELECT COUNT(*) AS n FROM cards').get().n;
if (totalCards === 0) {
  const r = importarContenido();
  console.log(`Contenido inicial importado: ${r.nuevas} tarjetas`);
}

// ---------- API ----------

app.get('/api/estado', (req, res) => {
  res.json({
    meta: getMeta('meta', {}),
    lecciones: getMeta('lecciones', {}),
    resumen: srs.resumen(),
    racha: calcularRacha()
  });
});

app.get('/api/repaso/cola', (req, res) => {
  const limite = Math.min(parseInt(req.query.limite) || 20, 100);
  res.json({ cola: srs.colaDeEstudio(limite) });
});

app.post('/api/repaso/responder', (req, res) => {
  const { cardId, resultado } = req.body;
  if (!cardId || !['bien', 'mal'].includes(resultado)) {
    return res.status(400).json({ error: 'Parámetros inválidos' });
  }
  try {
    const r = srs.responder(cardId, resultado);
    registrarActividad('repaso');
    res.json(r);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

app.post('/api/importar', (req, res) => {
  try {
    const r = importarContenido();
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: `No se pudo importar: ${e.message}` });
  }
});

app.get('/api/biblioteca', (req, res) => {
  const filas = db.prepare(`
    SELECT c.id, c.leccion, c.tipo, c.contenido, p.estado, p.intervalo_dias, p.racha
    FROM cards c JOIN progreso p ON p.card_id = c.id
  `).all();
  const tarjetas = filas.map(f => ({
    id: f.id,
    leccion: f.leccion,
    tipo: f.tipo,
    estado: f.estado,
    dominada: f.estado === 'repaso' && f.intervalo_dias >= srs.UMBRAL_DOMINADA,
    ...JSON.parse(f.contenido)
  }));
  res.json({ lecciones: getMeta('lecciones', {}), tarjetas });
});

app.get('/api/ejercicios', (req, res) => {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'ejercicios.json'), 'utf8'));
  res.json(data);
});

app.post('/api/ejercicios/resultado', (req, res) => {
  registrarActividad('ejercicio');
  res.json({ ok: true });
});

app.get('/api/dashboard', (req, res) => {
  const hoy = db.prepare('SELECT repasos, ejercicios FROM actividad WHERE fecha = ?').get(hoyLocal()) || { repasos: 0, ejercicios: 0 };
  const ultimos14 = db.prepare(`SELECT fecha, repasos + ejercicios AS n FROM actividad ORDER BY fecha DESC LIMIT 14`).all();
  res.json({
    resumen: srs.resumen(),
    racha: calcularRacha(),
    hoy,
    ultimos14,
    lecciones: getMeta('lecciones', {})
  });
});

app.listen(PORT, () => {
  console.log(`Kotoba corriendo en http://localhost:${PORT}`);
});
