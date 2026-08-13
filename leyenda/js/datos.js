// Datos del mundo: regiones, líneas evolutivas, rivales y textos de sabor.
// Todo estático: el juego no depende de ninguna API para funcionar.
import { L as T } from './i18n.js?v=41';

export const TIPOS = {
  planta: { nombre: T('Planta', 'Grass', 'Erba'), color: '#5fbd58' },
  fuego: { nombre: T('Fuego', 'Fire', 'Fuoco'), color: '#f0813c' },
  agua: { nombre: T('Agua', 'Water', 'Acqua'), color: '#539ae2' },
  electrico: { nombre: T('Eléctrico', 'Electric', 'Elettro'), color: '#e5c531' },
  hielo: { nombre: T('Hielo', 'Ice', 'Ghiaccio'), color: '#75d0c1' },
  lucha: { nombre: T('Lucha', 'Fighting', 'Lotta'), color: '#d3425f' },
  veneno: { nombre: T('Veneno', 'Poison', 'Veleno'), color: '#b763cf' },
  tierra: { nombre: T('Tierra', 'Ground', 'Terra'), color: '#da7c4d' },
  volador: { nombre: T('Volador', 'Flying', 'Volante'), color: '#8a9ee2' },
  psiquico: { nombre: T('Psíquico', 'Psychic', 'Psico'), color: '#fa8581' },
  bicho: { nombre: T('Bicho', 'Bug', 'Coleottero'), color: '#92bc2c' },
  roca: { nombre: T('Roca', 'Rock', 'Roccia'), color: '#c9bb8a' },
  fantasma: { nombre: T('Fantasma', 'Ghost', 'Spettro'), color: '#5f6dbc' },
  dragon: { nombre: T('Dragón', 'Dragon', 'Drago'), color: '#0c69c8' },
  siniestro: { nombre: T('Siniestro', 'Dark', 'Buio'), color: '#595761' },
  acero: { nombre: T('Acero', 'Steel', 'Acciaio'), color: '#5695a3' },
  hada: { nombre: T('Hada', 'Fairy', 'Folletto'), color: '#ee90e6' },
  normal: { nombre: T('Normal', 'Normal', 'Normale'), color: '#a0a29f' },
};

export const REGIONES = [
  { id: 'kanto',   nombre: 'Kanto',   emoji: '🗼', liga: 'Meseta Añil',      sabor: T('La región clásica. Ocho gimnasios, un Alto Mando implacable y una prensa que no perdona.', 'The classic region. Eight gyms, a relentless Elite Four and a press that never forgives.', 'La regione classica. Otto palestre, un Alto Comando implacabile e una stampa che non perdona.') },
  { id: 'johto',   nombre: 'Johto',   emoji: '🏯', liga: 'Plateada',          sabor: T('Tradición, torres antiguas y entrenadores que llevan generaciones en esto.', 'Tradition, ancient towers, and trainers who have been at this for generations.', 'Tradizione, torri antiche e allenatori che fanno questo da generazioni.') },
  { id: 'hoenn',   nombre: 'Hoenn',   emoji: '🌊', liga: 'Colosseum',         sabor: T('Mar, volcanes y concursos. Aquí la fama se gana tanto en el ring como en el escenario.', 'Sea, volcanoes and contests. Fame here is earned both in the ring and on stage.', 'Mare, vulcani e contest. Qui la fama si guadagna tanto sul ring quanto sul palco.') },
  { id: 'sinnoh',  nombre: 'Sinnoh',  emoji: '🏔️', liga: 'Cumbre Lanza',      sabor: T('Frío, mitología y los combates más duros del circuito.', 'Cold, mythology, and the toughest battles on the circuit.', 'Freddo, mitologia e i combattimenti più duri del circuito.') },
  { id: 'unova',   nombre: 'Teselia', emoji: '🌆', liga: 'Liga de Teselia',   sabor: T('Región urbana, patrocinios millonarios y focos las 24 horas.', 'Urban region, million-dollar sponsorships, and spotlights 24 hours a day.', 'Regione urbana, sponsorizzazioni milionarie e riflettori 24 ore su 24.') },
  { id: 'kalos',   nombre: 'Kalos',   emoji: '🥐', liga: 'Liga de Kalos',     sabor: T('Elegancia, Megaevolución y una escena mediática feroz.', 'Elegance, Mega Evolution, and a fierce media scene.', 'Eleganza, Megaevoluzione e una scena mediatica feroce.') },
  { id: 'alola',   nombre: 'Alola',   emoji: '🌺', liga: 'Liga de Alola',     sabor: T('Islas, pruebas rituales y un circuito joven donde todo está por escribirse.', 'Islands, ritual trials, and a young circuit where everything is still unwritten.', 'Isole, prove rituali e un circuito giovane dove tutto è ancora da scrivere.') },
  { id: 'galar',   nombre: 'Galar',   emoji: '🏟️', liga: 'Liga de Galar',     sabor: T('Estadios llenos, Dinamax y contratos de patrocinio del tamaño de un edificio.', 'Packed stadiums, Dynamax, and sponsorship deals the size of a building.', 'Stadi pieni, Dynamax e contratti di sponsorizzazione grandi come un palazzo.') },
  { id: 'paldea',  nombre: 'Paldea',  emoji: '🍊', liga: 'Liga de Paldea',    sabor: T('Mundo abierto, academias y tres caminos posibles hacia la gloria.', 'Open world, academies, and three possible paths to glory.', 'Mondo aperto, accademie e tre percorsi possibili verso la gloria.') },
];

export const ESTILOS = [
  { id: 'agresivo',   nombre: T('Agresivo', 'Aggressive', 'Aggressivo'),   emoji: '⚔️', desc: T('Ataque total. Ganas rápido o pierdes rápido.', 'All-out attack. You win fast or lose fast.', 'Attacco totale. Vinci in fretta o perdi in fretta.'),        bonus: { poder: 8, estrategia: -4, moral: 2 } },
  { id: 'estratega',  nombre: T('Estratega', 'Strategist', 'Stratega'),  emoji: '🧠', desc: T('Preparación, equipos y trampas. Frío como el hielo.', 'Preparation, teams and traps. Cold as ice.', 'Preparazione, squadre e trappole. Freddo come il ghiaccio.'), bonus: { estrategia: 10, vinculo: -3 } },
  { id: 'carismatico',nombre: T('Carismático', 'Charismatic', 'Carismatico'),emoji: '✨', desc: T('El público te quiere. Los patrocinadores también.', 'The crowd loves you. So do the sponsors.', 'Il pubblico ti ama. Anche gli sponsor.'),   bonus: { fama: 12, poder: -3 } },
  { id: 'criador',    nombre: T('Criador', 'Breeder', 'Allevatore'),    emoji: '💚', desc: T('Tus Pokémon lo darían todo por ti. Y lo dan.', 'Your Pokémon would give everything for you. And they do.', 'I tuoi Pokémon darebbero tutto per te. E lo fanno.'),        bonus: { vinculo: 12, estrategia: -2 } },
];

