// Hoja de ruta escalable: el temario está pensado para crecer hasta 300+
// lecciones. Las que aún no tienen contenido existen como paradas
// "Próximamente" (hasContent: false): se ven en la lista y en el mapa,
// pero no tocan el motor SRS ni los ejercicios.

export const TOTAL_PREVISTO = 300;

// Cuántas paradas futuras se dibujan (en el mapa y en la lista).
export const PLACEHOLDERS_VISIBLES = 8;

export function numeroDeLeccion(codigo) {
  const m = /^L(\d+)$/.exec(codigo);
  return m ? parseInt(m[1], 10) : null;
}

// Genera los códigos de las próximas lecciones sin contenido.
export function paradasFuturas(codigosReales) {
  const numeros = codigosReales.map(numeroDeLeccion).filter(n => n !== null);
  const ultimo = numeros.length ? Math.max(...numeros) : 0;
  const futuras = [];
  for (let n = ultimo + 1; n <= Math.min(ultimo + PLACEHOLDERS_VISIBLES, TOTAL_PREVISTO); n++) {
    futuras.push(`L${n}`);
  }
  return futuras;
}
