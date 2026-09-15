// Configuración del proyecto Firebase "Pelis" (pelis-e71ea).
// Reglas de la Realtime Database (pestaña "Reglas"), app de fiesta entre
// amigos sin login: cualquiera con el código de sala puede leer/escribir
// esa sala concreta, nada más:
//    { "rules": { "salas": { "$codigo": { ".read": true, ".write": true } } } }
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBSOnnrJxuiNDI2kiDkStjogwnznqp3jhM',
  authDomain: 'pelis-e71ea.firebaseapp.com',
  databaseURL: 'https://pelis-e71ea-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'pelis-e71ea',
  storageBucket: 'pelis-e71ea.firebasestorage.app',
  messagingSenderId: '519705654138',
  appId: '1:519705654138:web:a85d47c58048d9ae539cc3',
};
