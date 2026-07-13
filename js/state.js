// Persistencia del progreso del torneo en localStorage.

const KEY = "pokeTorneo:v2:state";

function initialState() {
  return {
    version: 2,
    phase: "pickFavorites", // pickFavorites | bracket | hallOfFame
    groupMode: null, // "generacion" | "categoria"
    groupSelection: [], // ids de grupo incluidos en el torneo
    groupOrder: [], // orden en el que se van pidiendo los favoritos
    groupIndex: 0,
    favorites: {}, // { [groupId]: pokemonId }
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
      if (parsed && parsed.version === 2) {
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
