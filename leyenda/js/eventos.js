// Catálogo de decisiones. Cada evento se ofrece según la etapa de la carrera.
// efecto() devuelve el texto de consecuencia que se muestra al jugador.
import { azar, entero, dado, elegir, limitar, capturaAleatoria, fichar, hito, poderPokemon } from './motor.js';
import { PORLINEA, LINEAS } from './datos.js';

// Aplica cambios de stats y devuelve un resumen legible
function m(e, deltas) {
  const partes = [];
  const ETIQ = { poder: 'Poder', estrategia: 'Estrategia', vinculo: 'Vínculo', fama: 'Fama', salud: 'Salud', moral: 'Moral' };
  for (const [k, v] of Object.entries(deltas)) {
    if (v === 0) continue;
    if (k === 'dinero') { e.dinero = Math.max(0, e.dinero + v); partes.push(`${v > 0 ? '+' : ''}${v.toLocaleString('es')} ₽`); continue; }
    e.stats[k] = limitar(e.stats[k] + v);
    partes.push(`${v > 0 ? '+' : ''}${v} ${ETIQ[k] ?? k}`);
  }
  return partes.join(' · ');
}

// socioReal = el inicial con el que empezaste, si sigue en activo.
// socioDe = ese mismo, o cualquier compañero disponible si ya se retiró.
const socioReal = e => e.equipo.find(p => p.uid === e.socio && !p.retirado);
const socioDe = e => socioReal(e) ?? e.equipo.find(p => !p.retirado);
const activos = e => e.equipo.filter(p => !p.retirado);
const masFuerte = e => activos(e).slice().sort((a, b) => poderPokemon(b) - poderPokemon(a))[0];
const efecto = (txt, res) => res ? `${txt}\n\n▸ ${res}` : txt;

function lesionar(e, p, años = 1) {
  if (!p) return '';
  p.lesionado = true;
  e.flags.lesionado = true;
  e.flags.lesionAños = años;
  return `${p.nombre} queda tocado.`;
}

const TODAS = ['novato', 'gimnasios', 'liga', 'pro', 'cima', 'veterano'];

