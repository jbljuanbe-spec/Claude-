import { getById } from "./data.js";
import { shuffle } from "./util.js";
import { el, spriteImg } from "./render.js";
import { displayName } from "./sprites.js";

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

function nextPowerOfTwo(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

// participantIds: array de ids de Pokémon (uno por grupo elegido). Si no es
// potencia de 2, se rellenan huecos ("bye") que avanzan solos en la ronda 1.
// Los byes se reparten uno por par como máximo: como siempre hay menos byes
// que pares (nextPowerOfTwo nunca dobla el número de participantes), nunca
// puede salir un par bye-contra-bye, que se quedaría sin poder resolverse
// nunca.
export function initBracket(participantIds) {
  const reals = shuffle(participantIds);
  const size = nextPowerOfTwo(Math.max(2, reals.length));
  const pairCount = size / 2;
  const byes = size - reals.length;
  const byePairs = new Set(shuffle([...Array(pairCount).keys()]).slice(0, byes));

  let cursor = 0;
  const matches = [];
  for (let p = 0; p < pairCount; p++) {
    const a = reals[cursor++];
    const b = byePairs.has(p) ? null : reals[cursor++];
    // Un bye contra un participante real se resuelve solo, sin clic.
    const winner = a == null ? b : b == null ? a : null;
    matches.push({ a, b, winner });
  }

  return {
    totalParticipants: participantIds.length,
    bracketSize: size,
    round: ROUND_NAME_BY_MATCH_COUNT[matches.length] ?? `ronda-${matches.length}`,
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
    const a = winners[i];
    const b = winners[i + 1];
    // No debería haber byes a partir de la ronda 1, pero por si acaso.
    const winner = a == null ? b : b == null ? a : null;
    nextMatches.push({ a, b, winner });
  }
  bracket.matches = nextMatches;
  bracket.round = ROUND_NAME_BY_MATCH_COUNT[nextMatches.length] ?? `ronda-${nextMatches.length}`;
  return bracket;
}

// Avanza automáticamente todas las rondas que ya estén completas solo por
// byes, para no dejar al usuario parado ante una ronda sin nada que decidir.
export function autoAdvance(bracket) {
  while (!isFinalComplete(bracket) && isRoundComplete(bracket)) {
    advanceRound(bracket);
  }
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

// Todas las rondas ya jugadas + la ronda actual, para pintar el cuadro
// completo del torneo de una vez (estilo Liga Pokémon).
export function getAllRoundsForDisplay(bracket) {
  return [...bracket.history, { round: bracket.round, matches: bracket.matches }];
}

function slotNode(id, { isWinner, isBye } = {}) {
  if (id == null) {
    return el("div", { class: "bracket-slot bracket-slot-bye", text: isBye ? "BYE" : "?" });
  }
  const entry = getById(id);
  const node = el("div", {
    class: "bracket-slot" + (isWinner ? " bracket-slot-winner" : ""),
  }, [spriteImg(entry, "bracket-sprite"), el("span", { text: displayName(entry) })]);
  return node;
}

export function renderBracketBoard(container, bracket, onPick) {
  const rounds = getAllRoundsForDisplay(bracket);

  const columns = rounds.map((r, roundIdx) => {
    const isCurrentRound = roundIdx === rounds.length - 1;
    const matchNodes = r.matches.map((m) => {
      const decided = m.winner != null;
      const isActive = isCurrentRound && !decided && m.a != null && m.b != null;

      const box = el("div", {
        class: "bracket-match" + (isActive ? " bracket-match-active" : ""),
      }, [
        slotNode(m.a, { isWinner: decided && m.winner === m.a, isBye: decided && m.a == null }),
        el("span", { class: "bracket-vs", text: "vs" }),
        slotNode(m.b, { isWinner: decided && m.winner === m.b, isBye: decided && m.b == null }),
      ]);

      if (isActive) {
        box.querySelectorAll(".bracket-slot").forEach((slotEl, idx) => {
          const id = idx === 0 ? m.a : m.b;
          slotEl.classList.add("pickable");
          slotEl.tabIndex = 0;
          slotEl.setAttribute("role", "button");
          slotEl.addEventListener("click", () => onPick(m, id));
          slotEl.addEventListener("keydown", (ev) => {
            if (ev.key === "Enter" || ev.key === " ") {
              ev.preventDefault();
              onPick(m, id);
            }
          });
        });
      }
      return box;
    });

    return el("div", { class: "bracket-column" }, [
      el("h3", { class: "bracket-round-title", text: getRoundLabel(r.round) }),
      el("div", { class: "bracket-column-matches" }, matchNodes),
    ]);
  });

  container.replaceChildren(el("div", { class: "bracket-board" }, columns));
}
