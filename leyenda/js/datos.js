// Datos del mundo: regiones, líneas evolutivas, rivales y textos de sabor.
// Todo estático: el juego no depende de ninguna API para funcionar.

export const TIPOS = {
  planta:   { nombre: 'Planta',   color: '#5fbd58' },
  fuego:    { nombre: 'Fuego',    color: '#f0813c' },
  agua:     { nombre: 'Agua',     color: '#539ae2' },
  electrico:{ nombre: 'Eléctrico',color: '#e5c531' },
  hielo:    { nombre: 'Hielo',    color: '#75d0c1' },
  lucha:    { nombre: 'Lucha',    color: '#d3425f' },
  veneno:   { nombre: 'Veneno',   color: '#b763cf' },
  tierra:   { nombre: 'Tierra',   color: '#da7c4d' },
  volador:  { nombre: 'Volador',  color: '#8a9ee2' },
  psiquico: { nombre: 'Psíquico', color: '#fa8581' },
  bicho:    { nombre: 'Bicho',    color: '#92bc2c' },
  roca:     { nombre: 'Roca',     color: '#c9bb8a' },
  fantasma: { nombre: 'Fantasma', color: '#5f6dbc' },
  dragon:   { nombre: 'Dragón',   color: '#0c69c8' },
  siniestro:{ nombre: 'Siniestro',color: '#595761' },
  acero:    { nombre: 'Acero',    color: '#5695a3' },
  hada:     { nombre: 'Hada',     color: '#ee90e6' },
  normal:   { nombre: 'Normal',   color: '#a0a29f' },
};

export const REGIONES = [
  { id: 'kanto',   nombre: 'Kanto',   emoji: '🗼', liga: 'Meseta Añil',      sabor: 'La región clásica. Ocho gimnasios, un Alto Mando implacable y una prensa que no perdona.' },
  { id: 'johto',   nombre: 'Johto',   emoji: '🏯', liga: 'Plateada',          sabor: 'Tradición, torres antiguas y entrenadores que llevan generaciones en esto.' },
  { id: 'hoenn',   nombre: 'Hoenn',   emoji: '🌊', liga: 'Colosseum',         sabor: 'Mar, volcanes y concursos. Aquí la fama se gana tanto en el ring como en el escenario.' },
  { id: 'sinnoh',  nombre: 'Sinnoh',  emoji: '🏔️', liga: 'Cumbre Lanza',      sabor: 'Frío, mitología y los combates más duros del circuito.' },
  { id: 'unova',   nombre: 'Teselia', emoji: '🌆', liga: 'Liga de Teselia',   sabor: 'Región urbana, patrocinios millonarios y focos las 24 horas.' },
  { id: 'kalos',   nombre: 'Kalos',   emoji: '🥐', liga: 'Liga de Kalos',     sabor: 'Elegancia, Megaevolución y una escena mediática feroz.' },
  { id: 'alola',   nombre: 'Alola',   emoji: '🌺', liga: 'Liga de Alola',     sabor: 'Islas, pruebas rituales y un circuito joven donde todo está por escribirse.' },
  { id: 'galar',   nombre: 'Galar',   emoji: '🏟️', liga: 'Liga de Galar',     sabor: 'Estadios llenos, Dinamax y contratos de patrocinio del tamaño de un edificio.' },
  { id: 'paldea',  nombre: 'Paldea',  emoji: '🍊', liga: 'Liga de Paldea',    sabor: 'Mundo abierto, academias y tres caminos posibles hacia la gloria.' },
];

export const ESTILOS = [
  { id: 'agresivo',   nombre: 'Agresivo',   emoji: '⚔️', desc: 'Ataque total. Ganas rápido o pierdes rápido.',        bonus: { poder: 8, estrategia: -4, moral: 2 } },
  { id: 'estratega',  nombre: 'Estratega',  emoji: '🧠', desc: 'Preparación, equipos y trampas. Frío como el hielo.', bonus: { estrategia: 10, vinculo: -3 } },
  { id: 'carismatico',nombre: 'Carismático',emoji: '✨', desc: 'El público te quiere. Los patrocinadores también.',   bonus: { fama: 12, poder: -3 } },
  { id: 'criador',    nombre: 'Criador',    emoji: '💚', desc: 'Tus Pokémon lo darían todo por ti. Y lo dan.',        bonus: { vinculo: 12, estrategia: -2 } },
];

