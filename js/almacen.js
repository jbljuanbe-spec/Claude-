// Persistencia local en el navegador: IndexedDB con un almacén clave-valor.
// Se pide almacenamiento persistente para minimizar el riesgo de borrado por limpieza.

const NOMBRE_DB = 'kotoba';
const ALMACEN = 'kv';

let dbPromesa = null;

function abrir() {
  if (dbPromesa) return dbPromesa;
  dbPromesa = new Promise((resolver, rechazar) => {
    const pet = indexedDB.open(NOMBRE_DB, 1);
    pet.onupgradeneeded = () => pet.result.createObjectStore(ALMACEN);
    pet.onsuccess = () => resolver(pet.result);
    pet.onerror = () => rechazar(pet.error);
  });
  return dbPromesa;
}

export async function leer(clave) {
  const db = await abrir();
  return new Promise((resolver, rechazar) => {
    const pet = db.transaction(ALMACEN, 'readonly').objectStore(ALMACEN).get(clave);
    pet.onsuccess = () => resolver(pet.result);
    pet.onerror = () => rechazar(pet.error);
  });
}

export async function guardar(clave, valor) {
  const db = await abrir();
  return new Promise((resolver, rechazar) => {
    const tx = db.transaction(ALMACEN, 'readwrite');
    tx.objectStore(ALMACEN).put(valor, clave);
    tx.oncomplete = () => resolver();
    tx.onerror = () => rechazar(tx.error);
  });
}

export async function pedirPersistencia() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      return await navigator.storage.persist();
    }
  } catch { /* no pasa nada */ }
  return false;
}
