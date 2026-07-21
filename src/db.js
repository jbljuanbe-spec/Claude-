// Capa de datos: SQLite (better-sqlite3) + importación idempotente del JSON de contenido.
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'progreso.db');
const CONTENIDO_PATH = path.join(__dirname, '..', 'contenido_japones.json');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS cards (
  id         TEXT PRIMARY KEY,
  leccion    TEXT NOT NULL,
  tipo       TEXT NOT NULL,          -- 'vocab' | 'grammar' | 'conj'
  contenido  TEXT NOT NULL           -- JSON con los campos originales de la tarjeta
);

CREATE TABLE IF NOT EXISTS progreso (
  card_id        TEXT PRIMARY KEY REFERENCES cards(id),
  estado         TEXT NOT NULL DEFAULT 'nueva',   -- 'nueva' | 'aprendiendo' | 'repaso'
  ease           REAL NOT NULL DEFAULT 2.5,
  intervalo_dias REAL NOT NULL DEFAULT 0,
  due_at         INTEGER NOT NULL DEFAULT 0,      -- epoch ms; 0 = disponible ya
  repeticiones   INTEGER NOT NULL DEFAULT 0,
  fallos         INTEGER NOT NULL DEFAULT 0,
  racha          INTEGER NOT NULL DEFAULT 0,      -- aciertos seguidos
  ultimo_repaso  INTEGER
);

CREATE TABLE IF NOT EXISTS actividad (
  fecha     TEXT PRIMARY KEY,        -- YYYY-MM-DD local
  repasos   INTEGER NOT NULL DEFAULT 0,
  ejercicios INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS meta (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
`);

// ---------- Importación ----------
// Reglas: id nuevo -> tarjeta nueva con progreso desde cero.
//         id existente -> se actualiza el contenido pero NUNCA se toca su progreso.
function importarContenido() {
  const raw = fs.readFileSync(CONTENIDO_PATH, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data.tarjetas)) {
    throw new Error('El JSON no tiene un array "tarjetas"');
  }

  const upsertCard = db.prepare(`
    INSERT INTO cards (id, leccion, tipo, contenido) VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET leccion=excluded.leccion, tipo=excluded.tipo, contenido=excluded.contenido
  `);
  const insertProgreso = db.prepare(`
    INSERT OR IGNORE INTO progreso (card_id) VALUES (?)
  `);
  const setMeta = db.prepare(`
    INSERT INTO meta (clave, valor) VALUES (?, ?)
    ON CONFLICT(clave) DO UPDATE SET valor=excluded.valor
  `);
  const existe = db.prepare('SELECT 1 FROM cards WHERE id = ?');

  let nuevas = 0, actualizadas = 0;
  const tx = db.transaction(() => {
    for (const t of data.tarjetas) {
      if (!t.id) continue;
      const tipo = t.type === 'grammar' ? 'grammar' : t.type === 'conj' ? 'conj' : 'vocab';
      const yaExistia = existe.get(t.id);
      upsertCard.run(t.id, t.l || 'General', tipo, JSON.stringify(t));
      insertProgreso.run(t.id);
      if (yaExistia) actualizadas++; else nuevas++;
    }
    setMeta.run('lecciones', JSON.stringify(data.lecciones || {}));
    setMeta.run('meta', JSON.stringify(data.meta || {}));
  });
  tx();
  return { nuevas, actualizadas, total: data.tarjetas.length };
}

function getMeta(clave, porDefecto) {
  const row = db.prepare('SELECT valor FROM meta WHERE clave = ?').get(clave);
  return row ? JSON.parse(row.valor) : porDefecto;
}

// ---------- Actividad diaria (racha) ----------
function hoyLocal() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function registrarActividad(tipo) {
  const col = tipo === 'ejercicio' ? 'ejercicios' : 'repasos';
  db.prepare(`
    INSERT INTO actividad (fecha, ${col}) VALUES (?, 1)
    ON CONFLICT(fecha) DO UPDATE SET ${col} = ${col} + 1
  `).run(hoyLocal());
}

function calcularRacha() {
  const fechas = new Set(db.prepare('SELECT fecha FROM actividad').all().map(r => r.fecha));
  let racha = 0;
  const cursor = new Date();
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  // Si hoy aún no hay actividad, la racha puede seguir viva desde ayer.
  if (!fechas.has(fmt(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (fechas.has(fmt(cursor))) {
    racha++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return racha;
}

module.exports = { db, importarContenido, getMeta, registrarActividad, calcularRacha, hoyLocal, CONTENIDO_PATH };
