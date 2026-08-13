// Catálogo de decisiones.
// Cada opción puede llevar `riesgo` (probabilidad de que salga bien, 0-1).
// efecto(e, ok) recibe si el dado salió a favor. Sin `riesgo`, la opción es segura.
import {
  azar, entero, dado, elegir, limitar, rango, capturaAleatoria, fichar, hito,
  poderPokemon, darObjeto, objetoAleatorio, tieneObjeto, subirTalento, mediaTemporal, mudarse, sumarMedia,
  profesorDe, campeonDe, villanoDe, liderDe,
} from './motor.js?v=41';
import { LINEAS, POROBJETO, REGIONES, TIPOS } from './datos.js?v=41';
import { L, idioma, numLocale } from './i18n.js?v=41';

// Aplica cambios. Los valores pueden ser un número o un rango [min, max].
function m(e, deltas) {
  const partes = [];
  const ETIQ = {
    poder: L('Poder', 'Power', 'Potenza'), estrategia: L('Estrategia', 'Strategy', 'Strategia'),
    vinculo: L('Vínculo', 'Bond', 'Legame'), fama: L('Fama', 'Fame', 'Fama'),
    salud: L('Salud', 'Health', 'Salute'), moral: L('Moral', 'Morale', 'Morale'), media: L('Media', 'Rating', 'Media'),
  };
  for (const [k, def] of Object.entries(deltas)) {
    const v = Array.isArray(def) ? rango(def[0], def[1]) : def;
    if (!v) continue;
    if (k === 'dinero') { e.dinero = Math.max(0, e.dinero + v); partes.push(`${v > 0 ? '+' : ''}${v.toLocaleString(numLocale())} ₽`); continue; }
    // mediaTexto: solo para mostrar el número tras un mediaTemporal() ya aplicado.
    // No toca e.media otra vez (evita duplicar el efecto).
    if (k === 'mediaTexto') { partes.push(`${v > 0 ? '+' : ''}${v} ${L('Media (temporal)', 'Rating (temporary)', 'Media (temporanea)')}`); continue; }
    // Pasa por el freno de la élite: cuanto más alto estés, menos te da cada
    // acierto. Se muestra lo que realmente entra, no lo que pedía el evento.
    if (k === 'media') { const r = sumarMedia(e, v); const n = Math.round(r * 10) / 10;
      if (n) partes.push(`${n > 0 ? '+' : ''}${n} ${ETIQ.media}`); continue; }
    // talento: no sube la media hoy, sino lo que crecerás cada temporada
    if (k === 'talento') { subirTalento(e, v); partes.push(`+${v} ${L('Talento', 'Talent', 'Talento')}`); continue; }
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
const objeto = (e, id) => { const o = darObjeto(e, id); return o ? L(`Consigues ${o.nombre}.`, `You get ${o.nombre}.`, `Ottieni ${o.nombre}.`) : ''; };

// Mueve el nivel de todo el equipo (grabar contenido desentrena, un campus intensivo sube)
function nivelEquipo(e, delta) {
  const eq = activos(e);
  for (const p of eq) p.nivel = Math.max(1, Math.min(100, p.nivel + delta));
  return eq.length ? L(`${delta > 0 ? '+' : ''}${delta} de nivel a todo el equipo.`,
    `${delta > 0 ? '+' : ''}${delta} level to the whole team.`,
    `${delta > 0 ? '+' : ''}${delta} di livello a tutta la squadra.`) : '';
}

function lesionar(e, p) {
  if (!p) return '';
  p.lesionado = true; e.flags.lesionado = true;
  return L(`${p.nombre} queda tocado.`, `${p.nombre} gets hurt.`, `${p.nombre} rimane infortunato.`);
}

const TODAS = ['novato', 'gimnasios', 'liga', 'pro', 'cima', 'veterano'];

const EVENTOS = [
  // ── NOVATO ─────────────────────────────────────────────────────────────────
  {
    id: 'primer_dia', etapas: ['novato'], peso: 30, unico: true, cond: e => !!socioDe(e),
    titulo: L('El primer día', 'The first day', 'Il primo giorno'),
    texto: e => L(`${profesorDe(e.region).replace(/^el |^la /, '').replace(/^./, c => c.toUpperCase())} te espera en la puerta del laboratorio con ${socioDe(e).nombre} y una decisión.`,
      `${profesorDe(e.region)} is waiting for you at the lab door with ${socioDe(e).nombre} and a decision.`,
      `${profesorDe(e.region)} ti aspetta alla porta del laboratorio con ${socioDe(e).nombre} e una decisione.`),
    opciones: [
      { txt: L('Cinco Poké Balls', 'Five Poké Balls', 'Cinque Poké Ball'), sub: L('Empieza a construir equipo ya.', 'Start building your team now.', 'Inizia a costruire la squadra subito.'), icono: 'poke', riesgo: 0.7,
        efecto: (e, ok) => { if (ok) { const p = capturaAleatoria(e);
            return efecto(L(`Atrapas a ${p?.nombre ?? 'un Rattata'} en la primera ruta y encima te sobran bolas.`,
              `You catch ${p?.nombre ?? 'a Rattata'} on the first route, with balls to spare.`,
              `Catturi ${p?.nombre ?? 'un Rattata'} sulla prima rotta e ti avanzano pure le Poké Ball.`), m(e, { media: [1, 3], moral: [2, 5] })); }
          return efecto(L('Gastas las cinco bolas en la misma tarde y no se queda ni una. Bienvenido a esto.',
            'You use all five balls that same afternoon and catch nothing. Welcome to this life.',
            'Usi tutte e cinque le palle nello stesso pomeriggio e non ne resta nessuna. Benvenuto in questo mondo.'), m(e, { moral: [-6, -2], estrategia: [1, 3] })); } },
      { txt: L('Una Pokédex', 'A Pokédex', 'Un Pokédex'), sub: L('Conocimiento antes que fuerza.', 'Knowledge before strength.', 'Conoscenza prima della forza.'),
        efecto: e => efecto(L('Te pasas las noches leyendo tipos y debilidades.', 'You spend nights reading about types and weaknesses.', 'Passi le notti a studiare tipi e debolezze.'), m(e, { estrategia: [7, 12], talento: [1, 3] })) },
      { txt: L('El Multiexp de repuesto', 'The spare Exp. Share', 'Il Multiexp di riserva'), sub: L('Que crezcan todos a la vez.', 'Let them all grow together.', 'Che crescano tutti insieme.'), icono: 'exp-share',
        efecto: e => efecto(L(`Te lo guardas en la mochila sin saber lo que vale. ${objeto(e, 'multiexp')}`,
          `You stash it in your bag without knowing its worth. ${objeto(e, 'multiexp')}`,
          `Te lo metti in zaino senza sapere quanto vale. ${objeto(e, 'multiexp')}`), m(e, { vinculo: [4, 9] })) },
    ],
  },
  {
    id: 'ruta_bosque', etapas: ['novato', 'gimnasios'], peso: 18,
    titulo: L('Noche en el bosque', 'Night in the forest', 'Notte nel bosco'),
    texto: () => L('Seis horas caminando. Se hace de noche y oyes algo grande entre los árboles.',
      'Six hours of walking. Night falls and you hear something big moving between the trees.',
      'Sei ore di cammino. Cala la notte e senti qualcosa di grosso muoversi tra gli alberi.'),
    opciones: [
      { txt: L('Investigar', 'Investigate', 'Indagare'), sub: L('Podría ser una captura rara.', 'Could be a rare catch.', 'Potrebbe essere una cattura rara.'), riesgo: 0.55,
        efecto: (e, ok) => ok
          ? efecto(L(`Es un ${capturaAleatoria(e, { rarezaMin: 'raro' })?.nombre ?? 'ejemplar raro'} y logras capturarlo.`,
              `It's a ${capturaAleatoria(e, { rarezaMin: 'raro' })?.nombre ?? 'rare specimen'} and you manage to catch it.`,
              `È un ${capturaAleatoria(e, { rarezaMin: 'raro' })?.nombre ?? 'esemplare raro'} e riesci a catturarlo.`), m(e, { fama: [2, 6] }))
          : efecto(L('Era una manada de Ursaring. Sales de allí a base de Poké Balls lanzadas al aire y piernas.',
              'It was a pack of Ursaring. You get out of there throwing Poké Balls blindly and running.',
              'Era un branco di Ursaring. Te la cavi lanciando Poké Ball a caso e correndo a gambe levate.'), m(e, { salud: [-11, -5], moral: [-6, -2] })) },
      { txt: L('Acampar y dormir', 'Camp and sleep', 'Accamparsi e dormire'), sub: L('Descansar también entrena.', 'Resting is training too.', 'Anche riposare allena.'),
        efecto: e => efecto(L('Duermes ocho horas seguidas por primera vez en semanas.', 'You sleep eight hours straight for the first time in weeks.', 'Dormi otto ore di fila per la prima volta in settimane.'), m(e, { salud: [6, 11], moral: [4, 9] })) },
      { txt: L('Entrenar toda la noche', 'Train all night', 'Allenarsi tutta la notte'), sub: L('El miedo se combate a golpes.', 'Fear is beaten back with training.', 'La paura si combatte a colpi.'), riesgo: 0.7,
        efecto: (e, ok) => ok
          ? efecto(L('Entrenas hasta el amanecer. Notas el salto al día siguiente.', 'You train until dawn. You feel the leap the next day.', 'Ti alleni fino all\'alba. Il salto si vede il giorno dopo.'), m(e, { media: [2, 4], salud: [-7, -3] }))
          : efecto(L(`Te pasas de vueltas. ${lesionar(e, elegir(activos(e)))}`,
              `You overdo it. ${lesionar(e, elegir(activos(e)))}`,
              `Esageri con i giri. ${lesionar(e, elegir(activos(e)))}`), m(e, { salud: [-14, -8], moral: [-6, -2] })) },
    ],
  },
  {
    id: 'magikarp', etapas: ['novato', 'gimnasios'], peso: 14, unico: true,
    cond: e => !e.equipo.some(p => p.linea === 'magikarp'),
    titulo: L('El vendedor del puente', 'The bridge salesman', 'Il venditore del ponte'),
    texto: e => L(`Un tipo con bigote te ofrece un Magikarp por 2.500 ₽. "Es una inversión", dice. Tienes ${e.dinero.toLocaleString(numLocale())} ₽.`,
      `A guy with a mustache offers you a Magikarp for 2,500 ₽. "It's an investment," he says. You have ${e.dinero.toLocaleString(numLocale())} ₽.`,
      `Un tizio coi baffi ti offre un Magikarp per 2.500 ₽. "È un investimento", dice. Hai ${e.dinero.toLocaleString(numLocale())} ₽.`),
    opciones: [
      { txt: L('Comprarlo', 'Buy it', 'Comprarlo'), sub: L('Ya sabes en qué evoluciona.', 'You already know what it evolves into.', 'Sai già in cosa evolve.'), cond: e => e.dinero >= 2500,
        efecto: e => { fichar(e, 'magikarp'); return efecto(L('Te llevas el pez más inútil del mundo. De momento.', 'You get the most useless fish in the world. For now.', 'Ti porti a casa il pesce più inutile del mondo. Per ora.'), m(e, { dinero: -2500 })); } },
      { txt: L('Regatear duro', 'Haggle hard', 'Trattare duro'), sub: L('Puede salir mal.', 'Could go wrong.', 'Potrebbe andare male.'), riesgo: 0.5,
        efecto: (e, ok) => ok
          ? (fichar(e, 'magikarp'), efecto(L('Lo dejas en 800 ₽ y el hombre se va refunfuñando.', 'You get it down to 800 ₽ and the man walks off grumbling.', 'Lo porti a 800 ₽ e l\'uomo se ne va brontolando.'), m(e, { dinero: -800, estrategia: [2, 5] })))
          : efecto(L('El vendedor se ofende y se marcha. Adiós Gyarados.', 'The seller gets offended and leaves. Goodbye Gyarados.', 'Il venditore si offende e se ne va. Addio Gyarados.'), m(e, { moral: [-5, -1] })) },
      { txt: L('Pasar de largo', 'Walk past', 'Passare oltre'), sub: L('Es una estafa evidente.', 'It\'s an obvious scam.', 'È una truffa evidente.'),
        efecto: e => efecto(L('Meses después ves a otro entrenador con un Gyarados enorme.', 'Months later you see another trainer with a huge Gyarados.', 'Mesi dopo vedi un altro allenatore con un Gyarados enorme.'), m(e, { estrategia: [1, 4] })) },
    ],
  },
  {
    id: 'primer_gym', etapas: ['novato', 'gimnasios'], peso: 20, cond: e => !!socioDe(e),
    titulo: L('Muro en el gimnasio', 'Brick wall at the gym', 'Muro in palestra'),
    texto: e => L(`Tercer intento contra ${liderDe(e.region).nombre}. ${socioDe(e).nombre} está agotado y el público murmura.`,
      `Third attempt against ${liderDe(e.region).nombre}. ${socioDe(e).nombre} is exhausted and the crowd is murmuring.`,
      `Terzo tentativo contro ${liderDe(e.region).nombre}. ${socioDe(e).nombre} è esausto e il pubblico mormora.`),
    opciones: [
      { txt: L('Insistir hoy mismo', 'Push through today', 'Insistere oggi stesso'), sub: L('Ahora o nunca.', 'Now or never.', 'Ora o mai più.'), riesgo: 0.45,
        efecto: (e, ok) => ok
          ? efecto(L('Ganas por los pelos con el último Pokémon en pie. El gimnasio se levanta.', 'You win by a hair with your last Pokémon standing. The gym rises to its feet.', 'Vinci per un pelo con l\'ultimo Pokémon in piedi. La palestra si alza in piedi.'), m(e, { fama: [4, 9], moral: [7, 14], media: [1, 3] }))
          : efecto(L(`Pierdes otra vez. ${lesionar(e, socioDe(e))}`, `You lose again. ${lesionar(e, socioDe(e))}`, `Perdi di nuovo. ${lesionar(e, socioDe(e))}`), m(e, { moral: [-13, -7], fama: [-5, -1] })) },
      { txt: L('Entrenar un mes y volver', 'Train for a month and return', 'Allenarsi un mese e tornare'), sub: L('Volver mejor.', 'Come back better.', 'Tornare più forte.'),
        efecto: e => efecto(L('Un mes de trabajo silencioso. Vuelves y ganas sin despeinarte.', 'A month of quiet work. You come back and win without breaking a sweat.', 'Un mese di lavoro silenzioso. Torni e vinci senza scomporti.'), m(e, { media: [2, 4], estrategia: [2, 6] })) },
      { txt: L('Estudiar sus combates', 'Study their battles', 'Studiare i suoi incontri'), sub: L('Buscar el patrón.', 'Look for the pattern.', 'Cercare lo schema.'), riesgo: 0.8,
        efecto: (e, ok) => ok
          ? efecto(L('Encuentras el fallo: siempre abre igual. Lo destrozas en tres turnos.', 'You find the flaw: they always open the same way. You wreck them in three turns.', 'Trovi il difetto: apre sempre allo stesso modo. Lo distruggi in tre turni.'), m(e, { estrategia: [8, 13], fama: [2, 6] }))
          : efecto(L('No hay patrón. Pierdes el mes y el combate.', 'There\'s no pattern. You lose the month and the battle.', 'Non c\'è schema. Perdi il mese e il combattimento.'), m(e, { moral: [-7, -3] })) },
    ],
  },
  {
    id: 'huerto', etapas: ['novato', 'gimnasios', 'liga'], peso: 15, unico: true,
    cond: e => !tieneObjeto(e, 'aranja'),
    titulo: L('El huerto abandonado', 'The abandoned orchard', 'Il frutteto abbandonato'),
    texto: () => L('Detrás de un Centro Pokémon hay un huerto de Bayas Aranja que nadie cuida desde hace años. La dueña te lo cede si te ocupas.',
      'Behind a Pokémon Center there\'s an Oran Berry orchard nobody has tended in years. The owner will give it to you if you take care of it.',
      'Dietro un Centro Pokémon c\'è un frutteto di Bacche Aranja che nessuno cura da anni. La proprietaria te lo cede se te ne occupi.'),
    opciones: [
      { txt: L('Montar el huerto', 'Set up the orchard', 'Sistemare il frutteto'), sub: L('Trabajo constante, comida todo el año.', 'Constant work, food all year.', 'Lavoro costante, cibo tutto l\'anno.'), icono: 'oran', riesgo: 0.75,
        efecto: (e, ok) => ok
          ? efecto(L(`Pasas un año plantando y podando. ${objeto(e, 'aranja')} Tus Pokémon comen mejor que nadie.`,
              `You spend a year planting and pruning. ${objeto(e, 'aranja')} Your Pokémon eat better than anyone.`,
              `Passi un anno a piantare e potare. ${objeto(e, 'aranja')} I tuoi Pokémon mangiano meglio di chiunque altro.`), m(e, { salud: [4, 9], vinculo: [3, 7], media: [-1, 0] }))
          : efecto(L('Una helada temprana se lleva la cosecha entera. Un año de trabajo para nada.', 'An early frost wipes out the whole harvest. A year of work for nothing.', 'Una gelata anticipata distrugge tutto il raccolto. Un anno di lavoro per niente.'), m(e, { moral: [-9, -4], media: [-2, -1] })) },
      { txt: L('Coger las bayas y seguir', 'Grab the berries and move on', 'Prendere le bacche e proseguire'), sub: L('No tienes tiempo para esto.', 'You don\'t have time for this.', 'Non hai tempo per questo.'), icono: 'sitrus',
        efecto: e => efecto(L(`Llenas la mochila y sigues camino. ${objeto(e, 'zidra')}`, `You fill your bag and move on. ${objeto(e, 'zidra')}`, `Riempi lo zaino e prosegui. ${objeto(e, 'zidra')}`), m(e, { salud: [2, 5] })) },
      { txt: L('Venderlo todo a un vivero', 'Sell it all to a nursery', 'Vendere tutto a un vivaio'), sub: L('Dinero rápido.', 'Quick money.', 'Soldi veloci.'),
        efecto: e => efecto(L('El vivero paga bien por las semillas. La señora no te vuelve a saludar.', 'The nursery pays well for the seeds. The owner never greets you again.', 'Il vivaio paga bene per i semi. La signora non ti saluta più.'), m(e, { dinero: [18000, 45000], moral: [-4, -1] })) },
    ],
  },
  {
    id: 'apodo', etapas: ['novato', 'gimnasios'], peso: 10, unico: true,
    titulo: L('La prensa local', 'The local press', 'La stampa locale'),
    texto: e => L(`${elegir(['Rafa Pokémon', 'la revista Poké-Semanal', 'Radio ' + e.regionNombre])} quiere tu primera entrevista.`,
      `${elegir(['Rafa Pokémon', 'Poké-Weekly magazine', 'Radio ' + e.regionNombre])} wants your first interview.`,
      `${elegir(['Rafa Pokémon', 'la rivista Poké-Settimanale', 'Radio ' + e.regionNombre])} vuole la tua prima intervista.`),
    opciones: [
      { txt: L('Prometer que serás Campeón', 'Promise you\'ll be Champion', 'Promettere che sarai Campione'), sub: L('Titular garantizado.', 'Guaranteed headline.', 'Titolo garantito.'), riesgo: 0.6,
        efecto: (e, ok) => { e.flags.bocazas = true; return ok
          ? efecto(L('"EL CHAVAL QUE VA A GANARLO TODO". La región entera te conoce en una semana.', '"THE KID WHO\'S GOING TO WIN IT ALL." The whole region knows you within a week.', '"IL RAGAZZO CHE VINCERÀ TUTTO". Tutta la regione ti conosce in una settimana.'), m(e, { fama: [10, 18], moral: [3, 8] }))
          : efecto(L('El titular sale en clave de burla. Ahora eres el chiste del circuito.', 'The headline comes out as a joke. Now you\'re the circuit\'s laughingstock.', 'Il titolo esce in chiave di scherno. Ora sei la barzelletta del circuito.'), m(e, { fama: [3, 7], moral: [-11, -5] })); } },
      { txt: L('Hablar de tus Pokémon', 'Talk about your Pokémon', 'Parlare dei tuoi Pokémon'), sub: L('Humildad.', 'Humility.', 'Umiltà.'),
        efecto: e => efecto(L('El artículo sale pequeño, pero tus Pokémon salen en la foto. Ellos lo notan.', 'The article is small, but your Pokémon are in the photo. They notice.', 'L\'articolo è piccolo, ma i tuoi Pokémon sono nella foto. Loro lo notano.'), m(e, { vinculo: [6, 11], fama: [1, 5] })) },
      { txt: L('Rechazarla y entrenar', 'Decline and train', 'Rifiutare e allenarsi'), sub: L('A lo tuyo.', 'Stick to your own thing.', 'Pensa ai fatti tuoi.'),
        efecto: e => efecto(L('Ese día lo dedicas al campo de entrenamiento. Nadie escribe sobre ti.', 'You spend that day at the training field. Nobody writes about you.', 'Dedichi quel giorno al campo di allenamento. Nessuno scrive di te.'), m(e, { media: [1, 3] })) },
    ],
  },

  // ── GIMNASIOS / LIGA ───────────────────────────────────────────────────────
  {
    id: 'rival_reta', etapas: ['gimnasios', 'liga', 'pro'], peso: 22,
    cond: e => e.rival.activo && activos(e).length >= 2,
    titulo: e => L(`${e.rival.nombre} te corta el paso`, `${e.rival.nombre} blocks your way`, `${e.rival.nombre} ti sbarra la strada`),
    texto: e => L(`"Uno contra uno. Si pierdes, me das a tu ${masFuerte(e).nombre}." ${e.rival.nombre} lleva todo el año siguiéndote la pista.`,
      `"One on one. If you lose, you give me your ${masFuerte(e).nombre}." ${e.rival.nombre} has been tracking you all year.`,
      `"Uno contro uno. Se perdi, mi dai il tuo ${masFuerte(e).nombre}." ${e.rival.nombre} ti tiene d'occhio da tutto l'anno.`),
    opciones: [
      { txt: L('Aceptar la apuesta', 'Accept the bet', 'Accettare la scommessa'), sub: L('Alto riesgo, alto premio.', 'High risk, high reward.', 'Alto rischio, alta ricompensa.'), riesgo: 0.5,
        efecto: (e, ok) => {
          const mio = masFuerte(e);
          if (ok) { e.rival.derrotasTuyas++; const p = capturaAleatoria(e, { rarezaMin: 'raro' });
            return efecto(L(`${mio.nombre} lo barre. ${e.rival.nombre} cumple y te entrega su ${p?.nombre ?? 'orgullo'}.`,
              `${mio.nombre} sweeps them. ${e.rival.nombre} keeps their word and hands over their ${p?.nombre ?? 'pride'}.`,
              `${mio.nombre} lo spazza via. ${e.rival.nombre} mantiene la parola e ti consegna il suo ${p?.nombre ?? 'orgoglio'}.`), m(e, { fama: [5, 11], moral: [8, 15] })); }
          mio.retirado = true; e.rival.victoriasSuyas++;
          return efecto(L(`Pierdes. Entregas a ${mio.nombre} sin mirarle a los ojos.`,
            `You lose. You hand over ${mio.nombre} without looking them in the eye.`,
            `Perdi. Consegni ${mio.nombre} senza guardarlo negli occhi.`), m(e, { moral: [-22, -12], vinculo: [-11, -5] }));
        } },
      { txt: L('Combatir sin apostar', 'Battle without betting', 'Combattere senza scommettere'), sub: L('Orgullo, no cromos.', 'Pride, not trading cards.', 'Orgoglio, non figurine.'), riesgo: 0.6,
        efecto: (e, ok) => ok
          ? (e.rival.derrotasTuyas++, efecto(L(`Ganas limpio. ${e.rival.nombre} escupe al suelo y se va.`, `You win clean. ${e.rival.nombre} spits on the ground and leaves.`, `Vinci pulito. ${e.rival.nombre} sputa per terra e se ne va.`), m(e, { fama: [3, 7], moral: [5, 11] })))
          : (e.rival.victoriasSuyas++, efecto(L('Pierdes, pero sales entero y aprendes de cada turno.', 'You lose, but you come out intact and learn from every turn.', 'Perdi, ma esci intero e impari da ogni turno.'), m(e, { estrategia: [4, 8], moral: [-6, -2] }))) },
      { txt: L('Ignorarle', 'Ignore him', 'Ignorarlo'), sub: L('No es tu problema.', 'Not your problem.', 'Non è un tuo problema.'),
        efecto: e => efecto(L(`${e.rival.nombre} grita algo a tu espalda. Tú ya piensas en el combate de verdad.`,
          `${e.rival.nombre} yells something behind your back. You're already thinking about the real battle.`,
          `${e.rival.nombre} ti grida qualcosa alle spalle. Tu stai già pensando al combattimento vero.`), m(e, { estrategia: [2, 6], fama: [-3, -1] })) },
    ],
  },
  {
    id: 'vitaminas', etapas: ['gimnasios', 'liga', 'pro', 'cima'], peso: 16, unico: true,
    titulo: L('El preparador con demasiada sonrisa', 'The trainer with too big a smile', 'Il preparatore con troppo sorriso'),
    texto: () => L('Te ofrece "potenciadores experimentales". No están en la lista de permitidos. Nadie lo sabría. Casi nadie.',
      'He offers you "experimental boosters." They\'re not on the approved list. Nobody would know. Almost nobody.',
      'Ti offre "potenziatori sperimentali". Non sono nella lista consentita. Nessuno lo saprebbe. Quasi nessuno.'),
    opciones: [
      { txt: L('Usarlos', 'Use them', 'Usarli'), sub: L('Todos lo hacen, dice.', 'Everyone does it, he says.', 'Lo fanno tutti, dice.'), icono: 'life-orb', riesgo: 0.6,
        efecto: (e, ok) => { e.flags.dopaje = true;
          if (ok) { mediaTemporal(e, 6, 2);
            return efecto(L('Vuelas media temporada y nadie sospecha. Duermes mal, pero ganas.', 'You fly for half a season and nobody suspects. You sleep badly, but you win.', 'Voli per mezza stagione e nessuno sospetta. Dormi male, ma vinci.'), m(e, { salud: [-12, -5], vinculo: [-9, -3], mediaTexto: 6 })); }
          e.flags.sancionado = true; e.flags.sancionadoAños = 2; e.flags.exsancionado = true;
          return efecto(L('Llega el control antidopaje. Dos años fuera y tu nombre por el barro.', 'The doping control arrives. Two years out and your name dragged through the mud.', 'Arriva il controllo antidoping. Due anni fuori e il tuo nome nel fango.'), m(e, { media: [2, 5], fama: [-34, -22], moral: [-24, -14] })); } },
      { txt: L('Rechazarlos y denunciarlo', 'Refuse and report him', 'Rifiutare e denunciarlo'), sub: L('Hay una línea.', 'There\'s a line.', 'C\'è un limite.'), riesgo: 0.75,
        efecto: (e, ok) => { e.flags.heroe = true; return ok
          ? efecto(L('La federación abre expediente y caen media docena de entrenadores.', 'The federation opens a case and half a dozen trainers go down.', 'La federazione apre un fascicolo e cadono una mezza dozzina di allenatori.'), m(e, { fama: [8, 15], moral: [5, 11], estrategia: [1, 4] }))
          : efecto(L('Nadie te cree y el preparador sigue trabajando. Te ganas enemigos por nada.', 'Nobody believes you and the trainer keeps working. You make enemies for nothing.', 'Nessuno ti crede e il preparatore continua a lavorare. Ti fai nemici per niente.'), m(e, { fama: [-6, -2], moral: [-5, -1] })); } },
      { txt: L('Decir que no y callarte', 'Say no and stay quiet', 'Dire di no e stare zitto'), sub: L('Ni sí, ni escándalo.', 'Neither yes nor a scandal.', 'Né sì, né scandalo.'),
        efecto: e => efecto(L('Sigues a lo tuyo. Meses después sancionan al preparador igualmente.', 'You go about your business. Months later the trainer gets suspended anyway.', 'Vai avanti per la tua strada. Mesi dopo il preparatore viene comunque sospeso.'), m(e, { moral: [2, 6], vinculo: [2, 6] })) },
    ],
  },
  {
    id: 'lesion_socio', etapas: ['gimnasios', 'liga', 'pro', 'cima'], peso: 18, cond: e => !!socioDe(e),
    titulo: L('El diagnóstico', 'The diagnosis', 'La diagnosi'),
    texto: e => L(`${socioDe(e).nombre} cae en pleno combate. En el Centro Pokémon son claros: puede seguir, pero forzarlo tiene riesgo.`,
      `${socioDe(e).nombre} collapses mid-battle. At the Pokémon Center they're clear: it can keep going, but forcing it carries risk.`,
      `${socioDe(e).nombre} crolla in pieno combattimento. Al Centro Pokémon sono chiari: può continuare, ma forzarlo comporta un rischio.`),
    opciones: [
      { txt: L('Retirarlo la temporada', 'Rest it for the season', 'Ritirarlo per la stagione'), sub: L('Su salud primero.', 'Its health first.', 'Prima la sua salute.'),
        efecto: e => { const s = socioDe(e); s.vinculo = limitar(s.vinculo + rango(10, 20));
          return efecto(L('Lo apartas. Compites peor sin él, pero vuelve entero.', 'You bench it. You compete worse without it, but it comes back whole.', 'Lo metti da parte. Competi peggio senza di lui, ma torna intero.'), m(e, { media: [-4, -1], vinculo: [8, 15], moral: [2, 6] })); } },
      { txt: L('Analgésicos y a jugar', 'Painkillers and play on', 'Antidolorifici e si gioca'), sub: L('Queda media temporada.', 'Half a season left.', 'Resta mezza stagione.'), icono: 'hyper-potion', riesgo: 0.5,
        efecto: (e, ok) => { const s = socioDe(e);
          if (ok) return efecto(L('Aguanta de sobra y ganáis. El susto queda en nada y vuelve más fuerte.', 'It holds up fine and you win. The scare comes to nothing and it comes back stronger.', 'Regge alla grande e vincete. Lo spavento non porta a nulla e torna più forte.'), m(e, { fama: [5, 11], media: [1, 3] }));
          s.forma -= rango(4, 9); e.flags.lesionCronica = true;
          return efecto(L(`Se rompe del todo. ${s.nombre} ya nunca vuelve a moverse en combate igual.`,
            `It breaks down completely. ${s.nombre} never moves the same way in battle again.`,
            `Si rompe del tutto. ${s.nombre} non si muove più allo stesso modo in combattimento.`), m(e, { vinculo: [-14, -7], salud: [-9, -3], media: [-3, -1] })); } },
      { txt: L('Sacar a los suplentes', 'Bring in the backups', 'Schierare le riserve'), sub: L('Confiar en el resto del equipo.', 'Trust the rest of the team.', 'Fidati del resto della squadra.'),
        efecto: e => { for (const p of activos(e)) p.vinculo = limitar(p.vinculo + rango(3, 9));
          return efecto(L('El equipo entero da un paso adelante. No dependías de uno solo.', 'The whole team steps up. You didn\'t depend on just one.', 'Tutta la squadra fa un passo avanti. Non dipendevi da uno solo.'), m(e, { estrategia: [5, 10], vinculo: [4, 9] })); } },
    ],
  },
  {
    id: 'villano', etapas: ['gimnasios', 'liga', 'pro'], peso: 15, unico: true,
    preparar: e => { e._villano = villanoDe(e.region); },
    titulo: e => L(`${(e._villano ?? villanoDe(e.region)).equipo.replace(/^el |^la /, '').replace(/^./, c => c.toUpperCase())} en el puerto`, `${(e._villano ?? villanoDe(e.region)).equipo.replace(/^el |^la /, '').replace(/^./, c => c.toUpperCase())} en el puerto`, `${(e._villano ?? villanoDe(e.region)).equipo.replace(/^el |^la /, '').replace(/^./, c => c.toUpperCase())} en el puerto`),
    texto: e => { const v = e._villano ?? villanoDe(e.region);
      return `Descubres a ${v.equipo} robando Pokémon en el puerto de ${e.regionNombre}. ${v.nombre} en persona supervisa la operación.`; },
    opciones: [
      { txt: L('Entrar tú solo', 'Entrar tú solo', 'Entrar tú solo'), sub: L('No hay tiempo.', 'No hay tiempo.', 'No hay tiempo.'), riesgo: 0.55,
        efecto: (e, ok) => { const v = e._villano ?? villanoDe(e.region);
          if (ok) { e.flags.heroe = true; hito(e, '🦸', `Frenó a ${v.nombre} en el puerto`);
            const p = capturaAleatoria(e, { rarezaMin: 'raro' });
            return efecto(L(`Los detienes. Uno de los liberados, un ${p?.nombre ?? 'superviviente'}, no se separa de ti.`, `Los detienes. Uno de los liberados, un ${p?.nombre ?? 'superviviente'}, no se separa de ti.`, `Los detienes. Uno de los liberados, un ${p?.nombre ?? 'superviviente'}, no se separa de ti.`), m(e, { fama: [14, 24], moral: [8, 16], salud: [-11, -4] })); }
          return efecto(L(`Los hombres de ${v.nombre} te dan una paliza. Tres semanas en el hospital.`, `Los hombres de ${v.nombre} te dan una paliza. Tres semanas en el hospital.`, `Los hombres de ${v.nombre} te dan una paliza. Tres semanas en el hospital.`), m(e, { salud: [-26, -16], moral: [-13, -6] })); } },
      { txt: L('Llamar a la Agente Mara', 'Llamar a la Agente Mara', 'Llamar a la Agente Mara'), sub: L('Lo correcto y lo aburrido.', 'Lo correcto y lo aburrido.', 'Lo correcto y lo aburrido.'),
        efecto: e => { e.flags.heroe = true; return efecto(L('La redada es un éxito. Sales en las noticias como "testigo".', 'La redada es un éxito. Sales en las noticias como "testigo".', 'La redada es un éxito. Sales en las noticias como "testigo".'), m(e, { fama: [4, 10], moral: [3, 8] })); } },
      { txt: L('Aceptar su dinero por callarte', 'Aceptar su dinero por callarte', 'Aceptar su dinero por callarte'), sub: L('Nadie te paga la carrera.', 'Nadie te paga la carrera.', 'Nadie te paga la carrera.'),
        efecto: e => { e.flags.traicion = true; return efecto(L('Un maletín y una noche sin dormir. La carrera se financia sola desde hoy.', 'Un maletín y una noche sin dormir. La carrera se financia sola desde hoy.', 'Un maletín y una noche sin dormir. La carrera se financia sola desde hoy.'), m(e, { dinero: [180000, 320000], moral: [-20, -12], fama: [-6, -1] })); } },
    ],
  },
  {
    id: 'mercader', etapas: ['gimnasios', 'liga', 'pro', 'cima'], peso: 16,
    titulo: L('El mercader del mercadillo', 'El mercader del mercadillo', 'El mercader del mercadillo'),
    texto: e => L(`Un puesto lleno de objetos de entrenamiento en el mercadillo de ${e.regionNombre}. Llevas ${e.dinero.toLocaleString('es')} ₽.`, `Un puesto lleno de objetos de entrenamiento en el mercadillo de ${e.regionNombre}. Llevas ${e.dinero.toLocaleString('es')} ₽.`, `Un puesto lleno de objetos de entrenamiento en el mercadillo de ${e.regionNombre}. Llevas ${e.dinero.toLocaleString('es')} ₽.`),
    opciones: [
      { txt: L('Comprar lo mejor que tenga', 'Comprar lo mejor que tenga', 'Comprar lo mejor que tenga'), sub: L('Caro, pero de verdad.', 'Caro, pero de verdad.', 'Caro, pero de verdad.'), icono: 'choice-band',
        cond: e => e.dinero >= 40000,
        efecto: e => { const o = objetoAleatorio(e); return efecto(L(`Te llevas ${o?.nombre ?? 'un cacharro inútil'}. ${o?.desc ?? ''}`, `Te llevas ${o?.nombre ?? 'un cacharro inútil'}. ${o?.desc ?? ''}`, `Te llevas ${o?.nombre ?? 'un cacharro inútil'}. ${o?.desc ?? ''}`), m(e, { dinero: -rango(30000, 60000) })); } },
      { txt: L('Regatear por un lote', 'Regatear por un lote', 'Regatear por un lote'), sub: L('A ver qué sale.', 'A ver qué sale.', 'A ver qué sale.'), riesgo: 0.55,
        efecto: (e, ok) => { if (ok) { const a = objetoAleatorio(e), b = objetoAleatorio(e);
            return efecto(L(`Sacas dos: ${[a?.nombre, b?.nombre].filter(Boolean).join(' y ')}.`, `Sacas dos: ${[a?.nombre, b?.nombre].filter(Boolean).join(' y ')}.`, `Sacas dos: ${[a?.nombre, b?.nombre].filter(Boolean).join(' y ')}.`), m(e, { dinero: -rango(10000, 25000), estrategia: [1, 4] })); }
          return efecto(L('El lote era basura de imitación. Tiras el dinero.', 'El lote era basura de imitación. Tiras el dinero.', 'El lote era basura de imitación. Tiras el dinero.'), m(e, { dinero: -rango(8000, 20000), moral: [-5, -1] })); } },
      { txt: L('No comprar nada', 'No comprar nada', 'No comprar nada'), sub: L('Guardas el dinero.', 'Guardas el dinero.', 'Guardas el dinero.'),
        efecto: e => efecto(L('Sales del mercadillo con la cartera intacta y algo de dignidad.', 'Sales del mercadillo con la cartera intacta y algo de dignidad.', 'Sales del mercadillo con la cartera intacta y algo de dignidad.'), m(e, { moral: [1, 3] })) },
    ],
  },
  {
    id: 'profesor_beca', etapas: ['gimnasios', 'liga', 'pro'], peso: 14, unico: true,
    titulo: e => L(`Te llama ${profesorDe(e.region)}`, `Te llama ${profesorDe(e.region)}`, `Te llama ${profesorDe(e.region)}`),
    texto: e => L(`${profesorDe(e.region).replace(/^el |^la /, '').replace(/^./, c => c.toUpperCase())} quiere que participes en un programa de entrenamiento experimental. Un año entero de laboratorio y campo.`, `${profesorDe(e.region).replace(/^el |^la /, '').replace(/^./, c => c.toUpperCase())} quiere que participes en un programa de entrenamiento experimental. Un año entero de laboratorio y campo.`, `${profesorDe(e.region).replace(/^el |^la /, '').replace(/^./, c => c.toUpperCase())} quiere que participes en un programa de entrenamiento experimental. Un año entero de laboratorio y campo.`),
    opciones: [
      { txt: L('Entrar en el programa', 'Entrar en el programa', 'Entrar en el programa'), sub: L('Un año sin competir.', 'Un año sin competir.', 'Un año sin competir.'), riesgo: 0.7,
        efecto: (e, ok) => ok
          ? efecto(L('Sales del programa con métodos que nadie más conoce. A partir de ahora aprendes más rápido que nadie.', 'Sales del programa con métodos que nadie más conoce. A partir de ahora aprendes más rápido que nadie.', 'Sales del programa con métodos que nadie más conoce. A partir de ahora aprendes más rápido que nadie.'), m(e, { talento: [4, 9], estrategia: [5, 10], fama: [-6, -2] }))
          : efecto(L('El programa se cancela a mitad por falta de fondos. Pierdes el año.', 'El programa se cancela a mitad por falta de fondos. Pierdes el año.', 'El programa se cancela a mitad por falta de fondos. Pierdes el año.'), m(e, { fama: [-9, -4], moral: [-7, -3], estrategia: [1, 3] })) },
      { txt: L('Colaborar los fines de semana', 'Colaborar los fines de semana', 'Colaborar los fines de semana'), sub: L('Sin dejar el circuito.', 'Sin dejar el circuito.', 'Sin dejar el circuito.'),
        efecto: e => efecto(L('Compaginas laboratorio y torneos. Duermes poco pero aprendes.', 'Compaginas laboratorio y torneos. Duermes poco pero aprendes.', 'Compaginas laboratorio y torneos. Duermes poco pero aprendes.'), m(e, { talento: [1, 3], estrategia: [3, 7], salud: [-5, -1] })) },
      { txt: L('Rechazarlo', 'Rechazarlo', 'Rechazarlo'), sub: L('Tú viniste a combatir.', 'Tú viniste a combatir.', 'Tú viniste a combatir.'),
        efecto: e => efecto(L('Le dices que no con educación. Se queda con cara de no entender nada.', 'Le dices que no con educación. Se queda con cara de no entender nada.', 'Le dices que no con educación. Se queda con cara de no entender nada.'), m(e, { media: [1, 3] })) },
    ],
  },

  // ── REGIÓN Y CARRERA ───────────────────────────────────────────────────────
  {
    id: 'oferta_gimnasio', etapas: ['liga', 'pro', 'cima', 'veterano'], peso: 18,
    cond: e => e.stats.fama >= 30 && !e.flags.liderGimnasio,
    preparar: e => { e._lider = liderDe(e.region); },
    // Vito y Leti son dos, así que el verbo tiene que concordar
    titulo: e => { const l = e._lider ?? liderDe(e.region); return `${l.nombre} se retira${l.plural ? 'n' : ''}`; },
    texto: e => { const l = e._lider ?? liderDe(e.region);
      return `El gimnasio de tipo ${TIPOS[l.tipo]?.nombre ?? l.tipo} de ${e.regionNombre} se queda sin líder y la Liga te ofrece la plaza. Sueldo fijo, casa y dejar de viajar.`; },
    opciones: [
      { txt: L('Aceptar el gimnasio', 'Aceptar el gimnasio', 'Aceptar el gimnasio'), sub: L('Echar raíces aquí.', 'Echar raíces aquí.', 'Echar raíces aquí.'),
        efecto: e => { e.flags.liderGimnasio = true; hito(e, '🏛️', `Líder de Gimnasio en ${e.regionNombre}`);
          return efecto(L('Te sientas al otro lado del combate. Ahora los críos vienen a por ti.', 'Te sientas al otro lado del combate. Ahora los críos vienen a por ti.', 'Te sientas al otro lado del combate. Ahora los críos vienen a por ti.'), m(e, { dinero: [120000, 240000], fama: [7, 14], moral: [5, 12], media: [-3, -1] })); } },
      { txt: L('Rechazar y seguir compitiendo', 'Rechazar y seguir compitiendo', 'Rechazar y seguir compitiendo'), sub: L('Aún te queda.', 'Aún te queda.', 'Aún te queda.'),
        efecto: e => efecto(L('Dices que no delante de las cámaras. La presión sube un escalón.', 'Dices que no delante de las cámaras. La presión sube un escalón.', 'Dices que no delante de las cámaras. La presión sube un escalón.'), m(e, { media: [1, 4], fama: [3, 8], moral: [-4, -1] })) },
      { txt: L('Pedir el puesto para cuando te retires', 'Pedir el puesto para cuando te retires', 'Pedir el puesto para cuando te retires'), sub: L('Firmar el futuro.', 'Firmar el futuro.', 'Firmar el futuro.'), riesgo: 0.6,
        efecto: (e, ok) => { if (ok) { e.flags.gimnasioReservado = true;
            return efecto(L('Acuerdan guardarte la plaza. Compites más tranquilo sabiendo que hay red.', 'Acuerdan guardarte la plaza. Compites más tranquilo sabiendo que hay red.', 'Acuerdan guardarte la plaza. Compites más tranquilo sabiendo que hay red.'), m(e, { moral: [7, 13], estrategia: [2, 5] })); }
          return efecto(L('La Liga no acepta reservas y se lo dan a otro. Te quedas sin gimnasio y sin excusa.', 'La Liga no acepta reservas y se lo dan a otro. Te quedas sin gimnasio y sin excusa.', 'La Liga no acepta reservas y se lo dan a otro. Te quedas sin gimnasio y sin excusa.'), m(e, { moral: [-8, -3], fama: [-4, -1] })); } },
    ],
  },
  {
    id: 'oferta_region', etapas: ['liga', 'pro', 'cima'], peso: 20,
    titulo: L('Oferta desde el extranjero', 'Oferta desde el extranjero', 'Oferta desde el extranjero'),
    texto: e => { const destino = elegir(REGIONES.filter(r => r.nombre !== e.regionNombre));
      e._destino = destino;
      return `Un circuito de ${destino.nombre} te quiere en su liga. Pagan por el traslado y por el cartel que llevas. Dejarías ${e.regionNombre} y tu público.`; },
    opciones: [
      { txt: L('Mudarte y competir allí', 'Mudarte y competir allí', 'Mudarte y competir allí'), sub: L('Empezar de cero, cobrando.', 'Empezar de cero, cobrando.', 'Empezar de cero, cobrando.'), riesgo: 0.65,
        efecto: (e, ok) => { const d = mudarse(e, e._destino?.nombre);
          hito(e, '✈️', `Se mudó a ${d?.nombre ?? 'otra región'}`);
          if (ok) { const p = capturaAleatoria(e, { rarezaMin: 'raro', region: d?.id });
            return efecto(L(`${d?.nombre} te adopta rápido. Un ${p?.nombre ?? 'compañero local'} se une al equipo.`, `${d?.nombre} te adopta rápido. Un ${p?.nombre ?? 'compañero local'} se une al equipo.`, `${d?.nombre} te adopta rápido. Un ${p?.nombre ?? 'compañero local'} se une al equipo.`), m(e, { dinero: [150000, 400000], media: [2, 5], estrategia: [4, 9], fama: [-9, -3] })); }
          return efecto(L(`En ${d?.nombre} nadie te conoce y el estilo de combate es otro. Tardas en encontrarte.`, `En ${d?.nombre} nadie te conoce y el estilo de combate es otro. Tardas en encontrarte.`, `En ${d?.nombre} nadie te conoce y el estilo de combate es otro. Tardas en encontrarte.`), m(e, { dinero: [150000, 400000], fama: [-16, -9], moral: [-10, -4], estrategia: [2, 5] })); } },
      { txt: L('Ir cedido un año', 'Ir cedido un año', 'Ir cedido un año'), sub: L('Probar sin romper nada.', 'Probar sin romper nada.', 'Probar sin romper nada.'),
        efecto: e => efecto(L('Un año fuera aprendiendo métodos que aquí nadie ha visto, y de vuelta a casa.', 'Un año fuera aprendiendo métodos que aquí nadie ha visto, y de vuelta a casa.', 'Un año fuera aprendiendo métodos que aquí nadie ha visto, y de vuelta a casa.'), m(e, { estrategia: [7, 13], talento: [1, 4], dinero: [40000, 90000] })) },
      { txt: L('Quedarte', 'Quedarte', 'Quedarte'), sub: L('Aquí eres alguien.', 'Aquí eres alguien.', 'Aquí eres alguien.'),
        efecto: e => efecto(L('Te quedas en casa. Tu gente lo agradece cada vez que sales al estadio.', 'Te quedas en casa. Tu gente lo agradece cada vez que sales al estadio.', 'Te quedas en casa. Tu gente lo agradece cada vez que sales al estadio.'), m(e, { fama: [6, 12], moral: [5, 11], vinculo: [2, 6] })) },
    ],
  },
  {
    id: 'exhibicion_campeon', etapas: ['pro', 'cima', 'veterano'], peso: 14,
    cond: e => e.stats.fama >= 45,
    titulo: e => L(`Exhibición contra ${campeonDe(e.region)}`, `Exhibición contra ${campeonDe(e.region)}`, `Exhibición contra ${campeonDe(e.region)}`),
    texto: e => L(`${campeonDe(e.region)}, campeón de ${e.regionNombre}, acepta un combate de exhibición contigo. Estadio lleno y televisión en directo.`, `${campeonDe(e.region)}, campeón de ${e.regionNombre}, acepta un combate de exhibición contigo. Estadio lleno y televisión en directo.`, `${campeonDe(e.region)}, campeón de ${e.regionNombre}, acepta un combate de exhibición contigo. Estadio lleno y televisión en directo.`),
    opciones: [
      { txt: L('Ir con todo', 'Ir con todo', 'Ir con todo'), sub: L('Ganarle delante de todos.', 'Ganarle delante de todos.', 'Ganarle delante de todos.'), riesgo: 0.4,
        efecto: (e, ok) => ok
          ? (hito(e, '⭐', `Venció a ${campeonDe(e.region)} en exhibición`),
             efecto(L(`Le ganas. El estadio no se lo cree y tú tampoco.`, `Le ganas. El estadio no se lo cree y tú tampoco.`, `Le ganas. El estadio no se lo cree y tú tampoco.`), m(e, { fama: [16, 28], moral: [12, 20], media: [2, 5], talento: [1, 4] })))
          : efecto(L('Te pasa por encima en cuatro turnos. Aprendes más de esa derrota que de diez victorias.', 'Te pasa por encima en cuatro turnos. Aprendes más de esa derrota que de diez victorias.', 'Te pasa por encima en cuatro turnos. Aprendes más de esa derrota que de diez victorias.'), m(e, { estrategia: [6, 11], moral: [-8, -3], fama: [1, 4] })) },
      { txt: L('Combate de estudio', 'Combate de estudio', 'Combate de estudio'), sub: L('Probar cosas, sin presión.', 'Probar cosas, sin presión.', 'Probar cosas, sin presión.'),
        efecto: e => efecto(L('Usas el combate para probar estrategias raras. Pierdes, pero sales con ideas.', 'Usas el combate para probar estrategias raras. Pierdes, pero sales con ideas.', 'Usas el combate para probar estrategias raras. Pierdes, pero sales con ideas.'), m(e, { estrategia: [7, 12], talento: [1, 3] })) },
      { txt: L('Declinar', 'Declinar', 'Declinar'), sub: L('No estás para circos.', 'No estás para circos.', 'No estás para circos.'),
        efecto: e => efecto(L('Dices que no. La prensa lo interpreta como miedo.', 'Dices que no. La prensa lo interpreta como miedo.', 'Dices que no. La prensa lo interpreta como miedo.'), m(e, { fama: [-8, -3], media: [1, 3] })) },
    ],
  },
  {
    id: 'patrocinio', etapas: ['pro', 'cima'], peso: 18, unico: true, cond: e => e.stats.fama >= 35,
    titulo: L('Contrato con Devon Corp.', 'Contrato con Devon Corp.', 'Contrato con Devon Corp.'),
    texto: () => L('Un contrato de imagen enorme. La letra pequeña dice que ellos deciden en qué torneos compites.', 'Un contrato de imagen enorme. La letra pequeña dice que ellos deciden en qué torneos compites.', 'Un contrato de imagen enorme. La letra pequeña dice que ellos deciden en qué torneos compites.'),
    opciones: [
      { txt: L('Firmar', 'Firmar', 'Firmar'), sub: L('Dinero de verdad.', 'Dinero de verdad.', 'Dinero de verdad.'), icono: 'amulet-coin',
        efecto: e => { e.flags.patrocinio = true; darObjeto(e, 'amuleto');
          return efecto(L('Te forras. También compites en torneos irrelevantes en la otra punta del mundo.', 'Te forras. También compites en torneos irrelevantes en la otra punta del mundo.', 'Te forras. También compites en torneos irrelevantes en la otra punta del mundo.'), m(e, { dinero: [300000, 600000], fama: [8, 16], media: [-4, -1], salud: [-8, -3] })); } },
      { txt: L('Negociar libertad deportiva', 'Negociar libertad deportiva', 'Negociar libertad deportiva'), sub: L('Menos dinero, tus reglas.', 'Menos dinero, tus reglas.', 'Menos dinero, tus reglas.'), riesgo: 0.6,
        efecto: (e, ok) => ok
          ? (e.flags.patrocinio = true, efecto(L('Aceptan tus condiciones: cobras la mitad y eliges calendario.', 'Aceptan tus condiciones: cobras la mitad y eliges calendario.', 'Aceptan tus condiciones: cobras la mitad y eliges calendario.'), m(e, { dinero: [140000, 260000], fama: [5, 11], estrategia: [2, 6] })))
          : efecto(L('Se levantan de la mesa y firman con otro, que sale en todos los anuncios.', 'Se levantan de la mesa y firman con otro, que sale en todos los anuncios.', 'Se levantan de la mesa y firman con otro, que sale en todos los anuncios.'), m(e, { fama: [-8, -3], moral: [-6, -2] })) },
      { txt: L('Montar tu propia escuela', 'Montar tu propia escuela', 'Montar tu propia escuela'), sub: L('Ser tu propio jefe.', 'Ser tu propio jefe.', 'Ser tu propio jefe.'),
        efecto: e => { e.flags.escuela = true; hito(e, '🏫', 'Fundó su propia escuela de entrenadores');
          return efecto(L('Abres un centro con tu nombre. Se llena de críos en dos meses.', 'Abres un centro con tu nombre. Se llena de críos en dos meses.', 'Abres un centro con tu nombre. Se llena de críos en dos meses.'), m(e, { dinero: -rango(60000, 120000), fama: [4, 9], moral: [7, 14], estrategia: [5, 10] })); } },
    ],
  },
  {
    id: 'legendario', etapas: ['pro', 'cima'], peso: 12, unico: true, cond: e => e.stats.fama >= 45,
    titulo: L('La montaña se ha despertado', 'La montaña se ha despertado', 'La montaña se ha despertado'),
    texto: e => L(`Un fenómeno atmosférico sobre ${e.regionNombre}. En el ojo de la tormenta hay un Pokémon que la mitología daba por leyenda, y tú estás más cerca que nadie.`, `Un fenómeno atmosférico sobre ${e.regionNombre}. En el ojo de la tormenta hay un Pokémon que la mitología daba por leyenda, y tú estás más cerca que nadie.`, `Un fenómeno atmosférico sobre ${e.regionNombre}. En el ojo de la tormenta hay un Pokémon que la mitología daba por leyenda, y tú estás más cerca que nadie.`),
    opciones: [
      { txt: L('Intentar capturarlo', 'Intentar capturarlo', 'Intentar capturarlo'), sub: L('La oportunidad de una vida.', 'La oportunidad de una vida.', 'La oportunidad de una vida.'), icono: 'master', riesgo: 0.45,
        efecto: (e, ok) => { if (ok) { const leg = elegir(LINEAS.filter(l => l.rareza === 'legendario'));
            const p = fichar(e, leg.id); hito(e, '⚡', `Capturó a ${p.nombre}`);
            return efecto(L(`La bola se queda quieta. ${p.nombre} es tuyo, y el mundo lo sabe en dos horas.`, `La bola se queda quieta. ${p.nombre} es tuyo, y el mundo lo sabe en dos horas.`, `La bola se queda quieta. ${p.nombre} es tuyo, y el mundo lo sabe en dos horas.`), m(e, { fama: [24, 38], media: [4, 9], talento: [3, 7], salud: [-12, -5] })); }
          return efecto(L('Tres horas de combate y se marcha volando. Tus Pokémon quedan destrozados.', 'Tres horas de combate y se marcha volando. Tus Pokémon quedan destrozados.', 'Tres horas de combate y se marcha volando. Tus Pokémon quedan destrozados.'), m(e, { salud: [-22, -12], moral: [-13, -6], fama: [3, 8] })); } },
      { txt: L('Estudiarlo y publicar los datos', 'Estudiarlo y publicar los datos', 'Estudiarlo y publicar los datos'), sub: L('Ciencia, no captura.', 'Ciencia, no captura.', 'Ciencia, no captura.'),
        efecto: e => { hito(e, '📚', 'Publicó el primer estudio de campo del fenómeno');
          return efecto(L('Tu informe es material de referencia. Te llaman "el entrenador que pensó".', 'Tu informe es material de referencia. Te llaman "el entrenador que pensó".', 'Tu informe es material de referencia. Te llaman "el entrenador que pensó".'), m(e, { estrategia: [10, 18], talento: [2, 5], fama: [8, 15], dinero: [40000, 80000] })); } },
      { txt: L('Evacuar el pueblo de al lado', 'Evacuar el pueblo de al lado', 'Evacuar el pueblo de al lado'), sub: L('Hay gente ahí abajo.', 'Hay gente ahí abajo.', 'Hay gente ahí abajo.'),
        efecto: e => { e.flags.heroe = true; hito(e, '🦸', 'Evacuó un pueblo entero durante la tormenta');
          return efecto(L('Sacas a doscientas personas antes de que el valle se inunde. Nadie muere.', 'Sacas a doscientas personas antes de que el valle se inunde. Nadie muere.', 'Sacas a doscientas personas antes de que el valle se inunde. Nadie muere.'), m(e, { fama: [15, 26], moral: [14, 22], salud: [-10, -4] })); } },
    ],
  },
  {
    id: 'mega', etapas: ['pro', 'cima'], peso: 13, unico: true, cond: e => activos(e).length >= 1,
    titulo: L('La piedra', 'La piedra', 'La piedra'),
    texto: e => L(`Un investigador te entrega una Megapiedra compatible con ${masFuerte(e).nombre}. Advierte del estrés brutal que supone.`, `Un investigador te entrega una Megapiedra compatible con ${masFuerte(e).nombre}. Advierte del estrés brutal que supone.`, `Un investigador te entrega una Megapiedra compatible con ${masFuerte(e).nombre}. Advierte del estrés brutal que supone.`),
    opciones: [
      { txt: L('Usarla en competición', 'Usarla en competición', 'Usarla en competición'), sub: L('Poder puro.', 'Poder puro.', 'Poder puro.'), icono: 'life-orb', riesgo: 0.65,
        efecto: (e, ok) => { const p = masFuerte(e);
          if (ok) { p.forma += rango(6, 12); hito(e, '💎', `Megaevolucionó a ${p.nombre} en directo`);
            return efecto(L(`${p.nombre} megaevoluciona ante 40.000 personas. El estadio se cae.`, `${p.nombre} megaevoluciona ante 40.000 personas. El estadio se cae.`, `${p.nombre} megaevoluciona ante 40.000 personas. El estadio se cae.`), m(e, { media: [3, 7], fama: [12, 20], vinculo: [-7, -2] })); }
          p.forma -= rango(3, 8);
          return efecto(L(`${p.nombre} no resiste el proceso y se desploma en pleno combate. Tardas meses en perdonártelo.`, `${p.nombre} no resiste el proceso y se desploma en pleno combate. Tardas meses en perdonártelo.`, `${p.nombre} no resiste el proceso y se desploma en pleno combate. Tardas meses en perdonártelo.`), m(e, { vinculo: [-16, -8], moral: [-13, -6], fama: [2, 6] })); } },
      { txt: L('Solo cuando él quiera', 'Solo cuando él quiera', 'Solo cuando él quiera'), sub: L('Preguntar primero.', 'Preguntar primero.', 'Preguntar primero.'),
        efecto: e => { const p = masFuerte(e); p.vinculo = limitar(p.vinculo + rango(12, 22)); p.forma += rango(3, 7);
          return efecto(L('Meses trabajando el vínculo antes de usarla. Cuando ocurre, es sincronía perfecta.', 'Meses trabajando el vínculo antes de usarla. Cuando ocurre, es sincronía perfecta.', 'Meses trabajando el vínculo antes de usarla. Cuando ocurre, es sincronía perfecta.'), m(e, { vinculo: [10, 18], media: [2, 5], fama: [5, 11] })); } },
      { txt: L('Devolverla', 'Devolverla', 'Devolverla'), sub: L('No a ese precio.', 'No a ese precio.', 'No a ese precio.'),
        efecto: e => efecto(L('El investigador no lo entiende. Tus Pokémon sí.', 'El investigador no lo entiende. Tus Pokémon sí.', 'El investigador no lo entiende. Tus Pokémon sí.'), m(e, { vinculo: [8, 14], moral: [4, 9] })) },
    ],
  },
  {
    id: 'amaño', etapas: ['pro', 'cima'], peso: 12, unico: true,
    titulo: L('La llamada de las tres de la mañana', 'La llamada de las tres de la mañana', 'La llamada de las tres de la mañana'),
    texto: () => L('Una cifra obscena por perder la semifinal. Dicen que ya han hablado con otros dos.', 'Una cifra obscena por perder la semifinal. Dicen que ya han hablado con otros dos.', 'Una cifra obscena por perder la semifinal. Dicen que ya han hablado con otros dos.'),
    opciones: [
      { txt: L('Aceptar', 'Aceptar', 'Aceptar'), sub: L('Nadie lo probaría.', 'Nadie lo probaría.', 'Nadie lo probaría.'), riesgo: 0.65,
        efecto: (e, ok) => { e.flags.traicion = true;
          if (ok) return efecto(L('Pierdes "sin querer". Cobras. Nunca vuelves a dormir del todo bien.', 'Pierdes "sin querer". Cobras. Nunca vuelves a dormir del todo bien.', 'Pierdes "sin querer". Cobras. Nunca vuelves a dormir del todo bien.'), m(e, { dinero: [350000, 650000], moral: [-16, -9], fama: [-6, -1] }));
          e.flags.sancionado = true; e.flags.sancionadoAños = 3; e.flags.exsancionado = true;
          return efecto(L('Un audio filtrado te hunde seis meses después. Tres años de sanción.', 'Un audio filtrado te hunde seis meses después. Tres años de sanción.', 'Un audio filtrado te hunde seis meses después. Tres años de sanción.'), m(e, { dinero: [350000, 650000], fama: [-44, -30], moral: [-28, -18] })); } },
      { txt: L('Grabar la llamada y entregarla', 'Grabar la llamada y entregarla', 'Grabar la llamada y entregarla'), sub: L('Que caigan todos.', 'Que caigan todos.', 'Que caigan todos.'),
        efecto: e => { e.flags.heroe = true; hito(e, '⚖️', 'Destapó una red de amaños en el circuito');
          return efecto(L('Cae media organización. Chivato en los grupos de jugadores, héroe en los periódicos.', 'Cae media organización. Chivato en los grupos de jugadores, héroe en los periódicos.', 'Cae media organización. Chivato en los grupos de jugadores, héroe en los periódicos.'), m(e, { fama: [11, 19], moral: [4, 9], estrategia: [2, 5] })); } },
      { txt: L('Colgar y ganar la semifinal', 'Colgar y ganar la semifinal', 'Colgar y ganar la semifinal'), sub: L('Silencio y trabajo.', 'Silencio y trabajo.', 'Silencio y trabajo.'), riesgo: 0.7,
        efecto: (e, ok) => ok
          ? efecto(L('Ganas la semifinal sin perder un solo combate. Esa es tu respuesta.', 'Ganas la semifinal sin perder un solo combate. Esa es tu respuesta.', 'Ganas la semifinal sin perder un solo combate. Esa es tu respuesta.'), m(e, { media: [2, 5], moral: [8, 14], fama: [4, 9] }))
          : efecto(L('Pierdes igual, limpiamente. Al menos puedes mirarte al espejo.', 'Pierdes igual, limpiamente. Al menos puedes mirarte al espejo.', 'Pierdes igual, limpiamente. Al menos puedes mirarte al espejo.'), m(e, { moral: [-6, -2], vinculo: [3, 7] })) },
    ],
  },
  {
    id: 'agotamiento', etapas: ['pro', 'cima', 'veterano'], peso: 16,
    cond: e => e.stats.salud < 62 || e.stats.moral < 52,
    titulo: L('No puedes más', 'No puedes más', 'No puedes más'),
    texto: () => L('Llevas años sin parar. Una mañana no consigues levantarte de la cama y no sabes por qué.', 'Llevas años sin parar. Una mañana no consigues levantarte de la cama y no sabes por qué.', 'Llevas años sin parar. Una mañana no consigues levantarte de la cama y no sabes por qué.'),
    opciones: [
      { txt: L('Parar una temporada', 'Parar una temporada', 'Parar una temporada'), sub: L('Desaparecer.', 'Desaparecer.', 'Desaparecer.'),
        efecto: e => efecto(L('Un año lejos de todo, sin cámaras, con tus Pokémon. Vuelves siendo otro.', 'Un año lejos de todo, sin cámaras, con tus Pokémon. Vuelves siendo otro.', 'Un año lejos de todo, sin cámaras, con tus Pokémon. Vuelves siendo otro.'), m(e, { salud: [18, 30], moral: [18, 30], fama: [-17, -9], media: [-4, -1] })) },
      { txt: L('Apretar los dientes', 'Apretar los dientes', 'Apretar los dientes'), sub: L('Los grandes no paran.', 'Los grandes no paran.', 'Los grandes no paran.'), riesgo: 0.45,
        efecto: (e, ok) => ok
          ? efecto(L('Aguantas el tirón y sales del pozo compitiendo. No sabes ni cómo.', 'Aguantas el tirón y sales del pozo compitiendo. No sabes ni cómo.', 'Aguantas el tirón y sales del pozo compitiendo. No sabes ni cómo.'), m(e, { media: [2, 5], fama: [4, 9], salud: [-8, -3] }))
          : efecto(L('Te rompes por dentro en mitad de la temporada. Todo se cae a la vez.', 'Te rompes por dentro en mitad de la temporada. Todo se cae a la vez.', 'Te rompes por dentro en mitad de la temporada. Todo se cae a la vez.'), m(e, { salud: [-16, -9], moral: [-16, -9], media: [-4, -1] })) },
      { txt: L('Buscar ayuda profesional', 'Buscar ayuda profesional', 'Buscar ayuda profesional'), sub: L('Hablarlo con alguien.', 'Hablarlo con alguien.', 'Hablarlo con alguien.'), icono: 'shell-bell',
        efecto: e => efecto(L('Terapia, descanso pautado, calendario reducido. Funciona mejor de lo que esperabas.', 'Terapia, descanso pautado, calendario reducido. Funciona mejor de lo que esperabas.', 'Terapia, descanso pautado, calendario reducido. Funciona mejor de lo que esperabas.'), m(e, { salud: [10, 18], moral: [14, 24], estrategia: [3, 7] })) },
    ],
  },
  {
    id: 'entrenamiento', etapas: TODAS, peso: 20, cond: e => activos(e).length >= 1,
    titulo: L('Pretemporada', 'Pretemporada', 'Pretemporada'),
    texto: () => L('Seis semanas antes de que empiece todo. Toca decidir cómo se prepara el equipo.', 'Seis semanas antes de que empiece todo. Toca decidir cómo se prepara el equipo.', 'Seis semanas antes de que empiece todo. Toca decidir cómo se prepara el equipo.'),
    opciones: [
      { txt: L('Carga brutal en la montaña', 'Carga brutal en la montaña', 'Carga brutal en la montaña'), sub: L('Sin excusas.', 'Sin excusas.', 'Sin excusas.'), icono: 'muscle-band', riesgo: 0.72,
        efecto: (e, ok) => ok
          ? efecto(L('Salís de allí en otro nivel. El cuerpo aguantó.', 'Salís de allí en otro nivel. El cuerpo aguantó.', 'Salís de allí en otro nivel. El cuerpo aguantó.'), m(e, { media: [3, 7], talento: [0, 2], salud: [-8, -3] }))
          : efecto(L(`Te pasas de carga. ${lesionar(e, elegir(activos(e)))}`, `Te pasas de carga. ${lesionar(e, elegir(activos(e)))}`, `Te pasas de carga. ${lesionar(e, elegir(activos(e)))}`), m(e, { salud: [-15, -8], media: [-2, 0], moral: [-6, -2] })) },
      { txt: L('Trabajo táctico y vídeo', 'Trabajo táctico y vídeo', 'Trabajo táctico y vídeo'), sub: L('Estudiar al rival.', 'Estudiar al rival.', 'Estudiar al rival.'), icono: 'expert-belt',
        efecto: e => efecto(L('Analizáis 200 combates. Llegáis sabiendo lo que va a hacer todo el mundo.', 'Analizáis 200 combates. Llegáis sabiendo lo que va a hacer todo el mundo.', 'Analizáis 200 combates. Llegáis sabiendo lo que va a hacer todo el mundo.'), m(e, { estrategia: [8, 14], media: [1, 3] })) },
      { txt: L('Convivencia y descanso', 'Convivencia y descanso', 'Convivencia y descanso'), sub: L('Estar bien también entrena.', 'Estar bien también entrena.', 'Estar bien también entrena.'), icono: 'leftovers',
        efecto: e => { for (const p of activos(e)) p.vinculo = limitar(p.vinculo + rango(5, 11));
          return efecto(L('Playa, juegos, comida buena. Llegáis frescos y unidos.', 'Playa, juegos, comida buena. Llegáis frescos y unidos.', 'Playa, juegos, comida buena. Llegáis frescos y unidos.'), m(e, { vinculo: [8, 14], salud: [7, 13], moral: [7, 13] })); } },
    ],
  },
  {
    id: 'redes', etapas: ['gimnasios', 'liga', 'pro', 'cima'], peso: 14,
    titulo: L('Te están destrozando en internet', 'Te están destrozando en internet', 'Te están destrozando en internet'),
    texto: () => L('Un vídeo tuyo perdiendo se hace viral con un montaje humillante. Tres millones de reproducciones en dos días.', 'Un vídeo tuyo perdiendo se hace viral con un montaje humillante. Tres millones de reproducciones en dos días.', 'Un vídeo tuyo perdiendo se hace viral con un montaje humillante. Tres millones de reproducciones en dos días.'),
    opciones: [
      { txt: L('Responder con ironía', 'Responder con ironía', 'Responder con ironía'), sub: L('Reírte tú primero.', 'Reírte tú primero.', 'Reírte tú primero.'), riesgo: 0.65,
        efecto: (e, ok) => ok
          ? efecto(L('Tu respuesta se hace más viral que el vídeo. Caes de pie y con gracia.', 'Tu respuesta se hace más viral que el vídeo. Caes de pie y con gracia.', 'Tu respuesta se hace más viral que el vídeo. Caes de pie y con gracia.'), m(e, { fama: [9, 16], moral: [4, 9] }))
          : efecto(L('Sale regular. Ahora hay dos vídeos.', 'Sale regular. Ahora hay dos vídeos.', 'Sale regular. Ahora hay dos vídeos.'), m(e, { fama: [-8, -3], moral: [-11, -5] })) },
      { txt: L('Cerrar las redes', 'Cerrar las redes', 'Cerrar las redes'), sub: L('Silencio total.', 'Silencio total.', 'Silencio total.'),
        efecto: e => efecto(L('Te borras de todo y entrenas el doble sin ruido de fondo.', 'Te borras de todo y entrenas el doble sin ruido de fondo.', 'Te borras de todo y entrenas el doble sin ruido de fondo.'), m(e, { media: [2, 5], estrategia: [2, 6], fama: [-10, -4], moral: [3, 8] })) },
      { txt: L('Contestar uno por uno', 'Contestar uno por uno', 'Contestar uno por uno'), sub: L('No te vas a callar.', 'No te vas a callar.', 'No te vas a callar.'),
        efecto: e => efecto(L('Discutes con desconocidos hasta las cuatro de la mañana. Nunca sale bien.', 'Discutes con desconocidos hasta las cuatro de la mañana. Nunca sale bien.', 'Discutes con desconocidos hasta las cuatro de la mañana. Nunca sale bien.'), m(e, { moral: [-14, -7], fama: [1, 5], salud: [-6, -1] })) },
    ],
  },
  {
    id: 'huevo', etapas: ['gimnasios', 'liga', 'pro'], peso: 14, cond: e => activos(e).length >= 1,
    titulo: L('Un huevo en la guardería', 'Un huevo en la guardería', 'Un huevo en la guardería'),
    texto: () => L('La guardería llama: uno de tus Pokémon ha dejado un huevo. Tardará meses y hay que cuidarlo.', 'La guardería llama: uno de tus Pokémon ha dejado un huevo. Tardará meses y hay que cuidarlo.', 'La guardería llama: uno de tus Pokémon ha dejado un huevo. Tardará meses y hay que cuidarlo.'),
    opciones: [
      { txt: L('Criarlo tú mismo', 'Criarlo tú mismo', 'Criarlo tú mismo'), sub: L('Llevarlo a todas partes.', 'Llevarlo a todas partes.', 'Llevarlo a todas partes.'), icono: 'lucky-egg', riesgo: 0.75,
        efecto: (e, ok) => { const p = capturaAleatoria(e);
          if (ok) { if (p) { p.vinculo = rango(66, 80); p.forma += rango(2, 6); }
            return efecto(L(`Nace ${p?.nombre ?? 'la cría'} y te reconoce desde el primer segundo.`, `Nace ${p?.nombre ?? 'la cría'} y te reconoce desde el primer segundo.`, `Nace ${p?.nombre ?? 'la cría'} y te reconoce desde el primer segundo.`), m(e, { vinculo: [8, 14], media: [1, 3], salud: [-5, -1] })); }
          return efecto(L(`Nace ${p?.nombre ?? 'la cría'}, pero criarlo entre torneos te come el año entero.`, `Nace ${p?.nombre ?? 'la cría'}, pero criarlo entre torneos te come el año entero.`, `Nace ${p?.nombre ?? 'la cría'}, pero criarlo entre torneos te come el año entero.`), m(e, { vinculo: [4, 8], media: [-3, -1], salud: [-9, -4] })); } },
      { txt: L('Dejarlo en la guardería', 'Dejarlo en la guardería', 'Dejarlo en la guardería'), sub: L('No es momento.', 'No es momento.', 'No es momento.'),
        efecto: e => { const p = capturaAleatoria(e);
          return efecto(L(`Meses después recoges a ${p?.nombre ?? 'la cría'}: sano, fuerte y algo distante contigo.`, `Meses después recoges a ${p?.nombre ?? 'la cría'}: sano, fuerte y algo distante contigo.`, `Meses después recoges a ${p?.nombre ?? 'la cría'}: sano, fuerte y algo distante contigo.`), m(e, { media: [1, 4] })); } },
      { txt: L('Regalarlo a un novato', 'Regalarlo a un novato', 'Regalarlo a un novato'), sub: L('Que empiece alguien.', 'Que empiece alguien.', 'Que empiece alguien.'),
        efecto: e => efecto(L('El crío no se lo puede creer. Se te queda la cara buena del día.', 'El crío no se lo puede creer. Se te queda la cara buena del día.', 'El crío no se lo puede creer. Se te queda la cara buena del día.'), m(e, { moral: [7, 13], fama: [2, 6] })) },
    ],
  },

  // ── VETERANO / CIERRE ──────────────────────────────────────────────────────
  {
    id: 'retiro_socio', etapas: ['cima', 'veterano'], peso: 20, unico: true,
    cond: e => !!socioReal(e) && e.año >= 10 && activos(e).length >= 2,
    titulo: e => L(`${socioReal(e).nombre} ya no llega`, `${socioReal(e).nombre} ya no llega`, `${socioReal(e).nombre} ya no llega`),
    texto: e => L(`Lleva ${e.año} años contigo, desde el primer día. Ya no llega a los movimientos rápidos y lo sabe. Sigue pidiendo salir.`, `Lleva ${e.año} años contigo, desde el primer día. Ya no llega a los movimientos rápidos y lo sabe. Sigue pidiendo salir.`, `Lleva ${e.año} años contigo, desde el primer día. Ya no llega a los movimientos rápidos y lo sabe. Sigue pidiendo salir.`),
    opciones: [
      { txt: L('Retirarlo con honores', 'Retirarlo con honores', 'Retirarlo con honores'), sub: L('Ceremonia en el estadio.', 'Ceremonia en el estadio.', 'Ceremonia en el estadio.'),
        efecto: e => { const s = socioReal(e); s.retirado = true; hito(e, '🎗️', `Retirada de ${s.nombre}, su primer compañero`);
          return efecto(L(`El estadio de pie durante ocho minutos. ${s.nombre} se va a la pradera de tu casa.`, `El estadio de pie durante ocho minutos. ${s.nombre} se va a la pradera de tu casa.`, `El estadio de pie durante ocho minutos. ${s.nombre} se va a la pradera de tu casa.`), m(e, { fama: [7, 14], moral: [9, 16], media: [-4, -1] })); } },
      { txt: L('Un último torneo juntos', 'Un último torneo juntos', 'Un último torneo juntos'), sub: L('Una vez más.', 'Una vez más.', 'Una vez más.'), riesgo: 0.5,
        efecto: (e, ok) => { const s = socioReal(e); s.retirado = true;
          if (ok) { hito(e, '🌅', `Último título con ${s.nombre}`);
            return efecto(L('Gana el torneo y se retira esa noche, invicto en su despedida.', 'Gana el torneo y se retira esa noche, invicto en su despedida.', 'Gana el torneo y se retira esa noche, invicto en su despedida.'), m(e, { fama: [14, 24], moral: [16, 26] })); }
          return efecto(L(`Cae en cuartos, agotado. Te mira pidiendo perdón y le abrazas delante de todos.`, `Cae en cuartos, agotado. Te mira pidiendo perdón y le abrazas delante de todos.`, `Cae en cuartos, agotado. Te mira pidiendo perdón y le abrazas delante de todos.`), m(e, { moral: [-8, -2], vinculo: [8, 15], fama: [3, 8] })); } },
      { txt: L('Seguir alineándolo', 'Seguir alineándolo', 'Seguir alineándolo'), sub: L('Aún puede.', 'Aún puede.', 'Aún puede.'),
        efecto: e => { const s = socioReal(e); s.forma -= rango(8, 16);
          return efecto(L('Le exiges lo que ya no tiene. Los resultados caen y la gente lo comenta.', 'Le exiges lo que ya no tiene. Los resultados caen y la gente lo comenta.', 'Le exiges lo que ya no tiene. Los resultados caen y la gente lo comenta.'), m(e, { media: [-6, -2], vinculo: [-16, -9], fama: [-8, -3] })); } },
    ],
  },
  {
    id: 'discipulo', etapas: ['cima', 'veterano'], peso: 15,
    titulo: L('El crío del gimnasio', 'El crío del gimnasio', 'El crío del gimnasio'),
    texto: () => L('Un chaval de once años te espera cada mañana en la puerta con un Pokémon flacucho. Quiere que le entrenes.', 'Un chaval de once años te espera cada mañana en la puerta con un Pokémon flacucho. Quiere que le entrenes.', 'Un chaval de once años te espera cada mañana en la puerta con un Pokémon flacucho. Quiere que le entrenes.'),
    opciones: [
      { txt: L('Aceptarlo como discípulo', 'Aceptarlo como discípulo', 'Aceptarlo como discípulo'), sub: L('Devolver lo recibido.', 'Devolver lo recibido.', 'Devolver lo recibido.'), riesgo: 0.65,
        efecto: (e, ok) => { e.flags.discipulo = true;
          if (ok) { hito(e, '🌱', 'Formó a la siguiente generación');
            return efecto(L('Le enseñas todo. Años después gana la Liga y te da las gracias en directo.', 'Le enseñas todo. Años después gana la Liga y te da las gracias en directo.', 'Le enseñas todo. Años después gana la Liga y te da las gracias en directo.'), m(e, { moral: [12, 20], fama: [7, 13], estrategia: [4, 9], media: [-3, -1] })); }
          return efecto(L('Lo deja a los dos años sin avisar. Te queda la sensación de haber perdido el tiempo de los dos.', 'Lo deja a los dos años sin avisar. Te queda la sensación de haber perdido el tiempo de los dos.', 'Lo deja a los dos años sin avisar. Te queda la sensación de haber perdido el tiempo de los dos.'), m(e, { moral: [-9, -4], media: [-3, -1] })); } },
      { txt: L('Un consejo y seguir', 'Un consejo y seguir', 'Un consejo y seguir'), sub: L('No tienes tiempo.', 'No tienes tiempo.', 'No tienes tiempo.'),
        efecto: e => efecto(L('Le dices tres cosas útiles y te vas. Se queda mirando la libreta donde las apuntó.', 'Le dices tres cosas útiles y te vas. Se queda mirando la libreta donde las apuntó.', 'Le dices tres cosas útiles y te vas. Se queda mirando la libreta donde las apuntó.'), m(e, { moral: [1, 5] })) },
      { txt: L('Cobrarle como alumno', 'Cobrarle como alumno', 'Cobrarle como alumno'), sub: L('Esto es un negocio.', 'Esto es un negocio.', 'Esto es un negocio.'),
        efecto: e => efecto(L('Montas una escuela con lista de espera. Ganas dinero y pierdes algo difícil de nombrar.', 'Montas una escuela con lista de espera. Ganas dinero y pierdes algo difícil de nombrar.', 'Montas una escuela con lista de espera. Ganas dinero y pierdes algo difícil de nombrar.'), m(e, { dinero: [110000, 220000], moral: [-8, -3], fama: [2, 6] })) },
    ],
  },
  {
    id: 'ultima_final', etapas: ['veterano'], peso: 22, cond: e => e.edad >= 29,
    titulo: L('La última bala', 'La última bala', 'La última bala'),
    texto: e => L(`${e.edad} años. El cuerpo pide parar, pero hay una plaza en la final de ${e.liga} y estás a un combate.`, `${e.edad} años. El cuerpo pide parar, pero hay una plaza en la final de ${e.liga} y estás a un combate.`, `${e.edad} años. El cuerpo pide parar, pero hay una plaza en la final de ${e.liga} y estás a un combate.`),
    opciones: [
      { txt: L('Vaciarte del todo', 'Vaciarte del todo', 'Vaciarte del todo'), sub: L('Si se rompe, que se rompa.', 'Si se rompe, que se rompa.', 'Si se rompe, que se rompa.'), riesgo: 0.45,
        efecto: (e, ok) => { if (ok) { e.titulos.push({ año: e.año, nombre: `${e.liga} (última final)` }); e.ligasGanadas++;
            hito(e, '👑', 'Ganó su última final');
            return efecto(L('Ganas. A los treinta y tantos, contra todo pronóstico. La grada llora.', 'Ganas. A los treinta y tantos, contra todo pronóstico. La grada llora.', 'Ganas. A los treinta y tantos, contra todo pronóstico. La grada llora.'), m(e, { fama: [20, 32], moral: [20, 30], salud: [-24, -14] })); }
          return efecto(L('Pierdes en el quinto combate, sin fuerzas. Te aplauden igual, y eso duele más.', 'Pierdes en el quinto combate, sin fuerzas. Te aplauden igual, y eso duele más.', 'Pierdes en el quinto combate, sin fuerzas. Te aplauden igual, y eso duele más.'), m(e, { salud: [-22, -12], moral: [-11, -5], fama: [3, 8] })); } },
      { txt: L('Competir sin forzar', 'Competir sin forzar', 'Competir sin forzar'), sub: L('Cuidarte.', 'Cuidarte.', 'Cuidarte.'),
        efecto: e => efecto(L('Gestionas el esfuerzo como un veterano. Caes en semis pero sales entero.', 'Gestionas el esfuerzo como un veterano. Caes en semis pero sales entero.', 'Gestionas el esfuerzo como un veterano. Caes en semis pero sales entero.'), m(e, { estrategia: [6, 11], salud: [-5, -1], fama: [2, 6] })) },
      { txt: L('Retirarte ahora, en lo alto', 'Retirarte ahora, en lo alto', 'Retirarte ahora, en lo alto'), sub: L('Tú decides cuándo.', 'Tú decides cuándo.', 'Tú decides cuándo.'),
        efecto: e => { e.flags.retiroElegido = true; hito(e, '🎬', 'Se retiró en la cima, por decisión propia');
          return efecto(L('Anuncias la retirada en rueda de prensa. Sin lesiones, sin declive público.', 'Anuncias la retirada en rueda de prensa. Sin lesiones, sin declive público.', 'Anuncias la retirada en rueda de prensa. Sin lesiones, sin declive público.'), m(e, { fama: [12, 20], moral: [16, 26] })); } },
    ],
  },

  // ── COMUNIDAD COMPETITIVA ──────────────────────────────────────────────────
  // Guiños a la escena VGC española. Todo es ficción y cariño: los nombres
  // aparecen como cameos amables, nunca haciendo nada reprochable.
  {
    id: 'sekiam_dieta', etapas: ['liga', 'pro', 'cima'], peso: 15, unico: true,
    titulo: L('Sekiam te habla de la dieta', 'Sekiam te habla de la dieta', 'Sekiam te habla de la dieta'),
    texto: () => L('Coincidís en la sala de espera de un regional. Sekiam lleva un táper y una teoría: que se rinde mejor comiendo distinto, que él lleva un año probándolo y que a ver si te atreves.', 'Coincidís en la sala de espera de un regional. Sekiam lleva un táper y una teoría: que se rinde mejor comiendo distinto, que él lleva un año probándolo y que a ver si te atreves.', 'Coincidís en la sala de espera de un regional. Sekiam lleva un táper y una teoría: que se rinde mejor comiendo distinto, que él lleva un año probándolo y que a ver si te atreves.'),
    opciones: [
      { txt: L('Hacerte vegano un año', 'Hacerte vegano un año', 'Hacerte vegano un año'), sub: L('Probar en serio, sin trampas.', 'Probar en serio, sin trampas.', 'Probar en serio, sin trampas.'), icono: 'oran', riesgo: 0.6,
        efecto: (e, ok) => { if (ok) { mediaTemporal(e, 5, 3);
            return efecto(L('Legumbres, planificación y cero resacas de torneo. Llegas a las finales con la cabeza mucho más despejada.', 'Legumbres, planificación y cero resacas de torneo. Llegas a las finales con la cabeza mucho más despejada.', 'Legumbres, planificación y cero resacas de torneo. Llegas a las finales con la cabeza mucho más despejada.'), m(e, { salud: [8, 15], moral: [3, 8], mediaTexto: 5 })); }
          mediaTemporal(e, -3, 1);
          return efecto(L('Una indigestión de restaurante vegano dudoso te deja hecho polvo justo antes de un torneo. Se te pasa en un año, pero ese torneo lo pierdes con el estómago revuelto.', 'Una indigestión de restaurante vegano dudoso te deja hecho polvo justo antes de un torneo. Se te pasa en un año, pero ese torneo lo pierdes con el estómago revuelto.', 'Una indigestión de restaurante vegano dudoso te deja hecho polvo justo antes de un torneo. Se te pasa en un año, pero ese torneo lo pierdes con el estómago revuelto.'), m(e, { salud: [-8, -3], moral: [-6, -2], mediaTexto: -3 })); } },
      { txt: L('Seguir con tu dieta y entrenar más duro', 'Seguir con tu dieta y entrenar más duro', 'Seguir con tu dieta y entrenar más duro'), sub: L('Compensarlo a base de horas.', 'Compensarlo a base de horas.', 'Compensarlo a base de horas.'),
        efecto: e => efecto(L('No cambias ni un plato, pero le metes el doble de sesiones al gimnasio. El cuerpo lo nota.', 'No cambias ni un plato, pero le metes el doble de sesiones al gimnasio. El cuerpo lo nota.', 'No cambias ni un plato, pero le metes el doble de sesiones al gimnasio. El cuerpo lo nota.'), m(e, { media: [3, 6], salud: [-7, -3] })) },
    ],
  },
  {
    id: 'kasty_manifiesto', etapas: ['pro', 'cima', 'veterano'], peso: 14, unico: true,
    cond: e => e.stats.fama >= 30,
    titulo: L('Kasty pasa el manifiesto', 'Kasty pasa el manifiesto', 'Kasty pasa el manifiesto'),
    texto: () => L('Los jugadores están hartos: viajes pagados de su bolsillo, premios que no compensan y un calendario decidido sin preguntar a nadie. Kasty ha escrito un manifiesto pidiendo cambios a la organización del circuito y quiere tu firma.', 'Los jugadores están hartos: viajes pagados de su bolsillo, premios que no compensan y un calendario decidido sin preguntar a nadie. Kasty ha escrito un manifiesto pidiendo cambios a la organización del circuito y quiere tu firma.', 'Los jugadores están hartos: viajes pagados de su bolsillo, premios que no compensan y un calendario decidido sin preguntar a nadie. Kasty ha escrito un manifiesto pidiendo cambios a la organización del circuito y quiere tu firma.'),
    opciones: [
      { txt: L('Firmar y dar la cara', 'Firmar y dar la cara', 'Firmar y dar la cara'), sub: L('Que se te vea en la foto.', 'Que se te vea en la foto.', 'Que se te vea en la foto.'), riesgo: 0.55,
        efecto: (e, ok) => { e.flags.sindicalista = true;
          if (ok) { hito(e, '✊', 'Firmó el manifiesto que cambió el circuito');
            return efecto(L('El manifiesto se hace enorme y la organización cede en la mitad de los puntos. Los jugadores no lo olvidan.', 'El manifiesto se hace enorme y la organización cede en la mitad de los puntos. Los jugadores no lo olvidan.', 'El manifiesto se hace enorme y la organización cede en la mitad de los puntos. Los jugadores no lo olvidan.'), m(e, { fama: [12, 22], moral: [10, 18] })); }
          return efecto(L('La organización no mueve un dedo y de repente tu nombre aparece menos en las invitaciones.', 'La organización no mueve un dedo y de repente tu nombre aparece menos en las invitaciones.', 'La organización no mueve un dedo y de repente tu nombre aparece menos en las invitaciones.'), m(e, { fama: [-9, -3], moral: [-9, -4], dinero: -rango(15000, 40000) })); } },
      { txt: L('No firmar y centrarte en competir', 'No firmar y centrarte en competir', 'No firmar y centrarte en competir'), sub: L('Esa energía, a entrenar.', 'Esa energía, a entrenar.', 'Esa energía, a entrenar.'),
        efecto: e => efecto(L('Prefieres no meterte. Ganas tiempo de sobra para el equipo, pero algunos compañeros tardan meses en volver a hablarte del tema.', 'Prefieres no meterte. Ganas tiempo de sobra para el equipo, pero algunos compañeros tardan meses en volver a hablarte del tema.', 'Prefieres no meterte. Ganas tiempo de sobra para el equipo, pero algunos compañeros tardan meses en volver a hablarte del tema.'), m(e, { media: [2, 5], estrategia: [3, 7], moral: [-8, -3] })) },
    ],
  },
  {
    id: 'folagor_dualocke', etapas: ['liga', 'pro', 'cima', 'veterano'], peso: 15, unico: true,
    // Solo en es/it: en inglés este evento no existe (no hay sustituto asignado).
    cond: () => idioma() !== 'en',
    titulo: () => L('Folagor te invita a un dualocke', '', 'Pardini ti invita a castear un regional'),
    texto: () => L('Serie grabada, reglas de nuzlocke, dos entrenadores unidos por el mismo destino y un público enorme esperando que se muera algo. Son semanas de grabación que no vas a dedicar a entrenar.',
      '',
      'Un regionale intero da commentare in diretta al suo fianco, davanti a un pubblico enorme che si aspetta battute e drammi ad ogni turno. Sono giorni di trasferta che non dedicherai ad allenarti.'),
    opciones: [
      { txt: L('Grabar la serie entera', '', 'Commentare tutto il regionale'), sub: L('Muchísima gente te va a ver.', '', 'Ti guarderà moltissima gente.'), riesgo: 0.75,
        efecto: (e, ok) => { const n = nivelEquipo(e, -20);
          if (ok) { hito(e, '🎬', L('Grabó un dualocke con Folagor', '', 'Ha commentato un regionale insieme a Pardini'));
            return efecto(L(`La serie es un éxito y te conoce gente que no había visto un VGC en su vida. Tu equipo, eso sí, llega a la pretemporada oxidado. ${n}`,
              '',
              `La diretta è un successo e ti scopre gente che non aveva mai visto un VGC in vita sua. La tua squadra, però, arriva alla preparazione arrugginita. ${n}`),
              m(e, { fama: [40, 55], dinero: [30000, 70000], media: [-4, -1] })); }
          return efecto(L(`La serie se corta a mitad por agenda y queda a medias. Pierdes las semanas igual. ${n}`,
            '',
            `La diretta si interrompe a metà per problemi di calendario e resta a metà. I giorni li perdi lo stesso. ${n}`),
            m(e, { fama: [8, 16], dinero: [8000, 20000], media: [-4, -1], moral: [-8, -3] })); } },
      { txt: L('Decir que no', '', 'Dire di no'), sub: L('Esta temporada va en serio.', '', 'Questa stagione fa sul serio.'),
        efecto: e => efecto(L('Le dices que este año no. Él lo entiende perfectamente y te desea suerte en directo, pero es visibilidad que otro se lleva.',
          '',
          'Gli dici che quest\'anno no. Lui lo capisce perfettamente e ti augura buona fortuna in diretta, ma è visibilità che si prende un altro.'), m(e, { media: [2, 5], estrategia: [2, 6], fama: [-4, -1] })) },
    ],
  },
  {
    id: 'creators_cup', etapas: ['pro', 'cima', 'veterano'], peso: 13,
    cond: e => e.stats.fama >= 25,
    titulo: L('Creators Cup', 'Creators Cup', 'Creators Cup'),
    texto: () => L('Victory Road organiza el torneo donde los creadores de contenido se mezclan con los jugadores de verdad. Reglas raras, mucho público y cero puntos de circuito en juego.', 'Victory Road organiza el torneo donde los creadores de contenido se mezclan con los jugadores de verdad. Reglas raras, mucho público y cero puntos de circuito en juego.', 'Victory Road organiza el torneo donde los creadores de contenido se mezclan con los jugadores de verdad. Reglas raras, mucho público y cero puntos de circuito en juego.'),
    opciones: [
      { txt: L('Ir a ganarlo', 'Ir a ganarlo', 'Ir a ganarlo'), sub: L('No sabes competir de otra forma.', 'No sabes competir de otra forma.', 'No sabes competir de otra forma.'), riesgo: 0.5,
        efecto: (e, ok) => ok
          ? (hito(e, '🎙️', 'Ganó la Creators Cup'), efecto(L('Lo ganas con un equipo ridículo que preparaste en dos tardes. El clip da la vuelta a España.', 'Lo ganas con un equipo ridículo que preparaste en dos tardes. El clip da la vuelta a España.', 'Lo ganas con un equipo ridículo que preparaste en dos tardes. El clip da la vuelta a España.'), m(e, { fama: [14, 24], moral: [8, 15] })))
          : efecto(L('Caes en cuartos contra un creador que jugaba con un equipo monotipo. El clip también da la vuelta a España.', 'Caes en cuartos contra un creador que jugaba con un equipo monotipo. El clip también da la vuelta a España.', 'Caes en cuartos contra un creador que jugaba con un equipo monotipo. El clip también da la vuelta a España.'), m(e, { fama: [6, 12], moral: [-8, -3] })) },
      { txt: L('Quedarte preparando el regional', 'Quedarte preparando el regional', 'Quedarte preparando el regional'), sub: L('Lo otro es ruido.', 'Lo otro es ruido.', 'Lo otro es ruido.'),
        efecto: e => efecto(L('Te quedas en casa haciendo cálculos mientras todos se divierten. Llegas al regional afiladísimo, pero pierdes la exposición del torneo.', 'Te quedas en casa haciendo cálculos mientras todos se divierten. Llegas al regional afiladísimo, pero pierdes la exposición del torneo.', 'Te quedas en casa haciendo cálculos mientras todos se divierten. Llegas al regional afiladísimo, pero pierdes la exposición del torneo.'), m(e, { media: [3, 7], estrategia: [5, 10], fama: [-6, -2] })) },
    ],
  },
  {
    id: 'wolfe_stream', etapas: ['pro', 'cima', 'veterano'], peso: 14, unico: true,
    cond: e => e.stats.fama >= 25,
    titulo: L('Una serie contra Wolfe, en directo', 'A series against Wolfe, live', 'Una serie contro Wolfe, in diretta'),
    texto: () => L('Wolfe monta una serie a cinco en su canal y te invita a ti. Miles de personas mirando, el chat a toda velocidad y él explicando en voz alta lo que va a hacer antes de hacerlo, que es lo que más rabia da.',
      'Wolfe sets up a best-of-five on his channel and invites you. Thousands of people watching, the chat scrolling at full speed, and him announcing out loud what he\'s about to do before he does it, which is the most annoying part.',
      'Wolfe organizza una serie al meglio delle cinque sul suo canale e invita te. Migliaia di persone a guardare, la chat a tutta velocità e lui che annuncia ad alta voce cosa sta per fare prima di farlo, il che è la cosa che fa più rabbia.'),
    opciones: [
      { txt: L('Aceptar la serie', 'Accept the series', 'Accettare la serie'), sub: L('A cara descubierta, en su casa.', 'Out in the open, on his turf.', 'A viso aperto, a casa sua.'), riesgo: 0.4,
        efecto: (e, ok) => { if (ok) { hito(e, '🎥', L('Le ganó una serie a Wolfe en directo', 'Beat Wolfe in a series live', 'Ha battuto Wolfe in diretta'));
            return efecto(L('Le ganas 3-2 con una lectura que nadie vio venir, ni él. El clip se comparte solo, y a partir de esa noche dejas de ser un rival más: en todos los torneos hay alguien que va a por ti específicamente.',
              'You beat him 3-2 with a read nobody saw coming, not even him. The clip spreads on its own, and from that night on you stop being just another rival: at every tournament someone is out to get you specifically.',
              'Lo batti 3-2 con una lettura che nessuno si aspettava, nemmeno lui. La clip si diffonde da sola, e da quella notte smetti di essere un rivale qualunque: in ogni torneo c\'è qualcuno che viene apposta per te.'),
              m(e, { fama: [18, 30], moral: [10, 18], media: [2, 5] })); }
          return efecto(L('Pierdes 0-3 y el chat no perdona: "no tiene ni idea", "cómo ha llegado aquí este". Wolfe sale a defenderte y es peor, porque encima queda de bueno.',
            'You lose 0-3 and the chat shows no mercy: "he has no idea," "how did this guy even get here." Wolfe steps in to defend you and it\'s worse, because on top of it he looks like the good guy.',
            'Perdi 0-3 e la chat non perdona: "non ha idea di niente", "come è arrivato qui questo". Wolfe esce a difenderti ed è anche peggio, perché per giunta ci fa la figura del buono.'),
            m(e, { fama: [6, 12], moral: [-16, -8] })); } },
      { txt: L('Decir que ahora no', 'Say not right now', 'Dire che ora non puoi'), sub: L('No jugar en su terreno ni con su público.', 'Not playing on his turf or for his audience.', 'Non giocare in casa sua né per il suo pubblico.'),
        efecto: e => efecto(L('Le dices que este mes no puedes y te lo respeta. El chat decide que le tienes miedo y ese clip también circula, pero tú sigues preparando lo tuyo sin ruido.',
          'You tell him you can\'t this month and he respects it. The chat decides you\'re scared of him and that clip also goes around, but you keep quietly preparing your own thing.',
          'Gli dici che questo mese non puoi e lui lo rispetta. La chat decide che hai paura di lui e anche quella clip gira, ma tu continui a preparare le tue cose senza far rumore.'),
          m(e, { fama: [-6, -2], estrategia: [4, 9], media: [1, 4] })) },
    ],
  },
  {
    id: 'fosil', etapas: ['gimnasios', 'liga', 'pro'], peso: 14, unico: true,
    titulo: L('Dos fósiles y una máquina', 'Dos fósiles y una máquina', 'Dos fósiles y una máquina'),
    texto: () => L('En un museo de carretera te dejan elegir: hay dos fósiles en una vitrina polvorienta y una máquina de resurrección que, según el conserje, "va casi siempre". Solo puedes revivir uno, y el conserje ya está mirando el reloj.', 'En un museo de carretera te dejan elegir: hay dos fósiles en una vitrina polvorienta y una máquina de resurrección que, según el conserje, "va casi siempre". Solo puedes revivir uno, y el conserje ya está mirando el reloj.', 'En un museo de carretera te dejan elegir: hay dos fósiles en una vitrina polvorienta y una máquina de resurrección que, según el conserje, "va casi siempre". Solo puedes revivir uno, y el conserje ya está mirando el reloj.'),
    opciones: [
      { txt: L('La Hélix o la Domo', 'La Hélix o la Domo', 'La Hélix o la Domo'), sub: L('Lo que salga del mar antiguo.', 'Lo que salga del mar antiguo.', 'Lo que salga del mar antiguo.'), icono: 'poke', riesgo: 0.7,
        efecto: (e, ok) => { if (!ok) return efecto(L('La máquina se traga el fósil, pita tres veces y se apaga. El conserje se encoge de hombros: "pues nada". Te vas con las manos vacías y una lección sobre museos de carretera.', 'La máquina se traga el fósil, pita tres veces y se apaga. El conserje se encoge de hombros: "pues nada". Te vas con las manos vacías y una lección sobre museos de carretera.', 'La máquina se traga el fósil, pita tres veces y se apaga. El conserje se encoge de hombros: "pues nada". Te vas con las manos vacías y una lección sobre museos de carretera.'),
            m(e, { moral: [-8, -3], dinero: -rango(2000, 6000) }));
          const p = fichar(e, elegir(['omanyte', 'kabuto', 'cranidos', 'shieldon', 'tirtouga', 'archen']));
          hito(e, '🦴', `Revivió a ${p?.nombre ?? 'un fósil'}`);
          return efecto(L(`La máquina zumba, se abre, y ahí está: ${p?.nombre ?? 'el fósil'}, vivo, parpadeando con cara de no entender nada. Tiene millones de años y acaba de conocerte.`, `La máquina zumba, se abre, y ahí está: ${p?.nombre ?? 'el fósil'}, vivo, parpadeando con cara de no entender nada. Tiene millones de años y acaba de conocerte.`, `La máquina zumba, se abre, y ahí está: ${p?.nombre ?? 'el fósil'}, vivo, parpadeando con cara de no entender nada. Tiene millones de años y acaba de conocerte.`),
            m(e, { fama: [6, 13], vinculo: [5, 11], moral: [6, 12] })); } },
      { txt: L('El Ámbar Viejo', 'El Ámbar Viejo', 'El Ámbar Viejo'), sub: L('Más caro, más raro, más riesgo.', 'Más caro, más raro, más riesgo.', 'Más caro, más raro, más riesgo.'), icono: 'poke', riesgo: 0.45,
        efecto: (e, ok) => { if (!ok) return efecto(L('Pagas lo que te piden y la resurrección sale mal: del ámbar no se levanta nada. Te quedas mirando la máquina un rato largo, como si fuera a cambiar de opinión.', 'Pagas lo que te piden y la resurrección sale mal: del ámbar no se levanta nada. Te quedas mirando la máquina un rato largo, como si fuera a cambiar de opinión.', 'Pagas lo que te piden y la resurrección sale mal: del ámbar no se levanta nada. Te quedas mirando la máquina un rato largo, como si fuera a cambiar de opinión.'),
            m(e, { dinero: -rango(9000, 20000), moral: [-11, -5] }));
          const p = fichar(e, 'aerodactyl');
          hito(e, '🦖', 'Revivió a Aerodactyl del Ámbar Viejo');
          return efecto(L(`Del ámbar sale ${p?.nombre ?? 'Aerodactyl'} y el chillido rompe una vitrina. El conserje se esconde detrás del mostrador. Tú ya sabes que este entra en el equipo.`, `Del ámbar sale ${p?.nombre ?? 'Aerodactyl'} y el chillido rompe una vitrina. El conserje se esconde detrás del mostrador. Tú ya sabes que este entra en el equipo.`, `Del ámbar sale ${p?.nombre ?? 'Aerodactyl'} y el chillido rompe una vitrina. El conserje se esconde detrás del mostrador. Tú ya sabes que este entra en el equipo.`),
            m(e, { dinero: -rango(9000, 20000), fama: [12, 20], media: [1, 4] })); } },
    ],
  },
  {
    id: 'huevo_misterioso', etapas: ['novato', 'gimnasios', 'liga'], peso: 13, unico: true,
    titulo: L('El huevo que nadie reclama', 'El huevo que nadie reclama', 'El huevo que nadie reclama'),
    texto: () => L('Una criadora te para en la ruta con un huevo entre las manos: apareció en su granja, no sabe de quién es y a ella no le cabe uno más. Te lo da sin preguntar, como quien suelta un problema.', 'Una criadora te para en la ruta con un huevo entre las manos: apareció en su granja, no sabe de quién es y a ella no le cabe uno más. Te lo da sin preguntar, como quien suelta un problema.', 'Una criadora te para en la ruta con un huevo entre las manos: apareció en su granja, no sabe de quién es y a ella no le cabe uno más. Te lo da sin preguntar, como quien suelta un problema.'),
    opciones: [
      { txt: L('Llevarlo encima hasta que rompa', 'Llevarlo encima hasta que rompa', 'Llevarlo encima hasta que rompa'), sub: L('Kilómetros, calor y paciencia.', 'Kilómetros, calor y paciencia.', 'Kilómetros, calor y paciencia.'), riesgo: 0.75,
        efecto: (e, ok) => { if (!ok) return efecto(L('Pasan meses y el huevo no rompe. Un criador de verdad le echa un vistazo y te dice, con mucho tacto, que eso ya no va a eclosionar.', 'Pasan meses y el huevo no rompe. Un criador de verdad le echa un vistazo y te dice, con mucho tacto, que eso ya no va a eclosionar.', 'Pasan meses y el huevo no rompe. Un criador de verdad le echa un vistazo y te dice, con mucho tacto, que eso ya no va a eclosionar.'),
            m(e, { moral: [-9, -4], vinculo: [3, 7] }));
          // De un huevo sale una cría: nivel 5 y primera etapa, pase lo que pase
          const p = capturaAleatoria(e, { rarezaMin: dado(0.35) ? 'raro' : 'comun', nivel: 5, etapa: 0 });
          return efecto(L(`Rompe una noche cualquiera, en un centro Pokémon vacío. Es ${p?.nombre ?? 'un bichito'} y lo primero que ve eres tú.`, `Rompe una noche cualquiera, en un centro Pokémon vacío. Es ${p?.nombre ?? 'un bichito'} y lo primero que ve eres tú.`, `Rompe una noche cualquiera, en un centro Pokémon vacío. Es ${p?.nombre ?? 'un bichito'} y lo primero que ve eres tú.`),
            m(e, { vinculo: [10, 18], moral: [7, 13] })); } },
      { txt: L('Dejarlo en el centro Pokémon', 'Dejarlo en el centro Pokémon', 'Dejarlo en el centro Pokémon'), sub: L('Que lo cuide quien sepa.', 'Que lo cuide quien sepa.', 'Que lo cuide quien sepa.'),
        efecto: e => efecto(L('Lo entregas en el mostrador y sigues tu camino más ligero. La enfermera te da las gracias; tú te quedas pensando en él más de lo que esperabas.', 'Lo entregas en el mostrador y sigues tu camino más ligero. La enfermera te da las gracias; tú te quedas pensando en él más de lo que esperabas.', 'Lo entregas en el mostrador y sigues tu camino más ligero. La enfermera te da las gracias; tú te quedas pensando en él más de lo que esperabas.'),
          m(e, { moral: [-3, -1], estrategia: [3, 7], salud: [3, 7] })) },
    ],
  },
  {
    id: 'apagon_regional', etapas: ['liga', 'pro', 'cima'], peso: 13,
    titulo: L('Se va la luz en el pabellón', 'Se va la luz en el pabellón', 'Se va la luz en el pabellón'),
    texto: () => L('Ronda 6, tú con ventaja, y el pabellón entero se queda a oscuras. Media hora después los jueces siguen sin saber si se reanuda desde donde iba o se repite el combate entero. Alguien tiene que decir algo y todos te miran a ti.', 'Ronda 6, tú con ventaja, y el pabellón entero se queda a oscuras. Media hora después los jueces siguen sin saber si se reanuda desde donde iba o se repite el combate entero. Alguien tiene que decir algo y todos te miran a ti.', 'Ronda 6, tú con ventaja, y el pabellón entero se queda a oscuras. Media hora después los jueces siguen sin saber si se reanuda desde donde iba o se repite el combate entero. Alguien tiene que decir algo y todos te miran a ti.'),
    opciones: [
      { txt: L('Exigir que se reanude', 'Exigir que se reanude', 'Exigir que se reanude'), sub: L('Ibas ganando y lo sabe todo el mundo.', 'Ibas ganando y lo sabe todo el mundo.', 'Ibas ganando y lo sabe todo el mundo.'), riesgo: 0.5,
        efecto: (e, ok) => ok
          ? efecto(L('Los jueces te dan la razón, se reanuda y cierras el combate en dos turnos. Nadie discute, pero tampoco nadie te aplaude.', 'Los jueces te dan la razón, se reanuda y cierras el combate en dos turnos. Nadie discute, pero tampoco nadie te aplaude.', 'Los jueces te dan la razón, se reanuda y cierras el combate en dos turnos. Nadie discute, pero tampoco nadie te aplaude.'),
              m(e, { media: [2, 5], fama: [3, 8], moral: [4, 9] }))
          : efecto(L('Deciden repetirlo entero. Pierdes el combate que ya tenías ganado y te comes la fama de protestón por partida doble.', 'Deciden repetirlo entero. Pierdes el combate que ya tenías ganado y te comes la fama de protestón por partida doble.', 'Deciden repetirlo entero. Pierdes el combate que ya tenías ganado y te comes la fama de protestón por partida doble.'),
              m(e, { moral: [-13, -6], fama: [-7, -2] })) },
      { txt: L('Aceptar lo que digan los jueces', 'Aceptar lo que digan los jueces', 'Aceptar lo que digan los jueces'), sub: L('No pelear una cosa que no depende de ti.', 'No pelear una cosa que no depende de ti.', 'No pelear una cosa que no depende de ti.'),
        efecto: e => efecto(L('Dices que por ti lo que decidan. Se repite el combate y lo pierdes, pero el vídeo de ti diciéndolo se comparte más que ningún resultado de ese fin de semana.', 'Dices que por ti lo que decidan. Se repite el combate y lo pierdes, pero el vídeo de ti diciéndolo se comparte más que ningún resultado de ese fin de semana.', 'Dices que por ti lo que decidan. Se repite el combate y lo pierdes, pero el vídeo de ti diciéndolo se comparte más que ningún resultado de ese fin de semana.'),
          m(e, { fama: [7, 14], moral: [-6, -2], estrategia: [2, 6] })) },
    ],
  },
  {
    id: 'pokealex_analisis', etapas: ['liga', 'pro', 'cima', 'veterano'], peso: 14, unico: true,
    cond: e => e.stats.fama >= 18,
    // Mismo evento, nombre distinto por idioma: Pokéalex (es), JoeUX9 (en), Marcofiero (it).
    titulo: () => L(`${'Pokéalex'} quiere analizar tu equipo`, `${'JoeUX9'} wants to analyze your team`, `${'Marcofiero'} vuole analizzare la tua squadra`),
    texto: () => L('Pokéalex prepara un vídeo desmenuzando el equipo con el que has llegado hasta aquí: los EVs, los objetos, por qué ese cuarto hueco y no otro. Lo va a ver muchísima gente, incluida la que se va a sentar enfrente de ti el mes que viene.',
      'JoeUX9 is putting together a video breaking down the team you got here with: the EVs, the items, why that fourth slot and not another. A lot of people are going to watch it, including whoever sits across from you next month.',
      'Marcofiero sta preparando un video che smonta pezzo per pezzo la squadra con cui sei arrivato fin qui: gli EV, gli oggetti, perché quel quarto slot e non un altro. Lo vedrà moltissima gente, compreso chi ti siederà di fronte il mese prossimo.'),
    opciones: [
      { txt: L('Enseñarlo todo', 'Show everything', 'Mostrare tutto'), sub: L('Sin esconder ni un EV.', 'Without hiding a single EV.', 'Senza nascondere nemmeno un EV.'), riesgo: 0.55,
        efecto: (e, ok) => ok
          ? efecto(L('El vídeo explota y de repente eres el que explica las cosas bien. Ganas una capa de respeto que no da ningún torneo, y encima te sobra tiempo para rehacer el equipo antes del regional.',
              'The video blows up and suddenly you\'re the one who explains things well. You gain a layer of respect no tournament gives you, and you still have time to rework the team before the regional.',
              'Il video esplode e all\'improvviso sei tu quello che spiega le cose per bene. Guadagni uno strato di rispetto che nessun torneo ti dà, e ti avanza pure il tempo per rifare la squadra prima del regionale.'),
              m(e, { fama: [14, 24], estrategia: [4, 9], moral: [5, 10] }))
          : efecto(L('El vídeo explota y medio circuito se aprende tu equipo de memoria. En el siguiente regional te esperan con la respuesta preparada desde la primera ronda.',
              'The video blows up and half the circuit learns your team by heart. At the next regional they\'re waiting for you with a prepared answer from round one.',
              'Il video esplode e mezzo circuito impara la tua squadra a memoria. Al regionale successivo ti aspettano con la risposta pronta già dal primo turno.'),
              m(e, { fama: [12, 20], media: [-5, -2], moral: [-6, -2] })) },
      { txt: L('Contarlo por encima', 'Skim over it', 'Raccontarlo superficialmente'), sub: L('Guardarte lo que de verdad gana partidas.', 'Keep what actually wins games to yourself.', 'Tenerti per te ciò che davvero vince le partite.'),
        efecto: e => efecto(L('Vas al vídeo, sonríes y no sueltas prenda de lo que hace funcionar al equipo. En los comentarios te llaman rata; tú duermes tranquilo.',
          'You go on the video, smile, and give away nothing of what makes the team work. The comments call you a rat; you sleep just fine.',
          'Vai al video, sorridi e non lasci trapelare nulla di ciò che fa funzionare la squadra. Nei commenti ti danno del ratto; tu dormi tranquillo.'),
          m(e, { media: [2, 5], estrategia: [2, 5], fama: [-4, -1] })) },
    ],
  },
  {
    id: 'juanfi_mufa', etapas: ['liga', 'pro', 'cima', 'veterano'], peso: 14, unico: true,
    titulo: L('La mufa de Juanfi', 'Juanfi\'s jinx', 'La sfortuna di Juanfi'),
    texto: e => L(`Víspera de final. Juanfi tiene el tuit escrito y el dedo encima del botón: "vamos ${e.nombre}, este año es el suyo". Todo el circuito sabe lo que pasa cuando Juanfi apoya a alguien en público. Él también lo sabe. Le hace gracia.`,
      `Eve of the final. Juanfi has the tweet written and his finger over the button: "come on ${e.nombre}, this is your year." The whole circuit knows what happens when Juanfi publicly backs someone. He knows it too. He finds it funny.`,
      `Vigilia della finale. Juanfi ha il tweet già scritto e il dito sopra il pulsante: "forza ${e.nombre}, quest'anno è il tuo anno". Tutto il circuito sa cosa succede quando Juanfi appoggia pubblicamente qualcuno. Lo sa anche lui. Gli fa ridere.`),
    opciones: [
      { txt: L('Dejar que lo publique', 'Let him post it', 'Lasciare che lo pubblichi'), sub: L('La mufa es superstición… ¿no?', 'The jinx is just superstition… right?', 'La sfortuna è solo superstizione… no?'), riesgo: 0.1,
        efecto: (e, ok) => ok
          ? (hito(e, '🧿', L('Sobrevivió a la mufa de Juanfi', 'Survived Juanfi\'s jinx', 'Sopravvissuto alla sfortuna di Juanfi')),
             efecto(L('Ganas. Ganas con el tuit fijado y todo. Juanfi se cuelga la medalla de haber roto su propia maldición y tú entras en la lista cortísima de gente que le ha sobrevivido.',
               'You win. You win with the tweet pinned and everything. Juanfi takes credit for breaking his own curse, and you join the very short list of people who\'ve survived him.',
               'Vinci. Vinci con il tweet fissato in alto e tutto. Juanfi si prende il merito di aver rotto la sua stessa maledizione e tu entri nella lista cortissima di chi gli è sopravvissuto.'),
               m(e, { fama: [16, 28], moral: [10, 18] })))
          : efecto(L('Caes al día siguiente de la forma más tonta posible. El tuit se queda ahí, con cuatro mil citas riéndose de los dos. Al menos ahora te conoce todo el mundo.',
              'You crash out the next day in the dumbest way possible. The tweet stays up, with four thousand quote-tweets laughing at both of you. At least now everyone knows you.',
              'Crolli il giorno dopo nel modo più stupido possibile. Il tweet resta lì, con quattromila citazioni che ridono di entrambi. Almeno ora ti conoscono tutti.'),
              m(e, { fama: [10, 18], moral: [-18, -10] })) },
      { txt: L('Bloquearle por si acaso', 'Block him just in case', 'Bloccarlo per sicurezza'), sub: L('Sin tuit no hay mufa.', 'No tweet, no jinx.', 'Senza tweet non c\'è sfortuna.'),
        efecto: e => efecto(L('Le bloqueas veinticuatro horas y él se lo toma a broma, pero la captura del bloqueo circula igual y te quedas de supersticioso oficial del circuito. Duermes de un tirón, eso sí.',
          'You block him for twenty-four hours and he takes it as a joke, but the screenshot of the block goes around anyway and you become the circuit\'s official superstitious one. You do sleep soundly, though.',
          'Lo blocchi per ventiquattro ore e lui la prende a ridere, ma lo screenshot del blocco gira comunque e diventi lo scaramantico ufficiale del circuito. Dormi tutta la notte filata, questo sì.'),
          m(e, { moral: [6, 12], fama: [-5, -1], estrategia: [1, 4] })) },
    ],
  },
  {
    id: 'tierlist', etapas: ['pro', 'cima', 'veterano'], peso: 15, unico: true,
    cond: e => e.stats.fama >= 22,
    titulo: L('La tier list de jugadores', 'La tier list de jugadores', 'La tier list de jugadores'),
    texto: e => {
      const escala = [[88, 'S', 'A'], [80, 'A', 'B'], [72, 'B', 'C'], [62, 'C', 'D']];
      const [, merecida, puesta] = escala.find(([min]) => e.media >= min) ?? [0, 'D', 'F'];
      e._tierMerecida = merecida; e._tierPuesta = puesta;
      return `Un canal grande publica la tier list de jugadores españoles de la temporada. Vas bajando la imagen buscándote en ${merecida}, que es donde sabes perfectamente que estás. Y te encuentras en ${puesta}, entre dos nombres que llevan años sin ganar nada. En los comentarios hay gente defendiéndote y gente diciendo que hasta ahí te han puesto por pena.`;
    },
    opciones: [
      { txt: L('Contestar en Twitter', 'Contestar en Twitter', 'Contestar en Twitter'), sub: L('Con datos y a las tres de la mañana.', 'Con datos y a las tres de la mañana.', 'Con datos y a las tres de la mañana.'), riesgo: 0.4,
        efecto: (e, ok) => ok
          ? efecto(L(`Sacas el hilo con los resultados de los últimos tres años y no hay debate posible. Rectifican el vídeo y te suben a ${e._tierMerecida} en la edición corregida.`, `Sacas el hilo con los resultados de los últimos tres años y no hay debate posible. Rectifican el vídeo y te suben a ${e._tierMerecida} en la edición corregida.`, `Sacas el hilo con los resultados de los últimos tres años y no hay debate posible. Rectifican el vídeo y te suben a ${e._tierMerecida} en la edición corregida.`),
              m(e, { fama: [10, 18], moral: [6, 12] }))
          : efecto(L('El hilo huele a rabia desde el primer tuit y las citas te pasan por encima. Ahora la tier list la recuerda todo el mundo por tu respuesta, no por dónde te pusieron.', 'El hilo huele a rabia desde el primer tuit y las citas te pasan por encima. Ahora la tier list la recuerda todo el mundo por tu respuesta, no por dónde te pusieron.', 'El hilo huele a rabia desde el primer tuit y las citas te pasan por encima. Ahora la tier list la recuerda todo el mundo por tu respuesta, no por dónde te pusieron.'),
              m(e, { fama: [6, 12], moral: [-14, -7] })) },
      { txt: L('No decir nada y anotarlo', 'No decir nada y anotarlo', 'No decir nada y anotarlo'), sub: L('Guardarte la captura para el año que viene.', 'Guardarte la captura para el año que viene.', 'Guardarte la captura para el año que viene.'),
        efecto: e => efecto(L(`No comentas, no citas, no das like. Te pones la captura de fondo de pantalla y entrenas con ella delante toda la temporada. Alguien va a pagar esa ${e._tierPuesta}.`, `No comentas, no citas, no das like. Te pones la captura de fondo de pantalla y entrenas con ella delante toda la temporada. Alguien va a pagar esa ${e._tierPuesta}.`, `No comentas, no citas, no das like. Te pones la captura de fondo de pantalla y entrenas con ella delante toda la temporada. Alguien va a pagar esa ${e._tierPuesta}.`),
          m(e, { media: [4, 8], estrategia: [4, 9], moral: [-6, -2], salud: [-5, -1] })) },
    ],
  },
  {
    id: 'speedtie', etapas: ['liga', 'pro', 'cima'], peso: 14,
    titulo: L('El speed tie', 'El speed tie', 'El speed tie'),
    texto: e => L(`Final de un regional. Mismo Pokémon, misma velocidad, moneda al aire: si ganas el empate de velocidad, ganas el torneo. Lo pierdes. ${e.rival.nombre} levanta la copa por una tirada.`, `Final de un regional. Mismo Pokémon, misma velocidad, moneda al aire: si ganas el empate de velocidad, ganas el torneo. Lo pierdes. ${e.rival.nombre} levanta la copa por una tirada.`, `Final de un regional. Mismo Pokémon, misma velocidad, moneda al aire: si ganas el empate de velocidad, ganas el torneo. Lo pierdes. ${e.rival.nombre} levanta la copa por una tirada.`),
    opciones: [
      { txt: L('Rehacer el equipo entero', 'Rehacer el equipo entero', 'Rehacer el equipo entero'), sub: L('Que no dependa nunca de una moneda.', 'Que no dependa nunca de una moneda.', 'Que no dependa nunca de una moneda.'),
        efecto: e => efecto(L('Te pasas el invierno recalculando velocidades y puntos de esfuerzo. No vuelves a perder así, pero el proceso te deja agotado.', 'Te pasas el invierno recalculando velocidades y puntos de esfuerzo. No vuelves a perder así, pero el proceso te deja agotado.', 'Te pasas el invierno recalculando velocidades y puntos de esfuerzo. No vuelves a perder así, pero el proceso te deja agotado.'), m(e, { estrategia: [9, 16], media: [1, 4], salud: [-6, -2] })) },
      { txt: L('Estallar en la entrevista', 'Estallar en la entrevista', 'Estallar en la entrevista'), sub: L('Decir lo que piensas del formato.', 'Decir lo que piensas del formato.', 'Decir lo que piensas del formato.'), riesgo: 0.45,
        efecto: (e, ok) => ok
          ? efecto(L('Tu discurso sobre la varianza se hace viral y abre un debate serio en la comunidad.', 'Tu discurso sobre la varianza se hace viral y abre un debate serio en la comunidad.', 'Tu discurso sobre la varianza se hace viral y abre un debate serio en la comunidad.'), m(e, { fama: [12, 20], moral: [4, 9] }))
          : efecto(L('Suena a mal perdedor. El clip te persigue durante temporadas.', 'Suena a mal perdedor. El clip te persigue durante temporadas.', 'Suena a mal perdedor. El clip te persigue durante temporadas.'), m(e, { fama: [4, 9], moral: [-12, -6] })) },
    ],
  },
  {
    id: 'invitacion_mundial', etapas: ['pro', 'cima'], peso: 14,
    cond: e => e.stats.fama >= 35,
    titulo: L('Te faltan puntos para el Mundial', 'Te faltan puntos para el Mundial', 'Te faltan puntos para el Mundial'),
    texto: () => L('Vas a quedarte fuera del Mundial por un puñado de puntos de campeonato. La única forma de sacarlos es encadenar regionales por media Europa, pagándotelos tú.', 'Vas a quedarte fuera del Mundial por un puñado de puntos de campeonato. La única forma de sacarlos es encadenar regionales por media Europa, pagándotelos tú.', 'Vas a quedarte fuera del Mundial por un puñado de puntos de campeonato. La única forma de sacarlos es encadenar regionales por media Europa, pagándotelos tú.'),
    opciones: [
      { txt: L('Gastarte los ahorros en vuelos', 'Gastarte los ahorros en vuelos', 'Gastarte los ahorros en vuelos'), sub: L('Perseguir los puntos.', 'Perseguir los puntos.', 'Perseguir los puntos.'), riesgo: 0.55,
        efecto: (e, ok) => { const coste = rango(25000, 70000);
          if (ok) { hito(e, '🌍', 'Se ganó la invitación al Mundial a base de vuelos');
            return efecto(L('Cuatro países en seis semanas y los puntos justos. Entras en el Mundial por la puerta de atrás, pero entras.', 'Cuatro países en seis semanas y los puntos justos. Entras en el Mundial por la puerta de atrás, pero entras.', 'Cuatro países en seis semanas y los puntos justos. Entras en el Mundial por la puerta de atrás, pero entras.'), m(e, { dinero: -coste, fama: [10, 18], media: [1, 4], salud: [-10, -4] })); }
          return efecto(L('Cuatro países, cero suerte y la cuenta temblando. Te quedas fuera por dos puntos.', 'Cuatro países, cero suerte y la cuenta temblando. Te quedas fuera por dos puntos.', 'Cuatro países, cero suerte y la cuenta temblando. Te quedas fuera por dos puntos.'), m(e, { dinero: -coste, moral: [-14, -7], salud: [-9, -3] })); } },
      { txt: L('Aceptar que este año no', 'Aceptar que este año no', 'Aceptar que este año no'), sub: L('Guardar fuerzas y dinero.', 'Guardar fuerzas y dinero.', 'Guardar fuerzas y dinero.'),
        efecto: e => efecto(L('Te lo ahorras todo y preparas la temporada siguiente desde enero, con calma. También te quedas sin la experiencia de competir fuera.', 'Te lo ahorras todo y preparas la temporada siguiente desde enero, con calma. También te quedas sin la experiencia de competir fuera.', 'Te lo ahorras todo y preparas la temporada siguiente desde enero, con calma. También te quedas sin la experiencia de competir fuera.'), m(e, { media: [2, 5], salud: [6, 12], moral: [-6, -2] })) },
    ],
  },

  {
    id: 'polemica_twitter', etapas: ['pro', 'cima', 'veterano'], peso: 14, unico: true,
    cond: e => e.stats.fama >= 30,
    titulo: L('Se lía en Twitter', 'Se lía en Twitter', 'Se lía en Twitter'),
    texto: () => L('Contestas a un hilo sobre un tema de actualidad que no tiene nada que ver con Pokémon. En dos horas tienes citas de gente que no sabía ni que existías, un bando aplaudiéndote y otro pidiendo que te caiga algo.', 'Contestas a un hilo sobre un tema de actualidad que no tiene nada que ver con Pokémon. En dos horas tienes citas de gente que no sabía ni que existías, un bando aplaudiéndote y otro pidiendo que te caiga algo.', 'Contestas a un hilo sobre un tema de actualidad que no tiene nada que ver con Pokémon. En dos horas tienes citas de gente que no sabía ni que existías, un bando aplaudiéndote y otro pidiendo que te caiga algo.'),
    opciones: [
      { txt: L('Mantenerte y argumentar', 'Mantenerte y argumentar', 'Mantenerte y argumentar'), sub: L('Has dicho lo que piensas.', 'Has dicho lo que piensas.', 'Has dicho lo que piensas.'), riesgo: 0.4,
        efecto: (e, ok) => ok
          ? efecto(L('Aguantas el chaparrón con educación y varios compañeros salen a apoyarte. Se te respeta más que antes.', 'Aguantas el chaparrón con educación y varios compañeros salen a apoyarte. Se te respeta más que antes.', 'Aguantas el chaparrón con educación y varios compañeros salen a apoyarte. Se te respeta más que antes.'), m(e, { fama: [10, 20], moral: [5, 12] }))
          : efecto(L('El hilo se hace enorme por los motivos equivocados y dos patrocinadores dejan de contestarte los correos.', 'El hilo se hace enorme por los motivos equivocados y dos patrocinadores dejan de contestarte los correos.', 'El hilo se hace enorme por los motivos equivocados y dos patrocinadores dejan de contestarte los correos.'), m(e, { fama: [5, 12], dinero: -rango(20000, 60000), moral: [-14, -7] })) },
      { txt: L('Borrarlo y no volver a entrar', 'Borrarlo y no volver a entrar', 'Borrarlo y no volver a entrar'), sub: L('No era tu guerra.', 'No era tu guerra.', 'No era tu guerra.'),
        efecto: e => efecto(L('Borras, cierras la aplicación y te vas a entrenar. En dos semanas nadie se acuerda, pero por dentro sabes que te callaste.', 'Borras, cierras la aplicación y te vas a entrenar. En dos semanas nadie se acuerda, pero por dentro sabes que te callaste.', 'Borras, cierras la aplicación y te vas a entrenar. En dos semanas nadie se acuerda, pero por dentro sabes que te callaste.'), m(e, { fama: [-5, -1], media: [2, 5], moral: [-5, -1] })) },
    ],
  },
  {
    id: 'hackcheck', etapas: ['liga', 'pro', 'cima'], peso: 14, unico: true,
    titulo: L('Cola del hack check', 'Cola del hack check', 'Cola del hack check'),
    texto: () => L('Sábado, ocho de la mañana, la cola del control de legalidad antes del regional. Uno de tus seis lo criaste con prisas hace semanas y no estás seguro de que pase el filtro. Aquí, ahora, solo puedes jugártela con él o sacarlo y entrar con cinco.', 'Sábado, ocho de la mañana, la cola del control de legalidad antes del regional. Uno de tus seis lo criaste con prisas hace semanas y no estás seguro de que pase el filtro. Aquí, ahora, solo puedes jugártela con él o sacarlo y entrar con cinco.', 'Sábado, ocho de la mañana, la cola del control de legalidad antes del regional. Uno de tus seis lo criaste con prisas hace semanas y no estás seguro de que pase el filtro. Aquí, ahora, solo puedes jugártela con él o sacarlo y entrar con cinco.'),
    opciones: [
      { txt: L('Pasar el equipo tal cual', 'Pasar el equipo tal cual', 'Pasar el equipo tal cual'), sub: L('A ver si cuela.', 'A ver si cuela.', 'A ver si cuela.'), riesgo: 0.5,
        efecto: (e, ok) => { if (ok) return efecto(L('Pasa el control sin una ceja levantada. Juegas con tu equipo bueno y respiras.', 'Pasa el control sin una ceja levantada. Juegas con tu equipo bueno y respiras.', 'Pasa el control sin una ceja levantada. Juegas con tu equipo bueno y respiras.'), m(e, { moral: [4, 9], media: [1, 3] }));
          e.flags.sancionado = true; e.flags.sancionadoAños = 1; e.flags.exsancionado = true;
          return efecto(L('El juez detecta datos imposibles en uno de tus Pokémon. Descalificado del torneo y un año fuera del circuito.', 'El juez detecta datos imposibles en uno de tus Pokémon. Descalificado del torneo y un año fuera del circuito.', 'El juez detecta datos imposibles en uno de tus Pokémon. Descalificado del torneo y un año fuera del circuito.'), m(e, { fama: [-20, -10], moral: [-20, -11] })); } },
      { txt: L('Sacarlo y entrar con cinco', 'Sacarlo y entrar con cinco', 'Sacarlo y entrar con cinco'), sub: L('Jugar corto, pero limpio.', 'Jugar corto, pero limpio.', 'Jugar corto, pero limpio.'),
        efecto: e => efecto(L('Entras con un equipo cojo y caes en la fase suiza, pero sales del pabellón con la conciencia tranquila.', 'Entras con un equipo cojo y caes en la fase suiza, pero sales del pabellón con la conciencia tranquila.', 'Entras con un equipo cojo y caes en la fase suiza, pero sales del pabellón con la conciencia tranquila.'), m(e, { media: [-4, -2], moral: [3, 8] })) },
    ],
  },
  {
    id: 'coaching_riopaser', etapas: ['liga', 'pro', 'cima'], peso: 15, unico: true,
    cond: e => e.dinero >= 30000,
    // Nombre del coach por idioma: Riopaser (es), Edu / Eduardo Cunha (en), Pado (it).
    titulo: () => L('Pagar coaching a Riopaser', 'Paying for coaching with Edu', 'Pagare un coaching con Pado'),
    texto: e => L(`Llevas tres torneos atascado en la misma ronda. Riopaser da sesiones de coaching: repasar tus partidas, tus errores de secuenciación y por qué siempre pierdes los mismos matchups. No es barato y tienes ${e.dinero.toLocaleString(numLocale())} ₽.`,
      `You've been stuck in the same round for three tournaments. Eduardo Cunha, "Edu", gives coaching sessions: reviewing your games, your sequencing mistakes, and why you always lose the same matchups. It's not cheap and you have ${e.dinero.toLocaleString(numLocale())} ₽.`,
      `Sei bloccato allo stesso turno da tre tornei. Pado tiene sessioni di coaching: rivedere le tue partite, i tuoi errori di sequenza e perché perdi sempre gli stessi matchup. Non è economico e hai ${e.dinero.toLocaleString(numLocale())} ₽.`),
    opciones: [
      { txt: L('Pagar el paquete completo', 'Pay for the full package', 'Pagare il pacchetto completo'), sub: L('Meses de sesiones y deberes.', 'Months of sessions and homework.', 'Mesi di sessioni e compiti.'), icono: 'expert-belt', riesgo: 0.75,
        efecto: (e, ok) => { const coste = rango(25000, 55000);
          if (ok) { hito(e, '🧠', L('Se puso en manos de un campeón de Europa', 'Put himself in the hands of a European champion', 'Si è affidato a un campione europeo'));
            return efecto(L('Te destroza la forma de pensar el juego y la reconstruye. En dos meses no juegas igual, y se nota en la tabla.',
              'He tears apart the way you think about the game and rebuilds it. In two months you don\'t play the same, and it shows on the standings.',
              'Ti smonta il modo di pensare al gioco e lo ricostruisce. In due mesi non giochi più allo stesso modo, e si vede in classifica.'),
              m(e, { dinero: -coste, estrategia: [10, 18], media: [3, 7], talento: [2, 5] })); }
          return efecto(L('Las sesiones son buenísimas, pero no haces los deberes entre semana. Aprovechas la mitad de lo que pagaste.',
            'The sessions are excellent, but you don\'t do the homework during the week. You get half the value of what you paid.',
            'Le sessioni sono ottime, ma non fai i compiti durante la settimana. Sfrutti solo metà di quello che hai pagato.'),
            m(e, { dinero: -coste, estrategia: [3, 7] })); } },
      { txt: L('Seguir a tu manera', 'Keep doing it your way', 'Continuare a modo tuo'), sub: L('Guardarte el dinero y aprender solo.', 'Keep the money and learn on your own.', 'Tenerti i soldi e imparare da solo.'),
        efecto: e => efecto(L('Sigues con tu método, sin gastar nada. Mejoras algo por tu cuenta, pero sin nadie que te señale el error que no ves.',
          'You stick with your method, spending nothing. You improve a bit on your own, but with nobody to point out the mistake you can\'t see.',
          'Continui con il tuo metodo, senza spendere nulla. Migliori un po\' per conto tuo, ma senza nessuno che ti indichi l\'errore che non vedi.'), m(e, { estrategia: [2, 5], moral: [-3, 1] })) },
    ],
  },
  {
    id: 'juanan_talavera', etapas: TODAS, peso: 14, unico: true,
    cond: e => e.edad >= 18,   // hay cañas de por medio: solo mayores de edad
    titulo: L('El torneo del bar de Talavera', 'El torneo del bar de Talavera', 'El torneo del bar de Talavera'),
    texto: () => L('Juanan monta un torneo en el bar de siempre, en Talavera: dieciséis personas, una tele vieja, premios de la casa y cañas entre rondas. No da un solo punto de circuito, pero es el mismo finde que tienes reservado para entrenar a tope.', 'Juanan monta un torneo en el bar de siempre, en Talavera: dieciséis personas, una tele vieja, premios de la casa y cañas entre rondas. No da un solo punto de circuito, pero es el mismo finde que tienes reservado para entrenar a tope.', 'Juanan monta un torneo en el bar de siempre, en Talavera: dieciséis personas, una tele vieja, premios de la casa y cañas entre rondas. No da un solo punto de circuito, pero es el mismo finde que tienes reservado para entrenar a tope.'),
    opciones: [
      { txt: L('Ir y jugarlo todo', 'Ir y jugarlo todo', 'Ir y jugarlo todo'), sub: L('Volver a por qué empezaste.', 'Volver a por qué empezaste.', 'Volver a por qué empezaste.'),
        efecto: e => { for (const p of activos(e)) p.vinculo = limitar(p.vinculo + rango(4, 10));
          return efecto(L('Acabáis a las tres de la mañana comentando turnos con la tele congelada. Te vas de allí con las pilas cargadas, pero el finde de entreno se esfuma.', 'Acabáis a las tres de la mañana comentando turnos con la tele congelada. Te vas de allí con las pilas cargadas, pero el finde de entreno se esfuma.', 'Acabáis a las tres de la mañana comentando turnos con la tele congelada. Te vas de allí con las pilas cargadas, pero el finde de entreno se esfuma.'),
            m(e, { moral: [12, 20], vinculo: [6, 12], fama: [2, 6], media: [-2, -1] })); } },
      { txt: L('No ir, tienes que entrenar', 'No ir, tienes que entrenar', 'No ir, tienes que entrenar'), sub: L('Los puntos son los puntos.', 'Los puntos son los puntos.', 'Los puntos son los puntos.'),
        efecto: e => efecto(L('Te quedas entrenando a solas todo el finde. Juanan lo entiende, pero la foto del grupo sale sin ti.', 'Te quedas entrenando a solas todo el finde. Juanan lo entiende, pero la foto del grupo sale sin ti.', 'Te quedas entrenando a solas todo el finde. Juanan lo entiende, pero la foto del grupo sale sin ti.'), m(e, { media: [2, 5], moral: [-6, -2] })) },
    ],
  },
  {
    id: 'equipo_filtrado', etapas: ['pro', 'cima'], peso: 13, unico: true,
    titulo: L('Te han filtrado el equipo', 'Te han filtrado el equipo', 'Te han filtrado el equipo'),
    texto: () => L('Dos días antes del regional, tu equipo aparece publicado en un grupo. Alguien de tu círculo de pruebas lo ha pasado. Todo el mundo va a saber exactamente qué llevas.', 'Dos días antes del regional, tu equipo aparece publicado en un grupo. Alguien de tu círculo de pruebas lo ha pasado. Todo el mundo va a saber exactamente qué llevas.', 'Dos días antes del regional, tu equipo aparece publicado en un grupo. Alguien de tu círculo de pruebas lo ha pasado. Todo el mundo va a saber exactamente qué llevas.'),
    opciones: [
      { txt: L('Cambiarlo entero a última hora', 'Cambiarlo entero a última hora', 'Cambiarlo entero a última hora'), sub: L('Improvisar y sorprender.', 'Improvisar y sorprender.', 'Improvisar y sorprender.'), riesgo: 0.45,
        efecto: (e, ok) => ok
          ? efecto(L('Montas otra cosa en dos noches y nadie sabe qué hacer contra ti. Sales en todos los resúmenes.', 'Montas otra cosa en dos noches y nadie sabe qué hacer contra ti. Sales en todos los resúmenes.', 'Montas otra cosa en dos noches y nadie sabe qué hacer contra ti. Sales en todos los resúmenes.'), m(e, { media: [3, 7], fama: [8, 15], salud: [-8, -3] }))
          : efecto(L('El equipo nuevo no está probado y se rompe solo en la tercera ronda.', 'El equipo nuevo no está probado y se rompe solo en la tercera ronda.', 'El equipo nuevo no está probado y se rompe solo en la tercera ronda.'), m(e, { media: [-3, -1], moral: [-12, -6], salud: [-7, -2] })) },
      { txt: L('Jugarlo igual y afinarlo', 'Jugarlo igual y afinarlo', 'Jugarlo igual y afinarlo'), sub: L('Que sepan lo que llevo.', 'Que sepan lo que llevo.', 'Que sepan lo que llevo.'),
        efecto: e => efecto(L('Cambias dos movimientos y los objetos. Que se preparen para lo que creen que llevas: no es lo mismo saber el equipo que saber jugarlo.', 'Cambias dos movimientos y los objetos. Que se preparen para lo que creen que llevas: no es lo mismo saber el equipo que saber jugarlo.', 'Cambias dos movimientos y los objetos. Que se preparen para lo que creen que llevas: no es lo mismo saber el equipo que saber jugarlo.'), m(e, { estrategia: [6, 12], media: [1, 4] })) },
    ],
  },
  {
    id: 'internacional_piso', etapas: ['pro', 'cima'], peso: 14,
    cond: e => e.stats.fama >= 28,
    titulo: L('Internacional fuera de tu región', 'Internacional fuera de tu región', 'Internacional fuera de tu región'),
    texto: e => L(`Toca un Internacional al otro lado del mundo, lejísimos de ${e.regionNombre}. El truco de siempre: piso compartido con siete personas más, colchón hinchable y testear hasta las cuatro de la mañana. O pagarte un hotel y dormir.`, `Toca un Internacional al otro lado del mundo, lejísimos de ${e.regionNombre}. El truco de siempre: piso compartido con siete personas más, colchón hinchable y testear hasta las cuatro de la mañana. O pagarte un hotel y dormir.`, `Toca un Internacional al otro lado del mundo, lejísimos de ${e.regionNombre}. El truco de siempre: piso compartido con siete personas más, colchón hinchable y testear hasta las cuatro de la mañana. O pagarte un hotel y dormir.`),
    opciones: [
      { txt: L('Piso compartido y testear de noche', 'Piso compartido y testear de noche', 'Piso compartido y testear de noche'), sub: L('Barato y con equipo.', 'Barato y con equipo.', 'Barato y con equipo.'), riesgo: 0.55,
        efecto: (e, ok) => ok
          ? efecto(L('Entre los ocho encontráis el detalle que os faltaba y llegáis al torneo con la respuesta al meta.', 'Entre los ocho encontráis el detalle que os faltaba y llegáis al torneo con la respuesta al meta.', 'Entre los ocho encontráis el detalle que os faltaba y llegáis al torneo con la respuesta al meta.'),
              m(e, { estrategia: [8, 15], media: [1, 4], salud: [-9, -4], vinculo: [3, 7] }))
          : efecto(L('Nadie duerme, uno se pone malo y contagia a medio piso. Llegáis al pabellón hechos polvo.', 'Nadie duerme, uno se pone malo y contagia a medio piso. Llegáis al pabellón hechos polvo.', 'Nadie duerme, uno se pone malo y contagia a medio piso. Llegáis al pabellón hechos polvo.'),
              m(e, { salud: [-16, -8], media: [-3, -1], moral: [-8, -3] })) },
      { txt: L('Hotel y dormir tus horas', 'Hotel y dormir tus horas', 'Hotel y dormir tus horas'), sub: L('Caro, pero llegas entero.', 'Caro, pero llegas entero.', 'Caro, pero llegas entero.'),
        efecto: e => efecto(L('Duermes ocho horas los tres días. Juegas con la cabeza fresca y la cartera más ligera.', 'Duermes ocho horas los tres días. Juegas con la cabeza fresca y la cartera más ligera.', 'Duermes ocho horas los tres días. Juegas con la cabeza fresca y la cartera más ligera.'),
          m(e, { dinero: -rango(20000, 50000), salud: [6, 12], media: [1, 4] })) },
    ],
  },
  {
    id: 'ladder_noche', etapas: ['liga', 'pro', 'cima'], peso: 15,
    titulo: L('La noche antes del torneo', 'La noche antes del torneo', 'La noche antes del torneo'),
    texto: () => L('Son las dos de la mañana del sábado. Llevas doscientas partidas de ladder con el mismo equipo y de repente te parece que todo está mal. Tienes la lista de equipo en blanco delante.', 'Son las dos de la mañana del sábado. Llevas doscientas partidas de ladder con el mismo equipo y de repente te parece que todo está mal. Tienes la lista de equipo en blanco delante.', 'Son las dos de la mañana del sábado. Llevas doscientas partidas de ladder con el mismo equipo y de repente te parece que todo está mal. Tienes la lista de equipo en blanco delante.'),
    opciones: [
      { txt: L('Cambiar dos huecos', 'Cambiar dos huecos', 'Cambiar dos huecos'), sub: L('El clásico error de las dos de la mañana.', 'El clásico error de las dos de la mañana.', 'El clásico error de las dos de la mañana.'), riesgo: 0.4,
        efecto: (e, ok) => { if (ok) { mediaTemporal(e, 4, 2);
            return efecto(L('Los dos cambios eran exactamente lo que necesitabas contra lo que se ha llevado todo el mundo.', 'Los dos cambios eran exactamente lo que necesitabas contra lo que se ha llevado todo el mundo.', 'Los dos cambios eran exactamente lo que necesitabas contra lo que se ha llevado todo el mundo.'), m(e, { estrategia: [4, 9], fama: [4, 9], mediaTexto: 4 })); }
          return efecto(L('Los dos huecos nuevos no encajan con nada. Pierdes tres rondas por combinaciones que nunca probaste.', 'Los dos huecos nuevos no encajan con nada. Pierdes tres rondas por combinaciones que nunca probaste.', 'Los dos huecos nuevos no encajan con nada. Pierdes tres rondas por combinaciones que nunca probaste.'), m(e, { media: [-4, -1], moral: [-11, -5], salud: [-5, -1] })); } },
      { txt: L('Cerrar el portátil y dormir', 'Cerrar el portátil y dormir', 'Cerrar el portátil y dormir'), sub: L('Lo que hay es lo que hay.', 'Lo que hay es lo que hay.', 'Lo que hay es lo que hay.'),
        efecto: e => efecto(L('Apagas y duermes siete horas. Al día siguiente juegas con la cabeza donde tiene que estar, con el equipo que ya conocías.', 'Apagas y duermes siete horas. Al día siguiente juegas con la cabeza donde tiene que estar, con el equipo que ya conocías.', 'Apagas y duermes siete horas. Al día siguiente juegas con la cabeza donde tiene que estar, con el equipo que ya conocías.'), m(e, { salud: [6, 12], estrategia: [1, 4], media: [1, 3] })) },
    ],
  },

  // ── MÁS SITUACIONES DE CARRERA ─────────────────────────────────────────────
  {
    id: 'shiny', etapas: ['novato', 'gimnasios', 'liga', 'pro'], peso: 12, unico: true,
    titulo: L('Sale distinto', 'Sale distinto', 'Sale distinto'),
    texto: () => L('Un Pokémon salvaje aparece con los colores cambiados. Sabes lo que es: uno de esos que la gente busca durante años sin encontrarlo. Un coleccionista de la zona ya te ha ofrecido una cifra que no deberías ni escuchar.', 'Un Pokémon salvaje aparece con los colores cambiados. Sabes lo que es: uno de esos que la gente busca durante años sin encontrarlo. Un coleccionista de la zona ya te ha ofrecido una cifra que no deberías ni escuchar.', 'Un Pokémon salvaje aparece con los colores cambiados. Sabes lo que es: uno de esos que la gente busca durante años sin encontrarlo. Un coleccionista de la zona ya te ha ofrecido una cifra que no deberías ni escuchar.'),
    opciones: [
      { txt: L('Quedártelo y entrenarlo', 'Quedártelo y entrenarlo', 'Quedártelo y entrenarlo'), sub: L('Vale más que el dinero.', 'Vale más que el dinero.', 'Vale más que el dinero.'),
        efecto: e => { const p = capturaAleatoria(e, { rarezaMin: 'raro', shiny: true });
          if (p) { p.forma += rango(3, 8); p.vinculo = limitar(p.vinculo + rango(10, 20)); }
          hito(e, '✨', `Capturó un ${p?.nombre ?? 'ejemplar'} variocolor`);
          return efecto(L(`${p?.nombre ?? 'El ejemplar'} entra en el equipo y no hay foto tuya en la que no salga él.`, `${p?.nombre ?? 'El ejemplar'} entra en el equipo y no hay foto tuya en la que no salga él.`, `${p?.nombre ?? 'El ejemplar'} entra en el equipo y no hay foto tuya en la que no salga él.`),
            m(e, { fama: [6, 13], vinculo: [4, 9] })); } },
      { txt: L('Venderlo al coleccionista', 'Venderlo al coleccionista', 'Venderlo al coleccionista'), sub: L('Ese dinero cambia tu temporada.', 'Ese dinero cambia tu temporada.', 'Ese dinero cambia tu temporada.'),
        efecto: e => efecto(L('Cierras el intercambio sin mirarle. Con ese dinero pagas la temporada entera, pero te acuerdas de él más de lo que esperabas.', 'Cierras el intercambio sin mirarle. Con ese dinero pagas la temporada entera, pero te acuerdas de él más de lo que esperabas.', 'Cierras el intercambio sin mirarle. Con ese dinero pagas la temporada entera, pero te acuerdas de él más de lo que esperabas.'),
          m(e, { dinero: [80000, 180000], moral: [-10, -4], vinculo: [-6, -2] })) },
    ],
  },
  {
    id: 'muñeca', etapas: ['liga', 'pro', 'cima', 'veterano'], peso: 14,
    cond: e => e.edad >= 17,
    titulo: L('Te duele la muñeca', 'Te duele la muñeca', 'Te duele la muñeca'),
    texto: () => L('Llevas meses con molestias en la mano de jugar. El fisio es claro: o paras tres meses ahora, o esto va a más y para de verdad más adelante.', 'Llevas meses con molestias en la mano de jugar. El fisio es claro: o paras tres meses ahora, o esto va a más y para de verdad más adelante.', 'Llevas meses con molestias en la mano de jugar. El fisio es claro: o paras tres meses ahora, o esto va a más y para de verdad más adelante.'),
    opciones: [
      { txt: L('Parar los tres meses', 'Parar los tres meses', 'Parar los tres meses'), sub: L('Perder media temporada y curarte.', 'Perder media temporada y curarte.', 'Perder media temporada y curarte.'),
        efecto: e => efecto(L('Te pierdes dos torneos grandes, pero vuelves sin dolor y sin miedo a que la mano falle en el turno decisivo.', 'Te pierdes dos torneos grandes, pero vuelves sin dolor y sin miedo a que la mano falle en el turno decisivo.', 'Te pierdes dos torneos grandes, pero vuelves sin dolor y sin miedo a que la mano falle en el turno decisivo.'),
          m(e, { salud: [12, 20], media: [-3, -1], fama: [-5, -1] })) },
      { txt: L('Infiltrarte y seguir compitiendo', 'Infiltrarte y seguir compitiendo', 'Infiltrarte y seguir compitiendo'), sub: L('La temporada está en juego.', 'La temporada está en juego.', 'La temporada está en juego.'), riesgo: 0.45,
        efecto: (e, ok) => { if (ok) return efecto(L('Aguantas la temporada a base de antiinflamatorios y hielo. Llegas justo, pero llegas.', 'Aguantas la temporada a base de antiinflamatorios y hielo. Llegas justo, pero llegas.', 'Aguantas la temporada a base de antiinflamatorios y hielo. Llegas justo, pero llegas.'),
            m(e, { fama: [4, 10], salud: [-8, -3] }));
          e.flags.lesionCronica = true;
          return efecto(L('La muñeca dice basta en mitad de un regional. A partir de aquí, el dolor va contigo a todos lados.', 'La muñeca dice basta en mitad de un regional. A partir de aquí, el dolor va contigo a todos lados.', 'La muñeca dice basta en mitad de un regional. A partir de aquí, el dolor va contigo a todos lados.'),
            m(e, { salud: [-18, -10], media: [-4, -2], moral: [-12, -5] })); } },
    ],
  },
  {
    id: 'meta_nuevo', etapas: ['liga', 'pro', 'cima'], peso: 15,
    titulo: L('Cambia la regulación', 'Cambia la regulación', 'Cambia la regulación'),
    texto: () => L('Anuncian nuevas reglas para la temporada que viene: entran Pokémon que estaban prohibidos y tu equipo de siempre se queda a medias. Todo el mundo empieza de cero al mismo tiempo.', 'Anuncian nuevas reglas para la temporada que viene: entran Pokémon que estaban prohibidos y tu equipo de siempre se queda a medias. Todo el mundo empieza de cero al mismo tiempo.', 'Anuncian nuevas reglas para la temporada que viene: entran Pokémon que estaban prohibidos y tu equipo de siempre se queda a medias. Todo el mundo empieza de cero al mismo tiempo.'),
    opciones: [
      { txt: L('Ser de los primeros en romperlo', 'Ser de los primeros en romperlo', 'Ser de los primeros en romperlo'), sub: L('Encontrar la combinación antes que nadie.', 'Encontrar la combinación antes que nadie.', 'Encontrar la combinación antes que nadie.'), riesgo: 0.45,
        efecto: (e, ok) => { if (ok) { hito(e, '🔬', 'Descifró el meta nuevo antes que nadie');
            return efecto(L('Das con una pareja que nadie había probado y arrasas los dos primeros torneos antes de que se copie.', 'Das con una pareja que nadie había probado y arrasas los dos primeros torneos antes de que se copie.', 'Das con una pareja que nadie había probado y arrasas los dos primeros torneos antes de que se copie.'),
              m(e, { media: [4, 8], fama: [10, 18], estrategia: [5, 10] })); }
          return efecto(L('Pruebas veinte cosas raras y ninguna funciona. Pierdes el arranque de temporada experimentando.', 'Pruebas veinte cosas raras y ninguna funciona. Pierdes el arranque de temporada experimentando.', 'Pruebas veinte cosas raras y ninguna funciona. Pierdes el arranque de temporada experimentando.'),
            m(e, { media: [-3, -1], moral: [-9, -4], estrategia: [3, 7] })); } },
      { txt: L('Copiar lo que funcione y afinarlo', 'Copiar lo que funcione y afinarlo', 'Copiar lo que funcione y afinarlo'), sub: L('Dejar que otros exploren.', 'Dejar que otros exploren.', 'Dejar que otros exploren.'),
        efecto: e => efecto(L('Esperas un mes, coges el equipo que gana y lo ajustas mejor que su creador. Poco glamour, muchos puntos.', 'Esperas un mes, coges el equipo que gana y lo ajustas mejor que su creador. Poco glamour, muchos puntos.', 'Esperas un mes, coges el equipo que gana y lo ajustas mejor que su creador. Poco glamour, muchos puntos.'),
          m(e, { media: [2, 5], estrategia: [4, 9], fama: [-4, -1] })) },
    ],
  },
  {
    id: 'sorteo_grupo', etapas: ['liga', 'pro', 'cima'], peso: 13,
    titulo: L('El sorteo te odia', 'El sorteo te odia', 'El sorteo te odia'),
    texto: e => L(`Sale el cuadro del torneo y te ha tocado el peor lado posible: tres cabezas de serie y ${e.rival.nombre} esperando en octavos.`, `Sale el cuadro del torneo y te ha tocado el peor lado posible: tres cabezas de serie y ${e.rival.nombre} esperando en octavos.`, `Sale el cuadro del torneo y te ha tocado el peor lado posible: tres cabezas de serie y ${e.rival.nombre} esperando en octavos.`),
    opciones: [
      { txt: L('Preparar solo ese cuadro', 'Preparar solo ese cuadro', 'Preparar solo ese cuadro'), sub: L('Estudiar a los tres, uno por uno.', 'Estudiar a los tres, uno por uno.', 'Estudiar a los tres, uno por uno.'),
        efecto: e => efecto(L('Te aprendes sus equipos de memoria y llegas sabiendo cada movimiento que van a hacer. Duermes fatal esa semana.', 'Te aprendes sus equipos de memoria y llegas sabiendo cada movimiento que van a hacer. Duermes fatal esa semana.', 'Te aprendes sus equipos de memoria y llegas sabiendo cada movimiento que van a hacer. Duermes fatal esa semana.'),
          m(e, { estrategia: [8, 14], salud: [-6, -2] })) },
      { txt: L('Ignorar el cuadro y jugar tu juego', 'Ignorar el cuadro y jugar tu juego', 'Ignorar el cuadro y jugar tu juego'), sub: L('Ronda a ronda, sin mirar más allá.', 'Ronda a ronda, sin mirar más allá.', 'Ronda a ronda, sin mirar más allá.'), riesgo: 0.5,
        efecto: (e, ok) => ok
          ? efecto(L('Sin la presión de pensar en la siguiente ronda, juegas suelto y te llevas por delante a dos cabezas de serie.', 'Sin la presión de pensar en la siguiente ronda, juegas suelto y te llevas por delante a dos cabezas de serie.', 'Sin la presión de pensar en la siguiente ronda, juegas suelto y te llevas por delante a dos cabezas de serie.'),
              m(e, { media: [2, 6], fama: [8, 15], moral: [6, 12] }))
          : efecto(L('Te cruzas con el primer cabeza de serie sin haberle estudiado y te pasa por encima en la segunda ronda.', 'Te cruzas con el primer cabeza de serie sin haberle estudiado y te pasa por encima en la segunda ronda.', 'Te cruzas con el primer cabeza de serie sin haberle estudiado y te pasa por encima en la segunda ronda.'),
              m(e, { moral: [-10, -4], fama: [-4, -1] })) },
    ],
  },
  {
    id: 'fan', etapas: ['liga', 'pro', 'cima', 'veterano'], peso: 12,
    cond: e => e.stats.fama >= 25,
    titulo: L('Una carta de una cría', 'Una carta de una cría', 'Una carta de una cría'),
    texto: () => L('Entre el correo hay una carta escrita a mano. Una cría de nueve años te cuenta que empezó a competir porque te vio a ti, y que su Pokémon se llama como el tuyo. Pide una foto firmada. La dirección está a cuatro horas de aquí.', 'Entre el correo hay una carta escrita a mano. Una cría de nueve años te cuenta que empezó a competir porque te vio a ti, y que su Pokémon se llama como el tuyo. Pide una foto firmada. La dirección está a cuatro horas de aquí.', 'Entre el correo hay una carta escrita a mano. Una cría de nueve años te cuenta que empezó a competir porque te vio a ti, y que su Pokémon se llama como el tuyo. Pide una foto firmada. La dirección está a cuatro horas de aquí.'),
    opciones: [
      { txt: L('Presentarte en su casa sin avisar', 'Presentarte en su casa sin avisar', 'Presentarte en su casa sin avisar'), sub: L('Ocho horas de coche por una foto.', 'Ocho horas de coche por una foto.', 'Ocho horas de coche por una foto.'),
        efecto: e => { hito(e, '💌', 'Condujo cuatro horas para responder una carta');
          return efecto(L('Su madre no se lo cree, ella menos. El vídeo lo sube un vecino y le da la vuelta al país en dos días.', 'Su madre no se lo cree, ella menos. El vídeo lo sube un vecino y le da la vuelta al país en dos días.', 'Su madre no se lo cree, ella menos. El vídeo lo sube un vecino y le da la vuelta al país en dos días.'),
            m(e, { fama: [12, 22], moral: [14, 22], media: [-2, -1] })); } },
      { txt: L('Mandarle la foto firmada y una carta', 'Mandarle la foto firmada y una carta', 'Mandarle la foto firmada y una carta'), sub: L('Contestar bien, sin dramatizar.', 'Contestar bien, sin dramatizar.', 'Contestar bien, sin dramatizar.'),
        efecto: e => efecto(L('Le escribes tres párrafos de verdad y le mandas la foto. Nadie se entera, pero ella la tiene enmarcada.', 'Le escribes tres párrafos de verdad y le mandas la foto. Nadie se entera, pero ella la tiene enmarcada.', 'Le escribes tres párrafos de verdad y le mandas la foto. Nadie se entera, pero ella la tiene enmarcada.'),
          m(e, { moral: [6, 12], fama: [1, 4] })) },
    ],
  },
  {
    id: 'patrocinador_equipo', etapas: ['pro', 'cima', 'veterano'], peso: 16, unico: true,
    cond: e => !!e.flags.patrocinio,
    titulo: L('Tu patrocinador quiere mandar en tu equipo', 'Tu patrocinador quiere mandar en tu equipo', 'Tu patrocinador quiere mandar en tu equipo'),
    texto: e => L(`Marketing tiene una idea: que lleves siempre al mismo Pokémon, el que sale en los anuncios, aunque no encaje en el meta. Ofrecen renovar por el doble si aceptas. Ahora mismo tu mejor carta es ${masFuerte(e)?.nombre ?? 'tu mejor Pokémon'}.`, `Marketing tiene una idea: que lleves siempre al mismo Pokémon, el que sale en los anuncios, aunque no encaje en el meta. Ofrecen renovar por el doble si aceptas. Ahora mismo tu mejor carta es ${masFuerte(e)?.nombre ?? 'tu mejor Pokémon'}.`, `Marketing tiene una idea: que lleves siempre al mismo Pokémon, el que sale en los anuncios, aunque no encaje en el meta. Ofrecen renovar por el doble si aceptas. Ahora mismo tu mejor carta es ${masFuerte(e)?.nombre ?? 'tu mejor Pokémon'}.`),
    opciones: [
      { txt: L('Aceptar y jugar con la mascota', 'Aceptar y jugar con la mascota', 'Aceptar y jugar con la mascota'), sub: L('Cobrar el doble a costa del equipo.', 'Cobrar el doble a costa del equipo.', 'Cobrar el doble a costa del equipo.'),
        efecto: e => efecto(L('Firmas. Compites con un hueco condicionado por un contrato y se te nota en los resultados, pero la cuenta corriente no se queja.', 'Firmas. Compites con un hueco condicionado por un contrato y se te nota en los resultados, pero la cuenta corriente no se queja.', 'Firmas. Compites con un hueco condicionado por un contrato y se te nota en los resultados, pero la cuenta corriente no se queja.'),
          m(e, { dinero: [200000, 400000], media: [-5, -2], moral: [-6, -2] })) },
      { txt: L('Negarte y arriesgar el contrato', 'Negarte y arriesgar el contrato', 'Negarte y arriesgar el contrato'), sub: L('El equipo lo eliges tú.', 'El equipo lo eliges tú.', 'El equipo lo eliges tú.'), riesgo: 0.55,
        efecto: (e, ok) => ok
          ? efecto(L('Aguantan tu negativa porque ganas, y la historia del jugador que dijo que no acaba siendo mejor publicidad que el anuncio.', 'Aguantan tu negativa porque ganas, y la historia del jugador que dijo que no acaba siendo mejor publicidad que el anuncio.', 'Aguantan tu negativa porque ganas, y la historia del jugador que dijo que no acaba siendo mejor publicidad que el anuncio.'),
              m(e, { fama: [8, 15], moral: [8, 14], media: [1, 4] }))
          : (e.flags.patrocinio = false,
             efecto(L('Rompen el contrato en enero. Te quedas sin ese dinero justo cuando más viajes tenías por delante.', 'Rompen el contrato en enero. Te quedas sin ese dinero justo cuando más viajes tenías por delante.', 'Rompen el contrato en enero. Te quedas sin ese dinero justo cuando más viajes tenías por delante.'),
               m(e, { dinero: -rango(30000, 80000), moral: [-8, -3], media: [1, 3] }))) },
    ],
  },
  {
    id: 'benefico', etapas: ['pro', 'cima', 'veterano'], peso: 12,
    cond: e => e.stats.fama >= 30,
    titulo: L('Torneo benéfico', 'Torneo benéfico', 'Torneo benéfico'),
    texto: () => L('Un hospital infantil organiza un torneo para recaudar fondos y quiere cabezas conocidas. Es el mismo fin de semana que un regional con puntos en juego.', 'Un hospital infantil organiza un torneo para recaudar fondos y quiere cabezas conocidas. Es el mismo fin de semana que un regional con puntos en juego.', 'Un hospital infantil organiza un torneo para recaudar fondos y quiere cabezas conocidas. Es el mismo fin de semana que un regional con puntos en juego.'),
    opciones: [
      { txt: L('Ir al benéfico', 'Ir al benéfico', 'Ir al benéfico'), sub: L('Los puntos ya llegarán.', 'Los puntos ya llegarán.', 'Los puntos ya llegarán.'),
        efecto: e => { hito(e, '🎗️', 'Jugó el benéfico en vez del regional');
          return efecto(L('Pasas el sábado jugando con críos ingresados y el domingo viendo el regional por el móvil. Volverías a hacerlo.', 'Pasas el sábado jugando con críos ingresados y el domingo viendo el regional por el móvil. Volverías a hacerlo.', 'Pasas el sábado jugando con críos ingresados y el domingo viendo el regional por el móvil. Volverías a hacerlo.'),
            m(e, { fama: [8, 15], moral: [12, 20], media: [-2, -1] })); } },
      { txt: L('Ir al regional', 'Ir al regional', 'Ir al regional'), sub: L('Estás para competir.', 'Estás para competir.', 'Estás para competir.'),
        efecto: e => efecto(L('Vas a por los puntos y los sacas. En redes alguien comenta quién sí fue al hospital y quién no.', 'Vas a por los puntos y los sacas. En redes alguien comenta quién sí fue al hospital y quién no.', 'Vas a por los puntos y los sacas. En redes alguien comenta quién sí fue al hospital y quién no.'),
          m(e, { media: [2, 5], fama: [-5, -1], moral: [-6, -2] })) },
    ],
  },
  {
    id: 'mentor', etapas: ['novato', 'gimnasios', 'liga'], peso: 14, unico: true,
    titulo: L('Alguien se ofrece a enseñarte', 'Alguien se ofrece a enseñarte', 'Alguien se ofrece a enseñarte'),
    texto: e => L(`Un veterano del circuito de ${e.regionNombre}, de los que ya no compiten, te ve entrenar y se ofrece a llevarte. Método antiguo, mucha disciplina y cero paciencia con las excusas.`, `Un veterano del circuito de ${e.regionNombre}, de los que ya no compiten, te ve entrenar y se ofrece a llevarte. Método antiguo, mucha disciplina y cero paciencia con las excusas.`, `Un veterano del circuito de ${e.regionNombre}, de los que ya no compiten, te ve entrenar y se ofrece a llevarte. Método antiguo, mucha disciplina y cero paciencia con las excusas.`),
    opciones: [
      { txt: L('Ponerte en sus manos', 'Ponerte en sus manos', 'Ponerte en sus manos'), sub: L('Hacer lo que te diga, sin discutir.', 'Hacer lo que te diga, sin discutir.', 'Hacer lo que te diga, sin discutir.'), riesgo: 0.7,
        efecto: (e, ok) => { if (ok) { hito(e, '🥋', 'Se formó con un veterano del circuito');
            return efecto(L('Te corrige cosas que llevabas años haciendo mal sin saberlo. Es duro, pero sales de ahí siendo otro jugador.', 'Te corrige cosas que llevabas años haciendo mal sin saberlo. Es duro, pero sales de ahí siendo otro jugador.', 'Te corrige cosas que llevabas años haciendo mal sin saberlo. Es duro, pero sales de ahí siendo otro jugador.'),
              m(e, { estrategia: [8, 14], media: [3, 6], talento: [2, 5], moral: [-4, -1] })); }
          return efecto(L('Su método es de otra época y chocáis todo el rato. Lo dejáis a los seis meses, cada uno pensando que el otro no entendía nada.', 'Su método es de otra época y chocáis todo el rato. Lo dejáis a los seis meses, cada uno pensando que el otro no entendía nada.', 'Su método es de otra época y chocáis todo el rato. Lo dejáis a los seis meses, cada uno pensando que el otro no entendía nada.'),
            m(e, { moral: [-8, -3], estrategia: [1, 4] })); } },
      { txt: L('Agradecérselo y seguir solo', 'Agradecérselo y seguir solo', 'Agradecérselo y seguir solo'), sub: L('Aprender a tu ritmo.', 'Aprender a tu ritmo.', 'Aprender a tu ritmo.'),
        efecto: e => efecto(L('Le dices que prefieres equivocarte por tu cuenta. Tardas más en aprender, pero lo que aprendes es tuyo.', 'Le dices que prefieres equivocarte por tu cuenta. Tardas más en aprender, pero lo que aprendes es tuyo.', 'Le dices que prefieres equivocarte por tu cuenta. Tardas más en aprender, pero lo que aprendes es tuyo.'),
          m(e, { media: [1, 4], moral: [3, 7] })) },
    ],
  },
  {
    id: 'ducha', etapas: ['liga', 'pro', 'cima'], peso: 14, unico: true,
    titulo: L('Llevas tres días testeando', 'Llevas tres días testeando', 'Llevas tres días testeando'),
    texto: () => L('Sábado, pabellón lleno, y tú llevas desde el jueves encerrado probando el equipo. La ronda empieza en veinte minutos: te da justo para una ducha rápida en el hotel o para dos partidas más de prueba. Tu compañero de piso te mira y no dice nada, que ya es decir.', 'Sábado, pabellón lleno, y tú llevas desde el jueves encerrado probando el equipo. La ronda empieza en veinte minutos: te da justo para una ducha rápida en el hotel o para dos partidas más de prueba. Tu compañero de piso te mira y no dice nada, que ya es decir.', 'Sábado, pabellón lleno, y tú llevas desde el jueves encerrado probando el equipo. La ronda empieza en veinte minutos: te da justo para una ducha rápida en el hotel o para dos partidas más de prueba. Tu compañero de piso te mira y no dice nada, que ya es decir.'),
    opciones: [
      { txt: L('Dos partidas más', 'Dos partidas más', 'Dos partidas más'), sub: L('La ducha puede esperar.', 'La ducha puede esperar.', 'La ducha puede esperar.'), riesgo: 0.65,
        efecto: (e, ok) => ok
          ? efecto(L('En esas dos partidas das con el detalle que te faltaba. Nadie te dice nada del olor, pero alguien abre una ventana.', 'En esas dos partidas das con el detalle que te faltaba. Nadie te dice nada del olor, pero alguien abre una ventana.', 'En esas dos partidas das con el detalle que te faltaba. Nadie te dice nada del olor, pero alguien abre una ventana.'),
              m(e, { estrategia: [6, 12], media: [1, 4], fama: [-3, -1] }))
          : efecto(L('A media ronda un juez te aparta con mucha educación y te lee la parte del reglamento sobre higiene personal. Te vas del pabellón antes de terminar el torneo, y el mote te dura años.', 'A media ronda un juez te aparta con mucha educación y te lee la parte del reglamento sobre higiene personal. Te vas del pabellón antes de terminar el torneo, y el mote te dura años.', 'A media ronda un juez te aparta con mucha educación y te lee la parte del reglamento sobre higiene personal. Te vas del pabellón antes de terminar el torneo, y el mote te dura años.'),
              m(e, { fama: [-14, -7], moral: [-16, -8], media: [-2, -1] })) },
      { txt: L('Ducharte y llegar decente', 'Ducharte y llegar decente', 'Ducharte y llegar decente'), sub: L('Entras con lo que tengas probado.', 'Entras con lo que tengas probado.', 'Entras con lo que tengas probado.'),
        efecto: e => efecto(L('Llegas justo, oliendo a gel de hotel y sin ese último ajuste. Los de tu mesa lo agradecen más que tú.', 'Llegas justo, oliendo a gel de hotel y sin ese último ajuste. Los de tu mesa lo agradecen más que tú.', 'Llegas justo, oliendo a gel de hotel y sin ese último ajuste. Los de tu mesa lo agradecen más que tú.'),
          m(e, { media: [-2, -1], moral: [4, 9], fama: [2, 5] })) },
    ],
  },
  {
    id: 'retiro_anticipado', etapas: ['pro', 'cima', 'veterano'], peso: 16, unico: true,
    cond: e => e.edad >= 28,
    titulo: L('La oferta que te hace pensar en dejarlo', 'La oferta que te hace pensar en dejarlo', 'La oferta que te hace pensar en dejarlo'),
    texto: e => { const opciones = [
        `Una academia de ${e.regionNombre} te ofrece dirigirla a tiempo completo: formar a la próxima generación en vez de competir contra ella.`,
        'Una cadena de televisión te propone ser comentarista fijo del circuito: bajarte del escenario, coger el micrófono.',
        `El Alto Mando de ${e.regionNombre} tiene una plaza libre y tu nombre en la lista corta.`,
        'Llevas media vida en hoteles y aeropuertos. Por primera vez, alguien te pregunta qué quieres tú, no qué necesita el circuito.',
      ]; e._motivoRetiro = elegir(opciones);
      return `${e._motivoRetiro} Nadie te obliga a decidir hoy, pero la oferta no va a esperar para siempre.`; },
    opciones: [
      { txt: L('Aceptar y retirarte ahora', 'Aceptar y retirarte ahora', 'Aceptar y retirarte ahora'), sub: L('Cerrar esta etapa por decisión propia.', 'Cerrar esta etapa por decisión propia.', 'Cerrar esta etapa por decisión propia.'),
        efecto: e => { e.flags.retiroElegido = true; hito(e, '🎬', `Se retiró a los ${e.edad} para empezar algo nuevo`);
          return efecto(L(`Aceptas. ${e._motivoRetiro?.startsWith('Una academia') ? 'Cuelgas las Poké Balls de competición y te pones a formar entrenadores.' : e._motivoRetiro?.startsWith('Una cadena') ? 'La próxima vez que te vean será en un plató, no en un escenario.' : e._motivoRetiro?.startsWith('El Alto Mando') ? 'Te sientas en la silla que veías por la tele de crío.' : 'Por primera vez en años, el calendario lo decides tú.'} No hay marcha atrás, y por una vez eso te alivia.`, `Aceptas. ${e._motivoRetiro?.startsWith('Una academia') ? 'Cuelgas las Poké Balls de competición y te pones a formar entrenadores.' : e._motivoRetiro?.startsWith('Una cadena') ? 'La próxima vez que te vean será en un plató, no en un escenario.' : e._motivoRetiro?.startsWith('El Alto Mando') ? 'Te sientas en la silla que veías por la tele de crío.' : 'Por primera vez en años, el calendario lo decides tú.'} No hay marcha atrás, y por una vez eso te alivia.`, `Aceptas. ${e._motivoRetiro?.startsWith('Una academia') ? 'Cuelgas las Poké Balls de competición y te pones a formar entrenadores.' : e._motivoRetiro?.startsWith('Una cadena') ? 'La próxima vez que te vean será en un plató, no en un escenario.' : e._motivoRetiro?.startsWith('El Alto Mando') ? 'Te sientas en la silla que veías por la tele de crío.' : 'Por primera vez en años, el calendario lo decides tú.'} No hay marcha atrás, y por una vez eso te alivia.`),
            m(e, { moral: [14, 24], fama: [4, 10] })); } },
      { txt: L('Rechazarla y seguir compitiendo', 'Rechazarla y seguir compitiendo', 'Rechazarla y seguir compitiendo'), sub: L('Todavía te queda cuerda.', 'Todavía te queda cuerda.', 'Todavía te queda cuerda.'),
        efecto: e => efecto(L('Le dices que no. La oferta se enfría, pero tú sigues compitiendo, que es donde quieres estar.', 'Le dices que no. La oferta se enfría, pero tú sigues compitiendo, que es donde quieres estar.', 'Le dices que no. La oferta se enfría, pero tú sigues compitiendo, que es donde quieres estar.'), m(e, { media: [1, 4], moral: [3, 7] })) },
    ],
  },
  {
    id: 'santuario', etapas: ['veterano', 'cima'], peso: 12, cond: e => e.dinero > 200000,
    titulo: L('Qué hacer con el dinero', 'Qué hacer con el dinero', 'Qué hacer con el dinero'),
    texto: e => L(`Tienes ${e.dinero.toLocaleString('es')} ₽ en el banco y la carrera entrando en su recta final.`, `Tienes ${e.dinero.toLocaleString('es')} ₽ en el banco y la carrera entrando en su recta final.`, `Tienes ${e.dinero.toLocaleString('es')} ₽ en el banco y la carrera entrando en su recta final.`),
    opciones: [
      { txt: L('Abrir un santuario', 'Abrir un santuario', 'Abrir un santuario'), sub: L('Un sitio para los retirados.', 'Un sitio para los retirados.', 'Un sitio para los retirados.'),
        efecto: e => { e.flags.santuario = true; hito(e, '🏞️', 'Fundó un santuario para Pokémon retirados');
          return efecto(L('Compras un valle entero. Se llena de veteranos de todo el circuito.', 'Compras un valle entero. Se llena de veteranos de todo el circuito.', 'Compras un valle entero. Se llena de veteranos de todo el circuito.'), m(e, { dinero: -Math.round(e.dinero * 0.7), fama: [8, 15], moral: [18, 28], vinculo: [11, 19] })); } },
      { txt: L('Invertir en tu equipo', 'Invertir en tu equipo', 'Invertir en tu equipo'), sub: L('Instalaciones de élite.', 'Instalaciones de élite.', 'Instalaciones de élite.'), icono: 'assault-vest',
        efecto: e => { objetoAleatorio(e);
          return efecto(L('Centro de alto rendimiento, nutricionistas, analistas. El equipo rinde como nunca.', 'Centro de alto rendimiento, nutricionistas, analistas. El equipo rinde como nunca.', 'Centro de alto rendimiento, nutricionistas, analistas. El equipo rinde como nunca.'), m(e, { dinero: -Math.round(e.dinero * 0.5), media: [3, 7], talento: [1, 4], salud: [4, 9] })); } },
      { txt: L('Guardarlo todo', 'Guardarlo todo', 'Guardarlo todo'), sub: L('Después del deporte hay vida.', 'Después del deporte hay vida.', 'Después del deporte hay vida.'),
        efecto: e => efecto(L('Lo dejas quieto. Cuando te retires no tendrás que trabajar nunca más.', 'Lo dejas quieto. Cuando te retires no tendrás que trabajar nunca más.', 'Lo dejas quieto. Cuando te retires no tendrás que trabajar nunca más.'), m(e, { moral: [3, 8] })) },
    ],
  },
  {
    id: 'mo_esclavo', etapas: ['gimnasios', 'liga', 'pro'], peso: 13, unico: true,
    titulo: L('Corte, Fuerza y Surf', 'Corte, Fuerza y Surf', 'Corte, Fuerza y Surf'),
    texto: e => L(`La ruta al torneo está cortada por un río, un árbol y una roca del tamaño de una casa. Hacen falta tres movimientos de utilidad y ninguno de tus titulares quiere gastar un hueco de ataques en eso. ${masFuerte(e)?.nombre ?? 'Tu estrella'} directamente te da la espalda.`, `La ruta al torneo está cortada por un río, un árbol y una roca del tamaño de una casa. Hacen falta tres movimientos de utilidad y ninguno de tus titulares quiere gastar un hueco de ataques en eso. ${masFuerte(e)?.nombre ?? 'Tu estrella'} directamente te da la espalda.`, `La ruta al torneo está cortada por un río, un árbol y una roca del tamaño de una casa. Hacen falta tres movimientos de utilidad y ninguno de tus titulares quiere gastar un hueco de ataques en eso. ${masFuerte(e)?.nombre ?? 'Tu estrella'} directamente te da la espalda.`),
    opciones: [
      { txt: L('Capturar un Zigzagoon para eso', 'Capturar un Zigzagoon para eso', 'Capturar un Zigzagoon para eso'), sub: L('Que aprenda las tres y punto.', 'Que aprenda las tres y punto.', 'Que aprenda las tres y punto.'), icono: 'poke', riesgo: 0.6,
        efecto: (e, ok) => { const p = fichar(e, 'zigzagoon', { nivel: 12 });
          if (ok) return efecto(L(`Cruzas la ruta en un día. ${p?.nombre ?? 'El Zigzagoon'} resulta ser incansable y acaba haciéndose un hueco de verdad en el equipo.`, `Cruzas la ruta en un día. ${p?.nombre ?? 'El Zigzagoon'} resulta ser incansable y acaba haciéndose un hueco de verdad en el equipo.`, `Cruzas la ruta en un día. ${p?.nombre ?? 'El Zigzagoon'} resulta ser incansable y acaba haciéndose un hueco de verdad en el equipo.`),
            m(e, { media: [1, 3], estrategia: [4, 8], vinculo: [2, 5] }));
          return efecto(L(`Cruzas la ruta, sí, pero una foto tuya obligándole a partir el árbol de madrugada da la vuelta al circuito. "Mula de carga", titulan. ${p?.nombre ?? 'El Zigzagoon'} se queda en el equipo y tú te comes la portada.`, `Cruzas la ruta, sí, pero una foto tuya obligándole a partir el árbol de madrugada da la vuelta al circuito. "Mula de carga", titulan. ${p?.nombre ?? 'El Zigzagoon'} se queda en el equipo y tú te comes la portada.`, `Cruzas la ruta, sí, pero una foto tuya obligándole a partir el árbol de madrugada da la vuelta al circuito. "Mula de carga", titulan. ${p?.nombre ?? 'El Zigzagoon'} se queda en el equipo y tú te comes la portada.`),
            m(e, { fama: [-10, -5], moral: [-6, -2], estrategia: [3, 6] })); } },
      { txt: L('Que tu estrella olvide su mejor ataque', 'Que tu estrella olvide su mejor ataque', 'Que tu estrella olvide su mejor ataque'), sub: L('Tú pierdes, la imagen no.', 'Tú pierdes, la imagen no.', 'Tú pierdes, la imagen no.'),
        efecto: e => { const p = masFuerte(e); if (p) p.forma = Math.max(-20, (p.forma ?? 0) - rango(6, 12));
          return efecto(L(`${p?.nombre ?? 'Tu mejor Pokémon'} aprende Corte encima de lo que mejor hacía. Pasas la ruta con la cabeza alta y con un ataque menos en el torneo.`, `${p?.nombre ?? 'Tu mejor Pokémon'} aprende Corte encima de lo que mejor hacía. Pasas la ruta con la cabeza alta y con un ataque menos en el torneo.`, `${p?.nombre ?? 'Tu mejor Pokémon'} aprende Corte encima de lo que mejor hacía. Pasas la ruta con la cabeza alta y con un ataque menos en el torneo.`),
            m(e, { media: [-2, -1], fama: [2, 5], vinculo: [5, 10] })); } },
      { txt: L('Rodear la ruta a pie', 'Rodear la ruta a pie', 'Rodear la ruta a pie'), sub: L('Tres días más de camino.', 'Tres días más de camino.', 'Tres días más de camino.'),
        efecto: e => efecto(L('Bordeáis la montaña entera cargando con todo. Llegas tarde, agotado y sin haberle pedido nada raro a nadie. El equipo lo nota y te lo devuelve.', 'Bordeáis la montaña entera cargando con todo. Llegas tarde, agotado y sin haberle pedido nada raro a nadie. El equipo lo nota y te lo devuelve.', 'Bordeáis la montaña entera cargando con todo. Llegas tarde, agotado y sin haberle pedido nada raro a nadie. El equipo lo nota y te lo devuelve.'),
          m(e, { salud: [-9, -4], dinero: -rango(1500, 4000), vinculo: [8, 14], moral: [2, 6] })) },
    ],
  },
  {
    id: 'guarderia_olvido', etapas: ['pro', 'cima', 'veterano'], peso: 11, unico: true,
    // Nunca antes de la novena temporada: la gracia es que lleve años ahí.
    cond: e => e.año >= 9,
    titulo: L('La factura de la guardería', 'La factura de la guardería', 'La factura de la guardería'),
    texto: e => L(`Auditando tus cuentas, tu gestor encuentra un cargo pequeño que se repite desde hace ${e.año - 1} años: una guardería de la Ruta 3. Llamas. Sigue allí el Pidgey que dejaste "una semana" cuando tenías ${e.edad - (e.año - 1)} años. Con los intereses, la cuenta es obscena.`, `Auditando tus cuentas, tu gestor encuentra un cargo pequeño que se repite desde hace ${e.año - 1} años: una guardería de la Ruta 3. Llamas. Sigue allí el Pidgey que dejaste "una semana" cuando tenías ${e.edad - (e.año - 1)} años. Con los intereses, la cuenta es obscena.`, `Auditando tus cuentas, tu gestor encuentra un cargo pequeño que se repite desde hace ${e.año - 1} años: una guardería de la Ruta 3. Llamas. Sigue allí el Pidgey que dejaste "una semana" cuando tenías ${e.edad - (e.año - 1)} años. Con los intereses, la cuenta es obscena.`),
    opciones: [
      { txt: L('Pagar la factura entera', 'Pagar la factura entera', 'Pagar la factura entera'), sub: L('Ocho años cuestan lo que cuestan.', 'Ocho años cuestan lo que cuestan.', 'Ocho años cuestan lo que cuestan.'), cond: e => e.dinero >= 40000,
        efecto: e => { const p = fichar(e, 'pidgey', { nivel: 100 });
          hito(e, '🕊️', `Recuperó al Pidgey que olvidó ${e.año - 1} años en una guardería`);
          return efecto(L(`Pagas sin mirar el total. Lo que sale del recinto no es un Pidgey: es un ${p?.nombre ?? 'Pidgeot'} enorme que lleva ocho años comiendo y entrenando con los cuidadores, y que te reconoce igualmente.`, `Pagas sin mirar el total. Lo que sale del recinto no es un Pidgey: es un ${p?.nombre ?? 'Pidgeot'} enorme que lleva ocho años comiendo y entrenando con los cuidadores, y que te reconoce igualmente.`, `Pagas sin mirar el total. Lo que sale del recinto no es un Pidgey: es un ${p?.nombre ?? 'Pidgeot'} enorme que lleva ocho años comiendo y entrenando con los cuidadores, y que te reconoce igualmente.`),
            m(e, { dinero: -Math.round(Math.max(40000, e.dinero * 0.55)), moral: [8, 15], vinculo: [10, 17], media: [1, 3] })); } },
      { txt: L('Pagar y dejarlo donde está', 'Pagar y dejarlo donde está', 'Pagar y dejarlo donde está'), sub: L('Su casa es esa, no la tuya.', 'Su casa es esa, no la tuya.', 'Su casa es esa, no la tuya.'),
        efecto: e => efecto(L('Saldas la cuenta y firmas que se queda de por vida, con todo pagado. Los ancianos te mandan una foto suya cada temporada y tú la guardas siempre.', 'Saldas la cuenta y firmas que se queda de por vida, con todo pagado. Los ancianos te mandan una foto suya cada temporada y tú la guardas siempre.', 'Saldas la cuenta y firmas que se queda de por vida, con todo pagado. Los ancianos te mandan una foto suya cada temporada y tú la guardas siempre.'),
          m(e, { dinero: -Math.round(Math.min(e.dinero * 0.3, 90000)), moral: [5, 11], fama: [2, 6] })) },
      { txt: L('Bloquear el número de la guardería', 'Bloquear el número de la guardería', 'Bloquear el número de la guardería'), sub: L('Problema resuelto.', 'Problema resuelto.', 'Problema resuelto.'), riesgo: 0.55,
        efecto: (e, ok) => ok
          ? efecto(L('Bloqueas el teléfono y no vuelves a pensar en ello. Ahorras una fortuna. Alguna noche, en hoteles de torneo, te acuerdas.', 'Bloqueas el teléfono y no vuelves a pensar en ello. Ahorras una fortuna. Alguna noche, en hoteles de torneo, te acuerdas.', 'Bloqueas el teléfono y no vuelves a pensar en ello. Ahorras una fortuna. Alguna noche, en hoteles de torneo, te acuerdas.'), m(e, { moral: [-7, -3], estrategia: [1, 3] }))
          : efecto(L(`Los ancianos cuentan la historia en televisión, con el Pidgey delante de la cámara. "${e.año - 1} años", repiten. Te llueve durante meses.`, `Los ancianos cuentan la historia en televisión, con el Pidgey delante de la cámara. "${e.año - 1} años", repiten. Te llueve durante meses.`, `Los ancianos cuentan la historia en televisión, con el Pidgey delante de la cámara. "${e.año - 1} años", repiten. Te llueve durante meses.`),
            m(e, { fama: [-13, -7], moral: [-9, -4] })) },
    ],
  },
  // ── ARCO DE KANTO (easter egg: nombre "Satoshi") ────────────────────────────
  // La carrera del anime, beat a beat y en orden estricto: cada evento exige el
  // paso anterior (flags.ash) y deja puesto el siguiente. Peso altísimo para que
  // mande sobre el resto mientras la historia esté abierta.
];

// Nota de guion: el arco cubre la carrera entera del anime, de Pueblo Paleta al
// Torneo de los Ocho Maestros, un paso por temporada y en orden estricto. En esa
// partida no salen los eventos normales: solo pasa lo que pasó de verdad.
const paso = (n, extra = {}) => ({
  // `prioritario`: mientras la historia esté abierta manda sobre todo lo demás,
  // y `TODAS` las etapas para que no se quede a medias si la carrera se alarga.
  etapas: TODAS, peso: 100, unico: true, prioritario: true,
  cond: e => e.flags.esAsh && e.flags.ash === n, ...extra,
});
const avanzar = (e, n) => { e.flags.ash = n + 1; };

const ARCO_ANIME = [
  {
    id: 'ash_1_pikachu', ...paso(1),
    titulo: L('Te has dormido el primer día', 'Te has dormido el primer día', 'Te has dormido el primer día'),
    texto: () => L('Llegas al laboratorio con el pijama puesto y tres horas tarde. Los tres iniciales volaron: solo queda uno en la mesa, un Pikachu que te mira fijamente y que, según el Profesor, "tiene carácter". No quiere entrar en la Poké Ball ni a tiros.', 'Llegas al laboratorio con el pijama puesto y tres horas tarde. Los tres iniciales volaron: solo queda uno en la mesa, un Pikachu que te mira fijamente y que, según el Profesor, "tiene carácter". No quiere entrar en la Poké Ball ni a tiros.', 'Llegas al laboratorio con el pijama puesto y tres horas tarde. Los tres iniciales volaron: solo queda uno en la mesa, un Pikachu que te mira fijamente y que, según el Profesor, "tiene carácter". No quiere entrar en la Poké Ball ni a tiros.'),
    opciones: [
      { txt: L('Obligarle a entrar en la Ball', 'Obligarle a entrar en la Ball', 'Obligarle a entrar en la Ball'), sub: L('Las normas son las normas.', 'Las normas son las normas.', 'Las normas son las normas.'), riesgo: 0.15,
        efecto: (e, ok) => { avanzar(e, 1);
          if (ok) return efecto(L('Contra todo pronóstico entra. Sale a los diez segundos y se sienta encima de la Ball, pero al menos ha entrado una vez.', 'Contra todo pronóstico entra. Sale a los diez segundos y se sienta encima de la Ball, pero al menos ha entrado una vez.', 'Contra todo pronóstico entra. Sale a los diez segundos y se sienta encima de la Ball, pero al menos ha entrado una vez.'), m(e, { estrategia: [2, 5], vinculo: [-4, -1] }));
          return efecto(L('Te suelta una descarga que te deja el pelo de punta y el pijama humeando. El Profesor no disimula la risa. Empezamos bien.', 'Te suelta una descarga que te deja el pelo de punta y el pijama humeando. El Profesor no disimula la risa. Empezamos bien.', 'Te suelta una descarga que te deja el pelo de punta y el pijama humeando. El Profesor no disimula la risa. Empezamos bien.'),
            m(e, { salud: [-4, -2], moral: [-3, -1], vinculo: [3, 7] })); } },
      { txt: L('Dejarle andar a tu lado', 'Dejarle andar a tu lado', 'Dejarle andar a tu lado'), sub: L('Si no quiere, no quiere.', 'Si no quiere, no quiere.', 'Si no quiere, no quiere.'),
        efecto: e => { avanzar(e, 1);
          return efecto(L('Sales del pueblo con él caminando detrás, a tres metros, sin mirarte. No es afecto todavía, pero es un principio.', 'Sales del pueblo con él caminando detrás, a tres metros, sin mirarte. No es afecto todavía, pero es un principio.', 'Sales del pueblo con él caminando detrás, a tres metros, sin mirarte. No es afecto todavía, pero es un principio.'),
            m(e, { vinculo: [8, 14], moral: [3, 7] })); } },
    ],
  },
  {
    id: 'ash_2_spearow', ...paso(2),
    titulo: L('La bandada de Spearow', 'La bandada de Spearow', 'La bandada de Spearow'),
    texto: e => L(`Le tiraste una piedra a un Spearow y ahora vienen todos. Cientos. ${socioDe(e)?.nombre ?? 'Pikachu'} está en el suelo, reventado, y la bandada baja en picado hacia él. Tienes dos segundos para decidir.`, `Le tiraste una piedra a un Spearow y ahora vienen todos. Cientos. ${socioDe(e)?.nombre ?? 'Pikachu'} está en el suelo, reventado, y la bandada baja en picado hacia él. Tienes dos segundos para decidir.`, `Le tiraste una piedra a un Spearow y ahora vienen todos. Cientos. ${socioDe(e)?.nombre ?? 'Pikachu'} está en el suelo, reventado, y la bandada baja en picado hacia él. Tienes dos segundos para decidir.`),
    opciones: [
      { txt: L('Cubrirlo con tu cuerpo', 'Cubrirlo con tu cuerpo', 'Cubrirlo con tu cuerpo'), sub: L('Que le den a los Spearow.', 'Que le den a los Spearow.', 'Que le den a los Spearow.'), riesgo: 0.8,
        efecto: (e, ok) => { avanzar(e, 2); const s = socioDe(e);
          if (s) s.vinculo = limitar(s.vinculo + rango(25, 40));
          hito(e, '⚡', 'Se puso delante de la bandada por su Pikachu');
          if (ok) return efecto(L(`Te pones encima de él y les dices que vengan. Lo que pasa después no lo entiendes del todo: un trueno que parte el cielo, la bandada desapareciendo, y un pájaro dorado cruzando el arcoíris a lo lejos. ${s?.nombre ?? 'Pikachu'} ya no camina detrás de ti: camina en tu hombro.`, `Te pones encima de él y les dices que vengan. Lo que pasa después no lo entiendes del todo: un trueno que parte el cielo, la bandada desapareciendo, y un pájaro dorado cruzando el arcoíris a lo lejos. ${s?.nombre ?? 'Pikachu'} ya no camina detrás de ti: camina en tu hombro.`, `Te pones encima de él y les dices que vengan. Lo que pasa después no lo entiendes del todo: un trueno que parte el cielo, la bandada desapareciendo, y un pájaro dorado cruzando el arcoíris a lo lejos. ${s?.nombre ?? 'Pikachu'} ya no camina detrás de ti: camina en tu hombro.`),
            m(e, { vinculo: [20, 30], moral: [16, 26], fama: [4, 9], talento: [2, 5] }));
          return efecto(L(`Te pones encima de él y les dices que vengan. Funciona, pero acabas los dos en el Centro Pokémon una semana. ${s?.nombre ?? 'Pikachu'} no se despega de la camilla en todo ese tiempo.`, `Te pones encima de él y les dices que vengan. Funciona, pero acabas los dos en el Centro Pokémon una semana. ${s?.nombre ?? 'Pikachu'} no se despega de la camilla en todo ese tiempo.`, `Te pones encima de él y les dices que vengan. Funciona, pero acabas los dos en el Centro Pokémon una semana. ${s?.nombre ?? 'Pikachu'} no se despega de la camilla en todo ese tiempo.`),
            m(e, { salud: [-9, -5], vinculo: [20, 30], moral: [8, 15] })); } },
      { txt: L('Cogerlo y correr', 'Cogerlo y correr', 'Cogerlo y correr'), sub: L('Salvar lo que se pueda.', 'Salvar lo que se pueda.', 'Salvar lo que se pueda.'),
        efecto: e => { avanzar(e, 2); const s = socioDe(e);
          if (s) s.vinculo = limitar(s.vinculo + rango(10, 18));
          return efecto(L('Lo coges en brazos y corres hasta que las piernas dejan de responderte. Llegáis vivos de milagro y él te mira distinto, aunque no tanto como te habría mirado si te hubieras quedado.', 'Lo coges en brazos y corres hasta que las piernas dejan de responderte. Llegáis vivos de milagro y él te mira distinto, aunque no tanto como te habría mirado si te hubieras quedado.', 'Lo coges en brazos y corres hasta que las piernas dejan de responderte. Llegáis vivos de milagro y él te mira distinto, aunque no tanto como te habría mirado si te hubieras quedado.'),
            m(e, { salud: [-5, -2], vinculo: [8, 14] })); } },
    ],
  },
  {
    id: 'ash_3_bici', ...paso(3),
    titulo: L('La bici de la chica pelirroja', 'La bici de la chica pelirroja', 'La bici de la chica pelirroja'),
    texto: () => L('Para llegar al Centro Pokémon le quitas la bicicleta a una chica que estaba pescando. La bici acaba carbonizada por un trueno. Ella te ha encontrado, está delante de ti y quiere una bici nueva, o algo mejor.', 'Para llegar al Centro Pokémon le quitas la bicicleta a una chica que estaba pescando. La bici acaba carbonizada por un trueno. Ella te ha encontrado, está delante de ti y quiere una bici nueva, o algo mejor.', 'Para llegar al Centro Pokémon le quitas la bicicleta a una chica que estaba pescando. La bici acaba carbonizada por un trueno. Ella te ha encontrado, está delante de ti y quiere una bici nueva, o algo mejor.'),
    opciones: [
      { txt: L('Prometerle que se la pagas', 'Prometerle que se la pagas', 'Prometerle que se la pagas'), sub: L('Con dinero que no tienes.', 'Con dinero que no tienes.', 'Con dinero que no tienes.'), riesgo: 0.5,
        efecto: (e, ok) => { avanzar(e, 3);
          if (ok) return efecto(L('Le firmas un pagaré en una servilleta. Ella lo guarda, dice que te va a seguir hasta cobrarlo, y de paso te enseña más de tipo agua en un mes que tú en toda tu vida.', 'Le firmas un pagaré en una servilleta. Ella lo guarda, dice que te va a seguir hasta cobrarlo, y de paso te enseña más de tipo agua en un mes que tú en toda tu vida.', 'Le firmas un pagaré en una servilleta. Ella lo guarda, dice que te va a seguir hasta cobrarlo, y de paso te enseña más de tipo agua en un mes que tú en toda tu vida.'),
            m(e, { estrategia: [7, 13], dinero: -rango(3000, 8000), moral: [4, 9] }));
          return efecto(L('Le dices que se la pagas y no te cree ni un poco. Te sigue igualmente, pero te lo recuerda absolutamente cada día durante años.', 'Le dices que se la pagas y no te cree ni un poco. Te sigue igualmente, pero te lo recuerda absolutamente cada día durante años.', 'Le dices que se la pagas y no te cree ni un poco. Te sigue igualmente, pero te lo recuerda absolutamente cada día durante años.'),
            m(e, { moral: [-4, -2], estrategia: [5, 10] })); } },
      { txt: L('Salir corriendo', 'Salir corriendo', 'Salir corriendo'), sub: L('Ya te buscará.', 'Ya te buscará.', 'Ya te buscará.'),
        efecto: e => { avanzar(e, 3);
          return efecto(L('Sales por patas con Pikachu bajo el brazo. Te alcanza dos pueblos después, obviamente, y ahora además está enfadada. Sigue viniendo contigo.', 'Sales por patas con Pikachu bajo el brazo. Te alcanza dos pueblos después, obviamente, y ahora además está enfadada. Sigue viniendo contigo.', 'Sales por patas con Pikachu bajo el brazo. Te alcanza dos pueblos después, obviamente, y ahora además está enfadada. Sigue viniendo contigo.'),
            m(e, { fama: [-4, -1], moral: [-2, -1], salud: [3, 7] })); } },
    ],
  },
  {
    id: 'ash_4_caterpie', ...paso(4),
    titulo: L('Tu primera captura', 'Tu primera captura', 'Tu primera captura'),
    texto: () => L('Un Caterpie en el Bosque Verde, la captura más fácil que existe. Tus dos acompañantes ponen cara de asco: uno de ellos no soporta los bichos y lo está diciendo muy alto.', 'Un Caterpie en el Bosque Verde, la captura más fácil que existe. Tus dos acompañantes ponen cara de asco: uno de ellos no soporta los bichos y lo está diciendo muy alto.', 'Un Caterpie en el Bosque Verde, la captura más fácil que existe. Tus dos acompañantes ponen cara de asco: uno de ellos no soporta los bichos y lo está diciendo muy alto.'),
    opciones: [
      { txt: L('Capturarlo igualmente', 'Capturarlo igualmente', 'Capturarlo igualmente'), sub: L('Es tu primera Poké Ball llena.', 'Es tu primera Poké Ball llena.', 'Es tu primera Poké Ball llena.'), icono: 'poke',
        efecto: e => { avanzar(e, 4); const p = fichar(e, 'caterpie');
          hito(e, '🐛', 'Su primera captura fue un Caterpie');
          return efecto(L(`Lo capturas a la primera y lo celebras como si fuera un legendario. ${p?.nombre ?? 'Caterpie'} evolucionará antes de lo que crees y te va a ganar más combates de los que nadie espera.`, `Lo capturas a la primera y lo celebras como si fuera un legendario. ${p?.nombre ?? 'Caterpie'} evolucionará antes de lo que crees y te va a ganar más combates de los que nadie espera.`, `Lo capturas a la primera y lo celebras como si fuera un legendario. ${p?.nombre ?? 'Caterpie'} evolucionará antes de lo que crees y te va a ganar más combates de los que nadie espera.`),
            m(e, { vinculo: [10, 17], moral: [8, 14] })); } },
      { txt: L('Buscar algo más impresionante', 'Buscar algo más impresionante', 'Buscar algo más impresionante'), sub: L('Que la primera cuente.', 'Que la primera cuente.', 'Que la primera cuente.'), riesgo: 0.4,
        efecto: (e, ok) => { avanzar(e, 4);
          if (ok) { const p = capturaAleatoria(e, { rarezaMin: 'raro', region: 'kanto' });
            return efecto(L(`Te pasas el bosque entero buscando y sale bien: ${p?.nombre ?? 'algo raro'} cae en la Ball. Tardas tres días más de la cuenta, pero mereció la pena.`, `Te pasas el bosque entero buscando y sale bien: ${p?.nombre ?? 'algo raro'} cae en la Ball. Tardas tres días más de la cuenta, pero mereció la pena.`, `Te pasas el bosque entero buscando y sale bien: ${p?.nombre ?? 'algo raro'} cae en la Ball. Tardas tres días más de la cuenta, pero mereció la pena.`),
              m(e, { fama: [5, 10], media: [1, 4] })); }
          return efecto(L('Dejas pasar al Caterpie buscando algo mejor y no aparece nada en tres días. Sales del bosque con el mismo equipo con el que entraste y con hambre.', 'Dejas pasar al Caterpie buscando algo mejor y no aparece nada en tres días. Sales del bosque con el mismo equipo con el que entraste y con hambre.', 'Dejas pasar al Caterpie buscando algo mejor y no aparece nada en tres días. Sales del bosque con el mismo equipo con el que entraste y con hambre.'),
            m(e, { moral: [-4, -2], salud: [-3, -1] })); } },
    ],
  },
  {
    id: 'ash_5_brock', ...paso(5),
    titulo: L('Gimnasio de Ciudad Plateada', 'Gimnasio de Ciudad Plateada', 'Gimnasio de Ciudad Plateada'),
    texto: () => L('Brock y su Onix. Tu Pikachu es de tipo eléctrico contra un Pokémon de roca y tierra: sobre el papel no le hace absolutamente nada. El líder te lo dice a la cara antes de empezar.', 'Brock y su Onix. Tu Pikachu es de tipo eléctrico contra un Pokémon de roca y tierra: sobre el papel no le hace absolutamente nada. El líder te lo dice a la cara antes de empezar.', 'Brock y su Onix. Tu Pikachu es de tipo eléctrico contra un Pokémon de roca y tierra: sobre el papel no le hace absolutamente nada. El líder te lo dice a la cara antes de empezar.'),
    opciones: [
      { txt: L('Entrenar un mes y volver', 'Entrenar un mes y volver', 'Entrenar un mes y volver'), sub: L('Ganársela de verdad.', 'Ganársela de verdad.', 'Ganársela de verdad.'), riesgo: 0.6,
        efecto: (e, ok) => { avanzar(e, 5);
          if (ok) { e.medallas = Math.min(8, e.medallas + 1);
            return efecto(L('Vuelves un mes después con un plan que no depende del tipo y le ganas limpiamente. Brock te da la medalla y, unas semanas más tarde, te pide ir contigo.', 'Vuelves un mes después con un plan que no depende del tipo y le ganas limpiamente. Brock te da la medalla y, unas semanas más tarde, te pide ir contigo.', 'Vuelves un mes después con un plan que no depende del tipo y le ganas limpiamente. Brock te da la medalla y, unas semanas más tarde, te pide ir contigo.'),
              m(e, { media: [3, 7], estrategia: [8, 14], moral: [8, 14] })); }
          return efecto(L('Vuelves y pierdes otra vez, esta vez sin excusas. Brock te da consejos en lugar de la medalla y te dice que no tengas prisa.', 'Vuelves y pierdes otra vez, esta vez sin excusas. Brock te da consejos en lugar de la medalla y te dice que no tengas prisa.', 'Vuelves y pierdes otra vez, esta vez sin excusas. Brock te da consejos en lugar de la medalla y te dice que no tengas prisa.'),
            m(e, { estrategia: [6, 11], moral: [-4, -2] })); } },
      { txt: L('Aceptar la medalla que te ofrece', 'Aceptar la medalla que te ofrece', 'Aceptar la medalla que te ofrece'), sub: L('Te la da él, no la ganas tú.', 'Te la da él, no la ganas tú.', 'Te la da él, no la ganas tú.'),
        efecto: e => { avanzar(e, 5); e.medallas = Math.min(8, e.medallas + 1);
          return efecto(L('Los aspersores del gimnasio deciden el combate y Brock te pone la medalla en la mano diciendo que no la has ganado. Te la quedas. Vas a pensar en eso más veces de las que te gustaría.', 'Los aspersores del gimnasio deciden el combate y Brock te pone la medalla en la mano diciendo que no la has ganado. Te la quedas. Vas a pensar en eso más veces de las que te gustaría.', 'Los aspersores del gimnasio deciden el combate y Brock te pone la medalla en la mano diciendo que no la has ganado. Te la quedas. Vas a pensar en eso más veces de las que te gustaría.'),
            m(e, { moral: [-3, -1], estrategia: [2, 6], fama: [3, 7] })); } },
    ],
  },
  {
    id: 'ash_6_montemoon', ...paso(6),
    titulo: L('El Monte Moon', 'El Monte Moon', 'El Monte Moon'),
    texto: () => L('Dentro del monte hay un científico obsesionado con los fósiles, una piedra enorme que brilla y un montón de Clefairy bailando a su alrededor. También hay cuatro tipos de uniforme negro con una excavadora, y no han venido a mirar.', 'Dentro del monte hay un científico obsesionado con los fósiles, una piedra enorme que brilla y un montón de Clefairy bailando a su alrededor. También hay cuatro tipos de uniforme negro con una excavadora, y no han venido a mirar.', 'Dentro del monte hay un científico obsesionado con los fósiles, una piedra enorme que brilla y un montón de Clefairy bailando a su alrededor. También hay cuatro tipos de uniforme negro con una excavadora, y no han venido a mirar.'),
    opciones: [
      { txt: L('Plantarles cara dentro de la cueva', 'Plantarles cara dentro de la cueva', 'Plantarles cara dentro de la cueva'), sub: L('Cuatro contra ti.', 'Cuatro contra ti.', 'Cuatro contra ti.'), riesgo: 0.6,
        efecto: (e, ok) => { avanzar(e, 6);
          hito(e, '🌙', 'Defendió la piedra lunar del Monte Moon');
          if (ok) return efecto(L('Los echáis de allí a base de descargas en un pasillo de dos metros. Los Clefairy os despiden desde la entrada y el científico cuenta la historia en televisión con tu nombre bien alto.', 'Los echáis de allí a base de descargas en un pasillo de dos metros. Los Clefairy os despiden desde la entrada y el científico cuenta la historia en televisión con tu nombre bien alto.', 'Los echáis de allí a base de descargas en un pasillo de dos metros. Los Clefairy os despiden desde la entrada y el científico cuenta la historia en televisión con tu nombre bien alto.'),
            m(e, { fama: [7, 13], moral: [8, 15], estrategia: [3, 7] }));
          return efecto(L('Se llevan un trozo de la piedra y a ti te llevan en camilla. Los Clefairy te acompañan hasta la salida del monte, que es lo único bueno de la noche.', 'Se llevan un trozo de la piedra y a ti te llevan en camilla. Los Clefairy te acompañan hasta la salida del monte, que es lo único bueno de la noche.', 'Se llevan un trozo de la piedra y a ti te llevan en camilla. Los Clefairy te acompañan hasta la salida del monte, que es lo único bueno de la noche.'),
            m(e, { salud: [-8, -4], moral: [-3, -1], fama: [3, 7] })); } },
      { txt: L('Comprarle un fósil al científico', 'Comprarle un fósil al científico', 'Comprarle un fósil al científico'), sub: L('Dice que dentro hay algo vivo.', 'Dice que dentro hay algo vivo.', 'Dice que dentro hay algo vivo.'), riesgo: 0.5,
        efecto: (e, ok) => { avanzar(e, 6);
          if (ok) { const p = fichar(e, elegir(['omanyte', 'kabuto']), { nivel: 12 });
            return efecto(L(`Le sueltas todo lo que llevas por una piedra con forma de caracol. En el laboratorio de la isla la reviven meses después: ${p?.nombre ?? 'el fósil'} sale de ahí y se une al equipo.`, `Le sueltas todo lo que llevas por una piedra con forma de caracol. En el laboratorio de la isla la reviven meses después: ${p?.nombre ?? 'el fósil'} sale de ahí y se une al equipo.`, `Le sueltas todo lo que llevas por una piedra con forma de caracol. En el laboratorio de la isla la reviven meses después: ${p?.nombre ?? 'el fósil'} sale de ahí y se une al equipo.`),
              m(e, { dinero: -rango(2000, 5000), fama: [4, 9], moral: [6, 11] })); }
          return efecto(L('Le sueltas todo lo que llevas por una piedra que resulta ser, literalmente, una piedra. El hombre ya no está cuando vuelves a buscarle.', 'Le sueltas todo lo que llevas por una piedra que resulta ser, literalmente, una piedra. El hombre ya no está cuando vuelves a buscarle.', 'Le sueltas todo lo que llevas por una piedra que resulta ser, literalmente, una piedra. El hombre ya no está cuando vuelves a buscarle.'),
            m(e, { dinero: -rango(2000, 5000), moral: [-4, -2], estrategia: [3, 6] })); } },
    ],
  },
  {
    id: 'ash_7_celeste', ...paso(7),
    titulo: L('El gimnasio de las tres hermanas', 'El gimnasio de las tres hermanas', 'El gimnasio de las tres hermanas'),
    texto: () => L('El gimnasio de Ciudad Celeste es medio espectáculo acuático, medio gimnasio. Cuando estás a punto de perder el combate, aparecen los mismos ladrones de siempre con una aspiradora gigante para robar los Pokémon del acuario. Los echas tú solo, y las hermanas te ofrecen la medalla por eso.', 'El gimnasio de Ciudad Celeste es medio espectáculo acuático, medio gimnasio. Cuando estás a punto de perder el combate, aparecen los mismos ladrones de siempre con una aspiradora gigante para robar los Pokémon del acuario. Los echas tú solo, y las hermanas te ofrecen la medalla por eso.', 'El gimnasio de Ciudad Celeste es medio espectáculo acuático, medio gimnasio. Cuando estás a punto de perder el combate, aparecen los mismos ladrones de siempre con una aspiradora gigante para robar los Pokémon del acuario. Los echas tú solo, y las hermanas te ofrecen la medalla por eso.'),
    opciones: [
      { txt: L('Aceptar la medalla', 'Aceptar la medalla', 'Aceptar la medalla'), sub: L('Te la has ganado, aunque no combatiendo.', 'Te la has ganado, aunque no combatiendo.', 'Te la has ganado, aunque no combatiendo.'),
        efecto: e => { avanzar(e, 7); e.medallas = Math.min(8, e.medallas + 1);
          return efecto(L('Te la guardas en la caja con las otras y evitas mirarla mucho tiempo. Dos medallas, y ninguna de las dos ganada en un combate limpio. Empieza a pesarte.', 'Te la guardas en la caja con las otras y evitas mirarla mucho tiempo. Dos medallas, y ninguna de las dos ganada en un combate limpio. Empieza a pesarte.', 'Te la guardas en la caja con las otras y evitas mirarla mucho tiempo. Dos medallas, y ninguna de las dos ganada en un combate limpio. Empieza a pesarte.'),
            m(e, { fama: [5, 10], moral: [-3, -1], estrategia: [2, 5] })); } },
      { txt: L('Exigir el combate igualmente', 'Exigir el combate igualmente', 'Exigir el combate igualmente'), sub: L('Con el acuario hecho un desastre.', 'Con el acuario hecho un desastre.', 'Con el acuario hecho un desastre.'), riesgo: 0.55,
        efecto: (e, ok) => { avanzar(e, 7);
          if (ok) { e.medallas = Math.min(8, e.medallas + 1);
            hito(e, '💧', 'Se negó a que le regalaran una medalla');
            return efecto(L('Les dices que no y que combatáis con el agua por las rodillas. Ganas por poco, con todo el mundo empapado, y la medalla pesa el triple.', 'Les dices que no y que combatáis con el agua por las rodillas. Ganas por poco, con todo el mundo empapado, y la medalla pesa el triple.', 'Les dices que no y que combatáis con el agua por las rodillas. Ganas por poco, con todo el mundo empapado, y la medalla pesa el triple.'),
              m(e, { media: [2, 5], moral: [10, 17], estrategia: [4, 8] })); }
          return efecto(L('Les dices que no, combatís y pierdes. Te vas de la ciudad sin medalla y con la sensación rarísima de haber hecho lo correcto perdiendo.', 'Les dices que no, combatís y pierdes. Te vas de la ciudad sin medalla y con la sensación rarísima de haber hecho lo correcto perdiendo.', 'Les dices que no, combatís y pierdes. Te vas de la ciudad sin medalla y con la sensación rarísima de haber hecho lo correcto perdiendo.'),
            m(e, { moral: [-3, -1], estrategia: [7, 12], fama: [2, 5] })); } },
    ],
  },
  {
    id: 'ash_8_squirtle', ...paso(8),
    titulo: L('El escuadrón de las gafas de sol', 'El escuadrón de las gafas de sol', 'El escuadrón de las gafas de sol'),
    texto: () => L('Cinco Squirtle abandonados por sus entrenadores llevan meses aterrorizando la carretera con gamberradas: trampas, robos de comida y unas gafas de sol robadas cada uno. El pueblo quiere que los saquen de ahí como sea. Su jefe te mira desde una roca, esperando a ver de qué lado estás.', 'Cinco Squirtle abandonados por sus entrenadores llevan meses aterrorizando la carretera con gamberradas: trampas, robos de comida y unas gafas de sol robadas cada uno. El pueblo quiere que los saquen de ahí como sea. Su jefe te mira desde una roca, esperando a ver de qué lado estás.', 'Cinco Squirtle abandonados por sus entrenadores llevan meses aterrorizando la carretera con gamberradas: trampas, robos de comida y unas gafas de sol robadas cada uno. El pueblo quiere que los saquen de ahí como sea. Su jefe te mira desde una roca, esperando a ver de qué lado estás.'),
    opciones: [
      { txt: L('Hablar con el jefe del escuadrón', 'Hablar con el jefe del escuadrón', 'Hablar con el jefe del escuadrón'), sub: L('Nadie más lo ha intentado.', 'Nadie más lo ha intentado.', 'Nadie más lo ha intentado.'), riesgo: 0.7,
        efecto: (e, ok) => { avanzar(e, 8);
          if (ok) { const p = fichar(e, 'squirtle', { nivel: 14 });
            hito(e, '🕶️', 'Se ganó al jefe del escuadrón Squirtle');
            return efecto(L(`Le cuentas que a ti también te dejaron tirado alguna vez y funciona. Los otros cuatro acaban de bomberos voluntarios del pueblo y ${p?.nombre ?? 'el jefe'} se viene contigo, con gafas incluidas.`, `Le cuentas que a ti también te dejaron tirado alguna vez y funciona. Los otros cuatro acaban de bomberos voluntarios del pueblo y ${p?.nombre ?? 'el jefe'} se viene contigo, con gafas incluidas.`, `Le cuentas que a ti también te dejaron tirado alguna vez y funciona. Los otros cuatro acaban de bomberos voluntarios del pueblo y ${p?.nombre ?? 'el jefe'} se viene contigo, con gafas incluidas.`),
              m(e, { vinculo: [10, 17], fama: [6, 11], moral: [8, 14] })); }
          return efecto(L('Le cuentas tu vida y te responde con un hidrochorro en la cara. Se van todos a otra carretera y el pueblo te cobra los desperfectos a ti por haberte metido.', 'Le cuentas tu vida y te responde con un hidrochorro en la cara. Se van todos a otra carretera y el pueblo te cobra los desperfectos a ti por haberte metido.', 'Le cuentas tu vida y te responde con un hidrochorro en la cara. Se van todos a otra carretera y el pueblo te cobra los desperfectos a ti por haberte metido.'),
            m(e, { dinero: -rango(1500, 4000), moral: [-3, -1], estrategia: [3, 6] })); } },
      { txt: L('Avisar a la agente de la Liga', 'Avisar a la agente de la Liga', 'Avisar a la agente de la Liga'), sub: L('Es un asunto de las autoridades.', 'Es un asunto de las autoridades.', 'Es un asunto de las autoridades.'),
        efecto: e => { avanzar(e, 8);
          return efecto(L('Vienen, los recogen y los reparten por centros de acogida de media región. El pueblo respira, tú cobras una recompensa pequeña y no vuelves a saber de ellos.', 'Vienen, los recogen y los reparten por centros de acogida de media región. El pueblo respira, tú cobras una recompensa pequeña y no vuelves a saber de ellos.', 'Vienen, los recogen y los reparten por centros de acogida de media región. El pueblo respira, tú cobras una recompensa pequeña y no vuelves a saber de ellos.'),
            m(e, { dinero: rango(2000, 5000), fama: [3, 7], vinculo: [-4, -1] })); } },
    ],
  },
  {
    id: 'ash_9_bulbasaur', ...paso(9),
    titulo: L('La aldea escondida', 'La aldea escondida', 'La aldea escondida'),
    texto: () => L('Un claro en el bosque donde una mujer recoge Pokémon abandonados y heridos y los cuida hasta que se recuperan. En la entrada hay un Bulbasaur que hace de guardián y que no deja pasar a ningún entrenador, porque casi todos los que han llegado allí venían a llevarse algo.', 'Un claro en el bosque donde una mujer recoge Pokémon abandonados y heridos y los cuida hasta que se recuperan. En la entrada hay un Bulbasaur que hace de guardián y que no deja pasar a ningún entrenador, porque casi todos los que han llegado allí venían a llevarse algo.', 'Un claro en el bosque donde una mujer recoge Pokémon abandonados y heridos y los cuida hasta que se recuperan. En la entrada hay un Bulbasaur que hace de guardián y que no deja pasar a ningún entrenador, porque casi todos los que han llegado allí venían a llevarse algo.'),
    opciones: [
      { txt: L('Ganarte su confianza combatiendo', 'Ganarte su confianza combatiendo', 'Ganarte su confianza combatiendo'), sub: L('Es lo único que va a entender.', 'Es lo único que va a entender.', 'Es lo único que va a entender.'), riesgo: 0.7,
        efecto: (e, ok) => { avanzar(e, 9);
          if (ok) { const p = fichar(e, 'bulbasaur', { nivel: 15 });
            hito(e, '🌿', 'Se ganó al guardián de la aldea escondida');
            return efecto(L(`Combatís de igual a igual y, cuando acabáis, es él quien decide. ${p?.nombre ?? 'Bulbasaur'} deja el puesto de guardián y se sube a tu mochila. La cuidadora te dice que no le falles.`, `Combatís de igual a igual y, cuando acabáis, es él quien decide. ${p?.nombre ?? 'Bulbasaur'} deja el puesto de guardián y se sube a tu mochila. La cuidadora te dice que no le falles.`, `Combatís de igual a igual y, cuando acabáis, es él quien decide. ${p?.nombre ?? 'Bulbasaur'} deja el puesto de guardián y se sube a tu mochila. La cuidadora te dice que no le falles.`),
              m(e, { vinculo: [12, 19], moral: [8, 14], media: [1, 3] })); }
          return efecto(L('Combatís y te gana con una facilidad que no esperabas. Te acompaña hasta la salida del claro sin quitarte ojo. Al menos ahora sabes lo que es que un guardián haga bien su trabajo.', 'Combatís y te gana con una facilidad que no esperabas. Te acompaña hasta la salida del claro sin quitarte ojo. Al menos ahora sabes lo que es que un guardián haga bien su trabajo.', 'Combatís y te gana con una facilidad que no esperabas. Te acompaña hasta la salida del claro sin quitarte ojo. Al menos ahora sabes lo que es que un guardián haga bien su trabajo.'),
            m(e, { estrategia: [5, 10], moral: [-2, -1], salud: [-3, -1] })); } },
      { txt: L('Echar una mano y marcharte', 'Echar una mano y marcharte', 'Echar una mano y marcharte'), sub: L('Allí hace más falta que en tu equipo.', 'Allí hace más falta que en tu equipo.', 'Allí hace más falta que en tu equipo.'),
        efecto: e => { avanzar(e, 9);
          return efecto(L('Te quedas dos semanas cargando sacos, curando alas rotas y limpiando establos, y te vas sin llevarte a nadie. La cuidadora te manda cartas durante años.', 'Te quedas dos semanas cargando sacos, curando alas rotas y limpiando establos, y te vas sin llevarte a nadie. La cuidadora te manda cartas durante años.', 'Te quedas dos semanas cargando sacos, curando alas rotas y limpiando establos, y te vas sin llevarte a nadie. La cuidadora te manda cartas durante años.'),
            m(e, { moral: [9, 15], vinculo: [8, 14], salud: [-2, -1], media: [-1, -1] })); } },
    ],
  },
  {
    id: 'ash_10_barco', ...paso(10),
    titulo: L('El transatlántico', 'El transatlántico', 'El transatlántico'),
    texto: () => L('Una convención de entrenadores en un barco de lujo con bufé libre y camarotes con vistas. A mitad de travesía, la tripulación entera se quita el uniforme: eran ladrones y estaban ahí por los Pokémon de todo el pasaje. Con el follón, el barco choca y empieza a irse a pique con medio equipaje en la bodega.', 'Una convención de entrenadores en un barco de lujo con bufé libre y camarotes con vistas. A mitad de travesía, la tripulación entera se quita el uniforme: eran ladrones y estaban ahí por los Pokémon de todo el pasaje. Con el follón, el barco choca y empieza a irse a pique con medio equipaje en la bodega.', 'Una convención de entrenadores en un barco de lujo con bufé libre y camarotes con vistas. A mitad de travesía, la tripulación entera se quita el uniforme: eran ladrones y estaban ahí por los Pokémon de todo el pasaje. Con el follón, el barco choca y empieza a irse a pique con medio equipaje en la bodega.'),
    opciones: [
      { txt: L('Bajar a la bodega inundada', 'Bajar a la bodega inundada', 'Bajar a la bodega inundada'), sub: L('Ahí abajo hay Poké Balls de gente.', 'Ahí abajo hay Poké Balls de gente.', 'Ahí abajo hay Poké Balls de gente.'), riesgo: 0.65,
        efecto: (e, ok) => { avanzar(e, 10);
          hito(e, '🚢', 'Volvió a la bodega del barco por los Pokémon de otros');
          if (ok) return efecto(L('Bajas con el agua por el pecho y subes con una red llena de Poké Balls ajenas. Al llegar a puerto hay veinte entrenadores esperando a que les devuelvas a los suyos, y una foto tuya en todos los periódicos de la región.', 'Bajas con el agua por el pecho y subes con una red llena de Poké Balls ajenas. Al llegar a puerto hay veinte entrenadores esperando a que les devuelvas a los suyos, y una foto tuya en todos los periódicos de la región.', 'Bajas con el agua por el pecho y subes con una red llena de Poké Balls ajenas. Al llegar a puerto hay veinte entrenadores esperando a que les devuelvas a los suyos, y una foto tuya en todos los periódicos de la región.'),
            m(e, { fama: [12, 20], moral: [12, 20], salud: [-5, -2] }));
          return efecto(L('Bajas, se cierra un mamparo y sales por un ojo de buey con medio equipo tirando de ti. Salvas cuatro Poké Balls y pierdes casi todo lo que llevabas encima.', 'Bajas, se cierra un mamparo y sales por un ojo de buey con medio equipo tirando de ti. Salvas cuatro Poké Balls y pierdes casi todo lo que llevabas encima.', 'Bajas, se cierra un mamparo y sales por un ojo de buey con medio equipo tirando de ti. Salvas cuatro Poké Balls y pierdes casi todo lo que llevabas encima.'),
            m(e, { salud: [-8, -4], dinero: -rango(3000, 7000), fama: [5, 10] })); } },
      { txt: L('Salir a cubierta y salvarte', 'Salir a cubierta y salvarte', 'Salir a cubierta y salvarte'), sub: L('Tampoco es tu barco.', 'Tampoco es tu barco.', 'Tampoco es tu barco.'),
        efecto: e => { avanzar(e, 10);
          return efecto(L('Llegas al bote salvavidas de los primeros, seco y entero. En el muelle, un periodista te pregunta por la gente que se quedó abajo y no sabes qué contestarle.', 'Llegas al bote salvavidas de los primeros, seco y entero. En el muelle, un periodista te pregunta por la gente que se quedó abajo y no sabes qué contestarle.', 'Llegas al bote salvavidas de los primeros, seco y entero. En el muelle, un periodista te pregunta por la gente que se quedó abajo y no sabes qué contestarle.'),
            m(e, { salud: [3, 7], moral: [-4, -2], fama: [-5, -2] })); } },
    ],
  },
  {
    id: 'ash_11_surge', ...paso(11),
    titulo: L('La piedra trueno', 'La piedra trueno', 'La piedra trueno'),
    texto: e => L(`El Teniente te ha machacado con un Raichu y te suelta que tu ${socioDe(e)?.nombre ?? 'Pikachu'} es un bebé que nunca va a estar a la altura. En el mostrador del Centro Pokémon hay una piedra trueno. Tu compañero la mira y luego te mira a ti, y niega con la cabeza.`, `El Teniente te ha machacado con un Raichu y te suelta que tu ${socioDe(e)?.nombre ?? 'Pikachu'} es un bebé que nunca va a estar a la altura. En el mostrador del Centro Pokémon hay una piedra trueno. Tu compañero la mira y luego te mira a ti, y niega con la cabeza.`, `El Teniente te ha machacado con un Raichu y te suelta que tu ${socioDe(e)?.nombre ?? 'Pikachu'} es un bebé que nunca va a estar a la altura. En el mostrador del Centro Pokémon hay una piedra trueno. Tu compañero la mira y luego te mira a ti, y niega con la cabeza.`),
    opciones: [
      { txt: L('Guardar la piedra', 'Guardar la piedra', 'Guardar la piedra'), sub: L('Ganar siendo lo que ya es.', 'Ganar siendo lo que ya es.', 'Ganar siendo lo que ya es.'), riesgo: 0.65,
        efecto: (e, ok) => { avanzar(e, 11); const s = socioDe(e);
          if (s) s.vinculo = limitar(s.vinculo + rango(18, 28));
          if (ok) { e.medallas = Math.min(8, e.medallas + 1);
            hito(e, '⚡', 'Ganó al Raichu sin evolucionar a su Pikachu');
            return efecto(L('Devuelves la piedra al mostrador y ganáis a base de velocidad, esquivando todo lo que el Raichu tira. La medalla sabe distinta cuando la ganas así.', 'Devuelves la piedra al mostrador y ganáis a base de velocidad, esquivando todo lo que el Raichu tira. La medalla sabe distinta cuando la ganas así.', 'Devuelves la piedra al mostrador y ganáis a base de velocidad, esquivando todo lo que el Raichu tira. La medalla sabe distinta cuando la ganas así.'),
              m(e, { media: [2, 6], vinculo: [10, 18], fama: [7, 13], moral: [10, 17] })); }
          return efecto(L('Devuelves la piedra y perdéis igual, pero él sale del gimnasio con la cabeza alta y tú detrás. Volveréis.', 'Devuelves la piedra y perdéis igual, pero él sale del gimnasio con la cabeza alta y tú detrás. Volveréis.', 'Devuelves la piedra y perdéis igual, pero él sale del gimnasio con la cabeza alta y tú detrás. Volveréis.'),
            m(e, { vinculo: [10, 18], moral: [-3, -1] })); } },
      { txt: L('Usar la piedra trueno', 'Usar la piedra trueno', 'Usar la piedra trueno'), sub: L('Potencia bruta, hoy.', 'Potencia bruta, hoy.', 'Potencia bruta, hoy.'), icono: 'poke',
        efecto: e => { avanzar(e, 11); const s = socioDe(e);
          if (s) { s.umbrales = [0, 1]; s.vinculo = limitar(s.vinculo - rango(12, 20)); }
          e.medallas = Math.min(8, e.medallas + 1);
          return efecto(L('La piedra hace su trabajo y de golpe tienes un Raichu enorme y muchísimo más fuerte. Ganas la medalla ese mismo día. Tardas semanas en acostumbrarte a que ya no te quepa en el hombro.', 'La piedra hace su trabajo y de golpe tienes un Raichu enorme y muchísimo más fuerte. Ganas la medalla ese mismo día. Tardas semanas en acostumbrarte a que ya no te quepa en el hombro.', 'La piedra hace su trabajo y de golpe tienes un Raichu enorme y muchísimo más fuerte. Ganas la medalla ese mismo día. Tardas semanas en acostumbrarte a que ya no te quepa en el hombro.'),
            m(e, { media: [4, 8], poder: [8, 14], vinculo: [-10, -4] })); } },
    ],
  },
  {
    id: 'ash_12_charmander', ...paso(12),
    titulo: L('El Charmander de la roca', 'El Charmander de la roca', 'El Charmander de la roca'),
    texto: () => L('Lleva horas sobre una roca, bajo la lluvia, tapándose la cola con la mano para que no se le apague. Su entrenador le dijo que volvería a por él y lo dijo riéndose, con sus amigos, en un bar a dos kilómetros de aquí.', 'Lleva horas sobre una roca, bajo la lluvia, tapándose la cola con la mano para que no se le apague. Su entrenador le dijo que volvería a por él y lo dijo riéndose, con sus amigos, en un bar a dos kilómetros de aquí.', 'Lleva horas sobre una roca, bajo la lluvia, tapándose la cola con la mano para que no se le apague. Su entrenador le dijo que volvería a por él y lo dijo riéndose, con sus amigos, en un bar a dos kilómetros de aquí.'),
    opciones: [
      { txt: L('Cargar con él hasta el Centro', 'Cargar con él hasta el Centro', 'Cargar con él hasta el Centro'), sub: L('Corriendo, bajo el agua.', 'Corriendo, bajo el agua.', 'Corriendo, bajo el agua.'), riesgo: 0.85,
        efecto: (e, ok) => { avanzar(e, 12); const p = fichar(e, 'charmander');
          hito(e, '🔥', 'Salvó a un Charmander abandonado bajo la lluvia');
          if (ok) return efecto(L(`Llegáis empapados y la llama aguanta. Cuando despierta y ve que has sido tú, decide que se queda. ${p?.nombre ?? 'Charmander'} entra en el equipo y no vuelve a mirar atrás.`, `Llegáis empapados y la llama aguanta. Cuando despierta y ve que has sido tú, decide que se queda. ${p?.nombre ?? 'Charmander'} entra en el equipo y no vuelve a mirar atrás.`, `Llegáis empapados y la llama aguanta. Cuando despierta y ve que has sido tú, decide que se queda. ${p?.nombre ?? 'Charmander'} entra en el equipo y no vuelve a mirar atrás.`),
            m(e, { vinculo: [14, 22], moral: [12, 20], fama: [4, 9], salud: [-3, -1] }));
          return efecto(L(`Llegáis por los pelos y los sanitarios tardan toda la noche. Se salva, pero tú sales de allí con una fiebre que te dura un mes. ${p?.nombre ?? 'Charmander'} se queda contigo igual.`, `Llegáis por los pelos y los sanitarios tardan toda la noche. Se salva, pero tú sales de allí con una fiebre que te dura un mes. ${p?.nombre ?? 'Charmander'} se queda contigo igual.`, `Llegáis por los pelos y los sanitarios tardan toda la noche. Se salva, pero tú sales de allí con una fiebre que te dura un mes. ${p?.nombre ?? 'Charmander'} se queda contigo igual.`),
            m(e, { vinculo: [14, 22], salud: [-9, -5], moral: [7, 13] })); } },
      { txt: L('Avisar a su entrenador', 'Avisar a su entrenador', 'Avisar a su entrenador'), sub: L('Es suyo, no tuyo.', 'Es suyo, no tuyo.', 'Es suyo, no tuyo.'),
        efecto: e => { avanzar(e, 12);
          return efecto(L('Vas al bar a buscarle y se ríe en tu cara delante de todos. Cuando vuelves a la roca ya no hay nadie: alguien se lo ha llevado antes que tú. No te lo perdonas en mucho tiempo.', 'Vas al bar a buscarle y se ríe en tu cara delante de todos. Cuando vuelves a la roca ya no hay nadie: alguien se lo ha llevado antes que tú. No te lo perdonas en mucho tiempo.', 'Vas al bar a buscarle y se ríe en tu cara delante de todos. Cuando vuelves a la roca ya no hay nadie: alguien se lo ha llevado antes que tú. No te lo perdonas en mucho tiempo.'),
            m(e, { moral: [-8, -4], estrategia: [3, 7] })); } },
    ],
  },
  {
    id: 'ash_13_lavanda', ...paso(13),
    titulo: L('La torre de Lavanda', 'La torre de Lavanda', 'La torre de Lavanda'),
    texto: () => L('Siete plantas de tumbas de Pokémon y, según todo el pueblo, algo que se mueve dentro por las noches. La líder psíquica de la ciudad de al lado es imbatible y solo hay una cosa en toda la región que le pueda hacer daño, y vive aquí arriba.', 'Siete plantas de tumbas de Pokémon y, según todo el pueblo, algo que se mueve dentro por las noches. La líder psíquica de la ciudad de al lado es imbatible y solo hay una cosa en toda la región que le pueda hacer daño, y vive aquí arriba.', 'Siete plantas de tumbas de Pokémon y, según todo el pueblo, algo que se mueve dentro por las noches. La líder psíquica de la ciudad de al lado es imbatible y solo hay una cosa en toda la región que le pueda hacer daño, y vive aquí arriba.'),
    opciones: [
      { txt: L('Pasar la noche en la torre', 'Pasar la noche en la torre', 'Pasar la noche en la torre'), sub: L('A ver quién aparece.', 'A ver quién aparece.', 'A ver quién aparece.'), riesgo: 0.6,
        efecto: (e, ok) => { avanzar(e, 13);
          if (ok) { const p = fichar(e, 'gastly', { nivel: 20 });
            hito(e, '👻', 'Pasó una noche entera en la torre de Lavanda');
            return efecto(L(`Te pasan de todo: sustos, muebles volando y una escalera que no acaba nunca. Al amanecer, uno de ellos decide que le caes bien porque te has reído en vez de salir corriendo. ${p?.nombre ?? 'Gastly'} se viene contigo.`, `Te pasan de todo: sustos, muebles volando y una escalera que no acaba nunca. Al amanecer, uno de ellos decide que le caes bien porque te has reído en vez de salir corriendo. ${p?.nombre ?? 'Gastly'} se viene contigo.`, `Te pasan de todo: sustos, muebles volando y una escalera que no acaba nunca. Al amanecer, uno de ellos decide que le caes bien porque te has reído en vez de salir corriendo. ${p?.nombre ?? 'Gastly'} se viene contigo.`),
              m(e, { vinculo: [8, 14], moral: [5, 10], estrategia: [4, 8] })); }
          return efecto(L('Te pasan de todo, y a las tres de la mañana sales de la torre corriendo por la calle principal en pijama, con medio pueblo asomado a la ventana. No consigues nada salvo la anécdota.', 'Te pasan de todo, y a las tres de la mañana sales de la torre corriendo por la calle principal en pijama, con medio pueblo asomado a la ventana. No consigues nada salvo la anécdota.', 'Te pasan de todo, y a las tres de la mañana sales de la torre corriendo por la calle principal en pijama, con medio pueblo asomado a la ventana. No consigues nada salvo la anécdota.'),
            m(e, { moral: [-4, -2], salud: [-3, -1], fama: [-3, -1] })); } },
      { txt: L('Rodear la torre y seguir camino', 'Rodear la torre y seguir camino', 'Rodear la torre y seguir camino'), sub: L('No vas a perder una semana en esto.', 'No vas a perder una semana en esto.', 'No vas a perder una semana en esto.'),
        efecto: e => { avanzar(e, 13);
          return efecto(L('Sigues ruta y llegas a la ciudad siguiente con el equipo fresco y sin ningún fantasma en el bolsillo. Vas a acordarte de esta decisión muy pronto.', 'Sigues ruta y llegas a la ciudad siguiente con el equipo fresco y sin ningún fantasma en el bolsillo. Vas a acordarte de esta decisión muy pronto.', 'Sigues ruta y llegas a la ciudad siguiente con el equipo fresco y sin ningún fantasma en el bolsillo. Vas a acordarte de esta decisión muy pronto.'),
            m(e, { salud: [5, 9], media: [1, 2], estrategia: [-3, -1] })); } },
    ],
  },
  {
    id: 'ash_14_sabrina', ...paso(14),
    titulo: L('La líder psíquica', 'La líder psíquica', 'La líder psíquica'),
    texto: e => L(`El gimnasio de Ciudad Azafrán está vacío y helado. La líder combate con la mirada perdida y con una muñeca en la mano, y del último entrenador que perdió aquí nadie ha vuelto a saber nada. Tu ${socioDe(e)?.nombre ?? 'Pikachu'} no quiere entrar por la puerta.`, `El gimnasio de Ciudad Azafrán está vacío y helado. La líder combate con la mirada perdida y con una muñeca en la mano, y del último entrenador que perdió aquí nadie ha vuelto a saber nada. Tu ${socioDe(e)?.nombre ?? 'Pikachu'} no quiere entrar por la puerta.`, `El gimnasio de Ciudad Azafrán está vacío y helado. La líder combate con la mirada perdida y con una muñeca en la mano, y del último entrenador que perdió aquí nadie ha vuelto a saber nada. Tu ${socioDe(e)?.nombre ?? 'Pikachu'} no quiere entrar por la puerta.`),
    opciones: [
      { txt: L('Sacar al fantasma que te trajiste', 'Sacar al fantasma que te trajiste', 'Sacar al fantasma que te trajiste'), sub: L('Es lo único que le hace daño.', 'Es lo único que le hace daño.', 'Es lo único que le hace daño.'), riesgo: 0.75,
        efecto: (e, ok) => { avanzar(e, 14);
          const tieneFantasma = e.equipo.some(p => p.linea === 'gastly' && !p.retirado);
          if (ok && tieneFantasma) { e.medallas = Math.min(8, e.medallas + 1);
            hito(e, '🔮', 'Ganó a la líder psíquica haciéndola reír');
            return efecto(L('No gana el combate: lo gana el bicho haciendo el idiota hasta que la líder se ríe por primera vez en años. Se acaba el combate ahí, con ella llorando de risa y dándote la medalla.', 'No gana el combate: lo gana el bicho haciendo el idiota hasta que la líder se ríe por primera vez en años. Se acaba el combate ahí, con ella llorando de risa y dándote la medalla.', 'No gana el combate: lo gana el bicho haciendo el idiota hasta que la líder se ríe por primera vez en años. Se acaba el combate ahí, con ella llorando de risa y dándote la medalla.'),
              m(e, { fama: [8, 14], moral: [12, 19], estrategia: [5, 9], vinculo: [7, 12] })); }
          if (!tieneFantasma) return efecto(L('No tienes ningún fantasma que sacar, así que improvisas y te barre en dos turnos. Te despiertas fuera del gimnasio sin recordar cómo saliste y con el equipo temblando.', 'No tienes ningún fantasma que sacar, así que improvisas y te barre en dos turnos. Te despiertas fuera del gimnasio sin recordar cómo saliste y con el equipo temblando.', 'No tienes ningún fantasma que sacar, así que improvisas y te barre en dos turnos. Te despiertas fuera del gimnasio sin recordar cómo saliste y con el equipo temblando.'),
            m(e, { moral: [-7, -3], salud: [-4, -2], estrategia: [6, 11] }));
          return efecto(L('El fantasma se pone a hacer el tonto y a ella no le hace ninguna gracia. Os saca del gimnasio por los aires a los dos y tardas tres días en volver a sentirte tú.', 'El fantasma se pone a hacer el tonto y a ella no le hace ninguna gracia. Os saca del gimnasio por los aires a los dos y tardas tres días en volver a sentirte tú.', 'El fantasma se pone a hacer el tonto y a ella no le hace ninguna gracia. Os saca del gimnasio por los aires a los dos y tardas tres días en volver a sentirte tú.'),
            m(e, { moral: [-5, -2], salud: [-3, -1], estrategia: [5, 9] })); } },
      { txt: L('Ir de frente con tu mejor equipo', 'Ir de frente con tu mejor equipo', 'Ir de frente con tu mejor equipo'), sub: L('Sin trucos.', 'Sin trucos.', 'Sin trucos.'), riesgo: 0.3,
        efecto: (e, ok) => { avanzar(e, 14);
          if (ok) { e.medallas = Math.min(8, e.medallas + 1);
            return efecto(L('Aguantas lo que no aguanta nadie y le ganas de puro empeño, con medio equipo fuera de combate. Ella te da la medalla y te dice que no vuelvas.', 'Aguantas lo que no aguanta nadie y le ganas de puro empeño, con medio equipo fuera de combate. Ella te da la medalla y te dice que no vuelvas.', 'Aguantas lo que no aguanta nadie y le ganas de puro empeño, con medio equipo fuera de combate. Ella te da la medalla y te dice que no vuelvas.'),
              m(e, { media: [3, 7], fama: [7, 12], salud: [-5, -2], moral: [8, 14] })); }
          return efecto(L('Te barre. A ti y al equipo. Sales de allí sin medalla, sin memoria de la última media hora y con la certeza de que hay entrenadores en otra liga distinta a la tuya.', 'Te barre. A ti y al equipo. Sales de allí sin medalla, sin memoria de la última media hora y con la certeza de que hay entrenadores en otra liga distinta a la tuya.', 'Te barre. A ti y al equipo. Sales de allí sin medalla, sin memoria de la última media hora y con la certeza de que hay entrenadores en otra liga distinta a la tuya.'),
            m(e, { moral: [-7, -4], salud: [-4, -2], estrategia: [8, 13] })); } },
    ],
  },
  {
    id: 'ash_15_charizard', ...paso(15),
    titulo: L('El que ya no te hace caso', 'El que ya no te hace caso', 'El que ya no te hace caso'),
    texto: e => L(`Aquel Charmander de la roca ya es otra cosa: enorme, con alas, y desde que evolucionó no obedece una sola orden. En mitad de un combate importante se tumba a echarse una siesta mientras el rival le pega. La grada se ríe. ${e.rival.nombre} se ríe.`, `Aquel Charmander de la roca ya es otra cosa: enorme, con alas, y desde que evolucionó no obedece una sola orden. En mitad de un combate importante se tumba a echarse una siesta mientras el rival le pega. La grada se ríe. ${e.rival.nombre} se ríe.`, `Aquel Charmander de la roca ya es otra cosa: enorme, con alas, y desde que evolucionó no obedece una sola orden. En mitad de un combate importante se tumba a echarse una siesta mientras el rival le pega. La grada se ríe. ${e.rival.nombre} se ríe.`),
    opciones: [
      { txt: L('Seguir sacándolo igual', 'Seguir sacándolo igual', 'Seguir sacándolo igual'), sub: L('Que vuelva cuando quiera volver.', 'Que vuelva cuando quiera volver.', 'Que vuelva cuando quiera volver.'), riesgo: 0.55,
        efecto: (e, ok) => { avanzar(e, 15);
          if (ok) { hito(e, '🐉', 'Se ganó otra vez el respeto de su Charizard');
            return efecto(L('Una noche helada te quedas horas dándole calor sin decirle nada. A la mañana siguiente, por primera vez en un año, hace lo que le pides. Y a partir de ahí no hay quien le pare.', 'Una noche helada te quedas horas dándole calor sin decirle nada. A la mañana siguiente, por primera vez en un año, hace lo que le pides. Y a partir de ahí no hay quien le pare.', 'Una noche helada te quedas horas dándole calor sin decirle nada. A la mañana siguiente, por primera vez en un año, hace lo que le pides. Y a partir de ahí no hay quien le pare.'),
              m(e, { media: [5, 10], vinculo: [16, 26], moral: [12, 20] })); }
          return efecto(L('Sigues sacándolo y sigue pasando de ti temporada tras temporada. Pierdes combates que tenías ganados y una parte del vestuario deja de entenderte.', 'Sigues sacándolo y sigue pasando de ti temporada tras temporada. Pierdes combates que tenías ganados y una parte del vestuario deja de entenderte.', 'Sigues sacándolo y sigue pasando de ti temporada tras temporada. Pierdes combates que tenías ganados y una parte del vestuario deja de entenderte.'),
            m(e, { media: [-5, -2], moral: [-7, -3], vinculo: [-6, -2] })); } },
      { txt: L('Dejarlo fuera del equipo', 'Dejarlo fuera del equipo', 'Dejarlo fuera del equipo'), sub: L('Competir con los que sí responden.', 'Competir con los que sí responden.', 'Competir con los que sí responden.'),
        efecto: e => { avanzar(e, 15);
          return efecto(L('Lo dejas descansar y tiras con el resto, que responden siempre. Ganas más y discutes menos, pero cada vez que ves un Charizard ajeno se te queda una cosa rara en el cuerpo.', 'Lo dejas descansar y tiras con el resto, que responden siempre. Ganas más y discutes menos, pero cada vez que ves un Charizard ajeno se te queda una cosa rara en el cuerpo.', 'Lo dejas descansar y tiras con el resto, que responden siempre. Ganas más y discutes menos, pero cada vez que ves un Charizard ajeno se te queda una cosa rara en el cuerpo.'),
            m(e, { media: [2, 6], estrategia: [5, 10], moral: [-4, -2], vinculo: [-5, -2] })); } },
    ],
  },
  {
    id: 'ash_16_primeape', ...paso(16),
    titulo: L('El que te robó la gorra', 'El que te robó la gorra', 'El que te robó la gorra'),
    texto: () => L('Empezó robándote la gorra en una ruta y ahora es un Primeape de treinta kilos de mal genio que te ha ganado combates importantes a base de furia. El problema es que últimamente no distingue entre un rival y un juez de silla. Un maestro de lucha del monte te ofrece quedárselo un par de años y enseñarle a canalizar eso.', 'Empezó robándote la gorra en una ruta y ahora es un Primeape de treinta kilos de mal genio que te ha ganado combates importantes a base de furia. El problema es que últimamente no distingue entre un rival y un juez de silla. Un maestro de lucha del monte te ofrece quedárselo un par de años y enseñarle a canalizar eso.', 'Empezó robándote la gorra en una ruta y ahora es un Primeape de treinta kilos de mal genio que te ha ganado combates importantes a base de furia. El problema es que últimamente no distingue entre un rival y un juez de silla. Un maestro de lucha del monte te ofrece quedárselo un par de años y enseñarle a canalizar eso.'),
    opciones: [
      { txt: L('Dejarlo con el maestro', 'Dejarlo con el maestro', 'Dejarlo con el maestro'), sub: L('Volverá siendo otra cosa.', 'Volverá siendo otra cosa.', 'Volverá siendo otra cosa.'),
        efecto: e => { avanzar(e, 16);
          hito(e, '🥊', 'Dejó a su Primeape con un maestro de lucha');
          return efecto(L('Le dices adiós desde la puerta del dojo y él no se gira, porque ya está pegándole a un saco. Años después ganará un campeonato de lucha con tu gorra puesta y tú lo verás por televisión desde un hotel.', 'Le dices adiós desde la puerta del dojo y él no se gira, porque ya está pegándole a un saco. Años después ganará un campeonato de lucha con tu gorra puesta y tú lo verás por televisión desde un hotel.', 'Le dices adiós desde la puerta del dojo y él no se gira, porque ya está pegándole a un saco. Años después ganará un campeonato de lucha con tu gorra puesta y tú lo verás por televisión desde un hotel.'),
            m(e, { media: [-3, -1], moral: [8, 14], fama: [4, 8], vinculo: [6, 11] })); } },
      { txt: L('Quedártelo y aguantar el genio', 'Quedártelo y aguantar el genio', 'Quedártelo y aguantar el genio'), sub: L('Gana combates, y eso es lo que cuenta.', 'Gana combates, y eso es lo que cuenta.', 'Gana combates, y eso es lo que cuenta.'), riesgo: 0.5,
        efecto: (e, ok) => { avanzar(e, 16);
          if (ok) return efecto(L('Aprendes a leerle: cuándo dejarle salir y cuándo no. Se convierte en tu arma pesada durante tres temporadas y no vuelve a tocar a un juez.', 'Aprendes a leerle: cuándo dejarle salir y cuándo no. Se convierte en tu arma pesada durante tres temporadas y no vuelve a tocar a un juez.', 'Aprendes a leerle: cuándo dejarle salir y cuándo no. Se convierte en tu arma pesada durante tres temporadas y no vuelve a tocar a un juez.'),
            m(e, { media: [3, 7], poder: [7, 13], estrategia: [4, 8] }));
          return efecto(L('En un torneo con público se lía a golpes con el entrenador rival y hay que sacarlo entre cuatro. Sanción, multa y una semana entera de titulares.', 'En un torneo con público se lía a golpes con el entrenador rival y hay que sacarlo entre cuatro. Sanción, multa y una semana entera de titulares.', 'En un torneo con público se lía a golpes con el entrenador rival y hay que sacarlo entre cuatro. Sanción, multa y una semana entera de titulares.'),
            m(e, { fama: [-11, -6], dinero: -rango(4000, 9000), moral: [-4, -2] })); } },
    ],
  },
  // Variantes: comparten el mismo paso del guion que el evento de al lado, así
  // que en cada partida de Satoshi sale una u otra. La historia es la misma,
  // los años intermedios no.
  {
    id: 'ash_6b_faro', ...paso(6),
    titulo: L('El faro del acantilado', 'El faro del acantilado', 'El faro del acantilado'),
    texto: () => L('Un investigador que vive solo en un faro lleva años emitiendo una llamada grabada hacia el mar, esperando a un Pokémon gigante del que nadie tiene una foto decente. La noche que te quedas a dormir allí, algo del tamaño del faro contesta desde la niebla.', 'Un investigador que vive solo en un faro lleva años emitiendo una llamada grabada hacia el mar, esperando a un Pokémon gigante del que nadie tiene una foto decente. La noche que te quedas a dormir allí, algo del tamaño del faro contesta desde la niebla.', 'Un investigador que vive solo en un faro lleva años emitiendo una llamada grabada hacia el mar, esperando a un Pokémon gigante del que nadie tiene una foto decente. La noche que te quedas a dormir allí, algo del tamaño del faro contesta desde la niebla.'),
    opciones: [
      { txt: L('Salir al acantilado a verlo', 'Salir al acantilado a verlo', 'Salir al acantilado a verlo'), sub: L('Sin Poké Balls, solo mirar.', 'Sin Poké Balls, solo mirar.', 'Sin Poké Balls, solo mirar.'),
        efecto: e => { avanzar(e, 6);
          hito(e, '🗼', 'Vio de cerca al gigante del faro');
          return efecto(L('Sales sin nada en las manos y os miráis durante un minuto entero antes de que se hunda otra vez. No hay foto, no hay prueba y nadie te va a creer nunca. Da igual.', 'Sales sin nada en las manos y os miráis durante un minuto entero antes de que se hunda otra vez. No hay foto, no hay prueba y nadie te va a creer nunca. Da igual.', 'Sales sin nada en las manos y os miráis durante un minuto entero antes de que se hunda otra vez. No hay foto, no hay prueba y nadie te va a creer nunca. Da igual.'),
            m(e, { moral: [10, 17], vinculo: [7, 12], estrategia: [4, 8] })); } },
      { txt: L('Intentar capturarlo', 'Intentar capturarlo', 'Intentar capturarlo'), sub: L('Una oportunidad así no se repite.', 'Una oportunidad así no se repite.', 'Una oportunidad así no se repite.'), riesgo: 0.15,
        efecto: (e, ok) => { avanzar(e, 6);
          if (ok) { const p = fichar(e, 'dratini', { nivel: 22 });
            hito(e, '🐉', 'Le lanzó una Ball al gigante del faro');
            return efecto(L(`La bola rebota en algo que no era él: un ${p?.nombre ?? 'Dratini'} que iba en su estela y que sí cae. Del grande no vuelves a saber nada, y el investigador no te habla en un mes.`, `La bola rebota en algo que no era él: un ${p?.nombre ?? 'Dratini'} que iba en su estela y que sí cae. Del grande no vuelves a saber nada, y el investigador no te habla en un mes.`, `La bola rebota en algo que no era él: un ${p?.nombre ?? 'Dratini'} que iba en su estela y que sí cae. Del grande no vuelves a saber nada, y el investigador no te habla en un mes.`),
              m(e, { fama: [4, 9], moral: [5, 10] })); }
          return efecto(L('La bola sale despedida y él se va. El faro se queda a oscuras esa noche, el investigador llorando en la escalera y tú sin saber dónde meterte.', 'La bola sale despedida y él se va. El faro se queda a oscuras esa noche, el investigador llorando en la escalera y tú sin saber dónde meterte.', 'La bola sale despedida y él se va. El faro se queda a oscuras esa noche, el investigador llorando en la escalera y tú sin saber dónde meterte.'),
            m(e, { moral: [-9, -4], fama: [-3, -1], estrategia: [3, 6] })); } },
    ],
  },
  {
    id: 'ash_8b_central', ...paso(8),
    titulo: L('La central abandonada', 'La central abandonada', 'La central abandonada'),
    texto: () => L('La central eléctrica que alimenta media región lleva tres días sin dar corriente y los operarios no entran: dentro hay una colonia de Pokémon de lodo metida en las turbinas y algo eléctrico rebotando por los pasillos. El alcalde ofrece dinero a quien lo resuelva.', 'La central eléctrica que alimenta media región lleva tres días sin dar corriente y los operarios no entran: dentro hay una colonia de Pokémon de lodo metida en las turbinas y algo eléctrico rebotando por los pasillos. El alcalde ofrece dinero a quien lo resuelva.', 'La central eléctrica que alimenta media región lleva tres días sin dar corriente y los operarios no entran: dentro hay una colonia de Pokémon de lodo metida en las turbinas y algo eléctrico rebotando por los pasillos. El alcalde ofrece dinero a quien lo resuelva.'),
    opciones: [
      { txt: L('Entrar tú a limpiar aquello', 'Entrar tú a limpiar aquello', 'Entrar tú a limpiar aquello'), sub: L('Con el equipo y una linterna.', 'Con el equipo y una linterna.', 'Con el equipo y una linterna.'), riesgo: 0.6,
        efecto: (e, ok) => { avanzar(e, 8);
          if (ok) return efecto(L('Tardáis dos días en sacarlos de las turbinas sin hacerles daño y reubicarlos en una charca a diez kilómetros. Vuelve la luz a media región y sales en el informativo de la noche.', 'Tardáis dos días en sacarlos de las turbinas sin hacerles daño y reubicarlos en una charca a diez kilómetros. Vuelve la luz a media región y sales en el informativo de la noche.', 'Tardáis dos días en sacarlos de las turbinas sin hacerles daño y reubicarlos en una charca a diez kilómetros. Vuelve la luz a media región y sales en el informativo de la noche.'),
            m(e, { dinero: rango(6000, 14000), fama: [7, 13], moral: [7, 12] }));
          return efecto(L('Tocas lo que no debías y la descarga os manda a los dos al centro de salud. La luz vuelve sola tres días después y nadie se acuerda de que estuviste allí.', 'Tocas lo que no debías y la descarga os manda a los dos al centro de salud. La luz vuelve sola tres días después y nadie se acuerda de que estuviste allí.', 'Tocas lo que no debías y la descarga os manda a los dos al centro de salud. La luz vuelve sola tres días después y nadie se acuerda de que estuviste allí.'),
            m(e, { salud: [-8, -4], moral: [-4, -2], estrategia: [4, 8] })); } },
      { txt: L('Avisar de que ahí viven', 'Avisar de que ahí viven', 'Avisar de que ahí viven'), sub: L('No es una avería, es una colonia.', 'No es una avería, es una colonia.', 'No es una avería, es una colonia.'),
        efecto: e => { avanzar(e, 8);
          return efecto(L('Explicas en el ayuntamiento que eso lleva años siendo su casa y que la central se construyó encima. Te miran como si hablaras en otro idioma, pero acaban montando el traslado bien hecho.', 'Explicas en el ayuntamiento que eso lleva años siendo su casa y que la central se construyó encima. Te miran como si hablaras en otro idioma, pero acaban montando el traslado bien hecho.', 'Explicas en el ayuntamiento que eso lleva años siendo su casa y que la central se construyó encima. Te miran como si hablaras en otro idioma, pero acaban montando el traslado bien hecho.'),
            m(e, { fama: [3, 7], moral: [6, 11], vinculo: [7, 12] })); } },
    ],
  },
  {
    id: 'ash_9b_ponyta', ...paso(9),
    titulo: L('La carrera del rancho', 'La carrera del rancho', 'La carrera del rancho'),
    texto: () => L('Un rancho enorme donde crían Pokémon de fuego y montan una carrera anual con más público que muchos torneos oficiales. La favorita es una Ponyta que no deja que la monte nadie y cuya criadora te ofrece el puesto porque su hermano se ha roto una pierna.', 'Un rancho enorme donde crían Pokémon de fuego y montan una carrera anual con más público que muchos torneos oficiales. La favorita es una Ponyta que no deja que la monte nadie y cuya criadora te ofrece el puesto porque su hermano se ha roto una pierna.', 'Un rancho enorme donde crían Pokémon de fuego y montan una carrera anual con más público que muchos torneos oficiales. La favorita es una Ponyta que no deja que la monte nadie y cuya criadora te ofrece el puesto porque su hermano se ha roto una pierna.'),
    opciones: [
      { txt: L('Correr la carrera', 'Correr la carrera', 'Correr la carrera'), sub: L('Sin haberte subido nunca a una.', 'Sin haberte subido nunca a una.', 'Sin haberte subido nunca a una.'), riesgo: 0.5,
        efecto: (e, ok) => { avanzar(e, 9);
          if (ok) { hito(e, '🐎', 'Ganó la carrera del rancho a lomos de una Ponyta');
            return efecto(L('Te deja subir a la tercera vuelta de calentamiento y ganáis por medio cuerpo entre las llamas. La criadora te paga y te dice que vuelvas cuando quieras.', 'Te deja subir a la tercera vuelta de calentamiento y ganáis por medio cuerpo entre las llamas. La criadora te paga y te dice que vuelvas cuando quieras.', 'Te deja subir a la tercera vuelta de calentamiento y ganáis por medio cuerpo entre las llamas. La criadora te paga y te dice que vuelvas cuando quieras.'),
              m(e, { dinero: rango(4000, 11000), fama: [7, 12], moral: [9, 15], salud: [-4, -2] })); }
          return efecto(L('Te tira en la segunda curva delante de mil personas y acabas la carrera andando, con el sombrero en la mano. La criadora te invita a comer para que no te vayas así.', 'Te tira en la segunda curva delante de mil personas y acabas la carrera andando, con el sombrero en la mano. La criadora te invita a comer para que no te vayas así.', 'Te tira en la segunda curva delante de mil personas y acabas la carrera andando, con el sombrero en la mano. La criadora te invita a comer para que no te vayas así.'),
            m(e, { salud: [-7, -3], moral: [-5, -2], vinculo: [5, 9] })); } },
      { txt: L('Quedarte a cuidar la cuadra', 'Quedarte a cuidar la cuadra', 'Quedarte a cuidar la cuadra'), sub: L('Aprender por dentro cómo se cría.', 'Aprender por dentro cómo se cría.', 'Aprender por dentro cómo se cría.'),
        efecto: e => { avanzar(e, 9);
          return efecto(L('Te pasas la temporada entera limpiando establos y viendo cómo se prepara a un Pokémon de verdad: comida, descanso, cuándo parar. No sales en ninguna foto y te llevas dos años de conocimiento.', 'Te pasas la temporada entera limpiando establos y viendo cómo se prepara a un Pokémon de verdad: comida, descanso, cuándo parar. No sales en ninguna foto y te llevas dos años de conocimiento.', 'Te pasas la temporada entera limpiando establos y viendo cómo se prepara a un Pokémon de verdad: comida, descanso, cuándo parar. No sales en ninguna foto y te llevas dos años de conocimiento.'),
            m(e, { estrategia: [8, 14], vinculo: [9, 15], media: [1, 3] })); } },
    ],
  },
  {
    id: 'ash_13b_dojo', ...paso(13),
    titulo: L('El dojo de la ciudad', 'El dojo de la ciudad', 'El dojo de la ciudad'),
    texto: () => L('Dos escuelas de lucha llevan veinte años peleándose por el mismo barrio y por si es mejor pegar con los puños o con las piernas. Te ofrecen combatir por una de las dos, y de premio te llevas al alumno que sobra: un Tyrogue que no encaja en ninguna de las dos formas.', 'Dos escuelas de lucha llevan veinte años peleándose por el mismo barrio y por si es mejor pegar con los puños o con las piernas. Te ofrecen combatir por una de las dos, y de premio te llevas al alumno que sobra: un Tyrogue que no encaja en ninguna de las dos formas.', 'Dos escuelas de lucha llevan veinte años peleándose por el mismo barrio y por si es mejor pegar con los puños o con las piernas. Te ofrecen combatir por una de las dos, y de premio te llevas al alumno que sobra: un Tyrogue que no encaja en ninguna de las dos formas.'),
    opciones: [
      { txt: L('Combatir y llevarte al que sobra', 'Combatir y llevarte al que sobra', 'Combatir y llevarte al que sobra'), sub: L('A ese no lo quiere nadie.', 'A ese no lo quiere nadie.', 'A ese no lo quiere nadie.'), riesgo: 0.65,
        efecto: (e, ok) => { avanzar(e, 13); const p = fichar(e, 'tyrogue', { nivel: 18 });
          if (ok) return efecto(L(`Ganas el combate y te llevas al pequeño delante de los dos maestros, que discuten hasta en eso. ${p?.nombre ?? 'Tyrogue'} entra en el equipo y todavía no sabe en qué va a acabar convirtiéndose.`, `Ganas el combate y te llevas al pequeño delante de los dos maestros, que discuten hasta en eso. ${p?.nombre ?? 'Tyrogue'} entra en el equipo y todavía no sabe en qué va a acabar convirtiéndose.`, `Ganas el combate y te llevas al pequeño delante de los dos maestros, que discuten hasta en eso. ${p?.nombre ?? 'Tyrogue'} entra en el equipo y todavía no sabe en qué va a acabar convirtiéndose.`),
            m(e, { media: [1, 4], vinculo: [7, 12], moral: [6, 11] }));
          return efecto(L(`Pierdes el combate y aun así te dejan llevártelo, básicamente para quitárselo de en medio. ${p?.nombre ?? 'Tyrogue'} se sube a tu hombro sin que nadie le aplauda.`, `Pierdes el combate y aun así te dejan llevártelo, básicamente para quitárselo de en medio. ${p?.nombre ?? 'Tyrogue'} se sube a tu hombro sin que nadie le aplauda.`, `Pierdes el combate y aun así te dejan llevártelo, básicamente para quitárselo de en medio. ${p?.nombre ?? 'Tyrogue'} se sube a tu hombro sin que nadie le aplauda.`),
            m(e, { moral: [-3, -1], vinculo: [8, 13], estrategia: [4, 8] })); } },
      { txt: L('Negarte a elegir bando', 'Negarte a elegir bando', 'Negarte a elegir bando'), sub: L('Esa pelea no es tuya.', 'Esa pelea no es tuya.', 'Esa pelea no es tuya.'),
        efecto: e => { avanzar(e, 13);
          return efecto(L('Les dices que se peleen ellos y te vas del barrio sin combatir. Los dos maestros te dedican una semana de insultos por la radio local y tú llegas fresco a la siguiente ciudad.', 'Les dices que se peleen ellos y te vas del barrio sin combatir. Los dos maestros te dedican una semana de insultos por la radio local y tú llegas fresco a la siguiente ciudad.', 'Les dices que se peleen ellos y te vas del barrio sin combatir. Los dos maestros te dedican una semana de insultos por la radio local y tú llegas fresco a la siguiente ciudad.'),
            m(e, { fama: [-4, -1], salud: [5, 9], estrategia: [3, 6] })); } },
    ],
  },
  {
    id: 'ash_16b_seis', ...paso(16),
    titulo: L('La norma de los seis', 'La norma de los seis', 'La norma de los seis'),
    texto: e => L(`Un inspector de la Liga se planta en el hotel con una carpeta: llevas años acumulando capturas y la norma dice seis en activo, el resto al rancho del laboratorio. Te da a elegir a quién dejas fuera, ahora mismo, con la carpeta abierta encima de la mesa.`, `Un inspector de la Liga se planta en el hotel con una carpeta: llevas años acumulando capturas y la norma dice seis en activo, el resto al rancho del laboratorio. Te da a elegir a quién dejas fuera, ahora mismo, con la carpeta abierta encima de la mesa.`, `Un inspector de la Liga se planta en el hotel con una carpeta: llevas años acumulando capturas y la norma dice seis en activo, el resto al rancho del laboratorio. Te da a elegir a quién dejas fuera, ahora mismo, con la carpeta abierta encima de la mesa.`),
    opciones: [
      { txt: L('Cumplir la norma y mandarlos al rancho', 'Cumplir la norma y mandarlos al rancho', 'Cumplir la norma y mandarlos al rancho'), sub: L('Elegir a quién dejas fuera.', 'Elegir a quién dejas fuera.', 'Elegir a quién dejas fuera.'),
        efecto: e => { avanzar(e, 16);
          const eq = activos(e).filter(p => p.uid !== e.socio).sort((a, b) => poderPokemon(a) - poderPokemon(b));
          const fuera = eq.slice(0, Math.max(0, eq.length - 5));
          for (const p of fuera) p.retirado = true;
          return efecto(L(`Firmas la carpeta y los subes tú mismo al transporte, uno por uno, explicándoles algo que no entienden.${fuera.length ? ` Se van al rancho ${fuera.map(p => p.nombre).join(', ')}.` : ' Resulta que ya cumplías, y encima te disculpas.'}`, `Firmas la carpeta y los subes tú mismo al transporte, uno por uno, explicándoles algo que no entienden.${fuera.length ? ` Se van al rancho ${fuera.map(p => p.nombre).join(', ')}.` : ' Resulta que ya cumplías, y encima te disculpas.'}`, `Firmas la carpeta y los subes tú mismo al transporte, uno por uno, explicándoles algo que no entienden.${fuera.length ? ` Se van al rancho ${fuera.map(p => p.nombre).join(', ')}.` : ' Resulta que ya cumplías, y encima te disculpas.'}`),
            m(e, { moral: [-6, -3], fama: [4, 8], estrategia: [4, 8] })); } },
      { txt: L('Discutirle la norma al inspector', 'Discutirle la norma al inspector', 'Discutirle la norma al inspector'), sub: L('Te vas a comer el expediente.', 'Te vas a comer el expediente.', 'Te vas a comer el expediente.'), riesgo: 0.45,
        efecto: (e, ok) => { avanzar(e, 16);
          if (ok) return efecto(L('Le montas tal escena en la recepción del hotel que acaba dándote una prórroga por escrito. Te quedas con el equipo entero y con un inspector que ya no te va a quitar ojo en toda tu carrera.', 'Le montas tal escena en la recepción del hotel que acaba dándote una prórroga por escrito. Te quedas con el equipo entero y con un inspector que ya no te va a quitar ojo en toda tu carrera.', 'Le montas tal escena en la recepción del hotel que acaba dándote una prórroga por escrito. Te quedas con el equipo entero y con un inspector que ya no te va a quitar ojo en toda tu carrera.'),
            m(e, { vinculo: [9, 15], moral: [7, 12], fama: [-3, -1] }));
          return efecto(L('Le montas una escena, alguien la graba y sale en todas partes. Multa, apercibimiento y la obligación de cumplir igual, solo que ahora con público.', 'Le montas una escena, alguien la graba y sale en todas partes. Multa, apercibimiento y la obligación de cumplir igual, solo que ahora con público.', 'Le montas una escena, alguien la graba y sale en todas partes. Multa, apercibimiento y la obligación de cumplir igual, solo que ahora con público.'),
            m(e, { dinero: -rango(5000, 12000), fama: [-8, -4], moral: [-5, -2] })); } },
    ],
  },
  {
    id: 'ash_17_safari', ...paso(17),
    titulo: L('Media hora en el Parque Safari', 'Media hora en el Parque Safari', 'Media hora en el Parque Safari'),
    texto: () => L('Treinta Poké Balls, media hora de reloj y una reserva enorme llena de bichos que no vas a ver en ningún otro sitio de la región. El guarda te avisa: ni una bola más de las que te dan, y si te pilla saliéndote del recorrido te expulsa de por vida.', 'Treinta Poké Balls, media hora de reloj y una reserva enorme llena de bichos que no vas a ver en ningún otro sitio de la región. El guarda te avisa: ni una bola más de las que te dan, y si te pilla saliéndote del recorrido te expulsa de por vida.', 'Treinta Poké Balls, media hora de reloj y una reserva enorme llena de bichos que no vas a ver en ningún otro sitio de la región. El guarda te avisa: ni una bola más de las que te dan, y si te pilla saliéndote del recorrido te expulsa de por vida.'),
    opciones: [
      { txt: L('Tirar a todo lo que se mueva', 'Tirar a todo lo que se mueva', 'Tirar a todo lo que se mueva'), sub: L('Cantidad antes que calidad.', 'Cantidad antes que calidad.', 'Cantidad antes que calidad.'), riesgo: 0.7,
        efecto: (e, ok) => { avanzar(e, 17);
          if (ok) { const a = capturaAleatoria(e, { region: 'kanto' }), b = capturaAleatoria(e, { region: 'kanto' });
            hito(e, '🐂', 'Salió del Parque Safari con media reserva en la mochila');
            return efecto(L(`Sales de allí con la mochila llena y una manada entera registrada a tu nombre. Al equipo se suman ${a?.nombre ?? 'un par'} y ${b?.nombre ?? 'otro más'}, y el resto se queda en el rancho comiéndose tu presupuesto.`, `Sales de allí con la mochila llena y una manada entera registrada a tu nombre. Al equipo se suman ${a?.nombre ?? 'un par'} y ${b?.nombre ?? 'otro más'}, y el resto se queda en el rancho comiéndose tu presupuesto.`, `Sales de allí con la mochila llena y una manada entera registrada a tu nombre. Al equipo se suman ${a?.nombre ?? 'un par'} y ${b?.nombre ?? 'otro más'}, y el resto se queda en el rancho comiéndose tu presupuesto.`),
              m(e, { fama: [5, 10], dinero: -rango(2000, 6000), moral: [7, 12] })); }
          return efecto(L('Vacías las treinta bolas en veinte minutos y no cae ni una. El guarda te lo dice a la cara delante de todo el grupo de la visita escolar.', 'Vacías las treinta bolas en veinte minutos y no cae ni una. El guarda te lo dice a la cara delante de todo el grupo de la visita escolar.', 'Vacías las treinta bolas en veinte minutos y no cae ni una. El guarda te lo dice a la cara delante de todo el grupo de la visita escolar.'),
            m(e, { moral: [-4, -2], dinero: -rango(1000, 3000), estrategia: [2, 5] })); } },
      { txt: L('Esperar a una sola pieza buena', 'Esperar a una sola pieza buena', 'Esperar a una sola pieza buena'), sub: L('Media hora quieto, sin respirar.', 'Media hora quieto, sin respirar.', 'Media hora quieto, sin respirar.'), riesgo: 0.45,
        efecto: (e, ok) => { avanzar(e, 17);
          if (ok) { const p = capturaAleatoria(e, { rarezaMin: 'raro', region: 'kanto' });
            return efecto(L(`Te pasas veintiocho minutos tumbado entre juncos y a falta de dos aparece. ${p?.nombre ?? 'La pieza'} cae a la primera bola y sales del parque sin usar las otras veintinueve.`, `Te pasas veintiocho minutos tumbado entre juncos y a falta de dos aparece. ${p?.nombre ?? 'La pieza'} cae a la primera bola y sales del parque sin usar las otras veintinueve.`, `Te pasas veintiocho minutos tumbado entre juncos y a falta de dos aparece. ${p?.nombre ?? 'La pieza'} cae a la primera bola y sales del parque sin usar las otras veintinueve.`),
              m(e, { estrategia: [6, 11], media: [2, 5], fama: [3, 7] })); }
          return efecto(L('Te pasas la media hora entera tumbado entre juncos esperando algo que no llega. Sales del parque con las treinta bolas intactas y con dos horas de sueño perdidas.', 'Te pasas la media hora entera tumbado entre juncos esperando algo que no llega. Sales del parque con las treinta bolas intactas y con dos horas de sueño perdidas.', 'Te pasas la media hora entera tumbado entre juncos esperando algo que no llega. Sales del parque con las treinta bolas intactas y con dos horas de sueño perdidas.'),
            m(e, { moral: [-3, -1], estrategia: [4, 8] })); } },
    ],
  },
  {
    id: 'ash_18_canela', ...paso(18),
    titulo: L('La isla del volcán', 'La isla del volcán', 'La isla del volcán'),
    texto: () => L('Séptima medalla. El gimnasio está escondido debajo de un hostal cutre y el líder combate en una plataforma sobre el cráter de un volcán activo, con el aire a cincuenta grados. En la misma isla hay un laboratorio que lleva veinte años intentando resucitar Pokémon extintos, y te dejan pasar.', 'Séptima medalla. El gimnasio está escondido debajo de un hostal cutre y el líder combate en una plataforma sobre el cráter de un volcán activo, con el aire a cincuenta grados. En la misma isla hay un laboratorio que lleva veinte años intentando resucitar Pokémon extintos, y te dejan pasar.', 'Séptima medalla. El gimnasio está escondido debajo de un hostal cutre y el líder combate en una plataforma sobre el cráter de un volcán activo, con el aire a cincuenta grados. En la misma isla hay un laboratorio que lleva veinte años intentando resucitar Pokémon extintos, y te dejan pasar.'),
    opciones: [
      { txt: L('Combatir sobre el cráter', 'Combatir sobre el cráter', 'Combatir sobre el cráter'), sub: L('Con tu equipo cocido a medio combate.', 'Con tu equipo cocido a medio combate.', 'Con tu equipo cocido a medio combate.'), riesgo: 0.55,
        efecto: (e, ok) => { avanzar(e, 18);
          if (ok) { e.medallas = Math.min(8, e.medallas + 1);
            hito(e, '🌋', 'Ganó la medalla del gimnasio del volcán');
            return efecto(L('Aguantáis el calor mejor que ellos y ganas en la plataforma de arriba, con la lava a treinta metros. Sales de allí con la medalla, sin cejas y con el récord del gimnasio.', 'Aguantáis el calor mejor que ellos y ganas en la plataforma de arriba, con la lava a treinta metros. Sales de allí con la medalla, sin cejas y con el récord del gimnasio.', 'Aguantáis el calor mejor que ellos y ganas en la plataforma de arriba, con la lava a treinta metros. Sales de allí con la medalla, sin cejas y con el récord del gimnasio.'),
              m(e, { media: [3, 6], fama: [6, 11], salud: [-4, -2], moral: [9, 15] })); }
          return efecto(L('El calor os funde antes que el rival. Pierdes en la plataforma y bajas del volcán con medio equipo en camilla y la medalla sin conseguir.', 'El calor os funde antes que el rival. Pierdes en la plataforma y bajas del volcán con medio equipo en camilla y la medalla sin conseguir.', 'El calor os funde antes que el rival. Pierdes en la plataforma y bajas del volcán con medio equipo en camilla y la medalla sin conseguir.'),
            m(e, { salud: [-7, -3], moral: [-4, -2], estrategia: [5, 9] })); } },
      { txt: L('Pasar por el laboratorio de fósiles', 'Pasar por el laboratorio de fósiles', 'Pasar por el laboratorio de fósiles'), sub: L('Hoy no combates, hoy compras futuro.', 'Hoy no combates, hoy compras futuro.', 'Hoy no combates, hoy compras futuro.'),
        efecto: e => { avanzar(e, 18); const p = fichar(e, 'aerodactyl', { nivel: 30 });
          hito(e, '🦴', 'Revivió a un Pokémon extinto en el laboratorio de la isla');
          return efecto(L(`Pagas la reanimación completa y esperas seis semanas en la isla. Lo que sale del tanque lleva cien millones de años enfadado: ${p?.nombre ?? 'Aerodactyl'} entra en el equipo y todavía no le has visto obedecer a nadie.`, `Pagas la reanimación completa y esperas seis semanas en la isla. Lo que sale del tanque lleva cien millones de años enfadado: ${p?.nombre ?? 'Aerodactyl'} entra en el equipo y todavía no le has visto obedecer a nadie.`, `Pagas la reanimación completa y esperas seis semanas en la isla. Lo que sale del tanque lleva cien millones de años enfadado: ${p?.nombre ?? 'Aerodactyl'} entra en el equipo y todavía no le has visto obedecer a nadie.`),
            m(e, { dinero: -Math.round(Math.min(e.dinero * 0.6, 120000)), media: [2, 5], poder: [6, 11], vinculo: [-5, -2] })); } },
    ],
  },
  {
    id: 'ash_19_verde', ...paso(19),
    titulo: L('El gimnasio del jefe', 'El gimnasio del jefe', 'El gimnasio del jefe'),
    texto: e => L(`La octava medalla, en la ciudad por la que pasaste el primer día. El líder no está: dicen que dirige otras cosas. En su lugar te reciben tres suplentes con uniforme, un decorado montado a toda prisa y una máquina de combate que te toca desmontar tú solo cuando se les va de las manos.`, `La octava medalla, en la ciudad por la que pasaste el primer día. El líder no está: dicen que dirige otras cosas. En su lugar te reciben tres suplentes con uniforme, un decorado montado a toda prisa y una máquina de combate que te toca desmontar tú solo cuando se les va de las manos.`, `La octava medalla, en la ciudad por la que pasaste el primer día. El líder no está: dicen que dirige otras cosas. En su lugar te reciben tres suplentes con uniforme, un decorado montado a toda prisa y una máquina de combate que te toca desmontar tú solo cuando se les va de las manos.`),
    opciones: [
      { txt: L('Combatir igualmente y llevarte la medalla', 'Combatir igualmente y llevarte la medalla', 'Combatir igualmente y llevarte la medalla'), sub: L('Está en el reglamento.', 'Está en el reglamento.', 'Está en el reglamento.'), riesgo: 0.6,
        efecto: (e, ok) => { avanzar(e, 19);
          if (ok) { e.medallas = Math.min(8, e.medallas + 1);
            hito(e, '🎖️', 'Completó las ocho medallas de Kanto');
            return efecto(L('Les ganas, desmontas su máquina de un trueno y te vas con la octava medalla en la mano. La Liga te acepta la inscripción esa misma tarde.', 'Les ganas, desmontas su máquina de un trueno y te vas con la octava medalla en la mano. La Liga te acepta la inscripción esa misma tarde.', 'Les ganas, desmontas su máquina de un trueno y te vas con la octava medalla en la mano. La Liga te acepta la inscripción esa misma tarde.'),
              m(e, { fama: [7, 13], moral: [12, 19], media: [2, 5] })); }
          return efecto(L('La máquina te fríe a dos Pokémon y los suplentes salen corriendo con la caja del gimnasio. Sin medalla, sin explicaciones y con la inscripción a la Liga en el aire.', 'La máquina te fríe a dos Pokémon y los suplentes salen corriendo con la caja del gimnasio. Sin medalla, sin explicaciones y con la inscripción a la Liga en el aire.', 'La máquina te fríe a dos Pokémon y los suplentes salen corriendo con la caja del gimnasio. Sin medalla, sin explicaciones y con la inscripción a la Liga en el aire.'),
            m(e, { moral: [-6, -3], salud: [-3, -1], fama: [2, 5] })); } },
      { txt: L('Denunciar el gimnasio a la Liga', 'Denunciar el gimnasio a la Liga', 'Denunciar el gimnasio a la Liga'), sub: L('Eso de ahí dentro no es un gimnasio.', 'Eso de ahí dentro no es un gimnasio.', 'Eso de ahí dentro no es un gimnasio.'),
        efecto: e => { avanzar(e, 19);
          return efecto(L('Presentas la denuncia con fotos. La Liga tarda meses en moverse, pero acaba interviniendo el gimnasio entero y a ti te dan la medalla por vía administrativa, que es la forma menos épica posible de conseguir una.', 'Presentas la denuncia con fotos. La Liga tarda meses en moverse, pero acaba interviniendo el gimnasio entero y a ti te dan la medalla por vía administrativa, que es la forma menos épica posible de conseguir una.', 'Presentas la denuncia con fotos. La Liga tarda meses en moverse, pero acaba interviniendo el gimnasio entero y a ti te dan la medalla por vía administrativa, que es la forma menos épica posible de conseguir una.'),
            m(e, { fama: [4, 9], estrategia: [7, 12], moral: [-2, -1] })); } },
    ],
  },
  {
    id: 'ash_20_despedidas', ...paso(20),
    titulo: L('Las despedidas', 'Las despedidas', 'Las despedidas'),
    texto: () => L('Dos el mismo año. Tu Butterfree ha encontrado pareja y la bandada se va cruzando el mar. Y en la ruta de vuelta, el Pidgeot que te lleva años acompañando se queda mirando a una bandada de Pidgey a los que alguien tiene que proteger. Ninguno de los dos se irá si no se lo dices tú.', 'Dos el mismo año. Tu Butterfree ha encontrado pareja y la bandada se va cruzando el mar. Y en la ruta de vuelta, el Pidgeot que te lleva años acompañando se queda mirando a una bandada de Pidgey a los que alguien tiene que proteger. Ninguno de los dos se irá si no se lo dices tú.', 'Dos el mismo año. Tu Butterfree ha encontrado pareja y la bandada se va cruzando el mar. Y en la ruta de vuelta, el Pidgeot que te lleva años acompañando se queda mirando a una bandada de Pidgey a los que alguien tiene que proteger. Ninguno de los dos se irá si no se lo dices tú.'),
    opciones: [
      { txt: L('Decirles que se vayan', 'Decirles que se vayan', 'Decirles que se vayan'), sub: L('Aunque te quedes sin ellos.', 'Aunque te quedes sin ellos.', 'Aunque te quedes sin ellos.'),
        efecto: e => { const eq = activos(e);
          const suelta = eq.filter(p => ['caterpie', 'pidgey'].includes(p.linea));
          for (const p of suelta) p.retirado = true;
          avanzar(e, 20);
          hito(e, '👋', 'Los dejó marchar cuando tocaba');
          return efecto(L(`Les dices adiós desde un acantilado, gritando, hasta que no se les ve. Es la primera vez que un entrenador te ve llorar y no te importa lo más mínimo.${suelta.length ? ` Se van ${suelta.map(p => p.nombre).join(' y ')}.` : ''}`, `Les dices adiós desde un acantilado, gritando, hasta que no se les ve. Es la primera vez que un entrenador te ve llorar y no te importa lo más mínimo.${suelta.length ? ` Se van ${suelta.map(p => p.nombre).join(' y ')}.` : ''}`, `Les dices adiós desde un acantilado, gritando, hasta que no se les ve. Es la primera vez que un entrenador te ve llorar y no te importa lo más mínimo.${suelta.length ? ` Se van ${suelta.map(p => p.nombre).join(' y ')}.` : ''}`),
            m(e, { media: [-3, -1], moral: [10, 18], vinculo: [12, 20], fama: [4, 9] })); } },
      { txt: L('Pedirles que se queden', 'Pedirles que se queden', 'Pedirles que se queden'), sub: L('Los necesitas para competir.', 'Los necesitas para competir.', 'Los necesitas para competir.'),
        efecto: e => { avanzar(e, 20);
          return efecto(L('Se quedan, porque te harían caso hasta en esto. Tu equipo es más fuerte esta temporada y tú te pasas el año evitando mirarles a la cara.', 'Se quedan, porque te harían caso hasta en esto. Tu equipo es más fuerte esta temporada y tú te pasas el año evitando mirarles a la cara.', 'Se quedan, porque te harían caso hasta en esto. Tu equipo es más fuerte esta temporada y tú te pasas el año evitando mirarles a la cara.'),
            m(e, { media: [4, 8], moral: [-7, -3], vinculo: [-8, -3] })); } },
    ],
  },
  {
    id: 'ash_21_anil', ...paso(21),
    titulo: L('Liga Añil', 'Liga Añil', 'Liga Añil'),
    texto: e => L(`Las ocho medallas, el estadio lleno y la antorcha encendida. Vas pasando rondas hasta que en el top 16 te toca un chico normal, de esos que nadie tiene fichados. Y en mitad del combate, tu Charizard vuelve a hacer lo de siempre: se sienta. ${e.rival.nombre} lo está viendo desde la grada.`, `Las ocho medallas, el estadio lleno y la antorcha encendida. Vas pasando rondas hasta que en el top 16 te toca un chico normal, de esos que nadie tiene fichados. Y en mitad del combate, tu Charizard vuelve a hacer lo de siempre: se sienta. ${e.rival.nombre} lo está viendo desde la grada.`, `Las ocho medallas, el estadio lleno y la antorcha encendida. Vas pasando rondas hasta que en el top 16 te toca un chico normal, de esos que nadie tiene fichados. Y en mitad del combate, tu Charizard vuelve a hacer lo de siempre: se sienta. ${e.rival.nombre} lo está viendo desde la grada.`),
    opciones: [
      { txt: L('Rogarle que se levante', 'Rogarle que se levante', 'Rogarle que se levante'), sub: L('Delante de todo el estadio.', 'Delante de todo el estadio.', 'Delante de todo el estadio.'), riesgo: 0.25,
        efecto: (e, ok) => { avanzar(e, 21); e.flags.arcoKantoHecho = true;
          if (ok) { e.titulos.push({ año: e.año, nombre: 'Liga Añil' }); e.ligasGanadas++;
            hito(e, '🏆', 'Ganó la Liga Añil contra todo pronóstico');
            return efecto(L('Se levanta. No sabes por qué, pero se levanta, y lo que pasa después no lo olvida nadie que estuviera allí. Ganas la Liga Añil en tu primer intento.', 'Se levanta. No sabes por qué, pero se levanta, y lo que pasa después no lo olvida nadie que estuviera allí. Ganas la Liga Añil en tu primer intento.', 'Se levanta. No sabes por qué, pero se levanta, y lo que pasa después no lo olvida nadie que estuviera allí. Ganas la Liga Añil en tu primer intento.'),
              m(e, { fama: [25, 40], moral: [20, 32], media: [4, 9], talento: [3, 6] })); }
          hito(e, '😔', 'Cayó en el top 16 de su primera Liga Añil');
          return efecto(L('No se levanta. Te descalifican por Pokémon incapacitado y te vas del estadio en el top 16, con la antorcha todavía encendida a tu espalda. Tu madre te dice que ha estado muy bien. Tú sabes que no.', 'No se levanta. Te descalifican por Pokémon incapacitado y te vas del estadio en el top 16, con la antorcha todavía encendida a tu espalda. Tu madre te dice que ha estado muy bien. Tú sabes que no.', 'No se levanta. Te descalifican por Pokémon incapacitado y te vas del estadio en el top 16, con la antorcha todavía encendida a tu espalda. Tu madre te dice que ha estado muy bien. Tú sabes que no.'),
            m(e, { fama: [8, 15], moral: [-9, -5], estrategia: [7, 13] })); } },
      { txt: L('Cambiarlo y seguir con otro', 'Cambiarlo y seguir con otro', 'Cambiarlo y seguir con otro'), sub: L('Salvar el combate como sea.', 'Salvar el combate como sea.', 'Salvar el combate como sea.'), riesgo: 0.45,
        efecto: (e, ok) => { avanzar(e, 21); e.flags.arcoKantoHecho = true;
          if (ok) { hito(e, '🔥', 'Llegó a semifinales de la Liga Añil');
            return efecto(L('Lo retiras sin discutir y tiras con el resto, que dan la cara. Caes en semifinales peleando cada punto, y sales del estadio con la sensación de haber competido de verdad.', 'Lo retiras sin discutir y tiras con el resto, que dan la cara. Caes en semifinales peleando cada punto, y sales del estadio con la sensación de haber competido de verdad.', 'Lo retiras sin discutir y tiras con el resto, que dan la cara. Caes en semifinales peleando cada punto, y sales del estadio con la sensación de haber competido de verdad.'),
              m(e, { fama: [14, 24], moral: [6, 12], estrategia: [8, 14] })); }
          return efecto(L('Lo retiras, pero el daño ya está hecho y caes en la misma ronda igualmente. Al menos esta vez no te fuiste sin intentarlo.', 'Lo retiras, pero el daño ya está hecho y caes en la misma ronda igualmente. Al menos esta vez no te fuiste sin intentarlo.', 'Lo retiras, pero el daño ya está hecho y caes en la misma ronda igualmente. Al menos esta vez no te fuiste sin intentarlo.'),
            m(e, { fama: [7, 13], moral: [-5, -2], estrategia: [5, 10] })); } },
    ],
  },
  {
    id: 'ash_22_frente', ...paso(22),
    titulo: L('El Frente de Batalla', 'El Frente de Batalla', 'El Frente de Batalla'),
    texto: () => L('Años después de la Liga, la federación monta en la región un circuito paralelo para los que no encajan en el oficial: siete instalaciones, siete cerebros, un símbolo por cada uno. Nada de rankings ni de patrocinadores. Solo siete puertas y siete personas que combaten mejor que tú.', 'Años después de la Liga, la federación monta en la región un circuito paralelo para los que no encajan en el oficial: siete instalaciones, siete cerebros, un símbolo por cada uno. Nada de rankings ni de patrocinadores. Solo siete puertas y siete personas que combaten mejor que tú.', 'Años después de la Liga, la federación monta en la región un circuito paralelo para los que no encajan en el oficial: siete instalaciones, siete cerebros, un símbolo por cada uno. Nada de rankings ni de patrocinadores. Solo siete puertas y siete personas que combaten mejor que tú.'),
    opciones: [
      { txt: L('Recorrerlo instalación por instalación', 'Recorrerlo instalación por instalación', 'Recorrerlo instalación por instalación'), sub: L('Dos años, sin competir en nada más.', 'Dos años, sin competir en nada más.', 'Dos años, sin competir en nada más.'), riesgo: 0.6,
        efecto: (e, ok) => { avanzar(e, 22);
          if (ok) { hito(e, '🛡️', 'Reunió seis símbolos del Frente de Batalla');
            return efecto(L('Caes en las tres primeras y ganas las seis siguientes. Con seis símbolos en la vitrina eres, por primera vez en tu vida, favorito para algo.', 'Caes en las tres primeras y ganas las seis siguientes. Con seis símbolos en la vitrina eres, por primera vez en tu vida, favorito para algo.', 'Caes en las tres primeras y ganas las seis siguientes. Con seis símbolos en la vitrina eres, por primera vez en tu vida, favorito para algo.'),
              m(e, { media: [4, 8], estrategia: [10, 16], fama: [7, 12], moral: [10, 16] })); }
          return efecto(L('Dos años dando vueltas por la región para reunir tres símbolos de siete. Aprendes muchísimo y pierdes dos temporadas de circuito oficial que no vuelven.', 'Dos años dando vueltas por la región para reunir tres símbolos de siete. Aprendes muchísimo y pierdes dos temporadas de circuito oficial que no vuelven.', 'Dos años dando vueltas por la región para reunir tres símbolos de siete. Aprendes muchísimo y pierdes dos temporadas de circuito oficial que no vuelven.'),
            m(e, { estrategia: [9, 15], fama: [-5, -2], moral: [-4, -2] })); } },
      { txt: L('Compaginarlo con el circuito oficial', 'Compaginarlo con el circuito oficial', 'Compaginarlo con el circuito oficial'), sub: L('No vas a dejar la Liga por esto.', 'No vas a dejar la Liga por esto.', 'No vas a dejar la Liga por esto.'),
        efecto: e => { avanzar(e, 22);
          return efecto(L('Vas alternando torneos y instalaciones, durmiendo en trenes. Reúnes cuatro símbolos y mantienes el puesto en el ranking, a base de no descansar un solo mes en dos años.', 'Vas alternando torneos y instalaciones, durmiendo en trenes. Reúnes cuatro símbolos y mantienes el puesto en el ranking, a base de no descansar un solo mes en dos años.', 'Vas alternando torneos y instalaciones, durmiendo en trenes. Reúnes cuatro símbolos y mantienes el puesto en el ranking, a base de no descansar un solo mes en dos años.'),
            m(e, { media: [2, 5], estrategia: [6, 11], salud: [-6, -3], fama: [3, 7] })); } },
    ],
  },
  {
    id: 'ash_23_piramide', ...paso(23),
    titulo: L('La Pirámide de Batalla', 'La Pirámide de Batalla', 'La Pirámide de Batalla'),
    texto: e => L(`La última instalación del Frente es una pirámide que su dueño mueve por la región con un globo. Dentro combate un tipo con pinta de explorador que ha capturado él solo tres Pokémon legendarios y que no ha perdido nunca contra un aspirante. Llevas dos intentos y dos derrotas. ${socioDe(e)?.nombre ?? 'Tu compañero'}, el mismo del primer día, se pone delante sin que se lo pidas.`, `La última instalación del Frente es una pirámide que su dueño mueve por la región con un globo. Dentro combate un tipo con pinta de explorador que ha capturado él solo tres Pokémon legendarios y que no ha perdido nunca contra un aspirante. Llevas dos intentos y dos derrotas. ${socioDe(e)?.nombre ?? 'Tu compañero'}, el mismo del primer día, se pone delante sin que se lo pidas.`, `La última instalación del Frente es una pirámide que su dueño mueve por la región con un globo. Dentro combate un tipo con pinta de explorador que ha capturado él solo tres Pokémon legendarios y que no ha perdido nunca contra un aspirante. Llevas dos intentos y dos derrotas. ${socioDe(e)?.nombre ?? 'Tu compañero'}, el mismo del primer día, se pone delante sin que se lo pidas.`),
    opciones: [
      { txt: L('Tercer intento, tú y él', 'Tercer intento, tú y él', 'Tercer intento, tú y él'), sub: L('Como el primer día, veinte años después.', 'Como el primer día, veinte años después.', 'Como el primer día, veinte años después.'), riesgo: 0.5,
        efecto: (e, ok) => { avanzar(e, 23); e.flags.arcoAnimeHecho = true;
          const s = socioDe(e); if (s) s.vinculo = limitar(s.vinculo + rango(20, 30));
          if (ok) { e.titulos.push({ año: e.año, nombre: 'Símbolo Valiente del Frente de Batalla' }); e.ligasGanadas++;
            hito(e, '🏆', 'Ganó el Símbolo Valiente al último cerebro del Frente');
            return efecto(L('El combate dura cuarenta minutos y el estadio de piedra no respira. Cuando cae el legendario y el explorador te tiende el símbolo, no te sale ni una palabra. Veinte años después de llegar tarde al laboratorio en pijama, has ganado el título más difícil de la región.', 'El combate dura cuarenta minutos y el estadio de piedra no respira. Cuando cae el legendario y el explorador te tiende el símbolo, no te sale ni una palabra. Veinte años después de llegar tarde al laboratorio en pijama, has ganado el título más difícil de la región.', 'El combate dura cuarenta minutos y el estadio de piedra no respira. Cuando cae el legendario y el explorador te tiende el símbolo, no te sale ni una palabra. Veinte años después de llegar tarde al laboratorio en pijama, has ganado el título más difícil de la región.'),
              m(e, { fama: [22, 34], moral: [26, 38], media: [5, 10], vinculo: [12, 20] })); }
          hito(e, '🥈', 'Cayó tres veces contra el cerebro de la Pirámide');
          return efecto(L('Aguantáis hasta el último turno y cae de rodillas antes que de espaldas. Tercera derrota. El explorador te dice que vuelvas cuando quieras y tú sabes, por la forma en que te duele, que esta era la buena.', 'Aguantáis hasta el último turno y cae de rodillas antes que de espaldas. Tercera derrota. El explorador te dice que vuelvas cuando quieras y tú sabes, por la forma en que te duele, que esta era la buena.', 'Aguantáis hasta el último turno y cae de rodillas antes que de espaldas. Tercera derrota. El explorador te dice que vuelvas cuando quieras y tú sabes, por la forma en que te duele, que esta era la buena.'),
            m(e, { fama: [10, 17], moral: [-7, -3], estrategia: [9, 15], vinculo: [10, 17] })); } },
      { txt: L('Entrar con todo el equipo de tu carrera', 'Entrar con todo el equipo de tu carrera', 'Entrar con todo el equipo de tu carrera'), sub: L('Los seis, uno de cada año.', 'Los seis, uno de cada año.', 'Los seis, uno de cada año.'), riesgo: 0.35,
        efecto: (e, ok) => { avanzar(e, 23); e.flags.arcoAnimeHecho = true;
          if (ok) { e.titulos.push({ año: e.año, nombre: 'Símbolo Valiente del Frente de Batalla' }); e.ligasGanadas++;
            hito(e, '🏆', 'Ganó el Símbolo Valiente con el equipo de toda su carrera');
            return efecto(L('Sacas a los seis, uno por cada etapa de tu vida, y cada uno le arranca un trozo al explorador. Ganas el Símbolo Valiente con el mejor combate que ha visto esa pirámide y con seis Pokémon reventados en el suelo, celebrándolo.', 'Sacas a los seis, uno por cada etapa de tu vida, y cada uno le arranca un trozo al explorador. Ganas el Símbolo Valiente con el mejor combate que ha visto esa pirámide y con seis Pokémon reventados en el suelo, celebrándolo.', 'Sacas a los seis, uno por cada etapa de tu vida, y cada uno le arranca un trozo al explorador. Ganas el Símbolo Valiente con el mejor combate que ha visto esa pirámide y con seis Pokémon reventados en el suelo, celebrándolo.'),
              m(e, { fama: [20, 32], moral: [24, 36], media: [4, 9], vinculo: [14, 22] })); }
          return efecto(L('Le plantas cara con todo y aun así se lleva el último combate. Pierdes por un margen mínimo y te vas de la pirámide sabiendo que ese día no te faltó equipo: te faltó un turno.', 'Le plantas cara con todo y aun así se lleva el último combate. Pierdes por un margen mínimo y te vas de la pirámide sabiendo que ese día no te faltó equipo: te faltó un turno.', 'Le plantas cara con todo y aun así se lleva el último combate. Pierdes por un margen mínimo y te vas de la pirámide sabiendo que ese día no te faltó equipo: te faltó un turno.'),
            m(e, { fama: [9, 15], moral: [-6, -3], estrategia: [8, 13] })); } },
    ],
  },
  {
    id: 'ash_24_epilogo', ...paso(24),
    titulo: L('Y ahora qué', 'Y ahora qué', 'Y ahora qué'),
    texto: () => L('Se acabó el guion. Has recorrido la región entera cuatro veces, dejado Pokémon en media docena de sitios y llegado al último combate que te quedaba por jugar. Tienes treinta y tantos, el cuerpo regular y una pregunta que llevas evitando desde los diez años: qué es exactamente ser un maestro Pokémon.', 'Se acabó el guion. Has recorrido la región entera cuatro veces, dejado Pokémon en media docena de sitios y llegado al último combate que te quedaba por jugar. Tienes treinta y tantos, el cuerpo regular y una pregunta que llevas evitando desde los diez años: qué es exactamente ser un maestro Pokémon.', 'Se acabó el guion. Has recorrido la región entera cuatro veces, dejado Pokémon en media docena de sitios y llegado al último combate que te quedaba por jugar. Tienes treinta y tantos, el cuerpo regular y una pregunta que llevas evitando desde los diez años: qué es exactamente ser un maestro Pokémon.'),
    opciones: [
      { txt: L('Coger la mochila otra vez', 'Coger la mochila otra vez', 'Coger la mochila otra vez'), sub: L('Todavía queda región por ver.', 'Todavía queda región por ver.', 'Todavía queda región por ver.'),
        efecto: e => { avanzar(e, 24);
          hito(e, '🎒', 'Volvió a coger la mochila cuando ya no le hacía falta');
          return efecto(L('Coges la mochila otra vez, sin equipo de trabajo, sin patrocinadores y sin calendario. Compites cuando te apetece y desapareces del ranking sin que te importe lo más mínimo.', 'Coges la mochila otra vez, sin equipo de trabajo, sin patrocinadores y sin calendario. Compites cuando te apetece y desapareces del ranking sin que te importe lo más mínimo.', 'Coges la mochila otra vez, sin equipo de trabajo, sin patrocinadores y sin calendario. Compites cuando te apetece y desapareces del ranking sin que te importe lo más mínimo.'),
            m(e, { moral: [14, 22], salud: [5, 10], fama: [-6, -2], media: [-2, -1] })); } },
      { txt: L('Volver a Pueblo Paleta', 'Volver a Pueblo Paleta', 'Volver a Pueblo Paleta'), sub: L('A entrenar a los que vienen.', 'A entrenar a los que vienen.', 'A entrenar a los que vienen.'),
        efecto: e => { avanzar(e, 24); e.flags.discipulo = true;
          hito(e, '🌱', 'Volvió al pueblo a formar a los que venían detrás');
          return efecto(L('Vuelves a la casa de tu madre, que sigue exactamente igual, y montas un campo de entrenamiento para críos del valle. El primero que sale de ahí gana su Liga seis años después y dice tu nombre en la entrevista.', 'Vuelves a la casa de tu madre, que sigue exactamente igual, y montas un campo de entrenamiento para críos del valle. El primero que sale de ahí gana su Liga seis años después y dice tu nombre en la entrevista.', 'Vuelves a la casa de tu madre, que sigue exactamente igual, y montas un campo de entrenamiento para críos del valle. El primero que sale de ahí gana su Liga seis años después y dice tu nombre en la entrevista.'),
            m(e, { moral: [12, 20], fama: [4, 9], estrategia: [8, 14], vinculo: [7, 12] })); } },
    ],
  },
];

// El arco vive en el mismo catálogo: sus `cond` lo mantienen invisible salvo
// que estés jugando la partida de Satoshi.
const esDelArco = ev => ev.id.startsWith('ash_');
EVENTOS.push(...ARCO_ANIME);
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

  // Si hay un paso de historia esperando (el arco del anime), va primero: una
  // rama argumental no puede depender de una tirada de pesos. Y en la partida
  // de Satoshi el arco es lo único que pasa: nada de eventos de carrera normal
  // mientras quede guion por contar.
  const guion = pool.filter(ev => ev.prioritario);
  if (guion.length) pool = estado.flags.esAsh ? guion.filter(esDelArco) : guion;
  if (!pool.length) return null;

  const total = pool.reduce((s, ev) => s + ev.peso, 0);
  let r = Math.random() * total;
  let elegido = pool[pool.length - 1];
  for (const ev of pool) { r -= ev.peso; if (r <= 0) { elegido = ev; break; } }
  // Se fija aquí lo que el evento sortee (un líder, un rival...), UNA sola vez.
  // Si no, `titulo` y `texto` tirarían el dado por separado y se contradirían.
  elegido.preparar?.(estado);
  estado.vistos.add(elegido.id);
  estado.ultimoEvento = elegido.id;
  return elegido;
}
