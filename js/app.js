import { loadData, getMeta, getById } from "./data.js";
import { loadState, saveState, resetState } from "./state.js";
import { renderFilterPhase } from "./filters.js";
import { getNextDuel, resolveDuel, renderDuelPhase, duelLogEntry } from "./duel.js";
import {
  initBracket,
  getNextMatch,
  resolveMatch,
  isRoundComplete,
  isFinalComplete,
  advanceRound,
  bracketLogEntry,
  renderBracketPhase,
} from "./bracket.js";
import { computeHallOfFame, renderHallOfFame } from "./halloffame.js";
import { el, clear, appendToLog, entryCard } from "./render.js";

const dom = {
  phaseFilter: document.getElementById("phase-filter"),
  phaseActive: document.getElementById("phase-active"),
  hofContainer: document.getElementById("hof-container"),
  scrapbookLog: document.getElementById("scrapbook-log"),
  resetBtn: document.getElementById("reset-btn"),
};

let state;

function setSectionVisible(node, visible) {
  node.hidden = !visible;
}

function renderApp() {
  const isFilterPhase = state.phase === "filter";
  setSectionVisible(dom.phaseFilter, isFilterPhase);
  setSectionVisible(dom.phaseActive, !isFilterPhase);
  dom.resetBtn.hidden = isFilterPhase && state.duelHistory.length === 0;

  if (isFilterPhase) {
    renderFilterPhase(dom.phaseFilter, getMeta(), state.filters, {
      onStart: startTournament,
    });
  } else if (state.phase === "duels") {
    renderDuelStep();
  } else if (state.phase === "bracket") {
    renderBracketStep();
  } else if (state.phase === "hallOfFame") {
    renderChampionBanner();
  }

  const hof = computeHallOfFame(state.bracket);
  renderHallOfFame(dom.hofContainer, hof);
}

function startTournament(filteredIds) {
  state.pool = [...filteredIds];
  state.facedPairs = [];
  state.duelHistory = [];
  state.bracket = null;
  clear(dom.scrapbookLog);

  if (state.pool.length === 32) {
    state.bracket = initBracket(state.pool);
    state.phase = "bracket";
  } else {
    state.phase = "duels";
  }
  saveState();
  renderApp();
}

function renderDuelStep() {
  const duel = getNextDuel(state.pool, state.facedPairs);
  if (!duel) {
    // Salvaguarda: si por alguna razón no hay más duelos posibles pero el
    // pool sigue por encima de 32, pasamos al bracket con lo que quede.
    state.bracket = initBracket(state.pool.slice(0, 32));
    state.phase = "bracket";
    saveState();
    renderApp();
    return;
  }

  renderDuelPhase(dom.phaseActive, state.pool, duel, (entry) => {
    resolveDuel(state, duel, entry.id);
    appendToLog(dom.scrapbookLog, duelLogEntry(state.duelHistory.at(-1)));

    if (state.pool.length === 32) {
      state.bracket = initBracket(state.pool);
      state.phase = "bracket";
    }
    saveState();
    renderApp();
  });
}

function renderBracketStep() {
  const bracket = state.bracket;
  const match = getNextMatch(bracket);

  renderBracketPhase(dom.phaseActive, bracket, match, (entry) => {
    resolveMatch(bracket, match, entry.id);
    appendToLog(dom.scrapbookLog, bracketLogEntry(bracket.round, match));

    if (isFinalComplete(bracket)) {
      state.phase = "hallOfFame";
    } else if (isRoundComplete(bracket)) {
      advanceRound(bracket);
    }
    saveState();
    renderApp();
  });
}

function renderChampionBanner() {
  const championId = state.bracket.matches[0]?.winner;
  const championCard = championId
    ? entryCard(getById(championId), { badge: "🥇 Campeón" })
    : null;
  dom.phaseActive.replaceChildren(
    el("div", { class: "champion-banner" }, [
      el("h2", { text: "¡Torneo completado!" }),
      championCard,
      el("p", {
        text: "Tu campeón encabeza el Hall de la Fama, aquí abajo, junto al resto de tus favoritos.",
      }),
    ])
  );
}

dom.resetBtn.addEventListener("click", () => {
  if (!confirm("¿Seguro que quieres reiniciar el torneo? Se perderá el progreso actual.")) {
    return;
  }
  state = resetState();
  clear(dom.scrapbookLog);
  renderApp();
});

async function main() {
  await loadData();
  state = loadState();
  renderApp();

  // Si veníamos de una sesión anterior a mitad de duelos/bracket, repoblamos
  // el historial visible del "diario del torneo" para no perder contexto.
  if (state.duelHistory.length || (state.bracket && state.bracket.history.length)) {
    clear(dom.scrapbookLog);
    for (const d of state.duelHistory) dom.scrapbookLog.appendChild(duelLogEntry(d));
    if (state.bracket) {
      for (const round of state.bracket.history) {
        for (const m of round.matches) {
          dom.scrapbookLog.appendChild(bracketLogEntry(round.round, m));
        }
      }
    }
  }
}

main();
