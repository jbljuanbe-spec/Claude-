// data.js — Datos del juego ICEX Milán. Todo lo narrativo/generativo vive aquí.

const BECARIOS = [
  { id: "jorge",    nombre: "Jorge",   img: "img/jorge.jpg",    jefe: "andrea"    },
  { id: "juan_m",   nombre: "Juan M",  img: "img/juan_m.jpg",   jefe: "francesco" },
  { id: "juan_b",   nombre: "Juan B",  img: "img/juan_b.jpg",   jefe: "francesco" },
  { id: "gemma",    nombre: "Gemma",   img: "img/gemma.jpg",    jefe: "andrea"    },
  { id: "graciela", nombre: "Graciela",img: "img/graciela.jpg", jefe: "andrea"    },
  { id: "clara",    nombre: "Clara",   img: "img/clara.jpg",    jefe: "andrea"    },
  { id: "emma",     nombre: "Emma",    img: "img/emma.jpg",     jefe: "francesco" },
  { id: "luca",     nombre: "Luca",    img: "img/luca.jpg",     jefe: "francesco" },
];

const JEFES = {
  andrea:    { nombre: "Andrea",    rol: "Jefa de sector", severidad: 0.55, avatar: "A", color: "#8a5a44" },
  francesco: { nombre: "Francesco", rol: "Jefe de sector", severidad: 0.55, avatar: "F", color: "#3f5a70" },
  luis:      { nombre: "Luis",      rol: "Jefe Supremo",   severidad: 0.9,  avatar: "L", color: "#6b1f1f" },
};

// Sectores y regiones para generación procedural.
const SECTORES = ["Agroalimentario", "Calzado", "Moda", "Maquinaria", "Vino", "Mueble", "Automoción", "Farmacéutico"];
const REGIONES = ["Lombardía", "Piamonte", "Véneto", "Emilia-Romaña", "Toscana", "Liguria"];
const CIUDADES_OK = {
  "Lombardía": "Milán", "Piamonte": "Turín", "Véneto": "Venecia",
  "Emilia-Romaña": "Bolonia", "Toscana": "Florencia", "Liguria": "Génova",
};
const CIUDADES_MAL = ["Roma", "Nápoles", "Palermo", "Bari", "Cagliari"]; // fuera de región => discrepancia

const EMPRESAS = [
  "Embutidos García", "Calzados Hermanos Ruiz", "Textiles del Segura", "Bodegas Valdemar",
  "Maquinaria Ibérica SL", "Muebles Levante", "AutoPartes Norte", "Farma Andalucía",
  "Conservas Atlántico", "Jamones La Dehesa", "Cerámica Mediterránea", "Aceites del Sur",
];

const TIPOS_DOC = {
  DRAFT:        "Borrador de correo",
  FAIR_REPORT:  "Informe de Feria",
  MARKET_STUDY: "Estudio de Mercado",
};

// Catálogo de gazapos de IA. Cada uno inyecta una frase marcable en el documento.
// tipo: identificador; critico: si delata uso de IA de forma flagrante.
const GAZAPOS = {
  AI_DISCLAIMER: {
    critico: true,
    etiqueta: "Se delata como IA",
    frases: [
      "Como modelo de lenguaje, no tengo acceso a datos actualizados sobre este sector.",
      "Como inteligencia artificial, no puedo navegar por internet para verificar estas cifras.",
      "Lo siento, pero como IA no dispongo de información posterior a mi fecha de corte.",
    ],
  },
  META_INSTRUCTION: {
    critico: true,
    etiqueta: "Filtra el prompt",
    frases: [
      "Claro, aquí tienes el informe que me has pedido con un tono formal y profesional:",
      "¡Por supuesto! Encantado de ayudarte con este estudio de mercado. Aquí va:",
      "A continuación, redacto el texto solicitado siguiendo tus instrucciones:",
    ],
  },
  PLACEHOLDER: {
    critico: true,
    etiqueta: "Deja un placeholder",
    frases: [
      "Las exportaciones alcanzaron los [INSERTAR CIFRA AQUÍ] millones de euros.",
      "La empresa [NOMBRE DE LA EMPRESA] lidera el sector en la región.",
      "Se recomienda contactar con [DATO PENDIENTE] antes de la feria.",
    ],
  },
  HALLUCINATION: {
    critico: false,
    etiqueta: "Dato inventado",
    frases: [
      "Según el Tratado de Libre Comercio Italo-Manchego de 1998, los aranceles son nulos.",
      "El 187% de las empresas encuestadas mostró interés inmediato en importar.",
      "La feria contó con la asistencia confirmada del Papa y de tres astronautas.",
    ],
  },
  WRONG_TONE: {
    critico: false,
    etiqueta: "Tono incorrecto",
    frases: [
      "En plan, el mercado italiano está súper guay y mola un montón para exportar.",
      "Colega, esto de las exportaciones es un chollo que flipas, no te lo pierdas.",
      "Total, que si no vendes aquí eres tonto, para qué nos vamos a engañar.",
    ],
  },
};

