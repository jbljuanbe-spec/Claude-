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

  cola: async (limite = 20, soloLeccion = null) => {
    await asegurar();
    return { cola: motor.colaDeEstudio(limite, 8, soloLeccion) };
  },

  gastarBillete: async (codigo) => {
    await asegurar();
    return motor.gastarBillete(codigo);
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
    // Fusiona el banco original (data/ejercicios.json) con el archivo curado
    // nuevo (data/ejercicios_japones.json), normalizando su esquema. Añade el
    // tipo 'produccion_larga'. Si la red falla, cae a la última copia cacheada.
    const base = { particulas: [], ordenar: [], traduccion: [], produccion_larga: [], escritura: [], voz: [], kanji_lectura: [], bunpo_choice: [], lectura_parrafo: [] };
    const v = Date.now();
    try {
      const res = await fetch(`data/ejercicios.json?v=${v}`);
      if (res.ok) {
        const d = await res.json();
        base.particulas.push(...(d.particulas || []));
        base.ordenar.push(...(d.ordenar || []));
        base.traduccion.push(...(d.traduccion || []));
      }
    } catch { /* seguimos con lo que haya */ }
    try {
      const res = await fetch(`data/ejercicios_japones.json?v=${v}`);
      if (res.ok) {
        const d = await res.json();
        (d.particulas || []).forEach(e => base.particulas.push({
          id: e.id, l: e.leccion,
          frase: String(e.frase_con_hueco || '').replace(/[_＿]+/g, '＿'),
          trad: e.traduccion || '', opciones: e.opciones || [],
          correcta: e.respuesta, explicacion: e.explicacion || ''
        }));
        (d.ordenar || []).forEach(e => base.ordenar.push({
          id: e.id, l: e.leccion, es: e.traduccion || '', tokens: e.palabras || []
        }));
        (d.produccion_larga || []).forEach(e => base.produccion_larga.push({
          id: e.id, l: e.leccion, prompt: e.prompt || '',
          ejemplo: e.ejemplo_respuesta || '', puntos: e.puntos_gramaticales || []
        }));
        (d.escritura || []).forEach(e => base.escritura.push({
          id: e.id, l: e.leccion, es: e.es || e.prompt || '',
          respuestas: e.respuestas || [], pista: e.pista || ''
        }));
        (d.voz || []).forEach(e => base.voz.push({
          id: e.id, l: e.leccion, objetivo: e.objetivo || '', es: e.es || '',
          respuestas: e.respuestas || (e.objetivo ? [e.objetivo] : [])
        }));
      }
    } catch { /* seguimos con lo que haya */ }
    try {
      const res = await fetch(`data/ejercicios_examen_japones.json?v=${v}`);
      if (res.ok) {
        const d = await res.json();
        base.kanji_lectura.push(...(d.kanji_lectura || []));
        base.bunpo_choice.push(...(d.bunpo_choice || []));
        base.lectura_parrafo.push(...(d.lectura_parrafo || []));
      }
    } catch { /* seguimos con lo que haya */ }

    const total = Object.values(base).reduce((n, a) => n + a.length, 0);
    if (total > 0) {
      guardar('ejercicios', base).catch(() => {});
      return base;
    }
    const cacheado = await leer('ejercicios');
    if (cacheado) return { produccion_larga: [], escritura: [], voz: [], kanji_lectura: [], bunpo_choice: [], lectura_parrafo: [], ...cacheado };
    throw new Error('No se pudieron cargar los ejercicios');
  },

  registrarEjercicio: async () => {
    await asegurar();
    return motor.registrarEjercicio();
  },

  viaje: async () => {
    await asegurar();
    return motor.datosViaje();
  },

  perfil: async () => {
    await asegurar();
    return motor.datosPerfil();
  },

  vocabularioDia: async (objetivo) => {
    await asegurar();
    return motor.vocabularioDelDia(objetivo);
  },

  superarLeccion: async (codigo) => {
    await asegurar();
    return motor.superarLeccion(codigo);
  },

  aprobarExamen: async (ciudad, pct) => {
    await asegurar();
    return motor.aprobarExamen(ciudad, pct);
  },

  codigosExamen: async (ciudad) => {
    await asegurar();
    return motor.codigosExamen(ciudad);
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
