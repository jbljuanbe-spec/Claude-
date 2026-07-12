// Persistencia del progreso del torneo en localStorage.

const KEY = "pokeTorneo:v1:state";

function initialState() {
  return {
    version: 1,
    phase: "filter", // filter | duels | bracket | hallOfFame
    filters: { query: "", types: [], generations: [], categories: [] },
    pool: [],
    facedPairs: [],
    duelHistory: [],
    bracket: null,
    hallOfFame: { top8: [], semifinalists: [], runnerUp: null, champion: null },
    log: [],
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
      if (parsed && parsed.version === 1) {
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

export function pushLog(entry) {
  getState().log.push({ ...entry, ts: Date.now() });
}
