// Catálogo de decisiones.
// Cada opción puede llevar `riesgo` (probabilidad de que salga bien, 0-1).
// efecto(e, ok) recibe si el dado salió a favor. Sin `riesgo`, la opción es segura.
//
// SÁTIRA. Las figuras públicas que aparecen lo hacen por su papel político o
// mediático y todas las situaciones están inventadas. No se atribuye a nadie
// ningún hecho delictivo ni ninguna declaración real.
import {
  dado, elegir, limitar, rango, hito, subirTalento, moverApoyo, partidoDe, subirMedia,
  distancia, ofertaFichaje, cambiarPartido, fundarPartido, votarLey,
  comunidadAleatoria, ETIQ,
} from './motor.js?v=1';
import { LEYES, PARTIDOS, PROGRAMAS, MINISTERIOS } from './datos.js?v=1';

// Aplica cambios. Los valores pueden ser un número o un rango [min, max].
function m(e, deltas) {
  const partes = [];
  for (const [k, def] of Object.entries(deltas)) {
    const v = Array.isArray(def) ? rango(def[0], def[1]) : def;
    if (!v) continue;
    if (k === 'dinero') { e.dinero = Math.max(0, e.dinero + v); partes.push(`${v > 0 ? '+' : ''}${v.toLocaleString('es')} €`); continue; }
    if (k === 'apoyo') { moverApoyo(e, v / 10); partes.push(`${v > 0 ? '+' : ''}${(v / 10).toFixed(1)} pts de intención de voto`); continue; }
    // mediaTexto: solo para mostrar el número tras un mediaTemporal() ya
    // aplicado. No vuelve a tocar e.media (evita duplicar el efecto).
    if (k === 'mediaTexto') { partes.push(`${v > 0 ? '+' : ''}${v} Peso político (temporal)`); continue; }
    if (k === 'media') {
      const real = subirMedia(e, v);
      const n = Math.round(real * 10) / 10;
      if (n) partes.push(`${n > 0 ? '+' : ''}${n} Peso político`);
      continue;
    }
    if (k === 'talento') { subirTalento(e, v); partes.push(`+${v} Proyección`); continue; }
    e.stats[k] = limitar(e.stats[k] + v);
    partes.push(`${v > 0 ? '+' : ''}${v} ${ETIQ[k] ?? k}`);
  }
  return partes.join(' · ');
}

const efecto = (txt, res) => (res ? `${txt}\n\n▸ ${res}` : txt);
const esIzquierda = e => ['podemos', 'sumar', 'psoe'].includes(e.partido)
  || (e.partidoPropio && e.partidoPropio.eje.eco < 0);
const nombreP = e => e.partidoNombre;
const rivalDe = e => e.rival.nombre;

// Rama catastrófica: la carrera se acaba aquí y ahora. Va colgada de las
// opciones más temerarias con una probabilidad muy baja, para que exista de
// verdad el miedo a que una sola tarde te cueste la vida política, pero salte
// en mucho menos del 1% de las partidas.
function expulsion(e, prob = 0.05) {
  if (!dado(prob)) return '';
  e.flags.expulsado = true;
  e.flags.retiroElegido = true;
  e.flags.causaElegida = 'expulsion';
  hito(e, '🚫', `Expulsado de ${e.partidoNombre}`);
  return ' Y esta vez no hay comunicado de apoyo: el comité de garantías abre expediente esa misma noche, la dirección te suspende de militancia a las 48 horas y tu nombre desaparece de la web del partido antes del fin de semana.';
}

const TODAS = ['base', 'local', 'autonomica', 'congreso', 'direccion', 'liderazgo', 'moncloa'];
const DESDE_CONGRESO = ['congreso', 'direccion', 'liderazgo', 'moncloa'];
const DESDE_AUTONOMICA = ['autonomica', 'congreso', 'direccion', 'liderazgo', 'moncloa'];
const CUPULA = ['direccion', 'liderazgo', 'moncloa'];

