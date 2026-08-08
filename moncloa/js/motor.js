// Motor de simulación: media del político, legislaturas, encuestas, elecciones,
// votaciones de leyes y transfuguismo.
import {
  PARTIDOS, PORPARTIDO, PARTIDO_PROPIO, EJES, RANGOS, LOGROS, RIVALES_INTERNOS,
  APODOS_PRENSA, MINISTERIOS, CARGOS, RUIDO, COMUNIDADES,
} from './datos.js?v=1';

// ── Utilidades ───────────────────────────────────────────────────────────────
export const azar = (a, b) => a + Math.random() * (b - a);
export const entero = (a, b) => Math.floor(azar(a, b + 1));
export const dado = p => Math.random() < p;
export const elegir = arr => arr[Math.floor(Math.random() * arr.length)];
export const limitar = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));

// Rango aleatorio para los efectos: nunca dos partidas dan lo mismo
export const rango = (a, b) => entero(a, b);

// ── Ideología ────────────────────────────────────────────────────────────────
// Afinidad entre dos vectores de eje: coseno, de -1 (opuestos) a 1 (idénticos).
// Es la pieza que hace que las decisiones tengan coherencia y no sean chistes
// sueltos: cada ley empuja hacia un sitio del mapa y tu partido está en otro.
export function afinidad(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (const k of EJES) { dot += a[k] * b[k]; na += a[k] * a[k]; nb += b[k] * b[k]; }
  if (!na || !nb) return 0;
  return dot / Math.sqrt(na * nb);
}

// Distancia ideológica normalizada (0 = el mismo sitio, 1 = las antípodas).
// Sirve para el transfuguismo: cuanto más lejos te vas, más te pagan y más caro
// te sale en credibilidad.
export function distancia(a, b) {
  let s = 0;
  for (const k of EJES) s += (a[k] - b[k]) ** 2;
  return Math.min(1, Math.sqrt(s) / (200 * Math.sqrt(EJES.length)) * 1.35);
}

export const partidoDe = estado => (estado.partidoPropio ?? PORPARTIDO[estado.partido]);

// ── Etapas de carrera ────────────────────────────────────────────────────────
// A diferencia de una carrera deportiva, aquí la etapa la marca el peso
// político (la media), no la edad: hay quien llega a la dirección con 34 y
// quien sigue de concejal a los 60.
export const ETAPAS = [
  { id: 'base', nombre: 'Militante de base', desde: 0 },
  { id: 'local', nombre: 'Política municipal', desde: 38 },
  { id: 'autonomica', nombre: 'Parlamento autonómico', desde: 50 },
  { id: 'congreso', nombre: 'Escaño en el Congreso', desde: 61 },
  { id: 'direccion', nombre: 'Dirección del partido', desde: 72 },
  { id: 'liderazgo', nombre: 'Liderazgo nacional', desde: 81 },
  { id: 'moncloa', nombre: 'Camino a Moncloa', desde: 90 },
];

export function etapaDe(estado) {
  let e = ETAPAS[0];
  for (const et of ETAPAS) if (estado.media >= et.desde) e = et;
  return e.id;
}
export const nombreEtapa = id => (ETAPAS.find(e => e.id === id) ?? ETAPAS[0]).nombre;

