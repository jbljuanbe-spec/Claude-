// Configuración del proyecto Firebase "Pelis" (pelis-e71ea).
// Falta databaseURL: menú lateral > Compilación > Realtime Database > Crear
// base de datos (modo de prueba). Al crearla, copia aquí la URL que te dé
// (algo como https://pelis-e71ea-default-rtdb.europe-west1.firebasedatabase.app).
// Luego, en la pestaña "Reglas" de esa Realtime Database, pon:
//    { "rules": { "salas": { "$codigo": { ".read": true, ".write": true } } } }
//    (app de fiesta entre amigos, sin login: cualquiera con el código de sala
//    puede leer/escribir esa sala concreta, nada más).
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBSOnnrJxuiNDI2kiDkStjogwnznqp3jhM',
  authDomain: 'pelis-e71ea.firebaseapp.com',
  databaseURL: 'TU_DATABASE_URL',
  projectId: 'pelis-e71ea',
  storageBucket: 'pelis-e71ea.firebasestorage.app',
  messagingSenderId: '519705654138',
  appId: '1:519705654138:web:a85d47c58048d9ae539cc3',
};
