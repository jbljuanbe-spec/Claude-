// Catálogo de decisiones.
// Cada opción puede llevar `riesgo` (probabilidad de que salga bien, 0-1).
// efecto(e, ok) recibe si el dado salió a favor. Sin `riesgo`, la opción es segura.
import {
  azar, entero, dado, elegir, limitar, rango, capturaAleatoria, fichar, hito,
  poderPokemon, darObjeto, objetoAleatorio, tieneObjeto, subirTalento, mediaTemporal, mudarse, sumarMedia,
  profesorDe, campeonDe, villanoDe, liderDe,
} from './motor.js?v=24';
import { LINEAS, POROBJETO, REGIONES } from './datos.js?v=24';

// Aplica cambios. Los valores pueden ser un número o un rango [min, max].
function m(e, deltas) {
  const partes = [];
  const ETIQ = { poder: 'Poder', estrategia: 'Estrategia', vinculo: 'Vínculo', fama: 'Fama', salud: 'Salud', moral: 'Moral', media: 'Media' };
  for (const [k, def] of Object.entries(deltas)) {
    const v = Array.isArray(def) ? rango(def[0], def[1]) : def;
    if (!v) continue;
    if (k === 'dinero') { e.dinero = Math.max(0, e.dinero + v); partes.push(`${v > 0 ? '+' : ''}${v.toLocaleString('es')} ₽`); continue; }
    // mediaTexto: solo para mostrar el número tras un mediaTemporal() ya aplicado.
    // No toca e.media otra vez (evita duplicar el efecto).
    if (k === 'mediaTexto') { partes.push(`${v > 0 ? '+' : ''}${v} Media (temporal)`); continue; }
    // Pasa por el freno de la élite: cuanto más alto estés, menos te da cada
    // acierto. Se muestra lo que realmente entra, no lo que pedía el evento.
    if (k === 'media') { const r = sumarMedia(e, v); const n = Math.round(r * 10) / 10;
      if (n) partes.push(`${n > 0 ? '+' : ''}${n} Media`); continue; }
    // talento: no sube la media hoy, sino lo que crecerás cada temporada
    if (k === 'talento') { subirTalento(e, v); partes.push(`+${v} Talento`); continue; }
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

const EVENTOS = [
  // ── NOVATO ─────────────────────────────────────────────────────────────────
  {
    id: 'primer_dia', etapas: ['novato'], peso: 30, unico: true, cond: e => !!socioDe(e),
    titulo: 'El primer día',
    texto: e => `${profesorDe(e.region).replace(/^el |^la /, '').replace(/^./, c => c.toUpperCase())} te espera en la puerta del laboratorio con ${socioDe(e).nombre} y una decisión.`,
    opciones: [
      { txt: 'Cinco Poké Balls', sub: 'Empieza a construir equipo ya.', icono: 'poke', riesgo: 0.7,
        efecto: (e, ok) => { if (ok) { const p = capturaAleatoria(e);
            return efecto(`Atrapas a ${p?.nombre ?? 'un Rattata'} en la primera ruta y encima te sobran bolas.`, m(e, { media: [1, 3], moral: [2, 5] })); }
          return efecto('Gastas las cinco bolas en la misma tarde y no se queda ni una. Bienvenido a esto.', m(e, { moral: [-6, -2], estrategia: [1, 3] })); } },
      { txt: 'Una Pokédex', sub: 'Conocimiento antes que fuerza.',
        efecto: e => efecto('Te pasas las noches leyendo tipos y debilidades.', m(e, { estrategia: [7, 12], talento: [1, 3] })) },
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
          : efecto('Era una manada de Ursaring. Sales de allí a base de Poké Balls lanzadas al aire y piernas.', m(e, { salud: [-11, -5], moral: [-6, -2] })) },
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
      { txt: 'Montar el huerto', sub: 'Trabajo constante, comida todo el año.', icono: 'oran', riesgo: 0.75,
        efecto: (e, ok) => ok
          ? efecto(`Pasas un año plantando y podando. ${objeto(e, 'aranja')} Tus Pokémon comen mejor que nadie.`, m(e, { salud: [4, 9], vinculo: [3, 7], media: [-1, 0] }))
          : efecto('Una helada temprana se lleva la cosecha entera. Un año de trabajo para nada.', m(e, { moral: [-9, -4], media: [-2, -1] })) },
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
          if (ok) { mediaTemporal(e, 6, 2);
            return efecto('Vuelas media temporada y nadie sospecha. Duermes mal, pero ganas.', m(e, { salud: [-12, -5], vinculo: [-9, -3], mediaTexto: 6 })); }
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
          return efecto(`Se rompe del todo. ${s.nombre} ya nunca vuelve a moverse en combate igual.`, m(e, { vinculo: [-14, -7], salud: [-9, -3], media: [-3, -1] })); } },
      { txt: 'Sacar a los suplentes', sub: 'Confiar en el resto del equipo.',
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
          ? efecto('Sales del programa con métodos que nadie más conoce. A partir de ahora aprendes más rápido que nadie.', m(e, { talento: [4, 9], estrategia: [5, 10], fama: [-6, -2] }))
          : efecto('El programa se cancela a mitad por falta de fondos. Pierdes el año.', m(e, { fama: [-9, -4], moral: [-7, -3], estrategia: [1, 3] })) },
      { txt: 'Colaborar los fines de semana', sub: 'Sin dejar el circuito.',
        efecto: e => efecto('Compaginas laboratorio y torneos. Duermes poco pero aprendes.', m(e, { talento: [1, 3], estrategia: [3, 7], salud: [-5, -1] })) },
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
          return efecto('Te sientas al otro lado del combate. Ahora los críos vienen a por ti.', m(e, { dinero: [120000, 240000], fama: [7, 14], moral: [5, 12], media: [-3, -1] })); } },
      { txt: 'Rechazar y seguir compitiendo', sub: 'Aún te queda.',
        efecto: e => efecto('Dices que no delante de las cámaras. La presión sube un escalón.', m(e, { media: [1, 4], fama: [3, 8], moral: [-4, -1] })) },
      { txt: 'Pedir el puesto para cuando te retires', sub: 'Firmar el futuro.', riesgo: 0.6,
        efecto: (e, ok) => { if (ok) { e.flags.gimnasioReservado = true;
            return efecto('Acuerdan guardarte la plaza. Compites más tranquilo sabiendo que hay red.', m(e, { moral: [7, 13], estrategia: [2, 5] })); }
          return efecto('La Liga no acepta reservas y se lo dan a otro. Te quedas sin gimnasio y sin excusa.', m(e, { moral: [-8, -3], fama: [-4, -1] })); } },
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
        efecto: e => efecto('Un año fuera aprendiendo métodos que aquí nadie ha visto, y de vuelta a casa.', m(e, { estrategia: [7, 13], talento: [1, 4], dinero: [40000, 90000] })) },
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
             efecto(`Le ganas. El estadio no se lo cree y tú tampoco.`, m(e, { fama: [16, 28], moral: [12, 20], media: [2, 5], talento: [1, 4] })))
          : efecto('Te pasa por encima en cuatro turnos. Aprendes más de esa derrota que de diez victorias.', m(e, { estrategia: [6, 11], moral: [-8, -3], fama: [1, 4] })) },
      { txt: 'Combate de estudio', sub: 'Probar cosas, sin presión.',
        efecto: e => efecto('Usas el combate para probar estrategias raras. Pierdes, pero sales con ideas.', m(e, { estrategia: [7, 12], talento: [1, 3] })) },
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
            return efecto(`La bola se queda quieta. ${p.nombre} es tuyo, y el mundo lo sabe en dos horas.`, m(e, { fama: [24, 38], media: [4, 9], talento: [3, 7], salud: [-12, -5] })); }
          return efecto('Tres horas de combate y se marcha volando. Tus Pokémon quedan destrozados.', m(e, { salud: [-22, -12], moral: [-13, -6], fama: [3, 8] })); } },
      { txt: 'Estudiarlo y publicar los datos', sub: 'Ciencia, no captura.',
        efecto: e => { hito(e, '📚', 'Publicó el primer estudio de campo del fenómeno');
          return efecto('Tu informe es material de referencia. Te llaman "el entrenador que pensó".', m(e, { estrategia: [10, 18], talento: [2, 5], fama: [8, 15], dinero: [40000, 80000] })); } },
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
          return efecto(`${p.nombre} no resiste el proceso y se desploma en pleno combate. Tardas meses en perdonártelo.`, m(e, { vinculo: [-16, -8], moral: [-13, -6], fama: [2, 6] })); } },
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
          return efecto('Cae media organización. Chivato en los grupos de jugadores, héroe en los periódicos.', m(e, { fama: [11, 19], moral: [4, 9], estrategia: [2, 5] })); } },
      { txt: 'Colgar y ganar la semifinal', sub: 'Silencio y trabajo.', riesgo: 0.7,
        efecto: (e, ok) => ok
          ? efecto('Ganas la semifinal sin perder un solo combate. Esa es tu respuesta.', m(e, { media: [2, 5], moral: [8, 14], fama: [4, 9] }))
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
        efecto: e => efecto('Un año lejos de todo, sin cámaras, con tus Pokémon. Vuelves siendo otro.', m(e, { salud: [18, 30], moral: [18, 30], fama: [-17, -9], media: [-4, -1] })) },
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
          ? efecto('Salís de allí en otro nivel. El cuerpo aguantó.', m(e, { media: [3, 7], talento: [0, 2], salud: [-8, -3] }))
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
      { txt: 'Criarlo tú mismo', sub: 'Llevarlo a todas partes.', icono: 'lucky-egg', riesgo: 0.75,
        efecto: (e, ok) => { const p = capturaAleatoria(e);
          if (ok) { if (p) { p.vinculo = rango(66, 80); p.forma += rango(2, 6); }
            return efecto(`Nace ${p?.nombre ?? 'la cría'} y te reconoce desde el primer segundo.`, m(e, { vinculo: [8, 14], media: [1, 3], salud: [-5, -1] })); }
          return efecto(`Nace ${p?.nombre ?? 'la cría'}, pero criarlo entre torneos te come el año entero.`, m(e, { vinculo: [4, 8], media: [-3, -1], salud: [-9, -4] })); } },
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
      { txt: 'Aceptarlo como discípulo', sub: 'Devolver lo recibido.', riesgo: 0.65,
        efecto: (e, ok) => { e.flags.discipulo = true;
          if (ok) { hito(e, '🌱', 'Formó a la siguiente generación');
            return efecto('Le enseñas todo. Años después gana la Liga y te da las gracias en directo.', m(e, { moral: [12, 20], fama: [7, 13], estrategia: [4, 9], media: [-3, -1] })); }
          return efecto('Lo deja a los dos años sin avisar. Te queda la sensación de haber perdido el tiempo de los dos.', m(e, { moral: [-9, -4], media: [-3, -1] })); } },
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
        efecto: (e, ok) => { if (ok) { mediaTemporal(e, 5, 3);
            return efecto('Legumbres, planificación y cero resacas de torneo. Llegas a las finales con la cabeza mucho más despejada.', m(e, { salud: [8, 15], moral: [3, 8], mediaTexto: 5 })); }
          mediaTemporal(e, -3, 1);
          return efecto('Una indigestión de restaurante vegano dudoso te deja hecho polvo justo antes de un torneo. Se te pasa en un año, pero ese torneo lo pierdes con el estómago revuelto.', m(e, { salud: [-8, -3], moral: [-6, -2], mediaTexto: -3 })); } },
      { txt: 'Seguir con tu dieta y entrenar más duro', sub: 'Compensarlo a base de horas.',
        efecto: e => efecto('No cambias ni un plato, pero le metes el doble de sesiones al gimnasio. El cuerpo lo nota.', m(e, { media: [3, 6], salud: [-7, -3] })) },
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
      { txt: 'No firmar y centrarte en competir', sub: 'Esa energía, a entrenar.',
        efecto: e => efecto('Prefieres no meterte. Ganas tiempo de sobra para el equipo, pero algunos compañeros tardan meses en volver a hablarte del tema.', m(e, { media: [2, 5], estrategia: [3, 7], moral: [-8, -3] })) },
    ],
  },
  {
    id: 'retuit', etapas: ['liga', 'pro', 'cima'], peso: 13, unico: true,
    titulo: 'El retuit del bombardeo',
    texto: () => 'Son las dos de la mañana y le das retuit al tuit de LeN, el que dice que como le vuelvan a sancionar va a bombardear la sede de la Liga con Pokémon, escrito a propósito con faltas de ortografía para que quede aún más absurdo, la típica hipérbole de toda la vida en internet. A la mañana siguiente el comité de conducta te ha abierto expediente por "amenazas en línea". Por un meme.',
    opciones: [
      { txt: 'Defenderte en el expediente', sub: 'Explicar que era una broma, con pruebas.', riesgo: 0.35,
        efecto: (e, ok) => ok
          ? efecto('Contra todo pronóstico, el comité entiende el contexto y archiva el expediente. Media comunidad celebra la sentencia como propia.', m(e, { fama: [8, 16], moral: [8, 15] }))
          : (e.flags.sancionado = true, e.flags.sancionadoAños = 1, e.flags.exsancionado = true,
             efecto('El comité no entiende el registro y aplica la sanción igual. Un año fuera por un meme. La comunidad entera flipa contigo.', m(e, { fama: [3, 9], moral: [-16, -8] }))) },
      { txt: 'Borrar y pedir perdón', sub: 'Tragar y seguir, sin pelear el malentendido.',
        efecto: e => efecto('Borras el retuit y publicas un comunicado que no se cree nadie. El expediente se queda en advertencia, pero la gente que te entendía se queda con mal sabor de boca.', m(e, { moral: [-8, -3], fama: [-4, -1] })) },
    ],
  },
  {
    id: 'folagor_dualocke', etapas: ['liga', 'pro', 'cima', 'veterano'], peso: 15, unico: true,
    titulo: 'Folagor te invita a un dualocke',
    texto: () => 'Serie grabada, reglas de nuzlocke, dos entrenadores unidos por el mismo destino y un público enorme esperando que se muera algo. Son semanas de grabación que no vas a dedicar a entrenar.',
    opciones: [
      { txt: 'Grabar la serie entera', sub: 'Muchísima gente te va a ver.', riesgo: 0.75,
        efecto: (e, ok) => { const n = nivelEquipo(e, -20);
          if (ok) { hito(e, '🎬', 'Grabó un dualocke con Folagor');
            return efecto(`La serie es un éxito y te conoce gente que no había visto un VGC en su vida. Tu equipo, eso sí, llega a la pretemporada oxidado. ${n}`,
              m(e, { fama: [40, 55], dinero: [30000, 70000], media: [-4, -1] })); }
          return efecto(`La serie se corta a mitad por agenda y queda a medias. Pierdes las semanas igual. ${n}`,
            m(e, { fama: [8, 16], dinero: [8000, 20000], media: [-4, -1], moral: [-8, -3] })); } },
      { txt: 'Decir que no', sub: 'Esta temporada va en serio.',
        efecto: e => efecto('Le dices que este año no. Él lo entiende perfectamente y te desea suerte en directo, pero es visibilidad que otro se lleva.', m(e, { media: [2, 5], estrategia: [2, 6], fama: [-4, -1] })) },
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
      { txt: 'Quedarte preparando el regional', sub: 'Lo otro es ruido.',
        efecto: e => efecto('Te quedas en casa haciendo cálculos mientras todos se divierten. Llegas al regional afiladísimo, pero pierdes la exposición del torneo.', m(e, { media: [3, 7], estrategia: [5, 10], fama: [-6, -2] })) },
    ],
  },
  {
    id: 'wolfe_stream', etapas: ['pro', 'cima', 'veterano'], peso: 14, unico: true,
    cond: e => e.stats.fama >= 25,
    titulo: 'Una serie contra Wolfe, en directo',
    texto: () => 'Wolfe monta una serie a cinco en su canal y te invita a ti. Miles de personas mirando, el chat a toda velocidad y él explicando en voz alta lo que va a hacer antes de hacerlo, que es lo que más rabia da.',
    opciones: [
      { txt: 'Aceptar la serie', sub: 'A cara descubierta, en su casa.', riesgo: 0.4,
        efecto: (e, ok) => { if (ok) { hito(e, '🎥', 'Le ganó una serie a Wolfe en directo');
            return efecto('Le ganas 3-2 con una lectura que nadie vio venir, ni él. El clip se comparte solo, y a partir de esa noche dejas de ser un rival más: en todos los torneos hay alguien que va a por ti específicamente.',
              m(e, { fama: [18, 30], moral: [10, 18], media: [2, 5] })); }
          return efecto('Pierdes 0-3 y el chat no perdona: "no tiene ni idea", "cómo ha llegado aquí este". Wolfe sale a defenderte y es peor, porque encima queda de bueno.',
            m(e, { fama: [6, 12], moral: [-16, -8] })); } },
      { txt: 'Decir que ahora no', sub: 'No jugar en su terreno ni con su público.',
        efecto: e => efecto('Le dices que este mes no puedes y te lo respeta. El chat decide que le tienes miedo y ese clip también circula, pero tú sigues preparando lo tuyo sin ruido.',
          m(e, { fama: [-6, -2], estrategia: [4, 9], media: [1, 4] })) },
    ],
  },
  {
    id: 'fosil', etapas: ['gimnasios', 'liga', 'pro'], peso: 14, unico: true,
    titulo: 'Dos fósiles y una máquina',
    texto: () => 'En un museo de carretera te dejan elegir: hay dos fósiles en una vitrina polvorienta y una máquina de resurrección que, según el conserje, "va casi siempre". Solo puedes revivir uno, y el conserje ya está mirando el reloj.',
    opciones: [
      { txt: 'La Hélix o la Domo', sub: 'Lo que salga del mar antiguo.', icono: 'poke', riesgo: 0.7,
        efecto: (e, ok) => { if (!ok) return efecto('La máquina se traga el fósil, pita tres veces y se apaga. El conserje se encoge de hombros: "pues nada". Te vas con las manos vacías y una lección sobre museos de carretera.',
            m(e, { moral: [-8, -3], dinero: -rango(2000, 6000) }));
          const p = fichar(e, elegir(['omanyte', 'kabuto']));
          hito(e, '🦴', `Revivió a ${p?.nombre ?? 'un fósil'}`);
          return efecto(`La máquina zumba, se abre, y ahí está: ${p?.nombre ?? 'el fósil'}, vivo, parpadeando con cara de no entender nada. Tiene millones de años y acaba de conocerte.`,
            m(e, { fama: [6, 13], vinculo: [5, 11], moral: [6, 12] })); } },
      { txt: 'El Ámbar Viejo', sub: 'Más caro, más raro, más riesgo.', icono: 'poke', riesgo: 0.45,
        efecto: (e, ok) => { if (!ok) return efecto('Pagas lo que te piden y la resurrección sale mal: del ámbar no se levanta nada. Te quedas mirando la máquina un rato largo, como si fuera a cambiar de opinión.',
            m(e, { dinero: -rango(9000, 20000), moral: [-11, -5] }));
          const p = fichar(e, 'aerodactyl');
          hito(e, '🦖', 'Revivió a Aerodactyl del Ámbar Viejo');
          return efecto(`Del ámbar sale ${p?.nombre ?? 'Aerodactyl'} y el chillido rompe una vitrina. El conserje se esconde detrás del mostrador. Tú ya sabes que este entra en el equipo.`,
            m(e, { dinero: -rango(9000, 20000), fama: [12, 20], media: [1, 4] })); } },
    ],
  },
  {
    id: 'huevo_misterioso', etapas: ['novato', 'gimnasios', 'liga'], peso: 13, unico: true,
    titulo: 'El huevo que nadie reclama',
    texto: () => 'Una criadora te para en la ruta con un huevo entre las manos: apareció en su granja, no sabe de quién es y a ella no le cabe uno más. Te lo da sin preguntar, como quien suelta un problema.',
    opciones: [
      { txt: 'Llevarlo encima hasta que rompa', sub: 'Kilómetros, calor y paciencia.', riesgo: 0.75,
        efecto: (e, ok) => { if (!ok) return efecto('Pasan meses y el huevo no rompe. Un criador de verdad le echa un vistazo y te dice, con mucho tacto, que eso ya no va a eclosionar.',
            m(e, { moral: [-9, -4], vinculo: [3, 7] }));
          const p = capturaAleatoria(e, { rarezaMin: dado(0.35) ? 'raro' : 'comun' });
          return efecto(`Rompe una noche cualquiera, en un centro Pokémon vacío. Es ${p?.nombre ?? 'un bichito'} y lo primero que ve eres tú.`,
            m(e, { vinculo: [10, 18], moral: [7, 13] })); } },
      { txt: 'Dejarlo en el centro Pokémon', sub: 'Que lo cuide quien sepa.',
        efecto: e => efecto('Lo entregas en el mostrador y sigues tu camino más ligero. La enfermera te da las gracias; tú te quedas pensando en él más de lo que esperabas.',
          m(e, { moral: [-3, -1], estrategia: [3, 7], salud: [3, 7] })) },
    ],
  },
  {
    id: 'apagon_regional', etapas: ['liga', 'pro', 'cima'], peso: 13,
    titulo: 'Se va la luz en el pabellón',
    texto: () => 'Ronda 6, tú con ventaja, y el pabellón entero se queda a oscuras. Media hora después los jueces siguen sin saber si se reanuda desde donde iba o se repite el combate entero. Alguien tiene que decir algo y todos te miran a ti.',
    opciones: [
      { txt: 'Exigir que se reanude', sub: 'Ibas ganando y lo sabe todo el mundo.', riesgo: 0.5,
        efecto: (e, ok) => ok
          ? efecto('Los jueces te dan la razón, se reanuda y cierras el combate en dos turnos. Nadie discute, pero tampoco nadie te aplaude.',
              m(e, { media: [2, 5], fama: [3, 8], moral: [4, 9] }))
          : efecto('Deciden repetirlo entero. Pierdes el combate que ya tenías ganado y te comes la fama de protestón por partida doble.',
              m(e, { moral: [-13, -6], fama: [-7, -2] })) },
      { txt: 'Aceptar lo que digan los jueces', sub: 'No pelear una cosa que no depende de ti.',
        efecto: e => efecto('Dices que por ti lo que decidan. Se repite el combate y lo pierdes, pero el vídeo de ti diciéndolo se comparte más que ningún resultado de ese fin de semana.',
          m(e, { fama: [7, 14], moral: [-6, -2], estrategia: [2, 6] })) },
    ],
  },
  {
    id: 'pokealex_analisis', etapas: ['liga', 'pro', 'cima', 'veterano'], peso: 14, unico: true,
    cond: e => e.stats.fama >= 18,
    titulo: 'Pokéalex quiere analizar tu equipo',
    texto: () => 'Pokéalex prepara un vídeo desmenuzando el equipo con el que has llegado hasta aquí: los EVs, los objetos, por qué ese cuarto hueco y no otro. Lo va a ver muchísima gente, incluida la que se va a sentar enfrente de ti el mes que viene.',
    opciones: [
      { txt: 'Enseñarlo todo', sub: 'Sin esconder ni un EV.', riesgo: 0.55,
        efecto: (e, ok) => ok
          ? efecto('El vídeo explota y de repente eres el que explica las cosas bien. Ganas una capa de respeto que no da ningún torneo, y encima te sobra tiempo para rehacer el equipo antes del regional.',
              m(e, { fama: [14, 24], estrategia: [4, 9], moral: [5, 10] }))
          : efecto('El vídeo explota y medio circuito se aprende tu equipo de memoria. En el siguiente regional te esperan con la respuesta preparada desde la primera ronda.',
              m(e, { fama: [12, 20], media: [-5, -2], moral: [-6, -2] })) },
      { txt: 'Contarlo por encima', sub: 'Guardarte lo que de verdad gana partidas.',
        efecto: e => efecto('Vas al vídeo, sonríes y no sueltas prenda de lo que hace funcionar al equipo. En los comentarios te llaman rata; tú duermes tranquilo.',
          m(e, { media: [2, 5], estrategia: [2, 5], fama: [-4, -1] })) },
    ],
  },
  {
    id: 'juanfi_mufa', etapas: ['liga', 'pro', 'cima', 'veterano'], peso: 14, unico: true,
    titulo: 'La mufa de Juanfi',
    texto: e => `Víspera de final. Juanfi tiene el tuit escrito y el dedo encima del botón: "vamos ${e.nombre}, este año es el suyo". Todo el circuito sabe lo que pasa cuando Juanfi apoya a alguien en público. Él también lo sabe. Le hace gracia.`,
    opciones: [
      { txt: 'Dejar que lo publique', sub: 'La mufa es superstición… ¿no?', riesgo: 0.1,
        efecto: (e, ok) => ok
          ? (hito(e, '🧿', 'Sobrevivió a la mufa de Juanfi'),
             efecto('Ganas. Ganas con el tuit fijado y todo. Juanfi se cuelga la medalla de haber roto su propia maldición y tú entras en la lista cortísima de gente que le ha sobrevivido.',
               m(e, { fama: [16, 28], moral: [10, 18] })))
          : efecto('Caes al día siguiente de la forma más tonta posible. El tuit se queda ahí, con cuatro mil citas riéndose de los dos. Al menos ahora te conoce todo el mundo.',
              m(e, { fama: [10, 18], moral: [-18, -10] })) },
      { txt: 'Bloquearle por si acaso', sub: 'Sin tuit no hay mufa.',
        efecto: e => efecto('Le bloqueas veinticuatro horas y él se lo toma a broma, pero la captura del bloqueo circula igual y te quedas de supersticioso oficial del circuito. Duermes de un tirón, eso sí.',
          m(e, { moral: [6, 12], fama: [-5, -1], estrategia: [1, 4] })) },
    ],
  },
  {
    id: 'tierlist', etapas: ['pro', 'cima', 'veterano'], peso: 15, unico: true,
    cond: e => e.stats.fama >= 22,
    titulo: 'La tier list de jugadores',
    texto: e => {
      const escala = [[88, 'S', 'A'], [80, 'A', 'B'], [72, 'B', 'C'], [62, 'C', 'D']];
      const [, merecida, puesta] = escala.find(([min]) => e.media >= min) ?? [0, 'D', 'F'];
      e._tierMerecida = merecida; e._tierPuesta = puesta;
      return `Un canal grande publica la tier list de jugadores españoles de la temporada. Vas bajando la imagen buscándote en ${merecida}, que es donde sabes perfectamente que estás. Y te encuentras en ${puesta}, entre dos nombres que llevan años sin ganar nada. En los comentarios hay gente defendiéndote y gente diciendo que hasta ahí te han puesto por pena.`;
    },
    opciones: [
      { txt: 'Contestar en Twitter', sub: 'Con datos y a las tres de la mañana.', riesgo: 0.4,
        efecto: (e, ok) => ok
          ? efecto(`Sacas el hilo con los resultados de los últimos tres años y no hay debate posible. Rectifican el vídeo y te suben a ${e._tierMerecida} en la edición corregida.`,
              m(e, { fama: [10, 18], moral: [6, 12] }))
          : efecto('El hilo huele a rabia desde el primer tuit y las citas te pasan por encima. Ahora la tier list la recuerda todo el mundo por tu respuesta, no por dónde te pusieron.',
              m(e, { fama: [6, 12], moral: [-14, -7] })) },
      { txt: 'No decir nada y anotarlo', sub: 'Guardarte la captura para el año que viene.',
        efecto: e => efecto(`No comentas, no citas, no das like. Te pones la captura de fondo de pantalla y entrenas con ella delante toda la temporada. Alguien va a pagar esa ${e._tierPuesta}.`,
          m(e, { media: [4, 8], estrategia: [4, 9], moral: [-6, -2], salud: [-5, -1] })) },
    ],
  },
  {
    id: 'speedtie', etapas: ['liga', 'pro', 'cima'], peso: 14,
    titulo: 'El speed tie',
    texto: e => `Final de un regional. Mismo Pokémon, misma velocidad, moneda al aire: si ganas el empate de velocidad, ganas el torneo. Lo pierdes. ${e.rival.nombre} levanta la copa por una tirada.`,
    opciones: [
      { txt: 'Rehacer el equipo entero', sub: 'Que no dependa nunca de una moneda.',
        efecto: e => efecto('Te pasas el invierno recalculando velocidades y puntos de esfuerzo. No vuelves a perder así, pero el proceso te deja agotado.', m(e, { estrategia: [9, 16], media: [1, 4], salud: [-6, -2] })) },
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
      { txt: 'Aceptar que este año no', sub: 'Guardar fuerzas y dinero.',
        efecto: e => efecto('Te lo ahorras todo y preparas la temporada siguiente desde enero, con calma. También te quedas sin la experiencia de competir fuera.', m(e, { media: [2, 5], salud: [6, 12], moral: [-6, -2] })) },
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
        efecto: e => efecto('Borras, cierras la aplicación y te vas a entrenar. En dos semanas nadie se acuerda, pero por dentro sabes que te callaste.', m(e, { fama: [-5, -1], media: [2, 5], moral: [-5, -1] })) },
    ],
  },
  {
    id: 'hackcheck', etapas: ['liga', 'pro', 'cima'], peso: 14, unico: true,
    titulo: 'Cola del hack check',
    texto: () => 'Sábado, ocho de la mañana, la cola del control de legalidad antes del regional. Uno de tus seis lo criaste con prisas hace semanas y no estás seguro de que pase el filtro. Aquí, ahora, solo puedes jugártela con él o sacarlo y entrar con cinco.',
    opciones: [
      { txt: 'Pasar el equipo tal cual', sub: 'A ver si cuela.', riesgo: 0.5,
        efecto: (e, ok) => { if (ok) return efecto('Pasa el control sin una ceja levantada. Juegas con tu equipo bueno y respiras.', m(e, { moral: [4, 9], media: [1, 3] }));
          e.flags.sancionado = true; e.flags.sancionadoAños = 1; e.flags.exsancionado = true;
          return efecto('El juez detecta datos imposibles en uno de tus Pokémon. Descalificado del torneo y un año fuera del circuito.', m(e, { fama: [-20, -10], moral: [-20, -11] })); } },
      { txt: 'Sacarlo y entrar con cinco', sub: 'Jugar corto, pero limpio.',
        efecto: e => efecto('Entras con un equipo cojo y caes en la fase suiza, pero sales del pabellón con la conciencia tranquila.', m(e, { media: [-4, -2], moral: [3, 8] })) },
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
              m(e, { dinero: -coste, estrategia: [10, 18], media: [3, 7], talento: [2, 5] })); }
          return efecto('Las sesiones son buenísimas, pero no haces los deberes entre semana. Aprovechas la mitad de lo que pagaste.',
            m(e, { dinero: -coste, estrategia: [3, 7] })); } },
      { txt: 'Seguir a tu manera', sub: 'Guardarte el dinero y aprender solo.',
        efecto: e => efecto('Sigues con tu método, sin gastar nada. Mejoras algo por tu cuenta, pero sin nadie que te señale el error que no ves.', m(e, { estrategia: [2, 5], moral: [-3, 1] })) },
    ],
  },
  {
    id: 'juanan_talavera', etapas: TODAS, peso: 14, unico: true,
    cond: e => e.edad >= 18,   // hay cañas de por medio: solo mayores de edad
    titulo: 'El torneo del bar de Talavera',
    texto: () => 'Juanan monta un torneo en el bar de siempre, en Talavera: dieciséis personas, una tele vieja, premios de la casa y cañas entre rondas. No da un solo punto de circuito, pero es el mismo finde que tienes reservado para entrenar a tope.',
    opciones: [
      { txt: 'Ir y jugarlo todo', sub: 'Volver a por qué empezaste.',
        efecto: e => { for (const p of activos(e)) p.vinculo = limitar(p.vinculo + rango(4, 10));
          return efecto('Acabáis a las tres de la mañana comentando turnos con la tele congelada. Te vas de allí con las pilas cargadas, pero el finde de entreno se esfuma.',
            m(e, { moral: [12, 20], vinculo: [6, 12], fama: [2, 6], media: [-2, -1] })); } },
      { txt: 'No ir, tienes que entrenar', sub: 'Los puntos son los puntos.',
        efecto: e => efecto('Te quedas entrenando a solas todo el finde. Juanan lo entiende, pero la foto del grupo sale sin ti.', m(e, { media: [2, 5], moral: [-6, -2] })) },
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
        efecto: e => efecto('Cambias dos movimientos y los objetos. Que se preparen para lo que creen que llevas: no es lo mismo saber el equipo que saber jugarlo.', m(e, { estrategia: [6, 12], media: [1, 4] })) },
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
    ],
  },
  {
    id: 'ladder_noche', etapas: ['liga', 'pro', 'cima'], peso: 15,
    titulo: 'La noche antes del torneo',
    texto: () => 'Son las dos de la mañana del sábado. Llevas doscientas partidas de ladder con el mismo equipo y de repente te parece que todo está mal. Tienes la lista de equipo en blanco delante.',
    opciones: [
      { txt: 'Cambiar dos huecos', sub: 'El clásico error de las dos de la mañana.', riesgo: 0.4,
        efecto: (e, ok) => { if (ok) { mediaTemporal(e, 4, 2);
            return efecto('Los dos cambios eran exactamente lo que necesitabas contra lo que se ha llevado todo el mundo.', m(e, { estrategia: [4, 9], fama: [4, 9], mediaTexto: 4 })); }
          return efecto('Los dos huecos nuevos no encajan con nada. Pierdes tres rondas por combinaciones que nunca probaste.', m(e, { media: [-4, -1], moral: [-11, -5], salud: [-5, -1] })); } },
      { txt: 'Cerrar el portátil y dormir', sub: 'Lo que hay es lo que hay.',
        efecto: e => efecto('Apagas y duermes siete horas. Al día siguiente juegas con la cabeza donde tiene que estar, con el equipo que ya conocías.', m(e, { salud: [6, 12], estrategia: [1, 4], media: [1, 3] })) },
    ],
  },

  // ── MÁS SITUACIONES DE CARRERA ─────────────────────────────────────────────
  {
    id: 'shiny', etapas: ['novato', 'gimnasios', 'liga', 'pro'], peso: 12, unico: true,
    titulo: 'Sale distinto',
    texto: () => 'Un Pokémon salvaje aparece con los colores cambiados. Sabes lo que es: uno de esos que la gente busca durante años sin encontrarlo. Un coleccionista de la zona ya te ha ofrecido una cifra que no deberías ni escuchar.',
    opciones: [
      { txt: 'Quedártelo y entrenarlo', sub: 'Vale más que el dinero.',
        efecto: e => { const p = capturaAleatoria(e, { rarezaMin: 'raro' });
          if (p) { p.forma += rango(3, 8); p.vinculo = limitar(p.vinculo + rango(10, 20)); }
          hito(e, '✨', `Capturó un ${p?.nombre ?? 'ejemplar'} de colores raros`);
          return efecto(`${p?.nombre ?? 'El ejemplar'} entra en el equipo y no hay foto tuya en la que no salga él.`,
            m(e, { fama: [6, 13], vinculo: [4, 9] })); } },
      { txt: 'Venderlo al coleccionista', sub: 'Ese dinero cambia tu temporada.',
        efecto: e => efecto('Cierras el intercambio sin mirarle. Con ese dinero pagas la temporada entera, pero te acuerdas de él más de lo que esperabas.',
          m(e, { dinero: [80000, 180000], moral: [-10, -4], vinculo: [-6, -2] })) },
    ],
  },
  {
    id: 'muñeca', etapas: ['liga', 'pro', 'cima', 'veterano'], peso: 14,
    cond: e => e.edad >= 17,
    titulo: 'Te duele la muñeca',
    texto: () => 'Llevas meses con molestias en la mano de jugar. El fisio es claro: o paras tres meses ahora, o esto va a más y para de verdad más adelante.',
    opciones: [
      { txt: 'Parar los tres meses', sub: 'Perder media temporada y curarte.',
        efecto: e => efecto('Te pierdes dos torneos grandes, pero vuelves sin dolor y sin miedo a que la mano falle en el turno decisivo.',
          m(e, { salud: [12, 20], media: [-3, -1], fama: [-5, -1] })) },
      { txt: 'Infiltrarte y seguir compitiendo', sub: 'La temporada está en juego.', riesgo: 0.45,
        efecto: (e, ok) => { if (ok) return efecto('Aguantas la temporada a base de antiinflamatorios y hielo. Llegas justo, pero llegas.',
            m(e, { fama: [4, 10], salud: [-8, -3] }));
          e.flags.lesionCronica = true;
          return efecto('La muñeca dice basta en mitad de un regional. A partir de aquí, el dolor va contigo a todos lados.',
            m(e, { salud: [-18, -10], media: [-4, -2], moral: [-12, -5] })); } },
    ],
  },
  {
    id: 'meta_nuevo', etapas: ['liga', 'pro', 'cima'], peso: 15,
    titulo: 'Cambia la regulación',
    texto: () => 'Anuncian nuevas reglas para la temporada que viene: entran Pokémon que estaban prohibidos y tu equipo de siempre se queda a medias. Todo el mundo empieza de cero al mismo tiempo.',
    opciones: [
      { txt: 'Ser de los primeros en romperlo', sub: 'Encontrar la combinación antes que nadie.', riesgo: 0.45,
        efecto: (e, ok) => { if (ok) { hito(e, '🔬', 'Descifró el meta nuevo antes que nadie');
            return efecto('Das con una pareja que nadie había probado y arrasas los dos primeros torneos antes de que se copie.',
              m(e, { media: [4, 8], fama: [10, 18], estrategia: [5, 10] })); }
          return efecto('Pruebas veinte cosas raras y ninguna funciona. Pierdes el arranque de temporada experimentando.',
            m(e, { media: [-3, -1], moral: [-9, -4], estrategia: [3, 7] })); } },
      { txt: 'Copiar lo que funcione y afinarlo', sub: 'Dejar que otros exploren.',
        efecto: e => efecto('Esperas un mes, coges el equipo que gana y lo ajustas mejor que su creador. Poco glamour, muchos puntos.',
          m(e, { media: [2, 5], estrategia: [4, 9], fama: [-4, -1] })) },
    ],
  },
  {
    id: 'sorteo_grupo', etapas: ['liga', 'pro', 'cima'], peso: 13,
    titulo: 'El sorteo te odia',
    texto: e => `Sale el cuadro del torneo y te ha tocado el peor lado posible: tres cabezas de serie y ${e.rival.nombre} esperando en octavos.`,
    opciones: [
      { txt: 'Preparar solo ese cuadro', sub: 'Estudiar a los tres, uno por uno.',
        efecto: e => efecto('Te aprendes sus equipos de memoria y llegas sabiendo cada movimiento que van a hacer. Duermes fatal esa semana.',
          m(e, { estrategia: [8, 14], salud: [-6, -2] })) },
      { txt: 'Ignorar el cuadro y jugar tu juego', sub: 'Ronda a ronda, sin mirar más allá.', riesgo: 0.5,
        efecto: (e, ok) => ok
          ? efecto('Sin la presión de pensar en la siguiente ronda, juegas suelto y te llevas por delante a dos cabezas de serie.',
              m(e, { media: [2, 6], fama: [8, 15], moral: [6, 12] }))
          : efecto('Te cruzas con el primer cabeza de serie sin haberle estudiado y te pasa por encima en la segunda ronda.',
              m(e, { moral: [-10, -4], fama: [-4, -1] })) },
    ],
  },
  {
    id: 'fan', etapas: ['liga', 'pro', 'cima', 'veterano'], peso: 12,
    cond: e => e.stats.fama >= 25,
    titulo: 'Una carta de una cría',
    texto: () => 'Entre el correo hay una carta escrita a mano. Una cría de nueve años te cuenta que empezó a competir porque te vio a ti, y que su Pokémon se llama como el tuyo. Pide una foto firmada. La dirección está a cuatro horas de aquí.',
    opciones: [
      { txt: 'Presentarte en su casa sin avisar', sub: 'Ocho horas de coche por una foto.',
        efecto: e => { hito(e, '💌', 'Condujo cuatro horas para responder una carta');
          return efecto('Su madre no se lo cree, ella menos. El vídeo lo sube un vecino y le da la vuelta al país en dos días.',
            m(e, { fama: [12, 22], moral: [14, 22], media: [-2, -1] })); } },
      { txt: 'Mandarle la foto firmada y una carta', sub: 'Contestar bien, sin dramatizar.',
        efecto: e => efecto('Le escribes tres párrafos de verdad y le mandas la foto. Nadie se entera, pero ella la tiene enmarcada.',
          m(e, { moral: [6, 12], fama: [1, 4] })) },
    ],
  },
  {
    id: 'patrocinador_equipo', etapas: ['pro', 'cima', 'veterano'], peso: 16, unico: true,
    cond: e => !!e.flags.patrocinio,
    titulo: 'Tu patrocinador quiere mandar en tu equipo',
    texto: e => `Marketing tiene una idea: que lleves siempre al mismo Pokémon, el que sale en los anuncios, aunque no encaje en el meta. Ofrecen renovar por el doble si aceptas. Ahora mismo tu mejor carta es ${masFuerte(e)?.nombre ?? 'tu mejor Pokémon'}.`,
    opciones: [
      { txt: 'Aceptar y jugar con la mascota', sub: 'Cobrar el doble a costa del equipo.',
        efecto: e => efecto('Firmas. Compites con un hueco condicionado por un contrato y se te nota en los resultados, pero la cuenta corriente no se queja.',
          m(e, { dinero: [200000, 400000], media: [-5, -2], moral: [-6, -2] })) },
      { txt: 'Negarte y arriesgar el contrato', sub: 'El equipo lo eliges tú.', riesgo: 0.55,
        efecto: (e, ok) => ok
          ? efecto('Aguantan tu negativa porque ganas, y la historia del jugador que dijo que no acaba siendo mejor publicidad que el anuncio.',
              m(e, { fama: [8, 15], moral: [8, 14], media: [1, 4] }))
          : (e.flags.patrocinio = false,
             efecto('Rompen el contrato en enero. Te quedas sin ese dinero justo cuando más viajes tenías por delante.',
               m(e, { dinero: -rango(30000, 80000), moral: [-8, -3], media: [1, 3] }))) },
    ],
  },
  {
    id: 'benefico', etapas: ['pro', 'cima', 'veterano'], peso: 12,
    cond: e => e.stats.fama >= 30,
    titulo: 'Torneo benéfico',
    texto: () => 'Un hospital infantil organiza un torneo para recaudar fondos y quiere cabezas conocidas. Es el mismo fin de semana que un regional con puntos en juego.',
    opciones: [
      { txt: 'Ir al benéfico', sub: 'Los puntos ya llegarán.',
        efecto: e => { hito(e, '🎗️', 'Jugó el benéfico en vez del regional');
          return efecto('Pasas el sábado jugando con críos ingresados y el domingo viendo el regional por el móvil. Volverías a hacerlo.',
            m(e, { fama: [8, 15], moral: [12, 20], media: [-2, -1] })); } },
      { txt: 'Ir al regional', sub: 'Estás para competir.',
        efecto: e => efecto('Vas a por los puntos y los sacas. En redes alguien comenta quién sí fue al hospital y quién no.',
          m(e, { media: [2, 5], fama: [-5, -1], moral: [-6, -2] })) },
    ],
  },
  {
    id: 'mentor', etapas: ['novato', 'gimnasios', 'liga'], peso: 14, unico: true,
    titulo: 'Alguien se ofrece a enseñarte',
    texto: e => `Un veterano del circuito de ${e.regionNombre}, de los que ya no compiten, te ve entrenar y se ofrece a llevarte. Método antiguo, mucha disciplina y cero paciencia con las excusas.`,
    opciones: [
      { txt: 'Ponerte en sus manos', sub: 'Hacer lo que te diga, sin discutir.', riesgo: 0.7,
        efecto: (e, ok) => { if (ok) { hito(e, '🥋', 'Se formó con un veterano del circuito');
            return efecto('Te corrige cosas que llevabas años haciendo mal sin saberlo. Es duro, pero sales de ahí siendo otro jugador.',
              m(e, { estrategia: [8, 14], media: [3, 6], talento: [2, 5], moral: [-4, -1] })); }
          return efecto('Su método es de otra época y chocáis todo el rato. Lo dejáis a los seis meses, cada uno pensando que el otro no entendía nada.',
            m(e, { moral: [-8, -3], estrategia: [1, 4] })); } },
      { txt: 'Agradecérselo y seguir solo', sub: 'Aprender a tu ritmo.',
        efecto: e => efecto('Le dices que prefieres equivocarte por tu cuenta. Tardas más en aprender, pero lo que aprendes es tuyo.',
          m(e, { media: [1, 4], moral: [3, 7] })) },
    ],
  },
  {
    id: 'ducha', etapas: ['liga', 'pro', 'cima'], peso: 14, unico: true,
    titulo: 'Llevas tres días testeando',
    texto: () => 'Sábado, pabellón lleno, y tú llevas desde el jueves encerrado probando el equipo. La ronda empieza en veinte minutos: te da justo para una ducha rápida en el hotel o para dos partidas más de prueba. Tu compañero de piso te mira y no dice nada, que ya es decir.',
    opciones: [
      { txt: 'Dos partidas más', sub: 'La ducha puede esperar.', riesgo: 0.65,
        efecto: (e, ok) => ok
          ? efecto('En esas dos partidas das con el detalle que te faltaba. Nadie te dice nada del olor, pero alguien abre una ventana.',
              m(e, { estrategia: [6, 12], media: [1, 4], fama: [-3, -1] }))
          : efecto('A media ronda un juez te aparta con mucha educación y te lee la parte del reglamento sobre higiene personal. Te vas del pabellón antes de terminar el torneo, y el mote te dura años.',
              m(e, { fama: [-14, -7], moral: [-16, -8], media: [-2, -1] })) },
      { txt: 'Ducharte y llegar decente', sub: 'Entras con lo que tengas probado.',
        efecto: e => efecto('Llegas justo, oliendo a gel de hotel y sin ese último ajuste. Los de tu mesa lo agradecen más que tú.',
          m(e, { media: [-2, -1], moral: [4, 9], fama: [2, 5] })) },
    ],
  },
  {
    id: 'retiro_anticipado', etapas: ['pro', 'cima', 'veterano'], peso: 16, unico: true,
    cond: e => e.edad >= 28,
    titulo: 'La oferta que te hace pensar en dejarlo',
    texto: e => { const opciones = [
        `Una academia de ${e.regionNombre} te ofrece dirigirla a tiempo completo: formar a la próxima generación en vez de competir contra ella.`,
        'Una cadena de televisión te propone ser comentarista fijo del circuito: bajarte del escenario, coger el micrófono.',
        `El Alto Mando de ${e.regionNombre} tiene una plaza libre y tu nombre en la lista corta.`,
        'Llevas media vida en hoteles y aeropuertos. Por primera vez, alguien te pregunta qué quieres tú, no qué necesita el circuito.',
      ]; e._motivoRetiro = elegir(opciones);
      return `${e._motivoRetiro} Nadie te obliga a decidir hoy, pero la oferta no va a esperar para siempre.`; },
    opciones: [
      { txt: 'Aceptar y retirarte ahora', sub: 'Cerrar esta etapa por decisión propia.',
        efecto: e => { e.flags.retiroElegido = true; hito(e, '🎬', `Se retiró a los ${e.edad} para empezar algo nuevo`);
          return efecto(`Aceptas. ${e._motivoRetiro?.startsWith('Una academia') ? 'Cuelgas las Poké Balls de competición y te pones a formar entrenadores.' : e._motivoRetiro?.startsWith('Una cadena') ? 'La próxima vez que te vean será en un plató, no en un escenario.' : e._motivoRetiro?.startsWith('El Alto Mando') ? 'Te sientas en la silla que veías por la tele de crío.' : 'Por primera vez en años, el calendario lo decides tú.'} No hay marcha atrás, y por una vez eso te alivia.`,
            m(e, { moral: [14, 24], fama: [4, 10] })); } },
      { txt: 'Rechazarla y seguir compitiendo', sub: 'Todavía te queda cuerda.',
        efecto: e => efecto('Le dices que no. La oferta se enfría, pero tú sigues compitiendo, que es donde quieres estar.', m(e, { media: [1, 4], moral: [3, 7] })) },
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
          return efecto('Centro de alto rendimiento, nutricionistas, analistas. El equipo rinde como nunca.', m(e, { dinero: -Math.round(e.dinero * 0.5), media: [3, 7], talento: [1, 4], salud: [4, 9] })); } },
      { txt: 'Guardarlo todo', sub: 'Después del deporte hay vida.',
        efecto: e => efecto('Lo dejas quieto. Cuando te retires no tendrás que trabajar nunca más.', m(e, { moral: [3, 8] })) },
    ],
  },
  // ── ARCO DE KANTO (easter egg: nombre "Satoshi") ────────────────────────────
  // La carrera del anime, beat a beat y en orden estricto: cada evento exige el
  // paso anterior (flags.ash) y deja puesto el siguiente. Peso altísimo para que
  // mande sobre el resto mientras la historia esté abierta.
];