export const EVENTOS = [
  // ── BASE: agrupación, juventudes, la sede del barrio ──────────────────────
  {
    id: 'primer_dia', etapas: ['base'], peso: 34, unico: true,
    titulo: 'La agrupación del barrio',
    texto: e => `Bajo de un local con fluorescentes y olor a fotocopia, treinta sillas y catorce personas. La secretaria de organización de ${nombreP(e)} te pregunta qué sabes hacer. Es la primera vez que alguien te lo pregunta en serio.`,
    opciones: [
      { txt: 'Pegar carteles', sub: 'Empezar por abajo del todo.',
        efecto: e => efecto('Tres meses de madrugadas con un cubo de cola. Aprendes los nombres de todos y ellos aprenden el tuyo.', m(e, { carisma: [6, 11], aparato: [4, 8], aguante: [-4, -1] })) },
      { txt: 'Llevar las redes', sub: 'La cuenta de la agrupación es tuya.', riesgo: 0.7,
        efecto: (e, ok) => ok
          ? efecto('Multiplicas por veinte el alcance de una agrupación de barrio. En la sede provincial preguntan quién lo lleva.', m(e, { mediatico: [8, 15], media: [1, 3] }))
          : efecto('Publicas un meme que no era. Lo borras en cuatro minutos y en ese tiempo ya hay captura.', m(e, { credibilidad: [-8, -3], mediatico: [2, 5] })) },
      { txt: 'Estudiarte los estatutos', sub: 'Sin gracia, pero funciona.',
        efecto: e => efecto('Te lees los estatutos, el reglamento de congresos y el régimen de compatibilidades. Nadie te lo agradece hasta dentro de diez años.', m(e, { aparato: [9, 14], gestion: [4, 8], talento: [1, 2] })) },
    ],
  },
  {
    id: 'juventudes', etapas: ['base', 'local'], peso: 20,
    titulo: 'Congreso de juventudes',
    texto: e => `Cincuenta chavales en un albergue de Guadalajara, dos candidaturas y una enmienda a la ponencia marco. ${rivalDe(e)} lleva la otra lista y ya ha hablado con más gente que tú.`,
    opciones: [
      { txt: 'Pactar y repartirse', sub: 'Una ejecutiva conjunta.',
        efecto: e => efecto('Cerráis la lista a las cuatro de la mañana con una servilleta. Los dos salís vivos y los dos os debéis un favor.', m(e, { aparato: [6, 10], credibilidad: [-3, 1] })) },
      { txt: 'Ir a por todas', sub: 'O ejecutiva entera o nada.', riesgo: 0.5,
        efecto: (e, ok) => { if (ok) { e.rival.derrotasTuyas++; return efecto(`Arrasas por tres votos. ${rivalDe(e)} te felicita con una sonrisa que vas a recordar veinte años.`, m(e, { aparato: [8, 14], media: [2, 4], carisma: [3, 6] })); }
          e.rival.victoriasSuyas++; return efecto(`Pierdes por tres votos. ${rivalDe(e)} te ofrece la secretaría de formación. La aceptas.`, m(e, { moral: [-10, -4], aparato: [2, 5] })); } },
      { txt: 'Escribir la ponencia', sub: 'Que gane quien quiera; el texto es tuyo.',
        efecto: e => efecto('La ejecutiva se la queda otro, pero el documento que se aprueba lo has escrito tú entero. Eso se nota más tarde.', m(e, { credibilidad: [7, 12], gestion: [5, 9], talento: [1, 3] })) },
    ],
  },
  {
    id: 'primer_curro', etapas: ['base'], peso: 16, unico: true,
    titulo: 'Vivir de esto o no',
    texto: () => 'Te ofrecen un puesto de asesor en el grupo municipal: 1.600 € y dedicación completa. Tienes también una oferta en un despacho que paga el doble y no da titulares.',
    opciones: [
      { txt: 'Asesor del grupo', sub: 'Dentro de la máquina.',
        efecto: e => efecto('Cobras poco y te enteras de todo. A los dos años conoces el presupuesto municipal mejor que el concejal.', m(e, { gestion: [8, 13], aparato: [5, 9], dinero: -3000 })) },
      { txt: 'El despacho', sub: 'Primero la vida, luego la política.',
        efecto: e => efecto('Cotizas, ahorras y llegas a las reuniones del partido a las diez de la noche reventado. Pero llegas sin deberle nada a nadie.', m(e, { dinero: 42000, credibilidad: [4, 9], aparato: [-5, -2] })) },
      { txt: 'Las dos cosas', sub: 'Dormir es de cobardes.', riesgo: 0.55,
        efecto: (e, ok) => ok
          ? efecto('Dos años a cuatro horas de sueño. Sales con contactos, con dinero y con una ojera permanente.', m(e, { dinero: 22000, gestion: [5, 9], aparato: [4, 7], aguante: [-14, -7] }))
          : efecto('Te pillan las incompatibilidades a medias y tienes que elegir en caliente y mal. Quedas de espabilado.', m(e, { credibilidad: [-12, -6], aguante: [-10, -4] })) },
    ],
  },

  // ── LOCAL: el ayuntamiento ────────────────────────────────────────────────
  {
    id: 'lista_municipal', etapas: ['local'], peso: 24,
    titulo: 'El puesto en la lista',
    texto: e => `Se cierran las listas municipales. Tú vas de seis y con seis no se entra. ${rivalDe(e)}, que va de cuatro, te dice que "hay que respetar el trabajo de la agrupación".`,
    opciones: [
      { txt: 'Llamar a la provincial', sub: 'Que decidan arriba.', riesgo: 0.6,
        efecto: (e, ok) => ok
          ? efecto('Bajan la lista corregida desde la sede provincial con tu nombre en el tres. La agrupación no te lo perdona, pero entras.', m(e, { media: [3, 6], aparato: [5, 9], credibilidad: [-6, -2] }))
          : efecto('Desde provincial contestan que "las listas se hacen en el territorio". Te quedas de seis y de seis no se entra.', m(e, { moral: [-11, -5], aparato: [-4, -1] })) },
      { txt: 'Aceptar el seis', sub: 'Ya llegará.',
        efecto: e => efecto('Te tragas el sapo y haces la campaña más leal de tu vida. En la sede toman nota de quién no montó un pollo.', m(e, { aparato: [7, 12], moral: [-5, -1], credibilidad: [3, 7] })) },
      { txt: 'Amenazar con irte', sub: 'Tienes otra oferta y lo sabes.', riesgo: 0.45,
        efecto: (e, ok) => ok
          ? efecto('Te suben al dos en 48 horas. Nadie vuelve a hablar del tema y todo el mundo lo recuerda.', m(e, { media: [4, 8], aparato: [3, 7], credibilidad: [-9, -4] }))
          : efecto('Te dicen que la puerta está ahí. Te quedas igual y ahora saben que te puedes ir.', m(e, { credibilidad: [-10, -5], moral: [-8, -3] })) },
    ],
  },
  {
    id: 'cercanias_foto', etapas: ['local', 'autonomica', 'congreso'], peso: 20,
    titulo: 'La foto en el Cercanías',
    texto: () => 'Tu jefa de prensa quiere una foto tuya a las 7:10 en el andén, con el resto de la gente que va a trabajar, para el hilo sobre el estado de la red. El coche oficial puede esperarte a la salida de la estación de destino.',
    opciones: [
      { txt: 'Ir en tren de verdad', sub: 'Hasta el final y con retraso.', riesgo: 0.75,
        efecto: (e, ok) => { e.flags.cercanias = true; return ok
          ? efecto('Vas de pie 52 minutos con un retraso de 18. Sales en la tele hablando con una señora sobre la línea C-4 y es el mejor minuto de tu carrera.', m(e, { mediatico: [8, 15], credibilidad: [7, 13], apoyo: [3, 9], aguante: [-5, -2] }))
          : efecto('Se cancela el tren. Te quedas en el andén hora y cuarto con el equipo de cámara grabando. El vídeo se hace viral igualmente, pero no como querías.', m(e, { mediatico: [6, 12], moral: [-7, -2], apoyo: [-2, 3] })); } },
      { txt: 'Foto y luego el coche', sub: 'Lo eficiente.', riesgo: 0.4,
        efecto: (e, ok) => { e.flags.cocheOficial = true; return ok
          ? efecto('Foto perfecta, tuit a las 7:40 y en el despacho a las 8:15. Nadie ve el coche.', m(e, { mediatico: [5, 9], apoyo: [1, 5] }))
          : efecto('Un usuario graba cómo te bajas en la siguiente estación y te metes en el coche oficial. El vídeo tiene más alcance que tu hilo.', m(e, { credibilidad: [-16, -9], mediatico: [7, 13], apoyo: [-6, -1] })); } },
      { txt: 'Nada de postureo', sub: 'Hablar de la red sin usarla de decorado.',
        efecto: e => efecto('Presentas los datos de puntualidad línea por línea sin una sola foto. Lo lee poca gente y todos son periodistas de transporte.', m(e, { credibilidad: [8, 14], gestion: [5, 9], mediatico: [-4, -1] })) },
    ],
  },
  {
    id: 'obra_rotonda', etapas: ['local'], peso: 17,
    titulo: 'La rotonda o el ambulatorio',
    texto: () => 'Queda un millón doscientos mil euros del remanente y dos peticiones sobre la mesa: una rotonda con escultura a la entrada del pueblo o ampliar el centro de salud. La rotonda se inaugura antes de las elecciones. El centro de salud, dos años después.',
    opciones: [
      { txt: 'La rotonda', sub: 'Se ve, se corta la cinta y sale en el periódico.', riesgo: 0.65,
        efecto: (e, ok) => ok
          ? efecto('Inauguración con banda de música y foto en portada del semanario comarcal. La escultura es horrible y a la gente le encanta.', m(e, { mediatico: [7, 12], apoyo: [4, 9], credibilidad: [-5, -1] }))
          : efecto('La escultura se convierte en meme comarcal antes de que se seque el hormigón. Te llaman "el de la chatarra" durante años.', m(e, { mediatico: [8, 14], credibilidad: [-10, -5], apoyo: [-5, -1] })) },
      { txt: 'El centro de salud', sub: 'Se ve en 2028.',
        efecto: e => efecto('Firmas el proyecto sabiendo que la cinta la va a cortar tu sucesor. Los médicos del centro lo cuentan a todo el que entra por la puerta.', m(e, { gestion: [9, 14], credibilidad: [8, 13], mediatico: [-3, 0], apoyo: [-1, 4] })) },
      { txt: 'Partirlo en dos', sub: 'Media rotonda y medio ambulatorio.',
        efecto: e => efecto('Sale una rotonda sin escultura y media planta del centro de salud. Nadie está contento y todos están razonablemente servidos. Bienvenido a la política.', m(e, { gestion: [4, 8], aparato: [3, 7], moral: [-3, 1] })) },
    ],
  },
  {
    id: 'pacto_local', etapas: ['local', 'autonomica'], peso: 18,
    titulo: 'La alcaldía se decide con un voto',
    texto: e => {
      const otros = PARTIDOS.filter(p => p.id !== e.partido);
      const cerca = otros.sort((a, b) => distancia(partidoDe(e).eje, a.eje) - distancia(partidoDe(e).eje, b.eje));
      return `Empate técnico. Puedes ser tú con los votos de ${cerca[0].nombre}, o dejar gobernar al más votado y quedarte de oposición con la cabeza alta. El teléfono de la sede provincial lleva sonando desde las nueve.`;
    },
    opciones: [
      { txt: 'Pactar y gobernar', sub: 'La vara de mando es la vara de mando.', riesgo: 0.7,
        efecto: (e, ok) => ok
          ? efecto('Sales investido con una mayoría de dos votos y un acuerdo de doce folios que no lee nadie. Gobiernas cuatro años.', m(e, { media: [4, 8], gestion: [6, 11], aparato: [4, 8], credibilidad: [-6, -2] }))
          : efecto('El pacto se cae en la sesión de investidura por un concejal que se abstiene "por conciencia". Sale investido el otro y tú sales retratado.', m(e, { moral: [-12, -6], media: [-3, -1], mediatico: [3, 7] })) },
      { txt: 'Dejar gobernar al más votado', sub: 'Coherencia por delante.',
        efecto: e => efecto('Anuncias que no vas a pactar contra la lista más votada. La militancia te lo discute en la asamblea y el resto del país te da la razón durante 48 horas.', m(e, { credibilidad: [10, 16], moral: [4, 9], media: [-2, 1], apoyo: [2, 6] })) },
      { txt: 'Vender el voto caro', sub: 'Concejalías, presupuesto y agenda.', riesgo: 0.5,
        efecto: (e, ok) => ok
          ? efecto('Sacas tres concejalías, la portavocía y una partida entera para tu barrio. Te llaman de la sede provincial para aprender a hacerlo.', m(e, { aparato: [8, 14], gestion: [5, 9], dinero: 14000, credibilidad: [-8, -3] }))
          : efecto('Pides tanto que el otro prefiere pactar con el tercero. Te quedas fuera del gobierno y con fama de imposible.', m(e, { credibilidad: [-9, -4], moral: [-8, -3] })) },
    ],
  },

  // ── AUTONÓMICA ────────────────────────────────────────────────────────────
  {
    id: 'baron_territorial', etapas: DESDE_AUTONOMICA, peso: 18,
    titulo: 'El barón te llama',
    texto: e => `El presidente autonómico de ${nombreP(e)} en ${e.comunidad} te cita en su despacho. Quiere saber si en el próximo congreso federal estás con la dirección nacional o con el territorio. No hay tercera respuesta.`,
    opciones: [
      { txt: 'Con el territorio', sub: 'Aquí es donde se hacen las listas.',
        efecto: e => efecto('Te blindas en tu comunidad. Nadie te mueve de ahí y nadie te saca de ahí tampoco.', m(e, { aparato: [10, 16], media: [2, 5], mediatico: [-3, 0] })) },
      { txt: 'Con la dirección nacional', sub: 'Madrid manda.', riesgo: 0.6,
        efecto: (e, ok) => ok
          ? efecto('La dirección nacional gana el congreso y tú apareces en la ejecutiva federal. En tu comunidad no te hablan, pero sales en la foto de Ferraz.', m(e, { media: [5, 9], mediatico: [5, 10], aparato: [-4, 0] }))
          : efecto('Gana el territorio y tú te quedas retratado. Te dan la portavocía de Agricultura en la comisión de los martes.', m(e, { media: [-4, -2], moral: [-9, -4], aparato: [-6, -2] })) },
      { txt: 'No mojarte', sub: 'Ni contigo ni contra ti.', riesgo: 0.45,
        efecto: (e, ok) => ok
          ? efecto('Aguantas dos meses de llamadas sin decir nada. Cuando se resuelve, los dos bandos creen que estabas con ellos.', m(e, { aparato: [5, 9], credibilidad: [-4, 0], gestion: [3, 6] }))
          : efecto('Los dos bandos deciden que no eres de fiar. Te quedas sin padrino en ninguna de las dos sedes.', m(e, { aparato: [-9, -4], moral: [-7, -3] })) },
    ],
  },
  {
    id: 'tren_tunel', etapas: DESDE_AUTONOMICA, peso: 17, unico: true,
    titulo: 'Los trenes que no caben',
    texto: e => `Los trenes nuevos para ${e.comunidad} llevan dos años encargados. Alguien ha medido mal y no pasan por los túneles. Tú eres quien tiene que salir a explicarlo esta tarde, y hay memes desde ayer.`,
    opciones: [
      { txt: 'Dar la cara con los datos', sub: 'Cronología, culpas y calendario.', riesgo: 0.65,
        efecto: (e, ok) => ok
          ? efecto('Sales con un powerpoint de nueve diapositivas, admites el error, das fecha y no te escondes. La rueda de prensa se estudia en las facultades de comunicación política.', m(e, { credibilidad: [11, 18], gestion: [6, 11], mediatico: [5, 10] }))
          : efecto('Dices "la anchura del túnel es un parámetro dinámico" y la frase te acompaña hasta el final de tus días.', m(e, { credibilidad: [-12, -6], mediatico: [10, 18] })) },
      { txt: 'Culpar a la empresa', sub: 'El error es del fabricante.',
        efecto: e => efecto('Sacas el pliego, señalas al contratista y anuncias penalizaciones. Técnicamente correcto y políticamente insuficiente: los trenes siguen sin caber.', m(e, { gestion: [4, 8], credibilidad: [-4, 1], apoyo: [-3, 1] })) },
      { txt: 'Anunciar túneles nuevos', sub: 'Si el tren no cabe, se ensancha el agujero.', riesgo: 0.35,
        efecto: (e, ok) => ok
          ? efecto('Anuncias 340 millones para ensanchar los túneles. Suena a locura, sale adelante y en ocho años funciona. Nadie se acuerda ya de que fuiste tú.', m(e, { media: [3, 6], gestion: [7, 12], apoyo: [3, 8] }))
          : efecto('El titular es "ensanchará los túneles de media España". Los memes duran un lustro y el presupuesto no llega nunca.', m(e, { credibilidad: [-11, -5], mediatico: [12, 20], apoyo: [-5, -1] })) },
    ],
  },
  {
    id: 'ayuso_caña', etapas: DESDE_AUTONOMICA, peso: 15,
    titulo: 'La caña como programa electoral',
    texto: () => 'Un adversario tuyo ha convertido "irse de cañas" en política pública y le está funcionando: sale en todas las terrazas, todas las portadas y todos los TikToks. Tu equipo te pide que hagas "algo así, pero tuyo".',
    opciones: [
      { txt: 'Copiar el formato', sub: 'Terraza, camisa remangada, cámara.', riesgo: 0.4,
        efecto: (e, ok) => ok
          ? efecto('Funciona. Resulta que la gente quiere ver a los políticos comiendo. Tu vídeo del bocadillo de calamares supera los tres millones.', m(e, { mediatico: [10, 17], carisma: [4, 8], apoyo: [3, 8], credibilidad: [-4, 0] }))
          : efecto('Se te ve pidiendo la caña con una naturalidad de anuncio de seguros. El montaje comparativo tiene más visitas que el original.', m(e, { credibilidad: [-9, -4], mediatico: [5, 10], moral: [-5, -1] })) },
      { txt: 'Ir al revés: datos y aburrimiento', sub: 'Ser el adulto de la sala.',
        efecto: e => efecto('Te pasas la campaña con gráficos. Pierdes el ciclo mediático y ganas a los editorialistas, que no votan pero escriben.', m(e, { credibilidad: [9, 15], gestion: [5, 9], mediatico: [-6, -2], apoyo: [-3, 2] })) },
      { txt: 'Reírte de ello en directo', sub: 'Sátira contra sátira.', riesgo: 0.55,
        efecto: (e, ok) => ok
          ? efecto('Te grabas pidiendo "una caña y un debate de financiación autonómica". El clip lo comparte hasta el rival. Empate mediático, victoria tuya.', m(e, { mediatico: [9, 15], carisma: [6, 11], apoyo: [2, 6] }))
          : efecto('El chiste no se entiende y queda como si estuvieras despreciando a la gente que se toma cañas. Dos días de aclaraciones.', m(e, { mediatico: [4, 9], apoyo: [-6, -2], credibilidad: [-6, -2] })) },
    ],
  },

  // ── CONGRESO: el hemiciclo ────────────────────────────────────────────────
  {
    id: 'primer_pleno', etapas: DESDE_CONGRESO, peso: 18, unico: true,
    titulo: 'Tu primera intervención en el hemiciclo',
    texto: () => 'Tres minutos en el turno de fijación de posiciones, a las dos y cuarto de la tarde, con el hemiciclo medio vacío. Tienes el discurso escrito por los servicios del grupo, con dos chistes que no son tuyos.',
    opciones: [
      { txt: 'Leer el discurso del grupo', sub: 'No te la juegas el primer día.',
        efecto: e => efecto('Lo lees limpio, sin errores y sin gracia. La portavoz te dice "muy bien" y no vuelve a acordarse.', m(e, { aparato: [5, 9], credibilidad: [2, 5], mediatico: [0, 2] })) },
      { txt: 'Salirte del papel', sub: 'Hablar de lo que sabes de verdad.', riesgo: 0.6,
        efecto: (e, ok) => ok
          ? efecto('Cuentas el caso de una vecina de tu barrio con nombre y apellidos. El corte se emite en los cuatro informativos de la noche.', m(e, { mediatico: [10, 17], carisma: [7, 12], media: [2, 5], aparato: [-4, -1] }))
          : efecto('Te vas por las ramas, se te acaba el tiempo y la presidencia te corta el micrófono a mitad de frase. Ese es el clip que circula.', m(e, { mediatico: [3, 7], credibilidad: [-7, -3], moral: [-6, -2] })) },
      { txt: 'Preparártelo tres semanas', sub: 'Memorizado, cronometrado y ensayado.',
        efecto: e => efecto('Te lo aprendes de memoria y lo bordas. Nadie se entera porque son las dos y cuarto, pero tú ya sabes que puedes.', m(e, { carisma: [7, 12], credibilidad: [5, 9], talento: [1, 3], aguante: [-4, -1] })) },
    ],
  },
  {
    id: 'vito_micro', etapas: DESDE_CONGRESO, peso: 20,
    titulo: 'El micrófono en la puerta',
    texto: () => 'Sales por la puerta de los Leones y ahí está Vito Quiles con el micrófono de espuma, la cámara y una pregunta diseñada para que cualquier respuesta tuya sea inservible. Detrás, dos móviles grabando en vertical y una cuenta esperando el corte.',
    opciones: [
      { txt: 'Contestarle con humor', sub: 'La ironía desactiva el formato.', riesgo: 0.65,
        efecto: (e, ok) => { e.flags.viral = true; return ok
          ? efecto('Le respondes sonriendo, sin morder, con una frase que se lleva el clip. El vídeo se hace viral en el bando contrario al suyo.', m(e, { mediatico: [11, 18], carisma: [7, 12], apoyo: [2, 7] }))
          : efecto('Intentas la ironía, no se entiende sin contexto y el corte de doce segundos te deja fatal. El contexto nunca viaja.', m(e, { mediatico: [8, 14], credibilidad: [-8, -3], moral: [-5, -1] })); } },
      { txt: 'Pasar de largo', sub: 'Sin material no hay vídeo.',
        efecto: e => efecto('Andas veinte metros mirando al frente. El vídeo se publica igual con el rótulo "huye de las preguntas", pero dura tres días en vez de tres semanas.', m(e, { mediatico: [1, 4], credibilidad: [-3, 1], moral: [-3, 0] })) },
      { txt: 'Pedir que le retiren la acreditación', sub: 'Es un problema de la Cámara.', riesgo: 0.5,
        efecto: (e, ok) => ok
          ? efecto('La Mesa retira la acreditación por alteración del orden. Tus votantes lo celebran, los suyos lo convierten en bandera y él gana 90.000 seguidores.', m(e, { aparato: [5, 10], mediatico: [4, 9], credibilidad: [-4, 1] }))
          : efecto('La Mesa no lo ve claro y el asunto se convierte en un debate sobre libertad de prensa donde tú eres el malo del titular.', m(e, { credibilidad: [-11, -5], mediatico: [6, 12], apoyo: [-4, 0] })) },
    ],
  },
  {
    id: 'rufian_zasca', etapas: DESDE_CONGRESO, peso: 18,
    titulo: 'Te dedican la frase del día',
    texto: () => 'En el turno de réplica, Gabriel Rufián te dedica una de las suyas: preparada, corta y con la cadencia justa para que el corte dure doce segundos. El hemiciclo se ríe. Las cámaras están en tu cara, no en la suya, y te quedan cuarenta segundos de turno.',
    opciones: [
      { txt: 'Devolvérsela ahí mismo', sub: 'Improvisar en caliente.', riesgo: 0.45,
        efecto: (e, ok) => ok
          ? efecto('Le contestas sin papeles y mejor que él. El clip que circula es el tuyo y hasta su propia bancada aprieta los labios.', m(e, { mediatico: [12, 20], carisma: [9, 15], media: [2, 5] }))
          : efecto('Contestas con algo largo y sin punchline. El montaje "zasca y respuesta" acumula cuatro millones y tú sales de relleno.', m(e, { mediatico: [5, 10], moral: [-9, -4], carisma: [-5, -1] })) },
      { txt: 'Ignorarlo y seguir con los datos', sub: 'No entrar al trapo.',
        efecto: e => efecto('Sigues con la enmienda a la partida 452B. En el hemiciclo pierdes; en la crónica del día siguiente, el que queda serio eres tú.', m(e, { credibilidad: [7, 12], gestion: [4, 8], mediatico: [-3, 1] })) },
      { txt: 'Reírte tú también', sub: 'Aplaudirle la gracia.', riesgo: 0.75,
        efecto: (e, ok) => ok
          ? efecto('Te ríes, aplaudes tres veces y él se queda sin efecto. La imagen de los dos riéndose desarma a los dos bandos.', m(e, { carisma: [8, 13], credibilidad: [5, 9], mediatico: [4, 8] }))
          : efecto('Tu risa sale rara en cámara y el rótulo del clip es "se ríe mientras le retratan". No hay manera.', m(e, { mediatico: [3, 7], credibilidad: [-6, -2] })) },
    ],
  },
  {
    id: 'pinganillo', etapas: DESDE_CONGRESO, peso: 14,
    titulo: 'El pinganillo',
    texto: () => 'Un diputado interviene en gallego, catalán y euskera en la misma sesión. Hay traductores contratados, auriculares en cada escaño y una factura anual que la oposición redondea al alza cada martes. La prensa quiere tu foto poniéndotelo o quitándotelo.',
    opciones: [
      { txt: 'Ponértelo y escuchar', sub: 'Es el reglamento.',
        efecto: e => efecto(esIzquierda(e) ? 'Te lo pones sin darle importancia. En tu bancada es lo normal; en la de enfrente hay tres escaños vacíos de golpe.' : 'Te lo pones, escuchas y luego dices en el pasillo que te parece un despilfarro. La foto vale más que el argumento.', m(e, { credibilidad: [4, 9], apoyo: esIzquierda(e) ? [1, 5] : [-4, 0] })) },
      { txt: 'Quitártelo delante de las cámaras', sub: 'El gesto es el mensaje.', riesgo: 0.6,
        efecto: (e, ok) => ok
          ? efecto('Te lo quitas despacio, lo dejas en la mesa y miras al frente. La foto abre cinco portadas.', m(e, { mediatico: [10, 17], apoyo: esIzquierda(e) ? [-6, -1] : [3, 8], credibilidad: [-4, 2] }))
          : efecto('Te lo quitas y resulta que estaba interviniendo un diputado de tu propio grupo. El corte no perdona.', m(e, { mediatico: [7, 13], credibilidad: [-10, -4], moral: [-5, -1] })) },
      { txt: 'Pedir la factura por escrito', sub: 'La vía aburrida.',
        efecto: e => efecto('Registras una pregunta escrita sobre el coste real. Contestan en cuatro meses y el número es mucho menor del que se decía. Lo publicas y no lo lee nadie.', m(e, { gestion: [6, 11], credibilidad: [5, 9], mediatico: [-2, 1] })) },
    ],
  },
  {
    id: 'micro_abierto', etapas: DESDE_CONGRESO, peso: 15, unico: true,
    titulo: 'Micrófono abierto',
    texto: () => 'Estás sentado en tu escaño, crees que el micro está cerrado y dices en voz baja algo sobre el orador que ha de quedarse entre tú y el diputado de al lado. El micro no estaba cerrado. Hay audio.',
    opciones: [
      { txt: 'Decir que hablabas de fruta', sub: 'El clásico moderno.', riesgo: 0.6,
        efecto: (e, ok) => ok
          ? efecto('Sales a decir con toda la cara que hablabas de fruta. Media España se ríe contigo, la otra media se ríe de ti y las dos comparten el vídeo.', m(e, { mediatico: [12, 20], carisma: [5, 10], credibilidad: [-6, -2], apoyo: [1, 6] }))
          : efecto('Nadie te compra la fruta. Tienes que pedir perdón en el pleno siguiente leyendo un papel que te han escrito.', m(e, { credibilidad: [-13, -7], mediatico: [8, 14], moral: [-7, -2] })) },
      { txt: 'Pedir perdón en el acto', sub: 'Cortar por lo sano.',
        efecto: e => efecto('Pides la palabra por alusiones, pides perdón en veinte segundos y te sientas. Se acaba en un día y algún adversario incluso te lo reconoce.', m(e, { credibilidad: [6, 12], moral: [-3, 1], mediatico: [3, 7] })) },
      { txt: 'Mantenerlo', sub: 'Lo dicho, dicho está.', riesgo: 0.5,
        efecto: (e, ok) => ok
          ? efecto('Repites la frase en el pasillo, con el micro delante y sin pestañear. Tus votantes se vuelven locos y tú ganas un mote para siempre.', m(e, { mediatico: [13, 21], apoyo: [3, 9], credibilidad: [-8, -3], moral: [4, 8] }))
          : efecto('Lo mantienes, el Consejo de Ministros lo aprovecha, tu propio partido te desautoriza y acabas pidiendo perdón igual pero una semana más tarde.', m(e, { credibilidad: [-14, -8], aparato: [-8, -3], mediatico: [7, 13] })) },
    ],
  },
  {
    id: 'tuit_madrugada', etapas: DESDE_CONGRESO, peso: 16,
    titulo: 'Las 03:12 de la madrugada',
    texto: () => 'No puedes dormir, tienes el teléfono en la mano y en la línea de tiempo hay un bulo sobre ti con 14.000 compartidos. El borrador que has escrito es bueno, es cierto y es un error.',
    opciones: [
      { txt: 'Publicarlo', sub: 'A las tres y doce.', riesgo: 0.4,
        efecto: (e, ok) => { e.flags.viral = true; return ok
          ? efecto('Publicas, arrasas y a las nueve de la mañana el bulo está desmentido y tú eres tendencia por lo que dijiste, no por lo que decían de ti.', m(e, { mediatico: [12, 19], carisma: [5, 10], apoyo: [2, 7], aguante: [-4, -1] }))
          : efecto('Publicas, y la captura de tu tuit de las 03:12 se convierte en el chiste del año. Da igual que tuvieras razón.', m(e, { mediatico: [9, 15], credibilidad: [-11, -5], moral: [-8, -3] })); } },
      { txt: 'Dárselo a prensa por la mañana', sub: 'Con dos fuentes y sin adjetivos.',
        efecto: e => efecto('A las once lo lleva un periódico con documentación. El desmentido tarda más, pero aguanta y no lleva tu firma emocional encima.', m(e, { credibilidad: [8, 13], gestion: [3, 7], mediatico: [2, 6] })) },
      { txt: 'Dejar el móvil y dormir', sub: 'Radical.',
        efecto: e => efecto('Lo dejas boca abajo y duermes siete horas. Por la mañana el bulo se ha desinflado solo y tú tienes cara de persona.', m(e, { aguante: [7, 13], moral: [5, 10], mediatico: [-4, -1] })) },
    ],
  },
  {
    id: 'falcon', etapas: DESDE_CONGRESO, peso: 17,
    titulo: 'Falcon, AVE o carretera',
    texto: () => 'Tienes acto en Canarias a las nueve de la mañana y comparecencia en Madrid a las cinco de la tarde. El Falcon resuelve el día. Llevas seis años tuiteando chistes sobre el Falcon de Pedro Sánchez y ahora la puerta del avión te la abren a ti.',
    opciones: [
      { txt: 'Coger el Falcon', sub: 'Es que si no, no llegas.', riesgo: 0.45,
        efecto: (e, ok) => { e.flags.falcon = true; return ok
          ? efecto('Llegas a los dos actos, explicas el coste por hora de vuelo y la alternativa, y el asunto muere en dos días. Aprendes que dar el dato antes que el titular funciona.', m(e, { gestion: [4, 9], credibilidad: [-4, 1], aguante: [3, 7] }))
          : efecto('Alguien recupera tus catorce tuits contra el Falcon y hace un hilo cronológico. El hilo tiene más alcance que los dos actos juntos.', m(e, { credibilidad: [-14, -8], mediatico: [8, 14], apoyo: [-5, -1] })); } },
      { txt: 'Comercial y AVE, aunque llegues tarde', sub: 'Coherencia con billete de turista.',
        efecto: e => efecto('Vuelas en línea regular, corres por Barajas y llegas a la comparecencia con 20 minutos de retraso y la camisa por fuera. La foto corriendo con la maleta te da más que el discurso.', m(e, { credibilidad: [10, 16], mediatico: [5, 10], aguante: [-8, -3] })) },
      { txt: 'Cancelar el acto de Canarias', sub: 'No se puede estar en dos sitios.',
        efecto: e => efecto('Lo cancelas y lo explicas. En Canarias no te lo perdonan y el titular es "desprecio a las islas". Tres días.', m(e, { apoyo: [-5, -1], moral: [-4, 0], credibilidad: [3, 7] })) },
    ],
  },
  {
    id: 'presupuestos', etapas: DESDE_CONGRESO, peso: 19,
    titulo: 'Los presupuestos van a decaer',
    texto: e => `Faltan dos votos para sacar adelante los Presupuestos Generales del Estado. Un grupo pequeño pide una enmienda territorial que en tu programa no está, y ${rivalDe(e)} ya ha dicho en el grupo que él no la firma.`,
    opciones: [
      { txt: 'Aceptar la enmienda', sub: 'Presupuestos por encima de todo.', riesgo: 0.7,
        efecto: (e, ok) => ok
          ? efecto('Salen los Presupuestos por dos votos. Gobiernas cuatro años con cuentas propias, que es la diferencia entre gobernar y sobrevivir.', m(e, { gestion: [8, 14], media: [3, 6], credibilidad: [-6, -2], apoyo: [-3, 3] }))
          : efecto('Aceptas la enmienda, se filtra el texto y el grupo pequeño pide más. Los Presupuestos decaen igual y encima con la enmienda publicada.', m(e, { credibilidad: [-12, -6], media: [-3, -1], moral: [-8, -3] })) },
      { txt: 'Prorrogar las cuentas', sub: 'Gobernar con las del año pasado.',
        efecto: e => efecto('Prórroga presupuestaria. Se puede gobernar así —muchos lo han hecho— pero cada partida nueva es una negociación de tres semanas.', m(e, { gestion: [-5, -1], credibilidad: [4, 9], moral: [-4, 0] })) },
      { txt: 'Llevarlo a votación y perder de pie', sub: 'Que cada uno retrate su voto.', riesgo: 0.4,
        efecto: (e, ok) => ok
          ? efecto('Los llevas al pleno sin ceder. Decaen, pero la foto de quién votó qué te da munición durante dos años y sube tu credibilidad entre los tuyos.', m(e, { credibilidad: [9, 15], apoyo: [2, 7], gestion: [-4, 0] }))
          : efecto('Decaen y la lectura general es que no sabes sumar. Es el argumento de todas las tertulias del trimestre.', m(e, { media: [-4, -2], credibilidad: [-6, -2], apoyo: [-6, -2] })) },
    ],
  },
  {
    id: 'ministro_transportes', etapas: DESDE_CONGRESO, peso: 13, unico: true, cond: e => e.media >= 66,
    titulo: 'Te ofrecen Transportes',
    texto: () => 'El presidente te ofrece el Ministerio de Transportes. Es un ministerio enorme, con presupuesto de verdad y obra que se ve. También es el ministerio donde cada avería de Cercanías lleva tu cara en el telediario de las nueve.',
    opciones: [
      { txt: 'Aceptar', sub: 'Presupuesto, obra y BOE.',
        efecto: e => { e.ministerios.push('Transportes'); e.flags.ministroTransportes = true; e.cargo = 'Ministro de Transportes';
          hito(e, '🚆', 'Ministro de Transportes');
          return efecto('Juras el cargo y a los once días descarrila un tren de mercancías en Zaragoza. A partir de ahí, todas las mañanas empiezan mirando el parte de incidencias.', m(e, { media: [5, 9], gestion: [7, 12], mediatico: [7, 12], aguante: [-9, -4], moral: [-5, 0] })); } },
      { txt: 'Pedir otra cartera', sub: 'Cultura, por ejemplo.', riesgo: 0.5,
        efecto: (e, ok) => { if (ok) { const min = elegir(MINISTERIOS.filter(x => !x.marron)); e.ministerios.push(min.nombre); e.cargo = `Ministro de ${min.nombre}`;
            hito(e, min.emoji, `Ministro de ${min.nombre}`);
            return efecto(`Negocias y te dan ${min.nombre}. ${min.sabor}`, m(e, { media: [3, 7], gestion: [4, 9], mediatico: [3, 8] })); }
          return efecto('Le dices al presidente que Transportes no y te contesta que entonces nada. Te quedas en el escaño y con fama de tibio.', m(e, { media: [-3, -1], aparato: [-7, -3], moral: [-6, -2] })); } },
      { txt: 'Rechazarlo y quedarte en el grupo', sub: 'Desde el escaño se ve todo.',
        efecto: e => efecto('Dices que no. Todo el mundo entiende que has visto venir el marrón y una parte del partido te respeta justo por eso.', m(e, { credibilidad: [6, 11], aguante: [5, 9], media: [-2, 1] })) },
    ],
  },
  {
    id: 'renfe_averia', etapas: DESDE_CONGRESO, peso: 16, cond: e => !!e.flags.ministroTransportes,
    titulo: 'Cuatro horas parados en Chamartín',
    texto: () => 'Un fallo de señalización deja 14.000 personas tiradas en hora punta. Hay vídeos de gente andando por la vía con el móvil encendido. Tu cuenta de X lleva 4.000 menciones en dos horas y sales en directo a las nueve.',
    opciones: [
      { txt: 'Discutir en X con todo el mundo', sub: 'Contestar uno por uno.', riesgo: 0.35,
        efecto: (e, ok) => { e.flags.viral = true; return ok
          ? efecto('Te pasas la noche contestando con datos de puntualidad línea por línea. Una parte de internet te aplaude la valentía y la otra hace un hilo con tus faltas de ortografía.', m(e, { mediatico: [10, 17], credibilidad: [2, 7], aguante: [-7, -3] }))
          : efecto('Contestas a un usuario con "¿son ustedes masoquistas o qué?" y esa frase se convierte en el resumen de tu gestión. Sale hasta en camisetas.', m(e, { credibilidad: [-14, -8], mediatico: [12, 20], apoyo: [-7, -2] })); } },
      { txt: 'Ir a la estación de madrugada', sub: 'Estar donde está el problema.', riesgo: 0.7,
        efecto: (e, ok) => ok
          ? efecto('Apareces a las dos de la mañana en Chamartín, sin cámaras convocadas, y te quedas hasta que sale el último tren. Alguien lo graba y esa es la foto de la semana.', m(e, { credibilidad: [11, 18], mediatico: [7, 13], aguante: [-9, -4], apoyo: [3, 8] }))
          : efecto('Llegas y te reciben con un abucheo de 400 personas cansadas. Es legítimo, es comprensible y es el corte que abre los informativos.', m(e, { mediatico: [8, 14], moral: [-10, -4], apoyo: [-4, 0] })) },
      { txt: 'Nota de prensa y a dormir', sub: 'Mañana con los datos completos.',
        efecto: e => efecto('Sale la nota a las 23:40 con la palabra "incidencia". A las ocho de la mañana el titular es "el ministro no dio la cara" y ya no lo cambia nadie.', m(e, { aguante: [4, 8], credibilidad: [-8, -3], apoyo: [-4, -1] })) },
    ],
  },

  // ── MEDIOS ────────────────────────────────────────────────────────────────
  {
    id: 'hormiguero', etapas: ['liderazgo', 'moncloa'], peso: 34, unico: true,
    titulo: 'El Hormiguero te sienta en la silla',
    texto: e => `Ya eres líder nacional y Pablo Motos te quiere el martes. Dos millones y medio de espectadores, hormigas, un experimento con nitrógeno líquido y, en el minuto 34, la pregunta que lleva preparada desde el lunes. Tu jefa de prensa dice que es la mejor tribuna de España. Tu jefe de campaña dice que es una encerrona con público.`,
    opciones: [
      { txt: 'Ir y jugar al juego', sub: 'Hormigas, humor y a lo tuyo.', riesgo: 0.7,
        efecto: (e, ok) => { e.flags.hormiguero = true; e.flags.viral = true; hito(e, '🐜', 'Entrevista en El Hormiguero'); return ok
          ? efecto('Te ríes con las hormigas, aguantas el experimento sin despeinarte y contestas la pregunta trampa con una frase que abre todos los informativos del miércoles. 2,6 millones de espectadores y un 18,4% de cuota.', m(e, { mediatico: [16, 26], carisma: [8, 14], apoyo: [5, 12], media: [2, 5] }))
          : efecto('El experimento te salpica, el chiste no te sale y en el minuto 34 te quedas en blanco cinco segundos que en televisión son un mes. El montaje del silencio tiene ocho millones al día siguiente.', m(e, { mediatico: [10, 18], credibilidad: [-9, -4], apoyo: [-5, 0], moral: [-8, -3] })); } },
      { txt: 'Ir a La Revuelta en su lugar', sub: 'Otro público, otras preguntas.', riesgo: 0.6,
        efecto: (e, ok) => { e.flags.viral = true; hito(e, '📺', 'Entrevista en La Revuelta'); return ok
          ? efecto('Broncano te pregunta cuánto dinero tienes en el banco. Contestas la cifra exacta, sin rodeos, y esa honestidad de tres segundos vale más que cuarenta mítines.', m(e, { mediatico: [13, 21], credibilidad: [9, 15], carisma: [5, 10], apoyo: [4, 10] }))
          : efecto('Te preguntan cuánto dinero tienes y te enredas en una explicación sobre la declaración de bienes que dura minuto y medio. En televisión, minuto y medio explicando tu patrimonio es una condena.', m(e, { mediatico: [8, 15], credibilidad: [-10, -5], apoyo: [-4, 0] })); } },
      { txt: 'No ir a ninguno de los dos', sub: 'Solo entrevistas políticas.',
        efecto: e => efecto('Dices que no a los dos y das una entrevista de una hora a un periódico. La lee tu círculo. La silla vacía la ocupa otro y a él le funciona.', m(e, { credibilidad: [6, 11], mediatico: [-8, -3], apoyo: [-4, 0] })) },
    ],
  },
  {
    id: 'plato_tertulia', etapas: DESDE_AUTONOMICA, peso: 16,
    titulo: 'Cuatro contra uno a las diez de la mañana',
    texto: e => {
      const p = elegir(PROGRAMAS.filter(x => x.id !== 'hormiguero' && x.id !== 'revuelta'));
      return `Te invitan a ${p.nombre}. Formato conocido: ${p.tono}. Van a sacar tres cosas tuyas de los últimos diez años y una de ellas ni la recuerdas.`;
    },
    opciones: [
      { txt: 'Ir y aguantar el chaparrón', sub: 'Estar es estar.', riesgo: 0.55,
        efecto: (e, ok) => ok
          ? efecto('Aguantas los cuarenta minutos sin perder la calma y respondes a las tres. La audiencia hostil te respeta y en tu bancada te lo reconocen.', m(e, { mediatico: [9, 15], carisma: [5, 10], credibilidad: [5, 10], aguante: [-5, -2] }))
          : efecto('Te sacan la tercera cosa, la que no recordabas, y te quedas sin respuesta en directo. Es el corte que se emite todo el día.', m(e, { mediatico: [6, 11], credibilidad: [-10, -5], moral: [-7, -3] })) },
      { txt: 'Mandar al portavoz', sub: 'Que vaya quien tiene la piel más dura.',
        efecto: e => efecto('Va tu portavoz, se lleva la bronca y tú te ahorras el desgaste. La casa te pone el rótulo "no quiso venir" toda la mañana.', m(e, { aguante: [3, 7], mediatico: [-4, -1], credibilidad: [-4, 0] })) },
      { txt: 'Ofrecer un directo tuyo en su lugar', sub: 'Sin intermediarios.', riesgo: 0.6,
        efecto: (e, ok) => ok
          ? efecto('Haces un directo de dos horas con 60.000 personas en el chat y te llevas la conversación a tu terreno. Los platós hablan de tu directo, que es exactamente lo que querías.', m(e, { mediatico: [11, 18], carisma: [6, 11], apoyo: [3, 8] }))
          : efecto('El directo se queda en 3.000 espectadores y una pregunta del chat sobre el precio del alquiler te deja tocado durante veinte minutos en vivo.', m(e, { mediatico: [2, 6], moral: [-7, -3], credibilidad: [-5, -1] })) },
    ],
  },
  {
    id: 'cis_encuesta', etapas: DESDE_AUTONOMICA, peso: 14,
    titulo: 'La encuesta que te da ganador',
    texto: e => `Una encuesta te da cuatro puntos por encima de lo que dicen todas las demás. La casa que la firma es afín. Tu equipo quiere sacarla en todas partes; el número dos de ${nombreP(e)} dice que si luego no se cumple, te comes el ridículo tú.`,
    opciones: [
      { txt: 'Sacarla en todos lados', sub: 'La ola se coge cuando pasa.', riesgo: 0.5,
        efecto: (e, ok) => ok
          ? efecto('La encuesta marca el relato dos semanas y de tanto repetirlo se cumple un poco. La profecía autocumplida existe y funciona.', m(e, { apoyo: [4, 10], mediatico: [6, 11], credibilidad: [-4, 0] }))
          : efecto('Al mes siguiente todas las demás casas te bajan y el titular es "el sondeo que se inventó una remontada". Con tu cara al lado.', m(e, { credibilidad: [-11, -5], apoyo: [-5, -1], moral: [-6, -2] })) },
      { txt: 'Ignorarla y hablar de la calle', sub: 'La única encuesta es la urna.',
        efecto: e => efecto('Dices en rueda de prensa que la única encuesta que vale es la del domingo. Es lo que dicen todos, pero al decirlo tú por una vez es verdad.', m(e, { credibilidad: [6, 11], moral: [2, 6] })) },
      { txt: 'Usarla para apretar dentro', sub: 'Enseñársela a los barones.',
        efecto: e => efecto('Llevas la encuesta al comité y la usas para cerrar tres listas a tu gusto. Fuera no la ve nadie; dentro cambia el reparto de poder.', m(e, { aparato: [8, 14], media: [2, 5], credibilidad: [-3, 1] })) },
    ],
  },

  // ── TRANSFUGUISMO: el corazón del juego ───────────────────────────────────
  {
    id: 'oferta_fichaje', etapas: ['autonomica', 'congreso', 'direccion', 'liderazgo'], peso: 26,
    titulo: 'Te llaman de otro partido',
    preparar: e => { e.oferta = ofertaFichaje(e); },
    texto: e => {
      const o = e.oferta ?? ofertaFichaje(e);
      const grado = o.distancia > 0.55 ? 'Es el otro bloque entero: hace tres años te llamaban lo peor y tú a ellos también'
        : o.distancia > 0.3 ? 'No es tu casa, pero tampoco es Marte'
          : 'Está a un palmo de tu partido y lo sabes';
      return `Cena discreta en un reservado. ${o.destino.nombre} te ofrece ${o.puesto} y ${o.dinero.toLocaleString('es')} € entre asesorías, conferencias y una fundación. ${grado}. Tu partido no te va a subir de puesto este ciclo y eso también lo sabes.`;
    },
    opciones: [
      { txt: 'Aceptar y cambiarse', sub: 'El escaño es tuyo, no del partido.',
        efecto: e => {
          const o = e.oferta ?? ofertaFichaje(e);
          const antes = e.partidoNombre;
          const d = cambiarPartido(e, o.destino);   // ya aplica la penalización temporal de media
          e.cobradoPorFichar += o.dinero;
          e.oferta = null;
          return efecto(`Firmas el martes y el jueves ya estás sentado en la otra bancada. Tus antiguos compañeros de ${antes} te giran la cara en el pasillo y en tu nuevo grupo hay quien tampoco se fía. El fondo de tu vida política cambia de color de un día para otro.`,
            m(e, { dinero: o.dinero, credibilidad: -o.costeCredibilidad, mediatico: [8, 15], moral: [-9, -3], mediaTexto: -Math.round(3 + d * 7) }));
        } },
      { txt: 'Decir que no y contarlo', sub: 'Quedarte a arreglar esto.',
        efecto: e => {
          const o = e.oferta ?? ofertaFichaje(e); e.oferta = null;
          e.flags.rechazoOferta = true;
          hito(e, '🪪', `Rechazaste una oferta de ${o.destino.nombre}`);
          return efecto(`Dices que no, sales al día siguiente y lo cuentas: cuánto te ofrecían, quién y para qué. En tu partido te aplauden de pie en el comité; en el otro dicen que te lo has inventado. Da igual: en España, quedarse cuesta más que irse y por una vez se nota.`,
            m(e, { credibilidad: [12, 20], moral: [8, 14], apoyo: [3, 9], media: [1, 4] }));
        } },
      { txt: 'Negociar y quedarte más caro', sub: 'Usar la oferta dentro de casa.', riesgo: 0.5,
        efecto: (e, ok) => {
          const o = e.oferta ?? ofertaFichaje(e); e.oferta = null;
          return ok
            ? efecto(`Filtras que existe la oferta sin decir de quién. Tu partido reacciona en cuatro días: te suben de puesto, te dan portavocía y te blindan la circunscripción. No te has movido de sitio y vales el doble.`,
              m(e, { media: [4, 8], aparato: [7, 13], dinero: 25000, credibilidad: [-6, -2] }))
            : efecto(`La filtración se te va de las manos, sale con nombres y quedas como alguien que se estaba subastando. El otro partido retira la oferta y el tuyo te baja tres puestos en la lista.`,
              m(e, { credibilidad: [-15, -8], aparato: [-9, -4], moral: [-9, -4], media: [-3, -1] }));
        } },
    ],
  },
  {
    id: 'oferta_bloque_contrario', etapas: ['congreso', 'direccion', 'liderazgo'], peso: 14, unico: true, cond: e => e.transfuguismos === 0 && e.media >= 64,
    titulo: 'La llamada del bloque contrario',
    texto: e => {
      const otros = PARTIDOS.filter(p => p.id !== e.partido);
      const lejos = otros.sort((a, b) => distancia(partidoDe(e).eje, b.eje) - distancia(partidoDe(e).eje, a.eje))[0];
      return `${lejos.nombre} —sí, ${lejos.nombre}— te propone encabezar una lista. Argumento: "usted no es como los suyos". Se ofrecen 240.000 € en tres años de fundación y patronato, y una portavocía. Es exactamente el partido contra el que llevas veinte años haciendo campaña.`;
    },
    opciones: [
      { txt: 'Cruzar el Rubicón', sub: 'Todo tiene un precio.',
        efecto: e => {
          const otros = PARTIDOS.filter(p => p.id !== e.partido);
          const lejos = otros.sort((a, b) => distancia(partidoDe(e).eje, b.eje) - distancia(partidoDe(e).eje, a.eje))[0];
          const antes = e.partidoNombre;
          cambiarPartido(e, lejos);
          e.cobradoPorFichar += 240000;
          e.flags.granTransfuga = true;
          return efecto(`Comparecencia el lunes a las diez. La hemeroteca de tus veinte años en ${antes} se publica entera esa misma tarde, ordenada por fecha, en un hilo con 60.000 compartidos. Cobras, sales en todas partes y ya no vas a poder entrar en una sede sin que alguien murmure.`,
            m(e, { dinero: 240000, credibilidad: [-32, -22], mediatico: [16, 26], moral: [-14, -7], mediaTexto: -8 }));
        } },
      { txt: 'Publicar la oferta entera', sub: 'Con cifras, fechas y nombres.', riesgo: 0.75,
        efecto: (e, ok) => ok
          ? efecto('Publicas la oferta con las cantidades. Te conviertes en el símbolo de que no todo el mundo se vende y esa etiqueta te acompaña el resto de tu carrera. Vale más que los 240.000.', m(e, { credibilidad: [18, 28], apoyo: [5, 12], mediatico: [10, 17], media: [2, 6] }))
          : efecto('Publicas la oferta y el otro partido lo desmiente todo con una nota de tres líneas. Sin documentos, se queda en tu palabra contra la suya y media España elige la suya.', m(e, { credibilidad: [-7, -2], mediatico: [7, 13], moral: [-6, -2] })) },
      { txt: 'Decir que no y callarte', sub: 'Ni cobrar ni presumir.',
        efecto: e => efecto('Dices que no por teléfono, en cuarenta segundos, y no se lo cuentas a nadie. Los únicos que lo saben son ellos y tú. Duermes bien y no lo sabe nadie más.', m(e, { credibilidad: [6, 11], moral: [10, 16] })) },
    ],
  },
  {
    id: 'fundar_partido', etapas: CUPULA, peso: 12, unico: true, cond: e => e.media >= 74 && (e.stats.mediatico >= 60 || e.transfuguismos >= 1),
    titulo: 'Montártelo por tu cuenta',
    texto: e => `Tres empresarios, un exdirector de campaña y una encuestadora te ponen delante una diapositiva: con tu cara, un partido nuevo sacaría entre 9 y 14 escaños. Sería tuyo entero: tu programa, tus listas, tu culpa. Dejarías atrás ${nombreP(e)} y todo lo que has construido dentro.`,
    opciones: [
      { txt: 'Fundarlo', sub: 'Tu nombre en la papeleta.', riesgo: 0.55,
        efecto: (e, ok) => {
          const nombre = `${e.nombre.split(' ')[0]} Ahora`;
          fundarPartido(e, nombre);
          return ok
            ? efecto(`Presentas ${nombre} en un hotel de Atocha con 300 periodistas. En seis meses estás en todas las encuestas y el fondo de tu vida política es, por primera vez, de un color que has elegido tú.`,
              m(e, { mediatico: [14, 22], carisma: [7, 13], apoyo: [8, 16], credibilidad: [-6, 0], media: [2, 5] }))
            : efecto(`Presentas ${nombre} y la financiación se cae a los cuatro meses. Te quedas con las siglas, la deuda y catorce personas que dejaron su trabajo por ti.`,
              m(e, { dinero: -60000, media: [-6, -3], moral: [-12, -6], mediatico: [8, 14] }));
        } },
      { txt: 'Usar la amenaza dentro', sub: 'Que sepan que puedes.', riesgo: 0.55,
        efecto: (e, ok) => ok
          ? efecto('Se filtra que estuviste en esa reunión. En dos semanas tienes vicesecretaría general y mano en las listas. No has fundado nada y mandas más que antes.', m(e, { aparato: [10, 17], media: [4, 8], credibilidad: [-5, -1] }))
          : efecto('Se filtra que estuviste en esa reunión y la dirección lo lee como lo que es: una amenaza. Te sacan de la ejecutiva el viernes.', m(e, { aparato: [-12, -6], media: [-4, -2], moral: [-9, -4] })) },
      { txt: 'Decir que no', sub: 'Los partidos nuevos duran dos ciclos.',
        efecto: e => efecto('Les dices que la política española está llena de partidos que iban a cambiarlo todo y duraron dos elecciones. Te miran como si no lo entendieras. Puede que tengan razón, pero tú sigues teniendo estructura.', m(e, { credibilidad: [5, 10], aparato: [4, 9], moral: [3, 7] })) },
    ],
  },

  // ── DIRECCIÓN Y LIDERAZGO ─────────────────────────────────────────────────
  {
    id: 'primarias', etapas: CUPULA, peso: 24, unico: true,
    titulo: 'Primarias por la secretaría general',
    texto: e => `Se abre el plazo. ${rivalDe(e)} tiene el aparato, tú tienes las encuestas y la militancia tiene ganas de que alguien le pregunte. 180.000 afiliados con derecho a voto y seis semanas de campaña interna que van a ser peores que cualquier campaña electoral.`,
    opciones: [
      { txt: 'Campaña de militancia', sub: 'Cien asambleas en seis semanas.', riesgo: 0.65,
        efecto: (e, ok) => { if (ok) { e.flags.liderPartido = true; e.rival.derrotasTuyas++; e.cargo = 'Secretario general';
            hito(e, '👑', 'Ganas las primarias del partido');
            return efecto('Cien asambleas, 14.000 kilómetros y una victoria por doce puntos. Sales al balcón de la sede con la militancia gritando tu nombre y con el aparato entero mirándote de reojo.', m(e, { media: [8, 14], aparato: [10, 17], carisma: [7, 12], aguante: [-13, -7] })); }
          e.rival.victoriasSuyas++;
          return efecto(`${rivalDe(e)} gana por seis puntos con el aparato movilizado. Te ofrece la portavocía en el Congreso para coserlo todo. La aceptas porque en política se acepta.`, m(e, { media: [-3, -1], moral: [-12, -6], aparato: [-5, -1] })); } },
      { txt: 'Pactar una lista de integración', sub: 'Sin primarias, sin sangre.',
        efecto: e => efecto(`Os repartís la ejecutiva antes de que empiece el plazo y se presenta candidatura única. La prensa lo llama "unidad"; la militancia, que no vota nada, lo llama otra cosa.`, m(e, { aparato: [9, 15], media: [3, 6], credibilidad: [-7, -3], moral: [-4, 0] })) },
      { txt: 'No presentarte y esperar', sub: 'El ciclo siguiente es tuyo.',
        efecto: e => efecto('Te retiras antes de empezar y anuncias apoyo. Ganas cuatro años de tranquilidad, un puesto de peso y la fama de que sabes contar.', m(e, { aparato: [5, 10], aguante: [6, 11], media: [-2, 2], credibilidad: [2, 6] })) },
    ],
  },
  {
    id: 'debate_electoral', etapas: ['liderazgo', 'moncloa'], peso: 26,
    titulo: 'Debate a cinco en prime time',
    texto: () => 'Atril, minutero y once millones de espectadores. Tienes un minuto y medio por bloque y una frase preparada que tu equipo lleva tres semanas puliendo. La otra opción es tirar el guion y hablar como una persona.',
    opciones: [
      { txt: 'Soltar la frase preparada', sub: 'Buscar el corte del día.', riesgo: 0.55,
        efecto: (e, ok) => { e.flags.viral = true; return ok
          ? efecto('La sueltas en el minuto 41 y funciona: es el corte que abre los informativos, el meme de la noche y el titular del día siguiente en cinco periódicos.', m(e, { mediatico: [13, 21], apoyo: [5, 12], carisma: [5, 10] }))
          : efecto('La sueltas y se te nota que estaba escrita. El montaje comparando tu cara antes y después de decirla acumula seis millones.', m(e, { mediatico: [6, 12], credibilidad: [-9, -4], apoyo: [-4, 0] })); } },
      { txt: 'Tirar el guion', sub: 'Hablar de una persona concreta.', riesgo: 0.5,
        efecto: (e, ok) => ok
          ? efecto('Cuentas el caso de una familia de tu circunscripción, sin adjetivos, mirando a cámara. Se hace un silencio raro en plató y al día siguiente lo comenta hasta el bar.', m(e, { credibilidad: [12, 19], carisma: [8, 14], apoyo: [4, 10] }))
          : efecto('Te sales del guion, pierdes el hilo a mitad y gastas cuarenta segundos de tu minuto y medio buscando el final de la frase.', m(e, { credibilidad: [-8, -3], carisma: [-6, -2], apoyo: [-4, -1] })) },
      { txt: 'Ir a por el bloque económico', sub: 'Números, tablas y aburrimiento útil.',
        efecto: e => efecto('Te llevas el bloque económico con datos que los demás no traían. No hay corte, no hay meme y los editorialistas te dan el debate por escrito.', m(e, { credibilidad: [8, 14], gestion: [6, 11], mediatico: [-2, 2], apoyo: [0, 5] })) },
    ],
  },
  {
    id: 'pacto_investidura', etapas: ['liderazgo', 'moncloa'], peso: 22, cond: e => e.media >= 78,
    titulo: 'Te faltan siete votos',
    texto: e => `Tienes la investidura a siete votos. Un grupo independentista los pone encima de la mesa a cambio de un compromiso territorial que en tu programa no aparece por ninguna parte. Los barones de ${nombreP(e)} llevan desde ayer convocando ruedas de prensa.`,
    opciones: [
      { txt: 'Pactar y gobernar', sub: 'Los votos son los votos.', riesgo: 0.7,
        efecto: (e, ok) => ok
          ? efecto('Sale la investidura por cuatro votos. Gobiernas, y a partir de ese momento cada uno de esos siete escaños te va a pasar factura en cada votación durante cuatro años.', m(e, { media: [5, 10], gestion: [4, 9], credibilidad: [-11, -5], apoyo: [-6, 0] }))
          : efecto('El pacto se filtra a medias, con la parte peor y sin la contrapartida. Se cae la investidura y encima queda el papel publicado.', m(e, { media: [-5, -2], credibilidad: [-13, -7], moral: [-10, -4] })) },
      { txt: 'Rechazarlo e ir a repetición', sub: 'Volver a las urnas.', riesgo: 0.45,
        efecto: (e, ok) => ok
          ? efecto('Vas a repetición electoral defendiendo que no pactas eso. Subes cuatro puntos y esta vez los números salen sin llamar a nadie.', m(e, { apoyo: [6, 13], credibilidad: [10, 17], media: [3, 7] }))
          : efecto('Repetición electoral, participación por los suelos y pierdes dos escaños. Ahora te faltan nueve en vez de siete.', m(e, { apoyo: [-7, -2], media: [-4, -2], moral: [-11, -5] })) },
      { txt: 'Gran coalición con el otro bloque', sub: 'Lo que nadie quiere y todos miran.', riesgo: 0.4,
        efecto: (e, ok) => ok
          ? efecto('Cierras un gobierno de concentración con el bloque de enfrente y dos ministerios técnicos. Europa aplaude, tu militancia se queda muda y a los dos años nadie recuerda el escándalo.', m(e, { media: [6, 11], gestion: [8, 14], credibilidad: [-10, -4], apoyo: [-8, -2] }))
          : efecto('La negociación se filtra en fase de tanteo. Tu militancia monta la asamblea más dura en cuarenta años y el otro bloque niega que existiera.', m(e, { credibilidad: [-14, -8], aparato: [-9, -4], apoyo: [-9, -3] })) },
    ],
  },
  {
    id: 'vox_gobierno_auto', etapas: CUPULA, peso: 15,
    titulo: 'El gobierno autonómico se rompe',
    texto: e => `Tu partido gobierna ${e.comunidad} en coalición y el socio rompe por una consejería. O cedes la consejería, o hay elecciones anticipadas en la comunidad y tu candidato allí te llama cuatro veces al día.`,
    opciones: [
      { txt: 'Ceder la consejería', sub: 'Aguantar la legislatura.',
        efecto: e => efecto('Cedes. El gobierno aguanta, tu candidato respira y todo el mundo entiende quién manda en esa coalición y no eres tú.', m(e, { aparato: [3, 7], credibilidad: [-8, -3], apoyo: [-4, 0] })) },
      { txt: 'Romper y convocar', sub: 'Elecciones anticipadas.', riesgo: 0.5,
        efecto: (e, ok) => ok
          ? efecto('Convocas y ganas con más escaños de los que tenías. Se acabó la coalición y se acabó la discusión.', m(e, { media: [4, 9], apoyo: [5, 11], credibilidad: [8, 14] }))
          : efecto('Convocas, la participación cae y el resultado es igual de malo pero con cuatro meses perdidos y una campaña pagada.', m(e, { media: [-4, -2], apoyo: [-6, -2], dinero: -35000, moral: [-8, -3] })) },
      { txt: 'Alargarlo hasta que se aburran', sub: 'La táctica del desgaste.',
        efecto: e => efecto('No cedes y no rompes. Seis meses de gobierno en funciones dentro del propio gobierno. Se aburren antes que tú, pero la comunidad pierde medio año.', m(e, { aparato: [6, 11], gestion: [-5, -1], aguante: [-6, -2] })) },
    ],
  },
  {
    id: 'baron_cuchillo', etapas: CUPULA, peso: 16,
    titulo: 'El barón te hace la cama',
    texto: e => `Un presidente autonómico de tu propio partido concede una entrevista de dos páginas donde dice tres veces "hay que escuchar al territorio" y ninguna vez tu nombre. La traducción la entiende hasta el quiosquero.`,
    opciones: [
      { txt: 'Llamarle y cerrarlo en privado', sub: 'Sin ruido.', riesgo: 0.7,
        efecto: (e, ok) => ok
          ? efecto('Dos horas de teléfono, una cesión pequeña y una foto juntos el domingo. Nadie vuelve a hablar del tema.', m(e, { aparato: [7, 13], gestion: [3, 7], moral: [2, 6] }))
          : efecto('No coge el teléfono en tres días. Cuando lo coge, ya ha hablado con otros dos barones y ahora son tres.', m(e, { aparato: [-9, -4], moral: [-8, -3], media: [-3, -1] })) },
      { txt: 'Responder en público', sub: 'Poner el marco tú.', riesgo: 0.45,
        efecto: (e, ok) => ok
          ? efecto('Le contestas en rueda de prensa sin nombrarle, con una frase sobre la lealtad que se lee sola. El resto de barones toma nota y se callan.', m(e, { media: [3, 7], aparato: [5, 10], mediatico: [5, 10] }))
          : efecto('La respuesta abre una guerra interna de seis semanas con filtraciones diarias. La oposición no tiene que hacer nada, solo mirar.', m(e, { media: [-4, -2], aparato: [-8, -3], apoyo: [-6, -2] })) },
      { txt: 'Comprarle con financiación', sub: 'Una partida para su comunidad.',
        efecto: e => efecto('Aparece una partida extraordinaria para su comunidad en la modificación de crédito de julio. Se le pasa el disgusto y los otros dieciséis barones aprenden cómo se pide.', m(e, { aparato: [8, 14], dinero: -12000, credibilidad: [-6, -2] })) },
    ],
  },
  {
    id: 'puertas_giratorias', etapas: CUPULA, peso: 14, cond: e => e.edad >= 52,
    titulo: 'Iberdrola te quiere en el consejo',
    texto: () => 'Consejero externo en Iberdrola: 240.000 € al año, dos reuniones al mes, un almuerzo en el que no se habla de nada y ninguna rueda de prensa nunca más. Cumples los plazos de incompatibilidades, así que es legal, se publica en la CNMV y lo va a ver absolutamente todo el mundo. El mismo día que firmes, catorce cuentas recuperarán tus discursos sobre las puertas giratorias.',
    opciones: [
      { txt: 'Aceptar y dejar el escaño', sub: 'Se acabó. A cobrar.',
        efecto: e => { e.flags.retiroElegido = true; e.flags.causaElegida = 'puertas';
          hito(e, '🔄', 'Consejo de administración de una eléctrica');
          return efecto('Firmas el jueves y entregas el acta el viernes. En el pleno de despedida te aplauden de pie los mismos que mañana te llamarán ejemplo de puertas giratorias. Las dos cosas son verdad.', m(e, { dinero: 240000, credibilidad: [-20, -12] })); } },
      { txt: 'Aceptar y seguir en política', sub: 'A la vez no se puede, pero se intenta.', riesgo: 0.25,
        efecto: (e, ok) => ok
          ? efecto('Encuentras el encaje legal: te vas seis meses, cobras la indemnización, vuelves y entras en el consejo cuando prescribe. Nadie te puede decir nada y todo el mundo te dice algo.', m(e, { dinero: 140000, credibilidad: [-16, -9], media: [-2, 1] }))
          : efecto('La Oficina de Conflictos de Intereses emite informe desfavorable y el asunto sale publicado con tu nombre y el logo de la eléctrica al lado. Renuncias al puesto y te quedas con el ruido.', m(e, { credibilidad: [-19, -12], mediatico: [8, 14], moral: [-9, -4] })) },
      { txt: 'Decir que no y publicarlo', sub: 'Con el nombre de la empresa.',
        efecto: e => efecto('Publicas la oferta con el nombre de la compañía y la cifra. La eléctrica no contesta, la prensa económica te retira el saludo y tú te quedas con algo que en esto vale muchísimo.', m(e, { credibilidad: [15, 24], moral: [9, 15], apoyo: [3, 8] })) },
    ],
  },
  {
    id: 'bruselas', etapas: CUPULA, peso: 12, unico: true, cond: e => e.media >= 72,
    titulo: 'Bruselas te quiere',
    texto: () => 'Comisario europeo. Cinco años, un sueldo enorme, un despacho con vistas al Berlaymont y cero telediarios españoles. Es el mejor destino del mundo para quien ya no quiere pelearse cada martes, y una jubilación de lujo para quien todavía sí.',
    opciones: [
      { txt: 'Aceptar', sub: 'Bruselas y a otra cosa.',
        efecto: e => { e.flags.retiroElegido = true; e.flags.causaElegida = 'bruselas';
          hito(e, '🇪🇺', 'Comisario europeo');
          return efecto('Comparecencia en el Parlamento Europeo, foto con la bandera y una vida entera de reuniones en inglés con acento propio. Aquí, a los tres meses, ya nadie se acuerda de ti.', m(e, { dinero: 320000, media: [3, 6] })); } },
      { txt: 'Mandar a otro y quedarte', sub: 'Aquí es donde se juega.',
        efecto: e => efecto('Propones a un compañero que llevaba dos ciclos estorbando. Se va encantado, tú te quedas con su hueco en la ejecutiva y todos ganan menos él, que también.', m(e, { aparato: [9, 15], media: [2, 5], credibilidad: [-3, 1] })) },
      { txt: 'Pedirlo para dentro de cuatro años', sub: 'Reservar el asiento.', riesgo: 0.55,
        efecto: (e, ok) => ok
          ? efecto('Cierras el compromiso para el ciclo siguiente. Sigues aquí con red de seguridad, que es la mejor manera de arriesgarse.', m(e, { moral: [7, 12], media: [2, 5], aguante: [4, 8] }))
          : efecto('En cuatro años no manda quien manda hoy. El compromiso no vale el papel en el que no está escrito, y encima se sabe que lo pediste.', m(e, { credibilidad: [-7, -3], moral: [-6, -2] })) },
    ],
  },
  {
    id: 'retiro_digno', etapas: CUPULA, peso: 11, cond: e => e.edad >= 58,
    titulo: '¿Hasta cuándo?',
    texto: e => `Llevas ${e.año} años en esto. Te ha dado dos infartos de sueño, cuatro campañas y una cantidad de cenas frías que no se puede medir. Puedes anunciar que lo dejas en el congreso del partido, con el discurso escrito por ti, o seguir hasta que te echen.`,
    opciones: [
      { txt: 'Anunciar que lo dejas', sub: 'Irse cuando decides tú.',
        efecto: e => { e.flags.retiroElegido = true; e.flags.causaElegida = 'eleccion';
          hito(e, '🎬', 'Anuncias tu retirada en el congreso del partido');
          return efecto('Lo anuncias al final de tu intervención, sin filtrarlo antes. Seis minutos de aplausos y una salida por la puerta grande, que en esto la ve muy poca gente.', m(e, { moral: [12, 20], credibilidad: [10, 16] })); } },
      { txt: 'Una legislatura más', sub: 'Todavía queda por hacer.',
        efecto: e => efecto('Te presentas una vez más. Tu equipo te lo agradece, tu familia no dice nada y tú duermes cinco horas otros cuatro años.', m(e, { media: [1, 4], aguante: [-9, -4], moral: [-3, 2] })) },
      { txt: 'Dejar la primera línea y quedarte', sub: 'Escaño sí, portada no.',
        efecto: e => efecto('Bajas al escaño, entras en dos comisiones y te dedicas a sacar leyes pequeñas que funcionan. Es lo más útil que has hecho en tu vida y no sale en ningún sitio.', m(e, { gestion: [8, 14], credibilidad: [7, 12], aguante: [5, 10], media: [-3, -1], mediatico: [-8, -4] })) },
    ],
  },

  // ── VIDA, DESGASTE Y CONCIENCIA ───────────────────────────────────────────
  {
    id: 'familia', etapas: TODAS, peso: 13, cond: e => e.año >= 5,
    titulo: 'La cena de casa',
    texto: () => 'Es el cuarto cumpleaños seguido que te pierdes. Tienes acto de partido en Valladolid, tren de vuelta a las 22:40 y una conversación pendiente desde hace meses.',
    opciones: [
      { txt: 'Cancelar el acto', sub: 'Un día de estos.',
        efecto: e => efecto('Cancelas, cenas en casa y apagas el teléfono tres horas. Al día siguiente hay una nota de prensa quejándose de tu ausencia y te da exactamente igual.', m(e, { moral: [11, 18], aguante: [6, 11], aparato: [-5, -1] })) },
      { txt: 'Ir al acto y coger el último tren', sub: 'Llegar a la una y media.', riesgo: 0.6,
        efecto: (e, ok) => ok
          ? efecto('Haces el acto, coges el tren y llegas a tiempo para el último trozo de tarta. Funciona una vez de cada tres.', m(e, { moral: [3, 8], aparato: [3, 7], aguante: [-5, -2] }))
          : efecto('El tren sale con 55 minutos de retraso y llegas a las dos y media. La tarta está en la nevera con un plato encima.', m(e, { moral: [-11, -5], aguante: [-8, -3] })) },
      { txt: 'Mandar un vídeo desde el acto', sub: 'La solución moderna.',
        efecto: e => efecto('Grabas un vídeo entre bambalinas con el ruido del acto de fondo. Sirve. No sirve del todo, pero sirve.', m(e, { moral: [-4, 1], aparato: [2, 6] })) },
    ],
  },
  {
    id: 'burnout', etapas: DESDE_AUTONOMICA, peso: 14, cond: e => e.stats.aguante < 55,
    titulo: 'El cuerpo avisa',
    texto: () => 'Te has mareado en un acto y lo has disimulado agarrándote al atril. El médico habla de tensión, de sueño y de una palabra que empieza por "estrés" y termina en una baja de dos meses que no te puedes permitir.',
    opciones: [
      { txt: 'Cogerte la baja', sub: 'Dos meses fuera.',
        efecto: e => efecto('Dos meses. Vuelves con la cabeza en su sitio y con el sitio en tu partido un poco ocupado por otro. Merece la pena.', m(e, { aguante: [22, 34], moral: [8, 14], media: [-3, -1], aparato: [-6, -2] })) },
      { txt: 'Bajar el ritmo sin decirlo', sub: 'Menos actos, mismo cargo.', riesgo: 0.6,
        efecto: (e, ok) => ok
          ? efecto('Recortas la agenda un 40% sin anunciarlo y nadie lo nota. Recuperas parte del sueño y todo el crédito.', m(e, { aguante: [12, 20], moral: [4, 9] }))
          : efecto('Alguien cuenta que estás flojo. En una semana hay tres columnas preguntándose si estás en condiciones de seguir.', m(e, { aguante: [4, 9], media: [-4, -2], mediatico: [3, 7], moral: [-7, -3] })) },
      { txt: 'Seguir igual', sub: 'Ya descansaré.',
        efecto: e => efecto('Sigues. Tres actos diarios, cuatro horas de sueño y café. Aguantas, porque siempre se aguanta, hasta que no.', m(e, { aguante: [-14, -7], media: [1, 4], moral: [-5, -1] })) },
    ],
  },
  {
    id: 'hemeroteca', etapas: DESDE_AUTONOMICA, peso: 15,
    titulo: 'Tus tuits de 2013',
    texto: () => 'Alguien ha desenterrado catorce tuits tuyos de cuando tenías veintipocos y opinabas de todo con la seguridad de quien no ha gestionado nada. Tres son defendibles, ocho son de su época y tres son directamente malos.',
    opciones: [
      { txt: 'Reconocer los tres malos', sub: 'Sin peros ni contexto.',
        efecto: e => efecto('Sales, lees los tres, dices que eran malos y que ya no piensas así. No añades ningún "pero". El tema muere en 36 horas, que es un récord.', m(e, { credibilidad: [9, 16], moral: [3, 8], mediatico: [3, 7] })) },
      { txt: 'Contraatacar con los suyos', sub: 'Hemeroteca contra hemeroteca.', riesgo: 0.5,
        efecto: (e, ok) => ok
          ? efecto('Publicas un hilo con los suyos, que son peores y más recientes. Empate mutuamente destructivo y el asunto desaparece para los dos.', m(e, { mediatico: [7, 13], credibilidad: [-3, 2], apoyo: [1, 5] }))
          : efecto('Los suyos son de 2009 y encima ya había pedido perdón por ellos. Quedas como el que además de aquello, no se documenta.', m(e, { credibilidad: [-11, -6], mediatico: [5, 10], moral: [-6, -2] })) },
      { txt: 'Borrar la cuenta entera', sub: 'Doce años de archivo.',
        efecto: e => efecto('Borras diez mil tuits de una vez. Existe una web que los tiene todos archivados desde 2015 y publican el enlace en cuatro horas.', m(e, { credibilidad: [-9, -4], mediatico: [4, 9], moral: [-4, 0] })) },
    ],
  },
  {
    id: 'bulo', etapas: DESDE_AUTONOMICA, peso: 15,
    titulo: 'Un bulo con tu cara',
    texto: () => 'Circula un montaje con tu cara y una frase que no has dicho nunca. Lleva 200.000 visualizaciones, tres cuentas grandes lo han compartido y una de ellas ya ha rectificado sin borrarlo.',
    opciones: [
      { txt: 'Desmentir con el vídeo original', sub: 'Ir a la fuente.',
        efecto: e => efecto('Publicas el minuto exacto del vídeo original. El desmentido tiene la décima parte de alcance que el bulo, como siempre, pero deja constancia.', m(e, { credibilidad: [6, 11], mediatico: [3, 7], moral: [-3, 1] })) },
      { txt: 'Denunciar a las cuentas', sub: 'Vía judicial.', riesgo: 0.45,
        efecto: (e, ok) => ok
          ? efecto('La demanda prospera dos años después con una rectificación obligatoria en la misma cuenta. Nadie se acuerda del bulo, pero la sentencia existe.', m(e, { credibilidad: [7, 13], dinero: -14000, mediatico: [3, 8] }))
          : efecto('La denuncia se archiva y el titular pasa a ser que un político denuncia a un usuario anónimo. Ahora el bulo tiene un millón.', m(e, { credibilidad: [-8, -3], mediatico: [7, 13], dinero: -9000 })) },
      { txt: 'Ignorarlo', sub: 'Alimentarlo es peor.',
        efecto: e => efecto('No dices nada. Se desinfla en cinco días y reaparece cada seis meses durante el resto de tu vida política.', m(e, { moral: [-5, -1], aguante: [2, 6] })) },
    ],
  },
  {
    id: 'manifestacion', etapas: TODAS, peso: 14,
    titulo: 'La manifestación',
    texto: e => `Hay convocatoria en Colón con medio millón de personas anunciadas y un ambiente que puede acabar en cabecera épica o en foto de la que no se sale. Tu equipo está partido en dos sobre si vas a la primera fila, a la tercera o no vas.`,
    opciones: [
      { txt: 'Primera fila de la pancarta', sub: 'Que se vea.', riesgo: 0.55,
        efecto: (e, ok) => ok
          ? efecto('La foto sale espectacular, con la Castellana llena hasta el fondo. Es la imagen del año de tu bloque y estás en el centro.', m(e, { mediatico: [11, 18], apoyo: [4, 10], carisma: [4, 9] }))
          : efecto('En la fila de atrás alguien saca una pancarta impresentable y el encuadre os junta a los dos. Ese es el recorte que circula.', m(e, { mediatico: [7, 13], credibilidad: [-11, -5], apoyo: [-5, -1] })) },
      { txt: 'Ir sin cabecera', sub: 'Andando entre la gente.',
        efecto: e => efecto('Vas a pie, sin pancarta y sin equipo de cámara. Te hacen doscientas fotos con el móvil y sale más natural que cualquier montaje.', m(e, { carisma: [6, 11], credibilidad: [5, 10], mediatico: [3, 7] })) },
      { txt: 'No ir y sacar un comunicado', sub: 'Prudencia institucional.',
        efecto: e => efecto('Comunicado de tres párrafos apoyando el fondo y no la forma. No te lo agradece nadie de los que fueron y te lo reprocha todo el mundo que no fue.', m(e, { credibilidad: [-3, 2], apoyo: [-4, 0], aguante: [3, 7] })) },
    ],
  },
  {
    id: 'eltoday', etapas: DESDE_AUTONOMICA, peso: 12,
    titulo: 'El titular satírico que se cree la gente',
    texto: () => 'Un medio satírico publica un titular sobre ti tan bueno que 40.000 personas se lo creen. Es mentira, es evidentemente mentira y da igual: hay diputados de tu propio partido preguntando por privado si es verdad.',
    opciones: [
      { txt: 'Seguirles el chiste', sub: 'Retuitear con una broma mejor.', riesgo: 0.7,
        efecto: (e, ok) => ok
          ? efecto('Contestas con un chiste mejor que el original. Sales ganando: hasta el medio satírico te cita como ejemplo de que se puede.', m(e, { mediatico: [9, 15], carisma: [7, 12], moral: [4, 9] }))
          : efecto('Tu chiste no está a la altura y ahora hay dos titulares: el suyo y tu intento. El suyo sigue siendo mejor.', m(e, { mediatico: [4, 8], carisma: [-5, -1] })) },
      { txt: 'Aclarar que es sátira', sub: 'Con un tono muy serio.',
        efecto: e => efecto('Publicas una aclaración explicando que el medio es satírico. Es la respuesta más triste posible y funciona regular.', m(e, { credibilidad: [2, 6], carisma: [-5, -1], mediatico: [-2, 2] })) },
      { txt: 'No decir nada', sub: 'Es sátira, hombre.',
        efecto: e => efecto('No dices nada. Se pasa solo en dos días y tres diputados de tu grupo siguen sin tenerlo claro.', m(e, { moral: [1, 5] })) },
    ],
  },
  {
    id: 'ibai_futbol', etapas: DESDE_AUTONOMICA, peso: 12,
    titulo: 'Deporte, cámara y bufanda',
    texto: () => 'Final de Copa el sábado, palco institucional reservado y bufanda de los dos equipos preparada por protocolo. También te han invitado a un torneo de creadores de contenido con dos millones de espectadores en directo. Solo puedes ir a uno.',
    opciones: [
      { txt: 'El palco', sub: 'Con quien toca.', riesgo: 0.5,
        efecto: (e, ok) => ok
          ? efecto('Palco, foto institucional y una conversación de veinte minutos con alguien clave que no cogía tus llamadas. Fue por eso, no por el fútbol.', m(e, { aparato: [6, 11], media: [1, 4], mediatico: [3, 7] }))
          : efecto('Te pillan las cámaras mirando el móvil en el minuto 70 y con la bufanda del otro equipo. Dos memes por el precio de uno.', m(e, { mediatico: [6, 11], credibilidad: [-6, -2], apoyo: [-3, 0] })) },
      { txt: 'El torneo de streamers', sub: 'Dos millones de menores de 30.', riesgo: 0.55,
        efecto: (e, ok) => { e.flags.viral = true; return ok
          ? efecto('Te dejas hacer de todo, no intentas hablar como ellos y funciona precisamente por eso. Ganas un público que no te veía ni por accidente.', m(e, { mediatico: [12, 19], apoyo: [4, 10], carisma: [5, 10] }))
          : efecto('Intentas usar tres palabras que no son tuyas y el chat es implacable. El clip "político intentando ser joven" es un género y ahora tienes un capítulo.', m(e, { mediatico: [7, 13], carisma: [-7, -3], credibilidad: [-6, -2] })); } },
      { txt: 'Ninguno: agenda de trabajo', sub: 'El sábado se trabaja.',
        efecto: e => efecto('Te pasas el sábado con el equipo cerrando la enmienda de los presupuestos autonómicos. Nadie se entera y el lunes tienes el texto.', m(e, { gestion: [7, 12], credibilidad: [3, 8], mediatico: [-5, -2] })) },
    ],
  },
  {
    id: 'huelga_renfe', etapas: DESDE_AUTONOMICA, peso: 14,
    titulo: 'Huelga de maquinistas',
    texto: e => `Los maquinistas convocan huelga en plena operación salida. Servicios mínimos del 72%, que significa que la mitad de la gente se queda tirada igual. ${esIzquierda(e) ? 'Tu bancada lleva toda la vida defendiendo el derecho a la huelga.' : 'Tu bancada lleva toda la vida pidiendo servicios mínimos más duros.'}`,
    opciones: [
      { txt: 'Apoyar a los maquinistas', sub: 'El derecho es el derecho.',
        efecto: e => efecto(esIzquierda(e)
          ? 'Sales a defender la huelga y el convenio. Los sindicatos te lo reconocen y las 300.000 personas tiradas en la estación, no.'
          : 'Sales a defender el derecho a la huelga y en tu propia bancada no te lo esperaba nadie. Ganas respeto fuera y problemas dentro.',
          m(e, { credibilidad: [6, 12], apoyo: esIzquierda(e) ? [-4, 2] : [-6, 0], moral: [3, 8] })) },
      { txt: 'Exigir servicios mínimos del 90%', sub: 'Primero el viajero.',
        efecto: e => efecto(esIzquierda(e)
          ? 'Pides mínimos del 90% y tu propia militancia te lo afea en la asamblea. Fuera del partido, mucha gente que coge el tren te lo agradece.'
          : 'Pides mínimos del 90% y es exactamente lo que esperaba tu electorado. No sorprendes a nadie y no pierdes un solo voto.',
          m(e, { apoyo: [3, 8], credibilidad: esIzquierda(e) ? [-9, -4] : [3, 7] })) },
      { txt: 'Mediar entre las partes', sub: 'Encerrarse hasta que salga.', riesgo: 0.6,
        efecto: (e, ok) => ok
          ? efecto('Te encierras 31 horas con sindicatos y empresa y sale un preacuerdo a las seis de la mañana. La foto de los tres cansados vale más que cualquier mitin.', m(e, { gestion: [10, 17], credibilidad: [8, 14], aguante: [-8, -3], apoyo: [3, 8] }))
          : efecto('Treinta y una horas y no sale. La huelga se hace, tú sales con cara de derrota y encima has puesto tu nombre en el fracaso.', m(e, { gestion: [-4, 0], moral: [-9, -4], aguante: [-8, -3], mediatico: [4, 8] })) },
    ],
  },
  {
    id: 'becario_cm', etapas: DESDE_AUTONOMICA, peso: 12,
    titulo: 'El community manager',
    texto: () => 'Tu cuenta oficial ha publicado a las 11:40 un mensaje que no has escrito tú, con un tono que no es el tuyo y una falta de ortografía. Lleva doce minutos publicado, 3.000 compartidos y hay capturas.',
    opciones: [
      { txt: 'Asumirlo como tuyo', sub: 'La cuenta es mía.',
        efecto: e => efecto('Dices que la cuenta es tuya y que lo que se publica en ella lo firmas tú. Es mentira y todo el mundo lo sabe, y aun así te suma.', m(e, { credibilidad: [7, 13], moral: [-3, 2], mediatico: [4, 8] })) },
      { txt: 'Explicar que fue el equipo', sub: 'Ha sido un error de gestión.',
        efecto: e => efecto('Explicas que lo publicó el equipo por error. Es la verdad y queda fatal: parece que echas la culpa a un chaval de 24 años que cobra mil euros.', m(e, { credibilidad: [-7, -2], mediatico: [3, 7] })) },
      { txt: 'Dejarlo publicado', sub: 'A ver qué pasa.', riesgo: 0.4,
        efecto: (e, ok) => ok
          ? efecto('Lo dejas y resulta que el mensaje conecta con gente a la que no llegabas. El error se convierte en línea editorial y nadie lo dice en voz alta.', m(e, { mediatico: [9, 15], apoyo: [3, 8], credibilidad: [-4, 0] }))
          : efecto('Lo dejas 40 minutos y el error se convierte en la noticia del día. Lo borras cuando ya hay artículo publicado.', m(e, { credibilidad: [-9, -4], mediatico: [6, 11] })) },
    ],
  },
  {
    id: 'donacion', etapas: DESDE_CONGRESO, peso: 12,
    titulo: 'El patrocinio de la fundación',
    texto: () => 'Una fundación vinculada a tu partido recibe una oferta de patrocinio de 150.000 € de un grupo empresarial con intereses en un sector que tú regulas. Es legal, se declara al Tribunal de Cuentas y se publica en la web. También es exactamente lo que parece.',
    opciones: [
      { txt: 'Aceptarlo y publicarlo', sub: 'Todo declarado y en la web.',
        efecto: e => efecto('Se acepta, se declara y se publica en el portal de transparencia. Nadie puede decir nada. Cuatro medios lo cuentan igual y tienen razón en contarlo.', m(e, { dinero: 30000, credibilidad: [-9, -4], gestion: [3, 7] })) },
      { txt: 'Rechazarlo', sub: 'Por si acaso.',
        efecto: e => efecto('Lo rechazas por escrito con una carta de dos párrafos. La fundación se queda sin programa de becas y tú te quedas sin un solo titular.', m(e, { credibilidad: [8, 14], moral: [5, 10], dinero: -8000 })) },
      { txt: 'Aceptarlo troceado', sub: 'Tres aportaciones pequeñas.', riesgo: 0.3,
        efecto: (e, ok) => ok
          ? efecto('Se trocea en tres aportaciones por debajo del umbral de publicación obligatoria. Legal, opaco y perfectamente inútil el día que alguien sume.', m(e, { dinero: 34000, credibilidad: [-6, -2] }))
          : efecto('Alguien suma las tres aportaciones y publica la suma. Ahora el titular no es el patrocinio: es que lo trocearas.', m(e, { credibilidad: [-18, -11], mediatico: [8, 14], moral: [-9, -4] })) },
    ],
  },
  {
    id: 'mudanza_circunscripcion', etapas: DESDE_AUTONOMICA, peso: 11,
    titulo: 'Te cambian de circunscripción',
    texto: e => `La dirección quiere que encabeces lista por otra provincia donde el partido está flojo. Es un ascenso disfrazado de destierro o un destierro disfrazado de ascenso, según a quién preguntes. Tú llevas toda la vida en ${e.comunidad}.`,
    opciones: [
      { txt: 'Aceptar y mudarte', sub: 'Empezar de cero a los cuarenta.', riesgo: 0.6,
        efecto: (e, ok) => { const destino = comunidadAleatoria(e.comunidad); if (ok) { e.comunidad = destino;
            return efecto(`Te mudas a ${destino}, te pateas la provincia dos años y sacas un escaño donde no había. Eso, dentro del partido, es una medalla que no se quita.`, m(e, { media: [4, 9], aparato: [7, 12], carisma: [4, 9], aguante: [-6, -2] })); }
          e.comunidad = destino;
          return efecto(`Te mudas a ${destino} y no sale. Dos años fuera de casa, sin escaño y sin la red que tenías. Volver es más difícil que irse.`, m(e, { media: [-4, -2], moral: [-11, -5], aparato: [-4, 0] })); } },
      { txt: 'Negarte', sub: 'Aquí me quedo.',
        efecto: e => efecto('Dices que no. Te mantienen donde estás y te apuntan en la lista mental de "no está disponible". Esa lista existe y pesa.', m(e, { aparato: [-7, -3], moral: [4, 9], credibilidad: [3, 7] })) },
      { txt: 'Pedir el Senado', sub: 'La cámara donde no pasa nada.',
        efecto: e => efecto('Pides ir al Senado. Te lo dan encantados. Cuatro años de comisiones tranquilas, buena vida y cero relevancia. Descansas de verdad.', m(e, { aguante: [12, 20], moral: [5, 10], media: [-4, -2], mediatico: [-7, -3] })) },
    ],
  },

  // ── LA PREGUNTA DE MOTOS, LA CRISIS, EL SOBRECOSTE Y EL FALCON ────────────
  {
    id: 'motos_pregunta', etapas: ['direccion', 'liderazgo', 'moncloa'], peso: 22, unico: true,
    cond: e => !!e.flags.hormiguero,
    titulo: 'Motos saca el papelito',
    texto: e => `Segunda visita a El Hormiguero. Todo va bien hasta que Pablo Motos baja el tono, coge un papel de debajo de la mesa y dice "esto me lo han mandado y yo se lo tengo que preguntar". Es tu declaración de bienes cruzada con una promesa que hiciste en campaña hace nueve años y no cumpliste. Tres millones de personas. Trancito de anuncios en cuatro minutos.`,
    opciones: [
      { txt: 'Reconocerlo en seco', sub: 'Sí, lo prometí y no lo hice.',
        efecto: e => efecto('Dices que sí, que lo prometiste, que no lo cumpliste y por qué. Sin "contexto", sin "herencia recibida" y sin echarle la culpa a la anterior legislatura. Se hace un silencio de dos segundos que en televisión es un año, y el aplauso que viene después es de verdad.', m(e, { credibilidad: [14, 22], mediatico: [8, 14], carisma: [5, 10], apoyo: [3, 9] })) },
      { txt: 'Girarlo contra el papel', sub: '¿Y quién se lo ha mandado?', riesgo: 0.4,
        efecto: (e, ok) => { e.flags.viral = true; return ok
          ? efecto('Le preguntas quién le ha pasado el papel y lo dejas colgado ocho segundos. El debate del día siguiente ya no va de tu promesa, va de quién escribe las preguntas de los platós. Has cambiado el tema, que es lo único que se puede hacer.', m(e, { mediatico: [12, 20], carisma: [6, 12], credibilidad: [-5, 1] }))
          : efecto('Sales por la tangente atacando al programa y queda exactamente como lo que es: no tienes respuesta. El corte de tu cara buscando la salida acumula nueve millones antes del jueves.' + expulsion(e, 0.006), m(e, { credibilidad: [-16, -9], mediatico: [10, 17], apoyo: [-7, -2], moral: [-9, -4] })); } },
      { txt: 'Prometerlo otra vez, en directo', sub: 'Esta vez con fecha.', riesgo: 0.5,
        efecto: (e, ok) => ok
          ? efecto('Das una fecha concreta, en directo, mirando a cámara. Tu jefe de gabinete se lleva las manos a la cabeza desde el control, pero el titular de mañana es tuyo y lo has escrito tú.', m(e, { apoyo: [6, 13], mediatico: [9, 15], credibilidad: [3, 8] }))
          : efecto('Prometes lo mismo con fecha nueva. Se hace un montaje con las tres veces que lo has prometido, cada una con su fecha, cada una incumplida. Ya son cuatro.', m(e, { credibilidad: [-14, -8], apoyo: [-6, -1], mediatico: [6, 11] })) },
    ],
  },
  {
    id: 'crisis_migratoria', etapas: ['direccion', 'liderazgo', 'moncloa'], peso: 20,
    titulo: 'Semana de crisis migratoria',
    texto: e => `Cuatro mil personas en una semana en Canarias, los centros de menores al 400% y un pueblo de dos mil habitantes al que le anuncian un centro de acogida sin avisar al alcalde. Todos los platós te esperan y tu gabinete tiene tres borradores encima de la mesa, uno por cada cosa que podrías ser.`,
    opciones: [
      { txt: 'Ir a Canarias y callarte', sub: 'Ver el muelle antes de opinar.', riesgo: 0.7,
        efecto: (e, ok) => ok
          ? efecto('Te plantas en el muelle de Arguineguín a las seis de la mañana sin convocar a nadie, hablas dos horas con Cruz Roja y con la Guardia Civil y sales diciendo tres cifras y ninguna consigna. Es la comparecencia menos compartida de la semana y la única que envejece bien.', m(e, { credibilidad: [12, 19], gestion: [7, 12], mediatico: [-2, 4], apoyo: [-2, 4] }))
          : efecto('Vas, y el vídeo que circula son once segundos tuyos mirando el móvil mientras un voluntario te explica algo. No se ve lo que hiciste las otras dos horas.', m(e, { credibilidad: [-7, -2], mediatico: [5, 10], moral: [-6, -2] })) },
      { txt: 'Endurecer el discurso', sub: 'Fronteras, orden y expulsiones.', riesgo: 0.55,
        efecto: (e, ok) => ok
          ? efecto('Sacas la palabra "descontrol" catorce veces en nueve minutos. Funciona: las encuestas se mueven esa misma semana y en tu grupo hay quien te aplaude y quien no te mira a la cara en el pasillo.', m(e, { apoyo: [6, 13], mediatico: [8, 14], credibilidad: [-8, -3], moral: [-7, -2] }))
          : efecto('Te pasas de frenada con una frase sobre "los que vienen" y la retiras a las tres horas. Ya la ha recogido la prensa internacional y tu propio partido emite una nota aclaratoria que te desautoriza sin nombrarte.' + expulsion(e, 0.007), m(e, { credibilidad: [-13, -7], apoyo: [-4, 3], aparato: [-9, -4] })) },
      { txt: 'Defender el reparto', sub: 'Solidaridad entre comunidades.', riesgo: 0.6,
        efecto: (e, ok) => ok
          ? efecto('Defiendes el reparto obligatorio con los números en la mano y consigues que dos presidentes autonómicos de tu propio partido lo acepten por teléfono un domingo. No sale en ningún titular y es lo más difícil que has hecho este año.', m(e, { gestion: [10, 16], credibilidad: [9, 15], apoyo: [-5, 1], aparato: [4, 9] }))
          : efecto('Defiendes el reparto y cuatro comunidades anuncian recurso el mismo día, dos de ellas gobernadas por los tuyos. El asunto se pudre en los tribunales y los menores siguen donde estaban.', m(e, { credibilidad: [3, 8], apoyo: [-8, -3], aparato: [-7, -2], moral: [-8, -3] })) },
    ],
  },
  {
    id: 'sobrecoste', etapas: DESDE_AUTONOMICA, peso: 15, unico: true,
    titulo: 'El sobrecoste de la obra',
    texto: e => `La adjudicación del centro cultural sale con un 34% de sobrecoste y un modificado firmado en agosto. El interventor ha puesto un reparo por escrito. La empresa es de las de siempre y el director general que lo firmó lo puso ${rivalDe(e)}. Tú tienes la carpeta encima de la mesa y nadie más la ha abierto todavía.`,
    opciones: [
      { txt: 'Llevarlo a Fiscalía tú mismo', sub: 'Antes de que salga fuera.',
        efecto: e => { e.flags.limpio = true; hito(e, '🧹', 'Llevaste un sobrecoste a Fiscalía');
          return efecto(`Lo llevas tú, con la carpeta entera y el reparo del interventor grapado. Dentro del partido no te lo perdona nadie —"esto se arregla en casa"— y fuera te conviertes en el ejemplo que todos los editoriales piden y ningún partido quiere tener.`, m(e, { credibilidad: [16, 25], moral: [8, 14], aparato: [-14, -7], apoyo: [2, 7] })); } },
      { txt: 'Guardar la carpeta', sub: 'Por si algún día hace falta.', riesgo: 0.65,
        efecto: (e, ok) => { e.flags.carpeta = true; return ok
          ? efecto(`Te la guardas. Dos años después, cuando ${rivalDe(e)} va a por tu puesto en el comité, la carpeta aparece sola en la redacción de un periódico. Nadie sabe cómo. Tú tampoco.`, m(e, { aparato: [10, 17], media: [2, 6], credibilidad: [-8, -3], moral: [-6, -1] }))
          : efecto('Te la guardas y la carpeta sale igual, pero con la fecha en que llegó a tu mesa. La pregunta deja de ser quién lo firmó y pasa a ser por qué lo sabías y te callaste.', m(e, { credibilidad: [-18, -11], media: [-4, -2], moral: [-11, -5] })); } },
      { txt: 'Meter mano y llevarte una parte', sub: 'Nadie mira los modificados.', riesgo: 0.22,
        efecto: (e, ok) => { if (ok) { e.flags.corrupto = true;
            return efecto('Se coloca a dos personas de confianza, se aprueba un modificado más y aparece una consultora que factura informes que nadie lee. Entra dinero, no salta ninguna alarma y descubres lo fácil que era. Eso es lo que peor se lleva.', m(e, { dinero: 180000, credibilidad: [-6, -2], moral: [-14, -7] })); }
          e.flags.imputado = true; e.flags.corrupto = true;
          hito(e, '⚖️', 'Imputado por el caso del sobrecoste');
          return efecto('La UCO entra en la consejería un martes a las ocho de la mañana con los ordenadores en el punto de mira. Sales imputado, el partido te suspende de militancia el mismo día y tu carrera se convierte en un rótulo rojo permanente.' + expulsion(e, 0.05), m(e, { credibilidad: [-40, -28], media: [-12, -7], moral: [-20, -12], apoyo: [-12, -5] })); } },
    ],
  },
  {
    id: 'falcon_boda', etapas: CUPULA, peso: 14, unico: true, cond: e => !!e.flags.gobierno,
    titulo: 'El Falcon y la boda de tu sobrina',
    texto: () => 'Tienes cumbre en Bruselas el viernes por la mañana y la boda de tu sobrina el viernes por la tarde en Jerez. Con el avión oficial llegas al banquete. En comercial, llegas al baile. Tu jefa de gabinete dice que técnicamente el desplazamiento es oficial porque el domingo tienes acto en Cádiz, y ese "técnicamente" es exactamente el problema.',
    opciones: [
      { txt: 'Usar el Falcon', sub: 'Técnicamente es un viaje oficial.', riesgo: 0.3,
        efecto: (e, ok) => { e.flags.falcon = true; return ok
          ? efecto('Vas, llegas al banquete y nadie se entera porque el domingo, efectivamente, tienes acto en Cádiz y sales en las fotos. La palabra "técnicamente" ha sostenido cosas peores.', m(e, { moral: [6, 11], credibilidad: [-4, 0] }))
          : efecto('Un invitado sube a redes una foto del avión oficial en la pista de Jerez con la etiqueta de la boda. En 48 horas hay tres preguntas parlamentarias registradas, un reportaje sobre el coste por hora de vuelo y una foto tuya con copa en la mano recortada en todas partes.' + expulsion(e, 0.005), m(e, { credibilidad: [-20, -12], mediatico: [12, 20], apoyo: [-8, -3] })); } },
      { txt: 'Comercial y llegar al baile', sub: 'Perderte el banquete.',
        efecto: e => efecto('Vuelas en comercial, aterrizas a las once y llegas a tiempo del baile con el traje arrugado. Tu hermana te dice que has llegado tarde. Nadie más se entera, que es exactamente el objetivo.', m(e, { credibilidad: [5, 10], moral: [3, 8], aguante: [-6, -2] })) },
      { txt: 'No ir a la boda', sub: 'Bruselas y punto.',
        efecto: e => efecto('Mandas un vídeo que se ve en la pantalla del salón mientras los novios cortan la tarta. Tu hermana no te habla en catorce meses. En Bruselas cierras el asunto y a nadie de allí le importa que fuera viernes.', m(e, { gestion: [5, 10], media: [1, 4], moral: [-10, -5] })) },
    ],
  },
  {
    id: 'entrevista_fatal', etapas: DESDE_AUTONOMICA, peso: 16,
    titulo: 'Cuarenta minutos a cara de perro',
    texto: e => `Entrevista larga, sin cortes y con un periodista que se ha leído tu programa entero, cosa que no esperabas. En el minuto 29 te pregunta por la cifra que llevas repitiendo dos años y que resulta que está mal. Es tu cifra, la has dicho en el Congreso y no la has comprobado nunca.`,
    opciones: [
      { txt: 'Admitir que no la has comprobado', sub: 'Se acabó repetirla.',
        efecto: e => efecto('Dices que la cifra la traías de un informe interno, que no la has verificado y que dejas de usarla desde hoy. El periodista se queda sin la segunda pregunta, que era la buena.', m(e, { credibilidad: [10, 17], mediatico: [3, 8], apoyo: [-2, 3] })) },
      { txt: 'Sostenerla y subir el tono', sub: 'La cifra es la cifra.', riesgo: 0.35,
        efecto: (e, ok) => { e.flags.viral = true; return ok
          ? efecto('La sostienes, subes el tono y consigues llevarte la entrevista al terreno de "los medios contra mí". A tu electorado le encanta y esa noche eres tendencia por arriba.', m(e, { mediatico: [11, 18], apoyo: [3, 9], credibilidad: [-9, -4] }))
          : efecto('La sostienes, el periodista saca la fuente original en pantalla y te quedas doce segundos sin decir nada. Luego dices una frase que no deberías haber dicho. Ese es el clip, y lo va a poner todo el mundo, incluidos los tuyos.' + expulsion(e, 0.010), m(e, { credibilidad: [-19, -11], mediatico: [12, 20], apoyo: [-9, -3], moral: [-11, -5] })); } },
      { txt: 'Cortar la entrevista', sub: 'Levantarte y quitarte el micro.', riesgo: 0.25,
        efecto: (e, ok) => { e.flags.viral = true; return ok
          ? efecto('Te quitas el micro y te vas. Es un desastre y sin embargo funciona: durante una semana la conversación es sobre si el periodista se pasó, y nadie vuelve a hablar de la cifra.', m(e, { mediatico: [10, 17], credibilidad: [-8, -3], apoyo: [-2, 4] }))
          : efecto('Te quitas el micro, te levantas y el plano sigue grabando doce segundos más mientras le dices algo al periodista creyendo que ya no hay cámara. Sí que hay cámara.' + expulsion(e, 0.014), m(e, { credibilidad: [-22, -14], mediatico: [14, 22], apoyo: [-11, -4], moral: [-12, -6] })); } },
    ],
  },
  {
    id: 'cena_ibex', etapas: CUPULA, peso: 15,
    titulo: 'La cena de los treinta cubiertos',
    texto: e => `Un salón privado, treinta cubiertos y los consejeros delegados de media bolsa española. No se pide nada, no se firma nada y no hay cámaras: solo se cena y se comenta el marco regulatorio con mucha educación. ${esIzquierda(e) ? 'Tu militancia se enteraría por una filtración y no lo entendería jamás.' : 'Es tu gente y todo el mundo lo da por hecho, lo cual tiene su propio problema.'}`,
    opciones: [
      { txt: 'Ir y escuchar', sub: 'Saber qué piensan los que mandan.',
        efecto: e => efecto('Vas, escuchas tres horas y hablas ocho minutos. Sales sabiendo qué va a pasar con la reforma antes de que pase, que es lo único que se compra en esas cenas.', m(e, { gestion: [7, 12], aparato: [4, 9], credibilidad: [-6, -2], dinero: 0 })) },
      { txt: 'Ir y decirles que no', sub: 'A la cara y con postre.', riesgo: 0.55,
        efecto: (e, ok) => ok
          ? efecto('Vas, te comes el solomillo y les dices en la sobremesa exactamente lo que vas a hacer y por qué no les va a gustar. Alguien lo filtra al día siguiente en tu favor. Nunca sabrás quién ni por qué.', m(e, { credibilidad: [11, 18], mediatico: [6, 11], apoyo: [3, 8] }))
          : efecto('Vas, les dices que no y a la semana siguiente tres periódicos económicos publican el mismo análisis sobre tu "falta de seguridad jurídica". Es una casualidad extraordinaria.', m(e, { credibilidad: [4, 9], mediatico: [-6, -2], apoyo: [-6, -2] })) },
      { txt: 'No ir', sub: 'Que conste que no fuiste.',
        efecto: e => efecto('No vas y lo dices. Te ahorras la foto que no existía y te ganas una fama de inaccesible que te va a costar tres llamadas sin devolver cada vez que necesites algo.', m(e, { credibilidad: [7, 13], moral: [4, 9], gestion: [-5, -1], aparato: [-4, 0] })) },
    ],
  },
  {
    id: 'enchufe_familiar', etapas: DESDE_AUTONOMICA, peso: 13, unico: true,
    titulo: 'Tu cuñado tiene un currículum',
    texto: () => 'Hay una plaza de asesor en tu área. Tu cuñado lleva ocho meses en el paro, tiene el perfil justito y, técnicamente, cumple los requisitos. Nadie lo miraría dos veces. Nadie, hasta que alguien lo mire.',
    opciones: [
      { txt: 'Contratarlo', sub: 'Cumple los requisitos.', riesgo: 0.5,
        efecto: (e, ok) => ok
          ? efecto('Entra, trabaja bien y nadie dice nada en cuatro años. La mitad de las veces la historia es exactamente esta y no da para ningún titular.', m(e, { moral: [4, 9], credibilidad: [-7, -3] }))
          : efecto('Alguien cruza apellidos con el BOE y sale publicado con foto de los dos en una comunión. Tú explicas que cumplía los requisitos. Nadie escucha la segunda parte de esa frase jamás.', m(e, { credibilidad: [-17, -10], mediatico: [8, 14], apoyo: [-6, -2] })) },
      { txt: 'Decirle que no', sub: 'Y aguantar la Nochebuena.',
        efecto: e => efecto('Le dices que no y le explicas por qué. No lo entiende, tu pareja tampoco del todo, y la Nochebuena es larga. Duermes bien igualmente.', m(e, { credibilidad: [8, 14], moral: [-4, 2] })) },
      { txt: 'Colocarlo en otro sitio', sub: 'Una llamada a un amigo.', riesgo: 0.45,
        efecto: (e, ok) => ok
          ? efecto('Una llamada, otra consejería, otro apellido en la nómina. Nadie cruza nada porque no hay nada que cruzar contigo. Así funciona y por eso casi nunca se pilla.', m(e, { aparato: [5, 10], moral: [2, 6], credibilidad: [-5, -1] }))
          : efecto('La llamada existe, y el que la recibió se la cuenta a alguien en una comida. Dos años después aparece en un reportaje sobre redes de favores con tu nombre en el tercer párrafo.', m(e, { credibilidad: [-13, -7], aparato: [-5, -1], mediatico: [5, 10] })) },
    ],
  },
  {
    id: 'tractorada', etapas: DESDE_AUTONOMICA, peso: 14,
    titulo: 'Tractores en la Castellana',
    texto: e => `Seis mil tractores cortando Madrid sin convocatoria oficial de nadie, sin interlocutor claro y con las cámaras en directo desde las siete de la mañana. Piden precios justos, menos papeleo de Bruselas y agua. Las tres cosas dependen de tres administraciones distintas y ninguna es del todo la tuya.`,
    opciones: [
      { txt: 'Bajar a la calle con ellos', sub: 'A pie, entre los tractores.', riesgo: 0.5,
        efecto: (e, ok) => ok
          ? efecto('Bajas sin escolta visible y te comes hora y media de bronca de pie. Al final un agricultor de Cuenca te da la mano delante de las cámaras y esa imagen vale toda la mañana.', m(e, { carisma: [8, 14], credibilidad: [8, 14], apoyo: [4, 10], aguante: [-5, -2] }))
          : efecto('Bajas y te reciben con un abucheo que dura los cuatro minutos que aguantas. El plano de tu equipo sacándote de allí es el que abre los informativos.', m(e, { mediatico: [7, 13], moral: [-10, -4], apoyo: [-6, -2] })) },
      { txt: 'Recibir a una delegación', sub: 'Doce personas y un acta.',
        efecto: e => efecto('Los recibes, sale un acta con siete puntos y tres de ellos son competencia de Bruselas. Se levanta la protesta, no se resuelve nada y todo el mundo puede decir que ha ganado algo.', m(e, { gestion: [7, 12], aparato: [4, 8], apoyo: [1, 5], credibilidad: [-2, 3] })) },
      { txt: 'Culpar a Bruselas', sub: 'La PAC, el Pacto Verde y ya.',
        efecto: e => efecto('Sacas la palabra "Bruselas" once veces. Funciona esa tarde, no arregla nada y en seis meses vuelven los tractores con la misma pancarta y una tuya nueva.', m(e, { apoyo: [3, 8], mediatico: [4, 9], credibilidad: [-8, -3], gestion: [-4, 0] })) },
    ],
  },
  {
    id: 'plato_fichaje', etapas: DESDE_AUTONOMICA, peso: 12, cond: e => e.stats.mediatico >= 55,
    titulo: 'Te ofrecen un sillón de tertuliano',
    texto: () => 'Una productora te ofrece silla fija en una tertulia diaria: 9.000 € al mes, dos horas de trabajo, ni un solo votante al que rendirle cuentas y la posibilidad de opinar de todo sin gestionar nada. El contrato empieza el día que entregues el acta.',
    opciones: [
      { txt: 'Firmar y dejar la política', sub: 'Opinar paga mejor que decidir.',
        efecto: e => { e.flags.retiroElegido = true; e.flags.causaElegida = 'plato';
          hito(e, '📺', 'Fichas por una tertulia diaria');
          return efecto('Entregas el acta un jueves y el lunes ya estás sentado en el plató comentando lo que hacen los que siguen dentro. Se te da bien. Se te da muy bien, y eso es lo que más rabia debería darte.', m(e, { dinero: 190000, mediatico: [12, 20] })); } },
      { txt: 'Compaginar los fines de semana', sub: 'Un rato el domingo.', riesgo: 0.5,
        efecto: (e, ok) => ok
          ? efecto('Vas los domingos, cobras poco y ganas una ventana semanal donde marcas tú la agenda. Tus rivales tardan dos años en entender lo que has montado.', m(e, { mediatico: [9, 15], dinero: 26000, credibilidad: [-4, 0] }))
          : efecto('Compaginar sale mal: dos domingos seguidos dices en el plató cosas que tu grupo no había pactado. Te retiran la invitación desde tu propio partido, no desde la cadena.', m(e, { aparato: [-9, -4], credibilidad: [-6, -2], mediatico: [4, 8] })) },
      { txt: 'Decir que no', sub: 'Todavía queda trabajo.',
        efecto: e => efecto('Dices que no. La silla la ocupa otro compañero tuyo de escaño al mes siguiente y, sinceramente, se le ve más contento que a ti.', m(e, { moral: [3, 8], credibilidad: [4, 9] })) },
    ],
  },
  {
    id: 'fango', etapas: CUPULA, peso: 14,
    titulo: 'La semana del fango',
    texto: e => `Alguien de tu entorno filtra a un periódico una historia sobre la vida privada de un adversario. No es delito, no es de interés público y es rigurosamente cierto. Tu jefe de campaña dice que "esto se cuenta solo". Todavía no ha salido y todavía puedes pararlo.`,
    opciones: [
      { txt: 'Pararlo y decirlo dentro', sub: 'Aquí no se hace eso.',
        efecto: e => { e.flags.limpio = true; return efecto('Llamas al director, lo paras y reúnes a tu equipo para dejar claro que quien vuelva a hacerlo se va. Dos personas de tu gabinete piensan que eres un ingenuo y una de ellas tiene razón.', m(e, { credibilidad: [12, 19], moral: [9, 15], mediatico: [-4, 0] })); } },
      { txt: 'Dejar que salga', sub: 'Tú no has hecho nada.', riesgo: 0.6,
        efecto: (e, ok) => ok
          ? efecto('Sale, hace dos días de ruido y tu adversario pierde una semana entera explicándose. Tú no has dicho nada, no has firmado nada y no vas a dormir peor por ello. Aparentemente.', m(e, { apoyo: [4, 9], mediatico: [5, 10], moral: [-7, -3], credibilidad: [-4, 0] }))
          : efecto('Sale, y a las 36 horas se sabe de dónde salió. El asunto pasa a ser tu equipo, tus métodos y una palabra que ya no te vas a quitar de encima en toda la legislatura.', m(e, { credibilidad: [-17, -10], apoyo: [-7, -2], moral: [-10, -4] })) },
      { txt: 'Avisar al adversario', sub: 'Llamarle tú antes.', riesgo: 0.7,
        efecto: (e, ok) => ok
          ? efecto('Le llamas y se lo cuentas. Se queda callado, te da las gracias y cuelga. Tres años después, en una votación imposible, hay un voto que no te explicas. Te lo explicas perfectamente.', m(e, { credibilidad: [9, 15], moral: [10, 16], aparato: [3, 8] }))
          : efecto('Le llamas y a la semana siguiente él cuenta en una entrevista que le llamaste, como prueba de que en tu partido se hacen esas cosas. Te ha usado y ha hecho bien.', m(e, { credibilidad: [-8, -3], moral: [-8, -3], aparato: [-5, -1] })) },
    ],
  },
];

