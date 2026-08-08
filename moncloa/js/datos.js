// Datos del mundo: partidos, ejes ideológicos, leyes, medios y textos de sabor.
// Todo estático: el juego no depende de ninguna API para funcionar.
//
// SÁTIRA. Los partidos y las figuras públicas que aparecen lo hacen por su
// papel político y mediático, con situaciones inventadas. Nada de lo que se
// cuenta aquí ha pasado, y no se atribuye a nadie ningún hecho delictivo.

// ── Ejes ideológicos ─────────────────────────────────────────────────────────
// Tres ejes, cada uno de -100 a +100. Son los que dan coherencia al juego:
// un partido y una ley son "afines" si apuntan hacia el mismo sitio.
//   eco: -100 intervención y reparto  ↔  +100 mercado y bajada de impuestos
//   soc: -100 progresista/libertario  ↔  +100 conservador/autoridad
//   ter: -100 plurinacional/federal   ↔  +100 centralista/unidad
export const EJES = ['eco', 'soc', 'ter'];

export const NOMBRE_EJE = {
  eco: ['Reparto', 'Mercado'],
  soc: ['Progresista', 'Conservador'],
  ter: ['Plurinacional', 'Centralista'],
};

// ── Los cinco partidos ───────────────────────────────────────────────────────
// `apoyo` es la intención de voto de partida (en %). `color` pinta la web
// entera: si te vas a otro partido, el fondo cambia contigo.
export const PARTIDOS = [
  {
    id: 'podemos', nombre: 'Podemos', corto: 'Podemos', emoji: '🟣',
    color: '#6b2c73', color2: '#3d1743', claro: '#a768b0',
    eje: { eco: -88, soc: -78, ter: -55 },
    apoyo: 4.5, techo: 12,
    lema: 'Ni un paso atrás',
    sabor: 'La izquierda que no negocia el marco. Mucho plató, mucha calle y una relación complicada con todo el mundo, empezando por los suyos.',
    electorado: 'Joven, urbano, de alquiler y con el móvil en la mano. Te perdona una derrota, no una foto con un banquero.',
    bonus: { carisma: 6, mediatico: 8, aparato: -6, credibilidad: 4 },
  },
  {
    id: 'sumar', nombre: 'Sumar', corto: 'Sumar', emoji: '🩷',
    color: '#c81d74', color2: '#7a0f46', claro: '#e276ae',
    eje: { eco: -66, soc: -70, ter: -42 },
    apoyo: 6.5, techo: 16,
    lema: 'Hacerlo posible',
    sabor: 'La izquierda de gobierno: leyes laborales, ruedas de prensa serenas y quince siglas dentro de la misma coalición discutiendo el orden de la lista.',
    electorado: 'Funcionariado, sindicatos y clase media progresista. Valora que las cosas se aprueben; no soporta el ruido interno.',
    bonus: { gestion: 8, credibilidad: 6, mediatico: -3, aparato: 2 },
  },
  {
    id: 'psoe', nombre: 'PSOE', corto: 'PSOE', emoji: '🌹',
    color: '#d3121a', color2: '#7d0a10', claro: '#ef6a70',
    eje: { eco: -32, soc: -42, ter: 2 },
    apoyo: 27, techo: 40,
    lema: 'Ciento cuarenta y tantos años de maquinaria',
    sabor: 'El aparato. Barones territoriales, Ferraz, un congreso federal cada cuatro años y la costumbre de aguantar en pie cuando todo apunta a que no.',
    electorado: 'Transversal y mayor: pensiones, sanidad y estabilidad. Te aguanta casi todo menos parecer que no sabes gobernar.',
    bonus: { aparato: 10, gestion: 5, credibilidad: -2 },
  },
  {
    id: 'pp', nombre: 'PP', corto: 'PP', emoji: '🔵',
    color: '#0a5eb0', color2: '#053563', claro: '#6ba6de',
    eje: { eco: 58, soc: 36, ter: 62 },
    apoyo: 32, techo: 45,
    lema: 'Gestión, sentido común y una bajada de impuestos',
    sabor: 'Génova, los barones autonómicos y la eterna discusión sobre cuánto hay que parecerse a Vox para ganar sin dejar de ser el centro.',
    electorado: 'Propietario, mayor y de provincia grande. Premia bajar impuestos y castiga cualquier cosa que suene a lío.',
    bonus: { aparato: 8, gestion: 6, carisma: -2, credibilidad: 2 },
  },
  {
    id: 'vox', nombre: 'Vox', corto: 'Vox', emoji: '🟢',
    color: '#4a8f1e', color2: '#274c0f', claro: '#8fc963',
    eje: { eco: 62, soc: 86, ter: 94 },
    apoyo: 15, techo: 28,
    lema: 'España, lo demás son gaitas',
    sabor: 'Nació para romper el tablero y ahora decide gobiernos autonómicos. Poco Congreso, mucho clip vertical y una relación excelente con el algoritmo.',
    electorado: 'Joven, masculino y muy conectado. No te perdona pactar con nadie, pero te aplaude cada corte de doce segundos.',
    bonus: { mediatico: 10, carisma: 4, gestion: -5, aparato: -2 },
  },
];