export const RITMOS = [
  { id: 'intensa', nombre: T('Intensa', 'Intense', 'Intensa'), desc: T('Una decisión por temporada. La carrera completa, sin saltarte nada.', 'One decision per season. The full career, nothing skipped.', 'Una decisione a stagione. La carriera completa, senza saltare nulla.'), cada: 1 },
  { id: 'normal',  nombre: T('Normal', 'Normal', 'Normale'),  desc: T('Una decisión cada dos temporadas. El equilibrio.', 'One decision every two seasons. The balanced option.', 'Una decisione ogni due stagioni. L\'equilibrio.'),                    cada: 2 },
  { id: 'expres',  nombre: T('Exprés', 'Express', 'Espresso'),  desc: T('Una decisión cada tres temporadas. Veinte años en dos minutos.', 'One decision every three seasons. Twenty years in two minutes.', 'Una decisione ogni tre stagioni. Vent\'anni in due minuti.'),      cada: 3 },
];

// ── Líneas evolutivas ────────────────────────────────────────────────────────
// poder: potencial de combate de cada etapa (0-100). rareza: peso al aparecer.
// tipos de la línea = los de su primera etapa; cada etapa puede sobrescribirlos
// (Charmander es solo Fuego; Charizard ya es Fuego/Volador).
// `ramas` son evoluciones ALTERNATIVAS, no consecutivas: cada ejemplar coge
// una sola (Eevee no pasa por Vaporeon camino de Jolteon).
const L = (id, region, rareza, tipos, etapas, ramas) => ({ id, region, rareza, tipos, etapas, ramas });
// Fósil: igual que una línea rara, pero `soloEvento` la saca del pool de
// capturas por ruta. Un Omanyte no te sale paseando: lo revive un laboratorio.
const F = (id, region, tipos, etapas) => ({ id, region, rareza: 'raro', tipos, etapas, soloEvento: true });
const E = (dex, nombre, poder, tipos) => (tipos ? { dex, nombre, poder, tipos } : { dex, nombre, poder });