// ── Leyes: el pleno ──────────────────────────────────────────────────────────
// Cada ley del catálogo se convierte en un evento único con tres opciones:
// a favor, en contra o abstención. Lo que pasa después no es aleatorio: sale de
// comparar el vector ideológico de la ley con el de tu partido en ese momento.
// Por eso votar lo mismo tiene consecuencias distintas según en qué bancada
// estés sentado, que es justamente la gracia del transfuguismo.
function eventoDeLey(ley) {
  const resultado = (e, sentido) => {
    const r = votarLey(e, ley, sentido);
    const p = partidoDe(e);
    const juicio = r.coherencia > 0.35 ? `Es exactamente lo que espera quien vota a ${p.nombre}.`
      : r.coherencia > 0.1 ? `Encaja con lo tuyo sin entusiasmar a nadie.`
        : r.coherencia > -0.1 ? `Ni fu ni fa: nadie sabe muy bien qué has defendido hoy.`
          : r.coherencia > -0.35 ? `A tu electorado le chirría y lo dice en los comentarios.`
            : `Es lo contrario de lo que llevabas en el programa. ${p.electorado.split('.')[1]?.trim() ?? 'Tu gente lo nota.'}`;
    const suerte = r.aprobada ? 'La ley sale adelante.' : 'La ley decae en la votación.';
    return { texto: `${juicio} ${suerte}`, resumen: r.resumen };
  };
  const opcion = (txt, sub, sentido) => ({
    txt, sub,
    efecto: e => { const r = resultado(e, sentido); return efecto(r.texto, r.resumen); },
  });

  return {
    id: `ley_${ley.id}`, etapas: DESDE_CONGRESO, peso: 21, unico: true, esLey: true, ley,
    titulo: `Pleno: ${ley.nombre}`,
    texto: () => ley.texto,
    opciones: [
      opcion('Votar a favor', 'Que salga adelante.', 'favor'),
      opcion('Votar en contra', 'Que decaiga.', 'contra'),
      opcion('Abstenerse', 'Ni sí ni no. El clásico.', 'abstencion'),
    ],
  };
}

