import { getById } from "./data.js";
import { shuffle } from "./util.js";
import { el, pickableCard } from "./render.js";

const ROUND_NAME_BY_MATCH_COUNT = {
  16: "dieciseisavos",
  8: "octavos",
  4: "cuartos",
  2: "semis",
  1: "final",
};

const ROUND_LABELS = {
  dieciseisavos: "Dieciseisavos de final",
  octavos: "Octavos de final",
  cuartos: "Cuartos de final",
  semis: "Semifinal",
  final: "Final",
};

export function getRoundLabel(round) {
  return ROUND_LABELS[round] ?? round;
}

export function initBracket(poolIds) {
  const seedOrder = shuffle(poolIds);
  const matches = [];
  for (let i = 0; i < seedOrder.length; i += 2) {
    matches.push({ a: seedOrder[i], b: seedOrder[i + 1], winner: null });
  }
  return {
    round: ROUND_NAME_BY_MATCH_COUNT[matches.length],
    seedOrder,
    matches,
    history: [],
  };
}

export function getNextMatch(bracket) {
  return bracket.matches.find((m) => m.winner == null) ?? null;
}

export function resolveMatch(bracket, match, winnerId) {
  match.winner = winnerId;
}

export function isRoundComplete(bracket) {
  return bracket.matches.every((m) => m.winner != null);
}

export function isFinalComplete(bracket) {
  return bracket.round === "final" && isRoundComplete(bracket);
}

// Debe llamarse solo cuando isRoundComplete(bracket) es true y no es la final.
export function advanceRound(bracket) {
  bracket.history.push({ round: bracket.round, matches: bracket.matches });
  const winners = bracket.matches.map((m) => m.winner);
  const nextMatches = [];
  for (let i = 0; i < winners.length; i += 2) {
    nextMatches.push({ a: winners[i], b: winners[i + 1], winner: null });
  }
  bracket.matches = nextMatches;
  bracket.round = ROUND_NAME_BY_MATCH_COUNT[nextMatches.length];
  return bracket;
}

export function getChampion(bracket) {
  return bracket.round === "final" ? bracket.matches[0]?.winner ?? null : null;
}

export function getRunnerUp(bracket) {
  const final = bracket.matches[0];
  if (bracket.round !== "final" || !final || final.winner == null) return null;
  return final.a === final.winner ? final.b : final.a;
}

export function renderBracketPhase(container, bracket, match, onPick) {
  const entryA = getById(match.a);
  const entryB = getById(match.b);
  const total = bracket.matches.length;
  const done = bracket.matches.filter((m) => m.winner != null).length;

  container.replaceChildren(
    el("div", { class: "bracket-panel" }, [
      el("h2", { text: "3. Eliminación directa" }),
      el("p", {
        class: "phase-help",
        text: `${getRoundLabel(bracket.round)} — partido ${done + 1} de ${total}.`,
      }),
      el("div", { class: "duel-versus" }, [
        pickableCard(entryA, onPick),
        el("span", { class: "vs", text: "VS" }),
        pickableCard(entryB, onPick),
      ]),
    ])
  );
}

export function bracketLogEntry(round, match) {
  const winner = getById(match.winner);
  const loser = match.a === match.winner ? getById(match.b) : getById(match.a);
  return el("div", { class: "log-entry log-bracket" }, [
    el("span", { class: "log-tier", text: getRoundLabel(round) }),
    el("span", { class: "log-text" }, [winner.nameEs, " elimina a ", loser.nameEs]),
  ]);
}