// Nota de guion: el arco cubre Kanto y termina en la Liga Añil. A partir de ahí
// la carrera sigue siendo la tuya, con los eventos normales.
const paso = (n, extra = {}) => ({
  // `prioritario`: mientras la historia esté abierta manda sobre todo lo demás,
  // y `TODAS` las etapas para que no se quede a medias si la carrera se alarga.
  etapas: TODAS, peso: 100, unico: true, prioritario: true,
  cond: e => e.flags.esAsh && e.flags.ash === n, ...extra,
});
const avanzar = (e, n) => { e.flags.ash = n + 1; };

const ARCO_KANTO = [
  {
    id: 'ash_1_pikachu', ...paso(1),
    titulo: 'Te has dormido el primer día',
    texto: () => 'Llegas al laboratorio con el pijama puesto y tres horas tarde. Los tres iniciales volaron: solo queda uno en la mesa, un Pikachu que te mira fijamente y que, según el Profesor, "tiene carácter". No quiere entrar en la Poké Ball ni a tiros.',
    opciones: [
      { txt: 'Obligarle a entrar en la Ball', sub: 'Las normas son las normas.', riesgo: 0.15,
        efecto: (e, ok) => { avanzar(e, 1);
          if (ok) return efecto('Contra todo pronóstico entra. Sale a los diez segundos y se sienta encima de la Ball, pero al menos ha entrado una vez.', m(e, { estrategia: [2, 5], vinculo: [-4, -1] }));
          return efecto('Te suelta una descarga que te deja el pelo de punta y el pijama humeando. El Profesor no disimula la risa. Empezamos bien.',
            m(e, { salud: [-8, -3], moral: [-6, -2], vinculo: [3, 7] })); } },
      { txt: 'Dejarle andar a tu lado', sub: 'Si no quiere, no quiere.',
        efecto: e => { avanzar(e, 1);
          return efecto('Sales del pueblo con él caminando detrás, a tres metros, sin mirarte. No es afecto todavía, pero es un principio.',
            m(e, { vinculo: [8, 14], moral: [3, 7] })); } },
    ],
  },
  {
    id: 'ash_2_spearow', ...paso(2),
    titulo: 'La bandada de Spearow',
    texto: e => `Le tiraste una piedra a un Spearow y ahora vienen todos. Cientos. ${socioDe(e)?.nombre ?? 'Pikachu'} está en el suelo, reventado, y la bandada baja en picado hacia él. Tienes dos segundos para decidir.`,
    opciones: [
      { txt: 'Cubrirlo con tu cuerpo', sub: 'Que le den a los Spearow.', riesgo: 0.8,
        efecto: (e, ok) => { avanzar(e, 2); const s = socioDe(e);
          if (s) s.vinculo = limitar(s.vinculo + rango(25, 40));
          hito(e, '⚡', 'Se puso delante de la bandada por su Pikachu');
          if (ok) return efecto(`Te pones encima de él y les dices que vengan. Lo que pasa después no lo entiendes del todo: un trueno que parte el cielo, la bandada desapareciendo, y un pájaro dorado cruzando el arcoíris a lo lejos. ${s?.nombre ?? 'Pikachu'} ya no camina detrás de ti: camina en tu hombro.`,
            m(e, { vinculo: [20, 30], moral: [16, 26], fama: [4, 9], talento: [2, 5] }));
          return efecto(`Te pones encima de él y les dices que vengan. Funciona, pero acabas los dos en el Centro Pokémon una semana. ${s?.nombre ?? 'Pikachu'} no se despega de la camilla en todo ese tiempo.`,
            m(e, { salud: [-16, -9], vinculo: [20, 30], moral: [8, 15] })); } },
      { txt: 'Cogerlo y correr', sub: 'Salvar lo que se pueda.',
        efecto: e => { avanzar(e, 2); const s = socioDe(e);
          if (s) s.vinculo = limitar(s.vinculo + rango(10, 18));
          return efecto('Lo coges en brazos y corres hasta que las piernas dejan de responderte. Llegáis vivos de milagro y él te mira distinto, aunque no tanto como te habría mirado si te hubieras quedado.',
            m(e, { salud: [-9, -4], vinculo: [8, 14] })); } },
    ],
  },
  {
    id: 'ash_3_bici', ...paso(3),
    titulo: 'La bici de la chica pelirroja',
    texto: () => 'Para llegar al Centro Pokémon le quitas la bicicleta a una chica que estaba pescando. La bici acaba carbonizada por un trueno. Ella te ha encontrado, está delante de ti y quiere una bici nueva, o algo mejor.',
    opciones: [
      { txt: 'Prometerle que se la pagas', sub: 'Con dinero que no tienes.', riesgo: 0.5,
        efecto: (e, ok) => { avanzar(e, 3);
          if (ok) return efecto('Le firmas un pagaré en una servilleta. Ella lo guarda, dice que te va a seguir hasta cobrarlo, y de paso te enseña más de tipo agua en un mes que tú en toda tu vida.',
            m(e, { estrategia: [7, 13], dinero: -rango(3000, 8000), moral: [4, 9] }));
          return efecto('Le dices que se la pagas y no te cree ni un poco. Te sigue igualmente, pero te lo recuerda absolutamente cada día durante años.',
            m(e, { moral: [-7, -3], estrategia: [5, 10] })); } },
      { txt: 'Salir corriendo', sub: 'Ya te buscará.',
        efecto: e => { avanzar(e, 3);
          return efecto('Sales por patas con Pikachu bajo el brazo. Te alcanza dos pueblos después, obviamente, y ahora además está enfadada. Sigue viniendo contigo.',
            m(e, { fama: [-4, -1], moral: [-4, -1], salud: [3, 7] })); } },
    ],
  },
  {
    id: 'ash_4_caterpie', ...paso(4),
    titulo: 'Tu primera captura',
    texto: () => 'Un Caterpie en el Bosque Verde, la captura más fácil que existe. Tus dos acompañantes ponen cara de asco: uno de ellos no soporta los bichos y lo está diciendo muy alto.',
    opciones: [
      { txt: 'Capturarlo igualmente', sub: 'Es tu primera Poké Ball llena.', icono: 'poke',
        efecto: e => { avanzar(e, 4); const p = fichar(e, 'caterpie');
          hito(e, '🐛', 'Su primera captura fue un Caterpie');
          return efecto(`Lo capturas a la primera y lo celebras como si fuera un legendario. ${p?.nombre ?? 'Caterpie'} evolucionará antes de lo que crees y te va a ganar más combates de los que nadie espera.`,
            m(e, { vinculo: [10, 17], moral: [8, 14] })); } },
      { txt: 'Buscar algo más impresionante', sub: 'Que la primera cuente.', riesgo: 0.4,
        efecto: (e, ok) => { avanzar(e, 4);
          if (ok) { const p = capturaAleatoria(e, { rarezaMin: 'raro', region: 'kanto' });
            return efecto(`Te pasas el bosque entero buscando y sale bien: ${p?.nombre ?? 'algo raro'} cae en la Ball. Tardas tres días más de la cuenta, pero mereció la pena.`,
              m(e, { fama: [5, 10], media: [1, 4] })); }
          return efecto('Dejas pasar al Caterpie buscando algo mejor y no aparece nada en tres días. Sales del bosque con el mismo equipo con el que entraste y con hambre.',
            m(e, { moral: [-8, -3], salud: [-5, -2] })); } },
    ],
  },
  {
    id: 'ash_5_brock', ...paso(5),
    titulo: 'Gimnasio de Ciudad Plateada',
    texto: () => 'Brock y su Onix. Tu Pikachu es de tipo eléctrico contra un Pokémon de roca y tierra: sobre el papel no le hace absolutamente nada. El líder te lo dice a la cara antes de empezar.',
    opciones: [
      { txt: 'Entrenar un mes y volver', sub: 'Ganársela de verdad.', riesgo: 0.6,
        efecto: (e, ok) => { avanzar(e, 5);
          if (ok) { e.medallas = Math.min(8, e.medallas + 1);
            return efecto('Vuelves un mes después con un plan que no depende del tipo y le ganas limpiamente. Brock te da la medalla y, unas semanas más tarde, te pide ir contigo.',
              m(e, { media: [3, 7], estrategia: [8, 14], moral: [8, 14] })); }
          return efecto('Vuelves y pierdes otra vez, esta vez sin excusas. Brock te da consejos en lugar de la medalla y te dice que no tengas prisa.',
            m(e, { estrategia: [6, 11], moral: [-7, -3] })); } },
      { txt: 'Aceptar la medalla que te ofrece', sub: 'Te la da él, no la ganas tú.',
        efecto: e => { avanzar(e, 5); e.medallas = Math.min(8, e.medallas + 1);
          return efecto('Los aspersores del gimnasio deciden el combate y Brock te pone la medalla en la mano diciendo que no la has ganado. Te la quedas. Vas a pensar en eso más veces de las que te gustaría.',
            m(e, { moral: [-6, -2], estrategia: [2, 6], fama: [3, 7] })); } },
    ],
  },
  {
    id: 'ash_6_surge', ...paso(6),
    titulo: 'La piedra trueno',
    texto: e => `El Teniente te ha machacado con un Raichu y te suelta que tu ${socioDe(e)?.nombre ?? 'Pikachu'} es un bebé que nunca va a estar a la altura. En el mostrador del Centro Pokémon hay una piedra trueno. Tu compañero la mira y luego te mira a ti, y niega con la cabeza.`,
    opciones: [
      { txt: 'Guardar la piedra', sub: 'Ganar siendo lo que ya es.', riesgo: 0.65,
        efecto: (e, ok) => { avanzar(e, 6); const s = socioDe(e);
          if (s) s.vinculo = limitar(s.vinculo + rango(18, 28));
          if (ok) { e.medallas = Math.min(8, e.medallas + 1);
            hito(e, '⚡', 'Ganó al Raichu sin evolucionar a su Pikachu');
            return efecto('Devuelves la piedra al mostrador y ganáis a base de velocidad, esquivando todo lo que el Raichu tira. La medalla sabe distinta cuando la ganas así.',
              m(e, { media: [2, 6], vinculo: [10, 18], fama: [7, 13], moral: [10, 17] })); }
          return efecto('Devuelves la piedra y perdéis igual, pero él sale del gimnasio con la cabeza alta y tú detrás. Volveréis.',
            m(e, { vinculo: [10, 18], moral: [-5, -1] })); } },
      { txt: 'Usar la piedra trueno', sub: 'Potencia bruta, hoy.', icono: 'poke',
        efecto: e => { avanzar(e, 6); const s = socioDe(e);
          if (s) { s.umbrales = [0, 1]; s.vinculo = limitar(s.vinculo - rango(12, 20)); }
          e.medallas = Math.min(8, e.medallas + 1);
          return efecto('La piedra hace su trabajo y de golpe tienes un Raichu enorme y muchísimo más fuerte. Ganas la medalla ese mismo día. Tardas semanas en acostumbrarte a que ya no te quepa en el hombro.',
            m(e, { media: [4, 8], poder: [8, 14], vinculo: [-10, -4] })); } },
    ],
  },
  {
    id: 'ash_7_charmander', ...paso(7),
    titulo: 'El Charmander de la roca',
    texto: () => 'Lleva horas sobre una roca, bajo la lluvia, tapándose la cola con la mano para que no se le apague. Su entrenador le dijo que volvería a por él y lo dijo riéndose, con sus amigos, en un bar a dos kilómetros de aquí.',
    opciones: [
      { txt: 'Cargar con él hasta el Centro', sub: 'Corriendo, bajo el agua.', riesgo: 0.85,
        efecto: (e, ok) => { avanzar(e, 7); const p = fichar(e, 'charmander');
          hito(e, '🔥', 'Salvó a un Charmander abandonado bajo la lluvia');
          if (ok) return efecto(`Llegáis empapados y la llama aguanta. Cuando despierta y ve que has sido tú, decide que se queda. ${p?.nombre ?? 'Charmander'} entra en el equipo y no vuelve a mirar atrás.`,
            m(e, { vinculo: [14, 22], moral: [12, 20], fama: [4, 9], salud: [-6, -2] }));
          return efecto(`Llegáis por los pelos y los sanitarios tardan toda la noche. Se salva, pero tú sales de allí con una fiebre que te dura un mes. ${p?.nombre ?? 'Charmander'} se queda contigo igual.`,
            m(e, { vinculo: [14, 22], salud: [-16, -9], moral: [7, 13] })); } },
      { txt: 'Avisar a su entrenador', sub: 'Es suyo, no tuyo.',
        efecto: e => { avanzar(e, 7);
          return efecto('Vas al bar a buscarle y se ríe en tu cara delante de todos. Cuando vuelves a la roca ya no hay nadie: alguien se lo ha llevado antes que tú. No te lo perdonas en mucho tiempo.',
            m(e, { moral: [-14, -7], estrategia: [3, 7] })); } },
    ],
  },
  {
    id: 'ash_8_charizard', ...paso(8),
    cond: e => e.flags.esAsh && e.flags.ash === 8,
    titulo: 'El que ya no te hace caso',
    texto: e => `Aquel Charmander de la roca ya es otra cosa: enorme, con alas, y desde que evolucionó no obedece una sola orden. En mitad de un combate importante se tumba a echarse una siesta mientras el rival le pega. La grada se ríe. ${e.rival.nombre} se ríe.`,
    opciones: [
      { txt: 'Seguir sacándolo igual', sub: 'Que vuelva cuando quiera volver.', riesgo: 0.55,
        efecto: (e, ok) => { avanzar(e, 8);
          if (ok) { hito(e, '🐉', 'Se ganó otra vez el respeto de su Charizard');
            return efecto('Una noche helada te quedas horas dándole calor sin decirle nada. A la mañana siguiente, por primera vez en un año, hace lo que le pides. Y a partir de ahí no hay quien le pare.',
              m(e, { media: [5, 10], vinculo: [16, 26], moral: [12, 20] })); }
          return efecto('Sigues sacándolo y sigue pasando de ti temporada tras temporada. Pierdes combates que tenías ganados y una parte del vestuario deja de entenderte.',
            m(e, { media: [-5, -2], moral: [-12, -6], vinculo: [-6, -2] })); } },
      { txt: 'Dejarlo fuera del equipo', sub: 'Competir con los que sí responden.',
        efecto: e => { avanzar(e, 8);
          return efecto('Lo dejas descansar y tiras con el resto, que responden siempre. Ganas más y discutes menos, pero cada vez que ves un Charizard ajeno se te queda una cosa rara en el cuerpo.',
            m(e, { media: [2, 6], estrategia: [5, 10], moral: [-8, -3], vinculo: [-5, -2] })); } },
    ],
  },
  {
    id: 'ash_9_despedidas', ...paso(9),
    titulo: 'Las despedidas',
    texto: () => 'Dos el mismo año. Tu Butterfree ha encontrado pareja y la bandada se va cruzando el mar. Y en la ruta de vuelta, el Pidgeot que te lleva años acompañando se queda mirando a una bandada de Pidgey a los que alguien tiene que proteger. Ninguno de los dos se irá si no se lo dices tú.',
    opciones: [
      { txt: 'Decirles que se vayan', sub: 'Aunque te quedes sin ellos.',
        efecto: e => { const eq = activos(e);
          const suelta = eq.filter(p => ['caterpie', 'pidgey'].includes(p.linea));
          for (const p of suelta) p.retirado = true;
          avanzar(e, 9);
          hito(e, '👋', 'Los dejó marchar cuando tocaba');
          return efecto(`Les dices adiós desde un acantilado, gritando, hasta que no se les ve. Es la primera vez que un entrenador te ve llorar y no te importa lo más mínimo.${suelta.length ? ` Se van ${suelta.map(p => p.nombre).join(' y ')}.` : ''}`,
            m(e, { media: [-3, -1], moral: [10, 18], vinculo: [12, 20], fama: [4, 9] })); } },
      { txt: 'Pedirles que se queden', sub: 'Los necesitas para competir.',
        efecto: e => { avanzar(e, 9);
          return efecto('Se quedan, porque te harían caso hasta en esto. Tu equipo es más fuerte esta temporada y tú te pasas el año evitando mirarles a la cara.',
            m(e, { media: [4, 8], moral: [-12, -6], vinculo: [-8, -3] })); } },
    ],
  },
  {
    id: 'ash_10_anil', ...paso(10),
    titulo: 'Liga Añil',
    texto: e => `Las ocho medallas, el estadio lleno y la antorcha encendida. Vas pasando rondas hasta que en el top 16 te toca un chico normal, de esos que nadie tiene fichados. Y en mitad del combate, tu Charizard vuelve a hacer lo de siempre: se sienta. ${e.rival.nombre} lo está viendo desde la grada.`,
    opciones: [
      { txt: 'Rogarle que se levante', sub: 'Delante de todo el estadio.', riesgo: 0.25,
        efecto: (e, ok) => { avanzar(e, 10); e.flags.arcoKantoHecho = true;
          if (ok) { e.titulos.push({ año: e.año, nombre: 'Liga Añil' }); e.ligasGanadas++;
            hito(e, '🏆', 'Ganó la Liga Añil contra todo pronóstico');
            return efecto('Se levanta. No sabes por qué, pero se levanta, y lo que pasa después no lo olvida nadie que estuviera allí. Ganas la Liga Añil en tu primer intento.',
              m(e, { fama: [25, 40], moral: [20, 32], media: [4, 9], talento: [3, 6] })); }
          hito(e, '😔', 'Cayó en el top 16 de su primera Liga Añil');
          return efecto('No se levanta. Te descalifican por Pokémon incapacitado y te vas del estadio en el top 16, con la antorcha todavía encendida a tu espalda. Tu madre te dice que ha estado muy bien. Tú sabes que no.',
            m(e, { fama: [8, 15], moral: [-16, -9], estrategia: [7, 13] })); } },
      { txt: 'Cambiarlo y seguir con otro', sub: 'Salvar el combate como sea.', riesgo: 0.45,
        efecto: (e, ok) => { avanzar(e, 10); e.flags.arcoKantoHecho = true;
          if (ok) { hito(e, '🔥', 'Llegó a semifinales de la Liga Añil');
            return efecto('Lo retiras sin discutir y tiras con el resto, que dan la cara. Caes en semifinales peleando cada punto, y sales del estadio con la sensación de haber competido de verdad.',
              m(e, { fama: [14, 24], moral: [6, 12], estrategia: [8, 14] })); }
          return efecto('Lo retiras, pero el daño ya está hecho y caes en la misma ronda igualmente. Al menos esta vez no te fuiste sin intentarlo.',
            m(e, { fama: [7, 13], moral: [-9, -4], estrategia: [5, 10] })); } },
    ],
  },
];

// El arco vive en el mismo catálogo: sus `cond` lo mantienen invisible salvo
// que estés jugando la partida de Satoshi.
EVENTOS.push(...ARCO_KANTO);
export { EVENTOS };

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

  // Si hay un paso de historia esperando (el arco de Kanto), va primero: una
  // rama argumental no puede depender de una tirada de pesos.
  const guion = pool.filter(ev => ev.prioritario);
  if (guion.length) pool = guion;

  const total = pool.reduce((s, ev) => s + ev.peso, 0);
  let r = Math.random() * total;
  let elegido = pool[pool.length - 1];
  for (const ev of pool) { r -= ev.peso; if (r <= 0) { elegido = ev; break; } }
  estado.vistos.add(elegido.id);
  estado.ultimoEvento = elegido.id;
  return elegido;
}