export const PORPARTIDO = Object.fromEntries(PARTIDOS.map(p => [p.id, p]));

// Plantilla del partido que puedes fundarte tú si te hartas de todos ellos
export const PARTIDO_PROPIO = {
  id: 'propio', emoji: '⚪', color: '#2f6f6b', color2: '#153331', claro: '#79b5b0',
  apoyo: 2, techo: 20,
  lema: 'Esta vez de verdad',
  sabor: 'Tu propio partido. Tu cara en el logo, tu nombre en la papeleta y toda la culpa para ti.',
  electorado: 'Gente que te votaba a ti y no al partido. Son menos de los que creías, pero son tuyos.',
};

// ── Perfiles de político (el "estilo") ───────────────────────────────────────
export const PERFILES = [
  { id: 'aparato', nombre: 'De aparato', emoji: '🗂️',
    desc: 'Te conoces los estatutos. Las listas las haces tú.',
    bonus: { aparato: 14, mediatico: -5, disciplinaExtra: true } },
  { id: 'mediatico', nombre: 'Animal de plató', emoji: '📺',
    desc: 'Un minuto de tele vale por mil afiliados.',
    bonus: { mediatico: 15, carisma: 5, credibilidad: -6 } },
  { id: 'gestor', nombre: 'Gestor técnico', emoji: '📊',
    desc: 'Traes el Excel hecho. Nadie te aplaude, pero funciona.',
    bonus: { gestion: 15, credibilidad: 6, carisma: -7 } },
  { id: 'calle', nombre: 'De calle y barrio', emoji: '📣',
    desc: 'Empezaste repartiendo octavillas en la puerta del metro.',
    bonus: { carisma: 12, moral: 6, gestion: -5 } },
  { id: 'agitador', nombre: 'Agitador de redes', emoji: '📱',
    desc: 'Tuiteas antes de pensar y funciona demasiado bien.',
    bonus: { mediatico: 12, carisma: 8, credibilidad: -10, aguante: 4 } },
  { id: 'jurista', nombre: 'Jurista de partido', emoji: '⚖️',
    desc: 'Lees el BOE por gusto y encuentras el resquicio.',
    bonus: { gestion: 9, credibilidad: 9, mediatico: -6 } },
];

export const RITMOS = [
  { id: 'intensa', nombre: 'Legislatura', desc: 'Una decisión cada año. La carrera entera, sin saltarte un pleno.', cada: 1 },
  { id: 'normal', nombre: 'Normal', desc: 'Una decisión cada dos años. El equilibrio.', cada: 2 },
  { id: 'expres', nombre: 'Exprés', desc: 'Una decisión cada tres años. Cuarenta años de carrera en dos minutos.', cada: 3 },
];