export const LINEAS = [
  // Iniciales
  L('charmander', 'kanto', 'inicial', ['fuego'], [E(4, 'Charmander', 36), E(5, 'Charmeleon', 56), E(6, 'Charizard', 82, ['fuego', 'volador'])]),
  L('squirtle', 'kanto', 'inicial', ['agua'], [E(7, 'Squirtle', 36), E(8, 'Wartortle', 56), E(9, 'Blastoise', 80)]),
  L('bulbasaur', 'kanto', 'inicial', ['planta', 'veneno'], [E(1, 'Bulbasaur', 36), E(2, 'Ivysaur', 56), E(3, 'Venusaur', 80)]),
  L('chikorita', 'johto', 'inicial', ['planta'], [E(152, 'Chikorita', 34), E(153, 'Bayleef', 54), E(154, 'Meganium', 78)]),
  L('cyndaquil', 'johto', 'inicial', ['fuego'], [E(155, 'Cyndaquil', 36), E(156, 'Quilava', 56), E(157, 'Typhlosion', 81)]),
  L('totodile', 'johto', 'inicial', ['agua'], [E(158, 'Totodile', 37), E(159, 'Croconaw', 57), E(160, 'Feraligatr', 82)]),
  L('treecko', 'hoenn', 'inicial', ['planta'], [E(252, 'Treecko', 35), E(253, 'Grovyle', 56), E(254, 'Sceptile', 82)]),
  L('torchic', 'hoenn', 'inicial', ['fuego'], [E(255, 'Torchic', 35), E(256, 'Combusken', 57, ['fuego', 'lucha']), E(257, 'Blaziken', 84, ['fuego', 'lucha'])]),
  L('mudkip', 'hoenn', 'inicial', ['agua'], [E(258, 'Mudkip', 36), E(259, 'Marshtomp', 57, ['agua', 'tierra']), E(260, 'Swampert', 83, ['agua', 'tierra'])]),
  L('turtwig', 'sinnoh', 'inicial', ['planta'], [E(387, 'Turtwig', 35), E(388, 'Grotle', 55), E(389, 'Torterra', 81, ['planta', 'tierra'])]),
  L('chimchar', 'sinnoh', 'inicial', ['fuego'], [E(390, 'Chimchar', 35), E(391, 'Monferno', 56, ['fuego', 'lucha']), E(392, 'Infernape', 84, ['fuego', 'lucha'])]),
  L('piplup', 'sinnoh', 'inicial', ['agua'], [E(393, 'Piplup', 35), E(394, 'Prinplup', 55), E(395, 'Empoleon', 81, ['agua', 'acero'])]),
  L('snivy', 'unova', 'inicial', ['planta'], [E(495, 'Snivy', 35), E(496, 'Servine', 55), E(497, 'Serperior', 80)]),
  L('tepig', 'unova', 'inicial', ['fuego'], [E(498, 'Tepig', 36), E(499, 'Pignite', 56, ['fuego', 'lucha']), E(500, 'Emboar', 81, ['fuego', 'lucha'])]),
  L('oshawott', 'unova', 'inicial', ['agua'], [E(501, 'Oshawott', 35), E(502, 'Dewott', 55), E(503, 'Samurott', 80)]),
  L('fennekin', 'kalos', 'inicial', ['fuego'], [E(653, 'Fennekin', 35), E(654, 'Braixen', 55), E(655, 'Delphox', 81, ['fuego', 'psiquico'])]),
  L('froakie', 'kalos', 'inicial', ['agua'], [E(656, 'Froakie', 36), E(657, 'Frogadier', 57), E(658, 'Greninja', 85, ['agua', 'siniestro'])]),
  L('chespin', 'kalos', 'inicial', ['planta'], [E(650, 'Chespin', 35), E(651, 'Quilladin', 55), E(652, 'Chesnaught', 81, ['planta', 'lucha'])]),
  L('rowlet', 'alola', 'inicial', ['planta', 'volador'], [E(722, 'Rowlet', 35), E(723, 'Dartrix', 55), E(724, 'Decidueye', 81, ['planta', 'fantasma'])]),
  L('litten', 'alola', 'inicial', ['fuego'], [E(725, 'Litten', 35), E(726, 'Torracat', 56), E(727, 'Incineroar', 82, ['fuego', 'siniestro'])]),
  L('popplio', 'alola', 'inicial', ['agua'], [E(728, 'Popplio', 34), E(729, 'Brionne', 55), E(730, 'Primarina', 82, ['agua', 'hada'])]),
  L('grookey', 'galar', 'inicial', ['planta'], [E(810, 'Grookey', 35), E(811, 'Thwackey', 55), E(812, 'Rillaboom', 82)]),
  L('scorbunny', 'galar', 'inicial', ['fuego'], [E(813, 'Scorbunny', 36), E(814, 'Raboot', 56), E(815, 'Cinderace', 83)]),
  L('sobble', 'galar', 'inicial', ['agua'], [E(816, 'Sobble', 34), E(817, 'Drizzile', 54), E(818, 'Inteleon', 82)]),
  L('sprigatito', 'paldea', 'inicial', ['planta'], [E(906, 'Sprigatito', 35), E(907, 'Floragato', 56), E(908, 'Meowscarada', 83, ['planta', 'siniestro'])]),
  L('fuecoco', 'paldea', 'inicial', ['fuego'], [E(909, 'Fuecoco', 35), E(910, 'Crocalor', 56), E(911, 'Skeledirge', 82, ['fuego', 'fantasma'])]),
  L('quaxly', 'paldea', 'inicial', ['agua'], [E(912, 'Quaxly', 35), E(913, 'Quaxwell', 56), E(914, 'Quaquaval', 83, ['agua', 'lucha'])]),

  // Comunes de ruta
  L('pidgey', 'kanto', 'comun', ['normal', 'volador'], [E(16, 'Pidgey', 22), E(17, 'Pidgeotto', 42), E(18, 'Pidgeot', 66)]),
  L('rattata', 'kanto', 'comun', ['normal'], [E(19, 'Rattata', 20), E(20, 'Raticate', 46)]),
  L('caterpie', 'kanto', 'comun', ['bicho'], [E(10, 'Caterpie', 14), E(11, 'Metapod', 26), E(12, 'Butterfree', 58, ['bicho', 'volador'])]),
  L('zubat', 'kanto', 'comun', ['veneno', 'volador'], [E(41, 'Zubat', 20), E(42, 'Golbat', 44), E(169, 'Crobat', 72)]),
  L('geodude', 'kanto', 'comun', ['roca', 'tierra'], [E(74, 'Geodude', 26), E(75, 'Graveler', 46), E(76, 'Golem', 70)]),
  L('machop', 'kanto', 'comun', ['lucha'], [E(66, 'Machop', 30), E(67, 'Machoke', 52), E(68, 'Machamp', 76)]),
  L('abra', 'kanto', 'comun', ['psiquico'], [E(63, 'Abra', 24), E(64, 'Kadabra', 54), E(65, 'Alakazam', 80)]),
  L('gastly', 'kanto', 'raro', ['fantasma', 'veneno'], [E(92, 'Gastly', 28), E(93, 'Haunter', 54), E(94, 'Gengar', 79)]),
  L('eevee', 'kanto', 'raro', ['normal'], [E(133, 'Eevee', 32)],
    [E(134, 'Vaporeon', 70, ['agua']), E(135, 'Jolteon', 72, ['electrico']), E(136, 'Flareon', 71, ['fuego']),
     E(196, 'Espeon', 73, ['psiquico']), E(197, 'Umbreon', 73, ['siniestro']), E(700, 'Sylveon', 73, ['hada'])]),
  // Fósiles: solo salen del laboratorio, no se cruzan por una ruta
  F('omanyte', 'kanto', ['roca', 'agua'], [E(138, 'Omanyte', 40), E(139, 'Omastar', 74)]),
  F('kabuto', 'kanto', ['roca', 'agua'], [E(140, 'Kabuto', 40), E(141, 'Kabutops', 76)]),
  F('aerodactyl', 'kanto', ['roca', 'volador'], [E(142, 'Aerodactyl', 78)]),
  L('growlithe', 'kanto', 'comun', ['fuego'], [E(58, 'Growlithe', 32), E(59, 'Arcanine', 76)]),
  L('magikarp', 'kanto', 'comun', ['agua'], [E(129, 'Magikarp', 6), E(130, 'Gyarados', 79, ['agua', 'volador'])]),
  L('pikachu', 'kanto', 'raro', ['electrico'], [E(172, 'Pichu', 20), E(25, 'Pikachu', 46), E(26, 'Raichu', 72)]),
  L('mareep', 'johto', 'comun', ['electrico'], [E(179, 'Mareep', 26), E(180, 'Flaaffy', 46), E(181, 'Ampharos', 74)]),
  L('houndour', 'johto', 'comun', ['siniestro', 'fuego'], [E(228, 'Houndour', 30), E(229, 'Houndoom', 72)]),
  L('larvitar', 'johto', 'pseudo', ['roca', 'tierra'], [E(246, 'Larvitar', 28), E(247, 'Pupitar', 52), E(248, 'Tyranitar', 90, ['roca', 'siniestro'])]),
  L('dratini', 'kanto', 'pseudo', ['dragon'], [E(147, 'Dratini', 30), E(148, 'Dragonair', 56), E(149, 'Dragonite', 90, ['dragon', 'volador'])]),
  L('bagon', 'hoenn', 'pseudo', ['dragon'], [E(371, 'Bagon', 28), E(372, 'Shelgon', 52), E(373, 'Salamence', 90, ['dragon', 'volador'])]),
  L('beldum', 'hoenn', 'pseudo', ['acero', 'psiquico'], [E(374, 'Beldum', 28), E(375, 'Metang', 54), E(376, 'Metagross', 90)]),
  L('gible', 'sinnoh', 'pseudo', ['dragon', 'tierra'], [E(443, 'Gible', 28), E(444, 'Gabite', 54), E(445, 'Garchomp', 92)]),
  L('deino', 'unova', 'pseudo', ['siniestro', 'dragon'], [E(633, 'Deino', 28), E(634, 'Zweilous', 52), E(635, 'Hydreigon', 90)]),
  L('goomy', 'kalos', 'pseudo', ['dragon'], [E(704, 'Goomy', 26), E(705, 'Sliggoo', 52), E(706, 'Goodra', 88)]),
  L('jangmo', 'alola', 'pseudo', ['dragon'], [E(782, 'Jangmo-o', 28), E(783, 'Hakamo-o', 52, ['dragon', 'lucha']), E(784, 'Kommo-o', 88, ['dragon', 'lucha'])]),
  L('dreepy', 'galar', 'pseudo', ['dragon', 'fantasma'], [E(885, 'Dreepy', 26), E(886, 'Drakloak', 54), E(887, 'Dragapult', 92)]),
  L('ralts', 'hoenn', 'raro', ['psiquico', 'hada'], [E(280, 'Ralts', 24), E(281, 'Kirlia', 48), E(282, 'Gardevoir', 82)]),
  L('trapinch', 'hoenn', 'comun', ['tierra'], [E(328, 'Trapinch', 28), E(329, 'Vibrava', 48, ['tierra', 'dragon']), E(330, 'Flygon', 78, ['tierra', 'dragon'])]),
  L('riolu', 'sinnoh', 'raro', ['lucha'], [E(447, 'Riolu', 32), E(448, 'Lucario', 84, ['lucha', 'acero'])]),
  L('rotom', 'sinnoh', 'raro', ['electrico', 'fantasma'], [E(479, 'Rotom', 58)]),
  L('scyther', 'kanto', 'raro', ['bicho', 'volador'], [E(123, 'Scyther', 48), E(212, 'Scizor', 80, ['bicho', 'acero'])]),
  L('sneasel', 'johto', 'raro', ['siniestro', 'hielo'], [E(215, 'Sneasel', 40), E(461, 'Weavile', 80)]),
  L('togepi', 'johto', 'raro', ['hada'], [E(175, 'Togepi', 20), E(176, 'Togetic', 46, ['hada', 'volador']), E(468, 'Togekiss', 82, ['hada', 'volador'])]),
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
  L('pawmi', 'paldea', 'comun', ['electrico'], [E(921, 'Pawmi', 24), E(923, 'Pawmot', 70, ['electrico', 'lucha'])]),
  L('tinkatink', 'paldea', 'raro', ['hada', 'acero'], [E(957, 'Tinkatink', 26), E(959, 'Tinkaton', 76)]),
  // Charcadet evoluciona a uno de los dos, nunca a los dos: cada ejemplar coge rama
  L('charcadet', 'paldea', 'raro', ['fuego'], [E(935, 'Charcadet', 30)],
    [E(936, 'Armarouge', 78, ['fuego', 'psiquico']), E(937, 'Ceruledge', 78, ['fuego', 'fantasma'])]),

  // Comunes de ruta (segunda tanda: más variedad para que no se repita el mismo bicho)
  L('sentret', 'johto', 'comun', ['normal'], [E(161, 'Sentret', 20), E(162, 'Furret', 52)]),
  L('hoothoot', 'johto', 'comun', ['normal', 'volador'], [E(163, 'Hoothoot', 22), E(164, 'Noctowl', 56)]),
  L('chinchou', 'johto', 'comun', ['agua', 'electrico'], [E(170, 'Chinchou', 24), E(171, 'Lanturn', 58)]),
  L('wooper', 'johto', 'comun', ['agua', 'tierra'], [E(194, 'Wooper', 20), E(195, 'Quagsire', 54)]),
  L('slugma', 'johto', 'comun', ['fuego'], [E(218, 'Slugma', 22), E(219, 'Magcargo', 54, ['fuego', 'roca'])]),
  L('phanpy', 'johto', 'comun', ['tierra'], [E(231, 'Phanpy', 26), E(232, 'Donphan', 62)]),
  L('teddiursa', 'johto', 'comun', ['normal'], [E(216, 'Teddiursa', 26), E(217, 'Ursaring', 64)]),
  L('swinub', 'johto', 'raro', ['hielo', 'tierra'], [E(220, 'Swinub', 24), E(221, 'Piloswine', 52), E(473, 'Mamoswine', 76)]),

  L('poochyena', 'hoenn', 'comun', ['siniestro'], [E(261, 'Poochyena', 20), E(262, 'Mightyena', 54)]),
  L('zigzagoon', 'hoenn', 'comun', ['normal'], [E(263, 'Zigzagoon', 18), E(264, 'Linoone', 52)]),
  L('wingull', 'hoenn', 'comun', ['agua', 'volador'], [E(278, 'Wingull', 20), E(279, 'Pelipper', 56)]),
  L('shroomish', 'hoenn', 'comun', ['planta'], [E(285, 'Shroomish', 22), E(286, 'Breloom', 64, ['planta', 'lucha'])]),
  L('numel', 'hoenn', 'comun', ['fuego', 'tierra'], [E(322, 'Numel', 24), E(323, 'Camerupt', 62)]),
  L('spheal', 'hoenn', 'comun', ['hielo', 'agua'], [E(363, 'Spheal', 22), E(364, 'Sealeo', 44), E(365, 'Walrein', 66)]),
  L('aron', 'hoenn', 'raro', ['acero', 'roca'], [E(304, 'Aron', 26), E(305, 'Lairon', 50), E(306, 'Aggron', 76)]),
  L('feebas', 'hoenn', 'raro', ['agua'], [E(349, 'Feebas', 12), E(350, 'Milotic', 76)]),

  L('buizel', 'sinnoh', 'comun', ['agua'], [E(418, 'Buizel', 24), E(419, 'Floatzel', 60)]),
  L('hippopotas', 'sinnoh', 'comun', ['tierra'], [E(449, 'Hippopotas', 26), E(450, 'Hippowdon', 66)]),
  L('croagunk', 'sinnoh', 'comun', ['veneno', 'lucha'], [E(453, 'Croagunk', 24), E(454, 'Toxicroak', 62)]),
  L('snover', 'sinnoh', 'comun', ['planta', 'hielo'], [E(459, 'Snover', 24), E(460, 'Abomasnow', 64)]),
  F('cranidos', 'sinnoh', ['roca'], [E(408, 'Cranidos', 34), E(409, 'Rampardos', 74)]),
  F('shieldon', 'sinnoh', ['roca', 'acero'], [E(410, 'Shieldon', 32), E(411, 'Bastiodon', 72)]),

  L('lillipup', 'unova', 'comun', ['normal'], [E(506, 'Lillipup', 20), E(507, 'Herdier', 44), E(508, 'Stoutland', 64)]),
  L('roggenrola', 'unova', 'comun', ['roca'], [E(524, 'Roggenrola', 22), E(525, 'Boldore', 46), E(526, 'Gigalith', 70)]),
  L('ferroseed', 'unova', 'comun', ['planta', 'acero'], [E(597, 'Ferroseed', 24), E(598, 'Ferrothorn', 68)]),
  L('sandile', 'unova', 'raro', ['tierra', 'siniestro'], [E(551, 'Sandile', 26), E(552, 'Krokorok', 50), E(553, 'Krookodile', 74)]),
  L('axew', 'unova', 'raro', ['dragon'], [E(610, 'Axew', 28), E(611, 'Fraxure', 54), E(612, 'Haxorus', 78)]),
  F('tirtouga', 'unova', ['agua', 'roca'], [E(564, 'Tirtouga', 32), E(565, 'Carracosta', 70)]),
  F('archen', 'unova', ['roca', 'volador'], [E(566, 'Archen', 34), E(567, 'Archeops', 74)]),

  L('fletchling', 'kalos', 'comun', ['normal', 'volador'], [E(661, 'Fletchling', 20), E(662, 'Fletchinder', 48, ['fuego', 'volador']), E(663, 'Talonflame', 68, ['fuego', 'volador'])]),
  L('espurr', 'kalos', 'comun', ['psiquico'], [E(677, 'Espurr', 22), E(678, 'Meowstic', 58)]),
  L('honedge', 'kalos', 'raro', ['acero', 'fantasma'], [E(679, 'Honedge', 28), E(680, 'Doublade', 54), E(681, 'Aegislash', 78)]),
  L('noibat', 'kalos', 'raro', ['volador', 'dragon'], [E(714, 'Noibat', 22), E(715, 'Noivern', 72)]),

  L('rockruff', 'alola', 'comun', ['roca'], [E(744, 'Rockruff', 24), E(745, 'Lycanroc', 64)]),
  L('mudbray', 'alola', 'comun', ['tierra'], [E(749, 'Mudbray', 26), E(750, 'Mudsdale', 66)]),
  L('wimpod', 'alola', 'raro', ['bicho', 'agua'], [E(767, 'Wimpod', 18), E(768, 'Golisopod', 72)]),
  L('salandit', 'alola', 'raro', ['veneno', 'fuego'], [E(757, 'Salandit', 24), E(758, 'Salazzle', 68)]),

  L('rookidee', 'galar', 'comun', ['volador'], [E(821, 'Rookidee', 20), E(822, 'Corvisquire', 46), E(823, 'Corviknight', 72, ['volador', 'acero'])]),
  L('wooloo', 'galar', 'comun', ['normal'], [E(831, 'Wooloo', 20), E(832, 'Dubwool', 58)]),
  L('hatenna', 'galar', 'raro', ['psiquico'], [E(856, 'Hatenna', 22), E(857, 'Hattrem', 48), E(858, 'Hatterene', 74, ['psiquico', 'hada'])]),
  L('impidimp', 'galar', 'raro', ['siniestro', 'hada'], [E(859, 'Impidimp', 22), E(860, 'Morgrem', 48), E(861, 'Grimmsnarl', 74)]),

  L('lechonk', 'paldea', 'comun', ['normal'], [E(915, 'Lechonk', 20), E(916, 'Oinkologne', 56)]),
  L('tandemaus', 'paldea', 'comun', ['normal'], [E(924, 'Tandemaus', 22), E(925, 'Maushold', 58)]),
  L('nacli', 'paldea', 'comun', ['roca'], [E(932, 'Nacli', 22), E(933, 'Naclstack', 48), E(934, 'Garganacl', 70)]),
  L('maschiff', 'paldea', 'comun', ['siniestro'], [E(942, 'Maschiff', 24), E(943, 'Mabosstiff', 62)]),
  L('cetoddle', 'paldea', 'comun', ['hielo'], [E(974, 'Cetoddle', 26), E(975, 'Cetitan', 66)]),
  L('frigibax', 'paldea', 'pseudo', ['dragon', 'hielo'], [E(996, 'Frigibax', 30), E(997, 'Arctibax', 56), E(998, 'Baxcalibur', 86)]),

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
  L('zacian', 'galar', 'legendario', ['hada'], [E(888, 'Zacian', 98)]),
  L('koraidon', 'paldea', 'legendario', ['lucha', 'dragon'], [E(1007, 'Koraidon', 97)]),
  L('mew', 'kanto', 'legendario', ['psiquico'], [E(151, 'Mew', 96)]),
];

