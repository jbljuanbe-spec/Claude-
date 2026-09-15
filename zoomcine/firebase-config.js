// Configuración de tu proyecto Firebase (gratis, plan Spark).
// 1. Ve a https://console.firebase.google.com/ y crea un proyecto.
// 2. Dentro del proyecto: icono "</>" (añadir app web) y copia el objeto de configuración aquí abajo.
// 3. En el menú lateral, activa "Realtime Database" (no Firestore) y crea la base.
// 4. En la pestaña "Reglas" de Realtime Database, pon temporalmente:
//    { "rules": { "salas": { "$codigo": { ".read": true, ".write": true } } } }
//    (es una app de fiesta entre amigos, sin login: cualquiera con el código de sala
//    puede leer/escribir esa sala concreta, nada más).
const FIREBASE_CONFIG = {
  apiKey: 'TU_API_KEY',
  authDomain: 'TU_PROYECTO.firebaseapp.com',
  databaseURL: 'https://TU_PROYECTO-default-rtdb.firebaseio.com',
  projectId: 'TU_PROYECTO',
  storageBucket: 'TU_PROYECTO.appspot.com',
  messagingSenderId: 'TU_SENDER_ID',
  appId: 'TU_APP_ID',
};