// ── Leyes ────────────────────────────────────────────────────────────────────
// `eje` es hacia dónde empuja la ley. `popular` (-1 a 1) es lo que la quiere el
// votante medio al margen de ideología: hay leyes coherentes que dan votos y
// leyes coherentes que te los quitan. Ahí está la gracia.
export const LEYES = [
  {
    id: 'vivienda_topes', emoji: '🏘️', nombre: 'Ley de Vivienda: topar los alquileres',
    eje: { eco: -82, soc: -20, ter: -12 }, popular: 0.55, coste: 'alto',
    texto: 'Va a pleno la declaración de zona tensionada para 300 municipios: topes al alquiler, contratos de temporada bajo control y el gran tenedor definido a partir de cinco pisos. Los caseros llenan la calle Génova de llamadas y los sindicatos de inquilinos llenan la plaza.',
  },
  {
    id: 'vivienda_okupas', emoji: '🚪', nombre: 'Desahucio exprés por ocupación',
    eje: { eco: 52, soc: 68, ter: 22 }, popular: 0.5, coste: 'medio',
    texto: 'Tramitación urgente para desalojar en 48 horas. Los platós llevan tres semanas con el rótulo rojo de "okupas" y las asociaciones de vivienda avisan de que la letra pequeña se lleva por delante a familias con hijos.',
  },
  {
    id: 'turisticos', emoji: '🧳', nombre: 'Límite a los pisos turísticos',
    eje: { eco: -58, soc: -8, ter: -28 }, popular: 0.62, coste: 'medio',
    texto: 'Registro único, licencias congeladas y multas a las plataformas. Los vecinos de los centros históricos aplauden; el sector turístico calcula en voz alta cuántos empleos se pierden y a qué provincias.',
  },
  {
    id: 'fronteras', emoji: '🛟', nombre: 'Reparto obligatorio de menores migrantes',
    eje: { eco: -18, soc: -76, ter: -32 }, popular: -0.18, coste: 'alto',
    texto: 'Canarias está desbordada y el reparto entre comunidades pasa a ser obligatorio. Cuatro presidentes autonómicos anuncian recurso el mismo día. En las encuestas, el asunto no da un solo voto a nadie.',
  },
  {
    id: 'extranjeria', emoji: '🛂', nombre: 'Endurecer la Ley de Extranjería',
    eje: { eco: 18, soc: 84, ter: 62 }, popular: 0.22, coste: 'medio',
    texto: 'Expulsiones exprés, más CIE y visados por puntos. Media bancada habla de soberanía y la otra media de derechos humanos, y las dos saben perfectamente en qué provincias se juega esto.',
  },
  {
    id: 'fiscal_ricos', emoji: '💸', nombre: 'Impuesto a las grandes fortunas',
    eje: { eco: -86, soc: -12, ter: 4 }, popular: 0.52, coste: 'alto',
    texto: 'Un punto más para patrimonios por encima de tres millones, con recaudación finalista a sanidad. Tres comunidades anuncian que lo bonifican al día siguiente y los despachos de asesores fiscales hacen su agosto.',
  },
  {
    id: 'fiscal_irpf', emoji: '🧾', nombre: 'Bajada del IRPF y de Sucesiones',
    eje: { eco: 82, soc: 22, ter: 18 }, popular: 0.48, coste: 'medio',
    texto: 'Deflactar la tarifa y suprimir Sucesiones entre padres e hijos. La AIReF avisa del agujero, pero la palabra "bajada de impuestos" lleva ganando debates desde 1996.',
  },
  {
    id: 'jornada', emoji: '⏱️', nombre: 'Jornada laboral de 37,5 horas',
    eje: { eco: -72, soc: -26, ter: 0 }, popular: 0.56, coste: 'alto',
    texto: 'Reducción por ley sin tocar el salario, con registro horario digital. La patronal se levanta de la mesa en directo y la hostelería saca a los medios a la calle para explicar por qué es imposible.',
  },
  {
    id: 'smi', emoji: '📈', nombre: 'Subida del SMI por encima del IPC',
    eje: { eco: -76, soc: -10, ter: 0 }, popular: 0.5, coste: 'bajo',
    texto: 'Los técnicos del Ministerio piden prudencia, el comité de expertos se parte en dos y tú tienes que decidir si el titular de mañana es "histórico" o "irresponsable".',
  },
  {
    id: 'financiacion', emoji: '🗺️', nombre: 'Financiación singular y quita de deuda',
    eje: { eco: -22, soc: -18, ter: -92 }, popular: -0.38, coste: 'alto',
    texto: 'La reforma del sistema de financiación con encaje a medida para una comunidad y quita de deuda para todas. Los barones de tu propio partido convocan rueda de prensa antes que la oposición.',
  },
  {
    id: 'lenguas', emoji: '🎧', nombre: 'Lenguas cooficiales en el Congreso',
    eje: { eco: 0, soc: -34, ter: -86 }, popular: -0.22, coste: 'bajo',
    texto: 'Pinganillos para todos, traductores contratados y una factura que la oposición redondea al alza cada martes. La imagen del hemiciclo con los auriculares puestos da la vuelta a España en catorce segundos.',
  },
  {
    id: 'defensa', emoji: '🪖', nombre: 'Subir el gasto en Defensa al 3,5% del PIB',
    eje: { eco: 32, soc: 62, ter: 72 }, popular: -0.28, coste: 'alto',
    texto: 'Bruselas aprieta, la OTAN pone fecha y en tu grupo parlamentario hay diputados que llevan veinte años haciéndose la foto contra esto mismo.',
  },
  {
    id: 'renfe', emoji: '🚆', nombre: 'Plan de choque de Cercanías: 6.000 millones',
    eje: { eco: -62, soc: -6, ter: -18 }, popular: 0.82, coste: 'alto',
    texto: 'Renovar catenaria, señalización y trenes en Madrid, Barcelona, Valencia, Sevilla y Asturias. Nadie en España está en contra de que los trenes lleguen a su hora; el problema es que el plan se paga con seis mil millones y se ve en 2032.',
  },
  {
    id: 'nuclear', emoji: '☢️', nombre: 'Prorrogar las centrales nucleares',
    eje: { eco: 58, soc: 34, ter: 26 }, popular: 0.18, coste: 'medio',
    texto: 'Alargar diez años el calendario de cierre. Las eléctricas dicen que solo si les compensan, los ecologistas montan la acampada y en tu grupo hay gente que se afilió precisamente por esto.',
  },
  {
    id: 'memoria', emoji: '🕯️', nombre: 'Ampliar la Ley de Memoria Democrática',
    eje: { eco: -14, soc: -80, ter: -26 }, popular: -0.05, coste: 'medio',
    texto: 'Nuevas exhumaciones, retirada de símbolos y un censo de víctimas. Una parte del hemiciclo lo llama justicia y la otra reabrir heridas, y las dos llevan la frase escrita desde antes de leer el texto.',
  },
  {
    id: 'toros', emoji: '🐂', nombre: 'Blindar la tauromaquia como patrimonio',
    eje: { eco: 12, soc: 74, ter: 56 }, popular: -0.08, coste: 'bajo',
    texto: 'Protección estatal, ayudas a las escuelas taurinas y premio nacional recuperado. En tu bancada hay quien se juega el escaño de una provincia entera con esto y quien se juega el barrio.',
  },
  {
    id: 'menores_redes', emoji: '📵', nombre: 'Prohibir las redes a menores de 16',
    eje: { eco: -8, soc: 44, ter: 12 }, popular: 0.72, coste: 'bajo',
    texto: 'Verificación de edad obligatoria y multas a las plataformas. Es de las pocas cosas que aplauden a la vez las AMPAs, los obispos y los pediatras; los ingenieros dicen que técnicamente es un disparate.',
  },
];

