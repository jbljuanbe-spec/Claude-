// Motor de la app en el navegador: importación de contenido, SRS (SM-2 adaptado),
// actividad diaria y estadísticas. Todo persiste en IndexedDB (ver almacen.js).
import { leer, guardar, pedirPersistencia } from './almacen.js';
import { nivelDeXp, tiersConseguidos } from './ciudades.js';

const MIN = 60 * 1000;
const DIA = 24 * 60 * 60 * 1000;
const EASE_MIN = 1.3;
const EASE_MAX = 3.0;
const INTERVALO_MAX = 180;      // días
const PASO_FALLO_MIN = 5;       // minutos hasta reintentar tras fallo
const PASO_NUEVA_MIN = 10;      // minutos tras el primer acierto de una nueva
const INTERVALO_GRADUACION = 1; // días al graduarse de 'aprendiendo' a 'repaso'
export const UMBRAL_DOMINADA = 21; // días de intervalo para considerarla dominada

// Estado en memoria (se carga una vez y se persiste en cada cambio).
const estado = {
  cards: {},      // id -> tarjeta original del JSON (+ leccion, tipo)
  progreso: {},   // id -> { estado, ease, intervalo, due_at, reps, fallos, racha, ultimo }
  actividad: {},  // fecha -> { repasos, ejercicios, congelado? }
  juego: null,    // { xp, congeladoresUsados, insignias: [] } -- solo crece, nunca resta
  lecciones: {},
  meta: {},
  listo: false
};

// XP por acción: responder siempre suma (también al fallar: el esfuerzo cuenta).
const XP_ACIERTO = 10;
const XP_FALLO = 3;
const XP_EJERCICIO = 6;
const DIAS_POR_CONGELADOR = 4;   // cada 4 días activos se gana un congelador de racha
const MAX_CONGELADORES = 4;

function juegoNuevo() {
  return { xp: 0, congeladoresUsados: 0, insignias: [] };
}

function progresoNuevo() {
  return { estado: 'nueva', ease: 2.5, intervalo: 0, due_at: 0, reps: 0, fallos: 0, racha: 0, ultimo: null };
}

async function persistir() {
  await guardar('progreso', estado.progreso);
  await guardar('actividad', estado.actividad);
  await guardar('juego', estado.juego);
  await guardar('contenido', { cards: estado.cards, lecciones: estado.lecciones, meta: estado.meta });
}

export async function iniciar() {
  if (estado.listo) return;
  pedirPersistencia();
  const [progreso, actividad, contenido, juego] = await Promise.all([
    leer('progreso'), leer('actividad'), leer('contenido'), leer('juego')
  ]);
  estado.progreso = progreso || {};
  estado.actividad = actividad || {};
  estado.juego = juego || juegoNuevo();
  aplicarCongeladores();
  if (contenido) {
    estado.cards = contenido.cards || {};
    estado.lecciones = contenido.lecciones || {};
    estado.meta = contenido.meta || {};
  }
  // Primer arranque o nueva versión publicada: intenta traer el JSON del sitio.
  try {
    await importarContenido();
  } catch (e) {
    if (!Object.keys(estado.cards).length) throw e;
    // Sin red pero con contenido cacheado: se puede estudiar igual.
  }
  estado.listo = true;
}

// Importación idempotente: id nuevo -> progreso desde cero; id existente ->
// se actualiza el contenido pero NUNCA se toca su progreso.
export async function importarContenido() {
  const res = await fetch(`contenido_japones.json?v=${Date.now()}`);
  if (!res.ok) throw new Error(`No se pudo leer contenido_japones.json (${res.status})`);
  const data = await res.json();
  if (!Array.isArray(data.tarjetas)) throw new Error('El JSON no tiene un array "tarjetas"');

  let nuevas = 0, actualizadas = 0;
  for (const t of data.tarjetas) {
    if (!t.id) continue;
    const tipo = t.type === 'grammar' ? 'grammar' : t.type === 'conj' ? 'conj' : 'vocab';
    if (estado.cards[t.id]) actualizadas++; else nuevas++;
    estado.cards[t.id] = { ...t, leccion: t.l || 'General', tipo };
    if (!estado.progreso[t.id]) estado.progreso[t.id] = progresoNuevo();
  }
  estado.lecciones = data.lecciones || {};
  estado.meta = data.meta || {};
  await persistir();
  return { nuevas, actualizadas, total: data.tarjetas.length };
}

// ---------- SRS ----------
function fuzz(dias) {
  return dias * (0.95 + Math.random() * 0.1);
}