export const PORLINEA = Object.fromEntries(LINEAS.map(l => [l.id, l]));
export const INICIALES = LINEAS.filter(l => l.rareza === 'inicial');

export const PESO_RAREZA = { comun: 60, raro: 22, pseudo: 6, inicial: 12, legendario: 0 };

// Rivales: nombres de la versión española de los juegos
export const NOMBRES_RIVAL = [
  'Azul', 'Plata', 'Bruno', 'Bárbara', 'Cheren', 'Bel', 'Calem', 'Serena',
  'Gladio', 'Hop', 'Roxy', 'Nemona', 'Arven', 'Hugo', 'Silvia', 'Aroa',
];

export const APODOS_PRENSA = [
  'el Meteoro', 'el Rompeligas', 'la Sorpresa', 'el Muro', 'el Fenómeno',
  'la Tormenta', 'el Impredecible', 'la Máquina', 'el Chaval', 'el Elegido',
];

// ── Personajes (nombres de la versión española) ──────────────────────────────
export const PROFESORES = [
  { nombre: 'el Profesor Oak', region: 'kanto' },
  { nombre: 'el Profesor Elm', region: 'johto' },
  { nombre: 'el Profesor Abedul', region: 'hoenn' },
  { nombre: 'el Profesor Serbal', region: 'sinnoh' },
  { nombre: 'la Profesora Encina', region: 'unova' },
  { nombre: 'el Profesor Ciprés', region: 'kalos' },
  { nombre: 'el Profesor Kukui', region: 'alola' },
  { nombre: 'la Profesora Magnolia', region: 'galar' },
  { nombre: 'la Profesora Turo', region: 'paldea' },
];