export const PORLEY = Object.fromEntries(LEYES.map(l => [l.id, l]));

// ── Medios, programas y platós ───────────────────────────────────────────────
export const PROGRAMAS = [
  { id: 'hormiguero', nombre: 'El Hormiguero', presenta: 'Pablo Motos', tono: 'entretenimiento con pregunta trampa al final' },
  { id: 'revuelta', nombre: 'La Revuelta', presenta: 'David Broncano', tono: 'dinero y vida privada en el minuto tres' },
  { id: 'matinal', nombre: 'la matinal de Telecinco', presenta: 'la mesa de tertulianos', tono: 'cuatro contra uno a las diez de la mañana' },
  { id: 'lasexta', nombre: 'la tertulia de La Sexta', presenta: 'el plató de la noche', tono: 'gráficos, encuestas y grito' },
  { id: 'podcast', nombre: 'un pódcast de tres horas', presenta: 'dos tíos con micros buenos', tono: 'te dejan hablar y ahí está el peligro' },
  { id: 'twitch', nombre: 'un directo de Twitch', presenta: 'un streamer con 40.000 espectadores', tono: 'chat a la izquierda, sin red' },
];

// Compañeros de partido que te harán la vida imposible desde dentro.
// Son personajes inventados: la guerra interna del juego no va de nadie real.
export const RIVALES_INTERNOS = [
  'Marisol Bregante', 'Íñigo Palomar', 'Rocío Sandoval', 'Fernando Vilches',
  'Almudena Cifré', 'Javier Roldán-Prats', 'Nuria Escámez', 'Toni Berlanga',
  'Elena Ostáriz', 'Ricardo Mainer', 'Susana Quiroga', 'Adrián Ferreiro',
];