// ── Creación del estado ──────────────────────────────────────────────────────
export function nuevaPartida({ nombre, partido, perfil, comunidad, ritmo }) {
  const estado = {
    nombre,
    partido: partido.id, partidoNombre: partido.nombre, partidoEmoji: partido.emoji,
    partidoPropio: null,
    partidosPasados: [],
    perfil: perfil.id, perfilNombre: perfil.nombre,
    comunidad,
    ritmo: ritmo.id, cada: ritmo.cada,
    edad: 25, año: 1, retirado: false, causaRetiro: null,

    // La media es el peso político real (tipo OVR). No hay techo fijo por
    // partida: cada año se tira un crecimiento con mucha varianza y los años
    // buenos y malos se acumulan. Dos carreras iguales acaban a quince puntos.
    media: 30 + entero(-3, 4),
    talento: 1,                     // multiplica lo que creces; lo suben los eventos

    stats: {
      carisma: 40, gestion: 35, aparato: 30, credibilidad: 62,
      mediatico: 15, aguante: 88, moral: 74,
    },
    dinero: 4000,
    cargo: CARGOS.base,

    // Panorama electoral: la intención de voto de los cinco. El tuyo se mueve
    // contigo; los demás derivan solos con reversión a su media histórica.
    panorama: Object.fromEntries(PARTIDOS.map(p => [p.id, p.apoyo + azar(-1.5, 1.5)])),
    escanos: 0, ultimasElecciones: null,
    presidencias: 0, ministerios: [], legislaturas: 0,
    elecciones: [], leyes: [], votosIncoherentes: 0, votosCoherentes: 0,
    transfuguismos: 0, cobradoPorFichar: 0,

    hitos: [], cronica: [], vistos: new Set(),
    ultimoEvento: null,             // para no repetir la misma decisión dos turnos
    temporales: [],                 // efectos que se revierten solos al cabo de N años
    flags: {},
    rival: { nombre: elegir(RIVALES_INTERNOS), peso: 38, derrotasTuyas: 0, victoriasSuyas: 0, activo: true },
    apodo: null,
  };
  aplicarBonus(estado, partido.bonus);
  aplicarBonus(estado, perfil.bonus);
  estado.cargo = CARGOS[etapaDe(estado)];
  return estado;
}

function aplicarBonus(estado, bonus = {}) {
  for (const [k, v] of Object.entries(bonus)) {
    if (k === 'dinero') estado.dinero += v;
    else if (k === 'media') estado.media = limitar(estado.media + v);
    else if (k in estado.stats) estado.stats[k] = limitar(estado.stats[k] + v);
    else if (typeof v === 'boolean') estado.flags[k] = v;
  }
}

// ── Guardado automático ──────────────────────────────────────────────────────
// En móvil se cierra la pestaña cada dos por tres, así que la carrera en curso
// se guarda en el navegador. No sale de tu dispositivo: es localStorage, no
// hay servidor, ni cuenta, ni nadie mirando.
const CLAVE = 'moncloa.partida';
const VERSION_GUARDADO = 1;

export function guardarPartida(estado) {
  try {
    const plano = { ...estado, vistos: [...estado.vistos], v: VERSION_GUARDADO };
    localStorage.setItem(CLAVE, JSON.stringify(plano));
    return true;
  } catch { return false; }   // incógnito, cuota llena: no es motivo para romper el juego
}

export function cargarPartida() {
  try {
    const bruto = localStorage.getItem(CLAVE);
    if (!bruto) return null;
    const plano = JSON.parse(bruto);
    if (plano.v !== VERSION_GUARDADO || plano.retirado || !plano.panorama) return null;
    plano.vistos = new Set(plano.vistos ?? []);
    return plano;
  } catch { return null; }
}

export function borrarPartida() {
  try { localStorage.removeItem(CLAVE); } catch { /* da igual */ }
}

// ── Transfuguismo ────────────────────────────────────────────────────────────
// La mecánica central. Irte a otro partido te da dinero y a veces un puesto
// mejor en la lista, pero la credibilidad se paga en el sitio y el electorado
// nuevo tarda en fiarse. Cuanto más lejos ideológicamente, más caro todo.
export function ofertaFichaje(estado) {
  const mio = partidoDe(estado);
  const otros = PARTIDOS.filter(p => p.id !== estado.partido);
  const destino = elegir(otros);
  const d = distancia(mio.eje, destino.eje);
  // Te pagan por el salto, no por tu talento: cuanto más escandaloso, más caro
  const dinero = Math.round((28000 + estado.media * 2600 + d * 190000) * azar(0.8, 1.3) / 1000) * 1000;
  return {
    destino, distancia: d, dinero,
    puesto: d > 0.55 ? 'número dos por una circunscripción grande'
      : d > 0.3 ? 'un puesto de salida seguro'
        : 'la portavocía adjunta del grupo',
    costeCredibilidad: Math.round(10 + d * 34),
  };
}

