import { getById, getGroups } from "./data.js";
import { shuffle, pairKey } from "./util.js";
import { el, pickableCard } from "./render.js";

const TIER_LABELS = {
  1: "Misma familia evolutiva",
  2: "Comparación clásica",
  3: "Mismo tipo y generación",
  4: "Mismo tipo",
  5: "Emparejamiento libre",
};

function pickUnfacedPair(candidateIds, facedSet) {
  const ids = shuffle(candidateIds);
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      if (!facedSet.has(pairKey(ids[i], ids[j]))) return [ids[i], ids[j]];
    }
  }
  return ids.length >= 2 ? [ids[0], ids[1]] : null;
}

function bucketize(ids, keyFn) {
  const map = new Map();
  for (const id of ids) {
    const key = keyFn(id);
    if (key == null) continue;
    const list = map.get(key) ?? [];
    list.push(id);
    map.set(key, list);
  }
  return map;
}

// Devuelve { a, b, tier, tierLabel } con los siguientes candidatos a duelo,
// o null si el pool ya no se puede reducir más (no debería pasar con >32).
export function getNextDuel(pool, facedPairs) {
  if (pool.length <= 32) return null;
  const facedSet = new Set(facedPairs);
  const entries = pool.map(getById);
  const groups = getGroups();

  // Tier 1: misma familia evolutiva
  const byChain = bucketize(pool, (id) => getById(id).evolutionChainId);
  for (const list of shuffle([...byChain.values()])) {
    if (list.length >= 2) {
      const pair = pickUnfacedPair(list, facedSet);
      if (pair) return { a: pair[0], b: pair[1], tier: 1, tierLabel: TIER_LABELS[1] };
    }
  }

  // Tier 2: grupos curados (iniciales, pseudolegendarios, eeveelutions,
  // paradójicos, tríos/dúos legendarios clásicos)
  const buckets = [
    entries.filter((e) => e.categories.includes("inicial")).map((e) => e.id),
    entries.filter((e) => e.categories.includes("pseudolegendario")).map((e) => e.id),
    entries.filter((e) => e.categories.includes("eeveelution")).map((e) => e.id),
    entries.filter((e) => e.categories.includes("paradojico")).map((e) => e.id),
    ...groups.legendaryGroups.map((g) => {
      const species = new Set(g.species);
      return entries.filter((e) => species.has(e.speciesId)).map((e) => e.id);
    }),
  ];
  for (const bucket of shuffle(buckets)) {
    if (bucket.length >= 2) {
      const pair = pickUnfacedPair(bucket, facedSet);
      if (pair) return { a: pair[0], b: pair[1], tier: 2, tierLabel: TIER_LABELS[2] };
    }
  }

  // Tier 3: mismo tipo principal + generación
  const byTypeGen = bucketize(pool, (id) => {
    const e = getById(id);
    return `${e.types[0] ?? "?"}|${e.generation}`;
  });
  for (const list of shuffle([...byTypeGen.values()])) {
    if (list.length >= 2) {
      const pair = pickUnfacedPair(list, facedSet);
      if (pair) return { a: pair[0], b: pair[1], tier: 3, tierLabel: TIER_LABELS[3] };
    }
  }

  // Tier 4: mismo tipo principal
  const byType = bucketize(pool, (id) => getById(id).types[0] ?? "?");
  for (const list of shuffle([...byType.values()])) {
    if (list.length >= 2) {
      const pair = pickUnfacedPair(list, facedSet);
      if (pair) return { a: pair[0], b: pair[1], tier: 4, tierLabel: TIER_LABELS[4] };
    }
  }

  // Tier 5: al azar dentro de lo que quede
  const pair = pickUnfacedPair(pool, facedSet);
  if (pair) return { a: pair[0], b: pair[1], tier: 5, tierLabel: TIER_LABELS[5] };

  return null;
}

// Muta `state`: quita al perdedor del pool, registra el enfrentamiento.
export function resolveDuel(state, duel, winnerId) {
  const loserId = duel.a === winnerId ? duel.b : duel.a;
  state.facedPairs.push(pairKey(duel.a, duel.b));
  state.pool = state.pool.filter((id) => id !== loserId);
  state.duelHistory.push({
    a: duel.a,
    b: duel.b,
    winner: winnerId,
    loser: loserId,
    tier: duel.tier,
    tierLabel: duel.tierLabel,
  });
  return loserId;
}

export function renderDuelPhase(container, pool, duel, onPick) {
  const entryA = getById(duel.a);
  const entryB = getById(duel.b);

  container.replaceChildren(
    el("div", { class: "duel-panel" }, [
      el("h2", { text: "2. Duelos de homólogos" }),
      el("p", {
        class: "phase-help",
        text: `Quedan ${pool.length} Pokémon en pie (meta: 32). Emparejamiento: ${duel.tierLabel}.`,
      }),
      el("div", { class: "duel-versus" }, [
        pickableCard(entryA, onPick),
        el("span", { class: "vs", text: "VS" }),
        pickableCard(entryB, onPick),
      ]),
    ])
  );
}

export function duelLogEntry(duel) {
  const winner = getById(duel.winner);
  const loser = getById(duel.loser);
  return el("div", { class: "log-entry log-duel" }, [
    el("span", { class: "log-tier", text: duel.tierLabel }),
    el("span", { class: "log-text" }, [
      winner.nameEs,
      " venció a ",
      loser.nameEs,
    ]),
  ]);
}