export const RITMOS = [
  { id: 'intensa', nombre: 'Intensa', desc: 'Una decisión por temporada. La carrera completa, sin saltarte nada.', cada: 1 },
  { id: 'normal',  nombre: 'Normal',  desc: 'Una decisión cada dos temporadas. El equilibrio.',                    cada: 2 },
  { id: 'expres',  nombre: 'Exprés',  desc: 'Una decisión cada tres temporadas. Veinte años en dos minutos.',      cada: 3 },
];

// ── Líneas evolutivas ────────────────────────────────────────────────────────
// poder: potencial de combate de cada etapa (0-100). rareza: peso al aparecer.
const L = (id, region, rareza, tipos, etapas) => ({ id, region, rareza, tipos, etapas });
const E = (dex, nombre, poder) => ({ dex, nombre, poder });

export const LINEAS = [
  // Iniciales
  L('charmander', 'kanto', 'inicial', ['fuego', 'volador'], [E(4, 'Charmander', 36), E(5, 'Charmeleon', 56), E(6, 'Charizard', 82)]),
  L('squirtle', 'kanto', 'inicial', ['agua'], [E(7, 'Squirtle', 36), E(8, 'Wartortle', 56), E(9, 'Blastoise', 80)]),
  L('bulbasaur', 'kanto', 'inicial', ['planta', 'veneno'], [E(1, 'Bulbasaur', 36), E(2, 'Ivysaur', 56), E(3, 'Venusaur', 80)]),
  L('chikorita', 'johto', 'inicial', ['planta'], [E(152, 'Chikorita', 34), E(153, 'Bayleef', 54), E(154, 'Meganium', 78)]),
  L('cyndaquil', 'johto', 'inicial', ['fuego'], [E(155, 'Cyndaquil', 36), E(156, 'Quilava', 56), E(157, 'Typhlosion', 81)]),
  L('totodile', 'johto', 'inicial', ['agua'], [E(158, 'Totodile', 37), E(159, 'Croconaw', 57), E(160, 'Feraligatr', 82)]),
  L('treecko', 'hoenn', 'inicial', ['planta'], [E(252, 'Treecko', 35), E(253, 'Grovyle', 56), E(254, 'Sceptile', 82)]),
  L('torchic', 'hoenn', 'inicial', ['fuego', 'lucha'], [E(255, 'Torchic', 35), E(256, 'Combusken', 57), E(257, 'Blaziken', 84)]),
  L('mudkip', 'hoenn', 'inicial', ['agua', 'tierra'], [E(258, 'Mudkip', 36), E(259, 'Marshtomp', 57), E(260, 'Swampert', 83)]),
  L('turtwig', 'sinnoh', 'inicial', ['planta', 'tierra'], [E(387, 'Turtwig', 35), E(388, 'Grotle', 55), E(389, 'Torterra', 81)]),
  L('chimchar', 'sinnoh', 'inicial', ['fuego', 'lucha'], [E(390, 'Chimchar', 35), E(391, 'Monferno', 56), E(392, 'Infernape', 84)]),
  L('piplup', 'sinnoh', 'inicial', ['agua', 'acero'], [E(393, 'Piplup', 35), E(394, 'Prinplup', 55), E(395, 'Empoleon', 81)]),
  L('snivy', 'unova', 'inicial', ['planta'], [E(495, 'Snivy', 35), E(496, 'Servine', 55), E(497, 'Serperior', 80)]),
  L('tepig', 'unova', 'inicial', ['fuego', 'lucha'], [E(498, 'Tepig', 36), E(499, 'Pignite', 56), E(500, 'Emboar', 81)]),
  L('oshawott', 'unova', 'inicial', ['agua'], [E(501, 'Oshawott', 35), E(502, 'Dewott', 55), E(503, 'Samurott', 80)]),
  L('fennekin', 'kalos', 'inicial', ['fuego', 'psiquico'], [E(653, 'Fennekin', 35), E(654, 'Braixen', 55), E(655, 'Delphox', 81)]),
  L('froakie', 'kalos', 'inicial', ['agua', 'siniestro'], [E(656, 'Froakie', 36), E(657, 'Frogadier', 57), E(658, 'Greninja', 85)]),
  L('chespin', 'kalos', 'inicial', ['planta', 'lucha'], [E(650, 'Chespin', 35), E(651, 'Quilladin', 55), E(652, 'Chesnaught', 81)]),
  L('rowlet', 'alola', 'inicial', ['planta', 'fantasma'], [E(722, 'Rowlet', 35), E(723, 'Dartrix', 55), E(724, 'Decidueye', 81)]),
  L('litten', 'alola', 'inicial', ['fuego', 'siniestro'], [E(725, 'Litten', 35), E(726, 'Torracat', 56), E(727, 'Incineroar', 82)]),
  L('popplio', 'alola', 'inicial', ['agua', 'hada'], [E(728, 'Popplio', 34), E(729, 'Brionne', 55), E(730, 'Primarina', 82)]),
  L('grookey', 'galar', 'inicial', ['planta'], [E(810, 'Grookey', 35), E(811, 'Thwackey', 55), E(812, 'Rillaboom', 82)]),
  L('scorbunny', 'galar', 'inicial', ['fuego'], [E(813, 'Scorbunny', 36), E(814, 'Raboot', 56), E(815, 'Cinderace', 83)]),
  L('sobble', 'galar', 'inicial', ['agua'], [E(816, 'Sobble', 34), E(817, 'Drizzile', 54), E(818, 'Inteleon', 82)]),
  L('sprigatito', 'paldea', 'inicial', ['planta', 'siniestro'], [E(906, 'Sprigatito', 35), E(907, 'Floragato', 56), E(908, 'Meowscarada', 83)]),
  L('fuecoco', 'paldea', 'inicial', ['fuego', 'fantasma'], [E(909, 'Fuecoco', 35), E(910, 'Crocalor', 56), E(911, 'Skeledirge', 82)]),
  L('quaxly', 'paldea', 'inicial', ['agua', 'lucha'], [E(912, 'Quaxly', 35), E(913, 'Quaxwell', 56), E(914, 'Quaquaval', 83)]),

  // Comunes de ruta
  L('pidgey', 'kanto', 'comun', ['normal', 'volador'], [E(16, 'Pidgey', 22), E(17, 'Pidgeotto', 42), E(18, 'Pidgeot', 66)]),
  L('rattata', 'kanto', 'comun', ['normal'], [E(19, 'Rattata', 20), E(20, 'Raticate', 46)]),
  L('caterpie', 'kanto', 'comun', ['bicho'], [E(10, 'Caterpie', 14), E(11, 'Metapod', 26), E(12, 'Butterfree', 58)]),
  L('zubat', 'kanto', 'comun', ['veneno', 'volador'], [E(41, 'Zubat', 20), E(42, 'Golbat', 44), E(169, 'Crobat', 72)]),
  L('geodude', 'kanto', 'comun', ['roca', 'tierra'], [E(74, 'Geodude', 26), E(75, 'Graveler', 46), E(76, 'Golem', 70)]),
  L('machop', 'kanto', 'comun', ['lucha'], [E(66, 'Machop', 30), E(67, 'Machoke', 52), E(68, 'Machamp', 76)]),
  L('abra', 'kanto', 'comun', ['psiquico'], [E(63, 'Abra', 24), E(64, 'Kadabra', 54), E(65, 'Alakazam', 80)]),
  L('gastly', 'kanto', 'raro', ['fantasma', 'veneno'], [E(92, 'Gastly', 28), E(93, 'Haunter', 54), E(94, 'Gengar', 79)]),
  L('eevee', 'kanto', 'raro', ['normal'], [E(133, 'Eevee', 32), E(134, 'Vaporeon', 70), E(135, 'Jolteon', 72)]),
  L('growlithe', 'kanto', 'comun', ['fuego'], [E(58, 'Growlithe', 32), E(59, 'Arcanine', 76)]),
  L('magikarp', 'kanto', 'comun', ['agua'], [E(129, 'Magikarp', 6), E(130, 'Gyarados', 79)]),
  L('pikachu', 'kanto', 'raro', ['electrico'], [E(172, 'Pichu', 20), E(25, 'Pikachu', 46), E(26, 'Raichu', 72)]),
  L('mareep', 'johto', 'comun', ['electrico'], [E(179, 'Mareep', 26), E(180, 'Flaaffy', 46), E(181, 'Ampharos', 74)]),
  L('houndour', 'johto', 'comun', ['siniestro', 'fuego'], [E(228, 'Houndour', 30), E(229, 'Houndoom', 72)]),
  L('larvitar', 'johto', 'pseudo', ['roca', 'tierra'], [E(246, 'Larvitar', 28), E(247, 'Pupitar', 52), E(248, 'Tyranitar', 90)]),
  L('dratini', 'kanto', 'pseudo', ['dragon'], [E(147, 'Dratini', 30), E(148, 'Dragonair', 56), E(149, 'Dragonite', 90)]),
  L('bagon', 'hoenn', 'pseudo', ['dragon'], [E(371, 'Bagon', 28), E(372, 'Shelgon', 52), E(373, 'Salamence', 90)]),
  L('beldum', 'hoenn', 'pseudo', ['acero', 'psiquico'], [E(374, 'Beldum', 28), E(375, 'Metang', 54), E(376, 'Metagross', 90)]),
  L('gible', 'sinnoh', 'pseudo', ['dragon', 'tierra'], [E(443, 'Gible', 28), E(444, 'Gabite', 54), E(445, 'Garchomp', 92)]),
  L('deino', 'unova', 'pseudo', ['siniestro', 'dragon'], [E(633, 'Deino', 28), E(634, 'Zweilous', 52), E(635, 'Hydreigon', 90)]),
  L('goomy', 'kalos', 'pseudo', ['dragon'], [E(704, 'Goomy', 26), E(705, 'Sliggoo', 52), E(706, 'Goodra', 88)]),
  L('jangmo', 'alola', 'pseudo', ['dragon', 'lucha'], [E(782, 'Jangmo-o', 28), E(783, 'Hakamo-o', 52), E(784, 'Kommo-o', 88)]),
  L('dreepy', 'galar', 'pseudo', ['dragon', 'fantasma'], [E(885, 'Dreepy', 26), E(886, 'Drakloak', 54), E(887, 'Dragapult', 92)]),
  L('ralts', 'hoenn', 'raro', ['psiquico', 'hada'], [E(280, 'Ralts', 24), E(281, 'Kirlia', 48), E(282, 'Gardevoir', 82)]),
  L('trapinch', 'hoenn', 'comun', ['tierra'], [E(328, 'Trapinch', 28), E(329, 'Vibrava', 48), E(330, 'Flygon', 78)]),
  L('riolu', 'sinnoh', 'raro', ['lucha', 'acero'], [E(447, 'Riolu', 32), E(448, 'Lucario', 84)]),
  L('rotom', 'sinnoh', 'raro', ['electrico', 'fantasma'], [E(479, 'Rotom', 58)]),
  L('scyther', 'kanto', 'raro', ['bicho', 'acero'], [E(123, 'Scyther', 48), E(212, 'Scizor', 80)]),
  L('sneasel', 'johto', 'raro', ['siniestro', 'hielo'], [E(215, 'Sneasel', 40), E(461, 'Weavile', 80)]),
  L('togepi', 'johto', 'raro', ['hada'], [E(175, 'Togepi', 20), E(176, 'Togetic', 46), E(468, 'Togekiss', 82)]),
  L('snorlax', 'kanto', 'raro', ['normal'], [E(143, 'Snorlax', 76)]),
  L('lapras', 'kanto', 'raro', ['agua', 'hielo'], [E(131, 'Lapras', 74)]),
  L('tyrogue', 'johto', 'comun', ['lucha'], [E(236, 'Tyrogue', 26), E(237, 'Hitmontop', 62)]),
  L('shinx', 'sinnoh', 'comun', ['electrico'], [E(403, 'Shinx', 26), E(404, 'Luxio', 46), E(405, 'Luxray', 74)]),
  L('starly', 'sinnoh', 'comun', ['normal', 'volador'], [E(396, 'Starly', 22), E(397, 'Staravia', 44), E(398, 'Staraptor', 74)]),
  L('joltik', 'unova', 'comun', ['bicho', 'electrico'], [E(595, 'Joltik', 26), E(596, 'Galvantula', 66)]),
  L('litwick', 'unova', 'raro', ['fantasma', 'fuego'], [E(607, 'Litwick', 26), E(608, 'Lampent', 50), E(609, 'Chandelure', 82)]),
  L('mimikyu', 'alola', 'raro', ['fantasma', 'hada'], [E(778, 'Mimikyu', 68)]),
  L('toxel', 'galar', 'raro', ['electrico', 'veneno'], [E(848, 'Toxel', 24), E(849, 'Toxtricity', 74)]),
  L('applin', 'galar', 'comun', ['planta', 'dragon'], [E(840, 'Applin', 24), E(841, 'Flapple', 68)]),
  L('pawmi', 'paldea', 'comun', ['electrico', 'lucha'], [E(921, 'Pawmi', 24), E(923, 'Pawmot', 70)]),
  L('tinkatink', 'paldea', 'raro', ['hada', 'acero'], [E(957, 'Tinkatink', 26), E(959, 'Tinkaton', 76)]),
  L('charcadet', 'paldea', 'raro', ['fuego', 'psiquico'], [E(935, 'Charcadet', 30), E(937, 'Armarouge', 78)]),

  // Legendarios (solo por evento)
  L('articuno', 'kanto', 'legendario', ['hielo', 'volador'], [E(144, 'Articuno', 94)]),
  L('zapdos', 'kanto', 'legendario', ['electrico', 'volador'], [E(145, 'Zapdos', 94)]),
  L('moltres', 'kanto', 'legendario', ['fuego', 'volador'], [E(146, 'Moltres', 94)]),
  L('lugia', 'johto', 'legendario', ['psiquico', 'volador'], [E(249, 'Lugia', 98)]),
  L('hooh', 'johto', 'legendario', ['fuego', 'volador'], [E(250, 'Ho-Oh', 98)]),
  L('rayquaza', 'hoenn', 'legendario', ['dragon', 'volador'], [E(384, 'Rayquaza', 99)]),
  L('giratina', 'sinnoh', 'legendario', ['fantasma', 'dragon'], [E(487, 'Giratina', 97)]),
  L('zekrom', 'unova', 'legendario', ['dragon', 'electrico'], [E(644, 'Zekrom', 97)]),
  L('xerneas', 'kalos', 'legendario', ['hada'], [E(716, 'Xerneas', 97)]),
  L('zacian', 'galar', 'legendario', ['hada', 'acero'], [E(888, 'Zacian', 98)]),
  L('koraidon', 'paldea', 'legendario', ['lucha', 'dragon'], [E(1007, 'Koraidon', 97)]),
  L('mew', 'kanto', 'legendario', ['psiquico'], [E(151, 'Mew', 96)]),
];