export function cambiarPartido(estado, destino) {
  if (!estado.partidosPasados.includes(estado.partido)) estado.partidosPasados.push(estado.partido);
  const antes = partidoDe(estado);
  estado.partidoPropio = null;
  estado.partido = destino.id;
  estado.partidoNombre = destino.nombre;
  estado.partidoEmoji = destino.emoji;
  estado.transfuguismos++;
  // Tu peso político no viaja entero: en casa ajena empiezas de nuevo un poco
  const d = distancia(antes.eje, destino.eje);
  mediaTemporal(estado, -Math.round(3 + d * 7), 2);
  estado.escanos = 0;
  hito(estado, '🔀', `Te vas de ${antes.nombre} a ${destino.nombre}`);
  return d;
}

// Fundar tu propio partido: el fondo pasa a ser tuyo y el apoyo, a cero.
export function fundarPartido(estado, nombrePartido) {
  if (!estado.partidosPasados.includes(estado.partido)) estado.partidosPasados.push(estado.partido);
  const base = partidoDe(estado);
  const propio = {
    ...PARTIDO_PROPIO,
    nombre: nombrePartido, corto: nombrePartido,
    // Tu partido hereda tu ideología, un poco más moderada: hay que ganar
    eje: Object.fromEntries(EJES.map(k => [k, Math.round(base.eje[k] * 0.8)])),
    electorado: PARTIDO_PROPIO.electorado,
  };
  estado.partidoPropio = propio;
  estado.partido = 'propio';
  estado.partidoNombre = nombrePartido;
  estado.partidoEmoji = '⚪';
  estado.panorama.propio = Math.max(1.5, estado.media / 14 + estado.stats.mediatico / 22);
  estado.flags.partidoPropio = true;
  estado.escanos = 0;
  hito(estado, '🚩', `Fundas ${nombrePartido}`);
  return propio;
}

// ── Votar una ley ────────────────────────────────────────────────────────────
// El resultado no es un chiste al azar: sale de comparar el vector de la ley
// con el de tu partido. Votar en contra de tu propio electorado se paga en
// credibilidad y en encuestas; votarlo a favor a veces también, porque hay
// leyes coherentes que son impopulares.
export function votarLey(estado, ley, sentido) {
  const p = partidoDe(estado);
  const af = afinidad(p.eje, ley.eje);
  const signo = sentido === 'favor' ? 1 : sentido === 'contra' ? -1 : 0;
  const coherencia = af * signo;                       // -1 .. 1
  const s = estado.stats;

  // ¿Sale adelante? Depende del bloque y de si el tuyo empuja o frena
  const bloqueIzq = ['podemos', 'sumar', 'psoe'].includes(estado.partido)
    || (estado.partidoPropio && estado.partidoPropio.eje.eco < 0);
  const empujeIzq = -ley.eje.eco / 100 * 0.5 - ley.eje.soc / 100 * 0.5;
  let prob = 0.5 + empujeIzq * (bloqueIzq ? 0.22 : -0.22) + ley.popular * 0.16 + signo * 0.1;
  prob += (estado.media - 55) / 320;
  const aprobada = dado(limitar(prob, 0.12, 0.9));

  const partes = [];
  const ajuste = (k, v) => { if (v) { s[k] = limitar(s[k] + v); partes.push(`${v > 0 ? '+' : ''}${v} ${ETIQ[k]}`); } };

  if (sentido === 'abstencion') {
    // La abstención española: no te retrata del todo, no te salva del todo
    ajuste('credibilidad', -rango(2, 7));
    ajuste('aparato', rango(1, 5));
    moverApoyo(estado, -azar(0.15, 0.6));
    partes.push('Encuestas a la baja');
  } else {
    const credi = Math.round(coherencia * rango(6, 15));
    ajuste('credibilidad', credi);
    ajuste('moral', Math.round(coherencia * rango(2, 7)));
    // Las encuestas mezclan dos cosas: si el votante quiere esa ley y si tú
    // has quedado como alguien que sabe lo que defiende.
    moverApoyo(estado, signo * ley.popular * azar(0.4, 1.25) + coherencia * azar(0.15, 0.7));
    if (coherencia < -0.25) {
      estado.votosIncoherentes++;
      mediaTemporal(estado, -rango(1, 3), 1);
      partes.push('Tu electorado no lo entiende');
    } else if (coherencia > 0.25) {
      estado.votosCoherentes++;
      estado.media = limitar(estado.media + azar(0.2, 1.1));
    }
    // Votar en dirección "mercado" abre agendas de conferencias. Todo legal,
    // todo declarado, y todo el mundo mirando.
    if (signo * ley.eje.eco > 45) {
      const pasta = rango(6, 26) * 1000;
      estado.dinero += pasta;
      partes.push(`+${pasta.toLocaleString('es')} € en conferencias`);
    }
  }

  estado.leyes.push({ id: ley.id, nombre: ley.nombre, sentido, aprobada, año: estado.año, coherencia: +coherencia.toFixed(2) });
  return { aprobada, coherencia, af, resumen: partes.join(' · ') };
}

