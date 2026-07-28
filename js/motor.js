// Motor de la app en el navegador: importación de contenido, SRS (SM-2 adaptado),
// actividad diaria y estadísticas. Todo persiste en IndexedDB (ver almacen.js).
import { leer, guardar, pedirPersistencia } from './almacen.js';
import { nivelDeXp, tiersConseguidos } from './ciudades.js';
import { CIUDAD_GEO, ORDEN_CIUDADES_DEFAULT, FUJI } from './curriculum.js';

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

// XP por acción: el fallo no resta nada, pero tampoco suma (+0).
const XP_ACIERTO = 10;
const XP_FALLO = 0;
const XP_EJERCICIO = 6;
const DIAS_POR_CONGELADOR = 4;   // cada 4 días activos se gana un congelador de racha
const MAX_CONGELADORES = 4;

function juegoNuevo() {
  return { xp: 0, congeladoresUsados: 0, insignias: [], billetes: 0, eventosBilletes: [], desbloqueadas: [], fechas: {} };
}

function normalizarJuego(j) {
  const base = juegoNuevo();
  return { ...base, ...j };
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
  estado.juego = normalizarJuego(juego || {});
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
  // Reconoce insignias ganadas por progreso previo a esta versión.
  if (actualizarInsignias().length) await persistir();
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

// ---------- El viaje: paradas ordenadas, sin saltos (salvo billete) ----------
// COMPLETED es permanente: se concede una vez y no se revierte aunque lleguen
// tarjetas nuevas a esa lección al reimportar contenido.

function ordenParadas() {
  return Object.keys(estado.lecciones)
    .filter(c => c !== 'General')
    .sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
}

// Marca un evento como conseguido (idempotente), sin dar billete.
function marcarEvento(evento) {
  if (estado.juego.eventosBilletes.includes(evento)) return false;
  estado.juego.eventosBilletes.push(evento);
  return true;
}

// Billete de Shinkansen: se gana SOLO al aprobar el examen de una ciudad.
function concederBillete(evento) {
  const nuevo = marcarEvento(evento);
  if (nuevo) estado.juego.billetes++;
  return nuevo;
}

export function estaSuperada(codigo) {
  return estado.juego.eventosBilletes.includes(`${codigo}:completa`);
}

// ---------- Datos de lección leídos del JSON (schema nuevo) ----------
function numLeccion(codigo) { const m = /^L(\d+)$/.exec(codigo); return m ? parseInt(m[1], 10) : null; }
function metaLeccion(codigo) { const m = estado.lecciones[codigo]; return (m && typeof m === 'object') ? m : {}; }

export function tituloLeccion(codigo) {
  const m = estado.lecciones[codigo];
  if (!m) return codigo;
  return (typeof m === 'string') ? m : (m.titulo || codigo);
}

function ordenCiudadesLista() { return (estado.meta && estado.meta.orden_ciudades) || ORDEN_CIUDADES_DEFAULT; }
function lecPorCiudad() { return (estado.meta && estado.meta.lecciones_por_ciudad) || 6; }

// Ciudad de una lección: la del JSON, o por bloques de N en el orden definido.
function ciudadDeLeccionNombre(codigo) {
  if (codigo === 'General') return null;
  const m = metaLeccion(codigo);
  if (m.ciudad) return m.ciudad;
  const n = numLeccion(codigo);
  if (!n) return null;
  const orden = ordenCiudadesLista();
  return orden[Math.floor((n - 1) / lecPorCiudad())] || orden[orden.length - 1] || 'Tokio';
}
function barrioDe(codigo) {
  const m = metaLeccion(codigo);
  if (m.barrio) return m.barrio;
  const n = numLeccion(codigo);
  return n ? `Lección ${n}` : codigo;
}
function emojiDe(codigo) {
  const m = metaLeccion(codigo);
  if (m.emoji) return m.emoji;
  const cn = ciudadDeLeccionNombre(codigo);
  return (cn && CIUDAD_GEO[cn] && CIUDAD_GEO[cn].generico) || '📍';
}

function codigosDeCiudad(nombre) { return ordenParadas().filter(c => ciudadDeLeccionNombre(c) === nombre); }

// Ciudades con contenido, en el orden del viaje.
function ciudadesConContenido() {
  const orden = ordenCiudadesLista();
  const con = new Set(ordenParadas().map(ciudadDeLeccionNombre).filter(Boolean));
  const lista = orden.filter(n => con.has(n));
  for (const n of con) if (!lista.includes(n)) lista.push(n);
  return lista;
}

// Una ciudad se conquista al superar su paquete completo de lecciones.
function ciudadConquistadaCalc(nombre) {
  const codes = codigosDeCiudad(nombre);
  return codes.length >= lecPorCiudad() && codes.every(estaSuperada);
}
export function ciudadEstaConquistada(nombre) { return ciudadConquistadaCalc(nombre); }
export function examenAprobado(nombre) { return estado.juego.eventosBilletes.includes(`examen:${nombre}`); }
function examenDisponible(nombre) { return ciudadConquistadaCalc(nombre) && !examenAprobado(nombre); }

// Desbloqueo por ciudad: la primera siempre; el resto necesita el billete de
// Shinkansen (examen aprobado de la ciudad anterior) o gastar un billete suelto.
function ciudadDesbloqueada(nombre, ordenadas) {
  const idx = ordenadas.indexOf(nombre);
  if (idx <= 0) return true;
  if (estado.juego.desbloqueadas.includes(nombre)) return true;
  return examenAprobado(ordenadas[idx - 1]);
}

export function paradas() {
  const { porLeccion } = resumen();
  const ordenadas = ciudadesConContenido();
  const desbloq = {};
  ordenadas.forEach(n => { desbloq[n] = ciudadDesbloqueada(n, ordenadas); });
  const lista = [];

  ordenParadas().forEach((cod, i) => {
    const stats = porLeccion[cod] || { total: 0, nuevas: 0, aprendiendo: 0, dominadas: 0 };
    const cn = ciudadDeLeccionNombre(cod);
    let estadoParada;
    if (estaSuperada(cod)) estadoParada = 'COMPLETED';
    else if (desbloq[cn]) estadoParada = 'ACTIVE';
    else estadoParada = 'LOCKED';
    lista.push({ codigo: cod, orden: i + 1, estado: estadoParada, stats, hasContent: true, ciudad: cn });
  });

  if (porLeccion.General) {
    lista.push({ codigo: 'General', orden: 0, estado: estaSuperada('General') ? 'COMPLETED' : 'ACTIVE', stats: porLeccion.General, hasContent: true, ciudad: null });
  }

  const ahora = Date.now();
  for (const parada of lista) {
    let pendientes = 0;
    for (const [id, c] of Object.entries(estado.cards)) {
      if (c.leccion !== parada.codigo) continue;
      const p = estado.progreso[id];
      if (p && p.estado !== 'nueva' && p.due_at <= ahora) pendientes++;
    }
    parada.pendientes = pendientes;
    parada.needsReview = pendientes > 0;
  }
  return lista;
}

function leccionesConNuevasPermitidas() {
  const permitidas = new Set(['General']);
  for (const p of paradas()) if (p.estado !== 'LOCKED') permitidas.add(p.codigo);
  return permitidas;
}

// Aprobar los ejercicios de una lección la marca como superada (su insignia de
// barrio/comida/festival). El billete de Shinkansen NO se da aquí: llega solo al
// aprobar el examen de ciudad.
export async function superarLeccion(codigo) {
  if (!estado.lecciones[codigo]) throw new Error(`La lección ${codigo} no tiene contenido todavía`);
  const nueva = marcarEvento(`${codigo}:completa`);
  if (nueva) estado.juego.fechas[codigo] = Date.now();
  const ciudad = ciudadDeLeccionNombre(codigo);
  const ciudadCompleta = ciudad ? examenDisponible(ciudad) : false; // 6/6 superadas, examen pendiente
  await guardar('juego', estado.juego);
  return { nueva, insignia: barrioDe(codigo), ciudad, ciudadCompleta };
}

export function codigosExamen(nombre) { return codigosDeCiudad(nombre); }

// Examen de ciudad: hace falta >=80% para el billete de Shinkansen que abre la
// siguiente ciudad. Se puede repetir cuantas veces haga falta; suspender no resta.
export async function aprobarExamen(nombre, pct) {
  if (pct < 0.8) return { aprobado: false, pct };
  if (!ciudadConquistadaCalc(nombre)) throw new Error('Aún no has completado todas las lecciones de esta ciudad');
  const nuevo = concederBillete(`examen:${nombre}`); // +1 billete la primera vez que se aprueba
  if (nuevo) estado.juego.fechas[`examen:${nombre}`] = Date.now();
  await guardar('juego', estado.juego);
  const ordenadas = ciudadesConContenido();
  const idx = ordenadas.indexOf(nombre);
  return { aprobado: true, pct, billete: nuevo, billetes: estado.juego.billetes, siguiente: idx >= 0 ? (ordenadas[idx + 1] || null) : null };
}

// Un billete desbloquea una ciudad concreta antes de tiempo.
export async function gastarBillete(nombre) {
  if (estado.juego.billetes <= 0) throw new Error('No te quedan billetes de Shinkansen');
  if (estado.juego.desbloqueadas.includes(nombre)) return { billetes: estado.juego.billetes };
  estado.juego.billetes--;
  estado.juego.desbloqueadas.push(nombre);
  await guardar('juego', estado.juego);
  return { billetes: estado.juego.billetes };
}

// Estructura completa del viaje (ciudades › hitos) para las vistas.
export function estructuraCiudades() {
  const { porLeccion } = resumen();
  const ordenadas = ciudadesConContenido();
  const porCod = Object.fromEntries(paradas().map(p => [p.codigo, p]));

  const construirHito = cod => {
    const st = porCod[cod] || {};
    return {
      codigo: cod, barrio: barrioDe(cod), emoji: emojiDe(cod), titulo: tituloLeccion(cod),
      estado: st.estado, stats: st.stats || { total: 0, nuevas: 0, aprendiendo: 0, dominadas: 0 },
      needsReview: !!st.needsReview, pendientes: st.pendientes || 0,
      superado: estaSuperada(cod), fecha: estado.juego.fechas[cod] || null
    };
  };

  const ciudades = ordenadas.map(nombre => {
    const geo = CIUDAD_GEO[nombre] || {};
    const codes = codigosDeCiudad(nombre);
    const hitos = codes.map(construirHito);
    return {
      id: nombre, nombre, kanji: geo.kanji || '', emoji: geo.emoji || '📍', generico: geo.generico,
      pref: geo.pref, region: geo.region || '', jlpt: geo.jlpt || '', lat: geo.lat, lon: geo.lon,
      dxEtiqueta: geo.dx || 0, dyEtiqueta: geo.dy || 0, hitos,
      conquistada: ciudadConquistadaCalc(nombre), bloqueada: hitos.length > 0 && hitos.every(h => h.estado === 'LOCKED'),
      superados: hitos.filter(h => h.superado).length, total: codes.length, cupo: lecPorCiudad(),
      examenDisponible: examenDisponible(nombre), examenAprobado: examenAprobado(nombre), futura: false
    };
  });

  const futuras = ordenCiudadesLista().filter(n => !ordenadas.includes(n)).map(nombre => {
    const geo = CIUDAD_GEO[nombre] || {};
    return {
      id: nombre, nombre, kanji: geo.kanji || '', emoji: geo.emoji || '📍', pref: geo.pref,
      region: geo.region || '', jlpt: geo.jlpt || '', lat: geo.lat, lon: geo.lon,
      dxEtiqueta: geo.dx || 0, dyEtiqueta: geo.dy || 0, hitos: [], conquistada: false, bloqueada: true,
      superados: 0, total: 0, cupo: lecPorCiudad(), examenDisponible: false, examenAprobado: false, futura: true
    };
  });

  let fuji = null;
  if (estado.lecciones.General) {
    const st = porCod.General || {};
    const m = metaLeccion('General');
    fuji = {
      ...FUJI, id: 'General', codigo: 'General', barrio: m.barrio || FUJI.nombre, emoji: m.emoji || FUJI.emoji,
      titulo: tituloLeccion('General'), estado: st.estado, stats: st.stats, needsReview: !!st.needsReview,
      superado: estaSuperada('General'), fecha: estado.juego.fechas.General || null
    };
  }
  return { ciudades, futuras, fuji };
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
  // Los tiers bronce/plata/oro son solo decorativos (retención de una lección);
  // el billete de Shinkansen se gana únicamente al conquistar la CIUDAD entera
  // en superarLeccion(), nunca por una lección suelta.
  await persistir();
  return { estado: p.estado, intervalo_dias: p.intervalo, due_at: p.due_at, ...juego, insigniasNuevas };
}

// Cola de estudio: pendientes mezcladas con nuevas, interleaving por tipo.
// Los repasos pendientes entran siempre (nunca se bloquea repasar lo aprendido);
// las tarjetas NUEVAS solo entran de paradas desbloqueadas del viaje.
export function colaDeEstudio(limite = 20, maxNuevas = 8, soloLeccion = null) {
  const ahora = Date.now();
  let filas = Object.entries(estado.cards).map(([id, c]) => ({
    id, ...c, estadoSrs: estado.progreso[id]?.estado || 'nueva',
    due: estado.progreso[id]?.due_at || 0
  }));
  if (soloLeccion) filas = filas.filter(f => f.leccion === soloLeccion);

  const permitidas = leccionesConNuevasPermitidas();
  const pendientes = filas.filter(f => f.estadoSrs !== 'nueva' && f.due <= ahora);
  const nuevas = filas
    .filter(f => f.estadoSrs === 'nueva' && permitidas.has(f.leccion))
    .slice(0, maxNuevas);

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

// Tarjetas "sanguijuela": las que fallas una y otra vez (5+ fallos).
export function sanguijuelas(minFallos = 5, limite = 12) {
  return Object.entries(estado.progreso)
    .filter(([, p]) => p.fallos >= minFallos)
    .sort(([, a], [, b]) => b.fallos - a.fallos)
    .slice(0, limite)
    .map(([id, p]) => {
      const c = estado.cards[id] || {};
      return {
        id,
        leccion: c.leccion,
        tipo: c.tipo,
        prompt: c.kanji || c.front || c.question || id,
        respuesta: c.reading || c.answer || '',
        es: c.es || '',
        fallos: p.fallos,
        aciertosSeguidos: p.racha
      };
    });
}

function juegoResumen() {
  return {
    nivel: nivelDeXp(estado.juego.xp),
    congeladores: congeladoresDisponibles(),
    insignias: [...estado.juego.insignias],
    billetes: estado.juego.billetes,
    fechas: { ...estado.juego.fechas },
    superadas: estado.juego.eventosBilletes.filter(e => e.endsWith(':completa')).map(e => e.replace(':completa', '')),
    ciudadesConquistadas: ciudadesConContenido().filter(ciudadConquistadaCalc),
    examenesAprobados: estado.juego.eventosBilletes.filter(e => e.startsWith('examen:')).map(e => e.replace('examen:', ''))
  };
}

export function datosViaje() {
  return { ...estructuraCiudades(), juego: juegoResumen() };
}

export function datosPerfil() {
  const hoy = estado.actividad[hoyLocal()] || { repasos: 0, ejercicios: 0 };
  const ultimos14 = Object.entries(estado.actividad)
    .map(([fecha, a]) => ({ fecha, n: a.repasos + a.ejercicios }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 14);
  const { ciudades, fuji } = estructuraCiudades();
  return {
    resumen: resumen(),
    racha: calcularRacha(),
    hoy,
    ultimos14,
    ciudades,
    fuji,
    juego: juegoResumen(),
    sanguijuelas: sanguijuelas()
  };
}

export function metaApp() {
  return { meta: estado.meta, lecciones: estado.lecciones };
}

// ---------- Gimnasio de vocabulario ----------
// 30 palabras NUEVAS (nunca estudiadas) cada día, estables durante el día y
// renovadas al día siguiente. Entrenarlas las mete en el SRS (responder), así
// que dejan de ser 'nueva' y mañana entran palabras frescas.
export async function vocabularioDelDia(objetivo = 30) {
  const hoy = hoyLocal();
  const g = estado.juego.gimnasio;
  let ids;
  if (g && g.fecha === hoy && Array.isArray(g.ids)) {
    ids = g.ids.filter(id => estado.cards[id]);
  } else {
    const nuevas = Object.entries(estado.cards)
      .filter(([id, c]) => c.tipo === 'vocab' && (estado.progreso[id]?.estado || 'nueva') === 'nueva')
      .map(([id]) => id);
    barajar(nuevas);
    ids = nuevas.slice(0, objetivo);
    estado.juego.gimnasio = { fecha: hoy, ids };
    await guardar('juego', estado.juego);
  }
  const restantesNuevas = Object.entries(estado.cards)
    .filter(([id, c]) => c.tipo === 'vocab' && (estado.progreso[id]?.estado || 'nueva') === 'nueva').length;
  const cartas = ids.map(id => ({ id, ...estado.cards[id] }));
  return { fecha: hoy, objetivo, cartas, restantesNuevas };
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