// Motes de prensa. Algunos solo tienen sentido si te los has ganado: no se
// puede ser "el Tránsfuga Feliz" sin haberte cambiado de partido nunca.
export const APODOS_PRENSA = [
  { txt: 'el Fontanero' },
  { txt: 'la Apisonadora' },
  { txt: 'el Superviviente' },
  { txt: 'el Último Ideólogo' },
  { txt: 'el Barón' },
  { txt: 'la Máquina de Titulares' },
  { txt: 'el Hombre del Excel', cond: e => e.stats.gestion >= 60 },
  { txt: 'el Tránsfuga Feliz', cond: e => e.transfuguismos >= 1 },
  { txt: 'el Mercenario', cond: e => e.transfuguismos >= 2 },
  { txt: 'el Animal Televisivo', cond: e => e.stats.mediatico >= 60 },
  { txt: 'la Reina del Corte de Doce Segundos', cond: e => e.stats.mediatico >= 70 },
  { txt: 'el de la Foto del Cercanías', cond: e => !!e.flags.cercanias },
  { txt: 'el del Falcon', cond: e => !!e.flags.falcon },
  { txt: 'el que no se vendió', cond: e => e.transfuguismos === 0 && e.stats.credibilidad >= 65 },
  { txt: 'el Aparato', cond: e => e.stats.aparato >= 70 },
];

export const COMUNIDADES = [
  'Andalucía', 'Aragón', 'Asturias', 'Baleares', 'Canarias', 'Cantabria',
  'Castilla-La Mancha', 'Castilla y León', 'Cataluña', 'Extremadura', 'Galicia',
  'Madrid', 'Murcia', 'Navarra', 'La Rioja', 'Comunidad Valenciana', 'País Vasco',
];

export const MINISTERIOS = [
  { nombre: 'Transportes', emoji: '🚆', marron: true, sabor: 'El ministerio donde se muere políticamente. Cada avería de Cercanías lleva tu cara.' },
  { nombre: 'Hacienda', emoji: '🧾', marron: true, sabor: 'Todo el mundo te odia por definición. También todo el mundo te necesita.' },
  { nombre: 'Vivienda', emoji: '🏘️', marron: true, sabor: 'El problema número uno del país y las competencias las tienen otros.' },
  { nombre: 'Trabajo', emoji: '⏱️', marron: false, sabor: 'Se sale bien de aquí si sabes cerrar una mesa con patronal y sindicatos.' },
  { nombre: 'Interior', emoji: '🚔', marron: true, sabor: 'Duermes con el teléfono encendido para siempre.' },
  { nombre: 'Cultura', emoji: '🎭', marron: false, sabor: 'Presupuesto pequeño, fotos preciosas, cero titulares malos.' },
  { nombre: 'Sanidad', emoji: '🩺', marron: false, sabor: 'Competencias transferidas: mucha rueda de prensa, poco mando.' },
  { nombre: 'Economía', emoji: '📊', marron: false, sabor: 'Bruselas te escucha y los platós no te entienden. Buen sitio.' },
  { nombre: 'Educación', emoji: '📚', marron: false, sabor: 'Una reforma cada cuatro años y ningún ministro se libra de su ley.' },
  { nombre: 'Agricultura', emoji: '🚜', marron: true, sabor: 'Un día tienes tractores en la Castellana y no los ha convocado nadie.' },
];