const ETIQ = {
  carisma: 'Carisma', gestion: 'Gestión', aparato: 'Aparato', credibilidad: 'Credibilidad',
  mediatico: 'Mediático', aguante: 'Aguante', moral: 'Moral',
};
export { ETIQ };

// ── Encuestas ────────────────────────────────────────────────────────────────
export function moverApoyo(estado, delta) {
  const p = partidoDe(estado);
  const techo = p.techo ?? 40;
  estado.panorama[estado.partido] = limitar((estado.panorama[estado.partido] ?? 3) + delta, 0.8, techo);
  return estado.panorama[estado.partido];
}
export const apoyoDe = estado => estado.panorama[estado.partido] ?? 0;

// ── Crecimiento de la media ──────────────────────────────────────────────────
export function subirTalento(estado, n) {
  estado.talento = Math.min(1.7, estado.talento + n * 0.04);
  return estado.talento;
}

// Sube (o baja) la media ya mismo, pero marcado para deshacerse solo al cabo
// de N años: una crisis de imagen pasa, una traición no.
export function mediaTemporal(estado, delta, años = 1) {
  estado.media = limitar(estado.media + delta);
  estado.temporales.push({ delta, restantes: años });
}

function resolverTemporales(estado) {
  const notas = [];
  estado.temporales = estado.temporales.filter(t => {
    t.restantes--;
    if (t.restantes > 0) return true;
    estado.media = limitar(estado.media - t.delta);
    notas.push(t.delta > 0 ? 'Se acaba el subidón: tu peso vuelve a su sitio.' : 'Pasa el temporal y recuperas el peso político que habías perdido.');
    return false;
  });
  return notas;
}

function rangoPorEdad(edad) {
  if (edad <= 32) return [2.4, 6.3];
  if (edad <= 40) return [1.9, 5.5];
  if (edad <= 48) return [1.2, 4.6];
  if (edad <= 56) return [0.5, 3.4];
  if (edad <= 64) return [-0.4, 2.3];
  return [-1.9, 1.1];
}

function crecerMedia(estado) {
  const s = estado.stats;
  const [min, max] = rangoPorEdad(estado.edad);
  // Frena al acercarse a 100: no es un tope de partida, es que quitarle un
  // punto al que manda cuesta cada vez más.
  // Llegar a los noventa largos tiene que costar de verdad: el freno no tiene
  // suelo apreciable, así que un 100 de peso político es casi imposible.
  const freno = Math.max(0.03, Math.pow(1 - estado.media / 102, 0.78));
  const contexto = 1
    + (s.aparato > 65 ? 0.14 : 0)
    + (s.mediatico > 70 ? 0.12 : 0)
    + (s.moral > 70 ? 0.08 : 0)
    + (s.credibilidad < 35 ? -0.22 : 0)
    + (s.aguante < 40 ? -0.28 : 0);

  let sube = azar(min, max) * estado.talento * contexto;
  if (sube > 0) sube *= freno;
  estado.media = limitar(estado.media + sube);
  return Math.abs(sube) >= 0.35 ? sube : null;
}

// ── Elecciones ───────────────────────────────────────────────────────────────
const IZQ = ['podemos', 'sumar', 'psoe'];

