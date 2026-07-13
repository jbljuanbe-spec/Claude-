import { loadData, getMeta, getById } from "./data.js";
import { loadState, saveState, resetState } from "./state.js";
import { renderModeAndGroupSelection, renderGroupPicker } from "./favorites.js";
import {
  initBracket,
  autoAdvance,
  isRoundComplete,
  isFinalComplete,
  advanceRound,
  renderBracketBoard,
  getRoundLabel,
} from "./bracket.js";
import { computeHallOfFame, renderHallOfFame } from "./halloffame.js";
import { el, entryCard } from "./render.js";

const dom = {
  phaseFavorites: document.getElementById("phase-favorites"),
  phaseActive: document.getElementById("phase-active"),
  hofContainer: document.getElementById("hof-container"),
  resetBtn: document.getElementById("reset-btn"),
};

let state;
let meta;

function setSectionVisible(node, visible) {
  node.hidden = !visible;
}

function renderApp() {
  const isFavoritesPhase = state.phase === "pickFavorites";
  setSectionVisible(dom.phaseFavorites, isFavoritesPhase);
  setSectionVisible(dom.phaseActive, !isFavoritesPhase);
  dom.resetBtn.hidden = isFavoritesPhase && state.groupOrder.length === 0;

  if (isFavoritesPhase) {
    renderFavoritesStep();
  } else if (state.phase === "bracket") {
    renderBracketStep();
  } else if (state.phase === "hallOfFame") {
    renderChampionBanner();
  }

  const hof = computeHallOfFame(state.bracket);
  renderHallOfFame(dom.hofContainer, hof);
}

function renderFavoritesStep() {
  if (state.groupOrder.length === 0) {
    renderModeAndGroupSelection(dom.phaseFavorites, meta, state, {
      onModeChange: renderApp,
      onStart: (groups) => {
        state.groupOrder = groups;
        state.groupIndex = 0;
        saveState();
        renderApp();
      },
    });
    return;
  }

  const group = state.groupOrder[state.groupIndex];
  renderGroupPicker(
    dom.phaseFavorites,
    group,
    state.groupIndex,
    state.groupOrder.length,
    state.favorites[group.id] ?? null,
    {
      onPick: (groupId, pokemonId) => {
        state.favorites[groupId] = pokemonId;
        if (state.groupIndex < state.groupOrder.length - 1) {
          state.groupIndex += 1;
          saveState();
          renderApp();
        } else {
          startTournament();
        }
      },
      onBack: () => {
        state.groupIndex = Math.max(0, state.groupIndex - 1);
        saveState();
        renderApp();
      },
    }
  );
}

function startTournament() {
  const participantIds = state.groupOrder.map((g) => state.favorites[g.id]).filter(Boolean);
  state.bracket = autoAdvance(initBracket(participantIds));
  state.phase = isFinalComplete(state.bracket) ? "hallOfFame" : "bracket";
  saveState();
  renderApp();
}

function renderBracketStep() {
  const bracket = state.bracket;

  dom.phaseActive.replaceChildren(
    el("div", { class: "bracket-panel" }, [
      el("h2", { text: "2. Liga Pokémon" }),
      el("p", {
        class: "phase-help",
        text: `${getRoundLabel(bracket.round)} — elige quién avanza.`,
      }),
      el("div", { id: "bracket-board-mount" }),
    ])
  );

  const mount = document.getElementById("bracket-board-mount");
  renderBracketBoard(mount, bracket, (match, winnerId) => {
    match.winner = winnerId;

    if (isFinalComplete(bracket)) {
      state.phase = "hallOfFame";
    } else if (isRoundComplete(bracket)) {
      advanceRound(bracket);
      autoAdvance(bracket);
      if (isFinalComplete(bracket)) state.phase = "hallOfFame";
    }
    saveState();
    renderApp();
  });
}

function renderChampionBanner() {
  const hof = computeHallOfFame(state.bracket);
  const championCard = hof.champion
    ? entryCard(getById(hof.champion), { badge: "🥇 Campeón de la Liga" })
    : null;
  const boardMount = el("div");

  dom.phaseActive.replaceChildren(
    el("div", { class: "champion-banner" }, [
      el("h2", { text: "¡Tenemos campeón de la Liga!" }),
      championCard,
      el("p", {
        text: "Repasa el cuadro completo aquí abajo, y a tu campeón en el Hall de la Fama.",
      }),
      boardMount,
    ])
  );

  renderBracketBoard(boardMount, state.bracket, () => {});
}

dom.resetBtn.addEventListener("click", () => {
  if (!confirm("¿Seguro que quieres reiniciar el torneo? Se perderá el progreso actual.")) {
    return;
  }
  state = resetState();
  renderApp();
});

async function main() {
  await loadData();
  meta = getMeta();
  state = loadState();
  renderApp();
}

main();