// ── Cargos por etapa ─────────────────────────────────────────────────────────
export const CARGOS = {
  base: 'Militante de base',
  local: 'Concejalía',
  autonomica: 'Diputado autonómico',
  congreso: 'Escaño en el Congreso',
  direccion: 'Dirección del partido',
  liderazgo: 'Liderazgo nacional',
  moncloa: 'Candidatura a Moncloa',
};

// ── Logros ───────────────────────────────────────────────────────────────────
export const LOGROS = [
  { id: 'presidente', emoji: '🏛️', nombre: 'Presidente del Gobierno', desc: e => `${e.presidencias} investidura${e.presidencias > 1 ? 's' : ''} ganada${e.presidencias > 1 ? 's' : ''}. Dormiste en La Moncloa.`, cond: e => e.presidencias >= 1 },
  { id: 'ministro', emoji: '🎖️', nombre: 'Consejo de Ministros', desc: e => `Fuiste ministro de ${e.ministerios.join(', ')}.`, cond: e => e.ministerios.length >= 1 },
  { id: 'lider', emoji: '👑', nombre: 'Líder del partido', desc: () => 'Ganaste unas primarias y te quedaste con el aparato.', cond: e => !!e.flags.liderPartido },
  { id: 'legislador', emoji: '📜', nombre: 'Legislador', desc: e => `Votaste ${e.leyes.length} leyes en el Congreso.`, cond: e => e.leyes.length >= 6 },
  { id: 'coherente', emoji: '🧭', nombre: 'Coherente hasta el final', desc: e => `${e.votosCoherentes} votos con tu programa y ninguno en contra. Raro y caro.`, cond: e => e.votosCoherentes >= 4 && e.votosIncoherentes === 0 },
  { id: 'abstencion', emoji: '🙈', nombre: 'Maestro de la abstención', desc: e => `${e.leyes.filter(l => l.sentido === 'abstencion').length} abstenciones. Ni sí ni no, sino todo lo contrario.`, cond: e => e.leyes.filter(l => l.sentido === 'abstencion').length >= 4 },
  { id: 'veleta', emoji: '🌀', nombre: 'La veleta', desc: e => `${e.votosIncoherentes} votos contra tu propio electorado. El acta es el acta.`, cond: e => e.votosIncoherentes >= 4 },
  { id: 'transfuga', emoji: '🔀', nombre: 'El tránsfuga', desc: e => `Cambiaste de partido ${e.transfuguismos} ${e.transfuguismos > 1 ? 'veces' : 'vez'}. El escaño se lo quedó usted.`, cond: e => e.transfuguismos >= 1 },
  { id: 'mercenario', emoji: '💼', nombre: 'Mercenario profesional', desc: e => `Tres partidos o más. Se te reconoce por el maletín, no por el color.`, cond: e => e.transfuguismos >= 2 },
  { id: 'fiel', emoji: '🪪', nombre: 'Carné de toda la vida', desc: e => `${e.año} años en ${e.partidoNombre} sin mirar a nadie.`, cond: e => e.transfuguismos === 0 && e.año >= 20 },
  { id: 'propio', emoji: '🚩', nombre: 'Fundador', desc: () => 'Te montaste tu propio partido. Con tu cara en la papeleta.', cond: e => !!e.flags.partidoPropio },
  { id: 'hormiguero', emoji: '🐜', nombre: 'Silla de El Hormiguero', desc: () => 'Te sentaste con Pablo Motos y saliste vivo. Casi.', cond: e => !!e.flags.hormiguero },
  { id: 'viral', emoji: '📱', nombre: 'Corte de doce segundos', desc: () => 'Un vídeo tuyo pasó de los diez millones. Para bien o para mal.', cond: e => !!e.flags.viral },
  { id: 'renfe', emoji: '🚉', nombre: 'El del Cercanías', desc: () => 'Te hiciste la foto en el andén a las siete de la mañana. Y volviste al día siguiente.', cond: e => !!e.flags.cercanias },
  { id: 'renfeplan', emoji: '🚆', nombre: 'Que lleguen a su hora', desc: () => 'Sacaste adelante el plan de Cercanías. Se verá en 2032, pero lo sacaste.', cond: e => e.leyes.some(l => l.id === 'renfe' && l.sentido === 'favor' && l.aprobada) },
  { id: 'falcon', emoji: '✈️', nombre: 'Volar en Falcon', desc: () => 'Criticaste el Falcon durante años y acabaste subiéndote. Como todos.', cond: e => !!e.flags.falcon },
  { id: 'vivienda', emoji: '🏘️', nombre: 'Alguien tocó la vivienda', desc: () => 'Votaste la ley de vivienda y salió adelante.', cond: e => e.leyes.some(l => l.id.startsWith('vivienda') && l.aprobada && l.sentido === 'favor') },
  { id: 'mayoria', emoji: '🟦', nombre: 'Mayoría absoluta', desc: () => 'Ciento setenta y seis. Sin llamar a nadie.', cond: e => !!e.flags.mayoriaAbsoluta },
  { id: 'oposicion', emoji: '🪑', nombre: 'Jefe de la oposición', desc: () => 'Perdiste unas elecciones desde el sillón de enfrente y aguantaste.', cond: e => !!e.flags.jefeOposicion },
  { id: 'mocion', emoji: '⚖️', nombre: 'Superviviente de una moción', desc: () => 'Te presentaron una moción de censura y seguiste ahí.', cond: e => !!e.flags.sobrevivioMocion },
  { id: 'idolo', emoji: '📣', nombre: 'Fenómeno mediático', desc: e => `Mediático ${Math.round(e.stats.mediatico)}. Te reconocen en el AVE y en el bar.`, cond: e => e.stats.mediatico >= 85 },
  { id: 'creible', emoji: '🕊️', nombre: 'Se le creía', desc: () => 'Credibilidad por encima de 85 al retirarte. En esto, es casi un milagro.', cond: e => e.stats.credibilidad >= 85 },
  { id: 'rico', emoji: '💰', nombre: 'Patrimonio declarado', desc: e => `Te retiras con ${Math.round(e.dinero / 1000)}k € declarados. Todo legal, todo publicado.`, cond: e => e.dinero >= 700000 },
  { id: 'puertas', emoji: '🔄', nombre: 'Puertas giratorias', desc: () => 'Consejo de administración de una eléctrica. Dos reuniones al mes.', cond: e => e.causaRetiro === 'puertas' },
  { id: 'digno', emoji: '🎬', nombre: 'Se fue solo', desc: () => 'Anunciaste que lo dejabas sin que nadie te empujara.', cond: e => e.causaRetiro === 'eleccion' },
  { id: 'eterno', emoji: '⏳', nombre: 'Escaño vitalicio', desc: e => `Aguantaste hasta los ${e.edad} en política activa.`, cond: e => e.edad >= 70 },
  { id: 'aparato', emoji: '🗂️', nombre: 'Dueño del aparato', desc: () => 'Aparato por encima de 88: las listas las hacías tú.', cond: e => e.stats.aparato >= 88 },
  { id: 'rival', emoji: '🥊', nombre: 'Guerra interna ganada', desc: e => `Le ganaste ${e.rival.derrotasTuyas}-${e.rival.victoriasSuyas} a ${e.rival.nombre}, de tu propio partido.`, cond: e => e.rival.derrotasTuyas >= 3 && e.rival.derrotasTuyas > e.rival.victoriasSuyas },
  { id: 'todos', emoji: '🌈', nombre: 'Todo el arco', desc: () => 'Militaste en partidos de los dos bloques. Un clásico español.', cond: e => e.partidosPasados.length >= 2 && new Set(e.partidosPasados.map(p => ['podemos', 'sumar', 'psoe'].includes(p) ? 'i' : 'd')).size >= 2 },
  { id: 'humilde', emoji: '🚌', nombre: 'Nunca cogió el coche oficial', desc: () => 'Cero fotos en Falcon, cero coche oficial para asuntos personales.', cond: e => !e.flags.falcon && !e.flags.cocheOficial && e.año >= 12 },
];