// Reparto de escaños tipo D'Hondt, aproximado: los pequeños pierden mucho,
// los grandes ganan prima. Calibrado con los resultados reales recientes.
export function escanosDe(apoyo) {
  if (apoyo < 4) return Math.round(apoyo * 0.7);
  if (apoyo < 6) return Math.round(apoyo * 1.15);
  if (apoyo < 12) return Math.round(apoyo * 2.7);
  return Math.round(apoyo * (3.2 + Math.min(apoyo, 36) * 0.035));
}

function derivaPanorama(estado) {
  for (const p of PARTIDOS) {
    if (p.id === estado.partido) continue;
    const actual = estado.panorama[p.id] ?? p.apoyo;
    // Reversión a su media histórica + ruido: el bipartidismo respira
    const objetivo = p.apoyo;
    estado.panorama[p.id] = limitar(actual + (objetivo - actual) * 0.16 + azar(-1.7, 1.7), 1, p.techo);
  }
  // Tú: tu peso, tu credibilidad y tu presencia mueven la aguja de los tuyos
  const s = estado.stats;
  const gobierna = !!estado.flags.gobierno;
  const deriva = (estado.media - 56) / 26
    + (s.credibilidad - 50) / 62
    + (s.mediatico - 45) / 74
    + (gobierna ? -0.55 : 0.15)          // desgaste de gobernar
    + azar(-1.5, 1.5);
  moverApoyo(estado, deriva * 0.62);
}

