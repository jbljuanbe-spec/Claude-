// Catálogo de decisiones.
// Cada opción puede llevar `riesgo` (probabilidad de que salga bien, 0-1).
// efecto(e, ok) recibe si el dado salió a favor. Sin `riesgo`, la opción es segura.
import {
  azar, entero, dado, elegir, limitar, rango, capturaAleatoria, fichar, hito,
  poderPokemon, darObjeto, objetoAleatorio, tieneObjeto, subirTecho, mudarse,
  profesorDe, campeonDe, villanoDe, liderDe,
} from './motor.js?v=6';
import { LINEAS, POROBJETO, REGIONES } from './datos.js?v=6';

// Aplica cambios. Los valores pueden ser un número o un rango [min, max].
function m(e, deltas) {
  const partes = [];
  const ETIQ = { poder: 'Poder', estrategia: 'Estrategia', vinculo: 'Vínculo', fama: 'Fama', salud: 'Salud', moral: 'Moral', media: 'Media' };
  for (const [k, def] of Object.entries(deltas)) {
    const v = Array.isArray(def) ? rango(def[0], def[1]) : def;
    if (!v) continue;
    if (k === 'dinero') { e.dinero = Math.max(0, e.dinero + v); partes.push(`${v > 0 ? '+' : ''}${v.toLocaleString('es')} ₽`); continue; }
    if (k === 'media') { e.media = limitar(Math.min(e.techo, e.media + v)); partes.push(`${v > 0 ? '+' : ''}${v} Media`); continue; }
    if (k === 'techo') { subirTecho(e, v); partes.push(`${v > 0 ? '+' : ''}${v} Techo`); continue; }
    e.stats[k] = limitar(e.stats[k] + v);
    partes.push(`${v > 0 ? '+' : ''}${v} ${ETIQ[k] ?? k}`);
  }
  return partes.join(' · ');
}

const socioReal = e => e.equipo.find(p => p.uid === e.socio && !p.retirado);
const socioDe = e => socioReal(e) ?? e.equipo.find(p => !p.retirado);
const activos = e => e.equipo.filter(p => !p.retirado);
const masFuerte = e => activos(e).slice().sort((a, b) => poderPokemon(b) - poderPokemon(a))[0];
const efecto = (txt, res) => (res ? `${txt}\n\n▸ ${res}` : txt);
const objeto = (e, id) => { const o = darObjeto(e, id); return o ? `Consigues ${o.nombre}.` : ''; };

// Mueve el nivel de todo el equipo (grabar contenido desentrena, un campus intensivo sube)
function nivelEquipo(e, delta) {
  const eq = activos(e);
  for (const p of eq) p.nivel = Math.max(1, Math.min(100, p.nivel + delta));
  return eq.length ? `${delta > 0 ? '+' : ''}${delta} de nivel a todo el equipo.` : '';
}

function lesionar(e, p) {
  if (!p) return '';
  p.lesionado = true; e.flags.lesionado = true;
  return `${p.nombre} queda tocado.`;
}

const TODAS = ['novato', 'gimnasios', 'liga', 'pro', 'cima', 'veterano'];