export const VILLANOS = [
  { nombre: 'Giovanni', equipo: 'el Team Rocket', region: 'kanto' },
  // En Johto el Team Rocket lo dirige Atlas, líder provisional sin Giovanni
  { nombre: 'Atlas', equipo: 'el Team Rocket', region: 'johto' },
  { nombre: 'Aquiles', equipo: 'el Equipo Aqua', region: 'hoenn' },
  { nombre: 'Magno', equipo: 'el Equipo Magma', region: 'hoenn' },
  { nombre: 'Helio', equipo: 'el Equipo Galaxia', region: 'sinnoh' },
  { nombre: 'Ghechis', equipo: 'el Equipo Plasma', region: 'unova' },
  { nombre: 'Lysson', equipo: 'el Equipo Flare', region: 'kalos' },
  { nombre: 'Guzmán', equipo: 'el Team Skull', region: 'alola' },
  { nombre: 'Rose', equipo: 'Macro Cosmos', region: 'galar' },
  { nombre: 'Cabeza', equipo: 'el Team Star', region: 'paldea' },
];

export const CAMPEONES = [
  { nombre: 'Lance', region: 'kanto' }, { nombre: 'Plubio', region: 'johto' },
  { nombre: 'Máximo', region: 'hoenn' }, { nombre: 'Cintia', region: 'sinnoh' },
  { nombre: 'Mirto', region: 'unova' }, { nombre: 'Dianta', region: 'kalos' },
  { nombre: 'Kahili', region: 'alola' }, { nombre: 'Lionel', region: 'galar' },
  { nombre: 'Ságita', region: 'paldea' },
];

export const LIDERES = [
  { nombre: 'Brock', region: 'kanto', tipo: 'roca' },
  { nombre: 'Misty', region: 'kanto', tipo: 'agua' },
  { nombre: 'el Teniente Surge', region: 'kanto', tipo: 'electrico' },
  { nombre: 'Erika', region: 'kanto', tipo: 'planta' },
  { nombre: 'Sabrina', region: 'kanto', tipo: 'psiquico' },
  { nombre: 'Pegaso', region: 'johto', tipo: 'volador' },
  { nombre: 'Morti', region: 'johto', tipo: 'fantasma' },
  { nombre: 'Norman', region: 'hoenn', tipo: 'normal' },
  // Vito y Leti son mellizos y llevan juntos el gimnasio psíquico de Algaria
  { nombre: 'Vito y Leti', region: 'hoenn', tipo: 'psiquico', plural: true },
  { nombre: 'Candela', region: 'hoenn', tipo: 'fuego' },
  { nombre: 'Gardenia', region: 'sinnoh', tipo: 'planta' },
  { nombre: 'Fantina', region: 'sinnoh', tipo: 'fantasma' },
  { nombre: 'Camila', region: 'unova', tipo: 'electrico' },
  { nombre: 'Amaro', region: 'kalos', tipo: 'planta' },
  { nombre: 'Corelia', region: 'kalos', tipo: 'lucha' },
  { nombre: 'Kabu', region: 'galar', tipo: 'fuego' },
  { nombre: 'Cathy', region: 'galar', tipo: 'agua' },
  // Alola no tiene gimnasios sino pruebas: aquí valen sus kahunas y capitanes
  { nombre: 'Mayla', region: 'alola', tipo: 'roca' },
  { nombre: 'Nereida', region: 'alola', tipo: 'agua' },
  { nombre: 'Kiawe', region: 'alola', tipo: 'fuego' },
  { nombre: 'Araceli', region: 'paldea', tipo: 'bicho' },
  { nombre: 'Lima', region: 'paldea', tipo: 'fantasma' },
];

export const PERIODISTAS = ['Rafa Pokémon', 'la revista Poké-Semanal', 'el canal Liga TV', 'Radio Kanto'];

