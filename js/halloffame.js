import { getById } from "./data.js";
import { el, entryCard, spriteImg } from "./render.js";
import { displayName } from "./sprites.js";

function getFirstRoundMatches(bracket) {
  return bracket.history.length ? bracket.history[0].matches : bracket.matches;
}

// Deriva el estado del Hall de la Fama a partir del historial de rondas.
// Con torneos grandes (bracketSize >= 16) el top 8 son los cuartofinalistas
// clásicos. Con torneos más pequeños se ajusta para que el Hall de la Fama
// nunca quede vacío.
export function computeHallOfFame(bracket) {
  const hof = { top8: [], semifinalists: [], runnerUp: null, champion: null };
  if (!bracket) return hof;

  const octavos = bracket.history.find((h) => h.round === "octavos");
  if (octavos) {
    hof.top8 = octavos.matches.map((m) => m.winner);
  } else if (bracket.bracketSize <= 8) {
    hof.top8 = [
      ...new Set(getFirstRoundMatches(bracket).flatMap((m) => [m.a, m.b]).filter((id) => id != null)),
    ];
  }

  const cuartos = bracket.history.find((h) => h.round === "cuartos");
  if (cuartos) {
    hof.semifinalists = cuartos.matches.map((m) => m.winner);
  } else if (bracket.bracketSize <= 4 && hof.top8.length) {
    hof.semifinalists = hof.top8;
  }

  if (bracket.round === "final" && bracket.matches[0]?.winner != null) {
    const final = bracket.matches[0];
    hof.champion = final.winner;
    hof.runnerUp = final.a === final.winner ? final.b : final.a;
  }

  return hof;
}

function badgeFor(id, hof) {
  if (hof.champion === id) return "🥇 Campeón";
  if (hof.runnerUp === id) return "🥈 Subcampeón";
  if (hof.semifinalists.includes(id)) return "🥉 Semifinalista";
  if (hof.top8.includes(id)) return "Cuartofinalista";
  return null;
}

function formatElapsed(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function orderedByRank(hof) {
  const rank = (id) =>
    hof.champion === id ? 0 : hof.runnerUp === id ? 1 : hof.semifinalists.includes(id) ? 2 : 3;
  return [...hof.top8].sort((a, b) => rank(a) - rank(b));
}

function renderVictoryScreen(container, hof, { trainerId, elapsedMs }) {
  const ordered = orderedByRank(hof);

  const items = ordered.map((id) => {
    const entry = getById(id);
    const badge = badgeFor(id, hof);
    return el("div", { class: "hof-victory-item" }, [
      badge ? el("span", { class: "hof-victory-badge", text: badge }) : null,
      spriteImg(entry, "sprite hof-victory-sprite"),
      el("span", { class: "hof-victory-name", text: displayName(entry) }),
    ]);
  });

  container.replaceChildren(
    el("div", { class: "hof-panel" }, [
      el("h2", { text: "Hall de la Fama" }),
      el("div", { class: "hof-victory" }, [
        el("p", { class: "hof-victory-banner", text: "¡Has vencido! ¡Enhorabuena!" }),
        el("div", { class: "hof-victory-grid" }, items),
        el("p", {
          class: "hof-victory-stats",
          text: `Entrenador N.º ${trainerId} · Tiempo ${formatElapsed(elapsedMs)}`,
        }),
      ]),
    ])
  );
}

function renderInProgress(container, hof) {
  const ordered = orderedByRank(hof);
  container.replaceChildren(
    el("div", { class: "hof-panel" }, [
      el("h2", { text: "Hall de la Fama" }),
      el("p", {
        class: "phase-help",
        text: "Tus favoritos hasta ahora. Se completará con medallas cuando corones a un campeón.",
      }),
      el(
        "div",
        { class: "hof-grid" },
        ordered.map((id) => entryCard(getById(id), { badge: badgeFor(id, hof) }))
      ),
    ])
  );
}

export function renderHallOfFame(container, hof, meta = {}) {
  if (!hof.top8.length) {
    container.replaceChildren();
    return;
  }
  if (hof.champion) {
    renderVictoryScreen(container, hof, meta);
  } else {
    renderInProgress(container, hof);
  }
}