export const PORLINEA = Object.fromEntries(LINEAS.map(l => [l.id, l]));
export const INICIALES = LINEAS.filter(l => l.rareza === 'inicial');

export const PESO_RAREZA = { comun: 60, raro: 22, pseudo: 6, inicial: 12, legendario: 0 };

export const NOMBRES_RIVAL = [
  'Silver', 'Blue', 'Wally', 'Bárbara', 'Hugo', 'Nerea', 'Kabu', 'Marnie', 'Nemona',
  'Paul', 'Trip', 'Alain', 'Gladio', 'Bea', 'Lucía', 'Aitor', 'Sonia', 'Marco',
];

export const APODOS_PRENSA = [
  'el Meteoro', 'el Rompeligas', 'la Sorpresa', 'el Muro', 'el Fenómeno',
  'la Tormenta', 'el Impredecible', 'la Máquina', 'el Chaval', 'el Elegido',
];

// Rangos finales por puntuación de legado
export const RANGOS = [
  { min: 1180, titulo: 'Leyenda Inmortal',       emoji: '🌟', desc: 'Tu nombre está en los libros de texto. Los niños juegan a ser tú.' },
  { min: 960, titulo: 'Maestro Pokémon',        emoji: '👑', desc: 'Llegaste a la cima y te quedaste allí. Nadie discute tu lugar.' },
  { min: 790, titulo: 'Campeón Regional',       emoji: '🏆', desc: 'Levantaste la copa. La región entera coreó tu nombre.' },
  { min: 630, titulo: 'Élite del Circuito',     emoji: '🥇', desc: 'Uno de los grandes de tu generación, aunque el título máximo se te resistió.' },
  { min: 480, titulo: 'Profesional Respetado',  emoji: '🎖️', desc: 'Viviste de esto con dignidad. Muchos matarían por tu carrera.' },
  { min: 360, titulo: 'Veterano de Circuito',   emoji: '🎽', desc: 'Aguantaste años ahí arriba sin llegar a lo más alto.' },
  { min: 250, titulo: 'Entrenador Sólido',      emoji: '⚡', desc: 'Buenos momentos, buen equipo, ningún titular de portada.' },
  { min: 150,  titulo: 'Promesa Incumplida',     emoji: '🌱', desc: 'Todos decían que ibas a ser el mejor. La vida dijo otra cosa.' },
  { min: -999,titulo: 'Entrenador de Pueblo',   emoji: '🍃', desc: 'Volviste a casa. Tus Pokémon te siguen queriendo igual.' },
];

// Sprites vendorizados desde github.com/PokeAPI/sprites (dominio público de facto,
// mismos ficheros que sirve PokeAPI). Local = sin dependencias externas ni latencia.
export const spriteUrl = dex => `sprites/${dex}.png`;