// ── Objetos (iconos de github.com/msikma/pokesprite) ────────────────────────
// efecto: modificadores pasivos que se aplican cada temporada o al calcular.
export const OBJETOS = [
  { id: 'aranja',   nombre: 'Huerto de Bayas Aranja', icono: 'oran',        desc: 'Tus Pokémon comen mejor todo el año.', pasivo: { salud: 3 } },
  { id: 'zidra',    nombre: 'Baya Zidra',             icono: 'sitrus',      desc: 'Recuperación rápida tras cada combate.', pasivo: { salud: 2, moral: 1 } },
  { id: 'zanama',   nombre: 'Baya Zanama',            icono: 'leppa',       desc: 'Aguantáis rondas más largas.', pasivo: { estrategia: 1 } },
  { id: 'vidasfera',nombre: 'Vidasfera',              icono: 'life-orb',    desc: 'Pega muchísimo más. Pasa factura.', pasivo: { media: 3, salud: -3 } },
  { id: 'restos',   nombre: 'Restos',                 icono: 'leftovers',   desc: 'Desgaste mucho más lento.', pasivo: { salud: 4 } },
  { id: 'huevosuerte', nombre: 'Huevo Suerte',        icono: 'lucky-egg',   desc: 'Aprendes el doble de rápido.', pasivo: { crecimiento: 0.5 } },
  { id: 'multiexp', nombre: 'Multiexp',               icono: 'exp-share',   desc: 'Todo el equipo progresa contigo.', pasivo: { vinculo: 2, crecimiento: 0.3 } },
  { id: 'cintaeleccion', nombre: 'Cinta Elección',    icono: 'choice-band', desc: 'Fuerza bruta a cambio de opciones.', pasivo: { media: 2, estrategia: -2 } },
  { id: 'panueloeleccion', nombre: 'Pañuelo Elección',icono: 'choice-scarf',desc: 'Siempre golpeas primero.', pasivo: { media: 2 } },
  { id: 'bandafocus', nombre: 'Banda Focus',          icono: 'focus-sash',  desc: 'Nunca caes al primer golpe.', pasivo: { salud: 2, moral: 2 } },
  { id: 'cintaexperto', nombre: 'Cinta Experto',      icono: 'expert-belt', desc: 'Premia saberse las debilidades.', pasivo: { estrategia: 3 } },
  { id: 'amuleto',  nombre: 'Amuleto Moneda',         icono: 'amulet-coin', desc: 'Los premios cunden el doble.', pasivo: { dineroExtra: 25000 } },
  { id: 'chaleco',  nombre: 'Chaleco Asalto',         icono: 'assault-vest',desc: 'Aguantáis lo que os echen.', pasivo: { salud: 3, estrategia: -1 } },
  { id: 'mineral',  nombre: 'Mineral Evolutivo',      icono: 'eviolite',    desc: 'Los que aún no evolucionan rinden como si lo hubieran hecho.', pasivo: { media: 2 } },
  { id: 'casco',    nombre: 'Casco Dentado',          icono: 'rocky-helmet',desc: 'Quien te pega, se hace daño.', pasivo: { media: 1, salud: 1 } },
  { id: 'cintamusculo', nombre: 'Cinta Músculo',      icono: 'muscle-band', desc: 'Entrenamiento de fuerza continuo.', pasivo: { media: 2, salud: -1 } },
  { id: 'garrarapida', nombre: 'Garra Rápida',        icono: 'quick-claw',  desc: 'A veces la suerte va contigo.', pasivo: { suerte: 3 } },
  { id: 'campanaconcha', nombre: 'Campana Concha',    icono: 'shell-bell',  desc: 'Te curas con cada victoria.', pasivo: { salud: 2, vinculo: 1 } },
  { id: 'cinturon', nombre: 'Cinturón Negro',         icono: 'black-belt',  desc: 'Disciplina de dojo.', pasivo: { media: 2 } },
  { id: 'piedralunar', nombre: 'Piedra Lunar',        icono: 'moon-stone',  desc: 'Una evolución esperando su momento.', pasivo: {} },
  { id: 'eterna',   nombre: 'Piedra Eterna',          icono: 'everstone',   desc: 'Guardada por si algún día quieres frenar el tiempo.', pasivo: {} },
  { id: 'masterball', nombre: 'Master Ball',          icono: 'master',      desc: 'Una sola. Nunca falla.', pasivo: {} },
  { id: 'maxrevivir', nombre: 'Máx. Revivir',         icono: 'max-revive',  desc: 'El seguro de vida del equipo.', pasivo: { salud: 2 } },
  { id: 'brillo',   nombre: 'Polvo Brillo',           icono: 'bright-powder', desc: 'Los rivales fallan más de la cuenta.', pasivo: { suerte: 2 } },
];

export const POROBJETO = Object.fromEntries(OBJETOS.map(o => [o.id, o]));
export const iconoObjeto = icono => `objetos/${icono}.png`;

