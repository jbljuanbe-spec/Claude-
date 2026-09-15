// Capa de datos del multijugador: salas en Firebase Realtime Database.
// No toca el DOM; eso vive en game.js.

let firebaseApp = null;

function firebaseListo() {
  return FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey !== 'TU_API_KEY';
}

function initFirebase() {
  if (firebaseApp) return;
  firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
}

function idAleatorio() {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map(b => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

function codigoSalaAleatorio() {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O/1/I para evitar confusiones
  let codigo = '';
  for (let i = 0; i < 4; i++) codigo += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  return codigo;
}

function salaRef(codigo) {
  return firebase.database().ref('salas/' + codigo);
}

async function crearSala(nombreAnfitrion, modo, rondasPorJugador) {
  initFirebase();
  const codigo = codigoSalaAleatorio();
  const miId = idAleatorio();
  const sala = {
    creadoEn: Date.now(),
    anfitrionId: miId,
    estadoSala: 'lobby',
    modo,
    rondasPorJugador,
    ordenJugadores: [miId],
    jugadores: { [miId]: { nombre: nombreAnfitrion, puntos: 0, racha: 0, mejorRacha: 0, conectado: true } },
  };
  await salaRef(codigo).set(sala);
  salaRef(codigo).child(`jugadores/${miId}/conectado`).onDisconnect().set(false);
  return { codigo, miId };
}

async function unirseSala(codigoIntroducido, nombre) {
  initFirebase();
  const codigo = codigoIntroducido.trim().toUpperCase();
  const ref = salaRef(codigo);
  const snap = await ref.get();
  if (!snap.exists()) throw new Error('sala-no-existe');
  const sala = snap.val();
  if (sala.estadoSala !== 'lobby') throw new Error('sala-empezada');
  const miId = idAleatorio();
  const orden = [...(sala.ordenJugadores || []), miId];
  await ref.update({
    [`jugadores/${miId}`]: { nombre, puntos: 0, racha: 0, mejorRacha: 0, conectado: true },
    ordenJugadores: orden,
  });
  ref.child(`jugadores/${miId}/conectado`).onDisconnect().set(false);
  return { codigo, miId };
}

function escucharSala(codigo, callback) {
  salaRef(codigo).on('value', snap => callback(snap.val()));
}

function dejarDeEscuchar(codigo) {
  salaRef(codigo).off();
}

function actualizarSala(codigo, cambios) {
  return salaRef(codigo).update(cambios);
}