export function celebrarElecciones(estado) {
  const pan = estado.panorama;
  const mios = escanosDe(pan[estado.partido] ?? 0);
  estado.escanos = mios;

  const reparto = {};
  for (const id of Object.keys(pan)) reparto[id] = escanosDe(pan[id]);

  // Nacionalistas y regionalistas: siempre entre 26 y 38 escaños, repartidos
  // entre quien deja gobernar a la izquierda y quien no se moja.
  const otrosIzq = entero(18, 27);
  const junts = entero(5, 9);
  const otrosDer = entero(2, 6);
  const juntsApoya = dado(0.45);        // el comodín de cada investidura

  const esIzq = id => IZQ.includes(id) || (id === 'propio' && estado.partidoPropio?.eje.eco < 0);
  let izq = otrosIzq, der = otrosDer;
  for (const [id, n] of Object.entries(reparto)) (esIzq(id) ? (izq += n) : (der += n));
  if (juntsApoya) izq += junts; else der += junts;

  const ganaIzq = izq >= 176;
  const mioIzq = esIzq(estado.partido);
  const gobierno = ganaIzq === mioIzq && (ganaIzq ? izq : der) >= 176;
  const bloqueado = izq < 176 && der < 176;

  // ¿Eres el partido más votado de tu bloque? De ahí sale quién es candidato.
  const deMiBloque = Object.entries(reparto).filter(([id]) => esIzq(id) === mioIzq);
  const lider = deMiBloque.sort((a, b) => b[1] - a[1])[0]?.[0] === estado.partido;

  estado.legislaturas++;
  const res = {
    año: estado.año, escanos: mios, apoyo: +(pan[estado.partido] ?? 0).toFixed(1),
    izq, der, gobierno, bloqueado, lider, trofeo: null, sucesos: [],
  };

  res.sucesos.push(`ELECCIONES GENERALES: ${estado.partidoNombre} saca ${mios} escaños con el ${res.apoyo}%.`);
  res.sucesos.push(`Bloque de izquierdas ${izq} · bloque de derechas ${der}${juntsApoya ? ' (los siete de Junts, esta vez, hacia la izquierda)' : ''}.`);

  if (bloqueado) {
    estado.flags.gobierno = false;
    estado.cargo = 'Diputado en funciones';
    res.sucesos.push('Nadie llega a 176. Investidura fallida, cuatro meses de tertulia y repetición electoral en el horizonte.');
    estado.stats.moral = limitar(estado.stats.moral - rango(3, 9));
    estado.elecciones.push(res);
    return res;
  }

  if (gobierno && lider && estado.media >= 84) {
    estado.presidencias++;
    estado.flags.gobierno = true;
    estado.flags.presidente = true;
    estado.cargo = 'Presidente del Gobierno';
    if (mios >= 176) estado.flags.mayoriaAbsoluta = true;
    estado.stats.mediatico = limitar(estado.stats.mediatico + rango(10, 20));
    estado.stats.aparato = limitar(estado.stats.aparato + rango(6, 14));
    estado.media = limitar(estado.media + rango(2, 5));
    res.trofeo = { tipo: mios >= 176 ? 'absoluta' : 'moncloa', nombre: mios >= 176 ? 'Mayoría absoluta' : 'Presidencia del Gobierno', año: estado.año, detalle: `${mios} escaños` };
    res.sucesos.push('🏛️ ERES PRESIDENTE DEL GOBIERNO.');
    hito(estado, '🏛️', `Investidura ganada (${mios} escaños)`);
  } else if (gobierno && estado.media >= 76) {
    estado.flags.gobierno = true;
    estado.flags.presidente = false;
    // Si ya estabas en el Consejo, lo normal es repetir cartera: solo cuentan
    // como ministerios nuevos los cambios de silla, no las reelecciones.
    if (estado.flags.eraMinistro && !dado(0.4)) {
      res.sucesos.push(`Repites en el Consejo de Ministros: sigues al frente de ${estado.ministerios.at(-1)}.`);
      estado.stats.gestion = limitar(estado.stats.gestion + rango(3, 7));
    } else {
      const libres = MINISTERIOS.filter(m => !estado.ministerios.includes(m.nombre));
      const min = elegir(libres.length ? libres : MINISTERIOS);
      estado.ministerios.push(min.nombre);
      estado.cargo = `Ministro de ${min.nombre}`;
      if (min.nombre === 'Transportes') estado.flags.ministroTransportes = true;
      estado.stats.gestion = limitar(estado.stats.gestion + rango(5, 12));
      estado.stats.mediatico = limitar(estado.stats.mediatico + rango(4, 11));
      estado.media = limitar(estado.media + rango(1, 4));
      res.trofeo = { tipo: 'ministerio', nombre: `Ministerio de ${min.nombre}`, año: estado.año, detalle: min.sabor };
      res.sucesos.push(`🎖️ Entras en el Consejo de Ministros: ${min.nombre}.`);
      hito(estado, '🎖️', `Ministro de ${min.nombre}`);
    }
    estado.flags.eraMinistro = true;
  } else if (gobierno) {
    estado.flags.gobierno = true;
    estado.flags.presidente = false;
    estado.cargo = estado.media >= 62 ? 'Portavoz adjunto del grupo' : 'Diputado del grupo mayoritario';
    res.sucesos.push('Tu bloque gobierna. A ti te dan un despacho y un turno de palabra en comisión.');
  } else {
    estado.flags.gobierno = false;
    estado.flags.presidente = false;
    estado.flags.eraMinistro = false;   // fuera del Consejo no hay cartera que repetir
    if (lider && estado.media >= 80) {
      estado.flags.jefeOposicion = true;
      estado.cargo = 'Líder de la oposición';
      res.sucesos.push('🪑 Te quedas al frente de la oposición. Cuatro años de escaño azul y una sesión de control por semana.');
      hito(estado, '🪑', 'Líder de la oposición');
    } else {
      estado.cargo = estado.media >= 60 ? 'Portavoz en comisión' : 'Diputado de la oposición';
      res.sucesos.push('A la oposición. Se resiste mejor con el escaño puesto que sin él.');
    }
    estado.stats.moral = limitar(estado.stats.moral - rango(2, 8));
  }

  estado.ultimasElecciones = res;
  estado.elecciones.push(res);
  return res;
}

// ── Ingresos ─────────────────────────────────────────────────────────────────
// `dinero` es el patrimonio declarado, no el sueldo bruto: de lo que ganas cada
// año solo se acumula lo que ahorras. Así los ingresos extraordinarios de los
// eventos (una oferta de fichaje, un consejo de administración) pesan de verdad
// en la cuenta final en vez de perderse en el ruido de cuarenta nóminas.
const AHORRO = 0.18;