export const EVENTOS = [
  // ── NOVATO ─────────────────────────────────────────────────────────────────
  {
    id: 'primer_dia', etapas: ['novato'], peso: 30, unico: true,
    cond: e => !!socioDe(e),
    titulo: 'El primer día',
    texto: e => `Tienes ${e.edad} años y un ${socioDe(e).nombre} que todavía no sabe si fiarse de ti. El profesor te ofrece algo antes de salir de casa.`,
    opciones: [
      { txt: 'Cinco Poké Balls', sub: 'Empieza a construir equipo ya.',
        efecto: e => { const p = capturaAleatoria(e); return efecto(`Atrapas a ${p?.nombre ?? 'un Rattata'} en la primera ruta. No es gran cosa, pero es tuyo.`, m(e, { poder: 3 })); } },
      { txt: 'Una Pokédex', sub: 'Conocimiento antes que fuerza.',
        efecto: e => efecto('Te pasas las noches leyendo datos de tipos y debilidades. Aprendes más que la mayoría.', m(e, { estrategia: 9 })) },
      { txt: 'Nada, solo tu Pokémon', sub: 'Tú y él contra el mundo.',
        efecto: e => { const s = socioDe(e); s.vinculo = limitar(s.vinculo + 20); return efecto(`Sales con lo puesto. ${s.nombre} camina a tu lado, no dentro de la bola.`, m(e, { vinculo: 12, moral: 6 })); } },
    ],
  },
  {
    id: 'ruta_bosque', etapas: ['novato', 'gimnasios'], peso: 18,
    titulo: 'Noche en el bosque',
    texto: () => 'Llevas seis horas caminando. Se hace de noche y oyes algo grande moviéndose entre los árboles.',
    opciones: [
      { txt: 'Investigar', sub: 'Podría ser una captura rara.',
        efecto: e => dado(0.55)
          ? efecto(`Es un ${capturaAleatoria(e, { rarezaMin: 'raro' })?.nombre ?? 'nada'} y logras capturarlo. Nadie de tu edad tiene uno.`, m(e, { fama: 4 }))
          : efecto('Era una manada de Ursaring. Corres. Corres mucho.', m(e, { salud: -8, moral: -4 })) },
      { txt: 'Montar el campamento y dormir', sub: 'Descansar también entrena.',
        efecto: e => efecto('Duermes ocho horas seguidas por primera vez en semanas. Amaneces nuevo.', m(e, { salud: 8, moral: 6 })) },
      { txt: 'Entrenar toda la noche', sub: 'El miedo se combate a golpes.',
        efecto: e => efecto('Entrenas hasta el amanecer con los ojos rojos. Funciona, pero lo pagas.', m(e, { poder: 7, salud: -6 })) },
    ],
  },
  {
    id: 'magikarp', etapas: ['novato', 'gimnasios'], peso: 14, unico: true,
    cond: e => !e.equipo.some(p => p.linea === 'magikarp'),
    titulo: 'El vendedor del puente',
    texto: e => `Un tipo con bigote te ofrece un Magikarp por 2.500 ₽. "Es una inversión", dice. Tienes ${e.dinero.toLocaleString('es')} ₽.`,
    opciones: [
      { txt: 'Comprarlo', sub: 'Todo el mundo sabe en qué evoluciona.', cond: e => e.dinero >= 2500,
        efecto: e => { fichar(e, 'magikarp'); return efecto('Te llevas el pez más inútil del mundo. De momento.', m(e, { dinero: -2500 })); } },
      { txt: 'Regatear duro', sub: 'Puede salir mal.',
        efecto: e => dado(0.5)
          ? (fichar(e, 'magikarp'), efecto('Lo dejas en 800 ₽ y el hombre se va refunfuñando.', m(e, { dinero: -800, estrategia: 3 })))
          : efecto('El vendedor se ofende y se marcha. Adiós Gyarados.', m(e, { moral: -3 })) },
      { txt: 'Pasar de largo', sub: 'Es una estafa evidente.',
        efecto: e => efecto('Sigues tu camino. Meses después ves a otro entrenador con un Gyarados enorme.', m(e, { estrategia: 2, moral: -2 })) },
    ],
  },
  {
    id: 'primer_gym', etapas: ['novato', 'gimnasios'], peso: 20,
    cond: e => !!socioDe(e),
    titulo: 'Muro en el gimnasio',
    texto: e => `Es tu tercer intento contra el mismo líder. ${socioDe(e).nombre} está agotado y el público empieza a murmurar.`,
    opciones: [
      { txt: 'Insistir hoy mismo', sub: 'Cuarta vez, ahora o nunca.',
        efecto: e => dado(0.45)
          ? efecto('Ganas por los pelos con el último Pokémon en pie. El gimnasio entero se levanta.', m(e, { fama: 6, moral: 10, poder: 3 }))
          : efecto(`Pierdes otra vez. ${lesionar(e, socioDe(e))} Te vas por la puerta de atrás.`, m(e, { moral: -10, fama: -3 })) },
      { txt: 'Retirarte y entrenar un mes', sub: 'Volver mejor.',
        efecto: e => efecto('Un mes de trabajo silencioso. Vuelves y ganas sin despeinarte.', m(e, { poder: 6, estrategia: 4, moral: 3 })) },
      { txt: 'Estudiar sus combates grabados', sub: 'Buscar el patrón.',
        efecto: e => efecto('Encuentras el fallo: siempre abre con el mismo movimiento. Lo destrozas en tres turnos.', m(e, { estrategia: 10, fama: 4 })) },
    ],
  },
  {
    id: 'apodo', etapas: ['novato', 'gimnasios'], peso: 10, unico: true,
    titulo: 'La prensa local',
    texto: e => `Un periodista de ${e.regionNombre} quiere hacerte una entrevista. Es tu primer foco.`,
    opciones: [
      { txt: 'Prometer que serás Campeón', sub: 'Titular garantizado.',
        efecto: e => { e.flags.bocazas = true; return efecto('"EL CHAVAL QUE VA A GANARLO TODO". Ahora todos te miran. Todos.', m(e, { fama: 12, moral: 5 })); } },
      { txt: 'Hablar de tus Pokémon, no de ti', sub: 'Humildad.',
        efecto: e => efecto('El artículo sale pequeño, pero tus Pokémon salen en la foto. Ellos lo notan.', m(e, { vinculo: 8, fama: 3 })) },
      { txt: 'Rechazar la entrevista', sub: 'A entrenar.',
        efecto: e => efecto('Ese día lo dedicas al campo de entrenamiento. Nadie escribe sobre ti.', m(e, { poder: 5 })) },
    ],
  },

  // ── GIMNASIOS / LIGA ───────────────────────────────────────────────────────
  {
    id: 'rival_reta', etapas: ['gimnasios', 'liga', 'pro'], peso: 22,
    cond: e => e.rival.activo && activos(e).length >= 2,
    titulo: e => `${e.rival.nombre} te está esperando`,
    texto: e => `${e.rival.nombre} lleva todo el año siguiéndote la pista. Te corta el paso en la entrada del estadio: "Uno contra uno. Si pierdes, me das a tu ${masFuerte(e).nombre}".`,
    opciones: [
      { txt: 'Aceptar la apuesta', sub: 'Alto riesgo, alto premio.',
        efecto: e => {
          const mio = masFuerte(e);
          if (poderPokemon(mio) + azar(-8, 12) >= e.rival.poder) {
            e.rival.derrotasTuyas++;
            const p = capturaAleatoria(e, { rarezaMin: 'raro' });
            return efecto(`${mio.nombre} lo barre. ${e.rival.nombre} cumple y te entrega su ${p?.nombre ?? 'orgullo'}.`, m(e, { fama: 8, moral: 12 }));
          }
          mio.retirado = true;
          return efecto(`Pierdes. Entregas a ${mio.nombre} y no le miras a los ojos mientras se lo lleva.`, m(e, { moral: -18, vinculo: -8 }));
        } },
      { txt: 'Combatir sin apostar nada', sub: 'Orgullo, no cromos.',
        efecto: e => dado(0.55)
          ? efecto(`Ganas limpio. ${e.rival.nombre} escupe al suelo y se va.`, m(e, { fama: 5, moral: 8 }))
          : efecto('Pierdes, pero sales entero. Aprendes de cada turno.', m(e, { estrategia: 6, moral: -4 })) },
      { txt: 'Ignorarle y entrar al estadio', sub: 'No es tu problema.',
        efecto: e => { e.rival.relacion -= 2; return efecto(`${e.rival.nombre} grita algo a tu espalda. Tú ya estás pensando en el combate de verdad.`, m(e, { estrategia: 4, fama: -2 })); } },
    ],
  },
  {
    id: 'vitaminas', etapas: ['gimnasios', 'liga', 'pro', 'cima'], peso: 16, unico: true,
    titulo: 'La oferta del preparador',
    texto: () => 'Un preparador con demasiada sonrisa te ofrece unos "potenciadores experimentales". No están en la lista de permitidos. Nadie lo sabría. Casi nadie.',
    opciones: [
      { txt: 'Usarlos', sub: 'Todos lo hacen, dice.',
        efecto: e => {
          e.flags.dopaje = true;
          const pillado = dado(0.4);
          if (pillado) {
            e.flags.sancionado = true; e.flags.sancionadoAños = 2; e.flags.exsancionado = true;
            return efecto('Vuelas durante media temporada. Luego llega el control antidopaje. Dos años fuera y tu nombre arrastrado por el barro.', m(e, { poder: 12, fama: -30, moral: -20 }));
          }
          return efecto('Tus Pokémon rinden como nunca. Duermes mal, pero ganas.', m(e, { poder: 14, salud: -10, moral: -5, vinculo: -8 }));
        } },
      { txt: 'Rechazarlos y denunciarlo', sub: 'Hay una línea.',
        efecto: e => { e.flags.heroe = true; return efecto('La federación abre expediente. Media docena de entrenadores caen. Te ganas enemigos y un titular limpio.', m(e, { fama: 10, moral: 8, estrategia: 3 })); } },
      { txt: 'Rechazarlos en silencio', sub: 'Ni sí, ni escándalo.',
        efecto: e => efecto('Dices que no y sigues a lo tuyo. Meses después ves cómo sancionan al preparador.', m(e, { moral: 4, vinculo: 4 })) },
    ],
  },
  {
    id: 'lesion_socio', etapas: ['gimnasios', 'liga', 'pro', 'cima'], peso: 18,
    cond: e => !!socioDe(e),
    titulo: 'El diagnóstico',
    texto: e => `${socioDe(e).nombre} cae en pleno combate. El Centro Pokémon es claro: puede seguir, pero forzarlo ahora podría dejarle secuelas para siempre.`,
    opciones: [
      { txt: 'Retirarlo toda la temporada', sub: 'Su salud primero.',
        efecto: e => { const s = socioDe(e); s.vinculo = limitar(s.vinculo + 15); return efecto(`Lo apartas. Compites peor sin él, pero cuando vuelve, vuelve entero.`, m(e, { poder: -6, vinculo: 12, moral: 4 })); } },
      { txt: 'Infiltrarle analgésicos y seguir', sub: 'Queda media temporada.',
        efecto: e => { const s = socioDe(e); s.forma -= 6; e.flags.lesionCronica = true; return efecto(`Aguanta y ganáis. Pero algo se rompió: ${s.nombre} ya nunca corre igual.`, m(e, { fama: 8, vinculo: -12, salud: -6 })); } },
      { txt: 'Rotar y dar minutos a los suplentes', sub: 'Confiar en el banquillo.',
        efecto: e => { for (const p of activos(e)) p.vinculo = limitar(p.vinculo + 6); return efecto('El equipo entero da un paso adelante. Descubres que no dependías de uno solo.', m(e, { estrategia: 7, vinculo: 6 })); } },
    ],
  },
  {
    id: 'team_villano', etapas: ['gimnasios', 'liga', 'pro'], peso: 14, unico: true,
    titulo: 'Hombres de negro en el almacén',
    texto: e => `Descubres a una organización criminal robando Pokémon en el puerto de ${e.regionNombre}. Tienes el móvil en la mano y a nadie alrededor.`,
    opciones: [
      { txt: 'Entrar tú solo', sub: 'No hay tiempo.',
        efecto: e => {
          if (dado(0.6)) {
            e.flags.heroe = true; hito(e, '🦸', 'Desmanteló una red de tráfico de Pokémon');
            const p = capturaAleatoria(e, { rarezaMin: 'raro' });
            return efecto(`Los detienes. Uno de los Pokémon liberados, un ${p?.nombre ?? 'superviviente'}, se niega a separarse de ti.`, m(e, { fama: 18, moral: 12, salud: -8 }));
          }
          return efecto(`Te dan una paliza y se llevan la mercancía. Pasas tres semanas en el hospital.`, m(e, { salud: -22, moral: -10 }));
        } },
      { txt: 'Llamar a la Policía Pokémon', sub: 'Lo correcto y lo aburrido.',
        efecto: e => { e.flags.heroe = true; return efecto('La redada es un éxito. Sales en las noticias como "testigo".', m(e, { fama: 7, moral: 5 })); } },
      { txt: 'Aceptar su dinero por callarte', sub: 'Nadie te va a pagar la carrera.',
        efecto: e => { e.flags.traicion = true; return efecto('Un maletín y una noche sin dormir. La carrera se financia sola a partir de ahora.', m(e, { dinero: 250000, moral: -18, fama: -4 })); } },
    ],
  },
  {
    id: 'intercambio', etapas: ['gimnasios', 'liga', 'pro'], peso: 15,
    cond: e => activos(e).length >= 3,
    titulo: 'Oferta de intercambio',
    texto: e => `Un entrenador extranjero quiere tu ${masFuerte(e).nombre}. A cambio ofrece un Pokémon de una línea que no existe en ${e.regionNombre}.`,
    opciones: [
      { txt: 'Aceptar el cambio', sub: 'Sangre nueva.',
        efecto: e => {
          const pool = LINEAS.filter(l => ['pseudo', 'raro'].includes(l.rareza) && !e.equipo.some(p => p.linea === l.id));
          if (!pool.length) return efecto('El trato se cae en el último momento: no encontráis un intercambio que convenza a los dos.', m(e, { estrategia: 3 }));
          const fuera = masFuerte(e); fuera.retirado = true;
          const nuevo = fichar(e, elegir(pool).id, { etapa: 1 });
          return efecto(`${fuera.nombre} se va. Llega ${nuevo.nombre}, y tarda meses en obedecerte.`, m(e, { poder: 6, vinculo: -14 }));
        } },
      { txt: 'Rechazar', sub: 'No se vende.',
        efecto: e => { const f = masFuerte(e); f.vinculo = limitar(f.vinculo + 12); return efecto(`Le dices que no sin pensarlo. ${f.nombre} te mira distinto desde entonces.`, m(e, { vinculo: 8, moral: 5 })); } },
      { txt: 'Proponer un combate por el suyo', sub: 'Doble o nada.',
        efecto: e => dado(0.5)
          ? efecto(`Ganas y el extranjero, deportivo, te regala un huevo. ${fichar(e, elegir(LINEAS.filter(l => l.rareza === 'pseudo')).id).nombre} nace semanas después.`, m(e, { fama: 6 }))
          : efecto('Pierdes y solo te queda la vergüenza. Y una lección sobre soberbia.', m(e, { moral: -8, estrategia: 5 })) },
    ],
  },
  {
    id: 'concurso', etapas: ['gimnasios', 'liga', 'pro'], peso: 12,
    titulo: 'El otro camino',
    texto: () => 'Una agencia te ofrece dedicarte a los Concursos Pokémon: menos combate, mucho más dinero y portadas de revista.',
    opciones: [
      { txt: 'Compaginarlo', sub: 'Un poco de todo.',
        efecto: e => { e.flags.patrocinio = true; return efecto('Combates entre semana, escenario los fines de semana. Duermes en trenes.', m(e, { fama: 14, dinero: 60000, salud: -8, poder: -3 })); } },
      { txt: 'Dedicarte solo a combatir', sub: 'Viniste a esto.',
        efecto: e => efecto('Rechazas la agencia. El circuito serio empieza a respetarte.', m(e, { poder: 8, estrategia: 5, fama: -3 })) },
      { txt: 'Meterte de lleno en los concursos', sub: 'Vivir bien también es ganar.',
        efecto: e => { e.flags.patrocinio = true; e.flags.coordinador = true; hito(e, '🎀', 'Gran Festival de Concursos'); return efecto('Te haces famosísimo. Tus rivales de combate dejan de tomarte en serio.', m(e, { fama: 26, dinero: 180000, poder: -10, vinculo: 8 })); } },
    ],
  },
  {
    id: 'nuzlocke', etapas: ['liga', 'pro', 'cima'], peso: 12,
    cond: e => activos(e).length >= 4 && !!socioDe(e),
    titulo: 'El combate que se torció',
    texto: e => 'Un movimiento mal calculado en una tormenta eléctrica. Uno de tus Pokémon está en estado crítico y el helicóptero tarda cuarenta minutos.',
    opciones: [
      { txt: 'Abandonar el torneo y salir corriendo con él', sub: 'Nada más importa.',
        efecto: e => { const p = elegir(activos(e).filter(x => !x.socio)) ?? socioDe(e); p.vinculo = 100; return efecto(`Se salva. Pierdes el torneo por incomparecencia, pero ${p.nombre} está vivo y no se separa de ti nunca más.`, m(e, { fama: -8, vinculo: 18, moral: 10 })); } },
      { txt: 'Delegar en el equipo médico y seguir compitiendo', sub: 'Eres profesional.',
        efecto: e => {
          const p = elegir(activos(e).filter(x => !x.socio)) ?? null;
          if (p && dado(0.45)) { p.retirado = true; hito(e, '🕯️', `${p.nombre} se retiró para siempre`); return efecto(`Ganas la ronda. Cuando llegas al hospital, ${p.nombre} ya no volverá a competir jamás.`, m(e, { fama: 6, moral: -22, vinculo: -12 })); }
          return efecto(`Se recupera. Ganas la ronda. Nadie se entera de lo cerca que estuvo.`, m(e, { fama: 6, moral: -4 }));
        } },
      { txt: 'Retirarte del combate y esperar allí mismo', sub: 'Ni te vas ni compites.',
        efecto: e => efecto('Te sientas en la camilla cuarenta minutos. La federación te multa por abandono.', m(e, { dinero: -40000, vinculo: 10, moral: 4 })) },
    ],
  },

  // ── PROFESIONAL ────────────────────────────────────────────────────────────
  {
    id: 'patrocinio', etapas: ['pro', 'cima'], peso: 18, unico: true,
    cond: e => e.stats.fama >= 35,
    titulo: 'Contrato millonario',
    texto: () => 'Devon Corp. pone sobre la mesa un contrato de imagen enorme. La letra pequeña dice que ellos deciden en qué torneos compites.',
    opciones: [
      { txt: 'Firmar', sub: 'Dinero de verdad.',
        efecto: e => { e.flags.patrocinio = true; return efecto('Te forras. También compites en torneos irrelevantes en la otra punta del mundo.', m(e, { dinero: 400000, fama: 12, poder: -4, salud: -6 })); } },
      { txt: 'Negociar libertad deportiva', sub: 'Menos dinero, tus reglas.',
        efecto: e => dado(0.6)
          ? (e.flags.patrocinio = true, efecto('Aceptan tus condiciones. Cobras la mitad y eliges tu calendario.', m(e, { dinero: 180000, fama: 8, estrategia: 4 })))
          : efecto('Se levantan de la mesa. Firman con otro entrenador que sale en todos los anuncios.', m(e, { fama: -5, moral: -4 })) },
      { txt: 'Rechazar y montar tu propio gimnasio', sub: 'Ser tu propio jefe.',
        efecto: e => { e.flags.gimnasioPropio = true; hito(e, '🏛️', 'Fundó su propio gimnasio de entrenamiento'); return efecto('Abres un centro de entrenamiento con tu nombre. Se llena de críos.', m(e, { dinero: -80000, fama: 6, moral: 10, estrategia: 8 })); } },
    ],
  },
  {
    id: 'legendario', etapas: ['pro', 'cima'], peso: 10, unico: true,
    cond: e => e.stats.fama >= 45,
    titulo: 'La montaña se ha despertado',
    texto: e => `Un fenómeno atmosférico sobre ${e.regionNombre}. En el ojo de la tormenta hay un Pokémon que la mitología daba por leyenda. Tú estás más cerca que nadie.`,
    opciones: [
      { txt: 'Intentar capturarlo', sub: 'La oportunidad de una vida.',
        efecto: e => {
          const leg = elegir(LINEAS.filter(l => l.rareza === 'legendario'));
          if (dado(0.45)) {
            const p = fichar(e, leg.id); e.flags.leyendaViva = true;
            hito(e, '⚡', `Capturó a ${p.nombre}`);
            return efecto(`Contra todo pronóstico, la bola se queda quieta. ${p.nombre} es tuyo, y el mundo entero lo sabe en dos horas.`, m(e, { fama: 30, poder: 10, salud: -10 }));
          }
          return efecto('Aguantas tres horas de combate y se marcha volando. Tus Pokémon quedan destrozados y tú también.', m(e, { salud: -18, moral: -10, fama: 6 }));
        } },
      { txt: 'Estudiarlo y publicar los datos', sub: 'Ciencia, no captura.',
        efecto: e => { hito(e, '📚', 'Publicó el primer estudio de campo del fenómeno'); return efecto('Tu informe se convierte en material de referencia. Te llaman "el entrenador que pensó".', m(e, { estrategia: 14, fama: 12, dinero: 60000 })); } },
      { txt: 'Evacuar el pueblo de al lado', sub: 'Hay gente ahí abajo.',
        efecto: e => { e.flags.heroe = true; hito(e, '🦸', 'Evacuó un pueblo entero durante la tormenta'); return efecto('Sacas a doscientas personas antes de que el valle se inunde. Nadie muere. Nadie te da un trofeo.', m(e, { fama: 20, moral: 18, salud: -8 })); } },
    ],
  },
  {
    id: 'oferta_liga', etapas: ['pro', 'cima', 'veterano'], peso: 14, unico: true,
    cond: e => e.stats.fama >= 40,
    titulo: 'Un puesto en el Alto Mando',
    texto: e => `La Liga de ${e.regionNombre} te ofrece una plaza fija en el Alto Mando. Sueldo, prestigio y dejar de viajar. También dejar de competir por el título.`,
    opciones: [
      { txt: 'Aceptar la plaza', sub: 'Estabilidad y respeto.',
        efecto: e => { e.flags.altoMando = true; hito(e, '🛡️', `Miembro del Alto Mando de ${e.regionNombre}`); return efecto('Te sientas en la sala que veías por la tele con diez años. Ya no persigues nada: ahora te persiguen a ti.', m(e, { fama: 16, dinero: 200000, moral: 8, poder: -5 })); } },
      { txt: 'Rechazarla, quieres el título', sub: 'Todo o nada.',
        efecto: e => efecto('Dices que no delante de las cámaras. La presión de ganar se multiplica por diez.', m(e, { moral: -5, poder: 8, fama: 8 })) },
      { txt: 'Pedir un año para pensarlo', sub: 'Ganar tiempo.',
        efecto: e => efecto('Compites un año más con la red debajo. Se te nota en cada decisión.', m(e, { estrategia: 6, moral: 4 })) },
    ],
  },
  {
    id: 'mega', etapas: ['pro', 'cima'], peso: 13, unico: true,
    cond: e => activos(e).length >= 1,
    titulo: 'La piedra',
    texto: e => `Un investigador te entrega una Megapiedra compatible con ${masFuerte(e).nombre}. Advertencia: el proceso somete al Pokémon a un estrés brutal.`,
    opciones: [
      { txt: 'Usarla en competición', sub: 'Poder puro.',
        efecto: e => { const p = masFuerte(e); p.forma += 10; hito(e, '💎', `Megaevolucionó a ${p.nombre} en directo`); return efecto(`${p.nombre} megaevoluciona ante 40.000 personas. El estadio se cae. Él acaba temblando en el suelo.`, m(e, { poder: 10, fama: 16, vinculo: -6 })); } },
      { txt: 'Solo si él quiere', sub: 'Preguntar primero.',
        efecto: e => { const p = masFuerte(e); p.vinculo = limitar(p.vinculo + 18); p.forma += 5; return efecto(`Pasas meses entrenando el vínculo antes de usarla. Cuando por fin ocurre, es sincronía perfecta.`, m(e, { vinculo: 14, poder: 6, fama: 8 })); } },
      { txt: 'Devolverla', sub: 'No a ese precio.',
        efecto: e => efecto('El investigador no lo entiende. Tus Pokémon sí.', m(e, { vinculo: 10, moral: 6 })) },
    ],
  },
  {
    id: 'amaño', etapas: ['pro', 'cima'], peso: 12, unico: true,
    titulo: 'La llamada anónima',
    texto: () => 'Te llaman a las tres de la mañana. Ofrecen una cifra obscena por perder la semifinal. Dicen que ya han hablado con otros dos.',
    opciones: [
      { txt: 'Aceptar', sub: 'Nadie lo probaría nunca.',
        efecto: e => {
          if (dado(0.35)) { e.flags.sancionado = true; e.flags.sancionadoAños = 3; e.flags.exsancionado = true; e.flags.traicion = true; return efecto('Cobras. Seis meses después, un audio filtrado te hunde. Tres años de sanción y el nombre destrozado.', m(e, { dinero: 500000, fama: -40, moral: -25 })); }
          e.flags.traicion = true;
          return efecto('Pierdes "sin querer" en semifinales. Cobras. Nunca duermes bien otra vez.', m(e, { dinero: 500000, moral: -15, fama: -4 }));
        } },
      { txt: 'Grabar la llamada y entregarla', sub: 'Que caigan todos.',
        efecto: e => { e.flags.heroe = true; hito(e, '⚖️', 'Destapó una red de amaños en el circuito'); return efecto('Cae media directiva. Te llaman chivato en los vestuarios y héroe en los periódicos.', m(e, { fama: 15, moral: 6, estrategia: 4 })); } },
      { txt: 'Colgar y ganar la semifinal', sub: 'Silencio y trabajo.',
        efecto: e => efecto('Cuelgas. Ganas la semifinal por goleada. Es tu respuesta.', m(e, { poder: 6, moral: 10, fama: 6 })) },
    ],
  },
  {
    id: 'agotamiento', etapas: ['pro', 'cima', 'veterano'], peso: 16,
    cond: e => e.stats.salud < 60 || e.stats.moral < 50,
    titulo: 'No puedes más',
    texto: () => 'Llevas nueve años sin parar. Una mañana no consigues levantarte de la cama y no sabes por qué.',
    opciones: [
      { txt: 'Parar una temporada entera', sub: 'Desaparecer.',
        efecto: e => efecto('Un año en el campo, sin cámaras, con tus Pokémon. Vuelves siendo otro.', m(e, { salud: 25, moral: 25, fama: -14, poder: -4 })) },
      { txt: 'Apretar los dientes', sub: 'Los grandes no paran.',
        efecto: e => efecto('Sigues compitiendo. Ganas cosas. Por dentro, algo se va apagando.', m(e, { fama: 6, salud: -12, moral: -10, poder: 4 })) },
      { txt: 'Buscar ayuda profesional', sub: 'Hablarlo con alguien.',
        efecto: e => efecto('Terapia, descanso pautado, calendario reducido. Funciona mejor de lo que esperabas.', m(e, { salud: 14, moral: 18, estrategia: 5 })) },
    ],
  },
  {
    id: 'cambio_region', etapas: ['pro', 'cima'], peso: 11, unico: true,
    titulo: 'Cambiar de aires',
    texto: e => `Un circuito extranjero te quiere. Significa dejar ${e.regionNombre}, tu público y empezar de cero en un país donde nadie te conoce.`,
    opciones: [
      { txt: 'Mudarte', sub: 'Reinventarse.',
        efecto: e => {
          const nuevas = ['Kalos', 'Galar', 'Paldea', 'Teselia', 'Alola'].filter(n => n !== e.regionNombre);
          e.regionNombre = elegir(nuevas);
          hito(e, '✈️', `Se mudó a ${e.regionNombre} en plena madurez`);
          const p = capturaAleatoria(e, { rarezaMin: 'raro' });
          return efecto(`Aterrizas en ${e.regionNombre}. Idioma nuevo, meta nueva, y un ${p?.nombre ?? 'compañero'} local que se une al equipo.`, m(e, { fama: -12, poder: 8, estrategia: 8, moral: 5 }));
        } },
      { txt: 'Quedarte', sub: 'Aquí eres alguien.',
        efecto: e => efecto('Te quedas en casa. Tu gente lo agradece cada vez que sales al estadio.', m(e, { fama: 10, moral: 8, vinculo: 5 })) },
      { txt: 'Ir solo un año, cedido', sub: 'Probar sin romper nada.',
        efecto: e => efecto('Un año fuera aprendiendo métodos distintos y vuelves con ideas que aquí nadie ha visto.', m(e, { estrategia: 12, poder: 4 })) },
    ],
  },

  // ── VETERANO / CIERRE ──────────────────────────────────────────────────────
  {
    id: 'retiro_socio', etapas: ['cima', 'veterano'], peso: 20, unico: true,
    cond: e => !!socioReal(e) && e.año >= 10 && activos(e).length >= 2,
    titulo: e => `${socioReal(e).nombre} ya no llega`,
    texto: e => `Lleva ${e.año} años contigo, desde el primer día. Ya no llega a los movimientos rápidos y lo sabe. Sigue pidiendo salir a combatir.`,
    opciones: [
      { txt: 'Retirarlo con honores', sub: 'Ceremonia en el estadio.',
        efecto: e => { const s = socioReal(e); s.retirado = true; hito(e, '🎗️', `Retirada de ${s.nombre}, su primer compañero`); return efecto(`El estadio entero de pie durante ocho minutos. ${s.nombre} se va a la pradera detrás de tu casa.`, m(e, { fama: 10, moral: 12, poder: -6 })); } },
      { txt: 'Un último torneo juntos', sub: 'Una vez más.',
        efecto: e => { const s = socioReal(e);
          if (dado(0.5)) { s.retirado = true; hito(e, '🌅', `Último título con ${s.nombre}`); return efecto(`Gana el torneo. Se retira esa misma noche, invicto en su despedida.`, m(e, { fama: 18, moral: 20 })); }
          s.retirado = true; return efecto(`Cae en cuartos, agotado. Te mira como pidiendo perdón. Le abrazas delante de todo el mundo.`, m(e, { moral: -6, vinculo: 12, fama: 5 })); } },
      { txt: 'Seguir alineándolo', sub: 'Aún puede.',
        efecto: e => { const s = socioReal(e); s.forma -= 12; return efecto(`Le exiges lo que ya no tiene. Los resultados caen y la gente lo comenta.`, m(e, { poder: -8, vinculo: -14, fama: -6 })); } },
    ],
  },
  {
    id: 'discipulo', etapas: ['cima', 'veterano'], peso: 15,
    titulo: 'El crío del gimnasio',
    texto: () => 'Un chaval de once años te espera cada mañana en la puerta con un Pokémon flacucho. Quiere que le entrenes.',
    opciones: [
      { txt: 'Aceptarlo como discípulo', sub: 'Devolver lo recibido.',
        efecto: e => { hito(e, '🌱', 'Formó a la siguiente generación'); return efecto('Le enseñas todo. Años después gana la Liga y te da las gracias en directo.', m(e, { moral: 15, fama: 10, estrategia: 6, poder: -3 })); } },
      { txt: 'Darle un consejo y seguir', sub: 'No tienes tiempo.',
        efecto: e => efecto('Le dices tres cosas útiles y te vas. Se queda mirando la libreta donde las apuntó.', m(e, { moral: 3 })) },
      { txt: 'Cobrarle como alumno de pago', sub: 'Esto es un negocio.',
        efecto: e => efecto('Montas una escuela con lista de espera. Ganas dinero y pierdes algo difícil de nombrar.', m(e, { dinero: 150000, moral: -6, fama: 4 })) },
    ],
  },
  {
    id: 'ultima_final', etapas: ['veterano'], peso: 22,
    cond: e => e.edad >= 29,
    titulo: 'La última bala',
    texto: e => `${e.edad} años. El cuerpo pide parar, pero hay una plaza en la final del ${e.liga} y tú estás a un combate.`,
    opciones: [
      { txt: 'Vaciarte del todo', sub: 'Si se rompe, que se rompa.',
        efecto: e => {
          if (dado(0.45)) { e.titulos.push({ año: e.año, nombre: `${e.liga} (última final)` }); e.ligasGanadas++; hito(e, '👑', 'Ganó su última final'); return efecto('Ganas. A los 30 y pico, contra todo pronóstico. La gente llora en la grada.', m(e, { fama: 25, moral: 25, salud: -20 })); }
          return efecto('Pierdes en el quinto combate, sin fuerzas. Te aplauden igual, y eso duele más.', m(e, { salud: -18, moral: -8, fama: 5 }));
        } },
      { txt: 'Competir con cabeza, sin forzar', sub: 'Cuidarte.',
        efecto: e => efecto('Gestionas el esfuerzo como un veterano. Caes en semis pero sales entero.', m(e, { estrategia: 8, salud: -4, fama: 4 })) },
      { txt: 'Retirarte ahora, invicto en tu último año', sub: 'Marcharse en lo alto.',
        efecto: e => { e.flags.retiroElegido = true; hito(e, '🎬', 'Se retiró en la cima, por decisión propia'); return efecto('Anuncias la retirada en rueda de prensa. Sin lesiones, sin declive público. Tú decides cuándo.', m(e, { fama: 15, moral: 20 })); } },
    ],
  },
  {
    id: 'santuario', etapas: ['veterano', 'cima'], peso: 12,
    cond: e => e.dinero > 200000,
    titulo: 'Qué hacer con el dinero',
    texto: e => `Tienes ${e.dinero.toLocaleString('es')} ₽ en el banco y la carrera entrando en su recta final.`,
    opciones: [
      { txt: 'Abrir un santuario para Pokémon retirados', sub: 'Un sitio para ellos.',
        efecto: e => { e.flags.santuario = true; hito(e, '🏞️', 'Fundó un santuario para Pokémon retirados'); return efecto('Compras un valle entero. Se llena de veteranos de todo el circuito.', m(e, { dinero: -Math.round(e.dinero * 0.7), fama: 12, moral: 22, vinculo: 15 })); } },
      { txt: 'Invertirlo en tu propio equipo', sub: 'Instalaciones de élite.',
        efecto: e => efecto('Centro de alto rendimiento, nutricionistas, analistas. Tu equipo rinde como nunca.', m(e, { dinero: -Math.round(e.dinero * 0.5), poder: 10, estrategia: 8, salud: 6 })) },
      { txt: 'Guardarlo todo', sub: 'Después del deporte hay vida.',
        efecto: e => efecto('Lo dejas quieto. Después de retirarte no tendrás que trabajar nunca más.', m(e, { moral: 5 })) },
    ],
  },
  {
    id: 'entrenamiento', etapas: TODAS, peso: 20,
    cond: e => activos(e).length >= 1,
    titulo: 'Pretemporada',
    texto: () => 'Seis semanas antes de que empiece todo. Toca decidir cómo se preparan.',
    opciones: [
      { txt: 'Carga brutal en la montaña', sub: 'Sin excusas.',
        efecto: e => { e.flags.entrenaFuerte = true; const p = elegir(activos(e)); const les = dado(0.28) ? ' ' + lesionar(e, p) : '';
          return efecto(`Salís de allí más fuertes.${les}`, m(e, { poder: 11, salud: -8, vinculo: -3 })); } },
      { txt: 'Trabajo táctico y vídeo', sub: 'Estudiar al rival.',
        efecto: e => efecto('Analizáis 200 combates. Llegáis sabiendo lo que va a hacer todo el mundo.', m(e, { estrategia: 11, poder: 2 })) },
      { txt: 'Convivencia y descanso', sub: 'Estar bien también entrena.',
        efecto: e => { for (const p of activos(e)) p.vinculo = limitar(p.vinculo + 8); return efecto('Playa, juegos, comida buena. Llegáis frescos y unidos.', m(e, { vinculo: 10, salud: 10, moral: 10 })); } },
    ],
  },
  {
    id: 'redes', etapas: ['gimnasios', 'liga', 'pro', 'cima'], peso: 14,
    titulo: 'Te están destrozando en internet',
    texto: e => `Un vídeo tuyo perdiendo se hace viral con un montaje humillante. Tres millones de reproducciones en dos días.`,
    opciones: [
      { txt: 'Responder con ironía', sub: 'Reírte tú primero.',
        efecto: e => dado(0.65)
          ? efecto('Tu respuesta se hace más viral que el vídeo. Caes de pie y con gracia.', m(e, { fama: 12, moral: 6 }))
          : efecto('Sale regular. Ahora hay dos vídeos.', m(e, { fama: -6, moral: -8 })) },
      { txt: 'Cerrar las redes y desaparecer', sub: 'Silencio total.',
        efecto: e => efecto('Te borras de todo. Entrenas el doble sin ruido de fondo.', m(e, { poder: 8, estrategia: 4, fama: -8, moral: 5 })) },
      { txt: 'Contestar enfadado uno por uno', sub: 'No te vas a callar.',
        efecto: e => efecto('Discutes con desconocidos hasta las cuatro de la mañana. No sale bien nunca.', m(e, { moral: -12, fama: 3, salud: -4 })) },
    ],
  },
  {
    id: 'huevo', etapas: ['gimnasios', 'liga', 'pro'], peso: 14,
    cond: e => activos(e).length >= 1,
    titulo: 'Un huevo en la guardería',
    texto: () => 'La guardería te llama: uno de tus Pokémon ha dejado un huevo. Tardará meses en eclosionar y hay que cuidarlo.',
    opciones: [
      { txt: 'Criarlo tú mismo', sub: 'Llevarlo a todas partes.',
        efecto: e => { const p = capturaAleatoria(e); if (p) { p.vinculo = 70; p.forma += 4; } return efecto(`Nace ${p?.nombre ?? 'la cría'} y te reconoce como su entrenador desde el primer segundo.`, m(e, { vinculo: 10, poder: 3, salud: -4 })); } },
      { txt: 'Dejarlo en la guardería y recogerlo después', sub: 'No es momento.',
        efecto: e => { const p = capturaAleatoria(e); return efecto(`Meses después recoges a ${p?.nombre ?? 'la cría'}. Sano, fuerte, y algo distante contigo.`, m(e, { poder: 4 })); } },
      { txt: 'Regalarlo a un entrenador novato', sub: 'Que empiece alguien.',
        efecto: e => efecto('El crío al que se lo das no se lo puede creer. Se te queda la cara buena del día.', m(e, { moral: 10, fama: 4 })) },
    ],
  },
  {
    id: 'apuesta_final', etapas: ['liga', 'pro'], peso: 10,
    titulo: 'Doble o nada',
    texto: e => `Un magnate te propone un combate de exhibición: si ganas, ${(300000).toLocaleString('es')} ₽. Si pierdes, pagas tú la mitad de esa cifra.`,
    opciones: [
      { txt: 'Aceptar', sub: 'Confías en tu equipo.',
        efecto: e => dado(0.55)
          ? efecto('Ganas con solvencia. El magnate paga y aplaude.', m(e, { dinero: 300000, fama: 8 }))
          : efecto('Su equipo era mucho mejor de lo anunciado. Pagas y aprendes.', m(e, { dinero: -150000, moral: -8, estrategia: 5 })) },
      { txt: 'Aceptar solo si eliges el terreno', sub: 'Poner condiciones.',
        efecto: e => dado(0.75)
          ? efecto('Combate en tu campo, con tus reglas. Paseo militar.', m(e, { dinero: 300000, fama: 6, estrategia: 5 }))
          : efecto('Ni con ventaja. Ese hombre tiene un equipo de museo.', m(e, { dinero: -150000, moral: -5 })) },
      { txt: 'Rechazar', sub: 'No juegas a esto.',
        efecto: e => efecto('Dices que no. La federación, que estaba mirando, toma nota.', m(e, { fama: 3, moral: 3 })) },
    ],
  },
];

// Selecciona un evento válido para el estado actual
export function siguienteEvento(estado) {
  const etapa = estado.flags.etapaActual;
  const pool = EVENTOS.filter(ev =>
    ev.etapas.includes(etapa) &&
    !(ev.unico && estado.vistos.has(ev.id)) &&
    (!ev.cond || ev.cond(estado)));
  if (!pool.length) return null;
  const total = pool.reduce((s, ev) => s + ev.peso, 0);
  let r = Math.random() * total;
  let elegido = pool[pool.length - 1];
  for (const ev of pool) { r -= ev.peso; if (r <= 0) { elegido = ev; break; } }
  estado.vistos.add(elegido.id);
  return elegido;
}
