import { loadData, getMeta, getById } from "./data.js";
import { loadState, saveState, resetState } from "./state.js";
import { renderSetup, renderGroupPicker, renderTrimPhase } from "./favorites.js";
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
  const isSetupOrPicking = state.phase === "setup" || state.phase === "pickFavorites" || state.phase === "trim";
  setSectionVisible(dom.phaseFavorites, isSetupOrPicking);
  setSectionVisible(dom.phaseActive, !isSetupOrPicking);
  dom.resetBtn.hidden = state.phase === "setup" && !state.targetSize;

  if (state.phase === "setup") {
    renderSetup(dom.phaseFavorites, meta, state, {
      onChange: renderApp,
      onStart: (groups, perGroup) => {
        state.groupOrder = groups;
        state.perGroup = perGroup;
        state.groupIndex = 0;
        state.favorites = {};
        state.phase = "pickFavorites";
        saveState();
        renderApp();
      },
    });
  } else if (state.phase === "pickFavorites") {
    renderFavoritesStep();
  } else if (state.phase === "trim") {
    renderTrimStep();
  } else if (state.phase === "bracket") {
    renderBracketStep();
  } else if (state.phase === "hallOfFame") {
    renderChampionBanner();
  }

  const hof = computeHallOfFame(state.bracket);
  renderHallOfFame(dom.hofContainer, hof, {
    trainerId: state.trainerId,
    elapsedMs: hof.champion ? (state.finishedAt ?? Date.now()) - state.createdAt : null,
  });
}

function renderFavoritesStep() {
  const group = state.groupOrder[state.groupIndex];
  renderGroupPicker(
    dom.phaseFavorites,
    group,
    state.groupIndex,
    state.groupOrder.length,
    state.perGroup,
    state.favorites[group.id] ?? [],
    {
      onSelectionChange: (selected) => {
        state.favorites[group.id] = selected;
        saveState();
      },
      onComplete: () => {
        if (state.groupIndex < state.groupOrder.length - 1) {
          state.groupIndex += 1;
          saveState();
          renderApp();
        } else {
          finishPicking();
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

function finishPicking() {
  const allPicked = state.groupOrder.flatMap((g) => state.favorites[g.id] ?? []);
  if (allPicked.length > state.targetSize) {
    state.trimPool = allPicked;
    state.phase = "trim";
    saveState();
    renderApp();
  } else {
    state.finalists = allPicked;
    startTournament();
  }
}

function renderTrimStep() {
  renderTrimPhase(dom.phaseFavorites, state.trimPool, state.targetSize, (id) => {
    state.trimPool = state.trimPool.filter((x) => x !== id);
    saveState();
    if (state.trimPool.length === state.targetSize) {
      state.finalists = state.trimPool;
      startTournament();
    } else {
      renderApp();
    }
  });
}

function startTournament() {
  state.bracket = autoAdvance(initBracket(state.finalists));
  state.phase = isFinalComplete(state.bracket) ? "hallOfFame" : "bracket";
  if (state.phase === "hallOfFame") state.finishedAt = Date.now();
  saveState();
  renderApp();
}

function renderBracketStep() {
  const bracket = state.bracket;

  dom.phaseActive.replaceChildren(
    el("div", { class: "bracket-panel" }, [
      el("h2", { text: "Liga Pokémon" }),
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
      state.finishedAt = Date.now();
    } else if (isRoundComplete(bracket)) {
      advanceRound(bracket);
      autoAdvance(bracket);
      if (isFinalComplete(bracket)) {
        state.phase = "hallOfFame";
        state.finishedAt = Date.now();
      }
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
  state.trainerId = Math.floor(10000 + Math.random() * 90000);
  saveState();
  renderApp();
});

async function main() {
  await loadData();
  meta = getMeta();
  state = loadState();
  if (!state.trainerId) {
    state.trainerId = Math.floor(10000 + Math.random() * 90000);
    saveState();
  }
  renderApp();
}

main();