function patrimonioAnual(estado) {
  const c = estado.cargo ?? '';
  let base = 19000;
  if (c.includes('Presidente')) base = 92000;
  else if (c.includes('Ministro')) base = 84000;
  else if (c.includes('Líder')) base = 78000;
  else if (c.includes('Portavoz')) base = 72000;
  else if (c.includes('Diputado')) base = 62000;
  else if (estado.media >= 48) base = 46000;
  else if (estado.media >= 34) base = 32000;
  // Libros, conferencias y colaboraciones: legales, declaradas y proporcionales
  // a lo mucho que sales en televisión.
  const extra = Math.round(estado.stats.mediatico * azar(60, 260));
  return Math.round((base + extra) * AHORRO * azar(0.85, 1.15));
}

// ── Simulación de un año ─────────────────────────────────────────────────────
export function simularTemporada(estado) {
  const etapa = etapaDe(estado);
  const s = estado.stats;
  estado.año++; estado.edad++;

  const linea = { año: estado.año, edad: estado.edad, etapa, sucesos: [], destacado: null, trofeo: null };

  // Desgaste del oficio: viajes, madrugones y trescientos actos al año
  s.aguante = limitar(s.aguante
    - entero(estado.edad > 55 ? 2 : 0, estado.edad > 55 ? 6 : 3)
    - (estado.flags.gobierno ? 2 : 0)
    - (estado.flags.presidente ? 2 : 0));
  s.moral = limitar(s.moral + entero(-5, 5) + (48 - s.moral) * 0.07);
  s.credibilidad = limitar(s.credibilidad + (estado.flags.gobierno ? -entero(0, 3) : entero(0, 2)));

  resolverTemporales(estado).forEach(n => linea.sucesos.push(n));

  const subida = crecerMedia(estado);
  if (subida > 0) linea.sucesos.push(`Buen año: ganas peso dentro del partido. Media ${Math.round(estado.media)} (+${subida.toFixed(1)}).`);
  else if (subida < 0) linea.sucesos.push(`Año perdido: te van apartando. Media ${Math.round(estado.media)} (${subida.toFixed(1)}).`);

  // La etapa puede cambiar sola cuando cruzas un umbral de media
  const nuevaEtapa = etapaDe(estado);
  if (nuevaEtapa !== etapa) {
    linea.sucesos.push(`Cambias de nivel: ahora estás en ${nombreEtapa(nuevaEtapa)}.`);
    if (!estado.flags.gobierno) estado.cargo = CARGOS[nuevaEtapa];
  }

  // Encuestas del año
  derivaPanorama(estado);
  const ap = apoyoDe(estado);
  if (estado.año % 2 === 0) {
    linea.sucesos.push(`El CIS sitúa a ${estado.partidoNombre} en el ${ap.toFixed(1)}% (${escanosDe(ap)} escaños estimados).`);
  }

  // Elecciones generales cada cuatro años
  if (estado.año % 4 === 0 && estado.media >= 30) {
    const res = celebrarElecciones(estado);
    res.sucesos.forEach(x => linea.sucesos.push(x));
    if (res.trofeo) linea.trofeo = res.trofeo;
    if (res.trofeo?.tipo === 'moncloa' || res.trofeo?.tipo === 'absoluta') linea.destacado = '🏛️ ¡LA MONCLOA!';
  }

  // Guerra interna: siempre hay alguien de los tuyos afilando el cuchillo
  const r = estado.rival;
  if (r.activo && dado(0.4) && estado.media > 36) {
    r.peso = limitar(r.peso + entero(1, 6));
    if (estado.media + s.aparato * 0.25 + azar(-10, 12) >= r.peso + 14) {
      r.derrotasTuyas++;
      s.aparato = limitar(s.aparato + rango(3, 8));
      s.moral = limitar(s.moral + rango(2, 6));
      linea.sucesos.push(`${r.nombre} intenta moverte la silla en el comité federal y se queda solo.`);
    } else {
      r.victoriasSuyas++;
      s.moral = limitar(s.moral - rango(3, 9));
      mediaTemporal(estado, -rango(1, 3), 1);
      linea.sucesos.push(`${r.nombre} te gana una votación interna. Duele más que perder unas elecciones.`);
    }
  }

  // Ingresos y ruido de fondo
  estado.dinero += patrimonioAnual(estado);
  if (dado(0.5)) linea.sucesos.push(elegir(RUIDO));

  // Un año de gobierno con mala salud política puede acabar en moción
  if (estado.flags.presidente && apoyoDe(estado) < 16 && dado(0.35)) {
    if (estado.media + azar(-8, 14) > 82) {
      estado.flags.sobrevivioMocion = true;
      linea.sucesos.push('⚖️ Moción de censura. La aguantas por seis votos y sales más fuerte de lo que entraste.');
      s.mediatico = limitar(s.mediatico + rango(4, 10));
      hito(estado, '⚖️', 'Sobreviviste a una moción de censura');
    } else {
      estado.flags.presidente = false; estado.flags.gobierno = false;
      estado.cargo = 'Líder de la oposición';
      estado.flags.jefeOposicion = true;
      mediaTemporal(estado, -rango(4, 9), 2);
      linea.sucesos.push('⚖️ Prospera la moción de censura. Sales de Moncloa por la puerta de atrás y con la maleta hecha.');
      hito(estado, '⚖️', 'Perdiste Moncloa en una moción de censura');
    }
  }

  estado.cronica.push(linea);
  return linea;
}