// ── Logros de carrera ────────────────────────────────────────────────────────
// Se evalúan al retirarte; cada uno es una tarjeta en la pantalla final.
export const LOGROS = [
  { id: 'campeon', emoji: '🏆', nombre: T(`Campeón`, `Champion`, `Campione`), desc: e => T(`Levantaste ${e.ligasGanadas} título${e.ligasGanadas > 1 ? 's' : ''} de Liga.`, `You lifted ${e.ligasGanadas} League title${e.ligasGanadas > 1 ? 's' : ''}.`, `Hai sollevato ${e.ligasGanadas} titolo${e.ligasGanadas > 1 ? 'i' : 'o'} di Lega.`), pista: T(`Gana un título de Liga o regional.`, `Win a League or regional title.`, `Vinci un titolo di Lega o regionale.`), cond: e => e.ligasGanadas >= 1 },
  { id: 'mundial', emoji: '🌍', nombre: T(`Campeón del Mundo`, `World Champion`, `Campione del Mondo`), desc: e => T(`${e.mundiales} Campeonato${e.mundiales > 1 ? 's' : ''} Mundial${e.mundiales > 1 ? 'es' : ''}. El mejor del planeta.`, `${e.mundiales} World Championship${e.mundiales > 1 ? 's' : ''}. The best on the planet.`, `${e.mundiales} Campionato${e.mundiales > 1 ? 'i' : ''} del Mondo. Il migliore del pianeta.`), pista: T(`Gana un Campeonato Mundial.`, `Win a World Championship.`, `Vinci un Campionato del Mondo.`), cond: e => e.mundiales >= 1 },
  { id: 'dominio', emoji: '👑', nombre: T(`Dinastía`, `Dynasty`, `Dinastia`), desc: () => T(`Tres o más títulos: no fue suerte.`, `Three or more titles: it wasn't luck.`, `Tre o più titoli: non è stata fortuna.`), pista: T(`Tres títulos en una misma carrera.`, `Three titles in a single career.`, `Tre titoli in una sola carriera.`), cond: e => e.titulos.length >= 3 },
  { id: 'ochomedallas', emoji: '🎖️', nombre: T(`Las ocho medallas`, `The Eight Badges`, `Le otto medaglie`), desc: e => T(`Completaste el circuito de ${e.regionNombre}.`, `You completed the ${e.regionNombre} circuit.`, `Hai completato il circuito di ${e.regionNombre}.`), pista: T(`Consigue las 8 medallas de una región.`, `Get all 8 badges of a region.`, `Ottieni tutte le 8 medaglie di una regione.`), cond: e => e.medallas >= 8 },
  { id: 'coleccionista', emoji: '📦', nombre: T(`Coleccionista`, `Collector`, `Collezionista`), desc: e => T(`${e.capturasTotales} Pokémon distintos pasaron por tu equipo.`, `${e.capturasTotales} different Pokémon passed through your team.`, `${e.capturasTotales} Pokémon diversi sono passati per la tua squadra.`), pista: T(`Doce Pokémon distintos en tu equipo.`, `Twelve different Pokémon on your team.`, `Dodici Pokémon diversi nella tua squadra.`), cond: e => e.capturasTotales >= 12 },
  { id: 'legendario', emoji: '⚡', nombre: T(`Domador de leyendas`, `Legend Tamer`, `Domatore di leggende`), desc: () => T(`Capturaste un Pokémon legendario. Casi nadie puede decirlo.`, `You caught a legendary Pokémon. Almost nobody can say that.`, `Hai catturato un Pokémon leggendario. Quasi nessuno può dirlo.`), pista: T('Captura un Pokémon legendario.', 'Catch a legendary Pokémon.', 'Cattura un Pokémon leggendario.'), cond: e => e.equipo.some(p => p.rareza === 'legendario') },
  { id: 'pseudo', emoji: '🐲', nombre: T(`Criador de dragones`, `Dragon Breeder`, `Allevatore di draghi`), desc: () => T(`Criaste un pseudolegendario desde su primera etapa.`, `You raised a pseudo-legendary from its first stage.`, `Hai allevato uno pseudo-leggendario dalla sua prima forma.`), pista: T(`Evoluciona un pseudolegendario.`, `Evolve a pseudo-legendary.`, `Fai evolvere uno pseudo-leggendario.`), cond: e => e.equipo.some(p => p.rareza === 'pseudo' && p.etapa >= 2) },
  { id: 'fiel', emoji: '💚', nombre: T(`Hasta el final`, `To the End`, `Fino alla fine`), desc: () => T(`Tu primer compañero siguió contigo toda la carrera.`, `Your first partner stayed with you the whole career.`, `Il tuo primo compagno è rimasto con te per tutta la carriera.`), pista: T(`Retírate con tu primer compañero.`, `Retire with your first partner.`, `Ritirati con il tuo primo compagno.`), cond: e => e.equipo.some(p => p.uid === e.socio && !p.retirado) },
  { id: 'vinculo', emoji: '🫂', nombre: T(`Alma gemela`, `Soulmate`, `Anima gemella`), desc: () => T(`Vínculo máximo con tu equipo. Se lanzarían al fuego por ti.`, `Maximum bond with your team. They'd walk through fire for you.`, `Legame massimo con la tua squadra. Si getterebbero nel fuoco per te.`), pista: T(`Llega a 90 de vínculo con tu equipo.`, `Reach 90 bond with your team.`, `Raggiungi 90 di legame con la squadra.`), cond: e => e.stats.vinculo >= 90 },
  { id: 'idolo', emoji: '📣', nombre: T(`Ídolo de masas`, `Fan Favorite`, `Idolo delle masse`), desc: () => T(`Fama por encima de 85. Te paran por la calle.`, `Fame above 85. People stop you in the street.`, `Fama sopra 85. La gente ti ferma per strada.`), pista: T(`Llega a 85 de fama.`, `Reach 85 fame.`, `Raggiungi 85 di fama.`), cond: e => e.stats.fama >= 85 },
  { id: 'millonario', emoji: '💰', nombre: T(`Millonario`, `Millionaire`, `Milionario`), desc: e => T(`Te retiraste con ${Math.round(e.dinero / 1000)}k ₽ en el banco.`, `You retired with ${Math.round(e.dinero / 1000)}k ₽ in the bank.`, `Ti sei ritirato con ${Math.round(e.dinero / 1000)}k ₽ in banca.`), pista: T(`Retírate con un millón en el banco.`, `Retire with a million in the bank.`, `Ritirati con un milione in banca.`), cond: e => e.dinero >= 1000000 },
  { id: 'hierro', emoji: '🦾', nombre: T(`De hierro`, `Iron Body`, `Di ferro`), desc: () => T(`Ni una sola lesión grave en toda la carrera. Otra pasta.`, `Not a single serious injury the whole career. Different breed.`, `Nemmeno un infortunio serio in tutta la carriera. Un'altra pasta.`), pista: T(`Acaba sin lesiones crónicas.`, `Finish with no chronic injuries.`, `Finisci senza infortuni cronici.`), cond: e => !e.flags.lesionCronica && e.stats.salud >= 55 },
  { id: 'eterno', emoji: '⏳', nombre: T(`Eterno`, `Eternal`, `Eterno`), desc: e => T(`Competiste hasta los ${e.edad}.`, `You competed until age ${e.edad}.`, `Hai gareggiato fino a ${e.edad} anni.`), pista: T(`Sigue compitiendo a los 32.`, `Still competing at 32.`, `Ancora in gara a 32 anni.`), cond: e => e.edad >= 32 },
  { id: 'trotamundos', emoji: '✈️', nombre: T(`Trotamundos`, `Globetrotter`, `Giramondo`), desc: e => T(`Compitiste en ${e.regionesVisitadas.length} regiones distintas.`, `You competed in ${e.regionesVisitadas.length} different regions.`, `Hai gareggiato in ${e.regionesVisitadas.length} regioni diverse.`), pista: T(`Compite en tres regiones distintas.`, `Compete in three different regions.`, `Gareggia in tre regioni diverse.`), cond: e => e.regionesVisitadas.length >= 3 },
  { id: 'lider', emoji: '🏛️', nombre: T(`Líder de Gimnasio`, `Gym Leader`, `Capopalestra`), desc: () => T(`Te dieron un gimnasio propio y lo aceptaste.`, `You were given your own gym and accepted.`, `Ti hanno offerto una palestra tutta tua e hai accettato.`), pista: T(`Acepta un gimnasio propio.`, `Accept your own gym.`, `Accetta una palestra tua.`), cond: e => !!e.flags.liderGimnasio },
  { id: 'altomando', emoji: '🛡️', nombre: T(`Alto Mando`, `Elite Four`, `Alto Comando`), desc: () => T(`Ocupaste una silla del Alto Mando.`, `You took a seat on the Elite Four.`, `Hai occupato un seggio dell'Alto Comando.`), pista: T(`Ocupa una silla del Alto Mando.`, `Take a seat on the Elite Four.`, `Occupa un seggio dell’Alto Comando.`), cond: e => !!e.flags.altoMando },
  { id: 'heroe', emoji: '🦸', nombre: T(`Héroe`, `Hero`, `Eroe`), desc: () => T(`Plantaste cara al crimen organizado cuando nadie más lo hizo.`, `You stood up to organized crime when no one else did.`, `Hai affrontato il crimine organizzato quando nessun altro lo ha fatto.`), pista: T(`Planta cara al crimen organizado.`, `Stand up to organized crime.`, `Affronta il crimine organizzato.`), cond: e => !!e.flags.heroe },
  { id: 'villano', emoji: '🕳️', nombre: T(`Zonas grises`, `Gray Areas`, `Zone grigie`), desc: () => T(`Cobraste por mirar hacia otro lado. Tú sabrás.`, `You got paid to look the other way. You know it.`, `Sei stato pagato per guardare altrove. Tu lo sai.`), pista: T(`Cobra por mirar hacia otro lado.`, `Get paid to look away.`, `Fatti pagare per guardare altrove.`), cond: e => !!e.flags.traicion },
  { id: 'sancionado', emoji: '⛔', nombre: T(`El sancionado`, `The Suspended`, `Il sospeso`), desc: () => T(`La federación te apartó del circuito. Volviste igual.`, `The federation pulled you from the circuit. You came back anyway.`, `La federazione ti ha allontanato dal circuito. Sei tornato comunque.`), pista: T(`Que te sancionen, y vuelve.`, `Get suspended, then come back.`, `Fatti sospendere, poi torna.`), cond: e => !!e.flags.exsancionado },
  { id: 'nemesis', emoji: '⚔️', nombre: T(`El duelo eterno`, `The Eternal Duel`, `Il duello eterno`), desc: e => T(`Le ganaste la carrera a ${e.rival.nombre} por ${e.rival.derrotasTuyas}-${e.rival.victoriasSuyas}.`, `You beat ${e.rival.nombre} over the career, ${e.rival.derrotasTuyas}-${e.rival.victoriasSuyas}.`, `Hai battuto ${e.rival.nombre} nella carriera, ${e.rival.derrotasTuyas}-${e.rival.victoriasSuyas}.`), pista: T(`Gánale a tu rival por tres o más.`, `Beat your rival by three wins or more.`, `Batti il tuo rivale per tre vittorie o più.`), cond: e => e.rival.derrotasTuyas > e.rival.victoriasSuyas && e.rival.derrotasTuyas >= 3 },
  { id: 'maquina', emoji: '💥', nombre: T(`La máquina`, `The Machine`, `La macchina`), desc: e => T(`${e.victorias} victorias en la carrera.`, `${e.victorias} wins in your career.`, `${e.victorias} vittorie nella carriera.`), pista: T(`Suma 300 victorias en tu carrera.`, `Reach 300 wins in your career.`, `Raggiungi 300 vittorie in carriera.`), cond: e => e.victorias >= 300 },
  { id: 'invicto', emoji: '📈', nombre: T(`Récord impecable`, `Flawless Record`, `Record impeccabile`), desc: e => T(`${e.victorias}-${e.derrotas}: ganaste el triple de lo que perdiste.`, `${e.victorias}-${e.derrotas}: you won triple what you lost.`, `${e.victorias}-${e.derrotas}: hai vinto il triplo di quanto hai perso.`), pista: T(`Gana el triple de lo que pierdes.`, `Win triple what you lose.`, `Vinci il triplo di quanto perdi.`), cond: e => e.victorias > e.derrotas * 3 },
  { id: 'techo', emoji: '🚀', nombre: T(`Los noventa`, `The Nineties`, `I novanta`), desc: e => T(`Alcanzaste una media de ${Math.round(e.media)}. Ahí arriba no hay casi nadie.`, `You reached a rating of ${Math.round(e.media)}. Almost nobody gets up there.`, `Hai raggiunto una media di ${Math.round(e.media)}. Lassù non c'è quasi nessuno.`), pista: T(`Alcanza una media de 90.`, `Reach a rating of 90.`, `Raggiungi una media di 90.`), cond: e => e.media >= 90 },
  { id: 'maestroobj', emoji: '🎒', nombre: T(`Mochila legendaria`, `Legendary Backpack`, `Zaino leggendario`), desc: e => T(`Reuniste ${e.objetos.length} objetos de entrenamiento.`, `You collected ${e.objetos.length} training items.`, `Hai raccolto ${e.objetos.length} oggetti d'allenamento.`), pista: T(`Reúne cinco objetos de entrenamiento.`, `Collect five training items.`, `Raccogli cinque oggetti d’allenamento.`), cond: e => e.objetos.length >= 5 },
  { id: 'santuario', emoji: '🏞️', nombre: T(`El santuario`, `The Sanctuary`, `Il santuario`), desc: () => T(`Fundaste un refugio para Pokémon retirados.`, `You founded a sanctuary for retired Pokémon.`, `Hai fondato un santuario per Pokémon in pensione.`), pista: T(`Funda un refugio para retirados.`, `Found a sanctuary for retirees.`, `Fonda un santuario per i pensionati.`), cond: e => !!e.flags.santuario },
  { id: 'maestro', emoji: '🌱', nombre: T(`Maestro de una generación`, `Mentor of a Generation`, `Maestro di una generazione`), desc: () => T(`Formaste al que vino después de ti.`, `You trained the one who came after you.`, `Hai formato chi è venuto dopo di te.`), pista: T(`Forma al que viene detrás de ti.`, `Train the one who comes after you.`, `Forma chi viene dopo di te.`), cond: e => !!e.flags.discipulo },
  { id: 'retirodigno', emoji: '🎬', nombre: T(`Se fue por la puerta grande`, `Went Out on Top`, `Se n’è andato in grande stile`), desc: () => T(`Elegiste tú cuándo parar, sin que nadie te empujara.`, `You chose when to stop, with nobody pushing you.`, `Hai scelto tu quando fermarti, senza che nessuno ti spingesse.`), pista: T(`Retírate cuando lo decidas tú.`, `Retire on your own terms.`, `Ritirati quando decidi tu.`), cond: e => e.causaRetiro === 'eleccion' },
];