for (const ley of LEYES) EVENTOS.push(eventoDeLey(ley));

// ── Selector de evento ───────────────────────────────────────────────────────
export function siguienteEvento(estado) {
  const etapa = estado.flags.etapaActual;
  const disponible = ev =>
    ev.etapas.includes(etapa) &&
    !(ev.unico && estado.vistos.has(ev.id)) &&
    (!ev.cond || ev.cond(estado));

  // Nunca la misma decisión dos turnos seguidos: se descarta la última que
  // salió. Si por lo que sea era la única posible, se permite antes que
  // quedarse sin evento.
  let pool = EVENTOS.filter(ev => disponible(ev) && ev.id !== estado.ultimoEvento);
  if (!pool.length) pool = EVENTOS.filter(disponible);
  if (!pool.length) return null;

  const total = pool.reduce((s, ev) => s + ev.peso, 0);
  let r = Math.random() * total;
  let elegido = pool[pool.length - 1];
  for (const ev of pool) { r -= ev.peso; if (r <= 0) { elegido = ev; break; } }
  estado.vistos.add(elegido.id);
  estado.ultimoEvento = elegido.id;
  // Algunos eventos necesitan calcular algo antes de pintarse (una oferta de
  // fichaje concreta, por ejemplo) para que el texto y el efecto coincidan.
  elegido.preparar?.(estado);
  return elegido;
}