export function hito(estado, emoji, texto) {
  estado.hitos.push({ emoji, texto, año: estado.año });
}

export const comunidadAleatoria = actual => elegir(COMUNIDADES.filter(c => c !== actual));

// ── Retirada ─────────────────────────────────────────────────────────────────
export function debeRetirarse(estado) {
  if (estado.retirado) return false;
  if (estado.edad >= 74) return 'edad';
  if (estado.edad >= 40) {
    if (estado.stats.aguante <= 10) return 'salud';
    if (estado.stats.moral <= 6) return 'moral';
    if (estado.edad >= 58 && estado.media < 44 && dado(0.3)) return 'listas';
  }
  return false;
}

export function retirar(estado, causa) {
  estado.retirado = true;
  estado.causaRetiro = causa;
}

// ── Puntuación final, rangos y logros ────────────────────────────────────────
export function legado(estado) {
  const s = estado.stats;
  let pts = 0;
  pts += estado.presidencias * 300;
  pts += estado.ministerios.length * 90;
  pts += estado.flags.liderPartido ? 120 : 0;
  pts += estado.flags.jefeOposicion ? 60 : 0;
  pts += estado.flags.mayoriaAbsoluta ? 90 : 0;
  pts += estado.media * 3.6;
  pts += estado.escanos * 0.55;
  pts += estado.leyes.filter(l => l.aprobada && l.coherencia > 0.2).length * 12;
  pts += estado.leyes.length * 4;
  pts += s.credibilidad * 1.6;
  pts += s.mediatico * 0.9;
  pts += s.aparato * 0.8;
  pts += s.gestion * 0.6;
  pts += estado.hitos.length * 5;
  pts += Math.min(estado.dinero / 22000, 45);
  pts -= estado.transfuguismos * 35;
  pts -= estado.votosIncoherentes * 12;
  if (estado.causaRetiro === 'puertas') pts -= 55;
  if (estado.causaRetiro === 'eleccion') pts += 40;
  return Math.round(pts);
}

// Un rango puede exigir además una media mínima y un requisito real de carrera:
// no basta con acumular puntuación para llamarte ministro, hay que haber tenido
// cartera. Se coge el primero que se cumple entero.
export function rangoDe(pts, estado) {
  const media = estado?.media ?? 0;
  return RANGOS.find(r => pts >= r.min && media >= (r.minMedia ?? 0)
    && (!r.cond || (estado && r.cond(estado)))) ?? RANGOS[RANGOS.length - 1];
}

export function logrosDe(estado) {
  return LOGROS.filter(l => { try { return l.cond(estado); } catch { return false; } })
    .map(l => ({ emoji: l.emoji, nombre: l.nombre, desc: l.desc(estado) }));
}

export function apodoDe(estado) {
  if (!estado.apodo) {
    const pool = APODOS_PRENSA.filter(a => !a.cond || a.cond(estado));
    estado.apodo = elegir(pool.length ? pool : APODOS_PRENSA).txt;
  }
  return estado.apodo;
}
