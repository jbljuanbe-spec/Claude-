// Persistencia del progreso del torneo en localStorage.

const KEY = "pokeTorneo:v3:state";

function initialState() {
  return {
    version: 3,
    phase: "setup", // setup | pickFavorites | trim | bracket | hallOfFame
    targetSize: null, // 8 | 16 | 32 | 64
    groupMode: null, // "generacion" | "categoria"
    groupSelection: [], // ids de grupo incluidos en el torneo
    groupOrder: [], // grupos definitivos, en el orden en que se piden
    perGroup: 1, // cuántos favoritos hay que elegir por grupo
    groupIndex: 0,
    favorites: {}, // { [groupId]: [pokemonId, ...] }
    trimPool: [], // durante la fase de recorte: ids aún en juego
    finalists: [], // participantes definitivos del torneo (tamaño exacto)
    bracket: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

let state = null;

export function loadState() {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 3) {
        state = parsed;
        return state;
      }
    }
  } catch {
    // estado corrupto, se ignora y se reinicia
  }
  state = initialState();
  return state;
}

export function saveState() {
  if (!state) return;
  state.updatedAt = Date.now();
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function resetState() {
  localStorage.removeItem(KEY);
  state = initialState();
  return state;
}

export function getState() {
  if (!state) return loadState();
  return state;
}
