// Misma interfaz que usaban las vistas, ahora servida por el motor local
// del navegador (sin backend): todo corre y persiste en el propio navegador.
import * as motor from './motor.js';
import { leer, guardar } from './almacen.js';

let iniciado = null;
function asegurar() {
  if (!iniciado) iniciado = motor.iniciar();
  return iniciado;
}

export const api = {
  estado: async () => {
    await asegurar();
    return { ...motor.metaApp(), resumen: motor.resumen(), racha: motor.calcularRacha() };
  },

  cola: async (limite = 20) => {
    await asegurar();
    return { cola: motor.colaDeEstudio(limite) };
  },

  responder: async (cardId, resultado) => {
    await asegurar();
    return motor.responder(cardId, resultado);
  },

  importar: async () => {
    await asegurar();
    return motor.importarContenido();
  },

  biblioteca: async () => {
    await asegurar();
    return motor.datosBiblioteca();
  },

  ejercicios: async () => {
    try {
      const res = await fetch(`data/ejercicios.json?v=${Date.now()}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      guardar('ejercicios', data).catch(() => {});
      return data;
    } catch (e) {
      const cacheado = await leer('ejercicios');
      if (cacheado) return cacheado;
      throw e;
    }
  },

  registrarEjercicio: async () => {
    await asegurar();
    await motor.registrarEjercicio();
    return { ok: true };
  },

  dashboard: async () => {
    await asegurar();
    return motor.datosDashboard();
  },

  exportarCopia: async () => {
    await asegurar();
    return motor.exportarCopia();
  },

  restaurarCopia: async (datos) => {
    await asegurar();
    return motor.restaurarCopia(datos);
  }
};