export const EVENTOS = [
  // ── NOVATO ─────────────────────────────────────────────────────────────────
  {
    id: 'primer_dia', etapas: ['novato'], peso: 30, unico: true, cond: e => !!socioDe(e),
    titulo: 'El primer día',
    texto: e => `${profesorDe(e.region).replace(/^el |^la /, '').replace(/^./, c => c.toUpperCase())} te espera en la puerta del laboratorio con ${socioDe(e).nombre} y una decisión.`,
    opciones: [
      { txt: 'Cinco Poké Balls', sub: 'Empieza a construir equipo ya.', icono: 'poke',
        efecto: e => { const p = capturaAleatoria(e); return efecto(`Atrapas a ${p?.nombre ?? 'un Rattata'} en la primera ruta.`, m(e, { media: [1, 3] })); } },
      { txt: 'Una Pokédex', sub: 'Conocimiento antes que fuerza.',
        efecto: e => efecto('Te pasas las noches leyendo tipos y debilidades.', m(e, { estrategia: [7, 12], techo: [1, 3] })) },
      { txt: 'El Multiexp de repuesto', sub: 'Que crezcan todos a la vez.', icono: 'exp-share',
        efecto: e => efecto(`Te lo guardas en la mochila sin saber lo que vale. ${objeto(e, 'multiexp')}`, m(e, { vinculo: [4, 9] })) },
    ],
  },
  {
    id: 'ruta_bosque', etapas: ['novato', 'gimnasios'], peso: 18,
    titulo: 'Noche en el bosque',
    texto: () => 'Seis horas caminando. Se hace de noche y oyes algo grande entre los árboles.',
    opciones: [
      { txt: 'Investigar', sub: 'Podría ser una captura rara.', riesgo: 0.55,
        efecto: (e, ok) => ok
          ? efecto(`Es un ${capturaAleatoria(e, { rarezaMin: 'raro' })?.nombre ?? 'ejemplar raro'} y logras capturarlo.`, m(e, { fama: [2, 6] }))
          : efecto('Era una manada de Ursaring. Corres. Corres mucho.', m(e, { salud: [-11, -5], moral: [-6, -2] })) },
      { txt: 'Acampar y dormir', sub: 'Descansar también entrena.',
        efecto: e => efecto('Duermes ocho horas seguidas por primera vez en semanas.', m(e, { salud: [6, 11], moral: [4, 9] })) },
      { txt: 'Entrenar toda la noche', sub: 'El miedo se combate a golpes.', riesgo: 0.7,
        efecto: (e, ok) => ok
          ? efecto('Entrenas hasta el amanecer. Notas el salto al día siguiente.', m(e, { media: [2, 4], salud: [-7, -3] }))
          : efecto(`Te pasas de vueltas. ${lesionar(e, elegir(activos(e)))}`, m(e, { salud: [-14, -8], moral: [-6, -2] })) },
    ],
  },
  {
    id: 'magikarp', etapas: ['novato', 'gimnasios'], peso: 14, unico: true,
    cond: e => !e.equipo.some(p => p.linea === 'magikarp'),
    titulo: 'El vendedor del puente',
    texto: e => `Un tipo con bigote te ofrece un Magikarp por 2.500 ₽. "Es una inversión", dice. Tienes ${e.dinero.toLocaleString('es')} ₽.`,
    opciones: [
      { txt: 'Comprarlo', sub: 'Ya sabes en qué evoluciona.', cond: e => e.dinero >= 2500,
        efecto: e => { fichar(e, 'magikarp'); return efecto('Te llevas el pez más inútil del mundo. De momento.', m(e, { dinero: -2500 })); } },
      { txt: 'Regatear duro', sub: 'Puede salir mal.', riesgo: 0.5,
        efecto: (e, ok) => ok
          ? (fichar(e, 'magikarp'), efecto('Lo dejas en 800 ₽ y el hombre se va refunfuñando.', m(e, { dinero: -800, estrategia: [2, 5] })))
          : efecto('El vendedor se ofende y se marcha. Adiós Gyarados.', m(e, { moral: [-5, -1] })) },
      { txt: 'Pasar de largo', sub: 'Es una estafa evidente.',
        efecto: e => efecto('Meses después ves a otro entrenador con un Gyarados enorme.', m(e, { estrategia: [1, 4] })) },
    ],
  },
  {
    id: 'primer_gym', etapas: ['novato', 'gimnasios'], peso: 20, cond: e => !!socioDe(e),
    titulo: 'Muro en el gimnasio',
    texto: e => `Tercer intento contra ${liderDe(e.region).nombre}. ${socioDe(e).nombre} está agotado y el público murmura.`,
    opciones: [
      { txt: 'Insistir hoy mismo', sub: 'Ahora o nunca.', riesgo: 0.45,
        efecto: (e, ok) => ok
          ? efecto('Ganas por los pelos con el último Pokémon en pie. El gimnasio se levanta.', m(e, { fama: [4, 9], moral: [7, 14], media: [1, 3] }))
          : efecto(`Pierdes otra vez. ${lesionar(e, socioDe(e))}`, m(e, { moral: [-13, -7], fama: [-5, -1] })) },
      { txt: 'Entrenar un mes y volver', sub: 'Volver mejor.',
        efecto: e => efecto('Un mes de trabajo silencioso. Vuelves y ganas sin despeinarte.', m(e, { media: [2, 4], estrategia: [2, 6] })) },
      { txt: 'Estudiar sus combates', sub: 'Buscar el patrón.', riesgo: 0.8,
        efecto: (e, ok) => ok
          ? efecto('Encuentras el fallo: siempre abre igual. Lo destrozas en tres turnos.', m(e, { estrategia: [8, 13], fama: [2, 6] }))
          : efecto('No hay patrón. Pierdes el mes y el combate.', m(e, { moral: [-7, -3] })) },
    ],
  },
  {
    id: 'huerto', etapas: ['novato', 'gimnasios', 'liga'], peso: 15, unico: true,
    cond: e => !tieneObjeto(e, 'aranja'),
    titulo: 'El huerto abandonado',
    texto: () => 'Detrás de un Centro Pokémon hay un huerto de Bayas Aranja que nadie cuida desde hace años. La dueña te lo cede si te ocupas.',
    opciones: [
      { txt: 'Montar el huerto', sub: 'Trabajo constante, comida todo el año.', icono: 'oran',
        efecto: e => efecto(`Pasas un año plantando y podando. ${objeto(e, 'aranja')} Tus Pokémon comen mejor que nadie.`, m(e, { salud: [4, 9], vinculo: [3, 7], media: [-1, 0] })) },
      { txt: 'Coger las bayas y seguir', sub: 'No tienes tiempo para esto.', icono: 'sitrus',
        efecto: e => efecto(`Llenas la mochila y sigues camino. ${objeto(e, 'zidra')}`, m(e, { salud: [2, 5] })) },
      { txt: 'Venderlo todo a un vivero', sub: 'Dinero rápido.',
        efecto: e => efecto('El vivero paga bien por las semillas. La señora no te vuelve a saludar.', m(e, { dinero: [18000, 45000], moral: [-4, -1] })) },
    ],
  },
  {
    id: 'apodo', etapas: ['novato', 'gimnasios'], peso: 10, unico: true,
    titulo: 'La prensa local',
    texto: e => `${elegir(['Rafa Pokémon', 'la revista Poké-Semanal', 'Radio ' + e.regionNombre])} quiere tu primera entrevista.`,
    opciones: [
      { txt: 'Prometer que serás Campeón', sub: 'Titular garantizado.', riesgo: 0.6,
        efecto: (e, ok) => { e.flags.bocazas = true; return ok
          ? efecto('"EL CHAVAL QUE VA A GANARLO TODO". La región entera te conoce en una semana.', m(e, { fama: [10, 18], moral: [3, 8] }))
          : efecto('El titular sale en clave de burla. Ahora eres el chiste del circuito.', m(e, { fama: [3, 7], moral: [-11, -5] })); } },
      { txt: 'Hablar de tus Pokémon', sub: 'Humildad.',
        efecto: e => efecto('El artículo sale pequeño, pero tus Pokémon salen en la foto. Ellos lo notan.', m(e, { vinculo: [6, 11], fama: [1, 5] })) },
      { txt: 'Rechazarla y entrenar', sub: 'A lo tuyo.',
        efecto: e => efecto('Ese día lo dedicas al campo de entrenamiento. Nadie escribe sobre ti.', m(e, { media: [1, 3] })) },
    ],
  },

  // ── GIMNASIOS / LIGA ───────────────────────────────────────────────────────
  {
    id: 'rival_reta', etapas: ['gimnasios', 'liga', 'pro'], peso: 22,
    cond: e => e.rival.activo && activos(e).length >= 2,
    titulo: e => `${e.rival.nombre} te corta el paso`,
    texto: e => `"Uno contra uno. Si pierdes, me das a tu ${masFuerte(e).nombre}." ${e.rival.nombre} lleva todo el año siguiéndote la pista.`,
    opciones: [
      { txt: 'Aceptar la apuesta', sub: 'Alto riesgo, alto premio.', riesgo: 0.5,
        efecto: (e, ok) => {
          const mio = masFuerte(e);
          if (ok) { e.rival.derrotasTuyas++; const p = capturaAleatoria(e, { rarezaMin: 'raro' });
            return efecto(`${mio.nombre} lo barre. ${e.rival.nombre} cumple y te entrega su ${p?.nombre ?? 'orgullo'}.`, m(e, { fama: [5, 11], moral: [8, 15] })); }
          mio.retirado = true; e.rival.victoriasSuyas++;
          return efecto(`Pierdes. Entregas a ${mio.nombre} sin mirarle a los ojos.`, m(e, { moral: [-22, -12], vinculo: [-11, -5] }));
        } },
      { txt: 'Combatir sin apostar', sub: 'Orgullo, no cromos.', riesgo: 0.6,
        efecto: (e, ok) => ok
          ? (e.rival.derrotasTuyas++, efecto(`Ganas limpio. ${e.rival.nombre} escupe al suelo y se va.`, m(e, { fama: [3, 7], moral: [5, 11] })))
          : (e.rival.victoriasSuyas++, efecto('Pierdes, pero sales entero y aprendes de cada turno.', m(e, { estrategia: [4, 8], moral: [-6, -2] }))) },
      { txt: 'Ignorarle', sub: 'No es tu problema.',
        efecto: e => efecto(`${e.rival.nombre} grita algo a tu espalda. Tú ya piensas en el combate de verdad.`, m(e, { estrategia: [2, 6], fama: [-3, -1] })) },
    ],
  },
  {
    id: 'vitaminas', etapas: ['gimnasios', 'liga', 'pro', 'cima'], peso: 16, unico: true,
    titulo: 'El preparador con demasiada sonrisa',
    texto: () => 'Te ofrece "potenciadores experimentales". No están en la lista de permitidos. Nadie lo sabría. Casi nadie.',
    opciones: [
      { txt: 'Usarlos', sub: 'Todos lo hacen, dice.', icono: 'life-orb', riesgo: 0.6,
        efecto: (e, ok) => { e.flags.dopaje = true;
          if (ok) return efecto('Vuelas media temporada y nadie sospecha. Duermes mal, pero ganas.', m(e, { media: [4, 9], salud: [-12, -5], vinculo: [-9, -3] }));
          e.flags.sancionado = true; e.flags.sancionadoAños = 2; e.flags.exsancionado = true;
          return efecto('Llega el control antidopaje. Dos años fuera y tu nombre por el barro.', m(e, { media: [2, 5], fama: [-34, -22], moral: [-24, -14] })); } },
      { txt: 'Rechazarlos y denunciarlo', sub: 'Hay una línea.', riesgo: 0.75,
        efecto: (e, ok) => { e.flags.heroe = true; return ok
          ? efecto('La federación abre expediente y caen media docena de entrenadores.', m(e, { fama: [8, 15], moral: [5, 11], estrategia: [1, 4] }))
          : efecto('Nadie te cree y el preparador sigue trabajando. Te ganas enemigos por nada.', m(e, { fama: [-6, -2], moral: [-5, -1] })); } },
      { txt: 'Decir que no y callarte', sub: 'Ni sí, ni escándalo.',
        efecto: e => efecto('Sigues a lo tuyo. Meses después sancionan al preparador igualmente.', m(e, { moral: [2, 6], vinculo: [2, 6] })) },
    ],
  },
  {
    id: 'lesion_socio', etapas: ['gimnasios', 'liga', 'pro', 'cima'], peso: 18, cond: e => !!socioDe(e),
    titulo: 'El diagnóstico',
    texto: e => `${socioDe(e).nombre} cae en pleno combate. En el Centro Pokémon son claros: puede seguir, pero forzarlo tiene riesgo.`,
    opciones: [
      { txt: 'Retirarlo la temporada', sub: 'Su salud primero.',
        efecto: e => { const s = socioDe(e); s.vinculo = limitar(s.vinculo + rango(10, 20));
          return efecto('Lo apartas. Compites peor sin él, pero vuelve entero.', m(e, { media: [-4, -1], vinculo: [8, 15], moral: [2, 6] })); } },
      { txt: 'Analgésicos y a jugar', sub: 'Queda media temporada.', icono: 'hyper-potion', riesgo: 0.5,
        efecto: (e, ok) => { const s = socioDe(e);
          if (ok) return efecto(`Aguanta de sobra y ganáis. El susto queda en nada y vuelve más fuerte.`, m(e, { fama: [5, 11], media: [1, 3] }));
          s.forma -= rango(4, 9); e.flags.lesionCronica = true;
          return efecto(`Se rompe del todo. ${s.nombre} ya nunca vuelve a correr igual.`, m(e, { vinculo: [-14, -7], salud: [-9, -3], media: [-3, -1] })); } },
      { txt: 'Rotar y dar minutos al banquillo', sub: 'Confiar en el resto.',
        efecto: e => { for (const p of activos(e)) p.vinculo = limitar(p.vinculo + rango(3, 9));
          return efecto('El equipo entero da un paso adelante. No dependías de uno solo.', m(e, { estrategia: [5, 10], vinculo: [4, 9] })); } },
    ],
  },
  {
    id: 'villano', etapas: ['gimnasios', 'liga', 'pro'], peso: 15, unico: true,
    titulo: e => `${villanoDe(e.region).equipo.replace(/^el |^la /, '').replace(/^./, c => c.toUpperCase())} en el puerto`,
    texto: e => { const v = villanoDe(e.region);
      return `Descubres a ${v.equipo} robando Pokémon en el puerto de ${e.regionNombre}. ${v.nombre} en persona supervisa la operación.`; },
    opciones: [
      { txt: 'Entrar tú solo', sub: 'No hay tiempo.', riesgo: 0.55,
        efecto: (e, ok) => { const v = villanoDe(e.region);
          if (ok) { e.flags.heroe = true; hito(e, '🦸', `Frenó a ${v.nombre} en el puerto`);
            const p = capturaAleatoria(e, { rarezaMin: 'raro' });
            return efecto(`Los detienes. Uno de los liberados, un ${p?.nombre ?? 'superviviente'}, no se separa de ti.`, m(e, { fama: [14, 24], moral: [8, 16], salud: [-11, -4] })); }
          return efecto(`Los hombres de ${v.nombre} te dan una paliza. Tres semanas en el hospital.`, m(e, { salud: [-26, -16], moral: [-13, -6] })); } },
      { txt: 'Llamar a la Agente Mara', sub: 'Lo correcto y lo aburrido.',
        efecto: e => { e.flags.heroe = true; return efecto('La redada es un éxito. Sales en las noticias como "testigo".', m(e, { fama: [4, 10], moral: [3, 8] })); } },
      { txt: 'Aceptar su dinero por callarte', sub: 'Nadie te paga la carrera.',
        efecto: e => { e.flags.traicion = true; return efecto('Un maletín y una noche sin dormir. La carrera se financia sola desde hoy.', m(e, { dinero: [180000, 320000], moral: [-20, -12], fama: [-6, -1] })); } },
    ],
  },
  {
    id: 'mercader', etapas: ['gimnasios', 'liga', 'pro', 'cima'], peso: 16,
    titulo: 'El mercader del mercadillo',
    texto: e => `Un puesto lleno de objetos de entrenamiento en el mercadillo de ${e.regionNombre}. Llevas ${e.dinero.toLocaleString('es')} ₽.`,
    opciones: [
      { txt: 'Comprar lo mejor que tenga', sub: 'Caro, pero de verdad.', icono: 'choice-band',
        cond: e => e.dinero >= 40000,
        efecto: e => { const o = objetoAleatorio(e); return efecto(`Te llevas ${o?.nombre ?? 'un cacharro inútil'}. ${o?.desc ?? ''}`, m(e, { dinero: -rango(30000, 60000) })); } },
      { txt: 'Regatear por un lote', sub: 'A ver qué sale.', riesgo: 0.55,
        efecto: (e, ok) => { if (ok) { const a = objetoAleatorio(e), b = objetoAleatorio(e);
            return efecto(`Sacas dos: ${[a?.nombre, b?.nombre].filter(Boolean).join(' y ')}.`, m(e, { dinero: -rango(10000, 25000), estrategia: [1, 4] })); }
          return efecto('El lote era basura de imitación. Tiras el dinero.', m(e, { dinero: -rango(8000, 20000), moral: [-5, -1] })); } },
      { txt: 'No comprar nada', sub: 'Guardas el dinero.',
        efecto: e => efecto('Sales del mercadillo con la cartera intacta y algo de dignidad.', m(e, { moral: [1, 3] })) },
    ],
  },
  {
    id: 'profesor_beca', etapas: ['gimnasios', 'liga', 'pro'], peso: 14, unico: true,
    titulo: e => `Te llama ${profesorDe(e.region)}`,
    texto: e => `${profesorDe(e.region).replace(/^el |^la /, '').replace(/^./, c => c.toUpperCase())} quiere que participes en un programa de entrenamiento experimental. Un año entero de laboratorio y campo.`,
    opciones: [
      { txt: 'Entrar en el programa', sub: 'Un año sin competir.', riesgo: 0.7,
        efecto: (e, ok) => ok
          ? efecto('Sales del programa con métodos que nadie más conoce. Tu techo ya no es el de antes.', m(e, { techo: [4, 9], estrategia: [5, 10], fama: [-6, -2] }))
          : efecto('El programa se cancela a mitad por falta de fondos. Pierdes el año.', m(e, { fama: [-9, -4], moral: [-7, -3], estrategia: [1, 3] })) },
      { txt: 'Colaborar los fines de semana', sub: 'Sin dejar el circuito.',
        efecto: e => efecto('Compaginas laboratorio y torneos. Duermes poco pero aprendes.', m(e, { techo: [1, 3], estrategia: [3, 7], salud: [-5, -1] })) },
      { txt: 'Rechazarlo', sub: 'Tú viniste a combatir.',
        efecto: e => efecto('Le dices que no con educación. Se queda con cara de no entender nada.', m(e, { media: [1, 3] })) },
    ],
  },

  // ── REGIÓN Y CARRERA ───────────────────────────────────────────────────────
  {
    id: 'oferta_gimnasio', etapas: ['liga', 'pro', 'cima', 'veterano'], peso: 18,
    cond: e => e.stats.fama >= 30 && !e.flags.liderGimnasio,
    titulo: e => `${liderDe(e.region).nombre} se retira`,
    texto: e => { const l = liderDe(e.region);
      return `El gimnasio de tipo ${l.tipo} de ${e.regionNombre} se queda sin líder y la Liga te ofrece la plaza. Sueldo fijo, casa y dejar de viajar.`; },
    opciones: [
      { txt: 'Aceptar el gimnasio', sub: 'Echar raíces aquí.',
        efecto: e => { e.flags.liderGimnasio = true; hito(e, '🏛️', `Líder de Gimnasio en ${e.regionNombre}`);
          return efecto('Te sientas del otro lado del campo. Ahora los críos vienen a por ti.', m(e, { dinero: [120000, 240000], fama: [7, 14], moral: [5, 12], media: [-3, -1] })); } },
      { txt: 'Rechazar y seguir compitiendo', sub: 'Aún te queda.',
        efecto: e => efecto('Dices que no delante de las cámaras. La presión sube un escalón.', m(e, { media: [1, 4], fama: [3, 8], moral: [-4, -1] })) },
      { txt: 'Pedir el puesto para cuando te retires', sub: 'Firmar el futuro.',
        efecto: e => { e.flags.gimnasioReservado = true;
          return efecto('Acuerdan guardarte la plaza. Compites más tranquilo sabiendo que hay red.', m(e, { moral: [7, 13], estrategia: [2, 5] })); } },
    ],
  },
  {
    id: 'oferta_region', etapas: ['liga', 'pro', 'cima'], peso: 20,
    titulo: 'Oferta desde el extranjero',
    texto: e => { const destino = elegir(REGIONES.filter(r => r.nombre !== e.regionNombre));
      e._destino = destino;
      return `Un circuito de ${destino.nombre} te quiere en su liga. Pagan por el traslado y por el cartel que llevas. Dejarías ${e.regionNombre} y tu público.`; },
    opciones: [
      { txt: 'Mudarte y competir allí', sub: 'Empezar de cero, cobrando.', riesgo: 0.65,
        efecto: (e, ok) => { const d = mudarse(e, e._destino?.nombre);
          hito(e, '✈️', `Se mudó a ${d?.nombre ?? 'otra región'}`);
          if (ok) { const p = capturaAleatoria(e, { rarezaMin: 'raro', region: d?.id });
            return efecto(`${d?.nombre} te adopta rápido. Un ${p?.nombre ?? 'compañero local'} se une al equipo.`, m(e, { dinero: [150000, 400000], media: [2, 5], estrategia: [4, 9], fama: [-9, -3] })); }
          return efecto(`En ${d?.nombre} nadie te conoce y el estilo de combate es otro. Tardas en encontrarte.`, m(e, { dinero: [150000, 400000], fama: [-16, -9], moral: [-10, -4], estrategia: [2, 5] })); } },
      { txt: 'Ir cedido un año', sub: 'Probar sin romper nada.',
        efecto: e => efecto('Un año fuera aprendiendo métodos que aquí nadie ha visto, y de vuelta a casa.', m(e, { estrategia: [7, 13], techo: [1, 4], dinero: [40000, 90000] })) },
      { txt: 'Quedarte', sub: 'Aquí eres alguien.',
        efecto: e => efecto('Te quedas en casa. Tu gente lo agradece cada vez que sales al estadio.', m(e, { fama: [6, 12], moral: [5, 11], vinculo: [2, 6] })) },
    ],
  },
  {
    id: 'exhibicion_campeon', etapas: ['pro', 'cima', 'veterano'], peso: 14,
    cond: e => e.stats.fama >= 45,
    titulo: e => `Exhibición contra ${campeonDe(e.region)}`,
    texto: e => `${campeonDe(e.region)}, campeón de ${e.regionNombre}, acepta un combate de exhibición contigo. Estadio lleno y televisión en directo.`,
    opciones: [
      { txt: 'Ir con todo', sub: 'Ganarle delante de todos.', riesgo: 0.4,
        efecto: (e, ok) => ok
          ? (hito(e, '⭐', `Venció a ${campeonDe(e.region)} en exhibición`),
             efecto(`Le ganas. El estadio no se lo cree y tú tampoco.`, m(e, { fama: [16, 28], moral: [12, 20], media: [2, 5], techo: [1, 4] })))
          : efecto('Te pasa por encima en cuatro turnos. Aprendes más de esa derrota que de diez victorias.', m(e, { estrategia: [6, 11], moral: [-8, -3], fama: [1, 4] })) },
      { txt: 'Combate de estudio', sub: 'Probar cosas, sin presión.',
        efecto: e => efecto('Usas el combate para probar estrategias raras. Pierdes, pero sales con ideas.', m(e, { estrategia: [7, 12], techo: [1, 3] })) },
      { txt: 'Declinar', sub: 'No estás para circos.',
        efecto: e => efecto('Dices que no. La prensa lo interpreta como miedo.', m(e, { fama: [-8, -3], media: [1, 3] })) },
    ],
  },
  {
    id: 'patrocinio', etapas: ['pro', 'cima'], peso: 18, unico: true, cond: e => e.stats.fama >= 35,
    titulo: 'Contrato con Devon Corp.',
    texto: () => 'Un contrato de imagen enorme. La letra pequeña dice que ellos deciden en qué torneos compites.',
    opciones: [
      { txt: 'Firmar', sub: 'Dinero de verdad.', icono: 'amulet-coin',
        efecto: e => { e.flags.patrocinio = true; darObjeto(e, 'amuleto');
          return efecto('Te forras. También compites en torneos irrelevantes en la otra punta del mundo.', m(e, { dinero: [300000, 600000], fama: [8, 16], media: [-4, -1], salud: [-8, -3] })); } },
      { txt: 'Negociar libertad deportiva', sub: 'Menos dinero, tus reglas.', riesgo: 0.6,
        efecto: (e, ok) => ok
          ? (e.flags.patrocinio = true, efecto('Aceptan tus condiciones: cobras la mitad y eliges calendario.', m(e, { dinero: [140000, 260000], fama: [5, 11], estrategia: [2, 6] })))
          : efecto('Se levantan de la mesa y firman con otro, que sale en todos los anuncios.', m(e, { fama: [-8, -3], moral: [-6, -2] })) },
      { txt: 'Montar tu propia escuela', sub: 'Ser tu propio jefe.',
        efecto: e => { e.flags.escuela = true; hito(e, '🏫', 'Fundó su propia escuela de entrenadores');
          return efecto('Abres un centro con tu nombre. Se llena de críos en dos meses.', m(e, { dinero: -rango(60000, 120000), fama: [4, 9], moral: [7, 14], estrategia: [5, 10] })); } },
    ],
  },
  {
    id: 'legendario', etapas: ['pro', 'cima'], peso: 12, unico: true, cond: e => e.stats.fama >= 45,
    titulo: 'La montaña se ha despertado',
    texto: e => `Un fenómeno atmosférico sobre ${e.regionNombre}. En el ojo de la tormenta hay un Pokémon que la mitología daba por leyenda, y tú estás más cerca que nadie.`,
    opciones: [
      { txt: 'Intentar capturarlo', sub: 'La oportunidad de una vida.', icono: 'master', riesgo: 0.45,
        efecto: (e, ok) => { if (ok) { const leg = elegir(LINEAS.filter(l => l.rareza === 'legendario'));
            const p = fichar(e, leg.id); hito(e, '⚡', `Capturó a ${p.nombre}`);
            return efecto(`La bola se queda quieta. ${p.nombre} es tuyo, y el mundo lo sabe en dos horas.`, m(e, { fama: [24, 38], media: [4, 9], techo: [3, 7], salud: [-12, -5] })); }
          return efecto('Tres horas de combate y se marcha volando. Tus Pokémon quedan destrozados.', m(e, { salud: [-22, -12], moral: [-13, -6], fama: [3, 8] })); } },
      { txt: 'Estudiarlo y publicar los datos', sub: 'Ciencia, no captura.',
        efecto: e => { hito(e, '📚', 'Publicó el primer estudio de campo del fenómeno');
          return efecto('Tu informe es material de referencia. Te llaman "el entrenador que pensó".', m(e, { estrategia: [10, 18], techo: [2, 5], fama: [8, 15], dinero: [40000, 80000] })); } },
      { txt: 'Evacuar el pueblo de al lado', sub: 'Hay gente ahí abajo.',
        efecto: e => { e.flags.heroe = true; hito(e, '🦸', 'Evacuó un pueblo entero durante la tormenta');
          return efecto('Sacas a doscientas personas antes de que el valle se inunde. Nadie muere.', m(e, { fama: [15, 26], moral: [14, 22], salud: [-10, -4] })); } },
    ],
  },
  {
    id: 'mega', etapas: ['pro', 'cima'], peso: 13, unico: true, cond: e => activos(e).length >= 1,
    titulo: 'La piedra',
    texto: e => `Un investigador te entrega una Megapiedra compatible con ${masFuerte(e).nombre}. Advierte del estrés brutal que supone.`,
    opciones: [
      { txt: 'Usarla en competición', sub: 'Poder puro.', icono: 'life-orb', riesgo: 0.65,
        efecto: (e, ok) => { const p = masFuerte(e);
          if (ok) { p.forma += rango(6, 12); hito(e, '💎', `Megaevolucionó a ${p.nombre} en directo`);
            return efecto(`${p.nombre} megaevoluciona ante 40.000 personas. El estadio se cae.`, m(e, { media: [3, 7], fama: [12, 20], vinculo: [-7, -2] })); }
          p.forma -= rango(3, 8);
          return efecto(`${p.nombre} no resiste el proceso y se desploma en el campo. Tardas meses en perdonártelo.`, m(e, { vinculo: [-16, -8], moral: [-13, -6], fama: [2, 6] })); } },
      { txt: 'Solo cuando él quiera', sub: 'Preguntar primero.',
        efecto: e => { const p = masFuerte(e); p.vinculo = limitar(p.vinculo + rango(12, 22)); p.forma += rango(3, 7);
          return efecto('Meses trabajando el vínculo antes de usarla. Cuando ocurre, es sincronía perfecta.', m(e, { vinculo: [10, 18], media: [2, 5], fama: [5, 11] })); } },
      { txt: 'Devolverla', sub: 'No a ese precio.',
        efecto: e => efecto('El investigador no lo entiende. Tus Pokémon sí.', m(e, { vinculo: [8, 14], moral: [4, 9] })) },
    ],
  },
  {
    id: 'amaño', etapas: ['pro', 'cima'], peso: 12, unico: true,
    titulo: 'La llamada de las tres de la mañana',
    texto: () => 'Una cifra obscena por perder la semifinal. Dicen que ya han hablado con otros dos.',
    opciones: [
      { txt: 'Aceptar', sub: 'Nadie lo probaría.', riesgo: 0.65,
        efecto: (e, ok) => { e.flags.traicion = true;
          if (ok) return efecto('Pierdes "sin querer". Cobras. Nunca vuelves a dormir del todo bien.', m(e, { dinero: [350000, 650000], moral: [-16, -9], fama: [-6, -1] }));
          e.flags.sancionado = true; e.flags.sancionadoAños = 3; e.flags.exsancionado = true;
          return efecto('Un audio filtrado te hunde seis meses después. Tres años de sanción.', m(e, { dinero: [350000, 650000], fama: [-44, -30], moral: [-28, -18] })); } },
      { txt: 'Grabar la llamada y entregarla', sub: 'Que caigan todos.',
        efecto: e => { e.flags.heroe = true; hito(e, '⚖️', 'Destapó una red de amaños en el circuito');
          return efecto('Cae media directiva. Chivato en los vestuarios, héroe en los periódicos.', m(e, { fama: [11, 19], moral: [4, 9], estrategia: [2, 5] })); } },
      { txt: 'Colgar y ganar la semifinal', sub: 'Silencio y trabajo.', riesgo: 0.7,
        efecto: (e, ok) => ok
          ? efecto('Ganas la semifinal por goleada. Esa es tu respuesta.', m(e, { media: [2, 5], moral: [8, 14], fama: [4, 9] }))
          : efecto('Pierdes igual, limpiamente. Al menos puedes mirarte al espejo.', m(e, { moral: [-6, -2], vinculo: [3, 7] })) },
    ],
  },
  {
    id: 'agotamiento', etapas: ['pro', 'cima', 'veterano'], peso: 16,
    cond: e => e.stats.salud < 62 || e.stats.moral < 52,
    titulo: 'No puedes más',
    texto: () => 'Llevas años sin parar. Una mañana no consigues levantarte de la cama y no sabes por qué.',
    opciones: [
      { txt: 'Parar una temporada', sub: 'Desaparecer.',
        efecto: e => efecto('Un año en el campo, sin cámaras, con tus Pokémon. Vuelves siendo otro.', m(e, { salud: [18, 30], moral: [18, 30], fama: [-17, -9], media: [-4, -1] })) },
      { txt: 'Apretar los dientes', sub: 'Los grandes no paran.', riesgo: 0.45,
        efecto: (e, ok) => ok
          ? efecto('Aguantas el tirón y sales del pozo compitiendo. No sabes ni cómo.', m(e, { media: [2, 5], fama: [4, 9], salud: [-8, -3] }))
          : efecto('Te rompes por dentro en mitad de la temporada. Todo se cae a la vez.', m(e, { salud: [-16, -9], moral: [-16, -9], media: [-4, -1] })) },
      { txt: 'Buscar ayuda profesional', sub: 'Hablarlo con alguien.', icono: 'shell-bell',
        efecto: e => efecto('Terapia, descanso pautado, calendario reducido. Funciona mejor de lo que esperabas.', m(e, { salud: [10, 18], moral: [14, 24], estrategia: [3, 7] })) },
    ],
  },
  {
    id: 'entrenamiento', etapas: TODAS, peso: 20, cond: e => activos(e).length >= 1,
    titulo: 'Pretemporada',
    texto: () => 'Seis semanas antes de que empiece todo. Toca decidir cómo se prepara el equipo.',
    opciones: [
      { txt: 'Carga brutal en la montaña', sub: 'Sin excusas.', icono: 'muscle-band', riesgo: 0.72,
        efecto: (e, ok) => ok
          ? efecto('Salís de allí en otro nivel. El cuerpo aguantó.', m(e, { media: [3, 7], techo: [0, 2], salud: [-8, -3] }))
          : efecto(`Te pasas de carga. ${lesionar(e, elegir(activos(e)))}`, m(e, { salud: [-15, -8], media: [-2, 0], moral: [-6, -2] })) },
      { txt: 'Trabajo táctico y vídeo', sub: 'Estudiar al rival.', icono: 'expert-belt',
        efecto: e => efecto('Analizáis 200 combates. Llegáis sabiendo lo que va a hacer todo el mundo.', m(e, { estrategia: [8, 14], media: [1, 3] })) },
      { txt: 'Convivencia y descanso', sub: 'Estar bien también entrena.', icono: 'leftovers',
        efecto: e => { for (const p of activos(e)) p.vinculo = limitar(p.vinculo + rango(5, 11));
          return efecto('Playa, juegos, comida buena. Llegáis frescos y unidos.', m(e, { vinculo: [8, 14], salud: [7, 13], moral: [7, 13] })); } },
    ],
  },
  {
    id: 'redes', etapas: ['gimnasios', 'liga', 'pro', 'cima'], peso: 14,
    titulo: 'Te están destrozando en internet',
    texto: () => 'Un vídeo tuyo perdiendo se hace viral con un montaje humillante. Tres millones de reproducciones en dos días.',
    opciones: [
      { txt: 'Responder con ironía', sub: 'Reírte tú primero.', riesgo: 0.65,
        efecto: (e, ok) => ok
          ? efecto('Tu respuesta se hace más viral que el vídeo. Caes de pie y con gracia.', m(e, { fama: [9, 16], moral: [4, 9] }))
          : efecto('Sale regular. Ahora hay dos vídeos.', m(e, { fama: [-8, -3], moral: [-11, -5] })) },
      { txt: 'Cerrar las redes', sub: 'Silencio total.',
        efecto: e => efecto('Te borras de todo y entrenas el doble sin ruido de fondo.', m(e, { media: [2, 5], estrategia: [2, 6], fama: [-10, -4], moral: [3, 8] })) },
      { txt: 'Contestar uno por uno', sub: 'No te vas a callar.',
        efecto: e => efecto('Discutes con desconocidos hasta las cuatro de la mañana. Nunca sale bien.', m(e, { moral: [-14, -7], fama: [1, 5], salud: [-6, -1] })) },
    ],
  },
  {
    id: 'huevo', etapas: ['gimnasios', 'liga', 'pro'], peso: 14, cond: e => activos(e).length >= 1,
    titulo: 'Un huevo en la guardería',
    texto: () => 'La guardería llama: uno de tus Pokémon ha dejado un huevo. Tardará meses y hay que cuidarlo.',
    opciones: [
      { txt: 'Criarlo tú mismo', sub: 'Llevarlo a todas partes.', icono: 'lucky-egg',
        efecto: e => { const p = capturaAleatoria(e); if (p) { p.vinculo = rango(66, 80); p.forma += rango(2, 6); }
          return efecto(`Nace ${p?.nombre ?? 'la cría'} y te reconoce desde el primer segundo.`, m(e, { vinculo: [8, 14], media: [1, 3], salud: [-5, -1] })); } },
      { txt: 'Dejarlo en la guardería', sub: 'No es momento.',
        efecto: e => { const p = capturaAleatoria(e);
          return efecto(`Meses después recoges a ${p?.nombre ?? 'la cría'}: sano, fuerte y algo distante contigo.`, m(e, { media: [1, 4] })); } },
      { txt: 'Regalarlo a un novato', sub: 'Que empiece alguien.',
        efecto: e => efecto('El crío no se lo puede creer. Se te queda la cara buena del día.', m(e, { moral: [7, 13], fama: [2, 6] })) },
    ],
  },

  // ── VETERANO / CIERRE ──────────────────────────────────────────────────────
  {
    id: 'retiro_socio', etapas: ['cima', 'veterano'], peso: 20, unico: true,
    cond: e => !!socioReal(e) && e.año >= 10 && activos(e).length >= 2,
    titulo: e => `${socioReal(e).nombre} ya no llega`,
    texto: e => `Lleva ${e.año} años contigo, desde el primer día. Ya no llega a los movimientos rápidos y lo sabe. Sigue pidiendo salir.`,
    opciones: [
      { txt: 'Retirarlo con honores', sub: 'Ceremonia en el estadio.',
        efecto: e => { const s = socioReal(e); s.retirado = true; hito(e, '🎗️', `Retirada de ${s.nombre}, su primer compañero`);
          return efecto(`El estadio de pie durante ocho minutos. ${s.nombre} se va a la pradera de tu casa.`, m(e, { fama: [7, 14], moral: [9, 16], media: [-4, -1] })); } },
      { txt: 'Un último torneo juntos', sub: 'Una vez más.', riesgo: 0.5,
        efecto: (e, ok) => { const s = socioReal(e); s.retirado = true;
          if (ok) { hito(e, '🌅', `Último título con ${s.nombre}`);
            return efecto('Gana el torneo y se retira esa noche, invicto en su despedida.', m(e, { fama: [14, 24], moral: [16, 26] })); }
          return efecto(`Cae en cuartos, agotado. Te mira pidiendo perdón y le abrazas delante de todos.`, m(e, { moral: [-8, -2], vinculo: [8, 15], fama: [3, 8] })); } },
      { txt: 'Seguir alineándolo', sub: 'Aún puede.',
        efecto: e => { const s = socioReal(e); s.forma -= rango(8, 16);
          return efecto('Le exiges lo que ya no tiene. Los resultados caen y la gente lo comenta.', m(e, { media: [-6, -2], vinculo: [-16, -9], fama: [-8, -3] })); } },
    ],
  },
  {
    id: 'discipulo', etapas: ['cima', 'veterano'], peso: 15,
    titulo: 'El crío del gimnasio',
    texto: () => 'Un chaval de once años te espera cada mañana en la puerta con un Pokémon flacucho. Quiere que le entrenes.',
    opciones: [
      { txt: 'Aceptarlo como discípulo', sub: 'Devolver lo recibido.',
        efecto: e => { e.flags.discipulo = true; hito(e, '🌱', 'Formó a la siguiente generación');
          return efecto('Le enseñas todo. Años después gana la Liga y te da las gracias en directo.', m(e, { moral: [12, 20], fama: [7, 13], estrategia: [4, 9], media: [-3, -1] })); } },
      { txt: 'Un consejo y seguir', sub: 'No tienes tiempo.',
        efecto: e => efecto('Le dices tres cosas útiles y te vas. Se queda mirando la libreta donde las apuntó.', m(e, { moral: [1, 5] })) },
      { txt: 'Cobrarle como alumno', sub: 'Esto es un negocio.',
        efecto: e => efecto('Montas una escuela con lista de espera. Ganas dinero y pierdes algo difícil de nombrar.', m(e, { dinero: [110000, 220000], moral: [-8, -3], fama: [2, 6] })) },
    ],
  },
  {
    id: 'ultima_final', etapas: ['veterano'], peso: 22, cond: e => e.edad >= 29,
    titulo: 'La última bala',
    texto: e => `${e.edad} años. El cuerpo pide parar, pero hay una plaza en la final de ${e.liga} y estás a un combate.`,
    opciones: [
      { txt: 'Vaciarte del todo', sub: 'Si se rompe, que se rompa.', riesgo: 0.45,
        efecto: (e, ok) => { if (ok) { e.titulos.push({ año: e.año, nombre: `${e.liga} (última final)` }); e.ligasGanadas++;
            hito(e, '👑', 'Ganó su última final');
            return efecto('Ganas. A los treinta y tantos, contra todo pronóstico. La grada llora.', m(e, { fama: [20, 32], moral: [20, 30], salud: [-24, -14] })); }
          return efecto('Pierdes en el quinto combate, sin fuerzas. Te aplauden igual, y eso duele más.', m(e, { salud: [-22, -12], moral: [-11, -5], fama: [3, 8] })); } },
      { txt: 'Competir sin forzar', sub: 'Cuidarte.',
        efecto: e => efecto('Gestionas el esfuerzo como un veterano. Caes en semis pero sales entero.', m(e, { estrategia: [6, 11], salud: [-5, -1], fama: [2, 6] })) },
      { txt: 'Retirarte ahora, en lo alto', sub: 'Tú decides cuándo.',
        efecto: e => { e.flags.retiroElegido = true; hito(e, '🎬', 'Se retiró en la cima, por decisión propia');
          return efecto('Anuncias la retirada en rueda de prensa. Sin lesiones, sin declive público.', m(e, { fama: [12, 20], moral: [16, 26] })); } },
    ],
  },

  // ── COMUNIDAD COMPETITIVA ──────────────────────────────────────────────────
  // Guiños a la escena VGC española. Todo es ficción y cariño: los nombres
  // aparecen como cameos amables, nunca haciendo nada reprochable.
  {
    id: 'sekiam_dieta', etapas: ['liga', 'pro', 'cima'], peso: 15, unico: true,
    titulo: 'Sekiam te habla de la dieta',
    texto: () => 'Coincidís en la sala de espera de un regional. Sekiam lleva un táper y una teoría: que se rinde mejor comiendo distinto, que él lleva un año probándolo y que a ver si te atreves.',
    opciones: [
      { txt: 'Hacerte vegano un año', sub: 'Probar en serio, sin trampas.', icono: 'oran', riesgo: 0.6,
        efecto: (e, ok) => ok
          ? efecto('Legumbres, planificación y cero resacas de torneo. Llegas a las finales con la cabeza mucho más despejada.', m(e, { salud: [8, 15], media: [2, 5], moral: [3, 8] }))
          : efecto('Lo llevas fatal: te faltan fuerzas en las rondas largas y acabas dejándolo en marzo.', m(e, { media: [-4, -1], salud: [-8, -3], moral: [-6, -2] })) },
      { txt: 'Copiarle solo lo del descanso', sub: 'Quedarte con lo fácil.',
        efecto: e => efecto('Te llevas la parte de dormir ocho horas y cenar pronto. Menos épico, pero funciona.', m(e, { salud: [4, 9], estrategia: [1, 4] })) },
      { txt: 'Reírte y pedir un kebab', sub: 'Cada uno a lo suyo.',
        efecto: e => efecto('Cenáis juntos igual y os reís mucho. Al año siguiente él sigue con el táper y tú con el kebab.', m(e, { moral: [4, 9], salud: [-4, -1] })) },
    ],
  },
  {
    id: 'kasty_manifiesto', etapas: ['pro', 'cima', 'veterano'], peso: 14, unico: true,
    cond: e => e.stats.fama >= 30,
    titulo: 'Kasty pasa el manifiesto',
    texto: () => 'Los jugadores están hartos: viajes pagados de su bolsillo, premios que no compensan y un calendario decidido sin preguntar a nadie. Kasty ha escrito un manifiesto pidiendo cambios a la organización del circuito y quiere tu firma.',
    opciones: [
      { txt: 'Firmar y dar la cara', sub: 'Que se te vea en la foto.', riesgo: 0.55,
        efecto: (e, ok) => { e.flags.sindicalista = true;
          if (ok) { hito(e, '✊', 'Firmó el manifiesto que cambió el circuito');
            return efecto('El manifiesto se hace enorme y la organización cede en la mitad de los puntos. Los jugadores no lo olvidan.', m(e, { fama: [12, 22], moral: [10, 18] })); }
          return efecto('La organización no mueve un dedo y de repente tu nombre aparece menos en las invitaciones.', m(e, { fama: [-9, -3], moral: [-9, -4], dinero: -rango(15000, 40000) })); } },
      { txt: 'Firmar sin publicarlo', sub: 'Apoyo sí, foto no.',
        efecto: e => efecto('Tu firma está ahí, pero no sales en ningún vídeo. Kasty te lo agradece igual.', m(e, { moral: [3, 8], fama: [1, 3] })) },
      { txt: 'No firmar', sub: 'Tú a competir.',
        efecto: e => efecto('Prefieres no meterte. Algunos compañeros tardan meses en volver a hablarte del tema.', m(e, { moral: [-6, -2], estrategia: [1, 4] })) },
    ],
  },
  {
    id: 'retuit', etapas: ['liga', 'pro', 'cima'], peso: 13, unico: true,
    titulo: 'El retuit del mono bomba',
    texto: () => 'Son las dos de la mañana y le das retuit al meme del mono bomba que ha subido LeN. A la mañana siguiente el comité de conducta te ha abierto expediente por "difundir contenido inapropiado". Por un meme.',
    opciones: [
      { txt: 'Defenderte en el expediente', sub: 'Es un meme, señores.', riesgo: 0.2,
        efecto: (e, ok) => ok
          ? efecto('Contra todo pronóstico, el comité archiva el expediente. Media comunidad celebra la sentencia como propia.', m(e, { fama: [8, 16], moral: [8, 15] }))
          : (e.flags.sancionado = true, e.flags.sancionadoAños = 1, e.flags.exsancionado = true,
             efecto('Un año de sanción por un mono. La comunidad flipa, tú también, pero la sanción es firme.', m(e, { fama: [3, 9], moral: [-16, -8] }))) },
      { txt: 'Borrar y pedir perdón', sub: 'Tragar y seguir.',
        efecto: e => efecto('Borras el retuit y publicas un comunicado que no se cree nadie. El expediente se queda en advertencia.', m(e, { moral: [-8, -3], fama: [-4, -1] })) },
      { txt: 'Doblar la apuesta', sub: 'Ponerlo de foto de perfil.', riesgo: 0.35,
        efecto: (e, ok) => { if (ok) { hito(e, '🐒', 'El del mono bomba');
            return efecto('El mono bomba se convierte en tu marca personal. Vendes camisetas. El comité se rinde.', m(e, { fama: [16, 28], dinero: [20000, 60000], moral: [8, 15] })); }
          e.flags.sancionado = true; e.flags.sancionadoAños = 1; e.flags.exsancionado = true;
          return efecto('Dos años de expediente y uno de sanción. Eso sí, tu foto de perfil sigue intacta.', m(e, { fama: [6, 12], moral: [-13, -6] })); } },
    ],
  },
  {
    id: 'folagor_dualocke', etapas: ['liga', 'pro', 'cima', 'veterano'], peso: 15, unico: true,
    titulo: 'Folagor te invita a un dualocke',
    texto: () => 'Serie grabada, reglas de nuzlocke, dos entrenadores unidos por el mismo destino y un público enorme esperando que se muera algo. Son semanas de grabación que no vas a dedicar a entrenar.',
    opciones: [
      { txt: 'Grabar la serie entera', sub: 'Muchísima gente te va a ver.',
        efecto: e => { const n = nivelEquipo(e, -20); hito(e, '🎬', 'Grabó un dualocke con Folagor');
          return efecto(`La serie es un éxito y te conoce gente que no había visto un VGC en su vida. Tu equipo, eso sí, llega a la pretemporada oxidado. ${n}`,
            m(e, { fama: [40, 55], dinero: [30000, 70000], media: [-4, -1] })); } },
      { txt: 'Grabar solo un par de capítulos', sub: 'Un cameo y a entrenar.',
        efecto: e => { nivelEquipo(e, -6);
          return efecto('Sales en dos capítulos, la gente te descubre y sigues con tu temporada casi intacta.', m(e, { fama: [12, 22], dinero: [8000, 20000] })); } },
      { txt: 'Decir que no', sub: 'Esta temporada va en serio.',
        efecto: e => efecto('Le dices que este año no. Él lo entiende perfectamente y te desea suerte en directo.', m(e, { media: [2, 5], estrategia: [2, 6] })) },
    ],
  },
  {
    id: 'creators_cup', etapas: ['pro', 'cima', 'veterano'], peso: 13,
    cond: e => e.stats.fama >= 25,
    titulo: 'Creators Cup',
    texto: () => 'Victory Road organiza el torneo donde los creadores de contenido se mezclan con los jugadores de verdad. Reglas raras, mucho público y cero puntos de circuito en juego.',
    opciones: [
      { txt: 'Ir a ganarlo', sub: 'No sabes competir de otra forma.', riesgo: 0.5,
        efecto: (e, ok) => ok
          ? (hito(e, '🎙️', 'Ganó la Creators Cup'), efecto('Lo ganas con un equipo ridículo que preparaste en dos tardes. El clip da la vuelta a España.', m(e, { fama: [14, 24], moral: [8, 15] })))
          : efecto('Caes en cuartos contra un creador que jugaba con un equipo monotipo. El clip también da la vuelta a España.', m(e, { fama: [6, 12], moral: [-8, -3] })) },
      { txt: 'Ir a pasarlo bien y enseñar', sub: 'Explicar el juego a quien mira.',
        efecto: e => efecto('Comentas tus turnos en voz alta y media grada aprende a jugar contigo. Ganas cariño, que también cuenta.', m(e, { fama: [8, 16], vinculo: [4, 9], moral: [6, 12] })) },
      { txt: 'Quedarte preparando el regional', sub: 'Lo otro es ruido.',
        efecto: e => efecto('Te quedas en casa haciendo cálculos mientras todos se divierten. Llegas al regional afiladísimo.', m(e, { media: [2, 6], estrategia: [5, 10], fama: [-5, -1] })) },
    ],
  },
  {
    id: 'speedtie', etapas: ['liga', 'pro', 'cima'], peso: 14,
    titulo: 'El speed tie',
    texto: e => `Final de un regional. Mismo Pokémon, misma velocidad, moneda al aire: si ganas el empate de velocidad, ganas el torneo. Lo pierdes. ${e.rival.nombre} levanta la copa por una tirada.`,
    opciones: [
      { txt: 'Rehacer el equipo entero', sub: 'Que no dependa nunca de una moneda.',
        efecto: e => efecto('Te pasas el invierno recalculando velocidades y puntos de esfuerzo. No vuelves a perder así.', m(e, { estrategia: [9, 16], media: [1, 4], salud: [-5, -1] })) },
      { txt: 'Aceptar que el juego es así', sub: 'Hay varianza y punto.',
        efecto: e => efecto('Lo asumes deportivamente, felicitas en el escenario y duermes tranquilo. Casi.', m(e, { moral: [-4, 4], fama: [3, 7] })) },
      { txt: 'Estallar en la entrevista', sub: 'Decir lo que piensas del formato.', riesgo: 0.45,
        efecto: (e, ok) => ok
          ? efecto('Tu discurso sobre la varianza se hace viral y abre un debate serio en la comunidad.', m(e, { fama: [12, 20], moral: [4, 9] }))
          : efecto('Suena a mal perdedor. El clip te persigue durante temporadas.', m(e, { fama: [4, 9], moral: [-12, -6] })) },
    ],
  },
  {
    id: 'invitacion_mundial', etapas: ['pro', 'cima'], peso: 14,
    cond: e => e.stats.fama >= 35,
    titulo: 'Te faltan puntos para el Mundial',
    texto: () => 'Vas a quedarte fuera del Mundial por un puñado de puntos de campeonato. La única forma de sacarlos es encadenar regionales por media Europa, pagándotelos tú.',
    opciones: [
      { txt: 'Gastarte los ahorros en vuelos', sub: 'Perseguir los puntos.', riesgo: 0.55,
        efecto: (e, ok) => { const coste = rango(25000, 70000);
          if (ok) { hito(e, '🌍', 'Se ganó la invitación al Mundial a base de vuelos');
            return efecto('Cuatro países en seis semanas y los puntos justos. Entras en el Mundial por la puerta de atrás, pero entras.', m(e, { dinero: -coste, fama: [10, 18], media: [1, 4], salud: [-10, -4] })); }
          return efecto('Cuatro países, cero suerte y la cuenta temblando. Te quedas fuera por dos puntos.', m(e, { dinero: -coste, moral: [-14, -7], salud: [-9, -3] })); } },
      { txt: 'Buscar quien te patrocine el viaje', sub: 'Pedirlo sin vergüenza.', riesgo: 0.6,
        efecto: (e, ok) => ok
          ? efecto('Una tienda de tu ciudad te paga los vuelos a cambio de llevar su logo. Trato justo.', m(e, { fama: [6, 12], dinero: [10000, 30000], moral: [5, 11] }))
          : efecto('Nadie responde a los correos. Te quedas en casa viendo el Mundial por Twitch.', m(e, { moral: [-11, -5], estrategia: [2, 5] })) },
      { txt: 'Aceptar que este año no', sub: 'Guardar fuerzas y dinero.',
        efecto: e => efecto('Te lo ahorras todo y preparas la temporada siguiente desde enero, con calma.', m(e, { media: [2, 5], salud: [6, 12], moral: [-4, -1] })) },
    ],
  },

  {
    id: 'polemica_twitter', etapas: ['pro', 'cima', 'veterano'], peso: 14, unico: true,
    cond: e => e.stats.fama >= 30,
    titulo: 'Se lía en Twitter',
    texto: () => 'Contestas a un hilo sobre un tema de actualidad que no tiene nada que ver con Pokémon. En dos horas tienes citas de gente que no sabía ni que existías, un bando aplaudiéndote y otro pidiendo que te caiga algo.',
    opciones: [
      { txt: 'Mantenerte y argumentar', sub: 'Has dicho lo que piensas.', riesgo: 0.4,
        efecto: (e, ok) => ok
          ? efecto('Aguantas el chaparrón con educación y varios compañeros salen a apoyarte. Se te respeta más que antes.', m(e, { fama: [10, 20], moral: [5, 12] }))
          : efecto('El hilo se hace enorme por los motivos equivocados y dos patrocinadores dejan de contestarte los correos.', m(e, { fama: [5, 12], dinero: -rango(20000, 60000), moral: [-14, -7] })) },
      { txt: 'Borrarlo y no volver a entrar', sub: 'No era tu guerra.',
        efecto: e => efecto('Borras, cierras la aplicación y te vas a entrenar. En dos semanas nadie se acuerda.', m(e, { fama: [-5, -1], moral: [-5, 2], media: [1, 3] })) },
      { txt: 'Pasar el perfil a un community manager', sub: 'Que hable un profesional.',
        efecto: e => efecto('Contratas a alguien que sabe de esto. Tus redes se vuelven aburridas y tu vida, mucho más tranquila.', m(e, { dinero: -rango(10000, 30000), moral: [6, 12], fama: [-3, 3] })) },
    ],
  },
  {
    id: 'hackcheck', etapas: ['liga', 'pro', 'cima'], peso: 14, unico: true,
    titulo: 'Cola del hack check',
    texto: () => 'Sábado, ocho de la mañana, la cola del control de legalidad antes del regional. Uno de tus seis lo criaste con prisas y no estás seguro de que pase el filtro. Puedes cambiarlo por un suplente a medio entrenar.',
    opciones: [
      { txt: 'Pasar el equipo tal cual', sub: 'A ver si cuela.', riesgo: 0.5,
        efecto: (e, ok) => { if (ok) return efecto('Pasa el control sin una ceja levantada. Juegas con tu equipo bueno y respiras.', m(e, { moral: [4, 9], media: [1, 3] }));
          e.flags.sancionado = true; e.flags.sancionadoAños = 1; e.flags.exsancionado = true;
          return efecto('El juez detecta datos imposibles en uno de tus Pokémon. Descalificado del torneo y un año fuera del circuito.', m(e, { fama: [-20, -10], moral: [-20, -11] })); } },
      { txt: 'Cambiarlo por el suplente', sub: 'Jugar con uno peor pero limpio.',
        efecto: e => efecto('Entras con un equipo cojo y caes en la fase suiza, pero sales del pabellón con la conciencia tranquila.', m(e, { media: [-3, -1], moral: [3, 8] })) },
      { txt: 'Rehacerlo esa misma noche', sub: 'No dormir y criarlo bien.',
        efecto: e => efecto('Cuatro horas de crianza a las tantas. Llegas al torneo hecho polvo pero con todo en regla.', m(e, { salud: [-11, -5], estrategia: [3, 8], moral: [2, 6] })) },
    ],
  },
  {
    id: 'coaching_riopaser', etapas: ['liga', 'pro', 'cima'], peso: 15, unico: true,
    cond: e => e.dinero >= 30000,
    titulo: 'Pagar coaching a Riopaser',
    texto: e => `Llevas tres torneos atascado en la misma ronda. Riopaser da sesiones de coaching: repasar tus partidas, tus errores de secuenciación y por qué siempre pierdes los mismos matchups. No es barato y tienes ${e.dinero.toLocaleString('es')} ₽.`,
    opciones: [
      { txt: 'Pagar el paquete completo', sub: 'Meses de sesiones y deberes.', icono: 'expert-belt', riesgo: 0.75,
        efecto: (e, ok) => { const coste = rango(25000, 55000);
          if (ok) { hito(e, '🧠', 'Se puso en manos de un campeón de Europa');
            return efecto('Te destroza la forma de pensar el juego y la reconstruye. En dos meses no juegas igual, y se nota en la tabla.',
              m(e, { dinero: -coste, estrategia: [10, 18], media: [3, 7], techo: [2, 5] })); }
          return efecto('Las sesiones son buenísimas, pero no haces los deberes entre semana. Aprovechas la mitad de lo que pagaste.',
            m(e, { dinero: -coste, estrategia: [3, 7] })); } },
      { txt: 'Ver sus vídeos gratis', sub: 'Aprender por tu cuenta.',
        efecto: e => efecto('Te tragas su canal entero tomando apuntes. Menos personalizado, pero algo se pega.', m(e, { estrategia: [4, 9] })) },
      { txt: 'Seguir a tu manera', sub: 'Ya sabes lo que haces.',
        efecto: e => efecto('Sigues con tu método. Ganas alguna más, pierdes las mismas de siempre.', m(e, { media: [1, 3], moral: [-4, 2] })) },
    ],
  },
  {
    id: 'juanan_talavera', etapas: TODAS, peso: 14, unico: true,
    titulo: 'El torneo del bar de Talavera',
    texto: () => 'Juanan monta un torneo en el bar de siempre, en Talavera: dieciséis personas, una tele vieja, premios de la casa y cañas entre rondas. No da un solo punto de circuito.',
    opciones: [
      { txt: 'Ir y jugarlo todo', sub: 'Volver a por qué empezaste.',
        efecto: e => { for (const p of activos(e)) p.vinculo = limitar(p.vinculo + rango(4, 10));
          return efecto('Acabáis a las tres de la mañana comentando turnos con la tele congelada. Te vas de allí con las pilas cargadas.',
            m(e, { moral: [12, 20], vinculo: [6, 12], fama: [2, 6], salud: [-4, -1] })); } },
      { txt: 'Ir de invitado a firmar y enseñar', sub: 'Echar una mano a la escena local.',
        efecto: e => { e.flags.escenaLocal = true;
          return efecto('Firmas cartas, explicas cálculos en una servilleta y tres críos deciden esa noche que quieren competir.',
            m(e, { fama: [7, 14], moral: [8, 15] })); } },
      { txt: 'No ir, tienes regional el finde', sub: 'Los puntos son los puntos.',
        efecto: e => efecto('Te quedas entrenando. Juanan lo entiende, pero la foto del grupo sale sin ti.', m(e, { media: [2, 5], moral: [-6, -2] })) },
    ],
  },
  {
    id: 'equipo_filtrado', etapas: ['pro', 'cima'], peso: 13, unico: true,
    titulo: 'Te han filtrado el equipo',
    texto: () => 'Dos días antes del regional, tu equipo aparece publicado en un grupo. Alguien de tu círculo de pruebas lo ha pasado. Todo el mundo va a saber exactamente qué llevas.',
    opciones: [
      { txt: 'Cambiarlo entero a última hora', sub: 'Improvisar y sorprender.', riesgo: 0.45,
        efecto: (e, ok) => ok
          ? efecto('Montas otra cosa en dos noches y nadie sabe qué hacer contra ti. Sales en todos los resúmenes.', m(e, { media: [3, 7], fama: [8, 15], salud: [-8, -3] }))
          : efecto('El equipo nuevo no está probado y se rompe solo en la tercera ronda.', m(e, { media: [-3, -1], moral: [-12, -6], salud: [-7, -2] })) },
      { txt: 'Jugarlo igual y afinarlo', sub: 'Que sepan lo que llevo.',
        efecto: e => efecto('Cambias dos movimientos y los objetos. Que se preparen para lo que creen que llevas.', m(e, { estrategia: [6, 12], media: [1, 4] })) },
      { txt: 'Buscar quién ha sido', sub: 'Limpiar el círculo.',
        efecto: e => efecto('Lo averiguas y le echas del grupo de pruebas. Ganas tranquilidad y pierdes a alguien que probaba mucho.', m(e, { moral: [-6, 4], estrategia: [-4, -1], vinculo: [2, 5] })) },
    ],
  },
  {
    id: 'internacional_piso', etapas: ['pro', 'cima'], peso: 14,
    cond: e => e.stats.fama >= 28,
    titulo: 'Internacional fuera de España',
    texto: () => 'Toca un Internacional al otro lado de Europa. El truco de siempre: piso compartido con siete personas más, colchón hinchable y testear hasta las cuatro de la mañana. O pagarte un hotel y dormir.',
    opciones: [
      { txt: 'Piso compartido y testear de noche', sub: 'Barato y con equipo.', riesgo: 0.55,
        efecto: (e, ok) => ok
          ? efecto('Entre los ocho encontráis el detalle que os faltaba y llegáis al torneo con la respuesta al meta.',
              m(e, { estrategia: [8, 15], media: [1, 4], salud: [-9, -4], vinculo: [3, 7] }))
          : efecto('Nadie duerme, uno se pone malo y contagia a medio piso. Llegáis al pabellón hechos polvo.',
              m(e, { salud: [-16, -8], media: [-3, -1], moral: [-8, -3] })) },
      { txt: 'Hotel y dormir tus horas', sub: 'Caro, pero llegas entero.',
        efecto: e => efecto('Duermes ocho horas los tres días. Juegas con la cabeza fresca y la cartera más ligera.',
          m(e, { dinero: -rango(20000, 50000), salud: [6, 12], media: [1, 4] })) },
      { txt: 'No ir', sub: 'Ese dinero hace falta.',
        efecto: e => efecto('Lo sigues por Twitch desde el sofá, con sentimientos encontrados.', m(e, { moral: [-8, -3], dinero: [0, 0] })) },
    ],
  },
  {
    id: 'ladder_noche', etapas: ['liga', 'pro', 'cima'], peso: 15,
    titulo: 'La noche antes del torneo',
    texto: () => 'Son las dos de la mañana del sábado. Llevas doscientas partidas de ladder con el mismo equipo y de repente te parece que todo está mal. Tienes la lista de equipo en blanco delante.',
    opciones: [
      { txt: 'Cambiar dos huecos', sub: 'El clásico error de las dos de la mañana.', riesgo: 0.4,
        efecto: (e, ok) => ok
          ? efecto('Los dos cambios eran exactamente lo que necesitabas contra lo que se ha llevado todo el mundo.', m(e, { media: [3, 7], estrategia: [4, 9], fama: [4, 9] }))
          : efecto('Los dos huecos nuevos no encajan con nada. Pierdes tres rondas por combinaciones que nunca probaste.', m(e, { media: [-4, -1], moral: [-11, -5], salud: [-5, -1] })) },
      { txt: 'Cerrar el portátil y dormir', sub: 'Lo que hay es lo que hay.',
        efecto: e => efecto('Apagas y duermes siete horas. Al día siguiente juegas con la cabeza donde tiene que estar.', m(e, { salud: [5, 10], estrategia: [2, 6], media: [1, 3] })) },
      { txt: 'Repasar cálculos sin tocar nada', sub: 'Estudiar, no cambiar.',
        efecto: e => efecto('Te aprendes de memoria los cálculos que deciden el matchup malo. Duermes poco, pero sabiendo qué hacer.', m(e, { estrategia: [7, 13], salud: [-6, -2] })) },
    ],
  },
  {
    id: 'santuario', etapas: ['veterano', 'cima'], peso: 12, cond: e => e.dinero > 200000,
    titulo: 'Qué hacer con el dinero',
    texto: e => `Tienes ${e.dinero.toLocaleString('es')} ₽ en el banco y la carrera entrando en su recta final.`,
    opciones: [
      { txt: 'Abrir un santuario', sub: 'Un sitio para los retirados.',
        efecto: e => { e.flags.santuario = true; hito(e, '🏞️', 'Fundó un santuario para Pokémon retirados');
          return efecto('Compras un valle entero. Se llena de veteranos de todo el circuito.', m(e, { dinero: -Math.round(e.dinero * 0.7), fama: [8, 15], moral: [18, 28], vinculo: [11, 19] })); } },
      { txt: 'Invertir en tu equipo', sub: 'Instalaciones de élite.', icono: 'assault-vest',
        efecto: e => { objetoAleatorio(e);
          return efecto('Centro de alto rendimiento, nutricionistas, analistas. El equipo rinde como nunca.', m(e, { dinero: -Math.round(e.dinero * 0.5), media: [3, 7], techo: [1, 4], salud: [4, 9] })); } },
      { txt: 'Guardarlo todo', sub: 'Después del deporte hay vida.',
        efecto: e => efecto('Lo dejas quieto. Cuando te retires no tendrás que trabajar nunca más.', m(e, { moral: [3, 8] })) },
    ],
  },
];

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