// ── Rangos finales por puntuación de legado ─────────────────────────────────
export const RANGOS = [
  // Leyenda pide llegar de verdad a los noventa, no solo acumular trofeos
  { min: 1790, minMedia: 90, titulo: T(`Leyenda Inmortal`, `Immortal Legend`, `Leggenda Immortale`), emoji: '🌟', desc: T(`Media de 90 y una vitrina imposible. Tu nombre está en los libros de texto.`, `A 90 rating and an impossible trophy case. Your name is in the history books.`, `Media di 90 e una bacheca impossibile. Il tuo nome è nei libri di storia.`) },
  { min: 1380,  titulo: T(`Maestro Pokémon`, `Pokémon Master`, `Maestro Pokémon`),       emoji: '👑', desc: T(`Llegaste a la cima y te quedaste allí. Nadie discute tu lugar.`, `You reached the top and stayed there. Nobody disputes your place.`, `Sei arrivato in cima e ci sei rimasto. Nessuno discute il tuo posto.`) },
  { min: 1020,  titulo: T(`Campeón Regional`, `Regional Champion`, `Campione Regionale`),      emoji: '🏆', desc: T(`Levantaste la copa. La región entera coreó tu nombre.`, `You lifted the cup. The whole region chanted your name.`, `Hai sollevato la coppa. Tutta la regione ha gridato il tuo nome.`) },
  { min: 855,  titulo: T(`Élite del Circuito`, `Circuit Elite`, `Élite del Circuito`),    emoji: '🥇', desc: T(`Uno de los grandes de tu generación, aunque el título máximo se te resistió.`, `One of the greats of your generation, though the top title stayed out of reach.`, `Uno dei grandi della tua generazione, anche se il titolo massimo ti è sfuggito.`) },
  { min: 758,  titulo: T(`Profesional Respetado`, `Respected Professional`, `Professionista Rispettato`), emoji: '🎖️', desc: T(`Viviste de esto con dignidad. Muchos matarían por tu carrera.`, `You made a dignified living from this. Many would kill for your career.`, `Hai vissuto di questo con dignità. Molti ucciderebbero per la tua carriera.`) },
  { min: 643,  titulo: T(`Veterano de Circuito`, `Circuit Veteran`, `Veterano del Circuito`),  emoji: '🎽', desc: T(`Aguantaste años ahí arriba sin llegar a lo más alto.`, `You held on for years up there without reaching the very top.`, `Hai resistito anni lassù senza arrivare in vetta.`) },
  { min: 500,  titulo: T(`Entrenador Sólido`, `Solid Trainer`, `Allenatore Solido`),     emoji: '⚡', desc: T(`Buenos momentos, buen equipo, ningún titular de portada.`, `Good moments, a good team, no front-page headlines.`, `Bei momenti, buona squadra, nessun titolo in prima pagina.`) },
  { min: 360,  titulo: T(`Promesa Incumplida`, `Unfulfilled Promise`, `Promessa Non Mantenuta`),    emoji: '🌱', desc: T(`Todos decían que ibas a ser el mejor. La vida dijo otra cosa.`, `Everyone said you'd be the best. Life had other plans.`, `Tutti dicevano che saresti stato il migliore. La vita ha detto altro.`) },
  { min: -999, titulo: T(`Entrenador de Pueblo`, `Hometown Trainer`, `Allenatore di Paese`),  emoji: '🍃', desc: T(`Volviste a casa. Tus Pokémon te siguen queriendo igual.`, `You went back home. Your Pokémon still love you just the same.`, `Sei tornato a casa. I tuoi Pokémon ti vogliono bene lo stesso.`) },
];

// Sprites vendorizados desde github.com/PokeAPI/sprites
export const spriteUrl = (dex, shiny = false) => `sprites/${shiny ? 'shiny/' : ''}${dex}.png`;