// ── Rangos finales ───────────────────────────────────────────────────────────
// Además de los puntos, cada rango puede pedir un requisito real: no se es
// "Ministro de peso" por acumular puntuación, se es por haber tenido cartera.
// Se evalúan en orden y se coge el primero que cumples entero.
export const RANGOS = [
  // El título es el cargo más alto que ocupaste de verdad; la puntuación solo
  // decide el honor de arriba del todo y desempata entre los escalones bajos.
  { min: 1750, minMedia: 88, cond: e => e.presidencias >= 2, titulo: 'Nombre de calle', emoji: '🏛️', desc: 'Presidiste el país más de una vez y te fuiste a tiempo. Habrá una avenida con tu nombre y un documental cada aniversario.' },
  { min: 0, cond: e => e.presidencias >= 1, titulo: 'Presidente del Gobierno', emoji: '👑', desc: 'Llegaste a Moncloa. Lo que hicieras allí ya es discusión de tertulia para los próximos treinta años.' },
  { min: 0, cond: e => !!e.flags.jefeOposicion, titulo: 'Líder de la oposición', emoji: '🪑', desc: 'Te quedaste a un puñado de escaños. En España, eso es media vida esperando en el andén de enfrente.' },
  { min: 0, cond: e => e.ministerios.length >= 1, titulo: 'Ministro de peso', emoji: '🎖️', desc: 'Tuviste cartera, presupuesto y firma en el BOE. No es Moncloa, pero se firmaba de verdad.' },
  { min: 650, minMedia: 66, titulo: 'Portavoz parlamentario', emoji: '📣', desc: 'La voz del grupo. Salías en todos los cortes y no decidías casi nada.' },
  { min: 500, minMedia: 55, titulo: 'Diputado con escaño fijo', emoji: '🪧', desc: 'Cinco legislaturas en la fila cuarta. Votaste lo que tocaba y volviste a casa en Cercanías.' },
  { min: 360, titulo: 'Tertuliano de plató', emoji: '📺', desc: 'La política te expulsó y la tele te acogió. Cobras por opinar de lo que antes decidías.' },
  { min: 230, titulo: 'Concejal de Festejos', emoji: '🎪', desc: 'Pregón, feria y una rotonda inaugurada. Tu pueblo te quiere y ahí se acaba el mapa.' },
  { min: -9999, titulo: 'Se quedó en el andén', emoji: '🚉', desc: 'Tu tren venía con retraso indefinido. Ni Renfe supo decirte cuánto. Al menos lo intentaste.' },
];