// Reglas que van cambiando a lo largo de la campaña. Se activan por día.
const REGLAS_PROGRESIVAS = [
  { dia: 1,  texto: "Todo informe debe empezar mencionando la empresa y el sector." },
  { dia: 3,  texto: "Prohibido cualquier rastro de lenguaje de IA (disclaimers, 'como modelo...')." },
  { dia: 5,  texto: "El tono debe ser formal. Nada de coloquialismos ('en plan', 'colega')." },
  { dia: 8,  texto: "Verificar SIEMPRE que la ciudad citada pertenezca a la región pedida." },
  { dia: 12, texto: "Ningún documento puede contener placeholders sin rellenar." },
];

// Eventos guionizados del grupo de WhatsApp / oficina. Se muestran al inicio de días concretos.
const EVENTOS_WHATSAPP = {
  1:  [ { autor: "Graciela", texto: "Buenos días equipo!! Primer día de todos, mucho ánimo 🫠" },
        { autor: "Luca",     texto: "alguien sabe la contraseña del wifi? llevo 20 min mirando la pared" } ],
  2:  [ { autor: "Andrea",   texto: "Recordad: los informes se envían ANTES de las 17:00. No excusas." } ],
  3:  [ { autor: "Juan B",   texto: "Ojo, Luis está revisando informes él mismo esta semana. Cuidado con la IA." },
        { autor: "Emma",     texto: "a mí me pilló un 'como modelo de lenguaje' la semana pasada, casi me muero" } ],
  4:  [ { autor: "Clara",    texto: "El de la máquina de café volvió a robar mi leche de avena. Guerra." } ],
  5:  [ { autor: "Francesco",texto: "A partir de hoy, tono formal obligatorio. Andrea y yo lo vamos a mirar." } ],
  6:  [ { autor: "Jorge",    texto: "aperitivo hoy en Navigli a las 17:30, quien se apunta 🍸" } ],
  8:  [ { autor: "Andrea",   texto: "Han salido informes con ciudades que no tocan. Revisad la geografía." } ],
  10: [ { autor: "Luis",     texto: "Buenos días. Este mes he leído cada informe. Sé quién usa la maquinita." } ],
  12: [ { autor: "Gemma",    texto: "me han renovado la beca!! bueno, otros 6 meses sin cobrar apenas pero bueno" } ],
  15: [ { autor: "Emma",     texto: "hoy es el último día del mes... a ver si llega el ingreso de la beca 🙏" } ],
};

// Parámetros económicos (mensuales, prorrateados por día laborable de campaña).
const ECONOMIA = {
  becaMensual: 1100,     // beca ICEX Milán
  alquilerMensual: 850,  // habitación en Milán
  transporteMensual: 39, // abono ATM
  aperitivoDiario: 12,   // spritz + tagliere en Navigli
  comidaDiaria: 9,
  diasCampania: 15,      // 15 días laborables jugables ~ resumen de 6 meses
};