// ---------- Juego (siempre aditivo, nunca resta) ----------

function diasActivosReales() {
  return Object.values(estado.actividad).filter(a => !a.congelado).length;
}

export function congeladoresDisponibles() {
  const ganados = Math.floor(diasActivosReales() / DIAS_POR_CONGELADOR);
  return Math.max(0, Math.min(MAX_CONGELADORES, ganados - estado.juego.congeladoresUsados));
}

// Si faltan días recientes en la racha, los congeladores los cubren solos
// (red de seguridad automática y gratuita: la racha se pausa, no se rompe).
function aplicarCongeladores() {
  const fechas = Object.keys(estado.actividad).filter(f => !estado.actividad[f].congelado).sort();
  if (!fechas.length) return;
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const ayer = new Date(); ayer.setDate(ayer.getDate() - 1);
  const ultimo = new Date(fechas[fechas.length - 1] + 'T12:00:00');
  const cursor = new Date(ultimo); cursor.setDate(cursor.getDate() + 1);

  const huecos = [];
  while (fmt(cursor) <= fmt(ayer)) {
    if (!estado.actividad[fmt(cursor)]) huecos.push(fmt(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  if (!huecos.length) return;
  if (huecos.length <= congeladoresDisponibles()) {
    for (const fecha of huecos) {
      estado.actividad[fecha] = { repasos: 0, ejercicios: 0, congelado: true };
      estado.juego.congeladoresUsados++;
    }
  }
  // Si los huecos superan los congeladores, la racha simplemente empieza de
  // nuevo con la actividad reciente: sin culpa, sin borrar nada más.
}

function sumarXp(cantidad) {
  const antes = nivelDeXp(estado.juego.xp).nivel;
  estado.juego.xp += cantidad;
  const despues = nivelDeXp(estado.juego.xp);
  return { xpGanado: cantidad, nivel: despues, subeNivel: despues.nivel > antes };
}

// Las insignias son permanentes: aquí solo se AÑADEN las nuevas, jamás se quitan.
function actualizarInsignias() {
  const { porLeccion } = resumen();
  const nuevas = [];
  for (const [leccion, stats] of Object.entries(porLeccion)) {
    for (const tier of tiersConseguidos(stats)) {
      const id = `${leccion}:${tier}`;
      if (!estado.juego.insignias.includes(id)) {
        estado.juego.insignias.push(id);
        nuevas.push({ leccion, tier });
      }
    }
  }
  return nuevas;
}

export async function responder(cardId, resultado) {
  const p = estado.progreso[cardId];
  if (!p) throw new Error(`Tarjeta sin progreso: ${cardId}`);
  const ahora = Date.now();

  if (resultado === 'mal') {
    p.fallos++;
    p.racha = 0;
    p.ease = Math.max(EASE_MIN, p.ease - 0.2);
    p.estado = 'aprendiendo';
    p.intervalo = 0;
    p.due_at = ahora + PASO_FALLO_MIN * MIN;
  } else {
    p.reps++;
    p.racha++;
    if (p.estado === 'nueva') {
      p.estado = 'aprendiendo';
      p.due_at = ahora + PASO_NUEVA_MIN * MIN;
    } else if (p.estado === 'aprendiendo') {
      p.estado = 'repaso';
      p.intervalo = INTERVALO_GRADUACION;
      p.due_at = ahora + fuzz(p.intervalo) * DIA;
    } else {
      p.ease = Math.min(EASE_MAX, p.ease + 0.05);
      p.intervalo = Math.min(INTERVALO_MAX, Math.max(p.intervalo * p.ease, p.intervalo + 1));
      p.due_at = ahora + fuzz(p.intervalo) * DIA;
    }
  }
  p.ultimo = ahora;
  registrarActividad('repaso');
  const juego = sumarXp(resultado === 'mal' ? XP_FALLO : XP_ACIERTO);
  const insigniasNuevas = actualizarInsignias();
  await persistir();
  return { estado: p.estado, intervalo_dias: p.intervalo, due_at: p.due_at, ...juego, insigniasNuevas };
}

// Cola de estudio: pendientes mezcladas con nuevas, interleaving por tipo.
export function colaDeEstudio(limite = 20, maxNuevas = 8) {
  const ahora = Date.now();
  const filas = Object.entries(estado.cards).map(([id, c]) => ({
    id, ...c, estadoSrs: estado.progreso[id]?.estado || 'nueva',
    due: estado.progreso[id]?.due_at || 0
  }));

  const pendientes = filas.filter(f => f.estadoSrs !== 'nueva' && f.due <= ahora);
  const nuevas = filas.filter(f => f.estadoSrs === 'nueva').slice(0, maxNuevas);

  const mazo = barajar([...pendientes, ...nuevas]).slice(0, limite);
  const mezclado = [];
  while (mazo.length) {
    const anterior = mezclado[mezclado.length - 1];
    let idx = mazo.findIndex(f => !anterior || f.tipo !== anterior.tipo);
    if (idx === -1) idx = 0;
    mezclado.push(mazo.splice(idx, 1)[0]);
  }
  return mezclado.map(f => ({ ...f, estado: f.estadoSrs }));
}

function barajar(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------- Actividad y estadísticas ----------
function hoyLocal() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function registrarActividad(tipo) {
  const dia = (estado.actividad[hoyLocal()] ||= { repasos: 0, ejercicios: 0 });
  if (tipo === 'ejercicio') dia.ejercicios++; else dia.repasos++;
}

export async function registrarEjercicio() {
  registrarActividad('ejercicio');
  const juego = sumarXp(XP_EJERCICIO);
  await guardar('actividad', estado.actividad);
  await guardar('juego', estado.juego);
  return juego;
}

export function calcularRacha() {
  const fechas = new Set(Object.keys(estado.actividad));
  let racha = 0;
  const cursor = new Date();
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (!fechas.has(fmt(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (fechas.has(fmt(cursor))) {
    racha++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return racha;
}

export function resumen() {
  const ahora = Date.now();
  const porLeccion = {};
  let total = 0, nuevas = 0, dominadas = 0, pendientesAhora = 0;
  let proximoDue = null;

  for (const [id, c] of Object.entries(estado.cards)) {
    const p = estado.progreso[id] || progresoNuevo();
    const l = (porLeccion[c.leccion] ||= { total: 0, nuevas: 0, aprendiendo: 0, dominadas: 0 });
    total++;
    l.total++;
    const dominada = p.estado === 'repaso' && p.intervalo >= UMBRAL_DOMINADA;
    if (p.estado === 'nueva') { l.nuevas++; nuevas++; }
    else if (dominada) { l.dominadas++; dominadas++; }
    else l.aprendiendo++;

    if (p.estado !== 'nueva') {
      if (p.due_at <= ahora) pendientesAhora++;
      else if (proximoDue === null || p.due_at < proximoDue) proximoDue = p.due_at;
    }
  }
  return { porLeccion, total, nuevas, dominadas, pendientesAhora, proximoDue };
}

export function datosBiblioteca() {
  const tarjetas = Object.entries(estado.cards).map(([id, c]) => {
    const p = estado.progreso[id] || progresoNuevo();
    return { id, ...c, estado: p.estado, dominada: p.estado === 'repaso' && p.intervalo >= UMBRAL_DOMINADA };
  });
  return { lecciones: estado.lecciones, tarjetas };
}

export function datosDashboard() {
  const hoy = estado.actividad[hoyLocal()] || { repasos: 0, ejercicios: 0 };
  const ultimos14 = Object.entries(estado.actividad)
    .map(([fecha, a]) => ({ fecha, n: a.repasos + a.ejercicios }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 14);
  return {
    resumen: resumen(),
    racha: calcularRacha(),
    hoy,
    ultimos14,
    lecciones: estado.lecciones,
    juego: {
      nivel: nivelDeXp(estado.juego.xp),
      congeladores: congeladoresDisponibles(),
      insignias: [...estado.juego.insignias]
    }
  };
}

export function metaApp() {
  return { meta: estado.meta, lecciones: estado.lecciones };
}

// ---------- Copia de seguridad ----------
export function exportarCopia() {
  return {
    app: 'kotoba',
    version: 1,
    exportado: new Date().toISOString(),
    progreso: estado.progreso,
    actividad: estado.actividad,
    juego: estado.juego
  };
}

export async function restaurarCopia(datos) {
  if (!datos || datos.app !== 'kotoba' || !datos.progreso) {
    throw new Error('El archivo no parece una copia de seguridad de Kotoba');
  }
  estado.progreso = datos.progreso;
  estado.actividad = datos.actividad || {};
  estado.juego = datos.juego || juegoNuevo();
  for (const id of Object.keys(estado.cards)) {
    if (!estado.progreso[id]) estado.progreso[id] = progresoNuevo();
  }
  await persistir();
}