// ── Sucesos de relleno de temporada ──────────────────────────────────────────
// Ruido de fondo del año político: no cambian nada, dan color.
export const RUIDO = [
  'Una avería en Atocha deja tirados a 12.000 viajeros. Todo el mundo pide tu opinión.',
  'Renfe anuncia que los nuevos trenes llegan con dos años de retraso. Nadie se sorprende.',
  'La palabra del año en tu grupo de WhatsApp del partido es "prudencia".',
  'El CIS te da mejor de lo que dice la calle. La oposición hace un chiste con eso.',
  'Un tuit tuyo de hace once años vuelve a circular. Sigue envejeciendo mal.',
  'Un vídeo tuyo bostezando en el pleno pasa de los dos millones de reproducciones.',
  'Alguien deja un micrófono abierto en el hemiciclo. Esta vez no eras tú.',
  'El AVE llega puntual y lo cuentas en X como si fuera obra tuya.',
  'Te confunden en un plató con otro diputado de tu propio grupo.',
  'Una encuesta de un medio afín te sitúa como "político mejor valorado". Tu madre la comparte.',
  'Cercanías corta la línea C-4 tres semanas por obras. Tú vives en la C-4.',
  'Un becario del partido tuitea desde tu cuenta y lo borra en 40 segundos. Ya hay captura.',
  'La foto oficial del grupo parlamentario te deja en la última fila, detrás de una columna.',
  'Tu perfil de X sube 30.000 seguidores en una tarde por motivos que prefieres no investigar.',
  'Te invitan a la mascletà. Aplaudes en el momento equivocado y sale en todos los informativos.',
  'Un pódcast de tres horas te dedica un capítulo entero. No lo escuchas.',
  'Aparece una parodia tuya en un programa de humor. Dices que te ha hecho gracia.',
];

// Fuentes: tipografías OFL autoalojadas. Sin CDN, sin peticiones a terceros.
